/* ============================================================
   Orbit 360 · Academia — continuidad v1.197
   Rutas breves por rol sobre Aseguradoras, KPI, documentos y acceso
   seguro. Inyección idempotente; conserva progreso y certificados.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.ACADEMIA_V1197 = (function () {
  function section(icon, title, text) { return { icon, t: title, color: '#C5162E', d: text }; }
  function lesson(title, sections) { return { t: title, min: 10, tipo: 'lectura', secciones: sections }; }
  function quiz() {
    return { t: 'Evaluación aplicada', min: 8, tipo: 'quiz', preguntas: [
      { p: '¿Dónde se consulta el detalle de un indicador?', ops: ['En la tarjeta sin abrirla', 'Abriendo el KPI para ver sus registros', 'En una nota técnica'], ok: 1 },
      { p: '¿Qué ocurre al abrir un documento?', ops: ['Se simula un archivo', 'Se usa el visor interno y, cuando aplica, el acceso al origen', 'Se descarga siempre'], ok: 1 },
      { p: '¿Cómo se maneja una contraseña de plataforma?', ops: ['Se guarda en el navegador', 'Se recupera temporalmente desde una conexión segura autorizada', 'Se escribe en observaciones'], ok: 1 }
    ]};
  }
  function course(id, role, focus) {
    return {
      id, titulo: 'Aseguradoras y recursos seguros — ' + role, cat: 'Operación', emoji: '🏢', color: '#1E2227',
      desc: 'Ruta práctica para usar el directorio, los indicadores, los documentos y los accesos según el rol activo.',
      destinatarios: role, recursos: [], metaLeccion: {
        sirve: 'Operar Aseguradoras y documentos con información clara y permisos correctos.',
        importa: 'Evita accesos indebidos, registros sin trazabilidad y decisiones basadas en indicadores sin detalle.',
        datos: 'Lee aseguradoras, contactos, plataformas, cuentas, documentos y estados autorizados.',
        impacto: 'Interalimenta Cotizador, Comparativo, Clientes 360, Portal y gestiones relacionadas.'
      },
      lecciones: [
        lesson('Directorio e indicadores', [
          section('📊', 'Del indicador al registro', 'Cada KPI abre los registros que forman el total. Revisa el filtro aplicado, abre la ficha y regresa conservando el contexto.'),
          section('🏢', 'Ficha operativa', 'La ficha reúne contactos, plataformas, bancos, productos, documentos, conocimiento y actividad. El alcance visible depende de la vista activa.'),
          section('🧭', focus, role === 'Asesor' ? 'Consulta únicamente aseguradoras, documentos y datos vinculados a tu alcance. Solicita una gestión de corrección cuando falte información.' : 'Revisa pendientes, responsables, vigencias y motivos antes de confirmar cambios.')
        ]),
        lesson('Documentos y accesos', [
          section('📄', 'Visor dentro de Orbit', 'Abre primero el documento en el visor. Cuando la conexión lo permita, también podrás descargarlo o abrirlo en Drive.'),
          section('🔐', 'Usuarios y contraseñas', 'El usuario puede copiarse según permiso. La contraseña no vive en el navegador: se solicita temporalmente a una conexión segura y el acceso queda auditado.'),
          section('🏦', 'Cuentas bancarias', 'Verifica país, moneda, titular, uso y vigencia antes de copiar una cuenta. No mezcles instrucciones de pago entre aseguradoras o países.')
        ]),
        quiz()
      ]
    };
  }

  const courses = [
    course('cur_asg_recursos_dir_v1197', 'Dirección', 'Como Dirección, valida permisos, responsables, vigencia y acceso a información sensible.'),
    course('cur_asg_recursos_op_v1197', 'Operativo', 'Como Operativo, usa el directorio para cotización, emisión, cobros y siniestros sin alterar información fuera de tu alcance.'),
    course('cur_asg_recursos_asesor_v1197', 'Asesor', 'Como Asesor, consulta contactos y documentos autorizados para atender a tus clientes.')
  ];

  function apply() {
    try {
      if (!Orbit.store || !Orbit.store.all || !Orbit.store.insert) return false;
      const current = Orbit.store.all('cursos') || [];
      if (!current.length) return false;
      const byId = {}; current.forEach(c => byId[c.id] = c);
      courses.forEach(c => {
        const prev = byId[c.id];
        if (!prev) Orbit.store.insert('cursos', Object.assign({ progreso: 0, certificado: false, _cv: 1197 }, c));
        else if ((prev._cv || 0) < 1197) Orbit.store.update('cursos', c.id, Object.assign({}, c, { progreso: prev.progreso || 0, certificado: !!prev.certificado, _cv: 1197 }));
      });
      return true;
    } catch (e) { return false; }
  }

  let tries = 0;
  (function loop() { if (apply() || tries++ > 50) return; setTimeout(loop, 150); })();
  document.addEventListener('orbit:reseeded', apply);
  return { courses, apply };
})();
