/* Gravicentra Insurance · Product application owner · Iteration 2 clean startup · 2026-09-01 */
(function(){
  'use strict';
  window.Orbit=window.Orbit||{};
  var VERSION='fase-a-i2-clean-20260901.1';
  var state={initialized:false,activating:false,started:false,routerStarted:false,tenantContextReady:false,operationalWriteReady:false,lastError:''};
  var activationPromise=null;

  function clean(v){return String(v==null?'':v).trim();}
  function status(){
    return {
      version:VERSION,
      initialized:state.initialized,
      activating:state.activating,
      started:state.started,
      routerStarted:state.routerStarted,
      tenantContextReady:state.tenantContextReady,
      operationalWriteReady:state.operationalWriteReady,
      lastError:state.lastError,
      mode:'product',
      writeAuthorized:state.operationalWriteReady===true,
      noFallback:true,
      serviceWorkerBlocking:false
    };
  }
  function signal(){
    try{document.dispatchEvent(new CustomEvent('orbit:product-app',{detail:status()}));}catch(e){}
  }
  function fail(message){
    state.lastError=clean(message)||'PRODUCT_APP_ACTIVATION_FAILED';
    state.activating=false;
    state.started=false;
    signal();
    var err=new Error(state.lastError);err.code=state.lastError;throw err;
  }
  function init(){
    if(state.initialized)return status();
    state.initialized=true;
    document.documentElement.dataset.orbitProductMode='product';
    document.documentElement.dataset.orbitEntrypoint='gravicentra-fase-a';
    if(!Orbit.auth||typeof Orbit.auth.init!=='function')return fail('PRODUCT_AUTH_OWNER_MISSING');
    Orbit.auth.init();
    signal();
    return status();
  }
  function activate(){
    if(state.started)return Promise.resolve(status());
    if(activationPromise)return activationPromise;
    state.activating=true;state.lastError='';signal();

    activationPromise=Promise.resolve().then(function(){
      var cfg=window.__ORBIT360_PRODUCT_PUBLIC_CONFIG__||{};
      var providers=Orbit.productRuntimeBrowserProvidersP0;
      var owner=Orbit.backendProductReadOnlyBootstrapP0;
      if(cfg.enabled!==true)throw new Error('PRODUCT_RUNTIME_NOT_CONFIGURED');
      if(!providers||typeof providers.dependencies!=='function')throw new Error('PRODUCT_RUNTIME_PROVIDERS_MISSING');
      if(!owner||typeof owner.start!=='function')throw new Error('PRODUCT_READONLY_BOOTSTRAP_MISSING');
      return owner.start(providers.dependencies(),{
        mode:'product',
        authorizedProductReadOnly:true,
        runtimeAuthorized:true,
        collections:Array.isArray(cfg.collections)?cfg.collections:[],
        snapshotTimeoutMs:20000
      });
    }).then(function(result){
      if(!result||result.ok!==true||result.ready!==true||result.writeAuthorized!==false)throw new Error('PRODUCT_READONLY_BOOTSTRAP_NOT_READY');
      var ps=Orbit.store&&typeof Orbit.store._productStatus==='function'?Orbit.store._productStatus():{};
      if(ps.ready!==true||ps.status!=='ready-read-only'||ps.noFallback!==true||ps.writeEnabled!==false)throw new Error('PRODUCT_STORE_NOT_READY');

      var tenantBridge=Orbit.productTenantRuntimeContextP0;
      if(!tenantBridge||typeof tenantBridge.install!=='function')throw new Error('PRODUCT_TENANT_CONTEXT_BRIDGE_MISSING');
      var tenantStatus=tenantBridge.install();
      if(!tenantStatus||tenantStatus.ready!==true||!clean(tenantStatus.tenantId))throw new Error('PRODUCT_TENANT_CONTEXT_NOT_READY');
      state.tenantContextReady=true;

      var writer=Orbit.productOperationalWriteP0;
      if(!writer||typeof writer.install!=='function')throw new Error('PRODUCT_OPERATIONAL_WRITE_OWNER_MISSING');
      var writeStatus=writer.install(Orbit.store);
      if(!writeStatus||writeStatus.ready!==true||writeStatus.failClosed!==true)throw new Error('PRODUCT_OPERATIONAL_WRITE_NOT_READY');
      state.operationalWriteReady=true;

      if(!state.routerStarted){
        if(!location.hash)location.hash='#/inicio';
        if(!Orbit.router||typeof Orbit.router.init!=='function')throw new Error('PRODUCT_ROUTER_MISSING');
        Orbit.router.init();
        state.routerStarted=true;
      }
      return result;
    }).then(function(){
      state.started=true;state.activating=false;state.lastError='';
      if(Orbit.auth&&typeof Orbit.auth.showApp==='function')Orbit.auth.showApp();
      signal();
      try{document.dispatchEvent(new CustomEvent('orbit:auth'));document.dispatchEvent(new CustomEvent('orbit:store'));}catch(e){}
      var defer=window.requestIdleCallback||function(fn){return setTimeout(fn,0);};
      defer(function(){if(Orbit.novedades&&typeof Orbit.novedades.init==='function'){try{Orbit.novedades.init();}catch(e){}}});
      return status();
    }).catch(function(error){
      activationPromise=null;state.tenantContextReady=false;state.operationalWriteReady=false;
      return fail(error&&error.message?error.message:error);
    });
    return activationPromise;
  }

  window.Orbit.productAppP0=Object.freeze({
    VERSION:VERSION,
    init:init,
    activate:activate,
    isStarted:function(){return state.started===true;},
    status:status,
    writeAuthorized:true,
    failClosed:true,
    noFallback:true,
    serviceWorkerBlocking:false
  });
})();
