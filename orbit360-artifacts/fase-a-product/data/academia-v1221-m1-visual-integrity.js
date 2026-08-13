/* ============================================================
   Orbit 360 · Academia · Integridad visual M1 por rol
   Fecha: 2026-07-22 · contenido M1 1.228
   - Dirección / Operativo / Asesor
   - contrato visual, accesos seguros, responsive y ciclo de vida
   ============================================================ */
(function(){
  'use strict';
  window.Orbit=window.Orbit||{}; Orbit.modules=Orbit.modules||{};
  if(Orbit.academiaM1VisualIntegrity&&Orbit.academiaM1VisualIntegrity.contentVersion==='1.228')return;
  const sec=(icon,title,body)=>({icon,title,body});
  const common=[
    sec('🧭','Un gate técnico no sustituye la revisión visual','El gate confirma contratos, permisos y ausencia de escrituras no autorizadas. La revisión humana confirma que títulos, datos, acciones y estados se entienden y funcionan en el dispositivo real.'),
    sec('📱','Responsive verificable','En móvil deben caber títulos, encabezados, pestañas, acciones e Instalar como app sin salirse de la pantalla, superponerse ni ocultar controles.'),
    sec('🔐','Usuario y contraseña cumplen funciones distintas','El usuario del portal permanece visible. La contraseña usa un espacio separado, se revela temporalmente y vuelve a Oculta. Copiar acceso seguro incluye usuario y contraseña solo con permiso.'),
    sec('🏦','Datos bancarios exactos','La ficha muestra banco, tipo, número enmascarado, moneda y titular. El titular usa el nombre de la aseguradora cuando falta en la cuenta. El campo Uso no se muestra ni se copia.'),
    sec('🧪','Defecto y validador','FUNCTIONAL_DEFECT describe una falla del producto; VALIDATOR_STALE describe una prueba que no representa el contrato vigente. Un check verde no reemplaza la conducta visible y verificable.'),
    sec('🔄','Ciclo de vida de una autorización estática','Durante un preflight de un solo uso, la autorización está activa y aún no consumida. Solo al finalizar pasa a consumida. El validador debe aceptar ambas fases sin habilitar secretos, Firestore, escrituras, runtime, navegador ni deploy.')
  ];
  const byRole={
    'Dirección':common.concat([sec('✅','Validación de Dirección','Confirma directorio y ficha, usuario visible, revelado separado de contraseña, copia segura y datos bancarios completos. La revisión no autoriza reimportación ni cambios de credenciales.')]),
    'Operativo':common.concat([sec('🛠️','Validación de Operativo','Comprueba que la tableta respete scope team, que los accesos autorizados funcionen y que importadores restringidos no abran modal ni escriban.')]),
    'Asesor':common.concat([sec('💼','Validación de Asesor','Comprueba en móvil scope own, menú y pestañas utilizables, lectura honesta y ausencia de acciones administrativas restringidas.')])
  };
  const quiz=[
    {p:'¿Qué demuestra un gate técnico PASS?',ops:['Que toda la experiencia visual fue aprobada','Que los contratos automatizados evaluados pasaron','Que producción puede desplegarse'],ok:1},
    {p:'Al revelar una contraseña, el usuario del portal debe…',ops:['Ser reemplazado por la contraseña','Permanecer visible en su espacio','Ocultarse también'],ok:1},
    {p:'Copiar datos bancarios completos incluye…',ops:['Banco, tipo, cuenta, moneda y titular','Uso interno y observaciones','Contraseña del portal'],ok:0},
    {p:'Durante un preflight estático autorizado de un solo uso, la autorización debe estar…',ops:['Activa y no consumida hasta finalizar','Consumida antes de iniciar','Con navegador y deploy habilitados'],ok:0},
    {p:'¿Qué hacer si el validador exige una fase de autorización incorrecta?',ops:['Modificar el producto para satisfacerlo','Clasificar VALIDATOR_STALE y corregir el contrato del validador','Reimportar datos'],ok:1}
  ];
  function apply(){
    const store=Orbit.store;if(!store||!store.all||!store.insert||!store.update)return {ok:false,code:'STORE_REQUIRED'};
    const lessons=(store.all('lecciones')||[]).filter(x=>x&&x._m1visualv!==1221&&x._m1visualv!==1226&&x._m1visualv!==1227&&x._m1visualv!==1228);
    Object.keys(byRole).forEach(role=>lessons.push({id:'m1visual_'+role.toLowerCase().replace(/ó/g,'o')+'_1228',titulo:'Integridad visual M1 · '+role,rol:role,secciones:byRole[role],obligatoria:true,_m1visualv:1228}));
    const current=(store.all('evaluaciones')||[]).filter(x=>x&&x._m1visualv!==1221&&x._m1visualv!==1226&&x._m1visualv!==1227&&x._m1visualv!==1228);
    current.push({id:'eval_m1_visual_1228',titulo:'Caso aplicado · Integridad visual y ciclo de vida',preguntas:quiz,_m1visualv:1228});
    const put=(col,rows)=>rows.forEach(row=>{const old=store.get&&store.get(col,row.id);old?store.update(col,row.id,row):store.insert(col,row);});
    put('lecciones',lessons);put('evaluaciones',current);
    try{const cfg=(store.get('config','academia')||{});store.update('config','academia',Object.assign({},cfg,{contenidoM1Visual:'1.228',actualizadoAt:new Date().toISOString()}));}catch(e){}
    return {ok:true,contentVersion:'1.228',roles:Object.keys(byRole),lessons:3,quiz:quiz.length,writesThroughOrbitStoreOnly:true};
  }
  Orbit.academiaM1VisualIntegrity={version:'1.221',contentVersion:'1.228',visualSemanticsRemediation:true,validatorLifecyclePhaseAware:true,apply};
})();
