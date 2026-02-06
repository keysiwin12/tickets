// =======================================================
// Función genérica para leer una hoja y devolver objetos
// =======================================================
function getRawData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(sheetName);
  if (!sh) return [];

  const values = sh.getDataRange().getValues();
  if (values.length < 2) return []; // solo encabezados o vacía

  const headers = values[0].map(h => String(h).trim());
  const rows = values.slice(1);

  const data = rows
    .filter(r => r.some(c => c !== "" && c != null)) // descartar filas vacías
    .map(r => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = r[i];
      });
      return obj;
    });

  return data;
}

// Obtener categorías
function getCategorias() {
  try {
    const data = getRawData("categorias");
    // Si quieres simplificar campos:
    return data.map(row => ({
      id: row["id_categoria"],
      nombre: row["nombre"],
      descripcion: row["descripcion"],
      id_responsable: row["id_responsable"]
    }));
  } catch (error) {
    Logger.log("Error al obtener categorías: " + error);
    return [];
  }
}

// Obtener asuntos
function getAsuntos(categoriaId = null) {
  try {
    const data = getRawData("asuntos");
    const asuntos = data.map(row => ({
      id: row["id_asunto"],
      categoria_id: row["id_categoria"],
      nombre: row["nombre"],
      id_responsable: row["id_responsable"] || null  // Opcional: para excepciones
    }));

    // Filtro por categoría si aplica
    if (categoriaId !== null) {
      return asuntos.filter(a => String(a.categoria_id) === String(categoriaId));
    }

    return asuntos;
  } catch (error) {
    Logger.log("Error al obtener asuntos: " + error);
    return [];
  }
}

// Obtener datos iniciales (cacheados)
function getDatosIniciales() {
  const cache = CacheService.getScriptCache();
  const key = "datos_iniciales_v3"; // v3: sin columna descripcion en asuntos
  const hit = cache.get(key);
  if (hit) return JSON.parse(hit);

  const res = {
    categorias: getCategorias(),
    asuntos: getAsuntos()
  };

  cache.put(key, JSON.stringify(res), 500);
  return res;
}



// =======================================================
// Obtener responsables CSC
// =======================================================
function getResponsables() {
  try {
    const data = getRawData("responsable_csc");

    // Normalizamos estructura
    return data.map(row => ({
      id: row["id_responsable"],
      nombre: row["nombre"],
      correo: row["correo"]
    }));
  } catch (error) {
    Logger.log("Error al obtener responsables: " + error);
    return [];
  }
}


 
