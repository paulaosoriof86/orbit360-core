/* ============================================================
   Orbit 360 · Academia v1.203 — Cotizador y Comparativo
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.ACADEMIA_V1203 = (function () {
  function section(icon, title, text) { return { icon, t:title, color:'#C5162E', d:text }; }
  function lesson(title, sections) { return { t:title, min:14, tipo:'lectura', secciones:sections }; }
  function quiz(role) {
    return { t:'Evaluación aplicada', min:8, tipo:'quiz', preguntas:[
      { p:'¿Cuándo puede Orbit calcular automáticamente una cotización?', ops:['Cuando existe cualquier aseguradora','Cuando existe fuente vigente y configuración validada para la combinación exacta','Cuando se conoce la prima del año anterior'], ok:1 },
      { p:'¿Qué debe ocurrir con una propuesta manual o extraída de PDF?', ops:['Compararse de inmediato','Revisarse contra el documento original y confirmar la fuente','Convertirse automáticamente en tarifa'], ok:1 },
      { p:'¿Qué transfiere Cotizador al Comparativo?', ops:['Texto y estado visual','IDs de cotizaciones normalizadas persistidas','Capturas de pantalla'], ok:1 },
      { p:'¿Registrar aceptación crea una póliza?', ops:['Sí, inmediatamente','No; crea una solicitud de emisión en Ops hasta recibir número y documento real','Solo si el asesor lo decide'], ok:1 },
      { p:role==='Asesor'?'¿Qué debe hacer el Asesor si la fuente no está validada?':'¿Qué debe registrar una selección manual?', ops:role==='Asesor'?['Inventar una tarifa temporal','Solicitar validación o usar propuesta documental revisada','Ocultar la alerta']:['Solo el nombre de la aseguradora','Justificación, actor y trazabilidad','Una captura sin explicación'], ok:1 }
    ]};
  }
  function course(id, role, roleText) {
    return {
      id, titulo:'Cotizador → Comparativo → Emisión — ' + role, cat:'Comercial', emoji:'🧮', color:'#1E2227',
      desc:'Cómo generar propuestas verificables, compararlas y convertir una aceptación en una gestión de emisión.',
      destinatarios:role, recursos:[], metaLeccion:{
        sirve:'Cotizar con fuentes verificables, comparar propuestas completas y conservar el seguimiento comercial.',
        importa:'Evita cálculos sin respaldo, comparativos inconsistentes y pólizas creadas antes de la emisión real.',
        datos:'Usa aseguradora, país, moneda, producto, plan, riesgo, primas separadas, documento, versión y trazabilidad.',
        impacto:'Conecta Aseguradoras, Cliente 360, Cotizador, Comparativo, Ops, Documentos, Cobros y Pólizas.'
      },
      lecciones:[
        lesson('Fuentes y cálculo verificable',[
          section('🏢','Aseguradoras como fuente maestra','La aseguradora debe estar vinculada y la combinación país, moneda, ramo, producto, riesgo y plan debe coincidir con fuentes habilitadas.'),
          section('🔒','Default-deny','Sin fuente vigente y configuración validada no existe cálculo automático. Orbit muestra el bloqueo y permite gestionar una propuesta externa.'),
          section('📄','Propuestas documentales','PDF y carga manual generan una propuesta pendiente. Deben conservar el documento original, correcciones, motivo, actor y confirmación humana.'),
          section('💰','Prima separada','Prima neta, gastos, financiamiento, impuestos, total y cuotas se registran por separado; no se mezclan con recaudos ni movimientos financieros.'),
          section('👤',roleText,role==='Asesor'?'El Asesor cotiza dentro de su alcance y solicita correcciones cuando falta una fuente; no habilita tarifas ni altera documentos originales.':'Dirección/Operativo valida fuentes, versiones y propuestas antes de habilitar su uso.')
        ]),
        lesson('Comparación y cierre comercial',[
          section('🔗','Traslado canónico','Cotizador envía IDs persistidos de propuestas validadas. Comparativo reconstruye los datos desde Orbit.store y rechaza inconsistencias de país, moneda, producto o cliente.'),
          section('⚖️','Recomendación explicable','La sugerencia puede considerar precio, cobertura, deducible y responsabilidad civil. El criterio se muestra y puede replantearse.'),
          section('✍️','Selección manual','Una selección distinta exige justificación y trazabilidad. No se presenta como cálculo automático.'),
          section('💬','Comunicación honesta','Preparar WhatsApp o correo no equivale a entrega confirmada; el estado cambia solo cuando el proveedor correspondiente lo confirme.'),
          section('📝','Propuesta aceptada','La aceptación crea una solicitud de emisión en Ops. La póliza nace únicamente cuando llega el número real y el documento emitido.')
        ]),
        quiz(role)
      ]
    };
  }
  const courses=[
    course('cur_cot_comp_dir_v1203','Dirección','Dirección valida la arquitectura comercial, fuentes, permisos y criterios de recomendación.'),
    course('cur_cot_comp_op_v1203','Operativo','Operativo revisa propuestas, documentos, requisitos y seguimiento de emisión.'),
    course('cur_cot_comp_asesor_v1203','Asesor','Asesor prepara propuestas y comparativos para sus clientes sin superar su alcance.')
  ];
  function apply(){
    try{
      if(!Orbit.store||!Orbit.store.all||!Orbit.store.insert)return false;
      const current=Orbit.store.all('cursos')||[]; if(!current.length)return false;
      const byId={};current.forEach(c=>byId[c.id]=c);
      courses.forEach(c=>{const prev=byId[c.id];if(!prev)Orbit.store.insert('cursos',Object.assign({progreso:0,certificado:false,_cv:1203},c));else if((prev._cv||0)<1203)Orbit.store.update('cursos',c.id,Object.assign({},c,{progreso:prev.progreso||0,certificado:!!prev.certificado,_cv:1203}));});
      return true;
    }catch(e){return false;}
  }
  let tries=0;(function loop(){if(apply()||tries++>50)return;setTimeout(loop,150);})();
  document.addEventListener('orbit:reseeded',apply);
  return {courses,apply};
})();
