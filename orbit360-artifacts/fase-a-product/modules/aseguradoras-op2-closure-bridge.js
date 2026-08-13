/* ============================================================
   Orbit 360 · Aseguradoras OP-2 cierre operativo v1.218
   - directorio operativo para Dirección/Operativo/Asesor;
   - edición según Orbit.access;
   - nuevas cuentas/credenciales usan referencias seguras;
   - valores legacy se conservan hasta migración segura verificada;
   - atención rápida, calidad, correcciones y copy no técnico.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
(function () {
  const mod = Orbit.modules.aseguradoras;
  const A = Orbit.access || {};
  const U = Orbit.ui || {};
  if (!mod || !Orbit.store || Orbit.__aseguradorasOp2ClosureV1218) return;
  Orbit.__aseguradorasOp2ClosureV1218 = true;

  const S = () => Orbit.store;
  const clean = v => String(v == null ? '' : v).replace(/\u00a0/g, ' ').trim();
  const esc = v => U.esc ? U.esc(clean(v)) : clean(v);
  const clone = v => { try { return JSON.parse(JSON.stringify(v)); } catch (e) { return Object.assign({}, v || {}); } };
  const today = () => U.today ? U.today() : new Date().toISOString().slice(0, 10);
  const toast = v => { try { U.toast(v); } catch (e) {} };
  const role = () => A.activeRole ? A.activeRole() : (Orbit.session && Orbit.session.rol ? Orbit.session.rol() : 'Sin rol');
  const actor = () => A.actorUser ? A.actorUser() : { id:'', nombre:'Usuario', rolActivo:role() };
  const can = action => A.can ? A.can('aseguradoras', action) : /Dirección|Admin|Operativo/.test(role());

  function query() {
    const h = String(location.hash || '');
    return new URLSearchParams(h.includes('?') ? h.slice(h.indexOf('?') + 1) : '');
  }
  function currentInsurer() {
    const id = query().get('ficha');
    return id ? S().get('aseguradoras', id) : null;
  }
  function maskRight(value, visible) {
    const s = clean(value).replace(/\s+/g, '');
    if (!s) return '';
    const n = Math.max(2, visible || 4);
    return s.length <= n ? '••••' : '•••• ' + s.slice(-n);
  }
  function maskUser(value) {
    const s = clean(value);
    if (!s) return '';
    if (s.includes('@')) {
      const parts = s.split('@'), left = parts[0] || '', domain = parts[1] || '';
      return (left.slice(0, 2) || '**') + '***@' + domain.replace(/^(.{2}).*(\.[^.]+)$/,'$1***$2');
    }
    return maskRight(s, 3);
  }
  function safeUrl(value) {
    if (!value) return '';
    if (Orbit.documentViewer && Orbit.documentViewer.safeUrl) return Orbit.documentViewer.safeUrl(value);
    return /^https:\/\/[^\s]+$/i.test(clean(value)) ? clean(value) : '';
  }
  function appendActivity(row, title) {
    const list = [].concat(row.actividad || []);
    list.push({ fecha:today(), cambio:title, responsable:actor().nombre || role() });
    return list.slice(-100);
  }
  function audit(action, id, before, after, reason, extra) {
    if (A.audit) return A.audit(action, 'aseguradoras', id, before, after, reason, extra || {});
    try {
      S().insert('actividades', {
        id:'act_' + Date.now().toString(36), tipo:'admin', icon:'🏢', fecha:today(),
        titulo:action, detalle:reason || '', aseguradoraId:id
      });
    } catch (e) {}
  }
  function legacyPortal(row) {
    return !!clean(row && (row.usuario || row.user || row.password || row.pass || row.contrasena));
  }
  function legacyAccount(row) {
    return !!clean(row && (row.numero || row.accountNumber));
  }

  function sanitizePortal(raw, previous) {
    const incoming = raw || {}, prev = previous || {};
    const merged = Object.assign({}, prev, incoming);
    const incomingUser = clean(incoming.usuario || incoming.user || '');
    const incomingSecret = clean(incoming.password || incoming.pass || incoming.contrasena || '');
    const previousRef = clean(prev.credentialRef || prev.secureAccessRef || '');
    const incomingRef = clean(incoming.credentialRef || incoming.secureAccessRef || '');
    const previousLegacy = legacyPortal(prev);

    if (previousLegacy && !previousRef && !incomingRef && !incomingUser && !incomingSecret) {
      return Object.assign({}, merged, {
        usuarioHint:clean(merged.usuarioHint || maskUser(prev.usuario || prev.user || '')),
        legacyPlaintextPendingMigration:true,
        estadoAcceso:clean(merged.estadoAcceso || 'Disponible · pendiente migración segura'),
        secretoExpuesto:false
      });
    }

    const rawUser = clean(merged.usuario || merged.user || '');
    const rawSecret = clean(merged.password || merged.pass || merged.contrasena || '');
    const credentialRef = clean(incomingRef || previousRef || ((rawUser || rawSecret) ? 'backend_required' : ''));
    const out = Object.assign({}, merged, {
      usuarioHint:clean(merged.usuarioHint || maskUser(rawUser)),
      credentialRef,
      estadoAcceso:clean(merged.estadoAcceso || (credentialRef ? 'Pendiente conexión segura' : 'Sin verificar')),
      legacyPlaintextPendingMigration:false,
      secretoExpuesto:false
    });
    delete out.usuario; delete out.user; delete out.password; delete out.pass;
    delete out.contrasena; delete out.secureAccessRef;
    return out;
  }
  function sanitizeAccount(raw, previous) {
    const incoming = raw || {}, prev = previous || {};
    const merged = Object.assign({}, prev, incoming);
    const incomingNumber = clean(incoming.numero || incoming.accountNumber || '');
    const previousRef = clean(prev.accountRef || prev.secureAccountRef || '');
    const incomingRef = clean(incoming.accountRef || incoming.secureAccountRef || '');
    const previousLegacy = legacyAccount(prev);

    if (previousLegacy && !previousRef && !incomingRef && !incomingNumber) {
      return Object.assign({}, merged, {
        numeroHint:clean(merged.numeroHint || maskRight(prev.numero || prev.accountNumber || '', 4)),
        legacyPlaintextPendingMigration:true,
        estado:clean(merged.estado || 'Disponible · pendiente migración segura'),
        secretoExpuesto:false
      });
    }

    const rawNumber = clean(merged.numero || merged.accountNumber || '');
    const accountRef = clean(incomingRef || previousRef || (rawNumber ? 'backend_required' : ''));
    const out = Object.assign({}, merged, {
      numeroHint:clean(merged.numeroHint || maskRight(rawNumber, 4)),
      accountRef,
      estado:clean(merged.estado || (accountRef ? 'Pendiente conexión segura' : 'Sin verificar')),
      legacyPlaintextPendingMigration:false,
      secretoExpuesto:false
    });
    delete out.numero; delete out.accountNumber; delete out.secureAccountRef;
    return out;
  }
  function sanitizePatch(id, patch) {
    const safe = clone(patch || {});
    const previous = S().get('aseguradoras', id) || {};
    if (Array.isArray(safe.portales)) safe.portales = safe.portales.map((p, i) => sanitizePortal(p, (previous.portales || [])[i]));
    if (Array.isArray(safe.cuentas)) safe.cuentas = safe.cuentas.map((c, i) => sanitizeAccount(c, (previous.cuentas || [])[i]));
    return safe;
  }
  function installStoreGuard() {
    const store = S();
    if (!store || store.__aseguradorasOp2SensitiveGuardV1218) return;
    const originalUpdate = store.update.bind(store);
    const originalInsert = store.insert.bind(store);
    store.update = function (collection, id, patch) {
      return originalUpdate(collection, id, collection === 'aseguradoras' ? sanitizePatch(id, patch) : patch);
    };
    store.insert = function (collection, row) {
      if (collection !== 'aseguradoras') return originalInsert(collection, row);
      const safe = clone(row || {});
      if (Array.isArray(safe.portales)) safe.portales = safe.portales.map(p => sanitizePortal(p, null));
      if (Array.isArray(safe.cuentas)) safe.cuentas = safe.cuentas.map(c => sanitizeAccount(c, null));
      return originalInsert(collection, safe);
    };
    store.__aseguradorasOp2SensitiveGuardV1218 = { originalUpdate, originalInsert };
  }
  installStoreGuard();

  function flagLegacySensitive(id) {
    const row = S().get('aseguradoras', id);
    if (!row) return false;
    const legacyPortals = (row.portales || []).some(legacyPortal);
    const legacyAccounts = (row.cuentas || []).some(legacyAccount);
    if (!legacyPortals && !legacyAccounts) return false;
    const code = 'recursos_legacy_pendientes_migracion_segura';
    if ((row.validacionAlertas || []).includes(code)) return true;
    const before = clone(row);
    const alerts = Array.from(new Set([].concat(row.validacionAlertas || [], code)));
    S().update('aseguradoras', id, {
      requiereValidacion:true,
      validacionAlertas:alerts,
      sensitiveResourceStatus:'pendiente_migracion_segura_no_destructiva',
      actividad:appendActivity(row, 'Recursos operativos pendientes de migración segura')
    });
    const after = S().get('aseguradoras', id);
    audit('marcar_recursos_legacy_pendientes_migracion', id, before, after,
      'Conservar operación hasta migración segura verificada',
      { legacyPortals, legacyAccounts, rawPersisted:true, migrationPerformed:false, destructive:false });
    return true;
  }

  function secureHint(row, kind, index, text) {
    if (!row || row.querySelector('[data-op2-secure-hint]')) return;
    const wrap = document.createElement('span');
    wrap.dataset.op2SecureHint = '1';
    wrap.className = 'asg217-secure-hint';
    wrap.innerHTML = `<span class="badge neutral">${esc(text)}</span><button type="button" class="btn ghost sm" data-op2-secure-action="${kind}:${index}">Gestionar migración segura</button>`;
    row.appendChild(wrap);
  }
  function hardenEditor(id) {
    const back = document.getElementById('asg-ficha');
    const row = S().get('aseguradoras', id);
    if (!back || !row) return;
    flagLegacySensitive(id);
    const current = S().get('aseguradoras', id) || row;

    back.querySelectorAll('[data-portal]').forEach((portalRow, i) => {
      const p = (current.portales || [])[i] || {};
      portalRow.dataset.cred = clean(p.credentialRef || p.secureAccessRef || '');
      const user = portalRow.querySelector('[data-pus]');
      const pass = portalRow.querySelector('[data-pp]');
      if (user) {
        user.value = ''; user.disabled = true;
        user.placeholder = p.usuarioHint ? 'Usuario disponible en pestaña Plataformas · ' + p.usuarioHint : 'Usuario protegido';
      }
      if (pass) {
        pass.value = ''; pass.disabled = true;
        pass.placeholder = p.credentialRef || legacyPortal(p) ? 'Contraseña disponible según rol en Plataformas' : 'Conexión segura requerida';
      }
      secureHint(portalRow, 'portal', i, p.credentialRef ? 'Acceso protegido' : (legacyPortal(p) ? 'Acceso operativo · migración pendiente' : 'Acceso pendiente'));
    });
    back.querySelectorAll('[data-cta]').forEach((accountRow, i) => {
      const c = (current.cuentas || [])[i] || {};
      const number = accountRow.querySelector('[data-ccn]');
      if (number) {
        number.value = clean(c.numero || c.accountNumber || '');
        number.disabled = true;
        number.placeholder = c.numeroHint ? 'Cuenta disponible en Bancos y pagos · ' + c.numeroHint : 'Registrar mediante conexión segura';
      }
      secureHint(accountRow, 'account', i, c.accountRef ? 'Cuenta protegida' : (legacyAccount(c) ? 'Cuenta operativa · migración pendiente' : 'Cuenta pendiente'));
    });
    back.querySelectorAll('[data-op2-secure-action]').forEach(button => {
      button.onclick = () => toast('Los valores existentes continúan operativos. La migración debe copiar, verificar y solo después retirar el valor anterior.');
    });
    const edit = back.querySelector('#af-editar');
    if (edit && !edit.dataset.op2Guard) {
      edit.dataset.op2Guard = '1';
      edit.addEventListener('click', () => setTimeout(() => hardenEditor(id), 0));
    }
  }

  function contactMain(a) {
    return (a.contactos || []).find(c => c.principal) || (a.contactos || [])[0] || {};
  }
  function operationalSummary(a) {
    const c = contactMain(a);
    const quality = a.requiereValidacion || (a.validacionAlertas || []).length
      ? 'Requiere revisión' : (a.ultimaRevision ? 'Revisada' : 'Pendiente de revisión');
    return `<section class="card pad asg217-quick" data-asg-op2-summary>
      <div class="asg197-section-head"><div><small>Atención y operación</small><h3>Canales rápidos y estado del directorio</h3></div><span class="badge ${quality === 'Requiere revisión' ? 'warn' : 'ok'}">${esc(quality)}</span></div>
      <div class="asg217-quick-grid">
        <div><small>Código de intermediario</small><b>${esc(a.codigoIntermediario || 'Pendiente')}</b></div>
        <div><small>Oficina</small><b>${esc(a.telGeneral || 'Pendiente')}</b></div>
        <div><small>Emergencias / asistencia</small><b>${esc(a.emergencia || 'Pendiente')}</b></div>
        <div><small>WhatsApp</small><b>${esc(a.whatsapp || 'Pendiente')}</b></div>
        <div><small>Contacto principal</small><b>${esc(c.nombre || 'Pendiente')}</b><span>${esc(c.area || c.tipo || '')}</span></div>
        <div><small>Fuente / última revisión</small><b>${esc((a.fuenteDirectorio && a.fuenteDirectorio.hoja) || a.fuente || 'Carga manual')}</b><span>${esc(a.ultimaRevision || 'Sin fecha')}</span></div>
      </div>
      <div class="asg217-quick-actions">
        ${a.codigoIntermediario ? '<button class="btn ghost sm" data-op2-copy-code>Copiar código</button>' : ''}
        ${c.email ? '<button class="btn ghost sm" data-op2-email>Preparar correo</button>' : ''}
        ${safeUrl(a.web) ? '<button class="btn ghost sm" data-op2-web>Abrir sitio</button>' : ''}
        <button class="btn primary sm" data-op2-correction>Reportar corrección</button>
      </div>
    </section>`;
  }
  function wireOperationalSummary(host, a) {
    const copy = host.querySelector('[data-op2-copy-code]');
    if (copy) copy.onclick = async () => {
      const value = clean(a.codigoIntermediario);
      if (!value || !Orbit.vault || !Orbit.vault.copyText) return;
      toast(await Orbit.vault.copyText(value) ? 'Código copiado' : 'No se pudo copiar');
    };
    const email = host.querySelector('[data-op2-email]');
    if (email) email.onclick = () => {
      const c = contactMain(a);
      window.__orbitCompose = {
        para:c.email || '', asunto:a.nombre + ' · gestión operativa', cuerpo:'',
        vinculo:{ tipo:'aseguradora', id:a.id, label:a.nombre }
      };
      location.hash = '#/correo';
    };
    const web = host.querySelector('[data-op2-web]');
    if (web) web.onclick = () => window.open(safeUrl(a.web), '_blank', 'noopener,noreferrer');
    const correction = host.querySelector('[data-op2-correction]');
    if (correction) correction.onclick = async () => {
      const detail = clean(await U.prompt('Describe el dato faltante o incorrecto:', { title:'Corrección de aseguradora' }));
      if (!detail) return;
      const out = A.correction
        ? A.correction('Corregir directorio · ' + a.nombre, detail, { aseguradoraId:a.id, pais:a.pais, prioridad:'Media' })
        : null;
      toast(out ? 'Gestión de corrección creada' : 'No se pudo crear la gestión');
    };
  }
  function ensureOperationalSummary(host) {
    const a = currentInsurer();
    const state = mod.__v1197Bridge && mod.__v1197Bridge.state;
    const body = host && host.querySelector('.asg197-tab-body');
    if (!a || !body || (state && state.tab !== 'resumen') || host.querySelector('[data-asg-op2-summary]')) return;
    body.insertAdjacentHTML('afterbegin', operationalSummary(a));
    wireOperationalSummary(host, a);
  }
  function ensureActions(host) {
    if (!host || !can('edit')) return;
    const ficha = currentInsurer();
    if (ficha) {
      const head = host.querySelector('.asg197-ficha-head');
      if (head && !head.querySelector('[data-edit-asg]')) {
        const button = document.createElement('button');
        button.className = 'btn primary'; button.dataset.editAsg = '1'; button.textContent = 'Editar';
        button.onclick = () => mod.ficha && mod.ficha(ficha.id, true);
        head.appendChild(button);
      }
      return;
    }
    if (host.querySelector('[data-op2-directory-actions]') || host.querySelector('[data-new-asg]')) return;
    const page = host.querySelector('.asg197');
    if (!page) return;
    const actions = document.createElement('section');
    actions.dataset.op2DirectoryActions = '1'; actions.className = 'card pad asg217-actions';
    actions.innerHTML = '<div><b>Administración del directorio</b><small>Alta e importación disponibles según el rol activo.</small></div><div><button class="btn ghost" data-op2-import>Importar directorio</button><button class="btn primary" data-op2-new>+ Aseguradora</button></div>';
    const banner = page.firstElementChild;
    if (banner && banner.parentNode) banner.insertAdjacentElement('afterend', actions); else page.prepend(actions);
    actions.querySelector('[data-op2-import]').onclick = () => mod.importarDirectorio
      ? mod.importarDirectorio() : Orbit.importa.open('directorio-aseguradoras');
    actions.querySelector('[data-op2-new]').onclick = () => mod.nuevaAseguradora
      ? mod.nuevaAseguradora() : toast('Alta no disponible');
  }

  const stateLabels = {
    inventario_fuentes:'Inventario recibido', fuentes_incompletas:'Fuentes incompletas',
    lectura_pendiente:'Lectura pendiente', extraccion_en_prueba:'Extracción en prueba',
    requiere_validacion:'Requiere validación', calibrado:'Calibrado',
    validado_habilitado:'Validado y habilitado', reemplazado_por_version:'Reemplazado por versión',
    bloqueado:'Bloqueado', conocimiento_parcial:'Conocimiento parcial',
    requiere_cotizacion_ejemplo:'Requiere cotización ejemplo', presentacion_sin_tarifa:'Presentación sin tarifa',
    fuentes_completas_requiere_validacion:'Fuentes completas · requiere validación'
  };
  function cleanCopy(root) {
    if (!root || !document.createTreeWalker) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      let text = node.nodeValue;
      Object.keys(stateLabels).forEach(key => {
        text = text.replace(new RegExp('\\b' + key + '\\b','g'), stateLabels[key]);
      });
      text = text.replace(/backend_required/gi, 'conexión segura pendiente')
        .replace(/accountRef|credentialRef/gi, 'referencia protegida');
      if (text !== node.nodeValue) node.nodeValue = text;
    });
  }
  function enhance(host) {
    ensureActions(host);
    ensureOperationalSummary(host);
    cleanCopy(host);
  }

  const originalFicha = mod.ficha.bind(mod);
  mod.ficha = function (id, startEdit) {
    const out = originalFicha(id, startEdit);
    setTimeout(() => hardenEditor(id), 0);
    return out;
  };
  const originalRender = mod.render.bind(mod);
  mod.render = function (host) {
    installStoreGuard();
    const out = originalRender(host);
    setTimeout(() => enhance(host), 0);
    return out;
  };
  if (window.MutationObserver) {
    const observer = new MutationObserver(records => records.forEach(record =>
      record.addedNodes.forEach(node => { if (node.nodeType === 1) cleanCopy(node); })
    ));
    observer.observe(document.documentElement, { childList:true, subtree:true });
  }

  mod.__op2ClosureV1218 = {
    originalFicha, originalRender, sanitizePortal, sanitizeAccount,
    sanitizePatch, flagLegacySensitive, enhance
  };
})();
