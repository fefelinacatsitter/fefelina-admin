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
        {/* Header com gradiente */}
        <div className="bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-200 px-6 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              🎉 Converter Lead em Cliente
            </h2>
            <p className="text-xs text-gray-600 mt-0.5">
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
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-700">
                Informações que serão copiadas:
              </p>
              <ul className="text-xs text-gray-600 space-y-1 ml-4">
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
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                  Valor Diária (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorDiaria}
                  onChange={(e) => setValorDiaria(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ex: 100.00"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                  Valor 2 Visitas (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorDuasVisitas}
                  onChange={(e) => setValorDuasVisitas(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ex: 180.00"
                  required
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-2 p-6 bg-gray-50 border-t border-gray-200">
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
              {loading ? 'Convertendo...' : 'Converter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
