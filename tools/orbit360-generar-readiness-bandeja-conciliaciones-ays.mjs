#!/usr/bin/env node
/* Orbit 360 · A&S readiness generator for conciliaciones UI/bandeja
   Synthetic or mirror input. No writes. No payment application.

   Usage:
     node tools/orbit360-generar-readiness-bandeja-conciliaciones-ays.mjs
     node tools/orbit360-generar-readiness-bandeja-conciliaciones-ays.mjs --mirror _orbit360_reports/LAB-MIRROR-CONCILIACIONES-AYS.local.json
*/
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
const VERSION = 'v1.0.0-ays-readiness-bandeja-conciliaciones';
const TENANT = 'alianzas-soluciones';
const REPORT_DIR = path.join(root, '_orbit360_reports');
const VALID_QUEUE = new Set(['PROPUESTA','EN_REVISION','VALIDADA','RECHAZADA','BLOQUEADA','ANULADA','APLICADA']);
const VALID_REVIEW = new Set(['PENDIENTE','REQUIERE_VALIDACION','VALIDADA','RECHAZADA','BLOQUEADA']);
const SCORE_DECISIONS = new Set(['MATCH_EXACTO','MATCH_PROBABLE','REQUIERE_VALIDACION','BLOQUEADO']);
const COUNTRIES = { GT:'GTQ', CO:'COP' };
const REQUIRED_COLUMNS = [
  'estado_bandeja','estado_revision','score','decision_score','fuente','archivo','fila','pais_moneda','cliente_poliza_recibo','monto','accion_propuesta','responsable','ultima_actualizacion','acciones_permitidas','bloqueos'
];
const ACTION_MATRIX = {
  PROPUESTA: ['ver_detalle','tomar_en_revision','bloquear','anular'],
  EN_REVISION: ['ver_detalle','validar','rechazar','bloquear','anular'],
  VALIDADA: ['ver_detalle','preparar_aplicacion_controlada','rechazar','anular'],
  RECHAZADA: ['ver_detalle'],
  BLOQUEADA: ['ver_detalle'],
  ANULADA: ['ver_detalle'],
  APLICADA: ['ver_detalle']
};
const BLOCKED_ACTIONS_ALWAYS = ['aplicar_pago_directo','marcar_cobro_pagado_desde_bandeja','mutar_cobros_sin_transicion','editar_payload_fuente','cambiar_moneda_sin_validacion','mezclar_fuentes'];

function argValue(flag, def=null){ const i = args.indexOf(flag); return i >= 0 ? args[i+1] : def; }
function str(v){ return v === undefined || v === null ? '' : String(v).trim(); }
function num(v, fallback=null){ const n = Number(v); return Number.isFinite(n) ? n : fallback; }
function readJson(file){ return JSON.parse(fs.readFileSync(file,'utf8')); }
function writeJson(file, data){ fs.mkdirSync(path.dirname(file), {recursive:true}); fs.writeFileSync(file, JSON.stringify(data,null,2), 'utf8'); }
function asArray(v){ return Array.isArray(v) ? v : (v ? [v] : []); }
function rel(file){ return path.relative(root, file).replace(/\\/g, '/'); }
function now(){ return new Date().toISOString(); }
function sampleMirror(){
  return {
    meta: { tenant_id:TENANT, synthetic:true, createdAt:now() },
    conciliaciones: [
      { id:'ready_conc_001', proposal_id:'ready_conc_001', tenant_id:TENANT, queue_state:'PROPUESTA', review_state:'PENDIENTE', score:96, score_decision:'MATCH_EXACTO', source_type:'planilla_comisiones', source_ref:{file:'SINTETICO-PLANILLA.xlsx', sheet:'Junio', row_ref:'row-001'}, country:'GT', currency:'GTQ', proposed_action:'PROPONER_APLICACION_CON_CONFIRMACION', links:{cliente_id:'cliente_demo', poliza_id:'poliza_demo', cobro_id:'cobro_demo'}, amount:{value:1200,currency:'GTQ'}, updatedAt:now() },
      { id:'ready_conc_002', proposal_id:'ready_conc_002', tenant_id:TENANT, queue_state:'EN_REVISION', review_state:'REQUIERE_VALIDACION', score:72, score_decision:'MATCH_PROBABLE', source_type:'estado_cuenta_bancario', source_ref:{file:'SINTETICO-BANCO.xlsx', sheet:'Banco', row_ref:'row-002'}, country:'CO', currency:'COP', proposed_action:'ENVIAR_A_BANDEJA_VALIDACION', links:{cliente_id:'cliente_demo_co', poliza_id:'poliza_demo_co'}, amount:{value:450000,currency:'COP'}, assignee:'operaciones', updatedAt:now() },
      { id:'ready_conc_003', proposal_id:'ready_conc_003', tenant_id:TENANT, queue_state:'BLOQUEADA', review_state:'BLOQUEADA', score:20, score_decision:'BLOQUEADO', source_type:'cobros_realizados', source_ref:{file:'SINTETICO-COBROS.xlsx', sheet:'Cobros', row_ref:'row-003'}, country:'GT', currency:'GTQ', proposed_action:'NO_APLICAR', links:{}, amount:{value:100,currency:'GTQ'}, updatedAt:now() }
    ],
    auditLog: []
  };
}
function loadMirror(file){
  if(!file) return sampleMirror();
  const data = readJson(path.resolve(root,file));
  data.conciliaciones = asArray(data.conciliaciones || data.items || data.proposals);
  data.auditLog = asArray(data.auditLog || data.audit || []);
  data.meta = data.meta || {};
  return data;
}
function amountLabel(item){
  const amt = item.amount || item.monto || {};
  const value = num(amt.value ?? amt.monto ?? item.amount_value ?? item.monto_valor, null);
  const currency = str(amt.currency || item.currency || item.moneda);
  if(value === null) return '—';
  return `${currency || 'MONEDA?'} ${value}`;
}
function linksLabel(item){
  const links = item.links || item.relations || {};
  const parts = [];
  if(links.cliente_id) parts.push(`cliente:${links.cliente_id}`);
  if(links.poliza_id) parts.push(`poliza:${links.poliza_id}`);
  if(links.cobro_id) parts.push(`cobro:${links.cobro_id}`);
  if(links.comision_id) parts.push(`comision:${links.comision_id}`);
  return parts.join(' · ') || 'sin vínculo operativo';
}
function validateItem(item){
  const errors=[]; const warnings=[];
  const id = str(item.id || item.proposal_id || item.proposalId);
  const tenant = str(item.tenant_id || item.tenantId);
  const q = str(item.queue_state || item.estado_bandeja || item.estado);
  const r = str(item.review_state || item.estado_revision);
  const score = num(item.score ?? item.confidence_score ?? item.confidenceScore, null);
  const decision = str(item.score_decision || item.decision || item.resultado_score);
  const country = str(item.country || item.pais);
  const currency = str(item.currency || item.moneda || item.amount?.currency);
  const sourceRef = item.source_ref || item.sourceRef || {};
  if(!id) errors.push('Falta id/proposal_id.');
  if(tenant !== TENANT) errors.push(`Tenant inválido: ${tenant || 'S/D'}.`);
  if(!VALID_QUEUE.has(q)) errors.push(`queue_state inválido: ${q || 'S/D'}.`);
  if(r && !VALID_REVIEW.has(r)) warnings.push(`review_state no estándar: ${r}.`);
  if(score === null || score < 0 || score > 100) errors.push('Score inválido o faltante.');
  if(!SCORE_DECISIONS.has(decision)) errors.push(`score_decision inválido: ${decision || 'S/D'}.`);
  if(!country || !currency) errors.push('Falta país/moneda.');
  if(country && currency && COUNTRIES[country] && COUNTRIES[country] !== currency) errors.push(`País/moneda incoherente: ${country}/${currency}.`);
  if(!str(item.source_type || item.sourceType)) errors.push('Falta source_type.');
  if(!str(sourceRef.file || sourceRef.archivo)) errors.push('Falta source_ref.file.');
  if(!str(sourceRef.row_ref || sourceRef.fila || sourceRef.row_hash)) errors.push('Falta source_ref.row_ref/fila.');
  if(q === 'VALIDADA') warnings.push('VALIDADA requiere validación de transición antes de preparar aplicación controlada.');
  if(q === 'APLICADA') errors.push('La bandeja readiness no debe presentar APLICADA como acción disponible; solo histórico/consulta.');
  if(decision === 'BLOQUEADO' && q !== 'BLOQUEADA') warnings.push('score_decision BLOQUEADO debería estar en queue_state BLOQUEADA.');
  return { errors, warnings };
}
function rowFor(item){
  const q = str(item.queue_state || item.estado_bandeja || item.estado);
  const r = str(item.review_state || item.estado_revision || 'PENDIENTE');
  const sourceRef = item.source_ref || item.sourceRef || {};
  const validation = validateItem(item);
  const actions = ACTION_MATRIX[q] || ['ver_detalle'];
  const blocks = BLOCKED_ACTIONS_ALWAYS.slice();
  if(q !== 'VALIDADA') blocks.push('preparar_aplicacion_controlada');
  if(q === 'BLOQUEADA' || q === 'RECHAZADA' || q === 'ANULADA') blocks.push('cambiar_estado_sin_reapertura_formal');
  return {
    id: str(item.id || item.proposal_id || item.proposalId),
    estado_bandeja: q || 'S/D',
    estado_revision: r || 'S/D',
    score: num(item.score ?? item.confidence_score ?? item.confidenceScore, null),
    decision_score: str(item.score_decision || item.decision || item.resultado_score),
    fuente: str(item.source_type || item.sourceType),
    archivo: str(sourceRef.file || sourceRef.archivo),
    fila: str(sourceRef.row_ref || sourceRef.fila || sourceRef.row_hash),
    pais_moneda: `${str(item.country || item.pais) || 'S/D'}/${str(item.currency || item.moneda || item.amount?.currency) || 'S/D'}`,
    cliente_poliza_recibo: linksLabel(item),
    monto: amountLabel(item),
    accion_propuesta: str(item.proposed_action || item.accion_propuesta),
    responsable: str(item.assignee || item.responsable || item.ownerEmail || 'Sin asignar'),
    ultima_actualizacion: str(item.updatedAt || item.updated_at || item.createdAt || 'S/D'),
    acciones_permitidas: actions,
    bloqueos: blocks,
    validation
  };
}

const mirrorArg = argValue('--mirror');
const outArg = argValue('--out');
const errors=[]; const warnings=[];
let mirror=null;
try { mirror = loadMirror(mirrorArg); }
catch(e){ errors.push(`No se pudo leer mirror: ${e.message}`); mirror = sampleMirror(); }
const rows = mirror.conciliaciones.map(rowFor);
for(const row of rows){
  errors.push(...row.validation.errors.map((e)=>`${row.id || 'S/D'}: ${e}`));
  warnings.push(...row.validation.warnings.map((w)=>`${row.id || 'S/D'}: ${w}`));
}
if(!rows.length) errors.push('No hay conciliaciones para readiness.');
const missingColumns = REQUIRED_COLUMNS.filter((c)=>!rows.every((r)=>Object.prototype.hasOwnProperty.call(r,c)));
if(missingColumns.length) errors.push(`Faltan columnas readiness: ${missingColumns.join(', ')}`);
const stateCounts = rows.reduce((acc,row)=>{ acc[row.estado_bandeja]=(acc[row.estado_bandeja]||0)+1; return acc; },{});
const actionCounts = rows.reduce((acc,row)=>{ row.acciones_permitidas.forEach((a)=>acc[a]=(acc[a]||0)+1); return acc; },{});
const decision = errors.length ? 'READINESS_BLOQUEADO' : (warnings.length ? 'READINESS_OK_CON_ADVERTENCIAS' : 'READINESS_OK');
fs.mkdirSync(REPORT_DIR, {recursive:true});
const stamp = now().replace(/[:.]/g,'-');
const jsonPath = outArg ? path.resolve(root,outArg) : path.join(REPORT_DIR, `READINESS-BANDEJA-CONCILIACIONES-AYS-${stamp}.json`);
const txtPath = path.join(REPORT_DIR, `READINESS-BANDEJA-CONCILIACIONES-AYS-${stamp}.txt`);
const report = {
  version: VERSION,
  created_at: now(),
  source_mirror: mirrorArg || 'synthetic-default',
  tenant_id: TENANT,
  decision,
  required_columns: REQUIRED_COLUMNS,
  action_matrix: ACTION_MATRIX,
  blocked_actions_always: BLOCKED_ACTIONS_ALWAYS,
  summary: { total: rows.length, stateCounts, actionCounts, errors: errors.length, warnings: warnings.length },
  rows,
  errors,
  warnings,
  restrictions: ['readiness-only','no writes','no Firestore writes','no payment application','no cobros mutation','no deploy','no merge']
};
writeJson(jsonPath, report);
const txt = [
  '============================================================',
  'ORBIT 360 - READINESS UI/BANDEJA CONCILIACIONES A&S',
  `Version: ${VERSION}`,
  `Fecha: ${report.created_at}`,
  `Fuente: ${mirrorArg || 'synthetic-default'}`,
  `Decision: ${decision}`,
  'Restricciones: readiness-only, sin writes, sin pagos, sin cobros, sin deploy.',
  '============================================================',
  '',
  `Total propuestas: ${rows.length}`,
  `Estados: ${JSON.stringify(stateCounts)}`,
  `Acciones: ${JSON.stringify(actionCounts)}`,
  '',
  'Columnas requeridas:',
  ...REQUIRED_COLUMNS.map((c)=>`- ${c}`),
  '',
  `Errores: ${errors.length}`,
  ...errors.map((e)=>`ERROR: ${e}`),
  '',
  `Advertencias: ${warnings.length}`,
  ...warnings.map((w)=>`WARN: ${w}`),
  '',
  errors.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
].join('\n');
fs.writeFileSync(txtPath, txt, 'utf8');
console.log(txt);
process.exit(errors.length ? 1 : 0);
