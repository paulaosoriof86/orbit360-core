/* ============================================================
   Orbit 360 · Renovaciones v1.201 — filtro de pólizas emitidas
   Conserva la póliza anterior y su historial, pero evita que vuelva
   a aparecer como pendiente cuando ya tiene `renovadaPor`.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
(function () {
  const mod = Orbit.modules.renovaciones;
  const client = Orbit.modules.cliente360;
  const A = Orbit.access;
  const U = Orbit.ui;
  const S = () => Orbit.store;
  if (!mod || !mod.render || !A || mod.__issuedFilterV1201) return;

  function norm(v) { return A.norm ? A.norm(v) : String(v || '').toLowerCase(); }
  function daysUntil(s) { if (!s) return null; const d = new Date(s + 'T00:00:00'), n = new Date(); n.setHours(0,0,0,0); return Math.ceil((d - n) / 86400000); }
  function active(p) { return p && ['vigente','porrenovar'].includes(norm(p.estado)) && !p.renovadaPor && norm(p.renovacionEstado) !== 'renovada'; }
  function policies(limit) {
    return A.filter('polizas', S().all('polizas') || [], 'renovaciones').filter(p => {
      if (!active(p)) return false;
      const d = daysUntil(p.vigenciaFin);
      return d != null && d <= (limit == null ? 90 : limit);
    }).sort((a,b) => String(a.vigenciaFin || '').localeCompare(String(b.vigenciaFin || '')));
  }
  function moneyMap(rows) {
    const out = {};
    rows.forEach(p => { const cur = p.moneda || 'SIN_MONEDA'; out[cur] = (out[cur] || 0) + (+((p.primaNeta != null) ? p.primaNeta : p.prima) || 0); });
    return out;
  }
  function moneyHtml(map) {
    const keys = Object.keys(map);
    return keys.map(k => `<span style="display:block;font-size:${keys.length > 1 ? '13px' : '21px'}">${U.esc(k)} ${Number(map[k]).toLocaleString('es-GT',{maximumFractionDigits:0})}</span>`).join('') || '0';
  }
  function modal(id, title, body) {
    let b = document.getElementById(id); if (b) b.remove();
    b = document.createElement('div'); b.id = id; b.className = 'drawer-back open'; b.style.cssText = 'display:grid;place-items:center;z-index:235';
    b.innerHTML = `<div class="card" style="width:min(720px,95vw);max-height:90vh;overflow:auto;padding:0"><div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between"><b style="font-family:var(--f-display)">${U.esc(title)}</b><button class="imp-x" data-close>✕</button></div><div style="padding:14px 18px">${body}</div><div style="padding:12px 18px;border-top:1px solid var(--line);text-align:right"><button class="btn ghost" data-close>Cerrar</button></div></div>`;
    document.body.appendChild(b); const close = () => b.remove(); b.querySelectorAll('[data-close]').forEach(x => x.onclick = close); b.addEventListener('click', e => { if (e.target === b) close(); }); return b;
  }
  function row(p) {
    const c = S().get('clientes', p.clienteId) || {};
    return `<div class="asg197-detail-row"><span><b>${U.esc(c.nombre || 'Cliente')} · ${U.esc(p.numero || 'Póliza')}</b><small>${U.esc(p.ramo || '')} · vence ${U.esc(p.vigenciaFin || '')}</small></span><button class="btn ghost sm" data-pol="${U.esc(p.id)}">Ver póliza</button></div>`;
  }
  function detail(title, rows) {
    const b = modal('renewal-issued-detail-v1201', title, rows.length ? rows.map(row).join('') : '<div class="empty">No hay pólizas para este indicador.</div>');
    b.querySelectorAll('[data-pol]').forEach(x => x.onclick = () => { b.remove(); Orbit.modules.cliente360.verPoliza(x.dataset.pol); });
  }
  function removeRenewedCards(host) {
    const renewed = new Set((S().all('polizas') || []).filter(p => p.renovadaPor || norm(p.renovacionEstado) === 'renovada').map(p => String(p.id)));
    host.querySelectorAll('[onclick*="verPoliza"]').forEach(el => {
      const match = String(el.getAttribute('onclick') || '').match(/verPoliza\(['"]([^'"]+)/);
      if (match && renewed.has(match[1])) {
        const card = el.parentElement;
        if (card && card.parentElement) card.remove();
      }
    });
  }
  function updateColumns(host, buckets) {
    const grid = Array.from(host.querySelectorAll('.page > div')).find(el => String(el.getAttribute('style') || '').includes('grid-template-columns'));
    if (!grid) return;
    Array.from(grid.children).forEach(col => {
      const title = (col.querySelector('b') || {}).textContent || '';
      let rows = [];
      if (/Vencidas/i.test(title)) rows = buckets.vencidas;
      else if (/quincena|15/i.test(title)) rows = buckets.d15;
      else if (/16.*45|Próximas/i.test(title)) rows = buckets.d45;
      else if (/46.*90|horizonte/i.test(title)) rows = buckets.d90;
      const badge = col.querySelector('.badge'); if (badge) badge.textContent = rows.length;
      const body = col.children[1];
      if (body && !rows.length) body.innerHTML = '<div class="muted" style="text-align:center;padding:24px 8px;font-size:12.5px">Sin pólizas en este tramo.</div>';
    });
  }
  function enhance(host) {
    if (!host) return;
    removeRenewedCards(host);
    const all = policies(90);
    const buckets = {
      vencidas: all.filter(p => daysUntil(p.vigenciaFin) < 0),
      d15: all.filter(p => { const d = daysUntil(p.vigenciaFin); return d >= 0 && d <= 15; }),
      d45: all.filter(p => { const d = daysUntil(p.vigenciaFin); return d > 15 && d <= 45; }),
      d90: all.filter(p => { const d = daysUntil(p.vigenciaFin); return d > 45 && d <= 90; })
    };
    const premium = moneyMap(all);
    const defs = [
      ['Vencidas', String(buckets.vencidas.length), 'Recuperar o cerrar gestión', () => detail('Pólizas vencidas', buckets.vencidas)],
      ['≤15 días', String(buckets.d15.length), 'Atención prioritaria', () => detail('Renovaciones ≤15 días', buckets.d15)],
      ['16–45 días', String(buckets.d45.length), 'Planificar gestión', () => detail('Renovaciones 16–45 días', buckets.d45)],
      ['Prima neta en gestión', moneyHtml(premium), 'Excluye pólizas ya renovadas; monedas separadas', () => modal('renewal-issued-money-v1201','Prima neta por moneda',Object.keys(premium).map(cur => `<div class="asg197-detail-row"><span><b>${U.esc(cur)}</b><small>${all.filter(p => p.moneda === cur).length} póliza(s)</small></span><span>${Number(premium[cur]).toLocaleString('es-GT')}</span></div>`).join(''))]
    ];
    host.querySelectorAll('.kpi-row .kpi').forEach((el, i) => {
      const d = defs[i]; if (!d) return;
      const l = el.querySelector('.k-label'), v = el.querySelector('.k-val'), f = el.querySelector('.k-foot');
      if (l) l.textContent = d[0]; if (v) v.innerHTML = d[1]; if (f) f.textContent = d[2];
      el.onclick = d[3]; el.classList.add('kpi-click');
    });
    updateColumns(host, buckets);
  }

  const originalRender = mod.render.bind(mod);
  mod.render = function (host) { const out = originalRender(host); setTimeout(() => enhance(host), 20); return out; };
  mod.__issuedFilterV1201 = { originalRender };

  if (client && typeof client.renovar === 'function' && !client.__issuedRenewalGuardV1201) {
    const originalRenew = client.renovar.bind(client);
    client.renovar = function (policyId) {
      const p = S().get('polizas', policyId);
      if (p && p.renovadaPor) {
        const next = S().get('polizas', p.renovadaPor);
        if (next) { U.toast('Esta póliza ya fue renovada. Abriendo la nueva póliza.'); return client.verPoliza(next.id); }
        return U.toast('Esta póliza ya tiene una renovación vinculada.');
      }
      return originalRenew(policyId);
    };
    client.__issuedRenewalGuardV1201 = { originalRenew };
  }
})();
