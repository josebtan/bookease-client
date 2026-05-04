/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function Login() {
  const { user, loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/admin/dashboard')
  }, [user])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 w-full max-w-md">
        
        {/* LOGO */}
        <div className="text-center mb-8">
          <span className="text-3xl font-bold text-blue-800">AgendaYa</span>
          <p className="text-gray-500 mt-2 text-sm">
            Panel de administración de negocios
          </p>
        </div>

        {/* TÍTULO */}
        <h2 className="text-xl font-bold text-gray-800 mb-1">
          Inicia sesión
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          Accede a tu panel o registra tu negocio
        </p>

        {/* BOTONES */}
        <div className="flex flex-col gap-3">
          <button
            onClick={loginWithGoogle}
            className="flex items-center justify-center gap-3 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" />
            Continuar con Google
          </button>

          <button
            className="flex items-center justify-center gap-3 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            <img src="https://www.facebook.com/favicon.ico" className="w-5 h-5" />
            Continuar con Facebook
          </button>

          <button
            className="flex items-center justify-center gap-3 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            <img src="https://github.com/favicon.ico" className="w-5 h-5" />
            Continuar con GitHub
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Al continuar aceptas nuestros términos y condiciones
        </p>
      </div>
    </div>
  )
}

export default Login 