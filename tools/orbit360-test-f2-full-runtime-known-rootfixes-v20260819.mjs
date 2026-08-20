#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {PROBE_DOCUMENT_PATH,validateProbeDocumentPath} from './orbit360-f2-cross-tenant-probe-contract-v20260818.mjs';
import {resolveCanonicalRoleForView} from './orbit360-f2-role-view-contract-v20260818.mjs';

const ROOT=process.cwd();
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const text=(p)=>fs.readFileSync(path.join(ROOT,p),'utf8');
const json=(p)=>JSON.parse(text(p));
const changed=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
const REQUEST_PATH=String(process.env.ORBIT360_REQUEST_FILE||changed.find(p=>/^\.github\/orbit360-requests\/f2-productive-acceptance-runtime-browser-readonly-runbound-[^/]+\.json$/.test(p))||'').trim();
need(REQUEST_PATH&&fs.existsSync(path.join(ROOT,REQUEST_PATH)),'VALIDATOR_STALE:F2_RUNTIME_REQUEST_NOT_RESOLVED');
const REQUEST=json(REQUEST_PATH);
need(REQUEST.requestVersion==='F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1','VALIDATOR_STALE:F2_RUNTIME_REQUEST_VERSION_MISMATCH');
need(REQUEST.gateId==='f2-productive-acceptance-exact-successor-v20260818','VALIDATOR_STALE:F2_RUNTIME_REQUEST_GATE_MISMATCH');
const FROZEN_SOURCE=String(REQUEST.candidateSourceHead||REQUEST.candidate?.sourceHead||'').trim();
const EXACT_ARTIFACT=Number(REQUEST.candidateArtifactId||REQUEST.candidate?.artifactId||0);
need(/^[0-9a-f]{40}$/.test(FROZEN_SOURCE)&&Number.isInteger(EXACT_ARTIFACT)&&EXACT_ARTIFACT>0,'VALIDATOR_STALE:F2_RUNTIME_REQUEST_CANDIDATE_INVALID');
const paths={
  runner:'tools/orbit360-f2-productive-acceptance-runtime-browser-readonly-v20260818.mjs',
  workflow:'.github/workflows/orbit360-f2-productive-acceptance-runtime-browser-readonly-v20260818.yml',
  engine:'tools/orbit360-validar-gate-contracts-engine-f2-productive-acceptance-v20260819.mjs',
  lifecycle:'tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-runtime-v20260819.json',
  legal:'tools/orbit360-browser-blocking-gate-readiness-v20260730.mjs',
  role:'tools/orbit360-f2-role-view-contract-v20260818.mjs'
};
const frozen=(p)=>execFileSync('git',['show',`${FROZEN_SOURCE}:${p}`],{cwd:ROOT,encoding:'utf8',maxBuffer:8*1024*1024});
const outPath=path.resolve(process.env.ORBIT360_F2_KNOWN_ROOTFIXES_EVIDENCE||path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/f2-full-runtime-known-rootfixes-selftest-v20260819.json'));
const write=(payload)=>{fs.mkdirSync(path.dirname(outPath),{recursive:true});fs.writeFileSync(outPath,JSON.stringify(payload,null,2)+'\n','utf8');console.log(JSON.stringify(payload,null,2));};

try{
  for(const p of Object.values(paths)) need(fs.existsSync(path.join(ROOT,p)),`VALIDATOR_STALE:F2_KNOWN_ROOTFIX_OWNER_MISSING:${p}`);
  const runner=text(paths.runner),workflow=text(paths.workflow),engine=text(paths.engine),lifecycle=json(paths.lifecycle),legal=text(paths.legal);

  need(PROBE_DOCUMENT_PATH==='tenants/orbit360-f2-cross-tenant-probe/system/config','VALIDATOR_STALE:F2_PROBE_CANONICAL_PATH_CHANGED');
  need(validateProbeDocumentPath(PROBE_DOCUMENT_PATH)===true,'VALIDATOR_STALE:F2_PROBE_CANONICAL_PATH_INVALID');
  need(!runner.includes('__orbit360_f2_cross_tenant_probe__'),'VALIDATOR_STALE:F2_FULL_RUNTIME_RESERVED_CROSS_TENANT_ID_PRESENT');
  need(runner.includes("from './orbit360-f2-cross-tenant-probe-contract-v20260818.mjs'"),'VALIDATOR_STALE:F2_FULL_RUNTIME_PROBE_CONTRACT_IMPORT_MISSING');
  need(runner.includes('validateProbeDocumentPath(PROBE_DOCUMENT_PATH)'),'VALIDATOR_STALE:F2_FULL_RUNTIME_PROBE_PATH_VALIDATION_MISSING');
  need(runner.includes('page.evaluate(async deniedPath=>')&&runner.includes('},PROBE_DOCUMENT_PATH);need(crossTenantDenied'),'VALIDATOR_STALE:F2_FULL_RUNTIME_PROBE_PATH_BINDING_MISSING');

  need(runner.includes('resolveCanonicalRoleForView')&&runner.includes('requiredViewsPresent')&&runner.includes('ROLE_VIEW_CONTRACT_VERSION'),'VALIDATOR_STALE:F2_ROLE_VIEW_ROOTFIX_NOT_BOUND');
  need(resolveCanonicalRoleForView(['SuperAdmin'],'Dirección')==='SuperAdmin','VALIDATOR_STALE:F2_ROLE_VIEW_DIRECTION_EQUIVALENCE_MISSING');
  need(resolveCanonicalRoleForView(['Dirección'],'Dirección')==='Dirección','VALIDATOR_STALE:F2_ROLE_VIEW_EXACT_DIRECTION_MISSING');
  need(resolveCanonicalRoleForView(['AdminTenant'],'Dirección')==='','VALIDATOR_STALE:F2_ROLE_VIEW_ADMIN_TENANT_FALSE_EQUIVALENCE');

  need(runner.includes('settleBlockingGates'),'VALIDATOR_STALE:F2_LEGAL_READINESS_HELPER_NOT_BOUND');
  need(legal.includes('postDetachDeadline')&&legal.includes('Math.max(hardDeadline,postDetachDeadline)'),'VALIDATOR_STALE:F2_LEGAL_DETACH_QUIET_WINDOW_ROOTFIX_MISSING');

  need(runner.includes("ROUTES=['inicio','cliente360','aseguradoras','ops','leads','polizas','cobros']"),'VALIDATOR_STALE:F2_ROUTE_TOPOLOGY_CHANGED');
  need(runner.includes('F2_ROUTE_NOT_RENDERED')&&runner.includes('F2_ROUTE_NOT_VISIBLE')&&runner.includes('authStage')&&runner.includes('bodyPreAuth')&&runner.includes('hostWidth')&&runner.includes('hostHeight')&&runner.includes('route(page,name,`${label}:${name}`)'),'VALIDATOR_STALE:F2_ROUTE_WAIT_OBSERVABILITY_NOT_BOUND');
  need(runner.includes('orbit-policy-fullpage')&&runner.includes('orbit-vehicle-fullpage')&&runner.includes('recibosEsperados'),'VALIDATOR_STALE:F2_INTEGRATED_SURFACE_CONTRACT_MISSING');

  need(lifecycle.authorization?.request==='DYNAMIC:ORBIT360_REQUEST_FILE','VALIDATOR_STALE:F2_RUNTIME_LIFECYCLE_REQUEST_POINTER_NOT_DYNAMIC');
  need(engine.includes('process.env.ORBIT360_REQUEST_FILE')&&engine.includes('f2-productive-acceptance-runtime-browser-readonly-runbound-[^/]+\\.json'),'VALIDATOR_STALE:F2_RUNTIME_ENGINE_NOT_DYNAMIC_REQUEST_BOUND');
  need(!engine.includes('request.requestOrdinal'),'VALIDATOR_STALE:F2_RUNTIME_ENGINE_ORDINAL_COUPLED');
  need(workflow.includes('f2-productive-acceptance-runtime-browser-readonly-runbound-*.json')&&workflow.includes('GITHUB_RUN_ATTEMPT')&&workflow.includes("= '1'"),'VALIDATOR_STALE:F2_RUNTIME_WORKFLOW_RUNBOUND_OR_ATTEMPT_GUARD_MISSING');
  need(workflow.includes('orbit360-test-f2-full-runtime-known-rootfixes-v20260819.mjs'),'VALIDATOR_STALE:F2_RUNTIME_WORKFLOW_SELFTEST_NOT_BOUND');

  need(runner.includes('REQUEST_FILE=String(process.env.ORBIT360_REQUEST_FILE')&&runner.includes('REQUEST?.candidateArtifactId')&&runner.includes('REQUEST?.candidateSourceHead'),'VALIDATOR_STALE:F2_RUNTIME_RUNNER_NOT_DYNAMIC_CANDIDATE_BOUND');
  need(!runner.includes('artifactId:9345207863')&&!runner.includes("sourceHead:'29caae94a3db1f1626bdde2ea6ee9a21799f9df6'"),'VALIDATOR_STALE:F2_RUNTIME_RUNNER_HISTORICAL_CANDIDATE_LITERAL_PRESENT');
  need(workflow.includes(`ORBIT360_CANDIDATE_ARTIFACT_ID: '${EXACT_ARTIFACT}'`)&&workflow.includes(`ORBIT360_CANDIDATE_SOURCE_HEAD: ${FROZEN_SOURCE}`),'VALIDATOR_STALE:F2_RUNTIME_WORKFLOW_REQUEST_CANDIDATE_MISMATCH');

  const pwa=frozen('orbit360-platform/core/pwa.js'),sw=frozen('orbit360-platform/sw.js'),provider=frozen('orbit360-platform/core/product-runtime-browser-providers-p0.js'),productApp=frozen('orbit360-platform/core/product-app-p0.js');
  for(const token of ['routerHostReady','waitForRouterReady(120000)','PRODUCT_ROUTER_NOT_READY','fase-a-product-p0-20260819-router-host-readiness']) need(productApp.includes(token),`VALIDATOR_STALE:F2_ROUTER_READINESS_ROOTFIX_NOT_FROZEN:${token}`);
  const pwaBuild=(pwa.match(/RUNTIME_BUILD\s*=\s*'([^']+)'/)||[])[1]||'';
  const swBuild=(sw.match(/BUILD\s*=\s*'([^']+)'/)||[])[1]||'';
  need(pwaBuild&&swBuild&&pwaBuild===swBuild,'VALIDATOR_STALE:F2_FROZEN_PWA_SW_BUILD_MISMATCH');
  need(pwa.includes("navigator.serviceWorker.register('sw.js?v=' + RUNTIME_BUILD)")&&pwa.includes('window.OrbitPwaWorkerReady'),'VALIDATOR_STALE:F2_FROZEN_PWA_REGISTRATION_CONTRACT_MISSING');
  need(sw.includes('caches.keys()')&&sw.includes('self.clients.claim()')&&sw.includes("key.indexOf('orbit360-') === 0 && key !== CACHE"),'VALIDATOR_STALE:F2_FROZEN_SW_CACHE_CLEANUP_CONTRACT_MISSING');
  need(runner.includes("fetch('/sw.js',{cache:'no-store'})")&&runner.includes('registrationCount<=1'),'VALIDATOR_STALE:F2_RUNTIME_SW_CHECK_MISSING');

  need(provider.includes('signInWithEmailAndPassword')&&provider.includes('Orbit.productRuntimeBrowserProvidersP0')&&provider.includes('writeAuthorized:false'),'VALIDATOR_STALE:F2_FROZEN_PRODUCT_AUTH_PROVIDER_MISSING');
  need(!/\bfirebase(?:\.cmd)?\s+deploy\b/i.test(workflow)&&!/\bgcloud\b[^\n]*\bdeploy\b/i.test(workflow),'SECURITY_FAILURE:F2_RUNTIME_WORKFLOW_DEPLOY_COMMAND_PRESENT');

  write({schemaVersion:'orbit360-f2-full-runtime-known-rootfixes-selftest-v2',ok:true,status:'F2_FULL_RUNTIME_KNOWN_ROOTFIXES_SOURCE_AUDIT_PASS',classification:'PASS',candidateArtifactId:EXACT_ARTIFACT,candidateSourceHead:FROZEN_SOURCE,requestVersion:REQUEST.requestVersion,dynamicCandidateBinding:true,crossTenant:{contract:'F2_CROSS_TENANT_PROBE_VALID_PATH_V2',pathValid:true,reservedIdAbsent:true,sharedContractBound:true},roleView:{rootfixBound:true,superAdminResolvesDirection:true,adminTenantRejectedForDirection:true},legalGate:{detachQuietWindowRootfixBound:true},topology:{routes:['inicio','cliente360','aseguradoras','ops','leads','polizas','cobros'],integrated:['vehiculos','recibosCartera']},requestLifecycle:{dynamicRunbound:true,ordinalCoupling:false},pwa:{frozenSourceBuild:pwaBuild,serviceWorkerBuild:swBuild,buildsMatch:true,cacheCleanupContract:true},auth:{frozenProductBrowserProviderPresent:true,passwordSignInProviderPresent:true},routerReadiness:{productAppWaitsForRenderedHost:true,timeoutMs:120000},runtimeWorkflow:{deployCommandPresent:false,selftestBound:true},browserExecuted:false,runtimeExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,membershipWrites:0,dataWrites:0,rulesDeploy:false,hostingDeploy:false,functionsDeploy:false,packageRebuild:false,publication:false,production:false,containsPII:false,containsSecrets:false,generatedAt:new Date().toISOString()});
}catch(error){
  write({schemaVersion:'orbit360-f2-full-runtime-known-rootfixes-selftest-v2',ok:false,status:'F2_FULL_RUNTIME_KNOWN_ROOTFIXES_SOURCE_AUDIT_FAIL',classification:String(error?.message||error).split(':')[0]||'VALIDATOR_STALE',error:String(error?.message||error).slice(0,900),browserExecuted:false,runtimeExecuted:false,secretAccess:false,firestoreRead:false,writes:0,containsPII:false,containsSecrets:false,generatedAt:new Date().toISOString()});
  process.exitCode=41;
}
