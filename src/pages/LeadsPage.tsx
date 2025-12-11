import { useState, useEffect } from 'react'
import { supabase, Lead, Visit } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Users, Phone, MapPin, Calendar, DollarSign, Plus, X, Edit2, Clock } from 'lucide-react'
import PreEncontroModal from '../components/PreEncontroModal'
import ConvertLeadModal from '../components/ConvertLeadModal'
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

type LeadStatus = 'em_contato' | 'negociacao' | 'aguardando_resposta' | 'fechado_ganho' | 'fechado_perdido'

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bgColor: string; borderColor: string }> = {
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
      className={`${config.bgColor} border ${config.borderColor} rounded-lg p-3 cursor-move hover:shadow-lg transition-all overflow-hidden ${
        isDragging ? 'shadow-2xl ring-2 ring-purple-400' : ''
      }`}
    >
      <div onClick={(e) => {
        e.stopPropagation()
        onOpen(lead)
      }}>
        <h4 className="font-semibold text-sm text-gray-900 mb-1.5 truncate" title={lead.nome}>{lead.nome}</h4>
        {lead.telefone && (
          <div className="flex items-center gap-1.5 mb-1 min-w-0">
            <p className="text-xs text-gray-600 flex items-center gap-1 truncate flex-shrink">
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
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </button>
          </div>
        )}
        {lead.valor_orcamento && (
          <p className={`text-sm font-bold ${config.color} mt-1.5 truncate`}>
            {formatCurrency(lead.valor_orcamento)}
          </p>
        )}
        {(lead.periodo_inicio || lead.periodo_fim) && (
          <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1 truncate">
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
  isActive: boolean
}

function DroppableColumn({ status, children, isActive }: DroppableColumnProps) {
  const { setNodeRef } = useDroppable({
    id: status,
  })

  return (
    <div
      ref={setNodeRef}
      className={`space-y-2 flex-1 min-h-[300px] rounded-md transition-all ${
        isActive ? 'bg-blue-50/50 ring-1 ring-blue-300' : 'bg-gray-50/30'
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
  const [activeLead, setActiveLead] = useState<Lead | null>(null)
  const [activeColumn, setActiveColumn] = useState<LeadStatus | null>(null)

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
  const [detailStatus, setDetailStatus] = useState<LeadStatus>('em_contato')
  
  // Estados para pré-encontros
  const [showPreEncontroModal, setShowPreEncontroModal] = useState(false)
  const [preEncontros, setPreEncontros] = useState<Visit[]>([])
  const [loadingPreEncontros, setLoadingPreEncontros] = useState(false)

  // Estados para conversão de lead em cliente
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [leadToConvert, setLeadToConvert] = useState<Lead | null>(null)

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

  const fetchPreEncontros = async (leadId: string) => {
    try {
      setLoadingPreEncontros(true)
      const { data, error } = await supabase
        .from('visits')
        .select('*')
        .eq('lead_id', leadId)
        .eq('tipo_encontro', 'pre_encontro')
        .order('data', { ascending: true })
        .order('horario', { ascending: true })

      if (error) throw error
      setPreEncontros(data || [])
    } catch (error) {
      console.error('Erro ao buscar pré-encontros:', error)
      toast.error('Erro ao carregar pré-encontros')
    } finally {
      setLoadingPreEncontros(false)
    }
  }

  const handleDeletePreEncontro = async (visitId: string) => {
    if (!confirm('Deseja realmente cancelar este pré-encontro?')) return

    try {
      const { error } = await supabase
        .from('visits')
        .delete()
        .eq('id', visitId)

      if (error) throw error

      toast.success('Pré-encontro cancelado')
      if (selectedLead) {
        fetchPreEncontros(selectedLead.id)
      }
    } catch (error: any) {
      console.error('Erro ao cancelar pré-encontro:', error)
      toast.error('Erro ao cancelar pré-encontro')
    }
  }

  // Funções de Drag and Drop
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const lead = leads.find(l => l.id === active.id)
    setActiveLead(lead || null)
  }

  const handleDragOver = (event: any) => {
    const { over } = event
    if (!over) {
      setActiveColumn(null)
      return
    }

    const validStatuses: LeadStatus[] = ['em_contato', 'negociacao', 'aguardando_resposta', 'fechado_ganho', 'fechado_perdido']
    
    // Verificar se estamos sobre uma coluna ou sobre um card
    if (validStatuses.includes(over.id as LeadStatus)) {
      setActiveColumn(over.id as LeadStatus)
    } else {
      // Estamos sobre um card, encontrar a qual coluna ele pertence
      const targetLead = leads.find(l => l.id === over.id)
      if (targetLead) {
        setActiveColumn(targetLead.status)
      }
    }
  }

  const handleDragCancel = () => {
    setActiveLead(null)
    setActiveColumn(null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveLead(null)
    setActiveColumn(null)

    if (!over) return

    const leadId = active.id as string
    
    // O over.id pode ser tanto o ID de uma coluna (status) quanto o ID de outro lead
    // Precisamos verificar se é um status válido ou buscar o status do lead de destino
    let newStatus: LeadStatus
    
    const validStatuses: LeadStatus[] = ['em_contato', 'negociacao', 'aguardando_resposta', 'fechado_ganho', 'fechado_perdido']
    
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

    // Se moveu para "Fechado Ganho", perguntar se quer converter em cliente
    if (newStatus === 'fechado_ganho') {
      setLeadToConvert(lead)
      setShowConvertModal(true)
      
      // Atualizar o status da lead mesmo sem converter (usuário pode cancelar a conversão)
      try {
        const { error } = await supabase
          .from('leads')
          .update({ status: newStatus })
          .eq('id', leadId)

        if (error) throw error

        setLeads(leads.map(l => 
          l.id === leadId ? { ...l, status: newStatus } : l
        ))

        toast.success(`Lead movido para "Fechado Ganho"`)
      } catch (error) {
        console.error('Erro ao atualizar status:', error)
        toast.error('Erro ao mover lead')
        fetchLeads()
      }
      return
    }

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

  const handleConvertToClient = async (valorDiaria: number, valorDuasVisitas: number) => {
    if (!leadToConvert) return

    try {
      // Criar novo cliente com os dados da lead
      const { error: clientError } = await supabase
        .from('clients')
        .insert({
          nome: leadToConvert.nome,
          endereco_completo: leadToConvert.endereco || '',
          veterinario_confianca: 'Não informado',
          valor_diaria: valorDiaria,
          valor_duas_visitas: valorDuasVisitas,
          observacoes: leadToConvert.observacoes || null
        })
        .select()
        .single()

      if (clientError) throw clientError

      toast.success(`Lead "${leadToConvert.nome}" convertido em cliente com sucesso! 🎉`)
      
      // Fechar modal e limpar estados
      setShowConvertModal(false)
      setLeadToConvert(null)

      // Opcional: Mostrar mensagem sobre navegação
      setTimeout(() => {
        toast.success('Cliente criado! Você pode encontrá-lo na página de Clientes.', {
          duration: 4000
        })
      }, 1000)

    } catch (error) {
      console.error('Erro ao converter lead em cliente:', error)
      toast.error('Erro ao converter lead em cliente. Tente novamente.')
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
    fetchPreEncontros(lead.id) // Buscar pré-encontros do lead
  }

  const resetForm = () => {
    setFormData({
      nome: '',
      telefone: '',
      endereco: '',
      periodo_inicio: '',
      periodo_fim: '',
      valor_orcamento: '',
      status: 'em_contato',
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

  const calcularHorarioFim = (horarioInicio: string, duracaoMinutos: number = 30) => {
    const [horas, minutos] = horarioInicio.split(':').map(Number)
    const totalMinutos = horas * 60 + minutos + duracaoMinutos
    const horasFim = Math.floor(totalMinutos / 60)
    const minutosFim = totalMinutos % 60
    return `${String(horasFim).padStart(2, '0')}:${String(minutosFim).padStart(2, '0')}`
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
          <div>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Novo Lead
            </button>
          </div>
        </div>

        {/* Métricas principais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {/* Total de Leads */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600">Total de Leads</div>
                <div className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</div>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Valor Potencial */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-purple-700">Valor em Aberto</div>
                <div className="text-3xl font-bold text-purple-900 mt-1">{formatCurrency(stats.valor_potencial)}</div>
                <div className="text-xs text-purple-600 mt-1">Pipeline ativa</div>
              </div>
              <div className="bg-purple-200 p-3 rounded-full">
                <DollarSign className="w-6 h-6 text-purple-700" />
              </div>
            </div>
          </div>

          {/* Taxa de Conversão */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600">Taxa de Conversão</div>
                <div className="text-3xl font-bold text-green-600 mt-1">
                  {stats.total > 0 ? Math.round((stats.fechado_ganho / stats.total) * 100) : 0}%
                </div>
                <div className="text-xs text-gray-500 mt-1">{stats.fechado_ganho} ganhos / {stats.total} total</div>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
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
        ) : (
          // Visualização Kanban com Drag and Drop
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map((status, index) => {
                const statusLeads = getLeadsByStatus(status)
                const config = STATUS_CONFIG[status]
                const isLastColumn = index === Object.keys(STATUS_CONFIG).length - 1

                return (
                  <SortableContext
                    key={status}
                    id={status}
                    items={statusLeads.map(l => l.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className={`flex flex-col ${!isLastColumn ? 'border-r border-gray-200 pr-3' : ''}`}>
                      {/* Header da coluna estilo Jira - altura fixa */}
                      <div className="mb-2 h-8 flex items-center justify-between">
                        <h3 className={`text-xs font-semibold uppercase ${config.color} tracking-wide`}>
                          {config.label}
                        </h3>
                        <span className={`text-xs font-medium ${config.color} bg-white px-2 py-0.5 rounded-full border ${config.borderColor}`}>
                          {statusLeads.length}
                        </span>
                      </div>
                      <DroppableColumn status={status} isActive={activeColumn === status}>
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
                <div className={`${STATUS_CONFIG[activeLead.status].bgColor} border-2 ${STATUS_CONFIG[activeLead.status].borderColor} rounded-lg p-3 shadow-2xl opacity-90 cursor-grabbing overflow-hidden max-w-xs`}>
                  <h4 className="font-semibold text-sm text-gray-900 mb-1.5 truncate" title={activeLead.nome}>{activeLead.nome}</h4>
                  {activeLead.telefone && (
                    <p className="text-xs text-gray-600 flex items-center gap-1 mb-1 truncate">
                      <Phone className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{activeLead.telefone}</span>
                    </p>
                  )}
                  {activeLead.valor_orcamento && (
                    <p className={`text-sm font-bold ${STATUS_CONFIG[activeLead.status].color} mt-1.5 truncate`}>
                      {formatCurrency(activeLead.valor_orcamento)}
                    </p>
                  )}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
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

              {/* Seção de Pré-Encontros */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Pré-Encontros Agendados
                  </label>
                  <button
                    onClick={() => setShowPreEncontroModal(true)}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Agendar Pré-Encontro
                  </button>
                </div>

                {loadingPreEncontros ? (
                  <div className="text-center py-4 text-gray-500">Carregando...</div>
                ) : preEncontros.length === 0 ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <p className="text-sm text-blue-700">
                      Nenhum pré-encontro agendado ainda
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {preEncontros.map((encontro) => (
                      <div
                        key={encontro.id}
                        className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex justify-between items-start"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
                            <Calendar className="w-4 h-4" />
                            {new Date(encontro.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                            <Clock className="w-4 h-4 ml-2" />
                            {encontro.horario.substring(0, 5)} - {calcularHorarioFim(encontro.horario, encontro.duracao_minutos || 30)}
                            <span className="text-xs text-blue-600">(30min)</span>
                          </div>
                          {encontro.observacoes && (
                            <p className="text-xs text-blue-700 mt-1">{encontro.observacoes}</p>
                          )}
                          <span className={`inline-block mt-2 px-2 py-0.5 text-xs rounded-full ${
                            encontro.status === 'realizada' 
                              ? 'bg-green-100 text-green-700' 
                              : encontro.status === 'cancelada'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {encontro.status === 'realizada' ? 'Realizado' : 
                             encontro.status === 'cancelada' ? 'Cancelado' : 'Agendado'}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeletePreEncontro(encontro.id!)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Cancelar pré-encontro"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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

      {/* Modal de Pré-Encontro */}
      {showPreEncontroModal && selectedLead && (
        <PreEncontroModal
          leadId={selectedLead.id}
          leadNome={selectedLead.nome}
          onClose={() => setShowPreEncontroModal(false)}
          onSuccess={() => {
            if (selectedLead) {
              fetchPreEncontros(selectedLead.id)
            }
          }}
        />
      )}

      {/* Modal de Conversão para Cliente */}
      {showConvertModal && leadToConvert && (
        <ConvertLeadModal
          lead={leadToConvert}
          onClose={() => {
            setShowConvertModal(false)
            setLeadToConvert(null)
          }}
          onConvert={handleConvertToClient}
        />
      )}
    </div>
  )
}
