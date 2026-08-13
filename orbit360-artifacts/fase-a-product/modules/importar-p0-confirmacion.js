/* ============================================================
   Orbit 360 · P0 confirmacion reforzada de importadores
   Fecha: 2026-07-09

   UI minima/aditiva para revisar impacto, riesgos, frase exacta
   y motivo antes de llamar Orbit.importaWriteP0.writeBatch.
   No escribe por si sola sin dry-run aprobado y confirmacion.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.importarP0Confirmacion = (function () {
  const REQUIRED_PHRASE = 'CONFIRMO ESCRITURA CONTROLADA';
  const ROLLBACK_PHRASE = 'CONFIRMO ROLLBACK';

  function esc(s) {
    if (Orbit.ui && Orbit.ui.esc) return Orbit.ui.esc(s);
    return String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function summarizeBatch(batch) {
    const operations = Array.isArray(batch && batch.operations) ? batch.operations : [];
    const byCollection = {};
    const byAction = { insert: 0, update: 0, other: 0 };
    let blocked = 0;
    let validation = 0;
    operations.forEach(op => {
      const coll = op.collection || 'sin_coleccion';
      const action = op.action || 'insert';
      byCollection[coll] = (byCollection[coll] || 0) + 1;
      if (action === 'insert') byAction.insert += 1;
      else if (action === 'update') byAction.update += 1;
      else byAction.other += 1;
      const data = op.data || op.record || {};
      if (data.requiereValidacion || data.estado === 'requiere_validacion' || data.validationStatus && data.validationStatus !== 'validado') validation += 1;
      if (Orbit.importaWriteP0 && !Orbit.importaWriteP0.isAllowedCollection(op.collection)) blocked += 1;
    });
    return { total: operations.length, byCollection, byAction, blocked, validation };
  }

  function riskList(batch) {
    const s = summarizeBatch(batch);
    const risks = [];
    if (!batch || batch.status !== 'dry_run_aprobado') risks.push('El dry-run no esta aprobado.');
    if (batch && batch.hasBlockingErrors) risks.push('El lote tiene bloqueos declarados.');
    if (s.blocked) risks.push(`${s.blocked} operacion(es) apuntan a colecciones no permitidas.`);
    if (s.validation) risks.push(`${s.validation} registro(s) requieren validacion.`);
    if (!s.total) risks.push('No hay operaciones para escribir.');
    if (!batch || !batch.batchId) risks.push('Falta batchId.');
    if (!batch || !batch.sourceType) risks.push('Falta tipo de fuente.');
    return risks;
  }

  function confirmationFromForm(host) {
    return {
      approved: !!host.querySelector('[data-p0-confirm-approved]')?.checked,
      phrase: host.querySelector('[data-p0-confirm-phrase]')?.value || '',
      reason: host.querySelector('[data-p0-confirm-reason]')?.value || '',
      userId: host.querySelector('[data-p0-confirm-user]')?.value || 'usuario_actual'
    };
  }

  function renderSummary(batch) {
    const s = summarizeBatch(batch || {});
    const collectionRows = Object.entries(s.byCollection).map(([coll, count]) => `<tr><td>${esc(coll)}</td><td class="num">${count}</td></tr>`).join('') || '<tr><td>Sin operaciones</td><td class="num">0</td></tr>';
    return `<div class="card" style="border:1px solid var(--line);overflow:hidden">
      <div style="padding:10px 13px;border-bottom:1px solid var(--line)"><b style="font-family:var(--f-display)">Impacto del lote</b></div>
      <div style="padding:12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px">
        <span class="badge info">${s.total} operaciones</span>
        <span class="badge info">${s.byAction.insert} crear</span>
        <span class="badge info">${s.byAction.update} actualizar</span>
        <span class="badge warn">${s.validation} validar</span>
        <span class="badge ${s.blocked ? 'warn' : 'ok'}">${s.blocked} bloqueadas</span>
      </div>
      <div style="overflow:auto"><table class="tbl"><thead><tr><th>Coleccion</th><th class="num">Operaciones</th></tr></thead><tbody>${collectionRows}</tbody></table></div>
    </div>`;
  }

  function render(host, batch) {
    const risks = riskList(batch || {});
    const canAttempt = !risks.length && !!Orbit.importaWriteP0;
    host.innerHTML = `<div class="card pad" style="margin-top:16px;border:1px solid var(--line)">
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start">
        <div>
          <div class="page-sub" style="margin:0 0 4px">P0 · Escritura controlada</div>
          <h3 style="margin:0;font-family:var(--f-display)">Confirmacion reforzada</h3>
          <p class="muted" style="margin:6px 0 0;max-width:760px;font-size:13px;line-height:1.5">Este flujo solo habilita escritura despues de dry-run aprobado, sin bloqueos y con frase exacta. La escritura se ejecuta por Orbit.store y deja auditoria/rollback.</p>
        </div>
        <span class="badge ${canAttempt ? 'ok' : 'warn'}">${canAttempt ? 'listo para confirmar' : 'bloqueado'}</span>
      </div>
      <div style="margin-top:14px">${renderSummary(batch || {})}</div>
      <div class="card" style="border:1px solid var(--line);margin-top:12px;padding:12px">
        <b style="font-family:var(--f-display)">Riesgos / bloqueos</b>
        ${risks.length ? `<ul style="margin:8px 0 0;padding-left:18px;color:var(--muted)">${risks.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : '<p class="muted" style="margin:8px 0 0">Sin bloqueos detectados para intentar confirmacion.</p>'}
      </div>
      <div class="card" style="border:1px solid var(--line);margin-top:12px;padding:12px;display:grid;gap:10px">
        <label style="font-size:13px"><input type="checkbox" data-p0-confirm-approved> Confirmo que revise el dry-run, impactos y riesgos.</label>
        <label style="font-size:12px;color:var(--muted)">Frase exacta requerida</label>
        <input data-p0-confirm-phrase class="input" placeholder="${REQUIRED_PHRASE}">
        <label style="font-size:12px;color:var(--muted)">Motivo de escritura</label>
        <textarea data-p0-confirm-reason class="input" rows="3" placeholder="Motivo obligatorio para auditoria"></textarea>
        <label style="font-size:12px;color:var(--muted)">Usuario confirmador</label>
        <input data-p0-confirm-user class="input" value="usuario_actual">
        <button class="btn primary" data-p0-write ${canAttempt ? '' : 'disabled'}>Ejecutar escritura controlada</button>
        <div data-p0-confirm-result class="muted" style="font-size:12.5px"></div>
      </div>
    </div>`;

    const button = host.querySelector('[data-p0-write]');
    if (button) button.addEventListener('click', () => {
      const confirmation = confirmationFromForm(host);
      const resultEl = host.querySelector('[data-p0-confirm-result]');
      if (!Orbit.importaWriteP0) {
        resultEl.textContent = 'Contrato de escritura no disponible.';
        return;
      }
      const result = Orbit.importaWriteP0.writeBatch(batch, confirmation);
      resultEl.textContent = result.ok ? `Escritura controlada completa: ${result.written} registro(s). Rollback disponible.` : `Bloqueado: ${(result.errors || []).join(', ')}`;
    });
  }

  function mount(host, batch) { if (host) render(host, batch || { status: 'sin_lote', operations: [] }); }

  return { REQUIRED_PHRASE, ROLLBACK_PHRASE, summarizeBatch, riskList, render, mount };
})();
