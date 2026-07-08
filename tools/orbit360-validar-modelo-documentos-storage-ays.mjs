#!/usr/bin/env node
/**
 * Orbit 360 A&S — validador plan-only de documentos + Storage futuro + adjuntos.
 * No lee archivos reales, no escribe Firestore, no usa red, no contiene datos reales.
 */

const ALLOWED_SOURCE_TYPES = new Set([
  'documentos_soporte',
  'pago_reportado',
  'estado_cuenta_bancario',
  'planilla_aseguradora',
  'planilla_comisiones',
  'poliza_emitida',
  'dpi_nit_cliente',
  'tarjeta_circulacion',
  'recibo_pago',
  'siniestro_soporte'
]);

const ALLOWED_COLLECTIONS = new Set([
  'documentos',
  'adjuntos',
  'parchesPendientes',
  'gestiones',
  'conciliaciones',
  'auditLog',
  'auditoria'
]);

const PROHIBITED_DIRECT_WRITES = new Set([
  'clientes',
  'polizas',
  'cobros',
  'cartera',
  'finmovs',
  'produccion',
  'recibos'
]);

const VALID_DOC_STATES = new Set([
  'recibido',
  'en_revision',
  'propuesta_datos',
  'requiere_validacion',
  'aprobado_para_expediente',
  'rechazado',
  'archivado',
  'bloqueado'
]);

function hasPayloadLike(value) {
  if (!value || typeof value !== 'object') return false;
  const keys = Object.keys(value);
  return keys.some((key) => /rows|filas|payload|base64|fileBytes|bytes|rawContent|contenidoArchivo|publicUrl|downloadUrl|token|secret|password|credential/i.test(key));
}

function walkForPayload(value, path = '$', hits = []) {
  if (!value || typeof value !== 'object') return hits;
  if (hasPayloadLike(value)) hits.push(path);
  for (const [k, v] of Object.entries(value)) {
    if (v && typeof v === 'object') walkForPayload(v, `${path}.${k}`, hits);
  }
  return hits;
}

function validatePaisMoneda(plan, errors, warnings) {
  const pais = plan.pais || plan.country;
  const moneda = plan.moneda || plan.currency;
  const moneyRelated = plan.money_related === true || ['pago_reportado', 'estado_cuenta_bancario', 'planilla_aseguradora', 'planilla_comisiones', 'recibo_pago', 'poliza_emitida'].includes(plan.source_type);

  if (!moneyRelated) return;
  if (!pais) warnings.push('Falta pais para flujo monetario/documental relacionado con dinero; debe quedar requiere_validacion.');
  if (!moneda) warnings.push('Falta moneda para flujo monetario/documental relacionado con dinero; debe quedar requiere_validacion.');
  if (pais === 'GT' && moneda && moneda !== 'GTQ') errors.push('Pais GT requiere moneda GTQ.');
  if (pais === 'CO' && moneda && moneda !== 'COP') errors.push('Pais CO requiere moneda COP.');
}

export function validarModeloDocumentosStorage(plan = {}) {
  const errors = [];
  const warnings = [];

  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
    return { ok: false, status: 'bloqueado', errors: ['Plan inválido: se esperaba objeto.'], warnings: [] };
  }

  if (!plan.tenantId) warnings.push('Falta tenantId metadata-only; obligatorio antes de LAB.');

  if (!ALLOWED_SOURCE_TYPES.has(plan.source_type)) {
    errors.push(`source_type no permitido: ${plan.source_type || 'S/D'}`);
  }

  const payloadHits = walkForPayload(plan);
  if (payloadHits.length) {
    errors.push(`El plan contiene posibles filas/payload/secretos/archivo embebido en: ${payloadHits.join(', ')}`);
  }

  const targetCollections = Array.isArray(plan.target_collections) ? plan.target_collections : [];
  if (!targetCollections.length) warnings.push('No se declararon target_collections; debe declararse destino plan-only.');

  for (const col of targetCollections) {
    if (PROHIBITED_DIRECT_WRITES.has(col)) errors.push(`Destino prohibido para documentos/adjuntos sin diff aprobado: ${col}`);
    else if (!ALLOWED_COLLECTIONS.has(col)) warnings.push(`Destino no reconocido; requiere revisión: ${col}`);
  }

  if (plan.write_enabled === true) errors.push('write_enabled=true está prohibido en contrato plan-only.');
  if (plan.apply_to_master === true) errors.push('apply_to_master=true está prohibido sin diff aprobado y autorización explícita.');
  if (plan.aplicarPago === true || plan.pagoAplicado === true) errors.push('El documento/soporte no puede aplicar pago directamente.');
  if (plan.crearCobro === true || plan.crearCartera === true) errors.push('El documento/soporte no puede crear cobro/cartera directamente.');

  validatePaisMoneda(plan, errors, warnings);

  if (plan.document_state && !VALID_DOC_STATES.has(plan.document_state)) {
    warnings.push(`Estado documental no estándar: ${plan.document_state}`);
  }

  if (plan.storage && typeof plan.storage === 'object') {
    if (plan.storage.connected === true && !plan.storage.contract_only) {
      warnings.push('Storage marcado como conectado; verificar que no se esté prometiendo conexión real sin autorización.');
    }
    if (plan.storage.publicUrl || plan.storage.downloadUrl) errors.push('No se permiten URLs públicas/descarga en contrato plan-only.');
    if (plan.storage.base64 || plan.storage.fileBytes) errors.push('No se permite contenido de archivo/base64 en repo.');
  }

  const relations = Array.isArray(plan.relations) ? plan.relations : [];
  for (const rel of relations) {
    if (!rel || typeof rel !== 'object') continue;
    if (PROHIBITED_DIRECT_WRITES.has(rel.direct_write_collection)) {
      errors.push(`Relación intenta escritura directa prohibida: ${rel.direct_write_collection}`);
    }
    if (rel.tipo === 'cliente' && rel.apply_without_diff === true) errors.push('Relación cliente no puede aplicarse sin diff.');
    if (rel.tipo === 'poliza' && rel.apply_without_diff === true) errors.push('Relación póliza no puede aplicarse sin diff.');
    if (rel.tipo === 'cobro' && rel.aplicarPago === true) errors.push('Relación cobro no puede aplicar pago desde documento.');
  }

  const status = errors.length ? 'bloqueado' : warnings.length ? 'requiere_validacion' : 'listo_plan_only';
  return {
    ok: errors.length === 0,
    status,
    errors,
    warnings,
    summary: {
      source_type: plan.source_type || null,
      target_collections: targetCollections,
      storage: plan.storage ? 'declarado' : 'no_declarado',
      relations: relations.length
    }
  };
}

function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.log(JSON.stringify({ ok: false, status: 'bloqueado', errors: ['Uso: node tools/orbit360-validar-modelo-documentos-storage-ays.mjs <plan.json>'], warnings: [] }, null, 2));
    process.exit(1);
  }
  const raw = JSON.parse(require('node:fs').readFileSync(arg, 'utf8'));
  const res = validarModeloDocumentosStorage(raw);
  console.log(JSON.stringify(res, null, 2));
  process.exit(res.ok ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
