/* Orbit 360 · Bridge UX de importaciones recurrentes
   Añade un flujo seguro sin sobrescribir core/importa.js ni Orbit.store. */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  Orbit.modules = Orbit.modules || {};

  const VERSION = 'orbit360-importar-recurring-bridge-v2';
  const LABELS = Object.freeze({
    receipt_schedule: 'Calendario de recibos',
    reported_payments: 'Pagos reportados',
    insurer_payment_report: 'Reporte de pagos de aseguradora',
    portfolio_statement: 'Estado de cartera',
    commission_statement: 'Planilla de comisiones',
    bank_statement: 'Estado de cuenta bancario',
    supporting_document: 'Documento de soporte'
  });
  const state = { sourceType: '', file: null, extraction: null, batchId: '', preview: null, busy: false };

  function esc(value) {
    try { return Orbit.ui && Orbit.ui.esc ? Orbit.ui.esc(value) : String(value || ''); }
    catch (e) { return String(value || ''); }
  }
  function active() {
    try { return !!(window.OrbitBackend && OrbitBackend.featureFlags && OrbitBackend.featureFlags.recurringInsuranceImportActive === true); }
    catch (e) { return false; }
  }
  function toast(message) {
    if (Orbit.ui && Orbit.ui.toast) Orbit.ui.toast(message);
    else alert(message);
  }
  function ensureModal() {
    let back = document.getElementById('recurring-import-back');
    let modal = document.getElementById('recurring-import-modal');
    if (!back) {
      back = document.createElement('div'); back.id = 'recurring-import-back'; back.className = 'drawer-back'; document.body.appendChild(back);
      back.addEventListener('click', close);
    }
    if (!modal) {
      modal = document.createElement('div'); modal.id = 'recurring-import-modal'; modal.className = 'drawer'; document.body.appendChild(modal);
    }
    return { back, modal };
  }
  function close() {
    const back = document.getElementById('recurring-import-back');
    const modal = document.getElementById('recurring-import-modal');
    if (back) back.classList.remove('open');
    if (modal) modal.classList.remove('open');
  }
  function open(sourceType) {
    state.sourceType = sourceType; state.file = null; state.extraction = null; state.batchId = ''; state.preview = null; state.busy = false;
    const dom = ensureModal(); dom.back.classList.add('open'); dom.modal.classList.add('open'); paint();
  }
  function previewSummary() {
    const p = state.preview && state.preview.preview || state.preview || null;
    const c = p && p.counts || {};
    if (!p) return '';
    return `<div class="card" style="margin-top:12px"><div class="card-b"><b>Dry-run</b><div class="grid-4" style="margin-top:8px"><div><span class="muted">Total</span><b>${c.total || 0}</b></div><div><span class="muted">Listos</span><b>${c.ready || 0}</b></div><div><span class="muted">Validar</span><b>${c.requiresValidation || 0}</b></div><div><span class="muted">Omitir</span><b>${c.omitted || 0}</b></div></div></div></div>`;
  }
  function rowsTable() {
    const rows = state.extraction && state.extraction.rows || [];
    if (!rows.length) return '';
    const fields = Object.keys(rows[0]).filter(key => !/^source/.test(key)).slice(0, 8);
    return `<div class="card" style="overflow:auto;margin-top:12px"><table class="tbl"><thead><tr>${fields.map(field => `<th>${esc(field)}</th>`).join('')}</tr></thead><tbody>${rows.slice(0, 12).map(row => `<tr>${fields.map(field => `<td>${esc(row[field])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  function paint() {
    const modal = ensureModal().modal;
    const label = LABELS[state.sourceType] || 'Importación mensual';
    modal.innerHTML = `<div class="imp-head"><div><div class="imp-eyebrow">Importación mensual reusable</div><div class="imp-title">📥 ${esc(label)}</div></div><button class="imp-x" id="ri-close">✕</button></div>
      <div class="imp-body">
        <div class="cfg-note"><b>Flujo seguro.</b> El archivo se extrae y normaliza sin escribir directamente en la plataforma. Primero se crea evidencia, después se concilia y solo al final se aplica al recibo.</div>
        ${!active() ? '<div class="cfg-note" style="margin-top:10px"><b>Servicio pendiente de activación LAB.</b> El contrato está disponible, pero la confirmación permanece bloqueada hasta completar el gate.</div>' : ''}
        <label class="imp-drop" style="display:block;margin-top:12px;cursor:pointer"><div style="font-size:36px">⬆️</div><b>Seleccionar documento</b><div class="muted">Excel, CSV, PDF, Word o imagen</div><input id="ri-file" type="file" accept=".xlsx,.xls,.csv,.tsv,.txt,.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.bmp,.tif,.tiff" style="display:none"></label>
        ${state.file ? `<div class="mail-chip" style="margin-top:10px">📎 ${esc(state.file.name)}</div>` : ''}
        ${state.busy ? '<div class="cfg-note" style="margin-top:12px">Procesando y verificando el documento…</div>' : ''}
        ${rowsTable()}
        ${state.extraction && state.extraction.requiresBackendExtraction ? '<div class="cfg-note" style="margin-top:10px">El documento no tiene estructura tabular suficiente. Requiere extracción inteligente del backend antes de confirmar.</div>' : ''}
        ${previewSummary()}
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px"><button class="btn ghost" id="ri-cancel">Cerrar</button>${state.extraction && state.extraction.rows && state.extraction.rows.length ? '<button class="btn ghost" id="ri-stage">Preparar dry-run</button>' : ''}${state.preview ? '<button class="btn primary" id="ri-confirm">Confirmar evidencia</button>' : ''}</div>
      </div>`;
    modal.querySelector('#ri-close').addEventListener('click', close);
    modal.querySelector('#ri-cancel').addEventListener('click', close);
    modal.querySelector('#ri-file').addEventListener('change', async event => {
      const file = event.target.files && event.target.files[0]; if (!file) return;
      state.file = file; state.busy = true; state.extraction = null; state.preview = null; paint();
      try {
        if (!Orbit.recurringDocumentExtractor) throw new Error('El extractor recurrente no está disponible.');
        state.extraction = await Orbit.recurringDocumentExtractor.extract(file, state.sourceType, {});
      } catch (error) { toast('No se pudo preparar el documento: ' + String(error && error.message || error)); }
      state.busy = false; paint();
    });
    const stage = modal.querySelector('#ri-stage');
    if (stage) stage.addEventListener('click', async () => {
      if (!active()) { toast('La activación LAB sigue pendiente del gate.'); return; }
      try {
        state.busy = true; paint();
        const created = await Orbit.recurringImport.createBatch({
          sourceType: state.sourceType,
          sourceFileHash: state.extraction.sourceFileHash,
          sourceFileName: state.extraction.sourceFileName,
          mapping: Object.fromEntries(Object.keys(state.extraction.mapping || {}).map(field => [field, field]))
        }, { reason: 'Preparar importación mensual desde la plataforma' });
        state.batchId = created.batchId;
        await Orbit.recurringImport.stageRows(state.batchId, state.extraction.rows, { reason: 'Normalizar y validar filas importadas' });
        state.preview = await Orbit.recurringImport.preview(state.batchId, { reason: 'Revisar dry-run de importación' });
      } catch (error) { toast('No se pudo preparar el dry-run: ' + String(error && error.message || error)); }
      state.busy = false; paint();
    });
    const confirm = modal.querySelector('#ri-confirm');
    if (confirm) confirm.addEventListener('click', async () => {
      if (!active()) { toast('La activación LAB sigue pendiente del gate.'); return; }
      try {
        state.busy = true; paint();
        await Orbit.recurringImport.confirm(state.batchId, { reason: 'Confirmar evidencia del documento importado' });
        toast('La evidencia quedó confirmada. Continúa la revisión en Conciliaciones.'); close();
      } catch (error) { toast('No se pudo confirmar: ' + String(error && error.message || error)); state.busy = false; paint(); }
    });
  }
  function renderContract(host) {
    if (!host || host.querySelector('[data-recurring-import-contract]')) return;
    const block = document.createElement('section');
    block.dataset.recurringImportContract = VERSION;
    block.className = 'card';
    block.style.marginTop = '16px';
    block.innerHTML = `<div class="card-h"><div><h3>Importaciones mensuales</h3><p class="muted">Perfiles reutilizables, dry-run, trazabilidad, conciliación y rollback.</p></div></div><div class="card-b"><div class="grid-3">${Object.entries(LABELS).map(([id, label]) => `<button class="btn ghost" data-recurring-kind="${id}">${esc(label)}</button>`).join('')}</div><div class="muted" style="margin-top:12px">Cada nueva entrega reutiliza el perfil del tenant, pero conserva revisión, diff y validaciones.</div></div>`;
    host.appendChild(block);
    block.querySelectorAll('[data-recurring-kind]').forEach(button => button.addEventListener('click', () => open(button.dataset.recurringKind)));
  }
  const original = Orbit.modules.importar && Orbit.modules.importar.render;
  if (typeof original === 'function') {
    Orbit.modules.importar.render = function (host) {
      const out = original.call(this, host);
      setTimeout(() => renderContract(host), 0);
      return out;
    };
  }
  Orbit.importarRecurringBridge = Object.freeze({ VERSION, LABELS, renderContract, open, writesStore: false });
})();
