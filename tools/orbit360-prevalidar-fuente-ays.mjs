#!/usr/bin/env node
/*
  Orbit 360 A&S — prevalidación unificada de fuente separada.
  Ejecuta solo validaciones estructurales/metadata. No lee filas reales, no escribe store,
  no Firestore, no red, no secretos.

  Uso:
    node tools/orbit360-prevalidar-fuente-ays.mjs --manifest path/to/manifest.local.json
*/
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = process.argv.slice(2);
const REPORT_DIR = path.join(root, '_orbit360_reports');
const VERSION = 'v1.0.0-ays-source-prevalidation';

function argValue(flag){ const i = args.indexOf(flag); return i >= 0 ? args[i+1] : null; }
function rel(p){ return path.relative(root, p).replace(/\\/g, '/'); }
function run(name, cmdArgs, allowNonZero=false){
  const started = new Date().toISOString();
  const res = spawnSync(process.execPath, cmdArgs, {cwd:root, encoding:'utf8'});
  const output = `${res.stdout || ''}${res.stderr || ''}`;
  return {
    name,
    started,
    finished: new Date().toISOString(),
    exit_code: res.status,
    ok: allowNonZero ? true : res.status === 0,
    command: ['node', ...cmdArgs.map(a => a.includes(root) ? rel(a) : a)].join(' '),
    output_tail: output.split(/\r?\n/).slice(-80).join('\n')
  };
}

const manifest = argValue('--manifest') || argValue('-m');
const scripts = {
  contract: path.join(root, 'tools', 'orbit360-generar-contrato-fuentes-ays.mjs'),
  validator: path.join(root, 'tools', 'orbit360-validar-manifest-fuente-ays.mjs'),
  contractValidator: path.join(root, 'tools', 'orbit360-validar-manifest-contra-contrato-fuentes-ays.mjs'),
  dryrun: path.join(root, 'tools', 'orbit360-dryrun-fuente-separada-ays.mjs')
};
const errors = [];
const stages = [];

if(!manifest) errors.push('Falta --manifest <archivo>.');
else if(!fs.existsSync(path.resolve(root, manifest))) errors.push(`No existe manifest: ${manifest}`);
for(const [name, file] of Object.entries(scripts)) if(!fs.existsSync(file)) errors.push(`Falta script ${name}: ${rel(file)}`);

fs.mkdirSync(REPORT_DIR, {recursive:true});

if(!errors.length){
  stages.push(run('contract', [scripts.contract], false));
  if(stages.at(-1).ok) stages.push(run('manifest-validator', [scripts.validator, '--manifest', manifest], false));
  if(stages.at(-1)?.ok) stages.push(run('manifest-contract-validator', [scripts.contractValidator, '--manifest', manifest], false));
  if(stages.at(-1)?.ok) stages.push(run('dryrun-structure', [scripts.dryrun, '--manifest', manifest], false));
  if(stages.some(s => !s.ok)) errors.push('Una etapa de prevalidación bloqueó el flujo.');
}

const hardFail = errors.length > 0 || stages.some(s => !s.ok);
const review = stages.some(s => /REQUIERE_VALIDACION|requiere_validacion|WARN|Advertencias: [1-9]/i.test(s.output_tail));
const decision = hardFail ? 'PREVALIDACION_BLOQUEADA' : review ? 'PREVALIDACION_REQUIERE_REVISION' : 'PREVALIDACION_OK';
const stamp = new Date().toISOString().replace(/[:.]/g,'-');
const jsonPath = path.join(REPORT_DIR, `PREVALIDACION-FUENTE-AYS-${stamp}.json`);
const txtPath = path.join(REPORT_DIR, `PREVALIDACION-FUENTE-AYS-${stamp}.txt`);
const report = { version:VERSION, created_at:new Date().toISOString(), manifest, decision, errors, stages };
fs.writeFileSync(jsonPath, JSON.stringify(report,null,2), 'utf8');
const txt = [
  '============================================================',
  'ORBIT 360 - PREVALIDACION FUENTE A&S',
  `Version: ${VERSION}`,
  `Fecha: ${report.created_at}`,
  `Manifest: ${manifest || 'S/D'}`,
  `Decision: ${decision}`,
  'Restricciones: sin filas reales, sin store, sin Firestore, sin red, sin secretos.',
  '============================================================',
  '',
  `Errores: ${errors.length}`,
  ...errors.map(e => `ERROR: ${e}`),
  '',
  'Etapas:',
  ...stages.map(s => `- ${s.name}: exit=${s.exit_code} ok=${s.ok}`),
  '',
  'Últimas salidas:',
  ...stages.flatMap(s => [`--- ${s.name} ---`, s.output_tail || '(sin salida)']),
  '',
  `JSON: ${rel(jsonPath)}`,
  hardFail ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
].join('\n');
fs.writeFileSync(txtPath, txt, 'utf8');
console.log(txt);
process.exit(hardFail ? 1 : 0);
