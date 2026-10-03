'use strict';

const {onRequest}=require('firebase-functions/v2/https');
const S=require('./cotcomp-gravicentra-provider-contract-s484');

const VERSION='ays-cotcomp-s487-approved-visual-convergence-preview-v1.0';
const PROJECT_ID='ays-orbit-360-lab';
const REGION='us-central1';
const FUNCTION_NAME='cotcompApprovedVisualPreviewS487';
const CATALOG_PATH='/cotcompVehicleCatalogS479';
const PROMOTED_VISUAL_PARENT_SHA='50aa4190ae22ad13760f893b9bf37415abe35fb7327e034f66dc565b9b2cbf1d';

function fixtureManifest(){
  return S.normalizeProviderManifest({
    authority:'GRAVICENTRA',
    tenantId:'alianzas-soluciones',
    country:'MULTI',
    configurationVersion:'fixture-s487-v1',
    catalogVersion:'fixture-catalog-v1',
    effectiveAt:'2026-10-03T00:00:00-06:00',
    generatedAt:'2026-10-03T00:00:00-06:00',
    releaseState:'LAB_FIXTURE_ONLY',
    digestSha256:'5'.repeat(64),
    providerContractVersion:'gravicentra-quote-authority-v1',
    providerDeploymentAuthorized:false,
    cotcompRealTransportAuthorized:false,
    capabilities:{manifest:true,quote:false,proposal:false,selection:false},
    knowledgeRefs:['knowledge://shared/fixture-reference-only'],
    intakeSchemas:[
      {
        schemaId:'fixture-gt-vehicle-v1',
        schemaVersion:'1',
        enabled:true,
        scope:{country:'GT',lineOfBusiness:'MOBILITY',productId:'private-vehicle',riskType:'VEHICLE'},
        fields:[
          {key:'brand',label:'Marca',type:'REFERENCE',required:true,ui:{control:'VEHICLE_BRAND_COMBOBOX'}},
          {key:'model',label:'Línea / modelo',type:'REFERENCE',required:true,ui:{control:'VEHICLE_MODEL_COMBOBOX'}},
          {key:'year',label:'Año',type:'INTEGER',required:true,ui:{control:'VEHICLE_YEAR_SELECT'}}
        ],
        knowledgeRefs:['knowledge://mobility/fixture']
      },
      {
        schemaId:'fixture-gt-business-v1',
        schemaVersion:'1',
        enabled:true,
        scope:{country:'GT',lineOfBusiness:'PROPERTY',productId:'business-protection',riskType:'COMMERCIAL_LOCATION'},
        fields:[
          {key:'activity',label:'Actividad principal',type:'SELECT',required:true,ui:{options:['Comercio','Servicios','Industria','Bodega / almacenamiento','Otra actividad']}},
          {key:'locationType',label:'¿Qué quieres proteger?',type:'SELECT',required:true,ui:{options:['Local u oficina','Bodega','Edificio','Contenido / equipo','Varios activos']}},
          {key:'hasInventory',label:'¿Incluye inventario o mercadería?',type:'BOOLEAN',required:true},
          {key:'inventoryValue',label:'Valor aproximado del inventario',type:'MONEY',required:true,conditions:[{fieldKey:'hasInventory',operator:'EQUALS',value:true}]}
        ],
        knowledgeRefs:['knowledge://business/fixture']
      },
      {
        schemaId:'fixture-co-cargo-v1',
        schemaVersion:'1',
        enabled:true,
        scope:{country:'CO',lineOfBusiness:'TRANSPORT',productId:'cargo',riskType:'CARGO_MOVEMENT'},
        fields:[
          {key:'cargoType',label:'Tipo de mercancía',type:'SELECT',required:true,ui:{options:['Mercancía general','Alimentos','Tecnología / electrónicos','Materia prima','Otra']}},
          {key:'routeType',label:'Tipo de trayecto',type:'SELECT',required:true,ui:{options:['Nacional','Urbano / última milla','Importación / exportación','Mixto']}},
          {key:'frequency',label:'Frecuencia de movimientos',type:'SELECT',required:true,ui:{options:['Ocasional','Semanal','Diaria','Variable']}},
          {key:'annualMovement',label:'Movimiento anual aproximado',type:'MONEY',required:false}
        ],
        knowledgeRefs:['knowledge://transport/fixture']
      }
    ]
  });
}

const ROUTES=Object.freeze([
  {
    id:'vehicle',
    family:'Vehículo / movilidad',
    label:'Vehículo y movilidad',
    description:'Auto, SUV, pickup o motocicleta.',
    group:'Personas y familias',
    mode:'SCHEMA',
    context:{country:'GT',journeyId:'preview-vehicle',lineOfBusiness:'MOBILITY',productId:'private-vehicle',riskType:'VEHICLE'}
  },
  {
    id:'home',
    family:'Hogar',
    label:'Hogar',
    description:'Vivienda, contenido y protección del hogar.',
    group:'Personas y familias',
    mode:'ASSISTED_DISCOVERY',
    context:{country:'UNSPECIFIED',journeyId:'preview-home',lineOfBusiness:'HOME',productId:'home',riskType:'HOUSEHOLD'}
  },
  {
    id:'health',
    family:'Salud / gastos médicos',
    label:'Salud / gastos médicos',
    description:'Protección médica para ti o tu familia.',
    group:'Personas y familias',
    mode:'ASSISTED_DISCOVERY',
    context:{country:'UNSPECIFIED',journeyId:'preview-health',lineOfBusiness:'HEALTH',productId:'medical-expenses',riskType:'PERSON'}
  },
  {
    id:'life',
    family:'Vida / ingreso',
    label:'Vida e ingreso',
    description:'Protección para tu familia y continuidad de ingresos.',
    group:'Personas y familias',
    mode:'ASSISTED_DISCOVERY',
    context:{country:'UNSPECIFIED',journeyId:'preview-life',lineOfBusiness:'LIFE',productId:'life-income',riskType:'PERSON'}
  },
  {
    id:'business',
    family:'Empresa',
    label:'Empresa',
    description:'Patrimonio, local, equipo y continuidad operativa.',
    group:'Empresas',
    mode:'SCHEMA',
    context:{country:'GT',journeyId:'preview-business',lineOfBusiness:'PROPERTY',productId:'business-protection',riskType:'COMMERCIAL_LOCATION'}
  },
  {
    id:'cargo',
    family:'Transporte / carga',
    label:'Transporte / carga',
    description:'Mercancía, trayectos y operaciones logísticas.',
    group:'Empresas',
    mode:'SCHEMA',
    context:{country:'CO',journeyId:'preview-cargo',lineOfBusiness:'TRANSPORT',productId:'cargo',riskType:'CARGO_MOVEMENT'}
  },
  {
    id:'other',
    family:'Otros / no sé cuál necesito',
    label:'Otros / no sé cuál necesito',
    description:'Te orientamos para identificar la protección adecuada.',
    group:'Orientación',
    mode:'ASSISTED_DISCOVERY',
    context:{country:'UNSPECIFIED',journeyId:'preview-other',lineOfBusiness:'ADVISORY',productId:'needs-discovery',riskType:'UNKNOWN'}
  }
]);

function securityHeaders(res){
  res.set('Cache-Control','no-store, max-age=0');
  res.set('Pragma','no-cache');
  res.set('Referrer-Policy','no-referrer');
  res.set('X-Content-Type-Options','nosniff');
  res.set('X-Frame-Options','DENY');
  res.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=()');
  res.set('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'unsafe-inline'; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'");
}

function html(){
  const manifest=fixtureManifest();
  const validation=S.validateProviderManifest(manifest);
  if(!validation.ok) throw new Error('S487_FIXTURE_MANIFEST_INVALID:'+validation.errors.join(','));

  const safeManifest=JSON.stringify(manifest).replace(/</g,'\\u003c');
  const safeRoutes=JSON.stringify(ROUTES).replace(/</g,'\\u003c');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>A&S · Cotizar y comparar</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800;900&family=Instrument+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:#F4F1EA;color:#12110F;font-family:'Instrument Sans',system-ui,sans-serif}
button,input,select{font:inherit}
button{cursor:pointer}
:focus-visible{outline:3px solid #E4002B;outline-offset:2px;border-radius:3px}
::selection{background:#E4002B;color:#fff}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*::before,*::after{animation-duration:.001ms!important;transition-duration:.001ms!important}}

.vl-screen{background:#F4F1EA;min-height:80vh}
.shell{max-width:1120px;margin:0 auto;padding:clamp(36px,5vh,64px) clamp(20px,3vw,44px)}
.kicker{font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.14em;color:#C4001F;display:flex;align-items:center;gap:10px}
.kicker::before{content:"";width:30px;height:2px;background:#E4002B;display:block}
.page-title{font-family:'Archivo',sans-serif;font-weight:900;font-size:clamp(30px,4vw,56px);line-height:.95;letter-spacing:-.03em;margin:14px 0 22px;max-width:18ch}

.card{margin-top:6px;border-radius:22px;overflow:hidden;background:#fff;border:1px solid #E2DACF;box-shadow:0 44px 90px -54px rgba(40,10,18,.6),0 4px 12px -6px rgba(40,10,18,.14)}
.chrome{display:flex;align-items:center;gap:7px;padding:12px 16px;background:linear-gradient(180deg,#F7F2EA,#EFE8DE);border-bottom:1px solid #E2DACF}
.dot{width:9px;height:9px;border-radius:50%;background:#D3C7BE}.dot.red{background:#E4002B}
.chrome-label{margin-left:10px;font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.06em;color:#6E655C;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.session{margin-left:auto;display:inline-flex;align-items:center;gap:6px;flex-shrink:0;font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:.08em;color:#2C5A3A;background:rgba(44,90,58,.1);border:1px solid rgba(44,90,58,.3);border-radius:999px;padding:4px 9px}
.session::before{content:"";width:6px;height:6px;border-radius:50%;background:#7fce9b}

.workspace{display:grid;grid-template-columns:214px 1fr}
.rail{background:linear-gradient(170deg,#FAF6F0,#F1EAE1);border-right:1px solid #E7E2D6;padding:20px 16px;display:flex;flex-direction:column;gap:7px}
.railhead{font-family:'IBM Plex Mono',monospace;font-size:9.5px;letter-spacing:.14em;color:#6E655C;margin-bottom:4px}
.railstep{display:flex;align-items:center;gap:9px;padding:8px 5px;color:#6E655C;font-size:12px}
.railstep .n{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;border:1px solid #D8CEC2;background:#fff;font-family:'IBM Plex Mono',monospace;font-size:10px;flex:none}
.railstep.active{color:#12110F;font-weight:700}.railstep.active .n{background:#E4002B;border-color:#E4002B;color:#fff}
.railnote{margin-top:auto;padding-top:16px;font-size:11.5px;line-height:1.55;color:#6E655C}
.main{padding:clamp(18px,2.4vw,26px);min-width:0}
.tabs{display:flex;gap:6px;flex-wrap:wrap}
.tab{min-height:42px;display:inline-flex;align-items:center;padding:0 16px;border-radius:12px 12px 0 0;border:1px solid #E2DACF;background:#F4F1EA;color:#5E594F;font-weight:700;font-size:13px}
.tab.active{background:#12110F;color:#fff;border-color:#12110F}
.panel{background:#fff;border:1px solid #E7E2D6;border-radius:0 0 18px 18px;padding:28px}
.progress{display:flex;align-items:center;gap:6px;overflow-x:auto;padding-bottom:12px}
.progress .p{display:flex;align-items:center;gap:6px;flex-shrink:0}.progress .p .pn{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;border:1px solid #D8CEC2;background:#fff;color:#6E655C;font-family:'IBM Plex Mono',monospace;font-size:10px}.progress .p.active .pn{background:#E4002B;border-color:#E4002B;color:#fff}.progress .lab{font-size:11px;color:#454039;white-space:nowrap}.pline{width:14px;height:1px;background:#E7E2D6}
.stepbox{margin-top:14px;background:#F4F1EA;border-radius:14px;padding:22px}
.stepmeta{font-family:'IBM Plex Mono',monospace;font-size:11px;color:#C4001F}
.stepbox h2{font-family:'Archivo',sans-serif;font-weight:800;font-size:18px;margin:14px 0 4px;color:#12110F}
.sub{font-size:13px;line-height:1.55;color:#454039;margin:0 0 14px;max-width:70ch}

.route-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:0 0 18px}
.route{position:relative;appearance:none;text-align:left;border:1px solid #DDD4C8;background:#fff;border-radius:14px;padding:15px 15px 14px 17px;min-height:104px;color:#12110F}
.route::before{content:"";position:absolute;left:0;top:13px;bottom:13px;width:3px;border-radius:0 3px 3px 0;background:#D7CDC0}
.route:hover{border-color:#BFB3A3}.route.active{border-color:#E4002B;box-shadow:0 0 0 1px #E4002B;background:#fff}.route.active::before{background:#E4002B}
.route small{display:block;font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:.1em;color:#C4001F;margin-bottom:0}.route strong{display:block;font-family:'Archivo',sans-serif;font-size:15px;line-height:1.25;margin-top:7px}.route span{display:block;color:#6E655C;font-size:12px;line-height:1.4;margin-top:5px}
.section-title{font-family:'Archivo',sans-serif;font-size:16px;font-weight:800;margin:8px 0 12px}
.fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}.field{min-width:0}.field.full{grid-column:1/-1}
label{display:block;font-size:12px;color:#454039;margin-bottom:6px;font-weight:600}
input,select{width:100%;min-height:44px;padding:0 14px;border-radius:11px;background:#fff;border:1px solid #D9D0C3;color:#12110F;font-size:14px}
input:focus,select:focus{outline:3px solid rgba(228,0,43,.14);border-color:#E4002B}
.money{position:relative}.money span{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#6E655C}.money input{padding-left:34px}
.bool{display:flex;gap:8px}.bool button{min-height:44px;flex:1;border:1px solid #D9D0C3;background:#fff;border-radius:11px;color:#454039;font-weight:700}.bool button.active{background:#12110F;color:#fff;border-color:#12110F}
.combo{position:relative}.combo input{padding-right:42px}.arrow{position:absolute;right:14px;top:50%;transform:translateY(-50%);pointer-events:none;color:#6E655C}
.listbox{position:absolute;left:0;right:0;top:calc(100% + 5px);z-index:30;display:none;max-height:250px;overflow:auto;background:#fff;border:1px solid #BFB3A3;border-radius:11px;box-shadow:0 18px 40px -24px rgba(0,0,0,.4);padding:5px}.listbox.open{display:block}
.option{padding:10px 11px;border-radius:8px}.option:hover,.option.active{background:#F4F1EA}.option.fallback{border-top:1px solid #E7E2D6;margin-top:4px;color:#C4001F;font-weight:700}
.hint{font-size:11.5px;color:#6E655C;line-height:1.45;margin-top:6px}
.assist{display:none;margin-top:10px;padding:16px;background:#fff;border:1px solid #E2DACF;border-left:3px solid #E4002B;border-radius:12px;line-height:1.5;color:#514A43}.assist.show{display:block}.assist strong{font-family:'Archivo',sans-serif;color:#12110F}
.footer{margin-top:18px;padding-top:16px;border-top:1px solid #E7E2D6}
.continue{width:100%;min-height:48px;border:1px solid #E4002B;border-radius:12px;background:#E4002B;color:#fff;padding:0 20px;font-weight:800}.continue:hover{background:#C4001F}.continue:disabled{background:#B9B1A8;border-color:#B9B1A8;cursor:not-allowed}
.state{min-height:20px;margin-top:10px;color:#5E594F;font-size:12px;line-height:1.5}
.note{margin-top:14px;color:#6E655C;font-size:11.5px;line-height:1.5}

@media(max-width:900px){.workspace{grid-template-columns:1fr}.rail{flex-direction:row;overflow-x:auto;border-right:none;border-bottom:1px solid #E7E2D6;align-items:center}.railhead,.railnote{display:none}}
@media(max-width:680px){.shell{padding-left:14px;padding-right:14px}.panel{padding:18px}.route-grid,.fields{grid-template-columns:1fr}.field.full{grid-column:auto}.session{display:none}.page-title{font-size:clamp(32px,11vw,46px)}}
</style>

</head>
<body>
<main class="vl-screen">
  <div class="shell">
    <div class="kicker">COTIZAR Y COMPARAR · A&amp;S</div>
    <h1 class="page-title">Compara con criterio, no solo por precio.</h1>
    <section class="card" aria-label="Cotizador y comparador A&S">
      <div class="chrome">
        <span class="dot red"></span><span class="dot"></span><span class="dot"></span>
        <span class="chrome-label">A&amp;S · espacio de cotización</span>
        <span class="session">SESIÓN DE COTIZACIÓN</span>
      </div>
      <div class="workspace">
        <aside class="rail" aria-label="Recorrido">
          <div class="railhead">RECORRIDO</div>
          <div class="railstep active"><span class="n">1</span><span>Necesidad</span></div>
          <div class="railstep"><span class="n">2</span><span>Elegibilidad</span></div>
          <div class="railstep"><span class="n">3</span><span>Datos</span></div>
          <div class="railstep"><span class="n">4</span><span>Alternativas</span></div>
          <div class="railstep"><span class="n">5</span><span>Comparar</span></div>
          <div class="railstep"><span class="n">6</span><span>Elegir</span></div>
          <div class="railstep"><span class="n">7</span><span>Continuar</span></div>
          <div class="railnote">Comparamos solo alternativas normalizadas. Lo que no se puede normalizar sale del comparador y pasa a un asesor.</div>
        </aside>
        <div class="main">
          <div class="tabs"><span class="tab active">Cotización en línea</span><span class="tab">Con acompañamiento</span></div>
          <div class="panel">
            <div class="progress" aria-label="Progreso">
              <div class="p active"><span class="pn">1</span><span class="lab">Necesidad</span><span class="pline"></span></div>
              <div class="p"><span class="pn">2</span><span class="lab">Elegibilidad</span><span class="pline"></span></div>
              <div class="p"><span class="pn">3</span><span class="lab">Datos</span><span class="pline"></span></div>
              <div class="p"><span class="pn">4</span><span class="lab">Alternativas</span><span class="pline"></span></div>
              <div class="p"><span class="pn">5</span><span class="lab">Comparar</span><span class="pline"></span></div>
              <div class="p"><span class="pn">6</span><span class="lab">Elegir</span><span class="pline"></span></div>
              <div class="p"><span class="pn">7</span><span class="lab">Continuar</span></div>
            </div>
            <div class="stepbox">
              <div class="stepmeta">PASO 1 DE 7 · NECESIDAD</div>
              <h2>¿Qué quieres proteger?</h2>
              <p class="sub">Elige el punto de partida. Ajustamos las preguntas al producto y al contexto.</p>
              <div id="routeGrid" class="route-grid" aria-label="Familias de protección"></div>
              <div class="section-title" id="sectionTitle">Cuéntanos lo necesario para empezar</div>
              <div id="fields" class="fields"></div>
              <div id="assist" class="assist" aria-live="polite">No te obligaremos a escoger una opción incorrecta. Podemos continuar con orientación asistida.</div>
              <div class="footer"><button id="continueBtn" class="continue" disabled>Continuar</button><div id="state" class="state" aria-live="polite"></div>
              <div class="note">La disponibilidad de cotización en línea depende del producto y de la información validada.</div></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</main>
<script>
(()=>{
 const MANIFEST=${safeManifest},ROUTES=${safeRoutes},API='${CATALOG_PATH}';
 const grid=document.getElementById('routeGrid'),fields=document.getElementById('fields'),continueBtn=document.getElementById('continueBtn'),stateEl=document.getElementById('state'),assist=document.getElementById('assist'),sectionTitle=document.getElementById('sectionTitle');
 let currentRoute=null,currentSchema=null,answers={},assisted=false,brands=[],models=[],selectedBrand=null,selectedModel=null,brandActive=-1,modelActive=-1;
 const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 const clean=v=>String(v==null?'':v).trim(),up=v=>clean(v).toUpperCase();
 const norm=s=>String(s||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim(),compact=s=>norm(s).replace(/[^A-Z0-9]/g,'');
 const qp=o=>new URLSearchParams(Object.fromEntries(Object.entries(o).filter(([,v])=>v!==''&&v!=null))).toString();
 async function getCatalog(op,args={}){const r=await fetch(API+'?'+qp({op,...args}),{headers:{accept:'application/json'}});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.code||'CATALOG_UNAVAILABLE');return j}
 function scopeMatch(rule,value){return !clean(rule)||rule==='*'||up(rule)===up(value)}
 function resolveSchema(ctx){return (MANIFEST.intakeSchemas||[]).filter(s=>s.enabled===true).find(s=>scopeMatch(s.scope.country,ctx.country)&&scopeMatch(s.scope.lineOfBusiness,ctx.lineOfBusiness)&&scopeMatch(s.scope.productId,ctx.productId)&&scopeMatch(s.scope.riskType,ctx.riskType)&&scopeMatch(s.scope.insurerId||'*',ctx.insurerId||'')&&scopeMatch(s.scope.planId||'*',ctx.planId||''))||null}
 function conditionOk(c){const actual=answers[c.fieldKey],op=up(c.operator);if(op==='EQUALS')return actual===c.value;if(op==='NOT_EQUALS')return actual!==c.value;if(op==='PRESENT')return actual!==undefined&&actual!==null&&clean(actual)!=='';if(op==='ABSENT')return actual===undefined||actual===null||clean(actual)==='';return false}
 function visible(f){return !(f.conditions||[]).length||(f.conditions||[]).every(conditionOk)}
 function requiredMissing(){if(assisted)return[];return(currentSchema?.fields||[]).filter(visible).filter(f=>f.required).filter(f=>{const v=answers[f.key];return v===undefined||v===null||clean(v)===''}).map(f=>f.key)}
 function sync(){const missing=requiredMissing();continueBtn.disabled=assisted?false:(!currentSchema||missing.length>0);continueBtn.textContent=assisted?'Continuar con orientación':'Continuar';assist.classList.toggle('show',assisted)}
 function routeButtons(){grid.innerHTML=ROUTES.map(r=>'<button class="route" data-route="'+esc(r.id)+'"><small>'+esc(r.group)+'</small><strong>'+esc(r.label)+'</strong><span>'+esc(r.description)+'</span></button>').join('');grid.addEventListener('click',e=>{const b=e.target.closest('[data-route]');if(b)selectRoute(b.dataset.route)})}
 function selectRoute(id){currentRoute=ROUTES.find(r=>r.id===id)||ROUTES[0];currentSchema=currentRoute.mode==='SCHEMA'?resolveSchema(currentRoute.context):null;answers={};assisted=currentRoute.mode==='ASSISTED_DISCOVERY'||!currentSchema;selectedBrand=null;selectedModel=null;brands=[];models=[];[...grid.querySelectorAll('.route')].forEach(b=>b.classList.toggle('active',b.dataset.route===currentRoute.id));stateEl.textContent='';sectionTitle.textContent=assisted?'Te orientamos para continuar':'Cuéntanos lo necesario para empezar';renderFields()}
 function genericField(f){const id='f_'+f.key,full=(f.type==='TEXT'||f.type==='MONEY')?' full':'';if(f.type==='SELECT'){const opts=((f.ui&&f.ui.options)||[]).map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('');return'<div class="field'+full+'" data-wrap="'+esc(f.key)+'"><label for="'+id+'">'+esc(f.label)+'</label><select id="'+id+'" data-key="'+esc(f.key)+'"><option value="">Selecciona una opción</option>'+opts+'</select></div>'}if(f.type==='BOOLEAN')return'<div class="field'+full+'" data-wrap="'+esc(f.key)+'"><label>'+esc(f.label)+'</label><div class="bool"><button type="button" data-bool-key="'+esc(f.key)+'" data-bool-value="true">Sí</button><button type="button" data-bool-key="'+esc(f.key)+'" data-bool-value="false">No</button></div></div>';if(f.type==='MONEY')return'<div class="field full" data-wrap="'+esc(f.key)+'"><label for="'+id+'">'+esc(f.label)+'</label><div class="money"><span>$</span><input id="'+id+'" data-key="'+esc(f.key)+'" inputmode="decimal" type="number" min="0" step="any" placeholder="Valor aproximado"></div><div class="hint">Este dato orienta la solicitud; no calcula una prima en esta vista previa.</div></div>';return'<div class="field'+full+'" data-wrap="'+esc(f.key)+'"><label for="'+id+'">'+esc(f.label)+'</label><input id="'+id+'" data-key="'+esc(f.key)+'" type="'+(f.type==='INTEGER'?'number':'text')+'"></div>'}
 function vehicleField(f){const ctl=up(f.ui&&f.ui.control);if(ctl==='VEHICLE_BRAND_COMBOBOX')return'<div class="field full"><label id="brandLabel" for="brandInput">'+esc(f.label)+'</label><div class="combo" id="brandCombo"><input id="brandInput" autocomplete="off" role="combobox" aria-labelledby="brandLabel" aria-autocomplete="list" aria-expanded="false" aria-controls="brandList" placeholder="Escribe para buscar"><span class="arrow">▼</span><div id="brandList" class="listbox" role="listbox"></div></div><div class="hint">Escribe algunas letras y elige la marca en la misma lista.</div></div>';if(ctl==='VEHICLE_MODEL_COMBOBOX')return'<div class="field full"><label id="modelLabel" for="modelInput">'+esc(f.label)+'</label><div class="combo" id="modelCombo"><input id="modelInput" autocomplete="off" role="combobox" aria-labelledby="modelLabel" aria-autocomplete="list" aria-expanded="false" aria-controls="modelList" placeholder="Selecciona primero la marca" disabled><span class="arrow">▼</span><div id="modelList" class="listbox" role="listbox"></div></div><div class="hint">La lista depende de la marca seleccionada.</div></div>';if(ctl==='VEHICLE_YEAR_SELECT')return'<div class="field full"><label for="yearSelect">'+esc(f.label)+'</label><select id="yearSelect" data-key="'+esc(f.key)+'"><option value="">Selecciona el año</option></select><div class="hint">El año permanece separado del nombre del modelo.</div></div>';return genericField(f)}
 function renderFields(){if(!currentSchema){fields.innerHTML='<div class="field full"><div class="assist show"><strong>'+esc(currentRoute.family)+'</strong><br>Esta vista previa todavía no carga un schema autoritativo para esta familia. La experiencia correcta es continuar con orientación asistida, no inventar preguntas, coberturas ni tarifas.</div></div>';assisted=true;sync();return}fields.innerHTML=(currentSchema.fields||[]).filter(visible).map(f=>(f.ui&&f.ui.control)?vehicleField(f):genericField(f)).join('');bindGeneric();fields.querySelectorAll('[data-key]').forEach(el=>{const v=answers[el.dataset.key];if(v!==undefined&&v!==null&&typeof v!=='object')el.value=String(v)});fields.querySelectorAll('[data-bool-key]').forEach(btn=>{const k=btn.dataset.boolKey;if(answers[k]!==undefined)btn.classList.toggle('active',String(answers[k])===btn.dataset.boolValue)});bindVehicle();sync()}
 function drivesCondition(key){return(currentSchema?.fields||[]).some(f=>(f.conditions||[]).some(c=>c.fieldKey===key))} function bindGeneric(){fields.querySelectorAll('[data-key]').forEach(el=>{const save=()=>{const key=el.dataset.key;answers[key]=el.value;stateEl.textContent='';if(drivesCondition(key))renderFields();else sync()};el.addEventListener('input',save);el.addEventListener('change',save)});fields.querySelectorAll('[data-bool-key]').forEach(btn=>btn.addEventListener('click',()=>{const key=btn.dataset.boolKey;answers[key]=btn.dataset.boolValue==='true';stateEl.textContent='';if(drivesCondition(key))renderFields();else sync()}))}
 function open(list,input){list.classList.add('open');input.setAttribute('aria-expanded','true')}function close(list,input){list.classList.remove('open');input.setAttribute('aria-expanded','false')}
 function fallbackHtml(kind){return kind==='brand'?'<div class="option fallback" role="option" data-fallback="brand">No encuentro mi marca</div>':'<div class="option fallback" role="option" data-fallback="model">No encuentro mi línea / modelo</div>'}
 function renderBrands(){const input=document.getElementById('brandInput'),list=document.getElementById('brandList');if(!input||!list)return;const q=norm(input.value),rows=brands.filter(x=>!q||norm(x.label).includes(q)).slice(0,60);brandActive=-1;list.innerHTML=rows.map((x,i)=>'<div class="option" role="option" id="b'+i+'" data-id="'+esc(x.brandId)+'" data-label="'+esc(x.label)+'">'+esc(x.label)+'</div>').join('')+fallbackHtml('brand');open(list,input)}
 function renderModels(){const input=document.getElementById('modelInput'),list=document.getElementById('modelList');if(!input||!list)return;const q=compact(input.value),rows=models.filter(x=>!q||compact(x.label).includes(q)).slice(0,80);modelActive=-1;list.innerHTML=rows.map((x,i)=>'<div class="option" role="option" id="m'+i+'" data-id="'+esc(x.modelId)+'" data-label="'+esc(x.label)+'">'+esc(x.label)+'</div>').join('')+fallbackHtml('model');open(list,input)}
 async function loadBrands(){try{const j=await getCatalog('brands',{vehicleClass:'AUTO_LIGHT',limit:200});brands=j.items||[]}catch(e){stateEl.textContent='No fue posible cargar el catálogo en este momento.'}}
 async function loadModels(){if(!selectedBrand)return;try{const j=await getCatalog('models',{vehicleClass:'AUTO_LIGHT',brandId:selectedBrand.brandId,limit:200});models=j.items||[]}catch(e){stateEl.textContent='No fue posible cargar los modelos en este momento.'}}
 async function loadYears(){const el=document.getElementById('yearSelect');if(!el)return;try{const j=await getCatalog('years');el.innerHTML='<option value="">Selecciona el año</option>'+(j.items||[]).map(v=>'<option value="'+v+'">'+v+'</option>').join('')}catch(e){stateEl.textContent='No fue posible cargar los años en este momento.'}}
 function chooseBrand(el){selectedBrand={brandId:el.dataset.id,label:el.dataset.label};answers.brand=selectedBrand;const input=document.getElementById('brandInput'),list=document.getElementById('brandList');input.value=selectedBrand.label;close(list,input);selectedModel=null;delete answers.model;const mi=document.getElementById('modelInput');if(mi){mi.disabled=false;mi.value='';mi.placeholder='Escribe para buscar'}assisted=false;loadModels();sync()}
 function chooseModel(el){selectedModel={modelId:el.dataset.id,label:el.dataset.label};answers.model=selectedModel;const input=document.getElementById('modelInput'),list=document.getElementById('modelList');input.value=selectedModel.label;close(list,input);assisted=false;sync()}
 function useFallback(kind){assisted=true;if(kind==='brand'){delete answers.brand;delete answers.model;selectedBrand=null;selectedModel=null}else{delete answers.model;selectedModel=null}const list=document.getElementById(kind==='brand'?'brandList':'modelList'),input=document.getElementById(kind==='brand'?'brandInput':'modelInput');if(list&&input)close(list,input);sync()}
 function keyboard(ev,list,input,kind){const options=[...list.querySelectorAll('.option:not(.fallback)')];let active=kind==='brand'?brandActive:modelActive;if(ev.key==='ArrowDown'){ev.preventDefault();active=Math.min(active+1,options.length-1)}else if(ev.key==='ArrowUp'){ev.preventDefault();active=Math.max(active-1,0)}else if(ev.key==='Enter'&&active>=0&&options[active]){ev.preventDefault();kind==='brand'?chooseBrand(options[active]):chooseModel(options[active]);return}else if(ev.key==='Escape'){close(list,input);return}else return;options.forEach((o,i)=>o.classList.toggle('active',i===active));if(options[active])options[active].scrollIntoView({block:'nearest'});if(kind==='brand')brandActive=active;else modelActive=active}
 function bindVehicle(){const bi=document.getElementById('brandInput'),bl=document.getElementById('brandList'),mi=document.getElementById('modelInput'),ml=document.getElementById('modelList');if(bi&&bl){loadBrands();bi.addEventListener('focus',renderBrands);bi.addEventListener('input',()=>{delete answers.brand;delete answers.model;selectedBrand=null;selectedModel=null;if(mi){mi.disabled=true;mi.value=''}renderBrands();sync()});bi.addEventListener('keydown',e=>keyboard(e,bl,bi,'brand'));bl.addEventListener('mousedown',e=>{e.preventDefault();const x=e.target.closest('.option');if(!x)return;x.dataset.fallback?useFallback('brand'):chooseBrand(x)})}if(mi&&ml){mi.addEventListener('focus',()=>{if(selectedBrand)renderModels()});mi.addEventListener('input',()=>{delete answers.model;selectedModel=null;renderModels();sync()});mi.addEventListener('keydown',e=>keyboard(e,ml,mi,'model'));ml.addEventListener('mousedown',e=>{e.preventDefault();const x=e.target.closest('.option');if(!x)return;x.dataset.fallback?useFallback('model'):chooseModel(x)})}if(document.getElementById('yearSelect'))loadYears()}
 continueBtn.addEventListener('click',()=>{if(continueBtn.disabled)return;stateEl.textContent=assisted?'Este recorrido queda listo para orientación asistida. No se inventó ningún requisito de producto.':'Los datos necesarios de este paso están completos. El siguiente paso no está conectado en esta vista previa.'});
 routeButtons();fields.innerHTML='';sectionTitle.textContent='Elige una familia para continuar';sync();
})();
</script>
</body></html>`;
}

function handler(req,res){
  securityHeaders(res);
  if(req.method!=='GET'){res.set('Allow','GET');return res.status(405).send('Método no permitido.');}
  res.set('Content-Type','text/html; charset=utf-8');
  return res.status(200).send(html());
}

const cotcompApprovedVisualPreviewS487=onRequest({
  region:REGION,timeoutSeconds:30,memory:'256MiB',maxInstances:2,concurrency:40,invoker:'public'
},handler);

module.exports=Object.freeze({
  VERSION,PROJECT_ID,REGION,FUNCTION_NAME,CATALOG_PATH,ROUTES,PROMOTED_VISUAL_PARENT_SHA,
  fixtureManifest,securityHeaders,html,handler,cotcompApprovedVisualPreviewS487
});
