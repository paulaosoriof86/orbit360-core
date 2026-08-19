#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {PROBE_DOCUMENT_PATH,validateProbeDocumentPath} from './orbit360-f2-cross-tenant-probe-contract-v20260818.mjs';

const ROOT=process.cwd();
const FROZEN_SOURCE='29caae94a3db1f1626bdde2ea6ee9a21799f9df6';
const EXACT_ARTIFACT=9345207863;
const paths={
  runner:'tools/orbit360-f2-productive-acceptance-runtime-browser-readonly-v20260818.mjs',
  workflow:'.github/workflows/orbit360-f2-productive-acceptance-runtime-browser-readonly-v20260818.yml',
  engine:'tools/orbit360-validar-gate-contracts-engine-f2-productive-acceptance-v20260818.mjs',
  lifecycle:'tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-runtime-v20260818.json',
  legal:'tools/orbit360-browser-blocking-gate-readiness-v20260730.mjs',
  role:'tools/orbit360-f2-role-view-contract-v20260818.mjs'
};
const text=(p)=>fs.readFileSync(path.join(ROOT,p),'utf8');
const json=(p)=>JSON.parse(text(p));
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const frozen=(p)=>execFileSync('git',['show',`${FROZEN_SOURCE}:${p}`],{cwd:ROOT,encoding:'utf8',maxBuffer:8*1024*1024});
const outPath=path.resolve(process.env.ORBIT360_F2_KNOWN_ROOTFIXES_EVIDENCE||path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/f2-full-runtime-known-rootfixes-selftest-v20260819.json'));
const write=(payload)=>{fs.mkdirSync(path.dirname(outPath),{recursive:true});fs.writeFileSync(outPath,JSON.stringify(payload,null,2)+'\n','utf8');console.log(JSON.stringify(payload,null,2));};

try{
  for(const p of Object.values(paths)) need(fs.existsSync(path.join(ROOT,p)),`VALIDATOR_STALE:F2_KNOWN_ROOTFIX_OWNER_MISSING:${p}`);
  const runner=text(paths.runner),workflow=text(paths.workflow),engine=text(paths.engine),lifecycle=json(paths.lifecycle),legal=text(paths.legal),role=text(paths.role);

  // Cross-tenant probe must share the same provider-valid contract that already
  // produced the server-backed 403/PERMISSION_DENIED postdeploy proof.
  need(PROBE_DOCUMENT_PATH==='tenants/orbit360-f2-cross-tenant-probe/system/config','VALIDATOR_STALE:F2_PROBE_CANONICAL_PATH_CHANGED');
  need(validateProbeDocumentPath(PROBE_DOCUMENT_PATH)===true,'VALIDATOR_STALE:F2_PROBE_CANONICAL_PATH_INVALID');
  need(!runner.includes('__orbit360_f2_cross_tenant_probe__'),'VALIDATOR_STALE:F2_FULL_RUNTIME_RESERVED_CROSS_TENANT_ID_PRESENT');
  need(runner.includes("from './orbit360-f2-cross-tenant-probe-contract-v20260818.mjs'"),'VALIDATOR_STALE:F2_FULL_RUNTIME_PROBE_CONTRACT_IMPORT_MISSING');
  need(runner.includes('validateProbeDocumentPath(PROBE_DOCUMENT_PATH)'),'VALIDATOR_STALE:F2_FULL_RUNTIME_PROBE_PATH_VALIDATION_MISSING');
  need(runner.includes('page.evaluate(async deniedPath=>')&&runner.includes('},PROBE_DOCUMENT_PATH);need(crossTenantDenied'),'VALIDATOR_STALE:F2_FULL_RUNTIME_PROBE_PATH_BINDING_MISSING');

  // Runtime04 role-view rootfix remains bound: canonical SuperAdmin may satisfy
  // human-facing Dirección, while AdminTenant may not.
  need(runner.includes('resolveCanonicalRoleForView')&&runner.includes('requiredViewsPresent')&&runner.includes('ROLE_VIEW_CONTRACT_VERSION'),'VALIDATOR_STALE:F2_ROLE_VIEW_ROOTFIX_NOT_BOUND');
  need(role.includes("SuperAdmin: 'Dirección'")||role.includes("['Dirección','SuperAdmin']"),'VALIDATOR_STALE:F2_ROLE_VIEW_DIRECTION_EQUIVALENCE_MISSING');
  need(role.includes('AdminTenant')&&role.includes('Administración'),'VALIDATOR_STALE:F2_ROLE_VIEW_ADMIN_TENANT_SEMANTICS_MISSING');

  // Runtime03 legal-gate timeout rootfix remains bound.
  need(runner.includes('settleBlockingGates'),'VALIDATOR_STALE:F2_LEGAL_READINESS_HELPER_NOT_BOUND');
  need(legal.includes('postDetachDeadline')&&legal.includes('Math.max(hardDeadline,postDetachDeadline)'),'VALIDATOR_STALE:F2_LEGAL_DETACH_QUIET_WINDOW_ROOTFIX_MISSING');

  // F2 topology is the actual topology; Vehículos and Recibos/cartera remain
  // integrated surfaces rather than invented top-level routes.
  need(runner.includes("ROUTES=['inicio','cliente360','aseguradoras','ops','leads','polizas','cobros']"),'VALIDATOR_STALE:F2_ROUTE_TOPOLOGY_CHANGED');
  need(runner.includes('orbit-policy-fullpage')&&runner.includes('orbit-vehicle-fullpage')&&runner.includes('recibosEsperados'),'VALIDATOR_STALE:F2_INTEGRATED_SURFACE_CONTRACT_MISSING');

  // Request lifecycle must be run-bound dynamically; Request06 is not hardcoded
  // into product state and no historical request ordinal may gate execution.
  need(lifecycle.authorization?.request==='DYNAMIC:ORBIT360_REQUEST_FILE','VALIDATOR_STALE:F2_RUNTIME_LIFECYCLE_REQUEST_POINTER_NOT_DYNAMIC');
  need(engine.includes("process.env.ORBIT360_REQUEST_FILE")&&engine.includes('f2-productive-acceptance-runtime-browser-readonly-runbound-[^/]+\\.json'),'VALIDATOR_STALE:F2_RUNTIME_ENGINE_NOT_DYNAMIC_REQUEST_BOUND');
  need(!engine.includes('request.requestOrdinal'),'VALIDATOR_STALE:F2_RUNTIME_ENGINE_ORDINAL_COUPLED');
  need(workflow.includes("f2-productive-acceptance-runtime-browser-readonly-runbound-*.json")&&workflow.includes('GITHUB_RUN_ATTEMPT')&&workflow.includes("= '1'"),'VALIDATOR_STALE:F2_RUNTIME_WORKFLOW_RUNBOUND_OR_ATTEMPT_GUARD_MISSING');
  need(workflow.includes('orbit360-test-f2-full-runtime-known-rootfixes-v20260819.mjs'),'VALIDATOR_STALE:F2_RUNTIME_WORKFLOW_SELFTEST_NOT_BOUND');

  // Frozen exact successor must contain coherent PWA/SW owners. This is source
  // inspection only: no browser, provider, secrets or network runtime is used.
  const pwa=frozen('orbit360-platform/core/pwa.js'),sw=frozen('orbit360-platform/sw.js'),provider=frozen('orbit360-platform/core/product-runtime-browser-providers-p0.js');
  const pwaBuild=(pwa.match(/RUNTIME_BUILD\s*=\s*'([^']+)'/)||[])[1]||'';
  const swBuild=(sw.match(/BUILD\s*=\s*'([^']+)'/)||[])[1]||'';
  need(pwaBuild&&swBuild&&pwaBuild===swBuild,'VALIDATOR_STALE:F2_FROZEN_PWA_SW_BUILD_MISMATCH');
  need(pwa.includes("navigator.serviceWorker.register('sw.js?v=' + RUNTIME_BUILD)")&&pwa.includes('window.OrbitPwaWorkerReady'),'VALIDATOR_STALE:F2_FROZEN_PWA_REGISTRATION_CONTRACT_MISSING');
  need(sw.includes("caches.keys()")&&sw.includes('self.clients.claim()')&&sw.includes("key.indexOf('orbit360-') === 0 && key !== CACHE"),'VALIDATOR_STALE:F2_FROZEN_SW_CACHE_CLEANUP_CONTRACT_MISSING');
  need(runner.includes("fetch('/sw.js',{cache:'no-store'})")&&runner.includes('registrationCount<=1'),'VALIDATOR_STALE:F2_RUNTIME_SW_CHECK_MISSING');

  // Frozen successor includes browser-product Auth provider with real password
  // sign-in support. Publication remains a separate later authorization.
  need(provider.includes('signInWithEmailAndPassword')&&provider.includes('Orbit.productRuntimeBrowserProvidersP0')&&provider.includes('writeAuthorized:false'),'VALIDATOR_STALE:F2_FROZEN_PRODUCT_AUTH_PROVIDER_MISSING');
  need(runner.includes(`artifactId:${EXACT_ARTIFACT}`)&&runner.includes(`sourceHead:'${FROZEN_SOURCE}'`),'VALIDATOR_STALE:F2_EXACT_ARTIFACT_BINDING_MISSING');

  // Runtime acceptance itself is strictly validation-only.
  need(!/\bfirebase(?:\.cmd)?\s+deploy\b/i.test(workflow)&&!/\bgcloud\b[^\n]*\bdeploy\b/i.test(workflow),'SECURITY_FAILURE:F2_RUNTIME_WORKFLOW_DEPLOY_COMMAND_PRESENT');

  write({schemaVersion:'orbit360-f2-full-runtime-known-rootfixes-selftest-v1',ok:true,status:'F2_FULL_RUNTIME_KNOWN_ROOTFIXES_SOURCE_AUDIT_PASS',classification:'PASS',candidateArtifactId:EXACT_ARTIFACT,candidateSourceHead:FROZEN_SOURCE,crossTenant:{contract:'F2_CROSS_TENANT_PROBE_VALID_PATH_V2',pathValid:true,reservedIdAbsent:true,sharedContractBound:true},roleView:{rootfixBound:true},legalGate:{detachQuietWindowRootfixBound:true},topology:{routes:['inicio','cliente360','aseguradoras','ops','leads','polizas','cobros'],integrated:['vehiculos','recibosCartera']},requestLifecycle:{dynamicRunbound:true,ordinalCoupling:false},pwa:{frozenSourceBuild:pwaBuild,serviceWorkerBuild:swBuild,buildsMatch:true,cacheCleanupContract:true},auth:{frozenProductBrowserProviderPresent:true,passwordSignInProviderPresent:true},runtimeWorkflow:{deployCommandPresent:false,selftestBound:true},browserExecuted:false,runtimeExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,membershipWrites:0,dataWrites:0,rulesDeploy:false,hostingDeploy:false,functionsDeploy:false,packageRebuild:false,publication:false,production:false,request06Created:false,containsPII:false,containsSecrets:false,generatedAt:new Date().toISOString()});
}catch(error){
  write({schemaVersion:'orbit360-f2-full-runtime-known-rootfixes-selftest-v1',ok:false,status:'F2_FULL_RUNTIME_KNOWN_ROOTFIXES_SOURCE_AUDIT_FAIL',classification:String(error?.message||error).split(':')[0]||'VALIDATOR_STALE',error:String(error?.message||error).slice(0,900),browserExecuted:false,runtimeExecuted:false,secretAccess:false,firestoreRead:false,writes:0,request06Created:false,containsPII:false,containsSecrets:false,generatedAt:new Date().toISOString()});
  process.exitCode=41;
}
