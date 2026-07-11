/* Orbit 360 · Portal v1.198 — permisos y visor transversal. */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
(function () {
  const mod = Orbit.modules.portal;
  if (!mod || !mod.render || mod.__portalV1198) return;
  const original = mod.render.bind(mod);
  mod.render = function (host) {
    const out = original(host);
    setTimeout(() => {
      if (!host) return;
      const admin = host.querySelector('#pt-admin');
      if (admin && !(Orbit.access && Orbit.access.can('portal', 'edit'))) admin.remove();
      host.querySelectorAll('[data-doc]').forEach(el => {
        el.addEventListener('click', e => {
          const d = Orbit.store.get('documentos', el.dataset.doc);
          if (!d || !Orbit.documentViewer) return;
          e.preventDefault(); e.stopImmediatePropagation();
          const cli = Orbit.store.get('clientes', d.clienteId) || {};
          Orbit.documentViewer.open({
            documentRef: d.documentRef || d.archivoRef || d.fileId || '',
            nombre: d.nombre || d.tipo || 'Documento', tipo: d.tipo || d.mimeType || '',
            origen: d.origen || 'Portal del cliente', pais: cli.pais || '',
            version: d.version || '', vigencia: d.vigencia || d.vigenciaHasta || '',
            estado: d.estado || d.storageEstado || 'Registrado', responsable: d.responsable || '',
            externalUrl: d.driveUrl || d.url || ''
          }, { context: { module: 'portal', clienteId: d.clienteId || '', documentId: d.id } });
        }, true);
      });
    }, 0);
    return out;
  };
  mod.__portalV1198 = { original };
})();
