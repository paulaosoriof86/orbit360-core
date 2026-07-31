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
  var status={version:'9.1.0',tenantId:tenant,readOnly:true,attached:[],counts:{recibosEsperados:0,carteraPrimas:0},errors:{},ready:false};
  var recFilter={};
  var clean=function(v){return String(v==null?'':v).trim();};
  var num=function(v){var n=Number(v);return Number.isFinite(n)?n:0;};
  var rowId=function(r){return r&&(r.id||r.uid||r.codigo||r.numero||r.key);};
  var clone=function(v){try{return JSON.parse(JSON.stringify(v));}catch(e){return v;}};
  var isSupplemental=function(name){return NAMES.indexOf(name)>=0;};
  var amount=function(r){return num(r&&((r.primaTotal!=null?r.primaTotal:(r.montoTotal!=null?r.montoTotal:(r.montoFuente!=null?r.montoFuente:r.monto)))));};
  var dueDate=function(r){return clean(r&&(r.fechaLimite||r.vence||r.fechaVencimiento));};
  var isFuture=function(r){return clean(r&&r.exigibilidad)==='futura'||clean(r&&r.estadoOperativo)==='futuro_pendiente';};
  var isHistorical=function(r){return r&&((r.historicalExigible===true)||clean(r.carteraTipo)==='cartera_historica_exigible'||clean(r.exigibilidad)==='historica_exigible');};
  function esc(v){try{return Orbit.ui&&Orbit.ui.esc?Orbit.ui.esc(v):clean(v).replace(/[&<>"']/g,function(ch){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch];});}catch(e){return clean(v);}}
  function money(v,cur){try{return Orbit.ui&&Orbit.ui.money?Orbit.ui.money(v,cur||'GTQ'):(cur||'GTQ')+' '+num(v).toFixed(2);}catch(e){return (cur||'GTQ')+' '+num(v).toFixed(2);}}
  function fmtDate(v){try{return Orbit.ui&&Orbit.ui.fmtDate?Orbit.ui.fmtDate(v):clean(v);}catch(e){return clean(v);}}
  function stateLabel(r){
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
    var future=rows.filter(isFuture),due=rows.filter(function(r){return!isFuture(r);}),hist=rows.filter(isHistorical),active=rows.filter(function(r){return!isHistorical(r);});
    function sum(a){return a.reduce(function(s,r){return s+amount(r);},0);}
    return{rows:rows,future:future,due:due,historical:hist,active:active,futureAmount:sum(future),dueAmount:sum(due),historicalAmount:sum(hist),totalAmount:sum(rows)};
  }
  function installQueryProjection(){
    if(wrappedQuery||!Orbit.q||typeof Orbit.q.clienteResumen!=='function'||!wrappedStore)return false;
    var base=Orbit.q.clienteResumen.bind(Orbit.q);
    Orbit.q.recibosEsperadosDe=function(cid){return Orbit.store.where('recibosEsperados',function(r){return r&&r.clienteId===cid;});};
    Orbit.q.carteraPrimasDe=function(cid){return Orbit.store.where('carteraPrimas',function(r){return r&&r.clienteId===cid;});};
    Orbit.q.carteraPrimasResumenDe=portfolioSummary;
    Orbit.q.clienteResumen=function(cid){
      var r=base(cid),p=portfolioSummary(cid),rec=Orbit.q.recibosEsperadosDe(cid);
      r.recibosEsperados=rec;r.carteraPrimas=p.rows;r.carteraActiva=p.active;r.carteraHistorica=p.historical;r.carteraFutura=p.future;r.carteraExigible=p.due;
      r.pendiente=p.futureAmount;r.vencido=p.dueAmount;r.carteraHistoricaMonto=p.historicalAmount;r.carteraTotal=p.totalAmount;
      if(p.dueAmount>0)r.salud=Math.max(8,Number(r.salud||70)-25);
      return r;
    };
    wrappedQuery=true;return true;
  }
  function activeClientId(){try{return Orbit.route&&Orbit.route.params&&Orbit.route.params.c||'';}catch(e){return'';}}
  function patchHeader(cid){
    var p=portfolioSummary(cid);document.querySelectorAll('.fh-kpis>div').forEach(function(cell){var lab=cell.querySelector('.fh-kpi-lab'),val=cell.querySelector('.fh-kpi-val');if(!lab||!val)return;var t=clean(lab.textContent);if(t.indexOf('Cartera al día')>=0){lab.textContent='Cartera por vencer';val.textContent=money(p.futureAmount,(Orbit.store.get('clientes',cid)||{}).moneda||'GTQ');}else if(t.indexOf('Cartera vencida')>=0){lab.textContent='Cartera exigible';val.textContent=money(p.dueAmount,(Orbit.store.get('clientes',cid)||{}).moneda||'GTQ');}});
  }
  function policyLabel(p){var a=Orbit.store.get('aseguradoras',p.aseguradoraId)||{};return clean(p.numero||'—')+(a.nombre?' · '+clean(a.nombre):'');}
  function renderReceipts(cid){
    var body=document.getElementById('c360-body');if(!body)return;
    var receipts=Orbit.q.recibosEsperadosDe(cid).slice().sort(function(a,b){return dueDate(a).localeCompare(dueDate(b));});
    var portfolio=Orbit.q.carteraPrimasDe(cid),byReceipt={};portfolio.forEach(function(x){byReceipt[x.reciboId]=x;});
    var policies=Orbit.store.where('polizas',function(p){return p&&p.clienteId===cid;});
    var selected=recFilter[cid]||'todas';var shown=selected==='todas'?receipts:receipts.filter(function(r){return r.polizaId===selected;});
    var ps=portfolioSummary(cid),cur=(Orbit.store.get('clientes',cid)||{}).moneda||'GTQ';
    var opts='<option value="todas">Todas las pólizas</option>'+policies.map(function(p){return'<option value="'+esc(p.id)+'" '+(selected===p.id?'selected':'')+'>'+esc(policyLabel(p))+'</option>';}).join('');
    var rows=shown.map(function(r){var c=byReceipt[r.id]||null,p=Orbit.store.get('polizas',r.polizaId)||{},v=Orbit.store.where('vehiculos',function(x){return x&&x.polizaId===r.polizaId;})[0],st=stateLabel(r),hist=isHistorical(r)||isHistorical(c),kind=hist?'Histórica exigible':'Calendario activo',veh=v?[v.marca,v.linea,v.placa].filter(Boolean).join(' '):'';return'<tr><td><b>'+esc(r.polizaNumero||p.numero||'—')+'</b><div class="muted" style="font-size:11px">'+esc(veh||p.ramo||'')+'</div></td><td><span class="badge '+(hist?'info':'neutral')+'">'+kind+'</span></td><td>'+esc(r.serie||r.numeroReciboFuente||'—')+'</td><td>'+fmtDate(dueDate(r))+'</td><td class="num">'+money(amount(r),r.moneda||cur)+'</td><td><span class="badge '+st.c+'">'+esc(st.t)+'</span></td></tr>';}).join('');
    body.innerHTML='<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px"><label style="font-size:12.5px;font-weight:600;color:var(--ink-2)">Filtrar por póliza:</label><select id="rp-v910-policy" class="o-sel" style="max-width:360px">'+opts+'</select><span class="muted" style="margin-left:auto;font-size:12px">'+shown.length+' de '+receipts.length+' recibos</span></div>'+
      '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:14px" class="rp-v910-kpis"><div class="mini-stat"><div class="muted">Por vencer</div><b>'+money(ps.futureAmount,cur)+'</b></div><div class="mini-stat"><div class="muted">Exigible</div><b>'+money(ps.dueAmount,cur)+'</b></div><div class="mini-stat"><div class="muted">Histórica exigible</div><b>'+money(ps.historicalAmount,cur)+'</b></div><div class="mini-stat"><div class="muted">En cartera</div><b>'+portfolio.length+'</b></div></div>'+
      '<div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Póliza / riesgo</th><th>Tipo</th><th>Serie / recibo</th><th>Vence</th><th class="num">Monto</th><th>Estado</th></tr></thead><tbody>'+(rows||'<tr><td colspan="6" class="muted" style="text-align:center;padding:24px">No hay recibos esperados registrados para este cliente.</td></tr>')+'</tbody></table></div><div style="padding:11px 14px;border-top:1px solid var(--line);font-size:12.5px;color:var(--ink-3)">Un pago reportado permanece pendiente de conciliación. Los cobros aplicados se muestran por separado y no se infieren desde este calendario.</div></div>';
    var sel=body.querySelector('#rp-v910-policy');if(sel)sel.addEventListener('change',function(){recFilter[cid]=sel.value;renderReceipts(cid);});
  }
  function patchCobros(cid){var body=document.getElementById('c360-body');if(!body)return;var applied=Orbit.store.where('cobros',function(c){return c&&c.clienteId===cid;});if(!applied.length&&!body.querySelector('[data-rp-v910-cobros-note]')){var note=document.createElement('div');note.setAttribute('data-rp-v910-cobros-note','1');note.className='card';note.style.cssText='padding:12px 14px;margin-bottom:12px';note.innerHTML='<b>Cobros aplicados</b><div class="muted" style="font-size:12.5px;margin-top:3px">Aún no hay cobros aplicados para este cliente. Los recibos pendientes y pagos reportados se consultan en <b>Recibos y pagos</b> hasta completar su conciliación.</div>';body.insertBefore(note,body.firstChild);}}
  function patchClient(host){
    var cid=activeClientId();if(!cid||!host)return;patchHeader(cid);
    host.querySelectorAll('.ftab').forEach(function(el){if(el.dataset.rpV910==='1')return;el.dataset.rpV910='1';el.addEventListener('click',function(){setTimeout(function(){patchHeader(cid);if(el.dataset.tab==='recibos')renderReceipts(cid);else if(el.dataset.tab==='cobros')patchCobros(cid);},0);});});
    var active=host.querySelector('.ftab.active');if(active&&active.dataset.tab==='recibos')renderReceipts(cid);else if(active&&active.dataset.tab==='cobros')patchCobros(cid);
  }
  function patchPolicyDrawer(id){
    var drawer=document.getElementById('pol-desg');if(!drawer)return;var p=Orbit.store.get('polizas',id)||{},receipts=Orbit.store.where('recibosEsperados',function(r){return r&&r.polizaId===id;}),portfolio=Orbit.store.where('carteraPrimas',function(r){return r&&r.polizaId===id;}),hist=portfolio.filter(isHistorical);var cur=p.moneda||'GTQ';
    drawer.querySelectorAll('.badge').forEach(function(b){var t=clean(b.textContent);if(t==='Genera cartera')b.textContent='Genera calendario';else if(t==='Histórico (sin cartera)')b.textContent=hist.length?'Histórico · saldo exigible':'Histórico · sin saldo exigible';});
    var headings=Array.from(drawer.querySelectorAll('div')).filter(function(d){return clean(d.textContent).indexOf('🧾 Recibos generados (')===0&&d.children.length===0;});var h=headings[0];if(h){h.textContent='🧾 Recibos esperados ('+receipts.length+')';var next=h.nextElementSibling;if(next){var html=receipts.slice(0,12).map(function(r){var st=stateLabel(r);return'<tr><td>'+esc(r.serie||'—')+'</td><td class="num">'+money(amount(r),r.moneda||cur)+'</td><td>'+fmtDate(dueDate(r))+'</td><td><span class="badge '+st.c+'">'+esc(st.t)+'</span></td></tr>';}).join('');next.outerHTML=receipts.length?'<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Serie</th><th class="num">Monto</th><th>Vence</th><th>Estado</th></tr></thead><tbody>'+html+'</tbody></table></div>':'<div class="muted" style="font-size:12.5px">Sin recibos esperados registrados.</div>';}}
  }
  function installVisualBridges(){
    if(!wrappedQuery)return false;
    if(!wrappedClient&&Orbit.modules&&Orbit.modules.cliente360&&typeof Orbit.modules.cliente360.render==='function'){
      var cr=Orbit.modules.cliente360.render.bind(Orbit.modules.cliente360);Orbit.modules.cliente360.render=function(host){var out=cr(host);setTimeout(function(){patchClient(host);},0);return out;};wrappedClient=true;
    }
    if(!wrappedPolicies&&Orbit.modules&&Orbit.modules.polizas&&typeof Orbit.modules.polizas.verDesglose==='function'){
      var pd=Orbit.modules.polizas.verDesglose.bind(Orbit.modules.polizas);Orbit.modules.polizas.verDesglose=function(id){var out=pd(id);setTimeout(function(){patchPolicyDrawer(id);},0);return out;};wrappedPolicies=true;
    }
    return wrappedClient&&wrappedPolicies;
  }
  function boot(){wrapStore();installQueryProjection();installVisualBridges();try{if(w.firebase&&typeof w.firebase.auth==='function'){w.firebase.auth().onAuthStateChanged(function(user){if(user)attach();else detach();});if(w.firebase.auth().currentUser)attach();}}catch(e){status.errors.auth=clean(e&&e.message||e).slice(0,120);}var tries=0,t=setInterval(function(){tries++;wrapStore();installQueryProjection();installVisualBridges();if(wrappedStore&&wrappedQuery&&wrappedClient&&wrappedPolicies){clearInterval(t);}else if(tries>80){clearInterval(t);}},100);}
  Orbit.receiptsPortfolioProjectionV910={status:function(){var s=clone(status);delete s._emit;return s;},amount:amount,dueDate:dueDate,stateLabel:stateLabel,isHistorical:isHistorical,isFuture:isFuture,renderReceipts:renderReceipts};
  boot();
})();
