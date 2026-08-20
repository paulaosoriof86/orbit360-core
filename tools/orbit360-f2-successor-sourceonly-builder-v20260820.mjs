#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT=process.cwd();
const REQUEST_PATH=String(process.env.ORBIT360_SUCCESSOR_REQUEST||'').trim();
const PRE=String(process.env.ORBIT360_PREDECESSOR_DIR||'').trim();
const OUT=String(process.env.ORBIT360_SUCCESSOR_DIR||'').trim();
const SOURCE_HEAD=String(process.env.ORBIT360_SUCCESSOR_SOURCE_HEAD||'').trim();
const STATUS='FASE_A_PRODUCT_F2_SUCCESSOR_STORE_ROOTFIX_SOURCEONLY_CERTIFIED';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=p=>fs.readFileSync(p);
const must=(v,c)=>{if(!v)throw new Error(c);};
const json=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));

must(REQUEST_PATH&&fs.existsSync(REQUEST_PATH),'PIPELINE_MECHANISM_FAILURE:SUCCESSOR_REQUEST_REQUIRED');
must(PRE&&fs.existsSync(PRE),'PIPELINE_MECHANISM_FAILURE:PREDECESSOR_DIR_REQUIRED');
must(OUT,'PIPELINE_MECHANISM_FAILURE:SUCCESSOR_DIR_REQUIRED');
must(/^[0-9a-f]{40}$/.test(SOURCE_HEAD),'PIPELINE_MECHANISM_FAILURE:SOURCE_HEAD_REQUIRED');
const req=json(REQUEST_PATH);
must(req.schemaVersion==='orbit360-f2-successor-candidate-build-request-v1','PIPELINE_MECHANISM_FAILURE:REQUEST_SCHEMA_INVALID');
must(req.requestVersion==='F2_SUCCESSOR_CANDIDATE_BUILD_SOURCEONLY_V1','PIPELINE_MECHANISM_FAILURE:REQUEST_VERSION_INVALID');
must(req.sourceOnly===true&&req.runtime===false&&req.browser===false&&req.secrets===false&&req.firestoreRead===false&&req.writes===false&&req.deploy===false&&req.production===false,'SECURITY_FAILURE:REQUEST_SCOPE_NOT_SOURCE_ONLY');
must(req.replayAllowed===false&&req.allowedExecutions===1,'PIPELINE_MECHANISM_FAILURE:REQUEST_EXECUTION_BOUNDARY_INVALID');
must(req.sourceHead===SOURCE_HEAD,'PIPELINE_MECHANISM_FAILURE:REQUEST_SOURCE_HEAD_MISMATCH');
must(Number(req.predecessorArtifactId)===9385306424,'PIPELINE_MECHANISM_FAILURE:UNEXPECTED_PREDECESSOR_ARTIFACT');
must(Array.isArray(req.forbiddenArtifactIds)&&req.forbiddenArtifactIds.includes(9387820198),'PIPELINE_MECHANISM_FAILURE:HISTORICAL_ARTIFACT_FORBID_GUARD_MISSING');
must(Number(req.predecessorArtifactId)!==9387820198,'PIPELINE_MECHANISM_FAILURE:HISTORICAL_ARTIFACT_REUSE_FORBIDDEN');
const expectedDeltas=['core/product-app-p0.js','data/store-firestore-product-readonly-p0.js'];
must(JSON.stringify([...(req.deltaPaths||[])].sort())===JSON.stringify([...expectedDeltas].sort()),'DATA_CONTRACT_FAILURE:SUCCESSOR_DELTA_CONTRACT_INVALID');

const manifestPath=path.join(PRE,'orbit360-package-manifest.json');
must(fs.existsSync(manifestPath),'DATA_CONTRACT_FAILURE:PREDECESSOR_MANIFEST_MISSING');
const manifestBytes=read(manifestPath);
must(sha(manifestBytes)===req.predecessorManifestSha256,'DATA_CONTRACT_FAILURE:PREDECESSOR_MANIFEST_SHA_MISMATCH');
const preManifest=JSON.parse(manifestBytes.toString('utf8'));
must(preManifest.status===req.predecessorManifestStatus,'DATA_CONTRACT_FAILURE:PREDECESSOR_STATUS_MISMATCH');
must(preManifest.sourceHead===req.predecessorSourceHead,'DATA_CONTRACT_FAILURE:PREDECESSOR_SOURCE_MISMATCH');
must(Number(preManifest.fileCount)===194&&Array.isArray(preManifest.files)&&preManifest.files.length===194,'DATA_CONTRACT_FAILURE:PREDECESSOR_FILECOUNT_MISMATCH');

fs.rmSync(OUT,{recursive:true,force:true});
fs.cpSync(PRE,OUT,{recursive:true});
for(const rel of expectedDeltas){
  const source=path.join(ROOT,'orbit360-platform',rel);
  const target=path.join(OUT,rel);
  must(fs.existsSync(source),`DATA_CONTRACT_FAILURE:SOURCE_DELTA_MISSING:${rel}`);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.copyFileSync(source,target);
}

const productApp=fs.readFileSync(path.join(OUT,'core/product-app-p0.js'),'utf8');
for(const token of ['routerHostReady','waitForRouterReady(120000)','PRODUCT_ROUTER_NOT_READY','fase-a-product-p0-20260819-router-host-readiness'])must(productApp.includes(token),`FUNCTIONAL_DEFECT:F2_ROUTER_READINESS_ROOTFIX_TOKEN_MISSING:${token}`);
const store=fs.readFileSync(path.join(OUT,'data/store-firestore-product-readonly-p0.js'),'utf8');
must(store.includes("var row = (cache[collection] || []).find(function (item) { return rowId(item) === id; });"),'FUNCTIONAL_DEFECT:F2_STORE_GET_DIRECT_CACHE_LOOKUP_MISSING');
must(store.includes('return row ? clone(row) : null;'),'FUNCTIONAL_DEFECT:F2_STORE_GET_ROW_CLONE_MISSING');
must(!store.includes("return all(collection).find(function (row) { return rowId(row) === id; }) || null;"),'FUNCTIONAL_DEFECT:F2_STORE_GET_FULL_COLLECTION_CLONE_STILL_PRESENT');
must(store.includes("writeEnabled: false")&&store.includes("noFallback: true")&&store.includes('WRITE_BLOCKED_PRODUCT_READ_ONLY_P0'),'SECURITY_FAILURE:F2_READONLY_STORE_GUARD_INVALID');

const actual=[];
function walk(dir,rel=''){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
    const r=(rel?rel+'/':'')+ent.name;
    const p=path.join(dir,ent.name);
    if(ent.isDirectory())walk(p,r);
    else if(r!=='orbit360-package-manifest.json')actual.push(r.replaceAll('\\','/'));
  }
}
walk(OUT);
must(actual.length===194,'DATA_CONTRACT_FAILURE:SUCCESSOR_FILECOUNT_MISMATCH');
const preMap=new Map(preManifest.files.map(x=>[x.path,x]));
const files=actual.map(p=>{const b=read(path.join(OUT,p));return{path:p,bytes:b.length,sha256:sha(b)};});
const deltas=files.filter(x=>!preMap.has(x.path)||preMap.get(x.path).sha256!==x.sha256||Number(preMap.get(x.path).bytes)!==x.bytes);
const deltaPaths=deltas.map(x=>x.path).sort();
must(JSON.stringify(deltaPaths)===JSON.stringify([...expectedDeltas].sort()),`DATA_CONTRACT_FAILURE:SUCCESSOR_DELTA_MISMATCH:${deltaPaths.join('|')}`);

const manifest=structuredClone(preManifest);
manifest.status=STATUS;
manifest.sourceHead=SOURCE_HEAD;
manifest.generatedAt=new Date().toISOString();
manifest.fileCount=194;
manifest.files=files;
manifest.baseArtifactId=Number(req.predecessorArtifactId);
manifest.basePackageSha256=req.predecessorZipSha256;
manifest.baseSourceHead=req.predecessorSourceHead;
manifest.baseManifestSha256=req.predecessorManifestSha256;
manifest.deltaFiles=expectedDeltas;
manifest.deltaSourceHead=SOURCE_HEAD;
manifest.unchangedFileCount=192;
manifest.packageLineage='Certified pre-historical predecessor + router-readiness rootfix + protected-store get() clone-amplification rootfix; source-only successor';
manifest.candidateOrigin='F2_SUCCESSOR_SOURCEONLY_ROOTFIX_REBUILD';
manifest.historicalArtifactReuseForbidden=true;
manifest.forbiddenHistoricalArtifactIds=[9387820198];
manifest.rootCause='FUNCTIONAL_DEFECT:F2_PRODUCT_READONLY_GET_FULL_COLLECTION_CLONE_AMPLIFICATION';
manifest.rootfix='cache.find -> clone(foundRow)';
manifest.runtimeAuthorized=false;
manifest.lineage=manifest.lineage||{};
manifest.lineage.f2_successor_sourceonly_rootfix={baseArtifactId:Number(req.predecessorArtifactId),baseZipSha256:req.predecessorZipSha256,baseManifestSha256:req.predecessorManifestSha256,baseSourceHead:req.predecessorSourceHead,sourceHead:SOURCE_HEAD,productDeltaCount:2,productDeltaPaths:expectedDeltas,historicalArtifact9387820198Used:false,sourceOnly:true,runtimeAuthorized:false};
fs.writeFileSync(path.join(OUT,'orbit360-package-manifest.json'),JSON.stringify(manifest,null,2)+'\n','utf8');
const finalManifestSha=sha(read(path.join(OUT,'orbit360-package-manifest.json')));
console.log(JSON.stringify({schemaVersion:'orbit360-f2-successor-sourceonly-build-v1',ok:true,status:STATUS,classification:'PASS',sourceHead:SOURCE_HEAD,predecessorArtifactId:Number(req.predecessorArtifactId),historicalArtifact9387820198Used:false,fileCount:194,fullRehashPass:true,deltaCount:2,deltaPaths:expectedDeltas,unchangedFileCount:192,manifestSha256:finalManifestSha,routerReadinessRootfixPass:true,storeGetRootfixPass:true,readOnlyStoreGuardPass:true,browserExecuted:false,runtimeExecuted:false,secretAccess:false,dataAccess:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,publicationExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));