/* ============================================================
   Orbit 360 · Comparativo v1.203 — flujo operativo canónico
   ------------------------------------------------------------
   - carga cotizaciones persistidas desde Cotizador;
   - compara únicamente propuestas validadas y consistentes;
   - recomendación explicable/replanteable;
   - comunicación preparada, no envío confirmado;
   - propuesta aceptada crea solicitud de emisión en Ops, no póliza.
   El modo independiente existente se conserva para evolución v110.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
(function () {
  const mod = Orbit.modules.comparativo;
  const Q = Orbit.quoteContracts;
  const U = Orbit.ui;
  const S = () => Orbit.store;
  if (!mod || !Q || !mod.render || mod.__operationalV1203) return;

  const state = { host:null, comparisonId:'', transferId:'' };
  function esc(v) { return U && U.esc ? U.esc(String(v == null ? '' : v)) : String(v || ''); }
  function clean(v) { return String(v == null ? '' : v).trim(); }
  function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
  function money(v, cur) { return U && U.money ? U.money(v, cur) : cur + ' ' + num(v).toLocaleString('es-GT'); }
  function query() { const hash = String(location.hash || ''); return new URLSearchParams(hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : ''); }
  function quote(id) { return id ? S().get('cotizaciones', id) : null; }
  function comparison(id) { return id ? S().get('comparativos', id) : null; }
  function client(id) { return id ? S().get('clientes', id) : null; }
  function insurer(id) { return id ? S().get('aseguradoras', id) : null; }
  function valid(q) { return !!q && Q.validateQuote(q, { requireValidated:true }).ok; }
  function current() { return comparison(state.comparisonId); }
  function currentQuotes() { const cmp = current(); return cmp ? (cmp.cotizacionIds || []).map(quote).filter(Boolean) : []; }
  function toast(v) { try { U.toast(v); } catch (e) {} }
  function colorFor(q) { const a = insurer(q.aseguradoraId); return a && a.color || '#6b7280'; }
  function initials(name) { return clean(name).split(/\s+/).filter(Boolean).map(x => x[0]).slice(0,2).join('').toUpperCase() || '—'; }
  function logo(q) {
    const a = insurer(q.aseguradoraId);
    if (a && a.logo) return `<img src="${esc(a.logo)}" alt="${esc(q.aseguradoraNombreSnapshot)}" style="width:38px;height:38px;object-fit:contain;border:1px solid var(--line);border-radius:9px;background:#fff">`;
    return `<span style="width:38px;height:38px;border-radius:9px;display:inline-grid;place-items:center;background:${colorFor(q)};color:#fff;font-weight:800">${esc(initials(q.aseguradoraNombreSnapshot))}</span>`;
  }
  function sourceLabel(q) {
    if (q.cotizacionOrigen === 'automatica_tarifa') return 'Cálculo con configuración ' + esc(q.versionFuente || 'vigente');
    if (q.cotizacionOrigen === 'pdf_aseguradora') return 'Propuesta documental validada';
    return 'Propuesta manual validada contra fuente';
  }
  function commonValue(q, key) {
    const g = q.gastos || {}, t = q.impuestos || {};
    if (key === 'primaNeta') return money(q.primaNeta,q.moneda);
    if (key === 'gastos') return money(num(g.emision)+num(g.financiamiento)+num(g.otros),q.moneda);
    if (key === 'impuestos') return money(num(t.ivaMonto)+num(t.otros),q.moneda);
    if (key === 'primaTotal') return money(q.primaTotal,q.moneda);
    if (key === 'cuotas') return q.cuotas === 1 ? 'Contado' : q.cuotas + ' cuotas · ' + money(q.primaMensual,q.moneda);
    return '—';
  }
  function coverageMap(q) {
    const out = {};
    (q.coberturas || []).forEach(c => { const key = clean(c.nombre || c.codigo); if (key) out[key] = c.valor != null && c.valor !== '' ? c.valor : (c.incluido === false ? 'No incluido' : 'Incluido'); });
    (q.deducibles || []).forEach(d => { const key = 'Deducible · ' + clean(d.nombre || d.codigo || 'principal'); out[key] = d.valor || '—'; });
    return out;
  }
  function dynamicRows(quotes) {
    const labels = [];
    quotes.forEach(q => Object.keys(coverageMap(q)).forEach(k => { if (!labels.includes(k)) labels.push(k); }));
    return labels;
  }
  function factorLabel(k) { return ({ price:'precio', coverage:'cobertura', deductible:'deducible', liability:'responsabilidad civil' })[k] || k; }
  function explanation(rec, quotes) {
    if (!rec || !rec.ok) return '<div class="cfg-note">No existe recomendación porque aún no hay al menos una propuesta validada.</div>';
    const chosen = quotes.find(q => q.id === rec.quoteId);
    const factors = (rec.factores || []).filter(x => typeof x.valor === 'number').map(x => `${factorLabel(x.factor)} ${Math.round(x.valor * 100)}%`).join(' · ');
    return `<div class="card pad" style="border-left:3px solid var(--red)"><small>Recomendación consultiva · regla ${esc((current()||{}).versionReglas || 'v1.203')}</small><h3 style="margin:4px 0 6px">${esc(chosen && chosen.aseguradoraNombreSnapshot || 'Sin selección')}</h3><p style="margin:0 0 8px">${esc(rec.explicacion || '')}</p>${factors ? `<div class="muted" style="font-size:11.5px">Factores: ${esc(factors)}</div>` : ''}<div class="cfg-note" style="margin-top:10px">La sugerencia es explicable y replanteable; no reemplaza la revisión profesional ni las condiciones de la aseguradora.</div></div>`;
  }
  function loadFromQuery() {
    const params = query(), transferId = params.get('transfer'), comparisonId = params.get('comparativo');
    if (comparisonId && comparison(comparisonId)) { state.comparisonId = comparisonId; state.transferId = ''; return true; }
    if (!transferId) return false;
    const transfer = S().get('quoteTransfers', transferId); if (!transfer) return false;
    state.transferId = transferId;
    if (transfer.comparativoId && comparison(transfer.comparativoId)) { state.comparisonId = transfer.comparativoId; return true; }
    const quotes = (transfer.cotizacionIds || []).map(quote).filter(valid);
    const made = Q.createComparison({ cotizaciones:quotes, criterioRecomendacion:'equilibrio', estado:'generado' }, { persist:true, motivo:'Traslado canónico Cotizador → Comparativo' });
    if (!made.comparison) return false;
    state.comparisonId = made.comparison.id;
    S().update('quoteTransfers', transfer.id, { comparativoId:made.comparison.id });
    return true;
  }
  function renderCanonical(host) {
    state.host = host;
    const cmp = current(), quotes = currentQuotes();
    if (!cmp || quotes.length < 2) {
      host.innerHTML = `<div class="page"><div class="card pad"><h2>Comparativo no disponible</h2><p>El traslado no contiene al menos dos propuestas validadas y consistentes.</p><button class="btn primary" onclick="location.hash='#/cotizador'">Volver al Cotizador</button></div></div>`;
      return;
    }
    const rec = Q.recommendation(quotes, cmp.criterioRecomendacion, cmp.recomendacion);
    const chosenId = rec.ok ? rec.quoteId : '';
    const cli = client(cmp.clienteId);
    const rows = dynamicRows(quotes);
    host.innerHTML = `<div class="page"><div class="banner"><div class="banner-icon">📋</div><div style="flex:1"><small>Comparativo operativo</small><h1>${esc(cmp.producto || cmp.ramo)} · ${esc(cli && cli.nombre || cmp.prospectoNombre || 'Prospecto')}</h1><p>${esc(cmp.pais)} · ${esc(cmp.moneda)} · ${quotes.length} propuestas validadas</p></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost" data-cmp-back>← Cotizador</button><button class="btn ghost" data-cmp-history>Historial</button><button class="btn ghost" data-cmp-print>Imprimir</button></div></div><div class="cfg-note" style="margin-bottom:14px"><b>Flujo cerrado:</b> este comparativo fue construido desde cotizaciones persistidas y validadas. Cambiar el criterio recalcula la sugerencia sin alterar los documentos originales.</div><div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px">${[['equilibrio','Equilibrio'],['precio','Menor precio'],['cobertura','Mayor cobertura'],['deducible','Menor deducible'],['rc','Mayor RC']].map(x => `<button class="btn ${cmp.criterioRecomendacion===x[0]?'primary':'ghost'} sm" data-cmp-criterion="${x[0]}">${x[1]}</button>`).join('')}</div><div class="cz-cards">${quotes.map(q => `<div class="cz-card ${q.id===chosenId?'win':''}">${q.id===chosenId?'<span class="cz-badge">Sugerida</span>':''}<div style="display:flex;gap:9px;align-items:center">${logo(q)}<div style="flex:1"><b style="font-family:var(--f-display)">${esc(q.aseguradoraNombreSnapshot)}</b><small class="muted" style="display:block">${sourceLabel(q)}</small></div></div><div class="cz-total">${money(q.primaTotal,q.moneda)}</div><div class="muted" style="font-size:11.5px">${q.cuotas===1?'Contado':q.cuotas+' cuotas de '+money(q.primaMensual,q.moneda)}</div><button class="btn ghost sm" style="width:100%;margin-top:9px" data-cmp-manual="${esc(q.id)}">Seleccionar con justificación</button>${q.id===chosenId?`<button class="btn primary sm" style="width:100%;margin-top:6px" data-cmp-accept="${esc(q.id)}">Cliente acepta esta propuesta</button>`:''}</div>`).join('')}</div><div class="card" style="overflow:auto;margin:16px 0"><table class="tbl"><thead><tr><th>Concepto</th>${quotes.map(q => `<th class="num">${esc(q.aseguradoraNombreSnapshot)}</th>`).join('')}</tr></thead><tbody>${[['primaTotal','Prima total'],['primaNeta','Prima neta'],['gastos','Gastos'],['impuestos','Impuestos'],['cuotas','Forma de pago']].map(row => `<tr><td><b>${row[1]}</b></td>${quotes.map(q => `<td class="num">${commonValue(q,row[0])}</td>`).join('')}</tr>`).join('')}${rows.length?`<tr><td colspan="${quotes.length+1}" style="background:var(--surface-2);font-weight:700">Coberturas y deducibles</td></tr>${rows.map(label => `<tr><td>${esc(label)}</td>${quotes.map(q => { const v=coverageMap(q)[label]; return `<td class="num">${typeof v==='number'?money(v,q.moneda):esc(v||'—')}</td>`; }).join('')}</tr>`).join('')}`:''}</tbody></table></div>${explanation(rec,quotes)}<div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:14px"><button class="btn ghost" data-cmp-prepare ${cmp.clienteId?'':'disabled'}>Preparar para cliente</button>${chosenId?`<button class="btn primary" data-cmp-accept="${esc(chosenId)}">Registrar aceptación y crear solicitud de emisión</button>`:''}</div></div>`;
    bindCanonical(host);
  }
  function recalc(criterion, manualId, reason) {
    const cmp = current(), quotes = currentQuotes(); if (!cmp) return;
    const made = Q.createComparison({ id:cmp.id, cotizaciones:quotes, criterioRecomendacion:criterion, seleccionManualId:manualId || '', estado:cmp.estado || 'generado', fechaGeneracion:cmp.fechaGeneracion }, { persist:true, motivo:reason || 'Replantear criterio de recomendación' });
    if (made.comparison && criterion === 'manual') {
      S().update('comparativos', made.comparison.id, { seleccionManualReason:reason, recomendacion:manualId, actualizadoAt:new Date().toISOString() });
      if (Orbit.access && Orbit.access.audit) Orbit.access.audit('seleccion_manual_comparativo','comparativos',made.comparison.id,cmp,S().get('comparativos',made.comparison.id),reason,{ quoteId:manualId });
    }
    renderCanonical(state.host);
  }
  async function manualSelect(quoteId) {
    const reason = clean(await U.prompt('Justificación de la selección manual:', { title:'Selección consultiva' }));
    if (!reason) return;
    recalc('manual', quoteId, reason);
  }
  function prepare() {
    const cmp = current(); if (!cmp || !cmp.clienteId) return toast('Asocia el comparativo a un cliente existente.');
    const prepared = Q.prepareCommunication(cmp.id, 'auto'); if (!prepared.ok) return toast('No se pudo preparar la comunicación.');
    Orbit.notify.pedir(cmp.clienteId, { tipo:'Comparativo preparado', icon:'⚖️', asunto:'Comparativo de ' + (cmp.producto || cmp.ramo), mensaje:prepared.message, adjunto:'Comparativo-' + (cmp.producto || cmp.ramo) + '.pdf' });
    toast('Comunicación preparada. La entrega debe confirmarse en el proveedor.');
  }
  async function accept(quoteId) {
    const cmp = current(), q = quote(quoteId); if (!cmp || !valid(q)) return toast('La propuesta seleccionada no está validada.');
    if (!cmp.clienteId || !client(cmp.clienteId)) return toast('Convierte el prospecto en cliente antes de solicitar emisión.');
    const phrase = clean(await U.prompt('Escribe exactamente: CLIENTE ACEPTA', { title:'Confirmar propuesta aceptada' }));
    if (phrase !== 'CLIENTE ACEPTA') return toast('Confirmación cancelada.');
    const reason = clean(await U.prompt('Registra cómo y cuándo confirmó el cliente:', { title:'Evidencia de aceptación' }));
    if (!reason) return;
    const g = q.gastos || {}, t = q.impuestos || {};
    const result = Orbit.issuance && Orbit.issuance.createRequest ? Orbit.issuance.createRequest({
      clienteId:cmp.clienteId, asesorId:q.asesorId, aseguradoraId:q.aseguradoraId,
      pais:q.pais, moneda:q.moneda, ramo:q.ramo, producto:q.producto,
      acceptedConfirmed:true, nota:reason, origen:'Comparativo v1.203',
      acceptedOffer:{ quoteId:q.id, aseguradoraId:q.aseguradoraId, ramo:q.ramo, producto:q.producto, pais:q.pais, moneda:q.moneda, primaNeta:q.primaNeta, gastosEmision:num(g.emision), gastosFinan:num(g.financiamiento), otros:num(g.otros), ivaMonto:num(t.ivaMonto)+num(t.otros), primaTotal:q.primaTotal, cuotas:q.cuotas, sourceRef:q.sourceRef || q.fuenteDocumentoId || q.configuracionTarifaId, documentRef:q.fuenteDocumentoId }
    }, { motivo:reason }) : { ok:false, errors:['flujo_emision_no_disponible'] };
    if (!result.ok) return toast('No se creó la solicitud: ' + (result.errors || []).join(', '));
    S().update('comparativos', cmp.id, { estado:'ganado', recomendacion:q.id, aceptadaQuoteId:q.id, aceptadaAt:new Date().toISOString(), aceptacionEvidencia:reason, gestionEmisionId:result.request.id });
    S().update('cotizaciones', q.id, { estadoComercial:'ganado', aceptadaAt:new Date().toISOString(), comparativoId:cmp.id });
    toast('Solicitud de emisión creada en Ops. Aún no existe una póliza emitida.');
    location.hash = '#/ops';
  }
  function printComparison() {
    const cmp = current(), quotes = currentQuotes(), rec = Q.recommendation(quotes, cmp.criterioRecomendacion, cmp.recomendacion); if (!cmp || !quotes.length) return;
    const chosen = rec.ok && quotes.find(q => q.id === rec.quoteId), tenant = Orbit.tenant && Orbit.tenant.nombre || 'Orbit 360';
    const w = window.open('', '_blank'); if (!w) return;
    w.document.write(`<html><head><title>Comparativo ${esc(cmp.producto||cmp.ramo)}</title><style>@page{size:A4 landscape;margin:12mm}body{font-family:Arial,sans-serif;color:#1E2227}h1{color:#C5162E}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #ddd;padding:7px}th{background:#1E2227;color:#fff}.n{text-align:right}.rec{border-left:3px solid #C5162E;padding:10px 14px;margin-top:14px;background:#f8f8f8}.foot{font-size:10px;color:#777;margin-top:16px}</style></head><body><h1>Comparativo de seguros · ${esc(cmp.producto||cmp.ramo)}</h1><p>${esc((client(cmp.clienteId)||{}).nombre||cmp.prospectoNombre||'Prospecto')} · ${esc(cmp.pais)} / ${esc(cmp.moneda)}</p><table><thead><tr><th>Concepto</th>${quotes.map(q=>`<th class="n">${esc(q.aseguradoraNombreSnapshot)}</th>`).join('')}</tr></thead><tbody>${[['primaTotal','Prima total'],['primaNeta','Prima neta'],['gastos','Gastos'],['impuestos','Impuestos'],['cuotas','Forma de pago']].map(row=>`<tr><td><b>${row[1]}</b></td>${quotes.map(q=>`<td class="n">${commonValue(q,row[0])}</td>`).join('')}</tr>`).join('')}</tbody></table>${chosen?`<div class="rec"><b>Sugerencia consultiva:</b> ${esc(chosen.aseguradoraNombreSnapshot)}. ${esc(rec.explicacion)}</div>`:''}<p class="foot">Documento informativo de ${esc(tenant)}. Las propuestas están sujetas a suscripción, vigencia y condiciones de la aseguradora.</p></body></html>`);
    w.document.close(); setTimeout(()=>w.print(),300);
  }
  function history() {
    const rows = (S().all('comparativos')||[]).slice().sort((a,b)=>String(b.fechaGeneracion||'').localeCompare(String(a.fechaGeneracion||'')));
    let back=document.getElementById('cmp-history-v1203'); if(back)back.remove(); back=document.createElement('div'); back.id='cmp-history-v1203'; back.className='drawer-back open'; back.style.cssText='display:grid;place-items:center;z-index:250';
    back.innerHTML=`<div class="card" style="width:min(760px,96vw);max-height:90vh;overflow:auto;padding:0"><div style="padding:16px 20px;background:linear-gradient(120deg,var(--graph),#10141a);display:flex;justify-content:space-between"><b style="color:#fff">Historial operativo de comparativos</b><button class="imp-x" data-close style="color:#fff">✕</button></div><div style="padding:15px 20px">${rows.length?rows.map(c=>`<button class="pt-row pt-click" style="width:100%;text-align:left" data-open-cmp="${esc(c.id)}"><span class="pt-row-ic">📋</span><div style="flex:1"><b>${esc((client(c.clienteId)||{}).nombre||c.prospectoNombre||'Prospecto')} · ${esc(c.producto||c.ramo)}</b><div class="muted" style="font-size:11.5px">${(c.cotizacionIds||[]).length} propuestas · ${esc(c.estado||'borrador')} · ${esc((c.fechaGeneracion||'').slice(0,10))}</div></div>›</button>`).join(''):'<div class="empty">Aún no hay comparativos persistidos.</div>'}</div></div>`;
    document.body.appendChild(back); const close=()=>back.remove(); back.querySelectorAll('[data-close]').forEach(x=>x.onclick=close); back.querySelectorAll('[data-open-cmp]').forEach(x=>x.onclick=()=>{close();location.hash='#/comparativo?comparativo='+encodeURIComponent(x.dataset.openCmp);});
  }
  function bindCanonical(host) {
    host.querySelector('[data-cmp-back]').onclick=()=>location.hash='#/cotizador';
    host.querySelector('[data-cmp-history]').onclick=history;
    host.querySelector('[data-cmp-print]').onclick=printComparison;
    host.querySelectorAll('[data-cmp-criterion]').forEach(x=>x.onclick=()=>recalc(x.dataset.cmpCriterion));
    host.querySelectorAll('[data-cmp-manual]').forEach(x=>x.onclick=()=>manualSelect(x.dataset.cmpManual));
    host.querySelectorAll('[data-cmp-accept]').forEach(x=>x.onclick=()=>accept(x.dataset.cmpAccept));
    const prep=host.querySelector('[data-cmp-prepare]'); if(prep)prep.onclick=prepare;
  }
  function enhanceIndependent(host) {
    if (host.querySelector('[data-cmp-independent-v1203]')) return;
    const page=host.querySelector('.page'), initial=host.querySelector('.cfg-note'); if(!page)return;
    const note=document.createElement('div'); note.dataset.cmpIndependentV1203='1'; note.className='cfg-note'; note.style.marginBottom='14px'; note.innerHTML='<b>Modo independiente:</b> cada PDF o propuesta debe conservar su documento original, revisión humana y aseguradora del directorio. Las extracciones no validadas no deben presentarse como recomendación definitiva.';
    if(initial&&initial.parentNode===page)page.insertBefore(note,initial.nextSibling);else page.insertBefore(note,page.firstChild.nextSibling);
  }

  const original=mod.render.bind(mod);
  mod.render=function(host){
    state.host=host; state.comparisonId=''; state.transferId='';
    if(loadFromQuery()){renderCanonical(host);return;}
    const out=original(host); setTimeout(()=>enhanceIndependent(host),0); return out;
  };
  mod.__operationalV1203={original,state,renderCanonical,recalc,accept,prepare,history};
})();
