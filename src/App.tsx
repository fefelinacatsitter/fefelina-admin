import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { PermissionsProvider } from './contexts/PermissionsContext'
import LoginPage from './pages/LoginPage'
import DashboardEnhanced from './pages/DashboardEnhanced'
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
import SetupPage from './pages/SetupPage'
import MyProfilePage from './pages/MyProfilePage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import HomeRedirect from './components/HomeRedirect'

function App() {
  return (
    <Router basename="/fefelina-admin">
      <PermissionsProvider>
      <Routes>
        {/* Rotas públicas */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        
        {/* Rotas protegidas - Requerem autenticação */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  {/* Rota raiz: redireciona para primeira página com acesso */}
                  <Route path="/" element={<HomeRedirect />} />
                  
                  {/* Dashboard como rota dedicada */}
                  <Route 
                    path="/dashboard" 
                    element={
                      <ProtectedRoute resource="dashboard">
                        <DashboardEnhanced />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/clients" 
                    element={
                      <ProtectedRoute resource="clients">
                        <ClientsPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/clients/:id" 
                    element={
                      <ProtectedRoute resource="clients">
                        <ClientProfilePage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/pets" 
                    element={
                      <ProtectedRoute resource="pets">
                        <PetsPage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/services" 
                    element={
                      <ProtectedRoute resource="services">
                        <ServicesPage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/visits" 
                    element={
                      <ProtectedRoute resource="visits">
                        <VisitsPage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/agenda" 
                    element={
                      <ProtectedRoute resource="agenda">
                        <AgendaPage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/leads" 
                    element={
                      <ProtectedRoute resource="leads">
                        <LeadsPage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/finances" 
                    element={
                      <ProtectedRoute resource="financeiro">
                        <FinancesPage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/reports" 
                    element={
                      <ProtectedRoute resource="relatorios">
                        <RelatoriosPage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/financial" 
                    element={
                      <ProtectedRoute resource="financeiro">
                        <FinanceiroPage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/setup" 
                    element={
                      <ProtectedRoute resource="setup" requireAdmin>
                        <SetupPage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route path="/profile" element={<MyProfilePage />} />
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
      </PermissionsProvider>
    </Router>
  )
}

export default App
