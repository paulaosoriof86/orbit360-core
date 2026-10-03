'use strict';

const {onRequest}=require('firebase-functions/v2/https');
const S=require('./cotcomp-gravicentra-provider-contract-s484');

const VERSION='ays-cotcomp-s485-production-clean-schema-intake-preview-v1.0';
const PROJECT_ID='ays-orbit-360-lab';
const REGION='us-central1';
const FUNCTION_NAME='cotcompSchemaDrivenIntakePreviewS485';
const CATALOG_PATH='/cotcompVehicleCatalogS479';

function fixtureManifest(){
  return S.normalizeProviderManifest({
    authority:'GRAVICENTRA',
    tenantId:'alianzas-soluciones',
    country:'MULTI',
    configurationVersion:'fixture-s485-v1',
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
    label:'Cotizar mi vehículo',
    eyebrow:'Guatemala',
    context:{country:'GT',journeyId:'preview-vehicle',lineOfBusiness:'MOBILITY',productId:'private-vehicle',riskType:'VEHICLE'}
  },
  {
    id:'business',
    label:'Proteger mi empresa o local',
    eyebrow:'Guatemala',
    context:{country:'GT',journeyId:'preview-business',lineOfBusiness:'PROPERTY',productId:'business-protection',riskType:'COMMERCIAL_LOCATION'}
  },
  {
    id:'cargo',
    label:'Proteger una operación de carga',
    eyebrow:'Colombia',
    context:{country:'CO',journeyId:'preview-cargo',lineOfBusiness:'TRANSPORT',productId:'cargo',riskType:'CARGO_MOVEMENT'}
  }
]);

function securityHeaders(res){
  res.set('Cache-Control','no-store, max-age=0');
  res.set('Pragma','no-cache');
  res.set('Referrer-Policy','no-referrer');
  res.set('X-Content-Type-Options','nosniff');
  res.set('X-Frame-Options','DENY');
  res.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=()');
  res.set('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'");
}

function html(){
  const manifest=fixtureManifest();
  const validation=S.validateProviderManifest(manifest);
  if(!validation.ok) throw new Error('S485_FIXTURE_MANIFEST_INVALID:'+validation.errors.join(','));

  const safeManifest=JSON.stringify(manifest).replace(/</g,'\\u003c');
  const safeRoutes=JSON.stringify(ROUTES).replace(/</g,'\\u003c');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>A&S · Cotización adaptable</title>
<style>
:root{font-family:Segoe UI,Arial,sans-serif;color:#171717;background:#f2f2f2;--red:#bd111c;--red2:#9d0e17;--border:#d9d9d9;--muted:#666}
*{box-sizing:border-box}
body{margin:0;padding:28px 14px 48px;background:linear-gradient(180deg,#fafafa 0,#ececec 100%)}
.shell{max-width:820px;margin:0 auto}.card{background:#fff;border:1px solid #ddd;border-radius:20px;padding:30px;box-shadow:0 16px 44px rgba(0,0,0,.07)}
.top{display:flex;gap:14px;align-items:flex-start;justify-content:space-between}.brand{font-size:20px;font-weight:800}.brand b{color:var(--red)}
.lab{font-size:12px;font-weight:700;letter-spacing:.03em;color:#666;background:#f3f3f3;padding:7px 10px;border-radius:999px}
h1{font-size:30px;line-height:1.12;margin:18px 0 8px}.sub{color:#555;line-height:1.5;margin:0 0 24px;max-width:650px}
.route-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:0 0 26px}
.route{appearance:none;text-align:left;border:1px solid var(--border);background:#fff;border-radius:12px;padding:14px;cursor:pointer;min-height:92px}
.route:hover,.route:focus{border-color:#a9a9a9;outline:none}.route.active{border:2px solid var(--red);padding:13px;background:#fffafa}
.route small{display:block;color:var(--muted);margin-bottom:5px}.route strong{font-size:15px;line-height:1.3}
.section-title{font-size:18px;font-weight:800;margin:8px 0 16px}.fields{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.field{min-width:0}.field.full{grid-column:1/-1}label{display:block;font-weight:700;margin:0 0 7px}
input,select,button{font:inherit}input,select{width:100%;border:1px solid var(--border);border-radius:10px;padding:12px 14px;background:#fff}
input:focus,select:focus{outline:2px solid rgba(189,17,28,.18);border-color:var(--red)}
.money{position:relative}.money span{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#666}.money input{padding-left:34px}
.bool{display:flex;gap:10px}.bool button{flex:1;border:1px solid var(--border);background:#fff;color:#222;border-radius:10px;padding:12px;cursor:pointer}.bool button.active{border-color:var(--red);background:#fff4f5;color:#8f0d15;font-weight:700}
.combo{position:relative}.combo input{padding-right:42px}.arrow{position:absolute;right:14px;top:50%;transform:translateY(-50%);pointer-events:none;color:#555}
.listbox{position:absolute;left:0;right:0;top:calc(100% + 5px);z-index:30;display:none;max-height:250px;overflow:auto;background:#fff;border:1px solid #bbb;border-radius:10px;box-shadow:0 12px 28px rgba(0,0,0,.13);padding:5px}.listbox.open{display:block}
.option{padding:10px 11px;border-radius:7px;cursor:pointer}.option:hover,.option.active{background:#f2f2f2}.option.fallback{border-top:1px solid #e4e4e4;margin-top:4px;color:#7c0d14;font-weight:700}
.hint{font-size:13px;color:var(--muted);line-height:1.35;margin-top:6px}.assist{display:none;margin-top:10px;padding:12px 14px;background:#fff7f7;border-left:4px solid var(--red);border-radius:8px;line-height:1.4}.assist.show{display:block}
.footer{margin-top:26px;padding-top:20px;border-top:1px solid #eee}.continue{width:100%;border:0;border-radius:11px;background:var(--red);color:#fff;padding:14px 18px;font-weight:800;cursor:pointer}.continue:hover{background:var(--red2)}.continue:disabled{background:#aaa;cursor:not-allowed}
.state{min-height:22px;margin-top:11px;color:#555;font-size:14px;line-height:1.4}.note{margin-top:18px;color:#666;font-size:12px;line-height:1.45}
@media(max-width:720px){.route-grid{grid-template-columns:1fr}.route{min-height:auto}.fields{grid-template-columns:1fr}.card{padding:20px}h1{font-size:25px}.top{align-items:center}}
</style>
</head>
<body>
<main class="shell"><section class="card">
<div class="top"><div class="brand"><b>A&S</b> · Alianzas y Soluciones</div><div class="lab">Vista previa LAB</div></div>
<h1>Cotiza según lo que necesitas</h1>
<p class="sub">Los datos solicitados cambian según el tipo de protección. Esta vista previa no pide información personal ni envía una solicitud.</p>
<div id="routeGrid" class="route-grid" aria-label="Ejemplos de recorrido"></div>
<div class="section-title">Cuéntanos lo necesario para empezar</div>
<div id="fields" class="fields"></div>
<div id="assist" class="assist" aria-live="polite">No te obligaremos a escoger una opción incorrecta. Podemos continuar con una revisión asistida.</div>
<div class="footer"><button id="continueBtn" class="continue" disabled>Continuar</button><div id="state" class="state" aria-live="polite"></div>
<div class="note">Preview fixture-only. No hay conexión real con Gravicentra, aseguradoras ni proveedores.</div></div>
</section></main>
<script>
(()=>{
 const MANIFEST=${safeManifest},ROUTES=${safeRoutes},API='${CATALOG_PATH}';
 const grid=document.getElementById('routeGrid'),fields=document.getElementById('fields'),continueBtn=document.getElementById('continueBtn'),stateEl=document.getElementById('state'),assist=document.getElementById('assist');
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
 function sync(){const missing=requiredMissing();continueBtn.disabled=!currentSchema||missing.length>0;continueBtn.textContent=assisted?'Continuar con revisión asistida':'Continuar';assist.classList.toggle('show',assisted)}
 function routeButtons(){grid.innerHTML=ROUTES.map(r=>'<button class="route" data-route="'+esc(r.id)+'"><small>'+esc(r.eyebrow)+'</small><strong>'+esc(r.label)+'</strong></button>').join('');grid.addEventListener('click',e=>{const b=e.target.closest('[data-route]');if(b)selectRoute(b.dataset.route)})}
 function selectRoute(id){currentRoute=ROUTES.find(r=>r.id===id)||ROUTES[0];currentSchema=resolveSchema(currentRoute.context);answers={};assisted=false;selectedBrand=null;selectedModel=null;brands=[];models=[];[...grid.querySelectorAll('.route')].forEach(b=>b.classList.toggle('active',b.dataset.route===currentRoute.id));stateEl.textContent='';renderFields()}
 function genericField(f){const id='f_'+f.key,full=(f.type==='TEXT'||f.type==='MONEY')?' full':'';if(f.type==='SELECT'){const opts=((f.ui&&f.ui.options)||[]).map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('');return'<div class="field'+full+'" data-wrap="'+esc(f.key)+'"><label for="'+id+'">'+esc(f.label)+'</label><select id="'+id+'" data-key="'+esc(f.key)+'"><option value="">Selecciona una opción</option>'+opts+'</select></div>'}if(f.type==='BOOLEAN')return'<div class="field'+full+'" data-wrap="'+esc(f.key)+'"><label>'+esc(f.label)+'</label><div class="bool"><button type="button" data-bool-key="'+esc(f.key)+'" data-bool-value="true">Sí</button><button type="button" data-bool-key="'+esc(f.key)+'" data-bool-value="false">No</button></div></div>';if(f.type==='MONEY')return'<div class="field full" data-wrap="'+esc(f.key)+'"><label for="'+id+'">'+esc(f.label)+'</label><div class="money"><span>$</span><input id="'+id+'" data-key="'+esc(f.key)+'" inputmode="decimal" type="number" min="0" step="any" placeholder="Valor aproximado"></div><div class="hint">Este dato orienta la solicitud; no calcula una prima en esta vista previa.</div></div>';return'<div class="field'+full+'" data-wrap="'+esc(f.key)+'"><label for="'+id+'">'+esc(f.label)+'</label><input id="'+id+'" data-key="'+esc(f.key)+'" type="'+(f.type==='INTEGER'?'number':'text')+'"></div>'}
 function vehicleField(f){const ctl=up(f.ui&&f.ui.control);if(ctl==='VEHICLE_BRAND_COMBOBOX')return'<div class="field full"><label id="brandLabel" for="brandInput">'+esc(f.label)+'</label><div class="combo" id="brandCombo"><input id="brandInput" autocomplete="off" role="combobox" aria-labelledby="brandLabel" aria-autocomplete="list" aria-expanded="false" aria-controls="brandList" placeholder="Escribe para buscar"><span class="arrow">▼</span><div id="brandList" class="listbox" role="listbox"></div></div><div class="hint">Escribe algunas letras y elige la marca en la misma lista.</div></div>';if(ctl==='VEHICLE_MODEL_COMBOBOX')return'<div class="field full"><label id="modelLabel" for="modelInput">'+esc(f.label)+'</label><div class="combo" id="modelCombo"><input id="modelInput" autocomplete="off" role="combobox" aria-labelledby="modelLabel" aria-autocomplete="list" aria-expanded="false" aria-controls="modelList" placeholder="Selecciona primero la marca" disabled><span class="arrow">▼</span><div id="modelList" class="listbox" role="listbox"></div></div><div class="hint">La lista depende de la marca seleccionada.</div></div>';if(ctl==='VEHICLE_YEAR_SELECT')return'<div class="field full"><label for="yearSelect">'+esc(f.label)+'</label><select id="yearSelect" data-key="'+esc(f.key)+'"><option value="">Selecciona el año</option></select><div class="hint">El año permanece separado del nombre del modelo.</div></div>';return genericField(f)}
 function renderFields(){if(!currentSchema){fields.innerHTML='<div class="field full">Este recorrido necesita revisión asistida.</div>';assisted=true;sync();return}fields.innerHTML=(currentSchema.fields||[]).filter(visible).map(f=>(f.ui&&f.ui.control)?vehicleField(f):genericField(f)).join('');bindGeneric();fields.querySelectorAll('[data-key]').forEach(el=>{const v=answers[el.dataset.key];if(v!==undefined&&v!==null&&typeof v!=='object')el.value=String(v)});fields.querySelectorAll('[data-bool-key]').forEach(btn=>{const k=btn.dataset.boolKey;if(answers[k]!==undefined)btn.classList.toggle('active',String(answers[k])===btn.dataset.boolValue)});bindVehicle();sync()}
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
 continueBtn.addEventListener('click',()=>{if(continueBtn.disabled)return;stateEl.textContent=assisted?'Tu caso está listo para continuar con apoyo de un asesor.':'Los datos necesarios de este paso están completos. El siguiente paso no está conectado en esta vista previa.'});
 routeButtons();selectRoute(ROUTES[0].id);
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

const cotcompSchemaDrivenIntakePreviewS485=onRequest({
  region:REGION,timeoutSeconds:30,memory:'256MiB',maxInstances:2,concurrency:40,invoker:'public'
},handler);

module.exports=Object.freeze({
  VERSION,PROJECT_ID,REGION,FUNCTION_NAME,CATALOG_PATH,ROUTES,
  fixtureManifest,securityHeaders,html,handler,cotcompSchemaDrivenIntakePreviewS485
});
