/* ============================================================
   Orbit 360 · Aseguradoras OP-2 · guard visual del importador v1.217
   El importador base usa funciones internas. Este guard analiza el mismo
   archivo mediante la API pública sanitizada y bloquea la aprobación si
   encuentra alias/duplicados probables. No captura recursos sensibles.
   ============================================================ */
window.Orbit = window.Orbit || {};
(function () {
  const D = Orbit.insurerDirectoryImport;
  if (!D || Orbit.__aseguradorasOp2ImportUiGuardV1217) return;
  Orbit.__aseguradorasOp2ImportUiGuardV1217 = true;

  function clean(v) { return String(v == null ? '' : v).trim(); }
  function message(root, text, tone) {
    if (!root) return;
    let box = root.querySelector('[data-op2-alias-warning]');
    if (!box) {
      box = document.createElement('div');
      box.dataset.op2AliasWarning = '1';
      box.className = 'cfg-note';
      box.style.margin = '0 20px 12px';
      const footer = root.querySelector('.card > div:last-child');
      if (footer && footer.parentNode) footer.parentNode.insertBefore(box, footer);
      else root.appendChild(box);
    }
    box.style.borderLeftColor = tone === 'danger' ? 'var(--danger)' : 'var(--warn)';
    box.textContent = text;
  }
  function guardApprove(root) {
    if (!root) return;
    const button = root.querySelector('[data-approve]');
    if (!button) return;
    const state = root.dataset.op2AliasState || '';
    if (state === 'pending') {
      button.disabled = true;
      button.title = 'Revisando alias y duplicados probables.';
      return;
    }
    if (state === 'blocked' || state === 'error') {
      button.disabled = true;
      button.classList.remove('primary');
      button.classList.add('ghost');
      button.textContent = state === 'blocked'
        ? 'Resolver duplicados probables antes de importar'
        : 'Revisión de alias requerida antes de importar';
      return;
    }
    if (state === 'clear' && !button.dataset.backendGuardV1202) {
      button.disabled = false;
      button.title = '';
    }
  }
  async function inspectFile(root, file, country) {
    if (!root || !file || !country) return;
    root.dataset.op2AliasState = 'pending';
    message(root, 'Revisando alias, versiones y duplicados probables…', 'warn');
    guardApprove(root);
    try {
      const result = await D.parseFile(file, { country, captureSecure:false });
      const reviews = result && result.report && Array.isArray(result.report.duplicateReview)
        ? result.report.duplicateReview : [];
      if (reviews.length) {
        root.dataset.op2AliasState = 'blocked';
        root.dataset.op2AliasCount = String(reviews.length);
        message(root,
          'Se detectaron ' + reviews.length + ' coincidencia(s) probable(s) entre nombres de hojas o con el directorio existente. Corrige o confirma la fuente en un nuevo dry-run; Orbit no fusionará ni aplicará estas filas automáticamente.',
          'danger');
      } else {
        root.dataset.op2AliasState = 'clear';
        root.dataset.op2AliasCount = '0';
        message(root, 'Revisión de alias completada. No se detectaron coincidencias probables adicionales.', 'warn');
      }
    } catch (error) {
      root.dataset.op2AliasState = 'error';
      message(root,
        'No fue posible completar la revisión adicional de alias. La aplicación queda bloqueada para evitar duplicados; puedes revisar el archivo y repetir el dry-run.',
        'danger');
    }
    guardApprove(root);
  }
  function wire(root) {
    if (!root || root.__op2AliasUiWired) return;
    root.__op2AliasUiWired = true;
    const attach = () => {
      const file = root.querySelector('#idir-file');
      if (!file || file.dataset.op2AliasListener) return;
      file.dataset.op2AliasListener = '1';
      file.addEventListener('change', () => {
        const country = clean((root.querySelector('#idir-country') || {}).value).toUpperCase();
        const selected = file.files && file.files[0];
        if (selected && country) inspectFile(root, selected, country);
      });
    };
    attach();
    if (window.MutationObserver) {
      const observer = new MutationObserver(() => { attach(); guardApprove(root); });
      observer.observe(root, { childList:true, subtree:true });
      root.__op2AliasObserver = observer;
    }
  }

  const previousOpen = D.open.bind(D);
  D.open = function () {
    const out = previousOpen.apply(D, arguments);
    setTimeout(() => wire(document.getElementById('ins-dir-import-v1202')), 0);
    return out;
  };
  D.__op2ImportUiGuardV1217 = { previousOpen, wire, inspectFile, guardApprove };
})();
