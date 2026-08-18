#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const BASE = path.join(ROOT, 'tools/orbit360-r4-production-readonly-smoke-v20260815.mjs');
const CERTIFIED_WRAPPER = path.join(ROOT, 'tools/orbit360-r4-certified-product-smoke-wrapper-v20260815.mjs');
const EVIDENCE_DIR = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716');
const SELF_OUT = path.join(EVIDENCE_DIR, 'r4-role-route-attribution-selftest-v20260816.json');
const TARGET_BOUND = String(process.env.ORBIT360_EXPECTED_RESULT_REVISION || '') === 'paula-postauth-custom-token-readonly-v1';
const sha256 = v => crypto.createHash('sha256').update(v).digest('hex');
const count = (h, n) => h.split(n).length - 1;
const fail = m => { throw new Error(m); };

function writeJson(file, payload) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

function syntaxCheck(source, label) {
  const temp = path.join(ROOT, 'tools', `.orbit360-${label}-${process.pid}-${Date.now()}.mjs`);
  fs.writeFileSync(temp, source, 'utf8');
  try { execFileSync(process.execPath, ['--check', temp], { cwd: ROOT, stdio: 'pipe' }); return true; }
  finally { try { fs.unlinkSync(temp); } catch {} }
}

function patchBase(original) {
  let patched = original;
  const startMarker = "  const specs = [['Dirección', 1440, 900], ['Operativo', 1024, 768], ['Asesor', 390, 844]], routes = ['inicio', 'cliente360', 'aseguradoras', 'ops', 'leads'];";
  const endMarker = "\n\n  d.runtime = await runStage('runtime-final-snapshot'";
  if (count(patched, startMarker) !== 1) fail(`ROLE_BLOCK_START_COUNT_INVALID:${count(patched, startMarker)}`);
  if (count(patched, endMarker) !== 1) fail(`ROLE_BLOCK_END_COUNT_INVALID:${count(patched, endMarker)}`);
  const start = patched.indexOf(startMarker);
  const end = patched.indexOf(endMarker, start);
  const stale = patched.slice(start, end);
  if (!stale.includes('runStage(`role-${role}-group`, 90000')) fail('STALE_CUMULATIVE_ROLE_GROUP_NOT_FOUND');
  if (!stale.includes('.catch(() => {})')) fail('STALE_SWALLOWED_ROUTE_WAIT_NOT_FOUND');

  const correctedGeneric = `  const specs = [['Dirección', 1440, 900], ['Operativo', 1024, 768], ['Asesor', 390, 844]], routes = ['inicio', 'cliente360', 'aseguradoras', 'ops', 'leads'];
  for (const [role, width, height] of specs) {
    const rr = { role, viewport: { width, height }, roleSet: false, activeRoleMatches: false, scopeCliente360: '', rawClientCount: -1, scopedClientCount: -1, routes: [], pass: false };
    d.roles.push(rr);
    await runStage('role-' + role + '-activation', 30000, async () => {
      await page.setViewportSize({ width, height });
      const set = await page.evaluate(r => !!(Orbit.session && Orbit.session.set && Orbit.session.set(r)), role);
      await page.waitForTimeout(200);
      const scope = await page.evaluate(() => { const raw = Orbit.store.all('clientes'), scoped = Orbit.access.filter('clientes', raw, 'cliente360'); return { active: Orbit.session.rol(), scope: Orbit.access.scopeCanon('cliente360'), raw: raw.length, scoped: scoped.length }; });
      rr.roleSet = set; rr.activeRoleMatches = scope.active === role; rr.scopeCliente360 = scope.scope; rr.rawClientCount = scope.raw; rr.scopedClientCount = scope.scoped;
      const expectedScope = role === 'Dirección' ? 'all' : role === 'Operativo' ? 'team' : 'own';
      if (!rr.roleSet || !rr.activeRoleMatches || rr.scopeCliente360 !== expectedScope) throw new ClassifiedError('FUNCTIONAL_DEFECT', 'R4_ROLE_ACTIVATION_OR_SCOPE_MISMATCH');
      return { roleSet: rr.roleSet, activeRoleMatches: rr.activeRoleMatches, scopeCliente360: rr.scopeCliente360, rawClientCount: rr.rawClientCount, scopedClientCount: rr.scopedClientCount };
    }, v => v || {});
    for (const route of routes) {
      const routeEvidence = { route, policyAllowed: false, accessBlocked: false, hostRendered: false, pass: false };
      rr.routes.push(routeEvidence);
      await runStage('role-' + role + '-route-' + route, 30000, async () => {
        const allowed = await page.evaluate(r => r === 'inicio' ? true : !!Orbit.access.can(r, 'view'), route);
        routeEvidence.policyAllowed = allowed;
        await page.evaluate(r => { location.hash = '#/' + r; }, route);
        await page.waitForFunction(r => window.Orbit && Orbit.route && Orbit.route.key === r, route, { timeout: 25000 });
        await page.waitForTimeout(200);
        const state = await page.evaluate(() => { const h = document.getElementById('host'), body = String(document.body && document.body.innerText || ''); return { key: Orbit.route && Orbit.route.key || '', children: h && h.children ? h.children.length : 0, blocked: String(h && h.innerText || '').includes('No tienes acceso con el rol activo'), body: body.slice(0, 200000) }; });
        const matches = uniq((state.body.match(TECH) || []).map(x => String(x).toLowerCase())); d.technicalCopy.push(...matches.map(x => role + ':' + route + ':' + x));
        const pass = state.key === route && state.children > 0 && (allowed ? !state.blocked : state.blocked);
        routeEvidence.accessBlocked = state.blocked; routeEvidence.hostRendered = state.children > 0; routeEvidence.pass = pass;
        if (!pass) throw new ClassifiedError('FUNCTIONAL_DEFECT', 'R4_ROLE_ROUTE_OR_SCOPE_MISMATCH');
        return { policyAllowed: allowed, accessBlocked: state.blocked, hostRendered: state.children > 0, pass: true };
      }, v => v || {});
    }
    rr.pass = true;
  }`;

  const correctedTarget = `  const allSpecs = [
    ['Dirección', 1440, 900, 'all'], ['SuperAdmin', 1440, 900, 'all'], ['AdminTenant', 1440, 900, 'all'],
    ['Operativo', 1024, 768, 'team'], ['Finanzas', 1440, 900, 'all'], ['Marketing', 1024, 768, 'team'],
    ['Asesor', 390, 844, 'own'], ['Comercial', 390, 844, 'own'], ['Asistente', 1024, 768, 'team']
  ], routes = ['inicio', 'cliente360', 'aseguradoras', 'ops', 'leads'];
  const assignedRoles = await page.evaluate(() => [...new Set([].concat(Orbit.auth && Orbit.auth.productUser && Orbit.auth.productUser.roles || []).map(x => String(x || '').trim()).filter(Boolean))]);
  const specs = allSpecs.filter(([role]) => assignedRoles.includes(role));
  d.targetAssignedRoleCount = assignedRoles.length;
  d.targetRoleExpectedCount = specs.length;
  d.targetRoleCoverageComplete = specs.length === assignedRoles.length;
  if (!specs.length || !d.targetRoleCoverageComplete || !specs.some(([role]) => ['Dirección', 'SuperAdmin', 'AdminTenant'].includes(role))) throw new ClassifiedError('DATA_CONTRACT_FAILURE', 'R4_TARGET_ASSIGNED_ROLE_SET_NOT_CANONICAL');
  for (const [role, width, height, expectedScope] of specs) {
    const rr = { role, viewport: { width, height }, expectedScope, roleSet: false, activeRoleMatches: false, scopeCliente360: '', rawClientCount: -1, scopedClientCount: -1, routes: [], pass: false };
    d.roles.push(rr);
    await runStage('role-' + role + '-activation', 30000, async () => {
      await page.setViewportSize({ width, height });
      const set = await page.evaluate(r => !!(Orbit.session && Orbit.session.set && Orbit.session.set(r)), role);
      await page.waitForTimeout(200);
      const scope = await page.evaluate(() => { const raw = Orbit.store.all('clientes'), scoped = Orbit.access.filter('clientes', raw, 'cliente360'); return { active: Orbit.session.rol(), scope: Orbit.access.scopeCanon('cliente360'), raw: raw.length, scoped: scoped.length }; });
      rr.roleSet = set; rr.activeRoleMatches = scope.active === role; rr.scopeCliente360 = scope.scope; rr.rawClientCount = scope.raw; rr.scopedClientCount = scope.scoped;
      if (!rr.roleSet || !rr.activeRoleMatches || rr.scopeCliente360 !== expectedScope) throw new ClassifiedError('FUNCTIONAL_DEFECT', 'R4_ROLE_ACTIVATION_OR_SCOPE_MISMATCH');
      return { roleSet: rr.roleSet, activeRoleMatches: rr.activeRoleMatches, scopeCliente360: rr.scopeCliente360, rawClientCount: rr.rawClientCount, scopedClientCount: rr.scopedClientCount };
    }, v => v || {});
    for (const route of routes) {
      const routeEvidence = { route, policyAllowed: false, accessBlocked: false, hostRendered: false, pass: false };
      rr.routes.push(routeEvidence);
      await runStage('role-' + role + '-route-' + route, 30000, async () => {
        const allowed = await page.evaluate(r => r === 'inicio' ? true : !!Orbit.access.can(r, 'view'), route);
        routeEvidence.policyAllowed = allowed;
        await page.evaluate(r => { location.hash = '#/' + r; }, route);
        await page.waitForFunction(r => window.Orbit && Orbit.route && Orbit.route.key === r, route, { timeout: 25000 });
        await page.waitForTimeout(200);
        const state = await page.evaluate(() => { const h = document.getElementById('host'), body = String(document.body && document.body.innerText || ''); return { key: Orbit.route && Orbit.route.key || '', children: h && h.children ? h.children.length : 0, blocked: String(h && h.innerText || '').includes('No tienes acceso con el rol activo'), body: body.slice(0, 200000) }; });
        const matches = uniq((state.body.match(TECH) || []).map(x => String(x).toLowerCase())); d.technicalCopy.push(...matches.map(x => role + ':' + route + ':' + x));
        const pass = state.key === route && state.children > 0 && (allowed ? !state.blocked : state.blocked);
        routeEvidence.accessBlocked = state.blocked; routeEvidence.hostRendered = state.children > 0; routeEvidence.pass = pass;
        if (!pass) throw new ClassifiedError('FUNCTIONAL_DEFECT', 'R4_ROLE_ROUTE_OR_SCOPE_MISMATCH');
        return { policyAllowed: allowed, accessBlocked: state.blocked, hostRendered: state.children > 0, pass: true };
      }, v => v || {});
    }
    rr.pass = true;
  }`;

  const corrected = TARGET_BOUND ? correctedTarget : correctedGeneric;
  patched = patched.slice(0, start) + corrected + patched.slice(end);

  if (TARGET_BOUND) {
    const oldFinalCount = 'd.roles.length === 3 && d.roles.every(r => r.pass)';
    const newFinalCount = 'd.targetRoleCoverageComplete === true && d.roles.length === d.targetRoleExpectedCount && d.targetRoleExpectedCount > 0 && d.roles.every(r => r.pass)';
    if (count(patched, oldFinalCount) !== 1) fail(`TARGET_ROLE_FINAL_COUNT_COUNT_INVALID:${count(patched, oldFinalCount)}`);
    patched = patched.replace(oldFinalCount, newFinalCount);
  }

  const oldTimeout = "  if (/^role-/.test(stage)) return ['FUNCTIONAL_DEFECT', 'R4_ROLE_ROUTE_STAGE_TIMEOUT'];";
  const newTimeout = "  if (/^role-.*-activation$/.test(stage)) return ['FUNCTIONAL_DEFECT', 'R4_ROLE_ACTIVATION_STAGE_TIMEOUT'];\n  if (/^role-.*-route-/.test(stage)) return ['FUNCTIONAL_DEFECT', 'R4_ROLE_ROUTE_STAGE_TIMEOUT'];";
  if (count(patched, oldTimeout) !== 1) fail(`ROLE_TIMEOUT_CLASSIFIER_COUNT_INVALID:${count(patched, oldTimeout)}`);
  patched = patched.replace(oldTimeout, newTimeout);

  const oldFailure = "  if (/^role-/.test(stage)) return ['FUNCTIONAL_DEFECT', 'R4_ROLE_ROUTE_STAGE_FAILED'];";
  const newFailure = "  if (/^role-.*-activation$/.test(stage)) return ['FUNCTIONAL_DEFECT', 'R4_ROLE_ACTIVATION_STAGE_FAILED'];\n  if (/^role-.*-route-/.test(stage)) return ['FUNCTIONAL_DEFECT', 'R4_ROLE_ROUTE_STAGE_FAILED'];";
  if (count(patched, oldFailure) !== 1) fail(`ROLE_FAILURE_CLASSIFIER_COUNT_INVALID:${count(patched, oldFailure)}`);
  patched = patched.replace(oldFailure, newFailure);

  const checks = {
    cumulativeRoleGroupRemoved: !patched.includes('runStage(`role-${role}-group`, 90000'),
    roleActivationStagesBound: patched.includes("runStage('role-' + role + '-activation', 30000"),
    perRouteStagesBound: patched.includes("runStage('role-' + role + '-route-' + route, 30000"),
    independentStageBudgetsBound: !patched.includes('90000') && patched.includes("'-activation', 30000") && patched.includes("'-route-' + route, 30000"),
    swallowedRouteWaitRemoved: !patched.includes('waitForFunction(r => window.Orbit && Orbit.route && Orbit.route.key === r, route, { timeout: 8000 }).catch(() => {})'),
    routeReadinessFailurePropagates: patched.includes("await page.waitForFunction(r => window.Orbit && Orbit.route && Orbit.route.key === r, route, { timeout: 25000 });"),
    routeReadinessBudgetAligned: !patched.includes('{ timeout: 8000 }') && patched.includes('{ timeout: 25000 }') && patched.includes("'-route-' + route, 30000"),
    roleTimeoutAttributionSplit: patched.includes('R4_ROLE_ACTIVATION_STAGE_TIMEOUT') && patched.includes('R4_ROLE_ROUTE_STAGE_TIMEOUT') && patched.includes('R4_ROLE_ACTIVATION_STAGE_FAILED') && patched.includes('R4_ROLE_ROUTE_STAGE_FAILED'),
    partialRoleEvidenceBound: patched.includes('d.roles.push(rr);') && patched.indexOf('d.roles.push(rr);') < patched.indexOf("runStage('role-' + role + '-activation'"),
    targetRoleDiscoveryBound: !TARGET_BOUND || patched.includes('Orbit.auth && Orbit.auth.productUser && Orbit.auth.productUser.roles'),
    targetRoleMatrixUsesAssignedRoles: !TARGET_BOUND || patched.includes('allSpecs.filter(([role]) => assignedRoles.includes(role))'),
    targetRoleScopeContractBound: !TARGET_BOUND || (patched.includes("['SuperAdmin', 1440, 900, 'all']") && patched.includes("['AdminTenant', 1440, 900, 'all']") && patched.includes("['Operativo', 1024, 768, 'team']") && patched.includes("['Asesor', 390, 844, 'own']")),
    targetRoleCoverageRequired: !TARGET_BOUND || patched.includes('d.targetRoleCoverageComplete = specs.length === assignedRoles.length'),
    targetRoleFinalCountDynamic: !TARGET_BOUND || (patched.includes('d.roles.length === d.targetRoleExpectedCount') && !patched.includes('d.roles.length === 3 && d.roles.every(r => r.pass)'))
  };
  return { patched, staleSha256: sha256(original), patchedSha256: sha256(patched), checks };
}

function patchCertifiedWrapper(source, tempBase) {
  const oldBase = "const BASE_HARNESS = path.join(ROOT, 'tools/orbit360-r4-production-readonly-smoke-v20260815.mjs');";
  if (count(source, oldBase) !== 1) fail(`CERTIFIED_WRAPPER_BASE_DECL_COUNT_INVALID:${count(source, oldBase)}`);
  let patched = source.replace(oldBase, `const BASE_HARNESS = ${JSON.stringify(tempBase)};`);
  const r4s3 = "    'FASE_A_PRODUCT_R4S3_MINIMAL_SUCCESSOR_CERTIFIED'";
  const r4s4 = "    'FASE_A_PRODUCT_R4S4_MINIMAL_SUCCESSOR_CERTIFIED'";
  if (!patched.includes(r4s4)) {
    if (count(patched, r4s3) !== 1) fail(`R4S3_MANIFEST_ALLOWLIST_COUNT_INVALID:${count(patched, r4s3)}`);
    patched = patched.replace(r4s3, `${r4s3},\n${r4s4}`);
  }
  return patched;
}

const originalBase = fs.readFileSync(BASE, 'utf8');
const originalWrapper = fs.readFileSync(CERTIFIED_WRAPPER, 'utf8');
const roleFix = patchBase(originalBase);
const patchedHarnessSyntaxPass = syntaxCheck(roleFix.patched, 'r4-role-route-base-syntax');
const allRoleChecksPass = Object.values(roleFix.checks).every(Boolean);
const selfPayload = {
  schemaVersion: 'orbit360-r4-role-route-attribution-selftest-v1',
  ok: patchedHarnessSyntaxPass && allRoleChecksPass,
  status: patchedHarnessSyntaxPass && allRoleChecksPass ? 'R4_ROLE_ROUTE_ATTRIBUTION_SELFTEST_PASS' : 'R4_ROLE_ROUTE_ATTRIBUTION_SELFTEST_FAIL',
  classification: patchedHarnessSyntaxPass && allRoleChecksPass ? 'VALIDATOR_STALE_ROOTFIX_PASS' : 'VALIDATOR_STALE',
  failureFamily: patchedHarnessSyntaxPass && allRoleChecksPass ? '' : 'CUMULATIVE_ROLE_GROUP_BUDGET_AND_ROUTE_ATTRIBUTION_NOT_CLOSED',
  owner: 'tools/orbit360-r4-role-route-attribution-wrapper-v20260816.mjs',
  targetBound: TARGET_BOUND,
  targetSemantics: TARGET_BOUND ? 'assigned-roles-only-canonical-scope' : 'historical-generic-three-role-matrix',
  baseHarnessSha256: roleFix.staleSha256,
  correctedHarnessSha256: roleFix.patchedSha256,
  ...roleFix.checks,
  patchedHarnessSyntaxPass,
  browserExecuted: false,
  secretAccess: false,
  dataAccess: false,
  deployExecuted: false,
  packageRebuilt: false,
  productionTouched: false,
  firestoreWrites: 0,
  authWrites: 0,
  operationalWrites: 0,
  containsPII: false,
  containsSecrets: false
};
writeJson(SELF_OUT, selfPayload);
if (!selfPayload.ok) { console.log(JSON.stringify(selfPayload, null, 2)); process.exit(41); }

const tempBase = path.join(ROOT, 'tools', `.orbit360-r4-role-route-base-${process.pid}-${Date.now()}.mjs`);
const tempWrapper = path.join(ROOT, 'tools', `.orbit360-r4-role-route-certified-wrapper-${process.pid}-${Date.now()}.mjs`);
fs.writeFileSync(tempBase, roleFix.patched, 'utf8');
const certified = patchCertifiedWrapper(originalWrapper, tempBase);
fs.writeFileSync(tempWrapper, certified, 'utf8');
try {
  execFileSync(process.execPath, ['--check', tempWrapper], { cwd: ROOT, stdio: 'pipe' });
  const child = spawnSync(process.execPath, [tempWrapper, ...process.argv.slice(2)], { cwd: ROOT, stdio: 'inherit', env: process.env });
  if (child.error) throw child.error;
  process.exitCode = Number.isInteger(child.status) ? child.status : 41;
} finally {
  try { fs.unlinkSync(tempBase); } catch {}
  try { fs.unlinkSync(tempWrapper); } catch {}
}
