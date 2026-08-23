#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const PRE = path.resolve(process.env.ORBIT360_MACRO2_PREDECESSOR_DIR || '');
const SRC = path.resolve(process.env.ORBIT360_MACRO2_SOURCE_ROOT || process.cwd());
const OUT = path.resolve(process.env.ORBIT360_MACRO2_SUCCESSOR_DIR || '');
const SOURCE_HEAD = String(process.env.ORBIT360_MACRO2_SOURCE_HEAD || '').trim();
const BASE_ARTIFACT_ID = 9433944723;
const BASE_ZIP_SHA256 = '1951cc7c2d3390ea1c2a6b3d9ce0bb48e26a6f95d5d10d69b7c31a0027cfbbac';
const BASE_MANIFEST_SHA256 = '580921077a88badab6e4076c42e9ef88f9de7936e1b6bad0f62410b39aec6397';
const BASE_SOURCE_HEAD = 'c3bb825da2b1ecae08dabc2034c753482b086fec';
const DELTAS = [
  'core/ui.js','core/queries.js','core/client-canonical-view-projection-v20260716.js','core/ciclo.js',
  'data/store-firestore-product-readonly-p0.js','modules/inicio.js','modules/cliente360.js','modules/aseguradoras.js','modules/cobros.js'
].sort();
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const fail = (code, detail='') => { throw new Error(code + (detail ? ':' + detail : '')); };
if (!PRE || !OUT || !/^[0-9a-f]{40}$/.test(SOURCE_HEAD)) fail('PIPELINE_MECHANISM_FAILURE:MACRO2_BUILDER_CONTEXT_INVALID');
const manifestPath=path.join(PRE,'orbit360-package-manifest.json');
if(!fs.existsSync(manifestPath)) fail('DATA_CONTRACT_FAILURE:MACRO2_PREDECESSOR_MANIFEST_MISSING');
const manifestBytes=fs.readFileSync(manifestPath);
if(sha(manifestBytes)!==BASE_MANIFEST_SHA256) fail('DATA_CONTRACT_FAILURE:MACRO2_PREDECESSOR_MANIFEST_SHA_MISMATCH');
const base=JSON.parse(manifestBytes.toString('utf8'));
if(base.sourceHead!==BASE_SOURCE_HEAD||Number(base.fileCount)!==194||!Array.isArray(base.files)||base.files.length!==194) fail('DATA_CONTRACT_FAILURE:MACRO2_PREDECESSOR_IDENTITY_MISMATCH');
for(const f of base.files){const fp=path.join(PRE,f.path);if(!fs.existsSync(fp)) fail('DATA_CONTRACT_FAILURE:MACRO2_PREDECESSOR_FILE_MISSING',f.path);const b=fs.readFileSync(fp);if(b.length!==Number(f.bytes)||sha(b)!==f.sha256)fail('DATA_CONTRACT_FAILURE:MACRO2_PREDECESSOR_REHASH_FAIL',f.path);}
fs.rmSync(OUT,{recursive:true,force:true});fs.cpSync(PRE,OUT,{recursive:true});
const deltas=[];
for(const rel of DELTAS){
 const source=path.join(SRC,'orbit360-platform',rel), target=path.join(OUT,rel);
 if(!fs.existsSync(source)) fail('DATA_CONTRACT_FAILURE:MACRO2_SOURCE_DELTA_MISSING',rel);
 const before=fs.readFileSync(target),after=fs.readFileSync(source);
 if(sha(before)===sha(after)) fail('VALIDATOR_STALE:MACRO2_EXPECTED_DELTA_NOT_CHANGED',rel);
 fs.mkdirSync(path.dirname(target),{recursive:true}); fs.writeFileSync(target,after);
 deltas.push({path:rel,beforeSha256:sha(before),afterSha256:sha(after),beforeBytes:before.length,afterBytes:after.length});
}
// Ensure no path outside the explicit delta set changed before regenerating the manifest.
const observed=[];
for(const f of base.files){const b=fs.readFileSync(path.join(OUT,f.path));if(sha(b)!==f.sha256) observed.push(f.path);}
observed.sort();if(JSON.stringify(observed)!==JSON.stringify(DELTAS)) fail('SECURITY_FAILURE:MACRO2_DELTA_SURFACE_INVALID',JSON.stringify(observed));
const protectedTouched=observed.filter(p=>/^(data\/store|core\/backend-lab-|core\/auth\.js|core\/importa\.js|firestore\.rules)/.test(p));
if(JSON.stringify(protectedTouched)!==JSON.stringify(['data/store-firestore-product-readonly-p0.js'])) fail('SECURITY_FAILURE:MACRO2_PROTECTED_DELTA_INVALID',JSON.stringify(protectedTouched));

const next=JSON.parse(JSON.stringify(base));
next.status='FASE_A_PRODUCT_MACRO2_TRANSVERSAL_SOURCE_ACCEPTANCE_CERTIFIED';
next.sourceHead=SOURCE_HEAD;
next.generatedAt=new Date().toISOString();
next.basePackageSha256=BASE_ZIP_SHA256;
next.baseManifestSha256=BASE_MANIFEST_SHA256;
next.baseArtifactId=BASE_ARTIFACT_ID;
next.baseSourceHead=BASE_SOURCE_HEAD;
next.deltaFiles=DELTAS.slice();
next.deltaSourceHead=SOURCE_HEAD;
next.successorOrdinal=13;
next.unchangedFileCount=194-DELTAS.length;
next.candidateOrigin='MACRO2_TRANSVERSAL_SOURCE_ACCEPTANCE';
next.rootCause='FUNCTIONAL_DEFECT:F2_VISIBLE_VALUE_AND_READMODEL_SAFETY_FAMILY';
next.rootfix='safe display/read-model finite normalization + batched client-policy index + filter-then-clone readonly store';
next.runtimeAuthorized=false;
next.writeAuthorized=false;
next.deployExecuted=false;
next.productionTouched=false;
next.historicalArtifactReuseForbidden=true;
next.forbiddenHistoricalArtifactIds=Array.from(new Set([...(next.forbiddenHistoricalArtifactIds||[]),9387820198]));
next.lineage=next.lineage||{};
next.lineage.macro2_transversal_source_acceptance={
 baseArtifactId:BASE_ARTIFACT_ID,baseZipSha256:BASE_ZIP_SHA256,baseManifestSha256:BASE_MANIFEST_SHA256,baseSourceHead:BASE_SOURCE_HEAD,
 sourceHead:SOURCE_HEAD,productDeltaCount:DELTAS.length,productDeltaPaths:DELTAS.slice(),unchangedProductFiles:194-DELTAS.length,
 sourceOnly:true,runtimeAuthorized:false,browserExecuted:false,secrets:false,firestoreRead:false,writes:false,deploy:false,production:false
};
const oldByPath=new Map(base.files.map(f=>[f.path,f]));
next.files=base.files.map(f=>{const b=fs.readFileSync(path.join(OUT,f.path));return {path:f.path,bytes:b.length,sha256:sha(b)};});
next.fileCount=next.files.length;
fs.writeFileSync(path.join(OUT,'orbit360-package-manifest.json'),JSON.stringify(next,null,2)+'\n','utf8');
// Independent full rehash against newly written manifest.
const reopened=JSON.parse(fs.readFileSync(path.join(OUT,'orbit360-package-manifest.json'),'utf8'));
if(reopened.fileCount!==194||reopened.files.length!==194||reopened.sourceHead!==SOURCE_HEAD) fail('DATA_CONTRACT_FAILURE:MACRO2_SUCCESSOR_MANIFEST_INVALID');
for(const f of reopened.files){const b=fs.readFileSync(path.join(OUT,f.path));if(b.length!==Number(f.bytes)||sha(b)!==f.sha256) fail('DATA_CONTRACT_FAILURE:MACRO2_SUCCESSOR_FULL_REHASH_FAIL',f.path);}
const unchanged=reopened.files.filter(f=>!DELTAS.includes(f.path)).filter(f=>oldByPath.get(f.path)?.sha256===f.sha256).length;
if(unchanged!==194-DELTAS.length) fail('DATA_CONTRACT_FAILURE:MACRO2_UNCHANGED_COUNT_INVALID',String(unchanged));
const result={schemaVersion:'orbit360-macro2-transversal-successor-builder-v1',ok:true,status:'MACRO2_TRANSVERSAL_SUCCESSOR_BUILD_PASS',classification:'PASS',sourceHead:SOURCE_HEAD,baseArtifactId:BASE_ARTIFACT_ID,baseSourceHead:BASE_SOURCE_HEAD,fileCount:194,deltaCount:DELTAS.length,deltaPaths:DELTAS,unchangedFileCount:unchanged,protectedTouched,fullRehashPass:true,manifestSha256:sha(fs.readFileSync(path.join(OUT,'orbit360-package-manifest.json'))),deltas,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
console.log(JSON.stringify(result,null,2));
