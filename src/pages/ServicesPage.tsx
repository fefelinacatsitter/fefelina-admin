import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Service {
  id: string
  client_id: string
  nome_servico?: string
  data_inicio: string
  data_fim: string
  status: 'pendente' | 'em_andamento' | 'concluido' | 'pago'
  desconto_plataforma_default: number
  total_visitas: number
  total_valor: number
  total_a_receber: number
  created_at: string
  clients?: {
    nome: string
    valor_diaria: number
    valor_duas_visitas: number
  }
}

interface Visit {
  id?: string
  service_id?: string
  data: string
  horario: string
  tipo_visita: 'inteira' | 'meia'
  valor: number
  status: 'agendada' | 'realizada' | 'cancelada'
  status_pagamento: 'pendente_plataforma' | 'pendente' | 'pago'
  desconto_plataforma: number
  observacoes?: string
}

interface Client {
  id: string
  nome: string
  valor_diaria: number
  valor_duas_visitas: number
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [visits, setVisits] = useState<Visit[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  
  const [formData, setFormData] = useState<{
    nome_servico: string
    client_id: string
    desconto_plataforma_default: number
  }>({
    nome_servico: '',
    client_id: '',
    desconto_plataforma_default: 0
  })

  useEffect(() => {
    fetchServices()
    fetchClients()
  }, [])

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          clients (
            nome,
            valor_diaria,
            valor_duas_visitas
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Filtrar serviços que ainda estão ativos (data_fim >= hoje)
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')
      const todayStr = `${year}-${month}-${day}`
      
      const activeServices = (data || []).filter(service => 
        service.data_fim >= todayStr || service.status !== 'pago'
      )
      
      setServices(activeServices)
    } catch (error) {
      console.error('Erro ao buscar serviços:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, nome, valor_diaria, valor_duas_visitas')
        .order('nome')

      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error('Erro ao buscar clientes:', error)
    }
  }

  const calculateVisitValue = (client: Client, tipo: 'inteira' | 'meia') => {
    return tipo === 'inteira' ? client.valor_diaria : (client.valor_duas_visitas / 2)
  }

  const addVisit = () => {
    if (!selectedClient) return
    
    const newVisit: Visit = {
      data: '',
      horario: '09:00',
      tipo_visita: 'inteira',
      valor: calculateVisitValue(selectedClient, 'inteira'),
      status: 'agendada',
      status_pagamento: 'pendente',
      desconto_plataforma: formData.desconto_plataforma_default,
      observacoes: ''
    }
    setVisits([...visits, newVisit])
  }

  const updateVisit = (index: number, field: keyof Visit, value: any) => {
    const newVisits = [...visits]
    newVisits[index] = { ...newVisits[index], [field]: value }
    
    // Recalcular valor se mudou tipo ou cliente
    if (field === 'tipo_visita' && selectedClient) {
      newVisits[index].valor = calculateVisitValue(selectedClient, value)
    }
    
    setVisits(newVisits)
  }

  const removeVisit = (index: number) => {
    setVisits(visits.filter((_, i) => i !== index))
  }

  const calculateTotals = () => {
    const totalVisitas = visits.filter(v => v.status !== 'cancelada').length
    const totalValor = visits
      .filter(v => v.status !== 'cancelada')
      .reduce((sum, v) => sum + v.valor, 0)
    const totalAReceber = visits
      .filter(v => v.status !== 'cancelada')
      .reduce((sum, v) => sum + (v.valor * (1 - v.desconto_plataforma / 100)), 0)
    
    return { totalVisitas, totalValor, totalAReceber }
  }

  const openModal = (service?: Service) => {
    if (service) {
      setEditingService(service)
      setFormData({
        nome_servico: service.nome_servico || '',
        client_id: service.client_id,
        desconto_plataforma_default: service.desconto_plataforma_default
      })
      setSelectedClient(clients.find(c => c.id === service.client_id) || null)
      fetchVisitsForService(service.id)
    } else {
      setEditingService(null)
      setFormData({
        nome_servico: '',
        client_id: '',
        desconto_plataforma_default: 0
      })
      setVisits([])
      setSelectedClient(null)
    }
    setShowModal(true)
  }

  const fetchVisitsForService = async (serviceId: string) => {
    try {
      const { data, error } = await supabase
        .from('visits')
        .select('*')
        .eq('service_id', serviceId)
        .order('data', { ascending: true })

      if (error) throw error
      setVisits(data || [])
    } catch (error) {
      console.error('Erro ao buscar visitas:', error)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingService(null)
    setFormData({
      nome_servico: '',
      client_id: '',
      desconto_plataforma_default: 0
    })
    setVisits([])
    setSelectedClient(null)
  }

  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    setSelectedClient(client || null)
    setFormData({ ...formData, client_id: clientId })
    
    // Recalcular valores das visitas existentes
    if (client) {
      const updatedVisits = visits.map(visit => ({
        ...visit,
        valor: calculateVisitValue(client, visit.tipo_visita)
      }))
      setVisits(updatedVisits)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedClient || visits.length === 0) {
      alert('Selecione um cliente e adicione pelo menos uma visita')
      return
    }

    // Validar se todas as visitas têm data preenchida
    const visitsWithoutDate = visits.filter(v => !v.data)
    if (visitsWithoutDate.length > 0) {
      alert('Todas as visitas devem ter uma data preenchida')
      return
    }

    try {
      const { totalVisitas, totalValor, totalAReceber } = calculateTotals()
      
      // Calcular período baseado nas visitas
      const dates = visits.map(v => v.data).filter(d => d)
      const dataInicio = dates.sort()[0]
      const dataFim = dates.sort().reverse()[0]
      
      let serviceData: any = {
        ...formData,
        data_inicio: dataInicio,
        data_fim: dataFim,
        total_visitas: totalVisitas,
        total_valor: totalValor,
        total_a_receber: totalAReceber
      }

      let savedService: any
      
      if (editingService) {
        const { data, error } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', editingService.id)
          .select()
          .single()
        
        if (error) throw error
        savedService = data
        
        // Deletar visitas existentes e recriar
        await supabase
          .from('visits')
          .delete()
          .eq('service_id', editingService.id)
      } else {
        const { data, error } = await supabase
          .from('services')
          .insert([serviceData])
          .select()
          .single()
        
        if (error) throw error
        savedService = data
      }

      // Inserir visitas
      const visitsToInsert = visits.map(visit => ({
        ...visit,
        service_id: savedService.id,
        client_id: formData.client_id
      }))
      
      if (visitsToInsert.length > 0) {
        const { error: visitsError } = await supabase
          .from('visits')
          .insert(visitsToInsert)
        
        if (visitsError) throw visitsError
      }

      await fetchServices()
      closeModal()
    } catch (error) {
      console.error('Erro ao salvar serviço:', error)
      alert('Erro ao salvar serviço')
    }
  }

  const deleteService = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço? Todas as visitas associadas também serão excluídas.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchServices()
    } catch (error) {
      console.error('Erro ao excluir serviço:', error)
      alert('Erro ao excluir serviço')
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pendente: 'bg-orange-100 text-orange-800',
      em_andamento: 'bg-blue-100 text-blue-800',
      concluido: 'bg-gray-100 text-gray-800',
      pago: 'bg-green-100 text-green-800'
    }
    
    const labels = {
      pendente: 'Pendente',
      em_andamento: 'Em Andamento',
      concluido: 'Concluído',
      pago: 'Pago'
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
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
    return date.toLocaleDateString('pt-BR')
  }

  const { totalVisitas, totalValor, totalAReceber } = calculateTotals()

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
          <h1 className="page-title-fefelina">Serviços</h1>
          <p className="mt-2 text-sm text-gray-700">
            Gerencie os serviços e contratos de cuidado com pets.
          </p>
          <div className="divider-fefelina"></div>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            className="btn-fefelina"
            onClick={() => openModal()}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Novo Serviço
          </button>
        </div>
      </div>

      {services.length === 0 ? (
        <div className="mt-8 card-fefelina">
          <div className="empty-state-fefelina">
            <div className="mx-auto h-16 w-16 text-primary-400 mb-4">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum serviço agendado</h3>
            <p className="text-gray-500 mb-6">
              Agendar um serviço para começar.
            </p>
            <button className="btn-fefelina-secondary" onClick={() => openModal()}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Agendar Serviço
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6">
          {services.map((service) => (
            <div key={service.id} className="card-fefelina">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {service.nome_servico || `Serviço para ${service.clients?.nome}`}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Cliente: <span className="font-medium">{service.clients?.nome}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Período: {formatDate(service.data_inicio)} até {formatDate(service.data_fim)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(service.status)}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Total de Visitas</p>
                    <p className="text-lg font-semibold text-gray-900">{service.total_visitas}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Valor Total</p>
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(service.total_valor)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Valor a Receber</p>
                    <p className="text-lg font-semibold text-primary-600">{formatCurrency(service.total_a_receber)}</p>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => openModal(service)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Editar
                  </button>
                  <button
                    onClick={() => deleteService(service.id)}
                    className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeModal}></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {editingService ? 'Editar Serviço' : 'Novo Serviço'}
                </h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome do Serviço
                    </label>
                    <input
                      type="text"
                      value={formData.nome_servico}
                      onChange={(e) => setFormData({ ...formData, nome_servico: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Opcional"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cliente *
                    </label>
                    <select
                      value={formData.client_id}
                      onChange={(e) => handleClientChange(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    >
                      <option value="">Selecione um cliente</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Desconto Plataforma Padrão (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.desconto_plataforma_default}
                      onChange={(e) => setFormData({ ...formData, desconto_plataforma_default: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="0"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Será aplicado automaticamente em todas as visitas deste serviço (pode ser alterado individualmente)
                    </p>
                  </div>

                  <div className="md:col-span-2 bg-blue-50 p-4 rounded-lg">
                    <h5 className="text-sm font-medium text-blue-900 mb-2">ℹ️ Informações automáticas</h5>
                    <ul className="text-xs text-blue-800 space-y-1">
                      <li>• <strong>Período:</strong> Será calculado automaticamente baseado na primeira e última visita</li>
                      <li>• <strong>Status:</strong> Será atualizado automaticamente baseado no pagamento das visitas</li>
                      <li>• <strong>Totais:</strong> Serão calculados automaticamente baseado nas visitas cadastradas</li>
                    </ul>
                  </div>
                </div>

                {/* Seção de Visitas */}
                <div className="border-t pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-md font-medium text-gray-900">Visitas</h4>
                    <button
                      type="button"
                      onClick={addVisit}
                      disabled={!selectedClient}
                      className="btn-fefelina-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Adicionar Visita
                    </button>
                  </div>

                  {visits.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Nenhuma visita adicionada. Clique em "Adicionar Visita" para começar.
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {visits.map((visit, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Data *
                              </label>
                              <input
                                type="date"
                                value={visit.data}
                                onChange={(e) => updateVisit(index, 'data', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Horário *
                              </label>
                              <input
                                type="time"
                                value={visit.horario}
                                onChange={(e) => updateVisit(index, 'horario', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Tipo
                              </label>
                              <select
                                value={visit.tipo_visita}
                                onChange={(e) => updateVisit(index, 'tipo_visita', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                              >
                                <option value="inteira">Inteira</option>
                                <option value="meia">Meia</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Valor
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={visit.valor}
                                onChange={(e) => updateVisit(index, 'valor', parseFloat(e.target.value) || 0)}
                                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Status
                              </label>
                              <select
                                value={visit.status}
                                onChange={(e) => updateVisit(index, 'status', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                              >
                                <option value="agendada">Agendada</option>
                                <option value="realizada">Realizada</option>
                                <option value="cancelada">Cancelada</option>
                              </select>
                            </div>

                            <div className="flex items-end">
                              <button
                                type="button"
                                onClick={() => removeVisit(index)}
                                className="w-full inline-flex justify-center items-center px-2 py-1 border border-red-300 shadow-sm text-xs font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Desconto Plataforma (%)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={visit.desconto_plataforma}
                                onChange={(e) => updateVisit(index, 'desconto_plataforma', parseFloat(e.target.value) || 0)}
                                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Status Pagamento
                              </label>
                              <select
                                value={visit.status_pagamento}
                                onChange={(e) => updateVisit(index, 'status_pagamento', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                              >
                                <option value="pendente_plataforma">Pendente Plataforma</option>
                                <option value="pendente">Pendente</option>
                                <option value="pago">Pago</option>
                              </select>
                            </div>
                          </div>

                          <div className="mt-3">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Observações
                            </label>
                            <textarea
                              value={visit.observacoes || ''}
                              onChange={(e) => updateVisit(index, 'observacoes', e.target.value)}
                              rows={2}
                              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                              placeholder="Observações sobre esta visita..."
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Resumo dos Totais */}
                {visits.length > 0 && (
                  <div className="border-t pt-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-gray-900 mb-3">Resumo do Serviço</h5>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Total de Visitas:</span>
                          <span className="font-semibold ml-2">{totalVisitas}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Valor Total:</span>
                          <span className="font-semibold ml-2">{formatCurrency(totalValor)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Valor a Receber:</span>
                          <span className="font-semibold ml-2 text-primary-600">{formatCurrency(totalAReceber)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botões do Modal */}
                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-fefelina"
                  >
                    {editingService ? 'Atualizar Serviço' : 'Criar Serviço'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
