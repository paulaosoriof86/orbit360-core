/* ============================================================
   Orbit 360 · Contrato canónico de escritura controlada v20260721
   ------------------------------------------------------------
   Reconoce escrituras ya aprobadas por importadores especializados
   para que el listener P0 no genere un segundo dry-run.

   Fail-closed:
   - no autoriza por colección solamente;
   - exige owner, fuente, transición y trazabilidad completas;
   - no transporta secretos ni valores bancarios completos;
   - cualquier escritura fuera del contrato sigue interceptada.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  if (Orbit.importerControlledWriteContractV20260721) return;

  const VERSION = '20260721.2';
  const SOURCE = 'directorio_aseguradoras';
  const OWNER = 'insurer-directory-import-v1202';
  const HARD_BLOCKING_ALERT = /nombre_hoja|entidad_no|duplicado_dentro_del_archivo/i;
  const SENSITIVE_KEYS = new Set(['password', 'pass', 'contrasena', 'usuario', 'user', 'numero', 'accountNumber']);

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function hash(value) {
    const input = clean(value);
    let h = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h >>> 0).toString(36);
  }

  function safeSensitivePlaceholder(value) {
    const text = clean(value);
    if (!text) return true;
    if (text === 'backend_required') return true;
    if (/^[*•●xX\s-]+$/.test(text)) return true;
    return false;
  }

  function hasSensitivePlaintext(data) {
    let found = false;
    function walk(value) {
      if (found || value == null) return;
      if (Array.isArray(value)) {
        value.forEach(walk);
        return;
      }
      if (typeof value !== 'object') return;
      Object.keys(value).forEach((key) => {
        if (found) return;
        const child = value[key];
        if (SENSITIVE_KEYS.has(key) && !safeSensitivePlaceholder(child)) {
          found = true;
          return;
        }
        walk(child);
      });
    }
    walk(data || {});
    return found;
  }

  function insurerTrace(data) {
    const trace = data && data.fuenteDirectorio || {};
    return {
      file: clean(trace.archivo),
      sheet: clean(trace.hoja),
      country: clean(trace.pais),
      type: clean(trace.tipo),
      importedAt: clean(trace.importadoAt)
    };
  }

  function approvedTransition(data) {
    if (!data || Object.prototype.hasOwnProperty.call(data, 'validationStatus')) return false;
    if (!clean(data.id)) return false;
    if (data.importado === true) return true;
    return [].concat(data.actividad || []).some((item) => clean(item && item.cambio) === 'Directorio importado/propuesto');
  }

  function authorizedInsurer(data) {
    const trace = insurerTrace(data);
    const alerts = [].concat(data && data.validacionAlertas || []);
    return !!(
      data &&
      trace.type === SOURCE &&
      trace.file &&
      trace.sheet &&
      ['GT', 'CO'].includes(trace.country) &&
      approvedTransition(data) &&
      data.requiereValidacion !== true &&
      !alerts.some((item) => HARD_BLOCKING_ALERT.test(clean(item))) &&
      !hasSensitivePlaintext(data)
    );
  }

  function authorizedValidationTask(data) {
    return !!(
      data &&
      clean(data.origen) === SOURCE &&
      clean(data.tipo) === 'Validación directorio aseguradoras' &&
      clean(data.estado) === 'Pendiente' &&
      clean(data.titulo) &&
      clean(data.nota)
    );
  }

  function authorizedActivity(data) {
    return !!(
      data &&
      clean(data.fuente) === SOURCE &&
      clean(data.tipo) === 'importacion' &&
      clean(data.titulo) === 'Directorio de aseguradoras importado' &&
      clean(data.detalle)
    );
  }

  function classify(collection, data) {
    const coll = clean(collection);
    if (coll === 'aseguradoras' && authorizedInsurer(data)) return { controlled: true, kind: 'directory_record' };
    if (coll === 'gestiones' && authorizedValidationTask(data)) return { controlled: true, kind: 'validation_task' };
    if (coll === 'actividades' && authorizedActivity(data)) return { controlled: true, kind: 'audit_activity' };
    return { controlled: false, kind: '' };
  }

  function sourceIdentity(collection, data) {
    const type = classify(collection, data);
    if (!type.controlled) return '';
    if (type.kind === 'directory_record') {
      const trace = insurerTrace(data);
      return [SOURCE, trace.file, trace.sheet, trace.country, trace.importedAt].join('|');
    }
    return [SOURCE, clean(data && (data.id || data.titulo)), clean(data && (data.creado || data.fecha))].join('|');
  }

  function canonicalize(collection, data) {
    const result = classify(collection, data);
    if (!result.controlled) return null;
    const identity = sourceIdentity(collection, data);
    return Object.assign({}, data || {}, {
      createdByImport: true,
      importBatchId: clean(data && data.importBatchId) || ('batch_dir_asg_' + hash(identity)),
      sourceType: SOURCE,
      importControl: {
        owner: OWNER,
        contractVersion: VERSION,
        kind: result.kind,
        confirmedBeforeWrite: true
      }
    });
  }

  function evidence(collection, data) {
    const result = classify(collection, data);
    return {
      schemaVersion: 'orbit360-controlled-import-write-evidence-v1',
      contractVersion: VERSION,
      sourceType: SOURCE,
      owner: OWNER,
      collection: clean(collection),
      controlled: result.controlled,
      kind: result.kind,
      hasTrace: !!sourceIdentity(collection, data),
      containsPII: false,
      containsSecrets: false
    };
  }

  Orbit.importerControlledWriteContractV20260721 = Object.freeze({
    version: VERSION,
    sourceType: SOURCE,
    owner: OWNER,
    classify,
    canonicalize,
    evidence,
    hasSensitivePlaintext,
    approvedTransition
  });
})();
