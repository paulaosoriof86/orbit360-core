#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import admin from 'firebase-admin';

const TENANT='alianzas-soluciones';
const PROJECT='ays-orbit-360-lab';
const GATE='block11-planillas-comisiones-linkage-readonly-v20260801';
const VERSION='11.0.0';
const lifecyclePath=process.env.ORBIT360_PLANILLAS_LIFECYCLE||'';
const packagePath=process.env.ORBIT360_PLANILLAS_PRIVATE_PACKAGE||'';
const expectedPhysical=process.env.ORBIT360_PLANILLAS_PRIVATE_PACKAGE_SHA256||'';
const expectedLogical=process.env.ORBIT360_PLANILLAS_PRIVATE_PACKAGE_LOGICAL_SHA256||'';
const evidencePath=process.env.ORBIT360_PLANILLAS_LINKAGE_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/planillas-comisiones-linkage-readonly-v20260801.json';

const clean=v=>String(v==null?'':v).trim();
const norm=v=>clean(v).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]/g,'');
const cents=v=>Number.isFinite(Number(v))?Math.round(Number(v)*100):null;
const sha256=v=>crypto.createHash('sha256').update(v).digest('hex');
function stable(v){if(Array.isArray(v))return v.map(stable);if(v&&typeof v==='object'){const o={};for(const k of Object.keys(v).sort())o[k]=stable(v[k]);return o;}return v;}
function logicalDigest(obj){const copy=JSON.parse(JSON.stringify(obj));delete copy.logicalSha256;return sha256(Buffer.from(JSON.stringify(stable(copy)),'utf8'));}
function fail(code,detail=''){const e=new Error(`${code}${detail?':'+detail:''}`);e.code=code;throw e;}
function safeError(e){return clean(e&&e.message||e).replace(/[\w.+-]+@[\w.-]+/g,'[email]').slice(0,400);}
function tenantCollection(db,name){return db.collection('tenantId').doc(TENANT).collection(name);}
async function count(db,name){const snap=await tenantCollection(db,name).count().get();return snap.data().count;}
function save(payload){fs.mkdirSync(path.dirname(evidencePath),{recursive:true});const tmp=`${evidencePath}.tmp-${process.pid}`;fs.writeFileSync(tmp,JSON.stringify(payload,null,2)+'\n','utf8');JSON.parse(fs.readFileSync(tmp,'utf8'));fs.renameSync(tmp,evidencePath);}
function primitives(obj,prefix='',out=[]){if(obj==null)return out;if(Array.isArray(obj)){obj.forEach((v,i)=>primitives(v,`${prefix}[${i}]`,out));return out;}if(typeof obj==='object'){for(const [k,v] of Object.entries(obj))primitives(v,prefix?`${prefix}.${k}`:k,out);return out;}out.push({path:prefix,value:obj});return out;}
function valuesByKey(obj,patterns){return primitives(obj).filter(x=>patterns.some(p=>p.test(x.path))).map(x=>clean(x.value)).filter(Boolean);}
function policyKeys(id,data){return new Set([id,...valuesByKey(data,[/(^|\.)(numeroPoliza|numero_poliza|noPoliza|polizaNumero|policyNumber|poliza|numero)$/i])].map(norm).filter(Boolean));}
function receiptPolicyIds(data){return new Set(valuesByKey(data,[/(^|\.)(polizaId|policyId)$/i]).map(clean).filter(Boolean));}
function receiptPolicyKeys(data){return new Set(valuesByKey(data,[/(^|\.)(numeroPoliza|numero_poliza|noPoliza|polizaNumero|policyNumber|poliza)$/i]).map(norm).filter(Boolean));}
function receiptRefs(data){return new Set(valuesByKey(data,[/(requer|factura|serie|relacion.*ingreso|rel.*ing|recibo|documento)/i]).map(norm).filter(Boolean));}
function receiptAmounts(data){return valuesByKey(data,[/(primaNeta|prima_neta|netPremium|primaTotal|prima_total|importe|monto)$/i]).map(cents).filter(v=>v!==null);}
function receiptCurrencies(data){return new Set(valuesByKey(data,[/(^|\.)(moneda|currency)$/i]).map(norm).filter(Boolean));}
function sourceRefs(row){return new Set([row.requirement,row.invoice_ref,row.income_relation,row.series,row.extra_reference].map(norm).filter(Boolean));}
function intersects(a,b){for(const v of a)if(b.has(v))return true;return false;}
function add(map,key){map[key]=(map[key]||0)+1;}

const result={
  schemaVersion:'orbit360-planillas-comisiones-linkage-readonly-evidence-v1',
  gateId:GATE,
  contractVersion:VERSION,
  tenantId:TENANT,
  projectId:PROJECT,
  status:'STARTED',
  classification:'READ_ONLY_PLANILLAS_COMISIONES_LINKAGE',
  lifecycleVerified:false,
  packageVerified:false,
  counts:{},
  source:{rowsObserved:67,candidates:65,omitted:2,periodOnly:29,reversals:2},
  linkage:{
    processed:0,
    policyUnique:0,
    policyMissing:0,
    policyAmbiguous:0,
    receiptUniqueByReference:0,
    receiptUniqueByNetPremium:0,
    receiptRelatedButUnresolved:0,
    receiptNoRelation:0,
    cobroLinked:0,
    cobroNotLinked:0,
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
  if(lifecycle.gateId!==GATE||lifecycle.gateContractVersion!==VERSION||lifecycle.status!=='PLANILLAS_COMISIONES_LINKAGE_READONLY_ACTIVE'||lifecycle.executionProfile?.mode!=='READ_ONLY_PLANILLAS_COMISIONES_LINKAGE'||lifecycle.executionProfile?.phase!=='LAB_DATA_CONTRACT_REPAIR_DRYRUN'||lifecycle.executionProfile?.capabilities?.writes!==false||lifecycle.writeAuthorized!==false||lifecycle.financeActivated!==false||lifecycle.operationalWritesAllowed!==0)fail('SECURITY_FAILURE','LIFECYCLE_INVALID');
  result.lifecycleVerified=true;

  const bytes=fs.readFileSync(packagePath);const physical=sha256(bytes);
  if(physical!==expectedPhysical||physical!==lifecycle.privatePackage?.sha256)fail('DATA_CONTRACT_FAILURE','PACKAGE_PHYSICAL_SHA');
  const pkg=JSON.parse(bytes.toString('utf8'));
  if(pkg.schemaVersion!=='orbit360-planillas-comisiones-linkage-private-v1'||pkg.tenantId!==TENANT||pkg.projectId!==PROJECT||pkg.sourceCut?.rowsObserved!==67||pkg.sourceCut?.crmCandidates!==65||!Array.isArray(pkg.records)||pkg.records.length!==65||pkg.rules?.writes!==0||pkg.rules?.financeActivation!==false)fail('DATA_CONTRACT_FAILURE','PACKAGE_SCOPE');
  if(pkg.logicalSha256!==expectedLogical||logicalDigest(pkg)!==expectedLogical||lifecycle.privatePackage?.logicalSha256!==expectedLogical)fail('DATA_CONTRACT_FAILURE','PACKAGE_LOGICAL_SHA');
  if(pkg.records.some(r=>r.country!=='GT'||!['GTQ','USD'].includes(r.currency)||r.period!=='2026-06'||!clean(r.policy_number)||!Number.isFinite(Number(r.net_premium))||!Number.isFinite(Number(r.intermediary_commission))))fail('DATA_CONTRACT_FAILURE','ROW_CONTRACT');
  result.packageVerified=true;

  const sa=JSON.parse(process.env.SERVICE_ACCOUNT||'{}');if(sa.project_id!==PROJECT)fail('ENVIRONMENT_FAILURE','PROJECT_ID_MISMATCH');
  admin.initializeApp({credential:admin.credential.cert(sa),projectId:PROJECT});const db=admin.firestore();result.secretsRead=true;result.firestoreRead=true;
  for(const coll of ['polizas','recibosEsperados','cobros','finmovs'])result.counts[coll]=await count(db,coll);
  if(result.counts.polizas!==1373||result.counts.recibosEsperados!==1294||result.counts.cobros!==5||result.counts.finmovs!==0)fail('DATA_CONTRACT_FAILURE','BASELINE_COUNTS');

  const [polSnap,recSnap,cobSnap]=await Promise.all([
    tenantCollection(db,'polizas').get(),
    tenantCollection(db,'recibosEsperados').get(),
    tenantCollection(db,'cobros').get()
  ]);
  const policies=polSnap.docs.map(d=>({id:d.id,data:d.data(),keys:policyKeys(d.id,d.data())}));
  const policyIndex=new Map();for(const p of policies)for(const k of p.keys){if(!policyIndex.has(k))policyIndex.set(k,[]);policyIndex.get(k).push(p);}
  const receipts=recSnap.docs.map(d=>({id:d.id,data:d.data(),policyIds:receiptPolicyIds(d.data()),policyKeys:receiptPolicyKeys(d.data()),refs:receiptRefs(d.data()),amounts:receiptAmounts(d.data()),currencies:receiptCurrencies(d.data())}));
  const cobros=cobSnap.docs.map(d=>({id:d.id,data:d.data()}));

  for(const row of pkg.records){
    result.linkage.processed++;
    const bundle=clean(row.source_id)||'unknown';
    if(!result.linkage.bySourceBundle[bundle])result.linkage.bySourceBundle[bundle]={processed:0,policyUnique:0,policyMissing:0,policyAmbiguous:0,receiptUnique:0,cobroLinked:0,holds:0};
    const b=result.linkage.bySourceBundle[bundle];b.processed++;
    const matches=policyIndex.get(norm(row.policy_number))||[];
    let decision='';
    if(matches.length===0){result.linkage.policyMissing++;b.policyMissing++;b.holds++;decision='HOLD_POLICY_NOT_FOUND';add(result.linkage.decisions,decision);continue;}
    if(matches.length>1){result.linkage.policyAmbiguous++;b.policyAmbiguous++;b.holds++;decision='HOLD_POLICY_AMBIGUOUS';add(result.linkage.decisions,decision);continue;}
    result.linkage.policyUnique++;b.policyUnique++;
    const policy=matches[0];
    const related=receipts.filter(r=>r.policyIds.has(policy.id)||intersects(r.policyKeys,policy.keys));
    if(!related.length){result.linkage.receiptNoRelation++;decision='LINK_POLICY_ONLY_NO_RECEIPT_RELATION';add(result.linkage.decisions,decision);continue;}
    const refs=sourceRefs(row);
    let receiptMatches=refs.size?related.filter(r=>intersects(r.refs,refs)):[];
    let method='REFERENCE';
    if(receiptMatches.length!==1){
      const net=cents(row.net_premium),currency=norm(row.currency);
      receiptMatches=related.filter(r=>r.amounts.includes(net)&&(!r.currencies.size||r.currencies.has(currency)));
      method='NET_PREMIUM';
    }
    if(receiptMatches.length===1){
      const receipt=receiptMatches[0];b.receiptUnique++;
      if(method==='REFERENCE')result.linkage.receiptUniqueByReference++;else result.linkage.receiptUniqueByNetPremium++;
      const cobroMatches=cobros.filter(c=>clean(c.data?.reciboId)===receipt.id||clean(c.data?.receiptId)===receipt.id);
      if(cobroMatches.length===1){result.linkage.cobroLinked++;b.cobroLinked++;decision='LINK_POLICY_RECEIPT_COBRO_READONLY';}
      else {result.linkage.cobroNotLinked++;decision='LINK_POLICY_RECEIPT_READONLY';}
      add(result.linkage.decisions,decision);continue;
    }
    result.linkage.receiptRelatedButUnresolved++;b.holds++;
    decision=receiptMatches.length>1?'HOLD_RECEIPT_AMBIGUOUS':'LINK_POLICY_ONLY_RECEIPT_UNRESOLVED';
    add(result.linkage.decisions,decision);
  }

  if(result.linkage.processed!==65)fail('DATA_CONTRACT_FAILURE','PROCESSED_COUNT');
  const policyAccounted=result.linkage.policyUnique+result.linkage.policyMissing+result.linkage.policyAmbiguous;
  if(policyAccounted!==65)fail('DATA_CONTRACT_FAILURE','POLICY_ACCOUNTING');
  result.status='PLANILLAS_COMISIONES_LINKAGE_READONLY_PASS';
  result.classification='GO_LAB_PLANILLAS_COMISIONES_LINKAGE_READONLY';
  result.ok=true;
}catch(error){result.status='PLANILLAS_COMISIONES_LINKAGE_READONLY_FAIL';result.classification=clean(error&&error.code||'DATA_CONTRACT_FAILURE');result.error=safeError(error);result.ok=false;}

save(result);console.log(JSON.stringify(result,null,2));process.exit(result.ok?0:42);
