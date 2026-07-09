/* ============================================================
   Orbit 360 · P0 wire recibos/cartera/conciliacion de primas
   Fecha: 2026-07-09

   Integra reglas P0 sin modificar core/importa.js ni backend protegido.
   Redirige estados de cuenta de aseguradora hacia entidades separadas.
   ============================================================ */
(function () {
  window.Orbit = window.Orbit || {};
  if (Orbit.__importaCarteraP0Wired) return;
  Orbit.__importaCarteraP0Wired = true;

  function ready() {
    return Orbit.store && Orbit.importaCarteraP0 && typeof Orbit.store.insert === 'function';
  }

  function insertIfMissing(coll, rec, keyField) {
    const key = keyField || '_sourceKey';
    const found = rec[key] ? Orbit.store.all(coll).find(function (x) { return x[key] && x[key] === rec[key]; }) : null;
    if (found) return found;
    return Orbit.store.insert(coll, rec);
  }

  function routeInsurerStatement(rec) {
    const C = Orbit.importaCarteraP0;
    const normalized = C.normalizeInsurerReceipt(rec || {});
    const estado = C.estadoCuentaSeed(normalized);
    const recibo = Object.assign({}, normalized, { id: 'rec_asg_' + (normalized._sourceKey || Date.now()) });
    const cartera = C.carteraSeed(normalized);
    const conciliacion = C.conciliacionSeed(normalized);

    insertIfMissing('estadosCuentaAseguradora', estado, 'id');
    insertIfMissing('recibosAseguradora', recibo, '_sourceKey');
    insertIfMissing('carteraPrimas', cartera, '_sourceKey');
    insertIfMissing('conciliacionesPrimas', conciliacion, 'id');
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
    return true;
  }

  if (!wireStore()) {
    document.addEventListener('orbit:store', wireStore, { once: true });
    setTimeout(wireStore, 250);
  }
})();
