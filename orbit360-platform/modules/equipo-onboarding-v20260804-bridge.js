/* ============================================================
   Orbit 360 · Equipo → onboarding protegido
   - Integra el registro de asesor con Auth y membership del tenant.
   - Conserva Orbit.store como dueño de la configuración operativa.
   - El alta privilegiada se ejecuta únicamente en el backend protegido.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  if (!Orbit.modules || !Orbit.modules.equipo || !Orbit.userOnboarding) return;

  const module = Orbit.modules.equipo;
  const originalRender = module.render;
  const originalEdit = module.editar;
  let editingId = '';
  let pendingSave = null;
  let saveBusy = false;

  function text(value) { return String(value == null ? '' : value).trim(); }
  function slug(value) {
    return text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'usuario';
  }
  function store() { return Orbit.store; }
  function toast(message) {
    try { if (Orbit.ui && Orbit.ui.toast) return Orbit.ui.toast(message); } catch (error) {}
  }
  function stableId(name) {
    const base = 'ase-' + slug(name);
    if (!store().get('asesores', base)) return base;
    let index = 2;
    while (store().get('asesores', `${base}-${index}`)) index += 1;
    return `${base}-${index}`;
  }
  function accessInfo(record) { return Orbit.userOnboarding.status(record || {}); }
  function hasProvisionedAccess(record) {
    const state = accessInfo(record).id;
    return record && (record.accessProvisioned === true || ['active', 'invited', 'pending_delivery', 'blocked'].includes(state));
  }
  function allScope(record) {
    if (!record) return false;
    if (text(record.scopeDatos).toLowerCase() === 'todos') return true;
    return Object.values(record.dataScopes || {}).some(value => text(value).toLowerCase() === 'todos');
  }
  function active(record) {
    return !(record && (record.inactivo || record.activo === false || text(record.estado).toLowerCase() === 'inactivo'));
  }
  function formData(drawer) {
    const selected = selector => [...drawer.querySelectorAll(selector)].map(element => element.value);
    const roles = selected('.eu-role:checked');
    const countries = selected('.eu-pais:checked');
    const selectedModules = selected('.eu-mod:checked');
    const roleDefault = text(drawer.querySelector('#eu-role-default')?.value);
    const countryDefault = text(drawer.querySelector('#eu-pais-default')?.value);
    const name = text(drawer.querySelector('#eu-nombre')?.value);
    return {
      nombre: name,
      telefono: text(drawer.querySelector('#eu-tel')?.value),
      email: text(drawer.querySelector('#eu-email')?.value).toLowerCase(),
      color: text(drawer.querySelector('#eu-color')?.value),
      roles,
      rol: roleDefault,
      rolDefault: roleDefault,
      scopeDatos: text(drawer.querySelector('#eu-scope')?.value),
      paises: countries,
      pais: countryDefault,
      paisDefault: countryDefault,
      modulosOverride: selectedModules,
      inactivo: !!drawer.querySelector('#eu-inact')?.checked,
      activo: !drawer.querySelector('#eu-inact')?.checked,
      estado: drawer.querySelector('#eu-inact')?.checked ? 'inactivo' : 'activo'
    };
  }
  function confirmScopeOpening(before, after) {
    if (allScope(after) && !allScope(before)) {
      const confirmation = window.prompt('Este cambio abre el alcance de datos a “Todos”. Escribe CONFIRMAR TODOS para continuar:');
      return confirmation === 'CONFIRMAR TODOS';
    }
    return true;
  }
  function operationFor(before, after, forceProvision) {
    const hadAccess = hasProvisionedAccess(before);
    if (!active(after) && hadAccess) return 'deactivate';
    if (active(after) && before && !active(before) && hadAccess) return 'reactivate';
    if (hadAccess) return 'sync';
    return forceProvision ? 'provision' : '';
  }
  async function executeAccess({ advisorId, before, after, operation, reason }) {
    if (!operation || !Orbit.userOnboarding.available()) return null;
    const result = await Orbit.userOnboarding.execute({
      advisorId,
      advisor: after,
      operation,
      reason,
      confirmScopeAll: allScope(after) && !allScope(before),
      sendInvitation: operation !== 'deactivate'
    });
    if (result.invitationDeliveryFailed) {
      toast('Acceso creado; la invitación quedó pendiente de envío.');
    } else if (result.state === 'blocked') {
      toast('Acceso bloqueado correctamente.');
    } else if (result.state === 'invited') {
      toast('Acceso creado y correo de establecimiento enviado.');
    } else {
      toast('Acceso y permisos sincronizados.');
    }
    return result;
  }
  function decorateTable(host) {
    if (!host) return;
    host.querySelectorAll('tbody tr[onclick*="Orbit.modules.equipo.editar"]').forEach(row => {
      const match = text(row.getAttribute('onclick')).match(/editar\('([^']+)'\)/);
      if (!match) return;
      const record = store().get('asesores', match[1]) || {};
      const info = accessInfo(record);
      const cells = row.querySelectorAll('td');
      const accessCell = cells.length >= 7 ? cells[4] : null;
      if (accessCell) {
        accessCell.innerHTML = `<span class="badge ${info.tone}">${Orbit.ui.esc(info.label)}</span><div class="muted" style="font-size:10.5px;margin-top:3px">${Orbit.ui.esc(info.detail)}</div>`;
      }
    });
  }
  function decorateDrawer(id) {
    const drawer = document.getElementById('eq-edit');
    if (!drawer || drawer.dataset.onboardingBridge === '1') return;
    drawer.dataset.onboardingBridge = '1';
    const current = id ? store().get('asesores', id) || {} : {};
    const notes = [...drawer.querySelectorAll('.cfg-note')];
    const accessNote = notes.find(note => /No envía correos ni habilita acceso todavía/i.test(note.textContent || ''));
    if (accessNote) {
      accessNote.innerHTML = '🔐 La configuración y el acceso son estados distintos. Puedes guardar únicamente el registro o crear/vincular de forma segura <b>Auth + membresía + roles + países + alcance</b>. Nunca se muestra una contraseña temporal.';
    }
    const content = drawer.querySelector('.card > div:nth-child(2)');
    if (content) {
      const info = accessInfo(current);
      const panel = document.createElement('div');
      panel.className = 'cfg-note';
      panel.id = 'eu-access-panel';
      panel.innerHTML = `<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap">
        <div><b>Acceso:</b> <span class="badge ${info.tone}">${Orbit.ui.esc(info.label)}</span><div class="muted" style="font-size:11px;margin-top:3px">${Orbit.ui.esc(info.detail)}</div></div>
        <label class="ce-l ck" style="margin:0"><input type="checkbox" id="eu-sync-access" ${active(current) ? 'checked' : ''}> ${id ? 'Sincronizar acceso al guardar' : 'Crear acceso seguro al guardar'}</label>
      </div>`;
      content.insertBefore(panel, content.lastElementChild || null);
    }
    const footer = drawer.querySelector('.card > div:last-child');
    if (id && footer) {
      const info = accessInfo(current);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn ghost';
      button.id = 'eu-access-now';
      button.textContent = info.id === 'blocked' ? 'Reactivar acceso' : (hasProvisionedAccess(current) ? 'Sincronizar acceso' : 'Crear o vincular acceso');
      footer.insertBefore(button, footer.querySelector('#eu-cancel'));
      button.addEventListener('click', async () => {
        if (saveBusy) return;
        const desired = formData(drawer);
        if (!confirmScopeOpening(current, desired)) return;
        const operation = info.id === 'blocked' ? 'reactivate' : (hasProvisionedAccess(current) ? 'sync' : 'provision');
        const reason = window.prompt('Motivo de la gestión de acceso:') || '';
        if (reason.trim().length < 5) return alert('Indica un motivo claro de al menos 5 caracteres.');
        try {
          saveBusy = true;
          button.disabled = true;
          button.textContent = 'Procesando…';
          await executeAccess({ advisorId: id, before: current, after: desired, operation, reason });
          setTimeout(() => {
            try { originalEdit.call(module, id); decorateDrawer(id); } catch (error) {}
          }, 350);
        } catch (error) {
          toast(Orbit.userOnboarding.message(error));
        } finally {
          saveBusy = false;
          button.disabled = false;
        }
      });
    }
  }

  module.render = function (host) {
    const result = originalRender.apply(this, arguments);
    setTimeout(() => {
      decorateTable(host);
      const add = host && host.querySelector('#eq-add');
      if (add && add.dataset.onboardingBridge !== '1') {
        add.dataset.onboardingBridge = '1';
        add.addEventListener('click', () => { editingId = ''; setTimeout(() => decorateDrawer(''), 0); });
      }
    }, 0);
    return result;
  };
  module.editar = function (id) {
    editingId = text(id);
    const result = originalEdit.apply(this, arguments);
    setTimeout(() => decorateDrawer(editingId), 0);
    return result;
  };

  document.addEventListener('click', event => {
    const save = event.target && event.target.closest && event.target.closest('#eu-ok');
    if (!save) return;
    const drawer = document.getElementById('eq-edit');
    if (!drawer) return;
    const before = editingId ? store().get('asesores', editingId) || {} : {};
    const after = formData(drawer);
    const sync = !!drawer.querySelector('#eu-sync-access')?.checked;
    if (!confirmScopeOpening(before, after)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    pendingSave = {
      advisorId: editingId || stableId(after.nombre),
      before,
      after,
      sync,
      operation: operationFor(before, after, sync),
      reason: editingId ? 'Sincronización posterior a cambio guardado en Equipo' : 'Alta de acceso desde Equipo'
    };
    setTimeout(async () => {
      const saved = pendingSave;
      pendingSave = null;
      if (!saved || document.getElementById('eq-edit')) return;
      const current = store().get('asesores', saved.advisorId) || saved.after;
      if (!saved.operation || !Orbit.userOnboarding.available()) return;
      try {
        await executeAccess({
          advisorId: saved.advisorId,
          before: saved.before,
          after: current,
          operation: saved.operation,
          reason: saved.reason
        });
      } catch (error) {
        toast(Orbit.userOnboarding.message(error));
      }
    }, 0);
  }, true);

  document.addEventListener('orbit:store', () => {
    const host = document.getElementById('host') || document.getElementById('mod-host');
    if (host) decorateTable(host);
  });
})();
