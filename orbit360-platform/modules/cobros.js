/* ============================================================
   Orbit 360 · CRM · Cobros y cartera (vista global)  — NÚCLEO
   Aging de cartera, conciliación y gestión de cobros.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.cobros = (function () {
  const U = Orbit.ui, q = Orbit.q, K = Orbit.kit, S = () => Orbit.store;
  let st = { fq: '', fest: '', fase: '', sort: 'vence' };

  const FDEFS = () => [
    { id: 'fq', type: 'search', ph: 'Buscar cliente, póliza o placa…' },
    { id: 'fest', type: 'select', ph: 'Estado', options: ['Pagado', 'Pendiente', 'Vencido', 'Reportado por cliente', 'Conciliado', 'Requiere validación', 'Bloqueado', 'Anulado'].map(v => ({ v, t: v })) },
    { id: 'fase', type: 'select', ph: 'Asesor', options: K.asesorOptions() }
  ];

  function rows() {
    return S().all('cobros').filter(c => {
      if (c.estado === 'Anulado' && st.fest !== 'Anulado') return false;
      // Estados de validación derivados (P0-05): reportado por cliente / conciliado / requiere validación
      const estV = estadoValidacion(c);
      if (st.fest === 'Reportado por cliente') return estV === 'Reportado por cliente' && matchTxt(c);
      if (st.fest === 'Conciliado') return c.conciliado && matchTxt(c);
      if (st.fest === 'Requiere validación') return (c.requiereValidacion || estV === 'Requiere validación') && matchTxt(c);
      if (st.fest === 'Bloqueado') return c.estado === 'Bloqueado' && matchTxt(c);
      const cli = S().get('clientes', c.clienteId), p = S().get('polizas', c.polizaId);
      let placa = '';
      if (p) { const veh = S().all('vehiculos').find(v => v.polizaId === p.id) || (p.vehiculoId ? S().get('vehiculos', p.vehiculoId) : null); if (veh) placa = veh.placa || ''; }
      const txt = ((cli ? cli.nombre : '') + ' ' + (p ? p.numero : '') + ' ' + placa).toLowerCase();
      return (!st.fq || txt.includes(st.fq.toLowerCase())) &&
        (!st.fest || c.estado === st.fest) &&
        (!st.fase || c.asesorId === st.fase);
    }).sort((a, b) => String(a.vence||'').localeCompare(String(b.vence||'')));
  }

  function matchTxt(c) {
    const cli = S().get('clientes', c.clienteId), p = S().get('polizas', c.polizaId);
    let placa = ''; try { const v = S().all('vehiculos').find(x => x.polizaId === (p && p.id)); placa = v ? v.placa : ''; } catch (e) {}
    const txt = ((cli ? cli.nombre : '') + ' ' + (p ? p.numero : '') + ' ' + placa).toLowerCase();
    return (!st.fq || txt.includes(st.fq.toLowerCase())) && (!st.fase || c.asesorId === st.fase);
  }
  // Estado de validación visible (no confundir reportado con aplicado)
  function estadoValidacion(c) {
    if (c.estado === 'Pagado') return c.conciliado ? 'Conciliado' : 'Pagado (por conciliar)';
    if (c.validadoReporte && (c.estado === 'Pendiente' || c.estado === 'Vencido')) return 'Validada (por aplicar)';
    if (c.requiereValidacion) return 'Requiere validación';
    if (c.estado === 'Bloqueado') return 'Bloqueado';
    if (c.reportado && (c.estado === 'Pendiente' || c.estado === 'Vencido')) return c.enRevision ? 'En revisión' : 'Reportado por cliente';
    return c.estado;
  }
  function badgeValidacion(c) {
    const e = estadoValidacion(c);
    const tone = e === 'Conciliado' ? 'ok' : /Pagado/.test(e) ? 'ok' : e === 'Validada (por aplicar)' ? 'ok' : e === 'Reportado por cliente' ? 'info' : e === 'En revisión' ? 'info' : e === 'Requiere validación' ? 'warn' : e === 'Bloqueado' ? 'danger' : e === 'Vencido' ? 'danger' : 'warn';
    return '<span class="badge ' + tone + '">' + e + '</span>';
  }
  function render(host) {
    const cart = q.carteraGlobal();
    const aging = q.agingVencido();
    const agingTot = Object.values(aging).reduce((s, v) => s + v, 0) || 1;
    const porConciliar = S().where('cobros', c => c.estado === 'Pagado' && !c.conciliado).length;
    const r = rows();
    st.__count = r.length + ' cobros';
    const agingCols = { '1-30': '#c9821b', '31-60': '#d9602e', '61-90': '#b5253b', '90+': '#7e1220' };

    host.innerHTML = `<div class="page">
      ${K.bannerFor('cobros', `<button class="btn ghost" onclick="Orbit.modules.cobros.lote()" style="background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.2)">📤 Preparar lote</button>`)}
      ${K.kpis([
        { label: 'Cartera al día', val: U.moneyShort(cart.alDia, Orbit.q.monedaPais()), color: 'var(--ok)', foot: 'cobros confirmados', footTone: 'up' },
        { label: 'Pendiente', val: U.moneyShort(cart.pend, Orbit.q.monedaPais()), color: 'var(--warn)', foot: 'por vencer' },
        { label: 'Vencido', val: U.moneyShort(cart.venc, Orbit.q.monedaPais()), color: 'var(--danger)', foot: 'en gestión', footTone: 'down' },
        { label: 'Por conciliar', onclick: "location.hash='#/cobros'", val: porConciliar, color: 'var(--info)', foot: 'pagos sin aplicar' }
      ])}

      <div class="card pad" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <b style="font-family:var(--f-display);font-size:15px">Antigüedad de cartera vencida (aging)</b>
          <span class="muted" style="font-size:12px">total ${U.money(agingTot, Orbit.q.monedaPais())}</span>
        </div>
        <div style="height:13px;border-radius:99px;overflow:hidden;display:flex;margin:14px 0 12px">
          ${Object.entries(aging).map(([k, v]) => `<div title="${k} días" style="width:${v / agingTot * 100}%;background:${agingCols[k]}"></div>`).join('')}
        </div>
        <div style="display:flex;gap:18px;flex-wrap:wrap">
          ${Object.entries(aging).map(([k, v]) => `<span style="display:flex;align-items:center;gap:7px;font-size:12.5px"><span class="dot-s" style="background:${agingCols[k]}"></span>${k} d · <b>${U.money(v, Orbit.q.monedaPais())}</b></span>`).join('')}
        </div>
      </div>

      <div class="card" style="overflow:hidden">
        ${K.filterBar(FDEFS(), st)}
        <div style="overflow-x:auto"><table class="tbl">
          <thead><tr><th>Cliente</th><th>Póliza</th><th>Cuota</th><th class="num">Monto</th><th>Vence</th><th>Pago</th><th>Estado</th><th title="Conciliado con Finanzas">Concil.</th><th></th></tr></thead>
          <tbody>${r.map(c => {
            const p = S().get('polizas', c.polizaId);
            const aplicable = c.estado === 'Pendiente' || c.estado === 'Vencido';
            return `<tr class="clickable" onclick="Orbit.modules.cobros.detalle('${c.id}')">
              <td>${K.clienteCell(c.clienteId)}</td>
              <td>${p ? `<a class="mono" style="font-size:12px;color:var(--red);cursor:pointer" title="Ver póliza" onclick="event.stopPropagation();Orbit.modules.cliente360.verPoliza('${p.id}')">${p.numero}</a>` : '<span class="mono" style="font-size:12px">—</span>'}</td>
              <td>${c.cuota}</td>
              <td class="num">${U.money(c.monto, c.moneda)}</td>
              <td style="font-size:12.5px">${U.fmtDate(c.vence)}</td>
              <td style="font-size:12.5px">${c.fechaPago ? U.fmtDate(c.fechaPago) : '<span class="muted">—</span>'}</td>
              <td>${badgeValidacion(c)}</td>
              <td>${c.estado === 'Pagado' ? (c.conciliado ? '<span style="color:var(--ok)" title="Confirmado y conciliado con póliza">✓</span>' : '<span style="color:var(--warn)" title="Por conciliar">◷</span>') : '<span class="muted">—</span>'}</td>
              <td style="text-align:right;white-space:nowrap">${c.reportado && !c.validadoReporte && (c.estado === 'Pendiente' || c.estado === 'Vencido') ? `<button class="btn primary sm" title="Validar pago reportado por el cliente" onclick="event.stopPropagation();Orbit.modules.cobros.validarReporte('${c.id}')">Validar</button>` : (aplicable ? `<button class="btn primary sm" title="Confirmar cobro" onclick="event.stopPropagation();Orbit.modules.cobros.aplicarPago('${c.id}')">💳 Confirmar</button>` : '')}</td>
            </tr>`;
          }).join('') || `<tr><td colspan="9" class="muted" style="text-align:center;padding:30px">Sin cobros.</td></tr>`}</tbody>
        </table></div>
      </div></div>`;

    K.wireFilters(FDEFS(), st, (id, live) => {
      if (live) { const a = document.activeElement, v = a.value; render(host); const i = document.getElementById('fq'); if (i) { i.focus(); i.value = v; i.setSelectionRange(v.length, v.length); } }
      else render(host);
    });
  }

  /* ---- Detalle del recibo (drawer) — abre el detalle del cobro, no la póliza ---- */
  function detalle(cobroId) {
    const c = S().get('cobros', cobroId); if (!c) return;
    const cli = S().get('clientes', c.clienteId), p = S().get('polizas', c.polizaId), asg = p ? q.aseguradora(p.aseguradoraId) : null, ase = q.asesor(c.asesorId);
    const cur = c.moneda; const m2 = n => U.money(n, cur);
    const TT = k => (Orbit.termino ? Orbit.termino(k, cli && cli.pais) : k);
    const aplicable = c.estado === 'Pendiente' || c.estado === 'Vencido';
    let back = document.getElementById('cob-det'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'cob-det'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center';
    const vr = (l, v) => `<div class="vp-row"><span class="vp-l">${l}</span><span class="vp-v">${v}</span></div>`;
    back.innerHTML = `<div class="card" style="width:min(560px,95vw);max-height:92vh;overflow:auto;padding:0">
      <div style="padding:18px 20px;background:linear-gradient(120deg,var(--graph),#10141a);display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div><div class="crumb" style="margin-bottom:4px;color:rgba(255,255,255,.8)">${TT('recibo')} · cuota ${c.cuota}</div>
          <b style="font-family:var(--f-display);font-size:18px;color:#fff">REC-${c.id.slice(-5).toUpperCase()}</b>
          <div class="mono" style="font-size:12.5px;margin-top:3px;color:rgba(255,255,255,.85)">${cli ? U.esc(cli.nombre) : '—'} · ${p ? p.numero : '—'}</div></div>
        <button class="imp-x" id="cd-x" style="background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.3);color:#fff">✕</button>
      </div>
      <div style="padding:18px 20px;display:grid;gap:16px">
        <div class="vp-tags">${badgeValidacion(c)}${c.reportado && (c.estado === 'Pendiente' || c.estado === 'Vencido') ? '<span class="badge info">Soporte: ' + U.esc(c.soporteNombre || 'reportado') + '</span>' : ''}</div>
        <div class="vp-grid">
          ${vr('Aseguradora', asg ? U.esc(asg.nombre) : '—')}${vr('Asesor', ase ? U.esc(ase.nombre) : '—')}
          ${vr('Forma de pago', (p && p.formaPago) || c.metodo || '—')}${vr('Conducto', (p && p.conducto) || '—')}
          ${vr('Vence', U.fmtDate(c.vence))}${vr('Fecha límite', U.fmtDate(c.fechaLimite || c.vence))}
          ${vr('Fecha de pago', c.fechaPago ? U.fmtDate(c.fechaPago) : '—')}${vr('Fecha real (factura)', c.fechaReal ? U.fmtDate(c.fechaReal) : '—')}
        </div>
        <div class="vp-desglose">
          <div class="vp-sec-t">🧾 Desglose del ${TT('recibo').toLowerCase()}</div>
          <table class="vp-dtbl">
            <tr><td>${TT('prima_neta')}</td><td class="num">${m2(c.neta != null ? c.neta : c.monto)}</td></tr>
            <tr><td>Gastos de expedición</td><td class="num">${m2(c.gastosEmision || 0)}</td></tr>
            <tr><td>Gastos financieros</td><td class="num">${m2(c.gastosFinan || 0)}</td></tr>
            <tr><td>Otros / asistencias</td><td class="num">${m2(c.otros || 0)}</td></tr>
            <tr><td>IVA</td><td class="num">${m2(c.iva || 0)}</td></tr>
            <tr class="vp-tot"><td>Total del ${TT('recibo').toLowerCase()}</td><td class="num">${m2(c.monto)}</td></tr>
          </table>
        </div>
        ${c.facturaNombre ? `<div class="cfg-note">📄 Factura adjunta: <b>${U.esc(c.facturaNombre)}</b></div>` : ''}
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
        ${cli ? `<button class="btn ghost" onclick="document.getElementById('cob-det').remove();location.hash='#/cliente360?c=${cli.id}'">👤 Ver cliente</button>` : ''}
        ${p ? `<button class="btn ghost" onclick="document.getElementById('cob-det').remove();Orbit.modules.cliente360.verPoliza('${c.polizaId}')">📑 Ver póliza</button>` : ''}
        ${c.reportado && aplicable ? `<button class="btn primary" id="cd-val">🔎 Validar pago reportado</button>` : (aplicable ? `<button class="btn primary" id="cd-apply">💳 Confirmar cobro</button>` : '')}
        ${(c.estado === 'Pagado' && !c.conciliado) ? `<button class="btn primary" id="cd-conc">📄 Cargar factura y conciliar</button>` : ''}
      </div>
    </div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#cd-x').addEventListener('click', close);
    const ap = back.querySelector('#cd-apply');
    if (ap) ap.addEventListener('click', () => { back.remove(); aplicarPago(cobroId); });
    const av = back.querySelector('#cd-val');
    if (av) av.addEventListener('click', () => { back.remove(); validarReporte(cobroId); });
    const cc = back.querySelector('#cd-conc');
    if (cc) cc.addEventListener('click', () => { back.remove(); conciliarFactura(cobroId); });
  }

  /* ---- Cargar factura y conciliar un recibo ya pagado (post-pago) ---- */
  function conciliarFactura(cobroId) {
    const c = S().get('cobros', cobroId); if (!c) return;
    let pm = document.getElementById('cob-conc'); if (pm) pm.remove();
    pm = document.createElement('div'); pm.id = 'cob-conc'; pm.className = 'drawer-back open';
    pm.style.cssText = 'display:grid;place-items:center;z-index:210';
    const hoy = new Date().toISOString().slice(0, 10);
    pm.innerHTML = '<div class="card" style="width:min(460px,95vw);padding:0">'
      + '<div style="padding:16px 20px;background:linear-gradient(120deg,var(--graph),#10141a);display:flex;justify-content:space-between;align-items:center">'
      + '<b style="font-family:var(--f-display);font-size:16px;color:#fff">📄 Conciliar con factura</b>'
      + '<button class="imp-x" id="cc-x" style="background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.25);color:#fff">✕</button></div>'
      + '<div style="padding:18px 20px;display:grid;gap:12px">'
      + '<div class="cfg-note">El recibo está <b>Pagado</b> pero pendiente de conciliación. Carga la factura de la aseguradora y registra la fecha real de pago.</div>'
      + '<div class="ce-l"><span style="font-size:12.5px;font-weight:600;color:var(--ink-2);margin-bottom:7px;display:block">Factura de la aseguradora *</span>'
      + '<div style="display:flex;gap:8px;align-items:center"><button class="btn ghost sm" id="cc-btn">⬆ Seleccionar factura</button>'
      + '<span id="cc-name" class="muted" style="font-size:12px">Sin factura</span></div></div>'
      + '<label class="ce-l">Fecha real de pago (de la factura)<input id="cc-fecha" class="o-sel" type="date" value="' + (c.fechaPago || hoy) + '"></label>'
      + '</div>'
      + '<div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end">'
      + '<button class="btn ghost" id="cc-cancel">Cancelar</button>'
      + '<button class="btn primary" id="cc-ok" disabled style="opacity:.5">✅ Conciliar</button></div></div>';
    document.body.appendChild(pm);
    let factName = '';
    const close = () => pm.remove();
    pm.addEventListener('click', e => { if (e.target === pm) close(); });
    pm.querySelector('#cc-x').addEventListener('click', close);
    pm.querySelector('#cc-cancel').addEventListener('click', close);
    const okBtn = pm.querySelector('#cc-ok');
    pm.querySelector('#cc-btn').addEventListener('click', () => {
      const fi = document.createElement('input'); fi.type = 'file'; fi.accept = '.pdf,image/*';
      fi.onchange = () => { if (!fi.files[0]) return; factName = fi.files[0].name; pm.querySelector('#cc-name').textContent = '📄 ' + factName; okBtn.disabled = false; okBtn.style.opacity = '1'; };
      fi.click();
    });
    okBtn.addEventListener('click', () => {
      if (!factName) return;
      const fechaReal = pm.querySelector('#cc-fecha').value || c.fechaPago;
      S().update('cobros', cobroId, { conciliado: true, facturaNombre: factName, fechaReal });
      S().insert('actividades', { id: 'act' + Date.now(), clienteId: c.clienteId, asesorId: c.asesorId, tipo: 'cobro', icon: '📄', fecha: fechaReal, titulo: 'Recibo conciliado', detalle: 'Factura ' + factName + ' · pago real ' + U.fmtDate(fechaReal) });
      close();
      const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = '✅ Recibo conciliado'; document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
      const host2 = document.getElementById('host'); if (host2) render(host2);
    });
  }

  /* ---- Validar un pago REPORTADO por el cliente (paso previo a aplicar) ---- */
  function validarReporte(cobroId) {
    const c = S().get('cobros', cobroId); if (!c) return;
    const cli = S().get('clientes', c.clienteId) || {};
    let pm = document.getElementById('cob-val'); if (pm) pm.remove();
    pm = document.createElement('div'); pm.id = 'cob-val'; pm.className = 'drawer-back open';
    pm.style.cssText = 'display:grid;place-items:center;z-index:210';
    pm.innerHTML = `<div class="card" style="width:min(460px,94vw);padding:0">
      <div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:16px">🔎 Validar pago reportado</b><button class="imp-x" id="cv-x">✕</button></div>
      <div style="padding:18px 20px;display:grid;gap:12px">
        <div class="cfg-note">El cliente <b>${U.esc(cli.nombre || '')}</b> reportó este pago (cuota ${c.cuota}, ${U.money(c.monto, c.moneda)}) el ${U.fmtDate(c.reportado)}. ${c.soporteNombre ? 'Soporte: <b>' + U.esc(c.soporteNombre) + '</b>.' : 'Sin soporte adjunto.'} Revisa contra el estado de cuenta antes de aplicar.</div>
        ${c.notaReporte ? `<div style="font-size:12.5px"><b>Nota del cliente:</b> ${U.esc(c.notaReporte)}</div>` : ''}
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn ghost sm" id="cv-rev">◷ Marcar en revisión</button>
          <button class="btn ghost sm" id="cv-rej" style="color:var(--danger)">✕ Rechazar reporte</button>
        </div>
      </div>
      <div style="padding:13px 20px;border-top:1px solid var(--line);display:flex;justify-content:flex-end;gap:8px">
        <button class="btn ghost" id="cv-close">Cerrar</button>
        <button class="btn primary" id="cv-ok">✓ Validar reporte</button></div></div>`;
    document.body.appendChild(pm);
    const close = () => pm.remove();
    pm.addEventListener('click', e => { if (e.target === pm) close(); });
    pm.querySelector('#cv-x').onclick = close; pm.querySelector('#cv-close').onclick = close;
    pm.querySelector('#cv-rev').onclick = () => { S().update('cobros', cobroId, { enRevision: true }); close(); const h = document.getElementById('host'); if (h) render(h); Orbit.ui.toast('◷ Pago en revisión'); };
    pm.querySelector('#cv-rej').onclick = () => { S().update('cobros', cobroId, { reportado: null, enRevision: false, notaReporte: '' }); close(); const h = document.getElementById('host'); if (h) render(h); Orbit.ui.toast('✕ Reporte rechazado — recibo vuelve a pendiente'); };
    pm.querySelector('#cv-ok').onclick = () => { S().update('cobros', cobroId, { validadoReporte: true, enRevision: false }); close(); const h = document.getElementById('host'); if (h) render(h); Orbit.ui.toast('✓ Reporte validado — ahora podés aplicar el pago'); };
  }

  /* ---- Confirmar cobro (modal reutilizable: desde la ficha del recibo y desde la tabla) ---- */
  function aplicarPago(cobroId) {
      const c = S().get('cobros', cobroId); if (!c) return;
      const cur = c.moneda;
      let pm = document.getElementById('cob-pay'); if (pm) pm.remove();
      pm = document.createElement('div'); pm.id = 'cob-pay'; pm.className = 'drawer-back open';
      pm.style.cssText = 'display:grid;place-items:center;z-index:210';
      const hoy = new Date().toISOString().slice(0, 10);
      pm.innerHTML = '<div class="card" style="width:min(480px,95vw);padding:0;max-height:92vh;overflow:auto">'
        + '<div style="padding:16px 20px;background:linear-gradient(120deg,var(--graph),#10141a);display:flex;justify-content:space-between;align-items:center">'
        + '<div><div style="font-size:11px;font-weight:700;letter-spacing:.1em;color:rgba(255,255,255,.6);text-transform:uppercase">Cobros · confirmar cobro</div>'
        + '<b style="font-family:var(--f-display);font-size:16px;color:#fff">💳 Confirmar cobro — ' + U.money(c.monto, cur) + '</b></div>'
        + '<button class="imp-x" id="pm-x" style="background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.25);color:#fff">✕</button></div>'
        + '<div style="padding:18px 20px;display:grid;gap:12px">'
        + '<label class="ce-l">Fecha de envío a gestión *<input id="pm-fecha" class="o-sel" type="date" value="' + hoy + '"></label>'
        + '<label class="ce-l">Método de pago<select id="pm-metodo" class="o-sel"><option>Transferencia bancaria</option><option>Tarjeta de crédito</option><option>Tarjeta de débito</option><option>Cheque</option><option>Efectivo</option><option>Visa cuotas</option></select></label>'
        + '<div class="ce-l"><span style="font-size:12.5px;font-weight:600;color:var(--ink-2);margin-bottom:7px;display:block">📄 Factura de la aseguradora (opcional)</span>'
        + '<div style="display:flex;gap:8px;align-items:center">'
        + '<button class="btn ghost sm" id="pm-fact-btn">⬆ Seleccionar factura</button>'
        + '<span id="pm-fact-name" class="muted" style="font-size:12px">Sin factura</span></div>'
        + '<div class="muted" style="font-size:11.5px;margin-top:5px">Al cargar la factura, el recibo pasa a <b>Conciliado</b> y se registra la fecha real de pago.</div></div>'
        + '<label class="ce-l">Fecha real de pago (de la factura)<input id="pm-fecha-real" class="o-sel" type="date"></label>'
        + '</div>'
        + '<div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end">'
        + '<button class="btn ghost" id="pm-cancel">Cancelar</button>'
        + '<button class="btn primary" id="pm-ok">✅ Confirmar cobro</button></div></div>';
      document.body.appendChild(pm);
      let factName = '', factData = '';
      const pmClose = () => pm.remove();
      pm.addEventListener('click', e => { if (e.target === pm) pmClose(); });
      pm.querySelector('#pm-x').addEventListener('click', pmClose);
      pm.querySelector('#pm-cancel').addEventListener('click', pmClose);
      pm.querySelector('#pm-fact-btn').addEventListener('click', () => {
        const fi = document.createElement('input'); fi.type = 'file'; fi.accept = '.pdf,image/*';
        fi.onchange = () => {
          if (!fi.files[0]) return;
          factName = fi.files[0].name;
          pm.querySelector('#pm-fact-name').textContent = '📄 ' + factName;
          const r = new FileReader(); r.onload = e2 => { factData = e2.target.result; }; r.readAsDataURL(fi.files[0]);
        };
        fi.click();
      });
      pm.querySelector('#pm-ok').addEventListener('click', () => {
        const fecha = pm.querySelector('#pm-fecha').value;
        const metodo = pm.querySelector('#pm-metodo').value;
        const fechaReal = pm.querySelector('#pm-fecha-real').value;
        const conciliado = !!factName;
        const patch = { estado: 'Pagado', fechaPago: fecha, metodo, conciliado };
        if (factName) { patch.facturaNombre = factName; patch.fechaReal = fechaReal || fecha; }
        S().update('cobros', cobroId, patch);
        if (Orbit.q && Orbit.q.postRecaudo) Orbit.q.postRecaudo(Object.assign({}, c, patch), fecha, metodo);
        S().insert('actividades', { id: 'act'+Date.now(), clienteId: c.clienteId, asesorId: c.asesorId, tipo: 'cobro', icon: '💳', fecha, titulo: 'Pago confirmado', detalle: U.money(c.monto, cur) + ' · ' + metodo + (conciliado ? ' · Conciliado' : '') });
        // Fire automations
        const cliObj = S().get('clientes', c.clienteId);
        if (Orbit.modules.automatizaciones && cliObj) Orbit.modules.automatizaciones.disparar('pago_aplicado', { nombre: (cliObj.nombre||'').split(' ')[0], monto: U.money(c.monto, cur) });
        pmClose();
        const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = '✅ Pago confirmado' + (conciliado ? ' y conciliado' : ' — pendiente conciliación'); document.body.appendChild(t); setTimeout(() => t.remove(), 2800);
        const host2 = document.getElementById('host'); if (host2) render(host2);
      });
  }

  /* ---- Preparación de cobro por LOTE (selecciona recibos pendientes/vencidos) ---- */
  function lote() {
    const arr = S().all('cobros').filter(c => { if (c.estado !== 'Pendiente' && c.estado !== 'Vencido') return false; const cli = S().get('clientes', c.clienteId); return !Orbit.pais || Orbit.pais === 'TODOS' || (cli && cli.pais === Orbit.pais); }).sort((a, b) => (a.vence || '').localeCompare(b.vence || ''));
    const incl = new Set(arr.map(c => c.id));
    let back = document.getElementById('cob-lote'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'cob-lote'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 96;
    function paint() {
      const sel = arr.filter(c => incl.has(c.id));
      const tot = sel.reduce((s, c) => s + q.norm(c.monto, c.moneda), 0);
      back.querySelector('#lo-body').innerHTML = arr.map(c => {
        const cli = S().get('clientes', c.clienteId), p = S().get('polizas', c.polizaId), d = U.daysFromNow(c.vence);
        return `<label class="lote-row ${incl.has(c.id) ? '' : 'off'}">
          <input type="checkbox" data-lo="${c.id}" ${incl.has(c.id) ? 'checked' : ''}>
          <span style="flex:1;min-width:0"><b>${cli ? U.esc(cli.nombre) : '—'}</b> <span class="muted" style="font-size:11.5px">· ${p ? p.numero : ''} · ${c.cuota}</span><br><span class="muted" style="font-size:11px">${d < 0 ? 'venció hace ' + (-d) + 'd' : 'vence en ' + d + 'd'}</span></span>
          <span class="mono">${U.money(c.monto, c.moneda)}</span></label>`;
      }).join('') || '<div class="muted" style="padding:18px;text-align:center">Sin recibos pendientes.</div>';
      back.querySelector('#lo-tot').textContent = U.money(tot, Orbit.q.monedaPais());
      back.querySelector('#lo-n').textContent = sel.length + ' de ' + arr.length + ' recibos';
      back.querySelectorAll('[data-lo]').forEach(x => x.addEventListener('change', () => { x.checked ? incl.add(x.dataset.lo) : incl.delete(x.dataset.lo); paint(); }));
    }
    back.innerHTML = `<div class="card" style="width:min(620px,95vw);max-height:92vh;display:flex;flex-direction:column;padding:0">
      <div style="padding:17px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:16px">📤 Preparación de cobro por lote</b><button class="imp-x" id="lo-x">✕</button></div>
      <div class="cfg-note" style="margin:14px 16px 0">Selecciona los recibos para preparar recordatorios. Se registran en el historial y se preparan correos en la bandeja central. WhatsApp/correo reales requieren canal conectado y confirmación del proveedor.</div>
      <div id="lo-body" style="padding:12px 16px;overflow:auto;flex:1;display:grid;gap:7px"></div>
      <div style="padding:14px 20px;border-top:1px solid var(--line)">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px"><span class="muted" id="lo-n"></span><span style="font-family:var(--f-display);font-weight:800;font-size:20px" id="lo-tot"></span></div>
        <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" id="lo-cancel">Cancelar</button><button class="btn primary" id="lo-ok">📲 Preparar recordatorios</button></div>
      </div></div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#lo-x').addEventListener('click', close);
    back.querySelector('#lo-cancel').addEventListener('click', close);
    back.querySelector('#lo-ok').addEventListener('click', () => {
      const sel = arr.filter(c => incl.has(c.id));
      sel.forEach(c => {
        const cli = S().get('clientes', c.clienteId), p = S().get('polizas', c.polizaId);
        const msg = Orbit.ia ? Orbit.ia.redactar('cobro', { nombre: cli ? cli.nombre.split(' ')[0] : '', poliza: p ? p.numero : '', monto: U.money(c.monto, c.moneda), vence: U.fmtDate(c.vence) }) : 'Recordatorio de cobro';
        S().insert('actividades', { id: 'act' + Date.now() + Math.floor(Math.random() * 999), clienteId: c.clienteId, asesorId: c.asesorId, tipo: 'sistema', icon: '📤', fecha: Orbit.ui.today(), titulo: 'Recordatorio de cobro preparado', detalle: 'Pendiente de canal conectado · ' + (p ? p.numero : '') + ' · ' + U.money(c.monto, c.moneda) });
        S().update('cobros', c.id, { recordatorioPreparado: Orbit.ui.today() });
        if (Orbit.correo && cli) Orbit.correo.enviar({ para: cli.email || '', asunto: 'Recordatorio de pago · ' + (p ? p.numero : ''), cuerpo: msg, clienteId: c.clienteId, vinculo: { tipo: 'cobro', id: c.id, label: 'Recibo ' + c.cuota } });
      });
      close();
      const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = '✓ ' + sel.length + ' recordatorios preparados; envío real requiere canal conectado'; document.body.appendChild(t); setTimeout(() => t.remove(), 2800);
      render(document.getElementById('host'));
    });
    paint();
  }

  return { render, detalle, aplicarPago, validarReporte, conciliarFactura, lote };
})();