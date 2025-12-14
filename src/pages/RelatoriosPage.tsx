import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import CatLoader from '../components/CatLoader'

interface RelatorioStats {
  totalClientesAtivos: number
  totalVisitasMes: number
  receitaMes: number
  visitasRealizadas: number
  visitasAgendadas: number
  servicosPendentes: number
}

interface ClienteRanking {
  nome: string
  totalVisitas: number
  valorTotal: number
}

interface VisitasPorMes {
  mes: string
  quantidade: number
  receita: number
}

export default function RelatoriosPage() {
  const [stats, setStats] = useState<RelatorioStats>({
    totalClientesAtivos: 0,
    totalVisitasMes: 0,
    receitaMes: 0,
    visitasRealizadas: 0,
    visitasAgendadas: 0,
    servicosPendentes: 0
  })

  const [clientesRanking, setClientesRanking] = useState<ClienteRanking[]>([])
  const [visitasPorMes, setVisitasPorMes] = useState<VisitasPorMes[]>([])
  const [tiposVisita, setTiposVisita] = useState({ inteira: 0, meia: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('3meses')

  useEffect(() => {
    fetchRelatorios()
  }, [selectedPeriod])

  const fetchRelatorios = async () => {
    try {
      setLoading(true)
      
      const hoje = new Date()
      const anoAtual = hoje.getFullYear()
      const mesAtual = hoje.getMonth() + 1
      const inicioMes = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`
      const finalMes = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-${new Date(anoAtual, mesAtual, 0).getDate()}`

      // Período para análise histórica
      let dataInicio = ''
      if (selectedPeriod === '3meses') {
        const data = new Date()
        data.setMonth(data.getMonth() - 3)
        dataInicio = data.toISOString().split('T')[0]
      } else if (selectedPeriod === '6meses') {
        const data = new Date()
        data.setMonth(data.getMonth() - 6)
        dataInicio = data.toISOString().split('T')[0]
      } else if (selectedPeriod === 'ano') {
        dataInicio = `${anoAtual}-01-01`
      } else {
        // selectedPeriod === 'tudo'
        dataInicio = '2000-01-01' // Data muito antiga para pegar tudo
      }

      // Buscar estatísticas básicas
      const [clientesResult, visitasMesResult, servicosResult] = await Promise.all([
        // Clientes ativos (com serviços nos últimos 6 meses)
        supabase.from('clients').select('*', { count: 'exact' }),
        
        // Visitas do mês atual
        supabase
          .from('visits')
          .select('valor, status, tipo_visita, desconto_plataforma')
          .gte('data', inicioMes)
          .lte('data', finalMes),
        
        // Serviços pendentes
        supabase
          .from('services')
          .select('*', { count: 'exact' })
          .neq('status_pagamento', 'pago')
      ])

      // Buscar ranking de clientes
      const clientesRankingResult = await supabase
        .from('visits')
        .select(`
          clients!inner(nome),
          valor,
          desconto_plataforma,
          status
        `)
        .eq('status', 'realizada')
        .gte('data', dataInicio)

      // Processar ranking de clientes
      const clientesMap = new Map<string, { totalVisitas: number; valorTotal: number }>()
      
      if (clientesRankingResult.data) {
        clientesRankingResult.data.forEach((visit: any) => {
          const nomeCliente = visit.clients?.nome || 'Cliente desconhecido'
          const valorLiquido = visit.valor - (visit.desconto_plataforma || 0)
          
          if (clientesMap.has(nomeCliente)) {
            const existing = clientesMap.get(nomeCliente)!
            existing.totalVisitas += 1
            existing.valorTotal += valorLiquido
          } else {
            clientesMap.set(nomeCliente, {
              totalVisitas: 1,
              valorTotal: valorLiquido
            })
          }
        })
      }

      const ranking = Array.from(clientesMap.entries())
        .map(([nome, data]) => ({ nome, ...data }))
        .sort((a, b) => b.valorTotal - a.valorTotal)
        .slice(0, 10)

      // Buscar visitas por mês dos últimos 12 meses
      const visitasPorMesResult = await supabase
        .from('visits')
        .select('data, valor, desconto_plataforma, status')
        .eq('status', 'realizada')
        .gte('data', `${anoAtual - 1}-${String(mesAtual).padStart(2, '0')}-01`)

      // Processar visitas por mês
      const mesesMap = new Map<string, { quantidade: number; receita: number }>()
      
      if (visitasPorMesResult.data) {
        visitasPorMesResult.data.forEach((visit: any) => {
          const data = new Date(visit.data + 'T00:00:00')
          const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`
          const valorLiquido = visit.valor - (visit.desconto_plataforma || 0)
          
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
        })
      }

      const visitasPorMesArray = Array.from(mesesMap.entries())
        .map(([mes, data]) => ({ mes, ...data }))
        .sort((a, b) => a.mes.localeCompare(b.mes))
        .slice(-12) // Últimos 12 meses

      // Calcular estatísticas do mês atual
      const visitasDoMes = visitasMesResult.data || []
      const receitaMes = visitasDoMes
        .filter(v => v.status === 'realizada')
        .reduce((acc, v) => acc + v.valor - (v.desconto_plataforma || 0), 0)
      
      const visitasRealizadas = visitasDoMes.filter(v => v.status === 'realizada').length
      const visitasAgendadas = visitasDoMes.filter(v => v.status === 'agendada').length

      // Tipos de visita
      const visitasInteiras = visitasDoMes.filter(v => v.tipo_visita === 'inteira').length
      const visitasMeias = visitasDoMes.filter(v => v.tipo_visita === 'meia').length

      setStats({
        totalClientesAtivos: clientesResult.count || 0,
        totalVisitasMes: visitasDoMes.length,
        receitaMes,
        visitasRealizadas,
        visitasAgendadas,
        servicosPendentes: servicosResult.count || 0
      })

      setClientesRanking(ranking)
      setVisitasPorMes(visitasPorMesArray)
      setTiposVisita({ inteira: visitasInteiras, meia: visitasMeias })

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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <CatLoader size="lg" variant="sleeping" text="Preparando relatórios..." />
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title-fefelina">Relatórios e Estatísticas</h1>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="input-fefelina max-w-xs"
        >
          <option value="3meses">Últimos 3 meses</option>
          <option value="6meses">Últimos 6 meses</option>
          <option value="ano">Este ano</option>
          <option value="tudo">Tudo</option>
        </select>
      </div>

      <div className="divider-fefelina"></div>

      {/* Cards de Estatísticas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <div className="stats-card-fefelina">
          <div className="text-center">
            <div className="icon-fefelina bg-primary-500 mx-auto mb-2">
              <span>C</span>
            </div>
            <dt className="text-sm font-medium text-gray-500">Clientes Ativos</dt>
            <dd className="text-2xl font-bold text-gray-900">{stats.totalClientesAtivos}</dd>
          </div>
        </div>

        <div className="stats-card-fefelina">
          <div className="text-center">
            <div className="icon-fefelina bg-blue-500 mx-auto mb-2">
              <span>V</span>
            </div>
            <dt className="text-sm font-medium text-gray-500">Visitas do Mês</dt>
            <dd className="text-2xl font-bold text-gray-900">{stats.totalVisitasMes}</dd>
          </div>
        </div>

        <div className="stats-card-fefelina">
          <div className="text-center">
            <div className="icon-fefelina bg-green-500 mx-auto mb-2">
              <span>R$</span>
            </div>
            <dt className="text-sm font-medium text-gray-500">Receita do Mês</dt>
            <dd className="text-xl font-bold text-green-600">{formatCurrency(stats.receitaMes)}</dd>
          </div>
        </div>

        <div className="stats-card-fefelina">
          <div className="text-center">
            <div className="icon-fefelina bg-emerald-500 mx-auto mb-2">
              <span>✓</span>
            </div>
            <dt className="text-sm font-medium text-gray-500">Realizadas</dt>
            <dd className="text-2xl font-bold text-emerald-600">{stats.visitasRealizadas}</dd>
          </div>
        </div>

        <div className="stats-card-fefelina">
          <div className="text-center">
            <div className="icon-fefelina bg-yellow-500 mx-auto mb-2">
              <span>⏰</span>
            </div>
            <dt className="text-sm font-medium text-gray-500">Agendadas</dt>
            <dd className="text-2xl font-bold text-yellow-600">{stats.visitasAgendadas}</dd>
          </div>
        </div>

        <div className="stats-card-fefelina">
          <div className="text-center">
            <div className="icon-fefelina bg-red-500 mx-auto mb-2">
              <span>⚠</span>
            </div>
            <dt className="text-sm font-medium text-gray-500">Serv. Pendentes</dt>
            <dd className="text-2xl font-bold text-red-600">{stats.servicosPendentes}</dd>
          </div>
        </div>
      </div>

      {/* Seção de Gráficos e Relatórios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* Ranking de Clientes por Valor */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top 10 Clientes por Valor</h3>
          <div className="space-y-3">
            {clientesRanking.slice(0, 5).map((cliente, index) => (
              <div key={cliente.nome} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <span className="flex items-center justify-center w-8 h-8 bg-primary-100 text-primary-600 rounded-full text-sm font-medium mr-3">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{cliente.nome}</p>
                    <p className="text-sm text-gray-500">{cliente.totalVisitas} visitas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">{formatCurrency(cliente.valorTotal)}</p>
                </div>
              </div>
            ))}
            {clientesRanking.length === 0 && (
              <p className="text-center text-gray-500 py-4">Nenhum dado encontrado</p>
            )}
          </div>
        </div>

        {/* Tipos de Visita */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Tipos de Visita (Este Mês)</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Visitas Inteiras</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                  <div 
                    className="bg-primary-600 h-2 rounded-full" 
                    style={{ 
                      width: `${tiposVisita.inteira + tiposVisita.meia > 0 
                        ? (tiposVisita.inteira / (tiposVisita.inteira + tiposVisita.meia)) * 100 
                        : 0}%` 
                    }}
                  ></div>
                </div>
                <span className="font-semibold">{tiposVisita.inteira}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Meias Visitas</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                  <div 
                    className="bg-accent-500 h-2 rounded-full" 
                    style={{ 
                      width: `${tiposVisita.inteira + tiposVisita.meia > 0 
                        ? (tiposVisita.meia / (tiposVisita.inteira + tiposVisita.meia)) * 100 
                        : 0}%` 
                    }}
                  ></div>
                </div>
                <span className="font-semibold">{tiposVisita.meia}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Evolução Mensal */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Evolução dos Últimos 12 Meses</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-sm font-medium text-gray-500">Mês</th>
                <th className="text-right py-2 text-sm font-medium text-gray-500">Visitas</th>
                <th className="text-right py-2 text-sm font-medium text-gray-500">Receita</th>
                <th className="text-right py-2 text-sm font-medium text-gray-500">Média por Visita</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {visitasPorMes.map((mes) => (
                <tr key={mes.mes} className="hover:bg-gray-50">
                  <td className="py-3 text-sm text-gray-900">{formatMonth(mes.mes)}</td>
                  <td className="py-3 text-sm text-right text-gray-900">{mes.quantidade}</td>
                  <td className="py-3 text-sm text-right text-green-600 font-medium">{formatCurrency(mes.receita)}</td>
                  <td className="py-3 text-sm text-right text-gray-700">
                    {formatCurrency(mes.quantidade > 0 ? mes.receita / mes.quantidade : 0)}
                  </td>
                </tr>
              ))}
              {visitasPorMes.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    Nenhum dado encontrado para o período selecionado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
