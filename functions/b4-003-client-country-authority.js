'use strict';
// B4-003 country authority for a client document, without mutating its source.
// A valid, unambiguous client domicile takes precedence. Only missing or
// explicitly ambiguous client country may inherit an insurer's country.
const clean=value=>String(value==null?'':value).trim();
function country(value){
 const key=clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
 return ({GT:'GT',GUATEMALA:'GT',CO:'CO',COLOMBIA:'CO'})[key]||'';
}
function fields(record){
 const input=[record?.pais,record?.country].map(clean).filter(Boolean);
 if(!input.length)return {country:'',ambiguous:true};
 const codes=input.map(country);
 return {country:codes.length&&codes.every(v=>v&&v===codes[0])?codes[0]:'',
   ambiguous:!codes.length||codes.some(v=>!v||v!==codes[0])};
}
function clientCountryNeedsInsurer(client){
 const declared=fields(client);
 return declared.ambiguous||client?.paisRequiereValidacion===true||
   client?.countryRequiresValidation===true;
}
function resolution(status,reason,countryCode='',source=''){
 return Object.freeze({status,reason,country:countryCode,source});
}
function resolveClientCountry({client,clientId,tenantId,policies,insurers,completePolicySet}){
 const id=clean(clientId),tenant=clean(tenantId);
 if(!id||!tenant||!client||client.id&&clean(client.id)!==id||
     client.tenantId&&clean(client.tenantId)!==tenant)
   return resolution('unresolved','CLIENT_IDENTITY_OR_TENANT_INVALID');
 if(!clientCountryNeedsInsurer(client))
   return resolution('resolved','CLIENT_COUNTRY_EXPLICIT',fields(client).country,'client');
 // A caller's single policy hint, or a role-filtered partial policy list, is
 // never proof that *all* insurers of this client agree on one country.
 if(completePolicySet!==true||!Array.isArray(policies)||!policies.length)
   return resolution('unresolved','COMPLETE_POLICY_RELATION_REQUIRED');
 const insurerById=insurers instanceof Map?insurers:new Map(Object.entries(insurers||{}));
 const countries=new Set();
 for(const policy of policies){
   if(!policy||policy._sourceIdMismatch===true||
      policy.clienteId&&policy.clientId&&clean(policy.clienteId)!==clean(policy.clientId)||
      clean(policy.clienteId||policy.clientId)!==id||
      policy.tenantId&&clean(policy.tenantId)!==tenant)
     return resolution('unresolved','POLICY_RELATION_INVALID');
   if(policy.aseguradoraId&&policy.insurerId&&
      clean(policy.aseguradoraId)!==clean(policy.insurerId))
     return resolution('unresolved','POLICY_INSURER_ID_CONFLICT');
   const insurerId=clean(policy.aseguradoraId||policy.insurerId);
   const insurer=insurerById.get(insurerId);
   if(!insurerId||!insurer||insurer._sourceIdMismatch===true||
      insurer.id&&clean(insurer.id)!==insurerId||
      insurer.tenantId&&clean(insurer.tenantId)!==tenant)
     return resolution('unresolved','INSURER_NOT_VERIFIED');
   const insurerFields=fields(insurer);
   if(insurerFields.ambiguous||!insurerFields.country)
     return resolution('unresolved','INSURER_COUNTRY_UNRESOLVED');
   const policyFields=fields(policy);
   if(!policyFields.ambiguous&&policyFields.country!==insurerFields.country)
     return resolution('unresolved','POLICY_INSURER_COUNTRY_CONFLICT');
   // An invalid or conflicting policy country is also untrusted evidence.
   if((clean(policy.pais)||clean(policy.country))&&policyFields.ambiguous)
     return resolution('unresolved','POLICY_COUNTRY_AMBIGUOUS');
   countries.add(insurerFields.country);
 }
 if(countries.size!==1)return resolution('unresolved','MULTI_INSURER_COUNTRY_CONFLICT');
 return resolution('resolved','INSURER_COUNTRY_UNAMBIGUOUS', [...countries][0],'insurer');
}
module.exports=Object.freeze({country,clientCountryNeedsInsurer,resolveClientCountry,version:'b4-003-client-country-insurer-authority-v1'});
