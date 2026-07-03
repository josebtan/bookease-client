import { db } from './firebase'
import {
  collection, doc, getDocs, getDoc, setDoc,
  addDoc, updateDoc, deleteDoc, query,
  where, serverTimestamp
} from 'firebase/firestore'

// Planes disponibles
export const PLANES = {
  gratis: {
    nombre: 'Plan Gratis',
    maxNegocios: 1,
    maxEmpleados: 3,
    maxClientes: 100,
    maxServicios: 6,
    precio: 0,
  },
  plan2: {
    nombre: 'Plan Profesional',
    maxNegocios: 4,
    maxEmpleados: 6,
    maxClientes: 500,
    maxServicios: 12,
    precio: 49000,
  },
  plan3: {
    nombre: 'Plan Empresarial',
    maxNegocios: 10,
    maxEmpleados: Infinity,
    maxClientes: Infinity,
    maxServicios: 50,
    precio: 149000,
    whatsapp: true,
    pushNotifications: true,
  },
}

// Obtener todos los negocios de un usuario
export const getNegociosUsuario = async (uid) => {
  const q = query(collection(db, 'negocios'), where('ownerUid', '==', uid))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// Obtener un negocio por ID
export const getNegocio = async (negocioId) => {
  const snap = await getDoc(doc(db, 'negocios', negocioId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

// Eliminar negocio y sus subcolecciones
export const eliminarNegocio = async (negocioId) => {
  const subcolecciones = ['servicios', 'empleados', 'citas']
  for (const col of subcolecciones) {
    const snap = await getDocs(collection(db, 'negocios', negocioId, col))
    for (const d of snap.docs) {
      await deleteDoc(d.ref)
    }
  }
  await deleteDoc(doc(db, 'negocios', negocioId))
}

// Actualizar estado del negocio
export const actualizarNegocio = async (negocioId, data) => {
  await updateDoc(doc(db, 'negocios', negocioId), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

// Verificar límites del plan
export const verificarLimite = async (negocioId, tipo, planKey) => {
  const plan = PLANES[planKey] || PLANES.gratis
  const snap = await getDocs(collection(db, 'negocios', negocioId, tipo))
  const actual = snap.docs.filter(d => d.data().activo !== false).length
  const maximo = plan[`max${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`]
  return { actual, maximo, permitido: actual < maximo }
}
