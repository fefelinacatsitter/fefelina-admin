import { Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { PermissionsProvider } from './contexts/PermissionsContext'
import { ValuesVisibilityProvider } from './contexts/ValuesVisibilityContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import HomeRedirect from './components/HomeRedirect'
import CatLoader from './components/CatLoader'
import ErrorBoundary from './components/ErrorBoundary'

// Rotas carregadas sob demanda (code-splitting) para reduzir o bundle inicial
const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardEnhanced = lazy(() => import('./pages/DashboardEnhanced'))
const ClientsPage = lazy(() => import('./pages/ClientsPage'))
const ClientProfilePage = lazy(() => import('./pages/ClientProfilePage'))
const PetsPage = lazy(() => import('./pages/PetsPage'))
const ServicesPage = lazy(() => import('./pages/ServicesPage'))
const VisitsPage = lazy(() => import('./pages/VisitsPage'))
const AgendaPage = lazy(() => import('./pages/AgendaPage'))
const LeadsPage = lazy(() => import('./pages/LeadsPage'))
const FinancesPage = lazy(() => import('./pages/FinancesPage'))
const RelatoriosPage = lazy(() => import('./pages/RelatoriosPage'))
const FinanceiroPage = lazy(() => import('./pages/FinanceiroPage'))
const SetupPage = lazy(() => import('./pages/SetupPage'))
const MyProfilePage = lazy(() => import('./pages/MyProfilePage'))
const ChangePasswordPage = lazy(() => import('./pages/ChangePasswordPage'))

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <CatLoader size="lg" text="Carregando..." />
    </div>
  )
}

function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-24 text-center">
      <h1 className="text-3xl font-semibold text-gray-900">Página não encontrada</h1>
      <p className="mt-2 text-sm text-gray-600">
        A página que você tentou acessar não existe ou foi movida.
      </p>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
    <Router basename="/fefelina-admin">
      <PermissionsProvider>
      <ValuesVisibilityProvider>
      <Suspense fallback={<RouteFallback />}>
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

                  {/* Rota curinga: qualquer URL autenticada desconhecida */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
      </Suspense>
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
      </ValuesVisibilityProvider>
      </PermissionsProvider>
    </Router>
    </ErrorBoundary>
  )
}

export default App
