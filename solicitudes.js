// crea una nueva soli
function crearSolicitud(solicitud) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("solicitudes");
  const userEmail = Session.getActiveUser().getEmail();

  // ID único estable
  const id_solicitud = generarSolicitudId();

  // Subir archivo a Drive si viene adjunto
  let urlArchivo = "";
  if (solicitud.archivo_base64) {
    const carpeta = DriveApp.getFolderById("1J9jFrcG_KGcG9dvcmxiFhhbUnEvOsdUn");
    const blob = Utilities.newBlob(
      Utilities.base64Decode(solicitud.archivo_base64),
      "",
      solicitud.archivo_nombre
    );
    const archivo = carpeta.createFile(blob);
    urlArchivo = archivo.getUrl();
  }

  // Mapea cada campo de solicitud a su columna en la hoja
  const mapaColumnas = {
    id_solicitud : 1 ,
    id_asunto: 2,   // Columna B
    descripcion: 5,    // Columna E
    estado: 7,
    fecha_solicitud: 8,
    responsable: 4,
    id_usuario : 3,
    archivo : 6
  };

  // Obtener responsable desde configuracion.js según categoría y servicio
  solicitud.responsable = obtenerResponsablePorServicio(solicitud.categoria, solicitud.id_asunto) || null; 
  solicitud.id_usuario = userEmail;
  solicitud.archivo = urlArchivo;
  solicitud.fecha_solicitud = new Date();
  solicitud.id_solicitud = id_solicitud;
  
  const nuevaFila = hoja.getLastRow() + 1;
  // Recorre el mapa y escribe los valores donde correspondan
  for (const campo in mapaColumnas) {
    if (solicitud[campo] !== undefined) {
      hoja.getRange(nuevaFila, mapaColumnas[campo]).setValue(solicitud[campo]);
    }
  }
  ordenarTablaPorFecha("solicitudes",8);
  cambiarEstadoSolicitud(id_solicitud, "Pendiente", "solicitud creada","","")
  enviarCorreoConfirmacion(id_solicitud);
}

//cambiar estadoSolicitud y mandar correo
function cambiarEstadoSolicitud(id_solicitud, nuevoEstado, comentario, archivo_base64, archivo_nombre) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shSol  = ss.getSheetByName("solicitudes");
  const shHist = ss.getSheetByName("historial_estados");
  if (!shSol || !shHist) throw new Error("Faltan hojas requeridas");

  const ESTADOS_VALIDOS = ["Pendiente","En Proceso","Completado","Cancelado"];
  if (!ESTADOS_VALIDOS.includes(nuevoEstado)) {
    throw new Error("Estado no permitido: " + nuevoEstado);
  }

  // ✅ Comentario obligatorio
  if (!comentario || comentario.trim() === "") {
    throw new Error("El comentario es obligatorio");
  }

  // 📂 Subir archivo opcional
  let urlArchivo = "";
  if (archivo_base64 && archivo_nombre) {
    const carpeta = DriveApp.getFolderById("1J9jFrcG_KGcG9dvcmxiFhhbUnEvOsdUn");
    const blob = Utilities.newBlob(Utilities.base64Decode(archivo_base64), "", archivo_nombre);
    const archivo = carpeta.createFile(blob);
    urlArchivo = archivo.getUrl();
  }

  // 1) Insertar SIEMPRE en historial
  const id_hist = nextGlobalSeq_('historial_seq');
  const now = new Date();
  const responsable = Session.getActiveUser().getEmail();
  const filaHist = [id_hist, id_solicitud, nuevoEstado, now, responsable, comentario.trim(), urlArchivo];
  shHist.appendRow(filaHist);

  // 2) Decidir si actualizamos "solicitudes"
  const vals = shSol.getDataRange().getValues();
  const headers = vals[0];
  const idxId  = 0;
  const idxEst = headers.indexOf('estado_actual');
  const idxFecCierre = headers.indexOf('fecha_cierre');

  let estadoActual = null;
  let filaIdx = -1;
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][idxId]) === String(id_solicitud)) {
      estadoActual = vals[i][idxEst];
      filaIdx = i+1;
      break;
    }
  }

  // ✅ Actualizar hoja solo si:
  // - Estado cambió (para cualquier estado), o
  // - Nuevo estado = "En Proceso" (guardar aunque no cambie en historial, pero no forzar update hoja)
  if (filaIdx !== -1) {
    if (estadoActual !== nuevoEstado) {
      shSol.getRange(filaIdx, idxEst+1).setValue(nuevoEstado);
      if (idxFecCierre !== -1 && (nuevoEstado === "Completado" || nuevoEstado === "Cancelado")) {
        shSol.getRange(filaIdx, idxFecCierre+1).setValue(now);
      }
    }
  }

  // 3) Enviar correo si corresponde
  if (nuevoEstado === "Completado" || nuevoEstado === "Cancelado") {
    try {
      enviarCorreoCambioEstado(id_solicitud, nuevoEstado, comentario);
    } catch (e) {
      console.error("Error al enviar correo de cambio de estado:", e);
    }
  }

  return { ok: true };
}

//comentario usuario
function agregarComentarioUsuario(id_solicitud, comentario, archivo_base64, archivo_nombre) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shSol  = ss.getSheetByName("solicitudes");
  const shHist = ss.getSheetByName("historial_estados");
  if (!shSol || !shHist) throw new Error("Faltan hojas requeridas");

  // ✅ Validar comentario obligatorio
  if (!comentario || comentario.trim() === "") {
    throw new Error("El comentario es obligatorio");
  }

  // Buscar solicitud y validar que esté en proceso
  const vals = shSol.getDataRange().getValues();
  const headers = vals[0];
  const idxId  = 0;
  const idxEst = headers.indexOf('estado_actual');
  if (idxEst === -1) throw new Error("Falta columna estado_actual");

  let estadoActual = null;
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][idxId]) === String(id_solicitud)) {
      estadoActual = vals[i][idxEst];
      break;
    }
  }
  if (!estadoActual) throw new Error("Solicitud no encontrada: " + id_solicitud);
  if (estadoActual !== "En Proceso") {
    throw new Error("Solo puedes comentar si la solicitud está En Proceso");
  }

  // 📂 Subir archivo opcional
  let urlArchivo = "";
  if (archivo_base64 && archivo_nombre) {
    const carpeta = DriveApp.getFolderById("1J9jFrcG_KGcG9dvcmxiFhhbUnEvOsdUn"); // tu carpeta de archivos
    const blob = Utilities.newBlob(Utilities.base64Decode(archivo_base64), "", archivo_nombre);
    const archivo = carpeta.createFile(blob);
    urlArchivo = archivo.getUrl();
  }

  // 1) Insertar SIEMPRE en historial (estado = "En Proceso")
  const id_hist = nextGlobalSeq_('historial_seq');
  const now = new Date();
  const usuario = Session.getActiveUser().getEmail();
  const filaHist = [id_hist, id_solicitud, "En Proceso", now, usuario, comentario.trim(), urlArchivo];
  shHist.appendRow(filaHist);

  return { ok: true };
}

// Obtener solicitudes creadas por el usuario logueado
function getSolicitudesPorUsuario() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shSol = ss.getSheetByName("solicitudes");
  if (!shSol) return [];

  const userEmail = Session.getActiveUser().getEmail().toLowerCase().trim();
  const idx = getSolicitudIndexes();
  const mapaAsuntos = getMapaAsuntos();

  const vals = shSol.getRange(2, 1, shSol.getLastRow() - 1, shSol.getLastColumn()).getValues();
  const res = [];

  vals.forEach(row => {
    const email = String(row[idx.id_usuario] || "").toLowerCase().trim();
    if (email === userEmail) {
      res.push(mapSolicitud(row, idx, mapaAsuntos)); // ✅ reutiliza helper
    }
  });

  // Ordenar por fecha_creacion descendente
  res.sort((a, b) => parseFecha(b.fecha_creacion) - parseFecha(a.fecha_creacion));

  return res;
}

// Obtener solicitudes asignadas al responsable logueado
function getSolicitudesPorResponsable() {
  const permiso = esResponsable();
  if (!permiso.es) return [];

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shSol = ss.getSheetByName("solicitudes");
  if (!shSol) return [];

  const idx = getSolicitudIndexes();
  const mapaAsuntos = getMapaAsuntos();

  const vals = shSol.getRange(2, 1, shSol.getLastRow() - 1, shSol.getLastColumn()).getValues();
  const res = [];

  vals.forEach(row => {
    if (String(row[idx.id_responsable]).trim() === String(permiso.id).trim()) {
      res.push(mapSolicitud(row, idx, mapaAsuntos)); // ✅ usamos helper
    }
  });

  // Ordenar por fecha_creacion descendente
  res.sort((a, b) => parseFecha(b.fecha_creacion) - parseFecha(a.fecha_creacion));

  return res;
}


// =======================================================
// Obtener detalles de una solicitud (optimizado con cache)
// =======================================================
function obtenerDetallesSolicitud(idSolicitud) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetSolicitudes = ss.getSheetByName('solicitudes');
    const sheetHistorial = ss.getSheetByName('historial_estados');

    if (!sheetSolicitudes || !sheetHistorial) {
      throw new Error('Faltan hojas requeridas');
    }

    // ---------------------------------------------------
    // Buscar la solicitud
    // ---------------------------------------------------
    const datosSolicitudes = sheetSolicitudes.getDataRange().getValues();
    const headers = datosSolicitudes[0];
    let solicitudData = null;

    for (let i = 1; i < datosSolicitudes.length; i++) {
      if (String(datosSolicitudes[i][0]).trim().toLowerCase() === String(idSolicitud).trim().toLowerCase()) {
        solicitudData = {};
        headers.forEach((header, index) => {
          let value = datosSolicitudes[i][index];
          if (value instanceof Date) {
            value = Utilities.formatDate(value, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
          }
          solicitudData[header] = value || "";
        });
        break;
      }
    }

    if (!solicitudData) {
      throw new Error('Solicitud no encontrada');
    }

    // ---------------------------------------------------
    // Enriquecer con asunto desde cache
    // ---------------------------------------------------
    const mapaAsuntos = getMapaAsuntos();
    solicitudData.asunto_nombre = mapaAsuntos[solicitudData.id_asunto] || solicitudData.id_asunto;

    // ---------------------------------------------------
    // Enriquecer con responsable desde cache
    // ---------------------------------------------------
    const mapaResp = getMapaResponsables();
    const resp = mapaResp[solicitudData.id_responsable];
    if (resp) {
      solicitudData.responsable_csc = resp.nombre;
      solicitudData.correo_responsable = resp.correo;
    }

    // ---------------------------------------------------
    // Historial de estados
    // ---------------------------------------------------
    const datosHistorial = sheetHistorial.getDataRange().getValues();
    const historialHeaders = datosHistorial[0];
    const historial = [];

    for (let i = 1; i < datosHistorial.length; i++) {
      if (String(datosHistorial[i][1]).trim().toLowerCase() === String(idSolicitud).trim().toLowerCase()) {
        const registro = {};
        historialHeaders.forEach((header, index) => {
          let value = datosHistorial[i][index];
          if (value instanceof Date) {
            value = Utilities.formatDate(value, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
          }
          registro[header] = value || "";
        });
        historial.push(registro);
      }
    }

    // Ordenar historial (más reciente primero)
    historial.sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora));

    return {
      solicitud: solicitudData,
      historial: historial,
      success: true
    };

  } catch (error) {
    Logger.log('Error en obtenerDetallesSolicitud: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

// Verifica si el usuario actual es un responsable CSC
function esResponsable() {
  const email = Session.getActiveUser().getEmail().toLowerCase().trim();
  const responsables = getResponsables();

  const r = responsables.find(res => String(res.correo).toLowerCase().trim() === email);

  if (r) {
    return {
      es: true,
      id: r.id,
      nombre: r.nombre,
      correo: r.correo
    };
  }

  return { es: false };
}

// Devuelve los índices de las columnas en la hoja solicitudes
function getSolicitudIndexes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName("solicitudes");
  if (!sh) throw new Error("Hoja 'solicitudes' no encontrada");

  const headers = sh.getRange(1, 1, 1, sh.getLastColumn())
    .getValues()[0]
    .map(h => String(h).trim());

  return {
    id_solicitud: headers.indexOf("id_solicitud"),
    id_asunto: headers.indexOf("id_asunto"),
    id_usuario: headers.indexOf("id_usuario"),
    descripcion: headers.indexOf("descripcion"),
    estado_actual: headers.indexOf("estado_actual"),
    fecha_creacion: headers.indexOf("fecha_creacion"),
    fecha_cierre: headers.indexOf("fecha_cierre"),
    documento: headers.indexOf("documento"),
    id_responsable: headers.indexOf("id_responsable")
  };
}

