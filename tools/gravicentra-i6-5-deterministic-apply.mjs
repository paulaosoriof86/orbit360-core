import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore, Timestamp, GeoPoint } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab', TENANT='alianzas-soluciones';
const CONTROL=process.env.CONTROL||'artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';
const SOURCE=process.env.I65_SOURCE_INTAKE||'artifacts/orbit360-recovery/release-control/I6_5_RECIBOS_CARTERA_SOURCE_INTAKE_20260918.json';
const DIFF=process.env.I65_DIFF||'artifacts/orbit360-recovery/release-control/I6_5_DETERMINISTIC_DIFF_20260918.json';
const ENC=process.env.I65_APPLY_ENCRYPTED||'artifacts/orbit360-recovery/release-control/I6_5_DETERMINISTIC_APPLY_PAYLOAD_20260918.enc.json';
const RESULT=process.env.I65_APPLY_RESULT_FILE||path.join(process.env.RUNNER_TEMP||process.cwd(),'i65-apply-result.json');
const EXACT_ROLLBACK=process.env.I65_EXACT_ROLLBACK_FILE||path.join(process.env.RUNNER_TEMP||process.cwd(),'i65-exact-rollback.private.json');
const MODE=(process.argv.find(x=>x.startsWith('--mode='))||'--mode=apply').split('=')[1];
const EXPECTED_DIFF_SHA='c1cf6d0c62d4dd30bfa80c70abfa7a8751e58630c2ffcc3484e5544d76e55749';
const EXPECTED_ENVELOPE_SHA='8e11afa187742ed9d5301ca2074467c27346f3fd486e903686735439eb6702da';
const EXPECTED_PLAIN_SHA='44f642b4f9390ef686b84564362af94f533bc52d70e871f93f76e18e7b1738ff';
const EXPECTED_PUBLIC_SHA='342371840986ee008bdef3ee9523fe9e52509d12a654ac1d4c0fa6b3cb781579';
const EXPECTED_WRITES=2227;
const BASE={polizas:1414,clientes:442,aseguradoras:31,vehiculos:1063,recibosEsperados:1294,carteraPrimas:673,cobros:5,finmovs:0,renovaciones:0};
const TARGET={...BASE,recibosEsperados:1842,carteraPrimas:1283};
const ALLOWED=new Set(['recibosEsperados','carteraPrimas']);
const FORBIDDEN=['polizas','clientes','aseguradoras','vehiculos','cobros','finmovs','renovaciones'];

const sha=v=>crypto.createHash('sha256').update(Buffer.isBuffer(v)?v:Buffer.from(String(v??''),'utf8')).digest('hex');
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const stable=v=>{
  if(v===undefined)return null;
  if(v===null||typeof v!=='object')return v;
  if(typeof v.toDate==='function'){try{return v.toDate().toISOString();}catch{}}
  if(v?.constructor?.name==='DocumentReference'&&typeof v.path==='string')return {__ref:v.path};
  if(v?.constructor?.name==='GeoPoint')return {__geo:[v.latitude,v.longitude]};
  if(Buffer.isBuffer(v))return {__bytes:v.toString('base64')};
  if(Array.isArray(v))return v.map(stable);
  const o={}; for(const k of Object.keys(v).sort())o[k]=stable(v[k]); return o;
};
const docHash=v=>sha(JSON.stringify(stable(v)));
const collDigest=map=>sha([...map.entries()].map(([id,v])=>id+'|'+docHash(v)).sort().join('\n'));
const encodeTyped=v=>{
  if(v===null||typeof v!=='object')return v;
  if(typeof v.toDate==='function'&&typeof v.seconds==='number')return {__i65type:'timestamp',seconds:v.seconds,nanoseconds:v.nanoseconds||0};
  if(v?.constructor?.name==='DocumentReference'&&typeof v.path==='string')return {__i65type:'reference',path:v.path};
  if(v?.constructor?.name==='GeoPoint')return {__i65type:'geopoint',latitude:v.latitude,longitude:v.longitude};
  if(Buffer.isBuffer(v))return {__i65type:'buffer',base64:v.toString('base64')};
  if(Array.isArray(v))return v.map(encodeTyped);
  const o={}; for(const [k,x] of Object.entries(v))o[k]=encodeTyped(x); return o;
};
const decodeTyped=(v,db)=>{
  if(v===null||typeof v!=='object')return v;
  if(v.__i65type==='timestamp')return new Timestamp(Number(v.seconds),Number(v.nanoseconds||0));
  if(v.__i65type==='reference')return db.doc(String(v.path));
  if(v.__i65type==='geopoint')return new GeoPoint(Number(v.latitude),Number(v.longitude));
  if(v.__i65type==='buffer')return Buffer.from(String(v.base64),'base64');
  if(Array.isArray(v))return v.map(x=>decodeTyped(x,db));
  const o={}; for(const [k,x] of Object.entries(v))o[k]=decodeTyped(x,db); return o;
};
function serviceAccount(){
  for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){
    try{const x=JSON.parse(process.env[k]||''); if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}
  }
  throw new Error('I65_APPLY_SERVICE_ACCOUNT_NOT_AVAILABLE');
}
function canonicalCol(db,name){return db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items');}
function legacyCol(db,name){return db.collection('tenantId').doc(TENANT).collection(name);}
async function readMap(db,name,legacy=false){const s=await (legacy?legacyCol(db,name):canonicalCol(db,name)).get(); return new Map(s.docs.map(d=>[d.id,d.data()||{}]));}
async function readAll(db,names,legacy=false){const out={}; for(const n of names)out[n]=await readMap(db,n,legacy); return out;}
function derivePublicPem(privateKey){return crypto.createPublicKey(privateKey).export({type:'spki',format:'pem'}).toString();}
function decryptPayload(sa,C){
  const bytes=fs.readFileSync(ENC), E=JSON.parse(bytes.toString('utf8'));
  need(sha(bytes)===EXPECTED_ENVELOPE_SHA&&sha(bytes)===C.i65ApplyPayload?.encryptedPayloadSha256,'I65_APPLY_ENVELOPE_SHA_INVALID');
  need(E.schema==='GRAVICENTRA_I6_5_DETERMINISTIC_APPLY_ENVELOPE_V1'&&E.encrypted===true,'I65_APPLY_ENVELOPE_INVALID');
  need(E.alg==='RSA-OAEP-SHA256+A256GCM'&&E.compression==='gzip'&&E.aad==='GRAVICENTRA_I6_5_APPLY_V1','I65_APPLY_CRYPTO_CONTRACT_INVALID');
  need(E.plaintextSha256===EXPECTED_PLAIN_SHA&&E.plaintextSha256===C.i65ApplyPayload?.privatePayloadPlaintextSha256,'I65_APPLY_PLAINTEXT_BINDING_INVALID');
  const pub=derivePublicPem(sa.private_key); need(sha(pub)===EXPECTED_PUBLIC_SHA&&sha(pub)===E.publicKeySha256&&sha(pub)===C.i65ApplyPayload?.publicKeySha256,'I65_APPLY_PUBLIC_KEY_DRIFT');
  const aes=crypto.privateDecrypt({key:sa.private_key,padding:crypto.constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(E.encryptedKey,'base64'));
  need(aes.length===32,'I65_APPLY_AES_KEY_INVALID');
  const all=Buffer.from(E.ciphertext,'base64'); need(all.length>16,'I65_APPLY_CIPHERTEXT_INVALID');
  const ct=all.subarray(0,all.length-16), tag=all.subarray(all.length-16);
  const dec=crypto.createDecipheriv('aes-256-gcm',aes,Buffer.from(E.nonce,'base64')); dec.setAAD(Buffer.from(E.aad,'utf8')); dec.setAuthTag(tag);
  const gz=Buffer.concat([dec.update(ct),dec.final()]); need(sha(gz)===E.compressedSha256,'I65_APPLY_COMPRESSED_SHA_INVALID');
  const plain=zlib.gunzipSync(gz); need(sha(plain)===E.plaintextSha256,'I65_APPLY_PLAINTEXT_SHA_INVALID');
  return JSON.parse(plain.toString('utf8'));
}
function validatePayload(P,C,S,D){
  need(P.schema==='GRAVICENTRA_I6_5_DETERMINISTIC_APPLY_PAYLOAD_V1'&&P.tenantId===TENANT,'I65_APPLY_PAYLOAD_SCHEMA_INVALID');
  need(P.sourceBundleSha256===S.sourceBundle?.sha256&&P.sourceBundleSha256===D.sourceBundleSha256,'I65_APPLY_SOURCE_SHA_INVALID');
  need(P.baselineSnapshotPlaintextSha256===D.baselineSnapshot?.plaintextSha256,'I65_APPLY_BASELINE_SHA_INVALID');
  need(JSON.stringify(P.baselineCounts)===JSON.stringify(D.baselineSnapshot?.counts),'I65_APPLY_BASELINE_COUNTS_INVALID');
  need(JSON.stringify(P.targetCounts)===JSON.stringify(D.targetCounts),'I65_APPLY_TARGET_COUNTS_INVALID');
  need(Array.isArray(P.allowedCollections)&&P.allowedCollections.length===2&&P.allowedCollections.every(x=>ALLOWED.has(x)),'I65_APPLY_ALLOWED_COLLECTIONS_INVALID');
  need(FORBIDDEN.every(x=>(P.forbiddenCollections||[]).includes(x)),'I65_APPLY_FORBIDDEN_COLLECTIONS_INVALID');
  need(Array.isArray(P.operations)&&P.operations.length===EXPECTED_WRITES,'I65_APPLY_OPERATION_COUNT_INVALID');
  need(Number(P.receiptDeletes||0)===0&&Number(P.portfolioDeletes||0)===24,'I65_APPLY_DELETE_CONTRACT_INVALID');
  need((P.rollback?.restore||[]).length===1045&&(P.rollback?.deleteInserted||[]).length===1182,'I65_APPLY_ROLLBACK_CONTRACT_INVALID');
  need((P.holds||[]).length===36,'I65_APPLY_HOLD_COUNT_INVALID');
  need(C.i65DeterministicDiff?.sha256===EXPECTED_DIFF_SHA&&C.i65DeterministicDiff?.plannedOperationalWrites===EXPECTED_WRITES,'I65_APPLY_CONTROL_DIFF_INVALID');
  need(C.i65DeterministicApply?.status==='AUTHORIZED_PENDING_APPLY'&&C.i65DeterministicApply?.userAuthorized===true,'I65_APPLY_NARROW_AUTH_MISSING');
  const seen=new Set(), inserted=new Set(), restoreNeeded=new Set();
  for(const op of P.operations){
    need(ALLOWED.has(op.collection)&&['set','delete'].includes(op.op)&&op.id,'I65_APPLY_OPERATION_INVALID');
    const key=op.collection+'|'+op.id; need(!seen.has(key),'I65_APPLY_DUPLICATE_OPERATION:'+key); seen.add(key);
    if(op.op==='set')need(op.after&&typeof op.after==='object','I65_APPLY_SET_PAYLOAD_MISSING:'+key);
    if(op.expected==='ABSENT')inserted.add(key); else {need(/^[0-9a-f]{64}$/.test(String(op.expectedDocSha256||'')),'I65_APPLY_EXPECTED_SHA_MISSING:'+key); restoreNeeded.add(key);}
  }
  const rbInserted=new Set((P.rollback.deleteInserted||[]).map(x=>x.collection+'|'+x.id));
  const rbRestore=new Map((P.rollback.restore||[]).map(x=>[x.collection+'|'+x.id,x.before]));
  need(inserted.size===rbInserted.size&&[...inserted].every(x=>rbInserted.has(x)),'I65_APPLY_INSERT_ROLLBACK_MISMATCH');
  need(restoreNeeded.size===rbRestore.size&&[...restoreNeeded].every(x=>rbRestore.has(x)),'I65_APPLY_RESTORE_ROLLBACK_MISMATCH');
  for(const op of P.operations){if(op.expected!=='ABSENT')need(docHash(rbRestore.get(op.collection+'|'+op.id))===op.expectedDocSha256,'I65_APPLY_ROLLBACK_BEFORE_HASH_MISMATCH');}
}
async function relationAudit(maps){
  const policies=new Set(maps.polizas.keys()), receipts=new Set(maps.recibosEsperados.keys());
  let receiptPolicyMissing=0,portfolioPolicyMissing=0,portfolioReceiptMissing=0;
  for(const r of maps.recibosEsperados.values()){const p=String(r.polizaId||'').trim(); if(p&&!policies.has(p))receiptPolicyMissing++;}
  for(const r of maps.carteraPrimas.values()){const p=String(r.polizaId||'').trim(),rid=String(r.reciboId||'').trim(); if(p&&!policies.has(p))portfolioPolicyMissing++; if(rid&&!receipts.has(rid))portfolioReceiptMissing++;}
  return {receiptPolicyMissing,portfolioPolicyMissing,portfolioReceiptMissing,total:receiptPolicyMissing+portfolioPolicyMissing+portfolioReceiptMissing};
}
async function batchOps(db,ops){let count=0,batches=0; for(let i=0;i<ops.length;i+=300){const b=db.batch(),chunk=ops.slice(i,i+300); for(const op of chunk){const ref=canonicalCol(db,op.collection).doc(op.id); if(op.op==='set')b.set(ref,op.after); else b.delete(ref);} await b.commit(); count+=chunk.length;batches++;} return {count,batches};}
async function exactRollback(db,exact){
  const ops=[]; for(const x of exact.restore||[])ops.push({op:'set',collection:x.collection,id:x.id,after:decodeTyped(x.before,db)}); for(const x of exact.deleteInserted||[])ops.push({op:'delete',collection:x.collection,id:x.id});
  return batchOps(db,ops);
}
async function verifyBaselineRestored(db,exact){
  const maps=await readAll(db,['polizas','clientes','aseguradoras','vehiculos','recibosEsperados','carteraPrimas','cobros','finmovs','renovaciones']);
  for(const [n,c] of Object.entries(BASE))need(maps[n].size===c,'I65_ROLLBACK_COUNT_FAIL:'+n+':'+maps[n].size+':'+c);
  need(collDigest(maps.recibosEsperados)===exact.baselineDigests.recibosEsperados,'I65_ROLLBACK_RECEIPT_DIGEST_FAIL');
  need(collDigest(maps.carteraPrimas)===exact.baselineDigests.carteraPrimas,'I65_ROLLBACK_PORTFOLIO_DIGEST_FAIL');
  for(const n of FORBIDDEN)need(collDigest(maps[n])===exact.forbiddenDigests[n],'I65_ROLLBACK_FORBIDDEN_DIGEST_FAIL:'+n);
  const legacy=await readAll(db,['recibosEsperados','carteraPrimas','cobros'],true);
  for(const n of Object.keys(legacy))need(collDigest(legacy[n])===exact.legacyDigests[n],'I65_ROLLBACK_LEGACY_DIGEST_FAIL:'+n);
}

const C=JSON.parse(fs.readFileSync(CONTROL,'utf8')), S=JSON.parse(fs.readFileSync(SOURCE,'utf8')), D=JSON.parse(fs.readFileSync(DIFF,'utf8'));
need(D.schema==='GRAVICENTRA_I6_5_DETERMINISTIC_DIFF_V1'&&D.status==='DETERMINISTIC_DIFF_READY'&&D.sourceBundleSha256===S.sourceBundle?.sha256&&D.decisions?.totalOperationalWrites===EXPECTED_WRITES&&D.invariants?.targetRelationshipErrors===0&&D.invariants?.cobrosWrites===0&&D.invariants?.finmovWrites===0,'I65_DIFF_RECEIPT_CONTRACT_INVALID');
need(C.nextAction==='I6_5_APPLY_DETERMINISTIC_DELTA','I65_APPLY_CURSOR_INVALID');
need(C.i65ApplyPayload?.status==='ENCRYPTED_PAYLOAD_READY','I65_APPLY_PAYLOAD_NOT_READY');
need(C.i6Execution?.i6_5?.status==='DETERMINISTIC_DIFF_READY'&&C.postproductionDataUpdateControl?.executionCursor==='DETERMINISTIC_DIFF_READY','I65_APPLY_EXECUTION_CURSOR_INVALID');
need(C.i6Execution?.dataMutationAuthorized===false&&C.i6Execution?.sourceDataApplyAuthorized===false,'I65_APPLY_BROAD_MUTATION_FLAG_MUST_STAY_FALSE');
need(C.i65MiniClosurePlan?.blockBStatus==='READ_PATH_HYDRATION_LIVE_PASS','I65_APPLY_BLOCK_B_NOT_FROZEN');
const sa=serviceAccount(), P=decryptPayload(sa,C); validatePayload(P,C,S,D);
const app=initializeApp({credential:cert(sa),projectId:PROJECT},'i65-deterministic-'+MODE), db=getFirestore(app);
const result={schema:'GRAVICENTRA_I6_5_DETERMINISTIC_APPLY_RESULT_V1',gate:'I6.5',module:'RECIBOS_CARTERA',mode:MODE,status:'FAIL',writes:0,batchesCommitted:0,rollbackExecuted:false,rollbackStatus:'NOT_NEEDED',sourceBundleSha256:P.sourceBundleSha256,diffSha256:EXPECTED_DIFF_SHA,plaintextPayloadSha256:EXPECTED_PLAIN_SHA,countsBefore:{},countsAfter:{},relationships:{},forbiddenUnchanged:false,legacyUnchanged:false,unrelatedAllowedDocsUnchanged:false,holds:(P.holds||[]).length,containsPII:false,containsSecrets:false,errors:[]};
let anyCommitted=false;
try{
  if(MODE==='rollback'){
    need(fs.existsSync(EXACT_ROLLBACK),'I65_EXACT_ROLLBACK_FILE_MISSING'); const exact=JSON.parse(fs.readFileSync(EXACT_ROLLBACK,'utf8')); need(exact.schema==='GRAVICENTRA_I6_5_EXACT_ROLLBACK_V1','I65_EXACT_ROLLBACK_SCHEMA_INVALID');
    const rb=await exactRollback(db,exact); await verifyBaselineRestored(db,exact); Object.assign(result,{status:'ROLLBACK_PASS',writes:rb.count,batchesCommitted:rb.batches,rollbackExecuted:true,rollbackStatus:'PASS'}); console.log('I65_ROLLBACK=PASS');
  } else {
    need(MODE==='apply','I65_APPLY_MODE_INVALID');
    const names=['polizas','clientes','aseguradoras','vehiculos','recibosEsperados','carteraPrimas','cobros','finmovs','renovaciones'];
    const before=await readAll(db,names), legacyBefore=await readAll(db,['recibosEsperados','carteraPrimas','cobros'],true);
    for(const [n,c] of Object.entries(BASE)){need(before[n].size===c,'I65_BASELINE_COUNT_DRIFT:'+n+':'+before[n].size+':'+c); result.countsBefore[n]=before[n].size;}
    const forbiddenDigests=Object.fromEntries(FORBIDDEN.map(n=>[n,collDigest(before[n])]));
    const legacyDigests=Object.fromEntries(Object.keys(legacyBefore).map(n=>[n,collDigest(legacyBefore[n])]));
    const targetKeys={recibosEsperados:new Set(),carteraPrimas:new Set()}; for(const op of P.operations)targetKeys[op.collection].add(op.id);
    const unrelatedDigests={}; for(const n of ALLOWED){const m=new Map([...before[n]].filter(([id])=>!targetKeys[n].has(id)));unrelatedDigests[n]=collDigest(m);}
    const exact={schema:'GRAVICENTRA_I6_5_EXACT_ROLLBACK_V1',createdAt:new Date().toISOString(),baselineDigests:{recibosEsperados:collDigest(before.recibosEsperados),carteraPrimas:collDigest(before.carteraPrimas)},forbiddenDigests,legacyDigests,restore:[],deleteInserted:[]};
    const simR=new Map(before.recibosEsperados), simP=new Map(before.carteraPrimas);
    for(const op of P.operations){
      const m=op.collection==='recibosEsperados'?before.recibosEsperados:before.carteraPrimas, cur=m.get(op.id), key=op.collection+'|'+op.id;
      if(op.expected==='ABSENT'){need(cur===undefined,'I65_EXPECTED_ABSENT_DRIFT:'+key); exact.deleteInserted.push({collection:op.collection,id:op.id});}
      else {need(cur!==undefined,'I65_EXPECTED_EXISTING_MISSING:'+key); need(docHash(cur)===op.expectedDocSha256,'I65_EXPECTED_DOC_SHA_DRIFT:'+key); exact.restore.push({collection:op.collection,id:op.id,before:encodeTyped(cur)});}
      const sm=op.collection==='recibosEsperados'?simR:simP; if(op.op==='set')sm.set(op.id,op.after); else sm.delete(op.id);
    }
    need(exact.restore.length===1045&&exact.deleteInserted.length===1182,'I65_EXACT_ROLLBACK_SCOPE_INVALID');
    const simulated={...before,recibosEsperados:simR,carteraPrimas:simP}; need(simR.size===TARGET.recibosEsperados&&simP.size===TARGET.carteraPrimas,'I65_SIMULATED_TARGET_COUNT_INVALID'); const simRel=await relationAudit(simulated); need(simRel.total===0,'I65_SIMULATED_RELATIONSHIP_ERROR');
    fs.writeFileSync(EXACT_ROLLBACK,JSON.stringify(exact)); try{fs.chmodSync(EXACT_ROLLBACK,0o600);}catch{}
    const applied=await batchOps(db,P.operations); anyCommitted=applied.count>0; result.writes=applied.count; result.batchesCommitted=applied.batches; need(applied.count===EXPECTED_WRITES,'I65_APPLY_WRITE_COUNT_INVALID');
    const after=await readAll(db,names), legacyAfter=await readAll(db,['recibosEsperados','carteraPrimas','cobros'],true); for(const [n,c] of Object.entries(TARGET)){need(after[n].size===c,'I65_POSTWRITE_COUNT_INVALID:'+n+':'+after[n].size+':'+c);result.countsAfter[n]=after[n].size;}
    for(const op of P.operations){const m=op.collection==='recibosEsperados'?after.recibosEsperados:after.carteraPrimas,cur=m.get(op.id),key=op.collection+'|'+op.id;if(op.op==='delete')need(cur===undefined,'I65_DELETE_READBACK_FAIL:'+key);else{need(cur!==undefined,'I65_SET_READBACK_MISSING:'+key);need(docHash(cur)===docHash(op.after),'I65_SET_READBACK_HASH_FAIL:'+key);}}
    for(const n of FORBIDDEN)need(collDigest(after[n])===forbiddenDigests[n],'I65_FORBIDDEN_COLLECTION_CHANGED:'+n); result.forbiddenUnchanged=true;
    for(const n of Object.keys(legacyAfter))need(collDigest(legacyAfter[n])===legacyDigests[n],'I65_LEGACY_NAMESPACE_CHANGED:'+n); result.legacyUnchanged=true;
    for(const n of ALLOWED){const m=new Map([...after[n]].filter(([id])=>!targetKeys[n].has(id)));need(collDigest(m)===unrelatedDigests[n],'I65_UNRELATED_ALLOWED_DOC_CHANGED:'+n);} result.unrelatedAllowedDocsUnchanged=true;
    const rel=await relationAudit(after); need(rel.total===0,'I65_RELATIONSHIP_INTEGRITY_FAIL'); result.relationships=rel;
    result.status='PASS';
  }
}catch(e){
  result.errors.push(String(e?.message||e).slice(0,400));
  if(MODE==='apply'&&anyCommitted&&fs.existsSync(EXACT_ROLLBACK)){
    result.rollbackExecuted=true;
    try{const exact=JSON.parse(fs.readFileSync(EXACT_ROLLBACK,'utf8'));const rb=await exactRollback(db,exact);await verifyBaselineRestored(db,exact);result.rollbackStatus='PASS';result.rollbackWrites=rb.count;}catch(rb){result.rollbackStatus='FAIL';result.errors.push('ROLLBACK:'+String(rb?.message||rb).slice(0,300));}
  }
  process.exitCode=1;
}finally{
  await deleteApp(app).catch(()=>{}); fs.writeFileSync(RESULT,JSON.stringify(result,null,2)+'\n');
  console.log('I65_APPLY_STATUS='+result.status); console.log('I65_APPLY_WRITES='+result.writes); console.log('I65_APPLY_ROLLBACK='+result.rollbackStatus); console.log('I65_APPLY_PII_OUTPUT=false');
}
