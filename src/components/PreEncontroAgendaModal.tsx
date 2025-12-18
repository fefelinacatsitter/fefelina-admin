import { useState, useEffect, useRef } from 'react'
import { supabase, Lead } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Calendar, Clock, User, X } from 'lucide-react'

interface Client {
  id: string
  nome: string
  telefone: string | null
}

interface PreEncontroAgendaModalProps {
  initialDate?: string
  initialTime?: string
  onClose: () => void
  onSuccess: () => void
}

type TipoAssociacao = 'lead' | 'cliente'

export default function PreEncontroAgendaModal({
  initialDate,
  initialTime,
  onClose,
  onSuccess
}: PreEncontroAgendaModalProps) {
  const [loading, setLoading] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [tipoAssociacao, setTipoAssociacao] = useState<TipoAssociacao>('lead')
  const [formData, setFormData] = useState({
    leadId: '',
    clientId: '',
    data: initialDate || new Date().toISOString().split('T')[0],
    horario: initialTime || '10:00',
    observacoes: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    // Fechar dropdown ao clicar fora
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  // Limpar seleção ao trocar tipo
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      leadId: '',
      clientId: ''
    }))
    setSearchTerm('')
    setDropdownOpen(false)
  }, [tipoAssociacao])

  const fetchData = async () => {
    try {
      setLoadingData(true)
      
      // Buscar leads e clientes em paralelo
      const [leadsResult, clientsResult] = await Promise.all([
        supabase
          .from('leads')
          .select('*')
          .not('status', 'in', '("fechado_ganho","fechado_perdido")')
          .order('nome'),
        supabase
          .from('clients')
          .select('id, nome, telefone')
          .order('nome')
      ])

      if (leadsResult.error) throw leadsResult.error
      if (clientsResult.error) throw clientsResult.error
      
      console.log('Leads com status pre_encontro:', leadsResult.data)
      console.log('Total de leads encontradas:', leadsResult.data?.length || 0)
      
      setLeads(leadsResult.data || [])
      setClients(clientsResult.data || [])
    } catch (error: any) {
      console.error('Erro ao buscar dados:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoadingData(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validação baseada no tipo
    if (tipoAssociacao === 'lead' && !formData.leadId) {
      toast.error('Selecione um lead')
      return
    }
    
    if (tipoAssociacao === 'cliente' && !formData.clientId) {
      toast.error('Selecione um cliente')
      return
    }
    
    if (!formData.data || !formData.horario) {
      toast.error('Data e horário são obrigatórios')
      return
    }

    setLoading(true)

    try {
      // Montar objeto de inserção baseado no tipo
      const visitData: any = {
        data: formData.data,
        horario: formData.horario,
        duracao_minutos: 30, // Pré-encontros sempre têm 30 minutos
        tipo_encontro: 'pre_encontro',
        tipo_visita: 'meia', // Pré-encontros sempre são "meia" (30min)
        valor: 0, // Sem valor para pré-encontro
        desconto_plataforma: 0,
        status: 'agendada',
        observacoes: formData.observacoes || null
      }

      // Adicionar lead_id ou client_id baseado no tipo
      if (tipoAssociacao === 'lead') {
        visitData.lead_id = formData.leadId
      } else {
        visitData.client_id = formData.clientId
      }

      const { error } = await supabase
        .from('visits')
        .insert(visitData)

      if (error) throw error

      toast.success('Pré-encontro agendado com sucesso!')
      
      // Primeiro fecha o modal
      onClose()
      
      // Aguarda um pouco mais para garantir que o Supabase processe a inserção
      setTimeout(() => {
        onSuccess()
      }, 300)
    } catch (error: any) {
      console.error('Erro ao agendar pré-encontro:', error)
      toast.error('Erro ao agendar pré-encontro: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header com gradiente */}
        <div className="bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Agendar Pré-Encontro</h2>
            <p className="text-xs text-gray-600 mt-0.5">A partir da agenda</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Seleção de Tipo: Lead ou Cliente */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
              Tipo de Pré-Encontro
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTipoAssociacao('lead')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  tipoAssociacao === 'lead'
                    ? 'bg-cyan-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Lead
              </button>
              <button
                type="button"
                onClick={() => setTipoAssociacao('cliente')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  tipoAssociacao === 'cliente'
                    ? 'bg-cyan-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Cliente
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {tipoAssociacao === 'lead' 
                ? 'Pré-encontro para conhecer um potencial novo cliente' 
                : 'Pré-encontro para conhecer um cliente já cadastrado'}
            </p>
          </div>

          {/* Selecionar Lead ou Cliente */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
              <User className="w-3.5 h-3.5" />
              {tipoAssociacao === 'lead' ? 'Selecionar Lead' : 'Selecionar Cliente'}
            </label>
            {loadingData ? (
              <div className="text-center py-4 text-sm text-gray-500">Carregando dados...</div>
            ) : tipoAssociacao === 'lead' ? (
              leads.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-xs text-yellow-800">
                  Nenhum lead disponível. Crie um lead primeiro na página de Leads.
                </div>
              ) : (
                <div className="relative" ref={dropdownRef}>
                  {/* Input de busca - Leads */}
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setDropdownOpen(true)}
                    placeholder="Digite para buscar ou selecione..."
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white"
                  />
                  
                  {/* Nome selecionado */}
                  {formData.leadId && !dropdownOpen && (
                    <div className="mt-1 px-3 py-2 bg-cyan-50 border border-cyan-200 rounded-md text-sm">
                      <span className="font-medium text-cyan-900">
                        {leads.find(l => l.id === formData.leadId)?.nome}
                      </span>
                    </div>
                  )}

                  {/* Lista de opções - Leads */}
                  {dropdownOpen && (
                    <div className="absolute z-[100] w-full mt-1 bg-white border-2 border-cyan-300 rounded-md shadow-xl max-h-60 overflow-auto">
                      {leads
                        .filter(lead => 
                          lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          lead.telefone?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((lead) => (
                          <button
                            key={lead.id}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, leadId: lead.id })
                              setSearchTerm('')
                              setDropdownOpen(false)
                            }}
                            className={`w-full px-3 py-2 text-left hover:bg-cyan-50 transition-colors flex flex-col gap-0.5 border-b border-gray-100 last:border-b-0 first:rounded-t-md last:rounded-b-md ${
                              formData.leadId === lead.id ? 'bg-cyan-50 text-cyan-900' : 'text-gray-900'
                            }`}
                          >
                            <span className="text-sm font-medium">{lead.nome}</span>
                            <span className="text-xs text-gray-500">
                              {lead.telefone || 'Sem telefone'}
                            </span>
                          </button>
                        ))}
                      {leads.filter(lead => 
                        lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        lead.telefone?.toLowerCase().includes(searchTerm.toLowerCase())
                      ).length === 0 && (
                        <div className="px-3 py-4 text-center text-sm text-gray-500">
                          Nenhum lead encontrado
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            ) : (
              clients.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-xs text-yellow-800">
                  Nenhum cliente disponível. Crie um cliente primeiro na página de Clientes.
                </div>
              ) : (
                <div className="relative" ref={dropdownRef}>
                  {/* Input de busca - Clientes */}
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setDropdownOpen(true)}
                    placeholder="Digite para buscar ou selecione..."
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white"
                  />
                  
                  {/* Nome selecionado */}
                  {formData.clientId && !dropdownOpen && (
                    <div className="mt-1 px-3 py-2 bg-cyan-50 border border-cyan-200 rounded-md text-sm">
                      <span className="font-medium text-cyan-900">
                        {clients.find(c => c.id === formData.clientId)?.nome}
                      </span>
                    </div>
                  )}

                  {/* Lista de opções - Clientes */}
                  {dropdownOpen && (
                    <div className="absolute z-[100] w-full mt-1 bg-white border-2 border-cyan-300 rounded-md shadow-xl max-h-60 overflow-auto">
                      {clients
                        .filter(client => 
                          client.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          client.telefone?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, clientId: client.id })
                              setSearchTerm('')
                              setDropdownOpen(false)
                            }}
                            className={`w-full px-3 py-2 text-left hover:bg-cyan-50 transition-colors flex flex-col gap-0.5 border-b border-gray-100 last:border-b-0 first:rounded-t-md last:rounded-b-md ${
                              formData.clientId === client.id ? 'bg-cyan-50 text-cyan-900' : 'text-gray-900'
                            }`}
                          >
                            <span className="text-sm font-medium">{client.nome}</span>
                            <span className="text-xs text-gray-500">
                              {client.telefone || 'Sem telefone'}
                            </span>
                          </button>
                        ))}
                      {clients.filter(client => 
                        client.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        client.telefone?.toLowerCase().includes(searchTerm.toLowerCase())
                      ).length === 0 && (
                        <div className="px-3 py-4 text-center text-sm text-gray-500">
                          Nenhum cliente encontrado
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            )}
          </div>

          {/* Data */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Data do Encontro
            </label>
            <input
              type="date"
              value={formData.data}
              onChange={(e) => setFormData({ ...formData, data: e.target.value })}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>

          {/* Horário */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
              <Clock className="w-3.5 h-3.5" />
              Horário de Início
            </label>
            <input
              type="time"
              value={formData.horario}
              onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1.5">
              Duração: 30 minutos
            </p>
          </div>

          {/* Observações */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
              Observações
            </label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="Ex: Primeiro contato, conhecer os gatinhos, ver a casa..."
            />
          </div>

          {/* Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
            <p className="text-xs text-gray-600">
              <strong>Dica:</strong> Este pré-encontro aparecerá na agenda com cor azul claro para fácil identificação.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-3 py-1.5 bg-primary-500 text-white text-sm font-medium rounded-md hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || (!formData.leadId && !formData.clientId)}
            >
              {loading ? 'Agendando...' : 'Agendar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
