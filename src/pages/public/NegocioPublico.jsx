import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../../services/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { useAuth } from '../../context/AuthContext'

function NegocioPublico() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  // Datos del negocio
  const [negocio, setNegocio] = useState(null)
  // Lista de servicios del negocio
  const [servicios, setServicios] = useState([])
  // Lista de empleados del negocio
  const [empleados, setEmpleados] = useState([])
  // Tab activo
  const [tabActivo, setTabActivo] = useState('servicios')
  // Estado de carga
  const [loading, setLoading] = useState(true)
  // Negocio no encontrado
  const [noEncontrado, setNoEncontrado] = useState(false)

  useEffect(() => {
    const cargarNegocio = async () => {
      try {
        // Buscamos el negocio por su slug en Firestore
        const negociosRef = collection(db, 'negocios')
        const q = query(negociosRef, where('slug', '==', slug))
        const snap = await getDocs(q)

        if (snap.empty) {
          setNoEncontrado(true)
          setLoading(false)
          return
        }

        const negocioData = { id: snap.docs[0].id, ...snap.docs[0].data() }
        setNegocio(negocioData)

        // Cargamos servicios activos del negocio
        const svcRef = collection(db, 'negocios', negocioData.id, 'servicios')
        const svcSnap = await getDocs(svcRef)
        setServicios(svcSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(s => s.activo)
        )

        // Cargamos empleados activos del negocio
        const empRef = collection(db, 'negocios', negocioData.id, 'empleados')
        const empSnap = await getDocs(empRef)
        setEmpleados(empSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(e => e.activo)
        )

      } catch (error) {
        console.error('Error al cargar negocio:', error)
        setNoEncontrado(true)
      }
      setLoading(false)
    }
    cargarNegocio()
  }, [slug])

  // Días del horario en orden
  const diasOrden = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Cargando...</p>
      </div>
    )
  }

  if (noEncontrado) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-800 mb-2">Negocio no encontrado</p>
          <p className="text-gray-500 text-sm">El link que usaste no es válido</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* HERO DEL NEGOCIO */}
      <div className="bg-blue-800 text-white">
        <div className="max-w-3xl mx-auto px-6 py-10">

          {/* Banner si existe */}
          {negocio.bannerUrl && (
            <img
              src={negocio.bannerUrl}
              alt="Banner"
              className="w-full h-40 object-cover rounded-2xl mb-6"
              loading="lazy"
            />
          )}

          <div className="flex items-center gap-4">
            {/* Logo del negocio */}
            {negocio.logoUrl ? (
              <img
                src={negocio.logoUrl}
                alt={negocio.nombre}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20"
                loading="lazy"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-2xl">
                🏪
              </div>
            )}
            <div>
              {/* Categoría */}
              <span className="text-xs font-semibold text-blue-200 uppercase tracking-wide">
                {negocio.categoria}
              </span>
              {/* Nombre del negocio */}
              <h1 className="text-2xl font-bold text-white mt-0.5">
                {negocio.nombre}
              </h1>
            </div>
          </div>

          {/* Descripción */}
          {negocio.descripcion && (
            <p className="text-blue-100 text-sm mt-4 leading-relaxed">
              {negocio.descripcion}
            </p>
          )}

          {/* Info básica */}
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-blue-200">
            {negocio.ciudad && (
              <span>📍 {negocio.ciudad}</span>
            )}
            {negocio.telefono && (
              <span>📞 {negocio.telefono}</span>
            )}
            {negocio.instagram && (
              <span>📸 {negocio.instagram}</span>
            )}
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex">
            {['servicios', 'equipo', 'horario'].map(tab => (
              <button
                key={tab}
                onClick={() => setTabActivo(tab)}
                className={`px-6 py-4 text-sm font-semibold capitalize border-b-2 transition
                  ${tabActivo === tab
                    ? 'border-blue-800 text-blue-800'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* TAB SERVICIOS */}
        {tabActivo === 'servicios' && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Servicios disponibles</h2>
            {servicios.length === 0 ? (
              <p className="text-gray-400 text-sm">Este negocio aún no tiene servicios registrados</p>
            ) : (
              <div className="flex flex-col gap-4">
                {servicios.map(servicio => (
                  <div
                    key={servicio.id}
                    className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex"
                  >
                    {/* Imagen del servicio */}
                    {servicio.imagenUrl && (
                      <img
                        src={servicio.imagenUrl}
                        alt={servicio.nombre}
                        className="w-24 h-24 object-cover flex-shrink-0"
                        loading="lazy"
                      />
                    )}
                    <div className="flex-1 p-5 flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-gray-800 mb-1">
                          {servicio.nombre}
                        </h3>
                        {servicio.descripcion && (
                          <p className="text-sm text-gray-500 mb-2">{servicio.descripcion}</p>
                        )}
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-blue-800">
                            ${Number(servicio.precio).toLocaleString('es-CO')}
                          </span>
                          <span className="text-sm text-gray-400">
                            ⏱ {servicio.duracion} min
                          </span>
                        </div>
                      </div>
                      {/* Botón agendar - redirige al login si no está autenticado */}
                      <button
                        onClick={() => user
                          ? navigate(`/negocio/${slug}/agendar`)
                          : navigate(`/negocio/${slug}/registro`)
                        }
                        className="bg-blue-800 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-900 ml-4 flex-shrink-0"
                      >
                        Agendar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB EQUIPO */}
        {tabActivo === 'equipo' && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Nuestro equipo</h2>
            {empleados.length === 0 ? (
              <p className="text-gray-400 text-sm">Este negocio aún no tiene equipo registrado</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {empleados.map(empleado => (
                  <div
                    key={empleado.id}
                    className="bg-white border border-gray-200 rounded-2xl p-4 text-center"
                  >
                    {/* Foto del empleado */}
                    {empleado.fotoUrl ? (
                      <img
                        src={empleado.fotoUrl}
                        alt={empleado.nombre}
                        className="w-16 h-16 rounded-full object-cover mx-auto mb-3 border-2 border-gray-100"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3 text-2xl">
                        👤
                      </div>
                    )}
                    <p className="text-sm font-bold text-gray-800">{empleado.nombre}</p>
                    {empleado.especialidad && (
                      <p className="text-xs text-blue-600 font-medium mt-0.5">
                        {empleado.especialidad}
                      </p>
                    )}
                    {empleado.calificacion > 0 && (
                      <p className="text-xs text-amber-500 mt-1">
                        ★ {empleado.calificacion.toFixed(1)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB HORARIO */}
        {tabActivo === 'horario' && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Horario de atención</h2>
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              {negocio.horario && diasOrden.map((dia, i) => {
                const info = negocio.horario[dia]
                if (!info) return null
                return (
                  <div
                    key={dia}
                    className={`flex items-center justify-between px-5 py-3 text-sm
                      ${i < diasOrden.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    <span className="font-medium text-gray-700">{dia}</span>
                    {info.activo ? (
                      <span className="text-gray-600">
                        {info.inicio} – {info.fin}
                      </span>
                    ) : (
                      <span className="text-red-400 font-medium">Cerrado</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* BOTÓN AGENDAR FIJO ABAJO */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => user
                ? navigate(`/negocio/${slug}/agendar`)
                : navigate(`/negocio/${slug}/registro`)
              }
              className="w-full bg-blue-800 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-blue-900"
            >
              {user ? 'Agendar una cita' : 'Registrarse para agendar'}
            </button>
          </div>
        </div>

        {/* Espacio para que el botón fijo no tape el contenido */}
        <div className="h-20" />
      </div>
    </div>
  )
}

export default NegocioPublico