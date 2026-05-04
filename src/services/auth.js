import { db } from './firebase'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

// Verifica si un usuario ya existe en Firestore.
// Retorna el documento del usuario o null si no existe.
export const getUser = async (uid) => {
  const ref = doc(db, 'users', uid)
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data() : null
}

// Crea un nuevo usuario en Firestore cuando se registra por primera vez.
// Por defecto le asigna el rol de 'admin'.
export const createUser = async (uid, data) => {
  const ref = doc(db, 'users', uid)
  await setDoc(ref, {
    ...data,
    rol: 'admin',
    createdAt: serverTimestamp(),
  })
}