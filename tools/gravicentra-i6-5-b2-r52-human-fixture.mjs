import fs from 'node:fs';
import path from 'node:path';

const outDir=process.argv[2];
const lockPath=process.env.B2_LOCK||'artifacts/orbit360-recovery/release-control/I6_5_FORENSIC_B2_EXECUTION_LOCK_20260920.json';
if(!outDir) throw new Error('R52_OUTPUT_DIR_REQUIRED');
const lock=JSON.parse(fs.readFileSync(lockPath,'utf8'));
const p=lock.preview||{};
if(lock.status!=='PREVIEW_AUTHENTICATED_PASS_PENDING_PAULA_VISUAL'||lock.authenticatedPreviewProof?.status!=='PASS') throw new Error('R52_EXACT_AUTH_PASS_REQUIRED');
if(!p.sourceSha||!p.buildId||!p.url||p.livePromoted!==false) throw new Error('R52_PREVIEW_BINDING_INVALID');
const site=path.join(outDir,'site');
fs.mkdirSync(site,{recursive:true});
const meta={
 schema:'gravicentra-b2-r52-human-logo-fixture-v1',
 purpose:'Human visual-only synthetic insurer logo persistence proof',
 exactCandidate:{sourceSha:p.sourceSha,buildId:p.buildId,previewUrl:p.url,runId:p.runId,artifactId:p.artifactId},
 isolation:{businessDataWrites:false,firestoreWrites:false,credentialWrites:false,storageWrites:false,persistence:'browser-localStorage-only',livePromotion:false},
 generatedAt:new Date().toISOString()
};
fs.writeFileSync(path.join(site,'fixture.json'),JSON.stringify(meta,null,2)+'\n');
const metaText=JSON.stringify(meta).replace(/</g,'\\u003c');
const html=`<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Gravicentra Insurance · Prueba visual de logo</title>
<style>
:root{--red:#c5162e;--ink:#20252d;--muted:#69717d;--line:#e4e7eb;--soft:#f6f7f9;--ok:#197a46}
*{box-sizing:border-box}body{margin:0;background:#f3f4f6;color:var(--ink);font-family:Segoe UI,Arial,sans-serif}
.top{height:68px;background:#fff;border-bottom:1px solid var(--line);display:flex;align-items:center;padding:0 24px;gap:12px}.mark{width:34px;height:34px;border-radius:50%;background:var(--red);display:grid;place-items:center;color:#fff;font-weight:800}.brand{font-weight:800;font-size:18px}.sub{font-size:12px;color:var(--muted)}
.wrap{max-width:980px;margin:28px auto;padding:0 18px}.notice{background:#fff7e8;border:1px solid #f0d49b;border-radius:14px;padding:14px 16px;margin-bottom:16px;font-size:13px;line-height:1.5}
.card{background:#fff;border:1px solid var(--line);border-radius:18px;box-shadow:0 8px 28px rgba(20,26,35,.06);overflow:hidden}.hero{padding:22px 24px;background:linear-gradient(120deg,#252b33,#11151b);color:#fff;display:flex;align-items:center;gap:16px}.logoBox{width:92px;height:76px;border-radius:14px;background:#fff;display:grid;place-items:center;overflow:hidden;color:#9aa1aa}.logoBox img{max-width:86px;max-height:68px;object-fit:contain}.hero h1{font-size:22px;margin:0 0 5px}.hero p{margin:0;color:#cdd2d8;font-size:13px}
.body{padding:22px 24px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.field span{display:block;font-size:12px;font-weight:700;color:#505864;margin-bottom:6px}.field input,.field textarea{width:100%;padding:10px 12px;border:1px solid #ccd2d9;border-radius:10px;font:inherit}.field textarea{min-height:76px;resize:vertical}
.preview{margin-top:10px;min-height:110px;border:1px dashed #bbc2ca;border-radius:12px;background:var(--soft);display:grid;place-items:center;padding:10px;color:var(--muted)}.preview img{max-width:230px;max-height:95px;object-fit:contain}
.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}.btn{border:1px solid #ccd2d9;background:#fff;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer}.btn.primary{background:var(--red);border-color:var(--red);color:#fff}.btn.danger{color:#a20f22}.status{margin-top:16px;border-radius:12px;padding:12px 14px;background:#edf8f2;color:#145d37;font-size:13px;display:none}.status.show{display:block}.meta{margin-top:16px;font-size:11px;color:var(--muted);line-height:1.6}.badge{display:inline-block;border-radius:999px;padding:4px 8px;background:#e9f6ef;color:var(--ok);font-weight:700;font-size:11px}
@media(max-width:680px){.grid{grid-template-columns:1fr}.hero{align-items:flex-start}.wrap{margin-top:16px}.top{padding:0 14px}}
</style></head>
<body><div class="top"><div class="mark">G</div><div><div class="brand">Gravicentra Insurance</div><div class="sub">Prueba visual aislada · Aseguradora sintética</div></div></div>
<main class="wrap">
<div class="notice"><b>Prueba segura:</b> esta pantalla no modifica Firestore, aseguradoras reales, credenciales ni LIVE. La persistencia real del logo en el servidor ya fue validada automáticamente sobre el Preview exacto. Aquí solo verificas visualmente seleccionar → previsualizar → guardar → refrescar → recuperar → limpiar, usando almacenamiento local de este navegador.</div>
<section class="card">
<div class="hero"><div class="logoBox" id="heroLogo">LOGO</div><div><span class="badge">SINTÉTICA · SOLO PRUEBA</span><h1 id="heroName">Aseguradora Sintética B2</h1><p>GT · Vehículos · No forma parte del directorio operativo</p></div></div>
<div class="body">
<div class="grid">
<label class="field"><span>Nombre de prueba</span><input id="name" value="Aseguradora Sintética B2"></label>
<label class="field"><span>Responsable interno</span><input id="owner" value="Prueba visual B2"></label>
<div class="field" style="grid-column:1/-1"><span>Logo</span><input id="file" type="file" accept="image/png,image/jpeg,image/webp"><div class="preview" id="preview">Selecciona una imagen para previsualizarla.</div></div>
<label class="field" style="grid-column:1/-1"><span>Observaciones</span><textarea id="notes">Fixture humano aislado para validar persistencia visual del logo.</textarea></label>
</div>
<div class="actions"><button class="btn primary" id="save">Guardar prueba</button><button class="btn" id="refresh">Refrescar y comprobar</button><button class="btn danger" id="clear">Limpiar prueba</button><a class="btn" href="${p.url}" target="_blank" rel="noopener">Abrir Preview exacto</a></div>
<div class="status" id="status"></div>
<div class="meta">Candidata exacta: <b>${p.buildId}</b><br>La prueba visual está vinculada a la candidata técnica autenticada, pero sus datos permanecen únicamente en este navegador.</div>
</div></section></main>
<script>
const META=${metaText}; const KEY='gravicentra:b2:r52:human-logo:'+META.exactCandidate.sourceSha;
const el=id=>document.getElementById(id); let pendingData='';
function renderLogo(src){for(const id of ['preview','heroLogo']){const x=el(id);x.innerHTML=src?'<img src="'+src+'" alt="Logo sintético guardado">':(id==='preview'?'Selecciona una imagen para previsualizarla.':'LOGO');}}
function status(msg){el('status').textContent=msg;el('status').classList.add('show');}
function load(){let d=null;try{d=JSON.parse(localStorage.getItem(KEY)||'null')}catch{};if(d){el('name').value=d.name||'';el('owner').value=d.owner||'';el('notes').value=d.notes||'';pendingData=d.logo||'';renderLogo(pendingData);status('✓ Prueba recuperada después de la recarga. El logo guardado persiste en este navegador.');return true}return false}
el('file').addEventListener('change',()=>{const f=el('file').files&&el('file').files[0];if(!f){pendingData='';renderLogo('');return}if(f.size>2*1024*1024){status('El archivo supera 2 MB. Selecciona otro.');return}const r=new FileReader();r.onload=()=>{pendingData=String(r.result||'');renderLogo(pendingData);status('Vista previa lista. Pulsa “Guardar prueba”.')};r.readAsDataURL(f)});
el('save').addEventListener('click',()=>{if(!pendingData){status('Selecciona primero un logo.');return}const d={name:el('name').value,owner:el('owner').value,notes:el('notes').value,logo:pendingData,savedAt:new Date().toISOString(),candidate:META.exactCandidate};localStorage.setItem(KEY,JSON.stringify(d));el('heroName').textContent=d.name||'Aseguradora Sintética B2';status('✓ Guardado aislado confirmado. Ahora pulsa “Refrescar y comprobar”.')});
el('refresh').addEventListener('click',()=>location.reload());
el('clear').addEventListener('click',()=>{localStorage.removeItem(KEY);pendingData='';el('file').value='';el('name').value='Aseguradora Sintética B2';el('owner').value='Prueba visual B2';el('notes').value='Fixture humano aislado para validar persistencia visual del logo.';el('heroName').textContent='Aseguradora Sintética B2';renderLogo('');status('✓ Prueba limpiada. No quedó información sintética en este navegador.')});
if(!load())status('Fixture listo. Selecciona un logo para iniciar la prueba visual.');
</script></body></html>`;
fs.writeFileSync(path.join(site,'index.html'),html);
const firebase={hosting:{site:process.env.HOSTING_SITE||'ays-orbit-360-lab',public:'site',ignore:[],headers:[{source:'**',headers:[{key:'Cache-Control',value:'no-store, max-age=0, must-revalidate'},{key:'X-Content-Type-Options',value:'nosniff'}]}]}};
fs.writeFileSync(path.join(outDir,'firebase.json'),JSON.stringify(firebase,null,2)+'\n');
console.log('R52_HUMAN_FIXTURE_GENERATED='+outDir);
