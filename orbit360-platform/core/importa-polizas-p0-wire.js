/* ============================================================
   Orbit 360 · P0 wire importador de polizas
   Fecha: 2026-07-09

   Integra reglas P0 sin modificar core/importa.js ni backend protegido.
   - Normaliza polizas antes de insert/update.
   - Evita pisar vigencias distintas cuando el importador deduplica por numero.
   - Redirige recibos generados por importacion desde cobros hacia recibosEsperados.
   - Genera recibosEsperados para renovada vigente.
   ============================================================ */
(function () {
  window.Orbit = window.Orbit || {};
  if (Orbit.__importaPolizasP0Wired) return;
  Orbit.__importaPolizasP0Wired = true;

  function ready() {
    return Orbit.store && Orbit.importaPolizasP0 && typeof Orbit.store.insert === 'function' && typeof Orbit.store.update === 'function';
  }

  function clone(obj) { return Object.assign({}, obj || {}); }

  function isPolicyLike(rec) {
    return !!(rec && (rec.numero || rec.poliza || rec.numeroPoliza) && (rec.vigenciaIni || rec.vigenciaInicio || rec.desde || rec.vigenciaFin || rec.vigenciaFinal || rec.hasta || rec.vencimiento));
  }

  function normalizePolicy(rec) {
    if (!Orbit.importaPolizasP0 || !isPolicyLike(rec)) return rec;
    const normalized = Orbit.importaPolizasP0.normalizePolicy(rec, { today: Orbit.ui && Orbit.ui.today ? Orbit.ui.today() : undefined });
    Object.assign(rec, normalized);
    return rec;
  }

  function ensureExpectedReceipts(policy) {
    if (!Orbit.primas || !Orbit.importaPolizasP0 || !Orbit.importaPolizasP0.shouldGenerateExpectedReceipts(policy)) return;
    if (policy.__p0ExpectedReceiptsGenerated) return;
    if (!(policy.estadoOperativoOrbit === 'vigente_renovada')) return;
    policy.__p0ExpectedReceiptsGenerated = true;
    try {
      const frac = Orbit.primas.cuotasDe(policy.frecuencia || policy.formaPago) > 1;
      const desglose = Orbit.primas.desglose(policy.primaNeta, policy.pais, { fraccionado: frac });
      const recibos = Orbit.primas.recibos(desglose, {
        frecuencia: policy.frecuencia || policy.formaPago,
        vigenciaInicio: policy.vigenciaIni || (Orbit.ui && Orbit.ui.today ? Orbit.ui.today() : new Date().toISOString().slice(0, 10)),
        comAseguradoraPct: policy.comAseguradoraPct,
        comVendedorPct: policy.comVendedorPct
      });
      recibos.forEach(function (r, i) {
        const seed = Orbit.importaPolizasP0.expectedReceiptSeed(policy, r, i);
        seed.id = 'rec_esp_p0_' + (policy.id || policy._dedupKey || Date.now()) + '_' + i;
        seed.origen = 'poliza_importada_p0';
        Orbit.store.insert('recibosEsperados', seed);
      });
    } catch (e) {}
  }

  function normalizeImportedReceipt(rec) {
    const out = clone(rec);
    out.id = String(out.id || '').replace(/^cob_imp_/, 'rec_esp_imp_') || ('rec_esp_imp_' + Date.now());
    out.estado = 'esperado';
    out.estadoCartera = 'recibo_esperado';
    out.estadoConciliacion = out.estadoConciliacion || 'pendiente';
    out.confirmadoPago = false;
    out.carteraOperativa = false;
    out.conciliado = false;
    out.origen = out.origen || 'poliza_importada';
    delete out.fechaPago;
    return out;
  }

  function wireStore() {
    if (!ready()) return false;
    const store = Orbit.store;
    if (store.__p0PolicyWire) return true;
    const originalInsert = store.insert.bind(store);
    const originalUpdate = store.update.bind(store);

    store.insert = function (coll, rec) {
      if (coll === 'polizas') {
        normalizePolicy(rec);
        const result = originalInsert(coll, rec);
        ensureExpectedReceipts(rec);
        return result;
      }
      if (coll === 'cobros' && rec && rec.importado && String(rec.id || '').indexOf('cob_imp_') === 0) {
        return originalInsert('recibosEsperados', normalizeImportedReceipt(rec));
      }
      return originalInsert(coll, rec);
    };

    store.update = function (coll, id, patch) {
      if (coll === 'polizas') {
        normalizePolicy(patch);
        try {
          const current = store.get('polizas', id) || {};
          const currentNorm = normalizePolicy(clone(current));
          if (currentNorm._dedupKey && patch._dedupKey && currentNorm._dedupKey !== patch._dedupKey) {
            const nuevo = clone(patch);
            nuevo.id = 'pol_imp_p0_' + Date.now().toString(36);
            nuevo.importado = true;
            return store.insert('polizas', nuevo);
          }
        } catch (e) {}
      }
      return originalUpdate(coll, id, patch);
    };

    store.__p0PolicyWire = true;
    return true;
  }

  if (!wireStore()) {
    document.addEventListener('orbit:store', wireStore, { once: true });
    setTimeout(wireStore, 250);
  }
})();
