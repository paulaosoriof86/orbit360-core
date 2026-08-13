/* ============================================================
   Orbit 360 · P0 wire importador de clientes
   Fecha: 2026-07-09

   Integra la normalizacion reusable de clientes sin modificar
   core/importa.js ni backend protegido. No escribe por si mismo.
   ============================================================ */
(function () {
  window.Orbit = window.Orbit || {};
  if (Orbit.__importaClientesP0Wired) return;
  Orbit.__importaClientesP0Wired = true;

  function tenantContext() {
    const cfg = (Orbit.tenant && (Orbit.tenant.importacionClientes || Orbit.tenant.clientesImportacion)) || {};
    return {
      defaultCountry: cfg.defaultCountry || cfg.paisDefault || (Orbit.tenant && Orbit.tenant.paisDefault) || '',
      defaultCurrency: cfg.defaultCurrency || cfg.monedaDefault || '',
      advisorAliases: cfg.advisorAliases || cfg.aliasesAsesores || {},
      activeAdvisors: cfg.activeAdvisors || cfg.asesoresActivos || [],
      temporaryAdvisor: cfg.temporaryAdvisor || cfg.asesorTemporal || ''
    };
  }

  function isClientLike(rec) {
    return !!(rec && (rec.nombre || rec.nombreCompleto || rec.nombres || rec.razonSocial));
  }

  function normalizeClient(rec) {
    if (!Orbit.importaClientesP0 || !isClientLike(rec)) return rec;
    const normalized = Orbit.importaClientesP0.normalizeClient(rec, tenantContext());
    Object.assign(rec, normalized);
    return rec;
  }

  function wireStore() {
    if (!Orbit.store || !Orbit.importaClientesP0 || typeof Orbit.store.insert !== 'function' || typeof Orbit.store.update !== 'function') return false;
    const store = Orbit.store;
    if (store.__p0ClientWire) return true;
    const originalInsert = store.insert.bind(store);
    const originalUpdate = store.update.bind(store);

    store.insert = function (coll, rec) {
      if (coll === 'clientes' && rec && (rec.importado || rec.importadorP0 || rec.origenImportacion)) normalizeClient(rec);
      return originalInsert(coll, rec);
    };

    store.update = function (coll, id, patch) {
      if (coll === 'clientes' && patch && (patch.importado || patch.importadorP0 || patch.origenImportacion)) normalizeClient(patch);
      return originalUpdate(coll, id, patch);
    };

    store.__p0ClientWire = true;
    return true;
  }

  if (!wireStore()) {
    document.addEventListener('orbit:store', wireStore, { once: true });
    setTimeout(wireStore, 250);
  }
})();
