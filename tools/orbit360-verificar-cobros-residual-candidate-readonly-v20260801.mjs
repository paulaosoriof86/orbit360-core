#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import admin from 'firebase-admin';

const TENANT='alianzas-soluciones';
const PROJECT='ays-orbit-360-lab';
const GATE='block10.9-cobros-controlled-write-lab-v20260801';
const VERSION='10.9.0';
const lifecyclePath=process.env.ORBIT360_COBROS_LIFECYCLE||'';
const packagePath=process.env.ORBIT360_COBROS_RESIDUAL_PACKAGE||'';
const expectedPhysical=process.env.ORBIT360_COBROS_RESIDUAL_PACKAGE_SHA256||'';
const expectedLogical=process.env.ORBIT360_COBROS_RESIDUAL_PACKAGE_LOGICAL_SHA256||'';
const evidencePath=process.env.ORBIT360_COBROS_RESIDUAL_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/cobros-residual-candidate-readonly-v20260801.json';

const clean=v=>String(v==null?'':v).trim();
const sha256=v=>crypto.createHash('sha256').update(v).digest('hex');
function stable(v){if(Array.isArray(v))return v.map(stable);if(v&&typeof v==='object'){const o={};for(const k of Object.keys(v).sort())o[k]=stable(v[k]);return o;}return v;}
function logicalDigest(obj){const copy=JSON.parse(JSON.stringify(obj));delete copy.logicalSha256;return sha256(Buffer.from(JSON.stringify(stable(copy)),'utf8'));}
function isPlain(v){return Boolean(v)&&typeof v==='object'&&!Array.isArray(v)&&typeof v.toDate!=='function'&&!(v instanceof Date);}
function comparable(v){if(v&&typeof v.toDate==='function')return v.toDate().toISOString();if(v instanceof Date)return v.toISOString();if(Array.isArray(v))return v.map(comparable);if(isPlain(v)){const o={};for(const [k,x] of Object.entries(v))o[k]=comparable(x);return o;}return v;}
function fieldEqual(actual,expected){if(isPlain(expected)){if(!isPlain(actual))return false;return Object.entries(expected).every(([k,v])=>fieldEqual(actual[k],v));}return JSON.stringify(comparable(actual??null))===JSON.stringify(comparable(expected??null));}
function subsetEqual(actual,expected){return Boolean(actual&&expected)&&Object.entries(expected).every(([k,v])=>fieldEqual(actual[k],v));}
function fail(code,detail=''){const e=new Error(`${code}${detail?':'+detail:''}`);e.code=code;throw e;}
function safeError(e){return clean(e&&e.message||e).replace(/[\w.+-]+@[\w.-]+/g,'[email]').slice(0,400);}
function ref(db,coll,id){return db.collection('tenantId').doc(TENANT).collection(coll).doc(id);}
async function count(db,coll){const snap=await db.collection('tenantId').doc(TENANT).collection(coll).count().get();return snap.data().count;}
function save(payload){fs.mkdirSync(path.dirname(evidencePath),{recursive:true});const tmp=`${evidencePath}.tmp-${process.pid}`;fs.writeFileSync(tmp,JSON.stringify(payload,null,2)+'\n','utf8');JSON.parse(fs.readFileSync(tmp,'utf8'));fs.renameSync(tmp,evidencePath);}

const result={
  schemaVersion:'orbit360-cobros-residual-candidate-readonly-evidence-v1',
  gateId:GATE,
  contractVersion:VERSION,
  tenantId:TENANT,
  projectId:PROJECT,
  status:'STARTED',
  classification:'READ_ONLY_RESIDUAL_CANDIDATE_PREFLIGHT',
  lifecycleVerified:false,
  packageVerified:false,
  counts:{},
  candidate:{
    exists:false,
    policyExists:false,
    receiptExists:false,
    policySnapshotOk:false,
    receiptSnapshotOk:false,
    noExistingCobroForReceipt:false,
    receiptNotAlreadyConciliated:false,
    uniqueReceiptCandidate:false,
    amountExactAcrossSources:false,
    endosoConfirmedByTwoInsurerSources:false,
    policyStatePreserved:false,
    noFinmov:false,
    eligible:false
  },
  residualSummary:{sourceRows:9,appliedAndVerified:5,residualRows:4,candidates:0,holds:4},
  requestReplayBlocked:false,
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
  if(lifecycle.gateId!==GATE||lifecycle.gateContractVersion!==VERSION||lifecycle.status!=='RESIDUAL_CANDIDATE_READONLY_ACTIVE'||lifecycle.executionProfile?.mode!=='READ_ONLY_RESIDUAL_CANDIDATE_PREFLIGHT'||lifecycle.executionProfile?.phase!=='LAB_DATA_CONTRACT_REPAIR_DRYRUN'||lifecycle.executionProfile?.capabilities?.writes!==false||lifecycle.writeAuthorized!==false||lifecycle.newResidualWriteAuthorized!==false||lifecycle.requestReplayBlocked!==true||lifecycle.requestSemanticallyConsumed!==true||lifecycle.additionalExecutionProhibited!==true||lifecycle.residualCandidateReadOnlyAuthorized!==true)fail('SECURITY_FAILURE','LIFECYCLE_INVALID');
  result.lifecycleVerified=true;result.requestReplayBlocked=true;

  const bytes=fs.readFileSync(packagePath);const physical=sha256(bytes);
  if(physical!==expectedPhysical||physical!==lifecycle.residualCandidate?.privatePackage?.sha256)fail('DATA_CONTRACT_FAILURE','PACKAGE_PHYSICAL_SHA');
  const pkg=JSON.parse(bytes.toString('utf8'));
  if(pkg.schemaVersion!=='orbit360-cobros-residual-candidate-private-package-v1'||pkg.gateId!==GATE||pkg.contractVersion!==VERSION||pkg.phase!=='RESIDUAL_CANDIDATE_READONLY_PREFLIGHT'||pkg.tenantId!==TENANT||pkg.projectId!==PROJECT||pkg.candidateCount!==1||pkg.holdCount!==3||!pkg.candidate)fail('DATA_CONTRACT_FAILURE','PACKAGE_SCOPE');
  if(pkg.logicalSha256!==expectedLogical||logicalDigest(pkg)!==expectedLogical||lifecycle.residualCandidate?.privatePackage?.logicalSha256!==expectedLogical)fail('DATA_CONTRACT_FAILURE','PACKAGE_LOGICAL_SHA');
  const c=pkg.candidate;
  if(c.residualOrdinal!==2||!clean(c.policyId)||!clean(c.receiptId)||!clean(c.candidateRef)||c.readOnlyChecksRequired?.amountExactAcrossCurrentSources!==true||c.readOnlyChecksRequired?.endosoConfirmedByTwoInsurerSources!==true)fail('DATA_CONTRACT_FAILURE','CANDIDATE_CONTRACT');
  const s=c.sourceEvidence||{};
  if(!fieldEqual(s.insurerPaidRow?.amount,s.insurerPendingRow?.amount)||!fieldEqual(s.insurerPaidRow?.amount,s.crmCurrentRow?.amount)||!fieldEqual(s.insurerPaidRow?.amount,s.canonicalReceipt?.amount))fail('DATA_CONTRACT_FAILURE','SOURCE_AMOUNT_NOT_EXACT');
  const normalizeEndoso=v=>clean(v).replace(/-/g,'/');
  if(normalizeEndoso(s.insurerPaidRow?.endoso)!==normalizeEndoso(s.insurerPendingRow?.endoso))fail('DATA_CONTRACT_FAILURE','SOURCE_ENDOSO_NOT_CONFIRMED');
  result.packageVerified=true;result.candidate.amountExactAcrossSources=true;result.candidate.endosoConfirmedByTwoInsurerSources=true;

  const sa=JSON.parse(process.env.SERVICE_ACCOUNT||'{}');if(sa.project_id!==PROJECT)fail('ENVIRONMENT_FAILURE','PROJECT_ID_MISMATCH');
  admin.initializeApp({credential:admin.credential.cert(sa),projectId:PROJECT});const db=admin.firestore();result.secretsRead=true;result.firestoreRead=true;
  for(const coll of ['polizas','recibosEsperados','cobros','finmovs'])result.counts[coll]=await count(db,coll);
  if(result.counts.polizas!==1373||result.counts.recibosEsperados!==1294||result.counts.cobros!==5||result.counts.finmovs!==0)fail('DATA_CONTRACT_FAILURE','BASELINE_COUNTS');

  const [policySnap,receiptSnap,cobrosForReceipt,receiptsForPolicy]=await Promise.all([
    ref(db,'polizas',c.policyId).get(),
    ref(db,'recibosEsperados',c.receiptId).get(),
    db.collection('tenantId').doc(TENANT).collection('cobros').where('reciboId','==',c.receiptId).limit(2).get(),
    db.collection('tenantId').doc(TENANT).collection('recibosEsperados').where('polizaId','==',c.policyId).get()
  ]);
  result.candidate.exists=true;
  result.candidate.policyExists=policySnap.exists;
  result.candidate.receiptExists=receiptSnap.exists;
  if(!policySnap.exists||!receiptSnap.exists)fail('DATA_CONTRACT_FAILURE','CANDIDATE_DOCUMENT_MISSING');
  const policy=policySnap.data(),receipt=receiptSnap.data();
  result.candidate.policySnapshotOk=subsetEqual(policy,c.expectedPolicy);
  result.candidate.receiptSnapshotOk=subsetEqual(receipt,c.expectedReceipt);
  result.candidate.policyStatePreserved=policy.estado===c.expectedPolicy.estado&&policy.id===c.policyId;
  result.candidate.noExistingCobroForReceipt=cobrosForReceipt.empty;
  result.candidate.receiptNotAlreadyConciliated=receipt.conciliado!==true&&!clean(receipt.cobroId);
  const eligibleReceipts=receiptsForPolicy.docs.filter(doc=>{
    const r=doc.data();
    return fieldEqual(r.primaTotal,c.expectedReceipt.primaTotal)&&r.moneda===c.expectedReceipt.moneda&&r.serie===c.expectedReceipt.serie&&r.estadoOperativo==='pago_reportado'&&r.conciliado!==true&&!clean(r.cobroId);
  });
  result.candidate.uniqueReceiptCandidate=eligibleReceipts.length===1&&eligibleReceipts[0].id===c.receiptId;
  result.candidate.noFinmov=result.counts.finmovs===0;
  result.candidate.eligible=result.candidate.policySnapshotOk&&result.candidate.receiptSnapshotOk&&result.candidate.policyStatePreserved&&result.candidate.noExistingCobroForReceipt&&result.candidate.receiptNotAlreadyConciliated&&result.candidate.uniqueReceiptCandidate&&result.candidate.amountExactAcrossSources&&result.candidate.endosoConfirmedByTwoInsurerSources&&result.candidate.noFinmov;
  result.residualSummary.candidates=result.candidate.eligible?1:0;
  result.residualSummary.holds=result.candidate.eligible?3:4;
  result.status=result.candidate.eligible?'RESIDUAL_CANDIDATE_READONLY_PASS':'RESIDUAL_CANDIDATE_READONLY_HOLD';
  result.classification=result.candidate.eligible?'GO_LAB_COBROS_RESIDUAL_CANDIDATE_READONLY':'HOLD_LAB_COBROS_RESIDUAL_CANDIDATE_READONLY';
  result.ok=true;
}catch(error){result.status='RESIDUAL_CANDIDATE_READONLY_FAIL';result.classification=clean(error&&error.code||'DATA_CONTRACT_FAILURE');result.error=safeError(error);result.ok=false;}

save(result);console.log(JSON.stringify(result,null,2));process.exit(result.ok?0:42);
