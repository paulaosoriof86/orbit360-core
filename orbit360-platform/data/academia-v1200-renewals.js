/* ============================================================
   Orbit 360 · Academia — Renovaciones v1.200
   Enseña gestión real, cotización validada y canales honestos.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.ACADEMIA_V1200 = (function () {
  const sec=(icon,t,d)=>({icon,t,color:'#C5162E',d});
  function course(id,role,focus){return{
    id,titulo:'Renovaciones operativas — '+role,cat:'Operación',emoji:'🔄',color:'#1E2227',
    desc:'Ruta para preparar renovaciones, cotizar con fuentes vigentes y evitar propuestas o envíos simulados.',destinatarios:role,recursos:[],_cv:1200,
    metaLeccion:{sirve:'Gestionar pólizas próximas a vencer desde el expediente hasta Cotizador y Comparativo.',importa:'Evita primas inventadas, duplicados, campañas falsas y renovaciones sin trazabilidad.',datos:'Lee póliza origen, cliente, vigencia, país, moneda, gestión, cotizaciones y decisión.',impacto:'Conecta Renovaciones, Ops, Cotizador, Comparativo, Cliente 360, Pólizas y Academia.'},
    lecciones:[
      {t:'Preparar la renovación',min:10,tipo:'lectura',secciones:[
        sec('📊','Indicadores verificables','Cada KPI abre las pólizas que lo componen. GTQ y COP permanecen separados.'),
        sec('📤','Campaña preparada','Preparar seguimientos registra la actividad, pero no afirma un envío hasta que correo o WhatsApp estén conectados y verificados.'),
        sec('👤',focus,role==='Asesor'?'Consulta tu cartera, abre la gestión y solicita cotización. No emitas ni cambies la póliza directamente.':'Revisa prioridad, responsable, vigencia y fuente antes de avanzar.')
      ]},
      {t:'Cotizar y comparar',min:12,tipo:'lectura',secciones:[
        sec('🧮','Fuentes vigentes','La renovación abre Cotizador con el contexto de la póliza. No usa porcentajes aleatorios ni estimaciones presentadas como tarifa.'),
        sec('📋','Comparativo','Solo compara ofertas reales o propuestas cargadas y normalizadas, con cobertura, deducible, exclusiones, moneda y versión.'),
        sec('🗂','Gestión única','Una póliza reutiliza la gestión activa de renovación para no duplicar trabajo ni auditoría.')
      ]},
      {t:'Evaluación aplicada',min:8,tipo:'quiz',preguntas:[
        {p:'¿Una campaña preparada significa que el mensaje fue enviado?',ops:['Sí','No; depende de un canal conectado y verificado','Solo en Guatemala'],ok:1},
        {p:'¿Puede Orbit mostrar una prima aleatoria como propuesta real?',ops:['Sí','No; debe provenir de fuente validada','Solo para asesores'],ok:1},
        {p:'¿Qué ocurre al solicitar propuestas?',ops:['Se crea/reutiliza gestión y se abre Cotizador con contexto','Se emite una nueva póliza automáticamente','Se borra la póliza anterior'],ok:0}
      ]}
    ]
  };}
  const courses=[course('cur_renewals_dir_v1200','Dirección','Como Dirección, confirma permisos, fuentes, canales y decisión antes de emitir.'),course('cur_renewals_op_v1200','Operativo','Como Operativo, completa la gestión y verifica cotizaciones y documentos.'),course('cur_renewals_ase_v1200','Asesor','Como Asesor, inicia la gestión y acompaña la decisión del cliente.')];
  function apply(){try{if(!Orbit.store||!Orbit.store.all||!Orbit.store.insert)return false;const rows=Orbit.store.all('cursos')||[];if(!rows.length)return false;const map={};rows.forEach(c=>map[c.id]=c);courses.forEach(c=>{const p=map[c.id];if(!p)Orbit.store.insert('cursos',Object.assign({progreso:0,certificado:false},c));else if((p._cv||0)<1200)Orbit.store.update('cursos',c.id,Object.assign({},c,{progreso:p.progreso||0,certificado:!!p.certificado}));});return true;}catch(e){return false;}}
  let tries=0;(function loop(){if(apply()||tries++>50)return;setTimeout(loop,150);})();document.addEventListener('orbit:reseeded',apply);return{courses,apply};
})();
