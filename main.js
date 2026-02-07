function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('tickets_csc')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Funciones expuestas para el frontend
function obtenerCategorias() {
  return getCategorias();
}

function obtenerAsuntos(categoriaId) {
  return getAsuntos(categoriaId);
}

function obtenerDatosIniciales() {
  return getDatosIniciales();
}