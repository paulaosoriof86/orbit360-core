/* ============================================================
   Orbit 360 · Cliente de dominio Cobros/Conciliaciones
   Callable genérico por tenant. No aplica pagos sin confirmación.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  const VERSION='orbit360-cobros-reconciliation-client-v4-payment-origin';
  const text=value=>String(value==null?'':value).trim();
  const low=value=>text(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  function classifyPaymentOrigin(row){
    row=row||{};
    const explicit=[row.evidenceType,row.sourceType,row.paymentSourceType,row.originType,row.origenTipo].map(low).join('|');
    const authority=[row.fuenteAutoridad,row.origenAutoridad,row.fuenteConciliacion,row.authority,row.sourceAuthority].map(low).join('|');
    if(/client[_ -]?reported|client[_ -]?portal|portal[_ -]?client|cliente[_ -]?portal/.test(explicit+'|'+authority))return 'CLIENT_PORTAL';
    if(/cobros[_ -]?realizados|direct[_ -]?payment[_ -]?reported[_ -]?crm/.test(explicit)||/(^|[| _-])(siga|crm)([| _-]|$)/.test(authority))return 'CRM_DIRECT';
    return 'UNKNOWN';
  }
  const backend=()=>window.OrbitBackend||{};
  const provider=()=>window.Orbit&&Orbit.productRuntimeBrowserProvidersP0;
  const tenantId=()=>text(backend().tenantId||backend().tenant);
  const region=()=>text(backend().functionsRegion||'us-central1');
  const isPreviewHost=()=>/--gi-i65-b3-|--gi-i65-b2-|--gi-i65-b1-/.test(String(location&&location.hostname||''));
  const functionName=()=>isPreviewHost()?'orbit360CobrosReconciliationCommandPreview':(text(backend().functionNames&&backend().functionNames.reconciliation)||'orbit360CobrosReconciliationCommand');
  const activeRole=()=>{try{return text(Orbit.session&&Orbit.session.rol&&Orbit.session.rol());}catch(e){return'';}};
  const enabled=()=>!!((backend().featureFlags||{}).cobrosReconciliationDomainActive===true);
  const available=()=>{const p=provider();return!!(enabled()&&tenantId()&&activeRole()&&p&&typeof p.callFunction==='function');};
  function stable(value){if(value==null)return value;if(Array.isArray(value))return value.map(stable);if(typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));return value;}
  function makeRequestId(operation,payload){const marker=[VERSION,tenantId(),operation,JSON.stringify(stable(payload||{}))].join('|');let hash=2166136261;for(let i=0;i<marker.length;i+=1){hash^=marker.charCodeAt(i);hash=Math.imul(hash,16777619);}return'recui_'+(hash>>>0).toString(16);}
  async function command(operation,options){options=options||{};if(!available())throw new Error('COBROS_RECONCILIATION_BACKEND_NOT_ACTIVE');const payload=options.payload||{};return provider().callFunction(functionName(),{tenantId:tenantId(),activeRole:activeRole(),operation,payload,reason:text(options.reason||options.motivo||'Acción de conciliación desde Gravicentra Insurance'),requestId:text(options.requestId||makeRequestId(operation,payload))},region());}
  function previewPolicy(polizaId){return command('preview_policy',{payload:{polizaId},reason:'Vista previa inferencial sin aplicar pagos'});}
  function applyPayment(receiptId,options){options=options||{};const payload=Object.assign({receiptId},options.payload||{});return command('apply_payment',{payload,reason:options.reason||options.motivo||'Aplicación canónica de pago'});}
  function reportClientPayment(receiptId,options){options=options||{};return applyPayment(receiptId,{payload:Object.assign({},options.payload||{},{sourceType:'client_reported'}),reason:options.reason||'Pago reportado por cliente'});}
  function enrichApplication(receiptId,options){options=options||{};return applyPayment(receiptId,{payload:Object.assign({},options.payload||{},{sourceType:options.sourceType||'insurer_invoice'}),reason:options.reason||'Aplicación de aseguradora'});}
  function confirmProposal(proposalId,options){options=options||{};return command('confirm_application',{payload:Object.assign({proposalId},options.payload||{}),reason:options.reason||options.motivo||'Conciliación confirmada por usuario autorizado'});}
  function holdProposal(proposalId,motivo,accionRequerida){return command('hold_proposal',{payload:{proposalId,accionRequerida},reason:motivo});}
  function status(){return Object.freeze({version:VERSION,functionName:functionName(),tenantId:tenantId(),activeRole:activeRole(),region:region(),enabled:enabled(),available:available(),transport:'firebase-functions-modular'});}
  Orbit.reconciliationDomain=Object.freeze({VERSION,enabled,available,classifyPaymentOrigin,command,previewPolicy,applyPayment,reportClientPayment,enrichApplication,confirmProposal,holdProposal,status});
})();
