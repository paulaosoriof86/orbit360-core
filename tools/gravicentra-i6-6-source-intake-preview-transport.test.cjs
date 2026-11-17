'use strict';
// Local boundary tests execute the real browser provider, without Firebase,
// credentials, browser, network or a backend permission. Reaching disabled SDK
// initialization proves transport admission only, never server authorization.
const assert=require('node:assert/strict'),test=require('node:test');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const OWNER=fs.readFileSync(path.join(ROOT,'orbit360-platform/core/product-runtime-browser-providers-p0.js'),'utf8');
const HOST='ays-orbit-360-lab--gi-i66-rc-44047311664-d08psr2y.web.app';
const FN='orbit360CobrosReconciliationCommandPreview',DENIED='I66_PREVIEW_MUTATION_CALLABLE_DENIED';
const NONCE='local_contract_probe_1234',SOURCE='b3005qa_i66_intake_'+NONCE;
function clone(value){return JSON.parse(JSON.stringify(value));}
function request(){return{tenantId:'alianzas-soluciones',activeRole:'direccion',operation:'intake_source_run',payload:{
 schemaVersion:'gi-cobros-source-intake-v2',sourceAttestation:true,
 source:{sourceId:SOURCE,sha256:'a'.repeat(64)},
 rows:[{policyId:SOURCE+'_policy',receiptId:SOURCE+'_receipt'}]}};}
function provider(host=HOST){const context={location:{hostname:host},__ORBIT360_PRODUCT_PUBLIC_CONFIG__:{scopedReadPreviewCandidate:true}};context.window=context;vm.createContext(context);vm.runInContext(OWNER,context);return context.Orbit.productRuntimeBrowserProvidersP0;}
async function result(input=request(),options={}){try{await provider(options.host).callFunction(options.name||FN,input,options.region||'us-central1');return 'UNEXPECTED_INITIALIZATION';}catch(error){return error.message;}}
async function admitted(input=request()){assert.equal(await result(input),'PRODUCT_RUNTIME_NOT_CONFIGURED');}

test('exact bounded synthetic envelope reaches disabled SDK initialization, not backend acceptance',()=>admitted());
test('actual signed driver source-intake fixture traverses the real Preview provider',async()=>{
 const {sourceIntakeFixture}=require('./gravicentra-i6-6-proposal-application-signed-uat.cjs');
 assert.equal(typeof sourceIntakeFixture,'function','signed UI fixture must be present in this candidate');
 const fixture=sourceIntakeFixture(NONCE,'synthetic_insurer','synthetic_actor');
 const input=request();input.payload=fixture.payload;await admitted(input);
 assert.equal(fixture.permission.intakePermission.sourceSha256,input.payload.source.sha256);
 assert.equal(fixture.permission.intakePermission.actorUid,'synthetic_actor');
});
test('allows at most100 exclusively same-source policy/receipt targets',async()=>{
 const input=request();input.payload.rows=Array.from({length:100},(_,i)=>({policyId:SOURCE+'_policy_'+i,receiptId:SOURCE+'_receipt_'+i}));await admitted(input);
});
test('transport does not mutate payload or mint a backend permit',async()=>{
 const input=request(),before=clone(input);await admitted(input);assert.deepEqual(input,before);
 assert.equal(Object.hasOwn(input.payload,'intakePermission'),false);assert.equal(Object.hasOwn(input.payload,'__syntheticQa'),false);
});

const invalidCases=[
 ['other tenant',v=>{v.tenantId='another_tenant';}],
 ['missing tenant',v=>{delete v.tenantId;}],
 ['tenant whitespace',v=>{v.tenantId+=' ';}],
 ['missing payload',v=>{delete v.payload;}],
 ['array payload',v=>{v.payload=[];}],
 ['missing schema',v=>{delete v.payload.schemaVersion;}],
 ['wrong schema',v=>{v.payload.schemaVersion='gi-cobros-source-intake-v1';}],
 ['missing attestation',v=>{delete v.payload.sourceAttestation;}],
 ['false attestation',v=>{v.payload.sourceAttestation=false;}],
 ['truthy nonboolean attestation',v=>{v.payload.sourceAttestation='true';}],
 ['missing source',v=>{delete v.payload.source;}],
 ['array source',v=>{v.payload.source=[];}],
 ['ordinary source',v=>{v.payload.source.sourceId='ordinary_document_source';}],
 ['wrong QA source namespace',v=>{v.payload.source.sourceId='b4003qa_i66_intake_'+NONCE;}],
 ['short source nonce',v=>{v.payload.source.sourceId='b3005qa_i66_intake_short';}],
 ['long source nonce',v=>{v.payload.source.sourceId='b3005qa_i66_intake_'+'a'.repeat(81);}],
 ['source upper case',v=>{v.payload.source.sourceId=SOURCE.toUpperCase();}],
 ['missing hash',v=>{delete v.payload.source.sha256;}],
 ['short hash',v=>{v.payload.source.sha256='a'.repeat(63);}],
 ['long hash',v=>{v.payload.source.sha256='a'.repeat(65);}],
 ['nonhex hash',v=>{v.payload.source.sha256='g'.repeat(64);}],
 ['uppercase hash',v=>{v.payload.source.sha256='A'.repeat(64);}],
 ['numeric hash',v=>{v.payload.source.sha256=1234;}],
 ['missing rows',v=>{delete v.payload.rows;}],
 ['zero rows',v=>{v.payload.rows=[];}],
 ['101 rows',v=>{v.payload.rows=Array.from({length:101},()=>clone(v.payload.rows[0]));}],
 ['nonarray rows',v=>{v.payload.rows={0:v.payload.rows[0],length:1};}],
 ['sparse rows',v=>{v.payload.rows=Array(1);}],
 ['null row',v=>{v.payload.rows=[null];}],
 ['array row',v=>{v.payload.rows=[[]];}],
 ['missing policy ID',v=>{delete v.payload.rows[0].policyId;}],
 ['missing receipt ID',v=>{delete v.payload.rows[0].receiptId;}],
 ['numeric policy ID',v=>{v.payload.rows[0].policyId=123;}],
 ['real policy ID',v=>{v.payload.rows[0].policyId='real_policy_123';}],
 ['real receipt ID',v=>{v.payload.rows[0].receiptId='real_receipt_123';}],
 ['cross-run policy ID',v=>{v.payload.rows[0].policyId='b3005qa_i66_intake_other_contract_probe_policy';}],
 ['cross-run receipt ID',v=>{v.payload.rows[0].receiptId='b3005qa_i66_intake_other_contract_probe_receipt';}],
 ['policy ID without delimiter',v=>{v.payload.rows[0].policyId=SOURCE+'_policymore';}],
 ['receipt ID without delimiter',v=>{v.payload.rows[0].receiptId=SOURCE+'_receiptmore';}],
 ['target path traversal',v=>{v.payload.rows[0].receiptId=SOURCE+'_receipt/real_record';}],
 ['long policy suffix',v=>{v.payload.rows[0].policyId=SOURCE+'_policy_'+'a'.repeat(41);}],
 ['second row real target',v=>{v.payload.rows.push({policyId:SOURCE+'_policy',receiptId:'ordinary_receipt'});}],
 ['source/targets mismatch',v=>{v.payload.source.sourceId='b3005qa_i66_intake_another_contract_probe';}],
 ['unrecognized intake operation',v=>{v.operation='intake_source_run_unrestricted';}]
];
for(const [name,mutate] of invalidCases)test('denies '+name+' before SDK initialization',async()=>{const input=request();mutate(input);assert.equal(await result(input),DENIED);});
for(const suffix of ['\n','\r','\r\n','\u2028','\u2029',' '])for(const field of ['sourceId','sha256','policyId','receiptId']){
 test('denies trailing '+JSON.stringify(suffix)+' in '+field,async()=>{const input=request();const target=field==='sourceId'||field==='sha256'?input.payload.source:input.payload.rows[0];target[field]+=suffix;assert.equal(await result(input),DENIED);});
}
test('denies wrong callable region before SDK initialization',async()=>{assert.equal(await result(request(),{region:'us-east1'}),'I66_PREVIEW_REGION_DENIED');});
test('denies LIVE reconciliation callable from Preview',async()=>{assert.match(await result(request(),{name:'orbit360CobrosReconciliationCommand'}),/^I66_PREVIEW_.*DENIED$/);});
test('unchanged historical synthetic payment transport still reaches initialization',async()=>{const input=request();input.operation='apply_payment';input.payload={receiptId:'b3005qa_historical_receipt'};await admitted(input);});
test('historical real payment targets remain denied',async()=>{const input=request();input.operation='apply_payment';input.payload={receiptId:'real_receipt_123'};assert.equal(await result(input),DENIED);});
test('normal source is not newly blocked on LIVE by the Preview-only boundary',async()=>{const input=request();input.payload.source.sourceId='ordinary_document_source';input.payload.rows[0]={policyId:'ordinary_policy',receiptId:'ordinary_receipt'};assert.equal(await result(input,{host:'app.aysseguros.com',name:'orbit360CobrosReconciliationCommand'}),'PRODUCT_RUNTIME_NOT_CONFIGURED');});
