/* ============================================================
   Orbit 360 · Ops workflows v1.201
   Integra solicitudes de emisión tipadas dentro de la columna
   Emisiones existente, sin crear otro módulo ni otra colección.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
(function () {
  const C = Orbit.ciclo;
  const I = Orbit.issuance;
  if (!C || !I || C.__opsWorkflowsV1201) return;

  const originalBoard = C.opsBoard.bind(C);
  C.opsBoard = function () {
    const board = originalBoard() || [];
    const active = (C.gestiones ? C.gestiones() : (Orbit.store.all('gestiones') || [])).filter(g =>
      g && g.workflowType === 'issuance_request' && I.ACTIVE_STAGES.has(g.emissionStage) && !g.archivado
    );
    const col = board.find(c => c && c.def && c.def.nombre === 'Emisiones');
    if (col) {
      const ids = new Set((col.items || []).map(x => x && x.rec && x.rec.id));
      active.forEach(g => { if (!ids.has(g.id)) col.items.push({ kind: 'gestion', rec: g }); });
    }
    return board;
  };

  function lockWorkflowFields(id) {
    const g = Orbit.store.get('gestiones', id);
    const back = document.getElementById('ciclo-modal');
    if (!g || !back || !['issuance_request','endorsement_request'].includes(g.workflowType)) return;
    const list = back.querySelector('#gs-lista');
    if (list) {
      if (![...list.options].some(o => o.value === g.lista)) {
        const option = document.createElement('option'); option.value = g.lista; option.textContent = g.lista; list.appendChild(option);
      }
      list.value = g.lista; list.disabled = true;
    }
    ['#gs-tipo','#gs-estado','#gs-pol'].forEach(sel => {
      const el = back.querySelector(sel); if (el) { el.disabled = true; el.title = 'Este campo lo controla el flujo operativo.'; }
    });
  }

  const previousOpen = C.openGestion.bind(C);
  C.openGestion = function (id) {
    const out = previousOpen(id);
    setTimeout(() => lockWorkflowFields(id), 25);
    return out;
  };

  function refineAcceptedModal() {
    const modal = document.getElementById('issuance-accepted-v1201');
    if (!modal || modal.dataset.opsRefinedV1201) return;
    modal.dataset.opsRefinedV1201 = '1';
    const context = Object.assign({}, window.__orbitQuoteContext || {}, window.__orbitRenewalContext || {});
    const client = modal.querySelector('#emi-cli');
    if (client && !context.clienteId) {
      const blank = document.createElement('option'); blank.value = ''; blank.textContent = '— Seleccionar cliente —';
      client.insertBefore(blank, client.firstChild); client.value = '';
    }
    const country = modal.querySelector('#emi-pais'), currency = modal.querySelector('#emi-mon');
    if (country && currency && !(window.Orbit && Orbit._cots && Orbit._cots[0] && Orbit._cots[0].cur)) {
      currency.value = country.value === 'CO' ? 'COP' : 'GTQ';
    }
  }

  document.addEventListener('click', event => {
    if (event.target && event.target.closest && event.target.closest('#cmp-accept-v1201 [data-accept]')) setTimeout(refineAcceptedModal, 0);
  });

  function maybeOpen() {
    if (!window.__orbitOpenGestion || !String(location.hash || '').startsWith('#/ops')) return;
    const id = window.__orbitOpenGestion; window.__orbitOpenGestion = '';
    setTimeout(() => C.openGestion(id), 80);
  }
  window.addEventListener('hashchange', maybeOpen);
  document.addEventListener('orbit:ciclo', maybeOpen);
  setTimeout(maybeOpen, 100);

  C.__opsWorkflowsV1201 = { originalBoard, previousOpen };
})();
