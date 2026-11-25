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
export const ALICE_SUPPLEMENT_PROFILE='ALICE_MISSING_BUSINESS_OUTBOUND_MINIMAL_V1';
export const ALICE_OUTBOUND_FIELDS=Object.freeze(['version','notificationChannels','portalResponseEnabled','cadenceEnabled']);
export const ALICE_SUPPLEMENT_PREDECESSOR=Object.freeze({runId:45517303032,runAttempt:1,sourceHeadSha:'4e8322fb230a270f79791ed408ad954254ce1870',artifactId:14978841517,artifactSha256:'79d4f108de8882fa46239bf3ea15cb1d543631fa2b01ea9b363e549bd771b4f1',requestBlobSha:'f397fe85f5abe172446eb61b6f71e913e70d39b2',encryptedPayloadSha256:'1f9b41cddfde35e9e1f2050b038c1a23b457cd295005012c58bed9304076388e',plaintextSha256:'6da0cbd8b9ae92f09770fcd03dee1b0ae471698e1c6393637637b3a5fa7af435',publicReceiptSha256:'e11870edf31c64fdda94385f651106f5f3d5f6485795f15dc7275e65e93f3ff9',businessesScanned:16,missingCountryBusinesses:3,conflictingCountryBusinesses:0,clientIdentitiesAlreadyCaptured:450,gtPoliciesAlreadyCaptured:1319});
export const ALICE_SUPPLEMENT_SCOPE=Object.freeze({riskCountry:'GT',riskCountryInferred:false,businessCollection:'negocios',countryDirectoryFields:ALICE_COUNTRY_FIELDS,identityCountryClasses:['MISSING','CONFLICT'],expectedUnknownBusinessCount:3,maxUnknownBusinessIdentities:3,otherBusinessIdentitiesRead:false,clientIdentitiesReread:false,policyIdentitiesReread:false,clientCountryIsNotRiskCountry:true,phonePrefixIsNotCountry:true,outboundConfigurationPath:'tenants/alianzas-soluciones/config/workflow',outboundConfigurationFields:ALICE_OUTBOUND_FIELDS,fullDocuments:false,matchingOnly:true,imports:false,externalMessages:false,configurationDefaultsApplied:false,outboundSuppressionCertified:false});
const ALICE_FORBIDDEN=Object.freeze([...FORBIDDEN,'iamWrites','backendChanges','outboxWrites','grantWrites','makeActivation']);
function aliceKeys(value,expected,code){need(value&&typeof value==='object'&&!Array.isArray(value)&&same(Object.keys(value).sort(),[...expected].sort()),code);}
function aliceSupplementContract(request){
 need(request.profile===ALICE_SUPPLEMENT_PROFILE&&same(request.collections,['negocios'])&&same(request.fieldProjection,{negocios:ALICE_FIELDS.negocios})&&same(request.readScope,ALICE_SUPPLEMENT_SCOPE),'I66_ALICE_SUPPLEMENT_READ_SCOPE');
 need(same(request.predecessorCapture,ALICE_SUPPLEMENT_PREDECESSOR),'I66_ALICE_SUPPLEMENT_PREDECESSOR');
 need(Number.isInteger(request.maxDocumentsPerCollection)&&request.maxDocumentsPerCollection>0&&request.maxDocumentsPerCollection<=100&&Number.isInteger(request.pageSize)&&request.pageSize>0&&request.pageSize<=25&&request.identityBatchSize===3,'I66_ALICE_SUPPLEMENT_BOUNDS');
}
export function validateAliceRequest({request,requestBytes,control,controlBytes,state,stateBytes,progress,progressBytes,decisionBytes,publicKeyBytes,fileBytes,branch,head}){
 need(branch==='recovery/fase-a-clean-20260831'&&/^[a-f0-9]{40}$/.test(head||''),'I66_ALICE_CANONICAL_HEAD_REQUIRED');
 const supplement=request?.profile===ALICE_SUPPLEMENT_PROFILE;
 aliceKeys(request,['schema','profile','status','projectId','tenantId','riskCountry','source','readScope','collections','fieldProjection','authority','executableFiles','maxDocumentsPerCollection','pageSize','identityBatchSize','publicKeyPath','publicKeySha256','capabilities','encryptedOnly','repositoryPlaintextForbidden',...(supplement?['predecessorCapture']:[])],'I66_ALICE_REQUEST_SHAPE');
 need(request.schema==='GRAVICENTRA_I66_ALICE_PRIVATE_MATCHING_REQUEST_V1'&&[ALICE_PROFILE,ALICE_SUPPLEMENT_PROFILE].includes(request.profile)&&request.status==='AUTHORIZED_READ_ONLY_MATCHING','I66_ALICE_PROFILE_NOT_ACTIVE');
 need(request.projectId===PROJECT&&request.tenantId===TENANT&&request.riskCountry==='GT','I66_ALICE_TENANT_COUNTRY');
 aliceKeys(request.source,['workbookSha256','advance','declaredCutoff','declaredCoverageStart','latestAdvanceVerified'],'I66_ALICE_SOURCE_SHAPE');
 need(same(request.source,{workbookSha256:ALICE_WORKBOOK_SHA256,advance:10,declaredCutoff:'2026-11-24',declaredCoverageStart:'2026-09-01',latestAdvanceVerified:false}),'I66_ALICE_WORKBOOK_BINDING');
 if(supplement)aliceSupplementContract(request);
 else need(same(request.collections,ALICE_COLLECTIONS)&&same(request.fieldProjection,ALICE_FIELDS)&&same(request.readScope,ALICE_READ_SCOPE),'I66_ALICE_READ_SCOPE');
 aliceKeys(request.capabilities,[...ALICE_FORBIDDEN,'operationalWrites'],'I66_ALICE_CAPABILITY_SHAPE');
 need(ALICE_FORBIDDEN.every(k=>request.capabilities[k]===false)&&request.capabilities.operationalWrites===0&&request.encryptedOnly===true&&request.repositoryPlaintextForbidden===true,'I66_ALICE_WRITE_OR_PLAINTEXT_DENIED');
 if(!supplement)need(Number.isInteger(request.maxDocumentsPerCollection)&&request.maxDocumentsPerCollection>0&&request.maxDocumentsPerCollection<=20000&&Number.isInteger(request.pageSize)&&request.pageSize>0&&request.pageSize<=500&&request.identityBatchSize===10,'I66_ALICE_PAGINATION_BOUNDS');
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
 return projectAliceIdentity(collection,document,countryClass);
}
function projectAliceIdentity(collection,document,countryClass){
 const raw=document.data()||{},id=String(document.id||'');
 const data={},heldFields=[];
 for(const key of ALICE_FIELDS[collection])if(Object.prototype.hasOwnProperty.call(raw,key)){
  const v=aliceSafeValue(raw[key]);if(v.ok)data[key]=v.value;else heldFields.push(key);
 }
 const storedId=data.id??null;data.id=id;data.tenantId=TENANT;
 return {...data,canonicalDocumentId:id,__snapshot:{storedId,idMismatch:storedId!=null&&String(storedId)!==id,projection:collection==='clientes'?'TENANT_CLIENT_IDENTITY_CONTACT_COUNTRY_ONLY':countryClass==='GT'?'GT_RISK_IDENTITY_RELATION_STAGE_PRODUCT_ONLY':'UNKNOWN_RISK_COUNTRY_IDENTITY_ONLY_NO_COUNTRY_INFERENCE',countryClass,clientCountryIsNotRiskCountry:collection==='clientes',projectedDataSha256:sha(JSON.stringify(stable(data))),projectionHeldFields:heldFields,createTimeExact:exactTime(document.createTime),updateTimeExact:exactTime(document.updateTime),readTimeExact:exactTime(document.readTime)}};
}
export function projectAliceUnknownBusiness(document){
 const raw=document.data()||{},countryClass=classifyAliceCountry(raw);
 need(String(document.id||'')&&['MISSING','CONFLICT'].includes(countryClass),'I66_ALICE_UNKNOWN_BUSINESS_SCOPE');
 return projectAliceIdentity('negocios',document,countryClass);
}
function aliceCollection(db,name){need(ALICE_COLLECTIONS.includes(name),'I66_ALICE_COLLECTION_DENIED');return db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items');}
export async function captureAliceSnapshot({db,request,requestBytes,head,now=()=>new Date().toISOString()}){
 need(requestBytes&&same(JSON.parse(requestBytes),request),'I66_ALICE_REQUEST_BYTES');
 if(request.profile===ALICE_SUPPLEMENT_PROFILE)return captureAliceSupplement({db,request,requestBytes,head,now});
 need(request.profile===ALICE_PROFILE,'I66_ALICE_PROFILE_NOT_ACTIVE');
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
function aliceCountryMetadata(raw){
 const data={},heldFields=[];
 for(const key of ['pais','country'])if(Object.hasOwn(raw,key)){
  const value=aliceSafeValue(raw[key]);if(value.ok)data[key]=value.value;else heldFields.push(key);
 }
 return {data,heldFields,sha256:sha(JSON.stringify(stable(data)))};
}
async function captureAliceOutboundConfiguration(db){
 const snap=await db.collection('tenants').doc(TENANT).collection('config').where('__name__','==','workflow').select(...ALICE_OUTBOUND_FIELDS).limit(2).get();
 need(Array.isArray(snap.docs)&&snap.docs.length<=1&&snap.docs.every(d=>d.id==='workflow'),'I66_ALICE_OUTBOUND_CONFIGURATION_SCOPE');
 const doc=snap.docs[0],holds=[],data={},heldFields=[];
 if(doc){
  need(exactTime(doc.updateTime),'I66_ALICE_OUTBOUND_UPDATE_TIME_REQUIRED');
  const raw=doc.data()||{};
  for(const key of ALICE_OUTBOUND_FIELDS)if(Object.hasOwn(raw,key)){
   const v=raw[key],allowed=v===null||(key==='notificationChannels'?Array.isArray(v)&&v.length<=25&&v.every(x=>typeof x==='string'&&x.length<=80):key==='version'?typeof v==='string'&&v.length<=120:typeof v==='boolean');
   if(allowed)data[key]=v;else heldFields.push(key);
  }
  if(heldFields.length)holds.push('OUTBOUND_CONFIGURATION_PROJECTION_HOLD');
  if(!Array.isArray(data.notificationChannels))holds.push('OUTBOUND_CHANNELS_NOT_EXPLICIT_ARRAY');
 }else holds.push('OUTBOUND_CONFIGURATION_MISSING');
 return {path:ALICE_SUPPLEMENT_SCOPE.outboundConfigurationPath,exists:!!doc,projectedFields:ALICE_OUTBOUND_FIELDS,data,missingFields:ALICE_OUTBOUND_FIELDS.filter(k=>!Object.hasOwn(data,k)),heldFields,updateTimeExact:exactTime(doc?.updateTime),readTimeExact:exactTime(snap.readTime),projectedDataSha256:sha(JSON.stringify(stable(data))),defaultsApplied:false,cadenceDisablesOutbox:false,notificationSuppressionCertified:false,requiresCanonicalWritePlanReview:true,holds};
}
export async function captureAliceSupplement({db,request,requestBytes,head,now=()=>new Date().toISOString()}){
 need(requestBytes&&same(JSON.parse(requestBytes),request),'I66_ALICE_REQUEST_BYTES');aliceSupplementContract(request);
 const startedAt=now(),ref=aliceCollection(db,'negocios'),directory=[],selected=[],pages=[],holds=[];
 const totals={scanned:0,gt:0,co:0,otherCountry:0,missingCountry:0,conflictingCountry:0};
 let lastId=null,exhausted=false;
 while(!exhausted){
  const pageLimit=Math.min(request.pageSize,request.maxDocumentsPerCollection-totals.scanned+1);
  let query=ref.orderBy('__name__').select(...ALICE_COUNTRY_FIELDS).limit(pageLimit);
  if(lastId!==null)query=query.startAfter(lastId);
  const snap=await query.get();need(Array.isArray(snap.docs)&&snap.docs.length<=pageLimit,'I66_ALICE_DIRECTORY_PAGE');
  for(const doc of snap.docs){
   const id=String(doc.id||'');need(id&&(!lastId||Buffer.compare(Buffer.from(id),Buffer.from(lastId))>0),'I66_ALICE_PAGINATION_DUPLICATE_OR_ORDER');
   lastId=id;totals.scanned++;need(totals.scanned<=request.maxDocumentsPerCollection,'I66_ALICE_DOCUMENT_BOUND_EXCEEDED');
   const raw=doc.data()||{},countryClass=classifyAliceCountry(raw),updateTimeExact=exactTime(doc.updateTime);need(updateTimeExact,'I66_ALICE_UPDATE_TIME_REQUIRED');
   const country=aliceCountryMetadata(raw),entry={id,country:country.data,countryClass,countryProjectionHeldFields:country.heldFields,countryProjectionSha256:country.sha256,updateTimeExact};
   directory.push(entry);totals[countryClass==='GT'?'gt':countryClass==='CO'?'co':countryClass==='OTHER'?'otherCountry':countryClass==='MISSING'?'missingCountry':'conflictingCountry']++;
   if(['MISSING','CONFLICT'].includes(countryClass))selected.push(entry);
  }
  exhausted=snap.docs.length<pageLimit;pages.push({count:snap.docs.length,readTimeExact:exactTime(snap.readTime),exhausted});
 }
 const identities=[];
 if(selected.length!==ALICE_SUPPLEMENT_SCOPE.expectedUnknownBusinessCount)holds.push('UNKNOWN_BUSINESS_COUNT_CHANGED_NO_IDENTITY_READS');
 else{
  const byId=new Map(selected.map(x=>[x.id,x])),snap=await ref.where('__name__','in',[...byId.keys()]).select(...ALICE_FIELDS.negocios).get();
  need(Array.isArray(snap.docs)&&snap.docs.length===selected.length,'I66_ALICE_IDENTITY_DISAPPEARED');
  const seen=new Set();
  for(const doc of snap.docs){
   need(byId.has(doc.id)&&!seen.has(doc.id),'I66_ALICE_UNREQUESTED_OR_DUPLICATE_IDENTITY');seen.add(doc.id);
   const expected=byId.get(doc.id),raw=doc.data()||{};
   need(same(exactTime(doc.updateTime),expected.updateTimeExact),'I66_ALICE_CHANGED_DURING_CAPTURE');
   need(classifyAliceCountry(raw)===expected.countryClass&&aliceCountryMetadata(raw).sha256===expected.countryProjectionSha256,'I66_ALICE_COUNTRY_CHANGED_DURING_CAPTURE');
   identities.push(projectAliceUnknownBusiness(doc));
  }
 }
 identities.sort((a,b)=>Buffer.compare(Buffer.from(a.id),Buffer.from(b.id)));
 const projectionHolds=identities.filter(x=>x.__snapshot.projectionHeldFields.length||x.__snapshot.idMismatch).length;
 if(projectionHolds)holds.push('BUSINESS_IDENTITY_PROJECTION_HOLD');
 const configuration=await captureAliceOutboundConfiguration(db);holds.push(...configuration.holds);
 const collections={negocios:{...totals,exported:identities.length,projectionHolds,pages:pages.length,paginationComplete:exhausted,readTimes:pages.map(p=>p.readTimeExact),identityReadbackExact:identities.length===3,scope:'CURRENT_UNKNOWN_COUNTRY_BUSINESSES_ONLY',identityIndexCompleteForQueriedPages:false,countryFactsComplete:false,absenceInferenceAllowed:false}};
 return {schema:'GRAVICENTRA_I66_ALICE_ENCRYPTED_MATCHING_SNAPSHOT_V1',profile:ALICE_SUPPLEMENT_PROFILE,createdAt:now(),projectId:PROJECT,tenantId:TENANT,riskCountry:'GT',riskCountryInferred:false,headSha:head,authority:request.authority,requestPath:ALICE_REQUEST,requestBlobSha:blob(requestBytes),requestSha256:sha(requestBytes),source:request.source,predecessorCapture:request.predecessorCapture,readWindow:{startedAt,completedAt:now(),atomicAcrossCollections:false,newDocumentsAfterPageReadNotRuledOut:true},counts:{negocios:identities.length,workflowConfiguration:configuration.exists?1:0},collections,directory:{negocios:directory},data:{negocios:identities},outboundConfiguration:configuration,reusedPreviousClientAndPolicyProjection:true,previousClientOrPolicyReads:0,holds,completeForQueriedPages:true,matchingPerformed:false,eligibleForImport:false,absenceInferenceAllowed:false,writes:0,operationalWrites:0};
}
export function encryptAliceSnapshot(payload,publicKeyBytes){
 const encrypted=encryptOctoberSnapshot(payload,publicKeyBytes);
 return {...encrypted,schema:'GRAVICENTRA_I66_ALICE_ENCRYPTED_ENVELOPE_V1',profile:payload.profile,authorityBaseHead:payload.authority.sourceBaseHead,workbookSha256:payload.source.workbookSha256,requestPath:payload.requestPath,requestBlobSha:payload.requestBlobSha,requestSha256:payload.requestSha256};
}
export function alicePublicReceipt(payload,envelope,encoded){
 const supplement=payload.profile===ALICE_SUPPLEMENT_PROFILE;
 return {schema:'GRAVICENTRA_I66_ALICE_PRIVATE_MATCHING_READBACK_RECEIPT_V1',status:supplement?'ENCRYPTED_UNKNOWN_BUSINESS_AND_OUTBOUND_CAPTURE_NOT_MATCHED_NOT_IMPORTED':'ENCRYPTED_GT_RISK_AND_TENANT_IDENTITY_CAPTURE_NOT_MATCHED_NOT_IMPORTED',profile:payload.profile,sourceHeadSha:payload.headSha,authorityBaseHead:payload.authority.sourceBaseHead,currentProgressPath:payload.authority.currentProgressPath,currentProgressBlobSha:payload.authority.currentProgressBlobSha,workbookSha256:payload.source.workbookSha256,sourceLatestAdvanceVerified:false,counts:payload.counts,collections:payload.collections,...(supplement?{predecessorCapture:payload.predecessorCapture,holdCodes:payload.holds,previousClientOrPolicyReads:payload.previousClientOrPolicyReads,outboundConfigurationObserved:payload.outboundConfiguration.exists,outboundConfigurationProjectionSha256:payload.outboundConfiguration.projectedDataSha256,notificationSuppressionCertified:false}:{}),readWindow:payload.readWindow,encryptedPayloadSha256:sha(encoded),plaintextSha256:envelope.plaintextSha256,publicKeySha256:envelope.publicKeySha256,requestPath:payload.requestPath,requestBlobSha:payload.requestBlobSha,requestSha256:payload.requestSha256,encryptedOnly:true,containsPlaintextPII:false,matchingPerformed:false,eligibleForImport:false,absenceInferenceAllowed:false,writes:0,operationalWrites:0,deploy:false,acceptanceGranted:false};
}
export function validateAliceTrigger({eventName,aliceFlag,octoberFlag,financialFlag,commitMessage,repository,branch,head,expectedSha,headCommitSha}){
 need(repository==='paulaosoriof86/orbit360-core'&&branch==='recovery/fase-a-clean-20260831','I66_ALICE_CANONICAL_TRIGGER_REQUIRED');
 need(/^[a-f0-9]{40}$/.test(head||'')&&head===expectedSha,'I66_ALICE_EXECUTION_SHA_MISMATCH');
 const message=String(commitMessage||''),markers=message.match(/(?:^|\s)\[alice-private-matching-readback\](?=\s|$)/g)||[];
 need(octoberFlag!=='true'&&financialFlag!=='true'&&!message.includes('[october-private-readback]')&&!message.includes('[i66-financial-private-readback]'),'I66_ALICE_MIXED_READ_PROFILES_DENIED');
 need(aliceFlag==='true'&&((eventName==='workflow_dispatch'&&markers.length<=1)||
  (eventName==='push'&&markers.length===1&&headCommitSha===head)),'I66_ALICE_EXPLICIT_PROFILE_REQUIRED');
 return {profile:ALICE_PROFILE,eventName,headSha:head,readOnly:true};
}
function loadAliceRequest(){
 const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 validateAliceTrigger({eventName:process.env.GITHUB_EVENT_NAME,aliceFlag:process.env.I66_ALICE_PRIVATE_READBACK,
  octoberFlag:process.env.I65_OCTOBER_PRIVATE_READBACK,financialFlag:process.env.I66_FINANCIAL_PRIVATE_READBACK,commitMessage:process.env.PRIVATE_READBACK_COMMIT_MESSAGE,
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

// Current I6.6 financial evidence uses the existing financial projections and
// encrypted transport. It does not reuse October's grant, period or source base.
export const FINANCIAL_PROFILE='I66_CURRENT_FINANCIAL_BASELINE_V1';
export const FINANCIAL_COLLECTIONS=OCTOBER_COLLECTIONS;
export const FINANCIAL_REQUEST=OCTOBER_ROOT+'I6_6_FINANCIAL_CURRENT_PRIVATE_READBACK_REQUEST_20261125.json';
export const FINANCIAL_PUBLIC_KEY=OCTOBER_ROOT+'I6_6_FINANCIAL_CURRENT_SNAPSHOT_PUBLIC_KEY_20261125.pem';
export const FINANCIAL_TEST='tools/gravicentra-i66-financial-private-snapshot.test.mjs';
export const FINANCIAL_EXECUTOR_PATHS=Object.freeze([OCTOBER_PATHS[0],OCTOBER_PATHS[1],FINANCIAL_TEST,FINANCIAL_PUBLIC_KEY]);
export const FINANCIAL_DECISION=ALICE_DECISION;
export const FINANCIAL_DECISION_BLOB=ALICE_DECISION_BLOB;
export const FINANCIAL_SOURCE_RECEIPT=OCTOBER_ROOT+'I6_6_NEW_INSURER_SOURCE_RECOVERY_SANITIZED_20261124_R63.json';
export const FINANCIAL_SOURCE_RECEIPT_BLOB='43c9918d2da47cb4753aaa392b581573d0b98173';
export const FINANCIAL_CONFIG_FIELDS=Object.freeze({asesores:['comModo','shareCom','comValor'],aseguradoras:['comisionDefault','comisiones','comisionesProd']});
export const FINANCIAL_SOURCE=Object.freeze({documentaryPeriod:'2026-11',sourceEvidenceDate:'2026-11-24',
 baselineObservation:'CURRENT_AT_CAPTURE_NOT_DOCUMENTARY_CUTOFF',sourceReceipt:{path:FINANCIAL_SOURCE_RECEIPT,gitBlobSha:FINANCIAL_SOURCE_RECEIPT_BLOB},
 privateReferenceQuery:{sha256:'46013562cc92dd4c8aa735745f91643ce3b4bd36f2c8280732ef657f43d684ee',bytes:21219,policies:27,references:108,selectorsPublished:false},
 latestStatementsCompletenessClaimed:false});
export const FINANCIAL_READ_SCOPE=Object.freeze({collectionRoot:'tenants/alianzas-soluciones/data/{collection}/items',
 countryFilter:'NONE_WITHIN_AUTHORIZED_TENANT',coreProjection:'EXISTING_CANONICAL_FINANCIAL_DOCUMENT',
 directoryProjection:'EXISTING_FINANCIAL_CONFIGURATION_AND_IDENTITY',separateConfigCollection:false,
 directoryCredentialsExported:false,matchingPerformed:false,noEligibilityEffect:true,imports:false,externalMessages:false});
export const FINANCIAL_FORBIDDEN=Object.freeze([...ALICE_FORBIDDEN,'bankTransfers','paymentApplications','receiptCreates']);
export function validateFinancialRequest({request,requestBytes,control,controlBytes,state,stateBytes,progress,progressBytes,
 decisionBytes,sourceReceiptBytes,publicKeyBytes,fileBytes,branch,head}){
 need(branch==='recovery/fase-a-clean-20260831'&&/^[a-f0-9]{40}$/.test(head||''),'I66_FINANCIAL_CANONICAL_HEAD_REQUIRED');
 aliceKeys(request,['schema','profile','status','projectId','tenantId','purpose','source','readScope','collections','configSourceFields',
  'authority','executableFiles','maxDocumentsPerCollection','publicKeyPath','publicKeySha256','capabilities','encryptedOnly','repositoryPlaintextForbidden'],'I66_FINANCIAL_REQUEST_SHAPE');
 need(request.schema==='GRAVICENTRA_I66_FINANCIAL_PRIVATE_READBACK_REQUEST_V1'&&request.profile===FINANCIAL_PROFILE&&
  request.status==='AUTHORIZED_READ_ONLY_CURRENT_FINANCIAL_BASELINE','I66_FINANCIAL_PROFILE_NOT_ACTIVE');
 need(request.projectId===PROJECT&&request.tenantId===TENANT&&request.purpose==='NOVEMBER_RECENT_STATEMENT_RECONCILIATION_PREIMAGES_ONLY','I66_FINANCIAL_TENANT_PURPOSE');
 need(same(request.source,FINANCIAL_SOURCE)&&same(request.readScope,FINANCIAL_READ_SCOPE)&&same(request.collections,FINANCIAL_COLLECTIONS)&&
  same(request.configSourceFields,FINANCIAL_CONFIG_FIELDS),'I66_FINANCIAL_EXACT_READ_SCOPE');
 aliceKeys(request.capabilities,[...FINANCIAL_FORBIDDEN,'operationalWrites'],'I66_FINANCIAL_CAPABILITY_SHAPE');
 need(FINANCIAL_FORBIDDEN.every(k=>request.capabilities[k]===false)&&request.capabilities.operationalWrites===0&&request.encryptedOnly===true&&
  request.repositoryPlaintextForbidden===true,'I66_FINANCIAL_WRITE_OR_PLAINTEXT_DENIED');
 need(Number.isInteger(request.maxDocumentsPerCollection)&&request.maxDocumentsPerCollection>0&&request.maxDocumentsPerCollection<=20000,'I66_FINANCIAL_DOCUMENT_BOUND');
 const a=request.authority;
 aliceKeys(a,['sourceBaseHead','controlPlanePath','controlPlaneBlobSha','recoveryStatePath','recoveryStateBlobSha','currentProgressPath','currentProgressBlobSha',
  'activeGate','formalDataCutoff','executionCursor','decisionPath','decisionBlobSha','sourceEvidencePath','sourceEvidenceBlobSha','cursorChanged'],'I66_FINANCIAL_AUTHORITY_SHAPE');
 need(/^[a-f0-9]{40}$/.test(a.sourceBaseHead||'')&&a.controlPlanePath==='artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json'&&
  a.controlPlaneBlobSha===blob(controlBytes)&&a.recoveryStatePath===ALICE_STATE&&a.recoveryStateBlobSha===blob(stateBytes),'I66_FINANCIAL_CURRENT_CONTROL_BINDING');
 need(same(JSON.parse(controlBytes),control)&&same(JSON.parse(stateBytes),state)&&same(JSON.parse(progressBytes),progress),'I66_FINANCIAL_AUTHORITY_BYTES');
 need(a.activeGate==='I6.6'&&progress.activeGate==='I6.6'&&a.formalDataCutoff==='2026-07-31'&&state.currentIteration===6&&
  state.dataCutoff===a.formalDataCutoff&&a.cursorChanged===false,'I66_FINANCIAL_CURRENT_CUTOFF');
 need(/^I6_6_/.test(control.postproductionDataUpdateControl?.status||'')&&a.executionCursor===control.postproductionDataUpdateControl?.executionCursor&&
  /^I6_6_/.test(a.executionCursor||''),'I66_FINANCIAL_CURRENT_CURSOR');
 need(/^artifacts\/orbit360-recovery\/release-control\/I6_6_CURRENT_EXECUTION_PROGRESS_[0-9]{8}_R[0-9]+\.json$/.test(a.currentProgressPath||'')&&
  control.i66ActiveRecoveryCursor?.currentEvidencePath===a.currentProgressPath&&control.i66ActiveRecoveryCursor?.currentEvidenceBlobSha===a.currentProgressBlobSha&&
  blob(progressBytes)===a.currentProgressBlobSha,'I66_FINANCIAL_CURRENT_PROGRESS');
 need(a.decisionPath===FINANCIAL_DECISION&&a.decisionBlobSha===FINANCIAL_DECISION_BLOB&&blob(decisionBytes)===FINANCIAL_DECISION_BLOB&&
  progress.currentDirectionOperationalDecision?.path===FINANCIAL_DECISION&&progress.currentDirectionOperationalDecision?.gitBlobSha===FINANCIAL_DECISION_BLOB,'I66_FINANCIAL_CURRENT_DIRECTION_DECISION');
 need(a.sourceEvidencePath===FINANCIAL_SOURCE_RECEIPT&&a.sourceEvidenceBlobSha===FINANCIAL_SOURCE_RECEIPT_BLOB&&blob(sourceReceiptBytes)===FINANCIAL_SOURCE_RECEIPT_BLOB&&
  progress.newStatementSourceWork20261124?.currentRecoveredSource114?.receipt?.path===FINANCIAL_SOURCE_RECEIPT&&
  progress.newStatementSourceWork20261124?.currentRecoveredSource114?.receipt?.gitBlobSha===FINANCIAL_SOURCE_RECEIPT_BLOB,'I66_FINANCIAL_CURRENT_SOURCE_EVIDENCE');
 const evidence=JSON.parse(sourceReceiptBytes),query=evidence.preparedExtendedReadback;
 need(query?.querySha256===request.source.privateReferenceQuery.sha256&&query.queryBytes===21219&&query.policySelectors===27&&query.references===108&&
  evidence.sourceFacts?.sourceFactsAreNotIncrementalPayments===true&&evidence.existingApplicationProtection?.repeatExistingPayments===false,'I66_FINANCIAL_PRIVATE_QUERY_BINDING');
 aliceKeys(request.executableFiles,FINANCIAL_EXECUTOR_PATHS,'I66_FINANCIAL_EXECUTOR_SET');
 for(const p of FINANCIAL_EXECUTOR_PATHS)need(fileBytes[p]&&blob(fileBytes[p])===request.executableFiles[p],'I66_FINANCIAL_EXECUTOR_BYTES');
 need(requestBytes&&same(JSON.parse(requestBytes),request),'I66_FINANCIAL_REQUEST_BYTES');
 need(request.publicKeyPath===FINANCIAL_PUBLIC_KEY&&request.publicKeySha256===sha(publicKeyBytes)&&same(publicKeyBytes,fileBytes[FINANCIAL_PUBLIC_KEY]),'I66_FINANCIAL_RECIPIENT_KEY');
 const key=crypto.createPublicKey(publicKeyBytes);need(key.asymmetricKeyType==='rsa'&&(key.asymmetricKeyDetails?.modulusLength||0)>=3072&&
  (key.asymmetricKeyDetails?.modulusLength||0)<=8192,'I66_FINANCIAL_RECIPIENT_STRENGTH');
 return request;
}
export function validateFinancialTrigger({eventName,financialFlag,aliceFlag,octoberFlag,commitMessage,repository,branch,head,expectedSha,headCommitSha}){
 need(repository==='paulaosoriof86/orbit360-core'&&branch==='recovery/fase-a-clean-20260831','I66_FINANCIAL_CANONICAL_TRIGGER_REQUIRED');
 need(/^[a-f0-9]{40}$/.test(head||'')&&head===expectedSha,'I66_FINANCIAL_EXECUTION_SHA_MISMATCH');
 const message=String(commitMessage||''),markers=message.match(/(?:^|\s)\[i66-financial-private-readback\](?=\s|$)/g)||[];
 need(aliceFlag!=='true'&&octoberFlag!=='true'&&!message.includes('[alice-private-matching-readback]')&&!message.includes('[october-private-readback]'),'I66_FINANCIAL_MIXED_READ_PROFILES_DENIED');
 need(financialFlag==='true'&&((eventName==='workflow_dispatch'&&markers.length<=1)||
  (eventName==='push'&&markers.length===1&&headCommitSha===head)),'I66_FINANCIAL_EXPLICIT_PROFILE_REQUIRED');
 return {profile:FINANCIAL_PROFILE,eventName,headSha:head,readOnly:true};
}
export function validateFinancialModeIsolation(args,env){
 const selected=env.I66_FINANCIAL_PRIVATE_READBACK==='true'||String(env.PRIVATE_READBACK_COMMIT_MESSAGE||'').includes('[i66-financial-private-readback]');
 need(!selected||(args.length===1&&['--check-i66-financial-request','--i66-financial-readonly'].includes(args[0])),'I66_FINANCIAL_MIXED_READ_PROFILES_DENIED');
}
function financialTimestamp(value){return value&&/^[0-9]+$/.test(value.seconds||'')&&Number.isInteger(value.nanoseconds)&&value.nanoseconds>=0&&value.nanoseconds<1000000000;}
export async function captureFinancialSnapshot({db,request,requestBytes,head}){
 need(requestBytes&&same(JSON.parse(requestBytes),request),'I66_FINANCIAL_REQUEST_BYTES');
 // Reuse the bounded reader/projection, taking only observational fields. Its
 // historical period/base/manifest labels never enter this current payload.
 const observed=await captureOctoberSnapshot({db,request,head});
 const {counts,collections,data,readWindow,commissionConfiguration}=observed;
 for(const name of FINANCIAL_COLLECTIONS){
  let previous=null;
  for(const row of data[name]){
   need(previous===null||Buffer.compare(Buffer.from(row.id),Buffer.from(previous))>0,'I66_FINANCIAL_DUPLICATE_OR_UNORDERED_DOCUMENT');previous=row.id;
   need(financialTimestamp(row.__snapshot.updateTimeExact),'I66_FINANCIAL_EXACT_UPDATE_TIME_REQUIRED');
  }
  need(financialTimestamp(collections[name].readTimeExact),'I66_FINANCIAL_EXACT_READ_TIME_REQUIRED');
 }
 return {schema:'GRAVICENTRA_I66_FINANCIAL_CURRENT_ENCRYPTED_SNAPSHOT_V1',profile:FINANCIAL_PROFILE,createdAt:observed.createdAt,
  projectId:PROJECT,tenantId:TENANT,headSha:head,authority:request.authority,source:request.source,requestPath:FINANCIAL_REQUEST,
  requestBlobSha:blob(requestBytes),requestSha256:sha(requestBytes),counts,collections,data,readScope:request.readScope,
  readWindow:{...readWindow,newDocumentsAfterCollectionReadNotRuledOut:true},commissionConfiguration,
  exactDocumentUpdateTimes:true,matchingPerformed:false,eligibleForWrite:false,absenceInferenceAllowed:false,
  writes:0,operationalWrites:0,paymentsApplied:0,receiptsCreated:0};
}
export function encryptFinancialSnapshot(payload,publicKeyBytes){
 const encrypted=encryptOctoberSnapshot(payload,publicKeyBytes);
 return {...encrypted,schema:'GRAVICENTRA_I66_FINANCIAL_CURRENT_ENCRYPTED_ENVELOPE_V1',profile:FINANCIAL_PROFILE,
  authorityBaseHead:payload.authority.sourceBaseHead,formalDataCutoff:payload.authority.formalDataCutoff,
  sourceEvidenceDate:payload.source.sourceEvidenceDate,privateReferenceQuerySha256:payload.source.privateReferenceQuery.sha256,
  requestPath:payload.requestPath,requestBlobSha:payload.requestBlobSha,requestSha256:payload.requestSha256};
}
export function financialPublicReceipt(payload,envelope,encoded){
 return {schema:'GRAVICENTRA_I66_FINANCIAL_CURRENT_PRIVATE_READBACK_RECEIPT_V1',status:'ENCRYPTED_CURRENT_FINANCIAL_BASELINE_NOT_MATCHED_NOT_APPLIED',
  profile:FINANCIAL_PROFILE,sourceHeadSha:payload.headSha,authorityBaseHead:payload.authority.sourceBaseHead,
  currentProgressPath:payload.authority.currentProgressPath,currentProgressBlobSha:payload.authority.currentProgressBlobSha,
  formalDataCutoff:payload.authority.formalDataCutoff,documentaryPeriod:payload.source.documentaryPeriod,sourceEvidenceDate:payload.source.sourceEvidenceDate,
  privateReferenceQuerySha256:payload.source.privateReferenceQuery.sha256,counts:payload.counts,collections:payload.collections,readWindow:payload.readWindow,
  encryptedPayloadSha256:sha(encoded),plaintextSha256:envelope.plaintextSha256,publicKeySha256:envelope.publicKeySha256,
  requestPath:payload.requestPath,requestBlobSha:payload.requestBlobSha,requestSha256:payload.requestSha256,
  encryptedOnly:true,containsPlaintextPII:false,exactDocumentUpdateTimes:true,matchingPerformed:false,eligibleForWrite:false,
  absenceInferenceAllowed:false,writes:0,operationalWrites:0,paymentsApplied:0,receiptsCreated:0,deploy:false,acceptanceGranted:false};
}
function loadFinancialRequest(){
 const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 validateFinancialTrigger({eventName:process.env.GITHUB_EVENT_NAME,financialFlag:process.env.I66_FINANCIAL_PRIVATE_READBACK,
  aliceFlag:process.env.I66_ALICE_PRIVATE_READBACK,octoberFlag:process.env.I65_OCTOBER_PRIVATE_READBACK,
  commitMessage:process.env.PRIVATE_READBACK_COMMIT_MESSAGE,repository:process.env.GITHUB_REPOSITORY,branch:process.env.GITHUB_REF_NAME,
  head,expectedSha:process.env.GITHUB_SHA,headCommitSha:process.env.PRIVATE_READBACK_HEAD_COMMIT_SHA});
 const requestBytes=fs.readFileSync(FINANCIAL_REQUEST),request=JSON.parse(requestBytes),controlBytes=fs.readFileSync('artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json'),
  control=JSON.parse(controlBytes),stateBytes=fs.readFileSync(ALICE_STATE),state=JSON.parse(stateBytes);
 need(request?.authority?.currentProgressPath===control.i66ActiveRecoveryCursor?.currentEvidencePath,'I66_FINANCIAL_CURRENT_PROGRESS_PATH');
 const progressBytes=fs.readFileSync(request.authority.currentProgressPath),progress=JSON.parse(progressBytes),decisionBytes=fs.readFileSync(FINANCIAL_DECISION),
  sourceReceiptBytes=fs.readFileSync(FINANCIAL_SOURCE_RECEIPT),publicKeyBytes=fs.readFileSync(FINANCIAL_PUBLIC_KEY),
  fileBytes=Object.fromEntries(FINANCIAL_EXECUTOR_PATHS.map(p=>[p,fs.readFileSync(p)]));
 validateFinancialRequest({request,requestBytes,control,controlBytes,state,stateBytes,progress,progressBytes,decisionBytes,sourceReceiptBytes,
  publicKeyBytes,fileBytes,branch:process.env.GITHUB_REF_NAME,head});
 execFileSync('git',['merge-base','--is-ancestor',request.authority.sourceBaseHead,head],{stdio:'pipe'});
 for(const p of [...FINANCIAL_EXECUTOR_PATHS,request.authority.controlPlanePath,ALICE_STATE,request.authority.currentProgressPath,FINANCIAL_DECISION,FINANCIAL_SOURCE_RECEIPT]){
  const pinned=execFileSync('git',['show',request.authority.sourceBaseHead+':'+p],{maxBuffer:10000000});
  need(blob(pinned)===blob(fs.readFileSync(p)),'I66_FINANCIAL_SOURCE_BASE_BYTES');
 }
 for(const p of [...FINANCIAL_EXECUTOR_PATHS,FINANCIAL_REQUEST,request.authority.controlPlanePath,ALICE_STATE,request.authority.currentProgressPath,FINANCIAL_DECISION,FINANCIAL_SOURCE_RECEIPT]){
  const pinned=execFileSync('git',['show',head+':'+p],{maxBuffer:10000000});need(blob(pinned)===blob(fs.readFileSync(p)),'I66_FINANCIAL_CHECKOUT_BYTES');
 }
 return {request,requestBytes,publicKeyBytes,head};
}
async function runFinancial(checkOnly){
 const {request,requestBytes,publicKeyBytes,head}=loadFinancialRequest();if(checkOnly){console.log('I66_FINANCIAL_READBACK_REQUEST=PASS');return;}
 const output=process.env.I66_FINANCIAL_SNAPSHOT_FILE,receipt=process.env.I66_FINANCIAL_PUBLIC_RECEIPT_FILE,tmp=process.env.RUNNER_TEMP;
 need(output&&receipt&&tmp&&path.resolve(output)!==path.resolve(receipt)&&[output,receipt].every(p=>path.resolve(p).startsWith(path.resolve(tmp)+path.sep)),
  'I66_FINANCIAL_PRIVATE_RUNNER_OUTPUT_REQUIRED');
 const {initializeApp,cert,deleteApp}=await import('firebase-admin/app'),{getFirestore}=await import('firebase-admin/firestore');
 const app=initializeApp({credential:cert(sa()),projectId:PROJECT},'i66-financial-current-private-readback');
 try{
  const payload=await captureFinancialSnapshot({db:getFirestore(app),request,requestBytes,head}),envelope=encryptFinancialSnapshot(payload,publicKeyBytes),encoded=JSON.stringify(envelope);
  fs.writeFileSync(output,encoded,{mode:0o600,flag:'wx'});
  fs.writeFileSync(receipt,JSON.stringify(financialPublicReceipt(payload,envelope,encoded),null,2)+'\n',{mode:0o600,flag:'wx'});
  console.log('I66_FINANCIAL_ENCRYPTED_SNAPSHOT=CAPTURED_NOT_MATCHED_NOT_APPLIED');console.log('I66_FINANCIAL_COUNTS='+JSON.stringify(payload.counts));console.log('I66_FINANCIAL_WRITES=0');
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
 validateFinancialModeIsolation(args,process.env);
 if(args.length===1&&args[0]==='--check-i66-financial-request')return runFinancial(true);
 if(args.length===1&&args[0]==='--i66-financial-readonly')return runFinancial(false);
 if(args.length===1&&args[0]==='--check-alice-gt-request')return runAlice(true);
 if(args.length===1&&args[0]==='--alice-gt-readonly')return runAlice(false);
 if(args.length===1&&args[0]==='--check-october-request')return runOctober(true);
 if(args.length===1&&args[0]==='--october-readonly')return runOctober(false);
 need(args.length===0,'I65_SNAPSHOT_MODE_DENIED');return runLegacy();
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{await main();}catch(error){const text=String(error?.message||''),code=/^I6[56]_[A-Z0-9_]+$/.test(text)?text:/^[a-z0-9_/-]{1,80}$/i.test(String(error?.code||''))?String(error.code):'READBACK_FAILED';console.error('I65_SNAPSHOT_HOLD:'+code);process.exitCode=42;}
}
