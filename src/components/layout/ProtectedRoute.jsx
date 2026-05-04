import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// Componente que protege rutas según si el usuario está autenticado o no.
// Si el usuario NO está autenticado, lo redirige al login.
// Si SÍ está autenticado, muestra el contenido de la ruta normalmente.
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  // Mientras verifica si hay sesión activa, no muestra nada
  if (loading) return null

  // Si no hay usuario autenticado, redirige al login
  if (!user) return <Navigate to="/login" />

  // Si hay usuario, muestra el contenido protegido
  return children
}

export default ProtectedRoute