'use strict';
// Private diagnostic for the EXISTING read-only source preflight. These
// projections never enter resolve(), a mutation, or an eligibility decision.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const sha=x=>crypto.createHash('sha256').update(String(x)).digest('hex');
const str=x=>String(x==null?'':x).trim();
const norm=x=>str(x).normalize('NFD').toUpperCase().replace(/[^A-Z0-9]/g,'');
const safeId=x=>/^[A-Za-z0-9_-]{1,180}$/.test(str(x))?str(x):null;
const day=x=>/^\d{4}-\d\d-\d\d$/.test(str(x))?str(x):null;
const fields=['numero','numeroPoliza','polizaNumero'];
const permitted=new Set(['04-05-01-12289-4','04-05-01-15590-0','04-05-01-10738-6']);
const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
function validate(request){
 assert.equal(request.schema,'GI_I66_SOURCE_IDENTITY_READBACK_V1');
 assert.equal(request.enabled,true);assert.equal(request.writes,0);
 assert.equal(request.riskPolicy,'91-4140843');
 assert.ok(Array.isArray(request.documentaryTargets)&&request.documentaryTargets.length===3);
 assert.deepEqual(new Set(request.documentaryTargets.map(t=>t.policy)),permitted);
 for(const t of request.documentaryTargets){
  assert.match(t.sourcePdfSha256,/^[a-f0-9]{64}$/);assert.match(t.holderWitness,/^[a-f0-9]{64}$/);
  assert.ok(safeId(t.sourceDriveId));
  assert.ok(['ISSUED_ORIGINAL','INSURER_CONFIRMED_PAYMENT_STATEMENT'].includes(t.sourceKind));
  if(t.documentaryTerm)assert.ok(t.documentaryTerm.length===2&&t.documentaryTerm.every(day));
  if(t.coverageStatusLiteral!=null){
   assert.equal(t.policy,'04-05-01-12289-4');assert.equal(t.coverageStatusLiteral,'SIN COBERTURA');
   assert.ok(safeId(t.coverageStatusSourceDriveId));assert.match(t.coverageStatusSourceSha256,/^[a-f0-9]{64}$/);
  }
 }
}
function numberRelation(value,target){
 const v=str(value),wanted=target.split('-'),serial=String(Number(wanted[3]));
 const full=v.match(/^(\d{2})[ -]+(\d{2})[ -]+(\d{2})[ -]+(\d{1,6})[ -]+(\d+)$/);
 if(full&&full.slice(1,4).join('-')===wanted.slice(0,3).join('-')&&String(Number(full[4]))===serial)
  return String(Number(full[5]))===wanted[4]?'EXACT_FULL_NUMBER':'OTHER_ENDORSEMENT';
 if(/^\d{1,6}$/.test(v)&&String(Number(v))===serial)return 'SHORT_NUMBER_UNVERIFIED';
 const withoutSuffix=v.match(/^(\d{2})[ -]+(\d{2})[ -]+(\d{2})[ -]+(\d{1,6})$/);
 if(withoutSuffix&&withoutSuffix.slice(1,4).join('-')===wanted.slice(0,3).join('-')&&
  String(Number(withoutSuffix[4]))===serial)return 'ENDORSEMENT_ABSENT_UNVERIFIED';
 return '';
}
const holderMatch=(target,client)=>[client.nombre,client.nombreCompleto,client.razonSocial]
 .some(v=>str(v)&&sha(target.sourcePdfSha256+'|'+norm(v))===target.holderWitness);
function select(request,c,check,arrays){
 validate(request);assert.equal(c.policy,request.riskPolicy);
 const refs=new Map(),add=(collection,id)=>{if(str(id))refs.set(collection+'|'+str(id),{collection,id:str(id)});};
 for(const t of request.documentaryTargets){
  const holders=arrays.clientes.filter(h=>holderMatch(t,h));holders.forEach(h=>add('clientes',h.id));
  const insurerIds=arrays.aseguradoras.filter(a=>/universales/i.test(str(a.nombre||a.razonSocial))).map(a=>a.id);
  const candidates=arrays.polizas.filter(p=>fields.some(f=>numberRelation(p[f],t.policy))||
   holders.some(h=>h.id===p.clienteId)&&insurerIds.includes(p.aseguradoraId));
  assert.ok(candidates.length<=80,'IDENTITY_DIAGNOSTIC_POLICY_BOUNDARY');
  for(const p of candidates){add('polizas',p.id);add('clientes',p.clienteId);add('aseguradoras',p.aseguradoraId);}
 }
 for(const id of check.preservedVehicleIds||[]){
  add('vehiculos',id);const v=arrays.vehiculos.find(v=>v.id===id);
  if(v){
   add('polizas',v.polizaId);add('clientes',v.clienteId);
   const p=arrays.polizas.find(p=>p.id===v.polizaId);
   if(p){add('clientes',p.clienteId);add('aseguradoras',p.aseguradoraId);}
  }
 }
 if(check.holder)add('clientes',check.holder.id);
 if(check.insurer)add('aseguradoras',check.insurer.id);
 assert.ok(refs.size<=300,'IDENTITY_DIAGNOSTIC_REFERENCE_BOUNDARY');
 return [...refs.values()];
}
function report(request,c,check,arrays,entries,preimageDigest){
 validate(request);assert.match(preimageDigest,/^[a-f0-9]{64}$/);
 const records=new Map(entries.map(e=>[e.collection+'|'+e.id,e]));
 const record=(collection,id)=>records.get(collection+'|'+id);
 const witness=e=>({id:safeId(e.id),exists:e.exists===true,
  updateTime:e.updateTime||null,documentSha256:e.exists?sha(JSON.stringify(stable(e.data))):null});
 function policy(id){
  const e=record('polizas',id);if(!e||!e.exists)return {id:safeId(id),exists:false};
  const p=e.data,aliases=Object.fromEntries(fields.filter(f=>str(p[f])).map(f=>[f,
   /^(?:[A-Za-z]{1,6}[ -]*)?\d[\d /.-]{0,70}$/.test(str(p[f]))?str(p[f]):'REDACTED_NON_POLICY_ALIAS']));
  const allowedStates=/^(vigente|emitida|vencida|renovada|cancelada|anulada|activa|inactiva|suspendida|sin cobertura)$/i;
  const refs=[p.documentRef,p.sourceDocumentRef,...(Array.isArray(p.documentos)?p.documentos.map(d=>d?.fileId):[])];
  return {...witness(e),aliases,country:['GT','CO'].includes(p.pais)?p.pais:null,
   currency:['GTQ','COP','USD'].includes(p.moneda)?p.moneda:null,
   term:[day(p.vigenciaInicio),day(p.vigenciaFin)],
   state:allowedStates.test(str(p.estado))?str(p.estado):str(p.estado)?'OTHER_NONEMPTY_STATE':null,
   clientId:safeId(p.clienteId),insurerId:safeId(p.aseguradoraId),advisorId:safeId(p.asesorId),
   clientExists:record('clientes',p.clienteId)?.exists===true,
   insurerExists:record('aseguradoras',p.aseguradoraId)?.exists===true,
   renewsFromId:safeId(p.renuevaDe),renewedById:safeId(p.renovadaPor),vehicleId:safeId(p.vehiculoId),
   sourceDocumentIds:[...new Set(refs.map(safeId).filter(Boolean))],
   issuerDocumentSha256:/^[a-f0-9]{64}$/.test(str(p.issuerDocumentSha256))?p.issuerDocumentSha256:null};
 }
 const targets=request.documentaryTargets.map(t=>{
  const holders=arrays.clientes.filter(h=>holderMatch(t,h)),holderIds=new Set(holders.map(h=>h.id));
  const insurerIds=new Set(arrays.aseguradoras.filter(a=>/universales/i.test(str(a.nombre||a.razonSocial))).map(a=>a.id));
  const candidates=arrays.polizas.filter(p=>fields.some(f=>numberRelation(p[f],t.policy))||
   holderIds.has(p.clienteId)&&insurerIds.has(p.aseguradoraId));
  return {sourcePolicy:t.policy,sourceDriveId:t.sourceDriveId,sourcePdfSha256:t.sourcePdfSha256,
   sourceKind:t.sourceKind,documentaryTerm:t.documentaryTerm||null,
   ...(t.coverageStatusLiteral?{coverageStatusLiteral:t.coverageStatusLiteral,
    coverageStatusSourceDriveId:t.coverageStatusSourceDriveId,coverageStatusSourceSha256:t.coverageStatusSourceSha256}:{}),
   holderMatches:holders.map(h=>{const e=record('clientes',h.id);return {...witness(e),country:e.data.pais==='GT'?'GT':null,
    advisorId:safeId(e.data.asesorId)};}),
   editions:candidates.map(p=>({...policy(p.id),holderWitnessMatches:holderIds.has(p.clienteId),
    numberRelations:Object.fromEntries(fields.filter(f=>str(p[f])).map(f=>[f,numberRelation(p[f],t.policy)||'DIFFERENT_NUMBER'])),
    insurerVerified:insurerIds.has(p.aseguradoraId)&&record('aseguradoras',p.aseguradoraId)?.exists===true,
    diagnosticOnly:true}))};
 });
 const risks=(check.preservedVehicleIds||[]).map(id=>{
  const e=record('vehiculos',id),v=e?.data||{},p=policy(v.polizaId);
  return {...(e?witness(e):{id:safeId(id),exists:false}),clientId:safeId(v.clienteId),
   country:['GT','CO'].includes(v.pais)?v.pais:null,parent:p,
   conflictInExistingMatcher:(check.riskConflictIds||[]).includes(id),
   vehicleHolderMatches:v.clienteId===check.holder?.id,
   parentHolderMatches:p.exists&&p.clientId===check.holder?.id,
   parentEndsNoLaterThanIssuedStart:Boolean(p.term?.[1]&&p.term[1]<=c.termStart)};
 });
 const result={schema:'GI_I66_SOURCE_IDENTITY_READBACK_RESULT_V1',diagnosticOnly:true,writes:0,
  noEligibilityEffect:true,requestSha256:sha(JSON.stringify(stable(request))),preimageDigest,
  readScope:'EXISTING_BOUNDED_GT_CLIENT_AND_INSURER_CENSUS_FULL_POLICY_AND_VEHICLE_CENSUS',
  documentaryTargets:targets,riskCase:{sourcePolicy:c.policy,existingMatcherStatus:check.status,
   issuedTerm:[c.termStart,c.termEnd],holderId:safeId(check.holder?.id),insurerId:safeId(check.insurer?.id),risks},
  censusCounts:Object.fromEntries(['clientes','aseguradoras','polizas','vehiculos'].map(k=>[k,arrays[k].length]))};
 return {...result,reportSha256:sha(JSON.stringify(stable(result)))};
}
module.exports={validate,select,report,numberRelation};
