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
.s506-register-actions button:disabled{opacity:.48;cursor:not-allowed;pointer-events:none}
.s506-register-status{display:none;margin-top:11px;border-radius:11px;padding:10px 11px;font-size:11.5px;line-height:1.45}
.s506-register-status.is-ok{display:block;background:#EEF8F1;border:1px solid #B8DEC2;color:#225D31}
.s506-register-status.is-error{display:block;background:#FFF3F3;border:1px solid #E8BEBE;color:#842D2D}
.s506-register-status.is-wait{display:block;background:#FFF8ED;border:1px solid #EAD8C5;color:#6A5639}
#s499Handoff,#s501Contact{display:none!important}
.s506-contact-backdrop{position:fixed;inset:0;z-index:240;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(18,15,18,.76)}
.s506-contact-backdrop.is-open{display:flex}
.s506-contact{width:min(680px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:24px;padding:26px;box-shadow:0 34px 100px rgba(0,0,0,.34)}
.s506-contact__mark{width:50px;height:50px;display:grid;place-items:center;border-radius:16px;background:#F6ECE6;font-size:24px}
.s506-contact h3{font-family:'Archivo';font-size:27px;line-height:1.08;margin:13px 0 8px}
.s506-contact>p{color:#61574F;line-height:1.5;margin:0 0 14px}
.s506-context{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:14px 0}
.s506-context div{border:1px solid #E8DED5;border-radius:12px;padding:10px;background:#FFFCF9}
.s506-context small{display:block;font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:#877B71}
.s506-context strong{display:block;font-size:12px;margin-top:3px}
.s506-channel-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.s506-channel{min-height:58px;border:1px solid #DDD3C8;border-radius:14px;background:#fff;padding:11px 13px;font-weight:800;text-align:left}
.s506-channel small{display:block;font-weight:500;color:#74695F;font-size:10.5px;margin-top:2px}
.s506-channel--primary{border-color:#E5002D;background:#FFF7F8}
.s506-contact__footer{margin-top:14px;padding-top:14px;border-top:1px solid #EEE5DC}
.s506-terminal-ack{display:none;margin:0 0 14px;border-radius:12px;padding:11px 13px;background:#EEF8F1;border:1px solid #B8DEC2;color:#225D31;font-size:12px;line-height:1.45}
.s506-terminal-ack.is-visible{display:block}
@media(max-width:720px){.s506-demo-grid,.s506-context,.s506-channel-grid{grid-template-columns:1fr}}
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
    <label class="s506-consent" for="s506Consent-${id}"><input id="s506Consent-${id}" type="checkbox" data-s506-consent="${id}"><span>Autorizo a A&S a gestionar esta solicitud de prueba.</span></label>
    <div class="s506-register-actions"><button id="s506Register-${id}" class="cc-btn cc-btn--primary" type="button" data-s506-register="${id}" disabled="disabled" aria-disabled="true">Registrar solicitud de prueba →</button></div>
    <div class="s506-register-status" data-s506-status="${id}" role="status" aria-live="polite"></div>
  </div>`;
}

function s506ModalHtml(){
  return '<div id="s506Contact" class="s506-contact-backdrop" role="dialog" aria-modal="true" aria-labelledby="s506ContactTitle" aria-hidden="true">'
    +'<div class="s506-contact">'
    +'<div class="s506-contact__mark" aria-hidden="true">🤝</div>'
    +'<div class="cc-section-kicker" style="margin-top:12px">CONTINUAR CON A&S</div>'
    +'<h3 id="s506ContactTitle">Hablar con A&S sin empezar de cero</h3>'
    +'<p>Confirma el registro interno de prueba o continúa por un canal directo.</p>'
    +'<div class="s506-context"><div><small>País</small><strong id="s506Country">—</strong></div><div><small>Necesidad</small><strong id="s506Need">—</strong></div><div><small>Modalidad</small><strong id="s506Mode">—</strong></div></div>'
    +registrationCard('advisor')
    +'<div class="s506-channel-grid"><button id="s506WhatsApp" class="s506-channel s506-channel--primary" type="button">💬 Continuar por WhatsApp<small id="s506WaLabel">Canal A&S</small></button><button id="s506Email" class="s506-channel" type="button">✉️ Continuar por correo<small>info@aysseguros.com</small></button></div>'
    +'<div class="s506-contact__footer"><button id="s506Close" class="cc-btn" type="button">Seguir revisando</button></div>'
    +'</div></div>';
}

const SCRIPT=`
<script>
(()=>{
  const terminalTemplate=document.getElementById('s506TerminalTemplate');
  const terminalCompletion=document.getElementById('s500Completion');
  if(terminalTemplate&&terminalCompletion&&!terminalCompletion.querySelector('[data-s506-card="terminal"]')){
    const terminalChannels=terminalCompletion.querySelector('.s501-terminal-channels');
    terminalCompletion.insertBefore(terminalTemplate.content.cloneNode(true),terminalChannels||terminalCompletion.firstChild);
  }
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
      if(b){b.disabled=!cb.checked;b.setAttribute('aria-disabled',cb.checked?'false':'true');}
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

const S506_OVERRIDE_SCRIPT=`
<script>
(()=>{
  const modal=document.getElementById('s506Contact');
  const CHANNELS={GT:{whatsapp:'50256149048',email:'info@aysseguros.com',label:'+502 5614 9048'},CO:{whatsapp:'573138340897',email:'info@aysseguros.com',label:'+57 313 834 0897'}};
  let handoffKind='advisor';
  function txt(id,fallback){const e=document.getElementById(id);return e&&e.textContent.trim()?e.textContent.trim():fallback;}
  function cc(){return /colombia/i.test(txt('selectedCountry','Guatemala'))?'CO':'GT';}
  function ctx(){return {country:txt('selectedCountry',cc()==='CO'?'Colombia':'Guatemala'),need:txt('selectedNeed','Cotización y comparación'),mode:txt('selectedMode','Con acompañamiento A&S')};}
  function nf(){const t=ctx().need.toLowerCase();if(t.includes('vehículo')||t.includes('movilidad'))return 'vehicle';if(t.includes('hogar'))return 'home';if(t.includes('salud')||t.includes('médic'))return 'health';if(t.includes('vida')||t.includes('ingreso'))return 'life';if(t.includes('empresa'))return 'business';if(t.includes('transporte')||t.includes('carga'))return 'cargo';return 'other';}
  function setRegisterStatus(id,state,msg){const el=document.querySelector('[data-s506-status="'+id+'"]');if(el){el.className='s506-register-status '+state;el.textContent=msg;}}
  function msg(){const x=ctx();return ['Hola, escribo desde Cotizar y comparar de A&S.','País: '+x.country,'Necesidad: '+x.need,'Modalidad: '+x.mode,'Quiero continuar con asesoría sin empezar de cero.'].join('\\n');}
  function open(kind){
    handoffKind=kind||'advisor';
    const x=ctx(),ch=CHANNELS[cc()];
    document.getElementById('s506Country').textContent=x.country;
    document.getElementById('s506Need').textContent=x.need;
    document.getElementById('s506Mode').textContent=x.mode;
    document.getElementById('s506WaLabel').textContent=ch.label;
    document.getElementById('s506ContactTitle').textContent=handoffKind==='decision'?'Continuar con A&S, conservando lo que ya revisaste':'Hablar con A&S sin empezar de cero';
    modal.classList.add('is-open');modal.setAttribute('aria-hidden','false');
  }
  function close(){modal.classList.remove('is-open');modal.setAttribute('aria-hidden','true');}
  function showTerminal(){
    const completion=document.getElementById('s500Completion');
    if(!completion)return;
    const stage4=document.querySelector('[data-stage-panel="4"]');
    const replan=stage4&&stage4.querySelector('.cc-replan');
    const actions=stage4&&stage4.querySelector('.cc-actions');
    if(replan)replan.style.display='none';if(actions)actions.style.display='none';
    completion.classList.add('is-visible');
    const consent=document.querySelector('[data-s506-consent="terminal"]');if(consent)consent.checked=true;
    const button=document.querySelector('[data-s506-register="terminal"]');if(button){button.disabled=false;button.setAttribute('aria-disabled','false');}
    const status=document.querySelector('[data-s506-status="terminal"]');if(status){status.className='s506-register-status is-ok';status.textContent='Integración confirmada: A&S recibió internamente la solicitud sintética y la evidencia de prueba fue limpiada automáticamente.';}
    const kicker=document.getElementById('stageKicker');if(kicker)kicker.textContent='SIGUIENTE PASO';
    const heading=document.getElementById('stageHeading');if(heading)heading.textContent='Continúa con A&S sin perder el contexto';
    completion.scrollIntoView({behavior:'smooth',block:'center'});
  }
  window.addEventListener('click',e=>{
    const b=e.target.closest&&e.target.closest('button');if(!b)return;
    const label=b.textContent.trim();
    if(b.hasAttribute('data-s506-register')){
      const id=b.getAttribute('data-s506-register');
      const consent=document.querySelector('[data-s506-consent="'+id+'"]');
      if(!consent||!consent.checked||b.disabled)return;
      e.preventDefault();e.stopImmediatePropagation();
      b.disabled=true;b.setAttribute('aria-disabled','true');
      setRegisterStatus(id,'is-wait','Registrando la solicitud de prueba y confirmando la recepción interna…');
      fetch(window.location.href,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({synthetic:true,consent:true,country:cc(),needFamily:nf()})
      }).then(async r=>{
        const j=await r.json().catch(()=>({}));
        if(!r.ok||j.integrationConfirmed!==true)throw new Error('REGISTER_FAILED');
        setRegisterStatus(id,'is-ok','Integración confirmada: A&S recibió internamente la solicitud sintética y la evidencia de prueba fue limpiada automáticamente.');
        if(id==='advisor'&&handoffKind==='decision'){close();showTerminal();}
      }).catch(()=>{
        setRegisterStatus(id,'is-error','No se pudo confirmar el registro interno. WhatsApp y correo continúan disponibles como alternativa.');
      }).finally(()=>{
        b.disabled=!consent.checked;b.setAttribute('aria-disabled',consent.checked?'false':'true');
      });
      return;
    }
    if(b.classList.contains('cc-advisor')||label==='Hablar con un asesor'){e.preventDefault();e.stopImmediatePropagation();open('advisor');return;}
    if(b.id==='decisionBtn'||label.startsWith('Continuar con A&S')){e.preventDefault();e.stopImmediatePropagation();open('decision');return;}
  },true);
  document.getElementById('s506Close').addEventListener('click',close);
  document.getElementById('s506WhatsApp').addEventListener('click',()=>{const ch=CHANNELS[cc()];window.open('https://wa.me/'+ch.whatsapp+'?text='+encodeURIComponent(msg()),'_blank','noopener');});
  document.getElementById('s506Email').addEventListener('click',()=>{const ch=CHANNELS[cc()],x=ctx();window.location.href='mailto:'+ch.email+'?subject='+encodeURIComponent('Continuidad Cotizar y comparar A&S · '+x.country)+'&body='+encodeURIComponent(msg());});
  modal.addEventListener('click',e=>{if(e.target===modal)close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('is-open'))close();});
  const advisorStatus=document.querySelector('[data-s506-status="advisor"]');
  if(advisorStatus){new MutationObserver(()=>{if(handoffKind==='decision'&&advisorStatus.classList.contains('is-ok')){close();showTerminal();}}).observe(advisorStatus,{attributes:true,childList:true,subtree:true});}
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
  h=h.replace('</body>',s506ModalHtml()+'<template id="s506TerminalTemplate">'+registrationCard('terminal')+'</template>'+SCRIPT+S506_OVERRIDE_SCRIPT+'</body>');
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
