/* ============================================================
   Orbit 360 · Ops workflows v1.201 + acceso Asesor v20260804
   Integra solicitudes de emisión tipadas dentro de la columna
   Emisiones y permite al Asesor consultar Ops únicamente dentro
   de su alcance propio. No abre el tablero completo ni la gestión
   administrativa del tenant.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
(function () {
  const C = Orbit.ciclo;
  const I = Orbit.issuance;
  if (!C || !I || C.__opsWorkflowsV1201) return;
  const U = Orbit.ui, K = Orbit.kit;

  function advisorActive() {
    try { return !!(Orbit.session && Orbit.session.esAsesor && Orbit.session.esAsesor()); }
    catch (e) { return false; }
  }

  /* El rol Asesor sí usa Ops, pero el motor de acceso limita el scope a own. */
  if (Orbit.ROLES && Orbit.ROLES.Asesor) {
    const modules = Orbit.ROLES.Asesor.modulos || Orbit.ROLES.Asesor.modules || [];
    if (!modules.includes('ops')) modules.splice(Math.min(2, modules.length), 0, 'ops');
    Orbit.ROLES.Asesor.modulos = modules;
    Orbit.ROLES.Asesor.desc = 'Su cartera, sus gestiones y su pipeline. Ops limitado a clientes y procesos propios; sin configuración global.';
  }

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
    if (advisorActive() && Orbit.access && Orbit.access.canView) {
      return board.map(column => Object.assign({}, column, {
        items: (column.items || []).filter(item => {
          const collection = item.kind === 'negocio' ? 'negocios' : 'gestiones';
          return Orbit.access.canView(collection, item.rec, 'ops');
        })
      }));
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

  function lockAdvisorModal() {
    if (!advisorActive()) return;
    const back = document.getElementById('ciclo-modal');
    if (!back || back.dataset.advisorReadonly === '1') return;
    back.dataset.advisorReadonly = '1';
    const header = back.querySelector('.ciclo-h-act');
    if (header) header.insertAdjacentHTML('afterbegin', '<span class="ciclo-syncbadge">Vista de seguimiento · alcance propio</span>');
    back.querySelectorAll('input,select,textarea').forEach(el => { el.disabled = true; });
    back.querySelectorAll('.ciclo-actions,[data-act],[data-gact],#ng-save,#gs-save,#ng-chk-add,#gs-chk-add,#ng-com-add').forEach(el => { el.style.display = 'none'; });
    back.querySelectorAll('.cadd').forEach(el => { el.style.display = 'none'; });
    const foot = back.querySelector('.ciclo-foot');
    if (foot) {
      const info = document.createElement('div');
      info.className = 'cfg-note';
      info.style.marginRight = 'auto';
      info.textContent = 'Puedes consultar estado, próxima acción, notas, checklist y bitácora. Las transiciones operativas corresponden al equipo autorizado.';
      foot.insertBefore(info, foot.firstChild);
    }
  }

  const previousOpen = C.openGestion.bind(C);
  C.openGestion = function (id) {
    const out = previousOpen(id);
    setTimeout(() => { lockWorkflowFields(id); lockAdvisorModal(); }, 25);
    return out;
  };
  const previousBusinessOpen = C.openNegocio.bind(C);
  C.openNegocio = function (id) {
    const out = previousBusinessOpen(id);
    setTimeout(lockAdvisorModal, 25);
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

  function correctLegend(host) {
    if (!host || !host.querySelector) return;
    const label = host.querySelector('.ops-legend .muted');
    if (!label) return;
    const businesses = host.querySelectorAll('[data-neg]').length;
    const managements = host.querySelectorAll('[data-ges]').length;
    const prefix = advisorActive() ? 'Tu operación' : 'Tablero operativo en vivo';
    const html = `${prefix} · <b>${businesses}</b> negocios en flujo · <b>${managements}</b> gestiones`;
    if (label.innerHTML !== html) label.innerHTML = html;
  }

  function advisorColumn(column) {
    const L = column.def;
    const cards = (column.items || []).map(item => item.kind === 'negocio'
      ? C.cardNegocio(item.rec, { board: 'ops' })
      : C.cardGestion(item.rec)).join('');
    return `<div class="kcol"><div class="kcol-h2" style="--lc:${L.color}"><span class="kcol-emoji">${L.emoji}</span><b>${L.nombre}</b><span class="kcount">${(column.items || []).length}</span></div><div class="kcol-body">${cards || '<div class="kempty">Sin gestiones en tu alcance</div>'}</div></div>`;
  }

  let advisorHost = null;
  let advisorQuery = '';
  function renderAdvisor(host) {
    advisorHost = host;
    let board = C.opsBoard();
    const q = advisorQuery.toLowerCase();
    if (q) board = board.map(column => Object.assign({}, column, {
      items: (column.items || []).filter(item => {
        const r = item.rec || {};
        const client = r.clienteId ? Orbit.store.get('clientes', r.clienteId) : null;
        const insurer = r.aseguradoraId ? Orbit.store.get('aseguradoras', r.aseguradoraId) : null;
        return [r.titulo, r.nombre, r.tipo, r.numero, client && client.nombre, insurer && insurer.nombre].join(' ').toLowerCase().includes(q);
      })
    }));
    const total = board.reduce((sum, column) => sum + (column.items || []).length, 0);
    host.innerHTML = `<div class="page">${K.bannerFor('ops', '')}
      <div class="cfg-note" style="margin-bottom:12px"><b>Seguimiento de tu operación.</b> Aquí ves únicamente gestiones, cotizaciones, inspecciones y emisiones asociadas a tus clientes y oportunidades. No se muestran procesos de otros asesores.</div>
      <div class="ops-toolbar"><input id="op-advisor-q" class="o-sel ops-search" placeholder="Buscar en mis gestiones…" value="${U.esc(advisorQuery)}"><span class="badge info">${total} en tu alcance</span></div>
      <div class="ops-legend"><span class="muted"></span><span class="ops-sync">🔔 Cambios y resoluciones notificables</span></div>
      <div class="kanban">${board.map(advisorColumn).join('')}</div></div>`;
    C.wireCards(host);
    const input = host.querySelector('#op-advisor-q');
    if (input) input.addEventListener('input', () => { advisorQuery = input.value; renderAdvisor(host); });
    correctLegend(host);
  }

  const resolutionState = new Map();
  let resolutionInitialized = false;
  function scanAdvisorResolutionNotifications() {
    if (!advisorActive()) { resolutionState.clear(); resolutionInitialized = false; return; }
    const rows = C.gestiones ? C.gestiones() : [];
    rows.forEach(g => {
      const signature = [g.estado, g.resultado || g.nota || g.notas || '', g.actualizado || g.updatedAt || ''].join('|');
      const previous = resolutionState.get(g.id);
      if (resolutionInitialized && previous && previous !== signature && String(g.estado || '').toLowerCase() === 'resuelta') {
        const toast = document.createElement('div');
        toast.className = 'ciclo-toast notif';
        toast.textContent = 'Gestión resuelta · ' + (g.titulo || g.tipo || 'Actualización') + (g.resultado || g.nota ? ' — ' + String(g.resultado || g.nota).slice(0, 120) : '');
        document.body.appendChild(toast); setTimeout(() => toast.remove(), 6200);
      }
      resolutionState.set(g.id, signature);
    });
    resolutionInitialized = true;
  }

  const ops = Orbit.modules.ops;
  if (ops && typeof ops.render === 'function') {
    const originalRender = ops.render.bind(ops);
    ops.render = function (host) {
      if (advisorActive()) {
        renderAdvisor(host);
        scanAdvisorResolutionNotifications();
        return;
      }
      const out = originalRender(host);
      setTimeout(() => correctLegend(host), 20);
      if (host && !host.__opsWorkflowObserverV1201 && window.MutationObserver) {
        let queued = false;
        const observer = new MutationObserver(() => {
          if (queued) return; queued = true;
          setTimeout(() => { queued = false; correctLegend(host); }, 0);
        });
        observer.observe(host, { childList: true, subtree: true });
        host.__opsWorkflowObserverV1201 = observer;
      }
      return out;
    };
    ops.__workflowRenderV1201 = { originalRender };
  }

  if (Orbit.store && Orbit.store.on) Orbit.store.on(() => {
    scanAdvisorResolutionNotifications();
    if (advisorActive() && advisorHost && Orbit.route && Orbit.route.key === 'ops' && document.body.contains(advisorHost)) renderAdvisor(advisorHost);
  });
  document.addEventListener('orbit:ciclo', scanAdvisorResolutionNotifications);
  document.addEventListener('orbit:session', () => {
    scanAdvisorResolutionNotifications();
    if (advisorHost && Orbit.route && Orbit.route.key === 'ops' && document.body.contains(advisorHost)) {
      if (advisorActive()) renderAdvisor(advisorHost); else Orbit.modules.ops.__workflowRenderV1201.originalRender(advisorHost);
    }
  });

  function maybeOpen() {
    if (!window.__orbitOpenGestion || !String(location.hash || '').startsWith('#/ops')) return;
    const id = window.__orbitOpenGestion; window.__orbitOpenGestion = '';
    setTimeout(() => C.openGestion(id), 80);
  }
  window.addEventListener('hashchange', maybeOpen);
  document.addEventListener('orbit:ciclo', maybeOpen);
  setTimeout(() => { maybeOpen(); scanAdvisorResolutionNotifications(); }, 100);

  C.__opsWorkflowsV1201 = { originalBoard, previousOpen, previousBusinessOpen, advisorOwnScope: true };
})();
