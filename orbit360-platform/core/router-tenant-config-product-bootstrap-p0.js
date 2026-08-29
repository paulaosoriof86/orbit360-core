/* Orbit 360 · Product-safe router support bootstrap P0 · 2026-08-14
   Loads reusable UI/read contracts required before router.js.
   Tenant-specific configuration is intentionally deferred until authenticated
   product context exists. No URL tenant authority, no lab provider, no writes.
   LAB-only static Academia writers are intentionally excluded from product read-only. */
(function(){
  'use strict';
  window.Orbit=window.Orbit||{};
  var VERSION='p0-20260814.2';
  var sources={
    visualStyle:['styles/client-insurer-visual-contract-v20260720.css?v=20260722-6','/styles/client-insurer-visual-contract-v20260720.css','style'],
    editStyle:['styles/client-insurer-edit-mode-v20260722.css?v=20260722-1','/styles/client-insurer-edit-mode-v20260722.css','style'],
    session:['core/session-readiness-contract-v20260720.js?v=20260720-1','/core/session-readiness-contract-v20260720.js','script'],
    importerContract:['core/importer-execution-contract-v20260720.js?v=20260720-2','/core/importer-execution-contract-v20260720.js','script'],
    importerAcademy:['data/academia-v1225-importadores-e2e.js?v=20260720-3','/data/academia-v1225-importadores-e2e.js','script'],
    secureTargetBridge:['core/insurer-secure-target-bridge-v20260720.js?v=20260722-2','/core/insurer-secure-target-bridge-v20260720.js','script'],
    operationalPolicy:['core/operational-directory-field-policy-v20260722.js?v=20260722-1','/core/operational-directory-field-policy-v20260722.js','script'],
    editOwner:['core/client-insurer-edit-owner-v20260722.js?v=20260723-2','/core/client-insurer-edit-owner-v20260722.js','script'],
    visualStability:['core/client-insurer-visual-stability-barrier-v20260721.js?v=20260722-5','/core/client-insurer-visual-stability-barrier-v20260721.js','script'],
    visualBase:['core/client-insurer-visual-contract-v20260720.js?v=20260721-4','/core/client-insurer-visual-contract-v20260720.js','script'],
    operationalOwner:['core/client-insurer-operational-directory-owner-v20260722.js?v=20260829-1','/core/client-insurer-operational-directory-owner-v20260722.js','script']
  };
  var order=['visualStyle','editStyle','session','importerContract','importerAcademy','secureTargetBridge','operationalPolicy','editOwner','visualStability','visualBase','operationalOwner'];
  var state=window.OrbitTenantBootstrapState={owner:'core/router-tenant-config-product-bootstrap-p0.js',version:VERSION,mode:'product-readonly',tenantAuthority:'authenticated-membership-later',tenantResolved:false,sourceResolved:false,writeAuthorized:false,status:'product-static-validating',requested:order.slice(),loaded:[],errors:[]};
  function sameOrigin(value,expected){var target;try{target=new URL(value,window.location.href);}catch(e){return null;}return target.origin===window.location.origin&&target.pathname===expected?target:null;}
  function esc(target){return (target.pathname+target.search).replace(/&/g,'&amp;').replace(/"/g,'&quot;');}
  var resolved={};
  order.forEach(function(key){var item=sources[key];resolved[key]=sameOrigin(item[0],item[1]);if(!resolved[key])state.errors.push('invalid-source:'+key);});
  if(state.errors.length){state.status='product-static-blocked';return;}
  function mark(key){if(state.loaded.indexOf(key)<0)state.loaded.push(key);if(state.loaded.length===order.length)state.status='product-static-ready';}
  if(document.readyState==='loading'){
    state.status='product-static-parser-requested';
    order.forEach(function(key){var item=sources[key],target=resolved[key];if(item[2]==='style')document.write('<link rel="stylesheet" href="'+esc(target)+'" data-orbit-product-router-support="'+key+'">');else document.write('<script src="'+esc(target)+'" data-orbit-product-router-support="'+key+'"><\/script>');mark(key);});
    if(state.loaded.length===order.length&&!state.errors.length)state.status='product-static-ready';
    window.Orbit.productRouterTenantConfigBootstrapP0=Object.freeze({VERSION:VERSION,status:function(){return Object.assign({},state,{loaded:state.loaded.slice(),errors:state.errors.slice()});},writeAuthorized:false,queryTenantAllowed:false,tenantHintAuthority:false});
    return;
  }
  function append(key,next){var item=sources[key],target=resolved[key];if(item[2]==='style'){if(!document.querySelector('link[data-orbit-product-router-support="'+key+'"]')){var link=document.createElement('link');link.rel='stylesheet';link.href=target.pathname+target.search;link.setAttribute('data-orbit-product-router-support',key);document.head.appendChild(link);}mark(key);next();return;}var existing=document.querySelector('script[data-orbit-product-router-support="'+key+'"]');if(existing){mark(key);next();return;}var script=document.createElement('script');script.src=target.pathname+target.search;script.async=false;script.setAttribute('data-orbit-product-router-support',key);script.addEventListener('load',function(){mark(key);next();},{once:true});script.addEventListener('error',function(){state.errors.push('load-error:'+key);state.status='product-static-load-error';next();},{once:true});document.head.appendChild(script);}
  var pos=0;(function next(){if(pos>=order.length){if(!state.errors.length)state.status='product-static-ready';return;}append(order[pos++],next);}());
  window.Orbit.productRouterTenantConfigBootstrapP0=Object.freeze({VERSION:VERSION,status:function(){return Object.assign({},state,{loaded:state.loaded.slice(),errors:state.errors.slice()});},writeAuthorized:false,queryTenantAllowed:false,tenantHintAuthority:false});
})();
