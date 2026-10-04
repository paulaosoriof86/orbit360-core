'use strict';

const {onRequest}=require('firebase-functions/v2/https');
const S495=require('./cotcomp-premium-visual-preview-s495');
const S494=require('./cotcomp-premium-visual-preview-s494');

const VERSION='ays-cotcomp-s496-journey-intake-restoration-v1.0';
const PROJECT_ID='ays-orbit-360-lab';
const REGION='us-central1';
const FUNCTION_NAME='cotcompPremiumJourneyPreviewS496';
const PARENT_FUNCTION='cotcompPremiumVisualPreviewS495';
const PARENT_VERSION=S495.VERSION;
const CATALOG_PATH=S494.CATALOG_PATH;

const CSS=`
/* S4.96 · journey/intake restoration over S4.95 */
body[data-s496="true"] .hero{min-height:360px}
body[data-s496="true"] .hero-media{left:auto;right:34px;top:22px;bottom:22px;width:min(46vw,710px);border-radius:20px;overflow:hidden}
body[data-s496="true"] .hero-media img{object-fit:cover;object-position:center 43%}
body[data-s496="true"] .hero-overlay{background:linear-gradient(90deg,#0E0D10 0%,#0E0D10 46%,rgba(14,13,16,.93) 55%,rgba(14,13,16,.35) 74%,rgba(14,13,16,.08) 100%)}
body[data-s496="true"] .hero-inner{padding-top:44px;padding-bottom:68px;grid-template-columns:minmax(0,650px) 1fr}
body[data-s496="true"] .hero h1{font-family:'Archivo',sans-serif;font-weight:850;font-size:clamp(45px,4.35vw,64px);line-height:.94;letter-spacing:-.045em;max-width:10.5ch}
body[data-s496="true"] .hero h1 em{font-family:'Archivo',sans-serif;font-style:normal;color:#ff3150}
body[data-s496="true"] .hero p{font-family:'Instrument Sans',sans-serif;font-size:17px;line-height:1.55}
body[data-s496="true"] .hero-benefit{font-family:'Instrument Sans',sans-serif}
body[data-s496="true"] .progress4{gap:0}
body[data-s496="true"] .pstep{position:relative;opacity:.55}
body[data-s496="true"] .pstep.active{opacity:1}
body[data-s496="true"] .pstep.done{opacity:.84}
body[data-s496="true"] .pstep.done .pnum{background:#171412;color:#fff;border-color:#171412}
body[data-s496="true"] .pstep .pnum{transition:none}
body[data-s496="true"] .quote-main{min-width:0}
body[data-s496="true"] #formRow.s496-form{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:10px 10px;align-items:start}
body[data-s496="true"] #formRow.s496-form .field{grid-column:span 4}
body[data-s496="true"] #formRow.s496-form .field.w6{grid-column:span 6}
body[data-s496="true"] #formRow.s496-form .field.w12{grid-column:1/-1}
body[data-s496="true"] #formRow.s496-form .field label{display:block;font-family:'Instrument Sans';font-size:11.5px;font-weight:650;color:#766f68;margin:0 0 5px}
body[data-s496="true"] #formRow.s496-form input,
body[data-s496="true"] #formRow.s496-form select{width:100%;min-height:50px;border:1px solid #ded5cc;border-radius:9px;background:#fff;padding:14px 12px;font:500 14px/1.2 'Instrument Sans';color:#211d1a}
body[data-s496="true"] #formRow.s496-form input:focus,
body[data-s496="true"] #formRow.s496-form select:focus{outline:2px solid rgba(228,0,43,.12);border-color:#E4002B}
body[data-s496="true"] .s496-help{font:11px/1.35 'Instrument Sans';color:#7b736b;margin-top:5px}
body[data-s496="true"] .s496-status{display:inline-flex;align-items:center;gap:6px;margin:0 0 10px;padding:6px 9px;border-radius:999px;background:#f5efe8;color:#5c5149;font:700 10px/1.2 'IBM Plex Mono';letter-spacing:.02em}
body[data-s496="true"] .s496-status.hybrid{background:#fff1e5;color:#7f4a12}
body[data-s496="true"] .s496-status.consultative{background:#f0ecf8;color:#5b467b}
body[data-s496="true"] .s496-status.more{background:#eef4f8;color:#355d72}
body[data-s496="true"] .s496-actions{grid-column:1/-1;display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:5px}
body[data-s496="true"] .s496-back{min-height:46px;border:1px solid #ddd4cc;background:#fff;color:#3c342e;border-radius:9px;padding:0 14px;font-weight:750}
body[data-s496="true"] .s496-next{min-height:46px;border:0;background:#E4002B;color:#fff;border-radius:9px;padding:0 20px;font-weight:800}
body[data-s496="true"] .s496-next:hover{background:#bd001f}
body[data-s496="true"] .s496-review{margin-top:10px;border:1px solid #e5ddd5;background:linear-gradient(180deg,#fff,#fbf7f3);border-radius:14px;padding:16px}
body[data-s496="true"] .s496-review[hidden]{display:none}
body[data-s496="true"] .s496-review h4{font:800 16px/1.2 'Archivo';margin:0 0 6px}
body[data-s496="true"] .s496-review p{font:13px/1.5 'Instrument Sans';color:#645b53;margin:0 0 12px}
body[data-s496="true"] .s496-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
body[data-s496="true"] .s496-summary div{border:1px solid #ebe3db;border-radius:9px;background:#fff;padding:9px 10px}
body[data-s496="true"] .s496-summary b{display:block;font:700 10px/1.2 'IBM Plex Mono';color:#8a8178;margin-bottom:4px}
body[data-s496="true"] .s496-summary span{font:600 12px/1.35 'Instrument Sans';color:#2f2925}
body[data-s496="true"] .compare.s496-locked{display:none}
body[data-s496="true"] .compare{border-top:1px solid #e6ddd5}
body[data-s496="true"] .alternatives{align-items:start}
body[data-s496="true"] .alt{background:#fff;border:1px solid #e5ddd5;box-shadow:0 14px 30px -28px rgba(0,0,0,.45)}
body[data-s496="true"] .alt .s495-detail{background:#fff;border-top:1px solid #eee5df;border-left:0;border-right:0;border-bottom:0;border-radius:0;padding:12px 0 0}
body[data-s496="true"] .rec{background:linear-gradient(180deg,#fff7f8,#fff);border-color:#f0c7d0}
body[data-s496="true"] .utility{background:#faf7f3}
body[data-s496="true"] .s496-journey-note{margin:9px 0 0;padding:9px 11px;border-left:3px solid #171412;background:#f7f3ef;border-radius:0 8px 8px 0;font:11.5px/1.45 'Instrument Sans';color:#554c45}
body[data-s496="true"] .product-visual{min-height:330px}
body[data-s496="true"] .product-visual[data-s495-photo="false"] .product-scene{opacity:1!important;visibility:visible!important}
body[data-s496="true"] .s495-consultative-photo[hidden]{display:none!important}
body[data-s496="true"] .combo-list{z-index:80}
@media(max-width:1080px){
  body[data-s496="true"] .hero-media{right:0;top:0;bottom:0;width:52vw;border-radius:0}
  body[data-s496="true"] #formRow.s496-form .field{grid-column:span 6}
}
@media(max-width:760px){
  body[data-s496="true"] .hero{min-height:430px}
  body[data-s496="true"] .hero-media{left:34%;width:auto;opacity:.55}
  body[data-s496="true"] .hero-overlay{background:linear-gradient(90deg,#0E0D10 0%,rgba(14,13,16,.96) 58%,rgba(14,13,16,.36) 100%)}
  body[data-s496="true"] .hero-inner{grid-template-columns:1fr;padding-top:42px}
  body[data-s496="true"] .hero h1{font-size:48px}
  body[data-s496="true"] #formRow.s496-form .field,
  body[data-s496="true"] #formRow.s496-form .field.w6{grid-column:1/-1}
  body[data-s496="true"] .s496-summary{grid-template-columns:1fr 1fr}
}
@media(max-width:520px){
  body[data-s496="true"] .hero-media{left:0;opacity:.34}
  body[data-s496="true"] .hero-overlay{background:linear-gradient(180deg,rgba(14,13,16,.62),#0E0D10 72%)}
  body[data-s496="true"] .hero h1{font-size:43px}
  body[data-s496="true"] .s496-summary{grid-template-columns:1fr}
}
`;

const JS=`
(()=>{
'use strict';
const API='__API__';
const state={
  stage:1,
  route:'vehicle',
  country:'GT',
  mode:'online',
  form:{},
  brands:[],
  models:[],
  brandId:'',
  visualTimer:null
};
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const norm=s=>String(s||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
const qp=o=>new URLSearchParams(Object.fromEntries(Object.entries(o).filter(([,v])=>v!==''&&v!=null))).toString();
const routeId=()=>q('.family.active')?.dataset.route||state.route||'vehicle';

const LABELS=[
  ['1','Lo que necesitas'],
  ['2','Tus datos'],
  ['3','Revisar opciones'],
  ['4','Comparar y continuar']
];

const INTAKE={
  vehicle:{
    statusGT:['HYBRID_REQUIRED','hybrid'],statusCO:['CONSULTATIVE_REQUIRED','consultative'],
    title:'Cuéntanos lo necesario sobre tu vehículo'
  },
  home:{statusGT:['HYBRID_REQUIRED','hybrid'],statusCO:['HYBRID_REQUIRED','hybrid'],title:'Cuéntanos lo necesario sobre tu hogar'},
  health:{statusGT:['HYBRID_REQUIRED','hybrid'],statusCO:['CONSULTATIVE_REQUIRED','consultative'],title:'Cuéntanos lo necesario sobre tu protección de salud'},
  life:{statusGT:['CONSULTATIVE_REQUIRED','consultative'],statusCO:['CONSULTATIVE_REQUIRED','consultative'],title:'Cuéntanos qué necesitas proteger en vida e ingreso'},
  business:{statusGT:['CONSULTATIVE_REQUIRED','consultative'],statusCO:['CONSULTATIVE_REQUIRED','consultative'],title:'Cuéntanos cómo es tu empresa y qué quieres proteger'},
  cargo:{statusGT:['HYBRID_REQUIRED','hybrid'],statusCO:['CONSULTATIVE_REQUIRED','consultative'],title:'Cuéntanos cómo funciona tu operación de transporte o carga'},
  other:{statusGT:['MORE_DATA_REQUIRED','more'],statusCO:['MORE_DATA_REQUIRED','more'],title:'Ayúdanos a orientarte'}
};

function getStatus(){
  const m=INTAKE[state.route]||INTAKE.other;
  return state.country==='CO'?m.statusCO:m.statusGT;
}
function setCountry(c){
  state.country=c==='CO'?'CO':'GT';
  state.form={};state.brandId='';state.models=[];
  qa('.country button').forEach(b=>b.classList.toggle('active',b.textContent.trim().toLowerCase().startsWith(state.country==='CO'?'col':'gua')));
  if(state.stage===0)state.stage=1;
  render();
}
function setStage(n){
  state.stage=Math.max(0,Math.min(3,Number(n)||0));
  syncProgress();
  renderStage();
}
function syncProgress(){
  const steps=qa('.progress4 .pstep');
  steps.forEach((el,i)=>{
    const label=LABELS[i]; const n=q('.pnum',el); const txt=el.querySelectorAll('span')[1];
    if(n)n.textContent=label[0];
    if(txt)txt.textContent=label[1];
    el.classList.toggle('active',i===state.stage);
    el.classList.toggle('done',i<state.stage);
    if(n)n.setAttribute('aria-current',i===state.stage?'step':'false');
  });
}
function field(id,label,type='text',opts=[],cls='',help=''){
  const v=state.form[id]??'';
  let ctl='';
  if(type==='select'){
    ctl='<select data-s496-field="'+esc(id)+'"><option value="">Selecciona</option>'+opts.map(o=>'<option value="'+esc(o)+'"'+(String(v)===String(o)?' selected':'')+'>'+esc(o)+'</option>').join('')+'</select>';
  } else if(type==='number'||type==='date'){
    ctl='<input data-s496-field="'+esc(id)+'" type="'+type+'" value="'+esc(v)+'">';
  } else {
    ctl='<input data-s496-field="'+esc(id)+'" type="text" value="'+esc(v)+'">';
  }
  return '<div class="field '+cls+'"><label>'+esc(label)+'</label>'+ctl+(help?'<div class="s496-help">'+esc(help)+'</div>':'')+'</div>';
}
function vehicleFields(){
  const gt=state.country==='GT';
  const years=[]; for(let y=2027;y>=1990;y--)years.push(String(y));
  return [
    field('tipoVehiculo','Tipo de vehículo','select',gt?['Automóvil','Camioneta / SUV','Pickup','Motocicleta','Panel / camión liviano','Microbús hasta 9 pasajeros','Camión pesado','Cabezal','Transporte por plataforma']:['Automóvil','Camioneta / SUV','Pickup','Motocicleta','Vehículo comercial','Plataforma / aplicación','Otro / requiere revisión'],'w6'),
    field('usoVehiculo','Uso','select',gt?['Particular','Comercial','Transporte por plataforma']:['Particular','Comercial','Plataforma / aplicación','Otro / requiere revisión'],'w6'),
    '<div class="field w6"><label>Marca</label><div class="combo-wrap"><input id="s496Brand" role="combobox" aria-expanded="false" aria-controls="s496BrandList" autocomplete="off" value="'+esc(state.form.marca||'')+'" placeholder="Escribe para buscar"><div id="s496BrandList" class="combo-list" role="listbox"></div></div><button id="s496BrandFallback" class="fallback-link" type="button">No encuentro mi marca</button></div>',
    '<div class="field w6"><label>Línea / modelo</label><div class="combo-wrap"><input id="s496Model" role="combobox" aria-expanded="false" aria-controls="s496ModelList" autocomplete="off" value="'+esc(state.form.lineaModelo||'')+'" placeholder="Selecciona primero la marca"><div id="s496ModelList" class="combo-list" role="listbox"></div></div><button id="s496ModelFallback" class="fallback-link" type="button">No encuentro mi línea / modelo</button></div>',
    field('anioModelo','Año','select',years,''),
    field('valorAsegurado','Valor aproximado','number',[],'','Referencia del riesgo; no calcula una prima en esta vista LAB.'),
    field('conductorJoven','Conductor joven / condición aplicable','select',['No','Sí','No aplica'],''),
    field('equipoEspecial','Equipo especial','select',['No','Sí / requiere declarar'],''),
    field('coberturaObjetivo','Tipo de protección que buscas','select',['Cobertura amplia','Daños a terceros / RC','Robo','Quiero revisar opciones'],'w6'),
    field('formaPago','Cómo prefieres pagar','select',['Contado','Cuotas / fraccionamiento','Quiero revisar opciones'],'w6'),
    field('prioridad','¿Qué pesa más en tu decisión?','select',['Equilibrio entre precio y protección','Cobertura','Deducible','Asistencia / servicio','Forma de pago'],'w12')
  ].join('');
}
function healthFields(){
  return [
    field('modalidad','Modalidad','select',['Individual','Familiar'],'w6'),
    field('titularDob','Fecha de nacimiento del titular','date',[],'w6'),
    field('generoTitular','Variable tarifaria de género, si la fuente la requiere','select',['Femenino','Masculino','Prefiero revisar con asesor'],'w6'),
    field('conyuge','¿Incluye cónyuge?','select',['No','Sí'],'w6'),
    ...(state.form.conyuge==='Sí'?[field('spouseDob','Fecha de nacimiento del cónyuge','date',[],'w6')]:[]),
    field('hijos','Cantidad de hijos / dependientes','number',[],'w6'),
    field('maternidad','¿Quieres revisar maternidad?','select',['No','Sí / revisar aplicabilidad'],''),
    field('dental','¿Quieres revisar dental?','select',['No','Sí'],''),
    field('territorio','Territorio','select',state.country==='GT'?['Guatemala','Guatemala + internacional','Revisar territorio']:['Colombia','Colombia + internacional','Revisar territorio'],''),
    field('prioridad','¿Qué pesa más en tu decisión?','select',['Red / acceso','Costo','Deducible / copago','Cobertura','Beneficios'],'w12')
  ].join('');
}
function genericFields(){
  if(state.route==='home')return [
    field('tipoInmueble','Tipo de inmueble','select',['Casa','Apartamento','Otro / revisar'],'w6'),
    field('usoInmueble','Uso','select',['Vivienda propia','Arrendada','Segunda vivienda','Otro / revisar'],'w6'),
    field('valorEstructura','Valor aproximado de estructura','number',[],'w6'),
    field('valorContenido','Valor aproximado de contenido','number',[],'w6'),
    field('prioridad','Prioridad principal','select',['Estructura y contenido','Responsabilidad','Asistencias','Costo'],'w12')
  ].join('');
  if(state.route==='life')return [
    field('momentoVida','Momento de vida','select',['Empiezo mi camino','Familia en crecimiento','Patrimonio consolidado','Trabajo por mi cuenta'],'w6'),
    field('dependientes','Personas que dependen de ti','number',[],'w6'),
    field('ingreso','Ingreso mensual a proteger','number',[],'w6'),
    field('horizonte','Horizonte que quieres revisar','select',['1–5 años','6–10 años','Más de 10 años','No estoy seguro'],'w6'),
    field('prioridad','Prioridad principal','select',['Continuidad económica','Protección familiar','Costo','Flexibilidad'],'w12')
  ].join('');
  if(state.route==='business')return [
    field('sector','Sector / actividad','select',['Servicios','Comercio','Industria / manufactura','Logística / transporte','Construcción / proyectos','Profesional / oficina','Otro / revisar'],'w6'),
    field('tamano','Tamaño','select',['Microempresa','Pequeña empresa','Mediana empresa','Corporativo'],'w6'),
    field('empleados','Personas / colaboradores','number',[],'w6'),
    field('valorActivos','Valor aproximado de activos','number',[],'w6'),
    field('exposicion','Exposición principal','select',['Patrimonio / activos','Responsabilidad frente a terceros','Continuidad','Personas / colaboradores','Ciber / datos','No estoy seguro'],'w12')
  ].join('');
  if(state.route==='cargo'){
    const base=[
      field('rolCadena','Rol en la cadena','select',['Transportador','Generador / propietario de carga','Operador logístico','Almacenamiento','Importador / exportador'],'w6'),
      field('unidades','Unidades / vehículos','number',[],'w6'),
      field('carga','Tipo de carga','select',['Mercancía general','Alimentos / perecederos','Maquinaria / equipo','Carga de alto valor','Otra / revisar'],'w6'),
      field('trayecto','Alcance del trayecto','select',state.country==='GT'?['Guatemala','Centroamérica','Mixto / revisar']:['Colombia','Regional / internacional','Mixto / revisar'],'w6')
    ];
    if(state.country==='CO')base.push(
      field('coverageModeNeed','¿Qué necesitas proteger?','select',['Un despacho específico','Un programa anual','Quiero orientación'],'w6'),
      field('transportModePrimary','Medio principal','select',['Terrestre / carretera','Aéreo','Marítimo','Multimodal','Otro / revisar'],'w6'),
      field('origin','Origen','text',[],'w6'),
      field('destination','Destino','text',[],'w6'),
      field('valueToProtect','Valor a proteger','number',[],'w6'),
      field('maxValuePerShipment','Máximo por despacho','number',[],'w6'),
      field('annualMovementBudget','Movimiento anual estimado','number',[],'w12')
    );
    base.push(
      field('punto','Dónde se concentra la exposición','select',['Origen / cargue','Tránsito','Nodos / transferencias','Almacenamiento','Destino / entrega'],'w6'),
      field('valorCarga','Valor aproximado por despacho','number',[],'w6'),
      field('prioridad','Prioridad principal','select',['Carga y mercancía','Responsabilidad','Continuidad','Costo'],'w12')
    );
    return base.join('');
  }
  return otherFields();
}
function otherFields(){
  const kind=state.form.orientacionRuta||'';
  const base=[
    field('queProtege','¿Qué quieres proteger?','select',['Una persona / familia','Un vehículo / movilidad','Una vivienda','Una empresa / operación','Carga / transporte','Un contrato / proyecto','Revisar una póliza existente','No sé todavía'],'w6'),
    field('queCambio','¿Qué cambió?','select',['Compré / adquirí algo','Mi familia cambió','Mi empresa creció o cambió','Tengo varias pólizas y quiero ordenar','Tengo una obligación o contrato','Solo quiero entender mis opciones'],'w6')
  ];
  if(kind==='contrato')base.push(
    field('tipoContrato','Tipo de obligación','select',['Cumplimiento contractual','Obra / construcción','Suministro','Servicios','Otra / revisar'],'w6'),
    field('monto','Monto de la obligación','number',[],'w6'),
    field('vigencia','Vigencia estimada','select',['Hasta 6 meses','7–12 meses','13–24 meses','Más de 24 meses'],'w6'),
    field('prioridad','Prioridad principal','select',['Amparos / alcance','Requisitos / contragarantías','Vigencia','Costo total'],'w6')
  );
  if(kind==='revision')base.push(
    field('ramoActual','¿Qué quieres revisar?','select',state.country==='GT'?['Auto / movilidad','Gastos Médicos','Vida','Hogar','Empresa / corporativo']:['Autos / automotores','Seguro / póliza de salud','Vida','Hogar / multirriesgo','Empresa / corporativo'],'w6'),
    field('renovacion','Fecha de renovación','date',[],'w6'),
    field('primaActual','Prima aproximada actual','number',[],'w6'),
    field('motivo','¿Qué cambió?','select',['Precio / prima','Cobertura','Deducible','Servicio','Datos del riesgo','Quiero comparar alternativas'],'w6')
  );
  return base.join('');
}
function intakeHtml(){
  if(state.route==='vehicle')return vehicleFields();
  if(state.route==='health')return healthFields();
  return genericFields();
}
function updateDerivedRoute(){
  if(state.route!=='other')return;
  const qp=state.form.queProtege||'';
  state.form.orientacionRuta=qp==='Un contrato / proyecto'?'contrato':qp==='Revisar una póliza existente'?'revision':'';
}
async function getCatalog(op,args={}){
  const r=await fetch(API+'?'+qp({op,...args}),{headers:{accept:'application/json'}});
  const j=await r.json(); if(!r.ok||!j.ok)throw new Error(j.code||'CATALOG_UNAVAILABLE'); return j;
}
async function ensureBrands(){
  if(state.brands.length)return;
  try{state.brands=(await getCatalog('brands',{vehicleClass:'AUTO_LIGHT',limit:200})).items||[]}catch{state.brands=[]}
}
async function ensureModels(brandId){
  try{state.models=(await getCatalog('models',{vehicleClass:'AUTO_LIGHT',brandId,limit:200})).items||[]}catch{state.models=[]}
}
function openList(list,input){list.classList.add('open');input.setAttribute('aria-expanded','true')}
function closeList(list,input){list.classList.remove('open');input.setAttribute('aria-expanded','false')}
async function bindVehicleCombos(){
  const bi=q('#s496Brand'),bl=q('#s496BrandList'),mi=q('#s496Model'),ml=q('#s496ModelList');
  if(!bi||!bl||!mi||!ml)return;
  await ensureBrands();
  const renderBrands=()=>{
    const n=norm(bi.value);const rows=state.brands.filter(x=>!n||norm(x.label).includes(n)).slice(0,70);
    bl.innerHTML=rows.map(x=>'<div class="combo-opt" role="option" data-id="'+esc(x.brandId)+'" data-label="'+esc(x.label)+'">'+esc(x.label)+'</div>').join('');
    openList(bl,bi);
  };
  const renderModels=()=>{
    const n=norm(mi.value);const rows=state.models.filter(x=>!n||norm(x.label).includes(n)).slice(0,90);
    ml.innerHTML=rows.map(x=>'<div class="combo-opt" role="option" data-id="'+esc(x.modelId)+'" data-label="'+esc(x.label)+'">'+esc(x.label)+'</div>').join('');
    openList(ml,mi);
  };
  bi.addEventListener('focus',renderBrands);bi.addEventListener('input',renderBrands);
  bl.addEventListener('mousedown',async e=>{
    e.preventDefault();const x=e.target.closest('[data-id]');if(!x)return;
    state.brandId=x.dataset.id;state.form.marca=x.dataset.label;bi.value=x.dataset.label;closeList(bl,bi);
    state.form.lineaModelo='';mi.value='';await ensureModels(state.brandId);renderModels();mi.focus();syncVisual();
  });
  mi.addEventListener('focus',()=>{if(state.models.length)renderModels()});mi.addEventListener('input',renderModels);
  ml.addEventListener('mousedown',e=>{
    e.preventDefault();const x=e.target.closest('[data-id]');if(!x)return;
    state.form.lineaModelo=x.dataset.label;mi.value=x.dataset.label;closeList(ml,mi);syncVisual();
  });
}
function bindFields(){
  qa('[data-s496-field]').forEach(el=>{
    const save=()=>{
      state.form[el.dataset.s496Field]=el.value;
      updateDerivedRoute();
      if(state.route==='health'&&el.dataset.s496Field==='conyuge')renderIntake();
      else if(state.route==='other'&&el.dataset.s496Field==='queProtege')renderIntake();
      syncVisual();
    };
    el.addEventListener('input',save);el.addEventListener('change',save);
  });
  bindVehicleCombos();
  q('#s496BrandFallback')?.addEventListener('click',()=>{state.mode='assisted';activateAssisted();});
  q('#s496ModelFallback')?.addEventListener('click',()=>{state.mode='assisted';activateAssisted();});
}
function activateAssisted(){
  q('#assistTab')?.click();
  setTimeout(()=>{state.mode='assisted';syncVisual();renderStatus();},0);
}
function renderStatus(){
  const [label,cls]=getStatus();
  let el=q('#s496Status');
  if(!el){
    el=document.createElement('div');el.id='s496Status';
    const title=q('#formTitle');title?.insertAdjacentElement('afterend',el);
  }
  el.className='s496-status '+cls;
  el.textContent=label.replaceAll('_',' ');
}
function renderIntake(){
  const row=q('#formRow');if(!row)return;
  row.className='form-row s496-form';
  row.innerHTML=intakeHtml()+
    '<div class="s496-actions"><button type="button" class="s496-back">← Volver</button><button type="button" class="s496-next">Revisar opciones →</button></div>';
  const title=q('#formTitle');if(title)title.textContent='2. '+(INTAKE[state.route]?.title||INTAKE.other.title);
  bindFields();renderStatus();
}
function summaryItems(){
  const labels={
    tipoVehiculo:'Vehículo',usoVehiculo:'Uso',marca:'Marca',lineaModelo:'Línea/modelo',anioModelo:'Año',valorAsegurado:'Valor',
    modalidad:'Modalidad',titularDob:'Titular',territorio:'Territorio',
    tipoInmueble:'Inmueble',usoInmueble:'Uso',valorEstructura:'Estructura',valorContenido:'Contenido',
    momentoVida:'Momento',dependientes:'Dependientes',ingreso:'Ingreso',
    sector:'Sector',tamano:'Tamaño',empleados:'Colaboradores',exposicion:'Exposición',
    rolCadena:'Rol',carga:'Carga',trayecto:'Trayecto',origin:'Origen',destination:'Destino',
    queProtege:'Necesidad',queCambio:'Cambio',tipoContrato:'Obligación',monto:'Monto',ramoActual:'Ramo',renovacion:'Renovación',
    prioridad:'Prioridad'
  };
  const entries=Object.entries(state.form).filter(([k,v])=>v!==''&&v!=null&&k!=='orientacionRuta').slice(0,12);
  return entries.map(([k,v])=>'<div><b>'+esc(labels[k]||k)+'</b><span>'+esc(v)+'</span></div>').join('')||'<div><b>Contexto</b><span>Completa los datos necesarios antes de comparar.</span></div>';
}
function renderReview(){
  const main=q('.quote-main');if(!main)return;
  let p=q('#s496Review');
  if(!p){p=document.createElement('section');p.id='s496Review';p.className='s496-review';q('.privacy',main)?.insertAdjacentElement('beforebegin',p);}
  p.hidden=state.stage!==2;
  if(state.stage===2){
    p.innerHTML='<h4>Revisa lo que nos contaste</h4><p>Esta revisión conserva tu contexto antes de pasar a alternativas. En LAB no ejecuta una cotización real.</p><div class="s496-summary">'+summaryItems()+'</div><div class="s496-actions"><button type="button" class="s496-back">← Volver a tus datos</button><button type="button" class="s496-next">Comparar opciones →</button></div>';
  }
}
function renderStage(){
  const formTitle=q('#formTitle'),row=q('#formRow'),privacy=q('.privacy'),compare=q('.compare');
  const review=q('#s496Review');
  if(state.stage===0){
    if(formTitle)formTitle.textContent='2. Elige una familia para continuar';
    if(row){row.className='form-row s496-form';row.innerHTML='<div class="s496-journey-note" style="grid-column:1/-1">Selecciona una familia. Las preguntas cambian según país, producto y tipo de riesgo.</div>';}
    q('#s496Status')?.remove(); if(review)review.hidden=true;if(compare)compare.classList.add('s496-locked');
  }else if(state.stage===1){
    renderIntake();if(review)review.hidden=true;if(compare)compare.classList.add('s496-locked');
  }else if(state.stage===2){
    if(formTitle)formTitle.textContent='2. Datos del caso preservados';
    if(row){row.className='form-row s496-form';row.innerHTML='<div class="s496-journey-note" style="grid-column:1/-1">Puedes volver y editar tus datos sin perder la necesidad seleccionada.</div>';}
    renderStatus();renderReview();if(compare)compare.classList.add('s496-locked');
  }else{
    if(formTitle)formTitle.textContent='2. Contexto listo para comparar';
    if(row){row.className='form-row s496-form';row.innerHTML='<div class="s496-actions"><button type="button" class="s496-back">← Volver a revisar</button><span class="s496-journey-note" style="margin:0">Las alternativas de esta candidata siguen siendo ilustrativas.</span></div>';}
    if(review)review.hidden=true;if(compare)compare.classList.remove('s496-locked');
  }
  if(privacy)privacy.style.display=state.stage===0?'none':'block';
  syncProgress();syncVisual();
}
function syncVisual(){
  clearTimeout(state.visualTimer);
  state.visualTimer=setTimeout(()=>{
    state.route=routeId();
    const pv=q('#productVisual');if(!pv)return;
    const consult=state.route==='other'||state.mode==='assisted';
    const special=q('#s495ConsultativePhoto',pv);
    if(consult){
      pv.dataset.s495Photo='true';
      if(special)special.hidden=false;
    }else{
      pv.dataset.s495Photo='false';
      if(special)special.hidden=true;
      const scene=q('.product-scene',pv);if(scene){scene.style.opacity='1';scene.style.visibility='visible';}
    }
    const meta=q('.scene-meta',pv),copy=q('.scene-copy p',pv);
    if(meta){
      let strong='';
      if(state.route==='vehicle'){
        strong=[state.form.marca,state.form.lineaModelo,state.form.anioModelo].filter(Boolean).join(' ')||'Vehículo / movilidad';
      }else{
        strong={home:'Hogar',health:'Salud / gastos médicos',life:'Vida / ingreso',business:'Empresa',cargo:'Transporte / carga',other:'Orientación A&S'}[state.route]||'Protección A&S';
      }
      const sub=state.route==='vehicle'?(state.form.tipoVehiculo||state.form.usoVehiculo||'Contexto del vehículo'):(state.country==='CO'?'Colombia':'Guatemala');
      meta.innerHTML='<strong>'+esc(strong)+'</strong><span>'+esc(sub)+'</span>';
    }
    if(copy){
      copy.textContent=state.route==='other'?'Te ayudamos a identificar la necesidad antes de elegir un producto.':
        state.mode==='assisted'?'Un asesor continúa contigo desde la selección y los datos compatibles que ya completaste.':
        'La imagen acompaña la familia seleccionada; la cotización real dependerá del producto y la fuente habilitada.';
    }
  },0);
}
function render(){
  state.route=routeId();
  renderStage();
}
document.body.dataset.s496='true';

document.addEventListener('click',e=>{
  const back=e.target.closest('.s496-back');
  if(back){e.preventDefault();e.stopImmediatePropagation();setStage(state.stage-1);return}
  const next=e.target.closest('.s496-next');
  if(next){e.preventDefault();e.stopImmediatePropagation();setStage(state.stage+1);if(state.stage===3)q('.compare')?.scrollIntoView({behavior:'smooth',block:'start'});return}
},true);

document.addEventListener('click',e=>{
  const fam=e.target.closest('.family[data-route]');
  if(fam){
    const next=fam.dataset.route;
    if(next!==state.route){state.form={};state.brandId='';state.models=[];}
    state.route=next;state.stage=1;
    setTimeout(render,15);
    return;
  }
  if(e.target.closest('#onlineTab')){state.mode='online';setTimeout(()=>{syncVisual();renderStatus();},10);return}
  if(e.target.closest('#assistTab')){state.mode='assisted';setTimeout(()=>{syncVisual();renderStatus();},10);return}
  const cb=e.target.closest('.country button');
  if(cb){const txt=cb.textContent.trim().toLowerCase();setTimeout(()=>setCountry(txt.startsWith('col')?'CO':'GT'),0);return}
  if(e.target.closest('.scene-edit')){state.stage=1;setTimeout(render,0);return}
  if(e.target.closest('.details')){
    setTimeout(()=>{
      qa('.alt').forEach(alt=>{
        if(alt.contains(e.target))return;
        const p=q('.s495-detail',alt),b=q('.details',alt);
        if(p&&!p.hidden){p.hidden=true;if(b){b.textContent='Ver detalles';b.setAttribute('aria-expanded','false');}}
      });
    },0);
  }
});

qa('.country button').forEach(b=>{if(b.classList.contains('active'))state.country=b.textContent.trim().toLowerCase().startsWith('col')?'CO':'GT';});
state.route=routeId();
syncProgress();
setTimeout(render,30);
})();
`;

function manifest(){const m=S495.manifest();return Object.freeze({...m,providerDeploymentAuthorized:false,cotcompRealTransportAuthorized:false,production:false});}
function routes(){return S495.routes();}
function html(){
  let out=S495.html();
  out=out.replace('<head>','<head><meta name="ays-candidate-s496" content="'+FUNCTION_NAME+'"><meta name="ays-governance" content="S496_LOCKED">');
  out=out.replace('<body','<body data-s496="true"');
  out=out.replace('</style>',CSS+'</style>');
  out=out.replace('</body>','<script data-s496-journey>'+JS.replace('__API__',CATALOG_PATH)+'</script></body>');
  return out;
}
function handler(req,res){
  S494.securityHeaders(res);
  if(req.method!=='GET'){res.set('Allow','GET');return res.status(405).send('Método no permitido.');}
  res.set('Content-Type','text/html; charset=utf-8');
  return res.status(200).send(html());
}
const cotcompPremiumJourneyPreviewS496=onRequest({
  region:REGION,timeoutSeconds:30,memory:'512MiB',maxInstances:2,concurrency:40,invoker:'public'
},handler);

module.exports=Object.freeze({
  VERSION,PROJECT_ID,REGION,FUNCTION_NAME,PARENT_FUNCTION,PARENT_VERSION,CATALOG_PATH,
  manifest,routes,html,handler,cotcompPremiumJourneyPreviewS496
});
