/* Orbit 360 · Product tenant runtime context bridge P0 · 2026-08-14
   Projects the authenticated membership tenant into the router's existing
   runtime hook. No URL tenant, no tenantHint authority, no writes, no fallback. */
(function(){
  'use strict';
  window.Orbit=window.Orbit||{};
  var VERSION='p0-20260814';
  var state={ready:false,tenantId:'',source:'authenticated-product-membership',lastError:'',writeAuthorized:false};
  function text(v){return String(v==null?'':v).trim();}
  function status(){return{version:VERSION,ready:state.ready===true,tenantId:text(state.tenantId),source:state.source,lastError:text(state.lastError),writeAuthorized:false,noFallback:true};}
  function resolveTenant(){
    var auth=window.Orbit&&Orbit.auth&&Orbit.auth.productUser||null;
    var authTenant=text(auth&&auth.productReadOnly===true&&auth.tenantId);
    var storeStatus=window.Orbit&&Orbit.store&&typeof Orbit.store._productStatus==='function'?Orbit.store._productStatus():{};
    var storeTenant=text(storeStatus&&storeStatus.tenantId);
    if(!authTenant)throw new Error('PRODUCT_TENANT_AUTH_CONTEXT_MISSING');
    if(storeStatus.ready!==true||storeStatus.status!=='ready-read-only'||storeStatus.writeEnabled!==false)throw new Error('PRODUCT_TENANT_STORE_CONTEXT_NOT_READY');
    if(!storeTenant)throw new Error('PRODUCT_TENANT_STORE_CONTEXT_MISSING');
    if(authTenant!==storeTenant)throw new Error('PRODUCT_TENANT_CONTEXT_MISMATCH');
    return authTenant;
  }
  function install(){
    try{
      var tenantId=resolveTenant();
      var existing=window.OrbitBackend&&typeof window.OrbitBackend==='object'?window.OrbitBackend:{};
      var existingTenant=text(existing.tenantId||existing.tenant);
      var existingMode=text(existing.mode).toLowerCase();
      if(existingMode&&existingMode!=='product-readonly'&&existingMode!=='product')throw new Error('PRODUCT_TENANT_EXISTING_RUNTIME_MODE_CONFLICT');
      if(existingTenant&&existingTenant!==tenantId)throw new Error('PRODUCT_TENANT_EXISTING_RUNTIME_TENANT_CONFLICT');
      window.OrbitBackend=Object.assign({},existing,{
        tenantId:tenantId,
        tenant:tenantId,
        mode:'product-readonly',
        productReadOnly:true,
        writeAuthorized:false,
        tenantSource:'membership'
      });
      state.ready=true;state.tenantId=tenantId;state.lastError='';
      try{window.dispatchEvent(new CustomEvent('orbit:product-tenant-context',{detail:status()}));}catch(e){}
      return status();
    }catch(error){
      state.ready=false;state.tenantId='';state.lastError=text(error&&error.message||error)||'PRODUCT_TENANT_CONTEXT_INSTALL_FAILED';
      try{window.dispatchEvent(new CustomEvent('orbit:product-tenant-context',{detail:status()}));}catch(e){}
      var out=new Error(state.lastError);out.code=state.lastError;throw out;
    }
  }
  window.Orbit.productTenantRuntimeContextP0=Object.freeze({VERSION:VERSION,install:install,status:status,resolveTenant:resolveTenant,writeAuthorized:false,noFallback:true,queryTenantAllowed:false,tenantHintAuthority:false});
})();
