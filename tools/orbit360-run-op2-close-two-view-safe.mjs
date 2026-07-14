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
const value = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] || '' : ''; };
const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
const output = [];
let report = '';
let tempRoot = '';
let result = 'BLOCKED';

function add(text = '') {
  output.push(String(text));
  console.log(text);
  if (report) fs.writeFileSync(report, `${output.join('\n')}\n`, 'utf8');
}

function exec(file, args, cwd, label, silent = false) {
  const p = spawnSync(file, args, { cwd, encoding:'utf8', windowsHide:true, maxBuffer:32 * 1024 * 1024 });
  if (!silent && p.stdout) add(p.stdout.trimEnd());
  if (!silent && p.stderr) add(p.stderr.trimEnd());
  if (p.error) throw p.error;
  if (p.status !== 0) throw new Error(`${label} fallo. Exit code: ${p.status}.`);
  return String(p.stdout || '').trim();
}

function git(repo, args, label = 'git', silent = true) {
  return exec('git.exe', ['-C', repo, ...args], repo, label, silent);
}

function locateRepo(requested) {
  const h = os.homedir();
  const candidates = [requested, process.cwd(), path.join(h,'OneDrive','Documentos','GitHub','orbit360-core'), path.join(h,'Documents','GitHub','orbit360-core'), path.join(h,'OneDrive','Documents','GitHub','orbit360-core'), 'C:\\orbit360-core'].filter(Boolean);
  for (const repo of [...new Set(candidates.map(x => path.resolve(x)))]) {
    if (!fs.existsSync(path.join(repo, '.git'))) continue;
    const p = spawnSync('git.exe', ['-C', repo, 'remote', 'get-url', 'origin'], { encoding:'utf8', windowsHide:true });
    if (p.status === 0 && /paulaosoriof86[\\/:]orbit360-core/iu.test(String(p.stdout || ''))) return repo;
  }
  return '';
}

function jsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\r?\n/u).filter(Boolean).map((line, i) => {
    try { return JSON.parse(line); }
    catch { throw new Error(`JSONL invalido: ${file}, linea ${i + 1}.`); }
  });
}

function dirs(root, prefix) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes:true })
    .filter(x => x.isDirectory() && x.name.startsWith(prefix))
    .map(x => path.join(root, x.name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
}

function evidence(root, prefix, ids) {
  for (const dir of dirs(root, prefix)) {
    const rows = jsonl(path.join(dir, 'results.jsonl'));
    const map = new Map(rows.filter(x => x?.scenario).map(x => [String(x.scenario), x]));
    if (ids.every(id => map.get(id)?.ok === true && fs.existsSync(path.join(dir, `${id}.png`)))) return { dir, map };
  }
  return null;
}

function copyFiles(source, target, ids) {
  fs.mkdirSync(target, { recursive:true });
  for (const id of ids) fs.copyFileSync(path.join(source, `${id}.png`), path.join(target, `${id}.png`));
}

function copyDelta(source, targetRoot) {
  const target = path.join(targetRoot, path.basename(source));
  fs.mkdirSync(target, { recursive:true });
  for (const name of fs.readdirSync(source)) {
    const file = path.join(source, name);
    if (fs.statSync(file).isFile() && (name === 'results.jsonl' || /\.(png|txt)$/iu.test(name))) fs.copyFileSync(file, path.join(target, name));
  }
  return target;
}

function freePort(start = 5000) {
  return new Promise((resolve, reject) => {
    const probe = port => {
      if (port > 5040) return reject(new Error('No hay puerto loopback libre entre 5000 y 5040.'));
      const s = net.createServer();
      s.unref();
      s.once('error', () => probe(port + 1));
      s.listen(port, '127.0.0.1', () => s.close(() => resolve(port)));
    };
    probe(start);
  });
}

function finish(file) {
  try {
    const text = fs.readFileSync(file, 'utf8');
    spawnSync('clip.exe', [], { input:text, encoding:'utf8', windowsHide:true });
    const p = spawn('notepad.exe', [file], { detached:true, stdio:'ignore' });
    p.unref();
  } catch {}
}

const repo = locateRepo(value('--repo'));
if (!repo) {
  console.log('BLOQUEADO: no se encontro orbit360-core. No se modifico nada.');
  process.exit(0);
}
const reports = path.join(repo, '_orbit360_reports');
fs.mkdirSync(reports, { recursive:true });
report = path.join(reports, `RUN-OP2-CIERRE-DOS-VISTAS-${stamp}.txt`);
tempRoot = path.join(os.tmpdir(), `orbit360-op2-two-${stamp}`);
const tempRepo = path.join(tempRoot, 'orbit360-core');

add('============================================================');
add('ORBIT 360 - CIERRE OP2 SOLO DOS VISTAS V1.222');
add(`Repo preservado: ${repo}`);
add('Reutiliza CRM 10/10, OP2 12/15 y Asesor movil aprobado.');
add('Ejecuta solo Direccion desktop y Operativo tablet.');
add('No pull, switch, reset ni clean en el repo original. No deploy. No datos reales.');
add('============================================================');

try {
  const branch = git(repo, ['branch','--show-current']);
  const head = git(repo, ['rev-parse','HEAD']);
  const localChanges = git(repo, ['status','--short']).split(/\r?\n/u).filter(Boolean);
  const origin = git(repo, ['remote','get-url','origin']);
  add(''); add('== REPO ORIGINAL PRESERVADO ==');
  add(`branch=${branch}`); add(`head=${head}`); add(`local_changes_count=${localChanges.length}`);
  if (branch !== BRANCH) throw new Error(`Rama incorrecta: ${branch}.`);

  add(''); add('== REFERENCIA REMOTA ==');
  git(repo, ['fetch','--quiet','origin',BRANCH], 'git fetch', false);
  const remote = git(repo, ['rev-parse',`origin/${BRANCH}`]);
  add(`remote_head=${remote}`);
  const changed = git(repo, ['diff','--name-only',`${BASELINE}..${remote}`]).split(/\r?\n/u).filter(Boolean);
  const appChanges = changed.filter(x => (x.startsWith('orbit360-platform/') && !x.startsWith('orbit360-platform/docs/')) || ['firebase.json','firestore.rules','.firebaserc'].includes(x));
  if (appChanges.length) throw new Error(`Cambio de aplicacion/backend desde baseline: ${appChanges.join(', ')}`);
  add('application_and_backend_unchanged_since_validated_baseline=YES');

  const crmIds = ['dir-clientes-desktop','dir-cliente-desktop','dir-calidad-desktop','dir-poliza-desktop','op-cliente-tablet','op-calidad-tablet','ase-cliente-mobile','ase-calidad-mobile','ase-poliza-mobile','dir-portal-mobile'];
  const approved12 = ['dir-directorio-desktop','dir-resumen-desktop','dir-contactos-desktop','dir-bancos-desktop','dir-documentos-desktop','dir-tarifas-desktop','op-directorio-tablet','op-resumen-tablet','op-bancos-tablet','ase-directorio-mobile','ase-resumen-mobile','ase-bancos-mobile'];
  const advisorId = 'ase-plataformas-mobile';
  const crm = evidence(reports, 'VISUAL-CRM-OP1-', crmIds);
  const op2 = evidence(reports, 'VISUAL-ASEGURADORAS-OP2-', approved12);
  const advisor = evidence(reports, 'VISUAL-OP2-PLATAFORMAS-', [advisorId]);
  if (!crm) throw new Error('Falta evidencia CRM 10/10; no se repetira CRM.');
  if (!op2) throw new Error('Falta evidencia OP2 12/15.');
  if (!advisor) throw new Error('Falta evidencia fisica del Asesor movil aprobado.');
  add(''); add('== EVIDENCIA REUTILIZADA ==');
  add(`crm_10_of_10=${crm.dir}`); add(`op2_12_of_15=${op2.dir}`); add(`advisor_mobile=${advisor.dir}`);

  add(''); add('== CLON AISLADO ==');
  fs.mkdirSync(tempRoot, { recursive:true });
  exec('git.exe', ['clone','--shared','--no-checkout',repo,tempRepo], repo, 'clon aislado');
  git(tempRepo, ['remote','set-url','origin',origin], 'restaurar origin', false);
  git(tempRepo, ['fetch','--quiet','origin',BRANCH], 'fetch aislado', false);
  git(tempRepo, ['checkout','-B',BRANCH,`origin/${BRANCH}`], 'checkout aislado', false);
  if (git(tempRepo, ['rev-parse','HEAD']) !== remote) throw new Error('HEAD aislado incorrecto.');
  if (git(tempRepo, ['branch','--show-current']) !== BRANCH) throw new Error('El clon aislado no quedo sobre la rama obligatoria.');
  add(`isolated_branch=${BRANCH}`);
  add(`isolated_head=${remote}`);

  add(''); add('== INTEGRACION IDEMPOTENTE EN CLON ==');
  const integration = path.join(tempRepo,'tools','orbit360-aplicar-cachebust-cotizador-comparativo-v1215.ps1');
  exec('powershell.exe', ['-NoProfile','-ExecutionPolicy','Bypass','-File',integration,'-Repo',tempRepo], tempRepo, 'integracion idempotente');

  add(''); add('== VALIDAR Y EJECUTAR SOLO DOS VISTAS ==');
  const validator = path.join(tempRepo,'tools','orbit360-validar-smoke-op2-plataformas-two-view-v1222.mjs');
  const smoke = path.join(tempRepo,'tools','orbit360-smoke-op2-plataformas-two-view-v1222.mjs');
  exec(process.execPath, [validator,tempRepo], tempRepo, 'validador v1.222');
  const port = await freePort();
  add(`selected_url=http://127.0.0.1:${port}`);
  exec(process.execPath, [smoke,'--repo',tempRepo,'--app',path.join(tempRepo,'orbit360-platform'),'--port',String(port)], tempRepo, 'smoke 2/2');

  const tempReports = path.join(tempRepo,'_orbit360_reports');
  const twoIds = ['dir-plataformas-desktop','op-plataformas-tablet'];
  const two = evidence(tempReports, 'VISUAL-OP2-PLATAFORMAS-TWO-VIEWS-V1222-', twoIds);
  if (!two) throw new Error('No se genero evidencia valida 2/2.');

  add(''); add('== EVIDENCIA COMBINADA 15/15 ==');
  const combined = path.join(reports, `VISUAL-ASEGURADORAS-OP2-CLOSED-V1222-${stamp}`);
  fs.mkdirSync(combined, { recursive:true });
  const ids = [...approved12,advisorId,...twoIds];
  const rows = ids.map(id => op2.map.get(id) || advisor.map.get(id) || two.map.get(id));
  if (rows.length !== 15 || rows.some(x => x?.ok !== true)) throw new Error('Combinacion final distinta de 15 aprobados.');
  fs.writeFileSync(path.join(combined,'results.jsonl'), `${rows.map(JSON.stringify).join('\n')}\n`, 'utf8');
  copyFiles(op2.dir, combined, approved12); copyFiles(advisor.dir, combined, [advisorId]); copyFiles(two.dir, combined, twoIds);
  if (!ids.every(id => fs.existsSync(path.join(combined,`${id}.png`)))) throw new Error('Faltan capturas en evidencia combinada.');
  const copied = copyDelta(two.dir, reports);
  for (const name of fs.readdirSync(tempReports).filter(x => x.startsWith('VISUAL-OP2-PLATAFORMAS-TWO-VIEWS-V1222-') && x.endsWith('.txt'))) fs.copyFileSync(path.join(tempReports,name),path.join(reports,name));

  add(`two_view_evidence=${copied}`); add(`combined_evidence=${combined}`);
  add('crm=10/10_reused'); add('aseguradoras=12_reused_plus_advisor_reused_plus_2_new_equals_15/15');
  add('status=ASEGURADORAS_OP2_VISUAL_GATE_CLOSED');
  add('next_action=Dry-run Guatemala y Colombia separados; luego backend/Auth/Hosting productivo.');
  result = 'PASSED';
} catch (error) {
  add(''); add('== RESULTADO =='); add('status=BLOCKED_AT_FIRST_REAL_FAILURE');
  add(`error=${String(error?.message || error).replace(/[\r\n]+/gu,' ')}`);
  add('previous_approved_evidence_preserved=YES'); add('source_repo_local_changes_preserved=YES');
  try {
    const tr = path.join(tempRepo,'_orbit360_reports');
    for (const dir of dirs(tr,'VISUAL-OP2-PLATAFORMAS-TWO-VIEWS-V1222-')) copyDelta(dir,reports);
  } catch {}
} finally {
  add(''); add('== LIMPIEZA ==');
  try { if (fs.existsSync(tempRoot)) fs.rmSync(tempRoot,{recursive:true,force:true,maxRetries:8,retryDelay:250}); add('temporary_workspace_removed=YES'); }
  catch { add(`temporary_workspace_removed=NO | path=${tempRoot}`); }
  add('source_repo_pull=NO'); add('source_repo_switch=NO'); add('source_repo_reset=NO'); add('source_repo_clean=NO');
  add('deploy=NO'); add('real_data_writes=NO'); add(`final_result=${result}`); add(`report=${report}`);
  finish(report);
}
process.exit(0);
