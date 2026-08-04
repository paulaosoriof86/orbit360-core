#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const TOOL = path.join(ROOT, 'tools/orbit360-cobros-full-replay-v20260804.mjs');
const EXPECTED = {
  policiesActive: 224,
  policiesWithCalendar: 223,
  receiptsCalendar: 1261,
  portfolioPending: 641,
  overdueOrDue: 99,
  future: 542,
  reportedPayments: 365,
  noPendingByInsurer: 211,
  receiptStatusHolds: 44,
  supersededSchedules: 20
};
const checks = {};
const check = (name, value) => { checks[name] = Boolean(value); };

check('toolExists', fs.existsSync(TOOL));
const source = fs.existsSync(TOOL) ? fs.readFileSync(TOOL, 'utf8') : '';
check('readOnlyCounters', /firestoreWrites:\s*0/.test(source) && /operationalWrites:\s*0/.test(source));
check('noFirebaseImports', !/firebase-admin|firebase-functions|firebase\/auth|firebase\/firestore/.test(source));
check('noNetworkCalls', !/\bfetch\s*\(|axios|https\.request|http\.request/.test(source));
check('requiredSheets', ['Resumen','Recibos_Calendario','Cartera_Canonica','Pagos_Reportados','HOLD_Calidad','Fuentes'].every(name => source.includes(`'${name}'`)));
check('canonicalCollections', ['pagosReportados','evidenciasCobro','propuestasConciliacion','conciliacionHolds','cobros'].every(name => source.includes(`'${name}'`)));
check('expectedCountsEmbedded', Object.values(EXPECTED).every(value => source.includes(String(value))));
check('outcomesPresent', ['PAGO_REPORTADO_VINCULADO','REQUIERE_VALIDACION','HOLD','SIN_CONTRAPARTE'].every(value => source.includes(value)));
check('piiSanitizedByDigest', /paymentIdSha256/.test(source) && /policyIdSha256/.test(source) && /clientIdSha256/.test(source));

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-cobros-replay-'));
const fixture = path.join(temp, 'fixture.json');
const sanitized = path.join(temp, 'sanitized.json');
const matrix = (header, count, factory) => [header, ...Array.from({ length: count }, (_, index) => factory(index))];
const paymentHeader = ['id','polizaId','polizaNumero','estadoOperativo','moneda','primaTotal','fechaPagoReportada','requiereValidacion','matchQuality','sourceRef','clienteId','aseguradoraId','asesorId'];
const sheets = {
  Resumen: [['Indicador','Valor calculado'], ['Pagos reportados, no conciliados',365]],
  Recibos_Calendario: matrix(['id','polizaId','estadoOperativo'], 1261, index => [`rec_${index}`,`pol_${index % 224}`,'pendiente_vencido']),
  Cartera_Canonica: matrix(['id','polizaId','estadoOperativo'], 641, index => [`car_${index}`,`pol_${index % 224}`, index < 99 ? 'pendiente_vencido' : 'futuro_pendiente']),
  Pagos_Reportados: matrix(paymentHeader, 365, index => [
    `pay_${index}`, `pol_${index % 224}`, `P-${index % 224}`, 'pago_reportado', index % 17 === 0 ? 'COP' : 'GTQ', 100 + index,
    '2026-07-30', false, 'SIGA_ESTADO_PAGO_O_HOLD', `Cobranza:${index}`, `cli_${index % 120}`, `ins_${index % 12}`, `ase_${index % 7}`
  ]),
  HOLD_Calidad: matrix(['tipo','poliza','motivo'], 44, index => ['RECIBO_ESTADO_NO_RESUELTO',`P-${index}`,'ESTADO_RECIBO_NO_RESUELTO']),
  Fuentes: [
    ['fuenteAutoridad','recibosPendientes','exigibles','futuros','GTQ','COP','requiereValidacion'],
    ['AseGuate',86,5,81,25784.74,0,0],
    ['ElRoble',252,30,222,89036.26,0,28],
    ['GyT',1,1,0,577.91,0,0],
    ['LaCeiba',8,8,0,3040.84,0,0],
    ['Mapfre',2,1,1,2780,0,0],
    ['SIGA',258,51,207,135608.61,11619295.17,0],
    ['Universales',34,3,31,32927.01,0,0]
  ]
};
fs.writeFileSync(fixture, JSON.stringify({ sheets }), 'utf8');
const syntax = spawnSync(process.execPath, ['--check', TOOL], { encoding: 'utf8' });
check('syntaxPass', syntax.status === 0);
const run = spawnSync(process.execPath, [TOOL, fixture, '--sanitized', sanitized], { encoding: 'utf8' });
check('fixtureRunPass', run.status === 0 && fs.existsSync(sanitized));
let evidence = {};
if (fs.existsSync(sanitized)) evidence = JSON.parse(fs.readFileSync(sanitized, 'utf8'));
check('fixturePaymentCount', evidence?.canonicalCounts?.reportedPayments === 365 && evidence?.rowLedgerCount === 365);
check('fixturePortfolioInvariant', evidence?.canonicalCounts?.overdueOrDue + evidence?.canonicalCounts?.future === evidence?.canonicalCounts?.portfolioPending);
check('fixtureNoWrites', evidence?.firestoreWrites === 0 && evidence?.operationalWrites === 0 && evidence?.deployExecuted === false);
check('fixtureSanitized', evidence?.containsPII === false && evidence?.containsSecrets === false && Array.isArray(evidence?.rows));
check('authorityTotals', (evidence?.authoritySummary || []).reduce((sum, row) => sum + Number(row.pending || 0), 0) === 641);

const failed = Object.entries(checks).filter(([, value]) => !value).map(([name]) => name);
const output = {
  schemaVersion: 'orbit360-cobros-full-replay-source-validation-v1',
  generatedAt: new Date().toISOString(),
  classification: failed.length ? 'FUNCTIONAL_DEFECT' : 'GO_FULL_COBROS_REPLAY_SOURCE_ONLY',
  checks,
  passed: Object.keys(checks).length - failed.length,
  failed: failed.length,
  failures: failed,
  fixtureCounts: evidence.canonicalCounts || {},
  firestoreReads: 0,
  firestoreWrites: 0,
  authReads: 0,
  authWrites: 0,
  browserRuns: 0,
  deployExecuted: false,
  productionTouched: false,
  containsPII: false,
  containsSecrets: false,
  ok: failed.length === 0
};
console.log(JSON.stringify(output, null, 2));
process.exitCode = failed.length ? 41 : 0;
