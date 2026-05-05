// Configuraciones de compresión según el tipo de imagen
const configs = {
  logo:     { maxSizeMB: 0.3, maxWidthOrHeight: 400,  useWebWorker: true },
  banner:   { maxSizeMB: 0.5, maxWidthOrHeight: 1200, useWebWorker: true },
  servicio: { maxSizeMB: 0.3, maxWidthOrHeight: 800,  useWebWorker: true },
}

// Función principal para subir una imagen a Cloudinary.
// Intenta comprimir primero, si falla sube el archivo original.
export const subirImagen = async (archivo, tipo = 'servicio', carpeta = 'general') => {
  try {
    let archivoFinal = archivo

    // Intentamos comprimir solo si el archivo pesa más de 500KB
    if (archivo.size > 500 * 1024) {
      try {
        const imageCompression = (await import('browser-image-compression')).default
        const config = configs[tipo] || configs.servicio
        archivoFinal = await imageCompression(archivo, config)
      } catch (compressionError) {
        // Si la compresión falla usamos el archivo original
        console.warn('Compresión falló, usando archivo original:', compressionError)
        archivoFinal = archivo
      }
    }

    // Preparamos los datos para Cloudinary
    const formData = new FormData()
    formData.append('file', archivoFinal)
    formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET)
    formData.append('folder', `bookease/${carpeta}`)

    // Subimos a Cloudinary
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body: formData }
    )

    if (!res.ok) throw new Error('Error en la respuesta de Cloudinary')

    const data = await res.json()
    return data.secure_url

  } catch (error) {
    console.error('Error al subir imagen:', error)
    throw error
  }
}

// Genera una URL local para previsualizar la imagen antes de subirla
export const previsualizarImagen = (archivo) => {
  return URL.createObjectURL(archivo)
}