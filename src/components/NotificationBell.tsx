import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCircle2, BellOff, X, AlertTriangle, Clock } from 'lucide-react'
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

  // Calcula a posição do dropdown com base no botão, sempre dentro da viewport
  // (posicionamento relativo ao botão pode sair da tela em telas estreitas)
  useEffect(() => {
    if (!isOpen) return

    const updatePosition = () => {
      if (!buttonRef.current) return
      const rect = buttonRef.current.getBoundingClientRect()
      const margin = 8
      const width = Math.min(320, window.innerWidth - margin * 2)

      if (inSidebar) {
        const left = Math.min(Math.max(rect.left, margin), window.innerWidth - width - margin)
        setDropdownStyle({
          position: 'fixed',
          left,
          bottom: window.innerHeight - rect.top + margin,
          width,
        })
      } else {
        const left = Math.min(Math.max(rect.right - width, margin), window.innerWidth - width - margin)
        setDropdownStyle({
          position: 'fixed',
          left,
          top: rect.bottom + margin,
          width,
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

  const goToVisits = () => {
    navigate('/visits')
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
          className="bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
        >
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Notificações</p>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 flex flex-col items-center text-center text-gray-400">
                <BellOff className="h-8 w-8 mb-2" />
                <p className="text-sm">Nenhum aviso pendente</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const tipoEncontroInfo = TIPO_ENCONTRO_INFO[notification.meta.tipoEncontro]
                const tipoVisitaInfo = TIPO_VISITA_INFO[notification.meta.tipoVisita]
                const isWarning = notification.severity === 'warning'

                return (
                  <div
                    key={notification.id}
                    onClick={goToVisits}
                    className="relative px-4 py-3 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    {notification.dismissible && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          dismissNotification(notification.id)
                        }}
                        className="absolute top-2 right-2 p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
                        title="Dispensar aviso"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <div className="flex items-start gap-2 pr-6">
                      {isWarning ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{notification.title}</p>
                        <p className={`text-xs mt-0.5 ${isWarning ? 'text-amber-700' : 'text-blue-700'}`}>
                          {notification.description}
                        </p>
                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                          {tipoEncontroInfo && (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${tipoEncontroInfo.className}`}>
                              {tipoEncontroInfo.label}
                            </span>
                          )}
                          {tipoVisitaInfo && (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${tipoVisitaInfo.className}`}>
                              {tipoVisitaInfo.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {notification.type === 'overdue_visit' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          markVisitAsRealizada(notification.meta.visitId)
                        }}
                        disabled={resolvingId === notification.meta.visitId}
                        className={`mt-2 ml-6 inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
                          resolvingId === notification.meta.visitId
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-green-700 bg-green-50 hover:bg-green-100'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {resolvingId === notification.meta.visitId ? 'Atualizando...' : 'Marcar Realizada'}
                      </button>
                    )}
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
