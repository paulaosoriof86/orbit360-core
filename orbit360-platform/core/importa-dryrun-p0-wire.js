/* ============================================================
   Orbit 360 · P0 wire dry-run antes de escritura
   Fecha inicial: 2026-07-09
   Contrato controlado: 2026-07-21

   Captura escrituras originadas por importaciones que todavía no
   tienen dry-run y confirmación. Las escrituras ya aprobadas por un
   owner especializado deben cumplir el contrato canónico y pasan una
   sola vez al store, sin generar un segundo dry-run.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  if (Orbit.__importaDryRunP0Wired) return;
  Orbit.__importaDryRunP0Wired = true;

  const COLL_TO_SOURCE = {
    clientes: 'clientes',
    contactosCliente: 'clientes',
    calidadDatos: 'clientes',
    gestiones: 'clientes',
    polizas: 'polizas',
    bienesAsegurados: 'vehiculos',
    vehiculos: 'vehiculos',
    recibosEsperados: 'polizas',
    cobros: 'estado_cuenta_aseguradora',
    recibosFuenteExterna: 'recibos_fuente_externa',
    recibosAseguradora: 'estado_cuenta_aseguradora',
    estadosCuentaAseguradora: 'estado_cuenta_aseguradora',
    carteraPrimas: 'estado_cuenta_aseguradora',
    conciliacionesPrimas: 'estado_cuenta_aseguradora',
    comisiones: 'planilla_comisiones',
    planillasComisiones: 'planilla_comisiones',
    comisionesDevengadas: 'planilla_comisiones',
    conciliacionesComisiones: 'planilla_comisiones',
    facturas: 'factura_comision',
    facturasComisiones: 'factura_comision',
    cxcComisiones: 'factura_comision',
    conciliacionBanco: 'estado_cuenta_bancario',
    movimientosBanco: 'estado_cuenta_bancario',
    conciliacionBancaria: 'estado_cuenta_bancario',
    cxpAsesores: 'estado_cuenta_bancario',
    finmovs: 'estado_cuenta_bancario',
    parchesPendientes: 'documentos',
    actividades: 'actividad_importacion'
  };

  function drawerOpen() {
    const d = document.getElementById && document.getElementById('imp-drawer');
    return !!(d && d.classList && d.classList.contains('open'));
  }

  function genericControlledWrite(data) {
    return !!(
      data &&
      data.createdByImport === true &&
      data.importBatchId &&
      data.validationStatus === 'validado'
    );
  }

  function specializedContract() {
    return Orbit.importerControlledWriteContractV20260721 || null;
  }

  function resolveControlled(collection, data) {
    if (genericControlledWrite(data)) {
      return { controlled: true, data, owner: 'importa-write-p0', kind: 'generic_controlled_write' };
    }
    const contract = specializedContract();
    if (!contract || typeof contract.classify !== 'function' || typeof contract.canonicalize !== 'function') {
      return { controlled: false, data, owner: '', kind: '' };
    }
    const classification = contract.classify(collection, data || {});
    if (!classification || classification.controlled !== true) {
      return { controlled: false, data, owner: '', kind: '' };
    }
    const canonical = contract.canonicalize(collection, data || {});
    if (!canonical) return { controlled: false, data, owner: '', kind: '' };
    return {
      controlled: true,
      data: canonical,
      owner: contract.owner || 'specialized_importer',
      kind: classification.kind || 'specialized_controlled_write'
    };
  }

  function controlledWrite(collection, data) {
    return resolveControlled(collection, data).controlled;
  }

  function importCandidate(coll, data) {
    if (!data || controlledWrite(coll, data)) return false;
    if (coll === 'auditoriaImportaciones') return false;
    const id = String(data.id || '');
    return !!(
      drawerOpen() ||
      data.importado === true ||
      data.origen === 'importado' ||
      /_imp_|^act_imp_|^cob_imp_|^pol_imp_|^com_imp_|^fac_imp_|^con_imp_/i.test(id) ||
      COLL_TO_SOURCE[coll]
    );
  }

  function inferSource(coll, data) {
    if (data && data.sourceType) return data.sourceType;
    if (data && data.origen === 'estado-cuenta-banco') return 'estado_cuenta_bancario';
    return COLL_TO_SOURCE[coll] || 'fuente_no_clasificada';
  }

  function batchFor(sourceType) {
    Orbit.__p0DryRunCaptured = Orbit.__p0DryRunCaptured || {};
    if (!Orbit.__p0DryRunCaptured[sourceType]) {
      Orbit.__p0DryRunCaptured[sourceType] = {
        batchId: 'batch_p0_' + sourceType + '_' + Date.now().toString(36),
        sourceType,
        sourceFileName: 'captura_drawer_importador',
        sourceHash: '',
        status: 'dry_run_pendiente_revision',
        operations: []
      };
    }
    return Orbit.__p0DryRunCaptured[sourceType];
  }

  function rebuildReport(sourceType) {
    const batch = Orbit.__p0DryRunCaptured && Orbit.__p0DryRunCaptured[sourceType];
    if (!batch) return null;
    const report = Orbit.importaDryRunP0 && Orbit.importaDryRunP0.buildDryRun
      ? Orbit.importaDryRunP0.buildDryRun(batch)
      : Object.assign({}, batch, { hasBlockingErrors: true, status: 'dry_run_sin_builder' });
    Orbit.__p0DryRunLastReport = report;
    return report;
  }

  function toast(msg) {
    if (Orbit.ui && Orbit.ui.toast) return Orbit.ui.toast(msg);
    try {
      const t = document.createElement('div');
      t.className = 'ciclo-toast';
      t.textContent = msg;
      document.body.appendChild(t);
      setTimeout(function () { t.remove(); }, 3200);
    } catch (e) {}
  }

  function capture(action, coll, data, id) {
    const sourceType = inferSource(coll, data || {});
    const batch = batchFor(sourceType);
    const op = { action: action || 'insert', collection: coll, id: id || (data && data.id) || '', data: Object.assign({}, data || {}) };
    batch.operations.push(op);
    const report = rebuildReport(sourceType);
    if (!Orbit.__p0DryRunToastShown) {
      Orbit.__p0DryRunToastShown = true;
      toast('Dry-run P0 generado: la importación queda pendiente de revisión y confirmación. No se escribió información real.');
      setTimeout(function () { Orbit.__p0DryRunToastShown = false; }, 2500);
    }
    return Object.assign({}, data || {}, {
      _p0DryRunCaptured: true,
      _p0DryRunStatus: report && report.hasBlockingErrors ? 'bloqueado' : 'pendiente_revision',
      _p0DryRunBatchId: batch.batchId
    });
  }

  function wireStore() {
    if (!Orbit.store || typeof Orbit.store.insert !== 'function') return false;
    if (Orbit.store.__p0DryRunWire) return true;
    const originalInsert = Orbit.store.insert.bind(Orbit.store);
    const originalUpdate = Orbit.store.update ? Orbit.store.update.bind(Orbit.store) : null;

    Orbit.store.insert = function (coll, rec) {
      const controlled = resolveControlled(coll, rec);
      if (controlled.controlled) return originalInsert(coll, controlled.data);
      if (importCandidate(coll, rec)) return capture('insert', coll, rec, rec && rec.id);
      return originalInsert(coll, rec);
    };

    if (originalUpdate) {
      Orbit.store.update = function (coll, id, patch) {
        const controlled = resolveControlled(coll, patch);
        if (controlled.controlled) return originalUpdate(coll, id, controlled.data);
        if (importCandidate(coll, patch)) return capture('update', coll, patch, id);
        return originalUpdate(coll, id, patch);
      };
    }

    Orbit.store.__p0DryRunWire = true;
    Orbit.store.__p0DryRunWireContractVersion = '20260721.2';
    return true;
  }

  Orbit.importaDryRunP0Wire = {
    inferSource,
    controlledWrite,
    resolveControlled,
    importCandidate,
    batchFor,
    rebuildReport,
    pending: function () { return Orbit.__p0DryRunCaptured || {}; },
    lastReport: function () { return Orbit.__p0DryRunLastReport || null; },
    reset: function () { Orbit.__p0DryRunCaptured = {}; Orbit.__p0DryRunLastReport = null; }
  };

  if (!wireStore()) {
    document.addEventListener('orbit:store', wireStore, { once: true });
    setTimeout(wireStore, 250);
  }
})();
