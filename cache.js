// ⚡ Nueva función para cachear hojas completas en mapas
function buildMapa(sheetName, keyCol = 0) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return {};
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  let mapa = {};
  values.forEach(row => {
    if (row[keyCol]) {
      let obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      mapa[row[keyCol]] = obj;
    }
  });
  return mapa;
}


// Funciones de soporte con cache
function getMapaAsuntos() {
  const cache = CacheService.getScriptCache();
  const cacheKey = "mapaAsuntos";
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shAsuntos = ss.getSheetByName("asuntos");
  if (!shAsuntos) return {};

  const data = shAsuntos.getDataRange().getValues();
  const headers = data[0];
  const idxId = headers.indexOf("id_asunto");
  const idxNom = headers.indexOf("nombre");

  let mapa = {};
  for (let i = 1; i < data.length; i++) {
    mapa[data[i][idxId]] = data[i][idxNom];
  }

  // cachear 6 horas (21600 segundos)
  cache.put(cacheKey, JSON.stringify(mapa), 21600);
  return mapa;
}

function getMapaResponsables() {
  const cache = CacheService.getScriptCache();
  const cacheKey = "mapaResp";
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shResp = ss.getSheetByName("responsable_csc");
  if (!shResp) return {};

  const data = shResp.getDataRange().getValues();
  const headers = data[0];
  const idxId = headers.indexOf("id_responsable");
  const idxNom = headers.indexOf("nombre");
  const idxMail = headers.indexOf("correo");

  let mapa = {};
  for (let i = 1; i < data.length; i++) {
    mapa[data[i][idxId]] = {
      nombre: data[i][idxNom],
      correo: data[i][idxMail]
    };
  }

  cache.put(cacheKey, JSON.stringify(mapa), 21600);
  return mapa;
}

function getMapaUsuarios() {
  const cache = CacheService.getScriptCache();
  const cacheKey = "mapaUsuarios";
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shUsuarios = ss.getSheetByName("usuarios");
  if (!shUsuarios) return {};

  const data = shUsuarios.getDataRange().getValues();
  const headers = data[0];
  const idxId = headers.indexOf("id_usuario");
  const idxNombreCorto = headers.indexOf("Nombre Corto");
  const idxCargo = headers.indexOf("Cargo");

  let mapa = {};
  for (let i = 1; i < data.length; i++) {
    mapa[data[i][idxId]] = {
      nombre_corto: data[i][idxNombreCorto],
      cargo: data[i][idxCargo]
    };
  }

  cache.put(cacheKey, JSON.stringify(mapa), 21600);
  return mapa;
}
