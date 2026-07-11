/* ============================================================
   Orbit 360 · Cierre operativo CRM v1.198
   - Aplica scope propios/equipo/todos/ninguno al grupo CRM.
   - Bloquea deep-links fuera de alcance.
   - Corrige KPI de Cliente360 y evita mezclar GTQ/COP.
   - Alta manual tenant-aware, trazable y con deduplicación.
   - Asesor completa faltantes; cambios críticos crean gestión.
   - Protege pólizas, cobros, conciliación y comisiones por permiso.
   No reemplaza módulos base ni archivos protegidos.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
(function () {
  const A = Orbit.access;
  if (!A || Orbit.__crmV1198) return;
  Orbit.__crmV1198 = true;
  const U = Orbit.ui;
  const baseStore = () => Orbit.store;

  function esc(v) { return U && U.esc ? U.esc(String(v == null ? '' : v)) : String(v || ''); }
  function toast(v) { try { U.toast(v); } catch (e) {} }
  function routeParams() { try { return (Orbit.route && Orbit.route.params) || {}; } catch (e) { return {}; } }
  function moduleHost() { return document.getElementById('host'); }

  function denied(host, detail) {
    host = host || moduleHost();
    if (!host) return;
    host.innerHTML = `<div class="page"><div class="modstate"><div class="ms-ico">🔒</div><h2>Acceso restringido</h2><p>${esc(detail || 'Este registro no pertenece a tu alcance de datos activo.')}</p><button class="btn ghost" data-back-crm>Volver</button></div></div>`;
    const b = host.querySelector('[data-back-crm]');
    if (b) b.addEventListener('click', () => { location.hash = '#/cliente360'; });
  }

  function recordAllowed(collection, id, moduleKey) {
    const rec = baseStore().get(collection, id);
    return !!(rec && A.canView(collection, rec, moduleKey));
  }

  function wrapRender(moduleName, moduleKey, after) {
    const mod = Orbit.modules[moduleName];
    if (!mod || typeof mod.render !== 'function' || mod.__scopeV1198) return;
    const original = mod.render.bind(mod);
    mod.render = function (host) {
      const p = routeParams();
      const deep = moduleName === 'cliente360' ? p.c : '';
      if (deep && !recordAllowed('clientes', deep, moduleKey)) return denied(host);
      const out = A.withScope(moduleKey, () => original(host));
      if (after) setTimeout(() => after(host), 0);
      return out;
    };
    mod.__scopeV1198 = { original };
  }

  function moneyByCurrency(rows, amountFn) {
    const map = {};
    (rows || []).forEach(r => {
      const cur = r.moneda || r.divisa || A.currencyFor(r.pais) || 'SIN_MONEDA';
      const n = +(amountFn(r) || 0);
      map[cur] = (map[cur] || 0) + n;
    });
    return map;
  }

  function moneyLines(map) {
    const keys = Object.keys(map);
    if (!keys.length) return '<span class="muted">Sin valores</span>';
    return keys.map(k => `<span style="display:block;font-size:${keys.length > 1 ? '14px' : '22px'}">${esc(k)} ${Number(map[k] || 0).toLocaleString('es-GT', { maximumFractionDigits: 0 })}</span>`).join('');
  }

  function modalList(title, subtitle, rows) {
    let back = document.getElementById('crm-kpi-v1198'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'crm-kpi-v1198'; back.className = 'drawer-back open';
    back.style.cssText = 'display:grid;place-items:center;z-index:220';
    back.innerHTML = `<div class="card" style="width:min(760px,95vw);max-height:92vh;display:flex;flex-direction:column;padding:0">
      <div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><div class="crumb">Detalle del indicador</div><b style="font-family:var(--f-display);font-size:17px">${esc(title)}</b>${subtitle ? `<div class="muted" style="font-size:12px;margin-top:3px">${esc(subtitle)}</div>` : ''}</div><button class="imp-x" data-close>✕</button></div>
      <div style="padding:8px 18px 18px;overflow:auto;flex:1">${rows.length ? rows.join('') : '<div class="empty">No hay registros para este indicador.</div>'}</div>
      <div style="padding:12px 18px;border-top:1px solid var(--line);display:flex;justify-content:flex-end"><button class="btn ghost" data-close>Cerrar</button></div></div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelectorAll('[data-client]').forEach(b => b.addEventListener('click', () => { close(); location.hash = '#/cliente360?c=' + encodeURIComponent(b.dataset.client); }));
    back.querySelectorAll('[data-policy]').forEach(b => b.addEventListener('click', () => { const p = baseStore().get('polizas', b.dataset.policy); close(); location.hash = '#/cliente360?c=' + encodeURIComponent(p ? p.clienteId : '') + '&t=polizas'; }));
  }

  function clientRow(c, detail) {
    return `<button class="asg197-detail-row" data-client="${esc(c.id)}"><span><b>${esc(c.nombre || 'Cliente')}</b><small>${esc(detail || ((c.pais || '—') + ' · ' + (c.estadoOperativo || c.estado || 'pendiente_polizas')))}</small></span><span>Ver expediente →</span></button>`;
  }
  function policyRow(p, detail) {
    const c = baseStore().get('clientes', p.clienteId) || {};
    return `<button class="asg197-detail-row" data-policy="${esc(p.id)}"><span><b>${esc(p.numero || 'Póliza')} · ${esc(c.nombre || '')}</b><small>${esc(detail || ((p.ramo || '—') + ' · ' + (p.estado || '—') + ' · ' + (p.moneda || '')))}</small></span><span>Ver póliza →</span></button>`;
  }

  function scopedRows(collection, moduleKey) {
    return A.filter(collection, baseStore().all(collection) || [], moduleKey);
  }

  function daysUntil(s) {
    if (!s) return 99999;
    const d = new Date(s + 'T00:00:00');
    const n = new Date(); n.setHours(0,0,0,0);
    return Math.ceil((d - n) / 86400000);
  }

  function enhanceClientList(host) {
    if (!host || routeParams().c) return;
    const clients = scopedRows('clientes', 'cliente360');
    const clientIds = new Set(clients.map(c => c.id));
    const policies = scopedRows('polizas', 'cliente360').filter(p => clientIds.has(p.clienteId));
    const active = policies.filter(p => ['vigente', 'porrenovar'].includes(A.norm(p.estado)));
    const renewals = active.filter(p => { const d = daysUntil(p.vigenciaFin); return d >= 0 && d <= 45; });
    const premiums = moneyByCurrency(active, p => p.primaNeta != null ? p.primaNeta : p.prima);
    const kpis = host.querySelectorAll('.kpi-row .kpi');
    if (kpis.length >= 4) {
      const definitions = [
        {
          label: 'Clientes', value: String(clients.length), foot: clients.filter(c => c.tipo === 'Empresa').length + ' empresas · ' + clients.filter(c => c.tipo === 'Persona').length + ' personas',
          click: () => modalList('Clientes en tu alcance', 'Filtro: ' + A.dataScope('cliente360'), clients.map(c => clientRow(c)))
        },
        {
          label: 'Pólizas activas', value: String(active.length), foot: active.filter(p => A.norm(p.estado) === 'porrenovar').length + ' por renovar',
          click: () => modalList('Pólizas activas', 'Vigente y Por renovar', active.map(p => policyRow(p)))
        },
        {
          label: 'Prima neta vigente', html: moneyLines(premiums), foot: 'Separada por moneda; no se suman GTQ y COP',
          click: () => modalList('Prima neta vigente por moneda', 'Sin conversión ni mezcla de monedas', Object.keys(premiums).map(cur => `<div class="asg197-detail-row"><span><b>${esc(cur)}</b><small>${active.filter(p => (p.moneda || p.divisa) === cur).length} póliza(s)</small></span><span>${Number(premiums[cur]).toLocaleString('es-GT')}</span></div>`))
        },
        {
          label: 'Por renovar ≤45 días', value: String(renewals.length), foot: 'Requieren gestión',
          click: () => modalList('Renovaciones próximas', 'Vigencias dentro de 45 días', renewals.map(p => policyRow(p, (p.ramo || '—') + ' · vence ' + (p.vigenciaFin || '—'))))
        }
      ];
      kpis.forEach((el, i) => {
        const d = definitions[i]; if (!d) return;
        el.removeAttribute('onclick'); el.classList.add('kpi-click'); el.setAttribute('role', 'button'); el.tabIndex = 0;
        const lbl = el.querySelector('.k-label'), val = el.querySelector('.k-val'), foot = el.querySelector('.k-foot');
        if (lbl) lbl.textContent = d.label;
        if (val) { if (d.html) val.innerHTML = d.html; else val.textContent = d.value; }
        if (foot) foot.textContent = d.foot;
        el.addEventListener('click', d.click);
        el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); d.click(); } });
      });
    }
    const newButton = Array.from(host.querySelectorAll('button')).find(b => /Nuevo cliente/i.test(b.textContent || ''));
    if (newButton && !A.can('cliente360', 'create')) newButton.remove();
    const advisorFilter = host.querySelector('#f-ase');
    if (advisorFilter && A.dataScope('cliente360') === 'own') advisorFilter.remove();
  }

  function enhanceClientDetail(host) {
    if (!host || !routeParams().c) return;
    const cid = routeParams().c;
    if (!recordAllowed('clientes', cid, 'cliente360')) return denied(host);
    const manage = A.can('cliente360', 'edit');
    const complete = A.can('cliente360', 'complete');
    Array.from(host.querySelectorAll('button')).forEach(b => {
      const t = (b.textContent || '').trim();
      if (!manage && /Editar ficha|Nueva póliza|Renovar|Endoso|Aplicar pago|Conciliar|Eliminar|Reasignar/i.test(t)) b.remove();
      if (!manage && !complete && /Completar|Guardar datos/i.test(t)) b.remove();
    });
  }

  function enhanceCliente360(host) {
    if (routeParams().c) enhanceClientDetail(host); else enhanceClientList(host);
  }

  function eligibleAdvisors() {
    const all = baseStore().all('asesores') || [];
    const scope = A.dataScope('cliente360');
    if (scope === 'all') return all;
    if (scope === 'team') { const ids = new Set(A.teamAdvisorIds()); return all.filter(a => ids.has(String(a.id))); }
    const own = A.actorAdvisorId();
    return all.filter(a => String(a.id) === own);
  }

  function openNewClient() {
    if (!A.can('cliente360', 'create')) {
      toast('No tienes permiso para crear clientes. Solicita una gestión de corrección.');
      return;
    }
    const advisors = eligibleAdvisors();
    const countries = (Orbit.PAISES || []).filter(p => p.id !== 'TODOS');
    let back = document.getElementById('crm-new-client-v1198'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'crm-new-client-v1198'; back.className = 'drawer-back open';
    back.style.cssText = 'display:grid;place-items:center;z-index:215';
    back.innerHTML = `<div class="card" style="width:min(760px,95vw);max-height:92vh;overflow:auto;padding:0">
      <div style="padding:17px 20px;background:linear-gradient(120deg,var(--graph),#10141a);display:flex;justify-content:space-between;align-items:center"><div><small style="color:rgba(255,255,255,.65)">Clientes 360</small><b style="display:block;font-family:var(--f-display);font-size:17px;color:#fff">Nuevo cliente</b></div><button class="imp-x" data-close style="color:#fff">✕</button></div>
      <div style="padding:18px 20px;display:grid;gap:13px">
        <div class="cgrid">
          <label class="ce-l">Nombre / razón social *<input id="v1198-nombre" class="o-sel"></label>
          <label class="ce-l">Tipo<select id="v1198-tipo" class="o-sel"><option>Persona</option><option>Empresa</option></select></label>
          <label class="ce-l">País *<select id="v1198-pais" class="o-sel">${countries.map(p => `<option value="${esc(p.id)}">${esc(p.label)}</option>`).join('')}</select></label>
          <label class="ce-l">Identificación<input id="v1198-id" class="o-sel"></label>
          <label class="ce-l">Teléfono / WhatsApp<input id="v1198-tel" class="o-sel"></label>
          <label class="ce-l">Correo<input id="v1198-email" type="email" class="o-sel"></label>
          <label class="ce-l">Departamento<select id="v1198-dep" class="o-sel"></select></label>
          <label class="ce-l">Ciudad / municipio<select id="v1198-ciu" class="o-sel"></select></label>
          <label class="ce-l">Dirección<input id="v1198-dir" class="o-sel"></label>
          <label class="ce-l">Canal<select id="v1198-canal" class="o-sel">${((Orbit.cat && Orbit.cat.get && Orbit.cat.get('canales')) || ['Referido']).map(x => `<option>${esc(x)}</option>`).join('')}</select></label>
          <label class="ce-l">Asesor responsable *<select id="v1198-ase" class="o-sel">${advisors.map(a => `<option value="${esc(a.id)}">${esc(a.nombre)}</option>`).join('')}</select></label>
        </div>
        <label class="ce-l">Notas<textarea id="v1198-notas" class="o-sel" style="min-height:64px"></textarea></label>
        <div class="cfg-note">El cliente inicia como <b>Pendiente de pólizas</b>. Los datos faltantes quedan en Calidad de datos y no se completan automáticamente.</div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="v1198-save">Crear cliente</button></div></div>`;
    document.body.appendChild(back);
    const $ = s => back.querySelector(s);
    const close = () => back.remove();
    back.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
    back.addEventListener('click', e => { if (e.target === back) close(); });
    const pais = $('#v1198-pais'), dep = $('#v1198-dep'), city = $('#v1198-ciu');
    function fillCities(selected) {
      const rows = (((Orbit.GEO || {})[pais.value] || {})[dep.value] || []);
      city.innerHTML = '<option value="">— Seleccionar —</option>' + rows.map(x => `<option ${x === selected ? 'selected' : ''}>${esc(x)}</option>`).join('');
    }
    function fillDeps() {
      const rows = Object.keys((Orbit.GEO || {})[pais.value] || {});
      dep.innerHTML = '<option value="">— Seleccionar —</option>' + rows.map(x => `<option>${esc(x)}</option>`).join(''); fillCities();
    }
    pais.addEventListener('change', fillDeps); dep.addEventListener('change', () => fillCities()); fillDeps();
    $('#v1198-save').addEventListener('click', async () => {
      const name = $('#v1198-nombre').value.trim();
      if (!name) { $('#v1198-nombre').focus(); toast('Ingresa el nombre o razón social'); return; }
      const raw = {
        id: 'cli_' + Date.now().toString(36), nombre: name, tipo: $('#v1198-tipo').value,
        pais: pais.value, identificacion: $('#v1198-id').value.trim(), telefono: $('#v1198-tel').value.trim(), email: $('#v1198-email').value.trim(),
        departamento: dep.value, ciudad: city.value, direccion: $('#v1198-dir').value.trim(), canal: $('#v1198-canal').value,
        asesorId: $('#v1198-ase').value, notas: $('#v1198-notas').value.trim(), fechaAlta: (Orbit.ui && Orbit.ui.today ? Orbit.ui.today() : new Date().toISOString().slice(0,10)),
        segmento: 'Nuevo', etiquetas: ['Nuevo'], encuestasActivas: true
      };
      const dup = A.duplicateCandidates(raw);
      const exact = dup.filter(x => x.exact);
      if (exact.length) {
        toast('No se creó: existe un cliente con identificación o correo coincidente.');
        return;
      }
      if (dup.length) {
        const ok = await U.confirm('Se detectó un posible duplicado por nombre/país. ¿Crear como Requiere validación?', { title: 'Posible duplicado', ok: 'Crear para revisión' });
        if (!ok) return;
        raw.requiereValidacion = true;
        raw.calidad = { alertas: ['duplicado_probable'] };
      }
      const row = A.prepareManual('clientes', raw);
      row.estadoOperativo = 'pendiente_polizas'; row.estado = 'pendiente_polizas';
      const inserted = baseStore().insert('clientes', row);
      baseStore().insert('actividades', {
        id: 'act_' + Date.now().toString(36), tenantId: row.tenantId, clienteId: row.id, asesorId: row.asesorId,
        tipo: 'sistema', icon: '🧑‍💼', fecha: row.fechaAlta, titulo: 'Cliente creado',
        detalle: 'Ingreso manual en plataforma · estado inicial: pendiente de pólizas', fuente: 'ingreso_manual_plataforma'
      });
      A.audit('crear', 'clientes', row.id, null, inserted || row, 'Alta manual desde Clientes 360');
      close(); location.hash = '#/cliente360?c=' + encodeURIComponent(row.id);
    });
  }

  function completeMissingClient(cid) {
    const c = baseStore().get('clientes', cid);
    if (!c || !A.canView('clientes', c, 'cliente360')) return toast('Cliente fuera de tu alcance');
    const fields = A.missingClientFields(c);
    if (!fields.length) {
      U.confirm('Este expediente no tiene campos básicos faltantes. ¿Crear una gestión para solicitar un cambio?', { title: 'Solicitar corrección', ok: 'Crear gestión' }).then(ok => {
        if (ok) { A.correction('Corrección de datos · ' + c.nombre, 'El usuario solicita revisar información del expediente.', { clienteId: cid, asesorId: c.asesorId }); toast('Gestión de corrección creada'); }
      });
      return;
    }
    const labels = { identificacion: 'Identificación', telefono: 'Teléfono', email: 'Correo', departamento: 'Departamento', ciudad: 'Ciudad', direccion: 'Dirección' };
    let back = document.getElementById('crm-complete-v1198'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'crm-complete-v1198'; back.className = 'drawer-back open'; back.style.cssText = 'display:grid;place-items:center;z-index:215';
    back.innerHTML = `<div class="card" style="width:min(520px,94vw);max-height:90vh;overflow:auto;padding:0"><div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between"><div><small class="muted">Completar datos faltantes</small><b style="display:block">${esc(c.nombre)}</b></div><button class="imp-x" data-close>✕</button></div><div style="padding:18px 20px;display:grid;gap:11px">${fields.map(k => `<label class="ce-l">${esc(labels[k] || k)}<input class="o-sel" data-field="${esc(k)}"></label>`).join('')}<div class="cfg-note">Solo se completan campos vacíos. Reasignación, estados operativos, pólizas y cobros se solicitan mediante una gestión.</div></div><div style="padding:13px 20px;border-top:1px solid var(--line);display:flex;justify-content:flex-end;gap:8px"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-save>Guardar datos</button></div></div>`;
    document.body.appendChild(back);
    const close = () => back.remove(); back.querySelectorAll('[data-close]').forEach(b => b.onclick = close);
    back.querySelector('[data-save]').onclick = () => {
      const before = Object.assign({}, c), patch = {};
      back.querySelectorAll('[data-field]').forEach(el => { const v = el.value.trim(); if (v && !c[el.dataset.field]) patch[el.dataset.field] = v; });
      if (!Object.keys(patch).length) return toast('No hay datos nuevos para guardar');
      patch.requiereValidacion = true;
      patch.calidad = Object.assign({}, c.calidad || {}, { estado: 'REQUIERE_VALIDACION', actualizado: new Date().toISOString(), alertas: A.missingClientFields(Object.assign({}, c, patch)).map(k => 'falta_' + k) });
      baseStore().update('clientes', cid, patch);
      const after = baseStore().get('clientes', cid);
      A.audit('completar_faltantes', 'clientes', cid, before, after, 'Datos faltantes completados por usuario con alcance limitado');
      close(); const h = moduleHost(); if (h) Orbit.modules.cliente360.render(h);
    };
  }

  function installClientActions() {
    const mod = Orbit.modules.cliente360; if (!mod || mod.__actionsV1198) return;
    mod.__actionsV1198 = {};
    const originalNew = mod.nuevoCliente; mod.__actionsV1198.nuevoCliente = originalNew; mod.nuevoCliente = openNewClient;
    if (typeof mod.edit === 'function') {
      const original = mod.edit.bind(mod); mod.__actionsV1198.edit = original;
      mod.edit = function (cid) {
        const c = baseStore().get('clientes', cid);
        if (!c || !A.canView('clientes', c, 'cliente360')) return toast('Cliente fuera de tu alcance');
        if (!A.can('cliente360', 'edit')) return completeMissingClient(cid);
        const before = JSON.parse(JSON.stringify(c));
        original(cid);
        const back = document.getElementById('c360-edit'), save = back && back.querySelector('#ce-save');
        if (!save) return;
        if (A.dataScope('cliente360') !== 'all' && back.querySelector('#ce-ase')) back.querySelector('#ce-ase').disabled = true;
        save.addEventListener('click', function gate(e) {
          const motivo = (window.prompt('Motivo del cambio (obligatorio):', '') || '').trim();
          if (!motivo) { e.preventDefault(); e.stopImmediatePropagation(); toast('Se requiere motivo para guardar'); return; }
          setTimeout(() => {
            const after = baseStore().get('clientes', cid);
            A.audit('editar', 'clientes', cid, before, after, motivo);
          }, 0);
        }, true);
      };
    }
    const policyActions = ['nuevaPoliza','editarPoliza','renovar','endoso'];
    policyActions.forEach(name => {
      if (typeof mod[name] !== 'function') return;
      const original = mod[name].bind(mod); mod.__actionsV1198[name] = original;
      mod[name] = function () {
        const args = arguments, id = args[0];
        let client = null;
        if (name === 'nuevaPoliza') client = baseStore().get('clientes', id);
        else { const p = baseStore().get('polizas', id); client = p && baseStore().get('clientes', p.clienteId); }
        if (!client || !A.canView('clientes', client, 'cliente360')) return toast('Registro fuera de tu alcance');
        if (!A.can('polizas', 'edit')) {
          U.confirm('No puedes modificar pólizas. ¿Crear una gestión de corrección?', { title: 'Solicitar gestión', ok: 'Crear gestión' }).then(ok => {
            if (ok) { A.correction('Gestión de póliza · ' + client.nombre, 'Solicitud desde Clientes 360: ' + name, { clienteId: client.id, polizaId: name === 'nuevaPoliza' ? '' : id, asesorId: client.asesorId }); toast('Gestión creada en Ops'); }
          });
          return;
        }
        return original.apply(mod, args);
      };
    });
    ['verPoliza','verVehiculo'].forEach(name => {
      if (typeof mod[name] !== 'function') return;
      const original = mod[name].bind(mod); mod.__actionsV1198[name] = original;
      mod[name] = function (id) {
        const collection = name === 'verVehiculo' ? 'vehiculos' : 'polizas';
        if (!recordAllowed(collection, id, 'cliente360')) return toast('Registro fuera de tu alcance');
        return original.apply(mod, arguments);
      };
    });
  }

  function guardAction(moduleName, actionName, collection, moduleKey, permission) {
    const mod = Orbit.modules[moduleName];
    if (!mod || typeof mod[actionName] !== 'function') return;
    mod.__guardV1198 = mod.__guardV1198 || {};
    if (mod.__guardV1198[actionName]) return;
    const original = mod[actionName].bind(mod); mod.__guardV1198[actionName] = original;
    mod[actionName] = function (id) {
      if (id && collection && !recordAllowed(collection, id, moduleKey)) return toast('Registro fuera de tu alcance');
      if (permission && !A.can(moduleKey, permission)) return toast('No tienes permiso para realizar esta acción');
      return original.apply(mod, arguments);
    };
  }

  function enhanceGeneric(host, moduleKey) {
    if (!host) return;
    if (!A.can(moduleKey, 'edit')) {
      Array.from(host.querySelectorAll('button')).forEach(b => {
        const t = (b.textContent || '').trim();
        if (/Aplicar pago|Confirmar pago|Validar reporte|Conciliar|Liquidar|Cambiar estado|Eliminar|Anular|Importar|Nueva póliza/i.test(t)) b.remove();
      });
    }
  }

  wrapRender('cliente360', 'cliente360', enhanceCliente360);
  ['polizas','cobros','conciliaciones','calidad','renovaciones','cancelaciones','comisiones','historial','portal'].forEach(name => wrapRender(name, name, h => enhanceGeneric(h, name)));
  installClientActions();
  guardAction('cobros', 'detalle', 'cobros', 'cobros', 'view');
  guardAction('cobros', 'aplicarPago', 'cobros', 'cobros', 'edit');
  guardAction('cobros', 'validarReporte', 'cobros', 'cobros', 'edit');
  guardAction('cobros', 'conciliarFactura', 'cobros', 'cobros', 'edit');
  guardAction('cobros', 'lote', null, 'cobros', 'edit');
  guardAction('conciliaciones', 'accion', null, 'conciliaciones', 'edit');
  guardAction('calidad', 'editarInline', 'clientes', 'cliente360', 'complete');
  guardAction('calidad', 'campana', null, 'calidad', 'edit');
  guardAction('comisiones', 'toggleEstado', 'comisiones', 'comisiones', 'edit');
  guardAction('historial', 'detalle', 'actividades', 'historial', 'view');
  guardAction('cancelaciones', 'detalle', 'cancelaciones', 'cancelaciones', 'view');

  document.addEventListener('orbit:session', () => {
    try { const h = moduleHost(); if (h && Orbit.router) window.dispatchEvent(new HashChangeEvent('hashchange')); } catch (e) {}
  });
})();
