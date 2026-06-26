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
    return '<div class="kpi-row" style="margin-bottom:16px">' + items.map(function(it) {
      var tag = it.onclick ? 'button' : 'div';
      var btnAttr = it.onclick ? ' onclick="' + it.onclick + '" title="Ver detalle"' : '';
      return '<' + tag + btnAttr + ' class="kpi' + (it.onclick ? ' kpi-click' : '') + '">'
        + '<div class="k-accent" style="background:' + (it.color || 'var(--red)') + '"></div>'
        + '<div class="k-label">' + it.label + '</div>'
        + '<div class="k-val">' + it.val + '</div>'
        + '<div class="k-foot ' + (it.footTone || 'muted') + '">' + (it.foot || '') + '</div>'
        + '</' + tag + '>';
    }).join('') + '</div>';
  }
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

/* ---------- KPI con detalle (modal con desglose de registros) ---------- */
Orbit.kpi = function (preset, arg) {
  const U = Orbit.ui, S = Orbit.store, q = Orbit.q;
  const money = (n, m) => U.money(n || 0, m || 'GTQ');
  // presets: cada uno devuelve { titulo, cols, rows:[{cells, go}] }
  const P = {
    'polizas-vigentes': () => mk('Pólizas vigentes', S.where('polizas', p => p.estado === 'Vigente'), 'poliza'),
    'polizas-porrenovar': () => mk('Pólizas por renovar', S.where('polizas', p => p.estado === 'Por renovar'), 'poliza'),
    'polizas-todas': () => mk('Todas las pólizas', S.all('polizas'), 'poliza'),
    'cobros-pendientes': () => mk('Cobros pendientes', S.where('cobros', c => c.estado === 'Pendiente'), 'cobro'),
    'cobros-vencidos': () => mk('Cobros vencidos', S.where('cobros', c => c.estado === 'Vencido'), 'cobro'),
    'cobros-pagados': () => mk('Cobros aplicados', S.where('cobros', c => c.estado === 'Pagado'), 'cobro'),
    'renov-proximas': () => mk('Renovaciones próximas', (q.renovacionesProximas ? q.renovacionesProximas(30) : []), 'poliza'),
    'cancel-todas': () => mk('Cancelaciones', S.all('cancelaciones'), 'cancel'),
    'clientes-todos': () => mk('Clientes', S.all('clientes'), 'cliente'),
    'siniestros-todos': () => mk('Siniestros / reclamos', S.all('reclamos'), 'reclamo')
  };
  function mk(titulo, arr, tipo) {
    let cols, rows;
    if (tipo === 'poliza') {
      cols = ['Cliente', 'Póliza', 'Ramo', 'Prima', 'Estado'];
      rows = arr.map(p => ({ cells: [cliName(p.clienteId), p.numero || '—', p.ramo || '—', money(p.prima, p.moneda), badge(p.estado)], go: () => { location.hash = '#/cliente360?c=' + p.clienteId; } }));
    } else if (tipo === 'cobro') {
      cols = ['Cliente', 'Cuota', 'Monto', 'Vence', 'Estado'];
      rows = arr.map(c => ({ cells: [cliName(c.clienteId), c.cuota || '—', money(c.monto, c.moneda), U.fmtDate(c.vence), badge(c.estado)], go: () => { location.hash = '#/cliente360?c=' + c.clienteId; } }));
    } else if (tipo === 'cancel') {
      cols = ['Cliente', 'Motivo', 'Valor perdido', 'Fecha'];
      rows = arr.map(c => ({ cells: [cliName(c.clienteId), c.motivo || '—', money(c.valorPerdido, c.moneda), U.fmtDate(c.fecha)], go: () => { location.hash = '#/cliente360?c=' + c.clienteId; } }));
    } else if (tipo === 'reclamo') {
      cols = ['Cliente', 'N°', 'Tipo', 'Estado'];
      rows = arr.map(r => ({ cells: [cliName(r.clienteId), r.numero || '—', r.tipo || '—', badge(r.estado)], go: () => { location.hash = '#/cliente360?c=' + r.clienteId; } }));
    } else {
      cols = ['Cliente', 'Tipo', 'País', 'Identificación'];
      rows = arr.map(c => ({ cells: [U.esc(c.nombre), c.tipo || '—', c.pais || '—', c.identificacion || '—'], go: () => { location.hash = '#/cliente360?c=' + c.id; } }));
    }
    return { titulo, cols, rows };
  }
  function cliName(id) { const c = S.get('clientes', id); return c ? U.esc(c.nombre) : '—'; }
  function badge(e) { const map = { Vigente: 'ok', Pagado: 'ok', Pendiente: 'warn', Vencido: 'danger', Cancelada: 'danger', 'Por renovar': 'info' }; return `<span class="badge ${map[e] || 'neutral'}">${U.esc(e || '—')}</span>`; }
  const data = P[preset] ? P[preset]() : null;
  if (!data) return;
  let back = document.getElementById('kpi-modal'); if (back) back.remove();
  back = document.createElement('div'); back.id = 'kpi-modal'; back.className = 'drawer-back open';
  back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 96;
  back.innerHTML = `<div class="card" style="width:min(760px,96vw);max-height:88vh;overflow:auto;padding:0">
    <div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:16px">${data.titulo} · ${data.rows.length}</b><button class="imp-x" id="kpm-x">✕</button></div>
    <div style="overflow-x:auto"><table class="tbl"><thead><tr>${data.cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
      <tbody>${data.rows.length ? data.rows.map((r, i) => `<tr class="clickable" data-r="${i}">${r.cells.map(c => `<td>${c}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${data.cols.length}" class="muted" style="text-align:center;padding:24px">Sin registros.</td></tr>`}</tbody></table></div>
  </div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelector('#kpm-x').onclick = close;
  back.querySelectorAll('[data-r]').forEach(tr => tr.onclick = () => { const r = data.rows[+tr.dataset.r]; close(); if (r && r.go) r.go(); });
};
