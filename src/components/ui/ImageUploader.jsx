import { useState } from 'react'
import { previsualizarImagen } from '../../services/storage'

// Componente reutilizable para seleccionar y previsualizar imágenes.
// No sube la imagen directamente - solo la prepara para que el formulario
// padre la suba cuando el usuario confirme.
//
// Props:
// - label: texto que aparece sobre el uploader
// - tipo: 'logo' | 'banner' | 'servicio' - define el aspecto visual
// - value: URL actual de la imagen (si ya existe una)
// - onChange: función que recibe el archivo seleccionado
function ImageUploader({ label, tipo = 'servicio', value, onChange }) {
  // URL de previsualización local (antes de subir)
  const [preview, setPreview] = useState(value || null)

  // Maneja la selección de archivo
  const handleSeleccionar = (e) => {
    const archivo = e.target.files[0]
    if (!archivo) return

    // Validar que sea una imagen
    if (!archivo.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida')
      return
    }

    // Validar tamaño máximo de 10MB antes de comprimir
    if (archivo.size > 10 * 1024 * 1024) {
      alert('La imagen no puede pesar más de 10MB')
      return
    }

    // Mostramos preview local inmediatamente
    const urlLocal = previsualizarImagen(archivo)
    setPreview(urlLocal)

    // Enviamos el archivo al componente padre
    onChange(archivo)
  }

  // Elimina la imagen seleccionada
  const handleEliminar = () => {
    setPreview(null)
    onChange(null)
  }

  // Estilos según el tipo de imagen
  const estilos = {
    logo: 'w-32 h-32 rounded-2xl',
    banner: 'w-full h-36 rounded-2xl',
    servicio: 'w-full h-44 rounded-2xl',
  }

  return (
    <div>
      {/* Etiqueta */}
      {label && (
        <label className="text-sm font-semibold text-gray-700 mb-2 block">
          {label}
        </label>
      )}

      {preview ? (
        // IMAGEN SELECCIONADA - muestra preview con botón de eliminar
        <div className={`relative ${estilos[tipo]} overflow-hidden border border-gray-200`}>
          <img
            src={preview}
            alt="Preview"
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {/* Botón para quitar la imagen */}
          <button
            type="button"
            onClick={handleEliminar}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-red-600"
          >
            ×
          </button>
        </div>
      ) : (
        // ZONA DE SUBIDA - muestra área para seleccionar imagen
        <label className={`
          ${estilos[tipo]}
          border-2 border-dashed border-gray-200
          flex flex-col items-center justify-center
          cursor-pointer hover:border-blue-400 hover:bg-blue-50
          transition bg-gray-50
        `}>
          <span className="text-2xl mb-2">🖼️</span>
          <span className="text-sm font-semibold text-gray-500">
            Seleccionar imagen
          </span>
          <span className="text-xs text-gray-400 mt-1">
            JPG, PNG o WebP · Máx 10MB
          </span>
          {/* Input oculto que abre el selector de archivos */}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleSeleccionar}
          />
        </label>
      )}
    </div>
  )
}

export default ImageUploader