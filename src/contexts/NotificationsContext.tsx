import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { usePermissions } from './PermissionsContext'

// Limite de horas após o horário agendado para considerar uma visita "atrasada"
const OVERDUE_THRESHOLD_HOURS = 3

// Janela de horas antes do horário agendado para lembrar de uma visita futura
const UPCOMING_WINDOW_HOURS = 3

// Dias antes do início de um serviço para lembrar de combinar a retirada da chave
const KEY_REMINDER_DAYS_BEFORE = 5

// Intervalo de revalidação automática (polling) — não há infra de realtime no projeto hoje
const POLL_INTERVAL_MS = 5 * 60 * 1000 // 5 minutos

// Chave usada para persistir avisos dispensados (dismiss) entre sessões
const DISMISSED_STORAGE_KEY = 'fefelina_dismissed_notifications'
// Limite de ids guardados no storage, para não crescer indefinidamente
const DISMISSED_STORAGE_MAX = 300

export type NotificationSeverity = 'info' | 'warning' | 'error'

export interface AppNotification {
  id: string
  type: 'overdue_visit' | 'upcoming_visit' | 'service_key_reminder'
  title: string
  description: string
  severity: NotificationSeverity
  dueAt: Date
  dismissible: boolean
  meta: {
    visitId?: string
    serviceId?: string
    tipoEncontro?: 'pre_encontro' | 'visita_servico' | 'task'
    tipoVisita?: 'inteira' | 'meia'
  }
}

interface NotificationsContextType {
  notifications: AppNotification[]
  loading: boolean
  refresh: () => Promise<void>
  markVisitAsRealizada: (visitId: string) => Promise<void>
  dismissNotification: (id: string) => void
  resolvingId: string | null
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined)

function loadDismissedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function extractNomeEBadges(visit: any) {
  const clientInfo = Array.isArray(visit.clients) ? visit.clients[0] : visit.clients
  const leadInfo = Array.isArray(visit.leads) ? visit.leads[0] : visit.leads

  const nome = visit.tipo_encontro === 'task'
    ? (visit.titulo || 'Sem título')
    : (clientInfo?.nome || leadInfo?.nome || 'Sem nome')

  return { nome }
}

/**
 * "Checker" de visitas atrasadas: busca visitas com status 'agendada' cuja data/horário
 * já passou há mais de OVERDUE_THRESHOLD_HOURS e ainda não foram marcadas como realizadas.
 *
 * Novos tipos de aviso podem ser adicionados criando outra função com essa mesma
 * assinatura e registrando-a em `checkers` (ver mais abaixo).
 */
async function checkOverdueVisits(isAdmin: boolean, currentUserId?: string): Promise<AppNotification[]> {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  let query = supabase
    .from('visits')
    .select('id, data, horario, status, tipo_encontro, tipo_visita, titulo, client_id, lead_id, assigned_user_id, clients (nome), leads (nome)')
    .eq('status', 'agendada')
    .lte('data', todayStr)

  if (!isAdmin && currentUserId) {
    query = query.eq('assigned_user_id', currentUserId)
  }

  const { data, error } = await query
  if (error) {
    console.error('Erro ao verificar visitas atrasadas:', error)
    return []
  }

  const now = Date.now()
  const thresholdMs = OVERDUE_THRESHOLD_HOURS * 60 * 60 * 1000

  const notifications: AppNotification[] = []

  for (const visit of data || []) {
    const dueAt = new Date(`${visit.data}T${visit.horario}`)
    if (isNaN(dueAt.getTime())) continue
    if (now - dueAt.getTime() <= thresholdMs) continue

    const { nome } = extractNomeEBadges(visit)
    const hoursOverdue = Math.floor((now - dueAt.getTime()) / (60 * 60 * 1000))

    notifications.push({
      id: `overdue-visit-${visit.id}`,
      type: 'overdue_visit',
      title: nome,
      description: `Agendada para ${visit.horario.slice(0, 5)} — atrasada há ${hoursOverdue}h e ainda não foi marcada como realizada`,
      severity: 'warning',
      dueAt,
      dismissible: false,
      meta: { visitId: visit.id, tipoEncontro: visit.tipo_encontro, tipoVisita: visit.tipo_visita },
    })
  }

  // Mais atrasadas primeiro
  return notifications.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
}

/**
 * "Checker" de visitas próximas: busca visitas agendadas para as próximas
 * UPCOMING_WINDOW_HOURS horas, apenas como lembrete (dispensável).
 */
async function checkUpcomingVisits(isAdmin: boolean, currentUserId?: string): Promise<AppNotification[]> {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  let query = supabase
    .from('visits')
    .select('id, data, horario, status, tipo_encontro, tipo_visita, titulo, client_id, lead_id, assigned_user_id, clients (nome), leads (nome)')
    .eq('status', 'agendada')
    .gte('data', toDateStr(today))
    .lte('data', toDateStr(tomorrow))

  if (!isAdmin && currentUserId) {
    query = query.eq('assigned_user_id', currentUserId)
  }

  const { data, error } = await query
  if (error) {
    console.error('Erro ao verificar visitas próximas:', error)
    return []
  }

  const now = Date.now()
  const windowMs = UPCOMING_WINDOW_HOURS * 60 * 60 * 1000

  const notifications: AppNotification[] = []

  for (const visit of data || []) {
    const dueAt = new Date(`${visit.data}T${visit.horario}`)
    if (isNaN(dueAt.getTime())) continue
    const diffMs = dueAt.getTime() - now
    if (diffMs <= 0 || diffMs > windowMs) continue // só futuro, dentro da janela

    const { nome } = extractNomeEBadges(visit)
    const minutesUntil = Math.round(diffMs / (60 * 1000))
    const faltamTexto = minutesUntil < 60
      ? `${minutesUntil} min`
      : `${Math.floor(minutesUntil / 60)}h${minutesUntil % 60 > 0 ? String(minutesUntil % 60).padStart(2, '0') : ''}`

    notifications.push({
      id: `upcoming-visit-${visit.id}-${visit.data}-${visit.horario}`,
      type: 'upcoming_visit',
      title: nome,
      description: `Agendada para ${visit.horario.slice(0, 5)} — em ${faltamTexto}`,
      severity: 'info',
      dueAt,
      dismissible: true,
      meta: { visitId: visit.id, tipoEncontro: visit.tipo_encontro, tipoVisita: visit.tipo_visita },
    })
  }

  return notifications.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
}

/**
 * "Checker" de lembrete de chave: busca serviços com status 'pendente' cujo início
 * está a até KEY_REMINDER_DAYS_BEFORE dias de distância, para lembrar de combinar
 * com o cliente a retirada da chave antes de começar o serviço. Dispensável.
 */
async function checkUpcomingServiceKeyPickup(isAdmin: boolean, currentUserId?: string): Promise<AppNotification[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const limitDate = new Date(today)
  limitDate.setDate(limitDate.getDate() + KEY_REMINDER_DAYS_BEFORE)
  const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  let query = supabase
    .from('services')
    .select('id, client_id, data_inicio, status, assigned_user_id, nome_servico, clients (nome)')
    .eq('status', 'pendente')
    .gte('data_inicio', toDateStr(today))
    .lte('data_inicio', toDateStr(limitDate))

  if (!isAdmin && currentUserId) {
    query = query.eq('assigned_user_id', currentUserId)
  }

  const { data, error } = await query
  if (error) {
    console.error('Erro ao verificar lembretes de chave de serviço:', error)
    return []
  }

  const notifications: AppNotification[] = []

  for (const service of data || []) {
    const dueAt = new Date(`${service.data_inicio}T00:00:00`)
    if (isNaN(dueAt.getTime())) continue

    const clientInfo = Array.isArray(service.clients) ? service.clients[0] : service.clients
    const nome = clientInfo?.nome || 'Cliente'
    const diffDays = Math.max(0, Math.round((dueAt.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)))
    const dataFormatada = dueAt.toLocaleDateString('pt-BR')
    const quandoTexto = diffDays === 0 ? 'hoje' : diffDays === 1 ? 'amanhã' : `em ${diffDays} dias`

    notifications.push({
      id: `service-key-${service.id}`,
      type: 'service_key_reminder',
      title: `Lembrete: chaves serviço ${nome}`,
      description: `Início ${quandoTexto} (${dataFormatada}) — combine com o cliente a retirada da chave`,
      severity: 'info',
      dueAt,
      dismissible: true,
      meta: { serviceId: service.id },
    })
  }

  return notifications.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { userProfile, isAdmin, loading: permissionsLoading } = usePermissions()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const dismissedIdsRef = useRef<Set<string>>(loadDismissedIds())

  const persistDismissedIds = () => {
    try {
      const arr = Array.from(dismissedIdsRef.current).slice(-DISMISSED_STORAGE_MAX)
      localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(arr))
    } catch {
      // localStorage indisponível (modo privado etc.) — ignora silenciosamente
    }
  }

  const refresh = useCallback(async () => {
    if (!userProfile) return
    try {
      // Registro de checkers de notificação. Para adicionar um novo tipo de aviso no
      // futuro, basta implementar outra função async que retorne AppNotification[] e
      // incluí-la nesta lista.
      const checkers: Array<() => Promise<AppNotification[]>> = [
        () => checkOverdueVisits(isAdmin, userProfile.user_id),
        () => checkUpcomingVisits(isAdmin, userProfile.user_id),
        () => checkUpcomingServiceKeyPickup(isAdmin, userProfile.user_id),
      ]

      const results = await Promise.all(checkers.map(checker => checker()))
      const combined = results.flat().filter(n => !dismissedIdsRef.current.has(n.id))

      // Avisos que exigem ação (warning) primeiro; dentro do mesmo grupo, mais urgentes primeiro
      combined.sort((a, b) => {
        if (a.severity !== b.severity) return a.severity === 'warning' ? -1 : 1
        return a.dueAt.getTime() - b.dueAt.getTime()
      })

      setNotifications(combined)
    } finally {
      setLoading(false)
    }
  }, [userProfile, isAdmin])

  // Busca inicial + sempre que o usuário/permissões mudarem
  useEffect(() => {
    if (permissionsLoading) return
    if (!userProfile) {
      setNotifications([])
      setLoading(false)
      return
    }
    refresh()
  }, [permissionsLoading, userProfile, refresh])

  // Polling periódico + revalidação ao focar a aba/janela
  useEffect(() => {
    if (!userProfile) return

    intervalRef.current = setInterval(() => {
      refresh()
    }, POLL_INTERVAL_MS)

    const handleFocusOrVisibility = () => {
      if (document.visibilityState === 'visible') {
        refresh()
      }
    }

    window.addEventListener('focus', handleFocusOrVisibility)
    document.addEventListener('visibilitychange', handleFocusOrVisibility)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      window.removeEventListener('focus', handleFocusOrVisibility)
      document.removeEventListener('visibilitychange', handleFocusOrVisibility)
    }
  }, [userProfile, refresh])

  const markVisitAsRealizada = useCallback(async (visitId: string) => {
    setResolvingId(visitId)
    try {
      const { error } = await supabase
        .from('visits')
        .update({ status: 'realizada' })
        .eq('id', visitId)

      if (error) throw error

      toast.success('Visita marcada como realizada!')
      await refresh()
    } catch (error: any) {
      console.error('Erro ao marcar visita como realizada:', error)
      toast.error(`Erro ao atualizar visita: ${error.message}`)
    } finally {
      setResolvingId(null)
    }
  }, [refresh])

  const dismissNotification = useCallback((id: string) => {
    dismissedIdsRef.current.add(id)
    persistDismissedIds()
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  return (
    <NotificationsContext.Provider value={{ notifications, loading, refresh, markVisitAsRealizada, dismissNotification, resolvingId }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (!context) {
    throw new Error('useNotifications deve ser usado dentro de um NotificationsProvider')
  }
  return context
}
