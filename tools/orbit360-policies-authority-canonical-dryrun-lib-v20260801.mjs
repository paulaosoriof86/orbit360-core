'use strict';
import {sharedClassification, sha, text} from './orbit360-policies-dual-path-provenance-lib-v20260801.mjs';

function nonEmpty(value) {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

function boolish(value) {
  if (value === true || value === false) return value;
  const clean = text(value).toLowerCase();
  if (['true','si','sí','yes','1'].includes(clean)) return true;
  if (['false','no','0'].includes(clean)) return false;
  return null;
}

export function validationCategory(data) {
  const requires = boolish(data && data.requiereValidacion);
  const status = text(data && (data.validationStatus || data.estadoValidacion)).toLowerCase();
  const quality = [data && data.motivosCalidad, data && data.motivoCalidad, data && data.alertasCalidad, data && data.motivosPendientes, data && data.calidad_datos].some(nonEmpty);
  if (requires === true || quality || /(requiere|hold|pendiente|review|validacion)/.test(status)) return 'REQUIRES_VALIDATION';
  if (requires === false || /(validado|aprobado|pass|ok|complete)/.test(status)) return 'VALIDATED_OR_CLEAR';
  return 'UNKNOWN';
}

export function seedLike(data) {
  const seed = boolish(data && data._seed);
  const marker = [data && data._loadedBy, data && data.origen, data && data.sourceType, data && data.origenRegistro].map(text).join(' ').toLowerCase();
  return seed === true || /(seed|demo|prototype|prototipo|bootstrap|sample|mock)/.test(marker);
}

function primitives(value, prefix = '', output = []) {
  if (value === null || value === undefined) return output;
  if (typeof value.toDate === 'function') return output;
  if (typeof value.path === 'string' && value.constructor && /DocumentReference/i.test(value.constructor.name)) {
    output.push({path: prefix, value: value.path});
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => primitives(item, `${prefix}[${index}]`, output));
    return output;
  }
  if (typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) primitives(child, prefix ? `${prefix}.${key}` : key, output);
    return output;
  }
  output.push({path: prefix, value});
  return output;
}

function normalizeRef(value) {
  const raw = text(value);
  if (!raw) return '';
  if (raw.includes('/')) return raw.split('/').filter(Boolean).pop() || raw;
  return raw;
}

export function batchReferences(data) {
  const refs = new Set();
  for (const item of primitives(data)) {
    if (/(?:import.*batch.*id|batch.*id|importBatchId)/i.test(item.path)) {
      const ref = normalizeRef(item.value);
      if (ref) refs.add(ref);
    }
  }
  return [...refs].sort();
}

export function batchReferencePlan(data, batchIndex) {
  const counts = {NORMALIZE: 0, OMIT: 0, HOLD: 0, NONE: 0};
  const refs = batchReferences(data);
  if (!refs.length) counts.NONE = 1;
  for (const ref of refs) {
    if (batchIndex.canonical.has(ref)) counts.OMIT++;
    else if (batchIndex.legacy.has(ref)) counts.NORMALIZE++;
    else counts.HOLD++;
  }
  return {refs: refs.length, counts};
}

const RELATION_RULES = {
  polizas: [
    {group: 'cliente', parents: ['clientes'], pattern: /(cliente|contratante|asegurado|customer|client)/i},
    {group: 'aseguradora', parents: ['aseguradoras'], pattern: /(aseguradora|insurer|compania|company)/i}
  ],
  vehiculos: [
    {group: 'poliza', parents: ['polizas'], pattern: /(poliza|policy)/i}
  ],
  recibosEsperados: [
    {group: 'poliza', parents: ['polizas'], pattern: /(poliza|policy)/i}
  ],
  carteraPrimas: [
    {group: 'poliza_o_recibo', parents: ['polizas','recibosEsperados'], pattern: /(poliza|policy|recibo|receipt)/i}
  ],
  cobros: [
    {group: 'poliza_o_recibo', parents: ['polizas','recibosEsperados'], pattern: /(poliza|policy|recibo|receipt)/i}
  ]
};

function relationGroup(data, rule, parentSets) {
  const values = primitives(data);
  const known = new Set();
  for (const parent of rule.parents) for (const id of parentSets[parent] || []) known.add(id);
  const patterned = values.filter(item => rule.pattern.test(item.path));
  const candidates = new Set();
  for (const item of patterned) {
    const ref = normalizeRef(item.value);
    if (known.has(ref)) candidates.add(ref);
  }
  if (!candidates.size) {
    for (const item of values) {
      const ref = normalizeRef(item.value);
      if (known.has(ref)) candidates.add(ref);
    }
  }
  if (candidates.size === 1) return {status: 'RESOLVED', matches: 1};
  if (candidates.size > 1) return {status: 'AMBIGUOUS', matches: candidates.size};
  const hasReferenceValue = patterned.some(item => nonEmpty(item.value));
  return {status: hasReferenceValue ? 'UNRESOLVED' : 'MISSING', matches: 0};
}

export function relationshipAudit(collection, data, parentSets) {
  const rules = RELATION_RULES[collection] || [];
  const groups = {};
  let resolved = 0;
  let blocked = 0;
  for (const rule of rules) {
    const state = relationGroup(data, rule, parentSets);
    groups[rule.group] = state.status;
    if (state.status === 'RESOLVED') resolved++;
    else blocked++;
  }
  return {requiredGroups: rules.length, resolvedGroups: resolved, blockedGroups: blocked, eligible: blocked === 0, groups};
}

export function planDocument({collection, id, legacyData, canonicalData, presence, batchIndex, parentSets}) {
  if (presence === 'CANONICAL_ONLY') {
    return {
      action: 'HOLD',
      reason: seedLike(canonicalData) ? 'QUARANTINE_CANONICAL_SEED_NO_DELETE' : 'CANONICAL_ONLY_REQUIRES_REVIEW',
      validation: validationCategory(canonicalData),
      relationship: {requiredGroups: 0, resolvedGroups: 0, blockedGroups: 0, eligible: true, groups: {}},
      batch: batchReferencePlan(canonicalData, batchIndex)
    };
  }

  const validation = validationCategory(legacyData);
  const relationship = relationshipAudit(collection, legacyData, parentSets);
  const batch = batchReferencePlan(legacyData, batchIndex);

  if (presence === 'SHARED') {
    const shared = sharedClassification(collection, canonicalData, legacyData);
    if (shared.category === 'EQUIVALENT_PROJECTION' || shared.category === 'EQUIVALENT_PROJECTION_LEGACY_PROVENANCE_ONLY') {
      return {action: 'OMIT', reason: 'CANONICAL_BUSINESS_PROJECTION_ALREADY_EQUIVALENT', validation, relationship, batch};
    }
    if (!relationship.eligible) return {action: 'HOLD', reason: 'RELATIONSHIP_NOT_EXACT', validation, relationship, batch};
    return {action: 'UPDATE', reason: shared.category, validation, relationship, batch};
  }

  if (['clientes','aseguradoras'].includes(collection) && validation === 'REQUIRES_VALIDATION') {
    return {action: 'HOLD', reason: 'PRESERVE_ADDITIONAL_REQUIRES_VALIDATION', validation, relationship, batch};
  }
  if (!relationship.eligible) return {action: 'HOLD', reason: 'RELATIONSHIP_NOT_EXACT', validation, relationship, batch};
  return {action: 'CREATE', reason: validation === 'REQUIRES_VALIDATION' ? 'CREATE_PRESERVING_REQUIRES_VALIDATION' : 'CREATE_SOURCE_BACKED', validation, relationship, batch};
}

export function accumulatePlan(target, plan) {
  target.actions[plan.action] = (target.actions[plan.action] || 0) + 1;
  target.reasons[plan.reason] = (target.reasons[plan.reason] || 0) + 1;
  target.validation[plan.validation] = (target.validation[plan.validation] || 0) + 1;
  for (const [key, count] of Object.entries(plan.batch.counts)) target.batchReferences[key] = (target.batchReferences[key] || 0) + count;
  for (const [group, status] of Object.entries(plan.relationship.groups || {})) {
    const key = `${group}:${status}`;
    target.relationships[key] = (target.relationships[key] || 0) + 1;
  }
}

export function planDigest(rows) {
  return sha(rows.sort().join('\n'));
}
