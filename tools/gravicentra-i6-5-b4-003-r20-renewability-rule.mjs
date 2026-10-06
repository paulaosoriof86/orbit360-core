import fs from 'node:fs';
import crypto from 'node:crypto';
import { initializeApp, applicationDefault, getApps, deleteApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab';
const TENANT='alianzas-soluciones';
const RULE_ID='PAULA_R20_RENEWABILITY_RULE_20261006';
const RESULT=process.env.R20_RENEWABILITY_RESULT||'/tmp/r20-renewability-result.json';
const ROLLBACK=process.env.R20_RENEWABILITY_ROLLBACK||'/tmp/r20-renewability-rollback.private.json';
const AUTH=process.env.R20_RENEWABILITY_AUTH||'';
const MODE=(process.argv.find(x=>x.startsWith('--mode='))||'--mode=dry-run').split('=')[1];
const KNOWN_NONBUSINESS_HOLDS=new Map([
 ['pol_mulsmxsk','B2_QA_RESIDUE'],
 ['pol_mulssmuz','B2_QA_RESIDUE'],
 ['pol_mulsxofx','B2_QA_RESIDUE'],
 ['pol_muj5o5ka','R13_QA_CONFLICT_CHILD']
]);
const PATCH_FIELDS=['renovable','renewabilityProvenance','renewabilityRuleId','renewabilityRuleVersion'];
const need=(v,c)=>{if(!v)throw new Error(c);};
const clean=v=>String(v==null?'':v).trim();
const words=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
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
const parseIso=v=>{const m=clean(v).match(/^(\d{4})-(\d{2})-(\d{2})/);if(!m)return null;const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));return Number.isFinite(d.getTime())?d:null;};
const iso=d=>d?d.toISOString().slice(0,10):'';
const oneYearAnniversary=start=>{
 const d=parseIso(start);if(!d)return '';
 const y=d.getUTCFullYear()+1,m=d.getUTCMonth(),day=d.getUTCDate();
 if(m===1&&day===29){const leap=new Date(Date.UTC(y,1,29));if(leap.getUTCMonth()===1)return iso(leap);return iso(new Date(Date.UTC(y,1,28)));}
 return iso(new Date(Date.UTC(y,m,day)));
};
const isAnnual=(a,b)=>{const expected=oneYearAnniversary(a),end=iso(parseIso(b));return !!expected&&!!end&&expected===end;};
const renewState=p=>{
 if(!Object.prototype.hasOwnProperty.call(p||{},'renovable')||p.renovable==null||clean(p.renovable)==='')return'UNKNOWN';
 const v=words(p.renovable);
 if(p.renovable===true||['true','si','renovable'].includes(v))return'YES';
 if(p.renovable===false||['false','no','no renovable'].includes(v))return'NO';
 return'UNKNOWN';
};
const taxonomyValues=p=>['ramo','producto','subramo','linea','tipoRiesgo','tipoSeguro','familiaProducto'].map(k=>words(p&&p[k])).filter(Boolean);
const isTransport=p=>taxonomyValues(p).some(v=>{const parts=v.split(/\s+/);return parts.includes('transporte')||parts.includes('transportes');});
const isPersonalAccident=p=>{const numero=clean(p&&p.numero).toUpperCase(),ramo=words(p&&p.ramo),producto=words(p&&(p.producto||p.subramo));return /^1-AP-/.test(numero)&&ramo==='accidentes y enfermedades'&&producto.startsWith('accidentes');};
const clientName=c=>clean(c&&(c.nombre||c.name||c.displayName||c.razonSocial));
const isExplicitSynthetic=(id,p)=>KNOWN_NONBUSINESS_HOLDS.has(id)||p?.__syntheticQa===true||p?.previewWrite===true||/^b4003qa[_:-]/i.test(id)||/^b3004qa[_:-]/i.test(id);
const patchFor=proposed=>({renovable:proposed,renewabilityProvenance:'paula_authorized_business_rule',renewabilityRuleId:RULE_ID,renewabilityRuleVersion:1});
const fieldSnapshot=(p)=>Object.fromEntries(PATCH_FIELDS.map(k=>[k,{exists:Object.prototype.hasOwnProperty.call(p||{},k),value:stable(p&&p[k])}]));
const stripPatchFields=p=>{const out={...(p||{})};PATCH_FIELDS.forEach(k=>delete out[k]);return out;};
const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT});
const db=getFirestore(app);
const tenant=db.collection('tenants').doc(TENANT);
const col=name=>tenant.collection('data').doc(name).collection('items');
const policiesRef=col('polizas');
const clientsRef=col('clientes');

async function readUniverse(){
 const [ps,cs]=await Promise.all([policiesRef.get(),clientsRef.get()]);
 const policies=new Map(ps.docs.map(d=>[d.id,d.data()||{}]));
 const clients=new Map(cs.docs.map(d=>[d.id,d.data()||{}]));
 return {policies,clients};
}
function classify(universe){
 const {policies,clients}=universe;
 const exactValdemar=[...clients].filter(([,c])=>words(clientName(c))==='edvin waldemar barrios sales').map(([id,c])=>({id,name:clientName(c)}));
 const discovery=[...clients].filter(([,c])=>{const n=words(clientName(c));return n.includes('valdemar')||n.includes('barrios');}).map(([id,c])=>({id,name:clientName(c)})).slice(0,30);
 const conflicts=[];
 if(exactValdemar.length!==1)conflicts.push({code:'VALDEMAR_CANONICAL_ID_CARDINALITY',expectedCanonicalName:'EDVIN WALDEMAR BARRIOS SALES',count:exactValdemar.length,exactMatches:exactValdemar,discoveryCandidates:discovery});
 const valdemarId=exactValdemar.length===1?exactValdemar[0].id:'';
 const rows=[],targets=[],holds=[],transportIds=[],valdemarApIds=[],valdemarShortApIds=[],valdemarAnnualApIds=[];
 for(const [id,p] of [...policies].sort((a,b)=>a[0].localeCompare(b[0]))){
  const base={id,numero:clean(p.numero),clienteId:clean(p.clienteId),ramo:clean(p.ramo),producto:clean(p.producto||p.subramo),vigenciaInicio:clean(p.vigenciaInicio),vigenciaFin:clean(p.vigenciaFin),currentState:renewState(p),currentRaw:stable(p.renovable)};
  if(isExplicitSynthetic(id,p)){
   const reason=KNOWN_NONBUSINESS_HOLDS.get(id)||'SYNTHETIC_QA_MARKER';
   const row={...base,disposition:'HOLD_NONBUSINESS',reason,proposed:null,needsWrite:false};
   rows.push(row);holds.push(row);continue;
  }
  const transport=isTransport(p);
  const valdemarAp=!!valdemarId&&clean(p.clienteId)===valdemarId&&isPersonalAccident(p);
  let proposed=true,reason='DEFAULT_RENEWABLE_BY_PAULA_R20';
  if(transport){proposed=false;reason='EXCEPTION_TRANSPORTE';transportIds.push(id);}
  else if(valdemarAp){
   valdemarApIds.push(id);
   const start=clean(p.vigenciaInicio),end=clean(p.vigenciaFin);
   if(!parseIso(start)||!parseIso(end)){
    const row={...base,disposition:'CONFLICT_HOLD',reason:'VALDEMAR_AP_MISSING_OR_INVALID_VIGENCIA',proposed:null,needsWrite:false};
    rows.push(row);conflicts.push({code:'VALDEMAR_AP_VIGENCIA_INVALID',id,numero:base.numero,vigenciaInicio:start,vigenciaFin:end});continue;
   }
   if(isAnnual(start,end)){proposed=true;reason='VALDEMAR_AP_ANNUAL_RENEWABLE';valdemarAnnualApIds.push(id);}
   else {proposed=false;reason='EXCEPTION_VALDEMAR_AP_SHORT_TERM';valdemarShortApIds.push(id);}
  }
  const patch=patchFor(proposed);
  const needsWrite=p.renovable!==proposed||clean(p.renewabilityProvenance)!==patch.renewabilityProvenance||clean(p.renewabilityRuleId)!==RULE_ID||Number(p.renewabilityRuleVersion)!==1;
  const row={...base,disposition:'CLASSIFIED',reason,proposed,needsWrite,patch,fieldsBefore:fieldSnapshot(p),strippedHash:sha(stripPatchFields(p))};
  rows.push(row);if(needsWrite)targets.push(row);
 }
 if(valdemarId&&valdemarApIds.length===0)conflicts.push({code:'VALDEMAR_AP_EXCEPTION_SET_EMPTY',valdemarClientId:valdemarId});
 if(transportIds.length===0)conflicts.push({code:'TRANSPORT_EXCEPTION_SET_EMPTY'});
 return {exactValdemar,discovery,valdemarId,rows,targets,holds,conflicts,transportIds,valdemarApIds,valdemarShortApIds,valdemarAnnualApIds};
}
function summary(universe,c){
 const current={YES:0,NO:0,UNKNOWN:0};for(const [,p] of universe.policies){const s=renewState(p);current[s]=(current[s]||0)+1;}
 const proposed={YES:0,NO:0,HOLD:c.holds.length,CONFLICT:c.conflicts.filter(x=>x.id).length};
 c.rows.forEach(r=>{if(r.proposed===true)proposed.YES++;else if(r.proposed===false)proposed.NO++;});
 return {
  policyCount:universe.policies.size,clientCount:universe.clients.size,currentDistribution:current,proposedDistribution:proposed,
  targetWriteCount:c.targets.length,holdCount:c.holds.length,conflictCount:c.conflicts.length,
  transportExceptionCount:c.transportIds.length,valdemarApCount:c.valdemarApIds.length,valdemarShortApExceptionCount:c.valdemarShortApIds.length,valdemarAnnualApRenewableCount:c.valdemarAnnualApIds.length
 };
}
function digests(universe,c){
 return {
  policyUniverseDigest:sha([...universe.policies].sort((a,b)=>a[0].localeCompare(b[0]))),
  clientUniverseDigest:sha([...universe.clients].sort((a,b)=>a[0].localeCompare(b[0]))),
  targetDigest:sha(c.targets.map(r=>({id:r.id,proposed:r.proposed,reason:r.reason,patch:r.patch,fieldsBefore:r.fieldsBefore,strippedHash:r.strippedHash}))),
  holdDigest:sha(c.holds.map(r=>({id:r.id,reason:r.reason}))),
  exceptionDigest:sha({transportIds:c.transportIds.slice().sort(),valdemarApIds:c.valdemarApIds.slice().sort(),valdemarShortApIds:c.valdemarShortApIds.slice().sort(),valdemarAnnualApIds:c.valdemarAnnualApIds.slice().sort()})
 };
}
async function rollbackExact(data){
 const rows=[].concat(data&&data.targets||[]);
 for(let i=0;i<rows.length;i+=250){
  const chunk=rows.slice(i,i+250);
  await db.runTransaction(async tx=>{
   const snaps=[];for(const r of chunk)snaps.push(await tx.get(policiesRef.doc(r.id)));
   snaps.forEach((s,j)=>need(s.exists,'R20_ROLLBACK_TARGET_MISSING:'+chunk[j].id));
   chunk.forEach(r=>{const patch={};PATCH_FIELDS.forEach(k=>{const x=r.fieldsBefore[k];patch[k]=x&&x.exists?x.rawValue:FieldValue.delete();});tx.update(policiesRef.doc(r.id),patch);});
  });
 }
}
function rollbackPayload(c,dig){
 return {schema:'GRAVICENTRA_R20_RENEWABILITY_ROLLBACK_V1',ruleId:RULE_ID,createdAt:new Date().toISOString(),targetDigest:dig.targetDigest,targets:c.targets.map(r=>({id:r.id,strippedHash:r.strippedHash,fieldsBefore:Object.fromEntries(PATCH_FIELDS.map(k=>[k,{exists:r.fieldsBefore[k].exists,rawValue:r.fieldsBefore[k].exists?r.fieldsBefore[k].value:null}]))}))};
}

const result={schema:'GRAVICENTRA_I6_5_B4_003_R20_RENEWABILITY_RULE_RESULT_V1',recordedAt:new Date().toISOString(),mode:MODE,status:'INIT',projectId:PROJECT,tenantId:TENANT,ruleId:RULE_ID,writes:0,rollbackExecuted:false,rollbackStatus:'NOT_NEEDED',noReimport:true,livePromotion:false,errors:[]};
let rollbackData=null,committed=false;
try{
 if(MODE==='rollback'){
  need(fs.existsSync(ROLLBACK),'R20_ROLLBACK_FILE_MISSING');
  rollbackData=JSON.parse(fs.readFileSync(ROLLBACK,'utf8'));
  need(rollbackData.schema==='GRAVICENTRA_R20_RENEWABILITY_ROLLBACK_V1'&&rollbackData.ruleId===RULE_ID,'R20_ROLLBACK_AUTH_INVALID');
  await rollbackExact(rollbackData);Object.assign(result,{status:'ROLLBACK_PASS',rollbackExecuted:true,rollbackStatus:'PASS'});fs.writeFileSync(RESULT,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));process.exit(0);
 }
 const universe=await readUniverse();need(universe.policies.size>0,'R20_POLICY_UNIVERSE_EMPTY');need(universe.clients.size>0,'R20_CLIENT_UNIVERSE_EMPTY');
 const c=classify(universe),sum=summary(universe,c),dig=digests(universe,c);
 Object.assign(result,{summary:sum,digests:dig,valdemar:{canonicalClientId:c.valdemarId,exactMatches:c.exactValdemar,discoveryCandidates:c.discovery},exceptions:{transportIds:c.transportIds,valdemarApIds:c.valdemarApIds,valdemarShortApIds:c.valdemarShortApIds,valdemarAnnualApIds:c.valdemarAnnualApIds},holds:c.holds.map(r=>({id:r.id,numero:r.numero,reason:r.reason})),conflicts:c.conflicts,targets:c.targets.map(r=>({id:r.id,numero:r.numero,clienteId:r.clienteId,ramo:r.ramo,producto:r.producto,vigenciaInicio:r.vigenciaInicio,vigenciaFin:r.vigenciaFin,currentState:r.currentState,currentRaw:r.currentRaw,proposed:r.proposed,reason:r.reason,patch:r.patch,fieldsBefore:r.fieldsBefore,strippedHash:r.strippedHash}))});
 if(MODE==='dry-run'){
  result.status=c.conflicts.length?'FAIL_CLOSED_CONFLICT':'PASS_DRY_RUN';
  fs.writeFileSync(RESULT,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,summary:sum,digests:dig,valdemar:result.valdemar,exceptions:{transport:c.transportIds.length,valdemarShortAp:c.valdemarShortApIds.length,valdemarAnnualAp:c.valdemarAnnualApIds.length},conflictCount:c.conflicts.length,targetWriteCount:c.targets.length},null,2));
  if(c.conflicts.length)process.exitCode=2;
 } else if(MODE==='apply'){
  need(AUTH&&fs.existsSync(AUTH),'R20_APPLY_AUTH_RECEIPT_MISSING');
  const a=JSON.parse(fs.readFileSync(AUTH,'utf8'));
  need(a.schema==='GRAVICENTRA_I6_5_B4_003_R20_RENEWABILITY_APPLY_AUTH_V1'&&a.status==='AUTHORIZED_PENDING_APPLY'&&a.ruleId===RULE_ID,'R20_APPLY_AUTH_INVALID');
  need(c.conflicts.length===0,'R20_APPLY_CONFLICTS_PRESENT');
  need(a.policyUniverseDigest===dig.policyUniverseDigest&&a.clientUniverseDigest===dig.clientUniverseDigest&&a.targetDigest===dig.targetDigest&&a.exceptionDigest===dig.exceptionDigest,'R20_APPLY_UNIVERSE_OR_TARGET_DRIFT');
  need(Number(a.maxWrites)===c.targets.length,'R20_APPLY_WRITE_COUNT_DRIFT');
  need(clean(a.exactTargetIdsAuthority).length>0,'R20_APPLY_TARGET_AUTHORITY_MISSING');
  rollbackData=rollbackPayload(c,dig);
  for(const row of rollbackData.targets){const original=universe.policies.get(row.id)||{};PATCH_FIELDS.forEach(k=>{row.fieldsBefore[k].rawValue=Object.prototype.hasOwnProperty.call(original,k)?original[k]:null;});}
  fs.writeFileSync(ROLLBACK,JSON.stringify(rollbackData,null,2)+'\n');
  for(let i=0;i<c.targets.length;i+=250){
   const chunk=c.targets.slice(i,i+250);
   await db.runTransaction(async tx=>{
    const snaps=[];for(const row of chunk)snaps.push(await tx.get(policiesRef.doc(row.id)));
    for(let j=0;j<chunk.length;j++){need(snaps[j].exists,'R20_APPLY_TARGET_MISSING:'+chunk[j].id);const current=snaps[j].data()||{};need(sha(stripPatchFields(current))===chunk[j].strippedHash,'R20_APPLY_UNRELATED_FIELD_DRIFT_BEFORE:'+chunk[j].id);}
    chunk.forEach(row=>tx.update(policiesRef.doc(row.id),row.patch));
   });
   committed=true;result.writes+=chunk.length;
  }
  const after=await readUniverse(),afterClass=classify(after),afterDig=digests(after,afterClass);
  need(afterClass.conflicts.length===0,'R20_APPLY_READBACK_CONFLICT');
  need(afterClass.targets.length===0,'R20_APPLY_READBACK_STILL_DIRTY:'+afterClass.targets.length);
  for(const row of c.targets){const p=after.policies.get(row.id)||{};need(p.renovable===row.proposed&&clean(p.renewabilityRuleId)===RULE_ID&&Number(p.renewabilityRuleVersion)===1,'R20_APPLY_READBACK_FAILED:'+row.id);need(sha(stripPatchFields(p))===row.strippedHash,'R20_APPLY_UNRELATED_FIELD_CHANGED:'+row.id);}
  result.after={summary:summary(after,afterClass),digests:afterDig};
  result.integrity={exactTargetCount:c.targets.length,exactWrites:result.writes,allTargetsReadBack:true,allTargetsClean:true,onlyRenewabilityFieldsChanged:true,noInserts:true,noDeletes:true,noReimport:true};
  result.status='PASS_APPLY';fs.writeFileSync(RESULT,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,writes:result.writes,summary:result.after.summary,integrity:result.integrity},null,2));
 } else throw new Error('R20_MODE_INVALID:'+MODE);
}catch(error){
 result.errors.push(String(error&&error.stack||error));
 if(committed&&rollbackData){try{await rollbackExact(rollbackData);result.rollbackExecuted=true;result.rollbackStatus='PASS';}catch(rb){result.rollbackExecuted=true;result.rollbackStatus='FAIL';result.errors.push('ROLLBACK:'+String(rb&&rb.stack||rb));}}
 result.status=result.rollbackExecuted&&result.rollbackStatus==='PASS'?'FAIL_ROLLED_BACK':'FAIL';
 try{fs.writeFileSync(RESULT,JSON.stringify(result,null,2)+'\n');}catch{}
 console.error(JSON.stringify({status:result.status,writes:result.writes,rollbackStatus:result.rollbackStatus,errors:result.errors},null,2));process.exitCode=1;
}finally{try{await deleteApp(app);}catch{}}
