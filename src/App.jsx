import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Páginas públicas - accesibles sin iniciar sesión
import Landing from './pages/public/Landing'
import Login from './pages/public/Login'

// Páginas del administrador - requieren autenticación
import Dashboard from './pages/admin/Dashboard'
import RegisterBusiness from './pages/admin/RegisterBusiness'
import Servicios from './pages/admin/Servicios'

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

        {/* Ruta por defecto */}
        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </BrowserRouter>
  )
}

export default App