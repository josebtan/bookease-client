import imageCompression from 'browser-image-compression'

// Configuraciones de compresión según el tipo de imagen
// Así optimizamos el tamaño antes de subir a Cloudinary
const configs = {
  // Logo del negocio - cuadrado, liviano
  logo: {
    maxSizeMB: 0.3,
    maxWidthOrHeight: 400,
    useWebWorker: true,
  },
  // Banner del negocio - horizontal, un poco más pesado
  banner: {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
  },
  // Imagen de servicio - cuadrada, liviana
  servicio: {
    maxSizeMB: 0.3,
    maxWidthOrHeight: 800,
    useWebWorker: true,
  },
}

// Función principal para subir una imagen a Cloudinary.
// Recibe el archivo, el tipo (logo/banner/servicio) y una carpeta opcional.
// Retorna la URL pública de la imagen subida.
export const subirImagen = async (archivo, tipo = 'servicio', carpeta = 'general') => {
  try {
    // 1. Comprimimos la imagen antes de subirla
    const config = configs[tipo] || configs.servicio
    const comprimida = await imageCompression(archivo, config)

    // 2. Preparamos los datos para enviar a Cloudinary
    const formData = new FormData()
    formData.append('file', comprimida)
    formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET)
    // Organizamos las imágenes en carpetas dentro de Cloudinary
    formData.append('folder', `bookease/${carpeta}`)

    // 3. Subimos la imagen a Cloudinary
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body: formData }
    )

    const data = await res.json()

    // 4. Retornamos la URL segura de la imagen
    return data.secure_url

  } catch (error) {
    console.error('Error al subir imagen:', error)
    throw error
  }
}

// Función auxiliar para previsualizar una imagen localmente
// antes de subirla, sin gastar ancho de banda
export const previsualizarImagen = (archivo) => {
  return URL.createObjectURL(archivo)
}