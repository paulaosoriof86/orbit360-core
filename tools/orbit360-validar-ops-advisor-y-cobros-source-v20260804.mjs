#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import assert from 'node:assert/strict';
import { inferReconciliation, OUTCOMES } from './orbit360-cobros-inferencia-secuencial-v20260804.mjs';

const read = path => fs.readFileSync(path, 'utf8');
const checks = [];
const check = (name, fn) => {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, error: String(error && error.message || error) }); }
};

const ops = read('orbit360-platform/modules/ops.js');
const bridge = read('orbit360-platform/modules/ops-workflows-v1201-bridge.js');
const access = read('orbit360-platform/core/access-scope.js');
const inbox = read('functions/ops-advisor-inbox.js');
const domain = read('functions/ops-leads-domain.js');
const packageDoc = read('orbit360-platform/docs/PAQUETE-ACUMULADO-CLAUDE-ORBIT360-20260804.md');

check('Ops base no excluye al Asesor', () => {
  assert.equal(/El asesor NO ve|asesor no accede|restricted\(\).*Asesor/i.test(ops), false);
  assert.match(ops, /Orbit\.access\.canView/);
  assert.match(ops, /Tu operación/);
});
check('Asesor recibe módulo Ops con scope propio', () => {
  assert.match(bridge, /modules\.includes\('ops'\)/);
  assert.match(bridge, /Orbit\.access\.canView/);
  assert.match(access, /Asesor[\s\S]{0,160}return 'own'/i);
});
check('Asesor no obtiene controles administrativos', () => {
  assert.match(ops, /advisor \? '' : '<button class="btn ghost" id="op-lists">/);
  assert.match(bridge, /Vista de seguimiento · alcance propio/);
  assert.match(bridge, /Las transiciones operativas corresponden al equipo autorizado/);
});
check('Resolución produce notificación visible', () => {
  assert.match(bridge, /Gestión resuelta/);
  assert.match(domain, /notificationOutbox/);
  assert.match(domain, /resolve_management/);
  assert.match(domain, /portalNotificationRef/);
});
check('Inbox backend es tenant-scoped y fail-closed', () => {
  assert.match(inbox, /membershipRef/);
  assert.match(inbox, /scope === 'own'/);
  assert.match(inbox, /advisorId/);
  assert.match(inbox, /notificationOutbox/);
  assert.doesNotMatch(inbox, /Paula|Carlos|Samuel|Fernando|alianzas-soluciones|@/i);
});
check('Ops y Leads conservan una sola entidad proyectada', () => {
  assert.match(domain, /leadsVisible/);
  assert.match(domain, /opsVisible/);
  assert.match(domain, /advisorVisible/);
  assert.match(domain, /transition_business/);
});

const receipts = Array.from({ length: 5 }, (_, index) => ({
  id: `r${index + 1}`,
  polizaNumero: 'POL-001',
  vigenciaInicio: '2026-01-01',
  vigenciaFin: '2026-12-31',
  moneda: 'GTQ',
  cuota: index + 1,
  primaTotal: 100,
  estadoOperativo: 'Pendiente',
  fechaLimite: `2026-0${index + 1}-05`
}));
const commission = inferReconciliation({
  receipts,
  commissionRows: [{
    polizaNumero: 'POL-001', vigenciaInicio: '2026-01-01', vigenciaFin: '2026-12-31',
    moneda: 'GTQ', cuota: 5, primaTotal: 100, comisionAS: 10, estadoConciliacion: 'EXACT', periodo: '2026-05'
  }]
});
check('Planilla reconoce cuota actual', () => {
  assert.equal(commission.counts[OUTCOMES.COMMISSION], 1);
});
check('Planilla infiere cuotas anteriores continuas', () => {
  assert.equal(commission.counts[OUTCOMES.COMMISSION_SEQUENCE], 4);
});
const portfolio = inferReconciliation({
  receipts,
  portfolioRows: [3, 4, 5].map(no => ({
    polizaNumero: 'POL-001', vigenciaInicio: '2026-01-01', vigenciaFin: '2026-12-31',
    moneda: 'GTQ', cuota: no, primaTotal: 100, decision: 'autoridad saldo balance completo', fechaCorteFuente: '2026-08-01'
  }))
});
check('Cartera completa infiere cuotas anteriores a la primera pendiente', () => {
  assert.equal(portfolio.counts[OUTCOMES.PORTFOLIO_SEQUENCE], 2);
  assert.equal(portfolio.counts[OUTCOMES.PENDING], 3);
});
check('Paquete Claude exige candidata acumulativa', () => {
  assert.match(packageDoc, /acumulativ/i);
  assert.match(packageDoc, /empalme selectivo/i);
  assert.match(packageDoc, /no reemplazar/i);
});

const failed = checks.filter(item => !item.ok);
console.log(JSON.stringify({
  schemaVersion: 'orbit360-ops-advisor-cobros-source-validation-v1',
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  results: checks,
  networkCalls: 0,
  firestoreWrites: 0,
  authWrites: 0,
  deployExecuted: false,
  ok: failed.length === 0
}, null, 2));
if (failed.length) process.exit(41);
