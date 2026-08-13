/* Orbit 360 · Recibos/Cartera 9.1.0 · proyección LAB read-only
 * Aditiva: no reemplaza Orbit.store ni escribe datos.
 * Expone recibosEsperados/carteraPrimas por la misma API pública del store
 * y corrige únicamente la proyección visual Cliente 360 / Pólizas.
 */
(function(){
  'use strict';
  var w=window; w.Orbit=w.Orbit||{};
  var params=new URLSearchParams(w.location.search||'');
  var mode=params.get('orbitBackend')||(w.OrbitBackend&&w.OrbitBackend.mode)||'';
  var tenant=params.get('tenant')||(w.OrbitBackend&&(w.OrbitBackend.tenantId||w.OrbitBackend.tenant))||'';
  if(mode!=='firestore-lab'||tenant!=='alianzas-soluciones') return;

  var NAMES=['recibosEsperados','carteraPrimas'];
  var cache={recibosEsperados:[],carteraPrimas:[]};
  var unsub=[];
  var wrappedStore=false,wrappedQuery=false,wrappedClient=false,wrappedPolicies=false;
  var status={version:'9.1.0',ownerRevision:'20260801.1-receipt-header-badge',tenantId:tenant,readOnly:true,attached:[],counts:{recibosEsperados:0,carteraPrimas:0},errors:{},owners:{query:false,client:false,policies:false},ready:false};
  var recFilter={};
  var clean=function(v){return String(v==null?'':v).trim();};
  var low=function(v){return clean(v).toLowerCase();};
  var num=function(v){var n=Number(v);return Number.isFinite(n)?n:0;};
  var numberOrNull=function(v){if(v==null||clean(v)==='')return null;var n=Number(v);return Number.isFinite(n)?n:null;};
  var rowId=function(r){return r&&(r.id||r.uid||r.codigo||r.numero||r.key);};
  var clone=function(v){try{return JSON.parse(JSON.stringify(v));}catch(e){return v;}};
  var isSupplemental=function(name){return NAMES.indexOf(name)>=0;};
  var amount=function(r){return num(r&&((r.primaTotal!=null?r.primaTotal:(r.montoTotal!=null?r.montoTotal:(r.montoFuente!=null?r.montoFuente:r.monto)))));};
  var dueDate=function(r){return clean(r&&(r.fechaLimite||r.vence||r.fechaVencimiento));};
  var isFuture=function(r){return clean(r&&r.exigibilidad)==='futura'||clean(r&&r.estadoOperativo)==='futuro_pendiente';};
  var isHistorical=function(r){return r&&((r.historicalExigible===true)||clean(r.carteraTipo)==='cartera_historica_exigible'||clean(r.exigibilidad)==='historica_exigible');};
  function esc(v){try{return Orbit.ui&&Orbit.ui.esc?Orbit.ui.esc(v):clean(v).replace(/[&<>"']/g,function(ch){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'})[ch];});}catch(e){return clean(v);}}
  function money(v,cur){try{return Orbit.ui&&Orbit.ui.money?Orbit.ui.money(v,cur||'GTQ'):(cur||'GTQ')+' '+num(v).toFixed(2);}catch(e){return (cur||'GTQ')+' '+num(v).toFixed(2);}}
  function moneyDetail(v,cur){var n=numberOrNull(v);if(n==null)return'Pendiente de completar';var code=clean(cur||'GTQ'),symbol=code==='GTQ'?'Q':code==='COP'?'$':code==='USD'?'US$':code==='EUR'?'€':code;try{return symbol+' '+n.toLocaleString('es-GT',{minimumFractionDigits:2,maximumFractionDigits:2});}catch(e){return symbol+' '+n.toFixed(2);}}
  function fmtDate(v){try{return Orbit.ui&&Orbit.ui.fmtDate?Orbit.ui.fmtDate(v):clean(v);}catch(e){return clean(v);}}
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
    if(isPaymentReconciled(r))return{t:'Cobro conciliado',c:'ok',kind:'payment'};
    if(isPortfolioReconciled(portfolio))return{t:'Cartera conciliada con aseguradora',c:'ok',kind:'balance'};
    if(r&&low(r.estadoOperativo)==='pago_reportado')return{t:'Pago reportado · por conciliar',c:'info',kind:'reported'};
    if(r&&low(r.estadoOperativo)==='requiere_validacion_estado')return{t:'Requiere validación',c:'warn',kind:'hold'};
    return{t:'Pendiente de conciliación',c:'warn',kind:'pending'};
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
  function storeRows(name){return (cache[name]||[]).slice();}
  function whereSupplemental(name,fieldOrPredicate,opOrValue,maybeValue){
    var rows=storeRows(name);
    if(typeof fieldOrPredicate==='function')return rows.filter(function(r){try{return!!fieldOrPredicate(r);}catch(e){return false;}});
    if(fieldOrPredicate&&typeof fieldOrPredicate==='object')return rows.filter(function(r){return Object.keys(fieldOrPredicate).every(function(k){return r&&r[k]===fieldOrPredicate[k];});});
    var field=fieldOrPredicate,op=arguments.length>=4?opOrValue:'==',value=arguments.length>=4?maybeValue:opOrValue;
    return rows.filter(function(r){if(!r)return false;var x=r[field];if(op==='=='||op==='=')return x===value;if(op==='!=')return x!==value;if(op==='>')return x>value;if(op==='>=')return x>=value;if(op==='<')return x<value;if(op==='<=')return x<=value;if(op==='array-contains')return Array.isArray(x)&&x.indexOf(value)>=0;return false;});
  }
  function wrapStore(){
    if(wrappedStore)return true;if(!Orbit.store||typeof Orbit.store.all!=='function')return false;
    var S=Orbit.store,base={all:S.all.bind(S),get:S.get.bind(S),where:S.where.bind(S),find:S.find.bind(S),raw:typeof S.raw==='function'?S.raw.bind(S):null,emit:typeof S._emit==='function'?S._emit.bind(S):null};
    S.all=function(name){return isSupplemental(name)?storeRows(name):base.all(name);};
    S.get=function(name,id){return isSupplemental(name)?storeRows(name).find(function(r){return rowId(r)===id;})||null:base.get(name,id);};
    S.where=function(name,a,b,c){return isSupplemental(name)?whereSupplemental(name,a,b,c):base.where(name,a,b,c);};
    S.find=function(name,p){return isSupplemental(name)?(typeof p==='function'?storeRows(name).find(p)||null:whereSupplemental(name,p)[0]||null):base.find(name,p);};
    if(base.raw)S.raw=function(){var out=base.raw()||{};NAMES.forEach(function(n){out[n]=storeRows(n);});return out;};
    S._receiptsPortfolioProjectionStatus=function(){return clone(status);};
    status._emit=base.emit;
    wrappedStore=true;return true;
  }
  function emit(name){try{if(status._emit)status._emit(name);else w.dispatchEvent(new CustomEvent('orbit:store:emit',{detail:{collection:name}}));}catch(e){}}
  function database(){try{return w.firebase&&typeof w.firebase.firestore==='function'?w.firebase.firestore():null;}catch(e){return null;}}
  function detach(){unsub.splice(0).forEach(function(fn){try{fn();}catch(e){}});status.attached=[];status.ready=false;}
  function attach(){
    if(!wrapStore())return false;var db=database();if(!db)return false;detach();
    NAMES.forEach(function(name){
      try{
        var ref=db.collection('tenantId').doc(tenant).collection(name);
        var off=ref.onSnapshot(function(snap){
          var rows=[];snap.forEach(function(doc){var d=doc.data()||{};rows.push(Object.assign({},d,{id:d.id||doc.id}));});
          cache[name]=rows;status.counts[name]=rows.length;if(status.attached.indexOf(name)<0)status.attached.push(name);delete status.errors[name];status.ready=NAMES.every(function(n){return status.attached.indexOf(n)>=0;});emit(name);installQueryProjection();installVisualBridges();
        },function(err){status.errors[name]=clean(err&&err.code||err&&err.message||err).slice(0,120);status.ready=false;});
        if(typeof off==='function')unsub.push(off);
      }catch(e){status.errors[name]=clean(e&&e.message||e).slice(0,120);}
    });
    return true;
  }
  function portfolioSummary(cid){
    var rows=Orbit.store.where('carteraPrimas',function(r){return r&&r.clienteId===cid;});
    var future=rows.filter(isFuture),due=rows.filter(function(r){return!isFuture(r);}),hist=rows.filter(isHistorical),active=rows.filter(function(r){return!isHistorical(r);}),reconciled=rows.filter(isPortfolioReconciled);
    function sum(a){return a.reduce(function(s,r){return s+amount(r);},0);}
    return{rows:rows,future:future,due:due,historical:hist,active:active,reconciled:reconciled,futureAmount:sum(future),dueAmount:sum(due),historicalAmount:sum(hist),reconciledAmount:sum(reconciled),totalAmount:sum(rows)};
  }
  function markSummaryApplied(r){
    if(!r||typeof r!=='object')return r;
    try{Object.defineProperty(r,'__orbitRpV910SummaryApplied',{value:true,configurable:true,enumerable:false});}catch(e){try{r.__orbitRpV910SummaryApplied=true;}catch(ignore){}}
    return r;
  }
  function installQueryProjection(){
    if(!Orbit.q||typeof Orbit.q.clienteResumen!=='function'||!wrappedStore)return false;
    var q=Orbit.q;
    q.recibosEsperadosDe=function(cid){return Orbit.store.where('recibosEsperados',function(r){return r&&r.clienteId===cid;});};
    q.carteraPrimasDe=function(cid){return Orbit.store.where('carteraPrimas',function(r){return r&&r.clienteId===cid;});};
    q.carteraPrimasResumenDe=portfolioSummary;
    if(q.__rpV910ClienteResumenOwner!==q.clienteResumen){
      var base=q.clienteResumen.bind(q);
      var projected=function(cid){
        var r=base(cid);if(r&&r.__orbitRpV910SummaryApplied===true)return r;
        r=r||{};var p=portfolioSummary(cid),rec=q.recibosEsperadosDe(cid);
        r.recibosEsperados=rec;r.carteraPrimas=p.rows;r.carteraActiva=p.active;r.carteraHistorica=p.historical;r.carteraFutura=p.future;r.carteraExigible=p.due;r.carteraConciliada=p.reconciled;
        r.pendiente=p.futureAmount;r.vencido=p.dueAmount;r.carteraHistoricaMonto=p.historicalAmount;r.carteraConciliadaMonto=p.reconciledAmount;r.carteraTotal=p.totalAmount;
        if(p.dueAmount>0)r.salud=Math.max(8,Number(r.salud||70)-25);
        return markSummaryApplied(r);
      };
      try{Object.defineProperty(projected,'__orbitRpV910QueryOwner',{value:true});}catch(e){}
      q.clienteResumen=projected;q.__rpV910ClienteResumenOwner=projected;
    }
    wrappedQuery=q.__rpV910ClienteResumenOwner===q.clienteResumen;status.owners.query=wrappedQuery;return wrappedQuery;
  }
  function activeClientId(){try{return Orbit.route&&Orbit.route.params&&Orbit.route.params.c||'';}catch(e){return'';}}
  function patchHeader(cid){
    var p=portfolioSummary(cid);document.querySelectorAll('.fh-kpis>div').forEach(function(cell){var lab=cell.querySelector('.fh-kpi-lab'),val=cell.querySelector('.fh-kpi-val');if(!lab||!val)return;var t=clean(lab.textContent);if(t.indexOf('Cartera al día')>=0){lab.textContent='Cartera por vencer';val.textContent=money(p.futureAmount,(Orbit.store.get('clientes',cid)||{}).moneda||'GTQ');}else if(t.indexOf('Cartera vencida')>=0){lab.textContent='Cartera exigible';val.textContent=money(p.dueAmount,(Orbit.store.get('clientes',cid)||{}).moneda||'GTQ');}});
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
  function renderReceiptDetail(receiptId,cid){
    var r=Orbit.store.get('recibosEsperados',receiptId);if(!r)return false;
    var p=Orbit.store.get('polizas',r.polizaId)||{},c=Orbit.store.get('clientes',cid||r.clienteId)||{},v=Orbit.store.where('vehiculos',function(x){return x&&x.polizaId===r.polizaId;})[0]||{},portfolio=Orbit.store.where('carteraPrimas',function(x){return x&&x.reciboId===r.id;})[0]||null,cur=r.moneda||p.moneda||c.moneda||'GTQ',st=stateLabel(r),rec= reconciliationLabel(r,portfolio),target=document.getElementById('host')||document.getElementById('c360-body');if(!target)return false;
    var back='#/cliente360?c='+encodeURIComponent(cid||r.clienteId||p.clienteId||'')+'&t=recibos';
    var cell=function(k,val){return'<div><div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.04em">'+esc(k)+'</div><div style="font-weight:650;margin-top:2px">'+esc(val==null||clean(val)===''?'Pendiente de completar':val)+'</div></div>';};
    target.innerHTML='<div class="page orbit-receipt-fullpage" data-rp-receipt-detail="1"><div class="crumb" style="margin-bottom:14px"><a href="'+back+'" style="color:var(--red)">‹ Volver a Recibos y pagos</a> / Recibo '+esc(r.serie||r.numeroReciboFuente||'')+'</div><div class="card" style="overflow:hidden;margin-bottom:16px"><div data-rp-receipt-hero="1" style="padding:20px 22px;background:linear-gradient(120deg,var(--graph),#10141a);display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap"><div><div style="color:rgba(255,255,255,.7);font-size:11px;text-transform:uppercase;letter-spacing:.12em">Recibo esperado · '+esc(r.serie||'—')+'</div><h2 style="color:#fff;margin:4px 0">Póliza '+esc(r.polizaNumero||p.numero||'—')+'</h2><div style="color:rgba(255,255,255,.85)">'+esc([v.marca,v.linea,v.placa].filter(Boolean).join(' ')||p.ramo||'')+'</div></div><span data-rp-hero-status="1" class="badge '+st.c+'" style="align-self:flex-start;flex:0 0 auto;margin-top:2px">'+esc(st.t)+'</span></div></div><div class="orbit-detail-layout" style="display:grid;grid-template-columns:minmax(0,1.2fr) minmax(300px,.8fr);gap:16px"><section class="card pad"><h3 style="margin-top:0">Desglose del recibo</h3><div class="orbit-detail-grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px">'+cell('Prima neta',moneyDetail(r.primaNeta,cur))+cell('Gastos de expedición',moneyDetail(r.gastosExpedicion,cur))+cell('Gastos financieros',moneyDetail(r.gastosFinanciamiento,cur))+cell('Descuento / ajuste (campo fuente)',moneyDetail(r.descuento,cur))+cell('IVA / impuestos',moneyDetail(r.impuestosIVA,cur))+cell('Prima total',moneyDetail(r.primaTotal,cur))+cell('Fecha límite',fmtDate(dueDate(r)))+cell('Fecha pago reportada',r.fechaPagoReportada?fmtDate(r.fechaPagoReportada):'No reportada')+'</div></section><div style="display:grid;gap:16px"><section class="card pad"><h3 style="margin-top:0">Estado y conciliación</h3><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><span class="badge '+st.c+'">'+esc(st.t)+'</span><span class="badge '+rec.c+'">'+esc(rec.t)+'</span></div><div class="muted" style="line-height:1.5">'+esc(receiptStateNote(r,portfolio))+'</div>'+ (portfolio?'<div style="margin-top:10px">En cartera: <b>'+esc(moneyDetail(portfolio.primaTotal||r.primaTotal,cur))+'</b></div>':'') +'</section><section class="card pad"><h3 style="margin-top:0">Trazabilidad</h3>'+cell('Fuente autoridad',(portfolio&&portfolio.fuenteAutoridad)||r.fuenteAutoridad||'Pendiente de completar')+cell('Corte de fuente',(portfolio&&portfolio.fechaCorteFuente)||r.fechaCorteFuente||'Pendiente de completar')+cell('Calidad de match',(portfolio&&portfolio.matchQuality)||r.matchQuality||'Pendiente de completar')+cell('Referencia fuente',(portfolio&&portfolio.sourceRef)||r.sourceRef||'Pendiente de completar')+'</section></div></div></div>';
    return true;
  }
  function openReceiptDetail(receiptId,cid){return renderReceiptDetail(receiptId,cid);}
  function wireReceiptRows(body,cid){if(!body)return;body.querySelectorAll('[data-rp-receipt-id]').forEach(function(row){row.addEventListener('click',function(){openReceiptDetail(row.getAttribute('data-rp-receipt-id'),cid);});});}
  function renderReceipts(cid){
    var body=document.getElementById('c360-body');if(!body)return;
    var receipts=Orbit.q.recibosEsperadosDe(cid).slice().sort(function(a,b){return dueDate(a).localeCompare(dueDate(b));});
    var portfolio=Orbit.q.carteraPrimasDe(cid),byReceipt={};portfolio.forEach(function(x){byReceipt[x.reciboId]=x;});
    var policies=Orbit.store.where('polizas',function(p){return p&&p.clienteId===cid;});
    var selected=recFilter[cid]||'todas';var shown=selected==='todas'?receipts:receipts.filter(function(r){return r.polizaId===selected;});
    var ps=portfolioSummary(cid),cur=(Orbit.store.get('clientes',cid)||{}).moneda||'GTQ';
    var opts='<option value="todas">Todas las pólizas</option>'+policies.map(function(p){return'<option value="'+esc(p.id)+'" '+(selected===p.id?'selected':'')+'>'+esc(policyLabel(p))+'</option>';}).join('');
    var rows=shown.map(function(r){var c=byReceipt[r.id]||null,p=Orbit.store.get('polizas',r.polizaId)||{},v=Orbit.store.where('vehiculos',function(x){return x&&x.polizaId===r.polizaId;})[0],st=stateLabel(r),rs=reconciliationLabel(r,c),hist=isHistorical(r)||isHistorical(c),kind=hist?'Histórica exigible':'Calendario activo',veh=v?[v.marca,v.linea,v.placa].filter(Boolean).join(' '):'';return'<tr class="clickable" data-rp-receipt-id="'+esc(r.id)+'"><td><b>'+esc(r.polizaNumero||p.numero||'—')+'</b><div class="muted" style="font-size:11px">'+esc(veh||p.ramo||'')+'</div></td><td><span class="badge '+(hist?'info':'neutral')+'">'+kind+'</span></td><td>'+esc(r.serie||r.numeroReciboFuente||'—')+'</td><td>'+fmtDate(dueDate(r))+'</td><td class="num">'+moneyDetail(amount(r),r.moneda||cur)+'</td><td><span class="badge '+st.c+'">'+esc(st.t)+'</span></td><td><span class="badge '+rs.c+'">'+esc(rs.t)+'</span></td></tr>';}).join('');
    body.innerHTML='<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px"><label style="font-size:12.5px;font-weight:600;color:var(--ink-2)">Filtrar por póliza:</label><select id="rp-v910-policy" class="o-sel" style="max-width:360px">'+opts+'</select><span class="muted" style="margin-left:auto;font-size:12px">'+shown.length+' de '+receipts.length+' recibos</span></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:14px" class="rp-v910-kpis"><div class="mini-stat"><div class="muted">Por vencer</div><b>'+money(ps.futureAmount,cur)+'</b></div><div class="mini-stat"><div class="muted">Exigible</div><b>'+money(ps.dueAmount,cur)+'</b></div><div class="mini-stat"><div class="muted">Histórica exigible</div><b>'+money(ps.historicalAmount,cur)+'</b></div><div class="mini-stat"><div class="muted">En cartera</div><b>'+portfolio.length+'</b></div><div class="mini-stat"><div class="muted">Conciliada con aseguradora</div><b>'+ps.reconciled.length+'</b></div></div><div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Póliza / riesgo</th><th>Tipo</th><th>Serie / recibo</th><th>Vence</th><th class="num">Monto</th><th>Estado</th><th>Conciliación</th></tr></thead><tbody>'+(rows||'<tr><td colspan="7" class="muted" style="text-align:center;padding:24px">No hay recibos esperados registrados para este cliente.</td></tr>')+'</tbody></table></div><div style="padding:11px 14px;border-top:1px solid var(--line);font-size:12.5px;color:var(--ink-3)">Cartera conciliada confirma el saldo pendiente contra la aseguradora; no equivale a un pago. Un pago reportado solo se muestra como <b>Cobro conciliado</b> cuando su conciliación de fuentes está confirmada. Clic en un recibo abre su detalle.</div></div>';
    var sel=body.querySelector('#rp-v910-policy');if(sel)sel.addEventListener('change',function(){recFilter[cid]=sel.value;renderReceipts(cid);});wireReceiptRows(body,cid);
  }
  function patchCobros(cid){
    var body=document.getElementById('c360-body');if(!body)return;
    var applied=Orbit.store.where('cobros',function(c){return c&&c.clienteId===cid;});
    var reconciled=applied.filter(isPaymentReconciled);
    if(!body.querySelector('[data-rp-v910-cobros-note]')){
      var note=document.createElement('div');note.setAttribute('data-rp-v910-cobros-note','1');note.className='card';note.style.cssText='padding:12px 14px;margin-bottom:12px';
      if(!applied.length)note.innerHTML='<b>Cobros aplicados</b><div class="muted" style="font-size:12.5px;margin-top:3px">Aún no hay cobros aplicados para este cliente. Los recibos pendientes y pagos reportados se consultan en <b>Recibos y pagos</b> hasta completar su conciliación.</div>';
      else note.innerHTML='<b>Cobros aplicados</b><div class="muted" style="font-size:12.5px;margin-top:3px">'+reconciled.length+' de '+applied.length+' cobros están conciliados. Cartera conciliada se mantiene separada porque representa saldo pendiente confirmado, no pago.</div>';
      body.insertBefore(note,body.firstChild);
    }
  }
  function patchClient(host){
    var cid=activeClientId();if(!cid||!host)return;patchHeader(cid);
    host.querySelectorAll('.ftab').forEach(function(el){if(el.dataset.rpV910==='1')return;el.dataset.rpV910='1';el.addEventListener('click',function(){setTimeout(function(){patchHeader(cid);if(el.dataset.tab==='recibos')renderReceipts(cid);else if(el.dataset.tab==='cobros')patchCobros(cid);},0);});});
    var active=host.querySelector('.ftab.active');if(active&&active.dataset.tab==='recibos')renderReceipts(cid);else if(active&&active.dataset.tab==='cobros')patchCobros(cid);
  }
  function patchPolicyDrawer(id){
    var drawer=document.getElementById('pol-desg');if(!drawer)return;var p=Orbit.store.get('polizas',id)||{},receipts=Orbit.store.where('recibosEsperados',function(r){return r&&r.polizaId===id;}),portfolio=Orbit.store.where('carteraPrimas',function(r){return r&&r.polizaId===id;}),hist=portfolio.filter(isHistorical);var cur=p.moneda||'GTQ';
    drawer.querySelectorAll('.badge').forEach(function(b){var t=clean(b.textContent);if(t==='Genera cartera')b.textContent='Genera calendario';else if(t==='Histórico (sin cartera)')b.textContent=hist.length?'Histórico · saldo exigible':'Histórico · sin saldo exigible';});
    var headings=Array.from(drawer.querySelectorAll('div')).filter(function(d){return clean(d.textContent).indexOf('🧾 Recibos generados (')===0&&d.children.length===0;});var h=headings[0];if(h){h.textContent='🧾 Recibos esperados ('+receipts.length+')';var next=h.nextElementSibling;if(next){var html=receipts.slice(0,24).map(function(r){var st=stateLabel(r),c=portfolio.find(function(x){return x&&x.reciboId===r.id;})||null,rs=reconciliationLabel(r,c);return'<tr class="clickable" data-rp-receipt-id="'+esc(r.id)+'"><td>'+esc(r.serie||'—')+'</td><td class="num">'+moneyDetail(amount(r),r.moneda||cur)+'</td><td>'+fmtDate(dueDate(r))+'</td><td><span class="badge '+st.c+'">'+esc(st.t)+'</span></td><td><span class="badge '+rs.c+'">'+esc(rs.t)+'</span></td></tr>';}).join('');next.outerHTML=receipts.length?'<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Serie</th><th class="num">Monto</th><th>Vence</th><th>Estado</th><th>Conciliación</th></tr></thead><tbody>'+html+'</tbody></table></div>':'<div class="muted" style="font-size:12.5px">Sin recibos esperados registrados.</div>';wireReceiptRows(drawer,p.clienteId);}}
  }
  function installVisualBridges(){
    if(!wrappedQuery)return false;
    var mod=Orbit.modules&&Orbit.modules.cliente360;
    if(mod&&typeof mod.render==='function'){
      if(mod.__rpV910RenderOwner!==mod.render){var cr=mod.render.bind(mod),clientWrapper=function(host){var out=cr(host);setTimeout(function(){patchClient(host);},0);return out;};try{Object.defineProperty(clientWrapper,'__orbitRpV910ClientOwner',{value:true});}catch(e){}mod.render=clientWrapper;mod.__rpV910RenderOwner=clientWrapper;}wrappedClient=mod.__rpV910RenderOwner===mod.render;
    }else wrappedClient=false;
    var pol=Orbit.modules&&Orbit.modules.polizas;
    if(pol&&typeof pol.verDesglose==='function'){
      if(pol.__rpV910PolicyOwner!==pol.verDesglose){var pd=pol.verDesglose.bind(pol),policyWrapper=function(id){var out=pd(id);setTimeout(function(){patchPolicyDrawer(id);},0);return out;};try{Object.defineProperty(policyWrapper,'__orbitRpV910PolicyOwner',{value:true});}catch(e){}pol.verDesglose=policyWrapper;pol.__rpV910PolicyOwner=policyWrapper;}wrappedPolicies=pol.__rpV910PolicyOwner===pol.verDesglose;
    }else wrappedPolicies=false;
    status.owners.client=wrappedClient;status.owners.policies=wrappedPolicies;return wrappedClient&&wrappedPolicies;
  }
  function reconcileOwners(){wrapStore();installQueryProjection();installVisualBridges();setTimeout(function(){try{patchClient(document.getElementById('host'));}catch(e){}},0);}
  function boot(){wrapStore();installQueryProjection();installVisualBridges();try{if(w.firebase&&typeof w.firebase.auth==='function'){w.firebase.auth().onAuthStateChanged(function(user){if(user)attach();else detach();});if(w.firebase.auth().currentUser)attach();}}catch(e){status.errors.auth=clean(e&&e.message||e).slice(0,120);}var tries=0,t=setInterval(function(){tries++;wrapStore();installQueryProjection();installVisualBridges();if(wrappedStore&&wrappedQuery&&wrappedClient&&wrappedPolicies){clearInterval(t);}else if(tries>80){clearInterval(t);}},100);}
  w.addEventListener('hashchange',function(){setTimeout(reconcileOwners,0);});
  w.addEventListener('orbit:lab:canonical-view-hydrated',function(){setTimeout(reconcileOwners,0);});
  try{document.addEventListener('orbit:session',function(){setTimeout(reconcileOwners,0);});}catch(e){}
  Orbit.receiptsPortfolioProjectionV910={status:function(){var s=clone(status);delete s._emit;return s;},amount:amount,dueDate:dueDate,stateLabel:stateLabel,isHistorical:isHistorical,isFuture:isFuture,isPaymentReconciled:isPaymentReconciled,isPortfolioReconciled:isPortfolioReconciled,reconciliationLabel:reconciliationLabel,renderReceipts:renderReceipts,renderReceiptDetail:renderReceiptDetail,openReceiptDetail:openReceiptDetail,reconcileOwners:reconcileOwners};
  boot();
})();
