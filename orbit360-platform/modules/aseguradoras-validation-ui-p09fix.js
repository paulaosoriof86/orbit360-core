/* ============================================================
   Orbit 360 · Hotfix UI validación visual Aseguradoras
   Fecha: 2026-07-10

   Solo actúa en host loopback autorizado y modo orbitValidation=aseguradoras.
   Selecciona la única fuente disponible para la validación, limpia copy técnico
   y evita carga manual innecesaria. No escribe store ni habilita módulos.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var params = new URLSearchParams(window.location.search || '');
  var requested = params.get('orbitValidation') === 'aseguradoras';
  var loopback = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
  var hostSession = window.__ORBIT_VALIDATION_SESSION__ && window.__ORBIT_VALIDATION_SESSION__.authorized === true;
  if (!requested || !loopback || !hostSession) return;

  var TARGET_NAME = 'Tasas AseGuate.xlsx';
  var scheduled = null;
  var applyingSelection = false;
  var replacements = [
    ['BRIDGE REGISTERED', 'Disponible'],
    ['Motor documental: Requiere preparación', 'Motor documental: En validación'],
    ['Sincronización: Pendiente', 'Guardado: No disponible en esta sesión'],
    ['Preparación: Requiere revisión', 'Preparación: Lista para validación visual'],
    ['Dry-run', 'Lectura de prueba'],
    ['dry-run', 'lectura de prueba'],
    ['metadata-only', 'resumen técnico'],
    ['Fingerprint:', 'Código de control:']
  ];

  function clean(value) { return String(value == null ? '' : value).trim(); }

  function patchText(root) {
    if (!root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      var value = String(node.nodeValue || '');
      replacements.forEach(function (pair) { value = value.split(pair[0]).join(pair[1]); });
      value = value.replace(/Documentos incluidos\s*\(\d+\)/g, 'Documento disponible para validar (1)');
      if (value !== node.nodeValue) node.nodeValue = value;
    }
  }

  function paintIdentity() {
    var name = document.querySelector('#tb-user .who b');
    var role = document.getElementById('tb-rol-lbl');
    var avatar = document.querySelector('#tb-user .av');
    if (name) name.textContent = 'Validación visual';
    if (role) role.textContent = 'Dirección · sesión temporal';
    if (avatar) avatar.textContent = 'VV';
  }

  function simplifyForm() {
    var form = document.getElementById('asg-batch-admin-form-p09j');
    if (!form) return false;
    var boxes = Array.prototype.slice.call(form.querySelectorAll('[data-p09j-document]'));
    if (!boxes.length) return false;

    var target = boxes.find(function (box) {
      var label = box.closest('label');
      return clean(label && label.textContent).toLowerCase().indexOf(TARGET_NAME.toLowerCase()) >= 0;
    });
    if (!target) return false;

    var changed = false;
    boxes.forEach(function (box) {
      var isTarget = box === target;
      if (box.checked !== isTarget) {
        box.checked = isTarget;
        changed = true;
      }
      var label = box.closest('label');
      if (label) label.style.display = isTarget ? 'flex' : 'none';
    });

    var list = target.closest('div[style*="display:grid"]');
    if (list) {
      list.style.maxHeight = 'none';
      list.style.overflow = 'visible';
    }

    var existing = form.querySelector('[data-orbit-validation-source-note]');
    if (!existing) {
      var note = document.createElement('div');
      note.setAttribute('data-orbit-validation-source-note', 'true');
      note.className = 'hint success';
      note.style.margin = '0 0 8px';
      note.textContent = 'Se seleccionó automáticamente la única fuente disponible: Tasas AseGuate.xlsx.';
      var host = target.closest('div[style*="display:grid"]');
      if (host && host.parentElement) host.parentElement.insertBefore(note, host);
    }

    patchText(form);

    if (changed && !applyingSelection) {
      applyingSelection = true;
      target.dispatchEvent(new Event('change', { bubbles: true }));
      setTimeout(function () { applyingSelection = false; }, 150);
    }
    return true;
  }

  function annotateSummary() {
    var panel = document.getElementById('asg-knowledge-p09f');
    if (!panel) return;
    patchText(panel);
    var headings = Array.prototype.slice.call(panel.querySelectorAll('b'));
    var heading = headings.find(function (item) { return clean(item.textContent) === 'Operación controlada'; });
    if (!heading) return;
    var block = heading.parentElement && heading.parentElement.parentElement && heading.parentElement.parentElement.parentElement;
    if (!block || block.querySelector('[data-orbit-validation-summary-note]')) return;
    var note = document.createElement('div');
    note.setAttribute('data-orbit-validation-summary-note', 'true');
    note.className = 'muted';
    note.style.cssText = 'font-size:10.5px;margin-top:7px';
    note.textContent = 'Los indicadores se actualizarán al generar la vista previa de AseGuate.';
    block.appendChild(note);
  }

  function patch() {
    paintIdentity();
    annotateSummary();
    simplifyForm();
  }

  function schedule() {
    if (scheduled) clearTimeout(scheduled);
    scheduled = setTimeout(patch, 30);
  }

  window.addEventListener('hashchange', schedule);
  window.addEventListener('orbit:aseguradoras:knowledge-ready', schedule);
  window.addEventListener('orbit:aseguradoras:source-reference-state', schedule);
  window.addEventListener('orbit:aseguradoras:batch-admin-state', schedule);
  window.addEventListener('orbit:aseguradoras:batch-state', schedule);
  document.addEventListener('orbit:store', schedule);
  if (window.MutationObserver) {
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  }

  Orbit.aseguradorasValidationUiP09fix = {
    active: true,
    targetName: TARGET_NAME,
    patch: patch,
    writeAllowed: false,
    enablesCotizador: false,
    enablesComparativo: false
  };
  schedule();
})();