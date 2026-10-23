/* Gravicentra Insurance · Product application owner · Iteration 2 clean startup · 2026-09-02 */
(function(){
  'use strict';
  window.Orbit=window.Orbit||{};
  var VERSION='fase-a-i2-clean-20261007.r20f3-pending-landing';
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
  function progress(message){try{var el=document.querySelector('#auth-restoring small');if(el)el.textContent=message||'';}catch(e){}}
  // The country selector is a view preference, never a permission grant. Bind
  // it to the authenticated UID and tenant, and revalidate it against the
  // freshly confirmed membership before drawing the first post-reload page.
  function countryContext(){
    var m=Orbit.auth&&Orbit.auth.productUser;
    if(!m||m.productReadOnly!==true||!clean(m.uid)||!clean(m.tenantId)||!Array.isArray(m.countries))return null;
    var countries=m.countries.map(function(v){return clean(v).toUpperCase();}).filter(function(v){return v==='GT'||v==='CO';});
    countries=Array.from(new Set(countries));
    if(!countries.length)return null;
    return{key:'gi-b4003-country:'+encodeURIComponent(m.tenantId)+':'+encodeURIComponent(m.uid),countries:countries};
  }
  function validCountry(value,context){
    return context&&(context.countries.indexOf(value)>=0||(value==='TODOS'&&context.countries.length>1));
  }
  function persistCountry(next){
    var context=countryContext(),value=clean(next).toUpperCase();
    if(!validCountry(value,context))return false;
    try{window.sessionStorage.setItem(context.key,value);}catch(e){}
    return true;
  }
  function restoreCountry(){
    var context=countryContext();
    if(!context)return false;
    var saved='';
    try{saved=clean(window.sessionStorage.getItem(context.key)).toUpperCase();}catch(e){}
    var selected=validCountry(saved,context)?saved:(context.countries.length===1?context.countries[0]:'TODOS');
    Orbit.pais=selected;
    var selector=document.getElementById('pais-sel');
    if(selector)selector.value=selected;
    return true;
  }
  function preferredLanding(){
    // Fast neutral first paint. The inbox owner performs a non-blocking,
    // recipient-aware redirect only when an actionable request exists.
    return'inicio';
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
    state.activating=true;state.lastError='';progress('Validando tu acceso y permisos…');signal();

    activationPromise=Promise.resolve().then(function(){
      var cfg=window.__ORBIT360_PRODUCT_PUBLIC_CONFIG__||{};
      var providers=Orbit.productRuntimeBrowserProvidersP0;
      var owner=Orbit.backendProductReadOnlyBootstrapP0;
      var hydrationOwner=Orbit.productHydrationRequiredOptionalP0;
      if(cfg.enabled!==true)throw new Error('PRODUCT_RUNTIME_NOT_CONFIGURED');
      // A B4-003 scoped channel must never downgrade to direct Firestore reads.
      var scopedChannel=/^ays-orbit-360-lab--gi-i65-b4-[a-z0-9-]+\.web\.app$/i.test(
        String(window.location&&window.location.hostname||''));
      if(scopedChannel&&cfg.scopedReadPreviewCandidate!==true)
        throw new Error('PROTECTED_READ_CANDIDATE_DISABLED');
      if(!scopedChannel&&cfg.scopedReadPreviewCandidate===true)
        throw new Error('PROTECTED_READ_PREVIEW_HOST_DENIED');
      if(!providers||typeof providers.dependencies!=='function')throw new Error('PRODUCT_RUNTIME_PROVIDERS_MISSING');
      if(!owner||typeof owner.start!=='function')throw new Error('PRODUCT_READONLY_BOOTSTRAP_MISSING');
      if(!hydrationOwner||typeof hydrationOwner.contract!=='function')throw new Error('PRODUCT_HYDRATION_CONTRACT_MISSING');
      var hydration=hydrationOwner.contract();
      var bootstrapCollections=hydration.required.slice();
      if(!hydration.required.length||!bootstrapCollections.length)throw new Error('PRODUCT_HYDRATION_CONTRACT_EMPTY');
      progress('Preparando acceso seguro a tu información…');
      return owner.start(providers.dependencies(),{
        mode:'product',
        authorizedProductReadOnly:true,
        runtimeAuthorized:true,
        collections:bootstrapCollections,
        snapshotTimeoutMs:8000,
        // Preview-only candidate: no silent direct Firestore fallback.
        protectedReadCandidate: cfg.scopedReadPreviewCandidate===true &&
          String(window.location&&window.location.hostname||'').includes('--')
      }).then(function(result){
        // Optional collections load on their authorized route, not during login.
        // This prevents every financial/legacy source competing with first paint.
        return result;
      });
    }).then(function(result){
      if(!result||result.ok!==true||result.ready!==true||result.writeAuthorized!==false){
        var blocked=result&&result.status||{};
        // Log only state-machine-owned diagnostics; never raw errors, tenant,
        // identity, collection data, tokens or server response details.
        var allowedPhases=['preflight','environment','authentication','membership','planning','attaching','waiting-snapshots','installing'];
        var allowedCodes=['BOOTSTRAP_PREFLIGHT_REJECTED','STORE_READINESS_TIMEOUT','STORE_SNAPSHOT_ERROR',
          'STORE_ATTACH_ERROR','STORE_BLOCKED','MEMBERSHIP_REJECTED','READINESS_CONTRACT_REJECTED',
          'PROTECTED_PROVIDER_MISSING','SNAPSHOTS_NOT_ATTACHED','ENVIRONMENT_FAILED',
          'AUTHENTICATION_FAILED','MEMBERSHIP_FAILED','PLANNING_FAILED','ATTACHING_FAILED',
          'SNAPSHOT_READ_FAILED','INSTALLING_FAILED','BOOTSTRAP_FAILED'];
        try{console.warn('[Orbit Product] READONLY_BOOTSTRAP_BLOCKED',{
          phase:allowedPhases.includes(blocked.failurePhase)?blocked.failurePhase:'unknown',
          code:allowedCodes.includes(blocked.failureCode)?blocked.failureCode:'UNKNOWN_FAILURE'
        });}catch(e){}
        throw new Error('PRODUCT_READONLY_BOOTSTRAP_NOT_READY');
      }
      var ps=Orbit.store&&typeof Orbit.store._productStatus==='function'?Orbit.store._productStatus():{};
      if(ps.ready!==true||ps.status!=='ready-read-only'||ps.noFallback!==true||ps.writeEnabled!==false)throw new Error('PRODUCT_STORE_NOT_READY');

      if(!restoreCountry())throw new Error('PRODUCT_AUTHORIZED_COUNTRY_CONTEXT_MISSING');

      // Non-blocking overlap: critical Cliente360/Cobros dependencies begin loading
      // while tenant/session owners finish activation. They remain optional for startup.
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

      var academyOwner=Orbit.academiaProductCatalogP0;
      if(!academyOwner||typeof academyOwner.install!=='function')throw new Error('ACADEMIA_PRODUCT_CATALOG_OWNER_MISSING');
      var academyStatus=academyOwner.install(Orbit.store);
      if(!academyStatus||academyStatus.ready!==true||academyStatus.requiredCoursesPresent!==true||academyStatus.automaticWrites!==false||academyStatus.seed!==false||academyStatus.lab!==false)throw new Error('ACADEMIA_PRODUCT_CATALOG_NOT_READY');

      if(!state.routerStarted){
        if(!location.hash)location.hash='#/'+preferredLanding();
        progress('Abriendo '+(location.hash==='#/leads'?'Leads':location.hash==='#/ops'?'Ops':'tu panel')+'…');
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
    persistCountry:persistCountry,
    isStarted:function(){return state.started===true;},
    status:status,
    writeAuthorized:true,
    failClosed:true,
    noFallback:true,
    serviceWorkerBlocking:false
  });
})();
