import { useState, useEffect } from 'react'
import { supabase, CaixaMovimento } from '../lib/supabase'
import CatLoader from '../components/CatLoader'

export default function FinanceiroPage() {
  const [movimentos, setMovimentos] = useState<CaixaMovimento[]>([])
  const [saldoAtual, setSaldoAtual] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMovimento, setEditingMovimento] = useState<CaixaMovimento | null>(null)
  
  // Formulário
  const [formData, setFormData] = useState({
    data: '',
    valor: '',
    tipo: 'receitas_servicos' as CaixaMovimento['tipo'],
    descricao: ''
  })
  
  // Estados para despesa automática
  const [habilitarDespesa, setHabilitarDespesa] = useState(false)
  const [percentualDespesa, setPercentualDespesa] = useState('10')

  const tiposMovimento = [
    { value: 'receitas_servicos', label: 'Receitas - Serviços', color: 'text-green-600', categoria: 'receita' },
    { value: 'receitas_outros', label: 'Receitas - Outros', color: 'text-emerald-600', categoria: 'receita' },
    { value: 'rendimentos', label: 'Rendimentos', color: 'text-blue-600', categoria: 'receita' },
    { value: 'pagamento_mensal', label: 'Pagamento Mensal', color: 'text-purple-600', categoria: 'receita' },
    { value: 'despesas_servicos', label: 'Despesas - Serviços', color: 'text-red-600', categoria: 'despesa' },
    { value: 'despesas_outros', label: 'Despesas - Outros', color: 'text-orange-600', categoria: 'despesa' }
  ]

  // Validação de data
  const validateDateInput = (value: string) => {
    const yearMatch = value.match(/(\d{4})/)
    if (yearMatch) {
      const year = parseInt(yearMatch[1])
      if (year < 1900 || year > 2100) {
        return value.replace(/\d{4}/, '2025')
      }
    }
    return value
  }

  const isValidDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00')
    const year = date.getFullYear()
    return year >= 1900 && year <= 2100 && !isNaN(date.getTime())
  }

  // Formatação de valor monetário
  const formatValueInput = (value: string) => {
    // Remove tudo exceto números
    const numbersOnly = value.replace(/[^\d]/g, '')
    
    if (!numbersOnly) return ''
    
    // Converte para número e divide por 100 para ter os centavos
    const numberValue = parseInt(numbersOnly) / 100
    
    // Formata no padrão brasileiro
    return numberValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  const parseValueFromInput = (formattedValue: string): number => {
    // Remove formatação e converte para número
    const numbersOnly = formattedValue.replace(/[^\d,]/g, '').replace(',', '.')
    return parseFloat(numbersOnly) || 0
  }

  const ITEMS_PER_PAGE = 20

  useEffect(() => {
    fetchMovimentos(true)
  }, [])



  const fetchMovimentos = async (resetList = false) => {
    try {
      if (resetList) {
        setLoading(true)
        setPage(1) // Próxima página será 1
        setHasMore(true)
      } else {
        setLoadingMore(true)
      }
      
      const currentPage = resetList ? 0 : page

      // Buscar movimentos com paginação usando range
      const startRange = currentPage * ITEMS_PER_PAGE
      const endRange = startRange + ITEMS_PER_PAGE - 1
      
      const { data: movimentosData, error, count } = await supabase
        .from('caixa_movimentos')
        .select('*', { count: 'exact' })
        .order('data', { ascending: false })
        .order('created_at', { ascending: false })
        .range(startRange, endRange)

      if (error) throw error

      // Buscar saldo total (sem paginação)
      if (resetList) {
        const { data: saldoData, error: saldoError } = await supabase
          .from('caixa_movimentos')
          .select('valor')

        if (saldoError) throw saldoError
        
        const saldo = (saldoData || []).reduce((acc, movimento) => acc + movimento.valor, 0)
        setSaldoAtual(saldo)
      }

      // Atualizar lista de movimentos
      if (resetList) {
        setMovimentos(movimentosData || [])
      } else {
        setMovimentos(prev => [...prev, ...(movimentosData || [])])
      }

      // Verificar se há mais dados usando o count total
      const totalLoaded = resetList ? (movimentosData || []).length : movimentos.length + (movimentosData || []).length
      const hasMoreData = count ? totalLoaded < count : (movimentosData || []).length === ITEMS_PER_PAGE
      setHasMore(hasMoreData)
      
      if (!resetList) {
        setPage(prev => prev + 1)
      }

    } catch (error) {
      console.error('Erro ao buscar movimentos:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isValidDate(formData.data)) {
      alert('Por favor, insira uma data válida')
      return
    }

    const valor = parseValueFromInput(formData.valor)
    if (isNaN(valor) || valor <= 0) {
      alert('Por favor, insira um valor válido')
      return
    }

    try {
      const tipoSelecionado = tiposMovimento.find(t => t.value === formData.tipo)
      const movimentoData = {
        ...formData,
        valor: tipoSelecionado?.categoria === 'despesa'
          ? -Math.abs(valor) // Garantir que despesas sejam negativas
          : Math.abs(valor)  // Garantir que receitas sejam positivas
      }

      if (editingMovimento) {
        const { error } = await supabase
          .from('caixa_movimentos')
          .update(movimentoData)
          .eq('id', editingMovimento.id)
        
        if (error) throw error
      } else {
        // Inserir lançamento principal
        const { error } = await supabase
          .from('caixa_movimentos')
          .insert([movimentoData])
        
        if (error) throw error

        // Se for Receitas - Serviços e despesa estiver habilitada, criar lançamento de despesa
        if (formData.tipo === 'receitas_servicos' && habilitarDespesa) {
          const percentual = parseFloat(percentualDespesa) || 10
          const valorDespesa = (valor * percentual) / 100

          const despesaData = {
            data: formData.data,
            tipo: 'despesas_servicos' as CaixaMovimento['tipo'],
            valor: -Math.abs(valorDespesa), // Despesa é negativa
            descricao: `Despesa de serviço (${percentual}% de ${formatCurrency(valor)})${formData.descricao ? ` - ${formData.descricao}` : ''}`
          }

          const { error: despesaError } = await supabase
            .from('caixa_movimentos')
            .insert([despesaData])

          if (despesaError) throw despesaError
        }
      }

      setIsModalOpen(false)
      setEditingMovimento(null)
      setFormData({ data: '', valor: '', tipo: 'receitas_servicos', descricao: '' })
      setHabilitarDespesa(false)
      setPercentualDespesa('10')
      fetchMovimentos(true)
    } catch (error) {
      console.error('Erro ao salvar movimento:', error)
      alert('Erro ao salvar movimento')
    }
  }

  const handleEdit = (movimento: CaixaMovimento) => {
    setEditingMovimento(movimento)
    setFormData({
      data: movimento.data,
      valor: Math.abs(movimento.valor).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
      tipo: movimento.tipo,
      descricao: movimento.descricao || ''
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este movimento?')) return

    try {
      const { error } = await supabase
        .from('caixa_movimentos')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      fetchMovimentos()
    } catch (error) {
      console.error('Erro ao excluir movimento:', error)
      alert('Erro ao excluir movimento')
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR')
  }

  const getTipoLabel = (tipo: string) => {
    const tipoObj = tiposMovimento.find(t => t.value === tipo)
    return tipoObj?.label || tipo
  }

  const getTipoColor = (tipo: string) => {
    const tipoObj = tiposMovimento.find(t => t.value === tipo)
    return tipoObj?.color || 'text-gray-600'
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <CatLoader size="lg" variant="walking" text="Carregando movimentações..." />
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title-fefelina">Controle Financeiro</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-fefelina"
        >
          Novo Lançamento
        </button>
      </div>

      <div className="divider-fefelina"></div>

      {/* Card do Saldo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Saldo Atual</h3>
          <p className={`text-2xl font-bold ${saldoAtual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(saldoAtual)}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Receitas do Mês</h3>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(
              movimentos
                .filter(m => {
                  const data = new Date(m.data)
                  const hoje = new Date()
                  return data.getMonth() === hoje.getMonth() && data.getFullYear() === hoje.getFullYear() && m.valor > 0
                })
                .reduce((acc, m) => acc + m.valor, 0)
            )}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Despesas do Mês</h3>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(
              movimentos
                .filter(m => {
                  const data = new Date(m.data)
                  const hoje = new Date()
                  return data.getMonth() === hoje.getMonth() && data.getFullYear() === hoje.getFullYear() && m.valor < 0
                })
                .reduce((acc, m) => acc + Math.abs(m.valor), 0)
            )}
          </p>
        </div>
      </div>

      {/* Lista de Movimentos */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Histórico de Movimentos</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descrição
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {movimentos.map((movimento) => (
                <tr key={movimento.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(movimento.data)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={getTipoColor(movimento.tipo)}>
                      {getTipoLabel(movimento.tipo)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {movimento.descricao || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className={movimento.valor >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(movimento.valor)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <button
                      onClick={() => handleEdit(movimento)}
                      className="text-primary-600 hover:text-primary-900 mr-3"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(movimento.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
              
              {movimentos.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Nenhum movimento encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Indicador de loading quando carregando mais dados */}
        {loadingMore && (
          <div className="flex justify-center py-8">
            <div className="flex items-center space-x-2 text-gray-500">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Carregando mais...</span>
            </div>
          </div>
        )}

        {/* Botão Carregar Mais */}
        {hasMore && !loadingMore && (
          <div className="text-center py-6">
            <button
              onClick={() => fetchMovimentos(false)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md transition-colors"
            >
              Carregar Mais Registros
            </button>
          </div>
        )}

        {/* Mensagem quando não há mais dados */}
        {!hasMore && movimentos.length > 0 && (
          <div className="text-center py-4 text-gray-500 text-sm">
            Todos os lançamentos foram carregados
          </div>
        )}
      </div>

      {/* Modal de Novo/Editar Lançamento */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 md:p-6">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[85vh] md:max-h-[90vh] overflow-y-auto mt-16 md:mt-0">
            {/* Header da modal com gradiente */}
            <div className="sticky top-0 bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-200 px-4 md:px-6 py-3 flex justify-between items-start">
              <div>
                <h2 className="text-sm md:text-base font-semibold text-gray-900">
                  {editingMovimento ? 'Editar Lançamento' : 'Novo Lançamento'}
                </h2>
                <p className="text-xs text-gray-600 mt-0.5">
                  {editingMovimento ? 'Atualize as informações do lançamento' : 'Registre uma nova movimentação financeira'}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  setEditingMovimento(null)
                  setFormData({ data: '', valor: '', tipo: 'receitas_servicos', descricao: '' })
                  setHabilitarDespesa(false)
                  setPercentualDespesa('10')
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Conteúdo da modal */}
            <div className="px-4 md:px-6 py-4">
              <form id="lancamento-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data</label>
                  <input
                    type="date"
                    value={formData.data}
                    onChange={(e) => {
                      const validatedValue = validateDateInput(e.target.value)
                      setFormData({ ...formData, data: validatedValue })
                    }}
                    className="input-fefelina"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipo</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as CaixaMovimento['tipo'] })}
                    className="input-fefelina"
                    required
                  >
                    {tiposMovimento.map((tipo) => (
                      <option key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Valor (R$)</label>
                  <input
                    type="text"
                    value={formData.valor}
                    onChange={(e) => {
                      const formatted = formatValueInput(e.target.value)
                      setFormData({ ...formData, valor: formatted })
                    }}
                    className="input-fefelina"
                    placeholder="0,00"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {tiposMovimento.find(t => t.value === formData.tipo)?.categoria === 'despesa'
                      ? 'Será registrado como despesa (valor negativo)'
                      : 'Será registrado como receita (valor positivo)'
                    }
                  </p>
                </div>

                {/* Checkbox de despesa automática - apenas para Receitas - Serviços e não em modo edição */}
                {formData.tipo === 'receitas_servicos' && !editingMovimento && (
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center mb-3">
                      <input
                        type="checkbox"
                        id="habilitarDespesa"
                        checked={habilitarDespesa}
                        onChange={(e) => setHabilitarDespesa(e.target.checked)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor="habilitarDespesa" className="ml-2 block text-sm font-medium text-gray-700">
                        Gerar despesa de serviço automaticamente?
                      </label>
                    </div>

                    {habilitarDespesa && (
                      <div className="ml-6 space-y-3 bg-gray-50 p-3 rounded-md">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Percentual (%)
                            </label>
                            <input
                              type="number"
                              value={percentualDespesa}
                              onChange={(e) => setPercentualDespesa(e.target.value)}
                              min="0"
                              max="100"
                              step="0.1"
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                              placeholder="10"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Valor da Despesa
                            </label>
                            <div className="px-2 py-1.5 text-sm bg-red-50 border border-red-200 rounded-md text-red-700 font-medium">
                              {(() => {
                                const valorReceita = parseValueFromInput(formData.valor)
                                const percentual = parseFloat(percentualDespesa) || 0
                                const valorDespesa = (valorReceita * percentual) / 100
                                return formatCurrency(valorDespesa)
                              })()}
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">
                          Um lançamento adicional de "Despesas - Serviços" será criado automaticamente com o valor calculado.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Descrição</label>
                  <textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    className="input-fefelina"
                    rows={3}
                    placeholder="Descrição do lançamento..."
                  />
                </div>
              </form>
            </div>

            {/* Footer da modal */}
            <div className="sticky bottom-0 bg-gray-50 px-4 md:px-6 py-3 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false)
                  setEditingMovimento(null)
                  setFormData({ data: '', valor: '', tipo: 'receitas_servicos', descricao: '' })
                  setHabilitarDespesa(false)
                  setPercentualDespesa('10')
                }}
                className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm md:text-base"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                form="lancamento-form"
                className="px-4 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium text-sm md:text-base"
              >
                {editingMovimento ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
