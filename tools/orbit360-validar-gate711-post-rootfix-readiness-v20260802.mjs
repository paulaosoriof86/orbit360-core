#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/gate711-post-rootfix-readiness-v20260802.json');
const PRODUCT = '267f7231b46d65b80c167f54567a67503b6a6793';
const CONTENT = '3dc0b2c699bde118d944e9304c725748b49c56619da8acf8040a36fdab37b06e';
const INDEX = 'aa40982bffd5a453c56dd07e2aa75745128890cb81fa940c2dac6e051fa2e9d6';
const PATH_DIGEST = '517056dee1200503b2e7295a333cb804bc71271bbaa87847fa762da025f276f1';
const files = {
  candidate: 'tools/orbit360-cumulative-visual-candidate-contract-v20260801.json',
  scope: 'tools/orbit360-gate711-release-critical-scope-v20260802.json',
  requestTemplate: '.github/orbit360-templates/gate711-release-critical-runtime-request-template-v20260802.json',
  lifecycleTemplate: 'tools/orbit360-gate711-release-critical-runtime-lifecycle-template-v20260802.json',
  workflow: '.github/workflows/orbit360-gate711-release-critical-runtime-v20260802.yml',
  runtime: 'tools/orbit360-validar-gate711-release-critical-runtime-v20260802.mjs',
  bridge: 'orbit360-platform/modules/crm-v1198-operational-bridge.js',
  conciliaciones: 'orbit360-platform/modules/conciliaciones.js',
  index: 'orbit360-platform/index.html',
  staticValidator: 'tools/orbit360-validar-gate711-release-critical-static-v20260802.mjs',
  packageValidator: 'tools/orbit360-validar-gate711-runtime-package-readiness-v20260802.mjs',
  chainValidator: 'tools/orbit360-validar-gate711-runtime-chain-static-v20260802-v2.mjs',
  routerValidator: 'tools/orbit360-validar-gate711-runtime-router-compat-v20260802.mjs'
};
const evidence = {
  static: 'orbit360-platform/runtime-gate-crm-v20260716/gate711-release-critical-static-v20260802.json',
  package: 'orbit360-platform/runtime-gate-crm-v20260716/gate711-runtime-package-readiness-v20260802.json',
  chain: 'orbit360-platform/runtime-gate-crm-v20260716/gate711-runtime-chain-static-v20260802-v2.json',
  router: 'orbit360-platform/runtime-gate-crm-v20260716/gate711-runtime-router-compat-v20260802.json'
};
const expectedCapabilities = {secrets:true,firestoreRead:true,writes:false,runtime:true,browser:true,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false};
const checks = [];
const add = (id, ok, detail = '') => checks.push({id, ok:Boolean(ok), detail});
const abs = rel => path.join(ROOT, rel);
const exists = rel => fs.existsSync(abs(rel));
const read = rel => fs.readFileSync(abs(rel), 'utf8');
const json = rel => JSON.parse(read(rel));
const has = (text, ...terms) => terms.every(term => text.includes(term));
const run = rel => spawnSync(process.execPath, [abs(rel)], {cwd:ROOT, encoding:'utf8'});

try {
  for (const [key, rel] of Object.entries(files)) add('FILE_' + key.toUpperCase(), exists(rel), rel);
  if (checks.some(check => !check.ok)) throw new Error('PIPELINE_MECHANISM_FAILURE:MISSING_FILE');

  const candidate = json(files.candidate);
  const scope = json(files.scope);
  const requestTemplate = json(files.requestTemplate);
  const lifecycleTemplate = json(files.lifecycleTemplate);
  const workflow = read(files.workflow);
  const runtime = read(files.runtime);
  const bridge = read(files.bridge);
  const conciliaciones = read(files.conciliaciones);
  const index = read(files.index);

  const productDiff = String(execFileSync('git', ['diff','--name-only',PRODUCT,'HEAD','--','orbit360-platform/index.html','orbit360-platform/modules','orbit360-platform/core','orbit360-platform/styles','orbit360-platform/data'], {cwd:ROOT,encoding:'utf8'})).trim();
  add('PRODUCT_FREEZE', productDiff === '', productDiff);
  add('CANDIDATE_HEAD', candidate.manifestSourceHead === PRODUCT);
  add('CANDIDATE_VERSION', candidate.contractVersion === '1.4.0');
  add('MANIFEST_COUNT_ROOTS', candidate.manifest?.trackedFileCount === 309 && JSON.stringify(candidate.manifest?.rootCounts) === JSON.stringify({index:1,modules:62,core:183,styles:10,data:53}));
  add('MANIFEST_DIGESTS', candidate.manifest?.pathDigest === PATH_DIGEST && candidate.manifest?.contentDigest === CONTENT && candidate.manifest?.indexDigest === INDEX);
  add('ROOTFIX_EVIDENCE', candidate.authorizedSecurityRootFix?.classification === 'SECURITY_FAILURE' && candidate.authorizedSecurityRootFix?.rootCause === 'FROZEN_MODULE_INTERNAL_GUARD_REGISTRY' && candidate.authorizedSecurityRootFix?.productHead === PRODUCT);
  add('ROOTFIX_WEAKMAP', has(bridge, 'Orbit.__crmV1198GuardRegistry', 'new WeakMap()', "'self_guarded_readonly'", "'immutable_unwrapped'"));
  add('ROOTFIX_UNSAFE_REMOVED', !bridge.includes('mod.__guardV1198[actionName]'));
  add('CONCILIACIONES_FROZEN', has(conciliaciones, 'Orbit.modules.conciliaciones = Object.freeze', 'operationalWrites: 0, firestoreWrites: 0, autoApply: false'));
  add('INDEX_ROOTFIX_VERSION', index.includes('modules/crm-v1198-operational-bridge.js?v=20260802-1'));
  add('SCOPE_HEAD_DIGESTS', scope.productHead === PRODUCT && scope.cumulativeManifest?.contentDigest === CONTENT && scope.cumulativeManifest?.indexDigest === INDEX);
  add('SCOPE_SCREENSHOTS', scope.runtimeRoleRouteMatrix?.expectedSanitizedScreenshots === 13);
  add('REQUEST_TEMPLATE_INERT', requestTemplate.status === 'INERT_TEMPLATE_PENDING_EXPLICIT_AUTHORIZATION' && requestTemplate.approved === false && requestTemplate.allowedExecutions === 0 && requestTemplate.consumed === true && requestTemplate.authorizedProductHead === PRODUCT);
  add('REQUEST_TEMPLATE_SCREENSHOTS', requestTemplate.releaseCriticalScope?.expectedSanitizedScreenshots === 13);
  add('LIFECYCLE_TEMPLATE_INERT', lifecycleTemplate.status === 'INERT_TEMPLATE_PENDING_EXPLICIT_AUTHORIZATION' && lifecycleTemplate.authorization?.explicit === false && lifecycleTemplate.authorization?.allowedExecutions === 0 && lifecycleTemplate.authorization?.consumed === true && lifecycleTemplate.sourceLock?.productHead === PRODUCT);
  add('LIFECYCLE_ROUTER_CONTRACT', lifecycleTemplate.validatorLifecycleRevision === 'phase-capability-contract-v1' && JSON.stringify(lifecycleTemplate.intendedExecutionProfileAfterAuthorization?.capabilities || {}) === JSON.stringify(expectedCapabilities));
  add('RUNTIME_SCREENSHOT_CARDINALITY', has(runtime, 'const expectedScreenshotCount = plans.reduce', 'expectedScreenshotCount === 13', 'report.screenshots.length === expectedScreenshotCount'));
  add('RUNTIME_CONTEXT_DIAGNOSTICS', has(runtime, "runtimeContext: { role: '', route: '', label: '' }", 'stack: clean(error && error.stack', 'role: clean(report.runtimeContext.role)', 'route: clean(report.runtimeContext.route)'));
  add('RUNTIME_GUARD_REGISTRY', has(runtime, 'Orbit.__crmV1198GuardDiagnostics', 'guardState.immutableUnwrapped === 0', "guardState.conciliacionesMode === 'self_guarded_readonly'", 'report.checks.guardRegistry = true'));
  add('WORKFLOW_HEAD', workflow.includes('ORBIT360_PRODUCT_HEAD: ' + PRODUCT));
  add('WORKFLOW_SCREENSHOTS', has(workflow, '.releaseCriticalScope.expectedSanitizedScreenshots==13', '(.expectedScreenshotCount==13)', '((.screenshots|length)==13)'));
  add('WORKFLOW_GUARD_REGISTRY', has(workflow, '.checks.guardRegistry==true', '.guardRegistry.immutableUnwrapped==0', '.guardRegistry.conciliacionesMode=="self_guarded_readonly"'));
  add('WORKFLOW_NO_DEPLOY', !/firebase\s+deploy|hosting:channel:deploy|gcloud\s+run\s+deploy|git\s+push\s+origin\s+main|gh\s+pr\s+merge/i.test(workflow));

  const executions = [
    ['STATIC_EXECUTION', files.staticValidator, evidence.static],
    ['PACKAGE_EXECUTION', files.packageValidator, evidence.package],
    ['CHAIN_EXECUTION', files.chainValidator, evidence.chain],
    ['ROUTER_EXECUTION', files.routerValidator, evidence.router]
  ];
  for (const [id, validator, output] of executions) {
    const result = run(validator);
    add(id, result.status === 0, String(result.stderr || result.stdout || '').slice(-500));
    add(id + '_EVIDENCE', exists(output), output);
  }
  const staticResult = json(evidence.static);
  const packageResult = json(evidence.package);
  const chainResult = json(evidence.chain);
  const routerResult = json(evidence.router);
  add('STATIC_PASS', staticResult.ok === true && staticResult.productHead === PRODUCT && staticResult.total === 38 && staticResult.passed === 38 && staticResult.failed === 0);
  add('PACKAGE_PASS', packageResult.ok === true && packageResult.productHead === PRODUCT && packageResult.total === 38 && packageResult.passed === 38 && packageResult.failed === 0);
  add('CHAIN_PASS', chainResult.ok === true && chainResult.productHead === PRODUCT && chainResult.total === 56 && chainResult.passed === 56 && chainResult.failed === 0);
  add('ROUTER_PASS', routerResult.ok === true && routerResult.total === 12 && routerResult.passed === 12 && routerResult.failed === 0);
  add('ALL_SOURCE_ONLY', [staticResult,packageResult,chainResult,routerResult].every(item => item.secretsAccessed === false && item.firestoreReads === 0 && item.firestoreWrites === 0 && item.runtimeExecuted === false && item.browserExecuted === false && item.deployExecuted === false && item.productionTouched === false));

  const failed = checks.filter(check => !check.ok);
  const result = {
    schemaVersion:'orbit360-gate711-post-rootfix-readiness-evidence-v1',
    gateId:'block7-canonical-runtime-cumulative-visual-lab-v20260801',
    productHead:PRODUCT,
    status:failed.length ? 'GATE711_POST_ROOTFIX_READINESS_FAIL' : 'GATE711_POST_ROOTFIX_READINESS_PASS',
    classification:failed.length ? 'PIPELINE_MECHANISM_FAILURE' : 'GO_STATIC_POST_ROOTFIX_RUNTIME_READY',
    total:checks.length,
    passed:checks.length-failed.length,
    failed:failed.length,
    failedCheckIds:failed.map(check=>check.id),
    checks,
    closures:{releaseCriticalStatic:'38/38',runtimePackageReadiness:'38/38',runtimeChain:'56/56',routerCompatibility:'12/12'},
    productFilesChanged:0,secretsAccessed:false,firestoreReads:0,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,
    ok:failed.length===0
  };
  fs.mkdirSync(path.dirname(OUT),{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n','utf8');
  console.log(JSON.stringify(result,null,2));
  process.exit(failed.length ? 41 : 0);
} catch (error) {
  const failed = checks.filter(check=>!check.ok);
  const result={schemaVersion:'orbit360-gate711-post-rootfix-readiness-evidence-v1',gateId:'block7-canonical-runtime-cumulative-visual-lab-v20260801',productHead:PRODUCT,status:'GATE711_POST_ROOTFIX_READINESS_FAIL',classification:String(error&&error.message||error).split(':')[0]||'PIPELINE_MECHANISM_FAILURE',total:checks.length,passed:checks.length-failed.length,failed:Math.max(1,failed.length),failedCheckIds:failed.map(check=>check.id),error:String(error&&error.message||error).slice(0,700),productFilesChanged:0,secretsAccessed:false,firestoreReads:0,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok:false};
  fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n','utf8');console.log(JSON.stringify(result,null,2));process.exit(41);
}
