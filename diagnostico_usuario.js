/**
 * Herramienta de diagnóstico para usuarios que no pueden subir archivos
 * Ejecutar desde Apps Script cuando un usuario tenga problemas
 */

function diagnosticarUsuarioActual() {
  const userEmail = Session.getActiveUser().getEmail();
  console.log("========================================");
  console.log("DIAGNÓSTICO DE PERMISOS - USUARIO ACTUAL");
  console.log("========================================");
  console.log(`Usuario: ${userEmail}\n`);

  // 1. Verificar acceso a la carpeta de archivos
  console.log("1. ACCESO A CARPETA DE ARCHIVOS:");
  try {
    const carpeta = DriveApp.getFolderById(CONFIG_DRIVE.carpetaArchivos);
    console.log(`   ✅ Carpeta encontrada: ${carpeta.getName()}`);
    console.log(`   ✅ ID: ${CONFIG_DRIVE.carpetaArchivos}`);

    // Verificar permisos específicos
    const acceso = carpeta.getAccess(Session.getActiveUser());
    console.log(`   ✅ Nivel de acceso: ${acceso}`);

    // Intentar crear un archivo de prueba
    try {
      const archivoTest = carpeta.createFile("test_diagnostico.txt", "Este es un archivo de prueba para verificar permisos");
      console.log(`   ✅ PUEDE CREAR ARCHIVOS - Test exitoso`);
      console.log(`   ✅ Archivo creado: ${archivoTest.getUrl()}`);

      // Eliminar archivo de prueba
      archivoTest.setTrashed(true);
      console.log(`   ✅ Archivo de prueba eliminado`);
    } catch (createError) {
      console.log(`   ❌ ERROR AL CREAR ARCHIVO: ${createError.toString()}`);
      console.log(`   ❌ Mensaje: ${createError.message}`);
      console.log(`   ❌ Stack: ${createError.stack}`);
    }

  } catch (folderError) {
    console.log(`   ❌ ERROR AL ACCEDER CARPETA: ${folderError.toString()}`);
    console.log(`   ❌ Mensaje: ${folderError.message}`);
    return;
  }

  // 2. Verificar acceso a imágenes de correo
  console.log("\n2. ACCESO A IMÁGENES DE CORREO:");
  try {
    const cabecera = DriveApp.getFileById(CONFIG_DRIVE.imagenCabecera);
    console.log(`   ✅ Imagen cabecera accesible: ${cabecera.getName()}`);
  } catch (e) {
    console.log(`   ❌ Error imagen cabecera: ${e.toString()}`);
  }

  try {
    const pie = DriveApp.getFileById(CONFIG_DRIVE.imagenPie);
    console.log(`   ✅ Imagen pie accesible: ${pie.getName()}`);
  } catch (e) {
    console.log(`   ❌ Error imagen pie: ${e.toString()}`);
  }

  // 3. Verificar scopes autorizados
  console.log("\n3. SCOPES Y PERMISOS:");
  console.log(`   Email efectivo: ${Session.getEffectiveUser().getEmail()}`);
  console.log(`   Email activo: ${Session.getActiveUser().getEmail()}`);
  console.log(`   Timezone: ${Session.getScriptTimeZone()}`);

  // 4. Verificar cuota de Drive
  console.log("\n4. INFORMACIÓN DE DRIVE:");
  try {
    const about = Drive.About.get();
    const usadoGB = (about.storageQuota.usage / (1024*1024*1024)).toFixed(2);
    const limitGB = (about.storageQuota.limit / (1024*1024*1024)).toFixed(2);
    console.log(`   Espacio usado: ${usadoGB} GB / ${limitGB} GB`);
    console.log(`   % Usado: ${((about.storageQuota.usage / about.storageQuota.limit) * 100).toFixed(2)}%`);
  } catch (e) {
    console.log(`   ⚠️ No se pudo obtener info de cuota (puede requerir API Drive habilitada)`);
  }

  // 5. Probar conversión de archivo base64
  console.log("\n5. TEST DE CONVERSIÓN BASE64:");
  try {
    const testData = "SGVsbG8gV29ybGQ="; // "Hello World" en base64
    const blob = Utilities.newBlob(
      Utilities.base64Decode(testData),
      "text/plain",
      "test.txt"
    );
    console.log(`   ✅ Conversión base64 funciona correctamente`);
    console.log(`   ✅ Blob creado: ${blob.getBytes().length} bytes`);
  } catch (e) {
    console.log(`   ❌ Error en conversión base64: ${e.toString()}`);
  }

  console.log("\n========================================");
  console.log("FIN DEL DIAGNÓSTICO");
  console.log("========================================");
}

/**
 * Simula la creación de una solicitud con archivo adjunto
 * Útil para reproducir el problema exacto
 */
function simularSubidaArchivo() {
  console.log("========================================");
  console.log("SIMULACIÓN DE SUBIDA DE ARCHIVO");
  console.log("========================================");

  const userEmail = Session.getActiveUser().getEmail();
  console.log(`Usuario: ${userEmail}\n`);

  // Datos de prueba - simula un archivo pequeño
  const archivo_base64 = "VGVzdCBkZSBhcmNoaXZvIGFkanVudG8gcGFyYSBkaWFnbsOzc3RpY28="; // "Test de archivo adjunto para diagnóstico"
  const archivo_nombre = `test_${Date.now()}.txt`;

  console.log(`Intentando subir archivo: ${archivo_nombre}`);
  console.log(`Tamaño base64: ${archivo_base64.length} caracteres`);

  let urlArchivo = "";
  try {
    console.log(`\n1. Obteniendo carpeta con ID: ${CONFIG_DRIVE.carpetaArchivos}`);
    const carpeta = DriveApp.getFolderById(CONFIG_DRIVE.carpetaArchivos);
    console.log(`   ✅ Carpeta obtenida: ${carpeta.getName()}`);

    console.log(`\n2. Decodificando base64...`);
    const datosDecodificados = Utilities.base64Decode(archivo_base64);
    console.log(`   ✅ Base64 decodificado: ${datosDecodificados.length} bytes`);

    console.log(`\n3. Creando blob...`);
    const blob = Utilities.newBlob(datosDecodificados, "text/plain", archivo_nombre);
    console.log(`   ✅ Blob creado: ${blob.getName()}`);

    console.log(`\n4. Creando archivo en Drive...`);
    const archivo = carpeta.createFile(blob);
    urlArchivo = archivo.getUrl();
    console.log(`   ✅ ARCHIVO CREADO EXITOSAMENTE`);
    console.log(`   ✅ URL: ${urlArchivo}`);
    console.log(`   ✅ ID: ${archivo.getId()}`);

    // Limpiar - mover archivo a la papelera
    console.log(`\n5. Limpiando archivo de prueba...`);
    archivo.setTrashed(true);
    console.log(`   ✅ Archivo movido a la papelera`);

    console.log(`\n========================================`);
    console.log(`✅ SIMULACIÓN EXITOSA - El usuario SÍ puede subir archivos`);
    console.log(`========================================`);

  } catch (error) {
    console.log(`\n❌ ❌ ❌ ERROR DURANTE LA SUBIDA ❌ ❌ ❌`);
    console.log(`Error: ${error.toString()}`);
    console.log(`Mensaje: ${error.message}`);
    console.log(`Tipo: ${error.name}`);
    console.log(`Stack: ${error.stack}`);
    console.log(`\n========================================`);
    console.log(`❌ SIMULACIÓN FALLIDA - El usuario NO puede subir archivos`);
    console.log(`========================================`);
  }

  return { success: urlArchivo !== "", url: urlArchivo };
}

/**
 * Verificar permisos específicos para dmanrique@ipesa.com.pe
 */
function verificarUsuarioEspecifico() {
  const usuarioProblema = "dmanrique@ipesa.com.pe";
  console.log("========================================");
  console.log(`VERIFICACIÓN DE USUARIO: ${usuarioProblema}`);
  console.log("========================================\n");

  try {
    const carpeta = DriveApp.getFolderById(CONFIG_DRIVE.carpetaArchivos);
    console.log(`Carpeta: ${carpeta.getName()}\n`);

    // Obtener todos los editores
    const editores = carpeta.getEditors();
    console.log("Editores de la carpeta:");
    let encontrado = false;
    editores.forEach(editor => {
      const email = editor.getEmail();
      console.log(`  - ${email}`);
      if (email.toLowerCase() === usuarioProblema.toLowerCase()) {
        encontrado = true;
        console.log(`    ✅ ESTE ES EL USUARIO CON PROBLEMA`);
      }
    });

    if (encontrado) {
      console.log(`\n✅ ${usuarioProblema} SÍ aparece como Editor`);
    } else {
      console.log(`\n❌ ${usuarioProblema} NO aparece como Editor explícito`);
      console.log(`   Puede tener acceso por grupo o dominio`);
    }

    // Verificar acceso de dominio
    const sharingAccess = carpeta.getSharingAccess();
    const sharingPermission = carpeta.getSharingPermission();
    console.log(`\nAcceso de dominio: ${sharingAccess}`);
    console.log(`Permiso de dominio: ${sharingPermission}`);

  } catch (e) {
    console.log(`❌ Error: ${e.toString()}`);
  }
}
