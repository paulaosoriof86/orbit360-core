/* ============================================================
   Orbit 360 · P0 wire importador de polizas
   Fecha: 2026-07-31

   Integra reglas P0 sin modificar core/importa.js ni backend protegido.
   - Normaliza polizas antes de insert/update.
   - Evita pisar vigencias distintas cuando el importador deduplica por numero.
   - Redirige recibos generados por importacion desde cobros hacia recibosEsperados.
   - Retira defaults legacy sin procedencia (Contado / comisiones inferidas).
   - Separa frecuencia, forma/metodo y conducto de pago.
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
    return !!(rec && (rec.numero || rec.poliza || rec.numeroPoliza) &&
      (rec.vigenciaIni || rec.vigenciaInicio || rec.desde || rec.vigenciaFin || rec.vigenciaFinal || rec.hasta || rec.vencimiento));
  }

  function sanitizeLegacyAssumptions(rec, current) {
    if (!rec) return rec;
    const imported = rec.importado === true || rec.importadorP0 === true || (current && current.importado === true);
    if (!imported) return rec;

    const trustedCommission = rec.comisionFuenteValidada === true && !!text(rec.comisionFuente);
    if (!trustedCommission) {
      delete rec.comAseguradoraPct;
      delete rec.comVendedorPct;
      rec.comisionFuenteValidada = false;
      rec.comisionEstado = 'pendiente_fuente_separada';
    }

    const frequency = text(rec.frecuencia || rec.forma).toLowerCase();
    const frequencyProvenance = rec.frecuenciaFuenteValidada === true ||
      !!text(rec.frecuenciaFuente || rec.periodicidadFuente || rec._sourceFrequencyField);
    if (frequency === 'contado' && !frequencyProvenance) {
      rec.frecuencia = '';
      rec.forma = '';
      rec._legacyContadoDefaultRemoved = true;
      appendReason(rec, 'frecuencia_pago');
    }

    const state = text(rec.estado).toLowerCase();
    const explicitStateEvidence = !!text(rec.estadoFuenteOriginal) || rec.estadoFuenteValidada === true;
    if (state === 'por renovar' && !explicitStateEvidence) {
      rec._legacyRenewalStatusCollapsed = true;
      appendReason(rec, 'estado');
    }
    return rec;
  }

  function normalizePolicy(rec, current) {
    if (!Orbit.importaPolizasP0 || !isPolicyLike(rec)) return rec;
    sanitizeLegacyAssumptions(rec, current);
    const normalized = Orbit.importaPolizasP0.normalizePolicy(rec, {
      today: Orbit.ui && Orbit.ui.today ? Orbit.ui.today() : undefined
    });
    Object.assign(rec, normalized);
    return rec;
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
    out.frecuencia = out.frecuencia || '';
    out.formaPago = out.formaPago || '';
    out.conductoPago = out.conductoPago || out.conducto || '';
    if (out.monto === '' || out.monto == null) out.monto = null;
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
        return originalInsert(coll, rec);
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
          if (currentNorm._sourceVersionKey && patch._sourceVersionKey &&
              currentNorm._sourceVersionKey !== patch._sourceVersionKey) {
            const nuevo = clone(patch);
            nuevo.id = nuevo.id || ('pol_imp_p0_' + Date.now().toString(36));
            nuevo.importado = true;
            return store.insert('polizas', nuevo);
          }
        } catch (e) {}
      }
      return originalUpdate(coll, id, patch);
    };

    store.__p0PolicyWire = true;
    store.__p0PolicyWireVersion = '20260731.2';
    return true;
  }

  Orbit.importaPolizasP0Wire = Object.freeze({
    sanitizeLegacyAssumptions,
    legacyDefaultsAuthoritative: false,
    commissionSourceRequired: true,
    paymentFrequencyProvenanceRequired: true,
    paymentDimensionsSeparated: true,
    premiumInferenceAllowed: false,
    stateSourceProvenanceRequiredForRenewal: true,
    directReceiptGeneration: false
  });

  if (!wireStore()) {
    document.addEventListener('orbit:store', wireStore, { once: true });
    setTimeout(wireStore, 250);
  }
})();
