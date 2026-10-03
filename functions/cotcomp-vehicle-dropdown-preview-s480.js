'use strict';

const {onRequest}=require('firebase-functions/v2/https');

const VERSION='ays-cotcomp-s480-dropdown-ux-preview-lab-v1.0';
const PROJECT_ID='ays-orbit-360-lab';
const REGION='us-central1';
const FUNCTION_NAME='cotcompVehicleDropdownPreviewS480';
const CATALOG_PATH='/cotcompVehicleCatalogS479';

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
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer"><title>A&S · Vista previa catálogo vehicular</title>
<style>
:root{font-family:Segoe UI,Arial,sans-serif;color:#171717;background:#f3f3f3}*{box-sizing:border-box}
body{margin:0;padding:24px 14px;background:linear-gradient(180deg,#fafafa,#ececec)}
.wrap{max-width:820px;margin:0 auto}.card{background:#fff;border:1px solid #ddd;border-radius:18px;padding:26px;box-shadow:0 14px 40px rgba(0,0,0,.07)}
.brand{font-weight:800;font-size:20px}.brand b{color:#b5121b}h1{font-size:28px;margin:16px 0 8px}
.sub{color:#555;line-height:1.55}.notice{margin:18px 0;padding:14px 16px;border-left:4px solid #b5121b;background:#f6f6f6;border-radius:8px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.full{grid-column:1/-1}
label{display:block;font-weight:700;margin:0 0 7px}.hint{font-size:13px;color:#666;margin-top:6px}
input,select,button{width:100%;font:inherit;border:1px solid #cfcfcf;border-radius:10px;padding:12px;background:#fff}
input:focus,select:focus{outline:2px solid #b5121b33;border-color:#b5121b}
button{background:#b5121b;color:#fff;border:0;font-weight:700;cursor:pointer;margin-top:4px}
button:disabled{background:#aaa;cursor:not-allowed}.status{margin-top:16px;min-height:24px;font-weight:700}
.result{margin-top:16px;padding:14px;background:#f7f7f7;border-radius:10px;display:none}.result strong{color:#b5121b}
.small{font-size:13px;color:#666;line-height:1.45;margin-top:18px}
@media(max-width:640px){.grid{grid-template-columns:1fr}.full{grid-column:auto}.card{padding:20px}h1{font-size:24px}}
</style></head><body><div class="wrap"><div class="card">
<div class="brand"><b>A&S</b> · Alianzas y Soluciones</div>
<h1>Vista previa del selector vehicular</h1>
<p class="sub">Prueba de experiencia para Marca → Línea/Modelo → Año. Esta pantalla no crea cotizaciones, no solicita datos personales y no guarda información.</p>
<div class="notice"><strong>LAB:</strong> catálogo vehicular de prueba basado en la fuente oficial SAT 2026. La presencia de un vehículo aquí no significa que una aseguradora lo cotice.</div>

<div class="grid">
  <div class="full"><label for="vehicleClass">Tipo de vehículo</label>
    <select id="vehicleClass"><option value="AUTO_LIGHT">Automóvil / SUV / Pickup</option><option value="MOTO">Motocicleta</option></select>
  </div>
  <div><label for="brandSearch">Buscar marca</label><input id="brandSearch" type="search" placeholder="Ej. Toyota"></div>
  <div><label for="brand">Marca</label><select id="brand"><option value="">Cargando marcas…</option></select></div>
  <div><label for="modelSearch">Buscar línea / modelo</label><input id="modelSearch" type="search" placeholder="Ej. Corolla" disabled></div>
  <div><label for="model">Línea / modelo</label><select id="model" disabled><option value="">Selecciona primero una marca</option></select></div>
  <div class="full"><label for="year">Año</label><select id="year"><option value="">Selecciona el año</option></select>
    <div class="hint">El año es una declaración del vehículo; no afirma por sí solo que exista una combinación exacta marca/modelo/año en SAT.</div>
  </div>
  <div class="full"><button id="validate" disabled>Validar selección</button></div>
</div>
<div id="status" class="status"></div>
<div id="result" class="result"></div>
<p class="small">Si tu vehículo no aparece o la línea no coincide exactamente, el recorrido final deberá ofrecer “No encuentro mi vehículo” y enviarlo a revisión sin inventar una opción.</p>
</div></div>
<script>
(()=>{
  const API='/cotcompVehicleCatalogS479';
  const cls=document.getElementById('vehicleClass'),brandSearch=document.getElementById('brandSearch'),
        brand=document.getElementById('brand'),modelSearch=document.getElementById('modelSearch'),
        model=document.getElementById('model'),year=document.getElementById('year'),
        validate=document.getElementById('validate'),status=document.getElementById('status'),result=document.getElementById('result');
  let brands=[],models=[];
  const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const qp=o=>new URLSearchParams(Object.fromEntries(Object.entries(o).filter(([,v])=>v!==''&&v!=null))).toString();
  async function get(op,args={}){const r=await fetch(API+'?'+qp({op,...args}),{headers:{'accept':'application/json'}});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.code||'No fue posible consultar el catálogo.');return j}
  function fillYears(items){year.innerHTML='<option value="">Selecciona el año</option>'+items.map(y=>'<option value="'+y+'">'+y+'</option>').join('')}
  function renderBrands(filter=''){const f=filter.trim().toUpperCase();const rows=brands.filter(x=>!f||x.label.includes(f));brand.innerHTML='<option value="">Selecciona la marca</option>'+rows.map(x=>'<option value="'+esc(x.brandId)+'">'+esc(x.label)+'</option>').join('')}
  function renderModels(filter=''){const f=filter.trim().toUpperCase().replace(/[^A-Z0-9]/g,'');const rows=models.filter(x=>!f||x.label.toUpperCase().replace(/[^A-Z0-9]/g,'').includes(f));model.innerHTML='<option value="">Selecciona la línea / modelo</option>'+rows.map(x=>'<option value="'+esc(x.modelId)+'">'+esc(x.label)+(x.type?' · '+esc(x.type):'')+'</option>').join('')}
  function sync(){validate.disabled=!(brand.value&&model.value&&year.value)}
  async function loadBrands(){
    status.textContent='Cargando catálogo…';result.style.display='none';model.disabled=true;modelSearch.disabled=true;validate.disabled=true;
    try{const j=await get('brands',{vehicleClass:cls.value,limit:200});brands=j.items||[];renderBrands(brandSearch.value);brand.value='';models=[];renderModels();status.textContent='';}
    catch(e){status.textContent=String(e.message||e)}
  }
  async function loadModels(){
    models=[];renderModels();model.disabled=true;modelSearch.disabled=true;sync();result.style.display='none';
    if(!brand.value)return;
    status.textContent='Cargando líneas/modelos…';
    try{const j=await get('models',{vehicleClass:cls.value,brandId:brand.value,limit:200});models=j.items||[];renderModels(modelSearch.value);model.disabled=false;modelSearch.disabled=false;status.textContent=models.length?'':'No hay líneas/modelos disponibles para esta marca en el alcance actual.';}
    catch(e){status.textContent=String(e.message||e)}
  }
  cls.addEventListener('change',()=>{brandSearch.value='';modelSearch.value='';loadBrands()});
  brandSearch.addEventListener('input',()=>renderBrands(brandSearch.value));
  brand.addEventListener('change',loadModels);
  modelSearch.addEventListener('input',()=>renderModels(modelSearch.value));
  model.addEventListener('change',sync);year.addEventListener('change',sync);
  validate.addEventListener('click',async()=>{
    validate.disabled=true;status.textContent='Validando selección…';result.style.display='none';
    try{
      const j=await get('resolve',{vehicleClass:cls.value,brandId:brand.value,modelId:model.value,vehicleYear:year.value});
      const v=j.vehicleIdentity;
      result.innerHTML='<strong>Selección canónica:</strong> '+esc(v.brandLabel)+' '+esc(v.modelLabel)+' '+esc(v.year)+'<br><span class="hint">Tipo SAT: '+esc(v.type)+' · catálogo: '+esc(v.catalogVersion)+'</span>';
      result.style.display='block';status.textContent='Selección validada. No se guardó ningún dato.';
    }catch(e){status.textContent=String(e.message||e)}
    sync();
  });
  Promise.all([get('years'),get('brands',{vehicleClass:cls.value,limit:200})]).then(([y,b])=>{fillYears(y.items||[]);brands=b.items||[];renderBrands();status.textContent='';}).catch(e=>status.textContent=String(e.message||e));
})();
</script></body></html>`;
}
function handler(req,res){
  securityHeaders(res);
  if(req.method!=='GET'){res.set('Allow','GET');return res.status(405).send('Método no permitido.');}
  res.set('Content-Type','text/html; charset=utf-8');
  return res.status(200).send(html());
}
const cotcompVehicleDropdownPreviewS480=onRequest({
  region:REGION,timeoutSeconds:30,memory:'256MiB',maxInstances:2,concurrency:40,invoker:'public'
},handler);

module.exports=Object.freeze({VERSION,PROJECT_ID,REGION,FUNCTION_NAME,CATALOG_PATH,securityHeaders,html,handler,cotcompVehicleDropdownPreviewS480});
