import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import CatLoader from '../components/CatLoader'
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts'
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface DashboardStats {
  totalClients: number
  totalPets: number
  activeServices: number
  visitsToday: number
  monthlyRevenue: number
  monthlyVisits: number
  lastMonthRevenue: number
  lastMonthVisits: number
  visitasRealizadas: number
  visitasAgendadas: number
  ticketMedio: number
  clientesNovos: number
}

interface UpcomingVisit {
  id: string
  data: string
  horario: string
  tipo_visita: string
  valor: number
  status: string
  clients: { nome: string } | null
  leads: { nome: string } | null
}

interface ChartData {
  name: string
  visitas: number
  receita: number
}

export default function DashboardEnhanced() {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalPets: 0,
    activeServices: 0,
    visitsToday: 0,
    monthlyRevenue: 0,
    monthlyVisits: 0,
    lastMonthRevenue: 0,
    lastMonthVisits: 0,
    visitasRealizadas: 0,
    visitasAgendadas: 0,
    ticketMedio: 0,
    clientesNovos: 0
  })
  
  const [upcomingVisits, setUpcomingVisits] = useState<UpcomingVisit[]>([])
  const [weeklyData, setWeeklyData] = useState<ChartData[]>([])
  const [monthlyTrend, setMonthlyTrend] = useState<ChartData[]>([])
  const [visitTypeData, setVisitTypeData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d')

  useEffect(() => {
    fetchDashboardData()
  }, [selectedPeriod])

  const fetchDashboardData = async () => {
    try {
      const today = new Date()
      const todayString = format(today, 'yyyy-MM-dd')
      
      // Calcular período baseado no filtro selecionado
      const periodDays = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90
      const periodStartDate = subDays(today, periodDays)
      const periodStart = format(periodStartDate, 'yyyy-MM-dd')
      
      // Período anterior (para comparação)
      const previousPeriodStart = format(subDays(periodStartDate, periodDays), 'yyyy-MM-dd')
      const previousPeriodEnd = format(subDays(periodStartDate, 1), 'yyyy-MM-dd')
      
      // Mês atual (para algumas métricas específicas)
      const mesAtual = startOfMonth(today)

      // Buscar dados básicos
      const [
        clientsResult,
        petsResult,
        servicesResult,
        visitsTodayResult,
        periodVisitsResult,
        previousPeriodVisitsResult,
        clientesNovosResult
      ] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact' }),
        supabase.from('pets').select('*', { count: 'exact' }),
        supabase.from('services').select('*', { count: 'exact' }).neq('status_pagamento', 'pago'),
        supabase.from('visits').select('*', { count: 'exact' }).eq('data', todayString),
        // Visitas do período selecionado
        supabase.from('visits').select('valor, desconto_plataforma, status, tipo_visita, data').gte('data', periodStart).lte('data', todayString),
        // Visitas do período anterior (para comparação)
        supabase.from('visits').select('valor, desconto_plataforma, status').eq('status', 'realizada').gte('data', previousPeriodStart).lte('data', previousPeriodEnd),
        supabase.from('clients').select('*', { count: 'exact', head: true }).gte('created_at', format(mesAtual, 'yyyy-MM-dd'))
      ])

      // Buscar próximas visitas
      const upcomingResult = await supabase
        .from('visits')
        .select(`
          id, data, horario, tipo_visita, valor, status,
          clients(nome),
          leads(nome)
        `)
        .gte('data', todayString)
        .in('status', ['agendada'])
        .order('data', { ascending: true })
        .order('horario', { ascending: true })
        .limit(8)

      // Calcular estatísticas do período selecionado
      const periodVisitsData = periodVisitsResult.data || []
      const previousPeriodVisitsData = previousPeriodVisitsResult.data || []
      
      const visitasRealizadas = periodVisitsData.filter(v => v.status === 'realizada').length
      const visitasAgendadas = periodVisitsData.filter(v => v.status === 'agendada').length
      
      const periodRevenue = periodVisitsData
        .filter(v => v.status === 'realizada')
        .reduce((sum, v) => sum + (v.valor * (1 - (v.desconto_plataforma || 0) / 100)), 0)
      
      const previousPeriodRevenue = previousPeriodVisitsData
        .reduce((sum, v) => sum + (v.valor * (1 - (v.desconto_plataforma || 0) / 100)), 0)

      const ticketMedio = visitasRealizadas > 0 ? periodRevenue / visitasRealizadas : 0

      // Processar tipos de visita do período
      const visitTypeMap = new Map()
      periodVisitsData.forEach(v => {
        if (v.status === 'realizada') {
          const tipo = v.tipo_visita || 'outros'
          visitTypeMap.set(tipo, (visitTypeMap.get(tipo) || 0) + 1)
        }
      })

      const visitTypes = Array.from(visitTypeMap.entries()).map(([name, value]) => ({
        name: name === 'inteira' ? 'Inteira' : name === 'meia' ? 'Meia' : 'Outros',
        value
      }))

      // Dados por dia do período selecionado
      const dayData: ChartData[] = []
      const daysToShow = periodDays <= 7 ? periodDays : 7 // Mostrar no máximo 7 dias no gráfico
      
      for (let i = daysToShow - 1; i >= 0; i--) {
        const date = subDays(today, i)
        const dateStr = format(date, 'yyyy-MM-dd')
        const dayVisits = periodVisitsData.filter(v => v.data === dateStr && v.status === 'realizada')
        
        dayData.push({
          name: format(date, 'EEE', { locale: ptBR }),
          visitas: dayVisits.length,
          receita: dayVisits.reduce((sum, v) => sum + (v.valor * (1 - (v.desconto_plataforma || 0) / 100)), 0)
        })
      }

      // Tendência mensal (últimos 6 meses)
      const monthlyData: ChartData[] = []
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(today, i)
        const monthStart = startOfMonth(monthDate)
        const monthEnd = endOfMonth(monthDate)
        
        const monthVisitsResult = await supabase
          .from('visits')
          .select('valor, desconto_plataforma')
          .eq('status', 'realizada')
          .gte('data', format(monthStart, 'yyyy-MM-dd'))
          .lte('data', format(monthEnd, 'yyyy-MM-dd'))

        const monthVisits = monthVisitsResult.data || []
        
        monthlyData.push({
          name: format(monthDate, 'MMM', { locale: ptBR }),
          visitas: monthVisits.length,
          receita: monthVisits.reduce((sum, v) => sum + (v.valor * (1 - (v.desconto_plataforma || 0) / 100)), 0)
        })
      }

      setStats({
        totalClients: clientsResult.count || 0,
        totalPets: petsResult.count || 0,
        activeServices: servicesResult.count || 0,
        visitsToday: visitsTodayResult.count || 0,
        monthlyRevenue: periodRevenue,
        monthlyVisits: visitasRealizadas,
        lastMonthRevenue: previousPeriodRevenue,
        lastMonthVisits: previousPeriodVisitsData.length,
        visitasRealizadas,
        visitasAgendadas,
        ticketMedio,
        clientesNovos: clientesNovosResult.count || 0
      })

      const mappedVisits = (upcomingResult.data || []).map((visit: any) => ({
        ...visit,
        clients: Array.isArray(visit.clients) ? visit.clients[0] : visit.clients,
        leads: Array.isArray(visit.leads) ? visit.leads[0] : visit.leads
      })) as UpcomingVisit[]

      setUpcomingVisits(mappedVisits)
      setWeeklyData(dayData)
      setMonthlyTrend(monthlyData)
      setVisitTypeData(visitTypes)

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
    const date = new Date(dateString + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.getTime() === today.getTime()) return 'Hoje'
    if (date.getTime() === tomorrow.getTime()) return 'Amanhã'
    return format(date, "EEE, dd/MM", { locale: ptBR })
  }

  const getGrowthPercentage = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <CatLoader size="lg" variant="sleeping" text="Carregando dashboard..." />
      </div>
    )
  }

  const revenueGrowth = getGrowthPercentage(stats.monthlyRevenue, stats.lastMonthRevenue)
  const visitsGrowth = getGrowthPercentage(stats.monthlyVisits, stats.lastMonthVisits)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title-fefelina">Dashboard</h1>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value as any)}
          className="input-fefelina w-auto text-sm"
        >
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
          <option value="90d">Últimos 90 dias</option>
        </select>
      </div>
      
      {/* Cards de Estatísticas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Receita Mensal */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-lg shadow-md border border-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Receita Mensal</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.monthlyRevenue)}</p>
              <div className="flex items-center mt-2">
                <span className={`text-xs font-medium ${revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {revenueGrowth >= 0 ? '↑' : '↓'} {Math.abs(revenueGrowth).toFixed(1)}%
                </span>
                <span className="text-xs text-gray-500 ml-1">vs mês anterior</span>
              </div>
            </div>
            <div className="bg-green-500 rounded-full p-3">
              <span className="text-white text-2xl">💰</span>
            </div>
          </div>
        </div>

        {/* Visitas do Mês */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg shadow-md border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Visitas Realizadas</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.visitasRealizadas}</p>
              <div className="flex items-center mt-2">
                <span className={`text-xs font-medium ${visitsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {visitsGrowth >= 0 ? '↑' : '↓'} {Math.abs(visitsGrowth).toFixed(1)}%
                </span>
                <span className="text-xs text-gray-500 ml-1">vs mês anterior</span>
              </div>
            </div>
            <div className="bg-blue-500 rounded-full p-3">
              <span className="text-white text-2xl">📅</span>
            </div>
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-lg shadow-md border border-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Ticket Médio</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.ticketMedio)}</p>
              <p className="text-xs text-gray-500 mt-2">{stats.totalClients} clientes ativos</p>
            </div>
            <div className="bg-purple-500 rounded-full p-3">
              <span className="text-white text-2xl">💳</span>
            </div>
          </div>
        </div>

        {/* Clientes Novos */}
        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 p-6 rounded-lg shadow-md border border-orange-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Clientes Novos</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.clientesNovos}</p>
              <p className="text-xs text-gray-500 mt-2">neste mês</p>
            </div>
            <div className="bg-orange-500 rounded-full p-3">
              <span className="text-white text-2xl">✨</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Tendência Mensal */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendência de Receita (6 meses)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                formatter={(value: any, name?: string) => {
                  if (name === 'receita') return formatCurrency(value)
                  return value
                }}
              />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={2} name="Receita (R$)" />
              <Line yAxisId="right" type="monotone" dataKey="visitas" stroke="#3b82f6" strokeWidth={2} name="Visitas" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico Semanal */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Visitas por Dia (Última Semana)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="visitas" fill="#3b82f6" name="Visitas" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tipos de Visita */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuição por Tipo de Visita</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={visitTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {visitTypeData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Próximas Visitas */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Próximas Visitas Agendadas</h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {upcomingVisits.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhuma visita agendada</p>
            ) : (
              upcomingVisits.map((visit) => (
                <div key={visit.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {visit.clients?.nome || visit.leads?.nome || 'Cliente'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(visit.data)} • {visit.horario}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-semibold text-green-600">{formatCurrency(visit.valor)}</p>
                    <p className="text-xs text-gray-500 capitalize">{visit.tipo_visita}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Cards de Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Visitas Realizadas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.visitasRealizadas}</p>
            </div>
            <span className="text-3xl">✅</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Visitas Agendadas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.visitasAgendadas}</p>
            </div>
            <span className="text-3xl">📋</span>
          </div>
        </div>
      </div>
    </div>
  )
}
