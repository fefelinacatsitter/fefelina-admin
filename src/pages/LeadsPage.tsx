import { useState, useEffect } from 'react'
import { supabase, Lead } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Users, Phone, MapPin, Calendar, DollarSign, Plus, X, Edit2, Eye } from 'lucide-react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type LeadStatus = 'novo' | 'em_contato' | 'negociacao' | 'aguardando_resposta' | 'fechado_ganho' | 'fechado_perdido'

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bgColor: string; borderColor: string }> = {
  novo: {
    label: 'Novo',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300'
  },
  em_contato: {
    label: 'Em Contato',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300'
  },
  negociacao: {
    label: 'Negociação',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300'
  },
  aguardando_resposta: {
    label: 'Pré-Encontro',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300'
  },
  fechado_ganho: {
    label: 'Fechado Ganho',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300'
  },
  fechado_perdido: {
    label: 'Fechado Perdido',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300'
  }
}

// Componente de Card Arrastável
interface DraggableLeadCardProps {
  lead: Lead
  config: typeof STATUS_CONFIG[LeadStatus]
  onOpen: (lead: Lead) => void
  onWhatsApp: (telefone: string | null) => void
  formatCurrency: (value: number | null) => string
  formatPeriodo: (inicio: string | null, fim: string | null) => string
}

function DraggableLeadCard({ lead, config, onOpen, onWhatsApp, formatCurrency, formatPeriodo }: DraggableLeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`${config.bgColor} border ${config.borderColor} rounded-lg p-4 cursor-move hover:shadow-lg transition-all overflow-hidden ${
        isDragging ? 'shadow-2xl ring-2 ring-purple-400' : ''
      }`}
    >
      <div onClick={(e) => {
        e.stopPropagation()
        onOpen(lead)
      }}>
        <h4 className="font-semibold text-gray-900 mb-2 truncate" title={lead.nome}>{lead.nome}</h4>
        {lead.telefone && (
          <div className="flex items-center gap-2 mb-1 min-w-0">
            <p className="text-sm text-gray-600 flex items-center gap-1 truncate flex-shrink">
              <Phone className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{lead.telefone}</span>
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onWhatsApp(lead.telefone)
              }}
              className="text-green-600 hover:text-green-700 transition-colors flex-shrink-0"
              title="Abrir WhatsApp"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </button>
          </div>
        )}
        {lead.valor_orcamento && (
          <p className={`text-lg font-bold ${config.color} mt-2 truncate`}>
            {formatCurrency(lead.valor_orcamento)}
          </p>
        )}
        {(lead.periodo_inicio || lead.periodo_fim) && (
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1 truncate">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{formatPeriodo(lead.periodo_inicio, lead.periodo_fim)}</span>
          </p>
        )}
      </div>
    </div>
  )
}

// Componente de Coluna Droppable
interface DroppableColumnProps {
  status: LeadStatus
  children: React.ReactNode
}

function DroppableColumn({ status, children }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  })

  return (
    <div
      ref={setNodeRef}
      className={`space-y-3 flex-1 min-h-[200px] p-2 rounded-lg transition-all ${
        isOver ? 'bg-purple-100 ring-2 ring-purple-400' : ''
      }`}
    >
      {children}
    </div>
  )
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [activeLead, setActiveLead] = useState<Lead | null>(null)

  // Configuração dos sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Pixels de movimento necessários para iniciar o drag
      },
    })
  )

  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    endereco: '',
    periodo_inicio: '',
    periodo_fim: '',
    valor_orcamento: '',
    status: 'novo' as LeadStatus,
    observacoes: ''
  })

  // Estado separado para o modal de detalhes
  const [detailStatus, setDetailStatus] = useState<LeadStatus>('novo')

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Verificar se há leads com status inválido e corrigi-los
      const invalidLeads = (data || []).filter(lead => 
        !['novo', 'em_contato', 'negociacao', 'aguardando_resposta', 'fechado_ganho', 'fechado_perdido'].includes(lead.status)
      )
      
      if (invalidLeads.length > 0) {
        console.warn('Leads com status inválido encontrados:', invalidLeads)
        toast.error(`${invalidLeads.length} lead(s) com status inválido. Corrigindo para "novo"...`)
        
        // Corrigir status inválidos
        for (const lead of invalidLeads) {
          await supabase
            .from('leads')
            .update({ status: 'novo' })
            .eq('id', lead.id)
        }
        
        // Recarregar dados
        const { data: refreshedData } = await supabase
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false })
        
        setLeads(refreshedData || [])
      } else {
        setLeads(data || [])
      }
    } catch (error) {
      console.error('Erro ao buscar leads:', error)
      toast.error('Erro ao carregar leads')
    } finally {
      setLoading(false)
    }
  }

  // Funções de Drag and Drop
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const lead = leads.find(l => l.id === active.id)
    setActiveLead(lead || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveLead(null)

    if (!over) return

    const leadId = active.id as string
    
    // O over.id pode ser tanto o ID de uma coluna (status) quanto o ID de outro lead
    // Precisamos verificar se é um status válido ou buscar o status do lead de destino
    let newStatus: LeadStatus
    
    const validStatuses: LeadStatus[] = ['novo', 'em_contato', 'negociacao', 'aguardando_resposta', 'fechado_ganho', 'fechado_perdido']
    
    if (validStatuses.includes(over.id as LeadStatus)) {
      // over.id é um status válido (coluna)
      newStatus = over.id as LeadStatus
    } else {
      // over.id é o ID de outro lead, precisamos pegar o status dele
      const targetLead = leads.find(l => l.id === over.id)
      if (!targetLead) return
      newStatus = targetLead.status
    }

    // Verificar se o status mudou
    const lead = leads.find(l => l.id === leadId)
    if (!lead || lead.status === newStatus) return

    try {
      // Atualizar no banco de dados
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', leadId)

      if (error) throw error

      // Atualizar estado local
      setLeads(leads.map(l => 
        l.id === leadId ? { ...l, status: newStatus } : l
      ))

      toast.success(`Lead movido para "${STATUS_CONFIG[newStatus].label}"`)
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      toast.error('Erro ao mover lead')
      // Recarregar para garantir consistência
      fetchLeads()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const leadData = {
        nome: formData.nome,
        telefone: formData.telefone || null,
        endereco: formData.endereco || null,
        periodo_inicio: formData.periodo_inicio || null,
        periodo_fim: formData.periodo_fim || null,
        valor_orcamento: formData.valor_orcamento ? parseFloat(formData.valor_orcamento) : null,
        status: formData.status,
        observacoes: formData.observacoes || null
      }

      if (editingLead) {
        const { error } = await supabase
          .from('leads')
          .update(leadData)
          .eq('id', editingLead.id)

        if (error) throw error
        toast.success('Lead atualizado com sucesso!')
      } else {
        const { error } = await supabase
          .from('leads')
          .insert([leadData])

        if (error) throw error
        toast.success('Lead cadastrado com sucesso!')
      }

      resetForm()
      fetchLeads()
    } catch (error) {
      console.error('Erro ao salvar lead:', error)
      toast.error('Erro ao salvar lead')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este lead?')) return

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Lead excluído com sucesso!')
      fetchLeads()
      setShowDetailModal(false)
    } catch (error) {
      console.error('Erro ao excluir lead:', error)
      toast.error('Erro ao excluir lead')
    }
  }

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead)
    setFormData({
      nome: lead.nome,
      telefone: lead.telefone || '',
      endereco: lead.endereco || '',
      periodo_inicio: lead.periodo_inicio || '',
      periodo_fim: lead.periodo_fim || '',
      valor_orcamento: lead.valor_orcamento?.toString() || '',
      status: lead.status,
      observacoes: lead.observacoes || ''
    })
    setShowForm(true)
    setShowDetailModal(false)
  }

  const handleStatusUpdate = async () => {
    if (!selectedLead) return

    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: detailStatus })
        .eq('id', selectedLead.id)

      if (error) throw error
      toast.success('Status atualizado!')
      fetchLeads()
      setShowDetailModal(false)
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      toast.error('Erro ao atualizar status')
    }
  }

  const handleOpenDetailModal = (lead: Lead) => {
    setSelectedLead(lead)
    setDetailStatus(lead.status) // Inicializa com o status atual
    setShowDetailModal(true)
  }

  const resetForm = () => {
    setFormData({
      nome: '',
      telefone: '',
      endereco: '',
      periodo_inicio: '',
      periodo_fim: '',
      valor_orcamento: '',
      status: 'novo',
      observacoes: ''
    })
    setEditingLead(null)
    setShowForm(false)
  }

  const getLeadsByStatus = (status: LeadStatus) => {
    return leads.filter(lead => lead.status === status)
  }

  const formatCurrency = (value: number | null) => {
    if (!value) return 'Não informado'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'Não informada'
    return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR')
  }

  const formatPeriodo = (inicio: string | null, fim: string | null) => {
    if (!inicio && !fim) return 'Não informado'
    if (inicio && !fim) return `A partir de ${formatDate(inicio)}`
    if (!inicio && fim) return `Até ${formatDate(fim)}`
    return `${formatDate(inicio)} - ${formatDate(fim)}`
  }

  const formatWhatsAppNumber = (telefone: string | null) => {
    if (!telefone) return null
    // Remove todos os caracteres não numéricos
    const cleaned = telefone.replace(/\D/g, '')
    // Se não começar com 55 (código do Brasil), adiciona
    return cleaned.startsWith('55') ? cleaned : `55${cleaned}`
  }

  const openWhatsApp = (telefone: string | null) => {
    const formatted = formatWhatsAppNumber(telefone)
    if (formatted) {
      window.open(`https://wa.me/${formatted}`, '_blank')
    }
  }

  // Estatísticas do funil
  const stats = {
    total: leads.length,
    novo: getLeadsByStatus('novo').length,
    em_contato: getLeadsByStatus('em_contato').length,
    negociacao: getLeadsByStatus('negociacao').length,
    aguardando_resposta: getLeadsByStatus('aguardando_resposta').length,
    fechado_ganho: getLeadsByStatus('fechado_ganho').length,
    fechado_perdido: getLeadsByStatus('fechado_perdido').length,
    valor_potencial: leads
      .filter(l => !['fechado_perdido'].includes(l.status))
      .reduce((sum, l) => sum + (l.valor_orcamento || 0), 0)
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-7 h-7 text-purple-600" />
              Leads (CRM)
            </h1>
            <p className="text-sm text-gray-600 mt-1">Gerencie potenciais clientes</p>
          </div>
          <div className="flex gap-2">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Kanban
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Lista
              </button>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Novo Lead
            </button>
          </div>
        </div>

        {/* Estatísticas do Funil */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mt-4">
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-300">
            <div className="text-2xl font-bold text-gray-700">{stats.novo}</div>
            <div className="text-xs text-gray-600">Novos</div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-300">
            <div className="text-2xl font-bold text-blue-700">{stats.em_contato}</div>
            <div className="text-xs text-blue-600">Em Contato</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-300">
            <div className="text-2xl font-bold text-yellow-700">{stats.negociacao}</div>
            <div className="text-xs text-yellow-600">Negociação</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-300">
            <div className="text-2xl font-bold text-purple-700">{stats.aguardando_resposta}</div>
            <div className="text-xs text-purple-600">Aguardando</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg border border-green-300">
            <div className="text-2xl font-bold text-green-700">{stats.fechado_ganho}</div>
            <div className="text-xs text-green-600">Ganhos</div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg border border-red-300">
            <div className="text-2xl font-bold text-red-700">{stats.fechado_perdido}</div>
            <div className="text-xs text-red-600">Perdidos</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-lg border border-purple-300">
            <div className="text-lg font-bold text-purple-700">{formatCurrency(stats.valor_potencial)}</div>
            <div className="text-xs text-purple-600">Valor Potencial</div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-2 animate-pulse" />
              <p className="text-gray-600">Carregando leads...</p>
            </div>
          </div>
        ) : viewMode === 'kanban' ? (
          // Visualização Kanban com Drag and Drop
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map(status => {
                const statusLeads = getLeadsByStatus(status)
                const config = STATUS_CONFIG[status]

                return (
                  <SortableContext
                    key={status}
                    id={status}
                    items={statusLeads.map(l => l.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="flex flex-col">
                      <div className={`${config.bgColor} ${config.borderColor} border-2 rounded-lg p-3 mb-3`}>
                        <h3 className={`font-semibold ${config.color} flex items-center justify-between`}>
                          {config.label}
                          <span className="text-sm font-normal">({statusLeads.length})</span>
                        </h3>
                      </div>
                      <DroppableColumn status={status}>
                        {statusLeads.map(lead => (
                          <DraggableLeadCard
                            key={lead.id}
                            lead={lead}
                            config={config}
                            onOpen={handleOpenDetailModal}
                            onWhatsApp={openWhatsApp}
                            formatCurrency={formatCurrency}
                            formatPeriodo={formatPeriodo}
                          />
                        ))}
                      </DroppableColumn>
                    </div>
                  </SortableContext>
                )
              })}
            </div>

            {/* Overlay de drag */}
            <DragOverlay>
              {activeLead ? (
                <div className={`${STATUS_CONFIG[activeLead.status].bgColor} border-2 ${STATUS_CONFIG[activeLead.status].borderColor} rounded-lg p-4 shadow-2xl opacity-90 cursor-grabbing overflow-hidden max-w-xs`}>
                  <h4 className="font-semibold text-gray-900 mb-2 truncate" title={activeLead.nome}>{activeLead.nome}</h4>
                  {activeLead.telefone && (
                    <p className="text-sm text-gray-600 flex items-center gap-1 mb-1 truncate">
                      <Phone className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{activeLead.telefone}</span>
                    </p>
                  )}
                  {activeLead.valor_orcamento && (
                    <p className={`text-lg font-bold ${STATUS_CONFIG[activeLead.status].color} mt-2 truncate`}>
                      {formatCurrency(activeLead.valor_orcamento)}
                    </p>
                  )}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          // Visualização em Lista
          <div className="bg-white rounded-lg shadow">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Endereço</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {leads.map(lead => {
                  const config = STATUS_CONFIG[lead.status]
                  return (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{lead.nome}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {lead.telefone ? (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">{lead.telefone}</span>
                            <button
                              onClick={() => openWhatsApp(lead.telefone)}
                              className="text-green-600 hover:text-green-700 transition-colors"
                              title="Abrir WhatsApp"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {lead.endereco || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(lead.valor_orcamento)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${config.bgColor} ${config.color} border ${config.borderColor}`}>
                          {config.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleOpenDetailModal(lead)}
                          className="text-purple-600 hover:text-purple-900 mr-3"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(lead)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {editingLead ? 'Editar Lead' : 'Novo Lead'}
              </h2>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Cliente *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  type="text"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Período do Serviço Desejado
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Data Início</label>
                    <input
                      type="date"
                      value={formData.periodo_inicio}
                      onChange={(e) => setFormData({ ...formData, periodo_inicio: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Data Fim</label>
                    <input
                      type="date"
                      value={formData.periodo_fim}
                      onChange={(e) => setFormData({ ...formData, periodo_fim: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endereço
                </label>
                <input
                  type="text"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor do Orçamento
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valor_orcamento}
                    onChange={(e) => setFormData({ ...formData, valor_orcamento: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as LeadStatus })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map(status => (
                      <option key={status} value={status}>
                        {STATUS_CONFIG[status].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  rows={4}
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  {editingLead ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalhes */}
      {showDetailModal && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Detalhes do Lead</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Nome</label>
                <p className="text-lg font-medium text-gray-900 mt-1">{selectedLead.nome}</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  Telefone
                </label>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-base text-gray-900">{selectedLead.telefone || '-'}</p>
                  {selectedLead.telefone && (
                    <button
                      onClick={() => openWhatsApp(selectedLead.telefone)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                      title="Abrir WhatsApp"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                      WhatsApp
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Período do Serviço Desejado
                </label>
                <p className="text-base text-gray-900 mt-1">
                  {formatPeriodo(selectedLead.periodo_inicio, selectedLead.periodo_fim)}
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Endereço
                </label>
                <p className="text-base text-gray-900 mt-1">{selectedLead.endereco || '-'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    Valor do Orçamento
                  </label>
                  <p className="text-2xl font-bold text-purple-600 mt-1">
                    {formatCurrency(selectedLead.valor_orcamento)}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Alterar Status</label>
                  <div className="mt-2">
                    <select
                      value={detailStatus}
                      onChange={(e) => setDetailStatus(e.target.value as LeadStatus)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map(status => (
                        <option key={status} value={status}>
                          {STATUS_CONFIG[status].label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {detailStatus !== selectedLead.status && (
                    <button
                      onClick={handleStatusUpdate}
                      className="mt-2 w-full px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Salvar Alteração de Status
                    </button>
                  )}
                </div>
              </div>

              {selectedLead.observacoes && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Observações</label>
                  <p className="text-base text-gray-700 mt-2 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                    {selectedLead.observacoes}
                  </p>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleDelete(selectedLead.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Excluir Lead
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={() => handleEdit(selectedLead)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Editar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
