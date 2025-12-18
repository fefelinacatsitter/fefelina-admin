import { X, Calendar, Clock, Phone, User, MessageSquare } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Lead {
  id: string
  nome: string
  telefone?: string | null
  status: string
}

interface Client {
  id?: string
  nome: string
  telefone?: string | null
  endereco_completo?: string | null
}

interface Visit {
  id: string
  data: string
  horario: string
  duracao_minutos?: number
  status: string
  observacoes?: string
  leads?: Lead | null
  lead_id?: string | null
  clients?: Client | null
  client_id?: string | null
}

interface PreEncontroDetalhesModalProps {
  visit: Visit
  onClose: () => void
}

const statusColors = {
  novo: 'bg-blue-100 text-blue-800',
  aguardando_resposta: 'bg-yellow-100 text-yellow-800',
  respondeu: 'bg-green-100 text-green-800',
  em_negociacao: 'bg-purple-100 text-purple-800',
  convertido: 'bg-emerald-100 text-emerald-800',
  perdido: 'bg-red-100 text-red-800',
  sem_interesse: 'bg-gray-100 text-gray-800'
}

const statusLabels = {
  novo: 'Novo',
  aguardando_resposta: 'Aguardando Resposta',
  respondeu: 'Respondeu',
  em_negociacao: 'Em Negociação',
  convertido: 'Convertido',
  perdido: 'Perdido',
  sem_interesse: 'Sem Interesse'
}

export default function PreEncontroDetalhesModal({ visit, onClose }: PreEncontroDetalhesModalProps) {
  const calcularHorarioFim = () => {
    const [horas, minutos] = visit.horario.split(':').map(Number)
    const duracao = visit.duracao_minutos || 30 // Default 30 minutos
    const totalMinutos = horas * 60 + minutos + duracao
    const horasFim = Math.floor(totalMinutos / 60)
    const minutosFim = totalMinutos % 60
    return `${horasFim.toString().padStart(2, '0')}:${minutosFim.toString().padStart(2, '0')}`
  }

  // Determinar se é lead ou cliente
  const isLead = !!visit.lead_id && !!visit.leads
  const isClient = !!visit.client_id && !!visit.clients
  const contactName = isLead ? visit.leads?.nome : visit.clients?.nome
  const contactPhone = isLead ? visit.leads?.telefone : visit.clients?.telefone

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header com gradiente */}
        <div className="bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex-1">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              Pré-Encontro {isClient ? 'com Cliente' : 'com Lead'}
            </h2>
            <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {format(parseISO(visit.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Informações do Lead ou Cliente - 2 colunas */}
          <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-primary-900 uppercase mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              {isClient ? 'Cliente' : 'Lead'}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-medium text-primary-700 uppercase block mb-1">
                  Nome
                </label>
                <p className="text-base font-semibold text-primary-900">
                  {contactName || 'Não identificado'}
                </p>
              </div>
              
              {contactPhone && (
                <div>
                  <label className="text-xs font-medium text-primary-700 uppercase block mb-1">
                    <Phone className="w-3 h-3 inline mr-1" />
                    Telefone
                  </label>
                  <a 
                    href={`https://wa.me/${contactPhone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
                  >
                    {contactPhone}
                  </a>
                </div>
              )}

              {isLead && visit.leads?.status && (
                <div>
                  <label className="text-xs font-medium text-primary-700 uppercase block mb-1">
                    Status do Lead
                  </label>
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                    statusColors[visit.leads.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
                  }`}>
                    {statusLabels[visit.leads.status as keyof typeof statusLabels] || visit.leads.status}
                  </span>
                </div>
              )}
              
              {isClient && (
                <div>
                  <label className="text-xs font-medium text-primary-700 uppercase block mb-1">
                    Tipo
                  </label>
                  <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                    Cliente Cadastrado
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Informações do Encontro */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1 mb-2">
                <Clock className="w-3 h-3" />
                Horário
              </label>
              <p className="text-base font-medium text-gray-900">
                {visit.horario.substring(0, 5)} - {calcularHorarioFim()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                ⏱️ Duração: {visit.duracao_minutos || 30} minutos
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">
                Status
              </label>
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                visit.status === 'agendada' ? 'bg-blue-100 text-blue-800' :
                visit.status === 'realizada' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                {visit.status === 'agendada' ? 'Agendado' :
                 visit.status === 'realizada' ? 'Realizado' : 'Cancelado'}
              </span>
            </div>
          </div>

          {/* Observações */}
          {visit.observacoes && (
            <div className="border-t border-gray-200 pt-3">
              <label className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                Observações
              </label>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                {visit.observacoes}
              </p>
            </div>
          )}

          {/* Info sobre pré-encontro */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <span className="font-semibold">💡 Dica:</span> {isClient 
                ? 'Este é um pré-encontro com um cliente que já fechou serviço. Use este tempo para conhecer o cliente e os gatinhos dele pessoalmente.'
                : 'Este é um pré-encontro com um lead. Use este tempo para conhecer o cliente em potencial e apresentar seus serviços.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
