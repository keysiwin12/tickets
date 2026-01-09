// IDS SOLICITUD
// Generador seguro de secuencia global
function nextGlobalSeq_(key = 'solicitudes_seq') {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000); // espera si alguien más está creando solicitud
  try {
    const props = PropertiesService.getScriptProperties();
    const n = Number(props.getProperty(key) || 0) + 1;
    props.setProperty(key, String(n));
    return n;
  } finally {
    lock.releaseLock();
  }
}

// agregar string inicial.
function generarSolicitudId() {
  const seq = nextGlobalSeq_();
  return `CSC-${seq}`;
}


// sort table
function ordenarTablaPorFecha(tabla,colum_fecha) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tabla);
  const ultimaFila = hoja.getLastRow();
  if (ultimaFila <= 1) return; // solo hay encabezado, no hay nada que ordenar

  const rango = hoja.getRange(2, 1, ultimaFila - 1, hoja.getLastColumn());
  rango.sort({column: colum_fecha, ascending: false}); // descendente (más reciente primero)
}


function parseFecha(f) {
  if (f instanceof Date) return f;
  if (!f) return null;
  const [d, m, y] = f.split(" ")[0].split("/");
  return new Date(`${y}-${m}-${d} ${f.split(" ")[1] || "00:00:00"}`);
}

function formatFecha(f) {
  if (f instanceof Date) {
    return Utilities.formatDate(f, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
  }
  return f || "";
}

function getMapaAsuntos() {
  const asuntos = getAsuntos();
  const mapa = {};
  asuntos.forEach(a => { mapa[a.id] = a.nombre; });
  return mapa;
}

function mapSolicitud(row, idx, mapaAsuntos) {
  return {
    id_solicitud: row[idx.id_solicitud],
    id_asunto: row[idx.id_asunto],
    asunto_nombre: mapaAsuntos[row[idx.id_asunto]] || row[idx.id_asunto],
    descripcion: row[idx.descripcion] || "",
    estado_actual: row[idx.estado_actual] || "",
    fecha_creacion: formatFecha(row[idx.fecha_creacion]),
    fecha_cierre: formatFecha(row[idx.fecha_cierre]),
    documento: row[idx.documento] || ""
  };
}


// ⚠️ Actualmente no se usa en el proyecto.
// Se deja como helper genérico para futuras consultas rápidas por ID.
function obtenerDatosPorId(id, hoja) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(hoja);
  const datos = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
  if (datos.length < 2) return null;

  const headers = datos[0];
  const idBuscado = String(id).trim().toLowerCase(); // 👈 siempre texto y en minúsculas
  Logger.log("Buscando ID: " + idBuscado);

  for (let i = 1; i < datos.length; i++) {
    const idCeldaRaw = datos[i][0];
    const idCelda = String(idCeldaRaw).trim().toLowerCase(); // 👈 normalizado a minúsculas

    Logger.log("Fila " + (i+1) + ": valor=" + idCeldaRaw + " → normalizado=" + idCelda);

    if (idCelda === idBuscado) {
      const fila = datos[i];
      let resultado = {};
      headers.forEach((columna, idx) => {
        resultado[columna] = fila[idx];
      });
      return resultado;
    }
  }
  return null;
}


function getBase64ImageFromDrive(fileId) {
  const file = DriveApp.getFileById(fileId);
  const blob = file.getBlob();
  const mimeType = blob.getContentType(); // Importante para el data URL
  const base64 = Utilities.base64Encode(blob.getBytes());
  return `data:${mimeType};base64,${base64}`;
}

// Función para que el HTML pueda llamarla
function getLogo() {
  return getBase64ImageFromDrive("1_kqjbLwBpmROppyM_X6_LafvssB2vZTA");
}




