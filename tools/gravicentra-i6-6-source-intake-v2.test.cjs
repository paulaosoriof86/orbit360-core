'use strict';
// Actual authenticated domain + real planner/projection; isolated transactional
// Firestore double, synthetic rows only. No SDK credentials/network/cloud writes.
const {test,beforeEach}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),owner=path.join(root,'functions/cobros-reconciliation-domain.js');
const requireOwner=createRequire(owner);
const intake=require('../functions/cobros-source-intake-v2');
const contract=require('../functions/cobros-ledger-contract');
const {readActiveLedgerProposalPage}=require('../functions/i66-conciliaciones-active-ledger-projection');
const clone=x=>x==null?x:structuredClone(x);
let documents,writes,transactionTail,failCommit,corruptAfterCommit;
class Ref{
 constructor(parts,filters=[],max=Infinity,ordered=false){this.parts=parts;this.filters=filters;this.max=max;this.ordered=ordered;this.id=parts.at(-1);this.path=parts.join('/');}
 collection(n){return new Ref([...this.parts,n]);}doc(n){return new Ref([...this.parts,n]);}
 where(k,op,v){assert.ok(['==','in'].includes(op));return new Ref(this.parts,[...this.filters,[k,op,v]],this.max,this.ordered);}
 limit(n){return new Ref(this.parts,this.filters,n,this.ordered);}orderBy(k){assert.equal(k,'__name__');return new Ref(this.parts,this.filters,this.max,true);}
 async get(){return snapshot(this,documents);}
}
function snapshot(ref,store){
 if(ref.parts.length%2===0){const value=store.get(ref.path);return {id:ref.id,ref,exists:!!value,data:()=>clone(value)};}
 let entries=[...store.entries()].filter(([k,v])=>k.startsWith(ref.path+'/')&&k.split('/').length===ref.parts.length+1&&ref.filters.every(([key,op,value])=>op==='=='?v[key]===value:value.includes(v[key])));
 if(ref.ordered)entries.sort(([a],[b])=>a.localeCompare(b));
 const docs=entries.slice(0,ref.max).map(([key,value])=>({id:key.split('/').at(-1),ref:new Ref(key.split('/')),exists:true,data:()=>clone(value)}));
 return {docs,size:docs.length,empty:!docs.length};
}
function materialize(value,inArray=false){
 assert.notEqual(value,undefined,'Firestore must never receive undefined');
 if(value&&typeof value==='object'&&value.__timestamp===true){assert.equal(inArray,false,'No FieldValue transforms in arrays');return '2026-11-17T12:00:00.000Z';}
 if(Array.isArray(value))return value.map(v=>materialize(v,true));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,materialize(v,inArray)]));
 return value;
}
const db={collection:name=>new Ref([name]),getAll:async(...refs)=>Promise.all(refs.map(ref=>ref.get())),runTransaction:fn=>{
 const work=transactionTail.then(async()=>{
  const staged=new Map([...documents].map(([k,v])=>[k,clone(v)]));let writing=false,writeCount=0;
  const tx={get:async ref=>{assert.equal(writing,false,'All transaction reads must precede writes');return snapshot(ref,staged);},
   set:(ref,value,options)=>{writing=true;writeCount++;const next=materialize(value);staged.set(ref.path,options&&options.merge?{...staged.get(ref.path),...next}:next);}};
  const result=await fn(tx);if(failCommit)throw Error('SYNTHETIC_COMMIT_FAILURE');documents=staged;writes+=writeCount;
  if(corruptAfterCommit)corruptAfterCommit(documents);
  return result;
 });transactionTail=work.catch(()=>{});return work;
}};
class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
const exported={};
vm.runInNewContext(fs.readFileSync(owner,'utf8'),{exports:exported,process:{env:{}},console,require:n=>
 n==='firebase-admin/app'?{getApps:()=>[{}],initializeApp:()=>({})}:
 n==='firebase-admin/firestore'?{getFirestore:()=>db,FieldValue:{serverTimestamp:()=>({__timestamp:true})}}:
 n==='firebase-functions/v2/https'?{HttpsError,onCall:(_,handler)=>({run:handler})}:requireOwner(n)});
const command=exported.orbit360CobrosReconciliationCommand,previewCommand=exported.orbit360CobrosReconciliationCommandPreview;
let tenant;
const base=()=>`tenants/${tenant}`;
const item=(kind,id)=>`${base()}/data/${kind}/items/${id}`;
const set=(key,value)=>documents.set(key,clone(value));
const table=kind=>[...documents].filter(([key])=>key.startsWith(item(kind,''))&&key.split('/').length===6);
const business=()=>[...documents].filter(([key])=>['polizas','recibosEsperados','carteraPrimas','cobros','finmovs'].some(kind=>key.startsWith(item(kind,''))));
function seed(){
 tenant='synthetic-intake-tenant';documents=new Map();writes=0;transactionTail=Promise.resolve();failCommit=false;corruptAfterCommit=null;
 for(const [uid,role,countries]of [['direction','Dirección',['GT']],['ops','Operativo',['GT']],['advisor','Asesor',['GT']],['foreign','Dirección',['CO']]])
  set(`${base()}/members/${uid}`,{uid,tenantId:tenant,status:'active',roles:[role],countries,dataScopes:{default:'all'},modulesExtra:role==='Operativo'?['conciliaciones']:[]});
 set(`${base()}/config/access`,{roleScopes:{direccion:'all',operativo:'all',asesor:'own'},rolePermissions:{Operativo:{Conciliaciones:{ver:true,editar:true}}}});
 set(`${base()}/config/reconciliation`,{autoCommitHighConfidence:true,requireSameCurrency:true});
 set(item('aseguradoras','insurer_qa'),{tenantId:tenant,pais:'GT',nombre:'Aseguradora sintética'});
 addPolicy('policy_qa','QA-001',3);
}
function addPolicy(id,number,total=3,extras={}){
 set(item('polizas',id),{id,tenantId:tenant,numero:number,aseguradoraId:'insurer_qa',clienteId:'client_qa',pais:'GT',moneda:'GTQ',vigenciaDesde:'2026-01-01',vigenciaHasta:'2027-01-01',...extras});
 set(item('clientes','client_qa'),{id:'client_qa',tenantId:tenant,pais:'GT',nombre:'Cliente sintético'});
 for(let n=1;n<=total;n++){
  const receiptId=id+'_r'+n;
  set(item('recibosEsperados',receiptId),{id:receiptId,tenantId:tenant,polizaId:id,clienteId:'client_qa',pais:'GT',moneda:'GTQ',numeroReciboFuente:'REQ-'+n,
   cuota:n+'/'+total,vence:'2026-'+String(n).padStart(2,'0')+'-01',monto:100,estado:'Pendiente',...extras});
  set(item('carteraPrimas',id+'_c'+n),{id:id+'_c'+n,tenantId:tenant,polizaId:id,clienteId:'client_qa',reciboId:receiptId,pais:'GT',moneda:'GTQ',monto:100,estado:'Pendiente',carteraActiva:true,...extras});
 }
}
function payload(patch={}){return {schemaVersion:intake.INPUT_SCHEMA,sourceAttestation:true,
 source:{sourceId:'sha256:'+'a'.repeat(64),documentRef:'drive:SyntheticDocument001',fileName:'synthetic.csv',sha256:'a'.repeat(64),
  evidenceAsOfDate:'2026-11-16',country:'GT',currency:'GTQ',evidenceType:'INVOICE_INSTALLMENT_N',insurerId:'insurer_qa'},
 rows:[{rowId:'row_001',sheet:'Sheet1',rowNumber:2,policyNumber:'QA-001',policyId:'policy_qa',receiptId:'policy_qa_r1',
  receiptNumber:'REQ-1',installment:'1/3',amount:100}],...patch};}
const request=(operation,payload,uid='direction',activeRole='Dirección')=>({auth:{uid,token:{}},data:{tenantId:tenant,operation,payload,activeRole,reason:'Prueba de fuente sintética'}});
const submit=(p=payload(),uid='direction',role='Dirección')=>command.run(request('intake_source_run',p,uid,role));
const sourceOf=run=>documents.get(item('cobrosLedgerRuns',run));
const stageOf=(run,kind,id)=>documents.get(item('cobrosLedgerRuns',run)+'/'+kind+'/'+id);
const rejectCode=(fn,code)=>assert.rejects(fn,error=>error.message===code);
function legacy(){
 const runId='cobledger_'+'b'.repeat(28),aggregate='c'.repeat(64);
 const pointer={id:'active',schemaVersion:contract.POINTER_SCHEMA,status:'ACTIVE',activeRunId:runId,sourceLedgerCount:365,
  sourceLedgerDigest:contract.SOURCE_LEDGER_DIGEST,packageLogicalSha256:contract.PACKAGE_LOGICAL_SHA256,aggregateDigest:aggregate,activatedAt:'2026-08-05'};
 const manifest={id:runId,runId,tenantId:tenant,schemaVersion:contract.MANIFEST_SCHEMA,gateId:contract.GATE_ID,contractVersion:contract.CONTRACT_VERSION,
  status:'ACTIVE',activationState:'ACTIVE',activatedAt:'2026-08-05',sourceLedgerCount:365,sourceLedgerDigest:contract.SOURCE_LEDGER_DIGEST,
  packageLogicalSha256:contract.PACKAGE_LOGICAL_SHA256,expectedAggregateDigest:aggregate,expectedCounts:contract.EXPECTED_COUNTS,stageDocumentCount:1095,
  newCobros:0,receiptWrites:0,policyWrites:0,finmovWrites:0};
 set(item('cobrosLedgerControl','active'),pointer);set(item('cobrosLedgerRuns',runId),manifest);
 for(let i=0;i<132;i++){
  const id='legacy_'+String(i).padStart(3,'0'),original={documentId:id,tenantId:tenant,sourceRowId:'old_'+i,sourceRowIdSha256:intake.digest(id),policyNumber:'QA-001',currency:'GTQ',amount:100};
  set(item('cobrosLedgerRuns',runId)+'/propuestasConciliacion/'+id,{...original,runId,documentClass:'propuestasConciliacion',activationState:'STAGED',
   sourceLedgerDigest:contract.SOURCE_LEDGER_DIGEST,packageLogicalSha256:contract.PACKAGE_LOGICAL_SHA256,payloadDigest:intake.digest(original)});
 }
 return {runId,pointer,manifest};
}
const readPage=(size=200,cursor='',country='GT',scope='all')=>readActiveLedgerProposalPage({db,tenant:db.collection('tenants').doc(tenant),tenantId:tenant,
 ctx:{tenantId:tenant,country,collection:'conciliaciones',role:'direccion',scope,advisorId:'qa_advisor',team:[]},pageSize:size,cursor});
beforeEach(seed);

test('admission is atomic sources/proposals only with exact readback',async()=>{
 const before=clone(business()),out=await submit();assert.equal(out.readbackConfirmed,true);assert.equal(out.financialWrites,0);
 assert.equal(out.counts.sourceRows,1);assert.equal(out.counts.proposals,1);assert.equal(out.counts.holds,0);assert.equal(out.sourceSha256,'a'.repeat(64));
 assert.deepEqual(business(),before);assert.equal(writes,out.intakeWrites);assert.equal(out.intakeWrites,8);
 const manifest=sourceOf(out.sourceRunId);assert.equal(manifest.actor.uid,'direction');assert.equal(manifest.source.documentRef,'drive:SyntheticDocument001');
 assert.equal(stageOf(out.sourceRunId,'evidenciasCobro','srcev_'+intake.prepareInput(tenant,payload()).rows[0].key.slice(0,40)).paidDate,'');
 assert.doesNotThrow(()=>contract.validateActiveLedgerContract(documents.get(item('cobrosLedgerControl','active')),manifest,tenant));
});
test('transaction failure publishes neither partial stage nor pointer',async()=>{
 const before=clone([...documents]);failCommit=true;await rejectCode(()=>submit(),'SOURCE_INTAKE_COMMIT_FAILED');assert.deepEqual([...documents],before);assert.equal(writes,0);
});
test('concurrent identical submissions admit once and replay verifies immutable data',async()=>{
 const [a,b]=await Promise.all([submit(),submit()]);assert.equal(a.sourceRunId,b.sourceRunId);assert.equal(b.status,'SOURCE_RUN_REUSED');assert.equal(b.intakeWrites,0);assert.equal(b.readbackConfirmed,true);
 assert.equal(table('cobrosLedgerRuns').length,1);assert.equal(writes,a.intakeWrites);assert.equal(table('cobros').length,0);
});
test('distinct chunks of same source preserve runs and globally dedupe repeated rows',async()=>{
 const p=payload(),first=await submit(p),q=payload();q.rows=[...p.rows,{...p.rows[0],rowId:'row_002',rowNumber:3,receiptId:'policy_qa_r2',receiptNumber:'REQ-2',installment:'2/3'}];
 const second=await submit(q);assert.equal(second.counts.duplicates,1);assert.equal(second.counts.sourceRows,1);assert.equal(sourceOf(second.sourceRunId).retainedRuns[0].runId,first.sourceRunId);
 assert.equal(table('cobrosLedgerSourceRows').length,2);
 const reused=await submit({...q,rows:[q.rows[1]]});assert.equal(reused.sourceRunId,null);assert.deepEqual(reused.reusedRunIds,[second.sourceRunId]);assert.equal(reused.intakeWrites,0);assert.equal(reused.readbackConfirmed,true);
});
test('immutable source metadata and row bodies cannot be silently replaced',async()=>{
 await submit();const before=clone([...documents]);
 const p=payload();p.source.evidenceAsOfDate='2026-11-15';await rejectCode(()=>submit(p),'SOURCE_METADATA_IMMUTABLE');
 const q=payload();q.rows[0].amount=101;await rejectCode(()=>submit(q),'SOURCE_ROW_IMMUTABLE');assert.deepEqual([...documents],before);
});
test('filename is presentation, not unique source identity',async()=>{await submit();const p=payload();p.source.fileName='renamed.csv';const out=await submit(p);assert.equal(out.reused,true);assert.equal(table('cobrosLedgerRuns').length,1);});
test('derivative extraction provenance is separate and immutable',async()=>{
 const p=payload();p.source.extractionFile={fileName:'mapped.csv',sha256:'d'.repeat(64)};const out=await submit(p);assert.equal(sourceOf(out.sourceRunId).source.extractionFile.sha256,'d'.repeat(64));
 p.source.extractionFile.sha256='e'.repeat(64);await rejectCode(()=>submit(p),'SOURCE_METADATA_IMMUTABLE');
});
test('HOLD source does not invent a policy, receipt, payment or date',async()=>{
 const p=payload();p.rows[0].policyNumber='QA-MISSING';p.rows[0].policyId='';p.rows[0].receiptId='';const out=await submit(p);
 assert.equal(out.counts.holds,1);assert.equal(out.rowResults[0].reason,'SOURCE_POLICY_EDITION_NOT_FOUND');assert.equal(table('polizas').length,1);assert.equal(table('cobros').length,0);
 const page=await readPage();assert.equal(page.rows.length,1);assert.equal(page.rows[0].monto,null);assert.equal(page.rows[0].clienteId,'');assert.equal(page.rows[0].estado,'REQUIERE_VALIDACION');
 assert.equal((await readPage(200,'','GT','own')).rows.length,0);
});
test('pending suffix creates one anchor, never one inference per pending row',async()=>{
 const p=payload();p.source.evidenceType='INSURER_STATEMENT_PENDING_FROM_N';p.source.completePolicyGroups=true;
 p.rows=[2,3].map(n=>({...p.rows[0],rowId:'row_00'+n,rowNumber:n+1,receiptId:'policy_qa_r'+n,receiptNumber:'REQ-'+n,installment:n+'/3'}));
 const out=await submit(p);assert.equal(out.counts.sourceRows,2);assert.equal(out.counts.proposals,1);assert.equal(out.counts.supportingRows,1);
 const proposal=stageOf(out.sourceRunId,'propuestasConciliacion',out.proposalIds[0]);assert.equal(proposal.installment,'2/3');assert.equal(proposal.paidDate,'');
 const assessed=await command.run(request('preview_proposal_application',{proposalId:out.proposalIds[0],sourceRunId:out.sourceRunId}));
 assert.equal(assessed.eligible,true);assert.equal(assessed.targets.length,1);assert.equal(assessed.targets[0].installment,1);assert.equal(assessed.targets[0].mode,'INFERRED');
 assert.equal(table('cobros').length,0);
});
test('pending suffix beginning at one has no eligible payment target',async()=>{
 const p=payload();p.source.evidenceType='INSURER_STATEMENT_PENDING_FROM_N';p.source.completePolicyGroups=true;
 p.rows=[1,2,3].map(n=>({...p.rows[0],rowId:'row_'+n,rowNumber:n+1,receiptId:'policy_qa_r'+n,receiptNumber:'REQ-'+n,installment:n+'/3'}));
 const out=await submit(p);const assessed=await command.run(request('preview_proposal_application',{proposalId:out.proposalIds[0],sourceRunId:out.sourceRunId}));
 assert.equal(assessed.eligible,false);assert.equal(assessed.status,'NOOP_ALREADY_SATISFIED');assert.equal(table('cobros').length,0);
});
for(const [label,mutate,code]of [
 ['attestation',p=>p.sourceAttestation=false,'SOURCE_ATTESTATION_REQUIRED'],
 ['old schema',p=>p.schemaVersion='v1','SOURCE_ATTESTATION_REQUIRED'],
 ['unknown top field',p=>p.actor={uid:'forged'},'SOURCE_INTAKE_PAYLOAD_INVALID'],
 ['unknown row field',p=>p.rows[0].tenantId='other','SOURCE_ROW_FIELDS_INVALID'],
 ['hash placeholder',p=>p.source.sha256='unknown','SOURCE_SHA256_INVALID'],
 ['hash newline',p=>p.source.sha256+='\n','SOURCE_SHA256_REQUIRED'],
 ['name only reference',p=>p.source.documentRef='source.csv','SOURCE_DOCUMENT_REFERENCE_INVALID'],
 ['hash only reference',p=>p.source.documentRef='sha256:'+'a'.repeat(64),'SOURCE_DOCUMENT_REFERENCE_INVALID'],
 ['foreign reference host',p=>p.source.documentRef='https://evil.example/file','SOURCE_DOCUMENT_REFERENCE_INVALID'],
 ['Drive credential query',p=>p.source.documentRef='https://drive.google.com/open?id=SyntheticDoc001&token=secret','SOURCE_DOCUMENT_REFERENCE_INVALID'],
 ['missing insurer',p=>delete p.source.insurerId,'SOURCE_INSURER_ID_REQUIRED'],
 ['wrong currency country',p=>p.source.currency='COP','SOURCE_COUNTRY_CURRENCY_MISMATCH'],
 ['missing country',p=>delete p.source.country,'SOURCE_COUNTRY_REQUIRED'],
 ['unknown type',p=>p.source.evidenceType='manual','SOURCE_EVIDENCE_TYPE_UNSUPPORTED'],
 ['invalid cutoff',p=>p.source.evidenceAsOfDate='2026-02-30','SOURCE_CUT_DATE_INVALID'],
 ['negative amount',p=>p.rows[0].amount=-1,'SOURCE_AMOUNT_INVALID'],
 ['fractional cent',p=>p.rows[0].amount=100.001,'SOURCE_AMOUNT_INVALID'],
 ['string amount',p=>p.rows[0].amount='100','SOURCE_AMOUNT_INVALID'],
 ['row id newline',p=>p.rows[0].rowId+='\n','SOURCE_ROW_ID_REQUIRED'],
 ['missing sheet',p=>delete p.rows[0].sheet,'SOURCE_SHEET_INVALID'],
 ['missing physical row',p=>delete p.rows[0].rowNumber,'SOURCE_ROW_NUMBER_INVALID'],
 ['duplicate row locator',p=>p.rows.push({...p.rows[0]}),'SOURCE_ROW_ID_DUPLICATE'],
 ['invalid installment',p=>p.rows[0].installment='4/3','SOURCE_INSTALLMENT_INVALID'],
 ['conflicting total',p=>p.rows[0].totalInstallments=12,'SOURCE_INSTALLMENT_INVALID'],
 ['invented paid date',p=>p.rows[0].paidDate='2026-11-10','SOURCE_PAID_DATE_NOT_PROVEN'],
 ['paid date after cutoff',p=>Object.assign(p.rows[0],{paidDate:'2026-11-17',actualPaidDateEvidence:true}),'SOURCE_PAID_DATE_NOT_PROVEN'],
 ['empty date attestation',p=>p.rows[0].actualPaidDateEvidence=true,'SOURCE_PAID_DATE_REQUIRED'],
 ['no rows',p=>p.rows=[],'SOURCE_ROW_BOUND_EXCEEDED'],
 ['101 rows',p=>p.rows=Array.from({length:101},(_,i)=>({...p.rows[0],rowId:'row_'+i})),'SOURCE_ROW_BOUND_EXCEEDED']
])test('rejects '+label+' without writes',async()=>{const p=payload();mutate(p);const before=clone([...documents]);await rejectCode(()=>submit(p),code);assert.equal(writes,0);assert.deepEqual([...documents],before);});
for(const [label,indices,complete,extra,code]of [
 ['missing completeness',[2,3],false,{},'SOURCE_COMPLETE_POLICY_GROUPS_REQUIRED'],
 ['missing tail',[2],true,{},'SOURCE_PENDING_SEQUENCE_INCOMPLETE_OR_DUPLICATE'],
 ['gap',[1,3],true,{},'SOURCE_PENDING_SEQUENCE_INCOMPLETE_OR_DUPLICATE'],
 ['duplicate sequence',[2,2,3],true,{},'SOURCE_PENDING_SEQUENCE_INCOMPLETE_OR_DUPLICATE'],
 ['false payment',[2,3],true,{paymentConfirmed:true},'SOURCE_PENDING_STATEMENT_IS_NOT_PAYMENT'],
 ['real date on pending',[2,3],true,{paidDate:'2026-10-01',actualPaidDateEvidence:true},'SOURCE_PENDING_STATEMENT_IS_NOT_PAYMENT']
])test('pending '+label+' cannot infer absent rows',async()=>{const p=payload();Object.assign(p.source,{evidenceType:'INSURER_STATEMENT_PENDING_FROM_N',completePolicyGroups:complete});
 p.rows=indices.map((n,i)=>({...p.rows[0],rowId:'row_'+i,rowNumber:i+2,installment:n+'/3',...extra}));await rejectCode(()=>submit(p),code);assert.equal(writes,0);});
test('explicit date and method remain source facts, not server defaults',async()=>{const p=payload();Object.assign(p.rows[0],{paidDate:'2026-11-10',actualPaidDateEvidence:true,paymentMethod:'Transferencia',invoiceNumber:'QA-INVOICE-1'});
 const out=await submit(p),evidence=stageOf(out.sourceRunId,'propuestasConciliacion',out.proposalIds[0]);assert.equal(evidence.paidDate,'2026-11-10');assert.equal(evidence.paymentMethod,'Transferencia');assert.equal(evidence.invoiceNumber,'QA-INVOICE-1');});
test('advisor cannot promote a permission string into intake authority',async()=>{documents.get(`${base()}/members/advisor`).permissions=['cobros_manage'];await assert.rejects(()=>submit(payload(),'advisor','Asesor'),e=>e.code==='permission-denied');assert.equal(writes,0);});
test('assigned operational role with module permission may admit sources',async()=>{const out=await submit(payload(),'ops','Operativo');assert.equal(out.readbackConfirmed,true);assert.equal(sourceOf(out.sourceRunId).actor.activeRole,'operativo');});
test('explicit module deny is enforced',async()=>{documents.get(`${base()}/config/access`).rolePermissions.Dirección={Conciliaciones:{ver:false,editar:false}};await assert.rejects(()=>submit(),e=>e.code==='permission-denied');assert.equal(writes,0);});
test('foreign country membership cannot admit GT source',async()=>{await assert.rejects(()=>submit(payload(),'foreign'),e=>e.code==='permission-denied');assert.equal(writes,0);});
test('forged active role and cross tenant are rejected',async()=>{
 await assert.rejects(()=>submit(payload(),'direction','SuperAdmin'),e=>e.code==='permission-denied');const r=request('intake_source_run',payload());r.data.tenantId='foreign-tenant';await assert.rejects(()=>command.run(r),e=>e.code==='permission-denied');assert.equal(writes,0);
});
test('nonempty incompatible canonical proposal book blocks invisible admission',async()=>{set(item('conciliaciones','legacy'),{id:'legacy'});await rejectCode(()=>submit(),'SOURCE_CANONICAL_PROJECTION_CONFLICT');assert.equal(writes,0);});
test('tampered post-commit source is not declared readback PASS',async()=>{corruptAfterCommit=store=>{const entry=[...store].find(([key])=>key.includes('/evidenciasCobro/'));entry[1].amount=777;};await rejectCode(()=>submit(),'SOURCE_INTAKE_READBACK_MISMATCH');assert.ok(writes>0);});
test('legacy validator pins remain strict after adding V2',()=>{const l=legacy();assert.doesNotThrow(()=>contract.validateActiveLedgerContract(l.pointer,l.manifest,tenant));const bad=clone(l.pointer);bad.sourceLedgerCount=366;assert.throws(()=>contract.validateActiveLedgerContract(bad,l.manifest,tenant),/SOURCE_COUNT_MISMATCH/);});
test('legacy and new source proposals stay browsable across pages',async()=>{const l=legacy(),before=clone(documents.get(item('cobrosLedgerRuns',l.runId)));const out=await submit();assert.deepEqual(documents.get(item('cobrosLedgerRuns',l.runId)),before);
 const first=await readPage(10);assert.equal(first.rows.length,10);assert.equal(first.rows[0].sourceRunId,out.sourceRunId);assert.match(first.nextCursor,/^srcv2:/);
 let cursor=first.nextCursor,all=first.rows;while(cursor){const next=await readPage(10,cursor);all=all.concat(next.rows);cursor=next.nextCursor;}assert.equal(all.length,133);assert.equal(new Set(all.map(r=>r.canonicalDocumentId)).size,133);assert.equal((await readPage(200,'','CO')).rows.length,0);
});
test('retained run remains applicable and preserves original application identity',async()=>{
 const p=payload(),first=await submit(p),ready=await command.run(request('preview_proposal_application',{sourceRunId:first.sourceRunId,proposalId:first.proposalIds[0]}));
 const q=payload();q.rows=[{...q.rows[0],rowId:'row_002',rowNumber:3,receiptId:'policy_qa_r2',receiptNumber:'REQ-2',installment:'2/3'}];await submit(q);
 const applied=await command.run(request('apply_proposal_application',{sourceRunId:first.sourceRunId,proposalId:first.proposalIds[0],planDigest:ready.planDigest}));
 assert.equal(applied.readbackConfirmed,true);assert.equal(applied.sourceRunId,first.sourceRunId);assert.equal(table('cobros').length,1);
 const replay=await command.run(request('preview_proposal_application',{sourceRunId:first.sourceRunId,proposalId:first.proposalIds[0]}));assert.equal(replay.reused,true);assert.equal(table('cobros').length,1);
 const page=await readPage();assert.equal(page.rows.find(row=>row.sourceRunId===first.sourceRunId).status,'APLICADA');
});
test('arbitrary nonretained sourceRunId cannot be applied',async()=>{const out=await submit();const assessed=await command.run(request('preview_proposal_application',{proposalId:out.proposalIds[0],sourceRunId:'cobledger_v2_'+'f'.repeat(28)}));assert.equal(assessed.reason,'SOURCE_ACTIVE_RUN_CHANGED');});
test('a new head invalidates stale pagination instead of silently omitting rows',async()=>{legacy();const first=await submit(),page=await readPage(10);const q=payload();q.rows=[{...q.rows[0],rowId:'row_002',rowNumber:3,receiptId:'policy_qa_r2',receiptNumber:'REQ-2',installment:'2/3'}];await submit(q);await assert.rejects(()=>readPage(10,page.nextCursor),/CURSOR_DENIED/);assert.ok(first.sourceRunId);});
test('retained manifest tampering fails both reader and applicability',async()=>{const first=await submit(),q=payload();q.rows=[{...q.rows[0],rowId:'row_002',rowNumber:3}];await submit(q);sourceOf(first.sourceRunId).source.fileName='tampered';await assert.rejects(()=>readPage(),/STAGE_RETAINED_MANIFEST_INVALID/);
 const assessed=await command.run(request('preview_proposal_application',{sourceRunId:first.sourceRunId,proposalId:first.proposalIds[0]}));assert.equal(assessed.reason,'SOURCE_LEDGER_INTEGRITY_MISMATCH');});
test('source installment cannot be switched to a different canonical quota',async()=>{const p=payload();p.rows[0].installment='2/3';const out=await submit(p);assert.equal(out.counts.holds,1);
 const assessed=await command.run(request('preview_proposal_application',{sourceRunId:out.sourceRunId,proposalId:out.proposalIds[0]}));assert.equal(assessed.eligible,false);assert.equal(table('cobros').length,0);});

function qaFixture(){
 const before=[...documents];tenant='alianzas-soluciones';documents=new Map(before.map(([key,value])=>[key.replace('synthetic-intake-tenant',tenant),value&&typeof value==='object'?{...value,tenantId:tenant}:value]));
 const p=payload();p.source.sourceId='b3005qa_i66_intake_synthetic_fixture_001';p.rows[0].policyId='b3005qa_policy';p.rows[0].receiptId='b3005qa_policy_r1';
 const normalized=intake.prepareInput(tenant,p),runId='cobledgerqa_'+normalized.batchDigest.slice(0,28);
 documents.delete(item('polizas','policy_qa'));addPolicy('b3005qa_policy','QA-001',3,{__syntheticQa:true,qaRunId:runId});
 const permission={__syntheticQa:true,qaRunId:runId,intakePermission:{schemaVersion:'gi-cobros-source-intake-qa-permission-v1',tenantId:tenant,qaRunId:runId,
  actorUid:'direction',sourceId:p.source.sourceId,sourceSha256:p.source.sha256,batchDigest:normalized.batchDigest,authorized:true}};
 set(item('cobrosLedgerQaControl',runId),permission);return {p,runId,permission};
}
test('Preview rejects all real source intake without creating QA authority',async()=>{await assert.rejects(()=>previewCommand.run(request('intake_source_run',payload())),e=>e.code==='permission-denied');assert.equal(writes,0);});
test('signed synthetic Preview intake uses only preauthorized QA run and supports existing apply owner',async()=>{
 const q=qaFixture(),before=clone(business());const out=await previewCommand.run(request('intake_source_run',q.p));assert.equal(out.sourceRunId,q.runId);assert.equal(out.readbackConfirmed,true);
 assert.deepEqual(business(),before);assert.equal(table('cobrosLedgerControl').length,0);assert.equal(table('cobrosLedgerRuns').length,0);assert.equal(table('cobrosLedgerSources').length,0);
 assert.ok(out.proposalIds[0].startsWith('b3005qa_i66_proposal_'));
 const assessed=await previewCommand.run(request('preview_proposal_application',{sourceRunId:q.runId,proposalId:out.proposalIds[0]}));assert.equal(assessed.eligible,true);
 const applied=await previewCommand.run(request('apply_proposal_application',{sourceRunId:q.runId,proposalId:out.proposalIds[0],planDigest:assessed.planDigest}));assert.equal(applied.readbackConfirmed,true);
 assert.equal(documents.get(item('recibosEsperados','b3005qa_policy_r1')).paymentState,'PAID_DIRECT');assert.equal(table('cobrosLedgerControl').length,0);
});
for(const field of ['actorUid','sourceId','sourceSha256','batchDigest','qaRunId','tenantId'])test('QA permission mismatch '+field+' is fail closed',async()=>{
 const q=qaFixture();documents.get(item('cobrosLedgerQaControl',q.runId)).intakePermission[field]='wrong';await rejectCode(()=>previewCommand.run(request('intake_source_run',q.p)),'SOURCE_QA_INTAKE_PERMISSION_REQUIRED');assert.equal(writes,0);
});
test('missing QA permission cannot be manufactured by source markers',async()=>{const q=qaFixture();documents.delete(item('cobrosLedgerQaControl',q.runId));await rejectCode(()=>previewCommand.run(request('intake_source_run',q.p)),'SOURCE_QA_INTAKE_PERMISSION_REQUIRED');assert.equal(writes,0);});
test('QA fixture cannot target another QA run or real policy',async()=>{const q=qaFixture();documents.get(item('polizas','b3005qa_policy')).qaRunId='different';await rejectCode(()=>previewCommand.run(request('intake_source_run',q.p)),'SOURCE_QA_POLICY_REQUIRED');assert.equal(writes,0);});
test('the same synthetic isolation is enforced on the LIVE callable',async()=>{const q=qaFixture();const out=await submit(q.p);assert.equal(out.sourceRunId,q.runId);assert.equal(table('cobrosLedgerControl').length,0);assert.equal(table('cobrosLedgerRuns').length,0);});

test('renaming a row label cannot duplicate a physical source position',async()=>{await submit();const p=payload();p.rows[0].rowId='new_label';await rejectCode(()=>submit(p),'SOURCE_ROW_IMMUTABLE');assert.equal(table('cobrosLedgerRuns').length,1);});
test('duplicate physical source locations with distinct labels are rejected',async()=>{const p=payload();p.rows.push({...p.rows[0],rowId:'another_label'});await rejectCode(()=>submit(p),'SOURCE_ROW_ID_DUPLICATE');assert.equal(writes,0);});
test('missing commission amount stays null in the reader, never invented zero',async()=>{const p=payload();p.source.evidenceType='COMMISSION_STATEMENT_INSTALLMENT_N';delete p.rows[0].amount;const out=await submit(p);assert.equal(out.counts.proposals,1);assert.equal((await readPage()).rows[0].monto,null);});
test('source denominator mismatch is HOLD and cannot resolve to a different plan',async()=>{const p=payload();p.rows[0].installment='1/10';const out=await submit(p);assert.equal(out.counts.holds,1);
 const assessed=await command.run(request('preview_proposal_application',{sourceRunId:out.sourceRunId,proposalId:out.proposalIds[0]}));assert.equal(assessed.eligible,false);
 const resolution=await command.run(request('resolve_proposal_application',{sourceRunId:out.sourceRunId,proposalId:out.proposalIds[0],policyId:'policy_qa',receiptId:'policy_qa_r1',evidenceType:'INVOICE_INSTALLMENT_N',evidenceAsOfDate:'2026-11-16',sourceAttestation:true}));assert.equal(resolution.eligible,false);assert.equal(table('reconciliationResolutions').length,0);
});
test('pending inference writes only prior quotas with no invented paid date',async()=>{
 const p=payload();Object.assign(p.source,{evidenceType:'INSURER_STATEMENT_PENDING_FROM_N',completePolicyGroups:true});
 p.rows=[2,3].map(n=>({...p.rows[0],rowId:'row_'+n,rowNumber:n+1,receiptId:'policy_qa_r'+n,receiptNumber:'REQ-'+n,installment:n+'/3'}));
 const stored=await submit(p),anchorBefore=clone(documents.get(item('recibosEsperados','policy_qa_r2'))),ready=await command.run(request('preview_proposal_application',{sourceRunId:stored.sourceRunId,proposalId:stored.proposalIds[0]}));
 const out=await command.run(request('apply_proposal_application',{sourceRunId:stored.sourceRunId,proposalId:stored.proposalIds[0],planDigest:ready.planDigest}));assert.equal(out.readbackConfirmed,true);
 const prior=documents.get(item('recibosEsperados','policy_qa_r1'));assert.equal(prior.paymentState,'PAID_INFERRED');assert.equal(prior.paidDate,undefined);assert.equal(prior.fechaPago,undefined);assert.equal(prior.evidenceAsOfDate,'2026-11-16');
 assert.deepEqual(documents.get(item('recibosEsperados','policy_qa_r2')),anchorBefore);assert.equal(table('cobros').length,1);assert.equal(table('cobros')[0][1].paidDate,undefined);
});
test('the512 retained-run bound is explicit, never silently truncates history',async()=>{
 const first=await submit(),manifest=sourceOf(first.sourceRunId),pointer=documents.get(item('cobrosLedgerControl','active'));
 const entries=Array.from({length:512},(_,i)=>({runId:'cobledger_v2_'+i.toString(16).padStart(28,'0'),manifestDigest:'d'.repeat(64),pointer:{id:'active',status:'ACTIVE',activeRunId:'cobledger_v2_'+i.toString(16).padStart(28,'0')}}));
 assert.equal(intake.retentionOf(pointer,{...manifest,retainedRuns:entries.slice(0,511)}).length,512);
 manifest.retainedRuns=entries;manifest.manifestContentDigest=intake.manifestDigest(manifest);set(item('cobrosLedgerControl','active'),intake.pointerFor(manifest));
 const before=clone([...documents]),p=payload();p.rows[0].rowId='row_002';p.rows[0].rowNumber=3;await rejectCode(()=>submit(p),'SOURCE_RETAINED_RUN_BOUND_EXCEEDED');assert.deepEqual([...documents],before);
});
test('reader returns a progress cursor after8 filtered runs instead of omitting older history',async()=>{
 for(let i=0;i<9;i++){const p=payload();p.rows[0].rowId='batch_'+i;p.rows[0].rowNumber=i+2;await submit(p);}
 const first=await readPage(200,'','GT','own');assert.equal(first.rows.length,0);assert.match(first.nextCursor,/:8:start$/);
 const last=await readPage(200,first.nextCursor,'GT','own');assert.equal(last.rows.length,0);assert.equal(last.nextCursor,null);
});
test('all QA-created documents including group registries carry exact cleanup ownership',async()=>{
 const q=qaFixture();Object.assign(q.p.source,{evidenceType:'INSURER_STATEMENT_PENDING_FROM_N',completePolicyGroups:true});q.p.rows=[1,2,3].map(n=>({...q.p.rows[0],rowId:'qa_row_'+n,rowNumber:n+1,installment:n+'/3',receiptId:'b3005qa_policy_r'+n,receiptNumber:'REQ-'+n}));
 const normalized=intake.prepareInput(tenant,q.p),runId='cobledgerqa_'+normalized.batchDigest.slice(0,28);addPolicy('b3005qa_policy','QA-001',3,{__syntheticQa:true,qaRunId:runId});
 const permit=clone(q.permission);permit.qaRunId=runId;Object.assign(permit.intakePermission,{qaRunId:runId,batchDigest:normalized.batchDigest});set(item('cobrosLedgerQaControl',runId),permit);
 await previewCommand.run(request('intake_source_run',q.p));const own=[...documents].filter(([key])=>key.startsWith(item('cobrosLedgerQaRuns',runId)));
 assert.ok(own.some(([key])=>key.includes('/intake_groups/')));assert.ok(own.some(([key])=>key.includes('/intakeRequests/')));assert.ok(own.some(([key])=>key.includes('/intakeAudit/')));
 for(const[,row]of own){assert.equal(row.__syntheticQa,true);assert.equal(row.qaRunId,runId);}
});
test('malformed QA manifest cannot crash or satisfy the existing proposal validator',async()=>{const q=qaFixture(),out=await previewCommand.run(request('intake_source_run',q.p));const manifest=documents.get(item('cobrosLedgerQaRuns',q.runId));delete manifest.retainedRuns;
 const result=await previewCommand.run(request('preview_proposal_application',{sourceRunId:q.runId,proposalId:out.proposalIds[0]}));assert.equal(result.eligible,false);assert.equal(result.reason,'SOURCE_LEDGER_INTEGRITY_MISMATCH');});

function nativeReceiptFixture(){
 const policy=documents.get(item('polizas','policy_qa'));delete policy.vigenciaDesde;delete policy.vigenciaHasta;
 Object.assign(policy,{vigenciaInicio:'2026-01-01',vigenciaFin:'2027-01-01',cuotas:3,frecuencia:'Mensual',estado:'Vigente',primaNeta:300,gastosEmision:0,recargoFinPct:0,ivaPct:12});
 const Orbit={paisCfg:()=>({iva:12,recargoFinanciero:0,gastosEmision:0})};
 const context=vm.createContext({window:{Orbit},Orbit,console});
 for(const file of ['primas.js','policy-receipts-engine.js'])vm.runInContext(fs.readFileSync(path.join(root,'orbit360-platform/core',file),'utf8'),context);
 const receipts=JSON.parse(JSON.stringify(Orbit.policyReceipts.expectedReceipts(policy)));
 for(const kind of ['recibosEsperados','carteraPrimas'])for(const[key]of table(kind))documents.delete(key);
 for(const receipt of receipts){set(item('recibosEsperados',receipt.id),receipt);set(item('carteraPrimas','portfolio_'+receipt.id),{id:'portfolio_'+receipt.id,tenantId:tenant,polizaId:policy.id,clienteId:policy.clienteId,reciboId:receipt.id,pais:'GT',moneda:'GTQ',monto:receipt.monto,estado:'Pendiente',carteraActiva:true});}
 assert.equal(receipts[0].cuota,'1/3');assert.equal(receipts[0].secuencia,1);return {policy,receipts};
}
test('actual native receipt owner quota and canonical validity fields are accepted exactly',async()=>{
 const native=nativeReceiptFixture(),p=payload();Object.assign(p.source,{evidenceType:'INSURER_STATEMENT_PENDING_FROM_N',completePolicyGroups:true});
 p.rows=native.receipts.slice(1).map((receipt,i)=>({...p.rows[0],rowId:'native_'+i,rowNumber:i+2,receiptId:receipt.id,receiptNumber:'',installment:(i+2)+'/3',amount:receipt.monto,policyStartDate:native.policy.vigenciaInicio,policyEndDate:native.policy.vigenciaFin}));
 const out=await submit(p);assert.equal(out.counts.holds,0);assert.equal((await readPage()).rows[0].polizaId,'policy_qa');
 const ready=await command.run(request('preview_proposal_application',{sourceRunId:out.sourceRunId,proposalId:out.proposalIds[0]}));assert.equal(ready.eligible,true,ready.reason);
 const applied=await command.run(request('apply_proposal_application',{sourceRunId:out.sourceRunId,proposalId:out.proposalIds[0],planDigest:ready.planDigest}));assert.equal(applied.readbackConfirmed,true);
 const replay=await command.run(request('preview_proposal_application',{sourceRunId:out.sourceRunId,proposalId:out.proposalIds[0]}));assert.equal(replay.reused,true);assert.equal(table('cobros').length,1);
});
test('native numeric quota cannot borrow a different total or conflicting sequence',async()=>{
 const native=nativeReceiptFixture(),p=payload();Object.assign(p.rows[0],{receiptId:native.receipts[0].id,receiptNumber:'',amount:native.receipts[0].monto});native.policy.cuotas=10;
 const out=await submit(p);assert.equal(out.counts.holds,1);const ready=await command.run(request('preview_proposal_application',{sourceRunId:out.sourceRunId,proposalId:out.proposalIds[0]}));assert.equal(ready.eligible,false);
 assert.equal(intake.matchesCanonicalInstallment({installment:'1/3'},{cuotas:3},{cuota:1,secuencia:2}),false);
 assert.equal(intake.matchesCanonicalInstallment({installment:'1/3'},{cuotas:10},{cuota:'1/3',secuencia:1}),false);
 assert.equal(intake.matchesCanonicalInstallment({installment:'1/3'},{},{cuota:1,secuencia:1}),false);
 assert.equal(intake.matchesCanonicalInstallment({installment:'1/3'},{cuotas:3},{cuota:1,secuencia:1}),true);
});
test('native source validity selects the exact edition, not another historical edition',async()=>{
 const native=nativeReceiptFixture();addPolicy('policy_older','QA-001',3,{vigenciaDesde:'2025-01-01',vigenciaHasta:'2026-01-01'});
 const p=payload();Object.assign(p.rows[0],{policyId:'',receiptId:native.receipts[0].id,receiptNumber:'',amount:native.receipts[0].monto,policyStartDate:'2026-01-01',policyEndDate:'2027-01-01'});
 const out=await submit(p);assert.equal(out.counts.holds,0);const ready=await command.run(request('preview_proposal_application',{sourceRunId:out.sourceRunId,proposalId:out.proposalIds[0]}));assert.equal(ready.eligible,true);assert.equal(ready.targets[0].receiptId,native.receipts[0].id);
});
test('wrong or internally conflicting native validity cannot bypass intake HOLD in application',async()=>{
 const native=nativeReceiptFixture(),p=payload();Object.assign(p.rows[0],{receiptId:native.receipts[0].id,receiptNumber:'',amount:native.receipts[0].monto,policyStartDate:'2025-01-01',policyEndDate:'2026-01-01'});
 Object.assign(native.policy,{vigenciaDesde:'2025-01-01',vigenciaHasta:'2026-01-01'});
 const out=await submit(p);assert.equal(out.counts.holds,1);const ready=await command.run(request('preview_proposal_application',{sourceRunId:out.sourceRunId,proposalId:out.proposalIds[0]}));assert.equal(ready.eligible,false);assert.equal(table('cobros').length,0);
});
test('duplicate editions with the same native dates remain explicit HOLD without invented binding',async()=>{
 nativeReceiptFixture();addPolicy('policy_duplicate','QA-001',3,{vigenciaDesde:'2026-01-01',vigenciaHasta:'2027-01-01'});
 const p=payload();Object.assign(p.rows[0],{policyId:'',receiptId:'',receiptNumber:'',policyStartDate:'2026-01-01',policyEndDate:'2027-01-01'});
 const out=await submit(p);assert.equal(out.counts.holds,1);assert.equal(out.rowResults[0].reason,'SOURCE_POLICY_EDITION_AMBIGUOUS');const ready=await command.run(request('preview_proposal_application',{sourceRunId:out.sourceRunId,proposalId:out.proposalIds[0]}));assert.equal(ready.eligible,false);assert.equal(table('cobros').length,0);
});

test('BANK proof without an actual paid date is admitted HOLD and never READY',async()=>{
 const p=payload();p.source.evidenceType='BANK_STATEMENT_MATCH';p.rows[0].paymentConfirmed=true;
 const out=await submit(p);assert.equal(out.counts.holds,1);assert.equal(out.rowResults[0].reason,'SOURCE_BANK_PAID_DATE_REQUIRED');
 const ready=await command.run(request('preview_proposal_application',{sourceRunId:out.sourceRunId,proposalId:out.proposalIds[0]}));assert.equal(ready.eligible,false);assert.equal(ready.reason,'SOURCE_BANK_PAID_DATE_REQUIRED');
 const applied=await command.run(request('apply_proposal_application',{sourceRunId:out.sourceRunId,proposalId:out.proposalIds[0],planDigest:'a'.repeat(64)}));assert.equal(applied.eligible,false);assert.equal(table('cobros').length,0);
});
test('BANK invoice or application date is never substituted for actual payment date',async()=>{
 const p=payload();p.source.evidenceType='BANK_STATEMENT_MATCH';Object.assign(p.rows[0],{paymentConfirmed:true,invoiceDate:'2026-11-12',applicationDate:'2026-11-13'});
 const out=await submit(p);assert.equal(out.counts.holds,1);const ready=await command.run(request('preview_proposal_application',{sourceRunId:out.sourceRunId,proposalId:out.proposalIds[0]}));assert.equal(ready.reason,'SOURCE_BANK_PAID_DATE_REQUIRED');
});
test('BANK actual paid date and explicit confirmation are preserved through application',async()=>{
 const p=payload();p.source.evidenceType='BANK_STATEMENT_MATCH';Object.assign(p.rows[0],{paymentConfirmed:true,paidDate:'2026-11-12',actualPaidDateEvidence:true});
 const out=await submit(p);assert.equal(out.counts.holds,0);const ready=await command.run(request('preview_proposal_application',{sourceRunId:out.sourceRunId,proposalId:out.proposalIds[0]}));assert.equal(ready.eligible,true);
 const applied=await command.run(request('apply_proposal_application',{sourceRunId:out.sourceRunId,proposalId:out.proposalIds[0],planDigest:ready.planDigest}));assert.equal(applied.readbackConfirmed,true);assert.equal(table('cobros')[0][1].paidDate,'2026-11-12');
});
test('BANK without explicit confirmation is evidence HOLD, not implicit paid proof',async()=>{
 const p=payload();p.source.evidenceType='BANK_STATEMENT_MATCH';Object.assign(p.rows[0],{paidDate:'2026-11-12',actualPaidDateEvidence:true});
 const out=await submit(p);assert.equal(out.rowResults[0].reason,'SOURCE_BANK_PAYMENT_NOT_PROVEN');const ready=await command.run(request('preview_proposal_application',{sourceRunId:out.sourceRunId,proposalId:out.proposalIds[0]}));assert.equal(ready.eligible,false);assert.equal(table('cobros').length,0);
});
test('documented13 quota exception reaches existing planner without changing its limits',async()=>{
 addPolicy('policy_qa','QA-001',13);documents.get(`${base()}/config/reconciliation`).insurerPaymentPlans=[{insurerId:'insurer_qa',maxInstallments:12,exceptionalMaxInstallments:13}];
 const p=payload();Object.assign(p.rows[0],{installment:'13/13',receiptId:'policy_qa_r13',receiptNumber:'REQ-13',explicitInstallmentException:true,installmentExceptionReference:'drive:DocumentedException13'});
 const out=await submit(p),proposal=stageOf(out.sourceRunId,'propuestasConciliacion',out.proposalIds[0]);assert.equal(proposal.explicitInstallmentException,true);assert.equal(proposal.installmentExceptionReference,'drive:DocumentedException13');
 const ready=await command.run(request('preview_proposal_application',{sourceRunId:out.sourceRunId,proposalId:out.proposalIds[0]}));assert.equal(ready.eligible,true);assert.equal(ready.targets.length,13);
});
test('13 quota plan without explicit documented exception remains refused by existing planner',async()=>{
 addPolicy('policy_qa','QA-001',13);documents.get(`${base()}/config/reconciliation`).insurerPaymentPlans=[{insurerId:'insurer_qa',maxInstallments:12,exceptionalMaxInstallments:13}];
 const p=payload();Object.assign(p.rows[0],{installment:'13/13',receiptId:'policy_qa_r13',receiptNumber:'REQ-13'});const out=await submit(p);
 const ready=await command.run(request('preview_proposal_application',{sourceRunId:out.sourceRunId,proposalId:out.proposalIds[0]}));assert.equal(ready.eligible,false);assert.equal(ready.reason,'INSTALLMENT_TOTAL_REQUIRES_EXPLICIT_EXCEPTION');
});
test('exception cannot bypass the configured maximum above13',async()=>{
 addPolicy('policy_qa','QA-001',14);documents.get(`${base()}/config/reconciliation`).insurerPaymentPlans=[{insurerId:'insurer_qa',maxInstallments:12,exceptionalMaxInstallments:13}];
 const p=payload();Object.assign(p.rows[0],{installment:'14/14',receiptId:'policy_qa_r14',receiptNumber:'REQ-14',explicitInstallmentException:true,installmentExceptionReference:'drive:DocumentedException14'});const out=await submit(p);
 const ready=await command.run(request('preview_proposal_application',{sourceRunId:out.sourceRunId,proposalId:out.proposalIds[0]}));assert.equal(ready.eligible,false);assert.equal(ready.reason,'INSTALLMENT_TOTAL_EXCEEDS_TENANT_CONFIG');assert.equal(table('cobros').length,0);
});
for(const [label,patch,code]of [
 ['missing reference',{explicitInstallmentException:true},'SOURCE_INSTALLMENT_EXCEPTION_REFERENCE_REQUIRED'],
 ['filename as reference',{explicitInstallmentException:true,installmentExceptionReference:'exception.pdf'},'SOURCE_INSTALLMENT_EXCEPTION_REFERENCE_REQUIRED'],
 ['unattested reference',{installmentExceptionReference:'drive:DocumentedException13'},'SOURCE_INSTALLMENT_EXCEPTION_INVALID'],
 ['nonboolean flag',{explicitInstallmentException:'true',installmentExceptionReference:'drive:DocumentedException13'},'SOURCE_INSTALLMENT_EXCEPTION_INVALID']
])test('exception rejects '+label,async()=>{const p=payload();Object.assign(p.rows[0],patch);await rejectCode(()=>submit(p),code);assert.equal(writes,0);});
for(const [label,mutate]of [
 ['reserved policy ID',p=>p.rows[0].policyId='b3005qa_policy'],
 ['reserved receipt ID',p=>p.rows[0].receiptId='b3005qa_receipt'],
 ['unrecognized QA source',p=>p.source.sourceId='b3005qa_unknown_source'],
 ['synthetic canonical policy',()=>documents.get(item('polizas','policy_qa')).__syntheticQa=true],
 ['synthetic canonical receipt',()=>documents.get(item('recibosEsperados','policy_qa_r1')).__syntheticQa=true]
])test('normal LIVE source rejects '+label,async()=>{const p=payload();mutate(p);await rejectCode(()=>submit(p),'SOURCE_REAL_INTAKE_SYNTHETIC_TARGET_DENIED');assert.equal(writes,0);assert.equal(table('cobrosLedgerControl').length,0);});
