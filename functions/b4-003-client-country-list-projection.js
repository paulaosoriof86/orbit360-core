'use strict';
// Read-only, per-request client list reconciliation. Every member of the
// authorized tenant uses the same country authority, but no role receives
// another advisor's clients or a client from an unrelated country.
const {allowRow,Denied}=require('./b4-003-scoped-access-boundary');
const {resolveClientCountry,clientCountryNeedsInsurer}=require('./b4-003-client-country-authority');
const clean=v=>String(v==null?'':v).trim();
const MAX_LINKED_POLICIES_PER_CLIENT=100;

function projectScopedClientList({clients=[],policies=[],insurers=[],tenantId,ctx}){
 if(!ctx||!clean(tenantId)||ctx.tenantId!==tenantId||!['GT','CO'].includes(ctx.country))
  throw new Denied('CLIENT_LIST_CONTEXT_DENIED');
 const insurerById=new Map();
 for(const row of insurers){
  const id=clean(row?.id);
  if(id&&row._sourceIdMismatch!==true&&
    (!row.tenantId||row.tenantId===tenantId)&&!insurerById.has(id))
   insurerById.set(id,row);
 }
 const policiesByClient=new Map();
 for(const row of policies){
  if(!row||row.tenantId&&row.tenantId!==tenantId)continue;
  const id=clean(row.clienteId||row.clientId);
  if(!id)continue;
  if(!policiesByClient.has(id))policiesByClient.set(id,[]);
  policiesByClient.get(id).push(row);
 }
 const permitted=[];
 for(const row of clients){
  const id=clean(row?.id);
  if(!id||row._sourceIdMismatch===true||row.tenantId&&row.tenantId!==tenantId)continue;
  const linked=policiesByClient.get(id)||[];
  if(clientCountryNeedsInsurer(row)&&linked.length>MAX_LINKED_POLICIES_PER_CLIENT)continue;
  const effective=resolveClientCountry({client:row,clientId:id,tenantId,
   policies:linked,insurers:insurerById,completePolicySet:true});
  if(effective.status!=='resolved'||effective.country!==ctx.country)continue;
  const {_sourceIdMismatch:_ignored,...source}=row;
  const projected={...source,id,canonicalDocumentId:id,tenantId,
   pais:effective.country,country:effective.country,paisEfectivo:effective.country,
   paisOrigenEfectivo:effective.source==='insurer'?'aseguradora_verificada':'cliente_explicito'};
  try{allowRow(ctx,projected);}
  catch(e){if(e instanceof Denied)continue;throw e;}
  permitted.push(projected);
 }
 return permitted.sort((a,b)=>a.canonicalDocumentId.localeCompare(b.canonicalDocumentId));
}
module.exports=Object.freeze({projectScopedClientList,MAX_LINKED_POLICIES_PER_CLIENT,
 version:'b4-003-transversal-client-country-list-readonly-v1'});
