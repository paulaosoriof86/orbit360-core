#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn, spawnSync } from 'node:child_process';

const BRANCH = 'ays/backend-tenant-lab-v99-20260703';
const BASELINE = '3f1bbcc675a20af059204741b0f273a57b390078';
const argv = process.argv.slice(2);
const arg = (name, fallback = '') => {
  const index = argv.indexOf(name);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const requestedRepo = arg('--repo', '');
const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
const lines = [];
let reportPath = '';
let tempRoot = '';
let tempRepo = '';
let finalResult = 'BLOCKED';

function log(value = '') {
  const text = String(value);
  lines.push(text);
  console.log(text);
  if (reportPath) fs.writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 32 * 1024 * 1024
  });
  if (result.stdout && options.capture !== false) log(result.stdout.trimEnd());
  if (result.stderr && options.capture !== false) log(result.stderr.trimEnd());
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${options.label || command} fallo. Exit code: ${result.status}.`);
  return result.stdout || '';
}

function git(repo, args, options = {}) {
  return run('git.exe', ['-C', repo, ...args], { cwd: repo, ...options });
}

function findRepo(requested) {
  const home = os.homedir();
  const candidates = [
    requested,
    process.cwd(),
    path.join(home, 'OneDrive', 'Documentos', 'GitHub', 'orbit360-core'),
    path.join(home, 'Documents', 'GitHub', 'orbit360-core'),
    path.join(home, 'OneDrive', 'Documents', 'GitHub', 'orbit360-core'),
    'C:\\orbit360-core'
  ].filter(Boolean);
  const seen = new Set();
  for (const candidate of candidates) {
    const full = path.resolve(candidate);
    if (seen.has(full)) continue;
    seen.add(full);
    if (!fs.existsSync(path.join(full, '.git'))) continue;
    const result = spawnSync('git.exe', ['-C', full, 'remote', 'get-url', 'origin'], { encoding:'utf8', windowsHide:true });
    const origin = String(result.stdout || '').trim();
    if (result.status === 0 && /paulaosoriof86[\\/:]orbit360-core/iu.test(origin)) return full;
  }
  return '';
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\r?\n/u).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); }
    catch { throw new Error(`JSONL invalido en ${file}, linea ${index + 1}.`); }
  });
}

function newestDirectories(root, prefix) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes:true })
    .filter(entry => entry.isDirectory() && entry.name.startsWith(prefix))
    .map(entry => {
      const full = path.join(root, entry.name);
      return { full, mtime:fs.statSync(full).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

function screenshotExists(directory, scenario) {
  return fs.existsSync(path.join(directory, `${scenario}.png`));
}

function rowsByScenario(rows) {
  return new Map(rows.filter(row => row && row.scenario).map(row => [String(row.scenario), row]));
}

function findEvidence(root, prefix, expected, predicate) {
  for (const candidate of newestDirectories(root, prefix)) {
    const rows = readJsonl(path.join(candidate.full, 'results.jsonl'));
    const byScenario = rowsByScenario(rows);
    const ok = expected.every(id => byScenario.has(id) && predicate(byScenario.get(id), id) && screenshotExists(candidate.full, id));
    if (ok) return { directory:candidate.full, rows, byScenario };
  }
  return null;
}

function copyEvidenceFiles(source, destination, scenarios) {
  fs.mkdirSync(destination, { recursive:true });
  for (const scenario of scenarios) {
    const screenshot = path.join(source, `${scenario}.png`);
    if (!fs.existsSync(screenshot)) throw new Error(`Captura faltante: ${screenshot}`);
    fs.copyFileSync(screenshot, path.join(destination, `${scenario}.png`));
  }
}

function copyMinimalDirectory(source, destinationRoot) {
  if (!source || !fs.existsSync(source)) return '';
  const destination = path.join(destinationRoot, path.basename(source));
  fs.mkdirSync(destination, { recursive:true });
  for (const name of fs.readdirSync(source)) {
    const full = path.join(source, name);
    if (!fs.statSync(full).isFile()) continue;
    if (name === 'results.jsonl' || name.endsWith('.png') || name.endsWith('.txt')) fs.copyFileSync(full, path.join(destination, name));
  }
  return destination;
}

function findFreePort(start = 5000, end = 5040) {
  return new Promise((resolve, reject) => {
    let current = start;
    const tryNext = () => {
      if (current > end) return reject(new Error(`No hay puerto libre entre ${start} y ${end}.`));
      const server = net.createServer();
      server.unref();
      server.once('error', () => { current += 1; tryNext(); });
      server.listen(current, '127.0.0.1', () => {
        const selected = current;
        server.close(() => resolve(selected));
      });
    };
    tryNext();
  });
}

function clipboardAndNotepad(file) {
  try {
    const text = fs.readFileSync(file, 'utf8');
    spawnSync('clip.exe', [], { input:text, encoding:'utf8', windowsHide:true });
    const child = spawn('notepad.exe', [file], { detached:true, stdio:'ignore', windowsHide:false });
    child.unref();
  } catch {}
}

const repo = findRepo(requestedRepo);
if (!repo) {
  console.log('BLOQUEADO: no se encontro orbit360-core. No se modifico nada.');
  process.exit(0);
}

const reportsRoot = path.join(repo, '_orbit360_reports');
fs.mkdirSync(reportsRoot, { recursive:true });
reportPath = path.join(reportsRoot, `RUN-OP2-CIERRE-DOS-VISTAS-${stamp}.txt`);
tempRoot = path.join(os.tmpdir(), `orbit360-op2-two-${stamp}`);
tempRepo = path.join(tempRoot, 'orbit360-core');

log('============================================================');
log('ORBIT 360 - CIERRE OP2 SOLO DOS VISTAS V1.222');
log(`Fecha local: ${new Date().toLocaleString('sv-SE')}`);
log(`Repo preservado: ${repo}`);
log('Reutiliza CRM 10/10, OP2 12/15 y Asesor movil aprobado.');
log('Ejecuta solo Direccion desktop y Operativo tablet.');
log('No pull, switch, reset ni clean en el repo original. No deploy. No datos reales.');
log('============================================================');

try {
  const branch = git(repo, ['branch', '--show-current'], { capture:false }).trim();
  const localHead = git(repo, ['rev-parse', 'HEAD'], { capture:false }).trim();
  const localChanges = git(repo, ['status', '--short'], { capture:false }).split(/\r?\n/u).filter(Boolean);
  const origin = git(repo, ['remote', 'get-url', 'origin'], { capture:false }).trim();
  log('');
  log('== REPO ORIGINAL PRESERVADO ==');
  log(`branch=${branch}`);
  log(`head=${localHead}`);
  log(`local_changes_count=${localChanges.length}`);
  if (branch !== BRANCH) throw new Error(`Rama incorrecta: ${branch}. Requerida: ${BRANCH}.`);

  log('');
  log('== ACTUALIZAR SOLO REFERENCIA REMOTA ==');
  git(repo, ['fetch', '--quiet', 'origin', BRANCH], { label:'git fetch' });
  const remoteHead = git(repo, ['rev-parse', `origin/${BRANCH}`], { capture:false }).trim();
  log(`remote_head=${remoteHead}`);

  const changed = git(repo, ['diff', '--name-only', `${BASELINE}..${remoteHead}`], { capture:false }).split(/\r?\n/u).filter(Boolean);
  const applicationChanges = changed.filter(file =>
    (file.startsWith('orbit360-platform/') && !file.startsWith('orbit360-platform/docs/')) ||
    ['firestore.rules', 'firebase.json', '.firebaserc'].includes(file)
  );
  log(`pipeline_files_since_baseline=${changed.filter(file => !file.startsWith('orbit360-platform/docs/')).join(',')}`);
  if (applicationChanges.length) throw new Error(`Cambios de aplicacion/backend desde el baseline validado: ${applicationChanges.join(', ')}`);
  log('application_and_backend_unchanged_since_validated_baseline=YES');

  log('');
  log('== EVIDENCIA PREVIA REUTILIZADA ==');
  const crmExpected = [
    'dir-clientes-desktop','dir-cliente-desktop','dir-calidad-desktop','dir-poliza-desktop',
    'op-cliente-tablet','op-calidad-tablet','ase-cliente-mobile','ase-calidad-mobile',
    'ase-poliza-mobile','dir-portal-mobile'
  ];
  const approved12 = [
    'dir-directorio-desktop','dir-resumen-desktop','dir-contactos-desktop','dir-bancos-desktop',
    'dir-documentos-desktop','dir-tarifas-desktop','op-directorio-tablet','op-resumen-tablet',
    'op-bancos-tablet','ase-directorio-mobile','ase-resumen-mobile','ase-bancos-mobile'
  ];
  const advisorScenario = 'ase-plataformas-mobile';
  const crm = findEvidence(reportsRoot, 'VISUAL-CRM-OP1-', crmExpected, row => row.ok === true);
  const op2 = findEvidence(reportsRoot, 'VISUAL-ASEGURADORAS-OP2-', approved12, row => row.ok === true);
  const advisor = findEvidence(reportsRoot, 'VISUAL-OP2-PLATAFORMAS-', [advisorScenario], row => row.ok === true);
  if (!crm) throw new Error('No se encontro evidencia CRM 10/10 completa. No se repetira CRM.');
  if (!op2) throw new Error('No se encontro evidencia OP2 12/15 completa.');
  if (!advisor) throw new Error('No se encontro evidencia fisica del Asesor movil aprobado.');
  log(`crm_10_of_10=${crm.directory}`);
  log(`op2_12_of_15=${op2.directory}`);
  log(`advisor_mobile_reused=${advisor.directory}`);

  log('');
  log('== CLON AISLADO ==');
  fs.mkdirSync(tempRoot, { recursive:true });
  run('git.exe', ['clone', '--shared', '--no-checkout', repo, tempRepo], { cwd:repo, label:'clon aislado' });
  git(tempRepo, ['remote', 'set-url', 'origin', origin], { label:'restaurar origin' });
  git(tempRepo, ['fetch', '--quiet', 'origin', BRANCH], { label:'fetch aislado' });
  git(tempRepo, ['checkout', '-B', BRANCH, `origin/${BRANCH}`], { label:'checkout aislado' });
  const tempHead = git(tempRepo, ['rev-parse', 'HEAD'], { capture:false }).trim();
  if (tempHead !== remoteHead) throw new Error('El clon aislado no quedo en el HEAD remoto.');
  log(`isolated_head=${tempHead}`);

  log('');
  log('== INTEGRACION IDEMPOTENTE EN CLON ==');
  const integration = path.join(tempRepo, 'tools', 'orbit360-aplicar-cachebust-cotizador-comparativo-v1215.ps1');
  if (!fs.existsSync(integration)) throw new Error('No se encontro el integrador seguro.');
  run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', integration, '-Repo', tempRepo], { cwd:tempRepo, label:'integracion idempotente' });

  log('');
  log('== VALIDAR SOLO EL NUEVO HARNESS ==');
  const validator = path.join(tempRepo, 'tools', 'orbit360-validar-smoke-op2-plataformas-two-view-v1222.mjs');
  const smoke = path.join(tempRepo, 'tools', 'orbit360-smoke-op2-plataformas-two-view-v1222.mjs');
  if (!fs.existsSync(validator) || !fs.existsSync(smoke)) throw new Error('Faltan archivos del smoke delta v1.222.');
  run(process.execPath, [validator, tempRepo], { cwd:tempRepo, label:'validador smoke v1.222' });

  log('');
  log('== EJECUTAR SOLO DOS VISTAS ==');
  const port = await findFreePort();
  log(`selected_url=http://127.0.0.1:${port}`);
  run(process.execPath, [smoke, '--repo', tempRepo, '--app', path.join(tempRepo, 'orbit360-platform'), '--port', String(port)], { cwd:tempRepo, label:'smoke dos vistas' });

  const tempReports = path.join(tempRepo, '_orbit360_reports');
  const twoExpected = ['dir-plataformas-desktop','op-plataformas-tablet'];
  const two = findEvidence(tempReports, 'VISUAL-OP2-PLATAFORMAS-TWO-VIEWS-V1222-', twoExpected, row => row.ok === true);
  if (!two) throw new Error('El smoke termino sin evidencia 2/2 valida.');

  log('');
  log('== CONSTRUIR EVIDENCIA COMBINADA 15/15 ==');
  const closureDir = path.join(reportsRoot, `VISUAL-ASEGURADORAS-OP2-CLOSED-V1222-${stamp}`);
  fs.mkdirSync(closureDir, { recursive:true });
  const finalRows = [];
  for (const id of approved12) finalRows.push(op2.byScenario.get(id));
  finalRows.push(advisor.byScenario.get(advisorScenario));
  for (const id of twoExpected) finalRows.push(two.byScenario.get(id));
  const finalMap = rowsByScenario(finalRows);
  const finalExpected = [...approved12, advisorScenario, ...twoExpected];
  if (finalMap.size !== 15 || !finalExpected.every(id => finalMap.get(id)?.ok === true)) throw new Error('La combinacion final no contiene exactamente 15 escenarios aprobados.');
  fs.writeFileSync(path.join(closureDir, 'results.jsonl'), `${finalExpected.map(id => JSON.stringify(finalMap.get(id))).join('\n')}\n`, 'utf8');
  copyEvidenceFiles(op2.directory, closureDir, approved12);
  copyEvidenceFiles(advisor.directory, closureDir, [advisorScenario]);
  copyEvidenceFiles(two.directory, closureDir, twoExpected);
  if (!finalExpected.every(id => screenshotExists(closureDir, id))) throw new Error('La evidencia combinada no contiene las 15 capturas.');

  const copiedTwo = copyMinimalDirectory(two.directory, reportsRoot);
  const reportCandidates = fs.readdirSync(tempReports).filter(name => name.startsWith('VISUAL-OP2-PLATAFORMAS-TWO-VIEWS-V1222-') && name.endsWith('.txt'));
  for (const name of reportCandidates) fs.copyFileSync(path.join(tempReports, name), path.join(reportsRoot, name));

  log(`two_view_evidence=${copiedTwo}`);
  log(`combined_evidence=${closureDir}`);
  log('combined_scenarios=15');
  log('crm=10/10_reused');
  log('aseguradoras=12/15_reused_plus_advisor_reused_plus_2/2_new_equals_15/15');
  log('status=ASEGURADORAS_OP2_VISUAL_GATE_CLOSED');
  log('next_action=Dry-run Guatemala y Colombia separados; luego backend/Auth/Hosting productivo.');
  finalResult = 'PASSED';
} catch (error) {
  log('');
  log('== RESULTADO ==');
  log('status=BLOCKED_AT_FIRST_REAL_FAILURE');
  log(`error=${String(error?.message || error).replace(/[\r\n]+/gu, ' ')}`);
  log('previous_approved_evidence_preserved=YES');
  log('source_repo_local_changes_preserved=YES');
  try {
    const tempReports = path.join(tempRepo, '_orbit360_reports');
    for (const candidate of newestDirectories(tempReports, 'VISUAL-OP2-PLATAFORMAS-TWO-VIEWS-V1222-')) copyMinimalDirectory(candidate.full, reportsRoot);
    if (fs.existsSync(tempReports)) {
      for (const name of fs.readdirSync(tempReports)) {
        if (name.startsWith('VISUAL-OP2-PLATAFORMAS-TWO-VIEWS-V1222-') && name.endsWith('.txt')) fs.copyFileSync(path.join(tempReports, name), path.join(reportsRoot, name));
      }
    }
  } catch {}
} finally {
  log('');
  log('== LIMPIEZA ==');
  if (tempRoot && fs.existsSync(tempRoot)) {
    try {
      fs.rmSync(tempRoot, { recursive:true, force:true, maxRetries:8, retryDelay:250 });
      log('temporary_workspace_removed=YES');
    } catch {
      log(`temporary_workspace_removed=NO | path=${tempRoot}`);
    }
  } else {
    log('temporary_workspace_removed=NOT_REQUIRED');
  }
  log('source_repo_pull=NO');
  log('source_repo_switch=NO');
  log('source_repo_reset=NO');
  log('source_repo_clean=NO');
  log('deploy=NO');
  log('real_data_writes=NO');
  log(`final_result=${finalResult}`);
  log(`report=${reportPath}`);
  clipboardAndNotepad(reportPath);
}

process.exit(0);
