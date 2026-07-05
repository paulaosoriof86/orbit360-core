#!/usr/bin/env node
/* Orbit 360 · A&S conciliaciones transition validator
   Metadata-only. It validates queue/review transitions before any LAB/backend write.

   Usage:
     node tools/orbit360-validar-transicion-conciliacion-ays.mjs --transition path/to/transition.local.json
*/
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
const VERSION = 'v1.0.0-ays-conciliaciones-transition-validator';
const REPORT_DIR = path.join(root, '_orbit360_reports');
const COUNTRY_CURRENCY = { GT: 'GTQ', CO: 'COP' };
const FORBIDDEN_KEYS = new Set(['rows','rawRows','normalizedRows','previewRows','sampleRows','records','payload','rawPayload','rawData','cellValues','secret','token','apiKey','webhook','password','credential']);
const QUEUE_STATES = new Set(['PROPUESTA','EN_REVISION','VALIDADA','RECHAZADA','APLICADA','BLOQUEADA','ANULADA']);
const REVIEW_STATES = new Set(['PENDIENTE','REQUIERE_VALIDACION','VALIDADA','RECHAZADA','BLOQUEADA']);
const SCORE_DECISIONS = new Set(['MATCH_EXACTO','MATCH_PROBABLE','REQUIERE_VALIDACION','BLOQUEADO']);
const TERMINAL = new Set(['APLICADA','RECHAZADA','BLOQUEADA','ANULADA']);
const ALLOWED = new Map([
  ['PROPUESTA', new Set(['EN_REVISION','BLOQUEADA','ANULADA'])],
  ['EN_REVISION', new Set(['VALIDADA','RECHAZADA','BLOQUEADA','ANULADA'])],
  ['VALIDADA', new Set(['APLICADA','RECHAZADA','ANULADA'])],
  ['RECHAZADA', new Set([])],
  ['BLOQUEADA', new Set([])],
  ['ANULADA', new Set([])],
  ['APLICADA', new Set([])]
]);

function argValue(flag){ const i=args.indexOf(flag); return i>=0 ? args[i+1] : null; }
function str(v){ return v === undefined || v === null ? '' : String(v).trim(); }
function readJson(file){ return JSON.parse(fs.readFileSync(file,'utf8')); }
function keysDeep(obj,prefix='',out=[]){
  if(!obj || typeof obj !== 'object') return out;
  if(Array.isArray(obj)){ obj.forEach((v,i)=>keysDeep(v,`${prefix}[${i}]`,out)); return out; }
  for(const k of Object.keys(obj)){ const full = prefix ? `${prefix}.${k}` : k; out.push(full); keysDeep(obj[k],full,out); }
  return out;
}
function forbiddenKeys(obj){
  return keysDeep(obj).filter(k=>FORBIDDEN_KEYS.has(k.replace(/\[\d+\]/g,'').split('.').pop()));
}
function normalize(input){
  const proposal = input.proposal || input.conciliacion || input.item || input;
  const transition = input.transition || input;
  return {
    tenant_id: str(proposal.tenant_id || proposal.tenantId || input.tenant_id || input.tenantId),
    proposal_id: str(proposal.proposal_id || proposal.proposalId || proposal.id || input.proposal_id || input.id),
    from_queue_state: str(transition.from_queue_state || transition.from || proposal.queue_state || proposal.estado_bandeja || proposal.estado),
    to_queue_state: str(transition.to_queue_state || transition.to || input.to_queue_state || input.to),
    from_review_state: str(transition.from_review_state || proposal.review_state || proposal.estado_revision),
    to_review_state: str(transition.to_review_state || input.to_review_state || ''),
    score_decision: str(proposal.score_decision || proposal.decision || input.score_decision),
    proposed_action: str(proposal.proposed_action || proposal.accion_propuesta || input.proposed_action),
    country: str(proposal.country || proposal.pais || input.country || input.pais),
    currency: str(proposal.currency || proposal.moneda || input.currency || input.moneda),
    links: proposal.links || proposal.relations || proposal.relaciones || input.links || {},
    source_ref: proposal.source_ref || proposal.sourceRef || input.source_ref || {},
    actor: input.actor || transition.actor || {},
    reason: str(input.reason || transition.reason || input.motivo || transition.motivo),
    apply_context: input.apply_context || input.applyContext || transition.apply_context || {}
  };
}
function validate(t){
  const errors=[]; const warnings=[];
  if(!t.tenant_id) errors.push('Falta tenant_id.');
  if(!t.proposal_id) errors.push('Falta proposal_id/id.');
  if(!QUEUE_STATES.has(t.from_queue_state)) errors.push(`from_queue_state inválido: ${t.from_queue_state || 'S/D'}.`);
  if(!QUEUE_STATES.has(t.to_queue_state)) errors.push(`to_queue_state inválido: ${t.to_queue_state || 'S/D'}.`);
  if(t.from_review_state && !REVIEW_STATES.has(t.from_review_state)) warnings.push(`from_review_state no estándar: ${t.from_review_state}.`);
  if(t.to_review_state && !REVIEW_STATES.has(t.to_review_state)) warnings.push(`to_review_state no estándar: ${t.to_review_state}.`);
  if(!SCORE_DECISIONS.has(t.score_decision)) errors.push(`score_decision inválido o faltante: ${t.score_decision || 'S/D'}.`);
  if(t.country && t.currency && COUNTRY_CURRENCY[t.country] && COUNTRY_CURRENCY[t.country] !== t.currency) errors.push(`País/moneda incoherente: ${t.country}/${t.currency}.`);
  if(!t.country || !t.currency) errors.push('Falta país/moneda.');

  const actorId = str(t.actor.id || t.actor.actor_id || t.actor.email || t.actor.user_id);
  const actorRole = str(t.actor.role || t.actor.rol || t.actor.actor_role);
  if(!actorId) errors.push('Falta actor.id/email/user_id.');
  if(!actorRole) errors.push('Falta actor.role/rol.');
  if(!t.reason || t.reason.length < 8) errors.push('Falta reason/motivo suficientemente descriptivo.');

  if(TERMINAL.has(t.from_queue_state)) errors.push(`Estado terminal no admite transición: ${t.from_queue_state}.`);
  if(ALLOWED.has(t.from_queue_state) && !ALLOWED.get(t.from_queue_state).has(t.to_queue_state)) errors.push(`Transición no permitida: ${t.from_queue_state} -> ${t.to_queue_state}.`);
  if(t.score_decision === 'BLOQUEADO' && t.to_queue_state !== 'BLOQUEADA') errors.push('Una propuesta BLOQUEADO solo puede ir a BLOQUEADA.');
  if(t.from_queue_state === 'PROPUESTA' && t.to_queue_state === 'VALIDADA') errors.push('No se permite saltar de PROPUESTA a VALIDADA sin EN_REVISION.');
  if(t.to_queue_state === 'APLICADA'){
    if(t.from_queue_state !== 'VALIDADA') errors.push('Solo una propuesta VALIDADA puede pasar a APLICADA.');
    if(t.score_decision === 'BLOQUEADO') errors.push('Una propuesta bloqueada no puede aplicarse.');
    const hasTarget = Boolean(t.links.cobro_id || t.links.comision_id || t.apply_context.target_id || t.apply_context.cobro_id || t.apply_context.comision_id);
    if(!hasTarget) errors.push('Para APLICADA falta target cobro_id/comision_id o apply_context.target_id.');
    if(t.apply_context.write_enabled !== true) errors.push('Para APLICADA se requiere apply_context.write_enabled=true en flujo controlado.');
    if(!str(t.apply_context.approved_by || t.apply_context.aprobado_por)) errors.push('Para APLICADA falta apply_context.approved_by/aprobado_por.');
  }
  if(t.to_queue_state === 'VALIDADA'){
    if(!['MATCH_EXACTO','MATCH_PROBABLE','REQUIERE_VALIDACION'].includes(t.score_decision)) errors.push('Solo score_decision no bloqueado puede validarse.');
  }
  return { errors, warnings };
}

const errors=[]; const warnings=[];
const fileArg = argValue('--transition') || argValue('--case');
if(!fileArg) errors.push('Falta --transition <archivo>.');
const file = fileArg ? path.resolve(root,fileArg) : null;
let input=null;
if(file && !fs.existsSync(file)) errors.push(`No existe archivo: ${fileArg}`);
if(!errors.length){ try{ input=readJson(file); } catch(e){ errors.push(`JSON inválido: ${e.message}`); } }
let norm=null; let validation={errors:[], warnings:[]};
if(input){
  const fk = forbiddenKeys(input);
  if(fk.length) errors.push(`Claves prohibidas: ${fk.join(', ')}`);
  norm=normalize(input);
  validation=validate(norm);
  errors.push(...validation.errors);
  warnings.push(...validation.warnings);
}
const decision = errors.length ? 'BLOQUEADO' : (warnings.length ? 'TRANSICION_VALIDA_CON_ADVERTENCIAS' : 'TRANSICION_VALIDA');
const stamp = new Date().toISOString().replace(/[:.]/g,'-');
fs.mkdirSync(REPORT_DIR,{recursive:true});
const report = {
  version: VERSION,
  created_at: new Date().toISOString(),
  source_file: fileArg,
  decision,
  transition: norm,
  audit_event: norm ? {
    type: 'CONCILIACION_TRANSICION_VALIDADA',
    tenant_id: norm.tenant_id,
    proposal_id: norm.proposal_id,
    from_queue_state: norm.from_queue_state,
    to_queue_state: norm.to_queue_state,
    actor: norm.actor,
    reason: norm.reason,
    createdAt: new Date().toISOString()
  } : null,
  errors,
  warnings,
  restrictions: ['metadata-only','no Orbit.store writes','no Firestore writes','no payment application by this validator']
};
const jsonPath = path.join(REPORT_DIR,`TRANSICION-CONCILIACION-AYS-${stamp}.json`);
const txtPath = path.join(REPORT_DIR,`TRANSICION-CONCILIACION-AYS-${stamp}.txt`);
fs.writeFileSync(jsonPath, JSON.stringify(report,null,2),'utf8');
const txt = [
  '============================================================',
  'ORBIT 360 - VALIDACION TRANSICION CONCILIACION A&S',
  `Version: ${VERSION}`,
  `Fecha: ${report.created_at}`,
  `Source: ${fileArg || 'S/D'}`,
  `Decision: ${decision}`,
  'Restricciones: metadata-only, sin writes, sin aplicar pagos.',
  '============================================================',
  '',
  norm ? `Transición: ${norm.from_queue_state} -> ${norm.to_queue_state}` : 'Transición: S/D',
  norm ? `Propuesta: ${norm.proposal_id || 'S/D'}` : '',
  norm ? `Tenant: ${norm.tenant_id || 'S/D'}` : '',
  '',
  `Errores: ${errors.length}`,
  ...errors.map(e=>`ERROR: ${e}`),
  '',
  `Advertencias: ${warnings.length}`,
  ...warnings.map(w=>`WARN: ${w}`),
  '',
  errors.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
].join('\n');
fs.writeFileSync(txtPath,txt,'utf8');
console.log(txt);
process.exit(errors.length ? 1 : 0);
