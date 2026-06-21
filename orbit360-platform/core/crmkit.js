/* ============================================================
   Orbit 360 · CRM Kit — piezas compartidas por las vistas globales
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.kit = (function () {
  const U = Orbit.ui, q = Orbit.q, S = () => Orbit.store;

  function head(crumb, title, sub, actionsHtml) {
    return `<div class="page-head">
      <div>
        <div class="crumb"><b>${crumb[0]}</b> / ${U.esc(crumb[1])}</div>
        <div class="page-title">${title}</div>
        ${sub ? `<div class="page-sub">${sub}</div>` : ''}
      </div>
      <div style="display:flex;gap:8px">${actionsHtml || ''}</div>
    </div>`;
  }
  /* Banda de módulo (header oscuro, plantilla personalizable).
     icon: emoji · title · sub (descriptor) · features:[...] · actions */
  function banner(o) {
    const feats = (o.features || []).map(f => `<span>${U.esc(f)}</span>`).join('<i>·</i>');
    return `<div class="mod-band">
      <div class="mb-left">
        <span class="mb-ico">${o.icon || '▮'}</span>
        <div class="mb-tt">
          <h2>${U.esc(o.title)}${o.sub ? ` <em>· ${U.esc(o.sub)}</em>` : ''}</h2>
          ${o.crumb ? `<div class="mb-crumb">${U.esc(o.crumb)}</div>` : ''}
        </div>
      </div>
      <div class="mb-right">
        ${feats ? `<div class="mb-feats">${feats}</div>` : ''}
        ${o.actions ? `<div class="mb-actions">${o.actions}</div>` : ''}
      </div>
    </div>`;
  }
  function kpis(items) {
    return `<div class="kpi-row" style="margin-bottom:16px">${items.map(it => `
      <div class="kpi"><div class="k-accent" style="background:${it.color || 'var(--red)'}"></div>
        <div class="k-label">${it.label}</div>
        <div class="k-val">${it.val}</div>
        <div class="k-foot ${it.footTone || 'muted'}">${it.foot || ''}</div></div>`).join('')}</div>`;
  }
  /** celda cliente con avatar + deep-link al 360 */
  function clienteCell(cliId) {
    const c = S().get('clientes', cliId); if (!c) return '—';
    return `<a style="display:flex;align-items:center;gap:10px;cursor:pointer" onclick="event.stopPropagation();location.hash='#/cliente360?c=${c.id}'">
      ${U.avatar(c.nombre, c.tipo === 'Empresa' ? '#1E2227' : '#C5162E', 'sm')}
      <span style="min-width:0"><span style="font-weight:600;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px">${U.esc(c.nombre)}</span>
      <span class="muted" style="font-size:11px">${c.tipo} · ${c.pais}</span></span></a>`;
  }
  function asesorCell(aseId) {
    const a = q.asesor(aseId); if (!a) return '—';
    return `<span style="display:flex;align-items:center;gap:7px"><span class="dot-s" style="background:${a.color}"></span>${U.esc(a.nombre)}</span>`;
  }
  function aseguradoraCell(asgId) {
    const a = q.aseguradora(asgId); if (!a) return '—';
    return `<span style="display:flex;align-items:center;gap:7px"><span class="dot-s" style="background:${a.color}"></span>${U.esc(a.nombre)}</span>`;
  }
  /** barra de filtros: defs=[{id,type:'search|select',ph,options:[{v,t}]}] -> html + wire(onChange) */
  function filterBar(defs, state) {
    const html = `<div style="display:flex;gap:10px;flex-wrap:wrap;padding:13px 14px;border-bottom:1px solid var(--line);align-items:center">
      ${defs.map(d => {
        if (d.type === 'search') return `<div class="tb-search" style="background:var(--surface);border-color:var(--line);color:var(--ink-3);min-width:220px"><span>🔍</span><input id="${d.id}" placeholder="${d.ph}" value="${U.esc(state[d.id] || '')}"></div>`;
        return `<select id="${d.id}" class="o-sel"><option value="">${d.ph}</option>${d.options.map(o => `<option value="${o.v}" ${state[d.id] === o.v ? 'selected' : ''}>${U.esc(o.t)}</option>`).join('')}</select>`;
      }).join('')}
      <span class="muted" id="fb-count" style="margin-left:auto;font-size:12.5px">${state.__count || ''}</span>
    </div>`;
    return html;
  }
  function wireFilters(defs, state, onChange) {
    defs.forEach(d => {
      const el = document.getElementById(d.id); if (!el) return;
      if (d.type === 'search') {
        el.addEventListener('input', e => { state[d.id] = e.target.value; onChange(d.id, true); });
      } else {
        el.addEventListener('change', e => { state[d.id] = e.target.value; onChange(d.id, false); });
      }
    });
  }
  function ramoOptions() {
    const set = [...new Set(S().all('polizas').map(p => p.ramo))].sort();
    return set.map(r => ({ v: r, t: r }));
  }
  function asesorOptions() { return S().all('asesores').map(a => ({ v: a.id, t: a.nombre })); }
  function aseguradoraOptions() { return S().all('aseguradoras').map(a => ({ v: a.id, t: a.nombre })); }

  function bannerFor(route, actions) {
    const t = (Orbit.MODULE_TITLES && Orbit.MODULE_TITLES[route]) || { icon: '▮', title: route, sub: '', features: [] };
    return banner({ icon: t.icon, title: t.title, sub: t.sub, crumb: t.crumb, features: t.features, actions: actions });
  }

  return { head, banner, bannerFor, kpis, clienteCell, asesorCell, aseguradoraCell, filterBar, wireFilters, ramoOptions, asesorOptions, aseguradoraOptions };
})();
