'use strict';

const {onRequest}=require('firebase-functions/v2/https');
const S497=require('./cotcomp-clean-parent-s497');

const VERSION='ays-cotcomp-s499-owner-delta-visual-cta-lab-v0.1';
const PROJECT_ID='ays-orbit-360-lab';
const REGION='us-central1';
const FUNCTION_NAME='cotcompOwnerReviewS499';

const AUTH=Object.freeze({
  status:'OWNER_DELTA_REVIEW_LAB_ONLY',
  sourceParent:S497.VERSION,
  visualDelta:'STAGES_2_3_4_DIMENSIONAL_ENRICHMENT',
  ctaDelta:'OBSERVABLE_CONTEXT_PRESERVING_LAB_HANDOFF',
  ownerReviewUrlAuthorized:true,
  providerDeploymentAuthorized:false,
  cotcompRealTransportAuthorized:false,
  production:false,
  writes:false,
  realAdvisorTransport:false,
  liveCatalogDependency:'cotcompVehicleCatalogS479'
});

function securityHeaders(res){
  res.set('Cache-Control','no-store, max-age=0');
  res.set('Pragma','no-cache');
  res.set('Referrer-Policy','no-referrer');
  res.set('X-Content-Type-Options','nosniff');
  res.set('X-Frame-Options','DENY');
  res.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=()');
  res.set('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'unsafe-inline'; img-src data:; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'");
}

const DELTA_CSS=`
/* S4.99 owner delta: dimensional enrichment for stages 2-4 only */
.s499-visual-ribbon{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:16px 0 20px}
.s499-visual-chip{display:flex;align-items:center;gap:10px;min-height:64px;padding:11px 13px;border:1px solid #E5D9CD;border-radius:16px;background:linear-gradient(145deg,#fff 0%,#FBF6F0 100%);box-shadow:0 10px 24px rgba(28,22,18,.07),inset 0 1px 0 rgba(255,255,255,.9)}
.s499-visual-chip__icon{width:38px;height:38px;display:grid;place-items:center;border-radius:13px;background:linear-gradient(145deg,#fff,#F3E8DE);box-shadow:5px 5px 12px rgba(50,36,28,.12),-4px -4px 10px rgba(255,255,255,.92);font-size:20px;line-height:1}
.s499-visual-chip strong{font-family:'Archivo';font-size:12px;line-height:1.2}.s499-visual-chip small{display:block;color:#6E6258;font-size:10px;line-height:1.3;margin-top:2px}
[data-stage-panel="2"] .cc-summary{position:relative;overflow:hidden;box-shadow:0 10px 24px rgba(28,22,18,.06)}
[data-stage-panel="2"] .cc-summary::after{content:'';position:absolute;width:42px;height:42px;border-radius:50%;right:-14px;bottom:-16px;background:radial-gradient(circle,#F7B3BC 0%,rgba(247,179,188,0) 70%);opacity:.42}
[data-stage-panel="2"] .cc-field{background:linear-gradient(180deg,#fff,#FFFCF8);border-radius:14px;padding:12px;border:1px solid #EEE4DA}
[data-stage-panel="3"] .cc-review-card{box-shadow:0 12px 30px rgba(28,22,18,.08);transform:translateZ(0)}
[data-stage-panel="3"] .cc-review-card::before{content:'✦';display:grid;place-items:center;width:30px;height:30px;border-radius:10px;background:linear-gradient(145deg,#FFF4F5,#F5DED9);box-shadow:4px 4px 10px rgba(50,36,28,.10);margin-bottom:9px}
[data-stage-panel="4"] .cc-compare{box-shadow:0 16px 34px rgba(28,22,18,.08)}
[data-stage-panel="4"] .cc-rec{position:relative;overflow:hidden;box-shadow:0 18px 40px rgba(12,10,12,.18)}
[data-stage-panel="4"] .cc-rec::after{content:'✦';position:absolute;right:18px;top:14px;font-size:28px;opacity:.28}
.s499-handoff-note{display:none;margin-top:14px;border:1px solid #D9CDC2;border-left:4px solid #C51F34;border-radius:14px;background:#FFF9F7;padding:12px 14px;font-size:12px;line-height:1.45;color:#4F463F}
.s499-handoff-note.is-visible{display:block}
.s499-handoff-backdrop{position:fixed;inset:0;z-index:120;background:rgba(17,14,16,.72);display:none;align-items:center;justify-content:center;padding:20px}
.s499-handoff-backdrop.is-open{display:flex}
.s499-handoff{width:min(620px,100%);background:#fff;border-radius:22px;padding:24px;box-shadow:0 30px 90px rgba(0,0,0,.34)}
.s499-handoff__mark{width:48px;height:48px;display:grid;place-items:center;border-radius:16px;background:linear-gradient(145deg,#FFF4F5,#F1DDD9);box-shadow:6px 6px 15px rgba(50,36,28,.12),-5px -5px 12px rgba(255,255,255,.9);font-size:24px}
.s499-handoff h3{font-family:'Archivo';font-size:25px;line-height:1.08;margin:12px 0 8px}
.s499-handoff p{color:#61574F;line-height:1.5;margin:0 0 14px}
.s499-handoff__context{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:14px 0}
.s499-handoff__context div{border:1px solid #E8DED5;border-radius:12px;padding:10px;background:#FFFCF9}.s499-handoff__context small{display:block;font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:#877B71}.s499-handoff__context strong{display:block;font-size:12px;margin-top:3px}
@media(max-width:720px){.s499-visual-ribbon,.s499-handoff__context{grid-template-columns:1fr}.s499-visual-chip{min-height:54px}}
`;

function visualRibbon(kind){
  const sets={
    data:[['🧾','Datos del caso','Solo lo que corresponde a esta necesidad'],['🛡️','Protección','La captura cambia según producto y país'],['🧭','Prioridad','Tu criterio guía la explicación']],
    review:[['🔎','Revisar','Qué información está lista para avanzar'],['↔️','Bases comparables','Solo opciones que pueden contrastarse'],['⚑','Pendientes claros','Lo que falta se muestra, no se inventa']],
    compare:[['⚖️','Diferencias','Qué cambia realmente entre alternativas'],['🧩','Condiciones','Coberturas, deducibles y límites cuando existan'],['✦','Orientación A&S','Explicación consultiva, no ranking oculto']]
  };
  return '<div class="s499-visual-ribbon" data-s499-visual="'+kind+'">'+sets[kind].map(x=>'<div class="s499-visual-chip"><span class="s499-visual-chip__icon" aria-hidden="true">'+x[0]+'</span><span><strong>'+x[1]+'</strong><small>'+x[2]+'</small></span></div>').join('')+'</div>';
}

const HANDOFF_HTML=`
<div id="s499Handoff" class="s499-handoff-backdrop" role="dialog" aria-modal="true" aria-labelledby="s499HandoffTitle" aria-hidden="true">
  <div class="s499-handoff">
    <div class="s499-handoff__mark" aria-hidden="true">🤝</div>
    <div class="cc-section-kicker">CONTINUIDAD A&S · LAB</div>
    <h3 id="s499HandoffTitle">Continúa con acompañamiento sin perder el contexto</h3>
    <p id="s499HandoffText">Esta revisión prueba la continuidad del recorrido. No envía datos ni crea una solicitud real.</p>
    <div class="s499-handoff__context">
      <div><small>País</small><strong id="s499Country">—</strong></div>
      <div><small>Necesidad</small><strong id="s499Need">—</strong></div>
      <div><small>Modo</small><strong id="s499Mode">—</strong></div>
    </div>
    <div class="cc-truth">En producción, este handoff se conectará únicamente al canal A&S autorizado. En S4.99 LAB no existen escrituras, envío al asesor, emisión ni binding.</div>
    <div class="cc-actions"><button id="s499Close" class="cc-btn" type="button">Seguir revisando</button><button id="s499Assist" class="cc-btn cc-btn--primary" type="button">Continuar con acompañamiento A&S →</button></div>
  </div>
</div>
`;

const HANDOFF_SCRIPT=`
<script>
(()=>{
  const modal=document.getElementById('s499Handoff');
  const note=document.createElement('div');
  note.className='s499-handoff-note';
  note.id='s499HandoffNote';
  note.textContent='Continuidad asistida preparada en LAB. El contexto se conserva localmente; no se enviaron datos.';
  const stage4=document.querySelector('[data-stage-panel="4"] .cc-actions');
  if(stage4) stage4.insertAdjacentElement('beforebegin',note);

  function text(id,fallback){
    const el=document.getElementById(id);
    return el && el.textContent.trim() ? el.textContent.trim() : fallback;
  }
  function openHandoff(kind){
    document.getElementById('s499Country').textContent=text('selectedCountry','País actual');
    document.getElementById('s499Need').textContent=text('selectedNeed','Necesidad actual');
    document.getElementById('s499Mode').textContent=text('selectedMode','Modo actual');
    document.getElementById('s499HandoffTitle').textContent=kind==='decision'
      ? 'Continuar con A&S, conservando lo que ya revisaste'
      : 'Hablar con A&S sin empezar de cero';
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden','false');
    document.getElementById('s499Close').focus();
  }
  function closeHandoff(){
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden','true');
  }

  document.querySelectorAll('.cc-advisor').forEach(b=>b.addEventListener('click',()=>openHandoff('advisor')));
  document.querySelectorAll('.cc-actions .cc-btn').forEach(b=>{
    if(b.textContent.trim()==='Hablar con un asesor') b.addEventListener('click',()=>openHandoff('advisor'));
  });
  const decision=document.getElementById('decisionBtn');
  if(decision) decision.addEventListener('click',()=>openHandoff('decision'));

  document.getElementById('s499Close').addEventListener('click',closeHandoff);
  document.getElementById('s499Assist').addEventListener('click',()=>{
    const assisted=document.querySelector('[data-mode="assisted"]');
    if(assisted) assisted.click();
    closeHandoff();
    note.classList.add('is-visible');
    note.scrollIntoView({behavior:'smooth',block:'nearest'});
  });
  modal.addEventListener('click',e=>{if(e.target===modal)closeHandoff();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('is-open'))closeHandoff();});
})();
</script>
`;

function html(){
  let h=S497.html();
  h=h.replace(
    '<meta name="ays-status" content="SOURCE_ONLY_NOT_OWNER_REVIEW">',
    '<meta name="ays-status" content="OWNER_DELTA_REVIEW_LAB_ONLY"><meta name="ays-owner-review-authorized" content="true"><meta name="ays-owner-delta" content="S4.99_VISUAL_CTA">'
  );
  h=h.replace(
    '<title>A&S · Cotiza y compara con criterio · S4.97 clean parent</title>',
    '<title>A&S · Cotiza y compara con criterio · Owner Delta LAB S4.99</title>'
  );
  h=h.replace('</style>',DELTA_CSS+'</style>');
  h=h.replace('<div id="otherPaths" class="cc-paths" hidden></div>','<div id="otherPaths" class="cc-paths" hidden></div>'+visualRibbon('data'));
  h=h.replace('<div id="reviewContent"></div>',''+visualRibbon('review')+'<div id="reviewContent"></div>');
  h=h.replace('<div id="compareContent"></div>',''+visualRibbon('compare')+'<div id="compareContent"></div>');
  h=h.replace('Este artefacto no está autorizado para URL de Owner Review.','Vista de revisión Owner S4.99 en LAB. No constituye aprobación de producción.');
  const payload=JSON.stringify(AUTH).replace(/</g,'\\u003c');
  h=h.replace('</body>',HANDOFF_HTML+'<script type="application/json" id="s499-owner-delta-auth">'+payload+'</script>'+HANDOFF_SCRIPT+'</body>');
  return h;
}

function handler(req,res){
  securityHeaders(res);
  if(req.method!=='GET'){
    res.set('Allow','GET');
    return res.status(405).send('Método no permitido.');
  }
  res.set('Content-Type','text/html; charset=utf-8');
  return res.status(200).send(html());
}

const cotcompOwnerReviewS499=onRequest({
  region:REGION,
  timeoutSeconds:30,
  memory:'256MiB',
  maxInstances:2,
  concurrency:40,
  invoker:'public'
},handler);

module.exports=Object.freeze({
  VERSION,PROJECT_ID,REGION,FUNCTION_NAME,AUTH,securityHeaders,html,handler,cotcompOwnerReviewS499
});
