/* ============================================================
   Orbit 360 · Refinamientos Póliza/Recibos v1.199b
   Cierra tres bordes sin alterar el contrato base:
   - no crea vehículos vacíos por suma asegurada;
   - compara cambios contra la póliza normalizada;
   - reutiliza propuestas activas de conciliación.
   ============================================================ */
window.Orbit = window.Orbit || {};
(function () {
  const E = Orbit.policyReceipts;
  if (!E || E.__refinementsV1199b) return;
  const clean = v => String(v == null ? '' : v).trim();
  const clone = v => { try { return JSON.parse(JSON.stringify(v)); } catch (e) { return Object.assign({}, v || {}); } };

  const createPolicy = E.createPolicy.bind(E);
  E.createPolicy = function (raw, options) {
    const payload = clone(raw || {});
    if (payload.vehiculo) {
      const hasIdentity = ['marca','linea','placa','chasis','motor'].some(k => clean(payload.vehiculo[k]));
      if (!hasIdentity) payload.vehiculo = null;
    }
    return createPolicy(payload, options);
  };

  const updatePolicy = E.updatePolicy.bind(E);
  E.updatePolicy = function (id, patch, options) {
    const current = Orbit.store && Orbit.store.get ? Orbit.store.get('polizas', id) : null;
    if (!current || !patch || !E.preparePolicy) return updatePolicy(id, patch, options);
    const before = E.preparePolicy(current, current, 'compare');
    const after = E.preparePolicy(Object.assign({}, current, patch, { id }), current, 'compare_after');
    const reduced = {};
    Object.keys(patch).forEach(k => {
      if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) reduced[k] = patch[k];
    });
    return updatePolicy(id, reduced, options);
  };

  const createProposal = E.createReconciliationProposal.bind(E);
  E.createReconciliationProposal = function (receiptId, input) {
    let existing = null;
    try {
      existing = (Orbit.store.all('conciliaciones') || []).find(x =>
        x.reciboId === receiptId && ['PROPUESTA','EN_REVISION','VALIDADA'].includes(x.estado_bandeja || x.estado));
    } catch (e) {}
    if (existing) return { ok: true, existing: true, proposal: existing, operationId: existing.operationId || '' };
    return createProposal(receiptId, input);
  };

  E.__refinementsV1199b = { createPolicy, updatePolicy, createReconciliationProposal: createProposal };
})();
