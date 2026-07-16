/* ============================================================
   Orbit 360 · P0 contrato de escritura controlada
   Fecha: 2026-07-15

   Capa pura/aditiva para escribir importaciones solo despues de:
   - dry-run aprobado;
   - validaciones sin bloqueos;
   - confirmacion humana explicita;
   - escritura via Orbit.store;
   - auditoria antes/despues;
   - rollback planificado.

   No toca backend protegido ni escribe por si sola.
   ============================================================ */
(function () {
  window.Orbit = window.Orbit || {};

  const ALLOWED_COLLECTIONS = [
    'clientes', 'contactosCliente', 'calidadDatos', 'gestiones',
    'polizas', 'bienesAsegurados', 'recibosEsperados', 'recibosFuenteExterna', 'recibosAseguradora',
    'estadosCuentaAseguradora', 'carteraPrimas', 'conciliacionesPrimas',
    'planillasComisiones', 'comisionesDevengadas', 'facturasComisiones', 'cxcComisiones', 'conciliacionesComisiones',
    'movimientosBanco', 'conciliacionBancaria', 'liquidacionesAsesores', 'cxpAsesores',
    'auditoriaImportaciones'
  ];

  const HARD_BLOCKED_COLLECTIONS = [
    'finmovs', 'cobros', 'cxc', 'cxp', 'usuarios', 'roles', 'permisos', 'secrets', 'credenciales'
  ];

  const ACTIVE_WRITES = Object.create(null);
  let storeGetBridgeInstalled = false;

  function nowIso() {
    return new Date().toISOString();
  }

  function norm(value) {
    return String(value == null ? '' : value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_ -]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tenantId() {
    try { return Orbit.tenant && Orbit.tenant.get ? Orbit.tenant.get().id : ''; }
    catch (e) { return ''; }
  }

  function isAllowedCollection(coll) {
    return ALLOWED_COLLECTIONS.includes(coll) && !HARD_BLOCKED_COLLECTIONS.includes(coll);
  }

  function targetKey(collection, id) {
    return String(collection || '') + '::' + String(id || '');
  }

  function isRestrictedPendingInsurer(op) {
    const data = op && (op.data || op.record || {});
    return !!(
      op &&
      op.collection === 'aseguradoras' &&
      data &&
      data.requiereValidacion === true &&
      data.validationStatus === 'requiere_validacion' &&
      data.estadoOperativo === 'pendiente_validacion' &&
      data.vinculada === false &&
      data.cotizadorHabilitado === false &&
      data.comparativoHabilitado === false &&
      data.tarifasHabilitadas === false
    );
  }

  function labStatus() {
    try {
      return Orbit.store && typeof Orbit.store._labStatus === 'function'
        ? Orbit.store._labStatus() || {}
        : {};
    } catch (e) {
      return {};
    }
  }

  function ensureStoreGetBridge() {
    if (storeGetBridgeInstalled || !Orbit.store || typeof Orbit.store.get !== 'function') return;
    const originalGet = Orbit.store.get.bind(Orbit.store);

    Orbit.store.get = function (collection, id) {
      const row = originalGet(collection, id);
      const target = ACTIVE_WRITES[targetKey(collection, id)];
      if (!target || !row) return row;

      const state = labStatus();
      const queue = Array.isArray(state.writeQueue) ? state.writeQueue : [];
      const errors = Array.isArray(state.writeErrors) ? state.writeErrors : [];
      const startedAt = Date.parse(target.startedAt || '') || 0;
      const relevantError = errors.find(function (item) {
        const itemAt = Date.parse(item && item.at || '') || 0;
        return item && item.collection === collection && String(item.id) === String(id) && itemAt >= startedAt;
      });
      if (relevantError) {
        return Object.assign({}, row, {
          _syncStatus: 'failed',
          _syncOp: target.action,
          _syncError: String(relevantError.error || 'error_escritura'),
          _syncAt: relevantError.at || nowIso()
        });
      }

      const pending = queue.some(function (item) {
        return item && item.collection === collection && String(item.id) === String(id) && item.status === 'pending';
      });
      if (pending) {
        return Object.assign({}, row, {
          _syncStatus: 'pending',
          _syncOp: target.action,
          _syncAt: target.startedAt
        });
      }

      return Object.assign({}, row, {
        _syncStatus: 'synced',
        _syncOp: target.action,
        _syncError: undefined,
        _syncAt: state.lastWriteOkAt || nowIso()
      });
    };

    Orbit.store.__importWriteStatusBridgeInstalled = true;
    storeGetBridgeInstalled = true;
  }

  function validateRecord(op) {
    const errors = [];
    if (!op || typeof op !== 'object') errors.push('operacion_invalida');
    const coll = op && op.collection;
    const action = op && (op.action || 'insert');
    const data = op && (op.data || op.record || {});
    const restrictedPendingInsurer = isRestrictedPendingInsurer(op);
    if (!coll) errors.push('collection_faltante');
    if (coll && !isAllowedCollection(coll)) errors.push('collection_no_permitida:' + coll);
    if (!['insert', 'update'].includes(action)) errors.push('accion_no_permitida:' + action);
    if (action === 'update' && !op.id) errors.push('id_requerido_update');
    if (!data || typeof data !== 'object') errors.push('data_invalida');
    if (data && data.requiereValidacion && !restrictedPendingInsurer) errors.push('registro_requiere_validacion');
    if (data && data.validationStatus && data.validationStatus !== 'validado' && !restrictedPendingInsurer) errors.push('validationStatus_no_validado');
    if (data && data.estado === 'requiere_validacion' && !restrictedPendingInsurer) errors.push('estado_requiere_validacion');
    if (data && data.moneda === 'REQUIERE_VALIDACION') errors.push('moneda_requiere_validacion');
    if (data && data.pais === 'REQUIERE_VALIDACION') errors.push('pais_requiere_validacion');
    return errors;
  }

  function validateBatch(batch) {
    const errors = [];
    if (!batch || typeof batch !== 'object') errors.push('batch_invalido');
    if (!batch.batchId) errors.push('batchId_faltante');
    if (!batch.sourceType) errors.push('sourceType_faltante');
    if (!Array.isArray(batch.operations)) errors.push('operations_faltante');
    if (batch.status !== 'dry_run_aprobado') errors.push('dry_run_no_aprobado');
    if (batch.hasBlockingErrors) errors.push('batch_con_bloqueos');
    (batch.operations || []).forEach(function (op, index) {
      validateRecord(op).forEach(function (e) { errors.push('op_' + index + ':' + e); });
    });
    return errors;
  }

  function validateConfirmation(confirmation) {
    const errors = [];
    if (!confirmation || typeof confirmation !== 'object') errors.push('confirmacion_faltante');
    if (!confirmation || confirmation.approved !== true) errors.push('confirmacion_no_aprobada');
    if (!confirmation || confirmation.phrase !== 'CONFIRMO ESCRITURA CONTROLADA') errors.push('frase_confirmacion_invalida');
    if (!confirmation || !confirmation.userId) errors.push('usuario_confirmador_faltante');
    if (!confirmation || !confirmation.reason) errors.push('motivo_confirmacion_faltante');
    return errors;
  }

  function auditSeed(batch, op, before, after, confirmation) {
    const restrictedPendingInsurer = isRestrictedPendingInsurer({ collection: op.collection, data: after || op.data || op.record || {} });
    return {
      id: 'aud_imp_' + batch.batchId + '_' + Math.random().toString(36).slice(2, 10),
      tenantId: tenantId() || batch.tenantId || '',
      batchId: batch.batchId,
      sourceType: batch.sourceType,
      sourceFileName: batch.sourceFileName || '',
      sourceHash: batch.sourceHash || '',
      collection: op.collection,
      action: op.action || 'insert',
      targetId: (after && after.id) || op.id || '',
      before: before || null,
      after: after || null,
      reason: confirmation.reason,
      confirmedBy: confirmation.userId,
      confirmedAt: nowIso(),
      status: restrictedPendingInsurer ? 'written_controlled_restricted' : 'written_controlled',
      rollbackAvailable: true
    };
  }

  function rollbackItem(batch, op, before, after) {
    return {
      batchId: batch.batchId,
      collection: op.collection,
      action: op.action === 'update' ? 'restore' : 'remove_inserted',
      targetId: (after && after.id) || op.id || '',
      before: before || null,
      after: after || null
    };
  }

  function writeBatch(batch, confirmation) {
    const errors = validateBatch(batch).concat(validateConfirmation(confirmation));
    if (errors.length) return { ok: false, written: 0, errors, rollback: [] };
    if (!Orbit.store || typeof Orbit.store.insert !== 'function' || typeof Orbit.store.update !== 'function') {
      return { ok: false, written: 0, errors: ['Orbit.store_no_disponible'], rollback: [] };
    }

    ensureStoreGetBridge();
    const result = { ok: true, written: 0, errors: [], rollback: [], auditIds: [] };

    batch.operations.forEach(function (op, index) {
      try {
        const action = op.action || 'insert';
        const restrictedPendingInsurer = isRestrictedPendingInsurer(op);
        const baseData = Object.assign({}, op.data || op.record || {}, {
          tenantId: (op.data && op.data.tenantId) || tenantId() || batch.tenantId || '',
          importBatchId: batch.batchId,
          sourceType: batch.sourceType,
          sourceFileName: batch.sourceFileName || '',
          sourceHash: batch.sourceHash || '',
          createdByImport: true
        });
        const data = restrictedPendingInsurer
          ? Object.assign(baseData, {
              requiereValidacion: true,
              validationStatus: 'requiere_validacion',
              vinculada: false,
              cotizadorHabilitado: false,
              comparativoHabilitado: false,
              tarifasHabilitadas: false,
              estadoOperativo: 'pendiente_validacion'
            })
          : Object.assign(baseData, {
              requiereValidacion: false,
              validationStatus: 'validado'
            });

        let before = null;
        let after = null;
        const startedAt = nowIso();
        if (action === 'insert') {
          after = Orbit.store.insert(op.collection, data);
        } else {
          before = Orbit.store.get ? Orbit.store.get(op.collection, op.id) : null;
          after = Orbit.store.update(op.collection, op.id, data);
        }

        const targetId = (after && after.id) || op.id || data.id || '';
        if (targetId) {
          ACTIVE_WRITES[targetKey(op.collection, targetId)] = {
            batchId: batch.batchId,
            action: action,
            startedAt: startedAt
          };
          setTimeout(function () {
            delete ACTIVE_WRITES[targetKey(op.collection, targetId)];
          }, 10 * 60 * 1000);
        }

        const audit = auditSeed(batch, op, before, after || data, confirmation);
        if (isAllowedCollection('auditoriaImportaciones')) {
          const aud = Orbit.store.insert('auditoriaImportaciones', audit);
          result.auditIds.push(aud && aud.id ? aud.id : audit.id);
        }
        result.rollback.push(rollbackItem(batch, op, before, after || data));
        result.written += 1;
      } catch (e) {
        result.ok = false;
        result.errors.push('op_' + index + ':' + (e && e.message ? e.message : 'error_escritura'));
      }
    });

    return result;
  }

  function validateRollbackConfirmation(confirmation) {
    const errors = [];
    if (!confirmation || confirmation.approved !== true) errors.push('rollback_no_aprobado');
    if (!confirmation || confirmation.phrase !== 'CONFIRMO ROLLBACK') errors.push('frase_rollback_invalida');
    if (!confirmation || !confirmation.userId) errors.push('usuario_rollback_faltante');
    if (!confirmation || !confirmation.reason) errors.push('motivo_rollback_faltante');
    return errors;
  }

  function rollback(plan, confirmation) {
    const errors = validateRollbackConfirmation(confirmation);
    if (!Array.isArray(plan)) errors.push('plan_rollback_invalido');
    if (errors.length) return { ok: false, rolledBack: 0, errors };
    if (!Orbit.store || typeof Orbit.store.update !== 'function') return { ok: false, rolledBack: 0, errors: ['Orbit.store_no_disponible'] };

    const result = { ok: true, rolledBack: 0, errors: [] };
    (plan || []).forEach(function (item, index) {
      try {
        if (item.action === 'restore' && item.before) {
          Orbit.store.update(item.collection, item.targetId, item.before);
          result.rolledBack += 1;
        } else if (item.action === 'remove_inserted') {
          if (Orbit.store.remove) Orbit.store.remove(item.collection, item.targetId);
          else Orbit.store.update(item.collection, item.targetId, { _rolledBack: true, estado: 'rollback_logico' });
          result.rolledBack += 1;
        }
      } catch (e) {
        result.ok = false;
        result.errors.push('rollback_' + index + ':' + (e && e.message ? e.message : 'error_rollback'));
      }
    });
    return result;
  }

  window.Orbit.importaWriteP0 = {
    ALLOWED_COLLECTIONS,
    HARD_BLOCKED_COLLECTIONS,
    isAllowedCollection,
    isRestrictedPendingInsurer,
    validateRecord,
    validateBatch,
    validateConfirmation,
    writeBatch,
    validateRollbackConfirmation,
    rollback
  };
})();