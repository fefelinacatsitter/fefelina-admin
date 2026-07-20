import { useState, useCallback, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

interface ConfirmOptions {
  title?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Estilo de perigo (botão vermelho) para ações destrutivas como excluir. */
  danger?: boolean
}

interface ConfirmState extends ConfirmOptions {
  message: string
  resolve: (value: boolean) => void
}

/**
 * Hook que substitui `window.confirm()` por um modal padronizado do sistema.
 * Uso:
 *   const { confirm, ConfirmDialogElement } = useConfirmDialog()
 *   if (!(await confirm('Tem certeza que deseja excluir?', { danger: true }))) return
 *   ...
 *   return <>{ConfirmDialogElement}...resto da página...</>
 */
export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmState | null>(null)

  const confirm = useCallback((message: string, options?: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ message, resolve, ...options })
    })
  }, [])

  const handleClose = useCallback((result: boolean) => {
    setState(prev => {
      prev?.resolve(result)
      return null
    })
  }, [])

  // Fecha com Esc (equivalente a cancelar)
  useEffect(() => {
    if (!state) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [state, handleClose])

  const ConfirmDialogElement = state ? (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={() => handleClose(false)}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-fefelina max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
              state.danger ? 'bg-red-100' : 'bg-primary-100'
            }`}
          >
            <AlertTriangle className={`w-5 h-5 ${state.danger ? 'text-red-600' : 'text-primary-700'}`} />
          </div>
          <div className="flex-1 pt-1">
            <h3 className="text-base font-semibold text-gray-900">{state.title || 'Confirmar ação'}</h3>
            <p className="mt-1 text-sm text-gray-600 whitespace-pre-line">{state.message}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" className="btn-fefelina-secondary" onClick={() => handleClose(false)}>
            {state.cancelLabel || 'Cancelar'}
          </button>
          <button
            type="button"
            autoFocus
            className={
              state.danger
                ? 'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors'
                : 'btn-fefelina'
            }
            onClick={() => handleClose(true)}
          >
            {state.confirmLabel || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  ) : null

  return { confirm, ConfirmDialogElement }
}
