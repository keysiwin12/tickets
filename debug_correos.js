/**
 * Script de debugging para verificar configuración de correos
 * Ejecutar desde Apps Script para diagnosticar problemas
 */

function verificarConfiguracionCorreos() {
  console.log("===== VERIFICACIÓN DE CONFIGURACIÓN DE CORREOS =====\n");

  // 1. Verificar encabezados de la hoja solicitudes
  console.log("1. Verificando encabezados de hoja 'solicitudes':");
  const hojaSolicitudes = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("solicitudes");
  if (hojaSolicitudes) {
    const headers = hojaSolicitudes.getRange(1, 1, 1, hojaSolicitudes.getLastColumn()).getValues()[0];
    console.log("   Columnas encontradas:", JSON.stringify(headers));

    const colIdResponsable = headers.indexOf("id_responsable") + 1;
    console.log(`   ✓ Columna 'id_responsable' está en posición: ${colIdResponsable} ${colIdResponsable === 4 ? '(CORRECTO)' : '(⚠️ DEBERÍA SER 4)'}`);
  } else {
    console.log("   ❌ No se encontró la hoja 'solicitudes'");
  }

  // 2. Verificar tabla de responsables
  console.log("\n2. Verificando tabla 'responsable_csc':");
  const hojaResponsables = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("responsable_csc");
  if (hojaResponsables) {
    const data = hojaResponsables.getDataRange().getValues();
    console.log(`   Total de responsables: ${data.length - 1}`);
    console.log("   Responsables configurados:");
    for (let i = 1; i < data.length; i++) {
      console.log(`     - ID: ${data[i][0]}, Nombre: ${data[i][1]}, Correo: ${data[i][2]}`);
    }
  } else {
    console.log("   ❌ No se encontró la hoja 'responsable_csc'");
  }

  // 3. Verificar tabla de categorías
  console.log("\n3. Verificando tabla 'categorias':");
  const hojaCategorias = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("categorias");
  if (hojaCategorias) {
    const data = hojaCategorias.getDataRange().getValues();
    console.log("   Categorías con responsables asignados:");
    for (let i = 1; i < data.length; i++) {
      console.log(`     - ${data[i][1]}: responsable ID = ${data[i][2]}`);
    }
  } else {
    console.log("   ❌ No se encontró la hoja 'categorias'");
  }

  // 4. Verificar última solicitud
  console.log("\n4. Verificando última solicitud creada:");
  if (hojaSolicitudes) {
    const lastRow = hojaSolicitudes.getLastRow();
    if (lastRow > 1) {
      const headers = hojaSolicitudes.getRange(1, 1, 1, hojaSolicitudes.getLastColumn()).getValues()[0];
      const ultimaSolicitud = hojaSolicitudes.getRange(lastRow, 1, 1, hojaSolicitudes.getLastColumn()).getValues()[0];

      const obj = {};
      headers.forEach((h, i) => obj[h] = ultimaSolicitud[i]);

      console.log(`   ID Solicitud: ${obj.id_solicitud}`);
      console.log(`   Usuario: ${obj.id_usuario}`);
      console.log(`   ID Responsable: ${obj.id_responsable}`);
      console.log(`   ID Asunto: ${obj.id_asunto}`);
      console.log(`   Estado: ${obj.estado_actual}`);
    } else {
      console.log("   ⚠️ No hay solicitudes creadas aún");
    }
  }

  // 5. Verificar archivos de Drive
  console.log("\n5. Verificando acceso a archivos de Drive:");
  try {
    DriveApp.getFolderById(CONFIG_DRIVE.carpetaArchivos);
    console.log("   ✅ Carpeta de archivos accesible");
  } catch (e) {
    console.log("   ❌ Error al acceder carpeta de archivos:", e.toString());
  }

  try {
    DriveApp.getFileById(CONFIG_DRIVE.imagenCabecera);
    console.log("   ✅ Imagen cabecera accesible");
  } catch (e) {
    console.log("   ❌ Error al acceder imagen cabecera:", e.toString());
  }

  try {
    DriveApp.getFileById(CONFIG_DRIVE.imagenPie);
    console.log("   ✅ Imagen pie accesible");
  } catch (e) {
    console.log("   ❌ Error al acceder imagen pie:", e.toString());
  }

  console.log("\n===== FIN DE VERIFICACIÓN =====");
}

/**
 * Probar envío de correo a una solicitud específica
 * Cambiar el ID por el de una solicitud real en tu hoja
 */
function probarEnvioCorreo() {
  const idSolicitud = "CSC-00001"; // ⚠️ CAMBIAR por un ID real
  console.log(`Probando envío de correo para solicitud: ${idSolicitud}`);

  try {
    const resultado = enviarCorreoConfirmacion(idSolicitud);
    console.log("✅ Resultado:", JSON.stringify(resultado));
  } catch (error) {
    console.log("❌ Error:", error.toString());
  }
}
