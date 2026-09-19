/* Gravicentra Insurance · canonical public company branding owner B1 */
(function(){
  'use strict';
  window.Orbit=window.Orbit||{};
  var state=null,loadPromise=null;
  function cfg(){return window.__ORBIT360_PRODUCT_PUBLIC_CONFIG__||{};}
  function companyId(){return String(cfg().tenantHint||'').trim();}
  function clean(v){return String(v==null?'':v).trim();}
  function endpoint(){var c=cfg(),p=clean(c.projectId);return p?'https://us-central1-'+p+'.cloudfunctions.net/orbit360TenantBranding':'';}
  function img(src,attr){var i=document.createElement('img');i.src=src;i.alt='';i.style.cssText='max-width:100%;max-height:100%;object-fit:contain;display:block';if(attr)i.setAttribute(attr,'1');return i;}
  function icon(rel,href){if(!href)return;var old=[].slice.call(document.querySelectorAll('link[rel="'+rel+'"]'));var l=old.shift();old.forEach(function(x){x.remove();});if(!l){l=document.createElement('link');l.rel=rel;document.head.appendChild(l);}l.href=href;l.setAttribute('data-company-favicon','1');}
  function show(el){if(el)el.style.visibility='visible';}
  function apply(next){
    if(next)state=Object.assign({},next,{source:next.source||'tenant-config-live'});
    var b=state;if(!b||!clean(b.displayName))return false;
    document.documentElement.setAttribute('data-tenant-public-brand',companyId());
    document.documentElement.setAttribute('data-tenant-branding-ready','1');
    var bottom=document.querySelector('.lf-logoslot'),slot=bottom&&bottom.querySelector('.slot'),name=bottom&&bottom.querySelector('.lf-cn');
    if(slot){slot.innerHTML='';if(b.logo)slot.appendChild(img(b.logo,'data-company-brand-logo'));}
    if(name)name.textContent=b.displayName||'';
    show(bottom);
    var top=document.querySelector('.tb-logo'),topSlot=document.getElementById('client-logo'),topName=top&&top.querySelector('.cn');
    if(topSlot){topSlot.innerHTML='';if(b.logo)topSlot.appendChild(img(b.logo,'data-company-brand-logo'));}
    if(topName)topName.innerHTML=(window.Orbit.ui&&Orbit.ui.esc?Orbit.ui.esc(b.displayName):b.displayName)+(b.legalName?'<small>'+(window.Orbit.ui&&Orbit.ui.esc?Orbit.ui.esc(b.legalName):b.legalName)+'</small>':'');
    show(top);
    var form=document.getElementById('login-form');
    if(form){
      var card=form.querySelector('[data-login-company-brand]');
      if(!card){card=document.createElement('div');card.setAttribute('data-login-company-brand','1');card.style.cssText='display:grid;place-items:center;gap:7px;padding:10px 12px;margin-bottom:12px;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.72)';form.insertBefore(card,form.firstChild);}
      card.innerHTML='';
      if(b.logo){var wrap=document.createElement('div');wrap.style.cssText='height:54px;max-width:260px;display:grid;place-items:center';var logo=img(b.logo,'data-login-tenant-logo');wrap.appendChild(logo);card.appendChild(wrap);}
      var label=document.createElement('div');label.style.cssText='font-weight:800;text-align:center';label.textContent=b.displayName;card.appendChild(label);
      if(b.legalName){var legal=document.createElement('small');legal.className='muted';legal.style.textAlign='center';legal.textContent=b.legalName;card.appendChild(legal);}
      var eyebrow=form.querySelector('.lg-eyebrow');if(eyebrow)eyebrow.textContent=b.displayName+' — Acceso del equipo';
    }
    var sub=document.querySelector('.lg-welcome-sub');if(sub)sub.textContent='Ingresa con tus credenciales para acceder a '+b.displayName+'.';
    if(b.favicon){icon('icon',b.favicon);icon('shortcut icon',b.favicon);}
    document.dispatchEvent(new CustomEvent('orbit:company-branding',{detail:{source:'tenant-config-live',displayName:b.displayName}}));
    return true;
  }
  async function request(action,payload){
    var url=endpoint();if(!url)throw new Error('BRANDING_RUNTIME_NOT_CONFIGURED');
    var body={action:action,tenantId:companyId()};Object.assign(body,payload||{});
    var res=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({data:body}),cache:'no-store',credentials:'omit'});
    var json=await res.json().catch(function(){return{};}),out=json&&Object.prototype.hasOwnProperty.call(json,'result')?json.result:(json.data||json);
    if(!res.ok||!out||out.ok!==true)throw new Error(clean(out&&out.error)||'BRANDING_REQUEST_FAILED');
    return out;
  }
  function load(force){if(loadPromise&&!force)return loadPromise;document.documentElement.setAttribute('data-tenant-branding-loading','1');loadPromise=request('get').then(function(out){if(!out.branding)throw new Error('BRANDING_NOT_CONFIGURED');state=Object.assign({},out.branding,{source:out.source||'tenant-config-live'});apply();return state;}).catch(function(error){document.documentElement.setAttribute('data-tenant-branding-error','1');throw error;}).finally(function(){document.documentElement.removeAttribute('data-tenant-branding-loading');});return loadPromise;}
  async function save(patch,reason){
    var p=window.Orbit.productRuntimeBrowserProvidersP0;if(!p||typeof p.callFunction!=='function')throw new Error('BRANDING_WRITE_PROVIDER_UNAVAILABLE');
    var out=await p.callFunction('orbit360TenantBranding',{action:'save',tenantId:companyId(),patch:patch||{},reason:clean(reason)||'Actualización de marca desde Configuración'},'us-central1');
    if(!out||out.ok!==true||!out.branding)throw new Error('BRANDING_SAVE_FAILED');
    state=Object.assign({},out.branding,{source:'tenant-config-live'});apply();return state;
  }
  function current(){return state?Object.assign({},state):null;}
  var api=Object.freeze({VERSION:'b1-20260919.1',load:load,apply:apply,save:save,current:current,source:'tenant-config-live',companyConfigAuthority:'server'});
  Orbit.publicTenantBranding=api;window.OrbitPublicTenantBranding=api;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){load().catch(function(){});},{once:true});else load().catch(function(){});
})();