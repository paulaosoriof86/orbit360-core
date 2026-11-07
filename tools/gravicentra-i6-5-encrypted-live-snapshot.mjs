import fs from 'node:fs';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones';
const OUT=process.env.I65_DIFF_SNAPSHOT_FILE||'i65-diff-live-snapshot.enc.json';
const PUB=process.env.I65_DIFF_PUBLIC_KEY||'artifacts/orbit360-recovery/release-control/I6_5_DIFF_SNAPSHOT_PUBLIC_KEY_20260918.pem';
const CONTROL=process.env.CONTROL||'artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';
const need=(ok,code)=>{if(!ok)throw new Error(code);};
function sa(){for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}}throw new Error('I65_DIFF_SERVICE_ACCOUNT');}
function canon(v){
  if(v==null||typeof v==='string'||typeof v==='number'||typeof v==='boolean')return v;
  if(v instanceof Date)return v.toISOString();
  if(Array.isArray(v))return v.map(canon);
  if(typeof v==='object'){
    if(typeof v.toDate==='function'){try{return v.toDate().toISOString();}catch{}}
    if(typeof v.path==='string'&&Object.keys(v).length<8)return {__ref:v.path};
    const o={};for(const [k,x] of Object.entries(v))o[k]=canon(x);return o;
  }
  return String(v);
}
async function readColl(db,name){
  const s=await db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items').get();
  return s.docs.map(d=>({id:d.id,...canon(d.data()||{})}));
}

// Current October reconciliation extends this encrypted read owner. The original
// I6.5 cursor/count contract below remains unchanged and is never reactivated.
export const OCTOBER_COLLECTIONS=Object.freeze(['polizas','clientes','aseguradoras','recibosEsperados','carteraPrimas','cobros','asesores']);
export const OCTOBER_ROOT='artifacts/orbit360-recovery/release-control/';
export const OCTOBER_REQUEST=OCTOBER_ROOT+'I6_5_OCTOBER_RECONCILIATION_PRIVATE_READBACK_REQUEST_20261107.json';
export const OCTOBER_PUBLIC_KEY=OCTOBER_ROOT+'I6_5_OCTOBER_RECONCILIATION_SNAPSHOT_PUBLIC_KEY_20261107.pem';
export const OCTOBER_PATHS=Object.freeze([
 'tools/gravicentra-i6-5-encrypted-live-snapshot.mjs',
 '.github/workflows/gravicentra-recovery-i6-postsalida.yml',
 'tools/gravicentra-i6-5-october-private-snapshot.test.mjs',
 OCTOBER_REQUEST,OCTOBER_PUBLIC_KEY
]);
const FREEZE=OCTOBER_ROOT+'OWNER_DECISION_FREEZE_AND_RECONCILIATION_PLAN_20261107.json';
const BASE='e5030ec5ba9854f0c576fd905c2f510766347ffa';
const BASE_FREEZE_BLOB='11830a98266625e07bc7d2fcb58d2728be864cd8';
const FORBIDDEN=['dataWrites','sourceDataApply','authWrites','membershipWrites','mintUserTokens','productWrites','deploy','governanceWrites','reimport','messages'];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+Buffer.byteLength(b)+'\0'),Buffer.from(b)])).digest('hex');
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const INSURER_FIELDS=Object.freeze(['id','tenantId','pais','country','nombre','canonicalName','displayName','codigoIntermediario','activo','estado','comisionDefault','comisiones','comisionesProd','ramos','ramosHabilitados','ramosDetalle','productos','updatedAt','actualizado','version','schemaVersion','__syntheticQa','syntheticQa']);
const ADVISOR_FIELDS=Object.freeze(['id','tenantId','nombre','displayName','name','pais','country','paises','countries','paisDefault','countryDefault','activo','active','inactivo','estado','status','tipoVinculacion','participaMetas','comModo','shareCom','comValor','updatedAt','actualizado','version','schemaVersion','__syntheticQa','syntheticQa']);
export function validateOctoberRequest({request,requestBytes,control,freeze,freezeBytes,baseFreeze,baseFreezeBytes,publicKeyBytes,fileBytes,branch,head}){
 need(branch==='recovery/fase-a-clean-20260831'&&/^[a-f0-9]{40}$/.test(head||''),'I65_OCTOBER_CANONICAL_HEAD_REQUIRED');
 need(request?.schema==='GRAVICENTRA_OCTOBER_PRIVATE_READBACK_REQUEST_V1'&&request.mode==='READ_ONLY_ENCRYPTED_CURRENT_BASELINE'&&request.collectionPeriod==='2026-10','I65_OCTOBER_REQUEST_SCOPE');
 need(request.projectId===PROJECT&&request.tenantId===TENANT&&request.sourceBaseHead===BASE,'I65_OCTOBER_TENANT_OR_BASE');
 need(request.ownerCriteriaBaseBlobSha===BASE_FREEZE_BLOB&&blob(baseFreezeBytes)===BASE_FREEZE_BLOB,'I65_OCTOBER_BASE_OWNER_HASH');
 need(baseFreeze?.sourceInventory?.monthClarification?.ownerDeclaredLot==='OCTOBER_2026_COLLECTIONS_NOVEMBER_DOCUMENTARY_INVOICING'&&baseFreeze?.sourceInventory?.monthClarification?.answerReceived===true,'I65_OCTOBER_OWNER_PERIOD_REQUIRED');
 need(request.sourceManifestSha256===baseFreeze.sourceInventory?.documentManifest20261107?.sourceManifestSha256&&request.normalizedRowsSha256===baseFreeze.sourceInventory?.documentManifest20261107?.normalizedRowsSha256,'I65_OCTOBER_DOCUMENT_SOURCE_BINDING');
 need(same(request.collections,OCTOBER_COLLECTIONS)&&same(request.configSourceFields,{asesores:['comModo','shareCom','comValor'],aseguradoras:['comisionDefault','comisiones','comisionesProd']}),'I65_OCTOBER_COLLECTION_OR_CONFIG_SCOPE');
 need(FORBIDDEN.every(k=>request[k]===false)&&request.operationalWrites===0&&request.encryptedOnly===true&&request.repositoryPlaintextForbidden===true,'I65_OCTOBER_FORBIDDEN_CAPABILITY');
 need(!Object.prototype.hasOwnProperty.call(request,'expectedCounts')&&Number.isInteger(request.maxDocumentsPerCollection)&&request.maxDocumentsPerCollection>0&&request.maxDocumentsPerCollection<=20000,'I65_OCTOBER_BOUNDS');
 need(request.publicKeyPath===OCTOBER_PUBLIC_KEY&&request.publicKeySha256===sha(publicKeyBytes),'I65_OCTOBER_RECIPIENT_KEY');
 const key=crypto.createPublicKey(publicKeyBytes);need(key.asymmetricKeyType==='rsa'&&(key.asymmetricKeyDetails?.modulusLength||0)>=3072,'I65_OCTOBER_RECIPIENT_STRENGTH');
 need(control?.nextAction==='B4_003_CLOSED_RETURN_TO_FROZEN_PLAN_NEXT_GATE_NOT_EXECUTED'&&control?.ownerDecisionFreeze20261107?.blobSha===blob(freezeBytes),'I65_OCTOBER_CURRENT_OWNER_BINDING');
 need(same(freeze?.preservedRelease,baseFreeze?.preservedRelease),'I65_OCTOBER_RETAINED_RELEASE_CHANGED');
 const grant=freeze?.reconciliationReadOnlySuccessor;
 need(grant?.schema==='GRAVICENTRA_OCTOBER_PRIVATE_READBACK_SUCCESSOR_V1'&&grant.sourceBaseHead===BASE&&grant.requestPath===OCTOBER_REQUEST&&grant.requestBlobSha===blob(requestBytes),'I65_OCTOBER_OWNER_GRANT');
 need(grant.realBusinessWrites===0&&grant.productDeployed===false&&grant.cursorChanged===false&&grant.encryptedOnly===true,'I65_OCTOBER_OWNER_GRANT_BOUNDARY');
 need(Array.isArray(grant.changes)&&same(grant.changes.map(x=>x.path).sort(),[...OCTOBER_PATHS].sort()),'I65_OCTOBER_EXACT_FILE_SET');
 for(const f of grant.changes)need(fileBytes[f.path]&&blob(fileBytes[f.path])===f.blobSha,'I65_OCTOBER_EXECUTOR_BYTES');
 return request;
}
function exactTime(value){
 if(value==null)return null;
 const seconds=value.seconds??value._seconds,nanos=value.nanoseconds??value._nanoseconds;
 if(Number.isInteger(seconds)&&Number.isInteger(nanos))return {seconds:String(seconds),nanoseconds:nanos};
 if(value instanceof Date){const ms=value.getTime();return Number.isFinite(ms)?{seconds:String(Math.floor(ms/1000)),nanoseconds:((ms%1000)+1000)%1000*1000000}:null;}
 return null;
}
function financialDirectoryValue(value,depth=0){
 need(depth<=20,'I65_OCTOBER_CONFIG_DEPTH');
 if(Array.isArray(value))return value.map(x=>financialDirectoryValue(x,depth+1));
 if(value&&typeof value==='object'){
  const denied=/^(?:password|pass|pwd|contrasena|clave|secret|secrets|token|accesstoken|refreshtoken|privatekey|clientsecret|apikey|passwordhash|jwt|authorization|credentialvalue|credential_value|credentials|credenciales|secretkey|auth|authentication|authuid|uid|userid|email|portales|portals|cuentas|cuentasbancarias|cuentabancaria|bankaccounts|bankaccount|accountnumber|numerocuenta|__proto__|constructor|prototype)$/i;
  return Object.fromEntries(Object.entries(value).filter(([k])=>!denied.test(k.normalize('NFD').replace(/[\u0300-\u036f]/g,''))).map(([k,v])=>[k,financialDirectoryValue(v,depth+1)]));
 }
 return value;
}
export function projectOctoberRecord(collection,document){
 need(OCTOBER_COLLECTIONS.includes(collection),'I65_OCTOBER_COLLECTION_DENIED');
 const raw=canon(document.data()||{}),id=String(document.id||'');
 need(id&&(!raw.tenantId||raw.tenantId===TENANT),'I65_OCTOBER_DOCUMENT_TENANT');
 const fields=collection==='aseguradoras'?INSURER_FIELDS:collection==='asesores'?ADVISOR_FIELDS:null;
 const data=fields?financialDirectoryValue(Object.fromEntries(fields.filter(k=>Object.prototype.hasOwnProperty.call(raw,k)).map(k=>[k,raw[k]]))):raw;
 return {...data,id,canonicalDocumentId:id,__snapshot:{storedId:raw.id??null,idMismatch:raw.id!=null&&String(raw.id)!==id,createTime:canon(document.createTime)||null,updateTime:canon(document.updateTime)||null,readTime:canon(document.readTime)||null,createTimeExact:exactTime(document.createTime),updateTimeExact:exactTime(document.updateTime),readTimeExact:exactTime(document.readTime),fullDocumentSha256:sha(JSON.stringify(stable(raw))),projection:fields?'FINANCIAL_CONFIGURATION_AND_IDENTITY':'CANONICAL_DOCUMENT'}};
}
export async function captureOctoberSnapshot({db,request,head}){
 const startedAt=new Date().toISOString(),data={},collections={};
 for(const name of OCTOBER_COLLECTIONS){
  const snap=await db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items').orderBy('__name__').limit(request.maxDocumentsPerCollection+1).get();
  need(Array.isArray(snap.docs)&&snap.docs.length<=request.maxDocumentsPerCollection,'I65_OCTOBER_DOCUMENT_BOUND_EXCEEDED');
  data[name]=snap.docs.map(d=>projectOctoberRecord(name,d));
  collections[name]={count:data[name].length,complete:true,readTime:canon(snap.readTime)||null,readTimeExact:exactTime(snap.readTime),idMismatches:data[name].filter(r=>r.__snapshot.idMismatch).length};
 }
 const counts=Object.fromEntries(OCTOBER_COLLECTIONS.map(n=>[n,data[n].length]));
 return {schema:'GRAVICENTRA_CURRENT_RECONCILIATION_ENCRYPTED_SNAPSHOT_V2',createdAt:new Date().toISOString(),projectId:PROJECT,tenantId:TENANT,headSha:head,authorityBaseHead:BASE,collectionPeriod:'2026-10',readWindow:{startedAt,completedAt:new Date().toISOString(),atomicAcrossCollections:false},counts,collections,data,commissionConfiguration:{sourceFields:request.configSourceFields,effectiveDateHistory:'NOT_ASSUMED_FROM_CURRENT_MUTABLE_VALUES',defaultsApplied:false},sourceManifestSha256:request.sourceManifestSha256,normalizedRowsSha256:request.normalizedRowsSha256,writes:0,operationalWrites:0};
}
export function encryptOctoberSnapshot(payload,publicKeyBytes){
 const plain=Buffer.from(JSON.stringify(payload)),gz=zlib.gzipSync(plain,{level:9}),aes=crypto.randomBytes(32),iv=crypto.randomBytes(12);
 const cipher=crypto.createCipheriv('aes-256-gcm',aes,iv),ct=Buffer.concat([cipher.update(gz),cipher.final()]);
 const ek=crypto.publicEncrypt({key:publicKeyBytes,padding:crypto.constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},aes);
 return {schema:'GRAVICENTRA_CURRENT_RECONCILIATION_ENCRYPTED_ENVELOPE_V2',alg:'RSA-OAEP-SHA256+A256GCM',compression:'gzip',sourceHeadSha:payload.headSha,authorityBaseHead:BASE,createdAt:payload.createdAt,counts:payload.counts,readWindow:payload.readWindow,publicKeySha256:sha(publicKeyBytes),plaintextSha256:sha(plain),compressedSha256:sha(gz),encryptedKey:ek.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ct.toString('base64'),containsPII:true,encrypted:true,writes:0,operationalWrites:0};
}
function loadOctoberRequest(){
 const requestBytes=fs.readFileSync(OCTOBER_REQUEST),request=JSON.parse(requestBytes),freezeBytes=fs.readFileSync(FREEZE),freeze=JSON.parse(freezeBytes),control=JSON.parse(fs.readFileSync(CONTROL));
 const baseFreezeBytes=execFileSync('git',['show',BASE+':'+FREEZE],{maxBuffer:2000000}),baseFreeze=JSON.parse(baseFreezeBytes),publicKeyBytes=fs.readFileSync(OCTOBER_PUBLIC_KEY);
 const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 need(head===process.env.GITHUB_SHA,'I65_OCTOBER_EXECUTION_SHA_MISMATCH');
 execFileSync('git',['merge-base','--is-ancestor',BASE,head],{stdio:'pipe'});
 const fileBytes=Object.fromEntries(OCTOBER_PATHS.map(p=>[p,fs.readFileSync(p)]));
 validateOctoberRequest({request,requestBytes,control,freeze,freezeBytes,baseFreeze,baseFreezeBytes,publicKeyBytes,fileBytes,branch:process.env.GITHUB_REF_NAME,head});
 return {request,publicKeyBytes,head};
}
async function runOctober(checkOnly){
 const {request,publicKeyBytes,head}=loadOctoberRequest();
 if(checkOnly){console.log('I65_OCTOBER_READBACK_REQUEST=PASS');return;}
 const output=process.env.I65_DIFF_SNAPSHOT_FILE,receipt=process.env.I65_DIFF_PUBLIC_RECEIPT_FILE,tmp=process.env.RUNNER_TEMP;
 need(output&&receipt&&tmp&&[output,receipt].every(p=>path.resolve(p).startsWith(path.resolve(tmp)+path.sep)),'I65_OCTOBER_PRIVATE_RUNNER_OUTPUT_REQUIRED');
 const {initializeApp,cert,deleteApp}=await import('firebase-admin/app'),{getFirestore}=await import('firebase-admin/firestore');
 const app=initializeApp({credential:cert(sa()),projectId:PROJECT},'i65-october-private-readback');
 try{
  const payload=await captureOctoberSnapshot({db:getFirestore(app),request,head}),envelope=encryptOctoberSnapshot(payload,publicKeyBytes),encoded=JSON.stringify(envelope);
  fs.writeFileSync(output,encoded,{mode:0o600});
  const publicReceipt={schema:'GRAVICENTRA_OCTOBER_PRIVATE_READBACK_RECEIPT_V1',status:'ENCRYPTED_CURRENT_BASELINE_CAPTURED_NOT_MATCHED_NOT_APPLIED',sourceHeadSha:head,authorityBaseHead:BASE,collectionPeriod:'2026-10',counts:payload.counts,readWindow:payload.readWindow,encryptedPayloadSha256:sha(encoded),plaintextSha256:envelope.plaintextSha256,publicKeySha256:envelope.publicKeySha256,sourceManifestSha256:request.sourceManifestSha256,normalizedRowsSha256:request.normalizedRowsSha256,encryptedOnly:true,containsPlaintextPII:false,writes:0,operationalWrites:0,deploy:false,acceptanceGranted:false};
  fs.writeFileSync(receipt,JSON.stringify(publicReceipt,null,2)+'\n',{mode:0o600});
  console.log('I65_OCTOBER_ENCRYPTED_SNAPSHOT=CAPTURED');console.log('I65_OCTOBER_COUNTS='+JSON.stringify(payload.counts));console.log('I65_OCTOBER_WRITES=0');
 }finally{await deleteApp(app).catch(()=>{});}
}
async function runLegacy(){
 const {initializeApp,cert,deleteApp}=await import('firebase-admin/app'),{getFirestore}=await import('firebase-admin/firestore');
const app=initializeApp({credential:cert(sa()),projectId:PROJECT},'i65-diff-snapshot');
try{
  const db=getFirestore(app),C=JSON.parse(fs.readFileSync(CONTROL,'utf8'));
  need(C.nextAction==='I6_5_DETERMINISTIC_DIFF','I65_DIFF_CURSOR_INVALID');
  need(C.i65MiniClosurePlan?.blockBStatus==='READ_PATH_HYDRATION_LIVE_PASS','I65_DIFF_BLOCK_B_NOT_FROZEN');
  need(C.i6Execution?.dataMutationAuthorized===false&&C.i6Execution?.sourceDataApplyAuthorized===false,'I65_DIFF_WRITE_BOUNDARY_INVALID');
  const names=['polizas','clientes','aseguradoras','recibosEsperados','carteraPrimas','cobros'];
  const data={};
  for(const n of names)data[n]=await readColl(db,n);
  const counts=Object.fromEntries(names.map(n=>[n,data[n].length]));
  need(counts.polizas===1414,'I65_DIFF_POLIZAS_COUNT_DRIFT:'+counts.polizas);
  need(counts.clientes===442,'I65_DIFF_CLIENTES_COUNT_DRIFT:'+counts.clientes);
  need(counts.recibosEsperados===1294,'I65_DIFF_RECEIPTS_COUNT_DRIFT:'+counts.recibosEsperados);
  need(counts.carteraPrimas===673,'I65_DIFF_PORTFOLIO_COUNT_DRIFT:'+counts.carteraPrimas);
  need(counts.cobros===5,'I65_DIFF_COBROS_COUNT_DRIFT:'+counts.cobros);
  const payload={schema:'GRAVICENTRA_I6_5_ENCRYPTED_LIVE_SNAPSHOT_V1',createdAt:new Date().toISOString(),projectId:PROJECT,tenantId:TENANT,headSha:process.env.GITHUB_SHA||'',counts,data};
  const plain=Buffer.from(JSON.stringify(payload));
  const gz=zlib.gzipSync(plain,{level:9});
  const aes=crypto.randomBytes(32),iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv('aes-256-gcm',aes,iv);
  const ct=Buffer.concat([cipher.update(gz),cipher.final()]),tag=cipher.getAuthTag();
  const pub=fs.readFileSync(PUB,'utf8');
  const ek=crypto.publicEncrypt({key:pub,padding:crypto.constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},aes);
  const envelope={
    schema:'GRAVICENTRA_I6_5_ENCRYPTED_LIVE_SNAPSHOT_ENVELOPE_V1',
    alg:'RSA-OAEP-SHA256+A256GCM',compression:'gzip',
    sourceHeadSha:process.env.GITHUB_SHA||'',counts,
    plaintextSha256:crypto.createHash('sha256').update(plain).digest('hex'),
    compressedSha256:crypto.createHash('sha256').update(gz).digest('hex'),
    encryptedKey:ek.toString('base64'),iv:iv.toString('base64'),tag:tag.toString('base64'),ciphertext:ct.toString('base64'),
    containsPII:true,encrypted:true,writes:0,operationalWrites:0
  };
  fs.writeFileSync(OUT,JSON.stringify(envelope));
  console.log('I65_DIFF_ENCRYPTED_SNAPSHOT=PASS');
  console.log('I65_DIFF_COUNTS='+JSON.stringify(counts));
  console.log('I65_DIFF_PLAINTEXT_SHA256='+envelope.plaintextSha256);
  console.log('I65_DIFF_WRITES=0');
} finally {await deleteApp(app).catch(()=>{});}

}
async function main(){
 const args=process.argv.slice(2);
 if(args.length===1&&args[0]==='--check-october-request')return runOctober(true);
 if(args.length===1&&args[0]==='--october-readonly')return runOctober(false);
 need(args.length===0,'I65_SNAPSHOT_MODE_DENIED');return runLegacy();
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{await main();}catch(error){const text=String(error?.message||''),code=/^I65_[A-Z0-9_]+$/.test(text)?text:/^[a-z0-9_/-]{1,80}$/i.test(String(error?.code||''))?String(error.code):'READBACK_FAILED';console.error('I65_SNAPSHOT_HOLD:'+code);process.exitCode=42;}
}
