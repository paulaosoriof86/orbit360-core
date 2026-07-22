/* Orbit 360 · Academia · API 1.221 · contenido M1 1.227 */
(function(){
  'use strict';
  window.Orbit=window.Orbit||{};
  if(Orbit.ACADEMIA_V1221_M1_VISUAL&&Orbit.ACADEMIA_V1221_M1_VISUAL.version==='1.221'&&Orbit.ACADEMIA_V1221_M1_VISUAL.contentVersion==='1.227')return;
  function sec(icon,title,detail){return{icon:icon,t:title,color:'#C5162E',d:detail};}
  function lesson(){return{t:'Estados honestos y operación segura',min:30,tipo:'lectura',_m1visualv:1227,secciones:[
    sec('🧭','Ausencia de información no significa estado favorable','Sin pólizas, cartera o cobros migrados, Orbit muestra pendiente, sin datos o aún no disponible; nunca Al día por ausencia de fuente.'),
    sec('🌎','País por validar y evidencia posterior','País y moneda se corrigen en Calidad con motivo y auditoría. Pólizas o cobros vinculados pueden sugerir GT o CO, pero una moneda aislada nunca cambia el país silenciosamente. Un conflicto siempre requiere revisión humana.'),
    sec('🧩','Segmentación antes y después de Pólizas','Sin pólizas validadas el segmento es Pendiente de clasificar. Nuevo, Recurrente, Estándar, Premium e Histórico solo se calculan con reglas visibles; Premium exige umbral configurado sobre prima neta recaudada.'),
    sec('📅','Fechas inválidas','Una fecha no interpretable se presenta como Sin fecha registrada o Fecha no disponible, nunca InvalidDate.'),
    sec('👥','Rol activo y alcance','Escritorio, tableta y móvil deben permitir identificar el rol activo. Calidad y Cliente 360 respetan propios, equipo o todos.'),
    sec('🛡️','El rol activo impone el techo','En una cuenta multirol, cambiar a Asesor también cambia el alcance efectivo. Un scope amplio de Dirección nunca se hereda al activar Asesor: Dirección puede llegar a todos, Operativo como máximo al equipo y Asesor únicamente a sus propios clientes. Una restricción más estrecha, como ninguno, siempre prevalece.'),
    sec('🔗','Usuario visible y contraseña protegida','El usuario del portal permanece visible en su propio campo. Ver temporalmente revela únicamente la contraseña en un espacio separado y por tiempo limitado; nunca reemplaza el usuario ni persiste el secreto en la ficha.'),
    sec('🏦','Copia bancaria completa y segura','Banco, tipo, cuenta, moneda y titular pueden copiarse como bloque operativo. El titular usa la aseguradora cuando la fuente no trae otro valor. El campo Uso no se muestra ni se copia porque no pertenece al bloque que debe compartir el equipo.'),
    sec('📥','Archivo seleccionado no significa almacenado','Seleccionar un archivo solo prepara la propuesta. El éxito exige persistencia comprobada. Sin referencia HTTPS o almacenamiento seguro, Orbit debe decir Propuesta registrada, archivo pendiente de almacenamiento; nunca Archivo cargado.'),
    sec('🧠','Tarifas y conocimiento','Cada fuente se revisa por país, moneda, ramo y producto. Registrar un documento no habilita automáticamente Cotizador ni Comparativo.'),
    sec('🏢','Aseguradoras inactivas','Una aseguradora inactiva conserva histórico y debe mostrar el motivo de desactivación. No se reactiva automáticamente por tener contactos, documentos o pólizas.'),
    sec('✨','Estabilidad y responsive','El primer contenido visible ya debe usar la proyección canónica. Títulos, encabezados, tabs, acciones y el botón Instalar como app deben caber, ser legibles y no producir desplazamiento horizontal en escritorio, tableta o móvil.'),
    sec('🧪','Defecto y validador','FUNCTIONAL_DEFECT describe una falla del producto; VALIDATOR_STALE describe una prueba que no cubre la experiencia real. Un check verde no reemplaza la conducta visible y verificable.'),
    sec('🔐','Integridad antes del navegador','Un fix local y un preflight verde no demuestran que Hosting esté sirviendo esos mismos archivos. Antes de abrir navegador, index, Router, barrera visual, contrato visual, PWA, Service Worker e IA deben coincidir byte por byte y por SHA-256 con el HEAD autorizado.'),
    sec('🛑','Cuándo detener reintentos','Si el mismo error se repite después de un fix local, no se crea otro parche. Se congela el gate y se revisa si la entrega, cache, workflow o verificador dejó pasar una versión anterior.')
  ]};}
  function quiz(){return{t:'Evaluación · honestidad operativa M1',min:20,tipo:'quiz',_m1visualv:1227,preguntas:[
    {p:'Un cliente sin pólizas validadas debe tener segmento…',ops:['Nuevo','Pendiente de clasificar','Premium'],ok:1},
    {p:'La moneda COP de un cobro vinculado permite…',ops:['Cambiar el país automáticamente','Sugerir Colombia para revisión','Ocultar el cliente'],ok:1},
    {p:'Una cuenta con Dirección y Asesor cambia su rol activo a Asesor. ¿Qué alcance máximo conserva?',ops:['Todos, porque también tiene Dirección','Solo sus clientes propios','Todo el equipo comercial'],ok:1},
    {p:'Si una configuración explícita dice ninguno y el rol permitiría todos…',ops:['Gana todos','Gana ninguno','Se combinan ambos'],ok:1},
    {p:'Seleccionar un PDF en el navegador significa…',ops:['Archivo almacenado','Propuesta preparada; falta comprobar persistencia','Tarifa habilitada'],ok:1},
    {p:'Al pulsar Ver temporalmente en un portal…',ops:['La contraseña reemplaza el usuario','El usuario permanece visible y la contraseña aparece aparte por tiempo limitado','La contraseña se guarda en la ficha'],ok:1},
    {p:'Copiar datos bancarios completos debe incluir…',ops:['Banco, tipo, cuenta, moneda y titular','Banco, cuenta, uso y contraseña del portal','Solo los últimos cuatro dígitos'],ok:0},
    {p:'Registrar un tarifario habilita Cotizador…',ops:['Siempre','Nunca de forma automática; requiere validación','Solo por el nombre del archivo'],ok:1},
    {p:'Una aseguradora inactiva debe…',ops:['Desaparecer','Mostrar motivo y conservar histórico','Reactivarse al abrirla'],ok:1},
    {p:'En móvil, un encabezado o botón que obliga a desplazarse horizontalmente…',ops:['Es aceptable si funciona en escritorio','Es un defecto responsive que debe corregirse en el owner visual','Se corrige reimportando datos'],ok:1},
    {p:'Un preflight local verde demuestra que el navegador recibió el fix…',ops:['Sí, siempre','No; los activos críticos desplegados deben coincidir en bytes y SHA-256','Solo si cambió el comentario del archivo'],ok:1},
    {p:'Si el mismo error reaparece después de un fix local…',ops:['Se agrega otro parche visual','Se detienen reintentos y se revisa pipeline, cache e integridad de entrega','Se reimportan datos'],ok:1}
  ]};}
  function update(id){try{var current=Orbit.store&&Orbit.store.get?Orbit.store.get('cursos',id):null;if(!current)return false;var next=JSON.parse(JSON.stringify(current));next.lecciones=(next.lecciones||[]).filter(function(x){return x&&x._m1visualv!==1221&&x._m1visualv!==1222&&x._m1visualv!==1223&&x._m1visualv!==1224&&x._m1visualv!==1225&&x._m1visualv!==1226&&x._m1visualv!==1227;});next.lecciones.push(lesson(),quiz());next._cv=Math.max(+next._cv||0,1227);next.progreso=current.progreso||0;next.certificado=!!current.certificado;Orbit.store.update('cursos',id,next);return true;}catch(e){return false;}}
  function apply(){return['cur_p_clientes','cur_dir_aseg_dir_v1202','cur_dir_aseg_op_v1202','cur_dir_aseg_asesor_v1202'].map(update).some(Boolean);}
  var tries=0;(function wait(){if(apply()||tries++>60)return;setTimeout(wait,150);})();
  document.addEventListener('orbit:reseeded',apply);
  Orbit.ACADEMIA_V1221_M1_VISUAL={version:'1.221',contentVersion:'1.227',criticalRelease:'block1-critical-runtime-20260721-4',activeRoleScopeCeiling:true,visualSemanticsRemediation:true,apply:apply};
})();
