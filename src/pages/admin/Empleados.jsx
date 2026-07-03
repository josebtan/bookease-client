import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../services/firebase'
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore'
import { subirImagen } from '../../services/storage'
import ImageUploader from '../../components/ui/ImageUploader'

function Empleados() {
  const { userData, negocioId } = useAuth()
  const navigate = useNavigate()

  // Lista de empleados del negocio
  const [empleados, setEmpleados] = useState([])

  // Lista de servicios disponibles para asignar al empleado
  const [servicios, setServicios] = useState([])

  // Controla si se muestra el formulario
  const [mostrarForm, setMostrarForm] = useState(false)

  // Empleado que se está editando (null si es nuevo)
  const [editando, setEditando] = useState(null)

  // Archivo de foto seleccionado
  const [fotoArchivo, setFotoArchivo] = useState(null)

  // Estados de carga
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)

  // Datos del formulario
  const [form, setForm] = useState({
    nombre: '',
    especialidad: '',
    bio: '',
    telefono: '',
    fotoUrl: '',
    serviciosIds: [], // IDs de los servicios asignados al empleado
  })

  // Carga empleados y servicios desde Firestore al entrar
  useEffect(() => {
    const cargarDatos = async () => {
      if (!negocioId) return

      // Cargamos empleados
      const empRef = collection(db, 'negocios', negocioId, 'empleados')
      const empSnap = await getDocs(empRef)
      setEmpleados(empSnap.docs.map(d => ({ id: d.id, ...d.data() })))

      // Cargamos servicios para el selector de asignación
      const svcRef = collection(db, 'negocios', negocioId, 'servicios')
      const svcSnap = await getDocs(svcRef)
      setServicios(svcSnap.docs.map(d => ({ id: d.id, ...d.data() })))

      setLoading(false)
    }
    cargarDatos()
  }, [userData])

  // Actualiza los campos de texto del formulario
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // Agrega o quita un servicio de la lista de servicios asignados
  const handleToggleServicio = (servicioId) => {
    const yaAsignado = form.serviciosIds.includes(servicioId)
    setForm({
      ...form,
      serviciosIds: yaAsignado
        ? form.serviciosIds.filter(id => id !== servicioId)
        : [...form.serviciosIds, servicioId]
    })
  }

  // Abre el formulario para crear un nuevo empleado
  const handleNuevo = () => {
    setEditando(null)
    setFotoArchivo(null)
    setForm({ nombre: '', especialidad: '', bio: '', telefono: '', fotoUrl: '', serviciosIds: [] })
    setMostrarForm(true)
  }

  // Abre el formulario con los datos del empleado a editar
  const handleEditar = (empleado) => {
    setEditando(empleado)
    setFotoArchivo(null)
    setForm({
      nombre: empleado.nombre,
      especialidad: empleado.especialidad || '',
      bio: empleado.bio || '',
      telefono: empleado.telefono || '',
      fotoUrl: empleado.fotoUrl || '',
      serviciosIds: empleado.serviciosIds || [],
    })
    setMostrarForm(true)
  }

  // Cancela y cierra el formulario
  const handleCancelar = () => {
    setMostrarForm(false)
    setEditando(null)
    setFotoArchivo(null)
  }

  // Guarda el empleado en Firestore
  const handleGuardar = async () => {
    if (!form.nombre) return
    setGuardando(true)

    try {
      // Si hay foto nueva la subimos a Cloudinary
      let fotoUrl = form.fotoUrl
      if (fotoArchivo) {
        fotoUrl = await subirImagen(
          fotoArchivo,
          'logo',
          `${negocioId}/empleados`
        )
      }

      const datos = {
        nombre: form.nombre,
        especialidad: form.especialidad,
        bio: form.bio,
        telefono: form.telefono,
        fotoUrl,
        serviciosIds: form.serviciosIds,
        activo: true,
      }

      if (editando) {
        // EDITAR - actualizamos el documento existente
        const ref = doc(db, 'negocios', negocioId, 'empleados', editando.id)
        await updateDoc(ref, datos)
        setEmpleados(empleados.map(e =>
          e.id === editando.id ? { ...e, ...datos } : e
        ))
      } else {
        // CREAR - agregamos nuevo documento
        const ref = collection(db, 'negocios', negocioId, 'empleados')
        const docRef = await addDoc(ref, {
          ...datos,
          calificacion: 0,
          totalCitas: 0,
          createdAt: serverTimestamp(),
        })
        setEmpleados([...empleados, { id: docRef.id, ...datos }])
      }

      handleCancelar()
    } catch (error) {
      console.error('Error al guardar empleado:', error)
    }
    setGuardando(false)
  }

  // Elimina un empleado
  const handleEliminar = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este empleado?')) return
    await deleteDoc(doc(db, 'negocios', negocioId, 'empleados', id))
    setEmpleados(empleados.filter(e => e.id !== id))
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* BARRA DE NAVEGACIÓN */}
      <nav className="bg-white border-b border-gray-200 px-8 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="text-gray-400 hover:text-gray-600 text-sm font-medium"
        >
          ← Volver
        </button>
        <span className="text-xl font-bold text-blue-800">Empleados</span>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* ENCABEZADO */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Empleados</h1>
            <p className="text-gray-500 text-sm mt-1">
              Gestiona el equipo de tu negocio
            </p>
          </div>
          {!mostrarForm && (
            <button
              onClick={handleNuevo}
              className="bg-blue-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-900"
            >
              + Nuevo empleado
            </button>
          )}
        </div>

        {/* FORMULARIO */}
        {mostrarForm && (
          <div className="bg-white border border-blue-200 rounded-2xl p-6 mb-6 shadow-sm">
            <h3 className="text-base font-bold text-gray-800 mb-4">
              {editando ? `Editando: ${editando.nombre}` : 'Nuevo empleado'}
            </h3>

            <div className="flex flex-col gap-4">

              {/* Foto del empleado */}
              <ImageUploader
                label="Foto del empleado"
                tipo="logo"
                value={form.fotoUrl}
                onChange={(archivo) => setFotoArchivo(archivo)}
              />

              {/* Nombre */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  placeholder="Ej: Carlos Mendoza"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Especialidad y teléfono */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">
                    Especialidad
                  </label>
                  <input
                    type="text"
                    name="especialidad"
                    value={form.especialidad}
                    onChange={handleChange}
                    placeholder="Ej: Senior Barber"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    name="telefono"
                    value={form.telefono}
                    onChange={handleChange}
                    placeholder="Ej: 300 123 4567"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  Descripción <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  name="bio"
                  value={form.bio}
                  onChange={handleChange}
                  placeholder="Cuéntanos sobre este empleado..."
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Servicios asignados */}
              {servicios.length > 0 && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Servicios que ofrece
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {servicios.map(servicio => (
                      <button
                        key={servicio.id}
                        type="button"
                        onClick={() => handleToggleServicio(servicio.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition
                          ${form.serviciosIds.includes(servicio.id)
                            ? 'bg-blue-800 text-white border-blue-800'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                          }`}
                      >
                        {servicio.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Botones */}
              <div className="flex justify-end gap-3 mt-2">
                <button
                  onClick={handleCancelar}
                  className="text-sm text-gray-500 hover:text-gray-700 font-semibold px-4 py-2"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardar}
                  disabled={guardando || !form.nombre}
                  className="bg-blue-800 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-blue-900 disabled:opacity-40"
                >
                  {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear empleado'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LISTA DE EMPLEADOS */}
        {loading ? (
          <p className="text-gray-400 text-sm text-center py-10">Cargando empleados...</p>
        ) : empleados.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
            <p className="text-gray-400 text-sm">
              Aún no tienes empleados registrados
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {empleados.map((empleado) => (
              <div
                key={empleado.id}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex"
              >
                {/* Foto del empleado */}
                {empleado.fotoUrl ? (
                  <img
                    src={empleado.fotoUrl}
                    alt={empleado.nombre}
                    className="w-24 h-24 object-cover flex-shrink-0"
                    loading="lazy"
                  />
                ) : (
                  // Avatar por defecto si no tiene foto
                  <div className="w-24 h-24 bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-3xl">👤</span>
                  </div>
                )}

                {/* Información del empleado */}
                <div className="flex-1 p-5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-base font-bold text-gray-800">
                        {empleado.nombre}
                      </h3>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                        ${empleado.activo
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'}`}>
                        {empleado.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    {empleado.especialidad && (
                      <p className="text-sm text-blue-600 font-medium mb-1">
                        {empleado.especialidad}
                      </p>
                    )}
                    {empleado.bio && (
                      <p className="text-sm text-gray-500">{empleado.bio}</p>
                    )}
                    {/* Servicios asignados */}
                    {empleado.serviciosIds?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {empleado.serviciosIds.map(id => {
                          const svc = servicios.find(s => s.id === id)
                          return svc ? (
                            <span key={id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {svc.nombre}
                            </span>
                          ) : null
                        })}
                      </div>
                    )}
                  </div>

                  {/* Botones de acción */}
                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => handleEditar(empleado)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleEliminar(empleado.id)}
                      className="text-red-400 hover:text-red-600 text-sm font-semibold"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Empleados