import { useState } from 'react'
import { ServiceTask } from '../lib/supabase'
import { supabase } from '../lib/supabase'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { X, Calendar, Clock, MapPin, CheckCircle2, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface TaskDetailModalProps {
  task: ServiceTask & {
    services?: {
      clients?: {
        nome: string
      }
      data_inicio?: string
      data_fim?: string
    }
  }
  onClose: () => void
  onUpdate: () => void
}

export default function TaskDetailModal({ task, onClose, onUpdate }: TaskDetailModalProps) {
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    data_prevista: task.data_prevista,
    horario_previsto: task.horario_previsto,
    local_encontro: task.local_encontro || '',
    observacoes: task.observacoes || ''
  })

  const isBuscar = task.tipo === 'buscar_chave'
  const isConcluido = task.status === 'concluido'
  const clientName = task.services?.clients?.nome || 'Cliente não identificado'

  const handleMarkAsCompleted = async () => {
    try {
      setLoading(true)

      const { error } = await supabase
        .from('service_tasks')
        .update({
          status: 'concluido',
          concluido_em: new Date().toISOString()
        })
        .eq('id', task.id)

      if (error) throw error

      toast.success('Tarefa marcada como concluída!')
      onUpdate()
      onClose()
    } catch (error) {
      console.error('Erro ao marcar tarefa:', error)
      toast.error('Erro ao marcar tarefa como concluída')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsPending = async () => {
    try {
      setLoading(true)

      const { error } = await supabase
        .from('service_tasks')
        .update({
          status: 'pendente',
          concluido_em: null
        })
        .eq('id', task.id)

      if (error) throw error

      toast.success('Tarefa marcada como pendente!')
      onUpdate()
      onClose()
    } catch (error) {
      console.error('Erro ao marcar tarefa:', error)
      toast.error('Erro ao marcar tarefa como pendente')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveChanges = async () => {
    try {
      setLoading(true)

      const { error } = await supabase
        .from('service_tasks')
        .update({
          data_prevista: formData.data_prevista,
          horario_previsto: formData.horario_previsto,
          local_encontro: formData.local_encontro,
          observacoes: formData.observacoes
        })
        .eq('id', task.id)

      if (error) throw error

      toast.success('Tarefa atualizada!')
      setIsEditing(false)
      onUpdate()
      onClose()
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error)
      toast.error('Erro ao atualizar tarefa')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = () => {
    switch (task.status) {
      case 'concluido':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">✓ Concluído</span>
      case 'agendado_cliente':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">📅 Agendado com cliente</span>
      case 'cancelado':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">✕ Cancelado</span>
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">⏳ Pendente</span>
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`p-6 border-b ${
          isBuscar ? 'bg-yellow-50' : 'bg-green-50'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{isBuscar ? '🔑' : '🔓'}</span>
                <h2 className="text-xl font-semibold">
                  {isBuscar ? 'Buscar Chave' : 'Devolver Chave'}
                </h2>
              </div>
              <p className="text-sm text-gray-600">{clientName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <div className="flex items-center gap-2">
              {getStatusBadge()}
            </div>
          </div>

          {/* Data e Horário */}
          {isEditing ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar size={16} className="inline mr-1" />
                  Data Prevista
                </label>
                <input
                  type="date"
                  value={formData.data_prevista}
                  onChange={(e) => setFormData({ ...formData, data_prevista: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock size={16} className="inline mr-1" />
                  Horário Previsto
                </label>
                <input
                  type="time"
                  value={formData.horario_previsto}
                  onChange={(e) => setFormData({ ...formData, horario_previsto: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data e Horário
              </label>
              <div className="flex items-center gap-4 text-gray-900">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-gray-500" />
                  <span>{format(parseISO(task.data_prevista), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-gray-500" />
                  <span>{task.horario_previsto?.substring(0, 5)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Local de Encontro */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin size={16} className="inline mr-1" />
              Local de Encontro
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.local_encontro}
                onChange={(e) => setFormData({ ...formData, local_encontro: e.target.value })}
                placeholder="Ex: Portaria do prédio"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            ) : (
              <p className="text-gray-900">
                {task.local_encontro || <span className="text-gray-400 italic">Não especificado</span>}
              </p>
            )}
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações
            </label>
            {isEditing ? (
              <textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Observações sobre a tarefa..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            ) : (
              <p className="text-gray-900 whitespace-pre-wrap">
                {task.observacoes || <span className="text-gray-400 italic">Sem observações</span>}
              </p>
            )}
          </div>

          {/* Informações do Serviço */}
          {task.services && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Período do Serviço</h3>
              <div className="text-sm text-gray-600">
                {task.services.data_inicio && task.services.data_fim ? (
                  <>
                    {format(parseISO(task.services.data_inicio), "dd/MM/yyyy", { locale: ptBR })}
                    {' até '}
                    {format(parseISO(task.services.data_fim), "dd/MM/yyyy", { locale: ptBR })}
                  </>
                ) : (
                  <span className="italic">Datas não disponíveis</span>
                )}
              </div>
            </div>
          )}

          {/* Data de Conclusão */}
          {task.concluido_em && (
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="text-sm text-green-800">
                <CheckCircle2 size={16} className="inline mr-1" />
                Concluído em {format(parseISO(task.concluido_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t bg-gray-50 flex gap-3">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveChanges}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={() => setIsEditing(true)}
                disabled={loading || isConcluido}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Reagendar
              </button>
              {isConcluido ? (
                <button
                  onClick={handleMarkAsPending}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <XCircle size={18} />
                  {loading ? 'Processando...' : 'Marcar como Pendente'}
                </button>
              ) : (
                <button
                  onClick={handleMarkAsCompleted}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  {loading ? 'Processando...' : 'Marcar como Concluído'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
