import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Session } from '@supabase/supabase-js'
import CatLoader from './CatLoader'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const location = useLocation()

  useEffect(() => {
    // Verificar sessão atual sempre que a localização mudar
    const checkSession = async () => {
      setLoading(true)
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Erro ao verificar sessão:', error)
        setSession(null)
      } else {
        setSession(session)
      }
      setLoading(false)
    }

    checkSession()

    // Escutar mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setSession(null)
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(session)
      }
    })

    return () => subscription.unsubscribe()
  }, [location.pathname]) // Reverificar quando a rota mudar

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary-50 via-white to-primary-50">
        <CatLoader size="lg" variant="sleeping" text="Verificando suas credenciais..." />
      </div>
    )
  }

  // Se não está autenticado, redirecionar para login
  if (!session) {
    // Salvar URL atual para redirecionar após login
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Se está autenticado, renderizar conteúdo protegido
  return <>{children}</>
}
