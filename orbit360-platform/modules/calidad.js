/* ============================================================
   Orbit 360 · Calidad de datos  — BETA
   Reporte de clientes con información incompleta y campaña de
   actualización. Prioridad: teléfono › dirección › resto.
   Foco en clientes con PÓLIZA VIGENTE (históricos que migran).
   Preparar contacto por WhatsApp Web o correo; entrega real depende
   de integración/canal conectado.
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
              ? `<a class="btn ghost sm" style="color:#1f8a4c" href="https://wa.me/${wa}?text=${encodeURIComponent('Hola ' + c.nombre.split(' ')[0] + ', para mantener tu póliza al día necesitamos actualizar algunos datos. ¿Nos ayudás?')}" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="Abre WhatsApp Web con mensaje preparado; la entrega no se confirma desde Orbit.">💬 Preparar WA</a>`
              : c.email ? `<button class="btn ghost sm" onclick="event.stopPropagation();window.__orbitCompose={para:'${U.esc(c.email)}',asunto:'Actualización de datos · ${U.esc(c.nombre)}',cuerpo:'',clienteId:'${c.id}',vinculo:{tipo:'cliente',id:'${c.id}',label:'${U.esc(c.nombre)}'}};location.hash='#/correo'" title="Preparar correo; envío real depende de cuenta conectada.">✉ Preparar correo</button>`
              : `<button class="btn ghost sm" disabled style="opacity:.5">Sin canal</button>`;
            return `<tr class="clickable" onclick="location.hash='#/cliente360?c=${c.id}&t=resumen'">
              <td>${K.clienteCell(c.id)}</td>
              <td>${K.asesorCell(c.asesorId)}</td>
              <td>${faltaTxt}</td>
              <td>${vig ? '<span class="badge ok">Sí</span>' : '<span class="muted">—</span>'}</td>
              <td>${canal}</td>
              <td style="text-align:right;white-space:nowrap"><button class="btn primary sm" onclick="event.stopPropagation();Orbit.modules.calidad.editarInline('${c.id}')" title="Completar datos faltantes">✏ Completar</button> ${accion}</td>
            </tr>`;
          }).join('') || `<tr><td colspan="6" class="muted" style="text-align:center;padding:30px">🎉 Todos los expedientes están completos.</td></tr>`}</tbody>
        </table></div>
      </div>
      <div class="cfg-note" style="margin-top:14px">📌 Prioridad de actualización: <b>1) Teléfono</b> (habilita WhatsApp) › <b>2) Dirección</b> › <b>3) Correo y demográficos</b>. Los clientes con póliza vigente van primero.</div>
    </div>`;

    document.getElementById('q-vig').addEventListener('change', e => { st.soloVig = e.target.checked; render(host); });
    document.getElementById('q-falta').addEventListener('change', e => { st.ffalta = e.target.value; render(host); });
  }

  function editarInline(cid) {
    const c = S().get('clientes', cid); if (!c) return;
    const f = faltantes(c);
    if (!f.length) { const h = document.getElementById('host'); if (h) render(h); return; }
    const field = (x) => {
      if (x.k === 'sexo') return `<label class="ce-l">${x.label}<select id="qi-${x.k}" class="o-sel"><option value="">—</option><option>Femenino</option><option>Masculino</option><option>Otro</option></select></label>`;
      if (x.k === 'fechaNac') return `<label class="ce-l">${x.label}<input id="qi-${x.k}" class="o-sel" type="date"></label>`;
      return `<label class="ce-l">${x.label}<input id="qi-${x.k}" class="o-sel" ${x.k === 'email' ? 'type="email"' : x.k === 'telefono' ? 'inputmode="tel" placeholder="+502 5555 5555"' : ''} value=""></label>`;
    };
    let back = document.getElementById('q-inline'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'q-inline'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 97;
    back.innerHTML = `<div class="card" style="width:min(460px,94vw);padding:0">
      <div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">
        <div><div class="crumb" style="margin-bottom:2px">Completar expediente</div><b style="font-family:var(--f-display);font-size:16px">${U.esc(c.nombre)}</b></div>
        <button class="imp-x" id="qi-x">✕</button></div>
      <div style="padding:18px 20px;display:grid;gap:12px">${f.sort((a, b) => a.pri - b.pri).map(field).join('')}
        <div class="cfg-note">Al guardar, este cliente sale de la lista de incompletos.</div></div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" id="qi-cancel">Cancelar</button><button class="btn primary" id="qi-ok">Guardar datos</button></div>
    </div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#qi-x').addEventListener('click', close);
    back.querySelector('#qi-cancel').addEventListener('click', close);
    back.querySelector('#qi-ok').addEventListener('click', () => {
      const patch = {};
      f.forEach(x => { const el = back.querySelector('#qi-' + x.k); if (el && el.value) patch[x.k] = el.value; });
      if (Object.keys(patch).length) S().update('clientes', cid, patch);
      close();
      const rest = faltantes(S().get('clientes', cid)).length;
      const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = rest ? '✓ Datos guardados · faltan ' + rest : '✓ Expediente completo'; document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
      const h = document.getElementById('host'); if (h) render(h);
    });
  }

  function campana() {
    const all = S().all('clientes').map(c => ({ c, f: faltantes(c) })).filter(x => x.f.length && tieneVigente(x.c.id));
    const wa = all.filter(x => x.c.telefono).length, mail = all.filter(x => !x.c.telefono && x.c.email).length;
    Orbit.ui.toast('Campaña de actualización preparada:\n\n• ' + wa + ' por WhatsApp Web/API pendiente de conexión real\n• ' + mail + ' por correo preparado\n• ' + (all.length - wa - mail) + ' sin canal — requieren gestión manual.\n\nUsa la plantilla "Actualización de datos" con los campos pendientes de cada cliente.');
  }
  return { render, campana, editarInline };
})();