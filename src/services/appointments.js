import { db } from './firebase'
import {
  collection,
  addDoc,
  getDocs,
  doc,
  query,
  where,
  updateDoc,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore'
import { format, addMinutes } from 'date-fns'

// ─────────────────────────────────────────
// CREAR CITA
// ─────────────────────────────────────────
export const crearCita = async ({
  negocioId, clienteId, empleadoId, servicioId,
  fecha, horaInicio, duracion, monto, notasCliente,
}) => {
  const inicio = new Date(`${fecha}T${horaInicio}:00`)
  const fin = addMinutes(inicio, duracion)
  const horaFin = format(fin, 'HH:mm')

  const ref = collection(db, 'negocios', negocioId, 'citas')
  const docRef = await addDoc(ref, {
    negocioId, clienteId, empleadoId, servicioId,
    fecha, horaInicio, horaFin, duracion, monto,
    notasCliente: notasCliente || '',
    estado: 'pendiente',
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

// ─────────────────────────────────────────
// OBTENER CITAS DEL NEGOCIO
// Sin orderBy compuesto para evitar índices
// ─────────────────────────────────────────
export const getCitasNegocio = async (negocioId, filtros = {}) => {
  const ref = collection(db, 'negocios', negocioId, 'citas')
  let q

  if (filtros.fecha) {
    q = query(ref, where('fecha', '==', filtros.fecha))
  } else if (filtros.empleadoId) {
    q = query(ref, where('empleadoId', '==', filtros.empleadoId))
  } else {
    q = query(ref)
  }

  const snap = await getDocs(q)
  const citas = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  // Ordenar en cliente para evitar índices compuestos
  return citas.sort((a, b) => b.fecha.localeCompare(a.fecha))
}

// ─────────────────────────────────────────
// OBTENER CITAS DEL CLIENTE
// ─────────────────────────────────────────
export const getCitasCliente = async (negocioId, clienteId) => {
  const ref = collection(db, 'negocios', negocioId, 'citas')
  const q = query(ref, where('clienteId', '==', clienteId))
  const snap = await getDocs(q)
  const citas = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  return citas.sort((a, b) => b.fecha.localeCompare(a.fecha))
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
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(c => ['pendiente', 'confirmada'].includes(c.estado))
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
const HORARIO_DEFAULT = {
  Lunes:     { activo: true,  inicio: '08:00', fin: '18:00' },
  Martes:    { activo: true,  inicio: '08:00', fin: '18:00' },
  Miércoles: { activo: true,  inicio: '08:00', fin: '18:00' },
  Jueves:    { activo: true,  inicio: '08:00', fin: '18:00' },
  Viernes:   { activo: true,  inicio: '08:00', fin: '18:00' },
  Sábado:    { activo: true,  inicio: '08:00', fin: '14:00' },
  Domingo:   { activo: false, inicio: '08:00', fin: '18:00' },
}

export const getHorasDisponibles = async ({
  negocioId, empleadoId, fecha, duracion, horarioNegocio,
}) => {
  const diasMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const diaSemana = diasMap[new Date(fecha + 'T12:00:00').getDay()]

  // Usar horario del negocio o fallback al default
  const horario = horarioNegocio || HORARIO_DEFAULT
  const horariaDia = horario[diaSemana]

  // Si no hay horario para ese día o está inactivo, retornar vacío
  if (!horariaDia || !horariaDia.activo) return []

  const duracionNum = Number(duracion) || 30

  const citasExistentes = await getCitasEmpleadoFecha(negocioId, empleadoId, fecha)

  const slots = []
  let cursor = new Date(`${fecha}T${horariaDia.inicio}:00`)
  const limite = new Date(`${fecha}T${horariaDia.fin}:00`)
  limite.setMinutes(limite.getMinutes() - duracionNum)

  while (cursor <= limite) {
    const horaStr = format(cursor, 'HH:mm')
    const finSlot = addMinutes(cursor, duracionNum)

    const hayConflicto = citasExistentes.some(cita => {
      const citaInicio = new Date(`${fecha}T${cita.horaInicio}:00`)
      const citaFin = new Date(`${fecha}T${cita.horaFin}:00`)
      return cursor < citaFin && finSlot > citaInicio
    })

    if (!hayConflicto) slots.push(horaStr)
    cursor = addMinutes(cursor, 30)
  }

  return slots
}
