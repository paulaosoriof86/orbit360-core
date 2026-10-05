'use strict';

const {onRequest}=require('firebase-functions/v2/https');
const S497=require('./cotcomp-clean-parent-s497');

const VERSION='ays-cotcomp-s505-clean-owner-consolidated-lab-v0.1';
const PROJECT_ID='ays-orbit-360-lab';
const REGION='us-central1';
const FUNCTION_NAME='cotcompOwnerReviewS505';

const AUTH=Object.freeze({
  status:'OWNER_REVIEW_CLEAN_CONSOLIDATED_LAB_ONLY',
  cleanParent:S497.VERSION,
  production:false,
  writes:false,
  providerDeploymentAuthorized:false,
  cotcompRealTransportAuthorized:false,
  automaticInternalNotification:false,
  publicContactCapture:true,
  requestManagementConsentRequired:true,
  publicChannels:Object.freeze({
    gt:Object.freeze({whatsapp:'50256149048',email:'info@aysseguros.com'}),
    co:Object.freeze({whatsapp:'573138340897',email:'info@aysseguros.com'})
  })
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

const CSS=`
/* S5.05 clean consolidated Owner candidate */
.cc-hero{height:360px;min-height:360px;grid-template-columns:minmax(0,.98fr) minmax(0,1.02fr)}
.cc-hero__copy{align-self:stretch;display:flex;flex-direction:column;justify-content:center;padding-top:28px;padding-bottom:28px}
.cc-hero__title{font-size:clamp(40px,3.55vw,53px);line-height:.96;margin:12px 0 14px;max-width:11ch}
.cc-hero__lead{font-size:15.5px;line-height:1.48;max-width:54ch}
.cc-hero__media{min-height:360px}.cc-hero__media img{object-position:center 38%}
.cc-wrap{margin:24px auto 64px}

.cc-mode-toggle{display:grid;grid-template-columns:repeat(2,minmax(0,310px));gap:12px;margin:0 0 28px}
.cc-mode{min-height:76px;position:relative;text-align:left;border:1px solid #DDD3C8;background:#fff;border-radius:16px;padding:14px 16px 14px 58px;font-size:15px;line-height:1.18;font-weight:800;color:#1A171B;box-shadow:0 8px 20px rgba(35,28,24,.05)}
.cc-mode::before{position:absolute;left:14px;top:16px;width:32px;height:32px;display:grid;place-items:center;border-radius:11px;background:linear-gradient(145deg,#FFF,#F3E7DF);box-shadow:4px 4px 10px rgba(50,36,28,.10),-3px -3px 9px rgba(255,255,255,.95);font-size:17px}
.cc-mode[data-mode="online"]::before{content:'💻'}.cc-mode[data-mode="assisted"]::before{content:'🤝'}
.cc-mode small{display:block;margin-top:5px;font-size:11.25px;line-height:1.32;font-weight:500;color:#74695F}
.cc-mode.is-active{background:linear-gradient(145deg,#FFF8F8,#FFF);border:2px solid #E5002D;color:#171318;box-shadow:0 12px 28px rgba(229,0,45,.10)}
.cc-mode.is-active small{color:#5F5550}

.cc-stage__head{background:#29252A}
.cc-summary{background:linear-gradient(180deg,#FFF,#FBF7F2)!important;color:#171318!important;border:1px solid #E8DED4!important;box-shadow:0 10px 22px rgba(32,25,22,.05)!important}
.cc-summary small{color:#8A756F!important}.cc-summary strong{color:#171318!important}
.cc-route-copy{background:linear-gradient(135deg,#2B272B,#3B2026)!important}
.cc-rec{background:linear-gradient(135deg,#1C191D 0%,#35171E 100%)!important}
.cc-truth{background:#FFF9EF;border-color:#EBD3A5;color:#65543A}
.cc-combo-fallback-link{display:none!important}
.cc-combo-status{background:#F7F4EF!important;border-color:#E7DED4!important;color:#6C625B!important}

.s505-ribbon{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:16px 0 20px}
.s505-chip{display:flex;align-items:center;gap:10px;min-height:64px;padding:11px 13px;border:1px solid #E5D9CD;border-radius:16px;background:linear-gradient(145deg,#fff 0%,#FBF6F0 100%);box-shadow:0 10px 24px rgba(28,22,18,.06)}
.s505-chip__icon{width:38px;height:38px;display:grid;place-items:center;border-radius:13px;background:linear-gradient(145deg,#fff,#F3E8DE);box-shadow:5px 5px 12px rgba(50,36,28,.12),-4px -4px 10px rgba(255,255,255,.92);font-size:20px}
.s505-chip strong{font-family:'Archivo';font-size:12px;line-height:1.2}.s505-chip small{display:block;color:#6E6258;font-size:10px;line-height:1.3;margin-top:2px}

.s505-backdrop{position:fixed;inset:0;z-index:160;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(18,15,18,.74)}
.s505-backdrop.is-open{display:flex}
.s505-contact{width:min(680px,100%);background:#fff;border-radius:24px;padding:26px;box-shadow:0 34px 100px rgba(0,0,0,.34)}
.s505-mark{width:50px;height:50px;display:grid;place-items:center;border-radius:16px;background:linear-gradient(145deg,#FFF,#F4E7DF);box-shadow:5px 5px 13px rgba(50,36,28,.11),-4px -4px 10px rgba(255,255,255,.96);font-size:24px}
.s505-contact h3{font-family:'Archivo';font-size:27px;line-height:1.08;margin:13px 0 8px}
.s505-contact>p{color:#61574F;line-height:1.5;margin:0 0 16px}
.s505-context{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:16px 0}
.s505-context div{border:1px solid #E8DED5;border-radius:13px;padding:10px 11px;background:#FFFCF9}
.s505-context small{display:block;font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:#897B71}.s505-context strong{display:block;font-size:12px;line-height:1.3;margin-top:3px}
.s505-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0}
.s505-field{display:grid;gap:6px}.s505-field--wide{grid-column:1/-1}.s505-field span{font-size:11px;font-weight:800;color:#2A2522}
.s505-input{min-height:46px;border:1px solid #DDD3C8;border-radius:12px;background:#fff;padding:0 12px;font-size:14px;color:#1B1816}
.s505-consent{display:flex;align-items:flex-start;gap:9px;border:1px solid #E8DED5;border-radius:13px;background:#FCF9F5;padding:11px 12px;margin:10px 0 6px;font-size:11.5px;line-height:1.42;color:#5E554E}
.s505-consent input{margin-top:2px}.s505-error{display:none;border:1px solid #F2B6BE;background:#FFF3F5;color:#9E1730;border-radius:11px;padding:9px 11px;font-size:11.5px;line-height:1.4;margin:8px 0 0}.s505-error.is-visible{display:block}
.s505-note{border:1px solid #EAD8C5;background:#FFF8ED;border-radius:14px;padding:12px 13px;color:#6A5639;font-size:12px;line-height:1.45;margin:14px 0 18px}
.s505-channels{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.s505-channel{min-height:62px;border:1px solid #DDD3C8;border-radius:15px;background:#fff;display:flex;align-items:center;gap:12px;text-align:left;padding:12px 14px;font-weight:800}
.s505-channel span{width:36px;height:36px;display:grid;place-items:center;border-radius:12px;background:#F7F1EC;font-size:19px}.s505-channel small{display:block;font-weight:500;color:#74695F;font-size:10.5px;margin-top:2px}
.s505-channel--primary{border-color:#E5002D;background:#FFF7F8}.s505-footer{display:flex;justify-content:flex-start;margin-top:14px;padding-top:14px;border-top:1px solid #EEE5DC}

.s505-complete{display:none;margin:22px 0 4px;border:1px solid #E1D5CC;border-left:4px solid #E5002D;border-radius:20px;background:linear-gradient(145deg,#FFF,#FFF8F5);padding:24px;box-shadow:0 16px 38px rgba(31,24,22,.08)}
.s505-complete.is-visible{display:block}.s505-complete h3{font-family:'Archivo';font-size:27px;line-height:1.05;margin:13px 0 8px}.s505-complete p{max-width:72ch;color:#625850;line-height:1.55;margin:0}
.s505-complete__context{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:18px 0}.s505-complete__context div{border:1px solid #E8DED4;border-radius:13px;background:#FFFCF9;padding:11px 12px}.s505-complete__context small{display:block;font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:#8B7D72}.s505-complete__context strong{display:block;font-size:12.5px;margin-top:3px}

@media(max-width:900px){.cc-hero{height:auto;min-height:0}.cc-hero__media{min-height:260px}.cc-wrap{margin:16px auto 48px}}
@media(max-width:720px){.cc-mode-toggle,.s505-ribbon,.s505-context,.s505-fields,.s505-channels,.s505-complete__context{grid-template-columns:1fr}.s505-field--wide{grid-column:auto}}
`;

function ribbon(kind){
  const sets={
    data:[['🧾','Datos del caso','Solo lo que corresponde a esta necesidad'],['🛡️','Protección','La captura cambia según producto y país'],['🧭','Prioridad','Tu criterio guía la explicación']],
    review:[['🔎','Revisar','Qué información está lista para avanzar'],['↔️','Bases comparables','Solo opciones que pueden contrastarse'],['⚑','Pendientes claros','Lo que falta se muestra, no se inventa']],
    compare:[['⚖️','Diferencias','Qué cambia realmente entre alternativas'],['🧩','Condiciones','Coberturas, deducibles y límites cuando existan'],['✦','Orientación A&S','Explicación consultiva, no ranking oculto']]
  };
  return '<div class="s505-ribbon" data-s505="'+kind+'">'+sets[kind].map(x=>'<div class="s505-chip"><span class="s505-chip__icon" aria-hidden="true">'+x[0]+'</span><span><strong>'+x[1]+'</strong><small>'+x[2]+'</small></span></div>').join('')+'</div>';
}

const CONTACT=`
<div id="s505Contact" class="s505-backdrop" role="dialog" aria-modal="true" aria-labelledby="s505Title" aria-hidden="true">
 <div class="s505-contact">
  <div class="s505-mark" aria-hidden="true">🤝</div>
  <div class="cc-section-kicker" style="margin-top:12px">HABLAR CON A&S</div>
  <h3 id="s505Title">Continúa con A&S sin empezar de cero.</h3>
  <p>Conservamos el contexto básico del recorrido y tú eliges el canal por el que quieres contactarnos.</p>
  <div class="s505-context">
   <div><small>País</small><strong id="s505Country">—</strong></div>
   <div><small>Necesidad</small><strong id="s505Need">—</strong></div>
   <div><small>Modalidad</small><strong id="s505Mode">—</strong></div>
  </div>
  <div class="s505-fields">
   <label class="s505-field s505-field--wide"><span>Tu nombre</span><input id="s505Name" class="s505-input" autocomplete="name" placeholder="Nombre y apellido"></label>
   <label class="s505-field"><span>Tu WhatsApp</span><input id="s505Wa" class="s505-input" inputmode="tel" autocomplete="tel" placeholder="+502 / +57 ..."></label>
   <label class="s505-field"><span>Tu correo</span><input id="s505Email" class="s505-input" inputmode="email" autocomplete="email" placeholder="correo@ejemplo.com"></label>
   <label class="s505-consent s505-field--wide"><input id="s505Consent" type="checkbox"><span>Autorizo a A&S a usar estos datos para contactarme y dar continuidad a esta solicitud.</span></label>
   <div id="s505Error" class="s505-error s505-field--wide" role="alert"></div>
  </div>
  <div class="s505-note">A&S recibe el mensaje cuando tú lo envías por WhatsApp o correo. Esta vista no crea silenciosamente una solicitud interna.</div>
  <div class="s505-channels">
   <button id="s505WhatsApp" class="s505-channel s505-channel--primary" type="button"><span aria-hidden="true">💬</span><div>Continuar por WhatsApp<small id="s505WaDest">Canal A&S</small></div></button>
   <button id="s505EmailBtn" class="s505-channel" type="button"><span aria-hidden="true">✉️</span><div>Continuar por correo<small>info@aysseguros.com</small></div></button>
  </div>
  <div class="s505-footer"><button id="s505Close" class="cc-btn" type="button">Seguir revisando</button></div>
 </div>
</div>
`;

const SCRIPT=`
<script>
(()=>{
 const modal=document.getElementById('s505Contact');
 let intent='advisor';

 function activeCountry(){
  const b=document.querySelector('[data-country].is-active');
  const raw=b?(b.dataset.country||b.textContent||''):'';
  return String(raw).toLowerCase()==='co'||/colombia/i.test(raw)?'Colombia':'Guatemala';
 }
 function activeNeed(){
  const f=document.querySelector('.cc-family.is-selected strong');
  return f&&f.textContent.trim()?f.textContent.trim():'Cotización y comparación';
 }
 function activeMode(){
  const m=document.querySelector('.cc-mode.is-active');
  if(!m)return 'Con acompañamiento A&S';
  const node=[...m.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());
  return node?node.textContent.trim():m.textContent.trim().split('\n')[0];
 }
 function sync(){
  const c=activeCountry(),n=activeNeed(),m=activeMode();
  document.getElementById('s505Country').textContent=c;
  document.getElementById('s505Need').textContent=n;
  document.getElementById('s505Mode').textContent=m;
  document.getElementById('s505WaDest').textContent=c==='Colombia'?'+57 313 834 0897':'+502 5614 9048';
  return {country:c,need:n,mode:m};
 }
 function open(kind){
  intent=kind||'advisor';sync();
  document.getElementById('s505Title').textContent=intent==='decision'?'Elige cómo quieres continuar con A&S.':'Hablar con A&S sin empezar de cero';
  document.getElementById('s505Error').classList.remove('is-visible');
  modal.classList.add('is-open');modal.setAttribute('aria-hidden','false');
  document.getElementById('s505Name').focus();
 }
 function close(){modal.classList.remove('is-open');modal.setAttribute('aria-hidden','true');}
 function cleanPhone(v){return String(v||'').replace(/[^0-9+]/g,'').trim()}
 function validate(){
  const name=document.getElementById('s505Name').value.trim();
  const whatsapp=cleanPhone(document.getElementById('s505Wa').value);
  const email=document.getElementById('s505Email').value.trim().toLowerCase();
  const consent=document.getElementById('s505Consent').checked;
  const errs=[];
  if(name.length<3)errs.push('Escribe tu nombre.');
  if(!whatsapp&&!email)errs.push('Indica tu WhatsApp o tu correo.');
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))errs.push('Revisa el formato del correo.');
  if(!consent)errs.push('Necesitamos tu autorización para dar continuidad a la solicitud.');
  const box=document.getElementById('s505Error');
  if(errs.length){box.textContent=errs.join(' ');box.classList.add('is-visible');return null}
  box.classList.remove('is-visible');
  return Object.assign({name,whatsapp,email,requestManagementConsent:true},sync());
 }
 function message(c){
  return ['Hola, escribo desde Cotizar y comparar de A&S.','Nombre: '+c.name,'País: '+c.country,'Necesidad: '+c.need,'Modalidad: '+c.mode,'Quiero continuar con asesoría sin empezar de cero.'].join('\n');
 }
 function showComplete(channel,c){
  close();
  if(intent!=='decision')return;
  const stage4=document.querySelector('[data-stage-panel="4"]');
  if(!stage4)return;
  let box=document.getElementById('s505Complete');
  if(!box){
   box=document.createElement('section');box.id='s505Complete';box.className='s505-complete';
   const actions=stage4.querySelector('.cc-actions');
   if(actions)actions.insertAdjacentElement('beforebegin',box);
  }
  box.innerHTML='<div class="s505-mark" aria-hidden="true">✓</div><div class="cc-section-kicker" style="margin-top:12px">SIGUIENTE PASO</div><h3>Tu continuidad con A&S está preparada.</h3><p>Se abrió '+channel+'. Para que A&S reciba tu mensaje debes confirmar el envío en ese canal. Esta vista no afirma recepción antes de que lo envíes.</p><div class="s505-complete__context"><div><small>País</small><strong>'+c.country+'</strong></div><div><small>Necesidad</small><strong>'+c.need+'</strong></div><div><small>Canal</small><strong>'+channel+'</strong></div></div><div class="cc-actions" style="margin:0"><button id="s505Back" class="cc-btn" type="button">← Volver a comparar</button><button id="s505Other" class="cc-btn cc-btn--primary" type="button">Revisar otra necesidad →</button></div>';
  const repl=stage4.querySelector('.cc-replan');const acts=stage4.querySelector('.cc-actions');
  if(repl)repl.style.display='none';if(acts)acts.style.display='none';
  box.classList.add('is-visible');
  document.getElementById('stageKicker').textContent='SIGUIENTE PASO';
  document.getElementById('stageHeading').textContent='Continúa con A&S sin perder el contexto';
  document.getElementById('s505Back').addEventListener('click',()=>{box.classList.remove('is-visible');if(repl)repl.style.display='';if(acts)acts.style.display='';document.getElementById('stageKicker').textContent='COMPARAR';document.getElementById('stageHeading').textContent='Compara y elige cómo continuar';});
  document.getElementById('s505Other').addEventListener('click',()=>{const p=document.querySelector('[data-prev="3"]');if(p)p.click();const p2=document.querySelector('[data-prev="2"]');if(p2)p2.click();const p1=document.querySelector('[data-prev="1"]');if(p1)p1.click();});
  box.scrollIntoView({behavior:'smooth',block:'center'});
 }
 function viaWa(){
  const c=validate();if(!c)return;
  const dest=c.country==='Colombia'?'573138340897':'50256149048';
  window.open('https://wa.me/'+dest+'?text='+encodeURIComponent(message(c)),'_blank','noopener');
  showComplete('WhatsApp',c);
 }
 function viaEmail(){
  const c=validate();if(!c)return;
  const subject='Continuidad Cotizar y comparar A&S · '+c.country;
  const body=message(c)+(c.whatsapp?'\nWhatsApp de contacto: '+c.whatsapp:'');
  window.location.href='mailto:info@aysseguros.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
  showComplete('correo',c);
 }

 // Capture every advisor CTA before base placeholder listeners can run.
 document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('button');if(!b)return;
  const label=b.textContent.trim();
  if(b.classList.contains('cc-advisor')||label==='Hablar con un asesor'){
   e.preventDefault();e.stopImmediatePropagation();open('advisor');
   return;
  }
  if(b.id==='decisionBtn'){
   e.preventDefault();e.stopImmediatePropagation();open('decision');
  }
 },true);

 document.getElementById('s505WhatsApp').addEventListener('click',viaWa);
 document.getElementById('s505EmailBtn').addEventListener('click',viaEmail);
 document.getElementById('s505Close').addEventListener('click',close);
 modal.addEventListener('click',e=>{if(e.target===modal)close()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('is-open'))close()});

 // Close vehicle suggestions after an explicit valid selection.
 document.addEventListener('mousedown',e=>{
  const opt=e.target.closest&&e.target.closest('.cc-combo-option[data-kind]');if(!opt)return;
  setTimeout(()=>{document.querySelectorAll('.cc-combo-list').forEach(x=>x.classList.remove('is-open'));document.querySelectorAll('[data-vehicle-combo]').forEach(x=>x.setAttribute('aria-expanded','false'))},120);
 },true);
})();
</script>
`;

function humanize(h){
 return h
  .replace(/Marca y línea\/modelo se validan contra el catálogo vehicular LAB cuando está disponible\. La tarifa y elegibilidad no se calculan aquí\./g,'Marca y línea/modelo se validan contra el catálogo disponible. La tarifa y elegibilidad se confirman únicamente con alternativas válidas.')
  .replace(/Identidad vehicular seleccionada desde el catálogo LAB\. La elegibilidad y tarifa siguen bajo autoridad de Gravicentra\./g,'Vehículo identificado. La tarifa y elegibilidad se confirman únicamente con alternativas válidas.')
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
 let h=humanize(S497.html());
 h=h.replace('<meta name="ays-status" content="SOURCE_ONLY_NOT_OWNER_REVIEW">','<meta name="ays-status" content="OWNER_REVIEW_CLEAN_CONSOLIDATED_LAB_ONLY"><meta name="ays-owner-review-authorized" content="true"><meta name="ays-owner-delta" content="S5.05_CLEAN_CONSOLIDATED">');
 h=h.replace('<title>A&S · Cotiza y compara con criterio · S4.97 clean parent</title>','<title>A&S · Cotiza y compara con criterio · Owner Review S5.05</title>');
 // Remove the old hero micro-benefits completely.
 h=h.replace(/<div class="cc-hero__benefits">[\s\S]*?<\/div><\/div>/,'</div>');
 // Vehicle brand selection closes cleanly instead of auto-opening the model list.
 h=h.replace('await loadModels();renderModels();modelInput.focus();','await loadModels();close(brandList,brandInput);close(modelList,modelInput);');
 h=h.replace('</style>',CSS+'</style>');
 h=h.replace('<div id="otherPaths" class="cc-paths" hidden></div>','<div id="otherPaths" class="cc-paths" hidden></div>'+ribbon('data'));
 h=h.replace('<div id="reviewContent"></div>',ribbon('review')+'<div id="reviewContent"></div>');
 h=h.replace('<div id="compareContent"></div>',ribbon('compare')+'<div id="compareContent"></div>');
 // Remove internal source-only footer from visible Owner surface.
 const foot=h.indexOf('<div class="cc-lab">');if(foot>=0){const end=h.indexOf('</div>',foot);if(end>=0)h=h.slice(0,foot)+h.slice(end+6)}
 const payload=JSON.stringify(AUTH).replace(/</g,'\\u003c');
 h=h.replace('</body>',CONTACT+'<script type="application/json" id="s505-owner-auth">'+payload+'</script>'+SCRIPT+'</body>');
 return h;
}

function handler(req,res){
 securityHeaders(res);
 if(req.method!=='GET'){res.set('Allow','GET');return res.status(405).send('Método no permitido.')}
 res.set('Content-Type','text/html; charset=utf-8');return res.status(200).send(html());
}

const cotcompOwnerReviewS505=onRequest({region:REGION,timeoutSeconds:30,memory:'256MiB',maxInstances:2,concurrency:40,invoker:'public'},handler);

module.exports=Object.freeze({VERSION,PROJECT_ID,REGION,FUNCTION_NAME,AUTH,securityHeaders,html,handler,cotcompOwnerReviewS505});
