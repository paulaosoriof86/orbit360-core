/* ============================================================
   Orbit 360 · CRM · Renovaciones (vista global)  — NÚCLEO
   Pipeline de pólizas por vencer, agrupadas por urgencia.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.renovaciones = (function () {
  const U = Orbit.ui, q = Orbit.q, K = Orbit.kit, S = () => Orbit.store;
  const REQUIRED_DATA = ['polizas', 'clientes', 'aseguradoras'];
  function ensureDataCollections() {
    try { const store=S(); if(store&&typeof store._ensureCollections==='function') store._ensureCollections(REQUIRED_DATA); } catch (_) {}
  }
  function renewalDataReadiness() {
    const store=S();
    if(!store || store.__productReadOnlyP0!==true || typeof store._productStatus!=='function') return 'ready';
    const ps=store._productStatus()||{},confirmed=[].concat(ps.serverConfirmedCollections||[]),denied=[].concat(ps.deniedCollections||[]);
    if(REQUIRED_DATA.some(name=>denied.includes(name))) return 'unavailable';
    return REQUIRED_DATA.every(name=>confirmed.includes(name)) ? 'ready' : 'pending';
  }
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
  const policyState = p => String(p&&p.estado||'').trim().toLowerCase().replace(/\s+/g,'');
  const terminalRenewalOutcome = p => {
    if(!p) return true;
    if(p.renovadaPor) return true;
    const state=String(p.renovacionEstado||'').trim().toLowerCase().replace(/[\s_-]+/g,'');
    return ['renovada','norenovada','rechazada','cerrada','cancelada'].includes(state);
  };
  const renewalActionable = p => {
    if(!p || renewabilityState(p)!=='YES' || !selectedCountry(p) || terminalRenewalOutcome(p)) return false;
    const d=U.daysFromNow(p.vigenciaFin),state=policyState(p);
    if(d==null) return false;
    return d<0 ? ['vigente','porrenovar','vencida'].includes(state) : ['vigente','porrenovar'].includes(state);
  };
  const renewalPendingValidation = p => {
    if(!p || renewabilityState(p)!=='UNKNOWN' || !selectedCountry(p) || terminalRenewalOutcome(p)) return false;
    const state=policyState(p),d=U.daysFromNow(p.vigenciaFin);
    return d!=null && d<=90 && ['vigente','porrenovar'].includes(state);
  };

  function buckets() {
    const cols = [
      { key: 'vencidas', label: 'Vencidas', tone: 'danger', test: d => d < 0 },
      { key: 'd15', label: 'Esta quincena (≤15 d)', tone: 'danger', test: d => d >= 0 && d <= 15 },
      { key: 'd45', label: 'Próximas (16–45 d)', tone: 'warn', test: d => d > 15 && d <= 45 },
      { key: 'd90', label: 'En el horizonte (46–90 d)', tone: 'info', test: d => d > 45 && d <= 90 }
    ];
    const pols = S().where('polizas', renewalActionable);
    cols.forEach(c => c.items = []);
    pols.forEach(p => {
      const d = U.daysFromNow(p.vigenciaFin);
      if (d == null || d > 90) return;
      const col = cols.find(c => c.test(d)); if (col) col.items.push({ p, d });
    });
    cols.forEach(c => c.items.sort((a, b) => a.d - b.d));
    return cols;
  }

  function premiumValue(p){const a=Number(p&&p.primaTotal);if(Number.isFinite(a)&&a>0)return a;const b=Number(p&&p.prima);return Number.isFinite(b)&&b>0?b:null;}

  function render(host) {
    ensureDataCollections();
    const readiness=renewalDataReadiness();
    if(readiness!=='ready'){
      host.innerHTML=`<div class="page" data-renewals-loading="${readiness}">${K.bannerFor('renovaciones','')}<div class="card pad"><b>${readiness==='unavailable'?'No fue posible cargar la cartera de renovaciones.':'Cargando cartera de renovaciones…'}</b><div class="muted" style="margin-top:5px">${readiness==='unavailable'?'La fuente operativa requerida no está disponible para este rol.':'Estamos preparando pólizas, clientes y aseguradoras antes de mostrar resultados.'}</div></div></div>`;
      return;
    }
    const cols = buckets();
    const pendingValidation=S().where('polizas', renewalPendingValidation);
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
      <div class="cfg-note" data-renewability-pending-count="${pendingValidation.length}" data-renewability-review-workflow="1" style="margin:0 0 14px"><b>Renovabilidad pendiente de revisión/conciliación: ${pendingValidation.length}</b><div class="muted" style="margin-top:5px">Estas pólizas no entran al pipeline hasta confirmar su condición. <b>Revisar y clasificar</b> abre directamente Renovabilidad en la póliza exacta. Marca <b>Renovable</b> o <b>No renovable</b> solo cuando la fuente lo respalde; si no hay evidencia suficiente, conserva <b>Pendiente de validar</b>.</div>${pendingValidation.slice(0,12).map(p=>`<button class="btn ghost sm" data-renewability-review="${U.esc(p.id)}" style="margin:7px 4px 0 0" onclick="Orbit.modules.cliente360.editarPoliza('${p.id}','renovabilidad')">Revisar y clasificar ${U.esc(p.numero||p.id)}</button>`).join('')}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;align-items:start">
        ${cols.map(c => `<div class="card" data-renewal-bucket="${c.key}" data-renewal-bucket-count="${c.items.length}" style="overflow:hidden">
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
                    <span class="mono" style="font-size:11px;font-weight:600">${premiumValue(p)==null?'<span class="badge warn">Prima pendiente de fuente</span>':U.moneyShort(premiumValue(p),p.moneda)}</span>
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
