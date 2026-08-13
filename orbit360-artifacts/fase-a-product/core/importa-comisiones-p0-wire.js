/* ============================================================
   Orbit 360 · P0 wire comisiones/facturas/CxC/CxP
   Fecha: 2026-07-09

   Integra reglas P0 sin modificar core/importa.js ni backend protegido.
   Redirige planillas y facturas de comision hacia entidades separadas.
   ============================================================ */
(function () {
  window.Orbit = window.Orbit || {};
  if (Orbit.__importaComisionesP0Wired) return;
  Orbit.__importaComisionesP0Wired = true;

  function ready() {
    return Orbit.store && Orbit.importaComisionesP0 && typeof Orbit.store.insert === 'function';
  }

  function insertIfMissing(coll, rec, keyField) {
    const key = keyField || '_sourceKey';
    const found = rec[key] ? Orbit.store.all(coll).find(function (x) { return x[key] && x[key] === rec[key]; }) : null;
    if (found) return found;
    return Orbit.store.insert(coll, rec);
  }

  function routeCommissionRow(rec) {
    const C = Orbit.importaComisionesP0;
    const row = C.normalizeCommissionRow(rec || {});
    const planilla = C.planillaSeed(row);
    const devengada = C.devengadaSeed(row);
    const conciliacion = C.conciliacionSeed(row);
    insertIfMissing('planillasComisiones', planilla, '_sourceKey');
    insertIfMissing('comisionesDevengadas', devengada, '_sourceKey');
    insertIfMissing('conciliacionesComisiones', conciliacion, 'id');
    return devengada;
  }

  function routeCommissionInvoice(rec) {
    const C = Orbit.importaComisionesP0;
    const invoice = C.normalizeCommissionInvoice(rec || {});
    const factura = C.facturaComisionSeed(invoice);
    const cxc = C.cxcComisionSeed(invoice);
    insertIfMissing('facturasComisiones', factura, '_sourceKey');
    insertIfMissing('cxcComisiones', cxc, 'id');
    insertIfMissing('conciliacionesComisiones', {
      id: 'con_com_fac_' + (invoice._sourceKey || Date.now()),
      tipo: 'comision',
      estado: invoice.requiereValidacion ? 'requiere_validacion' : 'factura_pendiente_banco',
      facturaComisionKey: invoice._sourceKey,
      numeroFactura: invoice.numeroFactura,
      monto: invoice.montoTotal,
      moneda: invoice.moneda || '',
      fuente: 'factura_comision',
      accionPropuesta: 'comparar_factura_con_planilla_y_banco',
      requiereValidacion: invoice.requiereValidacion,
      motivosValidacion: invoice.motivosValidacion || [],
      creado: (Orbit.ui && Orbit.ui.today) ? Orbit.ui.today() : new Date().toISOString().slice(0, 10),
      importado: true
    }, 'id');
    return factura;
  }

  function wireStore() {
    if (!ready()) return false;
    const store = Orbit.store;
    if (store.__p0ComisionesWire) return true;
    const originalInsert = store.insert.bind(store);

    store.insert = function (coll, rec) {
      if (coll === 'comisiones' && Orbit.importaComisionesP0.isImportedCommission(rec)) {
        return routeCommissionRow(rec);
      }
      if (coll === 'facturas' && Orbit.importaComisionesP0.isCommissionInvoice(rec)) {
        return routeCommissionInvoice(rec);
      }
      return originalInsert(coll, rec);
    };

    store.__p0ComisionesWire = true;
    return true;
  }

  if (!wireStore()) {
    document.addEventListener('orbit:store', wireStore, { once: true });
    setTimeout(wireStore, 250);
  }
})();
