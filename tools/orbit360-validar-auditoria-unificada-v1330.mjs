#!/usr/bin/env node
/**
 * Orbit 360 A&S — validador de auditoría unificada v1330.
 * Uso:
 *   node tools/orbit360-validar-auditoria-unificada-v1330.mjs <audit.json>
 *
 * No usa red. No escribe Firestore. No modifica archivos.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const schemaPath = path.join(ROOT, 'orbit360-platform/docs/AUDITORIA-UNIFICADA-SCHEMA-V1330.json');
const fileArg = process.argv[2];

function loadJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function walkForbidden(obj, forbidden, base = '$', hits = []) {
  if (!obj || typeof obj !== 'object') return hits;
  for (const [k, v] of Object.entries(obj)) {
    if (forbidden.some(f => f.toLowerCase() === k.toLowerCase())) hits.push(`${base}.${k}`);
    if (v && typeof v === 'object') walkForbidden(v, forbidden, `${base}.${k}`, hits);
    if (typeof v === 'string') {
      if (/-----BEGIN (RSA |EC |OPENSSH |PRIVATE )?KEY-----/.test(v)) hits.push(`${base}.${k}:private_key_value`);
      if (/data:(application\/pdf|image\/[a-z]+);base64,/i.test(v)) hits.push(`${base}.${k}:base64_value`);
      if (/AIza[0-9A-Za-z\-_]{20,}/.test(v)) hits.push(`${base}.${k}:api_key_like_value`);
    }
  }
  return hits;
}
function validateAudit(entry, schema) {
  const errors = [];
  const warnings = [];
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return { ok: false, status: 'bloqueado', errors: ['Entrada inválida: se esperaba objeto.'], warnings: [] };

  for (const f of schema.requiredFields) {
    if (entry[f] === undefined || entry[f] === null || entry[f] === '') errors.push(`Falta campo requerido: ${f}`);
  }
  if (entry.tenantId && typeof entry.tenantId !== 'string') errors.push('tenantId debe ser string.');
  if (entry.fecha && Number.isNaN(Date.parse(entry.fecha))) errors.push('fecha debe ser ISO/date parseable.');
  if (entry.categoria && !schema.categories.includes(entry.categoria)) errors.push(`categoria no permitida: ${entry.categoria}`);
  if (entry.severidad && !schema.severities.includes(entry.severidad)) errors.push(`severidad no permitida: ${entry.severidad}`);
  if (entry.resultado && !schema.results.includes(entry.resultado)) warnings.push(`resultado no estándar: ${entry.resultado}`);

  if (entry.motivo && typeof entry.motivo === 'string' && entry.motivo.trim().length < 5) errors.push('motivo debe ser claro, mínimo 5 caracteres.');
  if (entry.severidad === 'critical' && entry.confirmacion !== true) errors.push('severidad critical requiere confirmacion=true.');
  if (schema.criticalActionsRequireConfirmation.includes(entry.accion) && entry.confirmacion !== true) errors.push(`acción crítica requiere confirmación: ${entry.accion}`);

  if (entry.pais && entry.moneda && schema.moneyRules[entry.pais] && schema.moneyRules[entry.pais] !== entry.moneda) {
    errors.push(`Moneda incoherente: ${entry.pais} requiere ${schema.moneyRules[entry.pais]}, recibido ${entry.moneda}`);
  }
  if ((entry.categoria === 'cobro' || entry.categoria === 'conciliacion' || entry.categoria === 'finanzas') && (!entry.pais || !entry.moneda)) {
    warnings.push('Flujo financiero sin pais/moneda; debe quedar requiere_validacion si aplica.');
  }

  const forbiddenHits = walkForbidden(entry, schema.forbiddenKeys || []);
  if (forbiddenHits.length) errors.push(`Campos/valores prohibidos en auditoría: ${forbiddenHits.join(', ')}`);

  if (entry.before && typeof entry.before === 'object') {
    const beforeSize = JSON.stringify(entry.before).length;
    if (beforeSize > 4000) warnings.push('before demasiado grande; debe minimizarse.');
  }
  if (entry.after && typeof entry.after === 'object') {
    const afterSize = JSON.stringify(entry.after).length;
    if (afterSize > 4000) warnings.push('after demasiado grande; debe minimizarse.');
  }

  if (entry.resultado === 'bloqueado' && (!Array.isArray(entry.bloqueos) || entry.bloqueos.length === 0)) errors.push('resultado=bloqueado requiere bloqueos[].');
  if (Array.isArray(entry.bloqueos)) {
    for (const b of entry.bloqueos) if (!schema.blockedReasons.includes(b)) warnings.push(`bloqueo no estándar: ${b}`);
  }

  const status = errors.length ? 'bloqueado' : warnings.length ? 'ok_con_warnings' : 'ok';
  return { ok: errors.length === 0, status, errors, warnings };
}

if (!fs.existsSync(schemaPath)) {
  console.log(JSON.stringify({ ok: false, status: 'bloqueado', errors: [`Falta schema: ${schemaPath}`], warnings: [] }, null, 2));
  process.exit(1);
}
if (!fileArg) {
  console.log(JSON.stringify({ ok: false, status: 'bloqueado', errors: ['Uso: node tools/orbit360-validar-auditoria-unificada-v1330.mjs <audit.json>'], warnings: [] }, null, 2));
  process.exit(1);
}

let schema, payload;
try { schema = loadJson(schemaPath); payload = loadJson(path.resolve(fileArg)); }
catch (e) {
  console.log(JSON.stringify({ ok: false, status: 'bloqueado', errors: [`JSON inválido: ${e.message}`], warnings: [] }, null, 2));
  process.exit(1);
}

const entries = Array.isArray(payload) ? payload : [payload];
const all = entries.map(e => validateAudit(e, schema));
const errors = all.flatMap((r, i) => r.errors.map(x => `[${i}] ${x}`));
const warnings = all.flatMap((r, i) => r.warnings.map(x => `[${i}] ${x}`));
const result = {
  ok: errors.length === 0,
  status: errors.length ? 'bloqueado' : warnings.length ? 'ok_con_warnings' : 'ok',
  entries: entries.length,
  errors,
  warnings
};
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
