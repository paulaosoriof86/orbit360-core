/* ============================================================
   Orbit 360 · Cliente de dominio Cobros/Conciliaciones
   Callable genérico por tenant. No aplica pagos sin confirmación.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  const VERSION='orbit360-cobros-reconciliation-client-v9-r12p7-product-context';
  const text=value=>String(value==null?'':value).trim();
  const low=value=>text(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  function classifyPaymentOrigin(row){
    row=row||{};
    const explicit=[row.evidenceType,row.sourceType,row.paymentSourceType,row.originType,row.origenTipo,row.paymentOrigin,row.paymentOriginKind].map(low).join('|');
    const authority=[row.fuenteAutoridad,row.origenAutoridad,row.fuenteConciliacion,row.authority,row.sourceAuthority].map(low).join('|');
    if(/advisor[_ -]?reported|asesor[_ -]?reportado|advisor[_ -]?payment/.test(explicit+'|'+authority))return 'ADVISOR_REPORTED';
    if(/client[_ -]?reported|client[_ -]?portal|portal[_ -]?client|cliente[_ -]?portal/.test(explicit+'|'+authority))return 'CLIENT_PORTAL';
    if(/cobros[_ -]?realizados|direct[_ -]?payment[_ -]?reported[_ -]?crm/.test(explicit)||/(^|[| _-])(siga|crm)([| _-]|$)/.test(authority))return 'CRM_DIRECT';
    return 'UNKNOWN';
  }
  const backend=()=>window.OrbitBackend||{};
  const provider=()=>window.Orbit&&Orbit.productRuntimeBrowserProvidersP0;
  const tenantId=()=>text(backend().tenantId||backend().tenant);
  const region=()=>text(backend().functionsRegion||'us-central1');
  const isPreviewHost=()=>/--/.test(String(location&&location.hostname||''));
  const functionName=()=>isPreviewHost()?'orbit360CobrosReconciliationCommandPreview':(text(backend().functionNames&&backend().functionNames.reconciliation)||'orbit360CobrosReconciliationCommand');
  const activeRole=()=>{try{return text(Orbit.session&&Orbit.session.rol&&Orbit.session.rol());}catch(e){return'';}};
  const productContextReady=()=>{try{
    const b=backend(),mode=text(b.mode).toLowerCase(),ctx=window.Orbit&&Orbit.productTenantRuntimeContextP0&&typeof Orbit.productTenantRuntimeContextP0.status==='function'?Orbit.productTenantRuntimeContextP0.status():null;
    return (mode==='product'||mode==='product-readonly')&&text(b.tenantSource).toLowerCase()==='membership'&&!!(ctx&&ctx.ready===true&&text(ctx.tenantId)&&text(ctx.tenantId)===tenantId());
  }catch(e){return false;}};
  const enabled=()=>productContextReady()||!!((backend().featureFlags||{}).cobrosReconciliationDomainActive===true);
  const available=()=>{const p=provider();return!!(enabled()&&tenantId()&&activeRole()&&p&&typeof p.callFunction==='function');};
  function stable(value){if(value==null)return value;if(Array.isArray(value))return value.map(stable);if(typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));return value;}
  function makeRequestId(operation,payload){const marker=[VERSION,tenantId(),operation,JSON.stringify(stable(payload||{}))].join('|');let hash=2166136261;for(let i=0;i<marker.length;i+=1){hash^=marker.charCodeAt(i);hash=Math.imul(hash,16777619);}return'recui_'+(hash>>>0).toString(16);}
  function documentProvider(){return window.Orbit&&Orbit.productDriveDocumentProviderP0;}
  function stagedDocumentRefs(payload){
    const dp=documentProvider(); if(!dp||typeof dp.pendingDocument!=='function')return[];
    return [payload&&payload.paymentSupportDocumentRef,payload&&payload.invoiceDocumentRef]
      .map(text).filter(Boolean).filter((ref,i,arr)=>arr.indexOf(ref)===i&&dp.pendingDocument(ref));
  }
  async function settleStagedDocuments(payload,action){
    const dp=documentProvider(),refs=stagedDocumentRefs(payload);
    if(!refs.length||!dp||typeof dp[action]!=='function')return{ok:true,action,refs:[],results:[]};
    const results=[];
    for(const ref of refs){try{results.push(await dp[action](ref));}catch(error){results.push({ok:false,status:action+'_failed',code:text(error&&(error.code||error.message))});}}
    return{ok:results.every(x=>x&&x.ok===true),action,refs,results};
  }
  async function command(operation,options){
    options=options||{};
    if(!available())throw new Error('COBROS_RECONCILIATION_BACKEND_NOT_ACTIVE');
    const payload=options.payload||{},requestId=text(options.requestId||makeRequestId(operation,payload)),fn=functionName();
    try{
      const out=await provider().callFunction(fn,{tenantId:tenantId(),activeRole:activeRole(),operation,payload,reason:text(options.reason||options.motivo||'Acción de conciliación desde Gravicentra Insurance'),requestId},region());
      const docs=await settleStagedDocuments(payload,'finalize');
      return Object.assign({requestId,documentLifecycleOk:docs.ok,documentLifecycle:docs},out||{});
    }catch(error){
      const docs=await settleStagedDocuments(payload,'quarantine');
      try{error.gravicentraPayment={operation,requestId,functionName:fn,region:region(),documentLifecycle:docs};}catch(_){ }
      throw error;
    }
  }
  function previewPolicy(polizaId){return command('preview_policy',{payload:{polizaId},reason:'Vista previa inferencial sin aplicar pagos'});}
  function applyPayment(receiptId,options){options=options||{};const payload=Object.assign({receiptId},options.payload||{});return command('apply_payment',{payload,reason:options.reason||options.motivo||'Aplicación canónica de pago',requestId:options.requestId});}
  function reportClientPayment(receiptId,options){options=options||{};return applyPayment(receiptId,{payload:Object.assign({},options.payload||{},{sourceType:'client_reported'}),reason:options.reason||'Pago reportado por cliente'});}
  function reportAdvisorPayment(receiptId,options){options=options||{};const payload=Object.assign({receiptId},options.payload||{});return command('report_advisor_payment',{payload,reason:options.reason||options.motivo||'Pago reportado por asesor'});}
  function reconcilePayment(receiptId,options){options=options||{};const payload=Object.assign({receiptId,forceReconciliation:true},options.payload||{});return command('reconcile_payment',{payload,reason:options.reason||options.motivo||'Conciliación individual de pago',requestId:options.requestId});}
  function reconcileEvidence(policyId,evidence,options){options=options||{};const payload=Object.assign({policyId},evidence||{},options.payload||{});return command('reconcile_evidence',{payload,reason:options.reason||options.motivo||'Conciliación inferencial de evidencia',requestId:options.requestId});}
  function enrichApplication(receiptId,options){options=options||{};return applyPayment(receiptId,{payload:Object.assign({},options.payload||{},{sourceType:options.sourceType||'insurer_invoice'}),reason:options.reason||'Aplicación de aseguradora'});}
  function confirmProposal(proposalId,options){options=options||{};return command('confirm_application',{payload:Object.assign({proposalId},options.payload||{}),reason:options.reason||options.motivo||'Conciliación confirmada por usuario autorizado'});}
  function holdProposal(proposalId,motivo,accionRequerida){return command('hold_proposal',{payload:{proposalId,accionRequerida},reason:motivo});}
  function status(){return Object.freeze({version:VERSION,functionName:functionName(),tenantId:tenantId(),activeRole:activeRole(),region:region(),productContextReady:productContextReady(),enabled:enabled(),available:available(),transport:'firebase-functions-modular'});}
  Orbit.reconciliationDomain=Object.freeze({VERSION,enabled,available,classifyPaymentOrigin,command,previewPolicy,applyPayment,reportClientPayment,reportAdvisorPayment,reconcilePayment,reconcileEvidence,enrichApplication,confirmProposal,holdProposal,status});
})();
