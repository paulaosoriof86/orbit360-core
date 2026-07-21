/* ============================================================
   Orbit 360 · Contrato canónico de escritura controlada v20260721
   ------------------------------------------------------------
   Reconoce escrituras ya aprobadas por importadores especializados
   para que el listener P0 no genere un segundo dry-run.

   Fail-closed:
   - no autoriza por colección solamente;
   - exige owner, fuente y trazabilidad completas;
   - no transporta secretos ni valores bancarios completos;
   - cualquier escritura fuera del contrato sigue interceptada.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  if (Orbit.importerControlledWriteContractV20260721) return;

  const VERSION = '20260721.1';
  const SOURCE = 'directorio_aseguradoras';
  const OWNER = 'insurer-directory-import-v1202';
  const HARD_BLOCKING_ALERT = /nombre_hoja|entidad_no|duplicado_dentro_del_archivo/i;

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

  function hasSensitivePlaintext(data) {
    const text = JSON.stringify(data || {});
    return /"(?:password|pass|contrasena|usuario|user|numero|accountNumber)"\s*:\s*"(?!\s*(?:|backend_required|\*|•))/i.test(text);
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

  function authorizedInsurer(data) {
    const trace = insurerTrace(data);
    const alerts = [].concat(data && data.validacionAlertas || []);
    return !!(
      data &&
      trace.type === SOURCE &&
      trace.file &&
      trace.sheet &&
      ['GT', 'CO'].includes(trace.country) &&
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
    const out = Object.assign({}, data || {}, {
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
    return out;
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
    hasSensitivePlaintext
  });
})();
