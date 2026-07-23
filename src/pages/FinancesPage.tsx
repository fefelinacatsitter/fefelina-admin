import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { fetchAllRows } from '../lib/paginatedFetch'
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts'
import { 
  ChevronDown,
  Download, CreditCard, Clock, CheckCircle, X
} from 'lucide-react'
import CatLoader from '../components/CatLoader'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useValuesVisibility } from '../contexts/ValuesVisibilityContext'

interface FinancialData {
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

interface SummaryTotals {
  monthlyAverage: number
  currentMonthTotal: number
  yearTotal: number
  last12MonthsTotal: number
  grandTotal: number
  grandReceived: number
  grandPending: number
}

type SummaryPeriodOption = 'month' | 'year' | 'last12'

interface VisitRevenueRow {
  data: string
  valor: number
  desconto_plataforma: number
  services: any
}

// Retorna o status de pagamento do serviço "pai" de uma visita (usado para
// classificar o valor da visita como recebido ou pendente no gráfico/cards).
// O Supabase pode inferir a relação como objeto único ou como array dependendo
// do contexto, então tratamos os dois formatos.
function getVisitServiceStatus(visit: { services: any }): string | undefined {
  const service = Array.isArray(visit.services) ? visit.services[0] : visit.services
  return service?.status_pagamento
}

// O período selecionado (ao clicar em uma barra do gráfico) pode estar no
// formato "yyyy-MM" (visão mensal) ou apenas "yyyy" (visão anual) — precisamos
// tratar os dois formatos para não quebrar ao alternar entre as visões.
function getPeriodRange(key: string): { start: string; end: string } {
  if (/^\d{4}-\d{2}$/.test(key)) {
    const [year, month] = key.split('-').map(Number)
    const date = new Date(year, month - 1, 1)
    return {
      start: format(startOfMonth(date), 'yyyy-MM-dd'),
      end: format(endOfMonth(date), 'yyyy-MM-dd')
    }
  }
  const year = Number(key)
  return { start: `${year}-01-01`, end: `${year}-12-31` }
}

function getPeriodLabel(key: string): string {
  if (/^\d{4}-\d{2}$/.test(key)) {
    const [year, month] = key.split('-').map(Number)
    return format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: ptBR })
  }
  return `Ano ${key}`
}

const SUMMARY_PERIOD_LABELS: Record<SummaryPeriodOption, string> = {
  month: 'Total do mês',
  year: 'Total do ano',
  last12: 'Total últimos 12 meses'
}

function SUMMARY_PERIOD_VALUES(totals: SummaryTotals): Record<SummaryPeriodOption, number> {
  return {
    month: totals.currentMonthTotal,
    year: totals.yearTotal,
    last12: totals.last12MonthsTotal
  }
}

export default function FinancesPage() {
  const currentDate = new Date()
  const [financialData, setFinancialData] = useState<FinancialData>({
    monthlyRevenue: [],
    recentTransactions: []
  })
  const [loading, setLoading] = useState(true)
  const { showValues, formatCurrency } = useValuesVisibility()
  // Tipo de visualização do gráfico: por mês (últimos 13 meses) ou por ano (últimos 5 anos).
  // Já é aplicado imediatamente ao clicar, sem necessidade de um botão "Aplicar".
  const [viewType, setViewType] = useState<'month' | 'year'>('month')
  // Loading que afeta SOMENTE o gráfico (ao alternar Mês/Ano), sem recarregar a página inteira
  const [chartLoading, setChartLoading] = useState(false)
  const isMountedRef = useRef(false)
  const [selectedService, setSelectedService] = useState<any>(null)
  const [showServiceModal, setShowServiceModal] = useState(false)
  // Mês selecionado para filtrar as transações (ao clicar na barra)
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(
    format(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), 'yyyy-MM')
  )
  // Totais do card "Resumo" (independentes dos filtros do gráfico)
  const [summaryTotals, setSummaryTotals] = useState<SummaryTotals>({
    monthlyAverage: 0,
    currentMonthTotal: 0,
    yearTotal: 0,
    last12MonthsTotal: 0,
    grandTotal: 0,
    grandReceived: 0,
    grandPending: 0
  })
  // Opção de período exibida na seção do meio do card Resumo (mês/ano/últimos 12 meses)
  const [summaryPeriodOption, setSummaryPeriodOption] = useState<SummaryPeriodOption>('month')
  const [showSummaryPeriodMenu, setShowSummaryPeriodMenu] = useState(false)
  const summaryPeriodMenuRef = useRef<HTMLDivElement>(null)

  // Fechar o menu de seleção de período do card Resumo ao clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (summaryPeriodMenuRef.current && !summaryPeriodMenuRef.current.contains(event.target as Node)) {
        setShowSummaryPeriodMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    // Carga inicial da página (executa uma única vez ao montar)
    fetchFinancialData()
  }, [])

  useEffect(() => {
    // Buscar totais do card Resumo (independente dos filtros do gráfico)
    fetchSummaryTotals()
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

  useEffect(() => {
    // Ao alternar entre Mês/Ano, recarregar SOMENTE o gráfico (não a página inteira).
    // Pula a primeira execução (montagem), já coberta pela carga inicial acima.
    if (!isMountedRef.current) {
      isMountedRef.current = true
      return
    }
    reloadChartOnly()
  }, [viewType])

  const reloadChartOnly = async () => {
    try {
      setChartLoading(true)
      const revenueData = await fetchRevenueData()
      setFinancialData(prev => ({ ...prev, monthlyRevenue: revenueData.monthlyRevenue }))
    } catch (error) {
      console.error('Erro ao recarregar o gráfico:', error)
    } finally {
      setChartLoading(false)
    }
  }

  const fetchSummaryTotals = async () => {
    try {
      // Buscar TODAS as visitas de serviço já registradas (sem limite de data) para
      // calcular o total geral histórico. A partir do mesmo conjunto de dados também
      // derivamos a média mensal dos últimos 12 meses, o total do mês atual, o total do
      // ano atual e o total recebido x pendente, evitando buscas separadas.
      const allVisits = await fetchAllRows<VisitRevenueRow>(
        supabase
          .from('visits')
          .select('data, valor, desconto_plataforma, services(status_pagamento)')
          .eq('tipo_encontro', 'visita_servico')
          .neq('status', 'cancelada')
          .not('service_id', 'is', null)
      )

      const netAmount = (v: VisitRevenueRow) => v.valor * (1 - (v.desconto_plataforma || 0) / 100)

      const currentYear = currentDate.getFullYear()
      const currentMonth = currentDate.getMonth() + 1
      const monthStart = format(new Date(currentYear, currentMonth - 1, 1), 'yyyy-MM-dd')
      const monthEnd = format(new Date(currentYear, currentMonth, 0), 'yyyy-MM-dd')
      const yearStart = `${currentYear}-01-01`
      const yearEnd = `${currentYear}-12-31`

      // Últimos 12 meses: do 1º dia de 11 meses atrás até o último dia do mês atual
      const twelveMonthsStart = format(startOfMonth(new Date(currentYear, currentMonth - 12, 1)), 'yyyy-MM-dd')

      const grandTotal = allVisits.reduce((sum, v) => sum + netAmount(v), 0)
      const grandReceived = allVisits
        .filter(v => getVisitServiceStatus(v) === 'pago')
        .reduce((sum, v) => sum + netAmount(v), 0)
      const grandPending = grandTotal - grandReceived

      const currentMonthTotal = allVisits
        .filter(v => v.data >= monthStart && v.data <= monthEnd)
        .reduce((sum, v) => sum + netAmount(v), 0)

      const yearTotal = allVisits
        .filter(v => v.data >= yearStart && v.data <= yearEnd)
        .reduce((sum, v) => sum + netAmount(v), 0)

      const last12MonthsTotal = allVisits
        .filter(v => v.data >= twelveMonthsStart && v.data <= monthEnd)
        .reduce((sum, v) => sum + netAmount(v), 0)

      setSummaryTotals({
        monthlyAverage: last12MonthsTotal / 12,
        currentMonthTotal,
        yearTotal,
        last12MonthsTotal,
        grandTotal,
        grandReceived,
        grandPending
      })
    } catch (error) {
      console.error('Erro ao buscar totais do resumo:', error)
    }
  }

  const fetchFinancialData = async () => {
    try {
      setLoading(true)
      
      // Buscar dados financeiros
      const [revenueData, transactionsData] = await Promise.all([
        fetchRevenueData(),
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

  const fetchRevenueData = async () => {
    // Calcular range de meses para o gráfico baseado no viewType, sempre centrado no mês/ano atual
    let chartStartDate: string
    let chartEndDate: string
    const currentYear = currentDate.getFullYear()
    const currentMonthNumber = currentDate.getMonth() + 1
    
    if (viewType === 'month') {
      // 12 meses para trás + mês atual + 1 mês à frente = 13 meses (comparação ano anterior)
      const currentMonth = new Date(currentYear, currentMonthNumber - 1, 1)
      const twelveMonthsBack = new Date(currentMonth)
      twelveMonthsBack.setMonth(currentMonth.getMonth() - 12)
      const oneMonthForward = new Date(currentMonth)
      oneMonthForward.setMonth(currentMonth.getMonth() + 1)
      
      chartStartDate = format(twelveMonthsBack, 'yyyy-MM-dd')
      chartEndDate = format(new Date(oneMonthForward.getFullYear(), oneMonthForward.getMonth() + 1, 0), 'yyyy-MM-dd')
    } else {
      // Para visualização anual, pegar os últimos anos
      chartStartDate = `${currentYear - 2}-01-01`
      chartEndDate = `${currentYear + 2}-12-31`
    }

    // Buscar visitas de serviço (ignorando pré-encontros/tasks e visitas canceladas) no
    // período, contabilizando a receita pela DATA DA VISITA — e não pela data de início
    // do serviço. Assim, um serviço que começa em um mês e termina em outro tem seu valor
    // corretamente dividido entre os meses conforme as datas reais de cada visita.
    const visits = await fetchAllRows<VisitRevenueRow>(
      supabase
        .from('visits')
        .select('data, valor, desconto_plataforma, services(status_pagamento)')
        .eq('tipo_encontro', 'visita_servico')
        .neq('status', 'cancelada')
        .not('service_id', 'is', null)
        .gte('data', chartStartDate)
        .lte('data', chartEndDate)
        .order('data')
    )

    // Agrupar por mês ou ano para o gráfico
    const monthlyRevenue = viewType === 'month' 
      ? groupVisitsByMonth(visits)
      : groupVisitsByYear(visits)

    return { monthlyRevenue }
  }

  const fetchRecentTransactions = async () => {
    // Filtrar pelo período selecionado: "yyyy-MM" quando uma barra do gráfico mensal foi
    // clicada (ou mês atual por padrão), ou "yyyy" quando uma barra do gráfico anual foi
    // clicada. Cada linha da tabela representa uma VISITA (não o serviço inteiro), para
    // ficar consistente com o gráfico calculado pela data da visita.
    const { start, end } = getPeriodRange(selectedMonthKey)

    const { data } = await supabase
      .from('visits')
      .select(`
        id,
        data,
        valor,
        desconto_plataforma,
        services(*, clients(*))
      `)
      .eq('tipo_encontro', 'visita_servico')
      .neq('status', 'cancelada')
      .not('service_id', 'is', null)
      .gte('data', start)
      .lte('data', end)
      .order('data', { ascending: false })
      .limit(100)

    return data?.map(visit => {
      const service = (Array.isArray(visit.services) ? visit.services[0] : visit.services) as any
      return {
        id: visit.id,
        client: service?.clients?.nome || 'Cliente não informado',
        service: service?.nome_servico || 'Serviço',
        date: visit.data,
        amount: visit.valor * (1 - (visit.desconto_plataforma || 0) / 100),
        status: service?.status_pagamento,
        serviceDetails: service
      }
    }) || []
  }

  const groupVisitsByMonth = (data: VisitRevenueRow[]): Array<{
    month: string
    monthKey: string
    received: number
    pending: number
    total: number
    visits: number
  }> => {
    // Criar array de 13 meses (12 meses para trás do mês atual + mês atual + 1 mês à frente)
    // Exemplo: se estamos em fev/2026, mostra de fev/2025 até mar/2026
    const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const months: Array<{
      month: string
      monthKey: string
      received: number
      pending: number
      total: number
      visits: number
    }> = []
    
    // Gerar os 13 meses (12 para trás + atual + 1 à frente)
    for (let i = -12; i <= 1; i++) {
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
    
    // Preencher com os dados das visitas, cada uma contabilizada no mês da SUA PRÓPRIA data
    data.forEach(visit => {
      const [year, month, day] = visit.data.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      const monthKey = format(date, 'yyyy-MM')
      
      // Encontrar o mês correspondente no array
      const monthData = months.find(m => m.monthKey === monthKey)
      
      if (monthData) {
        const amount = visit.valor * (1 - (visit.desconto_plataforma || 0) / 100)
        
        if (getVisitServiceStatus(visit) === 'pago') {
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

  const groupVisitsByYear = (data: VisitRevenueRow[]): Array<{
    month: string
    monthKey: string
    received: number
    pending: number
    total: number
    visits: number
  }> => {
    const grouped = data.reduce((acc, visit) => {
      const [year] = visit.data.split('-').map(Number)
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
      
      const amount = visit.valor * (1 - (visit.desconto_plataforma || 0) / 100)
      
      if (getVisitServiceStatus(visit) === 'pago') {
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
          <button className="btn-fefelina-secondary">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>
        </div>
      </div>

      {/* Gráficos */}
      <div className="mt-8 flex flex-col lg:flex-row gap-6 items-stretch">
        {/* Card Resumo - 30% da largura, mesma altura do card de gráfico */}
        <div className="card-fefelina lg:w-[30%] flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900">Resumo</h3>
          <div className="border-t border-gray-100 mt-4"></div>

          <div className="flex-1 flex flex-col justify-between">
            <div className="pt-4">
              <p className="text-sm text-gray-600">Média Mensal (últ. 12 meses)</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {formatCurrency(summaryTotals.monthlyAverage)}
              </p>
            </div>
            <div className="border-t border-gray-100 mt-4"></div>

            <div className="pt-4 relative" ref={summaryPeriodMenuRef}>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">{SUMMARY_PERIOD_LABELS[summaryPeriodOption]}</p>
                <button
                  onClick={() => setShowSummaryPeriodMenu(prev => !prev)}
                  className="text-gray-400 hover:text-gray-600 p-0.5 rounded"
                  title="Alterar período"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {formatCurrency(SUMMARY_PERIOD_VALUES(summaryTotals)[summaryPeriodOption])}
              </p>

              {showSummaryPeriodMenu && (
                <div className="absolute right-0 top-full mt-1 z-20 w-44 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 py-1">
                  {(Object.keys(SUMMARY_PERIOD_LABELS) as SummaryPeriodOption[]).map(option => (
                    <button
                      key={option}
                      onClick={() => {
                        setSummaryPeriodOption(option)
                        setShowSummaryPeriodMenu(false)
                      }}
                      className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ${
                        option === summaryPeriodOption ? 'text-primary-600 font-medium' : 'text-gray-700'
                      }`}
                    >
                      {SUMMARY_PERIOD_LABELS[option]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-gray-100 mt-4"></div>

            <div className="pt-4">
              <p className="text-sm text-gray-600">Total geral</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {formatCurrency(summaryTotals.grandTotal)}
              </p>
            </div>
            <div className="border-t border-gray-100 mt-4"></div>

            <div className="pt-4 flex items-center gap-3">
              <div style={{ width: 110, height: 110 }} className="flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Recebido', value: summaryTotals.grandReceived },
                        { name: 'Pendente', value: summaryTotals.grandPending }
                      ]}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={30}
                      outerRadius={50}
                      paddingAngle={2}
                      stroke="none"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#F59E0B" />
                    </Pie>
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), '']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span>
                  <span className="text-xs text-gray-600">Recebido: {formatCurrency(summaryTotals.grandReceived)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0"></span>
                  <span className="text-xs text-gray-600">Pendente: {formatCurrency(summaryTotals.grandPending)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico de Receita - 70% da largura */}
        <div className="card-fefelina lg:w-[70%]">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <h3 className="text-lg font-semibold text-gray-900">Receita</h3>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Visualizar por:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewType('month')}
                  className={`px-3 py-1 text-sm rounded ${
                    viewType === 'month'
                      ? 'bg-white text-primary-600 shadow-sm font-medium'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Mês
                </button>
                <button
                  onClick={() => setViewType('year')}
                  className={`px-3 py-1 text-sm rounded ${
                    viewType === 'year'
                      ? 'bg-white text-primary-600 shadow-sm font-medium'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Ano
                </button>
              </div>
            </div>
          </div>
          
          <div className={`h-96 transition-opacity duration-200 ${chartLoading ? 'opacity-40' : 'opacity-100'}`}>
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
          </div>
        </div>
      </div>

      {/* Transações do Período */}
      <div className="mt-8 card-fefelina">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Transações de {getPeriodLabel(selectedMonthKey)}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                  Cliente/Serviço
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-3 bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Detalhes do Serviço</h3>
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
                className="btn-fefelina-secondary"
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
