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
  function previewProposalApplication(proposalId,sourceRunId){return command('preview_proposal_application',{payload:{proposalId,sourceRunId},reason:'Verificación de fuente y recibo sin escrituras'});}
  function resolveProposalApplication(proposalId,sourceRunId,binding){binding=binding||{};return command('resolve_proposal_application',{
    payload:{proposalId,sourceRunId,policyId:binding.policyId,receiptId:binding.receiptId,evidenceType:binding.evidenceType,
      evidenceAsOfDate:binding.evidenceAsOfDate,paidDate:binding.paidDate||'',sourceAttestation:binding.sourceAttestation===true},
    reason:binding.reason||'Vinculación expresa de fuente y recibo por usuario autorizado; sin aplicar pagos'});}
  function applyProposalApplication(proposalId,sourceRunId,planDigest){return command('apply_proposal_application',{payload:{proposalId,sourceRunId,planDigest},reason:'Aprobación y aplicación de conciliación con evidencia server-side'});}
  function holdProposal(proposalId,motivo,accionRequerida){return command('hold_proposal',{payload:{proposalId,accionRequerida},reason:motivo});}
  const SOURCE_INTAKE_SCHEMA='gi-cobros-source-intake-v2';
  const SOURCE_INTAKE_TYPES=Object.freeze(['INSURER_STATEMENT_PENDING_FROM_N','COMMISSION_STATEMENT_INSTALLMENT_N','INVOICE_INSTALLMENT_N','BANK_STATEMENT_MATCH']);
  const intakeInFlight=new Map();
  function sourceDocumentRef(value){
    const raw=text(value),id='[A-Za-z0-9_-]{10,180}';
    if(new RegExp('^(?:(?:g?drive):)?'+id+'$').test(raw))return raw;
    try{const u=new URL(raw);if(u.protocol!=='https:'||u.hostname!=='drive.google.com'||u.username||u.password||u.port||u.hash)return'';
      if(new RegExp('^/file/d/'+id+'/view$').test(u.pathname)&&Array.from(u.searchParams.keys()).every(k=>k==='usp'))return u.origin+u.pathname;
      if(u.pathname==='/open'&&new RegExp('^'+id+'$').test(u.searchParams.get('id')||'')&&Array.from(u.searchParams.keys()).every(k=>k==='id'))return raw;
    }catch(e){}return'';
  }
  function sourceIntakePayload(input){
    if(!input||input.schemaVersion!==SOURCE_INTAKE_SCHEMA||input.sourceAttestation!==true)throw new Error('SOURCE_INTAKE_ATTESTATION_REQUIRED');
    const source=input.source||{},rows=input.rows;
    if(!/^[a-f0-9]{64}$/.test(source.sha256||'')||!text(source.sourceId)||!sourceDocumentRef(source.documentRef)||!text(source.fileName)||!text(source.insurerId))throw new Error('SOURCE_INTAKE_ORIGINAL_DOCUMENT_REQUIRED');
    if(!SOURCE_INTAKE_TYPES.includes(source.evidenceType)||!['GT','CO'].includes(source.country)||!['GTQ','COP','USD'].includes(source.currency)||source.country==='GT'&&source.currency==='COP'||source.country==='CO'&&source.currency==='GTQ')throw new Error('SOURCE_INTAKE_SOURCE_SCOPE_REQUIRED');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(source.evidenceAsOfDate||'')||Number.isNaN(Date.parse(source.evidenceAsOfDate+'T00:00:00Z'))||new Date(source.evidenceAsOfDate+'T00:00:00Z').toISOString().slice(0,10)!==source.evidenceAsOfDate)throw new Error('SOURCE_INTAKE_CUTOFF_REQUIRED');
    if(!Array.isArray(rows)||!rows.length||rows.length>100)throw new Error('SOURCE_INTAKE_BATCH_ROWS_OUT_OF_BOUNDS');
    if(source.evidenceType==='INSURER_STATEMENT_PENDING_FROM_N'&&source.completePolicyGroups!==true)throw new Error('SOURCE_INTAKE_COMPLETE_POLICY_GROUPS_REQUIRED');
    const seen=new Set();for(const row of rows){if(!row||!text(row.rowId)||seen.has(row.rowId)||!text(row.policyNumber))throw new Error('SOURCE_INTAKE_ROW_IDENTITY_REQUIRED');seen.add(row.rowId);
      if(row.paidDate&&row.actualPaidDateEvidence!==true)throw new Error('SOURCE_INTAKE_ACTUAL_PAID_DATE_EVIDENCE_REQUIRED');
      if(source.evidenceType==='INSURER_STATEMENT_PENDING_FROM_N'&&(row.paidDate||row.actualPaidDateEvidence||row.paymentConfirmed))throw new Error('SOURCE_INTAKE_PENDING_IS_NOT_PAYMENT');
      if(row.explicitInstallmentException===true&&!sourceDocumentRef(row.installmentExceptionReference)||row.explicitInstallmentException!==true&&row.installmentExceptionReference)throw new Error('SOURCE_INTAKE_INSTALLMENT_EXCEPTION_REFERENCE_REQUIRED');
      if(row.amount!=null&&(!Number.isFinite(row.amount)||row.amount<0||row.amount>1000000000||Math.abs(row.amount*100-Math.round(row.amount*100))>1e-6))throw new Error('SOURCE_INTAKE_AMOUNT_INVALID');
    }
    const copy=JSON.parse(JSON.stringify(input));copy.source.documentRef=sourceDocumentRef(source.documentRef);return copy;
  }
  function validateSourceIntakeReadback(payload,out){
    if(!out||out.ok!==true||!['SOURCE_RUN_STORED','SOURCE_RUN_REUSED'].includes(out.status)||out.readbackConfirmed!==true||out.financialWrites!==0||out.sourceSha256!==payload.source.sha256||!/^[a-f0-9]{64}$/.test(out.sourceDigest||''))throw new Error('SOURCE_INTAKE_DURABLE_READBACK_REQUIRED');
    if(out.submittedRows!==payload.rows.length||!Number.isSafeInteger(out.intakeWrites)||out.intakeWrites<0||out.status==='SOURCE_RUN_REUSED'&&out.intakeWrites!==0)throw new Error('SOURCE_INTAKE_READBACK_COUNT_MISMATCH');
    const counts=out.counts||{};for(const k of ['sourceRows','proposals','holds','supportingRows','duplicates'])if(!Number.isSafeInteger(counts[k])||counts[k]<0||counts[k]>payload.rows.length)throw new Error('SOURCE_INTAKE_READBACK_COUNT_MISMATCH');
    if(counts.sourceRows+counts.duplicates!==payload.rows.length||counts.proposals+counts.supportingRows!==counts.sourceRows||counts.holds>counts.proposals)throw new Error('SOURCE_INTAKE_READBACK_COUNT_MISMATCH');
    if(!text(out.sourceRunId)&&!(out.sourceRunId===null&&out.status==='SOURCE_RUN_REUSED'&&counts.duplicates===payload.rows.length&&Array.isArray(out.reusedRunIds)&&out.reusedRunIds.length&&out.reusedRunIds.every(id=>text(id))))throw new Error('SOURCE_INTAKE_DURABLE_READBACK_REQUIRED');
    if(!Array.isArray(out.proposalIds)||out.proposalIds.length!==counts.proposals||out.proposalIds.some(id=>!text(id))||new Set(out.proposalIds).size!==out.proposalIds.length)throw new Error('SOURCE_INTAKE_READBACK_PROPOSALS_MISMATCH');
    return out;
  }
  async function intakeSourceRun(input,options){
    const payload=sourceIntakePayload(input);options=options||{};
    if(!available())throw new Error('COBROS_RECONCILIATION_BACKEND_NOT_ACTIVE');
    const actor={tenantId:tenantId(),activeRole:activeRole()},marker=JSON.stringify(stable({tenantId:actor.tenantId,activeRole:actor.activeRole,payload}));
    if(intakeInFlight.has(marker))return intakeInFlight.get(marker);
    const work=(async()=>{
      if(!window.crypto||!window.crypto.subtle||typeof TextEncoder!=='function')throw new Error('SOURCE_INTAKE_HASH_UNAVAILABLE');
      const bytes=await window.crypto.subtle.digest('SHA-256',new TextEncoder().encode(marker));
      const digest=Array.from(new Uint8Array(bytes)).map(n=>n.toString(16).padStart(2,'0')).join('');
      if(actor.tenantId!==tenantId()||actor.activeRole!==activeRole())throw new Error('SOURCE_INTAKE_SESSION_CHANGED');
      const out=await command('intake_source_run',{payload,requestId:'srcui_'+digest,reason:options.reason||'Ingreso documental confirmado: solo fuentes y propuestas, sin aplicar pagos'});
      return validateSourceIntakeReadback(payload,out);
    })();
    intakeInFlight.set(marker,work);
    try{return await work;}finally{if(intakeInFlight.get(marker)===work)intakeInFlight.delete(marker);}
  }
  function status(){return Object.freeze({version:VERSION,functionName:functionName(),tenantId:tenantId(),activeRole:activeRole(),region:region(),productContextReady:productContextReady(),enabled:enabled(),available:available(),transport:'firebase-functions-modular'});}
  Orbit.reconciliationDomain=Object.freeze({VERSION,enabled,available,classifyPaymentOrigin,command,previewPolicy,previewProposalApplication,resolveProposalApplication,applyProposalApplication,applyPayment,reportClientPayment,reportAdvisorPayment,reconcilePayment,reconcileEvidence,enrichApplication,confirmProposal,holdProposal,SOURCE_INTAKE_SCHEMA,SOURCE_INTAKE_TYPES,sourceDocumentRef,sourceIntakePayload,validateSourceIntakeReadback,intakeSourceRun,status});
})();
