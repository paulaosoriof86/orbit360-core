'use strict';

const fs=require('fs');
const path=require('path');
const {onRequest}=require('firebase-functions/v2/https');
const S494=require('./cotcomp-premium-visual-preview-s494');
const S495=require('./cotcomp-premium-visual-preview-s495');

const VERSION='ays-cotcomp-s496-journey-intake-restoration-v1.0';
const PROJECT_ID='ays-orbit-360-lab';
const REGION='us-central1';
const FUNCTION_NAME='cotcompPremiumJourneyPreviewS496';
const PARENT_FUNCTION='cotcompPremiumVisualPreviewS495';
const PARENT_VERSION=S495.VERSION;
const CATALOG_PATH='/cotcompVehicleCatalogS479';
const GOVERNANCE_CONTEXT='A&S/COTCOMP_CANONICAL_CONTEXT_v1.0_2026-10-04';
const GOVERNANCE_LOCKS='A&S/COTCOMP_LOCK_MATRIX_v1.0_2026-10-04';
const PRODUCT_SPRITE='data:image/webp;base64,'+
  fs.readFileSync(path.join(__dirname,'cotcomp-s494-product-scenes.b64'),'utf8').trim();
const PRISCILA_SCENE='data:image/webp;base64,'+
  fs.readFileSync(path.join(__dirname,'cotcomp-s495-priscila-480x300.b64.00'),'utf8').trim()+
  fs.readFileSync(path.join(__dirname,'cotcomp-s495-priscila-480x300.b64.01'),'utf8').trim();

const CSS=String.raw`
/* S4.96 — journey + intake restoration over the approved visual lineage */
body[data-s496="true"]{--s496-ink:#181512;--s496-muted:#6e655c;--s496-soft:#f7f3ee;--s496-line:#e7dfd6}
body[data-s496="true"] .hero{min-height:354px}
body[data-s496="true"] .hero-media{left:56%;right:24px;top:22px;bottom:22px;border-radius:24px;overflow:hidden;box-shadow:0 30px 80px -44px rgba(0,0,0,.72)}
body[data-s496="true"] .hero-media img{object-fit:cover;object-position:50% 44%;transform:none}
body[data-s496="true"] .hero-overlay{background:linear-gradient(90deg,#0E0D10 0%,#0E0D10 42%,rgba(14,13,16,.95) 50%,rgba(14,13,16,.55) 63%,rgba(14,13,16,.12) 86%,rgba(14,13,16,.05) 100%)}
body[data-s496="true"] .hero-inner{padding-top:44px;padding-bottom:70px;grid-template-columns:minmax(0,700px) 1fr}
body[data-s496="true"] .hero h1{font-family:'Archivo',system-ui,sans-serif;font-weight:850;font-style:normal;font-size:clamp(43px,4.3vw,66px);line-height:.96;letter-spacing:-.045em;max-width:11.5ch;margin:10px 0 16px}
body[data-s496="true"] .hero h1 em{font-family:'Archivo',system-ui,sans-serif;font-style:normal;font-weight:850}
body[data-s496="true"] .hero p{font-family:'Instrument Sans',system-ui,sans-serif;font-size:16.5px;line-height:1.54;max-width:50ch}
body[data-s496="true"] .hero-benefit{font-family:'Instrument Sans',system-ui,sans-serif;font-size:12px}
body[data-s496="true"] .wrap{margin-top:-30px}
body[data-s496="true"] .pstep{cursor:default}
body[data-s496="true"] .pstep.reached{cursor:pointer}
body[data-s496="true"] .pstep.done{color:#6b6259;font-weight:650}
body[data-s496="true"] .pstep.done .pnum{background:#211d1a;color:#fff;border-color:#211d1a}
body[data-s496="true"] .pstep.current{color:var(--red2);font-weight:800}
body[data-s496="true"] .pstep.current .pnum{background:var(--red);color:#fff;border-color:var(--red)}
body[data-s496="true"] .pstep.future{color:#a59d95}
body[data-s496="true"] .quote-main{padding:18px 20px 20px}
body[data-s496="true"] .section-title{font-size:18px;margin-bottom:11px}
body[data-s496="true"] .family-row{margin-bottom:14px}
body[data-s496="true"] .form-title{font-size:18px;line-height:1.25;margin:14px 0 10px}
body[data-s496="true"] #formRow{display:block}
body[data-s496="true"] .s496-intro{border:1px solid var(--s496-line);border-radius:14px;padding:15px 16px;background:linear-gradient(135deg,#fff,#fbf7f3);font-size:13px;line-height:1.55;color:#4c443d}
body[data-s496="true"] .s496-intro strong{display:block;font-family:'Archivo';font-size:15px;color:#211d1a;margin-bottom:4px}
body[data-s496="true"] .s496-groups{display:grid;gap:12px}
body[data-s496="true"] .s496-group{border:1px solid var(--s496-line);border-radius:15px;background:#fff;padding:14px 14px 13px;box-shadow:0 15px 35px -34px rgba(0,0,0,.55)}
body[data-s496="true"] .s496-group-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:11px}
body[data-s496="true"] .s496-group-head h4{font-family:'Archivo';font-size:14.5px;line-height:1.22;margin:0;color:#201b18}
body[data-s496="true"] .s496-group-head span{font-family:'IBM Plex Mono';font-size:8.5px;letter-spacing:.08em;color:#8a8179;text-transform:uppercase}
body[data-s496="true"] .s496-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
body[data-s496="true"] .s496-field{min-width:0}
body[data-s496="true"] .s496-field.wide{grid-column:span 2}
body[data-s496="true"] .s496-field.full{grid-column:1/-1}
body[data-s496="true"] .s496-field label{display:block;font-size:11.5px;line-height:1.25;font-weight:700;color:#4a423b;margin:0 0 5px}
body[data-s496="true"] .s496-field label b{color:var(--red)}
body[data-s496="true"] .s496-field input,body[data-s496="true"] .s496-field select{width:100%;min-height:48px;border:1px solid #ddd4cb;border-radius:10px;background:#fff;padding:10px 11px;font:500 13.5px/1.25 'Instrument Sans',system-ui,sans-serif;color:#211d1a}
body[data-s496="true"] .s496-field input:focus,body[data-s496="true"] .s496-field select:focus{outline:3px solid rgba(228,0,43,.10);border-color:#c31831}
body[data-s496="true"] .s496-help{font-size:10.5px;line-height:1.38;color:#81776e;margin-top:4px}
body[data-s496="true"] .s496-chip-row{display:flex;flex-wrap:wrap;gap:6px}
body[data-s496="true"] .s496-chip{border:1px solid #ddd4cb;background:#fff;border-radius:999px;padding:8px 10px;font-size:11px;font-weight:700;color:#4a423b}
body[data-s496="true"] .s496-chip.active{background:#1c1816;color:#fff;border-color:#1c1816}
body[data-s496="true"] .s496-actions{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:12px;padding-top:12px;border-top:1px solid #eee7df}
body[data-s496="true"] .s496-actions-right{display:flex;gap:8px;align-items:center}
body[data-s496="true"] .s496-back{min-height:44px;border:1px solid #d9d0c7;background:#fff;border-radius:10px;padding:0 14px;font-weight:750;color:#4a423b}
body[data-s496="true"] .s496-next{min-height:46px;border:0;background:var(--red);color:#fff;border-radius:10px;padding:0 18px;font-weight:800}
body[data-s496="true"] .s496-mode-state{font-size:11px;line-height:1.35;color:#6d635a}
body[data-s496="true"] .s496-truth{margin-top:9px;padding:9px 11px;border-left:3px solid #b8965a;background:#fffaf0;border-radius:0 9px 9px 0;font-size:11px;line-height:1.42;color:#5d4c32}
body[data-s496="true"] .s496-truth.assisted{border-left-color:var(--red);background:#fff6f7;color:#5d353c}
body[data-s496="true"] .s496-later{margin-top:8px;font-size:10.5px;line-height:1.45;color:#766d65}
body[data-s496="true"] .s496-contact-note{font-size:10.5px;color:#7a7169;margin-top:6px}
body[data-s496="true"] .combo-wrap{position:relative}
body[data-s496="true"] .combo-list{z-index:70}
body[data-s496="true"] .product-visual{min-height:365px}
body[data-s496="true"] .product-visual .product-scene{opacity:1!important;visibility:visible!important}
body[data-s496="true"] .product-visual[data-s496-route="other"] .product-scene{opacity:0!important;visibility:hidden!important}
body[data-s496="true"] .s496-other-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 44%;z-index:0}
body[data-s496="true"] .scene-copy{z-index:4}
body[data-s496="true"] .s496-risk-badge{position:absolute;top:15px;left:15px;z-index:4;padding:7px 9px;border-radius:999px;background:rgba(255,255,255,.94);border:1px solid rgba(231,226,214,.95);font:700 10px/1.2 'Instrument Sans';color:#413a34;box-shadow:0 12px 28px -22px rgba(0,0,0,.6)}
body[data-s496="true"] .compare{background:linear-gradient(180deg,#fff,#fbf8f4)}
body[data-s496="true"] .compare[data-s496-hidden="true"]{display:none}
body[data-s496="true"] .compare-main{padding:18px 18px 20px}
body[data-s496="true"] .compare-head{align-items:flex-end;margin-bottom:10px}
body[data-s496="true"] .compare-head h3{font-family:'Archivo';font-size:19px}
body[data-s496="true"] .alternatives{gap:10px}
body[data-s496="true"] .alt{border:1px solid #e3dbd2;border-radius:15px;box-shadow:0 18px 42px -38px rgba(0,0,0,.7);overflow:hidden;background:#fff}
body[data-s496="true"] .alt-top{padding:13px 14px 9px}
body[data-s496="true"] .alt-body{padding:9px 14px 11px}
body[data-s496="true"] .details{margin:0 12px 12px;width:calc(100% - 24px);min-height:36px;border-radius:9px}
body[data-s496="true"] .s496-detail{margin:0 12px 12px;padding:11px 12px;border-radius:10px;background:#f8f4ef;border:1px solid #e7ded4;font-size:11px;line-height:1.5;color:#51483f}
body[data-s496="true"] .s496-detail[hidden]{display:none}
body[data-s496="true"] .s496-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px}
body[data-s496="true"] .s496-detail-grid div{background:#fff;border:1px solid #ebe4dc;border-radius:8px;padding:7px 8px}
body[data-s496="true"] .rec{background:linear-gradient(155deg,#181416,#29181d);color:#fff;border:0!important;padding:18px 17px!important}
body[data-s496="true"] .rec-ribbon{font-family:'Archivo';font-size:18px;color:#fff}
body[data-s496="true"] .rec p,body[data-s496="true"] .rec-item{color:#f4ede8}
body[data-s496="true"] .rec-item span:first-child{color:#ff3953}
body[data-s496="true"] .rec-btn{background:#fff!important;color:#191516!important;border:0!important}
body[data-s496="true"] .s496-rec-detail{margin-top:10px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.07);color:#f4ede8;border-radius:10px;padding:11px;font-size:11px;line-height:1.48}
body[data-s496="true"] .s496-rec-detail[hidden]{display:none}
body[data-s496="true"] .s496-compare-detail{grid-column:1/-1;margin-top:12px;border:1px solid #e2d8cf;border-radius:14px;background:#fff;overflow:hidden}
body[data-s496="true"] .s496-compare-detail[hidden]{display:none}
body[data-s496="true"] .s496-compare-detail-head{padding:13px 14px;background:#191617;color:#fff}
body[data-s496="true"] .s496-compare-detail-head strong{font-family:'Archivo';font-size:14px}
body[data-s496="true"] .s496-table{width:100%;border-collapse:collapse;font-size:11px}
body[data-s496="true"] .s496-table th,body[data-s496="true"] .s496-table td{padding:9px 10px;border-bottom:1px solid #eee7df;text-align:left;vertical-align:top}
body[data-s496="true"] .s496-table th{font-family:'Archivo';font-size:11.5px;background:#faf7f2}
body[data-s496="true"] .utility{background:#fff;border-top:1px solid #e7ded4}
body[data-s496="true"] .util{padding:14px 16px;gap:10px}
body[data-s496="true"] .util>div{line-height:1.4}
body[data-s496="true"] .util strong{font-family:'Archivo';font-size:12.5px;margin-bottom:3px}
body[data-s496="true"] .s496-toast{position:fixed;left:50%;bottom:24px;z-index:180;transform:translate(-50%,14px);opacity:0;pointer-events:none;max-width:min(560px,calc(100vw - 32px));background:#171415;color:#fff;border-radius:12px;padding:12px 15px;font-size:12px;line-height:1.45;box-shadow:0 20px 60px -28px rgba(0,0,0,.75);transition:.18s ease}
body[data-s496="true"] .s496-toast.show{opacity:1;transform:translate(-50%,0)}
body[data-s496="true"] .s496-modal-backdrop{position:fixed;inset:0;z-index:190;display:none;place-items:center;padding:22px;background:rgba(14,13,16,.6)}
body[data-s496="true"] .s496-modal-backdrop.open{display:grid}
body[data-s496="true"] .s496-modal{width:min(560px,100%);background:#fff;border-radius:18px;padding:22px;box-shadow:0 30px 90px -35px rgba(0,0,0,.78)}
body[data-s496="true"] .s496-modal h3{font-family:'Archivo';font-size:21px;margin:0 0 8px}
body[data-s496="true"] .s496-modal p{font-size:13px;line-height:1.55;color:#514941;margin:0 0 15px}
body[data-s496="true"] .s496-modal-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
body[data-s496="true"] .s496-modal button{min-height:42px;border-radius:9px;padding:0 14px;font-weight:750}
body[data-s496="true"] .s496-modal .secondary{border:1px solid #d9d0c7;background:#fff}
body[data-s496="true"] .s496-modal .primary{border:0;background:var(--red);color:#fff}
@media(max-width:1180px){
 body[data-s496="true"] .hero-media{left:52%;right:18px}
 body[data-s496="true"] .hero-inner{grid-template-columns:minmax(0,620px) 1fr}
 body[data-s496="true"] .s496-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media(max-width:820px){
 body[data-s496="true"] .hero{min-height:410px}
 body[data-s496="true"] .hero-media{inset:0;border-radius:0;opacity:.42}
 body[data-s496="true"] .hero-media img{object-position:58% 42%}
 body[data-s496="true"] .hero-overlay{background:linear-gradient(90deg,rgba(14,13,16,.95),rgba(14,13,16,.73))}
 body[data-s496="true"] .hero-inner{grid-template-columns:1fr;padding:42px 22px 74px}
 body[data-s496="true"] .hero h1{max-width:9ch}
 body[data-s496="true"] .quote-zone{grid-template-columns:1fr}
 body[data-s496="true"] .product-visual{border-left:0;border-top:1px solid var(--line);min-height:330px}
}
@media(max-width:560px){
 body[data-s496="true"] .hero h1{font-size:43px}
 body[data-s496="true"] .s496-grid{grid-template-columns:1fr}
 body[data-s496="true"] .s496-field.wide{grid-column:auto}
 body[data-s496="true"] .s496-actions{align-items:stretch;flex-direction:column}
 body[data-s496="true"] .s496-actions-right{display:grid;grid-template-columns:1fr}
 body[data-s496="true"] .s496-back,body[data-s496="true"] .s496-next{width:100%}
 body[data-s496="true"] .s496-detail-grid{grid-template-columns:1fr}
}
`;

const CLIENT_JS=String.raw`
(()=>{
'use strict';
const API='/cotcompVehicleCatalogS479';
const PRODUCT_SPRITE=__PRODUCT_SPRITE__;
const PRISCILA_SCENE=__PRISCILA_SCENE__;
const ROUTES=[
 {id:'vehicle',short:'Vehículo',sub:'Movilidad'},
 {id:'home',short:'Hogar',sub:''},
 {id:'health',short:'Salud',sub:'Gastos médicos'},
 {id:'life',short:'Vida',sub:'Ingreso'},
 {id:'business',short:'Empresa',sub:''},
 {id:'cargo',short:'Transporte',sub:'Carga'},
 {id:'other',short:'Otros',sub:'No sé cuál necesito'}
];
const SCENES={
 vehicle:{x:'0%',y:'0%'},home:{x:'33.333%',y:'0%'},health:{x:'66.667%',y:'0%'},life:{x:'100%',y:'0%'},
 business:{x:'0%',y:'100%'},cargo:{x:'33.333%',y:'100%'},other:{x:'66.667%',y:'100%'}
};
const ICONS={
 vehicle:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 13l1.6-4.6A2 2 0 018.5 7h7a2 2 0 011.9 1.4L19 13"/><path d="M4 13h16v4H4z"/><circle cx="7" cy="17" r="1.3"/><circle cx="17" cy="17" r="1.3"/></svg>',
 home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20V10l8-6 8 6v10M9 20v-6h6v6"/></svg>',
 health:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M9 12h6M12 9v6"/></svg>',
 life:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7-4.6-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.4-7 10-7 10z"/></svg>',
 business:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20V7l8-4 8 4v13M8 20v-5h8v5M8 10h2M14 10h2"/></svg>',
 cargo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>',
 other:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 18h.01M9.2 9a3 3 0 115.8 1.9c-1.2.8-2.4 1.4-2.4 3.1"/></svg>'
};
const YEARS=[];for(let y=2027;y>=1985;y--)YEARS.push(String(y));
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
const state={country:'GT',route:'vehicle',stage:0,maxStage:0,mode:'online',drafts:{},brands:[],models:[],brandId:null,toastTimer:null};
const key=()=>state.country+':'+state.route;
const draft=()=>state.drafts[key()]||(state.drafts[key()]={});
function setv(id,v){draft()[id]=v}
function getv(id,def=''){return draft()[id]!=null?draft()[id]:def}
function opts(a){return a.map(v=>({v:String(v),l:String(v)}))}
function field(id,label,type,options,required,def,help,show,wide){return {id,label,type,options:options||[],required:!!required,def:def==null?'':def,help:help||'',show:show||null,wide:wide||''}}
function group(title,kicker,fields){return {title,kicker,fields}}
function contactGroup(){
 return group('Para continuar con A&S','HANDOFF',[
  field('contactName','Nombre','text',[],true,'','Se solicita antes del handoff.'),
  field('contactWhatsapp','WhatsApp','tel',[],true,'','Canal de continuidad; esta vista LAB no envía datos.'),
  field('contactEmail','Correo','email',[],true,'','Esta vista LAB no crea una solicitud.'),
  field('consent','Autorización para gestionar la solicitud','select',opts(['Pendiente de aceptar','Acepto continuar con la gestión']),true,'Pendiente de aceptar','Consentimiento no equivale a elegir una propuesta.','','wide')
 ]);
}
function schema(){
 const c=state.country,r=state.route,d=draft();
 if(r==='vehicle'){
  if(c==='GT')return {
   status:'HYBRID · NOT AUTO READY',
   truth:'Guatemala: intake funcional sustentado en fuentes auditadas. La prima y elegibilidad siguen bajo autoridad Gravicentra.',
   later:'Según fuente pueden solicitarse placa, procedencia, pasajeros, GPS/dispositivo y equipo especial. No se fuerzan al inicio.',
   groups:[
    group('Vehículo y protección','RIESGO',[
     field('vehicleRoute','¿Qué vehículo quieres proteger?','select',opts(['AUTO','MOTO']),true,'AUTO'),
     field('protectionGoal','¿Qué protección buscas?','select',opts(['Cobertura amplia','Responsabilidad civil','Robo (moto)','Necesito orientación']),true,'Cobertura amplia'),
     field('vehicleType','Tipo de vehículo','select',opts(['Automóvil','SUV / camioneta','Pickup','Motocicleta','Panel / camión liviano','Otro / revisar']),true,'Automóvil'),
     field('vehicleUse','Uso del vehículo','select',opts(['Particular','Comercial','Transporte por plataforma']),true,'Particular')
    ]),
    group('Identificación del vehículo','CATÁLOGO',[
     field('brand','Marca','brand',[],true,'TOYOTA','Combobox searchable; no fuerces una marca incorrecta.'),
     field('model','Línea / modelo','model',[],true,'RAV4 2WD','La lista depende de la marca.'),
     field('modelYear','Año','select',opts(YEARS),true,'2023'),
     field('insuredValue','Valor aproximado del vehículo','number',[],true,'185000','Requerido cuando la protección solicitada lo necesita.')
    ]),
    contactGroup()
   ]};
  return {
   status:'CONSULTATIVE REQUIRED · SOURCE BINDING NOT CERTIFIED',
   truth:'Colombia: captura pública base para ruta consultiva. No existe rater Web certificado en este corte.',
   later:'La fuente habilitada definirá suplementos y underwriting; el formulario no convierte este recorrido en automático.',
   groups:[
    group('Vehículo y uso','RIESGO',[
     field('vehicleType','Tipo de vehículo','select',opts(['Automóvil','Camioneta / SUV','Motocicleta','Vehículo comercial','Otro / requiere revisión']),true,'Automóvil'),
     field('vehicleUse','Uso','select',opts(['Particular','Comercial','Plataforma / aplicación','Otro / requiere revisión']),true,'Particular'),
     field('brand','Marca','text',[],true,'Renault'),
     field('model','Línea / modelo','text',[],true,'Duster'),
     field('modelYear','Año','select',opts(YEARS),true,'2023'),
     field('insuredValue','Valor aproximado','number',[],true,'95000000')
    ]),
    group('Condiciones de decisión','APLICABILIDAD',[
     field('youngDriver','Conductor joven / condición potencial','select',opts(['No','Sí','No aplica']),false,'No'),
     field('specialEquipment','Equipo especial','select',opts(['No','Sí / requiere declarar']),false,'No'),
     field('coverageGoal','Tipo de protección que buscas','select',opts(['Cobertura amplia','Daños a terceros / RC','Robo','Revisar opciones disponibles']),true,'Cobertura amplia'),
     field('paymentPreference','Cómo prefieres pagar','select',opts(['Contado','Cuotas / fraccionamiento','Revisar opciones']),false,'Contado'),
     field('priority','¿Qué pesa más en tu decisión?','select',opts(['Equilibrio entre precio y protección','Cobertura','Deducible','Asistencia']),true,'Equilibrio entre precio y protección')
    ]),
    contactGroup()
   ]};
 }
 if(r==='health'){
  if(c==='GT')return {
   status:'HYBRID · NOT AUTO READY',
   truth:'Gastos Médicos Guatemala: contrato funcional sustentado en cotizadores auditados. Datos médicos sensibles quedan para etapa segura/posterior.',
   later:'Historia médica, diagnósticos, exámenes, documentos y underwriting detallado no pertenecen al intake público inicial.',
   groups:[
    group('¿A quién quieres proteger?','ASEGURADOS',[
     field('coverageGroup','Composición','select',opts(['Individual','Familiar','Necesito orientación']),true,'Familiar'),
     field('titularDob','Fecha de nacimiento del titular','date',[],true,'1988-05-12'),
     field('spouseIncluded','¿Incluye cónyuge o pareja?','select',opts(['No','Sí']),true,'Sí'),
     field('spouseDob','Fecha de nacimiento del cónyuge o pareja','date',[],true,'1986-09-21','',()=>getv('spouseIncluded','Sí')==='Sí'),
     field('childrenCount','Hijos o dependientes a incluir','number',[],false,'1')
    ]),
    group('Opciones para orientar la búsqueda','PREFERENCIAS',[
     field('maternity','¿Contemplar maternidad?','select',opts(['No','Sí / revisar aplicabilidad','No aplica','Necesito orientación']),false,'No'),
     field('geography','¿Dónde necesitas cobertura?','select',opts(['Centroamérica','Mundial','Necesito orientación']),false,'Centroamérica'),
     field('priority','Prioridad principal','select',opts(['Red / acceso','Deducible','Cobertura','Costo']),true,'Red / acceso')
    ]),
    contactGroup()
   ]};
  return {
   status:'CONSULTATIVE REQUIRED · NO PUBLIC RATER CERTIFIED',
   truth:'Colombia: seguro privado de salud en ruta consultiva. No reemplaza EPS y no se presume cotización automática.',
   later:'La aseguradora/fuente vigente determinará preguntas médicas o de suscripción posteriores.',
   groups:[
    group('Composición','ASEGURADOS',[
     field('coverageGroup','Modalidad','select',opts(['Individual','Familiar','Necesito orientación']),true,'Individual'),
     field('titularDob','Fecha de nacimiento del titular','date',[],true,'1988-05-12'),
     field('spouseIncluded','¿Incluye cónyuge o pareja?','select',opts(['No','Sí']),false,'No'),
     field('spouseDob','Fecha de nacimiento del cónyuge o pareja','date',[],true,'','',()=>getv('spouseIncluded','No')==='Sí'),
     field('childrenCount','Hijos o dependientes','number',[],false,'0')
    ]),
    group('Preferencias','DECISIÓN',[
     field('territory','Territorio','select',opts(['Colombia','Colombia + internacional','Revisar territorio']),false,'Colombia'),
     field('priority','Prioridad principal','select',opts(['Red / acceso','Deducible','Cobertura','Costo']),true,'Red / acceso')
    ]),
    contactGroup()
   ]};
 }
 if(r==='home')return {
  status:'PUBLIC SCHEMA · OPERATIONAL BINDING PENDING',
  truth:'La captura orienta el riesgo. No se declara prima automática hasta contar con binding operativo vigente.',
  later:'Aseguradora/fuente puede requerir ubicación exacta, construcción, medidas de seguridad o inventario detallado en etapa posterior.',
  groups:[
   group('Vivienda','RIESGO',[
    field('propertyType','Tipo de inmueble','select',opts(['Casa','Apartamento','Otro / revisar']),true,'Casa'),
    field('propertyUse','Uso','select',opts(['Vivienda propia','Arrendada','Segunda vivienda','Otro / revisar']),true,'Vivienda propia'),
    field('structureValue','Valor aproximado de estructura','number',[],true,c==='GT'?'850000':'420000000'),
    field('contentsValue','Valor aproximado de contenido','number',[],true,c==='GT'?'150000':'65000000')
   ]),
   group('Decisión','PRIORIDAD',[field('priority','Prioridad principal','select',opts(['Estructura y contenido','Responsabilidad familiar','Robo','Asistencias']),true,'Estructura y contenido')]),
   contactGroup()
  ]};
 if(r==='life')return {
  status:'CONSULTATIVE REQUIRED · BINDING PENDING',
  truth:'Vida e ingreso parte de la necesidad de continuidad económica; no se presume underwriting ni prima automática.',
  later:'Declaraciones de salud, documentos e información de suscripción se solicitan después y por canal seguro cuando corresponda.',
  groups:[
   group('Contexto','NECESIDAD',[
    field('lifeMoment','Momento de vida','select',opts(['Empiezo mi camino','Familia en crecimiento','Patrimonio consolidado','Trabajo por mi cuenta']),true,'Familia en crecimiento'),
    field('dependents','Personas que dependen de ti','number',[],true,'2'),
    field('income','Ingreso mensual a proteger','number',[],true,c==='GT'?'18000':'8000000'),
    field('horizon','Horizonte que quieres revisar','select',opts(['1–5 años','6–10 años','Más de 10 años','No estoy seguro']),true,'6–10 años')
   ]),
   group('Decisión','PRIORIDAD',[field('priority','Prioridad principal','select',opts(['Continuidad económica','Protección familiar','Ahorro / objetivos','Necesito orientación']),true,'Continuidad económica')]),
   contactGroup()
  ]};
 if(r==='business'){
  if(c==='CO' && getv('businessNeed','')==='RC Profesional')return {
   status:'CONSULTATIVE HYBRID · HISTORICAL RATER NOT PROMOTED',
   truth:'RC Profesional Colombia: producto confirmado, pero el rater histórico no se usa como pricing vigente.',
   later:'Ingresos anuales, experiencia, póliza actual y reclamos/circunstancias son suplementos cuando la fuente los exige.',
   groups:[
    group('Necesidad profesional','RC PROFESIONAL',[
     field('businessNeed','¿Qué quieres revisar?','select',opts(['RC Profesional','Patrimonio / multirriesgo','Continuidad','Otro / orientación']),true,'RC Profesional'),
     field('needTrigger','¿Qué originó la necesidad?','select',opts(['Requisito contractual','Actividad profesional','Exposición de responsabilidad','Renovación / revisión','Necesito orientación']),true,'Actividad profesional'),
     field('applicantType','Tipo de solicitante','select',opts(['Persona natural','Persona jurídica']),true,'Persona jurídica'),
     field('professionalActivity','Actividad o servicios profesionales','text',[],true,'Consultoría'),
     field('businessName','Empresa o firma','text',[],true,'','',()=>getv('applicantType','Persona jurídica')==='Persona jurídica'),
     field('contractRequirement','Requisito general del contrato o cliente','text',[],false,''),
     field('desiredLimit','Límite de cobertura, si lo conoces','number',[],false,'')
    ]),
    contactGroup()
   ]};
  return {
   status:'PUBLIC SCHEMA · CONSULTATIVE REQUIRED / BINDING BY RAMO PENDING',
   truth:'Empresa es una puerta de diagnóstico. Debe derivar al ramo/exposición adecuada; no existe una póliza genérica única.',
   later:'Ubicaciones, inventarios, maquinaria, nómina, contratos o cuestionarios dependen del ramo que resulte del diagnóstico.',
   groups:[
    group('Operación','EMPRESA',[
     field('businessNeed','¿Qué quieres revisar?','select',c==='CO'?opts(['Patrimonio / multirriesgo','RC Profesional','Continuidad','Logística / transporte','Otro / orientación']):opts(['Patrimonio / multirriesgo','Responsabilidad civil','Continuidad','Logística / transporte','Otro / orientación']),true,c==='CO'?'Patrimonio / multirriesgo':'Patrimonio / multirriesgo'),
     field('sector','Sector / actividad','select',opts(['Servicios','Comercio','Industria / manufactura','Logística / transporte','Construcción / proyectos','Profesional / oficina','Otro / revisar']),true,'Servicios'),
     field('size','Tamaño','select',opts(['Microempresa','Pequeña empresa','Mediana empresa','Corporativo']),true,'Pequeña empresa'),
     field('employees','Personas / colaboradores','number',[],false,'12')
    ]),
    group('Exposición','PRIORIDAD',[
     field('exposure','Exposición principal','select',opts(['Patrimonio','Continuidad','Responsabilidad','Personas','Carga / transporte','Necesito orientación']),true,'Continuidad'),
     field('assetValue','Valor aproximado de activos','number',[],false,c==='GT'?'1200000':'650000000')
    ]),
    contactGroup()
   ]};
 }
 if(r==='cargo'){
  if(c==='CO')return {
   status:'CONSULTATIVE HYBRID · NO CURRENT A&S RATER · NOT AUTO READY',
   truth:'Colombia Transporte/Carga conserva la ruta especializada previamente diseñada. Solo propuestas validadas pueden entrar al comparador.',
   later:'Experiencia de siniestros, controles, rutas completas, empaque/temperatura, carga especial y cuestionarios quedan como suplementos.',
   groups:[
    group('Rol y alcance','OPERACIÓN',[
     field('operationRole','¿Cuál es tu rol en la operación?','select',opts(['Generador / propietario de carga','Transportador','Operador logístico','Operador multimodal','Importador / exportador','Otro','Necesito orientación']),true,'Transportador'),
     field('coverageMode','¿Qué necesitas proteger?','select',opts(['Un despacho específico','Un programa anual','Necesito orientación']),true,'Un despacho específico'),
     field('cargoType','Tipo general de mercancía','text',[],true,'Mercancía general'),
     field('transitScope','Ámbito del transporte','select',opts(['Urbano','Nacional','Importación','Exportación','Mixto','Necesito orientación']),true,'Nacional'),
     field('transportModes','Medio principal de transporte','select',opts(['Terrestre / carretera','Aéreo','Marítimo','Fluvial','Ferroviario','Multimodal','Otro']),true,'Terrestre / carretera')
    ]),
    group('Datos de la modalidad','DETALLE',[
     field('origin','Origen','text',[],true,'Bogotá','',()=>getv('coverageMode','Un despacho específico')==='Un despacho específico'),
     field('destination','Destino','text',[],true,'Medellín','',()=>getv('coverageMode','Un despacho específico')==='Un despacho específico'),
     field('valueToProtect','Valor aproximado a proteger','number',[],true,'180000000','',()=>getv('coverageMode','Un despacho específico')==='Un despacho específico'),
     field('maxValuePerShipment','Valor máximo por despacho','number',[],true,'180000000','',()=>getv('coverageMode','Un despacho específico')==='Un programa anual'),
     field('annualMovement','Movimiento anual estimado','number',[],true,'1500000000','',()=>getv('coverageMode','Un despacho específico')==='Un programa anual')
    ]),
    contactGroup()
   ]};
  return {
   status:'HYBRID REQUIRED · SOURCE BINDING BY COUNTRY',
   truth:'Guatemala Transporte/Carga se mantiene amplio y no copia automáticamente la especialización Colombia.',
   later:'La fuente determinará requisitos de seguridad, historial, trayectos y documentación adicional.',
   groups:[
    group('Rol y operación','CADENA',[
     field('role','Rol en la cadena','select',opts(['Transportador','Generador / propietario de carga','Operador logístico','Almacenamiento','Importador / exportador']),true,'Transportador'),
     field('units','Unidades / vehículos','number',[],false,'12'),
     field('cargoType','Tipo de carga','select',opts(['Mercancía general','Alimentos / perecederos','Maquinaria / equipo','Carga de alto valor','Otra / revisar']),true,'Mercancía general'),
     field('routeScope','Alcance del trayecto','select',opts(['Guatemala','Centroamérica','Mixto / revisar']),true,'Guatemala')
    ]),
    group('Exposición','PRIORIDAD',[
     field('criticalPoint','Dónde se concentra la exposición','select',opts(['Origen / cargue','Tránsito','Nodos / transferencias','Almacenamiento','Destino / entrega']),true,'Tránsito'),
     field('shipmentValue','Valor aproximado por despacho','number',[],false,'250000'),
     field('priority','Prioridad principal','select',opts(['Carga y mercancía','Responsabilidad','Continuidad','Costo']),true,'Carga y mercancía')
    ]),
    contactGroup()
   ]};
 }
 return {
  status:'ROUTER · MORE DATA REQUIRED',
  truth:'“Otros” no es un producto cotizable. Sirve para identificar la necesidad y enrutar sin forzar una selección incorrecta.',
  later:'La siguiente pregunta depende de lo que quieras proteger y del cambio que originó la necesidad.',
  groups:[
   group('Empecemos por tu situación','ORIENTACIÓN',[
    field('protectWhat','¿Qué quieres proteger?','select',opts(['Una persona / familia','Un vehículo / movilidad','Una vivienda','Una empresa / operación','Carga / transporte','Un contrato / proyecto','No sé todavía']),true,'No sé todavía'),
    field('whatChanged','¿Qué cambió?','select',opts(['Compré / adquirí algo','Mi familia cambió','Mi empresa creció o cambió','Tengo varias pólizas y quiero ordenar','Tengo una obligación o contrato','Solo quiero entender mis opciones']),true,'Solo quiero entender mis opciones')
   ]),
   contactGroup()
  ]};
}
function defaultFor(f){if(getv(f.id,'')===''&&f.def!=='')setv(f.id,f.def);return getv(f.id,'')}
function visibleField(f){return !f.show||f.show()}
function missingRequired(sc){
 const m=[];(sc.groups||[]).forEach(g=>(g.fields||[]).filter(visibleField).forEach(f=>{defaultFor(f);const v=String(getv(f.id,'')).trim();const consentMissing=f.id==='consent'&&v!=='Acepto continuar con la gestión';if(f.required&&(v===''||consentMissing))m.push(f.label)}));
 return m;
}
function toast(msg){
 let el=q('#s496Toast');if(!el){el=document.createElement('div');el.id='s496Toast';el.className='s496-toast';el.setAttribute('role','status');el.setAttribute('aria-live','polite');document.body.appendChild(el)}
 el.textContent=msg;el.classList.add('show');clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>el.classList.remove('show'),2800);
}
function updateStepper(){
 const labels=['Lo que necesitas','Tus datos','Revisar opciones','Comparar y continuar'];
 qa('.pstep').forEach((el,i)=>{
  el.classList.remove('active','done','current','future','reached');
  q('span:last-child',el).textContent=labels[i];
  const n=q('.pnum',el);n.textContent=String(i+1);
  if(i<state.stage){el.classList.add('done','reached')}
  else if(i===state.stage){el.classList.add('current','reached');n.setAttribute('aria-current','step')}
  else{el.classList.add('future');n.removeAttribute('aria-current')}
  el.setAttribute('tabindex',i<=state.maxStage?'0':'-1');
  el.setAttribute('role','button');
  el.setAttribute('aria-disabled',i<=state.maxStage?'false':'true');
 });
}
function renderFamilies(){
 const row=q('#familyRow');if(!row)return;
 row.innerHTML=ROUTES.map(r=>'<button type="button" class="family family-'+r.id+(r.id===state.route?' active':'')+'" data-route="'+r.id+'"><span class="icon3d icon3d-'+r.id+'">'+ICONS[r.id]+'</span><strong>'+esc(r.short)+'</strong>'+(r.sub?'<span>'+esc(r.sub)+'</span>':'')+'</button>').join('');
}
function renderVisual(){
 const pv=q('#productVisual');if(!pv)return;
 const r=ROUTES.find(x=>x.id===state.route)||ROUTES[0],sc=SCENES[state.route]||SCENES.other,d=draft();
 pv.dataset.s496Route=state.route;pv.removeAttribute('data-s495-photo');
 if(state.route==='other'){
  pv.innerHTML='<img class="s496-other-photo" src="'+PRISCILA_SCENE+'" alt="Acompañamiento consultivo A&amp;S"><div class="scene-copy"><div class="scene-meta"><strong>Orientación A&amp;S</strong><span>Descubre qué necesitas proteger</span></div><p>Te ayudamos a identificar la necesidad antes de elegir un producto.</p><button type="button" class="scene-edit">Editar selección</button></div>';
  return;
 }
 const photo='<div class="product-scene photo-scene" aria-hidden="true"></div>';
 let strong=r.short,sub=r.sub||'Protección',hand='';
 if(state.route==='vehicle'){
  const parts=[getv('vehicleType','Vehículo'),getv('brand',''),getv('model',''),getv('modelYear','')].filter(Boolean);
  strong=parts.join(' · ');sub=getv('vehicleUse','Uso por definir');hand='La imagen representa la familia de riesgo; la referencia exacta se conserva en los datos seleccionados.';
 }else if(state.route==='home')hand='Protección del hogar, estructura, contenido y prioridades.';
 else if(state.route==='health')hand='La composición y las preferencias cambian las alternativas que conviene revisar.';
 else if(state.route==='life')hand='Protección para continuidad económica y personas dependientes.';
 else if(state.route==='business')hand='La empresa se orienta por exposición y ramo, no por una póliza genérica.';
 else if(state.route==='cargo')hand=state.country==='CO'?'Ruta especializada para operación logística y mercancías.':'Operación de transporte y carga según exposición.';
 pv.innerHTML=photo+'<span class="s496-risk-badge">'+esc(state.country==='GT'?'Guatemala':'Colombia')+' · '+esc(r.short)+'</span><div class="scene-copy"><div class="scene-meta"><strong>'+esc(strong)+'</strong><span>'+esc(sub)+'</span></div><p>'+esc(hand)+'</p><button type="button" class="scene-edit">Editar selección</button></div>';
 const p=q('.photo-scene',pv);p.style.backgroundImage='url("'+PRODUCT_SPRITE+'")';p.style.setProperty('--sprite-x',sc.x);p.style.setProperty('--sprite-y',sc.y);
}
function inputHtml(f){
 if(!visibleField(f))return '';
 const val=defaultFor(f),req=f.required?'<b> *</b>':'',cls='s496-field '+(f.wide||'');
 if(f.type==='select'){
  const html=f.options.map(o=>'<option value="'+esc(o.v)+'"'+(String(o.v)===String(val)?' selected':'')+'>'+esc(o.l)+'</option>').join('');
  return '<div class="'+cls+'"><label for="s496_'+f.id+'">'+esc(f.label)+req+'</label><select id="s496_'+f.id+'" data-field="'+esc(f.id)+'">'+html+'</select>'+(f.help?'<div class="s496-help">'+esc(f.help)+'</div>':'')+'</div>';
 }
 if(f.type==='brand'||f.type==='model'){
  const list=f.type==='brand'?'s496BrandList':'s496ModelList';
  const fallbackLabel=f.type==='brand'?'No encuentro mi marca':'No encuentro mi línea / modelo';
  return '<div class="'+cls+'"><label for="s496_'+f.id+'">'+esc(f.label)+req+'</label><div class="combo-wrap"><input id="s496_'+f.id+'" data-field="'+esc(f.id)+'" data-combo="'+f.type+'" role="combobox" aria-expanded="false" aria-controls="'+list+'" autocomplete="off" value="'+esc(val)+'"><div id="'+list+'" class="combo-list" role="listbox"></div></div><button class="fallback-link" type="button" data-fallback="'+f.type+'">'+fallbackLabel+'</button>'+(f.help?'<div class="s496-help">'+esc(f.help)+'</div>':'')+'</div>';
 }
 return '<div class="'+cls+'"><label for="s496_'+f.id+'">'+esc(f.label)+req+'</label><input id="s496_'+f.id+'" data-field="'+esc(f.id)+'" type="'+esc(f.type)+'" value="'+esc(val)+'">'+(f.help?'<div class="s496-help">'+esc(f.help)+'</div>':'')+'</div>';
}
function renderStage0(){
 q('.section-title').textContent='1. Selecciona lo que quieres proteger';
 q('#formTitle').textContent='Tu selección define las preguntas del siguiente paso';
 q('#formRow').innerHTML='<div class="s496-intro"><strong>Empieza por la necesidad, no por la estructura interna de A&amp;S.</strong>Las siete familias se mantienen como puerta de entrada. Al elegir una, avanzamos a los datos que realmente cambian la ruta para '+(state.country==='GT'?'Guatemala':'Colombia')+'.</div>';
}
function renderStage1(){
 const sc=schema();
 q('.section-title').textContent='1. Lo que quieres proteger';
 q('#formTitle').textContent='2. '+(state.route==='other'?'Cuéntanos qué cambió':'Cuéntanos solo lo necesario para esta necesidad');
 const groups=(sc.groups||[]).map(g=>'<section class="s496-group"><div class="s496-group-head"><h4>'+esc(g.title)+'</h4><span>'+esc(g.kicker)+'</span></div><div class="s496-grid">'+g.fields.map(inputHtml).join('')+'</div></section>').join('');
 q('#formRow').innerHTML='<div class="s496-groups">'+groups+'</div><div class="s496-truth'+(state.mode==='assisted'?' assisted':'')+'"><strong>'+esc(sc.status)+'</strong><br>'+esc(sc.truth)+'</div><div class="s496-later"><strong>Después, solo si aplica:</strong> '+esc(sc.later)+'</div>'+actionsHtml('Revisar opciones →');
 bindFields();
 if(state.country==='GT'&&state.route==='vehicle')bindVehicleCombos();
}
function actionsHtml(next){
 return '<div class="s496-actions"><button type="button" class="s496-back" data-back>← Volver</button><div class="s496-actions-right"><span class="s496-mode-state">'+(state.mode==='assisted'?'Ruta con acompañamiento activa':'Ruta en línea con fallback asistido')+'</span><button type="button" class="s496-next" data-next>'+next+'</button></div></div>';
}
function renderStage2(){
 const sc=schema();
 q('.section-title').textContent='1. '+(ROUTES.find(x=>x.id===state.route)||ROUTES[0]).short;
 q('#formTitle').textContent='2. Revisa el contexto antes de comparar';
 q('#formRow').innerHTML='<div class="s496-intro"><strong>'+esc(sc.status)+'</strong>Conservamos los datos del caso y la madurez real del producto. En una operación real, Gravicentra determina elegibilidad y propuestas; esta LAB solo valida la experiencia.</div>'+actionsHtml('Comparar opciones →');
}
function renderStage3(){
 q('.section-title').textContent='1. Contexto preservado';
 q('#formTitle').textContent='2. Ya puedes revisar diferencias y decidir cómo continuar';
 q('#formRow').innerHTML='<div class="s496-intro"><strong>Comparar no significa ordenar por precio.</strong>La comparación debe explicar diferencias demostrables, distinguir datos faltantes y conservar la elección explícita separada de emisión o cobertura.</div>'+actionsHtml('Continuar con A&S →');
}
function bindFields(){
 qa('[data-field]',q('#formRow')).forEach(el=>{
  const save=()=>{setv(el.dataset.field,el.value);if(['spouseIncluded','businessNeed','applicantType','coverageMode','childrenCount','vehicleType','vehicleUse','modelYear'].includes(el.dataset.field)){render();}else{renderVisual();}};
  el.addEventListener('change',save);if(el.tagName==='INPUT'&&!el.dataset.combo)el.addEventListener('input',save);
 });
 qa('[data-fallback]',q('#formRow')).forEach(b=>b.addEventListener('click',()=>{state.mode='assisted';render();toast('No forzamos una selección incorrecta. Conservamos el contexto para revisión asistida.');}));
}
async function api(op,args){
 const p=new URLSearchParams(Object.assign({op},args||{}));const res=await fetch(API+'?'+p.toString(),{headers:{accept:'application/json'}});const j=await res.json();if(!res.ok||!j.ok)throw new Error(j.code||'CATALOG_UNAVAILABLE');return j;
}
async function ensureBrands(){if(state.brands.length)return;try{state.brands=(await api('brands',{vehicleClass:'AUTO_LIGHT',limit:200})).items||[]}catch(e){state.brands=[]}}
async function ensureModels(){
 const brand=getv('brand','');if(!brand)return;await ensureBrands();const match=state.brands.find(x=>norm(x.label)===norm(brand));if(!match)return;
 if(state.brandId===match.brandId&&state.models.length)return;state.brandId=match.brandId;try{state.models=(await api('models',{vehicleClass:'AUTO_LIGHT',brandId:match.brandId,limit:200})).items||[]}catch(e){state.models=[]}
}
function comboOpen(input,list){list.classList.add('open');input.setAttribute('aria-expanded','true')}
function comboClose(input,list){list.classList.remove('open');input.setAttribute('aria-expanded','false')}
function renderComboRows(kind,input,list){
 const rows=(kind==='brand'?state.brands:state.models).filter(x=>!norm(input.value)||norm(x.label).includes(norm(input.value))).slice(0,80);
 list.innerHTML=rows.map(x=>'<div class="combo-opt" role="option" data-combo-choice="'+kind+'" data-id="'+esc(kind==='brand'?x.brandId:x.modelId)+'" data-label="'+esc(x.label)+'">'+esc(x.label)+'</div>').join('');
 comboOpen(input,list);
}
async function bindVehicleCombos(){
 const bi=q('[data-combo="brand"]'),mi=q('[data-combo="model"]'),bl=q('#s496BrandList'),ml=q('#s496ModelList');if(!bi||!mi)return;
 await ensureBrands();await ensureModels();
 bi.addEventListener('focus',()=>renderComboRows('brand',bi,bl));bi.addEventListener('input',()=>renderComboRows('brand',bi,bl));
 bl.addEventListener('mousedown',async e=>{e.preventDefault();const x=e.target.closest('[data-combo-choice="brand"]');if(!x)return;setv('brand',x.dataset.label);setv('model','');state.brandId=x.dataset.id;state.models=[];bi.value=x.dataset.label;comboClose(bi,bl);await ensureModels();mi.value='';renderVisual();mi.focus();});
 mi.addEventListener('focus',()=>renderComboRows('model',mi,ml));mi.addEventListener('input',()=>renderComboRows('model',mi,ml));
 ml.addEventListener('mousedown',e=>{e.preventDefault();const x=e.target.closest('[data-combo-choice="model"]');if(!x)return;setv('model',x.dataset.label);mi.value=x.dataset.label;comboClose(mi,ml);renderVisual();});
}
function renderCompare(){
 const compare=q('.compare');if(!compare)return;
 compare.dataset.s496Hidden=state.stage<2?'true':'false';
 if(state.stage<2)return;
 const alternatives=q('#alternatives'),rec=q('#recommendation'),head=q('.compare-head h3'),link=q('.compare-link');
 head.textContent=state.stage===2?'3. Revisa alternativas':'3. Compara alternativas con criterio';
 link.textContent='Ver comparación detallada →';link.setAttribute('aria-expanded','false');
 const prices=state.country==='GT'?['Q 2,180','Q 2,540','Q 2,860']:['$ 1.280.000','$ 1.460.000','$ 1.710.000'];
 const marks=['#2F6AA3','#E4002B','#2C8DB5'];
 alternatives.innerHTML=[0,1,2].map((i)=>'<article class="alt"><div class="alt-top"><span class="insurer-mark" style="--mark:'+marks[i]+'">'+String.fromCharCode(65+i)+'</span><div><h4>Aseguradora '+String.fromCharCode(65+i)+'</h4><div style="font-size:10.5px;color:#777">Alternativa ilustrativa</div></div><div class="alt-price">'+prices[i]+'<small>ejemplo LAB</small></div></div><div class="alt-body"><div class="checks"><span>✓ Hechos comparables</span><span>✓ Asistencia si está informada</span><span>✓ Missing no se interpreta</span></div><div class="bars"><div class="barrow"><span>Protección</span><div class="bar"><b style="--w:'+(52+i*12)+'%"></b></div></div><div class="barrow"><span>Asistencia</span><div class="bar"><b style="--w:'+(44+i*14)+'%"></b></div></div><div class="barrow"><span>Condiciones</span><div class="bar"><b style="--w:'+(61+i*9)+'%"></b></div></div></div></div><button class="details" type="button" aria-expanded="false">Ver detalles</button><div class="s496-detail" hidden><strong>Qué revisar en la propuesta</strong><div class="s496-detail-grid"><div><b>Coberturas</b><br>Solo las informadas y validadas.</div><div><b>Deducibles</b><br>Comparables cuando comparten base.</div><div><b>Asistencias</b><br>Missing no significa “no incluye”.</div><div><b>Vigencia</b><br>Debe estar vigente para comparar.</div></div></div></article>').join('');
 let detail=q('#s496CompareDetail');if(detail)detail.remove();
 rec.innerHTML=state.stage<3?'<div class="rec-ribbon">Revisión A&amp;S</div><p>Primero confirmamos que las alternativas sean comparables y vigentes. La recomendación completa aparece al entrar al paso de comparación.</p><div class="rec-list"><div class="rec-item"><span>●</span><span>Sin ranking silencioso</span></div><div class="rec-item"><span>●</span><span>Sin completar faltantes por inferencia</span></div></div>':'<div class="rec-ribbon">★ Recomendación A&amp;S</div><p>La recomendación explica <strong>trade-offs demostrables</strong> según lo que te importa; no declara una “mejor póliza” universal.</p><div class="rec-list"><div class="rec-item"><span>●</span><span>Qué opción protege mejor la prioridad declarada</span></div><div class="rec-item"><span>●</span><span>Qué sacrificas o ganas al cambiar de alternativa</span></div><div class="rec-item"><span>●</span><span>Qué dato debe validarse antes de elegir</span></div></div><button class="rec-btn" type="button" aria-expanded="false">Ver recomendación completa →</button><div class="s496-rec-detail" hidden><strong>Cómo se construye</strong><br>En producción solo usa Proposal validada y vigente de Gravicentra. La prioridad ordena la explicación, no crea un score oculto.</div>';
}
function render(){
 document.body.dataset.s496='true';document.body.dataset.s496Stage=String(state.stage);document.body.dataset.s496Country=state.country;document.body.dataset.s496Mode=state.mode;
 updateStepper();renderFamilies();renderVisual();
 q('#onlineTab').classList.toggle('active',state.mode==='online');q('#assistTab').classList.toggle('active',state.mode==='assisted');
 if(state.stage===0)renderStage0();else if(state.stage===1)renderStage1();else if(state.stage===2)renderStage2();else renderStage3();
 renderCompare();
}
function setStage(n){
 n=Math.max(0,Math.min(3,n));if(n>state.maxStage)return;
 state.stage=n;render();q('.workspace').scrollIntoView({behavior:'smooth',block:'start'});
}
function advance(){
 if(state.stage===1){const miss=missingRequired(schema());if(miss.length){toast('Revisa los campos requeridos: '+miss.slice(0,3).join(', ')+(miss.length>3?'…':''));return}}
 if(state.stage<3){state.stage++;state.maxStage=Math.max(state.maxStage,state.stage);render();q('.compare').scrollIntoView({behavior:'smooth',block:'start'});return}
 openAdvisor();
}
function back(){if(state.stage>0){state.stage--;render();q('.workspace').scrollIntoView({behavior:'smooth',block:'start'});}}
function setRoute(id){
 if(!ROUTES.some(r=>r.id===id))return;state.route=id;state.stage=1;state.maxStage=Math.max(state.maxStage,1);state.brandId=null;state.models=[];render();
}
function setCountry(c){
 state.country=c==='CO'?'CO':'GT';state.stage=1;state.maxStage=Math.max(state.maxStage,1);state.brandId=null;state.models=[];render();toast('Contexto cambiado a '+(state.country==='GT'?'Guatemala':'Colombia')+'. Las preguntas se ajustaron al país.');
}
function toggleAlt(btn){
 const alt=btn.closest('.alt');if(!alt)return;
 qa('.alt .s496-detail').forEach(p=>{if(p!==q('.s496-detail',alt)){p.hidden=true;const b=q('.details',p.parentElement);if(b){b.textContent='Ver detalles';b.setAttribute('aria-expanded','false')}}});
 const p=q('.s496-detail',alt);p.hidden=!p.hidden;btn.textContent=p.hidden?'Ver detalles':'Ocultar detalles';btn.setAttribute('aria-expanded',p.hidden?'false':'true');
}
function toggleCompare(){
 const wrap=q('.compare-main'),trigger=q('.compare-link');let p=q('#s496CompareDetail');
 if(!p){p=document.createElement('div');p.id='s496CompareDetail';p.className='s496-compare-detail';p.hidden=true;p.innerHTML='<div class="s496-compare-detail-head"><strong>Comparación detallada · estructura de lectura</strong></div><table class="s496-table"><thead><tr><th>Criterio</th><th>Alternativa A</th><th>Alternativa B</th><th>Alternativa C</th></tr></thead><tbody><tr><td>Prima total</td><td>Ilustrativa</td><td>Ilustrativa</td><td>Ilustrativa</td></tr><tr><td>Coberturas</td><td>Validar Proposal</td><td>Validar Proposal</td><td>Validar Proposal</td></tr><tr><td>Deducibles</td><td>Base comparable</td><td>Base comparable</td><td>Base comparable</td></tr><tr><td>Datos faltantes</td><td colspan="3">Se muestran como faltantes; nunca como “no cubre”.</td></tr></tbody></table>';wrap.appendChild(p)}
 p.hidden=!p.hidden;trigger.textContent=p.hidden?'Ver comparación detallada →':'Ocultar comparación detallada ↑';trigger.setAttribute('aria-expanded',p.hidden?'false':'true');
}
function toggleRec(btn){const p=q('.s496-rec-detail',btn.closest('.rec'));if(!p)return;p.hidden=!p.hidden;btn.textContent=p.hidden?'Ver recomendación completa →':'Ocultar recomendación ↑';btn.setAttribute('aria-expanded',p.hidden?'false':'true');}
function ensureModal(){
 let b=q('#s496Modal');if(b)return b;b=document.createElement('div');b.id='s496Modal';b.className='s496-modal-backdrop';b.innerHTML='<section class="s496-modal" role="dialog" aria-modal="true" aria-labelledby="s496ModalTitle"><h3 id="s496ModalTitle">Continúa con A&amp;S sin empezar de nuevo</h3><p>Conservamos país, necesidad y datos visibles del caso. Esta candidata LAB no crea una solicitud, no envía datos reales y no activa transporte hacia Gravicentra.</p><div class="s496-modal-actions"><button class="secondary" type="button" data-close>Cerrar</button><button class="primary" type="button" data-assist>Usar ruta con acompañamiento</button></div></section>';document.body.appendChild(b);
 b.addEventListener('click',e=>{if(e.target===b||e.target.closest('[data-close]'))b.classList.remove('open');if(e.target.closest('[data-assist]')){state.mode='assisted';b.classList.remove('open');render();toast('Acompañamiento activado; el journey y tus datos visibles se conservan.');}});
 return b;
}
function openAdvisor(){const b=ensureModal();b.classList.add('open');q('[data-assist]',b).focus();}
document.addEventListener('click',e=>{
 const fam=e.target.closest('.family[data-route]');if(fam){setRoute(fam.dataset.route);return}
 const step=e.target.closest('.pstep');if(step){const i=qa('.pstep').indexOf(step);if(i>=0&&i<=state.maxStage)setStage(i);return}
 const country=e.target.closest('.country button');if(country){qa('.country button').forEach(x=>x.classList.toggle('active',x===country));setCountry(/colombia/i.test(country.textContent)?'CO':'GT');return}
 if(e.target.closest('#onlineTab')){state.mode='online';render();return}
 if(e.target.closest('#assistTab')){state.mode='assisted';render();return}
 if(e.target.closest('[data-back]')){back();return}
 if(e.target.closest('[data-next]')){advance();return}
 const edit=e.target.closest('.scene-edit');if(edit){state.stage=0;render();q('#familyRow').scrollIntoView({behavior:'smooth',block:'center'});return}
 const det=e.target.closest('.details');if(det){toggleAlt(det);return}
 if(e.target.closest('.compare-link')){toggleCompare();return}
 const rec=e.target.closest('.rec-btn');if(rec){toggleRec(rec);return}
 if(e.target.closest('.advisor,.wa')){openAdvisor();return}
});
document.addEventListener('keydown',e=>{
 const step=e.target.closest&&e.target.closest('.pstep');if(step&&(e.key==='Enter'||e.key===' ')){e.preventDefault();const i=qa('.pstep').indexOf(step);if(i>=0&&i<=state.maxStage)setStage(i)}
});
render();
})();
`;

function clientScript(){
  return '<script data-s496-journey>'+CLIENT_JS
    .replace('__PRODUCT_SPRITE__',JSON.stringify(PRODUCT_SPRITE))
    .replace('__PRISCILA_SCENE__',JSON.stringify(PRISCILA_SCENE))+
    '</script>';
}
function manifest(){
  const m=S495.manifest();
  return Object.freeze({...m,providerDeploymentAuthorized:false,cotcompRealTransportAuthorized:false,production:false,governanceContext:GOVERNANCE_CONTEXT,governanceLocks:GOVERNANCE_LOCKS});
}
function routes(){return S495.routes();}
function html(){
  let out=S495.html();
  out=out.replace(/<script(?:\s[^>]*)?>[\s\S]*?<\/script>/g,'');
  out=out.replace('<head>','<head><meta name="ays-candidate" content="'+FUNCTION_NAME+'"><meta name="ays-parent" content="'+PARENT_FUNCTION+'"><meta name="ays-governance" content="'+GOVERNANCE_CONTEXT+'">');
  out=out.replace('<body data-s495-refinement="true" data-s495-mode="online">','<body data-s495-refinement="true" data-s495-mode="online" data-s496="true" data-s496-stage="1" data-s496-country="GT">');
  out=out.replace('</style>',CSS+'</style>');
  out=out.replace('</body>',clientScript()+'</body>');
  return out;
}
function handler(req,res){
  S494.securityHeaders(res);
  if(req.method!=='GET'){res.set('Allow','GET');return res.status(405).send('Método no permitido.');}
  res.set('Content-Type','text/html; charset=utf-8');
  return res.status(200).send(html());
}
const cotcompPremiumJourneyPreviewS496=onRequest({region:REGION,timeoutSeconds:30,memory:'512MiB',maxInstances:2,concurrency:40,invoker:'public'},handler);
module.exports=Object.freeze({
  VERSION,PROJECT_ID,REGION,FUNCTION_NAME,PARENT_FUNCTION,PARENT_VERSION,CATALOG_PATH,GOVERNANCE_CONTEXT,GOVERNANCE_LOCKS,
  manifest,routes,html,handler,cotcompPremiumJourneyPreviewS496
});
