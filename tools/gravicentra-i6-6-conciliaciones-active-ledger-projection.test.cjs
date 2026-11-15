'use strict';
// Synthetic-only, no Firebase credentials, no network and no business writes.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {readActiveLedgerProposalPage}=require('../functions/i66-conciliaciones-active-ledger-projection');
const {readScopedRelatedList}=require('../functions/b4-003-scoped-related-reader');
const {Denied}=require('../functions/b4-003-scoped-access-boundary');
const contract=require('../functions/cobros-ledger-contract');
const {applicationIdFor}=require('../functions/proposal-application-boundary');
const tenantId='synthetic-tenant',runId='cobledger_'+'a'.repeat(28),sha='a'.repeat(64),sha2='b'.repeat(64);
const pointer={id:'active',schemaVersion:contract.POINTER_SCHEMA,status:'ACTIVE',activeRunId:runId,
 sourceLedgerCount:contract.SOURCE_LEDGER_COUNT,sourceLedgerDigest:contract.SOURCE_LEDGER_DIGEST,
 packageLogicalSha256:contract.PACKAGE_LOGICAL_SHA256,aggregateDigest:sha,activatedAt:'2026-08-05'};
const manifest={id:runId,runId,schemaVersion:contract.MANIFEST_SCHEMA,gateId:contract.GATE_ID,
 contractVersion:contract.CONTRACT_VERSION,tenantId,status:'ACTIVE',activationState:'ACTIVE',activatedAt:'2026-08-05',
 sourceLedgerCount:contract.SOURCE_LEDGER_COUNT,sourceLedgerDigest:contract.SOURCE_LEDGER_DIGEST,
 packageLogicalSha256:contract.PACKAGE_LOGICAL_SHA256,expectedAggregateDigest:sha,
 expectedCounts:contract.EXPECTED_COUNTS,stageDocumentCount:contract.STAGE_DOCUMENT_COUNT,
 newCobros:0,receiptWrites:0,policyWrites:0,finmovWrites:0};
const stores={polizas:{},clientes:{},conciliaciones:{},conciliacionesPrimas:{},
 cobrosLedgerControl:{active:pointer},cobrosLedgerRuns:{[runId]:manifest},stage:{}};
for(let i=0;i<132;i++){
 const unique=i<52,number=unique?'UNI_'+i:'DUP_'+Math.floor((i-52)/2);
 stores.stage['proposal_'+String(i).padStart(3,'0')]={tenantId,runId,policyNumber:number,
   sourceRowId:'source_'+i,sourceRowIdSha256:sha,payloadDigest:sha2,
   sourceLedgerDigest:contract.SOURCE_LEDGER_DIGEST,packageLogicalSha256:contract.PACKAGE_LOGICAL_SHA256,
   amount:100+i,currency:'GTQ',status:'PROPOSED'};
 if(unique){
   const country=i<26?'GT':'CO';
   stores.polizas['policy_'+i]={tenantId,numero:number,clienteId:'client_'+i,
     pais:country,asesorId:i%2?'advisor_b':'advisor_a'};
   stores.clientes['client_'+i]={tenantId,pais:country,nombre:'Cliente verificado '+i};
 }else if(i%2===0){
   const id=Math.floor((i-52)/2);
   stores.polizas['ambig_a_'+id]={tenantId,numero:number,clienteId:'client_0',pais:'GT',asesorId:'advisor_a'};
   stores.polizas['ambig_b_'+id]={tenantId,numero:number,clienteId:'client_0',pais:'CO',asesorId:'advisor_b'};
 }
}
const snap=(id,row)=>({id,exists:!!row,data:()=>row});
const counters={policyIndexed:0,policyFullScan:0,clientBatchRead:0,writes:0};
function refs(table){
 const source=stores[table]||{};
 return {doc:id=>({get:async()=>snap(id,source[id]),collection:name=>{
   if(table==='cobrosLedgerRuns'&&name==='propuestasConciliacion')return refs('stage');
   throw Error('UNEXPECTED_COLLECTION');}}),
   limit:n=>({get:async()=>({docs:Object.keys(source).sort().slice(0,n).map(id=>snap(id,source[id]))})}),
   orderBy:field=>{assert.equal(field,'__name__');return refs(table);},
   where:(field,op,values)=>{
     assert.equal(table,'polizas');assert.equal(field,'numero');assert.equal(op,'in');
     assert.ok(values.length<=25&&values.length>0);counters.policyIndexed++;
     return {get:async()=>({docs:Object.entries(source).filter(([,p])=>values.includes(p.numero))
       .map(([id,p])=>snap(id,p))})};
   },
   get:async()=>{if(table==='polizas')counters.policyFullScan++;return {docs:Object.keys(source).map(id=>snap(id,source[id]))};},
   set:()=>{counters.writes++;throw Error('WRITE_FORBIDDEN');},
   update:()=>{counters.writes++;throw Error('WRITE_FORBIDDEN');}
 };
}
const member={uid:'signed-user',tenantId,status:'active',roles:['Finanzas','Dirección','Operativo','Asesor'],
 advisorId:'advisor_a',countries:['GT','CO'],dataScopes:{default:'all'}};
const config={roleScopes:{finanzas:'all',direccion:'all',operativo:'all',asesor:'own'}};
const tenant={collection:name=>name==='data'?{doc:id=>({collection:part=>{
  assert.equal(part,'items');return refs(id);}})}:
 name==='members'?{doc:()=>({get:async()=>snap('signed-user',member)})}:
 name==='config'?{doc:()=>({get:async()=>snap('access',config)})}:
 (()=>{throw Error('UNEXPECTED_TENANT_COLL')})()};
const db={collection:name=>{assert.equal(name,'tenants');return {doc:id=>{
  assert.equal(id,tenantId);return tenant;}}},getAll:async(...refs)=>{
    counters.clientBatchRead++;return Promise.all(refs.map(ref=>ref.get()));}};
const ctx=(country='GT',scope='all')=>({tenantId,role:'finanzas',country,collection:'conciliaciones',
 scope,advisorId:'advisor_a',team:['advisor_a']});
const direct=(country='GT',scope='all',pageSize=200,cursor='')=>readActiveLedgerProposalPage({
 db,tenant,tenantId,ctx:ctx(country,scope),pageSize,cursor});
const integrated=(role='Finanzas',country='GT',pageSize=200,cursor='')=>readScopedRelatedList({db,
 auth:{uid:'signed-user',token:{}},request:{tenantId,collection:'conciliaciones',country,activeRole:role,pageSize,cursor}});
const denied=(fn,code)=>assert.rejects(fn,error=>error instanceof Denied&&error.code===code);

(async()=>{
 // Stage signatures are distinct in production; duplicate identities must
 // never make the browser deduplicate otherwise authorized proposals.
 Object.entries(stores.stage).forEach(([id,p])=>{
   p.sourceRowIdSha256=crypto.createHash('sha256').update(id).digest('hex');
 });
 const gt=await direct();const co=await direct('CO');
 assert.equal(gt.rows.length,106);assert.equal(co.rows.length,106);
 const uniqueGt=gt.rows.filter(row=>!row.requiresReceiptSelection),uniqueCo=co.rows.filter(row=>!row.requiresReceiptSelection);
 assert.equal(uniqueGt.length+uniqueCo.length,52,'ORIGINAL_UNIQUE_52_PRESERVED');
 assert.ok(uniqueGt.every(x=>x.pais==='GT'&&x.readOnly===true&&x.applicationPermitted===false&&
  x.polizaId&&x.clienteId&&x.clienteNombre.startsWith('Cliente verificado ')&&
  x.proposalIdentity&&x.source_ref.row_hash===x.proposalIdentity));
 assert.equal(new Set(gt.rows.map(x=>x.proposalIdentity)).size,106);
 const holds=gt.rows.filter(row=>row.requiresReceiptSelection);
 assert.equal(holds.length,80,'ALL_AUTHORIZED_EDITION_HOLDS_VISIBLE');
 assert.ok(holds.every(row=>row.estado==='REQUIERE_VALIDACION'&&row.monto===null&&row.moneda===''&&row.polizaId===''&&row.clienteId===''&&row.canonicalCandidateCount===1));
 assert.ok(!JSON.stringify(holds).includes('ambig_b_'),'NO_FOREIGN_CANDIDATE_IDS_EXPOSED');
 const clientStore={all:name=>name==='conciliaciones'?gt.rows.concat(co.rows):[],
   _productStatus:()=>({serverConfirmedCollections:['conciliaciones','conciliacionesPrimas'],
     deniedCollections:[],snapshotErrors:{}})};
 const browser={window:{Orbit:{store:clientStore,modules:{},ui:{},kit:{}}},
   document:{addEventListener(){},getElementById(){return null;}}};
 browser.Orbit=browser.window.Orbit;
 const uiSource=fs.readFileSync(path.resolve(__dirname,'../orbit360-platform/modules/conciliaciones.js'),'utf8');
 vm.runInNewContext(uiSource,browser);
 assert.equal(browser.Orbit.cobrosConciliacionReadOnly.proposalReadiness(),'ready');
 assert.equal(browser.Orbit.cobrosConciliacionReadOnly.proposalRows().length,132,'UI_ALL_132_PROPOSALS_ACCESSIBLE_WITHOUT_DUPLICATES');
 const host={innerHTML:'',querySelectorAll:()=>[]};
 browser.Orbit.modules.conciliaciones.render(host);
 assert.equal((host.innerHTML.match(/data-conc-id=/g)||[]).length,132,'UI_RENDER_52_UNIQUE_AND_80_ACTIONABLE_HOLDS');
 assert.ok(host.innerHTML.includes('Libro activo')&&host.innerHTML.includes('Propuestas de conciliación'));
 assert.ok(host.innerHTML.includes('Cliente verificado 0'),'CANONICAL_CLIENT_NAME_SHOWN');
 assert.ok(!host.innerHTML.includes('client_0')&&!host.innerHTML.includes('fila aaaaaaaaa'),
   'NO_TECHNICAL_CLIENT_OR_ROW_HASH_VISIBLE');
 assert.ok(host.innerHTML.includes('Coincidencia probable')&&host.innerHTML.includes('Pendiente de revisión'),
   'BUSINESS_LABELS_INSTEAD_OF_STATUS_CODES');
 assert.ok(co.rows.every(x=>x.pais==='CO'));
 assert.equal(gt.rows.filter(x=>x.polizaNumero.startsWith('DUP_')).length,80);
 assert.equal(co.rows.filter(x=>x.polizaNumero.startsWith('DUP_')).length,80);
 const own=await direct('GT','own');assert.equal(own.rows.length,93);
 const foreignOwner=await direct('CO','own');assert.equal(foreignOwner.rows.length,13,'HOLDS_WITH_NO_AUTHORIZED_CANDIDATE_NOT_EXPOSED');
 const first=await direct('GT','all',10);assert.equal(first.rows.length,10);
 assert.ok(first.nextCursor);
 const second=await direct('GT','all',10,first.nextCursor);
 assert.equal(second.rows.length,10);
 assert.equal(new Set([...first.rows,...second.rows].map(x=>x.canonicalDocumentId)).size,20);
 await denied(()=>direct('GT','all',10,'proposal_030'),'CURSOR_DENIED');
 const fromReader=await integrated('Dirección','GT');assert.equal(fromReader.rows.length,106);
 await denied(()=>integrated('Operativo','GT'),'MODULE_DENIED');
 await denied(()=>integrated('Asesor','GT'),'MODULE_DENIED');
 const stage=stores.stage.proposal_000;
 stage.sourceLedgerDigest='wrong';
 const reduced=await direct();assert.equal(reduced.rows.length,105,'INVALID_SOURCE_DIGEST_QUARANTINED');
 stage.sourceLedgerDigest=contract.SOURCE_LEDGER_DIGEST;
 const original=manifest.status;manifest.status='DRAFT';
 await denied(()=>direct(),'STAGE_ACTIVE_MANIFEST_INVALID');manifest.status=original;
 // Application state is durable outside the immutable stage and survives a
 // fresh projection/reload only when the exact source digest matches.
 const applicationId=applicationIdFor(tenantId,runId,'proposal_000');
 stores.reconciliationApplications={[applicationId]:{id:applicationId,status:'APPLIED',tenantId,
   sourceRunId:runId,proposalId:'proposal_000',sourceProposalDigest:stores.stage.proposal_000.payloadDigest,
   scopeAnchor:{tenantId,pais:'GT',asesorId:'advisor_a'}}};
 const appliedView=await direct();
 const appliedRow=appliedView.rows.find(row=>row.id==='proposal_000');
 assert.equal(appliedRow.estado,'APLICADA');assert.equal(appliedRow.applicationId,applicationId);
 assert.equal(stores.stage.proposal_000.status,'PROPOSED','STAGE_NOT_MUTATED_BY_APPLICATION_PROJECTION');
 stores.reconciliationApplications[applicationId].sourceProposalDigest='wrong';
 const mismatchedView=await direct();
 assert.equal(mismatchedView.rows.find(row=>row.id==='proposal_000').estado,'PROPUESTA',
   'APPLICATION_RECORD_CANNOT_OVERRIDE_ANOTHER_SOURCE_DIGEST');
 assert.ok(counters.policyIndexed>0&&counters.policyFullScan===0,'INDEXED_NO_FULL_CATALOG_SCAN');
 assert.ok(counters.clientBatchRead>0,'BATCHED_CANONICAL_CLIENT_READS');
 assert.equal(counters.writes,0);
 console.log('I66_CONCILIACIONES_STAGE_PROJECTION_PASS unique_52_preserved ui_132_rendered authorized_80_actionable_holds sensitive_fields_redacted foreign_scope_denied role_country_advisor_paging_manifest_guard indexed_number_batches application_state_reload_exact_source no_scan writes_0');
})().catch(error=>{console.error(error);process.exitCode=1;});
