'use strict';

// Pure contract for a documented administrative correction. The existing
// operational callable owns authorization, transactional reads and persistence.
// This is never a payment, financial recalculation or insurer endorsement.
const crypto = require('node:crypto');
const SCHEMA = 'gravicentra-advisor-assignment-correction-v1';
const MAX_TARGETS = 20;
const PRESERVED_COLLECTIONS = Object.freeze([
  'recibosEsperados', 'carteraPrimas', 'cobros', 'comisiones', 'finmovs', 'vehiculos'
]);
const text = value => String(value == null ? '' : value).trim();
const norm = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const fingerprint = value => crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
function fail(code, message) { const error = new Error(message); error.code = code; throw error; }
function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('INVALID_CORRECTION_CONTRACT', `${label} inválido.`);
  return value;
}
function exactKeys(value, allowed, label) {
  object(value, label);
  if (Object.keys(value).some(key => !allowed.includes(key)))
    fail('CORRECTION_FIELD_NOT_ALLOWED', `${label} contiene un campo fuera de la corrección de asesor.`);
}
function id(value, label) {
  const result = text(value);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{1,255}$/.test(result)) fail('INVALID_CORRECTION_ID', `${label} requerido o inválido.`);
  return result;
}
function hash(value, label) {
  const result = text(value).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(result)) fail('CORRECTION_DIGEST_REQUIRED', `${label} debe ser un SHA-256 válido.`);
  return result;
}
function boundedText(value, min, max, code, label) {
  const result = text(value);
  if (result.length < min || result.length > max || result.includes('\u0000')) fail(code, `${label} requerido o inválido.`);
  return result;
}
function sourceAuthority(raw) {
  exactKeys(raw, ['decisionRef', 'sourceReference', 'sourceSha256', 'lineRef', 'period'], 'Autoridad documental');
  const period = text(raw.period);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) fail('CORRECTION_PERIOD_REQUIRED', 'Indica el periodo documental.');
  return {
    decisionRef: boundedText(raw.decisionRef, 4, 1000, 'CORRECTION_DECISION_REQUIRED', 'Referencia de la decisión de Dirección'),
    sourceReference: boundedText(raw.sourceReference, 1, 1500, 'CORRECTION_SOURCE_REQUIRED', 'Documento fuente'),
    sourceSha256: hash(raw.sourceSha256, 'Digest del documento original'),
    lineRef: boundedText(raw.lineRef, 1, 400, 'CORRECTION_SOURCE_LINE_REQUIRED', 'Hoja o renglón documental'),
    period
  };
}
function normalizeSpec(raw) {
  exactKeys(raw, ['version', 'operation', 'clientId', 'policyIds', 'updateClient', 'targetAdvisorId',
    'reason', 'sourceAuthority', 'expectedBefore', 'expectedPreviewDigest'], 'Corrección');
  if (raw.version !== 1 || !['preview', 'commit'].includes(raw.operation))
    fail('INVALID_CORRECTION_OPERATION', 'Usa previsualización o confirmación de la corrección.');
  if (typeof raw.updateClient !== 'boolean') fail('CORRECTION_CLIENT_SCOPE_REQUIRED', 'Confirma si también se corrige el responsable del cliente.');
  if (!Array.isArray(raw.policyIds) || !raw.policyIds.length || raw.policyIds.length + (raw.updateClient ? 1 : 0) > MAX_TARGETS)
    fail('CORRECTION_TARGET_LIMIT', 'La corrección admite de una a veinte pólizas/clientes explícitos.');
  const policyIds = raw.policyIds.map(value => id(value, 'Póliza')).sort();
  if (new Set(policyIds).size !== policyIds.length) fail('CORRECTION_DUPLICATE_TARGET', 'La lista contiene una póliza repetida.');
  const result = {
    version: 1, operation: raw.operation, clientId: id(raw.clientId, 'Cliente'), policyIds,
    updateClient: raw.updateClient, targetAdvisorId: id(raw.targetAdvisorId, 'Asesor destino'),
    reason: boundedText(raw.reason, 8, 2000, 'CORRECTION_REASON_REQUIRED', 'Motivo de la corrección'),
    sourceAuthority: sourceAuthority(raw.sourceAuthority)
  };
  if (raw.operation === 'commit') {
    if (!Array.isArray(raw.expectedBefore) || raw.expectedBefore.length !== policyIds.length + 1)
      fail('CORRECTION_PREIMAGE_REQUIRED', 'Confirma la previsualización canónica del cliente y cada póliza.');
    const expected = raw.expectedBefore.map(row => {
      exactKeys(row, ['collection', 'id', 'asesorId', 'recordDigest'], 'Imagen previa');
      if (!['clientes', 'polizas'].includes(row.collection) || typeof row.asesorId !== 'string')
        fail('CORRECTION_PREIMAGE_REQUIRED', 'La imagen previa debe identificar cliente/póliza y asesor anterior.');
      return { collection: row.collection, id: id(row.id, 'Registro previo'),
        asesorId: text(row.asesorId), recordDigest: hash(row.recordDigest, 'Imagen previa') };
    }).sort((a, b) => (a.collection + '|' + a.id).localeCompare(b.collection + '|' + b.id));
    const keys = expected.map(row => row.collection + '|' + row.id);
    const wanted = ['clientes|' + result.clientId, ...policyIds.map(value => 'polizas|' + value)].sort();
    if (new Set(keys).size !== keys.length || JSON.stringify(keys.slice().sort()) !== JSON.stringify(wanted))
      fail('CORRECTION_PREIMAGE_TARGET_MISMATCH', 'La previsualización no corresponde exactamente a los registros elegidos.');
    result.expectedBefore = expected;
    result.expectedPreviewDigest = hash(raw.expectedPreviewDigest, 'Previsualización');
  } else if (raw.expectedBefore !== undefined || raw.expectedPreviewDigest !== undefined) {
    fail('CORRECTION_PREVIEW_HAS_PREIMAGE', 'La primera previsualización obtiene las imágenes previas del servidor.');
  }
  return result;
}
function recordDigest(row) { return fingerprint(object(row, 'Registro canónico')); }
function protectedRecordDigest(row) {
  const copy = { ...object(row, 'Registro canónico') };
  delete copy.asesorId;
  return fingerprint(copy);
}
function preservationFingerprints(rows) {
  object(rows, 'Colecciones preservadas');
  return Object.fromEntries(PRESERVED_COLLECTIONS.map(collection => {
    if (!Array.isArray(rows[collection])) fail('CORRECTION_PRESERVATION_READ_REQUIRED', `Falta la lectura autoritativa de ${collection}.`);
    const normalized = rows[collection].map(row => ({ ...object(row, 'Registro preservado'), id: id(row.id, 'Registro preservado') }))
      .sort((a, b) => a.id.localeCompare(b.id));
    if (new Set(normalized.map(row => row.id)).size !== normalized.length)
      fail('CORRECTION_PRESERVATION_DUPLICATE', `La lectura de ${collection} contiene identidades repetidas.`);
    return [collection, { count: normalized.length, digest: fingerprint(normalized) }];
  }));
}
function rowCountry(row) { return text(row.pais || row.country).toUpperCase(); }
function activeAdvisor(row) {
  return row.activo !== false && row.active !== false && row.inactivo !== true &&
    !['inactivo', 'inactive', 'blocked', 'bloqueado', 'suspended', 'suspendido', 'deleted', 'eliminado', 'pending', 'pendiente', 'invited', 'invitado'].includes(norm(row.estado || row.status));
}
function advisorCountries(row) {
  return [...new Set([...(Array.isArray(row.paises) ? row.paises : []), ...(Array.isArray(row.countries) ? row.countries : []),
    row.pais, row.country, row.paisDefault, row.countryDefault].map(value => text(value).toUpperCase()).filter(Boolean))];
}
function buildPlan(raw, context) {
  const spec = normalizeSpec(raw), ctx = object(context, 'Contexto canónico');
  const actor = object(ctx.actor, 'Actor firmado'), tenantId = id(ctx.tenantId, 'Tenant');
  if (!text(actor.uid) || norm(actor.activeRole) !== 'direccion') fail('CORRECTION_DIRECTION_REQUIRED', 'Esta corrección documentada requiere Dirección como rol activo.');
  if (ctx.scopeAuthorized !== true) fail('CORRECTION_SCOPE_REQUIRED', 'El servidor debe confirmar permisos y alcance de todos los registros.');
  const client = object(ctx.client, 'Cliente canónico'), advisor = object(ctx.targetAdvisor, 'Asesor canónico');
  if (text(client.id) !== spec.clientId || text(advisor.id) !== spec.targetAdvisorId)
    fail('CORRECTION_CANONICAL_ID_MISMATCH', 'Cliente o asesor canónico distinto del solicitado.');
  const roles = [...(Array.isArray(advisor.roles) ? advisor.roles : []), ...(Array.isArray(advisor.rolesAsignados) ? advisor.rolesAsignados : []),
    advisor.rol, advisor.role, advisor.rolDefault, advisor.defaultRole].map(norm);
  if (!activeAdvisor(advisor) || !roles.some(role => role === 'asesor' || role === 'comercial'))
    fail('CORRECTION_ADVISOR_NOT_ASSIGNABLE', 'El asesor destino debe estar activo y habilitado en Equipos.');
  if (advisor.canonicalDocumentId && text(advisor.canonicalDocumentId) !== spec.targetAdvisorId)
    fail('CORRECTION_ADVISOR_ALIAS', 'Selecciona el registro canónico del asesor, no un alias histórico.');
  if (!Array.isArray(ctx.policies)) fail('CORRECTION_POLICY_READ_REQUIRED', 'Falta la lectura canónica de las pólizas.');
  const policies = ctx.policies.slice().sort((a, b) => text(a.id) < text(b.id) ? -1 : text(a.id) > text(b.id) ? 1 : 0);
  if (JSON.stringify(policies.map(row => text(row.id))) !== JSON.stringify(spec.policyIds))
    fail('CORRECTION_POLICY_TARGET_MISMATCH', 'La lectura debe contener exactamente las pólizas solicitadas.');
  const allowedCountries = actor.countries ?? actor.member?.countries ?? actor.member?.paises ?? actor.member?.paisesAutorizados;
  if (!Array.isArray(allowedCountries) || !allowedCountries.length)
    fail('CORRECTION_COUNTRY_DENIED', 'La membresía no tiene países autorizados.');
  const countries = advisorCountries(advisor);
  for (const row of [client, ...policies, advisor]) {
    if (row.tenantId && row.tenantId !== tenantId) fail('CORRECTION_TENANT_DENIED', 'Un registro pertenece a otro tenant.');
  }
  for (const policy of policies) {
    if (text(policy.clienteId) !== spec.clientId) fail('CORRECTION_POLICY_CLIENT_CONFLICT', 'Una póliza no pertenece al cliente elegido.');
  }
  for (const row of [client, ...policies]) {
    const country = rowCountry(row);
    if (!['GT', 'CO'].includes(country) || !allowedCountries.includes(country))
      fail('CORRECTION_COUNTRY_DENIED', 'Un registro está fuera de los países autorizados.');
    if ((row !== client || spec.updateClient) && !countries.includes(country))
      fail('CORRECTION_ADVISOR_COUNTRY_CONFLICT', 'El asesor no está habilitado para el país del registro.');
  }
  const records = [{ collection: 'clientes', row: client, selected: spec.updateClient },
    ...policies.map(row => ({ collection: 'polizas', row, selected: true }))];
  const expectedBefore = records.map(({ collection, row }) => ({ collection, id: row.id,
    asesorId: text(row.asesorId), recordDigest: recordDigest(row) }))
    .sort((a, b) => (a.collection + '|' + a.id).localeCompare(b.collection + '|' + b.id));
  if (spec.operation === 'commit' && fingerprint(spec.expectedBefore) !== fingerprint(expectedBefore))
    fail('CORRECTION_STALE_PREIMAGE', 'El cliente o alguna póliza cambió; genera una nueva previsualización.');
  const changes = records.filter(({ row, selected }) => selected && text(row.asesorId) !== spec.targetAdvisorId)
    .map(({ collection, row }) => ({ collection, id: row.id, fromAdvisorId: text(row.asesorId), toAdvisorId: spec.targetAdvisorId,
      patch: { asesorId: spec.targetAdvisorId }, beforeDigest: recordDigest(row),
      afterDigest: recordDigest({ ...row, asesorId: spec.targetAdvisorId }), protectedDigest: protectedRecordDigest(row) }));
  if (!changes.length) fail('CORRECTION_NO_CHANGE', 'Los registros seleccionados ya pertenecen al asesor indicado.');
  const fingerprints = preservationFingerprints(ctx.preservedRows);
  const intent = { clientId: spec.clientId, policyIds: spec.policyIds, updateClient: spec.updateClient,
    targetAdvisorId: spec.targetAdvisorId, reason: spec.reason, sourceAuthority: spec.sourceAuthority };
  const payloadDigest = fingerprint({ tenantId, actorUid: actor.uid, intent });
  const previewDigest = fingerprint({ schemaVersion: SCHEMA, tenantId, actorUid: actor.uid, payloadDigest,
    expectedBefore, changes, preservationFingerprints: fingerprints });
  if (spec.operation === 'commit' && previewDigest !== spec.expectedPreviewDigest)
    fail('CORRECTION_STALE_PREVIEW', 'La fuente, los registros o su historia cambiaron desde la previsualización.');
  return {
    schemaVersion: SCHEMA, tenantId, actorUid: actor.uid, activeRole: 'direccion', intent,
    payloadDigest, previewDigest, expectedBefore, changes, preservationFingerprints: fingerprints,
    sourceProvenance: { kind: 'DIRECTION_DECLARED_DOCUMENTED_CORRECTION', documentAuthenticatedByServer: false },
    readOnly: spec.operation === 'preview', serverOwned: true,
    historicalAssignmentsPreserved: true, financialWrites: 0,
    summary: { policyCount: policies.length, changedPolicyCount: changes.filter(row => row.collection === 'polizas').length,
      clientChanged: changes.some(row => row.collection === 'clientes'), targetAdvisorName: text(advisor.nombre || advisor.displayName || advisor.name || advisor.id) }
  };
}
function verifyReadback(plan, context) {
  if (plan?.schemaVersion !== SCHEMA || !Array.isArray(plan.changes)) fail('CORRECTION_READBACK_PLAN_REQUIRED', 'Plan de corrección no válido.');
  const ctx = object(context, 'Lectura posterior'), rows = [{ collection: 'clientes', row: ctx.client },
    ...(ctx.policies || []).map(row => ({ collection: 'polizas', row }))];
  const byKey = new Map(rows.filter(item => item.row).map(item => [item.collection + '|' + item.row.id, item.row]));
  for (const before of plan.expectedBefore) {
    const row = byKey.get(before.collection + '|' + before.id);
    const change = plan.changes.find(item => item.collection === before.collection && item.id === before.id);
    if (!row || recordDigest(row) !== (change ? change.afterDigest : before.recordDigest))
      fail('CORRECTION_READBACK_MISMATCH', 'La lectura posterior no coincide con la corrección exacta confirmada.');
  }
  const after = preservationFingerprints(ctx.preservedRows);
  if (fingerprint(after) !== fingerprint(plan.preservationFingerprints))
    fail('CORRECTION_PRESERVATION_MISMATCH', 'Cambió un registro financiero o vehículo durante la corrección; se requiere revisión.');
  return { canonicalReadback: true, preservationVerified: true, preservationFingerprints: after,
    financialWrites: 0, historicalAssignmentsPreserved: true };
}

module.exports = Object.freeze({ SCHEMA, MAX_TARGETS, PRESERVED_COLLECTIONS, normalizeSpec, sourceAuthority,
  fingerprint, recordDigest, protectedRecordDigest, preservationFingerprints, buildPlan, verifyReadback });
