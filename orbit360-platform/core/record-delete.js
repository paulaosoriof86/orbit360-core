/* ============================================================
   Gravicentra Insurance · eliminación canónica de registros
   B2 R15A · UI "Eliminar" transversal, durable y fail-closed.
   - No borra evidencia relacional a ciegas.
   - Por defecto aplica borrado lógico durable.
   - El registro desaparece de las listas operativas, pero conserva
     metadata suficiente para auditoría y resolución histórica.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  const MODULE = Object.freeze({
    clientes: 'cliente360',
    polizas: 'polizas',
    vehiculos: 'polizas',
    cobros: 'cobros',
    gestiones: 'ops',
    negocios: 'leads',
    reclamos: 'siniestros',
    cancelaciones: 'cancelaciones',
    comisiones: 'comisiones',
    asesores: 'equipo',
    aseguradoras: 'aseguradoras'
  });

  const text = v => String(v == null ? '' : v).trim();
  const norm = v => text(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const S = () => Orbit.store;

  function activeRows(collection) {
    const st = S();
    if (!st || typeof st.all !== 'function') return [];
    return (st.all(collection) || []).filter(r => r && r.deleted !== true && r.eliminado !== true && norm(r.estado) !== 'eliminado');
  }

  function moduleKey(collection) {
    return MODULE[collection] || '';
  }

  function can(collection, row) {
    const key = moduleKey(collection);
    if (!key || !row || !Orbit.access || typeof Orbit.access.can !== 'function') return false;
    if (Orbit.access.can(key, 'edit') !== true) return false;
    if (typeof Orbit.access.canAccessRecord === 'function' && Orbit.access.canAccessRecord(row, key, { collection }) !== true) return false;
    return true;
  }

  function paymentEvidence(c) {
    const state = norm(c && (c.estadoVisual || c.estadoOperativo || c.estado));
    return !!(c && (
      ['pagado','conciliado','aplicado'].includes(state) ||
      c.conciliado === true ||
      c.reportado === true ||
      c.validadoReporte === true ||
      text(c.fechaPago || c.fechaPagoReal || c.paymentDate || c.referenciaPago || c.factura || c.documentRef)
    ));
  }

  function blockers(collection, row) {
    if (!row) return ['Registro no disponible.'];
    const id = text(row.id);
    if (!id) return ['El registro no tiene identidad canónica.'];
    const out = [];
    const count = (c, fn) => activeRows(c).filter(fn).length;

    if (collection === 'clientes') {
      const rel = {
        pólizas: count('polizas', x => text(x.clienteId) === id),
        vehículos: count('vehiculos', x => text(x.clienteId) === id),
        recibos: count('cobros', x => text(x.clienteId) === id),
        gestiones: count('gestiones', x => text(x.clienteId) === id),
        siniestros: count('reclamos', x => text(x.clienteId) === id)
      };
      const used = Object.entries(rel).filter(([,n]) => n > 0);
      if (used.length) out.push('Tiene relaciones activas: ' + used.map(([k,n]) => k + ' ' + n).join(' · ') + '. Resuélvelas o fusiona el expediente antes de eliminar.');
    }

    if (collection === 'polizas') {
      const paid = activeRows('cobros').filter(x => text(x.polizaId) === id && paymentEvidence(x)).length;
      const claims = count('reclamos', x => text(x.polizaId) === id);
      const mgmt = count('gestiones', x => text(x.polizaId) === id && !['resuelta','cerrada'].includes(norm(x.estado)));
      if (paid) out.push('La póliza tiene ' + paid + ' recibo(s) con evidencia de pago/conciliación.');
      if (claims) out.push('La póliza tiene ' + claims + ' siniestro(s) relacionado(s).');
      if (mgmt) out.push('La póliza tiene ' + mgmt + ' gestión(es) operativa(s) abierta(s).');
    }

    if (collection === 'vehiculos') {
      const p = text(row.polizaId) && S().get('polizas', row.polizaId);
      if (p && p.deleted !== true && p.eliminado !== true && ['vigente','por_renovar'].includes(norm(p.estado))) {
        out.push('El vehículo está vinculado a una póliza activa. Elimina o corrige primero la relación de la póliza.');
      }
    }

    if (collection === 'cobros' && paymentEvidence(row)) {
      out.push('El recibo tiene evidencia de pago, reporte o conciliación y no puede ocultarse como si nunca hubiera existido.');
    }

    if (collection === 'negocios' && (text(row.clienteIdCreado) || ['emitido','ganado'].includes(norm(row.etapa)))) {
      out.push('El negocio ya produjo un cliente/emisión. Debe conservarse como trazabilidad del ciclo comercial.');
    }

    if (collection === 'reclamos' && ['pagado','aprobado','rechazado','cerrado'].includes(norm(row.estado))) {
      out.push('El siniestro está en estado final y debe conservarse como evidencia histórica.');
    }

    if (collection === 'cancelaciones') {
      const finalState = norm(row.recuperacion || row.estado);
      if (['cancelada','aplicada','cerrada','finalizada','recuperada','no_recuperable'].includes(finalState)) {
        out.push('La cancelación/recuperación ya produjo un estado final y debe conservarse como evidencia histórica.');
      }
      const linkedBusiness = text(row.recuperacionNegocioId) && S().get('negocios', row.recuperacionNegocioId);
      const linkedManagement = text(row.recuperacionGestionId) && S().get('gestiones', row.recuperacionGestionId);
      if (linkedBusiness && linkedBusiness.deleted !== true && linkedBusiness.eliminado !== true) out.push('La cancelación tiene un seguimiento de recuperación activo en Leads.');
      if (linkedManagement && linkedManagement.deleted !== true && linkedManagement.eliminado !== true) out.push('La cancelación tiene una gestión de recuperación activa en Ops.');
    }

    if (collection === 'comisiones' && (row.conciliado === true || ['pagada','conciliada','liquidada'].includes(norm(row.estado)))) {
      out.push('La comisión ya fue pagada/conciliada/liquidada y debe conservarse como evidencia financiera.');
    }

    return out;
  }

  function labelFor(collection, row, fallback) {
    return text(fallback) || text(
      row && (row.nombre || row.numero || row.titulo || row.tipo || row.placa || row.cuota || row.id)
    ) || 'este registro';
  }
  function relatedSoftDeletes(collection, row) {
    const id = text(row && row.id);
    if (!id) return [];
    if (collection === 'polizas') {
      return [
        ...activeRows('cobros').filter(x => text(x.polizaId) === id && !paymentEvidence(x)).map(x => ({ collection: 'cobros', id: x.id })),
        ...activeRows('vehiculos').filter(x => text(x.polizaId) === id).map(x => ({ collection: 'vehiculos', id: x.id }))
      ];
    }
    return [];
  }


  function button(collection, id, label, options) {
    const row = S() && S().get ? S().get(collection, id) : null;
    if (!row || !can(collection, row)) return '';
    const safeCollection = text(collection).replace(/'/g, '');
    const safeId = text(id).replace(/'/g, '');
    const safeLabel = labelFor(collection, row, label).replace(/'/g, '’');
    const cls = options && options.className ? text(options.className) : 'btn ghost';
    return '<button class="' + cls + '" data-canonical-delete="' + safeCollection + ':' + safeId + '" style="color:var(--danger,var(--red))" onclick="event.preventDefault();event.stopPropagation();Orbit.recordDelete.remove(\'' + safeCollection + '\',\'' + safeId + '\',{label:\'' + safeLabel + '\'})">Eliminar</button>';
  }

  async function remove(collection, id, options) {
    const st = S();
    if (!st || typeof st.get !== 'function' || typeof st.updateDurable !== 'function') throw new Error('DELETE_DURABLE_STORE_REQUIRED');
    const row = st.get(collection, id);
    if (!row) return { ok: false, code: 'DELETE_RECORD_NOT_FOUND' };
    if (!can(collection, row)) {
      if (Orbit.ui && Orbit.ui.toast) Orbit.ui.toast('Tu rol activo no puede eliminar este registro.');
      return { ok: false, code: 'DELETE_ACCESS_DENIED' };
    }

    const blocked = blockers(collection, row);
    if (blocked.length) {
      const message = 'No se puede eliminar todavía. ' + blocked.join(' ');
      if (Orbit.ui && typeof Orbit.ui.alert === 'function') await Orbit.ui.alert(message, { title: 'Eliminar bloqueado por relaciones' });
      else if (Orbit.ui && Orbit.ui.toast) Orbit.ui.toast(message);
      return { ok: false, code: 'DELETE_RELATION_BLOCKED', blockers: blocked };
    }

    const label = labelFor(collection, row, options && options.label);
    const ok = Orbit.ui && typeof Orbit.ui.confirm === 'function'
      ? await Orbit.ui.confirm('¿Eliminar "' + label + '"? Dejará de aparecer en la operación normal, pero se conservará trazabilidad para no romper relaciones.', { title: 'Eliminar registro', ok: 'Eliminar', danger: true })
      : window.confirm('¿Eliminar "' + label + '"?');
    if (!ok) return { ok: false, cancelled: true };

    const reason = Orbit.ui && typeof Orbit.ui.prompt === 'function'
      ? await Orbit.ui.prompt('Indica el motivo de la eliminación:', { title: 'Motivo obligatorio' })
      : window.prompt('Motivo de la eliminación:');
    if (text(reason).length < 5) {
      if (Orbit.ui && typeof Orbit.ui.alert === 'function') await Orbit.ui.alert('Indica un motivo claro de al menos 5 caracteres.', { title: 'Motivo requerido' });
      return { ok: false, code: 'DELETE_REASON_REQUIRED' };
    }

    let actorRole = '', actorUid = '', actorEmail = '';
    try { actorRole = Orbit.session && Orbit.session.rol ? text(Orbit.session.rol()) : ''; } catch (_) {}
    try {
      const m = Orbit.auth && Orbit.auth.productUser || {};
      actorUid = text(m.uid);
      actorEmail = text(m.email);
    } catch (_) {}

    const now = new Date().toISOString();
    const patch = {
      deleted: true,
      eliminado: true,
      archivado: true,
      deletedAt: now,
      eliminadoAt: now,
      deleteReason: text(reason),
      motivoEliminacion: text(reason),
      deletedByRole: actorRole,
      deletedByUid: actorUid,
      deletedByEmail: actorEmail,
      estadoEliminacion: 'Eliminado'
    };

    const related = relatedSoftDeletes(collection, row);
    if (related.length && typeof st.batchDurable === 'function') {
      const mutations = [{ action: 'update', collection, id, payload: patch }].concat(
        related.map(child => ({
          action: 'update',
          collection: child.collection,
          id: child.id,
          payload: Object.assign({}, patch, {
            deletedParentCollection: collection,
            deletedParentId: id
          })
        }))
      );
      await st.batchDurable(mutations, { requestId: 'delete_' + collection + '_' + id + '_' + Date.now().toString(36), timeoutMs: 20000 });
    } else {
      await st.updateDurable(collection, id, patch);
    }

    const readback = st.get(collection, id);
    if (!readback || readback.deleted !== true || text(readback.deleteReason) !== text(reason)) {
      throw new Error('DELETE_DURABLE_READBACK_MISMATCH');
    }
    for (const child of related) {
      const childReadback = st.get(child.collection, child.id);
      if (!childReadback || childReadback.deleted !== true) throw new Error('DELETE_CHILD_READBACK_MISMATCH');
    }

    try {
      document.dispatchEvent(new CustomEvent('orbit:record-delete', {
        detail: { collection, id, softDelete: true, reason: text(reason), deletedAt: now, relatedSoftDeleted: related.length }
      }));
    } catch (_) {}
    if (Orbit.ui && Orbit.ui.toast) Orbit.ui.toast('✓ Registro eliminado y confirmado' + (related.length ? ' · ' + related.length + ' registro(s) dependiente(s) ocultado(s)' : '') + '.');
    if (options && typeof options.onDeleted === 'function') options.onDeleted(readback);
    return { ok: true, softDelete: true, row: readback, relatedSoftDeleted: related.length };
  }

  Orbit.recordDelete = Object.freeze({
    can,
    blockers,
    button,
    remove,
    isDeleted: row => !!(row && (row.deleted === true || row.eliminado === true || norm(row.estado) === 'eliminado'))
  });
})();
