'use strict';

const {onRequest}=require('firebase-functions/v2/https');
const S=require('./cotcomp-gravicentra-provider-contract-s484');

const VERSION='ays-cotcomp-s488-exact-promoted-frontend-recovery-v1.0';
const PROJECT_ID='ays-orbit-360-lab';
const REGION='us-central1';
const FUNCTION_NAME='cotcompExactPromotedPreviewS488';
const CATALOG_PATH='/cotcompVehicleCatalogS479';
const PROMOTED_VISUAL_PARENT_SHA='50aa4190ae22ad13760f893b9bf37415abe35fb7327e034f66dc565b9b2cbf1d';
const PROMOTED_COTCOMP_SECTION_SHA='b97c01a27ac1ee6c16236b6582f0a411287ba3f88f960fca7278b37c35fbf8ed';
const PROMOTED_COTCOMP_CSS_SHA='bc0fe9e165c9a2007b6970e9d79157239fb252457895d2957e96b7ae53780dbf';

function fixtureManifest(){
  return S.normalizeProviderManifest({
    authority:'GRAVICENTRA',
    tenantId:'alianzas-soluciones',
    country:'MULTI',
    configurationVersion:'fixture-s488-v1',
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
  if(!validation.ok) throw new Error('S488_FIXTURE_MANIFEST_INVALID:'+validation.errors.join(','));

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
body{margin:0;background:#F4F1EA;color:#12110F;font-family:'Instrument Sans',system-ui,sans-serif}
button,input,select{font:inherit}
button{cursor:pointer}
:focus-visible{outline:3px solid #E4002B;outline-offset:2px}
.vl-wsurf{margin-top:6px;border-radius:22px;overflow:hidden;background:#fff;border:1px solid #E2DACF;box-shadow:0 44px 90px -54px rgba(40,10,18,.6),0 4px 12px -6px rgba(40,10,18,.14)}
.vl-wsurf-chrome{display:flex;align-items:center;gap:7px;padding:12px 16px;background:linear-gradient(180deg,#F7F2EA,#EFE8DE);border-bottom:1px solid #E2DACF}
.vl-wsurf-dot{width:9px;height:9px;border-radius:50%;background:#D3C7BE}
.vl-wsurf-url{margin-left:10px;font-family:'IBM Plex Mono';font-size:10px;letter-spacing:.06em;color:#6E655C;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vl-wsurf-badge{margin-left:auto;display:inline-flex;align-items:center;gap:6px;flex-shrink:0;font-family:'IBM Plex Mono';font-size:9px;letter-spacing:.08em;color:#2C5A3A;background:rgba(44,90,58,.1);border:1px solid rgba(44,90,58,.3);border-radius:999px;padding:4px 9px}
.vl-wsurf-body{display:grid;grid-template-columns:214px 1fr}
.vl-wsurf-rail{background:linear-gradient(170deg,#FAF6F0,#F1EAE1);border-right:1px solid #E7E2D6;padding:20px 16px;display:flex;flex-direction:column;gap:7px}
.vl-wsurf-railhead{font-family:'IBM Plex Mono';font-size:9.5px;letter-spacing:.14em;color:#6E655C;margin-bottom:4px}
.vl-wsurf-note{margin-top:auto;padding-top:16px;font-size:11.5px;line-height:1.55;color:#6E655C}
.vl-wsurf-main{padding:clamp(18px,2.4vw,26px);min-width:0}
@media(max-width:900px){.vl-wsurf-body{grid-template-columns:1fr}.vl-wsurf-rail{flex-direction:row;overflow-x:auto;scrollbar-width:none;border-right:none;border-bottom:1px solid #E7E2D6;align-items:center}.vl-wsurf-railhead,.vl-wsurf-note{display:none}}
@media(max-width:640px){.vl-2{grid-template-columns:1fr!important}}
</style>
</head>
<body>
<section class="vl-screen" data-screen-label="Cotizar y comparar" style="background:#F4F1EA;min-height:80vh;">
  <div style="max-width:1120px;margin:0 auto;padding:clamp(36px,5vh,64px) clamp(20px,3vw,44px);">
    <div style="font-family:'IBM Plex Mono';font-size:12px;letter-spacing:.14em;color:#C4001F;display:flex;align-items:center;gap:10px;"><span style="width:30px;height:2px;background:#E4002B;"></span>COTIZAR Y COMPARAR · GUATEMALA</div>
    <h1 style="font-family:'Archivo';font-weight:900;font-size:clamp(30px,4vw,56px);line-height:.95;letter-spacing:-.03em;margin:14px 0 22px;">Compara con criterio, no solo por precio.</h1>
    <div class="vl-wsurf">
      <div class="vl-wsurf-chrome">
        <span class="vl-wsurf-dot" style="background:#E4002B;"></span><span class="vl-wsurf-dot"></span><span class="vl-wsurf-dot"></span>
        <span class="vl-wsurf-url">cotizador.aysseguros.com · espacio de trabajo</span>
        <span class="vl-wsurf-badge"><span style="width:6px;height:6px;border-radius:50%;background:#7fce9b;"></span>SESIÓN DE COTIZACIÓN</span>
      </div>
      <div class="vl-wsurf-body">
        <div id="rail" class="vl-wsurf-rail">
          <div class="vl-wsurf-railhead">RECORRIDO</div>
          <div class="vl-wsurf-note">Comparamos solo alternativas normalizadas. Lo que no se puede normalizar sale del comparador y pasa a un asesor.</div>
        </div>
        <div class="vl-wsurf-main">
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button id="autoTab" type="button" aria-pressed="true" style="flex:1;min-height:52px;border-radius:13px 13px 0 0;border:1px solid #E7E2D6;border-bottom:none;font-family:inherit;font-weight:700;font-size:14px;cursor:pointer;background:#fff;color:#12110F;">Cotización en línea</button>
            <button id="hibTab" type="button" aria-pressed="false" style="flex:1;min-height:52px;border-radius:13px 13px 0 0;border:1px solid #E7E2D6;border-bottom:none;font-family:inherit;font-weight:700;font-size:14px;cursor:pointer;background:#EDE8DE;color:#5E594F;">Con acompañamiento</button>
          </div>
          <div id="autoPanel" style="background:#fff;border:1px solid #E7E2D6;border-radius:0 0 18px 18px;padding:28px;">
            <div id="stages" style="display:flex;align-items:center;gap:6px;overflow-x:auto;padding-bottom:12px;"></div>
            <div aria-live="polite" style="margin-top:14px;background:#F4F1EA;border-radius:14px;padding:22px;">
              <div id="meta" style="font-family:'IBM Plex Mono';font-size:11px;color:#C4001F;"></div>
              <div id="stepContent"></div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:18px;gap:12px;">
              <button id="backBtn" type="button" style="min-height:46px;padding:0 20px;border-radius:12px;background:#F4F1EA;border:1px solid #E7E2D6;color:#12110F;font-family:inherit;font-weight:600;font-size:14px;cursor:pointer;">← Atrás</button>
              <button id="nextBtn" type="button" style="min-height:46px;padding:0 22px;border-radius:12px;background:#E4002B;border:none;color:#fff;font-family:inherit;font-weight:700;font-size:14px;cursor:pointer;">Avanzar recorrido →</button>
            </div>
          </div>
          <div id="hybridPanel" style="display:none;background:#0E0D10;color:#F4F1EA;border-radius:0 0 18px 18px;padding:28px;">
            <div class="vl-2" style="display:grid;grid-template-columns:1fr .8fr;gap:26px;align-items:start;">
              <div>
                <div style="display:flex;gap:10px;align-items:flex-start;background:rgba(122,92,168,.14);border:1px solid rgba(122,92,168,.4);border-radius:12px;padding:16px;"><span style="width:28px;height:28px;border-radius:50%;background:#7A5CA8;color:#fff;display:grid;place-items:center;flex-shrink:0;">◑</span><div><div style="font-family:'Archivo';font-weight:700;font-size:17px;">Este riesgo lo trabajamos con un asesor</div><p style="font-size:13px;line-height:1.5;color:#CFC9BE;margin:6px 0 0;">No se cotiza en línea de forma directa. Guardamos tu contexto, preparamos propuestas y volvemos a ti con opciones válidas.</p></div></div>
                <div style="margin-top:18px;display:flex;flex-direction:column;gap:0;">
                  <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid #2a2833;"><span style="width:26px;height:26px;border-radius:50%;background:#1C1A21;border:1px solid #33323a;color:#FF7C8C;display:grid;place-items:center;font-family:'IBM Plex Mono';font-size:11px;">1</span><span style="font-size:14px;color:#EFEAE0;">Identificamos el riesgo y el producto</span></div>
                  <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid #2a2833;"><span style="width:26px;height:26px;border-radius:50%;background:#1C1A21;border:1px solid #33323a;color:#FF7C8C;display:grid;place-items:center;font-family:'IBM Plex Mono';font-size:11px;">2</span><span style="font-size:14px;color:#EFEAE0;">Pedimos solo los datos necesarios, por pasos</span></div>
                  <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid #2a2833;"><span style="width:26px;height:26px;border-radius:50%;background:#1C1A21;border:1px solid #33323a;color:#FF7C8C;display:grid;place-items:center;font-family:'IBM Plex Mono';font-size:11px;">3</span><span style="font-size:14px;color:#EFEAE0;">Consultamos el mercado y preparamos propuestas</span></div>
                  <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid #2a2833;"><span style="width:26px;height:26px;border-radius:50%;background:#1C1A21;border:1px solid #33323a;color:#FF7C8C;display:grid;place-items:center;font-family:'IBM Plex Mono';font-size:11px;">4</span><span style="font-size:14px;color:#EFEAE0;">Validamos y volvemos a ti con opciones reales</span></div>
                </div>
                <div style="margin-top:16px;display:inline-flex;align-items:center;gap:8px;background:rgba(176,131,20,.14);border:1px solid rgba(176,131,20,.4);border-radius:999px;padding:7px 14px;"><span style="width:8px;height:8px;border-radius:50%;background:#e0b45a;"></span><span style="font-family:'IBM Plex Mono';font-size:11px;color:#e0b45a;">Estado: solicitud recibida · en cotización</span></div>
              </div>
              <div style="background:#1C1A21;border:1px solid #2a2833;border-radius:16px;padding:22px;">
                <div style="font-family:'IBM Plex Mono';font-size:10.5px;color:#ADA69B;">ACOMPAÑAMIENTO A&S</div>
                <div id="hybridName" style="font-family:'Archivo';font-weight:700;font-size:17px;margin-top:12px;">Necesidad seleccionada</div>
                <p style="font-size:12.5px;line-height:1.55;color:#CFC9BE;margin:8px 0 0;">La captura de contacto real se habilitará únicamente cuando corresponda.</p>
                <button type="button" disabled style="margin-top:16px;width:100%;min-height:48px;border-radius:12px;background:#E4002B;border:none;color:#fff;font-family:inherit;font-weight:700;font-size:14px;opacity:.55;">Continuar con un asesor</button>
                <p style="font-size:11px;color:#ADA69B;margin:10px 0 0;line-height:1.5;">No decimos “cotización enviada” hasta que exista una propuesta validada.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <p style="font-size:12.5px;color:#454039;margin:16px 0 0;">El recorrido se adapta al producto que elijas y solo pide lo que hace falta en cada paso.</p>
  </div>
</section>
<script>
(()=>{
  const MANIFEST=${safeManifest};
  const ROUTES=${safeRoutes};
  const API='${CATALOG_PATH}';
  const STAGES=['Necesidad','Elegibilidad','Datos','Consultando mercado','Propuestas','Validación','Comparar','Recomendación'];
  const PRODUCT_META={
    vehicle:{label:'Auto',icon:'M5 13l1.6-4.6A2 2 0 018.5 7h7a2 2 0 011.9 1.4L19 13m-14 0h14v4h-2m-10 0H5v-4m3 4a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0m11 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0'},
    home:{label:'Hogar',icon:'M4 20V10l8-6 8 6v10M9 20v-6h6v6'},
    life:{label:'Vida',icon:'M12 21s-7-4.6-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.4-7 10-7 10z'},
    health:{label:'Salud / gastos médicos',icon:'M12 3a9 9 0 100 18 9 9 0 000-18M9 12h6M12 9v6'},
    business:{label:'Empresa',icon:'M4 20V7l8-4 8 4v13M8 20v-5h8v5M8 10h2M14 10h2'},
    cargo:{label:'Transporte / carga',icon:'M3 6h11v10H3zM14 10h4l3 3v3h-7zM7 19a2 2 0 100-4 2 2 0 000 4m10 0a2 2 0 100-4 2 2 0 000 4'},
    other:{label:'Otros / no sé cuál necesito',icon:'M12 18h.01M9.1 9a3 3 0 115.8 1c0 2-2.9 2.2-2.9 4'}
  };

  const rail=document.getElementById('rail');
  const stagesEl=document.getElementById('stages');
  const meta=document.getElementById('meta');
  const stepContent=document.getElementById('stepContent');
  const backBtn=document.getElementById('backBtn');
  const nextBtn=document.getElementById('nextBtn');
  const autoTab=document.getElementById('autoTab');
  const hibTab=document.getElementById('hibTab');
  const autoPanel=document.getElementById('autoPanel');
  const hybridPanel=document.getElementById('hybridPanel');
  const hybridName=document.getElementById('hybridName');

  let step=0;
  let currentRoute=ROUTES[0];
  let currentSchema=null;
  let validated=false;
  let brands=[],models=[],selectedBrand=null,selectedModel=null,selectedYear='';

  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const clean=v=>String(v==null?'':v).trim(),up=v=>clean(v).toUpperCase();
  const norm=s=>String(s||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
  const compact=s=>norm(s).replace(/[^A-Z0-9]/g,'');
  const qp=o=>new URLSearchParams(Object.fromEntries(Object.entries(o).filter(([,v])=>v!==''&&v!=null))).toString();

  function resolveSchema(route){
    if(!route||route.mode!=='SCHEMA')return null;
    return (MANIFEST.intakeSchemas||[]).find(s=>s.enabled===true &&
      up(s.scope.lineOfBusiness)===up(route.context.lineOfBusiness) &&
      clean(s.scope.productId)===clean(route.context.productId) &&
      up(s.scope.riskType)===up(route.context.riskType)
    )||null;
  }
  function isStructured(){return !!resolveSchema(currentRoute)}

  function renderRail(){
    rail.querySelectorAll('[data-rail]').forEach(x=>x.remove());
    const phases=[['1','Producto y contexto'],['2','Datos mínimos'],['3','Alternativas normalizadas'],['4','Decisión acompañada']];
    const cur=step<=1?1:(step<=2?2:(step<=5?3:4));
    const note=rail.querySelector('.vl-wsurf-note');
    phases.forEach((p,i)=>{
      const n=i+1,on=n===cur,done=n<cur;
      const div=document.createElement('div');div.dataset.rail='1';
      div.style.cssText='display:flex;align-items:center;gap:10px;flex-shrink:0;padding:10px 12px;border-radius:12px;font-size:12.5px;font-weight:600;transition:all .16s;'+(on?'background:#fff;color:#12110F;border:1px solid #E4002B;box-shadow:0 10px 22px -14px rgba(196,0,31,.6);':'background:transparent;color:#5E594F;border:1px solid transparent;');
      const dot=document.createElement('span');dot.textContent=done?'✓':p[0];
      dot.style.cssText="width:24px;height:24px;flex-shrink:0;border-radius:50%;display:grid;place-items:center;font-family:'IBM Plex Mono';font-size:11px;"+(on?'background:#E4002B;color:#fff;':done?'background:rgba(44,90,58,.14);color:#2C5A3A;border:1px solid rgba(44,90,58,.35);':'background:#EDE6DC;color:#6E655C;');
      const lab=document.createElement('span');lab.textContent=p[1];lab.style.lineHeight='1.25';
      div.append(dot,lab);rail.insertBefore(div,note);
    });
  }

  function renderStages(){
    stagesEl.innerHTML=STAGES.map((label,i)=>{
      const dot='min-width:40px;min-height:40px;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-family:"IBM Plex Mono";font-size:12px;font-weight:600;flex-shrink:0;'+(i<step?'background:#2C5A3A;color:#fff;':i===step?'background:#E4002B;color:#fff;box-shadow:0 0 0 4px rgba(228,0,43,.22);':'background:#fff;color:#8a5a12;border:1px solid #E7E2D6;');
      return '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;"><div style="'+dot+'">'+(i<step?'✓':i===step?String(i+1):'')+'</div><span style="font-size:11px;color:#454039;white-space:nowrap;">'+esc(label)+'</span>'+(i<STAGES.length-1?'<span style="width:14px;height:1px;background:#E7E2D6;"></span>':'')+'</div>';
    }).join('');
  }

  function productButtons(){
    return ROUTES.map(r=>{
      const p=PRODUCT_META[r.id];
      const on=currentRoute&&currentRoute.id===r.id;
      return '<button type="button" data-route="'+esc(r.id)+'" aria-pressed="'+String(on)+'" style="display:inline-flex;align-items:center;gap:8px;min-height:46px;padding:0 18px;border-radius:12px;font-family:inherit;font-weight:700;font-size:14px;cursor:pointer;transition:all .15s;'+(on?'background:#E4002B;border:1px solid #E4002B;color:#fff;':'background:#fff;border:1px solid #E7E2D6;color:#12110F;')+'"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="'+esc(p.icon)+'"></path></svg>'+esc(p.label)+'</button>';
    }).join('');
  }

  async function getCatalog(op,args={}){
    const r=await fetch(API+'?'+qp({op,...args}),{headers:{accept:'application/json'}});
    const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.code||'CATALOG_UNAVAILABLE');return j;
  }
  function open(list,input){list.style.display='block';input.setAttribute('aria-expanded','true')}
  function close(list,input){list.style.display='none';input.setAttribute('aria-expanded','false')}
  function listStyle(){return 'display:none;position:absolute;left:0;right:0;top:calc(100% + 5px);z-index:30;max-height:250px;overflow:auto;background:#fff;border:1px solid #BFB3A3;border-radius:11px;box-shadow:0 18px 40px -24px rgba(0,0,0,.4);padding:5px;'}
  function fallback(kind){return kind==='brand'?'<div data-fallback="brand" style="padding:10px 11px;border-top:1px solid #E7E2D6;margin-top:4px;color:#C4001F;font-weight:700;cursor:pointer;">No encuentro mi marca</div>':'<div data-fallback="model" style="padding:10px 11px;border-top:1px solid #E7E2D6;margin-top:4px;color:#C4001F;font-weight:700;cursor:pointer;">No encuentro mi línea / modelo</div>'}
  function renderBrands(){
    const input=document.getElementById('brandInput'),list=document.getElementById('brandList');if(!input||!list)return;
    const q=norm(input.value),rows=brands.filter(x=>!q||norm(x.label).includes(q)).slice(0,60);
    list.innerHTML=rows.map(x=>'<div data-id="'+esc(x.brandId)+'" data-label="'+esc(x.label)+'" style="padding:10px 11px;border-radius:8px;cursor:pointer;">'+esc(x.label)+'</div>').join('')+fallback('brand');open(list,input);
  }
  function renderModels(){
    const input=document.getElementById('modelInput'),list=document.getElementById('modelList');if(!input||!list)return;
    const q=compact(input.value),rows=models.filter(x=>!q||compact(x.label).includes(q)).slice(0,80);
    list.innerHTML=rows.map(x=>'<div data-id="'+esc(x.modelId)+'" data-label="'+esc(x.label)+'" style="padding:10px 11px;border-radius:8px;cursor:pointer;">'+esc(x.label)+'</div>').join('')+fallback('model');open(list,input);
  }
  async function loadBrands(){try{brands=(await getCatalog('brands',{vehicleClass:'AUTO_LIGHT',limit:200})).items||[]}catch{}}
  async function loadModels(){if(!selectedBrand)return;try{models=(await getCatalog('models',{vehicleClass:'AUTO_LIGHT',brandId:selectedBrand.brandId,limit:200})).items||[]}catch{}}
  async function loadYears(){const el=document.getElementById('yearSelect');if(!el)return;try{const j=await getCatalog('years');el.innerHTML='<option value="">Selecciona el año</option>'+(j.items||[]).map(v=>'<option value="'+v+'">'+v+'</option>').join('');if(selectedYear)el.value=selectedYear}catch{}}
  function bindVehicle(){
    const bi=document.getElementById('brandInput'),bl=document.getElementById('brandList'),mi=document.getElementById('modelInput'),ml=document.getElementById('modelList'),ys=document.getElementById('yearSelect');
    if(bi&&bl){loadBrands();if(selectedBrand)bi.value=selectedBrand.label;bi.addEventListener('focus',renderBrands);bi.addEventListener('input',()=>{selectedBrand=null;selectedModel=null;if(mi){mi.value='';mi.disabled=true}renderBrands()});bl.addEventListener('mousedown',e=>{e.preventDefault();const x=e.target.closest('[data-id],[data-fallback]');if(!x)return;if(x.dataset.fallback){showHybrid();return}selectedBrand={brandId:x.dataset.id,label:x.dataset.label};bi.value=selectedBrand.label;close(bl,bi);if(mi){mi.disabled=false;mi.value='';mi.placeholder='Escribe para buscar'}loadModels()})}
    if(mi&&ml){if(selectedBrand){mi.disabled=false;if(selectedModel)mi.value=selectedModel.label}mi.addEventListener('focus',()=>{if(selectedBrand)renderModels()});mi.addEventListener('input',()=>{selectedModel=null;renderModels()});ml.addEventListener('mousedown',e=>{e.preventDefault();const x=e.target.closest('[data-id],[data-fallback]');if(!x)return;if(x.dataset.fallback){showHybrid();return}selectedModel={modelId:x.dataset.id,label:x.dataset.label};mi.value=selectedModel.label;close(ml,mi)})}
    if(ys){loadYears();ys.addEventListener('change',()=>{selectedYear=ys.value})}
  }

  function renderStep(){
    renderRail();renderStages();currentSchema=resolveSchema(currentRoute);
    meta.textContent='PASO '+(step+1)+' DE '+STAGES.length+' · '+STAGES[step].toUpperCase();
    backBtn.disabled=step===0;
    nextBtn.disabled=false;
    nextBtn.textContent='Avanzar recorrido →';

    if(step===0){
      stepContent.innerHTML='<div style="font-family:\\'Archivo\\';font-weight:700;font-size:17px;margin:14px 0 4px;color:#12110F;">¿Qué quieres proteger?</div><p style="font-size:13px;color:#454039;margin:0 0 14px;">Elige el punto de partida. Ajustamos las preguntas al producto.</p><div style="display:flex;gap:8px;flex-wrap:wrap;">'+productButtons()+'</div>';
      stepContent.querySelectorAll('[data-route]').forEach(btn=>btn.addEventListener('click',()=>{currentRoute=ROUTES.find(r=>r.id===btn.dataset.route)||ROUTES[0];validated=false;renderStep()}));
    } else if(step===1){
      const ok=!!currentSchema;
      stepContent.innerHTML='<div style="font-family:\\'Archivo\\';font-weight:700;font-size:17px;margin:14px 0 4px;color:#12110F;">Veamos si aplica para cotización en línea</div><div style="display:flex;flex-direction:column;gap:10px;margin-top:12px;"><div style="background:#fff;border:1px solid #E7E2D6;border-radius:12px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;"><span style="font-size:14px;color:#12110F;">¿El bien/persona está en Guatemala?</span><span style="display:inline-flex;gap:6px;"><span style="font-family:\\'IBM Plex Mono\\';font-size:11px;padding:5px 12px;border-radius:8px;background:#E4002B;color:#fff;">Sí</span><span style="font-family:\\'IBM Plex Mono\\';font-size:11px;padding:5px 12px;border-radius:8px;background:#F4F1EA;border:1px solid #E7E2D6;color:#5E594F;">No</span></span></div><div style="background:#fff;border:1px solid #E7E2D6;border-radius:12px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;"><span style="font-size:14px;color:#12110F;">¿Es un riesgo estándar (sin condiciones especiales)?</span><span style="display:inline-flex;gap:6px;"><span style="font-family:\\'IBM Plex Mono\\';font-size:11px;padding:5px 12px;border-radius:8px;background:#E4002B;color:#fff;">Sí</span><span style="font-family:\\'IBM Plex Mono\\';font-size:11px;padding:5px 12px;border-radius:8px;background:#F4F1EA;border:1px solid #E7E2D6;color:#5E594F;">No</span></span></div></div>'+(ok?'<div style="display:inline-flex;align-items:center;gap:8px;background:rgba(44,90,58,.1);border:1px solid rgba(44,90,58,.35);border-radius:999px;padding:7px 14px;margin-top:12px;"><span style="width:8px;height:8px;border-radius:50%;background:#2C5A3A;"></span><span style="font-family:\\'IBM Plex Mono\\';font-size:11px;color:#2C5A3A;">Elegible para cotización en línea</span></div>':'<div style="background:#FFF6F7;border:1px solid #f1c9cf;border-radius:11px;padding:10px 14px;margin-top:12px;font-size:12.5px;color:#8a5a12;">Esta familia continuará con acompañamiento mientras no exista un esquema autoritativo cargado.</div>');
      if(!ok)nextBtn.textContent='Continuar con acompañamiento →';
    } else if(step===2){
      if(!currentSchema){showHybrid();return}
      if(currentRoute.id==='vehicle'){
        stepContent.innerHTML='<div style="font-family:\\'Archivo\\';font-weight:700;font-size:17px;margin:14px 0 4px;color:#12110F;">Solo los datos necesarios</div><p style="font-size:13px;color:#454039;margin:0 0 14px;">Los pedimos por pasos, no todos de golpe.</p><div class="vl-2" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;"><div style="grid-column:1/-1;"><label style="display:block;font-size:12px;color:#454039;margin-bottom:6px;">Marca</label><div style="position:relative;"><input id="brandInput" role="combobox" aria-expanded="false" autocomplete="off" placeholder="Escribe para buscar" style="width:100%;min-height:44px;padding:0 42px 0 14px;border-radius:11px;background:#fff;border:1px solid #E7E2D6;color:#12110F;font-family:inherit;font-size:14px;"><span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);color:#6E655C;">▼</span><div id="brandList" style="'+listStyle()+'"></div></div></div><div style="grid-column:1/-1;"><label style="display:block;font-size:12px;color:#454039;margin-bottom:6px;">Línea / modelo</label><div style="position:relative;"><input id="modelInput" role="combobox" aria-expanded="false" autocomplete="off" placeholder="Selecciona primero la marca" disabled style="width:100%;min-height:44px;padding:0 42px 0 14px;border-radius:11px;background:#fff;border:1px solid #E7E2D6;color:#12110F;font-family:inherit;font-size:14px;"><span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);color:#6E655C;">▼</span><div id="modelList" style="'+listStyle()+'"></div></div></div><div><label style="display:block;font-size:12px;color:#454039;margin-bottom:6px;">Año</label><select id="yearSelect" style="width:100%;min-height:44px;padding:0 14px;border-radius:11px;background:#fff;border:1px solid #E7E2D6;color:#12110F;font-family:inherit;font-size:14px;"><option value="">Selecciona el año</option></select></div><div><label style="display:block;font-size:12px;color:#454039;margin-bottom:6px;">Uso</label><input type="text" value="Particular" readonly style="width:100%;min-height:44px;padding:0 14px;border-radius:11px;background:#fff;border:1px solid #E7E2D6;color:#12110F;font-family:inherit;font-size:14px;"></div></div>';
        bindVehicle();
      } else {
        stepContent.innerHTML='<div style="font-family:\\'Archivo\\';font-weight:700;font-size:17px;margin:14px 0 4px;color:#12110F;">Solo los datos necesarios</div><p style="font-size:13px;color:#454039;margin:0;">Este preview conserva la estructura aprobada. Los campos productivos vendrán del esquema autoritativo del producto.</p>';
      }
    } else if(step===3 || step===4){
      stepContent.innerHTML='<div style="display:flex;align-items:center;gap:12px;margin-top:12px;"><span style="width:22px;height:22px;border-radius:50%;border:2.5px solid #E7E2D6;border-top-color:#E4002B;"></span><span style="font-size:15px;color:#12110F;">Estamos consultando el mercado y preparando propuestas. Esto no siempre es instantáneo.</span></div>';
    } else if(step===5 && !validated){
      stepContent.innerHTML='<div class="vl-2" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;"><div style="background:#fff;border:1px solid #E7E2D6;border-radius:14px;padding:18px;"><div style="font-weight:700;font-family:\\'Archivo\\';">Aseguradora A</div><span style="display:inline-flex;margin-top:8px;font-family:\\'IBM Plex Mono\\';font-size:10px;padding:3px 8px;border-radius:6px;background:rgba(44,90,58,.1);color:#2C5A3A;border:1px solid rgba(44,90,58,.35);">● Validada</span></div><div style="background:#fff;border:1px solid #E7E2D6;border-radius:14px;padding:18px;"><div style="font-weight:700;font-family:\\'Archivo\\';">Aseguradora B</div><span style="display:inline-flex;margin-top:8px;font-family:\\'IBM Plex Mono\\';font-size:10px;padding:3px 8px;border-radius:6px;background:rgba(176,131,20,.14);color:#8a5a12;border:1px solid rgba(176,131,20,.4);">◐ Recibida · por validar</span></div></div><p style="font-size:13px;color:#454039;margin:12px 0 0;">Una propuesta recién recibida aún no se compara. Solo las propuestas validadas entran a la comparación.</p><button id="validateBtn" type="button" style="min-height:46px;margin-top:14px;padding:0 18px;border-radius:12px;background:#12110F;border:none;color:#fff;font-family:inherit;font-weight:700;font-size:13.5px;cursor:pointer;">Validar propuesta del preview</button>';
      document.getElementById('validateBtn').addEventListener('click',()=>{validated=true;step=6;renderStep()});
      nextBtn.disabled=true;
    } else {
      stepContent.innerHTML='<div class="vl-2" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;"><div style="background:#fff;border:1px solid #E7E2D6;border-radius:14px;padding:18px;"><div style="font-family:\\'IBM Plex Mono\\';font-size:10px;color:#2C5A3A;">PROPUESTA VALIDADA</div><div style="font-family:\\'Archivo\\';font-weight:800;font-size:20px;margin-top:6px;">Q 2,180</div><p style="font-size:12.5px;line-height:1.55;color:#454039;margin:8px 0 0;">Alternativa A · valor ilustrativo del preview.</p></div><div style="background:#fff;border:1px solid #E7E2D6;border-radius:14px;padding:18px;"><div style="font-family:\\'IBM Plex Mono\\';font-size:10px;color:#2C5A3A;">PROPUESTA VALIDADA</div><div style="font-family:\\'Archivo\\';font-weight:800;font-size:20px;margin-top:6px;">Q 2,540</div><p style="font-size:12.5px;line-height:1.55;color:#454039;margin:8px 0 0;">Diferencia ilustrativa Q360. No hay ranking silencioso.</p></div></div>';
      if(step===7)nextBtn.disabled=true;
    }
  }

  function showAuto(){
    autoPanel.style.display='block';hybridPanel.style.display='none';
    autoTab.setAttribute('aria-pressed','true');hibTab.setAttribute('aria-pressed','false');
    autoTab.style.background='#fff';autoTab.style.color='#12110F';
    hibTab.style.background='#EDE8DE';hibTab.style.color='#5E594F';
    renderStep();
  }
  function showHybrid(){
    autoPanel.style.display='none';hybridPanel.style.display='block';
    autoTab.setAttribute('aria-pressed','false');hibTab.setAttribute('aria-pressed','true');
    autoTab.style.background='#EDE8DE';autoTab.style.color='#5E594F';
    hibTab.style.background='#0E0D10';hibTab.style.color='#fff';
    hybridName.textContent=(PRODUCT_META[currentRoute.id]||{}).label||currentRoute.label;
  }

  backBtn.addEventListener('click',()=>{if(step>0){step--;showAuto()}});
  nextBtn.addEventListener('click',()=>{if(step===1&&!isStructured()){showHybrid();return}if(step===5&&!validated)return;if(step<7){step++;showAuto()}});
  autoTab.addEventListener('click',()=>{if(isStructured())showAuto()});
  hibTab.addEventListener('click',showHybrid);

  renderStep();
})();
</script>
</body>
</html>`;
}
function handler(req,res){
  securityHeaders(res);
  if(req.method!=='GET'){res.set('Allow','GET');return res.status(405).send('Método no permitido.');}
  res.set('Content-Type','text/html; charset=utf-8');
  return res.status(200).send(html());
}

const cotcompExactPromotedPreviewS488=onRequest({
  region:REGION,timeoutSeconds:30,memory:'256MiB',maxInstances:2,concurrency:40,invoker:'public'
},handler);

module.exports=Object.freeze({
  VERSION,PROJECT_ID,REGION,FUNCTION_NAME,CATALOG_PATH,ROUTES,PROMOTED_VISUAL_PARENT_SHA,PROMOTED_COTCOMP_SECTION_SHA,PROMOTED_COTCOMP_CSS_SHA,
  fixtureManifest,securityHeaders,html,handler,cotcompExactPromotedPreviewS488
});
