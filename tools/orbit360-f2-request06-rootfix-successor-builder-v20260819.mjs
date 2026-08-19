#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';

const ROOT=process.cwd(), env=process.env;
const BASE_OUTER=path.resolve(env.F2_BASE_ARTIFACT_ZIP||'/tmp/f2-request06-base-artifact.zip');
const BASE_ARTIFACT_ID=Number(env.F2_BASE_ARTIFACT_ID||9345207863);
const BASE_INNER='orbit360-fase-a-product-f1-4c-successor-29caae94a3db.zip';
const BASE_ZIP_SHA='493009c83390901aa772842a2ba9ddd5ce5293f6969d86c5c3395ebd670a44ac';
const BASE_MANIFEST_SHA='29dafe5e63b425ea6cf641937fe1b9d4b9e63f72479a51ae76f9148a55771761';
const BASE_SOURCE='29caae94a3db1f1626bdde2ea6ee9a21799f9df6';
const BASE_STATUS='FASE_A_PRODUCT_F1_4C_SUCCESSOR_CERTIFIED';
const SOURCE=String(env.F2_SOURCE_HEAD||'').trim();
const STATUS='FASE_A_PRODUCT_F2_REQUEST06_ROOTFIX_SUCCESSOR_CERTIFIED';
const DELTAS=['core/queries.js'];
const ROOTFIX_BLOB='b7cef1acda5034e572820f5f1b25fbfe2108f2f9';
const REGRESSION_BLOB='8c3b451ded519f5382efd2fe09fe62fa94b70532';
const OUT_ZIP=path.resolve(env.F2_SUCCESSOR_ZIP||`orbit360-fase-a-product-f2-request06-rootfix-successor-${SOURCE.slice(0,12)}.zip`);
const EVIDENCE_DIR=path.resolve(env.EVIDENCE_DIR||'orbit360-platform/runtime-gate-crm-v20260716');
const EVIDENCE=path.join(EVIDENCE_DIR,'f2-request06-rootfix-successor-artifact-certification-v20260819.json');
const SHA_OUT=path.join(EVIDENCE_DIR,'f2-request06-rootfix-successor-artifact-sha256-v20260819.txt');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const fail=m=>{throw new Error(m)};
const sh=(c,a,o={})=>execFileSync(c,a,{cwd:ROOT,encoding:o.encoding??'utf8',maxBuffer:64*1024*1024,stdio:o.stdio??['ignore','pipe','pipe']}).trim();
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const write=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');};
const list=(root,omitManifest=false)=>{const out=[];const walk=p=>{for(const n of fs.readdirSync(p).sort()){const q=path.join(p,n),s=fs.statSync(q);if(s.isDirectory())walk(q);else{const r=path.relative(root,q).split(path.sep).join('/');if(!(omitManifest&&r==='orbit360-package-manifest.json'))out.push(r);}}};walk(root);return out;};
function rehash(root,m){const e=[];for(const i of m.files||[]){const p=path.join(root,i.path);if(!fs.existsSync(p)){e.push(`missing:${i.path}`);continue;}const b=fs.readFileSync(p);if(b.length!==i.bytes)e.push(`bytes:${i.path}`);if(sha(b)!==i.sha256)e.push(`sha:${i.path}`);}if(JSON.stringify(list(root,true))!==JSON.stringify((m.files||[]).map(x=>x.path).sort()))e.push('file-set');return e;}
function epoch(root,t){const d=new Date(t*1000);const walk=p=>{for(const n of fs.readdirSync(p)){const q=path.join(p,n),s=fs.statSync(q);if(s.isDirectory())walk(q);fs.utimesSync(q,d,d);}};walk(root);fs.utimesSync(root,d,d);}

if(!SOURCE)fail('SOURCE_HEAD_REQUIRED');
const sourceRootfixBlob=sh('git',['rev-parse',`${SOURCE}:orbit360-platform/core/queries.js`]);
const sourceRegressionBlob=sh('git',['rev-parse',`${SOURCE}:tools/orbit360-validar-f2-inicio-finite-v20260819.mjs`]);
if(sourceRootfixBlob!==ROOTFIX_BLOB)fail(`SOURCE_ROOTFIX_BLOB_MISMATCH:${sourceRootfixBlob}`);
if(sourceRegressionBlob!==REGRESSION_BLOB)fail(`SOURCE_REGRESSION_BLOB_MISMATCH:${sourceRegressionBlob}`);
sh(process.execPath,['--check','orbit360-platform/core/queries.js']);
const regressionOut=sh(process.execPath,['tools/orbit360-validar-f2-inicio-finite-v20260819.mjs']);
if(!regressionOut.includes('PASS_F2_INICIO_FINITE_OPTIONAL_ADVISOR_META'))fail('F2_INICIO_FINITE_REGRESSION_NOT_PASS');

const work='/tmp/orbit360-f2-request06-rootfix-build',outer=path.join(work,'outer'),base=path.join(work,'base'),succ=path.join(work,'successor'),reopen=path.join(work,'reopen');
fs.rmSync(work,{recursive:true,force:true});for(const p of [outer,base,succ,reopen])fs.mkdirSync(p,{recursive:true});fs.mkdirSync(EVIDENCE_DIR,{recursive:true});
sh('unzip',['-q',BASE_OUTER,'-d',outer]);
const outerNames=list(outer,false);if(outerNames.length!==1||outerNames[0]!==BASE_INNER)fail(`BASE_OUTER_SHAPE_INVALID:${JSON.stringify(outerNames)}`);
const inner=path.join(outer,BASE_INNER),actualBaseZipSha=sha(fs.readFileSync(inner));if(actualBaseZipSha!==BASE_ZIP_SHA)fail(`BASE_ZIP_SHA_MISMATCH:${actualBaseZipSha}`);
sh('unzip',['-q',inner,'-d',base]);
const manifestPath=path.join(base,'orbit360-package-manifest.json');
if(sha(fs.readFileSync(manifestPath))!==BASE_MANIFEST_SHA)fail('BASE_MANIFEST_SHA_MISMATCH');
const bm=read(manifestPath);
if(bm.status!==BASE_STATUS||bm.sourceHead!==BASE_SOURCE||bm.fileCount!==194||(bm.files||[]).length!==194||bm.noLabRuntime!==true||bm.noPrivateSecretMaterial!==true||bm.writeAuthorized!==false||bm.deployExecuted!==false||bm.productionTouched!==false)fail('BASE_MANIFEST_IDENTITY_INVALID');
const baseErrors=rehash(base,bm);if(baseErrors.length)fail(`BASE_REHASH_FAIL:${baseErrors.join('|')}`);
for(const d of DELTAS)if(!(bm.files||[]).some(x=>x.path===d))fail(`DELTA_NOT_IN_BASE:${d}`);

fs.cpSync(base,succ,{recursive:true});
for(const d of DELTAS){const repo=`orbit360-platform/${d}`;const b=execFileSync('git',['show',`${SOURCE}:${repo}`],{cwd:ROOT,maxBuffer:32*1024*1024});fs.writeFileSync(path.join(succ,d),b);sh(process.execPath,['--check',path.join(succ,d)]);const txt=b.toString('utf8');for(const token of ['metaDisponible','Number.isFinite(metaPrima)','Number.isFinite(rawPct)','metaPrima: metaDisponible ? metaPrima : 0'])if(!txt.includes(token))fail(`ROOTFIX_TOKEN_MISSING:${token}`);}

const files=[],changed=[];for(const old of bm.files){const b=fs.readFileSync(path.join(succ,old.path)),h=sha(b);files.push({path:old.path,bytes:b.length,sha256:h});if(h!==old.sha256||b.length!==old.bytes)changed.push({path:old.path,beforeSha256:old.sha256,afterSha256:h,beforeBytes:old.bytes,afterBytes:b.length});}
if(JSON.stringify(changed.map(x=>x.path).sort())!==JSON.stringify(DELTAS))fail(`PRODUCT_DELTA_SCOPE_INVALID:${JSON.stringify(changed.map(x=>x.path))}`);
const t=Number(sh('git',['show','-s','--format=%ct',SOURCE])),generatedAt=new Date(t*1000).toISOString();
const manifest={...bm,status:STATUS,sourceHead:SOURCE,generatedAt,fileCount:194,files,basePackageSha256:BASE_ZIP_SHA,baseManifestSha256:BASE_MANIFEST_SHA,baseSourceHead:BASE_SOURCE,deltaFiles:DELTAS,deltaSourceHead:SOURCE,packageLineage:'Exact certified Request06 194-file candidate + one-file F2 visible finite-value rootfix; unpublished F2 successor',successorOrdinal:Number(bm.successorOrdinal||10)+1,unchangedFileCount:193,writeAuthorized:false,deployExecuted:false,productionTouched:false,lineage:{...(bm.lineage||{}),f2_request06_rootfix:{baseArtifactId:BASE_ARTIFACT_ID,baseZipSha256:BASE_ZIP_SHA,baseManifestSha256:BASE_MANIFEST_SHA,baseSourceHead:BASE_SOURCE,sourceHead:SOURCE,rootfixBlobSha:ROOTFIX_BLOB,regressionBlobSha:REGRESSION_BLOB,productDeltaCount:1,productDeltaPaths:DELTAS,unpublished:true}}};
write(path.join(succ,'orbit360-package-manifest.json'),manifest);const succErrors=rehash(succ,manifest);if(succErrors.length)fail(`SUCCESSOR_REHASH_FAIL:${succErrors.join('|')}`);
epoch(succ,t);if(fs.existsSync(OUT_ZIP))fs.unlinkSync(OUT_ZIP);const sorted=list(succ,false).join('\n')+'\n';const z=spawnSync('zip',['-X','-q',OUT_ZIP,'-@'],{cwd:succ,input:sorted,encoding:'utf8'});if(z.status!==0)fail(`ZIP_FAIL:${z.stderr||z.stdout}`);
const zipSha=sha(fs.readFileSync(OUT_ZIP));sh('unzip',['-q',OUT_ZIP,'-d',reopen]);const rm=read(path.join(reopen,'orbit360-package-manifest.json')),reopenErrors=rehash(reopen,rm);if(reopenErrors.length)fail(`REOPEN_REHASH_FAIL:${reopenErrors.join('|')}`);
if(rm.status!==STATUS||rm.sourceHead!==SOURCE||rm.fileCount!==194||rm.unchangedFileCount!==193||JSON.stringify(rm.deltaFiles)!==JSON.stringify(DELTAS))fail('REOPEN_MANIFEST_MISMATCH');
const reopenChanged=[];for(const old of bm.files){const b=fs.readFileSync(path.join(reopen,old.path));if(sha(b)!==old.sha256||b.length!==old.bytes)reopenChanged.push(old.path);}if(JSON.stringify(reopenChanged.sort())!==JSON.stringify(DELTAS))fail('REOPEN_DELTA_SCOPE_INVALID');
const manifestSha=sha(fs.readFileSync(path.join(reopen,'orbit360-package-manifest.json')));
const evidence={schemaVersion:'orbit360-f2-request06-rootfix-successor-artifact-certification-v1',ok:true,status:'F2_REQUEST06_ROOTFIX_SUCCESSOR_ARTIFACT_CERTIFIED_UNPUBLISHED',classification:'PASS',manifestStatus:STATUS,sourceHead:SOURCE,baseArtifactId:BASE_ARTIFACT_ID,baseSourceHead:BASE_SOURCE,baseZipSha256:BASE_ZIP_SHA,baseManifestSha256:BASE_MANIFEST_SHA,zipName:path.basename(OUT_ZIP),zipSha256:zipSha,manifestSha256:manifestSha,fileCount:194,deltaCount:1,unchangedProductFiles:193,productDeltaPaths:DELTAS,productDelta:changed,rootfixBlobSha:ROOTFIX_BLOB,regressionBlobSha:REGRESSION_BLOB,sourceBlobBound:true,finiteRegressionPass:true,baseFullyRehashed:true,successorFullyRehashed:true,packageReopened:true,allProductFilesRehashed:true,noLabRuntime:true,noPrivateSecretMaterial:true,published:false,packageRebuilt:true,browserExecuted:false,runtimeExecuted:false,secretAccess:false,dataAccess:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
write(EVIDENCE,evidence);fs.writeFileSync(SHA_OUT,`${zipSha}  ${path.basename(OUT_ZIP)}\n`);console.log(JSON.stringify(evidence,null,2));
