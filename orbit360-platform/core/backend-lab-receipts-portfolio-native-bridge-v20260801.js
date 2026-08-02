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
  var params=new URLSearchParams(w.location.search||'');
  var mode=params.get('orbitBackend')||(w.OrbitBackend&&w.OrbitBackend.mode)||'';
  var tenant=params.get('tenant')||(w.OrbitBackend&&(w.OrbitBackend.tenantId||w.OrbitBackend.tenant))||'';
  if(mode!=='firestore-lab'||tenant!=='alianzas-soluciones') return;

  var wrappedQuery=false,wrappedClient=false,wrappedPolicies=false;
  var recFilter={};
  var status={
    version:'9.2.0-native-store',
    ownerRevision:'20260801-canonical-single-read-owner',
    tenantId:tenant,
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
  var isHistorical=function(r){return !!(r&&((r.historicalExigible===true)||clean(r.carteraTipo)==='cartera_historica_exigible'||clean(r.exigibilidad)==='historica_exigible'));};
  function esc(v){try{return Orbit.ui&&Orbit.ui.esc?Orbit.ui.esc(v):clean(v).replace(/[&<>"']/g,function(ch){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch];});}catch(e){return clean(v);}}
  function money(v,cur){try{return Orbit.ui&&Orbit.ui.money?Orbit.ui.money(v,cur||'GTQ'):(cur||'GTQ')+' '+num(v).toFixed(2);}catch(e){return (cur||'GTQ')+' '+num(v).toFixed(2);}}
  function moneyDetail(v,cur){var n=numberOrNull(v);if(n==null)return'Pendiente de completar';var code=clean(cur||'GTQ'),symbol=code==='GTQ'?'Q':code==='COP'?'$':code==='USD'?'US$':code==='EUR'?'€':code;try{return symbol+' '+n.toLocaleString('es-GT',{minimumFractionDigits:2,maximumFractionDigits:2});}catch(e){return symbol+' '+n.toFixed(2);}}
  function fmtDate(v){try{return Orbit.ui&&Orbit.ui.fmtDate?Orbit.ui.fmtDate(v):clean(v);}catch(e){return clean(v);}}

  function storeReady(){
    var S=Orbit.store;
    if(!S||typeof S.all!=='function'||typeof S.get!=='function'||typeof S.where!=='function')return false;
    if(S.__canonicalReadModelV79!==true||S.__singleReadOwner!==true)return false;
    try{
      var a=S._collectionPath&&S._collectionPath('recibosEsperados');
      var b=S._collectionPath&&S._collectionPath('carteraPrimas');
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
    var rows=Orbit.store.where('carteraPrimas',function(r){return r&&r.clienteId===cid;});
    var future=rows.filter(isFuture),due=rows.filter(function(r){return!isFuture(r);});
    var historical=rows.filter(isHistorical),active=rows.filter(function(r){return!isHistorical(r);});
    var reconciled=rows.filter(isPortfolioReconciled);
    function sum(a){return a.reduce(function(s,r){return s+amount(r);},0);}
    return{rows:rows,future:future,due:due,historical:historical,active:active,reconciled:reconciled,futureAmount:sum(future),dueAmount:sum(due),historicalAmount:sum(historical),reconciledAmount:sum(reconciled),totalAmount:sum(rows)};
  }

  function markSummaryApplied(r){
    if(!r||typeof r!=='object')return r;
    try{Object.defineProperty(r,'__orbitRpNativeSummaryApplied',{value:true,configurable:true,enumerable:false});}catch(e){}
    return r;
  }

  function installQueryProjection(){
    if(!storeReady()||!Orbit.q||typeof Orbit.q.clienteResumen!=='function')return false;
    var q=Orbit.q;
    q.recibosEsperadosDe=function(cid){return Orbit.store.where('recibosEsperados',function(r){return r&&r.clienteId===cid;});};
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

  function renderReceipts(cid){
    var body=document.getElementById('c360-body');if(!body||!Orbit.q||!Orbit.q.recibosEsperadosDe)return;
    var receipts=Orbit.q.recibosEsperadosDe(cid).slice().sort(function(a,b){return dueDate(a).localeCompare(dueDate(b));});
    var portfolio=Orbit.q.carteraPrimasDe(cid),byReceipt={};portfolio.forEach(function(x){byReceipt[x.reciboId]=x;});
    var policies=Orbit.store.where('polizas',function(p){return p&&p.clienteId===cid;});
    var selected=recFilter[cid]||'todas';var shown=selected==='todas'?receipts:receipts.filter(function(r){return r.polizaId===selected;});
    var ps=portfolioSummary(cid),cur=(Orbit.store.get('clientes',cid)||{}).moneda||'GTQ';
    var opts='<option value="todas">Todas las pólizas</option>'+policies.map(function(p){return'<option value="'+esc(p.id)+'" '+(selected===p.id?'selected':'')+'>'+esc(policyLabel(p))+'</option>';}).join('');
    var rows=shown.map(function(r){
      var c=byReceipt[r.id]||null,p=Orbit.store.get('polizas',r.polizaId)||{},v=Orbit.store.where('vehiculos',function(x){return x&&x.polizaId===r.polizaId;})[0];
      var st=stateLabel(r),rs=reconciliationLabel(r,c),hist=isHistorical(r)||isHistorical(c),kind=hist?'Histórica exigible':'Calendario activo';
      var veh=v?[v.marca,v.linea,v.placa].filter(Boolean).join(' '):'';
      return'<tr><td><b>'+esc(r.polizaNumero||p.numero||'—')+'</b><div class="muted" style="font-size:11px">'+esc(veh||p.ramo||'')+'</div></td><td><span class="badge '+(hist?'info':'neutral')+'">'+kind+'</span></td><td>'+esc(r.serie||r.numeroReciboFuente||'—')+'</td><td>'+fmtDate(dueDate(r))+'</td><td class="num">'+moneyDetail(amount(r),r.moneda||cur)+'</td><td><span class="badge '+st.c+'">'+esc(st.t)+'</span></td><td><span class="badge '+rs.c+'">'+esc(rs.t)+'</span></td></tr>';
    }).join('');
    body.innerHTML='<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px"><label style="font-size:12.5px;font-weight:600;color:var(--ink-2)">Filtrar por póliza:</label><select id="rp-native-policy" class="o-sel" style="max-width:360px">'+opts+'</select><span class="muted" style="margin-left:auto;font-size:12px">'+shown.length+' de '+receipts.length+' recibos</span></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:14px"><div class="mini-stat"><div class="muted">Por vencer</div><b>'+money(ps.futureAmount,cur)+'</b></div><div class="mini-stat"><div class="muted">Exigible</div><b>'+money(ps.dueAmount,cur)+'</b></div><div class="mini-stat"><div class="muted">Histórica exigible</div><b>'+money(ps.historicalAmount,cur)+'</b></div><div class="mini-stat"><div class="muted">En cartera</div><b>'+portfolio.length+'</b></div></div><div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Póliza / riesgo</th><th>Tipo</th><th>Serie / recibo</th><th>Vence</th><th class="num">Monto</th><th>Estado</th><th>Conciliación</th></tr></thead><tbody>'+(rows||'<tr><td colspan="7" class="muted" style="text-align:center;padding:24px">No hay recibos esperados registrados para este cliente.</td></tr>')+'</tbody></table></div><div style="padding:11px 14px;border-top:1px solid var(--line);font-size:12.5px;color:var(--ink-3)">Cartera conciliada confirma saldo pendiente; no equivale a un pago. Cobros se administran por separado.</div></div>';
    var sel=body.querySelector('#rp-native-policy');if(sel)sel.addEventListener('change',function(){recFilter[cid]=sel.value;renderReceipts(cid);});
  }

  function patchCobros(cid){
    var body=document.getElementById('c360-body');if(!body)return;
    var applied=Orbit.store.where('cobros',function(c){return c&&c.clienteId===cid;});
    var reconciled=applied.filter(isPaymentReconciled);
    if(body.querySelector('[data-rp-native-cobros-note]'))return;
    var note=document.createElement('div');note.setAttribute('data-rp-native-cobros-note','1');note.className='card';note.style.cssText='padding:12px 14px;margin-bottom:12px';
    note.innerHTML='<b>Cobros aplicados</b><div class="muted" style="font-size:12.5px;margin-top:3px">'+(applied.length?reconciled.length+' de '+applied.length+' cobros están conciliados.':'Aún no hay cobros aplicados para este cliente.')+' Cartera conciliada representa saldo pendiente confirmado, no pago.</div>';
    body.insertBefore(note,body.firstChild);
  }

  function patchClient(host){
    var cid=activeClientId();if(!cid||!host)return;patchHeader(cid);
    host.querySelectorAll('.ftab').forEach(function(el){
      if(el.dataset.rpNative==='1')return;el.dataset.rpNative='1';
      el.addEventListener('click',function(){setTimeout(function(){patchHeader(cid);if(el.dataset.tab==='recibos')renderReceipts(cid);else if(el.dataset.tab==='cobros')patchCobros(cid);},0);});
    });
    var active=host.querySelector('.ftab.active');
    if(active&&active.dataset.tab==='recibos')renderReceipts(cid);else if(active&&active.dataset.tab==='cobros')patchCobros(cid);
  }

  function patchPolicyDrawer(id){
    var drawer=document.getElementById('pol-desg');if(!drawer)return;
    var p=Orbit.store.get('polizas',id)||{},receipts=Orbit.store.where('recibosEsperados',function(r){return r&&r.polizaId===id;});
    var portfolio=Orbit.store.where('carteraPrimas',function(r){return r&&r.polizaId===id;}),hist=portfolio.filter(isHistorical),cur=p.moneda||'GTQ';
    drawer.querySelectorAll('.badge').forEach(function(b){var t=clean(b.textContent);if(t==='Genera cartera')b.textContent='Genera calendario';else if(t==='Histórico (sin cartera)')b.textContent=hist.length?'Histórico · saldo exigible':'Histórico · sin saldo exigible';});
    var headings=Array.from(drawer.querySelectorAll('div')).filter(function(d){return clean(d.textContent).indexOf('🧾 Recibos generados (')===0&&d.children.length===0;});
    var h=headings[0];if(!h)return;h.textContent='🧾 Recibos esperados ('+receipts.length+')';
    var next=h.nextElementSibling;if(!next)return;
    var html=receipts.slice(0,24).map(function(r){var st=stateLabel(r),c=portfolio.find(function(x){return x&&x.reciboId===r.id;})||null,rs=reconciliationLabel(r,c);return'<tr><td>'+esc(r.serie||'—')+'</td><td class="num">'+moneyDetail(amount(r),r.moneda||cur)+'</td><td>'+fmtDate(dueDate(r))+'</td><td><span class="badge '+st.c+'">'+esc(st.t)+'</span></td><td><span class="badge '+rs.c+'">'+esc(rs.t)+'</span></td></tr>';}).join('');
    next.outerHTML=receipts.length?'<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Serie</th><th class="num">Monto</th><th>Vence</th><th>Estado</th><th>Conciliación</th></tr></thead><tbody>'+html+'</tbody></table></div>':'<div class="muted" style="font-size:12.5px">Sin recibos esperados registrados.</div>';
  }

  function installVisualBridges(){
    if(!wrappedQuery)return false;
    var mod=Orbit.modules&&Orbit.modules.cliente360;
    if(mod&&typeof mod.render==='function'){
      if(mod.__rpNativeRenderOwner!==mod.render){var cr=mod.render.bind(mod),clientWrapper=function(host){var out=cr(host);setTimeout(function(){patchClient(host);},0);return out;};mod.render=clientWrapper;mod.__rpNativeRenderOwner=clientWrapper;}
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
    renderReceipts:renderReceipts,reconcileOwners:reconcileOwners
  };
  boot();
})();
