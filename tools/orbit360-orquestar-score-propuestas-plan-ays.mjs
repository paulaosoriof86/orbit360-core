#!/usr/bin/env node
/* Orbit 360 A&S — Orquestador score/propuestas plan-only.
   Encadena: pipeline metadata-only -> score gate -> propuestas -> plan de persistencia.
   No lee filas reales, no escribe Orbit.store/Firestore, no aplica pagos, no deploy/merge. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = process.argv.slice(2);
const VERSION = 'v1.0.0-ays-score-propuestas-plan-only';
const REPORT_DIR = path.join(root, '_orbit360_reports');
const TENANT_DEFAULT = 'alianzas-soluciones';
const COUNTRY_CURRENCY = { GT:'GTQ', CO:'COP' };
const SOURCES = new Set(['planilla_aseguradora','planilla_comisiones','estado_cuenta_bancario','cobros_realizados']);
const SCORE_DECISIONS = new Set(['MATCH_EXACTO','MATCH_PROBABLE','REQUIERE_VALIDACION','BLOQUEADO']);
const ACTIONS = new Set(['PROPONER_APLICACION_CON_CONFIRMACION','PROPONER_REVISION','ENVIAR_A_BANDEJA_VALIDACION','NO_APLICAR']);
const FORBIDDEN = new Set(['rows','row','records','items','data','payload','rawPayload','rawData','sampleRows','previewRows','normalizedRows','rawRows','cellValues','secret','token','apiKey','webhook','password','credential']);
const tool = (name) => path.join(root, 'tools', name);
const TOOLS = {
  pipeline: tool('orbit360-orquestar-pipeline-metadata-ays.mjs'),
  proposals: tool('orbit360-generar-propuestas-conciliacion-ays.mjs'),
  plan: tool('orbit360-preparar-persistencia-conciliaciones-lab-ays.mjs')
};

function argValue(flag){ const i=args.indexOf(flag); return i>=0 ? args[i+1] : null; }
function rel(p){ return path.relative(root, p).replace(/\\/g, '/'); }
function readJson(file){ return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, data){ fs.mkdirSync(path.dirname(file), {recursive:true}); fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8'); }
function asArray(v){ return Array.isArray(v) ? v : (v ? [v] : []); }
function str(v){ return v === undefined || v === null ? '' : String(v).trim(); }
function num(v){ if(v === undefined || v === null || v === '') return null; const n=Number(v); return Number.isFinite(n) ? n : null; }
function keysDeep(obj, prefix='', out=[]){
  if(!obj || typeof obj !== 'object') return out;
  if(Array.isArray(obj)){ obj.forEach((v,i)=>keysDeep(v, `${prefix}[${i}]`, out)); return out; }
  for(const k of Object.keys(obj)){ const p=prefix?`${prefix}.${k}`:k; out.push(p); keysDeep(obj[k], p, out); }
  return out;
}
function forbiddenKeys(obj){ return keysDeep(obj).filter(p => FORBIDDEN.has(p.replace(/\[\d+\]/g,'').split('.').pop())); }
function jsonFromOutput(out){ const m=String(out||'').match(/(?:JSON|Salida JSON):\s*([^\n]+?\.json)/); return m ? m[1].trim() : null; }
function run(name, commandArgs){
  const res = spawnSync(process.execPath, commandArgs, { cwd: root, encoding:'utf8' });
  const output = `${res.stdout || ''}\n${res.stderr || ''}`;
  return { name, ok: res.status === 0, exit_code: res.status, json: jsonFromOutput(output), output_excerpt: output.slice(0, 3500) };
}
function scoreGate(dryrun, label){
  const errors=[]; const warnings=[];
  const sourceType = str(dryrun.source_type || dryrun.sourceType);
  const candidates = asArray(dryrun.candidates || dryrun.candidatos || dryrun.conciliation_candidates || dryrun.candidatos_conciliacion);
  const fk = forbiddenKeys(dryrun);
  if(fk.length) errors.push(`dryRun contiene claves prohibidas: ${fk.slice(0,12).join(', ')}.`);
  if(!str(dryrun.tenant_id || dryrun.tenantId)) errors.push('Falta tenant_id/tenantId.');
  if(!SOURCES.has(sourceType)) errors.push(`Fuente no autorizada para conciliación: ${sourceType || 'S/D'}.`);
  if(!candidates.length) errors.push('No hay candidates metadata-only.');
  const audit = candidates.map((c, idx) => {
    const score = num(c.score ?? c.confidenceScore ?? c.confidence_score);
    const decision = str(c.score_decision || c.decision || c.resultado_score);
    const action = str(c.proposed_action || c.accion_propuesta);
    const country = str(c.country || c.pais || dryrun.country || dryrun.pais);
    const currency = str(c.currency || c.moneda || dryrun.currency || dryrun.moneda);
    const id = str(c.candidate_id || c.id || `candidate_${idx+1}`);
    const e=[]; const w=[];
    if(score === null || score < 0 || score > 100) e.push('score inválido/faltante');
    if(!SCORE_DECISIONS.has(decision)) e.push(`score_decision inválido: ${decision || 'S/D'}`);
    if(!ACTIONS.has(action)) e.push(`proposed_action inválida: ${action || 'S/D'}`);
    if(!country || !currency) e.push('país/moneda faltante');
    if(country && currency && COUNTRY_CURRENCY[country] && COUNTRY_CURRENCY[country] !== currency) e.push(`país/moneda incoherente ${country}/${currency}`);
    if(decision === 'BLOQUEADO' && action !== 'NO_APLICAR') e.push('BLOQUEADO debe proponer NO_APLICAR');
    if(decision === 'MATCH_EXACTO' && action !== 'PROPONER_APLICACION_CON_CONFIRMACION') w.push('MATCH_EXACTO exige confirmación antes de aplicar');
    if(decision === 'MATCH_EXACTO' && score < 90) w.push('MATCH_EXACTO con score menor a 90');
    if(decision === 'MATCH_PROBABLE' && score < 75) w.push('MATCH_PROBABLE con score menor a 75');
    if(e.length) errors.push(`candidate[${idx}] ${id}: ${e.join('; ')}.`);
    if(w.length) warnings.push(`candidate[${idx}] ${id}: ${w.join('; ')}.`);
    return { candidate_id:id, score, score_decision:decision || null, proposed_action:action || null, status:e.length?'BLOQUEADO':(w.length?'LISTO_CON_ADVERTENCIAS':'LISTO_SCORE') };
  });
  const decision = errors.length ? 'SCORE_BLOQUEADO' : (warnings.length ? 'SCORE_LISTO_CON_ADVERTENCIAS' : 'SCORE_LISTO');
  const report = { version:VERSION, created_at:new Date().toISOString(), source:label, decision, source_type:sourceType || null, summary:{ total:audit.length, ready:audit.filter(x=>x.status==='LISTO_SCORE').length, warnings:audit.filter(x=>x.status==='LISTO_CON_ADVERTENCIAS').length, blocked:audit.filter(x=>x.status==='BLOQUEADO').length }, audit, errors, warnings, restrictions:['metadata-only','score-gate-only','no-writes','no-payment-application'] };
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(REPORT_DIR, `SCORE-GATE-PROPUESTAS-PLAN-AYS-${stamp}.json`);
  writeJson(jsonPath, report);
  const txt = [`Decision: ${decision}`, `Fuente: ${sourceType || 'S/D'}`, `Candidatos: ${audit.length}`, `Errores: ${errors.length}`, ...errors.map(e=>`ERROR: ${e}`), `Advertencias: ${warnings.length}`, ...warnings.map(w=>`WARN: ${w}`), `JSON: ${rel(jsonPath)}`, errors.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'].join('\n');
  fs.writeFileSync(jsonPath.replace(/\.json$/, '.txt'), txt, 'utf8');
  return { name:'score_gate', ok:!errors.length, exit_code:errors.length ? 1 : 0, json:rel(jsonPath), output_excerpt:txt };
}

const manifestArg = argValue('--manifest');
const candidatesArg = argValue('--candidates');
const tenantArg = argValue('--tenant') || TENANT_DEFAULT;
const errors=[];
if(!manifestArg) errors.push('Falta --manifest.');
if(!candidatesArg) errors.push('Falta --candidates.');
if(manifestArg && !fs.existsSync(path.resolve(root, manifestArg))) errors.push(`No existe manifest: ${manifestArg}`);
if(candidatesArg && !fs.existsSync(path.resolve(root, candidatesArg))) errors.push(`No existe candidates: ${candidatesArg}`);
for(const [label, file] of Object.entries(TOOLS)) if(!fs.existsSync(file)) errors.push(`No existe herramienta ${label}: ${rel(file)}`);

const steps=[];
let finalDryrun=null; let proposalsJson=null; let planJson=null;
if(!errors.length){
  steps.push(run('pipeline_metadata', [TOOLS.pipeline, '--manifest', path.resolve(root, manifestArg), '--candidates', path.resolve(root, candidatesArg)]));
  if(steps.at(-1).ok && steps.at(-1).json){ finalDryrun = path.resolve(root, steps.at(-1).json); steps.push(scoreGate(readJson(finalDryrun), rel(finalDryrun))); }
  if(steps.at(-1)?.ok && finalDryrun){ steps.push(run('propuestas_conciliaciones', [TOOLS.proposals, '--dryrun', finalDryrun])); if(steps.at(-1).ok && steps.at(-1).json) proposalsJson = path.resolve(root, steps.at(-1).json); }
  if(steps.at(-1)?.ok && proposalsJson){ steps.push(run('plan_persistencia', [TOOLS.plan, '--proposals', proposalsJson, '--tenant', tenantArg])); if(steps.at(-1).ok && steps.at(-1).json) planJson = path.resolve(root, steps.at(-1).json); }
}
const failed = steps.find(s => !s.ok);
const hasWarnings = steps.some(s => /WARN|ADVERTENCIA|CON_ADVERTENCIAS|PLAN_CON_ADVERTENCIAS|LISTO_CON_ADVERTENCIAS/.test(s.output_excerpt || ''));
const decision = errors.length || failed ? 'ORQUESTADOR_PLAN_BLOQUEADO' : (hasWarnings ? 'ORQUESTADOR_PLAN_LISTO_CON_ADVERTENCIAS' : 'ORQUESTADOR_PLAN_LISTO');
const report = { version:VERSION, created_at:new Date().toISOString(), decision, tenant_id:tenantArg, manifest:manifestArg || null, candidates:candidatesArg || null, final_dryrun_report:finalDryrun ? rel(finalDryrun) : null, proposals_report:proposalsJson ? rel(proposalsJson) : null, persistence_plan:planJson ? rel(planJson) : null, steps:steps.map(s=>({ name:s.name, ok:s.ok, exit_code:s.exit_code, json:s.json })), blocked_step:failed?.name || null, errors, warnings:hasWarnings ? ['Revisar advertencias antes de persistencia LAB aprobada.'] : [], readiness:{ can_persist_after_lab_approval: decision !== 'ORQUESTADOR_PLAN_BLOQUEADO' && Boolean(planJson), can_write_now:false, can_apply_payments:false }, restrictions:['metadata-only','plan-only','no-data-processing','no Orbit.store writes','no Firestore writes','no payment application','no cobros mutation','no deploy','no merge'] };
fs.mkdirSync(REPORT_DIR, {recursive:true});
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const jsonPath = path.join(REPORT_DIR, `ORQUESTADOR-SCORE-PROPUESTAS-PLAN-AYS-${stamp}.json`);
writeJson(jsonPath, report);
const txt = ['============================================================','ORBIT 360 A&S — ORQUESTADOR SCORE/PROPUESTAS PLAN-ONLY',`Version: ${VERSION}`,`Fecha: ${report.created_at}`,`Decision: ${decision}`,'Restricciones: metadata-only, plan-only, sin datos reales, sin writes, sin pagos, sin deploy.','============================================================','',`Manifest: ${manifestArg || 'S/D'}`,`Candidates: ${candidatesArg || 'S/D'}`,`Final dryRun: ${report.final_dryrun_report || 'S/D'}`,`Propuestas: ${report.proposals_report || 'S/D'}`,`Plan persistencia: ${report.persistence_plan || 'S/D'}`,'','Pasos:',...report.steps.map(s=>`${s.ok?'OK':'FAIL'} ${s.name} exit=${s.exit_code} json=${s.json || 'S/D'}`),'',`Errores: ${errors.length}`,...errors.map(e=>`ERROR: ${e}`),'',`Advertencias: ${report.warnings.length}`,...report.warnings.map(w=>`WARN: ${w}`),'',`JSON: ${rel(jsonPath)}`,decision === 'ORQUESTADOR_PLAN_BLOQUEADO' ? 'RESULTADO: FAIL' : 'RESULTADO: OK'].join('\n');
fs.writeFileSync(jsonPath.replace(/\.json$/, '.txt'), txt, 'utf8');
console.log(txt);
process.exit(decision === 'ORQUESTADOR_PLAN_BLOQUEADO' ? 1 : 0);
