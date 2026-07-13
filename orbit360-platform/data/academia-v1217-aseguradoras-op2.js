/* ============================================================
   Orbit 360 · Academia profunda Aseguradoras OP-2 v1.217
   Actualiza los cursos v1.202 existentes; no crea rutas duplicadas.
   Conserva progreso y certificados.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.ACADEMIA_V1217_ASEGURADORAS = (function () {
  const COURSE_IDS = {
    Dirección:'cur_dir_aseg_dir_v1202',
    Operativo:'cur_dir_aseg_op_v1202',
    Asesor:'cur_dir_aseg_asesor_v1202'
  };
  function section(icon, title, text) { return { icon, t:title, color:'#C5162E', d:text }; }
  function lesson(role) {
    return {
      t:'Cierre operativo OP-2', min:14, tipo:'lectura', _op2v:1217,
      secciones:[
        section('🏢','Directorio, no pantalla técnica','Aseguradoras reúne contactos, plataformas, códigos, bancos, documentos, productos, condiciones y conocimiento. Cada dato debe apoyar cotización, emisión, cobros, renovaciones o siniestros.'),
        section('🔐','Una sola seguridad para importar y editar','Usuarios, contraseñas y números completos nunca se guardan en la ficha. Importación y edición manual conservan únicamente indicios y referencias protegidas hasta que exista una conexión autorizada.'),
        section('🧭','Estado honesto','“Fuente recibida”, “requiere validación”, “conexión pendiente” y “habilitada” son estados distintos. Un directorio importado no habilita tarifas ni confirma accesos.'),
        section('🔁','Alias y duplicados probables','Variantes como abreviaturas, errores de una letra o versiones de hoja quedan bloqueadas para revisión. No se fusionan automáticamente ni se crean dos aseguradoras sin decisión humana.'),
        section('🗂','Corrección mediante gestión', role === 'Asesor'
          ? 'Consulta el directorio autorizado y reporta datos faltantes mediante una gestión. No edites recursos protegidos ni habilites productos.'
          : role === 'Operativo'
            ? 'Mantén contactos y recursos operativos según tus permisos. Los sensibles y las habilitaciones tarifarias requieren conexión y validación específicas.'
            : 'Revisa país, identidad, permisos, trazabilidad y motivo antes de confirmar altas, importaciones o habilitaciones.'),
        section('📚','Relación con Cotizador y Comparativo','Contactos, cuentas o una cotización de ejemplo no equivalen a una tarifa validada. La habilitación exige producto, país, moneda, plan, versión, vigencia, reglas y casos de prueba suficientes.')
      ]
    };
  }
  function quiz(role) {
    return {
      t:'Evaluación OP-2', min:9, tipo:'quiz', _op2v:1217,
      preguntas:[
        { p:'¿Qué ocurre al escribir un número de cuenta en una fuente o editor?', ops:['Se guarda completo en la ficha','Se convierte en indicio y referencia protegida','Se publica para todos'], ok:1 },
        { p:'¿Qué hacer con dos nombres casi iguales de una aseguradora?', ops:['Fusionarlos automáticamente','Bloquearlos para revisión humana','Crear ambos como activos'], ok:1 },
        { p:'¿Importar contactos habilita el Cotizador?', ops:['Sí, automáticamente','No; requiere fuentes y validación por combinación','Solo para Asesores'], ok:1 },
        { p:role === 'Asesor' ? '¿Cómo reporta un Asesor un dato incorrecto?' : '¿Qué debe acompañar un cambio sensible?', ops:role === 'Asesor'
          ? ['Editando la ficha protegida','Creando una gestión de corrección','Borrando la aseguradora']
          : ['Solo el botón Guardar','Motivo, actor, antes/después y validación correspondiente','Una nota sin fecha'], ok:1 }
      ]
    };
  }
  function applyOne(role) {
    const id = COURSE_IDS[role];
    const previous = Orbit.store.get('cursos', id);
    if (!previous) return false;
    const next = JSON.parse(JSON.stringify(previous));
    next.lecciones = (next.lecciones || []).filter(x => x && x._op2v !== 1217);
    next.lecciones.push(lesson(role), quiz(role));
    next.desc = 'Importar, validar y utilizar el directorio operativo con recursos protegidos, roles y trazabilidad.';
    next.metaLeccion = Object.assign({}, next.metaLeccion || {}, {
      impacto:'Conecta Aseguradoras con Cotizador, Comparativo, Clientes, Pólizas, Cobros, Ops, Siniestros y Academia sin habilitar capacidades no validadas.',
      seguridad:'Importación y edición manual comparten la misma política: ningún secreto o número completo se guarda en la ficha.'
    });
    next._cv = 1217;
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
  return { COURSE_IDS, apply };
})();
