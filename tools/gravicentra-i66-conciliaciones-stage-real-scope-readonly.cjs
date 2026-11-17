'use strict';
// Current approved SOURCE projection against LIVE data, always read-only.
// Hosting identity is observed separately. This is not signed UI/backend
// acceptance and cannot authorize deployment, source intake or financial writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),vm=require('node:vm'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {readActiveLedgerProposalPage}=require('../functions/i66-conciliaciones-active-ledger-projection');
const {readScopedRelatedList}=require('../functions/b4-003-scoped-related-reader');
const {Denied}=require('../functions/b4-003-scoped-access-boundary');
const {validateActiveLedgerContract}=require('../functions/cobros-ledger-contract');
const sourceIntake=require('../functions/cobros-source-intake-v2');
const TENANT='alianzas-soluciones',PROJECT='ays-orbit-360-lab';
const ORIGINS=Object.freeze(['https://app.aysseguros.com','https://ays-orbit-360-lab.web.app']);
const MAX_RUNS=32,MAX_PROPOSALS_PER_RUN=250,MAX_PAGES=64,PAGE_SIZE=200;
const UI_PATH='orbit360-platform/modules/conciliaciones.js';
const SOURCE_PATHS=Object.freeze(['functions/i66-conciliaciones-active-ledger-projection.js','functions/b4-003-scoped-related-reader.js',UI_PATH]);
const norm=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const key=row=>String(row.sourceRunId)+'|'+String(row.canonicalDocumentId);
function requireCatalogEntry(entry){
 validateActiveLedgerContract(entry.pointer,entry.manifest,TENANT);
 assert.equal(entry.pointer.activeRunId,entry.runId,'I66_REAL_CATALOG_RUN_DRIFT');
 const expected=entry.manifest.expectedCounts.propuestasConciliacion;
 assert.ok(Number.isSafeInteger(expected)&&expected>=0&&expected<=MAX_PROPOSALS_PER_RUN,'I66_REAL_STAGE_BOUND_HOLD');
 assert.equal(entry.proposals.length,expected,'I66_REAL_MANIFEST_PROPOSAL_COUNT_DRIFT');
 const ids=new Set();
 for(const row of entry.proposals){
  assert.ok(typeof row.id==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{1,179}$/.test(row.id)&&!ids.has(row.id),'I66_REAL_SOURCE_ID_DUPLICATE_OR_INVALID');
  assert.match(row.sourceRowIdSha256,/^[a-f0-9]{64}$/,'I66_REAL_SOURCE_HASH_INVALID');ids.add(row.id);
 }
 return entry;
}
async function readCatalog(tenant){
 const items=name=>tenant.collection('data').doc(name).collection('items');
 const pointerRef=items('cobrosLedgerControl').doc('active'),before=await pointerRef.get();
 assert.ok(before.exists,'I66_REAL_ACTIVE_POINTER_MISSING');
 const pointer=before.data(),head=await items('cobrosLedgerRuns').doc(pointer.activeRunId).get();
 assert.ok(head.exists,'I66_REAL_ACTIVE_MANIFEST_MISSING');
 const manifest=head.data();validateActiveLedgerContract(pointer,manifest,TENANT);
 const retained=manifest.schemaVersion===sourceIntake.MANIFEST_SCHEMA?manifest.retainedRuns.slice().reverse():[];
 assert.ok(retained.length+1<=MAX_RUNS,'I66_REAL_CATALOG_BOUND_HOLD');
 const descriptors=[{runId:pointer.activeRunId,pointer,manifest},...retained];
 const runs=[];
 for(const descriptor of descriptors){
  const ref=items('cobrosLedgerRuns').doc(descriptor.runId);
  const snapshot=descriptor.manifest?null:await ref.get();
  assert.ok(descriptor.manifest||snapshot?.exists,'I66_REAL_RETAINED_MANIFEST_MISSING');
  const current=descriptor.manifest||snapshot.data();
  if(descriptor.manifestDigest)assert.equal(sourceIntake.manifestDigest(current),descriptor.manifestDigest,'I66_REAL_RETAINED_MANIFEST_DIGEST_DRIFT');
  const docs=await ref.collection('propuestasConciliacion').orderBy('__name__').limit(MAX_PROPOSALS_PER_RUN+1).get();
  runs.push(requireCatalogEntry({runId:descriptor.runId,pointer:descriptor.pointer,manifest:current,
   proposals:docs.docs.map(doc=>({id:doc.id,sourceRowIdSha256:doc.data()?.sourceRowIdSha256}))}));
 }
 assert.equal(new Set(runs.map(x=>x.runId)).size,runs.length,'I66_REAL_RETAINED_RUN_DUPLICATE');
 return {pointerRef,before,runs};
}
async function readAllPages(readPage,maxRows){
 const rows=[],cursors=new Set();let cursor='';
 for(let pages=0;pages<MAX_PAGES;pages++){
  const result=await readPage(cursor);
  assert.ok(result?.ok===true&&result.serverScoped===true&&result.scope==='all'&&Array.isArray(result.rows),'I66_REAL_DIRECTION_SERVER_SCOPE_REQUIRED');
  assert.ok(result.rows.length<=PAGE_SIZE,'I66_REAL_READER_PAGE_BOUND_HOLD');rows.push(...result.rows);
  assert.ok(rows.length<=maxRows,'I66_REAL_READER_TOTAL_BOUND_HOLD');
  if(!result.nextCursor)return rows;
  assert.ok(typeof result.nextCursor==='string'&&!cursors.has(result.nextCursor),'I66_REAL_READER_CURSOR_CYCLE');
  cursors.add(result.nextCursor);cursor=result.nextCursor;
 }
 assert.fail('I66_REAL_READER_PAGINATION_BOUND_HOLD');
}
function summarizeProjection(byCountry,runs){
 const expected=new Map(),seen=new Map(),hashOwners=new Map();
 for(const run of runs)for(const proposal of run.proposals){
  const id=run.runId+'|'+proposal.id;assert.ok(!expected.has(id),'I66_REAL_CATALOG_DUPLICATE_ID');
  assert.ok(!hashOwners.has(proposal.sourceRowIdSha256),'I66_REAL_CATALOG_SOURCE_IDENTITY_DUPLICATE');
  hashOwners.set(proposal.sourceRowIdSha256,id);
  expected.set(id,{hash:proposal.sourceRowIdSha256,sourceV2:run.manifest.schemaVersion===sourceIntake.MANIFEST_SCHEMA});
 }
 assert.deepEqual(Object.keys(byCountry).sort(),['CO','GT'],'I66_REAL_COUNTRY_SET_DRIFT');
 const counts={};
 for(const country of ['GT','CO']){
  const rows=byCountry[country],countryIds=new Set();assert.ok(Array.isArray(rows),'I66_REAL_COUNTRY_ROWS_INVALID');
  counts[country]={rows:rows.length,identityHolds:0,sourceHolds:0,linked:0,applied:0};
  for(const row of rows){
   const id=key(row),source=expected.get(id);
   assert.ok(source&&!countryIds.has(id),'I66_REAL_PROJECTED_ID_UNKNOWN_OR_DUPLICATE');countryIds.add(id);
   assert.ok(row.tenantId===TENANT&&row.pais===country&&row.readOnly===true&&row.applicationPermitted===false,'I66_REAL_PROJECTION_SCOPE_OR_WRITE_DRIFT');
   assert.equal(row.proposalIdentity,source.hash,'I66_REAL_PROJECTED_SOURCE_HASH_DRIFT');
   const hold=row.requiresReceiptSelection===true;
   if(hold){
    assert.ok(row.polizaId===''&&row.clienteId===''&&row.asesorId===''&&row.monto===null&&row.moneda==='','I66_REAL_IDENTITY_HOLD_REDACTION_DRIFT');
    counts[country].identityHolds++;
   }else{
    assert.ok(row.polizaId&&row.clienteId&&row.moneda,'I66_REAL_BOUND_PROJECTION_INCOMPLETE');
    assert.ok(Number.isFinite(row.monto)&&row.monto>=0||source.sourceV2&&row.monto===null&&row.estado==='REQUIERE_VALIDACION','I66_REAL_AMOUNT_OR_SOURCE_HOLD_INVALID');
    counts[country].linked++;
   }
   if(row.estado==='REQUIERE_VALIDACION')counts[country].sourceHolds++;
   if(row.estado==='APLICADA')counts[country].applied++;
   if(seen.has(id))assert.equal(seen.get(id).identityHold,hold,'I66_REAL_COUNTRY_IDENTITY_CLASS_DRIFT');
   else seen.set(id,{identityHold:hold,sourceHold:row.estado==='REQUIERE_VALIDACION',applied:row.estado==='APLICADA'});
  }
 }
 assert.equal(seen.size,expected.size,'I66_REAL_STAGE_PROPOSAL_COVERAGE_INCOMPLETE');
 return {catalogRuns:runs.length,expectedStagedProposals:expected.size,uniqueVisibleProposals:seen.size,
  identityHoldProposals:[...seen.values()].filter(x=>x.identityHold).length,
  linkedProposals:[...seen.values()].filter(x=>!x.identityHold).length,
  authorizedProjectionByCountry:counts,
  repeatedCountryViews:Object.values(byCountry).reduce((n,x)=>n+x.length,0)-seen.size,
  sourceCatalogDigest:hash([...expected.entries()].sort(([a],[b])=>a.localeCompare(b)))};
}
function normalizedProjection(rows){
 return rows.map(row=>({id:row.id,sourceRunId:row.sourceRunId,canonicalDocumentId:row.canonicalDocumentId,
  tenantId:row.tenantId,pais:row.pais,polizaId:row.polizaId,polizaNumero:row.polizaNumero,clienteId:row.clienteId,clienteNombre:row.clienteNombre,
  asesorId:row.asesorId,monto:row.monto,moneda:row.moneda,estado:row.estado,proposalIdentity:row.proposalIdentity,
  motivo:row.motivo,source_ref:row.source_ref,
  requiresReceiptSelection:row.requiresReceiptSelection===true,readOnly:row.readOnly,applicationPermitted:row.applicationPermitted,
  applicationStatus:row.applicationStatus||null})).sort((a,b)=>key(a).localeCompare(key(b)));
}
function requireUiProjection(byCountry,expectedCount){
 const source=fs.readFileSync(path.resolve(__dirname,'..',UI_PATH),'utf8'),counts={};
 for(const [country,rows]of Object.entries({...byCountry,union:[...byCountry.GT,...byCountry.CO]})){
  const store={all:name=>name==='conciliaciones'?rows:[],_productStatus:()=>({
   serverConfirmedCollections:['conciliaciones','conciliacionesPrimas'],deniedCollections:[],snapshotErrors:{}})};
  const browser={window:{Orbit:{store,modules:{},ui:{},kit:{}}},document:{addEventListener(){},getElementById(){return null;}}};
  browser.Orbit=browser.window.Orbit;vm.runInNewContext(source,browser,{timeout:1000});
  const ui=browser.Orbit.cobrosConciliacionReadOnly;
  assert.equal(ui.proposalReadiness(),'ready','I66_REAL_SOURCE_UI_READINESS_DRIFT');
  const projected=ui.proposalRows(),unique=new Map(rows.map(row=>[row.proposalIdentity,row]));
  assert.equal(projected.length,unique.size,'I66_REAL_SOURCE_UI_ROW_LOSS');
  assert.equal(new Set(projected.map(row=>row.id)).size,unique.size,'I66_REAL_SOURCE_UI_IDENTITY_DRIFT');
  for(const row of projected){
   const original=unique.get(row.id);
   assert.ok(original&&key(row.original)===key(original)&&row.sourceEntityId===original.id&&
    row.pais===original.pais&&row.moneda===original.moneda&&row.estado===original.estado&&
    row.readOnly===true&&row.original.applicationPermitted===false,'I66_REAL_SOURCE_UI_NORMALIZATION_DRIFT');
   assert.equal(row.monto,original.monto===null?0:original.monto,'I66_REAL_SOURCE_UI_AMOUNT_DRIFT');
  }
  counts[country]=projected.length;
 }
 assert.equal(counts.union,expectedCount,'I66_REAL_SOURCE_UI_MANIFEST_COVERAGE_INCOMPLETE');
 return counts;
}
function requireServingIdentity(live,markers){
 assert.ok(/^[a-f0-9]{40}$/.test(live?.sourceSha||'')&&typeof live.buildId==='string'&&live.buildId.length>0,'I66_REAL_LIVE_AUTHORITY_MISSING');
 assert.equal(markers.length,ORIGINS.length,'I66_REAL_LIVE_ORIGIN_COUNT_DRIFT');
 for(let i=0;i<ORIGINS.length;i++){
  const item=markers[i];assert.equal(item.origin,ORIGINS[i],'I66_REAL_LIVE_ORIGIN_DRIFT');
  assert.ok(item.marker?.sourceSha===live.sourceSha&&item.marker?.buildId===live.buildId&&item.marker?.product==='Gravicentra Insurance'&&item.marker?.gate==='I6.6','I66_REAL_LIVE_SERVED_MARKER_DRIFT');
 }
 return {sourceSha:live.sourceSha,buildId:live.buildId,origins:ORIGINS};
}
async function readServingIdentity(live){
 const markers=await Promise.all(ORIGINS.map(async origin=>{
  const response=await fetch(origin+'/__recovery__/build.json',{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(15000)});
  assert.equal(response.status,200,'I66_REAL_LIVE_MARKER_HTTP');return {origin,marker:await response.json()};
 }));return requireServingIdentity(live,markers);
}
async function main(){
 const transport=JSON.parse(fs.readFileSync('artifacts/orbit360-recovery/release-control/I6_6_RELEASE_TRANSPORT_CONTROL_20261110.json','utf8'));
 const executionSourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 assert.match(executionSourceSha,/^[a-f0-9]{40}$/,'I66_REAL_EXECUTION_SOURCE_INVALID');
 if(process.env.GITHUB_SHA)assert.equal(executionSourceSha,process.env.GITHUB_SHA,'I66_REAL_WORKFLOW_HEAD_DRIFT');
 const serving=await readServingIdentity(transport.currentExactHostingRelease);
 const ownerBlobs=Object.fromEntries(SOURCE_PATHS.map(path=>[path,execFileSync('git',['rev-parse','HEAD:'+path],{encoding:'utf8'}).trim()]));
 const admin=require('firebase-admin');
 const cred=['SA_LAB','SA_ALT','SA_DEFAULT'].map(k=>{try{return JSON.parse(process.env[k]||'');}catch{return null;}})
  .find(x=>x&&x.type==='service_account'&&x.project_id===PROJECT&&x.private_key);
 assert.ok(cred,'I66_REAL_CREDENTIAL_MISSING');
 admin.initializeApp({credential:admin.credential.cert(cred),projectId:PROJECT});
 try{
  const db=admin.firestore(),auth=admin.auth(),tenant=db.collection('tenants').doc(TENANT),catalog=await readCatalog(tenant);
  const expected=catalog.runs.reduce((sum,r)=>sum+r.proposals.length,0),byCountry={};
  for(const country of ['GT','CO']){
   const ctx={tenantId:TENANT,role:'direccion',country,collection:'conciliaciones',scope:'all',advisorId:'',team:[]};
   byCountry[country]=await readAllPages(cursor=>readActiveLedgerProposalPage({db,tenant,tenantId:TENANT,ctx,pageSize:PAGE_SIZE,cursor}),expected);
  }
  const summary=summarizeProjection(byCountry,catalog.runs);
  const sourceUiProjectionCounts=requireUiProjection(byCountry,summary.expectedStagedProposals);
  const members=await tenant.collection('members').limit(200).get();
  assert.ok(members.size<200,'I66_REAL_STAFF_MEMBER_CATALOG_BOUND_HOLD');
  const directors=members.docs.filter(d=>{
   const m=d.data()||{},roles=[...(m.roles||[]),...(m.rolesAsignados||[]),m.activeRole,m.rol,m.role].map(norm);
   return roles.includes('direccion')&&m.active!==false&&m.activo!==false&&['active','activo'].includes(norm(m.status||m.estado))&&
    [].concat(m.countries||m.paises||[]).map(x=>String(x).toUpperCase()).includes('GT');
  });
  assert.ok(directors.length>0,'I66_REAL_ACTIVE_DIRECTION_MEMBERSHIP_MISSING_HOLD');let verified=0;
  for(const d of directors){
   const person=await auth.getUser(d.id);if(person.disabled||!person.emailVerified)continue;
   const request={tenantId:TENANT,collection:'conciliaciones',country:'GT',activeRole:'Dirección',pageSize:PAGE_SIZE};
   const actual=await readAllPages(cursor=>readScopedRelatedList({db,auth:{uid:d.id,token:{}},request:{...request,cursor}}),expected);
   assert.ok(JSON.stringify(normalizedProjection(actual))===JSON.stringify(normalizedProjection(byCountry.GT)),'I66_REAL_DIRECTION_CANONICAL_COUNTRY_LIST_PARITY');
   await assert.rejects(()=>readScopedRelatedList({db,auth:{uid:d.id,token:{}},request:{...request,country:'SV'}}),e=>e instanceof Denied,'I66_REAL_CROSS_COUNTRY_DENIAL_REQUIRED');verified++;
  }
  assert.ok(verified>0,'I66_REAL_DIRECTION_AUTH_NOT_READY_HOLD');
  const after=await catalog.pointerRef.get();
  assert.ok(after.exists&&catalog.before.updateTime.isEqual(after.updateTime),'I66_REAL_ACTIVE_POINTER_CHANGED_DURING_READ');
  await readServingIdentity(transport.currentExactHostingRelease);
  const report={schema:'GI_I66_CANONICAL_SOURCE_REAL_SCOPE_READONLY_V2',status:'PASS_SOURCE_READONLY_NOT_LIVE_UI_ACCEPTANCE',
   observedAtUtc:new Date().toISOString(),executionSourceSha,executedOwnerBlobs:ownerBlobs,servedHosting:serving,
   activeRunId:catalog.before.data().activeRunId,...summary,sourceUiProjectionCounts,activeVerifiedDirectionMembers:verified,
   indexedLookup:true,scopedReads:true,realBusinessWrites:0,sourceProjectionOnLiveData:true,
   signedUiAcceptance:false,servedBackendRuntimeCertified:false,previewCallableDeployed:false,liveCodeDeployed:false};
  if(process.env.I66_READONLY_REPORT)fs.writeFileSync(process.env.I66_READONLY_REPORT,JSON.stringify(report,null,2)+'\n');
  console.log('I66_REAL_SOURCE_STAGE_READONLY_VERIFIED '+JSON.stringify(report));
 }finally{await admin.app().delete();}
}
module.exports={requireCatalogEntry,readAllPages,summarizeProjection,normalizedProjection,requireUiProjection,requireServingIdentity};
if(require.main===module)main().catch(error=>{
 const first=String(error?.message||'').split('\n',1)[0];
 const safe=/^(?:I66_REAL_|COBROS_LEDGER_|STAGE_)[A-Z0-9_]+$/.test(first)?first:'I66_REAL_UNCLASSIFIED_READONLY_FAILURE';
 console.error('I66_REAL_SOURCE_STAGE_HOLD '+safe);process.exitCode=1;
});
