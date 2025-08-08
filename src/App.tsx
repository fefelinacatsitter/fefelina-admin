import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { Session } from '@supabase/supabase-js'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import ClientsPage from './pages/ClientsPage'
import PetsPage from './pages/PetsPage'
import ServicesPage from './pages/ServicesPage'
import VisitsPage from './pages/VisitsPage'
import FinancesPage from './pages/FinancesPage'
import Layout from './components/Layout'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!session) {
    return <LoginPage />
  }

  return (
    <Router basename="/fefelina-admin">
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/pets" element={<PetsPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/visits" element={<VisitsPage />} />
          <Route path="/finances" element={<FinancesPage />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
