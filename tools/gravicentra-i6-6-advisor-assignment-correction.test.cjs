'use strict';
// Pure synthetic contract tests. No Firebase, customer records or remote calls.
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../functions/advisor-assignment-correction-contract');
const clone = value => JSON.parse(JSON.stringify(value));
function fixture() {
  const client = { id: 'b4003qa_client', tenantId: 'qa_tenant', pais: 'GT', asesorId: 'b4003qa_old', nombre: 'Cliente sintético', updatedAt: '2026-11-15T00:00:00Z' };
  const policy = { id: 'b4003qa_policy', tenantId: 'qa_tenant', clienteId: client.id, pais: 'GT', moneda: 'GTQ', asesorId: client.asesorId,
    numero: 'QA-CORRECTION-1', primaNeta: 1713.17, primaTotal: 2534.57, cuotas: 12, renovable: true,
    comAseguradoraPct: 12.5, comVendedorPct: 80, updatedAt: '2026-11-15T00:00:00Z' };
  const preservedRows = Object.fromEntries(C.PRESERVED_COLLECTIONS.map(collection => [collection, []]));
  preservedRows.recibosEsperados.push({ id: 'b4003qa_receipt', polizaId: policy.id, asesorId: client.asesorId, estado: 'Pagado', monto: 211.21, fechaPago: '2026-10-10', numeroReciboFuente: 'QA-SOURCE-1' });
  preservedRows.carteraPrimas.push({ id: 'b4003qa_portfolio', polizaId: policy.id, reciboId: 'b4003qa_receipt', asesorId: client.asesorId, estado: 'Pagado', saldo: 0 });
  preservedRows.cobros.push({ id: 'b4003qa_payment', polizaId: policy.id, reciboId: 'b4003qa_receipt', asesorId: client.asesorId, estado: 'Conciliado', fechaPago: '2026-10-10', monto: 211.21 });
  preservedRows.comisiones.push({ id: 'b4003qa_commission', polizaId: policy.id, asesorId: client.asesorId, periodo: '2026-09', estado: 'Liquidada', monto: 17.11 });
  preservedRows.finmovs.push({ id: 'b4003qa_payable', polizaId: policy.id, asesorId: client.asesorId, periodo: '2026-09', estado: 'pagado', valor: 17.11 });
  preservedRows.vehiculos.push({ id: 'b4003qa_vehicle', polizaId: policy.id, asesorId: client.asesorId, placa: 'QA-ONLY' });
  return {
    spec: { version: 1, operation: 'preview', clientId: client.id, policyIds: [policy.id], updateClient: false,
      targetAdvisorId: 'b4003qa_new', reason: 'Asignación administrativa confirmada contra documento sintético',
      sourceAuthority: { decisionRef: 'QA-DIRECTION-DECISION', sourceReference: 'qa-original.csv', sourceSha256: 'a'.repeat(64), lineRef: 'Hoja QA, renglón 4', period: '2026-10' } },
    context: { tenantId: 'qa_tenant', actor: { uid: 'qa_direction', activeRole: 'Dirección', countries: ['GT'] }, scopeAuthorized: true,
      client, policies: [policy], targetAdvisor: { id: 'b4003qa_new', tenantId: 'qa_tenant', nombre: 'Asesor sintético nuevo', activo: true, roles: ['Asesor'], paises: ['GT'] }, preservedRows }
  };
}
function commitSpec(spec, plan) { return { ...clone(spec), operation: 'commit', expectedBefore: clone(plan.expectedBefore), expectedPreviewDigest: plan.previewDigest }; }
function apply(plan, context) {
  const after = clone(context);
  for (const change of plan.changes) Object.assign(change.collection === 'clientes' ? after.client : after.policies.find(row => row.id === change.id), change.patch);
  return after;
}
function rejects(fn, code) { assert.throws(fn, error => error.code === code, code); }

test('paid policy correction plans only advisor metadata and preserves financial/commission history', () => {
  const { spec, context } = fixture(), before = clone(context), plan = C.buildPlan(spec, context);
  assert.equal(plan.changes.length, 1);
  assert.deepEqual(plan.changes[0].patch, { asesorId: spec.targetAdvisorId });
  assert.equal(plan.summary.clientChanged, false);
  assert.equal(plan.financialWrites, 0);
  assert.equal(plan.sourceProvenance.documentAuthenticatedByServer, false);
  assert.deepEqual(context, before, 'preview must not mutate the supplied canonical data');
  const after = apply(plan, context), verified = C.verifyReadback(plan, after);
  assert.equal(verified.preservationVerified, true);
  assert.deepEqual(after.client, before.client);
  assert.deepEqual(after.preservedRows, before.preservedRows);
  assert.equal(after.policies[0].primaTotal, 2534.57);
  assert.equal(after.policies[0].comVendedorPct, 80);
});
test('client is an explicit optional target, with the same exact financial preservation', () => {
  const { spec, context } = fixture(); spec.updateClient = true;
  const plan = C.buildPlan(spec, context);
  assert.equal(plan.changes.length, 2);
  assert.equal(plan.summary.clientChanged, true);
  const after = apply(plan, context);
  assert.equal(after.client.asesorId, spec.targetAdvisorId);
  assert.equal(C.verifyReadback(plan, after).canonicalReadback, true);
});
test('commit requires exact server preview, closed targets and unchanged canonical preimages', () => {
  const { spec, context } = fixture(), preview = C.buildPlan(spec, context);
  const commit = commitSpec(spec, preview), plan = C.buildPlan(commit, context);
  assert.equal(plan.readOnly, false);
  assert.equal(plan.payloadDigest, preview.payloadDigest);
  assert.equal(plan.previewDigest, preview.previewDigest);
  const stale = clone(context); stale.policies[0].asesorId = 'b4003qa_someone_else';
  rejects(() => C.buildPlan(commit, stale), 'CORRECTION_STALE_PREIMAGE');
  const changedPremium = clone(context); changedPremium.policies[0].primaTotal += 0.01;
  rejects(() => C.buildPlan(commit, changedPremium), 'CORRECTION_STALE_PREIMAGE');
  const changedRelation = clone(context); changedRelation.client.nombre = 'Cambio concurrente legítimo';
  rejects(() => C.buildPlan(commit, changedRelation), 'CORRECTION_STALE_PREIMAGE');
});
test('new payment, changed commission and new source decision invalidate prior preview', () => {
  const { spec, context } = fixture(), preview = C.buildPlan(spec, context), commit = commitSpec(spec, preview);
  for (const collection of ['cobros', 'comisiones', 'finmovs']) {
    const changed = clone(context); changed.preservedRows[collection][0].monto = 9;
    rejects(() => C.buildPlan(commit, changed), 'CORRECTION_STALE_PREVIEW');
  }
  const added = clone(context); added.preservedRows.cobros.push({ id: 'b4003qa_later_payment', polizaId: spec.policyIds[0], monto: 11 });
  rejects(() => C.buildPlan(commit, added), 'CORRECTION_STALE_PREVIEW');
  const altered = clone(commit); altered.sourceAuthority.decisionRef += '-different';
  rejects(() => C.buildPlan(altered, context), 'CORRECTION_STALE_PREVIEW');
});
test('only a real signed Direction role with server-confirmed scope can plan a correction', () => {
  const { spec, context } = fixture();
  for (const role of ['Operativo', 'Admin', 'AdminTenant', 'SuperAdmin', 'Asesor', 'Finanzas'])
    rejects(() => C.buildPlan(spec, { ...context, actor: { ...context.actor, activeRole: role } }), 'CORRECTION_DIRECTION_REQUIRED');
  rejects(() => C.buildPlan(spec, { ...context, actor: { ...context.actor, uid: '' } }), 'CORRECTION_DIRECTION_REQUIRED');
  rejects(() => C.buildPlan(spec, { ...context, scopeAuthorized: false }), 'CORRECTION_SCOPE_REQUIRED');
});
test('tenant, country, canonical advisor and client-policy relationships fail closed', () => {
  const { spec, context } = fixture();
  const cases = [
    ['CORRECTION_TENANT_DENIED', c => { c.policies[0].tenantId = 'foreign_tenant'; }],
    ['CORRECTION_COUNTRY_DENIED', c => { c.policies[0].pais = 'CO'; }],
    ['CORRECTION_ADVISOR_COUNTRY_CONFLICT', c => { c.targetAdvisor.paises = ['CO']; }],
    ['CORRECTION_ADVISOR_NOT_ASSIGNABLE', c => { c.targetAdvisor.activo = false; }],
    ['CORRECTION_ADVISOR_NOT_ASSIGNABLE', c => { c.targetAdvisor.roles = ['Dirección']; }],
    ['CORRECTION_ADVISOR_ALIAS', c => { c.targetAdvisor.canonicalDocumentId = 'b4003qa_canonical_other'; }],
    ['CORRECTION_POLICY_CLIENT_CONFLICT', c => { c.policies[0].clienteId = 'foreign_client'; }]
  ];
  for (const [code, change] of cases) { const c = clone(context); change(c); rejects(() => C.buildPlan(spec, c), code); }
});
test('all source, reason and period fields are explicit; a hash is not remote-document authentication', () => {
  const { spec, context } = fixture();
  for (const [key, code] of [['decisionRef', 'CORRECTION_DECISION_REQUIRED'], ['sourceReference', 'CORRECTION_SOURCE_REQUIRED'], ['sourceSha256', 'CORRECTION_DIGEST_REQUIRED'], ['lineRef', 'CORRECTION_SOURCE_LINE_REQUIRED'], ['period', 'CORRECTION_PERIOD_REQUIRED']]) {
    const s = clone(spec); delete s.sourceAuthority[key]; rejects(() => C.buildPlan(s, context), code);
  }
  const missingReason = clone(spec); missingReason.reason = '';
  rejects(() => C.buildPlan(missingReason, context), 'CORRECTION_REASON_REQUIRED');
  assert.deepEqual(C.buildPlan(spec, context).sourceProvenance, { kind: 'DIRECTION_DECLARED_DOCUMENTED_CORRECTION', documentAuthenticatedByServer: false });
});
test('no generic mutations, financial fields, forged preimages or duplicate targets enter this contract', () => {
  const { spec, context } = fixture();
  for (const patch of [{ mutations: [] }, { primaTotal: 1 }, { paidOverride: true }])
    rejects(() => C.buildPlan({ ...spec, ...patch }, context), 'CORRECTION_FIELD_NOT_ALLOWED');
  rejects(() => C.buildPlan({ ...spec, policyIds: [spec.policyIds[0], spec.policyIds[0]] }, context), 'CORRECTION_DUPLICATE_TARGET');
  rejects(() => C.buildPlan({ ...spec, expectedBefore: [] }, context), 'CORRECTION_PREVIEW_HAS_PREIMAGE');
  const plan = C.buildPlan(spec, context), commit = commitSpec(spec, plan);
  commit.expectedBefore[0].id = 'b4003qa_some_other_client';
  rejects(() => C.buildPlan(commit, context), 'CORRECTION_PREIMAGE_TARGET_MISMATCH');
});
test('at most twenty explicit writes, including optional client; a missing canonical policy is rejected', () => {
  const { spec, context } = fixture();
  const s = { ...spec, policyIds: Array.from({ length: 20 }, (_, i) => 'b4003qa_policy_' + i), updateClient: true };
  rejects(() => C.normalizeSpec(s), 'CORRECTION_TARGET_LIMIT');
  assert.equal(C.normalizeSpec({ ...s, updateClient: false }).policyIds.length, 20);
  rejects(() => C.buildPlan(spec, { ...context, policies: [] }), 'CORRECTION_POLICY_TARGET_MISMATCH');
});
test('missing authoritative collection reads and duplicate source identities do not look like empty history', () => {
  const { spec, context } = fixture();
  for (const collection of C.PRESERVED_COLLECTIONS) {
    const c = clone(context); delete c.preservedRows[collection];
    rejects(() => C.buildPlan(spec, c), 'CORRECTION_PRESERVATION_READ_REQUIRED');
  }
  const c = clone(context); c.preservedRows.cobros.push(clone(c.preservedRows.cobros[0]));
  rejects(() => C.buildPlan(spec, c), 'CORRECTION_PRESERVATION_DUPLICATE');
});
test('readback rejects any financial, vehicle, source-policy or untargeted-client drift', () => {
  const { spec, context } = fixture(), plan = C.buildPlan(spec, context);
  for (const collection of C.PRESERVED_COLLECTIONS) {
    const after = apply(plan, context); after.preservedRows[collection][0].asesorId = spec.targetAdvisorId;
    rejects(() => C.verifyReadback(plan, after), 'CORRECTION_PRESERVATION_MISMATCH');
  }
  const after = apply(plan, context); after.policies[0].primaNeta = 1;
  rejects(() => C.verifyReadback(plan, after), 'CORRECTION_READBACK_MISMATCH');
  const clientDrift = apply(plan, context); clientDrift.client.asesorId = spec.targetAdvisorId;
  rejects(() => C.verifyReadback(plan, clientDrift), 'CORRECTION_READBACK_MISMATCH');
});
test('repeat verification is read-only and no-op edits cannot create another correction', () => {
  const { spec, context } = fixture(), plan = C.buildPlan(spec, context), after = apply(plan, context), originalAfter = clone(after);
  assert.deepEqual(C.verifyReadback(plan, after), C.verifyReadback(plan, after));
  assert.deepEqual(after, originalAfter);
  rejects(() => C.buildPlan(spec, after), 'CORRECTION_NO_CHANGE');
});
test('key ordering and authoritative query ordering do not change a preview digest', () => {
  const { spec, context } = fixture();
  context.policies.push({ ...context.policies[0], id: 'QA_second_policy' });
  spec.policyIds.push('QA_second_policy');
  const a = C.buildPlan(spec, context), changed = clone(context);
  changed.policies.reverse();
  const b = C.buildPlan({ ...spec, policyIds: spec.policyIds.slice().reverse() }, changed);
  assert.equal(a.previewDigest, b.previewDigest);
});
