#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn, spawnSync } from 'node:child_process';

const BRANCH = 'ays/backend-tenant-lab-v99-20260703';
const BASELINE = '3f1bbcc675a20af059204741b0f273a57b390078';
const ALLOWED_APP_DELTA = ['orbit360-platform/modules/aseguradoras-op2-operational-resources.js'];
const argv = process.argv.slice(2);
const arg = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] || '' : ''; };
const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
const lines = [];
let report = '';
let tempRoot = '';
let finalResult = 'BLOCKED';

function add(text = '') {
  lines.push(String(text));
  console.log(text);
  if (report) fs.writeFileSync(report, `${lines.join('\n')}\n`, 'utf8');
}

function run(file, args, cwd, label, silent = false) {
  const p = spawnSync(file, args, { cwd, encoding:'utf8', windowsHide:true, maxBuffer:32 * 1024 * 1024 });
  if (!silent && p.stdout) add(p.stdout.trimEnd());
  if (!silent && p.stderr) add(p.stderr.trimEnd());
  if (p.error) throw p.error;
  if (p.status !== 0) throw new Error(`${label} fallo. Exit code: ${p.status}.`);
  return String(p.stdout || '').trim();
}

function git(repo, args, label = 'git', silent = true) {
  return run('git.exe', ['-C', repo, ...args], repo, label, silent);
}

function locateRepo(requested) {
  const home = os.homedir();
  const candidates = [
    requested,
    process.cwd(),
    path.join(home,'OneDrive','Documentos','GitHub','orbit360-core'),
    path.join(home,'Documents','GitHub','orbit360-core'),
    path.join(home,'OneDrive','Documents','GitHub','orbit360-core'),
    'C:\\orbit360-core'
  ].filter(Boolean);
  for (const repo of [...new Set(candidates.map(x => path.resolve(x)))]) {
    if (!fs.existsSync(path.join(repo,'.git'))) continue;
    const p = spawnSync('git.exe',['-C',repo,'remote','get-url','origin'],{encoding:'utf8',windowsHide:true});
    if (p.status === 0 && /paulaosoriof86[\\/:]orbit360-core/iu.test(String(p.stdout || ''))) return repo;
  }
  return '';
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file,'utf8').split(/\r?\n/u).filter(Boolean).map((line,index)=>{
    try { return JSON.parse(line); }
    catch { throw new Error(`JSONL invalido en ${file}, linea ${index + 1}.`); }
  });
}

function directories(root,prefix) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root,{withFileTypes:true})
    .filter(x=>x.isDirectory()&&x.name.startsWith(prefix))
    .map(x=>path.join(root,x.name))
    .sort((a,b)=>fs.statSync(b).mtimeMs-fs.statSync(a).mtimeMs);
}

function findEvidence(root,prefix,ids) {
  for (const dir of directories(root,prefix)) {
    const rows = readJsonl(path.join(dir,'results.jsonl'));
    const map = new Map(rows.filter(x=>x?.scenario).map(x=>[String(x.scenario),x]));
    if (ids.every(id=>map.get(id)?.ok===true&&fs.existsSync(path.join(dir,`${id}.png`)))) return {dir,map};
  }
  return null;
}

function copyScreens(source,target,ids) {
  fs.mkdirSync(target,{recursive:true});
  for (const id of ids) fs.copyFileSync(path.join(source,`${id}.png`),path.join(target,`${id}.png`));
}

function copyMinimal(source,targetRoot) {
  const target = path.join(targetRoot,path.basename(source));
  fs.mkdirSync(target,{recursive:true});
  for (const name of fs.readdirSync(source)) {
    const file = path.join(source,name);
    if (fs.statSync(file).isFile()&&(name==='results.jsonl'||/\.(png|txt)$/iu.test(name))) fs.copyFileSync(file,path.join(target,name));
  }
  return target;
}

function findPort(start = 5000) {
  return new Promise((resolve,reject)=>{
    const test = port => {
      if (port > 5040) return reject(new Error('No hay puerto loopback libre entre 5000 y 5040.'));
      const server = net.createServer();
      server.unref();
      server.once('error',()=>test(port+1));
      server.listen(port,'127.0.0.1',()=>server.close(()=>resolve(port)));
    };
    test(start);
  });
}

function finish(file) {
  try {
    const text = fs.readFileSync(file,'utf8');
    spawnSync('clip.exe',[],{input:text,encoding:'utf8',windowsHide:true});
    const p = spawn('notepad.exe',[file],{detached:true,stdio:'ignore'});
    p.unref();
  } catch {}
}

const repo = locateRepo(arg('--repo'));
if (!repo) {
  console.log('BLOQUEADO: no se encontro orbit360-core. No se modifico nada.');
  process.exit(0);
}
const reports = path.join(repo,'_orbit360_reports');
fs.mkdirSync(reports,{recursive:true});
report = path.join(reports,`RUN-OP2-CIERRE-LIVE-V1223-${stamp}.txt`);
tempRoot = path.join(os.tmpdir(),`orbit360-op2-live-${stamp}`);
const tempRepo = path.join(tempRoot,'orbit360-core');

add('============================================================');
add('ORBIT 360 - CIERRE OP2 TARJETA VIVA V1.223');
add(`Repo preservado: ${repo}`);
add('Reutiliza CRM 10/10, OP2 12/15 y Asesor movil aprobado.');
add('Valida el fix de re-render y ejecuta solo Direccion desktop + Operativo tablet.');
add('No pull, switch, reset ni clean en el repo original. No deploy. No datos reales.');
add('============================================================');

try {
  const branch = git(repo,['branch','--show-current']);
  const localHead = git(repo,['rev-parse','HEAD']);
  const localChanges = git(repo,['status','--short']).split(/\r?\n/u).filter(Boolean);
  const origin = git(repo,['remote','get-url','origin']);
  add(''); add('== REPO ORIGINAL PRESERVADO ==');
  add(`branch=${branch}`); add(`head=${localHead}`); add(`local_changes_count=${localChanges.length}`);
  if (branch !== BRANCH) throw new Error(`Rama incorrecta: ${branch}.`);

  add(''); add('== REFERENCIA REMOTA Y DELTA PERMITIDO ==');
  git(repo,['fetch','--quiet','origin',BRANCH],'git fetch',false);
  const remoteHead = git(repo,['rev-parse',`origin/${BRANCH}`]);
  add(`remote_head=${remoteHead}`);
  const changed = git(repo,['diff','--name-only',`${BASELINE}..${remoteHead}`]).split(/\r?\n/u).filter(Boolean);
  const appDelta = changed.filter(x=>(x.startsWith('orbit360-platform/')&&!x.startsWith('orbit360-platform/docs/'))||['firebase.json','firestore.rules','.firebaserc'].includes(x));
  const unexpected = appDelta.filter(x=>!ALLOWED_APP_DELTA.includes(x));
  if (unexpected.length) throw new Error(`Cambio de aplicacion/backend no autorizado: ${unexpected.join(', ')}`);
  if (appDelta.length !== 1 || appDelta[0] !== ALLOWED_APP_DELTA[0]) throw new Error(`Delta de aplicacion inesperado: ${appDelta.join(', ')}`);
  add(`allowed_application_delta=${appDelta.join(',')}`);
  add('protected_backend_expected_unchanged=YES');

  const crmIds = ['dir-clientes-desktop','dir-cliente-desktop','dir-calidad-desktop','dir-poliza-desktop','op-cliente-tablet','op-calidad-tablet','ase-cliente-mobile','ase-calidad-mobile','ase-poliza-mobile','dir-portal-mobile'];
  const approved12 = ['dir-directorio-desktop','dir-resumen-desktop','dir-contactos-desktop','dir-bancos-desktop','dir-documentos-desktop','dir-tarifas-desktop','op-directorio-tablet','op-resumen-tablet','op-bancos-tablet','ase-directorio-mobile','ase-resumen-mobile','ase-bancos-mobile'];
  const advisorId = 'ase-plataformas-mobile';
  const crm = findEvidence(reports,'VISUAL-CRM-OP1-',crmIds);
  const op2 = findEvidence(reports,'VISUAL-ASEGURADORAS-OP2-',approved12);
  const advisor = findEvidence(reports,'VISUAL-OP2-PLATAFORMAS-',[advisorId]);
  if (!crm) throw new Error('Falta evidencia CRM 10/10; no se repetira.');
  if (!op2) throw new Error('Falta evidencia OP2 12/15.');
  if (!advisor) throw new Error('Falta evidencia fisica de Asesor movil aprobado.');
  add(''); add('== EVIDENCIA REUTILIZADA ==');
  add(`crm_10_of_10=${crm.dir}`); add(`op2_12_of_15=${op2.dir}`); add(`advisor_mobile=${advisor.dir}`);

  add(''); add('== CLON AISLADO CON RAMA ACTIVA ==');
  fs.mkdirSync(tempRoot,{recursive:true});
  run('git.exe',['clone','--shared','--no-checkout',repo,tempRepo],repo,'clon aislado');
  git(tempRepo,['remote','set-url','origin',origin],'restaurar origin',false);
  git(tempRepo,['fetch','--quiet','origin',BRANCH],'fetch aislado',false);
  git(tempRepo,['checkout','-B',BRANCH,`origin/${BRANCH}`],'checkout aislado',false);
  if (git(tempRepo,['branch','--show-current']) !== BRANCH) throw new Error('El clon no quedo en la rama obligatoria.');
  if (git(tempRepo,['rev-parse','HEAD']) !== remoteHead) throw new Error('El clon no quedo en el HEAD remoto.');
  add(`isolated_branch=${BRANCH}`); add(`isolated_head=${remoteHead}`);

  add(''); add('== INTEGRACION IDEMPOTENTE V1.223 ==');
  const integration = path.join(tempRepo,'tools','orbit360-aplicar-cachebust-cotizador-comparativo-v1215.ps1');
  run('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',integration,'-Repo',tempRepo],tempRepo,'integracion v1.223');

  add(''); add('== VALIDADORES DEL DELTA ==');
  const appRoot = path.join(tempRepo,'orbit360-platform');
  const moduleValidator = path.join(tempRepo,'tools','orbit360-validar-aseguradoras-op2-rerender-v1223.mjs');
  const smokeValidator = path.join(tempRepo,'tools','orbit360-validar-smoke-op2-plataformas-live-v1223.mjs');
  const smoke = path.join(tempRepo,'tools','orbit360-smoke-op2-plataformas-live-v1223.mjs');
  run(process.execPath,[moduleValidator,appRoot],tempRepo,'validador modulo v1.223');
  run(process.execPath,[smokeValidator,tempRepo],tempRepo,'validador smoke v1.223');

  add(''); add('== EJECUTAR SOLO DOS VISTAS VIVAS ==');
  const port = await findPort();
  add(`selected_url=http://127.0.0.1:${port}`);
  run(process.execPath,[smoke,'--repo',tempRepo,'--app',appRoot,'--port',String(port)],tempRepo,'smoke vivo 2/2');

  const tempReports = path.join(tempRepo,'_orbit360_reports');
  const twoIds = ['dir-plataformas-desktop','op-plataformas-tablet'];
  const two = findEvidence(tempReports,'VISUAL-OP2-PLATAFORMAS-LIVE-V1223-',twoIds);
  if (!two) throw new Error('No se genero evidencia viva 2/2 valida.');

  add(''); add('== EVIDENCIA COMBINADA 15/15 ==');
  const combined = path.join(reports,`VISUAL-ASEGURADORAS-OP2-CLOSED-V1223-${stamp}`);
  const ids = [...approved12,advisorId,...twoIds];
  const rows = ids.map(id=>op2.map.get(id)||advisor.map.get(id)||two.map.get(id));
  if (rows.length !== 15 || rows.some(x=>x?.ok!==true)) throw new Error('Combinacion final distinta de 15 escenarios aprobados.');
  fs.mkdirSync(combined,{recursive:true});
  fs.writeFileSync(path.join(combined,'results.jsonl'),`${rows.map(JSON.stringify).join('\n')}\n`,'utf8');
  copyScreens(op2.dir,combined,approved12); copyScreens(advisor.dir,combined,[advisorId]); copyScreens(two.dir,combined,twoIds);
  if (!ids.every(id=>fs.existsSync(path.join(combined,`${id}.png`)))) throw new Error('Faltan capturas en la evidencia final.');
  const copied = copyMinimal(two.dir,reports);
  for (const name of fs.readdirSync(tempReports).filter(x=>x.startsWith('VISUAL-OP2-PLATAFORMAS-LIVE-V1223-')&&x.endsWith('.txt'))) fs.copyFileSync(path.join(tempReports,name),path.join(reports,name));

  add(`two_view_live_evidence=${copied}`); add(`combined_evidence=${combined}`);
  add('crm=10/10_reused'); add('aseguradoras=12_reused_plus_advisor_reused_plus_2_live_equals_15/15');
  add('status=ASEGURADORAS_OP2_VISUAL_GATE_CLOSED');
  add('next_action=Dry-run Guatemala y Colombia separados; luego backend/Auth/Hosting productivo.');
  finalResult = 'PASSED';
} catch (error) {
  add(''); add('== RESULTADO =='); add('status=BLOCKED_AT_FIRST_REAL_FAILURE');
  add(`error=${String(error?.message||error).replace(/[\r\n]+/gu,' ')}`);
  add('previous_approved_evidence_preserved=YES'); add('source_repo_local_changes_preserved=YES');
  try {
    const tempReports = path.join(tempRepo,'_orbit360_reports');
    for (const dir of directories(tempReports,'VISUAL-OP2-PLATAFORMAS-LIVE-V1223-')) copyMinimal(dir,reports);
  } catch {}
} finally {
  add(''); add('== LIMPIEZA ==');
  try { if (fs.existsSync(tempRoot)) fs.rmSync(tempRoot,{recursive:true,force:true,maxRetries:8,retryDelay:250}); add('temporary_workspace_removed=YES'); }
  catch { add(`temporary_workspace_removed=NO | path=${tempRoot}`); }
  add('source_repo_pull=NO'); add('source_repo_switch=NO'); add('source_repo_reset=NO'); add('source_repo_clean=NO');
  add('deploy=NO'); add('real_data_writes=NO'); add(`final_result=${finalResult}`); add(`report=${report}`);
  finish(report);
}
process.exit(0);
