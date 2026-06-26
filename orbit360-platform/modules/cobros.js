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
    { id: 'fq', type: 'search', ph: 'Buscar cliente o póliza…' },
    { id: 'fest', type: 'select', ph: 'Estado', options: ['Pagado', 'Pendiente', 'Vencido', 'Anulado'].map(v => ({ v, t: v })) },
    { id: 'fase', type: 'select', ph: 'Asesor', options: K.asesorOptions() }
  ];

  function rows() {
    return S().all('cobros').filter(c => {
      if (c.estado === 'Anulado' && st.fest !== 'Anulado') return false;
      const cli = S().get('clientes', c.clienteId), p = S().get('polizas', c.polizaId);
      const txt = ((cli ? cli.nombre : '') + ' ' + (p ? p.numero : '')).toLowerCase();
      return (!st.fq || txt.includes(st.fq.toLowerCase())) &&
        (!st.fest || c.estado === st.fest) &&
        (!st.fase || c.asesorId === st.fase);
    }).sort((a, b) => String(a.vence||'').localeCompare(String(b.vence||'')));
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
      ${K.bannerFor('cobros', `<button class="btn ghost" onclick="Orbit.modules.cobros.lote()" style="background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.2)">📤 Notificar por lote</button>`)}
      ${K.kpis([
        { label: 'Cartera al día', val: U.moneyShort(cart.alDia, 'GTQ'), color: 'var(--ok)', foot: 'cobros aplicados', footTone: 'up' },
        { label: 'Pendiente', val: U.moneyShort(cart.pend, 'GTQ'), color: 'var(--warn)', foot: 'por vencer' },
        { label: 'Vencido', val: U.moneyShort(cart.venc, 'GTQ'), color: 'var(--danger)', foot: 'en gestión', footTone: 'down' },
        { label: 'Por conciliar', onclick: "location.hash='#/cobros'", val: porConciliar, color: 'var(--info)', foot: 'pagos sin aplicar' }
      ])}

      <div class="card pad" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <b style="font-family:var(--f-display);font-size:15px">Antigüedad de cartera vencida (aging)</b>
          <span class="muted" style="font-size:12px">total ${U.money(agingTot, 'GTQ')}</span>
        </div>
        <div style="height:13px;border-radius:99px;overflow:hidden;display:flex;margin:14px 0 12px">
          ${Object.entries(aging).map(([k, v]) => `<div title="${k} días" style="width:${v / agingTot * 100}%;background:${agingCols[k]}"></div>`).join('')}
        </div>
        <div style="display:flex;gap:18px;flex-wrap:wrap">
          ${Object.entries(aging).map(([k, v]) => `<span style="display:flex;align-items:center;gap:7px;font-size:12.5px"><span class="dot-s" style="background:${agingCols[k]}"></span>${k} d · <b>${U.money(v, 'GTQ')}</b></span>`).join('')}
        </div>
      </div>

      <div class="card" style="overflow:hidden">
        ${K.filterBar(FDEFS(), st)}
        <div style="overflow-x:auto"><table class="tbl">
          <thead><tr><th>Cliente</th><th>Póliza</th><th>Cuota</th><th class="num">Monto</th><th>Vence</th><th>Pago</th><th>Estado</th><th title="Conciliado con Finanzas">Concil.</th></tr></thead>
          <tbody>${r.map(c => {
            const p = S().get('polizas', c.polizaId);
            return `<tr class="clickable" onclick="Orbit.modules.cobros.detalle('${c.id}')">
              <td>${K.clienteCell(c.clienteId)}</td>
              <td><span class="mono" style="font-size:12px">${p ? p.numero : '—'}</span></td>
              <td>${c.cuota}</td>
              <td class="num">${U.money(c.monto, c.moneda)}</td>
              <td style="font-size:12.5px">${U.fmtDate(c.vence)}</td>
              <td style="font-size:12.5px">${c.fechaPago ? U.fmtDate(c.fechaPago) : '<span class="muted">—</span>'}</td>
              <td>${U.estadoBadge(c.estado)}</td>
              <td>${c.estado === 'Pagado' ? (c.conciliado ? '<span style="color:var(--ok)" title="Aplicado a póliza">✓</span>' : '<span style="color:var(--warn)" title="Por conciliar">◷</span>') : '<span class="muted">—</span>'}</td>
            </tr>`;
          }).join('') || `<tr><td colspan="8" class="muted" style="text-align:center;padding:30px">Sin cobros.</td></tr>`}</tbody>
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
    const aplicable = c.estado === 'Pendiente' || c.estado === 'Vencido';
    let back = document.getElementById('cob-det'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'cob-det'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center';
    const vr = (l, v) => `<div class="vp-row"><span class="vp-l">${l}</span><span class="vp-v">${v}</span></div>`;
    back.innerHTML = `<div class="card" style="width:min(560px,95vw);max-height:92vh;overflow:auto;padding:0">
      <div style="padding:18px 20px;background:linear-gradient(120deg,var(--graph),#10141a);display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div><div class="crumb" style="margin-bottom:4px;color:rgba(255,255,255,.8)">Recibo · cuota ${c.cuota}</div>
          <b style="font-family:var(--f-display);font-size:18px;color:#fff">REC-${c.id.slice(-5).toUpperCase()}</b>
          <div class="mono" style="font-size:12.5px;margin-top:3px;color:rgba(255,255,255,.85)">${cli ? U.esc(cli.nombre) : '—'} · ${p ? p.numero : '—'}</div></div>
        <button class="imp-x" id="cd-x" style="background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.3);color:#fff">✕</button>
      </div>
      <div style="padding:18px 20px;display:grid;gap:16px">
        <div class="vp-tags">${U.estadoBadge(c.estado)}${c.estado === 'Pagado' ? (c.conciliado ? '<span class="badge ok">Conciliado</span>' : '<span class="badge warn">Por conciliar</span>') : ''}</div>
        <div class="vp-grid">
          ${vr('Aseguradora', asg ? U.esc(asg.nombre) : '—')}${vr('Asesor', ase ? U.esc(ase.nombre) : '—')}
          ${vr('Forma de pago', (p && p.formaPago) || c.metodo || '—')}${vr('Conducto', (p && p.conducto) || '—')}
          ${vr('Vence', U.fmtDate(c.vence))}${vr('Fecha límite', U.fmtDate(c.fechaLimite || c.vence))}
          ${vr('Fecha de pago', c.fechaPago ? U.fmtDate(c.fechaPago) : '—')}${vr('Fecha real (factura)', c.fechaReal ? U.fmtDate(c.fechaReal) : '—')}
        </div>
        <div class="vp-desglose">
          <div class="vp-sec-t">🧾 Desglose del recibo</div>
          <table class="vp-dtbl">
            <tr><td>Prima neta</td><td class="num">${m2(c.neta != null ? c.neta : c.monto)}</td></tr>
            <tr><td>Gastos de expedición</td><td class="num">${m2(c.gastosEmision || 0)}</td></tr>
            <tr><td>Gastos financieros</td><td class="num">${m2(c.gastosFinan || 0)}</td></tr>
            <tr><td>Otros / asistencias</td><td class="num">${m2(c.otros || 0)}</td></tr>
            <tr><td>IVA</td><td class="num">${m2(c.iva || 0)}</td></tr>
            <tr class="vp-tot"><td>Total del recibo</td><td class="num">${m2(c.monto)}</td></tr>
          </table>
        </div>
        ${c.facturaNombre ? `<div class="cfg-note">📄 Factura adjunta: <b>${U.esc(c.facturaNombre)}</b></div>` : ''}
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
        ${p ? `<button class="btn ghost" onclick="document.getElementById('cob-det').remove();Orbit.modules.cliente360.verPoliza('${c.polizaId}')">📑 Ver póliza</button>` : ''}
        ${aplicable ? `<button class="btn primary" id="cd-apply">💳 Aplicar pago</button>` : ''}
      </div>
    </div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#cd-x').addEventListener('click', close);
    const ap = back.querySelector('#cd-apply');
    if (ap) ap.addEventListener('click', () => {
      // Remove detail modal and show payment modal
      back.remove();
      let pm = document.getElementById('cob-pay'); if (pm) pm.remove();
      pm = document.createElement('div'); pm.id = 'cob-pay'; pm.className = 'drawer-back open';
      pm.style.cssText = 'display:grid;place-items:center;z-index:210';
      const hoy = new Date().toISOString().slice(0, 10);
      pm.innerHTML = '<div class="card" style="width:min(480px,95vw);padding:0;max-height:92vh;overflow:auto">'
        + '<div style="padding:16px 20px;background:linear-gradient(120deg,var(--graph),#10141a);display:flex;justify-content:space-between;align-items:center">'
        + '<div><div style="font-size:11px;font-weight:700;letter-spacing:.1em;color:rgba(255,255,255,.6);text-transform:uppercase">Cobros · aplicar pago</div>'
        + '<b style="font-family:var(--f-display);font-size:16px;color:#fff">💳 Aplicar pago — ' + U.money(c.monto, cur) + '</b></div>'
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
        + '<button class="btn primary" id="pm-ok">✅ Confirmar pago</button></div></div>';
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
        S().insert('actividades', { id: 'act'+Date.now(), clienteId: c.clienteId, asesorId: c.asesorId, tipo: 'cobro', icon: '💳', fecha, titulo: 'Pago aplicado', detalle: U.money(c.monto, cur) + ' · ' + metodo + (conciliado ? ' · Conciliado' : '') });
        // Fire automations
        const cliObj = S().get('clientes', c.clienteId);
        if (Orbit.modules.automatizaciones && cliObj) Orbit.modules.automatizaciones.disparar('pago_aplicado', { nombre: (cliObj.nombre||'').split(' ')[0], monto: U.money(c.monto, cur) });
        pmClose();
        const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = '✅ Pago aplicado' + (conciliado ? ' y conciliado' : ' — pendiente conciliación'); document.body.appendChild(t); setTimeout(() => t.remove(), 2800);
        const host2 = document.getElementById('mod-host'); if (host2) render(host2);
      });
    });
  }

  /* ---- Notificación de cobro por LOTE (selecciona recibos pendientes/vencidos) ---- */
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
      back.querySelector('#lo-tot').textContent = U.money(tot, 'GTQ');
      back.querySelector('#lo-n').textContent = sel.length + ' de ' + arr.length + ' recibos';
      back.querySelectorAll('[data-lo]').forEach(x => x.addEventListener('change', () => { x.checked ? incl.add(x.dataset.lo) : incl.delete(x.dataset.lo); paint(); }));
    }
    back.innerHTML = `<div class="card" style="width:min(620px,95vw);max-height:92vh;display:flex;flex-direction:column;padding:0">
      <div style="padding:17px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:16px">📤 Notificación de cobro por lote</b><button class="imp-x" id="lo-x">✕</button></div>
      <div class="cfg-note" style="margin:14px 16px 0">Selecciona los recibos a notificar. Se envía <b>WhatsApp + correo</b> con mensaje generado por IA, queda en el <b>historial de cada cliente</b> y baja de acciones pendientes.</div>
      <div id="lo-body" style="padding:12px 16px;overflow:auto;flex:1;display:grid;gap:7px"></div>
      <div style="padding:14px 20px;border-top:1px solid var(--line)">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px"><span class="muted" id="lo-n"></span><span style="font-family:var(--f-display);font-weight:800;font-size:20px" id="lo-tot"></span></div>
        <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" id="lo-cancel">Cancelar</button><button class="btn primary" id="lo-ok">📲 Enviar recordatorios</button></div>
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
        S().insert('actividades', { id: 'act' + Date.now() + Math.floor(Math.random() * 999), clienteId: c.clienteId, asesorId: c.asesorId, tipo: 'sistema', icon: '📤', fecha: '2026-06-24', titulo: 'Recordatorio de cobro enviado', detalle: 'WhatsApp + correo · ' + (p ? p.numero : '') + ' · ' + U.money(c.monto, c.moneda) });
        S().update('cobros', c.id, { notificado: '2026-06-24' });
        if (Orbit.correo && cli) Orbit.correo.enviar({ para: cli.email || '', asunto: 'Recordatorio de pago · ' + (p ? p.numero : ''), cuerpo: msg, clienteId: c.clienteId, vinculo: { tipo: 'cobro', id: c.id, label: 'Recibo ' + c.cuota } });
      });
      close();
      const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = '✓ ' + sel.length + ' recordatorios enviados (WhatsApp + correo)'; document.body.appendChild(t); setTimeout(() => t.remove(), 2800);
      render(document.getElementById('host'));
    });
    paint();
  }

  return { render, detalle, lote };
})();
