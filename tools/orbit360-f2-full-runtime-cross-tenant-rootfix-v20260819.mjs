#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const RUNNER='tools/orbit360-f2-productive-acceptance-runtime-browser-readonly-v20260818.mjs';
const WORKFLOW='.github/workflows/orbit360-f2-productive-acceptance-runtime-browser-readonly-v20260818.yml';
const ENGINE='tools/orbit360-validar-gate-contracts-engine-f2-productive-acceptance-v20260818.mjs';
const LIFECYCLE='tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-runtime-v20260818.json';
const DUPLICATE='orbit360-platform/tools/orbit360-f2-rules01-postdeploy-pass-docsync-v20260819.mjs';
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const write=(p,s)=>fs.writeFileSync(path.join(ROOT,p),s,'utf8');
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const count=(s,t)=>s.split(t).length-1;

// 1) Full runtime browser probe: bind to the same provider-valid path contract
// used by the already successful server-forced postdeploy proof.
let runner=read(RUNNER);
const roleImport="import {resolveCanonicalRoleForView,requiredViewsPresent,ROLE_VIEW_CONTRACT_VERSION} from './orbit360-f2-role-view-contract-v20260818.mjs';";
const probeImport="import {PROBE_DOCUMENT_PATH,validateProbeDocumentPath} from './orbit360-f2-cross-tenant-probe-contract-v20260818.mjs';";
if(!runner.includes(probeImport)){
  need(count(runner,roleImport)===1,'VALIDATOR_STALE:F2_ROOTFIX_ROLE_IMPORT_ANCHOR_INVALID');
  runner=runner.replace(roleImport,roleImport+probeImport);
}
const staleStart='const crossTenantDenied=await page.evaluate(async()=>{';
const staleEnd="need(crossTenantDenied,'SECURITY_FAILURE:F2_CROSS_TENANT_READ_NOT_DENIED');";
if(runner.includes('__orbit360_f2_cross_tenant_probe__')){
  const a=runner.indexOf(staleStart),b=runner.indexOf(staleEnd,a);
  need(a>=0&&b>a&&runner.indexOf(staleStart,a+1)<0,'VALIDATOR_STALE:F2_ROOTFIX_CROSS_TENANT_BLOCK_ANCHOR_INVALID');
  const end=b+staleEnd.length;
  const replacement="need(validateProbeDocumentPath(PROBE_DOCUMENT_PATH),'VALIDATOR_STALE:F2_CROSS_TENANT_PROBE_PATH_INVALID');const crossTenantDenied=await page.evaluate(async deniedPath=>{const p=Orbit.productRuntimeBrowserProvidersP0,ctx=await p.initialize();try{const ref=ctx.modules.store.doc(ctx.db,deniedPath);await ctx.modules.store.getDoc(ref);return false;}catch(e){return /permission-denied|PERMISSION_DENIED|Missing or insufficient permissions/i.test(String(e?.code||'')+' '+String(e?.message||e));}},PROBE_DOCUMENT_PATH);need(crossTenantDenied,'SECURITY_FAILURE:F2_CROSS_TENANT_READ_NOT_DENIED');";
  runner=runner.slice(0,a)+replacement+runner.slice(end);
}
need(!runner.includes('__orbit360_f2_cross_tenant_probe__'),'VALIDATOR_STALE:F2_ROOTFIX_RESERVED_ID_REMAINS');
need(runner.includes(probeImport)&&runner.includes('validateProbeDocumentPath(PROBE_DOCUMENT_PATH)')&&runner.includes('},PROBE_DOCUMENT_PATH);need(crossTenantDenied'),'VALIDATOR_STALE:F2_ROOTFIX_SHARED_PROBE_CONTRACT_NOT_BOUND');
write(RUNNER,runner);

// 2) Runtime workflow: make the known-rootfix self-audit mandatory before the
// lifecycle/gate/provider sequence so a future drift cannot spend authorization.
let workflow=read(WORKFLOW);
const workflowAnchor='          node --check tools/orbit360-f2-productive-acceptance-runtime-browser-readonly-v20260818.mjs\n';
const workflowChecks='          node --check tools/orbit360-f2-cross-tenant-probe-contract-v20260818.mjs\n          node --check tools/orbit360-test-f2-full-runtime-known-rootfixes-v20260819.mjs\n          node tools/orbit360-test-f2-full-runtime-known-rootfixes-v20260819.mjs\n';
if(!workflow.includes('node tools/orbit360-test-f2-full-runtime-known-rootfixes-v20260819.mjs')){
  need(count(workflow,workflowAnchor)===1,'VALIDATOR_STALE:F2_ROOTFIX_RUNTIME_WORKFLOW_ANCHOR_INVALID');
  workflow=workflow.replace(workflowAnchor,workflowAnchor+workflowChecks);
}
need(workflow.includes('node tools/orbit360-test-f2-full-runtime-known-rootfixes-v20260819.mjs'),'VALIDATOR_STALE:F2_ROOTFIX_RUNTIME_SELFTEST_NOT_BOUND');
write(WORKFLOW,workflow);

// 3) Gate engine: canonical gate must reject any future executor/workflow drift
// from the shared V2 cross-tenant contract before secrets are reachable.
let engine=read(ENGINE);
const engineAnchor="  const expectedRequest=String(process.env.ORBIT360_EXPECTED_REQUEST_VERSION||'NONE_PENDING_FRESH_AUTHORIZATION'),runtimeMode=expectedRequest!=='NONE_PENDING_FRESH_AUTHORIZATION';";
const engineGuards="  need(wf.includes('orbit360-test-f2-full-runtime-known-rootfixes-v20260819.mjs'),'VALIDATOR_STALE:F2_RUNTIME_KNOWN_ROOTFIX_SELFTEST_NOT_BOUND');\n  need(exec.includes(\"from './orbit360-f2-cross-tenant-probe-contract-v20260818.mjs'\")&&exec.includes('validateProbeDocumentPath(PROBE_DOCUMENT_PATH)')&&!exec.includes('__orbit360_f2_cross_tenant_probe__'),'VALIDATOR_STALE:F2_FULL_RUNTIME_CROSS_TENANT_PROBE_CONTRACT_NOT_BOUND');\n";
if(!engine.includes('F2_RUNTIME_KNOWN_ROOTFIX_SELFTEST_NOT_BOUND')){
  need(count(engine,engineAnchor)===1,'VALIDATOR_STALE:F2_ROOTFIX_GATE_ENGINE_ANCHOR_INVALID');
  engine=engine.replace(engineAnchor,engineGuards+'\n'+engineAnchor);
}
write(ENGINE,engine);

// 4) Lifecycle owner: remove the misleading historical Request01 pointer. The
// engine remains dynamically bound to ORBIT360_REQUEST_FILE; no ordinal is fixed.
const lifecyclePath=path.join(ROOT,LIFECYCLE);
const lifecycle=JSON.parse(fs.readFileSync(lifecyclePath,'utf8'));
need(lifecycle.gateId==='f2-productive-acceptance-exact-successor-v20260818','VALIDATOR_STALE:F2_ROOTFIX_LIFECYCLE_GATE_MISMATCH');
lifecycle.authorization=lifecycle.authorization||{};
lifecycle.authorization.request='DYNAMIC:ORBIT360_REQUEST_FILE';
lifecycle.surfaceTopology=lifecycle.surfaceTopology||{};
lifecycle.surfaceTopology.invariants=[...new Set([].concat(lifecycle.surfaceTopology.invariants||[],'cross_tenant_probe_valid_path_v2'))];
fs.writeFileSync(lifecyclePath,JSON.stringify(lifecycle,null,2)+'\n','utf8');

// Architecture hygiene: remove the accidental duplicate platform-local docsync
// helper; the canonical owner is tools/orbit360-f2-rules01-postdeploy-pass-docsync-v20260819.mjs.
let duplicateRemoved=false;
const duplicatePath=path.join(ROOT,DUPLICATE);
if(fs.existsSync(duplicatePath)){fs.unlinkSync(duplicatePath);duplicateRemoved=true;}

console.log(JSON.stringify({ok:true,status:'F2_FULL_RUNTIME_CROSS_TENANT_VALIDATOR_STALE_ROOTFIX_APPLIED',classification:'VALIDATOR_STALE',code:'F2_FULL_RUNTIME_CROSS_TENANT_PROBE_STILL_USES_RESERVED_INVALID_DOCUMENT_ID_AFTER_RULES01_VALID_PATH_ROOTFIX',sharedContract:'F2_CROSS_TENANT_PROBE_VALID_PATH_V2',probePath:'tenants/orbit360-f2-cross-tenant-probe/system/config',runtimeWorkflowSelftestBound:true,gateEngineGuardBound:true,lifecycleDynamicRequest:true,duplicatePlatformToolRemoved:duplicateRemoved,request06Created:false,browserExecuted:false,runtimeExecuted:false,secretAccess:false,firestoreRead:false,writes:0,rulesDeploy:false,hostingDeploy:false,functionsDeploy:false,packageRebuild:false,publication:false,production:false},null,2));
