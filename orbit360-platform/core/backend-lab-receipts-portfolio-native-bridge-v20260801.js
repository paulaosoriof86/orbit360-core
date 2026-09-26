/* ============================================================
   Orbit 360 · Recibos/Cartera · bridge visual nativo 2026-08-01

   Propósito:
   - Consumir exclusivamente Orbit.store como propietario de lectura.
   - No abrir listeners Firestore ni mantener caches paralelos.
   - Conservar las proyecciones de Cliente 360 y Pólizas.
   - Mantener Recibos, Cartera y Cobros como conceptos separados.
   ============================================================ */
(function(){
  'use strict';
  var w=window; w.Orbit=w.Orbit||{};
  var tenant='';
  function tenantId(){
    try{
      var ps=Orbit.store&&typeof Orbit.store._productStatus==='function'?Orbit.store._productStatus():{};
      return clean(ps&&ps.tenantId)||clean(Orbit.auth&&Orbit.auth.productUser&&Orbit.auth.productUser.tenantId)||clean(tenant);
    }catch(e){return clean(tenant);}
  }

  var wrappedQuery=false,wrappedClient=false,wrappedPolicies=false;
  var recFilter={};
  var status={
    version:'9.2.0-native-store',
    ownerRevision:'20260801-canonical-single-read-owner',
    tenantId:'',
    readOnly:true,
    directFirestoreListeners:0,
    parallelCache:false,
    storeOwner:'Orbit.store',
    counts:{recibosEsperados:0,carteraPrimas:0},
    owners:{store:false,query:false,client:false,policies:false},
    ready:false,
    errors:{}
  };

  var clean=function(v){return String(v==null?'':v).trim();};
  var low=function(v){return clean(v).toLowerCase();};
  var num=function(v){var n=Number(v);return Number.isFinite(n)?n:0;};
  var numberOrNull=function(v){if(v==null||clean(v)==='')return null;var n=Number(v);return Number.isFinite(n)?n:null;};
  var clone=function(v){try{return JSON.parse(JSON.stringify(v));}catch(e){return v;}};
  var amount=function(r){return num(r&&((r.primaTotal!=null?r.primaTotal:(r.montoTotal!=null?r.montoTotal:(r.montoFuente!=null?r.montoFuente:r.monto)))));};
  var dueDate=function(r){return clean(r&&(r.fechaLimite||r.vence||r.fechaVencimiento));};
  var isFuture=function(r){return clean(r&&r.exigibilidad)==='futura'||clean(r&&r.estadoOperativo)==='futuro_pendiente';};
  var legacyHistorical=function(r){return !!(r&&((r.historicalExigible===true)||clean(r.carteraTipo)==='cartera_historica_exigible'||clean(r.exigibilidad)==='historica_exigible'));};
  function planDenominator(r){var raw=[r&&r.cuota,r&&r.serie,r&&r.numeroReciboFuente].map(clean).find(Boolean)||'',m=raw.match(/(?:^|\s)(\d+)\s*\/\s*(\d+)(?:\s|$)/);return m?Number(m[2]):null;}
  function baseReceiptInactive(r){var s=low(r&&r.estado);return !!(r&&(r.superseded===true||r.calendarActive===false||s==='anulado'||s==='superseded'||s==='reemplazado'));}
  function calendarClassReceipt(r){
    if(!r)return'history';if(baseReceiptInactive(r))return'history';
    var p=Orbit.store&&Orbit.store.get?Orbit.store.get('polizas',r.polizaId)||{}:{},explicit=Number(p.cuotas),d=planDenominator(r);
    if(Number.isFinite(explicit)&&explicit>0)return d&&d!==explicit?'history':'current';
    var siblings=Orbit.store&&Orbit.store.where?Orbit.store.where('recibosEsperados',function(x){return x&&x.polizaId===r.polizaId&&!baseReceiptInactive(x);}):[],denoms=[...new Set(siblings.map(planDenominator).filter(function(n){return Number.isFinite(n)&&n>0;}))];
    if(denoms.length<=1)return'current';return d?'review':'current';
  }
  function calendarClass(r){
    if(!r)return'history';if(legacyHistorical(r))return'history';
    if(r.reciboId){var rec=Orbit.store&&Orbit.store.get?Orbit.store.get('recibosEsperados',r.reciboId):null;return rec?calendarClassReceipt(rec):'review';}
    return calendarClassReceipt(r);
  }
  var isHistorical=function(r){return calendarClass(r)==='history';};
  var isCalendarReview=function(r){return calendarClass(r)==='review';};
  function esc(v){try{return Orbit.ui&&Orbit.ui.esc?Orbit.ui.esc(v):clean(v).replace(/[&<>"']/g,function(ch){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch];});}catch(e){return clean(v);}}
  function money(v,cur){try{return Orbit.ui&&Orbit.ui.money?Orbit.ui.money(v,cur||'GTQ'):(cur||'GTQ')+' '+num(v).toFixed(2);}catch(e){return (cur||'GTQ')+' '+num(v).toFixed(2);}}
  function moneyDetail(v,cur){var n=numberOrNull(v);if(n==null)return'Pendiente de completar';var code=clean(cur||'GTQ'),symbol=code==='GTQ'?'Q':code==='COP'?'$':code==='USD'?'US$':code==='EUR'?'€':code;try{return symbol+' '+n.toLocaleString('es-GT',{minimumFractionDigits:2,maximumFractionDigits:2});}catch(e){return symbol+' '+n.toFixed(2);}}
  function fmtDate(v){try{return Orbit.ui&&Orbit.ui.fmtDate?Orbit.ui.fmtDate(v):clean(v);}catch(e){return clean(v);}}

  function storeReady(){
    var S=Orbit.store,T=tenantId(),paths=Orbit.tenantCanonicalPathsP0;
    if(!S||typeof S.all!=='function'||typeof S.get!=='function'||typeof S.where!=='function'||!T)return false;
    try{
      var ps=typeof S._productStatus==='function'?S._productStatus():{};
      if(S.__productReadOnlyP0!==true||ps.tenantId!==T||!paths||typeof paths.dataCollectionPath!=='function')return false;
      var a=paths.dataCollectionPath(T,'recibosEsperados');
      var b=paths.dataCollectionPath(T,'carteraPrimas');
      status.tenantId=T;
      return /tenants\/[^/]+\/data\/recibosEsperados\/items$/.test(a||'')&&/tenants\/[^/]+\/data\/carteraPrimas\/items$/.test(b||'');
    }catch(e){return false;}
  }

  function refreshStatus(){
    status.owners.store=storeReady();
    try{
      status.counts.recibosEsperados=storeReady()?(Orbit.store.all('recibosEsperados')||[]).length:0;
      status.counts.carteraPrimas=storeReady()?(Orbit.store.all('carteraPrimas')||[]).length:0;
    }catch(e){
      status.errors.store=clean(e&&e.message||e).slice(0,160);
    }
    status.ready=status.owners.store&&status.owners.query&&status.owners.client&&status.owners.policies;
  }

  function isPaymentReconciled(r){
    if(!r)return false;
    var state=low(r.estadoConciliacion||r.estadoConciliado||r.estado||'');
    return r.conciliado===true||r.conciliadoPago===true||state==='conciliado'||state==='cobro conciliado'||state==='cobro_conciliado';
  }
  function hasInsurerAuthority(r){
    if(!r)return false;
    var source=low(r.fuenteAutoridad||r.origenAutoridad||r.fuenteConciliacion||'');
    return !!source&&source!=='siga'&&source.indexOf('crm')<0;
  }
  function isPortfolioReconciled(r){
    if(!r)return false;
    if(r.saldoConciliado===true||low(r.estadoConciliacionSaldo)==='conciliado_con_aseguradora')return true;
    return hasInsurerAuthority(r)&&!!clean(r.matchQuality)&&!!clean(r.sourceRef)&&r.requiereValidacion!==true;
  }
  function reconciliationLabel(r,portfolio){
    if(isPaymentReconciled(r))return{t:'Cobro conciliado',c:'ok'};
    if(isPortfolioReconciled(portfolio))return{t:'Cartera conciliada con aseguradora',c:'ok'};
    if(r&&low(r.estadoOperativo)==='pago_reportado')return{t:'Pago reportado · por conciliar',c:'info'};
    if(r&&low(r.estadoOperativo)==='requiere_validacion_estado')return{t:'Requiere validación',c:'warn'};
    return{t:'Pendiente de conciliación',c:'warn'};
  }
  function stateLabel(r){
    if(isPaymentReconciled(r))return{t:'Cobro conciliado',c:'ok'};
    var s=clean(r&&r.estadoOperativo);
    if(s==='futuro_pendiente')return{t:'Futuro',c:'warn'};
    if(s==='pendiente_vencido')return{t:'Vencido',c:'danger'};
    if(s==='pendiente_vence_corte')return{t:'Por vencer',c:'warn'};
    if(s==='pago_reportado')return{t:'Pago reportado · por conciliar',c:'info'};
    if(s==='no_pendiente_segun_aseguradora')return{t:'Sin saldo pendiente según aseguradora',c:'ok'};
    if(s==='requiere_validacion_estado')return{t:'Requiere validación',c:'warn'};
    return{t:s||'Pendiente',c:'warn'};
  }

  function portfolioSummary(cid){
    var rows=Orbit.store.where('carteraPrimas',function(r){return r&&r.clienteId===cid;}),historical=rows.filter(isHistorical),review=rows.filter(isCalendarReview),active=rows.filter(function(r){return calendarClass(r)==='current';});
    var future=active.filter(isFuture),due=active.filter(function(r){return!isFuture(r);});
    var reconciled=active.filter(isPortfolioReconciled);
    function sum(a){return a.reduce(function(s,r){return s+amount(r);},0);}
    return{rows:rows,future:future,due:due,historical:historical,review:review,active:active,reconciled:reconciled,futureAmount:sum(future),dueAmount:sum(due),historicalAmount:sum(historical),reviewAmount:sum(review),reconciledAmount:sum(reconciled),totalAmount:sum(active)};
  }

  function markSummaryApplied(r){
    if(!r||typeof r!=='object')return r;
    try{Object.defineProperty(r,'__orbitRpNativeSummaryApplied',{value:true,configurable:true,enumerable:false});}catch(e){}
    return r;
  }

  function installQueryProjection(){
    if(!storeReady()||!Orbit.q||typeof Orbit.q.clienteResumen!=='function')return false;
    var q=Orbit.q;
    q.recibosEsperadosDe=function(cid){return Orbit.store.where('recibosEsperados',function(r){return r&&r.clienteId===cid&&calendarClassReceipt(r)==='current';});};
    q.recibosHistoricosDe=function(cid){return Orbit.store.where('recibosEsperados',function(r){return r&&r.clienteId===cid&&calendarClassReceipt(r)==='history';});};
    q.recibosRevisionDe=function(cid){return Orbit.store.where('recibosEsperados',function(r){return r&&r.clienteId===cid&&calendarClassReceipt(r)==='review';});};
    q.carteraPrimasDe=function(cid){return Orbit.store.where('carteraPrimas',function(r){return r&&r.clienteId===cid;});};
    q.carteraPrimasResumenDe=portfolioSummary;
    if(q.__rpNativeClienteResumenOwner!==q.clienteResumen){
      var base=q.clienteResumen.bind(q);
      var projected=function(cid){
        var r=base(cid);if(r&&r.__orbitRpNativeSummaryApplied===true)return r;
        r=r||{};var p=portfolioSummary(cid),rec=q.recibosEsperadosDe(cid);
        r.recibosEsperados=rec;r.carteraPrimas=p.rows;r.carteraActiva=p.active;r.carteraHistorica=p.historical;
        r.carteraFutura=p.future;r.carteraExigible=p.due;r.carteraConciliada=p.reconciled;
        r.pendiente=p.futureAmount;r.vencido=p.dueAmount;r.carteraHistoricaMonto=p.historicalAmount;
        r.carteraConciliadaMonto=p.reconciledAmount;r.carteraTotal=p.totalAmount;
        if(p.dueAmount>0)r.salud=Math.max(8,Number(r.salud||70)-25);
        return markSummaryApplied(r);
      };
      q.clienteResumen=projected;q.__rpNativeClienteResumenOwner=projected;
    }
    wrappedQuery=q.__rpNativeClienteResumenOwner===q.clienteResumen;
    status.owners.query=wrappedQuery;
    return wrappedQuery;
  }

  function activeClientId(){try{return Orbit.route&&Orbit.route.params&&Orbit.route.params.c||'';}catch(e){return'';}}
  function patchHeader(cid){
    var p=portfolioSummary(cid);
    document.querySelectorAll('.fh-kpis>div').forEach(function(cell){
      var lab=cell.querySelector('.fh-kpi-lab'),val=cell.querySelector('.fh-kpi-val');if(!lab||!val)return;
      var t=clean(lab.textContent),cur=(Orbit.store.get('clientes',cid)||{}).moneda||'GTQ';
      if(t.indexOf('Cartera al día')>=0){lab.textContent='Cartera por vencer';val.textContent=money(p.futureAmount,cur);}
      else if(t.indexOf('Cartera vencida')>=0){lab.textContent='Cartera exigible';val.textContent=money(p.dueAmount,cur);}
    });
  }
  function policyLabel(p){var a=Orbit.store.get('aseguradoras',p.aseguradoraId)||{};return clean(p.numero||'—')+(a.nombre?' · '+clean(a.nombre):'');}
  function receiptStateNote(r,portfolio){
    if(isPaymentReconciled(r))return'Este pago ya fue conciliado contra fuentes autoritativas y se considera cobro conciliado.';
    if(isPortfolioReconciled(portfolio))return'El saldo pendiente fue conciliado contra la fuente de autoridad de la aseguradora. Esto confirma cartera; no equivale a un pago.';
    var s=clean(r&&r.estadoOperativo);
    if(s==='pago_reportado')return'Existe evidencia de pago reportado, pero aún no es un cobro conciliado.';
    if(s==='no_pendiente_segun_aseguradora')return'La aseguradora no reporta saldo pendiente; la ausencia de saldo no crea por sí sola un cobro conciliado.';
    if(s==='requiere_validacion_estado')return'El estado requiere validación antes de cualquier conciliación.';
    return'Este registro pertenece al calendario de recibos; los cobros conciliados se administran por separado.';
  }
  function businessSourceRef(v){
    var t=clean(v);
    if(!t||/^(I\d|GRAVICENTRA_|ORBIT_|MATCH_|SEED_|VALIDATOR_|OWNER_)/i.test(t)||/^[A-Z0-9_]{14,}$/.test(t))return'';
    return t;
  }
  function businessMatch(v){
    var s=low(v);
    if(!s)return'';
    if(/exact|high|alta|confirmed|confirmad/.test(s))return'Coincidencia confirmada';
    if(/prob|medium|media|review|revis/.test(s))return'Coincidencia por revisar';
    if(/low|baja|conflict|ambigu/.test(s))return'Requiere revisión';
    return'';
  }
  function receiptLockedForEdit(r){
    var op=low(r&&r.estadoOperativo);return !!(r&&(r.fechaPago||r.conciliado===true||r.conciliadoPago===true||op==='pago_reportado'||clean(r.fechaPagoReportada)||clean(r.reportado)||low(r.estado)==='pagado'||low(r.estado)==='conciliado'));
  }
  function editReceipt(receiptId,cid){
    var r=Orbit.store.get('recibosEsperados',receiptId);if(!r)return false;
    if(receiptLockedForEdit(r)){try{Orbit.ui.toast('Este recibo tiene evidencia de pago y está protegido. Usa una gestión controlada para corregirlo.');}catch(e){}return false;}
    if(!Orbit.policyReceipts||typeof Orbit.policyReceipts.updateReceipt!=='function')return false;
    var cur=r.moneda||(Orbit.store.get('polizas',r.polizaId)||{}).moneda||'GTQ',old=document.getElementById('rp-edit-receipt');if(old)old.remove();
    var back=document.createElement('div');back.id='rp-edit-receipt';back.className='drawer-back open';back.style.cssText='display:grid;place-items:center;z-index:245';
    var val=function(v){return v==null?'':String(v);},n=function(v){var x=numberOrNull(v);return x==null?'':String(x);};
    back.innerHTML=`<div class="card" style="width:min(760px,96vw);max-height:92vh;overflow:auto;padding:0"><div style="padding:17px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:12px"><div><small class="muted">Edición individual controlada</small><b style="display:block;font-family:var(--f-display);font-size:18px">Recibo ${esc(r.serie||r.cuota||'—')}</b><small class="muted">Solo cambia este recibo; no modifica los recibos hermanos.</small></div><button class="imp-x" data-rp-close>✕</button></div><div style="padding:18px 20px;display:grid;gap:12px"><div class="cfg-note">Los recibos pagados, conciliados o con pago reportado están protegidos. Si el total deja de coincidir con la póliza, la diferencia seguirá visible para conciliación.</div><div class="cgrid"><label class="ce-l">Serie / recibo<input class="o-sel" data-rp-serie value="${esc(val(r.serie||r.numeroReciboFuente))}"></label><label class="ce-l">Fecha límite<input type="date" class="o-sel" data-rp-due value="${esc(dueDate(r))}"></label><label class="ce-l">Prima neta<input type="number" step="0.01" class="o-sel" data-rp-net value="${esc(n(r.primaNeta))}"></label><label class="ce-l">Gastos expedición<input type="number" step="0.01" class="o-sel" data-rp-exp value="${esc(n(r.gastosExpedicion))}"></label><label class="ce-l">Gastos financieros<input type="number" step="0.01" class="o-sel" data-rp-fin value="${esc(n(r.gastosFinanciamiento))}"></label><label class="ce-l">Descuento / ajuste<input type="number" step="0.01" class="o-sel" data-rp-adj value="${esc(n(r.descuento))}"></label><label class="ce-l">IVA / impuestos<input type="number" step="0.01" class="o-sel" data-rp-tax value="${esc(n(r.impuestosIVA))}"></label><label class="ce-l">Total del recibo<input type="number" step="0.01" class="o-sel" data-rp-total value="${esc(n(r.primaTotal!=null?r.primaTotal:(r.montoTotal!=null?r.montoTotal:r.monto)))}"></label></div><label class="ce-l">Motivo del cambio *<textarea class="o-sel" data-rp-reason rows="2" placeholder="Describe por qué se corrige este recibo"></textarea></label><div class="hint error" data-rp-error style="display:none"></div></div><div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;justify-content:flex-end;gap:8px"><button class="btn ghost" data-rp-close>Cancelar</button><button class="btn primary" data-rp-save>Guardar recibo</button></div></div>`;
    document.body.appendChild(back);var close=function(){back.remove();};back.querySelectorAll('[data-rp-close]').forEach(function(x){x.addEventListener('click',close);});
    back.querySelector('[data-rp-save]').addEventListener('click',async function(){var error=back.querySelector('[data-rp-error]'),reason=clean(back.querySelector('[data-rp-reason]').value),save=back.querySelector('[data-rp-save]');if(reason.length<5){error.style.display='';error.textContent='Indica un motivo claro de al menos 5 caracteres.';return;}var numv=function(sel){var raw=clean(back.querySelector(sel).value);return raw===''?0:Number(raw);};var patch={serie:clean(back.querySelector('[data-rp-serie]').value),fechaLimite:clean(back.querySelector('[data-rp-due]').value),primaNeta:numv('[data-rp-net]'),gastosExpedicion:numv('[data-rp-exp]'),gastosFinanciamiento:numv('[data-rp-fin]'),descuento:numv('[data-rp-adj]'),impuestosIVA:numv('[data-rp-tax]'),primaTotal:numv('[data-rp-total]')};save.disabled=true;save.textContent='Guardando…';var out=await Orbit.policyReceipts.updateReceipt(receiptId,patch,{motivo:reason});if(!out||out.ok!==true){error.style.display='';error.textContent='No fue posible actualizar este recibo: '+[].concat(out&&out.errors||[]).join(', ');save.disabled=false;save.textContent='Guardar recibo';return;}close();renderReceiptDetail(receiptId,cid||r.clienteId);try{Orbit.ui.toast('Recibo actualizado y confirmado en servidor.');}catch(e){}});
    return true;
  }

  function renderReceiptDetail(receiptId,cid){
    var r=Orbit.store.get('recibosEsperados',receiptId);if(!r)return false;
    var p=Orbit.store.get('polizas',r.polizaId)||{},c=Orbit.store.get('clientes',cid||r.clienteId)||{},v=Orbit.store.where('vehiculos',function(x){return x&&x.polizaId===r.polizaId;})[0]||{},portfolio=Orbit.store.where('carteraPrimas',function(x){return x&&x.reciboId===r.id;})[0]||null,cur=r.moneda||p.moneda||c.moneda||'GTQ',st=stateLabel(r),rec=reconciliationLabel(r,portfolio),target=document.getElementById('host')||document.getElementById('c360-body');if(!target)return false;
    var back='#/cliente360?c='+encodeURIComponent(cid||r.clienteId||p.clienteId||'')+'&t=recibos';
    var cell=function(k,val){var shown=val==null||clean(val)===''||/^(undefined|null)$/i.test(clean(val))?'Pendiente de completar':val;return'<div><div style="font-size:12px;font-weight:600;color:var(--ink-2);text-transform:uppercase;letter-spacing:.035em">'+esc(k)+'</div><div style="font-size:13.5px;font-weight:500;line-height:1.42;margin-top:3px">'+esc(shown)+'</div></div>';};
    var badges=[st,rec].filter(function(x,i,a){return x&&a.findIndex(function(y){return clean(y.t)===clean(x.t);})===i;}).map(function(x){return'<span class="badge '+x.c+'">'+esc(x.t)+'</span>';}).join('');
    var asOf=(portfolio&&portfolio.fechaCorteFuente)||r.fechaCorteFuente||'';
    var sourceRef=businessSourceRef((portfolio&&portfolio.sourceRef)||r.sourceRef||'');
    var match=businessMatch((portfolio&&portfolio.matchQuality)||r.matchQuality||'');
    var operationalAsOf=asOf?cell('Datos actualizados al',fmtDate(asOf)):'';
    var trace=[sourceRef?cell('Documento de origen',sourceRef):'',match?cell('Validación de coincidencia',match):''].filter(Boolean).join('');
    if(!trace)trace='<div class="muted">Sin detalles técnicos adicionales.</div>';
    var vehicle=[v.marca,v.linea,v.placa].filter(function(x){return x&&!/^(undefined|null)$/i.test(clean(x));}).join(' ');var canEditPlan=!!(p&&p.id&&Orbit.policyReceipts&&typeof Orbit.policyReceipts.canManagePolicies==='function'&&Orbit.policyReceipts.canManagePolicies());
    target.innerHTML='<div class="page orbit-receipt-fullpage" data-rp-receipt-detail="1" data-rp-owner="v920">'
      +'<div class="crumb" style="margin-bottom:14px"><a href="'+back+'" style="color:var(--red)">‹ Volver a Recibos y pagos</a> / Recibo '+esc(r.serie||r.numeroReciboFuente||'')+'</div>'
      +'<div class="card" style="overflow:hidden;margin-bottom:16px;border-left:4px solid var(--red)"><div data-rp-receipt-hero="1" style="padding:20px 22px;background:linear-gradient(135deg,#fff7f8 0%,#f7f4f0 68%,#f4f7fb 100%);display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap"><div><div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.12em">🧾 Recibo esperado · '+esc(r.serie||'—')+'</div><h2 style="color:var(--ink);margin:4px 0;font-family:var(--f-display);font-size:24px;font-weight:800">Póliza '+esc(r.polizaNumero||p.numero||'—')+'</h2><div style="color:var(--ink-2)">'+esc(vehicle||p.ramo||'')+'</div></div><span data-rp-hero-status="1" class="badge '+st.c+'" style="align-self:flex-start;flex:0 0 auto;margin-top:2px">'+esc(st.t)+'</span></div></div>'
      +'<div class="orbit-detail-layout" style="display:grid;grid-template-columns:minmax(0,1.2fr) minmax(300px,.8fr);gap:16px"><section class="card pad"><h3 style="margin-top:0;font-size:17px;font-weight:800">🧾 Desglose del recibo</h3><div class="orbit-detail-grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px">'
      +cell('Prima neta',moneyDetail(r.primaNeta,cur))+cell('Gastos de expedición',moneyDetail(r.gastosExpedicion,cur))+cell('Gastos financieros',moneyDetail(r.gastosFinanciamiento,cur))+cell('Descuento / ajuste',moneyDetail(r.descuento,cur))+cell('IVA / impuestos',moneyDetail(r.impuestosIVA,cur))+cell('Prima total',moneyDetail(r.primaTotal!=null?r.primaTotal:(r.montoTotal!=null?r.montoTotal:r.monto),cur))+cell('Fecha límite',fmtDate(dueDate(r)))+cell('Fecha de pago reportada',r.fechaPagoReportada?fmtDate(r.fechaPagoReportada):'No reportada')
      +'</div></section><div style="display:grid;gap:16px"><section class="card pad"><h3 style="margin-top:0;font-size:17px;font-weight:800">🔎 Estado y conciliación</h3><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">'+badges+'</div><div class="muted" style="line-height:1.5">'+esc(receiptStateNote(r,portfolio))+'</div>'
      +(portfolio?'<div style="margin-top:10px">En cartera: <span style="font-weight:600">'+esc(moneyDetail(portfolio.primaTotal||portfolio.montoTotal||portfolio.monto||r.primaTotal||r.montoTotal||r.monto,cur))+'</span></div>':'')
      +'</section><section class="card pad"><h3 style="margin-top:0;font-size:17px;font-weight:800">📅 Información del registro</h3><div class="orbit-detail-grid" style="display:grid;grid-template-columns:1fr;gap:12px">'+(operationalAsOf||'<div class="muted">Sin fecha adicional reportada.</div>')+'</div><details class="gi-technical-origin" style="margin-top:14px"><summary>Detalles de origen y auditoría</summary><div class="orbit-detail-grid" style="display:grid;grid-template-columns:1fr;gap:12px;margin-top:12px">'+trace+'</div></details></section></div></div></div>';
    if(canEditPlan){var statusEl=target.querySelector('[data-rp-hero-status="1"]');if(statusEl){var parent=statusEl.parentElement,locked=receiptLockedForEdit(r),edit=document.createElement('button');edit.className='btn primary sm';edit.setAttribute('data-rp-edit-receipt','1');edit.textContent=locked?'🔒 Recibo protegido':'✏ Editar este recibo';edit.style.marginLeft='8px';edit.disabled=locked;if(!locked)edit.addEventListener('click',function(){editReceipt(r.id,cid||r.clienteId);});parent&&parent.appendChild(edit);var btn=document.createElement('button');btn.className='btn ghost sm';btn.textContent='Editar plan de recibos';btn.style.marginLeft='8px';btn.addEventListener('click',function(){Orbit.modules.cliente360.editarPoliza(p.id);});parent&&parent.appendChild(btn);}}
    return true;
  }
  function openReceiptDetail(receiptId,cid){return renderReceiptDetail(receiptId,cid);}
  function wireReceiptRows(body,cid){if(!body)return;body.querySelectorAll('[data-rp-receipt-id]').forEach(function(row){if(row.dataset.rpWired==='1')return;row.dataset.rpWired='1';row.addEventListener('click',function(){openReceiptDetail(row.getAttribute('data-rp-receipt-id'),cid);});});}

  function renderReceipts(cid){
    var body=document.getElementById('c360-body');if(!body||!Orbit.q||!Orbit.q.recibosEsperadosDe)return;
    var ps=Orbit.store&&typeof Orbit.store._productStatus==='function'?Orbit.store._productStatus():{},confirmed=ps.serverConfirmedCollections||[];
    if(confirmed.indexOf('recibosEsperados')<0||confirmed.indexOf('carteraPrimas')<0){body.setAttribute('data-rp-native-owner','v920');body.setAttribute('data-rp-loading','1');body.innerHTML='<div class="card pad"><b>Cargando recibos y cartera…</b><div class="muted" style="margin-top:5px">Validando el calendario y la cartera en la fuente canónica.</div></div>';return;}
    body.removeAttribute('data-rp-loading');
    var receipts=Orbit.q.recibosEsperadosDe(cid).slice().sort(function(a,b){return dueDate(a).localeCompare(dueDate(b));}),receiptHistory=(Orbit.q.recibosHistoricosDe?Orbit.q.recibosHistoricosDe(cid):[]),receiptReview=(Orbit.q.recibosRevisionDe?Orbit.q.recibosRevisionDe(cid):[]);
    var portfolio=Orbit.q.carteraPrimasDe(cid),byReceipt={};portfolio.forEach(function(x){byReceipt[x.reciboId]=x;});
    body.setAttribute('data-rp-native-owner','v920');
    body.setAttribute('data-rp-receipt-count',String(receipts.length));
    body.setAttribute('data-rp-receipt-history-count',String(receiptHistory.length));
    body.setAttribute('data-rp-receipt-review-count',String(receiptReview.length));
    body.setAttribute('data-rp-portfolio-count',String(portfolio.length));
    var policies=Orbit.store.where('polizas',function(p){return p&&p.clienteId===cid;});
    var selected=recFilter[cid]||'todas';var shown=selected==='todas'?receipts:receipts.filter(function(r){return r.polizaId===selected;});
    var ps=portfolioSummary(cid),cur=(Orbit.store.get('clientes',cid)||{}).moneda||'GTQ';
    var opts='<option value="todas">Todas las pólizas</option>'+policies.map(function(p){return'<option value="'+esc(p.id)+'" '+(selected===p.id?'selected':'')+'>'+esc(policyLabel(p))+'</option>';}).join('');
    var rows=shown.map(function(r){
      var c=byReceipt[r.id]||null,p=Orbit.store.get('polizas',r.polizaId)||{},v=Orbit.store.where('vehiculos',function(x){return x&&x.polizaId===r.polizaId;})[0];
      var st=stateLabel(r),rs=reconciliationLabel(r,c),kind='Calendario vigente';
      var veh=v?[v.marca,v.linea,v.placa].filter(Boolean).join(' '):'';
      return'<tr class="clickable" data-rp-receipt-id="'+esc(r.id)+'"><td><b>'+esc(r.polizaNumero||p.numero||'—')+'</b><div class="muted" style="font-size:11px">'+esc(veh||p.ramo||'')+'</div></td><td><span class="badge neutral">'+kind+'</span></td><td>'+esc(r.serie||r.numeroReciboFuente||'—')+'</td><td>'+fmtDate(dueDate(r))+'</td><td class="num">'+moneyDetail(amount(r),r.moneda||cur)+'</td><td><span class="badge '+st.c+'">'+esc(st.t)+'</span></td><td><span class="badge '+rs.c+'">'+esc(rs.t)+'</span></td></tr>';
    }).join('');
    body.innerHTML='<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px"><label style="font-size:12.5px;font-weight:600;color:var(--ink-2)">Filtrar por póliza:</label><select id="rp-native-policy" class="o-sel" style="max-width:360px">'+opts+'</select><span class="muted" style="margin-left:auto;font-size:12px">'+shown.length+' de '+receipts.length+' requerimientos vigentes</span></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:14px"><div class="mini-stat"><div class="muted">Por vencer</div><b>'+money(ps.futureAmount,cur)+'</b></div><div class="mini-stat"><div class="muted">Exigible</div><b>'+money(ps.dueAmount,cur)+'</b></div><div class="mini-stat"><div class="muted">Histórica exigible</div><b>'+money(ps.historicalAmount,cur)+'</b></div><div class="mini-stat"><div class="muted">En cartera</div><b>'+ps.active.length+'</b></div></div>'+(receiptReview.length?'<div class="card pad" data-rp-calendar-review="1" style="border-left:3px solid var(--warn);margin-bottom:12px"><b>Calendario requiere revisión</b><div class="muted" style="margin-top:4px">Hay '+receiptReview.length+' requerimiento(s) de calendarios incompatibles sin autoridad contractual suficiente. No se cuentan como cartera vigente hasta resolverlos.</div></div>':'')+(receiptHistory.length?'<div class="muted" data-rp-calendar-history-count style="font-size:12px;margin:0 0 10px">Historial de calendarios: '+receiptHistory.length+' requerimiento(s) anteriores conservados.</div>':'')+'<div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Póliza / riesgo</th><th>Tipo</th><th>Serie / recibo</th><th>Vence</th><th class="num">Monto</th><th>Estado</th><th>Conciliación</th></tr></thead><tbody>'+(rows||'<tr><td colspan="7" class="muted" style="text-align:center;padding:24px">No hay recibos esperados registrados para este cliente.</td></tr>')+'</tbody></table></div><div style="padding:11px 14px;border-top:1px solid var(--line);font-size:12.5px;color:var(--ink-3)">Cartera conciliada confirma saldo pendiente; no equivale a un pago. Cobros se administran por separado.</div></div>';
    var sel=body.querySelector('#rp-native-policy');if(sel)sel.addEventListener('change',function(){recFilter[cid]=sel.value;renderReceipts(cid);});
    wireReceiptRows(body,cid);
  }

  function patchCobros(cid){
    var body=document.getElementById('c360-body');if(!body)return;
    var applied=Orbit.store.where('cobros',function(c){return c&&c.clienteId===cid;});
    var reported=Orbit.store.where('recibosEsperados',function(r){return r&&r.clienteId===cid&&low(r.estadoOperativo)==='pago_reportado';});
    var reconciled=applied.filter(isPaymentReconciled);
    if(body.querySelector('[data-rp-native-cobros-note]'))return;
    var note=document.createElement('div');note.setAttribute('data-rp-native-cobros-note','1');note.className='card';note.style.cssText='padding:12px 14px;margin-bottom:12px';
    var appliedText=applied.length?reconciled.length+' de '+applied.length+' cobros confirmados están conciliados.':'No hay cobros confirmados para este cliente.';
    var reportedText=reported.length?' Hay '+reported.length+' pago(s) reportado(s) pendientes de validación; se muestran como evidencia y no incrementan cobros confirmados.':'';
    note.innerHTML='<b>Cobros y evidencia de pago</b><div class="muted" style="font-size:12.5px;margin-top:3px">'+appliedText+reportedText+' Cartera conciliada representa saldo pendiente confirmado, no pago.</div>';
    body.insertBefore(note,body.firstChild);
  }

  function patchClient(host){
    var cid=activeClientId();if(!cid||!host)return;patchHeader(cid);
    host.querySelectorAll('.ftab').forEach(function(el){
      if(el.dataset.rpNative==='1')return;el.dataset.rpNative='1';
      el.addEventListener('click',function(){patchHeader(cid);if(el.dataset.tab==='recibos')renderReceipts(cid);else if(el.dataset.tab==='cobros')patchCobros(cid);});
    });
    var active=host.querySelector('.ftab.active');
    if(active&&active.dataset.tab==='recibos')renderReceipts(cid);else if(active&&active.dataset.tab==='cobros')patchCobros(cid);
  }

  function patchPolicyDrawer(id){
    var drawer=document.getElementById('pol-desg');if(!drawer)return;
    var p=Orbit.store.get('polizas',id)||{},allReceipts=Orbit.store.where('recibosEsperados',function(r){return r&&r.polizaId===id;}),receipts=allReceipts.filter(function(r){return calendarClassReceipt(r)==='current';}),receiptReview=allReceipts.filter(function(r){return calendarClassReceipt(r)==='review';});
    var portfolio=Orbit.store.where('carteraPrimas',function(r){return r&&r.polizaId===id;}),hist=portfolio.filter(isHistorical),cur=p.moneda||'GTQ';
    drawer.querySelectorAll('.badge').forEach(function(b){var t=clean(b.textContent);if(t==='Genera cartera')b.textContent='Genera calendario';else if(t==='Histórico (sin cartera)')b.textContent=hist.length?'Histórico · saldo exigible':'Histórico · sin saldo exigible';});
    var headings=Array.from(drawer.querySelectorAll('div')).filter(function(d){return clean(d.textContent).indexOf('🧾 Recibos generados (')===0&&d.children.length===0;});
    var h=headings[0];if(!h)return;h.textContent='🧾 Recibos esperados vigentes ('+receipts.length+')'+(receiptReview.length?' · revisión pendiente: '+receiptReview.length:'');
    var next=h.nextElementSibling;if(!next)return;
    var html=receipts.slice(0,24).map(function(r){var st=stateLabel(r),c=portfolio.find(function(x){return x&&x.reciboId===r.id;})||null,rs=reconciliationLabel(r,c);return'<tr class="clickable" data-rp-receipt-id="'+esc(r.id)+'"><td>'+esc(r.serie||'—')+'</td><td class="num">'+moneyDetail(amount(r),r.moneda||cur)+'</td><td>'+fmtDate(dueDate(r))+'</td><td><span class="badge '+st.c+'">'+esc(st.t)+'</span></td><td><span class="badge '+rs.c+'">'+esc(rs.t)+'</span></td></tr>';}).join('');
    next.outerHTML=receipts.length?'<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Serie</th><th class="num">Monto</th><th>Vence</th><th>Estado</th><th>Conciliación</th></tr></thead><tbody>'+html+'</tbody></table></div>':'<div class="muted" style="font-size:12.5px">Sin recibos esperados registrados.</div>';
    wireReceiptRows(drawer,p.clienteId);
  }

  function installVisualBridges(){
    if(!wrappedQuery)return false;
    var mod=Orbit.modules&&Orbit.modules.cliente360;
    if(mod&&typeof mod.render==='function'){
      if(mod.__rpNativeRenderOwner!==mod.render){var cr=mod.render.bind(mod),clientWrapper=function(host){var out=cr(host);patchClient(host);return out;};mod.render=clientWrapper;mod.__rpNativeRenderOwner=clientWrapper;}
      wrappedClient=mod.__rpNativeRenderOwner===mod.render;
    }else wrappedClient=false;
    var pol=Orbit.modules&&Orbit.modules.polizas;
    if(pol&&typeof pol.verDesglose==='function'){
      if(pol.__rpNativePolicyOwner!==pol.verDesglose){var pd=pol.verDesglose.bind(pol),policyWrapper=function(id){var out=pd(id);setTimeout(function(){patchPolicyDrawer(id);},0);return out;};pol.verDesglose=policyWrapper;pol.__rpNativePolicyOwner=policyWrapper;}
      wrappedPolicies=pol.__rpNativePolicyOwner===pol.verDesglose;
    }else wrappedPolicies=false;
    status.owners.client=wrappedClient;status.owners.policies=wrappedPolicies;refreshStatus();
    return wrappedClient&&wrappedPolicies;
  }

  function reconcileOwners(){installQueryProjection();installVisualBridges();refreshStatus();setTimeout(function(){try{patchClient(document.getElementById('host'));}catch(e){}},0);}
  function boot(){
    var tries=0,t=setInterval(function(){
      tries++;reconcileOwners();
      if(status.ready||tries>100)clearInterval(t);
    },100);
  }

  w.addEventListener('hashchange',function(){setTimeout(reconcileOwners,0);});
  w.addEventListener('orbit:lab:canonical-view-hydrated',function(){setTimeout(reconcileOwners,0);});
  w.addEventListener('orbit:store:emit',function(event){
    var c=event&&event.detail&&event.detail.collection||'';
    if(['recibosEsperados','carteraPrimas','polizas','vehiculos','clientes','aseguradoras','cobros','*'].indexOf(c)>=0)setTimeout(reconcileOwners,0);
  });
  try{document.addEventListener('orbit:session',function(){setTimeout(reconcileOwners,0);});}catch(e){}

  Orbit.receiptsPortfolioProjectionV920={
    status:function(){refreshStatus();return clone(status);},
    amount:amount,dueDate:dueDate,stateLabel:stateLabel,isHistorical:isHistorical,isFuture:isFuture,
    isPaymentReconciled:isPaymentReconciled,isPortfolioReconciled:isPortfolioReconciled,
    reconciliationLabel:reconciliationLabel,portfolioSummary:portfolioSummary,
    renderReceipts:renderReceipts,renderReceiptDetail:renderReceiptDetail,openReceiptDetail:openReceiptDetail,editReceipt:editReceipt,
    reconcileOwners:reconcileOwners
  };
  Orbit.receiptsPortfolioProjection=Orbit.receiptsPortfolioProjectionV920;
  boot();
})();
