/* ============================================================
   Orbit 360 · Academia Aseguradoras · owner canónico y recuperación v1.224
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.ACADEMIA_V1224_ASEGURADORAS = (function () {
  'use strict';
  var COURSE_IDS = {
    Dirección: 'cur_dir_aseg_dir_v1202',
    Operativo: 'cur_dir_aseg_op_v1202',
    Asesor: 'cur_dir_aseg_asesor_v1202'
  };
  function section(icon, title, text) { return { icon: icon, t: title, color: '#C5162E', d: text }; }
  function lesson(role) {
    return {
      t: 'Owner canónico, escritura parcial y recuperación protegida',
      min: 18,
      tipo: 'lectura',
      _op2v: 1224,
      secciones: [
        section('🧭', 'Un solo owner operativo', 'Que exista un parser no significa que el importador correcto esté activo. Orbit solo habilita la carga cuando el botón abre el flujo canónico completo: lectura fresca, dry-run, una confirmación, una escritura, lectura posterior, auditoría y recursos protegidos.'),
        section('🚫', 'El flujo anterior queda bloqueado', 'No deben coexistir una acción para importar el directorio y otra para guardar recursos protegidos por separado. La plataforma mantiene bloqueado el modal anterior hasta que todo el grafo canónico esté listo.'),
        section('🧩', 'Patch no es fila completa', 'Actualizar portales, contactos o cuentas debe persistir únicamente el campo solicitado. Reenviar una fila completa desde una caché anterior puede retirar información nueva de otros campos; por eso Aseguradoras usa escritura parcial y saneada.'),
        section('🔐', 'Saneamiento independiente', 'El escritor parcial elimina usuarios, contraseñas y números completos antes de construir el payload remoto. No depende del orden de otros wrappers ni permite que una versión anterior exponga valores sensibles.'),
        section('🔄', 'Lectura fresca antes del dry-run', 'Antes de analizar un archivo, Orbit vuelve a leer Clientes, Aseguradoras y Asesores del tenant. Si no confirma los conteos críticos, no procesa la fuente.'),
        section('🧮', 'Reconciliar antes de restaurar', 'Cuando una referencia protegida no coincide, primero se compara Firestore con la bóveda en modo read-only. Solo una correspondencia exacta por aseguradora y recurso puede habilitar una restauración.'),
        section('↩️', 'Recuperación controlada y rollback', 'La restauración cambia únicamente referencias, nunca valores completos. Exige evidencia previa, conteo exacto, respaldo protegido, batch atómico, lectura posterior y rollback automático si el resultado no queda completo.'),
        section('🛠', 'Falso positivo del validador', 'Un gate no puede llamar “owner canónico” a la mera existencia del importador base. Debe verificar la función exacta que abre el modal, versiones de contratos, guards, proveedores y ausencia del flujo anterior.'),
        section('👥', 'Responsabilidad por rol', role === 'Asesor'
          ? 'Consulta información confirmada y crea una gestión si detecta una inconsistencia. No importa fuentes, repara referencias ni modifica recursos protegidos.'
          : role === 'Operativo'
            ? 'Usa únicamente el flujo canónico y verifica que cada acción tenga estado real. No repite una carga ni intenta corregir referencias manualmente.'
            : 'Dirección valida el owner exacto, el diff, la lectura posterior, la auditoría y la evidencia de recuperación. Guatemala no se repite hasta cerrar 91/91 y Colombia permanece bloqueada.')
      ]
    };
  }
  function quiz(role) {
    return {
      t: 'Evaluación owner canónico y recuperación',
      min: 10,
      tipo: 'quiz',
      _op2v: 1224,
      preguntas: [
        { p: '¿Qué prueba que el importador correcto está activo?', ops: ['Que exista el parser', 'Que D.open pertenezca al owner canónico y el grafo esté completo', 'Que aparezca cualquier modal'], ok: 1 },
        { p: '¿Qué debe enviar una actualización de portales?', ops: ['La fila completa de la aseguradora', 'Solo el patch saneado de portales y metadatos', 'Las cuentas para conservarlas'], ok: 1 },
        { p: '¿Qué ocurre antes de restaurar referencias?', ops: ['Se escriben referencias nuevas por aproximación', 'Se reconcilia Firestore con la bóveda en modo read-only', 'Se vuelve a importar el Excel'], ok: 1 },
        { p: '¿Qué debe pasar si falla la lectura posterior de una recuperación?', ops: ['Se declara éxito parcial', 'Se aplica rollback y no se acepta el cierre', 'Se continúa con Colombia'], ok: 1 },
        { p: role === 'Asesor' ? '¿Puede el Asesor reparar referencias protegidas?' : '¿Cuándo puede repetirse Guatemala?', ops: role === 'Asesor'
          ? ['Sí, desde la ficha', 'No; debe crear una gestión', 'Solo desde móvil']
          : ['Antes del gate para probar', 'Después de evidencia sanitizada completa y owner canónico aprobado', 'Al terminar el parser'], ok: 1 }
      ]
    };
  }
  function applyOne(role) {
    var id = COURSE_IDS[role];
    var previous = Orbit.store && Orbit.store.get ? Orbit.store.get('cursos', id) : null;
    if (!previous) return false;
    var next = JSON.parse(JSON.stringify(previous));
    next.lecciones = [].concat(next.lecciones || []).filter(function (item) { return item && item._op2v !== 1224; });
    next.lecciones.push(lesson(role), quiz(role));
    next._cv = 1224;
    next.desc = 'Directorio con owner canónico, escritura parcial saneada, lectura fresca y recuperación protegida verificable.';
    next.progreso = previous.progreso || 0;
    next.certificado = !!previous.certificado;
    Orbit.store.update('cursos', id, next);
    return true;
  }
  function apply() {
    try {
      if (!Orbit.store || !Orbit.store.get || !Orbit.store.update) return false;
      return ['Dirección','Operativo','Asesor'].map(applyOne).every(Boolean);
    } catch (error) { return false; }
  }
  var attempts = 0;
  (function loop() { if (apply() || attempts++ > 80) return; setTimeout(loop, 150); })();
  document.addEventListener('orbit:reseeded', apply);
  return { version: '1.224', COURSE_IDS: COURSE_IDS, apply: apply, canonicalOwnerRequired: true, partialWritesRequired: true, protectedReconciliationRequired: true };
})();
