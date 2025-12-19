import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'
import { X } from 'lucide-react'

interface Service {
  id: string
  nome_servico: string | null
  clients: {
    nome: string
  }
}

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialDate?: string
  initialTime?: string
  editingTask?: any
}

export default function TaskModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  initialDate = '', 
  initialTime = '09:00',
  editingTask
}: TaskModalProps) {
  const [loading, setLoading] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [formData, setFormData] = useState({
    titulo: '',
    service_id: '',
    data: initialDate,
    horario: initialTime,
    observacoes: '',
    responsavel: null as 'fernanda' | 'andre' | null
  })

  useEffect(() => {
    if (isOpen) {
      fetchServices()
    }
  }, [isOpen])

  // Separar o efeito de inicialização do form
  useEffect(() => {
    if (isOpen && services.length > 0) {
      if (editingTask) {
        setFormData({
          titulo: editingTask.titulo || '',
          service_id: editingTask.service_id || '',
          data: editingTask.data || initialDate,
          horario: editingTask.horario?.substring(0, 5) || initialTime,
          observacoes: editingTask.observacoes || '',
          responsavel: editingTask.responsavel || null
        })
        // Preencher o searchTerm com o nome do serviço se estiver editando
        const service = services.find(s => s.id === editingTask.service_id)
        if (service) {
          setSearchTerm(`${service.clients.nome} - ${service.nome_servico || 'Sem nome'}`)
        }
      } else if (!formData.titulo && !formData.service_id) {
        // Só inicializa se o form estiver vazio (primeira vez abrindo)
        setFormData({
          titulo: '',
          service_id: '',
          data: initialDate,
          horario: initialTime,
          observacoes: '',
          responsavel: null
        })
        setSearchTerm('')
      }
    }
  }, [isOpen, services, editingTask])

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => setShowDropdown(false)
    if (showDropdown) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showDropdown])

  const fetchServices = async () => {
    try {
      // Buscar serviços ativos (data_fim >= hoje)
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('services')
        .select(`
          id,
          nome_servico,
          data_fim,
          clients!inner (
            nome
          )
        `)
        .gte('data_fim', today)
        .order('data_inicio', { ascending: false })

      if (error) throw error
      
      // Transformar os dados para o formato correto
      const transformedData = (data || []).map((service: any) => ({
        id: service.id,
        nome_servico: service.nome_servico,
        clients: {
          nome: Array.isArray(service.clients) ? service.clients[0]?.nome : service.clients?.nome
        }
      }))
      
      setServices(transformedData)
    } catch (error: any) {
      console.error('Erro ao buscar serviços:', error)
      toast.error('Erro ao carregar serviços')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.titulo.trim()) {
      toast.error('Digite um título para a task')
      return
    }

    if (!formData.service_id) {
      toast.error('Selecione um serviço')
      return
    }

    if (!formData.data) {
      toast.error('Selecione uma data')
      return
    }

    setLoading(true)

    try {
      // Buscar o client_id do serviço selecionado
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('client_id')
        .eq('id', formData.service_id)
        .single()

      if (serviceError) throw serviceError

      const visitData = {
        titulo: formData.titulo.trim(),
        service_id: formData.service_id,
        client_id: serviceData.client_id,
        data: formData.data,
        horario: formData.horario + ':00',
        tipo_visita: 'meia' as const,
        tipo_encontro: 'task' as const,
        duracao_minutos: 30,
        valor: 0,
        status: 'agendada' as const,
        desconto_plataforma: 0,
        observacoes: formData.observacoes.trim() || null,
        responsavel: formData.responsavel
      }

      if (editingTask) {
        const { error } = await supabase
          .from('visits')
          .update(visitData)
          .eq('id', editingTask.id)

        if (error) throw error
        toast.success('Task atualizada com sucesso!')
      } else {
        const { error } = await supabase
          .from('visits')
          .insert([visitData])

        if (error) throw error
        toast.success('Task criada com sucesso!')
      }

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Erro ao salvar task:', error)
      toast.error(`Erro ao salvar task: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Filtrar serviços baseado no termo de busca
  const filteredServices = services.filter(service => {
    const clientName = service.clients.nome.toLowerCase()
    const serviceName = (service.nome_servico || '').toLowerCase()
    const search = searchTerm.toLowerCase()
    return clientName.includes(search) || serviceName.includes(search)
  })

  const handleSelectService = (service: Service) => {
    setFormData({ ...formData, service_id: service.id })
    setSearchTerm(`${service.clients.nome} - ${service.nome_servico || 'Sem nome'}`)
    setShowDropdown(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header com gradiente - seguindo padrão das outras modais */}
        <div className="bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {editingTask ? 'Editar Task' : 'Nova Task'}
            </h2>
            <p className="text-xs text-gray-600 mt-0.5">
              {editingTask ? 'Atualizar informações da task' : 'Criar nova tarefa vinculada a serviço'}
            </p>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título *
            </label>
            <input
              type="text"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Ex: Comprar ração, Levar ao veterinário..."
              required
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Serviço *
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setShowDropdown(true)
              }}
              onFocus={() => setShowDropdown(true)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Digite para buscar cliente ou serviço..."
              required={!formData.service_id}
            />
            
            {/* Dropdown de resultados */}
            {showDropdown && filteredServices.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {filteredServices.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => handleSelectService(service)}
                    className="w-full text-left px-3 py-2 hover:bg-primary-50 focus:bg-primary-50 focus:outline-none transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-gray-900">{service.clients.nome}</div>
                    <div className="text-sm text-gray-600">{service.nome_servico || 'Sem nome'}</div>
                  </button>
                ))}
              </div>
            )}
            
            {/* Mensagem quando não há resultados */}
            {showDropdown && searchTerm && filteredServices.length === 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-3 text-sm text-gray-500">
                Nenhum serviço encontrado
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data *
              </label>
              <input
                type="date"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Horário *
              </label>
              <input
                type="time"
                value={formData.horario}
                onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Responsável
            </label>
            <select
              value={formData.responsavel || ''}
              onChange={(e) => setFormData({ ...formData, responsavel: e.target.value as 'fernanda' | 'andre' | null || null })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Não atribuído</option>
              <option value="fernanda">Fernanda</option>
              <option value="andre">André</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações
            </label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
              placeholder="Detalhes adicionais sobre a task..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
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
              disabled={loading}
            >
              {loading ? 'Salvando...' : (editingTask ? 'Atualizar' : 'Criar Task')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
