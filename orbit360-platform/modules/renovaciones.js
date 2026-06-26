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
        { label: 'Prima en juego', val: U.moneyShort(totalPrima, 'GTQ'), color: 'var(--ok)', foot: 'a 90 días', onclick: "location.hash='#/renovaciones'" }
      ])}
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;align-items:start">
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
                <a href="https://wa.me/${wa}?text=${waTxt}" target="_blank" rel="noopener" class="reno-wa" onclick="event.stopPropagation()">💬 Enviar WhatsApp</a>
              </div>`;
            }).join('') || `<div class="muted" style="text-align:center;padding:24px 8px;font-size:12.5px">Sin pólizas en este tramo.</div>`}
          </div>
        </div>`).join('')}
      </div></div>`;
  }
  /* ---- Campaña de renovación por LOTE ---- */
  function campana() {
    const arr = q.renovacionesProximas(60).filter(p => { const c = S().get('clientes', p.clienteId); return !Orbit.pais || Orbit.pais === 'TODOS' || (c && c.pais === Orbit.pais); }).sort((a, b) => (a.vigenciaFin || '').localeCompare(b.vigenciaFin || ''));
    const incl = new Set(arr.map(p => p.id));
    let back = document.getElementById('ren-lote'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'ren-lote'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 96;
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
      <div class="cfg-note" style="margin:14px 16px 0">Selecciona las pólizas a notificar. Se envía <b>WhatsApp + correo</b> con propuesta de renovación generada por IA y queda en el <b>historial de cada cliente</b>.</div>
      <div id="rl-body" style="padding:12px 16px;overflow:auto;flex:1;display:grid;gap:7px"></div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><span class="muted" id="rl-n"></span><div style="display:flex;gap:8px"><button class="btn ghost" id="rl-cancel">Cancelar</button><button class="btn primary" id="rl-ok">📲 Enviar campaña</button></div></div>
    </div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#rl-x').addEventListener('click', close);
    back.querySelector('#rl-cancel').addEventListener('click', close);
    back.querySelector('#rl-ok').addEventListener('click', () => {
      const sel = arr.filter(p => incl.has(p.id));
      sel.forEach(p => {
        const cli = S().get('clientes', p.clienteId);
        const msg = Orbit.ia ? Orbit.ia.redactar('renovacion', { nombre: cli ? cli.nombre.split(' ')[0] : '', poliza: p.numero, ramo: p.ramo, vence: U.fmtDate(p.vigenciaFin) }) : 'Renovación próxima';
        S().insert('actividades', { id: 'act' + Date.now() + Math.floor(Math.random() * 999), clienteId: p.clienteId, asesorId: p.asesorId, tipo: 'sistema', icon: '📤', fecha: '2026-06-24', titulo: 'Campaña de renovación enviada', detalle: 'WhatsApp + correo · ' + p.numero });
        if (Orbit.correo && cli) Orbit.correo.enviar({ para: cli.email || '', asunto: 'Renovación de tu póliza ' + p.numero, cuerpo: msg, clienteId: p.clienteId, vinculo: { tipo: 'poliza', id: p.id, label: p.numero } });
      });
      close();
      const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = '✓ ' + sel.length + ' propuestas de renovación enviadas'; document.body.appendChild(t); setTimeout(() => t.remove(), 2800);
    });
    paint();
  }

  return { render, campana };
})();
