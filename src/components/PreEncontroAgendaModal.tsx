import { useState, useEffect, useRef } from 'react'
import { supabase, Lead } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Calendar, Clock, User, X, ChevronDown } from 'lucide-react'

interface PreEncontroAgendaModalProps {
  initialDate?: string
  initialTime?: string
  onClose: () => void
  onSuccess: () => void
}

export default function PreEncontroAgendaModal({
  initialDate,
  initialTime,
  onClose,
  onSuccess
}: PreEncontroAgendaModalProps) {
  const [loading, setLoading] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [loadingLeads, setLoadingLeads] = useState(true)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [formData, setFormData] = useState({
    leadId: '',
    data: initialDate || new Date().toISOString().split('T')[0],
    horario: initialTime || '10:00',
    observacoes: ''
  })

  useEffect(() => {
    fetchLeads()
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

  const fetchLeads = async () => {
    try {
      setLoadingLeads(true)
      // Buscar apenas leads que não estão fechados (ganho ou perdido)
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .not('status', 'in', '("fechado_perdido")')
        .order('nome')

      if (error) throw error
      setLeads(data || [])
    } catch (error: any) {
      console.error('Erro ao buscar leads:', error)
      toast.error('Erro ao carregar leads')
    } finally {
      setLoadingLeads(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.leadId) {
      toast.error('Selecione um lead')
      return
    }
    
    if (!formData.data || !formData.horario) {
      toast.error('Data e horário são obrigatórios')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('visits')
        .insert({
          lead_id: formData.leadId,
          data: formData.data,
          horario: formData.horario,
          duracao_minutos: 30, // Pré-encontros sempre têm 30 minutos
          tipo_encontro: 'pre_encontro',
          tipo_visita: 'meia', // Pré-encontros sempre são "meia" (30min)
          valor: 0, // Sem valor para pré-encontro
          desconto_plataforma: 0,
          status: 'agendada',
          observacoes: formData.observacoes || null
        })

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
          {/* Selecionar Lead */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
              <User className="w-3.5 h-3.5" />
              Selecionar Lead
            </label>
            {loadingLeads ? (
              <div className="text-center py-4 text-sm text-gray-500">Carregando leads...</div>
            ) : leads.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-xs text-yellow-800">
                Nenhum lead disponível. Crie um lead primeiro na página de Leads.
              </div>
            ) : (
              <div className="relative" ref={dropdownRef}>
                {/* Botão do dropdown */}
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className={formData.leadId ? 'text-gray-900' : 'text-gray-500'}>
                    {formData.leadId
                      ? leads.find(l => l.id === formData.leadId)?.nome || 'Selecione um lead...'
                      : 'Selecione um lead...'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Lista de opções */}
                {dropdownOpen && (
                  <div className="absolute z-[100] w-full mt-1 bg-white border-2 border-purple-300 rounded-md shadow-xl max-h-60 overflow-auto">
                    {leads.map((lead) => (
                      <button
                        key={lead.id}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, leadId: lead.id })
                          setDropdownOpen(false)
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-purple-50 transition-colors flex flex-col gap-0.5 border-b border-gray-100 last:border-b-0 first:rounded-t-md last:rounded-b-md ${
                          formData.leadId === lead.id ? 'bg-purple-50 text-purple-900' : 'text-gray-900'
                        }`}
                      >
                        <span className="text-sm font-medium">{lead.nome}</span>
                        <span className="text-xs text-gray-500">
                          {lead.telefone || 'Sem telefone'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
              disabled={loading || !formData.leadId}
            >
              {loading ? 'Agendando...' : 'Agendar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
