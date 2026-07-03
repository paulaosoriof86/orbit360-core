/* ============================================================
   Orbit 360 · Panel diagnostico integraciones
   UI reutilizable para ver eventos de integracion sin activar APIs reales.
   No llama webhooks, no guarda secretos, solo lee Orbit.integraciones.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.integracionesPanel = (function () {
  function esc(s) {
    try { if (Orbit.ui && Orbit.ui.esc) return Orbit.ui.esc(s == null ? '' : String(s)); } catch (e) {}
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]; });
  }
  function badgeTone(estado) {
    if (estado === 'confirmado' || estado === 'enviado') return 'ok';
    if (estado === 'error') return 'danger';
    if (estado === 'pendiente_configuracion') return 'warn';
    return 'info';
  }
  function open(filter) {
    filter = filter || {};
    if (!Orbit.integraciones || !Orbit.integraciones.diagnostico) {
      try { Orbit.ui.toast('Diagnóstico de integraciones no disponible.'); } catch (e) {}
      return null;
    }
    let back = document.getElementById('int-diag');
    if (back) back.remove();
    back = document.createElement('div');
    back.id = 'int-diag';
    back.className = 'drawer-back open';
    back.style.display = 'grid';
    back.style.placeItems = 'center';
    back.style.zIndex = 98;
    document.body.appendChild(back);
    const state = {
      modulo: filter.modulo || '',
      proveedor: filter.proveedor || '',
      evento: filter.evento || '',
      estado: filter.estado || '',
      limit: filter.limit || 50
    };
    function paint() {
      const diag = Orbit.integraciones.diagnostico(state);
      const st = diag.status || {};
      const rows = diag.eventos || [];
      const resumen = diag.resumen || {};
      const byEstado = resumen.byEstado || {};
      back.innerHTML = '<div class="card" style="width:min(980px,96vw);max-height:92vh;overflow:auto;padding:0">'
        + '<div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">'
        + '<div><b style="font-family:var(--f-display);font-size:17px">🔌 Eventos de integración</b><div class="muted" style="font-size:12px;margin-top:3px">Trazabilidad demo/LAB. No envía APIs externas ni webhooks reales.</div></div>'
        + '<button class="imp-x" id="int-x">✕</button></div>'
        + '<div style="padding:16px 20px;display:grid;gap:14px">'
        + '<div style="display:grid;grid-template-columns:repeat(4,minmax(130px,1fr));gap:10px">'
        + kpi('Total eventos', st.eventos || 0, 'var(--red)', 'registrados')
        + kpi('Pendientes', st.pendientes || 0, 'var(--warn)', 'por configurar/enviar')
        + kpi('Errores', st.errores || 0, 'var(--danger)', 'requieren revisión')
        + kpi('Configuración', byEstado.pendiente_configuracion || 0, 'var(--info)', 'integraciones pendientes')
        + '</div>'
        + '<div class="card pad" style="box-shadow:none;background:var(--bg-soft)">'
        + '<div style="display:grid;grid-template-columns:repeat(5,minmax(120px,1fr));gap:8px;align-items:end">'
        + select('Módulo', 'int-mod', state.modulo, ['', 'marketing', 'general'])
        + select('Proveedor', 'int-prov', state.proveedor, ['', 'make', 'metricool', 'canva', 'google_sheets', 'mailchimp', 'green_api'])
        + select('Estado', 'int-est', state.estado, ['', 'pendiente_configuracion', 'pendiente', 'enviado', 'confirmado', 'error'])
        + '<label class="ce-l">Evento<input id="int-ev" class="o-sel" value="' + esc(state.evento) + '" placeholder="marketing_..."></label>'
        + '<button class="btn primary" id="int-apply">Aplicar filtros</button>'
        + '</div></div>'
        + '<div class="card" style="overflow:hidden;box-shadow:none">'
        + '<div style="padding:11px 14px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:14px">Últimos eventos</b><span class="muted" style="font-size:12px">' + rows.length + ' visibles</span></div>'
        + '<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Fecha</th><th>Módulo</th><th>Evento</th><th>Proveedor</th><th>Estado</th><th>Entidad</th><th>Error</th></tr></thead><tbody>'
        + (rows.length ? rows.map(row).join('') : '<tr><td colspan="7" class="muted" style="text-align:center;padding:22px">Sin eventos con estos filtros. En Marketing, usa Crear pieza, Programar o Importar calendario.</td></tr>')
        + '</tbody></table></div></div>'
        + '<div class="cfg-note">Este panel es diagnóstico seguro. Para envíos reales falta configurar backend/Make por tenant.</div>'
        + '</div></div>';
      back.querySelector('#int-x').addEventListener('click', function () { back.remove(); });
      back.querySelector('#int-apply').addEventListener('click', function () {
        state.modulo = back.querySelector('#int-mod').value;
        state.proveedor = back.querySelector('#int-prov').value;
        state.estado = back.querySelector('#int-est').value;
        state.evento = back.querySelector('#int-ev').value.trim();
        paint();
      });
    }
    function kpi(label, val, color, foot) {
      return '<div class="cx-kpi"><span>' + esc(label) + '</span><b style="color:' + color + '">' + esc(val) + '</b><small>' + esc(foot) + '</small></div>';
    }
    function select(label, id, value, opts) {
      return '<label class="ce-l">' + esc(label) + '<select id="' + id + '" class="o-sel">' + opts.map(function (o) { return '<option value="' + esc(o) + '" ' + (o === value ? 'selected' : '') + '>' + esc(o || 'Todos') + '</option>'; }).join('') + '</select></label>';
    }
    function row(r) {
      return '<tr>'
        + '<td class="mono" style="font-size:11px">' + esc((r.createdAt || '').slice(0, 16).replace('T', ' ')) + '</td>'
        + '<td>' + esc(r.modulo || '') + '</td>'
        + '<td style="font-size:12px">' + esc(r.evento || '') + '</td>'
        + '<td><span class="badge info" style="font-size:10px">' + esc(r.proveedor || '') + '</span></td>'
        + '<td><span class="badge ' + badgeTone(r.estado) + '" style="font-size:10px">' + esc(r.estado || '') + '</span></td>'
        + '<td style="font-size:12px">' + esc([r.entidad, r.entidadId].filter(Boolean).join(' · ')) + '</td>'
        + '<td style="font-size:11.5px;color:var(--danger)">' + esc(r.error || '') + '</td>'
        + '</tr>';
    }
    back.addEventListener('click', function (e) { if (e.target === back) back.remove(); });
    paint();
    return back;
  }
  return { open: open };
})();
