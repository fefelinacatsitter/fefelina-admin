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
  
  const [formData, setFormData] = useState({
    nome_servico: '',
    client_id: '',
    data_inicio: '',
    data_fim: '',
    status: 'pendente' as const,
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
      setServices(data || [])
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

  const fetchVisits = async (serviceId: string) => {
    try {
      const { data, error } = await supabase
        .from('visits')
        .select('*')
        .eq('service_id', serviceId)
        .order('data', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Erro ao buscar visitas:', error)
      return []
    }
  }

  const calcularValorVisita = (tipo: 'inteira' | 'meia', client: Client | null): number => {
    if (!client) return 0
    
    if (tipo === 'inteira') {
      return client.valor_diaria
    } else {
      return client.valor_duas_visitas / 2
    }
  }

  const calcularTotais = (visitas: Visit[]) => {
    const totalVisitas = visitas.length
    const totalValor = visitas.reduce((sum, visit) => sum + visit.valor, 0)
    const totalAReceber = visitas.reduce((sum, visit) => {
      return sum + (visit.valor * (1 - visit.desconto_plataforma / 100))
    }, 0)
    
    return { totalVisitas, totalValor, totalAReceber }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      let serviceData = {
        nome_servico: formData.nome_servico,
        client_id: formData.client_id,
        data_inicio: formData.data_inicio,
        data_fim: formData.data_fim,
        status: formData.status,
        desconto_plataforma_default: formData.desconto_plataforma_default,
        total_visitas: visits.length,
        total_valor: calcularTotais(visits).totalValor,
        total_a_receber: calcularTotais(visits).totalAReceber
      }

      let serviceId: string

      if (editingService) {
        const { error } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', editingService.id)
        
        if (error) throw error
        serviceId = editingService.id
      } else {
        const { data, error } = await supabase
          .from('services')
          .insert([serviceData])
          .select()
          .single()
        
        if (error) throw error
        serviceId = data.id
      }

      // Salvar visitas
      if (visits.length > 0) {
        // Remover visitas existentes se estiver editando
        if (editingService) {
          await supabase
            .from('visits')
            .delete()
            .eq('service_id', serviceId)
        }

        // Inserir visitas
        const visitsToInsert = visits.map(visit => ({
          service_id: serviceId,
          data: visit.data,
          horario: visit.horario,
          tipo_visita: visit.tipo_visita,
          valor: visit.valor,
          status: visit.status,
          status_pagamento: visit.status_pagamento,
          desconto_plataforma: visit.desconto_plataforma,
          observacoes: visit.observacoes || null
        }))

        const { error: visitsError } = await supabase
          .from('visits')
          .insert(visitsToInsert)

        if (visitsError) throw visitsError
      }

      await fetchServices()
      closeModal()
      alert(editingService ? 'Serviço atualizado com sucesso!' : 'Serviço criado com sucesso!')
      
    } catch (error: any) {
      console.error('Erro ao salvar serviço:', error)
      alert('Erro ao salvar serviço: ' + error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço? Todas as visitas associadas também serão excluídas.')) return

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchServices()
    } catch (error) {
      console.error('Erro ao excluir serviço:', error)
      alert('Erro ao excluir serviço. Tente novamente.')
    }
  }

  const openModal = async (service?: Service) => {
    if (service) {
      setEditingService(service)
      setFormData({
        nome_servico: service.nome_servico || '',
        client_id: service.client_id,
        data_inicio: service.data_inicio,
        data_fim: service.data_fim,
        status: service.status,
        desconto_plataforma_default: service.desconto_plataforma_default
      })
      
      // Buscar cliente selecionado
      const client = clients.find(c => c.id === service.client_id)
      setSelectedClient(client || null)
      
      // Buscar visitas existentes
      const existingVisits = await fetchVisits(service.id)
      setVisits(existingVisits)
    } else {
      setEditingService(null)
      setFormData({
        nome_servico: '',
        client_id: '',
        data_inicio: '',
        data_fim: '',
        status: 'pendente',
        desconto_plataforma_default: 0
      })
      setVisits([])
      setSelectedClient(null)
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingService(null)
    setVisits([])
    setSelectedClient(null)
    setFormData({
      nome_servico: '',
      client_id: '',
      data_inicio: '',
      data_fim: '',
      status: 'pendente',
      desconto_plataforma_default: 0
    })
  }

  const addVisit = () => {
    const newVisit: Visit = {
      data: '',
      horario: '09:00',
      tipo_visita: 'inteira',
      valor: selectedClient ? calcularValorVisita('inteira', selectedClient) : 0,
      status: 'agendada',
      status_pagamento: 'pendente_plataforma',
      desconto_plataforma: formData.desconto_plataforma_default,
      observacoes: ''
    }
    setVisits([...visits, newVisit])
  }

  const updateVisit = (index: number, field: keyof Visit, value: any) => {
    const updatedVisits = [...visits]
    
    // Atualizar o campo
    updatedVisits[index] = { ...updatedVisits[index], [field]: value }
    
    // Recalcular valor se necessário
    if (field === 'tipo_visita' && selectedClient) {
      updatedVisits[index].valor = calcularValorVisita(value, selectedClient)
    }
    
    setVisits(updatedVisits)
  }

  const removeVisit = (index: number) => {
    setVisits(visits.filter((_, i) => i !== index))
  }

  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    setSelectedClient(client || null)
    setFormData({ ...formData, client_id: clientId })
    
    // Recalcular valores das visitas existentes
    if (client) {
      const updatedVisits = visits.map(visit => ({
        ...visit,
        valor: calcularValorVisita(visit.tipo_visita, client)
      }))
      setVisits(updatedVisits)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      pendente: 'bg-yellow-100 text-yellow-800',
      em_andamento: 'bg-blue-100 text-blue-800',
      concluido: 'bg-green-100 text-green-800',
      pago: 'bg-primary-100 text-primary-800'
    }
    
    const labels = {
      pendente: 'Pendente',
      em_andamento: 'Em Andamento',
      concluido: 'Concluído',
      pago: 'Pago'
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  const totals = calcularTotais(visits)

  if (loading) {
    return (
      <div>
        <h1 className="page-title-fefelina">Serviços</h1>
        <div className="divider-fefelina"></div>
        <div className="card-fefelina">
          <div className="empty-state-fefelina">
            <div className="text-gray-500">Carregando serviços...</div>
          </div>
        </div>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum serviço cadastrado</h3>
            <p className="text-gray-500 mb-6">
              Configure os serviços oferecidos pela Fefelina.
            </p>
            <button className="btn-fefelina-secondary" onClick={() => openModal()}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Criar Primeiro Serviço
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <div key={service.id} className="card-fefelina">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {service.nome_servico || 'Serviço sem nome'}
                    </h3>
                    {getStatusBadge(service.status)}
                  </div>
                  {service.clients && (
                    <p className="text-sm text-gray-600">{service.clients.nome}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    {new Date(service.data_inicio).toLocaleDateString('pt-BR')} → {new Date(service.data_fim).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => openModal(service)}
                    className="text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(service.id)}
                    className="text-red-600 hover:text-red-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Visitas:</span>
                  <span className="font-medium">{service.total_visitas}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-medium">R$ {service.total_valor.toFixed(2)}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">A Receber:</span>
                  <span className="font-semibold text-primary-600">R$ {service.total_a_receber.toFixed(2)}</span>
                </div>
                
                {service.desconto_plataforma_default > 0 && (
                  <div className="text-xs text-gray-500">
                    Desconto: {service.desconto_plataforma_default}%
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="modal-fefelina max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="section-title-fefelina">
                {editingService ? 'Editar Serviço' : 'Novo Serviço'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Dados do Serviço */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Serviço *
                  </label>
                  <input
                    type="text"
                    required
                    className="input-fefelina"
                    value={formData.nome_servico}
                    onChange={(e) => setFormData({ ...formData, nome_servico: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cliente *
                  </label>
                  <select
                    required
                    className="input-fefelina"
                    value={formData.client_id}
                    onChange={(e) => handleClientChange(e.target.value)}
                  >
                    <option value="">Selecione o cliente</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Início *
                  </label>
                  <input
                    type="date"
                    required
                    className="input-fefelina"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Fim *
                  </label>
                  <input
                    type="date"
                    required
                    className="input-fefelina"
                    value={formData.data_fim}
                    onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    className="input-fefelina"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluido">Concluído</option>
                    <option value="pago">Pago</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Desconto Plataforma (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    className="input-fefelina"
                    value={formData.desconto_plataforma_default}
                    onChange={(e) => setFormData({ ...formData, desconto_plataforma_default: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="section-divider-fefelina"></div>

              {/* Seção de Visitas */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="section-title-fefelina">Visitas do Serviço</h3>
                  <button
                    type="button"
                    onClick={addVisit}
                    disabled={!selectedClient}
                    className="btn-fefelina-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Adicionar Visita
                  </button>
                </div>

                {!selectedClient && (
                  <p className="text-sm text-gray-500 mb-4">Selecione um cliente primeiro para adicionar visitas.</p>
                )}

                {visits.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">Nenhuma visita adicionada ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {visits.map((visit, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Data</label>
                            <input
                              type="date"
                              className="input-fefelina text-sm"
                              value={visit.data}
                              onChange={(e) => updateVisit(index, 'data', e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Hora</label>
                            <input
                              type="time"
                              className="input-fefelina text-sm"
                              value={visit.horario}
                              onChange={(e) => updateVisit(index, 'horario', e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                            <select
                              className="input-fefelina text-sm"
                              value={visit.tipo_visita}
                              onChange={(e) => updateVisit(index, 'tipo_visita', e.target.value)}
                            >
                              <option value="inteira">Inteira</option>
                              <option value="meia">Meia</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Valor</label>
                            <div className="input-fefelina text-sm bg-gray-100">
                              R$ {visit.valor.toFixed(2)}
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                            <select
                              className="input-fefelina text-sm"
                              value={visit.status}
                              onChange={(e) => updateVisit(index, 'status', e.target.value)}
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
                              className="text-red-600 hover:text-red-700 p-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        <div className="mt-3">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
                          <input
                            type="text"
                            className="input-fefelina text-sm"
                            placeholder="Observações sobre a visita..."
                            value={visit.observacoes || ''}
                            onChange={(e) => updateVisit(index, 'observacoes', e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Resumo/Totais */}
                {visits.length > 0 && (
                  <div className="mt-6 bg-primary-50 p-4 rounded-lg">
                    <h4 className="font-medium text-primary-800 mb-2">Resumo do Serviço</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-primary-600">Total de Visitas:</span>
                        <div className="font-semibold">{totals.totalVisitas}</div>
                      </div>
                      <div>
                        <span className="text-primary-600">Valor Total:</span>
                        <div className="font-semibold">R$ {totals.totalValor.toFixed(2)}</div>
                      </div>
                      <div>
                        <span className="text-primary-600">A Receber:</span>
                        <div className="font-semibold">R$ {totals.totalAReceber.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="section-divider-fefelina"></div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="btn-fefelina flex-1"
                >
                  {editingService ? 'Atualizar Serviço' : 'Criar Serviço'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-fefelina-secondary flex-1"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
