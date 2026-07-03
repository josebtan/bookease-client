import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../services/firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

// Categorías de negocios disponibles en la plataforma
const CATEGORIAS = [
  'Barbería y Estilismo',
  'Salud y Medicina',
  'Belleza y Spa',
  'Fitness y Deporte',
  'Veterinaria',
  'Educación y Tutorías',
  'Consultoría',
  'Otro',
]

// Días de la semana para configurar el horario
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function RegisterBusiness() {
  const { user, userData } = useAuth()
  const navigate = useNavigate()

  // Paso actual del wizard (1, 2 o 3)
  const [paso, setPaso] = useState(1)

  // Estado de carga mientras se guarda en Firestore
  const [loading, setLoading] = useState(false)

  // Datos del formulario organizados por paso
  const [form, setForm] = useState({
    // Paso 1 - Datos básicos
    nombre: '',
    categoria: '',
    descripcion: '',
    // Paso 2 - Ubicación y contacto
    ciudad: '',
    direccion: '',
    telefono: '',
    instagram: '',
    // Paso 3 - Horario
    horario: {
      Lunes:     { activo: true,  inicio: '09:00', fin: '18:00' },
      Martes:    { activo: true,  inicio: '09:00', fin: '18:00' },
      Miércoles: { activo: true,  inicio: '09:00', fin: '18:00' },
      Jueves:    { activo: true,  inicio: '09:00', fin: '18:00' },
      Viernes:   { activo: true,  inicio: '09:00', fin: '18:00' },
      Sábado:    { activo: true,  inicio: '09:00', fin: '14:00' },
      Domingo:   { activo: false, inicio: '09:00', fin: '18:00' },
    }
  })

  // Actualiza cualquier campo del formulario
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // Actualiza el horario de un día específico
  const handleHorario = (dia, campo, valor) => {
    setForm({
      ...form,
      horario: {
        ...form.horario,
        [dia]: { ...form.horario[dia], [campo]: valor }
      }
    })
  }

  // Genera un slug único a partir del nombre del negocio
  // Ejemplo: "Barbería Noir" → "barberia-noir"
  const generarSlug = (nombre) => {
    return nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  // Guarda el negocio en Firestore al finalizar el wizard
  const handleSubmit = async () => {
    setLoading(true)
    try {
      const slug = generarSlug(form.nombre)
      const negocioId = `${slug}-${user.uid.slice(0, 6)}`

      // Guardamos el negocio en la colección 'negocios'
      await setDoc(doc(db, 'negocios', negocioId), {
        ...form,
        slug,
        negocioId,
        ownerUid: user.uid,
        ownerId: user.uid,
        plan: userData?.plan || 'gratis',
        estado: 'activo',
        activo: true,
        createdAt: serverTimestamp(),
      })

      // Redirigimos al panel de negocios
      navigate('/admin/negocios')
    } catch (error) {
      console.error('Error al registrar negocio:', error)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* BARRA SUPERIOR */}
      <nav className="bg-white border-b border-gray-200 px-8 py-4">
        <span className="text-xl font-bold text-blue-800">AgendaYa</span>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-lg p-8">

          {/* INDICADOR DE PASOS */}
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${paso >= n ? 'bg-blue-800 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {n}
                </div>
                <span className={`text-sm font-medium hidden sm:block
                  ${paso >= n ? 'text-blue-800' : 'text-gray-400'}`}>
                  {n === 1 ? 'Datos básicos' : n === 2 ? 'Contacto' : 'Horario'}
                </span>
                {/* Línea conectora entre pasos */}
                {n < 3 && (
                  <div className={`w-12 h-0.5 mx-2 ${paso > n ? 'bg-blue-800' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>

          {/* ── PASO 1: DATOS BÁSICOS ── */}
          {paso === 1 && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">Datos de tu negocio</h2>
              <p className="text-gray-500 text-sm mb-6">Cuéntanos sobre tu negocio</p>

              <div className="flex flex-col gap-4">
                {/* Nombre del negocio */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">
                    Nombre del negocio *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    placeholder="Ej: Barbería Noir"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Categoría */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">
                    Categoría *
                  </label>
                  <select
                    name="categoria"
                    value={form.categoria}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Selecciona una categoría</option>
                    {CATEGORIAS.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Descripción */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">
                    Descripción
                  </label>
                  <textarea
                    name="descripcion"
                    value={form.descripcion}
                    onChange={handleChange}
                    placeholder="Describe brevemente tu negocio..."
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── PASO 2: UBICACIÓN Y CONTACTO ── */}
          {paso === 2 && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">Ubicación y contacto</h2>
              <p className="text-gray-500 text-sm mb-6">¿Dónde y cómo te encuentran tus clientes?</p>

              <div className="flex flex-col gap-4">
                {/* Ciudad */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">
                    Ciudad *
                  </label>
                  <input
                    type="text"
                    name="ciudad"
                    value={form.ciudad}
                    onChange={handleChange}
                    placeholder="Ej: Bogotá"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Dirección */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">
                    Dirección *
                  </label>
                  <input
                    type="text"
                    name="direccion"
                    value={form.direccion}
                    onChange={handleChange}
                    placeholder="Ej: Cra 13 #63-45, Chapinero"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Teléfono */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    name="telefono"
                    value={form.telefono}
                    onChange={handleChange}
                    placeholder="Ej: +57 300 123 4567"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Instagram (opcional) */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">
                    Instagram <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    name="instagram"
                    value={form.instagram}
                    onChange={handleChange}
                    placeholder="@tunegocio"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── PASO 3: HORARIO ── */}
          {paso === 3 && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">Horario de atención</h2>
              <p className="text-gray-500 text-sm mb-6">¿Cuándo atiende tu negocio?</p>

              <div className="flex flex-col gap-3">
                {DIAS.map((dia) => (
                  <div key={dia} className="flex items-center gap-3">

                    {/* Toggle para activar/desactivar el día */}
                    <input
                      type="checkbox"
                      checked={form.horario[dia].activo}
                      onChange={(e) => handleHorario(dia, 'activo', e.target.checked)}
                      className="w-4 h-4 accent-blue-800"
                    />

                    {/* Nombre del día */}
                    <span className={`text-sm font-medium w-24
                      ${form.horario[dia].activo ? 'text-gray-800' : 'text-gray-400'}`}>
                      {dia}
                    </span>

                    {/* Hora de inicio y fin - solo si el día está activo */}
                    {form.horario[dia].activo ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="time"
                          value={form.horario[dia].inicio}
                          onChange={(e) => handleHorario(dia, 'inicio', e.target.value)}
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                        />
                        <span className="text-gray-400 text-sm">a</span>
                        <input
                          type="time"
                          value={form.horario[dia].fin}
                          onChange={(e) => handleHorario(dia, 'fin', e.target.value)}
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Cerrado</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BOTONES DE NAVEGACIÓN */}
          <div className="flex justify-between mt-8">
            {/* Botón anterior - oculto en el paso 1 */}
            {paso > 1 ? (
              <button
                onClick={() => setPaso(paso - 1)}
                className="text-sm font-semibold text-gray-500 hover:text-gray-700"
              >
                ← Anterior
              </button>
            ) : <div />}

            {/* Botón siguiente o finalizar */}
            {paso < 3 ? (
              <button
                onClick={() => setPaso(paso + 1)}
                disabled={
                  // Validación paso 1: nombre y categoría obligatorios
                  (paso === 1 && (!form.nombre || !form.categoria)) ||
                  // Validación paso 2: ciudad, dirección y teléfono obligatorios
                  (paso === 2 && (!form.ciudad || !form.direccion || !form.telefono))
                }
                className="bg-blue-800 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-900 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-blue-800 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-900 disabled:opacity-40"
              >
                {loading ? 'Guardando...' : 'Finalizar registro ✓'}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

export default RegisterBusiness