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
          tipo_visita: 'inteira', // Valor padrão (não relevante para pré-encontro)
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white p-6 rounded-t-2xl flex-shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">Agendar Pré-Encontro</h2>
              <p className="text-cyan-100 text-sm mt-1">A partir da agenda</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Selecionar Lead */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-600" />
              Selecionar Lead
            </label>
            {loadingLeads ? (
              <div className="text-center py-4 text-gray-500">Carregando leads...</div>
            ) : leads.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                Nenhum lead disponível. Crie um lead primeiro na página de Leads.
              </div>
            ) : (
              <div className="relative" ref={dropdownRef}>
                {/* Botão do dropdown */}
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
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
                  <div className="absolute z-[100] w-full mt-1 bg-white border-2 border-cyan-300 rounded-xl shadow-2xl max-h-60 overflow-auto">
                    {leads.map((lead) => (
                      <button
                        key={lead.id}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, leadId: lead.id })
                          setDropdownOpen(false)
                        }}
                        className={`w-full px-4 py-2.5 text-left hover:bg-cyan-50 transition-colors flex flex-col gap-0.5 border-b border-gray-100 last:border-b-0 first:rounded-t-xl last:rounded-b-xl ${
                          formData.leadId === lead.id ? 'bg-cyan-50 text-cyan-900' : 'text-gray-900'
                        }`}
                      >
                        <span className="font-medium">{lead.nome}</span>
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
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-600" />
              Data do Encontro
            </label>
            <input
              type="date"
              value={formData.data}
              onChange={(e) => setFormData({ ...formData, data: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              required
            />
          </div>

          {/* Horário */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-600" />
              Horário de Início
            </label>
            <input
              type="time"
              value={formData.horario}
              onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              ⏱️ Duração: 30 minutos
            </p>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações
            </label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-none"
              rows={3}
              placeholder="Ex: Primeiro contato, conhecer os gatinhos, ver a casa..."
            />
          </div>

          {/* Info */}
          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
            <p className="text-sm text-cyan-800">
              <strong>💡 Dica:</strong> Este pré-encontro aparecerá na agenda com cor azul claro para fácil identificação.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || leads.length === 0}
            >
              {loading ? 'Agendando...' : 'Agendar Pré-Encontro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
