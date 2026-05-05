import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../services/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { subirImagen } from '../../services/storage'
import QRNegocio from '../../components/ui/QRNegocio'

function Dashboard() {
  const { user, userData, logout } = useAuth()
  const navigate = useNavigate()

  // Datos del negocio
  const [negocio, setNegocio] = useState(null)

  // Controla si se muestra el panel de edición de imágenes
  const [editandoImagenes, setEditandoImagenes] = useState(false)

  // Archivos seleccionados para logo y banner
  const [logoArchivo, setLogoArchivo] = useState(null)
  const [bannerArchivo, setBannerArchivo] = useState(null)

  // Previsualizaciones locales
  const [logoPreview, setLogoPreview] = useState(null)
  const [bannerPreview, setBannerPreview] = useState(null)

  // Estado de carga
  const [loading, setLoading] = useState(true)
  const [guardandoImagenes, setGuardandoImagenes] = useState(false)

  useEffect(() => {
    const cargarNegocio = async () => {
      if (userData?.negocioId) {
        const ref = doc(db, 'negocios', userData.negocioId)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          setNegocio(snap.data())
        }
      }
      setLoading(false)
    }
    cargarNegocio()
  }, [userData])

  // Cierra sesión
  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // Maneja la selección de logo
  const handleLogoChange = (e) => {
    const archivo = e.target.files[0]
    if (!archivo) return
    setLogoArchivo(archivo)
    setLogoPreview(URL.createObjectURL(archivo))
  }

  // Maneja la selección de banner
  const handleBannerChange = (e) => {
    const archivo = e.target.files[0]
    if (!archivo) return
    setBannerArchivo(archivo)
    setBannerPreview(URL.createObjectURL(archivo))
  }

  // Sube las imágenes a Cloudinary y actualiza Firestore
  const handleGuardarImagenes = async () => {
    if (!logoArchivo && !bannerArchivo) return
    setGuardandoImagenes(true)

    try {
      const actualizaciones = {}

      // Subimos el logo si hay uno nuevo
      if (logoArchivo) {
        const logoUrl = await subirImagen(logoArchivo, 'logo', userData.negocioId)
        actualizaciones.logoUrl = logoUrl
      }

      // Subimos el banner si hay uno nuevo
      if (bannerArchivo) {
        const bannerUrl = await subirImagen(bannerArchivo, 'banner', userData.negocioId)
        actualizaciones.bannerUrl = bannerUrl
      }

      // Actualizamos Firestore
      await updateDoc(doc(db, 'negocios', userData.negocioId), actualizaciones)

      // Actualizamos el estado local
      setNegocio({ ...negocio, ...actualizaciones })

      // Limpiamos y cerramos el panel
      setLogoArchivo(null)
      setBannerArchivo(null)
      setLogoPreview(null)
      setBannerPreview(null)
      setEditandoImagenes(false)

    } catch (error) {
      console.error('Error al guardar imágenes:', error)
    }
    setGuardandoImagenes(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* BARRA DE NAVEGACIÓN */}
      <nav className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-blue-800">AgendaYa</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.displayName}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 hover:text-red-700 font-semibold"
          >
            Cerrar sesión
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* SALUDO */}
        <h1 className="text-2xl font-bold text-gray-800 mb-1">
          Bienvenido, {user?.displayName} 👋
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          Panel de administración de tu negocio
        </p>

        {!negocio ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
            <p className="text-gray-400 text-sm mb-4">
              Aún no tienes un negocio registrado
            </p>
            <button
              onClick={() => navigate('/admin/registro-negocio')}
              className="bg-blue-800 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-blue-900"
            >
              Registrar mi negocio
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">

            {/* TARJETA DEL NEGOCIO */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">

              {/* BANNER */}
              <div className="relative w-full h-36 bg-gradient-to-r from-blue-800 to-blue-600">
                {negocio.bannerUrl && (
                  <img
                    src={bannerPreview || negocio.bannerUrl}
                    alt="Banner"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
                {bannerPreview && !negocio.bannerUrl && (
                  <img
                    src={bannerPreview}
                    alt="Banner preview"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
                {/* Botón editar imágenes */}
                <button
                  onClick={() => setEditandoImagenes(!editandoImagenes)}
                  className="absolute top-3 right-3 bg-black/40 hover:bg-black/60 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                >
                  {editandoImagenes ? 'Cancelar' : '✏️ Editar imágenes'}
                </button>
              </div>

              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">

                  {/* LOGO */}
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-gray-100 bg-blue-50 flex items-center justify-center">
                      {logoPreview || negocio.logoUrl ? (
                        <img
                          src={logoPreview || negocio.logoUrl}
                          alt="Logo"
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-2xl">🏪</span>
                      )}
                    </div>
                  </div>

                  {/* INFO DEL NEGOCIO */}
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                      {negocio.categoria}
                    </span>
                    <h2 className="text-xl font-bold text-gray-800 mt-0.5">
                      {negocio.nombre}
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                      {negocio.descripcion}
                    </p>
                  </div>

                  {/* BADGES Y QR */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full">
                      Plan {negocio.plan}
                    </span>
                    <QRNegocio slug={negocio.slug} nombreNegocio={negocio.nombre} />
                  </div>
                </div>

                {/* PANEL DE EDICIÓN DE IMÁGENES */}
                {editandoImagenes && (
                  <div className="border border-blue-100 bg-blue-50 rounded-2xl p-5 mb-4">
                    <p className="text-sm font-bold text-gray-700 mb-4">
                      Actualizar imágenes del negocio
                    </p>

                    <div className="grid grid-cols-2 gap-6">

                      {/* SELECTOR DE LOGO */}
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                          Logo
                        </p>
                        <label className="block cursor-pointer">
                          <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-blue-300 bg-white flex items-center justify-center overflow-hidden hover:border-blue-500 transition">
                            {logoPreview ? (
                              <img src={logoPreview} className="w-full h-full object-cover" />
                            ) : negocio.logoUrl ? (
                              <img src={negocio.logoUrl} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-2xl">🏪</span>
                            )}
                          </div>
                          <p className="text-xs text-blue-600 font-medium mt-2 text-center">
                            {logoPreview ? 'Cambiar logo' : 'Subir logo'}
                          </p>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoChange}
                          />
                        </label>
                      </div>

                      {/* SELECTOR DE BANNER */}
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                          Banner
                        </p>
                        <label className="block cursor-pointer">
                          <div className="w-full h-24 rounded-2xl border-2 border-dashed border-blue-300 bg-white flex items-center justify-center overflow-hidden hover:border-blue-500 transition">
                            {bannerPreview ? (
                              <img src={bannerPreview} className="w-full h-full object-cover" />
                            ) : negocio.bannerUrl ? (
                              <img src={negocio.bannerUrl} className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-center">
                                <span className="text-2xl block">🖼️</span>
                                <span className="text-xs text-gray-400">Subir banner</span>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-blue-600 font-medium mt-2 text-center">
                            {bannerPreview ? 'Cambiar banner' : 'Subir banner'}
                          </p>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleBannerChange}
                          />
                        </label>
                      </div>
                    </div>

                    {/* BOTÓN GUARDAR IMÁGENES */}
                    {(logoArchivo || bannerArchivo) && (
                      <button
                        onClick={handleGuardarImagenes}
                        disabled={guardandoImagenes}
                        className="mt-4 bg-blue-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-900 disabled:opacity-40"
                      >
                        {guardandoImagenes ? 'Guardando...' : 'Guardar imágenes'}
                      </button>
                    )}
                  </div>
                )}

                {/* INFORMACIÓN DE CONTACTO */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Ciudad</p>
                    <p className="text-sm text-gray-700 font-medium">{negocio.ciudad}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Dirección</p>
                    <p className="text-sm text-gray-700 font-medium">{negocio.direccion}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Teléfono</p>
                    <p className="text-sm text-gray-700 font-medium">{negocio.telefono}</p>
                  </div>
                  {negocio.instagram && (
                    <div>
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Instagram</p>
                      <p className="text-sm text-gray-700 font-medium">{negocio.instagram}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ACCESOS RÁPIDOS */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: 'Servicios',    icon: '✂️', ruta: '/admin/servicios' },
                { label: 'Empleados',    icon: '👥', ruta: '/admin/empleados' },
                { label: 'Citas',        icon: '📅', ruta: '/admin/citas' },
                { label: 'Estadísticas', icon: '📊', ruta: '/admin/estadisticas' },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => navigate(item.ruta)}
                  className="bg-white border border-gray-200 rounded-2xl p-6 text-center hover:border-blue-300 hover:shadow-sm transition"
                >
                  <div className="text-3xl mb-2">{item.icon}</div>
                  <p className="text-sm font-semibold text-gray-700">{item.label}</p>
                </button>
              ))}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard