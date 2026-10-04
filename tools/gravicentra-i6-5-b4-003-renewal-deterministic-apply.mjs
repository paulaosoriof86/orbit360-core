import fs from 'node:fs';
import crypto from 'node:crypto';
import { initializeApp, applicationDefault, getApps, deleteApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab';
const TENANT='alianzas-soluciones';
const SOURCE_SHA='1505902788fb6e71d56cb751d64cd721f6d1930d0c90bcfd890c1a129b5041f3';
const RESULT=process.env.B4_003_RENEWAL_APPLY_RESULT||'/tmp/b4-003-renewal-apply-result.json';
const ROLLBACK=process.env.B4_003_RENEWAL_ROLLBACK||'/tmp/b4-003-renewal-rollback.private.json';
const MODE=(process.argv.find(x=>x.startsWith('--mode='))||'--mode=apply').split('=')[1];
const TARGETS=[
  {
    "id": "pol_b9a883095c9fae8f7502ce1cb054",
    "numero": "68542",
    "estado": "Vigente",
    "pais": "CO",
    "vigenciaFin": "2026-10-01",
    "aseguradoraId": "co-chubb"
  },
  {
    "id": "pol_9634d32ec97e4dc93fef8f194677",
    "numero": "1-AP-20890",
    "estado": "Vigente",
    "pais": "GT",
    "vigenciaFin": "2026-10-04",
    "aseguradoraId": "gt-aseguradora-general"
  },
  {
    "id": "pol_8231bbb8f9b7272c02891f5a4caf",
    "numero": "AUTO38446",
    "estado": "Vigente",
    "pais": "GT",
    "vigenciaFin": "2026-10-06",
    "aseguradoraId": "gt-aseguradora-guatemalteca"
  },
  {
    "id": "pol_df6bf097045762297ec31fd4e5c5",
    "numero": "AUTO-1000000334",
    "estado": "Vigente",
    "pais": "GT",
    "vigenciaFin": "2026-10-07",
    "aseguradoraId": "gt-seguros-ficohsa"
  }
];
const PATCH={renovable:true,renewabilityProvenance:'source_report',renewabilitySourceSha256:SOURCE_SHA};
const PATCH_FIELDS=Object.keys(PATCH);
const CONFLICT={
 parent:{id:'pol_965de501d871c56f3964a24b7724',numero:'VA-43685',estado:'Vigente',vigenciaFin:'2026-10-18',renovadaPor:'pol_muj5o5ka',renovacionEstado:'Renovada'},
 child:{id:'pol_muj5o5ka',numero:'prueba',estado:'Vigente',vigenciaInicio:'2026-10-18',vigenciaFin:'2027-10-18',renuevaDe:'pol_965de501d871c56f3964a24b7724'},
 deps:{gestiones:0,recibosEsperados:1,carteraPrimas:1,cobros:0,vehiculos:1,cancelaciones:0}
};
const need=(v,c)=>{if(!v)throw new Error(c);};
const clean=v=>String(v==null?'':v).trim();
const norm=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const policyKey=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]+/g,'');
const stable=v=>{
 if(v===undefined)return {__undefined:true};
 if(v===null||typeof v!=='object')return v;
 if(typeof v.toDate==='function'){try{return {__timestamp:v.toDate().toISOString()};}catch{}}
 if(v?.constructor?.name==='DocumentReference'&&typeof v.path==='string')return {__ref:v.path};
 if(v?.constructor?.name==='GeoPoint')return {__geo:[v.latitude,v.longitude]};
 if(Buffer.isBuffer(v))return {__buffer:v.toString('base64')};
 if(Array.isArray(v))return v.map(stable);
 const o={};for(const k of Object.keys(v).sort())o[k]=stable(v[k]);return o;
};
const sha=v=>crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const renewState=p=>{
 if(!Object.prototype.hasOwnProperty.call(p,'renovable')||p.renovable==null||clean(p.renovable)==='')return'UNKNOWN';
 const v=clean(p.renovable).toLowerCase();
 if(p.renovable===true||['true','si','sí','renovable'].includes(v))return'YES';
 if(p.renovable===false||['false','no','no renovable'].includes(v))return'NO';
 return'UNKNOWN';
};
const active=p=>['vigente','porrenovar'].includes(norm(p.estado))&&!clean(p.renovadaPor)&&norm(p.renovacionEstado)!=='renovada';
const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT});
const db=getFirestore(app);
const tenant=db.collection('tenants').doc(TENANT);
const col=name=>tenant.collection('data').doc(name).collection('items');
const pol=col('polizas');
function stripPatchFields(data){const o={...(data||{})};for(const f of PATCH_FIELDS)delete o[f];return o;}
function fieldSnapshot(data){const o={};for(const f of PATCH_FIELDS)o[f]={exists:Object.prototype.hasOwnProperty.call(data||{},f),value:stable(data&&data[f])};return o;}
function validateTarget(data,t){
 need(data,'B4_003_RENEWAL_TARGET_MISSING:'+t.id);
 need(policyKey(data.numero)===policyKey(t.numero),'B4_003_RENEWAL_TARGET_NUMBER_DRIFT:'+t.id);
 need(norm(data.estado)===norm(t.estado),'B4_003_RENEWAL_TARGET_STATE_DRIFT:'+t.id);
 need(clean(data.pais).toUpperCase()===t.pais,'B4_003_RENEWAL_TARGET_COUNTRY_DRIFT:'+t.id);
 need(clean(data.vigenciaFin)===t.vigenciaFin,'B4_003_RENEWAL_TARGET_END_DRIFT:'+t.id);
 need(clean(data.aseguradoraId)===t.aseguradoraId,'B4_003_RENEWAL_TARGET_INSURER_DRIFT:'+t.id);
 need(active(data),'B4_003_RENEWAL_TARGET_NOT_ACTIVE:'+t.id);
 need(renewState(data)==='UNKNOWN','B4_003_RENEWAL_TARGET_NOT_UNKNOWN:'+t.id);
}
function validateConflict(parent,child){
 need(parent&&policyKey(parent.numero)===policyKey(CONFLICT.parent.numero),'B4_003_CONFLICT_PARENT_NUMBER_DRIFT');
 need(norm(parent.estado)===norm(CONFLICT.parent.estado)&&clean(parent.vigenciaFin)===CONFLICT.parent.vigenciaFin,'B4_003_CONFLICT_PARENT_STATE_DRIFT');
 need(clean(parent.renovadaPor)===CONFLICT.parent.renovadaPor&&norm(parent.renovacionEstado)===norm(CONFLICT.parent.renovacionEstado),'B4_003_CONFLICT_PARENT_LINEAGE_DRIFT');
 need(renewState(parent)==='UNKNOWN','B4_003_CONFLICT_PARENT_RENEWABILITY_CHANGED');
 need(child&&clean(child.numero)===CONFLICT.child.numero&&norm(child.estado)===norm(CONFLICT.child.estado),'B4_003_CONFLICT_CHILD_IDENTITY_DRIFT');
 need(clean(child.vigenciaInicio)===CONFLICT.child.vigenciaInicio&&clean(child.vigenciaFin)===CONFLICT.child.vigenciaFin&&clean(child.renuevaDe)===CONFLICT.child.renuevaDe,'B4_003_CONFLICT_CHILD_LINEAGE_DRIFT');
 need(child.__syntheticQa!==true&&child.previewWrite!==true&&child.importado!==true,'B4_003_CONFLICT_CHILD_CLASSIFICATION_DRIFT');
}
async function depCounts(id){const out={};for(const c of Object.keys(CONFLICT.deps)){const q=await col(c).where('polizaId','==',id).get();out[c]=q.size;}return out;}
function validateDeps(d){for(const [k,v] of Object.entries(CONFLICT.deps))need(Number(d[k]||0)===v,'B4_003_CONFLICT_DEP_DRIFT:'+k);}
async function allPolicies(){const s=await pol.get();return new Map(s.docs.map(d=>[d.id,d.data()||{}]));}
function distribution(map){
 const by={YES:0,NO:0,UNKNOWN:0},eligible=[];const now=new Date();now.setHours(0,0,0,0);
 for(const [id,p] of map){const st=renewState(p);by[st]=(by[st]||0)+1;if(st!=='YES'||!active(p))continue;const raw=clean(p.vigenciaFin);if(!raw)continue;const d=new Date(raw+'T00:00:00');if(!Number.isFinite(d.getTime()))continue;const days=Math.ceil((d-now)/86400000);if(days<=90)eligible.push(id);}
 return{by,eligible:eligible.sort()};
}
function unrelatedDigest(map){const skip=new Set(TARGETS.map(x=>x.id));return sha([...map].filter(([id])=>!skip.has(id)).map(([id,v])=>[id,v]).sort((a,b)=>a[0].localeCompare(b[0])));}
async function rollbackExact(rb){
 await db.runTransaction(async tx=>{
  for(const row of rb.targets){const s=await tx.get(pol.doc(row.id));need(s.exists,'B4_003_ROLLBACK_TARGET_MISSING:'+row.id);}
  for(const row of rb.targets){const patch={};for(const f of PATCH_FIELDS){const x=row.fields[f];patch[f]=x.exists?x.rawValue:FieldValue.delete();}tx.update(pol.doc(row.id),patch);}
 });
 const after=await allPolicies();
 for(const row of rb.targets){const p=after.get(row.id)||{};need(sha(stripPatchFields(p))===row.strippedHash,'B4_003_ROLLBACK_UNRELATED_FIELD_DRIFT:'+row.id);for(const f of PATCH_FIELDS){const x=row.fields[f],exists=Object.prototype.hasOwnProperty.call(p,f);need(exists===x.exists,'B4_003_ROLLBACK_FIELD_EXISTENCE_DRIFT:'+row.id+':'+f);if(x.exists)need(JSON.stringify(stable(p[f]))===JSON.stringify(stable(x.rawValue)),'B4_003_ROLLBACK_FIELD_VALUE_DRIFT:'+row.id+':'+f);}}
 return true;
}
const result={schema:'GRAVICENTRA_I6_5_B4_003_R13_RENEWAL_DETERMINISTIC_APPLY_RESULT_V1',recordedAt:new Date().toISOString(),status:'INIT',mode:MODE,projectId:PROJECT,tenantId:TENANT,sourceSha256:SOURCE_SHA,writes:0,rollbackExecuted:false,rollbackStatus:'NOT_NEEDED',targetIds:TARGETS.map(x=>x.id),conflictHold:{policyNumber:'VA-43685',parentId:CONFLICT.parent.id,childId:CONFLICT.child.id,writeAuthorized:false,deleteAuthorized:false},before:{},after:{},integrity:{},errors:[]};
let rollbackData=null,committed=false;
try{
 if(MODE==='rollback'){
  need(fs.existsSync(ROLLBACK),'B4_003_ROLLBACK_FILE_MISSING');rollbackData=JSON.parse(fs.readFileSync(ROLLBACK,'utf8'));need(rollbackData.schema==='GRAVICENTRA_I6_5_B4_003_R13_RENEWAL_ROLLBACK_V1','B4_003_ROLLBACK_SCHEMA_INVALID');
  await rollbackExact(rollbackData);Object.assign(result,{status:'ROLLBACK_PASS',rollbackExecuted:true,rollbackStatus:'PASS'});fs.writeFileSync(RESULT,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));process.exit(0);
 }
 need(MODE==='apply','B4_003_RENEWAL_APPLY_MODE_INVALID');
 const beforeMap=await allPolicies();need(beforeMap.size===1419,'B4_003_POLICY_COUNT_DRIFT_BEFORE:'+beforeMap.size);
 const distBefore=distribution(beforeMap);need(distBefore.by.YES===0&&distBefore.by.NO===0&&distBefore.by.UNKNOWN===1419,'B4_003_RENEWABILITY_DISTRIBUTION_DRIFT_BEFORE:'+JSON.stringify(distBefore.by));
 const parentBefore=beforeMap.get(CONFLICT.parent.id),childBefore=beforeMap.get(CONFLICT.child.id);validateConflict(parentBefore,childBefore);
 const depsBefore=await depCounts(CONFLICT.child.id);validateDeps(depsBefore);
 const beforeTargetRows=[],rawBefore=new Map();
 for(const t of TARGETS){const d=beforeMap.get(t.id);validateTarget(d,t);rawBefore.set(t.id,d);beforeTargetRows.push({id:t.id,numero:d.numero||'',estado:d.estado||'',pais:d.pais||'',vigenciaFin:d.vigenciaFin||'',aseguradoraId:d.aseguradoraId||'',renewabilityState:renewState(d),fields:fieldSnapshot(d),strippedHash:sha(stripPatchFields(d))});}
 rollbackData={schema:'GRAVICENTRA_I6_5_B4_003_R13_RENEWAL_ROLLBACK_V1',createdAt:new Date().toISOString(),sourceSha256:SOURCE_SHA,targets:beforeTargetRows.map(r=>({id:r.id,strippedHash:r.strippedHash,fields:Object.fromEntries(PATCH_FIELDS.map(f=>[f,{exists:Object.prototype.hasOwnProperty.call(rawBefore.get(r.id),f),rawValue:Object.prototype.hasOwnProperty.call(rawBefore.get(r.id),f)?rawBefore.get(r.id)[f]:null}]))}))};
 fs.writeFileSync(ROLLBACK,JSON.stringify(rollbackData,null,2)+'\n');
 result.before={policyCount:beforeMap.size,distribution:distBefore,targets:beforeTargetRows,unrelatedDigest:unrelatedDigest(beforeMap),conflict:{parentHash:sha(parentBefore),childHash:sha(childBefore),dependents:depsBefore}};
 await db.runTransaction(async tx=>{
  const snaps=[];for(const t of TARGETS)snaps.push(await tx.get(pol.doc(t.id)));const pSnap=await tx.get(pol.doc(CONFLICT.parent.id)),cSnap=await tx.get(pol.doc(CONFLICT.child.id));
  for(let i=0;i<TARGETS.length;i++){need(snaps[i].exists,'B4_003_TX_TARGET_MISSING:'+TARGETS[i].id);validateTarget(snaps[i].data()||{},TARGETS[i]);}
  validateConflict(pSnap.exists?pSnap.data()||{}:null,cSnap.exists?cSnap.data()||{}:null);
  for(const t of TARGETS)tx.update(pol.doc(t.id),PATCH);
 });
 committed=true;result.writes=4;
 const afterMap=await allPolicies();need(afterMap.size===1419,'B4_003_POLICY_COUNT_DRIFT_AFTER:'+afterMap.size);
 const distAfter=distribution(afterMap);need(distAfter.by.YES===4&&distAfter.by.NO===0&&distAfter.by.UNKNOWN===1415,'B4_003_RENEWABILITY_DISTRIBUTION_INVALID_AFTER:'+JSON.stringify(distAfter.by));
 need(JSON.stringify(distAfter.eligible)===JSON.stringify(TARGETS.map(x=>x.id).sort()),'B4_003_RENEWAL_ELIGIBLE_SET_INVALID_AFTER:'+JSON.stringify(distAfter.eligible));
 need(unrelatedDigest(afterMap)===result.before.unrelatedDigest,'B4_003_UNRELATED_POLICY_DIGEST_CHANGED');
 const afterTargetRows=[];
 for(const t of TARGETS){const d=afterMap.get(t.id)||{};need(d.renovable===true&&d.renewabilityProvenance==='source_report'&&d.renewabilitySourceSha256===SOURCE_SHA,'B4_003_TARGET_PATCH_READBACK_FAILED:'+t.id);need(sha(stripPatchFields(d))===beforeTargetRows.find(x=>x.id===t.id).strippedHash,'B4_003_TARGET_UNRELATED_FIELD_CHANGED:'+t.id);afterTargetRows.push({id:t.id,numero:d.numero||'',renewabilityState:renewState(d),renovable:d.renovable,renewabilityProvenance:d.renewabilityProvenance,renewabilitySourceSha256:d.renewabilitySourceSha256});}
 const parentAfter=afterMap.get(CONFLICT.parent.id),childAfter=afterMap.get(CONFLICT.child.id);validateConflict(parentAfter,childAfter);const depsAfter=await depCounts(CONFLICT.child.id);validateDeps(depsAfter);
 need(sha(parentAfter)===result.before.conflict.parentHash&&sha(childAfter)===result.before.conflict.childHash,'B4_003_CONFLICT_LINEAGE_MUTATED');
 result.after={policyCount:afterMap.size,distribution:distAfter,targets:afterTargetRows,unrelatedDigest:unrelatedDigest(afterMap),conflict:{parentHash:sha(parentAfter),childHash:sha(childAfter),dependents:depsAfter}};
 result.integrity={exactWrites:4,onlyAllowedFieldsChanged:true,unrelatedPoliciesUnchanged:true,conflictParentUnchanged:true,conflictChildUnchanged:true,conflictDependentsUnchanged:true,eligibleSetExact:true,noDeletes:true,noInserts:true};
 result.status='PASS';fs.writeFileSync(RESULT,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}catch(error){
 result.errors.push(String(error&&error.stack||error));
 if(committed&&rollbackData){try{await rollbackExact(rollbackData);result.rollbackExecuted=true;result.rollbackStatus='PASS';}catch(rb){result.rollbackExecuted=true;result.rollbackStatus='FAIL';result.errors.push('ROLLBACK:'+String(rb&&rb.stack||rb));}}
 result.status=result.rollbackExecuted&&result.rollbackStatus==='PASS'?'FAIL_ROLLED_BACK':'FAIL';fs.writeFileSync(RESULT,JSON.stringify(result,null,2)+'\n');console.error(JSON.stringify(result,null,2));process.exitCode=1;
}finally{try{await deleteApp(app);}catch{}}
