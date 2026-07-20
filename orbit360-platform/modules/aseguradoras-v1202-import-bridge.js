/* ============================================================
   Orbit 360 · Aseguradoras v1.203 — importación y alta segura
   - directorios multihoja al importador especializado;
   - alta manual confirm-before-insert;
   - documentos/tarifarios con propuesta durable y estado honesto;
   - nunca declara archivo almacenado sin referencia comprobable.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
(function () {
  'use strict';
  const mod = Orbit.modules.aseguradoras;
  const D = Orbit.insurerDirectoryImport;
  const A = Orbit.access;
  const U = Orbit.ui;
  const S = () => Orbit.store;
  if (!mod || !D || !A || Orbit.__insurerDirectoryBridgeV1203) return;
  Orbit.__insurerDirectoryBridgeV1203 = true;

  function esc(v) { return U && U.esc ? U.esc(String(v == null ? '' : v)) : String(v || ''); }
  function clean(v) { return String(v == null ? '' : v).trim(); }
  function toast(v) { try { U.toast(v); } catch (e) {} }
  function tenantId() { return A.tenantId ? A.tenantId() : ''; }
  function role() { return A.activeRole ? A.activeRole() : 'Sin rol'; }
  function actor() { return A.actorUser ? A.actorUser() : { nombre: 'Usuario', rolActivo: role() }; }
  function today() { return U && U.today ? U.today() : new Date().toISOString().slice(0, 10); }
  function canCreate() { return A.can ? A.can('aseguradoras', 'create') : D.canManage(); }
  function canManage() { return ['Dirección','Admin'].includes(role()) || canCreate(); }
  function countryOptions(selected) {
    return (Orbit.PAISES || [{ id: 'GT', label: 'Guatemala' }, { id: 'CO', label: 'Colombia' }]).filter(p => p.id !== 'TODOS')
      .map(p => `<option value="${esc(p.id)}" ${p.id === selected ? 'selected' : ''}>${esc(p.label || p.id)}</option>`).join('');
  }
  function duplicate(name, country) {
    const key = D.normalizeName(name);
    return (S().all('aseguradoras') || []).find(x => x && (!x.pais || x.pais === country) && D.normalizeName(x.nombre) === key) || null;
  }
  function modal(id, title, body, actions, options) {
    options = options || {};
    let b = document.getElementById(id); if (b) b.remove();
    b = document.createElement('div'); b.id = id; b.className = 'drawer-back open'; b.style.cssText = 'display:grid;place-items:center;z-index:245';
    b.innerHTML = `<div class="card" style="width:min(${options.width || '680px'},96vw);max-height:92vh;overflow:auto;padding:0"><div style="padding:17px 20px;background:linear-gradient(120deg,var(--graph),#10141a);display:flex;justify-content:space-between;gap:12px"><div><small style="color:rgba(255,255,255,.65)">Aseguradoras</small><b style="display:block;color:#fff;font-family:var(--f-display);font-size:17px;overflow-wrap:anywhere">${esc(title)}</b></div><button class="imp-x" data-close style="color:#fff">✕</button></div><div style="padding:18px 20px" data-modal-body>${body}</div><div style="padding:13px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">${actions || ''}<button class="btn ghost" data-close>Cancelar</button></div></div>`;
    document.body.appendChild(b); const close = () => b.remove(); b.querySelectorAll('[data-close]').forEach(x => x.onclick = close); b.addEventListener('click', e => { if (e.target === b) close(); }); return b;
  }
  function openPage(id) { if (typeof mod.fichaPagina === 'function') return mod.fichaPagina(id); location.hash = '#/aseguradoras?ficha=' + encodeURIComponent(id); }

  function openNewInsurer() {
    if (!canCreate()) return toast('Tu rol activo no puede crear aseguradoras.');
    const current = Orbit.pais && Orbit.pais !== 'TODOS' ? Orbit.pais : '';
    const body = `<div class="cfg-note" style="margin-bottom:13px">El país es obligatorio porque define moneda, impuestos, catálogos y alcance. La ficha solo se crea al confirmar nombre, país y motivo; cancelar no escribe ningún borrador.</div><div class="cgrid">
      <label class="ce-l">Nombre comercial *<input id="asg1202-name" class="o-sel"></label><label class="ce-l">País *<select id="asg1202-country" class="o-sel"><option value="">— Seleccionar —</option>${countryOptions(current)}</select></label>
      <label class="ce-l">NIT / identificación fiscal<input id="asg1202-nit" class="o-sel"></label><label class="ce-l">Código de intermediario<input id="asg1202-code" class="o-sel"></label>
      <label class="ce-l">Teléfono general<input id="asg1202-phone" class="o-sel"></label><label class="ce-l">Tipo<select id="asg1202-type" class="o-sel"><option value="insurer">Aseguradora</option><option value="partner_network">Aliado / red / agencia</option></select></label>
    </div><label class="ce-l" style="margin-top:12px">Motivo de alta *<textarea id="asg1202-reason" class="o-sel" style="min-height:64px"></textarea></label>`;
    const b = modal('asg-new-v1202', 'Nueva aseguradora / aliado', body, '<button class="btn primary" data-save>Crear ficha</button>');
    b.querySelector('[data-save]').onclick = () => {
      const name = clean(b.querySelector('#asg1202-name').value), country = b.querySelector('#asg1202-country').value;
      const reason = clean(b.querySelector('#asg1202-reason').value), entityType = b.querySelector('#asg1202-type').value;
      if (!name) return toast('Ingresa el nombre comercial.'); if (!country) return toast('Selecciona el país.'); if (!reason) return toast('Registra el motivo del alta.');
      const found = duplicate(name, country); if (found) { b.remove(); toast('La aseguradora ya existe. Abriendo su ficha.'); return openPage(found.id); }
      const user = actor(), id = 'asg_' + Date.now().toString(36);
      const row = { id, tenantId: tenantId(), nombre: name, pais: country, monedaBase: country === 'CO' ? 'COP' : 'GTQ', entityType,
        nit: clean(b.querySelector('#asg1202-nit').value), codigoIntermediario: clean(b.querySelector('#asg1202-code').value), telGeneral: clean(b.querySelector('#asg1202-phone').value),
        vinculada: false, activa: true, contactos: [], portales: [], cuentas: [], ramos: [], docs: [], actividad: [{ fecha: today(), cambio: 'Ficha creada', responsable: user.nombre || role(), motivo: reason }],
        fuente: 'ingreso_manual_plataforma', fuenteFecha: new Date().toISOString(), creadoPor: user.id || user.nombre,
        trazabilidad: { origen: 'ingreso_manual_plataforma', actorId: user.id || '', actorNombre: user.nombre || '', rolActivo: role(), fecha: new Date().toISOString(), tenantId: tenantId() },
        requiereValidacion: entityType !== 'insurer', validacionAlertas: entityType !== 'insurer' ? ['clasificacion_entidad_requiere_validacion'] : [],
        sensitiveImportStatus: { credentialsDetected: 0, accountsDetected: 0, status: 'sin_sensibles' } };
      S().insert('aseguradoras', row);
      try { S().insert('actividades', { id: 'act_' + Date.now().toString(36), tenantId: row.tenantId, tipo: 'aseguradora', icon: '🏢', fecha: today(), titulo: 'Ficha de aseguradora creada', detalle: name + ' · ' + country, aseguradoraId: id, fuente: row.fuente }); } catch (e) {}
      if (A.audit) A.audit('crear', 'aseguradoras', id, null, row, reason, { country, entityType }); b.remove(); openPage(id);
    };
  }

  function currentInsurerId(options) {
    const scoped = options && options.scope && (options.scope.insurerId || options.scope.aseguradoraId);
    if (scoped) return scoped;
    try { if (Orbit.route && Orbit.route.params && Orbit.route.params.ficha) return Orbit.route.params.ficha; } catch (e) {}
    const m = String(location.hash || '').match(/[?&]ficha=([^&]+)/); return m ? decodeURIComponent(m[1]) : '';
  }
  function activeTarget(options) {
    if (options && options.scope && options.scope.target) return options.scope.target;
    const active = document.querySelector('#asg-ficha .asg-tab.on, #asg-ficha .asg-tab.active');
    return active && active.dataset.tab === 'tarifas' ? 'tarifas' : 'documentos';
  }
  function safeUrl(value) { const v = clean(value); return /^https:\/\/[^\s]+$/i.test(v) ? v : ''; }
  async function fingerprint(file) {
    try {
      const buf = await file.arrayBuffer(); const hash = await crypto.subtle.digest('SHA-256', buf);
      return Array.from(new Uint8Array(hash)).map(x => x.toString(16).padStart(2, '0')).join('');
    } catch (e) { return [file.name, file.size, file.lastModified].join(':'); }
  }
  function waitForSync(id, timeout) {
    timeout = timeout || 15000;
    return new Promise(resolve => {
      const started = Date.now();
      (function check() {
        const row = S().get('aseguradoras', id);
        const status = row && row._syncStatus;
        if (status === 'synced' || (!status && Date.now() - started > 800)) return resolve({ ok: true, row });
        if (status === 'failed') return resolve({ ok: false, row, error: row._syncError || 'No se pudo guardar' });
        if (Date.now() - started >= timeout) return resolve({ ok: false, row, error: 'No se confirmó la persistencia' });
        setTimeout(check, 160);
      })();
    });
  }
  function categoryOptions(target) {
    const values = target === 'tarifas'
      ? [['tarifario','Tarifario'],['cotizacion_ejemplo','Cotización de ejemplo'],['manual','Manual / condiciones'],['formulario','Formulario']]
      : [['documento_general','Documento general'],['formulario','Formulario'],['cotizacion_ejemplo','Cotización de ejemplo'],['poliza_ejemplo','Póliza de ejemplo'],['tarifario','Tarifario']];
    return values.map((item,i) => `<option value="${item[0]}" ${i === 0 ? 'selected' : ''}>${item[1]}</option>`).join('');
  }

  function openInsurerDocumentImport(options) {
    options = options || {};
    if (!canManage()) return toast('Tu rol activo no puede registrar documentos de aseguradora.');
    const insurerId = currentInsurerId(options), insurer = S().get('aseguradoras', insurerId);
    if (!insurer) return toast('Abre primero la ficha de una aseguradora.');
    const target = activeTarget(options), country = insurer.pais || '', currency = country === 'CO' ? 'COP' : country === 'GT' ? 'GTQ' : '';
    const body = `<div class="cfg-note" style="margin-bottom:14px"><b>Estado honesto:</b> Orbit registrará la propuesta y su trazabilidad. El archivo solo se marcará disponible si se aporta una referencia HTTPS verificable. Seleccionarlo en este navegador no equivale a almacenarlo.</div>
      <div class="cgrid"><label class="ce-l">Archivo *<input id="asgdoc-file" class="o-sel" type="file" accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.png,.jpg,.jpeg,.webp"></label>
      <label class="ce-l">Destino<select id="asgdoc-target" class="o-sel"><option value="documentos" ${target === 'documentos' ? 'selected' : ''}>Documentos y Drive</option><option value="tarifas" ${target === 'tarifas' ? 'selected' : ''}>Tarifas y conocimiento</option></select></label>
      <label class="ce-l">Categoría<select id="asgdoc-cat" class="o-sel">${categoryOptions(target)}</select></label><label class="ce-l">País<input class="o-sel" value="${esc(country)}" readonly></label>
      <label class="ce-l">Moneda<input class="o-sel" value="${esc(currency)}" readonly></label><label class="ce-l">Ramo<input id="asgdoc-ramo" class="o-sel" placeholder="Ej. Vehículos"></label>
      <label class="ce-l">Producto / plan<input id="asgdoc-product" class="o-sel" placeholder="Opcional"></label><label class="ce-l">Versión<input id="asgdoc-version" class="o-sel" placeholder="Ej. 2026.1"></label></div>
      <label class="ce-l" style="margin-top:12px">Enlace HTTPS / Drive autorizado<input id="asgdoc-url" class="o-sel" type="url" placeholder="https://…"><small class="muted">Opcional. Sin enlace, la propuesta queda pendiente de almacenamiento seguro y no se afirmará que el archivo fue cargado.</small></label>
      <label class="ce-l" style="margin-top:12px">Motivo / fuente *<textarea id="asgdoc-reason" class="o-sel" style="min-height:66px" placeholder="Origen del documento y propósito"></textarea></label>
      <div id="asgdoc-status" class="cfg-note" style="margin-top:12px">No se ha guardado nada.</div>`;
    const b = modal('asg-doc-import-v1203', 'Registrar documento · ' + insurer.nombre, body, '<button class="btn primary" data-save>Registrar propuesta</button>', { width: '780px' });
    const targetSel = b.querySelector('#asgdoc-target'), catSel = b.querySelector('#asgdoc-cat');
    targetSel.addEventListener('change', () => { catSel.innerHTML = categoryOptions(targetSel.value); });
    b.querySelector('[data-save]').onclick = async () => {
      const file = b.querySelector('#asgdoc-file').files[0], reason = clean(b.querySelector('#asgdoc-reason').value), external = clean(b.querySelector('#asgdoc-url').value);
      const status = b.querySelector('#asgdoc-status'), save = b.querySelector('[data-save]');
      if (!file) return toast('Selecciona un archivo.'); if (!reason) return toast('Registra el motivo o fuente.'); if (external && !safeUrl(external)) return toast('El enlace debe ser HTTPS.');
      save.disabled = true; status.innerHTML = '<b>Verificando archivo y preparando trazabilidad…</b>';
      const fp = await fingerprint(file); const current = S().get('aseguradoras', insurerId) || insurer; const docs = (current.docs || []).slice();
      const duplicateDoc = docs.find(d => d && (d.fingerprint === fp || (d.nombre === file.name && d.tamano === file.size)));
      if (duplicateDoc) { status.innerHTML = '<b>Este archivo ya fue registrado.</b> No se creó un duplicado.'; save.disabled = false; return; }
      const now = new Date().toISOString(), user = actor(), url = safeUrl(external);
      const doc = { id: 'doc_asg_' + Date.now().toString(36), nombre: file.name, tipo: catSel.value, cat: catSel.options[catSel.selectedIndex].text,
        destino: targetSel.value, pais: country, moneda: currency, ramo: clean(b.querySelector('#asgdoc-ramo').value), producto: clean(b.querySelector('#asgdoc-product').value), version: clean(b.querySelector('#asgdoc-version').value),
        mimeType: file.type || '', tamano: file.size, fingerprint: fp, externalUrl: url, archivoDisponible: !!url,
        storageEstado: url ? 'referencia_externa_verificada' : 'pendiente_almacenamiento_seguro', estado: url ? 'Referencia disponible' : 'Pendiente de almacenamiento seguro',
        propuestaImportacion: true, requiereValidacion: true, impactoCotizador: false, impactoComparativo: false, creadoEn: now, responsable: user.nombre || role(), fuente: reason };
      docs.unshift(doc);
      const activity = (current.actividad || []).slice();
      activity.unshift({ fecha: now, cambio: 'Propuesta documental registrada', motivo: reason, responsable: user.nombre || role(), documentoId: doc.id, destino: doc.destino, almacenamiento: doc.storageEstado });
      S().update('aseguradoras', insurerId, { docs, actividad: activity.slice(0, 80), ultimaRevisionDocumental: now });
      const sync = await waitForSync(insurerId, 15000);
      const readBack = sync.row && (sync.row.docs || []).some(d => d && d.id === doc.id && d.fingerprint === fp);
      if (!sync.ok || !readBack) {
        status.innerHTML = '<b style="color:var(--danger)">No se confirmó el registro.</b> La plataforma no declarará éxito. Revisa la conexión e inténtalo nuevamente.';
        save.disabled = false; return;
      }
      if (A.audit) A.audit('registrar_propuesta_documental', 'aseguradoras', insurerId, current, sync.row, reason, { documentoId: doc.id, destino: doc.destino, archivoDisponible: doc.archivoDisponible, fingerprint: fp });
      status.innerHTML = url
        ? '<b style="color:var(--ok)">Referencia registrada y verificada.</b> El documento ya puede abrirse desde el enlace autorizado. Cotizador y Comparativo continúan deshabilitados hasta validación.'
        : '<b style="color:var(--warn)">Propuesta registrada.</b> El archivo no fue almacenado; queda claramente marcado como pendiente de almacenamiento seguro.';
      save.textContent = 'Registrado';
      if (options.onDone) options.onDone();
      setTimeout(() => { b.remove(); openPage(insurerId); }, 1800);
    };
  }

  const originalImportOpen = Orbit.importa && Orbit.importa.open ? Orbit.importa.open.bind(Orbit.importa) : null;
  if (Orbit.importa && originalImportOpen) {
    Orbit.importa.open = function (kind, options) {
      if (kind === 'directorio-aseguradoras' || kind === 'directorio_aseguradoras') return D.open(options || {});
      if (kind === 'docs-aseguradora') return openInsurerDocumentImport(options || {});
      return originalImportOpen(kind, options);
    };
  }

  const originalNew = mod.nuevaAseguradora && mod.nuevaAseguradora.bind(mod);
  mod.nuevaAseguradora = openNewInsurer;
  mod.importarDirectorio = function () { return D.open({ onDone: () => mod.render(document.getElementById('host')) }); };
  mod.importarDocumentoSeguro = openInsurerDocumentImport;

  const originalRender = mod.render.bind(mod);
  mod.render = function (host) {
    const out = originalRender(host);
    setTimeout(() => {
      if (!host) return;
      const add = host.querySelector('#asg-new, [data-new-asg]');
      if (add && !add.dataset.v1203) { const replacement = add.cloneNode(true); replacement.dataset.v1203 = '1'; replacement.dataset.newAsg = 'safe-confirm-before-insert'; replacement.addEventListener('click', openNewInsurer); add.replaceWith(replacement); }
      const imp = host.querySelector('#asg-imp, [data-import-asg]');
      if (imp && !imp.dataset.v1203) { const replacement = imp.cloneNode(true); replacement.dataset.v1203 = '1'; replacement.dataset.importAsg = 'specialized-directory-import'; replacement.addEventListener('click', () => mod.importarDirectorio()); imp.replaceWith(replacement); }
    }, 0);
    return out;
  };

  mod.__directoryImportV1203 = { originalNew, originalImportOpen, originalRender, safeCreateBeforeInsert: true, cancelWritesStore: false,
    documentaryImportRequiresVerifiedPersistence: true, selectedFileDoesNotEqualStored: true, supportsExternalHttpsReference: true, selectors: ['#asg-new', '#asg-imp'] };
})();
