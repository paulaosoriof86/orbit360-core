/* ============================================================
   Orbit 360 · Guard de escritura Directorios Aseguradoras v1.202
   El análisis puede operar sin conexión operativa. La aplicación de
   contactos reales exige un servicio seguro del tenant sin fallback.
   ============================================================ */
window.Orbit = window.Orbit || {};
(function () {
  const D = Orbit.insurerDirectoryImport;
  if (!D || D.__backendWriteGuardV1202) return;

  function backendState() {
    try {
      if (window.OrbitBackend && typeof OrbitBackend.status === 'function') {
        const state = OrbitBackend.status() || {};
        if (state.mode || state.noFallback != null) return state;
      }
    } catch (e) {}
    try {
      const raw = Orbit.store && Orbit.store.raw && Orbit.store.raw();
      if (raw && raw.__backend) return raw.__backend;
    } catch (e) {}
    return {};
  }
  function backendWriteAllowed() {
    const state = backendState();
    const mode = String(state.mode || state.adapter || '').toLowerCase();
    const tenant = String(state.tenantId || state.tenant || '');
    const remoteMode = /firestore|backend|api|remote|production/.test(mode);
    return !!tenant && remoteMode && state.noFallback !== false;
  }
  function explain() {
    try {
      if (Orbit.ui && Orbit.ui.toast) Orbit.ui.toast('El análisis está disponible. Para confirmar cambios reales se necesita la conexión segura de la organización.');
    } catch (e) {}
  }
  function guardApproveButton(root) {
    const button = root && root.querySelector && root.querySelector('[data-approve]');
    if (!button || button.dataset.backendGuardV1202) return;
    button.dataset.backendGuardV1202 = '1';
    if (backendWriteAllowed()) return;
    const replacement = button.cloneNode(true);
    replacement.disabled = true;
    replacement.classList.remove('primary'); replacement.classList.add('ghost');
    replacement.textContent = 'Conexión segura requerida para aplicar';
    replacement.title = 'Puedes revisar el resultado. La confirmación se habilita cuando la conexión segura esté disponible.';
    replacement.onclick = explain;
    button.replaceWith(replacement);
  }
  function cleanVisibleCopy(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('.cfg-note,#idir-status').forEach(node => {
      const text = String(node.textContent || '');
      if (/Orbit\.store|credentialRef|accountRef|backend_required|repositorio|navegador/i.test(text)) {
        node.innerHTML = 'Los datos sensibles permanecen protegidos. La plataforma mostrará únicamente referencias autorizadas hasta completar la conexión segura.';
      }
    });
  }
  function watchModal() {
    const modal = document.getElementById('ins-dir-import-v1202');
    if (!modal || modal.__backendGuardV1202) return;
    modal.__backendGuardV1202 = true;
    guardApproveButton(modal); cleanVisibleCopy(modal);
    if (window.MutationObserver) {
      const observer = new MutationObserver(() => { guardApproveButton(modal); cleanVisibleCopy(modal); });
      observer.observe(modal, { childList: true, subtree: true });
      modal.__backendGuardObserverV1202 = observer;
    }
  }

  const originalApply = D.applyApproved.bind(D);
  D.applyApproved = function (result, confirmation) {
    if (!backendWriteAllowed()) return { ok: false, errors: ['backend_operativo_requerido_para_aplicar_datos_reales'] };
    return originalApply(result, confirmation);
  };
  const originalOpen = D.open.bind(D);
  D.open = function () {
    const out = originalOpen.apply(D, arguments);
    setTimeout(watchModal, 0);
    return out;
  };

  D.backendWriteAllowed = backendWriteAllowed;
  D.backendState = backendState;
  D.__backendWriteGuardV1202 = { originalApply, originalOpen };
})();
