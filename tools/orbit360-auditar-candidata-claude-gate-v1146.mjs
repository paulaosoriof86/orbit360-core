#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = process.argv.slice(2);
const dirArg = args[args.indexOf('--candidate') + 1];
const candidate = dirArg ? path.resolve(root, dirArg) : null;
const outDir = path.join(root, '_orbit360_reports');
fs.mkdirSync(outDir, { recursive: true });

const requiredIndex = [
  'core/backend-lab-loader.js',
  'core/backend-lab-init.js',
  'data/store-firestore-lab.local.js',
  'core/backend-lab-security-guard.js',
  'modules/portal-v1142-copyfix.js'
];
const protectedPaths = [
  'data/store.js',
  'data/store-firestore-lab.local.js',
  'core/backend-lab-loader.js',
  'core/backend-lab-init.js',
  'core/backend-lab-security-guard.js',
  'firestore.rules'
];
const activeFiles = [
  'modules/cliente360.js',
  'modules/cobros.js',
  'modules/finanzas.js',
  'modules/conciliaciones.js',
  'modules/automatizaciones.js',
  'core/importa.js',
  'core/config.js',
  'data/academia-plus.js',
  'data/seed.js'
];
const blocked = [
  'Todo aplicado',
  'Aplicar pago',
  'Pago aplicado',
  'Aplicado a póliza',
  'Pagos no aplicados',
  'pago sin aplicar',
  'aplicar un pago baja la cartera',
  'Cobros gestiona la cartera y aplica pagos',
  'listas p/ backend'
];
const academyRequired = [
  'junio/julio',
  'manifest',
  'fuentes separadas',
  'banco no',
  'financiero histórico',
  'documentos soporte',
  'REQUIERE_VALIDACION',
  'GTQ',
  'COP'
];
function exists(p){ return fs.existsSync(path.join(candidate, p)); }
function text(p){ return fs.existsSync(path.join(candidate, p)) ? fs.readFileSync(path.join(candidate, p), 'utf8') : ''; }
function listJs(d){
  const out=[];
  function walk(x){
    for(const e of fs.readdirSync(x,{withFileTypes:true})){
      const p=path.join(x,e.name);
      if(e.isDirectory()) walk(p);
      else if(e.isFile() && p.endsWith('.js')) out.push(p);
    }
  }
  walk(d); return out;
}

const errors=[]; const warnings=[]; const details=[];
if(!candidate || !fs.existsSync(candidate)){ console.error('Uso: node tools/orbit360-auditar-candidata-claude-gate-v1146.mjs --candidate ruta_extraida'); process.exit(2); }

const index = text('index.html');
for(const s of requiredIndex){ if(!index.includes(s)) errors.push(`index no conserva ${s}`); }
for(const p of protectedPaths){ if(exists(p)) warnings.push(`candidata incluye archivo protegido: ${p}; revisar diff antes de empalmar`); }

for(const f of activeFiles){
  const t=text(f);
  if(!t){ errors.push(`falta archivo esperado: ${f}`); continue; }
  for(const phrase of blocked){
    if(t.includes(phrase)) errors.push(`${f}: contiene frase bloqueante: ${phrase}`);
  }
}
const acad = `${text('data/academia-plus.js')}\n${text('data/seed.js')}`.toLowerCase();
for(const req of academyRequired){ if(!acad.includes(req.toLowerCase())) errors.push(`academia no cubre explícitamente: ${req}`); }

let jsFail=0, jsTotal=0;
for(const f of listJs(candidate)){
  jsTotal++;
  const r=spawnSync(process.execPath, ['--check', f], {encoding:'utf8'});
  if(r.status !== 0){ jsFail++; errors.push(`JS inválido: ${path.relative(candidate,f)}`); }
}

const decision = errors.length ? 'DEVOLVER' : (warnings.length ? 'PASA_CON_REVISION' : 'PASA');
const report = { created_at:new Date().toISOString(), candidate, decision, jsTotal, jsFail, errors, warnings, details };
const stamp = new Date().toISOString().replace(/[:.]/g,'-');
const json = path.join(outDir, `AUDITORIA-CANDIDATA-CLAUDE-GATE-${stamp}.json`);
const txt = json.replace(/\.json$/, '.txt');
fs.writeFileSync(json, JSON.stringify(report,null,2),'utf8');
fs.writeFileSync(txt, [
  'ORBIT 360 A&S - GATE CANDIDATA CLAUDE',
  `Fecha: ${report.created_at}`,
  `Decision: ${decision}`,
  `JS revisados: ${jsTotal}`,
  `JS con error: ${jsFail}`,
  `Errores: ${errors.length}`,
  ...errors.map(e=>`ERROR: ${e}`),
  `Advertencias: ${warnings.length}`,
  ...warnings.map(w=>`WARN: ${w}`),
  decision === 'DEVOLVER' ? 'RESULTADO: DEVOLVER' : 'RESULTADO: OK'
].join('\n'),'utf8');
console.log(fs.readFileSync(txt,'utf8'));
process.exit(errors.length ? 1 : 0);
