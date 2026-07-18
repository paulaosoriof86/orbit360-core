#!/usr/bin/env node
import fs from 'node:fs';

const helperPath = 'tools/orbit360-gate-bootstrap-auth-legal-v20260717.mjs';
const executorPath = 'tools/orbit360-gate-runtime-crm-v20260716.mjs';
let helper = fs.readFileSync(helperPath, 'utf8');
let executor = fs.readFileSync(executorPath, 'utf8');

function replaceExact(label, text, from, to) {
  const count = text.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}_MATCH_COUNT:${count}`);
  return text.replace(from, to);
}

const ownerHelper = `async function waitForRuntimeContractOwner(page, { marker, owner, code, requireState, report }) {
  const terminal = ['error', 'timeout', 'no-source'];
  const deadline = Date.now() + 20000;
  let last = null;
  while (Date.now() < deadline) {
    last = await page.evaluate(({ marker, owner }) => {
      const router = window.Orbit && Orbit.router;
      const contract = router && router.runtimeContractState ? router.runtimeContractState[marker] || null : null;
      let ready = false;
      if (owner === 'tenant-core') {
        ready = Boolean(window.Orbit && Orbit.tenantInsurerConfigP10 && typeof Orbit.tenantInsurerConfigP10.registerTenantConfig === 'function');
      } else if (owner === 'tenant-index') {
        ready = Boolean(window.OrbitTenantRuntimeConfigIndex && window.OrbitTenantRuntimeConfigIndex['alianzas-soluciones']);
      } else if (owner === 'tenant-active') {
        ready = [].concat(window.OrbitTenantInsurerConfigsP10 || []).some(item => item && item.tenantId === 'alianzas-soluciones');
      }
      return {
        ready,
        status: String(contract && contract.status || ''),
        contractReady: Boolean(contract && contract.ready),
        srcPresent: Boolean(contract && contract.src),
        loadEvent: Boolean(contract && contract.loadEvent),
        errorEvent: Boolean(contract && contract.errorEvent)
      };
    }, { marker, owner });
    if (last.ready) return;
    if (terminal.includes(last.status)) {
      report.runtimeOwnerDiagnostics = Object.assign({}, report.runtimeOwnerDiagnostics || {}, { [code]: last });
      requireState(false, code + '_' + last.status.toUpperCase(), JSON.stringify(last));
    }
    await page.waitForTimeout(250);
  }
  report.runtimeOwnerDiagnostics = Object.assign({}, report.runtimeOwnerDiagnostics || {}, { [code]: last });
  requireState(false, code + '_NOT_READY', JSON.stringify(last || {}));
}

`;

helper = replaceExact(
  'INSERT_RUNTIME_OWNER_HELPER',
  helper,
  'export async function waitForProductBootstrap(page, { runtime, bounded, requireState, report }) {',
  ownerHelper + 'export async function waitForProductBootstrap(page, { runtime, bounded, requireState, report }) {'
);

const oldBlocks = `  await approveStage(report, bounded, 'canonical_tenant_insurer_core_ready', () => page.waitForFunction(() => {
    return Boolean(window.Orbit && Orbit.tenantInsurerConfigP10 && typeof Orbit.tenantInsurerConfigP10.registerTenantConfig === 'function');
  }, null, { timeout: 12000, polling: 250 }), 15000);

  await approveStage(report, bounded, 'canonical_tenant_runtime_index_ready', () => page.waitForFunction(() => {
    return Boolean(window.OrbitTenantRuntimeConfigIndex && window.OrbitTenantRuntimeConfigIndex['alianzas-soluciones']);
  }, null, { timeout: 12000, polling: 250 }), 15000);

  await approveStage(report, bounded, 'canonical_tenant_insurer_active_ready', () => page.waitForFunction(() => {
    return [].concat(window.OrbitTenantInsurerConfigsP10 || []).some(item => item && item.tenantId === 'alianzas-soluciones');
  }, null, { timeout: 12000, polling: 250 }), 15000);`;

const newBlocks = `  await approveStage(report, bounded, 'canonical_tenant_insurer_core_ready', () => waitForRuntimeContractOwner(page, {
    marker: 'data-orbit-tenant-insurer-config-core-v20260717',
    owner: 'tenant-core',
    code: 'TENANT_INSURER_CORE',
    requireState,
    report
  }), 24000);

  await approveStage(report, bounded, 'canonical_tenant_runtime_index_ready', () => waitForRuntimeContractOwner(page, {
    marker: 'data-orbit-tenant-runtime-index-v20260717',
    owner: 'tenant-index',
    code: 'TENANT_RUNTIME_INDEX',
    requireState,
    report
  }), 24000);

  await approveStage(report, bounded, 'canonical_tenant_insurer_active_ready', () => waitForRuntimeContractOwner(page, {
    marker: 'data-orbit-tenant-insurer-config-active-v20260717',
    owner: 'tenant-active',
    code: 'TENANT_INSURER_ACTIVE',
    requireState,
    report
  }), 24000);`;

helper = replaceExact('REPLACE_RUNTIME_OWNER_WAITS', helper, oldBlocks, newBlocks);
executor = replaceExact("EXECUTOR_1_0_17", executor, "contractVersion:'1.0.16'", "contractVersion:'1.0.17'");

for (const token of [
  'waitForRuntimeContractOwner',
  "terminal = ['error', 'timeout', 'no-source']",
  "code + '_NOT_READY'",
  "marker: 'data-orbit-tenant-insurer-config-core-v20260717'",
  "marker: 'data-orbit-tenant-runtime-index-v20260717'",
  "marker: 'data-orbit-tenant-insurer-config-active-v20260717'"
]) {
  if (!helper.includes(token)) throw new Error(`HELPER_TOKEN_MISSING:${token}`);
}
if (!executor.includes("contractVersion:'1.0.17'")) throw new Error('EXECUTOR_VERSION_MISSING');

fs.writeFileSync(helperPath, helper, 'utf8');
fs.writeFileSync(executorPath, executor, 'utf8');
console.log(JSON.stringify({ ok: true, helperPath, executorPath, contractVersion: '1.0.17' }, null, 2));
