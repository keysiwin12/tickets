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

// =======================================================
// Configuración de servicios y campos dinámicos
// =======================================================
const CONFIG_SERVICIOS = {
  "Contratos": {
    "John Deere Protect": {
      campos: [
        { nombre: "Tipo de plan", tipo: "select", valores: ["Premium", "Periódico"], obligatorio: true },
        { nombre: "PIN", tipo: "text", obligatorio: true },
        { nombre: "Cliente", tipo: "text", obligatorio: true },
        { nombre: "Rango de horas", tipo: "text", obligatorio: true },
        { nombre: "Observaciones", tipo: "textarea", obligatorio: true }
      ]
    },
    "Manuales": {
      campos: [
        { nombre: "Tipo de manual", tipo: "select", valores: ["Operación", "Partes"], obligatorio: true },
        { nombre: "Modelo", tipo: "text", obligatorio: true },
        { nombre: "PIN", tipo: "text", obligatorio: true },
        { nombre: "Uso", tipo: "select", valores: ["Consulta", "Venta de equipo", "Otros"], obligatorio: true }
      ]
    },
    "Seteo de precios": {
      campos: [
        { nombre: "Cliente", tipo: "text", obligatorio: true },
        { nombre: "Contrato", tipo: "text", obligatorio: true },
        { nombre: "Pedidos", tipo: "text", obligatorio: true },
        { nombre: "PM", tipo: "text", obligatorio: true },
        { nombre: "Observaciones", tipo: "textarea", obligatorio: true }
      ]
    },
    "Cartilla de mantenimiento": {
      campos: [
        { nombre: "Fabricante", tipo: "text", obligatorio: true },
        { nombre: "Modelo", tipo: "text", obligatorio: true },
        { nombre: "PIN", tipo: "text", obligatorio: true }
      ]
    },
    "📚 Capacitación": {
      campos: [
        { nombre: "Cliente", tipo: "text", obligatorio: true },
        { nombre: "Tema", tipo: "text", obligatorio: true },
        { nombre: "Observaciones", tipo: "textarea", obligatorio: true }
      ]
    }
  },

  "Monitoreo": {
    "Acceso Operation Center": {
      campos: [
        { nombre: "Usuario X", tipo: "text", obligatorio: true }
      ]
    },
    "Creación de Organización": {
      campos: [
        { nombre: "Nombre de la empresa", tipo: "text", obligatorio: true },
        { nombre: "Ruc", tipo: "text", obligatorio: true, patron: "^[0-9]{11}$", mensajeError: "Ruc debe tener 11 dígitos" },
        { nombre: "Nombre encargado de telemetría", tipo: "text", obligatorio: true },
        { nombre: "Cargo", tipo: "text", obligatorio: true },
        { nombre: "Celular", tipo: "text", obligatorio: true },
        { nombre: "Email", tipo: "email", obligatorio: true },
        { nombre: "PIN", tipo: "text", obligatorio: true }
      ]
    },
    "Añadir equipos a Organización": {
      campos: [
        { nombre: "Nombre de la empresa", tipo: "text", obligatorio: true },
        { nombre: "Ruc", tipo: "text", obligatorio: true },
        { nombre: "PIN", tipo: "text", obligatorio: true }
      ]
    },
    "Vincular Módem a equipo": {
      campos: [
        { nombre: "PIN", tipo: "text", obligatorio: true },
        { nombre: "Serie del Módem", tipo: "text", obligatorio: true },
        { nombre: "Observaciones", tipo: "textarea", obligatorio: true }
      ]
    },
    "Constancia telemetría": {
      campos: [
        { nombre: "Cliente", tipo: "text", obligatorio: true },
        { nombre: "Ruc", tipo: "text", obligatorio: true },
        { nombre: "PIN", tipo: "text", obligatorio: true },
        { nombre: "Observaciones", tipo: "textarea", obligatorio: true }
      ]
    },
    "Soporte de conectividad": {
      campos: [
        { nombre: "Cliente", tipo: "text", obligatorio: true },
        { nombre: "PIN", tipo: "text", obligatorio: true },
        { nombre: "Observaciones", tipo: "textarea", obligatorio: true }
      ]
    },
    "Asistencia Remota": {
      campos: [
        { nombre: "Cliente", tipo: "text", obligatorio: true },
        { nombre: "PIN", tipo: "text", obligatorio: true }
      ]
    },
    "🖥️ Capacitación": {
      campos: [
        { nombre: "Cliente", tipo: "text", obligatorio: true },
        { nombre: "Tema", tipo: "text", obligatorio: true },
        { nombre: "Observaciones", tipo: "textarea", obligatorio: true }
      ]
    }
  },

  "Tribología": {
    "Análisis de muestra": {
      campos: [
        { nombre: "N° muestra", tipo: "text", obligatorio: true },
        { nombre: "Observaciones", tipo: "textarea", obligatorio: true }
      ]
    },
    "🔬 Capacitación": {
      campos: [
        { nombre: "Cliente", tipo: "text", obligatorio: true },
        { nombre: "Tema", tipo: "text", obligatorio: true },
        { nombre: "Observaciones", tipo: "textarea", obligatorio: true }
      ]
    },
    "Visita comercial": {
      campos: [
        { nombre: "Cliente", tipo: "text", obligatorio: true },
        { nombre: "Producto a ofrecer", tipo: "text", obligatorio: true },
        { nombre: "Observaciones", tipo: "textarea", obligatorio: true }
      ]
    },
    "Análisis de producto equivalente": {
      campos: [
        { nombre: "Fabricante", tipo: "text", obligatorio: true },
        { nombre: "PIN", tipo: "text", obligatorio: true },
        { nombre: "Compartimiento", tipo: "text", obligatorio: true },
        { nombre: "Aceite original", tipo: "text", obligatorio: true }
      ]
    }
  },

  "Desarrollo": {
    "Solicitud de reporte": {
      campos: [
        { nombre: "Tipo de reporte", tipo: "text", obligatorio: true },
        { nombre: "Cliente", tipo: "text", obligatorio: true },
        { nombre: "PIN", tipo: "text", obligatorio: true }
      ]
    },
    "Observación de reporte": {
      campos: [
        { nombre: "ID del reporte", tipo: "text", obligatorio: true },
        { nombre: "Observaciones", tipo: "textarea", obligatorio: true }
      ]
    }
  }
};

// Función para obtener la configuración de un servicio
function obtenerConfigServicio(categoriaId, asuntoId) {
  // Obtener nombre de categoría desde cache
  const categorias = getCategorias();
  const categoria = categorias.find(c => c.id == categoriaId);
  if (!categoria) return null;

  // Obtener nombre de asunto desde cache
  const asuntos = getAsuntos(categoriaId);
  const asunto = asuntos.find(a => a.id == asuntoId);
  if (!asunto) return null;

  // Buscar en CONFIG_SERVICIOS
  const categoriaNombre = categoria.nombre;
  const asuntoNombre = asunto.nombre;

  return CONFIG_SERVICIOS[categoriaNombre]?.[asuntoNombre] || null;
}

// Función para obtener responsable según categoría o asunto (con lógica en cascada)
function obtenerResponsablePorServicio(categoriaId, asuntoId) {
  // 1. Primero verificar si el asunto tiene un responsable específico (excepción)
  const asuntos = getAsuntos();
  const asunto = asuntos.find(a => a.id == asuntoId);

  if (asunto && asunto.id_responsable) {
    // Hay una excepción: usar responsable específico del asunto
    return asunto.id_responsable;
  }

  // 2. Fallback: usar responsable de la categoría (comportamiento normal)
  const categorias = getCategorias();
  const categoria = categorias.find(c => c.id == categoriaId);
  return categoria ? categoria.id_responsable : null;
}

// Función para validar datos de solicitud
function validarDatosSolicitud(categoriaId, asuntoId, datosJSON) {
  const config = obtenerConfigServicio(categoriaId, asuntoId);
  if (!config) {
    return { valido: false, errores: ["Servicio no encontrado"] };
  }

  let datos;
  try {
    datos = JSON.parse(datosJSON);
  } catch (e) {
    return { valido: false, errores: ["Formato de datos inválido"] };
  }

  const errores = [];

  config.campos.forEach(campo => {
    const valor = datos[campo.nombre];

    // Validar campos obligatorios
    if (campo.obligatorio && (!valor || String(valor).trim() === "")) {
      errores.push(campo.nombre + " es obligatorio");
    }

    // Validar patrón regex si existe
    if (campo.patron && valor) {
      const regex = new RegExp(campo.patron);
      if (!regex.test(valor)) {
        errores.push(campo.mensajeError || campo.nombre + " tiene formato inválido");
      }
    }
  });

  return { valido: errores.length === 0, errores: errores };
}
