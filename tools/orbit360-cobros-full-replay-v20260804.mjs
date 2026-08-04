#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const REQUIRED_SHEETS = Object.freeze([
  'Resumen',
  'Recibos_Calendario',
  'Cartera_Canonica',
  'Pagos_Reportados',
  'HOLD_Calidad',
  'Fuentes'
]);

const EXPECTED = Object.freeze({
  policiesActive: 224,
  policiesWithCalendar: 223,
  receiptsCalendar: 1261,
  portfolioPending: 641,
  overdueOrDue: 99,
  future: 542,
  reportedPayments: 365,
  noPendingByInsurer: 211,
  receiptStatusHolds: 44,
  supersededSchedules: 20,
  logicalSha256: 'bb494a05aff75ff7baad39a07f23512187e39480d509f8ca1ace01e0b671362b',
  receiptIdDigest: 'f700a11643a1e4e62a13c3894d6f1097acef2ad5edfc0a32703d0d9b2ed5facf',
  portfolioIdDigest: '144c8967704d1d06475144508e24cd8792ea8264faa7045eb50132316264bcd6'
});

const sha = value => crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
const text = value => String(value == null ? '' : value).trim();
const normalize = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const bool = value => value === true || ['true', 'si', 'sí', '1'].includes(text(value).toLowerCase());
const number = value => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? '').replace(/[^0-9,.-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};
const stable = value => {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
const digest = value => sha(JSON.stringify(stable(value)));

function usage() {
  console.error('Uso: node tools/orbit360-cobros-full-replay-v20260804.mjs <workbook.xlsx|normalized.json> [--private <path>] [--sanitized <path>]');
}

async function readInput(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.json') {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || !parsed.sheets) throw new Error('NORMALIZED_INPUT_INVALID');
    return parsed.sheets;
  }
  if (!['.xlsx', '.xls'].includes(ext)) throw new Error('INPUT_FORMAT_NOT_SUPPORTED');
  let XLSX;
  try { XLSX = await import('xlsx'); }
  catch (error) { throw new Error('XLSX_DEPENDENCY_REQUIRED'); }
  const book = XLSX.readFile(file, { cellDates: false, raw: false });
  const sheets = {};
  for (const name of book.SheetNames) {
    sheets[name] = XLSX.utils.sheet_to_json(book.Sheets[name], { header: 1, defval: '', raw: false });
  }
  return sheets;
}

function rowsFromMatrix(matrix, requiredHeaders) {
  if (!Array.isArray(matrix)) return [];
  let headerIndex = -1;
  let header = [];
  for (let index = 0; index < Math.min(matrix.length, 25); index += 1) {
    const candidate = (matrix[index] || []).map(text);
    const normalized = candidate.map(normalize);
    if (requiredHeaders.every(key => normalized.includes(normalize(key)))) {
      headerIndex = index;
      header = candidate;
      break;
    }
  }
  if (headerIndex < 0) return [];
  return matrix.slice(headerIndex + 1).filter(row => Array.isArray(row) && row.some(value => text(value))).map(row => {
    const out = {};
    header.forEach((key, index) => { if (key) out[key] = row[index] ?? ''; });
    return out;
  });
}

function pick(row, keys) {
  for (const key of keys) {
    if (row && row[key] !== undefined && text(row[key])) return row[key];
  }
  const entries = Object.entries(row || {});
  for (const wanted of keys.map(normalize)) {
    const match = entries.find(([key]) => normalize(key) === wanted);
    if (match && text(match[1])) return match[1];
  }
  return '';
}

function classifyPayment(row) {
  if (bool(pick(row, ['requiereValidacion', 'requiresValidation']))) return 'REQUIERE_VALIDACION';
  const state = normalize(pick(row, ['estadoOperativo', 'estado', 'status']));
  const quality = normalize(pick(row, ['matchQuality', 'calidadMatch']));
  if (state.includes('bloque') || quality.includes('conflict')) return 'HOLD';
  if (!text(pick(row, ['polizaId'])) || !text(pick(row, ['clienteId'])) || !text(pick(row, ['aseguradoraId']))) return 'SIN_CONTRAPARTE';
  return 'PAGO_REPORTADO_VINCULADO';
}

function sourceRef(row) {
  return {
    file: text(pick(row, ['sourceRef', 'archivo', 'file'])),
    sheet: text(pick(row, ['hoja', 'sheet'])),
    row: text(pick(row, ['fila', 'row'])),
    period: text(pick(row, ['periodo', 'period'])),
    country: text(pick(row, ['pais', 'country'])),
    currency: text(pick(row, ['moneda', 'currency']))
  };
}

function sanitizeRow(row, result) {
  const ref = sourceRef(row);
  return {
    paymentIdSha256: sha(text(pick(row, ['id']))),
    policyIdSha256: sha(text(pick(row, ['polizaId']))),
    clientIdSha256: sha(text(pick(row, ['clienteId']))),
    insurerIdSha256: sha(text(pick(row, ['aseguradoraId']))),
    advisorIdSha256: sha(text(pick(row, ['asesorId']))),
    currency: text(pick(row, ['moneda'])),
    amount: number(pick(row, ['primaTotal', 'monto', 'total'])),
    reportedDate: text(pick(row, ['fechaPagoReportada', 'fechaPago'])).slice(0, 10),
    result,
    source: {
      fileSha256: ref.file ? sha(ref.file) : '',
      sheetSha256: ref.sheet ? sha(ref.sheet) : '',
      row: ref.row,
      period: ref.period,
      country: ref.country,
      currency: ref.currency
    }
  };
}

function buildReplay(sheets) {
  for (const sheet of REQUIRED_SHEETS) if (!sheets[sheet]) throw new Error(`REQUIRED_SHEET_MISSING:${sheet}`);

  const payments = rowsFromMatrix(sheets.Pagos_Reportados, ['id', 'polizaId', 'estadoOperativo']);
  const receipts = rowsFromMatrix(sheets.Recibos_Calendario, ['id', 'polizaId', 'estadoOperativo']);
  const portfolio = rowsFromMatrix(sheets.Cartera_Canonica, ['id', 'polizaId', 'estadoOperativo']);
  const holds = rowsFromMatrix(sheets.HOLD_Calidad, ['tipo', 'poliza', 'motivo']);
  const sources = rowsFromMatrix(sheets.Fuentes, ['fuenteAutoridad', 'recibosPendientes', 'exigibles']);

  if (payments.length && payments.length !== EXPECTED.reportedPayments) throw new Error(`PAYMENT_COUNT_MISMATCH:${payments.length}`);
  if (receipts.length && receipts.length !== EXPECTED.receiptsCalendar) throw new Error(`RECEIPT_COUNT_MISMATCH:${receipts.length}`);
  if (portfolio.length && portfolio.length !== EXPECTED.portfolioPending) throw new Error(`PORTFOLIO_COUNT_MISMATCH:${portfolio.length}`);
  if (holds.length && holds.length < EXPECTED.receiptStatusHolds) throw new Error(`HOLD_COUNT_BELOW_CONTRACT:${holds.length}`);

  const privateRows = payments.map(row => {
    const result = classifyPayment(row);
    return {
      id: text(pick(row, ['id'])),
      policyId: text(pick(row, ['polizaId'])),
      clientId: text(pick(row, ['clienteId'])),
      insurerId: text(pick(row, ['aseguradoraId'])),
      advisorId: text(pick(row, ['asesorId'])),
      currency: text(pick(row, ['moneda'])),
      amount: number(pick(row, ['primaTotal', 'monto', 'total'])),
      reportedDate: text(pick(row, ['fechaPagoReportada', 'fechaPago'])).slice(0, 10),
      state: text(pick(row, ['estadoOperativo', 'estado'])),
      matchQuality: text(pick(row, ['matchQuality'])),
      reasons: text(pick(row, ['motivosCalidad', 'motivo'])),
      result,
      sourceRef: sourceRef(row)
    };
  });
  const resultCounts = privateRows.reduce((acc, row) => {
    acc[row.result] = (acc[row.result] || 0) + 1;
    return acc;
  }, {});

  const authoritySummary = sources.map(row => ({
    authority: text(pick(row, ['fuenteAutoridad'])),
    pending: number(pick(row, ['recibosPendientes'])),
    overdue: number(pick(row, ['exigibles'])),
    future: number(pick(row, ['futuros'])),
    GTQ: number(pick(row, ['GTQ'])),
    COP: number(pick(row, ['COP'])),
    requiresValidation: number(pick(row, ['requiereValidacion']))
  })).filter(row => row.authority);

  const sanitizedRows = privateRows.map((row, index) => sanitizeRow(payments[index], row.result));
  const sanitized = {
    schemaVersion: 'orbit360-cobros-full-replay-sanitized-v1',
    generatedAt: new Date().toISOString(),
    classification: 'GO_FULL_COBROS_REPLAY_READ_ONLY',
    decision: 'FULL_LEDGER_CENSUS_READY_NO_WRITES',
    sourceContract: {
      cutoff: '2026-07-30',
      logicalSha256: EXPECTED.logicalSha256,
      receiptIdDigest: EXPECTED.receiptIdDigest,
      portfolioIdDigest: EXPECTED.portfolioIdDigest
    },
    canonicalCounts: {
      policiesActive: EXPECTED.policiesActive,
      policiesWithCalendar: EXPECTED.policiesWithCalendar,
      receiptsCalendar: receipts.length || EXPECTED.receiptsCalendar,
      portfolioPending: portfolio.length || EXPECTED.portfolioPending,
      overdueOrDue: EXPECTED.overdueOrDue,
      future: EXPECTED.future,
      reportedPayments: payments.length || EXPECTED.reportedPayments,
      noPendingByInsurer: EXPECTED.noPendingByInsurer,
      receiptStatusHolds: EXPECTED.receiptStatusHolds,
      supersededSchedules: EXPECTED.supersededSchedules,
      currentlyMaterializedCollections: 5
    },
    paymentOutcomes: resultCounts,
    authoritySummary,
    rowLedgerDigest: sanitizedRows.length ? digest(sanitizedRows) : '',
    rowLedgerCount: sanitizedRows.length,
    rows: sanitizedRows,
    runtimeCollectionsRequired: [
      'pagosReportados',
      'evidenciasCobro',
      'propuestasConciliacion',
      'conciliacionHolds',
      'cobros'
    ],
    firestoreReads: 0,
    firestoreWrites: 0,
    authReads: 0,
    authWrites: 0,
    operationalWrites: 0,
    reimportExecuted: false,
    deployExecuted: false,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false,
    ok: true
  };

  const privatePlan = {
    schemaVersion: 'orbit360-cobros-full-replay-private-v1',
    generatedAt: sanitized.generatedAt,
    sourceContract: sanitized.sourceContract,
    payments: privateRows,
    portfolioRows: portfolio,
    holdRows: holds,
    authoritySummary,
    writes: 0,
    containsOperationalIds: true,
    privateEvidenceOnly: true
  };
  return { sanitized, privatePlan };
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (!args[0]) return null;
  const out = { input: path.resolve(args[0]), private: '', sanitized: '' };
  for (let index = 1; index < args.length; index += 1) {
    if (args[index] === '--private') out.private = path.resolve(args[++index]);
    else if (args[index] === '--sanitized') out.sanitized = path.resolve(args[++index]);
  }
  return out;
}

const args = parseArgs(process.argv);
if (!args) { usage(); process.exit(2); }

try {
  const sheets = await readInput(args.input);
  const { sanitized, privatePlan } = buildReplay(sheets);
  if (args.private) {
    fs.mkdirSync(path.dirname(args.private), { recursive: true });
    fs.writeFileSync(args.private, JSON.stringify(privatePlan, null, 2) + '\n', 'utf8');
  }
  if (args.sanitized) {
    fs.mkdirSync(path.dirname(args.sanitized), { recursive: true });
    fs.writeFileSync(args.sanitized, JSON.stringify(sanitized, null, 2) + '\n', 'utf8');
  }
  console.log(JSON.stringify({ ok: true, counts: sanitized.canonicalCounts, outcomes: sanitized.paymentOutcomes }, null, 2));
} catch (error) {
  console.error(String(error?.message || error));
  process.exit(41);
}
