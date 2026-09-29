window.Orbit=window.Orbit||{};Orbit.modules=Orbit.modules||{};
(function(){'use strict';
var mod=Orbit.modules.cobros,S=function(){return Orbit.store;};
if(!mod||typeof mod.render!=='function'||mod.__i65GlobalPortfolioAdapter)return;
var clean=function(v){return String(v==null?'':v).trim();};
var rp=function(){return Orbit.receiptsPortfolioProjectionV920||Orbit.receiptsPortfolioProjection||{};};

function confirmed(){
  try{
    var a=(S()._productStatus().serverConfirmedCollections||[]);
    return ['clientes','polizas','recibosEsperados','carteraPrimas','cobros'].every(function(x){return a.indexOf(x)>=0;});
  }catch(e){return false;}
}
function policy(r){return S().get('polizas',r&&r.polizaId)||{};}
function client(r){var p=policy(r||{});return S().get('clientes',(r&&r.clienteId)||p.clienteId)||{};}
function countryOk(r){var c=client(r),p=Orbit.pais;return !p||p==='TODOS'||c.pais===p||(r&&r.pais===p);}
function accessOk(col,r){try{return !Orbit.access||!Orbit.access.canView||Orbit.access.canView(col,r,'cobros');}catch(e){return true;}}
function searchText(r){
  var c=client(r),p=policy(r),vehicles=S().all('vehiculos')||[],v=vehicles.find(function(x){return x.polizaId===p.id;})||{};
  return [c.nombre,p.numero,v.placa,r&&r.serie,r&&r.cuota].map(clean).join(' ').toLowerCase();
}
function matches(r,q){q=clean(q).toLowerCase();return !q||searchText(r).indexOf(q)>=0;}
function portfolioRows(q){
  var due=rp().dueDate||function(x){return x.fechaLimite||x.vence||x.fechaVencimiento;};
  return (S().all('carteraPrimas')||[]).filter(function(r){return r&&r.carteraActiva!==false&&countryOk(r)&&accessOk('carteraPrimas',r)&&matches(r,q);})
    .sort(function(a,b){return clean(due(a)).localeCompare(clean(due(b)));});
}
function cobroRows(q){
  return (S().all('cobros')||[]).filter(function(r){return r&&countryOk(r)&&accessOk('cobros',r)&&matches(r,q);})
    .sort(function(a,b){return clean(a.fechaPago||a.vence).localeCompare(clean(b.fechaPago||b.vence));});
}
function reportedPaymentRows(q){
  var linked={};
  (S().all('cobros')||[]).forEach(function(c){var id=clean(c&&c.reciboId);if(id)linked[id]=true;});
  return (S().all('recibosEsperados')||[]).filter(function(r){
    return r&&clean(r.estadoOperativo).toLowerCase()==='pago_reportado'&&!linked[clean(r.id)]&&countryOk(r)&&accessOk('recibosEsperados',r)&&matches(r,q);
  }).sort(function(a,b){return clean(a.fechaPagoReportada||a.fechaLimite||a.vence).localeCompare(clean(b.fechaPagoReportada||b.fechaLimite||b.vence));});
}
function snapshot(q){
  return {
    ready:confirmed(),
    portfolio:portfolioRows(q),
    cobros:cobroRows(q),
    reported:reportedPaymentRows(q),
    source:'carteraPrimas+recibosEsperados+cobros',
    rendererOwner:'modules/cobros.js'
  };
}
function refreshApprovedShell(){
  if(location.hash.indexOf('#/cobros')!==0)return;
  var host=document.getElementById('host');
  if(host&&typeof mod.render==='function')mod.render(host);
}
mod.__i65GlobalPortfolioAdapter=Object.freeze({
  version:'b3-001-20260929.1',
  rendererOwner:'modules/cobros.js',
  replacesRenderer:false,
  confirmed:confirmed,
  portfolioRows:portfolioRows,
  cobroRows:cobroRows,
  reportedPaymentRows:reportedPaymentRows,
  snapshot:snapshot
});
Orbit.cobrosCarteraProjectionAdapter=mod.__i65GlobalPortfolioAdapter;
window.addEventListener('orbit:store:emit',function(e){
  var c=e&&e.detail&&e.detail.collection||'';
  if(['carteraPrimas','recibosEsperados','cobros','clientes','polizas','vehiculos','*'].indexOf(c)>=0)setTimeout(refreshApprovedShell,0);
});
document.addEventListener('orbit:session',function(){setTimeout(refreshApprovedShell,0);});
})();
