/* ============================================================
   Orbit 360 · Orbit Siniestros / Reclamos
   Listado global + ficha con bitácora cronológica, correos
   asociados y documentos. Carga manual o importación inteligente
   de la bitácora de reclamos que envía la aseguradora.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.siniestros = (function () {
  const U = Orbit.ui, K = Orbit.kit, S = () => Orbit.store, q = Orbit.q;
  let host, filtro = 'todos';
  const ESTADOS = ['Reportado', 'En análisis', 'Documentación', 'Aprobado', 'Pagado', 'Rechazado'];
  const TONE = { 'Reportado': 'warn', 'En análisis': 'info', 'Documentación': 'info', 'Aprobado': 'ok', 'Pagado': 'ok', 'Rechazado': 'danger' };

  function paisOK(cid) { const c = S().get('clientes', cid); return !Orbit.pais || Orbit.pais === 'TODOS' || (c && c.pais === Orbit.pais); }
  function todos() { return S().all('reclamos').filter(r => paisOK(r.clienteId)); }

  function render(h) {
    host = h;
    const arr = todos();
    const abiertos = arr.filter(r => !['Pagado', 'Rechazado'].includes(r.estado));
    const lista = filtro === 'todos' ? arr : filtro === 'abiertos' ? abiertos : arr.filter(r => r.estado === filtro);
    const pagado = arr.filter(r => r.estado === 'Pagado').reduce((s, r) => s + (r.montoAprobado || 0), 0);
    // analítica de tiempos: días abiertos (reclamos en proceso) y días hasta pago (cerrados)
    const hoy = new Date(U.NOW || Date.now());
    const diasEntre = (f1, f2) => Math.max(0, Math.round((new Date(f2) - new Date(f1)) / 86400000));
    const abiertosDias = abiertos.map(r => diasEntre(r.fecha, hoy)).filter(d => !isNaN(d));
    const promAbierto = abiertosDias.length ? Math.round(abiertosDias.reduce((a, b) => a + b, 0) / abiertosDias.length) : 0;
    const cerrados = arr.filter(r => r.estado === 'Pagado' && r.bitacora && r.bitacora.length);
    const cierreDias = cerrados.map(r => { const pagoEv = (r.bitacora || []).slice().reverse().find(b => /pagad/i.test(b.t || '')); return pagoEv ? diasEntre(r.fecha, pagoEv.ts) : diasEntre(r.fecha, hoy); }).filter(d => !isNaN(d));
    const promCierre = cierreDias.length ? Math.round(cierreDias.reduce((a, b) => a + b, 0) / cierreDias.length) : 0;
    host.innerHTML = `<div class="page">
      ${K.banner({ icon: '🚨', title: 'Orbit Siniestros', sub: 'Reclamos, bitácora y seguimiento con aseguradoras', features: [], actions: `<button class="btn ghost" id="si-imp" style="background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.25)">⬇ Importar bitácora</button><button class="btn primary" id="si-new" style="background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.28)">+ Reclamo</button>` })}
      ${K.kpis([
        { label: 'Reclamos', val: arr.length, color: 'var(--red)', foot: abiertos.length + ' abiertos', onclick: "location.hash='#/siniestros'" },
        { label: 'En proceso', val: abiertos.length, color: 'var(--warn)', foot: 'requieren gestión', onclick: "location.hash='#/siniestros'" },
        { label: 'Indemnización pagada', val: U.moneyShort(pagado, Orbit.q.monedaPais()), color: 'var(--ok)', foot: 'a clientes', footTone: 'up', onclick: "location.hash='#/siniestros'" },
        { label: 'Tasa de aprobación', val: arr.length ? Math.round(arr.filter(r => ['Aprobado', 'Pagado'].includes(r.estado)).length / arr.length * 100) + '%' : '—', color: 'var(--info)', foot: 'aprobados / total', onclick: "location.hash='#/siniestros'" },
        { label: '⏱ Días abiertos (prom.)', val: promAbierto || '—', color: promAbierto > 30 ? 'var(--danger)' : 'var(--warn)', foot: abiertos.length + ' reclamos en proceso' },
        { label: '✅ Días a pago (prom.)', val: promCierre || '—', color: 'var(--ok)', foot: cerrados.length + ' reclamos pagados' }
      ])}
      <div class="tabs" style="max-width:520px;margin-bottom:14px">
        ${[['todos', 'Todos'], ['abiertos', 'Abiertos'], ['Pagado', 'Pagados'], ['Rechazado', 'Rechazados']].map(f => `<div class="tab ${filtro === f[0] ? 'active' : ''}" data-f="${f[0]}">${f[1]}</div>`).join('')}
      </div>
      <div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table class="tbl">
        <thead><tr><th>N.º</th><th>Cliente</th><th>Póliza</th><th>Tipo</th><th>Aseguradora</th><th class="num">Reclamado</th><th>Reportado</th><th>Estado</th></tr></thead>
        <tbody>${lista.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).map(r => {
          const cli = S().get('clientes', r.clienteId), p = S().get('polizas', r.polizaId), asg = q.aseguradora(r.aseguradoraId);
          return `<tr class="clickable" onclick="Orbit.modules.siniestros.ficha('${r.id}')">
            <td class="mono" style="font-size:12px">${r.numero}</td>
            <td>${cli ? U.esc(cli.nombre) : '—'}</td>
            <td class="mono" style="font-size:11.5px">${p ? p.numero : '—'}</td>
            <td>${U.esc(r.tipo)}</td>
            <td style="font-size:12.5px">${asg ? U.esc(asg.nombre) : '—'}</td>
            <td class="num">${U.money(r.montoReclamado, (cli && cli.moneda) || 'GTQ')}</td>
            <td style="font-size:12px">${U.fmtDate(r.fecha)}</td>
            <td><span class="badge ${TONE[r.estado]}">${r.estado}</span></td></tr>`;
        }).join('') || '<tr><td colspan="8" class="muted" style="text-align:center;padding:22px">Sin reclamos.</td></tr>'}</tbody>
      </table></div></div>
    </div>`;
    host.querySelectorAll('.tab[data-f]').forEach(el => el.addEventListener('click', () => { filtro = el.dataset.f; render(host); }));
    host.querySelector('#si-new').addEventListener('click', () => nuevo());
    host.querySelector('#si-imp').addEventListener('click', () => Orbit.importa.open('bitacora-reclamos', { onDone: () => render(host) }));
  }

  function ficha(id) {
    const r = S().get('reclamos', id); if (!r) return;
    const cli = S().get('clientes', r.clienteId), p = S().get('polizas', r.polizaId), asg = q.aseguradora(r.aseguradoraId), ase = q.asesor(r.asesorId);
    const cur = (cli && cli.moneda) || 'GTQ';
    const correos = (Orbit.correo ? Orbit.correo.deEntidad('reclamo', id, r.clienteId) : []);
    let back = document.getElementById('si-ficha'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'si-ficha'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center';
    back.innerHTML = `<div class="card" style="width:min(720px,96vw);max-height:92vh;overflow:auto;padding:0">
      <div style="padding:20px 24px;background:linear-gradient(120deg,#7e1220,#b5253b);display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div><div class="crumb" style="margin-bottom:4px;color:rgba(255,255,255,.82)">Siniestro · ${r.numero}</div>
          <h2 style="font-family:var(--f-display);font-weight:800;font-size:20px;margin:0;color:#fff">${U.esc(r.tipo)} · ${r.ramo}</h2>
          <div style="font-size:12.5px;margin-top:4px;color:rgba(255,255,255,.85)">${cli ? U.esc(cli.nombre) : '—'} · ${p ? p.numero : '—'} · ${asg ? U.esc(asg.nombre) : '—'}</div></div>
        <button class="imp-x" id="si-x" style="background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.3);color:#fff">✕</button></div>
      <div style="padding:18px 22px;display:grid;gap:16px">
        <div class="cx-kpis">
          <div class="cx-kpi"><span>Estado</span><b><select id="si-estado" class="o-sel" style="font-size:13px;padding:3px 6px">${ESTADOS.map(e => `<option ${e === r.estado ? 'selected' : ''}>${e}</option>`).join('')}</select></b><small>cambia y guarda bitácora</small></div>
          <div class="cx-kpi"><span>Reclamado</span><b>${U.money(r.montoReclamado, cur)}</b><small>monto solicitado</small></div>
          <div class="cx-kpi"><span>Aprobado</span><b style="color:var(--ok)">${U.money(r.montoAprobado || 0, cur)}</b><small>indemnización</small></div>
        </div>
        <div class="asg-sec">
          <div class="asg-sec-t">📋 Bitácora del reclamo</div>
          <div class="pol-hist">${(r.bitacora || []).slice().reverse().map(b => `<div class="pol-hev"><div class="pol-hev-i">📌</div><div><div class="pol-hev-t">${U.esc(b.t)}</div><div class="pol-hev-d">${U.esc(b.ts)}${b.user ? ' · ' + U.esc(b.user) : ''}${b.d ? ' — ' + U.esc(b.d) : ''}</div></div></div>`).join('') || '<div class="muted" style="font-size:12px">Sin movimientos.</div>'}</div>
          <div class="cadd" style="margin-top:10px"><input id="si-nota" class="o-sel" placeholder="Agregar nota / movimiento a la bitácora"><button class="btn ghost sm" id="si-add">+ Agregar</button></div>
        </div>
        <div class="asg-grid2">
          <div class="asg-sec"><div class="asg-sec-t">✉ Correos asociados</div>
            ${correos.length ? correos.map(c => `<div style="font-size:12.5px;padding:5px 0;border-bottom:1px dashed var(--line-2)">${c.direccion === 'entrante' ? '📥' : '📤'} ${U.esc(c.asunto)}</div>`).join('') : '<div class="muted" style="font-size:12px">Sin correos. Vincula desde la bandeja de Correo.</div>'}
            <button class="btn ghost sm" style="margin-top:8px" onclick="window.__orbitCompose={para:'',asunto:'Reclamo ${r.numero} · ${U.esc(r.tipo)}',cuerpo:'',clienteId:'${r.clienteId}',vinculo:{tipo:'reclamo',id:'${r.id}',label:'${r.numero}'}};location.hash='#/correo'">✉ Escribir a aseguradora</button>
          </div>
          <div class="asg-sec"><div class="asg-sec-t">📎 Documentos</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">${(r.docs || []).map(d => `<span class="mail-chip">📎 ${U.esc(d)}</span>`).join('') || '<span class="muted" style="font-size:12px">Sin documentos.</span>'}</div>
            <button class="btn ghost sm" style="margin-top:8px" onclick="Orbit.importa.open('documentos')">⬆ Cargar documento</button>
          </div>
        </div>
      </div>
      <div style="padding:14px 22px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end">
        ${cli ? `<button class="btn ghost" onclick="location.hash='#/cliente360?c=${r.clienteId}'">🧑‍💼 Ver cliente</button>` : ''}
        <button class="btn primary" id="si-save">Guardar</button></div>
    </div>`;
    document.body.appendChild(back);
    const $ = s => back.querySelector(s);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    $('#si-x').addEventListener('click', close);
    $('#si-add').addEventListener('click', () => { const v = $('#si-nota').value.trim(); if (!v) return; const bit = (r.bitacora || []).concat([{ ts: Orbit.ui.today() + ' ' + new Date().toTimeString().slice(0, 5), user: 'Equipo', t: v, d: '' }]); S().update('reclamos', id, { bitacora: bit }); ficha(id); });
    $('#si-save').addEventListener('click', () => {
      const nuevoEst = $('#si-estado').value;
      const cambioEstado = nuevoEst !== r.estado;
      const patch = { estado: nuevoEst };
      if (cambioEstado) patch.bitacora = (r.bitacora || []).concat([{ ts: Orbit.ui.today() + ' ' + new Date().toTimeString().slice(0, 5), user: 'Equipo', t: 'Estado: ' + nuevoEst, d: '' }]);
      if (['Aprobado', 'Pagado'].includes(nuevoEst) && !r.montoAprobado) patch.montoAprobado = r.montoReclamado;
      S().update('reclamos', id, patch);
      if (cambioEstado) {
        S().insert('actividades', { id: 'act' + Date.now(), clienteId: r.clienteId, asesorId: r.asesorId, tipo: 'siniestro', icon: '🚨', fecha: Orbit.ui.today(), titulo: 'Siniestro ' + r.numero + ': ' + nuevoEst, detalle: r.tipo + ' · ' + (r.ramo || ''), reclamoId: id });
        // reflejar en la gestión de Ops enlazada a este reclamo (paso 8 del flujo Portal→Siniestro)
        var gs = (S().all('gestiones') || []).filter(function (g) { return g.reclamoId === id; });
        gs.forEach(function (g) {
          var nota = (g.notas ? g.notas + '\n' : '') + '[' + Orbit.ui.today() + '] Siniestro ' + r.numero + ' → ' + nuevoEst;
          var patchG = { notas: nota };
          if (['Pagado', 'Rechazado'].includes(nuevoEst)) patchG.estado = 'Resuelta';
          S().update('gestiones', g.id, patchG);
        });
      }
      close(); render(host);
    });
  }

  function nuevo() {
    const clientes = S().all('clientes');
    const cid0 = clientes[0] && clientes[0].id;
    let back = document.getElementById('si-new-dr'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'si-new-dr'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center';
    function pols(cid) { return S().where('polizas', p => p.clienteId === cid); }
    back.innerHTML = `<div class="card" style="width:min(520px,94vw);padding:0">
      <div style="padding:17px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:16px">🚨 Nuevo reclamo</b><button class="imp-x" id="sn-x">✕</button></div>
      <div style="padding:18px 20px;display:grid;gap:12px">
        <label class="ce-l">Cliente<select id="sn-cli" class="o-sel">${clientes.map(c => `<option value="${c.id}" ${c.id === cid0 ? 'selected' : ''}>${U.esc(c.nombre)}</option>`).join('')}</select></label>
        <label class="ce-l">Póliza<select id="sn-pol" class="o-sel">${pols(cid0).map(p => `<option value="${p.id}">${p.numero} · ${p.ramo}</option>`).join('') || '<option value="">— sin pólizas —</option>'}</select></label>
        <div class="cgrid">
          <label class="ce-l">Tipo de siniestro<input id="sn-tipo" class="o-sel" placeholder="Colisión, Robo, Incendio…"></label>
          <label class="ce-l">Monto reclamado<input id="sn-monto" class="o-sel" type="number" value="0"></label>
        </div>
        <label class="ce-l">Descripción<textarea id="sn-desc" class="o-sel" style="min-height:64px;resize:vertical;padding:9px 11px"></textarea></label>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" id="sn-cancel">Cancelar</button><button class="btn primary" id="sn-ok">Crear reclamo</button></div></div>`;
    document.body.appendChild(back);
    const $ = s => back.querySelector(s);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    $('#sn-x').addEventListener('click', close); $('#sn-cancel').addEventListener('click', close);
    $('#sn-cli').addEventListener('change', () => { $('#sn-pol').innerHTML = pols($('#sn-cli').value).map(p => `<option value="${p.id}">${p.numero} · ${p.ramo}</option>`).join('') || '<option value="">— sin pólizas —</option>'; });
    $('#sn-ok').addEventListener('click', () => {
      const cid = $('#sn-cli').value, polId = $('#sn-pol').value, p = polId ? S().get('polizas', polId) : null, cli = S().get('clientes', cid);
      const id = 'rec' + Date.now().toString().slice(-7);
      S().insert('reclamos', { id, polizaId: polId, clienteId: cid, aseguradoraId: p ? p.aseguradoraId : '', asesorId: cli.asesorId, ramo: p ? p.ramo : '', tipo: $('#sn-tipo').value || 'Reclamo', estado: 'Reportado', numero: 'SIN-' + Math.floor(10000 + Math.random() * 89999), fecha: Orbit.ui.today(), montoReclamado: +$('#sn-monto').value || 0, montoAprobado: 0, descripcion: $('#sn-desc').value, bitacora: [{ ts: '2026-06-24 ' + new Date().toTimeString().slice(0, 5), user: cli.nombre, t: 'Reclamo reportado', d: $('#sn-desc').value }], correos: [], docs: [] });
      S().insert('actividades', { id: 'act' + Date.now(), clienteId: cid, asesorId: cli.asesorId, tipo: 'sistema', icon: '🚨', fecha: Orbit.ui.today(), titulo: 'Siniestro reportado', detalle: $('#sn-tipo').value });
      close(); ficha(id);
    });
  }

  return { render, ficha };
})();
