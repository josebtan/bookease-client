import { createContext, useContext, useEffect, useState } from 'react'
import { auth } from '../services/firebase'
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from 'firebase/auth'
import { getUser, createUser } from '../services/auth'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Negocio activo seleccionado en el panel de negocios
  const [negocioActivo, setNegocioActivo] = useState(() => {
    try {
      const stored = sessionStorage.getItem('negocioActivo')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })

  // negocioId para compatibilidad con código existente
  const negocioId = negocioActivo?.id || null

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        let data = await getUser(currentUser.uid)
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
        setUser(null)
        setUserData(null)
        setNegocioActivo(null)
        sessionStorage.removeItem('negocioActivo')
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider)
  }

  const logout = async () => {
    await signOut(auth)
    setNegocioActivo(null)
    sessionStorage.removeItem('negocioActivo')
  }

  const seleccionarNegocio = (negocio) => {
    setNegocioActivo(negocio)
    sessionStorage.setItem('negocioActivo', JSON.stringify(negocio))
  }

  const limpiarNegocio = () => {
    setNegocioActivo(null)
    sessionStorage.removeItem('negocioActivo')
  }

  return (
    <AuthContext.Provider value={{
      user, userData, loading,
      negocioActivo, negocioId,
      seleccionarNegocio, limpiarNegocio,
      loginWithGoogle, logout,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
