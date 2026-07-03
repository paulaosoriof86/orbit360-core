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
  let tab = 'movimientos';
  const ROLE = () => (Orbit.session && Orbit.session.rol && Orbit.session.rol()) || (Orbit.auth && Orbit.auth.user() && Orbit.auth.user().rol) || 'Dirección';
  // selector de mes (acumulado del año hasta el mes) + país
  const NOW = U.NOW ? new Date(U.NOW) : new Date();
  let mesSel = NOW.toISOString().slice(0, 7);        // 'YYYY-MM'
  const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  function periodos() { return [...new Set(S().all('finmovs').map(m => m.periodo))].sort().reverse(); }
  function paisFin() { return (!Orbit.pais || Orbit.pais === 'TODOS') ? null : Orbit.pais; }
  function movs(periodo) {
    const p = paisFin();
    return S().all('finmovs').filter(m => (!periodo || m.periodo === periodo) && (!p || m.pais === p));
  }
  const norm = (v, cur) => q.norm(v, cur);
  const M = (n) => U.moneyShort(n, 'GTQ');
  const MM = (n) => U.money(n, 'GTQ');
  const sum = (arr, f) => arr.reduce((s, x) => s + norm(f(x), x.moneda), 0);

  let mesInit = false;
  function render(host) {
    if (!mesInit) { const ps = periodos(); if (ps.length && !movs(mesSel).length) mesSel = ps[0]; mesInit = true; }
    const TABS = [['movimientos', '🧾 Movimientos'], ['dashboard', '📊 Dashboard'], ['cxcp', '💳 CxC / CxP'], ['financiacion', '🏦 Financiación'], ['presupuesto', '📋 Presupuesto'], ['empresa', '🏢 Liq. empresa'], ['asesores', '👥 Liq. asesores'], ['banco', '🔗 Conciliación'], ['metas', '🎯 Metas'], ['ia', '✨ Análisis IA']];
    const paisLbl = (Orbit.PAISES.find(p => p.id === (Orbit.pais || 'TODOS')) || {}).label || 'Todos los países';
    host.innerHTML = `<div class="page">
      ${K.banner({ icon: '💰', title: 'Orbit Finanzas', sub: 'Ingresos, egresos, financiación y presupuesto', features: [], actions: `<div class="ins-controls">
        <select id="fin-pais" class="ins-ctl">${Orbit.PAISES.map(p => `<option value="${p.id}" ${p.id === (Orbit.pais || 'TODOS') ? 'selected' : ''}>🌎 ${p.label}</option>`).join('')}</select>
        <select id="fin-mes" class="ins-ctl">${periodos().map(pr => `<option value="${pr}" ${pr === mesSel ? 'selected' : ''}>${MESES[+pr.slice(5) - 1]} ${pr.slice(0, 4)}</option>`).join('')}</select>
      </div>` })}
      <div class="tabs tabs-scroll" style="margin-bottom:16px">
        ${TABS.map(t => `<div class="tab ${tab === t[0] ? 'active' : ''}" data-t="${t[0]}">${t[1]}</div>`).join('')}
      </div>
      <div id="fin-body"></div>
    </div>`;
    host.querySelectorAll('.tab[data-t]').forEach(el => el.addEventListener('click', () => {
      tab = el.dataset.t;
      host.querySelectorAll('.tab[data-t]').forEach(t => t.classList.toggle('active', t.dataset.t === tab));
      const b = document.getElementById('fin-body');
      b.innerHTML = ({ movimientos, dashboard, cxcp, financiacion, presupuesto, empresa, asesores, banco, metas, ia }[tab] || movimientos)();
      wire(host);
    }));
    const pSel = host.querySelector('#fin-pais'); if (pSel) pSel.addEventListener('change', () => { Orbit.pais = pSel.value; document.dispatchEvent(new CustomEvent('orbit:pais')); render(host); });
    const mSel = host.querySelector('#fin-mes'); if (mSel) mSel.addEventListener('change', () => { mesSel = mSel.value; render(host); });
    const body = document.getElementById('fin-body');
    body.innerHTML = ({ movimientos, dashboard, cxcp, financiacion, presupuesto, empresa, asesores, banco, metas, ia }[tab] || movimientos)();
    wire(host);
  }

  /* ---------- MOVIMIENTOS (reales del periodo) ---------- */
  function movimientos() {
    const list = movs(mesSel).filter(m => m.tipo !== 'financiacion');
    const ing = list.filter(m => m.tipo === 'ingreso'), egr = list.filter(m => m.tipo === 'egreso');
    const tIng = sum(ing, m => m.valor), tEgr = sum(egr, m => m.valor);
    const recaudado = sum(ing.filter(m => m.estado === 'recaudado'), m => m.valor);
    const pagado = sum(egr.filter(m => m.estado === 'pagado'), m => m.valor);
    const rows = list.slice().sort((a, b) => (b.dia || 0) - (a.dia || 0));
    return `${K.kpis([
      { label: 'Ingresos del mes', val: M(tIng), color: 'var(--ok)', foot: M(recaudado) + ' recaudado', footTone: 'up', onclick: "Orbit.modules.finanzas.drillKey('ing-mes')" },
      { label: 'Egresos del mes', val: M(tEgr), color: 'var(--danger)', foot: M(pagado) + ' pagado', onclick: "Orbit.modules.finanzas.drillKey('egr-mes')" },
      { label: 'Resultado operativo', val: M(tIng - tEgr), color: 'var(--red)', foot: 'ingresos − egresos', onclick: "Orbit.modules.finanzas.drillKey('res-mes')" },
      { label: 'Movimientos', val: list.length, color: 'var(--info)', foot: ing.length + ' ing · ' + egr.length + ' egr', onclick: "Orbit.modules.finanzas.drillKey('mov-mes')" }
    ])}
    <div class="card pad" style="margin-bottom:14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <b style="font-family:var(--f-display);font-size:15px;flex:1">Movimientos · ${MESES[+mesSel.slice(5) - 1]} ${mesSel.slice(0, 4)}</b>
      <button class="btn primary sm" onclick="Orbit.modules.finanzas.nuevoMov('ingreso')">+ Ingreso</button>
      <button class="btn primary sm" onclick="Orbit.modules.finanzas.nuevoMov('egreso')" style="background:var(--danger)">+ Egreso</button>
      <button class="btn ghost sm" onclick="Orbit.modules.finanzas.crearMes()">📅 Crear mes</button>
      <button class="btn ghost sm" onclick="Orbit.importa.open('movimientos-finanzas')">⬇ Importar</button>
      <button class="btn ghost sm" onclick="Orbit.importa.open('estados-banco')">🏦 Estado de cuenta</button>
    </div>
    <div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table class="tbl">
      <thead><tr><th>Día</th><th>Concepto</th><th>Clasificación</th><th>Pagador / Benef.</th><th class="num">Valor</th><th>Estado</th></tr></thead>
      <tbody>${rows.map(m => `<tr class="clickable" onclick="Orbit.modules.finanzas.editarMov('${m.id}')" title="Ver / editar movimiento">
        <td class="mono" style="font-size:12px">${m.dia || '—'}</td>
        <td><b>${U.esc(m.concepto)}</b></td>
        <td><span class="badge ${m.tipo === 'ingreso' ? 'ok' : 'neutral'}">${U.esc(m.clase)}</span></td>
        <td style="font-size:12.5px">${U.esc(m.pagador || m.beneficiario || '—')}</td>
        <td class="num" style="color:${m.tipo === 'egreso' ? 'var(--danger)' : 'var(--ok)'}">${m.tipo === 'egreso' ? '−' : ''}${U.money(m.valor, m.moneda)}</td>
        <td onclick="event.stopPropagation();Orbit.modules.finanzas.toggleEstado('${m.id}')" style="cursor:pointer" title="Clic: cambia estado">${estBadge(m.estado)}</td></tr>`).join('') || '<tr><td colspan="6" class="muted" style="text-align:center;padding:20px">Sin movimientos. Usa “+ Ingreso/Egreso” o “Crear mes”.</td></tr>'}</tbody>
    </table></div></div>`;
  }

  const CLASES_ING = ['Comisiones aseguradora', 'Incentivos', 'Otros'];
  const CLASES_EGR = ['Comisiones asesores', 'Gastos fijos', 'Marketing', 'Operación', 'Devolución de préstamo'];
  /* ---- alta de movimiento (ingreso/egreso) ---- */
  function nuevoMov(tipo) { editarMov(null, tipo); }
  /* ---- editar / crear movimiento ---- */
  function editarMov(id, tipoNuevo) {
    const m = id ? S().get('finmovs', id) : null;
    const tipo = m ? m.tipo : (tipoNuevo || 'ingreso');
    const cur = paisFin() === 'CO' ? 'COP' : 'GTQ';
    const clases = tipo === 'ingreso' ? CLASES_ING : CLASES_EGR;
    const estados = tipo === 'ingreso' ? ['esperado', 'facturado', 'recaudado'] : ['presupuestado', 'pendiente', 'pagado'];
    let back = document.getElementById('fin-mov'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'fin-mov'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 96;
    back.innerHTML = `<div class="card" style="width:min(520px,94vw);padding:0">
      <div style="padding:17px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;background:${tipo === 'ingreso' ? 'var(--ok-soft)' : 'var(--danger-soft)'}">
        <b style="font-family:var(--f-display);font-size:16px">${m ? '✏ Editar' : (tipo === 'ingreso' ? '+ Ingreso' : '+ Egreso')} · ${MESES[+mesSel.slice(5) - 1]} ${mesSel.slice(0, 4)}</b>
        <button class="imp-x" id="fm-x">✕</button></div>
      <div style="padding:18px 20px;display:grid;gap:12px">
        <div class="cgrid">
          <label class="ce-l">Concepto<input id="fm-concepto" class="o-sel" value="${m ? U.esc(m.concepto) : ''}"></label>
          <label class="ce-l">Clasificación<select id="fm-clase" class="o-sel">${clases.map(c => `<option ${m && m.clase === c ? 'selected' : ''}>${c}</option>`).join('')}<option value="__otro" ${m && clases.indexOf(m.clase) < 0 ? 'selected' : ''}>➕ Otro…</option></select><input id="fm-clase-otro" class="o-sel" placeholder="Nueva clasificación" style="margin-top:6px;display:${m && clases.indexOf(m.clase) < 0 ? '' : 'none'}" value="${m && clases.indexOf(m.clase) < 0 ? U.esc(m.clase) : ''}"></label>
          <label class="ce-l">${tipo === 'ingreso' ? 'Pagador' : 'Beneficiario'}<input id="fm-quien" class="o-sel" value="${m ? U.esc(m.pagador || m.beneficiario || '') : ''}"></label>
          <label class="ce-l">Día<input id="fm-dia" class="o-sel" type="number" min="1" max="31" value="${m ? m.dia : new Date().getDate()}"></label>
          <label class="ce-l">Valor (${cur})<input id="fm-valor" class="o-sel" type="number" value="${m ? m.valor : 0}"></label>
          <label class="ce-l">Estado<select id="fm-estado" class="o-sel">${estados.map(e => `<option ${m && m.estado === e ? 'selected' : ''}>${e}</option>`).join('')}</select></label>
        </div>
        <label class="ce-l">Observaciones<input id="fm-obs" class="o-sel" value="${m ? U.esc(m.obs || '') : ''}"></label>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:space-between">
        ${m ? '<button class="btn ghost" id="fm-del" style="color:var(--danger)">🗑 Eliminar</button>' : '<span></span>'}
        <div style="display:flex;gap:8px"><button class="btn ghost" id="fm-cancel">Cancelar</button><button class="btn primary" id="fm-ok">Guardar</button></div>
      </div></div>`;
    document.body.appendChild(back);
    const $ = s => back.querySelector(s);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    $('#fm-x').addEventListener('click', close); $('#fm-cancel').addEventListener('click', close);
    if ($('#fm-del')) $('#fm-del').addEventListener('click', () => { S().remove('finmovs', id); close(); render(document.getElementById('host')); });
    $('#fm-clase').addEventListener('change', () => { $('#fm-clase-otro').style.display = $('#fm-clase').value === '__otro' ? '' : 'none'; });
    $('#fm-ok').addEventListener('click', () => {
      const data = {
        tipo, clase: $('#fm-clase').value === '__otro' ? ($('#fm-clase-otro').value || 'Otro') : $('#fm-clase').value, concepto: $('#fm-concepto').value || $('#fm-clase').value,
        valor: +$('#fm-valor').value || 0, dia: +$('#fm-dia').value || 1, estado: $('#fm-estado').value,
        obs: $('#fm-obs').value, periodo: m ? m.periodo : mesSel, pais: m ? m.pais : (paisFin() || 'GT'), moneda: m ? m.moneda : cur
      };
      data[tipo === 'ingreso' ? 'pagador' : 'beneficiario'] = $('#fm-quien').value;
      if (m) S().update('finmovs', id, data); else S().insert('finmovs', Object.assign({ id: 'fmv' + Date.now().toString().slice(-7) }, data));
      close(); render(document.getElementById('host'));
    });
  }
  /* ---- crear el mes siguiente (copia categorías de presupuesto fijo, sin importes ejecutados) ---- */
  async function crearMes() {
    const [y, mm] = mesSel.split('-').map(Number);
    const d = new Date(y, mm, 1); // mm es 1-based → siguiente mes
    const nuevo = d.toISOString().slice(0, 7);
    const existe = S().all('finmovs').some(x => x.periodo === nuevo);
    if (existe) { mesSel = nuevo; render(document.getElementById('host')); return; }
    if (!(await Orbit.ui.confirm('¿Crear el mes ' + MESES[d.getMonth()] + ' ' + d.getFullYear() + '? Se generan las partidas de presupuesto fijo como egresos presupuestados.', { title: 'Crear mes', ok: 'Crear mes', danger: false }))) return;
    const pais = paisFin() || 'GT', cur = pais === 'CO' ? 'COP' : 'GTQ';
    S().all('presupuesto').filter(p => p.pais === pais).forEach(p => {
      S().insert('finmovs', { id: 'fmv' + Date.now().toString().slice(-7) + Math.floor(Math.random() * 99), tipo: 'egreso', clase: p.clase, categoria: p.categoria, concepto: p.categoria, beneficiario: p.categoria, valor: p.monto, dia: 1, estado: 'presupuestado', periodo: nuevo, pais, moneda: cur, pendiente: p.monto, obs: '' });
    });
    mesSel = nuevo; render(document.getElementById('host'));
  }
  function estBadge(e) {
    const map = { recaudado: 'ok', pagado: 'ok', facturado: 'info', esperado: 'warn', pendiente: 'warn', presupuestado: 'neutral' };
    return `<span class="badge ${map[e] || 'neutral'}">${e}</span>`;
  }
  function toggleEstado(id) {
    const m = S().get('finmovs', id); if (!m) return;
    const next = m.tipo === 'ingreso'
      ? { esperado: 'facturado', facturado: 'recaudado', recaudado: 'esperado' }
      : { pendiente: 'pagado', pagado: 'pendiente', presupuestado: 'pendiente' };
    S().update('finmovs', id, { estado: next[m.estado] || (m.tipo === 'ingreso' ? 'recaudado' : 'pagado') });
    const host = document.getElementById('host'); if (host) render(host);
  }

  /* ---------- DRILL-DOWN de KPIs (desglose clicable) ---------- */
  function drillKey(key) {
    const p = paisFin();
    const all = S().all('finmovs').filter(m => !p || m.pais === p);
    const inM = all.filter(m => m.periodo === mesSel && m.tipo !== 'financiacion');
    const lbl = MESES[+mesSel.slice(5) - 1] + ' ' + mesSel.slice(0, 4);
    const map = {
      'ing-mes': ['Ingresos del mes', lbl, inM.filter(m => m.tipo === 'ingreso')],
      'egr-mes': ['Egresos del mes', lbl, inM.filter(m => m.tipo === 'egreso')],
      'res-mes': ['Resultado operativo', lbl + ' · ingresos y egresos', inM],
      'mov-mes': ['Movimientos del mes', lbl, inM],
      'cxc': ['Cuentas por cobrar', 'todas las pendientes de recaudo — arrastran mes a mes', all.filter(m => m.tipo === 'ingreso' && (m.estado === 'esperado' || m.estado === 'facturado'))],
      'cxp': ['Cuentas por pagar', 'todas las pendientes de pago — arrastran mes a mes', all.filter(m => m.tipo === 'egreso' && (m.estado === 'pendiente' || (m.pendiente || 0) > 0))]
    };
    const cfg = map[key]; if (!cfg) return;
    drillModal(cfg[0], cfg[1], cfg[2]);
  }
  function drillModal(titulo, sub, items) {
    items = (items || []).slice().sort((a, b) => (b.periodo || '').localeCompare(a.periodo || '') || (b.dia || 0) - (a.dia || 0));
    const tot = items.reduce((s, m) => s + norm(m.valor, m.moneda), 0);
    let back = document.getElementById('fin-drill'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'fin-drill'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 97;
    back.innerHTML = `<div class="card" style="width:min(760px,95vw);max-height:92vh;display:flex;flex-direction:column;padding:0">
      <div style="padding:17px 20px;background:linear-gradient(120deg,var(--graph),#10141a);display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div><div class="crumb" style="margin-bottom:4px;color:rgba(255,255,255,.8)">Desglose</div>
          <b style="font-family:var(--f-display);font-size:18px;color:#fff">${U.esc(titulo)}</b>
          <div style="font-size:12.5px;margin-top:3px;color:rgba(255,255,255,.85)">${items.length} registros · ${U.money(tot, 'GTQ')} · ${U.esc(sub)} · clic en una fila para ver/editar</div></div>
        <button class="imp-x" id="dr-x" style="background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.3);color:#fff">✕</button></div>
      <div style="overflow:auto;flex:1"><table class="tbl">
        <thead><tr><th>Periodo</th><th>Día</th><th>Concepto</th><th>Clasificación</th><th>Quién</th><th class="num">Valor</th><th>Estado</th></tr></thead>
        <tbody>${items.map(m => `<tr class="clickable" onclick="document.getElementById('fin-drill').remove();Orbit.modules.finanzas.editarMov('${m.id}')">
          <td class="mono" style="font-size:11.5px">${m.periodo}</td><td class="mono" style="font-size:11.5px">${m.dia || '—'}</td>
          <td><b>${U.esc(m.concepto)}</b></td><td style="font-size:12px">${U.esc(m.clase || '—')}</td>
          <td style="font-size:12px">${U.esc(m.pagador || m.beneficiario || '—')}</td>
          <td class="num" style="color:${m.tipo === 'egreso' ? 'var(--danger)' : 'var(--ok)'}">${m.tipo === 'egreso' ? '−' : ''}${U.money(m.valor, m.moneda)}</td>
          <td>${estBadge(m.estado)}</td></tr>`).join('') || '<tr><td colspan="7" class="muted" style="text-align:center;padding:20px">Sin registros.</td></tr>'}</tbody>
      </table></div>
      <div style="padding:13px 20px;border-top:1px solid var(--line);display:flex;justify-content:flex-end"><button class="btn primary" id="dr-ok">Cerrar</button></div>
    </div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#dr-x').addEventListener('click', close);
    back.querySelector('#dr-ok').addEventListener('click', close);
  }

  /* ---------- CUENTAS POR COBRAR / POR PAGAR ---------- */
  function cxcp() {
    const all = movs(null);
    const cxc = all.filter(m => m.tipo === 'ingreso' && (m.estado === 'esperado' || m.estado === 'facturado'));
    const cxp = all.filter(m => m.tipo === 'egreso' && (m.estado === 'pendiente' || (m.pendiente || 0) > 0));
    const tCxc = sum(cxc, m => m.valor), tCxp = cxp.reduce((s, m) => s + norm(m.pendiente || m.valor, m.moneda), 0);
    return `<div class="cfg-note" style="margin-bottom:14px">💳 <b>Cuentas por cobrar</b> = ingresos esperados/facturados aún no recaudados (ej. planilla de comisiones ya facturada). <b>Cuentas por pagar</b> = egresos pendientes (ej. liquidación de asesores no pagada); el saldo pasa al mes siguiente. Clic en una fila cambia su estado.</div>
    ${K.kpis([
      { label: 'Por cobrar (CxC)', val: M(tCxc), color: 'var(--warn)', foot: cxc.length + ' partidas', onclick: "Orbit.modules.finanzas.drillKey('cxc')" },
      { label: 'Por pagar (CxP)', val: M(tCxp), color: 'var(--danger)', foot: cxp.length + ' partidas', onclick: "Orbit.modules.finanzas.drillKey('cxp')" },
      { label: 'Posición neta', val: M(tCxc - tCxp), color: 'var(--red)', foot: 'CxC − CxP' }
    ])}
    <div class="ins-grid-2">
      ${cxcpTabla('Cuentas por cobrar', cxc, 'ok')}
      ${cxcpTabla('Cuentas por pagar', cxp, 'danger')}
    </div>`;
  }
  function cxcpTabla(titulo, rows, tone) {
    return `<div class="card" style="overflow:hidden"><div style="padding:11px 13px;border-bottom:1px solid var(--line);font-family:var(--f-display);font-weight:800;font-size:14px">${titulo}</div>
      <div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Periodo</th><th>Concepto</th><th class="num">Monto</th><th>Estado</th></tr></thead>
      <tbody>${rows.slice(0, 24).map(m => `<tr class="clickable" onclick="Orbit.modules.finanzas.editarMov('${m.id}')" title="Ver / editar / eliminar">
        <td class="mono" style="font-size:11.5px">${m.periodo}</td><td>${U.esc(m.concepto)}</td>
        <td class="num"><b>${U.money(m.pendiente || m.valor, m.moneda)}</b></td><td onclick="event.stopPropagation();Orbit.modules.finanzas.toggleEstado('${m.id}')" style="cursor:pointer" title="Clic: cambia estado">${estBadge(m.estado)}</td></tr>`).join('') || '<tr><td colspan="4" class="muted" style="text-align:center;padding:18px">Sin partidas.</td></tr>'}</tbody></table></div></div>`;
  }

  /* ---------- FINANCIACIÓN (deuda separada de operativo) ---------- */
  function financiacion() {
    const p = paisFin();
    const acr = S().all('acreedores').filter(a => !p || a.pais === p);
    const fin = S().all('finmovs').filter(m => (!p || m.pais === p) && (m.tipo === 'financiacion' || m.clase === 'Devolución de préstamo'));
    const ingFin = sum(fin.filter(m => m.tipo === 'financiacion'), m => m.valor);
    const abonos = sum(fin.filter(m => m.clase === 'Devolución de préstamo'), m => m.valor);
    const deuda = acr.reduce((s, a) => s + norm(a.saldo, a.pais === 'GT' ? 'GTQ' : 'COP'), 0);
    return `<div class="cfg-note" style="margin-bottom:14px">🏦 La <b>financiación es ingreso NO operativo</b> (no infla producción ni utilidad). Los egresos hechos con ese dinero sí son egresos normales. La <b>deuda</b> sube con cada financiación y baja con cada <b>devolución de préstamo</b> al acreedor.</div>
    ${K.kpis([
      { label: 'Deuda vigente', val: M(deuda), color: 'var(--danger)', foot: acr.length + ' acreedores' },
      { label: 'Financiación recibida', val: M(ingFin), color: 'var(--warn)', foot: 'no operativo' },
      { label: 'Abonos / amortización', val: M(abonos), color: 'var(--ok)', foot: 'devoluciones', footTone: 'up' }
    ])}
    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
      <button class="btn primary sm" onclick="Orbit.modules.finanzas.regFinanciacion('ingreso')">+ Registrar financiamiento</button>
      <button class="btn ghost sm" onclick="Orbit.modules.finanzas.regFinanciacion('abono')">− Registrar abono / pago</button>
    </div>
    <div class="card" style="overflow:hidden;margin-bottom:14px"><div style="padding:11px 13px;border-bottom:1px solid var(--line);font-family:var(--f-display);font-weight:800;font-size:14px">Deuda por acreedor</div>
      <table class="tbl"><thead><tr><th>Acreedor</th><th>País</th><th class="num">Saldo de deuda</th></tr></thead>
      <tbody>${acr.map(a => `<tr><td><b>${U.esc(a.nombre)}</b></td><td>${a.pais}</td><td class="num" style="color:${a.saldo > 0 ? 'var(--danger)' : 'var(--ok)'}"><b>${U.money(a.saldo, a.pais === 'GT' ? 'GTQ' : 'COP')}</b></td></tr>`).join('')}</tbody></table></div>
    <div class="card" style="overflow:hidden"><div style="padding:11px 13px;border-bottom:1px solid var(--line);font-family:var(--f-display);font-weight:800;font-size:14px">Movimientos de financiación</div>
      <div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Periodo</th><th>Concepto</th><th>Acreedor</th><th class="num">Monto</th><th>Tipo</th></tr></thead>
      <tbody>${fin.slice().reverse().slice(0, 16).map(m => `<tr><td class="mono" style="font-size:11.5px">${m.periodo}</td><td>${U.esc(m.concepto)}</td><td style="font-size:12.5px">${U.esc(m.pagador || m.beneficiario || '—')}</td>
        <td class="num" style="color:${m.tipo === 'financiacion' ? 'var(--warn)' : 'var(--ok)'}">${m.tipo === 'financiacion' ? '+' : '−'}${U.money(m.valor, m.moneda)}</td>
        <td><span class="badge ${m.tipo === 'financiacion' ? 'warn' : 'ok'}">${m.tipo === 'financiacion' ? 'Financiación' : 'Abono'}</span></td></tr>`).join('')}</tbody></table></div></div>`;
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

  /* (Eliminada la función muerta `resumen()` — tenía un array de movimientos HARDCODEADO
     y nunca se invocaba: el dispatch de pestañas usa `movimientos()`, que lee del store.) */

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

  /* ---------- DASHBOARD financiero (datos en vivo del store) ---------- */
  function serieMensual(anio, tipo) {
    const p = paisFin();
    return MESES.map((_, i) => {
      const ym = anio + '-' + String(i + 1).padStart(2, '0');
      return sum(S().all('finmovs').filter(m => m.periodo === ym && (!p || m.pais === p) && (tipo === 'ingreso' ? m.tipo === 'ingreso' : m.tipo === 'egreso')), m => m.valor);
    });
  }
  /* (Eliminadas las funciones muertas `dashboard()` y `presupuesto()` 1ª declaración +
     sus helpers `finRow`/`presupTabla`: eran duplicados por hoisting con arrays
     HARDCODEADOS y nunca se invocaban — ganan las versiones vivas de más abajo,
     que leen del store.) */

  /* ---------- METAS (cumplimiento real vs ideal · empresa/asesor/aseguradora) ---------- */
  // Medición mensual real, con datos vivos del store:
  function primaNetaMes(mesKey, filt) {
    return S().where('polizas', p => (p.vigenciaInicio || p.emision || '').slice(0, 7) === mesKey && (!filt || filt(p)))
      .reduce((s, p) => s + norm(p.primaNeta || 0, p.moneda), 0);
  }
  function recaudoMes(mesKey, filt) {
    return S().where('cobros', c => c.estado === 'Pagado' && (c.fechaPago || '').slice(0, 7) === mesKey)
      .filter(c => { if (!filt) return true; const p = S().get('polizas', c.polizaId); return p && filt(p); })
      .reduce((s, c) => s + norm(c.monto, c.moneda), 0);
  }
  function promedioPrima(mesKey, filt, n) {
    let tot = 0, cnt = 0, y = +mesKey.slice(0, 4), mo = +mesKey.slice(5) - 1;
    for (let i = 1; i <= (n || 3); i++) { let mm = mo - i, yy = y; while (mm < 0) { mm += 12; yy--; } tot += primaNetaMes(yy + '-' + String(mm + 1).padStart(2, '0'), filt); cnt++; }
    return cnt ? Math.round(tot / cnt) : 0;
  }
  const semaforo = pct => pct >= 100 ? '🟢' : pct >= 70 ? '🟡' : '🔴';
  const semColor = pct => pct >= 100 ? 'var(--ok)' : pct >= 70 ? 'var(--warn)' : 'var(--danger)';
  function metaGet(mesKey, tipo, ambitoId) { return (S().all('metas') || []).find(m => m.mes === mesKey && m.tipo === tipo && (m.asesorId || m.aseguradoraId || '') === (ambitoId || '')); }
  function metaVal(mesKey, tipo, ambitoId, fallback) { const m = metaGet(mesKey, tipo, ambitoId); return (m && +m.valor) || fallback || 0; }

  function metas() {
    const p = paisFin() || 'GT', cur = p === 'CO' ? 'COP' : 'GTQ';
    const mk = mesSel, lbl = MESES[+mk.slice(5) - 1] + ' ' + mk.slice(0, 4);
    const M2 = n => U.money(n, cur);
    // EMPRESA
    const primaReal = primaNetaMes(mk), recReal = recaudoMes(mk);
    const primaMeta = metaVal(mk, 'prima', '', promedioPrima(mk, null, 3) ? Math.round(promedioPrima(mk, null, 3) * 1.1) : 0);
    const recMeta = metaVal(mk, 'recaudo', '', Math.round(primaMeta * 0.85));
    const pP = primaMeta ? Math.round(primaReal / primaMeta * 100) : 0;
    const pR = recMeta ? Math.round(recReal / recMeta * 100) : 0;
    const barra = (real, meta, pct) => `<div class="bar" style="margin-top:8px;height:12px"><i style="width:${Math.min(100, pct)}%;background:${pct >= 100 ? 'linear-gradient(90deg,#1f8a4c,#34b96a)' : pct >= 70 ? 'linear-gradient(90deg,#c9821b,#e0a53a)' : 'linear-gradient(90deg,#a01828,#C5162E)'}"></i></div>`;
    // ASESORES
    const ases = S().all('asesores').map(a => {
      const real = primaNetaMes(mk, po => po.asesorId === a.id);
      const rec = recaudoMes(mk, po => po.asesorId === a.id);
      const meta = metaVal(mk, 'prima', a.id, promedioPrima(mk, po => po.asesorId === a.id, 3) ? Math.round(promedioPrima(mk, po => po.asesorId === a.id, 3) * 1.1) : 0);
      const prevReal = primaNetaMes((function () { let y = +mk.slice(0, 4), m = +mk.slice(5) - 2; while (m < 0) { m += 12; y--; } return y + '-' + String(m + 1).padStart(2, '0'); })(), po => po.asesorId === a.id);
      const pct = meta ? Math.round(real / meta * 100) : 0;
      const tend = prevReal ? Math.round((real / prevReal - 1) * 100) : 0;
      return { a, real, rec, meta, pct, tend };
    }).sort((x, y) => y.real - x.real);
    // ASEGURADORAS
    const asgs = S().all('aseguradoras').map(g => {
      const real = primaNetaMes(mk, po => po.aseguradoraId === g.id);
      const meta = metaVal(mk, 'prima', g.id, 0);
      const pct = meta ? Math.round(real / meta * 100) : 0;
      return { g, real, meta, pct };
    }).filter(r => r.real > 0 || r.meta > 0).sort((x, y) => y.real - x.real);

    return `<div class="cfg-note" style="margin-bottom:14px">🎯 <b>Cumplimiento real vs ideal</b> de ${lbl} — sobre <b>prima NETA</b> (ventas) y <b>recaudo</b>. De lo general (empresa) a lo particular (asesor · aseguradora). Semáforo: 🟢 ≥100% · 🟡 ≥70% · 🔴 &lt;70%.</div>
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <button class="btn primary sm" onclick="Orbit.modules.finanzas.crearMeta()">+ Establecer meta</button>
      <button class="btn sm" style="background:var(--graph);color:#fff" onclick="Orbit.modules.finanzas.metasSugerir()">🤖 Sugerir metas (inteligente)</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">
      <div class="card pad">
        <div style="display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:15px">${semaforo(pP)} Ventas empresa (prima neta)</b><span class="mono" style="font-size:13px;color:${semColor(pP)}">${pP}%</span></div>
        ${barra(primaReal, primaMeta, pP)}
        <div class="muted" style="font-size:12.5px;margin-top:8px">Real <b>${M2(primaReal)}</b> · Meta <b>${M2(primaMeta)}</b> · ${primaMeta ? (primaReal >= primaMeta ? 'Superada por ' + M2(primaReal - primaMeta) : 'Faltan ' + M2(primaMeta - primaReal)) : 'sin meta — usa sugerir'}</div>
      </div>
      <div class="card pad">
        <div style="display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:15px">${semaforo(pR)} Recaudo empresa</b><span class="mono" style="font-size:13px;color:${semColor(pR)}">${pR}%</span></div>
        ${barra(recReal, recMeta, pR)}
        <div class="muted" style="font-size:12.5px;margin-top:8px">Real <b>${M2(recReal)}</b> · Meta <b>${M2(recMeta)}</b> · índice recaudo/venta <b>${primaReal ? Math.round(recReal / primaReal * 100) : 0}%</b></div>
      </div>
    </div>
    <div class="card" style="overflow:hidden;margin-bottom:16px"><div style="padding:11px 14px;border-bottom:1px solid var(--line);font-family:var(--f-display);font-weight:800;font-size:14px">👥 Cumplimiento por asesor · ${lbl}</div>
      <div style="overflow-x:auto"><table class="tbl">
      <thead><tr><th>Asesor</th><th class="num">Meta neta</th><th class="num">Real neto</th><th class="num">Recaudo</th><th>Avance</th><th class="num">vs mes ant.</th></tr></thead>
      <tbody>${ases.map(r => `<tr>
        <td><div style="display:flex;align-items:center;gap:9px">${U.avatar(r.a.nombre, r.a.color, 'sm')}<b>${U.esc(r.a.nombre)}</b></div></td>
        <td class="num">${r.meta ? M2(r.meta) : '<span class="muted">—</span>'}</td>
        <td class="num"><b>${M2(r.real)}</b></td>
        <td class="num" style="color:var(--info)">${M2(r.rec)}</td>
        <td><div style="display:flex;align-items:center;gap:8px"><span>${semaforo(r.pct)}</span><div class="bar" style="width:80px"><i style="width:${Math.min(100, r.pct)}%;background:${semColor(r.pct)}"></i></div><span class="mono" style="font-size:12px;color:${semColor(r.pct)}">${r.pct}%</span></div></td>
        <td class="num" style="color:${r.tend >= 0 ? 'var(--ok)' : 'var(--danger)'}">${r.tend >= 0 ? '▲' : '▼'} ${Math.abs(r.tend)}%</td></tr>`).join('') || '<tr><td colspan="6" class="muted" style="text-align:center;padding:20px">Sin producción en el mes.</td></tr>'}</tbody>
    </table></div></div>
    <div class="card" style="overflow:hidden"><div style="padding:11px 14px;border-bottom:1px solid var(--line);font-family:var(--f-display);font-weight:800;font-size:14px">🏛️ Cumplimiento por aseguradora · ${lbl}</div>
      <div style="overflow-x:auto"><table class="tbl">
      <thead><tr><th>Aseguradora</th><th class="num">Meta neta</th><th class="num">Real neto</th><th class="num">% del total</th><th>Avance</th></tr></thead>
      <tbody>${asgs.map(r => { const share = primaReal ? Math.round(r.real / primaReal * 100) : 0; return `<tr>
        <td>${r.g ? `<span style="display:flex;align-items:center;gap:8px"><span class="dot-s" style="background:${r.g.color || '#888'}"></span><b>${U.esc(r.g.nombre)}</b></span>` : '—'}</td>
        <td class="num">${r.meta ? M2(r.meta) : '<span class="muted">—</span>'}</td>
        <td class="num"><b>${M2(r.real)}</b></td>
        <td class="num">${share}%</td>
        <td>${r.meta ? `<div style="display:flex;align-items:center;gap:8px"><span>${semaforo(r.pct)}</span><span class="mono" style="font-size:12px;color:${semColor(r.pct)}">${r.pct}%</span></div>` : '<span class="muted">sin meta</span>'}</td></tr>`; }).join('') || '<tr><td colspan="5" class="muted" style="text-align:center;padding:20px">Sin producción en el mes.</td></tr>'}</tbody>
    </table></div></div>`;
  }

  // Motor de sugerencia de metas: promedio 3 meses + crecimiento, coherente con presupuesto
  function metasSugerir() {
    const p = paisFin() || 'GT', cur = p === 'CO' ? 'COP' : 'GTQ', mk = mesSel;
    const M2 = n => U.money(n, cur);
    const promEmp = promedioPrima(mk, null, 3);
    const crec = 1.1; // +10% sobre promedio (editable)
    const sugPrima = Math.round(promEmp * crec);
    const recRate = (function () { const pr = primaNetaMes((function () { let y = +mk.slice(0, 4), m = +mk.slice(5) - 2; while (m < 0) { m += 12; y--; } return y + '-' + String(m + 1).padStart(2, '0'); })()); const rc = recaudoMes((function () { let y = +mk.slice(0, 4), m = +mk.slice(5) - 2; while (m < 0) { m += 12; y--; } return y + '-' + String(m + 1).padStart(2, '0'); })()); return pr ? Math.min(1, rc / pr) : 0.85; })();
    const sugRec = Math.round(sugPrima * recRate);
    // coherencia con presupuesto: ingresos presupuestados del mes
    const ppto = S().all('presupuesto').filter(x => x.pais === p && x.periodo === mk);
    const pptoIng = ppto.filter(x => (x.tipo || '') === 'ingreso' || /comision|ingreso|financ/i.test(x.categoria || '')).reduce((s, x) => s + (x.monto || 0), 0);
    const ases = S().all('asesores').map(a => ({ a, sug: Math.round(promedioPrima(mk, po => po.asesorId === a.id, 3) * crec) })).filter(r => r.sug > 0);
    let back = document.getElementById('fin-sug'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'fin-sug'; back.className = 'drawer-back open'; back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 97;
    back.innerHTML = `<div class="card" style="width:min(560px,95vw);padding:0;max-height:90vh;overflow:auto">
      <div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:16px">🤖 Metas sugeridas · ${MESES[+mk.slice(5) - 1]} ${mk.slice(0, 4)}</b><button class="imp-x" id="sg-x">✕</button></div>
      <div style="padding:18px 20px;display:grid;gap:14px">
        <div class="cfg-note">Cálculo: promedio de los <b>últimos 3 meses</b> de prima neta (${M2(promEmp)}) × crecimiento <b>+10%</b>. Recaudo = índice histórico recaudo/venta (<b>${Math.round(recRate * 100)}%</b>). ${pptoIng ? 'Coherencia con presupuesto de ingresos del mes: <b>' + M2(pptoIng) + '</b>.' : ''}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <label class="ce-l">Meta ventas empresa (prima neta)<input id="sg-prima" class="o-sel" type="number" value="${sugPrima}"></label>
          <label class="ce-l">Meta recaudo empresa<input id="sg-rec" class="o-sel" type="number" value="${sugRec}"></label>
        </div>
        ${pptoIng && sugPrima > pptoIng * 1.5 ? `<div class="cfg-note" style="border-left:3px solid var(--warn)">⚠️ La meta sugerida supera 1.5× el ingreso presupuestado — revisa coherencia con Presupuesto.</div>` : ''}
        <div class="card" style="overflow:hidden"><div style="padding:9px 12px;border-bottom:1px solid var(--line);font-weight:700;font-size:13px">Por asesor (editable)</div>
          <table class="tbl"><tbody>${ases.map(r => `<tr><td><b>${U.esc(r.a.nombre)}</b></td><td class="num"><input class="o-sel sg-ase" data-ase="${r.a.id}" type="number" value="${r.sug}" style="width:120px;text-align:right"></td></tr>`).join('')}</tbody></table>
        </div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" id="sg-cancel">Cancelar</button><button class="btn primary" id="sg-ok">✓ Establecer estas metas</button></div>
    </div>`;
    document.body.appendChild(back);
    const $ = s => back.querySelector(s); const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    $('#sg-x').addEventListener('click', close); $('#sg-cancel').addEventListener('click', close);
    $('#sg-ok').addEventListener('click', () => {
      const up = (tipo, ambitoKey, ambitoId, valor) => {
        const ex = (S().all('metas') || []).find(m => m.mes === mk && m.tipo === tipo && (m.asesorId || m.aseguradoraId || '') === (ambitoId || ''));
        const rec = { mes: mk, tipo, valor: +valor || 0 }; rec[ambitoKey] = ambitoId || '';
        if (ex) S().update('metas', ex.id, { valor: +valor || 0 }); else S().insert('metas', Object.assign({ id: 'meta' + Date.now().toString(36) + Math.floor(Math.random() * 99) }, rec));
      };
      up('prima', 'asesorId', '', $('#sg-prima').value);
      up('recaudo', 'asesorId', '', $('#sg-rec').value);
      back.querySelectorAll('.sg-ase').forEach(inp => up('prima', 'asesorId', inp.dataset.ase, inp.value));
      close();
      const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = '✓ Metas establecidas — Inicio e Insights ya miden contra ellas'; document.body.appendChild(t); setTimeout(() => t.remove(), 3000);
      render(document.getElementById('host'));
    });
  }

  function crearMeta() {
    const p = paisFin() || 'GT', cur = p === 'CO' ? 'COP' : 'GTQ';
    const asesores = S().all('asesores');
    let back = document.getElementById('fin-meta'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'fin-meta'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 97;
    back.innerHTML = `<div class="card" style="width:min(480px,94vw);padding:0">
      <div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:16px">🎯 Crear / editar meta</b><button class="imp-x" id="mt-x">✕</button></div>
      <div style="padding:18px 20px;display:grid;gap:12px">
        <div class="cgrid">
          <label class="ce-l">Mes<input id="mt-mes" class="o-sel" type="month" value="${mesSel}"></label>
          <label class="ce-l">Tipo<select id="mt-tipo" class="o-sel"><option value="prima">Prima neta (empresa)</option><option value="recaudo">Recaudo</option><option value="nueva">Producción nueva</option><option value="renovada">Producción renovada</option></select></label>
        </div>
        <label class="ce-l">Ámbito<select id="mt-ambito" class="o-sel"><option value="">Empresa (global)</option>${asesores.map(a => `<option value="${a.id}">Asesor · ${U.esc(a.nombre)}</option>`).join('')}</select></label>
        <label class="ce-l">Valor meta (${cur})<input id="mt-val" class="o-sel" type="number" value="${S().all('asesores').reduce((s, a) => s + (a.metaPrima || 0), 0) || 0}"></label>
        <div class="cfg-note">Se guarda en la colección editable <b>metas</b> — alimenta Insights → Metas y el avance de la empresa. Un registro por mes+tipo+ámbito (upsert).</div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" id="mt-cancel">Cancelar</button><button class="btn primary" id="mt-ok">Guardar meta</button></div>
    </div>`;
    document.body.appendChild(back);
    const $ = s => back.querySelector(s); const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    $('#mt-x').addEventListener('click', close); $('#mt-cancel').addEventListener('click', close);
    $('#mt-ok').addEventListener('click', () => {
      const mes = $('#mt-mes').value || mesSel, tipo = $('#mt-tipo').value, asesorId = $('#mt-ambito').value || '', valor = +$('#mt-val').value || 0;
      const ex = (S().all('metas') || []).find(m => m.mes === mes && m.tipo === tipo && (m.asesorId || '') === asesorId);
      if (ex) S().update('metas', ex.id, { valor });
      else S().insert('metas', { id: 'meta' + Date.now().toString().slice(-7), mes, tipo, asesorId, valor });
      close();
      const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = '✓ Meta guardada'; document.body.appendChild(t); setTimeout(() => t.remove(), 2400);
      render(document.getElementById('host'));
    });
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
        <td style="text-align:right;display:flex;gap:6px;justify-content:flex-end"><button class="btn ghost sm" onclick="Orbit.modules.finanzas.detLiq('aseguradoraId','${r.asg ? r.asg.id : ''}')">Ver detalle</button><button class="btn ghost sm" onclick="Orbit.importa.open('planillas-comision')">Conciliar planilla</button></td>
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
        ${esAsesor ? '' : `<td style="text-align:right;display:flex;gap:6px;justify-content:flex-end"><button class="btn ghost sm" onclick="Orbit.modules.finanzas.detLiq('asesorId','${r.a.id}')">Detalle</button><button class="btn primary sm" onclick="Orbit.modules.finanzas.lote('${r.a.id}')">Preparar lote</button></td>`}
      </tr>`).join('')}</tbody>
    </table></div></div>
    ${esAsesor ? `<div class="card pad" style="margin-top:14px"><b style="font-family:var(--f-display);font-size:14px">Mis ajustes de producción</b><div class="muted" style="font-size:12.5px;margin-top:6px">Las cancelaciones de tu cartera descuentan prima neta no devengada. Revisa el detalle en <a style="color:var(--red);cursor:pointer" onclick="location.hash='#/cancelaciones'">Cancelaciones</a>.</div></div>`
      : `<div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" onclick="Orbit.modules.finanzas.lote('')">📦 Preparar lote de pago (todos)</button></div>`}`;
  }

  /* ---------- PREPARAR LOTE DE LIQUIDACIÓN ---------- */
  // Reúne pagos pendientes (comisión del mes + CxP de meses pasados); se pueden
  // retirar partidas del lote antes de confirmar; muestra total en vivo.
  function lote(asesorId) {
    const rows = comisionAsesor().filter(r => r.pendiente > 0 && (!asesorId || r.a.id === asesorId));
    // partidas del lote: comisión pendiente por asesor + CxP de finanzas (egresos comisiones asesores no pagados de meses pasados)
    const partidas = [];
    rows.forEach(r => partidas.push({ id: 'liq-' + r.a.id, tipo: 'Comisión del periodo', quien: r.a.nombre, color: r.a.color, monto: r.pendiente, cur: 'GTQ' }));
    S().all('finmovs').filter(m => m.tipo === 'egreso' && m.clase === 'Comisiones asesores' && m.estado === 'pendiente').forEach(m => {
      partidas.push({ id: m.id, tipo: 'CxP ' + m.periodo, quien: m.beneficiario, color: '#6b7280', monto: norm(m.pendiente || m.valor, m.moneda), cur: 'GTQ', cxp: true });
    });
    const incluidos = new Set(partidas.map(p => p.id));
    let back = document.getElementById('fin-lote'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'fin-lote'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 96;
    function paint() {
      const sel = partidas.filter(p => incluidos.has(p.id));
      const total = sel.reduce((s, p) => s + p.monto, 0);
      back.querySelector('#lote-body').innerHTML = partidas.map(p => `
        <label class="lote-row ${incluidos.has(p.id) ? '' : 'off'}">
          <input type="checkbox" data-lid="${p.id}" ${incluidos.has(p.id) ? 'checked' : ''}>
          <span class="dot-s" style="background:${p.color}"></span>
          <span style="flex:1"><b>${U.esc(p.quien)}</b><span class="muted" style="font-size:11.5px"> · ${p.tipo}</span>${p.cxp ? ' <span class="badge warn" style="font-size:9px">mes anterior</span>' : ''}</span>
          <span class="mono">${U.money(p.monto, p.cur)}</span>
        </label>`).join('') || '<div class="muted" style="padding:18px;text-align:center">No hay pagos pendientes.</div>';
      back.querySelector('#lote-total').textContent = U.money(total, 'GTQ');
      back.querySelector('#lote-count').textContent = sel.length + ' de ' + partidas.length + ' partidas';
      back.querySelectorAll('[data-lid]').forEach(c => c.addEventListener('change', () => { c.checked ? incluidos.add(c.dataset.lid) : incluidos.delete(c.dataset.lid); paint(); }));
    }
    back.innerHTML = `<div class="card" style="width:min(560px,95vw);max-height:92vh;display:flex;flex-direction:column;padding:0">
      <div style="padding:17px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">
        <b style="font-family:var(--f-display);font-size:16px">📦 Lote de pago de comisiones</b><button class="imp-x" id="lt-x">✕</button></div>
      <div class="cfg-note" style="margin:14px 16px 0">Revisá el lote: podés <b>retirar partidas</b> y se incluyen <b>cuentas por pagar de meses anteriores</b>. El total se actualiza en vivo.</div>
      <div id="lote-body" style="padding:12px 16px;overflow:auto;flex:1;display:grid;gap:7px"></div>
      <div style="padding:14px 20px;border-top:1px solid var(--line)">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px"><span class="muted" id="lote-count"></span><span style="font-family:var(--f-display);font-weight:800;font-size:22px" id="lote-total"></span></div>
        <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" id="lt-cancel">Cancelar</button><button class="btn primary" id="lt-ok">Confirmar pago del lote</button></div>
      </div></div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#lt-x').addEventListener('click', close);
    back.querySelector('#lt-cancel').addEventListener('click', close);
    back.querySelector('#lt-ok').addEventListener('click', () => {
      // marca las CxP incluidas como pagadas (las de comisión del periodo son demo agregada)
      partidas.filter(p => incluidos.has(p.id) && p.cxp).forEach(p => S().update('finmovs', p.id, { estado: 'pagado', pendiente: 0 }));
      close(); const host = document.getElementById('host'); if (host) render(host);
    });
    paint();
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

  /* ---------- DASHBOARD (comparativo interanual/intermensual real) ---------- */
  function serie(tipoFiltro) {
    // serie mensual del año de mesSel y del anterior
    const y = +mesSel.slice(0, 4), p = paisFin();
    const arrFor = (yr) => MESES.map((_, i) => {
      const ym = yr + '-' + String(i + 1).padStart(2, '0');
      return sum(S().all('finmovs').filter(m => m.periodo === ym && (!p || m.pais === p) && tipoFiltro(m)), m => m.valor);
    });
    return { y, cur: arrFor(y), prev: arrFor(y - 1) };
  }
  function dashboard() {
    const mi = +mesSel.slice(5) - 1;
    const ingS = serie(m => m.tipo === 'ingreso'), egrS = serie(m => m.tipo === 'egreso');
    const acumI = ingS.cur.slice(0, mi + 1).reduce((s, v) => s + v, 0), acumIp = ingS.prev.slice(0, mi + 1).reduce((s, v) => s + v, 0);
    const acumE = egrS.cur.slice(0, mi + 1).reduce((s, v) => s + v, 0);
    const varIA = acumIp > 0 ? Math.round((acumI - acumIp) / acumIp * 100) : 0;
    const mesAnt = mi > 0 ? ingS.cur[mi - 1] : 0;
    const varMM = mesAnt > 0 ? Math.round((ingS.cur[mi] - mesAnt) / mesAnt * 100) : 0;
    const util = acumI - acumE;
    // --- tablas de respaldo + general→particular (mes seleccionado) ---
    const mk = mesSel, cur = paisFin() === 'CO' ? 'COP' : 'GTQ';
    const primaMesEmp = primaNetaMes(mk);
    // por VENDEDOR (prima neta del mes, recaudo, comisión generada, participación)
    const board = q.leaderboard ? q.leaderboard() : [];
    const vend = S().all('asesores').map(a => {
      const prima = primaNetaMes(mk, po => po.asesorId === a.id);
      const rec = recaudoMes(mk, po => po.asesorId === a.id);
      const com = S().where('comisiones', c => c.asesorId === a.id).reduce((s, c) => s + norm(c.monto, c.moneda), 0);
      return { a, prima, rec, com };
    }).filter(v => v.prima > 0 || v.rec > 0).sort((x, y) => y.prima - x.prima);
    const vendTot = vend.reduce((s, v) => s + v.prima, 0) || 1;
    // por ASEGURADORA
    const asg = S().all('aseguradoras').map(g => {
      const prima = primaNetaMes(mk, po => po.aseguradoraId === g.id);
      const npol = S().where('polizas', po => po.aseguradoraId === g.id && (po.vigenciaInicio || '').slice(0, 7) === mk).length;
      return { g, prima, npol };
    }).filter(r => r.prima > 0).sort((x, y) => y.prima - x.prima);
    const asgTot = asg.reduce((s, r) => s + r.prima, 0) || 1;
    // intermensual: variación mes a mes
    const momRows = MESES.slice(Math.max(0, mi - 5), mi + 1).map((m, idx) => { const real = mi - 5 + idx; const ing = ingS.cur[real] || 0, egr = egrS.cur[real] || 0, prev = real > 0 ? (ingS.cur[real - 1] || 0) : 0; return { m, ing, egr, mom: prev ? Math.round((ing - prev) / prev * 100) : 0 }; });
    // análisis crítico (hallazgos reales)
    const findings = [];
    if (vend.length) { const top = vend[0]; findings.push(`<b>${U.esc(top.a.nombre)}</b> lidera la producción del mes con ${U.money(top.prima, cur)} (${Math.round(top.prima / vendTot * 100)}% del total).`); }
    const bajo = vend.filter(v => v.prima > 0).sort((a, b) => (a.rec / (a.prima || 1)) - (b.rec / (b.prima || 1)))[0];
    if (bajo && bajo.prima) findings.push(`<b>${U.esc(bajo.a.nombre)}</b> tiene el menor índice recaudo/venta (${Math.round(bajo.rec / bajo.prima * 100)}%) — priorizar cobranza de su cartera.`);
    if (asg.length) { const c = asg[0]; const conc = Math.round(c.prima / asgTot * 100); if (conc >= 35) findings.push(`Concentración en <b>${U.esc(c.g.nombre)}</b>: ${conc}% de la prima del mes — riesgo de dependencia, diversificar.`); }
    if (varIA < 0) findings.push(`Ingresos acumulados caen <b>${Math.abs(varIA)}%</b> vs ${ingS.y - 1} — revisar renovaciones y cartera vencida.`);
    else findings.push(`Ingresos acumulados crecen <b>+${varIA}%</b> vs ${ingS.y - 1}; margen operativo del periodo: ${acumI ? Math.round(util / acumI * 100) : 0}%.`);
    const recEmp = recaudoMes(mk); if (primaMesEmp && recEmp / primaMesEmp < 0.7) findings.push(`Recaudo del mes es ${Math.round(recEmp / primaMesEmp * 100)}% de la venta — brecha de cobranza a vigilar.`);
    const tbl = (titulo, head, body) => `<div class="card" style="overflow:hidden;margin-bottom:14px"><div style="padding:11px 14px;border-bottom:1px solid var(--line);font-family:var(--f-display);font-weight:800;font-size:14px">${titulo}</div><div style="overflow-x:auto"><table class="tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div></div>`;
    return `${K.kpis([
      { label: 'Ingresos acum.', val: M(acumI), color: 'var(--ok)', foot: 'Ene→' + MESES[mi] + ' ' + ingS.y },
      { label: 'Utilidad operativa', val: M(util), color: 'var(--red)', foot: 'ingresos − egresos' },
      { label: 'Var. interanual', val: (varIA >= 0 ? '+' : '') + varIA + '%', color: varIA >= 0 ? 'var(--ok)' : 'var(--danger)', foot: 'vs ' + (ingS.y - 1), footTone: varIA >= 0 ? 'up' : 'down' },
      { label: 'Intermensual', val: (varMM >= 0 ? '+' : '') + varMM + '%', color: 'var(--info)', foot: MESES[mi] + ' vs ' + (mi > 0 ? MESES[mi - 1] : '—'), footTone: varMM >= 0 ? 'up' : 'down' }
    ])}
    <div class="card pad" style="margin-bottom:14px;border-left:3px solid var(--graph)"><b style="font-family:var(--f-display);font-size:15px">🤖 Análisis crítico · ${MESES[mi]} ${ingS.y}</b><ul class="ins-recs" style="margin:10px 0 0;padding-left:18px;line-height:1.7">${findings.map(f => '<li>' + f + '</li>').join('')}</ul></div>
    ${card2('Ingresos vs egresos · ' + ingS.y + ' (intermensual)', dualBars(MESES, ingS.cur, egrS.cur, 'Ingresos', 'Egresos'))}
    ${tbl('Detalle intermensual (respaldo del gráfico)', '<th>Mes</th><th class="num">Ingresos</th><th class="num">Egresos</th><th class="num">Resultado</th><th class="num">Δ Ingresos MoM</th>', momRows.map(r => `<tr><td>${r.m} ${ingS.y}</td><td class="num" style="color:var(--ok)">${M(r.ing)}</td><td class="num" style="color:var(--danger)">${M(r.egr)}</td><td class="num"><b>${M(r.ing - r.egr)}</b></td><td class="num" style="color:${r.mom >= 0 ? 'var(--ok)' : 'var(--danger)'}">${r.mom >= 0 ? '▲' : '▼'} ${Math.abs(r.mom)}%</td></tr>`).join(''))}
    ${card2('Comparativo interanual de ingresos · ' + (ingS.y - 1) + ' vs ' + ingS.y, dualBars(MESES, ingS.prev, ingS.cur, ingS.y - 1 + '', ingS.y + ''))}
    ${tbl('📊 Producción por vendedor · ' + MESES[mi] + ' ' + ingS.y, '<th>Vendedor</th><th class="num">Prima neta</th><th class="num">% del total</th><th class="num">Recaudo</th><th class="num">Índice recaudo</th><th class="num">Comisión gen.</th>', vend.map(v => `<tr><td><div style="display:flex;align-items:center;gap:8px">${U.avatar(v.a.nombre, v.a.color, 'sm')}<b>${U.esc(v.a.nombre)}</b></div></td><td class="num"><b>${U.money(v.prima, cur)}</b></td><td class="num">${Math.round(v.prima / vendTot * 100)}%</td><td class="num" style="color:var(--info)">${U.money(v.rec, cur)}</td><td class="num" style="color:${v.prima && v.rec / v.prima >= 0.7 ? 'var(--ok)' : 'var(--warn)'}">${v.prima ? Math.round(v.rec / v.prima * 100) : 0}%</td><td class="num">${U.money(v.com, cur)}</td></tr>`).join('') || '<tr><td colspan="6" class="muted" style="text-align:center;padding:18px">Sin producción en el mes.</td></tr>')}
    ${tbl('🏛️ Producción por aseguradora · ' + MESES[mi] + ' ' + ingS.y, '<th>Aseguradora</th><th class="num">Prima neta</th><th class="num">% del total</th><th class="num">Pólizas</th>', asg.map(r => `<tr><td><span style="display:flex;align-items:center;gap:8px"><span class="dot-s" style="background:${r.g.color || '#888'}"></span><b>${U.esc(r.g.nombre)}</b></span></td><td class="num"><b>${U.money(r.prima, cur)}</b></td><td class="num">${Math.round(r.prima / asgTot * 100)}%</td><td class="num">${r.npol}</td></tr>`).join('') || '<tr><td colspan="4" class="muted" style="text-align:center;padding:18px">Sin producción en el mes.</td></tr>')}`;
  }
  function card2(t, body) { return `<div class="card pad" style="margin-bottom:14px"><b style="font-family:var(--f-display);font-size:15px">${t}</b><div style="margin-top:14px">${body}</div></div>`; }
  function dualBars(labels, a, b, la, lb) {
    const max = Math.max(1, ...a, ...b);
    return `<div style="display:flex;gap:14px;margin-bottom:10px;font-size:12px"><span style="display:flex;align-items:center;gap:5px"><span class="dot-s" style="background:#9aa0a8"></span>${la}</span><span style="display:flex;align-items:center;gap:5px"><span class="dot-s" style="background:var(--red)"></span>${lb}</span></div>
    <div style="display:flex;align-items:flex-end;gap:8px;height:160px">${labels.map((l, i) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;height:100%;justify-content:flex-end">
      <div style="display:flex;gap:2px;align-items:flex-end;height:100%;width:100%;justify-content:center">
        <div title="${la}: ${M(a[i])}" style="width:44%;background:#c4c8cd;border-radius:3px 3px 0 0;height:${a[i] / max * 100}%"></div>
        <div title="${lb}: ${M(b[i])}" style="width:44%;background:linear-gradient(180deg,#e0566a,#C5162E);border-radius:3px 3px 0 0;height:${b[i] / max * 100}%"></div>
      </div><span style="font-size:10px;color:var(--ink-3);font-family:var(--f-mono)">${l}</span></div>`).join('')}</div>`;
  }

  /* ---------- PRESUPUESTO vs REAL (semáforos) ---------- */
  function presupuesto() {
    const p = paisFin() || 'GT';
    const ppto = S().all('presupuesto').filter(x => x.pais === p && x.periodo === mesSel);
    const realPorCat = {};
    S().all('finmovs').filter(m => m.pais === p && m.periodo === mesSel && m.tipo === 'egreso').forEach(m => { const k = m.categoria || m.clase; realPorCat[k] = (realPorCat[k] || 0) + norm(m.valor, m.moneda); });
    const cur = p === 'GT' ? 'GTQ' : 'COP';
    const rows = ppto.map(x => ({ id: x.id, cat: x.categoria, ppto: x.monto, real: realPorCat[x.categoria] || 0 }));
    const tP = rows.reduce((s, r) => s + r.ppto, 0), tR = rows.reduce((s, r) => s + r.real, 0);
    const sem = (pct) => pct <= 100 ? 'var(--ok)' : pct <= 115 ? 'var(--warn)' : 'var(--danger)';
    const lbl = MESES[+mesSel.slice(5) - 1] + ' ' + mesSel.slice(0, 4);
    return `<div class="cfg-note" style="margin-bottom:14px">📊 Presupuesto vs real del mes con <b>semáforos</b>: verde dentro de presupuesto, ámbar leve sobre-ejecución, rojo desviación alta. Edita cada partida o replica el mes anterior. (${p} · ${lbl})</div>
    ${K.kpis([
      { label: 'Presupuesto', val: U.moneyShort(tP, cur), color: 'var(--info)', foot: 'egresos del mes' },
      { label: 'Ejecutado', val: U.moneyShort(tR, cur), color: tR <= tP ? 'var(--ok)' : 'var(--danger)', foot: Math.round(tR / (tP || 1) * 100) + '% del ppto', onclick: "Orbit.modules.finanzas.drillKey('egr-mes')" },
      { label: 'Disponible', val: U.moneyShort(tP - tR, cur), color: 'var(--red)', foot: tP - tR >= 0 ? 'dentro de meta' : 'sobre-ejecutado' }
    ])}
    <div class="card pad" style="margin-bottom:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <b style="font-family:var(--f-display);font-size:15px;flex:1">Partidas · ${lbl}</b>
      <button class="btn primary sm" onclick="Orbit.modules.finanzas.editarPresup(null)">+ Partida</button>
      <button class="btn ghost sm" onclick="Orbit.modules.finanzas.replicarPresup()">📋 Replicar mes anterior</button>
    </div>
    <div class="card" style="overflow:hidden"><table class="tbl"><thead><tr><th>Categoría</th><th class="num">Presupuesto</th><th class="num">Real</th><th class="num">%</th><th>Semáforo</th><th>Pago</th></tr></thead>
      <tbody>${rows.map(r => { const pct = Math.round(r.real / (r.ppto || 1) * 100); const src = S().get('presupuesto', r.id) || {}; const fp = src.fechaPago || ''; const pagado = r.real >= r.ppto; const atrasado = fp && !pagado && fp < Orbit.ui.today(); const estP = pagado ? '<span class="badge ok">✅ pagado</span>' : atrasado ? '<span class="badge danger">⏰ atrasado</span>' : fp ? '<span class="badge info">🕓 en tiempo</span>' : '<span class="muted">—</span>'; return `<tr class="clickable" onclick="Orbit.modules.finanzas.editarPresup('${r.id}')" title="Editar / eliminar partida"><td><b>${U.esc(r.cat)}</b></td><td class="num">${U.money(r.ppto, cur)}</td><td class="num">${U.money(r.real, cur)}</td><td class="num">${pct}%</td><td><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${sem(pct)}"></span> ${pct <= 100 ? 'OK' : pct <= 115 ? 'Alerta' : 'Desviado'}</td><td>${estP}${fp ? ' <span class="muted" style="font-size:11px">' + U.fmtDate(fp) + '</span>' : ''}</td></tr>`; }).join('') || `<tr><td colspan="6" class="muted" style="text-align:center;padding:20px">Sin partidas para ${lbl}. Usa “+ Partida” o “Replicar mes anterior”.</td></tr>`}</tbody></table></div>`;
  }
  function editarPresup(id) {
    const p = paisFin() || 'GT', cur = p === 'GT' ? 'GTQ' : 'COP';
    const rec = id ? S().get('presupuesto', id) : null;
    const clases = ['Comisiones asesores', 'Gastos fijos', 'Marketing', 'Operación', 'Otros'];
    let back = document.getElementById('fin-pp'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'fin-pp'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 97;
    back.innerHTML = `<div class="card" style="width:min(460px,94vw);padding:0">
      <div style="padding:17px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">
        <b style="font-family:var(--f-display);font-size:16px">${rec ? '✏ Editar partida' : '+ Partida de presupuesto'}</b><button class="imp-x" id="pp-x">✕</button></div>
      <div style="padding:18px 20px;display:grid;gap:12px">
        <label class="ce-l">Categoría<input id="pp-cat" class="o-sel" value="${rec ? U.esc(rec.categoria) : ''}"></label>
        <div class="cgrid">
          <label class="ce-l">Clasificación<select id="pp-clase" class="o-sel">${clases.map(c => `<option ${rec && rec.clase === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
          <label class="ce-l">Monto (${cur})<input id="pp-monto" class="o-sel" type="number" value="${rec ? rec.monto : 0}"></label>
        </div>
        <label class="ce-l">Fecha de pago<input id="pp-fpago" class="o-sel" type="date" value="${rec && rec.fechaPago ? rec.fechaPago : (mesSel + '-05')}"></label>
        <div class="cfg-note">La fecha de pago define si la partida está <b>en tiempo</b> o <b>atrasada</b> y alimenta las notificaciones de pago.</div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:space-between">
        ${rec ? '<button class="btn ghost" id="pp-del" style="color:var(--danger)">🗑 Eliminar</button>' : '<span></span>'}
        <div style="display:flex;gap:8px"><button class="btn ghost" id="pp-cancel">Cancelar</button><button class="btn primary" id="pp-ok">Guardar</button></div>
      </div></div>`;
    document.body.appendChild(back);
    const $ = s => back.querySelector(s); const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    $('#pp-x').addEventListener('click', close); $('#pp-cancel').addEventListener('click', close);
    if ($('#pp-del')) $('#pp-del').addEventListener('click', () => { S().remove('presupuesto', id); close(); render(document.getElementById('host')); });
    $('#pp-ok').addEventListener('click', () => {
      const data = { categoria: $('#pp-cat').value || 'Partida', clase: $('#pp-clase').value, monto: +$('#pp-monto').value || 0, fechaPago: $('#pp-fpago').value || '', pais: rec ? rec.pais : p, periodo: rec ? rec.periodo : mesSel };
      if (rec) S().update('presupuesto', id, data); else S().insert('presupuesto', Object.assign({ id: 'ppt' + Date.now().toString().slice(-7) }, data));
      close(); render(document.getElementById('host'));
    });
  }
  function replicarPresup() {
    const p = paisFin() || 'GT';
    const [y, mm] = mesSel.split('-').map(Number);
    const prev = new Date(y, mm - 2, 1).toISOString().slice(0, 7);
    const src = S().all('presupuesto').filter(x => x.pais === p && x.periodo === prev);
    if (!src.length) { Orbit.ui.toast('No hay presupuesto del mes anterior (' + prev + ') para replicar en ' + p + '.'); return; }
    const yaTiene = new Set(S().all('presupuesto').filter(x => x.pais === p && x.periodo === mesSel).map(x => x.categoria));
    let n = 0;
    src.forEach(x => { if (yaTiene.has(x.categoria)) return; S().insert('presupuesto', { id: 'ppt' + Date.now().toString().slice(-7) + Math.floor(Math.random() * 99), categoria: x.categoria, clase: x.clase, monto: x.monto, pais: p, periodo: mesSel }); n++; });
    if (!n) Orbit.ui.toast('El mes ya tiene todas las partidas del mes anterior.');
    render(document.getElementById('host'));
  }

  /* ---------- ANÁLISIS IA (Gemini) ---------- */
  function ia() {
    const mi = +mesSel.slice(5) - 1;
    const ingS = serie(m => m.tipo === 'ingreso'), egrS = serie(m => m.tipo === 'egreso');
    const acumI = ingS.cur.slice(0, mi + 1).reduce((s, v) => s + v, 0), acumIp = ingS.prev.slice(0, mi + 1).reduce((s, v) => s + v, 0);
    const varIA = acumIp > 0 ? Math.round((acumI - acumIp) / acumIp * 100) : 0;
    const acumE = egrS.cur.slice(0, mi + 1).reduce((s, v) => s + v, 0);
    const margen = acumI > 0 ? Math.round((acumI - acumE) / acumI * 100) : 0;
    const metaSugerida = Math.round(acumI / (mi + 1) * 1.12);
    return `<div class="cfg-note" style="margin-bottom:14px">✨ Análisis crítico asistido por IA (Gemini) a partir de los resultados financieros. Genera diagnóstico, metas sugeridas y estrategias. <i>Conector configurable por tenant.</i></div>
    <div class="card pad" style="margin-bottom:14px;border-left:3px solid var(--red)">
      <b style="font-family:var(--f-display);font-size:15px">🧠 Diagnóstico del periodo</b>
      <ul class="ins-recs" style="margin-top:10px;line-height:1.7">
        <li>Ingresos acumulados <b>${M(acumI)}</b>, ${varIA >= 0 ? 'creciendo' : 'cayendo'} <b style="color:${varIA >= 0 ? 'var(--ok)' : 'var(--danger)'}">${varIA}%</b> interanual.</li>
        <li>Margen operativo del <b>${margen}%</b> ${margen < 25 ? '— por debajo del objetivo sano (25–35%); revisar gastos fijos y marketing.' : '— saludable.'}</li>
        <li>Mejor canal de ingreso: <b>Comisiones de aseguradora</b>; la financiación debe mantenerse fuera del operativo.</li>
      </ul>
    </div>
    <div class="ins-grid-2">
      <div class="card pad"><b style="font-family:var(--f-display);font-size:14px">🎯 Metas sugeridas</b><ul class="ins-recs" style="margin-top:9px;line-height:1.7">
        <li>Ventas (prima neta) próximo mes: <b>${M(metaSugerida)}</b></li>
        <li>Recaudo objetivo: <b>${M(metaSugerida * 0.85)}</b> (85%)</li>
        <li>Tope de gasto fijo: <b>≤ ${M(acumE / (mi + 1) * 0.95)}</b>/mes</li>
      </ul></div>
      <div class="card pad"><b style="font-family:var(--f-display);font-size:14px">📈 Estrategias recomendadas</b><ul class="ins-recs" style="margin-top:9px;line-height:1.7">
        <li><b>Medios:</b> reforzar pauta en redes con mejor CAC; medir por canal.</li>
        <li><b>Segmentación:</b> priorizar ramos de mayor comisión y renovación.</li>
        <li><b>Comercial:</b> campaña de recuperación de cartera vencida y cross-sell a top clientes.</li>
      </ul></div>
    </div>
    <button class="btn primary" style="margin-top:14px" id="fin-ia-regen">✨ Regenerar análisis con IA</button>
    <div id="fin-ia-out" class="cfg-note" style="margin-top:10px;display:none"></div>`;
  }

  /* ---- registrar financiamiento (sube deuda) o abono (baja deuda) ---- */
  function regFinanciacion(modo) {
    const p = paisFin() || 'GT';
    const acrs = S().all('acreedores').filter(a => a.pais === p);
    if (!acrs.length) { Orbit.ui.toast('No hay acreedores para ' + p + '. Agrega uno primero.'); return; }
    const cur = p === 'CO' ? 'COP' : 'GTQ';
    let back = document.getElementById('fin-fz'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'fin-fz'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 96;
    back.innerHTML = `<div class="card" style="width:min(460px,94vw);padding:0">
      <div style="padding:17px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">
        <b style="font-family:var(--f-display);font-size:16px">${modo === 'ingreso' ? '+ Financiamiento recibido' : '− Abono / devolución'}</b><button class="imp-x" id="fz-x">✕</button></div>
      <div style="padding:18px 20px;display:grid;gap:12px">
        <label class="ce-l">Acreedor<select id="fz-acr" class="o-sel">${acrs.map(a => `<option value="${a.id}">${U.esc(a.nombre)} · saldo ${U.money(a.saldo, cur)}</option>`).join('')}</select></label>
        <div class="cgrid">
          <label class="ce-l">Monto (${cur})<input id="fz-monto" class="o-sel" type="number" value="0"></label>
          <label class="ce-l">Día<input id="fz-dia" class="o-sel" type="number" min="1" max="31" value="${new Date().getDate()}"></label>
        </div>
        <label class="ce-l">Nota<input id="fz-obs" class="o-sel" value="${modo === 'ingreso' ? 'Capital de trabajo' : 'Amortización'}"></label>
        <div class="cfg-note">${modo === 'ingreso' ? 'La financiación entra como <b>ingreso NO operativo</b> y <b>aumenta la deuda</b> del acreedor.' : 'El abono entra como <b>egreso</b> y <b>reduce la deuda</b> del acreedor.'}</div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" id="fz-cancel">Cancelar</button><button class="btn primary" id="fz-ok">Registrar</button></div></div>`;
    document.body.appendChild(back);
    const $ = s => back.querySelector(s);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    $('#fz-x').addEventListener('click', close); $('#fz-cancel').addEventListener('click', close);
    $('#fz-ok').addEventListener('click', () => {
      const acr = S().get('acreedores', $('#fz-acr').value); const monto = +$('#fz-monto').value || 0;
      if (!acr || monto <= 0) { close(); return; }
      if (modo === 'ingreso') {
        S().insert('finmovs', { id: 'fmv' + Date.now().toString().slice(-7), tipo: 'financiacion', clase: 'Financiamiento', concepto: 'Ingreso por financiación', pagador: acr.nombre, acreedorId: acr.id, valor: monto, dia: +$('#fz-dia').value || 1, estado: 'recaudado', periodo: mesSel, pais: p, moneda: cur, obs: $('#fz-obs').value });
        S().update('acreedores', acr.id, { saldo: (acr.saldo || 0) + monto });
      } else {
        S().insert('finmovs', { id: 'fmv' + Date.now().toString().slice(-7), tipo: 'egreso', clase: 'Devolución de préstamo', concepto: 'Abono a financiación', beneficiario: acr.nombre, acreedorId: acr.id, valor: monto, dia: +$('#fz-dia').value || 1, estado: 'pagado', periodo: mesSel, pais: p, moneda: cur, pendiente: 0, obs: $('#fz-obs').value });
        S().update('acreedores', acr.id, { saldo: Math.max(0, (acr.saldo || 0) - monto) });
      }
      close(); render(document.getElementById('host'));
    });
  }

  /* ---------- DETALLE DE LIQUIDACIÓN (por aseguradora o asesor) ---------- */
  function detLiq(campo, key) {
    if (!key) return;
    const regs = S().all('comisiones').filter(c => c[campo] === key).sort((a, b) => (b.periodo || '').localeCompare(a.periodo || ''));
    const titulo = campo === 'aseguradoraId' ? (q.aseguradora(key) || {}).nombre : (q.asesor(key) || {}).nombre;
    const tot = regs.reduce((s, c) => s + q.norm(c.monto, c.moneda), 0);
    const liq = regs.filter(c => c.estado === 'Liquidada').reduce((s, c) => s + q.norm(c.monto, c.moneda), 0);
    let back = document.getElementById('fin-detliq'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'fin-detliq'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 96;
    back.innerHTML = `<div class="card" style="width:min(740px,95vw);max-height:92vh;display:flex;flex-direction:column;padding:0">
      <div style="padding:17px 20px;background:linear-gradient(120deg,var(--graph),#10141a);display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div><div class="crumb" style="margin-bottom:4px;color:rgba(255,255,255,.8)">Detalle de liquidación</div>
          <b style="font-family:var(--f-display);font-size:18px;color:#fff">${U.esc(titulo || '—')}</b>
          <div style="font-size:12.5px;margin-top:3px;color:rgba(255,255,255,.85)">${regs.length} registros · ${U.money(tot, 'GTQ')} total · ${U.money(liq, 'GTQ')} liquidado · clic en estado para cambiar</div></div>
        <button class="imp-x" id="dl-x" style="background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.3);color:#fff">✕</button></div>
      <div style="overflow:auto;flex:1"><table class="tbl">
        <thead><tr><th>Periodo</th><th>Cliente</th><th>Póliza</th><th class="num">Base neta</th><th class="num">%</th><th class="num">Comisión</th><th>Estado</th></tr></thead>
        <tbody>${regs.map(c => { const cli = S().get('clientes', c.clienteId), p = S().get('polizas', c.polizaId); return `<tr>
          <td class="mono" style="font-size:11.5px">${c.periodo || '—'}</td>
          <td style="font-size:12.5px">${cli ? U.esc(cli.nombre) : '—'}</td>
          <td class="mono" style="font-size:11.5px">${p ? p.numero : '—'}</td>
          <td class="num">${U.money(c.base, c.moneda)}</td><td class="num">${c.pct}%</td>
          <td class="num"><b>${U.money(c.monto, c.moneda)}</b></td>
          <td style="cursor:pointer" onclick="Orbit.modules.finanzas.toggleComEstado('${c.id}','${campo}','${key}')"><span class="badge ${c.estado === 'Liquidada' ? 'ok' : 'warn'}">${c.estado}</span></td></tr>`; }).join('') || '<tr><td colspan="7" class="muted" style="text-align:center;padding:20px">Sin registros.</td></tr>'}</tbody>
      </table></div>
      <div style="padding:13px 20px;border-top:1px solid var(--line);display:flex;justify-content:flex-end"><button class="btn primary" id="dl-ok">Cerrar</button></div>
    </div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#dl-x').addEventListener('click', close);
    back.querySelector('#dl-ok').addEventListener('click', close);
  }
  function toggleComEstado(comId, campo, key) {
    const c = S().get('comisiones', comId); if (!c) return;
    S().update('comisiones', comId, { estado: c.estado === 'Liquidada' ? 'Devengada' : 'Liquidada' });
    detLiq(campo, key);
  }

  function wire(host) {
    const rb = (host || document).querySelector('#fin-ia-regen');
    if (rb) rb.addEventListener('click', async () => {
      const out = document.getElementById('fin-ia-out'); if (!out) return;
      out.style.display = 'block'; out.textContent = '🧠 Generando análisis financiero con IA…';
      let txt = '';
      try {
        const movs = S().all('finmovs') || [];
        const ing = movs.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + (m.monto || 0), 0);
        const eg = movs.filter(m => m.tipo === 'egreso').reduce((s, m) => s + (m.monto || 0), 0);
        if (Orbit.ia && Orbit.ia.analisis) txt = await Orbit.ia.analisis('Analiza la salud financiera de una correduría de seguros con ingresos ' + ing + ' y egresos ' + eg + '. Da diagnóstico breve, 2 riesgos y 3 estrategias (medios, segmentación, comercial).');
      } catch (e) {}
      out.innerHTML = txt
        ? ('<b>✨ Análisis IA</b><div style="margin-top:6px;white-space:pre-wrap">' + U.esc(txt) + '</div>')
        : '⚠️ Conecta un proveedor de IA en Configuración → Automatizaciones → Motor de IA para análisis en vivo. (Sin IA, el análisis de arriba usa la heurística de la plataforma.)';
    });
  }
  return { render, toggleEstado, lote, nuevoMov, editarMov, crearMes, crearMeta, metasSugerir, regFinanciacion, detLiq, toggleComEstado, drillKey, editarPresup, replicarPresup };
})();
