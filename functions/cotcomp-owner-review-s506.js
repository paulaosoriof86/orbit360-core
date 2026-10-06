'use strict';

const crypto=require('node:crypto');
const {getApps,initializeApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const {onRequest}=require('firebase-functions/v2/https');
const S501=require('./cotcomp-owner-review-s501');

const VERSION='ays-cotcomp-s506-ui-inbound-lab-synthetic-v0.1';
const PROJECT_ID='ays-orbit-360-lab';
const TENANT_ID='alianzas-soluciones';
const REGION='us-central1';
const FUNCTION_NAME='cotcompOwnerReviewS506';
const INBOUND_URL='https://us-central1-ays-orbit-360-lab.cloudfunctions.net/cotcompPublicInboundS505';
const PAGE_ORIGIN='https://us-central1-ays-orbit-360-lab.cloudfunctions.net';

const app=getApps()[0]||initializeApp();
const db=getFirestore(app);

function clean(v,max=500){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);}
function sha(v){return crypto.createHash('sha256').update(String(v??''),'utf8').digest('hex');}
function country(v){const x=clean(v,8).toUpperCase();return x==='GT'||x==='CO'?x:'';}
function family(v){
  const x=clean(v,80).toLowerCase();
  return ['vehicle','home','health','life','business','cargo','other'].includes(x)?x:'';
}
function businessRef(storageMode,id){
  return storageMode==='canonicalV2'
    ? db.collection('tenants').doc(TENANT_ID).collection('workflow').doc('negocios').collection('items').doc(id)
    : db.collection('tenantId').doc(TENANT_ID).collection('negocios').doc(id);
}
async function storageMode(){
  const s=await db.collection('tenants').doc(TENANT_ID).collection('config').doc('workflow').get();
  return s.exists&&s.data().storageMode==='canonicalV2'?'canonicalV2':'legacyCompatible';
}
async function cleanupSynthetic(ids){
  const mode=await storageMode();
  const refs=[
    db.collection('tenants').doc(TENANT_ID).collection('syntheticProofPermits').doc(ids.proofRunId),
    db.collection('tenants').doc(TENANT_ID).collection('members').doc(ids.uid),
    businessRef(mode,ids.businessId),
    db.collection('tenants').doc(TENANT_ID).collection('workflowRequests').doc(ids.requestId),
    db.collection('tenants').doc(TENANT_ID).collection('workflowEvents').doc(ids.eventId),
    db.collection('tenants').doc(TENANT_ID).collection('notificationOutbox').doc(ids.eventId)
  ];
  const batch=db.batch();let deletes=0;
  for(const ref of refs){const s=await ref.get();if(s.exists){batch.delete(ref);deletes++;}}
  if(deletes)await batch.commit();
  for(const ref of refs){const s=await ref.get();if(s.exists)throw new Error('S506_FINAL_ABSENCE_FAILED');}
  return {deletes,finalAbsence:true};
}
async function runSyntheticIntegration({countryCode,needFamily}){
  const nonce=crypto.randomBytes(10).toString('hex');
  const proofRunId='s505-ui-'+nonce;
  const idempotencyKey='idem-ui-'+nonce;
  const token=crypto.randomBytes(24).toString('hex');
  const suffix=sha(proofRunId+'|'+idempotencyKey).slice(0,20);
  const uid='s506_uid_'+nonce;
  const advisorId='s506_adv_'+nonce;
  const businessId='s505_neg_'+suffix;
  const requestId='s505_req_'+suffix;
  const eventId='evt_'+sha(TENANT_ID+'|'+requestId).slice(0,28);

  const permitRef=db.collection('tenants').doc(TENANT_ID).collection('syntheticProofPermits').doc(proofRunId);
  const memberRef=db.collection('tenants').doc(TENANT_ID).collection('members').doc(uid);
  const permit={
    schemaVersion:'ays-cotcomp-s506-ui-proof-permit-v1.0',
    proofRunId,synthetic:true,enabled:true,uid,advisorId,country:countryCode,
    tokenDigest:sha(token),expiresAtEpochMs:Date.now()+10*60*1000
  };
  const member={
    schemaVersion:'ays-cotcomp-s506-ui-synthetic-member-v1.0',
    uid,tenantId:TENANT_ID,status:'active',active:true,
    roles:['SuperAdmin'],defaultRole:'SuperAdmin',activeRole:'SuperAdmin',
    advisorId,countries:[countryCode],dataScopes:{workflow:'all'},
    synthetic:true,proofRunId
  };
  const ids={proofRunId,uid,advisorId,businessId,requestId,eventId};
  let first=null;
  try{
    await permitRef.create(permit);
    await memberRef.create(member);

    const body={synthetic:true,proofRunId,idempotencyKey,country:countryCode,needFamily};
    const request=()=>fetch(INBOUND_URL,{
      method:'POST',
      headers:{
        'Origin':'https://aysseguros.com',
        'Content-Type':'application/json',
        'X-Ays-Proof-Token':token
      },
      body:JSON.stringify(body)
    });

    const r1=await request();
    const j1=await r1.json().catch(()=>({}));
    if(r1.status!==200||j1.ok!==true||j1.registered!==true)throw new Error('S506_FIRST_SUBMISSION_FAILED');
    first=j1;

    const r2=await request();
    const j2=await r2.json().catch(()=>({}));
    if(r2.status!==200||j2.reused!==true)throw new Error('S506_RETRY_NOT_REUSED');
    for(const k of ['entityId','requestId','eventId','advisorId'])if(j1[k]!==j2[k])throw new Error('S506_RETRY_IDENTITY_MISMATCH');

    const mode=await storageMode();
    const [b,q,e,o]=await Promise.all([
      businessRef(mode,j1.entityId).get(),
      db.collection('tenants').doc(TENANT_ID).collection('workflowRequests').doc(j1.requestId).get(),
      db.collection('tenants').doc(TENANT_ID).collection('workflowEvents').doc(j1.eventId).get(),
      db.collection('tenants').doc(TENANT_ID).collection('notificationOutbox').doc(j1.eventId).get()
    ]);
    if(!b.exists||!q.exists||!e.exists||!o.exists)throw new Error('S506_READBACK_MISSING');
    const outbox=o.data()||{};
    const targeted=[].concat(outbox.targets||[]).some(t=>t&&t.type==='advisor'&&t.id===advisorId);
    if(!targeted)throw new Error('S506_ADVISOR_TARGET_MISSING');

    const cleanup=await cleanupSynthetic(ids);
    return {
      ok:true,
      synthetic:true,
      integrationConfirmed:true,
      retryReused:true,
      advisorTargetConfirmed:true,
      cleaned:cleanup.finalAbsence===true,
      displayReference:clean(j1.entityId,80),
      productionTouched:false,
      realCustomerDataUsed:false
    };
  }catch(error){
    try{await cleanupSynthetic(ids);}catch(cleanError){console.error('S506_CLEANUP_FAILED',cleanError&&cleanError.message||'unknown');}
    throw error;
  }
}

const CSS=`
.s506-register-card{margin:16px 0;border:1px solid #DED3C9;border-radius:17px;background:linear-gradient(145deg,#FFF,#FFF9F5);padding:16px}
.s506-register-card__head{display:flex;align-items:flex-start;gap:10px}
.s506-register-card__icon{width:38px;height:38px;display:grid;place-items:center;border-radius:12px;background:#F6ECE6;font-size:19px;flex:0 0 auto}
.s506-register-card h4{font-family:'Archivo';font-size:16px;margin:1px 0 4px}
.s506-register-card p{font-size:11.5px;line-height:1.45;color:#6E625A;margin:0}
.s506-demo-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:13px 0}
.s506-demo-grid div{border:1px solid #E9E0D8;border-radius:11px;padding:9px 10px;background:#fff}
.s506-demo-grid small{display:block;font-size:8.5px;letter-spacing:.07em;text-transform:uppercase;color:#8A7C71}
.s506-demo-grid strong{display:block;font-size:11.5px;margin-top:2px}
.s506-consent{display:flex;align-items:flex-start;gap:8px;margin:11px 0;font-size:11.5px;line-height:1.4;color:#544A44}
.s506-consent input{margin-top:2px;width:16px;height:16px}
.s506-register-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.s506-register-status{display:none;margin-top:11px;border-radius:11px;padding:10px 11px;font-size:11.5px;line-height:1.45}
.s506-register-status.is-ok{display:block;background:#EEF8F1;border:1px solid #B8DEC2;color:#225D31}
.s506-register-status.is-error{display:block;background:#FFF3F3;border:1px solid #E8BEBE;color:#842D2D}
.s506-register-status.is-wait{display:block;background:#FFF8ED;border:1px solid #EAD8C5;color:#6A5639}
@media(max-width:720px){.s506-demo-grid{grid-template-columns:1fr}}
`;

function registrationCard(id){
  return `<div class="s506-register-card" data-s506-card="${id}">
    <div class="s506-register-card__head"><div class="s506-register-card__icon" aria-hidden="true">🔔</div><div>
      <h4>Registrar solicitud de prueba en A&S</h4>
      <p>Esta prueba usa únicamente datos sintéticos. Sirve para validar que Cotizar y comparar puede registrar el caso internamente sin depender solo de WhatsApp o correo.</p>
    </div></div>
    <div class="s506-demo-grid">
      <div><small>Nombre</small><strong>Persona de prueba A&S</strong></div>
      <div><small>Contacto</small><strong>synthetic@example.invalid</strong></div>
    </div>
    <label class="s506-consent"><input type="checkbox" data-s506-consent="${id}"><span>Autorizo a A&S a gestionar esta solicitud de prueba.</span></label>
    <div class="s506-register-actions"><button class="cc-btn cc-btn--primary" type="button" data-s506-register="${id}" disabled>Registrar solicitud de prueba →</button></div>
    <div class="s506-register-status" data-s506-status="${id}" role="status" aria-live="polite"></div>
  </div>`;
}

const SCRIPT=`
<script>
(()=>{
  function countryCode(){
    const t=(document.getElementById('selectedCountry')?.textContent||'Guatemala').toLowerCase();
    return t.includes('colombia')?'CO':'GT';
  }
  function needFamily(){
    const t=(document.getElementById('selectedNeed')?.textContent||'Orientación').toLowerCase();
    if(t.includes('vehículo')||t.includes('movilidad'))return 'vehicle';
    if(t.includes('hogar'))return 'home';
    if(t.includes('salud')||t.includes('médic'))return 'health';
    if(t.includes('vida')||t.includes('ingreso'))return 'life';
    if(t.includes('empresa'))return 'business';
    if(t.includes('transporte')||t.includes('carga'))return 'cargo';
    return 'other';
  }
  function statusFor(id){
    return document.querySelector('[data-s506-status="'+id+'"]');
  }
  function setStatus(id,state,msg){
    const el=statusFor(id);if(!el)return;
    el.className='s506-register-status '+state;
    el.textContent=msg;
  }
  document.querySelectorAll('[data-s506-consent]').forEach(cb=>{
    cb.addEventListener('change',()=>{
      const id=cb.getAttribute('data-s506-consent');
      const b=document.querySelector('[data-s506-register="'+id+'"]');
      if(b)b.disabled=!cb.checked;
    });
  });
  document.querySelectorAll('[data-s506-register]').forEach(btn=>{
    btn.addEventListener('click',async()=>{
      const id=btn.getAttribute('data-s506-register');
      const consent=document.querySelector('[data-s506-consent="'+id+'"]');
      if(!consent||!consent.checked)return;
      btn.disabled=true;
      setStatus(id,'is-wait','Registrando la solicitud de prueba y confirmando la recepción interna…');
      try{
        const r=await fetch(window.location.href,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({synthetic:true,consent:true,country:countryCode(),needFamily:needFamily()})
        });
        const j=await r.json();
        if(!r.ok||j.integrationConfirmed!==true)throw new Error('REGISTER_FAILED');
        setStatus(id,'is-ok','Integración confirmada: A&S recibió internamente la solicitud sintética y la evidencia de prueba fue limpiada automáticamente.');
      }catch(e){
        setStatus(id,'is-error','No se pudo confirmar el registro interno. WhatsApp y correo continúan disponibles como alternativa.');
      }finally{
        btn.disabled=!consent.checked;
      }
    });
  });
})();
</script>
`;

function html(){
  let h=S501.html();
  h=h.replace('</style>',CSS+'</style>');
  h=h.replace(
    '<div class="s501-channel-grid">',
    registrationCard('advisor')+'<div class="s501-channel-grid">'
  );
  h=h.replace(
    '<div class="s501-terminal-channels">',
    registrationCard('terminal')+'<div class="s501-terminal-channels">'
  );
  h=h.replace('</body>',SCRIPT+'</body>');
  h=h.replace('Owner Review S5.00','Owner Review S5.06');
  return h;
}

function securityHeaders(res){S501.securityHeaders(res);}

async function handler(req,res){
  securityHeaders(res);
  res.set('Cache-Control','no-store');
  if(req.method==='GET'){
    res.set('Content-Type','text/html; charset=utf-8');
    return res.status(200).send(html());
  }
  if(req.method!=='POST'){
    res.set('Allow','GET, POST');
    return res.status(405).json({ok:false,integrationConfirmed:false});
  }
  const project=process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||PROJECT_ID;
  if(project!==PROJECT_ID)return res.status(503).json({ok:false,integrationConfirmed:false});
  const origin=clean(req.get('origin'),300).replace(/\/$/,'');
  if(origin!==PAGE_ORIGIN)return res.status(403).json({ok:false,integrationConfirmed:false});
  const body=req.body&&typeof req.body==='object'?req.body:{};
  if(body.synthetic!==true||body.consent!==true)return res.status(403).json({ok:false,integrationConfirmed:false});
  const cc=country(body.country),nf=family(body.needFamily);
  if(!cc||!nf)return res.status(400).json({ok:false,integrationConfirmed:false});
  try{
    const result=await runSyntheticIntegration({countryCode:cc,needFamily:nf});
    return res.status(200).json(result);
  }catch(error){
    console.error('S506_UI_INTEGRATION_FAILED',error&&error.message||'unknown');
    return res.status(500).json({ok:false,integrationConfirmed:false,productionTouched:false,realCustomerDataUsed:false});
  }
}

const cotcompOwnerReviewS506=onRequest({
  region:REGION,
  timeoutSeconds:45,
  memory:'256MiB',
  maxInstances:1,
  concurrency:1,
  invoker:'public'
},handler);

module.exports=Object.freeze({
  VERSION,PROJECT_ID,TENANT_ID,REGION,FUNCTION_NAME,INBOUND_URL,PAGE_ORIGIN,
  country,family,registrationCard,html,runSyntheticIntegration,securityHeaders,handler,cotcompOwnerReviewS506
});
