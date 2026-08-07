#!/usr/bin/env node
'use strict';
import { adjudicateInsurerIdentityRows } from './orbit360-insurer-identity-dedupe-v26-v20260807.mjs';

const norm=value=>String(value==null?'':value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'').trim();
const text=value=>String(value==null?'':value).trim();
const INACTIVE=new Set(['inactive','inactivo','inactiva','disabled','deshabilitado','deshabilitada','archived','archivado','archivada','historico','historica','baja','cancelado','cancelada','cerrado','cerrada']);
const ALLOWED_COUNTRIES=new Set(['GT','CO']);
export const EXPECTED_V26=Object.freeze({clientes:414,aseguradoras:26,asesores:7});

function status(row){return norm(row?.estado||row?.status);}
function nonIdentityExclusion(row,kind,tenant='alianzas-soluciones'){
 const rowTenant=text(row?.tenantId||row?.tenant); const country=text(row?.pais||row?.country).toUpperCase();
 if(rowTenant&&rowTenant!==tenant)return 'out_of_effective_universe_tenant';
 if(country&&!ALLOWED_COUNTRIES.has(country))return 'out_of_effective_universe_country';
 if(row?.active===false||row?.activo===false)return 'historical_inactive_active_false';
 if(kind==='aseguradoras'&&row?.vinculada===false)return 'historical_inactive_vinculada_false';
 if(INACTIVE.has(status(row)))return 'historical_inactive_status'; return '';
}
export function adjudicateInsurersV26(rows,{tenant='alianzas-soluciones',sourceCodeUniqueness='not_assumed'}={}){
 const identity=adjudicateInsurerIdentityRows(rows,{sourceCodeUniqueness,legalIdentityFields:['nit','identificacionFiscal','taxId'],sourceCodeFields:['codigoIntermediario','codigo'],countryFields:['pais','country'],entityTypeFields:['tipoEntidad','tipoPersona','entityType','organizationType'],provenanceFields:['sourceType','source','batchTemplate','importBatchId','batchId']});
 const byId=new Map(identity.map(x=>[x.id,x]));
 const items=rows.slice().sort((a,b)=>String(a.id).localeCompare(String(b.id))).map(item=>{
  const id=byId.get(item.id); const nonIdentity=nonIdentityExclusion(item.data||{},'aseguradoras',tenant); const duplicate=id?.duplicate===true;
  const exclusionReason=nonIdentity|| (duplicate?'duplicate_legal_identity_country_entity_type':'');
  return {id:item.id,effective:!exclusionReason,excludedFromEffective:!!exclusionReason,exclusionReason:exclusionReason||null,requiresValidation:!!id?.requiresValidation,sourceCodeCollision:!!id?.sourceCodeCollision,sourceCodeCollisionAmbiguous:!!id?.sourceCodeCollisionAmbiguous,duplicateBasis:id?.duplicateBasis||null};
 });
 return {raw:items.length,effective:items.filter(x=>x.effective).length,requiresValidation:items.filter(x=>x.requiresValidation).length,sourceCodeCollisions:items.filter(x=>x.sourceCodeCollision).length,duplicatesExcluded:items.filter(x=>x.duplicateBasis).length,items};
}
