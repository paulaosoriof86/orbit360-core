'use strict';

const {onRequest}=require('firebase-functions/v2/https');
const S499=require('./cotcomp-owner-review-s499');

const VERSION='ays-cotcomp-s500-owner-consolidated-ux-lab-v0.1';
const PROJECT_ID='ays-orbit-360-lab';
const REGION='us-central1';
const FUNCTION_NAME='cotcompOwnerReviewS500';

const AUTH=Object.freeze({
  status:'OWNER_CONSOLIDATED_UX_REVIEW_ONLY',
  parent:S499.VERSION,
  ownerReviewUrlAuthorized:true,
  production:false,
  writes:false,
  providerDeploymentAuthorized:false,
  cotcompRealTransportAuthorized:false,
  realAdvisorTransport:false,
  realQuoteTransport:false,
  changes:Object.freeze({
    heroComposition:true,
    modeSelector:true,
    vehicleComboboxClose:true,
    removeTechnicalLabCopy:true,
    demoAlternativeHumanCopy:true,
    darkSurfaceRebalance:true,
    continuityTerminalState:true
  })
});

function securityHeaders(res){
  S499.securityHeaders(res);
}

const S500_CSS=`
/* S5.00 owner consolidated UX delta */

/* Hero: complete, non-overlapped composition */
.cc-hero{
  height:330px;
  min-height:330px;
  grid-template-columns:minmax(0,.98fr) minmax(0,1.02fr);
}
.cc-hero__copy{
  padding-top:24px;
  padding-bottom:24px;
}
.cc-hero__title{
  font-size:clamp(39px,3.45vw,52px);
  line-height:.96;
  max-width:11ch;
  margin:12px 0 12px;
}
.cc-hero__lead{font-size:15px;line-height:1.44}
.cc-hero__benefits{margin-top:15px}
.cc-hero__media{min-height:330px}
.cc-hero__media img{object-position:center 38%}
.cc-wrap{margin:22px auto 64px}

/* Mode choice becomes an explicit premium decision, not a small tab */
.cc-mode-toggle{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,300px));
  gap:12px;
  margin:0 0 28px;
}
.cc-mode{
  min-height:76px;
  position:relative;
  text-align:left;
  border:1px solid #DDD3C8;
  background:#fff;
  border-radius:16px;
  padding:14px 16px 14px 58px;
  font-size:15px;
  line-height:1.18;
  font-weight:800;
  color:#1A171B;
  box-shadow:0 8px 20px rgba(35,28,24,.05);
  transition:border-color .18s ease,box-shadow .18s ease,transform .18s ease,background .18s ease;
}
.cc-mode::before{
  position:absolute;
  left:14px;
  top:16px;
  width:32px;
  height:32px;
  display:grid;
  place-items:center;
  border-radius:11px;
  background:linear-gradient(145deg,#FFF,#F3E7DF);
  box-shadow:4px 4px 10px rgba(50,36,28,.10),-3px -3px 9px rgba(255,255,255,.95);
  font-size:17px;
}
.cc-mode[data-mode="online"]::before{content:'💻'}
.cc-mode[data-mode="assisted"]::before{content:'🤝'}
.cc-mode small{
  display:block;
  margin-top:5px;
  font-size:11.25px;
  line-height:1.32;
  font-weight:500;
  color:#74695F;
}
.cc-mode:hover{transform:translateY(-1px);border-color:#C9BAB0;box-shadow:0 12px 26px rgba(35,28,24,.08)}
.cc-mode.is-active{
  background:linear-gradient(145deg,#FFF8F8,#FFF);
  border:2px solid #E5002D;
  color:#171318;
  box-shadow:0 12px 28px rgba(229,0,45,.10);
}
.cc-mode.is-active small{color:#5F5550}

/* Rebalance black: keep rail, compare header and recommendation as anchors */
.cc-stage__head{background:#29252A}
.cc-summary{
  background:linear-gradient(180deg,#FFF,#FBF7F2)!important;
  color:#171318!important;
  border:1px solid #E8DED4!important;
  box-shadow:0 10px 22px rgba(32,25,22,.05)!important;
}
.cc-summary small{color:#8A756F!important}
.cc-summary strong{color:#171318!important}
.cc-summary::after{display:none!important}
.cc-route-copy{
  background:linear-gradient(135deg,#2B272B,#3B2026)!important;
}
.cc-rec{
  background:linear-gradient(135deg,#1C191D 0%,#35171E 100%)!important;
}

/* Softer demo / truth messages */
.cc-truth{
  background:#FFF9EF;
  border-color:#EBD3A5;
  color:#65543A;
}
.cc-combo-status{
  background:#F7F4EF!important;
  border-color:#E7DED4!important;
  color:#6C625B!important;
}

/* Terminal continuity state: step 4 closes instead of looping */
.s500-completion{
  display:none;
  margin:22px 0 4px;
  border:1px solid #E1D5CC;
  border-left:4px solid #E5002D;
  border-radius:20px;
  background:linear-gradient(145deg,#FFF,#FFF8F5);
  padding:24px;
  box-shadow:0 16px 38px rgba(31,24,22,.08);
}
.s500-completion.is-visible{display:block}
.s500-completion__mark{
  width:48px;height:48px;display:grid;place-items:center;border-radius:16px;
  background:linear-gradient(145deg,#FFF,#F4E5DE);
  box-shadow:5px 5px 12px rgba(50,36,28,.11),-4px -4px 10px rgba(255,255,255,.95);
  font-size:24px;
}
.s500-completion h3{
  font-family:'Archivo';font-size:27px;line-height:1.05;margin:13px 0 8px;
}
.s500-completion p{max-width:72ch;color:#625850;line-height:1.55;margin:0}
.s500-completion__context{
  display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:18px 0;
}
.s500-completion__context div{
  border:1px solid #E8DED4;border-radius:13px;background:#FFFCF9;padding:11px 12px;
}
.s500-completion__context small{
  display:block;text-transform:uppercase;letter-spacing:.08em;color:#8B7D72;font-size:9px;
}
.s500-completion__context strong{display:block;font-size:12.5px;margin-top:3px}
.s500-completion__next{
  display:flex;align-items:flex-start;gap:10px;border-radius:14px;background:#F7F3EE;padding:13px 14px;margin-bottom:16px;
}
.s500-completion__next span{font-size:20px}.s500-completion__next b{display:block;font-size:13px}.s500-completion__next small{display:block;color:#6B625C;line-height:1.4;margin-top:2px}

.s500-assist-ack{
  display:none;
  margin:-12px 0 20px;
  padding:11px 13px;
  border-radius:12px;
  border:1px solid #E7D7CF;
  background:#FFF8F5;
  font-size:12px;
  color:#5F5550;
}
.s500-assist-ack.is-visible{display:block}

@media(max-width:900px){
  .cc-hero{height:auto;min-height:0;grid-template-columns:1fr}
  .cc-hero__media{min-height:260px}
  .cc-wrap{margin:16px auto 48px}
}
@media(max-width:720px){
  .cc-mode-toggle{grid-template-columns:1fr}
  .cc-mode{min-height:70px}
  .s500-completion__context{grid-template-columns:1fr}
}
`;

const S500_SCRIPT=`
<script>
(()=>{
  let handoffKind='advisor';

  const modal=document.getElementById('s499Handoff');
  const assist=document.getElementById('s499Assist');
  const stage4=document.querySelector('[data-stage-panel="4"]');
  const stage4Actions=stage4 ? stage4.querySelector('.cc-actions') : null;
  const replan=stage4 ? stage4.querySelector('.cc-replan') : null;

  const ack=document.createElement('div');
  ack.id='s500AssistAck';
  ack.className='s500-assist-ack';
  ack.textContent='Acompañamiento A&S seleccionado. Puedes continuar el recorrido sin perder lo que ya elegiste.';
  const mode=document.querySelector('.cc-mode-toggle');
  if(mode) mode.insertAdjacentElement('afterend',ack);

  const completion=document.createElement('section');
  completion.id='s500Completion';
  completion.className='s500-completion';
  completion.setAttribute('aria-live','polite');
  completion.innerHTML=
    '<div class="s500-completion__mark" aria-hidden="true">✓</div>'+
    '<div class="cc-section-kicker" style="margin-top:12px">SIGUIENTE PASO</div>'+
    '<h3>Tu continuidad con A&S está preparada.</h3>'+
    '<p>Conservamos el contexto de lo que revisaste. En la experiencia conectada, el siguiente paso será derivar este contexto al canal A&S autorizado para continuar el acompañamiento. En esta vista de revisión no se envían datos ni se crea una solicitud real.</p>'+
    '<div class="s500-completion__context">'+
      '<div><small>País</small><strong id="s500Country">—</strong></div>'+
      '<div><small>Necesidad</small><strong id="s500Need">—</strong></div>'+
      '<div><small>Modalidad</small><strong id="s500Mode">—</strong></div>'+
    '</div>'+
    '<div class="s500-completion__next"><span aria-hidden="true">🤝</span><div><b>¿Qué sigue en la versión conectada?</b><small>A&S recibe el contexto autorizado, continúa la asesoría y define contigo el siguiente paso válido. Esto no equivale a emisión ni contratación automática.</small></div></div>'+
    '<div class="cc-actions" style="margin:0">'+
      '<button id="s500BackCompare" class="cc-btn" type="button">← Volver a comparar</button>'+
      '<button id="s500ReviewNeed" class="cc-btn cc-btn--primary" type="button">Revisar otra necesidad →</button>'+
    '</div>';
  if(stage4Actions) stage4Actions.insertAdjacentElement('beforebegin',completion);

  function currentText(id,fallback){
    const el=document.getElementById(id);
    return el && el.textContent.trim() ? el.textContent.trim() : fallback;
  }

  function closeModal(){
    if(!modal)return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden','true');
  }

  function showCompletion(){
    const c=document.getElementById('s500Country');
    const n=document.getElementById('s500Need');
    const m=document.getElementById('s500Mode');
    if(c)c.textContent=currentText('selectedCountry','País actual');
    if(n)n.textContent=currentText('selectedNeed','Necesidad actual');
    if(m)m.textContent='Con acompañamiento A&S';

    const oldNote=document.getElementById('s499HandoffNote');
    if(oldNote)oldNote.classList.remove('is-visible');
    if(replan)replan.style.display='none';
    if(stage4Actions)stage4Actions.style.display='none';
    completion.classList.add('is-visible');

    const kicker=document.getElementById('stageKicker');
    const heading=document.getElementById('stageHeading');
    if(kicker)kicker.textContent='SIGUIENTE PASO';
    if(heading)heading.textContent='Continúa con A&S sin perder el contexto';

    completion.scrollIntoView({behavior:'smooth',block:'center'});
  }

  function restoreCompare(){
    completion.classList.remove('is-visible');
    if(replan)replan.style.display='';
    if(stage4Actions)stage4Actions.style.display='';
    const kicker=document.getElementById('stageKicker');
    const heading=document.getElementById('stageHeading');
    if(kicker)kicker.textContent='COMPARAR';
    if(heading)heading.textContent='Compara y elige cómo continuar';
    if(stage4)stage4.scrollIntoView({behavior:'smooth',block:'start'});
  }

  document.querySelectorAll('.cc-advisor').forEach(b=>b.addEventListener('click',()=>{handoffKind='advisor';},true));
  document.querySelectorAll('.cc-actions .cc-btn').forEach(b=>{
    if(b.textContent.trim()==='Hablar con un asesor') b.addEventListener('click',()=>{handoffKind='advisor';},true);
  });
  const decision=document.getElementById('decisionBtn');
  if(decision)decision.addEventListener('click',()=>{handoffKind='decision';},true);

  if(assist){
    assist.addEventListener('click',e=>{
      e.preventDefault();
      e.stopImmediatePropagation();
      const assisted=document.querySelector('[data-mode="assisted"]');
      if(assisted && !assisted.classList.contains('is-active')) assisted.click();
      closeModal();
      if(handoffKind==='decision'){
        showCompletion();
      }else{
        ack.classList.add('is-visible');
        ack.scrollIntoView({behavior:'smooth',block:'nearest'});
      }
    },true);
  }

  document.getElementById('s500BackCompare').addEventListener('click',restoreCompare);
  document.getElementById('s500ReviewNeed').addEventListener('click',()=>{
    restoreCompare();
    const first=document.querySelector('[data-prev="3"]');
    if(first)first.click();
    const to2=document.querySelector('[data-prev="2"]');
    if(to2)to2.click();
    const to1=document.querySelector('[data-prev="1"]');
    if(to1)to1.click();
  });

  // Robust close after a vehicle brand/model option is selected.
  document.addEventListener('mousedown',e=>{
    const option=e.target.closest && e.target.closest('.cc-combo-option[data-kind]');
    if(!option)return;
    setTimeout(()=>{
      document.querySelectorAll('.cc-combo-list').forEach(list=>list.classList.remove('is-open'));
      document.querySelectorAll('[data-vehicle-combo]').forEach(input=>{
        input.setAttribute('aria-expanded','false');
        input.removeAttribute('aria-activedescendant');
      });
    },160);
  },true);

  // Close lists when focus leaves either combobox area.
  document.addEventListener('focusin',e=>{
    if(e.target.closest && e.target.closest('.cc-combo'))return;
    document.querySelectorAll('.cc-combo-list').forEach(list=>list.classList.remove('is-open'));
    document.querySelectorAll('[data-vehicle-combo]').forEach(input=>input.setAttribute('aria-expanded','false'));
  });
})();
</script>
`;

function humanizeVisibleCopy(h){
  return h
    .replace(/Owner Delta LAB S4\.99/g,'Owner Review S5.00')
    .replace(/SOURCE-ONLY LAB ·/g,'Vista de revisión ·')
    .replace(/CONTINUIDAD A&S · LAB/g,'CONTINUIDAD A&S')
    .replace(/En S4\.99 LAB no existen escrituras, envío al asesor, emisión ni binding\./g,'En esta vista de revisión no se envían datos ni se crea una solicitud real.')
    .replace(/Continuidad asistida preparada en LAB\. El contexto se conserva localmente; no se enviaron datos\./g,'Acompañamiento A&S seleccionado. El contexto se conserva mientras continúas.')
    .replace(/Vista de revisión Owner S4\.99 en LAB\. No constituye aprobación de producción\./g,'Vista de revisión. No constituye oferta, emisión ni contratación.')
    .replace(/SOURCE-ONLY LAB · No constituye oferta, emisión ni conexión real con aseguradoras\. Gravicentra conserva la autoridad operativa\. Vista de revisión Owner S4\.99 en LAB\. No constituye aprobación de producción\./g,'Vista de revisión · No constituye oferta, emisión ni contratación.')
    .replace(/Marca y línea\/modelo se validan contra el catálogo vehicular LAB cuando está disponible\. La tarifa y elegibilidad no se calculan aquí\./g,'Marca y línea/modelo se validan contra el catálogo disponible. La tarifa y elegibilidad se confirman únicamente con alternativas válidas.')
    .replace(/Identidad vehicular seleccionada desde el catálogo LAB\. La elegibilidad y tarifa siguen bajo autoridad de Gravicentra\./g,'Vehículo identificado. La tarifa y elegibilidad se confirman únicamente con alternativas válidas.')
    .replace(/El catálogo vehicular no está disponible en esta vista\. Puedes continuar con A&S sin escoger un dato incorrecto\./g,'No fue posible consultar el catálogo en este momento. Puedes continuar con A&S sin escoger un dato incorrecto.')
    .replace(/Ejemplo visual A/g,'Alternativa A')
    .replace(/Ejemplo visual B/g,'Alternativa B')
    .replace(/Ejemplo visual · sin propuesta real/g,'Vista demostrativa · aquí aparecerá la propuesta validada')
    .replace(/Esta es una plantilla visual source-only para revisar la experiencia\. No representa cotizaciones reales ni propuestas validadas\./g,'Esta vista muestra la estructura del recorrido. En uso real, aquí aparecerán únicamente las alternativas validadas para tu caso.')
    .replace(/Esta vista muestra la estructura del comparador\. En uso real solo se habilita con al menos dos alternativas validadas y comparables\./g,'En uso real, esta comparación se completa únicamente cuando existan al menos dos alternativas validadas y comparables.')
    .replace(/Así se verá la orientación cuando existan propuestas reales comparables\./g,'La orientación A&S se construirá con las alternativas reales comparables.')
    .replace(/La estructura se muestra sin inventar primas, deducibles ni coberturas\. La recomendación real se construirá únicamente con propuestas validadas\./g,'En esta vista no inventamos primas, deducibles ni coberturas. La recomendación se construirá únicamente con propuestas validadas.')
    .replace(/Ver estructura comparativa →/g,'Ver cómo se compararán →');
}

function html(){
  let h=humanizeVisibleCopy(S499.html());
  h=h.replace('await loadModels();renderModels();modelInput.focus();','await loadModels();close(brandList,brandInput);close(modelList,modelInput);');
  h=h.replace(
    '<meta name="ays-owner-delta" content="S4.99_VISUAL_CTA">',
    '<meta name="ays-owner-delta" content="S5.00_CONSOLIDATED_OWNER_UX">'
  );
  h=h.replace('</style>',S500_CSS+'</style>');
  const payload=JSON.stringify(AUTH).replace(/</g,'\\u003c');
  h=h.replace('</body>','<script type="application/json" id="s500-owner-delta-auth">'+payload+'</script>'+S500_SCRIPT+'</body>');
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

const cotcompOwnerReviewS500=onRequest({
  region:REGION,
  timeoutSeconds:30,
  memory:'256MiB',
  maxInstances:2,
  concurrency:40,
  invoker:'public'
},handler);

module.exports=Object.freeze({
  VERSION,PROJECT_ID,REGION,FUNCTION_NAME,AUTH,securityHeaders,html,handler,cotcompOwnerReviewS500
});
