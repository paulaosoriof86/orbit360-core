/* Orbit 360 · Academia · API 1.221 · contenido M1 1.223 */
(function(){
  'use strict';
  window.Orbit=window.Orbit||{};
  if(Orbit.ACADEMIA_V1221_M1_VISUAL&&Orbit.ACADEMIA_V1221_M1_VISUAL.version==='1.221'&&Orbit.ACADEMIA_V1221_M1_VISUAL.contentVersion==='1.223')return;
  function sec(icon,title,detail){return{icon:icon,t:title,color:'#C5162E',d:detail};}
  function lesson(){return{t:'Estados honestos y revisión visual',min:22,tipo:'lectura',_m1visualv:1223,secciones:[
    sec('🧭','Ausencia de información no significa estado favorable','Sin pólizas, cartera o cobros migrados, Orbit muestra pendiente, sin datos o aún no disponible; nunca Al día por ausencia de fuente.'),
    sec('🌎','País y tipo usan valores canónicos','Los filtros trabajan con GT, CO, REQUIERE_VALIDACION y Persona/Empresa. País por validar identifica los expedientes que aún necesitan confirmación; no se les asigna Guatemala por defecto.'),
    sec('📅','Fechas inválidas','Una fecha no interpretable se presenta como Sin fecha registrada o Fecha no disponible, nunca InvalidDate.'),
    sec('👥','Rol activo visible','Escritorio, tableta y móvil deben permitir identificar y cambiar los roles realmente asignados.'),
    sec('🔎','Búsqueda móvil','Cliente 360 permite buscar por nombre, identificación, teléfono o correo también en móvil.'),
    sec('🔗','Datos accionables y jerarquía','En Aseguradoras, correo, teléfono, WhatsApp y portal deben tener etiqueta, jerarquía y acción directa. Los datos bancarios conservan revelado y copia seguros; nunca se exponen por un atajo visual.'),
    sec('✨','Estabilidad del primer render','El módulo debe abrir con la proyección canónica desde el primer contenido visible. Un segundo repintado que corrige tipo, fecha o país es un defecto funcional, aunque el resultado final parezca correcto.'),
    sec('📥','Importación honesta','Cerrar sin archivo vuelve a la vista anterior. Solo existe éxito cuando hay propuesta, diferencia o registro trazable.'),
    sec('🏢','Alta sin borrador fantasma','Abrir Nueva aseguradora no crea ningún registro. Solo se escribe después de confirmar nombre, país y motivo. Cancelar o cerrar conserva exactamente el mismo conteo.'),
    sec('🧪','Defecto y validador','FUNCTIONAL_DEFECT describe una falla del producto; VALIDATOR_STALE describe una prueba que no cubre la experiencia real. Validar un objeto interno no sustituye comprobar el DOM que ve la persona usuaria.')
  ]};}
  function quiz(){return{t:'Evaluación · integridad visual M1',min:14,tipo:'quiz',_m1visualv:1223,preguntas:[
    {p:'Un cliente sin cartera cargada debe aparecer…',ops:['Al día','Pendiente o sin información','Con salud 100'],ok:1},
    {p:'Valores canónicos de tipo:',ops:['natural/jurídica','Persona/Empresa','nuevo/antiguo'],ok:1},
    {p:'Un expediente sin país confiable debe…',ops:['Asignarse a GT','Mostrarse como País por validar','Ocultarse'],ok:1},
    {p:'Un selector correcto en datos internos pero vacío en pantalla corresponde a…',ops:['VALIDATOR_STALE y defecto funcional visible','Éxito funcional','Dato completo'],ok:0},
    {p:'Los datos bancarios deben…',ops:['Mostrarse siempre completos','Usar revelado y copia seguros','Ocultarse sin posibilidad de gestión'],ok:1},
    {p:'¿Cuándo se crea una aseguradora nueva?',ops:['Al abrir el formulario','Después de confirmar nombre, país y motivo','Al cerrar el formulario'],ok:1}
  ]};}
  function update(id){try{var current=Orbit.store&&Orbit.store.get?Orbit.store.get('cursos',id):null;if(!current)return false;var next=JSON.parse(JSON.stringify(current));next.lecciones=(next.lecciones||[]).filter(function(x){return x&&x._m1visualv!==1221&&x._m1visualv!==1222&&x._m1visualv!==1223;});next.lecciones.push(lesson(),quiz());next._cv=Math.max(+next._cv||0,1223);next.progreso=current.progreso||0;next.certificado=!!current.certificado;Orbit.store.update('cursos',id,next);return true;}catch(e){return false;}}
  function apply(){return['cur_p_clientes','cur_dir_aseg_dir_v1202','cur_dir_aseg_op_v1202','cur_dir_aseg_asesor_v1202'].map(update).some(Boolean);}
  var tries=0;(function wait(){if(apply()||tries++>60)return;setTimeout(wait,150);})();
  document.addEventListener('orbit:reseeded',apply);
  Orbit.ACADEMIA_V1221_M1_VISUAL={version:'1.221',contentVersion:'1.223',apply:apply};
})();
