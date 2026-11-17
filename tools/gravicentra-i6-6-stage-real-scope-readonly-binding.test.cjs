'use strict';
// Synthetic fixtures only: verify the readonly QA contract without SDK,
// credentials, network, deployment, or a mutable business-data test double.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const contract=require('../functions/cobros-ledger-contract');
const intake=require('../functions/cobros-source-intake-v2');
const {requireCatalogEntry,readAllPages,summarizeProjection,normalizedProjection,requireUiProjection,requireServingIdentity}=
 require('./gravicentra-i66-conciliaciones-stage-real-scope-readonly.cjs');
const TENANT='alianzas-soluciones',ORIGINS=['https://app.aysseguros.com','https://ays-orbit-360-lab.web.app'];
const clone=structuredClone;
function legacyEntry(){
 const runId='cobledger_'+'a'.repeat(28),aggregate='b'.repeat(64);
 const pointer={id:'active',schemaVersion:contract.POINTER_SCHEMA,status:'ACTIVE',activeRunId:runId,
  sourceLedgerCount:contract.SOURCE_LEDGER_COUNT,sourceLedgerDigest:contract.SOURCE_LEDGER_DIGEST,
  packageLogicalSha256:contract.PACKAGE_LOGICAL_SHA256,aggregateDigest:aggregate,activatedAt:'2026-08-05'};
 const manifest={id:runId,runId,tenantId:TENANT,schemaVersion:contract.MANIFEST_SCHEMA,gateId:contract.GATE_ID,
  contractVersion:contract.CONTRACT_VERSION,status:'ACTIVE',activationState:'ACTIVE',activatedAt:'2026-08-05',
  sourceLedgerCount:contract.SOURCE_LEDGER_COUNT,sourceLedgerDigest:contract.SOURCE_LEDGER_DIGEST,
  packageLogicalSha256:contract.PACKAGE_LOGICAL_SHA256,expectedAggregateDigest:aggregate,
  expectedCounts:contract.EXPECTED_COUNTS,stageDocumentCount:contract.STAGE_DOCUMENT_COUNT,
  newCobros:0,receiptWrites:0,policyWrites:0,finmovWrites:0};
 const proposals=Array.from({length:manifest.expectedCounts.propuestasConciliacion},(_,i)=>({
  id:'legacy_'+String(i).padStart(3,'0'),sourceRowIdSha256:intake.digest('synthetic-legacy-'+i)}));
 return {runId,pointer,manifest,proposals};
}
function sourceEntry(count=3,retained=[]){
 const payload={schemaVersion:intake.INPUT_SCHEMA,sourceAttestation:true,
  source:{sourceId:'sha256:'+'c'.repeat(64),documentRef:'drive:SyntheticQaDocument001',fileName:'synthetic.csv',
   sha256:'c'.repeat(64),evidenceAsOfDate:'2026-11-16',country:'GT',currency:'GTQ',
   evidenceType:'INVOICE_INSTALLMENT_N',insurerId:'synthetic_insurer'},
  rows:Array.from({length:count},(_,i)=>({rowId:'synthetic_row_'+i,sheet:'Synthetic',rowNumber:i+2,
   policyNumber:'QA-'+i,policyId:'synthetic_policy_'+i,receiptId:'synthetic_receipt_'+i,
   receiptNumber:'REQ-'+i,installment:'1/3',amount:100+i}))};
 const input=intake.prepareInput(TENANT,payload);
 const bindings=new Map(input.rows.map(row=>[row.key,{policyId:row.policyId,receiptId:row.receiptId}]));
 const built=intake.buildRun(input,input.rows,bindings,{uid:'synthetic_direction'},retained);
 built.manifest.activatedAt='2026-11-17T00:00:00Z';
 return {runId:input.runId,pointer:intake.pointerFor(built.manifest),manifest:built.manifest,
  proposals:built.classes.propuestasConciliacion.map(row=>({id:row.documentId,sourceRowIdSha256:row.sourceRowIdSha256}))};
}
function row(run,index,country='GT',extra={}){
 const proposal=run.proposals[index];
 return {id:proposal.id,sourceRunId:run.runId,canonicalDocumentId:proposal.id,proposalIdentity:proposal.sourceRowIdSha256,
  tenantId:TENANT,pais:country,readOnly:true,applicationPermitted:false,polizaId:'synthetic_policy_'+index,
  polizaNumero:'QA-'+index,clienteId:'synthetic_client_'+index,clienteNombre:'Cliente sintético '+index,
  asesorId:'synthetic_advisor',monto:100+index,moneda:country==='CO'?'COP':'GTQ',estado:'PROPUESTA',...extra};
}
function hold(run,index,country='GT'){
 return row(run,index,country,{polizaId:'',clienteId:'',asesorId:'',monto:null,moneda:'',
  requiresReceiptSelection:true,estado:'REQUIERE_VALIDACION'});
}
function fixture(){
 const run=requireCatalogEntry(sourceEntry());
 return {runs:[run],byCountry:{GT:[row(run,0),hold(run,1),row(run,2,'GT',{monto:null,estado:'REQUIERE_VALIDACION'})],CO:[hold(run,1,'CO')]}};
}
const rejected=(fn,code)=>assert.throws(fn,error=>String(error.message).split('\n',1)[0]===code);
const page=(rows,nextCursor=null,extra={})=>({ok:true,serverScoped:true,scope:'all',rows,nextCursor,...extra});

test('legacy catalog is bound to the unchanged canonical contract and manifest count',()=>{
 const entry=legacyEntry();assert.equal(requireCatalogEntry(entry),entry);
 assert.equal(entry.proposals.length,contract.EXPECTED_COUNTS.propuestasConciliacion);
 const changed=clone(entry);changed.manifest.expectedCounts.propuestasConciliacion--;
 rejected(()=>requireCatalogEntry(changed),'COBROS_LEDGER_EXPECTED_COUNTS_MISMATCH');
});
test('valid source V2 uses its own variable count and retains the canonical legacy descriptor',()=>{
 const old=legacyEntry(),retained=intake.retentionOf(old.pointer,old.manifest);
 for(const count of [1,3,7]){
  const entry=sourceEntry(count,retained);assert.equal(requireCatalogEntry(entry),entry);
  assert.equal(entry.proposals.length,count);assert.equal(entry.manifest.retainedRuns[0].runId,old.runId);
 }
});
for(const [name,change,code]of [
 ['source count',e=>e.proposals.pop(),'I66_REAL_MANIFEST_PROPOSAL_COUNT_DRIFT'],
 ['run identity',e=>e.runId='cobledger_'+'d'.repeat(28),'I66_REAL_CATALOG_RUN_DRIFT'],
 ['duplicate document',e=>e.proposals[1].id=e.proposals[0].id,'I66_REAL_SOURCE_ID_DUPLICATE_OR_INVALID'],
 ['invalid document',e=>e.proposals[0].id='../invalid','I66_REAL_SOURCE_ID_DUPLICATE_OR_INVALID'],
 ['invalid hash',e=>e.proposals[0].sourceRowIdSha256='invalid','I66_REAL_SOURCE_HASH_INVALID'],
 ['wrong tenant',e=>e.manifest.tenantId='foreign','COBROS_LEDGER_V2_CONTRACT_INVALID'],
 ['mutated manifest',e=>e.manifest.actor.uid='changed','COBROS_LEDGER_V2_CONTRACT_INVALID']
])test('catalog rejects '+name,()=>{const entry=sourceEntry();change(entry);rejected(()=>requireCatalogEntry(entry),code);});

test('old 52-only expectation rejects accepted HOLD rows; manifest/ID/UI parity preserves every proposal',()=>{
 const run=requireCatalogEntry(legacyEntry()),byCountry={GT:[],CO:[]};
 run.proposals.forEach((_,i)=>{
  if(i<52){const country=i<26?'GT':'CO';byCountry[country].push(row(run,i,country));}
  else{byCountry.GT.push(hold(run,i));byCountry.CO.push(hold(run,i,'CO'));}
 });
 assert.throws(()=>assert.equal(byCountry.GT.length+byCountry.CO.length,52));
 const result=summarizeProjection(byCountry,[run]);
 assert.equal(result.uniqueVisibleProposals,run.manifest.expectedCounts.propuestasConciliacion);
 assert.equal(result.linkedProposals,52);assert.equal(result.identityHoldProposals,80);
 assert.equal(result.repeatedCountryViews,80);
 assert.deepEqual(requireUiProjection(byCountry,result.expectedStagedProposals),{GT:106,CO:106,union:132});
});
test('dynamic V2 coverage counts source holds and cross-country identity holds without inventing money',()=>{
 const {runs,byCountry}=fixture(),result=summarizeProjection(byCountry,runs);
 assert.equal(result.expectedStagedProposals,3);assert.equal(result.uniqueVisibleProposals,3);
 assert.equal(result.linkedProposals,2);assert.equal(result.identityHoldProposals,1);assert.equal(result.repeatedCountryViews,1);
 assert.deepEqual(result.authorizedProjectionByCountry.GT,{rows:3,identityHolds:1,sourceHolds:2,linked:2,applied:0});
 assert.deepEqual(requireUiProjection(byCountry,3),{GT:3,CO:1,union:3});
});
for(const [name,change,code]of [
 ['missing row',f=>f.byCountry.GT.pop(),'I66_REAL_STAGE_PROPOSAL_COVERAGE_INCOMPLETE'],
 ['unknown ID',f=>f.byCountry.GT[0].canonicalDocumentId='unknown','I66_REAL_PROJECTED_ID_UNKNOWN_OR_DUPLICATE'],
 ['duplicate in country',f=>f.byCountry.GT.push(clone(f.byCountry.GT[0])),'I66_REAL_PROJECTED_ID_UNKNOWN_OR_DUPLICATE'],
 ['foreign tenant',f=>f.byCountry.GT[0].tenantId='foreign','I66_REAL_PROJECTION_SCOPE_OR_WRITE_DRIFT'],
 ['foreign country',f=>f.byCountry.GT[0].pais='CO','I66_REAL_PROJECTION_SCOPE_OR_WRITE_DRIFT'],
 ['write enabled',f=>f.byCountry.GT[0].applicationPermitted=true,'I66_REAL_PROJECTION_SCOPE_OR_WRITE_DRIFT'],
 ['mutable row',f=>f.byCountry.GT[0].readOnly=false,'I66_REAL_PROJECTION_SCOPE_OR_WRITE_DRIFT'],
 ['source hash drift',f=>f.byCountry.GT[0].proposalIdentity='d'.repeat(64),'I66_REAL_PROJECTED_SOURCE_HASH_DRIFT'],
 ['HOLD client leaked',f=>f.byCountry.GT[1].clienteId='sensitive','I66_REAL_IDENTITY_HOLD_REDACTION_DRIFT'],
 ['HOLD amount leaked',f=>f.byCountry.GT[1].monto=1,'I66_REAL_IDENTITY_HOLD_REDACTION_DRIFT'],
 ['HOLD currency leaked',f=>f.byCountry.GT[1].moneda='GTQ','I66_REAL_IDENTITY_HOLD_REDACTION_DRIFT'],
 ['bound client missing',f=>f.byCountry.GT[0].clienteId='','I66_REAL_BOUND_PROJECTION_INCOMPLETE'],
 ['negative amount',f=>f.byCountry.GT[0].monto=-1,'I66_REAL_AMOUNT_OR_SOURCE_HOLD_INVALID'],
 ['unmarked null amount',f=>f.byCountry.GT[0].monto=null,'I66_REAL_AMOUNT_OR_SOURCE_HOLD_INVALID'],
 ['legacy null amount',f=>f.runs[0].manifest.schemaVersion=contract.MANIFEST_SCHEMA,'I66_REAL_AMOUNT_OR_SOURCE_HOLD_INVALID'],
 ['country classification drift',f=>f.byCountry.CO[0]=row(f.runs[0],1,'CO'),'I66_REAL_COUNTRY_IDENTITY_CLASS_DRIFT'],
 ['UI source identity collision',f=>f.runs[0].proposals[1].sourceRowIdSha256=f.runs[0].proposals[0].sourceRowIdSha256,'I66_REAL_CATALOG_SOURCE_IDENTITY_DUPLICATE'],
 ['catalog ID duplicate',f=>f.runs.push(clone(f.runs[0])),'I66_REAL_CATALOG_DUPLICATE_ID'],
 ['omitted country',f=>delete f.byCountry.CO,'I66_REAL_COUNTRY_SET_DRIFT']
])test('projection fails closed for '+name,()=>{const f=fixture();change(f);rejected(()=>summarizeProjection(f.byCountry,f.runs),code);});

test('pagination reads every bounded page, including an empty page with retained-source continuation',async()=>{
 const seen=[],pages={'':page([1],'second'),second:page([],'third'),third:page([2,3])};
 assert.deepEqual(await readAllPages(async cursor=>{seen.push(cursor);return pages[cursor];},3),[1,2,3]);
 assert.deepEqual(seen,['','second','third']);
});
for(const [name,read,max,code]of [
 ['server denial',()=>page([],'',{serverScoped:false}),0,'I66_REAL_DIRECTION_SERVER_SCOPE_REQUIRED'],
 ['failed result',()=>page([],'',{ok:false}),0,'I66_REAL_DIRECTION_SERVER_SCOPE_REQUIRED'],
 ['own-only scope',()=>page([],'',{scope:'own'}),0,'I66_REAL_DIRECTION_SERVER_SCOPE_REQUIRED'],
 ['oversized page',()=>page(Array(201).fill(1)),300,'I66_REAL_READER_PAGE_BOUND_HOLD'],
 ['excess source rows',()=>page([1,2]),1,'I66_REAL_READER_TOTAL_BOUND_HOLD'],
 ['cursor cycle',()=>page([],'repeat'),0,'I66_REAL_READER_CURSOR_CYCLE'],
 ['invalid cursor',()=>page([],1),0,'I66_REAL_READER_CURSOR_CYCLE']
])test('pagination holds for '+name,async()=>{await assert.rejects(()=>readAllPages(read,max),error=>error.message===code);});
test('pagination stops rather than silently truncating beyond its bounded read budget',async()=>{
 let calls=0;await assert.rejects(()=>readAllPages(async()=>page([],'cursor_'+(++calls)),0),/I66_REAL_READER_PAGINATION_BOUND_HOLD/);
 assert.equal(calls,64);
});

test('normalized source/domain parity ignores ordering and detects a changed protected or visible field',()=>{
 const rows=fixture().byCountry.GT;
 assert.deepEqual(normalizedProjection(rows),normalizedProjection(rows.slice().reverse()));
 for(const [field,value]of [['id','other'],['monto',1],['clienteId','other'],['polizaNumero','other'],['estado','APLICADA'],['pais','CO'],['proposalIdentity','d'.repeat(64)],['applicationPermitted',true]]){
  const changed=clone(rows);changed[0][field]=value;
  assert.notDeepEqual(normalizedProjection(rows),normalizedProjection(changed),field);
 }
});
test('canonical UI normalization cannot hide a missing or collapsed identity',()=>{
 const {byCountry}=fixture();
 rejected(()=>requireUiProjection(byCountry,4),'I66_REAL_SOURCE_UI_MANIFEST_COVERAGE_INCOMPLETE');
 byCountry.GT[0].estado='UNKNOWN_STATE';
 rejected(()=>requireUiProjection(byCountry,3),'I66_REAL_SOURCE_UI_NORMALIZATION_DRIFT');
});
function serving(){
 const live={sourceSha:'e'.repeat(40),buildId:'synthetic-build'};
 return {live,markers:ORIGINS.map(origin=>({origin,marker:{...live,product:'Gravicentra Insurance',gate:'I6.6'}}))};
}
test('served identity is exact on both origins and remains separate from executed source identity',()=>{
 const {live,markers}=serving();assert.deepEqual(requireServingIdentity(live,markers),{...live,origins:ORIGINS});
});
for(const [name,change,code]of [
 ['authority absent',f=>f.live.sourceSha='','I66_REAL_LIVE_AUTHORITY_MISSING'],
 ['empty build',f=>f.live.buildId='','I66_REAL_LIVE_AUTHORITY_MISSING'],
 ['missing origin',f=>f.markers.pop(),'I66_REAL_LIVE_ORIGIN_COUNT_DRIFT'],
 ['different origin',f=>f.markers[1].origin='https://example.invalid','I66_REAL_LIVE_ORIGIN_DRIFT'],
 ['source drift',f=>f.markers[0].marker.sourceSha='f'.repeat(40),'I66_REAL_LIVE_SERVED_MARKER_DRIFT'],
 ['build drift',f=>f.markers[1].marker.buildId='other-build','I66_REAL_LIVE_SERVED_MARKER_DRIFT'],
 ['product drift',f=>f.markers[1].marker.product='Other','I66_REAL_LIVE_SERVED_MARKER_DRIFT'],
 ['gate drift',f=>f.markers[0].marker.gate='I5','I66_REAL_LIVE_SERVED_MARKER_DRIFT']
])test('served binding rejects '+name,()=>{const f=serving();change(f);rejected(()=>requireServingIdentity(f.live,f.markers),code);});
