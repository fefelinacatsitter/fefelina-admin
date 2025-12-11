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
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">Agendar Pré-Encontro</h2>
              <p className="text-blue-100 text-sm mt-1">Lead: {leadNome}</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Data */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Data do Encontro
            </label>
            <input
              type="date"
              value={formData.data}
              onChange={(e) => setFormData({ ...formData, data: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Horário */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Horário de Início
            </label>
            <input
              type="time"
              value={formData.horario}
              onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              ⏱️ Duração: 30 minutos
            </p>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Observações
            </label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={3}
              placeholder="Ex: Primeiro contato, conhecer os gatinhos, ver a casa..."
            />
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>💡 Dica:</strong> Este pré-encontro aparecerá na agenda com cor azul para fácil identificação.
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
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Agendando...' : 'Agendar Pré-Encontro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
