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
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')
      const todayString = `${year}-${month}-${day}`

      // Calcular último dia do mês corretamente
      const lastDayOfMonth = new Date(year, today.getMonth() + 1, 0).getDate()
      const monthEndString = `${year}-${month}-${String(lastDayOfMonth).padStart(2, '0')}`

      // Buscar estatísticas
      const [clientsResult, petsResult, servicesResult, visitsResult, monthlyVisitsResult, paidServicesResult] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact' }),
        supabase.from('pets').select('*', { count: 'exact' }),
        supabase.from('services').select('*', { count: 'exact' }).neq('status_pagamento', 'pago'),
        supabase.from('visits').select('id, service_id, data, horario, tipo_visita, valor, status, desconto_plataforma, observacoes, client_id, created_at', { count: 'exact' }).eq('data', todayString),
        supabase.from('visits').select('valor, desconto_plataforma').eq('status', 'realizada').gte('data', `${year}-${month}-01`).lte('data', monthEndString),
        // Buscar TODOS os serviços pagos deste mês
        supabase.from('services').select('total_a_receber, data_inicio, data_fim, status_pagamento').eq('status_pagamento', 'pago').gte('data_inicio', `${year}-${month}-01`).lte('data_fim', monthEndString)
      ])

      // Buscar próximas visitas
      const upcomingResult = await supabase
        .from('visits')
        .select(`
          id, service_id, data, horario, tipo_visita, valor, status, desconto_plataforma, observacoes, client_id, created_at,
          clients(nome),
          services(nome_servico)
        `)
        .gte('data', todayString)
        .order('data', { ascending: true })
        .order('horario', { ascending: true })
        .limit(10)

      // Calcular receita mensal - priorizar serviços pagos, depois visitas realizadas
      const revenueFromPaidServices = paidServicesResult.data?.reduce((sum: number, service: any) => {
        return sum + service.total_a_receber
      }, 0) || 0

      const revenueFromVisits = monthlyVisitsResult.data?.reduce((sum: number, visit: any) => {
        const valorLiquido = visit.valor - (visit.desconto_plataforma || 0)
        return sum + valorLiquido
      }, 0) || 0

      // Se houver serviços pagos, usar esse valor, senão usar visitas realizadas
      const monthlyRevenue = revenueFromPaidServices > 0 ? revenueFromPaidServices : revenueFromVisits

      setStats({
        totalClients: clientsResult.count || 0,
        totalPets: petsResult.count || 0,
        activeServices: servicesResult.count || 0,
        visitsToday: visitsResult.count || 0,
        monthlyRevenue,
        monthlyVisits: Math.max(monthlyVisitsResult.data?.length || 0, paidServicesResult.data?.length || 0)
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
    
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      agendada: 'Agendada',
      realizada: 'Realizada',
      cancelada: 'Cancelada'
    }
    
    return labels[status as keyof typeof labels] || status
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
      
      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stats-card-fefelina">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="icon-fefelina bg-primary-500">
                <span>C</span>
              </div>
            </div>
            <div className="ml-4 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total de Clientes</dt>
                <dd className="text-base font-semibold text-gray-900">{stats.totalClients}</dd>
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
            <div className="ml-4 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total de Pets</dt>
                <dd className="text-base font-semibold text-gray-900">{stats.totalPets}</dd>
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
            <div className="ml-4 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Serviços Ativos</dt>
                <dd className="text-base font-semibold text-gray-900">{stats.activeServices}</dd>
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
            <div className="ml-4 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Visitas Hoje</dt>
                <dd className="text-base font-semibold text-gray-900">{stats.visitsToday}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Seção inferior responsiva */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Gráfico de Receita */}
        <div className="bg-white p-4 md:p-6 rounded-lg shadow">
          <h3 className="text-base font-medium text-gray-900 mb-4">Receita Mensal</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm md:text-base text-gray-600">Este Mês</span>
              <span className="font-semibold text-green-600">{formatCurrency(stats.monthlyRevenue)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-sm md:text-base text-gray-600">Visitas do Mês</span>
              <span className="font-semibold text-blue-600">{stats.monthlyVisits}</span>
            </div>
          </div>
        </div>

        {/* Próximas Visitas */}
        <div className="bg-white p-4 md:p-6 rounded-lg shadow">
          <h3 className="text-base font-medium text-gray-900 mb-4">Próximas Visitas</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {upcomingVisits.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhuma visita agendada</p>
            ) : (
              upcomingVisits.slice(0, 5).map((visit) => (
                <div key={visit.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 truncate">
                          {visit.clients?.nome || 'Cliente não encontrado'}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(visit.status)}`}>
                          {getStatusLabel(visit.status)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>{formatDate(visit.data)} às {visit.horario}</div>
                        <div className="flex items-center gap-2">
                          <span className="capitalize">{visit.tipo_visita}</span>
                          <span>•</span>
                          <span className="font-medium text-green-600">{formatCurrency(visit.valor)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
