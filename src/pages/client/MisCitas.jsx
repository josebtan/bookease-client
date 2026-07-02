import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../services/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { getCitasCliente, actualizarEstadoCita } from '../../services/appointments'
import { format, parseISO, isPast } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADO_LABEL = {
  pendiente:  { label: 'Pendiente',  color: 'bg-amber-100 text-amber-700' },
  confirmada: { label: 'Confirmada', color: 'bg-green-100 text-green-700' },
  cancelada:  { label: 'Cancelada',  color: 'bg-red-100 text-red-600' },
  completada: { label: 'Completada', color: 'bg-gray-100 text-gray-600' },
}

function MisCitas() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const [negocio, setNegocio] = useState(null)
  const [citas, setCitas] = useState([])
  const [servicios, setServicios] = useState({})
  const [empleados, setEmpleados] = useState({})
  const [loading, setLoading] = useState(true)
  const [cancelando, setCancelando] = useState(null)
  const nuevaCita = searchParams.get('nueva') === '1'

  useEffect(() => {
    if (!user) { navigate(`/negocio/${slug}`); return }
    const cargar = async () => {
      // Obtener negocio
      const q = query(collection(db, 'negocios'), where('slug', '==', slug))
      const snap = await getDocs(q)
      if (snap.empty) return navigate('/')
      const neg = { id: snap.docs[0].id, ...snap.docs[0].data() }
      setNegocio(neg)

      // Cargar catálogos
      const [svcSnap, empSnap] = await Promise.all([
        getDocs(collection(db, 'negocios', neg.id, 'servicios')),
        getDocs(collection(db, 'negocios', neg.id, 'empleados')),
      ])
      const svcMap = {}
      svcSnap.docs.forEach(d => { svcMap[d.id] = d.data() })
      const empMap = {}
      empSnap.docs.forEach(d => { empMap[d.id] = d.data() })
      setServicios(svcMap)
      setEmpleados(empMap)

      // Citas del cliente
      const citasData = await getCitasCliente(neg.id, user.uid)
      setCitas(citasData)
      setLoading(false)
    }
    cargar()
  }, [slug, user])

  const cancelarCita = async (cita) => {
    if (!confirm('¿Seguro que quieres cancelar esta cita?')) return
    setCancelando(cita.id)
    await actualizarEstadoCita(negocio.id, cita.id, 'cancelada')
    setCitas(prev => prev.map(c => c.id === cita.id ? { ...c, estado: 'cancelada' } : c))
    setCancelando(null)
  }

  const citasActivas = citas.filter(c => ['pendiente', 'confirmada'].includes(c.estado) && !isPast(parseISO(`${c.fecha}T${c.horaFin}:00`)))
  const citasPasadas = citas.filter(c => !citasActivas.includes(c))

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Cargando tus citas...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(`/negocio/${slug}`)}
            className="text-gray-400 hover:text-gray-600 text-sm font-medium">← Volver</button>
          <span className="text-base font-bold text-blue-800">Mis citas</span>
        </div>
        <button onClick={() => navigate(`/negocio/${slug}/agendar`)}
          className="bg-blue-800 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-900">
          + Nueva cita
        </button>
      </nav>

      <div className="max-w-lg mx-auto px-6 py-8">

        {/* Notificación de cita creada */}
        {nuevaCita && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-semibold text-green-800 text-sm">¡Cita agendada con éxito!</p>
              <p className="text-xs text-green-600 mt-0.5">Te confirmamos cuando el negocio la apruebe.</p>
            </div>
          </div>
        )}

        {citas.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📅</p>
            <p className="font-bold text-gray-700">Aún no tienes citas</p>
            <p className="text-sm text-gray-400 mt-1 mb-6">Agenda tu primera cita ahora</p>
            <button onClick={() => navigate(`/negocio/${slug}/agendar`)}
              className="bg-blue-800 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-blue-900">
              Agendar cita
            </button>
          </div>
        ) : (
          <>
            {/* CITAS ACTIVAS */}
            {citasActivas.length > 0 && (
              <div className="mb-8">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Próximas</h2>
                <div className="flex flex-col gap-3">
                  {citasActivas.map(cita => (
                    <CitaCard
                      key={cita.id}
                      cita={cita}
                      servicio={servicios[cita.servicioId]}
                      empleado={empleados[cita.empleadoId]}
                      onCancelar={() => cancelarCita(cita)}
                      cancelando={cancelando === cita.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* HISTORIAL */}
            {citasPasadas.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Historial</h2>
                <div className="flex flex-col gap-3">
                  {citasPasadas.map(cita => (
                    <CitaCard
                      key={cita.id}
                      cita={cita}
                      servicio={servicios[cita.servicioId]}
                      empleado={empleados[cita.empleadoId]}
                      pasada
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function CitaCard({ cita, servicio, empleado, onCancelar, cancelando, pasada }) {
  const estado = ESTADO_LABEL[cita.estado] || ESTADO_LABEL.pendiente
  const fecha = format(parseISO(cita.fecha), "EEEE d 'de' MMMM", { locale: es })

  return (
    <div className={`bg-white border rounded-2xl p-4 ${pasada ? 'opacity-70' : 'border-gray-200 shadow-sm'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-gray-800">{servicio?.nombre || 'Servicio'}</p>
          <p className="text-sm text-gray-500 mt-0.5 capitalize">{fecha}</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${estado.color}`}>
          {estado.label}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600">
        <span>🕐 {cita.horaInicio} — {cita.horaFin}</span>
        {empleado && <span>👤 {empleado.nombre}</span>}
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <span className="font-bold text-blue-800">${Number(cita.monto).toLocaleString('es-CO')}</span>
        {!pasada && cita.estado !== 'cancelada' && (
          <button onClick={onCancelar} disabled={cancelando}
            className="text-red-500 text-xs font-semibold hover:text-red-700 disabled:opacity-40">
            {cancelando ? 'Cancelando...' : 'Cancelar cita'}
          </button>
        )}
      </div>
    </div>
  )
}

export default MisCitas
