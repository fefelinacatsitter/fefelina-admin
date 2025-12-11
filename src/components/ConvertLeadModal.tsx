import { useState } from 'react'
import { X } from 'lucide-react'
import { Lead } from '../lib/supabase'

interface ConvertLeadModalProps {
  lead: Lead
  onClose: () => void
  onConvert: (valorDiaria: number, valorDuasVisitas: number) => Promise<void>
}

export default function ConvertLeadModal({ lead, onClose, onConvert }: ConvertLeadModalProps) {
  const [valorDiaria, setValorDiaria] = useState('')
  const [valorDuasVisitas, setValorDuasVisitas] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const diaria = parseFloat(valorDiaria)
    const duasVisitas = parseFloat(valorDuasVisitas)

    if (isNaN(diaria) || diaria <= 0) {
      alert('Por favor, informe um valor válido para a diária')
      return
    }

    if (isNaN(duasVisitas) || duasVisitas <= 0) {
      alert('Por favor, informe um valor válido para 2 visitas')
      return
    }

    setLoading(true)
    try {
      await onConvert(diaria, duasVisitas)
    } catch (error) {
      console.error('Erro ao converter lead:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Converter Lead em Cliente
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {lead.nome}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {/* Informações que serão copiadas */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold text-blue-900">
                📋 Informações que serão copiadas:
              </p>
              <ul className="text-sm text-blue-800 space-y-1 ml-4">
                <li>• Nome: {lead.nome}</li>
                <li>• Endereço: {lead.endereco || 'Não informado'}</li>
                <li>• Veterinário: Não informado</li>
                {lead.observacoes && (
                  <li>• Observações: {lead.observacoes.substring(0, 50)}...</li>
                )}
              </ul>
            </div>

            {/* Campos obrigatórios */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor Diária (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorDiaria}
                  onChange={(e) => setValorDiaria(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: 100.00"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor 2 Visitas (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorDuasVisitas}
                  onChange={(e) => setValorDuasVisitas(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: 180.00"
                  required
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 bg-gray-50 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Convertendo...' : 'Converter em Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
