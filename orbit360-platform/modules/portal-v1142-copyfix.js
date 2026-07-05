/* ============================================================
   Orbit 360 · Portal copy hotfix v1.142
   Ajuste quirúrgico de copy visible para pago reportado.
   No cambia datos, cobros, cartera ni producción.
   ============================================================ */
window.Orbit = window.Orbit || {};
(function portalV1142CopyFix() {
  function walkText(root) {
    if (!root) return;
    try {
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      var n;
      while ((n = walker.nextNode())) {
        var t = n.nodeValue || '';
        var r = t
          .replace(/✓ Pago reportado · el equipo lo validará/g, '✓ Recibimos tu reporte · pendiente de revisión/conciliación')
          .replace(/El equipo lo valida y te confirma\./g, 'Queda pendiente de revisión/conciliación y te confirmaremos cuando quede conciliado.')
          .replace(/pendiente de validar/g, 'pendiente de revisión/conciliación');
        if (r !== t) n.nodeValue = r;
      }
    } catch (e) {}
  }
  function addReportedNote(root) {
    try {
      (root || document).querySelectorAll('.pt-det-grid').forEach(function (grid) {
        if (grid.querySelector('[data-portal-v1142-note]')) return;
        var hasReported = false;
        grid.querySelectorAll('.pt-det span').forEach(function (s) {
          if ((s.textContent || '').trim() === 'Reportado') hasReported = true;
        });
        if (!hasReported) return;
        var note = document.createElement('div');
        note.className = 'cfg-note';
        note.setAttribute('data-portal-v1142-note', '1');
        note.style.marginTop = '8px';
        note.style.fontSize = '11.5px';
        note.innerHTML = '📤 Recibimos tu reporte. Está <b>pendiente de revisión/conciliación</b>; te confirmamos cuando quede conciliado.';
        grid.appendChild(note);
      });
    } catch (e) {}
  }
  function apply(root) {
    walkText(root || document.body);
    addReportedNote(root || document);
  }
  document.addEventListener('DOMContentLoaded', function () { apply(document.body); });
  document.addEventListener('click', function () { setTimeout(function () { apply(document.body); }, 60); }, true);
  document.addEventListener('orbit:store', function () { setTimeout(function () { apply(document.body); }, 80); });
  try {
    var mo = new MutationObserver(function (muts) {
      muts.forEach(function (m) { if (m.addedNodes) m.addedNodes.forEach(function (n) { if (n.nodeType === 1) apply(n); }); });
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
})();
