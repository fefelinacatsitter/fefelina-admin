import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import CatLoader from '../components/CatLoader'
import ShareClientModal from '../components/ShareClientModal'
import { SharedWithList } from '../components/SharedWithList'
import ClientCredits from '../components/ClientCredits'
import { usePermissions } from '../contexts/PermissionsContext'
import { useFieldMask } from '../hooks/useFieldMask'
import { Share2, Users } from 'lucide-react'

interface Client {
  id: string
  nome: string
  valor_diaria: number
  valor_duas_visitas: number
  endereco_completo: string
  veterinario_confianca: string
  observacoes?: string
  telefone?: string
  email?: string
  tags?: string[] | null
  notas?: string | null
  credito_disponivel?: number
  created_at: string
  updated_at: string
}

interface Pet {
  id: string
  client_id: string
  nome: string
  caracteristica: string
  observacoes: string
  created_at: string
}

interface Service {
  id: string
  client_id: string
  nome_servico?: string
  data_inicio: string
  data_fim: string
  status_pagamento: 'pendente' | 'pendente_plataforma' | 'pago_parcialmente' | 'pago'
  desconto_plataforma_default: number
  total_visitas: number
  total_valor: number
  total_a_receber: number
  created_at: string
}

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
}

interface MonthlyStats {
  month: string
  count: number
  revenue: number
}

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { userProfile, canUpdate, canDelete } = usePermissions()
  
  // Verificar se é admin - somente admin pode acessar esta página
  useEffect(() => {
    if (userProfile && userProfile.profile?.name !== 'Administrador') {
      toast.error('Acesso negado. Esta página é restrita a administradores.')
      navigate('/clients')
    }
  }, [userProfile, navigate])
  
  const [client, setClient] = useState<Client | null>(null)
  const [pets, setPets] = useState<Pet[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  
  // Verificar permissões de clientes
  const canUpdateClient = canUpdate('clients')
  const canDeleteClient = canDelete('clients')
  
  // Field-Level Security (FLS)
  const { maskField: maskClientField, shouldShowField } = useFieldMask('clients')
  const { maskField: maskServiceField } = useFieldMask('services')
  
  // Estados para compartilhamento
  const [showShareModal, setShowShareModal] = useState(false)
  const [showSharedWithModal, setShowSharedWithModal] = useState(false)
  
  // Estados para notas
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  
  // Estados para tags
  const [showTagsModal, setShowTagsModal] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [savingTags, setSavingTags] = useState(false)
  
  // Estados para edição de cliente
  const [showEditForm, setShowEditForm] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    valor_diaria: '',
    valor_duas_visitas: '',
    endereco_completo: '',
    veterinario_confianca: ''
  })
  const [updating, setUpdating] = useState(false)
  
  // Estados para modal de Pet
  const [showPetModal, setShowPetModal] = useState(false)
  const [petFormData, setPetFormData] = useState({
    nome: '',
    caracteristica: '',
    observacoes: '',
    client_id: id || ''
  })
  const [submittingPet, setSubmittingPet] = useState(false)
  
  // Estados para modal de Serviço
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [serviceFormData, setServiceFormData] = useState({
    nome_servico: '',
    client_id: id || '',
    status_pagamento: 'pendente' as 'pendente' | 'pendente_plataforma' | 'pago_parcialmente' | 'pago',
    desconto_plataforma_default: 0
  })
  const [serviceVisits, setServiceVisits] = useState<Visit[]>([])
  const [submittingService, setSubmittingService] = useState(false)
  
  // Estados para exclusão
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // Métricas globais para comparação
  const [globalAverageRevenue, setGlobalAverageRevenue] = useState(0)
  const [globalAverageServices, setGlobalAverageServices] = useState(0)
  
  // Métricas
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalPaid, setTotalPaid] = useState(0)
  const [totalToReceive, setTotalToReceive] = useState(0)
  const [totalServices, setTotalServices] = useState(0)
  const [totalVisits, setTotalVisits] = useState(0)
  const [averageServiceValue, setAverageServiceValue] = useState(0)
  const [clientSince, setClientSince] = useState('')
  const [relationshipScore, setRelationshipScore] = useState(0)
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])
  const [peakMonth, setPeakMonth] = useState('')
  const [lastServiceDate, setLastServiceDate] = useState('')

  useEffect(() => {
    if (id) {
      fetchClientData()
      fetchGlobalMetrics()
    }
  }, [id])

  const fetchClientData = async () => {
    try {
      setLoading(true)

      // Buscar dados do cliente
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single()

      if (clientError) throw clientError
      setClient(clientData)

      // Buscar pets
      const { data: petsData, error: petsError } = await supabase
        .from('pets')
        .select('*')
        .eq('client_id', id)
        .order('created_at', { ascending: false })

      if (petsError) throw petsError
      setPets(petsData || [])

      // Buscar serviços
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('client_id', id)
        .order('data_inicio', { ascending: false })

      if (servicesError) throw servicesError
      setServices(servicesData || [])

      // Buscar visitas apenas dos serviços existentes
      let visitsData: Visit[] = []
      if (servicesData && servicesData.length > 0) {
        const serviceIds = servicesData.map(s => s.id)
        const { data, error: visitsError } = await supabase
          .from('visits')
          .select('*')
          .in('service_id', serviceIds)
          .order('data', { ascending: false })

        if (visitsError) throw visitsError
        visitsData = data || []
      }
      
      setVisits(visitsData)

      // Inicializar notas e tags
      setNotes(clientData.notas || '')
      setSelectedTags(clientData.tags || [])

      // Calcular métricas
      calculateMetrics(clientData, servicesData || [], visitsData || [])
    } catch (error: any) {
      console.error('Erro ao buscar dados do cliente:', error)
      toast.error('Erro ao carregar informações do cliente')
    } finally {
      setLoading(false)
    }
  }

  const fetchGlobalMetrics = async () => {
    try {
      // Buscar todos os serviços para calcular médias globais
      const { data: allServices, error } = await supabase
        .from('services')
        .select('total_valor, client_id')

      if (error) throw error

      if (allServices && allServices.length > 0) {
        // Agrupar por cliente
        const clientRevenues = new Map<string, number>()
        const clientServicesCount = new Map<string, number>()

        allServices.forEach(service => {
          const currentRevenue = clientRevenues.get(service.client_id) || 0
          clientRevenues.set(service.client_id, currentRevenue + service.total_valor)

          const currentCount = clientServicesCount.get(service.client_id) || 0
          clientServicesCount.set(service.client_id, currentCount + 1)
        })

        // Calcular médias
        const totalClients = clientRevenues.size
        const totalRevenue = Array.from(clientRevenues.values()).reduce((sum, val) => sum + val, 0)
        const totalServices = allServices.length

        setGlobalAverageRevenue(totalRevenue / totalClients)
        setGlobalAverageServices(totalServices / totalClients)
      }
    } catch (error) {
      console.error('Erro ao buscar métricas globais:', error)
    }
  }

  const saveNotes = async () => {
    if (!client) return

    setSavingNotes(true)
    try {
      const { error } = await supabase
        .from('clients')
        .update({ notas: notes })
        .eq('id', client.id)

      if (error) throw error

      setClient({ ...client, notas: notes })
      toast.success('Notas salvas com sucesso!')
      setShowNotesModal(false)
    } catch (error: any) {
      console.error('Erro ao salvar notas:', error)
      toast.error('Erro ao salvar notas')
    } finally {
      setSavingNotes(false)
    }
  }

  const saveTags = async () => {
    if (!client) return

    setSavingTags(true)
    try {
      const { error } = await supabase
        .from('clients')
        .update({ tags: selectedTags })
        .eq('id', client.id)

      if (error) throw error

      setClient({ ...client, tags: selectedTags })
      toast.success('Tags atualizadas com sucesso!')
      setShowTagsModal(false)
    } catch (error: any) {
      console.error('Erro ao salvar tags:', error)
      toast.error('Erro ao salvar tags')
    } finally {
      setSavingTags(false)
    }
  }

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag))
    } else {
      setSelectedTags([...selectedTags, tag])
    }
  }

  const openWhatsApp = () => {
    if (!client?.telefone) {
      toast.error('Telefone não cadastrado para este cliente')
      return
    }
    
    // Remove todos os caracteres não numéricos (incluindo +, parênteses, hífens)
    const phone = client.telefone.replace(/\D/g, '')
    
    // Valida se tem números suficientes (mínimo 10 dígitos: DDD + número)
    if (phone.length < 10) {
      toast.error('Telefone inválido ou incompleto')
      return
    }
    
    const message = encodeURIComponent(`Olá ${client.nome}! Tudo bem? 😊`)
    
    // O phone já contém o código do país (55) se foi inserido com a máscara
    // wa.me espera apenas números: https://wa.me/5547999887766
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank')
  }

  const sendEmail = () => {
    if (!client?.email) {
      toast.error('Email não cadastrado para este cliente')
      return
    }
    
    const subject = encodeURIComponent('Fefelina Cat Sitter')
    const body = encodeURIComponent(`Olá ${client.nome},\n\n`)
    window.open(`mailto:${client.email}?subject=${subject}&body=${body}`, '_blank')
  }

  const calculateMetrics = (client: Client, services: Service[], visits: Visit[]) => {
    // Total de receita (todos os serviços)
    const revenue = services.reduce((sum, service) => sum + service.total_valor, 0)
    setTotalRevenue(revenue)

    // Total já pago (serviços com status 'pago')
    const paid = services
      .filter(service => service.status_pagamento === 'pago')
      .reduce((sum, service) => sum + service.total_a_receber, 0)
    setTotalPaid(paid)

    // Total a receber (apenas serviços não pagos completamente)
    const toReceive = services
      .filter(service => service.status_pagamento !== 'pago')
      .reduce((sum, service) => sum + service.total_a_receber, 0)
    setTotalToReceive(toReceive)

    // Total de serviços
    setTotalServices(services.length)

    // Total de visitas
    const completedVisits = visits.filter(v => v.status === 'realizada').length
    setTotalVisits(completedVisits)

    // Média de valor por serviço
    const avgValue = services.length > 0 ? revenue / services.length : 0
    setAverageServiceValue(avgValue)

    // Cliente desde
    const since = new Date(client.created_at)
    setClientSince(since.toLocaleDateString('pt-BR'))

    // Última contratação
    if (services.length > 0) {
      const lastService = services[0] // Já ordenado por data_inicio desc
      setLastServiceDate(new Date(lastService.data_inicio).toLocaleDateString('pt-BR'))
    }

    // Score de relacionamento (0-100)
    let score = 0
    
    // Pontos por serviços (até 30 pontos)
    score += Math.min(services.length * 3, 30)
    
    // Pontos por visitas (até 25 pontos)
    score += Math.min(completedVisits * 2, 25)
    
    // Pontos por valor total (até 25 pontos)
    score += Math.min(Math.floor(revenue / 500), 25)
    
    // Pontos por recência (até 20 pontos)
    if (services.length > 0) {
      const daysSinceLastService = Math.floor(
        (Date.now() - new Date(services[0].data_inicio).getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysSinceLastService < 30) score += 20
      else if (daysSinceLastService < 60) score += 15
      else if (daysSinceLastService < 90) score += 10
      else if (daysSinceLastService < 180) score += 5
    }
    
    setRelationshipScore(Math.min(score, 100))

    // Estatísticas mensais
    const monthlyMap = new Map<string, { count: number; revenue: number }>()
    
    services.forEach(service => {
      const date = new Date(service.data_inicio)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { count: 0, revenue: 0 })
      }
      
      const stats = monthlyMap.get(monthKey)!
      stats.count += 1
      stats.revenue += service.total_valor
    })

    // Converter para array e ordenar
    const monthlyArray: MonthlyStats[] = Array.from(monthlyMap.entries())
      .map(([key, value]) => {
        const [year, month] = key.split('-')
        const date = new Date(parseInt(year), parseInt(month) - 1)
        return {
          month: date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
          count: value.count,
          revenue: value.revenue
        }
      })
      .sort((a, b) => {
        // Ordenar por data (mais recente primeiro)
        const dateA = new Date(a.month)
        const dateB = new Date(b.month)
        return dateB.getTime() - dateA.getTime()
      })
      .slice(0, 12) // Últimos 12 meses

    setMonthlyStats(monthlyArray)

    // Identificar mês de pico
    if (monthlyArray.length > 0) {
      const peak = monthlyArray.reduce((max, current) => 
        current.count > max.count ? current : max
      )
      setPeakMonth(peak.month)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  // Função para formatar telefone brasileiro
  const formatPhone = (value: string): string => {
    const numbers = value.replace(/\D/g, '')
    
    // Se não tem números, retorna vazio (não deixa o + sozinho)
    if (numbers.length === 0) {
      return ''
    }
    
    const limited = numbers.slice(0, 13)
    
    if (limited.length <= 2) {
      return `+${limited}`
    } else if (limited.length <= 4) {
      return `+${limited.slice(0, 2)}(${limited.slice(2)}`
    } else if (limited.length <= 9) {
      return `+${limited.slice(0, 2)}(${limited.slice(2, 4)})${limited.slice(4)}`
    } else {
      const phone = limited.slice(4)
      if (phone.length <= 4) {
        return `+${limited.slice(0, 2)}(${limited.slice(2, 4)})${phone}`
      } else {
        const separator = phone.length === 9 ? 5 : 4
        return `+${limited.slice(0, 2)}(${limited.slice(2, 4)})${phone.slice(0, separator)}-${phone.slice(separator)}`
      }
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    if (name === 'telefone') {
      setFormData({
        ...formData,
        [name]: formatPhone(value)
      })
    } else {
      setFormData({
        ...formData,
        [name]: value
      })
    }
  }

  const openEditForm = () => {
    if (!client) return
    
    // Verificar se usuário tem permissão de update
    if (!canUpdateClient) {
      toast.error('Você não tem permissão para editar clientes')
      return
    }
    
    setFormData({
      nome: client.nome,
      telefone: client.telefone || '',
      valor_diaria: client.valor_diaria.toString(),
      valor_duas_visitas: client.valor_duas_visitas.toString(),
      endereco_completo: client.endereco_completo,
      veterinario_confianca: client.veterinario_confianca
    })
    setShowEditForm(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!client) return

    if (updating) {
      toast.error('Aguarde, as alterações estão sendo salvas...')
      return
    }

    setUpdating(true)

    try {
      const { error } = await supabase
        .from('clients')
        .update({
          nome: formData.nome,
          telefone: formData.telefone || null,
          valor_diaria: parseFloat(formData.valor_diaria),
          valor_duas_visitas: parseFloat(formData.valor_duas_visitas),
          endereco_completo: formData.endereco_completo,
          veterinario_confianca: formData.veterinario_confianca,
          updated_at: new Date().toISOString()
        })
        .eq('id', client.id)

      if (error) throw error

      toast.success(`Cliente "${formData.nome}" atualizado com sucesso!`)
      setShowEditForm(false)
      
      // Recarregar dados do cliente
      await fetchClientData()

    } catch (error) {
      console.error('Erro ao atualizar cliente:', error)
      toast.error('Erro ao atualizar cliente')
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteClient = async () => {
    if (!client) return

    setDeleting(true)
    try {
      // 1. Buscar todos os serviços do cliente
      const { data: clientServices, error: servicesError } = await supabase
        .from('services')
        .select('id')
        .eq('client_id', client.id)

      if (servicesError) throw servicesError

      // 2. Deletar todas as visitas dos serviços do cliente
      if (clientServices && clientServices.length > 0) {
        const serviceIds = clientServices.map(s => s.id)
        const { error: visitsError } = await supabase
          .from('visits')
          .delete()
          .in('service_id', serviceIds)

        if (visitsError) throw visitsError
      }

      // 3. Deletar todos os serviços do cliente
      const { error: deleteServicesError } = await supabase
        .from('services')
        .delete()
        .eq('client_id', client.id)

      if (deleteServicesError) throw deleteServicesError

      // 4. Deletar todos os pets do cliente
      const { error: petsError } = await supabase
        .from('pets')
        .delete()
        .eq('client_id', client.id)

      if (petsError) throw petsError

      // 5. Finalmente, deletar o cliente
      const { error: clientError } = await supabase
        .from('clients')
        .delete()
        .eq('id', client.id)

      if (clientError) throw clientError

      toast.success(`Cliente "${client.nome}" excluído com sucesso!`)
      navigate('/clients')
      
    } catch (error) {
      console.error('Erro ao excluir cliente:', error)
      toast.error('Erro ao excluir cliente')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const getRelationshipLevel = (score: number) => {
    if (score >= 80) return { label: 'Excelente', color: 'text-green-600', bg: 'bg-green-100', icon: '🌟' }
    if (score >= 60) return { label: 'Ótimo', color: 'text-blue-600', bg: 'bg-blue-100', icon: '😊' }
    if (score >= 40) return { label: 'Bom', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: '👍' }
    if (score >= 20) return { label: 'Regular', color: 'text-orange-600', bg: 'bg-orange-100', icon: '🤔' }
    return { label: 'Novo', color: 'text-gray-600', bg: 'bg-gray-100', icon: '🌱' }
  }

  const getPaymentStatusBadge = (status: string) => {
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
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  const getVisitStatusBadge = (status: string) => {
    const styles = {
      agendada: 'bg-blue-100 text-blue-800',
      realizada: 'bg-green-100 text-green-800',
      cancelada: 'bg-red-100 text-red-800'
    }
    
    const labels = {
      agendada: 'Agendada',
      realizada: 'Realizada',
      cancelada: 'Cancelada'
    }
    
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  // Funções para modal de Pet
  const openPetModal = () => {
    setPetFormData({
      nome: '',
      caracteristica: '',
      observacoes: '',
      client_id: id || ''
    })
    setShowPetModal(true)
  }

  const closePetModal = () => {
    setShowPetModal(false)
    setPetFormData({
      nome: '',
      caracteristica: '',
      observacoes: '',
      client_id: id || ''
    })
  }

  const handleSubmitPet = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (submittingPet) {
      toast.error('Aguarde, o pet está sendo salvo...')
      return
    }

    setSubmittingPet(true)

    try {
      const { error } = await supabase
        .from('pets')
        .insert([petFormData])
      
      if (error) throw error
      
      toast.success(`Pet "${petFormData.nome}" adicionado com sucesso!`)
      await fetchClientData() // Recarregar dados
      closePetModal()
    } catch (error: any) {
      console.error('Erro ao salvar pet:', error)
      toast.error(`Erro ao salvar pet: ${error.message}`)
    } finally {
      setSubmittingPet(false)
    }
  }

  // Funções para modal de Serviço
  const openServiceModal = () => {
    setServiceFormData({
      nome_servico: '',
      client_id: id || '',
      status_pagamento: 'pendente',
      desconto_plataforma_default: 0
    })
    setServiceVisits([])
    setShowServiceModal(true)
  }

  const closeServiceModal = () => {
    setShowServiceModal(false)
    setServiceFormData({
      nome_servico: '',
      client_id: id || '',
      status_pagamento: 'pendente',
      desconto_plataforma_default: 0
    })
    setServiceVisits([])
  }

  const calculateVisitValue = (tipo: 'inteira' | 'meia') => {
    if (!client) return 0
    return tipo === 'inteira' ? client.valor_diaria : client.valor_duas_visitas / 2
  }

  const addVisit = () => {
    const newVisit: Visit = {
      id: `temp-${Date.now()}`,
      service_id: '',
      data: '',
      horario: '',
      tipo_visita: 'inteira',
      valor: client?.valor_diaria || 0,
      status: 'agendada',
      desconto_plataforma: serviceFormData.desconto_plataforma_default
    }
    setServiceVisits([...serviceVisits, newVisit])
  }

  const removeVisit = (index: number) => {
    setServiceVisits(serviceVisits.filter((_, i) => i !== index))
  }

  const updateVisit = (index: number, field: keyof Visit, value: any) => {
    const updated = [...serviceVisits]
    updated[index] = { ...updated[index], [field]: value }
    
    // Se mudou o tipo de visita, recalcular o valor
    if (field === 'tipo_visita') {
      updated[index].valor = calculateVisitValue(value as 'inteira' | 'meia')
    }
    
    setServiceVisits(updated)
  }

  const handleSubmitService = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (submittingService) {
      toast.error('Aguarde, o serviço está sendo salvo...')
      return
    }

    if (serviceVisits.length === 0) {
      toast.error('Adicione pelo menos uma visita')
      return
    }

    const visitsWithoutDate = serviceVisits.filter(v => !v.data)
    if (visitsWithoutDate.length > 0) {
      toast.error('Todas as visitas devem ter uma data preenchida')
      return
    }

    setSubmittingService(true)

    try {
      // Ordenar visitas por data
      const sortedVisits = [...serviceVisits].sort((a, b) => 
        new Date(a.data).getTime() - new Date(b.data).getTime()
      )

      const dataInicio = sortedVisits[0].data
      const dataFim = sortedVisits[sortedVisits.length - 1].data

      const totalVisitas = sortedVisits.filter(v => v.status !== 'cancelada').length
      const totalValor = sortedVisits
        .filter(v => v.status !== 'cancelada')
        .reduce((sum, v) => sum + v.valor, 0)
      const totalAReceber = sortedVisits
        .filter(v => v.status !== 'cancelada')
        .reduce((sum, v) => sum + (v.valor * (1 - v.desconto_plataforma / 100)), 0)

      // Verificar e aplicar crédito disponível
      let creditoUsado = 0
      const creditoDisponivel = client?.credito_disponivel || 0
      
      if (creditoDisponivel > 0) {
        creditoUsado = Math.min(creditoDisponivel, totalValor)
        
        // Atualizar saldo do cliente
        const novoSaldo = creditoDisponivel - creditoUsado
        const { error: updateCreditError } = await supabase
          .from('clients')
          .update({ credito_disponivel: novoSaldo })
          .eq('id', serviceFormData.client_id)

        if (updateCreditError) throw updateCreditError
      }

      // Criar serviço
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .insert([{
          ...serviceFormData,
          data_inicio: dataInicio,
          data_fim: dataFim,
          total_visitas: totalVisitas,
          total_valor: totalValor,
          total_a_receber: totalAReceber,
          credito_usado: creditoUsado
        }])
        .select()
        .single()

      if (serviceError) throw serviceError

      // Registrar uso de crédito no histórico
      if (creditoUsado > 0) {
        const { error: historyError } = await supabase
          .from('client_credits_history')
          .insert({
            client_id: serviceFormData.client_id,
            tipo: 'uso',
            valor: creditoUsado,
            saldo_anterior: creditoDisponivel,
            saldo_novo: creditoDisponivel - creditoUsado,
            descricao: `Crédito usado no serviço ${serviceData.nome_servico || 'sem nome'}`,
            service_id: serviceData.id
          })

        if (historyError) console.error('Erro ao registrar histórico de crédito:', historyError)
      }

      // Criar visitas
      const visitsToInsert = sortedVisits.map(visit => ({
        service_id: serviceData.id,
        client_id: serviceFormData.client_id,
        data: visit.data,
        horario: visit.horario,
        tipo_visita: visit.tipo_visita,
        tipo_encontro: 'visita_servico',
        valor: visit.valor,
        status: visit.status,
        desconto_plataforma: visit.desconto_plataforma,
        observacoes: visit.observacoes
      }))

      const { error: visitsError } = await supabase
        .from('visits')
        .insert(visitsToInsert)

      if (visitsError) throw visitsError

      const mensagemSucesso = creditoUsado > 0
        ? `Serviço criado! Crédito de ${formatCurrency(creditoUsado)} foi usado. Saldo restante: ${formatCurrency((client?.credito_disponivel || 0) - creditoUsado)}`
        : 'Serviço criado com sucesso!'
      
      toast.success(mensagemSucesso, { duration: 5000 })
      await fetchClientData() // Recarregar dados
      closeServiceModal()
    } catch (error: any) {
      console.error('Erro ao salvar serviço:', error)
      toast.error(`Erro ao salvar serviço: ${error.message}`)
    } finally {
      setSubmittingService(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-primary-50 to-white">
        <CatLoader size="lg" variant="walking" text="Buscando dados do cliente..." />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Cliente não encontrado</h3>
          <p className="mt-1 text-sm text-gray-500">O cliente solicitado não existe ou foi excluído.</p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/clients')}
              className="btn-fefelina"
            >
              Voltar para Clientes
            </button>
          </div>
        </div>
      </div>
    )
  }

  const relationship = getRelationshipLevel(relationshipScore)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/clients')}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar para Clientes
        </button>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{client.nome}</h1>
              {/* Tags */}
              <div className="flex gap-1 flex-wrap">
                {client.tags && client.tags.length > 0 && client.tags.map((tag, index) => (
                  <span
                    key={index}
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      tag === 'VIP' ? 'bg-yellow-100 text-yellow-800' :
                      tag === 'Regular' ? 'bg-blue-100 text-blue-800' :
                      tag === 'Especial' ? 'bg-purple-100 text-purple-800' :
                      tag === 'Premium' ? 'bg-pink-100 text-pink-800' :
                      'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <p className="mt-1 text-sm text-gray-500">Cliente desde {clientSince}</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-wrap gap-1.5">
            {/* Botões de Contato */}
            <button
              onClick={openWhatsApp}
              className="inline-flex items-center px-2 py-1.5 border border-green-300 rounded-md text-xs font-medium text-green-700 bg-white hover:bg-green-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </button>
            
            <button
              onClick={sendEmail}
              className="inline-flex items-center px-2 py-1.5 border border-blue-300 rounded-md text-xs font-medium text-blue-700 bg-white hover:bg-blue-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email
            </button>

            <button
              onClick={() => setShowNotesModal(true)}
              className="inline-flex items-center px-2 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Notas
            </button>

            <button
              onClick={() => setShowTagsModal(true)}
              className="inline-flex items-center px-2 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Tags
            </button>

            {/* Botões de Compartilhamento - Apenas Admin */}
            {userProfile?.profile?.is_admin && (
              <>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="inline-flex items-center px-2 py-1.5 border border-blue-300 rounded-md text-xs font-medium text-blue-700 bg-white hover:bg-blue-50 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5 mr-1.5" />
                  Compartilhar
                </button>
                
                <button
                  onClick={() => setShowSharedWithModal(true)}
                  className="inline-flex items-center px-2 py-1.5 border border-purple-300 rounded-md text-xs font-medium text-purple-700 bg-white hover:bg-purple-50 transition-colors"
                >
                  <Users className="w-3.5 h-3.5 mr-1.5" />
                  Compartilhados
                </button>
              </>
            )}
            
            {canUpdateClient && (
              <button
                onClick={openEditForm}
                className="inline-flex items-center px-2 py-1.5 border border-primary-300 rounded-md text-xs font-medium text-primary-700 bg-white hover:bg-primary-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Métricas Principais - Linha 1: Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Total de Receita */}
        <div className="card-fefelina p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Receita Total</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
            </div>
          </div>
        </div>

        {/* Total Pago */}
        <div className="card-fefelina p-5 border-2 border-green-200">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Já Recebido</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
            </div>
          </div>
        </div>

        {/* A Receber */}
        <div className="card-fefelina p-5 border-2 border-orange-200">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 bg-orange-100 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">A Receber (Pendente)</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalToReceive)}</p>
              <p className="text-xs text-gray-500 mt-1">Somente serviços não pagos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Métricas Principais - Linha 2: Operacional */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total de Serviços */}
        <div className="card-fefelina p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total de Serviços</p>
              <p className="text-2xl font-bold text-gray-900">{totalServices}</p>
            </div>
          </div>
        </div>

        {/* Total de Visitas */}
        <div className="card-fefelina p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Visitas Realizadas</p>
              <p className="text-2xl font-bold text-gray-900">{totalVisits}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Comparação com Médias e Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Comparação com Média Geral */}
        <div className="card-fefelina p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Comparação com Média Geral
          </h3>
          
          <div className="space-y-4">
            {/* Receita vs Média */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Receita Total</span>
                <span className={`text-sm font-semibold ${
                  totalRevenue >= globalAverageRevenue ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {totalRevenue >= globalAverageRevenue ? (
                    <>+{((totalRevenue / globalAverageRevenue - 1) * 100).toFixed(0)}% acima</>
                  ) : (
                    <>{((1 - totalRevenue / globalAverageRevenue) * 100).toFixed(0)}% abaixo</>
                  )}
                </span>
              </div>
              <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`absolute h-full ${
                    totalRevenue >= globalAverageRevenue ? 'bg-green-500' : 'bg-orange-500'
                  } transition-all duration-500`}
                  style={{ width: `${Math.min((totalRevenue / (globalAverageRevenue * 2)) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-500">Este cliente: {formatCurrency(totalRevenue)}</span>
                <span className="text-xs text-gray-500">Média: {formatCurrency(globalAverageRevenue)}</span>
              </div>
            </div>

            {/* Serviços vs Média */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Total de Serviços</span>
                <span className={`text-sm font-semibold ${
                  totalServices >= globalAverageServices ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {totalServices >= globalAverageServices ? (
                    <>+{((totalServices / globalAverageServices - 1) * 100).toFixed(0)}% acima</>
                  ) : (
                    <>{((1 - totalServices / globalAverageServices) * 100).toFixed(0)}% abaixo</>
                  )}
                </span>
              </div>
              <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`absolute h-full ${
                    totalServices >= globalAverageServices ? 'bg-green-500' : 'bg-orange-500'
                  } transition-all duration-500`}
                  style={{ width: `${Math.min((totalServices / (globalAverageServices * 2)) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-500">Este cliente: {totalServices}</span>
                <span className="text-xs text-gray-500">Média: {globalAverageServices.toFixed(1)}</span>
              </div>
            </div>

            {/* Classificação */}
            <div className="mt-4 p-3 bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg border border-primary-200">
              <p className="text-sm font-medium text-gray-900">
                {totalRevenue >= globalAverageRevenue * 1.5 ? (
                  <>🏆 Cliente TOP! Está entre os melhores clientes</>
                ) : totalRevenue >= globalAverageRevenue ? (
                  <>⭐ Cliente acima da média - ótimo relacionamento</>
                ) : totalRevenue >= globalAverageRevenue * 0.5 ? (
                  <>📊 Cliente na média - potencial de crescimento</>
                ) : (
                  <>🌱 Cliente novo ou com potencial para desenvolver</>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Alertas e Ações Sugeridas */}
        <div className="card-fefelina p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Alertas e Ações Sugeridas
          </h3>
          
          <div className="space-y-3">
            {/* Alerta de Inatividade */}
            {lastServiceDate && (() => {
              const daysSince = Math.floor((Date.now() - new Date(services[0].data_inicio).getTime()) / (1000 * 60 * 60 * 24))
              if (daysSince > 180) {
                return (
                  <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-red-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-red-800">Cliente Inativo - {daysSince} dias</p>
                        <p className="text-xs text-red-700 mt-1">Urgente: Entre em contato para reativar</p>
                      </div>
                    </div>
                  </div>
                )
              } else if (daysSince > 90) {
                return (
                  <div className="p-3 bg-orange-50 border-l-4 border-orange-500 rounded">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-orange-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-orange-800">Sem contratações há {daysSince} dias</p>
                        <p className="text-xs text-orange-700 mt-1">Recomendado: Envie mensagem de follow-up</p>
                      </div>
                    </div>
                  </div>
                )
              } else if (daysSince > 60) {
                return (
                  <div className="p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-yellow-800">Tempo desde última contratação: {daysSince} dias</p>
                        <p className="text-xs text-yellow-700 mt-1">Sugestão: Envie uma oferta especial</p>
                      </div>
                    </div>
                  </div>
                )
              }
              return (
                <div className="p-3 bg-green-50 border-l-4 border-green-500 rounded">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">Cliente Ativo ✓</p>
                      <p className="text-xs text-green-700 mt-1">Última contratação há {daysSince} dias</p>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Alertas sobre pets */}
            {pets.length === 0 && (
              <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-800">Nenhum pet cadastrado</p>
                    <p className="text-xs text-blue-700 mt-1">Solicite o cadastro para melhor atendimento</p>
                  </div>
                </div>
              </div>
            )}

            {/* Alertas sobre dados de contato */}
            {!client.telefone && (
              <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-800">Telefone não cadastrado</p>
                    <p className="text-xs text-blue-700 mt-1">Adicione para contato via WhatsApp</p>
                  </div>
                </div>
              </div>
            )}

            {!client.email && (
              <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-800">Email não cadastrado</p>
                    <p className="text-xs text-blue-700 mt-1">Adicione para envio de propostas</p>
                  </div>
                </div>
              </div>
            )}

            {/* Ações sugeridas baseadas no score */}
            {relationshipScore >= 80 && (
              <div className="p-3 bg-purple-50 border-l-4 border-purple-500 rounded">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-purple-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-purple-800">Cliente VIP</p>
                    <p className="text-xs text-purple-700 mt-1">Ofereça benefícios exclusivos e prioridade</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Score de Relacionamento e Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Score de Relacionamento */}
        <div className="card-fefelina p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Score de Relacionamento</h3>
          
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke={
                    relationshipScore >= 80 ? '#10b981' :
                    relationshipScore >= 60 ? '#3b82f6' :
                    relationshipScore >= 40 ? '#eab308' :
                    relationshipScore >= 20 ? '#f97316' : '#6b7280'
                  }
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${(relationshipScore / 100) * 351.86} 351.86`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-3xl font-bold text-gray-900">{relationshipScore}</span>
                <span className="text-xs text-gray-500">de 100</span>
              </div>
            </div>
          </div>

          <div className={`text-center p-3 rounded-lg ${relationship.bg}`}>
            <span className="text-2xl mr-2">{relationship.icon}</span>
            <span className={`text-lg font-semibold ${relationship.color}`}>{relationship.label}</span>
          </div>

          <div className="mt-4 space-y-2 text-sm text-gray-600">
            <p>• Baseado em {totalServices} serviços contratados</p>
            <p>• {totalVisits} visitas realizadas</p>
            <p>• Valor médio por serviço: {formatCurrency(averageServiceValue)}</p>
            {lastServiceDate && <p>• Última contratação: {lastServiceDate}</p>}
          </div>
        </div>

        {/* Insights e Análises */}
        <div className="lg:col-span-2 card-fefelina p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Insights e Análises</h3>
          
          <div className="space-y-4">
            {/* Padrão de Contratação */}
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold text-gray-900 mb-2">📊 Padrão de Contratação</h4>
              {peakMonth ? (
                <p className="text-sm text-gray-600">
                  O mês de pico de contratações foi <strong>{peakMonth}</strong>. 
                  {monthlyStats.length >= 3 && ` Nos últimos ${monthlyStats.length} meses registrados, a média é de ${(monthlyStats.reduce((sum, m) => sum + m.count, 0) / monthlyStats.length).toFixed(1)} serviços por mês.`}
                </p>
              ) : (
                <p className="text-sm text-gray-600">Ainda não há dados suficientes para análise de padrões.</p>
              )}
            </div>

            {/* Valor Médio */}
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-semibold text-gray-900 mb-2">💰 Análise Financeira</h4>
              <p className="text-sm text-gray-600 mb-2">
                Valor médio por serviço: <strong>{formatCurrency(averageServiceValue)}</strong>.
                {' '}Valor da diária configurado: <strong>{formatCurrency(client.valor_diaria)}</strong>.
                {' '}Duas visitas: <strong>{formatCurrency(client.valor_duas_visitas)}</strong>.
              </p>
              <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                <p className="text-xs text-gray-700">
                  <strong className="text-green-700">Já recebido:</strong> {formatCurrency(totalPaid)} ({totalRevenue > 0 ? ((totalPaid / totalRevenue) * 100).toFixed(0) : 0}%)
                  {' • '}
                  <strong className="text-orange-700">Pendente:</strong> {formatCurrency(totalToReceive)} ({totalRevenue > 0 ? ((totalToReceive / totalRevenue) * 100).toFixed(0) : 0}%)
                </p>
              </div>
            </div>

            {/* Frequência */}
            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="font-semibold text-gray-900 mb-2">📅 Frequência</h4>
              {services.length > 1 ? (
                <p className="text-sm text-gray-600">
                  Cliente com <strong>{services.length} serviços</strong> contratados.
                  {(() => {
                    const firstService = new Date(services[services.length - 1].data_inicio)
                    const lastService = new Date(services[0].data_inicio)
                    const monthsDiff = Math.floor((lastService.getTime() - firstService.getTime()) / (1000 * 60 * 60 * 24 * 30))
                    const avgFrequency = monthsDiff > 0 ? (services.length / monthsDiff).toFixed(1) : 'N/A'
                    return monthsDiff > 0 ? ` Frequência média: ${avgFrequency} serviços/mês.` : ''
                  })()}
                </p>
              ) : (
                <p className="text-sm text-gray-600">Cliente novo com apenas 1 serviço contratado.</p>
              )}
            </div>

            {/* Recomendações */}
            <div className="border-l-4 border-yellow-500 pl-4">
              <h4 className="font-semibold text-gray-900 mb-2">💡 Recomendações</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {relationshipScore >= 80 && (
                  <li>• Cliente VIP! Mantenha o excelente relacionamento e considere ofertas especiais.</li>
                )}
                {relationshipScore < 40 && services.length === 0 && (
                  <li>• Cliente novo - envie uma mensagem de boas-vindas e ofereça desconto na primeira contratação.</li>
                )}
                {lastServiceDate && (() => {
                  const daysSince = Math.floor((Date.now() - new Date(services[0].data_inicio).getTime()) / (1000 * 60 * 60 * 24))
                  if (daysSince > 90) return <li>• Cliente inativo há {daysSince} dias - considere uma campanha de reativação.</li>
                  if (daysSince > 60) return <li>• Cliente sem contratações há {daysSince} dias - um contato pode ser bem-vindo.</li>
                  return null
                })()}
                {pets.length === 0 && (
                  <li>• Nenhum pet cadastrado - solicite o cadastro para melhor atendimento.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Contratações Mensais */}
      {monthlyStats.length > 0 && (
        <div className="card-fefelina p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Histórico de Contratações (Últimos 12 meses)</h3>
          <div className="overflow-x-auto">
            <div className="flex items-end space-x-2 h-64 pb-8">
              {monthlyStats.slice().reverse().map((stat, index) => {
                const maxCount = Math.max(...monthlyStats.map(s => s.count))
                const height = maxCount > 0 ? (stat.count / maxCount) * 100 : 0
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center group">
                    <div className="relative w-full">
                      <div
                        className="w-full bg-primary-500 rounded-t-lg transition-all duration-300 group-hover:bg-primary-600"
                        style={{ height: `${Math.max(height * 2, 4)}px` }}
                      >
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                          {stat.count} serviço{stat.count !== 1 ? 's' : ''}<br/>
                          {formatCurrency(stat.revenue)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-600 transform -rotate-45 origin-top-left whitespace-nowrap">
                      {stat.month}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Informações do Cliente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Dados Cadastrais */}
        <div className="space-y-6">
          <div className="card-fefelina p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados Cadastrais</h3>
            <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Nome</dt>
              <dd className="mt-1 text-sm text-gray-900">{client.nome}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Endereço</dt>
              <dd className="mt-1 text-sm text-gray-900">{client.endereco_completo || 'Não informado'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Veterinário de Confiança</dt>
              <dd className="mt-1 text-sm text-gray-900">{client.veterinario_confianca || 'Não informado'}</dd>
            </div>
            {shouldShowField('valor_diaria') && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Valor Diária</dt>
                <dd className="mt-1 text-sm text-gray-900">{maskClientField('valor_diaria', formatCurrency(client.valor_diaria))}</dd>
              </div>
            )}
            {shouldShowField('valor_duas_visitas') && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Valor Duas Visitas</dt>
                <dd className="mt-1 text-sm text-gray-900">{maskClientField('valor_duas_visitas', formatCurrency(client.valor_duas_visitas))}</dd>
              </div>
            )}
            {client.observacoes && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Observações</dt>
                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{client.observacoes}</dd>
              </div>
            )}
          </dl>
          
          {/* Notas do CRM */}
          {client.notas && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700 flex items-center">
                  <svg className="w-4 h-4 mr-1 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Notas CRM
                </h4>
                <button
                  onClick={() => setShowNotesModal(true)}
                  className="text-xs text-primary-600 hover:text-primary-800"
                >
                  Editar
                </button>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{client.notas}</p>
              </div>
            </div>
          )}
        </div>

          {/* Créditos do Cliente */}
          <ClientCredits
            clientId={client.id}
            clientName={client.nome}
            currentCredit={client.credito_disponivel || 0}
            onUpdate={fetchClientData}
          />
        </div>

        {/* Pets */}
        <div className="card-fefelina p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Pets ({pets.length})</h3>
            <button
              onClick={openPetModal}
              className="text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-full p-1.5 transition-colors"
              title="Adicionar Pet"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          {pets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.5 5C7.67157 5 7 5.67157 7 6.5C7 7.32843 7.67157 8 8.5 8C9.32843 8 10 7.32843 10 6.5C10 5.67157 9.32843 5 8.5 5Z"/>
                <path d="M15.5 5C14.6716 5 14 5.67157 14 6.5C14 7.32843 14.6716 8 15.5 8C16.3284 8 17 7.32843 17 6.5C17 5.67157 16.3284 5 15.5 5Z"/>
                <path d="M5 9.5C5 8.67157 5.67157 8 6.5 8C7.32843 8 8 8.67157 8 9.5C8 10.3284 7.32843 11 6.5 11C5.67157 11 5 10.3284 5 9.5Z"/>
                <path d="M17.5 8C16.6716 8 16 8.67157 16 9.5C16 10.3284 16.6716 11 17.5 11C18.3284 11 19 10.3284 19 9.5C19 8.67157 18.3284 8 17.5 8Z"/>
                <path d="M12 10C9.79086 10 8 11.7909 8 14C8 15.8638 9.27477 17.4299 11 17.874V19C11 19.5523 11.4477 20 12 20C12.5523 20 13 19.5523 13 19V17.874C14.7252 17.4299 16 15.8638 16 14C16 11.7909 14.2091 10 12 10Z"/>
              </svg>
              <p className="text-sm">Nenhum pet cadastrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pets.map((pet) => (
                <div key={pet.id} className="border border-gray-200 rounded-lg p-3 hover:border-primary-300 transition-colors">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 p-2 bg-primary-100 rounded-lg">
                      <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8.5 5C7.67157 5 7 5.67157 7 6.5C7 7.32843 7.67157 8 8.5 8C9.32843 8 10 7.32843 10 6.5C10 5.67157 9.32843 5 8.5 5Z"/>
                        <path d="M15.5 5C14.6716 5 14 5.67157 14 6.5C14 7.32843 14.6716 8 15.5 8C16.3284 8 17 7.32843 17 6.5C17 5.67157 16.3284 5 15.5 5Z"/>
                        <path d="M5 9.5C5 8.67157 5.67157 8 6.5 8C7.32843 8 8 8.67157 8 9.5C8 10.3284 7.32843 11 6.5 11C5.67157 11 5 10.3284 5 9.5Z"/>
                        <path d="M17.5 8C16.6716 8 16 8.67157 16 9.5C16 10.3284 16.6716 11 17.5 11C18.3284 11 19 10.3284 19 9.5C19 8.67157 18.3284 8 17.5 8Z"/>
                        <path d="M12 10C9.79086 10 8 11.7909 8 14C8 15.8638 9.27477 17.4299 11 17.874V19C11 19.5523 11.4477 20 12 20C12.5523 20 13 19.5523 13 19V17.874C14.7252 17.4299 16 15.8638 16 14C16 11.7909 14.2091 10 12 10Z"/>
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <h4 className="text-sm font-semibold text-gray-900">{pet.nome}</h4>
                      <p className="text-xs text-gray-600 mt-1">{pet.caracteristica}</p>
                      {pet.observacoes && (
                        <p className="text-xs text-gray-500 mt-1 italic">{pet.observacoes}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Serviços */}
      <div className="card-fefelina p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Serviços Contratados ({services.length})</h3>
          <button
            onClick={openServiceModal}
            className="text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-full p-1.5 transition-colors"
            title="Adicionar Serviço"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        
        {services.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">Nenhum serviço contratado ainda</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Serviço
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Período
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Visitas
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Total
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    A Receber
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {services.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 whitespace-nowrap text-sm">
                      <div className="font-medium text-gray-900">
                        {service.nome_servico || 'Sem nome'}
                      </div>
                      <div className="text-xs text-gray-500">
                        Criado em {new Date(service.created_at).toLocaleDateString('pt-BR')}
                      </div>
                      {(service as any).credito_usado > 0 && (
                        <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          💰 Crédito usado: {formatCurrency((service as any).credito_usado)}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                      {format(parseISO(service.data_inicio), 'dd \d\e MMM', { locale: ptBR })}
                      {' - '}
                      {format(parseISO(service.data_fim), 'dd \d\e MMM \d\e yyyy', { locale: ptBR })}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                      {service.total_visitas}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {maskServiceField('total_valor', formatCurrency(service.total_valor))}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm font-semibold text-primary-600">
                      {maskServiceField('total_a_receber', formatCurrency(service.total_a_receber))}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm">
                      {getPaymentStatusBadge(service.status_pagamento)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Visitas */}
      <div className="card-fefelina p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Histórico de Visitas ({visits.length})</h3>
        
        {visits.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">Nenhuma visita registrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Horário
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Desconto
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visits.slice(0, 20).map((visit) => (
                  <tr key={visit.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                      {format(parseISO(visit.data), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                      {visit.horario}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        visit.tipo_visita === 'inteira' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {visit.tipo_visita === 'inteira' ? 'Inteira' : 'Meia'}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(visit.valor)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                      {visit.desconto_plataforma}%
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm">
                      {getVisitStatusBadge(visit.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visits.length > 20 && (
              <div className="mt-4 text-center text-sm text-gray-500">
                Mostrando 20 de {visits.length} visitas
              </div>
            )}
          </div>
        )}
      </div>

      {/* Zona de Perigo */}
      {canDeleteClient && (
        <div className="mt-8 border border-red-200 rounded-lg overflow-hidden">
          <div className="bg-red-50 px-6 py-3 border-b border-red-200">
            <h3 className="text-sm font-semibold text-red-900">Zona de Perigo</h3>
          </div>
          <div className="bg-white px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Excluir este cliente</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Uma vez excluído, não há como voltar atrás. Por favor, tenha certeza.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center justify-center px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-white hover:bg-red-50 transition-colors flex-shrink-0"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Excluir Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Notas */}
      {showNotesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div 
            className="absolute inset-0" 
            onClick={() => setShowNotesModal(false)}
          ></div>
            
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-200 px-6 py-4 flex justify-between items-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Notas sobre {client.nome}
                </h3>
                <button onClick={() => setShowNotesModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-4 overflow-y-auto flex-1">
                <p className="text-sm text-gray-600 mb-4">
                  Use este espaço para registrar informações importantes sobre o cliente, observações de atendimento, preferências, histórico de conversas, etc.
                </p>
                
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={12}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  placeholder="Digite suas notas aqui...&#10;&#10;Exemplos:&#10;- Preferências de horário&#10;- Histórico de comunicação&#10;- Observações importantes&#10;- Datas especiais"
                  autoFocus
                />
              </div>

              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNotesModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={saveNotes}
                  disabled={savingNotes}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {savingNotes ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Salvando...
                    </>
                  ) : (
                    'Salvar Notas'
                  )}
                </button>
              </div>
            </div>
        </div>
      )}

      {/* Modal de Tags */}
      {showTagsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowTagsModal(false)}></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-200 px-6 py-4 flex justify-between items-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Categorizar Cliente
                </h3>
                <button onClick={() => setShowTagsModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-4">
                <p className="text-sm text-gray-600 mb-4">
                  Selecione as tags que melhor descrevem este cliente para facilitar a segmentação e análise.
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  {['VIP', 'Regular', 'Especial', 'Premium', 'Novo', 'Fidelizado', 'Corporativo', 'Indicação'].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-all border-2 ${
                        selectedTags.includes(tag)
                          ? tag === 'VIP' ? 'bg-yellow-100 border-yellow-500 text-yellow-800' :
                            tag === 'Regular' ? 'bg-blue-100 border-blue-500 text-blue-800' :
                            tag === 'Especial' ? 'bg-purple-100 border-purple-500 text-purple-800' :
                            tag === 'Premium' ? 'bg-pink-100 border-pink-500 text-pink-800' :
                            tag === 'Novo' ? 'bg-green-100 border-green-500 text-green-800' :
                            tag === 'Fidelizado' ? 'bg-indigo-100 border-indigo-500 text-indigo-800' :
                            tag === 'Corporativo' ? 'bg-gray-100 border-gray-500 text-gray-800' :
                            'bg-orange-100 border-orange-500 text-orange-800'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                {selectedTags.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-blue-900 mb-2">Tags selecionadas:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map((tag) => (
                        <span
                          key={tag}
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            tag === 'VIP' ? 'bg-yellow-100 text-yellow-800' :
                            tag === 'Regular' ? 'bg-blue-100 text-blue-800' :
                            tag === 'Especial' ? 'bg-purple-100 text-purple-800' :
                            tag === 'Premium' ? 'bg-pink-100 text-pink-800' :
                            tag === 'Novo' ? 'bg-green-100 text-green-800' :
                            tag === 'Fidelizado' ? 'bg-indigo-100 text-indigo-800' :
                            tag === 'Corporativo' ? 'bg-gray-100 text-gray-800' :
                            'bg-orange-100 text-orange-800'
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowTagsModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={saveTags}
                  disabled={savingTags}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {savingTags ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Salvando...
                    </>
                  ) : (
                    'Salvar Tags'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Cliente */}
      {showEditForm && client && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center p-4">
          <div className="relative top-10 w-full max-w-2xl bg-white rounded-lg shadow-xl">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-200 px-6 py-3 flex justify-between items-center rounded-t-lg">
              <h3 className="text-base font-semibold text-gray-900">Editar Cliente: {client.nome}</h3>
              <button
                onClick={() => setShowEditForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleEditSubmit}>
                {/* Grid 2 colunas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Nome</label>
                    <input
                      type="text"
                      name="nome"
                      value={formData.nome}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  {shouldShowField('telefone') && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Telefone</label>
                      <input
                        type="text"
                        name="telefone"
                        value={formData.telefone}
                        onChange={handleInputChange}
                        placeholder="+55(47)99999-9999"
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  )}

                  {shouldShowField('valor_diaria') && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Valor Diária (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        name="valor_diaria"
                        value={formData.valor_diaria}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  )}

                  {shouldShowField('valor_duas_visitas') && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Valor 2 Visitas (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        name="valor_duas_visitas"
                        value={formData.valor_duas_visitas}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Veterinário de Confiança</label>
                    <input
                      type="text"
                      name="veterinario_confianca"
                      value={formData.veterinario_confianca}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Endereço Completo</label>
                    <textarea
                      name="endereco_completo"
                      value={formData.endereco_completo}
                      onChange={handleInputChange}
                      required
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowEditForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-primary-500 rounded-md hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {updating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Salvando...
                      </>
                    ) : (
                      'Salvar Alterações'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Novo Pet */}
      {showPetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="modal-fefelina max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="section-title-fefelina">Novo Pet</h2>
              <button
                onClick={closePetModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitPet} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Pet *
                </label>
                <input
                  type="text"
                  required
                  className="input-fefelina"
                  value={petFormData.nome}
                  onChange={(e) => setPetFormData({ ...petFormData, nome: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Característica *
                </label>
                <input
                  type="text"
                  required
                  className="input-fefelina"
                  placeholder="Ex: Gato, Siamês, 3 anos"
                  value={petFormData.caracteristica}
                  onChange={(e) => setPetFormData({ ...petFormData, caracteristica: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  className="input-fefelina"
                  rows={3}
                  placeholder="Informações adicionais sobre o pet..."
                  value={petFormData.observacoes}
                  onChange={(e) => setPetFormData({ ...petFormData, observacoes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closePetModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingPet}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submittingPet ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Salvando...
                    </>
                  ) : (
                    'Adicionar Pet'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Novo Serviço */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="modal-fefelina max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="section-title-fefelina">Novo Serviço</h2>
              <button
                onClick={closeServiceModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitService} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Serviço
                  </label>
                  <input
                    type="text"
                    className="input-fefelina"
                    placeholder="Ex: Férias Dezembro 2024"
                    value={serviceFormData.nome_servico}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, nome_servico: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status de Pagamento
                  </label>
                  <select
                    className="input-fefelina"
                    value={serviceFormData.status_pagamento}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, status_pagamento: e.target.value as any })}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="pendente_plataforma">Pendente Plataforma</option>
                    <option value="pago_parcialmente">Pago Parcialmente</option>
                    <option value="pago">Pago</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Desconto Plataforma Padrão (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    className="input-fefelina"
                    value={serviceFormData.desconto_plataforma_default}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, desconto_plataforma_default: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Visitas */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Visitas *
                  </label>
                  <button
                    type="button"
                    onClick={addVisit}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Adicionar Visita
                  </button>
                </div>

                {serviceVisits.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <p className="text-sm text-gray-500">Nenhuma visita adicionada ainda</p>
                    <button
                      type="button"
                      onClick={addVisit}
                      className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Adicionar primeira visita
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {serviceVisits.map((visit, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 p-3 bg-gray-50 rounded-lg">
                        <div className="col-span-3">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Data *</label>
                          <input
                            type="date"
                            required
                            className="input-fefelina text-sm"
                            value={visit.data}
                            onChange={(e) => updateVisit(index, 'data', e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Horário</label>
                          <input
                            type="time"
                            className="input-fefelina text-sm"
                            value={visit.horario}
                            onChange={(e) => updateVisit(index, 'horario', e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
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
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Valor</label>
                          <input
                            type="number"
                            step="0.01"
                            className="input-fefelina text-sm"
                            value={visit.valor}
                            onChange={(e) => updateVisit(index, 'valor', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-span-2">
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
                        <div className="col-span-1 flex items-end">
                          <button
                            type="button"
                            onClick={() => removeVisit(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Remover visita"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Resumo */}
              {serviceVisits.length > 0 && (
                <div className="space-y-4">
                  <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Resumo do Serviço</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total Visitas:</span>
                        <span className="ml-2 font-medium">{serviceVisits.filter(v => v.status !== 'cancelada').length}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Valor Total:</span>
                        <span className="ml-2 font-medium">
                          {formatCurrency(serviceVisits.filter(v => v.status !== 'cancelada').reduce((sum, v) => sum + v.valor, 0))}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">A Receber:</span>
                        <span className="ml-2 font-medium text-green-700">
                          {formatCurrency(serviceVisits.filter(v => v.status !== 'cancelada').reduce((sum, v) => sum + (v.valor * (1 - v.desconto_plataforma / 100)), 0))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card de Crédito Disponível */}
                  {(() => {
                    const creditoDisponivel = client?.credito_disponivel || 0
                    const valorTotal = serviceVisits.filter(v => v.status !== 'cancelada').reduce((sum, v) => sum + v.valor, 0)
                    const creditoAUsar = Math.min(creditoDisponivel, valorTotal)
                    const saldoRestante = creditoDisponivel - creditoAUsar
                    const valorFinal = valorTotal - creditoAUsar

                    return creditoDisponivel > 0 ? (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 p-2 bg-green-500 rounded-lg">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-bold text-green-900 mb-2">💰 Crédito Disponível</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-700">Saldo atual:</span>
                                <span className="font-semibold text-green-700">{formatCurrency(creditoDisponivel)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-700">Será usado neste serviço:</span>
                                <span className="font-bold text-green-800">{formatCurrency(creditoAUsar)}</span>
                              </div>
                              <div className="flex justify-between pt-2 border-t border-green-200">
                                <span className="text-gray-700">Saldo após serviço:</span>
                                <span className="font-semibold text-green-700">{formatCurrency(saldoRestante)}</span>
                              </div>
                              <div className="flex justify-between items-center pt-2 mt-2 border-t-2 border-green-300">
                                <span className="font-medium text-gray-900">Valor final a pagar:</span>
                                <span className="text-lg font-bold text-primary-600">{formatCurrency(valorFinal)}</span>
                              </div>
                            </div>
                            {creditoAUsar > 0 && (
                              <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded text-xs text-green-800">
                                ✅ O crédito será aplicado automaticamente ao criar o serviço
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null
                  })()}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeServiceModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingService}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submittingService ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Salvando...
                    </>
                  ) : (
                    'Criar Serviço'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl">
            <div className="bg-gradient-to-r from-red-50 to-red-100 border-b border-red-200 px-6 py-3 flex justify-between items-center">
              <h3 className="text-base font-semibold text-gray-900">Confirmar Exclusão</h3>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Excluir Cliente</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Tem certeza que deseja excluir o cliente <strong>{client?.nome}</strong>?
                  </p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                <p className="text-xs text-yellow-800">
                  <strong>Atenção:</strong> Esta ação não pode ser desfeita. Todos os dados relacionados (pets, serviços e visitas) também serão excluídos.
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteClient}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Excluir
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Compartilhar Cliente */}
      {client && (
        <ShareClientModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          clientId={client.id}
          clientName={client.nome}
          onSuccess={() => {
            toast.success('Cliente compartilhado com sucesso!');
          }}
        />
      )}

      {/* Modal de Ver Compartilhamentos */}
      {showSharedWithModal && client && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl">
            <div className="sticky top-0 bg-gradient-to-r from-purple-50 to-purple-100 border-b border-purple-200 px-6 py-4 flex justify-between items-center rounded-t-lg">
              <h3 className="text-lg font-semibold text-gray-900">
                Compartilhamentos - {client.nome}
              </h3>
              <button
                onClick={() => setShowSharedWithModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <SharedWithList
                clientId={client.id}
                clientName={client.nome}
                onUnshare={() => {
                  toast.success('Compartilhamento removido com sucesso!');
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
