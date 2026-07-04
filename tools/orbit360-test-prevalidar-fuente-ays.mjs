#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const script = path.join(root, 'tools', 'orbit360-prevalidar-fuente-ays.mjs');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-prevalidar-'));
const failures = [];
const results = [];
function write(name, obj){ const p = path.join(dir, name); fs.writeFileSync(p, JSON.stringify(obj,null,2)); return p; }
function run(id, manifest, expectedExit, needles){
  const p = write(`${id}.json`, manifest);
  const r = spawnSync(process.execPath, [script, '--manifest', p], {cwd:root, encoding:'utf8'});
  const out = `${r.stdout || ''}\n${r.stderr || ''}`;
  const ok = r.status === expectedExit && needles.every(n => out.includes(n));
  results.push(`${ok ? 'OK' : 'FAIL'} ${id}`);
  if(!ok) failures.push(`CASE ${id}\n${out}`);
}
const base = { tenant_id:'t', files:[{name:'f.xlsx'}], country:'GT', currency:'GTQ', declared_country:'GT', declared_currency:'GTQ', write_enabled:false, confidence:0.95 };
run('ok-banco', { ...base, source_type:'estado_cuenta_bancario', schema:{fields:['fecha','descripcion','monto','moneda','pais']}, columns:['fecha','descripcion','monto','moneda','pais','banco','cuenta'], sheets:[{name:'Banco', country:'GT', currency:'GTQ', columns:['fecha','descripcion','monto','moneda','pais','banco','cuenta']}], destinations:['conciliacionBanco'] }, 0, ['PREVALIDACION_OK','dryrun-structure']);
run('bloquea-destino', { ...base, source_type:'estado_cuenta_bancario', schema:{fields:['fecha','descripcion','monto','moneda','pais']}, columns:['fecha','descripcion','monto','moneda','pais','banco','cuenta'], sheets:[{name:'Banco', country:'GT', currency:'GTQ', columns:['fecha','descripcion','monto','moneda','pais','banco','cuenta']}], destinations:['finmovs'] }, 1, ['PREVALIDACION_BLOQUEADA']);
run('bloquea-payload', { ...base, source_type:'clientes', schema:{fields:['nombre']}, columns:['nombre'], sheets:[{name:'Clientes', country:'GT', currency:'GTQ', columns:['nombre']}], destinations:['clientes'], rows:[{x:'x'}] }, 1, ['PREVALIDACION_BLOQUEADA']);
const output = ['ORBIT 360 - TEST PREVALIDAR FUENTE A&S', `Casos: ${results.length}`, `FAIL: ${failures.length}`, ...results, ...failures, failures.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'].join('\n');
fs.mkdirSync(path.join(root,'_orbit360_reports'), {recursive:true});
fs.writeFileSync(path.join(root,'_orbit360_reports','TEST-PREVALIDAR-FUENTE-AYS.txt'), output, 'utf8');
console.log(output);
process.exit(failures.length ? 1 : 0);
