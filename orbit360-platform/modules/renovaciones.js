/* ============================================================
   Orbit 360 · CRM · Renovaciones (vista global)  — NÚCLEO
   Pipeline de pólizas por vencer, agrupadas por urgencia.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.renovaciones = (function () {
  const U = Orbit.ui, q = Orbit.q, K = Orbit.kit, S = () => Orbit.store;
  const countryCode = v => String(v == null ? '' : v).trim().toUpperCase();
  const policyCountry = p => { const cli=p&&p.clienteId?S().get('clientes',p.clienteId):null; return countryCode(p&&p.pais || cli&&cli.pais); };
  const selectedCountry = p => { const wanted=countryCode(Orbit.pais); return !wanted || wanted==='TODOS' || policyCountry(p)===wanted; };
  const renewabilityState = p => {
    if(!p || !Object.prototype.hasOwnProperty.call(p,'renovable') || p.renovable==null || String(p.renovable).trim()==='') return 'UNKNOWN';
    const v=String(p.renovable).trim().toLowerCase();
    if(p.renovable===true || ['true','si','sí','renovable'].includes(v)) return 'YES';
    if(p.renovable===false || ['false','no','no renovable'].includes(v)) return 'NO';
    return 'UNKNOWN';
  };
  const esRenovable = p => p && renewabilityState(p)==='YES' && selectedCountry(p) && (p.estado === 'Vigente' || p.estado === 'Por renovar') && !p.renovadaPor && String(p.renovacionEstado || '').toLowerCase() !== 'renovada';

  function buckets() {
    const cols = [
      { key: 'vencidas', label: 'Vencidas', tone: 'danger', test: d => d < 0 },
      { key: 'd15', label: 'Esta quincena (≤15 d)', tone: 'danger', test: d => d >= 0 && d <= 15 },
      { key: 'd45', label: 'Próximas (16–45 d)', tone: 'warn', test: d => d > 15 && d <= 45 },
      { key: 'd90', label: 'En el horizonte (46–90 d)', tone: 'info', test: d => d > 45 && d <= 90 }
    ];
    const pols = S().where('polizas', esRenovable);
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
              return `<div data-renewal-policy="${U.esc(p.id)}" data-renewal-country="${U.esc(policyCountry(p))}" style="border:1px solid var(--line);border-radius:var(--r-sm);padding:10px 11px;background:var(--card)">
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
  /* Acciones operativas: owner canónico en renewals-v1200-operational-bridge.js. */
  return { render };
})();
