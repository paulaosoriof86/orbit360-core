/* ============================================================
   Orbit 360 · Bridge UX Emisión + Endosos v1.201
   ------------------------------------------------------------
   - Comparativo → Solicitud de emisión en Ops.
   - Renovar → Cotizador/Comparativo, no póliza provisional.
   - Endoso → gestión aprobable, no edición directa.
   - Ops muestra controles de emisión/endoso en la ficha de gestión.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
(function () {
  const I = Orbit.issuance;
  const E = Orbit.endorsements;
  const A = Orbit.access;
  const U = Orbit.ui;
  const S = () => Orbit.store;
  if (!I || !E || !A || Orbit.__issuanceEndorsementsV1201) return;
  Orbit.__issuanceEndorsementsV1201 = true;

  function esc(v) { return U && U.esc ? U.esc(String(v == null ? '' : v)) : String(v || ''); }
  function today() { return U && U.today ? U.today() : new Date().toISOString().slice(0, 10); }
  function plusYear(date) { const d = new Date((date || today()) + 'T00:00:00'); d.setFullYear(d.getFullYear() + 1); return d.toISOString().slice(0, 10); }
  function toast(v) { try { U.toast(v); } catch (e) {} }
  function modal(id, title, body, actions, width) {
    let b = document.getElementById(id); if (b) b.remove();
    b = document.createElement('div'); b.id = id; b.className = 'drawer-back open'; b.style.cssText = 'display:grid;place-items:center;z-index:245';
    b.innerHTML = `<div class="card" style="width:min(${width || 720}px,96vw);max-height:92vh;display:flex;flex-direction:column;padding:0"><div style="padding:16px 20px;background:linear-gradient(120deg,var(--graph),#10141a);display:flex;justify-content:space-between;gap:12px"><div><small style="color:rgba(255,255,255,.68)">Orbit Ops</small><b style="display:block;color:#fff;font-family:var(--f-display);font-size:17px">${esc(title)}</b></div><button class="imp-x" data-close style="color:#fff">✕</button></div><div style="padding:18px 20px;overflow:auto;flex:1">${body}</div><div style="padding:13px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">${actions || ''}<button class="btn ghost" data-close>Cancelar</button></div></div>`;
    document.body.appendChild(b);
    const close = () => b.remove(); b.querySelectorAll('[data-close]').forEach(x => x.onclick = close); b.addEventListener('click', e => { if (e.target === b) close(); });
    return b;
  }
  function frequencyFromPayments(n) { return ({1:'Contado',2:'Semestral',3:'Cuatrimestral',4:'Trimestral',6:'Bimestral',12:'Mensual'})[+n] || (+n > 1 ? 'Mensual' : 'Contado'); }
  function insurerForQuote(q) {
    const name = String(q && (q.nombre || q.aseguradora) || '').toLowerCase();
    return (S().all('aseguradoras') || []).find(a => a && a.nombre && (a.nombre.toLowerCase() === name || name.includes(a.nombre.toLowerCase()) || a.nombre.toLowerCase().includes(name))) || null;
  }
  function scopedClients() { return A.filter('clientes', S().all('clientes') || [], 'cliente360'); }

  function captureQuoteContext(host) {
    const btn = host && host.querySelector('#cz-comp'); if (!btn || btn.dataset.v1201) return;
    btn.dataset.v1201 = '1';
    btn.addEventListener('click', () => {
      const v = id => { const el = host.querySelector(id); return el ? el.value : ''; };
      const renewal = window.__orbitRenewalContext || {};
      window.__orbitQuoteContext = {
        clienteId: v('#cz-cliid') || renewal.clienteId || '', asesorId: v('#cz-ase') || '',
        pais: v('#cz-pais') || renewal.pais || '', ramo: v('#cz-ramo') || renewal.ramo || '',
        producto: v('#cz-sub') || renewal.producto || '', prospecto: v('#cz-cliente') || '',
        sourcePolicyId: renewal.policyId || '', renewalManagementId: renewal.gestionId || '',
        riesgo: { marca: v('#cz-marca') || v('#cz-marca-t'), linea: v('#cz-linea') || v('#cz-linea-t'), modelo: v('#cz-modelo') || v('#cz-modelo-t'), placa: v('#cz-placa'), anio: v('#cz-anio') }
      };
    }, true);
  }

  function installCotizadorContext() {
    const mod = Orbit.modules.cotizador; if (!mod || !mod.render || mod.__contextV1201) return;
    const original = mod.render.bind(mod);
    mod.render = function (host) { const out = original(host); setTimeout(() => captureQuoteContext(host), 0); return out; };
    mod.__contextV1201 = { original };
  }

  function quoteRows() {
    return (Orbit._cots || []).map((q, i) => {
      const insurer = insurerForQuote(q);
      return { index: i, insurerId: insurer && insurer.id || '', insurerName: insurer && insurer.nombre || q.nombre || q.aseguradora || ('Opción ' + (i + 1)), quote: q };
    });
  }

  function openAcceptedProposal() {
    if (!I.canManage()) return toast('Tu rol activo no puede crear solicitudes de emisión.');
    const context = Object.assign({}, window.__orbitQuoteContext || {}, window.__orbitRenewalContext || {});
    const clients = scopedClients();
    const quotes = quoteRows();
    const insurers = (S().all('aseguradoras') || []).filter(a => a.vinculada !== false && (!context.pais || !a.pais || a.pais === context.pais));
    const selectedClient = context.clienteId || (clients[0] && clients[0].id) || '';
    const selectedQuote = quotes[0] || null;
    const selectedInsurer = selectedQuote && selectedQuote.insurerId || (insurers[0] && insurers[0].id) || '';
    const q = selectedQuote && selectedQuote.quote || {};
    const payments = +(q.fracc || 1) || 1;
    const start = context.sourcePolicyId ? ((S().get('polizas', context.sourcePolicyId) || {}).vigenciaFin || today()) : today();
    const body = `<div class="cfg-note" style="margin-bottom:13px">Registrar la aceptación crea una <b>Solicitud de emisión en Ops</b>. Todavía no crea una póliza ni recibos. La póliza nace únicamente al recibir número y documento reales de la aseguradora.</div><div class="cgrid">
      <label class="ce-l">Cliente *<select id="emi-cli" class="o-sel">${clients.map(c => `<option value="${esc(c.id)}" ${c.id === selectedClient ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}</select></label>
      <label class="ce-l">Aseguradora aceptada *<select id="emi-asg" class="o-sel">${insurers.map(a => `<option value="${esc(a.id)}" ${a.id === selectedInsurer ? 'selected' : ''}>${esc(a.nombre)}</option>`).join('')}</select></label>
      <label class="ce-l">Ramo *<input id="emi-ramo" class="o-sel" value="${esc(context.ramo || q.ramo || '')}"></label>
      <label class="ce-l">Producto / subramo *<input id="emi-prod" class="o-sel" value="${esc(context.producto || '')}"></label>
      <label class="ce-l">País *<select id="emi-pais" class="o-sel"><option ${context.pais === 'GT' ? 'selected' : ''}>GT</option><option ${context.pais === 'CO' ? 'selected' : ''}>CO</option></select></label>
      <label class="ce-l">Moneda *<select id="emi-mon" class="o-sel"><option ${String(q.cur || '') === 'GTQ' ? 'selected' : ''}>GTQ</option><option ${String(q.cur || '') === 'COP' ? 'selected' : ''}>COP</option></select></label>
      <label class="ce-l">Prima neta aceptada *<input id="emi-neta" type="number" class="o-sel" value="${+q.neta || 0}"></label>
      <label class="ce-l">Gastos de emisión<input id="emi-gem" type="number" class="o-sel" value="${+q.gastosEm || 0}"></label>
      <label class="ce-l">Gastos financieros<input id="emi-gfin" type="number" class="o-sel" value="${+q.recargo || 0}"></label>
      <label class="ce-l">IVA / impuestos<input id="emi-iva" type="number" class="o-sel" value="${+q.iva || 0}"></label>
      <label class="ce-l">Prima total aceptada *<input id="emi-total" type="number" class="o-sel" value="${+q.total || 0}"></label>
      <label class="ce-l">Cantidad de pagos<input id="emi-cuotas" type="number" min="1" class="o-sel" value="${payments}"></label>
      <label class="ce-l">Fuente de la oferta<select id="emi-source-type" class="o-sel"><option value="cotizacion_aseguradora">Cotización oficial de aseguradora</option><option value="pdf_validado">PDF / documento validado</option><option value="carga_manual_validada">Carga manual validada</option><option value="tarifa_parametrizada_validada">Tarifa parametrizada validada</option></select></label>
      <label class="ce-l">Referencia cotización / fuente<input id="emi-source" class="o-sel" placeholder="N.º cotización o referencia"></label>
      <label class="ce-l">Referencia documental<input id="emi-doc" class="o-sel" placeholder="documentRef; puede completarse antes de emitir"></label>
      <label class="ce-l">Inicio estimado<input id="emi-start" type="date" class="o-sel" value="${esc(start)}"></label>
      <label class="ce-l">Fin estimado<input id="emi-end" type="date" class="o-sel" value="${esc(plusYear(start))}"></label>
    </div><label class="ce-l" style="margin-top:12px">Nota operativa<textarea id="emi-note" class="o-sel" style="min-height:64px">${context.sourcePolicyId ? 'Renovación de póliza ' + esc((S().get('polizas', context.sourcePolicyId) || {}).numero || '') : ''}</textarea></label><label style="display:flex;gap:8px;align-items:flex-start;margin-top:12px"><input id="emi-accepted" type="checkbox"><span><b>El cliente confirmó esta opción.</b><small class="muted" style="display:block">La aceptación debe estar soportada por la gestión, correo, documento o registro correspondiente.</small></span></label>`;
    const b = modal('issuance-accepted-v1201','Registrar propuesta aceptada',body,'<button class="btn primary" data-save>Crear solicitud de emisión</button>',820);
    const $ = s => b.querySelector(s);
    const country = $('#emi-pais'), currency = $('#emi-mon');
    country.onchange = () => { currency.value = country.value === 'CO' ? 'COP' : 'GTQ'; };
    b.querySelector('[data-save]').onclick = () => {
      const clientId = $('#emi-cli').value, client = S().get('clientes', clientId);
      const cuotaN = Math.max(1, +$('#emi-cuotas').value || 1);
      const result = I.createRequest({
        clienteId, asesorId: client && client.asesorId || context.asesorId, aseguradoraId: $('#emi-asg').value,
        sourcePolicyId: context.sourcePolicyId || '', renewalManagementId: context.renewalManagementId || context.gestionId || '',
        pais: country.value, moneda: currency.value, ramo: $('#emi-ramo').value.trim(), producto: $('#emi-prod').value.trim(),
        acceptedConfirmed: $('#emi-accepted').checked, riesgoActualizado: false,
        nota: $('#emi-note').value.trim(), origen: 'Comparativo',
        acceptedOffer: {
          aseguradoraId: $('#emi-asg').value, pais: country.value, moneda: currency.value,
          ramo: $('#emi-ramo').value.trim(), producto: $('#emi-prod').value.trim(),
          primaNeta: +$('#emi-neta').value || 0, gastosEmision: +$('#emi-gem').value || 0,
          gastosFinan: +$('#emi-gfin').value || 0, ivaMonto: +$('#emi-iva').value || 0,
          primaTotal: +$('#emi-total').value || 0, cuotas: cuotaN, frecuencia: frequencyFromPayments(cuotaN),
          sourceType: $('#emi-source-type').value, sourceRef: $('#emi-source').value.trim(), documentRef: $('#emi-doc').value.trim(),
          vigenciaInicioEstimada: $('#emi-start').value, vigenciaFinEstimada: $('#emi-end').value,
          riskContext: window.__orbitQuoteContext && window.__orbitQuoteContext.riesgo || {}
        }
      }, { motivo: 'Opción aceptada desde Comparativo' });
      if (!result.ok) return toast('No se creó: ' + (result.errors || []).join(', '));
      b.remove(); toast(result.reused ? 'La solicitud de emisión ya estaba activa.' : 'Solicitud de emisión creada en Ops.');
      location.hash = '#/ops'; window.__orbitOpenGestion = result.request.id;
    };
  }

  function enhanceComparativo(host) {
    if (!host || host.querySelector('#cmp-accept-v1201')) return;
    const page = host.querySelector('.page'); if (!page) return;
    const bar = document.createElement('div'); bar.id = 'cmp-accept-v1201'; bar.className = 'card pad'; bar.style.cssText = 'margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;border-left:3px solid var(--red)';
    bar.innerHTML = `<div><b style="font-family:var(--f-display)">Decisión del cliente</b><div class="muted" style="font-size:12px">Registra la opción aceptada y continúa en Ops. No crea una póliza provisional.</div></div>${I.canManage() ? '<button class="btn primary" data-accept>Registrar opción aceptada</button>' : '<span class="badge neutral">Solo equipo autorizado</span>'}`;
    page.insertBefore(bar, page.children[1] || page.firstChild);
    const btn = bar.querySelector('[data-accept]'); if (btn) btn.onclick = openAcceptedProposal;
  }
  function installComparativo() {
    const mod = Orbit.modules.comparativo; if (!mod || !mod.render || mod.__issuanceV1201) return;
    const original = mod.render.bind(mod);
    mod.render = function (host) { const out = original(host); setTimeout(() => enhanceComparativo(host), 0); return out; };
    mod.__issuanceV1201 = { original };
  }

  function openIssueModal(request) {
    const offer = request.acceptedOffer || {}, source = request.sourcePolicyId ? S().get('polizas', request.sourcePolicyId) : null;
    const start = offer.vigenciaInicioEstimada || (source && source.vigenciaFin) || today();
    const body = `<div class="cfg-note" style="margin-bottom:13px">Completa únicamente con la póliza ya emitida. El número y el documento son obligatorios; al confirmar se crea la póliza, sus recibos y los vínculos de renovación.</div><div class="cgrid">
      <label class="ce-l">Número real de póliza *<input id="iss-num" class="o-sel"></label>
      <label class="ce-l">Documento de póliza emitida *<input id="iss-doc" class="o-sel" placeholder="documentRef"></label>
      <label class="ce-l">Vigencia inicio *<input id="iss-start" type="date" class="o-sel" value="${esc(start)}"></label>
      <label class="ce-l">Vigencia fin *<input id="iss-end" type="date" class="o-sel" value="${esc(plusYear(start))}"></label>
      <label class="ce-l">Frecuencia<select id="iss-freq" class="o-sel">${['Contado','Semestral','Cuatrimestral','Trimestral','Bimestral','Mensual'].map(x => `<option ${x === offer.frecuencia ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <label class="ce-l">Cantidad de pagos<input id="iss-payments" type="number" min="1" class="o-sel" value="${+offer.cuotas || 1}"></label>
      <label class="ce-l">Forma de pago<input id="iss-form" class="o-sel" value="${esc(offer.formaPago || '')}"></label>
      <label class="ce-l">Conducto<input id="iss-conduct" class="o-sel" value="${esc(offer.conducto || '')}"></label>
      <label class="ce-l">Prima neta<input id="iss-net" type="number" class="o-sel" value="${+offer.primaNeta || 0}"></label>
      <label class="ce-l">Gastos emisión<input id="iss-gem" type="number" class="o-sel" value="${+offer.gastosEmision || 0}"></label>
      <label class="ce-l">Gastos financieros<input id="iss-gfin" type="number" class="o-sel" value="${+offer.gastosFinan || 0}"></label>
      <label class="ce-l">Otros<input id="iss-other" type="number" class="o-sel" value="${+offer.otros || 0}"></label>
      <label class="ce-l">Referencia aseguradora<input id="iss-source" class="o-sel" value="${esc(offer.sourceRef || '')}"></label>
    </div>`;
    const b = modal('issue-policy-v1201','Registrar emisión real',body,'<button class="btn primary" data-issue>Crear póliza y recibos</button>',760);
    const $ = s => b.querySelector(s);
    b.querySelector('[data-issue]').onclick = () => {
      const result = I.issueRequest(request.id, {
        numero: $('#iss-num').value.trim(), documentRef: $('#iss-doc').value.trim(),
        vigenciaInicio: $('#iss-start').value, vigenciaFin: $('#iss-end').value,
        frecuencia: $('#iss-freq').value, cuotas: +$('#iss-payments').value || 1,
        formaPago: $('#iss-form').value.trim(), conducto: $('#iss-conduct').value.trim(),
        primaNeta: +$('#iss-net').value || 0, gastosEmision: +$('#iss-gem').value || 0,
        gastosFinan: +$('#iss-gfin').value || 0, otros: +$('#iss-other').value || 0,
        sourceRef: $('#iss-source').value.trim()
      }, { motivo: 'Póliza emitida recibida y verificada' });
      if (!result.ok) return toast('No se emitió: ' + (result.errors || []).join(', '));
      b.remove(); const base = document.getElementById('ciclo-modal'); if (base) base.remove();
      toast(result.alreadyIssued ? 'La solicitud ya tenía una póliza vinculada.' : 'Póliza y recibos creados correctamente.');
      Orbit.modules.cliente360.verPoliza(result.policy.id);
    };
  }

  function endorsementProposalFromForm(b, type) {
    if (type === 'sustitucion_vehiculo') return { vehiculoId: (b.querySelector('#end-current') || {}).value || '', nuevoVehiculo: { marca: b.querySelector('#end-marca').value.trim(), linea: b.querySelector('#end-linea').value.trim(), anio: b.querySelector('#end-anio').value, placa: b.querySelector('#end-placa').value.trim(), chasis: b.querySelector('#end-chasis').value.trim(), motor: b.querySelector('#end-motor').value.trim() }, nota: b.querySelector('#end-note').value.trim() };
    if (type === 'beneficiarios') return { beneficiarios: b.querySelector('#end-benef').value.split(/\n+/).map(x => x.trim()).filter(Boolean), nota: b.querySelector('#end-note').value.trim() };
    if (type === 'forma_pago') return { frecuencia: b.querySelector('#end-freq').value, formaPago: b.querySelector('#end-form').value.trim(), cuotas: +b.querySelector('#end-cuotas').value || 1, conducto: b.querySelector('#end-conduct').value.trim(), nota: b.querySelector('#end-note').value.trim() };
    if (type === 'datos_riesgo') return { patch: { direccionRiesgo: b.querySelector('#end-dir').value.trim(), contactoRiesgo: b.querySelector('#end-contact').value.trim(), observacionesRiesgo: b.querySelector('#end-obs').value.trim() }, nota: b.querySelector('#end-note').value.trim() };
    return { nota: b.querySelector('#end-note').value.trim() };
  }
  function endFields(type, policy) {
    if (type === 'sustitucion_vehiculo') {
      const vehicles = (S().all('vehiculos') || []).filter(v => v.polizaId === policy.id && String(v.estado || '').toLowerCase() !== 'histórico');
      return `<div class="cgrid"><label class="ce-l">Vehículo actual<select id="end-current" class="o-sel"><option value="">— Identificar automáticamente —</option>${vehicles.map(v => `<option value="${esc(v.id)}">${esc([v.marca,v.linea,v.placa].filter(Boolean).join(' · '))}</option>`).join('')}</select></label><label class="ce-l">Marca nuevo vehículo<input id="end-marca" class="o-sel"></label><label class="ce-l">Línea<input id="end-linea" class="o-sel"></label><label class="ce-l">Año<input id="end-anio" type="number" class="o-sel"></label><label class="ce-l">Placa<input id="end-placa" class="o-sel"></label><label class="ce-l">Chasis<input id="end-chasis" class="o-sel"></label><label class="ce-l">Motor<input id="end-motor" class="o-sel"></label></div>`;
    }
    if (type === 'beneficiarios') return '<label class="ce-l">Beneficiarios después del endoso<textarea id="end-benef" class="o-sel" style="min-height:100px" placeholder="Uno por línea"></textarea></label>';
    if (type === 'forma_pago') return `<div class="cgrid"><label class="ce-l">Frecuencia<select id="end-freq" class="o-sel">${['Contado','Semestral','Cuatrimestral','Trimestral','Bimestral','Mensual'].map(x => `<option>${x}</option>`).join('')}</select></label><label class="ce-l">Cantidad de pagos<input id="end-cuotas" type="number" min="1" class="o-sel" value="1"></label><label class="ce-l">Forma de pago<input id="end-form" class="o-sel"></label><label class="ce-l">Conducto<input id="end-conduct" class="o-sel"></label></div>`;
    if (type === 'datos_riesgo') return '<div class="cgrid"><label class="ce-l">Dirección del riesgo<input id="end-dir" class="o-sel"></label><label class="ce-l">Contacto del riesgo<input id="end-contact" class="o-sel"></label><label class="ce-l">Observaciones<input id="end-obs" class="o-sel"></label></div>';
    return '<div class="cfg-note">Este tipo se gestionará en Ops y no se aplicará automáticamente hasta que el tenant tenga reglas configuradas.</div>';
  }
  function openEndorsementRequest(policyId) {
    const policy = S().get('polizas', policyId); if (!policy) return toast('Póliza no encontrada.');
    if (!A.canView('polizas', policy, 'cliente360')) return toast('Póliza fuera de tu alcance.');
    const types = E.typeDefs();
    const body = `<div class="cfg-note" style="margin-bottom:12px">La solicitud se crea en Ops. No cambia la póliza hasta recibir aprobación y documento de la aseguradora.</div><label class="ce-l">Tipo de endoso<select id="end-type" class="o-sel">${types.map(t => `<option value="${esc(t.id)}">${esc(t.label)}</option>`).join('')}</select></label><div id="end-dynamic" style="margin-top:12px"></div><label class="ce-l" style="margin-top:12px">Motivo / detalle<textarea id="end-note" class="o-sel" style="min-height:70px"></textarea></label><label class="ce-l" style="margin-top:10px">Documento inicial / solicitud<input id="end-doc" class="o-sel" placeholder="documentRef opcional en esta etapa"></label>`;
    const b = modal('endorsement-request-v1201','Solicitar endoso · ' + (policy.numero || ''),body,'<button class="btn primary" data-create>Crear gestión</button>',720);
    const type = b.querySelector('#end-type'), dynamic = b.querySelector('#end-dynamic');
    const paint = () => { dynamic.innerHTML = endFields(type.value, policy); };
    type.onchange = paint; paint();
    b.querySelector('[data-create]').onclick = () => {
      const result = E.createRequest(policy.id, type.value, endorsementProposalFromForm(b, type.value), { documentRef: b.querySelector('#end-doc').value.trim(), nota: b.querySelector('#end-note').value.trim(), motivo: 'Solicitud de endoso desde Cliente 360' });
      if (!result.ok) return toast('No se creó: ' + (result.errors || []).join(', '));
      b.remove(); toast(result.reused ? 'Ya existe una gestión activa de este tipo.' : 'Endoso creado en Ops.');
      location.hash = '#/ops'; window.__orbitOpenGestion = result.request.id;
    };
  }

  function openApplyEndorsement(request) {
    const body = `<div class="cfg-note" style="margin-bottom:12px">Aplica únicamente con aprobación real. El documento y la referencia quedan vinculados a la gestión y a la auditoría.</div><div class="cgrid"><label class="ce-l">Referencia de aseguradora *<input id="enda-ref" class="o-sel"></label><label class="ce-l">Documento de endoso aprobado *<input id="enda-doc" class="o-sel" value="${esc(request.documentRef || '')}"></label><label class="ce-l">Fecha efectiva *<input id="enda-date" type="date" class="o-sel" value="${esc(request.fechaEfectiva || today())}"></label></div><label class="ce-l" style="margin-top:12px">Motivo de aplicación *<textarea id="enda-mot" class="o-sel" style="min-height:64px"></textarea></label>`;
    const b = modal('endorsement-apply-v1201','Aplicar endoso aprobado',body,'<button class="btn primary" data-apply>Aplicar cambio</button>',620);
    b.querySelector('[data-apply]').onclick = () => {
      const result = E.apply(request.id, { referenciaAseguradora: b.querySelector('#enda-ref').value.trim(), documentRef: b.querySelector('#enda-doc').value.trim(), fechaEfectiva: b.querySelector('#enda-date').value, motivo: b.querySelector('#enda-mot').value.trim() });
      if (!result.ok) return toast('No se aplicó: ' + (result.errors || []).join(', '));
      b.remove(); const base = document.getElementById('ciclo-modal'); if (base) base.remove(); toast('Endoso aplicado y auditado.'); Orbit.modules.cliente360.verPoliza(result.policy.id);
    };
  }

  function enhanceGestion(id) {
    const g = S().get('gestiones', id), back = document.getElementById('ciclo-modal');
    if (!g || !back || back.querySelector('[data-workflow-v1201]')) return;
    const main = back.querySelector('.ciclo-main'); if (!main) return;
    const panel = document.createElement('div'); panel.className = 'ciclo-sec'; panel.dataset.workflowV1201 = '1';
    if (g.workflowType === 'issuance_request') {
      const o = g.acceptedOffer || {}, policy = g.policyCreatedId && S().get('polizas', g.policyCreatedId);
      panel.innerHTML = `<div class="ciclo-sec-t">📝 Solicitud de emisión</div><div class="vp-tags"><span class="badge info">${esc(I.stageLabel(g.emissionStage))}</span>${g.requiereValidacion ? '<span class="badge warn">Requiere validación</span>' : '<span class="badge ok">Oferta referenciada</span>'}</div><div class="vp-grid" style="margin-top:10px"><div class="vp-row"><span class="vp-l">Prima aceptada</span><span class="vp-v">${esc(g.moneda)} ${Number(o.primaTotal || 0).toLocaleString('es-GT')}</span></div><div class="vp-row"><span class="vp-l">Fuente</span><span class="vp-v">${esc(o.sourceRef || o.sourceType || 'Pendiente')}</span></div><div class="vp-row"><span class="vp-l">Póliza origen</span><span class="vp-v">${esc((S().get('polizas', g.sourcePolicyId) || {}).numero || 'Nueva emisión')}</span></div><div class="vp-row"><span class="vp-l">Resultado</span><span class="vp-v">${policy ? esc(policy.numero) : 'Aún no crea póliza'}</span></div></div><div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:11px">${g.emissionStage === 'PROPUESTA_ACEPTADA' ? '<button class="btn ghost sm" data-stage="PENDIENTE_DOCUMENTOS">Pendiente documentos</button>' : ''}${g.requiereInspeccion && ['PROPUESTA_ACEPTADA','PENDIENTE_DOCUMENTOS'].includes(g.emissionStage) ? '<button class="btn ghost sm" data-stage="PENDIENTE_INSPECCION">Pasar a inspección</button>' : ''}${['PROPUESTA_ACEPTADA','PENDIENTE_DOCUMENTOS','PENDIENTE_INSPECCION'].includes(g.emissionStage) ? '<button class="btn ghost sm" data-stage="PENDIENTE_EMISION">Lista para emisión</button>' : ''}${!policy && !['CANCELADA','RECHAZADA'].includes(g.emissionStage) && I.canManage() ? '<button class="btn primary sm" data-issue>Registrar emisión real</button>' : ''}${policy ? '<button class="btn primary sm" data-policy>Ver póliza emitida</button>' : ''}</div>`;
      panel.querySelectorAll('[data-stage]').forEach(x => x.onclick = () => { const r = I.advanceRequest(g.id, x.dataset.stage, {}, { motivo: 'Avance operativo desde Ops' }); if (!r.ok) return toast((r.errors || []).join(', ')); Orbit.ciclo.openGestion(g.id); });
      const issue = panel.querySelector('[data-issue]'); if (issue) issue.onclick = () => openIssueModal(g);
      const policyBtn = panel.querySelector('[data-policy]'); if (policyBtn) policyBtn.onclick = () => { back.remove(); Orbit.modules.cliente360.verPoliza(g.policyCreatedId); };
    } else if (g.workflowType === 'endorsement_request') {
      const def = E.typeDef(g.endorsementType);
      panel.innerHTML = `<div class="ciclo-sec-t">📜 Endoso / modificación</div><div class="vp-tags"><span class="badge info">${esc(g.endorsementStage)}</span>${g.requiereValidacion ? '<span class="badge warn">Documento pendiente</span>' : ''}</div><div class="vp-grid" style="margin-top:10px"><div class="vp-row"><span class="vp-l">Tipo</span><span class="vp-v">${esc(g.endorsementLabel)}</span></div><div class="vp-row"><span class="vp-l">Referencia</span><span class="vp-v">${esc(g.referenciaAseguradora || 'Pendiente')}</span></div><div class="vp-row"><span class="vp-l">Aplicación automática</span><span class="vp-v">${def && def.apply ? 'Disponible con aprobación' : 'Requiere flujo configurado'}</span></div></div>${E.canManage() && g.endorsementStage !== 'APLICADO' ? '<div style="margin-top:11px"><button class="btn primary sm" data-end-apply>Aplicar endoso aprobado</button></div>' : ''}`;
      const apply = panel.querySelector('[data-end-apply]'); if (apply) apply.onclick = () => openApplyEndorsement(g);
    } else return;
    main.insertBefore(panel, main.firstChild);
  }

  function installOpsEnhancement() {
    if (!Orbit.ciclo || Orbit.ciclo.__workflowV1201) return;
    const originalOpen = Orbit.ciclo.openGestion && Orbit.ciclo.openGestion.bind(Orbit.ciclo);
    if (originalOpen) Orbit.ciclo.openGestion = function (id) { const out = originalOpen(id); setTimeout(() => enhanceGestion(id), 0); return out; };
    const originalWire = Orbit.ciclo.wireCards && Orbit.ciclo.wireCards.bind(Orbit.ciclo);
    if (originalWire) Orbit.ciclo.wireCards = function (host) { const out = originalWire(host); host.querySelectorAll('[data-ges]').forEach(el => el.addEventListener('click', () => setTimeout(() => enhanceGestion(el.dataset.ges), 0))); return out; };
    Orbit.ciclo.__workflowV1201 = { originalOpen, originalWire };
  }

  function installClientActions() {
    const mod = Orbit.modules.cliente360; if (!mod || mod.__workflowsV1201) return;
    const originalRenew = mod.renovar && mod.renovar.bind(mod);
    const originalEndorse = mod.endoso && mod.endoso.bind(mod);
    mod.renovar = function (policyId) {
      const p = S().get('polizas', policyId); if (!p || !A.canView('polizas', p, 'renovaciones')) return toast('Póliza fuera de tu alcance.');
      if (Orbit.modules.renovaciones && Orbit.modules.renovaciones.solicitarPropuestas) return Orbit.modules.renovaciones.solicitarPropuestas(policyId);
      return toast('El flujo de renovación no está disponible.');
    };
    mod.endoso = function (policyId) { return openEndorsementRequest(policyId); };
    mod.__workflowsV1201 = { originalRenew, originalEndorse };
  }

  installCotizadorContext();
  installComparativo();
  installOpsEnhancement();
  installClientActions();
  document.addEventListener('orbit:ciclo', () => { if (window.__orbitOpenGestion) { const id = window.__orbitOpenGestion; window.__orbitOpenGestion = ''; setTimeout(() => Orbit.ciclo.openGestion(id), 60); } });
})();
