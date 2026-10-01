'use strict';

const crypto=require('node:crypto');
const {getApps,initializeApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const {onRequest}=require('firebase-functions/v2/https');
const data=require('./cotcomp-runtime-data-contract');

const VERSION='ays-cotcomp-s467-one-time-intake-v1.0';
const PROJECT_ID='ays-orbit-360-lab';
const TENANT_ID='alianzas-soluciones';
const REGION='us-central1';
const JOURNEY_ID='GT_AUTO_MOTO_HYBRID';
const COUNTRY='GT';
const TOKEN_SHA256='e932a26f52cf5777e911bbf200353c438f49f4a346ee8d197ebd1247ec6cebe7';
const EXPIRES_AT='2026-10-09T05:59:59.000Z';
const STATE_PATH='tenants/alianzas-soluciones/cotcomp/pilotIntake/items/s467';

function clean(v,max=220){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);}
function sha256(v){return crypto.createHash('sha256').update(String(v??''),'utf8').digest('hex');}
function verifyBearerToken(token,expectedHash=TOKEN_SHA256){
  const actual=sha256(clean(token,200));
  const a=Buffer.from(actual,'utf8');
  const b=Buffer.from(expectedHash,'utf8');
  return a.length===b.length&&crypto.timingSafeEqual(a,b);
}
function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(v,220));}
function validWhatsapp(v){return /^[+0-9() .-]{7,30}$/.test(clean(v,80));}
function normalizeInput(body={}){
  return Object.freeze({
    brand:clean(body.brand,180),
    lineModel:clean(body.lineModel,180),
    name:clean(body.name,180),
    whatsapp:clean(body.whatsapp,80),
    email:clean(body.email,220).toLowerCase(),
    requestManagementConsent:body.requestManagementConsent===true
  });
}
function validateInput(v){
  const errors=[];
  if(v.brand.length<1)errors.push('BRAND_REQUIRED');
  if(v.lineModel.length<1)errors.push('LINE_MODEL_REQUIRED');
  if(v.name.length<2)errors.push('NAME_REQUIRED');
  if(!validWhatsapp(v.whatsapp))errors.push('WHATSAPP_INVALID');
  if(!validEmail(v.email))errors.push('EMAIL_INVALID');
  if(v.requestManagementConsent!==true)errors.push('REQUEST_MANAGEMENT_CONSENT_REQUIRED');
  return Object.freeze({ok:errors.length===0,errors:Object.freeze(errors)});
}
function buildRealQuoteCase(v,nowIso,caseId,correlationId){
  const built=data.buildQuoteCase({
    tenantId:TENANT_ID,
    caseId,
    journeyId:JOURNEY_ID,
    correlationId,
    country:COUNTRY,
    source:'PUBLIC_WEB',
    intent:'COTIZAR',
    segment:'PERSONAS',
    riskOrProductCandidate:'AUTO',
    mode:'HYBRID',
    status:'SUBMITTED',
    progress:{journeyCompletion:true,handoffContact:true},
    capturedFields:{brand:v.brand,lineModel:v.lineModel},
    missingFields:[],
    contact:{name:v.name,whatsapp:v.whatsapp,email:v.email},
    consents:{
      requestManagement:true,
      requestManagementCapturedAt:nowIso,
      requestManagementSource:'W5_LAB_ONE_TIME_INTAKE',
      marketing:false
    },
    assignmentStatus:'UNASSIGNED',
    projectionStatus:{lead:'PENDING',ops:'PENDING'},
    createdAt:nowIso,
    updatedAt:nowIso
  });
  if(!built.ok)throw new Error('S467_QUOTECASE_BUILD_FAILED_'+(built.code||'UNKNOWN'));
  return Object.freeze({
    ...built.value,
    pilotIntake:Object.freeze({
      version:VERSION,
      oneTimeLabPilot:true,
      participantSubmitted:true,
      generalPersistenceReleased:false
    })
  });
}
function getDb(){
  const app=getApps()[0]||initializeApp({projectId:PROJECT_ID});
  return getFirestore(app);
}
function securityHeaders(res){
  res.set('Cache-Control','no-store, max-age=0');
  res.set('Pragma','no-cache');
  res.set('Referrer-Policy','no-referrer');
  res.set('X-Content-Type-Options','nosniff');
  res.set('X-Frame-Options','DENY');
  res.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=()');
  res.set('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
}
function html(){
  const expectedHash=TOKEN_SHA256;
  const expiry='8 de octubre de 2026';
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>A&S · Piloto W5 Auto/Moto</title>
<style>
:root{font-family:Segoe UI,Arial,sans-serif;color:#171717;background:#f4f4f4}
*{box-sizing:border-box} body{margin:0;padding:28px 16px;background:linear-gradient(180deg,#f8f8f8,#eeeeee)}
.wrap{max-width:720px;margin:0 auto}.card{background:#fff;border:1px solid #ddd;border-radius:18px;padding:28px;box-shadow:0 14px 40px rgba(0,0,0,.07)}
.brand{font-weight:800;font-size:20px;letter-spacing:.02em}.brand b{color:#b5121b}
h1{font-size:28px;line-height:1.15;margin:18px 0 8px}.sub{color:#555;line-height:1.55;margin:0 0 22px}
.notice{background:#f7f7f7;border-left:4px solid #b5121b;padding:14px 16px;margin:18px 0;border-radius:8px;line-height:1.45}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.full{grid-column:1/-1}
label{display:block;font-weight:600;margin-bottom:6px}input{width:100%;padding:12px 13px;border:1px solid #bbb;border-radius:9px;font:inherit}
.check{display:flex;gap:10px;align-items:flex-start;font-weight:400;line-height:1.4}.check input{width:auto;margin-top:4px}
button{width:100%;margin-top:20px;padding:13px;border:0;border-radius:10px;background:#b5121b;color:#fff;font-weight:700;font-size:16px;cursor:pointer}
button:disabled{background:#aaa;cursor:not-allowed}.status{margin-top:16px;min-height:24px;font-weight:600}.small{font-size:13px;color:#666;line-height:1.45;margin-top:18px}
@media(max-width:620px){.grid{grid-template-columns:1fr}.card{padding:22px}h1{font-size:24px}}
</style>
</head>
<body>
<div class="wrap"><div class="card">
<div class="brand"><b>A&S</b> · Alianzas y Soluciones</div>
<h1>Piloto controlado de cotización Auto/Moto</h1>
<p class="sub">Formulario exclusivo de LAB para crear un único caso real de prueba del Cotizador–Comparador. No emite pólizas, no confirma cobertura y no realiza pagos.</p>
<div class="notice"><strong>Importante:</strong> esta solicitud se usará únicamente para el piloto controlado W5. El marketing está desactivado y no se solicitarán datos de salud.</div>
<form id="f">
<div class="grid">
<div><label for="brand">Marca</label><input id="brand" maxlength="180" autocomplete="off" required></div>
<div><label for="lineModel">Línea / modelo</label><input id="lineModel" maxlength="180" autocomplete="off" required></div>
<div class="full"><label for="name">Nombre</label><input id="name" maxlength="180" autocomplete="name" required></div>
<div><label for="whatsapp">WhatsApp</label><input id="whatsapp" maxlength="30" inputmode="tel" autocomplete="tel" required></div>
<div><label for="email">Correo electrónico</label><input id="email" maxlength="220" type="email" autocomplete="email" required></div>
<div class="full"><label class="check"><input id="consent" type="checkbox" required><span>Autorizo a Alianzas y Soluciones a gestionar esta solicitud y contactarme para este piloto de cotización.</span></label></div>
</div>
<button id="submit" type="submit" disabled>Enviar solicitud de prueba</button>
</form>
<div id="status" class="status"></div>
<p class="small">Enlace de una sola utilización. Vigente hasta el ${expiry}. No compartas este enlace. Al finalizar el piloto técnico se aplicará el rollback aprobado.</p>
</div></div>
<script>
(async()=>{
  const expected='${expectedHash}';
  const token=(location.hash||'').slice(1);
  const form=document.getElementById('f');
  const btn=document.getElementById('submit');
  const status=document.getElementById('status');
  async function hash(v){
    const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v));
    return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
  }
  try{
    if(!token||await hash(token)!==expected){
      status.textContent='Este enlace no está habilitado. Usa el enlace privado entregado para el piloto.';
      return;
    }
    btn.disabled=false;
    form.addEventListener('submit',async(e)=>{
      e.preventDefault();
      btn.disabled=true; status.textContent='Enviando de forma segura…';
      const payload={
        brand:document.getElementById('brand').value,
        lineModel:document.getElementById('lineModel').value,
        name:document.getElementById('name').value,
        whatsapp:document.getElementById('whatsapp').value,
        email:document.getElementById('email').value,
        requestManagementConsent:document.getElementById('consent').checked
      };
      try{
        const r=await fetch(location.pathname,{method:'POST',headers:{'content-type':'application/json','x-pilot-key':token},body:JSON.stringify(payload)});
        const j=await r.json();
        if(!r.ok||!j.ok)throw new Error(j&&j.message||'No fue posible enviar la solicitud.');
        form.reset();
        Array.from(form.elements).forEach(x=>x.disabled=true);
        status.textContent='Solicitud recibida correctamente. Puedes cerrar esta ventana.';
        history.replaceState(null,'',location.pathname);
      }catch(err){
        btn.disabled=false;
        status.textContent=String(err&&err.message||err);
      }
    });
  }catch{
    status.textContent='No fue posible validar este enlace.';
  }
})();
</script>
</body></html>`;
}
async function handlePost(req,res){
  if(Date.now()>Date.parse(EXPIRES_AT))return res.status(410).json({ok:false,message:'Este enlace de piloto ya venció.'});
  const token=clean(req.get('x-pilot-key'),200);
  if(!verifyBearerToken(token))return res.status(403).json({ok:false,message:'Enlace de piloto no autorizado.'});
  const size=Number(req.get('content-length')||0);
  if(size>6000)return res.status(413).json({ok:false,message:'Solicitud demasiado grande.'});
  const v=normalizeInput(req.body&&typeof req.body==='object'?req.body:{});
  const validated=validateInput(v);
  if(!validated.ok)return res.status(400).json({ok:false,message:'Revisa los datos requeridos.',errors:validated.errors});

  const db=getDb();
  const stateRef=db.doc(STATE_PATH);
  const caseId='qcase_w5_'+crypto.randomBytes(12).toString('hex');
  const correlationId='corr_w5_'+crypto.randomBytes(12).toString('hex');
  const casePath=data.pathFor(TENANT_ID,data.ENTITY.QUOTE_CASE,caseId);
  const caseRef=db.doc(casePath);
  const nowIso=new Date().toISOString();
  const quoteCase=buildRealQuoteCase(v,nowIso,caseId,correlationId);

  try{
    await db.runTransaction(async tx=>{
      const stateSnap=await tx.get(stateRef);
      if(stateSnap.exists&&stateSnap.data()&&stateSnap.data().used===true){
        const e=new Error('S467_ALREADY_USED');e.code='S467_ALREADY_USED';throw e;
      }
      const caseSnap=await tx.get(caseRef);
      if(caseSnap.exists)throw new Error('S467_CASE_COLLISION');
      tx.create(caseRef,quoteCase);
      tx.set(stateRef,{
        schemaVersion:VERSION,
        tenantId:TENANT_ID,
        used:true,
        usedAt:nowIso,
        quoteCaseId:caseId,
        quoteCasePath:casePath,
        tokenSha256:TOKEN_SHA256,
        expiresAt:EXPIRES_AT,
        containsPii:false
      });
    });
  }catch(e){
    if(e&&e.code==='S467_ALREADY_USED')return res.status(409).json({ok:false,message:'Este enlace ya fue utilizado.'});
    throw e;
  }
  return res.status(201).json({
    ok:true,
    status:'RECEIVED',
    caseCommitmentSha256:sha256(casePath),
    journeyId:JOURNEY_ID,
    country:COUNTRY,
    marketingConsent:false,
    generalPersistenceReleased:false
  });
}
async function handler(req,res){
  securityHeaders(res);
  if((process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||PROJECT_ID)!==PROJECT_ID){
    return res.status(503).send('Proyecto no autorizado.');
  }
  if(req.method==='GET'){
    res.set('Content-Type','text/html; charset=utf-8');
    return res.status(200).send(html());
  }
  if(req.method==='POST'){
    try{return await handlePost(req,res);}
    catch{return res.status(500).json({ok:false,message:'No fue posible registrar la solicitud de piloto.'});}
  }
  res.set('Allow','GET, POST');
  return res.status(405).send('Método no permitido.');
}

const cotcompPilotIntakeS467=onRequest(
  {region:REGION,timeoutSeconds:30,maxInstances:1,concurrency:1},
  handler
);

module.exports=Object.freeze({
  VERSION,PROJECT_ID,TENANT_ID,REGION,JOURNEY_ID,COUNTRY,TOKEN_SHA256,EXPIRES_AT,STATE_PATH,
  sha256,verifyBearerToken,normalizeInput,validateInput,buildRealQuoteCase,html,handler,cotcompPilotIntakeS467
});
