/* ============================================================
   Orbit 360 · P0 wire recibos/cartera/conciliacion de primas
   Fecha: 2026-07-31

   Redirige estados de cuenta de aseguradora a entidades separadas.
   Reimportar la misma identidad actualiza/fill-missing; no duplica.
   La conciliacion exacta se decide en el contrato P0, no aqui por inferencia.
   ============================================================ */
(function () {
  window.Orbit = window.Orbit || {};
  if (Orbit.__importaCarteraP0Wired) return;
  Orbit.__importaCarteraP0Wired = true;

  function ready() {
    return Orbit.store && Orbit.importaCarteraP0 &&
      typeof Orbit.store.insert === 'function' && typeof Orbit.store.update === 'function';
  }

  function upsertByKey(coll, rec, keyField) {
    const key = keyField || '_sourceKey';
    let found = null;
    try {
      found = rec && rec[key] ? Orbit.store.all(coll).find(function (x) {
        return x && x[key] && x[key] === rec[key];
      }) : null;
    } catch (e) {}
    if (found && found.id) return Orbit.store.update(coll, found.id, rec);
    return Orbit.store.insert(coll, rec);
  }

  function routeInsurerStatement(rec) {
    const C = Orbit.importaCarteraP0;
    const normalized = C.normalizeInsurerReceipt(rec || {});
    const estado = C.estadoCuentaSeed(normalized);
    const recibo = Object.assign({}, normalized, { id: 'rec_asg_' + (normalized._sourceKey || Date.now()) });
    const cartera = C.carteraSeed(normalized);
    const conciliacion = C.conciliacionSeed(normalized);

    upsertByKey('estadosCuentaAseguradora', estado, 'id');
    upsertByKey('recibosAseguradora', recibo, '_sourceKey');
    upsertByKey('carteraPrimas', cartera, '_sourceKey');
    upsertByKey('conciliacionesPrimas', conciliacion, 'id');
    return recibo;
  }

  function wireStore() {
    if (!ready()) return false;
    const store = Orbit.store;
    if (store.__p0CarteraWire) return true;
    const originalInsert = store.insert.bind(store);

    store.insert = function (coll, rec) {
      if (coll === 'cobros' && Orbit.importaCarteraP0.isInsurerStatement(rec)) {
        return routeInsurerStatement(rec);
      }
      return originalInsert(coll, rec);
    };

    store.__p0CarteraWire = true;
    store.__p0CarteraWireVersion = '20260731.2';
    return true;
  }

  Orbit.importaCarteraP0Wire = Object.freeze({
    upsertByKey,
    routeInsurerStatement,
    duplicateInsertAllowed: false,
    reconciliationOwnedByContract: true
  });

  if (!wireStore()) {
    document.addEventListener('orbit:store', wireStore, { once: true });
    setTimeout(wireStore, 250);
  }
})();
