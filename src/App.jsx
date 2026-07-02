import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Páginas públicas - accesibles sin iniciar sesión
import Landing from './pages/public/Landing'
import Login from './pages/public/Login'
import NegocioPublico from './pages/public/NegocioPublico'

// Páginas del cliente
import RegistroCliente from './pages/client/RegistroCliente'
import Agendar from './pages/client/Agendar'
import MisCitas from './pages/client/MisCitas'

// Panel del trabajador
import WorkerPanel from './pages/worker/WorkerPanel'

// Páginas del administrador - requieren autenticación
import Dashboard from './pages/admin/Dashboard'
import RegisterBusiness from './pages/admin/RegisterBusiness'
import Servicios from './pages/admin/Servicios'
import Empleados from './pages/admin/Empleados'
import Clientes from './pages/admin/Clientes'
import Citas from './pages/admin/Citas'

// Componente que protege rutas privadas
import ProtectedRoute from './components/layout/ProtectedRoute'

function App() {
  const { user } = useAuth()

  return (
    <BrowserRouter>
      <Routes>

        {/* RUTAS PÚBLICAS */}
        <Route path="/" element={<Landing />} />
        <Route
          path="/login"
          element={user ? <Navigate to="/admin/dashboard" /> : <Login />}
        />

        {/* PÁGINA PÚBLICA DEL NEGOCIO */}
        <Route path="/negocio/:slug" element={<NegocioPublico />} />

        {/* REGISTRO DE CLIENTES */}
        <Route path="/negocio/:slug/registro" element={<RegistroCliente />} />

        {/* AGENDAMIENTO Y CITAS DEL CLIENTE */}
        <Route path="/negocio/:slug/agendar" element={<Agendar />} />
        <Route path="/negocio/:slug/mis-citas" element={<MisCitas />} />

        {/* RUTAS PRIVADAS DEL ADMINISTRADOR */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/registro-negocio"
          element={
            <ProtectedRoute>
              <RegisterBusiness />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/servicios"
          element={
            <ProtectedRoute>
              <Servicios />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/empleados"
          element={
            <ProtectedRoute>
              <Empleados />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/clientes"
          element={
            <ProtectedRoute>
              <Clientes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/citas"
          element={
            <ProtectedRoute>
              <Citas />
            </ProtectedRoute>
          }
        />

        {/* PANEL DEL TRABAJADOR */}
        <Route
          path="/worker/panel"
          element={
            <ProtectedRoute>
              <WorkerPanel />
            </ProtectedRoute>
          }
        />

        {/* Ruta por defecto */}
        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </BrowserRouter>
  )
}

export default App