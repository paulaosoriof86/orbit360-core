'use strict';

// S4.96 governed LAB candidate: canonical preflight required before deployment.

const {onRequest}=require('firebase-functions/v2/https');
const S495=require('./cotcomp-premium-visual-preview-s495');
const S494=require('./cotcomp-premium-visual-preview-s494');

const VERSION='ays-cotcomp-s496b-frontend-recovery-v1.0';
const PROJECT_ID='ays-orbit-360-lab';
const REGION='us-central1';
const FUNCTION_NAME='cotcompFrontendRecoveryPreviewS496B';
const PARENT_FUNCTION='cotcompPremiumVisualPreviewS495';
const PARENT_VERSION=S495.VERSION;
const CATALOG_PATH=S494.CATALOG_PATH;

const CSS=`
/* S4.96B · FRONTEND RECOVERY. Visual parent is S4.95. */
/* Hero: bounded editorial image, never stretched by content height. */
body[data-s496b="true"] .hero{
  min-height:0;
  display:grid;
  grid-template-columns:minmax(520px,1.02fr) minmax(520px,.98fr);
  grid-template-areas:"copy media";
  gap:34px;
  align-items:center;
  padding:28px clamp(28px,4vw,58px) 72px;
  background:#0E0D10;
}
body[data-s496b="true"] .hero-media{
  position:relative;
  inset:auto;
  grid-area:media;
  width:100%;
  aspect-ratio:16/10;
  max-height:410px;
  align-self:center;
  border-radius:22px;
  overflow:hidden;
  box-shadow:0 28px 70px -42px rgba(0,0,0,.9);
  background:#17151a;
}
body[data-s496b="true"] .hero-media img{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  object-fit:cover;
  object-position:center 40%;
  transform:none;
}
body[data-s496b="true"] .hero-overlay{display:none}
body[data-s496b="true"] .hero-inner{
  grid-area:copy;
  max-width:none;
  margin:0;
  padding:34px 0 44px;
  display:block;
}
body[data-s496b="true"] .hero h1{
  font-family:'Newsreader',serif;
  font-weight:600;
  font-size:clamp(48px,4.5vw,68px);
  line-height:.92;
  letter-spacing:-.035em;
  max-width:10.5ch;
  margin:12px 0 18px;
}
body[data-s496b="true"] .hero h1 em{font-family:inherit;font-style:normal;color:#FF3150}
body[data-s496b="true"] .hero p{font-size:18px;line-height:1.55;max-width:48ch}
body[data-s496b="true"] .hero-benefits{margin-top:26px;gap:30px}
body[data-s496b="true"] .hero-benefit{font-size:13.5px;line-height:1.4}
body[data-s496b="true"] .hero-benefit svg{width:25px;height:25px}
body[data-s496b="true"] .wrap{margin-top:-38px}

/* Workspace / scale: preserve S4.95 composition, recover readable hierarchy. */
body[data-s496b="true"] .workspace{border-radius:24px;box-shadow:0 34px 90px -48px rgba(25,15,15,.5)}
body[data-s496b="true"] .ws-top{background:#fff}
body[data-s496b="true"] .mode{min-height:58px;font-size:14px;padding:0 28px}
body[data-s496b="true"] .mode small{font-size:11.5px}
body[data-s496b="true"] .progress4{padding:16px 24px}
body[data-s496b="true"] .pstep{font-size:12px;line-height:1.25;opacity:.52}
body[data-s496b="true"] .pstep.active{opacity:1;font-weight:700;color:#C40024}
body[data-s496b="true"] .pstep.done{opacity:.82}
body[data-s496b="true"] .pstep.done .pnum{background:#171412;color:#fff;border-color:#171412}
body[data-s496b="true"] .pnum{width:30px;height:30px;font-size:11.5px}
body[data-s496b="true"] .quote-zone{align-items:start;background:#fff}
body[data-s496b="true"] .quote-main{padding:22px 22px 24px;min-width:0}
body[data-s496b="true"] .section-title{font-size:20px;line-height:1.2;margin:0 0 14px}
body[data-s496b="true"] .form-title{font-size:19px;line-height:1.25;margin:20px 0 10px}
body[data-s496b="true"] .family-row{gap:10px}
body[data-s496b="true"] .family{min-height:100px;padding:12px 9px;font-size:12px}
body[data-s496b="true"] .family strong{font-size:14px}
body[data-s496b="true"] .family span:not(.icon3d){font-size:11.5px}
body[data-s496b="true"] .family .icon3d{transform:scale(1.03)}

/* Product visual is an independent editorial card; it does not inherit form height. */
body[data-s496b="true"] .product-visual{
  align-self:start;
  position:sticky;
  top:84px;
  height:auto;
  min-height:0;
  aspect-ratio:4/3;
  max-height:520px;
  border-left:1px solid var(--line);
  overflow:hidden;
  background:#eee8e1;
}
body[data-s496b="true"] .product-scene.photo-scene{
  inset:0;
  background-repeat:no-repeat;
  background-size:400% 200%;
  background-position:var(--sprite-x) var(--sprite-y);
  filter:saturate(1.02) contrast(1.02);
}
body[data-s496b="true"] .s495-consultative-photo{object-fit:cover;object-position:center 43%}
body[data-s496b="true"] .scene-copy{
  left:16px;right:16px;bottom:16px;
  padding:14px 15px;
  border-radius:14px;
  background:rgba(255,255,255,.95);
  backdrop-filter:blur(7px);
  box-shadow:0 18px 42px -30px rgba(0,0,0,.55);
}
body[data-s496b="true"] .scene-meta strong{font-size:14px}
body[data-s496b="true"] .scene-meta span{font-size:12px}
body[data-s496b="true"] .scene-copy p{font-family:'Newsreader',serif;font-size:17px;line-height:1.38}

/* Progressive intake — one coherent block at a time. */
body[data-s496b="true"] #formRow.s496-form{display:block}
body[data-s496b="true"] .s496b-intake-shell{
  border:1px solid #E6DDD4;
  border-radius:16px;
  background:linear-gradient(180deg,#fff,#FCF9F6);
  padding:18px;
  box-shadow:0 16px 36px -34px rgba(0,0,0,.45);
}
body[data-s496b="true"] .s496b-intake-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:16px}
body[data-s496b="true"] .s496b-intake-head strong{font-family:'Archivo';font-size:18px;line-height:1.2}
body[data-s496b="true"] .s496b-intake-head p{font-size:13.5px;line-height:1.5;color:#686058;margin:5px 0 0;max-width:62ch}
body[data-s496b="true"] .s496b-step-chip{flex:none;padding:7px 10px;border-radius:999px;background:#F3EEE8;color:#5D554E;font:700 10.5px/1.1 'IBM Plex Mono'}
body[data-s496b="true"] .s496b-intake-page{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 12px}
body[data-s496b="true"] .s496b-intake-page .field{min-width:0}
body[data-s496b="true"] .s496b-intake-page .field.w12{grid-column:1/-1}
body[data-s496b="true"] .s496b-intake-page .field label{display:block;font-size:12.5px;line-height:1.3;font-weight:700;color:#504943;margin:0 0 6px}
body[data-s496b="true"] .s496b-intake-page input,
body[data-s496b="true"] .s496b-intake-page select{
  width:100%;min-height:52px;border:1px solid #DCD3CB;border-radius:11px;background:#fff;
  padding:0 13px;font:500 15px/1.25 'Instrument Sans';color:#211D1A
}
body[data-s496b="true"] .s496b-intake-page input:focus,
body[data-s496b="true"] .s496b-intake-page select:focus{outline:3px solid rgba(228,0,43,.12);border-color:#E4002B}
body[data-s496b="true"] .s496-help{font-size:12px;line-height:1.4;margin-top:6px;color:#777068}
body[data-s496b="true"] .fallback-link{font-size:12px;margin-top:7px}
body[data-s496b="true"] .s496-status{display:inline-flex;margin:0 0 12px;padding:7px 10px;border-radius:999px;font:700 11px/1.1 'Instrument Sans'}
body[data-s496b="true"] .s496-status.hybrid{background:#FFF3E7;color:#754511}
body[data-s496b="true"] .s496-status.consultative{background:#F2EEF8;color:#58446F}
body[data-s496b="true"] .s496-status.more{background:#EEF5F8;color:#345E72}
body[data-s496b="true"] .s496-actions{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-top:18px}
body[data-s496b="true"] .s496-back{min-height:48px;padding:0 16px;border:1px solid #D9D0C8;background:#fff;border-radius:10px;font-size:13.5px;font-weight:750}
body[data-s496b="true"] .s496-next,
body[data-s496b="true"] .s496b-intake-next{min-height:48px;padding:0 20px;border:0;background:#E4002B;color:#fff;border-radius:10px;font-size:13.5px;font-weight:800}
body[data-s496b="true"] .s496b-validation{margin-top:10px;padding:9px 11px;border-radius:9px;background:#FFF2F4;color:#A8001D;font-size:12.5px;line-height:1.4}
body[data-s496b="true"] .privacy{font-size:12.5px;line-height:1.45;margin-top:14px}

/* Review stage */
body[data-s496b="true"] .s496-review{margin-top:12px;border:1px solid #E4DAD1;border-radius:16px;background:#fff;padding:19px}
body[data-s496b="true"] .s496-review h4{font:800 20px/1.2 'Archivo';margin:0 0 6px}
body[data-s496b="true"] .s496-review p{font-size:13.5px;line-height:1.5;color:#655D56}
body[data-s496b="true"] .s496-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
body[data-s496b="true"] .s496-summary div{border:1px solid #E9E1D9;border-radius:11px;padding:11px 12px;background:#FCFAF7}
body[data-s496b="true"] .s496-summary b{font:700 10.5px/1.2 'IBM Plex Mono';color:#8A8178}
body[data-s496b="true"] .s496-summary span{display:block;margin-top:4px;font-size:13px;line-height:1.4;font-weight:650}

/* Comparison hierarchy — richer, larger, action-led. */
body[data-s496b="true"] .compare{padding:24px 26px 26px;grid-template-columns:minmax(0,1fr) 330px;gap:18px;background:#fff}
body[data-s496b="true"] .compare.s496-locked{display:none}
body[data-s496b="true"] .compare-head{margin-bottom:14px}
body[data-s496b="true"] .compare-head h3{font-size:22px;line-height:1.2}
body[data-s496b="true"] .compare-link{font-size:13px;font-weight:800}
body[data-s496b="true"] .s496-compare-guidance{margin:0 0 14px;padding:13px 14px;border:1px solid #E6DDD4;border-radius:12px;background:#FAF7F3}
body[data-s496b="true"] .s496-compare-guidance strong{display:block;font:800 15px/1.2 'Archivo';margin-bottom:4px}
body[data-s496b="true"] .s496-compare-guidance span{font-size:12.5px;line-height:1.45;color:#655D55}
body[data-s496b="true"] .alternatives{gap:13px}
body[data-s496b="true"] .alt{
  padding:16px;border-radius:14px;border:1px solid #E4DDD6;background:#fff;
  box-shadow:0 16px 38px -34px rgba(0,0,0,.46)
}
body[data-s496b="true"] .alt h4{font-size:15px}
body[data-s496b="true"] .alt-price{font-size:23px}
body[data-s496b="true"] .alt-price small{font-size:11px}
body[data-s496b="true"] .checks{font-size:12.5px;line-height:1.55}
body[data-s496b="true"] .barrow{font-size:11.5px}
body[data-s496b="true"] .details{min-height:44px;font-size:12.5px;margin-top:12px}
body[data-s496b="true"] .s496-select-alt{width:100%;min-height:44px;margin-top:9px;border:1px solid #D9D0C8;border-radius:10px;background:#fff;color:#2C2622;font:800 12.5px/1.2 'Instrument Sans'}
body[data-s496b="true"] .s496-select-alt:hover{border-color:#E4002B;color:#C40024}
body[data-s496b="true"] .alt.s496-selected{border-color:#E4002B;box-shadow:0 0 0 2px rgba(228,0,43,.08),0 18px 42px -34px rgba(0,0,0,.5)}
body[data-s496b="true"] .alt.s496-selected .s496-select-alt{background:#E4002B;color:#fff;border-color:#E4002B}
body[data-s496b="true"] .s495-detail{font-size:12.5px;line-height:1.5;padding:12px 13px;background:#FBF8F4}
body[data-s496b="true"] .rec{padding:19px;border-radius:15px;background:linear-gradient(180deg,#FFF4F6,#FFF)}
body[data-s496b="true"] .rec-ribbon{font-size:20px}
body[data-s496b="true"] .rec p{font-size:13.5px;line-height:1.55}
body[data-s496b="true"] .rec-list{font-size:12.5px;gap:9px}
body[data-s496b="true"] .rec-btn{min-height:46px;font-size:13px}
body[data-s496b="true"] .s496-selection-note{margin:12px 0 0;padding:11px 13px;border-radius:10px;background:#F7F3EF;border:1px solid #E7DDD4;font-size:12.5px;line-height:1.45}

/* Bottom action hierarchy — no tiny utility strip. */
body[data-s496b="true"] .utility{display:none;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:18px 22px 22px;border-top:1px solid var(--line);background:#FAF7F3}
body[data-s496b-stage="3"] .utility{display:grid}
body[data-s496b="true"] .s496b-util{
  min-height:118px;padding:16px;border:1px solid #E3DBD3;border-radius:14px;background:#fff;
  text-align:left;color:#241F1B;display:flex;flex-direction:column;align-items:flex-start;justify-content:space-between;
  box-shadow:0 14px 30px -30px rgba(0,0,0,.45)
}
body[data-s496b="true"] .s496b-util .icon{font-size:20px;line-height:1}
body[data-s496b="true"] .s496b-util strong{display:block;font:800 15px/1.2 'Archivo';margin:9px 0 4px}
body[data-s496b="true"] .s496b-util span{font-size:12.5px;line-height:1.45;color:#655D55}
body[data-s496b="true"] .s496b-util b{margin-top:10px;font-size:12.5px;color:#C40024}
body[data-s496b="true"] .s496b-util.primary{background:#171412;color:#fff;border-color:#171412}
body[data-s496b="true"] .s496b-util.primary span{color:#EDE7E0}
body[data-s496b="true"] .s496b-util.primary b{color:#FF6074}
body[data-s496b="true"] .labnote{font-size:11.5px;line-height:1.45;padding-bottom:18px}

@media(max-width:1180px){
  body[data-s496b="true"] .hero{grid-template-columns:minmax(440px,1fr) minmax(420px,.9fr);gap:24px;padding-left:28px;padding-right:28px}
  body[data-s496b="true"] .hero h1{font-size:clamp(46px,5vw,60px)}
  body[data-s496b="true"] .product-visual{position:relative;top:auto;aspect-ratio:16/8.5;max-height:430px;border-left:0;border-top:1px solid var(--line)}
  body[data-s496b="true"] .compare{grid-template-columns:1fr}
  body[data-s496b="true"] .rec{order:-1}
}
@media(max-width:900px){
  body[data-s496b="true"] .hero{grid-template-columns:1fr;grid-template-areas:"copy" "media";padding:28px 24px 66px;gap:10px}
  body[data-s496b="true"] .hero-inner{padding:24px 0 16px}
  body[data-s496b="true"] .hero-media{max-height:none;aspect-ratio:16/9}
  body[data-s496b="true"] .hero h1{max-width:9ch}
  body[data-s496b="true"] .s496-summary{grid-template-columns:repeat(2,minmax(0,1fr))}
  body[data-s496b="true"] .utility{grid-template-columns:1fr}
}
@media(max-width:620px){
  body[data-s496b="true"] .hero{padding-left:18px;padding-right:18px}
  body[data-s496b="true"] .hero h1{font-size:44px}
  body[data-s496b="true"] .hero p{font-size:16px}
  body[data-s496b="true"] .hero-benefits{gap:16px}
  body[data-s496b="true"] .s496b-intake-page{grid-template-columns:1fr}
  body[data-s496b="true"] .s496-summary{grid-template-columns:1fr}
  body[data-s496b="true"] .compare{padding:18px 14px 20px}
}
`

const JS=`
(()=>{
'use strict';
const API='__API__';
const state={
  stage:0,
  intakePage:0,
  intakeTotal:1,
  route:'vehicle',
  country:'GT',
  mode:'online',
  form:{},
  brands:[],
  models:[],
  brandId:'',
  visualTimer:null,
  formRepairing:false,
  visualRepairing:false
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
  state.form={};state.brandId='';state.models=[];state.stage=0;state.intakePage=0;
  qa('.country button').forEach(b=>b.classList.toggle('active',b.textContent.trim().toLowerCase().startsWith(state.country==='CO'?'col':'gua')));
  render();
}
function setStage(n){
  state.stage=Math.max(0,Math.min(3,Number(n)||0));
  document.body.dataset.s496bStage=String(state.stage);
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
    '<div class="s496-form-group"><strong>Vehículo y uso</strong><span>Primero ubicamos el tipo de riesgo; después completamos identificación y condiciones.</span></div>',
    field('tipoVehiculo','Tipo de vehículo','select',gt?['Automóvil','Camioneta / SUV','Pickup','Motocicleta','Panel / camión liviano','Microbús hasta 9 pasajeros','Camión pesado','Cabezal','Transporte por plataforma']:['Automóvil','Camioneta / SUV','Pickup','Motocicleta','Vehículo comercial','Plataforma / aplicación','Otro / requiere revisión'],'w6'),
    field('usoVehiculo','Uso','select',gt?['Particular','Comercial','Transporte por plataforma']:['Particular','Comercial','Plataforma / aplicación','Otro / requiere revisión'],'w6'),
    '<div class="s496-form-group"><strong>Identificación del vehículo</strong><span>Marca → Línea/modelo → Año se conserva como patrón principal, acompañado del valor del riesgo.</span></div>',
    '<div class="field w6"><label>Marca</label><div class="combo-wrap"><input id="s496Brand" role="combobox" aria-expanded="false" aria-controls="s496BrandList" autocomplete="off" value="'+esc(state.form.marca||'')+'" placeholder="Escribe para buscar"><div id="s496BrandList" class="combo-list" role="listbox"></div></div><button id="s496BrandFallback" class="fallback-link" type="button">No encuentro mi marca</button></div>',
    '<div class="field w6"><label>Línea / modelo</label><div class="combo-wrap"><input id="s496Model" role="combobox" aria-expanded="false" aria-controls="s496ModelList" autocomplete="off" value="'+esc(state.form.lineaModelo||'')+'" placeholder="Selecciona primero la marca"><div id="s496ModelList" class="combo-list" role="listbox"></div></div><button id="s496ModelFallback" class="fallback-link" type="button">No encuentro mi línea / modelo</button></div>',
    field('anioModelo','Año','select',years,''),
    field('valorAsegurado','Valor aproximado','number',[],'','Referencia del riesgo; no calcula una prima en esta vista LAB.'),
    '<div class="s496-form-group"><strong>Condiciones y preferencias</strong><span>Estas respuestas permiten preparar una cotización o decidir cuándo corresponde acompañamiento.</span></div>',
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
  const publicLabel=label==='HYBRID_REQUIRED'?'Disponible con validación':label==='CONSULTATIVE_REQUIRED'?'Con acompañamiento A&S':'Te orientamos';
  let el=q('#s496Status');
  if(!el){
    el=document.createElement('div');el.id='s496Status';
    const title=q('#formTitle');title?.insertAdjacentElement('afterend',el);
  }
  el.className='s496-status '+cls;
  el.textContent=publicLabel;
}
const SECTION_TITLES={
  health:['A quién quieres proteger','Tu familia y dependientes','Alcance y prioridades'],
  home:['El inmueble','Valores y prioridad'],
  life:['Tu situación','Protección e horizonte'],
  business:['Cómo opera tu empresa','Exposición y prioridad'],
  cargo:['Tu operación','Ruta y valores','Alcance y prioridad'],
  other:['Qué necesitas resolver','Datos para orientarte']
};
function collectIntakePages(){
  const temp=document.createElement('div');temp.innerHTML=intakeHtml();
  const children=Array.from(temp.children);
  const explicit=children.some(x=>x.classList.contains('s496-form-group'));
  const pages=[];
  if(explicit){
    let current=null;
    for(const node of children){
      if(node.classList.contains('s496-form-group')){
        if(current)pages.push(current);
        current={title:q('strong',node)?.textContent||'Datos',subtitle:q('span',node)?.textContent||'',nodes:[]};
      }else{
        if(!current)current={title:'Datos',subtitle:'Completa la información necesaria para continuar.',nodes:[]};
        current.nodes.push(node.outerHTML);
      }
    }
    if(current)pages.push(current);
  }else{
    const fields=children.filter(x=>x.classList.contains('field'));
    const titles=SECTION_TITLES[state.route]||['Datos principales','Datos complementarios','Prioridad'];
    const chunk=Math.max(2,Math.ceil(fields.length/Math.min(3,titles.length)));
    for(let i=0;i<fields.length;i+=chunk){
      const idx=pages.length;
      pages.push({
        title:titles[idx]||('Datos '+(idx+1)),
        subtitle:idx===0?'Empecemos por lo esencial. Puedes volver sin perder lo ya completado.':'Completa este bloque para avanzar con el mismo contexto.',
        nodes:fields.slice(i,i+chunk).map(x=>x.outerHTML)
      });
    }
  }
  return pages.length?pages:[{title:'Datos',subtitle:'Completa lo necesario para continuar.',nodes:[]}];
}
function renderIntake(){
  const row=q('#formRow');if(!row)return;
  const pages=collectIntakePages();
  state.intakeTotal=pages.length;
  state.intakePage=Math.max(0,Math.min(state.intakePage,pages.length-1));
  const page=pages[state.intakePage];
  row.className='form-row s496-form';
  row.innerHTML='<span data-s496-intake-root hidden></span><section class="s496b-intake-shell">'+
    '<div class="s496b-intake-head"><div><strong>'+esc(page.title)+'</strong><p>'+esc(page.subtitle)+'</p></div><span class="s496b-step-chip">Datos '+(state.intakePage+1)+' de '+pages.length+'</span></div>'+
    '<div class="s496b-intake-page">'+page.nodes.join('')+'</div>'+
    '<div id="s496bValidation" class="s496b-validation" hidden></div>'+
    '<div class="s496-actions"><button type="button" class="s496-back">'+(state.intakePage>0?'← Bloque anterior':'← Volver')+'</button><button type="button" class="s496b-intake-next">'+(state.intakePage<pages.length-1?'Continuar →':'Revisar opciones →')+'</button></div></section>';
  const title=q('#formTitle');if(title)title.textContent='2. '+(INTAKE[state.route]?.title||INTAKE.other.title);
  bindFields();renderStatus();
}
function validateCurrentIntake(){
  const controls=qa('.s496b-intake-page input,.s496b-intake-page select');
  const missing=controls.find(el=>!String(el.value||'').trim());
  const box=q('#s496bValidation');
  if(missing){
    if(box){box.hidden=false;box.textContent='Completa los datos de este bloque para continuar. Si no encuentras una marca o línea, usa la ruta de acompañamiento.'}
    missing.focus();
    return false;
  }
  if(box)box.hidden=true;
  return true;
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
function enhanceUtility(){
  const utility=q('.utility');if(!utility||utility.dataset.s496bEnhanced)return;
  utility.dataset.s496bEnhanced='true';
  utility.innerHTML=
    '<button class="s496b-util" type="button" data-s496b-action="differences"><span class="icon">↔</span><div><strong>Ver las diferencias clave</strong><span>Profundiza en coberturas, deducibles, asistencias y condiciones comparables.</span></div><b>Abrir comparación detallada →</b></button>'+
    '<button class="s496b-util" type="button" data-s496b-action="recommendation"><span class="icon">◎</span><div><strong>Entender la recomendación</strong><span>Revisa por qué una alternativa puede encajar mejor y qué trade-offs conviene validar.</span></div><b>Ver criterio A&amp;S →</b></button>'+
    '<button class="s496b-util primary" type="button" data-s496b-action="advisor"><span class="icon">◌</span><div><strong>Continuar con un asesor</strong><span>Conserva el contexto del recorrido para no empezar nuevamente.</span></div><b>Hablar con A&amp;S →</b></button>';
}
function ensureComparisonHierarchy(){
  const compare=q('.compare');if(!compare)return;
  enhanceUtility();
  const alternatives=q('#alternatives',compare)||q('.alternatives',compare);
  if(alternatives&&!q('#s496CompareGuidance',compare)){
    const guide=document.createElement('div');guide.id='s496CompareGuidance';guide.className='s496-compare-guidance';
    guide.innerHTML='<strong>Compara primero lo que realmente cambia</strong><span>Abre el detalle de una alternativa a la vez. La selección aquí es solo visual en LAB y no crea una Selection real.</span>';
    alternatives.insertAdjacentElement('beforebegin',guide);
  }
  qa('.alt',compare).forEach((alt,i)=>{
    let detail=q('.details',alt);
    if(!detail){
      detail=document.createElement('button');detail.type='button';detail.className='details';detail.textContent='Ver detalles';detail.setAttribute('aria-expanded','false');alt.appendChild(detail);
    }
    let choose=q('.s496-select-alt',alt);
    if(!choose){
      choose=document.createElement('button');choose.type='button';choose.className='s496-select-alt';choose.dataset.s496Select=String(i);choose.textContent='Elegir esta alternativa';alt.appendChild(choose);
    }
  });
  const rec=q('.rec',compare);
  if(rec&&!q('.rec-btn',rec)){
    const b=document.createElement('button');b.type='button';b.className='rec-btn';b.textContent='Ver recomendación completa →';b.setAttribute('aria-expanded','false');rec.appendChild(b);
  }
}
function selectAlternative(button){
  const compare=q('.compare');if(!compare)return;
  const alt=button.closest('.alt');if(!alt)return;
  qa('.alt',compare).forEach(x=>{
    const on=x===alt;x.classList.toggle('s496-selected',on);
    const b=q('.s496-select-alt',x);if(b)b.textContent=on?'Alternativa elegida ✓':'Elegir esta alternativa';
  });
  let note=q('#s496SelectionNote',compare);
  if(!note){note=document.createElement('div');note.id='s496SelectionNote';note.className='s496-selection-note';(q('#alternatives',compare)||q('.alternatives',compare))?.insertAdjacentElement('afterend',note);}
  if(note)note.textContent='Selección visual LAB registrada en esta pantalla. No se envían datos ni se crea Selection hasta que el transporte real sea autorizado.';
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
    if(review)review.hidden=true;if(compare){compare.classList.remove('s496-locked');ensureComparisonHierarchy();}
  }
  if(privacy)privacy.style.display=state.stage===0?'none':'block';
  syncProgress();syncVisual();
}
function syncVisual(){
  clearTimeout(state.visualTimer);
  state.visualTimer=setTimeout(()=>{
    state.route=routeId();
    const pv=q('#productVisual');if(!pv)return;
    const consult=state.route==='other';
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
        state.mode==='assisted'?'Conservamos tu contexto para que un asesor continúe contigo sin reiniciar el recorrido.':
        'Esta escena corresponde a la familia seleccionada; las alternativas reales dependen del producto y la fuente habilitada.';
    }
  },0);
}
function installOwnershipGuards(){
  const row=q('#formRow');
  if(row&&!row.dataset.s496Observer){
    row.dataset.s496Observer='true';
    const observer=new MutationObserver(()=>{
      if(state.stage!==1||state.formRepairing)return;
      if(q('[data-s496-intake-root]',row))return;
      state.formRepairing=true;
      queueMicrotask(()=>{
        try{renderIntake();syncVisual();}finally{state.formRepairing=false}
      });
    });
    observer.observe(row,{childList:true});
  }
  const pv=q('#productVisual');
  if(pv&&!pv.dataset.s496Observer){
    pv.dataset.s496Observer='true';
    const observer=new MutationObserver(()=>{
      if(state.visualRepairing)return;
      state.visualRepairing=true;
      queueMicrotask(()=>{
        try{syncVisual();}finally{state.visualRepairing=false}
      });
    });
    observer.observe(pv,{childList:true});
  }
}
function render(){
  state.route=routeId();
  renderStage();
}
document.body.dataset.s496='true';
document.body.dataset.s496b='true';
document.body.dataset.s496bStage=String(state.stage);
q('.eyebrow')&&(q('.eyebrow').textContent='COTIZAR Y COMPARAR · A&S');
installOwnershipGuards();

document.addEventListener('click',e=>{
  const intakeNext=e.target.closest('.s496b-intake-next');
  if(intakeNext){
    e.preventDefault();e.stopImmediatePropagation();
    if(!validateCurrentIntake())return;
    if(state.intakePage<state.intakeTotal-1){state.intakePage++;renderIntake();syncVisual();}
    else{setStage(2);}
    return;
  }
  const back=e.target.closest('.s496-back');
  if(back){
    e.preventDefault();e.stopImmediatePropagation();
    if(state.stage===1&&state.intakePage>0){state.intakePage--;renderIntake();syncVisual();}
    else{setStage(state.stage-1);}
    return;
  }
  const next=e.target.closest('.s496-next');
  if(next){e.preventDefault();e.stopImmediatePropagation();setStage(state.stage+1);if(state.stage===3)q('.compare')?.scrollIntoView({behavior:'smooth',block:'start'});return}
},true);

document.addEventListener('click',e=>{
  const fam=e.target.closest('.family[data-route]');
  if(fam){
    const next=fam.dataset.route;
    if(next!==state.route){state.form={};state.brandId='';state.models=[];}
    state.route=next;state.stage=1;state.intakePage=0;
    document.body.dataset.s496bStage='1';
    setTimeout(render,15);
    return;
  }
  if(e.target.closest('#onlineTab')){state.mode='online';setTimeout(()=>{syncVisual();renderStatus();},10);return}
  if(e.target.closest('#assistTab')){state.mode='assisted';setTimeout(()=>{syncVisual();renderStatus();},10);return}
  const cb=e.target.closest('.country button');
  if(cb){const txt=cb.textContent.trim().toLowerCase();setTimeout(()=>setCountry(txt.startsWith('col')?'CO':'GT'),0);return}
  if(e.target.closest('.scene-edit')){state.stage=1;setTimeout(render,0);return}
  const choose=e.target.closest('.s496-select-alt');
  if(choose){e.preventDefault();selectAlternative(choose);return}
  const util=e.target.closest('[data-s496b-action]');
  if(util){
    const action=util.dataset.s496bAction;
    if(action==='differences'){q('.compare-link')?.click();q('.compare')?.scrollIntoView({behavior:'smooth',block:'start'});}
    if(action==='recommendation'){q('.rec-btn')?.click();q('.rec')?.scrollIntoView({behavior:'smooth',block:'center'});}
    if(action==='advisor'){q('.advisor')?.click();}
    return;
  }
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
document.body.dataset.s496bStage=String(state.stage);
enhanceUtility();
syncProgress();
setTimeout(render,30);
setTimeout(()=>{installOwnershipGuards();if(state.stage===1&&!q('[data-s496-intake-root]',q('#formRow')))renderIntake();syncVisual();},180);
setTimeout(()=>{if(state.stage===1&&!q('[data-s496-intake-root]',q('#formRow')))renderIntake();syncVisual();},650);
})();
`;

function manifest(){const m=S495.manifest();return Object.freeze({...m,providerDeploymentAuthorized:false,cotcompRealTransportAuthorized:false,production:false});}
function routes(){return S495.routes();}
function html(){
  let out=S495.html();
  out=out.replace('<head>','<head><meta name="ays-candidate-s496b" content="'+FUNCTION_NAME+'"><meta name="ays-governance" content="S496B_FRONTEND_RECOVERY_LOCKED">');
  out=out.replace('<body','<body data-s496b="true"');
  out=out.replace('</style>',CSS+'</style>');
  out=out.replace('</body>','<script data-s496b-recovery>'+JS.replace('__API__',CATALOG_PATH)+'</script></body>');
  return out;
}
function handler(req,res){
  S494.securityHeaders(res);
  if(req.method!=='GET'){res.set('Allow','GET');return res.status(405).send('Método no permitido.');}
  res.set('Content-Type','text/html; charset=utf-8');
  return res.status(200).send(html());
}
const cotcompFrontendRecoveryPreviewS496B=onRequest({
  region:REGION,timeoutSeconds:30,memory:'512MiB',maxInstances:2,concurrency:40,invoker:'public'
},handler);

module.exports=Object.freeze({
  VERSION,PROJECT_ID,REGION,FUNCTION_NAME,PARENT_FUNCTION,PARENT_VERSION,CATALOG_PATH,
  manifest,routes,html,handler,cotcompFrontendRecoveryPreviewS496B
});
