/* ============================================================
   Orbit 360 · Cotizador v1.203 — fuentes validadas
   Conserva el formulario existente y sustituye el cálculo/traslado:
   - automático únicamente con fuente + tarifa validado_habilitado;
   - manual/PDF como borrador hasta confirmación humana;
   - cotizaciones e historial mediante Orbit.store;
   - traslado al Comparativo por IDs canónicos persistidos.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
(function () {
  const mod = Orbit.modules.cotizador;
  const Q = Orbit.quoteContracts;
  const U = Orbit.ui;
  const S = () => Orbit.store;
  if (!mod || !Q || !mod.render || mod.__sourceGateV1203) return;

  const state = { host: null, quoteIds: [], observer: null, enhancing: false };
  function esc(v) { return U && U.esc ? U.esc(String(v == null ? '' : v)) : String(v || ''); }
  function clean(v) { return String(v == null ? '' : v).trim(); }
  function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
  function clone(v) { try { return JSON.parse(JSON.stringify(v)); } catch (e) { return Object.assign({}, v || {}); } }
  function toast(v) { try { U.toast(v); } catch (e) {} }
  function money(v, cur) { return U && U.money ? U.money(v, cur) : cur + ' ' + num(v).toLocaleString('es-GT'); }
  function currency(country) { return country === 'CO' ? 'COP' : 'GTQ'; }
  function read(host, selector) { const el = host && host.querySelector(selector); return el ? clean(el.value) : ''; }
  function insurer(id) { return id ? S().get('aseguradoras', id) : null; }
  function client(id) { return id ? S().get('clientes', id) : null; }
  function quote(id) { return id ? S().get('cotizaciones', id) : null; }
  function valid(q) { return !!q && Q.validateQuote(q, { requireValidated: true }).ok; }
  function selectedQuotes() {
    if (!state.host) return [];
    return Array.from(state.host.querySelectorAll('[data-v1203-qsel]:checked')).map(x => quote(x.dataset.v1203Qsel)).filter(valid);
  }

  function readContext(host) {
    const pais = read(host, '#cz-pais') || 'GT';
    const ramo = read(host, '#cz-ramo') || 'Auto';
    const producto = read(host, '#cz-sub') || ramo;
    const clienteId = read(host, '#cz-cliid');
    const cli = client(clienteId);
    const context = {
      pais, moneda: currency(pais), ramo, producto,
      plan: read(host, '#cz-plan') || read(host, '#cz-gm-hab'),
      familiaProducto: read(host, '#cz-familia'), subtipoProducto: read(host, '#cz-subtipo'),
      segmento: read(host, '#cz-segmento'), tipoRiesgo: read(host, '#cz-riesgo'),
      tipoVehiculo: ramo === 'Auto' ? (read(host, '#cz-sub') || read(host, '#cz-tipoveh')) : '',
      usoVehiculo: read(host, '#cz-uso'),
      clienteId, prospectoNombre: cli ? cli.nombre : read(host, '#cz-cliente'),
      asesorId: read(host, '#cz-ase') || (cli && cli.asesorId) || '',
      cuotas: Math.max(1, num(read(host, '#cz-fracc') || 1)
    };
    const risk = {
      valorAsegurado: num(read(host, '#cz-valor')),
      sumaAsegurada: num(read(host, '#cz-suma') || read(host, '#cz-dsuma') || read(host, '#cz-hval')),
      anio: num(read(host, '#cz-anio')), marca: read(host, '#cz-marca') || read(host, '#cz-marca-t'),
      linea: read(host, '#cz-linea') || read(host, '#cz-linea-t'), modelo: read(host, '#cz-modelo') || read(host, '#cz-modelo-t'),
      placa: read(host, '#cz-placa'), edad: num(read(host, '#cz-edad')), detalle: read(host, '#cz-bienes') || read(host, '#cz-giro') || read(host, '#cz-gm-ded')
    };
    host.querySelectorAll('[id^="cz-"]').forEach(el => {
      const key = el.id.replace(/^cz-/, '').replace(/-/g, '_');
      if (!(key in risk) && !['pais','ramo','sub','cliid','cliente','ase','fracc','valor'].includes(key)) risk[key] = el.type === 'number' ? num(el.value) : clean(el.value);
    });
    context.datosRiesgo = risk;
    return context;
  }
  function availabilityLabel(check) {
    const errors = [].concat(check && check.errors || []);
    if (!errors.length) return 'Fuente habilitada';
    if (errors.includes('fuentes_validadas_insuficientes')) return 'Fuentes incompletas';
    if (errors.includes('configuracion_tarifa_validada_no_disponible')) return 'Tarifa pendiente';
    if (errors.includes('aseguradora_no_vinculada')) return 'No vinculada';
    return 'Requiere revisión';
  }
  function addBanner(host) {
    if (host.querySelector('[data-cot-gate-v1203]')) return;
    const grid = host.querySelector('.cz-grid'); if (!grid || !grid.parentNode) return;
    const note = document.createElement('div'); note.dataset.cotGateV1203 = '1'; note.className = 'cfg-note'; note.style.marginBottom = '14px';
    note.innerHTML = '<b>Resultados verificables:</b> el cálculo automático solo se habilita cuando la aseguradora tiene una fuente vigente, una configuración validada y dimensiones compatibles. Las propuestas manuales o documentales requieren revisión antes de comparar o emitir.';
    grid.parentNode.insertBefore(note, grid);
  }
  function addActions(host) {
    const add = host.querySelector('#cz-add'); if (!add || host.querySelector('[data-cot-actions-v1203]')) return;
    const wrap = document.createElement('span'); wrap.dataset.cotActionsV1203 = '1'; wrap.style.cssText = 'display:inline-flex;gap:7px;flex-wrap:wrap;margin:9px 0 0 7px';
    wrap.innerHTML = '<button class="btn ghost sm" data-cot-pdf-v1203>📄 Analizar propuesta</button><button class="btn ghost sm" data-cot-history-v1203>🕘 Historial operativo</button>';
    add.insertAdjacentElement('afterend', wrap);
  }
  function enhanceRows(host) {
    const context = readContext(host);
    host.querySelectorAll('.asg-row[data-r]').forEach(row => {
      const insurerSelect = row.querySelector('[data-aid]'), mode = row.querySelector('[data-amodo]');
      if (!insurerSelect || !mode) return;
      const check = Q.automaticAvailability(insurerSelect.value, context);
      const rateOption = Array.from(mode.options).find(x => x.value === 'tasas');
      if (rateOption) { rateOption.disabled = !check.ok; rateOption.textContent = check.ok ? '📊 Fuente habilitada' : '🔒 Automático no disponible'; }
      let badge = row.querySelector('[data-source-state-v1203]');
      if (!badge) { badge = document.createElement('span'); badge.dataset.sourceStateV1203 = '1'; badge.style.cssText = 'font-size:9.5px;min-width:92px;text-align:center'; row.insertBefore(badge, row.querySelector('[data-adel]')); }
      badge.className = 'badge ' + (check.ok ? 'ok' : 'warn'); badge.textContent = availabilityLabel(check); badge.title = [].concat(check.errors || []).join(', ');
      const premium = row.querySelector('[data-aprima]'); if (premium) premium.placeholder = 'Prima total oficial';
      if (!check.ok && mode.value === 'tasas' && !mode.dataset.v1203Forced) {
        mode.dataset.v1203Forced = '1'; mode.value = 'manual'; mode.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }
  function enhance(host) {
    if (!host || state.enhancing || !host.querySelector('#cz-gen')) return;
    state.enhancing = true;
    try { addBanner(host); addActions(host); enhanceRows(host); } finally { state.enhancing = false; }
  }
  function observe(host) {
    if (!host || host.__cotV1203Observer || !window.MutationObserver) return;
    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) return; queued = true;
      setTimeout(() => { queued = false; enhance(host); }, 0);
    });
    observer.observe(host, { childList: true, subtree: true });
    host.__cotV1203Observer = observer; state.observer = observer;
  }

  function baseQuote(context, asg, origin) {
    return {
      cotizacionOrigen: origin, aseguradoraId: asg.id, aseguradoraNombreSnapshot: asg.nombre,
      pais: context.pais, moneda: context.moneda, ramo: context.ramo, producto: context.producto, plan: context.plan,
      familiaProducto: context.familiaProducto, subtipoProducto: context.subtipoProducto, segmento: context.segmento,
      tipoRiesgo: context.tipoRiesgo, tipoVehiculo: context.tipoVehiculo, usoVehiculo: context.usoVehiculo,
      clienteId: context.clienteId, prospectoNombre: context.prospectoNombre, asesorId: context.asesorId,
      datosRiesgo: clone(context.datosRiesgo), cuotas: context.cuotas, origenModulo: 'Cotizador'
    };
  }
  function run() {
    const host = state.host; if (!host) return;
    const context = readContext(host);
    if (!context.clienteId && !context.prospectoNombre) return toast('Selecciona un cliente o registra el nombre del prospecto.');
    const rows = Array.from(host.querySelectorAll('.asg-row[data-r]'));
    if (!rows.length) return toast('Agrega al menos una aseguradora.');
    state.quoteIds = [];
    rows.forEach(row => {
      const insurerId = read(row, '[data-aid]'), mode = read(row, '[data-amodo]') || 'manual', asg = insurer(insurerId);
      if (!asg) return;
      if (mode === 'tasas') {
        const calc = Q.calculateAutomatic(insurerId, context, context.datosRiesgo, { cuotas: context.cuotas });
        if (!calc.ok) return;
        const input = Object.assign(baseQuote(context, asg, 'automatica_tarifa'), {
          resultado: calc.result, configuracionTarifaId: calc.trace.configuracionTarifaId,
          fuenteDocumentoId: calc.trace.fuenteDocumentoId, versionFuente: calc.trace.versionFuente,
          estadoValidacion: 'validado', estadoComercial: 'generado', trazabilidad: calc.trace
        });
        const saved = Q.persistQuote(input, { motivo: 'Cálculo automático con fuente habilitada' });
        if (saved.ok) state.quoteIds.push(saved.quote.id);
      } else {
        const total = num(read(row, '[data-aprima]')); if (!(total > 0)) return;
        const taxPct = Orbit.primas && Orbit.primas.cfgPais ? num(Orbit.primas.cfgPais(context.pais).iva) : (context.pais === 'CO' ? 19 : 12);
        const net = total / (1 + taxPct / 100);
        const input = Object.assign(baseQuote(context, asg, 'manual_asistida'), {
          primaNeta: net, primaTotal: total, impuestos: { ivaPct: taxPct, ivaMonto: total - net },
          estadoValidacion: 'requiere_validacion', estadoComercial: 'borrador', alertasCalidad: ['fuente_documental_requerida','confirmacion_humana_requerida']
        });
        const saved = Q.persistQuote(input, { allowDraft: true, motivo: 'Propuesta manual pendiente de documento' });
        if (saved.ok) state.quoteIds.push(saved.quote.id);
      }
    });
    if (!state.quoteIds.length) return toast('No fue posible generar resultados. Revisa la fuente habilitada o la prima manual.');
    renderResults();
  }
  function sourceText(q) {
    if (q.cotizacionOrigen === 'automatica_tarifa') return 'Configuración ' + esc(q.versionFuente || '') + ' · fuente verificada';
    if (q.cotizacionOrigen === 'pdf_aseguradora') return 'Documento analizado · pendiente de resguardo/validación';
    return q.fuenteDocumentoId || q.sourceRef ? 'Fuente registrada · revisión humana' : 'Fuente pendiente';
  }
  function renderResults() {
    const host = state.host, out = host && host.querySelector('#cz-out'); if (!out) return;
    const quotes = state.quoteIds.map(quote).filter(Boolean);
    out.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px"><div><b style="font-family:var(--f-display);font-size:16px">Cotizaciones normalizadas</b><small class="muted" style="display:block">${quotes.filter(valid).length} validadas · ${quotes.filter(q => !valid(q)).length} pendientes</small></div><button class="btn primary sm" data-cot-compare-v1203 ${quotes.filter(valid).length >= 2 ? '' : 'disabled'}>Generar comparativo →</button></div><div class="cz-cards">${quotes.map(q => {
      const ok = valid(q), expenses = q.gastos || {}, taxes = q.impuestos || {};
      return `<div class="cz-card ${ok ? '' : 'pending'}"><div style="display:flex;align-items:flex-start;gap:8px"><input type="checkbox" data-v1203-qsel="${esc(q.id)}" ${ok ? 'checked' : 'disabled'}><div style="flex:1"><b style="font-family:var(--f-display)">${esc(q.aseguradoraNombreSnapshot)}</b><div style="margin-top:4px"><span class="badge ${ok ? 'ok' : 'warn'}">${ok ? 'Validada' : 'Requiere validación'}</span></div></div></div><div class="cz-total">${money(q.primaTotal,q.moneda)}</div><table class="vp-dtbl" style="margin-top:10px"><tr><td>Prima neta</td><td class="num">${money(q.primaNeta,q.moneda)}</td></tr><tr><td>Gastos</td><td class="num">${money(num(expenses.emision)+num(expenses.financiamiento)+num(expenses.otros),q.moneda)}</td></tr><tr><td>Impuestos</td><td class="num">${money(num(taxes.ivaMonto)+num(taxes.otros),q.moneda)}</td></tr><tr><td>Cuotas</td><td class="num">${q.cuotas}</td></tr></table><div class="muted" style="font-size:10.5px;margin-top:8px">${sourceText(q)}</div><div style="display:grid;gap:6px;margin-top:9px">${ok ? '' : `<button class="btn ghost sm" data-cot-validate-v1203="${esc(q.id)}">Revisar y validar fuente</button>`}<button class="btn ghost sm" data-cot-print-v1203="${esc(q.id)}">Imprimir cotización</button><button class="btn ghost sm" data-cot-send-v1203="${esc(q.id)}" ${ok && q.clienteId ? '' : 'disabled'}>Preparar para cliente</button></div></div>`;
    }).join('')}</div><div class="cfg-note" style="margin-top:13px">Solo las propuestas validadas pueden pasar al Comparativo. Preparar una comunicación no confirma que haya sido entregada.</div>`;
  }

  function validateModal(id) {
    const current = quote(id); if (!current) return;
    let back = document.getElementById('cot-validate-v1203'); if (back) back.remove();
    const g = current.gastos || {}, t = current.impuestos || {};
    back = document.createElement('div'); back.id = 'cot-validate-v1203'; back.className = 'drawer-back open'; back.style.cssText = 'display:grid;place-items:center;z-index:260';
    back.innerHTML = `<div class="card" style="width:min(720px,96vw);max-height:94vh;overflow:auto;padding:0"><div style="padding:16px 20px;background:linear-gradient(120deg,var(--graph),#10141a);display:flex;justify-content:space-between"><div><small style="color:rgba(255,255,255,.65)">Revisión humana</small><b style="display:block;color:#fff;font-family:var(--f-display)">${esc(current.aseguradoraNombreSnapshot)}</b></div><button class="imp-x" data-close style="color:#fff">✕</button></div><div style="padding:18px 20px"><div class="cfg-note" style="margin-bottom:12px">Registra la referencia del documento original y corrige la propuesta normalizada. El archivo original no se modifica.</div><div class="cgrid"><label class="ce-l">Referencia del documento *<input class="o-sel" data-source value="${esc(current.fuenteDocumentoId || current.sourceRef || '')}" placeholder="Documento / Drive / identificador"></label><label class="ce-l">Versión / fecha de propuesta *<input class="o-sel" data-version value="${esc(current.versionFuente || '')}" placeholder="Ej. 2026-07-11"></label><label class="ce-l">Prima neta *<input class="o-sel" type="number" data-net value="${num(current.primaNeta)}"></label><label class="ce-l">Gastos emisión<input class="o-sel" type="number" data-issue value="${num(g.emision)}"></label><label class="ce-l">Financiamiento<input class="o-sel" type="number" data-fin value="${num(g.financiamiento)}"></label><label class="ce-l">Otros gastos<input class="o-sel" type="number" data-other value="${num(g.otros)}"></label><label class="ce-l">IVA / impuestos<input class="o-sel" type="number" data-tax value="${num(t.ivaMonto)+num(t.otros)}"></label><label class="ce-l">Prima total *<input class="o-sel" type="number" data-total value="${num(current.primaTotal)}"></label></div><label class="ce-l" style="margin-top:12px">Motivo / evidencia de validación *<textarea class="o-sel" data-reason style="min-height:68px"></textarea></label><label class="ck" style="display:flex;gap:8px;align-items:flex-start;margin-top:12px"><input type="checkbox" data-confirm> Confirmo que comparé estos valores con el documento original.</label></div><div style="padding:13px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end"><button class="btn primary" data-save>Guardar validación</button><button class="btn ghost" data-close>Cancelar</button></div></div>`;
    document.body.appendChild(back); const close = () => back.remove(); back.querySelectorAll('[data-close]').forEach(x => x.onclick = close);
    back.querySelector('[data-save]').onclick = () => {
      const source = clean(back.querySelector('[data-source]').value), version = clean(back.querySelector('[data-version]').value), reason = clean(back.querySelector('[data-reason]').value), confirmed = back.querySelector('[data-confirm]').checked;
      if (!source || !version || !reason || !confirmed) return toast('Completa la fuente, versión, motivo y confirmación.');
      const before = clone(current), net = num(back.querySelector('[data-net]').value), issue = num(back.querySelector('[data-issue]').value), fin = num(back.querySelector('[data-fin]').value), other = num(back.querySelector('[data-other]').value), tax = num(back.querySelector('[data-tax]').value), total = num(back.querySelector('[data-total]').value);
      const corrected = Object.assign({}, current, { primaNeta:net, primaTotal:total, gastos:{ emision:issue, financiamiento:fin, otros:other }, impuestos:{ ivaPct:total ? tax / Math.max(1,total-tax) * 100 : 0, ivaMonto:tax, otros:0 }, fuenteDocumentoId:source, sourceRef:source, versionFuente:version, confirmacionHumana:true, estadoValidacion:'validado', estadoComercial:'generado', alertasCalidad:[], camposCorregidos:[].concat(current.camposCorregidos || [], [{ fecha:new Date().toISOString(), motivo:reason, anterior:{ primaNeta:before.primaNeta, primaTotal:before.primaTotal }, nuevo:{ primaNeta:net, primaTotal:total } }]) });
      const saved = Q.persistQuote(corrected, { motivo:reason });
      if (!saved.ok) return toast('No se guardó: ' + saved.errors.join(', '));
      close(); renderResults(); toast('Propuesta validada y lista para comparar.');
    };
  }
  function printQuote(id) {
    const q = quote(id); if (!q) return;
    const w = window.open('', '_blank'); if (!w) return;
    const tenant = Orbit.tenant && Orbit.tenant.nombre || 'Orbit 360', g = q.gastos || {}, t = q.impuestos || {};
    w.document.write(`<html><head><title>Cotización ${esc(q.aseguradoraNombreSnapshot)}</title><style>@page{size:A4 portrait;margin:14mm}body{font-family:Arial,sans-serif;color:#1E2227}h1{color:#C5162E}.r{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #eee}.tot{font-size:24px;font-weight:800;color:#C5162E;margin-top:12px}.note{font-size:11px;color:#666;margin-top:20px}</style></head><body><h1>Cotización · ${esc(q.aseguradoraNombreSnapshot)}</h1><p>${esc(q.producto || q.ramo)} · ${esc((client(q.clienteId)||{}).nombre || q.prospectoNombre || 'Prospecto')} · ${esc(q.pais)} / ${esc(q.moneda)}</p><div class="r"><span>Prima neta</span><b>${money(q.primaNeta,q.moneda)}</b></div><div class="r"><span>Gastos</span><b>${money(num(g.emision)+num(g.financiamiento)+num(g.otros),q.moneda)}</b></div><div class="r"><span>Impuestos</span><b>${money(num(t.ivaMonto)+num(t.otros),q.moneda)}</b></div><div class="tot">Prima total: ${money(q.primaTotal,q.moneda)}</div><p class="note">Fuente: ${sourceText(q)}. Documento informativo de ${esc(tenant)}. Sujeto a suscripción y condiciones de la aseguradora.</p></body></html>`);
    w.document.close(); setTimeout(() => w.print(), 300);
  }
  function prepare(id) {
    const q = quote(id); if (!valid(q)) return toast('Valida la propuesta antes de prepararla para el cliente.');
    if (!q.clienteId) return toast('Asocia la propuesta a un cliente existente.');
    const msg = 'Cotización de ' + (q.producto || q.ramo) + ' con ' + q.aseguradoraNombreSnapshot + ':\n\n• Prima total: ' + money(q.primaTotal,q.moneda) + '\n• Prima neta: ' + money(q.primaNeta,q.moneda) + '\n• Forma de pago: ' + q.cuotas + (q.cuotas === 1 ? ' pago' : ' pagos') + '\n\nPropuesta sujeta a suscripción y condiciones de la aseguradora.';
    Orbit.notify.pedir(q.clienteId, { tipo:'Cotización preparada', icon:'🧮', asunto:'Cotización de ' + (q.producto || q.ramo) + ' · ' + q.aseguradoraNombreSnapshot, mensaje:msg, adjunto:'Cotizacion-' + q.aseguradoraNombreSnapshot + '.pdf' });
    S().update('cotizaciones', q.id, { estadoComercial:'preparado', preparadoAt:new Date().toISOString() });
  }
  function transfer() {
    const quotes = selectedQuotes(); if (quotes.length < 2) return toast('Selecciona al menos dos cotizaciones validadas.');
    const result = Q.createComparison({ cotizaciones:quotes, criterioRecomendacion:'equilibrio', estado:'generado' }, { persist:true, motivo:'Comparativo derivado desde Cotizador' });
    if (!result.ok) return toast('No se generó: ' + result.errors.join(', '));
    const transferId = 'qtr_' + Date.now().toString(36);
    S().insert('quoteTransfers', { id:transferId, tenantId:quotes[0].tenantId, cotizacionIds:quotes.map(q => q.id), comparativoId:result.comparison.id, creadoAt:new Date().toISOString(), origen:'Cotizador' });
    location.hash = '#/comparativo?transfer=' + encodeURIComponent(transferId);
  }
  function history() {
    const rows = (S().all('cotizaciones') || []).slice().sort((a,b) => String((b.trazabilidad||{}).creadoAt||'').localeCompare(String((a.trazabilidad||{}).creadoAt||'')));
    let back = document.getElementById('cot-history-v1203'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'cot-history-v1203'; back.className = 'drawer-back open'; back.style.cssText = 'display:grid;place-items:center;z-index:250';
    back.innerHTML = `<div class="card" style="width:min(820px,96vw);max-height:92vh;overflow:auto;padding:0"><div style="padding:16px 20px;background:linear-gradient(120deg,var(--graph),#10141a);display:flex;justify-content:space-between"><div><small style="color:rgba(255,255,255,.65)">Seguimiento comercial</small><b style="display:block;color:#fff;font-family:var(--f-display)">Historial operativo de cotizaciones</b></div><button class="imp-x" data-close style="color:#fff">✕</button></div><div style="padding:16px 20px">${rows.length ? `<div style="overflow:auto"><table class="tbl"><thead><tr><th>Fecha</th><th>Cliente/prospecto</th><th>Aseguradora</th><th>Producto</th><th>Total</th><th>Validación</th><th>Estado</th></tr></thead><tbody>${rows.map(q => `<tr><td>${esc(((q.trazabilidad||{}).creadoAt||'').slice(0,10))}</td><td>${esc((client(q.clienteId)||{}).nombre || q.prospectoNombre || '—')}</td><td>${esc(q.aseguradoraNombreSnapshot)}</td><td>${esc(q.producto||q.ramo)}</td><td class="num">${money(q.primaTotal,q.moneda)}</td><td><span class="badge ${valid(q)?'ok':'warn'}">${valid(q)?'Validada':'Pendiente'}</span></td><td>${esc(q.estadoComercial||'borrador')}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Aún no hay cotizaciones normalizadas.</div>'}</div></div>`;
    document.body.appendChild(back); const close = () => back.remove(); back.querySelectorAll('[data-close]').forEach(x => x.onclick = close); back.onclick = e => { if (e.target === back) close(); };
  }
  async function analyzePdf() {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'application/pdf,image/*';
    input.onchange = async () => {
      const file = input.files && input.files[0]; if (!file) return;
      const context = readContext(state.host); let extracted = null;
      try { if (Orbit.ia && Orbit.ia.extraerPDF) extracted = await Orbit.ia.extraerPDF(file); } catch (e) {}
      const guessedName = clean(extracted && extracted.nombre) || file.name.replace(/\.(pdf|png|jpe?g)$/i,'').replace(/[_-]+/g,' ');
      const asg = (S().all('aseguradoras') || []).find(a => fold(a.nombre) === fold(guessedName) || fold(guessedName).includes(fold(a.nombre)));
      if (!asg) return toast('No se reconoció la aseguradora. Selecciónala en el Cotizador y registra la propuesta como manual.');
      const total = num(extracted && extracted.total), net = num(extracted && extracted.neta) || total / (1 + (context.pais === 'CO' ? .19 : .12));
      const saved = Q.persistQuote(Object.assign(baseQuote(context, asg, 'pdf_aseguradora'), { primaNeta:net, primaTotal:total, impuestos:{ ivaMonto:Math.max(0,total-net), ivaPct:context.pais==='CO'?19:12 }, fuenteDocumentoId:'', sourceRef:'', versionFuente:'', confianzaExtraccion:extracted && extracted.confianza, coberturas:extracted && extracted.cob, deducible:extracted && extracted.deducible, estadoValidacion:'requiere_validacion', estadoComercial:'borrador', alertasCalidad:['documento_original_pendiente_de_resguardo','confirmacion_humana_requerida'] }), { allowDraft:true, motivo:'Extracción documental pendiente de revisión' });
      if (saved.ok) { state.quoteIds.push(saved.quote.id); renderResults(); validateModal(saved.quote.id); }
    };
    input.click();
  }
  function fold(v) { return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim(); }
  function capture(host) {
    if (host.__cotV1203Capture) return; host.__cotV1203Capture = true;
    host.addEventListener('click', e => {
      const t = e.target.closest('button,[data-cot-validate-v1203],[data-cot-print-v1203],[data-cot-send-v1203]'); if (!t) return;
      if (t.id === 'cz-gen') { e.preventDefault(); e.stopImmediatePropagation(); run(); return; }
      if (t.id === 'cz-comp' || t.matches('[data-cot-compare-v1203]')) { e.preventDefault(); e.stopImmediatePropagation(); transfer(); return; }
      if (t.matches('[data-cot-pdf-v1203]')) { e.preventDefault(); analyzePdf(); return; }
      if (t.matches('[data-cot-history-v1203]')) { e.preventDefault(); history(); return; }
      if (t.dataset.cotValidateV1203) { e.preventDefault(); validateModal(t.dataset.cotValidateV1203); return; }
      if (t.dataset.cotPrintV1203) { e.preventDefault(); printQuote(t.dataset.cotPrintV1203); return; }
      if (t.dataset.cotSendV1203) { e.preventDefault(); prepare(t.dataset.cotSendV1203); }
    }, true);
  }

  const original = mod.render.bind(mod);
  mod.render = function (host) {
    state.host = host; state.quoteIds = [];
    const out = original(host);
    setTimeout(() => { enhance(host); capture(host); observe(host); }, 0);
    return out;
  };
  mod.__sourceGateV1203 = { original, state, readContext, run, renderResults, validateModal, transfer };
})();
