'use strict';

const crypto=require('node:crypto');
const {getApps,initializeApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const {onRequest}=require('firebase-functions/v2/https');

const VERSION='ays-cotcomp-s471-owner-validation-link-v1.0';
const PROJECT_ID='ays-orbit-360-lab';
const TENANT_ID='alianzas-soluciones';
const REGION='us-central1';
const FUNCTION_NAME='cotcompPilotProposalValidationS471';
const TOKEN_SHA256='6def0bbefd23e9a569310c4ea440037134ab98be46f4dd07627adb3ccbfb6892';
const EXPIRES_AT='2026-10-09T05:59:59.000Z';
const STATE_PATH='tenants/alianzas-soluciones/cotcomp/pilotValidation/items/s471';
const CASE_MATCH_COMMITMENT_SHA256='23dd6ec29b3c255fb3ce5c48e5b64cf012333f1626ccb8495bf3520bb0c6349a';

const SOURCES=Object.freeze([
  Object.freeze({label:'Aseguradora Guatemalteca',documentSha256:'0bad818159c0b16f72ba1f697b8224b6fed5107f1cd12b8f5b50d8ef612c05ca'}),
  Object.freeze({label:'MAPFRE Seguros Guatemala',documentSha256:'ba1b1ef624f96d26ddf5bea85cd9ef25cec238d4743cb09d1ea4609dfc6431e2'})
]);
const ALTERNATIVES=Object.freeze([
  Object.freeze({insurer:'Aseguradora Guatemalteca',plan:'Aseguate Premium',premium:2508.80}),
  Object.freeze({insurer:'Aseguradora Guatemalteca',plan:'Aseguate Plus',premium:2273.60}),
  Object.freeze({insurer:'MAPFRE Seguros Guatemala',plan:'Seguro de Automóvil',premium:3292.80})
]);

const ATTESTATION_TEXT='Confirmo que las tres alternativas mostradas corresponden a cotizaciones reales aportadas por mí para el caso W5 y autorizo tratarlas como evidencia documental validada para este piloto.';
const EXECUTION_AUTH_TEXT='Autorizo una segunda ejecución controlada exclusivamente en ays-orbit-360-lab para crear temporalmente hasta tres Proposal v1, sus registros de idempotencia y un ComparisonSet vinculados al QuoteCase W5 existente, realizar readback y comparación sin ranking ni selección implícita, sin provider/rater, producción, emisión, binding, pagos ni liberación de persistencia general, con rollback y verificación final obligatorios.';

function clean(v,max=300){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);}
function sha256(v){return crypto.createHash('sha256').update(String(v??''),'utf8').digest('hex');}
function verifyBearerToken(token,expectedHash=TOKEN_SHA256){
  const actual=sha256(clean(token,200)),a=Buffer.from(actual,'utf8'),b=Buffer.from(expectedHash,'utf8');
  return a.length===b.length&&crypto.timingSafeEqual(a,b);
}
function securityHeaders(res){
  res.set('Cache-Control','no-store, max-age=0');res.set('Pragma','no-cache');res.set('Referrer-Policy','no-referrer');
  res.set('X-Content-Type-Options','nosniff');res.set('X-Frame-Options','DENY');
  res.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=()');
  res.set('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
}
function buildState(nowIso){
  const sourceBundleDigest=sha256(SOURCES.map(x=>x.documentSha256).sort().join('|'));
  const alternativesDigest=sha256(JSON.stringify(ALTERNATIVES));
  return Object.freeze({
    schemaVersion:VERSION,tenantId:TENANT_ID,used:true,validatedAt:nowIso,
    ownerHumanValidation:true,secondControlledExecutionAuthorized:true,
    ownerAttestationSha256:sha256([ATTESTATION_TEXT,sourceBundleDigest,CASE_MATCH_COMMITMENT_SHA256].join('|')),
    secondExecutionAuthorizationSha256:sha256([EXECUTION_AUTH_TEXT,alternativesDigest,CASE_MATCH_COMMITMENT_SHA256].join('|')),
    sourceBundleDigestSha256:sourceBundleDigest,alternativesDigestSha256:alternativesDigest,
    caseMatchCommitmentSha256:CASE_MATCH_COMMITMENT_SHA256,sourceDocumentCount:SOURCES.length,documentaryAlternativeCount:ALTERNATIVES.length,
    scope:Object.freeze({projectId:PROJECT_ID,tenantId:TENANT_ID,maxProposals:3,maxComparisonSets:1,providerOrRater:false,production:false,issuance:false,binding:false,payment:false,generalPersistenceRelease:false,explicitSelection:false,rollbackRequired:true}),
    containsPii:false,rawBearerStored:false
  });
}
function html(){
  const rows=ALTERNATIVES.map(x=>'<tr><td>'+x.insurer+'</td><td>'+x.plan+'</td><td>Q'+x.premium.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+'</td></tr>').join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>A&S · Validación W5</title><style>
:root{font-family:Segoe UI,Arial,sans-serif;color:#171717;background:#f4f4f4}*{box-sizing:border-box}body{margin:0;padding:28px 16px;background:linear-gradient(180deg,#fafafa,#ededed)}.wrap{max-width:820px;margin:0 auto}.card{background:#fff;border:1px solid #ddd;border-radius:18px;padding:28px;box-shadow:0 14px 40px rgba(0,0,0,.07)}.brand{font-weight:800;font-size:20px}.brand b{color:#b5121b}h1{font-size:28px;margin:18px 0 8px}.sub{color:#555;line-height:1.55}.notice{background:#f7f7f7;border-left:4px solid #b5121b;padding:14px 16px;margin:20px 0;border-radius:8px}table{width:100%;border-collapse:collapse;margin:18px 0}th,td{padding:12px;border-bottom:1px solid #ddd;text-align:left}th{background:#f5f5f5}.check{display:flex;gap:10px;align-items:flex-start;line-height:1.45;margin:16px 0}.check input{margin-top:4px}button{width:100%;margin-top:12px;padding:13px;border:0;border-radius:10px;background:#b5121b;color:#fff;font-weight:700;font-size:16px;cursor:pointer}button:disabled{background:#aaa;cursor:not-allowed}.status{margin-top:16px;font-weight:700;min-height:24px}.small{font-size:13px;color:#666;line-height:1.45;margin-top:18px}</style></head><body><div class="wrap"><div class="card">
<div class="brand"><b>A&S</b> · Alianzas y Soluciones</div><h1>Validación de cotizaciones reales · Piloto W5</h1>
<p class="sub">Valida únicamente las alternativas documentales asociadas al caso Auto/Moto ya creado en LAB. Esta pantalla no selecciona una póliza, no emite cobertura y no realiza pagos.</p>
<div class="notice"><strong>Caso de referencia:</strong> Guatemala · Auto · Toyota Yaris 2008 · suma asegurada Q37,500.00. No se muestran datos personales.</div>
<table><thead><tr><th>Aseguradora</th><th>Alternativa</th><th>Prima de contado</th></tr></thead><tbody>${rows}</tbody></table>
<label class="check"><input id="validate" type="checkbox"><span>${ATTESTATION_TEXT}</span></label>
<label class="check"><input id="authorize" type="checkbox"><span>${EXECUTION_AUTH_TEXT}</span></label>
<button id="submit" disabled>Validar y autorizar ejecución controlada</button><div id="status" class="status"></div>
<p class="small">Enlace privado y de una sola utilización. Vigente hasta el 8 de octubre de 2026. La validación queda registrada únicamente mediante huellas SHA-256 y controles de alcance, sin PII ni documentos PDF.</p>
</div></div><script>
(async()=>{const expected='6def0bbefd23e9a569310c4ea440037134ab98be46f4dd07627adb3ccbfb6892',token=(location.hash||'').slice(1),v=document.getElementById('validate'),a=document.getElementById('authorize'),b=document.getElementById('submit'),s=document.getElementById('status');async function h(x){const y=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(x));return [...new Uint8Array(y)].map(z=>z.toString(16).padStart(2,'0')).join('')}function sync(){b.disabled=!(v.checked&&a.checked)}try{if(!token||await h(token)!==expected){s.textContent='Este enlace no está habilitado. Usa el enlace privado entregado para el piloto.';return}v.addEventListener('change',sync);a.addEventListener('change',sync);sync();b.addEventListener('click',async()=>{b.disabled=true;s.textContent='Registrando validación…';try{const r=await fetch(location.pathname,{method:'POST',headers:{'content-type':'application/json','x-pilot-key':token},body:JSON.stringify({documentaryValidation:v.checked,controlledExecutionAuthorization:a.checked})});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j&&j.message||'No fue posible registrar la validación.');v.disabled=a.disabled=b.disabled=true;s.textContent='Validación y autorización registradas correctamente. Puedes cerrar esta ventana.';history.replaceState(null,'',location.pathname)}catch(e){sync();s.textContent=String(e&&e.message||e)}})}catch{s.textContent='No fue posible validar este enlace.'}})();
</script></body></html>`;
}
function normalizeBody(body={}){
  const raw=body&&typeof body==='object'&&!Array.isArray(body)?body:{},allowed=new Set(['documentaryValidation','controlledExecutionAuthorization']);
  if(Object.keys(raw).some(k=>!allowed.has(k)))return {ok:false,code:'FIELDS_NOT_ALLOWED'};
  if(raw.documentaryValidation!==true)return {ok:false,code:'DOCUMENTARY_VALIDATION_REQUIRED'};
  if(raw.controlledExecutionAuthorization!==true)return {ok:false,code:'CONTROLLED_EXECUTION_AUTHORIZATION_REQUIRED'};
  return {ok:true};
}
function getDb(){const app=getApps()[0]||initializeApp({projectId:PROJECT_ID});return getFirestore(app);}
async function handler(req,res){
  securityHeaders(res);
  if((process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||PROJECT_ID)!==PROJECT_ID)return res.status(503).send('Proyecto no autorizado.');
  if(req.method==='GET'){res.set('Content-Type','text/html; charset=utf-8');return res.status(200).send(html());}
  if(req.method!=='POST'){res.set('Allow','GET, POST');return res.status(405).send('Método no permitido.');}
  if(Date.now()>Date.parse(EXPIRES_AT))return res.status(410).json({ok:false,message:'Este enlace de validación ya venció.'});
  if(!verifyBearerToken(req.get('x-pilot-key')))return res.status(403).json({ok:false,message:'Enlace de validación no autorizado.'});
  if(Number(req.get('content-length')||0)>3000)return res.status(413).json({ok:false,message:'Solicitud demasiado grande.'});
  const valid=normalizeBody(req.body);if(!valid.ok)return res.status(400).json({ok:false,message:'Debes confirmar ambas casillas para continuar.',code:valid.code});
  const db=getDb(),ref=db.doc(STATE_PATH),nowIso=new Date().toISOString(),state=buildState(nowIso);
  try{await db.runTransaction(async tx=>{const snap=await tx.get(ref);if(snap.exists&&snap.data()&&snap.data().used===true){const e=new Error('S471_ALREADY_USED');e.code='S471_ALREADY_USED';throw e;}tx.set(ref,state);});}
  catch(e){if(e&&e.code==='S471_ALREADY_USED')return res.status(409).json({ok:false,message:'Esta validación ya fue registrada.'});return res.status(500).json({ok:false,message:'No fue posible registrar la validación.'});}
  return res.status(201).json({ok:true,status:'VALIDATED_AND_AUTHORIZED',ownerAttestationCommitmentSha256:state.ownerAttestationSha256,secondExecutionAuthorizationCommitmentSha256:state.secondExecutionAuthorizationSha256,containsPii:false});
}
const cotcompPilotProposalValidationS471=onRequest({region:REGION,timeoutSeconds:30,maxInstances:1,concurrency:1},handler);
module.exports=Object.freeze({VERSION,PROJECT_ID,TENANT_ID,REGION,FUNCTION_NAME,TOKEN_SHA256,EXPIRES_AT,STATE_PATH,CASE_MATCH_COMMITMENT_SHA256,SOURCES,ALTERNATIVES,ATTESTATION_TEXT,EXECUTION_AUTH_TEXT,sha256,verifyBearerToken,buildState,html,normalizeBody,handler,cotcompPilotProposalValidationS471});
