#!/usr/bin/env node
/* Orbit 360 · A&S controlled application planner for conciliaciones
   Plan-only. No writes. No Firestore. No payment/comission mutation.

   Usage:
     node tools/orbit360-preparar-aplicacion-controlada-conciliacion-ays.mjs --proposal proposal.json --actor actor.json --out plan.json
*/
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
const VERSION = 'v1.0.0-ays-aplicacion-controlada-plan-only';
const TENANT = 'alianzas-soluciones';
const REPORT_DIR = path.join(root, '_orbit360_reports');
const EXECUTE_FORBIDDEN = new Set(['execute','executed','applied','write_enabled','writeEnabled','apply_payment','aplicar_pago','postRecaudo','payload','rawRows','rows','records','secret','token','apiKey','webhook','password','credential']);
const ALLOWED_SOURCE_TYPES = new Set(['planilla_comisiones','estado_cuenta_bancario','cobros_realizados','planilla_aseguradora']);
const ALLOWED_TARGETS = new Set(['cobros','comisiones']);
const COUNTRY_CURRENCY = { GT:'GTQ', CO:'COP' };

function argValue(flag, def=null){ const i=args.indexOf(flag); return i>=0 ? args[i+1] : def; }
function str(v){ return v === undefined || v === null ? '' : String(v).trim(); }
function num(v, fallback=null){ const n=Number(v); return Number.isFinite(n) ? n : fallback; }
function readJson(file){ return JSON.parse(fs.readFileSync(path.resolve(root,file),'utf8')); }
function writeJson(file,data){ fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,JSON.stringify(data,null,2),'utf8'); }
function keysDeep(obj,prefix='',out=[]){
  if(!obj || typeof obj !== 'object') return out;
  if(Array.isArray(obj)){ obj.forEach((v,i)=>keysDeep(v,`${prefix}[${i}]`,out)); return out; }
  for(const k of Object.keys(obj)){ const full=prefix?`${prefix}.${k}`:k; out.push(full); keysDeep(obj[k],full,out); }
  return out;
}
function forbiddenKeys(obj){ return keysDeep(obj).filter(k=>EXECUTE_FORBIDDEN.has(k.replace(/\[\d+\]/g,'').split('.').pop())); }
function normalizeProposal(raw){
  const p = raw.proposal || raw.conciliacion || raw.item || raw;
  const links = p.links || p.relations || {};
  const amount = p.amount || p.monto || {};
  return {
    id: str(p.id || p.proposal_id || p.proposalId),
    tenant_id: str(p.tenant_id || p.tenantId),
    queue_state: str(p.queue_state || p.estado_bandeja || p.estado),
    review_state: str(p.review_state || p.estado_revision),
    source_type: str(p.source_type || p.sourceType || p.fuente),
    source_ref: p.source_ref || p.sourceRef || {},
    score: num(p.score ?? p.confidence_score ?? p.confidenceScore, null),
    score_decision: str(p.score_decision || p.decision || p.resultado_score),
    country: str(p.country || p.pais),
    currency: str(p.currency || p.moneda || amount.currency),
    amount_value: num(amount.value ?? amount.monto ?? p.amount_value ?? p.monto_valor, null),
    amount_currency: str(amount.currency || p.currency || p.moneda),
    proposed_action: str(p.proposed_action || p.accion_propuesta),
    links,
    raw_summary: { has_links:Boolean(links), has_source_ref:Boolean(p.source_ref || p.sourceRef) }
  };
}
function targetFromProposal(p){
  const explicitTarget = p.links?.target_collection || p.links?.targetCollection;
  const explicitTargetId = p.links?.target_id || p.links?.targetId;
  if(explicitTarget && explicitTargetId) return { collection:str(explicitTarget), id:str(explicitTargetId), reason:'explicit_target' };
  if(p.links?.cobro_id) return { collection:'cobros', id:str(p.links.cobro_id), reason:'cobro_id' };
  if(p.links?.comision_id) return { collection:'comisiones', id:str(p.links.comision_id), reason:'comision_id' };
  return { collection:'', id:'', reason:'sin_target' };
}
function normalizeActor(raw){
  const a = raw.actor || raw.user || raw;
  return {
    id: str(a.id || a.user_id || a.email || a.uid),
    role: str(a.role || a.rol || a.actor_role),
    name: str(a.name || a.nombre || a.displayName),
    approval_phrase: str(a.approval_phrase || a.approvalPhrase || raw.approval_phrase),
    reason: str(a.reason || a.motivo || raw.reason || raw.motivo)
  };
}
function validate(p, actor, raw){
  const errors=[]; const warnings=[];
  const fk = forbiddenKeys(raw);
  if(fk.length) errors.push(`Claves prohibidas en entrada: ${fk.join(', ')}.`);
  if(p.tenant_id !== TENANT) errors.push(`Tenant inválido: ${p.tenant_id || 'S/D'}.`);
  if(!p.id) errors.push('Falta id/proposal_id.');
  if(p.queue_state !== 'VALIDADA') errors.push(`Solo propuestas VALIDADA pueden preparar aplicación controlada. Actual: ${p.queue_state || 'S/D'}.`);
  if(!['VALIDADA','REQUIERE_VALIDACION'].includes(p.review_state)) warnings.push(`review_state no confirma validación completa: ${p.review_state || 'S/D'}.`);
  if(!['MATCH_EXACTO','MATCH_PROBABLE','REQUIERE_VALIDACION'].includes(p.score_decision)) errors.push(`score_decision no aplicable: ${p.score_decision || 'S/D'}.`);
  if(p.score === null || p.score < 70) warnings.push(`Score bajo o faltante para aplicación controlada: ${p.score ?? 'S/D'}.`);
  if(!ALLOWED_SOURCE_TYPES.has(p.source_type)) errors.push(`Fuente no autorizada para aplicación controlada: ${p.source_type || 'S/D'}.`);
  if(!p.source_ref || !str(p.source_ref.file || p.source_ref.archivo)) errors.push('Falta trazabilidad source_ref.file.');
  if(!str(p.source_ref.row_ref || p.source_ref.fila || p.source_ref.row_hash)) errors.push('Falta trazabilidad source_ref.row_ref/fila.');
  if(!p.country || !p.currency) errors.push('Falta país/moneda.');
  if(p.country && p.currency && COUNTRY_CURRENCY[p.country] !== p.currency) errors.push(`País/moneda incoherente: ${p.country}/${p.currency}.`);
  if(p.amount_value === null || p.amount_value <= 0) errors.push('Monto inválido o faltante.');
  const target = targetFromProposal(p);
  if(!target.id || !target.collection) errors.push('Falta target operativo: cobro_id/comision_id o target explícito.');
  if(target.collection && !ALLOWED_TARGETS.has(target.collection)) errors.push(`Target collection no permitida: ${target.collection}.`);
  if(!actor.id) errors.push('Falta actor.id/email/uid.');
  if(!actor.role) errors.push('Falta actor.role/rol.');
  if(!actor.reason || actor.reason.length < 12) errors.push('Falta motivo razonable para aplicación controlada.');
  if(actor.approval_phrase !== 'CONFIRMO_PREPARAR_APLICACION_CONTROLADA') errors.push('Falta approval_phrase exacta CONFIRMO_PREPARAR_APLICACION_CONTROLADA.');
  return { errors, warnings, target };
}

const proposalArg = argValue('--proposal');
const actorArg = argValue('--actor');
const outArg = argValue('--out');
const errors=[]; const warnings=[];
if(!proposalArg) errors.push('Falta --proposal <archivo>.');
if(!actorArg) errors.push('Falta --actor <archivo>.');
let rawProposal=null; let rawActor=null; let proposal=null; let actor=null; let validation={errors:[], warnings:[], target:null};
if(!errors.length){
  try { rawProposal = readJson(proposalArg); rawActor = readJson(actorArg); proposal=normalizeProposal(rawProposal); actor=normalizeActor(rawActor); validation=validate(proposal, actor, {proposal:rawProposal, actor:rawActor}); errors.push(...validation.errors); warnings.push(...validation.warnings); }
  catch(e){ errors.push(`JSON inválido: ${e.message}`); }
}
const target = validation.target || {collection:'', id:'', reason:''};
const decision = errors.length ? 'APLICACION_BLOQUEADA' : (warnings.length ? 'APLICACION_LISTA_CON_ADVERTENCIAS' : 'APLICACION_LISTA');
fs.mkdirSync(REPORT_DIR,{recursive:true});
const stamp = new Date().toISOString().replace(/[:.]/g,'-');
const reportPath = outArg ? path.resolve(root,outArg) : path.join(REPORT_DIR, `PLAN-APLICACION-CONTROLADA-CONCILIACION-AYS-${stamp}.json`);
const txtPath = path.join(REPORT_DIR, `PLAN-APLICACION-CONTROLADA-CONCILIACION-AYS-${stamp}.txt`);
const plan = {
  version: VERSION,
  created_at: new Date().toISOString(),
  tenant_id: TENANT,
  decision,
  proposal_id: proposal?.id || null,
  target,
  actor: actor || null,
  planned_effects: errors.length ? [] : [
    { type:'transition_conciliacion', from:'VALIDADA', to:'APLICADA', proposal_id:proposal.id, requires:'validator VALIDADA->APLICADA' },
    { type:'update_target', collection:target.collection, id:target.id, status:'pendiente_de_ejecutor_autorizado', amount:{ value:proposal.amount_value, currency:proposal.currency }, note:'Plan-only: no ejecutado por esta herramienta.' },
    { type:'auditLog', event:'CONCILIACION_APLICACION_CONTROLADA_PREPARADA', proposal_id:proposal.id, actor_id:actor.id }
  ],
  proposal_snapshot: proposal,
  errors,
  warnings,
  restrictions: ['plan-only','no writes','no Firestore writes','no payment application','no cobros mutation','no comisiones mutation','no deploy','no merge']
};
writeJson(reportPath, plan);
const txt = [
  '============================================================',
  'ORBIT 360 - PLAN APLICACION CONTROLADA CONCILIACION A&S',
  `Version: ${VERSION}`,
  `Fecha: ${plan.created_at}`,
  `Decision: ${decision}`,
  'Restricciones: plan-only, sin writes, sin pagos, sin cobros/comisiones, sin deploy.',
  '============================================================',
  '',
  `Propuesta: ${plan.proposal_id || 'S/D'}`,
  `Target: ${target.collection || 'S/D'}/${target.id || 'S/D'}`,
  `Actor: ${actor?.id || 'S/D'} (${actor?.role || 'S/D'})`,
  '',
  `Efectos planificados: ${plan.planned_effects.length}`,
  '',
  `Errores: ${errors.length}`,
  ...errors.map(e=>`ERROR: ${e}`),
  '',
  `Advertencias: ${warnings.length}`,
  ...warnings.map(w=>`WARN: ${w}`),
  '',
  errors.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
].join('\n');
fs.writeFileSync(txtPath, txt, 'utf8');
console.log(txt);
process.exit(errors.length ? 1 : 0);
