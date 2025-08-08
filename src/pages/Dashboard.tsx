import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface DashboardStats {
  totalClients: number
  totalPets: number
  activeServices: number
  visitsToday: number
  monthlyRevenue: number
  monthlyVisits: number
}

interface UpcomingVisit {
  id: string
  data: string
  horario: string
  tipo_visita: 'inteira' | 'meia'
  valor: number
  status: string
  status_pagamento: string
  clients: {
    nome: string
  } | null
  services: {
    nome_servico?: string
  } | null
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalPets: 0,
    activeServices: 0,
    visitsToday: 0,
    monthlyRevenue: 0,
    monthlyVisits: 0
  })
  const [upcomingVisits, setUpcomingVisits] = useState<UpcomingVisit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Garantir que estamos usando a data local correta
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')
      const todayStr = `${year}-${month}-${day}`
      
      // Buscar estatísticas básicas
      const [clientsResult, petsResult, servicesResult, visitsResult, upcomingResult, monthlyRevenueResult] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('pets').select('id', { count: 'exact', head: true }),
        supabase.from('services').select('id', { count: 'exact', head: true }).in('status', ['pendente', 'em_andamento', 'concluido']).gte('data_fim', todayStr),
        supabase.from('visits').select('id', { count: 'exact', head: true }).eq('data', todayStr).neq('status', 'cancelada'),
        supabase
          .from('visits')
          .select(`
            id,
            data,
            horario,
            tipo_visita,
            valor,
            status,
            status_pagamento,
            clients (nome),
            services (nome_servico)
          `)
          .gte('data', todayStr)
          .neq('status', 'cancelada')
          .order('data', { ascending: true })
          .order('horario', { ascending: true })
          .limit(10),
        // Receita do mês atual
        supabase
          .from('visits')
          .select('valor, status_pagamento')
          .gte('data', `${year}-${month}-01`)
          .lte('data', `${year}-${month}-31`)
          .eq('status_pagamento', 'pago')
          .neq('status', 'cancelada')
      ])

      const monthlyRevenue = monthlyRevenueResult.data?.reduce((sum, visit) => sum + visit.valor, 0) || 0
      const monthlyVisits = monthlyRevenueResult.count || 0

      setStats({
        totalClients: clientsResult.count || 0,
        totalPets: petsResult.count || 0,
        activeServices: servicesResult.count || 0,
        visitsToday: visitsResult.count || 0,
        monthlyRevenue,
        monthlyVisits
      })

      setUpcomingVisits((upcomingResult.data || []).map(visit => ({
        ...visit,
        clients: Array.isArray(visit.clients) ? visit.clients[0] : visit.clients,
        services: Array.isArray(visit.services) ? visit.services[0] : visit.services
      })))
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error)
    } finally {
      setLoading(false)
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

  const getStatusBadge = (status: string) => {
    const styles = {
      agendada: 'bg-blue-100 text-blue-800',
      realizada: 'bg-green-100 text-green-800',
      cancelada: 'bg-red-100 text-red-800'
    }
    
    const labels = {
      agendada: 'Agendada',
      realizada: 'Realizada',
      cancelada: 'Cancelada'
    }
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  const getPaymentStatusBadge = (status: string) => {
    const styles = {
      pendente: 'bg-yellow-100 text-yellow-800',
      pendente_plataforma: 'bg-orange-100 text-orange-800',
      pago: 'bg-green-100 text-green-800'
    }
    
    const labels = {
      pendente: 'Pendente',
      pendente_plataforma: 'Pendente Plataforma',
      pago: 'Pago'
    }
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="page-title-fefelina">Dashboard</h1>
      <div className="divider-fefelina"></div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="stats-card-fefelina">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="icon-fefelina bg-primary-500">
                <span>C</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total de Clientes</dt>
                <dd className="text-lg font-semibold text-gray-900">{stats.totalClients}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="stats-card-fefelina">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="icon-fefelina bg-accent-500">
                <span>P</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total de Pets</dt>
                <dd className="text-lg font-semibold text-gray-900">{stats.totalPets}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="stats-card-fefelina">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="icon-fefelina bg-secondary-600">
                <span>S</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Serviços Ativos</dt>
                <dd className="text-lg font-semibold text-gray-900">{stats.activeServices}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="stats-card-fefelina">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="icon-fefelina bg-yellow-500">
                <span>V</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Visitas Hoje</dt>
                <dd className="text-lg font-semibold text-gray-900">{stats.visitsToday}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Cards Financeiros do Mês */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo Financeiro - {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="stats-card-fefelina">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="icon-fefelina bg-green-500">
                  <span>R$</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Receita do Mês</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(stats.monthlyRevenue)}
                  </dd>
                  <dd className="text-sm text-green-600">Valores já recebidos</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="stats-card-fefelina">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="icon-fefelina bg-blue-500">
                  <span>📊</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Visitas Pagas no Mês</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats.monthlyVisits}</dd>
                  <dd className="text-sm text-blue-600">Visitas já realizadas e pagas</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card-fefelina">
        <h3 className="section-title-fefelina mb-4">
          Próximas Visitas
        </h3>
        <div className="section-divider-fefelina"></div>
        
        {upcomingVisits.length === 0 ? (
          <div className="empty-state-fefelina">
            <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Nenhuma visita agendada</h4>
            <p className="text-gray-500">Não há visitas programadas para os próximos dias.</p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Horário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
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
                    Pagamento
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {upcomingVisits.map((visit) => (
                  <tr key={visit.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(visit.data)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {visit.horario}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {visit.clients?.nome}
                      </div>
                      {visit.services?.nome_servico && (
                        <div className="text-sm text-gray-500">
                          {visit.services.nome_servico}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        visit.tipo_visita === 'inteira' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {visit.tipo_visita === 'inteira' ? 'Inteira' : 'Meia'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(visit.valor)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(visit.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPaymentStatusBadge(visit.status_pagamento)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
