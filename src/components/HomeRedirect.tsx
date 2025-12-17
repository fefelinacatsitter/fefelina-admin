import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePermissions } from '../contexts/PermissionsContext'
import CatLoader from './CatLoader'

/**
 * Componente que redireciona o usuário para a primeira página que ele tem acesso
 * Usado na rota raiz "/" para garantir que usuários sem acesso ao Dashboard
 * sejam redirecionados automaticamente
 */
export default function HomeRedirect() {
  const navigate = useNavigate()
  const { userProfile, canRead, loading } = usePermissions()

  useEffect(() => {
    // Aguardar carregamento das permissões
    if (loading || !userProfile) return

    // Lista de rotas em ordem de prioridade
    const routes = [
      { path: '/dashboard', resource: 'dashboard' },
      { path: '/clients', resource: 'clients' },
      { path: '/leads', resource: 'leads' },
      { path: '/agenda', resource: 'agenda' },
      { path: '/services', resource: 'services' },
      { path: '/visits', resource: 'visits' },
      { path: '/pets', resource: 'pets' },
      { path: '/finances', resource: 'financeiro' },
      { path: '/reports', resource: 'relatorios' },
      { path: '/setup', resource: 'setup' },
    ]

    // Encontrar primeira rota com acesso
    const firstAccessibleRoute = routes.find(route => canRead(route.resource))

    if (firstAccessibleRoute) {
      navigate(firstAccessibleRoute.path, { replace: true })
    } else {
      // Se não tiver acesso a nenhuma página, redirecionar para perfil
      navigate('/my-profile', { replace: true })
    }
  }, [userProfile, canRead, loading, navigate])

  // Exibir loader enquanto verifica permissões
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <CatLoader />
        <p className="mt-4 text-gray-600">Carregando...</p>
      </div>
    </div>
  )
}
