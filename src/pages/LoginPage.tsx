import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import CatLoader from '../components/CatLoader'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  // Pegar URL de onde veio (se houver)
  const from = (location.state as any)?.from?.pathname || '/'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        toast.error('Erro ao fazer login: ' + error.message)
        return
      }

      if (data.session) {
        toast.success('Login realizado com sucesso!')
        
        // Verificar se é primeiro login (senha ainda não foi trocada)
        // Usuário criado recentemente (menos de 5 minutos) e nunca fez login
        const userCreatedAt = new Date(data.user.created_at);
        const now = new Date();
        const minutesSinceCreation = (now.getTime() - userCreatedAt.getTime()) / 1000 / 60;
        
        // Se conta foi criada há menos de 5 minutos, considerar primeiro login
        if (minutesSinceCreation < 5) {
          navigate('/change-password?firstLogin=true', { replace: true });
          return;
        }
        
        // Redirecionar para a página que tentou acessar ou para home
        navigate(from, { replace: true })
      }
    } catch (err) {
      console.error('Erro ao fazer login:', err)
      setError('Erro inesperado ao fazer login')
      toast.error('Erro inesperado ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  // Mostrar gatinho enquanto faz login
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary-50 via-white to-primary-50">
        <CatLoader size="lg" variant="walking" text="Entrando no sistema..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary-50 via-white to-primary-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-fefelina border border-gray-100">
        <div className="text-center">
          {/* Logo Fefelina */}
          <img 
            src="/fefelina-admin/fefelina-logo.png" 
            alt="Fefelina Logo" 
            className="mx-auto w-20 h-20 mb-6 drop-shadow-lg"
          />
          <h2 className="mt-6 text-2xl font-extrabold text-secondary-700">
            Fefelina - Sistema de Gestão
          </h2>
          <p className="mt-2 text-sm text-secondary-500">
            Acesso restrito ao administrador
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-secondary-400 text-secondary-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm bg-white"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-secondary-400 text-secondary-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm bg-white"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md border border-red-200">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-lg"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
