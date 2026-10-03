/* ============================================================
   Orbit 360 · CRM · Cancelaciones (vista global)  — NÚCLEO
   Pólizas dadas de baja: motivos, valor perdido, tendencia.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.cancelaciones = (function () {
  const U = Orbit.ui, q = Orbit.q, K = Orbit.kit, S = () => Orbit.store;
  let st = { fmot: '', fase: '' };
  const hoy = () => (Orbit.ui && Orbit.ui.today ? Orbit.ui.today() : new Date().toISOString().slice(0, 10));
  const ACTIVAS = ['Pendiente de contacto', 'Llamada de retención agendada', 'Oferta de mejora enviada', 'En negociación'];
  const FINALES = ['Recuperada', 'No recuperable'];

  function allSafe(col) { try { return S().all(col) || []; } catch (e) { return []; } }
  function normState(value) {
    return String(value == null ? '' : value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }
  function isCancelledPolicy(p) {
    return ['cancelada', 'cancelado', 'anulada', 'anulado'].includes(normState(p && (p.estado || p.status)));
  }
  function projectionId(policyId) {
    return 'can_pol_' + String(policyId || '').replace(/[^A-Za-z0-9._:-]/g, '_');
  }
  function policyCancellation(p) {
    const premium = p && p.prima != null ? p.prima : (p && p.primaTotal != null ? p.primaTotal : (p && p.primaNeta != null ? p.primaNeta : 0));
    return {
      id: projectionId(p && p.id),
      tenantId: p && p.tenantId,
      polizaId: p && p.id,
      clienteId: p && p.clienteId,
      asesorId: p && (p.asesorId || p.advisorId || p.ownerAdvisorId),
      pais: p && (p.pais || p.country),
      moneda: p && p.moneda,
      fecha: p && (p.fechaCancelacion || p.cancellationDate || ''),
      motivo: p && (p.motivoCancelacion || p.cancellationReason || '') || 'Sin motivo registrado',
      valorPerdido: premium,
      recuperacion: 'Pendiente de contacto',
      recuperada: false,
      __policyCancellationProjection: true
    };
  }
  function effectiveCancelations() {
    const explicit = allSafe('cancelaciones');
    const explicitPolicies = new Set(explicit.map(c => String(c && c.polizaId || '')).filter(Boolean));
    const projected = allSafe('polizas').filter(isCancelledPolicy).filter(p => p && p.id && !explicitPolicies.has(String(p.id))).map(policyCancellation);
    return explicit.concat(projected);
  }
  function cancellationById(id) {
    const explicit = S().get('cancelaciones', id);
    if (explicit) return explicit;
    return effectiveCancelations().find(c => c.id === id) || null;
  }

  const FDEFS = () => [
    { id: 'fmot', type: 'select', ph: 'Motivo', options: [...new Set(effectiveCancelations().map(c => c.motivo).filter(Boolean))].map(v => ({ v, t: v })) },
    { id: 'fase', type: 'select', ph: 'Asesor', options: K.asesorOptions() }
  ];
  function findNegocio(c) {
    return allSafe('negocios').find(n => n.cancelacionId === c.id || (n.origen === 'Recuperación' && n.clienteId === c.clienteId && n.polizaId === c.polizaId && !n.archivado));
  }
  function findGestion(c) {
    return allSafe('gestiones').find(g => g.cancelacionId === c.id || (g.origen === 'cancelaciones' && g.clienteId === c.clienteId && g.polizaId === c.polizaId && !g.archivado));
  }

  function render(host) {
    const all = effectiveCancelations();
    const porMotivo = {};
    all.forEach(c => { porMotivo[c.motivo] = (porMotivo[c.motivo] || 0) + 1; });
    const motTot = all.length || 1;
    const perdido = all.reduce((s, c) => s + q.norm(c.valorPerdido, (S().get('clientes', c.clienteId) || {}).moneda || 'GTQ'), 0);
    const motCols = ['#7e1220', '#b5253b', '#c9821b', '#6b4ea0', '#1f3a5f'];

    const rows = all.filter(c => {
      const p = S().get('polizas', c.polizaId);
      return (!st.fmot || c.motivo === st.fmot) && (!st.fase || (p && p.asesorId === st.fase));
    }).sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
    st.__count = rows.length + ' de ' + all.length;

    host.innerHTML = `<div class="page">
      ${K.bannerFor('cancelaciones', '')}
      ${K.kpis([
        { label: 'Canceladas', onclick: "location.hash='#/cancelaciones'", val: all.length, color: 'var(--danger)', foot: 'histórico' },
        { label: 'Valor perdido', val: U.moneyShort(perdido, Orbit.q.monedaPais()), color: 'var(--danger)', foot: 'prima anual', footTone: 'down' },
        { label: 'Motivo principal', val: '<span style="font-size:16px">' + (Object.entries(porMotivo).sort((a, b) => b[1] - a[1])[0] || ['—'])[0] + '</span>', color: 'var(--warn)', foot: 'más frecuente' },
        { label: 'Tasa de fuga', val: Math.round(all.length / (S().all('polizas').length || 1) * 100) + '%', color: 'var(--info)', foot: 'sobre cartera total' }
      ])}
      <div class="card pad" style="margin-bottom:16px">
        <b style="font-family:var(--f-display);font-size:15px">Motivos de cancelación</b>
        <div style="margin-top:14px;display:grid;gap:10px">
          ${Object.entries(porMotivo).sort((a, b) => b[1] - a[1]).map(([m, n], i) => `
            <div style="display:flex;align-items:center;gap:12px;cursor:pointer" onclick="Orbit.modules.cancelaciones.filtrarMotivo('${U.esc(m).replace(/'/g, '')}')" title="Ver solo estas cancelaciones">
              <span style="width:150px;font-size:13px;font-weight:600">${m}</span>
              <div class="bar" style="flex:1"><i style="width:${n / motTot * 100}%;background:${motCols[i % motCols.length]}"></i></div>
              <span class="mono" style="font-size:12px;width:60px;text-align:right">${n} · ${Math.round(n / motTot * 100)}%</span>
            </div>`).join('')}
        </div>
      </div>
      <div class="card" style="overflow:hidden">
        ${K.filterBar(FDEFS(), st)}
        <div style="overflow-x:auto"><table class="tbl">
          <thead><tr><th>Fecha</th><th>Cliente</th><th>Póliza</th><th>Ramo</th><th>Motivo</th><th class="num">Valor perdido</th></tr></thead>
          <tbody>${rows.map(c => {
            const p = S().get('polizas', c.polizaId);
            return `<tr class="clickable" onclick="Orbit.modules.cancelaciones.detalle('${c.id}')">
              <td style="font-size:12.5px">${U.fmtDate(c.fecha)}</td>
              <td>${K.clienteCell(c.clienteId)}</td>
              <td><span class="mono" style="font-size:12px">${p ? p.numero : '—'}</span></td>
              <td>${p ? p.ramo : '—'}</td>
              <td><span class="badge danger">${U.esc(c.motivo)}</span></td>
              <td class="num">${U.money(c.valorPerdido, (S().get('clientes', c.clienteId) || {}).moneda || 'GTQ')}</td>
            </tr>`;
          }).join('') || `<tr><td colspan="6" class="muted" style="text-align:center;padding:30px">Sin cancelaciones.</td></tr>`}</tbody>
        </table></div>
      </div></div>`;
    K.wireFilters(FDEFS(), st, () => render(host));
  }

  function detalle(canId) {
    const c = cancellationById(canId); if (!c) return;
    const cli = S().get('clientes', c.clienteId), p = S().get('polizas', c.polizaId);
    const asg = p ? q.aseguradora(p.aseguradoraId) : null, ase = q.asesor((p && p.asesorId) || (cli && cli.asesorId));
    const cur = (cli && cli.moneda) || 'GTQ';
    const ini = c.fechaInicio || (p && p.vigenciaInicio);
    const diasActiva = c.diasActiva || (ini ? Math.max(15, Math.round((new Date(c.fecha) - new Date(ini)) / 86400000)) : null);
    const meses = diasActiva ? (diasActiva / 30).toFixed(1) : '—';
    const comGen = c.comisionGenerada != null ? c.comisionGenerada : S().where('comisiones', x => x.polizaId === c.polizaId).reduce((s, x) => s + (+x.monto || 0), 0);
    const recOpts = ['Pendiente de contacto', 'Llamada de retención agendada', 'Oferta de mejora enviada', 'En negociación', 'Recuperada', 'No recuperable'];
    let back = document.getElementById('c360-edit'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'c360-edit'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center';
    back.innerHTML = `<div class="card" style="width:min(640px,95vw);max-height:92vh;overflow:auto;padding:0">
      <div style="padding:18px 20px;background:linear-gradient(120deg,#7e1220,#b5253b);display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div><div class="crumb" style="margin-bottom:4px;color:rgba(255,255,255,.82)">Cancelación · ${U.fmtDate(c.fecha)}</div>
          <b style="font-family:var(--f-display);font-size:18px;color:#fff">${cli ? U.esc(cli.nombre) : '—'}</b>
          <div class="mono" style="font-size:12.5px;margin-top:3px;color:rgba(255,255,255,.85)">${p ? p.numero + ' · ' + p.ramo : '—'}</div></div>
        <button class="imp-x" id="cx-x" style="background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.3);color:#fff">✕</button>
      </div>
      <div style="padding:18px 20px;display:grid;gap:16px">
        <div class="cx-kpis">
          <div class="cx-kpi"><span>Tiempo activa</span><b>${diasActiva || '—'} d</b><small>${meses} meses</small></div>
          <div class="cx-kpi"><span>Valor perdido</span><b style="color:var(--danger)">${U.money(c.valorPerdido, cur)}</b><small>prima anual</small></div>
          <div class="cx-kpi"><span>Comisión generada</span><b style="color:var(--info)">${U.money(comGen, cur)}</b><small>antes de baja</small></div>
        </div>
        <div class="vp-grid">
          <div class="vp-row"><span class="vp-l">Aseguradora</span><span class="vp-v">${asg ? U.esc(asg.nombre) : '—'}</span></div>
          <div class="vp-row"><span class="vp-l">Asesor</span><span class="vp-v">${ase ? U.esc(ase.nombre) : '—'}</span></div>
          <div class="vp-row"><span class="vp-l">Motivo</span><span class="vp-v"><span class="badge danger">${U.esc(c.motivo)}</span></span></div>
          <div class="vp-row"><span class="vp-l">Estado de póliza</span><span class="vp-v">${p ? p.estado : '—'}</span></div>
          <div class="vp-row"><span class="vp-l">Inicio de vigencia</span><span class="vp-v">${U.fmtDate(ini)}</span></div>
          <div class="vp-row"><span class="vp-l">Fecha de cancelación</span><span class="vp-v">${U.fmtDate(c.fecha)}</span></div>
        </div>
        <div class="vp-pay">
          <div class="vp-sec-t">♻ Acción de recuperación</div>
          <select id="cx-rec" class="o-sel">${recOpts.map(o => `<option ${o === (c.recuperacion || 'Pendiente de contacto') ? 'selected' : ''}>${o}</option>`).join('')}</select>
          <label class="ce-l" style="margin-top:10px">Nota de retención<textarea id="cx-nota" class="o-sel" style="min-height:54px;resize:vertical;padding:9px 11px" placeholder="Gestión de recuperación, oferta, resultado…">${U.esc(c.notaRecuperacion || '')}</textarea></label>
        </div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
        ${c.__policyCancellationProjection ? '' : '<button class="btn ghost" id="cx-delete" style="margin-right:auto;color:var(--danger,var(--red))">Eliminar</button>'}
        ${p ? `<button class="btn ghost" onclick="Orbit.modules.cliente360.verPoliza('${c.polizaId}')">📑 Ver póliza</button>` : ''}
        <button class="btn primary" id="cx-save">Guardar</button>
      </div>
    </div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#cx-x').addEventListener('click', close);
    const del = back.querySelector('#cx-delete');
    if (del) del.addEventListener('click', async () => {
      if (!Orbit.recordDelete) return U.toast('Eliminación canónica no disponible.');
      del.disabled = true;
      try {
        const result = await Orbit.recordDelete.remove('cancelaciones', canId, { label: (p ? p.numero : '') || (cli ? cli.nombre : '') || canId });
        if (result && result.ok) {
          close();
          const h = document.getElementById('host');
          if (h) render(h);
          return;
        }
      } catch (error) {
        U.toast('No fue posible confirmar la eliminación de la cancelación.');
      }
      del.disabled = false;
    });
    back.querySelector('#cx-save').addEventListener('click', async () => {
      const save = back.querySelector('#cx-save');
      if (save.disabled) return;
      const rec = back.querySelector('#cx-rec').value;
      const nota = back.querySelector('#cx-nota').value.trim();
      let motivo = nota;
      if (FINALES.includes(rec) && !motivo) {
        motivo = await Orbit.ui.prompt('Motivo obligatorio para marcar la recuperación como ' + rec + ':', { title: 'Motivo de recuperación' });
        if (!motivo) return;
      }
      if (!S().updateDurable || !S().insertDurable) return U.toast('Persistencia canónica no disponible.');
      const fecha = hoy();
      const patch = { recuperacion: rec, recuperada: rec === 'Recuperada', notaRecuperacion: nota || motivo };
      const original = save.textContent; save.disabled = true; save.textContent = 'Guardando…';
      try {
        if (c.__policyCancellationProjection === true) {
          const materialized = Object.assign({}, c, patch);
          delete materialized.__policyCancellationProjection;
          await S().insertDurable('cancelaciones', materialized);
          c.__policyCancellationProjection = false;
        } else {
          await S().updateDurable('cancelaciones', canId, patch);
        }
        if (c.clienteId) {
          const activityId = 'act_rec_' + String(canId).replace(/[^A-Za-z0-9._:-]/g, '_');
          const activity = { id: activityId, clienteId: c.clienteId, asesorId: c.asesorId, tipo: 'recuperacion', icon: rec === 'Recuperada' ? '✅' : '♻', fecha, titulo: 'Recuperación: ' + rec, detalle: (p ? p.numero + ' · ' : '') + (nota || motivo || rec), __syntheticQa: c.__syntheticQa === true };
          if (S().get('actividades', activityId)) await S().updateDurable('actividades', activityId, activity);
          else await S().insertDurable('actividades', activity);
        }
        if (c.clienteId && ACTIVAS.includes(rec)) {
          const existente = findNegocio(Object.assign({}, c, patch));
          if (existente) {
            const notas = (existente.notas ? existente.notas + '\n' : '') + '[' + fecha + '] ' + (nota || rec);
            await S().updateDurable('negocios', existente.id, { etapa: existente.etapa, nota: nota || rec, notas, actualizado: fecha, cancelacionId: canId, polizaId: c.polizaId });
            await S().updateDurable('cancelaciones', canId, { recuperacionNegocioId: existente.id });
          } else {
            const prox = new Date(); prox.setDate(prox.getDate() + 2);
            const etapaMap = { 'Pendiente de contacto': 'nuevo', 'Llamada de retención agendada': 'contactado', 'Oferta de mejora enviada': 'propuesta', 'En negociación': 'negociacion' };
            const neg = {
              id: 'neg_rec_' + String(canId).replace(/[^A-Za-z0-9._:-]/g, '_'), nombre: (cli ? cli.nombre : 'Cliente') + ' · recuperación', tipo: cli ? cli.tipo : 'Persona',
              etapa: etapaMap[rec] || 'contactado', prob: 30, asesorId: c.asesorId, canal: 'Cliente actual/antiguo',
              pais: cli ? cli.pais : 'GT', moneda: cli ? cli.moneda : 'GTQ', producto: p ? p.producto : 'Por definir', ramo: p ? p.ramo : 'Auto',
              aseguradoraId: c.aseguradoraId || (p ? p.aseguradoraId : ''), primaEst: p ? (p.prima || 0) : 0, prioridad: 'Alta',
              clienteId: c.clienteId, polizaId: c.polizaId, cancelacionId: canId, proximoToque: prox.toISOString().slice(0, 10),
              checklist: [], nota: nota || rec, notas: nota || '', descripcion: 'Recuperación de póliza cancelada ' + (p ? p.numero : ''),
              bitacora: [{ ts: fecha + ' 09:00', user: 'Equipo', campo: 'Creación', de: '', a: 'Recuperación desde cancelación', origen: 'cancelaciones' }],
              comentarios: [], origen: 'Recuperación', creado: fecha, actualizado: fecha, archivado: false
            };
            await S().insertDurable('negocios', neg);
            await S().updateDurable('cancelaciones', canId, { recuperacionNegocioId: neg.id });
          }
        } else if (c.clienteId && rec === 'Recuperada') {
          const existenteG = findGestion(Object.assign({}, c, patch));
          if (existenteG) {
            const notas = (existenteG.notas ? existenteG.notas + '\n' : '') + '[' + fecha + '] Recuperación confirmada · ' + (motivo || nota || 'Cliente recuperado');
            await S().updateDurable('gestiones', existenteG.id, { notas, estado: existenteG.estado || 'Pendiente', cancelacionId: canId });
            await S().updateDurable('cancelaciones', canId, { recuperacionGestionId: existenteG.id });
          } else if (Orbit.ciclo && Orbit.ciclo.crearGestion) {
            const res = await Orbit.ciclo.crearGestion({ tipo: 'Reemisión por recuperación', titulo: 'Reemisión: ' + (p ? p.numero : c.clienteId), clienteId: c.clienteId, polizaId: c.polizaId, asesorId: c.asesorId, nota: motivo || nota || 'Cliente recuperado', origen: 'cancelaciones', cancelacionId: canId });
            if (!res || !res.id) throw new Error('CANCELATION_RECOVERY_MANAGEMENT_READBACK_REQUIRED');
            await S().updateDurable('cancelaciones', canId, { recuperacionGestionId: res.id });
          }
        }
        const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = rec === 'Recuperada' ? '✅ Cliente recuperado · reemisión confirmada en Ops' : rec === 'No recuperable' ? '⛔ Recuperación cerrada con motivo' : '♻ Acción de recuperación confirmada sin duplicar seguimiento'; document.body.appendChild(t); setTimeout(() => t.remove(), 2800);
        close();
      } catch (error) {
        save.disabled = false; save.textContent = original;
        U.toast('No fue posible confirmar la recuperación. No se registró un falso éxito.');
      }
    });
  }

  function filtrarMotivo(m) { st.fmot = m; const host = document.getElementById('host'); if (host) render(host); }
  return { render, detalle, filtrarMotivo };
})();