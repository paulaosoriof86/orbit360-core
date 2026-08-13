/* Orbit 360 · P0.9l · Hotfix aditivo de copy para operación documental. */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  var ROOT_ID = 'asg-batch-admin-form-p09j';
  var scheduled = null;
  var replacements = [
    ['Genera preview y dry-run. No guarda conocimiento ni activa Cotizador o Comparativo.', 'Genera una vista previa y una lectura de prueba. No guarda conocimiento ni activa Cotizador o Comparativo.'],
    ['Dry-run del lote', 'Lectura de prueba del lote'],
    ['El backend resuelve las referencias. No debes copiar rutas ni IDs.', 'Orbit localiza los archivos autorizados automáticamente. No debes copiar rutas ni identificadores técnicos.'],
    ['Referencia disponible', 'Archivo disponible'],
    ['Referencia pendiente', 'Archivo pendiente'],
    ['Fingerprint:', 'Código de control:'],
    ['Referencias disponibles:', 'Archivos disponibles:'],
    ['Valores técnicos ocultos.', 'Las ubicaciones permanecen protegidas.'],
    ['Ejecutar sin persistir conocimiento', 'Ejecutar lectura sin guardar conocimiento'],
    ['Conocimiento persistido: no', 'Conocimiento guardado: no'],
    ['El rol activo puede revisar el dry-run, pero no persistir el historial global.', 'El rol activo puede revisar la lectura, pero no guardar el historial global.'],
    ['Confirmo el plan metadata-only.', 'Confirmo el resumen de la ejecución.'],
    ['Confirmo la persistencia separada del historial.', 'Confirmo que solo se guardará el historial, sin el contenido de los archivos.'],
    ['BACKEND_REQUIRED: broker de referencias no disponible.', 'La conexión de archivos está pendiente.'],
    ['Vista previa generada; el backend aún no resolvió todas las referencias.', 'Vista previa generada; todavía hay archivos pendientes de localizar.'],
    ['OK: dry-run completado sin persistir conocimiento.', 'OK: lectura terminada sin guardar conocimiento.'],
    ['No se pudo ejecutar el dry-run.', 'No se pudo completar la lectura.'],
    ['OK: historial metadata-only persistido.', 'OK: historial guardado.'],
    ['persistir el historial', 'guardar el historial'],
    ['Persistidas', 'Guardadas'],
    ['Sin referencia', 'Archivo pendiente'],
    ['Fallidos', 'Requieren revisión']
  ];
  function patchText(value) {
    var out = String(value || '');
    replacements.forEach(function (pair) { out = out.split(pair[0]).join(pair[1]); });
    return out;
  }
  function patch() {
    var root = document.getElementById(ROOT_ID);
    if (!root) return false;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      var next = patchText(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
    }
    root.querySelectorAll('[title]').forEach(function (el) {
      var next = patchText(el.getAttribute('title'));
      if (next !== el.getAttribute('title')) el.setAttribute('title', next);
    });
    return true;
  }
  function schedule() {
    if (scheduled) clearTimeout(scheduled);
    scheduled = setTimeout(function retry(attempt) {
      if (patch() || attempt >= 20) return;
      scheduled = setTimeout(function () { retry(attempt + 1); }, 120);
    }.bind(null, 0), 0);
  }
  Orbit.aseguradorasBatchAdminCopyP09l = { patch: patch, schedule: schedule, replacements: replacements.slice() };
  window.addEventListener('hashchange', schedule);
  window.addEventListener('orbit:aseguradoras:knowledge-ready', schedule);
  window.addEventListener('orbit:aseguradoras:source-reference-state', schedule);
  window.addEventListener('orbit:aseguradoras:batch-admin-state', schedule);
  window.addEventListener('orbit:aseguradoras:batch-state', schedule);
  document.addEventListener('orbit:store', schedule);
  if (window.MutationObserver) {
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  }
  schedule();
})();
