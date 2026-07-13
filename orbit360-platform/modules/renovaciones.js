/* ============================================================
   Orbit 360 · CRM · Renovaciones (vista global)  — NÚCLEO
   Pipeline de pólizas por vencer, agrupadas por urgencia.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.renovaciones = (function () {
  const U = Orbit.ui, q = Orbit.q, K = Orbit.kit, S = () => Orbit.store;

  function buckets() {
    const cols = [
      { key: 'vencidas', label: 'Vencidas', tone: 'danger', test: d => d < 0 },
      { key: 'd15', label: 'Esta quincena (≤15 d)', tone: 'danger', test: d => d >= 0 && d <= 15 },
      { key: 'd45', label: 'Próximas (16–45 d)', tone: 'warn', test: d => d > 15 && d <= 45 },
      { key: 'd90', label: 'En el horizonte (46–90 d)', tone: 'info', test: d => d > 45 && d <= 90 }
    ];
    const pols = S().where('polizas', p => p.estado !== 'Cancelada');
    cols.forEach(c => c.items = []);
    pols.forEach(p => {
      const d = U.daysFromNow(p.vigenciaFin);
      if (d == null || d > 90) return;
      const col = cols.find(c => c.test(d)); if (col) col.items.push({ p, d });
    });
    cols.forEach(c => c.items.sort((a, b) => a.d - b.d));
    return cols;
  }

  function render(host) {
    const cols = buckets();
    const totalPrima = cols.reduce((s, c) => s + c.items.reduce((ss, it) => ss + q.norm(it.p.prima, it.p.moneda), 0), 0);
    const toneBg = { danger: 'var(--danger)', warn: 'var(--warn)', info: 'var(--info)' };

    host.innerHTML = `<div class="page">
      ${K.bannerFor('renovaciones', `<button class="btn primary" onclick="Orbit.modules.renovaciones.campana()">📤 Campaña de renovación</button>`)}
      ${K.kpis([
        { label: 'Vencidas', val: cols[0].items.length, color: 'var(--danger)', foot: 'recuperar ya', footTone: 'down', onclick: "location.hash='#/renovaciones'" },
        { label: '≤15 días', val: cols[1].items.length, color: 'var(--danger)', foot: 'urgente', onclick: "location.hash='#/renovaciones'" },
        { label: '16–45 días', val: cols[2].items.length, color: 'var(--warn)', foot: 'planificar', onclick: "location.hash='#/renovaciones'" },
        { label: 'Prima en juego', val: U.moneyShort(totalPrima, Orbit.q.monedaPais()), color: 'var(--ok)', foot: 'a 90 días', onclick: "location.hash='#/renovaciones'" }
      ])}
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;align-items:start">
        ${cols.map(c => `<div class="card" style="overflow:hidden">
          <div style="padding:12px 14px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;border-top:3px solid ${toneBg[c.tone]}">
            <b style="font-family:var(--f-display);font-size:13px">${c.label}</b>
            <span class="badge ${c.tone === 'info' ? 'info' : c.tone}">${c.items.length}</span>
          </div>
          <div style="padding:10px;display:grid;gap:9px;max-height:560px;overflow-y:auto">
            ${c.items.map(({ p, d }) => {
              const cli = S().get('clientes', p.clienteId), asg = q.aseguradora(p.aseguradoraId);
              const wa = (cli && cli.telefono || '').replace(/[^0-9]/g, '');
              const waTxt = encodeURIComponent('Hola ' + (cli ? cli.nombre.split(' ')[0] : '') + ', tu póliza ' + p.ramo + ' (' + p.numero + ') vence el ' + U.fmtDate(p.vigenciaFin) + '. ¿Coordinamos la renovación?');
              return `<div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:10px 11px;background:var(--card)">
                <div class="clickable" onclick="Orbit.modules.cliente360.verPoliza('${p.id}')" style="cursor:pointer">
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
                    <b style="font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${U.esc(cli ? cli.nombre : '—')}</b>
                    <span class="mono" style="font-size:10.5px;color:${d < 0 ? 'var(--danger)' : 'var(--ink-3)'};white-space:nowrap">${d < 0 ? (-d) + 'd vencida' : d + 'd'}</span>
                  </div>
                  <div class="muted" style="font-size:11.5px;margin-top:4px">${p.ramo} · ${p.producto}</div>
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-top:7px">
                    <span style="display:flex;align-items:center;gap:5px;font-size:11px"><span class="dot-s" style="background:${asg ? asg.color : '#999'}"></span>${U.esc(asg ? asg.nombre : '')}</span>
                    <span class="mono" style="font-size:11px;font-weight:600">${U.moneyShort(p.prima, p.moneda)}</span>
                  </div>
                </div>
                <div style="display:flex;gap:6px;margin-top:2px">
                  <a href="https://wa.me/${wa}?text=${waTxt}" target="_blank" rel="noopener" class="reno-wa" style="flex:1" onclick="event.stopPropagation()">💬 WhatsApp</a>
                  <button class="btn ghost sm" style="flex:1" onclick="event.stopPropagation();Orbit.modules.renovaciones.solicitarPropuestas('${p.id}')">📋 Propuestas</button>
                </div>
              </div>`;
            }).join('') || `<div class="muted" style="text-align:center;padding:24px 8px;font-size:12.5px">Sin pólizas en este tramo.</div>`}
          </div>
        </div>`).join('')}
      </div></div>`;
  }
  /* ---- Campaña de renovación por LOTE ---- */
  function campana() {
    const base = q.renovacionesProximas(60).filter(p => { const c = S().get('clientes', p.clienteId); return !Orbit.pais || Orbit.pais === 'TODOS' || (c && c.pais === Orbit.pais); }).sort((a, b) => (a.vigenciaFin || '').localeCompare(b.vigenciaFin || ''));
    let fAse = '', fRamo = '';
    let arr = base.slice();
    const incl = new Set(arr.map(p => p.id));
    let back = document.getElementById('ren-lote'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'ren-lote'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 96;
    function aplicaFiltro() {
      arr = base.filter(p => (!fAse || p.asesorId === fAse) && (!fRamo || p.ramo === fRamo));
      incl.clear(); arr.forEach(p => incl.add(p.id));
      paint();
    }
    function paint() {
      const sel = arr.filter(p => incl.has(p.id));
      back.querySelector('#rl-body').innerHTML = arr.map(p => {
        const cli = S().get('clientes', p.clienteId), d = U.daysFromNow(p.vigenciaFin);
        return `<label class="lote-row ${incl.has(p.id) ? '' : 'off'}">
          <input type="checkbox" data-rl="${p.id}" ${incl.has(p.id) ? 'checked' : ''}>
          <span style="flex:1;min-width:0"><b>${cli ? U.esc(cli.nombre) : '—'}</b> <span class="muted" style="font-size:11.5px">· ${p.numero} · ${p.ramo}</span><br><span class="muted" style="font-size:11px">${d < 0 ? 'venció hace ' + (-d) + 'd' : 'vence en ' + d + 'd'}</span></span>
          <span class="mono">${U.money(p.prima, p.moneda)}</span></label>`;
      }).join('') || '<div class="muted" style="padding:18px;text-align:center">Sin renovaciones próximas.</div>';
      back.querySelector('#rl-n').textContent = sel.length + ' de ' + arr.length + ' pólizas';
      back.querySelectorAll('[data-rl]').forEach(x => x.addEventListener('change', () => { x.checked ? incl.add(x.dataset.rl) : incl.delete(x.dataset.rl); paint(); }));
    }
    back.innerHTML = `<div class="card" style="width:min(620px,95vw);max-height:92vh;display:flex;flex-direction:column;padding:0">
      <div style="padding:17px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:16px">📤 Campaña de renovación</b><button class="imp-x" id="rl-x">✕</button></div>
      <div class="cfg-note" style="margin:14px 16px 0">Selecciona las pólizas a notificar. Se prepara <b>WhatsApp + correo</b> con propuesta de renovación generada por IA (pendiente de confirmación de entrega) y queda en el <b>historial de cada cliente</b>.</div>
      <div style="padding:10px 16px 0;display:flex;gap:8px;flex-wrap:wrap">
        <select id="rl-fase" class="o-sel" style="width:auto"><option value="">Todos los asesores</option>${S().all('asesores').map(a => `<option value="${a.id}">${U.esc(a.nombre)}</option>`).join('')}</select>
        <select id="rl-framo" class="o-sel" style="width:auto"><option value="">Todos los ramos</option>${[...new Set(base.map(p => p.ramo))].map(r => `<option>${U.esc(r)}</option>`).join('')}</select>
      </div>
      <div id="rl-body" style="padding:12px 16px;overflow:auto;flex:1;display:grid;gap:7px"></div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><span class="muted" id="rl-n"></span><div style="display:flex;gap:8px"><button class="btn ghost" id="rl-cancel">Cancelar</button><button class="btn primary" id="rl-ok">📲 Preparar campaña</button></div></div>
    </div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#rl-x').addEventListener('click', close);
    back.querySelector('#rl-cancel').addEventListener('click', close);
    const fa = back.querySelector('#rl-fase'); if (fa) fa.addEventListener('change', () => { fAse = fa.value; aplicaFiltro(); });
    const fr = back.querySelector('#rl-framo'); if (fr) fr.addEventListener('change', () => { fRamo = fr.value; aplicaFiltro(); });
    back.querySelector('#rl-ok').addEventListener('click', () => {
      const sel = arr.filter(p => incl.has(p.id));
      sel.forEach(p => {
        const cli = S().get('clientes', p.clienteId);
        const msg = Orbit.ia ? Orbit.ia.redactar('renovacion', { nombre: cli ? cli.nombre.split(' ')[0] : '', poliza: p.numero, ramo: p.ramo, vence: U.fmtDate(p.vigenciaFin) }) : 'Renovación próxima';
        S().insert('actividades', { id: 'act' + Date.now() + Math.floor(Math.random() * 999), clienteId: p.clienteId, asesorId: p.asesorId, tipo: 'sistema', icon: '📤', fecha: Orbit.ui.today(), titulo: 'Campaña de renovación preparada · pendiente de confirmación', detalle: 'WhatsApp + correo · ' + p.numero });
        if (Orbit.correo && cli) Orbit.correo.enviar({ para: cli.email || '', asunto: 'Renovación de tu póliza ' + p.numero, cuerpo: msg, clienteId: p.clienteId, vinculo: { tipo: 'poliza', id: p.id, label: p.numero } });
      });
      close();
      const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = '✓ ' + sel.length + ' propuestas de renovación preparadas'; document.body.appendChild(t); setTimeout(() => t.remove(), 2800);
    });
    paint();
  }

  /* ---- Estimación determinista de prima por aseguradora (proyección de propuesta,
     no tarifa oficial: las tarifas reales se integran con el cotizador del cliente). ---- */
  function hashStr(s) { let h = 0; s = String(s); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  function primaEstimada(asgId, ramo, primaActual, aseguradoraActual) {
    if (asgId === aseguradoraActual) return Math.round(primaActual);
    const f = 0.88 + (hashStr(asgId + '|' + ramo) % 28) / 100; // 0.88–1.15, estable
    return Math.round(primaActual * f);
  }

  /* ---- Solicitar propuestas de renovación con comparativo MULTI-ASEGURADORA ---- */
  function solicitarPropuestas(polizaId) {
    const p = S().get('polizas', polizaId); if (!p) return;
    const cli = S().get('clientes', p.clienteId) || {};
    const primaBase = +(p.primaNeta != null ? p.primaNeta : p.prima) || 0;
    const cur = p.moneda || (cli.pais === 'CO' ? 'COP' : 'GTQ');
    // candidatas: aseguradoras del mismo país (no mezclar mercado/moneda)
    const candidatas = S().all('aseguradoras').filter(a => !a.pais || !cli.pais || a.pais === cli.pais);
    let scope = 'otras'; // 'misma' | 'otras' | 'sel'
    const selected = new Set(candidatas.map(a => a.id)); // por defecto todas
    let winner = p.aseguradoraId;
    const M = n => U.money(n, cur);

    function quoteIds() {
      if (scope === 'misma') return [p.aseguradoraId];
      if (scope === 'sel') return candidatas.filter(a => selected.has(a.id)).map(a => a.id);
      return candidatas.map(a => a.id); // otras (incluye la actual como base)
    }
    function filas() {
      const ids = quoteIds();
      if (winner && ids.indexOf(winner) < 0) winner = ids[0];
      return ids.map(id => {
        const a = q.aseguradora(id) || {};
        const prima = primaEstimada(id, p.ramo, primaBase, p.aseguradoraId);
        const pct = (Orbit.comeng && Orbit.comeng.pctAseguradora) ? Orbit.comeng.pctAseguradora(id, p.ramo, p.producto || p.subramo) : 12;
        const com = Math.round(prima * pct / 100);
        const dPct = primaBase ? Math.round((prima - primaBase) / primaBase * 100) : 0;
        return { id, a, prima, pct, com, dPct, actual: id === p.aseguradoraId };
      }).sort((x, y) => x.prima - y.prima);
    }
    let back = document.getElementById('ren-prop'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'ren-prop'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 97;
    function paint() {
      const rows = filas();
      const win = rows.find(r => r.id === winner) || rows[0];
      back.querySelector('#rp-sel').style.display = scope === 'sel' ? '' : 'none';
      back.querySelector('#rp-rows').innerHTML = rows.map(r => `<tr class="${r.id === winner ? 'rp-win' : ''}">
        <td><label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="radio" name="rp-win" data-win="${r.id}" ${r.id === winner ? 'checked' : ''}><span class="dot-s" style="background:${r.a.color || '#999'}"></span><b>${U.esc(r.a.nombre || '—')}</b>${r.actual ? ' <span class="badge neutral" style="font-size:9px">actual</span>' : ''}</label></td>
        <td class="num"><b>${M(r.prima)}</b></td>
        <td class="num" style="color:${r.dPct > 0 ? 'var(--danger)' : r.dPct < 0 ? 'var(--ok)' : 'var(--ink-3)'}">${r.dPct > 0 ? '+' : ''}${r.dPct}%</td>
        <td class="num" style="font-size:11.5px">${M(r.com)} <span class="muted">(${r.pct}%)</span></td></tr>`).join('');
      back.querySelector('#rp-win-lbl').innerHTML = win ? `Propuesta elegida: <b>${U.esc(win.a.nombre)}</b> · ${M(win.prima)}` : '—';
      back.querySelectorAll('[data-win]').forEach(x => x.addEventListener('change', () => { winner = x.dataset.win; paint(); }));
    }
    back.innerHTML = `<div class="card" style="width:min(680px,96vw);max-height:92vh;display:flex;flex-direction:column;padding:0">
      <div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div><div class="crumb" style="margin-bottom:3px">Renovación · comparativo multi-aseguradora</div>
          <b style="font-family:var(--f-display);font-size:16px">📋 ${U.esc(cli.nombre || '')}</b>
          <div class="muted" style="font-size:12px;margin-top:2px">${U.esc(p.numero)} · ${p.ramo} · ${U.esc(p.producto || '')} · prima actual <b>${M(primaBase)}</b> · vence ${U.fmtDate(p.vigenciaFin)}</div></div>
        <button class="imp-x" id="rp-x">✕</button></div>
      <div style="padding:14px 18px 0">
        <div class="cfg-note" style="margin-bottom:12px">Selecciona a qué aseguradoras pedir propuesta. Las primas son <b>estimaciones de proyección</b> (las tarifas oficiales se integran con el cotizador); la comisión usa el % vigente por aseguradora/ramo. Moneda: <b>${cur}</b> (sin mezclar).</div>
        <div class="tabs" style="gap:6px;margin-bottom:6px">
          <div class="tab ${''}" data-scope="misma">🔁 Solo la misma</div>
          <div class="tab" data-scope="otras">🏛️ Comparar con otras</div>
          <div class="tab" data-scope="sel">☑️ Seleccionar</div>
        </div>
        <div id="rp-sel" style="display:none;gap:7px;flex-wrap:wrap;padding:8px 0 4px"></div>
      </div>
      <div style="overflow:auto;flex:1;padding:6px 18px 0">
        <table class="tbl"><thead><tr><th>Aseguradora</th><th class="num">Prima est.</th><th class="num">Δ vs actual</th><th class="num">Comisión est.</th></tr></thead>
        <tbody id="rp-rows"></tbody></table>
      </div>
      <div style="padding:13px 20px;border-top:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;gap:10px">
        <span class="muted" id="rp-win-lbl" style="font-size:12.5px"></span>
        <div style="display:flex;gap:8px"><button class="btn ghost" id="rp-send">📧 Enviar comparativo</button><button class="btn primary" id="rp-ok">✅ Registrar propuesta</button></div>
      </div></div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#rp-x').addEventListener('click', close);
    // scope tabs
    function paintSel() {
      back.querySelector('#rp-sel').innerHTML = candidatas.map(a => `<label class="lote-row" style="padding:5px 9px;min-width:0;width:auto"><input type="checkbox" data-cand="${a.id}" ${selected.has(a.id) ? 'checked' : ''}><span style="font-size:12px">${U.esc(a.nombre)}</span></label>`).join('');
      back.querySelectorAll('[data-cand]').forEach(x => x.addEventListener('change', () => { x.checked ? selected.add(x.dataset.cand) : selected.delete(x.dataset.cand); paint(); }));
    }
    back.querySelectorAll('[data-scope]').forEach(tb => tb.addEventListener('click', () => { scope = tb.dataset.scope; back.querySelectorAll('[data-scope]').forEach(t => t.classList.toggle('active', t.dataset.scope === scope)); paintSel(); paint(); }));
    back.querySelector('[data-scope="otras"]').classList.add('active');
    // enviar comparativo por correo
    back.querySelector('#rp-send').addEventListener('click', () => {
      const rows = filas();
      const cuerpo = 'Comparativo de renovación · ' + p.numero + ' (' + p.ramo + '):\n\n' + rows.map(r => '• ' + (r.a.nombre || '') + ': ' + M(r.prima) + (r.actual ? ' (aseguradora actual)' : '') + (r.dPct ? ' · ' + (r.dPct > 0 ? '+' : '') + r.dPct + '% vs actual' : '')).join('\n') + '\n\nQuedamos atentos para asesorarte en la mejor opción.';
      if (Orbit.correo && cli.id) Orbit.correo.enviar({ para: cli.email || '', asunto: 'Comparativo de renovación · ' + p.numero, cuerpo, clienteId: cli.id, vinculo: { tipo: 'poliza', id: p.id, label: p.numero } });
      S().insert('actividades', { id: 'act' + Date.now() + Math.floor(Math.random() * 999), clienteId: cli.id, asesorId: p.asesorId, tipo: 'sistema', icon: '📧', fecha: Orbit.ui.today(), titulo: 'Comparativo de renovación preparado', detalle: rows.length + ' aseguradoras · ' + p.numero });
      Orbit.ui.toast('✓ Comparativo preparado para el cliente');
      close();
    });
    // registrar propuesta elegida → gestión de renovación en Ops + actividad
    back.querySelector('#rp-ok').addEventListener('click', () => {
      const rows = filas(); const win = rows.find(r => r.id === winner) || rows[0]; if (!win) return;
      if (Orbit.ciclo && Orbit.ciclo.crearGestion) {
        Orbit.ciclo.crearGestion({
          lista: 'Renovaciones / Modif.', tipo: 'Renovación', titulo: 'Renovación ' + p.numero + ' · ' + (win.a.nombre || ''),
          clienteId: cli.id, polizaId: p.id, asesorId: p.asesorId, aseguradoraId: win.id, ramo: p.ramo,
          prioridad: 'Alta', vence: p.vigenciaFin || '',
          nota: 'Propuesta elegida: ' + (win.a.nombre || '') + ' · prima estimada ' + M(win.prima) + (win.actual ? ' (renovación directa)' : ' (cambio de aseguradora)') + '. Comparadas ' + rows.length + ' aseguradoras.',
          checklist: [{ t: 'Comparativo presentado al cliente', done: true }, { t: 'Propuesta aceptada por el cliente', done: false }, { t: 'Emitir renovación', done: false }]
        });
      }
      S().insert('actividades', { id: 'act' + Date.now() + Math.floor(Math.random() * 999), clienteId: cli.id, asesorId: p.asesorId, tipo: 'sistema', icon: '📋', fecha: Orbit.ui.today(), titulo: 'Propuesta de renovación registrada', detalle: (win.a.nombre || '') + ' · ' + M(win.prima) + ' → Ops (Renovaciones / Modif.)' });
      if (Orbit.ciclo && Orbit.ciclo.notify) Orbit.ciclo.notify({ tipo: 'gestion', titulo: 'Renovación en gestión · ' + (win.a.nombre || ''), detalle: cli.nombre + ' · ' + p.numero, para: (q.asesor(p.asesorId) || {}).nombre, tel: cli.telefono, email: cli.email });
      Orbit.ui.toast('✓ Propuesta registrada en Ops (Renovaciones / Modif.)');
      close();
    });
    paintSel(); paint();
  }

  return { render, campana, solicitarPropuestas };
})();
