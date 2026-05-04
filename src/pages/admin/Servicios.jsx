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

function Servicios() {
  const { userData } = useAuth()
  const navigate = useNavigate()

  // Lista de servicios del negocio
  const [servicios, setServicios] = useState([])

  // Controla si se muestra el formulario
  const [mostrarForm, setMostrarForm] = useState(false)

  // Servicio que se está editando (null si es nuevo)
  const [editando, setEditando] = useState(null)

  // Archivo de imagen seleccionado pero aún no subido
  const [imagenArchivo, setImagenArchivo] = useState(null)

  // Estado de carga
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)

  // Datos del formulario
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    duracion: '30',
    imagenUrl: '',
  })

  // Carga los servicios desde Firestore al entrar
  useEffect(() => {
    const cargarServicios = async () => {
      if (!userData?.negocioId) return
      const ref = collection(db, 'negocios', userData.negocioId, 'servicios')
      const snap = await getDocs(ref)
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setServicios(lista)
      setLoading(false)
    }
    cargarServicios()
  }, [userData])

  // Actualiza los campos del formulario
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // Abre el formulario para crear un nuevo servicio
  const handleNuevo = () => {
    setEditando(null)
    setImagenArchivo(null)
    setForm({ nombre: '', descripcion: '', precio: '', duracion: '30', imagenUrl: '' })
    setMostrarForm(true)
  }

  // Abre el formulario con los datos del servicio a editar
  const handleEditar = (servicio) => {
    setEditando(servicio)
    setImagenArchivo(null)
    setForm({
      nombre: servicio.nombre,
      descripcion: servicio.descripcion || '',
      precio: servicio.precio,
      duracion: servicio.duracion,
      imagenUrl: servicio.imagenUrl || '',
    })
    setMostrarForm(true)
  }

  // Cancela y cierra el formulario
  const handleCancelar = () => {
    setMostrarForm(false)
    setEditando(null)
    setImagenArchivo(null)
  }

  // Guarda el servicio (nuevo o editado) en Firestore
  const handleGuardar = async () => {
    if (!form.nombre || !form.precio || !form.duracion) return
    setGuardando(true)

    try {
      // Si hay una imagen nueva, la subimos a Cloudinary primero
      let imagenUrl = form.imagenUrl
      if (imagenArchivo) {
        imagenUrl = await subirImagen(
          imagenArchivo,
          'servicio',
          userData.negocioId
        )
      }

      const datos = {
        nombre: form.nombre,
        descripcion: form.descripcion,
        precio: Number(form.precio),
        duracion: Number(form.duracion),
        imagenUrl,
        activo: true,
      }

      if (editando) {
        // EDITAR - actualizamos el documento existente
        const ref = doc(db, 'negocios', userData.negocioId, 'servicios', editando.id)
        await updateDoc(ref, datos)

        // Actualizamos la lista local
        setServicios(servicios.map(s =>
          s.id === editando.id ? { ...s, ...datos } : s
        ))
      } else {
        // CREAR - agregamos un nuevo documento
        const ref = collection(db, 'negocios', userData.negocioId, 'servicios')
        const docRef = await addDoc(ref, {
          ...datos,
          createdAt: serverTimestamp(),
        })

        // Agregamos a la lista local
        setServicios([...servicios, { id: docRef.id, ...datos }])
      }

      handleCancelar()
    } catch (error) {
      console.error('Error al guardar servicio:', error)
    }
    setGuardando(false)
  }

  // Elimina un servicio
  const handleEliminar = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este servicio?')) return
    await deleteDoc(doc(db, 'negocios', userData.negocioId, 'servicios', id))
    setServicios(servicios.filter(s => s.id !== id))
  }

  // Opciones de duración en minutos
  const duraciones = [15, 30, 45, 60, 75, 90, 120]

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
        <span className="text-xl font-bold text-blue-800">Servicios</span>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* ENCABEZADO */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Servicios</h1>
            <p className="text-gray-500 text-sm mt-1">
              Gestiona los servicios que ofrece tu negocio
            </p>
          </div>
          {/* Solo muestra el botón si el formulario no está abierto */}
          {!mostrarForm && (
            <button
              onClick={handleNuevo}
              className="bg-blue-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-900"
            >
              + Nuevo servicio
            </button>
          )}
        </div>

        {/* FORMULARIO - aparece tanto para crear como para editar */}
        {mostrarForm && (
          <div className="bg-white border border-blue-200 rounded-2xl p-6 mb-6 shadow-sm">
            <h3 className="text-base font-bold text-gray-800 mb-4">
              {/* Título cambia según si estamos editando o creando */}
              {editando ? `Editando: ${editando.nombre}` : 'Nuevo servicio'}
            </h3>

            <div className="flex flex-col gap-4">

              {/* Imagen del servicio */}
              <ImageUploader
                label="Imagen del servicio"
                tipo="servicio"
                value={form.imagenUrl}
                onChange={(archivo) => setImagenArchivo(archivo)}
              />

              {/* Nombre */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  Nombre del servicio *
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  placeholder="Ej: Corte clásico"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  Descripción <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  name="descripcion"
                  value={form.descripcion}
                  onChange={handleChange}
                  placeholder="Describe brevemente el servicio..."
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Precio y duración */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">
                    Precio (COP) *
                  </label>
                  <input
                    type="number"
                    name="precio"
                    value={form.precio}
                    onChange={handleChange}
                    placeholder="Ej: 35000"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">
                    Duración *
                  </label>
                  <select
                    name="duracion"
                    value={form.duracion}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                  >
                    {duraciones.map(d => (
                      <option key={d} value={d}>{d} minutos</option>
                    ))}
                  </select>
                </div>
              </div>

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
                  disabled={guardando || !form.nombre || !form.precio}
                  className="bg-blue-800 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-blue-900 disabled:opacity-40"
                >
                  {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear servicio'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LISTA DE SERVICIOS */}
        {loading ? (
          <p className="text-gray-400 text-sm text-center py-10">Cargando servicios...</p>
        ) : servicios.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
            <p className="text-gray-400 text-sm">
              Aún no tienes servicios registrados
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {servicios.map((servicio) => (
              <div
                key={servicio.id}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex"
              >
                {/* Imagen del servicio si existe */}
                {servicio.imagenUrl && (
                  <img
                    src={servicio.imagenUrl}
                    alt={servicio.nombre}
                    className="w-28 h-28 object-cover flex-shrink-0"
                    loading="lazy"
                  />
                )}

                {/* Información del servicio */}
                <div className="flex-1 p-5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-base font-bold text-gray-800">
                        {servicio.nombre}
                      </h3>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                        ${servicio.activo
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'}`}>
                        {servicio.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    {servicio.descripcion && (
                      <p className="text-sm text-gray-500 mb-2">{servicio.descripcion}</p>
                    )}
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-blue-800">
                        ${Number(servicio.precio).toLocaleString('es-CO')}
                      </span>
                      <span className="text-sm text-gray-400">
                        ⏱ {servicio.duracion} min
                      </span>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => handleEditar(servicio)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleEliminar(servicio.id)}
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

export default Servicios