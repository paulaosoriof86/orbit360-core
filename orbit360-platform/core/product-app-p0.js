/* Orbit 360 · Product application activation owner P0 · 2026-08-13 */
(function(){
  'use strict';
  window.Orbit=window.Orbit||{};
  var state={initialized:false,activating:false,started:false,routerStarted:false,lastError:''};
  var activationPromise=null;
  function clean(v){return String(v==null?'':v).trim();}
  function status(){return{initialized:state.initialized,activating:state.activating,started:state.started,routerStarted:state.routerStarted,lastError:state.lastError,mode:'product-readonly',writeAuthorized:false};}
  function fail(message){state.lastError=clean(message)||'PRODUCT_APP_ACTIVATION_FAILED';state.activating=false;try{document.dispatchEvent(new CustomEvent('orbit:product-app',{detail:status()}));}catch(e){}var err=new Error(state.lastError);err.code=state.lastError;throw err;}
  function init(){
    if(state.initialized)return status();
    state.initialized=true;
    document.documentElement.dataset.orbitProductMode='product-readonly';
    document.documentElement.dataset.orbitEntrypoint='fase-a-product';
    if(!Orbit.auth||typeof Orbit.auth.init!=='function')return fail('PRODUCT_AUTH_OWNER_MISSING');
    Orbit.auth.init();
    try{document.dispatchEvent(new CustomEvent('orbit:product-app',{detail:status()}));}catch(e){}
    return status();
  }
  function activate(){
    if(state.started)return Promise.resolve(status());
    if(activationPromise)return activationPromise;
    state.activating=true;state.lastError='';
    activationPromise=Promise.resolve().then(function(){
      var cfg=window.__ORBIT360_PRODUCT_PUBLIC_CONFIG__||{};
      var providers=Orbit.productRuntimeBrowserProvidersP0;
      var owner=Orbit.backendProductReadOnlyBootstrapP0;
      if(cfg.enabled!==true)throw new Error('PRODUCT_RUNTIME_NOT_CONFIGURED');
      if(!providers||typeof providers.dependencies!=='function')throw new Error('PRODUCT_RUNTIME_PROVIDERS_MISSING');
      if(!owner||typeof owner.start!=='function')throw new Error('PRODUCT_READONLY_BOOTSTRAP_MISSING');
      return owner.start(providers.dependencies(),{mode:'product',authorizedProductReadOnly:true,runtimeAuthorized:true,collections:Array.isArray(cfg.collections)?cfg.collections:[],snapshotTimeoutMs:30000});
    }).then(function(result){
      if(!result||result.ok!==true||result.ready!==true||result.writeAuthorized!==false)throw new Error('PRODUCT_READONLY_BOOTSTRAP_NOT_READY');
      var ps=Orbit.store&&typeof Orbit.store._productStatus==='function'?Orbit.store._productStatus():{};
      if(ps.ready!==true||ps.status!=='ready-read-only'||ps.noFallback!==true||ps.writeEnabled!==false)throw new Error('PRODUCT_STORE_NOT_READY');
      if(!state.routerStarted){if(!Orbit.router||typeof Orbit.router.init!=='function')throw new Error('PRODUCT_ROUTER_MISSING');Orbit.router.init();state.routerStarted=true;}
      state.started=true;state.activating=false;state.lastError='';
      if(Orbit.auth&&typeof Orbit.auth.showApp==='function')Orbit.auth.showApp();
      if(Orbit.novedades&&typeof Orbit.novedades.init==='function'){try{Orbit.novedades.init();}catch(e){}}
      try{document.dispatchEvent(new CustomEvent('orbit:auth'));document.dispatchEvent(new CustomEvent('orbit:store'));document.dispatchEvent(new CustomEvent('orbit:product-app',{detail:status()}));}catch(e){}
      if(!location.hash)location.hash='#/inicio';
      try{window.dispatchEvent(new HashChangeEvent('hashchange'));}catch(e){window.dispatchEvent(new Event('hashchange'));}
      return status();
    }).catch(function(error){activationPromise=null;return fail(error&&error.message?error.message:error);});
    return activationPromise;
  }
  window.Orbit.productAppP0=Object.freeze({VERSION:'fase-a-product-p0-20260813',init:init,activate:activate,isStarted:function(){return state.started===true;},status:status,writeAuthorized:false,noFallback:true});
})();
