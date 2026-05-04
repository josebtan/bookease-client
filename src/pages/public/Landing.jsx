import { useNavigate } from 'react-router-dom'

function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* NAV */}
      <nav className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-blue-800">AgendaYa</span>
        <button
          onClick={() => navigate('/login')}
          className="bg-blue-800 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-900"
        >
          Iniciar sesión
        </button>
      </nav>

      {/* HERO */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-5xl font-bold text-blue-800 mb-4">
          Gestiona tu negocio<br />con inteligencia
        </h1>
        <p className="text-gray-500 text-lg mb-8 max-w-xl">
          Plataforma de agendamiento de citas para negocios de servicios.
          Tus clientes agendan, tú te enfocas en atender.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="bg-blue-800 text-white px-8 py-3 rounded-lg text-base font-semibold hover:bg-blue-900"
        >
          Registra tu negocio gratis
        </button>
      </div>
    </div>
  )
}

export default Landing