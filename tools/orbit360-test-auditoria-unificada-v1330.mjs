#!/usr/bin/env node
/**
 * Tests sintéticos para auditoría unificada v1330.
 * Sin datos reales, sin red, sin Firestore.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const validator = path.join(ROOT, 'tools/orbit360-validar-auditoria-unificada-v1330.mjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-audit-test-'));

const base = {
  id: 'audit_demo_001',
  tenantId: 'tenant-demo',
  fecha: '2026-07-08T12:00:00.000Z',
  actorRol: 'Cobros',
  modulo: 'cobros',
  accion: 'pago_reportado_validado_no_aplicado',
  categoria: 'cobro',
  severidad: 'warning',
  motivo: 'Soporte revisado contra información disponible',
  entidadTipo: 'cobro',
  entidadId: 'cobro-demo-001',
  pais: 'GT',
  moneda: 'GTQ',
  before: { estado: 'reportado' },
  after: { estado: 'validado_no_aplicado' },
  resultado: 'registrado'
};

const cases = [
  {
    name: 'base-ok',
    expectOk: true,
    entry: base
  },
  {
    name: 'critical-sin-confirmacion-bloquea',
    expectOk: false,
    entry: { ...base, accion: 'cobro_anulado', severidad: 'critical', confirmacion: false, motivo: 'Anulación solicitada' }
  },
  {
    name: 'moneda-incoherente-bloquea',
    expectOk: false,
    entry: { ...base, pais: 'CO', moneda: 'GTQ' }
  },
  {
    name: 'secret-prohibido-bloquea',
    expectOk: false,
    entry: { ...base, after: { estado: 'x', token: 'no-debe-existir' } }
  },
  {
    name: 'bloqueado-sin-bloqueos-bloquea',
    expectOk: false,
    entry: { ...base, resultado: 'bloqueado', accion: 'pago_aplicacion_bloqueada' }
  },
  {
    name: 'critical-con-confirmacion-ok',
    expectOk: true,
    entry: { ...base, accion: 'documento_visible_cliente', categoria: 'documento', severidad: 'critical', confirmacion: true, motivo: 'Visibilidad aprobada por administración' }
  }
];

let failed = 0;
for (const c of cases) {
  const file = path.join(tmp, `${c.name}.json`);
  fs.writeFileSync(file, JSON.stringify(c.entry, null, 2), 'utf8');
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
console.log('\nRESULTADO: OK — auditoría unificada');
