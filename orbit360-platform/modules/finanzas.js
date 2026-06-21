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
      <div class="tabs" style="max-width:880px;margin-bottom:16px">
        ${[['resumen', 'Movimientos'], ['dashboard', 'Dashboard'], ['presupuesto', 'Presupuesto'], ['metas', 'Metas'], ['empresa', 'Liq. empresa'], ['asesores', 'Liq. asesores'], ['banco', 'Conciliación']].map(t =>
          `<div class="tab ${tab === t[0] ? 'active' : ''}" data-t="${t[0]}">${t[1]}</div>`).join('')}
      </div>
      <div id="fin-body"></div>
    </div>`;
    host.querySelectorAll('.tab[data-t]').forEach(el => el.addEventListener('click', () => { tab = el.dataset.t; render(host); }));
    const body = document.getElementById('fin-body');
    body.innerHTML = ({ resumen, dashboard, presupuesto, metas, empresa, asesores, banco }[tab] || resumen)();
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

  // ---- producción NETA con ajustes por no devengado (cancelaciones) ----
  function produccionNeta() {
    // prima neta vigente menos primas no devengadas por cancelación
    const vig = S().where('polizas', p => p.estado === 'Vigente' || p.estado === 'Por renovar')
      .reduce((s, p) => s + q.norm(p.prima, p.moneda), 0);
    const noDeveng = S().all('cancelaciones').reduce((s, c) => {
      const cli = S().get('clientes', c.clienteId);
      return s + q.norm(c.valorPerdido, (cli && cli.moneda) || 'GTQ');
    }, 0);
    return { bruta: vig, ajuste: noDeveng, neta: Math.max(0, vig - noDeveng) };
  }

  /* ---------- DASHBOARD financiero ---------- */
  function dashboard() {
    const prod = produccionNeta();
    // series demo intermensual (6 meses) e interanual
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
    const ingresos = [82, 91, 88, 102, 110, 124].map(x => x * 1000);
    const egresos = [60, 64, 70, 72, 75, 80].map(x => x * 1000);
    const maxV = Math.max(...ingresos);
    const anioActual = 612000, anioAnterior = 540000;
    const varAnual = Math.round((anioActual / anioAnterior - 1) * 100);
    const utilidad = ingresos[5] - egresos[5];
    return `${K.kpis([
      { label: 'Producción neta', val: U.moneyShort(prod.neta, 'GTQ'), color: 'var(--red)', foot: 'prima neta vigente' },
      { label: 'Utilidad del mes', val: U.moneyShort(utilidad, 'GTQ'), color: 'var(--ok)', foot: 'ingresos − egresos', footTone: 'up' },
      { label: 'Var. interanual', val: (varAnual >= 0 ? '+' : '') + varAnual + '%', color: 'var(--info)', foot: 'vs año anterior', footTone: varAnual >= 0 ? 'up' : 'down' },
      { label: 'Ajuste no devengado', val: '−' + U.moneyShort(prod.ajuste, 'GTQ'), color: 'var(--warn)', foot: 'cancelaciones', footTone: 'down' }
    ])}
    <div class="card pad" style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <b style="font-family:var(--f-display);font-size:15px">Ingresos vs egresos · comparativo intermensual</b>
        <span style="display:flex;gap:14px;font-size:12px"><span style="display:flex;align-items:center;gap:5px"><span class="dot-s" style="background:var(--ok)"></span>Ingresos</span><span style="display:flex;align-items:center;gap:5px"><span class="dot-s" style="background:var(--danger)"></span>Egresos</span></span>
      </div>
      <div style="display:flex;align-items:flex-end;gap:14px;height:180px;padding-top:10px">
        ${meses.map((m, i) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;height:100%;justify-content:flex-end">
          <div style="display:flex;gap:3px;align-items:flex-end;height:100%;width:100%;justify-content:center">
            <div title="Ingresos ${U.money(ingresos[i], 'GTQ')}" style="width:42%;background:linear-gradient(180deg,#34b96a,#1f8a4c);border-radius:4px 4px 0 0;height:${ingresos[i] / maxV * 100}%"></div>
            <div title="Egresos ${U.money(egresos[i], 'GTQ')}" style="width:42%;background:linear-gradient(180deg,#e0566a,#C5162E);border-radius:4px 4px 0 0;height:${egresos[i] / maxV * 100}%"></div>
          </div>
          <span style="font-size:11px;color:var(--ink-3);font-family:var(--f-mono)">${m}</span>
        </div>`).join('')}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div class="card pad">
        <b style="font-family:var(--f-display);font-size:15px">Comparativo interanual</b>
        <div style="display:flex;align-items:flex-end;gap:24px;margin-top:16px">
          ${[['2025', anioAnterior, '#9aa0a8'], ['2026', anioActual, 'var(--red)']].map(([y, v, c]) => `<div style="flex:1;text-align:center">
            <div style="height:120px;display:flex;align-items:flex-end;justify-content:center"><div style="width:60%;background:${c};border-radius:6px 6px 0 0;height:${v / anioActual * 100}%"></div></div>
            <div style="font-family:var(--f-display);font-weight:800;margin-top:8px">${U.moneyShort(v, 'GTQ')}</div>
            <div class="muted" style="font-size:12px">${y}</div></div>`).join('')}
        </div>
        <div class="cfg-note" style="margin-top:14px">Crecimiento <b style="color:var(--ok)">+${varAnual}%</b> vs año anterior. Base para fijar metas realistas.</div>
      </div>
      <div class="card pad">
        <b style="font-family:var(--f-display);font-size:15px">Salud financiera</b>
        <div style="display:grid;gap:11px;margin-top:14px">
          ${finRow('Margen operativo', Math.round(utilidad / ingresos[5] * 100) + '%', 'ok')}
          ${finRow('Recaudo / producción', '78%', 'warn')}
          ${finRow('Comisión efectiva', '14.2%', 'info')}
          ${finRow('Gasto fijo / ingreso', '41%', 'neutral')}
        </div>
        <button class="btn primary" style="margin-top:16px;width:100%" onclick="location.hash='#/finanzas';setTimeout(()=>document.querySelectorAll('.tab[data-t]').forEach(t=>{if(t.dataset.t==='metas')t.click()}),50)">Fijar metas desde estos datos →</button>
      </div>
    </div>`;
  }
  function finRow(k, v, tone) {
    const col = { ok: 'var(--ok)', warn: 'var(--warn)', info: 'var(--info)', neutral: 'var(--ink)' }[tone];
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--line-2)"><span style="font-size:13px">${k}</span><b style="font-family:var(--f-display);color:${col}">${v}</b></div>`;
  }

  /* ---------- PRESUPUESTO ---------- */
  function presupuesto() {
    const ingresos = [['Comisiones de aseguradoras', 110000, 124000], ['Financiamiento de primas', 28000, 31500], ['Otros ingresos', 6000, 4200]];
    const egresos = [['Comisiones a asesores', 38000, 41000], ['Gastos fijos (nómina, renta)', 32000, 32000], ['Operación y asistencia', 12000, 13800], ['Marketing', 8000, 6500]];
    const tIngP = ingresos.reduce((s, r) => s + r[1], 0), tIngR = ingresos.reduce((s, r) => s + r[2], 0);
    const tEgP = egresos.reduce((s, r) => s + r[1], 0), tEgR = egresos.reduce((s, r) => s + r[2], 0);
    return `<div class="cfg-note" style="margin-bottom:14px">📊 Presupuesto vs real del mes. Ingresos por <b>comisiones</b> y <b>financiamiento</b>; egresos por <b>comisiones</b>, <b>gastos fijos</b> y operación. Importable desde el histórico.</div>
    ${K.kpis([
      { label: 'Ingresos (real)', val: U.moneyShort(tIngR, 'GTQ'), color: 'var(--ok)', foot: 'ppto ' + U.moneyShort(tIngP, 'GTQ'), footTone: 'up' },
      { label: 'Egresos (real)', val: U.moneyShort(tEgR, 'GTQ'), color: 'var(--danger)', foot: 'ppto ' + U.moneyShort(tEgP, 'GTQ') },
      { label: 'Resultado', val: U.moneyShort(tIngR - tEgR, 'GTQ'), color: 'var(--red)', foot: 'utilidad real' },
      { label: 'Cumpl. ingresos', val: Math.round(tIngR / tIngP * 100) + '%', color: 'var(--info)', foot: 'vs presupuesto' }
    ])}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      ${presupTabla('Ingresos', ingresos, 'ok')}
      ${presupTabla('Egresos', egresos, 'danger')}
    </div>
    <button class="btn ghost" style="margin-top:14px" onclick="Orbit.importa.open('movimientos-finanzas')">⬇ Importar histórico de movimientos</button>`;
  }
  function presupTabla(titulo, rows, tone) {
    return `<div class="card" style="overflow:hidden"><div style="padding:11px 13px;border-bottom:1px solid var(--line);font-family:var(--f-display);font-weight:800;font-size:14px">${titulo}</div>
      <table class="tbl"><thead><tr><th>Categoría</th><th class="num">Ppto</th><th class="num">Real</th><th class="num">%</th></tr></thead>
      <tbody>${rows.map(r => `<tr><td>${r[0]}</td><td class="num">${U.money(r[1], 'GTQ')}</td><td class="num"><b>${U.money(r[2], 'GTQ')}</b></td><td class="num" style="color:${r[2] >= r[1] ? (tone === 'ok' ? 'var(--ok)' : 'var(--danger)') : 'var(--ink-3)'}">${Math.round(r[2] / r[1] * 100)}%</td></tr>`).join('')}</tbody></table></div>`;
  }

  /* ---------- METAS ---------- */
  function metas() {
    const prod = produccionNeta();
    const board = q.leaderboard();
    return `<div class="cfg-note" style="margin-bottom:14px">🎯 Metas sobre <b>prima NETA</b> (no total). Por <b>asesor</b>, <b>empresa</b> y <b>aseguradora</b>, mensual o anual (para incentivos). De aquí derivan metas de recaudo y financieras.</div>
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      <button class="btn primary sm" onclick="alert('Demo: crear meta mensual/anual por asesor, empresa o aseguradora.')">+ Crear meta</button>
      <select class="o-sel"><option>Mensual · Junio 2026</option><option>Anual · 2026</option></select>
      <select class="o-sel"><option>Por asesor</option><option>Empresa</option><option>Por aseguradora</option></select>
    </div>
    <div class="card pad" style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:15px">Meta de la empresa (prima neta)</b><span class="mono" style="font-size:13px">${U.moneyShort(prod.neta, 'GTQ')} / ${U.moneyShort(820000, 'GTQ')}</span></div>
      <div class="bar" style="margin-top:10px;height:12px"><i style="width:${Math.min(100, Math.round(prod.neta / 820000 * 100))}%"></i></div>
      <div class="muted" style="font-size:12px;margin-top:7px">Meta de recaudo derivada (78%): <b>${U.moneyShort(820000 * .78, 'GTQ')}</b> · ajuste por no devengado aplicado: −${U.moneyShort(prod.ajuste, 'GTQ')}</div>
    </div>
    <div class="card" style="overflow:hidden"><table class="tbl">
      <thead><tr><th>Asesor</th><th class="num">Meta neta</th><th class="num">Real neto</th><th>Avance</th><th class="num">Incentivo</th></tr></thead>
      <tbody>${board.map(b => {
        const meta = b.asesor.metaPrima, pct = Math.min(140, Math.round(b.prima / meta * 100));
        return `<tr><td><div style="display:flex;align-items:center;gap:9px">${U.avatar(b.asesor.nombre, b.asesor.color, 'sm')}<b>${U.esc(b.asesor.nombre)}</b></div></td>
          <td class="num">${U.money(meta, 'GTQ')}</td>
          <td class="num">${U.money(b.prima, 'GTQ')}</td>
          <td><div style="display:flex;align-items:center;gap:8px"><div class="bar" style="width:90px"><i style="width:${Math.min(100, pct)}%;background:${pct >= 100 ? 'linear-gradient(90deg,#1f8a4c,#34b96a)' : 'linear-gradient(90deg,#a01828,#C5162E)'}"></i></div><span class="mono" style="font-size:12px">${pct}%</span></div></td>
          <td class="num">${pct >= 100 ? '<span class="badge ok">🏆 Logrado</span>' : '<span class="muted">—</span>'}</td></tr>`;
      }).join('')}</tbody>
    </table></div>`;
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
    const yo = (Orbit.auth && Orbit.auth.user()) || {};
    const esAsesor = !['Dirección', 'Admin', 'Finanzas'].includes(ROLE());
    let rows = comisionAsesor();
    if (esAsesor) rows = rows.filter(r => r.a.nombre === yo.nombre); // el asesor solo ve lo suyo
    const totalPagar = rows.reduce((s, r) => s + r.pendiente, 0);
    return `<div class="cfg-note" style="margin-bottom:14px">👥 Comisión a <b>pagar a cada asesor</b>: % (fijo o variable) sobre la <b>prima neta recaudada</b> de su cartera — no sobre venta. ${esAsesor ? 'Ves <b>tu</b> liquidación.' : 'El % se configura en Configuración › Usuarios.'} Los pagos se <b>cruzan con la liquidación</b> y son ajustables.</div>
    ${K.kpis([
      { label: esAsesor ? 'Mi comisión a cobrar' : 'Total a pagar', val: U.moneyShort(totalPagar, 'GTQ'), color: 'var(--warn)', foot: 'pendiente' },
      { label: 'Ya liquidado', val: U.moneyShort(rows.reduce((s, r) => s + r.liquidada, 0), 'GTQ'), color: 'var(--ok)', foot: 'pagado', footTone: 'up' },
      { label: esAsesor ? 'Mi base recaudada' : 'Asesores', val: esAsesor ? U.moneyShort(rows.reduce((s, r) => s + r.baseRecaudada, 0), 'GTQ') : rows.length, color: 'var(--info)', foot: esAsesor ? 'prima neta' : 'con comisión' },
      { label: 'Base recaudada', val: U.moneyShort(rows.reduce((s, r) => s + r.baseRecaudada, 0), 'GTQ'), color: 'var(--graph)', foot: 'prima neta' }
    ])}
    <div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table class="tbl">
      <thead><tr><th>Asesor</th><th>Esquema</th><th class="num">Base recaudada</th><th class="num">%</th><th class="num">A pagar</th><th class="num">Pagado</th><th class="num">Pendiente</th>${esAsesor ? '' : '<th></th>'}</tr></thead>
      <tbody>${rows.map(r => `<tr>
        <td><div style="display:flex;align-items:center;gap:9px">${U.avatar(r.a.nombre, r.a.color, 'sm')}<b>${U.esc(r.a.nombre)}</b></div></td>
        <td><span class="badge ${r.tipo === 'variable' ? 'info' : 'neutral'}">${r.tipo}</span></td>
        <td class="num">${U.money(r.baseRecaudada, 'GTQ')}</td>
        <td class="num">${r.pct}%</td>
        <td class="num"><b>${U.money(r.aPagar, 'GTQ')}</b></td>
        <td class="num" style="color:var(--ok)">${U.money(r.liquidada, 'GTQ')}</td>
        <td class="num" style="color:${r.pendiente > 0 ? 'var(--warn)' : 'var(--ok)'}">${U.money(r.pendiente, 'GTQ')}</td>
        ${esAsesor ? '' : `<td style="text-align:right"><button class="btn primary sm" onclick="alert('Demo: cruzar pago con liquidación de ${U.esc(r.a.nombre)} — monto ajustable antes de confirmar (${U.money(r.pendiente, 'GTQ')}).')">Liquidar / cruzar</button></td>`}
      </tr>`).join('')}</tbody>
    </table></div></div>
    ${esAsesor ? `<div class="card pad" style="margin-top:14px"><b style="font-family:var(--f-display);font-size:14px">Mis ajustes de producción</b><div class="muted" style="font-size:12.5px;margin-top:6px">Las cancelaciones de tu cartera descuentan prima neta no devengada. Revisa el detalle en <a style="color:var(--red);cursor:pointer" onclick="location.hash='#/cancelaciones'">Cancelaciones</a>.</div></div>` : ''}`;
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
