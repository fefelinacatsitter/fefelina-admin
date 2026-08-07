import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCircle2, BellOff, X, AlertTriangle, Clock, Key } from 'lucide-react'
import { useNotifications } from '../contexts/NotificationsContext'

interface NotificationBellProps {
  inSidebar?: boolean // Se está no sidebar lateral (abre para cima)
}

const TIPO_ENCONTRO_INFO: Record<string, { label: string; className: string }> = {
  visita_servico: { label: 'Visita', className: 'bg-gray-100 text-gray-700' },
  pre_encontro: { label: 'Pré-Encontro', className: 'bg-purple-100 text-purple-700' },
  task: { label: 'Task', className: 'bg-blue-100 text-blue-700' },
}

const TIPO_VISITA_INFO: Record<string, { label: string; className: string }> = {
  inteira: { label: 'Inteira', className: 'bg-blue-100 text-blue-800' },
  meia: { label: 'Meia', className: 'bg-purple-100 text-purple-800' },
}

export default function NotificationBell({ inSidebar = false }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const navigate = useNavigate()
  const { notifications, markVisitAsRealizada, dismissNotification, resolvingId } = useNotifications()

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Calcula a posição do dropdown com base no botão, sempre dentro da viewport.
  // useLayoutEffect (em vez de useEffect) evita um flash com posição errada antes do
  // primeiro paint. maxHeight garante que o dropdown nunca ultrapasse a tela (nem em
  // cima nem embaixo), independente de quantas notificações existam.
  useLayoutEffect(() => {
    if (!isOpen) return

    const updatePosition = () => {
      if (!buttonRef.current) return
      const rect = buttonRef.current.getBoundingClientRect()
      const margin = 8
      const minHeight = 160
      const width = Math.min(320, window.innerWidth - margin * 2)

      if (inSidebar) {
        // Abre para cima: ancorado no topo do botão, altura limitada ao espaço acima
        const left = Math.min(Math.max(rect.left, margin), window.innerWidth - width - margin)
        const availableAbove = rect.top - margin * 2
        setDropdownStyle({
          position: 'fixed',
          left,
          bottom: window.innerHeight - rect.top + margin,
          width,
          maxHeight: Math.max(availableAbove, minHeight),
          overflowY: 'auto',
        })
      } else {
        // Abre para baixo: ancorado embaixo do botão, altura limitada ao espaço abaixo
        const top = rect.bottom + margin
        const left = Math.min(Math.max(rect.right - width, margin), window.innerWidth - width - margin)
        const availableBelow = window.innerHeight - top - margin
        setDropdownStyle({
          position: 'fixed',
          left,
          top,
          width,
          maxHeight: Math.max(availableBelow, minHeight),
          overflowY: 'auto',
        })
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen, inSidebar])

  const goToTarget = (type: string) => {
    navigate(type === 'service_key_reminder' ? '/services' : '/visits')
    setIsOpen(false)
  }

  const hasOverdue = notifications.some(n => n.severity === 'warning')

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        title="Notificações"
      >
        <Bell className="h-5 w-5" />
        {notifications.length > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full text-white text-[10px] font-semibold leading-none ${
            hasOverdue ? 'bg-red-500' : 'bg-blue-500'
          }`}>
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={dropdownStyle}
          className="bg-white rounded-lg shadow-xl border border-gray-200 z-50 flex flex-col"
        >
          <div className="px-4 py-2 border-b border-gray-100 flex-shrink-0">
            <p className="text-sm font-semibold text-gray-900">Notificações</p>
          </div>

          <div className="overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 flex flex-col items-center text-center text-gray-400">
                <BellOff className="h-8 w-8 mb-2" />
                <p className="text-sm">Nenhum aviso pendente</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const tipoEncontroInfo = notification.meta.tipoEncontro ? TIPO_ENCONTRO_INFO[notification.meta.tipoEncontro] : undefined
                const tipoVisitaInfo = notification.meta.tipoVisita ? TIPO_VISITA_INFO[notification.meta.tipoVisita] : undefined
                const isWarning = notification.severity === 'warning'

                return (
                  <div
                    key={notification.id}
                    onClick={() => goToTarget(notification.type)}
                    className="relative px-3 py-2 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    {notification.dismissible && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          dismissNotification(notification.id)
                        }}
                        className="absolute top-1.5 right-1.5 p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
                        title="Dispensar aviso"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <div className="flex items-start gap-1.5 pr-6">
                      {notification.type === 'service_key_reminder' ? (
                        <Key className="w-3.5 h-3.5 text-teal-500 mt-0.5 flex-shrink-0" />
                      ) : isWarning ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          <p className="text-sm font-medium text-gray-900 truncate">{notification.title}</p>
                          {tipoEncontroInfo && (
                            <span className={`inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium leading-none flex-shrink-0 ${tipoEncontroInfo.className}`}>
                              {tipoEncontroInfo.label}
                            </span>
                          )}
                          {tipoVisitaInfo && (
                            <span className={`inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium leading-none flex-shrink-0 ${tipoVisitaInfo.className}`}>
                              {tipoVisitaInfo.label}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs mt-0.5 ${isWarning ? 'text-amber-700' : 'text-blue-700'}`}>
                          {notification.description}
                        </p>
                        {notification.type === 'overdue_visit' && notification.meta.visitId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              markVisitAsRealizada(notification.meta.visitId!)
                            }}
                            disabled={resolvingId === notification.meta.visitId}
                            className={`mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                              resolvingId === notification.meta.visitId
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-green-700 bg-green-50 hover:bg-green-100'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            {resolvingId === notification.meta.visitId ? 'Atualizando...' : 'Marcar Realizada'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
