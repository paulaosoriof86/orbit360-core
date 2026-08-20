#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const ROOT=process.cwd();
const DIR=path.resolve(String(process.env.ORBIT360_F2_CANDIDATE_DIR||'').trim());
const OUT=path.resolve(process.env.ORBIT360_F2_CANDIDATE_SOURCE_EVIDENCE||path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/f2-exact-candidate-source-validation-v20260818.json'));
const REQUEST_PATH=String(process.env.ORBIT360_REQUEST_FILE||'').trim();
const need=(v,c)=>{if(!v)throw new Error(c);};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const persist=p=>{fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(p,null,2)+'\n','utf8');console.log(JSON.stringify(p,null,2));};
let EXPECT={artifactId:0};
try{
  need(REQUEST_PATH&&fs.existsSync(path.join(ROOT,REQUEST_PATH)),'VALIDATOR_STALE:F2_DYNAMIC_REQUEST_REQUIRED');
  const r=JSON.parse(fs.readFileSync(path.join(ROOT,REQUEST_PATH),'utf8'));
  EXPECT={artifactId:Number(r.candidateArtifactId||r.candidate?.artifactId||0),sourceHead:String(r.candidateSourceHead||r.candidate?.sourceHead||''),zipSha256:String(r.candidateZipSha256||r.candidate?.zipSha256||''),manifestSha256:String(r.candidateManifestSha256||r.candidate?.manifestSha256||''),status:String(r.candidate?.manifestStatus||''),fileCount:Number(r.candidate?.fileCount||0)};
  need(EXPECT.artifactId>0&&/^[0-9a-f]{40}$/.test(EXPECT.sourceHead)&&/^[0-9a-f]{64}$/.test(EXPECT.manifestSha256)&&EXPECT.status&&EXPECT.fileCount===194,'VALIDATOR_STALE:F2_DYNAMIC_CANDIDATE_IDENTITY_INVALID');
  need(DIR&&fs.existsSync(DIR)&&fs.statSync(DIR).isDirectory(),'PIPELINE_MECHANISM_FAILURE:F2_CANDIDATE_DIR_REQUIRED');
  const required=['index.html','product-runtime-config.js','orbit360-package-manifest.json','core/product-runtime-browser-providers-p0.js','core/auth-product-runtime-p0.js','core/backend-product-readonly-bootstrap-p0.js','core/product-app-p0.js','core/router.js','core/router-tenant-config-product-bootstrap-p0.js','core/legal.js','core/pwa.js','core/access-scope.js','core/queries.js','data/store-firestore-product-readonly-p0.js','modules/inicio.js','modules/cliente360.js','modules/aseguradoras.js','modules/ops.js','modules/leads.js','modules/polizas.js','modules/cobros.js','modules/policy-receipts-v1199-detail-guard.js'];
  required.forEach(rel=>need(fs.existsSync(path.join(DIR,rel)),`DATA_CONTRACT_FAILURE:F2_REQUIRED_FILE_MISSING:${rel}`));
  const manifestBytes=fs.readFileSync(path.join(DIR,'orbit360-package-manifest.json'));
  need(sha(manifestBytes)===EXPECT.manifestSha256,'DATA_CONTRACT_FAILURE:F2_MANIFEST_SHA_MISMATCH');
  const manifest=JSON.parse(manifestBytes.toString('utf8'));
  need(manifest.status===EXPECT.status&&manifest.sourceHead===EXPECT.sourceHead&&Number(manifest.fileCount)===194&&manifest.files?.length===194,'DATA_CONTRACT_FAILURE:F2_MANIFEST_IDENTITY_MISMATCH');
  const errors=[];for(const item of manifest.files){const p=path.join(DIR,item.path);if(!fs.existsSync(p)){errors.push(`missing:${item.path}`);continue;}const b=fs.readFileSync(p);if(Number(item.bytes)!==b.length||String(item.sha256)!==sha(b))errors.push(`mismatch:${item.path}`);}need(errors.length===0,`DATA_CONTRACT_FAILURE:F2_FULL_REHASH_FAIL:${errors.slice(0,8).join('|')}`);
  const read=rel=>fs.readFileSync(path.join(DIR,rel),'utf8');
  const index=read('index.html');required.filter(x=>!['orbit360-package-manifest.json','index.html','product-runtime-config.js'].includes(x)).forEach(rel=>need(index.includes(`src="${rel}`),`FUNCTIONAL_DEFECT:F2_ENTRYPOINT_REF_MISSING:${rel}`));
  const config=read('core/config.js');for(const route of ['inicio','ops','leads','aseguradoras','cliente360','polizas','cobros'])need(new RegExp(`route:\\s*['\"]${route}['\"]`).test(config),`FUNCTIONAL_DEFECT:F2_ROUTE_CONTRACT_MISSING:${route}`);
  const productApp=read('core/product-app-p0.js');for(const token of ['routerHostReady','waitForRouterReady(120000)','PRODUCT_ROUTER_NOT_READY','fase-a-product-p0-20260819-router-host-readiness'])need(productApp.includes(token),`FUNCTIONAL_DEFECT:F2_ROUTER_READINESS_ROOTFIX_TOKEN_MISSING:${token}`);
  const store=read('data/store-firestore-product-readonly-p0.js');
  need(store.includes("writeEnabled: false")&&store.includes("noFallback: true")&&store.includes('WRITE_BLOCKED_PRODUCT_READ_ONLY_P0'),'SECURITY_FAILURE:F2_READONLY_STORE_GUARD_INVALID');
  need(store.includes("var row = (cache[collection] || []).find")&&!store.includes("return all(collection).find(function (row)"),'FUNCTIONAL_DEFECT:F2_STORE_GET_ROOTFIX_NOT_MATERIALIZED');
  const queries=read('core/queries.js');for(const token of ['metaDisponible','Number.isFinite(metaPrima)','Number.isFinite(rawPct)','metaPrima: metaDisponible ? metaPrima : 0'])need(queries.includes(token),`FUNCTIONAL_DEFECT:F2_INICIO_FINITE_ROOTFIX_TOKEN_MISSING:${token}`);
  const integrated=read('modules/policy-receipts-v1199-detail-guard.js');for(const token of ['orbit-policy-fullpage','orbit-vehicle-fullpage','recibosEsperados','writesBackend: false'])need(integrated.includes(token),`FUNCTIONAL_DEFECT:F2_INTEGRATED_SURFACE_TOKEN_MISSING:${token}`);
  persist({schemaVersion:'orbit360-f2-exact-candidate-source-validation-v2',ok:true,status:'F2_EXACT_CANDIDATE_SOURCE_VALIDATION_PASS',classification:'PASS',candidateArtifactId:EXPECT.artifactId,candidateSourceHead:EXPECT.sourceHead,candidateZipSha256:EXPECT.zipSha256,candidateManifestSha256:EXPECT.manifestSha256,candidateManifestStatus:EXPECT.status,candidateFileCount:194,fullRehashPass:true,entrypointRefsPass:true,readOnlyStoreGuardPass:true,inicioFiniteRootfixPass:true,routerReadinessRootfixPass:true,storeGetRootfixPass:true,browserExecuted:false,runtimeExecuted:false,secretAccess:false,dataAccess:false,firestoreWrites:0,authWrites:0,operationalWrites:0,packageRebuilt:false,deployExecuted:false,publicationExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false});
}catch(error){persist({schemaVersion:'orbit360-f2-exact-candidate-source-validation-v2',ok:false,status:'F2_EXACT_CANDIDATE_SOURCE_VALIDATION_FAIL',classification:String(error?.message||error).split(':')[0]||'PIPELINE_MECHANISM_FAILURE',error:String(error?.message||error).slice(0,700),candidateArtifactId:EXPECT.artifactId,browserExecuted:false,runtimeExecuted:false,secretAccess:false,dataAccess:false,firestoreWrites:0,authWrites:0,operationalWrites:0,packageRebuilt:false,deployExecuted:false,publicationExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false});process.exitCode=41;}
