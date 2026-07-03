import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getNegociosUsuario, eliminarNegocio, PLANES } from '../../services/negocios'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function MisNegocios() {
  const navigate = useNavigate()
  const { user, userData, seleccionarNegocio, logout } = useAuth()

  const [negocios, setNegocios] = useState([])
  const [loading, setLoading] = useState(true)
  const [eliminando, setEliminando] = useState(null)
  const [confirmEliminar, setConfirmEliminar] = useState(null)

  const planKey = userData?.plan || 'gratis'
  const plan = PLANES[planKey]

  useEffect(() => {
    if (!user) return
    const cargar = async () => {
      const data = await getNegociosUsuario(user.uid)
      setNegocios(data)
      setLoading(false)
    }
    cargar()
  }, [user])

  const entrarNegocio = (negocio) => {
    seleccionarNegocio(negocio)
    navigate('/admin/dashboard')
  }

  const handleEliminar = async (negocio) => {
    setEliminando(negocio.id)
    await eliminarNegocio(negocio.id)
    setNegocios(prev => prev.filter(n => n.id !== negocio.id))
    setConfirmEliminar(null)
    setEliminando(null)
  }

  const puedeCrear = negocios.length < plan.maxNegocios

  const getEstadoNegocio = (negocio) => {
    if (negocio.estado === 'suspendido') return { label: 'Suspendido', color: 'bg-red-100 text-red-600' }
    if (negocio.fechaCorte) {
      const corte = negocio.fechaCorte?.toDate?.() || new Date(negocio.fechaCorte)
      if (corte < new Date()) return { label: 'Vencido', color: 'bg-orange-100 text-orange-600' }
    }
    return { label: 'Activo', color: 'bg-green-100 text-green-700' }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-blue-800">BookEase</h1>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-800">{user?.displayName}</p>
              <p className="text-xs text-gray-400">{plan.nombre}</p>
            </div>
            {user?.photoURL && (
              <img src={user.photoURL} className="w-9 h-9 rounded-full border border-gray-200" />
            )}
            <button onClick={logout}
              className="text-sm text-gray-500 hover:text-red-500 font-medium transition">
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* TÍTULO + PLAN */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Mis negocios</h2>
            <p className="text-gray-400 text-sm mt-1">
              {negocios.length} de {plan.maxNegocios} negocio{plan.maxNegocios !== 1 ? 's' : ''} en tu plan
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Badge plan */}
            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-blue-100 text-blue-700">
              {plan.nombre}
            </span>
            {/* Botón crear */}
            <button
              onClick={() => puedeCrear ? navigate('/admin/registro-negocio') : null}
              disabled={!puedeCrear}
              title={!puedeCrear ? `Tu plan permite máximo ${plan.maxNegocios} negocio(s)` : ''}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition
                ${puedeCrear
                  ? 'bg-blue-800 text-white hover:bg-blue-900'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
              + Nuevo negocio
            </button>
          </div>
        </div>

        {/* LÍMITE ALCANZADO */}
        {!puedeCrear && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">Límite de negocios alcanzado</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Tu plan actual permite {plan.maxNegocios} negocio(s). Actualiza tu plan para crear más.
              </p>
            </div>
            <button className="ml-auto text-xs font-bold text-blue-700 border border-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-50 whitespace-nowrap">
              Ver planes
            </button>
          </div>
        )}

        {/* LISTA DE NEGOCIOS */}
        {loading ? (
          <div className="text-center py-20 text-gray-400 text-sm">Cargando negocios...</div>
        ) : negocios.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🏪</p>
            <p className="text-xl font-bold text-gray-700">Aún no tienes negocios</p>
            <p className="text-gray-400 text-sm mt-2 mb-8">Crea tu primer negocio para empezar</p>
            <button onClick={() => navigate('/admin/registro-negocio')}
              className="bg-blue-800 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-900">
              Crear mi primer negocio
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {negocios.map(negocio => {
              const estado = getEstadoNegocio(negocio)
              const fechaCorte = negocio.fechaCorte?.toDate?.()
              return (
                <div key={negocio.id}
                  className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4 hover:border-blue-200 transition">

                  {/* INFO */}
                  <div className="flex items-start gap-3">
                    {negocio.logoUrl
                      ? <img src={negocio.logoUrl} className="w-14 h-14 rounded-xl object-cover border border-gray-100 flex-shrink-0" />
                      : <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center text-2xl flex-shrink-0">🏪</div>
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-800 text-base truncate">{negocio.nombre}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${estado.color}`}>
                          {estado.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-0.5">{negocio.categoria}</p>
                    </div>
                  </div>

                  {/* DETALLES */}
                  <div className="flex flex-col gap-1.5 text-xs text-gray-500 border-t border-gray-100 pt-3">
                    <div className="flex justify-between">
                      <span>Plan</span>
                      <span className="font-semibold text-gray-700">{PLANES[negocio.plan || 'gratis']?.nombre}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fecha de corte</span>
                      <span className="font-semibold text-gray-700">
                        {fechaCorte
                          ? format(fechaCorte, "d 'de' MMMM yyyy", { locale: es })
                          : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ciudad</span>
                      <span className="font-semibold text-gray-700">{negocio.ciudad || '—'}</span>
                    </div>
                  </div>

                  {/* ACCIONES */}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => entrarNegocio(negocio)}
                      className="flex-1 bg-blue-800 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-blue-900 transition">
                      Administrar →
                    </button>
                    <button
                      onClick={() => setConfirmEliminar(negocio)}
                      className="px-3 py-2.5 rounded-xl text-sm font-bold text-red-500 border border-red-200 hover:bg-red-50 transition">
                      🗑
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MODAL CONFIRMAR ELIMINAR */}
      {confirmEliminar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <p className="text-xl mb-1">⚠️</p>
            <h3 className="text-lg font-bold text-gray-800 mb-2">¿Eliminar negocio?</h3>
            <p className="text-sm text-gray-500 mb-1">
              Vas a eliminar <strong>{confirmEliminar.nombre}</strong> permanentemente.
            </p>
            <p className="text-sm text-red-600 font-medium mb-6">
              Se borrarán todos sus servicios, empleados y citas. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmEliminar(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={() => handleEliminar(confirmEliminar)}
                disabled={eliminando === confirmEliminar.id}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-40">
                {eliminando === confirmEliminar.id ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MisNegocios
