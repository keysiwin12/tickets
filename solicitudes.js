// crea una nueva soli
function crearSolicitud(solicitud) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("solicitudes");
  const userEmail = Session.getActiveUser().getEmail();

  // ID único estable
  const id_solicitud = generarSolicitudId();

  // Subir archivo a Drive si viene adjunto
  let urlArchivo = "";
  let errorArchivo = null;
  if (solicitud.archivo_base64) {
    try {
      console.log(`[DEBUG] Intentando subir archivo: ${solicitud.archivo_nombre}`);
      console.log(`[DEBUG] Usuario: ${userEmail}`);
      console.log(`[DEBUG] Carpeta ID: ${CONFIG_DRIVE.carpetaArchivos}`);

      const carpeta = DriveApp.getFolderById(CONFIG_DRIVE.carpetaArchivos);
      console.log(`[DEBUG] Carpeta encontrada: ${carpeta.getName()}`);

      const blob = Utilities.newBlob(
        Utilities.base64Decode(solicitud.archivo_base64),
        "",
        solicitud.archivo_nombre
      );
      console.log(`[DEBUG] Blob creado: ${blob.getBytes().length} bytes`);

      const archivo = carpeta.createFile(blob);
      urlArchivo = archivo.getUrl();
      console.log(`✅ Archivo subido exitosamente: ${urlArchivo}`);
    } catch (driveError) {
      errorArchivo = `No se pudo subir el archivo adjunto. Error: ${driveError.message || driveError.toString()}`;
      console.error('❌ Error al subir archivo a Drive:', driveError.toString());
      console.error('❌ Tipo de error:', driveError.name);
      console.error('❌ Stack:', driveError.stack);
      // Continuar sin archivo adjunto - la solicitud se creará de todas formas
    }
  }

  // Mapea cada campo de solicitud a su columna en la hoja
  const mapaColumnas = {
    id_solicitud : 1 ,
    id_asunto: 2,   // Columna B
    descripcion: 5,    // Columna E
    estado: 7,
    fecha_solicitud: 8,
    id_responsable: 4,  // Cambiado de "responsable" a "id_responsable"
    id_usuario : 3,
    archivo : 6
  };

  // Obtener responsable desde configuracion.js según categoría y servicio
  solicitud.id_responsable = obtenerResponsablePorServicio(solicitud.categoria, solicitud.id_asunto) || null; 
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
  cambiarEstadoSolicitud(id_solicitud, "Pendiente", "Solicitud creada","","")
  enviarCorreoConfirmacion(id_solicitud);

  // Retornar resultado con advertencia si hubo error con archivo
  return {
    success: true,
    id_solicitud: id_solicitud,
    archivo_subido: urlArchivo !== "",
    error_archivo: errorArchivo,
    advertencia: errorArchivo ? "La solicitud se creó correctamente, pero hubo un problema al subir el archivo adjunto." : null
  };
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

  // Comentario opcional - no se valida

  // 📂 Subir archivo opcional
  let urlArchivo = "";
  if (archivo_base64 && archivo_nombre) {
    try {
      const carpeta = DriveApp.getFolderById(CONFIG_DRIVE.carpetaArchivos);
      const blob = Utilities.newBlob(Utilities.base64Decode(archivo_base64), "", archivo_nombre);
      const archivo = carpeta.createFile(blob);
      urlArchivo = archivo.getUrl();
    } catch (driveError) {
      console.error('Error al subir archivo a Drive en cambio de estado:', driveError.toString());
      // Continuar sin archivo adjunto
    }
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

  // Comentario opcional - no se valida

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
    try {
      const carpeta = DriveApp.getFolderById(CONFIG_DRIVE.carpetaArchivos);
      const blob = Utilities.newBlob(Utilities.base64Decode(archivo_base64), "", archivo_nombre);
      const archivo = carpeta.createFile(blob);
      urlArchivo = archivo.getUrl();
    } catch (driveError) {
      console.error('Error al subir archivo a Drive en comentario:', driveError.toString());
      // Continuar sin archivo adjunto
    }
  }

  // 1) Insertar SIEMPRE en historial (estado = "En Proceso")
  const id_hist = nextGlobalSeq_('historial_seq');
  const now = new Date();
  const usuario = Session.getActiveUser().getEmail();
  const filaHist = [id_hist, id_solicitud, "En Proceso", now, usuario, comentario.trim(), urlArchivo];
  shHist.appendRow(filaHist);

  return { ok: true };
}

// Obtener solicitudes creadas por el usuario logueado (optimizado)
function getSolicitudesPorUsuario() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shSol = ss.getSheetByName("solicitudes");
  if (!shSol) return [];

  const userEmail = Session.getActiveUser().getEmail().toLowerCase().trim();
  const idx = getSolicitudIndexes();
  const mapaAsuntos = getMapaAsuntos();

  const lastRow = shSol.getLastRow();
  if (lastRow <= 1) return []; // Solo headers o hoja vacía

  // 🚀 OPTIMIZACIÓN: Solo leer hasta la columna máxima necesaria (no todas las columnas)
  const maxCol = Math.max(...Object.values(idx)) + 1;
  const vals = shSol.getRange(2, 1, lastRow - 1, maxCol).getValues();
  const res = [];

  vals.forEach(row => {
    const email = String(row[idx.id_usuario] || "").toLowerCase().trim();
    if (email === userEmail) {
      res.push(mapSolicitud(row, idx, mapaAsuntos));
    }
  });

  // Ordenar por fecha_creacion descendente
  res.sort((a, b) => parseFecha(b.fecha_creacion) - parseFecha(a.fecha_creacion));

  return res;
}

// Obtener solicitudes asignadas al responsable logueado (optimizado)
function getSolicitudesPorResponsable() {
  const permiso = esResponsable();
  if (!permiso.es) return [];

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shSol = ss.getSheetByName("solicitudes");
  if (!shSol) return [];

  const idx = getSolicitudIndexes();
  const mapaAsuntos = getMapaAsuntos();

  const lastRow = shSol.getLastRow();
  if (lastRow <= 1) return []; // Solo headers o hoja vacía

  // 🚀 OPTIMIZACIÓN: Solo leer hasta la columna máxima necesaria
  const maxCol = Math.max(...Object.values(idx)) + 1;
  const vals = shSol.getRange(2, 1, lastRow - 1, maxCol).getValues();
  const res = [];

  vals.forEach(row => {
    if (String(row[idx.id_responsable]).trim() === String(permiso.id).trim()) {
      res.push(mapSolicitud(row, idx, mapaAsuntos));
    }
  });

  // Ordenar por fecha_creacion descendente
  res.sort((a, b) => parseFecha(b.fecha_creacion) - parseFecha(a.fecha_creacion));

  return res;
}

// =======================================================
// PAGINACIÓN: Obtener solicitudes con lazy loading
// =======================================================

// Obtener solicitudes del usuario con paginación
function getSolicitudesPorUsuarioPaginado(page, limit) {
  page = Number(page) || 1;
  limit = Number(limit) || 20;

  const allSolicitudes = getSolicitudesPorUsuario();
  const start = (page - 1) * limit;
  const end = start + limit;

  return {
    solicitudes: allSolicitudes.slice(start, end),
    total: allSolicitudes.length,
    page: page,
    limit: limit,
    totalPages: Math.ceil(allSolicitudes.length / limit),
    hasMore: end < allSolicitudes.length
  };
}

// Obtener solicitudes del responsable con paginación
function getSolicitudesPorResponsablePaginado(page, limit) {
  page = Number(page) || 1;
  limit = Number(limit) || 20;

  const allSolicitudes = getSolicitudesPorResponsable();
  const start = (page - 1) * limit;
  const end = start + limit;

  return {
    solicitudes: allSolicitudes.slice(start, end),
    total: allSolicitudes.length,
    page: page,
    limit: limit,
    totalPages: Math.ceil(allSolicitudes.length / limit),
    hasMore: end < allSolicitudes.length
  };
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
    // Enriquecer con datos del usuario desde cache
    // ---------------------------------------------------
    const mapaUsuarios = getMapaUsuarios();
    const usuario = mapaUsuarios[solicitudData.id_usuario];
    if (usuario) {
      solicitudData.usuario_nombre_corto = usuario.nombre_corto;
      solicitudData.usuario_cargo = usuario.cargo;
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

// =======================================================
// 🔔 NOTIFICACIONES EN TIEMPO REAL
// =======================================================

/**
 * Obtener cambios recientes para notificaciones en tiempo real
 * @param {number} timestamp - Milisegundos desde epoch (Date.now())
 * @returns {Array} - Últimas 5 notificaciones para el usuario
 */
function obtenerCambiosDesde(timestamp) {
  try {
    const userEmail = Session.getActiveUser().getEmail().toLowerCase().trim();
    const cambios = [];

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const shHist = ss.getSheetByName('historial_estados');
    const shSol = ss.getSheetByName('solicitudes');

    if (!shHist || !shSol) return [];

    // ⚡ Optimización: Cachear mapa de solicitudes por 90 segundos
    const cache = CacheService.getScriptCache();
    const cacheKey = 'notif_solicitudesMap';
    let solicitudesMap = null;

    const cached = cache.get(cacheKey);
    if (cached) {
      solicitudesMap = JSON.parse(cached);
    } else {
      // Solo leer de Sheets si no está en cache
      const solData = shSol.getDataRange().getValues();
      const solHeaders = solData[0];
      const idxSolId = solHeaders.indexOf('id_solicitud');
      const idxSolUsuario = solHeaders.indexOf('id_usuario');
      const idxSolResp = solHeaders.indexOf('id_responsable');
      const idxAsunto = solHeaders.indexOf('id_asunto');

      // Crear mapa de solicitudes para lookup rápido
      solicitudesMap = {};
      for (let i = 1; i < solData.length; i++) {
        solicitudesMap[solData[i][idxSolId]] = {
          id_usuario: solData[i][idxSolUsuario],
          id_responsable: solData[i][idxSolResp],
          id_asunto: solData[i][idxAsunto]
        };
      }

      // Cachear por 90 segundos (mayor que el intervalo de polling de 60s)
      cache.put(cacheKey, JSON.stringify(solicitudesMap), 90);
    }

    // Leer historial (siempre actualizado)
    const histData = shHist.getDataRange().getValues();
    if (histData.length <= 1) return []; // Solo headers

    const headers = histData[0];
    const idxFecha = headers.indexOf('fecha_hora');
    const idxSolicitud = headers.indexOf('id_solicitud');
    const idxEstado = headers.indexOf('estado');
    const idxComentario = headers.indexOf('comentario');
    const idxResponsable = headers.indexOf('responsable');

    // Verificar si el usuario es responsable
    const responsableInfo = esResponsable();

    // ⚡ Obtener mapa de asuntos UNA SOLA VEZ (ya está cacheado)
    const mapaAsuntos = getMapaAsuntos();

    // Convertir timestamp a Date
    const fechaLimite = new Date(Number(timestamp));

    // Recorrer historial de más reciente a más antiguo
    for (let i = histData.length - 1; i >= 1 && cambios.length < 5; i--) {
      const fechaRegistro = histData[i][idxFecha];

      // Convertir a Date si no lo es
      const fecha = fechaRegistro instanceof Date ? fechaRegistro : new Date(fechaRegistro);

      // Solo cambios después del timestamp
      if (fecha > fechaLimite) {
        const idSolicitud = histData[i][idxSolicitud];
        const solicitud = solicitudesMap[idSolicitud];

        if (solicitud) {
          const esDelUsuario = String(solicitud.id_usuario).toLowerCase().trim() === userEmail;
          const esResponsableDeEsta = responsableInfo.es && String(solicitud.id_responsable).trim() === String(responsableInfo.id).trim();

          // Solo incluir si pertenece al usuario o está asignada a él
          if (esDelUsuario || esResponsableDeEsta) {
            const estado = histData[i][idxEstado];
            const comentario = histData[i][idxComentario] || '';
            const responsable = histData[i][idxResponsable] || '';

            // Obtener nombre del asunto desde el mapa (ya cargado)
            const nombreAsunto = mapaAsuntos[solicitud.id_asunto] || solicitud.id_asunto;

            // Construir mensaje
            let mensaje = `${idSolicitud}`;
            if (estado) mensaje += ` → ${estado}`;
            if (comentario && !comentario.toLowerCase().includes('solicitud creada')) {
              mensaje += `: "${comentario.substring(0, 50)}${comentario.length > 50 ? '...' : ''}"`;
            }

            cambios.push({
              id_solicitud: idSolicitud,
              estado: estado,
              fecha: fecha.toISOString(),
              mensaje: mensaje,
              comentario: comentario,
              responsable: responsable,
              asunto: nombreAsunto,
              tipo: esDelUsuario ? 'mis' : 'asignadas',
              timestamp: fecha.getTime()
            });
          }
        }
      }
    }

    // Ordenar por fecha descendente (más reciente primero)
    cambios.sort((a, b) => b.timestamp - a.timestamp);

    return cambios.slice(0, 5); // Solo las últimas 5

  } catch (error) {
    Logger.log('Error en obtenerCambiosDesde: ' + error.toString());
    return [];
  }
}
