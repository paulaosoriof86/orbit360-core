#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';

const ROOT=process.cwd(),env=process.env;
const BASE_OUTER=path.resolve(env.F1_4C_BASE_ARTIFACT_ZIP||'/tmp/r4s9c-artifact.zip');
const BASE_ARTIFACT_ID=Number(env.F1_4C_BASE_ARTIFACT_ID||9300368902);
const BASE_INNER='orbit360-fase-a-product-r4s9c-contract-recovery-861326906558.zip';
const BASE_SHA='917f5424deea06d224d45a1b039c0b3699d71a7bef430b2a40d059703b2acc3a';
const BASE_SOURCE='861326906558f03d9c8c2e7f34adfb4979a17d73';
const BASE_STATUS='FASE_A_PRODUCT_R4S9C_CONTRACT_RECOVERY_CERTIFIED';
const SOURCE=env.F1_4C_SOURCE_HEAD||'';
const STATUS='FASE_A_PRODUCT_F1_4C_SUCCESSOR_CERTIFIED';
const DELTAS=['core/backend-product-readonly-bootstrap-p0.js','core/membership-multirol-contract-p0.js'];
const ROOTFIX=['a808e13d69dcb687f488be7e17411796eaec3509','b050d5a1a9861f898d2bb50d1bcc5c26beb72e9b'];
const F14B='3c56d0baffce8fc8399050e520ee4cb54cebf4db';
const OUT_ZIP=path.resolve(env.F1_4C_SUCCESSOR_ZIP||`orbit360-fase-a-product-f1-4c-successor-${SOURCE.slice(0,12)}.zip`);
const EVIDENCE_DIR=path.resolve(env.EVIDENCE_DIR||'orbit360-platform/runtime-gate-crm-v20260716');
const EVIDENCE=path.join(EVIDENCE_DIR,'f1-4c-successor-artifact-certification-v20260818.json');
const SHA_OUT=path.join(EVIDENCE_DIR,'f1-4c-successor-artifact-sha256-v20260818.txt');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const fail=m=>{throw new Error(m)};
const sh=(c,a,o={})=>execFileSync(c,a,{cwd:ROOT,encoding:o.encoding??'utf8',maxBuffer:64*1024*1024,stdio:o.stdio??['ignore','pipe','pipe']});
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');};
const list=(root,omit=false)=>{const out=[];const walk=p=>{for(const n of fs.readdirSync(p).sort()){const q=path.join(p,n),s=fs.statSync(q);if(s.isDirectory())walk(q);else{const r=path.relative(root,q).split(path.sep).join('/');if(!(omit&&r==='orbit360-package-manifest.json'))out.push(r);}}};walk(root);return out;};
const ancestor=(a,b)=>spawnSync('git',['merge-base','--is-ancestor',a,b],{cwd:ROOT}).status===0;
function rehash(root,m){const e=[];for(const i of m.files||[]){const p=path.join(root,i.path);if(!fs.existsSync(p)){e.push(`missing:${i.path}`);continue;}const b=fs.readFileSync(p);if(b.length!==i.bytes)e.push(`bytes:${i.path}`);if(sha(b)!==i.sha256)e.push(`sha:${i.path}`);}if(JSON.stringify(list(root,true))!==JSON.stringify((m.files||[]).map(x=>x.path).sort()))e.push('file-set');return e;}
function epoch(root,t){const d=new Date(t*1000);const walk=p=>{for(const n of fs.readdirSync(p)){const q=path.join(p,n),s=fs.statSync(q);if(s.isDirectory())walk(q);fs.utimesSync(q,d,d);}};walk(root);fs.utimesSync(root,d,d);}

if(!SOURCE)fail('SOURCE_HEAD_REQUIRED');
for(const c of [...ROOTFIX,F14B])if(!ancestor(c,SOURCE))fail(`SOURCE_MISSING_BOUND_COMMIT:${c}`);
const work='/tmp/orbit360-f1-4c-build',outer=path.join(work,'outer'),base=path.join(work,'base'),succ=path.join(work,'successor'),reopen=path.join(work,'reopen');
fs.rmSync(work,{recursive:true,force:true});for(const p of [outer,base,succ,reopen])fs.mkdirSync(p,{recursive:true});fs.mkdirSync(EVIDENCE_DIR,{recursive:true});

// Exact durable R4S9C base.
sh('unzip',['-q',BASE_OUTER,'-d',outer]);const names=list(outer,false);if(names.length!==1||names[0]!==BASE_INNER)fail(`BASE_OUTER_SHAPE_INVALID:${JSON.stringify(names)}`);
const inner=path.join(outer,BASE_INNER),actualBaseSha=sha(fs.readFileSync(inner));if(actualBaseSha!==BASE_SHA)fail(`BASE_SHA_MISMATCH:${actualBaseSha}`);
sh('unzip',['-q',inner,'-d',base]);const bm=read(path.join(base,'orbit360-package-manifest.json'));
if(bm.status!==BASE_STATUS||bm.sourceHead!==BASE_SOURCE||bm.fileCount!==194||(bm.files||[]).length!==194||bm.noLabRuntime!==true||bm.noPrivateSecretMaterial!==true||bm.writeAuthorized!==false)fail('BASE_MANIFEST_IDENTITY_INVALID');
const be=rehash(base,bm);if(be.length)fail(`BASE_REHASH_FAIL:${be.join('|')}`);
for(const d of DELTAS)if(!(bm.files||[]).some(x=>x.path===d))fail(`DELTA_NOT_IN_BASE:${d}`);

// Overlay only committed F1.3 product blobs from the bound source head.
fs.cpSync(base,succ,{recursive:true});const committed={};
for(const d of DELTAS){const repo=`orbit360-platform/${d}`;const b=execFileSync('git',['show',`${SOURCE}:${repo}`],{cwd:ROOT,maxBuffer:32*1024*1024});committed[d]=b;fs.writeFileSync(path.join(succ,d),b);sh(process.execPath,['--check',path.join(succ,d)]);}
const membership=committed['core/membership-multirol-contract-p0.js'].toString('utf8');
const bootstrap=committed['core/backend-product-readonly-bootstrap-p0.js'].toString('utf8');
if(!membership.includes("EMAIL_OPTIONAL: true")||!membership.includes("EMAIL_IDENTITY_OWNER: 'auth'")||!membership.includes("if (m.email && !/^\\S+@\\S+\\.\\S+$/.test(m.email)) errors.push('email_invalido');"))fail('F1_3_MEMBERSHIP_SEMANTICS_MISSING');
if(!bootstrap.includes("if (membershipEmail && membershipEmail !== authEmail) errors.push('membership_email_no_coincide');"))fail('F1_3_BOOTSTRAP_AUTH_OWNERSHIP_MISSING');

const files=[],changed=[];for(const old of bm.files){const b=fs.readFileSync(path.join(succ,old.path)),h=sha(b);files.push({path:old.path,bytes:b.length,sha256:h});if(h!==old.sha256||b.length!==old.bytes)changed.push({path:old.path,beforeSha256:old.sha256,afterSha256:h,beforeBytes:old.bytes,afterBytes:b.length});}
if(JSON.stringify(changed.map(x=>x.path).sort())!==JSON.stringify(DELTAS.slice().sort()))fail(`PRODUCT_DELTA_SCOPE_INVALID:${JSON.stringify(changed.map(x=>x.path))}`);
const t=Number(sh('git',['show','-s','--format=%ct',SOURCE]).trim()),generatedAt=new Date(t*1000).toISOString();
const manifest={...bm,status:STATUS,sourceHead:SOURCE,generatedAt,fileCount:194,files,basePackageSha256:BASE_SHA,baseSourceHead:BASE_SOURCE,deltaFiles:DELTAS,deltaSourceHead:SOURCE,packageLineage:'R4S9C certified 194-file base + F1.3 two-file product rootfix; F1.4B parity gate bound in source lineage; unpublished F1.4C successor',successorOrdinal:10,unchangedFileCount:192,writeAuthorized:false,deployExecuted:false,productionTouched:false,lineage:{...(bm.lineage||{}),f1_4c:{baseArtifactId:BASE_ARTIFACT_ID,baseZipSha256:BASE_SHA,sourceHead:SOURCE,rootfixCommits:ROOTFIX,f1_4bEvidenceCommit:F14B,productDeltaCount:2,productDeltaPaths:DELTAS,unpublished:true}}};
write(path.join(succ,'orbit360-package-manifest.json'),manifest);const se=rehash(succ,manifest);if(se.length)fail(`SUCCESSOR_REHASH_FAIL:${se.join('|')}`);
epoch(succ,t);if(fs.existsSync(OUT_ZIP))fs.unlinkSync(OUT_ZIP);const sorted=list(succ,false).join('\n')+'\n';const z=spawnSync('zip',['-X','-q',OUT_ZIP,'-@'],{cwd:succ,input:sorted,encoding:'utf8'});if(z.status!==0)fail(`ZIP_FAIL:${z.stderr||z.stdout}`);
const zipSha=sha(fs.readFileSync(OUT_ZIP));sh('unzip',['-q',OUT_ZIP,'-d',reopen]);const rm=read(path.join(reopen,'orbit360-package-manifest.json'));const re=rehash(reopen,rm);if(re.length)fail(`REOPEN_REHASH_FAIL:${re.join('|')}`);
if(rm.status!==STATUS||rm.sourceHead!==SOURCE||rm.fileCount!==194||rm.unchangedFileCount!==192||JSON.stringify(rm.deltaFiles)!==JSON.stringify(DELTAS))fail('REOPEN_MANIFEST_MISMATCH');
const reopenChanged=[];for(const old of bm.files){const b=fs.readFileSync(path.join(reopen,old.path));if(sha(b)!==old.sha256||b.length!==old.bytes)reopenChanged.push(old.path);}if(JSON.stringify(reopenChanged.sort())!==JSON.stringify(DELTAS.slice().sort()))fail('REOPEN_DELTA_SCOPE_INVALID');
const manifestSha=sha(fs.readFileSync(path.join(reopen,'orbit360-package-manifest.json')));
const evidence={schemaVersion:'orbit360-f1-4c-successor-artifact-certification-v1',ok:true,status:'F1_4C_SUCCESSOR_ARTIFACT_CERTIFIED_UNPUBLISHED',classification:'PASS',manifestStatus:STATUS,sourceHead:SOURCE,baseArtifactId:BASE_ARTIFACT_ID,baseSourceHead:BASE_SOURCE,baseZipSha256:BASE_SHA,zipName:path.basename(OUT_ZIP),zipSha256:zipSha,manifestSha256:manifestSha,fileCount:194,deltaCount:2,unchangedProductFiles:192,productDeltaPaths:DELTAS,productDelta:changed,rootfixCommits:ROOTFIX,f1_4bEvidenceCommit:F14B,rootfixAncestors:true,f1_4bAncestor:true,f1_3MembershipSemanticsPresent:true,f1_3BootstrapAuthOwnershipPresent:true,baseFullyRehashed:true,successorFullyRehashed:true,packageReopened:true,allProductFilesRehashed:true,noLabRuntime:true,noPrivateSecretMaterial:true,published:false,packageRebuilt:true,browserExecuted:false,runtimeExecuted:false,secretAccess:false,dataAccess:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
write(EVIDENCE,evidence);fs.writeFileSync(SHA_OUT,`${zipSha}  ${path.basename(OUT_ZIP)}\n`);console.log(JSON.stringify(evidence,null,2));
