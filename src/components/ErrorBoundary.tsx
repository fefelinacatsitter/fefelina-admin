import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Captura erros de renderização em qualquer parte da árvore de componentes
 * abaixo dela (inclusive nas páginas carregadas via React.lazy) e mostra uma
 * tela de fallback amigável em vez de deixar a aplicação em branco.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Erro não tratado capturado pelo ErrorBoundary:', error, errorInfo)
  }

  handleReload = () => {
    this.setState({ hasError: false })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="card-fefelina max-w-md w-full text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900">Ops, algo deu errado</h1>
            <p className="mt-2 text-sm text-gray-600">
              Ocorreu um erro inesperado ao carregar esta página. Você pode tentar recarregar.
            </p>
            <button onClick={this.handleReload} className="btn-fefelina mt-6">
              Recarregar página
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
