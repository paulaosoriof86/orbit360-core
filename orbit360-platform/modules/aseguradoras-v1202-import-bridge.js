/* ============================================================
   Orbit 360 · Aseguradoras v1.202 — importación y alta segura
   - enruta directorios multihoja al importador especializado;
   - exige país explícito en altas manuales;
   - no crea borradores ni duplica país/nombre;
   - conserva editor/ficha existente y motor _fuentes.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
(function () {
  const mod = Orbit.modules.aseguradoras;
  const D = Orbit.insurerDirectoryImport;
  const A = Orbit.access;
  const U = Orbit.ui;
  const S = () => Orbit.store;
  if (!mod || !D || !A || Orbit.__insurerDirectoryBridgeV1202) return;
  Orbit.__insurerDirectoryBridgeV1202 = true;

  function esc(v) { return U && U.esc ? U.esc(String(v == null ? '' : v)) : String(v || ''); }
  function clean(v) { return String(v == null ? '' : v).trim(); }
  function toast(v) { try { U.toast(v); } catch (e) {} }
  function tenantId() { return A.tenantId ? A.tenantId() : ''; }
  function role() { return A.activeRole ? A.activeRole() : 'Sin rol'; }
  function actor() { return A.actorUser ? A.actorUser() : { nombre: 'Usuario', rolActivo: role() }; }
  function today() { return U && U.today ? U.today() : new Date().toISOString().slice(0, 10); }
  function canCreate() { return A.can ? A.can('aseguradoras', 'create') : D.canManage(); }
  function countryOptions(selected) {
    return (Orbit.PAISES || [{ id: 'GT', label: 'Guatemala' }, { id: 'CO', label: 'Colombia' }])
      .filter(p => p.id !== 'TODOS')
      .map(p => `<option value="${esc(p.id)}" ${p.id === selected ? 'selected' : ''}>${esc(p.label || p.id)}</option>`).join('');
  }
  function duplicate(name, country) {
    const key = D.normalizeName(name);
    return (S().all('aseguradoras') || []).find(x => x && (!x.pais || x.pais === country) && D.normalizeName(x.nombre) === key) || null;
  }
  function modal(id, title, body, actions) {
    let b = document.getElementById(id); if (b) b.remove();
    b = document.createElement('div'); b.id = id; b.className = 'drawer-back open'; b.style.cssText = 'display:grid;place-items:center;z-index:245';
    b.innerHTML = `<div class="card" style="width:min(680px,96vw);max-height:92vh;overflow:auto;padding:0"><div style="padding:17px 20px;background:linear-gradient(120deg,var(--graph),#10141a);display:flex;justify-content:space-between;gap:12px"><div><small style="color:rgba(255,255,255,.65)">Aseguradoras</small><b style="display:block;color:#fff;font-family:var(--f-display);font-size:17px">${esc(title)}</b></div><button class="imp-x" data-close style="color:#fff">✕</button></div><div style="padding:18px 20px">${body}</div><div style="padding:13px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end">${actions || ''}<button class="btn ghost" data-close>Cancelar</button></div></div>`;
    document.body.appendChild(b); const close = () => b.remove(); b.querySelectorAll('[data-close]').forEach(x => x.onclick = close); b.addEventListener('click', e => { if (e.target === b) close(); }); return b;
  }
  function openPage(id) {
    if (typeof mod.fichaPagina === 'function') return mod.fichaPagina(id);
    location.hash = '#/aseguradoras?ficha=' + encodeURIComponent(id);
  }
  function openNewInsurer() {
    if (!canCreate()) return toast('Tu rol activo no puede crear aseguradoras.');
    const current = Orbit.pais && Orbit.pais !== 'TODOS' ? Orbit.pais : '';
    const body = `<div class="cfg-note" style="margin-bottom:13px">El país es obligatorio porque define moneda, impuestos, catálogos y alcance. La ficha solo se crea al confirmar nombre, país y motivo; cancelar no escribe ningún borrador.</div><div class="cgrid">
      <label class="ce-l">Nombre comercial *<input id="asg1202-name" class="o-sel"></label>
      <label class="ce-l">País *<select id="asg1202-country" class="o-sel"><option value="">— Seleccionar —</option>${countryOptions(current)}</select></label>
      <label class="ce-l">NIT / identificación fiscal<input id="asg1202-nit" class="o-sel"></label>
      <label class="ce-l">Código de intermediario<input id="asg1202-code" class="o-sel"></label>
      <label class="ce-l">Teléfono general<input id="asg1202-phone" class="o-sel"></label>
      <label class="ce-l">Tipo<select id="asg1202-type" class="o-sel"><option value="insurer">Aseguradora</option><option value="partner_network">Aliado / red / agencia</option></select></label>
    </div><label class="ce-l" style="margin-top:12px">Motivo de alta *<textarea id="asg1202-reason" class="o-sel" style="min-height:64px"></textarea></label>`;
    const b = modal('asg-new-v1202', 'Nueva aseguradora / aliado', body, '<button class="btn primary" data-save>Crear ficha</button>');
    b.querySelector('[data-save]').onclick = () => {
      const name = clean(b.querySelector('#asg1202-name').value), country = b.querySelector('#asg1202-country').value;
      const reason = clean(b.querySelector('#asg1202-reason').value), entityType = b.querySelector('#asg1202-type').value;
      if (!name) return toast('Ingresa el nombre comercial.');
      if (!country) return toast('Selecciona el país.');
      if (!reason) return toast('Registra el motivo del alta.');
      const found = duplicate(name, country);
      if (found) { b.remove(); toast('La aseguradora ya existe. Abriendo su ficha.'); return openPage(found.id); }
      const user = actor(), id = 'asg_' + Date.now().toString(36);
      const row = {
        id, tenantId: tenantId(), nombre: name, pais: country, monedaBase: country === 'CO' ? 'COP' : 'GTQ',
        entityType, nit: clean(b.querySelector('#asg1202-nit').value), codigoIntermediario: clean(b.querySelector('#asg1202-code').value),
        telGeneral: clean(b.querySelector('#asg1202-phone').value), vinculada: false, activa: true,
        contactos: [], portales: [], cuentas: [], ramos: [], docs: [], actividad: [{ fecha: today(), cambio: 'Ficha creada', responsable: user.nombre || role() }],
        fuente: 'ingreso_manual_plataforma', fuenteFecha: new Date().toISOString(), creadoPor: user.id || user.nombre,
        trazabilidad: { origen: 'ingreso_manual_plataforma', actorId: user.id || '', actorNombre: user.nombre || '', rolActivo: role(), fecha: new Date().toISOString(), tenantId: tenantId() },
        requiereValidacion: entityType !== 'insurer', validacionAlertas: entityType !== 'insurer' ? ['clasificacion_entidad_requiere_validacion'] : [],
        sensitiveImportStatus: { credentialsDetected: 0, accountsDetected: 0, status: 'sin_sensibles' }
      };
      S().insert('aseguradoras', row);
      try { S().insert('actividades', { id: 'act_' + Date.now().toString(36), tenantId: row.tenantId, tipo: 'aseguradora', icon: '🏢', fecha: today(), titulo: 'Ficha de aseguradora creada', detalle: name + ' · ' + country, aseguradoraId: id, fuente: row.fuente }); } catch (e) {}
      if (A.audit) A.audit('crear', 'aseguradoras', id, null, row, reason, { country, entityType });
      b.remove(); openPage(id);
    };
  }

  const originalImportOpen = Orbit.importa && Orbit.importa.open ? Orbit.importa.open.bind(Orbit.importa) : null;
  if (Orbit.importa && originalImportOpen) {
    Orbit.importa.open = function (kind, options) {
      if (kind === 'directorio-aseguradoras' || kind === 'directorio_aseguradoras') return D.open(options || {});
      return originalImportOpen(kind, options);
    };
  }

  const originalNew = mod.nuevaAseguradora && mod.nuevaAseguradora.bind(mod);
  mod.nuevaAseguradora = openNewInsurer;
  mod.importarDirectorio = function () { return D.open({ onDone: () => mod.render(document.getElementById('host')) }); };

  const originalRender = mod.render.bind(mod);
  mod.render = function (host) {
    const out = originalRender(host);
    setTimeout(() => {
      if (!host) return;
      const add = host.querySelector('#asg-new, [data-new-asg]');
      if (add && !add.dataset.v1202) {
        const replacement = add.cloneNode(true);
        replacement.dataset.v1202 = '1';
        replacement.dataset.newAsg = 'safe-confirm-before-insert';
        replacement.addEventListener('click', openNewInsurer);
        add.replaceWith(replacement);
      }
      const imp = host.querySelector('#asg-imp, [data-import-asg]');
      if (imp && !imp.dataset.v1202) {
        const replacement = imp.cloneNode(true);
        replacement.dataset.v1202 = '1';
        replacement.dataset.importAsg = 'specialized-directory-import';
        replacement.addEventListener('click', () => mod.importarDirectorio());
        imp.replaceWith(replacement);
      }
    }, 0);
    return out;
  };

  mod.__directoryImportV1202 = {
    originalNew,
    originalImportOpen,
    originalRender,
    safeCreateBeforeInsert: true,
    cancelWritesStore: false,
    selectors: ['#asg-new', '#asg-imp']
  };
})();
