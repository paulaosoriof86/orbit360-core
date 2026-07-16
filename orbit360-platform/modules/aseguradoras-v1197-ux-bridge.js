/* ============================================================
   Orbit 360 · Aseguradoras · UX operativa canónica
   Fuente visual: prototipo aprobado de directorio y ficha navegable.
   El módulo base conserva motor, edición y Orbit.store; esta capa es la
   única responsable de renderizar el directorio y la ficha-página.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
(function () {
  const base = Orbit.modules.aseguradoras;
  if (!base || base.__v1197Bridge) return;

  const U = Orbit.ui, K = Orbit.kit, S = () => Orbit.store;
  const engine = base._fuentes;
  let host = null;
  let state = { q: '', pais: 'TODOS', ramo: '', estado: 'TODAS', kpi: '', tab: 'resumen', scrollY: 0 };

  function all(col) { try { return S().all(col) || []; } catch (e) { return []; } }
  function role() {
    try { if (Orbit.session && Orbit.session.rol) return Orbit.session.rol(); } catch (e) {}
    try { const u = Orbit.auth && Orbit.auth.user && Orbit.auth.user(); return (u && (u.rolActivo || u.activeRole || u.rol)) || 'Asesor'; } catch (e) {}
    return 'Asesor';
  }
  function asesor() {
    try {
      const id = Orbit.session && Orbit.session.asesorId && Orbit.session.asesorId();
      return id ? (S().get('asesores', id) || {}) : {};
    } catch (e) { return {}; }
  }
  function allowed(extra, baseRoles) {
    const a = asesor();
    if ((a.restricciones || []).indexOf(extra) >= 0) return false;
    if ((a.permisosExtra || []).indexOf(extra) >= 0) return true;
    return baseRoles.indexOf(role()) >= 0;
  }
  function canManage() { return allowed('aseguradoras_editar', ['Dirección', 'SuperAdmin', 'AdminTenant', 'Admin']); }
  function canSensitive() { return allowed('aseguradoras_datos_sensibles', ['Dirección', 'SuperAdmin', 'AdminTenant', 'Admin', 'Operativo']); }
  function countryOK(a) { return !Orbit.pais || Orbit.pais === 'TODOS' || a.pais === Orbit.pais; }
  function query() { const h = String(location.hash || ''); return new URLSearchParams(h.indexOf('?') >= 0 ? h.slice(h.indexOf('?') + 1) : ''); }
  function setHash(params) { const p = new URLSearchParams(params || {}); location.hash = '#/aseguradoras' + (p.toString() ? '?' + p.toString() : ''); }
  function copy(value) {
    if (Orbit.vault && Orbit.vault.copyText) return Orbit.vault.copyText(value).then(ok => U.toast(ok ? 'Copiado al portapapeles' : 'No se pudo copiar'));
    return Promise.resolve(false);
  }
  function insurer(id) { try { return S().get('aseguradoras', id); } catch (e) { return null; } }
  function docs(a) { return (a && a.docs) || []; }
  function platforms(a) { return (a && a.portales) || (a && a.portal ? [{ nombre: 'Portal principal', url: a.portal, estadoAcceso: 'Sin verificar' }] : []); }
  function contactMain(a) { return ((a && a.contactos) || []).find(c => c.principal) || ((a && a.contactos) || [])[0] || null; }
  function accessStatus(a) {
    const rows = platforms(a);
    if (!rows.length) return 'Sin acceso registrado';
    if (rows.some(p => p.estadoAcceso === 'Acceso disponible')) return 'Acceso disponible';
    if (rows.some(p => p.estadoAcceso === 'Requiere actualización')) return 'Requiere actualización';
    return 'Sin verificar';
  }
  function updateNeeded(a) {
    return !!a.requiereValidacion
      || platforms(a).some(p => p.estadoAcceso === 'Requiere actualización')
      || docs(a).some(d => d.estado === 'Requiere validación' || d.estado === 'Conocimiento incompleto')
      || !a.ultimaRevision;
  }
  function accessAvailable(a) { return accessStatus(a) === 'Acceso disponible'; }
  function ramosCatalog(rows) { return Array.from(new Set(rows.reduce((acc, a) => acc.concat(a.ramos || []), []))).filter(Boolean).sort(); }

  function filtered() {
    let rows = all('aseguradoras').filter(countryOK);
    if (state.pais !== 'TODOS') rows = rows.filter(a => a.pais === state.pais);
    if (state.ramo) rows = rows.filter(a => (a.ramos || []).indexOf(state.ramo) >= 0);
    if (state.estado === 'ACTIVAS') rows = rows.filter(a => a.vinculada !== false);
    if (state.estado === 'INACTIVAS') rows = rows.filter(a => a.vinculada === false);
    const term = state.q.trim().toLowerCase();
    if (term) rows = rows.filter(a => String(a.nombre || '').toLowerCase().includes(term) || String(a.nit || '').toLowerCase().includes(term) || (a.ramos || []).some(r => String(r).toLowerCase().includes(term)) || (a.contactos || []).some(c => String(c.nombre || '').toLowerCase().includes(term)));
    if (state.kpi === 'activas') rows = rows.filter(a => a.vinculada !== false);
    if (state.kpi === 'contactos') rows = rows.filter(a => !!contactMain(a));
    if (state.kpi === 'accesos') rows = rows.filter(accessAvailable);
    if (state.kpi === 'documentos') rows = rows.filter(a => docs(a).length > 0);
    if (state.kpi === 'actualizar') rows = rows.filter(updateNeeded);
    return rows;
  }

  function kpiData(baseRows) {
    return [
      { id: 'activas', label: 'Activas', val: baseRows.filter(a => a.vinculada !== false).length, foot: 'de ' + baseRows.length + ' en directorio', color: 'var(--ok)' },
      { id: 'contactos', label: 'Con contacto principal', val: baseRows.filter(a => !!contactMain(a)).length, foot: 'marcado como principal', color: 'var(--red)' },
      { id: 'accesos', label: 'Con acceso disponible', val: baseRows.filter(accessAvailable).length, foot: 'según último registro', color: 'var(--info)' },
      { id: 'documentos', label: 'Con documentación', val: baseRows.filter(a => docs(a).length > 0).length, foot: 'con documentos cargados', color: 'var(--graph)' },
      { id: 'actualizar', label: 'Requieren actualización', val: baseRows.filter(updateNeeded).length, foot: 'revisar acceso', color: 'var(--warn)' }
    ];
  }

  function kpiDetail(rows) {
    if (!state.kpi) return '';
    const labels = { activas: 'Aseguradoras activas', contactos: 'Aseguradoras con contacto principal', accesos: 'Plataformas disponibles', documentos: 'Aseguradoras con documentación', actualizar: 'Información que requiere actualización' };
    const body = rows.length ? rows.map(a => {
      const c = contactMain(a);
      let detail = `${a.pais || '—'} · ${(a.ramos || []).slice(0, 3).join(', ') || 'Sin productos'}`;
      if (state.kpi === 'contactos') detail = c ? `${c.nombre || 'Contacto'} · ${c.area || c.tipo || 'Área no indicada'} · ${c.tel || c.email || 'Sin canal'}` : 'Sin contacto principal';
      if (state.kpi === 'accesos') detail = platforms(a).filter(p => p.estadoAcceso === 'Acceso disponible').map(p => `${p.nombre || 'Plataforma'} · ${p.ultimaVerificacion || 'Sin fecha de revisión'}`).join(' | ');
      if (state.kpi === 'documentos') detail = `${docs(a).length} documento(s) · ${docs(a).slice(0, 2).map(d => d.nombre || d.cat || 'Documento').join(', ')}`;
      if (state.kpi === 'actualizar') detail = 'Revisar plataformas, documentos o fecha de actualización';
      return `<button class="asg197-detail-row" data-open-asg="${U.esc(a.id)}"><span><b>${U.esc(a.nombre)}</b><small>${U.esc(detail)}</small></span><span>Ver ficha →</span></button>`;
    }).join('') : '<div class="empty">No hay registros para este indicador.</div>';
    return `<section class="card pad asg197-kpi-detail"><div class="asg197-section-head"><div><small>Detalle del indicador</small><h3>${U.esc(labels[state.kpi] || 'Detalle')}</h3></div><button class="btn ghost sm" data-clear-kpi>Quitar filtro</button></div>${body}</section>`;
  }

  function card(a) {
    const c = contactMain(a), p = platforms(a), status = accessStatus(a), active = a.vinculada !== false;
    const statusTone = status === 'Acceso disponible' ? 'ok' : status === 'Requiere actualización' ? 'danger' : status === 'Sin verificar' ? 'warn' : 'neutral';
    return `<article class="card asg197-card ${active ? '' : 'off'}" data-open-asg="${U.esc(a.id)}">
      <div class="asg197-card-head"><span class="asg197-avatar">${U.esc((a.nombre || '?').slice(0, 1))}</span><div style="flex:1"><h3>${U.esc(a.nombre || 'Aseguradora')}</h3><small>${U.esc(a.pais || '—')} · ${active ? 'Activa' : 'Inactiva'}</small></div>${canManage() ? `<label class="asg-switch" title="Vinculación" onclick="event.stopPropagation()"><input type="checkbox" data-toggle-asg="${U.esc(a.id)}" ${active ? 'checked' : ''}><span></span></label>` : ''}</div>
      <div class="asg-card-tags">${(a.ramos || []).slice(0, 3).map(r => `<span class="badge neutral">${U.esc(r)}</span>`).join('')}</div>
      <div style="font-size:11.5px;color:var(--ink-2);margin-top:8px;display:grid;gap:4px"><div>👤 ${U.esc(c ? c.nombre || 'Contacto registrado' : 'Sin contacto registrado')}</div><div>🔗 <span class="badge ${statusTone}" style="font-size:10.5px">${U.esc(status)}</span> · 📎 ${docs(a).length ? docs(a).length + ' documento(s)' : 'Sin documentos'}</div></div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><button class="btn ghost sm" data-card-action="contactos" data-id="${U.esc(a.id)}">👤 Contactar</button><button class="btn ghost sm" data-card-action="plataformas" data-id="${U.esc(a.id)}">🔗 Plataforma</button>${a.drive ? `<button class="btn ghost sm" data-card-action="drive" data-id="${U.esc(a.id)}">📁 Drive</button>` : ''}</div>
      <footer><span>${a.requiereValidacion ? 'Requiere validación' : updateNeeded(a) ? 'Requiere revisión' : 'Información al día'}</span><b>Abrir ficha →</b></footer>
    </article>`;
  }

  function renderDirectory(h) {
    host = h;
    const baseRows = all('aseguradoras').filter(countryOK), rows = filtered(), ramos = ramosCatalog(baseRows);
    const actions = canManage() ? '<button class="btn ghost" data-import-asg>✨ Importar</button><button class="btn primary" data-new-asg>+ Aseguradora</button>' : '';
    host.innerHTML = `<div class="page asg197">${K.banner({ icon: '🏢', title: 'Orbit Aseguradoras', sub: 'Directorio de aseguradoras vinculadas', features: [], actions })}<div class="asg197-kpis">${kpiData(baseRows).map(k => `<button class="card asg197-kpi ${state.kpi === k.id ? 'on' : ''}" data-kpi="${k.id}"><small>${U.esc(k.label)}</small><b style="color:${k.color}">${k.val}</b><span>${U.esc(k.foot)}</span></button>`).join('')}</div><section class="card pad asg197-filters"><label>Buscar<input class="o-sel" data-q value="${U.esc(state.q)}" placeholder="Nombre, NIT, contacto o ramo"></label><label>País<select class="o-sel" data-pais><option value="TODOS">Todo país</option><option value="GT" ${state.pais === 'GT' ? 'selected' : ''}>Guatemala</option><option value="CO" ${state.pais === 'CO' ? 'selected' : ''}>Colombia</option></select></label><label>Ramo<select class="o-sel" data-ramo><option value="">Todo ramo</option>${ramos.map(r => `<option ${state.ramo === r ? 'selected' : ''}>${U.esc(r)}</option>`).join('')}</select></label><label>Estado<select class="o-sel" data-estado><option value="TODAS">Todas</option><option value="ACTIVAS" ${state.estado === 'ACTIVAS' ? 'selected' : ''}>Activas</option><option value="INACTIVAS" ${state.estado === 'INACTIVAS' ? 'selected' : ''}>Inactivas</option></select></label><span class="muted">${rows.length} resultado(s)</span></section>${kpiDetail(rows)}<div class="asg197-grid">${rows.length ? rows.map(card).join('') : '<div class="card pad empty">No hay aseguradoras para los filtros seleccionados.</div>'}</div></div>`;
    bindDirectory();
  }

  function bindDirectory() {
    const q = host.querySelector('[data-q]'); if (q) q.addEventListener('input', e => { state.q = e.target.value; renderDirectory(host); });
    const pais = host.querySelector('[data-pais]'); if (pais) pais.addEventListener('change', e => { state.pais = e.target.value; renderDirectory(host); });
    const ramo = host.querySelector('[data-ramo]'); if (ramo) ramo.addEventListener('change', e => { state.ramo = e.target.value; renderDirectory(host); });
    const estado = host.querySelector('[data-estado]'); if (estado) estado.addEventListener('change', e => { state.estado = e.target.value; renderDirectory(host); });
    host.querySelectorAll('[data-kpi]').forEach(b => b.addEventListener('click', () => { state.kpi = state.kpi === b.dataset.kpi ? '' : b.dataset.kpi; renderDirectory(host); }));
    host.querySelectorAll('[data-open-asg]').forEach(b => b.addEventListener('click', e => { if (e.target.closest('[data-card-action]') || e.target.closest('.asg-switch')) return; state.scrollY = window.scrollY; setHash({ ficha: b.dataset.openAsg }); }));
    host.querySelectorAll('[data-card-action]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); const a = insurer(b.dataset.id); if (!a) return; if (b.dataset.cardAction === 'drive') { const url = Orbit.documentViewer && Orbit.documentViewer.safeUrl ? Orbit.documentViewer.safeUrl(a.drive) : ''; if (url) window.open(url, '_blank', 'noopener,noreferrer'); return; } state.tab = b.dataset.cardAction; setHash({ ficha: a.id }); }));
    host.querySelectorAll('[data-toggle-asg]').forEach(input => input.addEventListener('change', async e => { e.stopPropagation(); const a = insurer(input.dataset.toggleAsg); if (!a) return; const next = input.checked; const ok = await U.confirm(next ? 'La aseguradora quedará disponible para la operación permitida por su configuración. ¿Continuar?' : 'La aseguradora se desactivará del directorio operativo sin borrar su historial. ¿Continuar?', { title: next ? 'Activar aseguradora' : 'Desactivar aseguradora', ok: next ? 'Activar' : 'Desactivar' }); if (!ok) { input.checked = !next; return; } S().update('aseguradoras', a.id, { vinculada: next }); }));
    const clear = host.querySelector('[data-clear-kpi]'); if (clear) clear.addEventListener('click', () => { state.kpi = ''; renderDirectory(host); });
    const imp = host.querySelector('[data-import-asg]'); if (imp) imp.addEventListener('click', () => Orbit.importa && Orbit.importa.open && Orbit.importa.open('directorio-aseguradoras', { onDone: () => renderDirectory(host) }));
    const add = host.querySelector('[data-new-asg]'); if (add) add.addEventListener('click', async () => { const nombre = await U.prompt('Nombre comercial de la aseguradora:', { title: 'Nueva aseguradora' }); if (!nombre) return; const id = 'asg_' + Date.now().toString(36); S().insert('aseguradoras', { id, nombre, pais: Orbit.pais && Orbit.pais !== 'TODOS' ? Orbit.pais : 'GT', vinculada: false, contactos: [], portales: [], cuentas: [], ramos: [], docs: [], actividad: [] }); setHash({ ficha: id }); setTimeout(() => { if (base.ficha) base.ficha(id, true); }, 0); });
  }

  function tabs() { return [['resumen','Resumen'],['contactos','Contactos'],['plataformas','Plataformas'],['bancos','Bancos y pagos'],['productos','Productos y planes'],['documentos','Documentos y Drive'],['tarifas','Tarifas y conocimiento'],['actividad','Actividad']]; }
  function summaryTab(a) { const f = a.facturacion || {}, rows = [['Nombre comercial',a.nombre],['Razón social',f.razonSocial],['País',a.pais],['NIT / identificación fiscal',a.nit],['Código de intermediario',a.codigoIntermediario],['Dirección / oficina',f.dirFiscal],['Teléfono general',a.telGeneral],['Emergencia / asistencia',a.emergencia],['Responsable interno',a.responsable],['Última revisión',a.ultimaRevision]]; return `<div class="asg197-info-grid">${rows.map(r => `<div><small>${U.esc(r[0])}</small><b>${U.esc(r[1] || '—')}</b></div>`).join('')}</div>${a.observaciones ? `<div class="card pad"><b>Observaciones</b><p>${U.esc(a.observaciones)}</p></div>` : ''}`; }
  function contactsTab(a) { return (a.contactos || []).map(c => `<div class="asg197-list-row"><span><b>${U.esc(c.nombre || 'Contacto')}</b><small>${U.esc(c.area || c.tipo || 'Área no indicada')} · ${U.esc(c.cargo || '')}</small></span><span>${U.esc(c.tel || c.email || 'Sin canal registrado')}</span></div>`).join('') || '<div class="empty">Sin contactos registrados.</div>'; }
  function platformsTab(a) { const sensitive = canSensitive(); return platforms(a).map((p,i) => { const user = p.usuario || p.user || ''; const cred = Orbit.vault ? Orbit.vault.credential(p.credentialRef || '', { authorized: sensitive, context: { insurerId: a.id, platformIndex: i }, label: p.nombre }) : ''; return `<div class="card pad asg197-platform"><div><b>${U.esc(p.nombre || 'Plataforma')}</b><small>${U.esc(p.tipo || '')} · ${U.esc(p.estadoAcceso || 'Sin verificar')}</small></div><div class="asg197-platform-actions">${user && sensitive ? `<button class="btn ghost sm" data-copy-text="${U.esc(user)}">Copiar usuario</button>` : user ? '<span class="badge neutral">Usuario restringido</span>' : '<span class="muted">Sin usuario registrado</span>'}${p.url ? `<button class="btn ghost sm" data-open-url="${U.esc(p.url)}">Abrir plataforma</button>` : ''}${cred}</div></div>`; }).join('') || '<div class="empty">Sin plataformas registradas.</div>'; }
  function banksTab(a) { const sensitive = canSensitive(); return (a.cuentas || []).map(c => `<div class="asg197-list-row asg197-bank"><span><b>${U.esc(c.banco || 'Banco')}</b><small>${U.esc(c.tipo || '')} · ${U.esc(c.moneda || '')} · ${U.esc(c.titular || '')}</small></span><span>${Orbit.vault ? Orbit.vault.field(c.numero || c.numeroHint || '', { authorized: sensitive, mask: 'right4' }) : U.esc(c.numeroHint || '—')}</span><small>${U.esc(c.uso || '')}</small></div>`).join('') || '<div class="empty">Sin cuentas registradas.</div>'; }
  function productsTab(a) { return (a.ramos || []).map(r => { const enabled = !!(a.ramosHabilitados && a.ramosHabilitados[r] && a.ramosHabilitados[r].cotizador === true); return `<div class="asg197-list-row"><span><b>${U.esc(r)}</b><small>${U.esc(((a.ramosDetalle || {})[r] || {}).segmento || '')} · ${U.esc(((a.ramosDetalle || {})[r] || {}).plan || '')}</small></span><span class="badge ${enabled ? 'ok' : 'neutral'}">${enabled ? 'Disponible en Cotizador' : 'No disponible'}</span></div>`; }).join('') || '<div class="empty">Sin productos registrados.</div>'; }
  function documentObject(a,d) { return { documentRef:d.documentRef||d.archivoRef||d.fileId||'', nombre:d.nombre||d.cat||'Documento', tipo:d.tipo||d.cat||'', origen:d.origen||'Aseguradora', pais:d.pais||a.pais, version:d.version||'', vigencia:d.vigencia||d.vigenciaHasta||'', estado:d.estado||'', responsable:d.responsable||'', externalUrl:d.driveUrl||d.url||'' }; }
  function documentsTab(a) { const rows = docs(a).map(d => `<button class="asg197-detail-row" data-view-doc="${U.esc(d.id || d.nombre || '')}"><span><b>${U.esc(d.nombre || d.cat || 'Documento')}</b><small>${U.esc(d.cat || d.tipo || '')} · ${U.esc(d.estado || 'Registrado')}</small></span><span>Ver documento →</span></button>`).join(''); return `${a.drive ? '<button class="btn ghost" data-view-drive>Ver repositorio</button>' : ''}${rows || '<div class="empty">Sin documentos registrados.</div>'}`; }
  function tariffsTab(a) { if (!engine) return '<div class="empty">Sin motor de conocimiento disponible.</div>'; let summary=null,groups=null; try { summary=engine.resumenFuentes(docs(a),a); } catch(e){ try{summary=engine.resumenFuentes(a);}catch(ignore){} } try { groups=engine.resumenGrupos(docs(a),a); } catch(e){ try{groups=engine.resumenGrupos(a);}catch(ignore){} } const total=summary&&typeof summary.total==='number'?summary.total:docs(a).length, groupCount=groups&&typeof groups.total==='number'?groups.total:Array.isArray(groups)?groups.length:0; return `<div class="asg197-info-grid"><div><small>Fuentes registradas</small><b>${total}</b></div><div><small>Combinaciones clasificadas</small><b>${groupCount}</b></div><div><small>Estado</small><b>${U.esc((summary&&summary.estado)||'Requiere revisión')}</b></div></div><p class="muted">La disponibilidad en Cotizador y Comparativo depende de validación y habilitación explícitas por producto, país, moneda y plan.</p>`; }
  function activityTab(a) { return (a.actividad || []).map(x => `<div class="asg197-list-row"><span><b>${U.esc(x.cambio || x.titulo || 'Actualización')}</b><small>${U.esc(x.responsable || '')}</small></span><span>${U.esc(x.fecha || '')}</span></div>`).join('') || '<div class="empty">Sin actividad registrada.</div>'; }
  function tabContent(a) { if(state.tab==='contactos')return contactsTab(a); if(state.tab==='plataformas')return platformsTab(a); if(state.tab==='bancos')return banksTab(a); if(state.tab==='productos')return productsTab(a); if(state.tab==='documentos')return documentsTab(a); if(state.tab==='tarifas')return tariffsTab(a); if(state.tab==='actividad')return activityTab(a); return summaryTab(a); }

  function renderFicha(h,id) {
    host=h; const a=insurer(id); if(!a){setHash({});return;}
    host.innerHTML=`<div class="page asg197 asg197-ficha"><div class="asg197-ficha-head"><button class="btn ghost" data-back-asg>← Volver al directorio</button><div><small>Aseguradoras / ${U.esc(a.pais||'')}</small><h1>${U.esc(a.nombre||'Aseguradora')}</h1><span>${a.vinculada===false?'Inactiva':'Activa'}</span></div>${canManage()?'<button class="btn primary" data-edit-asg>Editar</button>':''}</div><nav class="asg197-tabs">${tabs().map(t=>`<button class="${state.tab===t[0]?'on':''}" data-tab="${t[0]}">${U.esc(t[1])}</button>`).join('')}</nav><section class="card pad asg197-tab-body">${tabContent(a)}</section></div>`;
    const backBtn=host.querySelector('[data-back-asg]'); if(backBtn)backBtn.addEventListener('click',()=>{setHash({});setTimeout(()=>window.scrollTo(0,state.scrollY||0),0);});
    host.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{state.tab=b.dataset.tab;renderFicha(host,a.id);}));
    const edit=host.querySelector('[data-edit-asg]'); if(edit)edit.addEventListener('click',()=>base.ficha&&base.ficha(a.id,true));
    host.querySelectorAll('[data-copy-text]').forEach(b=>b.addEventListener('click',()=>copy(b.dataset.copyText)));
    host.querySelectorAll('[data-open-url]').forEach(b=>b.addEventListener('click',()=>{const url=Orbit.documentViewer&&Orbit.documentViewer.safeUrl?Orbit.documentViewer.safeUrl(b.dataset.openUrl):'';if(url)window.open(url,'_blank','noopener,noreferrer');}));
    host.querySelectorAll('[data-view-doc]').forEach(b=>b.addEventListener('click',()=>{const d=docs(a).find(x=>String(x.id||x.nombre||'')===b.dataset.viewDoc);if(d&&Orbit.documentViewer)Orbit.documentViewer.open(documentObject(a,d),{context:{module:'aseguradoras',insurerId:a.id}});}));
    const drive=host.querySelector('[data-view-drive]'); if(drive&&Orbit.documentViewer)drive.addEventListener('click',()=>Orbit.documentViewer.open({nombre:'Repositorio de '+a.nombre,tipo:'Drive',origen:'Aseguradora',externalUrl:a.drive,estado:'Repositorio vinculado'},{context:{module:'aseguradoras',insurerId:a.id}}));
    if(Orbit.vault)Orbit.vault.wire(host);
  }

  function render(h){const p=query(),id=p.get('ficha');if(id)return renderFicha(h,id);renderDirectory(h);}
  base.render=render;
  base.fichaPagina=id=>setHash({ficha:id});
  base.__v1197Bridge={engine,state,canManage,canSensitive,renderDirectory,renderFicha,canonical:true};
  /* Evita que el bridge de recursos agregue un segundo render visual o
     MutationObserver. Sus contratos siguen disponibles en backend. */
  base.__resourcesV1202={status:'deferred_to_canonical_workspace',visualEnhancement:false};
})();