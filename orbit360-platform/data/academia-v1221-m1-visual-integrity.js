/* Orbit 360 · Academia · API 1.221 · contenido M1 1.222 */
(function(){
  'use strict';
  window.Orbit=window.Orbit||{};
  if(Orbit.ACADEMIA_V1221_M1_VISUAL&&Orbit.ACADEMIA_V1221_M1_VISUAL.version==='1.221'&&Orbit.ACADEMIA_V1221_M1_VISUAL.contentVersion==='1.222')return;
  function sec(icon,title,detail){return{icon:icon,t:title,color:'#C5162E',d:detail};}
  function lesson(){return{t:'Estados honestos y revisión visual',min:20,tipo:'lectura',_m1visualv:1222,secciones:[
    sec('🧭','Ausencia de información no significa estado favorable','Sin pólizas, cartera o cobros migrados, Orbit muestra pendiente, sin datos o aún no disponible; nunca Al día por ausencia de fuente.'),
    sec('🌎','País y tipo usan valores canónicos','Los filtros trabajan con GT/CO y Persona/Empresa. La proyección normaliza variantes antes de KPIs y filtros.'),
    sec('📅','Fechas inválidas','Una fecha no interpretable se presenta como Fecha no disponible, nunca InvalidDate.'),
    sec('👥','Rol activo visible','Escritorio, tableta y móvil deben permitir identificar y cambiar los roles realmente asignados.'),
    sec('🔎','Búsqueda móvil','Cliente 360 permite buscar por nombre, identificación, teléfono o correo también en móvil.'),
    sec('📥','Importación honesta','Cerrar sin archivo vuelve a la vista anterior. Solo existe éxito cuando hay propuesta, diferencia o registro trazable.'),
    sec('🏢','Alta sin borrador fantasma','Abrir Nueva aseguradora no crea ningún registro. Solo se escribe después de confirmar nombre, país y motivo. Cancelar o cerrar conserva exactamente el mismo conteo.'),
    sec('🧪','Defecto y validador','FUNCTIONAL_DEFECT describe una falla del producto; VALIDATOR_STALE describe una prueba que no cubre la experiencia real. Un dato accidental se corrige con evidencia, cero relaciones, auditoría y rollback.')
  ]};}
  function quiz(){return{t:'Evaluación · integridad visual M1',min:12,tipo:'quiz',_m1visualv:1222,preguntas:[
    {p:'Un cliente sin cartera cargada debe aparecer…',ops:['Al día','Pendiente o sin información','Con salud 100'],ok:1},
    {p:'Valores canónicos de tipo:',ops:['natural/jurídica','Persona/Empresa','nuevo/antiguo'],ok:1},
    {p:'Un selector oculto aprobado por el test corresponde a…',ops:['VALIDATOR_STALE','Éxito funcional','Dato completo'],ok:0},
    {p:'Cerrar una importación sin archivo debe…',ops:['Dejar blanco','Volver sin afirmar éxito','Crear un vacío'],ok:1},
    {p:'¿Cuándo se crea una aseguradora nueva?',ops:['Al abrir el formulario','Después de confirmar nombre, país y motivo','Al cerrar el formulario'],ok:1}
  ]};}
  function update(id){try{var current=Orbit.store&&Orbit.store.get?Orbit.store.get('cursos',id):null;if(!current)return false;var next=JSON.parse(JSON.stringify(current));next.lecciones=(next.lecciones||[]).filter(function(x){return x&&x._m1visualv!==1221&&x._m1visualv!==1222;});next.lecciones.push(lesson(),quiz());next._cv=Math.max(+next._cv||0,1222);next.progreso=current.progreso||0;next.certificado=!!current.certificado;Orbit.store.update('cursos',id,next);return true;}catch(e){return false;}}
  function apply(){return['cur_p_clientes','cur_dir_aseg_dir_v1202','cur_dir_aseg_op_v1202','cur_dir_aseg_asesor_v1202'].map(update).some(Boolean);}
  var tries=0;(function wait(){if(apply()||tries++>60)return;setTimeout(wait,150);})();
  document.addEventListener('orbit:reseeded',apply);
  Orbit.ACADEMIA_V1221_M1_VISUAL={version:'1.221',contentVersion:'1.222',apply:apply};
})();
