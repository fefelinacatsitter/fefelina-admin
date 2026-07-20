import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { fetchAllRows } from '../lib/paginatedFetch'
import CatLoader from '../components/CatLoader'
import { 
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts'
import { format, startOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface DashboardStats {
  monthlyRevenue: number
  lastMonthRevenue: number
  monthlyVisits: number
  lastMonthVisits: number
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

interface RevenuePoint {
  key: string
  label: string
  receita: number
}

type RevenueRangeOption = 'year' | '12m' | '24m' | 'all'

export default function DashboardEnhanced() {
  const [stats, setStats] = useState<DashboardStats>({
    monthlyRevenue: 0,
    lastMonthRevenue: 0,
    monthlyVisits: 0,
    lastMonthVisits: 0,
    clientesNovos: 0
  })
  
  const [upcomingVisits, setUpcomingVisits] = useState<UpcomingVisit[]>([])
  const [revenueHistory, setRevenueHistory] = useState<RevenuePoint[]>([])
  const [revenueRange, setRevenueRange] = useState<RevenueRangeOption>('year')
  const [visitTypeData, setVisitTypeData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const today = new Date()
      const todayString = format(today, 'yyyy-MM-dd')
      const mesAtual = startOfMonth(today)

      // Dashboard não tem mais filtro de período: buscamos todo o histórico de
      // visitas realizadas de uma vez (em lotes, via fetchAllRows) para calcular
      // o faturamento mês a mês, os tipos de visita e as métricas do mês atual.
      const [realizedVisits, clientesNovosResult, upcomingResult] = await Promise.all([
        fetchAllRows(
          supabase.from('visits').select('data, valor, desconto_plataforma, tipo_visita').eq('status', 'realizada')
        ),
        supabase.from('clients').select('*', { count: 'exact', head: true }).gte('created_at', format(mesAtual, 'yyyy-MM-dd')),
        supabase
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
      ])

      const visits = realizedVisits || []

      // Agrupar faturamento e quantidade de visitas por mês (chave yyyy-MM)
      const revenueByMonth = new Map<string, number>()
      const countByMonth = new Map<string, number>()
      visits.forEach(v => {
        const monthKey = v.data.slice(0, 7)
        const net = v.valor * (1 - (v.desconto_plataforma || 0) / 100)
        revenueByMonth.set(monthKey, (revenueByMonth.get(monthKey) || 0) + net)
        countByMonth.set(monthKey, (countByMonth.get(monthKey) || 0) + 1)
      })

      // Preencher todos os meses entre o primeiro registro e o mês atual (sem lacunas)
      const history: RevenuePoint[] = []
      if (revenueByMonth.size > 0) {
        const sortedKeys = Array.from(revenueByMonth.keys()).sort()
        const cursor = new Date(sortedKeys[0] + '-01T00:00:00')
        const end = new Date(today.getFullYear(), today.getMonth(), 1)
        while (cursor <= end) {
          const key = format(cursor, 'yyyy-MM')
          history.push({
            key,
            label: format(cursor, 'MMM/yy', { locale: ptBR }),
            receita: revenueByMonth.get(key) || 0
          })
          cursor.setMonth(cursor.getMonth() + 1)
        }
      }

      // Tipos de visita (histórico completo)
      const visitTypeMap = new Map<string, number>()
      visits.forEach(v => {
        const tipo = v.tipo_visita || 'outros'
        visitTypeMap.set(tipo, (visitTypeMap.get(tipo) || 0) + 1)
      })

      const visitTypes = Array.from(visitTypeMap.entries()).map(([name, value]) => ({
        name: name === 'inteira' ? 'Inteira' : name === 'meia' ? 'Meia' : 'Outros',
        value
      }))

      // Comparação fixa: mês atual vs mês anterior (não depende mais de filtro)
      const currentMonthKey = format(today, 'yyyy-MM')
      const lastMonthKey = format(subMonths(today, 1), 'yyyy-MM')

      setStats({
        monthlyRevenue: revenueByMonth.get(currentMonthKey) || 0,
        lastMonthRevenue: revenueByMonth.get(lastMonthKey) || 0,
        monthlyVisits: countByMonth.get(currentMonthKey) || 0,
        lastMonthVisits: countByMonth.get(lastMonthKey) || 0,
        clientesNovos: clientesNovosResult.count || 0
      })

      const mappedVisits = (upcomingResult.data || []).map((visit: any) => ({
        ...visit,
        clients: Array.isArray(visit.clients) ? visit.clients[0] : visit.clients,
        leads: Array.isArray(visit.leads) ? visit.leads[0] : visit.leads
      })) as UpcomingVisit[]

      setUpcomingVisits(mappedVisits)
      setRevenueHistory(history)
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

  // Cores discretas/profissionais para o gráfico de pizza (tons da paleta da marca)
  const COLORS = ['#ff9f6c', '#a876e3', '#94a3b8', '#e8814a']

  const getRevenueChartData = (): RevenuePoint[] => {
    if (revenueRange === 'year') {
      const yearPrefix = format(new Date(), 'yyyy')
      return revenueHistory.filter(h => h.key.startsWith(yearPrefix))
    }
    if (revenueRange === '12m') return revenueHistory.slice(-12)
    if (revenueRange === '24m') return revenueHistory.slice(-24)

    // 'all' - se houver muitos meses de histórico, agrupar por ano para manter o gráfico legível
    if (revenueHistory.length > 36) {
      const byYear = new Map<string, number>()
      revenueHistory.forEach(h => {
        const year = h.key.slice(0, 4)
        byYear.set(year, (byYear.get(year) || 0) + h.receita)
      })
      return Array.from(byYear.entries()).map(([year, receita]) => ({ key: year, label: year, receita }))
    }
    return revenueHistory
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <CatLoader size="lg" variant="sleeping" text="Carregando dashboard..." />
      </div>
    )
  }

  const revenueGrowth = getGrowthPercentage(stats.monthlyRevenue, stats.lastMonthRevenue)
  const visitsGrowth = getGrowthPercentage(stats.monthlyVisits, stats.lastMonthVisits)
  // Memoizado: só reprocessa o histórico de receita quando ele muda ou quando
  // o usuário troca o período selecionado, em vez de refiltrar/agrupar a cada
  // re-render do componente.
  const revenueChartData = useMemo(() => getRevenueChartData(), [revenueHistory, revenueRange])
  const revenueChartTotal = useMemo(
    () => revenueChartData.reduce((sum, r) => sum + r.receita, 0),
    [revenueChartData]
  )

  return (
    <div className="space-y-6">
      <h1 className="page-title-fefelina">Dashboard</h1>
      
      {/* Cards de Estatísticas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Receita Mensal */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Receita Mensal</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.monthlyRevenue)}</p>
              <div className="flex items-center mt-2">
                <span className={`text-xs font-semibold ${revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {revenueGrowth >= 0 ? '↑' : '↓'} {Math.abs(revenueGrowth).toFixed(1)}%
                </span>
                <span className="text-xs text-gray-400 ml-1">vs mês anterior</span>
              </div>
            </div>
            <div className="bg-gray-100 rounded-full p-3">
              <span className="text-gray-500 text-2xl">💰</span>
            </div>
          </div>
        </div>

        {/* Visitas Realizadas */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Visitas Realizadas</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.monthlyVisits}</p>
              <div className="flex items-center mt-2">
                <span className={`text-xs font-semibold ${visitsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {visitsGrowth >= 0 ? '↑' : '↓'} {Math.abs(visitsGrowth).toFixed(1)}%
                </span>
                <span className="text-xs text-gray-400 ml-1">vs mês anterior</span>
              </div>
            </div>
            <div className="bg-gray-100 rounded-full p-3">
              <span className="text-gray-500 text-2xl">📅</span>
            </div>
          </div>
        </div>

        {/* Clientes Novos */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Clientes Novos</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.clientesNovos}</p>
              <p className="text-xs text-gray-400 mt-2">neste mês</p>
            </div>
            <div className="bg-gray-100 rounded-full p-3">
              <span className="text-gray-500 text-2xl">✨</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Faturamento */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Faturamento</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Total no período: <span className="font-medium text-gray-700">{formatCurrency(revenueChartTotal)}</span>
            </p>
          </div>
          <select
            value={revenueRange}
            onChange={(e) => setRevenueRange(e.target.value as RevenueRangeOption)}
            className="input-fefelina w-auto text-sm"
          >
            <option value="year">Este ano (mês a mês)</option>
            <option value="12m">Últimos 12 meses</option>
            <option value="24m">Últimos 24 meses</option>
            <option value="all">Todo o período</option>
          </select>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={revenueChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} width={90} />
            <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
            <Bar dataKey="receita" fill="#ff9f6c" name="Faturamento" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Gráficos secundários */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tipos de Visita */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
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
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
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
                    <p className="font-semibold text-gray-900">{formatCurrency(visit.valor)}</p>
                    <p className="text-xs text-gray-500 capitalize">{visit.tipo_visita}</p>
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
