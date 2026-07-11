/* ============================================================
   Orbit 360 · Academia — Póliza, recibos y recaudo v1.199
   Rutas por rol activo; conserva progreso y certificados.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.ACADEMIA_V1199 = (function () {
  const sec=(icon,t,d)=>({icon,t,color:'#C5162E',d});
  const lesson=(t,secciones,min=10)=>({t,min,tipo:'lectura',secciones});
  function quiz(role){
    return {t:'Evaluación aplicada',min:8,tipo:'quiz',preguntas:[
      {p:'¿Qué estados generan recibos y cartera?',ops:['Todos','Vigente y Por renovar','Solo Cancelada'],ok:1},
      {p:'¿Qué ocurre con los recibos pendientes cuando una póliza pasa a histórico?',ops:['Se eliminan','Se anulan con trazabilidad; los pagados se preservan','Se convierten en finmovs'],ok:1},
      {p:'¿Confirmar un pago crea un ingreso financiero de la empresa?',ops:['Sí','No; actualiza recaudo comercial y queda por conciliar','Solo en GT'],ok:1},
      {p:'¿Qué debe hacer un Asesor ante un cambio crítico de póliza?',ops:['Editar directamente','Crear una gestión de corrección/endoso','Borrar la póliza'],ok:1},
      {p:'¿Qué hace una propuesta de conciliación?',ops:['Aplica el pago automáticamente','Propone un cruce para revisión sin modificar el cobro','Elimina el recibo'],ok:1}
    ],destinatarios:role};
  }
  function course(id,role,focus){
    return {
      id,titulo:'Pólizas, recibos y recaudo — '+role,cat:'Operación',emoji:'📑',color:'#1E2227',
      desc:'Ruta práctica para crear o consultar pólizas, entender sus recibos y separar recaudo de conciliación financiera.',
      destinatarios:role,recursos:[],_cv:1199,
      metaLeccion:{
        sirve:'Operar el ciclo Póliza → Recibos/Cobros con trazabilidad y permisos correctos.',
        importa:'Evita duplicados, pérdida de pagos, mezcla de monedas y creación indebida de movimientos financieros.',
        datos:'Usa cliente, aseguradora, país, moneda, vigencia, prima desglosada, recibos, pagos y conciliaciones.',
        impacto:'Actualiza Cliente 360, Cartera, Calidad, Renovaciones, Comisiones y Portal.'
      },
      lecciones:[
        lesson('Alta y validación de póliza',[
          sec('🔑','Llave canónica','La combinación tenant, país, aseguradora y número de póliza evita duplicados. No se generan números ficticios en operación.'),
          sec('🌎','País y moneda','El país proviene del cliente y la moneda de la configuración del tenant. Una inconsistencia bloquea la operación.'),
          sec('💰','Prima separada','Prima neta, gastos, recargo, otros, IVA y total permanecen separados en la póliza y en cada recibo.'),
          sec('👤',focus,role==='Asesor'?'Consulta tu cartera y completa datos faltantes. Los cambios críticos se tramitan mediante gestión.':'Confirma aseguradora vinculada, vigencia, forma de pago, motivo y trazabilidad antes de guardar.')
        ]),
        lesson('Recibos y cambios',[
          sec('🧾','Generación controlada','Solo Vigente y Por renovar generan cartera. Los recibos usan identificadores deterministas y se pueden reintentar sin duplicar.'),
          sec('🛡','Pagos preservados','Un cambio nunca elimina un recibo pagado. Los recibos sustituidos se anulan con motivo y auditoría.'),
          sec('📝','Endoso requerido','Cuando ya existen pagos, los cambios financieros, de asignación o de moneda requieren un endoso o gestión controlada.')
        ]),
        lesson('Pago y conciliación',[
          sec('💳','Recaudo comercial','Confirmar un pago actualiza el recibo, la cartera y el estado del cliente. No escribe en movimientos financieros.'),
          sec('🔗','Propuesta de conciliación','El banco, factura o planilla genera una propuesta. Validarla no aplica el pago automáticamente.'),
          sec('📄','Documento por referencia','El soporte se vincula mediante documentRef. Sin repositorio conectado, el estado debe indicar que falta la conexión o el documento.')
        ]),
        quiz(role)
      ]
    };
  }
  const courses=[
    course('cur_policy_receipts_dir_v1199','Dirección','Como Dirección, revisa permisos, motivos, antes/después y bloqueos antes de confirmar.'),
    course('cur_policy_receipts_op_v1199','Operativo','Como Operativo, verifica datos de emisión, recibos esperados, soportes y estado de conciliación.'),
    course('cur_policy_receipts_ase_v1199','Asesor','Como Asesor, consulta tu cartera y solicita gestiones cuando un cambio exceda tus permisos.')
  ];
  function apply(){
    try{
      if(!Orbit.store||!Orbit.store.all||!Orbit.store.insert)return false;
      const current=Orbit.store.all('cursos')||[]; if(!current.length)return false;
      const map={};current.forEach(c=>map[c.id]=c);
      courses.forEach(c=>{
        const prev=map[c.id];
        if(!prev)Orbit.store.insert('cursos',Object.assign({progreso:0,certificado:false},c));
        else if((prev._cv||0)<1199)Orbit.store.update('cursos',c.id,Object.assign({},c,{progreso:prev.progreso||0,certificado:!!prev.certificado}));
      });
      return true;
    }catch(e){return false;}
  }
  let tries=0;(function loop(){if(apply()||tries++>50)return;setTimeout(loop,150);})();
  document.addEventListener('orbit:reseeded',apply);
  return{courses,apply};
})();
