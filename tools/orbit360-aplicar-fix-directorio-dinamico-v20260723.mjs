#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const files = {
  module: 'orbit360-platform/modules/aseguradoras.js',
  readOwner: 'orbit360-platform/core/client-insurer-operational-directory-owner-v20260722.js',
  editOwner: 'orbit360-platform/core/client-insurer-edit-owner-v20260722.js',
  academy: 'orbit360-platform/data/academia-v1230-operational-directory-v20260722.js',
  bootstrap: 'orbit360-platform/core/router-tenant-config-bootstrap.js'
};

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function write(rel, content) { fs.writeFileSync(path.join(ROOT, rel), content, 'utf8'); }
function replaceOnce(source, before, after, id) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`PATCH_SOURCE_MISMATCH:${id}:count=${count}`);
  return source.replace(before, after);
}

let mod = read(files.module);

mod = replaceOnce(mod,
`  function up(id, patch) { S().update('aseguradoras', id, patch); }
  function reload() { if (host) render(host); }`,
`  function up(id, patch) { return S().update('aseguradoras', id, patch); }
  function reload() { if (host) render(host); }
  function roleKey(value) { return norm(value).replace(/\\s+/g, ''); }
  function isFirestoreLabStore() {
    try { const raw = S().raw && S().raw(); return !!(raw && raw.__backend && raw.__backend.mode === 'firestore-lab'); } catch (e) { return false; }
  }
  function waitBackendWrite(collection, id, op, timeoutMs) {
    if (!isFirestoreLabStore()) return Promise.resolve({ ok: true, local: true });
    return new Promise((resolve, reject) => {
      let done = false;
      const finish = (error, detail) => {
        if (done) return; done = true;
        clearTimeout(timer);
        window.removeEventListener('orbit:backend:write-ok', onOk);
        window.removeEventListener('orbit:backend:write-error', onError);
        error ? reject(error) : resolve(detail || { ok: true });
      };
      const matches = event => event && event.detail && event.detail.collection === collection && event.detail.id === id && event.detail.op === op;
      const onOk = event => { if (matches(event)) finish(null, event.detail); };
      const onError = event => { if (matches(event)) finish(new Error(event.detail.error || 'WRITE_REJECTED')); };
      const timer = setTimeout(() => finish(new Error('WRITE_ACK_TIMEOUT')), timeoutMs || 20000);
      window.addEventListener('orbit:backend:write-ok', onOk);
      window.addEventListener('orbit:backend:write-error', onError);
    });
  }`, 'module-write-ack-helpers');

mod = replaceOnce(mod,
`  function canEdit() {
    try { if (Orbit.access && Orbit.access.can) return Orbit.access.can('aseguradoras', 'edit') === true; } catch (e) {}
    const a = asesorActivo();
    if ((a.restricciones || []).indexOf('aseguradoras_editar') >= 0) return false;
    if ((a.permisosExtra || []).indexOf('aseguradoras_editar') >= 0) return true;
    return ['Dirección', 'Admin'].indexOf(activeRole()) >= 0;
  }`,
`  function canEdit() {
    const a = asesorActivo();
    if ((a.restricciones || []).indexOf('aseguradoras_editar') >= 0) return false;
    if ((a.permisosExtra || []).indexOf('aseguradoras_editar') >= 0) return true;
    try { if (Orbit.access && Orbit.access.can && Orbit.access.can('aseguradoras', 'edit') === true) return true; } catch (e) {}
    return ['direccion', 'admin', 'superadmin', 'superadministrador', 'operativo'].indexOf(roleKey(activeRole())) >= 0;
  }
  function canManageCredentials() { return canEdit(); }`, 'module-role-contract');

mod = replaceOnce(mod,
`  function selectTab(t) {
    const back = document.getElementById('asg-ficha'); if (!back) return;
    const id = back.dataset.id;
    fichaState[id].tab = t;`,
`  function selectTab(t) {
    const back = document.getElementById('asg-ficha'); if (!back) return;
    const id = back.dataset.id;
    const currentState = fichaState[id];
    if (currentState && currentState.editing && currentState.tab !== t && typeof currentState.snapshotCurrent === 'function') currentState.snapshotCurrent();
    fichaState[id].tab = t;`, 'module-tab-snapshot');

mod = replaceOnce(mod,
`    fichaState[id] = { tab: (fichaState[id] || {}).tab || 'resumen', editing: wantEdit, draft: wantEdit ? cloneEnt(a) : null };`,
`    const priorState = fichaState[id] || {};
    fichaState[id] = { tab: priorState.tab || 'resumen', editing: wantEdit, draft: wantEdit ? cloneEnt(a) : null, credentialDrafts: wantEdit ? {} : (priorState.credentialDrafts || {}), snapshotCurrent: null, saving: false };`, 'module-ficha-state');

mod = replaceOnce(mod,
`    if (back.querySelector('#af-cancelar')) back.querySelector('#af-cancelar').addEventListener('click', () => { fichaState[id].editing = false; fichaState[id].draft = null; ficha(id); });`,
`    if (back.querySelector('#af-cancelar')) back.querySelector('#af-cancelar').addEventListener('click', () => { fichaState[id].editing = false; fichaState[id].draft = null; fichaState[id].credentialDrafts = {}; ficha(id); });`, 'module-cancel-clears-secrets');

mod = replaceOnce(mod,
`  /* ---- diff simple (top-level) para trazabilidad antes/después ---- */`,
`  function credentialChanges(st, draft) {
    return Object.keys(st && st.credentialDrafts || {}).map(key => st.credentialDrafts[key]).filter(item => item && item.password);
  }
  async function persistSecureCredentialChanges(insurerId, st) {
    const changes = credentialChanges(st, st.draft);
    if (!changes.length) return 0;
    if (!canManageCredentials()) throw new Error('CREDENTIAL_PERMISSION_DENIED');
    if (!Orbit.secureImport || typeof Orbit.secureImport.importInsurerDirectory !== 'function') throw new Error('SECURE_CREDENTIAL_PROVIDER_UNAVAILABLE');
    const result = await Orbit.secureImport.importInsurerDirectory({
      sourceHash: 'manual-directory-edit-' + insurerId + '-' + Date.now(),
      items: changes.map(item => ({ type: 'credential', insurerId, portalId: item.portalId, resourceId: item.portalId, credentialRef: item.credentialRef || '', username: item.username || '', password: item.password }))
    });
    const mappings = [].concat(result && result.mappings || []);
    if (mappings.length < changes.length) throw new Error('SECURE_CREDENTIAL_MAPPING_INCOMPLETE');
    mappings.forEach(mapping => {
      const portalId = clean(mapping.portalId || mapping.resourceId);
      const index = (st.draft.portales || []).findIndex((portal, idx) => clean(portal.id || String(idx)) === portalId);
      if (index < 0) return;
      st.draft.portales[index] = Object.assign({}, st.draft.portales[index], {
        credentialRef: clean(mapping.credentialRef) || st.draft.portales[index].credentialRef || 'backend_required',
        estadoCredencial: mapping.available === false ? 'requiere_actualizacion' : 'registrada',
        estadoAcceso: mapping.usernameAvailable === false || mapping.passwordAvailable === false ? 'Requiere actualización' : 'Acceso disponible',
        credencialActualizadaAt: new Date().toISOString()
      });
    });
    changes.forEach(item => { item.password = ''; });
    st.credentialDrafts = {};
    return mappings.length;
  }

  /* ---- diff simple (top-level) para trazabilidad antes/después ---- */`, 'module-secure-credential-save');

const oldSave = `  async function guardarDraft(id, back) {
    const st = fichaState[id]; if (!st || !st.draft) return;
    const before = S().get('aseguradoras', id); if (!before) return;
    const cambios = diffResumen(before, st.draft);
    if (!cambios.length) { st.editing = false; st.draft = null; ficha(id); return; }
    const motivo = await U.prompt('Se detectaron cambios en: ' + cambios.join(', ') + '.\\n\\nMotivo del cambio:', { title: 'Guardar cambios' });
    if (motivo == null) return; // cancelar no escribe nada
    const patch = Object.assign({}, st.draft, { actividad: log(before, { cambio: 'Actualización de ficha (' + cambios.join(', ') + ')', motivo, camposCambiados: cambios }) });
    delete patch.id;
    up(id, patch);
    /* P0-RATE-AUDIT: registro estructurado y externo de cada cambio de tarifas/validación (sobrevive a la ficha) */
    if (cambios.indexOf('cotTasas') >= 0 || cambios.indexOf('cotTasasValidadas') >= 0) tarifaValidacionAudit(id, before, st.draft, motivo);
    st.editing = false; st.draft = null;
    ficha(id); reload();
  }`;
const newSave = `  async function guardarDraft(id, back) {
    const st = fichaState[id]; if (!st || !st.draft || st.saving) return;
    if (typeof st.snapshotCurrent === 'function') st.snapshotCurrent();
    const before = S().get('aseguradoras', id); if (!before) return;
    let cambios = diffResumen(before, st.draft);
    const secureCount = credentialChanges(st, st.draft).length;
    if (!cambios.length && !secureCount) { st.editing = false; st.draft = null; st.credentialDrafts = {}; ficha(id); return; }
    const summary = cambios.concat(secureCount ? ['credenciales_seguras'] : []);
    const motivo = await U.prompt('Se detectaron cambios en: ' + summary.join(', ') + '.\\n\\nMotivo del cambio:', { title: 'Guardar cambios' });
    if (motivo == null) return;
    const saveButton = back && back.querySelector('#af-guardar');
    st.saving = true;
    if (saveButton) { saveButton.disabled = true; saveButton.textContent = 'Guardando…'; }
    try {
      if (secureCount) await persistSecureCredentialChanges(id, st);
      cambios = diffResumen(before, st.draft);
      if (cambios.length) {
        const patch = Object.assign({}, st.draft, { actividad: log(before, { cambio: 'Actualización de ficha (' + cambios.join(', ') + ')', motivo, camposCambiados: cambios }) });
        delete patch.id;
        const ack = waitBackendWrite('aseguradoras', id, 'update', 20000);
        up(id, patch);
        await ack;
        if (cambios.indexOf('cotTasas') >= 0 || cambios.indexOf('cotTasasValidadas') >= 0) tarifaValidacionAudit(id, before, st.draft, motivo);
      }
      st.editing = false; st.draft = null; st.credentialDrafts = {}; st.snapshotCurrent = null; st.saving = false;
      U.toast('Cambios guardados correctamente.');
      ficha(id); reload();
    } catch (error) {
      st.saving = false;
      if (saveButton) { saveButton.disabled = false; saveButton.textContent = '💾 Guardar cambios'; }
      U.toast('No fue posible guardar. La edición continúa abierta para corregir o reintentar.');
      try { console.warn('[Orbit Aseguradoras] SAVE_FAILED', error && (error.code || error.message) || error); } catch (e) {}
    }
  }`;
mod = replaceOnce(mod, oldSave, newSave, 'module-save-transaction');

const oldPortalRow = `  function portalRow(p, i, editing) {
    const ro = editing ? '' : 'disabled';
    const estado = p.estadoAcceso || 'Sin verificar';
    return \`<div class="asg-row" data-portal="\${i}" style="flex-wrap:wrap">
      <input class="o-sel" data-pn placeholder="Producto / sistema" value="\${U.esc(p.nombre || '')}" style="flex:1.1" \${ro}>
      <select class="o-sel" data-ptipo style="width:110px" \${ro}><option \${p.tipo === 'Cotizador' ? 'selected' : ''}>Cotizador</option><option \${p.tipo === 'Emisión' ? 'selected' : ''}>Emisión</option><option \${p.tipo === 'Cobros' ? 'selected' : ''}>Cobros</option><option \${p.tipo === 'Siniestros' ? 'selected' : ''}>Siniestros</option><option \${p.tipo === 'Portal general' || !p.tipo ? 'selected' : ''}>Portal general</option></select>
      <input class="o-sel" data-pu placeholder="https://…" value="\${U.esc(p.url || '')}" style="flex:1.2" \${ro}>
      <select class="o-sel" data-ppais style="width:70px" \${ro}><option \${p.pais === 'GT' ? 'selected' : ''}>GT</option><option \${p.pais === 'CO' ? 'selected' : ''}>CO</option><option \${p.pais === 'Ambos' || !p.pais ? 'selected' : ''}>Ambos</option></select>
      <select class="o-sel" data-pest style="flex:1" \${ro}>\${ACCESO_ESTADOS.map(e => \`<option \${e === estado ? 'selected' : ''}>\${e}</option>\`).join('')}</select>
      <input class="o-sel" data-presp placeholder="Responsable" value="\${U.esc(p.responsable || '')}" style="flex:1" \${ro}>
      <input class="o-sel" data-pver type="date" title="Última verificación" value="\${p.ultimaVerificacion || ''}" style="width:130px" \${ro}>
      <span class="badge \${ACCESO_TONE[estado] || 'neutral'}" style="align-self:center">\${estado}</span>
      \${p.url ? \`<button class="btn ghost sm" data-open-portal="\${U.esc(p.url)}">↗ Abrir</button>\` : ''}
      \${editing ? \`<button class="asg-del" data-del="portales:\${i}">✕</button>\` : ''}
    </div>\`;
  }`;
const newPortalRow = `  function portalRow(p, i, editing) {
    const ro = editing ? '' : 'disabled';
    const estado = p.estadoAcceso || 'Sin verificar';
    const resourceId = clean(p.id || String(i));
    return \`<div class="asg-row" data-portal="\${i}" data-resource-id="\${U.esc(resourceId)}" style="flex-wrap:wrap">
      <input class="o-sel" data-pn placeholder="Producto / sistema" value="\${U.esc(p.nombre || '')}" style="flex:1.1" \${ro}>
      <select class="o-sel" data-ptipo style="width:110px" \${ro}><option \${p.tipo === 'Cotizador' ? 'selected' : ''}>Cotizador</option><option \${p.tipo === 'Emisión' ? 'selected' : ''}>Emisión</option><option \${p.tipo === 'Cobros' ? 'selected' : ''}>Cobros</option><option \${p.tipo === 'Siniestros' ? 'selected' : ''}>Siniestros</option><option \${p.tipo === 'Portal general' || !p.tipo ? 'selected' : ''}>Portal general</option></select>
      <input class="o-sel" data-pu placeholder="https://…" value="\${U.esc(p.url || '')}" style="flex:1.2" \${ro}>
      <input class="o-sel" data-puser placeholder="Usuario" value="\${U.esc(p.usuario || p.user || p.login || '')}" style="flex:1" \${ro}>
      \${editing && canManageCredentials() ? '<input class="o-sel" data-ppass type="password" autocomplete="new-password" placeholder="Nueva contraseña (vacío = conservar)" style="flex:1">' : ''}
      <select class="o-sel" data-ppais style="width:70px" \${ro}><option \${p.pais === 'GT' ? 'selected' : ''}>GT</option><option \${p.pais === 'CO' ? 'selected' : ''}>CO</option><option \${p.pais === 'Ambos' || !p.pais ? 'selected' : ''}>Ambos</option></select>
      <select class="o-sel" data-pest style="flex:1" \${ro}>\${ACCESO_ESTADOS.map(e => \`<option \${e === estado ? 'selected' : ''}>\${e}</option>\`).join('')}</select>
      <input class="o-sel" data-presp placeholder="Responsable" value="\${U.esc(p.responsable || '')}" style="flex:1" \${ro}>
      <input class="o-sel" data-pver type="date" title="Última verificación" value="\${p.ultimaVerificacion || ''}" style="width:130px" \${ro}>
      <span class="badge \${ACCESO_TONE[estado] || 'neutral'}" style="align-self:center">\${estado}</span>
      \${p.url ? \`<button class="btn ghost sm" type="button" data-open-portal="\${U.esc(p.url)}">↗ Abrir</button>\` : ''}
      \${editing ? \`<button class="asg-del" type="button" data-del="portales:\${i}">✕</button>\` : ''}
    </div>\`;
  }`;
mod = replaceOnce(mod, oldPortalRow, newPortalRow, 'module-portal-native-fields');

mod = replaceOnce(mod,
`      <div class="cfg-note" style="margin-bottom:9px">Orbit nunca guarda ni muestra contraseñas. El equipo declara el estado de acceso a cada plataforma para mantener el directorio al día.</div>`,
`      <div class="cfg-note" style="margin-bottom:9px">El usuario se guarda como dato operativo. Dirección, Superadmin, Admin y Operativo pueden cambiar la contraseña mediante el proveedor seguro; la contraseña nunca se escribe en la ficha.</div>`, 'module-portal-note');

const oldBank = `  function tabBancos(a, editing) {
    const cuentas = a.cuentas || [];
    return \`<div class="asg-sec">
      <div class="asg-sec-t" style="display:flex;justify-content:space-between;align-items:center">Bancos y pagos \${editing ? '<button class="btn ghost sm" id="af-add-cta">+ Cuenta</button>' : ''}</div>
      <div class="cfg-note" style="margin-bottom:9px">Cuentas ficticias, número enmascarado. Nunca cargar cuentas reales.</div>
      <div id="af-cuentas">\${cuentas.map((c, i) => ctaRow(c, i, editing)).join('') || '<div class="muted" style="font-size:12px">Sin cuentas registradas.</div>'}</div>
    </div>\`;
  }`;
const newBank = `  function tabBancos(a, editing) {
    const cuentas = a.cuentas || [];
    return \`<div class="asg-sec">
      <div class="asg-sec-t" style="display:flex;justify-content:space-between;align-items:center">Bancos y pagos \${editing ? '<button class="btn ghost sm" type="button" id="af-add-cta">+ Cuenta</button>' : ''}</div>
      <div class="cfg-note" style="margin-bottom:9px">Directorio dinámico: las cuentas se leen y actualizan desde Orbit.store. Los cambios requieren permiso, motivo, confirmación del backend y auditoría.</div>
      <div id="af-cuentas">\${cuentas.map((c, i) => ctaRow(c, i, editing)).join('') || '<div class="muted" style="font-size:12px">Sin cuentas registradas.</div>'}</div>
    </div>\`;
  }`;
mod = replaceOnce(mod, oldBank, newBank, 'module-bank-note');

mod = replaceOnce(mod,
`        <span style="flex:1;font-size:12.5px">\${U.esc(c.uso || '—')}</span>
        <span style="flex:1;font-size:11.5px" class="muted">\${c.linkPago ? '🔗 link de pago' : ''}</span>`,
`        <span style="flex:1;font-size:11.5px" class="muted">\${c.linkPago ? '🔗 link de pago' : ''}</span>`, 'module-bank-read-remove-use');

mod = replaceOnce(mod,
`      <input class="o-sel" data-ccn placeholder="N.º enmascarado" value="\${U.esc(c.numero || '')}" style="flex:1" \${ro}>
      <input class="o-sel" data-cm placeholder="Moneda" value="\${U.esc(c.moneda || '')}" style="width:70px" \${ro}>
      <input class="o-sel" data-ctit placeholder="Titular" value="\${U.esc(c.titular || '')}" style="flex:1" \${ro}>
      <input class="o-sel" data-cuso placeholder="Uso (prima/gastos/comisión)" value="\${U.esc(c.uso || '')}" style="flex:1" \${ro}>`,
`      <input class="o-sel" data-ccn placeholder="Número de cuenta" value="\${U.esc(c.numero || '')}" style="flex:1" \${ro}>
      <input class="o-sel" data-cm placeholder="Moneda" value="\${U.esc(c.moneda || '')}" style="width:70px" \${ro}>
      <input class="o-sel" data-ctit placeholder="Titular" value="\${U.esc(c.titular || '')}" style="flex:1" \${ro}>`, 'module-bank-edit-fields');

mod = replaceOnce(mod,
`      if (t === 'plataformas') {
        draft.portales = [...body.querySelectorAll('[data-portal]')].map(r => ({ nombre: r.querySelector('[data-pn]').value, tipo: r.querySelector('[data-ptipo]').value, url: r.querySelector('[data-pu]').value, pais: r.querySelector('[data-ppais]').value, estadoAcceso: r.querySelector('[data-pest]').value, responsable: r.querySelector('[data-presp]').value, ultimaVerificacion: r.querySelector('[data-pver]').value, credentialRef: 'backend_required' }));
        draft.drive = (body.querySelector('#af-drive') || {}).value || draft.drive || '';
      }
      if (t === 'bancos') {
        draft.cuentas = [...body.querySelectorAll('[data-cta]')].map(r => ({ banco: r.querySelector('[data-cb]').value, tipo: r.querySelector('[data-ctt]').value, numero: r.querySelector('[data-ccn]').value, moneda: r.querySelector('[data-cm]').value, titular: r.querySelector('[data-ctit]').value, uso: r.querySelector('[data-cuso]').value, linkPago: r.querySelector('[data-clink]').value, ultimaVerificacion: r.querySelector('[data-cver]').value }));
      }`,
`      if (t === 'plataformas') {
        const previous = draft.portales || [];
        draft.portales = [...body.querySelectorAll('[data-portal]')].map((r, idx) => {
          const prior = previous[idx] || {};
          const resourceId = clean(prior.id || r.dataset.resourceId || String(idx));
          const portal = Object.assign({}, prior, { id: prior.id || (resourceId.indexOf('portal_') === 0 ? resourceId : undefined), nombre: r.querySelector('[data-pn]').value, tipo: r.querySelector('[data-ptipo]').value, url: r.querySelector('[data-pu]').value, usuario: r.querySelector('[data-puser]').value, pais: r.querySelector('[data-ppais]').value, estadoAcceso: r.querySelector('[data-pest]').value, responsable: r.querySelector('[data-presp]').value, ultimaVerificacion: r.querySelector('[data-pver]').value, credentialRef: prior.credentialRef || 'backend_required' });
          const password = r.querySelector('[data-ppass]');
          if (password && password.value) st.credentialDrafts[resourceId] = { portalId: resourceId, credentialRef: portal.credentialRef, username: portal.usuario, password: password.value };
          return portal;
        });
        draft.drive = (body.querySelector('#af-drive') || {}).value || draft.drive || '';
      }
      if (t === 'bancos') {
        const previous = draft.cuentas || [];
        draft.cuentas = [...body.querySelectorAll('[data-cta]')].map((r, idx) => Object.assign({}, previous[idx] || {}, { banco: r.querySelector('[data-cb]').value, tipo: r.querySelector('[data-ctt]').value, numero: r.querySelector('[data-ccn]').value, moneda: r.querySelector('[data-cm]').value, titular: r.querySelector('[data-ctit]').value, linkPago: r.querySelector('[data-clink]').value, ultimaVerificacion: r.querySelector('[data-cver]').value }));
      }`, 'module-snapshot-portal-bank');

mod = replaceOnce(mod,
`      }
    }

    // cualquier cambio de input snapshotea la pestaña actual al draft (sin escribir al store)
    body.querySelectorAll('input,select,textarea').forEach(el => el.addEventListener('change', snapshotTab));`,
`      }
    }
    st.snapshotCurrent = snapshotTab;

    // cualquier cambio de input actualiza el draft; Guardar fuerza además el snapshot de la pestaña visible.
    body.querySelectorAll('input,select,textarea').forEach(el => { el.addEventListener('change', snapshotTab); el.addEventListener('input', snapshotTab); });`, 'module-expose-current-snapshot');

mod = replaceOnce(mod,
`    if (t === 'contactos') { const add = body.querySelector('#af-add-cont'); if (add) add.addEventListener('click', () => { snapshotTab(); draft.contactos = (draft.contactos || []).concat([{ nombre: '', area: 'Comercial', email: '', tel: '', cargo: '', canal: 'Correo', principal: false }]); selectTab('contactos'); }); }
    if (t === 'plataformas') { const add = body.querySelector('#af-add-portal'); if (add) add.addEventListener('click', () => { snapshotTab(); draft.portales = (draft.portales || []).concat([{ nombre: '', url: '', estadoAcceso: 'Pendiente de conexión segura', credentialRef: 'backend_required' }]); selectTab('plataformas'); }); }
    if (t === 'bancos') { const add = body.querySelector('#af-add-cta'); if (add) add.addEventListener('click', () => { snapshotTab(); draft.cuentas = (draft.cuentas || []).concat([{ banco: '', tipo: 'Monetaria', numero: '****' + Math.floor(1000 + Math.random() * 8999), moneda: draft.pais === 'GT' ? 'GTQ' : 'COP', titular: '' }]); selectTab('bancos'); }); }`,
`    if (t === 'contactos') { const add = body.querySelector('#af-add-cont'); if (add) add.addEventListener('click', () => { snapshotTab(); draft.contactos = (draft.contactos || []).concat([{ id: 'contact_' + Date.now().toString(36), nombre: '', area: 'Comercial', email: '', tel: '', cargo: '', canal: 'Correo', principal: false }]); selectTab('contactos'); }); }
    if (t === 'plataformas') { const add = body.querySelector('#af-add-portal'); if (add) add.addEventListener('click', () => { snapshotTab(); draft.portales = (draft.portales || []).concat([{ id: 'portal_' + Date.now().toString(36), nombre: '', url: '', usuario: '', estadoAcceso: 'Sin verificar', credentialRef: 'backend_required' }]); selectTab('plataformas'); }); }
    if (t === 'bancos') { const add = body.querySelector('#af-add-cta'); if (add) add.addEventListener('click', () => { snapshotTab(); draft.cuentas = (draft.cuentas || []).concat([{ id: 'account_' + Date.now().toString(36), banco: '', tipo: 'Monetaria', numero: '', moneda: draft.pais === 'GT' ? 'GTQ' : 'COP', titular: '', linkPago: '', ultimaVerificacion: '' }]); selectTab('bancos'); }); }`, 'module-dynamic-adds');

write(files.module, mod);

let readOwner = read(files.readOwner);
readOwner = replaceOnce(readOwner, `var VERSION = '20260722.1';`, `var VERSION = '20260723.2';`, 'read-owner-version');
readOwner = replaceOnce(readOwner,
`    if (!root || !insurer) return false;
    root.querySelectorAll('#af-portales .asg-row[data-portal]').forEach(function (row) { renderPortalRow(row, insurer, Number(row.dataset.portal)); });`,
`    if (!root || !insurer) return false;
    if (root.querySelector('#af-guardar') || root.classList.contains('od-edit-mode-ready')) return true;
    root.querySelectorAll('#af-portales .asg-row[data-portal]').forEach(function (row) { renderPortalRow(row, insurer, Number(row.dataset.portal)); });`, 'read-owner-skip-edit');
readOwner = replaceOnce(readOwner, `    writesStore: false,`, `    skipsEditMode: true,
    writesStore: false,`, 'read-owner-contract');
write(files.readOwner, readOwner);

const editOwner = `/* Orbit 360 · Compatibilidad de edición Aseguradoras · 2026-07-23
   El CRUD y el borrador pertenecen al módulo canónico. Este owner solo añade
   clases semánticas y nunca reemplaza controles, intercepta Orbit.store ni
   manipula contraseñas. */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  var Orbit = window.Orbit;
  var VERSION = '20260723.2';
  function addSemanticClasses(root) {
    if (!root) return;
    var hero = root.querySelector(':scope > .card > div:first-child');
    if (hero) {
      hero.classList.add('od-insurer-hero');
      var title = hero.querySelector('div[style*="font-size:20px"]') || hero.querySelector('div[style*="font-weight:800"]');
      if (title) title.classList.add('od-page-title');
    }
    root.querySelectorAll('.asg-sec-t').forEach(function (title) { title.classList.add('od-section-title'); });
    if (root.querySelector('#af-guardar')) root.classList.add('od-edit-mode-ready');
  }
  function enhance() { addSemanticClasses(document.getElementById('asg-ficha')); }
  var scheduled = false;
  function schedule() { if (scheduled) return; scheduled = true; requestAnimationFrame(function () { scheduled = false; enhance(); }); }
  if (window.MutationObserver) new MutationObserver(schedule).observe(document.documentElement, { childList:true, subtree:true });
  window.addEventListener('hashchange', schedule);
  window.addEventListener('orbit:store:emit', schedule);
  document.addEventListener('orbit:session', schedule);
  Orbit.clientInsurerEditOwnerV20260722 = {
    version: VERSION,
    delegatesCrudToCanonicalModule: true,
    replacesEditableDom: false,
    wrapsStore: false,
    passwordInputForbidden: false,
    securePasswordMutationRequired: true,
    operationalValuesInCode: false,
    enhance: enhance
  };
  schedule();
})();
`;
write(files.editOwner, editOwner);

let academy = read(files.academy);
academy = academy
  .replace(/Academia 1\.231/g, 'Academia 1.232')
  .replace(/var VERSION = '1\.231';/, `var VERSION = '1.232';`)
  .replace(/_1231/g, '_1232')
  .replace(/_m1operationalv: 1231/g, '_m1operationalv: 1232')
  .replace(/contenidoDirectorioOperativo:'1\.231'/g, `contenidoDirectorioOperativo:'1.232'`)
  .replace(/contentVersion:'1\.231'/g, `contentVersion:'1.232'`)
  .replace(/contentVersion: '1\.231'/g, `contentVersion: '1.232'`);
academy = replaceOnce(academy,
`          { icon:'✏️', title:'Editar sin perder datos', body:'El editor hace merge por identidad estable. Debe preservar credentialRef, accountRef y campos no visibles; Cancelar no escribe y Guardar exige motivo.' },`,
`          { icon:'✏️', title:'CRUD dinámico', body:'Cuentas, contactos y plataformas se agregan, editan y eliminan desde Orbit.store. No se generan números ficticios ni se conservan valores operativos en código.' },
          { icon:'💾', title:'Persistencia confirmada', body:'Guardar captura la pestaña actual y espera confirmación del backend. Ante un rechazo, mantiene la edición abierta y muestra un error honesto.' },`, 'academy-direction-crud');
academy = replaceOnce(academy,
`          { icon:'↩️', title:'Edición segura', body:'Cambiar pestaña no debe perder el borrador. Guardar conserva referencias protegidas y nunca escribe contraseñas en el directorio.' }`,
`          { icon:'↩️', title:'Edición segura', body:'Operativo, Dirección, Admin y Superadmin pueden actualizar usuario y contraseña. El usuario se guarda en el directorio; la contraseña viaja al proveedor seguro y nunca entra a Orbit.store.' }`, 'academy-operational-credential');
academy = replaceOnce(academy,
`    return { ok:true, contentVersion:'1.232', roles:['Dirección','Operativo','Asesor'], editModeAware:true, allAysInsurersActive:true, manualDeactivationOnly:true, responsiveSemanticTitles:true, passwordOnlySecret:true, writesThroughOrbitStoreOnly:true };`,
`    return { ok:true, contentVersion:'1.232', roles:['Dirección','Superadmin','Admin','Operativo','Asesor'], editModeAware:true, dynamicCrud:true, backendWriteAcknowledgement:true, secureCredentialMutation:true, operationalValuesInCode:false, allAysInsurersActive:true, manualDeactivationOnly:true, responsiveSemanticTitles:true, passwordOnlySecret:true, writesThroughOrbitStoreOnly:true };`, 'academy-return-contract');
academy = replaceOnce(academy,
`    passwordOnlySecret: true,`,
`    passwordOnlySecret: true,
    dynamicCrud: true,
    backendWriteAcknowledgement: true,
    secureCredentialMutation: true,
    operationalValuesInCode: false,`, 'academy-export-contract');
write(files.academy, academy);

let bootstrap = read(files.bootstrap);
bootstrap = bootstrap
  .replace(/block1-critical-runtime-20260722-7/g, 'block1-critical-runtime-20260723-8')
  .replace(/client-insurer-edit-owner-v20260722\.js\?v=20260722-1/g, 'client-insurer-edit-owner-v20260722.js?v=20260723-2')
  .replace(/client-insurer-operational-directory-owner-v20260722\.js\?v=20260722-1/g, 'client-insurer-operational-directory-owner-v20260722.js?v=20260723-2')
  .replace(/academia-v1230-operational-directory-v20260722\.js\?v=20260722-2/g, 'academia-v1230-operational-directory-v20260722.js?v=20260723-3')
  .replace(/editOwnerVersion: '20260722\.1'/g, `editOwnerVersion: '20260723.2'`)
  .replace(/operationalDirectoryOwnerVersion: '20260722\.1'/g, `operationalDirectoryOwnerVersion: '20260723.2'`)
  .replace(/operationalDirectoryAcademyVersion: '1\.231'/g, `operationalDirectoryAcademyVersion: '1.232'`)
  .replace(/version === '1\.231'/g, `version === '1.232'`)
  .replace(/version === '20260722\.1'/g, `version === '20260723.2'`)
  .replace(/Preflight 1\.0\.39:[^\n]*/g, 'Preflight 1.0.40: Router carga CRUD dinámico canónico, persistencia confirmada, credenciales seguras, lectura edit-aware y Academia 1.232.');
write(files.bootstrap, bootstrap);

const report = {
  schemaVersion: 'orbit360-m1-dynamic-directory-patch-v1',
  status: 'PATCH_APPLIED',
  contractVersion: '1.0.40',
  changedFiles: Object.values(files),
  capabilities: { secrets:false, firestoreRead:false, writes:false, runtime:false, browser:false, deploy:false, production:false },
  invariants: {
    canonicalModuleOwnsCrud:true,
    readOwnerSkipsEdit:true,
    blankDynamicAccounts:true,
    securePasswordProvider:true,
    passwordInStore:false,
    currentTabSnapshotted:true,
    backendWriteAcknowledged:true,
    allowedEditRoles:['Direccion','Superadmin','Admin','Operativo'],
    operationalValuesInCode:false
  },
  containsPII:false,
  containsSecrets:false
};
fs.mkdirSync(path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716'), { recursive:true });
fs.writeFileSync(path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/dynamic-directory-patch-sanitized.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(report, null, 2));
