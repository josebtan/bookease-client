import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../services/firebase'
import { collection, getDocs } from 'firebase/firestore'
import { getCitasNegocio, actualizarEstadoCita } from '../../services/appointments'
import { format, addDays, subDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADOS = ['todos', 'pendiente', 'confirmada', 'cancelada', 'completada']
const ESTADO_LABEL = {
  pendiente:  { label: 'Pendiente',  color: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-400' },
  confirmada: { label: 'Confirmada', color: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  cancelada:  { label: 'Cancelada',  color: 'bg-red-100 text-red-600',     dot: 'bg-red-400' },
  completada: { label: 'Completada', color: 'bg-gray-100 text-gray-600',   dot: 'bg-gray-400' },
}

function Citas() {
  const { negocioId } = useAuth()
  const [citas, setCitas] = useState([])
  const [servicios, setServicios] = useState({})
  const [empleados, setEmpleados] = useState({})
  const [loading, setLoading] = useState(true)
  const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [filtroEmpleado, setFiltroEmpleado] = useState('todos')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [actualizando, setActualizando] = useState(null)

  useEffect(() => {
    if (!negocioId) return
    const cargar = async () => {
      const [svcSnap, empSnap] = await Promise.all([
        getDocs(collection(db, 'negocios', negocioId, 'servicios')),
        getDocs(collection(db, 'negocios', negocioId, 'empleados')),
      ])
      const svcMap = {}
      svcSnap.docs.forEach(d => { svcMap[d.id] = d.data() })
      const empMap = {}
      empSnap.docs.forEach(d => { empMap[d.id] = d.data() })
      setServicios(svcMap)
      setEmpleados(empMap)
    }
    cargar()
  }, [negocioId])

  useEffect(() => {
    if (!negocioId) return
    const cargar = async () => {
      setLoading(true)
      const data = await getCitasNegocio(negocioId, { fecha })
      setCitas(data)
      setLoading(false)
    }
    cargar()
  }, [negocioId, fecha])

  const cambiarEstado = async (cita, nuevoEstado) => {
    setActualizando(cita.id)
    await actualizarEstadoCita(negocioId, cita.id, nuevoEstado)
    setCitas(prev => prev.map(c => c.id === cita.id ? { ...c, estado: nuevoEstado } : c))
    setActualizando(null)
  }

  const citasFiltradas = citas.filter(c => {
    if (filtroEmpleado !== 'todos' && c.empleadoId !== filtroEmpleado) return false
    if (filtroEstado !== 'todos' && c.estado !== filtroEstado) return false
    return true
  })

  // Métricas del día
  const totalDia = citas.length
  const confirmadas = citas.filter(c => c.estado === 'confirmada').length
  const pendientes = citas.filter(c => c.estado === 'pendiente').length
  const ingresosDia = citas
    .filter(c => ['confirmada', 'completada'].includes(c.estado))
    .reduce((sum, c) => sum + (c.monto || 0), 0)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Gestión de citas</h1>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total hoy', value: totalDia, color: 'text-gray-800' },
          { label: 'Confirmadas', value: confirmadas, color: 'text-green-600' },
          { label: 'Pendientes', value: pendientes, color: 'text-amber-600' },
          { label: 'Ingresos', value: `$${ingresosDia.toLocaleString('es-CO')}`, color: 'text-blue-700' },
        ].map(m => (
          <div key={m.label} className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="text-xs text-gray-500 font-medium">{m.label}</p>
            <p className={`text-2xl font-bold mt-1 ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* FILTROS */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-3">
        {/* Navegación de fecha */}
        <div className="flex items-center gap-2">
          <button onClick={() => setFecha(format(subDays(parseISO(fecha), 1), 'yyyy-MM-dd'))}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500">‹</button>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500" />
          <button onClick={() => setFecha(format(addDays(parseISO(fecha), 1), 'yyyy-MM-dd'))}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500">›</button>
          <button onClick={() => setFecha(format(new Date(), 'yyyy-MM-dd'))}
            className="text-xs text-blue-700 font-semibold px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50">Hoy</button>
        </div>

        {/* Filtro empleado */}
        <select value={filtroEmpleado} onChange={e => setFiltroEmpleado(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none">
          <option value="todos">Todos los empleados</option>
          {Object.entries(empleados).map(([id, e]) => (
            <option key={id} value={id}>{e.nombre}</option>
          ))}
        </select>

        {/* Filtro estado */}
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none">
          {ESTADOS.map(e => (
            <option key={e} value={e}>{e === 'todos' ? 'Todos los estados' : ESTADO_LABEL[e]?.label}</option>
          ))}
        </select>
      </div>

      {/* TABLA DE CITAS */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Cargando citas...</div>
      ) : citasFiltradas.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📭</p>
          <p className="font-bold text-gray-600">No hay citas para este día</p>
          <p className="text-sm text-gray-400 mt-1">Prueba con otra fecha o cambia los filtros</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {citasFiltradas
            .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
            .map(cita => {
              const servicio = servicios[cita.servicioId]
              const empleado = empleados[cita.empleadoId]
              const est = ESTADO_LABEL[cita.estado] || ESTADO_LABEL.pendiente
              return (
                <div key={cita.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Hora */}
                  <div className="flex-shrink-0 text-center bg-blue-50 rounded-xl px-4 py-3 w-24">
                    <p className="text-lg font-bold text-blue-800">{cita.horaInicio}</p>
                    <p className="text-xs text-blue-500">{cita.horaFin}</p>
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-gray-800">{servicio?.nombre || 'Servicio'}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${est.color}`}>{est.label}</span>
                    </div>
                    <p className="text-sm text-gray-500">👤 {empleado?.nombre || 'Empleado'}</p>
                    {cita.notasCliente && (
                      <p className="text-xs text-gray-400 mt-1 italic">"{cita.notasCliente}"</p>
                    )}
                  </div>

                  {/* Monto */}
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-blue-800">${Number(cita.monto).toLocaleString('es-CO')}</p>
                    <p className="text-xs text-gray-400">{cita.duracion} min</p>
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-2 flex-shrink-0">
                    {cita.estado === 'pendiente' && (
                      <>
                        <button
                          onClick={() => cambiarEstado(cita, 'confirmada')}
                          disabled={actualizando === cita.id}
                          className="bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-40">
                          Confirmar
                        </button>
                        <button
                          onClick={() => cambiarEstado(cita, 'cancelada')}
                          disabled={actualizando === cita.id}
                          className="bg-red-50 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-100 border border-red-200 disabled:opacity-40">
                          Cancelar
                        </button>
                      </>
                    )}
                    {cita.estado === 'confirmada' && (
                      <button
                        onClick={() => cambiarEstado(cita, 'completada')}
                        disabled={actualizando === cita.id}
                        className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40">
                        Completar
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}

export default Citas
