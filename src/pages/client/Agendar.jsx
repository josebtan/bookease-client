import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../services/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { getHorasDisponibles, crearCita } from '../../services/appointments'
import { format, addDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const PASOS = ['Servicio', 'Empleado', 'Fecha y hora', 'Confirmar']

function Agendar() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user, userData } = useAuth()

  const [paso, setPaso] = useState(0)
  const [negocio, setNegocio] = useState(null)
  const [servicios, setServicios] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [horasDisponibles, setHorasDisponibles] = useState([])
  const [loading, setLoading] = useState(true)
  const [cargandoHoras, setCargandoHoras] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorHoras, setErrorHoras] = useState(null)

  const [seleccion, setSeleccion] = useState({
    servicio: null,
    empleado: null,
    fecha: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    hora: null,
    notas: '',
  })

  // Cargar negocio y servicios
  useEffect(() => {
    const cargar = async () => {
      const q = query(collection(db, 'negocios'), where('slug', '==', slug))
      const snap = await getDocs(q)
      if (snap.empty) return navigate('/')
      const neg = { id: snap.docs[0].id, ...snap.docs[0].data() }
      setNegocio(neg)

      const svcSnap = await getDocs(collection(db, 'negocios', neg.id, 'servicios'))
      setServicios(svcSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => s.activo))

      setLoading(false)
    }
    cargar()
  }, [slug])

  // Cargar empleados cuando se selecciona servicio
  useEffect(() => {
    if (!seleccion.servicio || !negocio) return
    const cargarEmpleados = async () => {
      const empSnap = await getDocs(collection(db, 'negocios', negocio.id, 'empleados'))
      const todos = empSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(e => e.activo)
      // Solo empleados que ofrecen este servicio (o todos si ninguno tiene serviciosIds)
      const filtrados = todos.filter(e =>
        !e.serviciosIds?.length || e.serviciosIds.includes(seleccion.servicio.id)
      )
      setEmpleados(filtrados)
    }
    cargarEmpleados()
  }, [seleccion.servicio, negocio])

  // Cargar horas disponibles cuando cambia empleado o fecha
  useEffect(() => {
    if (!seleccion.empleado || !seleccion.fecha || !negocio) return
    const cargar = async () => {
      setCargandoHoras(true)
      setErrorHoras(null)
      try {
        const horas = await getHorasDisponibles({
          negocioId: negocio.id,
          empleadoId: seleccion.empleado.id,
          fecha: seleccion.fecha,
          duracion: seleccion.servicio?.duracion || 30,
          horarioNegocio: negocio.horario || null,
        })
        setHorasDisponibles(horas)
        setSeleccion(s => ({ ...s, hora: null }))
      } catch (e) {
        console.error('Error cargando horas:', e)
        setErrorHoras('No se pudo cargar la disponibilidad. Intenta de nuevo.')
        setHorasDisponibles([])
      }
      setCargandoHoras(false)
    }
    cargar()
  }, [seleccion.empleado, seleccion.fecha, negocio])

  const handleConfirmar = async () => {
    if (!user || !negocio) return
    setGuardando(true)
    try {
      await crearCita({
        negocioId: negocio.id,
        clienteId: user.uid,
        empleadoId: seleccion.empleado.id,
        servicioId: seleccion.servicio.id,
        fecha: seleccion.fecha,
        horaInicio: seleccion.hora,
        duracion: seleccion.servicio.duracion,
        monto: seleccion.servicio.precio,
        notasCliente: seleccion.notas,
      })
      navigate(`/negocio/${slug}/mis-citas?nueva=1`)
    } catch (e) {
      console.error(e)
    }
    setGuardando(false)
  }

  // Generar próximos 30 días
  const diasDisponibles = Array.from({ length: 30 }, (_, i) => {
    const d = addDays(new Date(), i + 1)
    return format(d, 'yyyy-MM-dd')
  })

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Cargando...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => paso === 0 ? navigate(`/negocio/${slug}`) : setPaso(p => p - 1)}
          className="text-gray-400 hover:text-gray-600 text-sm font-medium">
          ← Volver
        </button>
        <span className="text-base font-bold text-blue-800">Agendar cita</span>
      </nav>

      {/* STEPPER */}
      <div className="bg-white border-b border-gray-100 px-6 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          {PASOS.map((label, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                ${i < paso ? 'bg-green-500 text-white' : i === paso ? 'bg-blue-800 text-white' : 'bg-gray-100 text-gray-400'}`}>
                {i < paso ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block
                ${i === paso ? 'text-blue-800' : 'text-gray-400'}`}>{label}</span>
              {i < PASOS.length - 1 && <div className="w-6 h-px bg-gray-200 mx-1" />}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8">

        {/* PASO 0 — SERVICIO */}
        {paso === 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">¿Qué servicio necesitas?</h2>
            <div className="flex flex-col gap-3">
              {servicios.map(s => (
                <button key={s.id} onClick={() => { setSeleccion(sel => ({ ...sel, servicio: s, empleado: null, hora: null })); setPaso(1) }}
                  className={`bg-white border-2 rounded-2xl p-4 text-left flex items-center gap-4 transition
                    ${seleccion.servicio?.id === s.id ? 'border-blue-800' : 'border-gray-200 hover:border-blue-300'}`}>
                  {s.imagenUrl && <img src={s.imagenUrl} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />}
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{s.nombre}</p>
                    {s.descripcion && <p className="text-sm text-gray-500 mt-0.5">{s.descripcion}</p>}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm font-bold text-blue-800">${Number(s.precio).toLocaleString('es-CO')}</span>
                      <span className="text-xs text-gray-400">⏱ {s.duracion} min</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PASO 1 — EMPLEADO */}
        {paso === 1 && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">¿Con quién quieres tu cita?</h2>
            <div className="flex flex-col gap-3">
              {/* Opción cualquiera */}
              <button onClick={() => { setSeleccion(s => ({ ...s, empleado: empleados[0] || null, hora: null })); setPaso(2) }}
                className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-4 text-left hover:border-blue-300 transition">
                <p className="font-bold text-gray-700">Cualquier empleado disponible</p>
                <p className="text-sm text-gray-400 mt-0.5">Te asignamos el primero disponible</p>
              </button>
              {empleados.map(e => (
                <button key={e.id} onClick={() => { setSeleccion(s => ({ ...s, empleado: e, hora: null })); setPaso(2) }}
                  className={`bg-white border-2 rounded-2xl p-4 text-left flex items-center gap-4 transition
                    ${seleccion.empleado?.id === e.id ? 'border-blue-800' : 'border-gray-200 hover:border-blue-300'}`}>
                  {e.fotoUrl
                    ? <img src={e.fotoUrl} className="w-12 h-12 rounded-full object-cover flex-shrink-0 border border-gray-100" />
                    : <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-xl flex-shrink-0">👤</div>
                  }
                  <div>
                    <p className="font-bold text-gray-800">{e.nombre}</p>
                    {e.especialidad && <p className="text-sm text-blue-600">{e.especialidad}</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PASO 2 — FECHA Y HORA */}
        {paso === 2 && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Elige fecha y hora</h2>

            {/* Selector de fecha */}
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-600 mb-2">Fecha</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {diasDisponibles.slice(0, 14).map(fecha => {
                  const d = parseISO(fecha)
                  return (
                    <button key={fecha}
                      onClick={() => setSeleccion(s => ({ ...s, fecha, hora: null }))}
                      className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border-2 text-sm transition
                        ${seleccion.fecha === fecha ? 'border-blue-800 bg-blue-800 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'}`}>
                      <span className="text-xs font-medium opacity-70">
                        {format(d, 'EEE', { locale: es }).toUpperCase()}
                      </span>
                      <span className="font-bold text-base">{format(d, 'd')}</span>
                      <span className="text-xs opacity-70">{format(d, 'MMM', { locale: es })}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Horas disponibles */}
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Horas disponibles</p>
              {cargandoHoras ? (
                <p className="text-gray-400 text-sm py-6 text-center">Verificando disponibilidad...</p>
              ) : errorHoras ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <p className="text-sm text-red-700 font-medium">{errorHoras}</p>
                </div>
              ) : horasDisponibles.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                  <p className="text-sm text-amber-700 font-medium">No hay horas disponibles este día</p>
                  <p className="text-xs text-amber-500 mt-1">Prueba con otra fecha</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {horasDisponibles.map(hora => (
                    <button key={hora}
                      onClick={() => setSeleccion(s => ({ ...s, hora }))}
                      className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition
                        ${seleccion.hora === hora ? 'border-blue-800 bg-blue-800 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'}`}>
                      {hora}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {seleccion.hora && (
              <button onClick={() => setPaso(3)}
                className="w-full mt-6 bg-blue-800 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-900">
                Continuar →
              </button>
            )}
          </div>
        )}

        {/* PASO 3 — CONFIRMAR */}
        {paso === 3 && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Confirma tu cita</h2>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-4 mb-6">
              <Row label="Servicio" value={seleccion.servicio?.nombre} />
              <Row label="Empleado" value={seleccion.empleado?.nombre} />
              <Row label="Fecha" value={format(parseISO(seleccion.fecha), "EEEE d 'de' MMMM", { locale: es })} />
              <Row label="Hora" value={`${seleccion.hora} — ${calcFin(seleccion.hora, seleccion.servicio?.duracion)}`} />
              <Row label="Duración" value={`${seleccion.servicio?.duracion} min`} />
              <Row label="Precio" value={`$${Number(seleccion.servicio?.precio).toLocaleString('es-CO')}`} bold />
            </div>

            <div className="mb-6">
              <label className="text-sm font-semibold text-gray-700 mb-1 block">
                Notas adicionales <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <textarea
                value={seleccion.notas}
                onChange={e => setSeleccion(s => ({ ...s, notas: e.target.value }))}
                placeholder="Alguna indicación especial..."
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <button onClick={handleConfirmar} disabled={guardando}
              className="w-full bg-blue-800 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-blue-900 disabled:opacity-40">
              {guardando ? 'Agendando...' : '✓ Confirmar cita'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm ${bold ? 'font-bold text-blue-800 text-base' : 'font-semibold text-gray-800'}`}>{value}</span>
    </div>
  )
}

function calcFin(hora, duracion) {
  if (!hora || !duracion) return ''
  const [h, m] = hora.split(':').map(Number)
  const total = h * 60 + m + duracion
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export default Agendar
