#!/usr/bin/env node
'use strict';
import crypto from 'node:crypto';

export const TENANT_ID = 'alianzas-soluciones';

export function clean(v){ return String(v == null ? '' : v).trim(); }
export function norm(v){
  return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}
export function stableHash(v){
  const text = typeof v === 'string' ? v : JSON.stringify(v, Object.keys(v || {}).sort());
  return crypto.createHash('sha256').update(text).digest('hex');
}
export function deterministicId(prefix, key){ return `${prefix}_${stableHash(clean(key)).slice(0,28)}`; }

function first(row, keys){ for(const k of keys){ const v=row && row[k]; if(v != null && clean(v)!=='') return v; } return ''; }
function list(v){ return Array.isArray(v) ? v : (v == null || v === '' ? [] : [v]); }
function docOf(row){ return norm(first(row,['numeroDocumento','documento','nit','dpi','cedulaJuridica','identificacion'])); }
function nameOf(row){ return clean(first(row,['nombre','nombreCompleto','razonSocial','asegurado','clienteNombre'])); }
function advisorIdOf(row){ return clean(first(row,['asesorId','asesorPrincipalId','advisorId'])); }

function aliasValues(row){
  const vals=[first(row,['nombre','nombreCorto','razonSocial','aseguradoraNombre','displayName'])];
  for(const a of list(row && row.aliases)) vals.push(a);
  for(const a of list(row && row.alias)) vals.push(a);
  return [...new Set(vals.map(norm).filter(Boolean))];
}

function multiIndex(rows, keyFn){
  const idx=new Map();
  for(const row of rows || []){
    for(const key of list(keyFn(row)).filter(Boolean)){
      if(!idx.has(key)) idx.set(key,[]);
      idx.get(key).push(row);
    }
  }
  return idx;
}

export function buildReferenceIndexes({clients=[],insurers=[],advisors=[],policies=[]}={}){
  return {
    clientByDoc: multiIndex(clients, r=>docOf(r)),
    clientByName: multiIndex(clients, r=>norm(nameOf(r))),
    insurerByAlias: multiIndex(insurers, r=>aliasValues(r)),
    advisorByName: multiIndex(advisors, r=>[norm(nameOf(r)), norm(first(r,['correo','email']))].filter(Boolean)),
    policyByVersion: multiIndex(policies, r=>clean(first(r,['_sourceVersionKey','sourceVersionKey','source_version_key']))),
    clients, insurers, advisors, policies
  };
}

function unique(rows){
  const byId=new Map();
  for(const r of rows || []) byId.set(clean(r.id)||stableHash(r),r);
  return [...byId.values()];
}

export function resolveClient(staging, indexes){
  const doc=norm(staging.documento_fuente||staging.documento||'');
  if(doc){
    const hits=unique(indexes.clientByDoc.get(doc)||[]);
    if(hits.length===1) return {status:'matched',record:hits[0],method:'document'};
    if(hits.length>1) return {status:'ambiguous',method:'document',count:hits.length};
  }
  const key=norm(staging.cliente_match_fuente||staging.asegurado||staging.nombre||'');
  const hits=unique(indexes.clientByName.get(key)||[]);
  if(hits.length===1) return {status:'matched',record:hits[0],method:'exact_normalized_name'};
  if(hits.length>1) return {status:'ambiguous',method:'exact_normalized_name',count:hits.length};
  return {status:'missing',method:'none'};
}

export function resolveInsurer(staging, indexes){
  const key=norm(staging.aseguradora||staging.aseguradoraNombre||'');
  const hits=unique(indexes.insurerByAlias.get(key)||[]);
  if(hits.length===1) return {status:'matched',record:hits[0],method:'exact_alias'};
  if(hits.length>1){
    const country=clean(staging.pais).toUpperCase();
    const scoped=unique(hits.filter(r=>clean(first(r,['pais','country'])).toUpperCase()===country));
    if(scoped.length===1) return {status:'matched',record:scoped[0],method:'exact_alias_country'};
    return {status:'ambiguous',method:'exact_alias',count:hits.length};
  }
  return {status:'missing',method:'none'};
}

export function resolveAdvisor(name, indexes){
  const hits=unique(indexes.advisorByName.get(norm(name))||[]);
  return hits.length===1 ? {status:'matched',record:hits[0]} : hits.length>1 ? {status:'ambiguous',count:hits.length} : {status:'missing'};
}

export function stagingClientToCanonical(staging,{indexes}={}){
  const existing=resolveClient(staging,indexes);
  if(existing.status==='ambiguous') return {ok:false,blockingReason:'cliente_ambiguo',resolution:existing};
  if(existing.status==='matched') return {ok:true,action:'reuse',id:existing.record.id,record:existing.record,resolution:existing};
  const name=clean(staging.nombre||staging.asegurado);
  if(!name) return {ok:false,blockingReason:'cliente_sin_nombre'};
  const id=deterministicId('cli_pol',`${TENANT_ID}|${norm(name)}|${norm(staging.documento||'')}`);
  const advisor=resolveAdvisor(staging.vendedor||'',indexes);
  const record={
    id, tenantId:TENANT_ID,
    nombre:name,
    numeroDocumento:clean(staging.documento||''),
    correo:clean(staging.correo||''),
    whatsapp:clean(staging.whatsapp||''),
    telefonoAlterno:clean(staging.telefono||''),
    pais:clean(staging.pais).toUpperCase(),
    moneda:clean(staging.moneda).toUpperCase(),
    asesorId:advisor.status==='matched'?clean(advisor.record.id):'',
    asesorPrincipal:advisor.status==='matched'?nameOf(advisor.record):clean(staging.vendedor||''),
    asesorRaw:clean(staging.vendedor||''),
    estadoOperativo:'pendiente_polizas',
    calidad_datos:'pendiente_completar',
    validationStatus:'pendiente_completar',
    requiereValidacion:false,
    alertasCalidad:['PENDIENTE_POLIZAS','CLIENTE_CREADO_DESDE_POLIZA','PENDIENTE_COMPLETAR'],
    sourceRefs:list(staging.source_refs),
    sourceTrace:{sourceType:'polizas',cutoff:'2026-07-30',createdFromMissingPolicyParty:true}
  };
  if(!record.numeroDocumento) record.alertasCalidad.push('FALTA_DOCUMENTO');
  if(!record.correo) record.alertasCalidad.push('FALTA_CORREO');
  if(!record.whatsapp) record.alertasCalidad.push('FALTA_WHATSAPP');
  if(advisor.status!=='matched') record.alertasCalidad.push('ASESOR_PENDIENTE_CONFIRMAR');
  return {ok:true,action:'create',id,record,resolution:{status:'missing'},advisorResolution:advisor};
}

export function stagingPolicyToCanonicalRaw(staging,{clienteId,insurerId,asesorId=''}={}){
  const numero=clean(staging.numero_poliza||staging.numero||staging.poliza);
  const start=clean(staging.vigencia_inicio||staging.vigenciaInicio||staging.vigenciaIni);
  const end=clean(staging.vigencia_fin||staging.vigenciaFin||staging.vigenciaFinal);
  const versionKey=clean(staging.source_version_key)||[numero,clean(staging.aseguradora),clean(staging.cliente_match_fuente||staging.asegurado),start,end].join('|');
  const id=deterministicId('pol',`${TENANT_ID}|${versionKey}`);
  return {
    id, tenantId:TENANT_ID,
    clienteId:clean(clienteId),
    aseguradoraId:clean(insurerId),
    asesorId:clean(asesorId),
    numero,
    vigenciaInicio:start,
    vigenciaFin:end,
    estadoFuenteOriginal:clean(staging.estado_fuente||staging.estadoFuenteOriginal),
    estado:clean(staging.estado_propuesto||staging.estado),
    pais:clean(staging.pais).toUpperCase(),
    moneda:clean(staging.moneda).toUpperCase(),
    primaNeta:Number(staging.prima_neta||staging.primaNeta||0),
    primaTotal:Number(staging.prima_total||staging.primaTotal||0),
    formaPago:clean(staging.forma_pago||staging.formaPago),
    frecuencia:clean(staging.frecuencia_pago||staging.frecuencia),
    ramo:clean(staging.ramo),
    subramo:clean(staging.subramo),
    producto:clean(staging.tipo_ramo||staging.producto),
    aseguradoNombreFuente:clean(staging.asegurado),
    clienteFuenteNombre:clean(staging.cliente_match_fuente||staging.asegurado),
    aseguradoraFuenteNombre:clean(staging.aseguradora),
    asesorFuenteNombre:clean(staging.vendedor),
    _sourceVersionKey:versionKey,
    sourceRefs:list(staging.source_refs),
    sourceTrace:{sourceType:'polizas',cutoff:'2026-07-30',stagingContract:'orbit360-policy-persist-candidate-v1'},
    carteraMaterializada:false,
    cobroAplicado:false,
    importadorP0:true
  };
}

export function buildCanonicalWritePlan(candidate,{clients=[],insurers=[],advisors=[],policies=[]}={}){
  if(!candidate || candidate.tenant_id!==TENANT_ID) return {ok:false,blocking:['tenant_invalido'],operations:[]};
  const indexes=buildReferenceIndexes({clients,insurers,advisors,policies});
  const blocking=[]; const clientOps=[]; const policyOps=[]; const createdClients=new Map();
  const approvedNewByName=new Map((candidate.clients||[]).map(c=>[norm(c.nombre),c]));

  function clientForPolicy(p){
    const resolved=resolveClient(p,indexes);
    if(resolved.status==='matched') return {id:resolved.record.id,record:resolved.record,action:'reuse',resolution:resolved};
    if(resolved.status==='ambiguous') return {error:'cliente_ambiguo'};
    const key=norm(p.cliente_match_fuente||p.asegurado);
    const approved=approvedNewByName.get(key);
    if(!approved) return {error:'cliente_no_aprobado_para_creacion'};
    if(createdClients.has(key)) return createdClients.get(key);
    const built=stagingClientToCanonical(approved,{indexes});
    if(!built.ok) return {error:built.blockingReason||'cliente_no_resuelto'};
    if(built.action==='create') clientOps.push({action:'insert',collection:'clientes',id:built.id,data:built.record});
    const out={id:built.id,record:built.record,action:built.action,resolution:built.resolution}; createdClients.set(key,out); return out;
  }

  for(const p of candidate.policies||[]){
    const c=clientForPolicy(p); if(c.error){blocking.push({kind:'policy',reason:c.error});continue;}
    const ins=resolveInsurer(p,indexes); if(ins.status!=='matched'){blocking.push({kind:'policy',reason:'aseguradora_'+ins.status});continue;}
    const advisorId=advisorIdOf(c.record)||clean(c.record.asesorId)||clean(c.record.asesorPrincipalId)||'';
    const raw=stagingPolicyToCanonicalRaw(p,{clienteId:c.id,insurerId:ins.record.id,asesorId:advisorId});
    if(!raw.numero||!raw.clienteId||!raw.aseguradoraId||!raw.vigenciaInicio||!raw.vigenciaFin){blocking.push({kind:'policy',reason:'contrato_canonico_incompleto'});continue;}
    const existing=unique(indexes.policyByVersion.get(raw._sourceVersionKey)||[]);
    if(existing.length>1){blocking.push({kind:'policy',reason:'version_poliza_duplicada_en_destino'});continue;}
    if(existing.length===1) policyOps.push({action:'update',collection:'polizas',id:existing[0].id,data:raw});
    else policyOps.push({action:'insert',collection:'polizas',id:raw.id,data:raw});
  }
  return {
    ok:blocking.length===0,
    blocking,
    operations:[...clientOps,...policyOps],
    counts:{clientCreates:clientOps.length,policyWrites:policyOps.length,policyCreates:policyOps.filter(x=>x.action==='insert').length,policyUpdates:policyOps.filter(x=>x.action==='update').length,excluded:(candidate.excluded||[]).length,receipts:0,cartera:0,cobros:0},
    invariants:{tenantId:TENANT_ID,clientFirst:true,noReceiptWrites:true,noCarteraWrites:true,noCobroWrites:true,unresolvedRelationsBlocked:true,deterministicIds:true}
  };
}
