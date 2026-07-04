#!/usr/bin/env node
/* Orbit 360 · A&S safe Claude candidate overlay pipeline
   Runs the safe sequence only:
   preflight -> plan -> preview -> diff.

   It never applies overlay changes, never deploys, never merges, never writes Firestore.

   Usage:
     node tools/orbit360-pipeline-empalme-candidato-claude-ays.mjs --candidate C:\path\to\orbit360-platform

   Options passed to preview stage:
     --include-docs
     --include-assets
     --include-manual
*/
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = process.argv.slice(2);
const REPORT_DIR = path.join(root, '_orbit360_reports');
const VERSION = 'v1.0.0-ays-overlay-pipeline';

const stageFiles = {
  preflight: path.join(root, 'tools', 'orbit360-preflight-candidato-claude-ays.mjs'),
  plan: path.join(root, 'tools', 'orbit360-plan-empalme-candidato-claude-ays.mjs'),
  preview: path.join(root, 'tools', 'orbit360-preview-overlay-candidato-claude-ays.mjs'),
  diff: path.join(root, 'tools', 'orbit360-diff-preview-overlay-ays.mjs')
};

function argValue(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
}

function rel(p) {
  return path.relative(root, p).replace(/\\/g, '/');
}

function newestFile(prefix, ext) {
  if (!fs.existsSync(REPORT_DIR)) return null;
  const rows = fs.readdirSync(REPORT_DIR)
    .filter((name) => name.startsWith(prefix) && name.endsWith(ext))
    .map((name) => {
      const abs = path.join(REPORT_DIR, name);
      return { abs, mtime: fs.statSync(abs).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
  return rows[0]?.abs || null;
}

function newestPreviewDir() {
  const base = path.join(root, '_orbit360_overlay_preview');
  if (!fs.existsSync(base)) return null;
  const rows = fs.readdirSync(base)
    .filter((name) => name.startsWith('preview-'))
    .map((name) => {
      const abs = path.join(base, name);
      return fs.statSync(abs).isDirectory() ? { abs, mtime: fs.statSync(abs).mtimeMs } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.mtime - a.mtime);
  return rows[0]?.abs || null;
}

function runStage(name, commandArgs, allowNonZero = false) {
  const started = new Date().toISOString();
  const res = spawnSync(process.execPath, commandArgs, { cwd: root, encoding: 'utf8' });
  const output = `${res.stdout || ''}${res.stderr || ''}`;
  const ok = allowNonZero ? true : res.status === 0;
  return {
    name,
    started,
    finished: new Date().toISOString(),
    exit_code: res.status,
    ok,
    command: ['node', ...commandArgs.map((a) => a.includes(root) ? rel(a) : a)].join(' '),
    output_tail: output.split(/\r?\n/).slice(-80).join('\n')
  };
}

const candidate = argValue('--candidate');
const includeDocs = args.includes('--include-docs');
const includeAssets = args.includes('--include-assets');
const includeManual = args.includes('--include-manual');
const errors = [];
const stages = [];

if (!candidate) errors.push('Falta --candidate <ruta>.');
for (const [name, file] of Object.entries(stageFiles)) {
  if (!fs.existsSync(file)) errors.push(`Falta script etapa ${name}: ${rel(file)}`);
}

fs.mkdirSync(REPORT_DIR, { recursive: true });

if (!errors.length) {
  const preflight = runStage('preflight', [stageFiles.preflight, '--candidate', candidate], true);
  stages.push(preflight);

  const plan = runStage('plan', [stageFiles.plan, '--candidate', candidate], true);
  stages.push(plan);

  const planJson = newestFile('PLAN-EMPALME-CANDIDATO-CLAUDE-AYS-', '.json');
  if (!planJson) {
    errors.push('No se encontró plan JSON después de la etapa plan.');
  } else {
    const previewArgs = [stageFiles.preview, '--plan', planJson, '--candidate', candidate];
    if (includeDocs) previewArgs.push('--include-docs');
    if (includeAssets) previewArgs.push('--include-assets');
    if (includeManual) previewArgs.push('--include-manual');
    const preview = runStage('preview', previewArgs, false);
    stages.push(preview);

    const previewDir = newestPreviewDir();
    if (!previewDir) {
      errors.push('No se encontró carpeta de preview después de la etapa preview.');
    } else {
      const diff = runStage('diff', [stageFiles.diff, '--preview', previewDir], false);
      stages.push(diff);
    }
  }
}

const hardFail = errors.length > 0 || stages.some((s) => !s.ok);
const highReview = stages.some((s) => /REQUIERE_REVISION_ALTA|BLOQUEADO|FAIL/.test(s.output_tail));
const decision = hardFail ? 'PIPELINE_BLOQUEADO' : (highReview ? 'PIPELINE_REQUIERE_REVISION' : 'PIPELINE_OK_CON_REVISION');

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const jsonPath = path.join(REPORT_DIR, `PIPELINE-EMPALME-CANDIDATO-CLAUDE-AYS-${stamp}.json`);
const txtPath = path.join(REPORT_DIR, `PIPELINE-EMPALME-CANDIDATO-CLAUDE-AYS-${stamp}.txt`);

const manifest = {
  version: VERSION,
  created_at: new Date().toISOString(),
  candidate,
  options: { includeDocs, includeAssets, includeManual },
  decision,
  errors,
  stages
};

const txt = [
  '============================================================',
  'ORBIT 360 - PIPELINE EMPALME CANDIDATO CLAUDE A&S',
  `Version: ${VERSION}`,
  `Fecha: ${manifest.created_at}`,
  `Candidato: ${candidate || 'S/D'}`,
  `Decision: ${decision}`,
  'Restricciones: no aplica overlay, no deploy, no merge, no carga LAB.',
  '============================================================',
  '',
  `Errores: ${errors.length}`,
  ...errors.map((e) => `ERROR: ${e}`),
  '',
  'Etapas:',
  ...stages.map((s) => `- ${s.name}: exit=${s.exit_code} ok=${s.ok}`),
  '',
  'Últimas salidas por etapa:',
  ...stages.flatMap((s) => [`--- ${s.name} ---`, s.output_tail || '(sin salida)']),
  '',
  `JSON: ${rel(jsonPath)}`,
  hardFail ? 'RESULTADO: FAIL' : 'RESULTADO: OK_CON_REVISION'
].join('\n');

fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf8');
fs.writeFileSync(txtPath, txt, 'utf8');
console.log(txt);
console.log(`\nReporte TXT: ${rel(txtPath)}`);
process.exit(hardFail ? 1 : 0);
