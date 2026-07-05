#!/usr/bin/env node
/* Orbit 360 A&S — pruebas sintéticas constructor dryRunReport
   No datos reales, no writes, no deploy.
*/
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const tool = path.join(root, 'tools', 'orbit360-construir-dryrun-report-fuente-ays.mjs');
const tmp = path.join(root, '_orbit360_tmp', 'constructor-dryrun-fuente');
const reports = path.join(root, '_orbit360_reports');
const failures = [];
const results = [];
function writeJson(file, data){ fs.mkdirSync(path.dirname(file), { recursive:true }); fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8'); }
function manifest(source_type, over={}){ return { tenant_id:'alianzas-soluciones', manifest_id:`manifest_${source_type}`, source_type, file:'sintetico.xlsx', file_hash:'sha256:synthetic', country:'GT', currency:'GTQ', period:'2026-06', estimated_rows:3, ...over }; }
function profile(source_type, target, over={}){ return { decision:'PERFIL_LISTO', source_type, target, columns:['Fecha','Monto','Moneda','País'], required:{ fecha:{status:'exacto',column:'Fecha'}, monto:{status:'exacto',column:'Monto'}, moneda:{status:'exacto',column:'Moneda'}, pais:{status:'exacto',column:'País'} }, optional:{}, missing_required:[], probable_required:[], unknown_columns:[], errors:[], warnings:[], ...over }; }
function run(id, m, p, expectedExit, needles){
  const mFile = path.join(tmp, `${id}.manifest.local.json`);
  const pFile = path.join(tmp, `${id}.profile.local.json`);
  writeJson(mFile, m); writeJson(pFile, p);
  const res = spawnSync(process.execPath, [tool, '--manifest', mFile, '--profile', pFile], { cwd:root, encoding:'utf8' });
  const out = `${res.stdout || ''}\n${res.stderr || ''}`;
  const ok = res.status === expectedExit && needles.every(n => out.includes(n));
  results.push(`${ok ? 'OK' : 'FAIL'} ${id} exit=${res.status} expected=${expectedExit}`);
  if(!ok) failures.push(`CASE ${id}\nNEEDLES ${needles.join(' | ')}\n${out}`);
}
if(!fs.existsSync(tool)){ console.error('No existe constructor.'); process.exit(1); }

run('clientes-ready', manifest('clientes'), profile('clientes','clientes'), 0, ['Decision: DRYRUN_READY','RESULTADO: OK']);
run('banco-readiness', manifest('estado_cuenta_bancario'), profile('estado_cuenta_bancario','conciliaciones'), 0, ['Decision: DRYRUN_READY_CON_ADVERTENCIAS','Falta metadata por fila']);
run('destino-malo', manifest('estado_cuenta_bancario'), profile('estado_cuenta_bancario','cobros'), 1, ['Decision: DRYRUN_BLOQUEADO','Destino inconsistente']);
run('moneda-mala', manifest('clientes',{currency:'COP'}), profile('clientes','clientes'), 1, ['Decision: DRYRUN_BLOQUEADO','País/moneda incoherente']);
run('perfil-bloqueado', manifest('polizas'), profile('polizas','polizas',{decision:'PERFIL_BLOQUEADO', errors:['Falta prima_neta'], missing_required:['prima_neta']}), 1, ['Decision: DRYRUN_BLOQUEADO','Perfil de columnas bloqueado']);
run('perfil-advertencias', manifest('clientes'), profile('clientes','clientes',{decision:'PERFIL_LISTO_CON_ADVERTENCIAS', warnings:['Campo probable'], probable_required:[{field:'identificacion',column:'NIT'}]}), 0, ['Decision: DRYRUN_READY_CON_ADVERTENCIAS']);

const output = ['============================================================','ORBIT 360 A&S — TEST CONSTRUIR DRYRUN REPORT',`Fecha: ${new Date().toISOString()}`,'Restricciones: sintético, sin datos reales, sin writes, sin deploy.','============================================================','',`Casos: ${results.length}`,`FAIL: ${failures.length}`,'',...results,'',...failures,'',failures.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'].join('\n');
fs.mkdirSync(reports, { recursive:true });
fs.writeFileSync(path.join(reports, 'TEST-CONSTRUIR-DRYRUN-REPORT-FUENTE-AYS.txt'), output, 'utf8');
console.log(output);
process.exit(failures.length ? 1 : 0);
