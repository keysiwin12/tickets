// =======================================================
// Configuración de Google Drive
// =======================================================
const CONFIG_DRIVE = {
  // Carpeta donde se guardan los archivos adjuntos de las solicitudes
  carpetaArchivos: "1KhJh_uoOz_wFqgUeErNh4a0YcPvCwykS",

  // Imágenes para correos electrónicos
  imagenCabecera: "1kVOqEsE2e2t7r_ZxGWBHNEg6pdI9bMPT",
  imagenPie: "1JxcYdB7ZFHZi1CGk5SgVtoB6ir74rnbF"
};

// Función para obtener responsable según categoría o asunto (con lógica en cascada)
function obtenerResponsablePorServicio(categoriaId, asuntoId) {
  // ⚡ OPTIMIZACIÓN CRÍTICA: Usar getDatosIniciales() que ya está cacheado
  // Esto reduce de 2-3s a 0.05s (desde cache)
  const datos = getDatosIniciales();

  // 1. Primero verificar si el asunto tiene un responsable específico (excepción)
  const asunto = datos.asuntos.find(a => a.id == asuntoId);

  if (asunto && asunto.id_responsable) {
    // Hay una excepción: usar responsable específico del asunto
    return asunto.id_responsable;
  }

  // 2. Fallback: usar responsable de la categoría (comportamiento normal)
  const categoria = datos.categorias.find(c => c.id == categoriaId);
  return categoria ? categoria.id_responsable : null;
}
