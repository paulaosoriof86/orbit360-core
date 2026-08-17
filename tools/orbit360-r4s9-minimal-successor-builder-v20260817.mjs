#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const env = process.env;
const BASE_ARTIFACT_ZIP = path.resolve(env.BASE_ARTIFACT_ZIP || '/tmp/r4s8-artifact.zip');
const BASE_ARTIFACT_ID = Number(env.BASE_ARTIFACT_ID || 9296206724);
const BASE_INNER_NAME = env.BASE_INNER_NAME || 'orbit360-fase-a-product-r4s8-2427d94758c6.zip';
const BASE_ZIP_SHA256 = env.BASE_ZIP_SHA256 || '265fcac34f436ddf28bba58dc63a9146301e49ded7e26faeac50adf86d5790da';
const BASE_SOURCE_HEAD = env.BASE_SOURCE_HEAD || '2427d94758c6143f3dbedf70512cbda87a24459c';
const BASE_STATUS = env.BASE_STATUS || 'FASE_A_PRODUCT_R4S8_MINIMAL_SUCCESSOR_CERTIFIED';
const PRODUCT_SOURCE_HEAD = env.PRODUCT_SOURCE_HEAD || '861326906558f03d9c8c2e7f34adfb4979a17d73';
const DELTA_PATH = env.PRODUCT_DELTA_PATH || 'modules/cliente360.js';
const REPO_DELTA_PATH = `orbit360-platform/${DELTA_PATH}`;
const SUCCESSOR_STATUS = env.SUCCESSOR_STATUS || 'FASE_A_PRODUCT_R4S9_MINIMAL_SUCCESSOR_CERTIFIED';
const SUCCESSOR_ZIP = path.resolve(env.SUCCESSOR_ZIP || 'orbit360-fase-a-product-r4s9-861326906558.zip');
const EVIDENCE_DIR = path.resolve(env.EVIDENCE_DIR || 'orbit360-platform/runtime-gate-crm-v20260716');

const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');
const fail = m => { throw new Error(m); };
const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, v) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n', 'utf8'); };
const sh = (cmd, args, opts={}) => execFileSync(cmd, args, { cwd: ROOT, encoding: opts.encoding ?? 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: opts.stdio ?? ['ignore','pipe','pipe'] });

function rmrf(p) { fs.rmSync(p, { recursive: true, force: true }); }
function mkdir(p) { fs.mkdirSync(p, { recursive: true }); }
function listFiles(root, omitManifest=false) {
  const out=[];
  const walk=p=>{ for(const name of fs.readdirSync(p).sort()){ const q=path.join(p,name), st=fs.statSync(q); if(st.isDirectory()) walk(q); else { const rel=path.relative(root,q).split(path.sep).join('/'); if(!(omitManifest && rel==='orbit360-package-manifest.json')) out.push(rel); } } };
  walk(root); return out;
}
function fullRehash(root, manifest) {
  const errors=[];
  for (const item of manifest.files || []) {
    const p=path.join(root,item.path);
    if(!fs.existsSync(p)){ errors.push(`missing:${item.path}`); continue; }
    const b=fs.readFileSync(p), h=sha256(b);
    if(b.length!==item.bytes) errors.push(`bytes:${item.path}:${b.length}:${item.bytes}`);
    if(h!==item.sha256) errors.push(`sha:${item.path}:${h}:${item.sha256}`);
  }
  const actual=listFiles(root,true), declared=(manifest.files||[]).map(x=>x.path).sort();
  if(JSON.stringify(actual)!==JSON.stringify(declared)) errors.push('file-set-mismatch');
  return errors;
}
function copyTree(src,dst){ fs.cpSync(src,dst,{recursive:true}); }
function setEpoch(root, epochSec){
  const t=new Date(epochSec*1000);
  const walk=p=>{ for(const name of fs.readdirSync(p)){ const q=path.join(p,name), st=fs.statSync(q); if(st.isDirectory()) walk(q); fs.utimesSync(q,t,t); } };
  walk(root); fs.utimesSync(root,t,t);
}

const work='/tmp/orbit360-r4s9-builder';
const outer=path.join(work,'outer'), base=path.join(work,'base'), successor=path.join(work,'successor'), reopen=path.join(work,'reopen');
rmrf(work); [outer,base,successor,reopen].forEach(mkdir); mkdir(EVIDENCE_DIR);

// 1) Product source is the committed blob, not a pre-commit working-tree representation.
sh('git',['cat-file','-e',`${PRODUCT_SOURCE_HEAD}^{commit}`]);
const commitFiles=sh('git',['diff-tree','--no-commit-id','--name-only','-r',PRODUCT_SOURCE_HEAD]).trim().split(/\r?\n/).filter(Boolean);
if(commitFiles.length!==1 || commitFiles[0]!==REPO_DELTA_PATH) fail(`PRODUCT_COMMIT_SCOPE_INVALID:${JSON.stringify(commitFiles)}`);
const deltaBuffer=execFileSync('git',['show',`${PRODUCT_SOURCE_HEAD}:${REPO_DELTA_PATH}`],{cwd:ROOT,maxBuffer:32*1024*1024});
const deltaSha=sha256(deltaBuffer);
const tempDelta=path.join(work,'cliente360-committed.js'); fs.writeFileSync(tempDelta,deltaBuffer);
sh(process.execPath,['--check',tempDelta]);
const deltaText=deltaBuffer.toString('utf8');
const listaStart=deltaText.indexOf('  function lista() {'), listaEnd=deltaText.indexOf('\n  function liveFilter',listaStart);
if(listaStart<0||listaEnd<0) fail('LISTA_REGION_NOT_FOUND_COMMITTED');
const lista=deltaText.slice(listaStart,listaEnd);
if(/clientesResumenIndex|summaryIndex|summaryBatch/.test(lista)) fail('COMMITTED_FULL_SUMMARY_PATH_REMAINS');
if(lista.includes("['clientes', 'polizas', 'cobros', 'comisiones']")) fail('COMMITTED_COMMISSION_BATCH_REMAINS');
if(!lista.includes("['clientes', 'polizas', 'cobros']")) fail('COMMITTED_BOUNDED_BATCH_MISSING');
if(!deltaText.includes('const LIST_PAGE_SIZE = 40;')) fail('COMMITTED_PAGE_SIZE_CHANGED');
const protectedDiff=sh('git',['diff','--name-only',BASE_SOURCE_HEAD,PRODUCT_SOURCE_HEAD,'--','orbit360-platform/data/store-firestore-product-readonly-p0.js','orbit360-platform/core/queries.js','orbit360-platform/core/auth.js','orbit360-platform/firestore.rules']).trim();
if(protectedDiff) fail(`PROTECTED_SURFACE_CHANGED:${protectedDiff}`);

// 2) Exact durable R4S8 artifact/base.
sh('unzip',['-q',BASE_ARTIFACT_ZIP,'-d',outer]);
const baseInner=path.join(outer,BASE_INNER_NAME);
if(!fs.existsSync(baseInner)) fail('BASE_INNER_ZIP_MISSING');
const actualBaseZipSha=sha256(fs.readFileSync(baseInner));
if(actualBaseZipSha!==BASE_ZIP_SHA256) fail(`BASE_ZIP_SHA_MISMATCH:${actualBaseZipSha}`);
sh('unzip',['-q',baseInner,'-d',base]);
const baseManifest=readJson(path.join(base,'orbit360-package-manifest.json'));
if(baseManifest.schemaVersion!=='orbit360-fase-a-product-package-manifest-v1'||baseManifest.status!==BASE_STATUS||baseManifest.sourceHead!==BASE_SOURCE_HEAD||baseManifest.fileCount!==194||(baseManifest.files||[]).length!==194) fail('BASE_MANIFEST_IDENTITY_MISMATCH');
const baseErrors=fullRehash(base,baseManifest); if(baseErrors.length) fail(`BASE_FULL_REHASH_FAIL:${baseErrors.join('|')}`);

// 3) One-delta successor.
copyTree(base,successor);
fs.writeFileSync(path.join(successor,DELTA_PATH),deltaBuffer);
const changed=[], files=[];
for(const old of baseManifest.files){ const b=fs.readFileSync(path.join(successor,old.path)), h=sha256(b); const item={path:old.path,bytes:b.length,sha256:h}; files.push(item); if(h!==old.sha256||b.length!==old.bytes) changed.push({path:old.path,beforeSha256:old.sha256,afterSha256:h,beforeBytes:old.bytes,afterBytes:b.length}); }
if(changed.length!==1||changed[0].path!==DELTA_PATH) fail(`SUCCESSOR_DELTA_SCOPE_INVALID:${JSON.stringify(changed)}`);
if(changed[0].afterSha256!==deltaSha) fail('SUCCESSOR_DELTA_NOT_COMMITTED_BLOB');
const unchanged=files.filter((x,i)=>x.sha256===baseManifest.files[i].sha256&&x.bytes===baseManifest.files[i].bytes).length;
if(unchanged!==193) fail(`UNCHANGED_COUNT_INVALID:${unchanged}`);
const epoch=Number(sh('git',['show','-s','--format=%ct',PRODUCT_SOURCE_HEAD]).trim());
const generatedAt=new Date(epoch*1000).toISOString();
const manifest={
  schemaVersion:'orbit360-fase-a-product-package-manifest-v1', status:SUCCESSOR_STATUS, sourceHead:PRODUCT_SOURCE_HEAD, generatedAt,
  artifactRoot:baseManifest.artifactRoot||'orbit360-artifacts/fase-a-product', fileCount:194, files,
  lineage:{baseStatus:BASE_STATUS,baseSourceHead:BASE_SOURCE_HEAD,baseArtifactId:BASE_ARTIFACT_ID,baseZipSha256:BASE_ZIP_SHA256,deltaCount:1,unchangedProductFiles:193,productDelta:changed[0]}
};
writeJson(path.join(successor,'orbit360-package-manifest.json'),manifest);
setEpoch(successor,epoch);

// 4) Deterministic ZIP.
if(fs.existsSync(SUCCESSOR_ZIP)) fs.unlinkSync(SUCCESSOR_ZIP);
const sorted=listFiles(successor,false).join('\n')+'\n';
const zip=spawnSync('zip',['-X','-q',SUCCESSOR_ZIP,'-@'],{cwd:successor,input:sorted,encoding:'utf8'});
if(zip.status!==0) fail(`ZIP_FAILED:${zip.stderr||zip.stdout}`);
const zipSha=sha256(fs.readFileSync(SUCCESSOR_ZIP));

// 5) Reopen and certify every product file and manifest lineage.
sh('unzip',['-q',SUCCESSOR_ZIP,'-d',reopen]);
const reopenedManifest=readJson(path.join(reopen,'orbit360-package-manifest.json'));
if(reopenedManifest.status!==SUCCESSOR_STATUS||reopenedManifest.sourceHead!==PRODUCT_SOURCE_HEAD||reopenedManifest.fileCount!==194||(reopenedManifest.files||[]).length!==194) fail('REOPEN_MANIFEST_IDENTITY_MISMATCH');
const reopenErrors=fullRehash(reopen,reopenedManifest); if(reopenErrors.length) fail(`REOPEN_FULL_REHASH_FAIL:${reopenErrors.join('|')}`);
const rd=reopenedManifest.lineage?.productDelta||{};
if(rd.path!==DELTA_PATH||rd.afterSha256!==deltaSha||reopenedManifest.lineage?.unchangedProductFiles!==193||reopenedManifest.lineage?.deltaCount!==1) fail('REOPEN_LINEAGE_MISMATCH');
if(sha256(fs.readFileSync(path.join(reopen,DELTA_PATH)))!==deltaSha) fail('REOPEN_DELTA_SHA_MISMATCH');
sh(process.execPath,['--check',path.join(reopen,DELTA_PATH)]);
const manifestSha=sha256(fs.readFileSync(path.join(reopen,'orbit360-package-manifest.json')));

const evidence={
  schemaVersion:'orbit360-r4s9-minimal-successor-certification-v2', ok:true, status:'R4S9_MINIMAL_SUCCESSOR_CERTIFIED', manifestStatus:SUCCESSOR_STATUS,
  classification:'PASS', sourceHead:PRODUCT_SOURCE_HEAD, committedProductDeltaSha256:deltaSha, zipName:path.basename(SUCCESSOR_ZIP), zipSha256:zipSha,
  manifestSha256:manifestSha, fileCount:194, deltaCount:1, unchangedProductFiles:193, productDelta:changed[0], baseArtifactId:BASE_ARTIFACT_ID,
  baseZipSha256:BASE_ZIP_SHA256, baseFullyRehashed:true, packageReopened:true, allProductFilesRehashed:true, committedBlobSyntaxPass:true,
  protectedSurfacesUnchanged:true, worktreeShaBindingDeprecated:true, priorPackagingStopClassification:'VALIDATOR_STALE_WORKTREE_SHA_NORMALIZATION',
  browserExecuted:false,runtimeExecuted:false,secretAccess:false,dataAccess:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false
};
writeJson(path.join(EVIDENCE_DIR,'r4s9-minimal-successor-certification-v20260817.json'),evidence);
fs.writeFileSync(path.join(EVIDENCE_DIR,'r4s9-successor-zip-sha256-v20260817.txt'),`${zipSha}  ${path.basename(SUCCESSOR_ZIP)}\n`,'utf8');
console.log(JSON.stringify(evidence,null,2));
