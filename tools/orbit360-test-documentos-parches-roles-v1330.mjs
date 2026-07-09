#!/usr/bin/env node
/**
 * Test sintético del validador Documentos/Parches/Roles v1330.
 * No usa datos reales. No escribe en store. No toca backend protegido.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const validator = path.join(ROOT, 'tools/orbit360-validar-documentos-parches-roles-v1330.mjs');
if (!fs.existsSync(validator)) {
  console.error('No existe validador: ' + validator);
  process.exit(1);
}
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-docpatch-'));
const okFile = path.join(dir, 'ok.json');
const badFile = path.join(dir, 'bad.json');

const ok = {
  documentos: [{
    id: 'doc-demo-1', tenantId: 'tenant-demo', clienteId: 'cli-demo', polizaId: 'pol-demo', cobroId: 'cob-demo',
    tipo: 'soporte_pago', nombre: 'soporte.pdf', mimeType: 'application/pdf', tamano: 1234,
    origen: 'Portal del cliente', estado: 'en_revision', metaOnly: true, storageEstado: 'pendiente_storage', visibilidadCliente: true
  }],
  parchesPendientes: [{
    id: 'patch-demo-1', tenantId: 'tenant-demo', documentoId: 'doc-demo-1', clienteId: 'cli-demo', polizaId: 'pol-demo', cobroId: 'cob-demo',
    origen: 'documento_soporte', entidadTipo: 'poliza', entidadId: 'pol-demo', estado: 'pendiente_revision', pais: 'GT', moneda: 'GTQ',
    campos: [{ campo: 'telefono', actual: '', propuesto: '+502 0000 0000', confianza: 0.8, fuente: 'sample', requiereConfirmacion: true }]
  }]
};
const bad = {
  documentos: [{ id: 'doc-bad', tenantId: 'tenant-demo', clienteId: 'cli-demo', tipo: 'soporte_pago', nombre: 'x.pdf', estado: 'en_revision', metaOnly: false, storageEstado: 'pendiente_storage', base64: 'data:application/pdf;base64,AAAA' }],
  parchesPendientes: [{ id: 'patch-bad', tenantId: 'tenant-demo', documentoId: 'doc-bad', entidadTipo: 'cobro', estado: 'aplicado', pais: 'GT', moneda: 'COP', campos: [] }]
};
fs.writeFileSync(okFile, JSON.stringify(ok, null, 2));
fs.writeFileSync(badFile, JSON.stringify(bad, null, 2));

function run(sample) {
  return spawnSync('node', ['tools/orbit360-validar-documentos-parches-roles-v1330.mjs', '--sample', sample], { cwd: ROOT, encoding: 'utf8' });
}
const r1 = run(okFile);
const r2 = run(badFile);
const pass = r1.status === 0 && r2.status !== 0;
console.log(JSON.stringify({ ok: pass, validSampleExit: r1.status, invalidSampleExit: r2.status, invalidStdout: r2.stdout ? JSON.parse(r2.stdout) : null }, null, 2));
process.exit(pass ? 0 : 1);
