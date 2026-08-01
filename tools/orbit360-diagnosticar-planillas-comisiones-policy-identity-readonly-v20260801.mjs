#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import admin from 'firebase-admin';

const require=createRequire(import.meta.url);
const resolver=require('../orbit360-platform/core/planillas-comisiones-policy-identity-resolver-p0.js');
const TENANT='alianzas-soluciones';
const PROJECT='ays-orbit-360-lab';
const GATE='block11-planillas-comisiones-linkage-readonly-v20260801';
const VERSION='11.0.0';
const lifecyclePath=process.env.ORBIT360_PLANILLAS_LIFECYCLE||'';
const packagePath=process.env.ORBIT360_PLANILLAS_PRIVATE_PACKAGE||'';
const expectedPhysical=process.env.ORBIT360_PLANILLAS_PRIVATE_PACKAGE_SHA256||'';
const expectedLogical=process.env.ORBIT360_PLANILLAS_PRIVATE_PACKAGE_LOGICAL_SHA256||'';
const evidencePath=process.env.ORBIT360_PLANILLAS_IDENTITY_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/planillas-comisiones-policy-identity-readonly-v20260801.json';

const clean=value=>String(value==null?'':value).trim();
const norm=resolver.normalizeKey;
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
  schemaVersion:'orbit360-planillas-comisiones-policy-identity-readonly-evidence-v1',
  gateId:GATE,
  contractVersion:VERSION,
  tenantId:TENANT,
  projectId:PROJECT,
  status:'STARTED',
  classification:'READ_ONLY_PLANILLAS_POLICY_IDENTITY_DIAGNOSTIC',
  lifecycleVerified:false,
  packageVerified:false,
  resolverVerified:false,
  counts:{},
  source:{rowsObserved:67,candidates:65,omitted:2,period:'2026-06'},
  rootCause:{
    classification:'VALIDATOR_STALE',
    exactFirstShortCircuitStale:true,
    insurerAliasExpansionRequired:true,
    receiptCalendarEvidenceRequired:true,
    paymentDateTermSelectionAllowed:false,
    sourceRowsChanged:false
  },
  identity:{
    processed:0,
    resolved:0,
    holds:0,
    previousUnique:10,
    previousHolds:55,
    previousUniqueReclassified:1,
    previousHoldsResolved:0,
    previousHoldsRemaining:0,
    decisions:{},
    bySourceBundle:{}
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
  containsSecrets:false,
  ok:false
};

try{
  if(!lifecyclePath||!fs.existsSync(lifecyclePath)||!packagePath||!fs.existsSync(packagePath))fail('ENVIRONMENT_FAILURE','INPUT_MISSING');
  const lifecycle=JSON.parse(fs.readFileSync(lifecyclePath,'utf8'));
  if(lifecycle.gateId!==GATE||lifecycle.gateContractVersion!==VERSION||lifecycle.status!=='PLANILLAS_POLICY_IDENTITY_DIAGNOSTIC_ACTIVE'||lifecycle.executionProfile?.mode!=='READ_ONLY_PLANILLAS_POLICY_IDENTITY_DIAGNOSTIC'||lifecycle.executionProfile?.phase!=='LAB_DATA_CONTRACT_REPAIR_DRYRUN'||lifecycle.executionProfile?.capabilities?.writes!==false||lifecycle.writeAuthorized!==false||lifecycle.financeActivated!==false||lifecycle.operationalWritesAllowed!==0)fail('SECURITY_FAILURE','LIFECYCLE_INVALID');
  result.lifecycleVerified=true;
  if(resolver.schemaVersion!=='orbit360-planillas-comisiones-policy-identity-resolver-v1'||typeof resolver.resolveRow!=='function'||typeof resolver.summarize!=='function')fail('VALIDATOR_STALE','RESOLVER_API');
  result.resolverVerified=true;

  const bytes=fs.readFileSync(packagePath);const physical=sha256(bytes);
  if(physical!==expectedPhysical||physical!==lifecycle.privatePackage?.sha256)fail('DATA_CONTRACT_FAILURE','PACKAGE_PHYSICAL_SHA');
  const pkg=JSON.parse(bytes.toString('utf8'));
  if(pkg.schemaVersion!=='orbit360-planillas-comisiones-linkage-private-v1'||pkg.tenantId!==TENANT||pkg.projectId!==PROJECT||pkg.sourceCut?.rowsObserved!==67||pkg.sourceCut?.crmCandidates!==65||!Array.isArray(pkg.records)||pkg.records.length!==65||pkg.rules?.writes!==0||pkg.rules?.financeActivation!==false)fail('DATA_CONTRACT_FAILURE','PACKAGE_SCOPE');
  if(pkg.logicalSha256!==expectedLogical||logicalDigest(pkg)!==expectedLogical||lifecycle.privatePackage?.logicalSha256!==expectedLogical)fail('DATA_CONTRACT_FAILURE','PACKAGE_LOGICAL_SHA');
  if(pkg.records.some(row=>row.country!=='GT'||!['GTQ','USD'].includes(row.currency)||row.period!=='2026-06'||!clean(row.policy_number)||!Number.isFinite(Number(row.net_premium))||!Number.isFinite(Number(row.intermediary_commission))))fail('DATA_CONTRACT_FAILURE','ROW_CONTRACT');
  result.packageVerified=true;

  const serviceAccount=JSON.parse(process.env.SERVICE_ACCOUNT||'{}');if(serviceAccount.project_id!==PROJECT)fail('ENVIRONMENT_FAILURE','PROJECT_ID_MISMATCH');
  admin.initializeApp({credential:admin.credential.cert(serviceAccount),projectId:PROJECT});const db=admin.firestore();result.secretsRead=true;result.firestoreRead=true;
  for(const collection of ['polizas','recibosEsperados','cobros','finmovs'])result.counts[collection]=await count(db,collection);
  if(result.counts.polizas!==1373||result.counts.recibosEsperados!==1294||result.counts.cobros!==5||result.counts.finmovs!==0)fail('DATA_CONTRACT_FAILURE','BASELINE_COUNTS');

  const [policySnapshot,receiptSnapshot]=await Promise.all([tenantCollection(db,'polizas').get(),tenantCollection(db,'recibosEsperados').get()]);
  const policies=policySnapshot.docs.map(document=>{
    const data=document.data();
    return {
      id:document.id,
      policyNumber:clean(firstByKey(data,[/(^|\.)(numero|numeroPoliza|numero_poliza|noPoliza|polizaNumero|policyNumber|poliza)$/i]))||document.id,
      insured:clean(firstByKey(data,[/(^|\.)(aseguradoNombreFuente|clienteFuenteNombre|asegurado|nombreAsegurado|contratanteNombre|clienteNombre)$/i])),
      branch:clean(firstByKey(data,[/(^|\.)(ramo|branch)$/i])),
      insurerId:clean(firstByKey(data,[/(^|\.)(aseguradoraId|insurerId)$/i]))
    };
  });
  const receipts=receiptSnapshot.docs.map(document=>{
    const data=document.data();
    return {
      id:document.id,
      policyId:clean(firstByKey(data,[/(^|\.)(polizaId|policyId)$/i])),
      currency:clean(firstByKey(data,[/(^|\.)(moneda|currency)$/i])),
      netPremium:firstByKey(data,[/(^|\.)(primaNeta|prima_neta|netPremium)$/i]),
      totalPremium:firstByKey(data,[/(^|\.)(primaTotal|prima_total|totalPremium)$/i])
    };
  });

  const groups=new Map();
  pkg.records.forEach(row=>{const key=`${row.source_id}|${norm(row.policy_number)}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);});
  const resolutions=[];

  for(const row of pkg.records){
    const insurerId=INSURER_IDS[row.insurer];if(!insurerId)fail('DATA_CONTRACT_FAILURE','INSURER_ALIAS_MISSING');
    const insurerPolicies=policies.filter(policy=>policy.insurerId===insurerId);
    const key=`${row.source_id}|${norm(row.policy_number)}`;
    const group=groups.get(key)||[];
    let groupedEvidence=null;
    if(group.length>1){
      const aliases=new Set(aliasKeys(row));
      const candidates=insurerPolicies.filter(policy=>aliases.has(norm(policy.policyNumber)));
      const total=group.reduce((sum,item)=>sum+Number(item.net_premium),0);
      const matching=[...new Map(candidates.filter(policy=>receipts.some(receipt=>receipt.policyId===policy.id&&resolver.amountMatches(receipt,total,row.currency))).map(policy=>[policy.id,policy])).values()];
      if(matching.length===1)groupedEvidence={uniquePolicy:true,candidateCount:candidates.length};
    }
    let typoCandidates=[];
    if(row.source_id==='ficohsa_gtq_2026_06'){
      const sourceKey=norm(row.policy_number);
      typoCandidates=insurerPolicies.filter(policy=>sourceKey.startsWith('AUTO')&&norm(policy.policyNumber)==='UTO'+sourceKey.slice(4));
    }
    const resolution=resolver.resolveRow({
      source:{policyNumber:row.policy_number,insured:row.insured,branch:row.branch,netPremium:row.net_premium,currency:row.currency},
      policies:insurerPolicies,
      receipts,
      aliasKeys:aliasKeys(row),
      branchNormalizer:branchGroup,
      canonicalTypoCandidates:typoCandidates,
      groupedEvidence
    });
    resolutions.push(resolution);
    result.identity.processed++;
    if(resolution.resolved===true)result.identity.resolved++;else result.identity.holds++;
    add(result.identity.decisions,resolution.decision);
    const bundle=result.identity.bySourceBundle[row.source_id]||(result.identity.bySourceBundle[row.source_id]={processed:0,resolved:0,holds:0,decisions:{}});
    bundle.processed++;
    if(resolution.resolved===true)bundle.resolved++;else bundle.holds++;
    add(bundle.decisions,resolution.decision);
  }

  result.identity.previousHoldsResolved=result.identity.previousHolds-result.identity.holds;
  result.identity.previousHoldsRemaining=result.identity.holds;
  const expectedDecisions={
    RESOLVE_EXACT_UNIQUE:9,
    RESOLVE_ALIAS_UNIQUE:16,
    RESOLVE_RENEWAL_BY_RECEIPT_AMOUNT:22,
    RESOLVE_BY_INSURED_BRANCH_RECEIPT_AMOUNT:2,
    HOLD_RENEWAL_AMBIGUITY_NO_RECEIPT_MATCH:9,
    HOLD_INSURED_CONFLICT:2,
    HOLD_POLICY_NUMBER_UNMAPPED:2,
    HOLD_CANONICAL_POLICY_NUMBER_TYPO:1,
    HOLD_GROUPED_POLICY_DETAIL_REQUIRED:2
  };
  if(result.identity.processed!==65||result.identity.resolved!==49||result.identity.holds!==16||result.identity.previousHoldsResolved!==39||result.identity.previousHoldsRemaining!==16)fail('DATA_CONTRACT_FAILURE','IDENTITY_COUNTS');
  if(Object.keys(expectedDecisions).some(key=>result.identity.decisions[key]!==expectedDecisions[key])||Object.keys(result.identity.decisions).some(key=>!Object.prototype.hasOwnProperty.call(expectedDecisions,key)))fail('DATA_CONTRACT_FAILURE','IDENTITY_DECISIONS');
  result.status='PLANILLAS_POLICY_IDENTITY_DIAGNOSTIC_PASS';
  result.classification='GO_LAB_PLANILLAS_POLICY_IDENTITY_DIAGNOSTIC';
  result.ok=true;
}catch(error){result.status='PLANILLAS_POLICY_IDENTITY_DIAGNOSTIC_FAIL';result.classification=clean(error&&error.code||'DATA_CONTRACT_FAILURE');result.error=safeError(error);result.ok=false;}

save(result);console.log(JSON.stringify(result,null,2));process.exit(result.ok?0:42);
