/* ============================================================
   Orbit 360 · Bridge Ops/Leads dominio durable v20260804
   - Proyecta gestiones asignadas al asesor dentro de Leads.
   - Puede sincronizar cambios del Orbit.store al servicio protegido.
   - El backend permanece desactivado hasta gate runtime explícito.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  Orbit.modules = Orbit.modules || {};
  if (Orbit.__opsLeadsDomainBridgeV20260804) return;
  Orbit.__opsLeadsDomainBridgeV20260804 = true;

  const VERSION = 'orbit360-ops-leads-domain-bridge-v1';
  const snapshots = { negocios: new Map(), gestiones: new Map() };
  const pending = new Set();
  let primed = false;

  const clone = value => { try { return JSON.parse(JSON.stringify(value)); } catch (e) { return Object.assign({}, value || {}); } };
  const text = value => String(value == null ? '' : value).trim();
  const stable = value => {
    if (value == null) return value;
    if (Array.isArray(value)) return value.map(stable);
    if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
    return value;
  };
  const digest = value => JSON.stringify(stable(value || {}));
  const backendActive = () => !!(Orbit.workflowDomain && Orbit.workflowDomain.available && Orbit.workflowDomain.available());
  const advisorId = () => {
    try { return Orbit.session && Orbit.session.asesorId ? text(Orbit.session.asesorId()) : ''; }
    catch (e) { return ''; }
  };
  const isAdvisor = () => {
    try { return !!(Orbit.session && Orbit.session.esAsesor && Orbit.session.esAsesor()); }
    catch (e) { return false; }
  };

  function noteSyncError(collection, row, error) {
    window.OrbitBackend = window.OrbitBackend || {};
    const list = Array.isArray(OrbitBackend.workflowSyncErrors) ? OrbitBackend.workflowSyncErrors : [];
    list.push({ at: new Date().toISOString(), collection, id: text(row && row.id), error: text(error && (error.message || error)) });
    OrbitBackend.workflowSyncErrors = list.slice(-50);
    try { console.warn('[Orbit workflow domain]', collection, row && row.id, error); } catch (e) {}
  }

  function deriveCommand(collection, before, after) {
    if (!before && after) {
      if (collection === 'negocios') return { operation: 'create_business', payload: after, entityId: after.id, reason: 'Creación de negocio desde la plataforma' };
      return { operation: /portal/i.test(text(after.origen)) ? 'portal_request' : 'create_management', payload: after, entityId: after.id, reason: 'Creación de gestión desde la plataforma' };
    }
    if (!after) return null;
    if (collection === 'negocios') {
      if (!before.archivado && after.archivado) return { operation: 'archive_business', payload: after, entityId: after.id, reason: 'Archivo de negocio' };
      if (text(before.etapa) !== text(after.etapa)) return { operation: 'transition_business', payload: Object.assign({}, after, { to: after.etapa }), entityId: after.id, reason: 'Cambio de etapa del negocio' };
      return { operation: 'update_business', payload: after, entityId: after.id, reason: 'Actualización de negocio' };
    }
    if (!before.archivado && after.archivado) return { operation: 'archive_management', payload: after, entityId: after.id, reason: 'Archivo de gestión' };
    if (text(before.asesorId) !== text(after.asesorId)) return { operation: 'assign_management', payload: after, entityId: after.id, reason: 'Asignación de gestión' };
    if (text(before.estado) !== 'Resuelta' && text(after.estado) === 'Resuelta') return { operation: 'resolve_management', payload: after, entityId: after.id, reason: text(after.resultado || 'Gestión resuelta') };
    if (text(before.estado) === 'Resuelta' && text(after.estado) !== 'Resuelta') return { operation: 'reopen_management', payload: after, entityId: after.id, reason: 'Reapertura de gestión' };
    return { operation: 'update_management', payload: after, entityId: after.id, reason: 'Actualización de gestión' };
  }

  async function send(collection, before, after) {
    if (!backendActive() || !after || !after.id) return;
    if (text(after.schemaVersion) === 'orbit360-ops-leads-domain-v1') return;
    const key = collection + ':' + after.id;
    if (pending.has(key)) return;
    const command = deriveCommand(collection, before, after);
    if (!command) return;
    pending.add(key);
    try {
      await Orbit.workflowDomain.command(command.operation, command);
    } catch (error) {
      noteSyncError(collection, after, error);
    } finally {
      pending.delete(key);
    }
  }

  function scan(collection) {
    const current = new Map();
    const rows = (Orbit.store && Orbit.store.all ? Orbit.store.all(collection) : []) || [];
    rows.forEach(row => current.set(text(row.id), clone(row)));
    if (!primed) {
      snapshots[collection] = current;
      return;
    }
    current.forEach((row, id) => {
      const before = snapshots[collection].get(id) || null;
      if (!before || digest(before) !== digest(row)) send(collection, before, row);
    });
    snapshots[collection] = current;
  }

  function prime() {
    scan('negocios');
    scan('gestiones');
    primed = true;
  }

  function assignedManagements() {
    if (!isAdvisor()) return [];
    const id = advisorId();
    if (!id || !Orbit.store || !Orbit.store.all) return [];
    return (Orbit.store.all('gestiones') || []).filter(g => !g.archivado && text(g.asesorId) === id && text(g.estado) !== 'Resuelta');
  }

  function appendAdvisorPanel(host) {
    if (!host || !isAdvisor()) return;
    const rows = assignedManagements();
    const existing = host.querySelector('[data-advisor-managements-v1]');
    if (existing) existing.remove();
    const panel = document.createElement('section');
    panel.setAttribute('data-advisor-managements-v1', '1');
    panel.className = 'card pad';
    panel.style.marginTop = '16px';
    panel.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px">
      <div><b style="font-family:var(--f-display);font-size:15px">Gestiones operativas asignadas</b><div class="muted" style="font-size:12px">Solicitudes de clientes y tareas del equipo que requieren tu seguimiento.</div></div>
      <span class="badge ${rows.length ? 'warn' : 'ok'}">${rows.length}</span>
    </div>
    <div style="display:grid;gap:9px">${rows.length ? rows.map(g => `<button class="asg197-detail-row" data-advisor-management="${g.id}"><span><b>${(Orbit.ui && Orbit.ui.esc) ? Orbit.ui.esc(g.titulo || g.tipo || 'Gestión') : text(g.titulo || g.tipo)}</b><small>${text(g.estado)} · ${text(g.prioridad || 'Media')} · ${text(g.origen || 'Plataforma')}</small></span><span>Ver →</span></button>`).join('') : '<div class="empty">No tienes gestiones operativas pendientes.</div>'}</div>`;
    host.appendChild(panel);
    panel.querySelectorAll('[data-advisor-management]').forEach(button => button.addEventListener('click', () => {
      if (Orbit.ciclo && Orbit.ciclo.openGestion) Orbit.ciclo.openGestion(button.dataset.advisorManagement);
    }));
  }

  const leads = Orbit.modules.leads;
  if (leads && typeof leads.render === 'function' && !leads.__advisorManagementProjectionV1) {
    const original = leads.render.bind(leads);
    leads.render = function (host) {
      const out = original(host);
      setTimeout(() => appendAdvisorPanel(host), 0);
      return out;
    };
    leads.__advisorManagementProjectionV1 = { original };
  }

  function boot() {
    if (!Orbit.store || !Orbit.store.on) return setTimeout(boot, 50);
    prime();
    Orbit.store.on(collection => {
      if (collection === '*' || collection === 'negocios') scan('negocios');
      if (collection === '*' || collection === 'gestiones') scan('gestiones');
      if (Orbit.route && Orbit.route.key === 'leads') {
        const host = document.getElementById('host');
        if (host) setTimeout(() => appendAdvisorPanel(host), 0);
      }
    });
  }

  Orbit.opsLeadsDomainBridge = Object.freeze({ VERSION, backendActive, assignedManagements, status: () => ({ version: VERSION, backendActive: backendActive(), primed, pending: pending.size }) });
  boot();
})();
