import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts'
import { 
  TrendingUp, Filter,
  Download, CreditCard, Clock, CheckCircle, X, Eye, EyeOff
} from 'lucide-react'
import CatLoader from '../components/CatLoader'
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface FinancialData {
  totalReceived: number
  totalPending: number
  totalPendingPlatform: number
  monthlyRevenue: Array<{
    month: string
    monthKey: string
    received: number
    pending: number
    total: number
    visits: number
  }>
  recentTransactions: Array<{
    id: string
    client: string
    service: string
    date: string
    amount: number
    status: string
    serviceDetails?: any
  }>
}

interface CardTotals {
  currentMonthReceived: number
  currentMonthPending: number
  yearReceived: number
  yearTotal: number
}

interface ChartFilters {
  selectedMonth: number
  selectedYear: number
  viewType: 'month' | 'year'
}

export default function FinancesPage() {
  const currentDate = new Date()
  const [financialData, setFinancialData] = useState<FinancialData>({
    totalReceived: 0,
    totalPending: 0,
    totalPendingPlatform: 0,
    monthlyRevenue: [],
    recentTransactions: []
  })
  const [loading, setLoading] = useState(true)
  const [showValues, setShowValues] = useState(() => {
    // Carregar preferência salva do localStorage (padrão: true se não houver)
    const saved = localStorage.getItem('fefelina_showFinanceValues')
    return saved !== null ? saved === 'true' : true
  })
  const [chartFilters, setChartFilters] = useState<ChartFilters>({
    selectedMonth: currentDate.getMonth() + 1,
    selectedYear: currentDate.getFullYear(),
    viewType: 'month'
  })
  // Filtros temporários que só são aplicados ao clicar no botão
  const [tempChartFilters, setTempChartFilters] = useState<ChartFilters>({
    selectedMonth: currentDate.getMonth() + 1,
    selectedYear: currentDate.getFullYear(),
    viewType: 'month'
  })
  const [selectedService, setSelectedService] = useState<any>(null)
  const [showServiceModal, setShowServiceModal] = useState(false)
  // Mês selecionado para filtrar as transações (ao clicar na barra)
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(
    format(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), 'yyyy-MM')
  )
  // Totais dos cards (independentes dos filtros do gráfico)
  const [cardTotals, setCardTotals] = useState<CardTotals>({
    currentMonthReceived: 0,
    currentMonthPending: 0,
    yearReceived: 0,
    yearTotal: 0
  })

  // Salvar preferência de visualização no localStorage
  useEffect(() => {
    localStorage.setItem('fefelina_showFinanceValues', showValues.toString())
  }, [showValues])

  useEffect(() => {
    fetchFinancialData()
  }, [chartFilters])

  useEffect(() => {
    // Buscar totais dos cards (independente dos filtros do gráfico)
    fetchCardTotals()
  }, [])

  useEffect(() => {
    // Recarregar transações quando o mês selecionado mudar
    const loadTransactions = async () => {
      const transactions = await fetchRecentTransactions()
      setFinancialData(prev => ({
        ...prev,
        recentTransactions: transactions
      }))
    }
    loadTransactions()
  }, [selectedMonthKey])

  // Atualizar viewType automaticamente sem precisar clicar em Aplicar
  useEffect(() => {
    if (tempChartFilters.viewType !== chartFilters.viewType) {
      setChartFilters(prev => ({ ...prev, viewType: tempChartFilters.viewType }))
    }
  }, [tempChartFilters.viewType])

  const applyChartFilters = () => {
    setChartFilters({ ...tempChartFilters })
    // Também atualizar o mês selecionado para mostrar as transações do mês filtrado
    const newSelectedKey = format(
      new Date(tempChartFilters.selectedYear, tempChartFilters.selectedMonth - 1, 1), 
      'yyyy-MM'
    )
    setSelectedMonthKey(newSelectedKey)
  }

  const fetchCardTotals = async () => {
    try {
      // Buscar todos os serviços do ano atual, independente dos filtros do gráfico
      const currentYear = currentDate.getFullYear()
      const currentMonth = currentDate.getMonth() + 1
      
      // Buscar serviços do ano atual
      const { data: yearServices } = await supabase
        .from('services')
        .select('status_pagamento, total_a_receber, data_inicio')
        .gte('data_inicio', `${currentYear}-01-01`)
        .lte('data_inicio', `${currentYear}-12-31`)

      // Buscar serviços do mês atual
      const monthStart = format(new Date(currentYear, currentMonth - 1, 1), 'yyyy-MM-dd')
      const monthEnd = format(new Date(currentYear, currentMonth, 0), 'yyyy-MM-dd')
      
      const { data: monthServices } = await supabase
        .from('services')
        .select('status_pagamento, total_a_receber, data_inicio')
        .gte('data_inicio', monthStart)
        .lte('data_inicio', monthEnd)

      // Calcular totais do mês atual
      const currentMonthReceived = (monthServices || [])
        .filter(s => s.status_pagamento === 'pago')
        .reduce((sum, s) => sum + s.total_a_receber, 0)

      const currentMonthPending = (monthServices || [])
        .filter(s => s.status_pagamento !== 'pago')
        .reduce((sum, s) => sum + s.total_a_receber, 0)

      // Calcular totais do ano atual
      const yearReceived = (yearServices || [])
        .filter(s => s.status_pagamento === 'pago')
        .reduce((sum, s) => sum + s.total_a_receber, 0)

      const yearTotal = (yearServices || [])
        .reduce((sum, s) => sum + s.total_a_receber, 0)

      setCardTotals({
        currentMonthReceived,
        currentMonthPending,
        yearReceived,
        yearTotal
      })
    } catch (error) {
      console.error('Erro ao buscar totais dos cards:', error)
    }
  }

  const fetchFinancialData = async () => {
    try {
      setLoading(true)
      
      // Calcular período baseado nos filtros
      const { startDate, endDate } = getDateRange()
      
      // Buscar dados financeiros
      const [revenueData, transactionsData] = await Promise.all([
        fetchRevenueData(startDate, endDate),
        fetchRecentTransactions()
      ])

      setFinancialData({
        ...revenueData,
        recentTransactions: transactionsData
      })
    } catch (error) {
      console.error('Erro ao buscar dados financeiros:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDateRange = () => {
    // Para os cards de resumo, usar o ano inteiro do ano selecionado no gráfico
    const startDate = startOfYear(new Date(chartFilters.selectedYear, 0))
    const endDate = endOfYear(new Date(chartFilters.selectedYear, 0))

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    }
  }

  const fetchRevenueData = async (startDate: string, endDate: string) => {
    // Calcular range de meses para o gráfico baseado no viewType
    let chartStartDate: string
    let chartEndDate: string
    
    if (chartFilters.viewType === 'month') {
      // 9 meses para trás + mês atual + 2 meses à frente = 12 meses
      const currentMonth = new Date(chartFilters.selectedYear, chartFilters.selectedMonth - 1, 1)
      const nineMonthsBack = new Date(currentMonth)
      nineMonthsBack.setMonth(currentMonth.getMonth() - 9)
      const twoMonthsForward = new Date(currentMonth)
      twoMonthsForward.setMonth(currentMonth.getMonth() + 2)
      
      chartStartDate = format(nineMonthsBack, 'yyyy-MM-dd')
      chartEndDate = format(new Date(twoMonthsForward.getFullYear(), twoMonthsForward.getMonth() + 1, 0), 'yyyy-MM-dd')
    } else {
      // Para visualização anual, pegar os últimos anos
      chartStartDate = `${chartFilters.selectedYear - 2}-01-01`
      chartEndDate = `${chartFilters.selectedYear + 2}-12-31`
    }

    // Buscar dados de receita através dos serviços
    const { data: services } = await supabase
      .from('services')
      .select(`
        status_pagamento,
        total_a_receber,
        data_inicio,
        data_fim,
        clients(nome)
      `)
      .gte('data_inicio', chartStartDate)
      .lte('data_inicio', chartEndDate)
      .order('data_inicio')

    const servicesData = services || []

    // Calcular totais por status de pagamento (usando o período dos filtros gerais)
    const servicesInPeriod = servicesData.filter(s => 
      s.data_inicio >= startDate && s.data_inicio <= endDate
    )

    const totalReceived = servicesInPeriod
      .filter(s => s.status_pagamento === 'pago')
      .reduce((sum, s) => sum + s.total_a_receber, 0)

    const totalPartiallyPaid = servicesInPeriod
      .filter(s => s.status_pagamento === 'pago_parcialmente')
      .reduce((sum, s) => sum + s.total_a_receber, 0)

    const totalPending = servicesInPeriod
      .filter(s => s.status_pagamento === 'pendente')
      .reduce((sum, s) => sum + s.total_a_receber, 0)

    const totalPendingPlatform = servicesInPeriod
      .filter(s => s.status_pagamento === 'pendente_plataforma')
      .reduce((sum, s) => sum + s.total_a_receber, 0)

    // Agrupar por mês ou ano para o gráfico
    const monthlyRevenue = chartFilters.viewType === 'month' 
      ? groupServicesByMonth(servicesData)
      : groupServicesByYear(servicesData)

    return {
      totalReceived,
      totalPending: totalPending + totalPartiallyPaid,
      totalPendingPlatform,
      monthlyRevenue
    }
  }

  const fetchRecentTransactions = async () => {
    // Filtrar pelo mês selecionado (ao clicar na barra ou mês atual por padrão)
    const [year, month] = selectedMonthKey.split('-').map(Number)
    const selectedDate = new Date(year, month - 1, 1)
    const startDate = format(startOfMonth(selectedDate), 'yyyy-MM-dd')
    const endDate = format(endOfMonth(selectedDate), 'yyyy-MM-dd')

    const { data } = await supabase
      .from('services')
      .select(`
        *,
        clients(*)
      `)
      .gte('data_inicio', startDate)
      .lte('data_inicio', endDate)
      .order('created_at', { ascending: false })
      .limit(50)

    return data?.map(service => ({
      id: service.id,
      client: (service.clients as any)?.nome || 'Cliente não informado',
      service: service.nome_servico || 'Serviço',
      date: service.data_inicio,
      amount: service.total_a_receber,
      status: service.status_pagamento,
      serviceDetails: service
    })) || []
  }

  const groupServicesByMonth = (data: any[]): Array<{
    month: string
    monthKey: string
    received: number
    pending: number
    total: number
    visits: number
  }> => {
    // Criar array de 12 meses (9 para trás + atual + 2 à frente)
    const currentMonth = new Date(chartFilters.selectedYear, chartFilters.selectedMonth - 1, 1)
    const months: Array<{
      month: string
      monthKey: string
      received: number
      pending: number
      total: number
      visits: number
    }> = []
    
    // Gerar os 12 meses
    for (let i = -9; i <= 2; i++) {
      const date = new Date(currentMonth)
      date.setMonth(currentMonth.getMonth() + i)
      
      const monthKey = format(date, 'yyyy-MM')
      const monthLabel = format(date, 'MMM yyyy', { locale: ptBR })
      
      months.push({
        month: monthLabel,
        monthKey: monthKey,
        received: 0,
        pending: 0,
        total: 0,
        visits: 0
      })
    }
    
    // Preencher com os dados dos serviços
    data.forEach(service => {
      const [year, month, day] = service.data_inicio.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      const monthKey = format(date, 'yyyy-MM')
      
      // Encontrar o mês correspondente no array
      const monthData = months.find(m => m.monthKey === monthKey)
      
      if (monthData) {
        const amount = service.total_a_receber
        
        if (service.status_pagamento === 'pago') {
          monthData.received += amount
        } else {
          monthData.pending += amount
        }
        
        monthData.total += amount
        monthData.visits += 1
      }
    })

    return months
  }

  const groupServicesByYear = (data: any[]): Array<{
    month: string
    monthKey: string
    received: number
    pending: number
    total: number
    visits: number
  }> => {
    const grouped = data.reduce((acc, service) => {
      const [year] = service.data_inicio.split('-').map(Number)
      const yearKey = year.toString()
      
      if (!acc[yearKey]) {
        acc[yearKey] = {
          month: yearKey,
          monthKey: yearKey,
          received: 0,
          pending: 0,
          total: 0,
          visits: 0
        }
      }
      
      const amount = service.total_a_receber
      
      if (service.status_pagamento === 'pago') {
        acc[yearKey].received += amount
      } else {
        acc[yearKey].pending += amount
      }
      
      acc[yearKey].total += amount
      acc[yearKey].visits += 1
      
      return acc
    }, {} as Record<string, { month: string, monthKey: string, received: number, pending: number, total: number, visits: number }>)

    const sortedKeys = Object.keys(grouped).sort()
    return sortedKeys.map(key => grouped[key])
  }

  const formatCurrency = (value: number) => {
    if (!showValues) {
      return 'R$ ••••••'
    }
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

  // Função para determinar se um mês é o mês selecionado (clicado na barra ou aplicado nos filtros)
  const isSelectedMonth = (monthKey: string) => {
    return monthKey === selectedMonthKey
  }

  // Componente customizado para as barras com fundo azul para o mês selecionado
  const CustomBarShape = (props: any) => {
    const { fill, x, y, width, height, payload } = props
    const isSelected = isSelectedMonth(payload.monthKey)
    
    return (
      <g 
        onClick={() => setSelectedMonthKey(payload.monthKey)}
        style={{ cursor: 'pointer' }}
      >
        {isSelected && (
          <rect
            x={x - 2}
            y={0}
            width={width + 4}
            height="100%"
            fill="rgba(59, 130, 246, 0.08)"
            rx={4}
          />
        )}
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={fill}
        />
      </g>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <CatLoader size="lg" variant="paws" text="Carregando finanças..." />
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
            onClick={() => setShowValues(!showValues)}
            className="btn-secondary"
            title={showValues ? 'Ocultar valores' : 'Mostrar valores'}
          >
            {showValues ? (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                Ocultar Valores
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Mostrar Valores
              </>
            )}
          </button>
          <button className="btn-secondary">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>
        </div>
      </div>

      {/* Cards de Resumo - Sempre baseados no MÊS e ANO ATUAL (não variam com os filtros do gráfico) */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-fefelina">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Recebido no Mês Atual</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(cardTotals.currentMonthReceived)}
              </p>
              <p className="text-sm text-green-600">
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
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
              <p className="text-sm font-medium text-gray-500">Pendente no Mês Atual</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(cardTotals.currentMonthPending)}
              </p>
              <p className="text-sm text-yellow-600">
                A receber este mês
              </p>
            </div>
          </div>
        </div>

        <div className="card-fefelina">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Recebido no Ano</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(cardTotals.yearReceived)}
              </p>
              <p className="text-sm text-blue-600">
                Ano {currentDate.getFullYear()}
              </p>
            </div>
          </div>
        </div>

        <div className="card-fefelina">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Previsto no Ano</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(cardTotals.yearTotal)}
              </p>
              <p className="text-sm text-purple-600">
                Recebido + Pendente
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="mt-8">
        {/* Gráfico de Receita Mensal - Largura Total */}
        <div className="card-fefelina">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-gray-900">Receita Mensal</h3>
              
              {/* Filtros de Mês e Ano */}
              <div className="flex items-center space-x-2">
                <select
                  value={tempChartFilters.selectedMonth}
                  onChange={(e) => setTempChartFilters({ ...tempChartFilters, selectedMonth: parseInt(e.target.value) })}
                  className="input-fefelina py-1 text-sm w-32"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <option key={month} value={month}>
                      {format(new Date(2024, month - 1), 'MMMM', { locale: ptBR })}
                    </option>
                  ))}
                </select>
                
                <select
                  value={tempChartFilters.selectedYear}
                  onChange={(e) => setTempChartFilters({ ...tempChartFilters, selectedYear: parseInt(e.target.value) })}
                  className="input-fefelina py-1 text-sm w-24"
                >
                  {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Visualizar por */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Visualizar por:</span>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setTempChartFilters({ ...tempChartFilters, viewType: 'month' })}
                    className={`px-3 py-1 text-sm rounded ${
                      tempChartFilters.viewType === 'month'
                        ? 'bg-white text-primary-600 shadow-sm font-medium'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Mês
                  </button>
                  <button
                    onClick={() => setTempChartFilters({ ...tempChartFilters, viewType: 'year' })}
                    className={`px-3 py-1 text-sm rounded ${
                      tempChartFilters.viewType === 'year'
                        ? 'bg-white text-primary-600 shadow-sm font-medium'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Ano
                  </button>
                </div>
              </div>

              <button
                onClick={applyChartFilters}
                className="btn-secondary text-sm py-1"
              >
                <Filter className="w-4 h-4 mr-2" />
                Aplicar Filtro
              </button>
            </div>
          </div>
          
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={financialData.monthlyRevenue}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                  tickFormatter={(value) => showValues ? `R$ ${value.toLocaleString('pt-BR')}` : '••••'}
                />
                <Tooltip 
                  formatter={(value) => [formatCurrency(Number(value)), '']}
                  labelStyle={{ color: '#374151' }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                />
                <Bar 
                  dataKey="received" 
                  name="Recebido"
                  stackId="a"
                  radius={[0, 0, 0, 0]}
                  fill="#10b981"
                  shape={<CustomBarShape />}
                />
                <Bar 
                  dataKey="pending" 
                  name="Pendente"
                  stackId="a"
                  radius={[4, 4, 0, 0]}
                  fill="#F59E0B"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legenda */}
          <div className="mt-4 flex justify-center space-x-6">
            <div className="flex items-center">
              <div className="w-4 h-4 rounded bg-green-500 mr-2"></div>
              <span className="text-sm text-gray-600">Recebido</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded bg-yellow-500 mr-2"></div>
              <span className="text-sm text-gray-600">Pendente</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded border-2 border-blue-500 bg-blue-50 mr-2"></div>
              <span className="text-sm text-gray-600">Mês Selecionado</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transações do Período */}
      <div className="mt-8 card-fefelina">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Transações de {(() => {
                const [year, month] = selectedMonthKey.split('-').map(Number)
                return format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: ptBR })
              })()}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Clique em uma transação para ver os detalhes ou clique em uma barra do gráfico para filtrar
            </p>
          </div>
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
                <tr 
                  key={transaction.id} 
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => {
                    setSelectedService(transaction.serviceDetails)
                    setShowServiceModal(true)
                  }}
                >
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
          
          {financialData.recentTransactions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Nenhuma transação encontrada para este período</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalhes do Serviço */}
      {showServiceModal && selectedService && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Detalhes do Serviço</h3>
              <button
                onClick={() => {
                  setShowServiceModal(false)
                  setSelectedService(null)
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Cliente</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedService.clients?.nome || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Serviço</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedService.nome_servico || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Data Início</label>
                  <p className="text-sm text-gray-900 mt-1">{formatDate(selectedService.data_inicio)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Data Fim</label>
                  <p className="text-sm text-gray-900 mt-1">{formatDate(selectedService.data_fim)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Total a Receber</label>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{formatCurrency(selectedService.total_a_receber)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status Pagamento</label>
                  <div className="mt-1">{getStatusBadge(selectedService.status_pagamento)}</div>
                </div>
                {selectedService.plataforma && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Plataforma</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedService.plataforma}</p>
                  </div>
                )}
                {selectedService.frequencia_visitas && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Frequência de Visitas</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedService.frequencia_visitas}</p>
                  </div>
                )}
              </div>
              
              {selectedService.observacoes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Observações</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedService.observacoes}</p>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setShowServiceModal(false)
                  setSelectedService(null)
                }}
                className="btn-secondary"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
