'use strict';
// Pure guards only. This test never imports Firebase/Playwright or uses a credential.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {validateEnvironment,owned,makeStage}=require('./gravicentra-i6-6-proposal-application-signed-uat.cjs');
const {verifiedStage}=require('../functions/proposal-application-boundary');
const code=fs.readFileSync(require.resolve('./gravicentra-i6-6-proposal-application-signed-uat.cjs'),'utf8');
const env={I66_SOURCE_SHA:'a'.repeat(40),I66_PACKAGE_ROOT:'/tmp/i66-package',I66_PREVIEW_ORIGIN:'https://ays-orbit-360-lab--gi-i66-rc-123-abc.web.app'};
let checks=0;
assert.equal(validateEnvironment(env).phase,'PREVIEW');checks++;
assert.equal(validateEnvironment({...env,I66_SIGNED_TEST_LIVE:'true',I66_PREVIEW_ORIGIN:'https://app.aysseguros.com'}).phase,'LIVE');checks++;
for(const wrong of ['https://example.invalid','https://app.aysseguros.com','http://localhost:3000']){assert.throws(()=>validateEnvironment({...env,I66_PREVIEW_ORIGIN:wrong}));checks++;}
assert.throws(()=>validateEnvironment({...env,I66_SIGNED_TEST_LIVE:'true'}));checks++;
assert.throws(()=>validateEnvironment({...env,I66_SOURCE_SHA:'main'}));checks++;
assert.throws(()=>validateEnvironment({...env,I66_PACKAGE_ROOT:'relative'}));checks++;
assert.equal(owned({__syntheticQa:true,qaRunId:'qa_run'},'qa_run'),true);checks++;
assert.equal(owned({__syntheticQa:true,qaRunId:'other'},'qa_run'),false);checks++;
assert.equal(owned({qaRunId:'qa_run'},'qa_run'),false);checks++;
const manifest={sourceLedgerDigest:'b'.repeat(64),packageLogicalSha256:'c'.repeat(64)};
const row=makeStage('evidenciasCobro','qa_id','tenant_qa','run_qa',{sourceRowId:'source_qa',sourceRowIdSha256:'d'.repeat(64)},manifest);
assert.equal(verifiedStage(row,'qa_id','tenant_qa','run_qa',manifest,'evidenciasCobro'),true);checks++;
assert.match(code,/cobrosLedgerQaRuns/);assert.match(code,/cobrosLedgerQaControl/);checks++;
assert.match(code,/ref\.delete\(\{lastUpdateTime:s\.updateTime\}\)/);assert.doesNotMatch(code,/recursiveDelete|deleteUser|setCustomUserClaims/);checks++;
assert.match(code,/SECOND_APPLY_IDEMPOTENT_NO_DOUBLE_PAYMENT/);assert.match(code,/UI_BINDING_PERSISTED_WITH_ZERO_FINANCIAL_WRITES/);checks++;
assert.match(code,/realControlUnchanged/);assert.match(code,/originalManifest/);checks++;
assert.match(code,/if\(!carlosAccess\.canView\)/);assert.match(code,/carlosAccess\.scope==='all'/);
assert.match(code,/SIGNED_OPERATIVO_FULL_PORTFOLIO_READ_NO_ADVISOR_REQUIRED/);assert.doesNotMatch(code,/I66_PROPOSAL_OPERATIVO_UNASSIGNED_SCOPE_LEAK/);checks++;
const provider=fs.readFileSync(require.resolve('../orbit360-platform/core/product-runtime-browser-providers-p0.js'),'utf8');
const marker='window.Orbit.productRuntimeBrowserProvidersP0=Object.freeze';
const browser={location:{hostname:'ays-orbit-360-lab--gi-i66-rc-123-abc.web.app'},Orbit:{}};
vm.runInNewContext(provider.replace(marker,'window.__proposalGate=i66ReadOnlyCallableError;'+marker),{window:browser,location:browser.location,console});
const gate=browser.__proposalGate,name='orbit360CobrosReconciliationCommandPreview';
const qa={tenantId:'alianzas-soluciones',operation:'preview_proposal_application',payload:{proposalId:'b3005qa_i66_proposal_abcdefghijkl',sourceRunId:'cobledgerqa_abcdefghijkl'}};
for(const op of ['preview_proposal_application','resolve_proposal_application','apply_proposal_application']){assert.equal(gate(name,{...qa,operation:op},'us-central1'),'');checks++;}
assert.equal(gate(name,{...qa,payload:{proposalId:'real_proposal',sourceRunId:'cobledger_'+'a'.repeat(28)}},'us-central1'),'');checks++;
for(const op of ['resolve_proposal_application','apply_proposal_application']){
 assert.equal(gate(name,{...qa,operation:op,payload:{proposalId:'real_proposal',sourceRunId:'cobledger_'+'a'.repeat(28)}},'us-central1'),'I66_PREVIEW_MUTATION_CALLABLE_DENIED');checks++;
}
assert.equal(gate(name,{...qa,tenantId:'another-tenant'},'us-central1'),'I66_PREVIEW_MUTATION_CALLABLE_DENIED');checks++;
assert.equal(gate(name,qa,'us-east1'),'I66_PREVIEW_REGION_DENIED');checks++;
assert.equal(gate('orbit360CobrosReconciliationCommand',qa,'us-central1'),'I66_PREVIEW_REGION_DENIED');checks++;
console.log(JSON.stringify({status:'PASS',checks,scope:'SIGNED_UAT_OFFLINE_GUARDS_ONLY',cloudWrites:0}));
const test=require('node:test'),crypto=require('node:crypto'),path=require('node:path'),{createRequire}=require('node:module');
const documentOwner=require('./gravicentra-i6-6-proposal-application-signed-uat.cjs');
const releaseOwner=require('./gravicentra-i6-6-operational-release-candidate.cjs');
const clone=x=>x==null?x:structuredClone(x);
const binding={profile:documentOwner.DOCUMENTARY_PAYMENT_QA_PROFILE,receiptPath:documentOwner.DOCUMENTARY_PAYMENT_QA_RECEIPT,receiptBlob:'a'.repeat(40)};
const nonce='synthetic_offline_0123456789';
const successorBinding={...binding,receiptPath:documentOwner.DOCUMENTARY_PAYMENT_QA_SUCCESSOR_RECEIPT};
test('documentary binding admits only the historical receipt or its closed published successor',()=>{
 for(const b of [binding,successorBinding])assert.deepEqual(documentOwner.validateDocumentaryPaymentQaBinding(b),b);
 for(const receiptPath of [binding.receiptPath+'.extra',successorBinding.receiptPath.replace('20261124','20261125'),'artifacts/orbit360-recovery/release-control/OTHER_FINANCIAL_SOURCE.json'])
  assert.throws(()=>documentOwner.validateDocumentaryPaymentQaBinding({...binding,receiptPath}),/EXACT_RECEIPT_REQUIRED/);
});
test('build markers keep their independent historical and financial binding without reading an out-of-scope control',()=>{
 const p={sourceSha:'b'.repeat(40),buildId:'gi-i66-'+('b'.repeat(12))+'-0123456789ab',buildRunId:123,
  previewChannelId:'gi-i66-rc-123',previewUrl:'https://ays-orbit-360-lab--gi-i66-rc-123-abc.web.app'};
 const marker={product:'Gravicentra Insurance',gate:'I6.6',sourceSha:p.sourceSha,buildId:p.buildId};
 assert.deepEqual(releaseOwner.validateBuildMarker(p,marker),marker);
 assert.deepEqual(releaseOwner.validateBuildMarker({...p,financialRecoveryQa:binding},marker,marker),marker);
 assert.throws(()=>releaseOwner.validateBuildMarker({...p,financialRecoveryQa:{}},marker));
 assert.throws(()=>releaseOwner.validateBuildMarker({...p,financialRecoveryQa:binding},{...marker,sourceSha:'c'.repeat(40)}));
});
test('documentary fixtures use only the existing Preview synthetic prefix, exact sources and no real recipient',()=>{
 for(const source of documentOwner.DOCUMENTARY_PAYMENT_SOURCES){
  const f=documentOwner.documentaryPaymentFixture(nonce,source);
  for(const value of Object.values(f.ids))assert.match(value,/^b3004qa_/);
  for(const row of Object.values(f.seed)){assert.equal(row.__syntheticQa,true);assert.equal(row.qaRunId,f.qaRunId);assert.equal(row.pais,'GT');}
  assert.equal(f.seed.client.email,undefined);assert.equal(f.seed.client.telefono,undefined);
  assert.equal(f.payload.actualPaidDateEvidence,true);assert.match(f.payload.sourceRef,/^drive:qa_/);assert.equal(f.payload.sourceType,source);
  for(const key of ['paymentMethod','applicationDate','invoiceDate','invoiceNumber'])assert.equal(f.payload[key],undefined);
 }
 for(const source of ['bank','manual','inference'])assert.throws(()=>documentOwner.documentaryPaymentFixture(nonce,source));
 assert.throws(()=>documentOwner.documentaryPaymentFixture('short','commission_statement'));
});
test('documentary response observer rejects another actor, receipt, request, endpoint, operation or amount',()=>{
 const f=documentOwner.documentaryPaymentFixture(nonce,'commission_statement'),cfg={phase:'PREVIEW'};
 const good={tenantId:'alianzas-soluciones',activeRole:'Dirección',operation:'apply_payment',requestId:f.requestId,payload:f.payload};
 const request=(data=good,url='https://us-central1-ays-orbit-360-lab.cloudfunctions.net/orbit360CobrosReconciliationCommandPreview')=>({method:()=> 'POST',url:()=>url,postDataJSON:()=>({data})});
 assert.equal(documentOwner.documentaryPaymentRequest(request(),f,cfg),true);
 for(const update of [{tenantId:'other'},{activeRole:'Operativo'},{requestId:'other'},{operation:'reconcile_payment'},
  {payload:{...f.payload,receiptId:'real_receipt'}},{payload:{...f.payload,amount:1}},{payload:{...f.payload,applicationDate:'2026-11-15'}}])
  assert.equal(documentOwner.documentaryPaymentRequest(request({...good,...update}),f,cfg),false);
 assert.equal(documentOwner.documentaryPaymentRequest(request(good,'https://example.invalid'),f,cfg),false);
});
for(const mutation of [x=>delete x.receiptBlob,x=>{x.receiptPath='private/raw.json';},x=>{x.profile='other';},x=>{x.allowRealPayments=true;}])
 test('documentary candidate binding rejects malformed or widened metadata '+mutation.toString(),()=>{const b=clone(binding);mutation(b);assert.throws(()=>documentOwner.validateDocumentaryPaymentQaBinding(b));});

// The actual UI command builder and actual callable execute against a bounded
// in-memory transactional store. No Firebase SDK, auth session, network or real
// account is used; the signed browser acceptance still must run on the artifact.
function documentaryHarness(phase,options={}){
 const executionBinding=options.binding||binding;
 const tenantId='alianzas-soluciones',base='tenants/'+tenantId,actor={uid:'synthetic_direction_documentary',role:'direccion'};
 const documents=new Map(),versions=new Map(),calls=[],deleted=[];let sequence=0,closed=false,active=null,formGone=false,pending=null,backendWrites=0;
 const put=(key,row)=>{documents.set(key,clone(row));versions.set(key,{seconds:100000,nanoseconds:++sequence});};
 class Ref{
  constructor(parts,filters=[]){this.parts=parts;this.filters=filters;this.path=parts.join('/');this.id=parts.at(-1);}
  get parent(){return new Ref(this.parts.slice(0,-1));}collection(n){return new Ref([...this.parts,n]);}doc(n){return new Ref([...this.parts,n]);}
  where(k,op,v){assert.equal(op,'==');return new Ref(this.parts,[...this.filters,[k,v]]);}limit(){return this;}
  async get(){return snap(this);}
  async create(row){assert.equal(documents.has(this.path),false);put(this.path,row);}
  async delete(precondition){assert.equal(closed,true,'page must close before restore');assert.deepEqual(precondition,{lastUpdateTime:versions.get(this.path)});deleted.push(this.path);documents.delete(this.path);versions.delete(this.path);}
 }
 function snap(ref){
  if(ref.parts.length%2===0){const data=documents.get(ref.path);return{id:ref.id,ref,exists:!!data,data:()=>clone(data),updateTime:clone(versions.get(ref.path))};}
  const docs=[...documents.keys()].filter(key=>key.startsWith(ref.path+'/')&&key.split('/').length===ref.parts.length+1&&ref.filters.every(([k,v])=>documents.get(key)[k]===v)).map(key=>snap(new Ref(key.split('/'))));
  return{docs,size:docs.length,empty:docs.length===0};
 }
 const db={collection:n=>new Ref([n]),runTransaction:async fn=>{
  const pendingWrites=[];let writing=false;
  const result=await fn({get:async ref=>{assert.equal(writing,false,'reads must precede writes');return snap(ref);},set:(ref,row,opts)=>{writing=true;pendingWrites.push([ref,row,opts]);}});
  for(const [ref,row,opts] of pendingWrites){put(ref.path,opts?.merge?{...(documents.get(ref.path)||{}),...clone(row)}:row);backendWrites++;}return result;
 }};
 class HttpsError extends Error{constructor(code,message,details){super(message);this.code=code;this.details=details;}}
 const domainPath=path.resolve(__dirname,'../functions/cobros-reconciliation-domain.js'),domainRequire=createRequire(domainPath),handlers={};
 vm.runInNewContext(fs.readFileSync(domainPath,'utf8'),{exports:handlers,process:{env:{}},console,
  require:name=>name==='firebase-admin/app'?{getApps:()=>[{}],initializeApp:()=>({})}:name==='firebase-admin/firestore'?{getFirestore:()=>db,FieldValue:{serverTimestamp:()=>({testTimestamp:true})}}:
   name==='firebase-functions/v2/https'?{HttpsError,onCall:(_,fn)=>({run:fn})}:domainRequire(name)});
 put(base+'/members/'+actor.uid,{uid:actor.uid,tenantId,status:'active',roles:['Dirección'],activeRole:'Dirección',countries:['GT'],dataScopes:{default:'all'}});
 put(base+'/config/reconciliation',{autoCommitHighConfidence:true,requireSameCurrency:true});
 const tenant=db.collection('tenants').doc(tenantId),item=(c,id)=>tenant.collection('data').doc(c).collection('items').doc(id);
 if(options.preexistingAlias){const fixture=documentOwner.documentaryPaymentFixture(nonce,'commission_statement');put(item('cobros','synthetic_preexisting_unowned').path,{id:'synthetic_preexisting_unowned',receiptId:fixture.ids.receipt});}
 const endpoint='orbit360CobrosReconciliationCommand'+(phase==='PREVIEW'?'Preview':'');
 const command=async data=>handlers[endpoint].run({auth:{uid:actor.uid,token:{}},data});
 const cfg={phase,origin:phase==='PREVIEW'?'https://ays-orbit-360-lab--gi-i66-rc-123-abc.web.app':'https://app.aysseguros.com',sourceSha:'b'.repeat(40),packageRoot:'/synthetic/package'};
 const moduleBytes=fs.readFileSync(path.resolve(__dirname,'../orbit360-platform/modules/cobros.js'));
 const moduleSource=moduleBytes.toString(),first=moduleSource.indexOf('  function documentaryInputError('),end=moduleSource.indexOf('  function aplicarPago(cobroId)');
 const ui={window:{crypto:crypto.webcrypto,OrbitBackend:{tenantId}},OrbitBackend:{tenantId},TextEncoder,URL};vm.createContext(ui);vm.runInContext(moduleSource.slice(first,end),ui);
 const formValues={};
 const browser={Orbit:{productRuntimeBrowserProvidersP0:{initialize:async()=>({}),waitForUser:async()=>({uid:actor.uid})},
  productAppP0:{activate:async()=>({started:true})},session:{rol:()=> 'Dirección'},
  reconciliationDomain:{status:()=>({functionName:endpoint}),applyPayment:async(receiptId,opt)=>{
   calls.push('canonical-replay');assert.equal(receiptId,active.ids.receipt);const before=backendWrites;
   const result=await command({tenantId,activeRole:'Dirección',operation:'apply_payment',...opt});
   assert.equal(backendWrites,before,'replay must not write');
   if(options.touchReplayVersion)put(item('recibosEsperados',receiptId).path,documents.get(item('recibosEsperados',receiptId).path));
   return result;
  }},store:{_ensureCollections:async()=>{},get:(c,id)=>clone(documents.get(item(c,id).path))},
  modules:{cobros:{aplicarPago:id=>{active=documentOwner.DOCUMENTARY_PAYMENT_SOURCES.map(source=>documentOwner.documentaryPaymentFixture(nonce,source)).find(f=>f.ids.receipt===id);assert.ok(active);formGone=false;for(const k of Object.keys(formValues))delete formValues[k];calls.push('public-modal');}}}}};
 browser.window={Orbit:browser.Orbit};vm.createContext(browser);
 const evaluate=async(fn,arg)=>{browser.argument=clone(arg);return vm.runInContext('('+fn.toString()+')(argument)',browser);};
 const locator=selector=>({
  selectOption:async value=>{formValues[selector]=value;calls.push('select-'+selector);},fill:async value=>{formValues[selector]=value;},
  check:async()=>{formValues[selector]=true;},isChecked:async()=>false,isDisabled:async()=>true,inputValue:async()=>formValues[selector]||'',
  click:async()=>{
   if(selector==='details summary')return;
   assert.equal(selector,'#pm-ok');calls.push('normal-button');
   const receipt=clone(documents.get(item('recibosEsperados',active.ids.receipt).path));
   const built=await ui.documentaryPaymentCommand(receipt,{monto:active.payload.amount},{sourceType:formValues['#pm-source'],sourceRef:formValues['#pm-source-ref'],
    evidenceAsOfDate:formValues['#pm-source-asof'],evidenceId:formValues['#pm-evidence-id'],requestId:formValues['#pm-request-id'],reviewed:formValues['#pm-source-reviewed']},
    {paidDate:formValues['#pm-paid'],paymentMethod:'',applicationDate:'',invoiceDate:'',invoiceNumber:''});
   const data={tenantId,activeRole:'Dirección',operation:'apply_payment',...JSON.parse(JSON.stringify(built))};
   const result=await command(data);ui.verifyDocumentaryPaymentResult(result,built,receipt);formGone=true;
   const request={method:()=> 'POST',url:()=> 'https://us-central1-ays-orbit-360-lab.cloudfunctions.net/'+endpoint,postDataJSON:()=>({data})};
   const response={request:()=>request,status:()=>200,json:async()=>({result})};
   assert.ok(pending?.match(response));const waiting=pending;pending=null;
   if(options.uncertainUiResponse)waiting.reject(Error('SYNTHETIC_RESPONSE_UNCERTAIN'));else waiting.resolve(response);
  }
 });
 const page={goto:async()=>{assert.equal(closed,false);calls.push('goto');},reload:async()=>{calls.push('reload');},
  waitForFunction:async(fn,arg)=>assert.ok(await evaluate(fn,arg)),evaluate,
  locator:selector=>{assert.equal(selector,'#cob-pay');return{locator,waitFor:async({state})=>assert.equal(formGone,state==='detached')};},
  waitForResponse:match=>new Promise((resolve,reject)=>{pending={match,resolve,reject};}),close:async()=>{closed=true;calls.push('close');}};
 const io={readFileSync:()=>moduleBytes,fetch:async()=>({status:200,arrayBuffer:async()=>moduleBytes}),requireExistingLegalReadiness:async()=>{calls.push('existing-direction-legal-readiness');}};
 return{run:()=>documentOwner.exerciseDocumentaryPayments({page,actor,cfg,tenant,item,nonce,binding:executionBinding,buildId:'synthetic-build'},io),documents,calls,deleted,
  cfg,item,actor,get backendWrites(){return backendWrites;}};
}
for(const phase of ['PREVIEW','LIVE'])for(const executionBinding of [binding,successorBinding])test('documentary UI orchestration '+phase+' '+(executionBinding===binding?'historical':'successor')+' executes actual command builder and callable, then reload/replay/CAS restore',async()=>{
 const h=documentaryHarness(phase,{binding:executionBinding}),proof=await h.run();
 const summary=documentOwner.validateDocumentaryPaymentUiEvidence(proof,{...h.cfg,buildId:'synthetic-build',binding:executionBinding});
 assert.deepEqual(proof.binding,executionBinding);
 assert.throws(()=>documentOwner.validateDocumentaryPaymentUiEvidence(proof,{...h.cfg,buildId:'synthetic-build',binding:executionBinding===binding?successorBinding:binding}));
 releaseOwner.validateFinancialRecoverySummary({sourceSha:h.cfg.sourceSha,buildId:'synthetic-build',financialRecoveryQa:executionBinding},phase,summary);
 assert.equal(h.calls.filter(x=>x==='normal-button').length,2);assert.equal(h.calls.filter(x=>x==='canonical-replay').length,2);
 assert.equal(h.deleted.length,14);assert.equal([...h.documents.keys()].filter(k=>k.includes('/data/')).length,0);assert.equal(h.backendWrites,10);
 assert.ok(h.calls.indexOf('existing-direction-legal-readiness')<h.calls.indexOf('normal-button'));
 for(const change of [p=>delete p.cases[0].readbackAfterReload,p=>{p.cases[0].replayAdditionalPayments=1;},p=>{p.cleanup.remaining=1;},p=>{p.realFinancialWrites=1;},p=>{p.phase='OTHER';},p=>p.cases.pop(),p=>{p.cases[0].normalUiRequest=false;}]){
  const bad=clone(proof);change(bad);assert.throws(()=>documentOwner.validateDocumentaryPaymentUiEvidence(bad,{...h.cfg,buildId:'synthetic-build',binding:executionBinding}));
 }
 assert.throws(()=>releaseOwner.validateFinancialRecoverySummary({sourceSha:h.cfg.sourceSha,buildId:'synthetic-build',financialRecoveryQa:executionBinding},phase,undefined));
});
test('uncertain UI response cannot clean while a server writer may still commit or claim PASS',async()=>{
 const h=documentaryHarness('PREVIEW',{uncertainUiResponse:true});let failure;
 try{await h.run();}catch(error){failure=error;}
 assert.ok(failure);assert.equal(failure.documentaryPaymentEvidence.status,'HOLD');assert.equal(failure.documentaryPaymentEvidence.cleanup.status,'HOLD');
 assert.equal(h.deleted.length,0);assert.equal(failure.documentaryPaymentEvidence.cleanup.remaining,7);
});
test('same replay values with a changed exact update version fail even if the payment count is one',async()=>{
 const h=documentaryHarness('PREVIEW',{touchReplayVersion:true});await assert.rejects(h.run(),/REPLAY_MUTATED_DATA/);assert.equal(h.deleted.length,7);
});
test('an existing payment linked through either receipt alias holds before any fixture or payment write and is retained',async()=>{
 const h=documentaryHarness('PREVIEW',{preexistingAlias:true});await assert.rejects(h.run(),/PAYMENT_PREEXISTED/);
 assert.equal(h.backendWrites,0);assert.equal(h.deleted.length,0);assert.equal([...h.documents.keys()].filter(k=>k.includes('/data/')).length,1);
});
test('restore guard rejects a foreign actor or changed financial identity before deletion',()=>{
 const f=documentOwner.documentaryPaymentFixture(nonce,'commission_statement'),actor={uid:'synthetic_actor'};
 const row={id:f.cobroId,tenantId:'alianzas-soluciones',pais:'GT',moneda:'GTQ',monto:f.payload.amount,polizaId:f.ids.policy,clienteId:f.ids.client,
  reciboId:f.ids.receipt,updatedByUid:actor.uid,paymentState:'PAID_DIRECT',applicationState:'APPLIED_DIRECT',sourceRef:f.payload.sourceRef,evidenceId:f.payload.evidenceId};
 assert.doesNotThrow(()=>documentOwner.assertDocumentaryPaymentOwned('cobro',row,f,actor));
 for(const update of [{updatedByUid:'other'},{clienteId:'real_client'},{tenantId:'other'},{pais:'CO'},{moneda:'USD'},{monto:1},{reciboId:'other'}])
  assert.throws(()=>documentOwner.assertDocumentaryPaymentOwned('cobro',{...row,...update},f,actor));
});
