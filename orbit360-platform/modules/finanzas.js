/* ============================================================
   Orbit 360 · Finanzas  — BETA (núcleo financiero)
   - Movimientos (históricos importables + generación mensual)
   - Liquidación de comisiones a COBRAR a aseguradoras (empresa)
   - Liquidación de comisiones a PAGAR a asesores (% fijo/variable)
   - Conciliación bancaria (doble: pago↔póliza, depósito↔liquidación)
   Comisión: sobre prima NETA, causada sobre prima RECAUDADA.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.finanzas = (function () {
  const U = Orbit.ui, q = Orbit.q, K = Orbit.kit, S = () => Orbit.store;
  let tab = 'resumen';
  const ROLE = () => (Orbit.auth && Orbit.auth.user() && Orbit.auth.user().rol) || 'Dirección';

  function render(host) {
    host.innerHTML = `<div class="page">
      ${K.banner({ icon: '💰', title: 'Orbit Finanzas', sub: 'Liquidaciones y conciliación', features: ['Movimientos', 'Liquidación empresa/asesores', 'Conciliación bancaria'], actions: `<button class="btn primary" onclick="Orbit.importa.open('estados-banco')" style="background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.25)">⬇ Importar banco</button>` })}
      <div class="tabs" style="max-width:660px;margin-bottom:16px">
        ${[['resumen', 'Movimientos'], ['empresa', 'Liquidación empresa'], ['asesores', 'Liquidación asesores'], ['banco', 'Conciliación bancaria']].map(t =>
          `<div class="tab ${tab === t[0] ? 'active' : ''}" data-t="${t[0]}">${t[1]}</div>`).join('')}
      </div>
      <div id="fin-body"></div>
    </div>`;
    host.querySelectorAll('.tab[data-t]').forEach(el => el.addEventListener('click', () => { tab = el.dataset.t; render(host); }));
    const body = document.getElementById('fin-body');
    body.innerHTML = ({ resumen, empresa, asesores, banco }[tab] || resumen)();
    wire(host);
  }

  // ---- agregados ----
  function comisionEmpresaPorAseguradora() {
    const map = {};
    S().all('comisiones').forEach(c => {
      const k = c.aseguradoraId;
      if (!map[k]) map[k] = { devengada: 0, liquidada: 0, n: 0 };
      const v = q.norm(c.monto, c.moneda);
      map[k].n++;
      if (c.estado === 'Liquidada') map[k].liquidada += v; else map[k].devengada += v;
    });
    return map;
  }
  function comisionAsesor() {
    return S().all('asesores').map(a => {
      const coms = S().where('comisiones', c => c.asesorId === a.id);
      const baseRecaudada = coms.reduce((s, c) => s + q.norm(c.base, c.moneda), 0); // prima recaudada (cuota pagada)
      const generada = coms.reduce((s, c) => s + q.norm(c.monto, c.moneda), 0);
      const pct = a.comPct || 12;
      const aPagar = Math.round(baseRecaudada * pct / 100); // % del asesor sobre prima neta recaudada
      const liquidada = coms.filter(c => c.estado === 'Liquidada').reduce((s, c) => s + q.norm(c.monto, c.moneda), 0);
      return { a, baseRecaudada, generada, pct, tipo: a.comTipo || 'variable', aPagar, liquidada, pendiente: Math.max(0, aPagar - liquidada) };
    }).sort((x, y) => y.aPagar - x.aPagar);
  }

  /* ---------- MOVIMIENTOS ---------- */
  function resumen() {
    const cart = q.carteraGlobal();
    const comp = comisionEmpresaPorAseguradora();
    const totalCobrar = Object.values(comp).reduce((s, v) => s + v.devengada, 0);
    const asesoresPagar = comisionAsesor().reduce((s, r) => s + r.pendiente, 0);
    const movs = [
      ['2026-06-18', 'Liquidación Seguros Atlas (may)', 12400, 'Ingreso', 'Liquidada'],
      ['2026-06-15', 'Pago asesor D. Marroquín', -3100, 'Egreso', 'Pagada'],
      ['2026-06-12', 'Recaudo cliente · REC-00451', 700, 'Ingreso', 'Conciliado'],
      ['2026-06-10', 'Pago asistencia / gastos', -1250, 'Egreso', 'Registrado'],
      ['2026-06-05', 'Liquidación Pacífico (may)', 9800, 'Ingreso', 'Por conciliar']
    ];
    return `${K.kpis([
      { label: 'Recaudo del mes', val: U.moneyShort(cart.alDia, 'GTQ'), color: 'var(--ok)', foot: 'prima recaudada', footTone: 'up' },
      { label: 'Comisión a cobrar', val: U.moneyShort(totalCobrar, 'GTQ'), color: 'var(--red)', foot: 'a aseguradoras' },
      { label: 'A pagar asesores', val: U.moneyShort(asesoresPagar, 'GTQ'), color: 'var(--warn)', foot: 'pendiente' },
      { label: 'Cartera vencida', val: U.moneyShort(cart.venc, 'GTQ'), color: 'var(--danger)', foot: 'afecta recaudo', footTone: 'down' }
    ])}
    <div class="card pad" style="margin-bottom:14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      <b style="font-family:var(--f-display);font-size:15px;flex:1">Movimientos</b>
      <button class="btn ghost sm" onclick="Orbit.importa.open('movimientos-finanzas')">⬇ Importar histórico</button>
      <button class="btn ghost sm" onclick="Orbit.importa.open('estados-banco')">🏦 Estado bancario</button>
      <button class="btn primary sm" onclick="alert('Demo: genera el cierre de movimientos del mes a partir de recaudo, liquidaciones y egresos.')">Generar mes</button>
    </div>
    <div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table class="tbl">
      <thead><tr><th>Fecha</th><th>Concepto</th><th class="num">Monto</th><th>Tipo</th><th>Estado</th></tr></thead>
      <tbody>${movs.map(m => `<tr>
        <td style="font-size:12.5px">${U.fmtDate(m[0])}</td>
        <td><b>${U.esc(m[1])}</b></td>
        <td class="num" style="color:${m[2] < 0 ? 'var(--danger)' : 'var(--ok)'}">${U.money(m[2], 'GTQ')}</td>
        <td><span class="badge ${m[3] === 'Ingreso' ? 'ok' : 'neutral'}">${m[3]}</span></td>
        <td>${U.estadoBadge(m[4])}</td></tr>`).join('')}</tbody>
    </table></div></div>`;
  }

  /* ---------- LIQUIDACIÓN EMPRESA (cobrar a aseguradoras) ---------- */
  function empresa() {
    const comp = comisionEmpresaPorAseguradora();
    const rows = Object.entries(comp).map(([id, v]) => ({ asg: q.aseguradora(id), ...v })).sort((a, b) => (b.devengada + b.liquidada) - (a.devengada + a.liquidada));
    const totalCobrar = rows.reduce((s, r) => s + r.devengada, 0);
    return `<div class="cfg-note" style="margin-bottom:14px">🏢 Comisión que la <b>empresa cobra a cada aseguradora</b>, sobre <b>prima neta recaudada</b>. Se concilia contra la planilla que envía la aseguradora.</div>
    ${K.kpis([
      { label: 'Por cobrar', val: U.moneyShort(totalCobrar, 'GTQ'), color: 'var(--red)', foot: 'devengado' },
      { label: 'Liquidado', val: U.moneyShort(rows.reduce((s, r) => s + r.liquidada, 0), 'GTQ'), color: 'var(--ok)', foot: 'ya cobrado', footTone: 'up' },
      { label: 'Aseguradoras', val: rows.length, color: 'var(--info)', foot: 'con comisión' },
      { label: 'Registros', val: rows.reduce((s, r) => s + r.n, 0), color: 'var(--graph)', foot: 'cuotas' }
    ])}
    <div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table class="tbl">
      <thead><tr><th>Aseguradora</th><th class="num">Por cobrar</th><th class="num">Liquidado</th><th class="num">Total</th><th></th></tr></thead>
      <tbody>${rows.map(r => `<tr>
        <td>${r.asg ? `<span style="display:flex;align-items:center;gap:8px"><span class="dot-s" style="background:${r.asg.color}"></span><b>${U.esc(r.asg.nombre)}</b></span>` : '—'}</td>
        <td class="num" style="color:var(--red)"><b>${U.money(r.devengada, 'GTQ')}</b></td>
        <td class="num" style="color:var(--ok)">${U.money(r.liquidada, 'GTQ')}</td>
        <td class="num">${U.money(r.devengada + r.liquidada, 'GTQ')}</td>
        <td style="text-align:right"><button class="btn ghost sm" onclick="Orbit.importa.open('planillas-comision')">Conciliar planilla</button></td>
      </tr>`).join('')}</tbody>
    </table></div></div>`;
  }

  /* ---------- LIQUIDACIÓN ASESORES ---------- */
  function asesores() {
    const rows = comisionAsesor();
    const totalPagar = rows.reduce((s, r) => s + r.pendiente, 0);
    return `<div class="cfg-note" style="margin-bottom:14px">👥 Comisión a <b>pagar a cada asesor</b>: % (fijo o variable) sobre la <b>prima neta recaudada</b> de su cartera — no sobre venta. El % se configura en Configuración › Usuarios.</div>
    ${K.kpis([
      { label: 'Total a pagar', val: U.moneyShort(totalPagar, 'GTQ'), color: 'var(--warn)', foot: 'pendiente' },
      { label: 'Ya liquidado', val: U.moneyShort(rows.reduce((s, r) => s + r.liquidada, 0), 'GTQ'), color: 'var(--ok)', foot: 'pagado', footTone: 'up' },
      { label: 'Asesores', val: rows.length, color: 'var(--info)', foot: 'con comisión' },
      { label: 'Base recaudada', val: U.moneyShort(rows.reduce((s, r) => s + r.baseRecaudada, 0), 'GTQ'), color: 'var(--graph)', foot: 'prima neta' }
    ])}
    <div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table class="tbl">
      <thead><tr><th>Asesor</th><th>Esquema</th><th class="num">Base recaudada</th><th class="num">%</th><th class="num">A pagar</th><th class="num">Pendiente</th><th></th></tr></thead>
      <tbody>${rows.map(r => `<tr>
        <td><div style="display:flex;align-items:center;gap:9px">${U.avatar(r.a.nombre, r.a.color, 'sm')}<b>${U.esc(r.a.nombre)}</b></div></td>
        <td><span class="badge ${r.tipo === 'variable' ? 'info' : 'neutral'}">${r.tipo}</span></td>
        <td class="num">${U.money(r.baseRecaudada, 'GTQ')}</td>
        <td class="num">${r.pct}%</td>
        <td class="num"><b>${U.money(r.aPagar, 'GTQ')}</b></td>
        <td class="num" style="color:${r.pendiente > 0 ? 'var(--warn)' : 'var(--ok)'}">${U.money(r.pendiente, 'GTQ')}</td>
        <td style="text-align:right"><button class="btn primary sm" onclick="alert('Demo: generar liquidación de ${U.esc(r.a.nombre)} por ${U.money(r.pendiente, 'GTQ')}')">Liquidar</button></td>
      </tr>`).join('')}</tbody>
    </table></div></div>`;
  }

  /* ---------- CONCILIACIÓN BANCARIA ---------- */
  function banco() {
    const pagados = S().where('cobros', c => c.estado === 'Pagado');
    const conc = pagados.filter(c => c.conciliado).length;
    const sinConc = pagados.length - conc;
    return `<div class="cfg-note" style="margin-bottom:14px">🏦 <b>Doble conciliación</b>: (1) depósito bancario ↔ recaudo del cliente, y (2) pago aplicado ↔ póliza creada. Importa el estado bancario para cruzar automáticamente, sin duplicar.</div>
    ${K.kpis([
      { label: 'Pagos conciliados', val: conc, color: 'var(--ok)', foot: 'aplicados a póliza', footTone: 'up' },
      { label: 'Por conciliar', val: sinConc, color: 'var(--warn)', foot: 'pago sin aplicar' },
      { label: 'Depósitos sin asociar', val: 3, color: 'var(--danger)', foot: 'del banco' },
      { label: 'Movimientos sin crear', val: 1, color: 'var(--info)', foot: 'detectados' }
    ])}
    <div class="card pad" style="margin-bottom:14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      <b style="font-family:var(--f-display);font-size:15px;flex:1">Conciliación</b>
      <button class="btn primary sm" onclick="Orbit.importa.open('estados-banco')">⬇ Importar estado bancario</button>
    </div>
    <div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table class="tbl">
      <thead><tr><th>Recibo</th><th>Cliente</th><th class="num">Monto</th><th>Pago</th><th>Banco</th><th>Póliza</th></tr></thead>
      <tbody>${pagados.slice(0, 12).map(c => {
        const cli = S().get('clientes', c.clienteId), p = S().get('polizas', c.polizaId);
        return `<tr>
          <td class="mono" style="font-size:12px">REC-${c.id.slice(-5).toUpperCase()}</td>
          <td>${K.clienteCell(c.clienteId)}</td>
          <td class="num">${U.money(c.monto, c.moneda)}</td>
          <td><span style="color:var(--ok)">✓</span></td>
          <td>${c.conciliado ? '<span style="color:var(--ok)" title="Depósito cruzado">✓</span>' : '<span style="color:var(--warn)" title="Sin depósito asociado">◷</span>'}</td>
          <td><span style="color:var(--ok)" title="Aplicado a póliza">✓ ${p ? p.numero : ''}</span></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div></div>`;
  }

  function wire(host) {}
  return { render };
})();
