/* Gravicentra Insurance · canonical public company branding owner B1 R2 */
(function(){
  'use strict';
  window.Orbit=window.Orbit||{};
  var snapshot=window.__ORBIT360_TENANT_BRANDING_SNAPSHOT__||null;
  var state=snapshot&&snapshot.branding?Object.assign({},snapshot.branding,{source:'build-snapshot',snapshotHash:snapshot.hash||'',snapshotVersion:snapshot.version||''}):null,loadPromise=null;
  function cfg(){return window.__ORBIT360_PRODUCT_PUBLIC_CONFIG__||{};}
  function companyId(){return String(cfg().tenantHint||'').trim();}
  function clean(v){return String(v==null?'':v).trim();}
  function endpoint(){var c=cfg(),p=clean(c.projectId);return p?'https://us-central1-'+p+'.cloudfunctions.net/orbit360TenantBranding':'';}
  function img(src,attr,style){var i=document.createElement('img');i.src=src;i.alt='';i.style.cssText=style||'width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain;object-position:center;display:block';if(attr)i.setAttribute(attr,'1');return i;}
  function icon(rel,href){if(!href)return;var old=[].slice.call(document.querySelectorAll('link[rel="'+rel+'"]'));var l=old.shift();old.forEach(function(x){x.remove();});if(!l){l=document.createElement('link');l.rel=rel;document.head.appendChild(l);}l.href=href;l.setAttribute('data-company-favicon','1');}
  function stable(b){b=b||{};return JSON.stringify([clean(b.displayName),clean(b.legalName),clean(b.logo),clean(b.favicon)]);}
  function show(el){if(el)el.style.visibility='visible';}
  function apply(next){
    if(next)state=Object.assign({},next,{source:next.source||'tenant-config-live'});
    var b=state;if(!b||!clean(b.displayName))return false;
    document.documentElement.setAttribute('data-tenant-public-brand',companyId());
    document.documentElement.setAttribute('data-tenant-branding-ready','1');
    var bottom=document.querySelector('.lf-logoslot'),slot=bottom&&bottom.querySelector('.slot'),name=bottom&&bottom.querySelector('.lf-cn');
    if(slot)slot.innerHTML='';
    if(name){name.textContent='';name.style.display='none';}
    if(bottom)bottom.style.cssText='display:none!important;visibility:hidden!important';
    var top=document.querySelector('.tb-logo'),topSlot=document.getElementById('client-logo'),topName=top&&top.querySelector('.cn');
    if(top)top.style.cssText='visibility:hidden;display:flex;align-items:center;justify-content:center;gap:0;min-width:150px;max-width:190px;height:44px;overflow:hidden';
    if(topSlot){topSlot.innerHTML='';topSlot.style.cssText='width:170px;height:38px;display:grid;place-items:center;overflow:hidden;border:0;background:transparent';if(b.logo)topSlot.appendChild(img(b.logo,'data-company-brand-logo','width:100%;height:100%;object-fit:contain;object-position:center;display:block'));}
    if(topName){topName.textContent='';topName.style.display='none';}if(top)top.setAttribute('aria-label',b.displayName);show(top);
    var form=document.getElementById('login-form');
    if(form){var card=form.querySelector('[data-login-company-brand]');if(!card){card=document.createElement('div');card.setAttribute('data-login-company-brand','1');form.insertBefore(card,form.firstChild);}card.style.cssText='display:grid;place-items:center;padding:12px 16px;margin-bottom:14px;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.72);min-height:96px;overflow:hidden';card.innerHTML='';if(b.logo){var wrap=document.createElement('div');wrap.style.cssText='width:min(320px,100%);height:74px;display:grid;place-items:center;overflow:hidden';wrap.appendChild(img(b.logo,'data-login-tenant-logo','width:100%;height:100%;object-fit:contain;object-position:center;display:block'));card.appendChild(wrap);}card.setAttribute('aria-label',b.displayName);var eyebrow=form.querySelector('.lg-eyebrow');if(eyebrow)eyebrow.textContent='Acceso del equipo';}
    var sub=document.querySelector('.lg-welcome-sub');if(sub)sub.textContent='Ingresa con tus credenciales para acceder.';
    if(b.favicon){icon('icon',b.favicon);icon('shortcut icon',b.favicon);}
    document.dispatchEvent(new CustomEvent('orbit:company-branding',{detail:{source:'tenant-config-live',displayName:b.displayName}}));return true;
  }
  async function request(action,payload){var url=endpoint();if(!url)throw new Error('BRANDING_RUNTIME_NOT_CONFIGURED');var body={action:action,tenantId:companyId()};Object.assign(body,payload||{});var res=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({data:body}),cache:'no-store',credentials:'omit'});var json=await res.json().catch(function(){return{};}),out=json&&Object.prototype.hasOwnProperty.call(json,'result')?json.result:(json.data||json);if(!res.ok||!out||out.ok!==true)throw new Error(clean(out&&out.error)||'BRANDING_REQUEST_FAILED');return out;}
  function load(force){if(loadPromise&&!force)return loadPromise;document.documentElement.setAttribute('data-tenant-branding-loading','1');loadPromise=request('get').then(function(out){if(!out.branding)throw new Error('BRANDING_NOT_CONFIGURED');var live=Object.assign({},out.branding,{source:out.source||'tenant-config-live'});if(stable(live)!==stable(state)){state=live;apply();}else state=Object.assign({},state||live,{source:live.source});return Object.assign({},state);}).catch(function(error){document.documentElement.setAttribute('data-tenant-branding-error','1');if(state)return Object.assign({},state);throw error;}).finally(function(){document.documentElement.removeAttribute('data-tenant-branding-loading');});return loadPromise;}
  async function save(patch,reason){var p=window.Orbit.productRuntimeBrowserProvidersP0;if(!p||typeof p.callFunction!=='function')throw new Error('BRANDING_WRITE_PROVIDER_UNAVAILABLE');var out=await p.callFunction('orbit360TenantBranding',{action:'save',tenantId:companyId(),patch:patch||{},reason:clean(reason)||'Actualización de marca desde Configuración'},'us-central1');if(!out||out.ok!==true||!out.branding)throw new Error('BRANDING_SAVE_FAILED');state=Object.assign({},out.branding,{source:'tenant-config-live'});apply();return state;}
  function current(){return state?Object.assign({},state):null;}
  var api=Object.freeze({VERSION:'b1-r3-20260919.1',load:load,apply:apply,save:save,current:current,source:'build-snapshot+tenant-config-live',companyConfigAuthority:'server'});Orbit.publicTenantBranding=api;window.OrbitPublicTenantBranding=api;
  if(state)apply(state);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){if(state)apply(state);load().catch(function(){});},{once:true});else load().catch(function(){});
})();