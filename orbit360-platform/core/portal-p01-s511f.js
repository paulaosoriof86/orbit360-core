(function(){
  'use strict';

  var REGION='us-central1';
  var FUNCTION_NAME='portalP01ReadOnlyS511E';
  var refs=[];
  var currentIndex=0;
  var lastError='';

  function el(id){return document.getElementById(id);}
  function text(v){return String(v==null?'':v).trim();}
  function esc(v){return text(v).replace(/[&<>"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
  function show(id){
    ['state-loading','state-login','state-unverified','state-noaccess','state-error','state-portal'].forEach(function(x){
      var node=el(x); if(node) node.classList.toggle('hidden',x!==id);
    });
  }
  function auth(){return window.firebase&&firebase.auth?firebase.auth():null;}
  function callable(){return firebase.app().functions(REGION).httpsCallable(FUNCTION_NAME);}
  function friendly(error){
    var code=text(error&&error.code);
    if(/invalid-credential|wrong-password|user-not-found/.test(code))return 'El correo o la contraseña no son válidos.';
    if(/too-many-requests/.test(code))return 'Hay demasiados intentos. Espera unos minutos y vuelve a intentar.';
    if(/network-request-failed/.test(code))return 'No fue posible conectar con el servicio de acceso.';
    if(/permission-denied/.test(code))return 'Tu acceso a esta cuenta no está disponible.';
    if(/not-found/.test(code))return 'No encontramos una cuenta autorizada disponible.';
    return 'No pudimos completar la consulta.';
  }
  function setStatus(id,message,kind){
    var n=el(id); if(!n)return; n.textContent=message||''; n.className='status'+(kind?' '+kind:'');
  }
  function renderAccountOptions(allowed,currentRef){
    refs=[].concat(allowed||[]);
    currentIndex=Math.max(0,refs.indexOf(currentRef));
    var wrap=el('account-switch-wrap'),sel=el('account-switch');
    if(!wrap||!sel)return;
    sel.innerHTML='';
    refs.forEach(function(ref,i){
      var o=document.createElement('option');
      o.value=String(i);
      o.textContent='Cuenta '+String(i+1);
      if(ref===currentRef)o.selected=true;
      sel.appendChild(o);
    });
    wrap.classList.toggle('hidden',refs.length<=1);
  }
  function renderPolicies(rows){
    var host=el('policy-list'); host.innerHTML='';
    rows=[].concat(rows||[]);
    if(!rows.length){host.innerHTML='<div class="empty">No encontramos seguros vigentes o próximos a renovar para esta cuenta.</div>';return;}
    rows.forEach(function(p){
      var card=document.createElement('article');card.className='item';
      var dates=[text(p.effectiveFrom),text(p.effectiveTo)].filter(Boolean).join(' → ');
      card.innerHTML='<div class="item-top"><div><div class="item-title">'+esc(p.product||p.line||'Seguro')+'</div><div class="meta">'+esc(p.policyNumber||'Referencia disponible')+(p.insurerName?' · '+esc(p.insurerName):'')+'</div></div><span class="badge good">'+esc(p.status||'Vigente')+'</span></div>'+(dates?'<div class="meta">Vigencia: '+esc(dates)+'</div>':'');
      host.appendChild(card);
    });
  }
  function renderDocuments(rows){
    var host=el('document-list'); host.innerHTML='';
    rows=[].concat(rows||[]);
    if(!rows.length){host.innerHTML='<div class="empty">No encontramos documentos disponibles para esta cuenta.</div>';return;}
    rows.forEach(function(d){
      var card=document.createElement('article');card.className='item';
      card.innerHTML='<div class="item-top"><div><div class="item-title">'+esc(d.title||d.type||'Documento')+'</div><div class="meta">'+esc(d.type||'Documento')+(d.date?' · '+esc(d.date):'')+'</div></div><span class="badge">'+(d.secureViewerEligible?'Visor seguro elegible':'Solo metadata')+'</span></div><div class="meta">La apertura del visor seguro permanece pendiente de liberación en este slice.</div>';
      host.appendChild(card);
    });
  }
  function renderProjection(result){
    var p=result&&result.projection||{};
    var a=p.account||{};
    el('account-name').textContent=text(a.displayName)||'Tu cuenta';
    el('account-meta').textContent=[text(a.country),text(a.type)].filter(Boolean).join(' · ');
    renderAccountOptions(result.allowedAccountRefs,result.accountRef);
    renderPolicies(p.policies);
    renderDocuments(p.documents);
    show('state-portal');
  }
  async function loadAccount(accountRef){
    show('state-loading');
    try{
      var payload={};
      if(accountRef)payload.accountRef=accountRef;
      var response=await callable()(payload);
      renderProjection(response&&response.data||{});
      lastError='';
    }catch(error){
      lastError=text(error&&error.code);
      if(/permission-denied|not-found|failed-precondition/.test(lastError)){show('state-noaccess');}
      else{el('error-detail').textContent=friendly(error);show('state-error');}
    }
  }
  async function handleUser(user){
    if(!user){show('state-login');return;}
    await user.reload();
    user=auth().currentUser;
    if(!user||user.emailVerified!==true){show('state-unverified');return;}
    await loadAccount('');
  }
  async function login(event){
    event.preventDefault();
    var email=text(el('portal-email').value),pass=String(el('portal-password').value||'');
    setStatus('login-status','Validando acceso…','');
    el('portal-login-btn').disabled=true;
    try{
      await auth().setPersistence(firebase.auth.Auth.Persistence.SESSION);
      var cred=await auth().signInWithEmailAndPassword(email,pass);
      setStatus('login-status','','');
      await handleUser(cred.user);
    }catch(error){
      setStatus('login-status',friendly(error),'error');
    }finally{
      el('portal-login-btn').disabled=false;
    }
  }
  async function resetPassword(){
    var email=text(el('portal-email').value);
    if(!email){setStatus('login-status','Ingresa tu correo primero.','error');return;}
    try{await auth().sendPasswordResetEmail(email);setStatus('login-status','Si el correo está habilitado, recibirás instrucciones para restablecer tu contraseña.','ok');}
    catch(error){setStatus('login-status',friendly(error),'error');}
  }
  async function sendVerification(){
    var user=auth().currentUser;
    if(!user){show('state-login');return;}
    try{await user.sendEmailVerification();setStatus('verify-status','Te enviamos un correo de verificación.','ok');}
    catch(error){setStatus('verify-status',friendly(error),'error');}
  }
  async function refreshVerification(){
    var user=auth().currentUser;
    if(!user){show('state-login');return;}
    await user.reload();
    if(auth().currentUser&&auth().currentUser.emailVerified===true)await loadAccount('');
    else setStatus('verify-status','El correo todavía aparece como no verificado.','error');
  }
  async function logout(){try{await auth().signOut();}finally{refs=[];currentIndex=0;show('state-login');}}
  function bind(){
    el('portal-login-form').addEventListener('submit',login);
    el('portal-reset-btn').addEventListener('click',resetPassword);
    el('verify-send-btn').addEventListener('click',sendVerification);
    el('verify-refresh-btn').addEventListener('click',refreshVerification);
    el('retry-btn').addEventListener('click',function(){loadAccount(refs[currentIndex]||'');});
    el('account-switch').addEventListener('change',function(){
      var idx=Number(this.value||0); if(!Number.isInteger(idx)||!refs[idx])return; currentIndex=idx; loadAccount(refs[idx]);
    });
    Array.from(document.querySelectorAll('[data-logout]')).forEach(function(b){b.addEventListener('click',logout);});
  }
  function init(){
    if(!window.firebase||!firebase.auth||!firebase.app){el('error-detail').textContent='Firebase no está disponible en este entorno.';show('state-error');return;}
    bind();
    auth().onAuthStateChanged(function(user){handleUser(user).catch(function(error){lastError=text(error&&error.code);el('error-detail').textContent=friendly(error);show('state-error');});});
  }

  window.AysPortalP01=Object.freeze({version:'s511f-v1',load:function(){return loadAccount('');},status:function(){return {authorizedAccountCount:refs.length,currentIndex:currentIndex,lastError:lastError};}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();