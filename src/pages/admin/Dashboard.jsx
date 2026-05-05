import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../services/firebase'
import { doc, getDoc } from 'firebase/firestore'
import QRNegocio from '../../components/ui/QRNegocio'

function Dashboard() {
  const { user, userData, logout } = useAuth()
  const navigate = useNavigate()

  // Estado para guardar los datos del negocio
  const [negocio, setNegocio] = useState(null)

  // Estado de carga mientras consulta Firestore
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Si el usuario tiene un negocioId guardado, lo buscamos en Firestore
    const cargarNegocio = async () => {
      if (userData?.negocioId) {
        const ref = doc(db, 'negocios', userData.negocioId)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          setNegocio(snap.data())
        }
      }
      setLoading(false)
    }
    cargarNegocio()
  }, [userData])

  // Cierra sesión y redirige al login
  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // Mientras carga los datos del negocio
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* BARRA DE NAVEGACIÓN SUPERIOR */}
      <nav className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-blue-800">AgendaYa</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.displayName}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 hover:text-red-700 font-semibold"
          >
            Cerrar sesión
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* SALUDO */}
        <h1 className="text-2xl font-bold text-gray-800 mb-1">
          Bienvenido, {user?.displayName} 👋
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          Panel de administración de tu negocio
        </p>

        {/* SI NO HAY NEGOCIO REGISTRADO */}
        {!negocio ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
            <p className="text-gray-400 text-sm mb-4">
              Aún no tienes un negocio registrado
            </p>
            <button
              onClick={() => navigate('/admin/registro-negocio')}
              className="bg-blue-800 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-blue-900"
            >
              Registrar mi negocio
            </button>
          </div>
        ) : (
          /* SI YA HAY NEGOCIO REGISTRADO */
          <div className="flex flex-col gap-6">

            {/* TARJETA DEL NEGOCIO */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                    {negocio.categoria}
                  </span>
                  <h2 className="text-xl font-bold text-gray-800 mt-1">
                    {negocio.nombre}
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">
                    {negocio.descripcion}
                  </p>
                </div>
                <div className="flex items-center gap-3">
  {/* Badge del plan */}
  <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full">
    Plan {negocio.plan}
  </span>
  {/* QR y link del negocio */}
  <QRNegocio slug={negocio.slug} nombreNegocio={negocio.nombre} />
</div>
              </div>

              {/* INFORMACIÓN DE CONTACTO */}
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">
                    Ciudad
                  </p>
                  <p className="text-sm text-gray-700 font-medium">{negocio.ciudad}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">
                    Dirección
                  </p>
                  <p className="text-sm text-gray-700 font-medium">{negocio.direccion}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">
                    Teléfono
                  </p>
                  <p className="text-sm text-gray-700 font-medium">{negocio.telefono}</p>
                </div>
                {negocio.instagram && (
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">
                      Instagram
                    </p>
                    <p className="text-sm text-gray-700 font-medium">{negocio.instagram}</p>
                  </div>
                )}
              </div>
            </div>

            {/* ACCESOS RÁPIDOS */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: 'Servicios',   icon: '✂️',  ruta: '/admin/servicios' },
                { label: 'Empleados',   icon: '👥',  ruta: '/admin/empleados' },
                { label: 'Citas',       icon: '📅',  ruta: '/admin/citas' },
                { label: 'Estadísticas',icon: '📊',  ruta: '/admin/estadisticas' },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => navigate(item.ruta)}
                  className="bg-white border border-gray-200 rounded-2xl p-6 text-center hover:border-blue-300 hover:shadow-sm transition"
                >
                  <div className="text-3xl mb-2">{item.icon}</div>
                  <p className="text-sm font-semibold text-gray-700">{item.label}</p>
                </button>
              ))}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard