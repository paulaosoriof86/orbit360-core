#!/usr/bin/env node
/* Orbit 360 A&S — Orquestador de pipeline metadata-only
   Encadena pasos ya documentados. No procesa datos reales ni modifica store/backend.
*/
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = process.argv.slice(2);
const VERSION = 'v1.0.0-ays-orquestador-pipeline-metadata';
const REPORT_DIR = path.join(root, '_orbit360_reports');
const tool = (name) => path.join(root, 'tools', name);
const TOOLS = {
  profile: tool('orbit360-perfilar-columnas-fuente-ays.mjs'),
  envelope: tool('orbit360-construir-dryrun-report-fuente-ays.mjs'),
  candidates: tool('orbit360-adaptar-candidatos-dryrun-metadata-ays.mjs'),
  validate: tool('orbit360-validar-dryrun-report-ays.mjs')
};
function argValue(flag){ const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; }
function rel(p){ return path.relative(root, p).replace(/\\/g, '/'); }
function exists(p){ return fs.existsSync(p); }
function writeJson(file, data){ fs.mkdirSync(path.dirname(file), { recursive:true }); fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8'); }
function jsonFromOutput(out){ const m = String(out || '').match(/JSON: ([^\n]+\.json)/); return m ? m[1].trim() : null; }
function run(name, commandArgs){
  const res = spawnSync(process.execPath, commandArgs, { cwd: root, encoding:'utf8' });
  const output = `${res.stdout || ''}\n${res.stderr || ''}`;
  return { name, ok: res.status === 0, exit_code: res.status, json: jsonFromOutput(output), output_excerpt: output.slice(0, 3000) };
}
const manifestArg = argValue('--manifest');
const candidatesArg = argValue('--candidates');
const errors = [];
if(!manifestArg) errors.push('Falta --manifest.');
if(!candidatesArg) errors.push('Falta --candidates.');
if(manifestArg && !exists(path.resolve(root, manifestArg))) errors.push(`No existe manifest: ${manifestArg}`);
if(candidatesArg && !exists(path.resolve(root, candidatesArg))) errors.push(`No existe candidates: ${candidatesArg}`);
for(const [label, file] of Object.entries(TOOLS)) if(!exists(file)) errors.push(`No existe herramienta ${label}: ${rel(file)}`);

const steps = [];
let finalReport = null;
if(!errors.length){
  const manifest = path.resolve(root, manifestArg);
  const candidates = path.resolve(root, candidatesArg);
  steps.push(run('perfil_columnas', [TOOLS.profile, '--manifest', manifest]));
  if(steps.at(-1).ok && steps.at(-1).json){
    steps.push(run('dryrun_envelope', [TOOLS.envelope, '--manifest', manifest, '--profile', path.resolve(root, steps.at(-1).json)]));
  }
  if(steps.at(-1)?.ok && steps.at(-1).json){
    steps.push(run('candidates_metadata', [TOOLS.candidates, '--dryrun', path.resolve(root, steps.at(-1).json), '--candidates', candidates]));
  }
  if(steps.at(-1)?.ok && steps.at(-1).json){
    finalReport = path.resolve(root, steps.at(-1).json);
    steps.push(run('validar_dryrun', [TOOLS.validate, '--report', finalReport]));
  }
}
const failed = steps.find(s => !s.ok);
const hasWarnings = steps.some(s => /ADVERTENCIA|WARN|CON_ADVERTENCIAS|REQUIERE/.test(s.output_excerpt || ''));
const decision = errors.length || failed ? 'PIPELINE_BLOQUEADO' : (hasWarnings ? 'PIPELINE_LISTO_CON_ADVERTENCIAS' : 'PIPELINE_LISTO');
const report = {
  version: VERSION,
  created_at: new Date().toISOString(),
  decision,
  manifest: manifestArg || null,
  candidates: candidatesArg || null,
  final_dryrun_report: finalReport ? rel(finalReport) : null,
  steps: steps.map(s => ({ name:s.name, ok:s.ok, exit_code:s.exit_code, json:s.json })),
  blocked_step: failed?.name || null,
  errors,
  warnings: hasWarnings ? ['Revisar advertencias de pasos intermedios.'] : [],
  readiness: { can_continue_to_score: decision !== 'PIPELINE_BLOQUEADO' && Boolean(finalReport), can_write: false },
  restrictions: ['metadata-only','no-data-processing','no-writes','no-deploy','no-merge']
};
fs.mkdirSync(REPORT_DIR, { recursive:true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const jsonPath = path.join(REPORT_DIR, `PIPELINE-METADATA-AYS-${stamp}.json`);
const txtPath = path.join(REPORT_DIR, `PIPELINE-METADATA-AYS-${stamp}.txt`);
writeJson(jsonPath, report);
const txt = [
  '============================================================',
  'ORBIT 360 A&S — ORQUESTADOR PIPELINE METADATA-ONLY',
  `Version: ${VERSION}`,
  `Fecha: ${report.created_at}`,
  `Decision: ${decision}`,
  'Restricciones: metadata-only, sin datos reales, sin writes, sin deploy.',
  '============================================================',
  '',
  `Manifest: ${manifestArg || 'S/D'}`,
  `Candidates: ${candidatesArg || 'S/D'}`,
  `Final dryRun: ${report.final_dryrun_report || 'S/D'}`,
  '',
  'Pasos:',
  ...report.steps.map(s => `${s.ok ? 'OK' : 'FAIL'} ${s.name} exit=${s.exit_code} json=${s.json || 'S/D'}`),
  '',
  `Errores: ${errors.length}`,
  ...errors.map(e => `ERROR: ${e}`),
  '',
  `JSON: ${rel(jsonPath)}`,
  decision === 'PIPELINE_BLOQUEADO' ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
].join('\n');
fs.writeFileSync(txtPath, txt, 'utf8');
console.log(txt);
process.exit(decision === 'PIPELINE_BLOQUEADO' ? 1 : 0);
