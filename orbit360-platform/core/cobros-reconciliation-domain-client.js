/* ============================================================
   Orbit 360 · Cliente de dominio Cobros/Conciliaciones
   Callable genérico por tenant. No aplica pagos sin confirmación.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  const VERSION='orbit360-cobros-reconciliation-client-v2-product';
  const text=value=>String(value==null?'':value).trim();
  const backend=()=>window.OrbitBackend||{};
  const provider=()=>window.Orbit&&Orbit.productRuntimeBrowserProvidersP0;
  const tenantId=()=>text(backend().tenantId||backend().tenant);
  const region=()=>text(backend().functionsRegion||'us-central1');
  const functionName=()=>text(backend().functionNames&&backend().functionNames.reconciliation)||'orbit360CobrosReconciliationCommand';
  const activeRole=()=>{try{return text(Orbit.session&&Orbit.session.rol&&Orbit.session.rol());}catch(e){return'';}};
  const enabled=()=>!!((backend().featureFlags||{}).cobrosReconciliationDomainActive===true);
  const available=()=>{const p=provider();return!!(enabled()&&tenantId()&&activeRole()&&p&&typeof p.callFunction==='function');};
  function makeRequestId(operation,payload){const marker=[VERSION,tenantId(),operation,payload&&(payload.proposalId||payload.polizaId||payload.id)||'',Date.now()].join('|');let hash=2166136261;for(let i=0;i<marker.length;i+=1){hash^=marker.charCodeAt(i);hash=Math.imul(hash,16777619);}return'recui_'+(hash>>>0).toString(16)+'_'+Date.now().toString(36);}
  async function command(operation,options){options=options||{};if(!available())throw new Error('COBROS_RECONCILIATION_BACKEND_NOT_ACTIVE');const payload=options.payload||{};return provider().callFunction(functionName(),{tenantId:tenantId(),activeRole:activeRole(),operation,payload,reason:text(options.reason||options.motivo||'Acción de conciliación desde Gravicentra Insurance'),requestId:text(options.requestId||makeRequestId(operation,payload))},region());}
  function previewPolicy(polizaId){return command('preview_policy',{payload:{polizaId},reason:'Vista previa inferencial sin aplicar pagos'});}
  function confirmProposal(proposalId,options){options=options||{};return command('confirm_application',{payload:Object.assign({proposalId},options.payload||{}),reason:options.reason||options.motivo||'Conciliación confirmada por usuario autorizado'});}
  function holdProposal(proposalId,motivo,accionRequerida){return command('hold_proposal',{payload:{proposalId,accionRequerida},reason:motivo});}
  function status(){return Object.freeze({version:VERSION,functionName:functionName(),tenantId:tenantId(),activeRole:activeRole(),region:region(),enabled:enabled(),available:available(),transport:'firebase-functions-modular'});}
  Orbit.reconciliationDomain=Object.freeze({VERSION,enabled,available,command,previewPolicy,confirmProposal,holdProposal,status});
})();
