/* ============================================================
   Orbit 360 · Academia v1.201 — Emisión y endosos
   Cursos breves por rol; conserva progreso y certificado.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.ACADEMIA_V1201 = (function () {
  function section(icon, title, text) { return { icon, t: title, color: '#C5162E', d: text }; }
  function lesson(title, sections) { return { t: title, min: 12, tipo: 'lectura', secciones: sections }; }
  function quiz(role) {
    const advisor = role === 'Asesor';
    return { t: 'Evaluación aplicada', min: 8, tipo: 'quiz', preguntas: [
      { p: '¿Cuándo nace una póliza en Orbit?', ops: ['Al aceptar una propuesta', 'Al recibir número y documento reales de la aseguradora', 'Al abrir Cotizador'], ok: 1 },
      { p: '¿Dónde se controla una propuesta aceptada antes de emitir?', ops: ['En una póliza provisional', 'En una Solicitud de emisión dentro de Ops', 'En Finanzas'], ok: 1 },
      { p: advisor ? '¿Qué debe hacer un Asesor cuando necesita modificar una póliza?' : '¿Qué exige aplicar un endoso?', ops: advisor ? ['Editar la póliza directamente', 'Crear una gestión de endoso con detalle y soporte', 'Cambiar el recibo'] : ['Solo una nota interna', 'Aprobación/referencia, documento y fecha efectiva', 'Un cálculo estimado'], ok: 1 },
      { p: '¿Qué ocurre con la póliza anterior al emitir una renovación?', ops: ['Se borra', 'Se vincula con la nueva y su cierre depende de la regla operativa configurada', 'Se reemplaza sin historial'], ok: 1 }
    ]};
  }
  function course(id, role, roleText) {
    return {
      id, titulo: 'Renovación, emisión y endosos — ' + role, cat: 'Operación', emoji: '📝', color: '#1E2227',
      desc: 'Ruta práctica desde la opción aceptada hasta la póliza emitida y las modificaciones autorizadas.',
      destinatarios: role, recursos: [], metaLeccion: {
        sirve: 'Controlar renovaciones, emisiones y endosos sin crear pólizas provisionales ni perder trazabilidad.',
        importa: 'Evita cartera anticipada, duplicados, cambios no autorizados y promesas de emisión sin respaldo.',
        datos: 'Usa cliente, póliza origen, aseguradora, país, moneda, oferta aceptada, documentos y gestión Ops.',
        impacto: 'Conecta Renovaciones, Cotizador, Comparativo, Ops, Cliente 360, Pólizas, Recibos y Documentos.'
      },
      lecciones: [
        lesson('De la renovación a la emisión', [
          section('🔄', 'Cotizar con fuentes reales', 'La alerta de renovación crea o reutiliza una gestión y abre Cotizador. Las primas sin fuente validada no deben presentarse como propuestas de aseguradora.'),
          section('⚖️', 'Registrar la decisión', 'Cuando el cliente acepta una opción, registra la aceptación y su fuente. Orbit crea una Solicitud de emisión en Ops; todavía no crea póliza ni recibos.'),
          section('📝', 'Emitir con evidencia', 'La solicitud avanza por documentos e inspección. Solo al recibir número real, vigencias y documento de póliza se convierte en póliza y genera recibos.'),
          section('🔗', 'Vínculo de renovación', 'La nueva póliza referencia a la anterior y la anterior referencia a la nueva. El cierre de la póliza origen se aplica según la regla configurada por el tenant.')
        ]),
        lesson('Endosos y límites por rol', [
          section('📜', 'Primero una gestión', 'Sustitución de vehículo, beneficiarios, forma de pago y datos del riesgo se solicitan como gestiones en Ops. No se edita una póliza sin aprobación.'),
          section('✅', 'Aplicación controlada', 'Para aplicar se requiere referencia de aseguradora, documento de endoso y fecha efectiva. Los vehículos sustituidos pasan a histórico; no se borran.'),
          section('🛡️', 'Cambios bloqueados', 'Un cambio financiero con pagos existentes requiere un flujo especial. Los tipos sin regla configurada permanecen como gestión y no alteran la póliza.'),
          section('👤', roleText, role === 'Asesor' ? 'Consulta tus pólizas y crea la gestión con la información correcta. No apliques pagos, endosos ni emisiones directamente.' : 'Verifica alcance, documentos, motivo, antes/después y trazabilidad antes de confirmar.')
        ]),
        quiz(role)
      ]
    };
  }

  const courses = [
    course('cur_emision_endosos_dir_v1201', 'Dirección', 'Como Dirección, valida reglas del tenant, permisos y excepciones.'),
    course('cur_emision_endosos_op_v1201', 'Operativo', 'Como Operativo, controla requisitos, aprobación, emisión y aplicación.'),
    course('cur_emision_endosos_asesor_v1201', 'Asesor', 'Como Asesor, documenta la solicitud y sigue su estado dentro de tu alcance.')
  ];

  function apply() {
    try {
      if (!Orbit.store || !Orbit.store.all || !Orbit.store.insert) return false;
      const current = Orbit.store.all('cursos') || [];
      if (!current.length) return false;
      const byId = {}; current.forEach(c => { byId[c.id] = c; });
      courses.forEach(c => {
        const prev = byId[c.id];
        if (!prev) Orbit.store.insert('cursos', Object.assign({ progreso: 0, certificado: false, _cv: 1201 }, c));
        else if ((prev._cv || 0) < 1201) Orbit.store.update('cursos', c.id, Object.assign({}, c, { progreso: prev.progreso || 0, certificado: !!prev.certificado, _cv: 1201 }));
      });
      return true;
    } catch (e) { return false; }
  }

  let tries = 0;
  (function loop() { if (apply() || tries++ > 50) return; setTimeout(loop, 150); })();
  document.addEventListener('orbit:reseeded', apply);
  return { courses, apply };
})();
