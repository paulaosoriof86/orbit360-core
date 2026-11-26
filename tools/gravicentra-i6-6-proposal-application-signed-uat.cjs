'use strict';
// Signed, reversible UAT in the existing Firebase project. No active production
// ledger pointer, real customer, real membership, rule or IAM change is allowed.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {digest,applicationIdFor}=require('../functions/proposal-application-boundary');
const sourceIntake=require('../functions/cobros-source-intake-v2');
const {acceptDirectionPreviewLegal,assertDirectionLiveLegalAuthority,acceptDirectionLiveLegal}=require('./gravicentra-i6-6-direction-preview-legal-acceptance.cjs');
const {REASONS,CALLABLE_CODES,UI_CAUSAL_FIELDS,safeCode,safeStage,projectCallableResult,safeCallableDiagnostic,ownedUiRequest,projectUiResponse,projectUiObservationFailure,observeUiApplication,validateUiApplicationEvidence,safeUiApplicationEvidence,failureDetails,safePrerequisites,diagnoseProposalPrerequisites,safeSourceIntakeEvidence,recordSourceIntakePageError}=require('./gravicentra-i6-6-proposal-uat-diagnostics.cjs');
const TENANT='alianzas-soluciones',PROJECT='ays-orbit-360-lab';
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
function validateEnvironment(env){
 const phase=env.I66_SIGNED_TEST_LIVE==='true'?'LIVE':'PREVIEW';
 const origin=String(env.I66_PREVIEW_ORIGIN||'');
 assert.ok(phase==='LIVE'?origin==='https://app.aysseguros.com':/^https:\/\/ays-orbit-360-lab--gi-i66-rc-\d+-[a-z0-9]+\.web\.app$/.test(origin),'I66_PROPOSAL_AUTHORIZED_ORIGIN_REQUIRED');
 assert.match(String(env.I66_SOURCE_SHA||''),/^[a-f0-9]{40}$/,'I66_PROPOSAL_SOURCE_SHA_REQUIRED');
 assert.ok(env.I66_PACKAGE_ROOT&&path.isAbsolute(env.I66_PACKAGE_ROOT),'I66_PROPOSAL_PACKAGE_ROOT_REQUIRED');
 return{phase,origin,sourceSha:env.I66_SOURCE_SHA,packageRoot:env.I66_PACKAGE_ROOT};
}
function owned(row,runId){return !!row&&row.__syntheticQa===true&&row.qaRunId===runId;}
function makeStage(kind,id,tenant,runId,source,hashes){
 const original={...source,documentId:id,tenantId:tenant,__syntheticQa:true,qaRunId:runId};
 return {...original,documentClass:kind,runId,activationState:'STAGED',...hashes,payloadDigest:digest(original)};
}
function sourceIntakeFixture(nonce,insurerId,actorUid){
 assert.match(nonce,/^[a-z0-9_]{12,80}(?![\s\S])/,'I66_INTAKE_SYNTHETIC_NONCE_REQUIRED');
 const prefix='b3005qa_i66_intake_'+nonce,ids={client:prefix+'_client',policy:prefix+'_policy',receipt:prefix+'_receipt',portfolio:prefix+'_portfolio'};
 const policyNumber='QA-INTAKE-'+nonce.toUpperCase(),receiptNumber='QA-RECEIPT-'+nonce,amount=29.47;
 const data={policyNumber,policyId:ids.policy,receiptId:ids.receipt,receiptNumber,installment:1,totalInstallments:1,amount,paidDate:'2026-11-12',actualPaidDateEvidence:true,paymentConfirmed:true,
  invoiceNumber:'QA-INVOICE-'+nonce,invoiceDate:'2026-11-13',applicationDate:'2026-11-14',policyStartDate:'2026-01-01',policyEndDate:'2027-01-01',paymentMethod:'transferencia'};
 const header=Object.keys(data),csv=header.join(',')+'\n'+header.map(k=>String(data[k])).join(',')+'\n',bytes=Buffer.from(csv,'utf8'),sha256=hash(bytes);
 const source={sourceId:prefix,documentRef:'drive:qa_source_document_'+nonce,fileName:'i66-synthetic-source-'+nonce+'.csv',sha256,evidenceAsOfDate:'2026-11-15',country:'GT',currency:'GTQ',evidenceType:'BANK_STATEMENT_MATCH',insurerId};
 const row={...data,sheet:'CSV',rowNumber:2,rowId:'row_'+hash([sha256,'','CSV',2].join('|')).slice(0,40)};
 const payload={schemaVersion:'gi-cobros-source-intake-v2',source,sourceAttestation:true,rows:[row]},input=sourceIntake.prepareInput(TENANT,payload);
 const qaRunId='cobledgerqa_'+input.batchDigest.slice(0,28),mark={tenantId:TENANT,__syntheticQa:true,qaRunId};
 const permission={...mark,intakePermission:{schemaVersion:'gi-cobros-source-intake-qa-permission-v1',tenantId:TENANT,qaRunId,actorUid,sourceId:source.sourceId,sourceSha256:sha256,batchDigest:input.batchDigest,authorized:true}};
 const policy={id:ids.policy,...mark,clienteId:ids.client,aseguradoraId:insurerId,numero:policyNumber,pais:'GT',moneda:'GTQ',estado:'Vigente',vigenciaDesde:'2026-01-01',vigenciaHasta:'2027-01-01'};
 const receipt={id:ids.receipt,...mark,polizaId:ids.policy,clienteId:ids.client,numeroReciboFuente:receiptNumber,pais:'GT',moneda:'GTQ',monto:amount,cuota:'1/1',vence:'2026-11-01',estado:'Pendiente'};
 const portfolio={id:ids.portfolio,...mark,polizaId:ids.policy,clienteId:ids.client,reciboId:ids.receipt,pais:'GT',moneda:'GTQ',monto:amount,estado:'Pendiente',carteraActiva:true};
 return{payload,input,qaRunId,mark,permission,ids,policy,receipt,portfolio,bytes,cobroId:'cob_'+hash(TENANT+'|receipt|'+ids.receipt).slice(0,28)};
}
function intakeUiRequest(request,fixture,cfg){
 const name=cfg.phase==='PREVIEW'?'orbit360CobrosReconciliationCommandPreview':'orbit360CobrosReconciliationCommand';let body;
 try{body=request.postDataJSON();}catch{return false;}
 return request.method()==='POST'&&request.url()==='https://us-central1-'+PROJECT+'.cloudfunctions.net/'+name&&body?.data?.operation==='intake_source_run'&&
  body.data.tenantId===TENANT&&norm(body.data.activeRole)==='direccion'&&digest(body.data.payload)===digest(fixture.payload);
}
const DOCUMENTARY_PAYMENT_QA_PROFILE='I66_R51_DOCUMENTARY_PAYMENT_UI_SIGNED_QA_V1';
const DOCUMENTARY_PAYMENT_QA_RECEIPT='artifacts/orbit360-recovery/release-control/I6_6_R51_DOCUMENTARY_PAYMENT_FINANCIAL_RECOVERY_SOURCE_20261124.json';
const DOCUMENTARY_PAYMENT_QA_SUCCESSOR_RECEIPT='artifacts/orbit360-recovery/release-control/I6_6_R51_ASSIGNED_ROLES_INSURER_FINANCIAL_RECOVERY_SOURCE_20261124.json';
const DOCUMENTARY_PAYMENT_SOURCES=Object.freeze(['commission_statement','insurer_statement']);
function validateDocumentaryPaymentQaBinding(binding){
 assert.deepEqual(Object.keys(binding||{}).sort(),['profile','receiptBlob','receiptPath'],'I66_DOCUMENTARY_QA_BINDING_REQUIRED');
 assert.equal(binding.profile,DOCUMENTARY_PAYMENT_QA_PROFILE);
 assert.ok([DOCUMENTARY_PAYMENT_QA_RECEIPT,DOCUMENTARY_PAYMENT_QA_SUCCESSOR_RECEIPT].includes(binding.receiptPath),'I66_DOCUMENTARY_QA_EXACT_RECEIPT_REQUIRED');
 assert.match(binding.receiptBlob||'',/^[a-f0-9]{40}$/,'I66_DOCUMENTARY_QA_RECEIPT_PIN_REQUIRED');return binding;
}
function documentaryPaymentFixture(nonce,sourceType){
 assert.match(nonce,/^[a-z0-9_]{12,60}$/,'I66_DOCUMENTARY_QA_NONCE_REQUIRED');
 assert.ok(DOCUMENTARY_PAYMENT_SOURCES.includes(sourceType),'I66_DOCUMENTARY_QA_SOURCE_DENIED');
 const key='b3004qa_i66_doc_'+(sourceType==='commission_statement'?'commission':'insurer')+'_'+nonce;
 const ids={client:key+'_client',policy:key+'_policy',receipt:key+'_receipt',portfolio:key+'_portfolio'};
 const requestId=key+'_request',eventId='payevt_'+hash(TENANT+'|'+ids.receipt+'|'+requestId).slice(0,28);
 const cobroId='cob_'+hash(TENANT+'|receipt|'+ids.receipt).slice(0,28),qaRunId=key+'_run';
 const mark={tenantId:TENANT,__syntheticQa:true,qaRunId},amount=sourceType==='commission_statement'?173.23:67.89;
 const paidDate=sourceType==='commission_statement'?'2026-11-12':'2026-11-13',sourceRef='drive:qa_documentary_original_'+nonce+'_'+(sourceType==='commission_statement'?'c':'i');
 const payload={receiptId:ids.receipt,sourceType,amount,paidDate,actualPaidDateEvidence:true,evidenceId:key+'_evidence',sourceRef,
  evidenceType:sourceType==='commission_statement'?'COMMISSION_STATEMENT_INSTALLMENT_N':'INSURER_CONFIRMED_PAID_STATEMENT',
  evidenceAsOfDate:'2026-11-15',paymentSupportDocumentRef:sourceRef};
 const ghost='b3004qa_no_real_advisor';
 const seed={
  client:{id:ids.client,...mark,pais:'GT',asesorId:ghost,nombre:'I6.6 pago documental sintético, sin destinatario real'},
  policy:{id:ids.policy,...mark,clienteId:ids.client,asesorId:ghost,pais:'GT',moneda:'GTQ',estado:'Vigente',numero:'QA-DOC-'+nonce,
   vigenciaDesde:'2026-01-01',vigenciaHasta:'2027-01-01'},
  receipt:{id:ids.receipt,...mark,polizaId:ids.policy,clienteId:ids.client,asesorId:ghost,pais:'GT',moneda:'GTQ',monto:amount,primaTotal:amount,
   estado:'Pendiente',cuota:'1/1',vence:'2026-11-01'},
  portfolio:{id:ids.portfolio,...mark,polizaId:ids.policy,clienteId:ids.client,reciboId:ids.receipt,asesorId:ghost,pais:'GT',moneda:'GTQ',
   monto:amount,primaTotal:amount,estado:'Pendiente',carteraActiva:true}
 };
 return{ids,requestId,eventId,cobroId,qaRunId,payload,seed};
}
function documentaryPaymentRequest(request,fixture,cfg){
 let body;try{body=request.postDataJSON();}catch{return false;}
 const endpoint='https://us-central1-'+PROJECT+'.cloudfunctions.net/orbit360CobrosReconciliationCommand'+(cfg.phase==='PREVIEW'?'Preview':'');
 return request.method()==='POST'&&request.url()===endpoint&&body?.data?.tenantId===TENANT&&norm(body.data.activeRole)==='direccion'&&
  body.data.operation==='apply_payment'&&body.data.requestId===fixture.requestId&&digest(body.data.payload)===digest(fixture.payload);
}
function assertDocumentaryPaymentOwned(kind,row,fixture,actor){
 const {ids,seed,payload}=fixture;
 assert.ok(row&&typeof row==='object','I66_DOCUMENTARY_QA_RESTORE_ROW_REQUIRED');
 if(kind==='request'){
  assert.equal(row.status,'committed');assert.equal(row.operation,'apply_payment');assert.equal(row.eventId,fixture.eventId);
  for(const [field,value] of Object.entries({receiptId:ids.receipt,cobroId:fixture.cobroId,policyId:ids.policy,clientId:ids.client,amount:payload.amount}))assert.equal(row.result?.[field],value,'I66_DOCUMENTARY_QA_REQUEST_OWNERSHIP');
  return;
 }
 if(kind==='event'){
  assert.equal(row.tenantId,TENANT);assert.equal(row.eventId,fixture.eventId);assert.equal(row.requestId,fixture.requestId);
  assert.equal(row.operation,'apply_payment');assert.equal(row.receiptId,ids.receipt);assert.equal(row.cobroId,fixture.cobroId);
  assert.equal(row.actor?.uid,actor.uid,'I66_DOCUMENTARY_QA_EVENT_ACTOR');return;
 }
 assert.equal(row.tenantId,TENANT);assert.equal(row.pais,'GT');
 if(kind==='client'||kind==='policy'){assert.deepEqual(row,seed[kind],'I66_DOCUMENTARY_QA_PARENT_CHANGED');return;}
 assert.equal(row.id,kind==='cobro'?fixture.cobroId:ids[kind]);assert.equal(row.polizaId,ids.policy);assert.equal(row.clienteId,ids.client);
 assert.equal(row.moneda,'GTQ');assert.equal(row.monto,payload.amount,'I66_DOCUMENTARY_QA_AMOUNT_CHANGED');
 if(kind==='cobro'){
  assert.equal(row.reciboId,ids.receipt);assert.equal(row.updatedByUid,actor.uid);assert.equal(row.paymentState,'PAID_DIRECT');
  assert.equal(row.applicationState,'APPLIED_DIRECT');assert.equal(row.sourceRef,payload.sourceRef);assert.equal(row.evidenceId,payload.evidenceId);
 }else{
  assert.equal(row.__syntheticQa,true);assert.equal(row.qaRunId,fixture.qaRunId);
  if(kind==='portfolio')assert.equal(row.reciboId,ids.receipt);
 }
}
function assertDocumentaryPaymentReadback(rows,fixture,actor){
 for(const [kind,row] of Object.entries(rows))assertDocumentaryPaymentOwned(kind,row,fixture,actor);
 for(const kind of ['receipt','portfolio','cobro']){
  const row=rows[kind];
  assert.equal(row.estado,'Pagado');assert.equal(row.paymentState,'PAID_DIRECT');assert.equal(row.applicationState,'APPLIED_DIRECT');
  assert.equal(row.paidDate||row.fechaPago,fixture.payload.paidDate);
  if(kind!=='portfolio'){
   assert.equal(row.evidenceId,fixture.payload.evidenceId);assert.equal(row.evidenceType,fixture.payload.evidenceType);assert.equal(row.sourceRef,fixture.payload.sourceRef);
   assert.equal(row.paymentSupportDocumentRef,fixture.payload.sourceRef);assert.equal(row.directOrInferred,'DIRECT');
  }
  for(const field of ['applicationDate','invoiceDate','invoiceNumber','paymentMethod'])assert.ok(row[field]===undefined||row[field]==='','I66_DOCUMENTARY_QA_OPTIONAL_FACT_INVENTED');
 }
 assert.equal(rows.request.payloadDigest,rows.event.payloadDigest);assert.equal(digest(rows.request.result),rows.event.resultDigest);
}
function validateDocumentaryPaymentUiEvidence(proof,{phase,sourceSha,buildId,binding}){
 validateDocumentaryPaymentQaBinding(binding);
 assert.deepEqual(Object.keys(proof||{}).sort(),['artifactBytesExact','authOrMembershipMutations','binding','buildId','cases','cleanup','externalMessages','phase','profile','realCustomerWrites','realFinancialWrites','role','sourceSha','status'].sort(),'I66_DOCUMENTARY_QA_PROOF_SHAPE');
 assert.equal(proof.profile,DOCUMENTARY_PAYMENT_QA_PROFILE);assert.equal(proof.status,'PASS');assert.equal(proof.phase,phase);
 assert.equal(proof.sourceSha,sourceSha);assert.equal(proof.buildId,buildId);assert.deepEqual(proof.binding,binding);assert.equal(proof.role,'direccion');
 assert.equal(proof.artifactBytesExact,true);
 for(const field of ['realCustomerWrites','realFinancialWrites','externalMessages','authOrMembershipMutations'])assert.equal(proof[field],0);
 assert.deepEqual(proof.cleanup,{status:'PASS',remaining:0,removedOwnedTargets:14});
 assert.deepEqual(proof.cases.map(c=>c.sourceType),DOCUMENTARY_PAYMENT_SOURCES);
 for(const row of proof.cases){
  assert.deepEqual(Object.keys(row).sort(),['beforeDigest','afterDigest','sourceType','normalUiRequest','normalUiResponse','signedActorPreserved','amountDateSourcePreserved',
   'readbackAfterReload','canonicalSameRequestReplay','replayDataAndUpdateTimesUnchanged','replayAdditionalPayments','paymentsAfter','noticeDisabled','beforePaymentAbsent','receiptPortfolioCobroExact'].sort());
  for(const field of ['beforeDigest','afterDigest'])assert.match(row[field],/^[a-f0-9]{64}$/);
  assert.notEqual(row.beforeDigest,row.afterDigest);
  for(const field of ['normalUiRequest','normalUiResponse','signedActorPreserved','amountDateSourcePreserved','readbackAfterReload','canonicalSameRequestReplay',
   'replayDataAndUpdateTimesUnchanged','noticeDisabled','beforePaymentAbsent','receiptPortfolioCobroExact'])assert.equal(row[field],true,'I66_DOCUMENTARY_QA_MISSING_'+field);
  assert.equal(row.replayAdditionalPayments,0);assert.equal(row.paymentsAfter,1);
 }
 return{profile:DOCUMENTARY_PAYMENT_QA_PROFILE,status:'PASS',phase,sourceSha,buildId,receiptBlob:binding.receiptBlob,
  sources:[...DOCUMENTARY_PAYMENT_SOURCES],cases:2,syntheticPayments:2,replayAdditionalPayments:0,realFinancialWrites:0,remaining:0,
  proofDigest:'sha256:'+digest(proof)};
}
async function exerciseDocumentaryPayments({page,actor,cfg,tenant,item,nonce,binding,buildId},io={}){
 validateDocumentaryPaymentQaBinding(binding);assert.equal(actor.role,'direccion');assert.ok(actor.uid);
 const proof={profile:DOCUMENTARY_PAYMENT_QA_PROFILE,status:'HOLD',phase:cfg.phase,sourceSha:cfg.sourceSha,buildId,binding,role:'direccion',
  artifactBytesExact:false,realCustomerWrites:0,realFinancialWrites:0,externalMessages:0,authOrMembershipMutations:0,cases:[],cleanup:{status:'HOLD',remaining:null,removedOwnedTargets:0}};
 const readFile=io.readFileSync||fs.readFileSync,fetcher=io.fetch||fetch;
 const legalReadiness=io.requireExistingLegalReadiness||require('./gravicentra-i6-6-carlos-paula-live-direct-renewal-synthetic-uat.cjs').requireExistingLegalReadiness;
 assert.equal(typeof legalReadiness,'function','I66_DOCUMENTARY_QA_LEGAL_READINESS_OWNER_REQUIRED');
 const bytes=readFile(path.join(cfg.packageRoot,'bundle/site/modules/cobros.js'));
 const served=await fetcher(cfg.origin+'/modules/cobros.js',{redirect:'error',headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(30000)});
 assert.equal(served.status,200);assert.equal(hash(Buffer.from(await served.arrayBuffer())),hash(bytes),'I66_DOCUMENTARY_QA_UI_ARTIFACT_DRIFT');proof.artifactBytesExact=true;
 const targets=[];let failure=null,writerSettled=true,pageClosed=false;
 const readSet=async refs=>Object.fromEntries(await Promise.all(Object.entries(refs).map(async([kind,ref])=>{
  const s=await ref.get();if(s.exists)assert.ok(Number.isSafeInteger(s.updateTime?.seconds)&&Number.isSafeInteger(s.updateTime?.nanoseconds),'I66_DOCUMENTARY_QA_EXACT_VERSION_REQUIRED');
  return[kind,{exists:s.exists,data:s.exists?s.data():null,updateTime:s.exists?String(s.updateTime.seconds)+':'+String(s.updateTime.nanoseconds):null}];
 })));
 const dataOf=s=>Object.fromEntries(Object.entries(s).map(([k,v])=>[k,v.data]));
 try{
  for(const sourceType of DOCUMENTARY_PAYMENT_SOURCES){
   const fixture=documentaryPaymentFixture(nonce,sourceType),{ids}=fixture;
   const refs={client:item('clientes',ids.client),policy:item('polizas',ids.policy),receipt:item('recibosEsperados',ids.receipt),portfolio:item('carteraPrimas',ids.portfolio),
    cobro:item('cobros',fixture.cobroId),request:tenant.collection(cfg.phase==='PREVIEW'?'previewReconciliationRequests':'reconciliationRequests').doc(fixture.requestId),
    event:tenant.collection(cfg.phase==='PREVIEW'?'previewReconciliationEvents':'reconciliationEvents').doc(fixture.eventId)};
   for(const ref of Object.values(refs))assert.equal((await ref.get()).exists,false,'I66_DOCUMENTARY_QA_COLLISION');
   for(const field of ['reciboId','receiptId'])assert.equal((await item('cobros','_').parent.where(field,'==',ids.receipt).limit(2).get()).size,0,'I66_DOCUMENTARY_QA_PAYMENT_PREEXISTED');
   for(const [kind,ref] of Object.entries(refs))targets.push({kind,ref,fixture});
   for(const [kind,row] of Object.entries(fixture.seed))await refs[kind].create(row);
   const before=await readSet(refs);assert.equal(before.cobro.exists,false);assert.equal(before.request.exists,false);assert.equal(before.event.exists,false);
   await page.goto(cfg.origin+'/#/cobros',{waitUntil:'commit',timeout:30000});
   await page.waitForFunction(()=>!!window.Orbit?.productAppP0&&!!window.Orbit?.reconciliationDomain&&!!window.Orbit?.modules?.cobros,null,{timeout:30000});
   const signed=await page.evaluate(async()=>{
    const p=Orbit.productRuntimeBrowserProvidersP0;await p.initialize();const user=await p.waitForUser();const active=await Orbit.productAppP0.activate();
    await Orbit.store._ensureCollections(['clientes','polizas','recibosEsperados','carteraPrimas','cobros']);
    return{uid:user?.uid,role:Orbit.session.rol(),started:active?.started===true,endpoint:Orbit.reconciliationDomain.status()?.functionName};
   });
   assert.equal(signed.uid,actor.uid);assert.equal(norm(signed.role),'direccion');assert.equal(signed.started,true);
   assert.equal(signed.endpoint,'orbit360CobrosReconciliationCommand'+(cfg.phase==='PREVIEW'?'Preview':''));
   await legalReadiness(page);
   await page.waitForFunction(x=>['clientes','polizas','recibosEsperados','carteraPrimas'].every((c,i)=>!!Orbit.store.get(c,x[i])),[ids.client,ids.policy,ids.receipt,ids.portfolio],{timeout:30000});
   // Public modal entry; the actual mutation is exclusively the normal form button.
   await page.evaluate(id=>Orbit.modules.cobros.aplicarPago(id),ids.receipt);
   const form=page.locator('#cob-pay');await form.waitFor({state:'visible',timeout:10000});
   await form.locator('#pm-source').selectOption(sourceType);
   assert.equal(await form.locator('#pm-avisar').isChecked(),false);assert.equal(await form.locator('#pm-avisar').isDisabled(),true);
   assert.equal(await form.locator('#pm-support-btn').isDisabled(),true);
   await form.locator('#pm-source-ref').fill(fixture.payload.sourceRef);await form.locator('#pm-source-asof').fill(fixture.payload.evidenceAsOfDate);
   await form.locator('details summary').click();await form.locator('#pm-evidence-id').fill(fixture.payload.evidenceId);await form.locator('#pm-request-id').fill(fixture.requestId);
   await form.locator('#pm-paid').fill(fixture.payload.paidDate);await form.locator('#pm-source-reviewed').check();
   for(const selector of ['#pm-app','#pm-invoice-date','#pm-invoice-number','#pm-metodo'])assert.equal(await form.locator(selector).inputValue(),'');
   const waiting=page.waitForResponse(r=>documentaryPaymentRequest(r.request(),fixture,cfg),{timeout:30000}).then(response=>({response}),error=>({error}));
   writerSettled=false;await form.locator('#pm-ok').click();const observed=await waiting;if(observed.error)throw observed.error;
   const body=await observed.response.json();writerSettled=true;
   assert.equal(observed.response.status(),200,'I66_DOCUMENTARY_QA_HTTP');const result=body.result??body.data;
   assert.ok(result?.ok===true&&result.serverOwned===true&&result.idempotent===true&&result.portfolioUpdated===true);
   assert.equal(result.receiptId,ids.receipt);assert.equal(result.cobroId,fixture.cobroId);assert.equal(result.amount,fixture.payload.amount);
   assert.equal(result.paymentState,'PAID_DIRECT');assert.equal(result.applicationState,'APPLIED_DIRECT');assert.equal(result.paidDate,fixture.payload.paidDate);
   await form.waitFor({state:'detached',timeout:10000});
   const after=await readSet(refs);assertDocumentaryPaymentReadback(dataOf(after),fixture,actor);
   assert.equal((await item('cobros','_').parent.where('reciboId','==',ids.receipt).get()).size,1,'I66_DOCUMENTARY_QA_DUPLICATE_PAYMENT');
   await page.reload({waitUntil:'commit',timeout:30000});
   await page.waitForFunction(()=>!!window.Orbit?.productAppP0&&!!window.Orbit?.reconciliationDomain,null,{timeout:30000});
   const reloaded=await page.evaluate(async ids=>{
    const p=Orbit.productRuntimeBrowserProvidersP0;await p.initialize();const user=await p.waitForUser();await Orbit.productAppP0.activate();
    await Orbit.store._ensureCollections(['recibosEsperados','carteraPrimas','cobros']);
    return{uid:user?.uid,role:Orbit.session.rol()};
   },{...ids,cobro:fixture.cobroId});
   await page.waitForFunction(x=>!!Orbit.store.get('recibosEsperados',x.receipt)&&!!Orbit.store.get('carteraPrimas',x.portfolio)&&!!Orbit.store.get('cobros',x.cobro),{...ids,cobro:fixture.cobroId},{timeout:30000});
   Object.assign(reloaded,await page.evaluate(x=>({receipt:Orbit.store.get('recibosEsperados',x.receipt),portfolio:Orbit.store.get('carteraPrimas',x.portfolio),cobro:Orbit.store.get('cobros',x.cobro)}),{...ids,cobro:fixture.cobroId}));
   assert.equal(reloaded.uid,actor.uid);assert.equal(norm(reloaded.role),'direccion');
   for(const kind of ['receipt','portfolio','cobro']){assert.equal(reloaded[kind]?.paymentState,'PAID_DIRECT');assert.equal(reloaded[kind]?.applicationState,'APPLIED_DIRECT');assert.equal(reloaded[kind]?.paidDate||reloaded[kind]?.fechaPago,fixture.payload.paidDate);}
   assert.deepEqual(await readSet(refs),after,'I66_DOCUMENTARY_QA_RELOAD_CHANGED_DATA');
   const exact=observed.response.request().postDataJSON().data;
   writerSettled=false;const replay=await page.evaluate(async x=>Orbit.reconciliationDomain.applyPayment(x.payload.receiptId,{requestId:x.requestId,payload:x.payload,reason:x.reason}),exact);writerSettled=true;
   assert.equal(replay?.reused,true,'I66_DOCUMENTARY_QA_REPLAY_NOT_REUSED');assert.equal(replay.cobroId,fixture.cobroId);
   assert.deepEqual(await readSet(refs),after,'I66_DOCUMENTARY_QA_REPLAY_MUTATED_DATA');
   assert.equal((await item('cobros','_').parent.where('reciboId','==',ids.receipt).get()).size,1,'I66_DOCUMENTARY_QA_REPLAY_DUPLICATE');
   proof.cases.push({sourceType,beforeDigest:digest(before),afterDigest:digest(after),normalUiRequest:true,normalUiResponse:true,signedActorPreserved:true,
    amountDateSourcePreserved:true,readbackAfterReload:true,canonicalSameRequestReplay:true,replayDataAndUpdateTimesUnchanged:true,replayAdditionalPayments:0,
    paymentsAfter:1,noticeDisabled:true,beforePaymentAbsent:true,receiptPortfolioCobroExact:true});
  }
 }catch(error){failure=error;}
 finally{
  // Close the signed page before any restore; no pending UI writer may race cleanup.
  try{await page.close();pageClosed=true;}catch(error){failure=failure||error;}
  let removed=0;const errors=[];
  if(!writerSettled||!pageClosed){errors.push('WRITER_NOT_PROVEN_SETTLED');failure=failure||Error('I66_DOCUMENTARY_QA_WRITER_NOT_PROVEN_SETTLED');}
  // An uncertain response retains the owned namespace for readback. Deleting it
  // while a server command may still commit would create an orphaned payment.
  for(const target of writerSettled&&pageClosed?targets.slice().reverse():[]){
   try{const s=await target.ref.get();if(!s.exists)continue;assert.ok(s.updateTime,'I66_DOCUMENTARY_QA_CAS_REQUIRED');
    assertDocumentaryPaymentOwned(target.kind,s.data(),target.fixture,actor);await target.ref.delete({lastUpdateTime:s.updateTime});
    assert.equal((await target.ref.get()).exists,false,'I66_DOCUMENTARY_QA_RESTORE_READBACK');removed++;
   }catch(error){errors.push('OWNERSHIP_OR_CAS_HOLD');failure=failure||error;}
  }
  const remaining=(await Promise.all(targets.map(t=>t.ref.get()))).filter(s=>s.exists).length;
  proof.cleanup={status:errors.length||remaining?'HOLD':'PASS',remaining,removedOwnedTargets:removed};
 }
 if(failure){failure.documentaryPaymentEvidence=proof;throw failure;}proof.status='PASS';validateDocumentaryPaymentUiEvidence(proof,{...cfg,buildId,binding});return proof;
}
// Scoped historical-payment QA consumes the already deployed callable unit.
// It does not select or promote the independent composite transport candidate.
const SCOPED_HISTORICAL_JOURNEY_SCHEMA='GI_I66_SCOPED_HISTORICAL_PAYMENT_JOURNEYS_V1';
const SCOPED_HISTORICAL_UNIT_PATH='artifacts/orbit360-recovery/release-control/I6_6_SCOPED_FUNCTION_RELEASE.json';
const gitBlobHash=bytes=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex');
function validateScopedHistoricalContext(input,control,bindingBytes){
 const {phase,origin,binding,facts,hosting,uiHosting,revision}=input,unit=control.i66ScopedFunctionRelease,stage=unit?.providerStages?.[phase==='preview'?'PREVIEW_DEPLOYED':'LIVE_DEPLOYED'];
 assert.ok(['preview','live'].includes(phase),'I66_SCOPED_JOURNEY_PHASE');
 assert.equal(binding.schema,'GI_I66_SCOPED_FUNCTION_PACKAGE_V1');assert.equal(binding.unit,'documented-historical-payment');assert.equal(binding.scope,'BACKEND_CALLABLE');
 assert.deepEqual(binding.targets,{preview:'orbit360CobrosReconciliationCommandPreview',live:'orbit360CobrosReconciliationCommand',region:'us-central1'});
 assert.deepEqual(binding.roles,['Dirección','Operativo']);assert.deepEqual(JSON.parse(bindingBytes),binding);
 assert.equal(unit?.candidatePath,SCOPED_HISTORICAL_UNIT_PATH);assert.equal(unit.candidateBlob,gitBlobHash(bindingBytes));assert.equal(facts.bindingBlob,unit.candidateBlob);
 assert.match(facts.sourceSha,/^[a-f0-9]{40}$/);assert.match(facts.packageSha256,/^[a-f0-9]{64}$/);assert.match(facts.buildId,/^[a-f0-9-]{36}$/);
 for(const entry of [unit.providerStages.PACKAGE_CERTIFIED,stage]){
  assert.ok(entry,'I66_SCOPED_JOURNEY_DEPLOYMENT_REQUIRED');
  for(const key of ['sourceSha','buildId','packageSha256','bindingBlob'])assert.equal(entry[key],facts[key],'I66_SCOPED_JOURNEY_'+key);
  assert.deepEqual(entry.artifact,facts.artifact,'I66_SCOPED_JOURNEY_ARTIFACT');
 }
 assert.equal(facts.artifact.sha256,facts.packageSha256);assert.equal(stage.target,binding.targets[phase]);assert.equal(stage.revision,revision);assert.equal(stage.trafficPercent,100);
 assert.equal(origin,phase==='live'?'https://app.aysseguros.com':control.i66FrontendReleaseHead.previewUrl,'I66_SCOPED_EXISTING_UI_ORIGIN_REQUIRED');
 assert.ok(phase==='live'?origin==='https://app.aysseguros.com':/^https:\/\/ays-orbit-360-lab--gi-i66-rc-\d+-[a-z0-9]+\.web\.app$/.test(origin));
 assert.deepEqual([hosting.version,hosting.buildId,hosting.sourceSha],[binding.predecessor.hostingVersion,binding.predecessor.buildId,binding.predecessor.sourceSha]);
 assert.ok(uiHosting,'I66_SCOPED_UI_HOSTING_BINDING_REQUIRED');assert.equal(uiHosting.origin,origin);assert.match(uiHosting.sourceSha,/^[a-f0-9]{40}$/);assert.ok(uiHosting.buildId);assert.match(uiHosting.markerSha256,/^[a-f0-9]{64}$/);assert.match(uiHosting.version,/^sites\/ays-orbit-360-lab\/versions\/[a-z0-9]+$/);
 assert.equal(uiHosting.basis,'SCOPED_HOSTING_PREDECESSOR');
 assert.deepEqual([uiHosting.version,uiHosting.buildId,uiHosting.sourceSha,uiHosting.markerSha256],[hosting.version,hosting.buildId,hosting.sourceSha,hosting.markerSha256],'I66_SCOPED_UI_PROTECTED_IDENTITY');
 if(phase==='live'){
  if(stage.publication||unit.publicationMethod){
   const publication=require('./gravicentra-i66-frontend-control.cjs').directLivePublication();
   assert.deepEqual(stage.publication,publication,'I66_SCOPED_DIRECT_LIVE_DEPLOYMENT_AUTHORITY');
   assert.deepEqual(unit.publicationMethod,publication,'I66_SCOPED_DIRECT_LIVE_CURRENT_AUTHORITY');
  }else assert.equal(unit.providerStages.PREVIEW_VERIFIED?.packageSha256,facts.packageSha256,'I66_SCOPED_JOURNEY_SIGNED_PREVIEW_REQUIRED');
 }
 return{phase,origin,sourceSha:facts.sourceSha,buildId:facts.buildId,packageSha256:facts.packageSha256,bindingBlob:facts.bindingBlob,revision,hostingBuildId:uiHosting.buildId,hostingSourceSha:uiHosting.sourceSha,hostingMarkerSha256:uiHosting.markerSha256,protectedLiveHosting:hosting,uiHosting,tenantId:TENANT,target:binding.targets[phase],region:binding.targets.region};
}
function scopedHistoricalFixture(nonce,role,primaryRow){
 assert.match(nonce,/^[a-z0-9_]{12,60}$/);assert.ok(['direccion','operativo'].includes(role));assert.ok(Number.isInteger(primaryRow)&&primaryRow>=11&&primaryRow<=1569);
 const key='b3004qa_i66_historical_'+role+'_'+nonce,ids={client:key+'_client',policy:key+'_policy',receipt:key+'_receipt',advisor:key+'_advisor',insurer:key+'_insurer'};
 const runId=key+'_run',mark={tenantId:TENANT,__syntheticQa:true,qaRunId:runId,qaJourney:SCOPED_HISTORICAL_JOURNEY_SCHEMA},bundle='f445e2f4a20b9eb7a526bda8896472dab9e7ac4617b3c5d8124a939a0dee0e6a',primary='CobranzaCendoso (24).xlsx#row'+primaryRow;
 const common={...mark,pais:'GT',moneda:'GTQ',asesorId:ids.advisor},amount=5880,paidDate='2026-01-05';
 const client={id:ids.client,...common,nombre:'QA histórica sintética sin destinatario real'};
 const policy={id:ids.policy,...common,clienteId:ids.client,aseguradoraId:ids.insurer,numero:'QA-HISTORICAL-'+nonce+'-'+role,primaTotal:amount,vigenciaInicio:'2025-11-25',vigenciaFin:'2026-11-25',estado:'Vigente',importadorP0:true,cobroAplicado:false,carteraMaterializada:false,recibosMaterializados:false};
 const receipt={id:ids.receipt,...common,polizaId:ids.policy,clienteId:ids.client,aseguradoraId:ids.insurer,polizaNumero:policy.numero,estadoOperativo:'pago_reportado',estadoVisual:'Pago reportado',exigibilidad:'no_pendiente',enCartera:false,
  fechaCorteFuente:'2026-09-18',fechaLimite:'2025-11-25',fechaPagoReportada:paidDate,formaPago:'Depósito',frecuencia:'Pago Único',fuenteAutoridad:'SIGA',gastosExpedicion:250,gastosFinanciamiento:0,impuestosIVA:630,
  matchQuality:'I6_5_EXACT_POLICY_TERM',motivosCalidad:'I6_5_20260918_EXACT_POLICY_TERM_SOURCE_RECONCILIATION',primaNeta:5000,primaTotal:amount,requiereValidacion:false,serie:'1/1',sourceBundleSha256:bundle,
  sourceRef:'Cobranza Efectuada desde 2024.xlsx',sourceRefsI65:[primary],vigenciaInicio:policy.vigenciaInicio,vigenciaFin:policy.vigenciaFin};
 const cobroId='cob_'+hash(TENANT+'|receipt|'+ids.receipt).slice(0,28),sourceKey=hash(TENANT+'|'+bundle+'|'+primary);
 return{ids,runId,amount,paidDate,client,policy,receipt,cobroId,sourceKey,invoiceNumber:'QA-HISTORICAL-INVOICE-'+role+'-'+nonce,applicationDate:paidDate,invoiceDate:paidDate};
}
function assertScopedHistoricalReadback({receipt,payment,request,event},f,actor,requestId,phase='preview'){
 const eventId='payevt_'+hash(TENANT+'|'+f.ids.receipt+'|'+requestId).slice(0,28);
 assert.deepEqual([request.status,request.operation,request.eventId,event.eventId,event.requestId,event.operation],['committed','reconcile_payment',eventId,eventId,requestId,'reconcile_payment']);
 assert.equal(event.actor.uid,actor.uid);assert.equal(norm(event.actor.activeRole),actor.role);
 assert.deepEqual([receipt.id,receipt.polizaId,receipt.clienteId,receipt.cobroId,payment.id,payment.reciboId,payment.polizaId,payment.clienteId],[f.ids.receipt,f.ids.policy,f.ids.client,f.cobroId,f.cobroId,f.ids.receipt,f.ids.policy,f.ids.client]);
 assert.equal(receipt.__syntheticQa,true);if(phase==='preview')assert.equal(payment.__syntheticQa,true);
 for(const row of [receipt,payment]){assert.equal(row.paidDate,f.paidDate);assert.equal(row.invoiceNumber,f.invoiceNumber);assert.equal(row.invoiceDate,f.invoiceDate);assert.equal(row.applicationState,'APPLIED_DIRECT');}
 for(const key of ['fechaPagoReportada','fechaCorteFuente','sourceBundleSha256','sourceRef','sourceRefsI65','matchQuality','motivosCalidad','primaTotal','primaNeta','formaPago','vigenciaInicio','vigenciaFin','serie'])assert.equal(digest(receipt[key]),digest(f.receipt[key]),'I66_SCOPED_HISTORICAL_ORIGINAL_'+key);
 assert.equal(payment.monto,f.amount);assert.equal(payment.paymentOrigin,'CRM_MIGRATED_DIRECT_PAYMENT');assert.equal(payment.paymentEvidenceType,'CRM_MIGRATED_DIRECT');
 const proof=payment.historicalPaymentEvidence;assert.ok(proof);assert.equal(proof.newCollection,false);assert.equal(proof.sourceKey,f.sourceKey);assert.equal(proof.receiptId,f.ids.receipt);assert.equal(proof.policyId,f.ids.policy);assert.equal(proof.amount,f.amount);assert.equal(proof.fechaPagoReportada,f.paidDate);
 assert.equal(request.result.historicalPaymentLinked,true);assert.equal(request.result.amount,f.amount);assert.equal(event.recordedPaymentBefore.amount,f.amount);assert.equal(event.recordedPaymentAfter.amount,f.amount);
 assert.equal(event.recordedPaymentBefore.sourceCollection,'recibosEsperados');assert.equal(event.recordedPaymentBefore.sourceId,f.ids.receipt);assert.equal(digest(event.recordedPaymentBefore.historicalSource),digest(proof));
 return eventId;
}
async function exerciseScopedHistoricalPayment({page,actor,context,tenant,item,nonce,onServerReadback},io={}){
 assert.equal(typeof onServerReadback,'function','I66_SCOPED_SERVER_READBACK_CALLBACK_REQUIRED');
 assert.ok(['direccion','operativo'].includes(actor.role));assert.ok(actor.uid);assert.equal(context.tenantId,TENANT);
 const readMarker=io.readMarker|| (async()=>{const r=await fetch(context.origin+'/__recovery__/build.json',{cache:'no-store',redirect:'error'});assert.equal(r.status,200);const bytes=Buffer.from(await r.arrayBuffer());return{...JSON.parse(bytes),__qaMarkerSha256:hash(bytes)};});
 const existingLegal=io.requireExistingLegalReadiness||require('./gravicentra-i6-6-carlos-paula-live-direct-renewal-synthetic-uat.cjs').requireExistingLegalReadiness;
 let directionLegalProof;
 const legal=async page=>{
  try{return await existingLegal(page);}catch(error){
   if(actor.role!=='direccion'||directionLegalProof||error.message!=='I66_DIRECT_FORMS_EXISTING_ACTOR_LEGAL_ACCEPTANCE_REQUIRED')throw error;
   const signed=await page.evaluate(()=>{const u=Orbit.auth.user();return {uid:u.uid,advisorId:u.advisorId};});
   assert.equal(signed.uid,actor.uid,'SCOPED_DIRECTION_AUTHENTICATED_ACTOR');
   directionLegalProof=await require('./gravicentra-i6-6-direction-preview-legal-acceptance.cjs').acceptHistoricalDirectionLegal({page,actor:{...actor,advisorId:signed.advisorId},context});
   return existingLegal(page);
  }
 };
 const marker=await readMarker();assert.deepEqual([marker.buildId,marker.sourceSha,marker.__qaMarkerSha256],[context.hostingBuildId,context.hostingSourceSha,context.hostingMarkerSha256],'I66_SCOPED_HOSTING_MARKER');
 let f=null;const initial=11+(parseInt(hash(nonce+'|'+actor.role).slice(0,8),16)%1559);
 // Never reuse a primary source key that already belongs to a real or QA payment.
 for(let offset=0;offset<16;offset++){const candidate=scopedHistoricalFixture(nonce,actor.role,11+((initial-11+offset)%1559));const used=await item('cobros','_').parent.where('historicalPaymentEvidence.sourceKey','==',candidate.sourceKey).limit(1).get();if(used.empty){f=candidate;break;}}
 assert.ok(f,'I66_SCOPED_HISTORICAL_SOURCE_NAMESPACE_BUSY');
 const refs=[{collection:'clientes',id:f.ids.client,seed:f.client},{collection:'polizas',id:f.ids.policy,seed:f.policy},{collection:'recibosEsperados',id:f.ids.receipt,seed:f.receipt},{collection:'cobros',id:f.cobroId}].map(t=>({...t,ref:item(t.collection,t.id)}));
 const targets=[],auditPrefix=context.phase==='preview'?'previewReconciliation':'reconciliation';let writerSettled=true,failure=null,pageClosed=false;
 const proof={schema:SCOPED_HISTORICAL_JOURNEY_SCHEMA,status:'HOLD',role:actor.role==='direccion'?'Dirección':'Operativo',actorUidSha256:hash(actor.uid),origin:context.origin,route:'/#/cobros',receiptId:f.ids.receipt,cobroId:f.cobroId,policyId:f.ids.policy,clientId:f.ids.client,
  originalPaymentBasis:'VERIFIED_HISTORICAL_RECEIPT',originalPaymentCount:null,afterPaymentCount:null,originalCobroDocumentCount:null,afterCobroDocumentCount:null,originalPaidDate:f.paidDate,originalAmount:f.amount,invoiceNumber:f.invoiceNumber,
  sourceKey:f.sourceKey,normalUi:false,reloaded:false,replayUnchanged:false,idempotentReplay:false,newCollection:false,realCustomerWrites:0,cleanup:{status:'HOLD',remaining:null,targets:[]}};
 const snapshot=async list=>Object.fromEntries(await Promise.all(list.map(async t=>{const s=await t.ref.get();return[t.ref.path,{exists:s.exists,data:s.exists?s.data():null,updateTime:s.exists?(assert.ok(s.updateTime&&Number.isSafeInteger(s.updateTime.seconds)&&Number.isSafeInteger(s.updateTime.nanoseconds),'I66_SCOPED_CAS_VERSION_REQUIRED'),s.updateTime.seconds+':'+s.updateTime.nanoseconds):null}];})));
 async function linked(collection,fields){const ids=new Set();for(const field of fields){const s=await item(collection,'_').parent.where(field,'==',f.ids.receipt).limit(3).get();assert.ok(s.size<3,'I66_SCOPED_EXACT_FINANCIAL_SCAN');for(const d of s.docs)ids.add(d.id);}return [...ids].sort();}
 async function projection(){return page.evaluate(async id=>{await Orbit.store._ensureCollections(['clientes','polizas','recibosEsperados','carteraPrimas','cobros']);const all=Orbit.modules.cobros.reportableRows();if(!all)return null;const rows=all.filter(r=>String(r.reciboId||r.receiptId||'')===id);return{count:rows.length,rows:rows.map(r=>({id:r.id,monto:r.monto,fechaPago:r.fechaPago,receiptId:r.reciboId||r.receiptId})),cobros:Orbit.store.all('cobros').filter(r=>(r.reciboId||r.receiptId)===id).map(r=>r.id)};},f.ids.receipt);}
 async function identity(){
  // Cobros registers before the product activation API during a cold reload.
  await page.waitForFunction(()=>typeof window.Orbit?.productAppP0?.activate==='function'&&typeof window.Orbit?.productRuntimeBrowserProvidersP0?.waitForUser==='function'&&typeof window.Orbit?.reconciliationDomain?.status==='function',null,{timeout:30000});
  const v=await page.evaluate(async()=>{const p=Orbit.productRuntimeBrowserProvidersP0;await p.initialize();const u=await p.waitForUser();const a=await Orbit.productAppP0.activate();return{uid:u?.uid,role:Orbit.session.rol(),started:a?.started===true,endpoint:Orbit.reconciliationDomain.status()};});assert.equal(v.uid,actor.uid);assert.equal(norm(v.role),actor.role);assert.equal(v.started,true);assert.equal(v.endpoint.functionName,context.target);assert.equal(v.endpoint.region,context.region);}
 let observedData=null,observerFailure=null;
 const matches=request=>{let data;try{data=request.postDataJSON()?.data;}catch{return false;}return request.method()==='POST'&&request.url()==='https://'+context.region+'-'+PROJECT+'.cloudfunctions.net/'+context.target&&data?.tenantId===TENANT&&norm(data.activeRole)===actor.role&&data.operation==='reconcile_payment'&&data.payload?.receiptId===f.ids.receipt;};
 const capture=request=>{if(!matches(request))return;try{const data=request.postDataJSON().data;assert.equal(observedData,null,'I66_SCOPED_SINGLE_UI_COMMAND');observedData=data;assert.match(data.requestId,/^recui_[a-f0-9]{1,8}$/);const eventId='payevt_'+hash(TENANT+'|'+f.ids.receipt+'|'+data.requestId).slice(0,28);proof.requestId=data.requestId;proof.eventId=eventId;
  targets.push({kind:'request',id:data.requestId,ref:tenant.collection(auditPrefix+'Requests').doc(data.requestId)},{kind:'event',id:eventId,ref:tenant.collection(auditPrefix+'Events').doc(eventId)});}catch(error){observerFailure=observerFailure||error;}};
 try{
  // A fresh signed browser may lack an existing legal record. Check signed
  // identity and legal readiness before acquiring a claim or creating fixtures.
  await page.goto(context.origin+proof.route,{waitUntil:'commit',timeout:30000});await page.waitForFunction(()=>!!window.Orbit?.modules?.cobros?.conciliarFactura,null,{timeout:30000});await identity();await legal(page);
  for(const t of refs)assert.equal((await t.ref.get()).exists,false,'I66_SCOPED_HISTORICAL_FIXTURE_COLLISION');assert.deepEqual(await linked('cobros',['reciboId','receiptId']),[]);assert.deepEqual(await linked('carteraPrimas',['reciboId','receiptId']),[]);
  if(io.beforeFixtureWrite)await io.beforeFixtureWrite({receiptId:f.ids.receipt,targets:refs.map(t=>({collection:'data/'+t.collection+'/items',id:t.id}))});
  for(const t of refs){targets.push(t);if(t.seed)await t.ref.create(t.seed);}
  const before=await snapshot(refs);proof.beforeDigest=digest(before);proof.originalCobroDocumentCount=0;
  await page.reload({waitUntil:'commit',timeout:30000});await page.waitForFunction(()=>!!window.Orbit?.modules?.cobros?.conciliarFactura,null,{timeout:30000});await identity();await legal(page);
  await page.waitForFunction(id=>{const rows=Orbit.modules.cobros.reportableRows();return Array.isArray(rows)&&rows.filter(r=>String(r.reciboId||r.receiptId||'')===id).length===1;},f.ids.receipt,{timeout:30000});
  const originalProjection=await projection();assert.equal(originalProjection.count,1);assert.deepEqual(originalProjection.cobros,[]);assert.equal(originalProjection.rows[0].monto,f.amount);assert.equal(originalProjection.rows[0].fechaPago,f.paidDate);proof.originalPaymentCount=1;proof.originalProjection=originalProjection;
  await page.evaluate(id=>Orbit.modules.cobros.conciliarFactura(id),f.ids.receipt);const modal=page.locator('#cob-conc');await modal.waitFor({state:'visible',timeout:10000});
  assert.equal(await modal.locator('#cc-paid').inputValue(),f.paidDate);await modal.locator('#cc-aplicacion').fill(f.applicationDate);await modal.locator('#cc-invoice-date').fill(f.invoiceDate);await modal.locator('#cc-numero').fill(f.invoiceNumber);
  page.on('request',capture);const waiting=page.waitForResponse(r=>matches(r.request()),{timeout:30000});waiting.catch(()=>{});writerSettled=false;
  await modal.locator('#cc-ok').click();const response=await waiting,body=await response.json();writerSettled=true;page.off('request',capture);if(observerFailure){writerSettled=false;throw observerFailure;}
  assert.equal(response.status(),200,'I66_SCOPED_HISTORICAL_UI_CALL_FAILED');assert.equal(body.result?.ok,true);assert.equal(body.result.historicalPaymentLinked,true);assert.equal(body.result.amount,f.amount);assert.ok(observedData);await modal.waitFor({state:'detached',timeout:10000});proof.normalUi=true;
  const afterRows=await snapshot(targets),receipt=(await item('recibosEsperados',f.ids.receipt).get()).data(),payment=(await item('cobros',f.cobroId).get()).data(),request=(await tenant.collection(auditPrefix+'Requests').doc(proof.requestId).get()).data(),event=(await tenant.collection(auditPrefix+'Events').doc(proof.eventId).get()).data();
  assertScopedHistoricalReadback({receipt,payment,request,event},f,actor,proof.requestId,context.phase);assert.equal(digest((await item('clientes',f.ids.client).get()).data()),digest(f.client));assert.equal(digest((await item('polizas',f.ids.policy).get()).data()),digest(f.policy));assert.deepEqual(await linked('cobros',['reciboId','receiptId']),[f.cobroId]);assert.deepEqual(await linked('carteraPrimas',['reciboId','receiptId']),[]);
  proof.afterCobroDocumentCount=1;proof.afterDigest=digest(afterRows);
  await page.reload({waitUntil:'commit',timeout:30000});await page.waitForFunction(()=>!!window.Orbit?.modules?.cobros?.reportableRows,null,{timeout:30000});await identity();await legal(page);
  await page.waitForFunction(id=>{const rows=Orbit.modules.cobros.reportableRows();return Array.isArray(rows)&&rows.filter(r=>String(r.reciboId||r.receiptId||'')===id).length===1;},f.ids.receipt,{timeout:30000});const afterProjection=await projection();assert.equal(afterProjection.count,1);assert.deepEqual(afterProjection.cobros,[f.cobroId]);assert.equal(afterProjection.rows[0].monto,f.amount);assert.equal(afterProjection.rows[0].fechaPago,f.paidDate);proof.afterPaymentCount=1;proof.afterProjection=afterProjection;proof.reloaded=true;
  assert.equal(digest(await snapshot(targets)),digest(afterRows),'I66_SCOPED_RELOAD_MUTATED_DATA');writerSettled=false;
  const replay=await page.evaluate(async x=>Orbit.productRuntimeBrowserProvidersP0.callFunction(x.target,x.data,x.region),{target:context.target,region:context.region,data:observedData});writerSettled=true;assert.equal(replay.reused,true);assert.equal(digest(await snapshot(targets)),digest(afterRows),'I66_SCOPED_REPLAY_MUTATED_DATA_OR_VERSION');proof.replayUnchanged=true;proof.idempotentReplay=true;
  const currentMarker=await readMarker();assert.deepEqual([currentMarker.buildId,currentMarker.sourceSha,currentMarker.__qaMarkerSha256],[context.hostingBuildId,context.hostingSourceSha,context.hostingMarkerSha256]);
  if(directionLegalProof)proof.directionLegalAcceptance=directionLegalProof;
  const witness=await onServerReadback({journey:{...proof},before,after:afterRows});assert.equal(witness?.status,'PASS','I66_SCOPED_EXTERNAL_SERVER_READBACK_REQUIRED');proof.serverReadback=witness;
 }catch(error){failure=error;}
 finally{
  try{page.off('request',capture);await page.close();pageClosed=true;}catch(error){failure=failure||error;}
  const errors=[];let removed=0;
  if(!writerSettled||!pageClosed)errors.push('WRITER_NOT_PROVEN_SETTLED');
  for(const t of writerSettled&&pageClosed?targets.slice().reverse():[]){try{const s=await t.ref.get();if(!s.exists)continue;const row=s.data();assert.ok(s.updateTime,'I66_SCOPED_CLEANUP_CAS_REQUIRED');
    if(t.kind==='request'){assert.equal(row.status,'committed');assert.equal(row.operation,'reconcile_payment');assert.equal(row.eventId,proof.eventId);assert.equal(row.result?.receiptId,f.ids.receipt);assert.equal(row.result?.cobroId,f.cobroId);}
    else if(t.kind==='event'){assert.equal(row.actor?.uid,actor.uid);assert.equal(norm(row.actor?.activeRole),actor.role);assert.equal(row.receiptId,f.ids.receipt);assert.equal(row.cobroId,f.cobroId);assert.equal(row.requestId,proof.requestId);}
    else if(t.collection==='cobros'){assert.equal(row.id,f.cobroId);if(context.phase==='preview')assert.equal(row.__syntheticQa,true);assert.equal(row.reciboId,f.ids.receipt);assert.equal(row.polizaId,f.ids.policy);assert.equal(row.clienteId,f.ids.client);assert.equal(row.monto,f.amount);assert.equal(row.paidDate,f.paidDate);assert.equal(row.historicalPaymentEvidence?.sourceKey,f.sourceKey);assert.equal(row.historicalPaymentEvidence?.newCollection,false);}
    else {assert.equal(row.id,t.id);assert.equal(row.__syntheticQa,true);assert.equal(row.qaRunId,f.runId);assert.equal(row.qaJourney,SCOPED_HISTORICAL_JOURNEY_SCHEMA);if(t.collection!=='recibosEsperados')assert.equal(digest(row),digest(t.seed));}
    await t.ref.delete({lastUpdateTime:s.updateTime});assert.equal((await t.ref.get()).exists,false);removed++;
   }catch(error){errors.push('OWNERSHIP_OR_CAS_HOLD');failure=failure||error;}}
  const remaining=(await Promise.all(targets.map(t=>t.ref.get()))).filter(s=>s.exists).length;proof.cleanup={status:errors.length||remaining?'HOLD':'PASS',remaining,removed,targets:targets.map(t=>({collection:t.ref.path.split('/').slice(2,-1).join('/'),id:t.ref.id}))};
  if(errors.length||remaining)failure=failure||Error('I66_SCOPED_HISTORICAL_CLEANUP_HOLD');
 }
 if(failure){failure.scopedHistoricalJourney=proof;throw failure;}proof.status='PASS';return proof;
}
async function runScopedHistoricalPaymentJourneys(input,io={}){
 const read=io.readFileSync||fs.readFileSync,control=JSON.parse(read('artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json','utf8'));
 const context=validateScopedHistoricalContext(input,control,read(SCOPED_HISTORICAL_UNIT_PATH));assert.equal(typeof input.onServerReadback,'function');
 const admin=io.admin||require('firebase-admin'),chromium=io.chromium||require('playwright').chromium;
 await (io.initializeSignedQaAdmin||require('./gravicentra-i66-signed-qa-runtime-auth.cjs').initializeSignedQaAdmin)(admin,{getLegacyCredential:()=>{throw Error('I66_SCOPED_JOURNEY_EXISTING_CLOUD_RUNTIME_REQUIRED');}});
 const db=admin.firestore(),auth=admin.auth(),tenant=db.collection('tenants').doc(TENANT),item=(c,id)=>tenant.collection('data').doc(c).collection('items').doc(id);
 const [members,advisors]=await Promise.all([tenant.collection('members').limit(150).get(),item('asesores','_').parent.limit(400).get()]);assert.ok(members.size<150&&advisors.size<400);
 const roleOwner=require('../functions/product-active-role-contract');
 const pick=(predicate,role)=>{const linked=new Set(),uids=new Set();for(const d of advisors.docs){const a=d.data();if([a.nombre,a.nombreCompleto,a.displayName,a.name].some(v=>predicate(norm(v)))){linked.add(d.id);[a.authUid,a.uid,a.userId].filter(Boolean).forEach(v=>uids.add(v));}}
  const found=members.docs.filter(d=>{const m=d.data();let assigned=false;try{assigned=roleOwner.resolveProductActiveRole(m,role).activeRole===role;}catch{}return assigned&&([m.nombre,m.nombreCompleto,m.displayName,m.name,m.fullName].some(v=>predicate(norm(v)))||linked.has(m.advisorId||m.asesorId)||uids.has(d.id))&&m.active!==false&&m.activo!==false&&['active','activo'].includes(norm(m.status||m.estado))&&[].concat(m.countries||m.paises||[]).includes('GT');});assert.equal(found.length,1,'I66_SCOPED_JOURNEY_ACTOR_NOT_UNIQUE_'+role);return{uid:found[0].id,role,memberDigest:digest(found[0].data())};};
 const actors=[pick(v=>v.includes('paula')&&v.includes('osorio'),'direccion'),pick(v=>v.startsWith('carloscastro'),'operativo')];assert.notEqual(actors[0].uid,actors[1].uid);
 const report={schema:SCOPED_HISTORICAL_JOURNEY_SCHEMA,status:'HOLD',phase:context.phase,sourceSha:context.sourceSha,buildId:context.buildId,packageBuildId:context.buildId,packageSha256:context.packageSha256,bindingBlob:context.bindingBlob,revision:context.revision,hostingBuildId:context.hostingBuildId,protectedLiveHosting:context.protectedLiveHosting,uiHosting:context.uiHosting,journeys:[],realCustomerWrites:0,authOrMembershipMutations:0,cleanup:{status:'HOLD',remaining:null,targets:[]}};
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});let failure=null;
 try{for(const actor of actors){const user=await auth.getUser(actor.uid);assert.ok(!user.disabled&&user.emailVerified);const token=await auth.createCustomToken(actor.uid),session=await browser.newContext({viewport:{width:1280,height:900}});let page;
  try{page=await session.newPage();await page.goto(context.origin+'/#/cobros',{waitUntil:'commit',timeout:30000});await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
   const signed=await page.evaluate(async token=>{const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();await c.modules.auth.setPersistence(c.auth,c.modules.auth.browserSessionPersistence);await c.modules.auth.signInWithCustomToken(c.auth,token);const active=await Orbit.productAppP0.activate();return{uid:(await p.waitForUser())?.uid,started:active?.started===true,role:Orbit.session.rol(),assigned:Orbit.session.allowedRoles()};},token);
   assert.equal(signed.uid,actor.uid);assert.equal(signed.started,true);assert.ok(signed.assigned.map(norm).includes(actor.role));
   if(norm(signed.role)!==actor.role){await page.locator('#rol-sel').selectOption(actor.role==='direccion'?'Dirección':'Operativo');await page.waitForFunction(role=>String(Orbit.session.rol()).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()===role,actor.role,{timeout:10000});}
   const country=page.locator('#pais-sel');if(await country.inputValue()!=='GT')await country.selectOption('GT');
   const nonce=Date.now().toString(36)+'_'+crypto.randomBytes(5).toString('hex');
   report.journeys.push(await (io.exercise||exerciseScopedHistoricalPayment)({page,actor,context,tenant,item,nonce,onServerReadback:input.onServerReadback},io));
   assert.equal(digest((await tenant.collection('members').doc(actor.uid).get()).data()),actor.memberDigest,'I66_SCOPED_MEMBERSHIP_CHANGED');
  }finally{await session.close();}}
 }catch(error){failure=error;if(error.scopedHistoricalJourney)report.journeys.push(error.scopedHistoricalJourney);}
 finally{try{await browser.close();}catch(error){failure=failure||error;}}
 const cleanupTargets=report.journeys.flatMap(j=>j.cleanup.targets);report.cleanup={status:report.journeys.length===2&&report.journeys.every(j=>j.cleanup.status==='PASS')?'PASS':'HOLD',remaining:report.journeys.reduce((n,j)=>n+(j.cleanup.remaining||0),0),targets:cleanupTargets};
 if(failure){failure.scopedHistoricalReport=report;throw failure;}assert.equal(report.journeys.length,2);assert.equal(report.cleanup.status,'PASS');report.status='PASS';return report;
}

async function main(){
 const cfg=validateEnvironment(process.env);
 const release=require('./gravicentra-i6-6-operational-release-candidate.cjs');
 const candidate=release.candidateForPhase(JSON.parse(fs.readFileSync(release.CONTROL,'utf8')),cfg.phase.toLowerCase());
 assert.equal(candidate.sourceSha,cfg.sourceSha,'I66_PROPOSAL_CANDIDATE_SOURCE_DRIFT');
 const documentaryBinding=candidate.financialRecoveryQa===undefined?null:validateDocumentaryPaymentQaBinding(candidate.financialRecoveryQa);
 if(cfg.phase==='LIVE')assertDirectionLiveLegalAuthority({sourceSha:cfg.sourceSha});
 const reportPath=path.join(cfg.packageRoot,'evidence','i66-proposal-application-signed-uat-'+cfg.phase.toLowerCase()+'.json');
 const report={sourceSha:cfg.sourceSha,phase:cfg.phase,status:'HOLD',syntheticOnly:true,realControlUnchanged:false,checks:[],cleanup:{status:'HOLD',remaining:null},proposalDiagnostics:{prerequisites:null,calls:[]}};
 const uiCausalEvidence=Object.fromEntries(UI_CAUSAL_FIELDS.map(key=>[key,false]));let uiApplicationObserver=null,intakeDiagnosticsStop=null;
 let stage='BOOT';const enter=name=>{stage=safeStage(name);};
 const admin=require('firebase-admin'),{chromium}=require('playwright');
 await require('./gravicentra-i66-signed-qa-runtime-auth.cjs').initializeSignedQaAdmin(admin,{getLegacyCredential:()=>{
   const credentialPath=process.env.GOOGLE_APPLICATION_CREDENTIALS;
   const credential=credentialPath?JSON.parse(fs.readFileSync(credentialPath,'utf8')):
     ['SA_LAB','SA_LAB_ALT','SA_ALT','SA_DEFAULT'].map(key=>{try{return JSON.parse(process.env[key]||'');}catch{return null;}})
      .find(value=>value?.type==='service_account'&&value.project_id===PROJECT&&value.private_key);
   assert.ok(credential?.type==='service_account'&&credential.project_id===PROJECT&&credential.private_key,'I66_PROPOSAL_CONFIGURED_CREDENTIAL_REQUIRED');
   return credential;
 }});
 const db=admin.firestore(),auth=admin.auth(),tenant=db.collection('tenants').doc(TENANT);
 const items=c=>tenant.collection('data').doc(c).collection('items'),item=(c,id)=>items(c).doc(id);
 const nonce=Date.now().toString(36)+'_'+crypto.randomBytes(5).toString('hex'),runId='cobledgerqa_'+nonce;
 const prefix='b3005qa_i66_proposal_'+nonce;
 const ids={proposal:prefix,source:prefix+'_source',client:prefix+'_client',policy:prefix+'_policy',receipt:prefix+'_receipt',portfolio:prefix+'_portfolio'};
 const runRef=item('cobrosLedgerQaRuns',runId),controlRef=item('cobrosLedgerQaControl',runId);
 const applicationId=applicationIdFor(TENANT,runId,ids.proposal),resolutionId=applicationId.replace(/^propapp_/,'propres_');
 const cobroId='cob_'+hash(TENANT+'|receipt|'+ids.receipt).slice(0,28);
 const applicationRef=item('reconciliationApplications',applicationId),resolutionRef=item('reconciliationResolutions',resolutionId);
 const paymentEventId='payinf_'+hash(TENANT+'|'+ids.policy+'|'+applicationId).slice(0,28);
 const targetRefs=[item('clientes',ids.client),item('polizas',ids.policy),item('recibosEsperados',ids.receipt),item('carteraPrimas',ids.portfolio),item('cobros',cobroId),applicationRef,resolutionRef,
   tenant.collection('reconciliationRequests').doc(applicationId),tenant.collection('reconciliationEvents').doc(paymentEventId),
   runRef.collection('propuestasConciliacion').doc(ids.proposal),runRef.collection('evidenciasCobro').doc(ids.source),runRef,controlRef];
 const additionalTargetOwners=new Map();
 const sessions=[],diagnosticReads=[];let browser=null,originalControl=null,originalManifest=null,activeManifestRef=null,failure=null,cleanupArmed=false;
 const mark={tenantId:TENANT,__syntheticQa:true,qaRunId:runId};
 const checked=name=>{report.checks.push(name);console.log('I66_PROPOSAL_UAT_CHECK='+name);};
 const snapshot=async ref=>{const s=await ref.get();return s.exists?s.data():null;};
 async function create(ref,row){assert.equal((await ref.get()).exists,false,'I66_PROPOSAL_FIXTURE_COLLISION');await ref.create(row);}
 async function restoreQa(ref,row){const s=await ref.get();assert.ok(s.exists&&owned(s.data(),runId),'I66_PROPOSAL_FIXTURE_OWNERSHIP_LOST');await ref.set(row);}
 async function staff(){
  const [members,advisors]=await Promise.all([tenant.collection('members').limit(150).get(),items('asesores').limit(400).get()]);
  assert.ok(members.size<150&&advisors.size<400,'I66_PROPOSAL_ACTOR_BOUNDED_SCAN');
  const select=(predicate,role)=>{
   const links=new Set(),uids=new Set();
   for(const d of advisors.docs){const a=d.data()||{};if([a.nombre,a.nombreCompleto,a.displayName,a.name].some(v=>predicate(norm(v)))){links.add(d.id);[a.authUid,a.uid,a.userId].filter(Boolean).forEach(v=>uids.add(v));}}
   const found=members.docs.filter(d=>{const m=d.data()||{};return ([m.nombre,m.nombreCompleto,m.displayName,m.name,m.fullName].some(v=>predicate(norm(v)))||links.has(m.advisorId||m.asesorId)||uids.has(d.id))&&
    norm(m.activeRole)===role&&m.active!==false&&m.activo!==false&&['active','activo'].includes(norm(m.status||m.estado))&&[].concat(m.countries||m.paises||[]).includes('GT');});
   assert.equal(found.length,1,'I66_PROPOSAL_REAL_ACTOR_NOT_UNIQUE_'+role);
   return{uid:found[0].id,role,advisorId:String(found[0].data().advisorId||found[0].data().asesorId||''),member:found[0].data()};
  };
  const actors=[select(v=>v.includes('paula')&&v.includes('osorio'),'direccion'),select(v=>v.startsWith('carloscastro'),'operativo')];
  for(const actor of actors){const u=await auth.getUser(actor.uid);assert.ok(!u.disabled&&u.emailVerified,'I66_PROPOSAL_ACTOR_AUTH_NOT_READY');actor.token=await auth.createCustomToken(actor.uid);}
  return actors;
 }
 async function sign(actor){
  const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();sessions.push(context);
  await page.goto(cfg.origin+'/#/conciliaciones',{waitUntil:'commit',timeout:30000});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
  const result=await page.evaluate(async token=>{const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
   await c.modules.auth.setPersistence(c.auth,c.modules.auth.browserSessionPersistence);await c.modules.auth.signInWithCustomToken(c.auth,token);
   const active=await Orbit.productAppP0.activate();return{started:active?.started===true,role:Orbit.session?.rol?.(),endpoint:Orbit.reconciliationDomain?.status?.().functionName};},actor.token);
  assert.ok(result.started&&norm(result.role)===actor.role,'I66_PROPOSAL_SIGNED_ACTIVATION_MISMATCH');
  assert.equal(result.endpoint,cfg.phase==='LIVE'?'orbit360CobrosReconciliationCommand':'orbit360CobrosReconciliationCommandPreview');
  return page;
 }
 const rawCall=async(page,operation,payload,activeRole)=>{
  let response;
  try{response=await page.evaluate(async x=>{
   try{const p=Orbit.productRuntimeBrowserProvidersP0,name=Orbit.reconciliationDomain.status().functionName;
    return{result:await p.callFunction(name,{tenantId:x.tenantId,activeRole:x.activeRole||Orbit.session.rol(),operation:x.operation,payload:x.payload,reason:'I6.6 prueba firmada totalmente sintética y reversible'},'us-central1')};
   }catch(error){
    const code=typeof error?.code==='string'?error.code.replace(/^functions\//,''):'';
    const reason=[error?.details?.reason,error?.message].find(value=>x.reasons.includes(value));
    return{denied:true,code:x.codes.includes(code)?code:'UNKNOWN_CODE',reason:reason||'UNKNOWN_REASON'};
   }
  },{tenantId:TENANT,operation,payload,activeRole,reasons:REASONS,codes:CALLABLE_CODES});
  }catch(error){report.proposalDiagnostics.calls.push(projectCallableResult({driverFailed:true,code:safeCode(error?.code)},operation,stage,ids.receipt));throw error;}
  report.proposalDiagnostics.calls.push(projectCallableResult(response,operation,stage,ids.receipt));
  return response;
 };
 const proposalPayload={proposalId:ids.proposal,sourceRunId:runId};
 try{
  enter('BUILD_IDENTITY');
  const bundled=JSON.parse(fs.readFileSync(path.join(cfg.packageRoot,'bundle/site/__recovery__/build.json'),'utf8'));
  const remote=await fetch(cfg.origin+'/__recovery__/build.json',{headers:{'cache-control':'no-cache'}});assert.equal(remote.status,200,'I66_PROPOSAL_BUILD_UNAVAILABLE');
  const build=await remote.json();assert.equal(build.sourceSha,cfg.sourceSha);assert.equal(bundled.sourceSha,cfg.sourceSha);assert.equal(build.buildId,bundled.buildId);report.buildId=build.buildId;
  for(const name of ['modules/conciliaciones.js','core/cobros-reconciliation-domain-client.js','core/importa.js','modules/importar.js','modules/importar-p0-confirmacion.js']){
   const bytes=fs.readFileSync(path.join(cfg.packageRoot,'bundle/site',name));const response=await fetch(cfg.origin+'/'+name,{headers:{'cache-control':'no-cache'}});
   assert.equal(response.status,200);assert.equal(hash(Buffer.from(await response.arrayBuffer())),hash(bytes),'I66_PROPOSAL_UI_ARTIFACT_DRIFT');
  }
  checked('EXACT_BUILD_AND_UI_BYTES');
  uiCausalEvidence.uiBytesExact=true;
  enter('CANONICAL_CONTROL_READ');
  const realControlRef=item('cobrosLedgerControl','active');originalControl=await snapshot(realControlRef);
  assert.ok(originalControl?.activeRunId,'I66_PROPOSAL_REAL_CONTROL_MISSING');activeManifestRef=item('cobrosLedgerRuns',originalControl.activeRunId);originalManifest=await snapshot(activeManifestRef);
  enter('FIXTURE_ABSENCE');
  for(const ref of targetRefs)assert.equal((await ref.get()).exists,false,'I66_PROPOSAL_TARGET_PREEXISTED');
  assert.equal((await tenant.collection('reconciliationEvents').where('qaRunId','==',runId).limit(1).get()).empty,true,'I66_PROPOSAL_AUDIT_NAMESPACE_PREEXISTED');
  cleanupArmed=true;
  enter('SIGNED_SESSION');
  const actors=await staff();browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const direction=await sign(actors[0]),carlos=await sign(actors[1]);
  // Observe normal UI responses only for this exact synthetic proposal. Never
  // intercept, replay or modify a request. Real proposal responses are ignored.
  const requestStages=new WeakMap();
  direction.on('request',request=>{if(['UI_RESOLUTION_OPEN','UI_RESOLUTION_CONFIRM','UI_APPLICATION_CONFIRM'].includes(stage))requestStages.set(request,stage);});
  direction.on('response',response=>{
   const request=response.request(),uiStage=requestStages.get(request);if(!uiStage)return;
   let body;try{body=request.postDataJSON();}catch(_){return;}
   if(!ownedUiRequest(response.url(),body,cfg.phase,ids.proposal,runId))return;
   const operation=body.data.operation;
   // The apply observer below owns the response and its request/reload lineage.
   // Other UI observations remain diagnostic, never command failure evidence.
   if(operation==='apply_proposal_application'&&uiStage==='UI_APPLICATION_CONFIRM')return;
   diagnosticReads.push(response.json().then(result=>report.proposalDiagnostics.calls.push(projectUiResponse(result,operation,uiStage,ids.receipt)))
    .catch(error=>report.proposalDiagnostics.calls.push(projectUiObservationFailure(error,operation,uiStage,ids.receipt))));
  });
  if(cfg.phase==='PREVIEW'){
    enter('DIRECTION_LEGAL_ACCEPTANCE');
    report.directionLegalAcceptance=await acceptDirectionPreviewLegal({page:direction,actor:actors[0],cfg:{...cfg,source:cfg.sourceSha}});
    checked('EXPLICIT_DIRECTION_PREVIEW_LEGAL_DECISION_APPLIED_BY_NORMAL_UI');
  }else{
    enter('DIRECTION_LEGAL_ACCEPTANCE');
    report.directionLiveLegalAcceptance=await acceptDirectionLiveLegal({page:direction,actor:actors[0],cfg:{...cfg,source:cfg.sourceSha}});
    checked('EXPLICIT_DIRECTION_LIVE_LEGAL_DECISION_APPLIED_BY_NORMAL_UI');
  }
  enter('SYNTHETIC_STAGE_SETUP');
  const source={sourceRowId:prefix+'_source_row',sourceRowIdSha256:hash(prefix+'_source_row'),policyNumber:'QA-I66-'+nonce,currency:'GTQ',amount:173.23,reportedDate:'2026-11-15'};
  const hashes={sourceLedgerDigest:digest(source),packageLogicalSha256:digest({source,runId})};
  const stageProposal=makeStage('propuestasConciliacion',ids.proposal,TENANT,runId,source,hashes),stageEvidence=makeStage('evidenciasCobro',ids.source,TENANT,runId,source,hashes);
  const policy={id:ids.policy,...mark,clienteId:ids.client,numero:source.policyNumber,pais:'GT',moneda:'GTQ',estado:'Vigente',vigenciaDesde:'2026-01-01',vigenciaHasta:'2027-01-01'};
  const receipt={id:ids.receipt,...mark,polizaId:ids.policy,clienteId:ids.client,pais:'GT',moneda:'GTQ',monto:173.23,cuota:'1/1',vence:'2026-11-01',estado:'Pendiente'};
  const portfolio={id:ids.portfolio,...mark,polizaId:ids.policy,clienteId:ids.client,reciboId:ids.receipt,pais:'GT',moneda:'GTQ',monto:173.23,estado:'Pendiente',carteraActiva:true};
  await create(item('clientes',ids.client),{id:ids.client,...mark,pais:'GT',nombre:'I6.6 UAT sintética — no cliente real'});
  await create(item('polizas',ids.policy),policy);await create(item('recibosEsperados',ids.receipt),receipt);await create(item('carteraPrimas',ids.portfolio),portfolio);
  await create(runRef,{...mark,id:runId,runId,schemaVersion:'gi-i66-synthetic-proposal-ledger-v1',status:'ACTIVE',sourceLedgerCount:1,stageDocumentCount:2,...hashes});
  await create(controlRef,{...mark,activeRunId:runId,schemaVersion:'gi-i66-synthetic-proposal-pointer-v1',status:'ACTIVE',...hashes});
  await create(runRef.collection('propuestasConciliacion').doc(ids.proposal),stageProposal);await create(runRef.collection('evidenciasCobro').doc(ids.source),stageEvidence);
  checked('ISOLATED_SYNTHETIC_STAGE_NO_REAL_POINTER_CHANGE');
  enter('FIRST_PROPOSAL_PREREQUISITES');
  // Read-only observation of the same server-owned inputs used by the callable.
  // Only booleans and closed scope/outcome enums are retained in the report.
  try{
   const [configSnap,accessSnap,signed]=await Promise.all([
    tenant.collection('config').doc('reconciliation').get(),tenant.collection('config').doc('access').get(),
    direction.evaluate(async()=>{const p=Orbit.productRuntimeBrowserProvidersP0;await p.initialize();const user=await p.waitForUser();const token=await user.getIdTokenResult();
     return{uid:user.uid,activeRole:Orbit.session.rol(),giActiveRole:token.claims.giActiveRole??null};})
   ]);
   report.proposalDiagnostics.prerequisites=diagnoseProposalPrerequisites({member:actors[0].member,selectedUid:actors[0].uid,
    auth:{uid:signed.uid,token:{giActiveRole:signed.giActiveRole}},activeRole:signed.activeRole,tenantId:TENANT,policy,receipt,
    configExists:configSnap.exists,accessConfigExists:accessSnap.exists,reconciliationConfig:configSnap.exists?configSnap.data():{},accessConfig:accessSnap.exists?accessSnap.data():{}});
  }catch(error){report.proposalDiagnostics.prerequisites=safePrerequisites({status:'READ_FAILED',code:safeCode(error?.code)});}
  enter('FIRST_PROPOSAL_PREVIEW');
  const first=await rawCall(direction,'preview_proposal_application',proposalPayload);
  assert.equal(first.result?.reason,'SOURCE_RECEIPT_IDENTITY_MISSING','I66_PROPOSAL_FIRST_PREVIEW_REASON');
  assert.ok(Array.isArray(first.result?.resolutionOptions)&&first.result.resolutionOptions.some(row=>row.receiptId===ids.receipt),'I66_PROPOSAL_FIRST_PREVIEW_CANDIDATE');checked('SERVER_LOADED_EXACT_CANDIDATE');
  enter('OPERATIVE_ACCESS');
  const carlosAccess=await carlos.evaluate(async()=>{
   const canView=Orbit.access?.can('conciliaciones','view')===true;
   try{const result=await Orbit.productRuntimeBrowserProvidersP0.protectedReadPage({tenantId:'alianzas-soluciones',collection:'conciliaciones',country:'GT',activeRole:Orbit.session.rol(),pageSize:1});
     return {canView,serverAllowed:result?.ok===true,scope:result?.scope||''};}
   catch(_){return{canView,serverAllowed:false,scope:''};}
  });
  enter('OPERATIVE_PROPOSAL_PREVIEW');
  const operativoAssessment=await rawCall(carlos,'preview_proposal_application',proposalPayload);
  if(!carlosAccess.canView){
   assert.equal(carlosAccess.serverAllowed,false,'I66_PROPOSAL_OPERATIVO_UI_SERVER_VISIBILITY_DRIFT');
   assert.ok(operativoAssessment.denied||!operativoAssessment.result?.eligible&&!(operativoAssessment.result?.resolutionOptions||[]).length,'I66_PROPOSAL_UNASSIGNED_MODULE_EXPOSED');
   checked('SIGNED_OPERATIVO_UNASSIGNED_MODULE_DENIED');
  }else{
   assert.equal(carlosAccess.serverAllowed,true,'I66_PROPOSAL_OPERATIVO_GRANTED_MODULE_DENIED');
   if(carlosAccess.scope==='all'){
    assert.ok(!operativoAssessment.denied&&operativoAssessment.result?.resolutionOptions?.some(row=>row.receiptId===ids.receipt),'I66_PROPOSAL_OPERATIVO_FULL_PORTFOLIO_CANDIDATE_MISSING');
    checked('SIGNED_OPERATIVO_FULL_PORTFOLIO_READ_NO_ADVISOR_REQUIRED');
   }else{
    assert.ok(operativoAssessment.denied||!operativoAssessment.result?.eligible&&!(operativoAssessment.result?.resolutionOptions||[]).length,'I66_PROPOSAL_OPERATIVO_OUTSIDE_OWN_TEAM_SCOPE_EXPOSED');
    checked('SIGNED_OPERATIVO_ASSIGNED_MODULE_DATA_SCOPE_PRESERVED');
   }
  }
  enter('ADVISOR_ROLE_DENIAL');
  const advisorDenied=await rawCall(direction,'resolve_proposal_application',{...proposalPayload,policyId:ids.policy,receiptId:ids.receipt},'Asesor');assert.equal(advisorDenied.denied,true);
  checked('SIGNED_ADVISOR_RESOLUTION_REQUEST_DENIED');
  enter('CALLER_MONEY_DENIAL');
  const forbidden=await rawCall(direction,'apply_proposal_application',{...proposalPayload,amount:999});assert.equal(forbidden.denied,true);checked('CALLER_MONEY_OVERRIDE_DENIED');
  enter('FOREIGN_COUNTRY_DENIAL');
  await restoreQa(item('polizas',ids.policy),{...policy,pais:'ZZ'});
  const foreign=await rawCall(direction,'preview_proposal_application',proposalPayload);assert.ok(!foreign.result?.eligible&&!(foreign.result?.resolutionOptions||[]).length);
  await restoreQa(item('polizas',ids.policy),policy);checked('OUT_OF_SCOPE_COUNTRY_DENIED');
  enter('UI_RESOLUTION_OPEN');
  await direction.waitForFunction(()=>!!Orbit.modules?.conciliaciones?.verificarAplicacion,null,{timeout:30000});
  // Exercise the production UI owner with a clearly synthetic drawer; the QA
  // namespace is intentionally excluded from the customer's real proposal list.
  await direction.evaluate(async row=>{
   const back=document.createElement('div');back.id='i66-proposal-uat-drawer';back.style.cssText='position:fixed;inset:0;z-index:99999;background:white;padding:24px;overflow:auto';
   back.innerHTML='<div data-conc-application-status></div><div data-conc-application-targets></div><button data-conc-apply hidden disabled>Aprobar y aplicar</button>';
   document.body.appendChild(back);await Orbit.modules.conciliaciones.verificarAplicacion(row,back);
  },{sourceEntityId:ids.proposal,poliza:source.policyNumber,original:{origenLibroActivo:true,sourceRunId:runId}});
  const selected=first.result.resolutionOptions.findIndex(row=>row.receiptId===ids.receipt);
  await direction.locator('[data-conc-resolution-receipt]').selectOption(String(selected));
  await direction.locator('[data-conc-resolution-type]').selectOption('BANK_STATEMENT_MATCH');
  await direction.locator('[data-conc-resolution-date]').fill('2026-11-15');await direction.locator('[data-conc-resolution-paid]').fill('2026-11-14');
  await direction.locator('[data-conc-resolution-reason]').fill('UAT sintética autorizada I6.6; no cliente real');await direction.locator('[data-conc-resolution-attested]').check();
  enter('UI_RESOLUTION_CONFIRM');
  await direction.locator('[data-conc-resolve]').click();
  await direction.waitForFunction(()=>{const button=document.querySelector('#i66-proposal-uat-drawer [data-conc-apply]');return button&&!button.hidden&&!button.disabled;},null,{timeout:30000});
  enter('RESOLUTION_READBACK');
  const resolved=await snapshot(resolutionRef);assert.ok(owned(resolved,runId)&&resolved.sourceAttestation===true);
  assert.deepEqual(await snapshot(item('recibosEsperados',ids.receipt)),receipt);assert.deepEqual(await snapshot(item('carteraPrimas',ids.portfolio)),portfolio);assert.equal(await snapshot(item('cobros',cobroId)),null);
  checked('UI_BINDING_PERSISTED_WITH_ZERO_FINANCIAL_WRITES');
  enter('READY_PREVIEW');
  const ready=await rawCall(direction,'preview_proposal_application',proposalPayload);assert.equal(ready.result?.eligible,true);assert.equal(ready.result.targets[0].amount,173.23);
  // Replace only our own synthetic evidence, then verify a formerly valid
  // approval digest cannot apply while source facts have changed.
  enter('SOURCE_CHANGE_GUARD');
  const changed=makeStage('evidenciasCobro',ids.source,TENANT,runId,{...source,amount:174.23},hashes);
  await restoreQa(runRef.collection('evidenciasCobro').doc(ids.source),changed);
  const stale=await rawCall(direction,'apply_proposal_application',{...proposalPayload,planDigest:ready.result.planDigest});assert.equal(stale.result?.eligible,false);assert.equal(await snapshot(item('cobros',cobroId)),null);
  await restoreQa(runRef.collection('evidenciasCobro').doc(ids.source),stageEvidence);checked('STALE_SOURCE_APPLICATION_DENIED');
  enter('UI_APPLICATION_CONFIRM');
  assert.equal(await snapshot(applicationRef),null,'I66_PROPOSAL_UI_AUDIT_IDENTITY_DRIFT');
  assert.equal(await snapshot(item('cobros',cobroId)),null,'I66_PROPOSAL_UI_AUDIT_IDENTITY_DRIFT');
  assert.deepEqual(await snapshot(item('recibosEsperados',ids.receipt)),receipt,'I66_PROPOSAL_UI_AUDIT_IDENTITY_DRIFT');
  assert.deepEqual(await snapshot(item('carteraPrimas',ids.portfolio)),portfolio,'I66_PROPOSAL_UI_AUDIT_IDENTITY_DRIFT');
  uiCausalEvidence.beforeTargetsUnapplied=true;
  uiApplicationObserver=observeUiApplication(direction,{phase:cfg.phase,origin:cfg.origin,navigationUrl:direction.url(),actorRole:actors[0].role,
   proposalId:ids.proposal,sourceRunId:runId,planDigest:ready.result.planDigest,applicationId,policyId:ids.policy,receiptId:ids.receipt,
   cobroId,portfolioId:ids.portfolio,amount:173.23,currency:'GTQ'});
  await Promise.all([direction.waitForEvent('framenavigated',{predicate:frame=>frame===direction.mainFrame(),timeout:30000}),direction.locator('[data-conc-apply]').click()]);
  await direction.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
  enter('APPLICATION_RELOAD');
  const reload=await direction.evaluate(async()=>{const p=Orbit.productRuntimeBrowserProvidersP0;await p.initialize();const user=await p.waitForUser();const active=await Orbit.productAppP0.activate();return{started:active?.started===true,uid:user?.uid,role:Orbit.session?.rol?.()};});
  assert.ok(reload.started&&reload.uid===actors[0].uid&&norm(reload.role)===actors[0].role,'I66_PROPOSAL_UI_RELOAD_ACTOR_DRIFT');
  uiCausalEvidence.signedActorPreserved=true;
  enter('APPLICATION_READBACK');
  const [application,paid,cobro,closed]=await Promise.all([snapshot(applicationRef),snapshot(item('recibosEsperados',ids.receipt)),snapshot(item('cobros',cobroId)),snapshot(item('carteraPrimas',ids.portfolio))]);
  assert.ok(owned(application,runId)&&application.status==='APPLIED'&&application.beforeAfter.length===3);
  assert.deepEqual(Object.fromEntries(['id','tenantId','proposalId','sourceRunId','planDigest','resolutionId','sourceProposalDigest','sourceEvidenceDigest'].map(key=>[key,application[key]])),
   {id:applicationId,tenantId:TENANT,proposalId:ids.proposal,sourceRunId:runId,planDigest:ready.result.planDigest,resolutionId,
    sourceProposalDigest:stageProposal.payloadDigest,sourceEvidenceDigest:stageEvidence.payloadDigest},'I66_PROPOSAL_UI_AUDIT_IDENTITY_DRIFT');
  assert.ok(application.actor?.uid===actors[0].uid&&norm(application.actor?.activeRole)===actors[0].role,'I66_PROPOSAL_UI_AUDIT_IDENTITY_DRIFT');
  assert.deepEqual(application.beforeAfter.map(row=>({collection:row.collection,id:row.id,before:row.before})),[
   {collection:'recibosEsperados',id:ids.receipt,before:receipt},{collection:'cobros',id:cobroId,before:null},
   {collection:'carteraPrimas',id:ids.portfolio,before:portfolio}],'I66_PROPOSAL_UI_AUDIT_IDENTITY_DRIFT');
  uiCausalEvidence.applicationAuditExact=true;
  assert.equal(paid.paymentState,'PAID_DIRECT');assert.equal(cobro.monto,173.23);assert.equal(cobro.moneda,'GTQ');assert.equal(cobro.applicationState,'PENDING_APPLICATION');assert.equal(closed.carteraActiva,false);assert.equal(closed.cobroId,cobroId);
  assert.ok(paid.cobroId===cobroId&&cobro.reciboId===ids.receipt&&cobro.polizaId===ids.policy&&closed.reciboId===ids.receipt,'I66_PROPOSAL_UI_AUDIT_IDENTITY_DRIFT');
  uiCausalEvidence.atomicTargetsReadback=true;
  checked('UI_APPLY_RECEIPT_COBRO_PORTFOLIO_ATOMIC_PERSISTENCE_RELOAD');
  enter('IDEMPOTENT_REPLAY');
  const repeated=await rawCall(direction,'apply_proposal_application',{...proposalPayload,planDigest:ready.result.planDigest});assert.equal(repeated.result?.reused,true);assert.equal(repeated.result?.readbackConfirmed,true);
  assert.equal((await items('cobros').where('reciboId','==',ids.receipt).get()).size,1);checked('SECOND_APPLY_IDEMPOTENT_NO_DOUBLE_PAYMENT');
  uiCausalEvidence.idempotentReplayConfirmed=true;
  enter('SOURCE_IMMUTABILITY');
  assert.deepEqual(await snapshot(runRef.collection('propuestasConciliacion').doc(ids.proposal)),stageProposal);assert.deepEqual(await snapshot(runRef.collection('evidenciasCobro').doc(ids.source)),stageEvidence);
  checked('IMMUTABLE_SOURCE_UNCHANGED_AFTER_APPLICATION');
  uiCausalEvidence.immutableSourceUnchanged=true;
  const observation=await uiApplicationObserver.seal();
  report.uiApplicationConfirmation=safeUiApplicationEvidence({status:'HOLD',observation,causalEvidence:uiCausalEvidence});
  report.proposalDiagnostics.calls.push(safeCallableDiagnostic({stage:'UI_APPLICATION_CONFIRM',channel:'UI',operation:'apply_proposal_application',
   resultPresent:observation.bodyReadState==='CAPTURED',denied:observation.commandDenied,driverFailed:false,observerFailed:observation.observerFailed,
   observerFailureClass:observation.observerFailureClass,observerFailureCode:observation.observerFailureCode,
   readbackConfirmed:observation.responseConfirmed===true?true:null,reason:'NO_REASON'}));
  report.uiApplicationConfirmation=validateUiApplicationEvidence(observation,uiCausalEvidence);
  checked('UI_APPLICATION_RESPONSE_OR_CAUSAL_RELOAD_READBACK_EXACT');

  // A separate, bounded QA namespace exercises the ordinary file picker,
  // mapping/review, source-only command and durable readback. The exact permit
  // is seeded here, never by the UI, and never under the real ledger pointer.
  enter('SOURCE_INTAKE_PREPARE');report.sourceIntake={status:'HOLD',syntheticOnly:true,stage:'SOURCE_INTAKE_PREPARE',consoleErrors:0,pageErrors:0,httpErrors:0};
  const intakeConsole=message=>{if(message.type()==='error')report.sourceIntake.consoleErrors++;},intakePageError=error=>{recordSourceIntakePageError(report.sourceIntake,error,stage);};
  const intakeHttp=response=>{if(response.status()>=400&&(response.url().startsWith(cfg.origin+'/')||response.url().startsWith('https://us-central1-'+PROJECT+'.cloudfunctions.net/')))report.sourceIntake.httpErrors++;};
  direction.on('console',intakeConsole);direction.on('pageerror',intakePageError);direction.on('response',intakeHttp);
  intakeDiagnosticsStop=()=>{direction.off('console',intakeConsole);direction.off('pageerror',intakePageError);direction.off('response',intakeHttp);};
  const insurerSnap=await items('aseguradoras').select('pais','tenantId').limit(100).get();assert.ok(insurerSnap.size<100,'I66_INTAKE_INSURER_BOUND');
  const insurers=insurerSnap.docs.filter(d=>d.data().pais==='GT'&&(!d.data().tenantId||d.data().tenantId===TENANT)&&!/^b3005qa_/.test(d.id)).sort((a,b)=>a.id.localeCompare(b.id));
  assert.ok(insurers.length,'I66_INTAKE_CANONICAL_INSURER_REQUIRED');
  const fixture=sourceIntakeFixture(nonce,insurers[0].id,actors[0].uid),intakeRun=item('cobrosLedgerQaRuns',fixture.qaRunId),intakeControl=item('cobrosLedgerQaControl',fixture.qaRunId);
  const sourceKey=fixture.input.sourceKey,rowKey=fixture.input.rows[0].key,requestKey='srcintake_'+fixture.input.batchDigest.slice(0,40);
  const intakeRefs=[item('clientes',fixture.ids.client),item('polizas',fixture.ids.policy),item('recibosEsperados',fixture.ids.receipt),item('carteraPrimas',fixture.ids.portfolio),item('cobros',fixture.cobroId),
   intakeRun.collection('evidenciasCobro').doc('srcev_'+rowKey.slice(0,40)),intakeRun.collection('propuestasConciliacion').doc('b3005qa_i66_proposal_'+rowKey.slice(0,40)),
   intakeRun.collection('intake_sources').doc(sourceKey),intakeRun.collection('intake_rows').doc(rowKey),intakeRun.collection('intakeRequests').doc(requestKey),intakeRun.collection('intakeAudit').doc(requestKey),intakeRun,intakeControl];
  for(const ref of intakeRefs){assert.equal((await ref.get()).exists,false,'I66_INTAKE_TARGET_PREEXISTED');targetRefs.push(ref);additionalTargetOwners.set(ref.path,fixture.qaRunId);}
  await create(item('clientes',fixture.ids.client),{id:fixture.ids.client,...fixture.mark,pais:'GT',nombre:'I6.6 fuente sintética — no cliente real'});
  await create(item('polizas',fixture.ids.policy),fixture.policy);await create(item('recibosEsperados',fixture.ids.receipt),fixture.receipt);await create(item('carteraPrimas',fixture.ids.portfolio),fixture.portfolio);await create(intakeControl,fixture.permission);
  checked('SOURCE_INTAKE_EXACT_QA_AUTHORITY_ISOLATED');
  const openSourceUi=async()=>{
  enter('SOURCE_INTAKE_UI_OPEN');report.sourceIntake.stage='SOURCE_INTAKE_UI_OPEN';
  await direction.goto(cfg.origin+'/#/importar',{waitUntil:'commit',timeout:30000});
  await direction.waitForFunction(()=>!!window.Orbit?.modules?.importar&&!!window.Orbit?.importa,null,{timeout:30000});
  await direction.waitForFunction(()=>!!document.querySelector('[data-k="estados-cuenta"]'),null,{timeout:30000});
  await direction.locator('[data-k="estados-cuenta"]').click();
  await direction.locator('#imp-file').setInputFiles({name:fixture.payload.source.fileName,mimeType:'text/csv',buffer:fixture.bytes});
  await direction.waitForFunction(()=>document.querySelector('[data-intake-original]')?.textContent?.includes('SHA256'),null,{timeout:30000});
  for(const field of ['sourceId','documentRef','evidenceAsOfDate'])await direction.locator('[data-intake-field="'+field+'"]').fill(fixture.payload.source[field]);
  await direction.waitForFunction(id=>Array.from(document.querySelector('[data-intake-field="insurerId"]')?.options||[]).some(o=>o.value===id),fixture.payload.source.insurerId,{timeout:30000});
  for(const field of ['insurerId','country','currency','evidenceType'])await direction.locator('[data-intake-field="'+field+'"]').selectOption(fixture.payload.source[field]);
  await direction.locator('[data-intake-field="sourceAttestation"]').check();await direction.locator('[data-intake-field="reason"]').fill('I6.6 fuente sintética autorizada: guardar evidencia y propuesta, sin aplicar dinero');
  await direction.locator('[data-intake-preview]').click();await direction.waitForFunction(()=>document.querySelector('[data-intake-submit]')?.disabled===false,null,{timeout:30000});
  };
  await openSourceUi();
  enter('SOURCE_INTAKE_UI_SUBMIT');report.sourceIntake.stage='SOURCE_INTAKE_UI_SUBMIT';
  const responses=[];const observeIntake=async()=>{
   const pending=direction.waitForResponse(r=>intakeUiRequest(r.request(),fixture,cfg),{timeout:30000});
   await direction.locator('[data-intake-submit]').click();const response=await pending;assert.equal(response.status(),200,'I66_INTAKE_UI_HTTP');
   const body=await response.json(),out=body.result??body.data;
   assert.ok(out?.ok===true&&out.readbackConfirmed===true&&out.financialWrites===0&&out.sourceRunId===fixture.qaRunId&&out.sourceSha256===fixture.payload.source.sha256&&out.sourceDigest===fixture.input.sourceDigest,'I66_INTAKE_UI_READBACK');
   responses.push(out);await direction.waitForFunction(()=>document.querySelector('[data-intake-conciliaciones]')?.hidden===false,null,{timeout:30000});return out;
  };
  const intakeResult=await observeIntake();assert.equal(intakeResult.status,'SOURCE_RUN_STORED','I66_INTAKE_UI_READBACK');assert.deepEqual(intakeResult.counts,{sourceRows:1,proposals:1,holds:0,supportingRows:0,duplicates:0},'I66_INTAKE_UI_COUNTS');
  checked('SOURCE_INTAKE_NORMAL_UI_EXACT_BYTES_DURABLE_RESPONSE');
  enter('SOURCE_INTAKE_RELOAD_READBACK');report.sourceIntake.stage='SOURCE_INTAKE_RELOAD_READBACK';
  await direction.locator('[data-intake-conciliaciones]').click();await direction.reload({waitUntil:'commit',timeout:30000});
  await direction.waitForFunction(()=>!!window.Orbit?.productAppP0&&!!window.Orbit?.productRuntimeBrowserProvidersP0,null,{timeout:30000});
  const intakeActor=await direction.evaluate(async()=>{const p=Orbit.productRuntimeBrowserProvidersP0;await p.initialize();const user=await p.waitForUser();await Orbit.productAppP0.activate();return{uid:user?.uid,role:Orbit.session?.rol?.()};});
  assert.ok(intakeActor.uid===actors[0].uid&&norm(intakeActor.role)==='direccion','I66_INTAKE_RELOAD_ACTOR');
  const manifest=await snapshot(intakeRun),pointer=await snapshot(intakeControl),requestRecord=await snapshot(intakeRun.collection('intakeRequests').doc(requestKey));
  assert.ok(owned(manifest,fixture.qaRunId)&&owned(pointer,fixture.qaRunId)&&owned(requestRecord,fixture.qaRunId),'I66_INTAKE_READBACK_OWNERSHIP');
  sourceIntake.validateSourceRunContract(pointer,manifest,TENANT);assert.equal(manifest.source.sha256,fixture.payload.source.sha256,'I66_INTAKE_SOURCE_IMMUTABLE');assert.equal(manifest.sourceDigest,fixture.input.sourceDigest,'I66_INTAKE_SOURCE_IMMUTABLE');
  assert.deepEqual(requestRecord.result,intakeResult?Object.fromEntries(Object.entries(intakeResult).filter(([k])=>k!=='readbackConfirmed')):null,'I66_INTAKE_COMMIT_RECEIPT_EXACT');
  for(const ref of intakeRefs.filter(r=>r.path.includes('/intake_')||r.path.includes('/intakeRequests/')||r.path.includes('/intakeAudit/')||r.path.includes('/evidenciasCobro/')||r.path.includes('/propuestasConciliacion/')))assert.ok(owned(await snapshot(ref),fixture.qaRunId),'I66_INTAKE_READBACK_OWNERSHIP');
  assert.deepEqual(await snapshot(item('polizas',fixture.ids.policy)),fixture.policy,'I66_INTAKE_FINANCIAL_TARGET_UNCHANGED');assert.deepEqual(await snapshot(item('recibosEsperados',fixture.ids.receipt)),fixture.receipt,'I66_INTAKE_FINANCIAL_TARGET_UNCHANGED');assert.deepEqual(await snapshot(item('carteraPrimas',fixture.ids.portfolio)),fixture.portfolio,'I66_INTAKE_FINANCIAL_TARGET_UNCHANGED');assert.equal(await snapshot(item('cobros',fixture.cobroId)),null,'I66_INTAKE_FINANCIAL_TARGET_UNCHANGED');
  assert.equal((await tenant.collection('reconciliationEvents').where('qaRunId','==',fixture.qaRunId).limit(1).get()).empty,true,'I66_INTAKE_NO_PAYMENT_EVENTS');
  assert.deepEqual(await snapshot(realControlRef),originalControl);assert.deepEqual(await snapshot(activeManifestRef),originalManifest);
  checked('SOURCE_INTAKE_RELOAD_LEDGER_READBACK_ZERO_FINANCIAL_WRITES');
  await openSourceUi();enter('SOURCE_INTAKE_UI_REPLAY');report.sourceIntake.stage='SOURCE_INTAKE_UI_REPLAY';
  const replayedIntake=await observeIntake();assert.equal(replayedIntake.status,'SOURCE_RUN_REUSED','I66_INTAKE_REPLAY_EXACT');assert.equal(replayedIntake.intakeWrites,0,'I66_INTAKE_REPLAY_EXACT');
  assert.deepEqual(replayedIntake.proposalIds,intakeResult.proposalIds,'I66_INTAKE_REPLAY_EXACT');assert.deepEqual(replayedIntake.counts,intakeResult.counts,'I66_INTAKE_REPLAY_EXACT');
  assert.deepEqual(await snapshot(intakeRun),manifest,'I66_INTAKE_SOURCE_IMMUTABLE');assert.deepEqual(await snapshot(intakeRun.collection('intakeRequests').doc(requestKey)),requestRecord,'I66_INTAKE_SOURCE_IMMUTABLE');
  assert.equal((await intakeRun.collection('evidenciasCobro').get()).size,1,'I66_INTAKE_REPLAY_EXACT');assert.equal((await intakeRun.collection('propuestasConciliacion').get()).size,1,'I66_INTAKE_REPLAY_EXACT');
  assert.deepEqual(await snapshot(item('recibosEsperados',fixture.ids.receipt)),fixture.receipt,'I66_INTAKE_FINANCIAL_TARGET_UNCHANGED');assert.equal(await snapshot(item('cobros',fixture.cobroId)),null,'I66_INTAKE_FINANCIAL_TARGET_UNCHANGED');
  checked('SOURCE_INTAKE_NORMAL_UI_REPLAY_NO_DUPLICATE_SOURCE_OR_PAYMENT');
  intakeDiagnosticsStop();intakeDiagnosticsStop=null;assert.ok(report.sourceIntake.consoleErrors===0&&report.sourceIntake.pageErrors===0&&report.sourceIntake.httpErrors===0,'I66_INTAKE_BROWSER_ERRORS');
  enter('SOURCE_INTAKE_COMPLETE');report.sourceIntake=safeSourceIntakeEvidence({...report.sourceIntake,status:'PASS',syntheticOnly:true,stage:'SOURCE_INTAKE_COMPLETE',sourceFileHashVerified:true,sourceMetadataDigestVerified:true,normalUiRequest:true,normalUiResponseConfirmed:true,
   readbackAfterReload:true,signedActorPreserved:true,realLedgerPointerUnchanged:true,financialWrites:0,sourceRows:1,proposals:1,holds:0,countsExact:true,qaAuthorityExact:true,normalUiIdempotentReplay:true,replayIntakeWrites:0});
  if(documentaryBinding){
   report.documentaryPayments=await exerciseDocumentaryPayments({page:direction,actor:actors[0],cfg,tenant,item,nonce,binding:documentaryBinding,buildId:report.buildId});
   checked('DOCUMENTARY_PAYMENT_TWO_SOURCES_NORMAL_UI_READBACK_RELOAD_REPLAY_RESTORE');
  }
 }catch(error){failure=error;if(error.documentaryPaymentEvidence)report.documentaryPayments=error.documentaryPaymentEvidence;Object.assign(report,failureDetails(error,stage));}
 finally{
  if(intakeDiagnosticsStop){intakeDiagnosticsStop();intakeDiagnosticsStop=null;}
  if(report.sourceIntake)report.sourceIntake=safeSourceIntakeEvidence(report.sourceIntake);
  enter('SYNTHETIC_RESTORE');
  const cleanupErrors=[];
  // Only records proven to belong to this exact QA execution are removable.
  // No collection deletion, broad prefix deletion, or real record restoration.
  try{
   let removed=0;
   if(cleanupArmed){
   const events=await tenant.collection('reconciliationEvents').where('qaRunId','==',runId).limit(20).get();assert.ok(events.size<20,'I66_PROPOSAL_AUDIT_CLEANUP_BOUND');
   for(const doc of events.docs)if(!targetRefs.some(ref=>ref.path===doc.ref.path))targetRefs.push(doc.ref);
   for(const ref of targetRefs){const s=await ref.get();if(!s.exists)continue;
    if(!owned(s.data(),additionalTargetOwners.get(ref.path)||runId)){cleanupErrors.push('NON_OWNED_TARGET');continue;}
    await ref.delete({lastUpdateTime:s.updateTime});assert.equal((await ref.get()).exists,false,'I66_PROPOSAL_CLEANUP_READBACK');removed++;
   }
   }
   const remaining=cleanupArmed?(await Promise.all(targetRefs.map(ref=>ref.get()))).filter(s=>s.exists).length:0;
   if(originalControl){assert.deepEqual(await snapshot(item('cobrosLedgerControl','active')),originalControl);assert.deepEqual(await snapshot(activeManifestRef),originalManifest);report.realControlUnchanged=true;}
   report.cleanup={status:cleanupErrors.length||remaining?'HOLD':'PASS',remaining,removedOwnedTargets:removed,errors:cleanupErrors};
  }catch(error){report.cleanup={status:'HOLD',remaining:null,errorCode:safeCode(error?.code)};if(!failure)Object.assign(report,failureDetails(error,stage));failure=failure||error;}
  for(const context of sessions)try{await context.close();}catch(_){}
  if(uiApplicationObserver){
   if(!report.uiApplicationConfirmation)report.uiApplicationConfirmation=safeUiApplicationEvidence({status:'HOLD',observation:uiApplicationObserver.snapshot(),causalEvidence:uiCausalEvidence});
   uiApplicationObserver.dispose();
  }
  // Closing contexts settles body reads even when an observed UI request failed.
  // Observational diagnostics must never hold the ownership cleanup/report open.
  await Promise.allSettled(diagnosticReads);
  if(browser)await browser.close();
  report.status=!failure&&report.cleanup.status==='PASS'&&report.realControlUnchanged?'PASS':'HOLD';
  fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
 }
 console.log(JSON.stringify({sourceSha:report.sourceSha,phase:report.phase,status:report.status,checks:report.checks.length,cleanup:report.cleanup,realControlUnchanged:report.realControlUnchanged}));
 if(report.status!=='PASS')throw failure||Error('I66_PROPOSAL_SIGNED_UAT_HOLD');
}
module.exports={SCOPED_HISTORICAL_JOURNEY_SCHEMA,validateScopedHistoricalContext,scopedHistoricalFixture,assertScopedHistoricalReadback,exerciseScopedHistoricalPayment,runScopedHistoricalPaymentJourneys,validateEnvironment,owned,makeStage,sourceIntakeFixture,intakeUiRequest,DOCUMENTARY_PAYMENT_QA_PROFILE,DOCUMENTARY_PAYMENT_QA_RECEIPT,DOCUMENTARY_PAYMENT_QA_SUCCESSOR_RECEIPT,DOCUMENTARY_PAYMENT_SOURCES,
 validateDocumentaryPaymentQaBinding,documentaryPaymentFixture,documentaryPaymentRequest,assertDocumentaryPaymentOwned,assertDocumentaryPaymentReadback,validateDocumentaryPaymentUiEvidence,exerciseDocumentaryPayments};
if(require.main===module)main().catch(error=>{const safe=failureDetails(error,'BOOT');console.error('I66_PROPOSAL_SIGNED_UAT_HOLD '+safe.failureCode+' '+safe.failureCheck);process.exitCode=1;});
