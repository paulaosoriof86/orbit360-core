/* ============================================================
   Orbit 360 · P0 wire banco/comisiones/CxC/CxP
   Fecha: 2026-07-09

   Redirige estados de cuenta bancarios hacia conciliacion bancaria
   de comisiones sin crear finmovs definitivos ni marcar pagos.
   ============================================================ */
(function () {
  window.Orbit = window.Orbit || {};
  if (Orbit.__importaBancoComisionesP0Wired) return;
  Orbit.__importaBancoComisionesP0Wired = true;

  function ready() {
    return Orbit.store && Orbit.importaBancoComisionesP0 && typeof Orbit.store.insert === 'function';
  }

  function insertIfMissing(coll, rec, keyField) {
    const key = keyField || '_sourceKey';
    const found = rec[key] ? Orbit.store.all(coll).find(function (x) { return x[key] && x[key] === rec[key]; }) : null;
    if (found) return found;
    return Orbit.store.insert(coll, rec);
  }

  function routeBankRow(rec) {
    const B = Orbit.importaBancoComisionesP0;
    const bank = B.normalizeBankRow(rec || {});
    const match = B.matchBank(bank);
    const mov = B.movimientoBancoSeed(bank);
    const con = B.conciliacionBancariaSeed(bank, match);
    insertIfMissing('movimientosBanco', mov, '_sourceKey');
    insertIfMissing('conciliacionBancaria', con, '_sourceKey');
    B.updateTargetProposal(match, bank);
    return con;
  }

  function wireStore() {
    if (!ready()) return false;
    const store = Orbit.store;
    if (store.__p0BancoComisionesWire) return true;
    const originalInsert = store.insert.bind(store);

    store.insert = function (coll, rec) {
      if (coll === 'conciliacionBanco' && rec && rec.importado) {
        return routeBankRow(rec);
      }
      return originalInsert(coll, rec);
    };

    store.__p0BancoComisionesWire = true;
    return true;
  }

  if (!wireStore()) {
    document.addEventListener('orbit:store', wireStore, { once: true });
    setTimeout(wireStore, 250);
  }
})();
