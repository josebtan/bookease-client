import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../services/firebase'
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore'

function Clientes() {
  const { userData, negocioId } = useAuth()
  const navigate = useNavigate()

  // Lista de clientes del negocio
  const [clientes, setClientes] = useState([])

  // Cliente seleccionado para ver detalles o promover
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)

  // Controla el modal de promoción a trabajador
  const [mostrarModalPromocion, setMostrarModalPromocion] = useState(false)

  // Datos adicionales para promover a trabajador
  const [formPromocion, setFormPromocion] = useState({
    especialidad: '',
    bio: '',
  })

  // Estados de carga
  const [loading, setLoading] = useState(true)
  const [promoviendo, setPromoviendo] = useState(false)

  // Carga los clientes asociados al negocio del admin
  useEffect(() => {
    const cargarClientes = async () => {
      if (!negocioId) return

      try {
        // Buscamos todas las asociaciones de este negocio en negocio_clientes
        const asociacionesRef = collection(db, 'negocio_clientes')
        const q = query(
          asociacionesRef,
          where('negocioId', '==', negocioId)
        )
        const asociacionesSnap = await getDocs(q)

        // Para cada asociación cargamos los datos del cliente desde users/
        const clientesData = await Promise.all(
          asociacionesSnap.docs.map(async (asociacion) => {
            const clienteId = asociacion.data().clienteId
            const clienteRef = doc(db, 'users', clienteId)
            const clienteSnap = await getDoc(clienteRef)

            if (clienteSnap.exists()) {
              return {
                id: clienteId,
                ...clienteSnap.data(),
                // Incluimos la fecha de registro en el negocio
                registradoEn: asociacion.data().createdAt,
              }
            }
            return null
          })
        )

        // Filtramos nulls y clientes que ya son workers
        setClientes(clientesData.filter(c => c && c.rol === 'client'))
      } catch (error) {
        console.error('Error al cargar clientes:', error)
      }
      setLoading(false)
    }
    cargarClientes()
  }, [userData])

  // Abre el modal de promoción con los datos del cliente
  const handleAbrirPromocion = (cliente) => {
    setClienteSeleccionado(cliente)
    setFormPromocion({ especialidad: '', bio: '' })
    setMostrarModalPromocion(true)
  }

  // Promueve al cliente a trabajador
  const handlePromover = async () => {
    if (!clienteSeleccionado) return
    setPromoviendo(true)

    try {
      // 1. Cambiamos el rol del usuario a 'worker' en users/
      await updateDoc(doc(db, 'users', clienteSeleccionado.id), {
        rol: 'worker',
        adminId: negocioId,
        negocioId: negocioId,
      })

      // 2. Creamos su perfil de empleado en la subcolección empleados/
      await setDoc(
        doc(db, 'negocios', negocioId, 'empleados', clienteSeleccionado.id),
        {
          nombre: clienteSeleccionado.nombre,
          email: clienteSeleccionado.email,
          foto: clienteSeleccionado.foto || '',
          telefono: clienteSeleccionado.telefono || '',
          especialidad: formPromocion.especialidad,
          bio: formPromocion.bio,
          serviciosIds: [],
          activo: true,
          calificacion: 0,
          totalCitas: 0,
          createdAt: serverTimestamp(),
        }
      )

      // 3. Quitamos al cliente de la lista local
      setClientes(clientes.filter(c => c.id !== clienteSeleccionado.id))
      setMostrarModalPromocion(false)
      setClienteSeleccionado(null)

      alert(`${clienteSeleccionado.nombre} ahora es trabajador del negocio.`)
    } catch (error) {
      console.error('Error al promover cliente:', error)
    }
    setPromoviendo(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* BARRA DE NAVEGACIÓN */}
      <nav className="bg-white border-b border-gray-200 px-8 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="text-gray-400 hover:text-gray-600 text-sm font-medium"
        >
          ← Volver
        </button>
        <span className="text-xl font-bold text-blue-800">Clientes</span>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* ENCABEZADO */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Clientes</h1>
            <p className="text-gray-500 text-sm mt-1">
              Clientes registrados en tu negocio
            </p>
          </div>
          {/* Contador de clientes */}
          <span className="bg-blue-50 text-blue-800 text-sm font-bold px-4 py-2 rounded-xl">
            {clientes.length} {clientes.length === 1 ? 'cliente' : 'clientes'}
          </span>
        </div>

        {/* LISTA DE CLIENTES */}
        {loading ? (
          <p className="text-gray-400 text-sm text-center py-10">
            Cargando clientes...
          </p>
        ) : clientes.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
            <p className="text-3xl mb-3">👥</p>
            <p className="text-gray-600 font-semibold mb-1">
              Aún no tienes clientes registrados
            </p>
            <p className="text-gray-400 text-sm">
              Comparte el link o QR de tu negocio para que tus clientes se registren
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {clientes.map((cliente) => (
              <div
                key={cliente.id}
                className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  {/* Foto del cliente */}
                  {cliente.foto ? (
                    <img
                      src={cliente.foto}
                      alt={cliente.nombre}
                      className="w-12 h-12 rounded-full object-cover border border-gray-100"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-xl">
                      👤
                    </div>
                  )}

                  {/* Datos del cliente */}
                  <div>
                    <p className="text-sm font-bold text-gray-800">
                      {cliente.nombre}
                    </p>
                    <p className="text-xs text-gray-500">{cliente.email}</p>
                    {cliente.telefono && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        📞 {cliente.telefono}
                      </p>
                    )}
                  </div>
                </div>

                {/* Botón promover a trabajador */}
                <button
                  onClick={() => handleAbrirPromocion(cliente)}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 px-3 py-1.5 rounded-lg transition flex-shrink-0"
                >
                  Promover a empleado
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE PROMOCIÓN */}
      {mostrarModalPromocion && clienteSeleccionado && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setMostrarModalPromocion(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full"
            onClick={e => e.stopPropagation()}
          >
            {/* ENCABEZADO DEL MODAL */}
            <div className="flex items-center gap-4 mb-6">
              {clienteSeleccionado.foto ? (
                <img
                  src={clienteSeleccionado.foto}
                  alt={clienteSeleccionado.nombre}
                  className="w-14 h-14 rounded-full object-cover border border-gray-100"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-2xl">
                  👤
                </div>
              )}
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  Promover a empleado
                </h3>
                <p className="text-sm text-gray-500">
                  {clienteSeleccionado.nombre}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-6 bg-amber-50 border border-amber-200 rounded-xl p-3">
              ⚠️ Este cliente pasará a ser empleado de tu negocio. Podrá acceder al panel de trabajadores y gestionar su agenda.
            </p>

            <div className="flex flex-col gap-4 mb-6">
              {/* Especialidad */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  Especialidad
                </label>
                <input
                  type="text"
                  value={formPromocion.especialidad}
                  onChange={(e) => setFormPromocion({
                    ...formPromocion,
                    especialidad: e.target.value
                  })}
                  placeholder="Ej: Senior Barber, Estilista, etc."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  Descripción <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  value={formPromocion.bio}
                  onChange={(e) => setFormPromocion({
                    ...formPromocion,
                    bio: e.target.value
                  })}
                  placeholder="Cuéntanos sobre este empleado..."
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            {/* BOTONES */}
            <div className="flex gap-3">
              <button
                onClick={() => setMostrarModalPromocion(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-semibold hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handlePromover}
                disabled={promoviendo}
                className="flex-1 bg-blue-800 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-900 disabled:opacity-40"
              >
                {promoviendo ? 'Promoviendo...' : 'Confirmar promoción'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Clientes