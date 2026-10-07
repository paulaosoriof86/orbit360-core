/* ============================================================
   Orbit 360 · CRM · Pólizas (vista global) — owner productivo
   Cartera completa con filtros, paginación e índices de lectura.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.polizas = (function () {
  const U = Orbit.ui, q = Orbit.q, K = Orbit.kit, S = () => Orbit.store;
  const PAGE_SIZE = 100;
  const MODULE_KEY = 'polizas';
  const PC = id => (window.Orbit && Orbit.clientProjection && Orbit.clientProjection.get(id)) || S().get('clientes', id);
  let st = { fq: '', framo: '', fasg: '', fase: '', fest: '', sort: 'vence', page: 0 };
  let indexCache = null, searchTimer = null;
  function invalidateIndexes() { indexCache = null; }
  function rerender(host) {
    if (!host || !host.isConnected) return;
    const store=Orbit.store;
    const alreadyScoped=!!(store && Object.prototype.hasOwnProperty.call(store,'_scopedFor') && String(store._scopedFor||'')===MODULE_KEY);
    if (alreadyScoped || !Orbit.access || typeof Orbit.access.withScope!=='function') return render(host);
    return Orbit.access.withScope(MODULE_KEY, function(){ return render(host); });
  }
  window.addEventListener('orbit:store:emit', event => {
    const collection = event && event.detail && event.detail.collection;
    if (!collection || ['*','polizas','clientes','vehiculos','aseguradoras','asesores'].includes(collection)) invalidateIndexes();
  });
  document.addEventListener('orbit:session', invalidateIndexes);

  const numberOrNull = v => {
    if (v == null || String(v).trim() === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const policyPremiumTotal = p => numberOrNull(p && (p.primaTotal != null ? p.primaTotal : p.prima));
  const policyPremiumNet = p => numberOrNull(p && (p.primaNeta != null ? p.primaNeta : p.prima));
  const M = (v, cur) => { const n = numberOrNull(v); return n == null ? 'Pendiente de completar' : U.money(n, cur); };
  const ACTIVE_STATES = new Set(['Vigente', 'Por renovar']);
  const HISTORICAL_STATES = new Set(['Renovada', 'Cancelada', 'Histórica', 'No Renovada', 'Reexpedida', 'Vencida', 'Anulada', 'Rechazada']);
  const isActivePolicy = p => !!p && ACTIVE_STATES.has(p.estado);
  const isHistoricalNoPortfolio = p => !!p && HISTORICAL_STATES.has(p.estado);
  const renewabilityState = p => {
    if (!p || !Object.prototype.hasOwnProperty.call(p, 'renovable') || p.renovable == null || String(p.renovable).trim() === '') return 'UNKNOWN';
    if (p.renovable === true || ['true', 'si', 'sí', 'renovable'].includes(String(p.renovable).trim().toLowerCase())) return 'YES';
    if (p.renovable === false || ['false', 'no', 'no renovable'].includes(String(p.renovable).trim().toLowerCase())) return 'NO';
    return 'UNKNOWN';
  };
  const isRenewalWithin45Days = p => {
    const d = U.daysFromNow(p && (p.vigenciaFin || p.fechaFin || p.fechaVencimiento || p.finVigencia));
    return isActivePolicy(p) && d != null && d >= 0 && d <= 45;
  };
  const premiumByCurrency = (policies, I) => {
    const out = {};
    (policies || []).filter(isActivePolicy).forEach(p => {
      const n = policyPremiumNet(p);
      if (n == null) return;
      const cli = I && I.clientsById ? (I.clientsById.get(p.clienteId) || {}) : (PC(p.clienteId) || {});
      const cur = String(p.moneda || p.divisa || cli.moneda || 'SIN_MONEDA').trim() || 'SIN_MONEDA';
      out[cur] = (out[cur] || 0) + n;
    });
    return out;
  };
  const currencyRank = x => x === 'GTQ' ? 0 : x === 'COP' ? 1 : 2;
  const premiumByCurrencyHtml = totals => Object.keys(totals).sort((a, b) => currencyRank(a) - currencyRank(b) || a.localeCompare(b))
    .map(cur => `<span style="display:block;font-size:${Object.keys(totals).length > 1 ? '14px' : '22px'}">${U.esc(cur)} ${Number(totals[cur] || 0).toLocaleString('es-GT', { maximumFractionDigits: 0 })}</span>`).join('') || '<span class="muted">Sin valores</span>';

  const FDEFS = I => [
    { id: 'fq', type: 'search', ph: 'Buscar póliza, cliente, placa, vehículo…' },
    { id: 'framo', type: 'select', ph: 'Ramo', options: I.ramoOptions },
    { id: 'fasg', type: 'select', ph: 'Aseguradora', options: I.insurerOptions },
    { id: 'fase', type: 'select', ph: 'Asesor', options: I.advisorOptions },
    { id: 'fest', type: 'select', ph: 'Estado', options: ['Vigente', 'Por renovar', 'Vencida', 'Cancelada', 'Anulada', 'Rechazada', 'Requiere validación'].map(v => ({ v, t: v })) }
  ];

  function relationDataReady() {
    const store=S();
    if (!store || typeof store._productStatus !== 'function') return true;
    const ps=store._productStatus() || {}, confirmed=ps.serverConfirmedCollections || [];
    return confirmed.indexOf('polizas') >= 0 && confirmed.indexOf('clientes') >= 0;
  }

  function buildIndexes() {
    if (indexCache) return indexCache;
    const policies = S().all('polizas') || [];
    const clients = S().all('clientes') || [];
    const insurers = S().all('aseguradoras') || [];
    const advisors = S().all('asesores') || [];
    const clientsById = new Map();
    clients.forEach(c => { if (c && c.id != null) clientsById.set(c.id, c); });
    const insurersById = new Map(insurers.filter(x=>x&&x.id!=null).map(x=>[x.id,x]));
    const advisorsById = new Map(advisors.filter(x=>x&&x.id!=null).map(x=>[x.id,x]));
    const ramoOptions=[...new Set(policies.map(p=>p&&p.ramo).filter(Boolean))].sort().map(r=>({v:r,t:r}));
    const insurerOptions=insurers.filter(a=>a&&a.id!=null).map(a=>({v:a.id,t:a.nombre||a.displayName||a.id}));
    const advisorOptions=advisors.filter(a=>a&&a.id!=null).map(a=>({v:a.id,t:a.nombre||a.id}));
    indexCache = {
      policies, clientsById, insurersById, advisorsById,
      ramoOptions, insurerOptions, advisorOptions,
      basicSearchIndex:null, vehicleSearchIndex:null
    };
    return indexCache;
  }

  function ensureBasicSearchIndex(I) {
    if (I.basicSearchIndex) return I.basicSearchIndex;
    const out=new Map();
    I.policies.forEach(p => {
      if (!p || p.id == null) return;
      const cli=I.clientsById.get(p.clienteId) || null;
      const clienteTxt=cli ? [cli.nombre,cli.identificacion,cli.email,cli.telefono].filter(Boolean).join(' ') : '';
      out.set(p.id,[p.numero,p.ramo,p.producto,p.subramo,clienteTxt,p.placa].filter(Boolean).join(' ').toLowerCase());
    });
    I.basicSearchIndex=out;
    return out;
  }

  function ensureVehicleSearchIndex(I) {
    if (I.vehicleSearchIndex) return I.vehicleSearchIndex;
    const out=new Map();
    const vehicles=S().all('vehiculos') || [];
    vehicles.forEach(v => {
      if (!v || !v.polizaId) return;
      const text=[v.placa,v.placaNormalizada,v.placaFuente,v.marca,v.linea,v.modelo,v.anio].filter(Boolean).join(' ').toLowerCase();
      if (!text) return;
      const key=v.polizaId, previous=out.get(key) || '';
      out.set(key,(previous+' '+text).trim());
    });
    I.vehicleSearchIndex=out;
    return out;
  }

  function countryCode(v) { return String(v == null ? '' : v).trim().toUpperCase(); }
  function policiesForActiveCountry(I) {
    const selected=countryCode(Orbit.pais);
    if (!selected || selected==='TODOS') return I.policies;
    return I.policies.filter(p => {
      const cli=I.clientsById.get(p&&p.clienteId) || null;
      return countryCode(p&&p.pais || cli&&cli.pais)===selected;
    });
  }
  function clientCell(id,I) {
    const c=I.clientsById.get(id); if(!c) return '—';
    const nombre=c.nombre||'Cliente',tipo=c.tipo||'Pendiente de completar',pais=c.pais||'';
    const meta=pais ? U.esc(tipo)+' · '+U.esc(pais) : U.esc(tipo);
    return '<a style="display:flex;align-items:center;gap:10px;cursor:pointer" onclick="event.stopPropagation();location.hash=\'#/cliente360?c='+U.esc(c.id||id||'')+'\'">'+
      U.avatar(nombre,tipo==='Empresa'?'#1E2227':'#C5162E','sm')+
      '<span style="min-width:0"><span style="font-weight:600;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px">'+U.esc(nombre)+'</span>'+
      '<span class="muted" style="font-size:11px">'+meta+'</span></span></a>';
  }
  function insurerCell(id,I) {
    const a=I.insurersById.get(id); if(!a) return '—';
    return '<span style="display:flex;align-items:center;gap:7px"><span class="dot-s" style="background:'+U.esc(a.color||'')+'"></span>'+U.esc(a.nombre||a.displayName||'—')+'</span>';
  }
  function advisorCell(id,I) {
    const a=I.advisorsById.get(id); if(!a) return '—';
    return '<span style="display:flex;align-items:center;gap:7px"><span class="dot-s" style="background:'+U.esc(a.color||'')+'"></span>'+U.esc(a.nombre||'—')+'</span>';
  }

  function rows(I, source) {
    const query=String(st.fq||'').trim().toLowerCase();
    const basic=query ? ensureBasicSearchIndex(I) : null;
    const vehicle=query ? ensureVehicleSearchIndex(I) : null;
    return (source || I.policies || []).filter(p => {
      const searchOk=!query || String(basic.get(p.id)||'').includes(query) || String(vehicle.get(p.id)||'').includes(query);
      const grouped = !st.fkind || (st.fkind === 'renewals45' ? isRenewalWithin45Days(p) : st.fkind === 'historical' ? isHistoricalNoPortfolio(p) : st.fkind === 'active' ? isActivePolicy(p) : true);
      return grouped && searchOk &&
        (!st.framo || p.ramo === st.framo) &&
        (!st.fasg || p.aseguradoraId === st.fasg) &&
        (!st.fase || p.asesorId === st.fase) &&
        (!st.fest || p.estado === st.fest);
    }).sort((a, b) => st.sort === 'prima' ? ((policyPremiumTotal(b) || 0) - (policyPremiumTotal(a) || 0)) : String(a.vigenciaFin || '').localeCompare(String(b.vigenciaFin || '')));
  }

  function render(host) {
    try { if(S()&&typeof S()._ensureCollections==='function') S()._ensureCollections(['polizas','clientes']); } catch (_) {}
    if (!relationDataReady()) {
      host.innerHTML = '<div class="page" data-polizas-relations-loading="1"><div class="card pad"><b>Cargando pólizas…</b><div class="muted" style="margin-top:5px">Estamos preparando clientes y relaciones para mostrar la cartera sin datos incompletos.</div></div></div>';
      return;
    }
    const I = buildIndexes();
    const all = policiesForActiveCountry(I);
    const defs = FDEFS(I);
    const vig = all.filter(isActivePolicy);
    const primaVigentePorMoneda = premiumByCurrency(all,I);
    const renovaciones45 = all.filter(isRenewalWithin45Days);
    const historicasSinCartera = all.filter(isHistoricalNoPortfolio);
    const otherPolicyCount = Math.max(0, all.length - vig.length - historicasSinCartera.length);
    const r = rows(I, all);
    const pages = Math.max(1, Math.ceil(r.length / PAGE_SIZE));
    if (st.page >= pages) st.page = 0;
    const start = st.page * PAGE_SIZE;
    const shown = r.slice(start, start + PAGE_SIZE).slice(0, PAGE_SIZE);
    st.__count = r.length + ' de ' + all.length;

    host.innerHTML = `<div class="page" data-polizas-kpi-ready="1" data-polizas-total="${all.length}" data-polizas-active="${vig.length}" data-polizas-renew45="${renovaciones45.length}" data-polizas-historical="${historicasSinCartera.length}">
      ${K.bannerFor('polizas', `<button class="btn primary" onclick="Orbit.modules.cliente360.nuevaPoliza()">+ Nueva póliza</button>`)}
      ${K.kpis([
        { label: 'Pólizas activas', val: vig.length + ' <small>/ ' + all.length + '</small>', color: 'var(--red)', foot: 'Vigente + Por renovar' + (otherPolicyCount ? ' · ' + otherPolicyCount + ' otros/validar' : ''), onclick: "Orbit.modules.polizas.filtrarGrupo('active')" },
        { label: 'Prima neta vigente', val: premiumByCurrencyHtml(primaVigentePorMoneda), color: 'var(--ok)', foot: 'separada por moneda · no se suman GTQ y COP', onclick: "Orbit.modules.polizas.filtrarEstado('Vigente')" },
        { label: 'Vencen ≤45 d', val: renovaciones45.length, color: 'var(--warn)', foot: 'activas con vencimiento en 0–45 días', onclick: "Orbit.modules.polizas.filtrarGrupo('renewals45')" },
        { label: 'Histórico / sin cartera', onclick: "Orbit.modules.polizas.filtrarGrupo('historical')", val: historicasSinCartera.length, color: 'var(--danger)', foot: 'ediciones no vigentes sin cartera activa' }
      ])}
      <div class="card" style="overflow:hidden">
        ${K.filterBar(defs, st)}
        <div style="overflow-x:auto"><table class="tbl">
          <thead><tr><th>Póliza</th><th>Cliente</th><th>Ramo / Producto</th><th>Aseguradora</th><th>Asesor</th><th class="num">Prima total</th><th>Vence</th><th>Estado</th><th></th></tr></thead>
          <tbody>${shown.map(p => `<tr class="clickable" onclick="Orbit.modules.cliente360.verPoliza('${p.id}')">
            <td><span class="mono" style="font-size:12.5px;font-weight:600">${U.esc(p.numero || '')}</span><div class="muted" style="font-size:11px">${U.esc(p.formaPago || p.forma || p.frecuencia || '—')}</div></td>
            <td>${clientCell(p.clienteId,I)}</td>
            <td><b>${U.esc(p.ramo || '—')}</b><div class="muted" style="font-size:12px">${U.esc(p.producto || p.subramo || '—')}</div></td>
            <td>${insurerCell(p.aseguradoraId,I)}</td>
            <td>${advisorCell(p.asesorId,I)}</td>
            <td class="num">${M(policyPremiumTotal(p), p.moneda)}</td>
            <td style="font-size:12.5px">${U.fmtDate(p.vigenciaFin)}</td>
            <td>${U.estadoBadge(p.estado)}</td>
            <td style="text-align:right;color:var(--ink-3)"><button class="btn ghost sm" onclick="event.stopPropagation();Orbit.modules.polizas.verDesglose('${p.id}')" title="Desglose de prima y recibos">Desglose</button> ›</td></tr>`).join('') || emptyRow(9)}</tbody>
        </table></div>
        <div style="padding:10px 14px;border-top:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
          <span class="muted" style="font-size:12px">Mostrando ${r.length ? start + 1 : 0}–${Math.min(start + PAGE_SIZE, r.length)} de ${r.length}. Usa filtros para acotar la cartera.</span>
          <div style="display:flex;gap:8px"><button class="btn ghost sm" ${st.page <= 0 ? 'disabled' : ''} onclick="Orbit.modules.polizas.pagina(-1)">Anterior</button><span class="badge neutral">${st.page + 1} / ${pages}</span><button class="btn ghost sm" ${st.page >= pages - 1 ? 'disabled' : ''} onclick="Orbit.modules.polizas.pagina(1)">Siguiente</button></div>
        </div>
      </div></div>`;

    K.wireFilters(defs, st, (id, live) => {
      st.page = 0;
      if (live) {
        const input=document.getElementById('fq'), value=input ? input.value : st.fq;
        if (searchTimer) clearTimeout(searchTimer);
        searchTimer=setTimeout(() => {
          searchTimer=null;
          if (!host || !host.isConnected) return;
          rerender(host);
          const next=document.getElementById('fq');
          if (next) { next.focus(); next.value=value; next.setSelectionRange(value.length,value.length); }
        },180);
      } else {
        if (searchTimer) { clearTimeout(searchTimer); searchTimer=null; }
        rerender(host);
      }
    });
  }
  function emptyRow(n) { return `<tr><td colspan="${n}" class="muted" style="text-align:center;padding:30px">Sin resultados.</td></tr>`; }
  function filtrarEstado(e) { st.fkind = ''; st.fest = st.fest === e ? '' : e; st.page = 0; const host = document.getElementById('host'); if (host) rerender(host); }
  function filtrarGrupo(kind) { st.fest = ''; st.fkind = st.fkind === kind ? '' : kind; st.page = 0; const host = document.getElementById('host'); if (host) rerender(host); }
  function pagina(delta) { st.page = Math.max(0, st.page + delta); const host = document.getElementById('host'); if (host) rerender(host); }

  function receiptBreakdown(id) {
    const receipts = (S().all('recibosEsperados') || []).filter(r => r.polizaId === id);
    const sum = key => {
      const vals = receipts.map(r => numberOrNull(r[key])).filter(v => v != null);
      return vals.length ? vals.reduce((a,b)=>a+b,0) : null;
    };
    return { receipts, net:sum('primaNeta'), expedition:sum('gastosExpedicion'), finance:sum('gastosFinanciamiento'), sourceAdjustment:sum('descuento'), iva:sum('impuestosIVA'), total:sum('primaTotal') };
  }

  function verDesglose(id) {
    const p = S().get('polizas', id); if (!p) return;
    const cli = PC(p.clienteId) || {};
    const asg = q.aseguradora(p.aseguradoraId) || {};
    const cur = p.moneda || cli.moneda || Orbit.q.monedaPais();
    const rb = receiptBreakdown(id);
    const neta = policyPremiumNet(p);
    const total = policyPremiumTotal(p);
    const exped = numberOrNull(p.gastosEmision != null ? p.gastosEmision : p.gastosExpedicion);
    const finan = numberOrNull(p.gastosFinan != null ? p.gastosFinan : p.gastosFinanciamiento);
    const iva = numberOrNull(p.ivaMonto != null ? p.ivaMonto : (p.iva != null ? p.iva : p.impuestosIVA));
    const sourceAdjustment = numberOrNull(p.descuento);
    const recibos = rb.receipts;
    const genera = (p.estado === 'Vigente' || p.estado === 'Por renovar');
    const req = p.requiereValidacion || !p.pais || !p.moneda || p.estado === 'Requiere validación' || neta == null || total == null;
    const fuente = p.sourceRef || p._origenHoja || (p.importado ? 'Importación' : 'Carga manual');
    const filaFuente = p._numeroFila ? (' · fila ' + p._numeroFila) : '';
    const row = (k, v, extra) => `<div class="pt-det" style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--line)"><span class="muted">${k}</span><b style="${extra||''}">${v}</b></div>`;
    let back = document.getElementById('pol-desg'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'pol-desg'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 120;
    back.innerHTML = `<div class="card" style="width:min(620px,96vw);max-height:90vh;overflow:auto;padding:0">
      <div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">
        <div><b style="font-family:var(--f-display);font-size:16px">Póliza ${U.esc(p.numero || '')}</b><div class="muted" style="font-size:12px">${U.esc(p.ramo || '')}${p.producto ? ' · ' + U.esc(p.producto) : ''} · ${U.esc(asg.nombre || '')}</div></div>
        <button class="imp-x" id="pd-x">✕</button></div>
      <div style="padding:16px 20px">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">${U.estadoBadge(p.estado)} ${req ? '<span class="badge warn">Información parcial / requiere validación</span>' : '<span class="badge ok">Datos principales validados</span>'} <span class="badge ${genera ? 'ok' : 'neutral'}">${genera ? 'Genera calendario' : 'Histórico'}</span></div>
        <div style="font-family:var(--f-display);font-weight:800;font-size:13px;margin:4px 0 6px">Desglose de prima (${cur})</div>
        ${row('Prima neta de póliza', M(neta,cur))}
        ${row('Gastos de expedición', M(exped != null ? exped : rb.expedition,cur))}
        ${row('Gastos financieros', M(finan != null ? finan : rb.finance,cur))}
        ${row('Descuento / ajuste (campo fuente)', M(sourceAdjustment != null ? sourceAdjustment : rb.sourceAdjustment,cur))}
        ${row('IVA / impuestos', M(iva != null ? iva : rb.iva,cur))}
        ${row('Prima total de póliza', M(total,cur), 'color:var(--red)')}
        ${recibos.length ? row('Total calendario de recibos', M(rb.total,cur)) : ''}
        <div class="muted" style="font-size:11.5px;margin-top:6px">Los componentes tomados del calendario son informativos y no se inventan cuando la fuente no los trae. Una diferencia entre póliza y calendario queda pendiente de conciliación de fuente.</div>
        <div style="font-family:var(--f-display);font-weight:800;font-size:13px;margin:14px 0 6px">Condiciones</div>
        ${row('Frecuencia', U.esc(p.frecuencia || p.forma || '—'))}
        ${row('Forma de pago', U.esc(p.formaPago || p.conductoPago || p.conducto || '—'))}
        ${row('Vigencia', (p.vigenciaIni || p.vigenciaInicio || '—') + ' → ' + (p.vigenciaFin || '—'))}
        ${row('Suma asegurada', M(p.sumaAsegurada,cur))}
        <div style="font-family:var(--f-display);font-weight:800;font-size:13px;margin:14px 0 6px">Recibos esperados (${recibos.length})</div>
        ${recibos.length ? `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Cuota</th><th class="num">Neta</th><th class="num">Total</th><th>Vence</th><th>Estado</th></tr></thead><tbody>${recibos.slice(0,24).map(c => `<tr class="clickable" onclick="document.getElementById('pol-desg').remove();Orbit.receiptsPortfolioProjection&&Orbit.receiptsPortfolioProjection.openReceiptDetail&&Orbit.receiptsPortfolioProjection.openReceiptDetail('${c.id}','${p.clienteId}')"><td>${U.esc(c.serie || c.cuota || '—')}</td><td class="num">${M(c.primaNeta,c.moneda||cur)}</td><td class="num">${M(c.primaTotal != null ? c.primaTotal : c.montoTotal,c.moneda||cur)}</td><td>${U.fmtDate(c.fechaLimite || c.vence)}</td><td>${U.esc(c.estadoVisual || c.estadoOperativo || 'Pendiente')}</td></tr>`).join('')}</tbody></table></div>` : `<div class="muted" style="font-size:12.5px">${genera ? 'No hay calendario de recibos disponible para esta póliza.' : 'Histórico sin calendario de recibos disponible.'}</div>`}
        <div style="font-family:var(--f-display);font-weight:800;font-size:13px;margin:14px 0 6px">Origen</div>
        ${row('Fuente', U.esc(fuente) + filaFuente)}
      </div>
      <div style="padding:13px 20px;border-top:1px solid var(--line);display:flex;justify-content:flex-end;gap:8px">
        <button class="btn ghost" id="pd-close">Cerrar</button>
        <button class="btn primary" onclick="document.getElementById('pol-desg').remove();Orbit.modules.cliente360.verPoliza('${p.id}')">Abrir en Cliente 360</button></div></div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#pd-x').onclick = close; back.querySelector('#pd-close').onclick = close;
  }
  return { render, filtrarEstado, filtrarGrupo, pagina, verDesglose, buildIndexes, PAGE_SIZE, policyMetrics: { isActivePolicy, isHistoricalNoPortfolio, isRenewalWithin45Days, renewabilityState, premiumByCurrency } };
})();
