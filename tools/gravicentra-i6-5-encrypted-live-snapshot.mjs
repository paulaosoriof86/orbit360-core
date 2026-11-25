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
// A separate current I6.6 read profile in this same encrypted reader. It never
// invokes, edits, or reactivates the historical October authority.
export const ALICE_PROFILE='ALICE_GT_MATCHING_MINIMAL_V1';
export const ALICE_COLLECTIONS=Object.freeze(['negocios','clientes','polizas']);
export const ALICE_REQUEST=OCTOBER_ROOT+'I6_6_ALICE_GT_PRIVATE_MATCHING_READBACK_REQUEST_20261124.json';
export const ALICE_PUBLIC_KEY=OCTOBER_ROOT+'I6_6_ALICE_GT_MATCHING_PUBLIC_KEY_20261124.pem';
export const ALICE_TEST='tools/gravicentra-i6-6-alice-private-snapshot.test.mjs';
export const ALICE_EXECUTOR_PATHS=Object.freeze([OCTOBER_PATHS[0],OCTOBER_PATHS[1],ALICE_TEST,ALICE_PUBLIC_KEY]);
export const ALICE_WORKBOOK_SHA256='0686eb96bdcc82d90284f3740cf3bd8b91910ac99da184d3856d6d8330e94bdb';
const ALICE_STATE='orbit360-platform/docs/recovery/orbit360-recovery-state-v1.json';
const ALICE_DECISION=OCTOBER_ROOT+'I6_6_DIRECTION_OPERATIONAL_FINDINGS_AND_PROSPECTIVE_LEADS_20261124_R60.json';
const ALICE_DECISION_BLOB='5905d1e85327124efd9afbde3755b9070c1c5501';
const ALICE_COUNTRY_FIELDS=Object.freeze(['tenantId','pais','country']);
const ALICE_COMMON=Object.freeze(['id','tenantId','pais','country','nombre','name','telefono','phone','celular','whatsapp','movil','telefonoPrincipal','telefonoMovil','email','correo','asesorId','advisorId','createdAt','creado','updatedAt','actualizado','archivado','deleted','eliminado','activo','active','visible']);
export const ALICE_FIELDS=Object.freeze({
 negocios:Object.freeze([...ALICE_COMMON,'tipo','clienteId','clientId','clienteIdCreado','polizaId','policyId','commercialIdentityId','sourceOpportunityId','producto','product','ramo','line','plan','etapa','stage','estado','status','canal','origen','puntoIngreso','aseguradoraId','aseguradoraIds','cadenciaActiva']),
 clientes:Object.freeze([...ALICE_COMMON,'tipo','razonSocial','tipoIdentificacion','identificacion','nit','dpi','identityKey','mergedIntoClientId','fusionado','estadoOperativo']),
 polizas:Object.freeze([...ALICE_COMMON,'numero','numeroPoliza','policyNumber','noPoliza','clienteId','clientId','producto','product','ramo','line','plan','estado','status','aseguradoraId','negocioId','sourceBusinessId','renovacionDe','polizaAnteriorId','vigenciaInicio','vigenciaFin'])
});
export const ALICE_READ_SCOPE=Object.freeze({riskCountry:'GT',riskCollections:['negocios','polizas'],clientIdentityCollection:'clientes',clientIdentityCountryFilter:'NONE_WITHIN_AUTHORIZED_TENANT',clientCountryIsNotRiskCountry:true,phonePrefixIsNotCountry:true,countryAliasFields:['pais','country'],countryDirectoryFields:ALICE_COUNTRY_FIELDS,nonGtRiskIdentityFieldsRead:false,missingOrConflictingRiskCountry:'EXCLUDE_AND_HOLD_ABSENCE_INFERENCE',missingOrConflictingClientCountry:'PRESERVE_MINIMAL_IDENTITY_AND_HOLD_COUNTRY_DECISION',fullDocuments:false,matchingOnly:true,imports:false,externalMessages:false});
const ALICE_FORBIDDEN=Object.freeze([...FORBIDDEN,'iamWrites','backendChanges','outboxWrites','grantWrites','makeActivation']);
function aliceKeys(value,expected,code){need(value&&typeof value==='object'&&!Array.isArray(value)&&same(Object.keys(value).sort(),[...expected].sort()),code);}
export function validateAliceRequest({request,requestBytes,control,controlBytes,state,stateBytes,progress,progressBytes,decisionBytes,publicKeyBytes,fileBytes,branch,head}){
 need(branch==='recovery/fase-a-clean-20260831'&&/^[a-f0-9]{40}$/.test(head||''),'I66_ALICE_CANONICAL_HEAD_REQUIRED');
 aliceKeys(request,['schema','profile','status','projectId','tenantId','riskCountry','source','readScope','collections','fieldProjection','authority','executableFiles','maxDocumentsPerCollection','pageSize','identityBatchSize','publicKeyPath','publicKeySha256','capabilities','encryptedOnly','repositoryPlaintextForbidden'],'I66_ALICE_REQUEST_SHAPE');
 need(request.schema==='GRAVICENTRA_I66_ALICE_PRIVATE_MATCHING_REQUEST_V1'&&request.profile===ALICE_PROFILE&&request.status==='AUTHORIZED_READ_ONLY_MATCHING','I66_ALICE_PROFILE_NOT_ACTIVE');
 need(request.projectId===PROJECT&&request.tenantId===TENANT&&request.riskCountry==='GT','I66_ALICE_TENANT_COUNTRY');
 aliceKeys(request.source,['workbookSha256','advance','declaredCutoff','declaredCoverageStart','latestAdvanceVerified'],'I66_ALICE_SOURCE_SHAPE');
 need(same(request.source,{workbookSha256:ALICE_WORKBOOK_SHA256,advance:10,declaredCutoff:'2026-11-24',declaredCoverageStart:'2026-09-01',latestAdvanceVerified:false}),'I66_ALICE_WORKBOOK_BINDING');
 need(same(request.collections,ALICE_COLLECTIONS)&&same(request.fieldProjection,ALICE_FIELDS)&&same(request.readScope,ALICE_READ_SCOPE),'I66_ALICE_READ_SCOPE');
 aliceKeys(request.capabilities,[...ALICE_FORBIDDEN,'operationalWrites'],'I66_ALICE_CAPABILITY_SHAPE');
 need(ALICE_FORBIDDEN.every(k=>request.capabilities[k]===false)&&request.capabilities.operationalWrites===0&&request.encryptedOnly===true&&request.repositoryPlaintextForbidden===true,'I66_ALICE_WRITE_OR_PLAINTEXT_DENIED');
 need(Number.isInteger(request.maxDocumentsPerCollection)&&request.maxDocumentsPerCollection>0&&request.maxDocumentsPerCollection<=20000&&Number.isInteger(request.pageSize)&&request.pageSize>0&&request.pageSize<=500&&request.identityBatchSize===10,'I66_ALICE_PAGINATION_BOUNDS');
 const a=request.authority;
 aliceKeys(a,['sourceBaseHead','controlPlanePath','controlPlaneBlobSha','recoveryStatePath','recoveryStateBlobSha','currentProgressPath','currentProgressBlobSha','activeGate','formalDataCutoff','executionCursor','decisionPath','decisionBlobSha','cursorChanged'],'I66_ALICE_AUTHORITY_SHAPE');
 need(/^[a-f0-9]{40}$/.test(a.sourceBaseHead||'')&&a.controlPlanePath==='artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json'&&a.controlPlaneBlobSha===blob(controlBytes)&&a.recoveryStatePath===ALICE_STATE&&a.recoveryStateBlobSha===blob(stateBytes),'I66_ALICE_CURRENT_CONTROL_BINDING');
 need(a.activeGate==='I6.6'&&a.formalDataCutoff==='2026-07-31'&&state.currentIteration===6&&state.dataCutoff===a.formalDataCutoff&&a.cursorChanged===false,'I66_ALICE_CURRENT_CUTOFF');
 need(/^I6_6_/.test(control.postproductionDataUpdateControl?.status||'')&&a.executionCursor===control.postproductionDataUpdateControl?.executionCursor&&/^I6_6_/.test(a.executionCursor||''),'I66_ALICE_CURRENT_CURSOR');
 need(/^artifacts\/orbit360-recovery\/release-control\/I6_6_CURRENT_EXECUTION_PROGRESS_[0-9]{8}_R[0-9]+\.json$/.test(a.currentProgressPath||'')&&control.i66ActiveRecoveryCursor?.currentEvidencePath===a.currentProgressPath&&control.i66ActiveRecoveryCursor?.currentEvidenceBlobSha===a.currentProgressBlobSha&&blob(progressBytes)===a.currentProgressBlobSha,'I66_ALICE_CURRENT_PROGRESS');
 need(a.decisionPath===ALICE_DECISION&&a.decisionBlobSha===ALICE_DECISION_BLOB&&blob(decisionBytes)===ALICE_DECISION_BLOB&&progress.prospectiveLeadPriority?.decision?.path===ALICE_DECISION&&progress.prospectiveLeadPriority?.decision?.gitBlobSha===ALICE_DECISION_BLOB,'I66_ALICE_CURRENT_LEAD_DECISION');
 aliceKeys(request.executableFiles,ALICE_EXECUTOR_PATHS,'I66_ALICE_EXECUTOR_SET');
 for(const p of ALICE_EXECUTOR_PATHS)need(fileBytes[p]&&blob(fileBytes[p])===request.executableFiles[p],'I66_ALICE_EXECUTOR_BYTES');
 need(requestBytes&&same(JSON.parse(requestBytes),request),'I66_ALICE_REQUEST_BYTES');
 need(request.publicKeyPath===ALICE_PUBLIC_KEY&&request.publicKeySha256===sha(publicKeyBytes)&&same(publicKeyBytes,fileBytes[ALICE_PUBLIC_KEY]),'I66_ALICE_RECIPIENT_KEY');
 const key=crypto.createPublicKey(publicKeyBytes);need(key.asymmetricKeyType==='rsa'&&(key.asymmetricKeyDetails?.modulusLength||0)>=3072,'I66_ALICE_RECIPIENT_STRENGTH');
 return request;
}
function aliceCountryValue(value){
 if(typeof value!=='string')return null;
 const valueNormalized=value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
 if(['GT','GUATEMALA'].includes(valueNormalized))return 'GT';
 if(['CO','COLOMBIA'].includes(valueNormalized))return 'CO';
 return valueNormalized||null;
}
export function classifyAliceCountry(raw){
 need(!raw.tenantId||raw.tenantId===TENANT,'I66_ALICE_DOCUMENT_TENANT');
 const values=['pais','country'].filter(k=>raw[k]!=null&&raw[k]!=='').map(k=>aliceCountryValue(raw[k]));
 if(!values.length||values.some(v=>v===null))return 'MISSING';
 if(new Set(values).size!==1)return 'CONFLICT';
 return ['GT','CO'].includes(values[0])?values[0]:'OTHER';
}
function aliceSafeValue(value){
 if(value==null||typeof value==='boolean')return {ok:true,value};
 if(typeof value==='number')return {ok:Number.isFinite(value)&&Number.isSafeInteger(value),value};
 if(typeof value==='string')return {ok:value.length<=1000,value};
 if(value instanceof Date||typeof value?.toDate==='function')return {ok:true,value:canon(value)};
 if(Array.isArray(value)&&value.length<=25&&value.every(x=>typeof x==='string'&&x.length<=320))return {ok:true,value:[...value]};
 return {ok:false};
}
export function projectAliceRecord(collection,document){
 need(ALICE_COLLECTIONS.includes(collection),'I66_ALICE_COLLECTION_DENIED');
 const raw=document.data()||{},id=String(document.id||'');
 const countryClass=classifyAliceCountry(raw);
 need(id&&(collection==='clientes'||countryClass==='GT'),'I66_ALICE_GT_RISK_OR_TENANT_IDENTITY_REQUIRED');
 const data={},heldFields=[];
 for(const key of ALICE_FIELDS[collection])if(Object.prototype.hasOwnProperty.call(raw,key)){
  const v=aliceSafeValue(raw[key]);if(v.ok)data[key]=v.value;else heldFields.push(key);
 }
 const storedId=data.id??null;data.id=id;data.tenantId=TENANT;
 return {...data,canonicalDocumentId:id,__snapshot:{storedId,idMismatch:storedId!=null&&String(storedId)!==id,projection:collection==='clientes'?'TENANT_CLIENT_IDENTITY_CONTACT_COUNTRY_ONLY':'GT_RISK_IDENTITY_RELATION_STAGE_PRODUCT_ONLY',countryClass,clientCountryIsNotRiskCountry:collection==='clientes',projectedDataSha256:sha(JSON.stringify(stable(data))),projectionHeldFields:heldFields,createTimeExact:exactTime(document.createTime),updateTimeExact:exactTime(document.updateTime),readTimeExact:exactTime(document.readTime)}};
}
function aliceCollection(db,name){need(ALICE_COLLECTIONS.includes(name),'I66_ALICE_COLLECTION_DENIED');return db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items');}
export async function captureAliceSnapshot({db,request,requestBytes,head,now=()=>new Date().toISOString()}){
 need(requestBytes&&same(JSON.parse(requestBytes),request),'I66_ALICE_REQUEST_BYTES');
 const startedAt=now(),data={},collections={};
 for(const name of ALICE_COLLECTIONS){
  const ref=aliceCollection(db,name),selected=[],counts={scanned:0,gt:0,co:0,otherCountry:0,missingCountry:0,conflictingCountry:0},pages=[];
  let lastId=null,exhausted=false;
  while(!exhausted){
   const pageLimit=Math.min(request.pageSize,request.maxDocumentsPerCollection-counts.scanned+1);
   let query=ref.orderBy('__name__').select(...ALICE_COUNTRY_FIELDS).limit(pageLimit);
   if(lastId!==null)query=query.startAfter(lastId);
   const snap=await query.get();need(Array.isArray(snap.docs)&&snap.docs.length<=pageLimit,'I66_ALICE_DIRECTORY_PAGE');
   for(const doc of snap.docs){
    const id=String(doc.id||'');need(id&&(!lastId||Buffer.compare(Buffer.from(id),Buffer.from(lastId))>0),'I66_ALICE_PAGINATION_DUPLICATE_OR_ORDER');
    lastId=id;counts.scanned++;need(counts.scanned<=request.maxDocumentsPerCollection,'I66_ALICE_DOCUMENT_BOUND_EXCEEDED');
    const raw=doc.data()||{},country=classifyAliceCountry(raw);
    counts[country==='GT'?'gt':country==='CO'?'co':country==='OTHER'?'otherCountry':country==='MISSING'?'missingCountry':'conflictingCountry']++;
    if(name==='clientes'||country==='GT'){
     const updateTimeExact=exactTime(doc.updateTime);need(updateTimeExact,'I66_ALICE_UPDATE_TIME_REQUIRED');
     selected.push({id,updateTimeExact});
    }
   }
   exhausted=snap.docs.length<pageLimit;
   pages.push({count:snap.docs.length,readTimeExact:exactTime(snap.readTime),exhausted});
  }
  const result=[];
  for(let i=0;i<selected.length;i+=request.identityBatchSize){
   const wanted=selected.slice(i,i+request.identityBatchSize),byId=new Map(wanted.map(x=>[x.id,x]));
   const snap=await ref.where('__name__','in',[...byId.keys()]).select(...ALICE_FIELDS[name]).get();
   need(Array.isArray(snap.docs)&&snap.docs.length===wanted.length,'I66_ALICE_IDENTITY_DISAPPEARED');
   const seen=new Set();
   for(const doc of snap.docs){
    need(byId.has(doc.id)&&!seen.has(doc.id),'I66_ALICE_UNREQUESTED_OR_DUPLICATE_IDENTITY');seen.add(doc.id);
    need(same(exactTime(doc.updateTime),byId.get(doc.id).updateTimeExact),'I66_ALICE_CHANGED_DURING_CAPTURE');
    result.push(projectAliceRecord(name,doc));
   }
  }
  result.sort((a,b)=>Buffer.compare(Buffer.from(a.id),Buffer.from(b.id)));data[name]=result;
  const projectionHolds=result.filter(x=>x.__snapshot.projectionHeldFields.length||x.__snapshot.idMismatch).length;
  collections[name]={...counts,exported:result.length,projectionHolds,pages:pages.length,paginationComplete:exhausted,readTimes:pages.map(p=>p.readTimeExact),identityReadbackExact:true,countryFilterApplied:name!=='clientes',scope:name==='clientes'?'SAME_TENANT_CLIENT_IDENTITY_ALL_OBSERVED_COUNTRIES':'GT_RISK_ONLY',countryFactsComplete:counts.missingCountry===0&&counts.conflictingCountry===0,identityIndexCompleteForQueriedPages:name==='clientes',absenceInferenceAllowed:false};
 }
 const counts=Object.fromEntries(ALICE_COLLECTIONS.map(k=>[k,data[k].length]));
 return {schema:'GRAVICENTRA_I66_ALICE_ENCRYPTED_MATCHING_SNAPSHOT_V1',profile:ALICE_PROFILE,createdAt:now(),projectId:PROJECT,tenantId:TENANT,riskCountry:'GT',clientIdentityCountryFilter:'NONE_WITHIN_AUTHORIZED_TENANT',headSha:head,authority:request.authority,requestPath:ALICE_REQUEST,requestBlobSha:blob(requestBytes),requestSha256:sha(requestBytes),source:request.source,readWindow:{startedAt,completedAt:now(),atomicAcrossCollections:false,newDocumentsAfterPageReadNotRuledOut:true},counts,collections,data,completeForQueriedPages:true,matchingPerformed:false,eligibleForImport:false,absenceInferenceAllowed:false,writes:0,operationalWrites:0};
}
export function encryptAliceSnapshot(payload,publicKeyBytes){
 const encrypted=encryptOctoberSnapshot(payload,publicKeyBytes);
 return {...encrypted,schema:'GRAVICENTRA_I66_ALICE_ENCRYPTED_ENVELOPE_V1',profile:ALICE_PROFILE,authorityBaseHead:payload.authority.sourceBaseHead,workbookSha256:payload.source.workbookSha256,requestPath:payload.requestPath,requestBlobSha:payload.requestBlobSha,requestSha256:payload.requestSha256};
}
export function alicePublicReceipt(payload,envelope,encoded){
 return {schema:'GRAVICENTRA_I66_ALICE_PRIVATE_MATCHING_READBACK_RECEIPT_V1',status:'ENCRYPTED_GT_RISK_AND_TENANT_IDENTITY_CAPTURE_NOT_MATCHED_NOT_IMPORTED',profile:ALICE_PROFILE,sourceHeadSha:payload.headSha,authorityBaseHead:payload.authority.sourceBaseHead,currentProgressPath:payload.authority.currentProgressPath,currentProgressBlobSha:payload.authority.currentProgressBlobSha,workbookSha256:payload.source.workbookSha256,sourceLatestAdvanceVerified:false,counts:payload.counts,collections:payload.collections,readWindow:payload.readWindow,encryptedPayloadSha256:sha(encoded),plaintextSha256:envelope.plaintextSha256,publicKeySha256:envelope.publicKeySha256,requestPath:payload.requestPath,requestBlobSha:payload.requestBlobSha,requestSha256:payload.requestSha256,encryptedOnly:true,containsPlaintextPII:false,matchingPerformed:false,eligibleForImport:false,absenceInferenceAllowed:false,writes:0,operationalWrites:0,deploy:false,acceptanceGranted:false};
}
export function validateAliceTrigger({eventName,aliceFlag,octoberFlag,commitMessage,repository,branch,head,expectedSha,headCommitSha}){
 need(repository==='paulaosoriof86/orbit360-core'&&branch==='recovery/fase-a-clean-20260831','I66_ALICE_CANONICAL_TRIGGER_REQUIRED');
 need(/^[a-f0-9]{40}$/.test(head||'')&&head===expectedSha,'I66_ALICE_EXECUTION_SHA_MISMATCH');
 const message=String(commitMessage||''),markers=message.match(/(?:^|\s)\[alice-private-matching-readback\](?=\s|$)/g)||[];
 need(octoberFlag!=='true'&&!message.includes('[october-private-readback]'),'I66_ALICE_MIXED_READ_PROFILES_DENIED');
 need(aliceFlag==='true'&&((eventName==='workflow_dispatch'&&markers.length<=1)||
  (eventName==='push'&&markers.length===1&&headCommitSha===head)),'I66_ALICE_EXPLICIT_PROFILE_REQUIRED');
 return {profile:ALICE_PROFILE,eventName,headSha:head,readOnly:true};
}
function loadAliceRequest(){
 const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 validateAliceTrigger({eventName:process.env.GITHUB_EVENT_NAME,aliceFlag:process.env.I66_ALICE_PRIVATE_READBACK,
  octoberFlag:process.env.I65_OCTOBER_PRIVATE_READBACK,commitMessage:process.env.PRIVATE_READBACK_COMMIT_MESSAGE,
  repository:process.env.GITHUB_REPOSITORY,branch:process.env.GITHUB_REF_NAME,head,expectedSha:process.env.GITHUB_SHA,
  headCommitSha:process.env.PRIVATE_READBACK_HEAD_COMMIT_SHA});
 const requestBytes=fs.readFileSync(ALICE_REQUEST),request=JSON.parse(requestBytes),controlBytes=fs.readFileSync('artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json'),control=JSON.parse(controlBytes),stateBytes=fs.readFileSync(ALICE_STATE),state=JSON.parse(stateBytes);
 need(request?.authority?.currentProgressPath===control.i66ActiveRecoveryCursor?.currentEvidencePath,'I66_ALICE_CURRENT_PROGRESS_PATH');
 const progressBytes=fs.readFileSync(request.authority.currentProgressPath),progress=JSON.parse(progressBytes),decisionBytes=fs.readFileSync(ALICE_DECISION),publicKeyBytes=fs.readFileSync(ALICE_PUBLIC_KEY),fileBytes=Object.fromEntries(ALICE_EXECUTOR_PATHS.map(p=>[p,fs.readFileSync(p)]));
 validateAliceRequest({request,requestBytes,control,controlBytes,state,stateBytes,progress,progressBytes,decisionBytes,publicKeyBytes,fileBytes,branch:process.env.GITHUB_REF_NAME,head});
 execFileSync('git',['merge-base','--is-ancestor',request.authority.sourceBaseHead,head],{stdio:'pipe'});
 for(const p of [...ALICE_EXECUTOR_PATHS,ALICE_REQUEST,request.authority.controlPlanePath,ALICE_STATE,request.authority.currentProgressPath,ALICE_DECISION]){
  const pinned=execFileSync('git',['show',head+':'+p],{maxBuffer:10000000});need(blob(pinned)===blob(fs.readFileSync(p)),'I66_ALICE_CHECKOUT_BYTES');
 }
 return {request,requestBytes,publicKeyBytes,head};
}
async function runAlice(checkOnly){
 const {request,requestBytes,publicKeyBytes,head}=loadAliceRequest();if(checkOnly){console.log('I66_ALICE_READBACK_REQUEST=PASS');return;}
 const output=process.env.I66_ALICE_SNAPSHOT_FILE,receipt=process.env.I66_ALICE_PUBLIC_RECEIPT_FILE,tmp=process.env.RUNNER_TEMP;
 need(output&&receipt&&tmp&&output!==receipt&&[output,receipt].every(p=>path.resolve(p).startsWith(path.resolve(tmp)+path.sep)),'I66_ALICE_PRIVATE_RUNNER_OUTPUT_REQUIRED');
 const {initializeApp,cert,deleteApp}=await import('firebase-admin/app'),{getFirestore}=await import('firebase-admin/firestore');
 const app=initializeApp({credential:cert(sa()),projectId:PROJECT},'i66-alice-private-matching');
 try{
  const payload=await captureAliceSnapshot({db:getFirestore(app),request,requestBytes,head}),envelope=encryptAliceSnapshot(payload,publicKeyBytes),encoded=JSON.stringify(envelope);
  fs.writeFileSync(output,encoded,{mode:0o600,flag:'wx'});fs.writeFileSync(receipt,JSON.stringify(alicePublicReceipt(payload,envelope,encoded),null,2)+'\n',{mode:0o600,flag:'wx'});
  console.log('I66_ALICE_ENCRYPTED_SNAPSHOT=CAPTURED_NOT_MATCHED_NOT_IMPORTED');console.log('I66_ALICE_SCOPED_COUNTS='+JSON.stringify(payload.counts));console.log('I66_ALICE_WRITES=0');
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
 if(args.length===1&&args[0]==='--check-alice-gt-request')return runAlice(true);
 if(args.length===1&&args[0]==='--alice-gt-readonly')return runAlice(false);
 if(args.length===1&&args[0]==='--check-october-request')return runOctober(true);
 if(args.length===1&&args[0]==='--october-readonly')return runOctober(false);
 need(args.length===0,'I65_SNAPSHOT_MODE_DENIED');return runLegacy();
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{await main();}catch(error){const text=String(error?.message||''),code=/^I6[56]_[A-Z0-9_]+$/.test(text)?text:/^[a-z0-9_/-]{1,80}$/i.test(String(error?.code||''))?String(error.code):'READBACK_FAILED';console.error('I65_SNAPSHOT_HOLD:'+code);process.exitCode=42;}
}
