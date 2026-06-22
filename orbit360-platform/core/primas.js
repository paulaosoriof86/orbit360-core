/* ============================================================
   Orbit 360 · Motor de primas y recibos
   ------------------------------------------------------------
   Desglose de prima (confirmado con pólizas reales SIGA-GT):
     Prima Neta
   + Gastos de Expedición (emisión)
   + Gastos Financieros  = recargo por fraccionamiento (% sobre neta,
                            SOLO si el pago es fraccionado)
   + Otros (asistencias / cargos adicionales)
   = Base gravable
   + IVA (% configurable por país: GT 12% · CO 19%)
   = PRIMA TOTAL
   Validación del ejemplo GT:
     neta 15095.36 + GFin 754.77 (5%) + IVA 1902.02 (12% de 15850.13)
     = 17752.15  ·  /12 cuotas = 1479.35
   ------------------------------------------------------------
   Generación de recibos por forma de pago:
     · Contado / Tarjeta de crédito / Visa Cuotas al contado → 1 recibo
       (SIN recargo financiero).
     · Fraccionado (Mensual=12, Bimestral=6, Trimestral=4,
       Cuatrimestral=3, Semestral=2) → N recibos, prorrateados,
       CON recargo financiero. El residuo de redondeo se ajusta en
       el último recibo para cuadrar exacto con la prima total.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.primas = (function () {

  // cuotas por frecuencia de pago
  const FRECUENCIAS = {
    'Contado': 1, 'Anual': 1, 'Semestral': 2, 'Cuatrimestral': 3,
    'Trimestral': 4, 'Bimestral': 6, 'Mensual': 12
  };
  const FORMAS_PAGO = ['Tarjeta de crédito', 'Visa Cuotas', 'Transferencia', 'Efectivo', 'Domiciliado', 'Cheque'];
  const CONDUCTOS = ['CAT (cargo automático)', 'Cobro directo del intermediario', 'Cobro de la aseguradora'];

  function cuotasDe(frecuencia) { return FRECUENCIAS[frecuencia] || 1; }
  function r2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

  /* ---- País → tasas (configurables al dar de alta el país) ---- */
  function cfgPais(pais) {
    const c = (Orbit.paisCfg ? Orbit.paisCfg(pais) : null) || {};
    return { iva: c.iva != null ? c.iva : 12, recargoFinanciero: c.recargoFinanciero != null ? c.recargoFinanciero : 5, gastosEmision: c.gastosEmision || 0 };
  }

  /**
   * Calcula el desglose de prima.
   * @param {number} primaNeta
   * @param {string} pais  GT|CO (define IVA y recargo por defecto)
   * @param {object} o     { fraccionado, gastosEmision, otros, recargoFinPct, ivaPct }
   */
  function desglose(primaNeta, pais, o) {
    o = o || {};
    const cfg = cfgPais(pais);
    const neta = +primaNeta || 0;
    const gastosEmision = +(o.gastosEmision != null ? o.gastosEmision : cfg.gastosEmision) || 0;
    const otros = +o.otros || 0;
    const recargoPct = o.recargoFinPct != null ? o.recargoFinPct : cfg.recargoFinanciero;
    const ivaPct = o.ivaPct != null ? o.ivaPct : cfg.iva;
    const gastosFinan = o.fraccionado ? r2(neta * recargoPct / 100) : 0;
    const baseGravable = r2(neta + gastosEmision + gastosFinan + otros);
    const iva = r2(baseGravable * ivaPct / 100);
    const total = r2(baseGravable + iva);
    return {
      neta: r2(neta), gastosEmision: r2(gastosEmision), gastosFinan, otros: r2(otros),
      baseGravable, iva, ivaPct, recargoPct, total, fraccionado: !!o.fraccionado
    };
  }

  /**
   * Genera la tabla de recibos a partir del desglose y la frecuencia.
   * @returns [{ n, neta, gastosEmision, gastosFinan, otros, iva, total,
   *            comAseguradora, comVendedor, vence, fechaLimite }]
   */
  function recibos(d, opts) {
    opts = opts || {};
    const n = Math.max(1, cuotasDe(opts.frecuencia || 'Contado'));
    const inicio = opts.vigenciaInicio ? new Date(opts.vigenciaInicio) : new Date();
    const comAsegPct = +opts.comAseguradoraPct || 0;
    const comVendPct = +opts.comVendedorPct || 0;
    const pasoMeses = 12 / n;
    // reparto: el primer recibo lleva 100% de los gastos de emisión;
    // los demás componentes se prorratean en partes iguales.
    const split = (totalComp, idx, repartirEmisionEn1) => {
      if (repartirEmisionEn1) return idx === 0 ? totalComp : 0;
      const base = r2(totalComp / n);
      // ajustar residuo en el último
      if (idx === n - 1) return r2(totalComp - base * (n - 1));
      return base;
    };
    const rows = [];
    for (let i = 0; i < n; i++) {
      const neta = split(d.neta, i, false);
      const gastosEmision = split(d.gastosEmision, i, true);
      const gastosFinan = split(d.gastosFinan, i, false);
      const otros = split(d.otros, i, false);
      const baseGrav = r2(neta + gastosEmision + gastosFinan + otros);
      // IVA por recibo: prorrateo del IVA total para cuadrar exacto
      const iva = i === n - 1 ? r2(d.iva - r2(d.iva / n) * (n - 1)) : r2(d.iva / n);
      const total = r2(baseGrav + iva);
      const venc = new Date(inicio); venc.setMonth(venc.getMonth() + Math.round(i * pasoMeses));
      const lim = new Date(venc); lim.setDate(lim.getDate() + 15);
      rows.push({
        n: (i + 1) + '/' + n,
        neta, gastosEmision, gastosFinan, otros, iva, total,
        comAseguradora: r2(neta * comAsegPct / 100),
        comVendedor: r2(neta * comVendPct / 100),
        vence: venc.toISOString().slice(0, 10),
        fechaLimite: lim.toISOString().slice(0, 10)
      });
    }
    return rows;
  }

  /** ¿Esta forma de pago es de un solo pago aunque la frecuencia diga otra cosa? */
  function esContado(frecuencia, forma) {
    if (cuotasDe(frecuencia) === 1) return true;
    return false; // tarjeta/visa cuotas fraccionada SÍ genera N recibos
  }

  return { FRECUENCIAS, FORMAS_PAGO, CONDUCTOS, cuotasDe, cfgPais, desglose, recibos, esContado, r2 };
})();
