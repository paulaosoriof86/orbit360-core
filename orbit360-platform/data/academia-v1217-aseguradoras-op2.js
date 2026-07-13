/* ============================================================
   Orbit 360 · Academia profunda Aseguradoras OP-2 v1.220
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
      t:'Cierre operativo OP-2', min:20, tipo:'lectura', _op2v:1220,
      secciones:[
        section('🏢','Directorio, no pantalla técnica','Aseguradoras reúne contactos, plataformas, códigos, bancos, documentos, productos, condiciones y conocimiento. Cada dato debe apoyar cotización, emisión, cobros, renovaciones o siniestros.'),
        section('🏦','Cuentas bancarias operativas','Todo usuario autorizado para consultar Aseguradoras puede ver y copiar el número completo de cuenta, banco, moneda, titular y uso. El valor puede resolverse desde un proveedor seguro, pero no debe ocultarse al equipo que necesita operar.'),
        section('🔐','Usuarios y contraseñas por rol','Dirección, Administración y Operativo pueden ver y copiar usuarios y contraseñas de portales. Asesor puede abrir la plataforma cuando corresponda, pero no ve credenciales salvo permiso extra explícito.'),
        section('🛡','Migración sin pérdida','Los valores existentes continúan disponibles hasta que la migración segura haya copiado y verificado el recurso. Nunca se elimina primero para conectar después.'),
        section('🚧','Cuarentena de hojas','Antes del dry-run, Orbit excluye índices, diagnósticos, directorios internos y hojas con señales técnicas o configuraciones ajenas al directorio. La exclusión ocurre antes de leer recursos protegidos o construir operaciones, y el reporte solo muestra hoja, motivo y conteos; nunca los valores detectados.'),
        section('🧭','Estado honesto','“Fuente recibida”, “requiere validación”, “conexión pendiente”, “disponible” y “habilitada” son estados distintos. Un directorio importado no habilita tarifas.'),
        section('🔁','Identidad exacta antes de actualizar','Solo una identidad canónica exacta puede proponerse como actualización sin revisión adicional. Versiones de hoja, abreviaturas dudosas, inclusiones parciales o diferencias de una letra quedan bloqueadas para confirmación humana. Nunca se fusionan automáticamente.'),
        section('💬','Mensajes operativos','La interfaz explica qué falta y cómo continuar con lenguaje de negocio. No muestra códigos internos, nombres de almacenamiento ni detalles de infraestructura.'),
        section('🗂','Corrección mediante gestión', role === 'Asesor'
          ? 'Consulta contactos, documentos y cuentas bancarias del directorio; reporta datos incorrectos mediante una gestión. No edites credenciales ni habilites productos.'
          : role === 'Operativo'
            ? 'Mantén el directorio, usa cuentas y accesos para la operación y reporta cualquier recurso desactualizado. Las habilitaciones tarifarias siguen un gate independiente.'
            : 'Revisa país, identidad, permisos, trazabilidad y motivo antes de confirmar altas, importaciones o cambios de acceso.'),
        section('📚','Relación con Cotizador y Comparativo','Contactos, cuentas o una cotización de ejemplo no equivalen a una tarifa validada. La habilitación exige producto, país, moneda, plan, versión, vigencia, reglas y casos de prueba suficientes.')
      ]
    };
  }
  function quiz(role) {
    return {
      t:'Evaluación OP-2', min:12, tipo:'quiz', _op2v:1220,
      preguntas:[
        { p:'¿Quién puede ver las cuentas bancarias del directorio?', ops:['Solo Dirección','Todos los usuarios autorizados para consultar Aseguradoras','Solo Finanzas'], ok:1 },
        { p:'¿Quién puede ver usuarios y contraseñas de portales?', ops:['Cualquier usuario','Dirección, Administración y Operativo, o un permiso extra explícito','Solo Asesor'], ok:1 },
        { p:'¿Qué ocurre con un valor antiguo antes de migrarlo?', ops:['Se borra inmediatamente','Se conserva hasta copiarlo y verificar la migración segura','Se publica fuera del tenant'], ok:1 },
        { p:'¿Qué debe hacer Orbit con una hoja que contiene configuración técnica o un directorio interno?', ops:['Importarla como aseguradora','Excluirla antes del parser y registrar solo el motivo','Mostrar sus valores en el reporte'], ok:1 },
        { p:'¿Cuándo puede proponerse una actualización sin revisión adicional?', ops:['Cuando los nombres se parecen','Solo cuando la identidad canónica es exacta','Cuando comparten una palabra'], ok:1 },
        { p:'¿Qué debe ver el usuario cuando una validación falla?', ops:['El código interno','Un mensaje operativo que explique qué falta','El detalle de infraestructura'], ok:1 },
        { p:'¿Importar contactos habilita el Cotizador?', ops:['Sí, automáticamente','No; requiere fuentes y validación por combinación','Solo para Asesores'], ok:1 },
        { p:role === 'Asesor' ? '¿Qué puede consultar el Asesor?' : '¿Qué debe acompañar un cambio sensible?', ops:role === 'Asesor'
          ? ['Cuentas bancarias y recursos no restringidos del directorio','Contraseñas administrativas sin permiso','Auditoría interna completa']
          : ['Solo el botón Guardar','Motivo, actor, antes/después y validación correspondiente','Una nota sin fecha'], ok:role === 'Asesor' ? 0 : 1 }
      ]
    };
  }
  function applyOne(role) {
    const id = COURSE_IDS[role];
    const previous = Orbit.store.get('cursos', id);
    if (!previous) return false;
    const next = JSON.parse(JSON.stringify(previous));
    next.lecciones = (next.lecciones || []).filter(x => x && x._op2v !== 1217 && x._op2v !== 1218 && x._op2v !== 1219 && x._op2v !== 1220);
    next.lecciones.push(lesson(role), quiz(role));
    next.desc = 'Utilizar el directorio operativo con recursos por rol, cuarentena, identidad exacta, mensajes claros y trazabilidad.';
    next.metaLeccion = Object.assign({}, next.metaLeccion || {}, {
      impacto:'Conecta Aseguradoras con Cotizador, Comparativo, Clientes, Pólizas, Cobros, Ops, Siniestros y Academia sin habilitar capacidades no validadas.',
      seguridad:'Recursos visibles según rol; migración no destructiva; hojas técnicas excluidas antes del parser; actualizaciones probables bloqueadas; códigos internos fuera de la interfaz.'
    });
    next._cv = 1220;
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
