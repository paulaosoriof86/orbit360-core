#!/usr/bin/env python3
from pathlib import Path
import json

ROOT=Path.cwd()
OLD='997fca628f95dd397dba347700a6bc644fe840f0'
NEW='267f7231b46d65b80c167f54567a67503b6a6793'
OLD_CONTENT='3d25a83218a4373513e1fff24ea9b12817d4c47be0fad08777e7f94867b3f676'
NEW_CONTENT='3dc0b2c699bde118d944e9304c725748b49c56619da8acf8040a36fdab37b06e'
OLD_INDEX='b57b6581ee02d2dde42a8a2c1272d57f19b7ad6809d13a1d25111f3d71a96074'
NEW_INDEX='aa40982bffd5a453c56dd07e2aa75745128890cb81fa940c2dac6e051fa2e9d6'
ROOTFIX={
 'classification':'SECURITY_FAILURE',
 'rootCause':'FROZEN_MODULE_INTERNAL_GUARD_REGISTRY',
 'sourceRuntimeRun':30774888921,
 'sourceRuntimeArtifact':8841696348,
 'applyRun':30775623141,
 'applyJob':91570495651,
 'applyArtifact':8841926663,
 'applyArtifactDigest':'sha256:ce683b51b0b0ff05bf11b5028d04e6ef8727cfc23c2ba797a8e9718e837d3904',
 'productHead':NEW,
 'changedProductPaths':['orbit360-platform/index.html','orbit360-platform/modules/crm-v1198-operational-bridge.js'],
 'externalGuardRegistry':'WeakMap',
 'immutableOwnerMode':'self_guarded_readonly',
 'unsafeInternalRegistryRemoved':True,
 'conciliacionesFrozenPreserved':True,
 'operationalWrites':0,
 'firestoreWrites':0
}
MANIFEST_EVIDENCE={
 'run':30775729377,
 'artifact':8841965500,
 'artifactDigest':'sha256:1c2ae7576d058f6d7c72aae95e8c5122efde217293d2c2f04d7e2167bbe09aa4',
 'status':'GATE711_POST_ROOTFIX_MANIFEST_PASS',
 'trackedFileCount':309,
 'pathDigest':'517056dee1200503b2e7295a333cb804bc71271bbaa87847fa762da025f276f1',
 'contentDigest':NEW_CONTENT,
 'indexDigest':NEW_INDEX
}

def load(rel):
    return json.loads((ROOT/rel).read_text(encoding='utf-8'))

def save(rel,obj):
    (ROOT/rel).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

rel='tools/orbit360-cumulative-visual-candidate-contract-v20260801.json'
o=load(rel)
o['contractVersion']='1.4.0'
o['manifestSourceHead']=NEW
o['authorizedSecurityRootFix']=ROOTFIX
o['postRootFixManifestEvidence']=MANIFEST_EVIDENCE
o['manifest']['previousContentDigest']=OLD_CONTENT
o['manifest']['contentDigest']=NEW_CONTENT
o['manifest']['indexDigest']=NEW_INDEX
save(rel,o)

rel='tools/orbit360-gate711-release-critical-scope-v20260802.json'
o=load(rel)
o['status']='RELEASE_CRITICAL_SCOPE_DEFINED_POST_ROOTFIX_STATIC_PENDING'
o['productHead']=NEW
o['cumulativeManifest']['contentDigest']=NEW_CONTENT
o['cumulativeManifest']['indexDigest']=NEW_INDEX
o['runtimeRoleRouteMatrix']['expectedSanitizedScreenshots']=13
o['securityRootFix']=ROOTFIX
o['postRootFixManifestEvidence']=MANIFEST_EVIDENCE
save(rel,o)

rel='.github/orbit360-templates/gate711-release-critical-runtime-request-template-v20260802.json'
o=load(rel)
o['authorizedProductHead']=NEW
o['cumulativeManifest']['contentDigest']=NEW_CONTENT
o['cumulativeManifest']['indexDigest']=NEW_INDEX
o['releaseCriticalScope']['expectedSanitizedScreenshots']=13
o['securityRootFixEvidence']=ROOTFIX
o['postRootFixManifestEvidence']=MANIFEST_EVIDENCE
o['postRootFixReadinessEvidence']={'status':'PENDING_SOURCE_ONLY_GATE'}
o['intendedCapabilitiesAfterAuthorization']={'secrets':True,'firestoreRead':True,'writes':False,'runtime':True,'browser':True,'deploy':False,'production':False}
save(rel,o)

rel='tools/orbit360-gate711-release-critical-runtime-lifecycle-template-v20260802.json'
o=load(rel)
o['sourceLock']['productHead']=NEW
o['scope']['sanitizedScreenshots']=13
o['securityRootFixEvidence']=ROOTFIX
o['postRootFixManifestEvidence']=MANIFEST_EVIDENCE
o['postRootFixReadinessEvidence']={'status':'PENDING_SOURCE_ONLY_GATE'}
save(rel,o)

rel='tools/orbit360-validar-gate711-release-critical-runtime-v20260802.mjs'
p=ROOT/rel
t=p.read_text(encoding='utf-8')
old="  browserDiagnostics: { pageErrors: [], consoleErrors: [], failedRequests: [] },\n  writeGuard: { installed: false, calls: [] },"
new="  runtimeContext: { role: '', route: '', label: '' },\n  browserDiagnostics: { pageErrors: [], consoleErrors: [], failedRequests: [] },\n  guardRegistry: { total: 0, immutableUnwrapped: 0, conciliacionesMode: '' },\n  writeGuard: { installed: false, calls: [] },"
if t.count(old)!=1: raise SystemExit('RUNTIME_REPORT_ANCHOR_INVALID')
t=t.replace(old,new,1)
old="""  page.on('pageerror', error => {
    if (report.browserDiagnostics.pageErrors.length < 12) report.browserDiagnostics.pageErrors.push(clean(error && error.message || error));
  });"""
new="""  page.on('pageerror', error => {
    if (report.browserDiagnostics.pageErrors.length < 12) {
      report.browserDiagnostics.pageErrors.push({
        message: clean(error && error.message || error),
        stack: clean(error && error.stack || ''),
        stage: report.stage,
        role: clean(report.runtimeContext.role),
        route: clean(report.runtimeContext.route),
        label: clean(report.runtimeContext.label),
        at: new Date().toISOString()
      });
    }
  });"""
if t.count(old)!=1: raise SystemExit('PAGEERROR_ANCHOR_INVALID')
t=t.replace(old,new,1)
old="""  ];

  for (const plan of plans) {"""
new="""  ];
  const expectedScreenshotCount = plans.reduce((total, plan) => total + plan.crm.length + 2, 0);
  requireState(expectedScreenshotCount === 13, 'SCREENSHOT_PLAN_CARDINALITY_INVALID', String(expectedScreenshotCount));
  report.expectedScreenshotCount = expectedScreenshotCount;

  for (const plan of plans) {
    report.runtimeContext = { role: plan.role, route: 'role_selection', label: plan.label };
    stage('role_' + plan.label);"""
if t.count(old)!=1: raise SystemExit('PLANS_ANCHOR_INVALID')
t=t.replace(old,new,1)
old="""    for (const crmRoute of plan.crm) {
      await route(page, crmRoute.hash);"""
new="""    for (const crmRoute of plan.crm) {
      report.runtimeContext = { role: plan.role, route: crmRoute.hash, label: plan.label + '-' + crmRoute.key };
      stage('route_' + plan.label + '_' + crmRoute.key);
      await route(page, crmRoute.hash);"""
if t.count(old)!=1: raise SystemExit('CRM_ROUTE_ANCHOR_INVALID')
t=t.replace(old,new,1)
old="    await route(page, '#/ops');"
new="    report.runtimeContext = { role: plan.role, route: '#/ops', label: plan.label + '-ops' };\n    stage('route_' + plan.label + '_ops');\n    await route(page, '#/ops');"
if t.count(old)!=1: raise SystemExit('OPS_ROUTE_ANCHOR_INVALID')
t=t.replace(old,new,1)
old="    await route(page, '#/leads');"
new="    report.runtimeContext = { role: plan.role, route: '#/leads', label: plan.label + '-leads' };\n    stage('route_' + plan.label + '_leads');\n    await route(page, '#/leads');"
if t.count(old)!=1: raise SystemExit('LEADS_ROUTE_ANCHOR_INVALID')
t=t.replace(old,new,1)
old="""  const final = await page.evaluate(() => ({
    writeCalls: window.__orbitGate711ReleaseCriticalWriteGuard && window.__orbitGate711ReleaseCriticalWriteGuard.calls || [],
    activeRole: Orbit.session && Orbit.session.rol ? Orbit.session.rol() : ''
  }));"""
new="""  report.runtimeContext = { role: '', route: 'guard_registry_verification', label: 'guard-registry' };
  stage('guard_registry_verification');
  const guardState = await page.evaluate(() => {
    const rows = Array.isArray(Orbit.__crmV1198GuardDiagnostics)
      ? Orbit.__crmV1198GuardDiagnostics.map(row => ({
          moduleName: String(row && row.moduleName || ''),
          actionName: String(row && row.actionName || ''),
          mode: String(row && row.mode || '')
        }))
      : [];
    const conciliaciones = rows.find(row => row.moduleName === 'conciliaciones' && row.actionName === 'accion');
    return {
      total: rows.length,
      immutableUnwrapped: rows.filter(row => row.mode === 'immutable_unwrapped').length,
      conciliacionesMode: conciliaciones ? conciliaciones.mode : '',
      rows
    };
  });
  report.guardRegistry = guardState;
  requireState(guardState.immutableUnwrapped === 0, 'CRM_GUARD_IMMUTABLE_UNWRAPPED', JSON.stringify(guardState.rows));
  requireState(guardState.conciliacionesMode === 'self_guarded_readonly', 'CONCILIACIONES_GUARD_MODE_INVALID', guardState.conciliacionesMode);
  report.checks.guardRegistry = true;

  stage('browser_matrix_complete');
  const final = await page.evaluate(() => ({
    writeCalls: window.__orbitGate711ReleaseCriticalWriteGuard && window.__orbitGate711ReleaseCriticalWriteGuard.calls || [],
    activeRole: Orbit.session && Orbit.session.rol ? Orbit.session.rol() : ''
  }));"""
if t.count(old)!=1: raise SystemExit('FINAL_ANCHOR_INVALID')
t=t.replace(old,new,1)
old="  requireState(report.screenshots.length === 14, 'SCREENSHOT_COVERAGE_INCOMPLETE', String(report.screenshots.length));"
new="  requireState(report.screenshots.length === expectedScreenshotCount, 'SCREENSHOT_COVERAGE_INCOMPLETE', String(report.screenshots.length));"
if t.count(old)!=1: raise SystemExit('SCREENSHOT_ASSERTION_INVALID')
t=t.replace(old,new,1)
p.write_text(t,encoding='utf-8')

rel='.github/workflows/orbit360-gate711-release-critical-runtime-v20260802.yml'
p=ROOT/rel
t=p.read_text(encoding='utf-8')
if OLD not in t: raise SystemExit('WORKFLOW_PRODUCT_HEAD_MISSING')
t=t.replace(OLD,NEW)
t=t.replace('.releaseCriticalScope.expectedSanitizedScreenshots==14','.releaseCriticalScope.expectedSanitizedScreenshots==13')
t=t.replace('((.screenshots|length)==14)','(.expectedScreenshotCount==13) and ((.screenshots|length)==13)')
t=t.replace('.checks.writeGuard==true and .checks.sanitizedScreenshots==true','.checks.writeGuard==true and .checks.guardRegistry==true and .checks.sanitizedScreenshots==true')
t=t.replace('((.browserDiagnostics.pageErrors|length)==0) and','((.browserDiagnostics.pageErrors|length)==0) and .guardRegistry.immutableUnwrapped==0 and .guardRegistry.conciliacionesMode=="self_guarded_readonly" and')
p.write_text(t,encoding='utf-8')

rel='tools/orbit360-validar-gate-contracts-engine-canonical-runtime-cumulative-visual-lab-v20260801.mjs'
p=ROOT/rel
t=p.read_text(encoding='utf-8')
t=t.replace(OLD_CONTENT,NEW_CONTENT).replace(OLD_INDEX,NEW_INDEX)
t=t.replace("cumulative.contractVersion==='1.3.0'","cumulative.contractVersion==='1.4.0'")
t=t.replace("cumulative.canonicalReadModel?.singleReadOwner==='Orbit.store'","cumulative.canonicalReadModel?.singleReadOwner==='Orbit.store'&&cumulative.manifestSourceHead===request.authorizedProductHead")
p.write_text(t,encoding='utf-8')

rel='tools/orbit360-validar-gate711-release-critical-static-v20260802.mjs'
p=ROOT/rel
t=p.read_text(encoding='utf-8')
if OLD not in t: raise SystemExit('STATIC_PRODUCT_HEAD_MISSING')
p.write_text(t.replace(OLD,NEW),encoding='utf-8')

rel='tools/orbit360-validar-gate711-runtime-package-readiness-v20260802.mjs'
p=ROOT/rel
t=p.read_text(encoding='utf-8')
if OLD not in t: raise SystemExit('READINESS_PRODUCT_HEAD_MISSING')
t=t.replace(OLD,NEW)
t=t.replace('requestTemplate.releaseCriticalScope?.expectedSanitizedScreenshots === 14','requestTemplate.releaseCriticalScope?.expectedSanitizedScreenshots === 13')
t=t.replace('runtime.includes("report.screenshots.length === 14") && runtime.includes(\'maskedOperationalContent: true\')','runtime.includes(\'const expectedScreenshotCount = plans.reduce\') && runtime.includes("expectedScreenshotCount === 13") && runtime.includes(\'report.screenshots.length === expectedScreenshotCount\') && runtime.includes(\'maskedOperationalContent: true\')')
t=t.replace("'RUNTIME_WRITE_GUARD', 'firestoreWrites: 0'","'RUNTIME_WRITE_GUARD', 'Orbit.__crmV1198GuardDiagnostics', \"'self_guarded_readonly'\", \"'immutable_unwrapped'\", 'guardRegistry', 'firestoreWrites: 0'")
t=t.replace("'sourceSnapshotDigest', 'targetSnapshotDigest']));","'sourceSnapshotDigest', 'targetSnapshotDigest', '.guardRegistry.immutableUnwrapped==0', '.guardRegistry.conciliacionesMode==\"self_guarded_readonly\"', '.expectedScreenshotCount==13']));")
p.write_text(t,encoding='utf-8')

rel='tools/orbit360-validar-gate711-runtime-chain-static-v20260802-v2.mjs'
p=ROOT/rel
t=p.read_text(encoding='utf-8')
if OLD not in t: raise SystemExit('CHAIN_PRODUCT_HEAD_MISSING')
t=t.replace(OLD,NEW)
old="add('RUNTIME_SHOTS',runtime.includes('visual-sanitized-gate711-release-critical-v20260802')&&workflow.includes('visual-sanitized-gate711-release-critical-v20260802/*.png')&&runtime.includes('report.screenshots.length === 14')&&workflow.includes('(.screenshots|length)==14'));"
new="add('RUNTIME_SHOTS',runtime.includes('visual-sanitized-gate711-release-critical-v20260802')&&workflow.includes('visual-sanitized-gate711-release-critical-v20260802/*.png')&&runtime.includes('expectedScreenshotCount === 13')&&runtime.includes('report.screenshots.length === expectedScreenshotCount')&&workflow.includes('(.expectedScreenshotCount==13)')&&workflow.includes('((.screenshots|length)==13)'));"
if t.count(old)!=1: raise SystemExit('CHAIN_SCREENSHOT_ANCHOR_INVALID')
t=t.replace(old,new,1)
needle="add('RUNTIME_WRITE_GUARD',has(runtime,\"['insert', 'update', 'remove', 'setPref']\",'RUNTIME_WRITE_GUARD','final.writeCalls.length === 0'));"
insert=needle+"\n add('RUNTIME_GUARD_REGISTRY',has(runtime,'Orbit.__crmV1198GuardDiagnostics',\"'self_guarded_readonly'\",\"'immutable_unwrapped'\",'guardState.immutableUnwrapped === 0',\"guardState.conciliacionesMode === 'self_guarded_readonly'\")&&has(workflow,'.checks.guardRegistry==true','.guardRegistry.immutableUnwrapped==0','.guardRegistry.conciliacionesMode==\"self_guarded_readonly\"'));"
if t.count(needle)!=1: raise SystemExit('CHAIN_WRITE_GUARD_ANCHOR_INVALID')
t=t.replace(needle,insert,1)
p.write_text(t,encoding='utf-8')

print('POST_ROOTFIX_PACKAGE_TRANSFORM_APPLIED')
