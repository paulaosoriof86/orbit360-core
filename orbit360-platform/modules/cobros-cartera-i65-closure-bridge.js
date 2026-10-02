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
function relationIndexes(q){
  var policyById={},clientById={},vehicleByPolicy={};
  (S().all('polizas')||[]).forEach(function(p){var id=clean(p&&p.id);if(id)policyById[id]=p;});
  (S().all('clientes')||[]).forEach(function(c){var id=clean(c&&c.id);if(id)clientById[id]=c;});
  if(clean(q))(S().all('vehiculos')||[]).forEach(function(v){var id=clean(v&&v.polizaId);if(id&&!vehicleByPolicy[id])vehicleByPolicy[id]=v;});
  return {policyById:policyById,clientById:clientById,vehicleByPolicy:vehicleByPolicy};
}
function policy(r,idx){var id=clean(r&&r.polizaId);return (idx&&idx.policyById&&idx.policyById[id])||{};}
function activePolicyRow(r,idx){var p=policy(r,idx),s=clean(p&&p.estado).toLowerCase();return !!(p&&p.id&&(s==='vigente'||s==='por renovar'));}
function client(r,idx){var p=policy(r||{},idx),id=clean((r&&r.clienteId)||p.clienteId);return (idx&&idx.clientById&&idx.clientById[id])||{};}
function countryOk(r,idx){var c=client(r,idx),p=Orbit.pais;return !p||p==='TODOS'||c.pais===p||(r&&r.pais===p);}
function accessOk(col,r){try{return !Orbit.access||!Orbit.access.canView||Orbit.access.canView(col,r,'cobros');}catch(e){return true;}}
function searchText(r,idx){
  var c=client(r,idx),p=policy(r,idx),v=(idx&&idx.vehicleByPolicy&&idx.vehicleByPolicy[clean(p&&p.id)])||{};
  return [c.nombre,p.numero,v.placa,r&&r.serie,r&&r.cuota].map(clean).join(' ').toLowerCase();
}
function matches(r,q,idx){q=clean(q).toLowerCase();return !q||searchText(r,idx).indexOf(q)>=0;}
function portfolioRows(q){
  var due=rp().dueDate||function(x){return x.fechaLimite||x.vence||x.fechaVencimiento;},idx=relationIndexes(q);
  return (S().all('carteraPrimas')||[]).filter(function(r){return r&&r.carteraActiva!==false&&activePolicyRow(r,idx)&&countryOk(r,idx)&&accessOk('carteraPrimas',r)&&matches(r,q,idx);})
    .sort(function(a,b){return clean(due(a)).localeCompare(clean(due(b)));});
}
function cobroRows(q){
  var idx=relationIndexes(q);
  return (S().all('cobros')||[]).filter(function(r){return r&&countryOk(r,idx)&&accessOk('cobros',r)&&matches(r,q,idx);})
    .sort(function(a,b){return clean(a.fechaPago||a.vence).localeCompare(clean(b.fechaPago||b.vence));});
}
function reportedPaymentRows(q){
  var linked={},idx=relationIndexes(q);
  (S().all('cobros')||[]).forEach(function(c){var id=clean(c&&c.reciboId);if(id)linked[id]=true;});
  return (S().all('recibosEsperados')||[]).filter(function(r){
    return r&&clean(r.estadoOperativo).toLowerCase()==='pago_reportado'&&!linked[clean(r.id)]&&countryOk(r,idx)&&accessOk('recibosEsperados',r)&&matches(r,q,idx);
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
mod.__i65GlobalPortfolioAdapter=Object.freeze({
  version:'b3-008-r5p4-indexed-relations-20261002',
  rendererOwner:'modules/cobros.js',
  replacesRenderer:false,
  refreshOwner:'core/router.js',
  confirmed:confirmed,
  portfolioRows:portfolioRows,
  cobroRows:cobroRows,
  reportedPaymentRows:reportedPaymentRows,
  snapshot:snapshot
});
Orbit.cobrosCarteraProjectionAdapter=mod.__i65GlobalPortfolioAdapter;
})();
