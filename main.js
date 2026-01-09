function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('tickets_csc')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Devuelve el contenido renderizado de un fragmento (sin <html>/<body>)
function getView(name) {
  return HtmlService.createTemplateFromFile(name).evaluate().getContent();
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