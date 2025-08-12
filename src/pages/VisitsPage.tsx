import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

interface Visit {
  id: string
  service_id: string
  data: string
  horario: string
  tipo_visita: 'inteira' | 'meia'
  valor: number
  status: 'agendada' | 'realizada' | 'cancelada'
  desconto_plataforma: number
  observacoes?: string
  clients: {
    nome: string
  } | null
  services: {
    nome_servico?: string
  } | null
}

export default function VisitsPage() {
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingVisit, setUpdatingVisit] = useState<string | null>(null)
  const [selectedFilter, setSelectedFilter] = useState<'todas' | 'hoje' | 'proximas' | 'realizadas'>('hoje')
  const [hasFutureVisits, setHasFutureVisits] = useState(false)
  
  // Estados para filtros de data
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')

  useEffect(() => {
    fetchVisits()
    checkFutureVisits()
  }, [selectedFilter, filterStartDate, filterEndDate])

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
          id, service_id, data, horario, tipo_visita, valor, status, desconto_plataforma, observacoes, client_id, created_at,
          clients (nome),
          services (nome_servico)
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

      const { data, error } = await query

      if (error) throw error
      
      setVisits((data || []).map(visit => ({
        ...visit,
        clients: Array.isArray(visit.clients) ? visit.clients[0] : visit.clients,
        services: Array.isArray(visit.services) ? visit.services[0] : visit.services
      })))
    } catch (error) {
      console.error('Erro ao buscar visitas:', error)
    } finally {
      setLoading(false)
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
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
                onChange={(e) => setFilterStartDate(e.target.value)}
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
                onChange={(e) => setFilterEndDate(e.target.value)}
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
              <div key={visit.id} className="border rounded-lg p-4 shadow-sm bg-white">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <div className="font-semibold text-primary-700 text-base">{formatDate(visit.data)} <span className="text-xs text-gray-500">{visit.horario}</span></div>
                    <div className="text-sm text-gray-700">{visit.clients?.nome}</div>
                    {visit.services?.nome_servico && (
                      <div className="text-xs text-gray-500">{visit.services.nome_servico}</div>
                    )}
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${visit.tipo_visita === 'inteira' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>{visit.tipo_visita === 'inteira' ? 'Inteira' : 'Meia'}</span>
                </div>
                <div className="flex flex-wrap gap-2 items-center mb-2">
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(visit.valor)}</span>
                  {visit.desconto_plataforma > 0 && (
                    <span className="text-xs text-gray-500">Desc: {visit.desconto_plataforma}%</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 items-center mb-2">
                  <span className="text-xs font-medium">Status:</span>
                  <select
                    value={visit.status}
                    onChange={(e) => updateVisitStatus(visit.id, e.target.value as any)}
                    disabled={updatingVisit === visit.id}
                    className="text-xs border-0 bg-gray-100 focus:ring-1 focus:ring-primary-500 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="agendada">Agendada</option>
                    <option value="realizada">Realizada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
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
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getSortedVisits().map((visit) => (
                    <tr key={visit.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatDate(visit.data)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {visit.horario}
                        </div>
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          visit.tipo_visita === 'inteira' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {visit.tipo_visita === 'inteira' ? 'Inteira' : 'Meia'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(visit.valor)}
                        {visit.desconto_plataforma > 0 && (
                          <div className="text-xs text-gray-500">
                            Desc: {visit.desconto_plataforma}%
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={visit.status}
                          onChange={(e) => updateVisitStatus(visit.id, e.target.value as any)}
                          disabled={updatingVisit === visit.id}
                          className="text-xs border-0 bg-transparent focus:ring-1 focus:ring-primary-500 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="agendada">Agendada</option>
                          <option value="realizada">Realizada</option>
                          <option value="cancelada">Cancelada</option>
                        </select>
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
    </div>
  )
}
