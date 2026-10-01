/* ============================================================
   Orbit 360 · CRM · Cobros y cartera (vista global)  — NÚCLEO
   Aging de cartera, conciliación y gestión de cobros.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.cobros = (function () {
  const U = Orbit.ui, q = Orbit.q, K = Orbit.kit, S = () => Orbit.store;
  let st = { fq: '', fest: '', fase: '', sort: 'vence', page: 1 };
  let searchTimer = null;
  let baseCache = null;
  const PAGE_SIZE = 60;
  const PAYMENT_CONTEXT_REFRESH_OWNER = 'ROUTER_STORE_REACTIVE_AND_RECEIPT_PROJECTION';
  const STATE_FILTER_OPTIONS = ['Pagado','Pendiente','Vencido','Pago registrado en SIGA','Por conciliar','Reportado por asesor','Reportado por cliente','Conciliado','Requiere validación','Bloqueado','Anulado'];
  function activeRoleNorm(){try{return String(Orbit.session&&Orbit.session.rol&&Orbit.session.rol()||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_');}catch(e){return'';}}
  function advisorRole(){return ['asesor','asesora','asesor_sr','asesora_sr','asesor_jr','asesora_jr','comercial'].includes(activeRoleNorm());}
  function directPaymentRole(){return !advisorRole();}
  function isPreviewHost(){try{return /--/.test(String(location&&location.hostname||''));}catch(e){return false;}}
  function previewSyntheticReceiptId(value){return /^b3004(?:qa|human)_/i.test(String(value||'').trim());}
  function previewCanMutateReceipt(receipt){return !isPreviewHost()||previewSyntheticReceiptId(receipt&&receipt.id);}
  function previewGuard(receipt){
    if(previewCanMutateReceipt(receipt))return true;
    U.toast('Vista previa segura: los registros reales son solo lectura. La prueba de escritura se realiza únicamente sobre el caso QA sintético.');
    return false;
  }
  function qaReceiptId(){
    if(!isPreviewHost())return '';
    try{const id=String(Orbit.route&&Orbit.route.params&&Orbit.route.params.qaReceipt||'').trim();return /^b3004human_/i.test(id)?id:'';}catch(e){return'';}
  }
  function receiptIdOf(row){return String(row&&(row.receiptId||row.reciboId||(row.__portfolioReceipt?row.id:''))||'').replace(/^portfolio:/,'').trim();}
  function qaUnscopedStore(){
    let store=S(),hops=0;
    while(store&&Object.prototype.hasOwnProperty.call(store,'_scopedFor')&&hops<16){store=Object.getPrototypeOf(store);hops+=1;}
    return store||S();
  }
  function qaReceiptSurfaceRow(receiptId){
    const exact=String(receiptId||'').trim();
    if(!isPreviewHost()||!/^b3004human_/i.test(exact))return null;
    const raw=qaUnscopedStore();
    if(!raw||typeof raw.get!=='function')return null;
    const receipt=raw.get('recibosEsperados',exact);
    if(!receipt||String(receipt.id||'')!==exact||receipt.__syntheticHumanQa!==true||String(receipt.__syntheticGate||'')!=='B3-004-R12')return null;
    const policy=raw.get('polizas',receipt.polizaId)||{};
    const client=raw.get('clientes',receipt.clienteId||policy.clienteId)||{};
    const cobroId=String(receipt.cobroId||'').trim();
    const cobro=cobroId?raw.get('cobros',cobroId):null;
    const applied=!!cobro||receiptHasAppliedPayment(receipt);
    const source=cobro||receipt;
    const reconciled=source.conciliado===true||String(source.applicationState||'').toUpperCase()==='APPLIED_DIRECT';
    const common={
      receiptId:exact,reciboId:exact,clienteId:receipt.clienteId||policy.clienteId||'',polizaId:receipt.polizaId||'',asesorId:receipt.asesorId||policy.asesorId||'',pais:receipt.pais||policy.pais||client.pais||'',
      cuota:receipt.cuota||receipt.secuencia||receipt.serie||'',monto:receipt.primaTotal!=null?receipt.primaTotal:(receipt.montoTotal!=null?receipt.montoTotal:receipt.monto),moneda:receipt.moneda||policy.moneda||'',
      vence:receipt.fechaLimite||receipt.vence||receipt.fechaVencimiento||'',__qaClientName:String(client.nombre||'QA HUMANA B3-004'),__qaPolicyNumber:String(policy.numero||'QA-HUMANA-B3-004-R12')
    };
    if(applied)return Object.assign({},common,source,{id:(cobro&&cobro.id)||('receipt-payment:'+exact),receiptId:exact,reciboId:exact,__paidReceiptEvidence:true,estado:'Pagado',conciliado:reconciled,applicationState:source.applicationState||'PENDING_APPLICATION',fechaPago:source.fechaPago||source.paidDate||receipt.fechaPago||receipt.paidDate||''});
    return Object.assign({},common,{id:'portfolio:'+exact,__portfolioReceipt:true,estado:String(receipt.estado||'Pendiente'),estadoOperativo:String(receipt.estadoOperativo||'pendiente'),requiereValidacion:false});
  }
  function previewReadonlyRow(c){return isPreviewHost()&&!previewSyntheticReceiptId(receiptIdOf(c));}
  function qaActionStore(receiptId){
    const exact=String(receiptId||'').trim();
    if(!isPreviewHost()||qaReceiptId()!==exact||!/^b3004human_/i.test(exact))return S();
    const raw=qaUnscopedStore();
    if(!raw||typeof raw.get!=='function')return S();
    const receipt=raw.get('recibosEsperados',exact);
    if(!receipt||String(receipt.id||'')!==exact||receipt.__syntheticHumanQa!==true||String(receipt.__syntheticGate||'')!=='B3-004-R12')return S();
    return raw;
  }
  function previewReadonlyBadge(c){return '<span class="badge neutral" data-preview-readonly-row="'+U.esc(receiptIdOf(c))+'">Solo lectura</span>';}
  const HYDRATION_DEPS = ['cobros', 'clientes', 'polizas', 'recibosEsperados', 'carteraPrimas'];

  const FDEFS = () => [
    { id: 'fq', type: 'search', ph: 'Buscar cliente, póliza o placa…' },
    { id: 'fase', type: 'select', ph: 'Asesor', options: K.asesorOptions() }
  ];
  function stateFilterMenu(){
    const current=st.fest||'Todos';
    return `<div data-cobros-state-filter="1" style="padding:0 14px 12px;border-bottom:1px solid var(--line)"><details id="cobros-state-menu" style="position:relative;display:inline-block"><summary class="o-sel" style="list-style:none;cursor:pointer;min-width:220px;display:flex;align-items:center;justify-content:space-between;gap:12px"><span>Estado: <b>${U.esc(current)}</b></span><span aria-hidden="true">▾</span></summary><div style="position:absolute;z-index:25;top:calc(100% + 6px);left:0;min-width:260px;max-height:320px;overflow:auto;background:var(--card);border:1px solid var(--line);border-radius:var(--r-sm);box-shadow:var(--sh-2);padding:6px"><button class="btn ghost sm" data-cobros-state-value="" style="width:100%;justify-content:flex-start;text-align:left">Todos</button>${STATE_FILTER_OPTIONS.map(v=>`<button class="btn ${st.fest===v?'primary':'ghost'} sm" data-cobros-state-value="${U.esc(v)}" style="width:100%;justify-content:flex-start;text-align:left;margin-top:3px">${U.esc(v)}</button>`).join('')}</div></details></div>`;
  }

  function hydrationState() {
    try { const store=S(); if(store&&typeof store._ensureCollections==='function') store._ensureCollections(HYDRATION_DEPS); } catch(e) {}
    let s = {};
    try { s = S()._productStatus ? (S()._productStatus() || {}) : {}; } catch (e) {}
    const confirmed = [].concat(s.serverConfirmedCollections || []);
    const denied = [].concat(s.deniedCollections || []);
    const errors = s.snapshotErrors && typeof s.snapshotErrors === 'object' ? s.snapshotErrors : {};
    const failed = HYDRATION_DEPS.filter(name => denied.includes(name) || !!errors[name]);
    const missing = HYDRATION_DEPS.filter(name => !confirmed.includes(name) && !failed.includes(name));
    return { ready: missing.length === 0 && failed.length === 0, missing, failed, confirmed };
  }

  function buildIndex() {
    const clients = new Map((S().all('clientes') || []).filter(x => x && x.id != null).map(x => [String(x.id), x]));
    const policies = new Map((S().all('polizas') || []).filter(x => x && x.id != null).map(x => [String(x.id), x]));
    const vehicleByPolicy = new Map();
    (st.fq ? (S().all('vehiculos') || []) : []).forEach(v => {
      const pid = String(v && v.polizaId || '');
      if (pid && !vehicleByPolicy.has(pid)) vehicleByPolicy.set(pid, v);
    });
    return { clients, policies, vehicleByPolicy };
  }
  function baseModel(reuse){
    const country=activeCountry();
    if(reuse&&baseCache&&baseCache.country===country)return baseCache;
    const idx=buildIndex();
    baseCache={country,idx,cart:q.carteraGlobalPorMoneda(),aging:q.agingVencidoPorMoneda()};
    return baseCache;
  }
  function indexClient(idx, id) { return idx.clients.get(String(id || '')) || null; }
  function indexPolicy(idx, id) { return idx.policies.get(String(id || '')) || null; }
  function activeCountry() {
    const p = String(Orbit.pais || '').trim().toUpperCase();
    return p && p !== 'TODOS' ? p : '';
  }
  function rowCountry(c, idx) {
    if (q && typeof q.policyLinkedCountry === 'function') {
      const canonical = q.policyLinkedCountry(c, idx && idx.clients, idx && idx.policies);
      if (canonical) return canonical;
    }
    const p = indexPolicy(idx, c && c.polizaId);
    const cli = indexClient(idx, c && c.clienteId) || (p ? indexClient(idx, p.clienteId) : null);
    return String((p && p.pais) || (c && c.pais) || (cli && cli.pais) || '').trim().toUpperCase();
  }
  function countryMatches(c, idx) {
    const selected = activeCountry();
    return !selected || rowCountry(c, idx) === selected;
  }
  function rowSearchText(c, idx) {
    const cli = indexClient(idx, c && c.clienteId), p = indexPolicy(idx, c && c.polizaId);
    const veh = p ? idx.vehicleByPolicy.get(String(p.id)) : null;
    return ((cli ? cli.nombre : '') + ' ' + (p ? p.numero : '') + ' ' + (veh ? veh.placa || '' : '')).toLowerCase();
  }
  function matchTxt(c, idx) {
    if (st.fase && c.asesorId !== st.fase) return false;
    if (!st.fq) return true;
    return rowSearchText(c, idx).includes(st.fq.toLowerCase());
  }

  function paymentOriginKind(row) {
    try { if (Orbit.reconciliationDomain && typeof Orbit.reconciliationDomain.classifyPaymentOrigin === 'function') return Orbit.reconciliationDomain.classifyPaymentOrigin(row); } catch (e) {}
    const s = String([row && row.evidenceType,row && row.sourceType,row && row.paymentOrigin,row && row.paymentOriginKind,row && row.fuenteAutoridad,row && row.origenAutoridad,row && row.fuenteConciliacion,row && row.authority].filter(Boolean).join('|')).toLowerCase();
    if (/advisor[_ -]?reported|asesor[_ -]?reportado|advisor[_ -]?payment/.test(s)) return 'ADVISOR_REPORTED';
    if (/client[_ -]?reported|client[_ -]?portal|cliente[_ -]?portal/.test(s)) return 'CLIENT_PORTAL';
    if (/cobros[_ -]?realizados|direct[_ -]?payment[_ -]?reported[_ -]?crm|(^|[| _-])(siga|crm)([| _-]|$)/.test(s)) return 'CRM_DIRECT';
    return 'UNKNOWN';
  }

  function receiptHasAppliedPayment(r){
    const state=String(r&&r.estado||'').trim().toLowerCase();
    const paymentState=String(r&&r.paymentState||'').trim().toUpperCase();
    const op=String(r&&r.estadoOperativo||'').trim().toLowerCase();
    return state==='pagado'||paymentState.startsWith('PAID_')||['pagado','pago_inferido','pago_reportado_aplicado','pago_reportado_asesor_aplicado'].includes(op)||!!(r&&(r.cobroId||r.paidDate||r.fechaPago));
  }
  function receiptPaymentEvidence(idx) {
    const linked = new Set((S().all('cobros') || []).map(c => String(c && (c.reciboId || c.receiptId) || '')).filter(Boolean));
    return (S().all('recibosEsperados') || [])
      .filter(r => {
        if(!r||linked.has(String(r.id||''))) return false;
        const op=String(r.estadoOperativo||'').toLowerCase();
        const origin=paymentOriginKind(r);
        return receiptHasAppliedPayment(r)||origin==='CRM_DIRECT'||['pago_reportado','pago_reportado_asesor'].includes(op);
      })
      .filter(r => countryMatches(r, idx))
      .map(r => {
        const originKind = paymentOriginKind(r);
        const applied = receiptHasAppliedPayment(r);
        const reconciled = r.conciliado === true || String(r.applicationState || '').toUpperCase() === 'APPLIED_DIRECT';
        const crmDirect = originKind === 'CRM_DIRECT';
        const advisorPending = !applied && originKind === 'ADVISOR_REPORTED';
        const clientPending = !applied && originKind === 'CLIENT_PORTAL';
        return {
          id: 'receipt-payment:' + r.id, receiptId: r.id, __receiptPaymentEvidence: true,
          __crmDirectEvidence: crmDirect,
          __paidReceiptEvidence: applied && !crmDirect,
          __advisorReportedEvidence: advisorPending,
          __clientReportedEvidence: clientPending,
          __unclassifiedPaymentEvidence: !applied && !crmDirect && !advisorPending && !clientPending,
          paymentOriginKind: originKind,
          clienteId: r.clienteId, polizaId: r.polizaId, asesorId: r.asesorId, pais: rowCountry(r, idx) || r.pais,
          cuota: r.cuota || r.secuencia || r.serie,
          monto: r.primaTotal != null ? r.primaTotal : (r.montoTotal != null ? r.montoTotal : r.monto),
          moneda: r.moneda, vence: r.fechaLimite || r.vence || r.fechaVencimiento,
          fechaPago: r.paidDate || r.fechaPago || r.fechaPagoReportada || '',
          estado: (applied || crmDirect) ? 'Pagado' : 'Pendiente',
          paymentState: r.paymentState || ((applied || crmDirect) ? 'PAID_DIRECT' : (advisorPending ? 'REPORTED_PENDING_OPERATIVE_VALIDATION' : (clientPending ? 'PAID_REPORTED' : 'CONFLICT_REVIEW_REQUIRED'))),
          applicationState: r.applicationState || (reconciled ? 'APPLIED_DIRECT' : 'PENDING_APPLICATION'),
          conciliado: reconciled,
          estadoOperativo: String(r.estadoOperativo || ''), reportado: r.fechaPagoReportada || r.reportado || true
        };
      });
  }
  function reportedRows(idx) {
    return receiptPaymentEvidence(idx).filter(c => {
      if (!matchTxt(c, idx)) return false;
      if (!st.fest) return true;
      if (st.fest === 'Pago registrado en SIGA') return c.__crmDirectEvidence;
      if (st.fest === 'Pagado') return c.estado === 'Pagado';
      if (st.fest === 'Por conciliar') return c.estado === 'Pagado' && !c.conciliado;
      if (st.fest === 'Conciliado') return c.estado === 'Pagado' && c.conciliado;
      if (st.fest === 'Reportado por asesor') return c.__advisorReportedEvidence;
      if (st.fest === 'Reportado por cliente') return c.__clientReportedEvidence;
      if (st.fest === 'Requiere validación') return c.__unclassifiedPaymentEvidence;
      return false;
    });
  }

  function portfolioPaymentRows(idx) {
    const linked = new Set((S().all('cobros') || []).map(c => String(c && (c.reciboId || c.receiptId) || '')).filter(Boolean));
    const adapter = Orbit.cobrosCarteraProjectionAdapter;
    const qaReceipt = qaReceiptId();
    const source = qaReceipt
      ? (S().all('carteraPrimas') || []).filter(r => r && r.carteraActiva !== false && String(r.reciboId || r.receiptId || '') === qaReceipt)
      : (adapter && typeof adapter.portfolioRows === 'function'
        ? adapter.portfolioRows(st.fq)
        : (S().all('carteraPrimas') || []).filter(r => r && r.carteraActiva !== false && countryMatches(r, idx)));
    return source.map(r => {
      const receiptId = String(r && (r.reciboId || r.receiptId) || '');
      if (!receiptId || linked.has(receiptId)) return null;
      const receipt = S().get('recibosEsperados', receiptId) || r;
      const op = String(receipt.estadoOperativo || r.estadoOperativo || '').trim().toLowerCase();
      if (op === 'pago_reportado') return null;
      const p = indexPolicy(idx, receipt.polizaId || r.polizaId);
      let estado = op === 'pendiente_vencido' ? 'Vencido' : 'Pendiente';
      let requiereValidacion = false;
      if (op === 'requiere_validacion_estado' || op === 'no_pendiente_segun_aseguradora') { estado = 'Requiere validación'; requiereValidacion = true; }
      return {
        id: 'portfolio:' + receiptId, receiptId, __portfolioReceipt: true,
        clienteId: receipt.clienteId || r.clienteId || (p && p.clienteId) || '',
        polizaId: receipt.polizaId || r.polizaId || '',
        asesorId: receipt.asesorId || r.asesorId || (p && p.asesorId) || '',
        pais: rowCountry(receipt, idx) || rowCountry(r, idx) || receipt.pais || r.pais,
        cuota: receipt.cuota || receipt.secuencia || receipt.serie || r.cuota || r.secuencia,
        monto: receipt.primaTotal != null ? receipt.primaTotal : (receipt.montoTotal != null ? receipt.montoTotal : (r.primaTotal != null ? r.primaTotal : (r.montoTotal != null ? r.montoTotal : r.monto))),
        moneda: receipt.moneda || r.moneda,
        vence: receipt.fechaLimite || receipt.vence || receipt.fechaVencimiento || r.fechaLimite || r.vence || r.fechaVencimiento,
        estado, requiereValidacion, estadoOperativo: op || 'pendiente'
      };
    }).filter(Boolean).filter(c => {
      if (!countryMatches(c, idx) || !matchTxt(c, idx)) return false;
      if (st.fest === 'Reportado por asesor' || st.fest === 'Reportado por cliente' || st.fest === 'Pago registrado en SIGA' || st.fest === 'Por conciliar' || st.fest === 'Conciliado' || st.fest === 'Bloqueado' || st.fest === 'Anulado' || st.fest === 'Pagado') return false;
      if (st.fest === 'Requiere validación') return c.requiereValidacion === true;
      return !st.fest || c.estado === st.fest;
    }).sort((a, b) => String(a.vence || '').localeCompare(String(b.vence || '')));
  }

  function rows(idx) {
    return (S().all('cobros') || []).filter(c => {
      if (!countryMatches(c, idx)) return false;
      if (c.estado === 'Anulado' && st.fest !== 'Anulado') return false;
      const estV = estadoValidacion(c);
      if (st.fest === 'Reportado por asesor') return paymentOriginKind(c) === 'ADVISOR_REPORTED' && estV === 'Reportado por asesor' && matchTxt(c, idx);
      if (st.fest === 'Reportado por cliente') return paymentOriginKind(c) === 'CLIENT_PORTAL' && estV === 'Reportado por cliente' && matchTxt(c, idx);
      if (st.fest === 'Pago registrado en SIGA') return paymentOriginKind(c) === 'CRM_DIRECT' && matchTxt(c, idx);
      if (st.fest === 'Por conciliar') return c.estado === 'Pagado' && !c.conciliado && matchTxt(c, idx);
      if (st.fest === 'Conciliado') return c.conciliado && matchTxt(c, idx);
      if (st.fest === 'Requiere validación') return (c.requiereValidacion || estV === 'Requiere validación') && matchTxt(c, idx);
      if (st.fest === 'Bloqueado') return c.estado === 'Bloqueado' && matchTxt(c, idx);
      return matchTxt(c, idx) &&
        (!st.fest || c.estado === st.fest);
    }).sort((a, b) => String(a.vence || '').localeCompare(String(b.vence || '')));
  }

  function paymentProvenanceKind(c) {
    const ps=String(c&&c.paymentState||'').trim().toUpperCase();
    const doi=String(c&&c.directOrInferred||'').trim().toUpperCase();
    if(ps==='PAID_INFERRED'||doi==='INFERRED'||(c&&c.inferredPaid===true)) return 'INFERRED';
    if(ps==='PAID_DIRECT'||doi==='DIRECT') return 'DIRECT';
    return '';
  }

  // Estado de validación visible (no confundir reportado con aplicado)
  function estadoValidacion(c) {
    const provenance=paymentProvenanceKind(c);
    if (provenance === 'INFERRED') return 'Pago inferido';
    if (provenance === 'DIRECT' && c.estado === 'Pagado') return c.conciliado ? 'Pago confirmado' : 'Pagado (por conciliar)';
    if (c.estado === 'Pagado') return c.conciliado ? 'Conciliado' : 'Pagado (por conciliar)';
    if (c.validadoReporte && (c.estado === 'Pendiente' || c.estado === 'Vencido')) return 'Validada (por aplicar)';
    if (c.requiereValidacion) return 'Requiere validación';
    if (c.estado === 'Bloqueado') return 'Bloqueado';
    if (c.reportado && (c.estado === 'Pendiente' || c.estado === 'Vencido')) {
      const origin = paymentOriginKind(c);
      if (origin === 'CRM_DIRECT') return 'Pago registrado en SIGA · pendiente de conciliación';
      if (origin === 'ADVISOR_REPORTED') return 'Reportado por asesor';
      if (origin === 'CLIENT_PORTAL') return c.enRevision ? 'En revisión' : 'Reportado por cliente';
      return 'Origen de pago por confirmar';
    }
    return U.text(c.estado, 'Sin estado');
  }
  function badgeValidacion(c) {
    const e = estadoValidacion(c);
    const tone = e === 'Pago inferido' ? 'info' : e === 'Conciliado' ? 'ok' : /Pagado|Pago confirmado|Pago registrado/.test(e) ? 'ok' : e === 'Validada (por aplicar)' ? 'ok' : (e === 'Reportado por cliente' || e === 'Reportado por asesor') ? 'info' : e === 'En revisión' ? 'info' : e === 'Requiere validación' ? 'warn' : e === 'Bloqueado' ? 'danger' : e === 'Vencido' ? 'danger' : 'warn';
    return '<span class="badge ' + tone + '">' + U.esc(U.text(e, 'Sin estado')) + '</span>';
  }
  function safeMoney(value, currency, short) {
    const cur = String(currency || '').trim().toUpperCase() || 'SIN_MONEDA';
    if (cur === 'SIN_MONEDA') return 'Sin moneda · ' + Math.round(Number(value) || 0).toLocaleString('es-GT');
    if (cur === 'GTQ' || cur === 'COP' || cur === 'USD') return (short ? U.moneyShort(value, cur) : U.money(value, cur)) + ' ' + cur;
    const n = U.finiteNumber(value);
    return cur + ' ' + (n == null ? '—' : Math.round(n).toLocaleString('es-GT'));
  }
  function currencyMetric(summary, field) {
    const currencies = (summary && summary.currencies || []).slice();
    if (!currencies.length) return '—';
    const nonZero = currencies.filter(cur => Number(summary.byCurrency[cur] && summary.byCurrency[cur][field] || 0) !== 0);
    const visible = nonZero.length ? nonZero : currencies;
    return '<span data-currency-safe-metric="' + U.esc(field) + '" style="display:grid;gap:2px">' +
      visible.map(cur => '<span style="white-space:nowrap">' + U.esc(safeMoney(summary.byCurrency[cur] && summary.byCurrency[cur][field], cur, true)) + '</span>').join('') +
      '</span>';
  }
  function agingCurrencyBlocks(summary, colors) {
    const currencies = (summary && summary.currencies || []).slice();
    if (!currencies.length) return '<div class="muted" style="font-size:12.5px;margin-top:12px">Sin cartera vencida en el filtro actual.</div>';
    return currencies.map(cur => {
      const buckets = summary.byCurrency[cur] || { '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
      const total = Object.values(buckets).reduce((s, v) => s + (U.finiteNumber(v) || 0), 0);
      const denom = total || 1;
      return '<div data-aging-currency="' + U.esc(cur) + '" style="padding-top:12px' + (currencies.length > 1 ? ';border-top:1px solid var(--line-2)' : '') + '">' +
        '<div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><b style="font-size:12.5px">' + U.esc(cur) + '</b><span class="muted" style="font-size:12px">total ' + U.esc(safeMoney(total, cur, false)) + '</span></div>' +
        '<div style="height:13px;border-radius:99px;overflow:hidden;display:flex;margin:10px 0 10px">' +
          Object.entries(buckets).map(([k, v]) => '<div title="' + U.esc(k) + ' días" style="width:' + ((U.finiteNumber(v) || 0) / denom * 100) + '%;background:' + colors[k] + '"></div>').join('') +
        '</div>' +
        '<div style="display:flex;gap:18px;flex-wrap:wrap">' +
          Object.entries(buckets).map(([k, v]) => '<span style="display:flex;align-items:center;gap:7px;font-size:12.5px"><span class="dot-s" style="background:' + colors[k] + '"></span>' + U.esc(k) + ' d · <b>' + U.esc(safeMoney(v, cur, false)) + '</b></span>').join('') +
        '</div></div>';
    }).join('');
  }

  function render(host, reuseBase) {
    const qaReceipt=qaReceiptId();
    if(qaReceipt){st.fq='';st.fest='';st.fase='';st.page=1;}
    const hyd = hydrationState();
    if (!hyd.ready) {
      const blocked = hyd.failed.length > 0;
      host.innerHTML = `<div class="page">
        ${K.bannerFor('cobros', `<button class="btn ghost" onclick="Orbit.modules.cobros.lote()" style="background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.2)">📤 Preparar lote</button>`)}
        <div class="card pad" data-cobros-hydration-loading="1" style="display:grid;gap:8px">
          <b style="font-family:var(--f-display);font-size:15px">${blocked ? 'No fue posible completar la carga de Cobros y cartera' : 'Cargando Cobros y cartera…'}</b>
          <div class="muted" style="font-size:12.5px">${blocked ? 'La lectura quedó bloqueada para: ' + hyd.failed.map(U.esc).join(', ') + '. No se muestran ceros parciales.' : 'Preparando clientes, pólizas, recibos y cartera. La pantalla se habilitará cuando la lectura esté completa.'}</div>
        </div>
      </div>`;
      return;
    }

    if (st.fq) { try { const store=S(); if(store&&typeof store._ensureCollections==='function') store._ensureCollections(['vehiculos']); } catch(e) {} }
    const model = baseModel(reuseBase === true);
    const idx = model.idx;
    const cart = model.cart;
    const aging = model.aging;
    const porConciliar = (cart.currencies || []).reduce((sum, cur) => sum + Number(cart.byCurrency[cur] && cart.byCurrency[cur].porConciliar || 0), 0);
    const qaSurfaceRow = qaReceipt ? qaReceiptSurfaceRow(qaReceipt) : null;
    const authoritative = qaReceipt ? [] : rows(idx), portfolioOnly = qaReceipt ? [] : portfolioPaymentRows(idx), reported = qaReceipt ? [] : reportedRows(idx);
    const crmDirect = reported.filter(x => x.__crmDirectEvidence), paidReceiptFallback = reported.filter(x => x.__paidReceiptEvidence), advisorReported = reported.filter(x => x.__advisorReportedEvidence), clientReported = reported.filter(x => x.__clientReportedEvidence);
    const allRowsUnfiltered = qaReceipt ? (qaSurfaceRow ? [qaSurfaceRow] : []) : authoritative.concat(portfolioOnly, reported).sort((a, b) => String(a.vence || '').localeCompare(String(b.vence || '')));
    const allRows = qaReceipt ? allRowsUnfiltered.filter(row => receiptIdOf(row) === qaReceipt) : allRowsUnfiltered;
    const totalPages = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE));
    if (st.page > totalPages) st.page = totalPages;
    if (st.page < 1) st.page = 1;
    const from = (st.page - 1) * PAGE_SIZE, r = allRows.slice(from, from + PAGE_SIZE);
    st.__count = allRows.length + ' registros' +
      (crmDirect.length ? ' · ' + crmDirect.length + ' pagos SIGA por conciliar' : '') +
      (paidReceiptFallback.length ? ' · ' + paidReceiptFallback.length + ' pagos aplicados proyectados' : '') +
      (advisorReported.length ? ' · ' + advisorReported.length + ' reportes de asesor' : '') +
      (clientReported.length ? ' · ' + clientReported.length + ' reportes de cliente' : '') +
      (allRows.length ? ' · ' + (from + 1) + '–' + Math.min(from + PAGE_SIZE, allRows.length) + ' de ' + allRows.length : '');
    const agingCols = { '1-30': '#c9821b', '31-60': '#d9602e', '61-90': '#b5253b', '90+': '#7e1220' };

    host.innerHTML = `<div class="page">
      ${K.bannerFor('cobros', `<button class="btn ghost" onclick="Orbit.modules.cobros.lote()" style="background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.2)">📤 Preparar lote</button>`)}
      ${isPreviewHost()?'<div class="card pad" data-preview-safe-mode="1" style="margin-bottom:12px;border-left:3px solid var(--info)"><b>Vista previa segura</b><div class="muted" style="margin-top:4px">Los registros reales son solo lectura. Las pruebas de escritura solo se habilitan en el caso QA sintético aislado.</div></div>':''}
      ${qaReceipt?'<div class="card pad" data-b3004-human-qa-mode="1" style="margin-bottom:12px;border-left:3px solid var(--ok)"><b>Prueba QA sintética aislada</b><div class="muted" style="margin-top:4px">Esta vista contiene únicamente el recibo de prueba autorizado; no mezcla clientes reales.</div></div>':''}
      ${K.kpis([
        { label: 'Cartera al día', val: currencyMetric(cart, 'alDia'), color: 'var(--ok)', foot: 'cobros confirmados · sin conversión entre monedas', footTone: 'up' },
        { label: 'Pendiente', val: currencyMetric(cart, 'pend'), color: 'var(--warn)', foot: 'por vencer · por moneda' },
        { label: 'Vencido', val: currencyMetric(cart, 'venc'), color: 'var(--danger)', foot: 'en gestión · por moneda', footTone: 'down' },
        { label: 'Por conciliar', onclick: "location.hash='#/cobros'", val: porConciliar, color: 'var(--info)', foot: 'cobros confirmados sin conciliación' }
      ])}
      ${crmDirect.length ? `<div class="card" data-siga-payments-note="1" style="padding:11px 14px;margin-bottom:14px;border-left:3px solid var(--ok)"><b>${crmDirect.length} pago(s) registrados en SIGA</b><div class="muted" style="font-size:12px;margin-top:3px">Son evidencia directa de pagos ya efectuados. No requieren aplicación manual; conservan conciliación automática por lote y también acción individual <b>Conciliar</b>.</div></div>` : ''}
      ${advisorReported.length ? `<div class="card" data-advisor-payments-note="1" style="padding:11px 14px;margin-bottom:14px;border-left:3px solid var(--info)"><b>${advisorReported.length} pago(s) reportado(s) por asesor</b><div class="muted" style="font-size:12px;margin-top:3px">El reporte no aplica el pago. Operativo valida la correspondencia desde Ops y luego aplica el mismo pago sin duplicarlo.</div></div>` : ''}
      ${clientReported.length ? `<div class="card" data-reported-payments-note="1" style="padding:11px 14px;margin-bottom:14px;border-left:3px solid var(--info)"><b>${clientReported.length} pago(s) reportado(s) realmente desde portal</b><div class="muted" style="font-size:12px;margin-top:3px">Cuando el recibo coincide de forma única y válida, el pago se aplica automáticamente. Solo los casos ambiguos o contradictorios quedan para revisión.</div></div>` : ''}

      <div class="card pad" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
          <b style="font-family:var(--f-display);font-size:15px">Antigüedad de cartera vencida (aging)</b>
          <span class="muted" style="font-size:12px">País: ${U.esc(aging.country === 'TODOS' ? 'Todos los países' : aging.country)} · importes separados por moneda</span>
        </div>
        ${agingCurrencyBlocks(aging, agingCols)}
      </div>

      <div class="card" style="overflow:visible">
        ${qaReceipt?'':K.filterBar(FDEFS(), st)}
        ${qaReceipt?'':stateFilterMenu()}
        <div style="overflow-x:auto"><table class="tbl">
          <thead><tr><th>Cliente</th><th>Póliza</th><th>Cuota</th><th class="num">Monto</th><th>Vence</th><th>Pago</th><th>Estado</th><th title="Conciliado con Finanzas">Concil.</th><th></th></tr></thead>
          <tbody>${r.map(c => {
            const p = indexPolicy(idx, c.polizaId);
            const previewReadonly = previewReadonlyRow(c), readonlyBadge = previewReadonly ? previewReadonlyBadge(c) : '';
            if (c.__portfolioReceipt) { return `<tr class="clickable" data-row-country="${U.esc(rowCountry(c, idx))}" data-row-client-id="${U.esc(c.clienteId)}" data-row-policy-id="${U.esc(c.polizaId)}" data-portfolio-receipt="${U.esc(c.receiptId)}" onclick="Orbit.receiptsPortfolioProjection&&Orbit.receiptsPortfolioProjection.openReceiptDetail&&Orbit.receiptsPortfolioProjection.openReceiptDetail('${U.esc(c.receiptId)}','${U.esc(c.clienteId)}')"><td>${K.clienteCell(c.clienteId)}</td><td>${p ? '<span class="mono" style="font-size:12px">' + U.esc(U.text(p.numero)) + '</span>' : '—'}</td><td>${U.esc(U.text(c.cuota))}</td><td class="num">${U.money(c.monto, c.moneda)}</td><td style="font-size:12.5px">${U.fmtDate(c.vence)}</td><td><span class="muted">—</span></td><td>${badgeValidacion(c)}</td><td><span class="muted">—</span></td><td style="text-align:right;white-space:nowrap;position:sticky;right:0;background:var(--surface,#fff);z-index:2">${previewReadonly ? readonlyBadge : (c.requiereValidacion ? '<span class="badge warn">Revisar</span>' : (advisorRole() ? `<button class="btn primary sm" title="Reportar pago para validación operativa" onclick="event.stopPropagation();Orbit.modules.cobros.reportarPago('${U.esc(c.receiptId)}')" data-cobros-action="report">Reportar pago</button>` : `<button class="btn primary sm" title="Aplicar pago a este recibo" onclick="event.stopPropagation();Orbit.modules.cobros.aplicarPago('${U.esc(c.receiptId)}')" data-cobros-action="apply">Aplicar pago</button>`))}</td></tr>`; }
            if (c.__crmDirectEvidence) { return `<tr class="clickable" data-row-country="${U.esc(rowCountry(c, idx))}" data-row-client-id="${U.esc(c.clienteId)}" data-row-policy-id="${U.esc(c.polizaId)}" data-siga-direct-payment="${U.esc(c.receiptId)}" onclick="Orbit.receiptsPortfolioProjection&&Orbit.receiptsPortfolioProjection.openReceiptDetail&&Orbit.receiptsPortfolioProjection.openReceiptDetail('${U.esc(c.receiptId)}','${U.esc(c.clienteId)}')"><td>${K.clienteCell(c.clienteId)}</td><td>${p ? '<span class="mono" style="font-size:12px">' + U.esc(U.text(p.numero)) + '</span>' : '—'}</td><td>${U.esc(U.text(c.cuota))}</td><td class="num">${U.money(c.monto, c.moneda)}</td><td style="font-size:12.5px">${U.fmtDate(c.vence)}</td><td style="font-size:12.5px">${c.fechaPago ? U.fmtDate(c.fechaPago) : '<span class="muted">No informada</span>'}</td><td><span class="badge ok">Pago registrado en SIGA</span></td><td>${c.conciliado ? '<span class="badge ok">Conciliado</span>' : '<span class="badge warn">Pendiente de conciliación</span>'}</td><td style="text-align:right;white-space:nowrap;position:sticky;right:0;background:var(--surface,#fff);z-index:2">${c.conciliado ? '<span class="badge ok">Conciliado</span>' : (previewReadonly ? readonlyBadge : `<button class="btn primary sm" title="Conciliar este pago" onclick="event.stopPropagation();Orbit.modules.cobros.conciliarFactura('${U.esc(c.receiptId)}')" data-cobros-action="reconcile">Conciliar</button>`)}</td></tr>`; }
            if (c.__paidReceiptEvidence) { return `<tr class="clickable" data-row-country="${U.esc(rowCountry(c, idx))}" data-row-client-id="${U.esc(c.clienteId)}" data-row-policy-id="${U.esc(c.polizaId)}" data-paid-receipt-evidence="${U.esc(c.receiptId)}" onclick="Orbit.receiptsPortfolioProjection&&Orbit.receiptsPortfolioProjection.openReceiptDetail&&Orbit.receiptsPortfolioProjection.openReceiptDetail('${U.esc(c.receiptId)}','${U.esc(c.clienteId)}')"><td>${K.clienteCell(c.clienteId)}</td><td>${p ? '<span class="mono" style="font-size:12px">' + U.esc(U.text(p.numero)) + '</span>' : '—'}</td><td>${U.esc(U.text(c.cuota))}</td><td class="num">${U.money(c.monto, c.moneda)}</td><td style="font-size:12.5px">${U.fmtDate(c.vence)}</td><td style="font-size:12.5px">${c.fechaPago ? U.fmtDate(c.fechaPago) : '<span class="muted">No informada</span>'}</td><td data-payment-provenance="${paymentProvenanceKind(c)==='INFERRED'?'inferred':'direct'}">${paymentProvenanceKind(c)==='INFERRED' ? '<span class="badge info">Pago inferido</span>' : '<span class="badge ok">Pago confirmado</span>'}</td><td>${c.conciliado ? '<span class="badge ok">Conciliado</span>' : '<span class="badge warn">Pendiente de conciliación</span>'}</td><td style="text-align:right;white-space:nowrap;position:sticky;right:0;background:var(--surface,#fff);z-index:2">${c.conciliado ? '<span class="badge ok">Conciliado</span>' : (previewReadonly ? readonlyBadge : `<button class="btn primary sm" title="Conciliar este pago" onclick="event.stopPropagation();Orbit.modules.cobros.conciliarFactura('${U.esc(c.receiptId)}')" data-cobros-action="reconcile">Conciliar</button>`)}</td></tr>`; }
            if (c.__advisorReportedEvidence) { return `<tr class="clickable" data-row-country="${U.esc(rowCountry(c, idx))}" data-row-client-id="${U.esc(c.clienteId)}" data-row-policy-id="${U.esc(c.polizaId)}" data-advisor-reported-payment="${U.esc(c.receiptId)}" onclick="Orbit.receiptsPortfolioProjection&&Orbit.receiptsPortfolioProjection.openReceiptDetail&&Orbit.receiptsPortfolioProjection.openReceiptDetail('${U.esc(c.receiptId)}','${U.esc(c.clienteId)}')"><td>${K.clienteCell(c.clienteId)}</td><td>${p ? '<span class="mono" style="font-size:12px">' + U.esc(U.text(p.numero)) + '</span>' : '—'}</td><td>${U.esc(U.text(c.cuota))}</td><td class="num">${U.money(c.monto, c.moneda)}</td><td style="font-size:12.5px">${U.fmtDate(c.vence)}</td><td style="font-size:12.5px">${c.fechaPago ? U.fmtDate(c.fechaPago) : '<span class="muted">Reportado</span>'}</td><td><span class="badge info">Pago reportado por asesor · pendiente de validación operativa</span></td><td><span class="badge warn">Pendiente</span></td><td style="text-align:right;white-space:nowrap;position:sticky;right:0;background:var(--surface,#fff);z-index:2">${previewReadonly ? readonlyBadge : (advisorRole() ? '<span class="badge info">Enviado a Ops</span>' : `<button class="btn primary sm" title="Validar y aplicar el pago reportado" onclick="event.stopPropagation();Orbit.modules.cobros.aplicarPago('${U.esc(c.receiptId)}')" data-cobros-action="apply-advisor-report">Validar y aplicar</button>`)}</td></tr>`; }
            if (c.__clientReportedEvidence) { return `<tr class="clickable" data-row-country="${U.esc(rowCountry(c, idx))}" data-row-client-id="${U.esc(c.clienteId)}" data-row-policy-id="${U.esc(c.polizaId)}" data-reported-payment-evidence="${U.esc(c.receiptId)}" onclick="Orbit.receiptsPortfolioProjection&&Orbit.receiptsPortfolioProjection.openReceiptDetail&&Orbit.receiptsPortfolioProjection.openReceiptDetail('${U.esc(c.receiptId)}','${U.esc(c.clienteId)}')"><td>${K.clienteCell(c.clienteId)}</td><td>${p ? '<span class="mono" style="font-size:12px">' + U.esc(U.text(p.numero)) + '</span>' : '—'}</td><td>${U.esc(U.text(c.cuota))}</td><td class="num">${U.money(c.monto, c.moneda)}</td><td style="font-size:12.5px">${U.fmtDate(c.vence)}</td><td style="font-size:12.5px">${c.fechaPago ? U.fmtDate(c.fechaPago) : '<span class="muted">Reportado</span>'}</td><td><span class="badge info">Pago reportado por cliente · pendiente de aplicar</span></td><td><span class="badge warn">Pendiente</span></td><td style="text-align:right;white-space:nowrap;position:sticky;right:0;background:var(--surface,#fff);z-index:2">${previewReadonly ? readonlyBadge : `<button class="btn primary sm" title="Aplicar el pago reportado" onclick="event.stopPropagation();Orbit.modules.cobros.validarReporte('${U.esc(c.receiptId)}')" data-cobros-action="apply">Aplicar pago</button>`}</td></tr>`; }
            if (c.__unclassifiedPaymentEvidence) { return `<tr data-unclassified-payment-evidence="${U.esc(c.receiptId)}"><td>${K.clienteCell(c.clienteId)}</td><td>${p ? U.esc(U.text(p.numero)) : '—'}</td><td>${U.esc(U.text(c.cuota))}</td><td class="num">${U.money(c.monto,c.moneda)}</td><td>${U.fmtDate(c.vence)}</td><td>${c.fechaPago ? U.fmtDate(c.fechaPago) : '—'}</td><td><span class="badge warn">Origen de pago por confirmar</span></td><td><span class="badge warn">Revisión</span></td><td></td></tr>`; }

            const aplicable = c.estado === 'Pendiente' || c.estado === 'Vencido';
            return `<tr class="clickable" data-row-country="${U.esc(rowCountry(c, idx))}" data-row-client-id="${U.esc(c.clienteId)}" data-row-policy-id="${U.esc(c.polizaId)}" onclick="Orbit.modules.cobros.detalle('${c.id}')">
              <td>${K.clienteCell(c.clienteId)}</td>
              <td>${p ? `<a class="mono" style="font-size:12px;color:var(--red);cursor:pointer" title="Ver póliza" onclick="event.stopPropagation();Orbit.modules.cliente360.verPoliza('${p.id}')">${U.esc(U.text(p.numero))}</a>` : '<span class="mono" style="font-size:12px">—</span>'}</td>
              <td>${U.esc(U.text(c.cuota))}</td>
              <td class="num">${U.money(c.monto, c.moneda)}</td>
              <td style="font-size:12.5px">${U.fmtDate(c.vence)}</td>
              <td style="font-size:12.5px">${c.fechaPago ? U.fmtDate(c.fechaPago) : '<span class="muted">—</span>'}</td>
              <td>${badgeValidacion(c)}</td>
              <td>${c.estado === 'Pagado' ? (c.conciliado ? '<span style="color:var(--ok)" title="Confirmado y conciliado con póliza">✓</span>' : '<span style="color:var(--warn)" title="Por conciliar">◷</span>') : '<span class="muted">—</span>'}</td>
              <td style="text-align:right;white-space:nowrap;position:sticky;right:0;background:var(--surface,#fff);z-index:2">${previewReadonly ? readonlyBadge : (c.reportado && paymentOriginKind(c) === 'ADVISOR_REPORTED' && (c.estado === 'Pendiente' || c.estado === 'Vencido') ? (advisorRole() ? '<span class="badge info">Enviado a Ops</span>' : `<button class="btn primary sm" title="Validar y aplicar pago reportado por asesor" onclick="event.stopPropagation();Orbit.modules.cobros.aplicarPago('${c.id}')" data-cobros-action="apply-advisor-report">Validar y aplicar</button>`) : (c.reportado && !c.validadoReporte && paymentOriginKind(c) === 'CLIENT_PORTAL' && (c.estado === 'Pendiente' || c.estado === 'Vencido') ? `<button class="btn primary sm" title="Aplicar pago reportado por el cliente" onclick="event.stopPropagation();Orbit.modules.cobros.validarReporte('${c.id}')" data-cobros-action="apply">Aplicar pago</button>` : (aplicable ? (advisorRole() ? `<button class="btn primary sm" title="Reportar pago para validación operativa" onclick="event.stopPropagation();Orbit.modules.cobros.reportarPago('${c.id}')" data-cobros-action="report">Reportar pago</button>` : `<button class="btn primary sm" title="Aplicar pago" onclick="event.stopPropagation();Orbit.modules.cobros.aplicarPago('${c.id}')" data-cobros-action="apply">Aplicar pago</button>`) : ((c.estado === 'Pagado' && !c.conciliado) ? `<button class="btn primary sm" title="Conciliar pago" onclick="event.stopPropagation();Orbit.modules.cobros.conciliarFactura('${c.id}')" data-cobros-action="reconcile">Conciliar</button>` : ''))))}</td>
            </tr>`;
          }).join('') || `<tr><td colspan="9" class="muted" style="text-align:center;padding:30px">Sin cobros.</td></tr>`}</tbody>
        </table></div>
        ${totalPages > 1 ? `<div data-cobros-pagination="1" style="padding:12px 14px;border-top:1px solid var(--line);display:flex;align-items:center;justify-content:flex-end;gap:8px"><span class="muted" style="font-size:12.5px;margin-right:auto">Página ${st.page} de ${totalPages}</span><button class="btn ghost sm" ${st.page <= 1 ? 'disabled' : ''} onclick="Orbit.modules.cobros.pagina(-1)">‹ Anterior</button><button class="btn ghost sm" ${st.page >= totalPages ? 'disabled' : ''} onclick="Orbit.modules.cobros.pagina(1)">Siguiente ›</button></div>` : ''}
      </div></div>`;

    K.wireFilters(FDEFS(), st, (id, live) => {
      st.page = 1;
      if (live) {
        if (searchTimer) clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          searchTimer = null;
          render(host, true);
          const i = document.getElementById('fq');
          if (i) { i.focus(); const v = i.value; i.setSelectionRange(v.length, v.length); }
        }, 180);
      } else {
        render(host, true);
      }
    });
    host.querySelectorAll('[data-cobros-state-value]').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();st.fest=btn.getAttribute('data-cobros-state-value')||'';st.page=1;render(host,true);}));
  }

  function pagina(delta) {
    const next = Math.max(1, Number(st.page || 1) + Number(delta || 0));
    if (next === st.page) return;
    st.page = next;
    const host = document.getElementById('host');
    if (host) render(host, true);
  }

  function resolveReceipt(cobroOrId) {
    const c = typeof cobroOrId === 'object' && cobroOrId ? cobroOrId : S().get('cobros', cobroOrId);
    if (!c) return null;
    const directId = c.reciboId || c.receiptId || '';
    if (directId) {
      const direct = S().get('recibosEsperados', directId);
      if (direct) return direct;
    }
    const sameText = (a,b) => String(a == null ? '' : a).trim().toLowerCase() === String(b == null ? '' : b).trim().toLowerCase();
    const amount = x => { const n=Number(x); return Number.isFinite(n)?Math.round(n*100)/100:null; };
    const targetAmount = amount(c.monto);
    const due = String(c.vence || c.fechaLimite || c.fechaVencimiento || '');
    const candidates = (S().all('recibosEsperados') || []).filter(r => {
      if (!r || String(r.polizaId || '') !== String(c.polizaId || '')) return false;
      const ri = r.cuota || r.serie || r.numeroReciboFuente || '';
      if (c.cuota && ri && !sameText(ri,c.cuota)) return false;
      const ra = amount(r.monto != null ? r.monto : (r.montoTotal != null ? r.montoTotal : r.primaTotal));
      if (targetAmount != null && ra != null && Math.abs(targetAmount-ra)>0.01) return false;
      const rd = String(r.vence || r.fechaLimite || r.fechaVencimiento || '');
      if (due && rd && due !== rd) return false;
      return true;
    });
    return candidates.length === 1 ? candidates[0] : null;
  }
  function resolveReceiptId(cobroOrId) { const r=resolveReceipt(cobroOrId); return r && r.id || ''; }
  function paymentContext(cobroOrReceiptId) {
    const rawId = typeof cobroOrReceiptId === 'string' ? cobroOrReceiptId : '';
    const store = rawId ? qaActionStore(rawId) : S();
    let receipt = rawId ? store.get('recibosEsperados', rawId) : null;
    let cobro = typeof cobroOrReceiptId === 'object' && cobroOrReceiptId ? cobroOrReceiptId : (rawId ? store.get('cobros', rawId) : null);
    if (!cobro && receipt) cobro = (store.all('cobros') || []).find(x => String(x && (x.reciboId || x.receiptId) || '') === String(receipt.id)) || null;
    if (!receipt) receipt = store===S()?resolveReceipt(cobro || cobroOrReceiptId):null;
    if (!receipt) return null;
    const portfolio = (store.all('carteraPrimas') || []).find(x => String(x && (x.reciboId || x.receiptId) || '') === String(receipt.id)) || {};
    const p = store.get('polizas', receipt.polizaId || portfolio.polizaId || (cobro && cobro.polizaId)) || {};
    if (!cobro) cobro = {
      id: 'receipt:' + receipt.id,
      reciboId: receipt.id,
      receiptId: receipt.id,
      clienteId: receipt.clienteId || portfolio.clienteId || p.clienteId || '',
      polizaId: receipt.polizaId || portfolio.polizaId || '',
      asesorId: receipt.asesorId || portfolio.asesorId || p.asesorId || '',
      cuota: receipt.cuota || receipt.secuencia || receipt.serie || portfolio.cuota || '',
      monto: receipt.primaTotal != null ? receipt.primaTotal : (receipt.montoTotal != null ? receipt.montoTotal : (portfolio.primaTotal != null ? portfolio.primaTotal : (portfolio.montoTotal != null ? portfolio.montoTotal : portfolio.monto))),
      moneda: receipt.moneda || portfolio.moneda || p.moneda || '',
      vence: receipt.fechaLimite || receipt.vence || receipt.fechaVencimiento || portfolio.fechaLimite || portfolio.vence || portfolio.fechaVencimiento || '',
      estado: 'Pendiente',
      fechaPago: receipt.paidDate || receipt.fechaPago || receipt.fechaPagoReportada || '',
      paidDate: receipt.paidDate || receipt.fechaPago || receipt.fechaPagoReportada || '',
      metodo: receipt.paymentMethod || receipt.metodoPago || ''
    };
    return { cobro, receipt, portfolio };
  }
  async function uploadPaymentDocument(file, kind, cobro, receiptId) {
    if (!file) return '';
    const provider = Orbit.productDriveDocumentProviderP0;
    if (!provider || typeof provider.upload !== 'function') throw new Error('PAYMENT_DOCUMENT_PROVIDER_UNAVAILABLE');
    const out = await provider.upload(file, {
      documentType: kind,
      clienteId: cobro.clienteId || '',
      polizaId: cobro.polizaId || '',
      receiptId: receiptId || '',
      sourceModule: 'cobros'
    });
    if (!out || out.ok !== true || !(out.documentRef || out.driveUrl || out.externalUrl)) throw new Error('PAYMENT_DOCUMENT_UPLOAD_FAILED');
    return out.documentRef || out.driveUrl || out.externalUrl;
  }

  /* ---- Detalle del recibo (drawer) — abre el detalle del cobro, no la póliza ---- */
  function detalle(cobroId) {
    const c = S().get('cobros', cobroId); if (!c) return;
    const cli = S().get('clientes', c.clienteId), p = S().get('polizas', c.polizaId), asg = p ? q.aseguradora(p.aseguradoraId) : null, ase = q.asesor(c.asesorId);
    const cur = c.moneda; const m2 = n => U.money(n, cur);
    const TT = k => (Orbit.termino ? Orbit.termino(k, cli && cli.pais) : k);
    const aplicable = c.estado === 'Pendiente' || c.estado === 'Vencido';
    let back = document.getElementById('cob-det'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'cob-det'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center';
    const vr = (l, v) => `<div class="vp-row"><span class="vp-l">${l}</span><span class="vp-v">${v}</span></div>`;
    back.innerHTML = `<div class="card" style="width:min(560px,95vw);max-height:92vh;overflow:auto;padding:0">
      <div style="padding:18px 20px;background:linear-gradient(120deg,var(--graph),#10141a);display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div><div class="crumb" style="margin-bottom:4px;color:rgba(255,255,255,.8)">${U.esc(U.text(TT('recibo'), 'Recibo'))} · cuota ${U.esc(U.text(c.cuota))}</div>
          <b style="font-family:var(--f-display);font-size:18px;color:#fff">REC-${c.id.slice(-5).toUpperCase()}</b>
          <div class="mono" style="font-size:12.5px;margin-top:3px;color:rgba(255,255,255,.85)">${cli ? U.esc(cli.nombre) : '—'} · ${p ? U.esc(U.text(p.numero)) : '—'}</div></div>
        <button class="imp-x" id="cd-x" style="background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.3);color:#fff">✕</button>
      </div>
      <div style="padding:18px 20px;display:grid;gap:16px">
        <div class="vp-tags">${badgeValidacion(c)}${c.reportado && (c.estado === 'Pendiente' || c.estado === 'Vencido') ? '<span class="badge info">Soporte: ' + U.esc(c.soporteNombre || 'reportado') + '</span>' : ''}</div>
        <div class="vp-grid">
          ${vr('Aseguradora', asg ? U.esc(asg.nombre) : '—')}${vr('Asesor', ase ? U.esc(ase.nombre) : '—')}
          ${vr('Forma de pago', (p && p.formaPago) || c.metodo || '—')}${vr('Conducto', (p && p.conducto) || '—')}
          ${vr('Vence', U.fmtDate(c.vence))}${vr('Fecha límite', U.fmtDate(c.fechaLimite || c.vence))}
          ${vr('Fecha real de pago', (c.paidDate || c.fechaPago || c.fechaPagoReportada) ? U.fmtDate(c.paidDate || c.fechaPago || c.fechaPagoReportada) : '—')}${vr('Fecha operativa inferida', c.inferredEffectiveDate ? U.fmtDate(c.inferredEffectiveDate) : '—')}${vr('Fecha de aplicación', c.applicationDate ? U.fmtDate(c.applicationDate) : '—')}${vr('Número de factura', U.esc(c.invoiceNumber || c.numeroFactura || '—'))}${vr('Soporte de pago', c.paymentSupportDocumentRef ? 'Adjunto' : 'No adjunto')}${vr('Factura / soporte de aplicación', c.invoiceDocumentRef ? 'Adjunta' : 'No adjunta')}
        </div>
        <div class="vp-desglose">
          <div class="vp-sec-t">🧾 Desglose del ${TT('recibo').toLowerCase()}</div>
          <table class="vp-dtbl">
            <tr><td>${TT('prima_neta')}</td><td class="num">${m2(c.neta != null ? c.neta : c.monto)}</td></tr>
            <tr><td>Gastos de expedición</td><td class="num">${m2(c.gastosEmision || 0)}</td></tr>
            <tr><td>Gastos financieros</td><td class="num">${m2(c.gastosFinan || 0)}</td></tr>
            <tr><td>Otros / asistencias</td><td class="num">${m2(c.otros || 0)}</td></tr>
            <tr><td>IVA</td><td class="num">${m2(c.iva || 0)}</td></tr>
            <tr class="vp-tot"><td>Total del ${TT('recibo').toLowerCase()}</td><td class="num">${m2(c.monto)}</td></tr>
          </table>
        </div>
        ${c.facturaNombre ? `<div class="cfg-note">📄 Factura adjunta: <b>${U.esc(c.facturaNombre)}</b></div>` : ''}
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
        <button class="btn ghost" id="cd-delete" style="margin-right:auto;color:var(--danger,var(--red))">Eliminar</button>
        ${cli ? `<button class="btn ghost" onclick="document.getElementById('cob-det').remove();location.hash='#/cliente360?c=${cli.id}'">👤 Ver cliente</button>` : ''}
        ${p ? `<button class="btn ghost" onclick="document.getElementById('cob-det').remove();Orbit.modules.cliente360.verPoliza('${c.polizaId}')">📑 Ver póliza</button>` : ''}
        ${c.reportado && paymentOriginKind(c) === 'ADVISOR_REPORTED' && aplicable ? (advisorRole() ? '<span class="badge info">Enviado a Ops</span>' : `<button class="btn primary" id="cd-apply" data-cobros-action="apply-advisor-report">Validar y aplicar</button>`) : (c.reportado && paymentOriginKind(c) === 'CLIENT_PORTAL' && aplicable ? `<button class="btn primary" id="cd-val">Aplicar pago reportado</button>` : (aplicable ? (advisorRole() ? `<button class="btn primary" id="cd-report" data-cobros-action="report">Reportar pago</button>` : `<button class="btn primary" id="cd-apply" data-cobros-action="apply">Aplicar pago</button>`) : ''))}
        ${(c.estado === 'Pagado' && !c.conciliado) ? `<button class="btn primary" id="cd-conc">Conciliar / completar datos</button>` : ''}
      </div>
    </div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#cd-x').addEventListener('click', close);
    const del = back.querySelector('#cd-delete');
    if (del) del.addEventListener('click', async () => {
      if (!Orbit.recordDelete) return U.toast('Eliminación canónica no disponible.');
      del.disabled = true;
      try {
        const result = await Orbit.recordDelete.remove('cobros', cobroId, { label: 'Recibo ' + (c.cuota || c.numero || c.serie || cobroId) });
        if (result && result.ok) { back.remove(); render(document.getElementById('host')); return; }
      } catch (error) {
        U.toast('No fue posible confirmar la eliminación del recibo.');
      }
      del.disabled = false;
    });
    const rp = back.querySelector('#cd-report');
    if (rp) rp.addEventListener('click', () => { back.remove(); reportarPago(cobroId); });
    const ap = back.querySelector('#cd-apply');
    if (ap) ap.addEventListener('click', () => { back.remove(); aplicarPago(cobroId); });
    const av = back.querySelector('#cd-val');
    if (av) av.addEventListener('click', () => { back.remove(); validarReporte(cobroId); });
    const cc = back.querySelector('#cd-conc');
    if (cc) cc.addEventListener('click', () => { back.remove(); conciliarFactura(cobroId); });
  }

  /* ---- Registrar aplicación del pago por la aseguradora: factura/fecha/número son enriquecimientos opcionales ---- */
  function conciliarFactura(cobroOrReceiptId) {
    if (!directPaymentRole()) return U.toast('El rol Asesor no puede conciliar pagos.');
    const ctx = paymentContext(cobroOrReceiptId); if (!ctx || !ctx.receipt) return U.toast('No fue posible identificar un único recibo esperado para este cobro.');
    const c = ctx.cobro, receipt = ctx.receipt;
    if(!previewGuard(receipt)) return false;
    let pm = document.getElementById('cob-conc'); if (pm) pm.remove();
    pm = document.createElement('div'); pm.id = 'cob-conc'; pm.className = 'drawer-back open';
    pm.style.cssText = 'display:grid;place-items:center;z-index:210;padding:12px;box-sizing:border-box;overflow:auto';
    pm.innerHTML = '<div class="card" style="width:min(480px,100%);max-height:calc(100dvh - 24px);overflow:auto;padding:0;display:flex;flex-direction:column">'
      + '<div style="padding:16px 20px;background:linear-gradient(120deg,var(--graph),#10141a);display:flex;justify-content:space-between;align-items:center">'
      + '<b style="font-family:var(--f-display);font-size:16px;color:#fff">📄 Registrar aplicación del pago</b>'
      + '<button class="imp-x" id="cc-x" style="background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.25);color:#fff">✕</button></div>'
      + '<div style="padding:18px 20px;display:grid;gap:12px">'
      + '<div class="cfg-note">Puedes completar datos faltantes del <b>pago</b> y de su <b>aplicación por la aseguradora</b>. Se enriquecen sobre el mismo pago; no se crea un duplicado. Los soportes son opcionales.</div>'
      + '<label class="ce-l">Fecha real del pago <span class="muted">(opcional)</span><input id="cc-paid" class="o-sel" type="date" value="' + U.esc(c.paidDate || c.fechaPago || c.fechaPagoReportada || '') + '"></label>'
      + '<label class="ce-l">Método de pago <span class="muted">(opcional)</span><input id="cc-method" class="o-sel" value="' + U.esc(c.paymentMethod || c.metodo || '') + '" placeholder="Opcional"></label>'
      + '<div class="ce-l"><span style="font-size:12.5px;font-weight:600;color:var(--ink-2);margin-bottom:7px;display:block">Soporte del pago <span class="muted">(opcional)</span></span><div style="display:flex;gap:8px;align-items:center"><button class="btn ghost sm" id="cc-pay-btn">⬆ Adjuntar soporte</button><span id="cc-pay-name" class="muted" style="font-size:12px">Sin archivo nuevo</span></div></div>'
      + '<label class="ce-l">Fecha de aplicación por la aseguradora<input id="cc-aplicacion" class="o-sel" type="date" value="' + U.esc(c.applicationDate || '') + '"></label>'
      + '<label class="ce-l">Número de factura<input id="cc-numero" class="o-sel" value="' + U.esc(c.invoiceNumber || c.numeroFactura || '') + '" placeholder="Opcional"></label>'
      + '<div class="ce-l"><span style="font-size:12.5px;font-weight:600;color:var(--ink-2);margin-bottom:7px;display:block">Factura / soporte de aplicación <span class="muted">(opcional)</span></span>'
      + '<div style="display:flex;gap:8px;align-items:center"><button class="btn ghost sm" id="cc-btn">⬆ Adjuntar factura</button><span id="cc-name" class="muted" style="font-size:12px">Sin archivo nuevo</span></div></div>'
      + '</div><div data-cobros-modal-footer="reconcile" style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end;align-items:center;flex-wrap:wrap;position:sticky;bottom:0;background:var(--card);z-index:2">'
      + '<span id="cc-save-state" class="muted" aria-live="polite" style="font-size:12px;margin-right:auto"></span><button class="btn ghost" id="cc-cancel">Cancelar</button><button class="btn primary" id="cc-ok">Guardar aplicación</button></div></div>';
    document.body.appendChild(pm);
    let invoiceFile = null, paymentFile = null;
    const close = () => pm.remove();
    pm.addEventListener('click', e => { if (e.target === pm) close(); });
    pm.querySelector('#cc-x').onclick = close; pm.querySelector('#cc-cancel').onclick = close;
    pm.querySelector('#cc-pay-btn').onclick = () => {
      const fi=document.createElement('input'); fi.type='file'; fi.accept='.pdf,image/*';
      fi.onchange=()=>{ paymentFile=fi.files&&fi.files[0]||null; pm.querySelector('#cc-pay-name').textContent=paymentFile?paymentFile.name:'Sin archivo nuevo'; };
      fi.click();
    };
    pm.querySelector('#cc-btn').onclick = () => {
      const fi=document.createElement('input'); fi.type='file'; fi.accept='.pdf,image/*';
      fi.onchange=()=>{ invoiceFile=fi.files&&fi.files[0]||null; pm.querySelector('#cc-name').textContent=invoiceFile?invoiceFile.name:'Sin archivo nuevo'; };
      fi.click();
    };
    pm.querySelector('#cc-ok').onclick = async () => {
      const btn=pm.querySelector('#cc-ok'),state=pm.querySelector('#cc-save-state');
      btn.disabled=true;btn.textContent='Guardando…';pm.setAttribute('aria-busy','true');
      if(state)state.textContent='Guardando documentos y confirmando persistencia…';
      try {
        const [paymentSupportDocumentRef,invoiceDocumentRef] = await Promise.all([
          uploadPaymentDocument(paymentFile,'payment_support',c,receipt.id),
          uploadPaymentDocument(invoiceFile,'insurer_invoice',c,receipt.id)
        ]);
        if(state)state.textContent='Confirmando aplicación y documentos…';
        const domain=Orbit.reconciliationDomain;
        if(!domain||typeof domain.reconcilePayment!=='function') throw new Error('PAYMENT_DOMAIN_UNAVAILABLE');
        const origin=paymentOriginKind(receipt) === 'CRM_DIRECT' ? 'crm_migrated_direct' : 'insurer_invoice';
        const saved=await domain.reconcilePayment(receipt.id,{payload:{
          paymentOriginSource:origin,
          paidDate:pm.querySelector('#cc-paid').value||'',
          paymentMethod:pm.querySelector('#cc-method').value.trim(),
          paymentSupportDocumentRef,
          applicationDate:pm.querySelector('#cc-aplicacion').value||'',
          invoiceNumber:pm.querySelector('#cc-numero').value.trim(),
          invoiceDocumentRef,
          applicationEvidenceType:'MANUAL_RECONCILIATION'
        }});
        close(); U.toast(saved&&saved.documentLifecycleOk===false?'✓ Pago conciliado. Un documento quedó en recuperación controlada.':'✓ Pago conciliado y datos actualizados');
        baseCache=null;/* B3-004 R14: router/store reactive owner preserves the active payment context. */
      } catch(error) {
        console.error('[Gravicentra][Cobros] Aplicación falló',{code:String(error&&(error.code||error.message)||'UNKNOWN'),trace:error&&error.gravicentraPayment||{},receiptId:receipt.id||''});
        btn.disabled=false;btn.textContent='Guardar aplicación';pm.removeAttribute('aria-busy');if(state)state.textContent='No se guardaron cambios.';
        U.toast(isPreviewHost()?'La prueba Preview no fue aceptada por el servidor. No se guardaron cambios.':'No fue posible guardar la aplicación del pago.');
      }
    };
  }


  function reportarPago(cobroOrReceiptId) {
    if (!advisorRole()) return U.toast('El rol activo no corresponde a Asesor para reportar este pago.');
    const ctx = paymentContext(cobroOrReceiptId);
    if (!ctx || !ctx.receipt) return U.toast('No fue posible identificar un único recibo esperado para reportar el pago.');
    const c=ctx.cobro, receipt=ctx.receipt;
    if(!previewGuard(receipt)) return false;
    let pm=document.getElementById('cob-report-advisor'); if(pm)pm.remove();
    pm=document.createElement('div');pm.id='cob-report-advisor';pm.className='drawer-back open';pm.style.cssText='display:grid;place-items:center;z-index:210';
    pm.innerHTML='<div class="card" style="width:min(500px,95vw);padding:0;max-height:92vh;overflow:auto">'
      +'<div style="padding:16px 20px;background:linear-gradient(120deg,var(--graph),#10141a);display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:11px;font-weight:700;letter-spacing:.1em;color:rgba(255,255,255,.6);text-transform:uppercase">Cobros · asesor</div><b style="font-family:var(--f-display);font-size:16px;color:#fff">Reportar pago</b></div><button class="imp-x" id="ra-x" style="background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.25);color:#fff">✕</button></div>'
      +'<div style="padding:18px 20px;display:grid;gap:12px"><div class="cfg-note">Este reporte <b>no aplica el pago</b>. Se enviará a Ops para que Operativo valide la correspondencia y aplique el mismo pago. El soporte es opcional.</div>'
      +'<label class="ce-l">Fecha real del pago <span class="muted">(opcional)</span><input id="ra-paid" class="o-sel" type="date" value="'+U.esc(c.paidDate||c.fechaPago||c.fechaPagoReportada||'')+'"></label>'
      +'<label class="ce-l">Método de pago <span class="muted">(opcional)</span><select id="ra-method" class="o-sel"><option value="">Sin especificar</option><option>Transferencia bancaria</option><option>Tarjeta de crédito</option><option>Tarjeta de débito</option><option>Cheque</option><option>Efectivo</option><option>Visa cuotas</option><option>Link de pago</option></select></label>'
      +'<div class="ce-l"><span style="font-size:12.5px;font-weight:600;color:var(--ink-2);display:block;margin-bottom:7px">Soporte del pago <span class="muted">(opcional)</span></span><div style="display:flex;gap:8px;align-items:center"><button class="btn ghost sm" id="ra-support-btn">⬆ Adjuntar soporte</button><span id="ra-support-name" class="muted" style="font-size:12px">Sin archivo</span></div></div>'
      +'<label class="ce-l">Observación <span class="muted">(opcional)</span><textarea id="ra-note" class="o-sel" style="min-height:64px" placeholder="Ej. Cliente envió comprobante por WhatsApp"></textarea></label>'
      +'</div><div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" id="ra-cancel">Cancelar</button><button class="btn primary" id="ra-ok">Enviar a Ops</button></div></div>';
    document.body.appendChild(pm);
    let supportFile=null; const close=()=>pm.remove();
    pm.addEventListener('click',e=>{if(e.target===pm)close();});pm.querySelector('#ra-x').onclick=close;pm.querySelector('#ra-cancel').onclick=close;
    pm.querySelector('#ra-support-btn').onclick=()=>{const fi=document.createElement('input');fi.type='file';fi.accept='.pdf,image/*';fi.onchange=()=>{supportFile=fi.files&&fi.files[0]||null;pm.querySelector('#ra-support-name').textContent=supportFile?supportFile.name:'Sin archivo';};fi.click();};
    pm.querySelector('#ra-ok').onclick=async()=>{
      const btn=pm.querySelector('#ra-ok');btn.disabled=true;
      try{
        const domain=Orbit.reconciliationDomain;if(!domain||typeof domain.reportAdvisorPayment!=='function')throw new Error('ADVISOR_PAYMENT_REPORT_DOMAIN_UNAVAILABLE');
        const supportRef=await uploadPaymentDocument(supportFile,'payment_support',c,receipt.id);
        const reported=await domain.reportAdvisorPayment(receipt.id,{payload:{
          paidDate:pm.querySelector('#ra-paid').value||'',
          paymentMethod:pm.querySelector('#ra-method').value||'',
          paymentSupportDocumentRef:supportRef,
          amount:c.monto,
          note:pm.querySelector('#ra-note').value.trim()
        }});
        close();U.toast(reported&&reported.documentLifecycleOk===false?'✓ Pago reportado. El soporte quedó en recuperación controlada.':'✓ Pago reportado y enviado a Ops para validación');
        baseCache=null;/* B3-004 R14: router/store reactive owner preserves the active payment context. */
      }catch(error){btn.disabled=false;U.toast('No fue posible enviar el reporte de pago a Ops.');}
    };
  }

  /* ---- Compatibilidad: un pago reportado por el cliente se aplica automáticamente si el recibo es único ---- */
  async function validarReporte(cobroId) {
    const ctx = paymentContext(cobroId); if (!ctx) return U.toast('El reporte no tiene un recibo único; requiere revisión de relación, no validación manual del pago.');
    const c = ctx.cobro, receipt = ctx.receipt;
    if (!receipt) return U.toast('El reporte no tiene un recibo único; requiere revisión de relación, no validación manual del pago.');
    if(!previewGuard(receipt)) return false;
    const domain=Orbit.reconciliationDomain;
    if(!domain||typeof domain.reportClientPayment!=='function') return U.toast('Aplicación canónica de pagos no disponible.');
    try {
      await domain.reportClientPayment(receipt.id,{payload:{
        paidDate:c.fechaPagoReportada||c.fechaPago||receipt.fechaPagoReportada||receipt.paidDate||'',
        evidenceAsOfDate:c.reportado||receipt.evidenceAsOfDate||receipt.fechaCorteFuente||'',
        paymentMethod:c.metodoPago||c.metodo||receipt.paymentMethod||receipt.metodoPago||'',
        paymentSupportDocumentRef:c.paymentSupportDocumentRef||receipt.paymentSupportDocumentRef||''
      }});
      U.toast('✓ Pago reportado aplicado');baseCache=null;
      /* B3-004 R14: router/store reactive owner preserves the active payment context. */
    } catch(error) {
      U.toast('No fue posible aplicar el pago reportado.');
    }
  }

  /* ---- Registrar pago por el owner canónico: pago y aplicación son hechos distintos ---- */
  function aplicarPago(cobroId) {
    if (!directPaymentRole()) return U.toast('El rol Asesor reporta el pago a Ops; no puede aplicarlo directamente.');
    const ctx = paymentContext(cobroId);
    if(!ctx) return U.toast('No fue posible identificar un único recibo esperado para registrar el pago.');
    const c=ctx.cobro, receipt=ctx.receipt;
    if(!receipt) return U.toast('No fue posible identificar un único recibo esperado para registrar el pago.');
    if(!previewGuard(receipt)) return false;
    const p=S().get('polizas',c.polizaId)||{};
    const cli=S().get('clientes',c.clienteId)||{};
    let pm=document.getElementById('cob-pay'); if(pm)pm.remove();
    pm=document.createElement('div');pm.id='cob-pay';pm.className='drawer-back open';pm.style.cssText='display:grid;place-items:center;z-index:210;padding:12px;box-sizing:border-box;overflow:auto';
    pm.innerHTML='<div class="card" style="width:min(520px,100%);padding:0;max-height:calc(100dvh - 24px);overflow:auto;display:flex;flex-direction:column">'
      +'<div style="padding:16px 20px;background:linear-gradient(120deg,var(--graph),#10141a);display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:11px;font-weight:700;letter-spacing:.1em;color:rgba(255,255,255,.6);text-transform:uppercase">Cobros · registrar pago</div><b style="font-family:var(--f-display);font-size:16px;color:#fff">💳 '+U.money(c.monto,c.moneda)+'</b></div><button class="imp-x" id="pm-x" style="background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.25);color:#fff">✕</button></div>'
      +'<div style="padding:18px 20px;display:grid;gap:12px">'
      +'<div class="cfg-note"><b>Pago</b> y <b>aplicación de la aseguradora</b> son fechas distintas. Ningún soporte es obligatorio. Si no conoces un dato, puede completarse después sin duplicar el cobro.</div>'
      +'<label class="ce-l">Fecha real del pago <span class="muted">(opcional)</span><input id="pm-paid" class="o-sel" type="date" value="'+U.esc(c.paidDate||c.fechaPago||'')+'"></label>'
      +'<label class="ce-l">Método de pago <span class="muted">(opcional)</span><select id="pm-metodo" class="o-sel"><option value="">Sin especificar</option><option>Transferencia bancaria</option><option>Tarjeta de crédito</option><option>Tarjeta de débito</option><option>Cheque</option><option>Efectivo</option><option>Visa cuotas</option><option>Link de pago</option></select></label>'
      +'<div class="ce-l"><span style="font-size:12.5px;font-weight:600;color:var(--ink-2);display:block;margin-bottom:7px">Soporte del pago del cliente <span class="muted">(opcional)</span></span><div style="display:flex;gap:8px;align-items:center"><button class="btn ghost sm" id="pm-support-btn">⬆ Adjuntar soporte</button><span id="pm-support-name" class="muted" style="font-size:12px">Sin archivo</span></div></div>'
      +'<hr style="border:0;border-top:1px solid var(--line)">'
      +'<label class="ce-l">Fecha de aplicación por la aseguradora <span class="muted">(opcional)</span><input id="pm-app" class="o-sel" type="date" value="'+U.esc(c.applicationDate||'')+'"></label>'
      +'<label class="ce-l">Número de factura <span class="muted">(opcional)</span><input id="pm-invoice-number" class="o-sel" value="'+U.esc(c.invoiceNumber||c.numeroFactura||'')+'"></label>'
      +'<div class="ce-l"><span style="font-size:12.5px;font-weight:600;color:var(--ink-2);display:block;margin-bottom:7px">Factura / soporte de aplicación <span class="muted">(opcional)</span></span><div style="display:flex;gap:8px;align-items:center"><button class="btn ghost sm" id="pm-invoice-btn">⬆ Adjuntar factura</button><span id="pm-invoice-name" class="muted" style="font-size:12px">Sin archivo</span></div></div>'
      +'<label class="ce-l" style="display:flex;align-items:center;gap:8px;flex-direction:row;cursor:pointer"><input id="pm-avisar" type="checkbox" checked style="width:auto"> Avisar al cliente después de registrar</label>'
      +'</div><div data-cobros-modal-footer="apply" style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end;align-items:center;flex-wrap:wrap;position:sticky;bottom:0;background:var(--card);z-index:2"><span id="pm-save-state" class="muted" aria-live="polite" style="font-size:12px;margin-right:auto"></span><button class="btn ghost" id="pm-cancel">Cancelar</button><button class="btn primary" id="pm-ok">Registrar pago</button></div></div>';
    document.body.appendChild(pm);
    let supportFile=null,invoiceFile=null;
    const close=()=>pm.remove();
    pm.addEventListener('click',e=>{if(e.target===pm)close();});pm.querySelector('#pm-x').onclick=close;pm.querySelector('#pm-cancel').onclick=close;
    const choose=(id,label,setter)=>{pm.querySelector(id).onclick=()=>{const fi=document.createElement('input');fi.type='file';fi.accept='.pdf,image/*';fi.onchange=()=>{const file=fi.files&&fi.files[0]||null;setter(file);pm.querySelector(label).textContent=file?file.name:'Sin archivo';};fi.click();};};
    choose('#pm-support-btn','#pm-support-name',f=>supportFile=f);choose('#pm-invoice-btn','#pm-invoice-name',f=>invoiceFile=f);
    pm.querySelector('#pm-ok').onclick=async()=>{
      const btn=pm.querySelector('#pm-ok'),state=pm.querySelector('#pm-save-state');
      btn.disabled=true;btn.textContent='Guardando…';pm.setAttribute('aria-busy','true');if(state)state.textContent='Guardando documentos…';
      try{
        const domain=Orbit.reconciliationDomain;if(!domain||typeof domain.applyPayment!=='function')throw new Error('PAYMENT_DOMAIN_UNAVAILABLE');
        const [supportRef,invoiceRef]=await Promise.all([
          uploadPaymentDocument(supportFile,'payment_support',c,receipt.id),
          uploadPaymentDocument(invoiceFile,'insurer_invoice',c,receipt.id)
        ]);
        if(state)state.textContent='Registrando pago y confirmando persistencia…';
        const applied=await domain.applyPayment(receipt.id,{payload:{
          sourceType:'manual',
          paidDate:pm.querySelector('#pm-paid').value||'',
          paymentMethod:pm.querySelector('#pm-metodo').value||'',
          paymentSupportDocumentRef:supportRef,
          applicationDate:pm.querySelector('#pm-app').value||'',
          invoiceNumber:pm.querySelector('#pm-invoice-number').value.trim(),
          invoiceDocumentRef:invoiceRef,
          amount:c.monto
        }});
        const avisar=pm.querySelector('#pm-avisar')&&pm.querySelector('#pm-avisar').checked;
        const docsOk=!(applied&&applied.documentLifecycleOk===false);
        close();U.toast(docsOk?'✓ Pago registrado':'✓ Pago registrado. Un documento quedó en recuperación controlada.');baseCache=null;
        if(docsOk&&avisar&&Orbit.notify&&cli&&cli.id){Orbit.notify.pedir(cli.id,{tipo:'Aviso de pago confirmado',icon:'💳',asunto:'Confirmación de pago · póliza '+(p.numero||''),mensaje:'Hola '+(cli.nombre||'')+', registramos tu pago de '+U.money(c.monto,c.moneda)+' (cuota '+(c.cuota||'')+') de la póliza '+(p.numero||'')+'. ¡Gracias por tu confianza!'});}
        /* B3-004 R14: router/store reactive owner preserves the active payment context. */
      }catch(error){console.error('[Gravicentra][Cobros] Registrar pago falló',{code:String(error&&(error.code||error.message)||'UNKNOWN'),trace:error&&error.gravicentraPayment||{},cobroId:c.id||'',receiptId:receipt.id||''});btn.disabled=false;btn.textContent='Registrar pago';pm.removeAttribute('aria-busy');if(state)state.textContent='No se guardaron cambios.';U.toast(isPreviewHost()?'La prueba Preview no fue aceptada por el servidor. No se guardaron cambios.':'No fue posible registrar el pago. No se guardaron cambios.');}
    };
  }

  /* ---- Preparación de cobro por LOTE (selecciona recibos pendientes/vencidos) ---- */
  function lote() {
    const idx = buildIndex();
    const arr = S().all('cobros').filter(c => (c.estado === 'Pendiente' || c.estado === 'Vencido') && countryMatches(c, idx)).sort((a, b) => (a.vence || '').localeCompare(b.vence || ''));
    const incl = new Set(arr.map(c => c.id));
    let back = document.getElementById('cob-lote'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'cob-lote'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 96;
    function paint() {
      const sel = arr.filter(c => incl.has(c.id));
      const tot = sel.reduce((s, c) => s + q.norm(c.monto, c.moneda), 0);
      back.querySelector('#lo-body').innerHTML = arr.map(c => {
        const cli = S().get('clientes', c.clienteId), p = S().get('polizas', c.polizaId), d = U.daysFromNow(c.vence);
        return `<label class="lote-row ${incl.has(c.id) ? '' : 'off'}">
          <input type="checkbox" data-lo="${c.id}" ${incl.has(c.id) ? 'checked' : ''}>
          <span style="flex:1;min-width:0"><b>${cli ? U.esc(cli.nombre) : '—'}</b> <span class="muted" style="font-size:11.5px">· ${p ? U.esc(U.text(p.numero, '—')) : '—'} · ${U.esc(U.text(c.cuota, '—'))}</span><br><span class="muted" style="font-size:11px">${d == null ? 'Vencimiento pendiente' : d < 0 ? 'venció hace ' + (-d) + 'd' : 'vence en ' + d + 'd'}</span></span>
          <span class="mono">${U.money(c.monto, c.moneda)}</span></label>`;
      }).join('') || '<div class="muted" style="padding:18px;text-align:center">Sin recibos pendientes.</div>';
      back.querySelector('#lo-tot').textContent = U.money(tot, Orbit.q.monedaPais());
      back.querySelector('#lo-n').textContent = sel.length + ' de ' + arr.length + ' recibos';
      back.querySelectorAll('[data-lo]').forEach(x => x.addEventListener('change', () => { x.checked ? incl.add(x.dataset.lo) : incl.delete(x.dataset.lo); paint(); }));
    }
    back.innerHTML = `<div class="card" style="width:min(620px,95vw);max-height:92vh;display:flex;flex-direction:column;padding:0">
      <div style="padding:17px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:16px">📤 Preparación de cobro por lote</b><button class="imp-x" id="lo-x">✕</button></div>
      <div class="cfg-note" style="margin:14px 16px 0">Selecciona los recibos para preparar recordatorios. Se registran en el historial y se preparan correos en la bandeja central. WhatsApp/correo reales requieren canal conectado y confirmación del proveedor.</div>
      <div id="lo-body" style="padding:12px 16px;overflow:auto;flex:1;display:grid;gap:7px"></div>
      <div style="padding:14px 20px;border-top:1px solid var(--line)">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px"><span class="muted" id="lo-n"></span><span style="font-family:var(--f-display);font-weight:800;font-size:20px" id="lo-tot"></span></div>
        <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" id="lo-cancel">Cancelar</button><button class="btn primary" id="lo-ok">📲 Preparar recordatorios</button></div>
      </div></div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#lo-x').addEventListener('click', close);
    back.querySelector('#lo-cancel').addEventListener('click', close);
    back.querySelector('#lo-ok').addEventListener('click', () => {
      const sel = arr.filter(c => incl.has(c.id));
      sel.forEach(c => {
        const cli = S().get('clientes', c.clienteId), p = S().get('polizas', c.polizaId);
        const msg = Orbit.ia ? Orbit.ia.redactar('cobro', { nombre: cli ? cli.nombre.split(' ')[0] : '', poliza: p ? p.numero : '', monto: U.money(c.monto, c.moneda), vence: U.fmtDate(c.vence) }) : 'Recordatorio de cobro';
        S().insert('actividades', { id: 'act' + Date.now() + Math.floor(Math.random() * 999), clienteId: c.clienteId, asesorId: c.asesorId, tipo: 'sistema', icon: '📤', fecha: Orbit.ui.today(), titulo: 'Recordatorio de cobro preparado', detalle: 'Pendiente de canal conectado · ' + (p ? p.numero : '') + ' · ' + U.money(c.monto, c.moneda) });
        S().update('cobros', c.id, { recordatorioPreparado: Orbit.ui.today() });
        if (Orbit.correo && cli) Orbit.correo.enviar({ para: cli.email || '', asunto: 'Recordatorio de pago · ' + (p ? p.numero : ''), cuerpo: msg, clienteId: c.clienteId, vinculo: { tipo: 'cobro', id: c.id, label: 'Recibo ' + c.cuota } });
      });
      close();
      const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = '✓ ' + sel.length + ' recordatorios preparados; envío real requiere canal conectado'; document.body.appendChild(t); setTimeout(() => t.remove(), 2800);
      render(document.getElementById('host'));
    });
    paint();
  }

  return { render, detalle, reportarPago, aplicarPago, validarReporte, conciliarFactura, resolveReceiptId, lote, pagina };
})();