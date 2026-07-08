#!/usr/bin/env node
/**
 * Tests sintéticos para matriz roles/permisos v1330.
 * No datos reales. No red. No Firestore.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const validator = path.join(ROOT, 'tools/orbit360-validar-matriz-roles-permisos-v1330.mjs');
const basePath = path.join(ROOT, 'orbit360-platform/docs/MATRIZ-ROLES-PERMISOS-V1330.json');
const base = JSON.parse(fs.readFileSync(basePath, 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-matriz-test-'));

const cases = [
  {
    name: 'base-ok',
    expectOk: true,
    mutate: x => x
  },
  {
    name: 'sin-admin-equipo-bloqueado',
    expectOk: false,
    mutate: x => { x.modules.equipo = x.modules.equipo.filter(r => r !== 'AdminTenant'); return x; }
  },
  {
    name: 'cliente-portal-en-finanzas-bloqueado',
    expectOk: false,
    mutate: x => { x.modules.finanzas.push('ClientePortal'); return x; }
  },
  {
    name: 'accion-sensible-sin-motivo-bloqueado',
    expectOk: false,
    mutate: x => { x.sensitiveActions['cobros.aplicar_pago_autorizado'].motivo = false; return x; }
  },
  {
    name: 'sin-guard-conciliacion-bloqueado',
    expectOk: false,
    mutate: x => { x.businessGuards.noValidatedConciliationAsAppliedPayment = false; return x; }
  }
];

let failed = 0;
for (const c of cases) {
  const obj = c.mutate(JSON.parse(JSON.stringify(base)));
  const file = path.join(tmp, `${c.name}.json`);
  fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8');
  const r = spawnSync('node', [validator, file], { cwd: ROOT, encoding: 'utf8' });
  const ok = r.status === 0;
  const pass = ok === c.expectOk;
  console.log(`${pass ? 'OK' : 'FAIL'} ${c.name}: esperado=${c.expectOk} recibido=${ok}`);
  if (!pass) {
    failed++;
    console.log(r.stdout || r.stderr);
  }
}

if (failed) {
  console.error(`\nRESULTADO: FAIL (${failed})`);
  process.exit(1);
}
console.log('\nRESULTADO: OK — matriz roles/permisos');
