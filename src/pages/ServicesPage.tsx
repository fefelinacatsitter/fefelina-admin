import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Copy, Eye, Pencil, CheckCircle2, MoreVertical, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import CatLoader from '../components/CatLoader'
import ClientCombobox from '../components/ClientCombobox'
import PaginationControls from '../components/PaginationControls'
import { useFieldMask } from '../hooks/useFieldMask'
import { usePermissions } from '../contexts/PermissionsContext'
import Avatar from '../components/Avatar'
import { useServicesData, type Service, type Client } from '../hooks/useServicesData'

export type { Service, Client }

interface Visit {
  id?: string
  service_id?: string
  data: string
  horario: string
  tipo_visita: 'inteira' | 'meia'
  tipo_encontro?: string
  valor: number
  status: 'agendada' | 'realizada' | 'cancelada'
  desconto_plataforma: number
}

type ServiceSortColumn = 'nome_servico' | 'data_inicio' | 'total_visitas' | 'total_valor' | 'status_pagamento'

interface SortableThProps {
  label: string
  column: ServiceSortColumn
  sortColumn: ServiceSortColumn | null
  sortDirection: 'asc' | 'desc'
  onSort: (column: ServiceSortColumn) => void
  align?: 'left' | 'center' | 'right'
}

function SortableTh({ label, column, sortColumn, sortDirection, onSort, align = 'left' }: SortableThProps) {
  const isActive = sortColumn === column
  const alignClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'
  const textAlignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'

  return (
    <th className={`px-4 py-3 text-xs font-medium text-gray-500 ${textAlignClass}`}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`inline-flex items-center gap-1 ${alignClass} w-full hover:text-gray-700 transition-colors`}
      >
        {label}
        {isActive ? (
          sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />
        )}
      </button>
    </th>
  )
}

// Funções auxiliares para validação de data
const validateDateInput = (value: string): string => {
  // Remove caracteres não numéricos exceto hífens
  const cleaned = value.replace(/[^\d-]/g, '')
  
  // Se o valor estiver vazio, retorna vazio
  if (!cleaned) return ''
  
  // Divide a data em partes
  const parts = cleaned.split('-')
  
  if (parts.length >= 1) {
    // Limita o ano a 4 dígitos
    const year = parts[0].slice(0, 4)
    
    // Valida se o ano é válido (entre 1900 e 2100)
    if (year.length === 4) {
      const yearNum = parseInt(year)
      if (yearNum < 1900 || yearNum > 2100) {
        return '' // Retorna vazio para anos inválidos
      }
    }
    
    // Reconstrói a data com as validações
    let result = year
    
    if (parts.length >= 2 && parts[1]) {
      // Limita o mês a 2 dígitos e valida (01-12)
      let month = parts[1].slice(0, 2)
      if (month.length === 2) {
        const monthNum = parseInt(month)
        if (monthNum < 1 || monthNum > 12) {
          month = '12' // Corrige para dezembro se inválido
        }
      }
      result += '-' + month
      
      if (parts.length >= 3 && parts[2]) {
        // Limita o dia a 2 dígitos e valida (01-31)
        let day = parts[2].slice(0, 2)
        if (day.length === 2) {
          const dayNum = parseInt(day)
          if (dayNum < 1 || dayNum > 31) {
            day = '01' // Corrige para dia 1 se inválido
          }
        }
        result += '-' + day
      }
    }
    
    return result
  }
  
  return cleaned
}

const isValidDate = (dateString: string): boolean => {
  if (!dateString) return false
  
  // Verifica o formato YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateString)) return false
  
  const date = new Date(dateString + 'T00:00:00')
  const [year, month, day] = dateString.split('-').map(Number)
  
  // Verifica se a data é válida
  return date.getFullYear() === year &&
         date.getMonth() === month - 1 &&
         date.getDate() === day &&
         year >= 1900 &&
         year <= 2100
}

export default function ServicesPage() {
  // Field-Level Security e Permissões
  const { maskField } = useFieldMask('services')
  const { maskField: maskVisitField } = useFieldMask('visits')
  const { canCreate, canUpdate, canDelete, userProfile } = usePermissions()
  
  const canCreateService = canCreate('services')
  const canUpdateService = canUpdate('services')
  const canDeleteService = canDelete('services')
  
  const {
    services,
    clients,
    users,
    usersMap,
    loading,
    selectedFilter,
    setSelectedFilter,
    filterStartDate,
    setFilterStartDate,
    filterEndDate,
    setFilterEndDate,
    searchQuery,
    setSearchQuery,
    page,
    setPage,
    pageSize,
    totalCount,
    sortColumn,
    sortDirection,
    toggleSort,
    fetchServices,
    getAvailableUsers,
  } = useServicesData()

  const [openActionsMenuId, setOpenActionsMenuId] = useState<string | null>(null)
  const [showDateFilter, setShowDateFilter] = useState(false)

  const [filteredUsers, setFilteredUsers] = useState<{id: string, full_name: string, email: string, avatar_url?: string}[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [deletingService, setDeletingService] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [visits, setVisits] = useState<Visit[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Service | null>(null)
  
  // Estados para modal de visualização de detalhes
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [viewingService, setViewingService] = useState<Service | null>(null)
  const [viewingVisits, setViewingVisits] = useState<Visit[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  
  // Estados para menu de contexto mobile
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [selectedServiceForMenu, setSelectedServiceForMenu] = useState<Service | null>(null)
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  
  const [formData, setFormData] = useState<{
    nome_servico: string
    client_id: string
    status_pagamento: 'pendente' | 'pendente_plataforma' | 'pago_parcialmente' | 'pago'
    desconto_plataforma_default: number
    assigned_user_id: string
    valor_pago: number
  }>({
    nome_servico: '',
    client_id: '',
    status_pagamento: 'pendente',
    desconto_plataforma_default: 0,
    assigned_user_id: '',
    valor_pago: 0
  })

  // States para múltiplas visitas
  const [multiVisitStartDate, setMultiVisitStartDate] = useState('');
  const [multiVisitEndDate, setMultiVisitEndDate] = useState('');
  const [multiVisitTipo, setMultiVisitTipo] = useState<'inteira' | 'meia'>('inteira');

  // Fecha o menu de ações da tabela ao clicar fora dele
  useEffect(() => {
    if (!openActionsMenuId) return
    const handleClickOutside = () => setOpenActionsMenuId(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [openActionsMenuId])

  // Recolhe o filtro de período ao sair do quick filter "Concluídos"
  useEffect(() => {
    if (selectedFilter !== 'concluidos') {
      setShowDateFilter(false)
    }
  }, [selectedFilter])

  // Atualizar usuários disponíveis quando cliente selecionado mudar
  useEffect(() => {
    const updateAvailableUsers = async () => {
      if (formData.client_id && users.length > 0) {
        const available = await getAvailableUsers(formData.client_id)
        setFilteredUsers(available)
        
        // Se o usuário selecionado não tem acesso ao cliente, resetar para atual
        if (formData.assigned_user_id && !available.find(u => u.id === formData.assigned_user_id)) {
          setFormData(prev => ({ ...prev, assigned_user_id: userProfile?.user_id || '' }))
        }
      } else {
        setFilteredUsers(users)
      }
    }
    updateAvailableUsers()
  }, [formData.client_id, users])

  const calculateVisitValue = (client: Client, tipo: 'inteira' | 'meia') => {
    return tipo === 'inteira' ? client.valor_diaria : (client.valor_duas_visitas / 2)
  }

  const addVisit = () => {
    if (!selectedClient) return
    
    const newVisit: Visit = {
      data: '',
      horario: '09:00',
      tipo_visita: 'inteira',
      tipo_encontro: 'visita_servico',
      valor: calculateVisitValue(selectedClient, 'inteira'),
      status: 'agendada',
      desconto_plataforma: formData.desconto_plataforma_default
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
        status_pagamento: service.status_pagamento || 'pendente',
        desconto_plataforma_default: service.desconto_plataforma_default,
        assigned_user_id: service.assigned_user_id || '',
        valor_pago: service.valor_pago || 0
      })
      setSelectedClient(clients.find(c => c.id === service.client_id) || null)
      fetchVisitsForService(service.id)
    } else {
      setEditingService(null)
      setFormData({
        nome_servico: '',
        client_id: '',
        status_pagamento: 'pendente',
        desconto_plataforma_default: 0,
        assigned_user_id: '',
        valor_pago: 0
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
        .select('id, service_id, data, horario, tipo_visita, tipo_encontro, valor, status, desconto_plataforma, client_id, created_at')
        .eq('service_id', serviceId)
        .order('data', { ascending: true })

      if (error) throw error
      
      // Filtrar apenas visitas de serviço (excluir task e pre_encontro)
      const filteredVisits = (data || []).filter(visit => 
        visit.tipo_encontro !== 'task' && visit.tipo_encontro !== 'pre_encontro'
      )
      
      setVisits(filteredVisits)
    } catch (error) {
      console.error('Erro ao buscar visitas:', error)
    }
  }

  const copyWhatsAppMessage = async (service: Service) => {
    try {
      // Buscar as visitas do serviço (apenas visitas de serviço, não tasks ou pré-encontros)
      const { data: visitsData, error } = await supabase
        .from('visits')
        .select('data, tipo_encontro, tipo_visita, status')
        .eq('service_id', service.id)
        .neq('status', 'cancelada')
        .order('data', { ascending: true })

      if (error) throw error

      // Filtrar apenas visitas de serviço (excluir task e pre_encontro)
      const visits = (visitsData || []).filter(visit => 
        visit.tipo_encontro !== 'task' && visit.tipo_encontro !== 'pre_encontro'
      )
      
      // Formatar as datas das visitas com o tipo (meia/inteira)
      const formattedDates = visits.map(visit => {
        const [year, month, day] = visit.data.split('-')
        const tipoVisita = visit.tipo_visita === 'inteira' ? 'Inteira' : 'Meia'
        return `• ${day}/${month}/${year} - ${tipoVisita}`
      }).join('\n')

      // Formatar o valor
      const valorFormatado = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(service.total_a_receber)

      // Criar a mensagem
      const message = `🐾 Resumo do Serviço – Fefelina Cat Sitter 🐾

👤 Cliente: ${service.clients?.nome || 'Não informado'}
📍 Período do serviço:
${formattedDates}

🐱 Total de visitas: ${visits.length} visita${visits.length !== 1 ? 's' : ''}
💰 Valor total a receber: ${valorFormatado}

🔑 Chave PIX:
fefelinacatsitter@gmail.com
(André Thiago Hass | Banco Itaú)

Peço, por gentileza, que valide as datas informadas acima.
Após o pagamento, enviar o comprovante.
Fico à disposição para qualquer ajuste ou dúvida.
Será um prazer cuidar do(s) seu(s) gatinho(s)! 💙🐾`

      // Tentar copiar usando clipboard API moderna
      let copied = false
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(message)
          copied = true
        } catch (clipboardError) {
          console.warn('Clipboard API falhou, tentando fallback:', clipboardError)
        }
      }
      
      // Fallback para dispositivos que não suportam clipboard API (iOS Safari, etc)
      if (!copied) {
        const textArea = document.createElement('textarea')
        textArea.value = message
        
        // iOS Safari precisa que o elemento seja visível e editável
        textArea.style.position = 'absolute'
        textArea.style.left = '0'
        textArea.style.top = '0'
        textArea.style.opacity = '0'
        textArea.style.pointerEvents = 'none'
        textArea.style.width = '1px'
        textArea.style.height = '1px'
        textArea.setAttribute('readonly', '')
        
        document.body.appendChild(textArea)
        
        // iOS Safari requer que o elemento esteja focado
        textArea.focus()
        textArea.setSelectionRange(0, message.length)
        
        try {
          const successful = document.execCommand('copy')
          if (successful) {
            copied = true
          }
        } catch (execError) {
          console.error('execCommand falhou:', execError)
        }
        
        document.body.removeChild(textArea)
      }
      
      if (copied) {
        toast.success('Mensagem copiada! Cole no WhatsApp 📋')
      } else {
        // Se ambos os métodos falharem, mostrar a mensagem para o usuário copiar manualmente
        toast.error('Não foi possível copiar automaticamente. Por favor, copie manualmente.')
      }
    } catch (error) {
      console.error('Erro ao copiar mensagem:', error)
      toast.error('Erro ao copiar mensagem')
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingService(null)
    setFormData({
      nome_servico: '',
      client_id: '',
      status_pagamento: 'pendente',
      desconto_plataforma_default: 0,
      assigned_user_id: '',
      valor_pago: 0
    })
    setVisits([])
    setSelectedClient(null)
  }

  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    setSelectedClient(client || null)
    setFormData({ ...formData, client_id: clientId })
    
    // Recalcular valores das visitas existentes e aplicar desconto padrão
    if (client) {
      const updatedVisits = visits.map(visit => ({
        ...visit,
        valor: calculateVisitValue(client, visit.tipo_visita),
        desconto_plataforma: formData.desconto_plataforma_default
      }))
      setVisits(updatedVisits)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevenir múltiplos envios
    if (editingService ? updating : submitting) {
      toast.error('Aguarde, o serviço está sendo salvo...')
      return
    }

    if (!selectedClient || visits.length === 0) {
      toast.error('Selecione um cliente e adicione pelo menos uma visita')
      return
    }

    // Validar se todas as visitas têm data preenchida
    const visitsWithoutDate = visits.filter(v => !v.data)
    if (visitsWithoutDate.length > 0) {
      toast.error('Todas as visitas devem ter uma data preenchida')
      return
    }

    if (editingService) {
      setUpdating(true)
    } else {
      setSubmitting(true)
    }

    try {
      // Atualizar desconto nas visitas antes de calcular os totais
      const visitsWithUpdatedDiscount = visits.map(visit => ({
        ...visit,
        desconto_plataforma: formData.desconto_plataforma_default
      }))
      
      // Calcular totais com o desconto atualizado
      const totalVisitas = visitsWithUpdatedDiscount.filter(v => v.status !== 'cancelada').length
      const totalValor = visitsWithUpdatedDiscount
        .filter(v => v.status !== 'cancelada')
        .reduce((sum, v) => sum + v.valor, 0)
      const totalAReceber = visitsWithUpdatedDiscount
        .filter(v => v.status !== 'cancelada')
        .reduce((sum, v) => sum + (v.valor * (1 - v.desconto_plataforma / 100)), 0)
      
      // Calcular período baseado nas visitas
      const dates = visits.map(v => v.data).filter(d => d)
      const dataInicio = dates.sort()[0]
      const dataFim = dates.sort().reverse()[0]
      
      // Se status for 'pago', valor_pago = total_a_receber
      const valorPago = formData.status_pagamento === 'pago' 
        ? totalAReceber 
        : formData.valor_pago
      
      // Verificar e aplicar crédito disponível (apenas ao criar novo serviço)
      let creditoUsado = 0
      if (!editingService) {
        const creditoDisponivel = selectedClient?.credito_disponivel || 0
        
        if (creditoDisponivel > 0) {
          creditoUsado = Math.min(creditoDisponivel, totalValor)
          
          // Atualizar saldo do cliente
          const novoSaldo = creditoDisponivel - creditoUsado
          const { error: updateCreditError } = await supabase
            .from('clients')
            .update({ credito_disponivel: novoSaldo })
            .eq('id', formData.client_id)

          if (updateCreditError) throw updateCreditError
        }
      }
      
      let serviceData: any = {
        ...formData,
        data_inicio: dataInicio,
        data_fim: dataFim,
        total_visitas: totalVisitas,
        total_valor: totalValor,
        total_a_receber: totalAReceber,
        valor_pago: valorPago,
        credito_usado: creditoUsado,
        assigned_user_id: formData.assigned_user_id || null // Trigger do banco usa auth.uid() se null
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

      // Inserir visitas com o desconto atualizado
      const visitsToInsert = visits.map(visit => {
        // Remove o ID para permitir que o banco gere novos IDs
        const { id, ...visitWithoutId } = visit
        return {
          ...visitWithoutId,
          service_id: savedService.id,
          client_id: formData.client_id,
          tipo_encontro: 'visita_servico',
          // Atualiza o desconto da plataforma com o valor padrão do serviço
          desconto_plataforma: formData.desconto_plataforma_default
        }
      })
      
      if (visitsToInsert.length > 0) {
        const { error: visitsError } = await supabase
          .from('visits')
          .insert(visitsToInsert)
        
        if (visitsError) throw visitsError
      }

      // Registrar uso de crédito no histórico (apenas ao criar novo serviço)
      if (!editingService && creditoUsado > 0) {
        const creditoDisponivel = selectedClient?.credito_disponivel || 0
        const { error: historyError } = await supabase
          .from('client_credits_history')
          .insert({
            client_id: formData.client_id,
            tipo: 'uso',
            valor: creditoUsado,
            saldo_anterior: creditoDisponivel,
            saldo_novo: creditoDisponivel - creditoUsado,
            descricao: `Crédito usado no serviço ${formData.nome_servico || 'sem nome'}`,
            service_id: savedService.id
          })

        if (historyError) console.error('Erro ao registrar histórico de crédito:', historyError)
      }

      const mensagemSucesso = !editingService && creditoUsado > 0
        ? `Serviço "${formData.nome_servico || 'Sem nome'}" criado! Crédito de ${formatCurrency(creditoUsado)} foi usado. Saldo restante: ${formatCurrency((selectedClient?.credito_disponivel || 0) - creditoUsado)}`
        : editingService 
          ? `Serviço "${formData.nome_servico || 'Sem nome'}" atualizado com ${visits.length} visita(s)!`
          : `Serviço "${formData.nome_servico || 'Sem nome'}" criado com ${visits.length} visita(s)!`

      toast.success(mensagemSucesso, { duration: 5000 })

      await fetchServices()
      closeModal()
    } catch (error: any) {
      console.error('Erro ao salvar serviço:', error)
      toast.error(`Erro ao salvar serviço: ${error.message}`)
    } finally {
      if (editingService) {
        setUpdating(false)
      } else {
        setSubmitting(false)
      }
    }
  }

  const deleteService = async (service: Service) => {
    setShowDeleteConfirm(service)
  }

  const confirmDeleteService = async () => {
    if (!showDeleteConfirm) return

    const service = showDeleteConfirm
    setDeletingService(service.id)
    setShowDeleteConfirm(null)

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', service.id)

      if (error) throw error
      
      toast.success(`Serviço "${service.nome_servico || 'Sem nome'}" excluído com sucesso!`)
      await fetchServices()
    } catch (error: any) {
      console.error('Erro ao excluir serviço:', error)
      toast.error(`Erro ao excluir serviço: ${error.message}`)
    } finally {
      setDeletingService(null)
    }
  }

  const getPaymentStatusBadge = (status_pagamento: string) => {
    const styles = {
      pendente: 'bg-red-100 text-red-800',
      pendente_plataforma: 'bg-yellow-100 text-yellow-800',
      pago_parcialmente: 'bg-blue-100 text-blue-800',
      pago: 'bg-green-100 text-green-800'
    }
    
    const labels = {
      pendente: 'Pendente',
      pendente_plataforma: 'Pendente Plataforma',
      pago_parcialmente: 'Pago Parcialmente',
      pago: 'Pago'
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status_pagamento as keyof typeof styles]}`}>
        {labels[status_pagamento as keyof typeof labels]}
      </span>
    )
  }

  const markServiceAsPaid = async (serviceId: string) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ status_pagamento: 'pago' })
        .eq('id', serviceId)

      if (error) throw error
      
      toast.success('Serviço marcado como pago!')
      await fetchServices()
    } catch (error: any) {
      console.error('Erro ao marcar serviço como pago:', error)
      toast.error(`Erro ao marcar serviço como pago: ${error.message}`)
    }
  }

  // Função para abrir modal de detalhes
  const openDetailsModal = async (service: Service) => {
    setViewingService(service)
    setShowDetailsModal(true)
    setLoadingDetails(true)
    
    try {
      // Buscar visitas do serviço
      const { data: visitsData, error } = await supabase
        .from('visits')
        .select('*')
        .eq('service_id', service.id)
        .order('data', { ascending: true })

      if (error) throw error
      
      // Filtrar apenas visitas de serviço (excluir task e pre_encontro)
      const filteredVisits = (visitsData || []).filter(visit => 
        visit.tipo_encontro !== 'task' && visit.tipo_encontro !== 'pre_encontro'
      )
      
      setViewingVisits(filteredVisits)
    } catch (error: any) {
      console.error('Erro ao buscar visitas do serviço:', error)
      toast.error(`Erro ao buscar detalhes: ${error.message}`)
    } finally {
      setLoadingDetails(false)
    }
  }

  const closeDetailsModal = () => {
    setShowDetailsModal(false)
    setViewingService(null)
    setViewingVisits([])
    setLoadingDetails(false)
  }

  // Funções para menu de contexto mobile
  const handleMobileLongPress = (service: Service) => {
    if (window.innerWidth < 768) {
      setSelectedServiceForMenu(service)
      setShowMobileMenu(true)
    }
  }

  const handleMobilePress = (service: Service) => {
    if (window.innerWidth < 768) {
      const timer = setTimeout(() => {
        handleMobileLongPress(service)
      }, 500) // 500ms para long press
      setLongPressTimer(timer)
    }
  }

  const handleMobileRelease = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  const closeMobileMenu = () => {
    setShowMobileMenu(false)
    setSelectedServiceForMenu(null)
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

  // Função para gerar múltiplas visitas
  const handleGenerateMultipleVisits = () => {
    if (!selectedClient) return;
    if (!multiVisitStartDate || !multiVisitEndDate) {
      toast.error('Informe a data de início e fim para gerar as visitas.')
      return;
    }

    const start = new Date(multiVisitStartDate + 'T00:00:00');
    const end = new Date(multiVisitEndDate + 'T00:00:00');

    if (end < start) {
      toast.error('A data de fim deve ser igual ou posterior à data de início.')
      return;
    }

    const valor = selectedClient
      ? calculateVisitValue(selectedClient, multiVisitTipo)
      : 0;

    const newVisits: Visit[] = [];
    const current = new Date(start);

    while (current <= end) {
      const dateStr = current.toISOString().slice(0, 10);

      if (multiVisitTipo === 'meia') {
        // Meia visita: 2 por dia
        newVisits.push({
          data: dateStr,
          horario: '09:00',
          tipo_visita: 'meia',
          tipo_encontro: 'visita_servico',
          valor,
          status: 'agendada',
          desconto_plataforma: formData.desconto_plataforma_default
        });
        newVisits.push({
          data: dateStr,
          horario: '18:00',
          tipo_visita: 'meia',
          tipo_encontro: 'visita_servico',
          valor,
          status: 'agendada',
          desconto_plataforma: formData.desconto_plataforma_default
        });
      } else {
        // Visita inteira: 1 por dia
        newVisits.push({
          data: dateStr,
          horario: '09:00',
          tipo_visita: 'inteira',
          tipo_encontro: 'visita_servico',
          valor,
          status: 'agendada',
          desconto_plataforma: formData.desconto_plataforma_default
        });
      }

      current.setDate(current.getDate() + 1);
    }

    setVisits(newVisits);
    toast.success(`${newVisits.length} visita(s) gerada(s) com sucesso!`);
  }

  const { totalVisitas, totalValor, totalAReceber } = calculateTotals()

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <CatLoader size="lg" variant="walking" text="Carregando serviços..." />
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
          {canCreateService && (
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
          )}
        </div>
      </div>

      {/* Campo de Pesquisa */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-10 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            placeholder="Buscar por nome do cliente ou serviço..."
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="mt-2 text-sm text-gray-600">
            {totalCount} serviço(s) encontrado(s)
          </p>
        )}
      </div>

      {/* Filtros */}
      <div className="mt-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Filtros por status */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedFilter('ativos')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedFilter === 'ativos'
                  ? 'bg-primary-500 text-ink'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Ativos
            </button>
            <button
              onClick={() => setSelectedFilter('concluidos')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedFilter === 'concluidos'
                  ? 'bg-primary-500 text-ink'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Concluídos
            </button>
            {selectedFilter === 'concluidos' && !showDateFilter && (
              <button
                onClick={() => setShowDateFilter(true)}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 underline decoration-dotted"
              >
                Filtrar por período
              </button>
            )}
          </div>
          
          {/* Filtros por data (opcional, apenas quando "concluidos" estiver selecionado e o usuário abrir) */}
          {selectedFilter === 'concluidos' && showDateFilter && (
            <div className="flex flex-col sm:flex-row gap-2 items-center">
              <span className="text-sm text-gray-600 whitespace-nowrap">Período:</span>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => {
                  const validatedDate = validateDateInput(e.target.value)
                  if (!validatedDate || isValidDate(validatedDate)) {
                    setFilterStartDate(validatedDate)
                  } else {
                    toast.error('Data inválida. Use o formato AAAA-MM-DD com ano entre 1900 e 2100.')
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value && !isValidDate(e.target.value)) {
                    toast.error('Data inválida. Corrigindo automaticamente.')
                    setFilterStartDate('')
                  }
                }}
                min="1900-01-01"
                max="2100-12-31"
                className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Data início"
              />
              <span className="text-sm text-gray-500">até</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => {
                  const validatedDate = validateDateInput(e.target.value)
                  if (!validatedDate || isValidDate(validatedDate)) {
                    setFilterEndDate(validatedDate)
                  } else {
                    toast.error('Data inválida. Use o formato AAAA-MM-DD com ano entre 1900 e 2100.')
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value && !isValidDate(e.target.value)) {
                    toast.error('Data inválida. Corrigindo automaticamente.')
                    setFilterEndDate('')
                  }
                }}
                min="1900-01-01"
                max="2100-12-31"
                className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Data fim"
              />
              <button
                onClick={() => {
                  setFilterStartDate('')
                  setFilterEndDate('')
                  setShowDateFilter(false)
                }}
                className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded"
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>

      {loading && services.length === 0 ? (
        <div className="mt-8 flex justify-center">
          <CatLoader size="md" variant="paws" text="Carregando serviços..." />
        </div>
      ) : totalCount === 0 && !searchQuery ? (
        <div className="mt-8 card-fefelina">
          <div className="empty-state-fefelina">
            <div className="mx-auto h-16 w-16 text-gray-300 mb-4">
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
      ) : totalCount === 0 ? (
        <div className="mt-8 card-fefelina">
          <div className="empty-state-fefelina">
            <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum resultado encontrado</h3>
            <p className="text-gray-500 mb-6">
              Não encontramos serviços que correspondam à sua busca "{searchQuery}".
            </p>
            <button 
              className="btn-fefelina-secondary" 
              onClick={() => setSearchQuery('')}
            >
              Limpar Busca
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile - Cards */}
          <div className="mt-8 md:hidden grid grid-cols-1 gap-3">
            {services.map((service) => (
              <div
                key={service.id}
                className="card-fefelina p-4 cursor-pointer"
                onClick={() => openDetailsModal(service)}
                onTouchStart={() => handleMobilePress(service)}
                onTouchEnd={handleMobileRelease}
                onTouchCancel={handleMobileRelease}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {service.nome_servico || `Serviço para ${service.clients?.nome}`}
                    </h3>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{service.clients?.nome}</p>
                  </div>
                  {getPaymentStatusBadge(service.status_pagamento)}
                </div>

                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span>{formatDate(service.data_inicio)} - {formatDate(service.data_fim)}</span>
                  {service.assigned_user_id && usersMap[service.assigned_user_id] && (
                    <div className="flex items-center gap-1">
                      <Avatar
                        avatarId={usersMap[service.assigned_user_id].avatar_url}
                        name={usersMap[service.assigned_user_id].full_name}
                        size="xs"
                        className="border border-gray-200"
                      />
                      <span className="truncate max-w-[90px]">{usersMap[service.assigned_user_id].full_name}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100 text-center">
                  <div>
                    <div className="text-[11px] text-gray-500">Visitas</div>
                    <div className="font-semibold text-gray-900 text-sm">{service.total_visitas}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500">Total</div>
                    <div className="font-semibold text-gray-900 text-sm">{maskField('total_valor', formatCurrency(service.total_valor))}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500">A Receber</div>
                    <div className="font-semibold text-gray-900 text-sm">{maskField('total_a_receber', formatCurrency(service.total_a_receber))}</div>
                  </div>
                </div>

                {(canUpdateService || service.status_pagamento !== 'pago') && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    {canUpdateService && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openModal(service)
                        }}
                        className="flex-1 inline-flex items-center justify-center px-2 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Editar
                      </button>
                    )}
                    {service.status_pagamento !== 'pago' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          markServiceAsPaid(service.id)
                        }}
                        className="flex-1 inline-flex items-center justify-center px-2 py-1.5 border border-green-300 text-xs font-medium rounded text-green-700 bg-white hover:bg-green-50 transition-colors"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Marcar Pago
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-center mt-2 text-[11px] text-gray-400">
                  Mantenha pressionado para mais ações
                </div>
              </div>
            ))}
          </div>

          {/* Desktop - Tabela */}
          <div className="mt-8 hidden md:block overflow-visible shadow-sm ring-1 ring-black ring-opacity-5 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortableTh label="Serviço" column="nome_servico" sortColumn={sortColumn} sortDirection={sortDirection} onSort={toggleSort} />
                  <SortableTh label="Período" column="data_inicio" sortColumn={sortColumn} sortDirection={sortDirection} onSort={toggleSort} />
                  <SortableTh label="Visitas" column="total_visitas" sortColumn={sortColumn} sortDirection={sortDirection} onSort={toggleSort} align="center" />
                  <SortableTh label="Total" column="total_valor" sortColumn={sortColumn} sortDirection={sortDirection} onSort={toggleSort} align="right" />
                  <SortableTh label="Status" column="status_pagamento" sortColumn={sortColumn} sortDirection={sortDirection} onSort={toggleSort} />
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {services.map((service) => (
                  <tr
                    key={service.id}
                    onClick={() => openDetailsModal(service)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 max-w-[220px]">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {service.nome_servico || `Serviço para ${service.clients?.nome}`}
                      </div>
                      <div className="text-xs text-gray-500 truncate">{service.clients?.nome}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {formatDate(service.data_inicio)} - {formatDate(service.data_fim)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900">{service.total_visitas}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {maskField('total_valor', formatCurrency(service.total_valor))}
                    </td>
                    <td className="px-4 py-3">{getPaymentStatusBadge(service.status_pagamento)}</td>
                    <td className="px-4 py-3 text-right relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenActionsMenuId(prev => (prev === service.id ? null : service.id))
                        }}
                        title="Ações"
                        className="inline-flex items-center justify-center w-7 h-7 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openActionsMenuId === service.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-4 top-full mt-1 z-20 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 py-1 text-left"
                        >
                          <button
                            onClick={() => {
                              setOpenActionsMenuId(null)
                              openDetailsModal(service)
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Eye className="w-4 h-4 text-gray-400" />
                            Visualizar serviço
                          </button>
                          {canUpdateService && (
                            <button
                              onClick={() => {
                                setOpenActionsMenuId(null)
                                openModal(service)
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Pencil className="w-4 h-4 text-gray-400" />
                              Editar
                            </button>
                          )}
                          {service.status_pagamento !== 'pago' && (
                            <button
                              onClick={() => {
                                setOpenActionsMenuId(null)
                                markServiceAsPaid(service.id)
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <CheckCircle2 className="w-4 h-4 text-gray-400" />
                              Marcar como pago
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <PaginationControls
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={setPage}
        loading={loading}
      />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto pt-16 md:pt-0">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeModal}></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex justify-between items-center">
                <h3 className="text-base leading-6 font-medium text-gray-900">
                  {editingService ? 'Editar Serviço' : 'Novo Serviço'}
                </h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Nome do Serviço
                    </label>
                    <input
                      type="text"
                      value={formData.nome_servico}
                      onChange={(e) => setFormData({ ...formData, nome_servico: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                      placeholder="Opcional"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Cliente *
                    </label>
                    <ClientCombobox
                      clients={clients}
                      value={formData.client_id}
                      onChange={handleClientChange}
                      placeholder="Digite para buscar cliente..."
                      required={true}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Responsável
                    </label>
                    <select
                      value={formData.assigned_user_id || userProfile?.user_id || ''}
                      onChange={(e) => setFormData({ ...formData, assigned_user_id: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                      disabled={!formData.client_id}
                    >
                      {!formData.client_id && (
                        <option value="">Selecione um cliente primeiro</option>
                      )}
                      {userProfile && filteredUsers.find(u => u.id === userProfile.user_id) && (
                        <option value={userProfile.user_id}>
                          {userProfile.full_name} (Você)
                        </option>
                      )}
                      {filteredUsers.filter(u => u.id !== userProfile?.user_id).map(user => (
                        <option key={user.id} value={user.id}>
                          {user.full_name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.client_id ? (
                        filteredUsers.length < users.length ? (
                          <span className="text-amber-600">
                            ⚠️ Mostrando apenas parceiros com acesso a este cliente
                          </span>
                        ) : (
                          'Parceiro responsável pelas visitas'
                        )
                      ) : (
                        'Selecione um cliente para escolher o responsável'
                      )}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Status de Pagamento
                    </label>
                    <select
                      value={formData.status_pagamento}
                      onChange={(e) => setFormData({ ...formData, status_pagamento: e.target.value as any })}
                      className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="pendente">Pendente</option>
                      <option value="pendente_plataforma">Pendente Plataforma</option>
                      <option value="pago_parcialmente">Pago Parcialmente</option>
                      <option value="pago">Pago</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Desconto Plataforma Padrão (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.desconto_plataforma_default}
                      onChange={(e) => setFormData({ ...formData, desconto_plataforma_default: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                      placeholder="0"
                    />
                  </div>

                  {/* Campo Valor Pago - visível apenas quando status = pago_parcialmente */}
                  {formData.status_pagamento === 'pago_parcialmente' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Valor Pago (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.valor_pago}
                        onChange={(e) => setFormData({ ...formData, valor_pago: parseFloat(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Valor já pago pelo cliente
                      </p>
                    </div>
                  )}

                  <div className="md:col-span-2 bg-gray-50 border border-gray-200 p-2.5 rounded-lg">
                    <h5 className="text-xs font-medium text-gray-700 mb-1.5">ℹ️ Informações automáticas</h5>
                    <ul className="text-xs text-gray-600 space-y-0.5">
                      <li>• <strong>Período:</strong> Calculado baseado na primeira e última visita</li>
                      <li>• <strong>Totais:</strong> Calculados baseado nas visitas cadastradas</li>
                    </ul>
                  </div>
                </div>

                {/* Seção de Visitas */}
                <div className="border-t pt-3">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-3 gap-2">
                    <h4 className="text-sm font-medium text-gray-900">Visitas</h4>
                    <div className="flex flex-col sm:flex-row gap-1.5">
                      <button
                        type="button"
                        onClick={addVisit}
                        disabled={!selectedClient}
                        className="inline-flex items-center px-2.5 py-1.5 shadow-sm text-xs font-medium rounded text-ink bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Adicionar Visita
                      </button>
                      {/* Botão e inputs para gerar múltiplas visitas por período */}
                      <div className="flex flex-col sm:flex-row gap-1.5 items-start sm:items-center">
                        <select
                          value={multiVisitTipo}
                          onChange={e => setMultiVisitTipo(e.target.value as 'inteira' | 'meia')}
                          disabled={!selectedClient}
                          className="border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                        >
                          <option value="inteira">Inteira</option>
                          <option value="meia">Meia</option>
                        </select>
                        <input
                          type="date"
                          min="1900-01-01"
                          max="2100-12-31"
                          className="border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                          value={multiVisitStartDate}
                          onChange={e => setMultiVisitStartDate(e.target.value)}
                          disabled={!selectedClient}
                          placeholder="Data início"
                        />
                        <span className="text-xs text-gray-500">até</span>
                        <input
                          type="date"
                          min="1900-01-01"
                          max="2100-12-31"
                          className="border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                          value={multiVisitEndDate}
                          onChange={e => setMultiVisitEndDate(e.target.value)}
                          disabled={!selectedClient}
                          placeholder="Data fim"
                        />
                        <button
                          type="button"
                          onClick={handleGenerateMultipleVisits}
                          disabled={!selectedClient || !multiVisitStartDate || !multiVisitEndDate}
                          className="inline-flex items-center px-2.5 py-1.5 shadow-sm text-xs font-medium rounded text-ink bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap transition-colors"
                        >
                          Gerar Visitas
                        </button>
                      </div>
                    </div>
                  </div>

                  {visits.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 text-sm">
                      Nenhuma visita adicionada. Clique em "Adicionar Visita" para começar.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {visits.map((visit, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-2.5">
                          <div className="grid grid-cols-2 md:grid-cols-12 gap-2">
                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Data *
                              </label>
                              <input
                                type="date"
                                value={visit.data}
                                onChange={(e) => {
                                  const validatedDate = validateDateInput(e.target.value)
                                  if (!validatedDate || isValidDate(validatedDate)) {
                                    updateVisit(index, 'data', validatedDate)
                                  } else {
                                    toast.error('Data inválida. Use o formato AAAA-MM-DD com ano entre 1900 e 2100.')
                                  }
                                }}
                                onBlur={(e) => {
                                  if (e.target.value && !isValidDate(e.target.value)) {
                                    toast.error('Data inválida. Corrigindo automaticamente.')
                                    updateVisit(index, 'data', '')
                                  }
                                }}
                                min="1900-01-01"
                                max="2100-12-31"
                                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                                required
                              />
                            </div>

                            <div className="md:col-span-2">
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

                            <div className="md:col-span-2">
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

                            <div className="md:col-span-2">
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

                            <div className="md:col-span-3">
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

                            <div className="md:col-span-1 flex items-end justify-center">
                              <button
                                type="button"
                                onClick={() => removeVisit(index)}
                                className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1.5 rounded transition-colors"
                                title="Remover visita"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Resumo dos Totais */}
                {visits.length > 0 && (
                  <div className="border-t pt-3 space-y-3">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5">
                      <h5 className="text-xs font-medium text-gray-900 mb-2">Resumo do Serviço</h5>
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-gray-600">Visitas:</span>
                          <span className="font-semibold ml-1">{totalVisitas}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Total:</span>
                          <span className="font-semibold ml-1">{formatCurrency(totalValor)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">A Receber:</span>
                          <span className="font-semibold ml-1 text-gray-900">{formatCurrency(totalAReceber)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card de Crédito Disponível */}
                    {(() => {
                      const creditoDisponivel = selectedClient?.credito_disponivel || 0
                      const creditoAUsar = Math.min(creditoDisponivel, totalValor)
                      const saldoRestante = creditoDisponivel - creditoAUsar
                      const valorFinal = totalValor - creditoAUsar

                      return !editingService && creditoDisponivel > 0 ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <div className="flex-shrink-0 p-1.5 bg-green-600 rounded-lg">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <h5 className="text-xs font-bold text-green-900 mb-1.5">💰 Crédito Disponível</h5>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-gray-700">Saldo atual:</span>
                                  <span className="font-semibold text-green-700">{formatCurrency(creditoDisponivel)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-700">Será usado:</span>
                                  <span className="font-bold text-green-800">{formatCurrency(creditoAUsar)}</span>
                                </div>
                                <div className="flex justify-between pt-1 border-t border-green-200">
                                  <span className="text-gray-700">Saldo após:</span>
                                  <span className="font-semibold text-green-700">{formatCurrency(saldoRestante)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-1 mt-1 border-t-2 border-green-300">
                                  <span className="font-medium text-gray-900">Valor final:</span>
                                  <span className="text-sm font-bold text-gray-900">{formatCurrency(valorFinal)}</span>
                                </div>
                              </div>
                              {creditoAUsar > 0 && (
                                <div className="mt-2 p-1.5 bg-green-100 border border-green-300 rounded text-[10px] text-green-800">
                                  ✅ Crédito aplicado automaticamente
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : null
                    })()}
                  </div>
                )}

                {/* Botões do Modal */}
                <div className="flex justify-end space-x-2 pt-3 border-t px-6 pb-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={editingService ? updating : submitting}
                    className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-ink rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {(editingService ? updating : submitting) ? (
                      <>
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-ink"></div>
                        Salvando...
                      </>
                    ) : (
                      editingService ? 'Atualizar' : 'Criar Serviço'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center pt-16 md:pt-0">
          <div className="relative mx-auto p-6 border w-full max-w-md shadow-fefelina-hover rounded-2xl bg-white">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Confirmar Exclusão
              </h3>
              
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4">
                  Tem certeza que deseja excluir o serviço <strong>"{showDeleteConfirm.nome_servico || 'Sem nome'}"</strong>?
                </p>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-left">
                  <p className="text-sm font-medium text-red-800 mb-2">⚠️ ATENÇÃO: Esta ação irá excluir também:</p>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• Todas as {showDeleteConfirm.total_visitas} visitas do serviço</li>
                    <li>• Todos os registros de pagamento</li>
                  </ul>
                  <p className="text-sm font-medium text-red-800 mt-2">Esta ação não pode ser desfeita.</p>
                </div>
              </div>
              
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteService}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Serviço */}
      {showDetailsModal && viewingService && (
        <div className="fixed inset-0 z-50 overflow-y-auto pt-16 md:pt-0">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeDetailsModal}></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex justify-between items-center">
                <div>
                  <h3 className="text-base leading-6 font-medium text-gray-900">
                    Detalhes do Serviço
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Visualização completa do serviço e suas visitas
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyWhatsAppMessage(viewingService)}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-white border border-green-300 rounded hover:bg-green-50 transition-colors"
                    title="Copiar mensagem para WhatsApp"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    WhatsApp
                  </button>
                  <button onClick={closeDetailsModal} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="px-6 py-4 space-y-4">
                {/* Informações Básicas do Serviço */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Informações do Serviço</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Nome do Serviço</label>
                      <div className="mt-0.5 text-sm text-gray-900">
                        {viewingService.nome_servico || 'Não informado'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Cliente</label>
                      <div className="mt-0.5 text-sm text-gray-900">
                        {viewingService.clients?.nome || 'Cliente não encontrado'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Status de Pagamento</label>
                      <div className="mt-0.5">
                        {getPaymentStatusBadge(viewingService.status_pagamento)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Desconto Plataforma Padrão</label>
                      <div className="mt-0.5 text-sm text-gray-900">
                        {viewingService.desconto_plataforma_default}%
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Período do Serviço</label>
                      <div className="mt-0.5 text-sm text-gray-900">
                        {formatDate(viewingService.data_inicio)} - {formatDate(viewingService.data_fim)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Data de Criação</label>
                      <div className="mt-0.5 text-sm text-gray-900">
                        {formatDate(viewingService.created_at.split('T')[0])}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resumo Financeiro */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Resumo Financeiro</h4>
                  <div className={`grid grid-cols-1 ${viewingService.status_pagamento === 'pago_parcialmente' ? 'md:grid-cols-5' : 'md:grid-cols-3'} gap-3`}>
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900">
                        {viewingVisits.filter(v => v.status !== 'cancelada').length}
                      </div>
                      <div className="text-xs text-gray-600">Total de Visitas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900">{maskField('total_valor', formatCurrency(viewingService.total_valor))}</div>
                      <div className="text-xs text-gray-600">Valor Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900">{maskField('total_a_receber', formatCurrency(viewingService.total_a_receber))}</div>
                      <div className="text-xs text-gray-600">Valor a Receber</div>
                    </div>
                    
                    {/* Campos extras para Pago Parcialmente */}
                    {viewingService.status_pagamento === 'pago_parcialmente' && (
                      <>
                        <div className="text-center">
                          <div className="text-xl font-bold text-green-600">
                            {maskField('valor_pago', formatCurrency(viewingService.valor_pago || 0))}
                          </div>
                          <div className="text-xs text-gray-600">Valor Pago</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-gray-900">
                            {maskField('saldo_restante', formatCurrency(viewingService.total_a_receber - (viewingService.valor_pago || 0)))}
                          </div>
                          <div className="text-xs text-gray-600">Saldo Restante</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Lista de Visitas */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Visitas do Serviço</h4>
                  
                  {loadingDetails ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                  ) : viewingVisits.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      Nenhuma visita encontrada para este serviço.
                    </div>
                  ) : (
                    <>
                      {/* Versão Desktop - Tabela Compacta */}
                      <div className="hidden md:block overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-300">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Data/Horário
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tipo
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Valor
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Desconto
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {viewingVisits.map((visit, index) => (
                              <tr key={visit.id || index} className="hover:bg-gray-50">
                                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                                  <div>
                                    <div className="font-medium">{formatDate(visit.data)}</div>
                                    <div className="text-gray-500">{visit.horario}</div>
                                  </div>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    visit.tipo_visita === 'inteira' 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : 'bg-purple-100 text-purple-800'
                                  }`}>
                                    {visit.tipo_visita === 'inteira' ? 'Inteira' : 'Meia'}
                                  </span>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                                  {maskVisitField('valor', formatCurrency(visit.valor))}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                                  {maskVisitField('desconto_plataforma', `${visit.desconto_plataforma}%`)}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    visit.status === 'realizada' 
                                      ? 'bg-green-100 text-green-800'
                                      : visit.status === 'agendada'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {visit.status === 'realizada' ? 'Realizada' : 
                                     visit.status === 'agendada' ? 'Agendada' : 'Cancelada'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Versão Mobile - Cards Compactos */}
                      <div className="md:hidden space-y-2">
                        {viewingVisits.map((visit, index) => (
                          <div key={visit.id || index} className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-sm">
                            {/* Layout horizontal compacto */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                              {/* Data e horário */}
                              <div className="flex items-center gap-2 min-w-0">
                                <div>
                                  <div className="text-xs font-medium text-gray-900">{formatDate(visit.data)}</div>
                                  <div className="text-xs text-gray-500">{visit.horario}</div>
                                </div>
                              </div>
                              
                              {/* Badges de tipo e status */}
                              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  visit.status === 'realizada' 
                                    ? 'bg-green-100 text-green-800'
                                    : visit.status === 'agendada'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {visit.status === 'realizada' ? 'Realizada' : 
                                   visit.status === 'agendada' ? 'Agendada' : 'Cancelada'}
                                </span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  visit.tipo_visita === 'inteira' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {visit.tipo_visita === 'inteira' ? 'Inteira' : 'Meia'}
                                </span>
                              </div>
                            </div>

                            {/* Linha inferior: Valor e Desconto */}
                            <div className="flex items-center justify-between text-xs border-t border-gray-100 pt-2">
                              <div className="flex items-center gap-3">
                                <div>
                                  <span className="text-gray-500">Valor:</span>
                                  <span className="ml-1 font-medium text-gray-900">{maskVisitField('valor', formatCurrency(visit.valor))}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Desc:</span>
                                  <span className="ml-1 font-medium text-gray-900">{maskVisitField('desconto_plataforma', `${visit.desconto_plataforma}%`)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Botões de Ação */}
                <div className="flex justify-between items-center pt-4 border-t px-6 pb-4">
                  {/* Botão Excluir - Canto Esquerdo */}
                  {canDeleteService && (
                    <button
                      type="button"
                      onClick={() => {
                        closeDetailsModal()
                        deleteService(viewingService)
                      }}
                      disabled={deletingService === viewingService.id}
                      className={`inline-flex items-center px-3 py-1.5 border border-red-200 rounded-md text-sm font-medium transition-colors ${
                        deletingService === viewingService.id
                          ? 'text-red-400 bg-red-50 cursor-not-allowed'
                          : 'text-red-600 bg-transparent hover:bg-red-50 hover:border-red-300'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      {deletingService === viewingService.id ? 'Excluindo...' : 'Excluir'}
                    </button>
                  )}

                  {/* Botões principais - Canto Direito */}
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={closeDetailsModal}
                      className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Fechar
                    </button>
                    {canUpdateService && (
                      <button
                        type="button"
                        onClick={() => {
                          closeDetailsModal()
                          openModal(viewingService)
                        }}
                        className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-ink rounded-md text-sm font-medium transition-colors"
                      >
                        Editar Serviço
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menu de Contexto Mobile */}
      {showMobileMenu && selectedServiceForMenu && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-end justify-center md:hidden">
          <div className="relative mx-auto p-6 border w-full max-w-sm shadow-fefelina-hover rounded-t-2xl bg-white">
            <div className="text-center">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Ações do Serviço
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedServiceForMenu.nome_servico || `Serviço para ${selectedServiceForMenu.clients?.nome}`}
                </p>
              </div>
              
              <div className="space-y-3">
                {canUpdateService && (
                  <button
                    onClick={() => {
                      closeMobileMenu()
                      openModal(selectedServiceForMenu)
                    }}
                    className="w-full inline-flex items-center justify-center px-4 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Editar Serviço
                  </button>
                )}

                {selectedServiceForMenu.status_pagamento !== 'pago' && (
                  <button
                    onClick={() => {
                      closeMobileMenu()
                      markServiceAsPaid(selectedServiceForMenu.id)
                    }}
                    className="w-full inline-flex items-center justify-center px-4 py-3 border border-green-300 shadow-sm text-sm font-medium rounded-md text-green-700 bg-white hover:bg-green-50"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Marcar como Pago
                  </button>
                )}

                <button
                  onClick={() => {
                    closeMobileMenu()
                    deleteService(selectedServiceForMenu)
                  }}
                  className="w-full inline-flex items-center justify-center px-4 py-3 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Excluir Serviço
                </button>

                <button
                  onClick={closeMobileMenu}
                  className="w-full px-4 py-3 text-sm font-medium text-gray-500 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
