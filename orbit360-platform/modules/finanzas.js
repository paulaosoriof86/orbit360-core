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

  function render(host) {
    const TABS = [['movimientos', '🧾 Movimientos'], ['dashboard', '📊 Dashboard'], ['cxcp', '💳 CxC / CxP'], ['financiacion', '🏦 Financiación'], ['presupuesto', '📋 Presupuesto'], ['empresa', '🏢 Liq. empresa'], ['asesores', '👥 Liq. asesores'], ['banco', '🔗 Conciliación'], ['ia', '✨ Análisis IA']];
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
      b.innerHTML = ({ movimientos, dashboard, cxcp, financiacion, presupuesto, empresa, asesores, banco, ia }[tab] || movimientos)();
      wire(host);
    }));
    const pSel = host.querySelector('#fin-pais'); if (pSel) pSel.addEventListener('change', () => { Orbit.pais = pSel.value; document.dispatchEvent(new CustomEvent('orbit:pais')); render(host); });
    const mSel = host.querySelector('#fin-mes'); if (mSel) mSel.addEventListener('change', () => { mesSel = mSel.value; render(host); });
    const body = document.getElementById('fin-body');
    body.innerHTML = ({ movimientos, dashboard, cxcp, financiacion, presupuesto, empresa, asesores, banco, ia }[tab] || movimientos)();
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
      <button class="btn primary sm" onclick="Orbit.modules.finanzas.crearMes()">Generar mes</button>
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

  /* ---------- DASHBOARD financiero (datos en vivo del store) ---------- */
  function serieMensual(anio, tipo) {
    const p = paisFin();
    return MESES.map((_, i) => {
      const ym = anio + '-' + String(i + 1).padStart(2, '0');
      return sum(S().all('finmovs').filter(m => m.periodo === ym && (!p || m.pais === p) && (tipo === 'ingreso' ? m.tipo === 'ingreso' : m.tipo === 'egreso')), m => m.valor);
    });
  }
  function dashboard() {
    const prod = produccionNeta();
    const anio = +mesSel.slice(0, 4), mi = +mesSel.slice(5) - 1;
    const ingArr = serieMensual(anio, 'ingreso'), egrArr = serieMensual(anio, 'egreso');
    const ingPrev = serieMensual(anio - 1, 'ingreso'), egrPrev = serieMensual(anio - 1, 'egreso');
    // ventana de 6 meses hasta el mes seleccionado
    const lo = Math.max(0, mi - 5);
    const meses = MESES.slice(lo, mi + 1), ingresos = ingArr.slice(lo, mi + 1), egresos = egrArr.slice(lo, mi + 1);
    const maxV = Math.max(1, ...ingresos, ...egresos);
    const anioActual = ingArr.slice(0, mi + 1).reduce((s, v) => s + v, 0);
    const anioAnterior = ingPrev.slice(0, mi + 1).reduce((s, v) => s + v, 0);
    const varAnual = anioAnterior > 0 ? Math.round((anioActual / anioAnterior - 1) * 100) : 0;
    const utilidad = (ingresos[ingresos.length - 1] || 0) - (egresos[egresos.length - 1] || 0);
    const margen = ingresos[ingresos.length - 1] > 0 ? Math.round(utilidad / ingresos[ingresos.length - 1] * 100) : 0;
    const egrAcum = egrArr.slice(0, mi + 1).reduce((s, v) => s + v, 0);
    const gastoRatio = anioActual > 0 ? Math.round(egrAcum / anioActual * 100) : 0;
    return `${K.kpis([
      { label: 'Producción neta', val: U.moneyShort(prod.neta, 'GTQ'), color: 'var(--red)', foot: 'prima neta vigente' },
      { label: 'Utilidad del mes', val: U.moneyShort(utilidad, 'GTQ'), color: 'var(--ok)', foot: 'ingresos − egresos', footTone: utilidad >= 0 ? 'up' : 'down' },
      { label: 'Var. interanual', val: (varAnual >= 0 ? '+' : '') + varAnual + '%', color: 'var(--info)', foot: 'vs ' + (anio - 1), footTone: varAnual >= 0 ? 'up' : 'down' },
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
        <b style="font-family:var(--f-display);font-size:15px">Comparativo interanual · acum. Ene→${MESES[mi]}</b>
        <div style="display:flex;align-items:flex-end;gap:24px;margin-top:16px">
          ${[[anio - 1 + '', anioAnterior, '#9aa0a8'], [anio + '', anioActual, 'var(--red)']].map(([y, v, c]) => `<div style="flex:1;text-align:center">
            <div style="height:120px;display:flex;align-items:flex-end;justify-content:center"><div style="width:60%;background:${c};border-radius:6px 6px 0 0;height:${Math.max(2, v / Math.max(anioActual, anioAnterior, 1) * 100)}%"></div></div>
            <div style="font-family:var(--f-display);font-weight:800;margin-top:8px">${U.moneyShort(v, 'GTQ')}</div>
            <div class="muted" style="font-size:12px">${y}</div></div>`).join('')}
        </div>
        <div class="cfg-note" style="margin-top:14px">${varAnual >= 0 ? 'Crecimiento' : 'Caída'} <b style="color:${varAnual >= 0 ? 'var(--ok)' : 'var(--danger)'}">${varAnual >= 0 ? '+' : ''}${varAnual}%</b> vs año anterior. Base para fijar metas realistas.</div>
      </div>
      <div class="card pad">
        <b style="font-family:var(--f-display);font-size:15px">Salud financiera</b>
        <div style="display:grid;gap:11px;margin-top:14px">
          ${finRow('Margen operativo', margen + '%', margen >= 25 ? 'ok' : 'warn')}
          ${finRow('Gasto / ingreso (acum.)', gastoRatio + '%', gastoRatio <= 60 ? 'ok' : 'warn')}
          ${finRow('Ingreso acum. ' + anio, U.moneyShort(anioActual, 'GTQ'), 'info')}
          ${finRow('Egreso acum. ' + anio, U.moneyShort(egrAcum, 'GTQ'), 'neutral')}
        </div>
        <button class="btn primary" style="margin-top:16px;width:100%" onclick="location.hash='#/equipo'">Fijar metas (Equipo y permisos) →</button>
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
    const p = paisFin() || 'GT', cur = p === 'CO' ? 'COP' : 'GTQ';
    const mesKey = mesSel;
    const metaEmp = (S().all('metas') || []).find(m => m.mes === mesKey && m.tipo === 'prima' && !m.asesorId);
    const metaVal = metaEmp && metaEmp.valor ? +metaEmp.valor : 820000;
    return `<div class="cfg-note" style="margin-bottom:14px">🎯 Metas sobre <b>prima NETA</b> (no total). Por <b>asesor</b>, <b>empresa</b> y <b>aseguradora</b>, mensual o anual (para incentivos). De aquí derivan metas de recaudo y financieras.</div>
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      <button class="btn primary sm" onclick="Orbit.modules.finanzas.crearMeta()">+ Crear meta</button>
      <span class="badge ${metaEmp ? 'ok' : 'neutral'}" style="align-self:center">${metaEmp ? '✅ meta cargada para ' + mesKey : 'meta base (sin definir para ' + mesKey + ')'}</span>
    </div>
    <div class="card pad" style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:15px">Meta de la empresa (prima neta)</b><span class="mono" style="font-size:13px">${U.moneyShort(prod.neta, cur)} / ${U.moneyShort(metaVal, cur)}</span></div>
      <div class="bar" style="margin-top:10px;height:12px"><i style="width:${Math.min(100, Math.round(prod.neta / metaVal * 100))}%"></i></div>
      <div class="muted" style="font-size:12px;margin-top:7px">Meta de recaudo derivada (78%): <b>${U.moneyShort(metaVal * .78, cur)}</b> · ajuste por no devengado aplicado: −${U.moneyShort(prod.ajuste, cur)}</div>
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
        <label class="ce-l">Valor meta (${cur})<input id="mt-val" class="o-sel" type="number" value="820000"></label>
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
    return `${K.kpis([
      { label: 'Ingresos acum.', val: M(acumI), color: 'var(--ok)', foot: 'Ene→' + MESES[mi] + ' ' + ingS.y },
      { label: 'Utilidad operativa', val: M(util), color: 'var(--red)', foot: 'ingresos − egresos' },
      { label: 'Var. interanual', val: (varIA >= 0 ? '+' : '') + varIA + '%', color: varIA >= 0 ? 'var(--ok)' : 'var(--danger)', foot: 'vs ' + (ingS.y - 1), footTone: varIA >= 0 ? 'up' : 'down' },
      { label: 'Intermensual', val: (varMM >= 0 ? '+' : '') + varMM + '%', color: 'var(--info)', foot: MESES[mi] + ' vs ' + (mi > 0 ? MESES[mi - 1] : '—'), footTone: varMM >= 0 ? 'up' : 'down' }
    ])}
    ${card2('Ingresos vs egresos · ' + ingS.y + ' (intermensual)', dualBars(MESES, ingS.cur, egrS.cur, 'Ingresos', 'Egresos'))}
    ${card2('Comparativo interanual de ingresos · ' + (ingS.y - 1) + ' vs ' + ingS.y, dualBars(MESES, ingS.prev, ingS.cur, ingS.y - 1 + '', ingS.y + ''))}`;
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
    <div class="card" style="overflow:hidden"><table class="tbl"><thead><tr><th>Categoría</th><th class="num">Presupuesto</th><th class="num">Real</th><th class="num">%</th><th>Semáforo</th></tr></thead>
      <tbody>${rows.map(r => { const pct = Math.round(r.real / (r.ppto || 1) * 100); return `<tr class="clickable" onclick="Orbit.modules.finanzas.editarPresup('${r.id}')" title="Editar / eliminar partida"><td><b>${U.esc(r.cat)}</b></td><td class="num">${U.money(r.ppto, cur)}</td><td class="num">${U.money(r.real, cur)}</td><td class="num">${pct}%</td><td><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${sem(pct)}"></span> ${pct <= 100 ? 'OK' : pct <= 115 ? 'Alerta' : 'Desviado'}</td></tr>`; }).join('') || `<tr><td colspan="5" class="muted" style="text-align:center;padding:20px">Sin partidas para ${lbl}. Usa “+ Partida” o “Replicar mes anterior”.</td></tr>`}</tbody></table></div>`;
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
      const data = { categoria: $('#pp-cat').value || 'Partida', clase: $('#pp-clase').value, monto: +$('#pp-monto').value || 0, pais: rec ? rec.pais : p, periodo: rec ? rec.periodo : mesSel };
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
  return { render, toggleEstado, lote, nuevoMov, editarMov, crearMes, crearMeta, regFinanciacion, detLiq, toggleComEstado, drillKey, editarPresup, replicarPresup };
})();
