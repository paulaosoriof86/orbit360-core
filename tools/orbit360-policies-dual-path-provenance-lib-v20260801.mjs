'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {PROVENANCE_KEYS, VALIDATION_KEYS, TECHNICAL_KEYS, CRITICAL, VISUAL_SEAL} from './orbit360-policies-dual-path-provenance-constants-v20260801.mjs';

export const text = value => String(value == null ? '' : value).trim();
export const sha = value => crypto.createHash('sha256').update(String(value)).digest('hex');
export const safeError = error => text(error && error.message || error)
  .replace(/[\w.+-]+@[\w.-]+/g, '[email]')
  .replace(/[A-Za-z0-9_-]{30,}/g, '[redacted]')
  .slice(0, 600);

export function normalizeRaw(value) {
  if (value === null || value === undefined) return value === undefined ? '__undefined__' : null;
  if (typeof value !== 'object') return value;
  if (typeof value.toDate === 'function') {
    try { return {__timestamp: value.toDate().toISOString()}; } catch {}
  }
  if (typeof value.path === 'string' && value.constructor && /DocumentReference/i.test(value.constructor.name)) {
    return {__reference: value.path};
  }
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return {__bytes: Buffer.from(value).toString('base64')};
  }
  if (Array.isArray(value)) return value.map(normalizeRaw);
  const output = {};
  for (const key of Object.keys(value).sort()) output[key] = normalizeRaw(value[key]);
  return output;
}

export function snapshotRows(snapshot) {
  return snapshot.docs.map(doc => ({id: doc.id, data: doc.data()}));
}

export function compareState(canonicalRows, legacyRows) {
  const cMap = new Map(canonicalRows.map(row => [row.id, sha(JSON.stringify({id: row.id, data: normalizeRaw(row.data)}))]));
  const lMap = new Map(legacyRows.map(row => [row.id, sha(JSON.stringify({id: row.id, data: normalizeRaw(row.data)}))]));
  const canonicalIds = [...cMap.keys()].sort();
  const legacyIds = [...lMap.keys()].sort();
  const canonicalSet = new Set(canonicalIds);
  const legacySet = new Set(legacyIds);
  const shared = canonicalIds.filter(id => legacySet.has(id));
  const onlyCanonicalIds = canonicalIds.filter(id => !legacySet.has(id));
  const onlyLegacyIds = legacyIds.filter(id => !canonicalSet.has(id));
  return {
    canonicalCount: canonicalIds.length,
    legacyCount: legacyIds.length,
    sharedIds: shared.length,
    onlyCanonical: onlyCanonicalIds.length,
    onlyLegacy: onlyLegacyIds.length,
    canonicalIdSetDigest: sha(canonicalIds.join('\n')),
    legacyIdSetDigest: sha(legacyIds.join('\n')),
    canonicalContentDigest: sha(canonicalIds.map(id => `${id}:${cMap.get(id)}`).join('\n')),
    legacyContentDigest: sha(legacyIds.map(id => `${id}:${lMap.get(id)}`).join('\n')),
    shared,
    onlyCanonicalIds,
    onlyLegacyIds
  };
}

function nonEmpty(value) {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

function recursiveSignals(value, output = {source: false, trace: false, batchRefs: new Set()}) {
  if (!value || typeof value !== 'object') return output;
  for (const [key, child] of Object.entries(value)) {
    if ((key === 'sourceRefs' || key === 'sourceRef') && nonEmpty(child)) output.source = true;
    if ((key === 'sourceTrace' || key === 'trace') && nonEmpty(child)) output.trace = true;
    if (/(?:import.*batch.*id|batch.*id|importBatchId)/i.test(key) && nonEmpty(child)) {
      if (Array.isArray(child)) child.forEach(item => output.batchRefs.add(text(item)));
      else output.batchRefs.add(text(child));
    }
    if (child && typeof child === 'object' && typeof child.toDate !== 'function') recursiveSignals(child, output);
  }
  return output;
}

function boolish(value) {
  if (value === true || value === false) return value;
  const clean = text(value).toLowerCase();
  if (['true', 'si', 'sí', 'yes', '1'].includes(clean)) return true;
  if (['false', 'no', '0'].includes(clean)) return false;
  return null;
}

function validationCategory(data) {
  const requires = boolish(data && data.requiereValidacion);
  const status = text(data && (data.validationStatus || data.estadoValidacion)).toLowerCase();
  const quality = [
    data && data.motivosCalidad,
    data && data.motivoCalidad,
    data && data.alertasCalidad,
    data && data.motivosPendientes,
    data && data.calidad_datos
  ].some(nonEmpty);
  if (requires === true || quality || /(requiere|hold|pendiente|review|validacion)/.test(status)) return 'REQUIRES_VALIDATION';
  if (requires === false || /(validado|aprobado|pass|ok|complete)/.test(status)) return 'VALIDATED_OR_CLEAR';
  return 'UNKNOWN';
}

function seedLike(data) {
  const seed = boolish(data && data._seed);
  const marker = [data && data._loadedBy, data && data.origen, data && data.sourceType, data && data.origenRegistro]
    .map(text).join(' ').toLowerCase();
  return seed === true || /(seed|demo|prototype|prototipo|bootstrap|sample|mock)/.test(marker);
}

function routeSignals(data, batchIndex) {
  const recursive = recursiveSignals(data);
  const directSource = [...PROVENANCE_KEYS].some(key => nonEmpty(data && data[key]));
  const refs = [...recursive.batchRefs].filter(Boolean);
  return {
    seedLike: seedLike(data),
    sourceBacked: directSource || recursive.source || recursive.trace,
    sourceRefs: recursive.source,
    sourceTrace: recursive.trace,
    validation: validationCategory(data),
    batchRefCount: refs.length,
    batchResolvedCanonical: refs.filter(ref => batchIndex.canonical.has(ref)).length,
    batchResolvedLegacy: refs.filter(ref => batchIndex.legacy.has(ref)).length,
    batchUnresolved: refs.filter(ref => !batchIndex.canonical.has(ref) && !batchIndex.legacy.has(ref)).length
  };
}

function singleCategory(signal) {
  if (signal.seedLike) return 'SEED_BOOTSTRAP_NON_OPERATIONAL';
  if (signal.sourceBacked && signal.validation === 'REQUIRES_VALIDATION') return 'SOURCE_BACKED_REQUIRES_VALIDATION';
  if (signal.sourceBacked && signal.validation === 'VALIDATED_OR_CLEAR') return 'SOURCE_BACKED_VALIDATED_OR_CLEAR';
  if (signal.sourceBacked) return 'SOURCE_BACKED_VALIDATION_UNKNOWN';
  if (signal.validation === 'REQUIRES_VALIDATION') return 'UNTRACED_REQUIRES_VALIDATION';
  return 'UNTRACED_HOLD';
}

function add(target, key, count = 1) {
  target[key] = (target[key] || 0) + count;
}

export function aggregateSignals(rows, batchIndex) {
  const result = {
    total: rows.length,
    categories: {},
    sourceBacked: 0,
    sourceRefs: 0,
    sourceTrace: 0,
    seedLike: 0,
    validation: {},
    batchRefs: 0,
    batchResolvedCanonical: 0,
    batchResolvedLegacy: 0,
    batchUnresolved: 0
  };
  for (const row of rows) {
    const signal = routeSignals(row.data, batchIndex);
    add(result.categories, singleCategory(signal));
    if (signal.sourceBacked) result.sourceBacked++;
    if (signal.sourceRefs) result.sourceRefs++;
    if (signal.sourceTrace) result.sourceTrace++;
    if (signal.seedLike) result.seedLike++;
    add(result.validation, signal.validation);
    result.batchRefs += signal.batchRefCount;
    result.batchResolvedCanonical += signal.batchResolvedCanonical;
    result.batchResolvedLegacy += signal.batchResolvedLegacy;
    result.batchUnresolved += signal.batchUnresolved;
  }
  return result;
}

function semantic(value, key) {
  if (value === undefined || value === null || value === '') return null;
  if (value && typeof value.toDate === 'function') {
    try { return value.toDate().toISOString(); } catch {}
  }
  if (Array.isArray(value)) return value.map(item => semantic(item, key));
  if (typeof value === 'object') {
    const output = {};
    for (const child of Object.keys(value).sort()) output[child] = semantic(value[child], child);
    return output;
  }
  if (/pais|country/i.test(key)) return text(value).toUpperCase();
  return value;
}

function businessView(data) {
  const output = {};
  for (const key of Object.keys(data || {}).sort()) {
    if (TECHNICAL_KEYS.has(key) || PROVENANCE_KEYS.has(key) || VALIDATION_KEYS.has(key)) continue;
    output[key] = semantic(data[key], key);
  }
  return output;
}

export function sharedClassification(collection, canonical, legacy) {
  const canonicalView = businessView(canonical);
  const legacyView = businessView(legacy);
  const keys = [...new Set([...Object.keys(canonicalView), ...Object.keys(legacyView)])].sort();
  const differences = keys.filter(key => JSON.stringify(canonicalView[key]) !== JSON.stringify(legacyView[key]));
  const critical = CRITICAL[collection] || new Set();
  const criticalDiffs = differences.filter(key => critical.has(key));
  const canonicalProvenance = [...PROVENANCE_KEYS].some(key => nonEmpty(canonical && canonical[key]));
  const legacyProvenance = [...PROVENANCE_KEYS].some(key => nonEmpty(legacy && legacy[key]));
  let category = 'EQUIVALENT_PROJECTION';
  if (criticalDiffs.length) category = 'BUSINESS_CRITICAL_CONFLICT';
  else if (differences.length) category = 'NONCRITICAL_PROJECTION_DIFFERENCE';
  else if (legacyProvenance && !canonicalProvenance) category = 'EQUIVALENT_PROJECTION_LEGACY_PROVENANCE_ONLY';
  return {
    category,
    differences,
    criticalDiffs,
    legacyProvenance,
    canonicalProvenance,
    validationSame: validationCategory(canonical) === validationCategory(legacy)
  };
}

export function recommendation(collection, canonicalAgg, legacyAgg, state, sharedSummary) {
  const reasons = [];
  let route = 'HOLD';
  let confidence = 'LOW';
  if (state.legacyCount > state.canonicalCount) reasons.push('LEGACY_COVERAGE_GREATER');
  if (legacyAgg.sourceBacked > canonicalAgg.sourceBacked) reasons.push('LEGACY_PROVENANCE_GREATER');
  if (canonicalAgg.seedLike > 0) reasons.push('CANONICAL_SEED_MARKERS_PRESENT');
  if (sharedSummary && sharedSummary.legacyProvenanceOnly > 0) reasons.push('CANONICAL_PROJECTION_OMITS_PROVENANCE');
  if (state.canonicalCount === 0 && state.legacyCount > 0) {
    route = 'LEGACY_ROUTE';
    confidence = 'HIGH';
    reasons.push('CANONICAL_COLLECTION_EMPTY');
  } else if (
    state.sharedIds === 0 &&
    state.legacyCount > state.canonicalCount &&
    (state.legacyCount >= Math.max(5, state.canonicalCount * 5) || canonicalAgg.seedLike === state.canonicalCount)
  ) {
    route = 'LEGACY_ROUTE';
    confidence = 'HIGH';
    reasons.push('LEGACY_COMPLETE_NO_ID_OVERLAP');
  } else if (
    state.sharedIds > 0 &&
    state.onlyLegacy > 0 &&
    state.legacyCount >= state.canonicalCount &&
    legacyAgg.sourceBacked >= canonicalAgg.sourceBacked
  ) {
    route = 'LEGACY_ROUTE';
    confidence = state.legacyCount > state.canonicalCount * 2 ? 'HIGH' : 'MEDIUM';
  } else if (state.onlyCanonical > 0 && canonicalAgg.seedLike === state.canonicalCount && state.legacyCount > 0) {
    route = 'LEGACY_ROUTE';
    confidence = 'HIGH';
  }
  return {
    recommendedRoute: route,
    confidence,
    reasons: [...new Set(reasons)].sort(),
    recommendedCanonicalRole: route === 'LEGACY_ROUTE'
      ? (['clientes', 'aseguradoras'].includes(collection)
        ? 'DERIVED_READ_MODEL_AFTER_RECONCILIATION'
        : 'EMPTY_OR_QUARANTINED_UNTIL_CONTROLLED_MIGRATION')
      : 'UNDECIDED',
    authorityDeclared: false,
    binding: false
  };
}

export function visualManifest(root) {
  const roots = [
    'orbit360-platform/index.html',
    'orbit360-platform/modules',
    'orbit360-platform/core',
    'orbit360-platform/styles',
    'orbit360-platform/data'
  ];
  const files = execFileSync('git', ['ls-files', '--', ...roots], {cwd: root, encoding: 'utf8'})
    .split(/\r?\n/).map(text).filter(Boolean).filter(file => !file.includes('/runtime-gate-')).sort();
  const rows = files.map(file => ({file, digest: sha(fs.readFileSync(path.join(root, file)))}));
  const result = {
    trackedFileCount: rows.length,
    pathDigest: sha(rows.map(row => row.file).join('\n')),
    contentDigest: sha(rows.map(row => `${row.file}:${row.digest}`).join('\n')),
    indexDigest: rows.find(row => row.file === 'orbit360-platform/index.html')?.digest || ''
  };
  return {
    ...result,
    expectedTrackedFileCount: VISUAL_SEAL.trackedFileCount,
    expectedPathDigest: VISUAL_SEAL.pathDigest,
    expectedContentDigest: VISUAL_SEAL.contentDigest,
    expectedIndexDigest: VISUAL_SEAL.indexDigest,
    manifestMatches: result.trackedFileCount === VISUAL_SEAL.trackedFileCount &&
      result.pathDigest === VISUAL_SEAL.pathDigest &&
      result.contentDigest === VISUAL_SEAL.contentDigest &&
      result.indexDigest === VISUAL_SEAL.indexDigest,
    noFragmentationContract: true
  };
}
