#!/usr/bin/env node
/* Tests sintéticos del validador manifest vs contrato. No datos reales. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const script = path.join(root, 'tools', 'orbit360-validar-manifest-contra-contrato-fuentes-ays.mjs');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-manifest-contract-'));
function write(name, obj){ const p = path.join(dir, name); fs.writeFileSync(p, JSON.stringify(obj,null,2)); return p; }
function run(name, manifest, expectedExit, needles){
  const p = write(`${name}.json`, manifest);
  const r = spawnSync(process.execPath, [script, '--manifest', p], {cwd:root, encoding:'utf8'});
  const out = `${r.stdout || ''}\n${r.stderr || ''}`;
  const ok = r.status === expectedExit && needles.every(n => out.includes(n));
  if(!ok){ console.error(`FAIL ${name}`); console.error(out); process.exit(1); }
  console.log(`OK ${name}`);
}

run('ok-polizas', { source_type:'polizas', destinations:['polizas','cobros'], fields:['cliente','aseguradora','numeroPoliza','estado','pais','moneda','primaNeta'], country:'GT', currency:'GTQ' }, 0, ['VALIDO_CONTRATO']);
run('bloquea-finmovs-a-cobros', { source_type:'financiero_historico', destinations:['finmovs','cobros'], fields:['fecha','monto','moneda','pais','concepto'], country:'CO', currency:'COP' }, 1, ['DESTINO_NO_PERMITIDO','DESTINO_PROHIBIDO']);
run('bloquea-payload', { source_type:'clientes', destinations:['clientes'], fields:['nombre'], rows:[{nombre:'NO_REAL'}] }, 1, ['PAYLOAD_EMBEBIDO']);
run('requiere-validacion-moneda', { source_type:'clientes', destinations:['clientes'], fields:['nombre'], country:'GT' }, 0, ['REQUIERE_VALIDACION','PAIS_MONEDA_INCOMPLETO']);

console.log('OK - validador manifest contra contrato fuentes A&S.');
