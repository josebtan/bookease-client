import { createContext, useContext, useEffect, useState } from 'react'
import { auth } from '../services/firebase'
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from 'firebase/auth'
import { getUser, createUser } from '../services/auth'

// Creamos el contexto que compartirá la info del usuario en toda la app
const AuthContext = createContext()

export function AuthProvider({ children }) {
  // user: datos del usuario autenticado (null si no hay sesión)
  // userData: datos del usuario guardados en Firestore (rol, negocioId, etc.)
  // loading: true mientras verifica si hay sesión activa
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // onAuthStateChanged escucha cambios en la sesión automáticamente
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)

        // Verificamos si el usuario ya existe en Firestore
        let data = await getUser(currentUser.uid)

        // Si no existe, lo creamos con sus datos básicos de Google
        if (!data) {
          await createUser(currentUser.uid, {
            nombre: currentUser.displayName,
            email: currentUser.email,
            foto: currentUser.photoURL,
          })
          data = await getUser(currentUser.uid)
        }

        setUserData(data)
      } else {
        // Si no hay sesión, limpiamos todo
        setUser(null)
        setUserData(null)
      }
      setLoading(false)
    })

    // Limpiamos el listener cuando el componente se desmonta
    return () => unsubscribe()
  }, [])

  // Inicia sesión con Google usando popup
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider)
  }

  // Cierra la sesión del usuario
  const logout = async () => {
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, userData, loading, loginWithGoogle, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

// Hook personalizado para usar el contexto fácilmente en cualquier componente
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}