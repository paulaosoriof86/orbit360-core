#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT=process.cwd();
const DIR=path.resolve(String(process.env.ORBIT360_F2_CANDIDATE_DIR||'').trim());
const OUT=path.resolve(process.env.ORBIT360_F2_CANDIDATE_SOURCE_EVIDENCE||path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/f2-exact-candidate-source-validation-v20260818.json'));
const EXPECT={artifactId:9387820198,sourceHead:'fc46bd85783d8b4d524cbeb0fee54ee9a2c774af',zipSha256:'58fcbe6e8d7d3a425509c87f229b1cb12dd35a99133d46c757544cc75c55aacc',manifestSha256:'b18422fdf82830d28e82f657f83b4fd5c10ea134a4735263fa2587a2ddd808cb',status:'FASE_A_PRODUCT_F2_REQUEST08_ROUTER_READINESS_SUCCESSOR_CERTIFIED',fileCount:194};
const required=[
  'index.html','product-runtime-config.js','orbit360-package-manifest.json',
  'core/product-runtime-browser-providers-p0.js','core/auth-product-runtime-p0.js','core/backend-product-readonly-bootstrap-p0.js','core/product-app-p0.js',
  'core/router.js','core/router-tenant-config-product-bootstrap-p0.js','core/legal.js','core/pwa.js','core/access-scope.js','core/queries.js',
  'data/store-firestore-product-readonly-p0.js',
  'modules/inicio.js','modules/cliente360.js','modules/aseguradoras.js','modules/ops.js','modules/leads.js','modules/polizas.js','modules/cobros.js','modules/policy-receipts-v1199-detail-guard.js'
];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=rel=>fs.readFileSync(path.join(DIR,rel),'utf8');
const need=(ok,code)=>{if(!ok)throw new Error(code);};
function persist(p){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(p,null,2)+'\n','utf8');console.log(JSON.stringify(p,null,2));}
try{
  need(DIR&&fs.existsSync(DIR)&&fs.statSync(DIR).isDirectory(),'PIPELINE_MECHANISM_FAILURE:F2_CANDIDATE_DIR_REQUIRED');
  required.forEach(rel=>need(fs.existsSync(path.join(DIR,rel)),`DATA_CONTRACT_FAILURE:F2_REQUIRED_FILE_MISSING:${rel}`));
  const manifestPath=path.join(DIR,'orbit360-package-manifest.json');
  const manifestBytes=fs.readFileSync(manifestPath);
  need(sha(manifestBytes)===EXPECT.manifestSha256,'DATA_CONTRACT_FAILURE:F2_MANIFEST_SHA_MISMATCH');
  const manifest=JSON.parse(manifestBytes.toString('utf8'));
  need(manifest.status===EXPECT.status,'DATA_CONTRACT_FAILURE:F2_MANIFEST_STATUS_MISMATCH');
  need(manifest.sourceHead===EXPECT.sourceHead,'DATA_CONTRACT_FAILURE:F2_SOURCE_HEAD_MISMATCH');
  need(Number(manifest.fileCount)===EXPECT.fileCount&&Array.isArray(manifest.files)&&manifest.files.length===EXPECT.fileCount,'DATA_CONTRACT_FAILURE:F2_MANIFEST_COUNT_MISMATCH');
  const rehashErrors=[];
  for(const item of manifest.files){
    const abs=path.join(DIR,item.path);
    if(!fs.existsSync(abs)){rehashErrors.push(`missing:${item.path}`);continue;}
    const b=fs.readFileSync(abs);if(Number(item.bytes)!==b.length||String(item.sha256)!==sha(b))rehashErrors.push(`mismatch:${item.path}`);
  }
  need(rehashErrors.length===0,`DATA_CONTRACT_FAILURE:F2_FULL_REHASH_FAIL:${rehashErrors.slice(0,8).join('|')}`);
  const index=read('index.html');
  const requiredRefs=required.filter(x=>x!=='orbit360-package-manifest.json'&&x!=='index.html'&&x!=='product-runtime-config.js');
  requiredRefs.forEach(rel=>need(index.includes(`src="${rel}`),`FUNCTIONAL_DEFECT:F2_ENTRYPOINT_REF_MISSING:${rel}`));
  const config=read('core/config.js');
  for(const route of ['inicio','ops','leads','aseguradoras','cliente360','polizas','cobros'])need(new RegExp(`route:\\s*['\"]${route}['\"]`).test(config),`FUNCTIONAL_DEFECT:F2_ROUTE_CONTRACT_MISSING:${route}`);
  const integrated=read('modules/policy-receipts-v1199-detail-guard.js');
  const integratedTokens=['fullPagePolicy: true','fullPageVehicle: true','mod.verVehiculo = function','#/cliente360?c=','&v=','recibosEsperados','orbit-policy-fullpage','orbit-vehicle-fullpage','writesBackend: false','canonicalVisualAliasesOnly: true'];
  integratedTokens.forEach(token=>need(integrated.includes(token),`FUNCTIONAL_DEFECT:F2_INTEGRATED_SURFACE_TOKEN_MISSING:${token}`));
  const cobros=read('modules/cobros.js');
  need(/Cobros y cartera/i.test(cobros)&&/Aging de cartera/i.test(cobros),'FUNCTIONAL_DEFECT:F2_COBROS_CARTERA_SURFACE_MISSING');
  const productApp=read('core/product-app-p0.js');
  need(productApp.includes("mode:'product-readonly'")&&productApp.includes('Orbit.router.init()')&&productApp.includes('Orbit.auth.showApp()'),'FUNCTIONAL_DEFECT:F2_PRODUCT_APP_ACTIVATION_OWNER_INVALID');
  for(const token of ['routerHostReady','waitForRouterReady(120000)','PRODUCT_ROUTER_NOT_READY','fase-a-product-p0-20260819-router-host-readiness']) need(productApp.includes(token),`FUNCTIONAL_DEFECT:F2_ROUTER_READINESS_ROOTFIX_TOKEN_MISSING:${token}`);
  const store=read('data/store-firestore-product-readonly-p0.js');
  need(store.includes("writeEnabled: false")&&store.includes("noFallback: true")&&store.includes('WRITE_BLOCKED_PRODUCT_READ_ONLY_P0'),'SECURITY_FAILURE:F2_READONLY_STORE_GUARD_INVALID');
  const queries=read('core/queries.js');
  for(const token of ['metaDisponible','Number.isFinite(metaPrima)','Number.isFinite(rawPct)','metaPrima: metaDisponible ? metaPrima : 0']) need(queries.includes(token),`FUNCTIONAL_DEFECT:F2_INICIO_FINITE_ROOTFIX_TOKEN_MISSING:${token}`);
  persist({schemaVersion:'orbit360-f2-exact-candidate-source-validation-v1',ok:true,status:'F2_EXACT_CANDIDATE_SOURCE_VALIDATION_PASS',classification:'PASS',candidateArtifactId:EXPECT.artifactId,candidateSourceHead:EXPECT.sourceHead,candidateZipSha256:EXPECT.zipSha256,candidateManifestSha256:EXPECT.manifestSha256,candidateManifestStatus:EXPECT.status,candidateFileCount:EXPECT.fileCount,fullRehashPass:true,entrypointRefsPass:true,routes:{inicio:true,cliente360:true,aseguradoras:true,ops:true,leads:true,polizas:true,cobros:true},integratedSurfaces:{vehiculos:'cliente360_policy_deeplink_fullpage',recibosCartera:'policy_client360_plus_cobros_global'},readOnlyStoreGuardPass:true,inicioFiniteRootfixPass:true,routerReadinessRootfixPass:true,browserExecuted:false,runtimeExecuted:false,secretAccess:false,dataAccess:false,firestoreWrites:0,authWrites:0,operationalWrites:0,packageRebuilt:false,deployExecuted:false,publicationExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false});
}catch(error){persist({schemaVersion:'orbit360-f2-exact-candidate-source-validation-v1',ok:false,status:'F2_EXACT_CANDIDATE_SOURCE_VALIDATION_FAIL',classification:String(error?.message||error).split(':')[0]||'PIPELINE_MECHANISM_FAILURE',error:String(error?.message||error).slice(0,500),candidateArtifactId:EXPECT.artifactId,browserExecuted:false,runtimeExecuted:false,secretAccess:false,dataAccess:false,firestoreWrites:0,authWrites:0,operationalWrites:0,packageRebuilt:false,deployExecuted:false,publicationExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false});process.exitCode=41;}
