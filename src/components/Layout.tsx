import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useState, useEffect } from 'react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'

interface LayoutProps {
  children: React.ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/' },
  { name: 'Leads', href: '/leads' },
  { name: 'Clientes', href: '/clients' },
  { name: 'Pets', href: '/pets' },
  { name: 'Serviços', href: '/services' },
  { name: 'Visitas', href: '/visits' },
  { name: 'Agenda', href: '/agenda' },
  { name: 'Finanças', href: '/finances' },
  { name: 'Relatórios', href: '/reports' },
  { name: 'Caixa', href: '/financial' },
]

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Detectar iPad e tablets (até 1280px para incluir iPad landscape)
  useEffect(() => {
    const checkIsTablet = () => {
      const width = window.innerWidth
      const isTablet = width < 1280
      // Útil para ajustes específicos de tablet/iPad no futuro
      console.log('Tablet/iPad mode:', isTablet, 'Width:', width)
    }

    checkIsTablet()
    window.addEventListener('resize', checkIsTablet)
    return () => window.removeEventListener('resize', checkIsTablet)
  }, [])

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Erro ao fazer logout:', error)
    }
    // Limpar qualquer cache local
    window.localStorage.clear()
    window.sessionStorage.clear()
    // Navegar para login
    navigate('/login', { replace: true })
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Mobile & iPad sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 flex z-50 md:z-50">
          {/* Overlay com blur */}
          <div 
            className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm transition-opacity" 
            onClick={() => setSidebarOpen(false)} 
          />
          {/* Sidebar */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-2xl transform transition-transform">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white bg-white bg-opacity-20 hover:bg-opacity-30 transition-all"
                onClick={() => setSidebarOpen(false)}
              >
                <XMarkIcon className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4 mb-6">
                <img 
                  src="/fefelina-admin/fefelina-logo.png" 
                  alt="Fefelina Logo" 
                  className="w-8 h-8 mr-2 rounded-lg shadow-sm"
                />
                <h1 className="text-base font-bold text-secondary-700">Fefelina Admin</h1>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`${
                        isActive
                          ? 'bg-primary-100 text-primary-800 border-l-4 border-primary-500'
                          : 'text-secondary-700 hover:bg-primary-50 hover:text-primary-700'
                      } group flex items-center px-2 py-3 text-base font-medium rounded-md transition-colors duration-200`}
                    >
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <button
                onClick={handleLogout}
                className="flex items-center text-secondary-600 hover:text-primary-600 transition-colors duration-200 font-medium"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar - escondido no iPad/Tablets (até 1280px) */}
      <div className="hidden xl:flex xl:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 border-r border-gray-200 bg-white">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4 mb-2">
                <img 
                  src="/fefelina-admin/fefelina-logo.png" 
                  alt="Fefelina Logo" 
                  className="w-10 h-10 mr-3 rounded-lg shadow-sm"
                />
                <h1 className="text-lg font-bold text-secondary-700">Fefelina Admin</h1>
              </div>
              <nav className="mt-5 flex-1 px-2 bg-white space-y-1">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`${
                        isActive
                          ? 'bg-primary-100 text-primary-800 border-l-4 border-primary-500'
                          : 'text-secondary-700 hover:bg-primary-50 hover:text-primary-700'
                      } group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200`}
                    >
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <button
                onClick={handleLogout}
                className="flex items-center text-secondary-600 hover:text-primary-600 transition-colors duration-200 font-medium"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Mobile & iPad header (até 1280px) */}
        <div className="xl:hidden">
          <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
            <button
              className="px-4 border-r border-gray-200 text-gray-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 xl:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            <div className="flex-1 px-4 flex justify-between items-center">
              <div className="flex items-center">
                <img 
                  src="/fefelina-admin/fefelina-logo.png" 
                  alt="Fefelina Logo" 
                  className="w-8 h-8 mr-2 rounded-lg shadow-sm"
                />
                <h1 className="text-base font-bold text-secondary-700">Fefelina Admin</h1>
              </div>
              <button
                onClick={handleLogout}
                className="text-secondary-600 hover:text-primary-600 transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <div className="py-4 md:py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
