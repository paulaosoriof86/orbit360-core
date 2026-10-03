'use strict';

const {onRequest}=require('firebase-functions/v2/https');

const VERSION='ays-cotcomp-s480a-unified-combobox-preview-lab-v1.0';
const PROJECT_ID='ays-orbit-360-lab';
const REGION='us-central1';
const FUNCTION_NAME='cotcompVehicleComboboxPreviewS480A';
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
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>A&S · Preview selector vehicular</title>
<style>
:root{font-family:Segoe UI,Arial,sans-serif;color:#171717;background:#f4f4f4;--red:#bd111c;--border:#d4d4d4;--muted:#666}
*{box-sizing:border-box}
body{margin:0;padding:24px 14px;background:linear-gradient(180deg,#fafafa,#ededed)}
.wrap{max-width:760px;margin:0 auto}
.card{background:#fff;border:1px solid #ddd;border-radius:18px;padding:28px;box-shadow:0 14px 40px rgba(0,0,0,.07)}
.brand{font-size:20px;font-weight:800}.brand b{color:var(--red)}
h1{font-size:27px;margin:15px 0 7px}.sub{color:#555;line-height:1.5;margin:0 0 18px}
.notice{padding:13px 15px;border-left:4px solid var(--red);background:#f7f7f7;border-radius:8px;margin:0 0 22px}
.field{margin:0 0 18px}label{display:block;font-weight:700;margin-bottom:7px}
select,.combo-input,button{font:inherit;width:100%;border:1px solid var(--border);border-radius:10px;padding:12px 14px;background:#fff}
select:focus,.combo-input:focus{outline:2px solid rgba(189,17,28,.18);border-color:var(--red)}
.combo{position:relative}
.combo-input{padding-right:42px}
.combo-arrow{position:absolute;right:14px;top:50%;transform:translateY(-50%);pointer-events:none;color:#555;font-size:14px}
.listbox{position:absolute;left:0;right:0;top:calc(100% + 5px);z-index:20;max-height:260px;overflow:auto;background:#fff;border:1px solid #bbb;border-radius:10px;box-shadow:0 12px 28px rgba(0,0,0,.13);padding:5px;display:none}
.listbox.open{display:block}
.option{padding:10px 11px;border-radius:7px;cursor:pointer;line-height:1.25}
.option:hover,.option.active{background:#f2f2f2}
.option strong{display:block}.option small{color:var(--muted)}
.option.fallback{border-top:1px solid #e4e4e4;margin-top:4px;color:#7c0d14;font-weight:700}
.hint{font-size:13px;color:var(--muted);margin-top:6px;line-height:1.35}
button{background:var(--red);color:#fff;border:0;font-weight:700;cursor:pointer}
button:disabled{background:#aaa;cursor:not-allowed}
.status{min-height:23px;font-weight:700;margin-top:12px}.result{display:none;margin-top:15px;padding:14px;background:#f7f7f7;border-radius:10px}
.result strong{color:var(--red)}
@media(max-width:600px){.card{padding:20px}h1{font-size:24px}}
</style>
</head>
<body><main class="wrap"><section class="card">
<div class="brand"><b>A&S</b> · Alianzas y Soluciones</div>
<h1>Selector vehicular</h1>
<p class="sub">Vista previa LAB de la experiencia Marca → Línea/Modelo → Año. No solicita datos personales y no guarda información.</p>
<div class="notice"><strong>Objetivo de esta prueba:</strong> validar un solo control buscable por Marca y otro por Línea/Modelo, sin separar “buscar” de “seleccionar”.</div>

<div class="field">
<label for="vehicleClass">Tipo de vehículo</label>
<select id="vehicleClass">
<option value="AUTO_LIGHT">Automóvil / SUV / Pickup</option>
<option value="MOTO">Motocicleta</option>
</select>
</div>

<div class="field">
<label id="brandLabel" for="brandInput">Marca</label>
<div class="combo" id="brandCombo">
<input id="brandInput" class="combo-input" type="text" autocomplete="off" role="combobox"
 aria-labelledby="brandLabel" aria-autocomplete="list" aria-expanded="false" aria-controls="brandList"
 placeholder="Escribe para buscar, por ejemplo Toyota">
<span class="combo-arrow">▼</span>
<div id="brandList" class="listbox" role="listbox" aria-label="Marcas"></div>
</div>
<div class="hint">Escribe algunas letras y elige la marca en la misma lista.</div>
</div>

<div class="field">
<label id="modelLabel" for="modelInput">Línea / modelo</label>
<div class="combo" id="modelCombo">
<input id="modelInput" class="combo-input" type="text" autocomplete="off" role="combobox"
 aria-labelledby="modelLabel" aria-autocomplete="list" aria-expanded="false" aria-controls="modelList"
 placeholder="Selecciona primero la marca" disabled>
<span class="combo-arrow">▼</span>
<div id="modelList" class="listbox" role="listbox" aria-label="Líneas y modelos"></div>
</div>
<div class="hint">La lista depende de la marca seleccionada.</div>
</div>

<div class="field">
<label for="year">Año</label>
<select id="year"><option value="">Selecciona el año</option></select>
<div class="hint">El año se mantiene separado para evitar mezclarlo con el nombre del modelo.</div>
</div>

<button id="validate" disabled>Validar selección</button>
<div id="status" class="status" aria-live="polite"></div>
<div id="result" class="result" aria-live="polite"></div>
<p class="hint" style="margin-top:18px">Si no encuentras una opción correcta, el recorrido final debe permitir “No encuentro mi vehículo” y enviarlo a revisión, sin obligarte a escoger un dato incorrecto.</p>
</section></main>

<script>
(()=>{
 const API='/cotcompVehicleCatalogS479';
 const cls=document.getElementById('vehicleClass'),brandInput=document.getElementById('brandInput'),
 brandList=document.getElementById('brandList'),modelInput=document.getElementById('modelInput'),
 modelList=document.getElementById('modelList'),year=document.getElementById('year'),
 validate=document.getElementById('validate'),status=document.getElementById('status'),
 result=document.getElementById('result');

 let brands=[],models=[],selectedBrand=null,selectedModel=null;
 let brandActive=-1,modelActive=-1;

 const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 const norm=s=>String(s||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
 const compact=s=>norm(s).replace(/[^A-Z0-9]/g,'');
 const qp=o=>new URLSearchParams(Object.fromEntries(Object.entries(o).filter(([,v])=>v!==''&&v!=null))).toString();
 async function get(op,args={}){const r=await fetch(API+'?'+qp({op,...args}),{headers:{accept:'application/json'}});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.code||'No fue posible consultar el catálogo.');return j}
 function open(list,input){list.classList.add('open');input.setAttribute('aria-expanded','true')}
 function close(list,input){list.classList.remove('open');input.setAttribute('aria-expanded','false')}
 function sync(){validate.disabled=!(selectedBrand&&selectedModel&&year.value)}
 function fallbackHtml(kind){return '<div class="option fallback" role="option" data-fallback="'+kind+'">No encuentro '+(kind==='brand'?'mi marca':'mi línea / modelo')+'</div>'}

 function renderBrands(){
   const q=norm(brandInput.value);
   const rows=brands.filter(x=>!q||norm(x.label).includes(q)).slice(0,60);
   brandActive=-1;
   brandList.innerHTML=rows.map((x,i)=>'<div class="option" role="option" id="brandOpt'+i+'" data-id="'+esc(x.brandId)+'" data-label="'+esc(x.label)+'"><strong>'+esc(x.label)+'</strong></div>').join('')+fallbackHtml('brand');
   open(brandList,brandInput);
 }
 function renderModels(){
   const q=compact(modelInput.value);
   const rows=models.filter(x=>!q||compact(x.label).includes(q)).slice(0,80);
   modelActive=-1;
   modelList.innerHTML=rows.map((x,i)=>'<div class="option" role="option" id="modelOpt'+i+'" data-id="'+esc(x.modelId)+'" data-label="'+esc(x.label)+'" data-type="'+esc(x.type||'')+'"><strong>'+esc(x.label)+'</strong>'+(x.type?'<small>'+esc(x.type)+'</small>':'')+'</div>').join('')+fallbackHtml('model');
   open(modelList,modelInput);
 }
 function chooseBrand(el){
   selectedBrand={brandId:el.dataset.id,label:el.dataset.label};
   brandInput.value=selectedBrand.label;close(brandList,brandInput);
   selectedModel=null;modelInput.value='';models=[];modelInput.disabled=false;
   result.style.display='none';sync();loadModels();
 }
 function chooseModel(el){
   selectedModel={modelId:el.dataset.id,label:el.dataset.label,type:el.dataset.type};
   modelInput.value=selectedModel.label;close(modelList,modelInput);result.style.display='none';sync();
 }
 function fallback(kind){
   close(kind==='brand'?brandList:modelList,kind==='brand'?brandInput:modelInput);
   if(kind==='brand'){selectedBrand=null;selectedModel=null;modelInput.disabled=true;modelInput.value='';}
   else selectedModel=null;
   sync();result.style.display='none';
   status.textContent='No seleccionaré una opción aproximada. Este caso debe continuar por revisión asistida.';
 }
 function clickList(ev,kind){
   const el=ev.target.closest('.option');if(!el)return;
   if(el.dataset.fallback)return fallback(kind);
   kind==='brand'?chooseBrand(el):chooseModel(el);
 }
 function keyboard(ev,list,input,kind){
   const options=[...list.querySelectorAll('.option:not(.fallback)')];
   let active=kind==='brand'?brandActive:modelActive;
   if(ev.key==='ArrowDown'){ev.preventDefault();active=Math.min(active+1,options.length-1)}
   else if(ev.key==='ArrowUp'){ev.preventDefault();active=Math.max(active-1,0)}
   else if(ev.key==='Enter'&&active>=0&&options[active]){ev.preventDefault();kind==='brand'?chooseBrand(options[active]):chooseModel(options[active]);return}
   else if(ev.key==='Escape'){close(list,input);return}
   else return;
   options.forEach((o,i)=>o.classList.toggle('active',i===active));
   if(options[active]){options[active].scrollIntoView({block:'nearest'});input.setAttribute('aria-activedescendant',options[active].id)}
   if(kind==='brand')brandActive=active;else modelActive=active;
 }
 async function loadBrands(){
   status.textContent='Cargando marcas…';selectedBrand=null;selectedModel=null;modelInput.disabled=true;modelInput.value='';sync();
   try{const j=await get('brands',{vehicleClass:cls.value,limit:200});brands=j.items||[];status.textContent='';}
   catch(e){status.textContent=String(e.message||e)}
 }
 async function loadModels(){
   if(!selectedBrand)return;
   status.textContent='Cargando líneas/modelos…';
   try{const j=await get('models',{vehicleClass:cls.value,brandId:selectedBrand.brandId,limit:200});models=j.items||[];status.textContent='';}
   catch(e){status.textContent=String(e.message||e)}
 }
 brandInput.addEventListener('focus',renderBrands);
 brandInput.addEventListener('input',()=>{selectedBrand=null;selectedModel=null;modelInput.disabled=true;modelInput.value='';sync();renderBrands()});
 brandInput.addEventListener('keydown',e=>keyboard(e,brandList,brandInput,'brand'));
 brandList.addEventListener('mousedown',e=>{e.preventDefault();clickList(e,'brand')});
 modelInput.addEventListener('focus',()=>{if(selectedBrand)renderModels()});
 modelInput.addEventListener('input',()=>{selectedModel=null;sync();renderModels()});
 modelInput.addEventListener('keydown',e=>keyboard(e,modelList,modelInput,'model'));
 modelList.addEventListener('mousedown',e=>{e.preventDefault();clickList(e,'model')});
 document.addEventListener('mousedown',e=>{
   if(!document.getElementById('brandCombo').contains(e.target))close(brandList,brandInput);
   if(!document.getElementById('modelCombo').contains(e.target))close(modelList,modelInput);
 });
 cls.addEventListener('change',()=>{brandInput.value='';modelInput.value='';brands=[];models=[];result.style.display='none';loadBrands()});
 year.addEventListener('change',sync);
 validate.addEventListener('click',async()=>{
   validate.disabled=true;status.textContent='Validando selección…';result.style.display='none';
   try{
     const j=await get('resolve',{vehicleClass:cls.value,brandId:selectedBrand.brandId,modelId:selectedModel.modelId,vehicleYear:year.value});
     const v=j.vehicleIdentity;
     result.innerHTML='<strong>Selección validada:</strong> '+esc(v.brandLabel)+' '+esc(v.modelLabel)+' '+esc(v.year)+'<br><span class="hint">No se guardó ningún dato.</span>';
     result.style.display='block';status.textContent='';
   }catch(e){status.textContent=String(e.message||e)}
   sync();
 });
 Promise.all([get('years'),get('brands',{vehicleClass:cls.value,limit:200})]).then(([y,b])=>{
   year.innerHTML='<option value="">Selecciona el año</option>'+(y.items||[]).map(v=>'<option value="'+v+'">'+v+'</option>').join('');
   brands=b.items||[];status.textContent='';
 }).catch(e=>status.textContent=String(e.message||e));
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

const cotcompVehicleComboboxPreviewS480A=onRequest({
  region:REGION,timeoutSeconds:30,memory:'256MiB',maxInstances:2,concurrency:40,invoker:'public'
},handler);

module.exports=Object.freeze({
  VERSION,PROJECT_ID,REGION,FUNCTION_NAME,CATALOG_PATH,securityHeaders,html,handler,cotcompVehicleComboboxPreviewS480A
});
