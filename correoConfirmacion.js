// Función helper para formatear descripción (JSON o texto plano)
function formatearDescripcion(descripcion) {
  if (!descripcion) return 'Sin descripción';

  try {
    // Intentar parsear como JSON
    const datos = JSON.parse(descripcion);

    // Si es un objeto, formatear como lista
    if (typeof datos === 'object' && datos !== null) {
      let html = '';
      for (const [campo, valor] of Object.entries(datos)) {
        const valorEscapado = String(valor || 'No especificado')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
        html += `<li><strong>${campo}:</strong> ${valorEscapado}</li>`;
      }
      return html;
    }
  } catch (e) {
    // No es JSON válido, devolver como texto escapado
  }

  // Texto plano (legacy): escapar HTML
  const textoEscapado = String(descripcion)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  return textoEscapado;
}

function generarCorreoTicketUsuario(solicitud) {
  const descripcionHTML = formatearDescripcion(solicitud.descripcion);

  return `<div style="font-size: 15px; color: #333; line-height: 1.6; text-align: justify; max-width: 700px;">
    <p>
      <img src="cid:imgArriba" alt="Cabecera CSC" width="350">
    </p>

    <p>Estimado(a) usuario(a),</p>

    <p>El <strong>Centro de Soluciones Conectadas (CSC)</strong> de <strong>IPESA</strong> le informa que su ticket de soporte ha sido <strong>generado exitosamente</strong> en nuestro sistema.</p>

    <p><strong>Detalles de su solicitud:</strong></p>
    <ul style="margin-left: 20px;">
      <li><strong>Número de Ticket:</strong> ${solicitud.id_solicitud}</li>
      <li><strong>Categoria de Servicio:</strong> ${solicitud.categoriaDescripcion} - ${solicitud.asuntoDescripcion}</li>
      <li><strong>Fecha de Creación:</strong>  ${ Utilities.formatDate(solicitud.fecha_creacion, "GMT-5", "dd/MM/yyyy HH:mm:ss")}</li>
      <li><strong>Estado Actual:</strong> ${solicitud.estado_actual}</li>
      <li><strong>Responsable Asignado:</strong> ${solicitud.responsable_csc}</li>
    </ul>

    <p><strong>Detalles del Servicio:</strong></p>
    <ul style="margin-left: 20px;">
      ${descripcionHTML}
    </ul>

    <p>Agradecemos su confianza y quedamos atentos a cualquier requerimiento adicional que pueda surgir.</p>

    <p>Atentamente,</p>

    <p><strong>Centro de Soluciones Conectadas</strong><br>
    <a href="mailto:SolucionesIntegradas@ipesa.com.pe">SolucionesIntegradas@ipesa.com.pe</a> | 942 018 896</p>

    <p>
      <img src="cid:imgAbajo" alt="Pie CSC" width="350">
    </p>
  </div>`;
}

function generarCorreoTicketResponsable(solicitud, responsable) {
  const descripcionHTML = formatearDescripcion(solicitud.descripcion);

  return `<div style="font-size: 15px; color: #333; line-height: 1.6; text-align: justify; max-width: 700px;">
    <p><img src="cid:imgArriba" alt="Cabecera CSC" width="350"></p>

    <p>Estimado(a) <strong>${responsable.nombre}</strong>,</p>
    <p>Se le ha <strong>asignado una nueva solicitud</strong> en el sistema del <strong>CSC IPESA</strong>.</p>

    <p><strong>Detalles de la solicitud asignada:</strong></p>
    <ul style="margin-left: 20px;">
      <li><strong>Número de Ticket:</strong> ${solicitud.id_solicitud}</li>
      <li><strong>Usuario Solicitante:</strong> ${solicitud.id_usuario}</li>
      <li><strong>Categoría de Servicio:</strong> ${solicitud.categoriaDescripcion} - ${solicitud.asuntoDescripcion}</li>
      <li><strong>Fecha de Creación:</strong> ${Utilities.formatDate(solicitud.fecha_creacion, "GMT-5", "dd/MM/yyyy HH:mm:ss")}</li>
      <li><strong>Estado Actual:</strong> ${solicitud.estado_actual}</li>
      ${solicitud.documento
        ? `<li><strong>Documento Adjunto:</strong> <a href="${solicitud.documento}" target="_blank">Ver Documento</a></li>`
        : ""}
    </ul>

    <p><strong>Detalles del Servicio:</strong></p>
    <ul style="margin-left: 20px;">
      ${descripcionHTML}
    </ul>

    <p>Por favor, revise esta solicitud a la brevedad y registre el seguimiento correspondiente.</p>

    <p>Atentamente,</p>
    <p><strong>Centro de Soluciones Conectadas</strong><br>
    <a href="mailto:SolucionesIntegradas@ipesa.com.pe">SolucionesIntegradas@ipesa.com.pe</a> | 942 018 896</p>

    <p><img src="cid:imgAbajo" alt="Pie CSC" width="350"></p>
  </div>`;
}

//correo de confirmacion
function enviarCorreoConfirmacion(id_solicitud) {
  try {
    // ⚡ Usamos buildMapa en lugar de múltiples llamadas
    const mapas = {
      solicitudes: buildMapa("solicitudes"),
      asuntos: buildMapa("asuntos"),
      categorias: buildMapa("categorias"),
      responsables: buildMapa("responsable_csc")
    };

    const solicitud = mapas.solicitudes[id_solicitud];
    if (!solicitud) {
      throw new Error(`No se encontró la solicitud con ID: ${id_solicitud}`);
    }

    // Enriquecer datos de la solicitud
    const asuntoMenu = mapas.asuntos[solicitud.id_asunto];
    solicitud.asuntoDescripcion = asuntoMenu?.nombre || "";

    const categoriaMenu = mapas.categorias[asuntoMenu?.id_categoria];
    solicitud.categoriaDescripcion = categoriaMenu?.nombre || "";

    const responsableMenu = mapas.responsables[solicitud.id_responsable];
    solicitud.responsable_csc = responsableMenu?.nombre || "";

    const correoUsuario = solicitud.id_usuario;
    const correoResponsable = responsableMenu?.correo || null;

    if (!correoUsuario) {
      throw new Error(`No se encontró correo del usuario con ID: ${solicitud.id_usuario}`);
    }

    // Obtener las imágenes adjuntas desde Drive
    let cabecera = null;
    let pie = null;
    try {
      cabecera = DriveApp.getFileById(CONFIG_DRIVE.imagenCabecera).getBlob();
      pie = DriveApp.getFileById(CONFIG_DRIVE.imagenPie).getBlob();
    } catch (driveError) {
      console.warn('No se pudieron cargar las imágenes de Drive para el correo:', driveError.toString());
      // Continuar sin imágenes - el correo se enviará de todas formas
    }

    // 1) Correo al usuario
    const htmlUsuario = generarCorreoTicketUsuario(solicitud);
    const opcionesUsuario = {
      name: "CENTRO DE SOLUCIONES CONECTADAS",
      htmlBody: htmlUsuario
    };

    // Solo agregar imágenes si se pudieron cargar
    if (cabecera && pie) {
      opcionesUsuario.inlineImages = {
        imgArriba: cabecera,
        imgAbajo: pie
      };
    }

    GmailApp.sendEmail(
      correoUsuario,
      `Ticket Generado - CSC IPESA #${id_solicitud}`,
      '',
      opcionesUsuario
    );

    // 2) Correo al responsable (si tiene correo)
    if (correoResponsable) {
      const htmlResponsable = generarCorreoTicketResponsable(solicitud, responsableMenu);
      const opcionesResponsable = {
        name: "CENTRO DE SOLUCIONES CONECTADAS",
        htmlBody: htmlResponsable
      };

      // Solo agregar imágenes si se pudieron cargar
      if (cabecera && pie) {
        opcionesResponsable.inlineImages = {
          imgArriba: cabecera,
          imgAbajo: pie
        };
      }

      GmailApp.sendEmail(
        correoResponsable,
        `Nueva solicitud asignada - CSC IPESA #${id_solicitud}`,
        '',
        opcionesResponsable
      );
    }

    console.log(`Correo enviado: ticket ${id_solicitud} a usuario y responsable`);
    return { success: true };

  } catch (error) {
    console.error(`Error en enviarCorreoConfirmacion (${id_solicitud}):`, error.toString());
    return { success: false, error: error.toString() };
  }
}

// Enviar Correo Completado o Cancelado
function enviarCorreoCambioEstado(id_solicitud, nuevoEstado, comentario) {
  try {
    // ⚡ Usamos buildMapa para cargar todo en memoria
    const mapas = {
      solicitudes: buildMapa("solicitudes"),
      asuntos: buildMapa("asuntos"),
      categorias: buildMapa("categorias"),
      responsables: buildMapa("responsable_csc")
    };

    const solicitud = mapas.solicitudes[id_solicitud];
    if (!solicitud) throw new Error(`No se encontró solicitud con ID ${id_solicitud}`);

    // Extraer descripciones
    const asuntoMenu = mapas.asuntos[solicitud.id_asunto];
    solicitud.asuntoDescripcion = asuntoMenu?.nombre || "";

    const categoriaMenu = mapas.categorias[asuntoMenu?.id_categoria];
    solicitud.categoriaDescripcion = categoriaMenu?.nombre || "";

    const responsableMenu = mapas.responsables[solicitud.id_responsable];
    solicitud.responsable_csc = responsableMenu?.nombre || "";

    const correoUsuario = solicitud.id_usuario;
    if (!correoUsuario) throw new Error("No se encontró correo de usuario");

    // Comentario final
    const comentarioFinal = comentario && comentario.trim() !== "" 
      ? comentario 
      : "Sin comentario";

    // Mensaje humano según estado
    let mensajeEstado = "";
    if (nuevoEstado === "Completado") {
      mensajeEstado = "Tu solicitud ha sido completada satisfactoriamente ✅.";
    } else if (nuevoEstado === "Cancelado") {
      mensajeEstado = "Tu solicitud fue cancelada ❌.";
    }

    // Formato de fecha
    const fechaFormateada = solicitud.fecha_creacion instanceof Date
      ? Utilities.formatDate(solicitud.fecha_creacion, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss")
      : solicitud.fecha_creacion;

    // Formatear descripción
    const descripcionHTML = formatearDescripcion(solicitud.descripcion);

    // Cuerpo HTML del correo
    const cuerpo = `
      <div style="font-size: 15px; color: #333; line-height: 1.6; text-align: justify; max-width: 700px;">
        <p><img src="cid:imgArriba" alt="Cabecera CSC" width="350"></p>

        <p>Estimado(a) usuario(a),</p>
        <p>${mensajeEstado}</p>

        <p><strong>Detalles de su solicitud:</strong></p>
        <ul style="margin-left: 20px;">
          <li><strong>Número de Ticket:</strong> ${solicitud.id_solicitud}</li>
          <li><strong>Categoría de Servicio:</strong> ${solicitud.categoriaDescripcion} - ${solicitud.asuntoDescripcion}</li>
          <li><strong>Fecha de Creación:</strong> ${fechaFormateada}</li>
          <li><strong>Estado Actual:</strong> ${nuevoEstado}</li>
          <li><strong>Responsable:</strong> ${solicitud.responsable_csc}</li>
        </ul>

        <p><strong>Detalles del Servicio:</strong></p>
        <ul style="margin-left: 20px;">
          ${descripcionHTML}
        </ul>

        <p><strong>Comentario del cierre:</strong></p>
        <p style="margin-left: 20px; font-style: italic;">${comentarioFinal}</p>

        <p>Para cualquier consulta adicional, recuerda indicar el <strong>número de ticket ${solicitud.id_solicitud}</strong>.</p>

        <p>Atentamente,</p>
        <p><strong>Centro de Soluciones Conectadas</strong><br>
        <a href="mailto:SolucionesIntegradas@ipesa.com.pe">SolucionesIntegradas@ipesa.com.pe</a> | 942 018 896</p>

        <p><img src="cid:imgAbajo" alt="Pie CSC" width="350"></p>
      </div>
    `;

    // Obtener imágenes desde Drive
    let cabecera = null;
    let pie = null;
    try {
      cabecera = DriveApp.getFileById(CONFIG_DRIVE.imagenCabecera).getBlob();
      pie = DriveApp.getFileById(CONFIG_DRIVE.imagenPie).getBlob();
    } catch (driveError) {
      console.warn('No se pudieron cargar las imágenes de Drive para el correo:', driveError.toString());
      // Continuar sin imágenes
    }

    const opcionesCorreo = {
      name: "CENTRO DE SOLUCIONES CONECTADAS",
      htmlBody: cuerpo
    };

    // Solo agregar imágenes si se pudieron cargar
    if (cabecera && pie) {
      opcionesCorreo.inlineImages = {
        imgArriba: cabecera,
        imgAbajo: pie
      };
    }

    GmailApp.sendEmail(
      correoUsuario,
      `Actualización de estado - Ticket #${id_solicitud}`,
      "Tu solicitud cambió de estado.",
      opcionesCorreo
    );

    console.log(`Correo de cambio de estado enviado a ${correoUsuario} (${nuevoEstado})`);
  } catch (err) {
    console.error("Error en enviarCorreoCambioEstado:", err);
  }
}


