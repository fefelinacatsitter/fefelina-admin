import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import ClientsPage from './pages/ClientsPage'
import ClientProfilePage from './pages/ClientProfilePage'
import PetsPage from './pages/PetsPage'
import ServicesPage from './pages/ServicesPage'
import VisitsPage from './pages/VisitsPage'
import AgendaPage from './pages/AgendaPage'
import LeadsPage from './pages/LeadsPage'
import FinancesPage from './pages/FinancesPage'
import RelatoriosPage from './pages/RelatoriosPage'
import FinanceiroPage from './pages/FinanceiroPage'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Router basename="/fefelina-admin">
      <Routes>
        {/* Rota pública - Login */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Rotas protegidas - Requerem autenticação */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/clients" element={<ClientsPage />} />
                  <Route path="/clients/:id" element={<ClientProfilePage />} />
                  <Route path="/pets" element={<PetsPage />} />
                  <Route path="/services" element={<ServicesPage />} />
                  <Route path="/visits" element={<VisitsPage />} />
                  <Route path="/agenda" element={<AgendaPage />} />
                  <Route path="/leads" element={<LeadsPage />} />
                  <Route path="/finances" element={<FinancesPage />} />
                  <Route path="/reports" element={<RelatoriosPage />} />
                  <Route path="/financial" element={<FinanceiroPage />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#374151',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '14px',
            fontWeight: '500',
          },
          success: {
            style: {
              border: '1px solid #10b981',
              color: '#047857',
            },
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            style: {
              border: '1px solid #ef4444',
              color: '#dc2626',
            },
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </Router>
  )
}

export default App
