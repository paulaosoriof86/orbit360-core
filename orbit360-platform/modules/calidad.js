/* ============================================================
   Orbit 360 · Calidad de datos v1.216 — vista por alcance
   - funciona antes y después de importar Pólizas;
   - usa el scope aplicado por access-scope/CRM bridge;
   - amplía campos faltantes y filtros por asesor;
   - completar datos vacíos es trazable y no modifica campos críticos;
   - campañas solo se preparan, no simulan entrega.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.calidad = (function () {
  const U = Orbit.ui, q = Orbit.q, K = Orbit.kit, S = () => Orbit.store, A = Orbit.access || {};
  let st = { ffalta: '', soloVig: false, asesor: '' };

  function clean(v) { return String(v == null ? '' : v).trim(); }
  function faltantes(c) {
    const f = [];
    const phone = clean(c.telefono || c.whatsapp);
    if (!phone) f.push({ k: 'telefono', label: 'Teléfono / WhatsApp', pri: 1 });
    if (!clean(c.email)) f.push({ k: 'email', label: 'Correo', pri: 2 });
    if (!clean(c.identificacion || c.documento || c.nit || c.dpi)) f.push({ k: 'identificacion', label: 'Documento', pri: 3 });
    if (!clean(c.departamento || c.provincia)) f.push({ k: 'departamento', label: 'Departamento / provincia', pri: 4 });
    if (!clean(c.ciudad || c.municipio)) f.push({ k: 'ciudad', label: 'Ciudad / municipio', pri: 5 });
    if (!clean(c.direccion)) f.push({ k: 'direccion', label: 'Dirección', pri: 6 });
    if (c.tipo === 'Empresa' && !clean(c.contactoPrincipal || c.contacto)) f.push({ k: 'contactoPrincipal', label: 'Contacto principal', pri: 7 });
    if (c.tipo === 'Persona' && !clean(c.fechaNac)) f.push({ k: 'fechaNac', label: 'Fecha nac.', pri: 8 });
    if (c.tipo === 'Persona' && !clean(c.sexo)) f.push({ k: 'sexo', label: 'Sexo', pri: 9 });
    return f;
  }
  function tieneVigente(cid) {
    try { return q.polizasDe(cid).some(p => p.estado === 'Vigente' || p.estado === 'Por renovar' || ['vigente','porrenovar'].includes(String(p.estado || '').toLowerCase().replace(/\s+/g,''))); }
    catch (e) { return false; }
  }
  function scopeLabel() {
    const scope = A.dataScope ? A.dataScope('calidad') : '';
    return ({ own: 'Mis clientes', team: 'Clientes de mi equipo', all: 'Todos los clientes', none: 'Sin acceso' })[scope] || 'Clientes en alcance';
  }
  function advisorOptions(clients) {
    const ids = Array.from(new Set(clients.map(c => c.asesorId).filter(Boolean)));
    return ids.map(id => {
      const a = S().get('asesores', id) || {};
      return { id, nombre: a.nombre || id };
    }).sort((a,b) => a.nombre.localeCompare(b.nombre));
  }
  function render(host) {
    const clients = S().all('clientes') || [];
    const all = clients.map(c => ({ c, f: faltantes(c), vig: tieneVigente(c.id) })).filter(x => x.f.length > 0);
    const conVig = all.filter(x => x.vig);
    const advisors = advisorOptions(clients);
    if (st.asesor && !advisors.some(a => a.id === st.asesor)) st.asesor = '';
    const rows = all.filter(x =>
      (!st.soloVig || x.vig) &&
      (!st.ffalta || x.f.some(f => f.k === st.ffalta)) &&
      (!st.asesor || x.c.asesorId === st.asesor)
    ).sort((a, b) => (b.vig - a.vig) || (Math.min(...a.f.map(f => f.pri)) - Math.min(...b.f.map(f => f.pri))));
    const sinContacto = all.filter(x => x.f.some(f => f.k === 'telefono')).length;
    const complete = clients.length ? Math.max(0, Math.round((1 - all.length / clients.length) * 100)) : 100;
    const ownScope = A.dataScope && A.dataScope('calidad') === 'own';

    host.innerHTML = `<div class="page">
      ${K.bannerFor('calidad', `<button class="btn primary" onclick="Orbit.modules.calidad.campana()">📣 Preparar actualización</button>`)}
      <div class="cfg-note" style="margin-bottom:14px"><b>${U.esc(scopeLabel())}:</b> la vista funciona aunque la fuente de Pólizas aún no se haya importado. “Solo con póliza vigente” es un filtro opcional, no el estado inicial.</div>
      ${K.kpis([
        { label: ownScope ? 'Mis expedientes incompletos' : 'Expedientes incompletos', val: all.length, color: 'var(--warn)', foot: 'de ' + clients.length + ' en alcance' },
        { label: 'Con póliza vigente', val: conVig.length, color: 'var(--danger)', foot: 'prioridad alta', footTone: 'down' },
        { label: 'Sin teléfono / WhatsApp', val: sinContacto, color: 'var(--red)', foot: 'prioridad 1' },
        { label: 'Completitud', val: complete + '%', color: 'var(--ok)', foot: 'alcance actual', footTone: 'up' }
      ])}
      <div class="card" style="overflow:hidden">
        <div style="display:flex;gap:10px;flex-wrap:wrap;padding:13px 14px;border-bottom:1px solid var(--line);align-items:center">
          <label style="display:flex;align-items:center;gap:7px;font-size:13px;font-weight:600;cursor:pointer"><input type="checkbox" id="q-vig" ${st.soloVig ? 'checked' : ''} style="accent-color:var(--red)"> Solo con póliza vigente</label>
          <select id="q-falta" class="o-sel"><option value="">Falta cualquier dato</option>${[
            ['telefono','Sin teléfono / WhatsApp'],['email','Sin correo'],['identificacion','Sin documento'],
            ['departamento','Sin departamento'],['ciudad','Sin ciudad'],['direccion','Sin dirección'],
            ['contactoPrincipal','Sin contacto principal'],['fechaNac','Sin fecha nac.']
          ].map(o => `<option value="${o[0]}" ${st.ffalta === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>
          ${advisors.length > 1 && !ownScope ? `<select id="q-asesor" class="o-sel"><option value="">Todos los asesores</option>${advisors.map(a => `<option value="${U.esc(a.id)}" ${st.asesor === a.id ? 'selected' : ''}>${U.esc(a.nombre)}</option>`).join('')}</select>` : ''}
          <span class="muted" style="margin-left:auto;font-size:12.5px">${rows.length} clientes</span>
        </div>
        <div style="overflow-x:auto"><table class="tbl">
          <thead><tr><th>Cliente</th><th>Asesor</th><th>Faltan</th><th>Vigente</th><th>Canal</th><th></th></tr></thead>
          <tbody>${rows.map(({ c, f, vig }) => {
            const phone = clean(c.whatsapp || c.telefono), wa = phone.replace(/[^0-9]/g, '');
            const canal = phone ? '<span class="badge ok">💬 WhatsApp</span>' : c.email ? '<span class="badge info">✉ Correo</span>' : '<span class="badge danger">Sin contacto</span>';
            const faltaTxt = f.sort((a, b) => a.pri - b.pri).map(x => `<span class="badge ${x.pri === 1 ? 'danger' : x.pri <= 4 ? 'warn' : 'neutral'}">${x.label}</span>`).join(' ');
            const accion = phone
              ? `<a class="btn ghost sm" style="color:#1f8a4c" href="https://wa.me/${wa}?text=${encodeURIComponent('Hola ' + clean(c.nombre).split(' ')[0] + ', para mantener tu información al día necesitamos actualizar algunos datos. ¿Nos ayudás?')}" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="Abre WhatsApp Web con mensaje preparado; la entrega no se confirma desde Orbit.">💬 Preparar WA</a>`
              : c.email ? `<button class="btn ghost sm" onclick="event.stopPropagation();window.__orbitCompose={para:'${U.esc(c.email)}',asunto:'Actualización de datos · ${U.esc(c.nombre)}',cuerpo:'',clienteId:'${c.id}',vinculo:{tipo:'cliente',id:'${c.id}',label:'${U.esc(c.nombre)}'}};location.hash='#/correo'" title="Preparar correo; envío real depende de cuenta conectada.">✉ Preparar correo</button>`
              : `<button class="btn ghost sm" disabled style="opacity:.5">Sin canal</button>`;
            return `<tr class="clickable" onclick="location.hash='#/cliente360?c=${c.id}&t=resumen'">
              <td>${K.clienteCell(c.id)}</td><td>${K.asesorCell(c.asesorId)}</td><td>${faltaTxt}</td>
              <td>${vig ? '<span class="badge ok">Sí</span>' : '<span class="muted">Pendiente de pólizas / sin vigente</span>'}</td>
              <td>${canal}</td>
              <td style="text-align:right;white-space:nowrap"><button class="btn primary sm" onclick="event.stopPropagation();Orbit.modules.calidad.editarInline('${c.id}')" title="Completar únicamente datos faltantes">✏ Completar</button> ${accion}</td>
            </tr>`;
          }).join('') || `<tr><td colspan="6" class="muted" style="text-align:center;padding:30px">No hay expedientes incompletos con los filtros actuales.</td></tr>`}</tbody>
        </table></div>
      </div>
      <div class="cfg-note" style="margin-top:14px">Prioridad: contacto › correo/documento › ubicación › datos complementarios. Completar vacíos no permite reasignar, fusionar, borrar ni modificar pólizas o cobros.</div>
    </div>`;

    const vig = document.getElementById('q-vig'); if (vig) vig.addEventListener('change', e => { st.soloVig = e.target.checked; render(host); });
    const falta = document.getElementById('q-falta'); if (falta) falta.addEventListener('change', e => { st.ffalta = e.target.value; render(host); });
    const advisor = document.getElementById('q-asesor'); if (advisor) advisor.addEventListener('change', e => { st.asesor = e.target.value; render(host); });
  }

  function geoOptions(country, department) {
    const geo = (Orbit.GEO || {})[country] || {};
    return { departments: Object.keys(geo), cities: geo[department] || [] };
  }
  function editarInline(cid) {
    const c = S().get('clientes', cid); if (!c) return;
    const f = faltantes(c);
    if (!f.length) { const h = document.getElementById('host'); if (h) render(h); return; }
    const country = c.pais || 'GT';
    const geo = geoOptions(country, c.departamento || '');
    const field = x => {
      if (x.k === 'sexo') return `<label class="ce-l">${x.label}<select id="qi-${x.k}" class="o-sel"><option value="">—</option><option>Femenino</option><option>Masculino</option><option>Otro</option></select></label>`;
      if (x.k === 'fechaNac') return `<label class="ce-l">${x.label}<input id="qi-${x.k}" class="o-sel" type="date"></label>`;
      if (x.k === 'departamento') return `<label class="ce-l">${x.label}<select id="qi-departamento" class="o-sel"><option value="">— Seleccionar —</option>${geo.departments.map(v => `<option>${U.esc(v)}</option>`).join('')}<option value="REQUIERE_VALIDACION">Otro / requiere validación</option></select></label>`;
      if (x.k === 'ciudad') return `<label class="ce-l">${x.label}<select id="qi-ciudad" class="o-sel"><option value="">— Selecciona departamento —</option><option value="REQUIERE_VALIDACION">Otro / requiere validación</option></select></label>`;
      return `<label class="ce-l">${x.label}<input id="qi-${x.k}" class="o-sel" ${x.k === 'email' ? 'type="email"' : x.k === 'telefono' ? 'inputmode="tel" placeholder="+502 5555 5555"' : ''}></label>`;
    };
    let back = document.getElementById('q-inline'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'q-inline'; back.className = 'drawer-back open'; back.style.cssText = 'display:grid;place-items:center;z-index:215';
    back.innerHTML = `<div class="card" style="width:min(560px,94vw);max-height:92vh;overflow:auto;padding:0">
      <div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">
        <div><div class="crumb" style="margin-bottom:2px">Completar expediente · ${U.esc(country)}</div><b style="font-family:var(--f-display);font-size:16px">${U.esc(c.nombre)}</b></div><button class="imp-x" id="qi-x">✕</button></div>
      <div style="padding:18px 20px;display:grid;gap:12px">${f.sort((a,b) => a.pri - b.pri).map(field).join('')}
        <label class="ce-l">Motivo / fuente de actualización *<textarea id="qi-motivo" class="o-sel" style="min-height:62px"></textarea></label>
        <div class="cfg-note">Solo se completan campos vacíos. Los datos quedan con trazabilidad y revisión de calidad.</div></div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" id="qi-cancel">Cancelar</button><button class="btn primary" id="qi-ok">Guardar datos</button></div></div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#qi-x').addEventListener('click', close); back.querySelector('#qi-cancel').addEventListener('click', close);
    const dep = back.querySelector('#qi-departamento'), city = back.querySelector('#qi-ciudad');
    function fillCities() {
      if (!city) return;
      const rows = dep && dep.value && dep.value !== 'REQUIERE_VALIDACION' ? geoOptions(country, dep.value).cities : [];
      city.innerHTML = '<option value="">— Seleccionar —</option>' + rows.map(v => `<option>${U.esc(v)}</option>`).join('') + '<option value="REQUIERE_VALIDACION">Otro / requiere validación</option>';
    }
    if (dep) dep.addEventListener('change', fillCities);
    back.querySelector('#qi-ok').addEventListener('click', () => {
      const motivo = clean(back.querySelector('#qi-motivo').value);
      if (!motivo) return U.toast('Indica el motivo o fuente de la actualización.');
      const before = JSON.parse(JSON.stringify(c)), patch = {};
      f.forEach(x => {
        const el = back.querySelector('#qi-' + x.k), value = el && clean(el.value);
        if (value && !clean(c[x.k])) patch[x.k] = value;
      });
      if (!Object.keys(patch).length) return U.toast('No hay datos nuevos para guardar.');
      patch.requiereValidacion = true;
      patch.calidad = Object.assign({}, c.calidad || {}, {
        estado: 'REQUIERE_VALIDACION',
        alertas: faltantes(Object.assign({}, c, patch)).map(x => 'falta_' + x.k),
        actualizado: new Date().toISOString(),
        fuenteActualizacion: motivo
      });
      S().update('clientes', cid, patch);
      const after = S().get('clientes', cid);
      if (A.audit) A.audit('completar_faltantes', 'clientes', cid, before, after, motivo, { modulo: 'calidad', soloCamposVacios: true });
      close();
      const rest = faltantes(after).length;
      U.toast(rest ? 'Datos guardados · faltan ' + rest : 'Expediente completo, pendiente de validación');
      const h = document.getElementById('host'); if (h) render(h);
    });
  }

  function campana() {
    const rows = (S().all('clientes') || []).map(c => ({ c, f: faltantes(c) })).filter(x => x.f.length);
    const wa = rows.filter(x => clean(x.c.whatsapp || x.c.telefono)).length;
    const mail = rows.filter(x => !clean(x.c.whatsapp || x.c.telefono) && clean(x.c.email)).length;
    U.toast('Actualización preparada:\n\n• ' + wa + ' por WhatsApp Web/canal pendiente de confirmación\n• ' + mail + ' por correo preparado\n• ' + (rows.length - wa - mail) + ' sin canal — requieren gestión.\n\nNo se ha confirmado ningún envío.');
  }
  return { render, campana, editarInline, faltantes };
})();
