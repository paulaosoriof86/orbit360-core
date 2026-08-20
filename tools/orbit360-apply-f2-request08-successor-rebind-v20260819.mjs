#!/usr/bin/env node
'use strict';
import fs from 'node:fs';

const OLD={artifactId:9385306424,sourceHead:'b94b2ae86d26586a68d33be9edba8715e956b02e',zipName:'orbit360-fase-a-product-f2-request06-rootfix-successor-b94b2ae86d26.zip',zipSha:'81a96f476fd0fdfd814b3f047951ce653fd324bef8a6d96d6ee6fe44dd7bdcf4',manifestSha:'cc6170121ed61fd6d9cde867dfcae8a3dd23d29777c6ee28c240d70e49843eef',status:'FASE_A_PRODUCT_F2_REQUEST06_ROOTFIX_SUCCESSOR_CERTIFIED'};
const NEW={artifactId:9387820198,sourceHead:'fc46bd85783d8b4d524cbeb0fee54ee9a2c774af',zipName:'orbit360-fase-a-product-f2-request08-router-readiness-successor-fc46bd85783d.zip',zipSha:'58fcbe6e8d7d3a425509c87f229b1cb12dd35a99133d46c757544cc75c55aacc',manifestSha:'b18422fdf82830d28e82f657f83b4fd5c10ea134a4735263fa2587a2ddd808cb',status:'FASE_A_PRODUCT_F2_REQUEST08_ROUTER_READINESS_SUCCESSOR_CERTIFIED'};
const GATE='f2-productive-acceptance-exact-successor-v20260818';
const REQUEST_VERSION='F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1';
const paths={source:'tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-source-v20260819.json',runtime:'tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-runtime-v20260819.json',engine:'tools/orbit360-validar-gate-contracts-engine-f2-productive-acceptance-v20260819.mjs',validator:'tools/orbit360-f2-exact-candidate-source-validator-v20260819.mjs',sourceWorkflow:'.github/workflows/orbit360-f2-successor-source-validation-v20260819.yml',runtimeWorkflow:'.github/workflows/orbit360-f2-productive-acceptance-runtime-browser-readonly-v20260818.yml',known:'tools/orbit360-test-f2-full-runtime-known-rootfixes-v20260819.mjs',live:'orbit360-platform/docs/orbit360-live-state-v1.json',index:'orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json'};
const must=(v,c)=>{if(!v)throw new Error(c);};
const read=p=>fs.readFileSync(p,'utf8');
const json=p=>JSON.parse(read(p));
const writeJson=(p,o)=>fs.writeFileSync(p,JSON.stringify(o,null,2)+'\n');
const replace=(s,a,b,c)=>{must(s.includes(a),c||`REBIND_TOKEN_MISSING:${a}`);return s.split(a).join(b);};

for(const p of Object.values(paths)) must(fs.existsSync(p),`REBIND_OWNER_MISSING:${p}`);

const source=json(paths.source);
source.status='F2_SOURCE_REBIND_PENDING';
source.f2ValidatorRevision='f2-productive-acceptance-request08-readiness-successor-rebind-v3-20260819';
Object.assign(source.guards,{candidateArtifactId:NEW.artifactId,candidateZipSha256:NEW.zipSha,candidateManifestSha256:NEW.manifestSha,candidateSourceHead:NEW.sourceHead,candidateManifestStatus:NEW.status,candidateFileCount:194,predecessorArtifactId:OLD.artifactId});
source.authorization={...(source.authorization||{}),requiredForExecution:false,activeRequest:false,request:'DYNAMIC:SOURCE_ONLY_RUNBOUND',allowedExecutions:0,consumed:false,authorizationFrozen:true,replayAllowed:false};
source.sourceOnlyResult={ok:false,status:'PENDING_REBIND_SOURCE_ONLY',classification:'PENDING',predecessorArtifactId:OLD.artifactId,candidateArtifactId:NEW.artifactId,candidateSourceHead:NEW.sourceHead,candidateZipSha256:NEW.zipSha,candidateManifestSha256:NEW.manifestSha,candidateManifestStatus:NEW.status,candidateFileCount:194,fullRehashPass:true,inicioFiniteRootfixPass:true,routerReadinessRootfixPass:true,exactCandidateBound:true,surfaceTopologyBound:true,runtimeWorkflowPrepared:true,runtimeFreshAuthorizationRequired:true,requestCreated:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,dataAccess:false,writes:0,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,publicationExecuted:false,productionTouched:false};
writeJson(paths.source,source);

const runtime=json(paths.runtime);
runtime.status='F2_RUNTIME_BLOCKED_SOURCE_REBIND';
runtime.f2ValidatorRevision='f2-productive-acceptance-request08-readiness-successor-rebind-v3-20260819';
Object.assign(runtime.guards,{candidateArtifactId:NEW.artifactId,candidateZipSha256:NEW.zipSha,candidateManifestSha256:NEW.manifestSha,candidateSourceHead:NEW.sourceHead,candidateManifestStatus:NEW.status,candidateFileCount:194,predecessorArtifactId:OLD.artifactId});
runtime.authorization={...(runtime.authorization||{}),activeRequest:false,request:'DYNAMIC:ORBIT360_REQUEST_FILE',allowedExecutions:0,consumed:false,authorizationFrozen:true,replayAllowed:false};
runtime.sourceOnlyPrerequisite={status:'PENDING_REBIND_SOURCE_ONLY',candidateArtifactId:NEW.artifactId,fullRehashPass:true,inicioFiniteRootfixPass:true,routerReadinessRootfixPass:true};
writeJson(paths.runtime,runtime);

let engine=read(paths.engine);
engine=replace(engine,`const EXPECT={artifactId:${OLD.artifactId},sourceHead:'${OLD.sourceHead}',zipSha256:'${OLD.zipSha}',manifestSha256:'${OLD.manifestSha}',manifestStatus:'${OLD.status}',fileCount:194,requestVersion:'${REQUEST_VERSION}'};`,`const EXPECT={artifactId:${NEW.artifactId},sourceHead:'${NEW.sourceHead}',zipSha256:'${NEW.zipSha}',manifestSha256:'${NEW.manifestSha}',manifestStatus:'${NEW.status}',fileCount:194,requestVersion:'${REQUEST_VERSION}'};`,'REBIND_ENGINE_EXPECT_MISSING');
engine=replace(engine,"validatorRootfix:'F2_SUCCESSOR_REBIND_SOURCE_BOUNDARY_V3'","validatorRootfix:'F2_REQUEST08_ROUTER_READINESS_SUCCESSOR_REBIND_V4'");
fs.writeFileSync(paths.engine,engine);

let validator=read(paths.validator);
validator=replace(validator,`const EXPECT={artifactId:${OLD.artifactId},sourceHead:'${OLD.sourceHead}',zipSha256:'${OLD.zipSha}',manifestSha256:'${OLD.manifestSha}',status:'${OLD.status}',fileCount:194};`,`const EXPECT={artifactId:${NEW.artifactId},sourceHead:'${NEW.sourceHead}',zipSha256:'${NEW.zipSha}',manifestSha256:'${NEW.manifestSha}',status:'${NEW.status}',fileCount:194};`,'REBIND_VALIDATOR_EXPECT_MISSING');
const oldProductCheck="need(productApp.includes(\"mode:'product-readonly'\")&&productApp.includes('Orbit.router.init()')&&productApp.includes('Orbit.auth.showApp()'),'FUNCTIONAL_DEFECT:F2_PRODUCT_APP_ACTIVATION_OWNER_INVALID');";
const newProductCheck=oldProductCheck+"\n  for(const token of ['routerHostReady','waitForRouterReady(120000)','PRODUCT_ROUTER_NOT_READY','fase-a-product-p0-20260819-router-host-readiness']) need(productApp.includes(token),`FUNCTIONAL_DEFECT:F2_ROUTER_READINESS_ROOTFIX_TOKEN_MISSING:${token}`);";
validator=replace(validator,oldProductCheck,newProductCheck,'REBIND_VALIDATOR_PRODUCT_CHECK_MISSING');
validator=replace(validator,'readOnlyStoreGuardPass:true,inicioFiniteRootfixPass:true,','readOnlyStoreGuardPass:true,inicioFiniteRootfixPass:true,routerReadinessRootfixPass:true,');
fs.writeFileSync(paths.validator,validator);

for(const p of [paths.sourceWorkflow,paths.runtimeWorkflow]){
  let s=read(p);
  s=replace(s,String(OLD.artifactId),String(NEW.artifactId));
  s=replace(s,OLD.sourceHead,NEW.sourceHead);
  s=replace(s,OLD.zipName,NEW.zipName);
  s=replace(s,OLD.zipSha,NEW.zipSha);
  s=replace(s,OLD.manifestSha,NEW.manifestSha);
  if(s.includes(OLD.status)) s=replace(s,OLD.status,NEW.status);
  s=s.split('.inicioFiniteRootfixPass==true').join('.inicioFiniteRootfixPass==true and .routerReadinessRootfixPass==true');
  s=s.split('inicioFiniteRootfixPass:true').join('inicioFiniteRootfixPass:true,routerReadinessRootfixPass:true');
  fs.writeFileSync(p,s);
}

let known=read(paths.known);
const anchor="  const pwa=frozen('orbit360-platform/core/pwa.js'),sw=frozen('orbit360-platform/sw.js'),provider=frozen('orbit360-platform/core/product-runtime-browser-providers-p0.js');";
const repl="  const pwa=frozen('orbit360-platform/core/pwa.js'),sw=frozen('orbit360-platform/sw.js'),provider=frozen('orbit360-platform/core/product-runtime-browser-providers-p0.js'),productApp=frozen('orbit360-platform/core/product-app-p0.js');\n  for(const token of ['routerHostReady','waitForRouterReady(120000)','PRODUCT_ROUTER_NOT_READY','fase-a-product-p0-20260819-router-host-readiness']) need(productApp.includes(token),`VALIDATOR_STALE:F2_ROUTER_READINESS_ROOTFIX_NOT_FROZEN:${token}`);";
known=replace(known,anchor,repl,'REBIND_KNOWN_ROOTFIX_ANCHOR_MISSING');
known=replace(known,"auth:{frozenProductBrowserProviderPresent:true,passwordSignInProviderPresent:true},","auth:{frozenProductBrowserProviderPresent:true,passwordSignInProviderPresent:true},routerReadiness:{productAppWaitsForRenderedHost:true,timeoutMs:120000},");
fs.writeFileSync(paths.known,known);

const live=json(paths.live);
live.f2SourceOnly={...(live.f2SourceOnly||{}),status:'PENDING_REBIND_SOURCE_ONLY',gateId:GATE,candidateArtifactId:NEW.artifactId,candidateSourceHead:NEW.sourceHead,candidateZipSha256:NEW.zipSha,candidateManifestSha256:NEW.manifestSha,candidateManifestStatus:NEW.status,candidateFileCount:194,predecessorArtifactId:OLD.artifactId,fullRehashPass:true,inicioFiniteRootfixPass:true,routerReadinessRootfixPass:true};
live.nextActionExact={...(live.nextActionExact||{}),action:'RUN_F2_REQUEST08_SUCCESSOR_SOURCE_ONLY_VALIDATION',gateId:GATE,requestVersion:REQUEST_VERSION,candidateArtifactId:NEW.artifactId};
live.phase='F2_REQUEST08_SUCCESSOR_SOURCE_REBIND_PENDING';
live.updatedAt=new Date().toISOString();
live.lanes={...(live.lanes||{}),A_frontend_UX:'FROZEN_REQUEST08_ROUTER_READINESS_ROOTFIX_SUCCESSOR_BUILT',B_backend_security_gates:'F2_REQUEST08_SUCCESSOR_SOURCE_REBIND_PENDING',C_real_data_migration:'UNTOUCHED_ZERO_CHANGES'};
writeJson(paths.live,live);

const index=json(paths.index);
index.updatedAt=new Date().toISOString();
index.operationalCurrent={...(index.operationalCurrent||{}),f2SourceOnlyStatus:'PENDING_REBIND_SOURCE_ONLY',successorCandidateArtifactId:NEW.artifactId,successorSourceHead:NEW.sourceHead,successorZip:NEW.zipName,successorZipSha256:NEW.zipSha,successorManifestSha256:NEW.manifestSha,successorCandidateManifestStatus:NEW.status,successorFileCount:194,nextAuthorizationBoundary:`SOURCE_REBIND_PENDING:${REQUEST_VERSION}:REQUEST09:EXACT_ARTIFACT_${NEW.artifactId}`,currentPhase:'F2_REQUEST08_SUCCESSOR_SOURCE_REBIND_PENDING',currentBlocker:'SOURCE-only rebind and validation required for Request08 router-readiness successor; Request09 is not authorized.'};
writeJson(paths.index,index);

console.log(JSON.stringify({ok:true,status:'F2_REQUEST08_SUCCESSOR_CANONICAL_REBIND_APPLIED',classification:'PASS',candidateArtifactId:NEW.artifactId,candidateSourceHead:NEW.sourceHead,sourceState:'PENDING_REBIND_SOURCE_ONLY',runtimeState:'BLOCKED_SOURCE_REBIND',ownersUpdated:Object.values(paths),request09Authorized:false,browserExecuted:false,runtimeExecuted:false,secretAccess:false,firestoreRead:false,writes:0,deployExecuted:false,productionTouched:false},null,2));