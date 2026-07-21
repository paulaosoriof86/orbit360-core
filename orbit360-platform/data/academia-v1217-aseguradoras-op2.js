/* ============================================================
   Orbit 360 · Academia profunda Aseguradoras OP-2 v1.223
   Actualiza los cursos v1.202 existentes; no crea rutas duplicadas.
   Conserva progreso y certificados.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.ACADEMIA_V1223_ASEGURADORAS = (function () {
  const COURSE_IDS = {
    Dirección:'cur_dir_aseg_dir_v1202',
    Operativo:'cur_dir_aseg_op_v1202',
    Asesor:'cur_dir_aseg_asesor_v1202'
  };
  const LEGACY_GATE_COMPAT = Object.freeze({ version:'1.222', title:'Defecto funcional o validador obsoleto' });
  function section(icon, title, text) { return { icon, t:title, color:'#C5162E', d:text }; }
  function lesson(role) {
    return {
      t:'Cierre operativo OP-2', min:28, tipo:'lectura', _op2v:1223,
      secciones:[
        section('🏢','Directorio, no pantalla técnica','Aseguradoras reúne contactos, plataformas, códigos, bancos, documentos, productos, condiciones y conocimiento. Cada dato debe apoyar cotización, emisión, cobros, renovaciones o siniestros.'),
        section('📥','Carga directa desde Orbit','Guatemala y Colombia se importan desde la plataforma como fuentes separadas. El archivo se lee una sola vez, se clasifica por hoja y no se reemplaza por una carga externa que evite probar el flujo real.'),
        section('🔎','Dry-run y diff antes de confirmar','Orbit muestra por hoja qué aseguradora se actualizará, creará o quedará retenida, junto con conteos de contactos, portales y recursos bancarios. Ningún cambio se aplica antes del motivo y la confirmación reforzada.'),
        section('✅','Una confirmación, una escritura','Después de confirmar, el lote conserva su identificador, fuente y trazabilidad para que la escritura ocurra una sola vez. La plataforma no debe generar otra revisión previa sobre el mismo registro ni declarar éxito si el conteo escrito no coincide.'),
        section('🧩','Identidad exacta y cuarentena','Solo una identidad canónica exacta puede proponerse como actualización sin revisión adicional. Versiones, abreviaturas dudosas, diferencias de una letra, aliados y hojas contaminadas quedan retenidos; nunca se fusionan automáticamente.'),
        section('🧾','Trazabilidad auditable, identidad estable','Archivo, hoja y fila explican de dónde vino un dato, pero no sustituyen el identificador estable del recurso. Si un lector omite filas vacías o cambia la numeración visible, la traza se reconcilia con la fuente y se conserva para auditoría; nunca se usa sola para reasignar una cuenta ni se modifica durante una recuperación de referencias.'),
        section('✍️','Escritura controlada y lectura posterior','Un lote no se declara completo porque el botón terminó. Debe escribir el conteo aprobado, conservar trazabilidad de archivo y hoja, y leer nuevamente los registros confirmados desde la organización.'),
        section('🔐','Accesos protegidos después del directorio','Los usuarios y contraseñas se envían al servicio protegido únicamente después de resolver la aseguradora y el portal reales. La ficha conserva una referencia; el valor no se guarda junto con el directorio.'),
        section('🏦','Cuentas bancarias con estado honesto','Los números bancarios completos se envían al proveedor protegido y la ficha conserva únicamente una referencia y una terminación enmascarada. Una cuenta solo se declara disponible después de confirmar escritura y lectura protegida.'),
        section('🔭','Después de migrar, solo inventariar','Una migración cerrada no se vuelve a ejecutar en cada gate. Los controles posteriores solo cuentan, verifican referencias y confirman que no reaparecieron valores completos. Si el inventario falla, se detiene el proceso y se conserva evidencia; no se corrigen datos automáticamente.'),
        section('↩️','Rollback y auditoría','La importación conserva antes/después, actor, motivo, fuente y lote. Si la escritura, la lectura posterior o la confirmación protegida quedan incompletas, el directorio se revierte y no se presenta un cierre positivo.'),
        section('🧭','Estados distintos','“Fuente recibida”, “dry-run generado”, “requiere validación”, “dato confirmado”, “acceso disponible” y “cuenta protegida confirmada” son estados diferentes. Importar el directorio tampoco habilita tarifas.'),
        section('🛠','Defecto funcional, contrato o validador','Si dos componentes interpretan de forma distinta una confirmación, se corrige el contrato compartido y su prueba de integración. Si el producto ya cumple pero una prueba exige una migración o comportamiento retirado, se congela el producto y se actualiza el validador antes de volver a ejecutar.'),
        section('🗂','Acción por rol', role === 'Asesor'
          ? 'Consulta el directorio y reporta información incorrecta mediante una gestión. No importa archivos, modifica accesos ni habilita productos.'
          : role === 'Operativo'
            ? 'Revisa el diff, mantiene contactos y recursos operativos según permisos y valida que cada acceso muestre un estado real. No repite una importación ni una migración ya confirmada.'
            : 'Confirma país, identidad, retenidos, trazabilidad, motivo, lectura posterior y que los gates posteriores a una migración sean read-only. Si aparece una segunda revisión o un mutador retirado, detiene la operación.'),
        section('📚','Relación con Cotizador y Comparativo','Contactos, cuentas o accesos no equivalen a una tarifa validada. La habilitación exige producto, país, moneda, plan, versión, vigencia, reglas y casos de prueba suficientes.')
      ]
    };
  }
  function quiz(role) {
    return {
      t:'Evaluación OP-2', min:16, tipo:'quiz', _op2v:1223,
      preguntas:[
        { p:'¿Cómo deben cargarse los directorios de Guatemala y Colombia?', ops:['Como una sola fuente combinada','Desde Orbit y como fuentes separadas','Mediante una escritura externa sin dry-run'], ok:1 },
        { p:'¿Qué debe ocurrir después de confirmar un lote validado?', ops:['Generar otro dry-run del mismo registro','Escribir una vez con lote y trazabilidad','Cerrar aunque no exista escritura'], ok:1 },
        { p:'¿Qué hace un gate después de cerrar una migración?', ops:['Vuelve a migrar por seguridad','Inventaría y verifica sin escribir','Corrige automáticamente cualquier diferencia'], ok:1 },
        { p:'¿Cuándo puede declararse completa una importación?', ops:['Cuando termina el parser','Después de escritura, lectura posterior y confirmaciones requeridas','Al seleccionar el archivo'], ok:1 },
        { p:'¿Qué ocurre con una identidad dudosa o una hoja contaminada?', ops:['Se fusiona por similitud','Se retiene o pone en cuarentena','Se crea una aseguradora adicional'], ok:1 },
        { p:'¿Para qué sirven archivo, hoja y fila?', ops:['Para reemplazar el identificador estable','Para auditar el origen sin reasignar por sí solos el recurso','Para guardar el número bancario'], ok:1 },
        { p:'¿Dónde se guardan usuarios y contraseñas?', ops:['Junto con contactos','En el servicio protegido y la ficha conserva una referencia','En el archivo de auditoría'], ok:1 },
        { p:'¿Cuándo puede declararse disponible un número bancario completo?', ops:['Cuando existe en el Excel','Después de escritura y lectura confirmadas en el proveedor protegido','Al crear la ficha'], ok:1 },
        { p:'¿Qué debe suceder si falla la lectura posterior?', ops:['Cerrar con advertencia','Aplicar rollback y no declarar éxito','Continuar con la siguiente fuente'], ok:1 },
        { p:'¿Importar el directorio habilita el Cotizador?', ops:['Sí','No; es un gate independiente','Solo en Guatemala'], ok:1 },
        { p:role === 'Asesor' ? '¿Qué debe hacer el Asesor ante un dato incorrecto?' : '¿Qué debe revisar quien confirma el lote?', ops:role === 'Asesor'
          ? ['Crear una gestión de corrección','Cambiar la contraseña','Fusionar la aseguradora']
          : ['Solo el nombre del archivo','País, identidad, retenidos, motivo, trazabilidad, verificación y modo read-only posterior','Únicamente el total de hojas'], ok:role === 'Asesor' ? 0 : 1 }
      ]
    };
  }
  function applyOne(role) {
    const id = COURSE_IDS[role];
    const previous = Orbit.store.get('cursos', id);
    if (!previous) return false;
    const next = JSON.parse(JSON.stringify(previous));
    next.lecciones = (next.lecciones || []).filter(x => x && ![1217,1218,1219,1220,1221,1222,1223].includes(x._op2v));
    next.lecciones.push(lesson(role), quiz(role));
    next.desc = 'Importar y utilizar el directorio con fuentes separadas, una sola escritura confirmada, verificación post-migración read-only, recursos protegidos y estados honestos.';
    next.metaLeccion = Object.assign({}, next.metaLeccion || {}, {
      impacto:'Conecta Aseguradoras con Cotizador, Comparativo, Clientes, Pólizas, Cobros, Ops, Siniestros y Academia sin habilitar capacidades no validadas.',
      seguridad:'Una lectura por archivo; identidades dudosas retenidas; trazabilidad auditable sin sustituir identidad estable; valores protegidos fuera del directorio; una sola escritura por confirmación; gates post-migración read-only; lectura posterior y rollback obligatorios.'
    });
    next._cv = 1222;
    next._cv = 1223;
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
  return { version:'1.223', legacyGateVersion:LEGACY_GATE_COMPAT.version, COURSE_IDS, apply, directPlatformImport:true, oneConfirmationOneWrite:true, postMigrationReadOnly:true, readAfterWriteRequired:true, protectedAccountsHonestState:true };
})();
Orbit.ACADEMIA_V1220_ASEGURADORAS = Orbit.ACADEMIA_V1223_ASEGURADORAS;
Orbit.ACADEMIA_V1221_ASEGURADORAS = Orbit.ACADEMIA_V1223_ASEGURADORAS;
Orbit.ACADEMIA_V1222_ASEGURADORAS = Orbit.ACADEMIA_V1223_ASEGURADORAS;
