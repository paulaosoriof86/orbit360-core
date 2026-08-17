#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { DROPPED_CONTRACT_FIELDS, validateManifestContract } from './orbit360-r4s9c-manifest-contract-gate-v20260817.mjs';

const ROOT=process.cwd(), env=process.env;
const R4S8_ARTIFACT_ZIP=path.resolve(env.R4S8_ARTIFACT_ZIP||'/tmp/r4s8-artifact.zip');
const R4S8_ARTIFACT_ID=Number(env.R4S8_ARTIFACT_ID||9296206724);
const R4S8_INNER_NAME=env.R4S8_INNER_NAME||'orbit360-fase-a-product-r4s8-2427d94758c6.zip';
const R4S8_ZIP_SHA256=env.R4S8_ZIP_SHA256||'265fcac34f436ddf28bba58dc63a9146301e49ded7e26faeac50adf86d5790da';
const R4S8_STATUS=env.R4S8_STATUS||'FASE_A_PRODUCT_R4S8_MINIMAL_SUCCESSOR_CERTIFIED';

const R4S9_ARTIFACT_ZIP=path.resolve(env.R4S9_ARTIFACT_ZIP||'/tmp/r4s9-artifact.zip');
const R4S9_ARTIFACT_ID=Number(env.R4S9_ARTIFACT_ID||9299097141);
const R4S9_INNER_NAME=env.R4S9_INNER_NAME||'orbit360-fase-a-product-r4s9-861326906558.zip';
const R4S9_ZIP_SHA256=env.R4S9_ZIP_SHA256||'9e8566fdc33f4f45b350fd3609c9ee02b22c49edd1d377bff334fc00df902180';
const R4S9_SOURCE_HEAD=env.R4S9_SOURCE_HEAD||'861326906558f03d9c8c2e7f34adfb4979a17d73';
const R4S9_STATUS=env.R4S9_STATUS||'FASE_A_PRODUCT_R4S9_MINIMAL_SUCCESSOR_CERTIFIED';

const SUCCESSOR_STATUS=env.SUCCESSOR_STATUS||'FASE_A_PRODUCT_R4S9C_CONTRACT_RECOVERY_CERTIFIED';
const SUCCESSOR_ZIP=path.resolve(env.SUCCESSOR_ZIP||'orbit360-fase-a-product-r4s9c-contract-recovery-861326906558.zip');
const EVIDENCE_DIR=path.resolve(env.EVIDENCE_DIR||'orbit360-platform/runtime-gate-crm-v20260716');
const GATE_OUT=path.join(EVIDENCE_DIR,'r4s9c-manifest-contract-gate-v20260817.json');
const CERT_OUT=path.join(EVIDENCE_DIR,'r4s9c-contract-recovery-certification-v20260817.json');
const STATIC_OUT=path.join(EVIDENCE_DIR,'r4s9-to-r4s9c-static-compare-v20260817.json');
const SHA_OUT=path.join(EVIDENCE_DIR,'r4s9c-successor-zip-sha256-v20260817.txt');

const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
const fail=m=>{throw new Error(m);};
const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const writeJson=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n','utf8');};
const sh=(cmd,args,opts={})=>execFileSync(cmd,args,{cwd:ROOT,encoding:opts.encoding??'utf8',maxBuffer:64*1024*1024,stdio:opts.stdio??['ignore','pipe','pipe']});
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function rmrf(p){fs.rmSync(p,{recursive:true,force:true});}
function mkdir(p){fs.mkdirSync(p,{recursive:true});}
function listFiles(root,omitManifest=false){
  const out=[]; const walk=p=>{for(const n of fs.readdirSync(p).sort()){const q=path.join(p,n),st=fs.statSync(q);if(st.isDirectory())walk(q);else{const rel=path.relative(root,q).split(path.sep).join('/');if(!(omitManifest&&rel==='orbit360-package-manifest.json'))out.push(rel);}}};walk(root);return out;
}
function fullRehash(root,manifest){
  const errors=[]; for(const item of manifest.files||[]){const p=path.join(root,item.path);if(!fs.existsSync(p)){errors.push(`missing:${item.path}`);continue;}const b=fs.readFileSync(p),h=sha256(b);if(b.length!==item.bytes)errors.push(`bytes:${item.path}`);if(h!==item.sha256)errors.push(`sha:${item.path}`);}
  const actual=listFiles(root,true),declared=(manifest.files||[]).map(x=>x.path).sort();if(!eq(actual,declared))errors.push('file-set-mismatch');return errors;
}
function extractOuterExact(outerZip, expectedInnerName, expectedInnerSha, outDir){
  sh('unzip',['-q',outerZip,'-d',outDir]);
  const names=listFiles(outDir,false);
  if(names.length!==1||names[0]!==expectedInnerName)fail(`OUTER_ARTIFACT_SHAPE_INVALID:${JSON.stringify(names)}`);
  const inner=path.join(outDir,expectedInnerName);
  const actual=sha256(fs.readFileSync(inner));
  if(actual!==expectedInnerSha)fail(`INNER_ZIP_SHA_MISMATCH:${expectedInnerName}:${actual}`);
  return inner;
}
function setEpoch(root,epochSec){const t=new Date(epochSec*1000);const walk=p=>{for(const n of fs.readdirSync(p)){const q=path.join(p,n),st=fs.statSync(q);if(st.isDirectory())walk(q);fs.utimesSync(q,t,t);}};walk(root);fs.utimesSync(root,t,t);}

const work='/tmp/orbit360-r4s9c-contract-recovery';
const o8=path.join(work,'outer8'),o9=path.join(work,'outer9'),r8=path.join(work,'r8'),r9=path.join(work,'r9'),succ=path.join(work,'successor'),reopen=path.join(work,'reopen');
rmrf(work);[o8,o9,r8,r9,succ,reopen].forEach(mkdir);mkdir(EVIDENCE_DIR);

// 1) Recover and fully rehash exact rector R4S8 and exact product base R4S9.
const z8=extractOuterExact(R4S8_ARTIFACT_ZIP,R4S8_INNER_NAME,R4S8_ZIP_SHA256,o8);
const z9=extractOuterExact(R4S9_ARTIFACT_ZIP,R4S9_INNER_NAME,R4S9_ZIP_SHA256,o9);
sh('unzip',['-q',z8,'-d',r8]); sh('unzip',['-q',z9,'-d',r9]);
const m8=readJson(path.join(r8,'orbit360-package-manifest.json'));
const m9=readJson(path.join(r9,'orbit360-package-manifest.json'));
if(m8.status!==R4S8_STATUS||m8.fileCount!==194||(m8.files||[]).length!==194)fail('R4S8_RECTOR_IDENTITY_INVALID');
if(m9.status!==R4S9_STATUS||m9.sourceHead!==R4S9_SOURCE_HEAD||m9.fileCount!==194||(m9.files||[]).length!==194)fail('R4S9_BASE_IDENTITY_INVALID');
const e8=fullRehash(r8,m8),e9=fullRehash(r9,m9);if(e8.length)fail(`R4S8_FULL_REHASH_FAIL:${e8.join('|')}`);if(e9.length)fail(`R4S9_FULL_REHASH_FAIL:${e9.join('|')}`);

// 2) Prove the known contract loss exactly before repair.
const dropped=DROPPED_CONTRACT_FIELDS.filter(k=>Object.prototype.hasOwnProperty.call(m8,k)&&!Object.prototype.hasOwnProperty.call(m9,k));
if(dropped.length!==DROPPED_CONTRACT_FIELDS.length||!eq(dropped,DROPPED_CONTRACT_FIELDS))fail(`DROPPED_CONTRACT_SET_DRIFT:${JSON.stringify(dropped)}`);

// 3) Contract-only successor: copy exact R4S9 tree; product files never sourced from Git and never modified.
fs.cpSync(r9,succ,{recursive:true});
const invariantFields=[
  'containsPrivateSecrets','deployExecuted','dynamicRuntimeClosureCertified','forbiddenFiles','noLabRuntime','noPrivateSecretMaterial',
  'productTenantContextCertified','productionTouched','requiredHydrationCertified','routerRenderCertified','secretMaterialFiles','writeAuthorized'
];
const recovered={};
for(const field of invariantFields) recovered[field]=m8[field];

const manifest={
  ...m9,
  status:SUCCESSOR_STATUS,
  basePackageSha256:R4S9_ZIP_SHA256,
  baseSourceHead:R4S9_SOURCE_HEAD,
  containsPrivateSecrets:recovered.containsPrivateSecrets,
  deltaFiles:[],
  deltaSourceHead:R4S9_SOURCE_HEAD,
  deployExecuted:recovered.deployExecuted,
  dynamicRuntimeClosureCertified:recovered.dynamicRuntimeClosureCertified,
  forbiddenFiles:recovered.forbiddenFiles,
  noLabRuntime:recovered.noLabRuntime,
  noPrivateSecretMaterial:recovered.noPrivateSecretMaterial,
  packageLineage:'R4S9 exact 194-file product tree + R4S8 manifest certification contract recovery; zero product delta',
  productTenantContextCertified:recovered.productTenantContextCertified,
  productionTouched:recovered.productionTouched,
  requiredHydrationCertified:recovered.requiredHydrationCertified,
  routerRenderCertified:recovered.routerRenderCertified,
  secretMaterialFiles:recovered.secretMaterialFiles,
  successorOrdinal:9,
  unchangedFileCount:194,
  writeAuthorized:recovered.writeAuthorized,
  lineage:{
    ...(m9.lineage||{}),
    contractRecovery:{
      rectorStatus:R4S8_STATUS,
      rectorArtifactId:R4S8_ARTIFACT_ID,
      productBaseStatus:R4S9_STATUS,
      productBaseArtifactId:R4S9_ARTIFACT_ID,
      productBaseZipSha256:R4S9_ZIP_SHA256,
      zeroProductDelta:true,
      restoredContractFields:DROPPED_CONTRACT_FIELDS
    }
  }
};
writeJson(path.join(succ,'orbit360-package-manifest.json'),manifest);

// 4) Dedicated R4S8→successor contract gate. Must fail if any of the 19 fields is absent.
const gate=validateManifestContract(m8,manifest,{
  basePackageSha256:R4S9_ZIP_SHA256,baseSourceHead:R4S9_SOURCE_HEAD,deltaSourceHead:R4S9_SOURCE_HEAD,
  successorOrdinal:9,unchangedFileCount:194,zeroProductDelta:true,packageLineageToken:'R4S9'
});
const gateEvidence={
  schemaVersion:'orbit360-r4s9c-manifest-contract-gate-v1',ok:gate.ok,
  status:gate.ok?'R4S9C_MANIFEST_CONTRACT_GATE_PASS':'R4S9C_MANIFEST_CONTRACT_GATE_FAIL',
  classification:gate.ok?'DATA_CONTRACT_FAILURE_ROOTFIX_PACKAGE_PROVEN':'DATA_CONTRACT_FAILURE',
  rectorArtifactId:R4S8_ARTIFACT_ID,productBaseArtifactId:R4S9_ARTIFACT_ID,requiredFieldCount:DROPPED_CONTRACT_FIELDS.length,
  droppedFieldsObservedBeforeRepair:dropped,...gate,browserExecuted:false,runtimeExecuted:false,secretAccess:false,dataAccess:false,
  firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false
};
writeJson(GATE_OUT,gateEvidence);if(!gate.ok)fail(`CONTRACT_GATE_FAIL:${JSON.stringify(gate)}`);

// 5) Prove 194/194 product files are byte-identical to exact R4S9 before packaging.
const productDiff=[];
for(const item of m9.files){const a=fs.readFileSync(path.join(r9,item.path)),b=fs.readFileSync(path.join(succ,item.path));if(a.length!==b.length||sha256(a)!==sha256(b))productDiff.push(item.path);}
if(productDiff.length)fail(`PRODUCT_DELTA_FORBIDDEN:${JSON.stringify(productDiff)}`);
const productErrors=fullRehash(succ,m9);if(productErrors.length)fail(`SUCCESSOR_PRODUCT_REHASH_FAIL:${productErrors.join('|')}`);

// 6) Deterministic package and reopen.
const epoch=Math.floor(Date.parse(String(m9.generatedAt||''))/1000);if(!Number.isFinite(epoch)||epoch<=0)fail('R4S9_GENERATED_AT_INVALID');setEpoch(succ,epoch);
if(fs.existsSync(SUCCESSOR_ZIP))fs.unlinkSync(SUCCESSOR_ZIP);
const sorted=listFiles(succ,false).join('\n')+'\n';
const zip=spawnSync('zip',['-X','-q',SUCCESSOR_ZIP,'-@'],{cwd:succ,input:sorted,encoding:'utf8'});if(zip.status!==0)fail(`ZIP_FAILED:${zip.stderr||zip.stdout}`);
const successorZipSha=sha256(fs.readFileSync(SUCCESSOR_ZIP));
sh('unzip',['-q',SUCCESSOR_ZIP,'-d',reopen]);
const mr=readJson(path.join(reopen,'orbit360-package-manifest.json'));
if(mr.status!==SUCCESSOR_STATUS||mr.sourceHead!==R4S9_SOURCE_HEAD||mr.fileCount!==194||(mr.files||[]).length!==194)fail('REOPEN_MANIFEST_IDENTITY_FAIL');
const reopenProductErrors=fullRehash(reopen,m9);if(reopenProductErrors.length)fail(`REOPEN_PRODUCT_REHASH_FAIL:${reopenProductErrors.join('|')}`);
const reopenedGate=validateManifestContract(m8,mr,{
  basePackageSha256:R4S9_ZIP_SHA256,baseSourceHead:R4S9_SOURCE_HEAD,deltaSourceHead:R4S9_SOURCE_HEAD,
  successorOrdinal:9,unchangedFileCount:194,zeroProductDelta:true,packageLineageToken:'R4S9'
});
if(!reopenedGate.ok)fail(`REOPEN_CONTRACT_GATE_FAIL:${JSON.stringify(reopenedGate)}`);

// 7) Static compare: package differs from exact R4S9 only at manifest; all 194 product hashes exact.
const r9All=listFiles(r9,false),rAll=listFiles(reopen,false);
if(!eq(r9All,rAll))fail('PACKAGE_FILE_SET_CHANGED');
const packageDiff=[];
for(const rel of r9All){const a=fs.readFileSync(path.join(r9,rel)),b=fs.readFileSync(path.join(reopen,rel));if(a.length!==b.length||sha256(a)!==sha256(b))packageDiff.push(rel);}
if(!eq(packageDiff,['orbit360-package-manifest.json']))fail(`PACKAGE_DELTA_SCOPE_INVALID:${JSON.stringify(packageDiff)}`);

const manifestSha=sha256(fs.readFileSync(path.join(reopen,'orbit360-package-manifest.json')));
const staticEvidence={
  schemaVersion:'orbit360-r4s9-to-r4s9c-static-compare-v1',ok:true,status:'R4S9C_STATIC_CONTRACT_RECOVERY_PASS',
  productBaseArtifactId:R4S9_ARTIFACT_ID,productBaseZipSha256:R4S9_ZIP_SHA256,productFileCount:194,
  productFilesByteIdentical:194,productDeltaCount:0,productDeltaPaths:[],packageDeltaCount:1,packageDeltaPaths:packageDiff,
  contractFieldCount:DROPPED_CONTRACT_FIELDS.length,contractGatePass:true,runtimeClosurePass:reopenedGate.runtimeClosurePass,
  browserExecuted:false,runtimeExecuted:false,secretAccess:false,dataAccess:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false
};
writeJson(STATIC_OUT,staticEvidence);

const evidence={
  schemaVersion:'orbit360-r4s9c-contract-recovery-certification-v1',ok:true,status:'R4S9C_CONTRACT_RECOVERY_DURABLE_CERTIFIED',
  classification:'DATA_CONTRACT_FAILURE_ROOTFIX_CERTIFIED',manifestStatus:SUCCESSOR_STATUS,sourceHead:R4S9_SOURCE_HEAD,
  zipName:path.basename(SUCCESSOR_ZIP),zipSha256:successorZipSha,manifestSha256:manifestSha,fileCount:194,
  productBaseArtifactId:R4S9_ARTIFACT_ID,productBaseZipSha256:R4S9_ZIP_SHA256,rectorArtifactId:R4S8_ARTIFACT_ID,
  rectorZipSha256:R4S8_ZIP_SHA256,productFilesByteIdentical:194,productDeltaCount:0,packageDeltaPaths:packageDiff,
  restoredContractFieldCount:DROPPED_CONTRACT_FIELDS.length,restoredContractFields:DROPPED_CONTRACT_FIELDS,
  contractGatePass:true,runtimeClosurePass:true,baseFullyRehashed:true,productBaseFullyRehashed:true,packageReopened:true,
  allProductFilesRehashed:true,containsPrivateSecrets:false,noLabRuntime:true,noPrivateSecretMaterial:true,writeAuthorized:false,
  browserExecuted:false,runtimeExecuted:false,secretAccess:false,dataAccess:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false
};
writeJson(CERT_OUT,evidence);fs.writeFileSync(SHA_OUT,`${successorZipSha}  ${path.basename(SUCCESSOR_ZIP)}\n`,'utf8');
console.log(JSON.stringify(evidence,null,2));
