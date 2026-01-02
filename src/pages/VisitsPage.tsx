import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import CatLoader from '../components/CatLoader'
import { useFieldMask } from '../hooks/useFieldMask'
import { usePermissions } from '../contexts/PermissionsContext'
import Avatar from '../components/Avatar'

// Funções auxiliares para validação de data
const validateDateInput = (value: string): string => {
  // Remove caracteres não numéricos exceto hífens
  const cleaned = value.replace(/[^\d-]/g, '')
  
  // Se o valor estiver vazio, retorna vazio
  if (!cleaned) return ''
  
  // Divide a data em partes
  const parts = cleaned.split('-')
  
  if (parts.length >= 1) {
    // Limita o ano a 4 dígitos
    const year = parts[0].slice(0, 4)
    
    // Valida se o ano é válido (entre 1900 e 2100)
    if (year.length === 4) {
      const yearNum = parseInt(year)
      if (yearNum < 1900 || yearNum > 2100) {
        return '' // Retorna vazio para anos inválidos
      }
    }
    
    // Reconstrói a data com as validações
    let result = year
    
    if (parts.length >= 2 && parts[1]) {
      // Limita o mês a 2 dígitos e valida (01-12)
      let month = parts[1].slice(0, 2)
      if (month.length === 2) {
        const monthNum = parseInt(month)
        if (monthNum < 1 || monthNum > 12) {
          month = '12' // Corrige para dezembro se inválido
        }
      }
      result += '-' + month
      
      if (parts.length >= 3 && parts[2]) {
        // Limita o dia a 2 dígitos e valida (01-31)
        let day = parts[2].slice(0, 2)
        if (day.length === 2) {
          const dayNum = parseInt(day)
          if (dayNum < 1 || dayNum > 31) {
            day = '01' // Corrige para dia 1 se inválido
          }
        }
        result += '-' + day
      }
    }
    
    return result
  }
  
  return cleaned
}

const isValidDate = (dateString: string): boolean => {
  if (!dateString) return false
  
  // Verifica o formato YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateString)) return false
  
  const date = new Date(dateString + 'T00:00:00')
  const [year, month, day] = dateString.split('-').map(Number)
  
  // Verifica se a data é válida
  return date.getFullYear() === year &&
         date.getMonth() === month - 1 &&
         date.getDate() === day &&
         year >= 1900 &&
         year <= 2100
}

interface Visit {
  id: string
  service_id: string
  client_id?: string | null
  lead_id?: string | null
  data: string
  horario: string
  tipo_visita: 'inteira' | 'meia'
  tipo_encontro?: 'pre_encontro' | 'visita_servico' | 'task'
  titulo?: string | null
  valor: number
  status: 'agendada' | 'realizada' | 'cancelada'
  desconto_plataforma: number
  observacoes?: string
  assigned_user_id?: string | null
  clients: {
    nome: string
  } | null
  services: {
    nome_servico?: string
    total_visitas?: number
  } | null
  leads?: {
    nome: string
  } | null
  isLastVisit?: boolean
}

interface ClientQuickInfo {
  endereco_completo?: string
  telefone?: string
  notas?: string
  pets: Array<{ nome: string; caracteristica: string }>
}

export default function VisitsPage() {
  const navigate = useNavigate()
  
  // Field-Level Security e Permissões
  const { maskField } = useFieldMask('visits')
  const { canUpdate, isAdmin, userProfile } = usePermissions()
  
  const canUpdateVisit = canUpdate('visits')
  
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingVisit, setUpdatingVisit] = useState<string | null>(null)
  const [selectedFilter, setSelectedFilter] = useState<'todas' | 'hoje' | 'proximas' | 'realizadas'>('hoje')
  const [hasFutureVisits, setHasFutureVisits] = useState(false)
  
  // Estados para filtros de data
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  
  // Estados para filtro por usuário (parceiro)
  const [filterByUser, setFilterByUser] = useState<string>('todos')
  const [users, setUsers] = useState<{id: string, full_name: string, email: string, avatar_url?: string}[]>([])
  const [usersMap, setUsersMap] = useState<Record<string, {full_name: string, avatar_url?: string}>>({})
  
  // Estados para tooltip de cliente
  const [hoveredVisitId, setHoveredVisitId] = useState<string | null>(null)
  const [clientsQuickInfo, setClientsQuickInfo] = useState<Record<string, ClientQuickInfo>>({})
  const [tooltipPosition, setTooltipPosition] = useState<'bottom' | 'top'>('bottom')
  
  // Estados para modal mobile de informações do cliente
  const [showMobileClientInfo, setShowMobileClientInfo] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)

  useEffect(() => {
    fetchVisits()
    checkFutureVisits()
    if (isAdmin) {
      fetchUsers()
    }
  }, [selectedFilter, filterStartDate, filterEndDate, filterByUser])

  const checkFutureVisits = async () => {
    try {
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')
      const todayStr = `${year}-${month}-${day}`

      const { data, error } = await supabase
        .from('visits')
        .select('id')
        .gt('data', todayStr)
        .eq('status', 'agendada')
        .limit(1)

      if (error) throw error
      setHasFutureVisits((data || []).length > 0)
    } catch (error) {
      console.error('Erro ao verificar visitas futuras:', error)
      setHasFutureVisits(false)
    }
  }

  const fetchVisits = async () => {
    try {
      let query = supabase
        .from('visits')
        .select(`
          id, service_id, lead_id, data, horario, tipo_visita, tipo_encontro, titulo, valor, status, desconto_plataforma, observacoes, client_id, created_at, assigned_user_id,
          clients (nome),
          services (nome_servico, total_visitas),
          leads (nome)
        `)
        .order('data', { ascending: true })
        .order('horario', { ascending: true })

      // Garantir que estamos usando a data local correta
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')
      const todayStr = `${year}-${month}-${day}`

      switch (selectedFilter) {
        case 'hoje':
          // Filtrar apenas visitas para hoje com status agendada
          query = query.eq('data', todayStr).eq('status', 'agendada')
          break
        case 'proximas':
          // Filtrar visitas de hoje e futuras, excluindo canceladas e realizadas (apenas agendadas)
          query = query.gte('data', todayStr).eq('status', 'agendada')
          break
        case 'realizadas':
          // Filtrar apenas visitas realizadas, ordenando da mais recente para a mais antiga
          query = query.eq('status', 'realizada').order('data', { ascending: false }).order('horario', { ascending: false })
          
          // Se não houver filtro de data específico, limitar aos últimos 3 meses
          if (!filterStartDate && !filterEndDate) {
            const threeMonthsAgo = new Date()
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
            const threeMonthsAgoStr = `${threeMonthsAgo.getFullYear()}-${String(threeMonthsAgo.getMonth() + 1).padStart(2, '0')}-${String(threeMonthsAgo.getDate()).padStart(2, '0')}`
            
            query = query.gte('data', threeMonthsAgoStr)
          }
          break
        default:
          // todas - sem filtro adicional, mas ordenar da mais recente para a mais antiga
          query = query.order('data', { ascending: false }).order('horario', { ascending: false })
          break
      }

      // Aplicar filtro por data se especificado
      if (filterStartDate) {
        query = query.gte('data', filterStartDate)
      }

      if (filterEndDate) {
        query = query.lte('data', filterEndDate)
      }

      // Aplicar filtro por usuário/parceiro (apenas para admin)
      if (isAdmin && filterByUser !== 'todos') {
        query = query.eq('assigned_user_id', filterByUser)
      }

      const { data, error } = await query

      if (error) throw error
      
      const visitsData = (data || []).map(visit => ({
        ...visit,
        clients: Array.isArray(visit.clients) ? visit.clients[0] : visit.clients,
        services: Array.isArray(visit.services) ? visit.services[0] : visit.services,
        leads: Array.isArray(visit.leads) ? visit.leads[0] : visit.leads
      }))

      // Identificar a última visita de cada serviço
      // Precisamos buscar TODAS as visitas de cada serviço para identificar corretamente a última
      const serviceIds = new Set<string>()
      visitsData.forEach(visit => {
        if (visit.service_id && visit.tipo_encontro === 'visita_servico') {
          serviceIds.add(visit.service_id)
        }
      })

      // Buscar todas as visitas de cada serviço
      if (serviceIds.size > 0) {
        const { data: allServiceVisits, error: serviceError } = await supabase
          .from('visits')
          .select('id, service_id, data, horario, status')
          .in('service_id', Array.from(serviceIds))
          .eq('tipo_encontro', 'visita_servico')
          .in('status', ['agendada', 'realizada'])

        if (!serviceError && allServiceVisits) {
          // Agrupar por serviço
          const visitsByService = new Map<string, typeof allServiceVisits>()
          
          allServiceVisits.forEach(visit => {
            if (!visitsByService.has(visit.service_id!)) {
              visitsByService.set(visit.service_id!, [])
            }
            visitsByService.get(visit.service_id!)!.push(visit)
          })

          // Marcar a última visita de cada serviço
          visitsByService.forEach((serviceVisits) => {
            // Ordenar por data e horário para encontrar a última
            const sortedVisits = serviceVisits.sort((a, b) => {
              if (a.data === b.data) {
                return a.horario.localeCompare(b.horario)
              }
              return a.data.localeCompare(b.data)
            })

            // A última visita é a que tem data/horário mais recente
            const lastVisitId = sortedVisits[sortedVisits.length - 1].id
            
            // Marcar a visita correspondente em visitsData
            const visitToMark = visitsData.find(v => v.id === lastVisitId)
            if (visitToMark) {
              (visitToMark as any).isLastVisit = true
            }
          })
        }
      }

      setVisits(visitsData)
    } catch (error) {
      console.error('Erro ao buscar visitas:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, email, avatar_url')
        .eq('is_active', true)
        .order('full_name', { ascending: true })

      if (error) throw error
      
      const usersData = (data || []).map(user => ({
        id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        avatar_url: user.avatar_url
      }))
      
      setUsers(usersData)
      
      // Criar mapa para acesso rápido pelo ID
      const map: Record<string, {full_name: string, avatar_url?: string}> = {}
      usersData.forEach(user => {
        map[user.id] = {
          full_name: user.full_name,
          avatar_url: user.avatar_url
        }
      })
      setUsersMap(map)
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
      toast.error('Erro ao carregar lista de parceiros')
    }
  }

  const updateVisitStatus = async (visitId: string, status: 'agendada' | 'realizada' | 'cancelada') => {
    if (updatingVisit === visitId) {
      toast.error('Aguarde, a visita está sendo atualizada...')
      return
    }

    setUpdatingVisit(visitId)

    try {
      const { error } = await supabase
        .from('visits')
        .update({ status })
        .eq('id', visitId)

      if (error) throw error
      
      const statusLabels = {
        'agendada': 'agendada',
        'realizada': 'marcada como realizada',
        'cancelada': 'cancelada'
      }
      
      toast.success(`Visita ${statusLabels[status]} com sucesso!`)
      await fetchVisits()
    } catch (error: any) {
      console.error('Erro ao atualizar status da visita:', error)
      toast.error(`Erro ao atualizar status da visita: ${error.message}`)
    } finally {
      setUpdatingVisit(null)
    }
  }

  const handleMouseEnter = (visitId: string, clientId: string, event: React.MouseEvent, visitIndex: number, totalVisits: number) => {
    setHoveredVisitId(visitId)
    fetchClientQuickInfo(clientId)
    
    // Detectar se é uma das últimas 2 linhas da tabela
    // Isso evita o scroll mesmo quando a tabela é pequena
    const isNearBottom = visitIndex >= totalVisits - 2
    
    if (isNearBottom) {
      setTooltipPosition('top')
    } else {
      // Calcular se há espaço suficiente embaixo na viewport
      const target = event.currentTarget
      const rect = target.getBoundingClientRect()
      const windowHeight = window.innerHeight
      const tooltipHeight = 200 // altura aproximada do tooltip
      
      // Se não há espaço suficiente embaixo, abre para cima
      if (rect.bottom + tooltipHeight > windowHeight) {
        setTooltipPosition('top')
      } else {
        setTooltipPosition('bottom')
      }
    }
  }

  const fetchClientQuickInfo = async (clientId: string) => {
    // Se já temos a informação em cache, não busca novamente
    if (clientsQuickInfo[clientId]) {
      return
    }

    try {
      // Buscar informações do cliente
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('endereco_completo, telefone, notas')
        .eq('id', clientId)
        .single()

      if (clientError) throw clientError

      // Buscar pets do cliente (todos, sem limite para o modal mobile)
      const { data: petsData, error: petsError } = await supabase
        .from('pets')
        .select('nome, caracteristica')
        .eq('client_id', clientId)
        .order('nome', { ascending: true })

      if (petsError) throw petsError

      setClientsQuickInfo(prev => ({
        ...prev,
        [clientId]: {
          endereco_completo: clientData.endereco_completo,
          telefone: clientData.telefone,
          notas: clientData.notas,
          pets: petsData || []
        }
      }))
    } catch (error) {
      console.error('Erro ao buscar informações do cliente:', error)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    // Criar data corretamente para evitar problemas de fuso horário
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    
    const today = new Date()
    const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    
    const tomorrow = new Date(todayLocal)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.getTime() === todayLocal.getTime()) {
      return 'Hoje'
    } else if (date.getTime() === tomorrow.getTime()) {
      return 'Amanhã'
    } else {
      return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
    }
  }

  // Ordenação decrescente para filtros realizadas e todas
  const getSortedVisits = () => {
    if (selectedFilter === 'realizadas' || selectedFilter === 'todas') {
      return [...visits].sort((a, b) => {
        if (a.data === b.data) {
          return b.horario.localeCompare(a.horario)
        }
        return b.data.localeCompare(a.data)
      })
    }
    return visits
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <CatLoader size="lg" variant="paws" text="Carregando visitas..." />
      </div>
    )
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="page-title-fefelina">Visitas</h1>
          <p className="mt-2 text-sm text-gray-700">
            Gerencie todas as visitas agendadas e realizadas.
          </p>
          <div className="divider-fefelina"></div>
        </div>
      </div>

      {/* Filtros */}
      <div className="mt-6 mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedFilter('hoje')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              selectedFilter === 'hoje'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Hoje
          </button>
          <button
            onClick={() => setSelectedFilter('proximas')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              selectedFilter === 'proximas'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Próximas
          </button>
          <button
            onClick={() => setSelectedFilter('realizadas')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              selectedFilter === 'realizadas'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Realizadas
          </button>
          <button
            onClick={() => setSelectedFilter('todas')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              selectedFilter === 'todas'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Todas
          </button>
        </div>

        {/* Filtro por parceiro (apenas admin) */}
        {isAdmin && users.length > 1 && (
          <div className="mt-4">
            <label htmlFor="filter-by-user" className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por parceiro
            </label>
            <select
              id="filter-by-user"
              value={filterByUser}
              onChange={(e) => setFilterByUser(e.target.value)}
              className="block w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="todos">Todos os parceiros</option>
              {userProfile && (
                <option value={userProfile.user_id}>{userProfile.full_name} (Você)</option>
              )}
              {users.filter(u => u.id !== userProfile?.user_id).map(user => (
                <option key={user.id} value={user.id}>{user.full_name}</option>
              ))}
            </select>
          </div>
        )}
        
        {/* Filtros por data */}
        {(selectedFilter === 'realizadas' || selectedFilter === 'todas') && (
          <div className="mt-4 flex flex-wrap gap-4 items-end">
            <div>
              <label htmlFor="filter-start-date" className="block text-sm font-medium text-gray-700 mb-1">
                Data inicial
              </label>
              <input
                type="date"
                id="filter-start-date"
                value={filterStartDate}
                onChange={(e) => {
                  const validatedDate = validateDateInput(e.target.value)
                  if (!validatedDate || isValidDate(validatedDate)) {
                    setFilterStartDate(validatedDate)
                  } else {
                    toast.error('Data inválida. Use o formato AAAA-MM-DD com ano entre 1900 e 2100.')
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value && !isValidDate(e.target.value)) {
                    toast.error('Data inválida. Corrigindo automaticamente.')
                    setFilterStartDate('')
                  }
                }}
                min="1900-01-01"
                max="2100-12-31"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label htmlFor="filter-end-date" className="block text-sm font-medium text-gray-700 mb-1">
                Data final
              </label>
              <input
                type="date"
                id="filter-end-date"
                value={filterEndDate}
                onChange={(e) => {
                  const validatedDate = validateDateInput(e.target.value)
                  if (!validatedDate || isValidDate(validatedDate)) {
                    setFilterEndDate(validatedDate)
                  } else {
                    toast.error('Data inválida. Use o formato AAAA-MM-DD com ano entre 1900 e 2100.')
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value && !isValidDate(e.target.value)) {
                    toast.error('Data inválida. Corrigindo automaticamente.')
                    setFilterEndDate('')
                  }
                }}
                min="1900-01-01"
                max="2100-12-31"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            {(filterStartDate || filterEndDate) && (
              <button
                onClick={() => {
                  setFilterStartDate('')
                  setFilterEndDate('')
                }}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md"
              >
                Limpar filtros
              </button>
            )}
            {selectedFilter === 'realizadas' && !filterStartDate && !filterEndDate && (
              <div className="text-sm text-gray-500 bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2">
                Mostrando apenas os últimos 3 meses
              </div>
            )}
          </div>
        )}
      </div>

      {visits.length === 0 ? (
        <div className="mt-8 card-fefelina">
          <div className="empty-state-fefelina">
            <div className="mx-auto h-16 w-16 text-primary-400 mb-4">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {selectedFilter === 'hoje' && hasFutureVisits 
                ? 'Nenhuma visita agendada para hoje'
                : selectedFilter === 'hoje' && !hasFutureVisits
                ? 'Você não tem nenhuma visita agendada'
                : selectedFilter === 'realizadas'
                ? (!filterStartDate && !filterEndDate 
                  ? 'Nenhuma visita realizada nos últimos 3 meses'
                  : 'Nenhuma visita realizada no período selecionado')
                : 'Nenhuma visita agendada'
              }
            </h3>
            <p className="text-gray-500 mb-6">
              {selectedFilter === 'hoje' && hasFutureVisits 
                ? 'Mas nos próximos dias você tem agendamentos.'
                : selectedFilter === 'hoje' && !hasFutureVisits
                ? 'Agendar uma visita para começar.'
                : selectedFilter === 'realizadas'
                ? (!filterStartDate && !filterEndDate 
                  ? 'Use os filtros de data para buscar em outros períodos.'
                  : 'Tente ajustar o período de busca.')
                : 'Agendar uma visita para começar.'
              }
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile: Cards */}
          <div className="block md:hidden space-y-4">
            {getSortedVisits().map((visit) => (
              <div key={visit.id} className={`border rounded-lg p-4 shadow-sm ${
                visit.isLastVisit ? 'border-l-4 border-l-orange-400 bg-orange-50/30' :
                visit.tipo_encontro === 'task' ? 'bg-blue-50 border-blue-200' : 
                visit.tipo_encontro === 'pre_encontro' ? 'bg-purple-50 border-purple-200' : 
                'bg-white'
              }`}>
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <div className="font-semibold text-primary-700 text-base flex items-center gap-1.5">
                      {formatDate(visit.data)} <span className="text-xs text-gray-500">{visit.horario}</span>
                      {visit.isLastVisit && (
                        <span className="text-sm" title="Última visita do serviço">🏁</span>
                      )}
                    </div>
                    {visit.tipo_encontro === 'task' ? (
                      <>
                        <div className="text-sm font-medium text-blue-700 flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                          Task: {visit.titulo || 'Sem título'}
                        </div>
                        <div className="text-xs text-blue-600 mt-0.5">
                          {visit.services?.nome_servico ? `Serviço: ${visit.services.nome_servico}` : 'Sem serviço vinculado'}
                        </div>
                      </>
                    ) : visit.tipo_encontro === 'pre_encontro' ? (
                      <>
                        <div className="text-sm font-medium text-purple-700 flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Lead: {visit.leads?.nome || 'Sem nome'}
                        </div>
                        <div className="text-xs text-purple-600 mt-0.5">Pré-Encontro</div>
                      </>
                    ) : (
                      <>
                        {visit.client_id ? (
                          <div className="flex items-center gap-2">
                            <div className="text-sm text-gray-700 font-medium">{visit.clients?.nome}</div>
                            <button
                              onClick={() => {
                                setSelectedClientId(visit.client_id!)
                                fetchClientQuickInfo(visit.client_id!)
                                setShowMobileClientInfo(true)
                              }}
                              className="text-primary-600 hover:text-primary-800 p-1"
                              title="Ver informações do cliente"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-700">{visit.clients?.nome}</div>
                        )}
                        {visit.services?.nome_servico && (
                          <div className="text-xs text-gray-500">{visit.services.nome_servico}</div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 items-end">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${visit.tipo_visita === 'inteira' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>{visit.tipo_visita === 'inteira' ? 'Inteira' : 'Meia'}</span>
                    {visit.isLastVisit && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                        🏁 Última
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-center mb-2">
                  <span className="text-sm font-medium text-gray-900">{maskField('valor', formatCurrency(visit.valor))}</span>
                  {visit.desconto_plataforma > 0 && (
                    <span className="text-xs text-gray-500">Desc: {maskField('desconto_plataforma', `${visit.desconto_plataforma}%`)}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 items-center mb-2">
                  <span className="text-xs font-medium">Status:</span>
                  <select
                    value={visit.status}
                    onChange={(e) => updateVisitStatus(visit.id, e.target.value as any)}
                    disabled={updatingVisit === visit.id || !canUpdateVisit}
                    className="text-xs border-0 bg-gray-100 focus:ring-1 focus:ring-primary-500 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="agendada">Agendada</option>
                    <option value="realizada">Realizada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
                {visit.assigned_user_id && usersMap[visit.assigned_user_id] && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-gray-700">Responsável:</span>
                    <div className="flex items-center gap-2">
                      <Avatar
                        avatarId={usersMap[visit.assigned_user_id].avatar_url}
                        name={usersMap[visit.assigned_user_id].full_name}
                        size="xs"
                        className="border border-gray-200"
                      />
                      <span className="text-xs text-gray-600">
                        {usersMap[visit.assigned_user_id].full_name}
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  {visit.status === 'agendada' && (
                    <button
                      onClick={() => updateVisitStatus(visit.id, 'realizada')}
                      disabled={updatingVisit === visit.id}
                      className={`text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700 ${updatingVisit === visit.id ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-200'}`}
                    >
                      {updatingVisit === visit.id ? 'Atualizando...' : 'Marcar Realizada'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {/* Desktop: Tabela */}
          <div className="hidden md:block card-fefelina">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data/Horário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente/Serviço
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Responsável
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getSortedVisits().map((visit, index, array) => (
                    <tr key={visit.id} className={`${
                      visit.isLastVisit ? 'border-l-4 border-l-orange-400 bg-orange-50/20' :
                      visit.tipo_encontro === 'task' ? 'bg-blue-50' : 
                      visit.tipo_encontro === 'pre_encontro' ? 'bg-purple-50' : 
                      'hover:bg-gray-50'
                    }`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                          {formatDate(visit.data)}
                          {visit.isLastVisit && (
                            <span className="text-base" title="Última visita do serviço">🏁</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {visit.horario}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {visit.tipo_encontro === 'task' ? (
                          <div>
                            <div className="text-sm font-medium text-blue-700 flex items-center gap-1.5">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                              </svg>
                              Task: {visit.titulo || 'Sem título'}
                            </div>
                            <div className="text-xs text-blue-600 mt-0.5 flex items-center gap-1">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-200 text-blue-800">
                                Task
                              </span>
                              {visit.services?.nome_servico && (
                                <span className="text-gray-600">· {visit.services.nome_servico}</span>
                              )}
                            </div>
                          </div>
                        ) : visit.tipo_encontro === 'pre_encontro' ? (
                          <div>
                            <div className="text-sm font-medium text-purple-700 flex items-center gap-1.5">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Lead: {visit.leads?.nome || 'Sem nome'}
                            </div>
                            <div className="text-xs text-purple-600 mt-0.5 flex items-center gap-1">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-200 text-purple-800">
                                Pré-Encontro
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {visit.client_id ? (
                              <div className="relative inline-block group">
                                <button
                                  onClick={() => navigate(`/clients/${visit.client_id}`)}
                                  onMouseEnter={(e) => {
                                    if (visit.client_id) {
                                      handleMouseEnter(visit.id, visit.client_id, e, index, array.length)
                                    }
                                  }}
                                  onMouseLeave={() => setHoveredVisitId(null)}
                                  className="text-sm font-medium text-primary-600 hover:text-primary-800 hover:underline text-left"
                                >
                                  {visit.clients?.nome}
                                </button>
                                
                                {/* Tooltip Desktop */}
                                {hoveredVisitId === visit.id && visit.client_id && clientsQuickInfo[visit.client_id] && (
                                  <div className={`absolute left-0 z-50 w-72 bg-white rounded-md shadow-lg border border-gray-200 p-2.5 text-left pointer-events-none ${
                                    tooltipPosition === 'bottom' ? 'top-full mt-1' : 'bottom-full mb-1'
                                  }`}>
                                    <div className="space-y-1.5 text-xs">
                                      {clientsQuickInfo[visit.client_id].endereco_completo && (
                                        <div className="flex items-start gap-1.5">
                                          <svg className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                          </svg>
                                          <p className="text-gray-600 flex-1 leading-tight line-clamp-2">{clientsQuickInfo[visit.client_id].endereco_completo}</p>
                                        </div>
                                      )}
                                      {clientsQuickInfo[visit.client_id].telefone && (
                                        <div className="flex items-center gap-1.5">
                                          <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                          </svg>
                                          <p className="text-gray-600">{clientsQuickInfo[visit.client_id].telefone}</p>
                                        </div>
                                      )}
                                      {clientsQuickInfo[visit.client_id].pets.length > 0 && (
                                        <div className="pt-1.5 border-t border-gray-100">
                                          <div className="flex items-center gap-1 mb-1">
                                            <svg className="w-3 h-3 text-primary-500" fill="currentColor" viewBox="0 0 24 24">
                                              <path d="M8.5 5C7.67157 5 7 5.67157 7 6.5C7 7.32843 7.67157 8 8.5 8C9.32843 8 10 7.32843 10 6.5C10 5.67157 9.32843 5 8.5 5Z"/>
                                              <path d="M15.5 5C14.6716 5 14 5.67157 14 6.5C14 7.32843 14.6716 8 15.5 8C16.3284 8 17 7.32843 17 6.5C17 5.67157 16.3284 5 15.5 5Z"/>
                                              <path d="M5 9.5C5 8.67157 5.67157 8 6.5 8C7.32843 8 8 8.67157 8 9.5C8 10.3284 7.32843 11 6.5 11C5.67157 11 5 10.3284 5 9.5Z"/>
                                              <path d="M17.5 8C16.6716 8 16 8.67157 16 9.5C16 10.3284 16.6716 11 17.5 11C18.3284 11 19 10.3284 19 9.5C19 8.67157 18.3284 8 17.5 8Z"/>
                                              <path d="M12 10C9.79086 10 8 11.7909 8 14C8 15.8638 9.27477 17.4299 11 17.874V19C11 19.5523 11.4477 20 12 20C12.5523 20 13 19.5523 13 19V17.874C14.7252 17.4299 16 15.8638 16 14C16 11.7909 14.2091 10 12 10Z"/>
                                            </svg>
                                            <span className="font-medium text-gray-700">Pets:</span>
                                          </div>
                                          {clientsQuickInfo[visit.client_id].pets.map((pet, idx) => (
                                            <div key={idx} className="text-gray-600 ml-4 leading-tight">
                                              • <span className="font-medium">{pet.nome}</span> <span className="text-gray-400 text-[10px]">·</span> <span className="text-[10px]">{pet.caracteristica}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-sm font-medium text-gray-900">
                                {visit.clients?.nome}
                              </div>
                            )}
                            {visit.services?.nome_servico && (
                              <div className="text-sm text-gray-500">
                                {visit.services.nome_servico}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            visit.tipo_visita === 'inteira' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {visit.tipo_visita === 'inteira' ? 'Inteira' : 'Meia'}
                          </span>
                          {visit.isLastVisit && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                              🏁 Última
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {maskField('valor', formatCurrency(visit.valor))}
                        {visit.desconto_plataforma > 0 && (
                          <div className="text-xs text-gray-500">
                            Desc: {maskField('desconto_plataforma', `${visit.desconto_plataforma}%`)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={visit.status}
                          onChange={(e) => updateVisitStatus(visit.id, e.target.value as any)}
                          disabled={updatingVisit === visit.id || !canUpdateVisit}
                          className="text-xs border-0 bg-transparent focus:ring-1 focus:ring-primary-500 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="agendada">Agendada</option>
                          <option value="realizada">Realizada</option>
                          <option value="cancelada">Cancelada</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {visit.assigned_user_id && usersMap[visit.assigned_user_id] ? (
                          <div className="group relative inline-flex items-center justify-center">
                            <Avatar
                              avatarId={usersMap[visit.assigned_user_id].avatar_url}
                              name={usersMap[visit.assigned_user_id].full_name}
                              size="sm"
                              className="border-2 border-gray-200"
                            />
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 whitespace-nowrap">
                              <div className="bg-gray-900 text-white text-xs rounded py-1 px-2">
                                {usersMap[visit.assigned_user_id].full_name}
                              </div>
                              <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          {visit.status === 'agendada' && (
                            <button
                              onClick={() => updateVisitStatus(visit.id, 'realizada')}
                              disabled={updatingVisit === visit.id}
                              className={`text-xs font-medium ${
                                updatingVisit === visit.id 
                                  ? 'text-gray-400 cursor-not-allowed' 
                                  : 'text-green-600 hover:text-green-900'
                              }`}
                            >
                              {updatingVisit === visit.id ? 'Atualizando...' : 'Marcar Realizada'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal Mobile: Informações do Cliente */}
      {showMobileClientInfo && selectedClientId && clientsQuickInfo[selectedClientId] && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end md:hidden">
          <div className="bg-white w-full rounded-t-2xl shadow-xl max-h-[80vh] overflow-y-auto">
            {/* Header do Modal */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Informações do Cliente</h3>
              <button
                onClick={() => {
                  setShowMobileClientInfo(false)
                  setSelectedClientId(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-4 space-y-4">
              {/* Endereço */}
              {clientsQuickInfo[selectedClientId].endereco_completo && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-start gap-2 mb-1">
                    <svg className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div className="flex-1">
                      <h4 className="text-xs font-semibold text-gray-700 uppercase mb-1">Endereço</h4>
                      <p className="text-sm text-gray-900 leading-relaxed">{clientsQuickInfo[selectedClientId].endereco_completo}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Telefone */}
              {clientsQuickInfo[selectedClientId].telefone && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <div className="flex-1">
                      <h4 className="text-xs font-semibold text-gray-700 uppercase mb-1">Telefone</h4>
                      <a href={`tel:${clientsQuickInfo[selectedClientId].telefone}`} className="text-sm text-primary-600 font-medium hover:underline">
                        {clientsQuickInfo[selectedClientId].telefone}
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Pets */}
              {clientsQuickInfo[selectedClientId].pets.length > 0 && (
                <div className="bg-primary-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8.5 5C7.67157 5 7 5.67157 7 6.5C7 7.32843 7.67157 8 8.5 8C9.32843 8 10 7.32843 10 6.5C10 5.67157 9.32843 5 8.5 5Z"/>
                      <path d="M15.5 5C14.6716 5 14 5.67157 14 6.5C14 7.32843 14.6716 8 15.5 8C16.3284 8 17 7.32843 17 6.5C17 5.67157 16.3284 5 15.5 5Z"/>
                      <path d="M5 9.5C5 8.67157 5.67157 8 6.5 8C7.32843 8 8 8.67157 8 9.5C8 10.3284 7.32843 11 6.5 11C5.67157 11 5 10.3284 5 9.5Z"/>
                      <path d="M17.5 8C16.6716 8 16 8.67157 16 9.5C16 10.3284 16.6716 11 17.5 11C18.3284 11 19 10.3284 19 9.5C19 8.67157 18.3284 8 17.5 8Z"/>
                      <path d="M12 10C9.79086 10 8 11.7909 8 14C8 15.8638 9.27477 17.4299 11 17.874V19C11 19.5523 11.4477 20 12 20C12.5523 20 13 19.5523 13 19V17.874C14.7252 17.4299 16 15.8638 16 14C16 11.7909 14.2091 10 12 10Z"/>
                    </svg>
                    <h4 className="text-xs font-semibold text-gray-700 uppercase">Pets</h4>
                  </div>
                  <div className="space-y-2">
                    {clientsQuickInfo[selectedClientId].pets.map((pet, idx) => (
                      <div key={idx} className="bg-white rounded-md p-2 border border-primary-100">
                        <p className="text-sm font-semibold text-gray-900">{pet.nome}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{pet.caracteristica}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notas */}
              {clientsQuickInfo[selectedClientId].notas && (
                <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                  <div className="flex items-start gap-2 mb-1">
                    <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="flex-1">
                      <h4 className="text-xs font-semibold text-yellow-900 uppercase mb-1">Notas Importantes</h4>
                      <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">{clientsQuickInfo[selectedClientId].notas}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Botão para ver perfil completo */}
              <button
                onClick={() => {
                  navigate(`/clients/${selectedClientId}`)
                  setShowMobileClientInfo(false)
                  setSelectedClientId(null)
                }}
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                Ver Perfil Completo do Cliente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
