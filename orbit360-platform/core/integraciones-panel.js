/* Orbit 360 · Panel diagnóstico de integraciones */
window.Orbit = window.Orbit || {};
Orbit.integracionesPanel = (function () {
  function esc(x) { try { return Orbit.ui.esc(String(x == null ? '' : x)); } catch (e) { return String(x == null ? '' : x).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); } }
  function isLabMode() {
    const h = String(location.hostname || '');
    const qs = new URLSearchParams(location.search || '');
    return h === 'localhost' || h === '127.0.0.1' || qs.get('orbitBackend') === 'firestore-lab' || qs.has('smoke');
  }
  function tone(estado) {
    return estado === 'confirmado' ? 'ok' : estado === 'enviado' || estado === 'pendiente' ? 'info' : estado === 'error' ? 'danger' : estado === 'pendiente_backend' || estado === 'pendiente_configuracion' ? 'warn' : 'neutral';
  }
  function badge(estado) { return '<span class="badge ' + tone(estado) + '">' + esc(estado || 'sin_estado') + '</span>'; }
  function open(filter) {
    filter = filter || {};
    let back = document.getElementById('int-panel'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'int-panel'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 99;
    document.body.appendChild(back);
    render(back, filter);
  }
  function render(back, filter) {
    const diag = (Orbit.integraciones && Orbit.integraciones.diagnostico) ? Orbit.integraciones.diagnostico(Object.assign({ limit: 50 }, filter || {})) : { status: {}, resumen: {}, eventos: [] };
    const r = diag.resumen || {}, s = diag.status || {}, eventos = diag.eventos || [];
    const estados = r.byEstado || {};
    const lab = isLabMode();
    back.innerHTML = `<div class="card" style="width:min(980px,96vw);max-height:92vh;overflow:auto;padding:0">
      <div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;gap:12px">
        <div><b style="font-family:var(--f-display);font-size:17px">🔌 Eventos de integración</b><div class="muted" style="font-size:12px">Diagnóstico por tenant · demo/LAB seguro</div></div>
        <button class="imp-x" id="intp-x">✕</button>
      </div>
      <div style="padding:18px 20px;display:grid;gap:14px">
        <div class="kpi-grid">
          ${kpi('Eventos', s.eventos || 0, 'Registrados')}
          ${kpi('Pendientes', s.pendientes || 0, 'Por configurar/enviar')}
          ${kpi('Errores', s.errores || 0, 'Revisar')}
          ${kpi('Pend. config', estados.pendiente_configuracion || 0, 'Sin conexión real')}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${sel('modulo', ['','marketing','general'], filter.modulo)}
          ${sel('proveedor', ['','make','metricool','canva','google_sheets'], filter.proveedor)}
          ${sel('estado', ['','pendiente_configuracion','pendiente_backend','pendiente','enviado','confirmado','error'], filter.estado)}
          <button class="btn ghost sm" id="intp-clear">Limpiar filtros</button>
        </div>
        <div class="card" style="overflow:hidden;padding:0"><table class="tbl">
          <thead><tr><th>Fecha</th><th>Evento</th><th>Módulo</th><th>Proveedor</th><th>Estado</th><th>Entidad</th>${lab ? '<th>LAB</th>' : ''}</tr></thead>
          <tbody>${eventos.map(ev => `<tr>
            <td class="muted" style="font-size:12px">${esc((ev.createdAt || '').replace('T',' ').slice(0,16))}</td>
            <td><b>${esc(ev.evento)}</b>${ev.error ? '<div class="muted" style="font-size:12px;color:var(--danger)">' + esc(ev.error) + '</div>' : ''}</td>
            <td>${esc(ev.modulo || '')}</td><td>${esc(ev.proveedor || '')}</td><td>${badge(ev.estado)}</td>
            <td class="muted" style="font-size:12px">${esc(ev.entidad || '')}${ev.entidadId ? ' · ' + esc(ev.entidadId) : ''}</td>
            ${lab ? '<td><button class="btn ghost sm" data-lab-cycle="' + esc(ev.id) + '">🧪 Simular</button></td>' : ''}
          </tr>`).join('') || '<tr><td colspan="7" class="muted">Sin eventos todavía.</td></tr>'}</tbody>
        </table></div>
        <div class="cfg-note">LAB/demo registra trazabilidad sin enviar a proveedores reales. En producción no debe mostrarse como conexión activa.</div>
      </div>
    </div>`;
    back.querySelector('#intp-x').onclick = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) back.remove(); });
    back.querySelector('#intp-clear').onclick = () => render(back, {});
    back.querySelectorAll('[data-filter]').forEach(el => el.addEventListener('change', () => {
      const f = {};
      back.querySelectorAll('[data-filter]').forEach(x => { if (x.value) f[x.dataset.filter] = x.value; });
      render(back, f);
    }));
    back.querySelectorAll('[data-lab-cycle]').forEach(btn => btn.addEventListener('click', () => {
      btn.textContent = 'Simulando…'; btn.disabled = true;
      if (Orbit.integraciones && Orbit.integraciones.labMock) Orbit.integraciones.labMock('ciclo', btn.dataset.labCycle, { forzar: true });
      setTimeout(() => render(back, filter || {}), 650);
    }));
  }
  function kpi(label, val, foot) { return `<div class="kpi"><div class="kpi-l">${esc(label)}</div><div class="kpi-v">${esc(val)}</div><div class="kpi-f">${esc(foot)}</div></div>`; }
  function sel(name, opts, value) { return `<label class="ce-l" style="min-width:170px">${esc(name)}<select class="o-sel" data-filter="${esc(name)}">${opts.map(o => `<option value="${esc(o)}" ${String(value||'')===String(o)?'selected':''}>${esc(o || 'Todos')}</option>`).join('')}</select></label>`; }
  return { open };
})();
