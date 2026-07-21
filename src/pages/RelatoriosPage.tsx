import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { fetchAllRows } from '../lib/paginatedFetch'
import CatLoader from '../components/CatLoader'
import { format, parseISO } from 'date-fns'

interface RelatorioStats {
  totalClientesAtivos: number
  totalVisitasMes: number
  receitaMes: number
  visitasRealizadas: number
  visitasAgendadas: number
  servicosPendentes: number
  clientesNovos: number
  taxaRetencao: number
  ticketMedio: number
  totalPets: number
}

interface ClienteRanking {
  nome: string
  totalVisitas: number
  valorTotal: number
  ultimaVisita: string
}

interface VisitasPorMes {
  mes: string
  quantidade: number
  receita: number
}

interface DiaSemanaStats {
  dia: string
  quantidade: number
}

interface HorarioPicoStats {
  horario: string
  quantidade: number
}

export default function RelatoriosPage() {
  const [stats, setStats] = useState<RelatorioStats>({
    totalClientesAtivos: 0,
    totalVisitasMes: 0,
    receitaMes: 0,
    visitasRealizadas: 0,
    visitasAgendadas: 0,
    servicosPendentes: 0,
    clientesNovos: 0,
    taxaRetencao: 0,
    ticketMedio: 0,
    totalPets: 0
  })

  const [clientesRanking, setClientesRanking] = useState<ClienteRanking[]>([])
  const [visitasPorMes, setVisitasPorMes] = useState<VisitasPorMes[]>([])
  const [tiposVisita, setTiposVisita] = useState({ inteira: 0, meia: 0 })
  const [diasSemana, setDiasSemana] = useState<DiaSemanaStats[]>([])
  const [horariosPico, setHorariosPico] = useState<HorarioPicoStats[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('mes_atual')
  const [showTopClients, setShowTopClients] = useState(10)

  useEffect(() => {
    fetchRelatorios()
  }, [selectedPeriod])

  const fetchRelatorios = async () => {
    try {
      setLoading(true)
      
      const hoje = new Date()
      const anoAtual = hoje.getFullYear()
      const mesAtual = hoje.getMonth() + 1

      // Calcular período baseado no filtro selecionado
      let inicioMes = ''
      let finalMes = ''
      let dataInicio = ''
      let dataFim = ''

      if (selectedPeriod === 'mes_atual') {
        inicioMes = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`
        finalMes = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-${new Date(anoAtual, mesAtual, 0).getDate()}`
        dataInicio = inicioMes
        dataFim = finalMes
      } else if (selectedPeriod === 'mes_anterior') {
        const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1
        const anoMesAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual
        inicioMes = `${anoMesAnterior}-${String(mesAnterior).padStart(2, '0')}-01`
        finalMes = `${anoMesAnterior}-${String(mesAnterior).padStart(2, '0')}-${new Date(anoMesAnterior, mesAnterior, 0).getDate()}`
        dataInicio = inicioMes
        dataFim = finalMes
      } else if (selectedPeriod === '3meses') {
        const data = new Date()
        data.setMonth(data.getMonth() - 3)
        dataInicio = data.toISOString().split('T')[0]
        dataFim = hoje.toISOString().split('T')[0]
        inicioMes = dataInicio
        finalMes = dataFim
      } else if (selectedPeriod === '6meses') {
        const data = new Date()
        data.setMonth(data.getMonth() - 6)
        dataInicio = data.toISOString().split('T')[0]
        dataFim = hoje.toISOString().split('T')[0]
        inicioMes = dataInicio
        finalMes = dataFim
      } else if (selectedPeriod === 'ano') {
        // "Este Ano" deve cobrir o ano inteiro (inclusive meses futuros com
        // visitas já agendadas), não parar na data de hoje
        dataInicio = `${anoAtual}-01-01`
        dataFim = `${anoAtual}-12-31`
        inicioMes = dataInicio
        finalMes = dataFim
      } else {
        // selectedPeriod === 'tudo'
        // "Todo Período" deve incluir também visitas/serviços futuros já
        // agendados - não limitar a data final em "hoje"
        dataInicio = '2000-01-01'
        dataFim = '2100-12-31'
        inicioMes = dataInicio
        finalMes = dataFim
      }

      // Buscar estatísticas básicas (aplicando filtro de período pela data_inicio do serviço)
      const [clientesResult, visitasPeriodoData, servicosResult, petsResult] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact' }),
        fetchAllRows(
          supabase
            .from('visits')
            .select(`
            valor,
            status,
            tipo_visita,
            desconto_plataforma,
            data,
            horario,
            client_id,
            service_id,
            services!inner(data_inicio)
          `)
            .gte('services.data_inicio', inicioMes)
            .lte('services.data_inicio', finalMes)
        ),
        supabase
          .from('services')
          .select('*', { count: 'exact' })
          .neq('status_pagamento', 'pago'),
        supabase.from('pets').select('*', { count: 'exact' })
      ])

      // Clientes novos no período
      const { count: clientesNovosCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', inicioMes)
        .lte('created_at', finalMes)

      // Buscar ranking de clientes com última visita (filtrando pela data_inicio do serviço)
      const clientesRankingData = await fetchAllRows(
        supabase
          .from('visits')
          .select(`
          client_id,
          clients!inner(nome),
          valor,
          desconto_plataforma,
          status,
          data,
          service_id,
          services!inner(data_inicio)
        `)
          .eq('status', 'realizada')
          .gte('services.data_inicio', dataInicio)
          .lte('services.data_inicio', dataFim)
          .not('client_id', 'is', null)
      )

      // Processar ranking de clientes - somar TODAS as visitas dos serviços que começaram no período
      const clientesMap = new Map<string, { totalVisitas: number; valorTotal: number; ultimaVisita: string; nome: string }>()
      
      if (clientesRankingData) {
        clientesRankingData.forEach((visit: any) => {
          const nomeCliente = visit.clients?.nome || 'Cliente desconhecido'
          const valorLiquido = visit.valor * (1 - (visit.desconto_plataforma || 0) / 100)
          const clientId = visit.client_id
          
          if (clientesMap.has(clientId)) {
            const existing = clientesMap.get(clientId)!
            existing.totalVisitas += 1
            existing.valorTotal += valorLiquido
            if (visit.data > existing.ultimaVisita) {
              existing.ultimaVisita = visit.data
            }
          } else {
            clientesMap.set(clientId, {
              totalVisitas: 1,
              valorTotal: valorLiquido,
              ultimaVisita: visit.data,
              nome: nomeCliente
            })
          }
        })
      }

      const ranking = Array.from(clientesMap.values())
        .map((data) => ({
          nome: data.nome,
          totalVisitas: data.totalVisitas,
          valorTotal: data.valorTotal,
          ultimaVisita: data.ultimaVisita
        }))
        .sort((a, b) => b.valorTotal - a.valorTotal)

      // Taxa de retenção (clientes que tiveram visitas nos últimos 30 dias vs últimos 90 dias)
      const hoje30dias = new Date()
      hoje30dias.setDate(hoje30dias.getDate() - 30)
      const hoje90dias = new Date()
      hoje90dias.setDate(hoje90dias.getDate() - 90)

      const clientesUltimos30 = await fetchAllRows(
        supabase
          .from('visits')
          .select('client_id')
          .eq('status', 'realizada')
          .gte('data', hoje30dias.toISOString().split('T')[0])
          .not('client_id', 'is', null)
      )

      const clientesUltimos90 = await fetchAllRows(
        supabase
          .from('visits')
          .select('client_id')
          .eq('status', 'realizada')
          .gte('data', hoje90dias.toISOString().split('T')[0])
          .not('client_id', 'is', null)
      )

      const clientesUnicos30 = new Set(clientesUltimos30?.map(v => v.client_id) || [])
      const clientesUnicos90 = new Set(clientesUltimos90?.map(v => v.client_id) || [])
      const taxaRetencao = clientesUnicos90.size > 0 
        ? (clientesUnicos30.size / clientesUnicos90.size) * 100 
        : 0

      // Buscar visitas por mês dos últimos 12 meses (por data_inicio do serviço)
      const visitasPorMesData = await fetchAllRows(
        supabase
          .from('visits')
          .select(`
          data,
          valor,
          desconto_plataforma,
          status,
          service_id,
          services!inner(data_inicio)
        `)
          .eq('status', 'realizada')
          .gte('services.data_inicio', `${anoAtual - 1}-${String(mesAtual).padStart(2, '0')}-01`)
      )

      // Processar visitas por mês (usando data_inicio do serviço) - somar TODAS as visitas
      const mesesMap = new Map<string, { quantidade: number; receita: number }>()
      
      if (visitasPorMesData) {
        visitasPorMesData.forEach((visit: any) => {
          const dataInicio = visit.services?.data_inicio
          if (dataInicio) {
            const [year, month] = dataInicio.split('-')
            const chave = `${year}-${month}`
            const valorLiquido = visit.valor * (1 - (visit.desconto_plataforma || 0) / 100)
            
            if (mesesMap.has(chave)) {
              const existing = mesesMap.get(chave)!
              existing.quantidade += 1
              existing.receita += valorLiquido
            } else {
              mesesMap.set(chave, {
                quantidade: 1,
                receita: valorLiquido
              })
            }
          }
        })
      }

      const visitasPorMesArray = Array.from(mesesMap.entries())
        .map(([mes, data]) => ({ mes, ...data }))
        .sort((a, b) => a.mes.localeCompare(b.mes))
        .slice(-12)

      // Análise de dias da semana e horários de pico (período selecionado - por data_inicio do serviço)
      const visitasPeriodoAnalise = await fetchAllRows(
        supabase
          .from('visits')
          .select(`
          data,
          horario,
          status,
          service_id,
          services!inner(data_inicio)
        `)
          .eq('status', 'realizada')
          .gte('services.data_inicio', dataInicio)
          .lte('services.data_inicio', dataFim)
      )

      const diasMap = new Map<string, number>()
      const horariosMap = new Map<string, number>()

      visitasPeriodoAnalise?.forEach((visit: any) => {
        const [year, month, day] = visit.data.split('-')
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        const diaSemana = date.getDay()
        const diasNomes = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
        const nomeDia = diasNomes[diaSemana]
        
        diasMap.set(nomeDia, (diasMap.get(nomeDia) || 0) + 1)

        // Agrupar horários por faixa (manhã, tarde, noite)
        const hora = parseInt(visit.horario.split(':')[0])
        let faixa = ''
        if (hora >= 6 && hora < 12) faixa = 'Manhã (6h-12h)'
        else if (hora >= 12 && hora < 18) faixa = 'Tarde (12h-18h)'
        else if (hora >= 18 && hora < 24) faixa = 'Noite (18h-24h)'
        else faixa = 'Madrugada (0h-6h)'
        
        horariosMap.set(faixa, (horariosMap.get(faixa) || 0) + 1)
      })

      const diasArray = Array.from(diasMap.entries())
        .map(([dia, quantidade]) => ({ dia, quantidade }))
        .sort((a, b) => {
          const ordem = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
          return ordem.indexOf(a.dia) - ordem.indexOf(b.dia)
        })

      const horariosArray = Array.from(horariosMap.entries())
        .map(([horario, quantidade]) => ({ horario, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade)

      // Calcular estatísticas do período selecionado:
      // total de visitas = agendadas + realizadas (canceladas não entram no total)
      const visitasDoPeriodo = visitasPeriodoData || []
      const visitasAtivasPeriodo = visitasDoPeriodo.filter(
        (v: any) => v.status === 'agendada' || v.status === 'realizada'
      )
      const visitasRealizadasPeriodo = visitasDoPeriodo.filter((v: any) => v.status === 'realizada')
      
      const receitaPeriodo = visitasRealizadasPeriodo
        .reduce((acc: number, v: any) => acc + v.valor * (1 - (v.desconto_plataforma || 0) / 100), 0)
      
      const visitasRealizadas = visitasRealizadasPeriodo.length
      const visitasAgendadas = visitasAtivasPeriodo.filter((v: any) => v.status === 'agendada').length
      const ticketMedio = visitasRealizadas > 0 ? receitaPeriodo / visitasRealizadas : 0

      // Tipos de visita
      const visitasInteiras = visitasAtivasPeriodo.filter((v: any) => v.tipo_visita === 'inteira').length
      const visitasMeias = visitasAtivasPeriodo.filter((v: any) => v.tipo_visita === 'meia').length

      setStats({
        totalClientesAtivos: clientesResult.count || 0,
        totalVisitasMes: visitasAtivasPeriodo.length,
        receitaMes: receitaPeriodo,
        visitasRealizadas,
        visitasAgendadas,
        servicosPendentes: servicosResult.count || 0,
        clientesNovos: clientesNovosCount || 0,
        taxaRetencao,
        ticketMedio,
        totalPets: petsResult.count || 0
      })

      setClientesRanking(ranking)
      setVisitasPorMes(visitasPorMesArray)
      setTiposVisita({ inteira: visitasInteiras, meia: visitasMeias })
      setDiasSemana(diasArray)
      setHorariosPico(horariosArray)

    } catch (error) {
      console.error('Erro ao buscar relatórios:', error)
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

  const formatMonth = (mesString: string) => {
    const [ano, mes] = mesString.split('-')
    const meses = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ]
    return `${meses[parseInt(mes) - 1]}/${ano.slice(-2)}`
  }

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'mes_atual': return 'do Mês Atual'
      case 'mes_anterior': return 'do Mês Anterior'
      case '3meses': return 'dos Últimos 3 Meses'
      case '6meses': return 'dos Últimos 6 Meses'
      case 'ano': return 'deste Ano'
      case 'tudo': return 'de Todo Período'
      default: return ''
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <CatLoader size="lg" variant="sleeping" text="Preparando relatórios..." />
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="page-title-fefelina">Relatórios e Estatísticas</h1>
          <p className="text-sm text-gray-600 mt-1">Análise {getPeriodLabel()}</p>
        </div>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="input-fefelina max-w-xs"
        >
          <option value="mes_atual">📅 Mês Atual</option>
          <option value="mes_anterior">📆 Mês Anterior</option>
          <option value="3meses">📊 Últimos 3 Meses</option>
          <option value="6meses">📈 Últimos 6 Meses</option>
          <option value="ano">🗓️ Este Ano</option>
          <option value="tudo">🌐 Todo Período</option>
        </select>
      </div>

      <div className="divider-fefelina"></div>

      {/* Cards de Estatísticas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="stats-card-fefelina">
          <div className="text-center">
            <div className="icon-fefelina bg-primary-500 mx-auto mb-2">
              <span>📅</span>
            </div>
            <dt className="text-sm font-medium text-gray-500">Visitas {getPeriodLabel()}</dt>
            <dd className="text-2xl font-bold text-gray-900">{stats.totalVisitasMes}</dd>
            <p className="text-xs text-primary-700 mt-1">{stats.visitasRealizadas} realizadas</p>
          </div>
        </div>

        <div className="stats-card-fefelina">
          <div className="text-center">
            <div className="icon-fefelina bg-primary-700 mx-auto mb-2">
              <span>💰</span>
            </div>
            <dt className="text-sm font-medium text-gray-500">Receita {getPeriodLabel()}</dt>
            <dd className="text-xl font-bold text-primary-700">{formatCurrency(stats.receitaMes)}</dd>
            <p className="text-xs text-gray-400 mt-1">Ticket: {formatCurrency(stats.ticketMedio)}</p>
          </div>
        </div>

        <div className="stats-card-fefelina">
          <div className="text-center">
            <div className="icon-fefelina bg-lilac-500 mx-auto mb-2">
              <span>✨</span>
            </div>
            <dt className="text-sm font-medium text-gray-500">Clientes Novos</dt>
            <dd className="text-2xl font-bold text-lilac-700">{stats.clientesNovos}</dd>
            <p className="text-xs text-gray-400 mt-1">{getPeriodLabel().replace('d', 'n').replace('D', 'N')}</p>
          </div>
        </div>
      </div>

      {/* Seção de Gráficos e Relatórios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* Ranking de Clientes por Valor */}
        <div className="card-fefelina">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Top Clientes por Valor</h3>
            <select
              value={showTopClients}
              onChange={(e) => setShowTopClients(Number(e.target.value))}
              className="input-fefelina max-w-24 py-1 text-sm"
            >
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
              <option value={50}>Top 50</option>
            </select>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {clientesRanking.slice(0, showTopClients).map((cliente, index) => (
              <div key={cliente.nome + index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center flex-1 min-w-0">
                  <span className="flex items-center justify-center w-7 h-7 bg-primary-100 text-primary-600 rounded-full text-xs font-medium mr-3 flex-shrink-0">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{cliente.nome}</p>
                    <p className="text-xs text-gray-500">
                      {cliente.totalVisitas} visitas · Última: {format(parseISO(cliente.ultimaVisita), 'dd/MM/yy')}
                    </p>
                  </div>
                </div>
                <div className="text-right ml-2 flex-shrink-0">
                  <p className="font-semibold text-primary-700 text-sm">{formatCurrency(cliente.valorTotal)}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(cliente.valorTotal / cliente.totalVisitas)}/visita</p>
                </div>
              </div>
            ))}
            {clientesRanking.length === 0 && (
              <p className="text-center text-gray-500 py-8">Nenhum dado encontrado no período</p>
            )}
          </div>
        </div>

        {/* Tipos de Visita */}
        <div className="card-fefelina">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Tipos de Visita {getPeriodLabel()}</h3>
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Visitas Inteiras</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-3 mr-3">
                  <div 
                    className="bg-primary-600 h-3 rounded-full transition-all" 
                    style={{ 
                      width: `${tiposVisita.inteira + tiposVisita.meia > 0 
                        ? (tiposVisita.inteira / (tiposVisita.inteira + tiposVisita.meia)) * 100 
                        : 0}%` 
                    }}
                  ></div>
                </div>
                <span className="font-semibold text-lg">{tiposVisita.inteira}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Meias Visitas</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-3 mr-3">
                  <div 
                    className="bg-lilac-500 h-3 rounded-full transition-all" 
                    style={{ 
                      width: `${tiposVisita.inteira + tiposVisita.meia > 0 
                        ? (tiposVisita.meia / (tiposVisita.inteira + tiposVisita.meia)) * 100 
                        : 0}%` 
                    }}
                  ></div>
                </div>
                <span className="font-semibold text-lg">{tiposVisita.meia}</span>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{tiposVisita.inteira + tiposVisita.meia}</p>
                <p className="text-xs text-gray-500 mt-1">Total de Visitas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-700">{formatCurrency(stats.receitaMes)}</p>
                <p className="text-xs text-gray-500 mt-1">Receita Total</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nova Seção: Dias da Semana e Horários de Pico */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Dias da Semana Mais Movimentados */}
        <div className="card-fefelina">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Dias Mais Movimentados {getPeriodLabel()}</h3>
          <div className="space-y-3">
            {diasSemana.map((dia) => {
              const maxVisitas = Math.max(...diasSemana.map(d => d.quantidade))
              const percentage = maxVisitas > 0 ? (dia.quantidade / maxVisitas) * 100 : 0
              return (
                <div key={dia.dia} className="flex items-center">
                  <span className="text-sm font-medium text-gray-700 w-20">{dia.dia}</span>
                  <div className="flex-1 mx-3">
                    <div className="w-full bg-gray-200 rounded-full h-6">
                      <div 
                        className="bg-primary-500 h-6 rounded-full flex items-center justify-end pr-2 transition-all"
                        style={{ width: `${percentage}%` }}
                      >
                        <span className="text-white text-xs font-semibold">
                          {percentage > 15 ? dia.quantidade : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                    {percentage <= 15 ? dia.quantidade : ''}
                  </span>
                </div>
              )
            })}
            {diasSemana.length === 0 && (
              <p className="text-center text-gray-500 py-4">Nenhum dado encontrado</p>
            )}
          </div>
        </div>

        {/* Horários de Pico */}
        <div className="card-fefelina">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Horários de Pico {getPeriodLabel()}</h3>
          <div className="space-y-3">
            {horariosPico.map((horario, index) => {
              const maxVisitas = Math.max(...horariosPico.map(h => h.quantidade))
              const percentage = maxVisitas > 0 ? (horario.quantidade / maxVisitas) * 100 : 0
              const colors = ['bg-primary-500', 'bg-lilac-500', 'bg-primary-700', 'bg-lilac-700']
              return (
                <div key={horario.horario} className="flex items-center">
                  <span className="text-sm font-medium text-gray-700 w-32">{horario.horario}</span>
                  <div className="flex-1 mx-3">
                    <div className="w-full bg-gray-200 rounded-full h-6">
                      <div 
                        className={`${colors[index % colors.length]} h-6 rounded-full flex items-center justify-end pr-2 transition-all`}
                        style={{ width: `${percentage}%` }}
                      >
                        <span className="text-white text-xs font-semibold">
                          {percentage > 20 ? horario.quantidade : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                    {percentage <= 20 ? horario.quantidade : ''}
                  </span>
                </div>
              )
            })}
            {horariosPico.length === 0 && (
              <p className="text-center text-gray-500 py-4">Nenhum dado encontrado</p>
            )}
          </div>
        </div>
      </div>

      {/* Evolução Mensal */}
      <div className="card-fefelina">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Evolução dos Últimos 12 Meses</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-sm font-medium text-gray-500">Mês</th>
                <th className="text-right py-2 text-sm font-medium text-gray-500">Visitas</th>
                <th className="text-right py-2 text-sm font-medium text-gray-500">Receita</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {visitasPorMes.map((mes) => (
                <tr key={mes.mes} className="hover:bg-gray-50">
                  <td className="py-3 text-sm text-gray-900 font-medium">{formatMonth(mes.mes)}</td>
                  <td className="py-3 text-sm text-right text-gray-900">{mes.quantidade}</td>
                  <td className="py-3 text-sm text-right text-primary-700 font-semibold">{formatCurrency(mes.receita)}</td>
                </tr>
              ))}
              {visitasPorMes.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-gray-500">
                    Nenhum dado encontrado para o período selecionado
                  </td>
                </tr>
              )}
            </tbody>
            {visitasPorMes.length > 0 && (
              <tfoot className="border-t-2 border-gray-300 bg-gray-50">
                <tr>
                  <td className="py-3 text-sm font-bold text-gray-900">TOTAL</td>
                  <td className="py-3 text-sm text-right font-bold text-gray-900">
                    {visitasPorMes.reduce((acc, m) => acc + m.quantidade, 0)}
                  </td>
                  <td className="py-3 text-sm text-right font-bold text-primary-700">
                    {formatCurrency(visitasPorMes.reduce((acc, m) => acc + m.receita, 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
