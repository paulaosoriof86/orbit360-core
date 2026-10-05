'use strict';

const {onRequest}=require('firebase-functions/v2/https');
const S501=require('./cotcomp-owner-review-s501');

const VERSION='ays-cotcomp-s504-contact-consent-owner-review-lab-v0.1';
const PROJECT_ID='ays-orbit-360-lab';
const REGION='us-central1';
const FUNCTION_NAME='cotcompOwnerReviewS504';

const AUTH=Object.freeze({
  status:'OWNER_REVIEW_CONTACT_CONSENT_LAB_ONLY',
  parent:S501.VERSION,
  production:false,
  writes:false,
  automaticInternalNotification:false,
  publicContactCapture:true,
  requestManagementConsentRequired:true
});

function securityHeaders(res){S501.securityHeaders(res);}

const CSS=`
.s504-contact-fields{
  display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0;
}
.s504-field{display:grid;gap:6px}
.s504-field--wide{grid-column:1/-1}
.s504-field span{font-size:11px;font-weight:800;color:#2A2522}
.s504-input{
  min-height:46px;border:1px solid #DDD3C8;border-radius:12px;background:#fff;
  padding:0 12px;font-size:14px;color:#1B1816;
}
.s504-input:focus{border-color:#E5002D;outline:3px solid rgba(229,0,45,.12)}
.s504-consent{
  display:flex;align-items:flex-start;gap:9px;border:1px solid #E8DED5;border-radius:13px;
  background:#FCF9F5;padding:11px 12px;margin:10px 0 6px;font-size:11.5px;line-height:1.42;color:#5E554E;
}
.s504-consent input{margin-top:2px}
.s504-error{
  display:none;border:1px solid #F2B6BE;background:#FFF3F5;color:#9E1730;
  border-radius:11px;padding:9px 11px;font-size:11.5px;line-height:1.4;margin:8px 0 0;
}
.s504-error.is-visible{display:block}
@media(max-width:720px){.s504-contact-fields{grid-template-columns:1fr}.s504-field--wide{grid-column:auto}}
`;

const SCRIPT=`
<script>
(()=>{
  const modal=document.getElementById('s501Contact');
  if(!modal)return;

  const contextBox=modal.querySelector('.s501-contact__context');
  const fields=document.createElement('div');
  fields.className='s504-contact-fields';
  fields.innerHTML=
    '<label class="s504-field s504-field--wide"><span>Tu nombre</span><input id="s504Name" class="s504-input" autocomplete="name" placeholder="Nombre y apellido"></label>'+
    '<label class="s504-field"><span>Tu WhatsApp</span><input id="s504Wa" class="s504-input" inputmode="tel" autocomplete="tel" placeholder="+502 / +57 ..."></label>'+
    '<label class="s504-field"><span>Tu correo</span><input id="s504Email" class="s504-input" inputmode="email" autocomplete="email" placeholder="correo@ejemplo.com"></label>'+
    '<label class="s504-consent s504-field--wide"><input id="s504Consent" type="checkbox"><span>Autorizo a A&S a usar estos datos para contactarme y dar continuidad a esta solicitud.</span></label>'+
    '<div id="s504Error" class="s504-error s504-field--wide" role="alert"></div>';
  if(contextBox)contextBox.insertAdjacentElement('afterend',fields);

  const nameEl=document.getElementById('s504Name');
  const waEl=document.getElementById('s504Wa');
  const emailEl=document.getElementById('s504Email');
  const consentEl=document.getElementById('s504Consent');
  const errorEl=document.getElementById('s504Error');

  function activeCountry(){
    const btn=document.querySelector('[data-country].is-active');
    if(btn){
      const raw=(btn.dataset.country||btn.textContent||'').toLowerCase();
      return raw==='co'||/colombia/.test(raw)?'Colombia':'Guatemala';
    }
    const summary=document.getElementById('selectedCountry');
    return summary&&/colombia/i.test(summary.textContent)?'Colombia':'Guatemala';
  }
  function activeNeed(){
    const family=document.querySelector('.cc-family.is-selected strong');
    if(family&&family.textContent.trim())return family.textContent.trim();
    const summary=document.getElementById('selectedNeed');
    return summary&&summary.textContent.trim()?summary.textContent.trim():'Cotización y comparación';
  }
  function activeMode(){
    const selected=document.querySelector('.cc-mode.is-active');
    return selected&&selected.firstChild?selected.firstChild.textContent.trim():'Con acompañamiento A&S';
  }
  function syncContext(){
    const c=document.getElementById('s501Country');
    const n=document.getElementById('s501Need');
    const m=document.getElementById('s501Mode');
    if(c)c.textContent=activeCountry();
    if(n)n.textContent=activeNeed();
    if(m)m.textContent=activeMode();
    const waLabel=document.getElementById('s501WaLabel');
    if(waLabel)waLabel.textContent=activeCountry()==='Colombia'?'+57 313 834 0897':'+502 5614 9048';
  }
  function cleanPhone(v){return String(v||'').replace(/[^0-9+]/g,'').trim();}
  function validEmail(v){return !v||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);}
  function validate(){
    const name=nameEl.value.trim();
    const wa=cleanPhone(waEl.value);
    const email=emailEl.value.trim().toLowerCase();
    const errors=[];
    if(name.length<3)errors.push('Escribe tu nombre.');
    if(!wa&&!email)errors.push('Indica tu WhatsApp o tu correo.');
    if(email&&!validEmail(email))errors.push('Revisa el formato del correo.');
    if(!consentEl.checked)errors.push('Necesitamos tu autorización para dar continuidad a la solicitud.');
    if(errors.length){
      errorEl.textContent=errors.join(' ');
      errorEl.classList.add('is-visible');
      return null;
    }
    errorEl.classList.remove('is-visible');
    return {
      name,whatsapp:wa,email,
      requestManagementConsent:true,
      country:activeCountry(),
      need:activeNeed(),
      mode:activeMode()
    };
  }
  function preparedMessage(contact){
    return [
      'Hola, escribo desde Cotizar y comparar de A&S.',
      'Nombre: '+contact.name,
      'País: '+contact.country,
      'Necesidad: '+contact.need,
      'Modalidad: '+contact.mode,
      'Quiero continuar con asesoría sin empezar de cero.'
    ].join('\n');
  }
  function openWa(contact){
    const dest=contact.country==='Colombia'?'573138340897':'50256149048';
    window.open('https://wa.me/'+dest+'?text='+encodeURIComponent(preparedMessage(contact)),'_blank','noopener');
  }
  function openMail(contact){
    const subject='Continuidad Cotizar y comparar A&S · '+contact.country;
    const body=preparedMessage(contact)+(contact.whatsapp?'\nWhatsApp de contacto: '+contact.whatsapp:'');
    window.location.href='mailto:info@aysseguros.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
  }

  // Keep context accurate even when advisor CTA is used before Stage 2.
  document.addEventListener('click',e=>{
    const b=e.target.closest&&e.target.closest('button');
    if(!b)return;
    const label=b.textContent.trim();
    if(b.classList.contains('cc-advisor')||label==='Hablar con un asesor'){
      setTimeout(syncContext,0);
    }
  },true);

  // Gate real channels behind minimum contact + explicit consent.
  document.getElementById('s501WhatsApp').addEventListener('click',e=>{
    e.preventDefault();e.stopImmediatePropagation();
    const contact=validate();if(!contact)return;
    openWa(contact);
  },true);
  document.getElementById('s501Email').addEventListener('click',e=>{
    e.preventDefault();e.stopImmediatePropagation();
    const contact=validate();if(!contact)return;
    openMail(contact);
  },true);

  // Terminal CTAs reuse the same consent/contact capture instead of bypassing it.
  const tWa=document.getElementById('s501TerminalWa');
  const tEmail=document.getElementById('s501TerminalEmail');
  if(tWa)tWa.addEventListener('click',e=>{
    e.preventDefault();e.stopImmediatePropagation();syncContext();
    modal.classList.add('is-open');modal.setAttribute('aria-hidden','false');
    document.getElementById('s501ContactTitle').textContent='Completa tus datos para continuar por WhatsApp';
  },true);
  if(tEmail)tEmail.addEventListener('click',e=>{
    e.preventDefault();e.stopImmediatePropagation();syncContext();
    modal.classList.add('is-open');modal.setAttribute('aria-hidden','false');
    document.getElementById('s501ContactTitle').textContent='Completa tus datos para continuar por correo';
  },true);
})();
</script>
`;

function html(){
  let h=S501.html();
  h=h.replace(
    '<meta name="ays-owner-delta" content="S5.01_REAL_CHANNELS_HERO_CLEANUP">',
    '<meta name="ays-owner-delta" content="S5.04_CONTACT_CONSENT_ALIGNMENT">'
  );
  h=h.replace(
    '<title>A&S · Cotiza y compara con criterio · Owner Review S5.00</title>',
    '<title>A&S · Cotiza y compara con criterio · Owner Review S5.04</title>'
  );
  // Remove hidden hero benefit markup entirely in this candidate.
  h=h.replace(/<div class="cc-hero__benefits">[\s\S]*?<\/div><\/div>/,
    '</div>');
  h=h.replace('</style>',CSS+'</style>');
  const payload=JSON.stringify(AUTH).replace(/</g,'\\u003c');
  h=h.replace('</body>','<script type="application/json" id="s504-owner-delta-auth">'+payload+'</script>'+SCRIPT+'</body>');
  return h;
}

function handler(req,res){
  securityHeaders(res);
  if(req.method!=='GET'){res.set('Allow','GET');return res.status(405).send('Método no permitido.');}
  res.set('Content-Type','text/html; charset=utf-8');
  return res.status(200).send(html());
}

const cotcompOwnerReviewS504=onRequest({
  region:REGION,timeoutSeconds:30,memory:'256MiB',maxInstances:2,concurrency:40,invoker:'public'
},handler);

module.exports=Object.freeze({VERSION,PROJECT_ID,REGION,FUNCTION_NAME,AUTH,securityHeaders,html,handler,cotcompOwnerReviewS504});
