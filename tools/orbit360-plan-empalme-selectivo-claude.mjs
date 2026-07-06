#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const args = process.argv.slice(2);
const dirArg = args[args.indexOf('--candidate') + 1];
const candidate = dirArg ? path.resolve(root, dirArg) : null;
const outDir = path.join(root, '_orbit360_reports');
fs.mkdirSync(outDir, { recursive: true });

const protectedExact = new Set([
  'data/store.js',
  'data/store-firestore-lab.local.js',
  'core/backend-lab-loader.js',
  'core/backend-lab-init.js',
  'core/backend-lab-security-guard.js',
  'firestore.rules',
  'index.html'
]);
const protectedPrefixes = ['tools/orbit360-'];
const allowedPrefixes = ['modules/','core/','data/','styles/','docs/'];
const neverAuto = new Set(['index.html','firestore.rules']);
const requiresManual = new Set(['core/config.js','core/importa.js','data/academia-plus.js','data/seed.js','docs/BITACORA-CAMBIOS.md']);

function usage(){ console.error('Uso: node tools/orbit360-plan-empalme-selectivo-claude.mjs --candidate ruta_extraida'); process.exit(2); }
function rel(p){ return path.relative(candidate, p).replace(/\\/g,'/'); }
function listFiles(dir){
  const out=[];
  function walk(d){
    for(const e of fs.readdirSync(d,{withFileTypes:true})){
      const p=path.join(d,e.name);
      if(e.isDirectory()) walk(p); else if(e.isFile()) out.push(p);
    }
  }
  walk(dir); return out;
}
function sha(file){ return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function existsRepo(r){ return fs.existsSync(path.join(root, r)); }
function text(file){ return fs.readFileSync(file,'utf8'); }
function hasBlockedCopy(r, file){
  if(!/\.(js|html|md|css)$/i.test(r)) return [];
  const t = text(file);
  const blocked = ['Todo aplicado','Aplicar pago','Pago aplicado','Aplicado a póliza','Pagos no aplicados','pago sin aplicar','listas p/ backend'];
  return blocked.filter(x => t.includes(x));
}

if(!candidate || !fs.existsSync(candidate)) usage();
const files = listFiles(candidate).map(f => ({ abs:f, rel:rel(f), sha:sha(f) })).sort((a,b)=>a.rel.localeCompare(b.rel));
const plan=[];
for(const f of files){
  const r=f.rel;
  const inRepo = existsRepo(r);
  const changed = !inRepo || sha(path.join(root,r)) !== f.sha;
  if(!changed) continue;
  let decision='REVISAR_MANUAL';
  const reasons=[];
  if(neverAuto.has(r)){ decision='BLOQUEAR_AUTO'; reasons.push('archivo nunca se empalma completo automáticamente'); }
  if(protectedExact.has(r)){ decision='BLOQUEAR_AUTO'; reasons.push('archivo protegido'); }
  if(protectedPrefixes.some(p=>r.startsWith(p))){ decision='BLOQUEAR_AUTO'; reasons.push('tools protegidos backend'); }
  if(!allowedPrefixes.some(p=>r.startsWith(p)) && r !== 'index.html'){ decision='REVISAR_MANUAL'; reasons.push('ruta fuera de prefijos esperados'); }
  if(requiresManual.has(r) && decision !== 'BLOQUEAR_AUTO'){ decision='REVISAR_MANUAL'; reasons.push('requiere revisión funcional manual'); }
  const blockedCopy = hasBlockedCopy(r, f.abs);
  if(blockedCopy.length){ decision='BLOQUEAR_AUTO'; reasons.push(`copy bloqueante: ${blockedCopy.join(', ')}`); }
  if(decision === 'REVISAR_MANUAL' && !reasons.length){ decision='CANDIDATO_EMPAlME_SELECTIVO'; reasons.push('archivo permitido pero requiere diff antes de copiar'); }
  plan.push({ path:r, decision, reasons, exists_in_repo:inRepo, sha256:f.sha });
}
const summary = {
  total_changed: plan.length,
  bloquear: plan.filter(x=>x.decision==='BLOQUEAR_AUTO').length,
  revisar: plan.filter(x=>x.decision==='REVISAR_MANUAL').length,
  candidatos: plan.filter(x=>x.decision==='CANDIDATO_EMPAlME_SELECTIVO').length
};
const stamp = new Date().toISOString().replace(/[:.]/g,'-');
const json = path.join(outDir, `PLAN-EMPALME-SELECTIVO-CLAUDE-${stamp}.json`);
const md = json.replace(/\.json$/, '.md');
fs.writeFileSync(json, JSON.stringify({created_at:new Date().toISOString(), candidate, summary, plan}, null, 2), 'utf8');
const lines = ['# Plan empalme selectivo Claude','',`Fecha: ${new Date().toISOString()}`,'',`Total cambiados: ${summary.total_changed}`,`Bloquear: ${summary.bloquear}`,`Revisar: ${summary.revisar}`,`Candidatos: ${summary.candidatos}`,'','| Archivo | Decisión | Razones |','|---|---|---|',...plan.map(p=>`| ${p.path} | ${p.decision} | ${p.reasons.join('; ')} |`)];
fs.writeFileSync(md, lines.join('\n'),'utf8');
console.log(lines.join('\n'));
process.exit(summary.bloquear ? 1 : 0);
