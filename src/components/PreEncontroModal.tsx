import { useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Calendar, Clock, FileText, X } from 'lucide-react'

interface PreEncontroModalProps {
  leadId: string
  leadNome: string
  onClose: () => void
  onSuccess: () => void
  initialDate?: string
  initialTime?: string
}

export default function PreEncontroModal({
  leadId,
  leadNome,
  onClose,
  onSuccess,
  initialDate,
  initialTime
}: PreEncontroModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    data: initialDate || new Date().toISOString().split('T')[0],
    horario: initialTime || '10:00',
    observacoes: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.data || !formData.horario) {
      toast.error('Data e horário são obrigatórios')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('visits')
        .insert({
          lead_id: leadId,
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
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Erro ao agendar pré-encontro:', error)
      toast.error('Erro ao agendar pré-encontro: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header compacto com gradiente */}
        <div className="sticky top-0 bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-200 px-6 py-3 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Agendar Pré-Encontro</h2>
            <p className="text-xs text-gray-600 mt-0.5">Lead: {leadNome}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
              <FileText className="w-3.5 h-3.5" />
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
              <strong>Dica:</strong> Este pré-encontro aparecerá na agenda com cor azul para fácil identificação.
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
              className="flex-1 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Agendando...' : 'Agendar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
