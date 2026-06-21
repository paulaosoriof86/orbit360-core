/* ============================================================
   Orbit 360 · Calidad de datos  — BETA
   Reporte de clientes con información incompleta y campaña de
   actualización. Prioridad: teléfono › dirección › resto.
   Foco en clientes con PÓLIZA VIGENTE (históricos que migran).
   Notificar por WhatsApp (si tiene tel) o correo (si tiene email).
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.calidad = (function () {
  const U = Orbit.ui, q = Orbit.q, K = Orbit.kit, S = () => Orbit.store;
  let st = { ffalta: '', soloVig: true };

  // qué falta en un cliente, en orden de prioridad
  function faltantes(c) {
    const f = [];
    if (!c.telefono) f.push({ k: 'telefono', label: 'Teléfono', pri: 1 });
    if (!c.direccion) f.push({ k: 'direccion', label: 'Dirección', pri: 2 });
    if (!c.email) f.push({ k: 'email', label: 'Correo', pri: 3 });
    if (c.tipo === 'Persona' && !c.fechaNac) f.push({ k: 'fechaNac', label: 'Fecha nac.', pri: 4 });
    if (c.tipo === 'Persona' && !c.sexo) f.push({ k: 'sexo', label: 'Sexo', pri: 5 });
    return f;
  }
  function tieneVigente(cid) { return q.polizasDe(cid).some(p => p.estado === 'Vigente' || p.estado === 'Por renovar'); }

  function render(host) {
    const all = S().all('clientes').map(c => ({ c, f: faltantes(c), vig: tieneVigente(c.id) }))
      .filter(x => x.f.length > 0);
    const conVig = all.filter(x => x.vig);
    const rows = all.filter(x => (!st.soloVig || x.vig) && (!st.ffalta || x.f.some(f => f.k === st.ffalta)))
      .sort((a, b) => (b.vig - a.vig) || (Math.min(...a.f.map(f => f.pri)) - Math.min(...b.f.map(f => f.pri))));
    const sinTel = all.filter(x => x.f.some(f => f.k === 'telefono')).length;

    host.innerHTML = `<div class="page">
      ${K.bannerFor('calidad', `<button class="btn primary" onclick="Orbit.modules.calidad.campana()">📣 Campaña de actualización</button>`)}
      ${K.kpis([
        { label: 'Expedientes incompletos', val: all.length, color: 'var(--warn)', foot: 'de ' + S().all('clientes').length },
        { label: 'Con póliza vigente', val: conVig.length, color: 'var(--danger)', foot: 'prioridad alta', footTone: 'down' },
        { label: 'Sin teléfono', val: sinTel, color: 'var(--red)', foot: 'prioridad 1' },
        { label: 'Completitud', val: Math.round((1 - all.length / S().all('clientes').length) * 100) + '%', color: 'var(--ok)', foot: 'cartera', footTone: 'up' }
      ])}
      <div class="card" style="overflow:hidden">
        <div style="display:flex;gap:10px;flex-wrap:wrap;padding:13px 14px;border-bottom:1px solid var(--line);align-items:center">
          <label style="display:flex;align-items:center;gap:7px;font-size:13px;font-weight:600;cursor:pointer"><input type="checkbox" id="q-vig" ${st.soloVig ? 'checked' : ''} style="accent-color:var(--red)"> Solo con póliza vigente</label>
          <select id="q-falta" class="o-sel"><option value="">Falta cualquier dato</option>${[['telefono', 'Sin teléfono'], ['direccion', 'Sin dirección'], ['email', 'Sin correo'], ['fechaNac', 'Sin fecha nac.']].map(o => `<option value="${o[0]}" ${st.ffalta === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>
          <span class="muted" style="margin-left:auto;font-size:12.5px">${rows.length} clientes</span>
        </div>
        <div style="overflow-x:auto"><table class="tbl">
          <thead><tr><th>Cliente</th><th>Asesor</th><th>Faltan</th><th>Vigente</th><th>Canal de contacto</th><th></th></tr></thead>
          <tbody>${rows.map(({ c, f, vig }) => {
            const wa = (c.telefono || '').replace(/[^0-9]/g, '');
            const canal = c.telefono ? '<span class="badge ok">💬 WhatsApp</span>' : c.email ? '<span class="badge info">✉ Correo</span>' : '<span class="badge danger">Sin contacto</span>';
            const faltaTxt = f.sort((a, b) => a.pri - b.pri).map(x => `<span class="badge ${x.pri === 1 ? 'danger' : x.pri === 2 ? 'warn' : 'neutral'}">${x.label}</span>`).join(' ');
            const accion = c.telefono
              ? `<a class="btn ghost sm" style="color:#1f8a4c" href="https://wa.me/${wa}?text=${encodeURIComponent('Hola ' + c.nombre.split(' ')[0] + ', para mantener tu póliza al día necesitamos actualizar algunos datos. ¿Nos ayudás?')}" target="_blank" rel="noopener" onclick="event.stopPropagation()">💬 WA</a>`
              : c.email ? `<a class="btn ghost sm" href="mailto:${U.esc(c.email)}?subject=Actualización de datos" onclick="event.stopPropagation()">✉ Correo</a>`
              : `<button class="btn ghost sm" disabled style="opacity:.5">Sin canal</button>`;
            return `<tr class="clickable" onclick="location.hash='#/cliente360?c=${c.id}&t=resumen'">
              <td>${K.clienteCell(c.id)}</td>
              <td>${K.asesorCell(c.asesorId)}</td>
              <td>${faltaTxt}</td>
              <td>${vig ? '<span class="badge ok">Sí</span>' : '<span class="muted">—</span>'}</td>
              <td>${canal}</td>
              <td style="text-align:right">${accion}</td>
            </tr>`;
          }).join('') || `<tr><td colspan="6" class="muted" style="text-align:center;padding:30px">🎉 Todos los expedientes están completos.</td></tr>`}</tbody>
        </table></div>
      </div>
      <div class="cfg-note" style="margin-top:14px">📌 Prioridad de actualización: <b>1) Teléfono</b> (habilita WhatsApp) › <b>2) Dirección</b> › <b>3) Correo y demográficos</b>. Los clientes con póliza vigente van primero.</div>
    </div>`;

    document.getElementById('q-vig').addEventListener('change', e => { st.soloVig = e.target.checked; render(host); });
    document.getElementById('q-falta').addEventListener('change', e => { st.ffalta = e.target.value; render(host); });
  }

  function campana() {
    const all = S().all('clientes').map(c => ({ c, f: faltantes(c) })).filter(x => x.f.length && tieneVigente(x.c.id));
    const wa = all.filter(x => x.c.telefono).length, mail = all.filter(x => !x.c.telefono && x.c.email).length;
    alert('Campaña de actualización (demo):\n\n• ' + wa + ' por WhatsApp (tienen teléfono)\n• ' + mail + ' por correo (sin WhatsApp, con email)\n• ' + (all.length - wa - mail) + ' sin canal — requieren gestión manual.\n\nUsa la plantilla "Actualización de datos" con los campos pendientes de cada cliente.');
  }
  return { render, campana };
})();
