import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Minus, History, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'

interface ClientCreditsProps {
  clientId: string
  clientName: string
  currentCredit: number
  onUpdate: () => void
}

interface CreditHistory {
  id: string
  tipo: 'adicao' | 'uso' | 'estorno'
  valor: number
  saldo_anterior: number
  saldo_novo: number
  descricao: string | null
  created_at: string
  service_id: string | null
}

export default function ClientCredits({ clientId, clientName, currentCredit, onUpdate }: ClientCreditsProps) {
  const [showModal, setShowModal] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [tipo, setTipo] = useState<'adicao' | 'estorno'>('adicao')
  const [valor, setValor] = useState('')
  const [descricao, setDescricao] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<CreditHistory[]>([])

  const handleAddCredit = async () => {
    if (!valor || parseFloat(valor) <= 0) {
      toast.error('Digite um valor válido')
      return
    }

    setLoading(true)
    try {
      const valorNumerico = parseFloat(valor)
      const novoSaldo = tipo === 'adicao' 
        ? currentCredit + valorNumerico
        : Math.max(0, currentCredit - valorNumerico)

      // Atualizar saldo do cliente
      const { error: updateError } = await supabase
        .from('clients')
        .update({ credito_disponivel: novoSaldo })
        .eq('id', clientId)

      if (updateError) throw updateError

      // Registrar no histórico
      const { error: historyError } = await supabase
        .from('client_credits_history')
        .insert({
          client_id: clientId,
          tipo,
          valor: valorNumerico,
          saldo_anterior: currentCredit,
          saldo_novo: novoSaldo,
          descricao: descricao || null
        })

      if (historyError) throw historyError

      toast.success(
        tipo === 'adicao' 
          ? `Crédito de ${formatCurrency(valorNumerico)} adicionado!`
          : `Crédito de ${formatCurrency(valorNumerico)} removido!`
      )

      setShowModal(false)
      setValor('')
      setDescricao('')
      onUpdate()
    } catch (error) {
      console.error('Erro ao gerenciar crédito:', error)
      toast.error('Erro ao atualizar crédito')
    } finally {
      setLoading(false)
    }
  }

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('client_credits_history')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setHistory(data || [])
      setShowHistory(true)
    } catch (error) {
      console.error('Erro ao carregar histórico:', error)
      toast.error('Erro ao carregar histórico')
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'adicao': return '💰 Adição'
      case 'uso': return '💳 Usado em Serviço'
      case 'estorno': return '↩️ Estorno'
      default: return tipo
    }
  }

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-gray-900">Créditos Disponíveis</h3>
        </div>
        <button
          onClick={loadHistory}
          className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
        >
          <History className="w-4 h-4" />
          Histórico
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-bold text-green-600">
            {formatCurrency(currentCredit)}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {currentCredit > 0 ? 'Será abatido no próximo serviço' : 'Nenhum crédito disponível'}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setTipo('adicao')
              setShowModal(true)
            }}
            className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            title="Adicionar crédito"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              setTipo('estorno')
              setShowModal(true)
            }}
            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            title="Remover crédito"
          >
            <Minus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Modal de Adicionar/Remover Crédito */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              {tipo === 'adicao' ? '💰 Adicionar Crédito' : '↩️ Remover Crédito'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente
                </label>
                <input
                  type="text"
                  value={clientName}
                  disabled
                  className="input-fefelina bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="0,00"
                  className="input-fefelina"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo/Descrição
                </label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Pagamento antecipado de serviço cancelado"
                  className="input-fefelina"
                  rows={3}
                />
              </div>

              <div className="bg-gray-50 rounded p-3 text-sm">
                <p className="text-gray-600">
                  Saldo atual: <strong>{formatCurrency(currentCredit)}</strong>
                </p>
                {valor && parseFloat(valor) > 0 && (
                  <p className="text-gray-600 mt-1">
                    Novo saldo: <strong className={tipo === 'adicao' ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(
                        tipo === 'adicao' 
                          ? currentCredit + parseFloat(valor)
                          : Math.max(0, currentCredit - parseFloat(valor))
                      )}
                    </strong>
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false)
                  setValor('')
                  setDescricao('')
                }}
                className="btn-fefelina-secondary flex-1"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handleAddCredit}
                className="btn-fefelina-primary flex-1"
                disabled={loading || !valor || parseFloat(valor) <= 0}
              >
                {loading ? 'Processando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Histórico */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">📜 Histórico de Créditos</h3>
              <p className="text-sm text-gray-600 mt-1">{clientName}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {history.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhuma movimentação registrada</p>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-lg border-l-4 ${
                        item.tipo === 'adicao' ? 'bg-green-50 border-green-500' :
                        item.tipo === 'uso' ? 'bg-blue-50 border-blue-500' :
                        'bg-red-50 border-red-500'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-gray-900">
                            {getTipoLabel(item.tipo)}
                          </p>
                          <p className="text-xs text-gray-500">{formatDate(item.created_at)}</p>
                        </div>
                        <p className={`text-lg font-bold ${
                          item.tipo === 'adicao' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.tipo === 'adicao' ? '+' : '-'}{formatCurrency(item.valor)}
                        </p>
                      </div>
                      
                      {item.descricao && (
                        <p className="text-sm text-gray-600 mb-2">{item.descricao}</p>
                      )}
                      
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Saldo anterior: {formatCurrency(item.saldo_anterior)}</span>
                        <span>Saldo novo: {formatCurrency(item.saldo_novo)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t">
              <button
                onClick={() => setShowHistory(false)}
                className="btn-fefelina-secondary w-full"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
