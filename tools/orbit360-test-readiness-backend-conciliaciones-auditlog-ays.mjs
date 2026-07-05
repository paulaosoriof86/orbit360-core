#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const tmp = path.join(root, '_orbit360_tmp', 'readiness-backend-conciliaciones');
const outDir = path.join(root, '_orbit360_reports');
const validator = path.join(root, 'tools', 'orbit360-validar-readiness-backend-conciliaciones-auditlog-ays.mjs');
fs.mkdirSync(tmp, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

const valid = {
  tenantId: 'alianzas-soluciones',
  scope: 'conciliaciones_auditLog_lab',
  phase: 'readiness_only',
  can_write_now: false,
  can_deploy_now: false,
  can_merge_now: false,
  can_apply_payments: false,
  can_mutate_collections: false,
  requires_local_runner_ok: true,
  requires_role_review_ok: true,
  requires_paula_authorization: true,
  orbit_store_api: ['all','get','where','insert','update','remove','_emit'],
  allowed_write_collections: ['conciliaciones','auditLog'],
  allowed_states: ['PROPUESTA','EN_REVISION','VALIDADA','RECHAZADA','BLOQUEADA','ANULADA','REQUIERE_VALIDACION'],
  blocked_states: ['APLICADA'],
  tenant_isolation: { path_must_include_tenant: true, allowed_lab_tenant: 'alianzas-soluciones' },
  auditLog: { required: true, fields: ['tenantId','event_id','entity','entity_id','action','actor_id','before','after','source_ref','created_at'] },
  reports_required: ['VALIDACIONES-ACUMULADAS-AYS','REVISION-ROLES-AYS']
};

const cases = [
  ['valido', valid, 0],
  ['bloquea-write-now', { ...valid, can_write_now: true }, 1],
  ['bloquea-pagos', { ...valid, can_apply_payments: true }, 1],
  ['bloquea-cobros', { ...valid, allowed_write_collections: ['conciliaciones','auditLog','cobros'] }, 1],
  ['bloquea-aplicada', { ...valid, allowed_states: [...valid.allowed_states, 'APLICADA'] }, 1],
  ['bloquea-sin-tenant-path', { ...valid, tenant_isolation: { ...valid.tenant_isolation, path_must_include_tenant: false } }, 1],
  ['bloquea-sin-autorizacion', { ...valid, requires_paula_authorization: false }, 1]
];

const results = [];
for (const [name, plan, expected] of cases) {
  const file = path.join(tmp, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(plan, null, 2), 'utf8');
  const r = spawnSync(process.execPath, [validator, '--plan', file, '--tenant', 'alianzas-soluciones'], { cwd: root, encoding: 'utf8' });
  results.push({ name, expected, actual: r.status ?? 1, ok: (r.status ?? 1) === expected });
}
const failed = results.filter(r => !r.ok);
const out = path.join(outDir, 'TEST-READINESS-BACKEND-CONCILIACIONES-AUDITLOG-AYS.txt');
fs.writeFileSync(out, [
  'ORBIT 360 A&S - TEST READINESS BACKEND CONCILIACIONES AUDITLOG',
  `Total: ${results.length}`,
  `Fallidos: ${failed.length}`,
  '',
  ...results.map(r => `${r.ok ? 'OK' : 'FAIL'} ${r.name} expected=${r.expected} actual=${r.actual}`),
  '',
  failed.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
].join('\n'), 'utf8');
console.log(fs.readFileSync(out, 'utf8'));
process.exit(failed.length ? 1 : 0);
