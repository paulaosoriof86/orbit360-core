/* ============================================================
   Orbit 360 · Cliente de dominio Ops/Leads
   Adaptador genérico para el callable protegido. No contiene tenant,
   nombres, correos, roles fijos ni datos A&S.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  const VERSION = 'orbit360-ops-leads-domain-client-v2-product';
  const text = value => String(value == null ? '' : value).trim();
  function backend(){return window.OrbitBackend||{};}
  function provider(){return window.Orbit&&Orbit.productRuntimeBrowserProvidersP0;}
  function tenantId(){return text(backend().tenantId||backend().tenant);}
  function region(){return text(backend().functionsRegion||'us-central1');}
  function functionName(){return text(backend().functionNames&&backend().functionNames.opsLeads)||'orbit360OpsLeadsCommand';}
  function activeRole(){try{return text(Orbit.session&&Orbit.session.rol&&Orbit.session.rol());}catch(e){return'';}}
  function enabled(){const flags=backend().featureFlags||{};return flags.opsLeadsDomainBackendActive===true;}
  function available(){const p=provider();return!!(enabled()&&tenantId()&&activeRole()&&p&&typeof p.callFunction==='function');}
  function requestId(operation,entityId,payload){const marker=[VERSION,tenantId(),operation,entityId||'',payload&&(payload.updatedAt||payload.actualizado||payload.id)||'',Date.now()].join('|');let hash=2166136261;for(let i=0;i<marker.length;i+=1){hash^=marker.charCodeAt(i);hash=Math.imul(hash,16777619);}return'wfui_'+(hash>>>0).toString(16)+'_'+Date.now().toString(36);}
  async function command(operation,options){options=options||{};if(!available())throw new Error('OPS_LEADS_DOMAIN_BACKEND_NOT_ACTIVE');const data={tenantId:tenantId(),activeRole:activeRole(),operation,entityId:text(options.entityId||(options.payload&&options.payload.id)),payload:options.payload||{},reason:text(options.reason||options.motivo||'Cambio realizado desde Gravicentra Insurance'),requestId:text(options.requestId||requestId(operation,options.entityId,options.payload))};return provider().callFunction(functionName(),data,region());}
  function status(){return Object.freeze({version:VERSION,functionName:functionName(),tenantId:tenantId(),activeRole:activeRole(),region:region(),enabled:enabled(),available:available(),transport:'firebase-functions-modular'});}
  Orbit.workflowDomain=Object.freeze({VERSION,enabled,available,command,status});
})();
