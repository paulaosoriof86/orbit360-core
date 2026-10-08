import fs from 'node:fs';
import crypto from 'node:crypto';
import { initializeApp, applicationDefault, getApps, deleteApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab';
const TENANT='alianzas-soluciones';
const TODAY='2026-10-07';
const CUTOFF='2026-07-31';
const RECENT_START='2026-08-01';
const RULE_ID='PAULA_EXPIRED_CUTOFF_20261007';
const EXPECTED_TARGET_COUNT=583;
const EXPECTED_TARGET_DIGEST='744f6f26139f272fa3a26ab35e889a9d011833e802d1495286147734ec7b4d1d';
const EXPECTED_RECENT_COUNT=24;
const EXPECTED_RECENT_DIGEST='3512b167cdde30b51f67acc3c77135f2a94df5f133fd2d3b45cde8540938e67a';
const ALLOWED_FIELDS=['renovacionEstado','renewalDispositionRuleId','renewalDispositionReason'];
const PATCH={
  renovacionEstado:'No renovada',
  renewalDispositionRuleId:RULE_ID,
  renewalDispositionReason:'VIGENCIA_FIN_HASTA_2026_07_31_SIN_RENOVACION_NI_CANCELACION'
};
const OUT=process.env.R20_RENEWAL_CUTOFF_APPLY_RESULT||'/tmp/r20-renewal-cutoff-apply.json';
const ROLLBACK=process.env.R20_RENEWAL_CUTOFF_ROLLBACK||'/tmp/r20-renewal-cutoff-rollback.private.json';
const AUTH=process.env.R20_RENEWAL_CUTOFF_AUTH||'artifacts/orbit360-recovery/release-control/I6_5_B4_003_B02_RENEWAL_CUTOFF_APPLY_AUTH_20261008.json';
const MODE=(process.argv.find(v=>v.startsWith('--mode='))||'--mode=apply').slice(7);

const clean=v=>String(v==null?'':v).trim();
const norm=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const stable=v=>JSON.stringify(v,Object.keys(v||{}).sort());
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const validDate=v=>/^20\d{2}-\d{2}-\d{2}$/.test(clean(v));
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
const renewability=p=>{
  if(!own(p,'renovable')||p.renovable==null||clean(p.renovable)==='')return'UNKNOWN';
  const v=norm(p.renovable);if(p.renovable===true||['true','si','renovable'].includes(v))return'YES';
  if(p.renovable===false||['false','no','norenovable'].includes(v))return'NO';return'UNKNOWN';
};
const renewalOutcome=p=>{
  if(clean(p&&p.renovadaPor))return'RENEWED';
  const x=norm(p&&p.renovacionEstado);
  if(x==='renovada')return'RENEWED';
  if(['norenovada','rechazada','cerrada'].includes(x))return'NO_RENEWED';
  if(x==='cancelada')return'CANCELLED';
  const e=norm(p&&p.estado);if(['cancelada','anulada'].includes(e))return'CANCELLED';return'OPEN';
};
const withoutAllowed=p=>Object.fromEntries(Object.entries(p||{}).filter(([k])=>!ALLOWED_FIELDS.includes(k)));
const fieldState=p=>Object.fromEntries(ALLOWED_FIELDS.map(k=>[k,{present:own(p,k),value:p?.[k]??null}]));

function compute(polizas,cancellations){
  const oldTargets=[],recentPipeline=[];
  for(const {id,p} of polizas){
    const end=clean(p.vigenciaFin||p.fechaFin||p.endDate);
    if(!validDate(end)||end>=TODAY)continue;
    let outcome=renewalOutcome(p);if(cancellations.has(id))outcome='CANCELLED';
    if(outcome!=='OPEN')continue;
    const r=renewability(p);if(r==='NO')continue;
    if(end<=CUTOFF){
      oldTargets.push({idHash:hash(id).slice(0,16),numeroHash:hash(clean(p.numero)).slice(0,12),vigenciaFin:end,pais:clean(p.pais),estado:clean(p.estado),renewability:r,currentRenewalOutcome:clean(p.renovacionEstado),proposedPatch:PATCH});
    }else if(end>=RECENT_START&&end<TODAY){
      recentPipeline.push({idHash:hash(id).slice(0,16),numeroHash:hash(clean(p.numero)).slice(0,12),vigenciaFin:end,pais:clean(p.pais),estado:clean(p.estado),renewability:r,expectedBucket:'Vencidas'});
    }
  }
  return {oldTargets,recentPipeline,targetDigest:hash(oldTargets),recentDigest:hash(recentPipeline)};
}

function assertAuthority(){
  const a=JSON.parse(fs.readFileSync(AUTH,'utf8'));
  if(a.status!=='AUTHORIZED_PENDING_APPLY'||a.authority?.decision!=='AUTHORIZE_EXACT_583')throw Error('B02_AUTHORITY_STATUS_MISMATCH');
  if(a.rule?.ruleId!==RULE_ID||Number(a.authorization?.maxWrites)!==EXPECTED_TARGET_COUNT)throw Error('B02_AUTHORITY_RULE_MISMATCH');
  if(a.dryRun?.targetDigest!==EXPECTED_TARGET_DIGEST||a.dryRun?.recentDigest!==EXPECTED_RECENT_DIGEST)throw Error('B02_AUTHORITY_DIGEST_MISMATCH');
  if(JSON.stringify(a.rule?.allowedFields)!==JSON.stringify(ALLOWED_FIELDS))throw Error('B02_AUTHORITY_FIELDS_MISMATCH');
  return a;
}

async function snapshots(db){
  const tenant=db.collection('tenants').doc(TENANT),col=n=>tenant.collection('data').doc(n).collection('items');
  const [ps,cs]=await Promise.all([col('polizas').get(),col('cancelaciones').get()]);
  const polizas=ps.docs.map(d=>({id:d.id,p:d.data()||{},ref:d.ref}));
  const cancellations=new Set();
  for(const d of cs.docs){const p=d.data()||{},id=clean(p.polizaId||p.policyId);if(id)cancellations.add(id);}
  return {polizas,cancellations,policyCount:ps.size};
}

async function writeBatches(db,rows,mapper){
  let writes=0;
  for(let i=0;i<rows.length;i+=400){
    const batch=db.batch();
    for(const row of rows.slice(i,i+400)){const {ref,data}=mapper(row);batch.update(ref,data);writes++;}
    await batch.commit();
  }
  return writes;
}

async function rollback(db){
  if(!fs.existsSync(ROLLBACK))throw Error('B02_ROLLBACK_FILE_MISSING');
  const rb=JSON.parse(fs.readFileSync(ROLLBACK,'utf8'));
  if(rb.targetDigest!==EXPECTED_TARGET_DIGEST||rb.rows?.length!==EXPECTED_TARGET_COUNT)throw Error('B02_ROLLBACK_AUTHORITY_MISMATCH');
  const tenant=db.collection('tenants').doc(TENANT),col=tenant.collection('data').doc('polizas').collection('items');
  const writes=await writeBatches(db,rb.rows,row=>{
    const data={};
    for(const k of ALLOWED_FIELDS)data[k]=row.fields[k].present?row.fields[k].value:FieldValue.delete();
    return {ref:col.doc(row.id),data};
  });
  const result={schema:'GRAVICENTRA_I6_5_B4_003_R20_RENEWAL_CUTOFF_ROLLBACK_V1',recordedAt:new Date().toISOString(),status:'PASS_ROLLBACK',writes,targetDigest:rb.targetDigest,reimport:false,livePromotion:false};
  fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n');
  return result;
}

const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT});
const db=getFirestore(app);
let result={schema:'GRAVICENTRA_I6_5_B4_003_R20_RENEWAL_CUTOFF_APPLY_V1',recordedAt:new Date().toISOString(),status:'INIT',projectId:PROJECT,tenantId:TENANT,ruleId:RULE_ID,cutoff:CUTOFF,writes:0,rollbackExecuted:false,reimport:false,livePromotion:false,errors:[]};
try{
  if(MODE==='rollback'){
    result=await rollback(db);
  }else if(MODE==='apply'){
    assertAuthority();
    const before=await snapshots(db),computed=compute(before.polizas,before.cancellations);
    if(before.policyCount!==1419)throw Error(`B02_POLICY_COUNT_DRIFT:${before.policyCount}`);
    if(computed.oldTargets.length!==EXPECTED_TARGET_COUNT||computed.targetDigest!==EXPECTED_TARGET_DIGEST)throw Error(`B02_TARGET_DRIFT:${computed.oldTargets.length}:${computed.targetDigest}`);
    if(computed.recentPipeline.length!==EXPECTED_RECENT_COUNT||computed.recentDigest!==EXPECTED_RECENT_DIGEST)throw Error(`B02_RECENT_DRIFT:${computed.recentPipeline.length}:${computed.recentDigest}`);
    const targetHashes=new Set(computed.oldTargets.map(x=>x.idHash));
    const recentHashes=new Set(computed.recentPipeline.map(x=>x.idHash));
    const targets=before.polizas.filter(x=>targetHashes.has(hash(x.id).slice(0,16)));
    const recent=before.polizas.filter(x=>recentHashes.has(hash(x.id).slice(0,16)));
    if(targets.length!==EXPECTED_TARGET_COUNT||recent.length!==EXPECTED_RECENT_COUNT)throw Error('B02_HASHED_TARGET_RESOLUTION_MISMATCH');
    const rollbackRows=targets.map(({id,p})=>({id,fields:fieldState(p),unrelatedDigest:hash(withoutAllowed(p))}));
    fs.writeFileSync(ROLLBACK,JSON.stringify({schema:'B02_PRIVATE_ROLLBACK_V1',targetDigest:computed.targetDigest,rows:rollbackRows},null,2)+'\n',{mode:0o600});
    const recentBefore=hash(recent.map(({id,p})=>({idHash:hash(id).slice(0,16),data:p})));
    result.writes=await writeBatches(db,targets,row=>({ref:row.ref,data:PATCH}));
    if(result.writes!==EXPECTED_TARGET_COUNT)throw Error(`B02_WRITE_COUNT_MISMATCH:${result.writes}`);
    const after=await snapshots(db);
    if(after.policyCount!==before.policyCount)throw Error('B02_POLICY_COUNT_CHANGED');
    const afterById=new Map(after.polizas.map(x=>[x.id,x]));
    for(const row of rollbackRows){
      const current=afterById.get(row.id);if(!current)throw Error('B02_TARGET_MISSING_AFTER_APPLY');
      if(ALLOWED_FIELDS.some(k=>current.p[k]!==PATCH[k]))throw Error('B02_TARGET_PATCH_READBACK_FAILED');
      if(hash(withoutAllowed(current.p))!==row.unrelatedDigest)throw Error('B02_UNRELATED_TARGET_FIELD_CHANGED');
    }
    const recentAfterRows=recent.map(({id})=>afterById.get(id)).filter(Boolean).map(({id,p})=>({idHash:hash(id).slice(0,16),data:p}));
    if(recentAfterRows.length!==EXPECTED_RECENT_COUNT||hash(recentAfterRows)!==recentBefore)throw Error('B02_RECENT_24_CHANGED');
    const afterComputed=compute(after.polizas,after.cancellations);
    if(afterComputed.oldTargets.length!==0)throw Error(`B02_OLD_TARGETS_REMAIN:${afterComputed.oldTargets.length}`);
    if(afterComputed.recentPipeline.length!==EXPECTED_RECENT_COUNT||afterComputed.recentDigest!==EXPECTED_RECENT_DIGEST)throw Error('B02_RECENT_PIPELINE_DRIFT_AFTER_APPLY');
    Object.assign(result,{status:'PASS_APPLY',targetDigest:computed.targetDigest,recentDigest:computed.recentDigest,before:{policyCount:before.policyCount,targetCount:EXPECTED_TARGET_COUNT,recentCount:EXPECTED_RECENT_COUNT},after:{policyCount:after.policyCount,targetCount:0,recentCount:afterComputed.recentPipeline.length},integrity:{exactTargetCount:true,exactWrites:true,allTargetsReadBack:true,onlyAllowedFieldsChanged:true,recent24Untouched:true,noInserts:true,noDeletes:true,noReimport:true},rollbackPrepared:true});
    fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n');
  }else throw Error(`B02_UNSUPPORTED_MODE:${MODE}`);
  console.log(JSON.stringify(result,null,2));
}catch(error){
  result.status='FAIL';result.errors.push(String(error&&error.stack||error));
  try{fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n');}catch{}
  throw error;
}finally{try{await deleteApp(app);}catch{}}
