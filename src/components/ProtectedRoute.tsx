import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Session } from '@supabase/supabase-js'
import CatLoader from './CatLoader'
import { usePermissions } from '../hooks/usePermissions'
import { AlertCircle, Lock } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  resource?: string
  action?: 'read' | 'create' | 'update' | 'delete'
  requireAdmin?: boolean
}

export default function ProtectedRoute({ 
  children, 
  resource, 
  action = 'read', 
  requireAdmin = false 
}: ProtectedRouteProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const location = useLocation()
  const { loading: permissionsLoading, isAdmin, hasPermission, userProfile } = usePermissions()

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

  // Mostrar loading enquanto verifica autenticação ou permissões
  if (loading || permissionsLoading) {
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

  // Se requer permissões específicas, verificar
  if (resource) {
    // Verificar se requer admin
    if (requireAdmin && !isAdmin) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Acesso Restrito
            </h2>
            <p className="text-gray-600 mb-6">
              Esta área é exclusiva para administradores do sistema.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-sm text-yellow-800 font-medium">
                    Seu perfil: {userProfile?.profile.name || 'Sem perfil'}
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Para acessar esta área, entre em contato com um administrador.
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => window.history.back()}
              className="w-full btn-fefelina"
            >
              Voltar
            </button>
          </div>
        </div>
      )
    }

    // Verificar permissão específica
    if (!hasPermission(resource, action)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Sem Permissão
            </h2>
            <p className="text-gray-600 mb-6">
              Você não tem permissão para acessar esta funcionalidade.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-blue-900 font-medium mb-2">
                Informações do seu perfil:
              </p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Nome:</strong> {userProfile?.full_name || 'N/A'}</li>
                <li>• <strong>Perfil:</strong> {userProfile?.profile.name || 'Sem perfil'}</li>
                <li>• <strong>Recurso:</strong> {resource}</li>
                <li>• <strong>Ação necessária:</strong> {action === 'read' ? 'visualizar' : action === 'create' ? 'criar' : action === 'update' ? 'editar' : 'excluir'}</li>
              </ul>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Entre em contato com um administrador para solicitar acesso.
            </p>
            <button
              onClick={() => window.history.back()}
              className="w-full btn-fefelina"
            >
              Voltar
            </button>
          </div>
        </div>
      )
    }
  }

  // Tem permissão ou não requer verificação, renderizar conteúdo protegido
  return <>{children}</>
}
