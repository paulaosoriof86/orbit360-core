/* ============================================================
   Orbit 360 · Product Auth owner P0
   Firebase Auth only. No demo user, no localStorage session,
   no tenant from URL and no technical copy in client messages.
   ============================================================ */
(function(){
  'use strict';
  window.Orbit=window.Orbit||{};
  var provider=function(){return window.Orbit.productRuntimeBrowserProvidersP0;};
  var rawUser=null;
  function productUser(){return window.Orbit.auth&&window.Orbit.auth.productUser?window.Orbit.auth.productUser:null;}
  function user(){var p=productUser();if(p)return p;if(!rawUser)return null;return{nombre:rawUser.displayName||rawUser.email||'Usuario',email:rawUser.email||'',uid:rawUser.uid||'',rol:'',tipo:'interno',backend:'product'};}
  function initials(value){var text=String(value||'').trim();if(!text)return'U';if(text.indexOf('@')>0)text=text.split('@')[0].replace(/[._-]+/g,' ');return text.split(/\s+/).filter(Boolean).slice(0,2).map(function(x){return x.charAt(0).toUpperCase();}).join('')||'U';}
  function paintIdentity(){var u=user()||{},box=document.getElementById('tb-user');if(!box)return;var label=String((rawUser&&rawUser.displayName)||u.nombre||u.email||'Usuario').trim(),avatar=box.querySelector('.av'),name=box.querySelector('.who b');if(avatar)avatar.textContent=initials(label);if(name)name.textContent=label;box.title='Cuenta';}
  function paintError(message){var box=document.querySelector('.lg-box');if(!box)return;var el=document.getElementById('login-error');if(!el){el=document.createElement('div');el.id='login-error';el.className='hint error';box.appendChild(el);}el.textContent=message||'';}
  function setSubmitting(form,active){if(!form)return;var button=form.querySelector('button[type="submit"]');form.dataset.submitting=active?'1':'0';if(!button)return;if(!button.dataset.label)button.dataset.label=button.textContent||'Ingresar al Orbit 360';button.disabled=!!active;button.textContent=active?'Validando acceso…':button.dataset.label;}
  function showLogin(){var lg=document.getElementById('login');if(lg){lg.style.display='';lg.classList.remove('hidden');}document.body.classList.add('pre-auth');}
  function showApp(){paintIdentity();var lg=document.getElementById('login');if(lg){lg.classList.add('hidden');setTimeout(function(){lg.style.display='none';},300);}document.body.classList.remove('pre-auth');setTimeout(function(){var u=user()||{};var tipo=u.tipo==='socio'?'socio':'interno';var scopeId='user:'+(u.email||u.uid||'product');if(Orbit.legal&&Orbit.legal.gate)Orbit.legal.gate(tipo,scopeId);},350);}
  function friendly(){return 'No fue posible iniciar sesión. Verifica tu usuario y contraseña e intenta nuevamente.';}
  function init(){
    showLogin();
    var p=provider();
    if(!p||!p.enabled||!p.enabled()){paintError('El acceso todavía no está habilitado.');return;}
    p.initialize().catch(function(){paintError('El acceso todavía no está disponible.');});
    var form=document.getElementById('login-form');
    if(!form||form.dataset.productBound==='1')return;
    form.dataset.productBound='1';
    var email=document.getElementById('lg-user'),pass=document.getElementById('lg-pass');
    if(email)email.value='';if(pass)pass.value='';
    form.addEventListener('submit',function(ev){
      ev.preventDefault();if(form.dataset.submitting==='1')return;paintError('');setSubmitting(form,true);
      p.signIn(email&&email.value,pass&&pass.value).then(function(cred){rawUser=cred&&cred.user?cred.user:null;if(!rawUser||rawUser.emailVerified!==true)throw new Error('ACCOUNT_NOT_READY');return Orbit.productAppP0.activate();}).catch(function(){paintError(friendly());}).finally(function(){setSubmitting(form,false);});
    });
  }
  function logout(){var p=provider();return Promise.resolve(p&&p.signOut?p.signOut():null).catch(function(){}).then(function(){rawUser=null;location.reload();});}
  window.Orbit.auth={VERSION:'product-p0-m6-20260730.2',init:init,user:user,authed:function(){return!!user();},login:function(){return user();},logout:logout,showLogin:showLogin,showApp:showApp,paintIdentity:paintIdentity,productUser:null,writeAuthorized:false,noLocalSession:true};
})();
