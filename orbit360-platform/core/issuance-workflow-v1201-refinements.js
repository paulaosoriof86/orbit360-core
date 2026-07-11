/* Orbit 360 · Refinamientos de emisión v1.201. */
window.Orbit = window.Orbit || {};
(function () {
  const I = Orbit.issuance;
  if (!I || I.__refinementsV1201) return;
  const originalAdvance = I.advanceRequest.bind(I);
  const originalIssue = I.issueRequest.bind(I);

  I.advanceRequest = function (id, nextStage, patch, options) {
    patch = patch || {};
    const request = Orbit.store && Orbit.store.get ? Orbit.store.get('gestiones', id) : null;
    if (request && nextStage === 'PENDIENTE_EMISION') {
      const documentsReady = patch.documentosCompletos === true || request.documentosCompletos === true;
      const inspectionReady = !request.requiereInspeccion || patch.inspeccionAprobada === true || request.inspeccionAprobada === true;
      if (!documentsReady) return { ok: false, errors: ['documentos_emision_incompletos'] };
      if (!inspectionReady) return { ok: false, errors: ['inspeccion_pendiente'] };
      const checklist = [].concat(request.checklist || []).map(item => {
        if (/Documentos requeridos completos/i.test(item.t || '')) return Object.assign({}, item, { done: true });
        if (/Inspección aprobada/i.test(item.t || '')) return Object.assign({}, item, { done: true });
        return item;
      });
      patch = Object.assign({}, patch, { documentosCompletos: true, inspeccionAprobada: inspectionReady, checklist });
    }
    return originalAdvance(id, nextStage, patch, options);
  };

  I.issueRequest = function (id, policyInput, options) {
    policyInput = policyInput || {};
    const request = Orbit.store && Orbit.store.get ? Orbit.store.get('gestiones', id) : null;
    if (!request) return { ok: false, errors: ['solicitud_emision_no_encontrada'] };
    if (request.policyCreatedId) return originalIssue(id, policyInput, options);
    if (request.emissionStage !== 'PENDIENTE_EMISION') return { ok: false, errors: ['solicitud_no_lista_para_emision'] };
    if (!request.documentosCompletos) return { ok: false, errors: ['documentos_emision_incompletos'] };
    if (request.requiereInspeccion && !request.inspeccionAprobada) return { ok: false, errors: ['inspeccion_pendiente'] };
    const source = request.sourcePolicyId && Orbit.store.get ? Orbit.store.get('polizas', request.sourcePolicyId) : null;
    if (source && source.vigenciaFin && policyInput.vigenciaInicio && String(policyInput.vigenciaInicio) < String(source.vigenciaFin)) {
      return { ok: false, errors: ['traslape_requiere_regla_tenant'], sourceEnd: source.vigenciaFin, newStart: policyInput.vigenciaInicio };
    }
    return originalIssue(id, policyInput, options);
  };

  I.__refinementsV1201 = { originalAdvance, originalIssue };
})();
