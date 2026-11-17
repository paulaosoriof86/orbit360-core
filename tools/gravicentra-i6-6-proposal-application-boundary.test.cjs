'use strict';
// Execute the actual callable handler against an isolated transactional test
// double. No Firebase SDK, credentials, network, or production writes.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),fromDomain=createRequire(path.join(root,'functions/cobros-reconciliation-domain.js'));
const contract=require('../functions/cobros-ledger-contract');
const {digest}=require('../functions/proposal-application-boundary');
const copy=x=>x==null?x:structuredClone(x);
// Firestore field transforms are legal in map fields, but never inside arrays.
// The previous in-memory transaction double accepted these invalid writes,
// masking the production callable failure at application commit.
function assertNoArrayTransforms(value,inArray=false){
 if(value&&typeof value==='object'&&value.__testServerTimestamp===true)
  assert.equal(inArray,false,'Firestore FieldValue.serverTimestamp() cannot be used inside arrays');
 if(Array.isArray(value))for(const item of value)assertNoArrayTransforms(item,true);
 else if(value&&typeof value==='object')for(const item of Object.values(value))assertNoArrayTransforms(item,inArray);
}
let documents=new Map(),writeCount=0,transactionTail=Promise.resolve();
class Ref{
 constructor(parts,filters=[],max=Infinity){this.parts=parts;this.filters=filters;this.max=max;this.id=parts[parts.length-1];this.path=parts.join('/');}
 collection(name){return new Ref([...this.parts,name]);} doc(id){return new Ref([...this.parts,id]);}
 where(field,op,value){assert.equal(op,'==');return new Ref(this.parts,[...this.filters,[field,value]],this.max);}
 limit(n){return new Ref(this.parts,this.filters,n);}
 async get(){return snapshot(this,documents);}
}
function snapshot(ref,store){
 if(ref.parts.length%2===0){const row=store.get(ref.path);return{id:ref.id,ref,exists:!!row,data:()=>copy(row)};}
 const docs=[...store.entries()].filter(([key,row])=>key.startsWith(ref.path+'/')&&key.split('/').length===ref.parts.length+1&&ref.filters.every(([k,v])=>row[k]===v))
  .slice(0,ref.max).map(([key,row])=>({id:key.split('/').pop(),ref:new Ref(key.split('/')),exists:true,data:()=>copy(row)}));
 return{docs,size:docs.length,empty:docs.length===0};
}
const db={collection:name=>new Ref([name]),runTransaction:fn=>{
 const pending=transactionTail.then(async()=>{
  const working=new Map([...documents.entries()].map(([k,v])=>[k,copy(v)]));let writes=0,writing=false;
  const tx={get:async ref=>{assert.equal(writing,false,'Firestore transactions must finish all reads before writes');return snapshot(ref,working);},
   set:(ref,data,options)=>{assertNoArrayTransforms(data);writing=true;writes++;working.set(ref.path,options&&options.merge?Object.assign({},working.get(ref.path)||{},copy(data)):copy(data));}};
  const out=await fn(tx);documents=working;writeCount+=writes;return out;
 });
 transactionTail=pending.catch(()=>{});return pending;
}};
class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
const exportsObject={};
vm.runInNewContext(fs.readFileSync(path.join(root,'functions/cobros-reconciliation-domain.js'),'utf8'),{
 exports:exportsObject,process:{env:{}},console,
 require:name=>name==='firebase-admin/app'?{getApps:()=>[{}],initializeApp:()=>({})}:
  name==='firebase-admin/firestore'?{getFirestore:()=>db,FieldValue:{serverTimestamp:()=>({__testServerTimestamp:true})}}:
  name==='firebase-functions/v2/https'?{HttpsError,onCall:(_,handler)=>({run:handler})}:fromDomain(name)
});
const command=exportsObject.orbit360CobrosReconciliationCommand;
const tenant='qa-proposals',runId='cobledger_'+'a'.repeat(28),proposalId='qa_proposal_001',evidenceId='qa_evidence_001';
const base='tenants/'+tenant;
const item=(collection,id)=>base+'/data/'+collection+'/items/'+id;
const stage=(collection,id)=>item('cobrosLedgerRuns',runId)+'/'+collection+'/'+id;
const set=(key,row)=>documents.set(key,copy(row));
const sourceHash=digest('synthetic-source-row');
function stageRow(kind,id,extra={}){
 const original={documentId:id,tenantId:tenant,sourceRowId:'qa_source_row',sourceRowIdSha256:sourceHash,
   policyNumber:'QA-POLICY-001',currency:'GTQ',reportedDate:'2026-11-10',amount:100,...extra};
 return{...original,runId,documentClass:kind,activationState:'STAGED',sourceLedgerDigest:contract.SOURCE_LEDGER_DIGEST,
   packageLogicalSha256:contract.PACKAGE_LOGICAL_SHA256,payloadDigest:digest(original)};
}
function seed(extraEvidence={}){
 documents=new Map();writeCount=0;
 set(base+'/members/direction',{uid:'direction',tenantId:tenant,status:'active',roles:['Dirección'],countries:['GT'],dataScopes:{default:'all'}});
 set(base+'/members/advisor',{uid:'advisor',tenantId:tenant,status:'active',roles:['Asesor'],countries:['GT'],dataScopes:{default:'own'}});
 set(base+'/members/foreign-country',{uid:'foreign-country',tenantId:tenant,status:'active',roles:['Dirección'],countries:['CO'],dataScopes:{default:'all'}});
 set(base+'/config/access',{roleScopes:{direccion:'all',operativo:'all',finanzas:'all',asesor:'own'}});
 set(base+'/config/reconciliation',{autoCommitHighConfidence:true,requireSameCurrency:true});
 const aggregate='b'.repeat(64);
 set(item('cobrosLedgerControl','active'),{id:'active',schemaVersion:contract.POINTER_SCHEMA,status:'ACTIVE',activeRunId:runId,
  sourceLedgerCount:contract.SOURCE_LEDGER_COUNT,sourceLedgerDigest:contract.SOURCE_LEDGER_DIGEST,
  packageLogicalSha256:contract.PACKAGE_LOGICAL_SHA256,aggregateDigest:aggregate,activatedAt:'2026-11-01'});
 set(item('cobrosLedgerRuns',runId),{id:runId,runId,tenantId:tenant,schemaVersion:contract.MANIFEST_SCHEMA,
  gateId:contract.GATE_ID,contractVersion:contract.CONTRACT_VERSION,status:'ACTIVE',activationState:'ACTIVE',activatedAt:'2026-11-01',
  sourceLedgerCount:contract.SOURCE_LEDGER_COUNT,sourceLedgerDigest:contract.SOURCE_LEDGER_DIGEST,
  packageLogicalSha256:contract.PACKAGE_LOGICAL_SHA256,expectedAggregateDigest:aggregate,
  expectedCounts:contract.EXPECTED_COUNTS,stageDocumentCount:contract.STAGE_DOCUMENT_COUNT,
  newCobros:0,receiptWrites:0,policyWrites:0,finmovWrites:0});
 set(stage('propuestasConciliacion',proposalId),stageRow('propuestasConciliacion',proposalId));
 set(stage('evidenciasCobro',evidenceId),stageRow('evidenciasCobro',evidenceId,
   {evidenceType:'BANK_STATEMENT_MATCH',receiptId:'qa_receipt',paymentConfirmed:true,paidDate:'2026-11-10',...extraEvidence}));
 set(item('polizas','qa_policy'),{id:'qa_policy',tenantId:tenant,numero:'QA-POLICY-001',clienteId:'qa_client',pais:'GT',moneda:'GTQ',vigenciaDesde:'2026-01-01',vigenciaHasta:'2027-01-01'});
 set(item('recibosEsperados','qa_receipt'),{id:'qa_receipt',tenantId:tenant,polizaId:'qa_policy',clienteId:'qa_client',pais:'GT',moneda:'GTQ',monto:100,cuota:'1/1',vence:'2026-11-01',estado:'Pendiente'});
 set(item('carteraPrimas','qa_portfolio'),{id:'qa_portfolio',tenantId:tenant,polizaId:'qa_policy',clienteId:'qa_client',reciboId:'qa_receipt',pais:'GT',moneda:'GTQ',monto:100,estado:'Pendiente',carteraActiva:true});
}
const request=(operation,payload,uid='direction',role='Dirección')=>({auth:{uid,token:{}},data:{tenantId:tenant,activeRole:role,operation,payload,reason:'Prueba sintética autorizada'}});
const preview=(uid='direction',role='Dirección')=>command.run(request('preview_proposal_application',{proposalId,sourceRunId:runId},uid,role));
const apply=planDigest=>command.run(request('apply_proposal_application',{proposalId,sourceRunId:runId,planDigest}));
const binding={proposalId,sourceRunId:runId,policyId:'qa_policy',receiptId:'qa_receipt',evidenceType:'BANK_STATEMENT_MATCH',
 evidenceAsOfDate:'2026-11-10',paidDate:'2026-11-10',sourceAttestation:true};
const resolve=(patch={},uid='direction',role='Dirección')=>command.run(request('resolve_proposal_application',{...binding,...patch},uid,role));
let checks=0;
const checkReview=async(extraEvidence,reason)=>{
 seed(extraEvidence);const out=await preview();assert.equal(out.eligible,false);assert.equal(out.reason,reason);assert.equal(writeCount,0);checks++;
};
(async()=>{
 await checkReview({amount:999},'SOURCE_RECEIPT_AMOUNT_MISMATCH');
 await checkReview({receiptId:''},'SOURCE_RECEIPT_IDENTITY_MISSING');
 await checkReview({evidenceType:''},'SOURCE_EVIDENCE_TYPE_MISSING');
 await checkReview({paymentConfirmed:false},'SOURCE_BANK_PAYMENT_NOT_PROVEN');
 await checkReview({currency:'USD'},'SOURCE_RECEIPT_CURRENCY_MISMATCH');
 await checkReview({partialPayment:true},'SOURCE_PARTIAL_PAYMENT_REQUIRES_ALLOCATION');
 seed();const bad=documents.get(stage('evidenciasCobro',evidenceId));bad.amount=200;
 assert.equal((await preview()).reason,'SOURCE_LEDGER_INTEGRITY_MISMATCH');assert.equal(writeCount,0);checks++;
 seed();await assert.rejects(()=>preview('advisor','Asesor'),e=>e.code==='permission-denied');assert.equal(writeCount,0);checks++;
 seed();await assert.rejects(()=>preview('direction','SuperAdmin'),e=>e.code==='permission-denied');checks++;
 seed();assert.equal((await preview('foreign-country')).eligible,false);assert.equal(writeCount,0);checks++;
 seed();documents.get(base+'/members/direction').modulesRestricted=['conciliaciones'];
 assert.equal((await preview()).eligible,false);assert.equal(writeCount,0);checks++;
 seed();documents.get(base+'/config/access').roleScopes.direccion='own';documents.get(base+'/members/direction').advisorId='qa_advisor_a';
 documents.get(item('polizas','qa_policy')).asesorId='qa_advisor_b';
 assert.equal((await preview()).eligible,false);assert.equal(writeCount,0);checks++;
 seed();const oldRun=request('preview_proposal_application',{proposalId,sourceRunId:'cobledger_'+'c'.repeat(28)});
 assert.equal((await command.run(oldRun)).reason,'SOURCE_ACTIVE_RUN_CHANGED');assert.equal(writeCount,0);checks++;
 seed({receiptId:'',receiptNumber:'QA-RECEIPT'});documents.get(item('recibosEsperados','qa_receipt')).numeroReciboFuente='QA-RECEIPT';
 set(item('polizas','qa_policy_old'),{id:'qa_policy_old',tenantId:tenant,numero:'QA-POLICY-001',clienteId:'qa_client',pais:'GT',moneda:'GTQ',vigenciaDesde:'2025-01-01',vigenciaHasta:'2026-01-01'});
 set(item('recibosEsperados','qa_receipt_old'),{id:'qa_receipt_old',tenantId:tenant,polizaId:'qa_policy_old',clienteId:'qa_client',pais:'GT',moneda:'GTQ',monto:100,cuota:'1/1',numeroReciboFuente:'QA-RECEIPT',vence:'2025-11-01',estado:'Pendiente'});
 assert.equal((await preview()).reason,'SOURCE_POLICY_EDITION_AMBIGUOUS');assert.equal(writeCount,0);checks++;
 set(stage('evidenciasCobro',evidenceId),stageRow('evidenciasCobro',evidenceId,{evidenceType:'BANK_STATEMENT_MATCH',receiptNumber:'QA-RECEIPT',paymentConfirmed:true,vigenciaDesde:'2026-01-01',vigenciaHasta:'2027-01-01'}));
 assert.equal((await preview()).eligible,true);assert.equal(writeCount,0);checks++;
 seed();await assert.rejects(()=>command.run(request('apply_proposal_application',{proposalId,sourceRunId:runId,amount:999})),e=>e.message==='PROPOSAL_CALLER_FINANCIAL_PAYLOAD_DENIED');checks++;
 seed();const stale=await preview();assert.equal(stale.eligible,true);documents.get(item('recibosEsperados','qa_receipt')).vence='2026-11-02';
 assert.equal((await apply(stale.planDigest)).reason,'PROPOSAL_PLAN_CHANGED');assert.equal(writeCount,0);checks++;
 seed();const stageBefore=[...documents.entries()].filter(([key])=>key.includes('/'+runId+'/'));
 const ready=await preview();assert.equal(ready.eligible,true);assert.equal(ready.targets.length,1);assert.equal(writeCount,0);checks++;
 const reserved=request('reconcile_evidence',{policyId:'qa_policy',receiptId:'qa_receipt',evidenceType:'BANK_STATEMENT_MATCH',evidenceId:'fake',amount:100,currency:'GTQ'});
 reserved.data.requestId='propapp_not_a_browser_request';
 await assert.rejects(()=>command.run(reserved),e=>e.message==='PROPOSAL_REQUEST_ID_RESERVED');assert.equal(writeCount,0);checks++;
 const [one,two]=await Promise.all([apply(ready.planDigest),apply(ready.planDigest)]);
 assert.equal(one.readbackConfirmed,true);assert.equal(two.readbackConfirmed,true);assert.equal(two.reused,true);checks++;
 const cobros=[...documents.entries()].filter(([key])=>key.startsWith(item('cobros','')));
 assert.equal(cobros.length,1);assert.equal(cobros[0][1].monto,100);checks++;
 assert.equal(documents.get(item('recibosEsperados','qa_receipt')).paymentState,'PAID_DIRECT');
 assert.equal(documents.get(item('carteraPrimas','qa_portfolio')).carteraActiva,false);checks++;
 assert.deepEqual([...documents.entries()].filter(([key])=>key.includes('/'+runId+'/')),stageBefore,'staging must remain unchanged');checks++;
 const app=documents.get(item('reconciliationApplications',one.applicationId));
 assert.equal(app.status,'APPLIED');assert.equal(app.beforeAfter.length,3);assert.equal(app.actor.activeRole,'direccion');checks++;
 for(const row of app.beforeAfter){
  assertNoArrayTransforms(row.after,true);
  assert.equal(row.after.updatedAt,'SERVER_TIMESTAMP_ON_COMMIT','audit documents must declare the server-owned timestamp transform explicitly');
 }
 checks++;
 const priorWrites=writeCount;const reload=await preview();assert.equal(reload.readbackConfirmed,true);assert.equal(reload.reused,true);assert.equal(writeCount,priorWrites);checks++;
 // Different request IDs cannot create another application from the same source.
 const forged=request('apply_proposal_application',{proposalId,sourceRunId:runId,planDigest:ready.planDigest});forged.data.requestId='random-browser-retry';
 assert.equal((await command.run(forged)).reused,true);assert.equal(writeCount,priorWrites);checks++;
 // A persisted receipt changing after apply must never produce a false readback PASS.
 documents.get(item('recibosEsperados','qa_receipt')).paymentState='PENDING';
 await assert.rejects(()=>preview(),e=>e.code==='data-loss');checks++;
 seed({evidenceType:'COMMISSION_STATEMENT_INSTALLMENT_N',amount:12.5,paymentConfirmed:false});
 const commission=await preview();assert.equal(commission.eligible,true);assert.equal(commission.targets[0].amount,100);
 const commissioned=await apply(commission.planDigest);assert.equal(commissioned.readbackConfirmed,true);
 const commissionCobro=documents.get(item('cobros',commissioned.results[0].cobroId));assert.equal(commissionCobro.monto,100,'commission amount cannot replace premium amount');checks++;
 seed();documents.delete(item('carteraPrimas','qa_portfolio'));const noPortfolio=await preview();
 assert.equal(noPortfolio.reason,'PROPOSAL_FINANCIAL_TARGET_NOT_UNIQUE');
 assert.equal((await apply('stale_or_missing')).reason,'PROPOSAL_FINANCIAL_TARGET_NOT_UNIQUE');assert.equal(writeCount,0);checks++;
 for(const patch of [{pais:'CO'},{tenantId:'foreign-tenant'},{polizaId:'foreign-policy'},{moneda:'USD'},{monto:999},{clienteId:'foreign-client'}]){
  seed();const before=await preview();Object.assign(documents.get(item('carteraPrimas','qa_portfolio')),patch);
  assert.equal((await preview()).reason,'PROPOSAL_FINANCIAL_TARGET_MISMATCH');
  assert.equal((await apply(before.planDigest)).reason,'PROPOSAL_FINANCIAL_TARGET_MISMATCH');
  assert.equal(writeCount,0);assert.equal(documents.get(item('carteraPrimas','qa_portfolio')).carteraActiva,true);checks++;
 }
 for(const patch of [{pais:'CO'},{tenantId:'foreign-tenant'},{polizaId:'foreign-policy'},{moneda:'USD'},{monto:999},{clienteId:'foreign-client'}]){
  seed();const before=await preview();set(item('cobros','qa_existing_cobro'),{id:'qa_existing_cobro',tenantId:tenant,reciboId:'qa_receipt',polizaId:'qa_policy',clienteId:'qa_client',pais:'GT',moneda:'GTQ',monto:100,...patch});
  assert.equal((await preview()).reason,'PROPOSAL_FINANCIAL_TARGET_MISMATCH');
  assert.equal((await apply(before.planDigest)).reason,'PROPOSAL_FINANCIAL_TARGET_MISMATCH');assert.equal(writeCount,0);checks++;
 }
 for(const patch of [{pais:'CO'},{tenantId:'foreign-tenant'},{polizaId:'foreign-policy'},{moneda:'USD'},{monto:999}]){
  seed();const before=await preview();await apply(before.planDigest);Object.assign(documents.get(item('carteraPrimas','qa_portfolio')),patch);
  await assert.rejects(()=>preview(),error=>error.code==='data-loss');checks++;
 }
 // A separate server-owned decision completes a policy-only row, without
 // changing the immutable source or writing any financial record.
 seed({receiptId:'',evidenceType:'',paymentConfirmed:false,paidDate:''});
 const unresolved=await preview();assert.equal(unresolved.reason,'SOURCE_RECEIPT_IDENTITY_MISSING');
 assert.equal(unresolved.resolutionOptions.length,1);assert.equal(unresolved.resolutionOptions[0].amount,100);checks++;
 const ledgerBefore=copy([...documents.entries()].filter(([key])=>key.includes('/'+runId+'/')));
 const financialBefore=copy([...documents.entries()].filter(([key])=>/\/(?:recibosEsperados|carteraPrimas|cobros)\//.test(key)));
 const saved=await resolve();assert.equal(saved.status,'RESOLUTION_SAVED');assert.equal(saved.readbackConfirmed,true);
 assert.equal(saved.financialWrites,0);assert.deepEqual([...documents.entries()].filter(([key])=>/\/(?:recibosEsperados|carteraPrimas|cobros)\//.test(key)),financialBefore);checks++;
 assert.deepEqual([...documents.entries()].filter(([key])=>key.includes('/'+runId+'/')),ledgerBefore);checks++;
 const savedWrites=writeCount,again=await resolve();assert.equal(again.reused,true);assert.equal(writeCount,savedWrites);checks++;
 const boundPreview=await preview();assert.equal(boundPreview.eligible,true);checks++;
 const boundApplied=await apply(boundPreview.planDigest);assert.equal(boundApplied.readbackConfirmed,true);
 assert.equal(boundApplied.status,'APPLIED_WITH_MANUAL_APPROVAL');assert.equal((await resolve()).reused,true);checks++;
 seed({receiptId:'',evidenceType:''});assert.equal((await resolve({sourceAttestation:false})).reason,'SOURCE_ATTESTATION_REQUIRED');assert.equal(writeCount,0);checks++;
 seed({receiptId:'',evidenceType:''});assert.equal((await resolve({paidDate:''})).reason,'SOURCE_BANK_PAID_DATE_REQUIRED');assert.equal(writeCount,0);checks++;
 seed({receiptId:'',evidenceType:''});assert.equal((await resolve({paidDate:'2026-02-30'})).reason,'SOURCE_DATE_INVALID');assert.equal(writeCount,0);checks++;
 seed({receiptId:'',evidenceType:''});assert.equal((await resolve({paidDate:'2026-11-11'})).reason,'SOURCE_PAYMENT_AFTER_EVIDENCE_DATE');assert.equal(writeCount,0);checks++;
 seed({receiptId:''});assert.equal((await resolve({evidenceType:'COMMISSION_STATEMENT_INSTALLMENT_N'})).reason,'SOURCE_EVIDENCE_TYPE_CONFLICT');assert.equal(writeCount,0);checks++;
 seed({receiptId:'',evidenceType:'',amount:999});assert.equal((await resolve()).reason,'SOURCE_RECEIPT_AMOUNT_MISMATCH');assert.equal(writeCount,0);checks++;
 seed({receiptId:'',evidenceType:'',currency:'USD'});assert.equal((await resolve()).reason,'SOURCE_RECEIPT_CURRENCY_MISMATCH');assert.equal(writeCount,0);checks++;
 seed({receiptId:'',evidenceType:''});assert.equal((await resolve({receiptId:'other_receipt'})).reason,'SOURCE_RECEIPT_NOT_UNIQUE');assert.equal(writeCount,0);checks++;
 seed({receiptId:'',evidenceType:''});assert.equal((await resolve({amount:100})).reason,'PROPOSAL_CALLER_FINANCIAL_PAYLOAD_DENIED');assert.equal(writeCount,0);checks++;
 seed({receiptId:'',evidenceType:''});await assert.rejects(()=>resolve({},'advisor','Asesor'),e=>e.code==='permission-denied');assert.equal(writeCount,0);checks++;
 seed({receiptId:'',evidenceType:''});assert.equal((await resolve({},'foreign-country')).eligible,false);assert.equal(writeCount,0);checks++;
 seed();documents.get(base+'/config/access').rolePermissions={direccion:{conciliaciones:{ver:true,editar:false}}};
 const mayRead=await preview();assert.equal(mayRead.eligible,true);
 await assert.rejects(()=>apply(mayRead.planDigest),e=>e.message==='PROPOSAL_MODULE_WRITE_DENIED');
 await assert.rejects(()=>resolve(),e=>e.message==='PROPOSAL_MODULE_WRITE_DENIED');assert.equal(writeCount,0);checks++;
 seed({receiptId:'',evidenceType:''});await resolve();documents.get(item('recibosEsperados','qa_receipt')).monto=200;
 assert.equal((await preview()).reason,'PROPOSAL_RESOLUTION_STALE');checks++;
 seed({receiptId:'',evidenceType:''});const resolution=await resolve();documents.get(item('reconciliationResolutions',resolution.resolutionId)).receiptId='forged';
 assert.equal((await preview()).eligible,false);checks++;
 seed();documents.get(base+'/config/reconciliation').autoCommitHighConfidence=false;
 documents.get(base+'/config/reconciliation').humanConfirmationRequired=true;
 const manual=await preview();assert.equal(manual.eligible,true);assert.equal(writeCount,0);
 assert.equal((await apply(manual.planDigest)).readbackConfirmed,true);checks++;
 seed();documents.get(base+'/config/reconciliation').manualApplicationEnabled=false;
 assert.equal((await preview()).reason,'PROPOSAL_MANUAL_APPLICATION_DISABLED');assert.equal(writeCount,0);checks++;
 seed();documents.delete(base+'/config/reconciliation');assert.equal((await preview()).reason,'TENANT_RECONCILIATION_CONFIG_REQUIRED');assert.equal(writeCount,0);checks++;
 seed();const previewEndpoint=exportsObject.orbit360CobrosReconciliationCommandPreview;
 assert.equal((await previewEndpoint.run(request('preview_proposal_application',{proposalId,sourceRunId:runId}))).eligible,true);assert.equal(writeCount,0);checks++;
 await assert.rejects(()=>previewEndpoint.run(request('apply_proposal_application',{proposalId,sourceRunId:runId})),e=>e.code==='permission-denied');
 await assert.rejects(()=>previewEndpoint.run(request('resolve_proposal_application',binding)),e=>e.code==='permission-denied');assert.equal(writeCount,0);checks++;
 // Multiple editions remain selectable, but resolution never chooses one by
 // first-match order. Selecting the second edition affects only its receipt.
 seed({receiptId:'',receiptNumber:'DUP-REF'});documents.get(item('recibosEsperados','qa_receipt')).numeroReciboFuente='DUP-REF';
 set(item('polizas','qa_policy_old'),{id:'qa_policy_old',tenantId:tenant,numero:'QA-POLICY-001',clienteId:'qa_client',pais:'GT',moneda:'GTQ',vigenciaDesde:'2025-01-01',vigenciaHasta:'2026-01-01'});
 set(item('recibosEsperados','qa_receipt_old'),{id:'qa_receipt_old',tenantId:tenant,polizaId:'qa_policy_old',clienteId:'qa_client',pais:'GT',moneda:'GTQ',monto:100,cuota:'1/1',numeroReciboFuente:'DUP-REF',vence:'2025-11-01',estado:'Pendiente'});
 set(item('carteraPrimas','qa_portfolio_old'),{id:'qa_portfolio_old',tenantId:tenant,polizaId:'qa_policy_old',clienteId:'qa_client',reciboId:'qa_receipt_old',pais:'GT',moneda:'GTQ',monto:100,estado:'Pendiente',carteraActiva:true});
 const editions=await preview();assert.equal(editions.reason,'SOURCE_POLICY_EDITION_AMBIGUOUS');assert.equal(editions.resolutionOptions.length,2);assert.equal(writeCount,0);checks++;
 assert.equal((await resolve({policyId:'qa_policy_old',receiptId:'qa_receipt_old'})).readbackConfirmed,true);
 const selectedEdition=await preview();assert.equal(selectedEdition.eligible,true);assert.equal(selectedEdition.targets[0].receiptId,'qa_receipt_old');checks++;
 await apply(selectedEdition.planDigest);assert.equal(documents.get(item('recibosEsperados','qa_receipt')).estado,'Pendiente');assert.equal(documents.get(item('recibosEsperados','qa_receipt_old')).estado,'Pagado');checks++;
 // Authorized UAT namespace uses an independent synthetic contract. It never
 // swaps, copies into or updates the real ledger's active pointer/stage.
 const qaTenant='alianzas-soluciones',qaRun='cobledgerqa_unit_abcdefghijkl',qaProposal='b3005qa_i66_proposal_abcdefghijkl';
 const qaBase='tenants/'+qaTenant,qaItem=(c,i)=>qaBase+'/data/'+c+'/items/'+i;
 const qaStage=(c,i)=>qaItem('cobrosLedgerQaRuns',qaRun)+'/'+c+'/'+i;
 function seedQa(){
   seed();documents=new Map([...documents.entries()].map(([key,value])=>[key.replace(base,qaBase),{...value,...(value.tenantId?{tenantId:qaTenant}:{})}]));
   for(const c of ['polizas','recibosEsperados','carteraPrimas'])for(const [key,value] of documents)if(key.startsWith(qaItem(c,'')))Object.assign(value,{__syntheticQa:true,qaRunId:qaRun});
   const hashes={sourceLedgerDigest:'c'.repeat(64),packageLogicalSha256:'d'.repeat(64)};
   set(qaItem('cobrosLedgerQaControl',qaRun),{schemaVersion:'gi-i66-synthetic-proposal-pointer-v1',status:'ACTIVE',activeRunId:qaRun,__syntheticQa:true,qaRunId:qaRun,...hashes});
   set(qaItem('cobrosLedgerQaRuns',qaRun),{schemaVersion:'gi-i66-synthetic-proposal-ledger-v1',status:'ACTIVE',id:qaRun,runId:qaRun,tenantId:qaTenant,sourceLedgerCount:1,stageDocumentCount:2,__syntheticQa:true,qaRunId:qaRun,...hashes});
   for(const [kind,rowId] of [['propuestasConciliacion',qaProposal],['evidenciasCobro','qa_source']]){
     const original={documentId:rowId,tenantId:qaTenant,sourceRowId:'qa_source',sourceRowIdSha256:sourceHash,policyNumber:'QA-POLICY-001',currency:'GTQ',amount:100,reportedDate:'2026-11-10',__syntheticQa:true,qaRunId:qaRun};
     set(qaStage(kind,rowId),{...original,runId:qaRun,documentClass:kind,activationState:'STAGED',...hashes,payloadDigest:digest(original)});
   }
 }
 const qaRequest=(op,payload={})=>{const req=request(op,{proposalId:qaProposal,sourceRunId:qaRun,...payload});req.data.tenantId=qaTenant;return req;};
 seedQa();const liveControlBefore=copy(documents.get(qaItem('cobrosLedgerControl','active'))),
   liveStageBefore=copy([...documents.entries()].filter(([key])=>key.includes('/cobrosLedgerRuns/')));
 const qaRead=await previewEndpoint.run(qaRequest('preview_proposal_application'));
 assert.equal(qaRead.resolutionOptions.length,1);assert.equal(writeCount,0);checks++;
 const qaSaved=await previewEndpoint.run(qaRequest('resolve_proposal_application',{...binding,proposalId:qaProposal,sourceRunId:qaRun}));
 assert.equal(qaSaved.readbackConfirmed,true);checks++;
 const qaPlan=await previewEndpoint.run(qaRequest('preview_proposal_application'));
 const qaApplied=await previewEndpoint.run(qaRequest('apply_proposal_application',{planDigest:qaPlan.planDigest}));
 assert.equal(qaApplied.readbackConfirmed,true);
 assert.equal(documents.get(qaItem('cobros',qaApplied.results[0].cobroId)).qaRunId,qaRun);checks++;
 assert.deepEqual(documents.get(qaItem('cobrosLedgerControl','active')),liveControlBefore);
 assert.deepEqual([...documents.entries()].filter(([key])=>key.includes('/cobrosLedgerRuns/')),liveStageBefore);checks++;
 seedQa();delete documents.get(qaItem('polizas','qa_policy')).__syntheticQa;
 const nonSynthetic=await previewEndpoint.run(qaRequest('preview_proposal_application'));
 assert.equal(nonSynthetic.eligible,false);assert.equal(nonSynthetic.resolutionOptions.length,0);assert.equal(writeCount,0);checks++;
 seedQa();delete documents.get(qaItem('cobrosLedgerQaRuns',qaRun)).__syntheticQa;
 assert.equal((await previewEndpoint.run(qaRequest('preview_proposal_application'))).reason,'SOURCE_LEDGER_INTEGRITY_MISMATCH');assert.equal(writeCount,0);checks++;
 seedQa();await previewEndpoint.run(qaRequest('resolve_proposal_application',{...binding,proposalId:qaProposal,sourceRunId:qaRun}));
 delete documents.get(qaItem('carteraPrimas','qa_portfolio')).__syntheticQa;
 const nonSyntheticPortfolio=await previewEndpoint.run(qaRequest('preview_proposal_application'));
 await assert.rejects(()=>previewEndpoint.run(qaRequest('apply_proposal_application',{planDigest:nonSyntheticPortfolio.planDigest})),e=>e.message==='PROPOSAL_QA_FINANCIAL_TARGET_NOT_SYNTHETIC');
 assert.equal([...documents.entries()].filter(([key])=>key.startsWith(qaItem('cobros',''))).length,0);checks++;
 console.log(JSON.stringify({status:'PASS',checks,scope:'ACTUAL_CALLABLE_SYNTHETIC_TRANSACTION_DOUBLE',cloudWrites:0}));
})().catch(error=>{console.error(error);process.exitCode=1;});
