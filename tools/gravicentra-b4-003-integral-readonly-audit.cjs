'use strict';
/* Read-only evidence complement inside the existing B4-003 executor.
   No product build/deploy, no Firestore/Auth administrative writes, no messages.
   Auth custom tokens are transient and are never serialized. Browser mutation
   endpoints are blocked. All operational outputs are aggregates or role metadata. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const admin=require('firebase-admin');
const root='artifacts/orbit360-recovery/release-control';
const requestPath=root+'/I6_5_B4_003_INTEGRAL_AUDIT_REQUEST_20261016.json';
const cp=JSON.parse(fs.readFileSync(root+'/CONTROL_PLANE.json','utf8'));
const authz=JSON.parse(fs.readFileSync(requestPath,'utf8'));
const EXACT_QA_SCOPE='EXACT_QA_RESIDUE_DEPENDENCIES';
const exactQaScope=authz.executionScope===EXACT_QA_SCOPE;
if(Object.prototype.hasOwnProperty.call(authz,'executionScope')&&!exactQaScope)throw Error('READONLY_EXECUTION_SCOPE_UNKNOWN');
if(!exactQaScope&&authz.mintUserTokens===false)throw Error('LEGACY_BROWSER_SCOPE_NOT_AUTHORIZED_BY_REQUEST');
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
const gitBlob=v=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+v.length+'\0'),v])).digest('hex');
const cpBytes=fs.readFileSync(root+'/CONTROL_PLANE.json');
if(authz.mode!=='READ_ONLY_AUDIT_NO_ACCEPTANCE'||gitBlob(cpBytes)!==authz.controlPlaneBlob||cp.currentB4?.activeFindingId!=='B4-003'||cp.gateState?.gates?.I6?.activeSubgate!=='I6.5'||authz.productWrites!==false||authz.dataWrites!==false||authz.deploy!==false)throw Error('INTEGRAL_AUDIT_AUTHORITY_MISMATCH');
const project=String(process.env.PROJECT_ID||''),tenantId=String(process.env.TENANT_HINT||'');
if(project!=='ays-orbit-360-lab'||tenantId!=='alianzas-soluciones')throw Error('INTEGRAL_AUDIT_TARGET_MISMATCH');
const output=process.env.INTEGRAL_AUDIT_OUT;if(!output)throw Error('INTEGRAL_AUDIT_OUTPUT_REQUIRED');fs.mkdirSync(output,{recursive:true});
const state={schema:'GRAVICENTRA_READONLY_INTEGRAL_EVIDENCE_V1',at:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),controlPlaneBlob:gitBlob(cpBytes),project,tenantId,status:'RUNNING_READ_ONLY',operationalWrites:0,deploys:0,newProductAcceptance:false,accessMethod:'EXISTING_CI_SERVICE_ACCOUNT_ADMIN_READS_AND_SEPARATE_USER_BROWSER_CONTEXTS',sections:{},errors:[]};
const save=()=>fs.writeFileSync(path.join(output,'integral-readonly.json'),JSON.stringify(state,null,2));
const err=e=>String(e?.code||String(e?.message||'').match(/\b[A-Z][A-Z0-9_]{5,}\b/)?.[0]||e?.name||'ERROR').replace(/[^a-zA-Z0-9_./-]/g,'').slice(0,120);
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const arr=x=>Array.isArray(x)?x:[];
const sum=(rows,p)=>rows.reduce((n,r)=>n+(p(r)?1:0),0);
async function section(name,fn){try{state.sections[name]=await fn()}catch(e){state.sections[name]={status:'NOT_VERIFIED',error:err(e)};state.errors.push({section:name,error:err(e)})}save()}
// Preserve repository authorities exactly, never operational document snapshots.
if(!exactQaScope)for(const name of ['CONTROL_PLANE.json','I6_FINDINGS_LEDGER_20260924.json','I6_5_OPEN_FINDINGS_CARRY_FORWARD_REGISTER_20261003.json','CAPABILITY_LINEAGE_LOCK.json','CAPABILITY_STATUS_LEDGER.json','I6_PENDING_CLOSURE_MASTER_PLAN_LOCK_20261004.json','I6_5_FORENSIC_B4_EXECUTION_LOCK_20261002.json']){const p=root+'/'+name;if(fs.existsSync(p)){fs.mkdirSync(path.join(output,'repo-authority'),{recursive:true});fs.copyFileSync(p,path.join(output,'repo-authority',name));}}
/* The exact residue successor reads only the declared roots and their canonical
   references. It never runs the legacy inventory, Auth or browser sections. */
const qaRun='38102224750';
const qaRoots=[
  ['clientes','b4003qa_client_'+qaRun],
  ...['renew','expired_renew','unknown','renewwrite','cancel','health'].map(k=>['polizas','b4003qa_policy_'+k+'_'+qaRun]),
  ...['1','2','shadow'].map(k=>['recibosEsperados','b4003qa_receipt_health_'+k+'_'+qaRun]),
  ['cancelaciones','b4003qa_cancel_'+qaRun],['aseguradoras','b4003qa_insurer_'+qaRun],
  ['negocios','b4003qa_business_collab_'+qaRun],['negocios','b4003qa_business_collab_noclient_'+qaRun],
  ...['pol_mulsmxsk','pol_mulssmuz','pol_mulsxofx'].map(id=>['polizas',id])
].map(([collection,id])=>({collection,id}));
const qaLimits=Object.freeze({perQuery:100,maxDocuments:500,maxQueries:250,maxRounds:4,batchSize:10,maxParentReads:100});
const qaRelated=['polizas','recibosEsperados','carteraPrimas','cobros','vehiculos','cancelaciones','negocios','gestiones','tareas','actividades','reclamos','comisiones','finmovs','auditoria'];
const qaRelations=[
  {anchor:'clientes',collections:qaRelated,fields:['clienteId','clientId']},
  {anchor:'polizas',collections:qaRelated.filter(c=>c!=='polizas'),fields:['polizaId','policyId']},
  {anchor:'polizas',collections:['polizas'],fields:['renuevaDe']},
  {anchor:'aseguradoras',collections:['polizas','negocios','gestiones'],fields:['aseguradoraId','insurerId']},
  {anchor:'cancelaciones',collections:['negocios','gestiones','actividades'],fields:['cancelacionId']},
  {anchor:'negocios',collections:['polizas','vehiculos','gestiones','tareas','actividades'],fields:['negocioId','businessId','sourceBusinessId']},
  {anchor:'recibosEsperados',collections:['carteraPrimas','cobros','gestiones','actividades','comisiones','finmovs'],fields:['reciboId','receiptId']}
];
const qaAuditCollections=['previewWorkflowEvents','previewWorkflowRequests','previewNotificationOutbox','workflowEvents','workflowRequests','notificationOutbox'];
const qaParentFields={clienteId:'clientes',clientId:'clientes',polizaId:'polizas',policyId:'polizas',renuevaDe:'polizas',negocioId:'negocios',businessId:'negocios',sourceBusinessId:'negocios',reciboId:'recibosEsperados',receiptId:'recibosEsperados',cancelacionId:'cancelaciones',aseguradoraId:'aseguradoras',insurerId:'aseguradoras'};
const qaContract={roots:qaRoots,limits:qaLimits,relations:qaRelations,auditCollections:qaAuditCollections,parentFields:qaParentFields};
const qaId=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,180}$/.test(v)?v:'';
const qaCanonical=value=>{
  const seen=new WeakSet();
  const visit=(v,depth)=>{
    if(v==null||typeof v!=='object')return typeof v==='number'&&!Number.isFinite(v)?String(v):v;
    if(depth>16)return'[depth-limit]';
    if(typeof v.toDate==='function')return v.toDate().toISOString();
    if(v instanceof Date)return v.toISOString();
    if(seen.has(v))return'[circular]';seen.add(v);
    if(typeof v.path==='string'&&v.firestore)return{documentReference:v.path};
    if(Array.isArray(v))return v.map(x=>visit(x,depth+1));
    return Object.fromEntries(Object.keys(v).sort().map(k=>[k,visit(v[k],depth+1)]));
  };
  return JSON.stringify(visit(value,0));
};
function qaValidateRequest(){
  const requested=authz.exactQaResidue||{};
  if(authz.gate!=='I6.5/B4-003'||authz.existingExecutor!=='.github/workflows/gravicentra-b4-003-readonly-diagnostic.yml'||authz.auditTool!=='tools/gravicentra-b4-003-integral-readonly-audit.cjs'||authz.auditToolBlob!==gitBlob(fs.readFileSync(__filename)))throw Error('QA_RESIDUE_DIAGNOSTIC_BINDING_MISMATCH');
  if(requested.projectId!==project||requested.tenantId!==tenantId||qaCanonical(requested.roots)!==qaCanonical(qaRoots)||requested.contractSha256!==hash(qaCanonical(qaContract))||qaCanonical(requested.limits)!==qaCanonical(qaLimits))throw Error('QA_RESIDUE_EXACT_SCOPE_MISMATCH');
  for(const flag of ['authWrites','mintUserTokens','browserUat','membershipReads','dataWrites','productWrites','deploy','reimport','messages','cleanup','mayCloseFindings','mayAdvanceFormalPercent'])if(authz[flag]!==false)throw Error('QA_RESIDUE_FORBIDDEN_CAPABILITY_'+flag.toUpperCase());
  if(!/^[a-f0-9]{40}$/.test(authz.observedSourceHead||'')||execFileSync('git',['merge-base',authz.observedSourceHead,'HEAD'],{encoding:'utf8'}).trim()!==authz.observedSourceHead)throw Error('QA_RESIDUE_SOURCE_PARENT_MISMATCH');
}
if(exactQaScope)qaValidateRequest();
const app=admin.initializeApp({credential:admin.credential.applicationDefault(),projectId:project});const db=admin.firestore(app),au=exactQaScope?null:admin.auth(app),tenant=db.collection('tenants').doc(tenantId);const cache=new Map();
async function runExactQaResidueDependencies(){
  state.schema='GRAVICENTRA_EXACT_QA_RESIDUE_READONLY_EVIDENCE_V1';
  state.executionScope=EXACT_QA_SCOPE;
  state.diagnosticToolBlob=authz.auditToolBlob;
  state.requestBlob=gitBlob(fs.readFileSync(requestPath));
  state.accessMethod='EXISTING_CI_SERVICE_ACCOUNT_EXACT_DOCUMENT_AND_FILTERED_RELATION_READS';
  state.authWrites=0;state.userTokensMinted=0;state.membershipReads=0;state.browserSessions=0;
  state.cleanupPermitted=false;state.findingsClosed=0;state.formalPercentIncrement=0;
  const result={status:'READING_EXACT_ROOTS_AND_DECLARED_RELATIONS',rootCount:qaRoots.length,contractSha256:hash(qaCanonical(qaContract)),limits:qaLimits,roots:[],records:[],edges:[],queries:[],issues:[],parentReads:0,readWindow:{startedAt:new Date().toISOString(),completedAt:null,atomicSnapshot:false},declaredRelationCoverageComplete:false,universalDependencyGraphComplete:false,disposition:'HOLD_NO_CLEANUP_OR_ACCEPTANCE'};
  state.sections.exactQaResidue=result;
  const records=new Map(),anchors=new Map(),processed=new Set(),aliasOwners=new Map(),edgeKeys=new Set(),issueKeys=new Set();
  const rootKeys=new Set(qaRoots.map(x=>'data/'+x.collection+'/items/'+x.id));
  const issue=(code,details={})=>{const value={code,...details},key=qaCanonical(value);if(!issueKeys.has(key)){issueKeys.add(key);result.issues.push(value)}};
  const checkpoint=()=>{result.records=[...records.values()].map(x=>x.output).sort((a,b)=>a.document.localeCompare(b.document));save()};
  const stamp=v=>{try{const s=typeof v?.toDate==='function'?v.toDate().toISOString():v instanceof Date?v.toISOString():v;return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(s)?s:null}catch(_){return null}};
  const marker=(v,allowed)=>v==null?null:{present:true,value:allowed.has(norm(v))?norm(v):'OTHER_PRESENT',sha256:hash(String(v))};
  const knownSources=new Set(['b4003qa-harness','hosting-preview-uat','ingreso_manual_plataforma','ciclo comercial','ops','leads','manual','qa']);
  const knownStates=new Set(['pendiente','pagado','pagada','confirmado','confirmada','conciliado','conciliada','cancelado','cancelada','vigente','vencida','futuro_pendiente','futura','exigible','activo','activa','inactivo','inactiva','cotizando','committed','pending_provider','delivered','failed','resolved']);
  const dataCollection=c=>tenant.collection('data').doc(c).collection('items');
  const addEdge=(from,to,field,kind)=>{const key=JSON.stringify([from,to,field,kind]);if(!edgeKeys.has(key)){edgeKeys.add(key);result.edges.push({from,to,field,kind})}};
  function register(snap,collection,kind,origin){
    const id=qaId(snap.id),key=kind==='data'?'data/'+collection+'/items/'+id:collection+'/'+id;
    if(!id){issue('DOCUMENT_ID_NOT_SAFE_TO_EXPORT',{collection});return null}
    if(records.has(key)){if(origin==='ROOT')records.get(key).output.root=true;return records.get(key)}
    if(records.size>=qaLimits.maxDocuments){issue('DOCUMENT_LIMIT_REACHED');return null}
    const exists=snap.exists!==false,data=exists?(snap.data()||{}):{};
    if(data.id!=null&&data.id!==id&&!qaId(data.id))issue('STORED_ALIAS_NOT_CANONICAL_ID',{document:key});
    const refs={},unexportable=[];
    for(const field of [...Object.keys(qaParentFields),'entityId','eventId','requestId'])if(data[field]!=null&&data[field]!==''){const refId=qaId(data[field]);if(refId)refs[field]=refId;else unexportable.push(field)}
    if(unexportable.length)issue('RELATION_VALUE_NOT_CANONICAL_ID',{document:key,fields:unexportable});
    const amountFields=['monto','montoTotal','primaTotal','prima','valor','saldo','importe','pagado'];
    const amounts={};for(const field of amountFields)if(data[field]!=null&&data[field]!==''&&typeof data[field]!=='boolean'){const n=Number(data[field]);amounts[field]={present:true,numeric:Number.isFinite(n),nonzero:Number.isFinite(n)?n!==0:null,sign:Number.isFinite(n)?Math.sign(n):null,valueSha256:hash(qaCanonical(data[field]))}}
    const output={document:key,collection,id,root:rootKeys.has(key),origin,exists,readAt:stamp(snap.readTime),updateTime:stamp(snap.updateTime),storedIdMatches:data.id==null?null:data.id===id,storedIdAlias:qaId(data.id)||null,documentSha256:exists?hash(qaCanonical(data)):null,synthetic:{explicit:data.__syntheticQa===true,alternate:data.syntheticQa===true,previewWrite:data.previewWrite===true},tenantMatches:data.tenantId==null?null:data.tenantId===tenantId,createdAt:stamp(data.createdAt),updatedAt:stamp(data.updatedAt),ownerPresent:!!(data.ownerUid||data.createdByUid||data.actorUid||data.actor?.uid),ownerSha256:(data.ownerUid||data.createdByUid||data.actorUid||data.actor?.uid)?hash(String(data.ownerUid||data.createdByUid||data.actorUid||data.actor.uid)):null,source:{previewSource:marker(data.previewSource,knownSources),origen:marker(data.origen,knownSources),sourceType:marker(data.sourceType,knownSources)},relations:refs,status:{estado:marker(data.estado,knownStates),estadoOperativo:marker(data.estadoOperativo,knownStates),status:marker(data.status,knownStates),exigibilidad:marker(data.exigibilidad,knownStates),carteraActiva:typeof data.carteraActiva==='boolean'?data.carteraActiva:null,pagoConfirmado:typeof data.pagoConfirmado==='boolean'?data.pagoConfirmado:null},currency:['GTQ','COP','USD'].includes(data.moneda||data.currency)?data.moneda||data.currency:null,financialPresence:amounts,commentsCount:Array.isArray(data.comentarios)?data.comentarios.length:0,historyCount:Array.isArray(data.bitacora)?data.bitacora.length:0,commentsSha256:Array.isArray(data.comentarios)?hash(qaCanonical(data.comentarios)):null,historySha256:Array.isArray(data.bitacora)?hash(qaCanonical(data.bitacora)):null};
    const record={key,collection,kind,data,output};records.set(key,record);
    if(exists&&kind==='data'){
      if(origin!=='REFERENCED_PARENT')anchors.set(key,record);
      for(const alias of new Set([id,qaId(data.id)].filter(Boolean))){const aliasKey=collection+'/'+alias,prior=aliasOwners.get(aliasKey);if(prior&&prior!==key)issue('AMBIGUOUS_DOCUMENT_ALIAS',{collection,alias});else aliasOwners.set(aliasKey,key)}
    }
    return record;
  }
  async function readDocument(collection,id,origin,kind='data'){
    const key=kind==='data'?'data/'+collection+'/items/'+id:collection+'/'+id;
    if(records.has(key))return records.get(key);
    if(records.size>=qaLimits.maxDocuments){issue('DOCUMENT_LIMIT_REACHED');return null}
    try{return register(await (kind==='data'?dataCollection(collection):tenant.collection(collection)).doc(id).get(),collection,kind,origin)}catch(e){issue('EXACT_DOCUMENT_READ_FAILED',{document:key,error:err(e)});return null}
  }
  for(const root of qaRoots){const rec=await readDocument(root.collection,root.id,'ROOT');result.roots.push({collection:root.collection,id:root.id,readSucceeded:!!rec,exists:rec?.output.exists??null});checkpoint()}
  async function queryRelations(collection,field,batch,kind,sourceCollection){
    if(result.queries.length>=qaLimits.maxQueries){issue('QUERY_LIMIT_REACHED');return}
    const ids=[...new Set(batch)].sort();
    const queryRecord={collection,kind,field,ids,limit:qaLimits.perQuery,returned:0,status:'READING'};result.queries.push(queryRecord);
    try{
      const snap=await (kind==='data'?dataCollection(collection):tenant.collection(collection)).where(field,'in',ids).limit(qaLimits.perQuery+1).get();
      queryRecord.returned=snap.docs.length;
      queryRecord.status=snap.docs.length>qaLimits.perQuery?'TRUNCATED_HOLD':'READ_COMPLETE';
      if(snap.docs.length>qaLimits.perQuery)issue('QUERY_RESULT_LIMIT_REACHED',{collection,field});
      for(const doc of snap.docs.slice(0,qaLimits.perQuery)){
        const row=doc.data()||{},linked=qaId(row[field]);
        if(!ids.includes(linked)){issue('QUERY_RELATION_MISMATCH',{collection,field});continue}
        const rec=register(doc,collection,kind,kind==='data'?'DEPENDENCY':'WORKFLOW_AUDIT');
        if(rec){const from=sourceCollection==='*'?[...aliasOwners.entries()].filter(([k])=>k.endsWith('/'+linked)&&(!row.entityType||k.startsWith(row.entityType+'/'))).map(([,v])=>v):[aliasOwners.get(sourceCollection+'/'+linked)].filter(Boolean);if(!from.length)issue('AUDIT_ENTITY_TYPE_UNRESOLVED',{document:rec.key});for(const parent of from)addEdge(parent,rec.key,field,'INBOUND_DEPENDENCY')}
      }
    }catch(e){queryRecord.status='READ_FAILED_HOLD';queryRecord.error=err(e);issue('FILTERED_RELATION_READ_FAILED',{collection,field,error:err(e)})}
    checkpoint();
  }
  let exhausted=false;
  for(let round=0;round<qaLimits.maxRounds;round++){
    const frontier=[...anchors.values()].filter(x=>!processed.has(x.key));
    if(!frontier.length){exhausted=true;break}
    for(const rec of frontier)processed.add(rec.key);
    for(const spec of qaRelations){
      const ids=[...new Set(frontier.filter(x=>x.collection===spec.anchor).flatMap(x=>[x.output.id,qaId(x.data.id)]).filter(Boolean))];
      for(const collection of spec.collections)for(const field of spec.fields)for(let i=0;i<ids.length;i+=qaLimits.batchSize)await queryRelations(collection,field,ids.slice(i,i+qaLimits.batchSize),'data',spec.anchor);
    }
    const entityIds=[...new Set(frontier.flatMap(x=>[x.output.id,qaId(x.data.id)]).filter(Boolean))];
    for(const collection of qaAuditCollections)for(let i=0;i<entityIds.length;i+=qaLimits.batchSize)await queryRelations(collection,'entityId',entityIds.slice(i,i+qaLimits.batchSize),'audit','*');
    if(result.queries.length>=qaLimits.maxQueries||records.size>=qaLimits.maxDocuments)break;
  }
  if([...anchors.keys()].every(k=>processed.has(k)))exhausted=true;
  if(!exhausted)issue('DEPENDENCY_EXPANSION_INCOMPLETE');
  // Outgoing parents are existence/provenance reads only; do not expand a real
  // client's entire portfolio merely because a QA child references that client.
  for(const rec of [...records.values()])if(rec.kind==='data'&&rec.output.exists)for(const [field,collection] of Object.entries(qaParentFields)){
    const id=qaId(rec.data[field]);if(!id)continue;
    const known=aliasOwners.get(collection+'/'+id),target=known||'data/'+collection+'/items/'+id;
    if(!records.has(target)){
      if(result.parentReads>=qaLimits.maxParentReads){issue('PARENT_READ_LIMIT_REACHED');continue}
      result.parentReads++;await readDocument(collection,id,'REFERENCED_PARENT');
    }
    addEdge(rec.key,target,field,'OUTGOING_REFERENCE');
  }
  result.records=[...records.values()].map(x=>x.output).sort((a,b)=>a.document.localeCompare(b.document));
  result.readWindow.completedAt=new Date().toISOString();
  result.declaredRelationCoverageComplete=result.issues.length===0&&exhausted;
  result.coverageNotes=['Queries cover only the declared canonical fields and collections.','Outgoing parents are read without recursively expanding unrelated records.','Legacy operational batch events without entity identifiers and unindexed nested references are not scanned.','The historical fourteen roots were reused in later UAT; current dependencies are preserved.','No raw document snapshot, personal name, email, telephone, message, attachment URL or credential is exported.'];
  result.status=result.declaredRelationCoverageComplete?'DECLARED_RELATIONS_READ_COMPLETE_DISPOSITION_HOLD':'PARTIAL_RELATION_READ_HOLD';
  state.status=result.status;
  save();console.log('EXACT_QA_RESIDUE_READONLY_DONE roots='+qaRoots.length+' documents='+records.size+' queries='+result.queries.length+' issues='+result.issues.length+' auth=0 writes=0 acceptance=0');
}
async function rows(collection){if(cache.has(collection))return cache.get(collection);const snap=await tenant.collection('data').doc(collection).collection('items').limit(10001).get();const out=snap.docs.map(d=>({docId:d.id,...d.data()}));cache.set(collection,out);return out}
async function rest(url){const t=await app.options.credential.getAccessToken();const r=await fetch(url,{headers:{Authorization:'Bearer '+t.access_token},signal:AbortSignal.timeout(20000)});if(!r.ok)return{status:r.status,verified:false};return{status:r.status,verified:true,data:await r.json()}}
let memberships=[],advisors=[],access={},browser;
(async()=>{
if(exactQaScope){await runExactQaResidueDependencies();return;}
await section('repository_inventory',async()=>{const names=execFileSync('git',['ls-files'],{encoding:'utf8'}).trim().split('\n');const product=names.filter(n=>/^(orbit360-platform\/|functions\/|firestore.*\.rules$|storage.*\.rules$)/.test(n));const workflows=names.filter(n=>n.startsWith('.github/workflows/'));const publishers=workflows.filter(n=>/firebase[^\n]*(deploy|hosting:clone|hosting:channel)|deploy[^\n]*--only[^\n]*hosting/.test(fs.readFileSync(n,'utf8')));return{status:'REPO_SNAPSHOT_READ',trackedFiles:names.length,productFiles:product.length,workflows:workflows.length,publisherCandidates:publishers,scope:'CANONICAL_BRANCH_ONLY_OTHER_BRANCHES_AND_IAM_STILL_REQUIRE_SEPARATE_INVENTORY'}});
await section('authority_reconciliation',async()=>{const l=JSON.parse(fs.readFileSync(root+'/I6_FINDINGS_LEDGER_20260924.json')),c=JSON.parse(fs.readFileSync(root+'/I6_5_OPEN_FINDINGS_CARRY_FORWARD_REGISTER_20261003.json'));const a=l.findings||[],b=c.inventory||[];const ids=x=>new Set(x.map(r=>r.id));const A=ids(a),B=ids(b),byStatus={};for(const r of a)byStatus[r.status]=(byStatus[r.status]||0)+1;return{status:'RECONCILED_REPO_RECORDS_NOT_REACCEPTED',ledgerEntries:a.length,carryEntries:b.length,uniqueLedgerIds:A.size,uniqueCarryIds:B.size,missingInCarry:[...A].filter(x=>!B.has(x)),missingInLedger:[...B].filter(x=>!A.has(x)),statusMismatch:a.filter(r=>b.some(z=>z.id===r.id&&z.status!==r.status)).map(r=>r.id),byStatus,declaredCounts:l.counts,declaredAttention:c.attentionCount}});
await section('hosting_effective',async()=>{const live=await rest('https://firebasehosting.googleapis.com/v1beta1/sites/'+project+'/releases?pageSize=5');const channels=await rest('https://firebasehosting.googleapis.com/v1beta1/sites/'+project+'/channels?pageSize=100');let marker={};for(const [kind,url] of [['live',cp.certifiedCandidate?.productionUrl],['preview',cp.paulaOct16LatestCertifiedReadOnlyPreview?.previewUrl]]){try{const r=await fetch(url+'/__recovery__/build.json',{signal:AbortSignal.timeout(15000),headers:{'Cache-Control':'no-cache'}});const text=await r.text();let m;try{m=JSON.parse(text)}catch(_){m={}}marker[kind]={http:r.status,buildId:m.buildId||null,sourceSha:m.sourceSha||null,bytesSha256:hash(text)}}catch(e){marker[kind]={error:err(e)}}}return{status:'READ_ONLY_OBSERVATION',releasesHttp:live.status,releases:arr(live.data?.releases).map(r=>({name:r.name,type:r.type,releaseTime:r.releaseTime,version:r.version?.name,status:r.version?.status})),channelsHttp:channels.status,channels:arr(channels.data?.channels).map(c=>({name:c.name,expireTime:c.expireTime,releaseTime:c.release?.releaseTime,version:c.release?.version?.name})),marker}});
await section('rules_effective',async()=>{const release=await rest('https://firebaserules.googleapis.com/v1/projects/'+project+'/releases/cloud.firestore');if(!release.verified)return{status:'NOT_VERIFIED',http:release.status};const name=release.data.rulesetName;const rules=await rest('https://firebaserules.googleapis.com/v1/'+name);const files=arr(rules.data?.source?.files).map(f=>({name:f.name,sha256:hash(f.content||''),broadMemberGrant:/allow\s+read\s*,\s*write\s*:\s*if\s+isTenantMember\(tenantId\)/.test(f.content||''),exactRepoRules:(f.content||'')===fs.readFileSync('firestore.rules','utf8')}));return{status:rules.verified?'EFFECTIVE_RULESET_READ_NOT_BEHAVIOR_ACCEPTANCE':'NOT_VERIFIED',rulesetName:name,updateTime:release.data.updateTime,http:rules.status,files}});
await section('functions_effective',async()=>{const r=await rest('https://cloudfunctions.googleapis.com/v2/projects/'+project+'/locations/-/functions?pageSize=100');return{status:r.verified?'DEPLOYMENT_METADATA_READ_NOT_SOURCE_DIGEST_ATTESTATION':'NOT_VERIFIED',http:r.status,hasNextPage:!!r.data?.nextPageToken,functions:arr(r.data?.functions).map(f=>({name:f.name,state:f.state,updateTime:f.updateTime,revision:f.serviceConfig?.revision,runtime:f.buildConfig?.runtime,entryPoint:f.buildConfig?.entryPoint,build:f.buildConfig?.build}))}});
await section('membership_configuration',async()=>{const [ms,ad,cs]=await Promise.all([tenant.collection('members').get(),rows('asesores'),tenant.collection('config').doc('access').get()]);memberships=ms.docs.map(d=>({docId:d.id,...d.data()}));advisors=ad;access=cs.exists?cs.data():{};const users=[];for(const name of ['Paula','Samuel','Carlos','Fernando']){const matches=memberships.filter(m=>{const a=ad.find(x=>x.docId===(m.advisorId||m.asesorId));return norm([m.nombre,m.displayName,m.name,a?.nombre].join(' ')).split(/\s+/).includes(name.toLowerCase())});users.push({name,matches:matches.length,memberships:matches.map(m=>({roles:arr(m.roles),activeRole:m.activeRole||m.rolActivo||null,defaultRole:m.defaultRole||m.rolDefault||null,status:m.status||null,estado:m.estado||null,countries:arr(m.countries||m.paises),dataScopes:m.dataScopes||null,scopeDatos:m.scopeDatos||null,hasAdvisorId:!!(m.advisorId||m.asesorId),advisorExists:ad.some(a=>a.docId===(m.advisorId||m.asesorId)),hasPrimaryCountry:!!(m.primaryCountry||m.paisPrincipal||m.paisDefault),hasTeamId:!!(m.teamId||m.equipoId),globalTeamAdvisorCount:arr(m.teamAdvisorIds||m.asesoresEquipo||m.equipoAsesorIds).length,roleTeamCounts:Object.fromEntries(Object.entries(m.roleVisibleAdvisorIds||{}).map(([k,v])=>[k,Array.isArray(v)?v.length:'INVALID']))}))})}return{status:'SERVER_CONFIGURATION_READ_NOT_LOGIN_ACCEPTANCE',memberCount:memberships.length,advisorCount:ad.length,users,roleScopes:access.roleScopes||{},rolePermissions:access.rolePermissions||{},freelancerRoleCount:sum(ad,a=>arr(a.roles).some(r=>/freelance/i.test(r))),primaryCountryMissing:sum(ad,a=>!a.primaryCountry&&!a.paisPrincipal&&!a.paisDefault)}});
await section('operational_integrity',async()=>{const refs=await tenant.collection('data').listDocuments();const names=refs.map(r=>r.id).sort();const result=[];for(let i=0;i<names.length;i+=4)await Promise.all(names.slice(i,i+4).map(async name=>{try{const rs=await rows(name);result.push({collection:name,count:rs.length,scanComplete:rs.length<=10000,idMismatch:sum(rs,r=>r.id&&r.id!==r.docId),foreignTenant:sum(rs,r=>r.tenantId&&r.tenantId!==tenantId),missingCountry:sum(rs,r=>!r.pais&&!r.country),syntheticMarkerRows:sum(rs,r=>r.synthetic===true||r.qa===true||/^(?:qa_|test_|synthetic_)/i.test(r.docId))})}catch(e){result.push({collection:name,status:'NOT_VERIFIED',error:err(e)})}}));const clients=await rows('clientes'),policies=await rows('polizas');const C=new Set(clients.map(x=>x.docId)),P=new Set(policies.map(x=>x.docId));const related={};for(const coll of ['polizas','vehiculos','recibosEsperados','carteraPrimas','cobros','negocios','gestiones','comisiones','cancelaciones','siniestros']){const rs=await rows(coll);related[coll]={count:rs.length,missingClient:sum(rs,r=>(r.clienteId||r.clientId)&&!C.has(r.clienteId||r.clientId)),missingPolicy:sum(rs,r=>(r.polizaId||r.policyId)&&!P.has(r.polizaId||r.policyId))}}const goals=await rows('metas');return{status:'BOUNDED_ADMIN_READ_AGGREGATES_NOT_USER_SCOPE_PROOF',collections:result.sort((a,b)=>a.collection.localeCompare(b.collection)),relations:related,goals:{count:goals.length,individual:sum(goals,g=>!!(g.asesorId||g.advisorId)),institutional:sum(goals,g=>!g.asesorId&&!g.advisorId),periods:[...new Set(goals.map(g=>String(g.mes||g.periodo||'').slice(0,7)))],types:[...new Set(goals.map(g=>g.tipo||''))]}}});
await section('authenticated_ui_readonly',async()=>{const {chromium}=require('playwright');browser=await chromium.launch({headless:true});const preview=cp.paulaOct16LatestCertifiedReadOnlyPreview;if(!preview?.previewUrl)throw Error('PREVIEW_BINDING_MISSING');const origin=new URL(preview.previewUrl).origin;const contexts=[];const known=['inicio','equipo','configuracion','cliente360','polizas','aseguradoras','ops','leads','recibos','cobros','conciliaciones','renovaciones','cotizador','comparativo','siniestros','cancelaciones','cronograma','comisiones','finanzas','reportes','insights','historial','calidad','importar','portal','automatizaciones','correo','marketing','plantillas','academia','ia'];const candidates=[];for(const label of ['Paula','Samuel','Carlos','Fernando']){const matches=memberships.filter(m=>{const a=advisors.find(x=>x.docId===(m.advisorId||m.asesorId));return norm([m.nombre,m.displayName,m.name,a?.nombre].join(' ')).split(/\s+/).includes(label.toLowerCase())});const linked=matches.filter(m=>advisors.some(a=>a.docId===(m.advisorId||m.asesorId)&&String(a.authUid||a.uid||a.userId||'')===m.docId));const eligible=matches.length===1?matches:linked;if(eligible.length===1)candidates.push({label,member:eligible[0]});else contexts.push({user:label,status:'IDENTITY_NOT_UNIQUE',matches:matches.length,canonicalAuthLinks:linked.length})}
for(const {label,member:m} of candidates){const context=await browser.newContext({viewport:{width:1440,height:960}}),page=await context.newPage(),blocked=[],errors=[];page.on('pageerror',e=>errors.push(err(e)));await context.route('**/*',async route=>{const req=route.request(),u=new URL(req.url()),method=req.method();if(['GET','HEAD','OPTIONS'].includes(method))return route.continue();const last=u.pathname.split('/').pop();let data={};try{data=JSON.parse(req.postData()||'{}').data||{}}catch(_){}const authRead=(u.hostname==='identitytoolkit.googleapis.com'&&/accounts:(signInWithCustomToken|lookup)$/.test(u.pathname))||u.hostname==='securetoken.googleapis.com';const fsRead=u.hostname==='firestore.googleapis.com'&&/Listen\/channel|:batchGet|:runQuery/.test(u.pathname);const fnRead=u.hostname.endsWith('.cloudfunctions.net')&&(last==='orbit360ScopedPolicyReadPreview'||/^(orbit360AssignableAdvisorRoster|orbit360GetAdvisorOpsInbox|orbit360AcademiaManualRead|orbit360ProductAssetRead)(Preview)?$/.test(last)||(/^orbit360Tenant(DomainConfig|Branding)(Preview)?$/.test(last)&&(!data.action||data.action==='get')));if(authRead||fsRead||fnRead)return route.continue();blocked.push({endpoint:u.hostname.endsWith('.cloudfunctions.net')?u.pathname:u.pathname.replace(/[A-Za-z0-9_-]{30,}/g,'[id]').slice(-130),method});return route.abort('blockedbyclient')});
const rec={user:label,status:'STARTED',roles:[],blockedMutationCount:0,errors:[],note:'READONLY_NAVIGATION_NO_REAL_WRITES_NO_ACCEPTANCE'};try{const authUser=await au.getUser(m.docId);if(authUser.disabled)throw Error('AUTH_USER_DISABLED');const token=await au.createCustomToken(m.docId);await page.goto(origin,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0?.initialize,{timeout:25000});await page.evaluate(async t=>{const c=await Orbit.productRuntimeBrowserProvidersP0.initialize();await c.modules.auth.signInWithCustomToken(c.auth,t)},token);await page.reload({waitUntil:'domcontentloaded',timeout:30000});await page.waitForFunction(()=>!!window.Orbit?.auth?.productUser?.uid,{timeout:35000});const options=await page.locator('#rol-sel option').evaluateAll(es=>es.map(e=>({value:e.value,text:e.textContent})));for(const role of options.slice(0,8)){await page.locator('#rol-sel').selectOption(role.value);await page.waitForTimeout(500);const r={role:role.text,routes:[]};const routeNames=label==='Paula'?known:['inicio','ops','leads','cliente360','equipo','configuracion','aseguradoras'];for(const module of routeNames){await page.evaluate(m=>location.hash='#/'+m,module);await page.waitForTimeout(350);const observed=await page.evaluate(()=>{const h=document.querySelector('#host'),o=window.Orbit||{},p=o.store?._productStatus?.()||{};return{route:o.route?.key||'',role:o.session?.rol?.()||'',hasHost:!!h,childCount:h?.children.length||0,buttonCount:h?.querySelectorAll('button').length||0,inputCount:h?.querySelectorAll('input,select,textarea').length||0,rowCount:h?.querySelectorAll('tbody tr,[data-neg],[data-ges]').length||0,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+2,pendingMarkers:h?.querySelectorAll('[data-readiness="pending"],[data-readiness="unavailable"]').length||0,confirmed:p.serverConfirmedCollections||[],denied:p.deniedCollections||[],snapshotErrorCollections:Object.keys(p.snapshotErrors||{})}});r.routes.push({requested:module,...observed})}rec.roles.push(r)}rec.status='READONLY_ROUTES_OBSERVED';rec.responsive=[];for(const width of [390,320]){await page.setViewportSize({width,height:850});for(const module of ['inicio','ops','leads','cliente360','equipo','aseguradoras']){await page.evaluate(m=>location.hash='#/'+m,module);await page.waitForTimeout(450);rec.responsive.push(await page.evaluate(({module,width})=>({requested:module,width,actualRoute:Orbit.route?.key||'',horizontalOverflow:document.documentElement.scrollWidth>innerWidth+2,hostPresent:!!document.querySelector('#host .page')}),{module,width}))}}}catch(e){rec.status='NOT_VERIFIED';rec.error=err(e);rec.authDiagnostic=await page.evaluate(()=>({firebaseSession:!!window.Orbit?.productRuntimeBrowserProvidersP0,productUserPresent:!!window.Orbit?.auth?.productUser?.uid,loginErrorPresent:!!document.querySelector('#login-error')?.textContent,restoring:document.documentElement.hasAttribute('data-auth-restoring')})).catch(()=>({pageUnavailable:true}))}finally{rec.blockedMutationCount=blocked.length;rec.blockedEndpoints=[...new Set(blocked.map(x=>x.endpoint))];rec.errors=[...new Set(errors)];contexts.push(rec);state.sections.authenticated_ui_partial=contexts;save();await context.close()}}
await browser.close();browser=null;return{status:'BOUNDED_AUTHENTICATED_READONLY_OBSERVATION',previewBuild:preview.buildId,users:contexts,fullFunctionalAcceptance:false,writePersistenceTested:false,visualAcceptance:false,negativeSecurityMatrixComplete:false}});
state.status='READONLY_EVIDENCE_COMPLETED_WITH_EXPLICIT_GAPS';save();console.log('INTEGRAL_AUDIT_EVIDENCE_SAVED_NO_ACCEPTANCE');
})().catch(e=>{state.status='AUDIT_ERROR_NOT_ACCEPTED';state.errors.push({section:'terminal',error:err(e)});save();console.error('INTEGRAL_AUDIT_ERROR:'+err(e));process.exitCode=1}).finally(async()=>{if(browser)await browser.close();await app.delete()});
