import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useDebouncedValue } from './useDebouncedValue'

export interface Service {
  id: string
  client_id: string
  nome_servico?: string
  data_inicio: string
  data_fim: string
  status_pagamento: 'pendente' | 'pendente_plataforma' | 'pago_parcialmente' | 'pago'
  desconto_plataforma_default: number
  total_visitas: number
  total_valor: number
  total_a_receber: number
  valor_pago: number
  created_at: string
  assigned_user_id?: string
  clients?: {
    nome: string
    valor_diaria: number
    valor_duas_visitas: number
  }
  assigned_user?: {
    full_name: string
    email: string
  }
}

export interface Client {
  id: string
  nome: string
  valor_diaria: number
  valor_duas_visitas: number
  credito_disponivel?: number
}

export interface ServiceUser {
  id: string
  full_name: string
  email: string
  avatar_url?: string
}

const PAGE_SIZE = 50

/**
 * Hook responsável pela lógica de busca/estado de ServicesPage:
 * fetch de serviços (com paginação e busca real no servidor), clientes,
 * usuários, e a checagem de quais usuários têm acesso a um cliente.
 */
export function useServicesData() {
  const [services, setServices] = useState<Service[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [users, setUsers] = useState<ServiceUser[]>([])
  const [usersMap, setUsersMap] = useState<Record<string, { full_name: string, avatar_url?: string }>>({})
  const [loading, setLoading] = useState(true)

  // Filtros
  const [selectedFilter, setSelectedFilter] = useState<'ativos' | 'concluidos'>('ativos')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 400)

  // Ordenação da tabela (clique no header). null = ordenação padrão do filtro atual.
  const [sortColumn, setSortColumn] = useState<'nome_servico' | 'data_inicio' | 'total_visitas' | 'total_valor' | 'status_pagamento' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const toggleSort = (column: 'nome_servico' | 'data_inicio' | 'total_visitas' | 'total_valor' | 'status_pagamento') => {
    if (sortColumn === column) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Paginação
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = PAGE_SIZE

  const fetchServices = async () => {
    setLoading(true)
    try {
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

      let query = supabase
        .from('services')
        .select(`
          *,
          clients (
            nome,
            valor_diaria,
            valor_duas_visitas
          )
        `, { count: 'exact' })

      // Ordenação: coluna clicada pelo usuário tem prioridade; senão, padrão do filtro
      if (sortColumn) {
        query = query.order(sortColumn, { ascending: sortDirection === 'asc' })
      } else if (selectedFilter === 'concluidos') {
        query = query.order('data_inicio', { ascending: false })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      // Filtros por status (agora aplicados no servidor)
      switch (selectedFilter) {
        case 'ativos':
          // Serviços ativos: data_fim >= hoje OU status_pagamento !== 'pago'
          query = query.or(`data_fim.gte.${todayStr},status_pagamento.neq.pago`)
          break
        case 'concluidos':
          // Serviços concluídos: data_fim < hoje E status_pagamento = 'pago'
          // Sem período padrão: a paginação server-side já limita o volume
          // trafegado (só busca os registros da página atual), então não é
          // necessário restringir a um intervalo de datas por padrão.
          query = query.lt('data_fim', todayStr).eq('status_pagamento', 'pago')
          break
      }

      if (filterStartDate) {
        query = query.gte('data_inicio', filterStartDate)
      }
      if (filterEndDate) {
        query = query.lte('data_fim', filterEndDate)
      }

      // Busca por nome de cliente ou serviço (server-side, duas etapas para
      // evitar depender do filtro .or() em colunas de tabelas embutidas)
      const term = debouncedSearchQuery.trim().replace(/[,()]/g, '')
      if (term) {
        const { data: matchingClients } = await supabase
          .from('clients')
          .select('id')
          .ilike('nome', `%${term}%`)

        const clientIds = (matchingClients || []).map(c => c.id)
        if (clientIds.length > 0) {
          query = query.or(`nome_servico.ilike.%${term}%,client_id.in.(${clientIds.join(',')})`)
        } else {
          query = query.ilike('nome_servico', `%${term}%`)
        }
      }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      const { data, error, count } = await query.range(from, to)
      if (error) throw error

      setTotalCount(count || 0)

      let servicesData = data || []

      // Buscar dados dos usuários assignados (apenas para a página atual)
      const userIds = [...new Set(servicesData.map(s => s.assigned_user_id).filter(Boolean))]
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('user_profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds)

        servicesData = servicesData.map(service => ({
          ...service,
          assigned_user: service.assigned_user_id
            ? usersData?.find(u => u.user_id === service.assigned_user_id)
            : null
        }))
      }

      setServices(servicesData)
    } catch (error) {
      console.error('Erro ao buscar serviços:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, nome, valor_diaria, valor_duas_visitas, credito_disponivel')
        .order('nome')

      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error('Erro ao buscar clientes:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, email, avatar_url')
        .eq('is_active', true)
        .order('full_name')

      if (error) throw error

      const usersData = data?.map(u => ({
        id: u.user_id,
        full_name: u.full_name,
        email: u.email,
        avatar_url: u.avatar_url
      })) || []

      setUsers(usersData)

      const map: Record<string, { full_name: string, avatar_url?: string }> = {}
      usersData.forEach(user => {
        map[user.id] = {
          full_name: user.full_name,
          avatar_url: user.avatar_url
        }
      })
      setUsersMap(map)
    } catch (error) {
      console.error('Erro ao buscar usuários:', error)
    }
  }

  // Filtrar usuários que têm acesso ao cliente selecionado
  const getAvailableUsers = async (clientId: string) => {
    if (!clientId) return users

    try {
      const { data: shares, error } = await supabase
        .from('record_sharing')
        .select('shared_with_user_id')
        .eq('record_id', clientId)
        .eq('record_type', 'client')

      if (error) throw error

      const sharedUserIds = new Set(shares?.map(s => s.shared_with_user_id) || [])

      const { data: userProfiles } = await supabase
        .from('user_profiles')
        .select('user_id, profile:profiles!inner(is_admin)')
        .eq('is_active', true)

      const adminUserIds = new Set(
        userProfiles
          ?.filter(up => {
            const profile = Array.isArray(up.profile) ? up.profile[0] : up.profile
            return profile?.is_admin === true
          })
          .map(up => up.user_id) || []
      )

      // Retornar: TODOS os admins + parceiros que têm compartilhamento
      return users.filter(user => {
        return adminUserIds.has(user.id) || sharedUserIds.has(user.id)
      })
    } catch (error) {
      console.error('Erro ao verificar compartilhamentos:', error)
      return users
    }
  }

  // Resetar para a primeira página quando filtros/busca/ordenação mudarem
  useEffect(() => {
    setPage(1)
  }, [selectedFilter, filterStartDate, filterEndDate, debouncedSearchQuery, sortColumn, sortDirection])

  // Buscar serviços quando filtros, busca, ordenação ou página mudarem
  useEffect(() => {
    fetchServices()
  }, [selectedFilter, filterStartDate, filterEndDate, debouncedSearchQuery, sortColumn, sortDirection, page])

  // Clientes e usuários não dependem dos filtros: buscar uma única vez
  useEffect(() => {
    fetchClients()
    fetchUsers()
  }, [])

  return {
    services,
    clients,
    users,
    usersMap,
    loading,
    selectedFilter,
    setSelectedFilter,
    filterStartDate,
    setFilterStartDate,
    filterEndDate,
    setFilterEndDate,
    searchQuery,
    setSearchQuery,
    page,
    setPage,
    pageSize,
    totalCount,
    sortColumn,
    sortDirection,
    toggleSort,
    fetchServices,
    fetchClients,
    fetchUsers,
    getAvailableUsers,
  }
}
