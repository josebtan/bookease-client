import { db } from './firebase'
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  updateDoc,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore'
import { format, parseISO, addMinutes, isWithinInterval, parse } from 'date-fns'

// ─────────────────────────────────────────
// CREAR CITA
// ─────────────────────────────────────────
export const crearCita = async ({
  negocioId,
  clienteId,
  empleadoId,
  servicioId,
  fecha,       // "YYYY-MM-DD"
  horaInicio,  // "HH:mm"
  duracion,    // minutos
  monto,
  notasCliente,
}) => {
  const [h, m] = horaInicio.split(':').map(Number)
  const inicio = new Date(`${fecha}T${horaInicio}:00`)
  const fin = addMinutes(inicio, duracion)
  const horaFin = format(fin, 'HH:mm')

  const ref = collection(db, 'negocios', negocioId, 'citas')
  const docRef = await addDoc(ref, {
    negocioId,
    clienteId,
    empleadoId,
    servicioId,
    fecha,
    horaInicio,
    horaFin,
    duracion,
    monto,
    notasCliente: notasCliente || '',
    estado: 'pendiente', // pendiente | confirmada | cancelada | completada
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

// ─────────────────────────────────────────
// OBTENER CITAS DEL NEGOCIO
// ─────────────────────────────────────────
export const getCitasNegocio = async (negocioId, filtros = {}) => {
  const ref = collection(db, 'negocios', negocioId, 'citas')
  let q = query(ref, orderBy('fecha', 'desc'))

  if (filtros.fecha) {
    q = query(ref, where('fecha', '==', filtros.fecha), orderBy('horaInicio'))
  }
  if (filtros.empleadoId) {
    q = query(ref,
      where('empleadoId', '==', filtros.empleadoId),
      orderBy('fecha', 'desc')
    )
  }

  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ─────────────────────────────────────────
// OBTENER CITAS DEL CLIENTE
// ─────────────────────────────────────────
export const getCitasCliente = async (negocioId, clienteId) => {
  const ref = collection(db, 'negocios', negocioId, 'citas')
  const q = query(
    ref,
    where('clienteId', '==', clienteId),
    orderBy('fecha', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ─────────────────────────────────────────
// OBTENER CITAS DEL EMPLEADO EN UNA FECHA
// ─────────────────────────────────────────
export const getCitasEmpleadoFecha = async (negocioId, empleadoId, fecha) => {
  const ref = collection(db, 'negocios', negocioId, 'citas')
  const q = query(
    ref,
    where('empleadoId', '==', empleadoId),
    where('fecha', '==', fecha),
    where('estado', 'in', ['pendiente', 'confirmada'])
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ─────────────────────────────────────────
// ACTUALIZAR ESTADO DE CITA
// ─────────────────────────────────────────
export const actualizarEstadoCita = async (negocioId, citaId, estado) => {
  const ref = doc(db, 'negocios', negocioId, 'citas', citaId)
  await updateDoc(ref, { estado, updatedAt: serverTimestamp() })
}

// ─────────────────────────────────────────
// CALCULAR HORAS DISPONIBLES
// ─────────────────────────────────────────
export const getHorasDisponibles = async ({
  negocioId,
  empleadoId,
  fecha,       // "YYYY-MM-DD"
  duracion,    // minutos
  horarioNegocio, // objeto con dias { Lunes: { activo, inicio, fin }, ... }
}) => {
  // Mapear fecha a día de la semana en español
  const diasMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const diaSemana = diasMap[new Date(fecha + 'T12:00:00').getDay()]

  const horariaDia = horarioNegocio?.[diaSemana]
  if (!horariaDia?.activo) return [] // negocio cerrado ese día

  // Citas ya existentes del empleado en esa fecha
  const citasExistentes = await getCitasEmpleadoFecha(negocioId, empleadoId, fecha)

  // Generar slots cada 30 min dentro del horario del negocio
  const slots = []
  const [hInicio, mInicio] = horariaDia.inicio.split(':').map(Number)
  const [hFin, mFin] = horariaDia.fin.split(':').map(Number)

  let cursor = new Date(`${fecha}T${horariaDia.inicio}:00`)
  const limite = new Date(`${fecha}T${horariaDia.fin}:00`)
  limite.setMinutes(limite.getMinutes() - duracion) // el servicio debe terminar antes del cierre

  while (cursor <= limite) {
    const horaStr = format(cursor, 'HH:mm')
    const finSlot = addMinutes(cursor, duracion)

    // Verificar si este slot choca con alguna cita existente
    const hayConflicto = citasExistentes.some(cita => {
      const citaInicio = new Date(`${fecha}T${cita.horaInicio}:00`)
      const citaFin = new Date(`${fecha}T${cita.horaFin}:00`)
      return cursor < citaFin && finSlot > citaInicio
    })

    if (!hayConflicto) {
      slots.push(horaStr)
    }

    cursor = addMinutes(cursor, 30)
  }

  return slots
}
