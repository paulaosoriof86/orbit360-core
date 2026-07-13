/* ============================================================
   Orbit 360 · Guard de escritura Directorios Aseguradoras v1.220
   El análisis puede operar sin conexión operativa. La aplicación de
   contactos reales exige un servicio seguro del tenant sin fallback.
   Sanitiza mensajes visibles y evita códigos técnicos en la UI.
   ============================================================ */
window.Orbit = window.Orbit || {};
(function () {
  const D = Orbit.insurerDirectoryImport;
  if (!D || D.__backendWriteGuardV1220) return;

  const ERROR_COPY = {
    permiso_importacion_denegado:'Tu rol activo no tiene permiso para confirmar esta importación.',
    dry_run_requerido:'Primero completa la revisión previa del archivo.',
    confirmacion_reforzada_requerida:'Completa el motivo y la frase de confirmación solicitada.',
    dry_run_con_bloqueos_aplicar_solo_validos:'Existen registros pendientes de validación. Solo pueden confirmarse los registros validados.',
    sin_operaciones_validadas:'No hay registros validados disponibles para confirmar.',
    backend_operativo_requerido_para_aplicar_datos_reales:'La conexión segura de la organización aún no está disponible.',
    pais_directorio_requerido:'Selecciona el país que corresponde al directorio.',
    xlsx_no_disponible:'No fue posible leer el archivo. Intenta nuevamente o verifica su formato.'
  };

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
      if (Orbit.ui && Orbit.ui.toast) Orbit.ui.toast('El análisis está disponible. Para confirmar cambios se necesita la conexión segura de la organización.');
    } catch (e) {}
  }
  function friendlyError(value) {
    const key = String(value == null ? '' : value).trim();
    if (!key) return '';
    if (ERROR_COPY[key]) return ERROR_COPY[key];
    if (/^[a-z0-9_]+$/i.test(key)) return 'La operación requiere una revisión adicional antes de continuar.';
    return key.replace(/\b(?:Orbit\.store|credentialRef|accountRef|backend_required|Firestore|Firebase|LAB|mock)\b/gi, 'configuración protegida');
  }
  function sanitizeResult(result) {
    if (!result || !Array.isArray(result.errors)) return result;
    return Object.assign({}, result, { errors:result.errors.map(friendlyError).filter(Boolean) });
  }
  function guardApproveButton(root) {
    const button = root && root.querySelector && root.querySelector('[data-approve]');
    if (!button || button.dataset.backendGuardV1220) return;
    button.dataset.backendGuardV1220 = '1';
    if (backendWriteAllowed()) return;
    const replacement = button.cloneNode(true);
    replacement.disabled = true;
    replacement.classList.remove('primary'); replacement.classList.add('ghost');
    replacement.textContent = 'Conexión segura requerida para confirmar';
    replacement.title = 'Puedes revisar el resultado. La confirmación se habilita cuando la conexión segura esté disponible.';
    replacement.onclick = explain;
    button.replaceWith(replacement);
  }
  function friendlyVisibleText(text) {
    const value = String(text || '').trim();
    if (!value) return value;
    if (/Orbit\.store|credentialRef|accountRef|backend_required/i.test(value)) {
      return 'Los datos protegidos no se muestran ni se guardan junto con el directorio. Permanecen separados hasta completar la conexión segura.';
    }
    if (/repositorio|se procesa en el navegador/i.test(value)) {
      return 'El archivo se revisa de forma segura y solo se conserva el resultado de la revisión.';
    }
    if (/xlsx_no_disponible/i.test(value)) return ERROR_COPY.xlsx_no_disponible;
    if (/pais_directorio_requerido/i.test(value)) return ERROR_COPY.pais_directorio_requerido;
    if (/backend_operativo_requerido_para_aplicar_datos_reales/i.test(value)) return ERROR_COPY.backend_operativo_requerido_para_aplicar_datos_reales;
    if (/No se pudo procesar el Excel:\s*[a-z0-9_]+/i.test(value)) return 'No fue posible completar la revisión del archivo. Verifica el formato y repite el proceso.';
    return value.replace(/\b(?:Firestore|Firebase|backend|LAB|localStorage|mock)\b/gi, 'servicio seguro');
  }
  function cleanVisibleCopy(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('.cfg-note,#idir-status,[data-op2-alias-warning]').forEach(node => {
      const next = friendlyVisibleText(node.textContent || '');
      if (next && next !== String(node.textContent || '').trim()) node.textContent = next;
    });
    root.querySelectorAll('[title]').forEach(node => {
      const next = friendlyVisibleText(node.getAttribute('title') || '');
      if (next) node.setAttribute('title', next);
    });
  }
  function watchModal() {
    const modal = document.getElementById('ins-dir-import-v1202');
    if (!modal || modal.__backendGuardV1220) return;
    modal.__backendGuardV1220 = true;
    guardApproveButton(modal); cleanVisibleCopy(modal);
    if (window.MutationObserver) {
      const observer = new MutationObserver(() => { guardApproveButton(modal); cleanVisibleCopy(modal); });
      observer.observe(modal, { childList:true, subtree:true, characterData:true });
      modal.__backendGuardObserverV1220 = observer;
    }
  }

  const originalApply = D.applyApproved.bind(D);
  D.applyApproved = function (result, confirmation) {
    if (!backendWriteAllowed()) return { ok:false, errors:[ERROR_COPY.backend_operativo_requerido_para_aplicar_datos_reales] };
    return sanitizeResult(originalApply(result, confirmation));
  };
  const originalOpen = D.open.bind(D);
  D.open = function () {
    const out = originalOpen.apply(D, arguments);
    setTimeout(watchModal, 0);
    return out;
  };

  D.backendWriteAllowed = backendWriteAllowed;
  D.backendState = backendState;
  D.friendlyImportError = friendlyError;
  D.__backendWriteGuardV1220 = { originalApply, originalOpen, friendlyError, friendlyVisibleText };
})();
