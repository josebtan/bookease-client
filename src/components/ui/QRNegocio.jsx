import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'

// Componente que muestra el QR del negocio con opciones de
// previsualización e impresión.
// Props:
// - slug: identificador único del negocio en la URL
// - nombreNegocio: nombre del negocio para mostrar en el QR
function QRNegocio({ slug, nombreNegocio }) {
  // Controla si el modal del QR está abierto o cerrado
  const [abierto, setAbierto] = useState(false)

  // URL pública del negocio que se codifica en el QR
  const urlNegocio = `${window.location.origin}/negocio/${slug}`

  // Función para imprimir solo el QR
  const handleImprimir = () => {
    const contenido = document.getElementById('qr-para-imprimir')
    const ventanaImpresion = window.open('', '_blank')
    ventanaImpresion.document.write(`
      <html>
        <head>
          <title>QR - ${nombreNegocio}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: sans-serif;
              background: white;
            }
            .contenedor {
              text-align: center;
              padding: 40px;
            }
            h2 {
              font-size: 24px;
              font-weight: bold;
              color: #1e3a5f;
              margin-bottom: 8px;
            }
            p {
              font-size: 14px;
              color: #666;
              margin-bottom: 24px;
            }
            .url {
              font-size: 12px;
              color: #999;
              margin-top: 16px;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <div class="contenedor">
            <h2>${nombreNegocio}</h2>
            <p>Escanea el código para agendar tu cita</p>
            ${contenido.innerHTML}
            <div class="url">${urlNegocio}</div>
          </div>
        </body>
      </html>
    `)
    ventanaImpresion.document.close()
    ventanaImpresion.focus()
    ventanaImpresion.print()
    ventanaImpresion.close()
  }

  return (
    <>
      {/* BOTÓN QUE ABRE EL MODAL */}
      <button
        onClick={() => setAbierto(true)}
        className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:border-blue-300 hover:text-blue-800 transition"
      >
        <span>📱</span> Ver QR y link
      </button>

      {/* MODAL DEL QR */}
      {abierto && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setAbierto(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full"
            onClick={e => e.stopPropagation()}
          >
            {/* ENCABEZADO */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-800">
                Link y QR de tu negocio
              </h3>
              <button
                onClick={() => setAbierto(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>

            {/* QR CODE */}
            <div
              id="qr-para-imprimir"
              className="flex justify-center mb-6"
            >
              <QRCodeSVG
                value={urlNegocio}
                size={200}
                bgColor="#ffffff"
                fgColor="#1e3a5f"
                level="H"
                includeMargin={true}
              />
            </div>

            {/* URL DEL NEGOCIO */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">
                Link de tu negocio
              </p>
              <p className="text-sm text-blue-800 font-medium break-all">
                {urlNegocio}
              </p>
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div className="flex flex-col gap-3">
              {/* Copiar link */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(urlNegocio)
                  alert('¡Link copiado!')
                }}
                className="w-full border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition"
              >
                📋 Copiar link
              </button>

              {/* Previsualizar página */}
              <button
                onClick={() => window.open(urlNegocio, '_blank')}
                className="w-full border border-blue-200 text-blue-800 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-50 transition"
              >
                👁️ Previsualizar página
              </button>

              {/* Imprimir QR */}
              <button
                onClick={handleImprimir}
                className="w-full bg-blue-800 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-900 transition"
              >
                🖨️ Imprimir QR
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default QRNegocio