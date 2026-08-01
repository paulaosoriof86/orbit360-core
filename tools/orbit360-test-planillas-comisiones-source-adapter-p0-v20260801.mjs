#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const adapter = require('../orbit360-platform/core/planillas-comisiones-source-adapter-p0.js');
const evidencePath = process.env.ORBIT360_PLANILLAS_ADAPTER_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/planillas-comisiones-source-adapter-static-v20260801.json';
const checks = [];
function check(id, condition) { checks.push({ id, ok: Boolean(condition) }); }

const headers = [
  'Tipo', 'Prod.', 'Poliza', 'Rel.Ing.', 'Fecha Pago', 'Moneda', 'Requerimiento',
  'Serie', 'Factura', 'Fecha/Venc.', 'Obligacion', 'No.Pago', 'Asegurado', 'Ramo',
  'Valor Factura', 'Prima Neta', 'Comision/Venta', 'Vendedor', 'Comisión Vendedor',
  'Solo Referencia GtosMed'
];
const validRow = [
  'VENTA', 'AUTO', 'POL-FICTICIA-001', 'REL-001', '15/07/2026', 'Q', 'REQ-001',
  'SERIE-001', 'FACT-001', '31/07/2026', '', '1', 'CLIENTE FICTICIO', 'AUTO',
  '1,250.50', '1,000.40', '150.06', 'ASESOR FICTICIO', '90.04', 'REF-FICTICIA'
];
const context = {
  country: 'GT',
  expectedPeriod: '2026-07',
  sourcePeriod: '2026-07',
  sourceFile: 'fixture-planilla.xlsx',
  sourceSheet: 'Comisiones'
};

const map = adapter.buildHeaderMap(headers);
check('SCHEMA_VERSION', adapter.schemaVersion === 'orbit360-planillas-comisiones-source-adapter-v1.1');
check('MAP_POLICY', map.policyNumber === 2);
check('MAP_PAYMENT_DATE', map.paymentDate === 4);
check('MAP_NET_PREMIUM', map.netPremium === 15);
check('MAP_INTERMEDIARY_COMMISSION', map.intermediaryCommission === 16);
check('MAP_SELLER_COMMISSION', map.sellerCommission === 18);
check('NORMALIZE_GT', adapter.normalizeCountry('Guatemala') === 'GT');
check('NORMALIZE_GTQ', adapter.normalizeCurrency('Q') === 'GTQ');
check('NORMALIZE_DATE_DMY', adapter.normalizeDate('15/07/2026') === '2026-07-15');
check('PARSE_NUMBER_COMMA', adapter.parseNumber('1,250.50').value === 1250.5);
check('PARSE_NUMBER_DECIMAL_COMMA', adapter.parseNumber('1.250,50').value === 1250.5);

const valid = adapter.normalizeRow(headers, validRow, Object.assign({}, context, { sourceRow: 2 }));
check('VALID_CANDIDATE', valid.decision === 'CANDIDATE');
check('VALID_NO_REASONS', valid.reasons.length === 0);
check('VALID_PERIOD', valid.record.period === '2026-07');
check('VALID_COUNTRY_CURRENCY', valid.record.country === 'GT' && valid.record.currency === 'GTQ');
check('VALID_NET_PREMIUM', valid.record.netPremium === 1000.4);
check('VALID_INTERMEDIARY_COMMISSION', valid.record.intermediaryCommission === 150.06);
check('VALID_SELLER_COMMISSION_SEPARATE', valid.record.sellerCommission === 90.04);
check('VALID_TRACE', valid.record.trace.sourceFile === 'fixture-planilla.xlsx' && valid.record.trace.sourceRow === 2);
check('NO_RATE_INFERENCE', valid.commissionRateInferred === false && !Object.hasOwn(valid.record, 'commissionRate'));
check('NO_WRITES_ROW', valid.writes === 0);
check('STRONG_IDENTITY_TRUE', adapter.hasStrongIdentity(valid.record) === true);

const mismatch = adapter.normalizeRow(headers, validRow, Object.assign({}, context, { expectedPeriod: '2026-08', sourcePeriod: '2026-07' }));
check('PERIOD_MISMATCH_HOLD', mismatch.decision === 'HOLD_PERIOD_MISMATCH');
check('PERIOD_MISMATCH_REASON', mismatch.reasons.includes('SOURCE_PERIOD_DOES_NOT_MATCH_EXPECTED_PERIOD'));

const missingCountry = adapter.normalizeRow(headers, validRow, Object.assign({}, context, { country: '' }));
check('COUNTRY_REQUIRED', missingCountry.decision === 'REQUIERE_VALIDACION' && missingCountry.reasons.includes('COUNTRY_MISSING'));

const missingCurrencyRow = validRow.slice(); missingCurrencyRow[5] = '';
const missingCurrency = adapter.normalizeRow(headers, missingCurrencyRow, Object.assign({}, context, { currency: '' }));
check('CURRENCY_REQUIRED', missingCurrency.decision === 'REQUIERE_VALIDACION' && missingCurrency.reasons.includes('CURRENCY_MISSING'));

const missingCommissionRow = validRow.slice(); missingCommissionRow[16] = '';
const missingCommission = adapter.normalizeRow(headers, missingCommissionRow, context);
check('COMMISSION_REQUIRED', missingCommission.decision === 'REQUIERE_VALIDACION' && missingCommission.reasons.includes('INTERMEDIARY_COMMISSION_MISSING_OR_INVALID'));

const periodOnlyRow = validRow.slice();
periodOnlyRow[3] = '';
periodOnlyRow[4] = '';
periodOnlyRow[6] = '';
periodOnlyRow[7] = '';
periodOnlyRow[8] = '';
periodOnlyRow[19] = '';
const periodOnlyContext = Object.assign({}, context, { allowPeriodOnly: true });
const periodOnly = adapter.normalizeRow(headers, periodOnlyRow, periodOnlyContext);
check('PERIOD_ONLY_CANDIDATE', periodOnly.decision === 'CANDIDATE');
check('PERIOD_ONLY_NO_DATE_REASON', !periodOnly.reasons.includes('PAYMENT_DATE_INVALID'));
check('PERIOD_ONLY_PERIOD_PRESERVED', periodOnly.record.period === '2026-07' && periodOnly.record.paymentDate === '');
check('WEAK_IDENTITY_FALSE', adapter.hasStrongIdentity(periodOnly.record) === false);
const strictPeriodOnly = adapter.normalizeRow(headers, periodOnlyRow, context);
check('PERIOD_ONLY_STRICT_REQUIRES_VALIDATION', strictPeriodOnly.decision === 'REQUIERE_VALIDACION' && strictPeriodOnly.reasons.includes('PAYMENT_DATE_INVALID'));

const strongDry = adapter.dryRun({ headers, rows: [validRow, validRow, missingCommissionRow], context });
check('DRYRUN_TOTAL', strongDry.summary.total === 3);
check('DRYRUN_CANDIDATE', strongDry.summary.candidate === 1);
check('DRYRUN_DUPLICATE', strongDry.summary.duplicate === 1);
check('DRYRUN_REQUIRES_VALIDATION', strongDry.summary.requiresValidation === 1);
check('DRYRUN_ZERO_WRITES', strongDry.summary.writes === 0 && strongDry.writes === 0);
check('DRYRUN_NO_STORE', strongDry.storeAccess === false && strongDry.firestoreAccess === false);

const weakDry = adapter.dryRun({ headers, rows: [periodOnlyRow, periodOnlyRow], context: periodOnlyContext });
check('WEAK_DUPLICATES_PRESERVED', weakDry.summary.candidate === 2 && weakDry.summary.duplicate === 0);
check('WEAK_IDENTITY_COUNT', weakDry.summary.weakIdentityPreserved === 2);
check('WEAK_PROPOSALS_NOT_DEDUPE_ELIGIBLE', weakDry.proposals.every(item => item.dedupeEligible === false));

const differentBranch = validRow.slice(); differentBranch[13] = 'VIDA';
const branchDry = adapter.dryRun({ headers, rows: [validRow, differentBranch], context });
check('BRANCH_PART_OF_IDENTITY', branchDry.summary.candidate === 2 && branchDry.summary.duplicate === 0);

const failed = checks.filter(item => !item.ok);
const evidence = {
  schemaVersion: 'orbit360-planillas-comisiones-source-adapter-static-evidence-v1.1',
  status: failed.length ? 'STATIC_ADAPTER_FAIL' : 'STATIC_ADAPTER_PASS',
  classification: failed.length ? 'FUNCTIONAL_DEFECT' : 'GO_STATIC_SOURCE_ADAPTER',
  module: 'planillas-comisiones-source-adapter-p0',
  fixtureType: 'SYNTHETIC_ONLY',
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failedCheckIds: failed.map(item => item.id),
  aliasesMapped: Object.keys(map).length,
  decisionsVerified: ['CANDIDATE', 'REQUIERE_VALIDACION', 'HOLD_PERIOD_MISMATCH', 'OMIT_DUPLICATE'],
  exactPeriodRequired: true,
  explicitCountryRequired: true,
  explicitCurrencyRequired: true,
  periodOnlySupportedWithExplicitOptIn: true,
  strictModeStillRequiresPaymentDate: true,
  weakIdentityDuplicatePreserved: true,
  strongIdentityDuplicateOmitted: true,
  branchIncludedInIdentity: true,
  netPremiumSeparated: true,
  intermediaryAndSellerCommissionSeparated: true,
  commissionRateInferred: false,
  realRowsUsed: 0,
  containsPII: false,
  containsPolicyNumbers: false,
  containsAmounts: false,
  secretsRead: false,
  firestoreRead: false,
  firestoreWrites: 0,
  operationalWrites: 0,
  storeAccess: false,
  browserExecuted: false,
  deployExecuted: false,
  productionTouched: false,
  ok: failed.length === 0
};
fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(evidence, null, 2));
process.exit(failed.length ? 42 : 0);
