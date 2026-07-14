import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const platform = path.resolve(here, '..');
const contractPath = path.join(platform, 'core', 'financiero-historico-finmovs-write-plan-p0.js');
const source = fs.readFileSync(contractPath, 'utf8');

const forbidden = [
  /Orbit\.store\s*[.\[]/,
  /localStorage\s*[.\[]/,
  /sessionStorage\s*[.\[]/,
  /\.insert\s*\(/,
  /\.update\s*\(/,
  /\.remove\s*\(/
];
const staticViolations = forbidden.filter((pattern) => pattern.test(source)).map(String);
if (staticViolations.length) {
  console.error(JSON.stringify({ ok: false, stage: 'static', staticViolations }, null, 2));
  process.exit(1);
}

const context = {
  window: { Orbit: {} },
  console,
  Number,
  Object,
  Array,
  String,
  RegExp,
  JSON,
  Date,
  Math
};
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(source, context, { filename: contractPath });

const api = context.window.Orbit.financieroHistoricoFinmovsWritePlanP0;
if (!api) throw new Error('Contrato de plan no instalado');

function proposal(overrides = {}) {
  const base = {
    ok: true,
    targetCollection: 'finmovs',
    writeAuthorized: false,
    counts: { total: 2, create: 1, omit: 1, requiresValidation: 0 },
    operations: [
      {
        action: 'create',
        collection: 'finmovs',
        sourceRecordId: 'fh_001',
        targetId: 'finmov_001',
        record: {
          id: 'finmov_001',
          tenantId: 'tenant-test',
          pais: 'GT',
          moneda: 'GTQ',
          fecha: '2026-05-13',
          periodo: '2026-05',
          direccion: 'ingreso',
          categoria: 'ingreso_comision',
          monto: 112,
          nature: 'operating',
          isOperatingIncome: true,
          isPremiumCollection: false,
          sourceCollection: 'financiero_historico',
          sourceRecordId: 'fh_001',
          sourceTraceHash: 'a'.repeat(64),
          promotionStatus: 'propuesta',
          validationStatus: 'dry_run'
        }
      },
      {
        action: 'omit',
        sourceRecordId: 'fh_002',
        targetId: 'finmov_002',
        reason: 'duplicado_source_record'
      }
    ]
  };
  return { ...base, ...overrides };
}

function confirmation(overrides = {}) {
  return {
    approved: true,
    phrase: api.CONFIRMATION_PHRASE,
    userId: 'user-direction',
    tenantId: 'tenant-test',
    activeRole: 'Dirección',
    assignedRoles: ['Dirección', 'Asesor'],
    dataScope: 'todos',
    reason: 'Carga inicial controlada del histórico reconciliado',
    confirmedAt: '2026-07-13T20:00:00Z',
    mfaVerified: true,
    ...overrides
  };
}

const validPlan = api.buildPlan(proposal(), confirmation(), { requireMfa: true });
const badPhrase = api.buildPlan(proposal(), confirmation({ phrase: 'ACEPTO' }), {});
const wrongTenant = api.buildPlan(proposal(), confirmation({ tenantId: 'other-tenant' }), {});
const inactiveRole = api.buildPlan(proposal(), confirmation({ activeRole: 'AdminTenant', assignedRoles: ['Dirección'] }), {});
const asesorBlocked = api.buildPlan(proposal(), confirmation({ activeRole: 'Asesor', assignedRoles: ['Asesor'] }), {});
const operativoBlocked = api.buildPlan(proposal(), confirmation({ activeRole: 'Operativo', assignedRoles: ['Operativo'] }), {});
const operativoAllowed = api.buildPlan(proposal(), confirmation({ activeRole: 'Operativo', assignedRoles: ['Operativo'] }), { allowOperativoFinancialPosting: true });
const noScope = api.buildPlan(proposal(), confirmation({ dataScope: 'ninguno' }), {});
const pendingProposal = api.buildPlan(proposal({ ok: false, counts: { total: 2, create: 1, omit: 0, requiresValidation: 1 } }), confirmation(), {});
const mixedProposal = proposal();
mixedProposal.operations = [
  mixedProposal.operations[0],
  {
    action: 'create',
    collection: 'finmovs',
    sourceRecordId: 'fh_other',
    targetId: 'finmov_other',
    record: {
      ...mixedProposal.operations[0].record,
      id: 'finmov_other',
      tenantId: 'other-tenant',
      sourceRecordId: 'fh_other',
      sourceTraceHash: 'b'.repeat(64)
    }
  }
];
mixedProposal.counts = { total: 2, create: 2, omit: 0, requiresValidation: 0 };
const mixedTenant = api.buildPlan(mixedProposal, confirmation(), {});

const operation = validPlan.operations[0];
const audit = validPlan.auditEntries[0];
const rollback = validPlan.rollbackPlan[0];

const assertions = {
  validPlanReady: validPlan.ok === true && validPlan.readyForExecutor === true && validPlan.writeExecuted === false,
  finalRecordApproved: operation && operation.collection === 'finmovs' && operation.record.validationStatus === 'validado' && operation.record.promotionStatus === 'approved_for_execution',
  approvalTrace: operation && operation.record.approvedBy === 'user-direction' && operation.record.writePlanId === validPlan.planId,
  auditPlanned: audit && audit.status === 'planned_not_executed' && audit.sourceCollection === 'financiero_historico',
  rollbackPlanned: rollback && rollback.action === 'remove_inserted' && rollback.targetId === 'finmov_001',
  omitPreserved: validPlan.omissions.length === 1 && validPlan.omissions[0].reason === 'duplicado_source_record',
  badPhraseBlocked: badPhrase.ok === false && badPhrase.errors.includes('frase_confirmacion_invalida'),
  tenantGate: wrongTenant.ok === false && wrongTenant.errors.includes('tenant_confirmacion_no_coincide'),
  activeRoleGate: inactiveRole.ok === false && inactiveRole.errors.includes('rol_activo_no_asignado'),
  asesorBlocked: asesorBlocked.ok === false && asesorBlocked.errors.includes('rol_no_autorizado'),
  operativoDefaultBlocked: operativoBlocked.ok === false && operativoBlocked.errors.includes('rol_no_autorizado'),
  operativoConfigurable: operativoAllowed.ok === true && operativoAllowed.approvedRole === 'Operativo',
  scopeGate: noScope.ok === false && noScope.errors.includes('scope_sin_acceso'),
  pendingProposalBlocked: pendingProposal.ok === false && pendingProposal.errors.includes('propuesta_con_validaciones_pendientes'),
  multiTenantBlocked: mixedTenant.ok === false && mixedTenant.errors.includes('propuesta_multi_tenant_bloqueada'),
  executorStillRequired: validPlan.executorRequirements.productBackendRequired === true && validPlan.executorRequirements.orbitStoreOnly === true
};

const failed = Object.entries(assertions).filter(([, ok]) => !ok).map(([name]) => name);
const result = {
  ok: failed.length === 0,
  contract: path.relative(platform, contractPath).replaceAll('\\', '/'),
  assertions,
  failed,
  staticViolations,
  sample: {
    planId: validPlan.planId,
    readyForExecutor: validPlan.readyForExecutor,
    writeExecuted: validPlan.writeExecuted,
    operationCount: validPlan.operations.length,
    omissionCount: validPlan.omissions.length,
    rollbackCount: validPlan.rollbackPlan.length
  }
};

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
