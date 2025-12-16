import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Copy } from 'lucide-react'
import CatLoader from '../components/CatLoader'
import ClientCombobox from '../components/ClientCombobox'

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
  desconto_plataforma: number
  observacoes?: string
}

interface Client {
  id: string
  nome: string
  valor_diaria: number
  valor_duas_visitas: number
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
  const [services, setServices] = useState<Service[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
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
  
  // Estados para filtros
  const [selectedFilter, setSelectedFilter] = useState<'ativos' | 'concluidos' | 'todos'>('ativos')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  
  const [formData, setFormData] = useState<{
    nome_servico: string
    client_id: string
    status_pagamento: 'pendente' | 'pendente_plataforma' | 'pago_parcialmente' | 'pago'
    desconto_plataforma_default: number
  }>({
    nome_servico: '',
    client_id: '',
    status_pagamento: 'pendente',
    desconto_plataforma_default: 0
  })

  // States para múltiplas visitas
  const [multiVisitDays, setMultiVisitDays] = useState(1);

  useEffect(() => {
    fetchServices()
    fetchClients()
  }, [selectedFilter, filterStartDate, filterEndDate])

  const fetchServices = async () => {
    try {
      let query = supabase
        .from('services')
        .select(`
          *,
          clients (
            nome,
            valor_diaria,
            valor_duas_visitas
          )
        `)

      // Aplicar ordenação baseada no filtro selecionado
      if (selectedFilter === 'concluidos' || selectedFilter === 'todos') {
        // Para serviços concluídos e todos: ordenar por data_inicio decrescente (mais recentes primeiro)
        query = query.order('data_inicio', { ascending: false })
      } else {
        // Para serviços ativos: manter ordenação por created_at decrescente
        query = query.order('created_at', { ascending: false })
      }

      const { data, error } = await query

      if (error) throw error
      
      // Obter data de hoje
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')
      const todayStr = `${year}-${month}-${day}`
      
      let filteredServices = data || []
      
      // Aplicar filtros
      switch (selectedFilter) {
        case 'ativos':
          // Serviços ativos: data_fim >= hoje OU status_pagamento !== 'pago'
          filteredServices = filteredServices.filter(service => 
            service.data_fim >= todayStr || service.status_pagamento !== 'pago'
          )
          break
        case 'concluidos':
          // Serviços concluídos: data_fim < hoje E status_pagamento = 'pago'
          filteredServices = filteredServices.filter(service => 
            service.data_fim < todayStr && service.status_pagamento === 'pago'
          )
          
          // Se não houver filtro de data específico, limitar aos últimos 6 meses
          if (!filterStartDate && !filterEndDate) {
            const sixMonthsAgo = new Date()
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
            const sixMonthsAgoStr = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-${String(sixMonthsAgo.getDate()).padStart(2, '0')}`
            
            filteredServices = filteredServices.filter(service => 
              service.data_inicio >= sixMonthsAgoStr
            )
          }
          break
        case 'todos':
          // Todos os serviços - sem filtro por status, mas com limite de período
          // Se não houver filtro de data específico, limitar aos últimos 6 meses
          if (!filterStartDate && !filterEndDate) {
            const sixMonthsAgo = new Date()
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
            const sixMonthsAgoStr = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-${String(sixMonthsAgo.getDate()).padStart(2, '0')}`
            
            filteredServices = filteredServices.filter(service => 
              service.data_inicio >= sixMonthsAgoStr
            )
          }
          break
      }
      
      // Aplicar filtro por data se especificado
      if (filterStartDate) {
        filteredServices = filteredServices.filter(service => 
          service.data_inicio >= filterStartDate
        )
      }
      
      if (filterEndDate) {
        filteredServices = filteredServices.filter(service => 
          service.data_fim <= filterEndDate
        )
      }
      
      setServices(filteredServices)
    } catch (error) {
      console.error('Erro ao buscar serviços:', error)
    } finally {
      setLoading(false)
    }
  }

  // Função para filtrar serviços por busca de cliente
  const getFilteredServices = () => {
    if (!searchQuery.trim()) {
      return services
    }
    
    const query = searchQuery.toLowerCase().trim()
    return services.filter(service => 
      service.clients?.nome.toLowerCase().includes(query) ||
      service.nome_servico?.toLowerCase().includes(query)
    )
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
        status_pagamento: service.status_pagamento || 'pendente',
        desconto_plataforma_default: service.desconto_plataforma_default
      })
      setSelectedClient(clients.find(c => c.id === service.client_id) || null)
      fetchVisitsForService(service.id)
    } else {
      setEditingService(null)
      setFormData({
        nome_servico: '',
        client_id: '',
        status_pagamento: 'pendente',
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
        .select('id, service_id, data, horario, tipo_visita, valor, status, desconto_plataforma, observacoes, client_id, created_at')
        .eq('service_id', serviceId)
        .order('data', { ascending: true })

      if (error) throw error
      setVisits(data || [])
    } catch (error) {
      console.error('Erro ao buscar visitas:', error)
    }
  }

  const copyWhatsAppMessage = async (service: Service) => {
    try {
      // Buscar as visitas do serviço
      const { data: visitsData, error } = await supabase
        .from('visits')
        .select('data')
        .eq('service_id', service.id)
        .eq('status', 'agendada')
        .order('data', { ascending: true })

      if (error) throw error

      const visits = visitsData || []
      
      // Formatar as datas das visitas
      const formattedDates = visits.map(visit => {
        const [year, month, day] = visit.data.split('-')
        return `• ${day}/${month}/${year}`
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

Peço, por gentileza, que valide as datas informadas acima.
Após o pagamento, enviar o comprovante.
Fico à disposição para qualquer ajuste ou dúvida.
Será um prazer cuidar do(s) seu(s) gatinho(s)! 💙🐾`

      // Copiar para a área de transferência
      await navigator.clipboard.writeText(message)
      toast.success('Mensagem copiada! Cole no WhatsApp 📋')
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
      desconto_plataforma_default: 0
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

      // Inserir visitas com o desconto atualizado
      const visitsToInsert = visits.map(visit => {
        // Remove o ID para permitir que o banco gere novos IDs
        const { id, ...visitWithoutId } = visit
        return {
          ...visitWithoutId,
          service_id: savedService.id,
          client_id: formData.client_id,
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

      toast.success(
        editingService 
          ? `Serviço "${formData.nome_servico || 'Sem nome'}" atualizado com ${visits.length} visita(s)!`
          : `Serviço "${formData.nome_servico || 'Sem nome'}" criado com ${visits.length} visita(s)!`
      )

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
      setViewingVisits(visitsData || [])
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
    if (!selectedClient || multiVisitDays < 1) return;
    if (visits.length === 0) {
      toast.error("Cadastre pelo menos uma visita para usar como base!")
      return;
    }
    
    const base = visits[0];
    const newVisits = [];
    
    // Se a visita base for do tipo "meia", gera 2 visitas por dia (09:00 e 18:00)
    if (base.tipo_visita === 'meia') {
      // Calcula quantos dias completos precisamos (cada dia tem 2 visitas)
      const totalDays = Math.ceil(multiVisitDays / 2);
      
      for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
        const date = new Date(base.data + 'T00:00:00');
        date.setDate(date.getDate() + dayIndex);
        const dateStr = date.toISOString().slice(0, 10);
        
        // Primeira visita do dia (09:00)
        if (newVisits.length < multiVisitDays) {
          newVisits.push({
            ...base,
            data: dateStr,
            horario: '09:00'
          });
        }
        
        // Segunda visita do dia (18:00)
        if (newVisits.length < multiVisitDays) {
          newVisits.push({
            ...base,
            data: dateStr,
            horario: '18:00'
          });
        }
      }
    } else {
      // Se for visita "inteira", gera 1 visita por dia
      for (let i = 0; i < multiVisitDays; i++) {
        const date = new Date(base.data + 'T00:00:00');
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().slice(0, 10);
        newVisits.push({
          ...base,
          data: dateStr
        });
      }
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
            {getFilteredServices().length} serviço(s) encontrado(s)
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
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                selectedFilter === 'ativos'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Ativos
            </button>
            <button
              onClick={() => setSelectedFilter('concluidos')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                selectedFilter === 'concluidos'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Concluídos
              {selectedFilter === 'concluidos' && !filterStartDate && !filterEndDate && (
                <span className="ml-1 text-xs opacity-75">(6m)</span>
              )}
            </button>
            <button
              onClick={() => setSelectedFilter('todos')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                selectedFilter === 'todos'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Todos
            </button>
          </div>
          
          {/* Filtros por data (apenas quando "concluidos" ou "todos" estiver selecionado) */}
          {(selectedFilter === 'concluidos' || selectedFilter === 'todos') && (
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
              {(filterStartDate || filterEndDate) && (
                <button
                  onClick={() => {
                    setFilterStartDate('')
                    setFilterEndDate('')
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded"
                >
                  Limpar
                </button>
              )}
            </div>
          )}
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
      ) : getFilteredServices().length === 0 ? (
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
        <div className="mt-8 grid grid-cols-1 gap-3">
          {getFilteredServices().map((service) => (
            <div key={service.id} className="card-fefelina">
              <div 
                className="p-3 cursor-pointer md:cursor-default"
                onClick={() => {
                  // No mobile, clique no card abre os detalhes
                  if (window.innerWidth < 768) {
                    openDetailsModal(service)
                  }
                }}
                onTouchStart={() => handleMobilePress(service)}
                onTouchEnd={handleMobileRelease}
                onTouchCancel={handleMobileRelease}
              >
                {/* Layout horizontal: Info do serviço | Métricas | Status | Ações */}
                <div className="flex flex-col md:flex-row md:items-center gap-2">
                  {/* Informações do serviço */}
                  <div className="flex-1 min-w-0 pr-3">
                    <h3 className="text-sm font-semibold text-gray-900 truncate mb-1">
                      {service.nome_servico || `Serviço para ${service.clients?.nome}`}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="font-medium">{service.clients?.nome}</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-500">{formatDate(service.data_inicio)} - {formatDate(service.data_fim)}</span>
                    </div>
                  </div>
                  
                  {/* Métricas centralizadas - lado a lado no desktop, empilhadas no mobile */}
                  <div className="flex flex-col md:flex-row items-center justify-center gap-4 px-2 min-w-0 md:min-w-[240px] w-full md:w-auto">
                    <div className="text-center">
                      <div className="text-gray-500 font-medium mb-0.5 text-xs">Visitas</div>
                      <div className="font-semibold text-gray-900 text-sm">{service.total_visitas}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-500 font-medium mb-0.5 text-xs">Total</div>
                      <div className="font-semibold text-gray-900 text-sm">{formatCurrency(service.total_valor)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-500 font-medium mb-0.5 text-xs">A Receber</div>
                      <div className="font-semibold text-primary-600 text-sm">{formatCurrency(service.total_a_receber)}</div>
                    </div>
                  </div>
                  
                  {/* Status e botões de ação - área fixa à direita */}
                  <div className="flex flex-col md:flex-col items-center space-y-2 md:space-y-2 flex-shrink-0 pl-0 md:pl-6">
                    <div className="flex flex-col items-center space-y-1">
                      {getPaymentStatusBadge(service.status_pagamento)}
                    </div>
                    
                    {/* Botões visíveis apenas no desktop */}
                    <div className="hidden md:flex flex-col gap-2">
                      {/* Linha de botões principais */}
                      <div className="flex flex-wrap items-center gap-2 justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openDetailsModal(service)
                          }}
                          className="inline-flex items-center px-2 py-1.5 border border-blue-300 shadow-sm text-xs font-medium rounded text-blue-700 bg-white hover:bg-blue-50 transition-colors"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Ver Detalhes
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openModal(service)
                          }}
                          className="inline-flex items-center px-2 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Editar
                        </button>
                      </div>
                      
                      {/* Linha de botões secundários */}
                      <div className="flex flex-wrap items-center gap-2 justify-center">
                        {service.status_pagamento !== 'pago' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              markServiceAsPaid(service.id)
                            }}
                            className="inline-flex items-center px-2 py-1.5 border border-green-300 shadow-sm text-xs font-medium rounded text-green-700 bg-white hover:bg-green-50 transition-colors"
                          >
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Marcar Pago
                          </button>
                        )}
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteService(service)
                          }}
                          disabled={deletingService === service.id}
                          className={`inline-flex items-center px-2 py-1.5 border border-red-300 shadow-sm text-xs font-medium rounded transition-colors ${
                            deletingService === service.id 
                              ? 'text-red-400 bg-red-50 cursor-not-allowed' 
                              : 'text-red-700 bg-white hover:bg-red-50'
                          }`}
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          {deletingService === service.id ? 'Excluindo...' : 'Excluir'}
                        </button>
                      </div>
                    </div>

                    {/* Indicador visual para mobile mostrando que o card é clicável */}
                    <div className="flex md:hidden items-center justify-center mt-2">
                      <div className="flex items-center text-xs text-gray-500">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Toque para ver detalhes • Mantenha pressionado para ações
                      </div>
                    </div>
                  </div>
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
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-200 px-6 py-3 flex justify-between items-center">
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

                  <div className="md:col-span-2 bg-primary-50 p-2.5 rounded-lg">
                    <h5 className="text-xs font-medium text-primary-900 mb-1.5">ℹ️ Informações automáticas</h5>
                    <ul className="text-xs text-primary-800 space-y-0.5">
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
                        className="inline-flex items-center px-2.5 py-1.5 shadow-sm text-xs font-medium rounded text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Adicionar Visita
                      </button>
                      {/* Botão e inputs para gerar múltiplas visitas */}
                      <div className="flex flex-row gap-1.5 items-center">
                        <input
                          type="number"
                          id="multiVisitDays"
                          min="1"
                          max="60"
                          className="border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 w-16"
                          value={multiVisitDays}
                          onChange={e => setMultiVisitDays(Number(e.target.value))}
                          disabled={!selectedClient || visits.length === 0}
                          placeholder="Qtd"
                        />
                        <button
                          type="button"
                          onClick={handleGenerateMultipleVisits}
                          disabled={!selectedClient || visits.length === 0 || multiVisitDays < 1}
                          className="inline-flex items-center px-2.5 py-1.5 shadow-sm text-xs font-medium rounded text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap transition-colors"
                        >
                          Gerar Múltiplas
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

                          {/* Observações */}
                          <div className="mt-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Observações
                            </label>
                            <textarea
                              value={visit.observacoes || ''}
                              onChange={(e) => updateVisit(index, 'observacoes', e.target.value)}
                              rows={1}
                              className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                              placeholder="Observações..."
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Resumo dos Totais */}
                {visits.length > 0 && (
                  <div className="border-t pt-3">
                    <div className="bg-primary-50 rounded-lg p-2.5">
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
                          <span className="font-semibold ml-1 text-primary-600">{formatCurrency(totalAReceber)}</span>
                        </div>
                      </div>
                    </div>
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
                    className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {(editingService ? updating : submitting) ? (
                      <>
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
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
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeDetailsModal}></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-200 px-6 py-3 flex justify-between items-center">
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
                <div className="bg-primary-50 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Resumo Financeiro</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900">{viewingService.total_visitas}</div>
                      <div className="text-xs text-gray-600">Total de Visitas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900">{formatCurrency(viewingService.total_valor)}</div>
                      <div className="text-xs text-gray-600">Valor Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-primary-600">{formatCurrency(viewingService.total_a_receber)}</div>
                      <div className="text-xs text-gray-600">Valor a Receber</div>
                    </div>
                  </div>
                </div>

                {/* Lista de Visitas */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Visitas do Serviço</h4>
                  
                  {loadingDetails ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
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
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Observações
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
                                  {formatCurrency(visit.valor)}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                                  {visit.desconto_plataforma}%
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
                                <td className="px-3 py-2 text-xs text-gray-900 max-w-xs">
                                  <div className="truncate" title={visit.observacoes || ''}>
                                    {visit.observacoes || '-'}
                                  </div>
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
                                  <span className="ml-1 font-medium text-gray-900">{formatCurrency(visit.valor)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Desc:</span>
                                  <span className="ml-1 font-medium text-gray-900">{visit.desconto_plataforma}%</span>
                                </div>
                              </div>
                            </div>

                            {/* Observações (se houver) */}
                            {visit.observacoes && (
                              <div className="border-t border-gray-100 pt-2 mt-2">
                                <div className="text-xs text-gray-500 mb-0.5">Obs:</div>
                                <div className="text-xs text-gray-900 line-clamp-2">{visit.observacoes}</div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Botões de Ação */}
                <div className="flex justify-end space-x-2 pt-4 border-t px-6 pb-4">
                  <button
                    type="button"
                    onClick={closeDetailsModal}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      closeDetailsModal()
                      openModal(viewingService)
                    }}
                    className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-md text-sm font-medium transition-colors"
                  >
                    Editar Serviço
                  </button>
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
