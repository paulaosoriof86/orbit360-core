#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const TARGET = path.join(ROOT, 'orbit360-platform/modules/cliente360.js');
const EVIDENCE_DIR = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716');
const OUT = path.join(EVIDENCE_DIR, 'r4s8-cliente360-first-paint-rootfix-apply-v20260817.json');
const sha256 = v => crypto.createHash('sha256').update(v).digest('hex');
const fail = message => { throw new Error(message); };

let src = fs.readFileSync(TARGET, 'utf8');
const beforeSha256 = sha256(src);

function replaceRange(startMarker, endMarker, replacement, label) {
  const startCount = src.split(startMarker).length - 1;
  const endCount = src.split(endMarker).length - 1;
  if (startCount !== 1 || endCount !== 1) fail(`${label}_MARKER_COUNT_INVALID:${startCount}:${endCount}`);
  const start = src.indexOf(startMarker);
  const end = src.indexOf(endMarker, start);
  if (end < start) fail(`${label}_MARKER_ORDER_INVALID`);
  src = src.slice(0, start) + replacement + src.slice(end + endMarker.length);
}

replaceRange(
  '    const batchRunner = Orbit.clientProjection && typeof Orbit.clientProjection.withReadBatch === \'function\' ? Orbit.clientProjection.withReadBatch : null;',
  '    const summaryCacheMs = perfNow() - summaryStartedAt;',
`    const batchRunner = Orbit.clientProjection && typeof Orbit.clientProjection.withReadBatch === 'function' ? Orbit.clientProjection.withReadBatch : null;
    const listBatch = batchRunner ? batchRunner(['clientes', 'polizas', 'cobros'], source => ({
      clientes: source.clientes || [],
      polizas: source.polizas || [],
      cobros: source.cobros || []
    })) : null;
    const clientes = listBatch ? listBatch.clientes : S().all('clientes');
    const policiesForList = listBatch ? listBatch.polizas : S().all('polizas');
    const collectionsForList = listBatch ? listBatch.cobros : S().all('cobros');
    const asesores = S().all('asesores');
    const advisorById = new Map(asesores.filter(a => a && a.id != null).map(a => [a.id, a]));
    const policyByClient = new Map();
    const collectionByClient = new Map();
    const addRelated = (map, clientId, row) => {
      if (clientId == null) return;
      let bucket = map.get(clientId);
      if (!bucket) { bucket = []; map.set(clientId, bucket); }
      bucket.push(row);
    };
    policiesForList.forEach(p => { if (p) addRelated(policyByClient, p.clienteId, p); });
    collectionsForList.forEach(c => { if (c) addRelated(collectionByClient, c.clienteId, c); });
    const summaryCacheMs = perfNow() - summaryStartedAt;`,
  'READ_MODEL'
);

replaceRange(
  '    const resumenDe = c => (summaryIndex && typeof summaryIndex.get === \'function\' && summaryIndex.get(c.id)) || q.clienteResumen(c.id);',
  '    const summaryAggregateMs = perfNow() - summaryAggregateStartedAt;',
`    const resumenDe = c => {
      const pol = policyByClient.get(c.id) || [];
      const cob = collectionByClient.get(c.id) || [];
      const vigentes = pol.filter(esRenovable);
      const primaAnual = vigentes.reduce((s, p) => s + p.prima, 0);
      const pendiente = cob.filter(x => x.estado === 'Pendiente').reduce((s, x) => s + x.monto, 0);
      const vencido = cob.filter(x => x.estado === 'Vencido').reduce((s, x) => s + x.monto, 0);
      let salud = 70;
      salud += Math.min(20, vigentes.length * 6);
      salud -= vencido > 0 ? 25 : 0;
      salud += c && c.segmento === 'Premium' ? 8 : 0;
      salud = Math.max(8, Math.min(100, salud));
      return { moneda: c ? c.moneda : 'GTQ', nPolizas: pol.length, nVigentes: vigentes.length, primaAnual, pendiente, vencido, salud };
    };
    const summaryAggregateStartedAt = perfNow();
    const clientById = new Map(clientes.filter(c => c && c.id != null).map(c => [c.id, c]));
    const totPrima = policiesForList.reduce((s, p) => {
      if (!esRenovable(p)) return s;
      const cli = clientById.get(p.clienteId);
      if (!cli) return s;
      return s + (cli.moneda === 'COP' ? p.prima / 1000 : p.prima);
    }, 0);
    const activePolicyCount = policiesForList.filter(esRenovable).length;
    const totalPolicyCount = policiesForList.length;
    const renewals45Count = policiesForList.filter(p => { const d = U.daysFromNow(p.vigenciaFin); return esRenovable(p) && d != null && d >= 0 && d <= 45; }).length;
    const summaryAggregateMs = perfNow() - summaryAggregateStartedAt;`,
  'SUMMARY_AGGREGATE'
);

const advisorNeedle = '            const ase = q.asesor(c.asesorId);';
if ((src.split(advisorNeedle).length - 1) !== 1) fail('ADVISOR_LOOKUP_COUNT_INVALID');
src = src.replace(advisorNeedle, '            const ase = advisorById.get(c.asesorId) || null;');

const versionNeedle = "version: '20260816.20-bounded-list-batch-read'";
if ((src.split(versionNeedle).length - 1) !== 1) fail('DIAGNOSTIC_VERSION_COUNT_INVALID');
src = src.replace(versionNeedle, "version: '20260817.2-bounded-first-paint'");

const batchNeedle = 'batchRead: !!summaryBatch';
if ((src.split(batchNeedle).length - 1) !== 1) fail('DIAGNOSTIC_BATCH_COUNT_INVALID');
src = src.replace(batchNeedle, 'batchRead: !!listBatch, firstPaintSummaryRows: visibleRows.length, firstPaintCommissionRows: 0, firstPaintPolicyRows: policiesForList.length, firstPaintCollectionRows: collectionsForList.length');

const listStart = src.indexOf('  function lista() {');
const listEnd = src.indexOf('\n  function liveFilter', listStart);
if (listStart < 0 || listEnd < 0) fail('LISTA_REGION_NOT_FOUND');
const listRegion = src.slice(listStart, listEnd);
if (/clientesResumenIndex|summaryIndex|summaryBatch/.test(listRegion)) fail('STALE_FULL_SUMMARY_PATH_REMAINS');
if (/\['clientes', 'polizas', 'cobros', 'comisiones'\]/.test(listRegion)) fail('COMMISSION_BATCH_REMAINS');
if (!/\['clientes', 'polizas', 'cobros'\]/.test(listRegion)) fail('BOUNDED_BATCH_NOT_PRESENT');
if (!/visibleRows\.map/.test(listRegion)) fail('VISIBLE_ROWS_RENDER_NOT_PRESENT');
if (!/LIST_PAGE_SIZE = 40/.test(src)) fail('PAGE_SIZE_40_NOT_PRESERVED');

fs.writeFileSync(TARGET, src, 'utf8');
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
const payload = {
  schemaVersion: 'orbit360-r4s8-cliente360-first-paint-rootfix-apply-v1',
  ok: true,
  status: 'R4S8_CLIENTE360_FIRST_PAINT_ROOTFIX_APPLIED_EPHEMERAL',
  classification: 'FUNCTIONAL_DEFECT_ROOTFIX_CANDIDATE',
  failureFamily: 'CLIENTE360_SYNCHRONOUS_FULL_360_SUMMARY_AND_UNUSED_COMMISSION_CLONE_BEFORE_FIRST_PAINT',
  owner: 'orbit360-platform/modules/cliente360.js',
  supportingQueryTouched: false,
  protectedStoreTouched: false,
  beforeSha256,
  afterSha256: sha256(src),
  pageSize: 40,
  browserExecuted: false,
  runtimeExecuted: false,
  secretAccess: false,
  dataAccess: false,
  firestoreWrites: 0,
  authWrites: 0,
  operationalWrites: 0,
  deployExecuted: false,
  productionTouched: false
};
fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(payload, null, 2));
