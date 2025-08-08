import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Area, AreaChart
} from 'recharts'
import { 
  TrendingUp, DollarSign, Filter,
  Eye, Download, CreditCard, Clock, CheckCircle
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface FinancialData {
  totalReceived: number
  totalPending: number
  totalPendingPlatform: number
  monthlyRevenue: Array<{
    month: string
    revenue: number
    visits: number
  }>
  statusDistribution: Array<{
    name: string
    value: number
    color: string
  }>
  recentTransactions: Array<{
    id: string
    client: string
    service: string
    date: string
    amount: number
    status: string
  }>
}

interface FilterOptions {
  period: 'month' | 'quarter' | 'year' | 'custom'
  year: number
  month?: number
  startDate?: string
  endDate?: string
}

export default function FinancesPage() {
  const [financialData, setFinancialData] = useState<FinancialData>({
    totalReceived: 0,
    totalPending: 0,
    totalPendingPlatform: 0,
    monthlyRevenue: [],
    statusDistribution: [],
    recentTransactions: []
  })
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FilterOptions>({
    period: 'year',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  })
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchFinancialData()
  }, [filters])

  const fetchFinancialData = async () => {
    try {
      setLoading(true)
      
      // Calcular período baseado nos filtros
      const { startDate, endDate } = getDateRange()
      
      // Buscar dados financeiros
      const [revenueData, statusData, transactionsData] = await Promise.all([
        fetchRevenueData(startDate, endDate),
        fetchStatusDistribution(startDate, endDate),
        fetchRecentTransactions()
      ])

      setFinancialData({
        ...revenueData,
        statusDistribution: statusData,
        recentTransactions: transactionsData
      })
    } catch (error) {
      console.error('Erro ao buscar dados financeiros:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDateRange = () => {
    const now = new Date()
    let startDate: Date
    let endDate: Date

    switch (filters.period) {
      case 'month':
        startDate = startOfMonth(new Date(filters.year, (filters.month || 1) - 1))
        endDate = endOfMonth(new Date(filters.year, (filters.month || 1) - 1))
        break
      case 'quarter':
        const quarterStartMonth = Math.floor(((filters.month || 1) - 1) / 3) * 3
        startDate = new Date(filters.year, quarterStartMonth, 1)
        endDate = new Date(filters.year, quarterStartMonth + 3, 0)
        break
      case 'year':
        startDate = startOfYear(new Date(filters.year, 0))
        endDate = endOfYear(new Date(filters.year, 0))
        break
      case 'custom':
        startDate = new Date(filters.startDate || now)
        endDate = new Date(filters.endDate || now)
        break
      default:
        startDate = startOfYear(now)
        endDate = endOfYear(now)
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    }
  }

  const fetchRevenueData = async (startDate: string, endDate: string) => {
    // Buscar receitas totais por status
    const { data: statusTotals } = await supabase
      .from('visits')
      .select('status_pagamento, valor')
      .gte('data', startDate)
      .lte('data', endDate)
      .neq('status', 'cancelada')

    const totalReceived = statusTotals
      ?.filter(v => v.status_pagamento === 'pago')
      .reduce((sum, v) => sum + v.valor, 0) || 0

    const totalPending = statusTotals
      ?.filter(v => v.status_pagamento === 'pendente')
      .reduce((sum, v) => sum + v.valor, 0) || 0

    const totalPendingPlatform = statusTotals
      ?.filter(v => v.status_pagamento === 'pendente_plataforma')
      .reduce((sum, v) => sum + v.valor, 0) || 0

    // Buscar dados mensais para gráficos
    const { data: monthlyData } = await supabase
      .from('visits')
      .select(`
        data,
        valor,
        status_pagamento,
        clients(nome)
      `)
      .gte('data', startDate)
      .lte('data', endDate)
      .neq('status', 'cancelada')
      .order('data')

    // Agrupar por mês
    const monthlyRevenue = groupByMonth(monthlyData || [])

    return {
      totalReceived,
      totalPending,
      totalPendingPlatform,
      monthlyRevenue
    }
  }

  const fetchStatusDistribution = async (startDate: string, endDate: string) => {
    const { data } = await supabase
      .from('visits')
      .select('status_pagamento, valor')
      .gte('data', startDate)
      .lte('data', endDate)
      .neq('status', 'cancelada')

    const statusGroups = data?.reduce((acc, visit) => {
      const status = visit.status_pagamento
      if (!acc[status]) {
        acc[status] = 0
      }
      acc[status] += visit.valor
      return acc
    }, {} as Record<string, number>) || {}

    const colors = {
      pago: '#10B981',
      pendente: '#F59E0B',
      pendente_plataforma: '#EF4444'
    }

    const labels = {
      pago: 'Pago',
      pendente: 'Pendente',
      pendente_plataforma: 'Pendente Plataforma'
    }

    return Object.entries(statusGroups).map(([status, value]) => ({
      name: labels[status as keyof typeof labels] || status,
      value,
      color: colors[status as keyof typeof colors] || '#6B7280'
    }))
  }

  const fetchRecentTransactions = async () => {
    const { data } = await supabase
      .from('visits')
      .select(`
        id,
        data,
        valor,
        status_pagamento,
        clients(nome),
        services(nome_servico)
      `)
      .neq('status', 'cancelada')
      .order('data', { ascending: false })
      .limit(10)

    return data?.map(visit => ({
      id: visit.id,
      client: (visit.clients as any)?.nome || 'Cliente não informado',
      service: (visit.services as any)?.nome_servico || 'Serviço',
      date: visit.data,
      amount: visit.valor,
      status: visit.status_pagamento
    })) || []
  }

  const groupByMonth = (data: any[]): Array<{
    month: string
    revenue: number
    visits: number
  }> => {
    const grouped = data.reduce((acc, visit) => {
      const date = new Date(visit.data)
      const monthKey = format(date, 'yyyy-MM')
      
      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: format(date, 'MMM yyyy', { locale: ptBR }),
          revenue: 0,
          visits: 0
        }
      }
      
      if (visit.status_pagamento === 'pago') {
        acc[monthKey].revenue += visit.valor
      }
      acc[monthKey].visits += 1
      
      return acc
    }, {} as Record<string, any>)

    return Object.values(grouped).sort((a: any, b: any) => 
      new Date(a.month).getTime() - new Date(b.month).getTime()
    ) as Array<{
      month: string
      revenue: number
      visits: number
    }>
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
    return date.toLocaleDateString('pt-BR')
  }

  const getStatusBadge = (status: string) => {
    const configs = {
      pago: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Pago' },
      pendente: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pendente' },
      pendente_plataforma: { color: 'bg-red-100 text-red-800', icon: CreditCard, label: 'Pendente Plataforma' }
    }
    
    const config = configs[status as keyof typeof configs] || configs.pendente
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    )
  }

  const totalRevenue = financialData.totalReceived + financialData.totalPending + financialData.totalPendingPlatform
  const receivedPercentage = totalRevenue > 0 ? (financialData.totalReceived / totalRevenue) * 100 : 0

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <h1 className="page-title-fefelina">Finanças</h1>
          <p className="mt-2 text-sm text-gray-700">
            Análise completa de receitas, pagamentos e performance financeira.
          </p>
          <div className="divider-fefelina"></div>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </button>
          <button className="btn-secondary">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <div className="mt-6 card-fefelina">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Período
              </label>
              <select
                value={filters.period}
                onChange={(e) => setFilters({ ...filters, period: e.target.value as any })}
                className="input-fefelina"
              >
                <option value="month">Mês</option>
                <option value="quarter">Trimestre</option>
                <option value="year">Ano</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ano
              </label>
              <select
                value={filters.year}
                onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
                className="input-fefelina"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            {filters.period === 'month' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mês
                </label>
                <select
                  value={filters.month || 1}
                  onChange={(e) => setFilters({ ...filters, month: parseInt(e.target.value) })}
                  className="input-fefelina"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <option key={month} value={month}>
                      {format(new Date(2024, month - 1), 'MMMM', { locale: ptBR })}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cards de Resumo */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-fefelina">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Recebido</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(financialData.totalReceived)}
              </p>
              <p className="text-sm text-green-600 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                {receivedPercentage.toFixed(1)}% do total
              </p>
            </div>
          </div>
        </div>

        <div className="card-fefelina">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">A Receber</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(financialData.totalPending)}
              </p>
              <p className="text-sm text-yellow-600">
                Pagamento pendente
              </p>
            </div>
          </div>
        </div>

        <div className="card-fefelina">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pendente Plataforma</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(financialData.totalPendingPlatform)}
              </p>
              <p className="text-sm text-red-600">
                Aguardando plataforma
              </p>
            </div>
          </div>
        </div>

        <div className="card-fefelina">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Geral</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(totalRevenue)}
              </p>
              <p className="text-sm text-blue-600">
                Receita total
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico de Receita Mensal */}
        <div className="card-fefelina">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Receita Mensal</h3>
            <Eye className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financialData.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <Tooltip 
                  formatter={(value) => [formatCurrency(Number(value)), 'Receita']}
                  labelStyle={{ color: '#374151' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#059669" 
                  fill="#10b981" 
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Distribuição de Status */}
        <div className="card-fefelina">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Distribuição por Status</h3>
            <Eye className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={financialData.statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {financialData.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [formatCurrency(Number(value)), 'Valor']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex justify-center space-x-4">
            {financialData.statusDistribution.map((item, index) => (
              <div key={index} className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-sm text-gray-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transações Recentes */}
      <div className="mt-8 card-fefelina">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Transações Recentes</h3>
          <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            Ver todas
          </button>
        </div>
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente/Serviço
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {financialData.recentTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {transaction.client}
                      </div>
                      <div className="text-sm text-gray-500">
                        {transaction.service}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(transaction.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(transaction.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(transaction.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
