/* Orbit 360 · Guard/owner de detalle + read-model canónico Póliza/Vehículo · v1.199c · 2026-07-31. */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
(function () {
  'use strict';
  if (Orbit.__policyVehicleReadModelV1199c) return;
  Orbit.__policyVehicleReadModelV1199c = true;

  const U = Orbit.ui || {};
  const S = () => Orbit.store;
  const canEditVehicle = () => !!(Orbit.policyReceipts && Orbit.policyReceipts.canManagePolicies && Orbit.policyReceipts.canManagePolicies());
  const safe = v => String(v == null ? '' : v).trim();
  const esc = v => U.esc ? U.esc(safe(v)) : safe(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function numberOrNull(v) {
    if (v == null || safe(v) === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  const first = (...values) => { for (const v of values) if (v !== undefined && v !== null && safe(v) !== '') return v; return ''; };
  const finite = numberOrNull;
  const money = (v, cur) => {
    const n = numberOrNull(v);
    if (n == null) return 'Pendiente de completar';
    return U.money ? U.money(n, cur || '') : `${cur || ''} ${n.toLocaleString('es-GT')}`.trim();
  };
  function moneyDetail(v, cur) {
    const n = numberOrNull(v);
    if (n == null) return 'Pendiente de completar';
    const code = safe(cur || '');
    const symbol = code === 'GTQ' ? 'Q' : code === 'COP' ? '$' : code === 'USD' ? 'US$' : code === 'EUR' ? '€' : code;
    return `${symbol} ${n.toLocaleString('es-GT',{minimumFractionDigits:2,maximumFractionDigits:2})}`.trim();
  }
  const fmtDate = v => safe(v) ? (U.fmtDate ? U.fmtDate(v) : safe(v)) : 'Pendiente de completar';
  const shown = v => { const t=safe(v); return (!t || /^(undefined|null)$/i.test(t)) ? 'Pendiente de completar' : t; };
  const badge = status => U.estadoBadge ? U.estadoBadge(status || 'Requiere validación') : `<span class="badge neutral">${esc(status || 'Requiere validación')}</span>`;
  const activePolicy = p => p && (p.estado === 'Vigente' || p.estado === 'Por renovar');
  const renewabilityState = p => {
    if (!p || !Object.prototype.hasOwnProperty.call(p, 'renovable') || p.renovable == null || safe(p.renovable) === '') return 'UNKNOWN';
    const v = safe(p.renovable).toLowerCase();
    if (p.renovable === true || ['true','si','sí','renovable'].includes(v)) return 'YES';
    if (p.renovable === false || ['false','no','no renovable'].includes(v)) return 'NO';
    return 'UNKNOWN';
  };
  const renewabilityLabel = p => {
    const state = renewabilityState(p);
    return state === 'YES' ? 'Renovable' : state === 'NO' ? 'No renovable' : 'Renovabilidad pendiente de validar';
  };
  const renewabilityHtml = p => {
    const state = renewabilityState(p);
    if (state === 'YES') return '<span data-policy-renewability="1">Renovable</span>';
    if (state === 'NO') return '<span data-policy-renewability="1">No renovable</span>';
    // Split the legacy phrase into adjacent text nodes so the unrelated portal copy bridge cannot
    // rewrite this policy-domain semantic while preserving the exact visible sentence.
    return '<span data-policy-renewability="1">Renovabilidad pendiente de <span>validar</span></span>';
  };

  function policyVisual(p) {
    if (!p || typeof p !== 'object') return p;
    const out = Object.assign({}, p);
    const total = numberOrNull(first(p.primaTotal, p.prima, p.totalPrima));
    const net = numberOrNull(first(p.primaNeta, p.neta, p.prima_neta));
    out.primaNeta = net;
    out.primaTotal = total;
    out.prima = total;
    out.formaPago = first(p.formaPago, p.metodoPago);
    out.forma = first(p.forma, p.frecuencia);
    out.conducto = first(p.conducto, p.conductoPago);
    out.gastosEmision = numberOrNull(first(p.gastosEmision, p.gastosExpedicion, p.gastos, p.emision));
    out.gastosFinan = numberOrNull(first(p.gastosFinan, p.gastosFinancieros, p.gastosFinanciamiento, p.recargoFinanciero));
    out.otros = numberOrNull(first(p.otros, p.asistencias, p.otrosGastos));
    out.descuento = numberOrNull(first(p.descuento, p.montoDescuento));
    out.baseGravable = numberOrNull(first(p.baseGravable, p.baseIVA, p.baseImponible));
    out.ivaPct = numberOrNull(first(p.ivaPct, p.impuestoPct, p.tasaIVA));
    out.ivaMonto = numberOrNull(first(p.ivaMonto, p.iva, p.impuestos, p.impuestosIVA));
    out.sumaAsegurada = numberOrNull(first(p.sumaAsegurada, p.valorAsegurado, p.suma));
    out.comAseguradoraPct = numberOrNull(first(p.comAseguradoraPct, p.comisionAseguradoraPct));
    out.comVendedorPct = numberOrNull(first(p.comVendedorPct, p.comisionVendedorPct));
    out.tipoPoliza = first(p.tipoPoliza, p.tipo, 'Individual');
    out.concepto = first(p.concepto, p.descripcionRiesgo, p.descripcion);
    return out;
  }

  function vehicleVisual(v) {
    if (!v || typeof v !== 'object') return v;
    const normalized = Orbit.policyReceipts && typeof Orbit.policyReceipts.normalizeVehicle === 'function' ? Orbit.policyReceipts.normalizeVehicle(v) : Object.assign({}, v);
    normalized.sumaAsegurada = numberOrNull(first(normalized.sumaAsegurada, v.valorAsegurado));
    return normalized;
  }
  function reconciliationTolerance() {
    try {
      const cfg = Orbit.domainConfig && typeof Orbit.domainConfig.peek === 'function' ? Orbit.domainConfig.peek('reconciliation') : {};
      const n = Number(cfg && cfg.amountTolerance);
      return Number.isFinite(n) && n >= 0 ? n : 0.02;
    } catch (e) { return 0.02; }
  }

  let indexes = null;
  let summaries = new Map();
  function group(rows, key) {
    const m = new Map();
    (rows || []).forEach(row => {
      const k = row && row[key];
      if (!k) return;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(row);
    });
    return m;
  }
  function rebuildIndexes() {
    if (!S() || typeof S().all !== 'function') return null;
    const clients = S().all('clientes') || [];
    const policies = (S().all('polizas') || []).map(policyVisual);
    const vehicles = (S().all('vehiculos') || []).map(vehicleVisual);
    indexes = {
      clients, clientsById: new Map(clients.filter(row => row && row.id).map(row => [row.id, row])),
      policies, vehicles,
      policiesByClient: group(policies, 'clienteId'),
      vehiclesByClient: group(vehicles, 'clienteId'),
      vehiclesByPolicy: group(vehicles, 'polizaId'),
      cobrosByClient: group(S().all('cobros') || [], 'clienteId'),
      comisionesByClient: group(S().all('comisiones') || [], 'clienteId')
    };
    summaries = new Map();
    return indexes;
  }
  function idx() { return indexes || rebuildIndexes() || {}; }
  function invalidate() { indexes = null; summaries = new Map(); }

  function applyVisualAliasesInPlace() {
    if (!S() || typeof S().all !== 'function') return;
    (S().all('polizas') || []).forEach(p => {
      if (!p || p.__orbitVisualAliasV1199c) return;
      Object.assign(p, policyVisual(p));
      Object.defineProperty(p, '__orbitVisualAliasV1199c', { value: true, configurable: true, enumerable: false });
    });
    (S().all('vehiculos') || []).forEach(v => {
      if (!v || v.__orbitVisualAliasV1199c) return;
      Object.assign(v, vehicleVisual(v));
      Object.defineProperty(v, '__orbitVisualAliasV1199c', { value: true, configurable: true, enumerable: false });
    });
    invalidate();
  }

  const q = Orbit.q || {};
  const originalClientSummary = typeof q.clienteResumen === 'function' ? q.clienteResumen.bind(q) : null;
  if (originalClientSummary && !q.__clientSummaryV1199c) {
    q.clienteResumen = function (clientId) {
      if (summaries.has(clientId)) return summaries.get(clientId);
      const I = idx();
      const rawCli = (I.clientsById && I.clientsById.get(clientId)) || S().get('clientes', clientId);
      const cli = rawCli && Orbit.clientProjection && typeof Orbit.clientProjection.project === 'function' ? Orbit.clientProjection.project(rawCli) : rawCli;
      const pol = (I.policiesByClient && I.policiesByClient.get(clientId)) || [];
      const cob = (I.cobrosByClient && I.cobrosByClient.get(clientId)) || [];
      const com = (I.comisionesByClient && I.comisionesByClient.get(clientId)) || [];
      const vigentes = pol.filter(activePolicy);
      const primaNetaAnual = vigentes.reduce((sum, p) => sum + (numberOrNull(p.primaNeta) || 0), 0);
      const primaTotalAnual = vigentes.reduce((sum, p) => sum + (numberOrNull(first(p.primaTotal, p.prima)) || 0), 0);
      const sumState = state => cob.filter(c => c.estado === state).reduce((sum, c) => sum + (numberOrNull(first(c.monto, c.montoTotal, c.total)) || 0), 0);
      const cobrado = sumState('Pagado'), pendiente = sumState('Pendiente'), vencido = sumState('Vencido');
      const comisionGen = com.reduce((sum, c) => sum + (numberOrNull(c.monto) || 0), 0);
      let salud = 70 + Math.min(20, vigentes.length * 6) - (vencido > 0 ? 25 : 0) + (cli && cli.segmento === 'Premium' ? 8 : 0);
      salud = Math.max(8, Math.min(100, salud));
      const out = { cli, pol, cob, com, moneda: cli ? cli.moneda : 'GTQ', nPolizas: pol.length, nVigentes: vigentes.length, primaAnual:primaTotalAnual, primaNetaAnual, primaTotalAnual, cobrado, pendiente, vencido, comisionGen, porRenovar: pol.filter(p => p.estado === 'Por renovar').length, salud };
      summaries.set(clientId, out);
      return out;
    };
    q.clientesResumenIndex = function () {
      const I = idx();
      const clients = (I && I.clients) || [];
      clients.forEach(rawCli => {
        const clientId = rawCli && rawCli.id;
        if (clientId && !summaries.has(clientId)) q.clienteResumen(clientId);
      });
      return new Map(summaries);
    };
    q.__clientSummaryV1199c = { original: originalClientSummary, indexed: true, indexedAll: true };
  }

  function section(title, body, cls) {
    return `<section class="card pad ${cls || ''}" style="min-width:0"><div style="font-family:var(--f-display);font-size:17px;font-weight:800;line-height:1.25;margin-bottom:12px">${title}</div>${body}</section>`;
  }
  function field(label, value, opts) {
    const o = opts || {};
    return `<div style="min-width:0"><div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.045em">${esc(label)}</div><div style="font-size:13.5px;font-weight:500;margin-top:3px;line-height:1.42;overflow-wrap:anywhere;${o.mono ? 'font-family:var(--f-mono);font-weight:500;' : ''}">${o.html ? value : esc(shown(value))}</div></div>`;
  }
  function grid(items, cols) {
    return `<div class="orbit-detail-grid" style="display:grid;grid-template-columns:repeat(${cols || 3},minmax(0,1fr));gap:13px 18px">${items.join('')}</div>`;
  }
  function policyCompleteness(p, vehicle) {
    const gaps=[];
    if (numberOrNull(p.primaNeta) == null) gaps.push('prima neta');
    if (numberOrNull(p.primaTotal) == null) gaps.push('prima total');
    if (!safe(p.concepto)) gaps.push('riesgo / concepto');
    if (numberOrNull(p.sumaAsegurada) == null) gaps.push('suma asegurada');
    if (/vehicul|auto/i.test(`${safe(p.ramo)} ${safe(p.subramo)} ${safe(p.producto)}`)) {
      if (!vehicle) gaps.push('vehículo vinculado');
      else {
        const V=vehicleVisual(vehicle);
        if (!safe(V.placa)) gaps.push('placa');
        if (!safe(V.chasis)) gaps.push('chasis');
        if (!safe(V.motor)) gaps.push('motor');
        if (!safe(V.uso)) gaps.push('uso');
      }
    }
    return gaps;
  }
  function qualityBlock(p, vehicle) {
    const pending = [].concat(p.motivosPendientes || p.motivosCalidad || []).filter(Boolean);
    const gaps = policyCompleteness(p, vehicle);
    if (!p.requiereValidacion && !pending.length && !gaps.length) return '<span class="badge ok">Datos principales validados</span>';
    const labels = pending.concat(gaps).slice(0,8).map(x => esc(String(x).replace(/_/g,' ').toLowerCase()));
    return `<span class="badge warn">Información pendiente de completar</span>${labels.length ? `<div class="muted" style="font-size:12px;margin-top:7px">${labels.join(' · ')}</div>` : ''}`;
  }
  function receiptSchedule(policyId) {
    const rows=(S().all('recibosEsperados') || []).filter(r=>r.polizaId===policyId);
    const sum=key=>{const vals=rows.map(r=>numberOrNull(r[key])).filter(v=>v!=null);return vals.length?vals.reduce((a,b)=>a+b,0):null;};
    return {rows,net:sum('primaNeta'),expedition:sum('gastosExpedicion'),finance:sum('gastosFinanciamiento'),sourceAdjustment:sum('descuento'),iva:sum('impuestosIVA'),total:sum('primaTotal')};
  }
  function premiumBreakdown(p) {
    const sch=receiptSchedule(p.id);
    return {
      net:numberOrNull(p.primaNeta),
      expedition:numberOrNull(first(p.gastosEmision,p.gastosExpedicion)) ?? sch.expedition,
      finance:numberOrNull(first(p.gastosFinan,p.gastosFinanciamiento)) ?? sch.finance,
      sourceAdjustment:numberOrNull(first(p.descuento,p.montoDescuento)) ?? sch.sourceAdjustment,
      other:numberOrNull(first(p.otros,p.asistencias,p.otrosGastos)),
      taxable:numberOrNull(first(p.baseGravable,p.baseIVA,p.baseImponible)),
      iva:numberOrNull(first(p.ivaMonto,p.iva,p.impuestos,p.impuestosIVA)) ?? sch.iva,
      total:numberOrNull(first(p.primaTotal,p.prima)),
      scheduleTotal:sch.total,
      receipts:sch.rows
    };
  }
  function receiptRows(policyId, cur) {
    const expected = (S().all('recibosEsperados') || []).filter(r => r.polizaId === policyId).slice().sort((a,b) => safe(first(a.fechaLimite,a.vence,a.fechaVencimiento)).localeCompare(safe(first(b.fechaLimite,b.vence,b.fechaVencimiento))));
    const applied = (S().all('cobros') || []).filter(r => r.polizaId === policyId);
    const rows = expected.length ? expected : applied;
    if (!rows.length) return '<div class="muted">Histórico sin calendario de recibos disponible o fuente pendiente de completar.</div>';
    return `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Recibo</th><th>Vence</th><th class="num">Prima neta</th><th class="num">Expedición</th><th class="num">Financiamiento</th><th class="num">Descuento / ajuste</th><th class="num">IVA / impuestos</th><th class="num">Total</th><th>Estado</th></tr></thead><tbody>${rows.map((r, i) => {
      const total = first(r.primaTotal, r.montoTotal, r.monto, r.total);
      const due = first(r.fechaLimite, r.vence, r.fechaVencimiento);
      const state = first(r.estadoVisual, r.estadoOperativo, r.estado, r.estadoCartera, r.status, 'Pendiente');
      const rid=safe(r.id);
      return `<tr class="${rid?'clickable':''}" ${rid?`onclick="Orbit.receiptsPortfolioProjection&&Orbit.receiptsPortfolioProjection.openReceiptDetail&&Orbit.receiptsPortfolioProjection.openReceiptDetail('${esc(rid)}','${esc(r.clienteId||'')}')"`:''}><td>${esc(first(r.serie, r.numero, r.cuota, i + 1))}</td><td>${esc(fmtDate(due))}</td><td class="num">${esc(moneyDetail(r.primaNeta, r.moneda || cur))}</td><td class="num">${esc(moneyDetail(r.gastosExpedicion, r.moneda || cur))}</td><td class="num">${esc(moneyDetail(r.gastosFinanciamiento, r.moneda || cur))}</td><td class="num">${esc(moneyDetail(r.descuento, r.moneda || cur))}</td><td class="num">${esc(moneyDetail(r.impuestosIVA, r.moneda || cur))}</td><td class="num"><b>${esc(moneyDetail(total, r.moneda || cur))}</b></td><td>${badge(state)}</td></tr>`;
    }).join('')}</tbody></table></div>`;
  }
  function vehicleCandidates(clientId) {
    const raw = clientId && idx().vehiclesByClient ? (idx().vehiclesByClient.get(clientId) || []) : [];
    const seen = new Set();
    return raw.filter(item => item && item.id && !seen.has(item.id) && seen.add(item.id)).map(item => {
      const v = vehicleVisual(item), p = item.polizaId ? S().get('polizas', item.polizaId) : null;
      return { raw:item, v, policy:p };
    });
  }
  function openVehicleLinker(policyId, clientId) {
    const policy = S().get('polizas', policyId), candidates = vehicleCandidates(clientId);
    if (!policy || !candidates.length || !Orbit.policyReceipts || typeof Orbit.policyReceipts.linkVehicleToPolicy !== 'function') return;
    let old = document.getElementById('gi-vehicle-linker'); if (old) old.remove();
    const back = document.createElement('div'); back.id='gi-vehicle-linker'; back.className='drawer-back open'; back.style.cssText='display:grid;place-items:center;z-index:240';
    back.innerHTML='<div class="card" style="width:min(720px,96vw);max-height:90vh;overflow:auto;padding:0"><div style="padding:17px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:12px"><div><small class="muted">Relación por identidad física</small><b style="display:block;font-family:var(--f-display);font-size:18px">Vincular vehículo a póliza '+esc(policy.numero||'')+'</b></div><button class="imp-x" data-close>✕</button></div><div style="padding:18px 20px"><div class="cfg-note">Selecciona el registro exacto. Si pertenece a una póliza histórica, se creará una relación versionada nueva y el registro anterior permanecerá intacto.</div><div style="display:grid;gap:9px;margin-top:12px">'+candidates.map((item,i)=>{const v=item.v,p=item.policy,label=[shown(v.marca),shown(v.linea),shown(v.placa)].join(' · '),ctx=p?('Póliza '+shown(p.numero)+' · '+fmtDate(p.vigenciaInicio)+' → '+fmtDate(p.vigenciaFin)+' · ID '+p.id):'Sin póliza directa';return '<label class="card pad" style="display:flex;gap:10px;align-items:flex-start;cursor:pointer"><input type="radio" name="gi-vehicle-choice" value="'+esc(item.raw.id)+'" '+(i===0?'checked':'')+'><span><b>'+esc(label)+'</b><small class="muted" style="display:block;margin-top:3px">'+esc(ctx)+' · Vehículo ID '+esc(item.raw.id)+'</small></span></label>';}).join('')+'</div><label class="ce-l" style="margin-top:12px">Motivo de la vinculación *<textarea class="o-sel" data-reason rows="2" placeholder="Ej. Confirmación del riesgo de la renovación vigente"></textarea></label><div class="hint error" data-error style="display:none"></div></div><div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;justify-content:flex-end;gap:8px"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-save>Vincular vehículo</button></div></div>';
    document.body.appendChild(back);
    back.querySelectorAll('[data-close]').forEach(x=>x.addEventListener('click',()=>back.remove()));
    back.addEventListener('click',e=>{if(e.target===back){e.preventDefault();e.stopPropagation();}});
    back.querySelector('[data-save]').addEventListener('click',async()=>{
      const choice=back.querySelector('input[name="gi-vehicle-choice"]:checked'), reason=back.querySelector('[data-reason]').value.trim(), error=back.querySelector('[data-error]'), save=back.querySelector('[data-save]');
      if(!choice||!reason){error.style.display='';error.textContent='Selecciona el vehículo y registra el motivo.';return;}
      save.disabled=true;save.textContent='Vinculando…';
      const result=await Orbit.policyReceipts.linkVehicleToPolicy(choice.value,policyId,{motivo:reason});
      if(!result||!result.ok){error.style.display='';error.textContent='No fue posible confirmar la vinculación. No se modificó el histórico.';save.disabled=false;save.textContent='Vincular vehículo';return;}
      back.remove(); invalidate(); renderPolicyPage(document.getElementById('host'),policyId); try{U.toast('Vehículo vinculado con readback confirmado.');}catch(e){}
    });
  }
  function vehicleCard(v, cur, policyId, clientId) {
    if (!v) {
      const candidates=vehicleCandidates(clientId);
      if(candidates.length){
        const links=candidates.map(item=>'<a class="btn ghost sm" href="#/cliente360?c='+encodeURIComponent(clientId)+'&v='+encodeURIComponent(item.raw.id)+'">🚘 '+esc([item.v.marca,item.v.linea,item.v.placa].map(shown).join(' · '))+'</a>').join('');
        return '<div class="gi-integrity-warning"><div><b>🚘 Vehículo pendiente de vincular a esta póliza</b><span>El cliente tiene '+candidates.length+' registro(s) de vehículo. Se distinguen por ID e historial; no se fusionan ni se vinculan automáticamente.</span><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">'+links+'</div></div><button class="btn primary sm" onclick="Orbit.policyVehicleReadModelV1199c.openVehicleLinker(\''+esc(policyId)+'\',\''+esc(clientId)+'\')">Vincular vehículo a esta póliza</button></div>';
      }
      return '<div class="gi-integrity-warning"><div><b>🚘 Falta vincular el vehículo</b><span>Esta póliza vehicular no tiene un vehículo vinculado por ID físico.</span></div></div>';
    }
    const V = vehicleVisual(v);
    return grid([
      field('Marca', V.marca), field('Línea / tipo', V.linea), field('Modelo / año', V.anio),
      field('Placa', V.placa, {mono:true}), field('Inciso', V.inciso), field('Uso', V.uso),
      field('Chasis / VIN', V.chasis, {mono:true}), field('Motor', V.motor, {mono:true}), field('Color', V.color),
      field('Suma asegurada', moneyDetail(V.sumaAsegurada, cur)), field('Concepto', V.concepto), field('Descripción', V.descripcion || V.comentarios)
    ], 3);
  }

  function renderPolicyPage(host, policyId) {
    applyVisualAliasesInPlace();
    const p0 = S().get('polizas', policyId);
    if (!p0) { host.innerHTML = '<div class="page"><div class="card pad">Póliza no disponible.</div></div>'; return; }
    const p = policyVisual(p0), cli = S().get('clientes', p.clienteId) || {}, asg = S().get('aseguradoras', p.aseguradoraId) || {}, ase = S().get('asesores', p.asesorId) || {};
    const vehicle = ((idx().vehiclesByPolicy && idx().vehiclesByPolicy.get(p.id)) || [])[0];
    const cur = p.moneda || cli.moneda || '';
    const pb = premiumBreakdown(p);
    const ivaLabel = p.ivaPct != null ? `IVA / impuestos (${p.ivaPct}%)` : 'IVA / impuestos';
    const back = `#/cliente360?c=${encodeURIComponent(p.clienteId)}&t=polizas`;
    const scheduleDelta = pb.total != null && pb.scheduleTotal != null ? pb.scheduleTotal - pb.total : null;
    const scheduleTolerance = reconciliationTolerance();
    host.innerHTML = `<div class="page orbit-policy-fullpage" data-policy-fullpage="1">
      <div class="crumb" style="margin-bottom:14px"><a style="cursor:pointer;color:var(--red)" href="${back}">‹ ${esc(cli.nombre || 'Cliente 360')}</a> / Póliza ${esc(p.numero || '')}</div>
      <div class="card gi-policy-hero" style="overflow:hidden;margin-bottom:16px">
        <div style="padding:20px 22px;background:linear-gradient(120deg,var(--graph),#10141a);display:flex;align-items:flex-start;gap:18px;justify-content:space-between;flex-wrap:wrap">
          <div style="min-width:0;display:flex;gap:14px;align-items:flex-start"><div class="gi-hero-icon">📑</div><div><div class="muted" style="color:rgba(255,255,255,.7);font-size:11px;text-transform:uppercase;letter-spacing:.12em">Póliza · ${esc(p.tipoPoliza)}</div><h2 style="color:#fff;margin:4px 0 3px;font-family:var(--f-display);font-size:24px;overflow-wrap:anywhere">${esc(p.ramo || 'Póliza')} · ${esc(p.producto || p.subramo || 'Detalle')}</h2><div class="mono" style="color:rgba(255,255,255,.86)">${esc(p.numero || 'Número pendiente')} · ${esc(asg.nombre || 'Aseguradora pendiente')}</div></div></div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${badge(p.estado)}<button class="btn primary" onclick="Orbit.modules.cliente360.editarPoliza('${esc(p.id)}')">✏️ Editar póliza</button><a class="btn ghost" href="${back}">👤 Cliente 360</a></div>
        </div>
      </div>
      <div class="gi-detail-kpis">
        <div><span>💰 Prima total</span><b>${esc(moneyDetail(pb.total,cur))}</b></div>
        <div><span>🧾 Prima neta</span><b>${esc(moneyDetail(pb.net,cur))}</b></div>
        <div><span>📆 Vigencia</span><b>${esc(fmtDate(p.vigenciaFin))}</b></div>
        <div><span>📚 Recibos</span><b>${pb.receipts.length}</b></div>
      </div>
      <div class="orbit-detail-layout" style="display:grid;grid-template-columns:minmax(0,1.35fr) minmax(320px,.65fr);gap:16px;align-items:start">
        <div style="display:grid;gap:16px;min-width:0">
          ${section('📋 Datos de la póliza', grid([
            field('Cliente / asegurado', cli.nombre || p.aseguradoNombreFuente), field('Aseguradora', asg.nombre || p.aseguradoraFuenteNombre), field('Asesor', ase.nombre || p.asesorFuenteNombre),
            field('N.º de póliza', p.numero, {mono:true}), field('Estado', p.estado), field('País / moneda', `${p.pais || cli.pais || '—'} · ${cur || '—'}`),
            field('Ramo', p.ramo), field('Subramo / producto', p.subramo || p.producto), field('Tipo de póliza', p.tipoPoliza),
            field('Inicio de vigencia', fmtDate(p.vigenciaInicio)), field('Fin de vigencia', fmtDate(p.vigenciaFin)), field('Renovación', renewabilityHtml(p), {html:true}),
            field('Suma asegurada', moneyDetail(p.sumaAsegurada, cur)), field('Concepto / riesgo', p.concepto), field('Calidad de información', qualityBlock(p, vehicle), {html:true})
          ], 3))}
          ${section('💰 Prima y condiciones de pago', `<div class="orbit-premium-grid gi-premium-contract">${[
            ['Prima neta', pb.net], ['Gastos de expedición', pb.expedition], ['Gastos financieros', pb.finance], ['Descuento / ajuste', pb.sourceAdjustment], ['Otros / asistencias', pb.other], ...(pb.taxable == null ? [] : [['Base imponible para IVA', pb.taxable]]), [ivaLabel, pb.iva], ['Prima total de póliza', pb.total], ['Total calendario de recibos', pb.scheduleTotal]
          ].map(([k,v])=>`<div class="gi-premium-row ${k==='Prima total de póliza'?'is-total':''}"><span>${esc(k)}</span><b>${esc(moneyDetail(v,cur))}</b></div>`).join('')}</div>${scheduleDelta!=null&&Math.abs(scheduleDelta)>scheduleTolerance?`<div class="badge warn gi-schedule-delta">Diferencia póliza vs calendario: ${esc(moneyDetail(scheduleDelta,cur))} · supera tolerancia ${esc(moneyDetail(scheduleTolerance,cur))} y requiere conciliación</div>`:''}${grid([
            field('Frecuencia', first(p.frecuencia, p.forma)), field('Forma de pago', p.formaPago), field('Conducto', p.conducto)
          ],3)}`)}
          ${section('🚘 Riesgo asegurado / vehículo', vehicleCard(vehicle, cur, p.id, p.clienteId))}
          ${section('🧾 Recibos y cartera', receiptRows(p.id, cur))}
        </div>
        <div style="display:grid;gap:16px;min-width:0">
          ${section('📌 Resumen', `<div style="display:grid;gap:10px">${field('Prima total', moneyDetail(pb.total,cur))}${field('Vigencia', `${fmtDate(p.vigenciaInicio)} → ${fmtDate(p.vigenciaFin)}`)}${field('Forma de pago', p.formaPago)}${field('Estado', p.estado)}</div>`)}
          ${section('🕘 Historial y endosos', (p.historial || []).length ? `<div style="display:grid;gap:10px">${(p.historial || []).slice().reverse().map(e=>`<div style="border-left:2px solid var(--line);padding-left:10px"><b>${esc(first(e.t,e.tipo,'Actualización'))}</b><div class="muted" style="font-size:12px">${esc(fmtDate(e.fecha))}${e.d?' · '+esc(e.d):''}</div></div>`).join('')}</div>` : '<div class="muted">Sin movimientos adicionales registrados.</div>')}
          ${section('⚡ Acciones', `<div style="display:grid;gap:8px"><a class="btn ghost" href="${back}">Abrir ficha del cliente</a>${vehicle ? `<a class="btn ghost" href="#/cliente360?c=${encodeURIComponent(p.clienteId)}&v=${encodeURIComponent(vehicle.id)}">Ver vehículo completo</a>` : ''}</div>`)}
        </div>
      </div>
    </div>`;
  }

  function renderVehiclePage(host, vehicleId) {
    applyVisualAliasesInPlace();
    const v0 = S().get('vehiculos', vehicleId);
    if (!v0) { host.innerHTML = '<div class="page"><div class="card pad">Vehículo no disponible.</div></div>'; return; }
    const v = vehicleVisual(v0), p = policyVisual(S().get('polizas', v.polizaId) || {}), cli = S().get('clientes', v.clienteId) || {}, asg = S().get('aseguradoras', v.aseguradoraId || p.aseguradoraId) || {};
    const cur = p.moneda || cli.moneda || '';
    const back = `#/cliente360?c=${encodeURIComponent(v.clienteId)}&t=vehiculos`;
    host.innerHTML = `<div class="page orbit-vehicle-fullpage" data-vehicle-fullpage="1">
      <div class="crumb" style="margin-bottom:14px"><a href="${back}" style="color:var(--red)">‹ ${esc(cli.nombre || 'Cliente 360')}</a> / Vehículo</div>
      <div class="card gi-vehicle-hero" style="overflow:hidden;margin-bottom:16px"><div style="padding:20px 22px;background:linear-gradient(120deg,#1f3a5f,#142840);display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap"><div style="display:flex;gap:14px;align-items:flex-start"><div class="gi-hero-icon">🚘</div><div><div style="color:rgba(255,255,255,.68);text-transform:uppercase;letter-spacing:.12em;font-size:11px">Vehículo asegurado</div><h2 style="color:#fff;margin:4px 0;font-family:var(--f-display)">${esc(shown(v.marca))} ${esc(shown(v.linea))} ${esc(shown(v.anio))}</h2><div class="mono" style="color:rgba(255,255,255,.85)">${esc(shown(v.placa))}${p.numero?' · póliza '+esc(p.numero):''}</div></div></div><div style="display:flex;gap:8px;flex-wrap:wrap">${canEditVehicle() ? `<button class="btn primary" onclick="Orbit.modules.cliente360.editarVehiculo('${esc(v.id)}')">✏️ Editar vehículo</button>` : ''}<a class="btn ghost" href="${back}">👤 Cliente 360</a></div></div></div>
      <div class="orbit-detail-layout" style="display:grid;grid-template-columns:minmax(0,1.25fr) minmax(300px,.75fr);gap:16px;align-items:start">
        ${section('🚘 Detalle completo del vehículo', vehicleCard(v, cur, v.polizaId, v.clienteId))}
        <div style="display:grid;gap:16px">${section('📑 Póliza vinculada', grid([field('Póliza', p.numero || '—',{mono:true}),field('Aseguradora',asg.nombre || '—'),field('Estado',p.estado || '—'),field('Vigencia',`${fmtDate(p.vigenciaInicio)} → ${fmtDate(p.vigenciaFin)}`),field('Prima total',moneyDetail(first(p.primaTotal,p.prima),cur)),field('Suma asegurada',moneyDetail(first(v.sumaAsegurada,p.sumaAsegurada),cur))],2)+`<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><a class="btn primary" href="#/cliente360?c=${encodeURIComponent(v.clienteId)}&p=${encodeURIComponent(v.polizaId)}">Abrir póliza completa</a>${canEditVehicle() ? `<button class="btn ghost" onclick="Orbit.modules.cliente360.editarVehiculo('${esc(v.id)}')">Editar vehículo</button>` : ''}</div>`)}</div>
      </div>
    </div>`;
  }

  function patchClientPremiumLabels() {
    const root=document.getElementById('host'); if(!root) return;
    root.querySelectorAll('.fh-kpi-lab').forEach(el=>{ if(safe(el.textContent)==='Prima anual') el.textContent='Prima total anual vigente'; });
  }

  function installClient360Owner() {
    const mod = Orbit.modules.cliente360;
    if (!mod || mod.__fullpageOwnerV1199c) return false;
    const originalRender = typeof mod.render === 'function' ? mod.render.bind(mod) : null;
    const originalVerPoliza = typeof mod.verPoliza === 'function' ? mod.verPoliza.bind(mod) : null;
    const originalVerVehiculo = typeof mod.verVehiculo === 'function' ? mod.verVehiculo.bind(mod) : null;
    if (!originalRender) return false;
    mod.render = function (host) {
      applyVisualAliasesInPlace();
      const params = (Orbit.route && Orbit.route.params) || {};
      if (params.p && S().get('polizas', params.p)) { renderPolicyPage(host, params.p); return; }
      if (params.v && S().get('vehiculos', params.v)) { renderVehiclePage(host, params.v); return; }
      const out=originalRender(host);
      setTimeout(()=>{ patchLegacyCards(); patchClientPremiumLabels(); },0);
      return out;
    };
    mod.verPoliza = function (id) {
      const p = S().get('polizas', id);
      if (!p) return originalVerPoliza ? originalVerPoliza(id) : undefined;
      location.hash = `#/cliente360?c=${encodeURIComponent(p.clienteId)}&p=${encodeURIComponent(id)}`;
    };
    mod.verVehiculo = function (id) {
      const v = S().get('vehiculos', id);
      if (!v) return originalVerVehiculo ? originalVerVehiculo(id) : undefined;
      location.hash = `#/cliente360?c=${encodeURIComponent(v.clienteId)}&v=${encodeURIComponent(id)}`;
    };
    mod.__fullpageOwnerV1199c = { originalRender, originalVerPoliza, originalVerVehiculo, fullPagePolicy: true, fullPageVehicle: true, noReadModal: true };
    return true;
  }

  function patchLegacyCards() {
    applyVisualAliasesInPlace();
    // Cliente 360 already owns contextual vehicle actions; do not duplicate them per policy card.
    patchClientPremiumLabels();
  }

  function installCobroGuard() {
    const cob = Orbit.modules.cobros;
    if (!cob || typeof cob.detalle !== 'function' || cob.__detailGuardV1199b) return false;
    const original = cob.detalle.bind(cob);
    cob.detalle = function (id) {
      const out = original(id);
      setTimeout(() => {
        const back = document.getElementById('cob-det');
        if (!back) return;
        back.classList.add('gi-receipt-detail');
        const val = back.querySelector('#cd-val');
        if (!val) return;
        const next = val.cloneNode(true);
        val.replaceWith(next);
        next.addEventListener('click', () => { back.remove(); cob.validarReporte(id); });
      }, 0);
      return out;
    };
    cob.__detailGuardV1199b = { original };
    return true;
  }

  function injectResponsiveContract() {
    if (document.getElementById('orbit-policy-vehicle-responsive-v1199c')) return;
    const style = document.createElement('style');
    style.id = 'orbit-policy-vehicle-responsive-v1199c';
    style.textContent = [
      '.gi-policy-hero,.gi-vehicle-hero{border:1px solid #e7e2de!important;border-radius:20px!important;box-shadow:0 10px 34px rgba(24,28,34,.08)!important}',
      '.gi-policy-hero>div:first-child,.gi-vehicle-hero>div:first-child{background:linear-gradient(135deg,#fff8f8 0%,#f6f3ef 58%,#f2f6fb 100%)!important;color:var(--ink)!important}',
      '.gi-policy-hero h2,.gi-vehicle-hero h2{color:var(--ink)!important;letter-spacing:-.02em}',
      '.gi-policy-hero .muted,.gi-policy-hero .mono,.gi-vehicle-hero .mono,.gi-vehicle-hero>div:first-child>div>div:first-child{color:var(--ink-3)!important}',
      '.gi-policy-hero .btn.ghost,.gi-vehicle-hero .btn.ghost{color:var(--ink)!important;border-color:#ddd7d2!important;background:#fff!important}',
      '.gi-hero-icon{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;background:#fff;border:1px solid #eadfe1;box-shadow:0 6px 18px rgba(197,22,46,.08);font-size:23px;flex:0 0 auto}',
      '.gi-detail-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:-4px 0 16px}',
      '.gi-detail-kpis>div{position:relative;padding:13px 15px;border:1px solid #e8e3de;border-radius:15px;background:#fff;box-shadow:0 5px 18px rgba(24,28,34,.04)}',
      '.gi-detail-kpis>div:before{content:"";position:absolute;left:0;top:13px;bottom:13px;width:3px;border-radius:4px;background:var(--red)}',
      '.gi-detail-kpis span{display:block;font-size:10.5px;text-transform:uppercase;letter-spacing:.055em;color:var(--ink-3);font-weight:700}',
      '.gi-detail-kpis b{display:block;margin-top:5px;font-size:17px;font-family:var(--f-display)}',
      '.orbit-policy-fullpage section.card,.orbit-vehicle-fullpage section.card{border-radius:17px!important;border:1px solid #e9e4df!important;box-shadow:0 4px 18px rgba(24,28,34,.035)!important;background:#fff!important}',
      '.orbit-policy-fullpage .tbl thead th{background:#f8f6f3;color:#555d66;font-size:10.5px;letter-spacing:.055em;text-transform:uppercase}',
      '.orbit-policy-fullpage .tbl tbody tr:hover{background:#fff8f8}',
      '.gi-integrity-warning{display:flex;justify-content:space-between;gap:14px;align-items:center;padding:14px;border:1px solid #edd7b5;border-radius:14px;background:#fff9ef}',
      '.gi-integrity-warning b{display:block;color:#805315}.gi-integrity-warning span{display:block;color:var(--ink-3);font-size:12px;margin-top:3px}',
      '#cob-det.gi-receipt-detail>.card{border-radius:20px!important;border:1px solid #e8e3de!important;box-shadow:0 22px 65px rgba(24,28,34,.18)!important;overflow:hidden}',
      '#cob-det.gi-receipt-detail>.card>div:first-child{background:linear-gradient(135deg,#fff8f8,#f6f3ef)!important;border-bottom:1px solid #e8e3de}',
      '#cob-det.gi-receipt-detail>.card>div:first-child .crumb,#cob-det.gi-receipt-detail>.card>div:first-child b,#cob-det.gi-receipt-detail>.card>div:first-child .mono{color:var(--ink)!important}',
      '#cob-det.gi-receipt-detail #cd-x{background:#fff!important;border-color:#ddd7d2!important;color:var(--ink)!important}',
      '#cob-det.gi-receipt-detail .vp-grid{background:#faf8f5;border-radius:14px;padding:12px}',
      '@media(max-width:1050px){.orbit-detail-layout{grid-template-columns:1fr!important}.orbit-detail-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.gi-detail-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}',
      '@media(max-width:680px){.orbit-detail-grid,.orbit-premium-grid,.gi-detail-kpis{grid-template-columns:1fr!important}.orbit-policy-fullpage h2,.orbit-vehicle-fullpage h2{font-size:20px!important}.fichahdr h2{font-size:20px!important;line-height:1.15}.vp-head{position:relative}.page{padding-left:12px!important;padding-right:12px!important}.gi-integrity-warning{align-items:flex-start;flex-direction:column}}'
    ].join('');
    document.head.appendChild(style);
  }

  function install() {
    applyVisualAliasesInPlace();
    installClient360Owner();
    installCobroGuard();
    injectResponsiveContract();
    setTimeout(()=>{patchLegacyCards();patchClientPremiumLabels();}, 0);
  }

  window.addEventListener('hashchange', () => setTimeout(() => { install(); patchLegacyCards(); }, 0));
  window.addEventListener('orbit:store:emit', () => { invalidate(); setTimeout(() => { applyVisualAliasesInPlace(); patchLegacyCards(); }, 0); });
  document.addEventListener('orbit:store', () => { invalidate(); });
  document.addEventListener('orbit:session', () => setTimeout(install, 0));

  Orbit.policyVehicleReadModelV1199c = {
    version: '20260731.1', ownerRevision:'20260731.4-human-visual',
    policyVisual, vehicleVisual, rebuildIndexes, invalidate, numberOrNull, moneyDetail, policyCompleteness, premiumBreakdown, reconciliationTolerance, openVehicleLinker, vehicleCandidates,
    fullPagePolicy: true, fullPageVehicle: true,
    indexedClientSummary: true,
    writesStore: false,
    writesBackend: false,
    canonicalVisualAliasesOnly: true,
    preventsUndefinedNaN: true
  };

  install();
})();
