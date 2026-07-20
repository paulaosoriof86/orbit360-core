/* Orbit 360 · Academia · API 1.221 · contenido M1 1.225 */
(function(){
  'use strict';
  window.Orbit=window.Orbit||{};
  if(Orbit.ACADEMIA_V1221_M1_VISUAL&&Orbit.ACADEMIA_V1221_M1_VISUAL.version==='1.221'&&Orbit.ACADEMIA_V1221_M1_VISUAL.contentVersion==='1.225')return;
  function sec(icon,title,detail){return{icon:icon,t:title,color:'#C5162E',d:detail};}
  function lesson(){return{t:'Estados honestos y operación segura',min:28,tipo:'lectura',_m1visualv:1225,secciones:[
    sec('🧭','Ausencia de información no significa estado favorable','Sin pólizas, cartera o cobros migrados, Orbit muestra pendiente, sin datos o aún no disponible; nunca Al día por ausencia de fuente.'),
    sec('🌎','País por validar y evidencia posterior','País y moneda se corrigen en Calidad con motivo y auditoría. Pólizas o cobros vinculados pueden sugerir GT o CO, pero una moneda aislada nunca cambia el país silenciosamente. Un conflicto siempre requiere revisión humana.'),
    sec('🧩','Segmentación antes y después de Pólizas','Sin pólizas validadas el segmento es Pendiente de clasificar. Nuevo, Recurrente, Estándar, Premium e Histórico solo se calculan con reglas visibles; Premium exige umbral configurado sobre prima neta recaudada.'),
    sec('📅','Fechas inválidas','Una fecha no interpretable se presenta como Sin fecha registrada o Fecha no disponible, nunca InvalidDate.'),
    sec('👥','Rol activo y alcance','Escritorio, tableta y móvil deben permitir identificar el rol activo. Calidad y Cliente 360 respetan propios, equipo o todos.'),
    sec('🔗','Directorio operativo y accesos protegidos','Correo, teléfono, WhatsApp y portal tienen acción directa. Los accesos se recuperan temporalmente desde un proveedor seguro según permisos y quedan auditados; no se persisten contraseñas como texto visible.'),
    sec('🔐','Disponibilidad real de credenciales','Una credencial detectada en el directorio no está disponible hasta que el proveedor remoto confirme almacenamiento seguro y devuelva una referencia opaca. Sin esa confirmación, Ver y Copiar permanecen bloqueados y la interfaz debe indicar Vinculación segura pendiente.'),
    sec('🛡️','Permisos de infraestructura','El proveedor de secretos requiere permisos distintos a los del frontend o Firestore. Un fallo de IAM se clasifica como ENVIRONMENT_FAILURE: se congela el producto y se corrige la infraestructura, sin guardar claves en una colección menos segura ni habilitar botones por apariencia.'),
    sec('🏦','Copia bancaria completa y segura','Banco, tipo, cuenta, moneda, titular y uso pueden copiarse como bloque operativo. Ver y Copiar respetan el control seguro y no convierten el dato en texto permanente.'),
    sec('📥','Archivo seleccionado no significa almacenado','Seleccionar un archivo solo prepara la propuesta. El éxito exige persistencia comprobada. Sin referencia HTTPS o almacenamiento seguro, Orbit debe decir Propuesta registrada, archivo pendiente de almacenamiento; nunca Archivo cargado.'),
    sec('🧠','Tarifas y conocimiento','Cada fuente se revisa por país, moneda, ramo y producto. Registrar un documento no habilita automáticamente Cotizador ni Comparativo.'),
    sec('🏢','Aseguradoras inactivas','Una aseguradora inactiva conserva histórico y debe mostrar el motivo de desactivación. No se reactiva automáticamente por tener contactos, documentos o pólizas.'),
    sec('✨','Estabilidad y responsive','El primer contenido visible ya debe usar la proyección canónica. Títulos, acciones y tabs deben caber y ser legibles en escritorio, tableta y móvil.'),
    sec('🧪','Defecto, ambiente y validador','FUNCTIONAL_DEFECT describe una falla del producto; ENVIRONMENT_FAILURE un bloqueo de infraestructura; VALIDATOR_STALE una prueba que no cubre la experiencia real. Un check verde no reemplaza la conducta visible y verificable.')
  ]};}
  function quiz(){return{t:'Evaluación · honestidad operativa M1',min:18,tipo:'quiz',_m1visualv:1225,preguntas:[
    {p:'Un cliente sin pólizas validadas debe tener segmento…',ops:['Nuevo','Pendiente de clasificar','Premium'],ok:1},
    {p:'La moneda COP de un cobro vinculado permite…',ops:['Cambiar el país automáticamente','Sugerir Colombia para revisión','Ocultar el cliente'],ok:1},
    {p:'Seleccionar un PDF en el navegador significa…',ops:['Archivo almacenado','Propuesta preparada; falta comprobar persistencia','Tarifa habilitada'],ok:1},
    {p:'Una contraseña operativa debe…',ops:['Guardarse en la ficha','Recuperarse temporalmente desde conexión segura y auditarse','Compartirse en observaciones'],ok:1},
    {p:'Una credencial detectada en Excel habilita Ver/Copiar…',ops:['De inmediato','Solo después de confirmación remota y referencia opaca','Cuando el usuario recarga'],ok:1},
    {p:'Si IAM impide crear la bóveda, corresponde…',ops:['Guardar temporalmente en Firestore','Clasificar ENVIRONMENT_FAILURE y mantener controles bloqueados','Mostrar una clave ficticia'],ok:1},
    {p:'Copiar datos bancarios completos debe incluir…',ops:['Solo los últimos cuatro dígitos','Banco, tipo, cuenta, moneda, titular y uso según permisos','La contraseña del portal'],ok:1},
    {p:'Registrar un tarifario habilita Cotizador…',ops:['Siempre','Nunca de forma automática; requiere validación','Solo por el nombre del archivo'],ok:1},
    {p:'Una aseguradora inactiva debe…',ops:['Desaparecer','Mostrar motivo y conservar histórico','Reactivarse al abrirla'],ok:1}
  ]};}
  function update(id){try{var current=Orbit.store&&Orbit.store.get?Orbit.store.get('cursos',id):null;if(!current)return false;var next=JSON.parse(JSON.stringify(current));next.lecciones=(next.lecciones||[]).filter(function(x){return x&&x._m1visualv!==1221&&x._m1visualv!==1222&&x._m1visualv!==1223&&x._m1visualv!==1224&&x._m1visualv!==1225;});next.lecciones.push(lesson(),quiz());next._cv=Math.max(+next._cv||0,1225);next.progreso=current.progreso||0;next.certificado=!!current.certificado;Orbit.store.update('cursos',id,next);return true;}catch(e){return false;}}
  function apply(){return['cur_p_clientes','cur_dir_aseg_dir_v1202','cur_dir_aseg_op_v1202','cur_dir_aseg_asesor_v1202'].map(update).some(Boolean);}
  var tries=0;(function wait(){if(apply()||tries++>60)return;setTimeout(wait,150);})();
  document.addEventListener('orbit:reseeded',apply);
  Orbit.ACADEMIA_V1221_M1_VISUAL={version:'1.221',contentVersion:'1.225',apply:apply};
})();
