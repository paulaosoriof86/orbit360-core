/* ============================================================
   Orbit 360 · P0 wire importador de polizas
   Fecha: 2026-07-30

   Integra reglas P0 sin modificar core/importa.js ni backend protegido.
   - Normaliza polizas antes de insert/update.
   - Evita pisar vigencias distintas cuando el importador deduplica por numero.
   - Redirige recibos generados por importacion desde cobros hacia recibosEsperados.
   - Genera recibosEsperados para renovada vigente.
   - Retira defaults legacy sin procedencia (Contado / comisiones inferidas).
   ============================================================ */
(function () {
  window.Orbit = window.Orbit || {};
  if (Orbit.__importaPolizasP0Wired) return;
  Orbit.__importaPolizasP0Wired = true;

  function ready() {
    return Orbit.store && Orbit.importaPolizasP0 && typeof Orbit.store.insert === 'function' && typeof Orbit.store.update === 'function';
  }

  function clone(obj) { return Object.assign({}, obj || {}); }
  function text(value) { return String(value == null ? '' : value).trim(); }
  function appendReason(rec, reason) {
    const current = Array.isArray(rec.motivosValidacion) ? rec.motivosValidacion.slice() : [];
    if (reason && current.indexOf(reason) < 0) current.push(reason);
    rec.motivosValidacion = current;
    rec.requiereValidacion = current.length > 0 || rec.requiereValidacion === true;
  }

  function isPolicyLike(rec) {
    return !!(rec && (rec.numero || rec.poliza || rec.numeroPoliza) && (rec.vigenciaIni || rec.vigenciaInicio || rec.desde || rec.vigenciaFin || rec.vigenciaFinal || rec.hasta || rec.vencimiento));
  }

  /*
   * core/importa.js es un owner transversal legacy y no es fuente autoritativa
   * de condiciones comerciales de una poliza real. En esa ruta puede completar
   * frecuencia='Contado', comAseguradoraPct=12 y comVendedorPct=50 aunque la fila
   * no los traiga. El wire no toca ese archivo protegido: elimina el supuesto
   * antes de normalizar y obliga validacion cuando no hay procedencia verificable.
   *
   * Un importador fuente-especifico futuro puede conservar comisiones solo si
   * declara comisionFuenteValidada=true + comisionFuente. Para el default Contado,
   * se considera evidencia minima una forma/medio de pago explicita o una marca
   * frecuenciaFuenteValidada=true producida por el parser con trazabilidad.
   */
  function sanitizeLegacyAssumptions(rec, current) {
    if (!rec) return rec;
    const imported = rec.importado === true || (current && current.importado === true);
    if (!imported) return rec;

    const trustedCommission = rec.comisionFuenteValidada === true && !!text(rec.comisionFuente);
    if (!trustedCommission) {
      delete rec.comAseguradoraPct;
      delete rec.comVendedorPct;
      rec.comisionFuenteValidada = false;
      rec.comisionEstado = 'pendiente_fuente_separada';
    }

    const frequency = text(rec.frecuencia || rec.forma).toLowerCase();
    const explicitPaymentEvidence = !!text(rec.formaPago || rec.medioPago || rec.conducto) || rec.frecuenciaFuenteValidada === true;
    if (frequency === 'contado' && !explicitPaymentEvidence) {
      rec.frecuencia = '';
      rec.forma = '';
      rec._legacyContadoDefaultRemoved = true;
      appendReason(rec, 'forma_pago');
    }
    return rec;
  }

  function normalizePolicy(rec, current) {
    if (!Orbit.importaPolizasP0 || !isPolicyLike(rec)) return rec;
    sanitizeLegacyAssumptions(rec, current);
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
        normalizePolicy(rec, null);
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
        let current = null;
        try { current = store.get('polizas', id) || {}; } catch (e) { current = {}; }
        normalizePolicy(patch, current);
        try {
          const currentNorm = normalizePolicy(clone(current), current);
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

  Orbit.importaPolizasP0Wire = Object.freeze({
    sanitizeLegacyAssumptions: sanitizeLegacyAssumptions,
    legacyDefaultsAuthoritative: false,
    commissionSourceRequired: true,
    paymentFrequencyProvenanceRequired: true
  });

  if (!wireStore()) {
    document.addEventListener('orbit:store', wireStore, { once: true });
    setTimeout(wireStore, 250);
  }
})();
