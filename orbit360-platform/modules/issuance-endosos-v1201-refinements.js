/* Orbit 360 · Refinamientos UX Emisión/Endosos v1.201. */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
(function () {
  const I = Orbit.issuance;
  const E = Orbit.endorsements;
  const U = Orbit.ui;
  if (!I || !E || !Orbit.ciclo || Orbit.__issuanceEndorsementsRefinedV1201) return;
  Orbit.__issuanceEndorsementsRefinedV1201 = true;

  function toast(v) { try { U.toast(v); } catch (e) {} }
  function enhance(id) {
    const request = Orbit.store && Orbit.store.get ? Orbit.store.get('gestiones', id) : null;
    const back = document.getElementById('ciclo-modal');
    if (!request || !back) return;

    if (request.workflowType === 'issuance_request') {
      const ready = back.querySelector('[data-stage="PENDIENTE_EMISION"]');
      if (ready && !ready.dataset.refinedV1201) {
        ready.dataset.refinedV1201 = '1';
        ready.onclick = async function (event) {
          event.preventDefault(); event.stopImmediatePropagation();
          const text = request.requiereInspeccion
            ? 'Confirma que los documentos están completos y que la inspección fue aprobada.'
            : 'Confirma que los documentos requeridos para emitir están completos.';
          const ok = await U.confirm(text, { title: 'Lista para emisión', ok: 'Confirmar requisitos' });
          if (!ok) return;
          const result = I.advanceRequest(request.id, 'PENDIENTE_EMISION', {
            documentosCompletos: true,
            inspeccionAprobada: request.requiereInspeccion ? true : false
          }, { motivo: 'Requisitos de emisión verificados por usuario autorizado' });
          if (!result.ok) return toast('No se pudo avanzar: ' + (result.errors || []).join(', '));
          Orbit.ciclo.openGestion(request.id);
        };
      }
      const issue = back.querySelector('[data-issue]');
      if (issue && request.emissionStage !== 'PENDIENTE_EMISION') {
        issue.disabled = true;
        issue.classList.remove('primary'); issue.classList.add('ghost');
        issue.title = 'Primero verifica documentos e inspección y marca la solicitud Lista para emisión.';
      }
    }

    if (request.workflowType === 'endorsement_request') {
      const def = E.typeDef(request.endorsementType);
      const apply = back.querySelector('[data-end-apply]');
      if (apply && (!def || !def.apply)) {
        apply.remove();
        const panel = back.querySelector('[data-workflow-v1201]');
        if (panel && !panel.querySelector('[data-end-manual]')) {
          const note = document.createElement('div'); note.dataset.endManual = '1'; note.className = 'cfg-note'; note.style.marginTop = '10px';
          note.textContent = 'Este tipo permanece como gestión operativa hasta que el tenant configure su regla de aplicación. No modifica la póliza automáticamente.';
          panel.appendChild(note);
        }
      }
    }
  }

  const previousOpen = Orbit.ciclo.openGestion.bind(Orbit.ciclo);
  Orbit.ciclo.openGestion = function (id) {
    const out = previousOpen(id);
    setTimeout(() => enhance(id), 10);
    return out;
  };
  Orbit.__issuanceEndorsementsRefinedV1201 = { previousOpen };
})();
