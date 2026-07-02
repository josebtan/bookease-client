import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../services/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { getCitasNegocio, actualizarEstadoCita } from '../../services/appointments'
import { format, addDays, subDays, parseISO, isToday } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADO_LABEL = {
  pendiente:  { label: 'Pendiente',  color: 'bg-amber-100 text-amber-700' },
  confirmada: { label: 'Confirmada', color: 'bg-green-100 text-green-700' },
  cancelada:  { label: 'Cancelada',  color: 'bg-red-100 text-red-600' },
  completada: { label: 'Completada', color: 'bg-gray-100 text-gray-600' },
}

function WorkerPanel() {
  const { user, negocioId } = useAuth()
  const [empleado, setEmpleado] = useState(null)
  const [citas, setCitas] = useState([])
  const [servicios, setServicios] = useState({})
  const [loading, setLoading] = useState(true)
  const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [actualizando, setActualizando] = useState(null)

  useEffect(() => {
    if (!user || !negocioId) return
    const cargar = async () => {
      // Buscar empleado vinculado al usuario
      const empSnap = await getDocs(
        query(collection(db, 'negocios', negocioId, 'empleados'), where('uid', '==', user.uid))
      )
      if (!empSnap.empty) setEmpleado({ id: empSnap.docs[0].id, ...empSnap.docs[0].data() })

      const svcSnap = await getDocs(collection(db, 'negocios', negocioId, 'servicios'))
      const svcMap = {}
      svcSnap.docs.forEach(d => { svcMap[d.id] = d.data() })
      setServicios(svcMap)
      setLoading(false)
    }
    cargar()
  }, [user, negocioId])

  useEffect(() => {
    if (!negocioId || !empleado) return
    const cargar = async () => {
      const todasCitas = await getCitasNegocio(negocioId, { fecha })
      setCitas(todasCitas.filter(c => c.empleadoId === empleado.id))
    }
    cargar()
  }, [negocioId, empleado, fecha])

  const cambiarEstado = async (cita, nuevoEstado) => {
    setActualizando(cita.id)
    await actualizarEstadoCita(negocioId, cita.id, nuevoEstado)
    setCitas(prev => prev.map(c => c.id === cita.id ? { ...c, estado: nuevoEstado } : c))
    setActualizando(null)
  }

  const citasOrdenadas = [...citas].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
  const proxima = citasOrdenadas.find(c => c.estado === 'confirmada')

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Cargando tu agenda...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <div className="bg-blue-800 px-6 pt-10 pb-6 text-white">
        <p className="text-blue-200 text-sm font-medium">Bienvenido</p>
        <h1 className="text-2xl font-bold mt-0.5">{empleado?.nombre || user?.displayName || 'Trabajador'}</h1>
        {empleado?.especialidad && <p className="text-blue-300 text-sm mt-1">{empleado.especialidad}</p>}
      </div>

      <div className="max-w-lg mx-auto px-6 py-6">

        {/* Próxima cita */}
        {proxima && isToday(parseISO(fecha)) && (
          <div className="bg-white border-2 border-blue-200 rounded-2xl p-4 mb-6 shadow-sm">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">⚡ Próxima cita</p>
            <p className="font-bold text-gray-800 text-lg">{servicios[proxima.servicioId]?.nombre}</p>
            <p className="text-sm text-gray-500 mt-0.5">🕐 {proxima.horaInicio} — {proxima.horaFin}</p>
          </div>
        )}

        {/* Selector de fecha */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setFecha(format(subDays(parseISO(fecha), 1), 'yyyy-MM-dd'))}
              className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50">‹</button>
            <button onClick={() => setFecha(format(addDays(parseISO(fecha), 1), 'yyyy-MM-dd'))}
              className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50">›</button>
          </div>
          <h2 className="font-bold text-gray-800 capitalize">
            {isToday(parseISO(fecha)) ? 'Hoy' : format(parseISO(fecha), "EEEE d 'de' MMMM", { locale: es })}
          </h2>
          <button onClick={() => setFecha(format(new Date(), 'yyyy-MM-dd'))}
            className="text-xs text-blue-700 font-semibold px-3 py-1.5 rounded-lg border border-blue-200 bg-white hover:bg-blue-50">
            Hoy
          </button>
        </div>

        {/* Stats del día */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total', value: citas.length },
            { label: 'Confirmadas', value: citas.filter(c => c.estado === 'confirmada').length },
            { label: 'Completadas', value: citas.filter(c => c.estado === 'completada').length },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-blue-800">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Lista de citas */}
        {citasOrdenadas.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">🗓️</p>
            <p className="font-bold text-gray-600">Sin citas este día</p>
            <p className="text-sm text-gray-400 mt-1">Disfruta tu descanso</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {citasOrdenadas.map(cita => {
              const servicio = servicios[cita.servicioId]
              const est = ESTADO_LABEL[cita.estado] || ESTADO_LABEL.pendiente
              return (
                <div key={cita.id} className="bg-white border border-gray-200 rounded-2xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-gray-800">{servicio?.nombre || 'Servicio'}</p>
                      <p className="text-sm text-gray-500 mt-0.5">🕐 {cita.horaInicio} — {cita.horaFin}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${est.color}`}>{est.label}</span>
                  </div>
                  {cita.notasCliente && (
                    <p className="text-xs text-gray-400 italic mb-3">"{cita.notasCliente}"</p>
                  )}
                  {/* Acciones */}
                  <div className="flex gap-2 mt-2">
                    {cita.estado === 'confirmada' && (
                      <button onClick={() => cambiarEstado(cita, 'completada')} disabled={actualizando === cita.id}
                        className="flex-1 bg-green-600 text-white text-xs font-bold py-2 rounded-xl hover:bg-green-700 disabled:opacity-40">
                        ✓ Marcar completada
                      </button>
                    )}
                    {cita.estado === 'pendiente' && (
                      <button onClick={() => cambiarEstado(cita, 'confirmada')} disabled={actualizando === cita.id}
                        className="flex-1 bg-blue-800 text-white text-xs font-bold py-2 rounded-xl hover:bg-blue-900 disabled:opacity-40">
                        Confirmar
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default WorkerPanel
