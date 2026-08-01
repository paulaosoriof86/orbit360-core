#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import admin from 'firebase-admin';

const require=createRequire(import.meta.url);
const policyResolver=require('../orbit360-platform/core/planillas-comisiones-policy-identity-resolver-p0.js');
const receiptResolver=require('../orbit360-platform/core/planillas-comisiones-receipt-link-resolver-p0.js');
const planner=require('../orbit360-platform/core/planillas-comisiones-commission-dryrun-planner-p0.js');

const TENANT='alianzas-soluciones';
const PROJECT='ays-orbit-360-lab';
const GATE='block11-planillas-comisiones-linkage-readonly-v20260801';
const VERSION='11.0.0';
const AUTH_REF='planillas-comisiones-five-relations-write-20260801';
const EXPECTED_CANDIDATE_DIGEST='04c7da071ddadfe689e0137e730448ada36abe7aff6c228cd5abb0206c26c680';
const EXPECTED_EMPTY_TARGET_DIGEST='12b3763f976433e1e7e809f461dc835bca3a4c39b1d6dd1655e42a202e6cbf3f';
const requestPath=process.env.ORBIT360_PLANILLAS_WRITE_REQUEST||'';
const lifecyclePath=process.env.ORBIT360_PLANILLAS_LIFECYCLE||'';
const packagePath=process.env.ORBIT360_PLANILLAS_PRIVATE_PACKAGE||'';
const expectedPhysical=process.env.ORBIT360_PLANILLAS_PRIVATE_PACKAGE_SHA256||'';
const expectedLogical=process.env.ORBIT360_PLANILLAS_PRIVATE_PACKAGE_LOGICAL_SHA256||'';
const evidencePath=process.env.ORBIT360_PLANILLAS_WRITE_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/planillas-comisiones-controlled-write-lab-v20260801.json';
const advisorConfigPath='orbit360-platform/data/tenant-config/alianzas-soluciones.asesores.json';

const clean=value=>String(value==null?'':value).trim();
const norm=policyResolver.normalizeKey;
const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
function stable(value){if(Array.isArray(value))return value.map(stable);if(value&&typeof value==='object'){const out={};for(const key of Object.keys(value).sort())out[key]=stable(value[key]);return out;}return value;}
function logicalDigest(obj){const copy=JSON.parse(JSON.stringify(obj));delete copy.logicalSha256;return sha256(Buffer.from(JSON.stringify(stable(copy)),'utf8'));}
function fail(code,detail=''){const error=new Error(`${code}${detail?':'+detail:''}`);error.code=code;throw error;}
function safeError(error){return clean(error&&error.message||error).replace(/[\w.+-]+@[\w.-]+/g,'[email]').slice(0,500);}
function save(payload){fs.mkdirSync(path.dirname(evidencePath),{recursive:true});const tmp=`${evidencePath}.tmp-${process.pid}`;fs.writeFileSync(tmp,JSON.stringify(payload,null,2)+'\n','utf8');JSON.parse(fs.readFileSync(tmp,'utf8'));fs.renameSync(tmp,evidencePath);}
function tenantCollection(db,name){return db.collection('tenantId').doc(TENANT).collection(name);}
function docRef(db,name,id){return tenantCollection(db,name).doc(id);}
async function count(db,name){const snapshot=await tenantCollection(db,name).count().get();return snapshot.data().count;}
function primitives(obj,prefix='',out=[]){if(obj==null)return out;if(Array.isArray(obj)){obj.forEach((value,index)=>primitives(value,`${prefix}[${index}]`,out));return out;}if(typeof obj==='object'&&typeof obj.toDate!=='function'){for(const [key,value] of Object.entries(obj))primitives(value,prefix?`${prefix}.${key}`:key,out);return out;}out.push({path:prefix,value:obj});return out;}
function firstByKey(obj,patterns){const found=primitives(obj).find(item=>patterns.some(pattern=>pattern.test(item.path))&&clean(item.value));return found?found.value:'';}
function branchGroup(value){const key=norm(value);if(/AUTO|VEHIC|FLOTA/.test(key))return 'VEHICULOS';if(key.includes('ACCIDENT'))return 'ACCIDENTES';if(key.includes('VIDA'))return 'VIDA';if(/SALUD|HOSPITAL/.test(key))return 'SALUD';if(/DANO|TLG/.test(key))return 'DANOS';if(key.includes('VIME'))return 'ACCIDENTES';return key;}
function aliasKeys(row){const key=norm(row.policy_number);const keys=new Set([key]);const digits=key.replace(/\D/g,'');if(row.source_id==='el_roble_gtq_2026_06'&&key.startsWith('GMCO')&&key.endsWith('0'))keys.add(key.slice(0,-1));if(row.source_id==='la_ceiba_gtq_2026_06')keys.add(key.replace(/^0+/,''));if(row.source_id==='aseguate_gtq_2026_06'||row.source_id==='bantrab_gtq_2026_06'){keys.add(digits);keys.add('AUTO'+digits);}if(row.source_id==='columna_gtq_2026_06'){keys.add(digits);keys.add('A'+digits);keys.add('VA'+digits);}return [...keys].filter(Boolean);}
function normalizeAdvisorAlias(value){return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function buildAdvisorIndex(config){const byId=new Map(),byAlias=new Map();for(const advisor of config.advisors||[]){byId.set(advisor.id,advisor);for(const alias of [advisor.nombre,...(advisor.aliases||[])]){const key=normalizeAdvisorAlias(alias);if(!key)continue;if(!byAlias.has(key))byAlias.set(key,new Set());byAlias.get(key).add(advisor.id);}}return {byId,byAlias};}
function resolveSeller(row,policyAdvisorId,index){const amount=Number(row.seller_commission);if(!Number.isFinite(amount)||amount===0)return 'SELLER_NOT_APPLICABLE';if(!policyAdvisorId||!index.byId.has(policyAdvisorId))return 'POLICY_ADVISOR_NOT_CONFIGURED';const key=normalizeAdvisorAlias(row.seller);if(!key)return 'SELLER_ALIAS_NOT_CONFIGURED';const ids=[...(index.byAlias.get(key)||[])];if(ids.length===1&&ids[0]===policyAdvisorId)return 'SELLER_ALIAS_MATCHES_POLICY';if(ids.length===1)return 'SELLER_ALIAS_POLICY_CONFLICT';if(ids.length>1)return 'SELLER_ALIAS_AMBIGUOUS';return 'SELLER_ALIAS_NOT_CONFIGURED';}
async function targetSnapshot(db,name,prefix){const snapshot=await tenantCollection(db,name).get();const keys=new Set();for(const document of snapshot.docs){const data=document.data();if(clean(data._sourceKey))keys.add(clean(data._sourceKey));else if(document.id.startsWith(prefix))keys.add(document.id.slice(prefix.length));}return {count:snapshot.size,keys};}
function snapshotDigest(snapshots){const payload={};for(const [name,snapshot] of Object.entries(snapshots))payload[name]={count:snapshot.count,keyDigests:[...snapshot.keys].sort().map(value=>sha256(value))};return sha256(JSON.stringify(stable(payload)));}
function add(map,key){map[key]=(map[key]||0)+1;}

const INSURER_IDS=Object.freeze({
  'Seguros El Roble':'gt-seguros-el-roble',
  'Aseguradora La Ceiba':'gt-aseguradora-la-ceiba',
  'Aseguradora Guatemalteca':'gt-aseguradora-guatemalteca',
  'Aseguradora de los Trabajadores':'gt-seguros-bantrab',
  'Columna Compañía de Seguros':'gt-seguros-columna',
  'Seguros Universales':'gt-seguros-universales',
  'Seguros Ficohsa':'gt-seguros-ficohsa',
  'Seguros G&T':'gt-gt-seguros'
});

const result={
  schemaVersion:'orbit360-planillas-comisiones-controlled-write-evidence-v1',gateId:GATE,contractVersion:VERSION,
  tenantId:TENANT,projectId:PROJECT,status:'STARTED',classification:'',authorizationRef:AUTH_REF,
  requestVerified:false,lifecycleVerified:false,packageVerified:false,plannerVerified:false,advisorConfigVerified:false,
  candidateDigestVerified:false,targetDigestVerified:false,before:{},after:{},targetBefore:{},targetAfter:{},
  plan:{relations:0,commissionCandidates:0,documents:0,sellerHolds:0,sellerReadyOrNotApplicable:0,bySourceBundle:{},candidateSetDigest:'',targetSnapshotDigest:''},
  execution:{attempted:false,atomicCommit:false,alreadyApplied:false,createdDocuments:0,verifiedDocuments:0,replayBlocked:false},
  rollback:{executed:false,restored:false,deletedDocuments:0},
  controls:{canonicalDestinations:['planillasComisiones','comisionesDevengadas','conciliacionesComisiones'],singleAtomicTransaction:true,idempotency:true,rollbackAllOnAnyFailure:true,verifyAfterWrite:true,policyWrites:false,receiptWrites:false,cobroWrites:false,finmovWrites:false,invoiceWrites:false,cxcWrites:false,cxpWrites:false,advisorLiquidationWrites:false,rateInferred:false,crmVisualApproval:{clientes:true,polizas:false,vehiculos:false,recibos:false,cartera:false,restoCrm:false},visualApprovalInferred:false,deploy:false,production:false},
  secretsRead:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,browserExecuted:false,deployExecuted:false,productionTouched:false,
  containsPII:false,containsPolicyNumbers:false,containsAmounts:false,containsIds:false,containsSourceRows:false,containsSecrets:false,ok:false
};
let committed=false;let docs=[];

async function rollback(db){
  result.rollback.executed=true;
  await db.runTransaction(async tx=>{
    const snapshots=[];for(const item of docs)snapshots.push(await tx.get(docRef(db,item.collection,item.id)));
    for(let i=0;i<docs.length;i++){
      const snap=snapshots[i],item=docs[i];if(!snap.exists)continue;
      const data=snap.data();if(data.authorizationRef!==AUTH_REF||data.idempotencyKey!==item.sourceKey)fail('SECURITY_FAILURE','ROLLBACK_OWNERSHIP_MISMATCH');
      tx.delete(snap.ref);result.rollback.deletedDocuments++;
    }
  });
  const remaining=await Promise.all(docs.map(item=>docRef(db,item.collection,item.id).get()));
  result.rollback.restored=remaining.every(snapshot=>!snapshot.exists);
}

try{
  if(!requestPath||!fs.existsSync(requestPath)||!lifecyclePath||!fs.existsSync(lifecyclePath)||!packagePath||!fs.existsSync(packagePath)||!fs.existsSync(advisorConfigPath))fail('ENVIRONMENT_FAILURE','INPUT_MISSING');
  const request=JSON.parse(fs.readFileSync(requestPath,'utf8'));
  const lifecycle=JSON.parse(fs.readFileSync(lifecyclePath,'utf8'));
  if(request.schemaVersion!=='orbit360-planillas-comisiones-controlled-write-request-v1'||request.gateId!==GATE||request.contractVersion!==VERSION||request.approved!==true||request.consumed!==false||request.authorizationRef!==AUTH_REF)fail('DATA_CONTRACT_FAILURE','REQUEST_INVALID');
  if(request.scope?.relations!==5||request.scope?.documents!==15||request.scope?.planillasComisiones!==5||request.scope?.comisionesDevengadas!==5||request.scope?.conciliacionesComisiones!==5)fail('DATA_CONTRACT_FAILURE','REQUEST_SCOPE');
  if(request.scope?.sellerHolds!==3||request.scope?.policyWrites!==0||request.scope?.receiptWrites!==0||request.scope?.cobroWrites!==0||request.scope?.finmovWrites!==0||request.scope?.liquidationWrites!==0)fail('SECURITY_FAILURE','REQUEST_BOUNDARY');
  if(request.digests?.candidateSet!==EXPECTED_CANDIDATE_DIGEST||request.digests?.emptyTargetSnapshot!==EXPECTED_EMPTY_TARGET_DIGEST)fail('DATA_CONTRACT_FAILURE','REQUEST_DIGESTS');
  if(request.capabilities?.secrets!==true||request.capabilities?.firestoreRead!==true||request.capabilities?.writes!==true||request.capabilities?.browser!==false||request.capabilities?.deploy!==false||request.capabilities?.production!==false)fail('SECURITY_FAILURE','REQUEST_CAPABILITIES');
  if(request.crmVisualApproval?.clientes!==true||request.crmVisualApproval?.polizas!==false||request.crmVisualApproval?.vehiculos!==false||request.crmVisualApproval?.recibos!==false||request.crmVisualApproval?.cartera!==false||request.crmVisualApproval?.restoCrm!==false)fail('SECURITY_FAILURE','VISUAL_APPROVAL_BOUNDARY');
  result.requestVerified=true;
  if(lifecycle.gateId!==GATE||lifecycle.gateContractVersion!==VERSION||lifecycle.status!=='PLANILLAS_COMMISSION_CONTROLLED_WRITE_AUTHORIZED'||lifecycle.executionProfile?.mode!=='CONTROLLED_WRITE_PLANILLAS_COMMISSION'||lifecycle.executionProfile?.phase!=='LAB_DATA_CONTRACT_REPAIR_APPLY'||lifecycle.executionProfile?.capabilities?.writes!==true||lifecycle.writeAuthorized!==true||lifecycle.commissionWritesAuthorized!==true||lifecycle.operationalWritesAllowed!==15||lifecycle.financeActivated!==false)fail('SECURITY_FAILURE','LIFECYCLE_INVALID');
  result.lifecycleVerified=true;
  if(planner.schemaVersion!=='orbit360-planillas-comisiones-commission-dryrun-planner-v1'||planner.destinations.join('|')!=='planillasComisiones|comisionesDevengadas|conciliacionesComisiones'||typeof planner.planCandidate!=='function')fail('VALIDATOR_STALE','PLANNER_API');
  result.plannerVerified=true;
  const advisorConfig=JSON.parse(fs.readFileSync(advisorConfigPath,'utf8'));
  if(advisorConfig.schemaVersion!=='orbit360.tenant-advisors.v1'||advisorConfig.tenantId!==TENANT||!Array.isArray(advisorConfig.advisors)||advisorConfig.advisors.length!==7)fail('DATA_CONTRACT_FAILURE','ADVISOR_CONFIG');
  const advisorIndex=buildAdvisorIndex(advisorConfig);result.advisorConfigVerified=true;
  const bytes=fs.readFileSync(packagePath);const physical=sha256(bytes);
  if(physical!==expectedPhysical||physical!==lifecycle.privatePackage?.sha256||physical!==request.privatePackage?.sha256)fail('DATA_CONTRACT_FAILURE','PACKAGE_PHYSICAL_SHA');
  const pkg=JSON.parse(bytes.toString('utf8'));
  if(pkg.schemaVersion!=='orbit360-planillas-comisiones-linkage-private-v1'||pkg.tenantId!==TENANT||pkg.projectId!==PROJECT||pkg.sourceCut?.crmCandidates!==65||!Array.isArray(pkg.records)||pkg.records.length!==65||pkg.rules?.writes!==0||pkg.rules?.financeActivation!==false)fail('DATA_CONTRACT_FAILURE','PACKAGE_SCOPE');
  if(pkg.logicalSha256!==expectedLogical||logicalDigest(pkg)!==expectedLogical||lifecycle.privatePackage?.logicalSha256!==expectedLogical||request.privatePackage?.logicalSha256!==expectedLogical)fail('DATA_CONTRACT_FAILURE','PACKAGE_LOGICAL_SHA');
  result.packageVerified=true;

  const serviceAccount=JSON.parse(process.env.SERVICE_ACCOUNT||'{}');if(serviceAccount.project_id!==PROJECT)fail('ENVIRONMENT_FAILURE','PROJECT_ID_MISMATCH');
  admin.initializeApp({credential:admin.credential.cert(serviceAccount),projectId:PROJECT});const db=admin.firestore();result.secretsRead=true;result.firestoreRead=true;
  for(const collection of ['polizas','recibosEsperados','cobros','finmovs'])result.before[collection]=await count(db,collection);
  if(result.before.polizas!==1373||result.before.recibosEsperados!==1294||result.before.cobros!==5||result.before.finmovs!==0)fail('DATA_CONTRACT_FAILURE','BASELINE_COUNTS');

  const [policySnapshot,receiptSnapshot,cobroSnapshot,targetPlan,targetDev,targetCon]=await Promise.all([
    tenantCollection(db,'polizas').get(),tenantCollection(db,'recibosEsperados').get(),tenantCollection(db,'cobros').get(),
    targetSnapshot(db,'planillasComisiones','pla_com_'),targetSnapshot(db,'comisionesDevengadas','com_dev_'),targetSnapshot(db,'conciliacionesComisiones','con_com_')
  ]);
  const actualTargets={planillasComisiones:targetPlan,comisionesDevengadas:targetDev,conciliacionesComisiones:targetCon};
  result.targetBefore={planillasComisiones:targetPlan.count,comisionesDevengadas:targetDev.count,conciliacionesComisiones:targetCon.count};
  result.plan.targetSnapshotDigest=snapshotDigest(actualTargets);

  const policies=policySnapshot.docs.map(document=>{const data=document.data();return {id:document.id,policyNumber:clean(firstByKey(data,[/(^|\.)(numero|numeroPoliza|numero_poliza|noPoliza|polizaNumero|policyNumber|poliza)$/i]))||document.id,insured:clean(firstByKey(data,[/(^|\.)(aseguradoNombreFuente|clienteFuenteNombre|asegurado|nombreAsegurado|contratanteNombre|clienteNombre)$/i])),branch:clean(firstByKey(data,[/(^|\.)(ramo|branch)$/i])),insurerId:clean(firstByKey(data,[/(^|\.)(aseguradoraId|insurerId)$/i])),advisorId:clean(firstByKey(data,[/(^|\.)(asesorId|advisorId|vendedorId)$/i]))};});
  const receipts=receiptSnapshot.docs.map(document=>{const data=document.data();return {id:document.id,policyId:clean(firstByKey(data,[/(^|\.)(polizaId|policyId)$/i])),currency:clean(firstByKey(data,[/(^|\.)(moneda|currency)$/i])),netPremium:firstByKey(data,[/(^|\.)(primaNeta|prima_neta|netPremium)$/i]),totalPremium:firstByKey(data,[/(^|\.)(primaTotal|prima_total|totalPremium)$/i]),series:firstByKey(data,[/(^|\.)(serie|series)$/i]),endorsement:firstByKey(data,[/(^|\.)(endoso|endorsement)$/i]),sourceReceiptNumber:firstByKey(data,[/(^|\.)(numeroReciboFuente|receiptNumber)$/i]),sourceReference:firstByKey(data,[/(^|\.)(sourceRef|referenciaFuente)$/i])};});
  const cobros=cobroSnapshot.docs.map(document=>({receiptId:clean(firstByKey(document.data(),[/(^|\.)(reciboId|receiptId)$/i]))}));
  const groups=new Map();pkg.records.forEach(row=>{const key=`${row.source_id}|${norm(row.policy_number)}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);});
  const plans=[];const emptyExisting={planillas:new Set(),devengadas:new Set(),conciliaciones:new Set()};
  for(const row of pkg.records){
    const insurerId=INSURER_IDS[row.insurer];if(!insurerId)fail('DATA_CONTRACT_FAILURE','INSURER_ALIAS_MISSING');
    const insurerPolicies=policies.filter(policy=>policy.insurerId===insurerId);
    const group=groups.get(`${row.source_id}|${norm(row.policy_number)}`)||[];
    let groupedEvidence=null;
    if(group.length>1){const aliases=new Set(aliasKeys(row));const candidates=insurerPolicies.filter(policy=>aliases.has(norm(policy.policyNumber)));const total=group.reduce((sum,item)=>sum+Number(item.net_premium),0);const matching=[...new Map(candidates.filter(policy=>receipts.some(receipt=>receipt.policyId===policy.id&&policyResolver.amountMatches(receipt,total,row.currency))).map(policy=>[policy.id,policy])).values()];if(matching.length===1)groupedEvidence={uniquePolicy:true,candidateCount:candidates.length};}
    let typoCandidates=[];if(row.source_id==='ficohsa_gtq_2026_06'){const sourceKey=norm(row.policy_number);typoCandidates=insurerPolicies.filter(policy=>sourceKey.startsWith('AUTO')&&norm(policy.policyNumber)==='UTO'+sourceKey.slice(4));}
    const policyResolution=policyResolver.resolveRow({source:{policyNumber:row.policy_number,insured:row.insured,branch:row.branch,netPremium:row.net_premium,currency:row.currency},policies:insurerPolicies,receipts,aliasKeys:aliasKeys(row),branchNormalizer:branchGroup,canonicalTypoCandidates:typoCandidates,groupedEvidence});
    if(policyResolution.resolved!==true)continue;
    const policy=policies.find(item=>item.id===policyResolution.policyId);if(!policy)fail('DATA_CONTRACT_FAILURE','RESOLVED_POLICY_MISSING');
    const receiptResolution=receiptResolver.resolveReceipt({source:{netPremium:row.net_premium,currency:row.currency,requirement:row.requirement,invoiceReference:row.invoice_ref,incomeRelation:row.income_relation,series:row.series,extraReference:row.extra_reference},policyId:policy.id,receipts});
    if(receiptResolution.resolved!==true)continue;
    if(cobros.some(cobro=>cobro.receiptId===receiptResolution.receiptId))fail('DATA_CONTRACT_FAILURE','CURRENT_COBRO_PERIOD_CROSS_LINK');
    const sellerResolution=resolveSeller(row,policy.advisorId,advisorIndex);
    const plan=planner.planCandidate({insurerId,insurerName:row.insurer,policyId:policy.id,receiptId:receiptResolution.receiptId,advisorId:policy.advisorId,period:row.period,country:row.country,currency:row.currency,netPremium:Number(row.net_premium),intermediaryCommission:Number(row.intermediary_commission),sellerCommission:Number(row.seller_commission),sourceSeller:row.seller,sellerResolution,branch:row.branch,sourceFile:row.source_file,sourceSheet:row.source_sheet,sourceRow:Number(row.source_row),sourceBundle:row.source_id},emptyExisting);
    plans.push({plan,sourceBundle:row.source_id});
  }
  const summary=planner.summarize(plans.map(item=>item.plan));
  result.plan.relations=plans.length;result.plan.commissionCandidates=summary.commissionCandidates;result.plan.documents=summary.proposedDocuments;
  for(const item of plans){add(result.plan.bySourceBundle,item.sourceBundle);if(String(item.plan.sellerDecision).startsWith('HOLD_'))result.plan.sellerHolds++;else result.plan.sellerReadyOrNotApplicable++;}
  result.plan.candidateSetDigest=sha256(JSON.stringify(plans.map(item=>({key:item.plan.sourceKey||'',decision:item.plan.decision,seller:item.plan.sellerDecision,bundle:item.sourceBundle})).sort((a,b)=>(a.key||'').localeCompare(b.key||''))));
  if(result.plan.relations!==5||result.plan.commissionCandidates!==5||result.plan.documents!==15||result.plan.sellerHolds!==3||result.plan.sellerReadyOrNotApplicable!==2)fail('DATA_CONTRACT_FAILURE','PLAN_COUNTS');
  if(result.plan.candidateSetDigest!==EXPECTED_CANDIDATE_DIGEST)fail('DATA_CONTRACT_FAILURE','CANDIDATE_SET_DIGEST');result.candidateDigestVerified=true;

  docs=[];
  for(const item of plans){const plan=item.plan;if(!plan.commissionEligible||!plan.seeds)fail('DATA_CONTRACT_FAILURE','NON_ELIGIBLE_PLAN');
    for(const collection of planner.destinations){const seed=plan.seeds[collection];docs.push({collection,id:seed.id,sourceKey:plan.sourceKey,data:{...seed,authorizationRef:AUTH_REF,idempotencyKey:plan.sourceKey,writeGateId:GATE,sellerDecision:plan.sellerDecision,liquidacionAsesorAutorizada:false,crmVisualApprovalRequired:true,createdBy:'block11-planillas-controlled-write',createdAt:admin.firestore.FieldValue.serverTimestamp()}});}
  }
  if(docs.length!==15||new Set(docs.map(item=>`${item.collection}/${item.id}`)).size!==15)fail('DATA_CONTRACT_FAILURE','DOCUMENT_SET');

  const initialEmpty=result.targetBefore.planillasComisiones===0&&result.targetBefore.comisionesDevengadas===0&&result.targetBefore.conciliacionesComisiones===0;
  if(initialEmpty){if(result.plan.targetSnapshotDigest!==EXPECTED_EMPTY_TARGET_DIGEST)fail('DATA_CONTRACT_FAILURE','TARGET_SNAPSHOT_DIGEST');result.targetDigestVerified=true;}
  result.execution.attempted=true;
  const txResult=await db.runTransaction(async tx=>{
    const snapshots=[];for(const item of docs)snapshots.push(await tx.get(docRef(db,item.collection,item.id)));
    const existing=snapshots.filter(snapshot=>snapshot.exists).length;
    if(existing===15){for(let i=0;i<docs.length;i++){const data=snapshots[i].data();if(data.authorizationRef!==AUTH_REF||data.idempotencyKey!==docs[i].sourceKey||data._sourceKey!==docs[i].sourceKey)fail('DATA_CONTRACT_FAILURE','IDEMPOTENCY_COLLISION');}return {alreadyApplied:true};}
    if(existing!==0)fail('DATA_CONTRACT_FAILURE','PARTIAL_DESTINATION_STATE');
    if(!initialEmpty)fail('DATA_CONTRACT_FAILURE','TARGET_COLLECTION_NOT_EMPTY');
    for(const item of docs)tx.create(docRef(db,item.collection,item.id),item.data);
    return {alreadyApplied:false};
  });
  if(txResult.alreadyApplied){result.execution.alreadyApplied=true;result.execution.replayBlocked=true;}else{committed=true;result.execution.atomicCommit=true;result.execution.createdDocuments=15;result.firestoreWrites=15;result.operationalWrites=15;}

  const verified=await Promise.all(docs.map(item=>docRef(db,item.collection,item.id).get()));
  for(let i=0;i<docs.length;i++){const snap=verified[i],item=docs[i];if(!snap.exists)fail('DATA_CONTRACT_FAILURE','POST_DOCUMENT_MISSING');const data=snap.data();if(data.authorizationRef!==AUTH_REF||data.idempotencyKey!==item.sourceKey||data._sourceKey!==item.sourceKey||data.liquidacionAsesorAutorizada!==false||data.writeGateId!==GATE)fail('DATA_CONTRACT_FAILURE','POST_DOCUMENT_INVALID');result.execution.verifiedDocuments++;}
  for(const collection of ['polizas','recibosEsperados','cobros','finmovs'])result.after[collection]=await count(db,collection);
  if(JSON.stringify(result.before)!==JSON.stringify(result.after))fail('SECURITY_FAILURE','CRM_BASELINE_CHANGED');
  result.targetAfter={planillasComisiones:await count(db,'planillasComisiones'),comisionesDevengadas:await count(db,'comisionesDevengadas'),conciliacionesComisiones:await count(db,'conciliacionesComisiones')};
  if(result.targetAfter.planillasComisiones!==5||result.targetAfter.comisionesDevengadas!==5||result.targetAfter.conciliacionesComisiones!==5)fail('DATA_CONTRACT_FAILURE','POST_TARGET_COUNTS');
  result.status='WRITE_PASS';result.classification='GO_LAB_PLANILLAS_COMMISSION_CONTROLLED_WRITE';result.ok=true;
}catch(error){
  result.status='WRITE_FAIL';result.classification=clean(error&&error.code||'DATA_CONTRACT_FAILURE');result.error=safeError(error);
  try{if(committed&&admin.apps.length){await rollback(admin.firestore());result.targetAfter={planillasComisiones:await count(admin.firestore(),'planillasComisiones'),comisionesDevengadas:await count(admin.firestore(),'comisionesDevengadas'),conciliacionesComisiones:await count(admin.firestore(),'conciliacionesComisiones')};for(const collection of ['polizas','recibosEsperados','cobros','finmovs'])result.after[collection]=await count(admin.firestore(),collection);}}catch(rollbackError){result.rollback.error=safeError(rollbackError);result.classification='PIPELINE_MECHANISM_FAILURE';}
  result.ok=false;
}
save(result);console.log(JSON.stringify(result,null,2));process.exit(result.ok?0:42);
