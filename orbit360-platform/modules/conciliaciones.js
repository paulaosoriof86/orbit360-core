/* ============================================================
   Orbit 360 · Bandeja de Conciliaciones (UI/prototipo)
   Lee SOLO de Orbit.store('conciliaciones'). No toca cobros.
   Las acciones cambian estado de la propuesta vía Orbit.store.update.
   La aplicación real de pagos queda para backend (ChatGPT/Codex).
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.conciliaciones = (function () {
  const U = Orbit.ui, S = () => Orbit.store, q = Orbit.q, K = Orbit.kit;
  let fEstado = '', fFuente = '';

  const ESTADOS = ['PROPUESTA', 'EN_REVISION', 'VALIDADA', 'RECHAZADA', 'BLOQUEADA', 'ANULADA', 'APLICADA'];
  const TONE = { PROPUESTA: 'info', EN_REVISION: 'info', VALIDADA: 'ok', RECHAZADA: 'danger', BLOQUEADA: 'danger', ANULADA: 'neutral', APLICADA: 'ok' };
  // Acciones permitidas por estado (contrato readiness)
  const ACCIONES = {
    PROPUESTA: ['ver_detalle', 'tomar_en_revision', 'bloquear', 'anular'],
    EN_REVISION: ['ver_detalle', 'validar', 'rechazar', 'bloquear', 'anular'],
    VALIDADA: ['ver_detalle', 'preparar_aplicacion_controlada', 'rechazar', 'anular'],
    RECHAZADA: ['ver_detalle'], BLOQUEADA: ['ver_detalle'], ANULADA: ['ver_detalle'], APLICADA: ['ver_detalle']
  };
  const ACC_LBL = { ver_detalle: 'Ver', tomar_en_revision: 'Tomar en revisión', validar: 'Validar', rechazar: 'Rechazar', bloquear: 'Bloquear', anular: 'Anular', preparar_aplicacion_controlada: 'Preparar aplicación' };
  // Transiciones de estado (solo cambian la propuesta, nunca cobros)
  const TRANS = { tomar_en_revision: 'EN_REVISION', validar: 'VALIDADA', rechazar: 'RECHAZADA', bloquear: 'BLOQUEADA', anular: 'ANULADA' };

  function all() { try { return S().all('conciliaciones') || []; } catch (e) { return []; } }
  function scoreBadge(sc) {
    const t = (sc || '').toUpperCase();
    const tone = t === 'MATCH_EXACTO' ? 'ok' : t === 'MATCH_PROBABLE' ? 'info' : t === 'BLOQUEADO' ? 'danger' : 'warn';
    return t ? '<span class="badge ' + tone + '" style="font-size:9.5px">' + U.esc(t) + '</span>' : '—';
  }

  function render(host) {
    const rows = all().filter(r => (!fEstado || (r.estado_bandeja || r.estado) === fEstado) && (!fFuente || r.fuente === fFuente));
    const total = all();
    const cont = {};
    ESTADOS.forEach(e => cont[e] = total.filter(r => (r.estado_bandeja || r.estado) === e).length);
    const fuentes = [...new Set(total.map(r => r.fuente).filter(Boolean))];

    const kpis = K.kpis([
      { label: 'Propuestas', val: cont.PROPUESTA + cont.EN_REVISION, color: 'var(--info)', foot: 'por revisar' },
      { label: 'Validadas', val: cont.VALIDADA, color: 'var(--ok)', foot: 'listas p/ backend' },
      { label: 'Bloqueadas / rechazadas', val: cont.BLOQUEADA + cont.RECHAZADA, color: 'var(--danger)', foot: 'requieren atención' },
      { label: 'Aplicadas', val: cont.APLICADA, color: 'var(--ink-3)', foot: 'histórico' }
    ]);

    const chips = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 14px">'
      + `<button class="btn ${fEstado === '' ? 'primary' : 'ghost'} sm" onclick="Orbit.modules.conciliaciones.filtro('','estado')">Todos</button>`
      + ESTADOS.map(e => `<button class="btn ${fEstado === e ? 'primary' : 'ghost'} sm" onclick="Orbit.modules.conciliaciones.filtro('${e}','estado')">${e.replace('_', ' ')} <span class="muted">${cont[e]}</span></button>`).join('')
      + '</div>';

    const tabla = rows.length ? `<div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table class="tbl">
      <thead><tr><th>Estado</th><th>Revisión</th><th>Score</th><th>Fuente</th><th>Archivo · fila</th><th>País/Moneda</th><th>Cliente · Póliza · Recibo</th><th class="num">Monto</th><th>Acción propuesta</th><th>Responsable</th><th>Actualizado</th><th>Acciones</th></tr></thead>
      <tbody>${rows.map(rowHtml).join('')}</tbody></table></div></div>`
      : `<div class="card pad" style="text-align:center;padding:44px 20px"><div style="font-size:34px;margin-bottom:8px">🗂️</div><div style="font-family:var(--f-display);font-weight:800;font-size:16px">Sin propuestas de conciliación todavía</div><p class="muted" style="font-size:13px;margin-top:6px;max-width:460px;margin-left:auto;margin-right:auto">Cuando importes un estado de cuenta o una planilla de comisión, las coincidencias aparecerán aquí como propuestas para revisar y validar. Ninguna aplica pagos por sí sola.</p></div>`;

    host.innerHTML = '<div class="page">'
      + K.banner({ icon: '🔗', title: 'Bandeja de conciliaciones', sub: 'Propuestas de cruce (banco / aseguradora / comisiones) — revisar, validar o rechazar. No aplica pagos.', features: [] })
      + '<div class="kpi-row">' + kpis + '</div>'
      + (fuentes.length ? `<div class="cfg-note" style="margin-bottom:10px">Fuentes: ${fuentes.map(f => `<b>${U.esc(f)}</b>`).join(' · ')} · <span class="muted">las monedas no se mezclan; cada propuesta conserva su país/moneda origen.</span></div>` : '')
      + chips
      + tabla
      + '</div>';
  }

  function rowHtml(r) {
    const est = r.estado_bandeja || r.estado || 'PROPUESTA';
    const acciones = (r.acciones_permitidas || ACCIONES[est] || ['ver_detalle']);
    const pm = (r.pais_moneda) || ((r.pais || '') + (r.moneda ? ' / ' + r.moneda : '')) || '—';
    const cpr = r.cliente_poliza_recibo || [r.cliente, r.poliza, r.recibo].filter(Boolean).join(' · ') || '—';
    const monto = (r.monto != null && r.moneda) ? U.money(r.monto, r.moneda) : (r.monto != null ? '<span class="muted" title="Moneda requerida">' + r.monto + ' ⚠</span>' : '—');
    const btns = acciones.map(a => {
      if (a === 'ver_detalle') return `<button class="btn ghost sm" onclick="Orbit.modules.conciliaciones.detalle('${r.id}')">Ver</button>`;
      if (a === 'preparar_aplicacion_controlada') return `<button class="btn ghost sm" onclick="Orbit.modules.conciliaciones.prepararAplicacion('${r.id}')">${ACC_LBL[a]}</button>`;
      const danger = (a === 'rechazar' || a === 'bloquear' || a === 'anular') ? ' style="color:var(--danger)"' : '';
      return `<button class="btn ghost sm"${danger} onclick="Orbit.modules.conciliaciones.accion('${r.id}','${a}')">${ACC_LBL[a] || a}</button>`;
    }).join(' ');
    const bloqueos = (r.bloqueos && r.bloqueos.length) ? `<div class="muted" style="font-size:10px;color:var(--danger)">⛔ ${r.bloqueos.map(U.esc).join(', ')}</div>` : '';
    return `<tr>
      <td><span class="badge ${TONE[est] || 'neutral'}">${est.replace('_', ' ')}</span></td>
      <td style="font-size:11.5px">${U.esc(r.estado_revision || '—')}</td>
      <td>${scoreBadge(r.score || r.decision_score)}${r.decision_score && r.decision_score !== r.score ? ' <span class="muted" style="font-size:9px">' + U.esc(r.decision_score) + '</span>' : ''}</td>
      <td style="font-size:11.5px">${U.esc(r.fuente || '—')}</td>
      <td class="mono" style="font-size:10.5px">${U.esc(r.archivo || '—')}${r.fila ? ' · f' + r.fila : ''}</td>
      <td class="mono" style="font-size:11px">${U.esc(pm)}</td>
      <td style="font-size:11.5px">${U.esc(cpr)}</td>
      <td class="num">${monto}</td>
      <td style="font-size:11.5px">${U.esc(r.accion_propuesta || '—')}</td>
      <td style="font-size:11.5px">${U.esc(r.responsable || '—')}</td>
      <td class="mono" style="font-size:10.5px">${U.esc((r.ultima_actualizacion || '').toString().slice(0, 16).replace('T', ' ') || '—')}</td>
      <td style="white-space:nowrap">${btns}${bloqueos}</td></tr>`;
  }

  function accion(id, a) {
    const r = S().get('conciliaciones', id); if (!r) return;
    const permitidas = r.acciones_permitidas || ACCIONES[r.estado_bandeja || r.estado] || [];
    if (permitidas.indexOf(a) < 0) { U.toast('Acción no permitida en este estado'); return; }
    const nuevo = TRANS[a];
    if (!nuevo) return;
    // Solo muta la PROPUESTA, nunca cobros.
    S().update('conciliaciones', id, {
      estado_bandeja: nuevo,
      estado_revision: a === 'validar' ? 'Validada por usuario' : a === 'rechazar' ? 'Rechazada' : a === 'tomar_en_revision' ? 'En revisión' : a === 'bloquear' ? 'Bloqueada' : 'Anulada',
      ultima_actualizacion: new Date().toISOString(),
      responsable: (Orbit.auth && Orbit.auth.user && Orbit.auth.user() && Orbit.auth.user().nombre) || 'Usuario'
    });
    U.toast('✓ Propuesta → ' + nuevo.replace('_', ' '));
    const h = document.getElementById('host'); if (h) render(h);
  }

  function prepararAplicacion(id) {
    const r = S().get('conciliaciones', id); if (!r) return;
    modal('⏳ Preparar aplicación controlada', `<div class="cfg-note" style="margin:0">Esta propuesta está <b>validada</b>. La aplicación real del pago (afectación de cobros y recaudo) se ejecuta mediante <b>validación controlada</b> — no se aplica desde esta bandeja.</div>
      <div style="font-size:12.5px;margin-top:12px;line-height:1.6">Cruce propuesto:<br>• ${U.esc(r.cliente_poliza_recibo || '—')}<br>• Monto: ${(r.monto != null && r.moneda) ? U.money(r.monto, r.moneda) : (r.monto || '—')}<br>• Fuente: ${U.esc(r.fuente || '—')} · fila ${U.esc((r.fila || '—').toString())}</div>
      <div class="muted" style="font-size:11.5px;margin-top:12px">Estado: requiere validación controlada · no aplica pago todavía.</div>`);
  }

  function detalle(id) {
    const r = S().get('conciliaciones', id); if (!r) return;
    const rowKV = (k, v) => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--line)"><span class="muted" style="font-size:12px">${k}</span><b style="font-size:12.5px;text-align:right">${v}</b></div>`;
    modal('🔗 Detalle de propuesta', [
      rowKV('Estado bandeja', U.esc(r.estado_bandeja || r.estado || '—')),
      rowKV('Estado revisión', U.esc(r.estado_revision || '—')),
      rowKV('Score', U.esc(r.score || r.decision_score || '—')),
      rowKV('Fuente', U.esc(r.fuente || '—')),
      rowKV('Archivo · fila', U.esc(r.archivo || '—') + (r.fila ? ' · ' + r.fila : '')),
      rowKV('País / moneda', U.esc(r.pais_moneda || ((r.pais || '') + ' / ' + (r.moneda || '')) || '—')),
      rowKV('Cliente · Póliza · Recibo', U.esc(r.cliente_poliza_recibo || '—')),
      rowKV('Monto', (r.monto != null && r.moneda) ? U.money(r.monto, r.moneda) : (r.monto || '—')),
      rowKV('Acción propuesta', U.esc(r.accion_propuesta || '—')),
      rowKV('Responsable', U.esc(r.responsable || '—')),
      rowKV('Última actualización', U.esc((r.ultima_actualizacion || '—').toString().slice(0, 16).replace('T', ' '))),
      (r.bloqueos && r.bloqueos.length) ? `<div class="cfg-note" style="margin-top:10px;border-left:3px solid var(--danger)">⛔ Bloqueos: ${r.bloqueos.map(U.esc).join(', ')}</div>` : ''
    ].join(''));
  }

  function modal(titulo, inner) {
    let b = document.getElementById('conc-modal'); if (b) b.remove();
    b = document.createElement('div'); b.id = 'conc-modal'; b.className = 'drawer-back open';
    b.style.cssText = 'display:grid;place-items:center;z-index:210';
    b.innerHTML = `<div class="card" style="width:min(500px,94vw);max-height:88vh;overflow:auto;padding:0">
      <div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:16px">${titulo}</b><button class="imp-x" id="cm-x">✕</button></div>
      <div style="padding:18px 20px">${inner}</div>
      <div style="padding:13px 20px;border-top:1px solid var(--line);display:flex;justify-content:flex-end"><button class="btn ghost" id="cm-c">Cerrar</button></div></div>`;
    document.body.appendChild(b);
    const close = () => b.remove();
    b.addEventListener('click', e => { if (e.target === b) close(); });
    b.querySelector('#cm-x').onclick = close; b.querySelector('#cm-c').onclick = close;
  }

  function filtro(v, tipo) { if (tipo === 'estado') fEstado = v; else fFuente = v; const h = document.getElementById('host'); if (h) render(h); }

  return { render, accion, detalle, prepararAplicacion, filtro };
})();
