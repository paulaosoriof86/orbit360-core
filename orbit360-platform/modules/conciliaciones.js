/* ============================================================
   Orbit 360 · Cobros/Conciliación · owner canónico read-only
   Fecha: 2026-08-01

   La bandeja canónica lee propuestas generales y proyecta
   conciliaciones de primas sin duplicar escrituras. Durante esta
   fase ninguna acción aplica pagos, modifica cartera ni crea finmovs.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  Orbit.modules = Orbit.modules || {};

  const VERSION = '20260801.1';
  const PHASE = 'READ_ONLY_DRYRUN';
  const CANONICAL_COLLECTION = 'conciliaciones';
  const DOMAIN_COLLECTION = 'conciliacionesPrimas';
  let filterState = '';

  const S = () => Orbit.store;
  const U = () => Orbit.ui || {};
  const K = () => Orbit.kit || {};
  const text = value => String(value == null ? '' : value).trim();
  const norm = value => text(value).toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  const esc = value => U().esc ? U().esc(text(value)) : text(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money = (value, currency) => U().money ? U().money(Number(value || 0), currency || '') : `${currency || ''} ${Number(value || 0).toFixed(2)}`.trim();
  const safeAll = collection => { try { return S() && S().all ? (S().all(collection) || []) : []; } catch (error) { return []; } };
  const parseAmount = value => {
    if (value == null || value === '') return 0;
    const cleaned = String(value).replace(/[^0-9,.-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? Math.round((parsed + Number.EPSILON) * 100) / 100 : 0;
  };
  const ymd = value => {
    const raw = text(value); if (!raw) return '';
    let match = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (match) return `${match[1]}-${String(match[2]).padStart(2,'0')}-${String(match[3]).padStart(2,'0')}`;
    match = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (match) return `${match[3]}-${String(match[2]).padStart(2,'0')}-${String(match[1]).padStart(2,'0')}`;
    return raw.slice(0, 10);
  };
  const first = (row, keys) => { for (const key of keys) if (row && text(row[key])) return row[key]; return ''; };
  const sourceRef = row => {
    const ref = row && (row.source_ref || row.sourceRef) || {};
    return {
      file: text(ref.file || row.archivo || row.file),
      sheet: text(ref.sheet || row.hoja || row.sheet),
      row: text(ref.row || ref.row_ref || row.fila || row.row),
      block: text(ref.block || row.bloque || row.block),
      period: text(ref.period || row.periodo || row.period)
    };
  };
  const proposalIdentity = row => text(row && (row.proposalIdentity || row._sourceKey || row.sourceKey || (row.source_ref && row.source_ref.row_hash) || (row.sourceRef && row.sourceRef.rowHash))) || [
    norm(first(row,['tipo','source_type','fuente'])),
    norm(first(row,['polizaId','poliza_id','polizaNumero','poliza'])),
    norm(first(row,['reciboId','recibo_id','reciboNumero','requerimiento'])),
    norm(first(row,['moneda','currency'])),
    String(parseAmount(first(row,['monto','total','saldo'])))
  ].join('|');

  function stateFor(row) {
    const raw = norm(first(row,['queue_state','estado_bandeja','estado','status','review_state','estado_revision']));
    if (raw.includes('bloque')) return 'BLOQUEADA';
    if (raw.includes('rechaz')) return 'RECHAZADA';
    if (raw.includes('validada')) return 'VALIDADA';
    if (raw.includes('requiere validacion')) return 'REQUIERE_VALIDACION';
    if (raw.includes('revision')) return 'EN_REVISION';
    return 'PROPUESTA';
  }
  function scoreFor(row) {
    const raw = norm(first(row,['score_decision','decision_score','score','decision','status','estado']));
    if (raw.includes('bloque')) return 'BLOQUEADO';
    if (raw.includes('requiere validacion')) return 'REQUIERE_VALIDACION';
    if (raw.includes('conciliado') || raw.includes('exacto')) return 'MATCH_EXACTO';
    return 'MATCH_PROBABLE';
  }
  function baseProjection(row, sourceCollection) {
    const ref = sourceRef(row || {});
    return {
      id: proposalIdentity(row), sourceCollection, sourceEntityId: text(row && row.id),
      estado: stateFor(row), score: scoreFor(row),
      fuente: text(first(row,['fuente','source_type','sourceType','origen'])) || 'Fuente de conciliación',
      pais: text(first(row,['pais','country'])), moneda: text(first(row,['moneda','currency'])),
      monto: parseAmount(first(row,['monto','total','saldo','primaTotal'])),
      cliente: text(first(row,['clienteNombre','cliente','clienteId','cliente_id'])),
      poliza: text(first(row,['polizaNumero','poliza','polizaId','poliza_id'])),
      recibo: text(first(row,['reciboNumero','requerimiento','reciboId','recibo_id'])),
      archivo: ref.file, hoja: ref.sheet, fila: ref.row, bloque: ref.block, periodo: ref.period,
      motivo: text(first(row,['reason','motivo','estado_revision','review_state'])),
      sourceDifferences: Array.isArray(row && row.sourceDifferences) ? row.sourceDifferences.slice() : [],
      original: row, readOnly: true
    };
  }
  const projectCanonical = row => baseProjection(row, CANONICAL_COLLECTION);
  const projectPremium = row => {
    const projected = baseProjection(row, DOMAIN_COLLECTION);
    projected.id = `prima:${proposalIdentity(row)}`;
    if (!projected.fuente || projected.fuente === 'Fuente de conciliación') projected.fuente = 'Conciliación de prima';
    return projected;
  };
  function proposalRows() {
    const rows = new Map();
    safeAll(DOMAIN_COLLECTION).forEach(row => rows.set(proposalIdentity(row), projectPremium(row)));
    safeAll(CANONICAL_COLLECTION).forEach(row => rows.set(proposalIdentity(row), projectCanonical(row)));
    return Array.from(rows.values()).filter(row => !filterState || row.estado === filterState);
  }

  function isHistoricalExigible(row) {
    return !!(row && (row.historicalExigible === true || row.exigible === true ||
      text(row.carteraTipo) === 'cartera_historica_exigible' || text(row.exigibilidad) === 'historica_exigible'));
  }
  function outstanding(row) {
    const direct = first(row,['saldoPendiente','saldo','pendiente','montoPendiente','primaPendiente']);
    if (direct !== '') return Math.max(0, parseAmount(direct));
    const total = parseAmount(first(row,['monto','total','primaTotal']));
    const applied = parseAmount(first(row,['montoAplicado','pagado','totalPagado']));
    return Math.max(0, Math.round((total - applied + Number.EPSILON) * 100) / 100);
  }
  function simulateFifo(payment, obligations, options) {
    const opts = options || {};
    const amount = parseAmount(first(payment || {},['total_recaudado','monto','total','valor']));
    const currency = text(first(payment || {},['moneda','currency']));
    const clientId = text(first(payment || {},['clienteId','cliente_id']));
    const insurerId = text(first(payment || {},['aseguradoraId','aseguradora_id']));
    const policyScope = text(opts.scopePolicyId || '');
    const paymentDate = ymd(first(payment || {},['fecha_recaudo','fechaPago','fecha','date'])) || ymd(new Date().toISOString());
    const seen = new Set();
    const eligible = (Array.isArray(obligations) ? obligations : []).filter(row => {
      const id = text(first(row,['id','reciboId','recibo_id','_sourceKey']));
      if (!id || seen.has(id)) return false;
      seen.add(id);
      const state = norm(first(row,['estado','estadoOperativo','estadoCartera']));
      if (state.includes('pagado') || state.includes('anulado') || row.conciliadoPago === true) return false;
      if (currency && text(first(row,['moneda','currency'])) !== currency) return false;
      if (clientId && text(first(row,['clienteId','cliente_id'])) !== clientId) return false;
      if (insurerId && text(first(row,['aseguradoraId','aseguradora_id'])) !== insurerId) return false;
      if (policyScope && text(first(row,['polizaId','poliza_id'])) !== policyScope) return false;
      if (outstanding(row) <= 0) return false;
      const due = ymd(first(row,['vence','fechaVencimiento','fechaLimite','dueDate']));
      return (due && due <= paymentDate) || isHistoricalExigible(row) || opts.includeFuture === true;
    }).sort((a,b) => {
      const ad = ymd(first(a,['vence','fechaVencimiento','fechaLimite','dueDate'])) || '9999-12-31';
      const bd = ymd(first(b,['vence','fechaVencimiento','fechaLimite','dueDate'])) || '9999-12-31';
      return ad.localeCompare(bd) || text(first(a,['id','reciboId','recibo_id'])).localeCompare(text(first(b,['id','reciboId','recibo_id'])));
    });
    let remaining = Math.max(0, amount);
    const allocations = [];
    for (const row of eligible) {
      if (remaining <= 0) break;
      const balance = outstanding(row);
      const applied = Math.min(balance, remaining);
      remaining = Math.round((remaining - applied + Number.EPSILON) * 100) / 100;
      allocations.push({
        obligationId: text(first(row,['id','reciboId','recibo_id','_sourceKey'])),
        policyId: text(first(row,['polizaId','poliza_id'])),
        dueDate: ymd(first(row,['vence','fechaVencimiento','fechaLimite','dueDate'])),
        historicalExigible: isHistoricalExigible(row), openingBalance: balance, appliedAmount: applied,
        closingBalance: Math.round((balance - applied + Number.EPSILON) * 100) / 100
      });
    }
    const appliedAmount = Math.round((amount - remaining + Number.EPSILON) * 100) / 100;
    return Object.freeze({
      version: VERSION, phase: PHASE, currency, paymentAmount: amount, appliedAmount,
      remainingPayment: remaining, allocations, partial: allocations.some(item => item.closingBalance > 0),
      excess: remaining > 0, reactivatesPolicy: false, writes: 0, operationalWrites: 0
    });
  }

  function blocked() {
    if (U().toast) U().toast('Esta acción estará disponible después de validar la conciliación y autorizar la aplicación.');
    return false;
  }
  function disableLegacyActions(root) {
    const host = root || document;
    if (!host || !host.querySelectorAll) return;
    const selectors = [
      '#cd-apply','#cd-val','#cd-conc','#pm-ok','#cc-ok','#cv-ok','#cv-rej','#cv-rev',
      '[onclick*="aplicarPago"]','[onclick*="validarReporte"]','[onclick*="conciliarFactura"]','[onclick*=".lote("]'
    ];
    host.querySelectorAll(selectors.join(',')).forEach(button => {
      button.disabled = true; button.setAttribute('aria-disabled','true'); button.removeAttribute('onclick');
      button.onclick = event => { if (event) event.preventDefault(); blocked(); };
      button.title = 'Disponible después de la validación y autorización correspondiente';
      button.style.opacity = '.55'; button.style.cursor = 'not-allowed';
    });
  }
  function freezeCobrosModule() {
    const module = Orbit.modules && Orbit.modules.cobros;
    if (!module || module.__cobrosConciliacionReadOnlyOwner === VERSION) return false;
    ['aplicarPago','validarReporte','conciliarFactura','lote'].forEach(name => {
      if (typeof module[name] === 'function') module[name] = blocked;
    });
    ['render','detalle'].forEach(name => {
      const original = module[name];
      if (typeof original !== 'function') return;
      module[name] = function () {
        const result = original.apply(this, arguments);
        disableLegacyActions(document); setTimeout(() => disableLegacyActions(document), 0);
        return result;
      };
    });
    module.__cobrosConciliacionReadOnlyOwner = VERSION;
    module.__cobrosConciliacionPhase = PHASE;
    return true;
  }

  function tone(state) {
    return state === 'VALIDADA' ? 'ok' : state === 'BLOQUEADA' || state === 'RECHAZADA' ? 'danger' : state === 'REQUIERE_VALIDACION' ? 'warn' : 'info';
  }
  function render(host) {
    freezeCobrosModule();
    const rows = proposalRows();
    const counts = rows.reduce((acc,row) => { acc[row.estado] = (acc[row.estado] || 0) + 1; return acc; },{});
    const filters = ['', 'PROPUESTA','EN_REVISION','REQUIERE_VALIDACION','VALIDADA','RECHAZADA','BLOQUEADA'];
    const banner = K().banner ? K().banner({icon:'🔗',title:'Bandeja de conciliaciones',sub:'Revisión de coincidencias. Ninguna propuesta aplica pagos por sí sola.',features:[]}) : '<div class="card pad"><b>Bandeja de conciliaciones</b><div class="muted">Revisión de coincidencias. Ninguna propuesta aplica pagos por sí sola.</div></div>';
    host.innerHTML = `<div class="page">${banner}
      <div class="cfg-note" style="margin-bottom:12px">Los pagos continúan separados de recibos, cartera y movimientos financieros. Las coincidencias ambiguas permanecen en validación.</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">${filters.map(state => `<button class="btn ${filterState===state?'primary':'ghost'} sm" data-conc-filter="${state}">${state?state.replaceAll('_',' '):'Todos'}${state?` · ${counts[state]||0}`:''}</button>`).join('')}</div>
      <div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Estado</th><th>Coincidencia</th><th>Fuente</th><th>País / moneda</th><th>Cliente · póliza · recibo</th><th class="num">Monto</th><th>Trazabilidad</th><th></th></tr></thead><tbody>
      ${rows.map(row => `<tr><td><span class="badge ${tone(row.estado)}">${esc(row.estado.replaceAll('_',' '))}</span></td><td>${esc(row.score.replaceAll('_',' '))}</td><td>${esc(row.fuente)}</td><td>${esc([row.pais,row.moneda].filter(Boolean).join(' / ')||'—')}</td><td>${esc([row.cliente,row.poliza,row.recibo].filter(Boolean).join(' · ')||'—')}</td><td class="num">${row.moneda?money(row.monto,row.moneda):esc(row.monto||'—')}</td><td class="mono" style="font-size:10.5px">${esc([row.archivo,row.hoja,row.fila?`fila ${row.fila}`:'',row.periodo].filter(Boolean).join(' · ')||'—')}</td><td><button class="btn ghost sm" data-conc-id="${esc(row.id)}">Ver</button></td></tr>`).join('') || '<tr><td colspan="8" class="muted" style="text-align:center;padding:30px">Aún no hay propuestas para revisar.</td></tr>'}
      </tbody></table></div></div></div>`;
    host.querySelectorAll('[data-conc-filter]').forEach(button => button.addEventListener('click', () => { filterState = button.dataset.concFilter || ''; render(host); }));
    host.querySelectorAll('[data-conc-id]').forEach(button => button.addEventListener('click', () => detalle(button.dataset.concId)));
    disableLegacyActions(document);
  }
  function detalle(id) {
    const row = proposalRows().find(item => item.id === id); if (!row) return;
    const summary = [
      ['Estado',row.estado.replaceAll('_',' ')],['Coincidencia',row.score.replaceAll('_',' ')],['Fuente',row.fuente],
      ['País / moneda',[row.pais,row.moneda].filter(Boolean).join(' / ')||'—'],['Cliente',row.cliente||'—'],['Póliza',row.poliza||'—'],['Recibo',row.recibo||'—'],
      ['Monto',row.moneda?money(row.monto,row.moneda):row.monto||'—'],['Archivo',row.archivo||'—'],['Hoja / fila',[row.hoja,row.fila].filter(Boolean).join(' / ')||'—']
    ];
    let back = document.getElementById('conc-readonly-detail'); if (back) back.remove();
    back = document.createElement('div'); back.id='conc-readonly-detail'; back.className='drawer-back open'; back.style.cssText='display:grid;place-items:center;z-index:210';
    back.innerHTML = `<div class="card" style="width:min(520px,94vw);max-height:88vh;overflow:auto"><div style="padding:18px"><div style="display:flex;justify-content:space-between;gap:12px"><b style="font-family:var(--f-display);font-size:17px">Detalle de conciliación</b><button class="imp-x" data-close>✕</button></div><div class="cfg-note" style="margin:12px 0">Esta propuesta está en revisión y no aplica pagos automáticamente.</div>${summary.map(([label,value])=>`<div class="vp-row"><span class="vp-l">${esc(label)}</span><span class="vp-v">${esc(value)}</span></div>`).join('')}</div><div style="padding:13px 18px;border-top:1px solid var(--line);display:flex;justify-content:flex-end"><button class="btn ghost" data-close>Cerrar</button></div></div>`;
    document.body.appendChild(back);
    const close=()=>back.remove(); back.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',close)); back.addEventListener('click',event=>{if(event.target===back)close();});
  }

  Orbit.cobrosConciliacionReadOnly = Object.freeze({
    version: VERSION, phase: PHASE, canonicalCollection: CANONICAL_COLLECTION, domainCollection: DOMAIN_COLLECTION,
    proposalRows, simulateFifo, freezeCobrosModule, operationalWrites: 0, firestoreWrites: 0, autoApply: false
  });
  Orbit.modules.conciliaciones = Object.freeze({render, detalle, accion: blocked, filtro(value){filterState=value||'';const host=document.getElementById('host');if(host)render(host);}});
  freezeCobrosModule();
  if (document && document.addEventListener) document.addEventListener('orbit:store', freezeCobrosModule);
})();
