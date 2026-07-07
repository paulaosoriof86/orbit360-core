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

  /* modelo del vendedor: 'comision' (% sobre comisión aseguradora) | 'neta' (% sobre prima neta) | 'fijo' (monto) */
  function modeloVendedor(aseId) {
    const a = S().get('asesores', aseId) || {};
    return { modo: a.comModo || 'comision', pct: a.shareCom != null ? a.shareCom : DEFAULT_VEND, valor: a.comValor || 0 };
  }
  function comVendedorDe(comAseguradora, baseNeta, aseId) {
    const m = modeloVendedor(aseId);
    if (m.modo === 'fijo') return r2(m.valor);
    if (m.modo === 'neta') return r2(baseNeta * m.pct / 100);
    return r2(comAseguradora * m.pct / 100);
  }

  /* Desglose de comisión de una póliza (o de una base de prima neta dada) */
  function calc(poliza) {
    const base = +(poliza.primaNeta != null ? poliza.primaNeta : poliza.prima) || 0;
    const pctAseg = pctAseguradora(poliza.aseguradoraId, poliza.ramo, poliza.producto || poliza.subramo);
    const comAseguradora = r2(base * pctAseg / 100);
    const m = modeloVendedor(poliza.asesorId);
    const comVendedor = comVendedorDe(comAseguradora, base, poliza.asesorId);
    const comEmpresa = r2(comAseguradora - comVendedor);
    return { base, pctAseg, comAseguradora, modoVend: m.modo, pctVend: m.pct, comVendedor, comEmpresa };
  }
  /* Comisión sobre un monto recaudado (prima neta de un recibo) */
  function calcSobre(baseNeta, poliza) {
    const pctAseg = pctAseguradora(poliza.aseguradoraId, poliza.ramo, poliza.producto || poliza.subramo);
    const comAseguradora = r2(baseNeta * pctAseg / 100);
    const comVendedor = comVendedorDe(comAseguradora, baseNeta, poliza.asesorId);
    return { pctAseg, comAseguradora, comVendedor, comEmpresa: r2(comAseguradora - comVendedor) };
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
  function setVendModo(aseId, modo) { S().update('asesores', aseId, { comModo: modo }); }
  function setVendValor(aseId, valor) { S().update('asesores', aseId, { comValor: +valor || 0 }); }

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

  /* Conciliación de STATEMENT (planilla de comisiones que envía la aseguradora):
     compara lo PAGADO por la aseguradora contra lo ESPERADO según las tarifas vigentes.
     Modo A (con statement importado): filas = [{ aseguradoraId, polizaId|polizaNumero, montoPagado }].
     Modo B (sin archivo): recomputa el ESPERADO de cada registro `comisiones` con la
     tarifa vigente y lo compara con el monto REGISTRADO — detecta "drift" de tarifa/errores. */
  function conciliarStatement(filas) {
    const rows = [];
    if (filas && filas.length) {
      filas.forEach(f => {
        const pol = f.polizaId ? S().get('polizas', f.polizaId)
          : S().all('polizas').find(p => (p.numero || '') === (f.polizaNumero || ''));
        if (!pol) { rows.push({ ref: f.polizaNumero || f.polizaId || '—', sinPoliza: true, pagado: +f.montoPagado || 0, esperado: 0, desv: 0 }); return; }
        const base = +(pol.primaNeta != null ? pol.primaNeta : pol.prima) || 0;
        const esp = calcSobre(base, pol).comAseguradora;
        const pag = +f.montoPagado || 0;
        rows.push({ ref: pol.numero, polizaId: pol.id, base, esperado: esp, pagado: pag, desv: r2(pag - esp), pct: esp ? r2((pag - esp) / esp * 100) : 0, periodo: f.periodo || '', retencion: +f.retencion || 0, ajuste: +f.ajuste || 0, aseguradoraId: pol.aseguradoraId, asesorId: pol.asesorId });
      });
    } else {
      S().all('comisiones').forEach(c => {
        const pol = S().get('polizas', c.polizaId); if (!pol) return;
        const base = +c.base || 0;
        const esp = calcSobre(base, pol).comAseguradora;
        const reg = +c.monto || 0;
        rows.push({ ref: pol.numero, polizaId: pol.id, base, esperado: esp, pagado: reg, desv: r2(reg - esp), pct: esp ? r2((reg - esp) / esp * 100) : 0, comId: c.id, periodo: c.periodo || '', retencion: +c.retencion || 0, ajuste: +c.ajuste || 0, aseguradoraId: pol.aseguradoraId, asesorId: pol.asesorId });
      });
    }
    const totEsp = r2(rows.reduce((s, r) => s + r.esperado, 0));
    const totPag = r2(rows.reduce((s, r) => s + r.pagado, 0));
    const conDesv = rows.filter(r => Math.abs(r.desv) >= 0.5);
    return { rows, totEsperado: totEsp, totPagado: totPag, desviacion: r2(totPag - totEsp), conDesviacion: conDesv.length, n: rows.length };
  }

  return { pctAseguradora, shareVendedor, modeloVendedor, comVendedorDe, calc, calcSobre, setRamoPct, setProdPct, setVendShare, setVendModo, setVendValor, aplicarPlanilla, conciliarStatement, DEFAULT_ASEG, DEFAULT_VEND };
})();
