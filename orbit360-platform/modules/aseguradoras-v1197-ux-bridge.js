/* ============================================================
   Orbit 360 · Aseguradoras · adaptador de contrato de candidata
   No sustituye render, no reescribe host, no observa el DOM y no
   persiste datos derivados. Adapta alias del directorio importado,
   carga los estilos canónicos y expone el catálogo documental como
   consulta metadata-only. La candidata aprobada conserva la UI.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
(function () {
  'use strict';
  const mod = Orbit.modules.aseguradoras;
  if (!mod || mod.__candidateContractAdapter) return;

  const S = () => Orbit.store;
  const U = Orbit.ui;
  const KNOWLEDGE_SRC = 'data/tenant-alianzas-soluciones-source-batch-p09g.js?v=20260715-11';
  let catalogPromise = null;

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function norm(value) {
    return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function canManage() {
    try { return ['Dirección', 'Admin'].includes(clean(Orbit.session && Orbit.session.rol && Orbit.session.rol())); }
    catch (e) { return false; }
  }
  function loadStyle() {
    if (document.querySelector('link[data-asg-candidate-style]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'styles/aseguradoras-candidate.css?v=20260715-11';
    link.dataset.asgCandidateStyle = '1';
    document.head.appendChild(link);
  }
  function portalType(name) {
    const value = norm(name);
    if (/cotizador|cotizacion/.test(value)) return 'Cotizador';
    if (/pago|cobro|factura/.test(value)) return 'Cobros';
    if (/siniestro|reclamo/.test(value)) return 'Siniestros';
    if (/emision|oficina virtual|intermediario/.test(value)) return 'Emisión';
    return 'Portal general';
  }
  function normalizeRow(row) {
    if (!row || typeof row !== 'object') return row;
    row.color = clean(row.color) || '#C5162E';
    row.codigoIntermediario = clean(row.codigoIntermediario || row.codigo);
    row.telGeneral = clean(row.telGeneral || row.telefono);
    row.emergencia = clean(row.emergencia || row.telefonoEmergencias);
    row.monedaBase = clean(row.monedaBase || row.moneda || (row.pais === 'CO' ? 'COP' : 'GTQ'));
    row.facturacion = Object.assign({}, row.facturacion || {});
    row.facturacion.nit = clean(row.facturacion.nit || row.nit);
    row.facturacion.dirFiscal = clean(row.facturacion.dirFiscal || row.facturacion.direccionFiscal || row.direccion || row.oficina);
    row.contactos = (row.contactos || []).map(contact => Object.assign({}, contact, {
      tel: clean(contact.tel || contact.telefono),
      ext: clean(contact.ext || contact.extension),
      pais: clean(contact.pais || row.pais),
      canal: clean(contact.canal || (contact.email ? 'Correo' : (contact.tel || contact.telefono ? 'Teléfono' : 'Correo')),
      vigencia: clean(contact.vigencia || 'Por confirmar'),
      area: clean(contact.area || (contact.cargo ? 'Comercial' : ''))
    }));
    row.portales = (row.portales || []).map(portal => Object.assign({}, portal, {
      pais: clean(portal.pais || row.pais),
      tipo: clean(portal.tipo || portalType(portal.nombre)),
      estadoAcceso: clean(portal.estadoAcceso || (portal.url ? 'Sin verificar' : 'Sin acceso registrado'))
    }));
    return row;
  }
  function normalizeAll() {
    try { (S().all('aseguradoras') || []).forEach(normalizeRow); } catch (e) {}
  }

  function loadCatalog() {
    if (window.OrbitSourceBatchesP09g) return Promise.resolve(window.OrbitSourceBatchesP09g);
    if (catalogPromise) return catalogPromise;
    catalogPromise = new Promise(resolve => {
      const existing = document.querySelector('script[data-asg-knowledge-catalog]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.OrbitSourceBatchesP09g || []), { once: true });
        setTimeout(() => resolve(window.OrbitSourceBatchesP09g || []), 2500);
        return;
      }
      const script = document.createElement('script');
      script.src = KNOWLEDGE_SRC;
      script.async = false;
      script.dataset.asgKnowledgeCatalog = '1';
      script.onload = () => resolve(window.OrbitSourceBatchesP09g || []);
      script.onerror = () => resolve([]);
      document.head.appendChild(script);
    });
    return catalogPromise;
  }
  function sourcesFor(row) {
    const names = [row && row.nombre, row && row.canonicalName].concat(row && row.aliases || []).map(norm).filter(Boolean);
    const batches = window.OrbitSourceBatchesP09g || [];
    const batch = batches.find(item => item && item.tenantId === 'alianzas-soluciones' && item.id === 'ays_aseguradoras_knowledge_batch_2026_v1');
    if (!batch) return [];
    return (batch.sources || []).filter(item => {
      const variants = [item.insurerName].concat(item.insurerAliases || []).map(norm).filter(Boolean);
      return variants.some(value => names.includes(value));
    });
  }
  function bindingSetsFor(row) {
    const names = [row && row.nombre, row && row.canonicalName].concat(row && row.aliases || []).map(norm).filter(Boolean);
    const batches = window.OrbitSourceBatchesP09g || [];
    const batch = batches.find(item => item && item.tenantId === 'alianzas-soluciones' && item.id === 'ays_aseguradoras_knowledge_batch_2026_v1');
    if (!batch) return [];
    return (batch.bindingSets || []).filter(item => names.includes(norm(item.insurerName)));
  }
  function esc(value) { return U && U.esc ? U.esc(clean(value)) : clean(value); }
  function openKnowledge(row) {
    const sources = sourcesFor(row);
    const bindings = bindingSetsFor(row);
    let back = document.getElementById('asg-knowledge-catalog-modal');
    if (back) back.remove();
    back = document.createElement('div');
    back.id = 'asg-knowledge-catalog-modal';
    back.className = 'drawer-back open';
    back.style.cssText = 'display:grid;place-items:center;z-index:245';
    back.innerHTML = `<div class="card" style="width:min(940px,96vw);max-height:90vh;overflow:auto;padding:0">
      <div style="padding:17px 20px;background:linear-gradient(120deg,var(--red),#10141a);display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
        <div><small style="color:rgba(255,255,255,.7)">Tarifas y conocimiento · catálogo mapeado</small><b style="display:block;color:#fff;font-size:18px;margin-top:3px">${esc(row.nombre)}</b></div><button class="imp-x" data-close style="color:#fff">✕</button>
      </div>
      <div style="padding:18px 20px">
        <div class="cfg-note" style="margin-bottom:12px"><b>Estado honesto:</b> estas fuentes fueron inventariadas y relacionadas, pero continúan en lectura pendiente. No contienen tasas persistidas y no habilitan Cotizador ni Comparativo hasta extracción, diff, validación humana y segundo gate.</div>
        <div style="display:grid;gap:8px">${sources.length ? sources.map(item => { const s = item.source || {}; return `<div class="asg-sec"><div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><b>${esc(s.nombre)}</b><div class="muted" style="font-size:12px;margin-top:3px">${esc(s.pais)} · ${esc(s.moneda)} · ${esc(s.ramo)} · ${esc(s.producto)} · ${esc(s.version)}</div></div><span class="badge warn">Lectura pendiente</span></div></div>`; }).join('') : '<div class="empty">Esta aseguradora no tiene fuentes en el lote documental inicial.</div>'}</div>
        ${bindings.length ? `<div class="asg-sec-t" style="margin-top:16px">Conjuntos de vinculación definidos</div><div style="display:grid;gap:8px">${bindings.map(item => `<div class="asg-sec"><b>${esc(item.variant && [item.variant.ramo,item.variant.producto,item.variant.tipoVehiculo,item.variant.plan].filter(Boolean).join(' · '))}</b><div class="muted" style="font-size:12px;margin-top:4px">Requiere validación humana y segundo gate. Cotizador/Comparativo: no habilitados.</div></div>`).join('')}</div>` : ''}
      </div>
      <div style="padding:12px 20px;border-top:1px solid var(--line);display:flex;justify-content:flex-end"><button class="btn ghost" data-close>Cerrar</button></div>
    </div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', close));
    back.addEventListener('click', event => { if (event.target === back) close(); });
  }
  async function changeLogo(row, refresh) {
    if (!canManage()) return;
    const url = await U.prompt('Pega una URL HTTPS autorizada para el logo. Déjala vacía para retirar el logo. No se guardan archivos ni Data URLs en el navegador.', { title: 'Cambiar logo de aseguradora' });
    if (url == null) return;
    const value = clean(url);
    if (value && !/^https:\/\//i.test(value)) { U.toast('El logo debe usar una URL HTTPS autorizada.'); return; }
    const reason = await U.prompt('Motivo del cambio de logo:', { title: 'Registrar cambio' });
    if (reason == null || !clean(reason)) return;
    const current = S().get('aseguradoras', row.id) || row;
    const activity = (current.actividad || []).slice();
    activity.unshift({ fecha: new Date().toISOString(), responsable: 'Usuario entorno de validación · Dirección', cambio: value ? 'Logo actualizado por referencia segura' : 'Logo retirado', motivo: clean(reason) });
    S().update('aseguradoras', row.id, { logo: value, actividad: activity.slice(0, 60) });
    setTimeout(refresh, 250);
  }
  function enhanceFicha(id, originalFicha) {
    const root = document.getElementById('asg-ficha');
    const row = S().get('aseguradoras', id);
    if (!root || !row) return;
    const actions = root.querySelector('.card>div:first-child>div:last-child');
    if (!actions) return;
    if (!actions.querySelector('[data-asg-knowledge]')) {
      const button = document.createElement('button');
      button.className = 'btn ghost sm';
      button.dataset.asgKnowledge = '1';
      button.style.cssText = 'background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.3);color:#fff';
      button.textContent = '🧠 Fuentes mapeadas';
      button.addEventListener('click', () => openKnowledge(row));
      actions.prepend(button);
    }
    if (canManage() && !actions.querySelector('[data-asg-logo]')) {
      const button = document.createElement('button');
      button.className = 'btn ghost sm';
      button.dataset.asgLogo = '1';
      button.style.cssText = 'background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.3);color:#fff';
      button.textContent = '🖼 Logo';
      button.addEventListener('click', () => changeLogo(row, () => originalFicha(id)));
      actions.prepend(button);
    }
  }

  loadStyle();
  loadCatalog();
  normalizeAll();

  const originalRender = mod.render.bind(mod);
  const originalFicha = mod.ficha.bind(mod);
  const originalKpi = mod.kpi.bind(mod);
  mod.render = function (host) { normalizeAll(); return originalRender(host); };
  mod.ficha = function (id, startEdit) {
    normalizeAll();
    const out = originalFicha(id, startEdit);
    setTimeout(() => enhanceFicha(id, originalFicha), 0);
    return out;
  };
  mod.kpi = function (type) { normalizeAll(); return originalKpi(type); };

  document.addEventListener('orbit:store', normalizeAll);
  window.addEventListener('orbit:store:emit', normalizeAll);

  mod.__approvedCandidateFrontend = {
    sourceCommit: '756082365b3d63f2a466d622162b9c2dec7053c7',
    sourceBlob: '93f194aae36dfa3ccd4f154f94d216c12350f9cf',
    visualOverride: false,
    canonicalRenderer: 'modules/aseguradoras.js',
    adapter: 'directory-contract-and-knowledge-catalog-v1'
  };
  mod.__candidateContractAdapter = true;
  Orbit.aseguradorasKnowledgeCatalog = { load: loadCatalog, sourcesFor: sourcesFor, bindingSetsFor: bindingSetsFor, open: openKnowledge };
})();
