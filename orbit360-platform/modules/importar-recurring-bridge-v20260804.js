/* Orbit 360 · Bridge UX de importaciones recurrentes
   Añade contratos operativos sin sobrescribir core/importa.js. */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  Orbit.modules = Orbit.modules || {};

  const VERSION = 'orbit360-importar-recurring-bridge-v1';
  const LABELS = Object.freeze({
    receipt_schedule: 'Calendario de recibos',
    reported_payments: 'Pagos reportados',
    insurer_payment_report: 'Reporte de pagos de aseguradora',
    portfolio_statement: 'Estado de cartera',
    commission_statement: 'Planilla de comisiones',
    bank_statement: 'Estado de cuenta bancario',
    supporting_document: 'Documento de soporte'
  });
  function esc(value) {
    try { return Orbit.ui && Orbit.ui.esc ? Orbit.ui.esc(value) : String(value || ''); }
    catch (e) { return String(value || ''); }
  }
  function statusCopy(state) {
    return {
      DRAFT: 'Borrador',
      STAGED: 'Preparado',
      VALIDATION_REQUIRED: 'Requiere validación',
      CONFIRMED: 'Confirmado',
      ROLLED_BACK: 'Revertido'
    }[state] || state || 'Sin iniciar';
  }
  function renderContract(host) {
    if (!host || host.querySelector('[data-recurring-import-contract]')) return;
    const block = document.createElement('section');
    block.dataset.recurringImportContract = VERSION;
    block.className = 'card';
    block.style.marginTop = '16px';
    block.innerHTML = `
      <div class="card-h"><div><h3>Importaciones mensuales</h3><p class="muted">Carga recurrente con mapeo, dry-run, trazabilidad, conciliación y rollback.</p></div></div>
      <div class="card-b">
        <div class="cfg-note"><b>Flujo único.</b> Adjuntar → detectar → mapear → normalizar → revisar calidad → confirmar evidencia → conciliar → aplicar. Ningún estado bancario crea cobros por sí solo.</div>
        <div class="grid-3" style="margin-top:12px">
          ${Object.entries(LABELS).map(([id, label]) => `<button class="btn ghost" data-recurring-kind="${id}">${esc(label)}</button>`).join('')}
        </div>
        <div class="muted" style="margin-top:12px">Los perfiles aprendidos se guardan por tenant y fuente. La siguiente entrega reutiliza el perfil, pero siempre muestra el diff y los casos que requieren validación.</div>
      </div>`;
    host.appendChild(block);
    block.querySelectorAll('[data-recurring-kind]').forEach(button => button.addEventListener('click', () => {
      const kind = button.dataset.recurringKind;
      if (Orbit.importa && Orbit.importa.open) {
        Orbit.importa.open(kind, {
          recurring: true,
          contractVersion: VERSION,
          sourceLabel: LABELS[kind],
          onDone: result => document.dispatchEvent(new CustomEvent('orbit:recurring-import', { detail: { kind, result, status: statusCopy(result && result.status) } }))
        });
      }
    }));
  }
  const original = Orbit.modules.importar && Orbit.modules.importar.render;
  if (typeof original === 'function') {
    Orbit.modules.importar.render = function (host) {
      const out = original.call(this, host);
      setTimeout(() => renderContract(host), 0);
      return out;
    };
  }
  Orbit.importarRecurringBridge = Object.freeze({ VERSION, LABELS, renderContract });
})();
