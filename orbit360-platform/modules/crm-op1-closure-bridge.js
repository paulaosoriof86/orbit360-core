/* ============================================================
   Orbit 360 · CRM OP-1 cierre operativo v1.216
   - estado honesto de acceso al Portal sin credenciales;
   - invitación preparada ≠ acceso confirmado;
   - visor documental común en Cliente360 y Póliza;
   - ficha-página de Póliza con scope y documentos;
   - elimina copy técnico visible en Portal.
   Puente aditivo. No reemplaza módulos base ni toca backend protegido.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
(function () {
  const C = Orbit.modules.cliente360;
  const P = Orbit.modules.polizas;
  const PT = Orbit.modules.portal;
  const U = Orbit.ui;
  const A = Orbit.access || {};
  const S = () => Orbit.store;
  if (!C || !P || !PT || !U || Orbit.__crmOp1ClosureV1216) return;
  Orbit.__crmOp1ClosureV1216 = true;

  function clean(v) { return String(v == null ? '' : v).trim(); }
  function esc(v) { return U && U.esc ? U.esc(clean(v)) : clean(v).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]); }
  function clone(v) { try { return JSON.parse(JSON.stringify(v)); } catch (e) { return Object.assign({}, v || {}); } }
  function now() { return new Date().toISOString(); }
  function today() { return U && U.today ? U.today() : now().slice(0, 10); }
  function params() { try { return (Orbit.route && Orbit.route.params) || {}; } catch (e) { return {}; } }
  function toast(v) { try { U.toast(v); } catch (e) {} }
  function can(moduleKey, action) { return A.can ? A.can(moduleKey, action) : false; }
  function canView(collection, row, moduleKey) { return A.canView ? A.canView(collection, row, moduleKey) : !!row; }
  function actor() { return A.actorUser ? A.actorUser() : { id:'', nombre:'Usuario', rolActivo:'' }; }
  function audit(action, collection, id, before, after, reason, extra) {
    if (A.audit) return A.audit(action, collection, id, before, after, reason, extra);
    try {
      return S().insert('actividades', {
        id:'act_' + Date.now().toString(36), tipo:'admin', icon:'🧾', fecha:today(),
        titulo:'Cambio registrado', detalle:collection + ' · ' + action, registroId:id,
        motivo:reason, actor:actor(), antes:before || null, despues:after || null
      });
    } catch (e) { return null; }
  }
  function portalState(client) {
    const raw = clean(client && (client.portalAccesoEstado || (client.portalAcceso && client.portalAcceso.estado))).toLowerCase();
    if (['activo','activo_confirmado','confirmado'].includes(raw)) return 'activo_confirmado';
    if (['invitacion_preparada','preparado','pendiente_confirmacion'].includes(raw)) return 'invitacion_preparada';
    if (['suspendido','bloqueado'].includes(raw)) return 'suspendido';
    if (['requiere_revision','requiere_validacion'].includes(raw)) return 'requiere_revision';
    return 'no_preparado';
  }
  function portalLabel(state) {
    return ({
      no_preparado:'Acceso no preparado',
      invitacion_preparada:'Invitación preparada · pendiente de confirmación',
      activo_confirmado:'Acceso confirmado',
      suspendido:'Acceso suspendido',
      requiere_revision:'Requiere revisión'
    })[state] || 'Acceso no preparado';
  }
  function portalTone(state) {
    return state === 'activo_confirmado' ? 'ok' : state === 'suspendido' ? 'danger' : state === 'invitacion_preparada' ? 'info' : 'warn';
  }
  function clientPolicies(cid) { return (S().all('polizas') || []).filter(p => p && p.clienteId === cid); }
  function documentsForClient(cid) {
    const policyIds = new Set(clientPolicies(cid).map(p => p.id));
    return (S().all('documentos') || []).filter(d => d && (d.clienteId === cid || (d.polizaId && policyIds.has(d.polizaId))));
  }
  function documentsForPolicy(pid) {
    const p = S().get('polizas', pid);
    if (!p) return [];
    return (S().all('documentos') || []).filter(d => d && (d.polizaId === pid || (d.clienteId === p.clienteId && String(d.tipo || '').toLowerCase().includes('póliza'))));
  }
  function openDocument(doc, context) {
    if (!doc || !Orbit.documentViewer) return toast('El visor documental no está disponible.');
    Orbit.documentViewer.open({
      documentRef:doc.documentRef || doc.archivoRef || doc.fileId || '',
      nombre:doc.nombre || doc.tipo || 'Documento',
      tipo:doc.tipo || doc.mimeType || '',
      origen:doc.origen || doc.fuente || 'Expediente',
      pais:doc.pais || '', version:doc.version || '',
      vigencia:doc.vigencia || doc.vigenciaHasta || '',
      estado:doc.estado || doc.storageEstado || 'Registrado',
      responsable:doc.responsable || '',
      externalUrl:doc.driveUrl || doc.url || ''
    }, { context:context || {} });
  }
  function documentRow(doc, context) {
    const status = clean(doc.estado || doc.storageEstado || (doc.archivoPendienteStorage ? 'Pendiente de resguardo' : 'Registrado'));
    return `<button class="asg197-detail-row" data-crm-doc="${esc(doc.id)}" data-crm-doc-context="${esc(JSON.stringify(context || {}))}"><span><b>${esc(doc.nombre || doc.tipo || 'Documento')}</b><small>${esc(doc.tipo || 'Documento')} · ${esc(status)}</small></span><span>Ver →</span></button>`;
  }

  async function prepareInvitation(cid) {
    const client = S().get('clientes', cid);
    if (!client || !canView('clientes', client, 'cliente360')) return toast('Cliente fuera de tu alcance.');
    if (!can('portal', 'edit')) return toast('No tienes permiso para preparar accesos al Portal.');
    if (!clean(client.email)) return toast('Completa y valida el correo antes de preparar la invitación.');
    const reason = clean(await U.prompt('Motivo de preparación o reenvío:', { title:'Preparar acceso al Portal' }));
    if (!reason) return;
    const before = clone(client);
    const meta = Object.assign({}, client.portalAcceso || {}, {
      estado:'invitacion_preparada', preparadoAt:now(), preparadoPor:actor(),
      emailSnapshot:clean(client.email), canalEstado:'pendiente_confirmacion',
      credentialRef:'backend_required', secretoExpuesto:false, motivo:reason
    });
    S().update('clientes', cid, { portalAccesoEstado:'invitacion_preparada', portalAcceso:meta });
    const after = S().get('clientes', cid);
    audit('preparar_invitacion_portal', 'clientes', cid, before, after, reason, { entregaConfirmada:false, credentialRef:'backend_required' });
    toast('Invitación preparada. La entrega y activación siguen pendientes de confirmación.');
    rerenderClient();
  }
  async function confirmAccess(cid) {
    const client = S().get('clientes', cid);
    if (!client || !can('portal', 'edit')) return toast('No tienes permiso para confirmar accesos.');
    const evidence = clean(await U.prompt('Registra la evidencia externa de que el acceso fue confirmado:', { title:'Confirmar acceso al Portal' }));
    if (!evidence) return;
    const phrase = clean(await U.prompt('Escribe exactamente: ACCESO CONFIRMADO', { title:'Confirmación reforzada' }));
    if (phrase !== 'ACCESO CONFIRMADO') return toast('Confirmación cancelada.');
    const before = clone(client);
    const meta = Object.assign({}, client.portalAcceso || {}, {
      estado:'activo_confirmado', confirmadoAt:now(), confirmadoPor:actor(),
      evidencia:evidence, canalEstado:'confirmado', secretoExpuesto:false
    });
    S().update('clientes', cid, { portalAccesoEstado:'activo_confirmado', portalAcceso:meta });
    const after = S().get('clientes', cid);
    audit('confirmar_acceso_portal', 'clientes', cid, before, after, evidence, { confirmacionReforzada:true });
    toast('Acceso confirmado y registrado.');
    rerenderClient();
  }
  async function suspendAccess(cid) {
    const client = S().get('clientes', cid);
    if (!client || !can('portal', 'edit')) return toast('No tienes permiso para suspender accesos.');
    const reason = clean(await U.prompt('Motivo obligatorio de suspensión:', { title:'Suspender acceso al Portal' }));
    if (!reason) return;
    const before = clone(client);
    const meta = Object.assign({}, client.portalAcceso || {}, {
      estado:'suspendido', suspendidoAt:now(), suspendidoPor:actor(), motivoSuspension:reason,
      canalEstado:'suspendido', secretoExpuesto:false
    });
    S().update('clientes', cid, { portalAccesoEstado:'suspendido', portalAcceso:meta });
    const after = S().get('clientes', cid);
    audit('suspender_acceso_portal', 'clientes', cid, before, after, reason, { confirmacionReforzada:true });
    toast('Acceso suspendido y auditado.');
    rerenderClient();
  }
  function rerenderClient() {
    const host = document.getElementById('host');
    if (host && C.render) C.render(host);
  }
  function clientPanel(cid) {
    const client = S().get('clientes', cid);
    if (!client) return '';
    const state = portalState(client), docs = documentsForClient(cid), manage = can('portal', 'edit');
    const meta = client.portalAcceso || {};
    const action = state === 'activo_confirmado'
      ? (manage ? `<button class="btn ghost sm" data-crm-portal-suspend="${esc(cid)}">Suspender acceso</button>` : '')
      : (manage ? `<button class="btn primary sm" data-crm-portal-prepare="${esc(cid)}">${state === 'invitacion_preparada' ? 'Repreparar invitación' : 'Preparar invitación'}</button>${state === 'invitacion_preparada' ? `<button class="btn ghost sm" data-crm-portal-confirm="${esc(cid)}">Registrar acceso confirmado</button>` : ''}` : '');
    return `<section id="crm-op1-client-panel" class="card pad" style="margin:14px 0;display:grid;grid-template-columns:minmax(260px,.9fr) minmax(320px,1.1fr);gap:16px">
      <div>
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap"><div><small class="muted">Portal del cliente</small><h3 style="margin:3px 0 7px;font-family:var(--f-display)">Acceso y atención digital</h3></div><span class="badge ${portalTone(state)}">${esc(portalLabel(state))}</span></div>
        <div class="muted" style="font-size:12px;line-height:1.5">El acceso no expone contraseñas ni credenciales. Preparar una invitación no confirma su entrega ni activación.</div>
        <div style="font-size:12px;margin-top:9px;display:grid;gap:4px"><span>Correo: <b>${esc(client.email || 'Pendiente')}</b></span><span>Última preparación: <b>${esc((meta.preparadoAt || '').slice(0,16).replace('T',' ') || '—')}</b></span><span>Confirmación: <b>${esc((meta.confirmadoAt || '').slice(0,16).replace('T',' ') || '—')}</b></span></div>
        <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:12px"><button class="btn ghost sm" data-crm-portal-preview="${esc(cid)}">Vista previa del Portal</button>${action}</div>
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><div><small class="muted">Expediente documental</small><h3 style="margin:3px 0 7px;font-family:var(--f-display)">${docs.length} documento(s) visibles</h3></div><button class="btn ghost sm" data-crm-add-doc="${esc(cid)}">Registrar documento</button></div>
        <div style="display:grid;gap:6px">${docs.length ? docs.slice(0,5).map(d => documentRow(d, { module:'cliente360', clienteId:cid, documentId:d.id })).join('') : '<div class="empty" style="padding:16px">Sin documentos registrados en el expediente.</div>'}</div>
      </div>
    </section>`;
  }
  function bindClientPanel(cid) {
    const panel = document.getElementById('crm-op1-client-panel');
    if (!panel) return;
    panel.querySelectorAll('[data-crm-portal-preview]').forEach(b => b.onclick = () => { location.hash = '#/portal?cliente=' + encodeURIComponent(b.dataset.crmPortalPreview); });
    panel.querySelectorAll('[data-crm-portal-prepare]').forEach(b => b.onclick = () => prepareInvitation(b.dataset.crmPortalPrepare));
    panel.querySelectorAll('[data-crm-portal-confirm]').forEach(b => b.onclick = () => confirmAccess(b.dataset.crmPortalConfirm));
    panel.querySelectorAll('[data-crm-portal-suspend]').forEach(b => b.onclick = () => suspendAccess(b.dataset.crmPortalSuspend));
    panel.querySelectorAll('[data-crm-add-doc]').forEach(b => b.onclick = () => {
      if (Orbit.importa && Orbit.importa.open) Orbit.importa.open('documentos', { scope:{ cid:b.dataset.crmAddDoc, nombre:(S().get('clientes', b.dataset.crmAddDoc) || {}).nombre || '' }, onDone:rerenderClient });
      else toast('El registro documental no está disponible.');
    });
    panel.querySelectorAll('[data-crm-doc]').forEach(b => {
      b.onclick = () => {
        let context = {}; try { context = JSON.parse(b.dataset.crmDocContext || '{}'); } catch (e) {}
        openDocument(S().get('documentos', b.dataset.crmDoc), context);
      };
    });
  }
  function injectClientPanel() {
    const cid = clean(params().c);
    const host = document.getElementById('host');
    if (!cid || !host || document.getElementById('crm-op1-client-panel')) return;
    const header = host.querySelector('.fichahdr');
    if (!header || !header.parentNode) return;
    header.insertAdjacentHTML('afterend', clientPanel(cid));
    bindClientPanel(cid);
  }

  function money(v, cur) { return U.money ? U.money(Number(v || 0), cur || '') : (cur || '') + ' ' + Number(v || 0).toLocaleString('es-GT'); }
  function policyPage(host, policyId) {
    const p = S().get('polizas', policyId);
    if (!p || !canView('polizas', p, 'polizas')) {
      host.innerHTML = '<div class="page"><div class="modstate"><div class="ms-ico">🔒</div><h2>Póliza no disponible</h2><p>El registro no existe o está fuera de tu alcance.</p><button class="btn ghost" onclick="location.hash=\'#/polizas\'">Volver</button></div></div>';
      return;
    }
    const client = S().get('clientes', p.clienteId) || {};
    const insurer = S().get('aseguradoras', p.aseguradoraId) || {};
    const receipts = (S().all('cobros') || []).filter(c => c.polizaId === p.id).sort((a,b) => clean(a.vence).localeCompare(clean(b.vence)));
    const docs = documentsForPolicy(p.id);
    const g = { emision:Number(p.gastosEmision || 0), financiamiento:Number(p.gastosFinan || 0), otros:Number(p.otros || 0) };
    const tax = Number(p.ivaMonto != null ? p.ivaMonto : (p.iva || p.impuestos || 0));
    const net = Number(p.primaNeta != null ? p.primaNeta : (p.prima || 0));
    const total = Number(p.primaTotal != null ? p.primaTotal : (p.prima || 0));
    const manage = can('polizas','edit');
    host.innerHTML = `<div class="page">
      <div class="crumb" style="margin-bottom:13px"><a style="cursor:pointer;color:var(--red)" data-policy-back>‹ Pólizas</a> / ${esc(p.numero || 'Póliza')}</div>
      <div class="banner"><div class="banner-icon">📑</div><div style="flex:1"><small>Ficha de Póliza</small><h1>${esc(p.ramo || '')} · ${esc(p.producto || p.subramo || '')}</h1><p>${esc(p.numero || '')} · ${esc(client.nombre || '')} · ${esc(insurer.nombre || '')}</p></div><div style="display:flex;gap:7px;flex-wrap:wrap"><button class="btn ghost" data-policy-client>Ver cliente</button><button class="btn ghost" data-policy-source ${docs.length ? '' : 'disabled'}>Documento fuente</button></div></div>
      <div style="display:grid;grid-template-columns:minmax(0,1.2fr) minmax(300px,.8fr);gap:16px">
        <div style="display:grid;gap:16px">
          <section class="card pad"><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">${U.estadoBadge ? U.estadoBadge(p.estado || 'Pendiente') : `<span class="badge neutral">${esc(p.estado || 'Pendiente')}</span>`}<span class="badge ${['Vigente','Por renovar'].includes(p.estado) ? 'ok' : 'neutral'}">${['Vigente','Por renovar'].includes(p.estado) ? 'Genera cartera' : 'Histórico / sin cartera'}</span>${p.requiereValidacion ? '<span class="badge warn">Requiere validación</span>' : ''}</div><div class="vp-grid">${[['Cliente',client.nombre],['Aseguradora',insurer.nombre],['País',p.pais || client.pais],['Moneda',p.moneda],['Vigencia',(p.vigenciaInicio || p.vigenciaIni || '—') + ' → ' + (p.vigenciaFin || '—')],['Frecuencia',p.frecuencia || p.forma],['Forma de pago',p.formaPago || p.conducto],['Suma asegurada',money(p.sumaAsegurada,p.moneda)]].map(x => `<div><span class="muted" style="font-size:11px">${esc(x[0])}</span><b style="display:block;font-size:13px;margin-top:2px">${esc(x[1] || '—')}</b></div>`).join('')}</div></section>
          <section class="card pad"><h3 style="margin:0 0 10px;font-family:var(--f-display)">Desglose de prima</h3><table class="vp-dtbl"><tr><td>Prima neta</td><td class="num">${money(net,p.moneda)}</td></tr><tr><td>Gastos de emisión</td><td class="num">${money(g.emision,p.moneda)}</td></tr><tr><td>Gastos financieros</td><td class="num">${money(g.financiamiento,p.moneda)}</td></tr><tr><td>Otros</td><td class="num">${money(g.otros,p.moneda)}</td></tr><tr><td>IVA / impuestos</td><td class="num">${money(tax,p.moneda)}</td></tr><tr class="vp-tot"><td>Prima total</td><td class="num">${money(total,p.moneda)}</td></tr></table></section>
          <section class="card" style="overflow:hidden"><div style="padding:14px 16px;border-bottom:1px solid var(--line)"><h3 style="margin:0;font-family:var(--f-display)">Recibos y cartera · ${receipts.length}</h3></div><div style="overflow:auto"><table class="tbl"><thead><tr><th>Cuota</th><th class="num">Monto</th><th>Vence</th><th>Estado</th></tr></thead><tbody>${receipts.length ? receipts.map(c => `<tr><td>${esc(c.cuota || '—')}</td><td class="num">${money(c.montoTotal != null ? c.montoTotal : c.monto,c.moneda || p.moneda)}</td><td>${esc(c.vence || '—')}</td><td><span class="badge ${/pag|concil/i.test(c.estado || '') ? 'ok' : /venc/i.test(c.estado || '') ? 'danger' : 'warn'}">${esc(c.estado || 'Pendiente')}</span></td></tr>`).join('') : '<tr><td colspan="4" class="muted" style="text-align:center;padding:22px">Sin recibos registrados.</td></tr>'}</tbody></table></div></section>
        </div>
        <aside style="display:grid;gap:16px;align-content:start">
          <section class="card pad"><h3 style="margin:0 0 10px;font-family:var(--f-display)">Documentos de la Póliza</h3><div style="display:grid;gap:6px">${docs.length ? docs.map(d => documentRow(d, { module:'polizas', polizaId:p.id, clienteId:p.clienteId, documentId:d.id })).join('') : '<div class="empty" style="padding:18px">Sin documento fuente registrado.</div>'}</div><button class="btn ghost sm" style="width:100%;margin-top:10px" data-policy-add-doc>Registrar documento</button></section>
          <section class="card pad"><h3 style="margin:0 0 9px;font-family:var(--f-display)">Acciones</h3><div style="display:grid;gap:7px">${manage ? `<button class="btn ghost" data-policy-edit>Editar Póliza</button><button class="btn ghost" data-policy-endorsement>Solicitar endoso</button>` : '<div class="cfg-note">Los cambios requieren una gestión autorizada.</div>'}<button class="btn primary" data-policy-management>Crear gestión operativa</button></div></section>
        </aside>
      </div>
    </div>`;
    host.querySelector('[data-policy-back]').onclick = () => { location.hash = '#/polizas'; };
    host.querySelector('[data-policy-client]').onclick = () => { location.hash = '#/cliente360?c=' + encodeURIComponent(p.clienteId); };
    const sourceBtn = host.querySelector('[data-policy-source]'); if (sourceBtn && docs.length) sourceBtn.onclick = () => openDocument(docs[0], { module:'polizas', polizaId:p.id, clienteId:p.clienteId, documentId:docs[0].id });
    host.querySelectorAll('[data-crm-doc]').forEach(b => b.onclick = () => openDocument(S().get('documentos', b.dataset.crmDoc), { module:'polizas', polizaId:p.id, clienteId:p.clienteId, documentId:b.dataset.crmDoc }));
    const add = host.querySelector('[data-policy-add-doc]'); if (add) add.onclick = () => Orbit.importa && Orbit.importa.open ? Orbit.importa.open('documentos',{ scope:{ cid:p.clienteId, polizaId:p.id, nombre:client.nombre || '' }, onDone:() => policyPage(host,p.id) }) : toast('El registro documental no está disponible.');
    const edit = host.querySelector('[data-policy-edit]'); if (edit) edit.onclick = () => C.editarPoliza ? C.editarPoliza(p.id) : toast('Edición no disponible.');
    const end = host.querySelector('[data-policy-endorsement]'); if (end) end.onclick = () => C.endoso ? C.endoso(p.id) : toast('Flujo de endoso no disponible.');
    host.querySelector('[data-policy-management]').onclick = () => Orbit.ciclo && Orbit.ciclo.solicitarGestion ? Orbit.ciclo.solicitarGestion(p.clienteId,p.id) : toast('Flujo operativo no disponible.');
  }

  const originalClientRender = C.render.bind(C);
  C.render = function (host) {
    const out = originalClientRender(host);
    setTimeout(injectClientPanel, 0);
    return out;
  };
  const originalVerPoliza = C.verPoliza && C.verPoliza.bind(C);
  C.verPoliza = function (policyId) {
    const row = S().get('polizas', policyId);
    if (!row || !canView('polizas', row, 'polizas')) return toast('Póliza fuera de tu alcance.');
    location.hash = '#/polizas?p=' + encodeURIComponent(policyId);
  };

  const originalPolicyRender = P.render.bind(P);
  P.render = function (host) {
    const policyId = clean(params().p);
    if (policyId) return policyPage(host, policyId);
    return originalPolicyRender(host);
  };

  const originalPortalRender = PT.render.bind(PT);
  PT.render = function (host) {
    const out = originalPortalRender(host);
    setTimeout(() => {
      const requested = clean(params().cliente);
      const select = host && host.querySelector('#pt-cli');
      if (requested && select && select.value !== requested && Array.from(select.options).some(o => o.value === requested)) {
        select.value = requested;
        select.dispatchEvent(new Event('change', { bubbles:true }));
        return;
      }
      sanitizePortal(host || document);
    }, 0);
    return out;
  };

  const replacements = [
    [/Storage\/backend conectado/gi, 'servicio documental conectado'],
    [/Storage pendiente/gi, 'resguardo pendiente'],
    [/pendientes de integración o canal conectado/gi, 'requieren un canal conectado y confirmación'],
    [/en línea · te ayudo al instante/gi, 'asistente de orientación'],
    [/WhatsApp\/correo quedan pendientes de integración o canal conectado/gi, 'WhatsApp y correo requieren un canal conectado y confirmación de entrega']
  ];
  function sanitizePortal(root) {
    if (!root || !document.createTreeWalker) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      let text = node.nodeValue;
      replacements.forEach(pair => { text = text.replace(pair[0], pair[1]); });
      if (text !== node.nodeValue) node.nodeValue = text;
    });
  }
  if (window.MutationObserver) {
    const observer = new MutationObserver(records => records.forEach(r => r.addedNodes.forEach(n => { if (n.nodeType === 1) sanitizePortal(n); })));
    observer.observe(document.documentElement, { childList:true, subtree:true });
  }

  C.__op1ClosureV1216 = { originalClientRender, originalVerPoliza, injectClientPanel, portalState };
  P.__op1ClosureV1216 = { originalPolicyRender, policyPage };
  PT.__op1ClosureV1216 = { originalPortalRender, sanitizePortal };
})();
