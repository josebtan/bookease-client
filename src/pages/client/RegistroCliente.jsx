import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../services/firebase'
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore'

function RegistroCliente() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user, loginWithGoogle } = useAuth()

  // Datos del negocio para mostrar contexto al cliente
  const [negocio, setNegocio] = useState(null)

  // Controla si mostrar el formulario de datos adicionales
  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  // Estado de carga y guardado
  const [loading, setLoading] = useState(false)

  // Datos adicionales del cliente
  const [form, setForm] = useState({
    telefono: '',
    fechaNacimiento: '',
  })

  // Carga los datos del negocio por su slug
  useEffect(() => {
    const cargarNegocio = async () => {
      if (!slug) return
      const q = query(collection(db, 'negocios'), where('slug', '==', slug))
      const snap = await getDocs(q)
      if (!snap.empty) {
        setNegocio({ id: snap.docs[0].id, ...snap.docs[0].data() })
      }
    }
    cargarNegocio()
  }, [slug])

  // Asocia al cliente con el negocio en negocio_clientes
  const asociarClienteAlNegocio = useCallback(async () => {
    if (!negocio || !user) return
    const asociacionId = `${negocio.id}_${user.uid}`
    const asociacionRef = doc(db, 'negocio_clientes', asociacionId)
    const asociacionSnap = await getDoc(asociacionRef)
    if (asociacionSnap.exists()) return
    await setDoc(asociacionRef, {
      negocioId: negocio.id,
      clienteId: user.uid,
      adminId: negocio.ownerId,
      camposPersonalizados: {},
      createdAt: serverTimestamp(),
    })
  }, [negocio, user])

  // Cuando el usuario se autentica verificamos su estado
  useEffect(() => {
    const verificarCliente = async () => {
      if (!user || !negocio) return
      setLoading(true)
      const userRef = doc(db, 'users', user.uid)
      const userSnap = await getDoc(userRef)
      const data = userSnap.data()

      if (data?.telefono) {
        // Ya tiene perfil completo - lo asociamos al negocio y redirigimos
        await asociarClienteAlNegocio()
        navigate(`/negocio/${slug}`)
      } else {
        // Necesita completar su perfil
        setMostrarFormulario(true)
      }
      setLoading(false)
    }
    verificarCliente()
  }, [user, negocio, slug, navigate, asociarClienteAlNegocio])

  // Actualiza los campos del formulario
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // Guarda el perfil del cliente y lo asocia al negocio
  const handleGuardar = async () => {
    if (!form.telefono) return
    setLoading(true)
    try {
      // 1. Guardamos el perfil global del cliente
      await setDoc(doc(db, 'users', user.uid), {
        nombre: user.displayName,
        email: user.email,
        foto: user.photoURL,
        telefono: form.telefono,
        fechaNacimiento: form.fechaNacimiento,
        rol: 'client',
        createdAt: serverTimestamp(),
      }, { merge: true })

      // 2. Asociamos el cliente al negocio
      await asociarClienteAlNegocio()

      // 3. Redirigimos al negocio
      navigate(`/negocio/${slug}`)
    } catch (error) {
      console.error('Error al guardar datos del cliente:', error)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-md p-8">

        {/* LOGO Y NOMBRE DEL NEGOCIO */}
        {negocio && (
          <div className="text-center mb-6">
            {negocio.logoUrl && (
              <img
                src={negocio.logoUrl}
                alt={negocio.nombre}
                className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3 border border-gray-100"
              />
            )}
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
              {negocio.categoria}
            </p>
            <h2 className="text-xl font-bold text-gray-800">{negocio.nombre}</h2>
            <p className="text-gray-400 text-sm mt-1">
              Regístrate para agendar tu cita
            </p>
          </div>
        )}

        {!user ? (
          // PASO 1 - El usuario no está autenticado
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Crea tu cuenta</h3>
            <p className="text-gray-500 text-sm mb-6">
              Usa tu cuenta de Google para registrarte rápidamente
            </p>
            <button
              onClick={loginWithGoogle}
              className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition mb-3"
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" />
              Continuar con Google
            </button>
            <p className="text-center text-xs text-gray-400 mt-4">
              Al registrarte aceptas nuestros términos y condiciones
            </p>
          </div>
        ) : mostrarFormulario ? (
          // PASO 2 - Completar datos adicionales
          <div>
            <div className="flex items-center gap-3 mb-6 p-3 bg-gray-50 rounded-xl">
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="w-10 h-10 rounded-full"
                />
              )}
              <div>
                <p className="text-sm font-bold text-gray-800">{user.displayName}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            </div>

            <h3 className="text-lg font-bold text-gray-800 mb-1">
              Completa tu perfil
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              Necesitamos algunos datos para agendar tu cita
            </p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  Teléfono *
                </label>
                <input
                  type="tel"
                  name="telefono"
                  value={form.telefono}
                  onChange={handleChange}
                  placeholder="Ej: 300 123 4567"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  Fecha de nacimiento{' '}
                  <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="date"
                  name="fechaNacimiento"
                  value={form.fechaNacimiento}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                onClick={handleGuardar}
                disabled={loading || !form.telefono}
                className="w-full bg-blue-800 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-900 disabled:opacity-40 mt-2"
              >
                {loading ? 'Guardando...' : 'Completar registro →'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default RegistroCliente