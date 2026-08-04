#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const write = (rel, value) => fs.writeFileSync(path.join(ROOT, rel), value, 'utf8');
function replaceExact(source, before, after, code) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`PIPELINE_MECHANISM_FAILURE:${code}`);
  return source.replace(before, after);
}

{
  const rel = 'tools/orbit360-validar-gate-contracts-v20260717.mjs';
  let source = read(rel);
  source = replaceExact(
    source,
    '"block12-operational-runtime-lab-v20260804":{contractVersion:"12.0.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-block12-operational-runtime-lab-v20260804.json",engine:"tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-lab-v20260804.mjs"}',
    '"block12-operational-runtime-lab-v20260804":{contractVersion:"12.0.1",lifecycle:"tools/orbit360-validator-lifecycle-contract-block12-operational-runtime-lab-v20260804.json",engine:"tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-lab-v20260804.mjs"}',
    'ROUTER_BLOCK12_VERSION'
  );
  write(rel, source);
}

{
  const rel = 'tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-lab-v20260804.mjs';
  let source = read(rel);
  source = replaceExact(source, "const VERSION = '12.0.0';", "const VERSION = '12.0.1';", 'ENGINE_VERSION');
  source = replaceExact(
    source,
    "const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/block12-operational-runtime-lab-v20260804.json';",
    "const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/block12-operational-runtime-lab-rootfix-v20260804.json';",
    'ENGINE_REQUEST_PATH'
  );
  source = replaceExact(
    source,
    "lifecycle.status === 'OPERATIONAL_RUNTIME_LAB_AUTHORIZED'",
    "lifecycle.status === 'OPERATIONAL_RUNTIME_LAB_ROOTFIX_AUTHORIZED'",
    'ENGINE_LIFECYCLE_STATUS'
  );
  source = replaceExact(
    source,
    "request.schemaVersion === 'orbit360-block12-operational-runtime-lab-request-v1' && request.status === 'AUTHORIZED' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.replayAllowed === false && request.authorizationRef === lifecycle.authorization.source",
    "request.schemaVersion === 'orbit360-block12-operational-runtime-lab-rootfix-request-v1' && request.status === 'AUTHORIZED_ROOTFIX' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.replayAllowed === false && request.retryAuthorized === true && request.previousRunId === 30945951133 && request.previousRunStoppedBeforeSecrets === true && request.authorizationRef === lifecycle.authorization.source",
    'ENGINE_REQUEST_ACTIVE'
  );
  source = replaceExact(
    source,
    "git(['rev-parse', '--abbrev-ref', 'HEAD']) === scope.branch && request.pullRequest === 5",
    "String(process.env.GITHUB_REF_NAME || process.env.ORBIT360_BRANCH || '') === scope.branch && request.pullRequest === 5",
    'ENGINE_DETACHED_BRANCH'
  );
  source = replaceExact(
    source,
    "'.github/workflows/orbit360-block12-operational-runtime-lab-v20260804.yml'",
    "'.github/workflows/orbit360-block12-operational-runtime-lab-rootfix-v20260804.yml'",
    'ENGINE_REQUIRED_WORKFLOW'
  );
  write(rel, source);
}

{
  const rel = 'functions/cobros-reconciliation-domain.js';
  let source = read(rel);
  source = replaceExact(source, "if (/comision|planilla/.test(source)) return 'COMMISSION_RECOGNITION';", "if (/comision|planilla|commission recognition|commission statement/.test(source)) return 'COMMISSION_RECOGNITION';", 'COBROS_COMMISSION_ENUM');
  source = replaceExact(source, "if (/cartera|saldo|pendiente/.test(source)) return 'PORTFOLIO_SNAPSHOT';", "if (/cartera|saldo|pendiente|portfolio snapshot|portfolio statement/.test(source)) return 'PORTFOLIO_SNAPSHOT';", 'COBROS_PORTFOLIO_ENUM');
  source = replaceExact(source, "if (/pago|cobro|ingreso|recaudo/.test(source)) return 'INSURER_PAYMENT';", "if (/pago|cobro|ingreso|recaudo|insurer payment|payment report/.test(source)) return 'INSURER_PAYMENT';", 'COBROS_PAYMENT_ENUM');
  source = replaceExact(source, "if (/banco|bank/.test(source)) return 'BANK_SUPPORT';", "if (/banco|bank|bank support/.test(source)) return 'BANK_SUPPORT';", 'COBROS_BANK_ENUM');
  write(rel, source);
}

{
  const rel = 'orbit360-platform/core/runtime-verification-center-v20260804.js';
  let source = read(rel);
  const before = `      await step('PAY-001', 'Registrar evidencia directa, planilla y cartera', async () => {
        const base = { tenantId, operation: 'register_evidence', reason: 'Evidencia sintética de conciliación' };
        const direct = await call(names.reconciliation, Object.assign({}, base, { payload: { id: ids.evidenceDirect, polizaId: ids.policy, reciboId: ids.receipt4, tipoFuente: 'insurer_payment_report', moneda: 'GTQ', monto: 100, cuota: 4, periodo: '2026-08' }, requestId: ids.requests.evidenceDirect }));
        const commission = await call(names.reconciliation, Object.assign({}, base, { payload: { id: ids.evidenceCommission, polizaId: ids.policy, reciboId: ids.receipt3, tipoFuente: 'commission_statement', moneda: 'GTQ', monto: 100, cuota: 3, comisionAS: 25, periodo: '2026-08' }, requestId: ids.requests.evidenceCommission }));
        const portfolio = await call(names.reconciliation, Object.assign({}, base, { payload: { id: ids.evidencePortfolio, polizaId: ids.policy, reciboId: ids.receipt4, tipoFuente: 'portfolio_statement', moneda: 'GTQ', monto: 100, cuota: 4, completitud: 'completo', periodo: '2026-08' }, requestId: ids.requests.evidencePortfolio }));
        return { direct, commission, portfolio };
      }, value => value.direct.ok && value.commission.ok && value.portfolio.ok);
      await step('PAY-002', 'Conciliación directa e inferencial', () => call(names.reconciliation, { tenantId, operation: 'preview_policy', payload: { polizaId: ids.policy }, reason: 'Vista previa inferencial', requestId: ids.requests.previewPolicy }), value => value.ok === true && value.counts.CONCILIADO_DIRECTO_ASEGURADORA === 1 && value.counts.CONCILIADO_RECONOCIMIENTO_ASEGURADORA === 1 && value.counts.CONCILIADO_SECUENCIA_PLANILLA >= 2);`;
  const after = `      await step('PAY-001', 'Registrar evidencia directa y planilla', async () => {
        const base = { tenantId, operation: 'register_evidence', reason: 'Evidencia sintética de conciliación' };
        const direct = await call(names.reconciliation, Object.assign({}, base, { payload: { id: ids.evidenceDirect, polizaId: ids.policy, reciboId: ids.receipt4, tipoFuente: 'insurer_payment_report', moneda: 'GTQ', monto: 100, cuota: 4, periodo: '2026-08' }, requestId: ids.requests.evidenceDirect }));
        const commission = await call(names.reconciliation, Object.assign({}, base, { payload: { id: ids.evidenceCommission, polizaId: ids.policy, reciboId: ids.receipt3, tipoFuente: 'commission_statement', moneda: 'GTQ', monto: 100, cuota: 3, comisionAS: 25, periodo: '2026-08' }, requestId: ids.requests.evidenceCommission }));
        return { direct, commission };
      }, value => value.direct.ok && value.commission.ok);
      await step('PAY-002', 'Conciliación directa y secuencia por planilla', () => call(names.reconciliation, { tenantId, operation: 'preview_policy', payload: { polizaId: ids.policy }, reason: 'Vista previa inferencial por planilla', requestId: ids.requests.previewPolicy }), value => value.ok === true && value.counts.CONCILIADO_DIRECTO_ASEGURADORA === 1 && value.counts.CONCILIADO_RECONOCIMIENTO_ASEGURADORA === 1 && value.counts.CONCILIADO_SECUENCIA_PLANILLA >= 2);
      await step('PAY-002B', 'Secuencia por cartera completa', async () => {
        const base = { tenantId, operation: 'register_evidence', reason: 'Evidencia sintética de cartera completa' };
        const portfolio = await call(names.reconciliation, Object.assign({}, base, { payload: { id: ids.evidencePortfolio, polizaId: ids.policy, reciboId: ids.receipt4, tipoFuente: 'portfolio_statement', moneda: 'GTQ', monto: 100, cuota: 4, completitud: 'completo', periodo: '2026-08' }, requestId: ids.requests.evidencePortfolio }));
        const preview = await call(names.reconciliation, { tenantId, operation: 'preview_policy', payload: { polizaId: ids.policy }, reason: 'Vista previa inferencial por cartera', requestId: ids.requests.previewPolicy });
        return { portfolio, preview };
      }, value => value.portfolio.ok === true && value.preview.ok === true && value.preview.counts.CONCILIADO_SECUENCIA_CARTERA >= 2);`;
  source = replaceExact(source, before, after, 'RUNTIME_PAYMENT_SCENARIOS');
  write(rel, source);
}

const checks = [
  ['tools/orbit360-validator-lifecycle-contract-block12-operational-runtime-lab-v20260804.json', 'phase-capability-contract-v1'],
  ['tools/orbit360-validar-gate-contracts-v20260717.mjs', 'contractVersion:"12.0.1"'],
  ['tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-lab-v20260804.mjs', "const VERSION = '12.0.1'"],
  ['functions/cobros-reconciliation-domain.js', 'commission statement'],
  ['orbit360-platform/core/runtime-verification-center-v20260804.js', "'PAY-002B'"]
];
for (const [rel, token] of checks) {
  if (!read(rel).includes(token)) throw new Error(`PIPELINE_MECHANISM_FAILURE:ROOTFIX_NOT_MATERIALIZED:${rel}`);
}
console.log(JSON.stringify({
  schemaVersion: 'orbit360-block12-rootfix-materialization-v1',
  status: 'BLOCK12_ROOTFIX_MATERIALIZED',
  previousRunId: 30945951133,
  previousFailure: 'CANONICAL_LIFECYCLE_REVISION_MISMATCH',
  changes: ['canonical_lifecycle_revision', 'gate_version_12.0.1', 'detached_head_branch_check', 'canonical_evidence_enums', 'split_inference_scenarios'],
  secretAccess: false,
  firestoreRead: false,
  firestoreWrites: 0,
  authWrites: 0,
  deployExecuted: false,
  ok: true
}, null, 2));
