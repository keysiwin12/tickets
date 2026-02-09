// =======================================================
// Función genérica para leer una hoja y devolver objetos
// =======================================================
function getRawData(sheetName) {
  Logger.log("🔍 [getRawData] Leyendo hoja: '" + sheetName + "'");
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(sheetName);

  if (!sh) {
    Logger.log("❌ [getRawData] Hoja '" + sheetName + "' NO ENCONTRADA");
    const allSheets = ss.getSheets().map(s => s.getName());
    Logger.log("📋 [getRawData] Hojas disponibles: " + allSheets.join(", "));
    return [];
  }

  const values = sh.getDataRange().getValues();
  Logger.log("🔍 [getRawData] Hoja '" + sheetName + "' - Filas totales: " + values.length);

  if (values.length < 2) {
    Logger.log("⚠️ [getRawData] Hoja '" + sheetName + "' tiene menos de 2 filas (solo encabezados o vacía)");
    return [];
  }

  const headers = values[0].map(h => String(h).trim());
  Logger.log("🔍 [getRawData] Encabezados: " + headers.join(", "));

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

  Logger.log("🔍 [getRawData] Hoja '" + sheetName + "' - Filas con datos: " + data.length);
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
    Logger.log("📋 [getAsuntos] Leyendo hoja 'asuntos'...");
    const data = getRawData("asuntos");
    Logger.log("📋 [getAsuntos] Filas obtenidas: " + data.length);

    if (data.length > 0) {
      Logger.log("📋 [getAsuntos] Primera fila ejemplo: " + JSON.stringify(data[0]));
    } else {
      Logger.log("⚠️ [getAsuntos] La hoja 'asuntos' está vacía o solo tiene encabezados");
    }

    const asuntos = data.map(row => ({
      id: row["id_asunto"],
      categoria_id: row["id_categoria"],
      nombre: row["nombre"],
      id_responsable: row["id_responsable"] || null  // Opcional: para excepciones
    }));

    Logger.log("📋 [getAsuntos] Asuntos mapeados: " + asuntos.length);

    // Filtro por categoría si aplica
    if (categoriaId !== null) {
      const filtered = asuntos.filter(a => String(a.categoria_id) === String(categoriaId));
      Logger.log("📋 [getAsuntos] Filtrados por categoría " + categoriaId + ": " + filtered.length);
      return filtered;
    }

    return asuntos;
  } catch (error) {
    Logger.log("❌ [getAsuntos] Error: " + error);
    Logger.log("❌ [getAsuntos] Stack: " + error.stack);
    return [];
  }
}

// Obtener datos iniciales (cacheados)
function getDatosIniciales() {
  const cache = CacheService.getScriptCache();
  const key = "datos_iniciales_v3"; // v3: sin columna descripcion en asuntos
  const hit = cache.get(key);
  if (hit) {
    const parsed = JSON.parse(hit);
    Logger.log("📦 [getDatosIniciales] Cache HIT - Categorías: " + parsed.categorias.length + ", Asuntos: " + parsed.asuntos.length);
    return parsed;
  }

  Logger.log("📦 [getDatosIniciales] Cache MISS - Leyendo desde hojas...");
  const categorias = getCategorias();
  const asuntos = getAsuntos();

  Logger.log("📦 [getDatosIniciales] Categorías leídas: " + categorias.length);
  Logger.log("📦 [getDatosIniciales] Asuntos leídos: " + asuntos.length);

  if (asuntos.length === 0) {
    Logger.log("⚠️ [getDatosIniciales] WARNING: No se encontraron asuntos en la hoja 'asuntos'");
  }

  const res = {
    categorias: categorias,
    asuntos: asuntos
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
