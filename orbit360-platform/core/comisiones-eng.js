/* ============================================================
   Orbit 360 · Motor de comisiones
   ------------------------------------------------------------
   Dos comisiones, ambas en función de % CONFIGURABLES:
   1) Comisión de la ASEGURADORA (lo que la aseguradora paga al
      intermediario): % por RAMO, con override por PRODUCTO.
      Se calcula sobre PRIMA NETA recaudada.
   2) Comisión del VENDEDOR (asesor): % que NOSOTROS le asignamos
      como participación sobre la comisión de la aseguradora.
      El resto queda como comisión de la EMPRESA.

   Las tarifas viven en cada aseguradora:
     aseguradora.comisiones      = { "<ramo>": pct, ... }
     aseguradora.comisionesProd  = { "<producto>": pct, ... }   (override)
   y la participación del vendedor en cada asesor:
     asesor.shareCom = pct   (participación sobre la comisión de la aseguradora)

   Editable a mano y CONFIGURABLE por importación de la planilla de
   comisiones (lee, por producto, cuánto paga cada aseguradora).
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.comeng = (function () {
  const S = () => Orbit.store;
  const DEFAULT_ASEG = 12;   // % por defecto si no hay tarifa
  const DEFAULT_VEND = 50;   // % de participación del vendedor por defecto
  function r2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

  /* % que paga la aseguradora para un ramo/producto (resuelve override de producto → ramo → default) */
  function pctAseguradora(asgId, ramo, producto) {
    const a = S().get('aseguradoras', asgId); if (!a) return DEFAULT_ASEG;
    if (producto && a.comisionesProd && a.comisionesProd[producto] != null) return a.comisionesProd[producto];
    if (ramo && a.comisiones && a.comisiones[ramo] != null) return a.comisiones[ramo];
    return a.comisionDefault != null ? a.comisionDefault : DEFAULT_ASEG;
  }
  /* participación del vendedor (% sobre la comisión de la aseguradora) */
  function shareVendedor(aseId) {
    const a = S().get('asesores', aseId);
    return (a && a.shareCom != null) ? a.shareCom : DEFAULT_VEND;
  }

  /* Desglose de comisión de una póliza (o de una base de prima neta dada) */
  function calc(poliza) {
    const base = +(poliza.primaNeta != null ? poliza.primaNeta : poliza.prima) || 0;
    const pctAseg = pctAseguradora(poliza.aseguradoraId, poliza.ramo, poliza.producto || poliza.subramo);
    const comAseguradora = r2(base * pctAseg / 100);
    const pctVend = shareVendedor(poliza.asesorId);
    const comVendedor = r2(comAseguradora * pctVend / 100);
    const comEmpresa = r2(comAseguradora - comVendedor);
    return { base, pctAseg, comAseguradora, pctVend, comVendedor, comEmpresa };
  }
  /* Comisión sobre un monto recaudado (prima neta de un recibo) */
  function calcSobre(baseNeta, poliza) {
    const pctAseg = pctAseguradora(poliza.aseguradoraId, poliza.ramo, poliza.producto || poliza.subramo);
    const comAseguradora = r2(baseNeta * pctAseg / 100);
    const pctVend = shareVendedor(poliza.asesorId);
    const comVendedor = r2(comAseguradora * pctVend / 100);
    return { pctAseg, comAseguradora, pctVend, comVendedor, comEmpresa: r2(comAseguradora - comVendedor) };
  }

  /* ---- setters (persisten vía store) ---- */
  function setRamoPct(asgId, ramo, pct) {
    const a = S().get('aseguradoras', asgId); if (!a) return;
    const c = Object.assign({}, a.comisiones); c[ramo] = +pct || 0;
    S().update('aseguradoras', asgId, { comisiones: c });
  }
  function setProdPct(asgId, producto, pct) {
    const a = S().get('aseguradoras', asgId); if (!a) return;
    const c = Object.assign({}, a.comisionesProd);
    if (pct === '' || pct == null) delete c[producto]; else c[producto] = +pct || 0;
    S().update('aseguradoras', asgId, { comisionesProd: c });
  }
  function setVendShare(aseId, pct) { S().update('asesores', aseId, { shareCom: +pct || 0 }); }

  /* Aplica filas de una planilla importada al matriz de tarifas.
     filas: [{ aseguradoraId, producto, ramo, pct }] */
  function aplicarPlanilla(filas) {
    let n = 0;
    (filas || []).forEach(f => {
      if (!f.aseguradoraId || f.pct == null) return;
      if (f.producto) setProdPct(f.aseguradoraId, f.producto, f.pct);
      else if (f.ramo) setRamoPct(f.aseguradoraId, f.ramo, f.pct);
      n++;
    });
    document.dispatchEvent(new CustomEvent('orbit:tarifas'));
    return n;
  }

  return { pctAseguradora, shareVendedor, calc, calcSobre, setRamoPct, setProdPct, setVendShare, aplicarPlanilla, DEFAULT_ASEG, DEFAULT_VEND };
})();
