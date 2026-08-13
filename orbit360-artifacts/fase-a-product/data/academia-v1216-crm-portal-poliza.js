/* ============================================================
   Orbit 360 · Academia profunda v1.216
   CRM, Calidad, Portal y ficha de Póliza por rol activo.
   Inyección idempotente; conserva progreso y certificados.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.ACADEMIA_V1216_CRM = (function () {
  function section(icon, title, text) { return { icon, t:title, color:'#C5162E', d:text }; }
  function lesson(title, minutes, sections) { return { t:title, min:minutes, tipo:'lectura', secciones:sections }; }
  function quiz(role) {
    const advisor = role === 'Asesor';
    return { t:'Evaluación aplicada', min:9, tipo:'quiz', preguntas:[
      { p:'¿Qué significa “Invitación preparada” en el Portal?', ops:['Que el cliente ya ingresó','Que se dejó lista y aún falta confirmar entrega/activación','Que Orbit generó una contraseña visible'], ok:1 },
      { p:'¿Qué debe hacer un asesor cuando necesita cambiar una Póliza validada?', ops:['Editar directamente','Crear una gestión de corrección o endoso según el caso','Borrar y crear otra'], ok:1 },
      { p:'¿Dónde se abre primero un documento del expediente?', ops:['En el visor común de Orbit','En una descarga obligatoria','En el almacenamiento del navegador'], ok:0 },
      { p:'¿Qué clientes debe ver el rol activo?', ops:[advisor ? 'Solo sus clientes y lo relacionado' : 'Los registros permitidos por su alcance activo','Todos sin filtros','Los que recuerde el navegador'], ok:0 }
    ]};
  }
  function course(id, role, scopeText) {
    return {
      id, titulo:'CRM, Portal y Póliza 360 — ' + role, cat:'Operación', emoji:'🧑‍💼', color:'#1E2227',
      desc:'Ruta práctica para operar Clientes 360, Calidad, acceso al Portal, documentos y Pólizas sin exceder el alcance activo.',
      destinatarios:role, recursos:[],
      metaLeccion:{
        sirve:'Atender clientes y expedientes con alcance, trazabilidad y estados honestos.',
        importa:'Evita accesos cruzados, invitaciones simuladas, cambios indebidos y documentos fuera de contexto.',
        datos:'Clientes, asesores, calidad, estado del Portal, documentos, pólizas, recibos y gestiones.',
        impacto:'Interalimenta Ops, Leads, Renovaciones, Cobros, Portal, Cotizador y Comparativo.'
      },
      lecciones:[
        lesson('Cliente 360 y alcance activo', 12, [
          section('👁', 'Vista activa y alcance', scopeText),
          section('🧭', 'Del KPI al expediente', 'Abre el indicador, conserva el filtro y entra al expediente. Los valores monetarios se revisan por moneda; GTQ y COP no se suman.'),
          section('🧹', 'Calidad antes de Pólizas', 'Calidad funciona aunque la fuente de Pólizas aún no esté importada. Completa únicamente campos vacíos y deja los cambios críticos como gestiones.')
        ]),
        lesson('Portal del cliente', 12, [
          section('✉', 'Invitación preparada', 'Preparar o repreparar una invitación registra el correo, actor, fecha y motivo. No confirma entrega, contraseña ni activación.'),
          section('✅', 'Acceso confirmado', 'Solo registra acceso confirmado cuando existe evidencia externa. La confirmación reforzada queda auditada y no expone secretos.'),
          section('⛔', 'Suspensión', 'Suspender requiere permiso y motivo. El cliente conserva su expediente; cambia únicamente el estado de acceso.')
        ]),
        lesson('Documentos y Póliza 360', 13, [
          section('📄', 'Visor documental común', 'Cliente360, Portal y Póliza usan el mismo visor. Sin conexión documental, Orbit muestra una referencia registrada y un estado honesto.'),
          section('📑', 'Ficha de Póliza', 'Revisa cliente, aseguradora, país, moneda, vigencia, prima, recibos, documentos y estado operativo en una sola página.'),
          section('🗂', 'Cambios mediante flujo', role === 'Asesor' ? 'Consulta la Póliza y crea una gestión cuando necesites una corrección, endoso o documento. No modifiques campos validados.' : 'Edita o inicia endosos solo con permiso; exige motivo, evidencia y el documento correspondiente.')
        ]),
        quiz(role)
      ]
    };
  }
  const courses = [
    course('cur_crm_portal_pol_dir_v1216','Dirección','Puedes usar alcance todos, revisar permisos y confirmar acciones sensibles con motivo y auditoría.'),
    course('cur_crm_portal_pol_op_v1216','Operativo','Trabaja dentro del alcance autorizado, completa expedientes, prepara accesos y opera documentos sin exponer credenciales.'),
    course('cur_crm_portal_pol_ase_v1216','Asesor','Ves únicamente tus clientes y lo relacionado. Completa datos faltantes y solicita correcciones mediante gestiones.')
  ];
  function apply() {
    try {
      if (!Orbit.store || !Orbit.store.all || !Orbit.store.insert) return false;
      const current = Orbit.store.all('cursos') || [];
      if (!current.length) return false;
      const byId = {}; current.forEach(c => { byId[c.id] = c; });
      courses.forEach(c => {
        const prev = byId[c.id];
        if (!prev) Orbit.store.insert('cursos', Object.assign({ progreso:0, certificado:false, _cv:1216 }, c));
        else if ((prev._cv || 0) < 1216) Orbit.store.update('cursos', c.id, Object.assign({}, c, { progreso:prev.progreso || 0, certificado:!!prev.certificado, _cv:1216 }));
      });
      return true;
    } catch (e) { return false; }
  }
  let tries = 0;
  (function loop(){ if (apply() || tries++ > 50) return; setTimeout(loop,150); })();
  document.addEventListener('orbit:reseeded', apply);
  return { courses, apply };
})();
