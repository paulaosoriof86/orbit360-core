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
const lifecyclePath=process.env.ORBIT360_PLANILLAS_LIFECYCLE||'';
const packagePath=process.env.ORBIT360_PLANILLAS_PRIVATE_PACKAGE||'';
const expectedPhysical=process.env.ORBIT360_PLANILLAS_PRIVATE_PACKAGE_SHA256||'';
const expectedLogical=process.env.ORBIT360_PLANILLAS_PRIVATE_PACKAGE_LOGICAL_SHA256||'';
const evidencePath=process.env.ORBIT360_PLANILLAS_COMMISSION_DRYRUN_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/planillas-comisiones-five-relations-dryrun-v20260801.json';
const advisorConfigPath='orbit360-platform/data/tenant-config/alianzas-soluciones.asesores.json';

const clean=value=>String(value==null?'':value).trim();
const norm=policyResolver.normalizeKey;
const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
function stable(value){if(Array.isArray(value))return value.map(stable);if(value&&typeof value==='object'){const out={};for(const key of Object.keys(value).sort())out[key]=stable(value[key]);return out;}return value;}
function logicalDigest(obj){const copy=JSON.parse(JSON.stringify(obj));delete copy.logicalSha256;return sha256(Buffer.from(JSON.stringify(stable(copy)),'utf8'));}
function fail(code,detail=''){const error=new Error(`${code}${detail?':'+detail:''}`);error.code=code;throw error;}
function safeError(error){return clean(error&&error.message||error).replace(/[\w.+-]+@[\w.-]+/g,'[email]').slice(0,400);}
function tenantCollection(db,name){return db.collection('tenantId').doc(TENANT).collection(name);}
async function count(db,name){const snapshot=await tenantCollection(db,name).count().get();return snapshot.data().count;}
function save(payload){fs.mkdirSync(path.dirname(evidencePath),{recursive:true});const tmp=`${evidencePath}.tmp-${process.pid}`;fs.writeFileSync(tmp,JSON.stringify(payload,null,2)+'\n','utf8');JSON.parse(fs.readFileSync(tmp,'utf8'));fs.renameSync(tmp,evidencePath);}
function primitives(obj,prefix='',out=[]){if(obj==null)return out;if(Array.isArray(obj)){obj.forEach((value,index)=>primitives(value,`${prefix}[${index}]`,out));return out;}if(typeof obj==='object'&&typeof obj.toDate!=='function'){for(const [key,value] of Object.entries(obj))primitives(value,prefix?`${prefix}.${key}`:key,out);return out;}out.push({path:prefix,value:obj});return out;}
function firstByKey(obj,patterns){const found=primitives(obj).find(item=>patterns.some(pattern=>pattern.test(item.path))&&clean(item.value));return found?found.value:'';}
function branchGroup(value){const key=norm(value);if(/AUTO|VEHIC|FLOTA/.test(key))return 'VEHICULOS';if(key.includes('ACCIDENT'))return 'ACCIDENTES';if(key.includes('VIDA'))return 'VIDA';if(/SALUD|HOSPITAL/.test(key))return 'SALUD';if(/DANO|TLG/.test(key))return 'DANOS';if(key.includes('VIME'))return 'ACCIDENTES';return key;}
function aliasKeys(row){const key=norm(row.policy_number);const keys=new Set([key]);const digits=key.replace(/\D/g,'');if(row.source_id==='el_roble_gtq_2026_06'&&key.startsWith('GMCO')&&key.endsWith('0'))keys.add(key.slice(0,-1));if(row.source_id==='la_ceiba_gtq_2026_06')keys.add(key.replace(/^0+/,''));if(row.source_id==='aseguate_gtq_2026_06'||row.source_id==='bantrab_gtq_2026_06'){keys.add(digits);keys.add('AUTO'+digits);}if(row.source_id==='columna_gtq_2026_06'){keys.add(digits);keys.add('A'+digits);keys.add('VA'+digits);}return [...keys].filter(Boolean);}
function add(map,key){map[key]=(map[key]||0)+1;}
function normalizeAdvisorAlias(value){return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function buildAdvisorIndex(config){const byId=new Map(),byAlias=new Map();for(const advisor of config.advisors||[]){byId.set(advisor.id,advisor);for(const alias of [advisor.nombre,...(advisor.aliases||[])]){const key=normalizeAdvisorAlias(alias);if(!key)continue;if(!byAlias.has(key))byAlias.set(key,new Set());byAlias.get(key).add(advisor.id);}}return {byId,byAlias};}
function resolveSeller(row,policyAdvisorId,index){const amount=Number(row.seller_commission);if(!Number.isFinite(amount)||amount===0)return 'SELLER_NOT_APPLICABLE';if(!policyAdvisorId||!index.byId.has(policyAdvisorId))return 'POLICY_ADVISOR_NOT_CONFIGURED';const key=normalizeAdvisorAlias(row.seller);if(!key)return 'SELLER_ALIAS_NOT_CONFIGURED';const ids=[...(index.byAlias.get(key)||[])];if(ids.length===1&&ids[0]===policyAdvisorId)return 'SELLER_ALIAS_MATCHES_POLICY';if(ids.length===1)return 'SELLER_ALIAS_POLICY_CONFLICT';if(ids.length>1)return 'SELLER_ALIAS_AMBIGUOUS';return 'SELLER_ALIAS_NOT_CONFIGURED';}
async function targetSnapshot(db,name,prefix){const snapshot=await tenantCollection(db,name).get();const keys=new Set();for(const document of snapshot.docs){const data=document.data();if(clean(data._sourceKey))keys.add(clean(data._sourceKey));else if(document.id.startsWith(prefix))keys.add(document.id.slice(prefix.length));}return {count:snapshot.size,keys};}
function snapshotDigest(snapshots){const payload={};for(const [name,snapshot] of Object.entries(snapshots))payload[name]={count:snapshot.count,keyDigests:[...snapshot.keys].sort().map(value=>sha256(value))};return sha256(JSON.stringify(stable(payload)));}

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
  schemaVersion:'orbit360-planillas-comisiones-five-relations-dryrun-evidence-v1',
  gateId:GATE,
  contractVersion:VERSION,
  tenantId:TENANT,
  projectId:PROJECT,
  status:'STARTED',
  classification:'READ_ONLY_PLANILLAS_COMMISSION_DRYRUN',
  lifecycleVerified:false,
  packageVerified:false,
  plannerVerified:false,
  advisorConfigVerified:false,
  counts:{},
  targetSnapshotBefore:{},
  targetSnapshotAfter:{},
  dryRun:{
    sourceRows:65,
    exactPolicyReceiptRelations:0,
    total:0,
    commissionCandidates:0,
    holdsOrOmits:0,
    proposedDocuments:0,
    proposedPlanillasComisiones:0,
    proposedComisionesDevengadas:0,
    proposedConciliacionesComisiones:0,
    idempotentOmits:0,
    partialDestinationHolds:0,
    contractHolds:0,
    sellerReadyOrNotApplicable:0,
    sellerHolds:0,
    decisions:{},
    sellerDecisions:{},
    bySourceBundle:{},
    candidateSetDigest:'',
    targetSnapshotDigest:''
  },
  controls:{
    canonicalDestinations:['planillasComisiones','comisionesDevengadas','conciliacionesComisiones'],
    genericComisionesDestination:false,
    invoiceWrites:false,
    cxcWrites:false,
    cxpWrites:false,
    advisorLiquidationWrites:false,
    rateInferred:false,
    commissionPaymentDateSelectsPolicyOrReceipt:false,
    atomicBatchRequiredForFutureWrite:true,
    rollbackDocumentCount:0,
    separateWriteAuthorizationRequired:true
  },
  financeActivated:false,
  writeAuthorized:false,
  secretsRead:false,
  firestoreRead:false,
  firestoreWrites:0,
  operationalWrites:0,
  runtimeExecuted:false,
  browserExecuted:false,
  deployExecuted:false,
  productionTouched:false,
  containsPII:false,
  containsPolicyNumbers:false,
  containsAmounts:false,
  containsIds:false,
  containsSourceRows:false,
  containsSecrets:false,
  ok:false
};

try{
  if(!lifecyclePath||!fs.existsSync(lifecyclePath)||!packagePath||!fs.existsSync(packagePath)||!fs.existsSync(advisorConfigPath))fail('ENVIRONMENT_FAILURE','INPUT_MISSING');
  const lifecycle=JSON.parse(fs.readFileSync(lifecyclePath,'utf8'));
  if(lifecycle.gateId!==GATE||lifecycle.gateContractVersion!==VERSION||lifecycle.status!=='PLANILLAS_COMMISSION_DRYRUN_ACTIVE'||lifecycle.executionProfile?.mode!=='READ_ONLY_PLANILLAS_COMMISSION_DRYRUN'||lifecycle.executionProfile?.phase!=='LAB_DATA_CONTRACT_REPAIR_DRYRUN'||lifecycle.executionProfile?.capabilities?.writes!==false||lifecycle.writeAuthorized!==false||lifecycle.commissionWritesAuthorized!==false||lifecycle.financeActivated!==false||lifecycle.operationalWritesAllowed!==0)fail('SECURITY_FAILURE','LIFECYCLE_INVALID');
  result.lifecycleVerified=true;
  if(planner.schemaVersion!=='orbit360-planillas-comisiones-commission-dryrun-planner-v1'||planner.destinations.join('|')!=='planillasComisiones|comisionesDevengadas|conciliacionesComisiones'||typeof planner.planCandidate!=='function')fail('VALIDATOR_STALE','PLANNER_API');
  result.plannerVerified=true;
  const advisorConfig=JSON.parse(fs.readFileSync(advisorConfigPath,'utf8'));
  if(advisorConfig.schemaVersion!=='orbit360.tenant-advisors.v1'||advisorConfig.tenantId!==TENANT||!Array.isArray(advisorConfig.advisors)||advisorConfig.advisors.length!==7)fail('DATA_CONTRACT_FAILURE','ADVISOR_CONFIG');
  const advisorIndex=buildAdvisorIndex(advisorConfig);result.advisorConfigVerified=true;

  const bytes=fs.readFileSync(packagePath);const physical=sha256(bytes);
  if(physical!==expectedPhysical||physical!==lifecycle.privatePackage?.sha256)fail('DATA_CONTRACT_FAILURE','PACKAGE_PHYSICAL_SHA');
  const pkg=JSON.parse(bytes.toString('utf8'));
  if(pkg.schemaVersion!=='orbit360-planillas-comisiones-linkage-private-v1'||pkg.tenantId!==TENANT||pkg.projectId!==PROJECT||pkg.sourceCut?.crmCandidates!==65||!Array.isArray(pkg.records)||pkg.records.length!==65||pkg.rules?.writes!==0||pkg.rules?.financeActivation!==false)fail('DATA_CONTRACT_FAILURE','PACKAGE_SCOPE');
  if(pkg.logicalSha256!==expectedLogical||logicalDigest(pkg)!==expectedLogical||lifecycle.privatePackage?.logicalSha256!==expectedLogical)fail('DATA_CONTRACT_FAILURE','PACKAGE_LOGICAL_SHA');
  result.packageVerified=true;

  const serviceAccount=JSON.parse(process.env.SERVICE_ACCOUNT||'{}');if(serviceAccount.project_id!==PROJECT)fail('ENVIRONMENT_FAILURE','PROJECT_ID_MISMATCH');
  admin.initializeApp({credential:admin.credential.cert(serviceAccount),projectId:PROJECT});const db=admin.firestore();result.secretsRead=true;result.firestoreRead=true;
  for(const collection of ['polizas','recibosEsperados','cobros','finmovs'])result.counts[collection]=await count(db,collection);
  if(result.counts.polizas!==1373||result.counts.recibosEsperados!==1294||result.counts.cobros!==5||result.counts.finmovs!==0)fail('DATA_CONTRACT_FAILURE','BASELINE_COUNTS');

  const [policySnapshot,receiptSnapshot,cobroSnapshot,targetPlan,targetDev,targetCon]=await Promise.all([
    tenantCollection(db,'polizas').get(),tenantCollection(db,'recibosEsperados').get(),tenantCollection(db,'cobros').get(),
    targetSnapshot(db,'planillasComisiones','pla_com_'),targetSnapshot(db,'comisionesDevengadas','com_dev_'),targetSnapshot(db,'conciliacionesComisiones','con_com_')
  ]);
  const snapshots={planillasComisiones:targetPlan,comisionesDevengadas:targetDev,conciliacionesComisiones:targetCon};
  result.targetSnapshotBefore={planillasComisiones:targetPlan.count,comisionesDevengadas:targetDev.count,conciliacionesComisiones:targetCon.count};
  result.dryRun.targetSnapshotDigest=snapshotDigest(snapshots);

  const policies=policySnapshot.docs.map(document=>{const data=document.data();return {id:document.id,policyNumber:clean(firstByKey(data,[/(^|\.)(numero|numeroPoliza|numero_poliza|noPoliza|polizaNumero|policyNumber|poliza)$/i]))||document.id,insured:clean(firstByKey(data,[/(^|\.)(aseguradoNombreFuente|clienteFuenteNombre|asegurado|nombreAsegurado|contratanteNombre|clienteNombre)$/i])),branch:clean(firstByKey(data,[/(^|\.)(ramo|branch)$/i])),insurerId:clean(firstByKey(data,[/(^|\.)(aseguradoraId|insurerId)$/i])),advisorId:clean(firstByKey(data,[/(^|\.)(asesorId|advisorId|vendedorId)$/i]))};});
  const receipts=receiptSnapshot.docs.map(document=>{const data=document.data();return {id:document.id,policyId:clean(firstByKey(data,[/(^|\.)(polizaId|policyId)$/i])),currency:clean(firstByKey(data,[/(^|\.)(moneda|currency)$/i])),netPremium:firstByKey(data,[/(^|\.)(primaNeta|prima_neta|netPremium)$/i]),totalPremium:firstByKey(data,[/(^|\.)(primaTotal|prima_total|totalPremium)$/i]),series:firstByKey(data,[/(^|\.)(serie|series)$/i]),endorsement:firstByKey(data,[/(^|\.)(endoso|endorsement)$/i]),sourceReceiptNumber:firstByKey(data,[/(^|\.)(numeroReciboFuente|receiptNumber)$/i]),sourceReference:firstByKey(data,[/(^|\.)(sourceRef|referenciaFuente)$/i])};});
  const cobros=cobroSnapshot.docs.map(document=>({receiptId:clean(firstByKey(document.data(),[/(^|\.)(reciboId|receiptId)$/i]))}));
  const groups=new Map();pkg.records.forEach(row=>{const key=`${row.source_id}|${norm(row.policy_number)}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);});
  const plans=[];

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
    const plan=planner.planCandidate({
      insurerId,insurerName:row.insurer,policyId:policy.id,receiptId:receiptResolution.receiptId,advisorId:policy.advisorId,
      period:row.period,country:row.country,currency:row.currency,netPremium:Number(row.net_premium),
      intermediaryCommission:Number(row.intermediary_commission),sellerCommission:Number(row.seller_commission),
      sourceSeller:row.seller,sellerResolution,branch:row.branch,sourceFile:row.source_file,sourceSheet:row.source_sheet,
      sourceRow:Number(row.source_row),sourceBundle:row.source_id
    },{planillas:targetPlan.keys,devengadas:targetDev.keys,conciliaciones:targetCon.keys});
    plans.push({plan,sourceBundle:row.source_id});
  }

  result.dryRun.exactPolicyReceiptRelations=plans.length;
  const summary=planner.summarize(plans.map(item=>item.plan));
  Object.assign(result.dryRun,{total:summary.total,commissionCandidates:summary.commissionCandidates,holdsOrOmits:summary.holdsOrOmits,proposedDocuments:summary.proposedDocuments,decisions:summary.decisions,sellerDecisions:summary.sellerDecisions});
  for(const item of plans){
    const plan=item.plan;add(result.dryRun.bySourceBundle,item.sourceBundle);
    if(plan.decision==='OMIT_IDEMPOTENT')result.dryRun.idempotentOmits++;
    if(plan.decision==='HOLD_PARTIAL_DESTINATION_STATE')result.dryRun.partialDestinationHolds++;
    if(plan.decision==='HOLD_COMMISSION_CONTRACT_INCOMPLETE')result.dryRun.contractHolds++;
    if(String(plan.sellerDecision).startsWith('HOLD_'))result.dryRun.sellerHolds++;else result.dryRun.sellerReadyOrNotApplicable++;
  }
  result.dryRun.proposedPlanillasComisiones=result.dryRun.commissionCandidates;
  result.dryRun.proposedComisionesDevengadas=result.dryRun.commissionCandidates;
  result.dryRun.proposedConciliacionesComisiones=result.dryRun.commissionCandidates;
  result.controls.rollbackDocumentCount=result.dryRun.proposedDocuments;
  result.dryRun.candidateSetDigest=sha256(JSON.stringify(plans.map(item=>({key:item.plan.sourceKey||'',decision:item.plan.decision,seller:item.plan.sellerDecision,bundle:item.sourceBundle})).sort((a,b)=>(a.key||'').localeCompare(b.key||''))));

  const [afterPlan,afterDev,afterCon]=await Promise.all([count(db,'planillasComisiones'),count(db,'comisionesDevengadas'),count(db,'conciliacionesComisiones')]);
  result.targetSnapshotAfter={planillasComisiones:afterPlan,comisionesDevengadas:afterDev,conciliacionesComisiones:afterCon};
  if(JSON.stringify(result.targetSnapshotBefore)!==JSON.stringify(result.targetSnapshotAfter))fail('SECURITY_FAILURE','TARGET_COLLECTION_CHANGED_DURING_DRYRUN');
  if(result.dryRun.total!==5||result.dryRun.exactPolicyReceiptRelations!==5||Object.values(result.dryRun.bySourceBundle).reduce((sum,value)=>sum+value,0)!==5)fail('DATA_CONTRACT_FAILURE','FIVE_RELATION_SCOPE');
  if(result.dryRun.proposedDocuments!==result.dryRun.commissionCandidates*3||result.dryRun.proposedPlanillasComisiones!==result.dryRun.commissionCandidates||result.dryRun.proposedComisionesDevengadas!==result.dryRun.commissionCandidates||result.dryRun.proposedConciliacionesComisiones!==result.dryRun.commissionCandidates)fail('DATA_CONTRACT_FAILURE','THREE_DESTINATION_PLAN');
  if(result.dryRun.commissionCandidates+result.dryRun.holdsOrOmits!==5||result.dryRun.sellerReadyOrNotApplicable+result.dryRun.sellerHolds!==5)fail('DATA_CONTRACT_FAILURE','DRYRUN_PARTITION');
  result.status='PLANILLAS_COMMISSION_DRYRUN_PASS';result.classification='GO_LAB_PLANILLAS_COMMISSION_DRYRUN';result.ok=true;
}catch(error){result.status='PLANILLAS_COMMISSION_DRYRUN_FAIL';result.classification=clean(error&&error.code||'DATA_CONTRACT_FAILURE');result.error=safeError(error);result.ok=false;}

save(result);console.log(JSON.stringify(result,null,2));process.exit(result.ok?0:42);
