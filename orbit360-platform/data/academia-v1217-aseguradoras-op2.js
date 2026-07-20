/* ============================================================
   Orbit 360 · Academia profunda Aseguradoras OP-2 v1.221
   Actualiza los cursos v1.202 existentes; no crea rutas duplicadas.
   Conserva progreso y certificados.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.ACADEMIA_V1220_ASEGURADORAS = (function () {
  const COURSE_IDS = {
    Dirección:'cur_dir_aseg_dir_v1202',
    Operativo:'cur_dir_aseg_op_v1202',
    Asesor:'cur_dir_aseg_asesor_v1202'
  };
  function section(icon, title, text) { return { icon, t:title, color:'#C5162E', d:text }; }
  function lesson(role) {
    return {
      t:'Cierre operativo OP-2', min:24, tipo:'lectura', _op2v:1221,
      secciones:[
        section('🏢','Directorio, no pantalla técnica','Aseguradoras reúne contactos, plataformas, códigos, bancos, documentos, productos, condiciones y conocimiento. Cada dato debe apoyar cotización, emisión, cobros, renovaciones o siniestros.'),
        section('📥','Carga directa desde Orbit','Guatemala y Colombia se importan desde la plataforma como fuentes separadas. El archivo se lee una sola vez, se clasifica por hoja y no se reemplaza por una carga externa que evite probar el flujo real.'),
        section('🔎','Dry-run y diff antes de confirmar','Orbit muestra por hoja qué aseguradora se actualizará, creará o quedará retenida, junto con conteos de contactos, portales y recursos bancarios. Ningún cambio se aplica antes del motivo y la confirmación reforzada.'),
        section('🧩','Identidad exacta y cuarentena','Solo una identidad canónica exacta puede proponerse como actualización sin revisión adicional. Versiones, abreviaturas dudosas, diferencias de una letra, aliados y hojas contaminadas quedan retenidos; nunca se fusionan automáticamente.'),
        section('✍️','Escritura controlada y lectura posterior','Un lote no se declara completo porque el botón terminó. Debe escribir el conteo aprobado, conservar trazabilidad de archivo y hoja, y leer nuevamente los registros confirmados desde la organización.'),
        section('🔐','Accesos protegidos después del directorio','Los usuarios y contraseñas se envían al servicio protegido únicamente después de resolver la aseguradora y el portal reales. La ficha conserva una referencia; el valor no se guarda junto con el directorio.'),
        section('🏦','Cuentas bancarias con estado honesto','Los datos operativos no sensibles pueden incorporarse al directorio. Un número bancario completo solo se declara disponible cuando existe y responde su proveedor protegido específico; hasta entonces debe aparecer como pendiente, no como importado.'),
        section('↩️','Rollback y auditoría','La importación conserva antes/después, actor, motivo, fuente y lote. Si la escritura, la lectura posterior o la confirmación protegida quedan incompletas, el directorio se revierte y no se presenta un cierre positivo.'),
        section('🧭','Estados distintos','“Fuente recibida”, “dry-run generado”, “requiere validación”, “dato confirmado”, “acceso disponible” y “cuenta protegida pendiente” son estados diferentes. Importar el directorio tampoco habilita tarifas.'),
        section('🛠','Defecto funcional o validador obsoleto','Si el producto sigue usando un flujo incompleto se corrige el defecto funcional. Si el producto ya cumple el contrato pero una prueba exige el comportamiento retirado, se congela la ejecución y se actualiza el validador antes de volver a probar.'),
        section('🗂','Acción por rol', role === 'Asesor'
          ? 'Consulta el directorio y reporta información incorrecta mediante una gestión. No importa archivos, modifica accesos ni habilita productos.'
          : role === 'Operativo'
            ? 'Revisa el diff, mantiene contactos y recursos operativos según permisos y valida que cada acceso muestre un estado real. No habilita tarifas por importar un directorio.'
            : 'Confirma país, identidad, retenidos, trazabilidad, motivo y resultado de lectura posterior antes de aceptar una carga real.'),
        section('📚','Relación con Cotizador y Comparativo','Contactos, cuentas o accesos no equivalen a una tarifa validada. La habilitación exige producto, país, moneda, plan, versión, vigencia, reglas y casos de prueba suficientes.')
      ]
    };
  }
  function quiz(role) {
    return {
      t:'Evaluación OP-2', min:14, tipo:'quiz', _op2v:1221,
      preguntas:[
        { p:'¿Cómo deben cargarse los directorios de Guatemala y Colombia?', ops:['Como una sola fuente combinada','Desde Orbit y como fuentes separadas','Mediante una escritura externa sin dry-run'], ok:1 },
        { p:'¿Cuándo puede declararse completa una importación?', ops:['Cuando termina el parser','Después de escritura, lectura posterior y confirmaciones requeridas','Al seleccionar el archivo'], ok:1 },
        { p:'¿Qué ocurre con una identidad dudosa o una hoja contaminada?', ops:['Se fusiona por similitud','Se retiene o pone en cuarentena','Se crea una aseguradora adicional'], ok:1 },
        { p:'¿Dónde se guardan usuarios y contraseñas?', ops:['Junto con contactos','En el servicio protegido y la ficha conserva una referencia','En el archivo de auditoría'], ok:1 },
        { p:'¿Qué estado corresponde a un número bancario completo sin proveedor protegido?', ops:['Disponible','Pendiente de conexión protegida','Validado automáticamente'], ok:1 },
        { p:'¿Qué debe suceder si falla la lectura posterior?', ops:['Cerrar con advertencia','Aplicar rollback y no declarar éxito','Continuar con la siguiente fuente'], ok:1 },
        { p:'¿Importar el directorio habilita el Cotizador?', ops:['Sí','No; es un gate independiente','Solo en Guatemala'], ok:1 },
        { p:role === 'Asesor' ? '¿Qué debe hacer el Asesor ante un dato incorrecto?' : '¿Qué debe revisar quien confirma el lote?', ops:role === 'Asesor'
          ? ['Crear una gestión de corrección','Cambiar la contraseña','Fusionar la aseguradora']
          : ['Solo el nombre del archivo','País, identidad, retenidos, motivo, trazabilidad y verificación','Únicamente el total de hojas'], ok:role === 'Asesor' ? 0 : 1 }
      ]
    };
  }
  function applyOne(role) {
    const id = COURSE_IDS[role];
    const previous = Orbit.store.get('cursos', id);
    if (!previous) return false;
    const next = JSON.parse(JSON.stringify(previous));
    next.lecciones = (next.lecciones || []).filter(x => x && ![1217,1218,1219,1220,1221].includes(x._op2v));
    next.lecciones.push(lesson(role), quiz(role));
    next.desc = 'Importar y utilizar el directorio con fuentes separadas, diff, escritura controlada, verificación, recursos protegidos y estados honestos.';
    next.metaLeccion = Object.assign({}, next.metaLeccion || {}, {
      impacto:'Conecta Aseguradoras con Cotizador, Comparativo, Clientes, Pólizas, Cobros, Ops, Siniestros y Academia sin habilitar capacidades no validadas.',
      seguridad:'Una lectura por archivo; identidades dudosas retenidas; valores protegidos fuera del directorio; lectura posterior obligatoria; rollback ante cierre incompleto.'
    });
    next._cv = 1221;
    next.progreso = previous.progreso || 0;
    next.certificado = !!previous.certificado;
    Orbit.store.update('cursos', id, next);
    return true;
  }
  function apply() {
    try {
      if (!Orbit.store || !Orbit.store.get || !Orbit.store.update) return false;
      return ['Dirección','Operativo','Asesor'].map(applyOne).every(Boolean);
    } catch (e) { return false; }
  }
  let tries = 0;
  (function loop(){ if (apply() || tries++ > 60) return; setTimeout(loop,150); })();
  document.addEventListener('orbit:reseeded', apply);
  return { version:'1.221', COURSE_IDS, apply, directPlatformImport:true, readAfterWriteRequired:true, protectedAccountsHonestState:true };
})();
Orbit.ACADEMIA_V1221_ASEGURADORAS = Orbit.ACADEMIA_V1220_ASEGURADORAS;
