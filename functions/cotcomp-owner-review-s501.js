'use strict';

const {onRequest}=require('firebase-functions/v2/https');
const S500=require('./cotcomp-owner-review-s500');

const VERSION='ays-cotcomp-s501-real-channels-hero-cleanup-lab-v0.1';
const PROJECT_ID='ays-orbit-360-lab';
const REGION='us-central1';
const FUNCTION_NAME='cotcompOwnerReviewS501';

const AUTH=Object.freeze({
  status:'OWNER_REVIEW_REAL_CHANNELS_LAB_ONLY',
  parent:S500.VERSION,
  ownerReviewUrlAuthorized:true,
  production:false,
  writes:false,
  providerDeploymentAuthorized:false,
  cotcompRealTransportAuthorized:false,
  automaticInternalNotification:false,
  publicContactChannels:Object.freeze({
    gt:Object.freeze({whatsapp:'50256149048',email:'info@aysseguros.com'}),
    co:Object.freeze({whatsapp:'573138340897',email:'info@aysseguros.com'})
  })
});

function securityHeaders(res){
  S500.securityHeaders(res);
}

const S501_CSS=`
/* S5.01 — Owner feedback: clean hero + contextual real channels */

/* Hero: simplify instead of compressing. Keep headline/lead fully visible and let the journey start below. */
.cc-hero{
  height:360px;
  min-height:360px;
  overflow:hidden;
}
.cc-hero__copy{
  align-self:stretch;
  display:flex;
  flex-direction:column;
  justify-content:center;
  padding-top:28px;
  padding-bottom:28px;
}
.cc-hero__title{
  font-size:clamp(40px,3.55vw,53px);
  line-height:.96;
  margin:12px 0 14px;
  max-width:11ch;
}
.cc-hero__lead{font-size:15.5px;line-height:1.48;max-width:54ch}
.cc-hero__benefits{display:none!important}
.cc-hero__media{min-height:360px}
.cc-hero__media img{object-position:center 38%}
.cc-wrap{margin:24px auto 64px}

/* The fallback exists inside the opened list. Do not keep a red warning under a valid selection. */
.cc-combo-fallback-link{display:none!important}

/* Real-channel chooser */
.s501-contact-backdrop{
  position:fixed;inset:0;z-index:150;display:none;align-items:center;justify-content:center;
  padding:20px;background:rgba(18,15,18,.74);
}
.s501-contact-backdrop.is-open{display:flex}
.s501-contact{
  width:min(650px,100%);background:#fff;border-radius:24px;padding:26px;
  box-shadow:0 34px 100px rgba(0,0,0,.34);
}
.s501-contact__mark{
  width:50px;height:50px;display:grid;place-items:center;border-radius:16px;
  background:linear-gradient(145deg,#FFF,#F4E7DF);
  box-shadow:5px 5px 13px rgba(50,36,28,.11),-4px -4px 10px rgba(255,255,255,.96);
  font-size:24px;
}
.s501-contact h3{font-family:'Archivo';font-size:27px;line-height:1.08;margin:13px 0 8px}
.s501-contact>p{color:#61574F;line-height:1.5;margin:0 0 16px}
.s501-contact__context{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:16px 0}
.s501-contact__context div{border:1px solid #E8DED5;border-radius:13px;padding:10px 11px;background:#FFFCF9}
.s501-contact__context small{display:block;font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:#897B71}
.s501-contact__context strong{display:block;font-size:12px;line-height:1.3;margin-top:3px}
.s501-contact__note{
  border:1px solid #EAD8C5;background:#FFF8ED;border-radius:14px;padding:12px 13px;
  color:#6A5639;font-size:12px;line-height:1.45;margin:14px 0 18px;
}
.s501-channel-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.s501-channel{
  min-height:62px;border:1px solid #DDD3C8;border-radius:15px;background:#fff;
  display:flex;align-items:center;gap:12px;text-align:left;padding:12px 14px;font-weight:800;
}
.s501-channel span{width:36px;height:36px;display:grid;place-items:center;border-radius:12px;background:#F7F1EC;font-size:19px}
.s501-channel small{display:block;font-weight:500;color:#74695F;font-size:10.5px;margin-top:2px}
.s501-channel--primary{border-color:#E5002D;background:#FFF7F8}
.s501-contact__footer{display:flex;justify-content:flex-start;margin-top:14px;padding-top:14px;border-top:1px solid #EEE5DC}
.s501-contact-status{display:none;margin-top:12px;color:#5E544E;font-size:12px;line-height:1.45}
.s501-contact-status.is-visible{display:block}

/* Terminal state: the real channels are the primary next actions. */
.s501-terminal-channels{
  display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0 4px;
}
.s501-terminal-channels button{min-height:58px}

@media(max-width:900px){
  .cc-hero{height:auto;min-height:0}
  .cc-hero__media{min-height:260px}
}
@media(max-width:720px){
  .s501-contact__context,.s501-channel-grid,.s501-terminal-channels{grid-template-columns:1fr}
}
`;

const CONTACT_HTML=`
<div id="s501Contact" class="s501-contact-backdrop" role="dialog" aria-modal="true" aria-labelledby="s501ContactTitle" aria-hidden="true">
  <div class="s501-contact">
    <div class="s501-contact__mark" aria-hidden="true">🤝</div>
    <div class="cc-section-kicker" style="margin-top:12px">HABLAR CON A&S</div>
    <h3 id="s501ContactTitle">Elige cómo quieres continuar con un asesor.</h3>
    <p>Abriremos el canal que prefieras con un mensaje preparado para que no tengas que explicar nuevamente desde dónde vienes.</p>
    <div class="s501-contact__context">
      <div><small>País</small><strong id="s501Country">—</strong></div>
      <div><small>Necesidad</small><strong id="s501Need">—</strong></div>
      <div><small>Modalidad</small><strong id="s501Mode">—</strong></div>
    </div>
    <div class="s501-contact__note">A&S recibe tu mensaje cuando tú lo envías por WhatsApp o correo. Esta página no lo envía silenciosamente ni crea una solicitud automática.</div>
    <div class="s501-channel-grid">
      <button id="s501WhatsApp" class="s501-channel s501-channel--primary" type="button"><span aria-hidden="true">💬</span><div>Continuar por WhatsApp<small id="s501WaLabel">Canal A&S</small></div></button>
      <button id="s501Email" class="s501-channel" type="button"><span aria-hidden="true">✉️</span><div>Continuar por correo<small>info@aysseguros.com</small></div></button>
    </div>
    <div id="s501ContactStatus" class="s501-contact-status">Canal abierto. A&S recibirá el mensaje cuando confirmes el envío.</div>
    <div class="s501-contact__footer"><button id="s501ContactClose" class="cc-btn" type="button">Seguir revisando</button></div>
  </div>
</div>
`;

const S501_SCRIPT=`
<script>
(()=>{
  const CHANNELS={
    gt:{whatsapp:'50256149048',email:'info@aysseguros.com',label:'+502 5614 9048'},
    co:{whatsapp:'573138340897',email:'info@aysseguros.com',label:'+57 313 834 0897'}
  };
  const modal=document.getElementById('s501Contact');
  const status=document.getElementById('s501ContactStatus');

  function text(id,fallback){
    const el=document.getElementById(id);
    return el && el.textContent.trim()?el.textContent.trim():fallback;
  }
  function countryKey(){
    return /colombia/i.test(text('selectedCountry','Guatemala'))?'co':'gt';
  }
  function context(){
    return {
      country:text('selectedCountry',countryKey()==='co'?'Colombia':'Guatemala'),
      need:text('selectedNeed','Cotización y comparación'),
      mode:text('selectedMode','Con acompañamiento A&S')
    };
  }
  function message(){
    const c=context();
    return [
      'Hola, escribo desde Cotizar y comparar de A&S.',
      'País: '+c.country,
      'Necesidad: '+c.need,
      'Modalidad: '+c.mode,
      'Quiero continuar con asesoría sin empezar de cero.'
    ].join('\n');
  }
  function openContact(title){
    const c=context(),ch=CHANNELS[countryKey()];
    document.getElementById('s501Country').textContent=c.country;
    document.getElementById('s501Need').textContent=c.need;
    document.getElementById('s501Mode').textContent=c.mode;
    document.getElementById('s501WaLabel').textContent=ch.label;
    document.getElementById('s501ContactTitle').textContent=title||'Elige cómo quieres continuar con un asesor.';
    status.classList.remove('is-visible');
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden','false');
    document.getElementById('s501WhatsApp').focus();
  }
  function closeContact(){
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden','true');
  }
  function openWhatsApp(){
    const ch=CHANNELS[countryKey()];
    window.open('https://wa.me/'+ch.whatsapp+'?text='+encodeURIComponent(message()),'_blank','noopener');
    status.classList.add('is-visible');
  }
  function openEmail(){
    const ch=CHANNELS[countryKey()],c=context();
    const subject='Continuidad Cotizar y comparar A&S · '+c.country;
    window.location.href='mailto:'+ch.email+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(message());
    status.classList.add('is-visible');
  }

  // All "Hablar con un asesor" buttons now have a real user-directed next action.
  document.addEventListener('click',e=>{
    const b=e.target.closest && e.target.closest('button');
    if(!b)return;
    const label=b.textContent.trim();
    if(b.classList.contains('cc-advisor') || label==='Hablar con un asesor'){
      e.preventDefault();
      e.stopImmediatePropagation();
      openContact('Hablar con A&S sin empezar de cero');
    }
  },true);

  document.getElementById('s501WhatsApp').addEventListener('click',openWhatsApp);
  document.getElementById('s501Email').addEventListener('click',openEmail);
  document.getElementById('s501ContactClose').addEventListener('click',closeContact);
  modal.addEventListener('click',e=>{if(e.target===modal)closeContact();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('is-open'))closeContact();});

  // Add real channels to the terminal continuity state.
  const completion=document.getElementById('s500Completion');
  if(completion){
    const terminal=document.createElement('div');
    terminal.className='s501-terminal-channels';
    terminal.innerHTML=
      '<button id="s501TerminalWa" class="cc-btn cc-btn--primary" type="button">💬 Continuar por WhatsApp</button>'+
      '<button id="s501TerminalEmail" class="cc-btn" type="button">✉️ Continuar por correo</button>';
    const oldActions=completion.querySelector('.cc-actions');
    if(oldActions)oldActions.insertAdjacentElement('beforebegin',terminal);
    document.getElementById('s501TerminalWa').addEventListener('click',openWhatsApp);
    document.getElementById('s501TerminalEmail').addEventListener('click',openEmail);
  }
})();
</script>
`;

function humanize(h){
  return h
    .replace(
      'Conservamos el contexto de lo que revisaste. En la experiencia conectada, el siguiente paso será derivar este contexto al canal A&S autorizado para continuar el acompañamiento. En esta vista de revisión no se envían datos ni se crea una solicitud real.',
      'Conservamos el contexto de lo que revisaste. Elige WhatsApp o correo para continuar con A&S. El mensaje se abrirá preparado y solo se enviará cuando tú lo confirmes.'
    )
    .replace(
      'A&S recibe el contexto autorizado, continúa la asesoría y define contigo el siguiente paso válido. Esto no equivale a emisión ni contratación automática.',
      'A&S continúa la asesoría contigo por el canal que elijas. Enviar el mensaje no equivale a emisión ni contratación automática.'
    )
    .replace(
      'Esta revisión prueba la continuidad del recorrido. No envía datos ni crea una solicitud real.',
      'Al continuar podrás elegir WhatsApp o correo para contactar a A&S con el contexto básico del recorrido.'
    )
    .replace(
      'En producción, este handoff se conectará únicamente al canal A&S autorizado. En esta vista de revisión no se envían datos ni se crea una solicitud real.',
      'Elige el canal por el que quieres continuar. El mensaje solo se enviará cuando tú lo confirmes en WhatsApp o en tu correo.'
    );
}

function html(){
  let h=humanize(S500.html());
  h=h.replace(
    '<meta name="ays-owner-delta" content="S5.00_CONSOLIDATED_OWNER_UX">',
    '<meta name="ays-owner-delta" content="S5.01_REAL_CHANNELS_HERO_CLEANUP">'
  );
  h=h.replace('</style>',S501_CSS+'</style>');
  const payload=JSON.stringify(AUTH).replace(/</g,'\\u003c');
  h=h.replace('</body>',CONTACT_HTML+'<script type="application/json" id="s501-owner-delta-auth">'+payload+'</script>'+S501_SCRIPT+'</body>');
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

const cotcompOwnerReviewS501=onRequest({
  region:REGION,
  timeoutSeconds:30,
  memory:'256MiB',
  maxInstances:2,
  concurrency:40,
  invoker:'public'
},handler);

module.exports=Object.freeze({
  VERSION,PROJECT_ID,REGION,FUNCTION_NAME,AUTH,securityHeaders,html,handler,cotcompOwnerReviewS501
});
