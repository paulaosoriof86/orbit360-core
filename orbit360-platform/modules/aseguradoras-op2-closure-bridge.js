/* ============================================================
   Orbit 360 · Aseguradoras OP-2 cierre operativo v1.217
   - directorio operativo para Dirección/Operativo/Asesor;
   - edición según Orbit.access;
   - cuentas, usuarios y credenciales nunca se guardan en claro;
   - atención rápida, calidad, correcciones y copy no técnico;
   - conserva módulo base, importador, visor y recursos protegidos.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
(function () {
  const mod = Orbit.modules.aseguradoras;
  const A = Orbit.access || {};
  const U = Orbit.ui || {};
  if (!mod || !Orbit.store || Orbit.__aseguradorasOp2ClosureV1217) return;
  Orbit.__aseguradorasOp2ClosureV1217 = true;

  const S = () => Orbit.store;
  function clean(v) { return String(v == null ? '' : v).replace(/\u00a0/g, ' ').trim(); }
  function esc(v) { return U.esc ? U.esc(clean(v)) : clean(v); }
  function clone(v) { try { return JSON.parse(JSON.stringify(v)); } catch (e) { return Object.assign({}, v || {}); } }
  function today() { return U.today ? U.today() : new Date().toISOString().slice(0, 10); }
  function now() { return new Date().toISOString(); }
  function toast(v) { try { U.toast(v); } catch (e) {} }
  function role() { return A.activeRole ? A.activeRole() : (Orbit.session && Orbit.session.rol ? Orbit.session.rol() : 'Sin rol'); }
  function actor() { return A.actorUser ? A.actorUser() : { id:'', nombre:'Usuario', rolActivo:role() }; }
  function can(action) { return A.can ? A.can('aseguradoras', action) : /Dirección|Admin|Operativo/.test(role()); }
  function canSensitive() {
    if (mod.__v1197Bridge && mod.__v1197Bridge.canSensitive) return !!mod.__v1197Bridge.canSensitive();
    return /Dirección|Admin|Operativo/.test(role());
  }
  function query() {
    const h = String(location.hash || '');
    return new URLSearchParams(h.includes('?') ? h.slice(h.indexOf('?') + 1) : '');
  }
  function currentInsurer() { const id = query().get('ficha'); return id ? S().get('aseguradoras', id) : null; }
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
      const [left, domain] = s.split('@');
      return (left.slice(0, 2) || '**') + '***@' + (domain || '').replace(/^(.{2}).*(\.[^.]+)$/,'$1***$2');
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
    try { S().insert('actividades', { id:'act_' + Date.now().toString(36), tipo:'admin', icon:'🏢', fecha:today(), titulo:action, detalle:reason || '', aseguradoraId:id }); } catch (e) {}
  }

  function sanitizePortal(raw, previous) {
    const p = Object.assign({}, previous || {}, raw || {});
    const rawUser = clean(p.usuario || p.user || '');
    const rawSecret = clean(p.password || p.pass || p.contrasena || '');
    const credentialRef = clean(p.credentialRef || p.secureAccessRef || (previous && (previous.credentialRef || previous.secureAccessRef)) || ((rawUser || rawSecret) ? 'backend_required' : ''));
    const out = Object.assign({}, p, {
      usuarioHint: clean(p.usuarioHint || (previous && previous.usuarioHint) || maskUser(rawUser)),
      credentialRef,
      estadoAcceso: clean(p.estadoAcceso || (credentialRef ? 'Pendiente conexión segura' : 'Sin verificar')),
      secretoExpuesto: false
    });
    delete out.usuario; delete out.user; delete out.password; delete out.pass; delete out.contrasena; delete out.secureAccessRef;
    return out;
  }
  function sanitizeAccount(raw, previous) {
    const c = Object.assign({}, previous || {}, raw || {});
    const rawNumber = clean(c.numero || c.accountNumber || '');
    const accountRef = clean(c.accountRef || c.secureAccountRef || (previous && (previous.accountRef || previous.secureAccountRef)) || (rawNumber ? 'backend_required' : ''));
    const out = Object.assign({}, c, {
      numeroHint: clean(c.numeroHint || (previous && previous.numeroHint) || maskRight(rawNumber, 4)),
      accountRef,
      estado: clean(c.estado || (accountRef ? 'Pendiente conexión segura' : 'Sin verificar')),
      secretoExpuesto: false
    });
    delete out.numero; delete out.accountNumber; delete out.secureAccountRef;
    return out;
  }
  function sanitizePatch(id, patch) {
    patch = clone(patch || {});
    const previous = S().get('aseguradoras', id) || {};
    if (Array.isArray(patch.portales)) patch.portales = patch.portales.map((p, i) => sanitizePortal(p, (previous.portales || [])[i]));
    if (Array.isArray(patch.cuentas)) patch.cuentas = patch.cuentas.map((c, i) => sanitizeAccount(c, (previous.cuentas || [])[i]));
    return patch;
  }
  function installStoreGuard() {
    const store = S();
    if (!store || store.__aseguradorasOp2SensitiveGuardV1217) return;
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
    store.__aseguradorasOp2SensitiveGuardV1217 = { originalUpdate, originalInsert };
  }
  installStoreGuard();

  function migrateLegacySensitive(id) {
    const row = S().get('aseguradoras', id); if (!row) return false;
    const legacyPortals = (row.portales || []).some(p => clean(p.usuario || p.user || p.password || p.pass || p.contrasena));
    const legacyAccounts = (row.cuentas || []).some(c => clean(c.numero || c.accountNumber));
    if (!legacyPortals && !legacyAccounts) return false;
    const before = clone(row);
    const alerts = Array.from(new Set([].concat(row.validacionAlertas || [], 'recursos_sensibles_legacy_requieren_conexion_segura')));
    S().update('aseguradoras', id, {
      portales:(row.portales || []).map(p => sanitizePortal(p, p)),
      cuentas:(row.cuentas || []).map(c => sanitizeAccount(c, c)),
      requiereValidacion:true,
      validacionAlertas:alerts,
      sensitiveResourceStatus:'requiere_conexion_segura',
      actividad:appendActivity(row, 'Recursos sensibles migrados a referencias protegidas')
    });
    const after = S().get('aseguradoras', id);
    audit('migrar_recursos_sensibles_legacy', id, before, after, 'Protección automática al abrir el editor', { legacyPortals, legacyAccounts, rawPersisted:false });
    return true;
  }

  function secureHint(row, kind, index, text) {
    if (!row || row.querySelector('[data-op2-secure-hint]')) return;
    const wrap = document.createElement('span');
    wrap.dataset.op2SecureHint = '1';
    wrap.className = 'asg217-secure-hint';
    wrap.innerHTML = `<span class="badge neutral">${esc(text)}</span><button type="button" class="btn ghost sm" data-op2-secure-action="${kind}:${index}">Gestionar de forma segura</button>`;
    row.appendChild(wrap);
  }
  function hardenEditor(id) {
    const back = document.getElementById('asg-ficha');
    const row = S().get('aseguradoras', id);
    if (!back || !row) return;
    migrateLegacySensitive(id);
    const current = S().get('aseguradoras', id) || row;

    back.querySelectorAll('[data-portal]').forEach((portalRow, i) => {
      const p = (current.portales || [])[i] || {};
      portalRow.dataset.cred = clean(p.credentialRef || p.secureAccessRef || '');
      const user = portalRow.querySelector('[data-pus]');
      const pass = portalRow.querySelector('[data-pp]');
      if (user) { user.value = ''; user.disabled = true; user.placeholder = p.usuarioHint ? 'Usuario protegido · ' + p.usuarioHint : 'Usuario protegido'; }
      if (pass) { pass.value = ''; pass.disabled = true; pass.placeholder = p.credentialRef ? 'Referencia segura registrada' : 'Conexión segura requerida'; }
      secureHint(portalRow, 'portal', i, p.credentialRef ? 'Acceso protegido' : 'Acceso pendiente');
    });
    back.querySelectorAll('[data-cta]').forEach((accountRow, i) => {
      const c = (current.cuentas || [])[i] || {};
      const number = accountRow.querySelector('[data-ccn]');
      if (number) { number.value = ''; number.disabled = true; number.placeholder = c.numeroHint ? 'Cuenta protegida · ' + c.numeroHint : 'Registrar mediante conexión segura'; }
      secureHint(accountRow, 'account', i, c.accountRef ? 'Cuenta protegida' : 'Cuenta pendiente');
    });
    back.querySelectorAll('[data-op2-secure-action]').forEach(button => {
      button.onclick = () => toast('La referencia se registra mediante la conexión segura autorizada. No se guardan usuarios, contraseñas ni cuentas completas en la ficha.');
    });
    const edit = back.querySelector('#af-editar');
    if (edit && !edit.dataset.op2Guard) {
      edit.dataset.op2Guard = '1';
      edit.addEventListener('click', () => setTimeout(() => hardenEditor(id), 0));
    }
    const save = back.querySelector('#af-save');
    if (save && !save.dataset.op2Guard) {
      save.dataset.op2Guard = '1';
      save.addEventListener('click', () => setTimeout(() => {
        const after = S().get('aseguradoras', id);
        if (after) audit('guardar_ficha_aseguradora', id, null, { id:after.id, ultimaRevision:after.ultimaRevision || '', recursosSensiblesProtegidos:true }, 'Cambios confirmados desde editor operativo', { rawPersisted:false });
      }, 500), true);
    }
  }

  function contactMain(a) { return (a.contactos || []).find(c => c.principal) || (a.contactos || [])[0] || {}; }
  function operationalSummary(a) {
    const c = contactMain(a);
    const quality = a.requiereValidacion || (a.validacionAlertas || []).length ? 'Requiere revisión' : (a.ultimaRevision ? 'Revisada' : 'Pendiente de revisión');
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
      const value = clean(a.codigoIntermediario); if (!value) return;
      if (Orbit.vault && Orbit.vault.copyText) toast(await Orbit.vault.copyText(value) ? 'Código copiado' : 'No se pudo copiar');
    };
    const email = host.querySelector('[data-op2-email]');
    if (email) email.onclick = () => {
      const c = contactMain(a);
      window.__orbitCompose = { para:c.email || '', asunto:a.nombre + ' · gestión operativa', cuerpo:'', vinculo:{ tipo:'aseguradora', id:a.id, label:a.nombre } };
      location.hash = '#/correo';
    };
    const web = host.querySelector('[data-op2-web]'); if (web) web.onclick = () => window.open(safeUrl(a.web), '_blank', 'noopener,noreferrer');
    const correction = host.querySelector('[data-op2-correction]');
    if (correction) correction.onclick = async () => {
      const detail = clean(await U.prompt('Describe el dato faltante o incorrecto:', { title:'Corrección de aseguradora' }));
      if (!detail) return;
      const out = A.correction ? A.correction('Corregir directorio · ' + a.nombre, detail, { aseguradoraId:a.id, pais:a.pais, prioridad:'Media' }) : null;
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
        const button = document.createElement('button'); button.className = 'btn primary'; button.dataset.editAsg = '1'; button.textContent = 'Editar';
        button.onclick = () => mod.ficha && mod.ficha(ficha.id, true); head.appendChild(button);
      }
      return;
    }
    if (host.querySelector('[data-op2-directory-actions]') || host.querySelector('[data-new-asg]')) return;
    const page = host.querySelector('.asg197'); if (!page) return;
    const actions = document.createElement('section'); actions.dataset.op2DirectoryActions = '1'; actions.className = 'card pad asg217-actions';
    actions.innerHTML = '<div><b>Administración del directorio</b><small>Alta e importación disponibles según el rol activo.</small></div><div><button class="btn ghost" data-op2-import>Importar directorio</button><button class="btn primary" data-op2-new>+ Aseguradora</button></div>';
    const banner = page.firstElementChild; if (banner && banner.parentNode) banner.insertAdjacentElement('afterend', actions); else page.prepend(actions);
    actions.querySelector('[data-op2-import]').onclick = () => mod.importarDirectorio ? mod.importarDirectorio() : Orbit.importa.open('directorio-aseguradoras');
    actions.querySelector('[data-op2-new]').onclick = () => mod.nuevaAseguradora ? mod.nuevaAseguradora() : toast('Alta no disponible');
  }
  const stateLabels = {
    inventario_fuentes:'Inventario recibido', fuentes_incompletas:'Fuentes incompletas', lectura_pendiente:'Lectura pendiente',
    extraccion_en_prueba:'Extracción en prueba', requiere_validacion:'Requiere validación', calibrado:'Calibrado',
    validado_habilitado:'Validado y habilitado', reemplazado_por_version:'Reemplazado por versión', bloqueado:'Bloqueado',
    conocimiento_parcial:'Conocimiento parcial', requiere_cotizacion_ejemplo:'Requiere cotización ejemplo',
    presentacion_sin_tarifa:'Presentación sin tarifa', fuentes_completas_requiere_validacion:'Fuentes completas · requiere validación'
  };
  function cleanCopy(root) {
    if (!root || !document.createTreeWalker) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      let text = node.nodeValue;
      Object.keys(stateLabels).forEach(key => { text = text.replace(new RegExp('\\b' + key + '\\b','g'), stateLabels[key]); });
      text = text.replace(/backend_required/gi, 'conexión segura pendiente').replace(/accountRef|credentialRef/gi, 'referencia protegida');
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
    const observer = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => { if (node.nodeType === 1) cleanCopy(node); })));
    observer.observe(document.documentElement, { childList:true, subtree:true });
  }

  mod.__op2ClosureV1217 = { originalFicha, originalRender, sanitizePortal, sanitizeAccount, sanitizePatch, migrateLegacySensitive, enhance };
})();
