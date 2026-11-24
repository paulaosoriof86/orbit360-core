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
const financialPolicyIds=new Set(['pol_7ab15779e3626402f1cb4349fa69','pol_243608bce078afdf9640c8554ac4',
 'pol_6537ecb219275945f57fc567610c','pol_c0001022fe28c0fa04d405d4a5b8','pol_4cc6dba30e87de60562e32306c3c']);
const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
function validate(request){
 assert.equal(request.schema,'GI_I66_SOURCE_IDENTITY_READBACK_V1');
 assert.equal(request.enabled,true);assert.equal(request.writes,0);
 assert.equal(request.riskPolicy,'91-4140843');
 assert.ok(Array.isArray(request.documentaryTargets)&&request.documentaryTargets.length===3);
 assert.deepEqual(new Set(request.documentaryTargets.map(t=>t.policy)),permitted);
 if(request.financialPolicyIds){
  assert.equal(request.financialPolicyIds.length,5,'FINANCIAL_IDENTITY_SCOPE_COUNT');
  assert.deepEqual(new Set(request.financialPolicyIds),financialPolicyIds,'FINANCIAL_IDENTITY_SCOPE_DRIFT');
 }
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
 const shortSuffix=v.match(/^(\d{1,6})[ -]+(\d+)$/);
 if(shortSuffix&&String(Number(shortSuffix[1]))===serial)
  return String(Number(shortSuffix[2]))===wanted[4]?'SHORT_NUMBER_WITH_ENDORSEMENT_UNVERIFIED':'SHORT_NUMBER_OTHER_ENDORSEMENT';
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
 for(const id of request.financialPolicyIds||[]){
  add('polizas',id);const p=arrays.polizas.find(p=>p.id===id);
  if(p){add('clientes',p.clienteId);add('aseguradoras',p.aseguradoraId);}
 }
 assert.ok(refs.size<=300,'IDENTITY_DIAGNOSTIC_REFERENCE_BOUNDARY');
 return [...refs.values()];
}
function report(request,c,check,arrays,entries,preimageDigest,financialSnapshot,source){
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
   originalRiskMatches:Object.fromEntries([
    ['plate',['placa','placaFuente'],['placa','placaFuente']],
    ['chassis',['vin','chasis','chasisFuente'],['vin','chasis','chasisFuente']]
   ].map(([kind,storedFields,sourceFields])=>{
    const expected=[...new Set(sourceFields.map(k=>norm(c.originalRisk?.[k])).filter(Boolean))];
    const observed=storedFields.map(k=>norm(v[k])).filter(Boolean);
    return [kind,{storedPopulated:observed.length>0,sourcePopulated:expected.length>0,
     everyStoredAliasMatches:observed.length>0&&expected.length===1&&observed.every(x=>x===expected[0])}];
   })),
   parentEndsNoLaterThanIssuedStart:Boolean(p.term?.[1]&&p.term[1]<=c.termStart)};
 });
 const result={schema:'GI_I66_SOURCE_IDENTITY_READBACK_RESULT_V1',diagnosticOnly:true,writes:0,
  noEligibilityEffect:true,requestSha256:sha(JSON.stringify(stable(request))),preimageDigest,
  readScope:'EXISTING_BOUNDED_GT_CLIENT_AND_INSURER_CENSUS_FULL_POLICY_AND_VEHICLE_CENSUS',
  documentaryTargets:targets,riskCase:{sourcePolicy:c.policy,existingMatcherStatus:check.status,
   issuedTerm:[c.termStart,c.termEnd],holderId:safeId(check.holder?.id),insurerId:safeId(check.insurer?.id),risks},
  censusCounts:Object.fromEntries(['clientes','aseguradoras','polizas','vehiculos'].map(k=>[k,arrays[k].length])),
  ...(request.financialPolicyIds?{financial:financialReport(request,financialSnapshot,source,entries,policy)}:{})};
 return {...result,reportSha256:sha(JSON.stringify(stable(result)))};
}
function financialReport(request,snapshot,source,entries,policy){
 assert.equal(snapshot?.complete,true,'FINANCIAL_COMPLETE_CENSUS_REQUIRED');
 assert.equal(snapshot.sourceSha256,'649fa315a90b176b794abf6eef3d9f893d47de64cfe558d203a099c408692aa0');
 assert.ok(Array.isArray(snapshot.records)&&Array.isArray(snapshot.audits));
 const dateFields=['periodoInicioFuente','periodStart','receiptPeriodStart','periodoInicio','fechaInicio','inicioPeriodo',
  'fechaVencimientoContractual','vence','fechaVencimiento','fechaLimite','fechaPago','paidDate','actualPaidDate'];
 const amountFields=['primaTotal','monto','montoTotal','grossAmount','amount','primaNeta','neta','netPremium','saldo','saldoPendiente','montoPagado'];
 const idFields=['polizaId','policyId','clienteId','clientId','asesorId','aseguradoraId','reciboId','receiptId','reciboEsperadoId',
  'cobroId','sourceId','sourceRef','evidenceId','sourceCandidateId','auditId','operationId','requestId','documentRef','sourceDocumentRef'];
 const referenceFields=['numeroReciboFuente','numeroReciboAseguradora','numeroRequerimiento','requerimiento','numeroRecibo',
  'polizaNumero','numeroPoliza','policyNumber','policyNumberSource','numeroPolizaFuente','secuencia','numeroCuota','cuota','serie'];
 const stateFields=['estado','estadoOperativo','paymentState','applicationState','paymentOrigin','paymentEvidenceType',
  'directOrInferred','carteraTipo','estadoCartera','exigibilidad','actualPaidDateSource'];
 const booleanFields=['pagado','confirmado','inferredPaid','conciliado','conciliadoPago','carteraActiva','historicalExigible','saldoConciliado'];
 const knownStates=new Set(['PAID_DIRECT','PAID_INFERRED','PAID_REPORTED','PENDING','UNPAID','PAID','Pagado','Pendiente','Vencido','Cancelado','Anulado',
  'DIRECT','INFERRED','REPORTED','PENDING_APPLICATION','APPLIED','CONFIRMED','RECONCILED','CRM_MIGRATED_DIRECT_PAYMENT',
  'LEGACY_CENDOSO_FECHA_REAL_PAGADO','CENDOSO_FECHA_REAL_PAGADO','pagado_sin_saldo','historico_pagado_fuente',
  'cerrada','exigible','futura','pendiente','pendiente_vencido','futuro_pendiente','cartera_activa']);
 const val=(k,v)=>({type:typeof v,present:true,value:
  typeof v==='number'&&Number.isFinite(v)?v:typeof v==='string'&&/^[+-]?\d+(?:\.\d{1,8})?$/.test(v.trim())?v:null,
  ...(v!=null&&!['string','number'].includes(typeof v)?{valueSha256:sha(JSON.stringify(stable(v)))}:{})});
 const project=r=>({collection:r.collection,id:safeId(r.id),documentSha256:sha(JSON.stringify(stable({...r,collection:undefined}))),
  ids:Object.fromEntries(idFields.filter(k=>str(r[k])).map(k=>[k,safeId(r[k])])),
  dates:Object.fromEntries(dateFields.filter(k=>r[k]!=null).map(k=>[k,
   day(r[k])||{type:typeof r[k],valueSha256:sha(JSON.stringify(stable(r[k])))}])),
  amounts:Object.fromEntries(amountFields.filter(k=>r[k]!=null).map(k=>[k,val(k,r[k])])),
  references:Object.fromEntries(referenceFields.filter(k=>r[k]!=null).map(k=>[k,
   /^(?:[A-Za-z]{1,8}[ -]*)?\d[\d /.-]{0,70}$/.test(str(r[k]))||/^(?:rec|car|cob|pol)_[a-z0-9_]{6,150}$/.test(str(r[k]))?
    str(r[k]):{valueSha256:sha(JSON.stringify(stable(r[k])))}])),
  states:Object.fromEntries(stateFields.filter(k=>r[k]!=null).map(k=>[k,
   knownStates.has(str(r[k]))?str(r[k]):{type:typeof r[k],valueSha256:sha(JSON.stringify(stable(r[k])))}])),
  flags:Object.fromEntries(booleanFields.filter(k=>r[k]!=null).map(k=>[k,typeof r[k]==='boolean'?r[k]:{type:typeof r[k]}])),
  sourceRows:Array.isArray(r.sourceRows)?r.sourceRows.map(s=>({row:Number.isSafeInteger(s.row)?s.row:null,
   sha256:/^[a-f0-9]{64}$/.test(str(s.sha256))?s.sha256:null,
   file:/^\d\d-CobranzaCendoso-\d\d-\.xlsx$/.test(str(s.file))?s.file:null})):[],
  originFields:Object.fromEntries(['fuente','source','origen','sourceType'].filter(k=>str(r[k])).map(k=>[k,
   {family:/cendoso/i.test(str(r[k]))?'CENDOSO':/roble/i.test(str(r[k]))?'ROBLE':/universales/i.test(str(r[k]))?'UNIVERSALES':'OTHER',valueSha256:sha(str(r[k]))}])),
  fieldNames:Object.keys(r).filter(k=>/^[A-Za-z_][A-Za-z0-9_]{0,80}$/.test(k)).sort()});
 const receipts=new Map(snapshot.records.filter(r=>r.collection==='recibosEsperados').map(r=>[r.id,r]));
 const owns=(r,id)=>[r.polizaId,r.policyId].includes(id)||[r.reciboId,r.receiptId,r.reciboEsperadoId]
  .some(ref=>[receipts.get(ref)?.polizaId,receipts.get(ref)?.policyId].includes(id));
 const targetSource=source.candidates.filter(r=>['AUTO-45580','VA-53105','91-8353989'].includes(r.policyNumberSource));
 const sourceIds=new Set(targetSource.map(r=>r.candidateId));
 const targets=request.financialPolicyIds.map(id=>{
  const found=snapshot.records.filter(r=>owns(r,id));assert.ok(found.length<=300,'FINANCIAL_POLICY_DIAGNOSTIC_BOUNDARY');
  const p=entries.find(e=>e.collection==='polizas'&&e.id===id)?.data||{};
  return {policy:policy(id),policyAmountFields:Object.fromEntries(amountFields.filter(k=>p[k]!=null).map(k=>[k,val(k,p[k])])),
   frequency:['Mensual','Pago Único','Contado','Anual','Trimestral','Semestral'].includes(p.frecuencia)?p.frecuencia:null,
   counts:Object.fromEntries(['recibosEsperados','carteraPrimas','cobros'].map(k=>[k,found.filter(r=>r.collection===k).length])),
   records:found.map(project)};
 });
 const relevantAudit=snapshot.audits.filter(a=>request.financialPolicyIds.includes(a.policyId)||sourceIds.has(a.sourceId));
 return {complete:true,writes:0,sourceSha256:snapshot.sourceSha256,
  censusCounts:Object.fromEntries(['recibosEsperados','carteraPrimas','cobros'].map(k=>[k,snapshot.records.filter(r=>r.collection===k).length])),
  financialCensusSha256:sha(JSON.stringify(stable(snapshot.records))),targets,
  sourceCandidates:targetSource.map(r=>({sourceId:r.candidateId,policy:r.policyNumberSource,term:[r.coverageStart,r.coverageEnd],
   period:r.receiptPeriodStart,due:r.receiptDueDate,paid:r.actualPaidDate,gross:r.totalPremium,net:r.netPremium,
   holdReasons:r.holdReasons,sourceRows:r.sourceRows})),
  auditWitnesses:relevantAudit.map(a=>({id:safeId(a.id),policyId:safeId(a.policyId),sourceId:safeId(a.sourceId),
   receiptId:safeId(a.receiptId),portfolioId:safeId(a.portfolioId),cobroId:safeId(a.cobroId),documentSha256:sha(JSON.stringify(stable(a)))})),
  sourceLinkedOutsideTargets:snapshot.records.filter(r=>idFields.some(k=>sourceIds.has(r[k]))&&
   !request.financialPolicyIds.some(id=>owns(r,id))).map(project)};
}
function appendEvidence(fs,runnerTemp,reports,execution){
 const path=require('node:path');assert.ok(path.isAbsolute(runnerTemp),'READONLY_ARTIFACT_ROOT_REQUIRED');
 assert.match(execution.sourceSha,/^[a-f0-9]{40}$/);assert.match(execution.runId,/^\d+$/);
 const dest=path.join(runnerTemp,'gi-i66-bulk-preflight.json'),bytes=fs.readFileSync(dest),original=JSON.parse(bytes);
 assert.ok(['BULK_SOURCE_CASE_READBACK_ONLY_NO_WRITES','BULK_SOURCE_PREFLIGHT_ONLY_NO_WRITES',
  'BULK_SOURCE_NO_ELIGIBLE_ROWS_DIAGNOSTIC_HOLD'].includes(original.status));
 if(original.status==='BULK_SOURCE_NO_ELIGIBLE_ROWS_DIAGNOSTIC_HOLD')
  assert.equal(original.readyCount,0,'READONLY_ZERO_ELIGIBILITY_REPORT_REQUIRED');
 assert.equal(original.writes,0,'READONLY_ARTIFACT_WRITE_BOUNDARY');
 assert.ok(Array.isArray(reports)&&reports.every(r=>r.writes===0&&r.diagnosticOnly===true&&r.noEligibilityEffect===true));
 const enriched={...original,privateReadonlyIdentityReadbacks:{execution,originalSourceReportSha256:sha(bytes),reports}};
 fs.writeFileSync(dest,JSON.stringify(enriched,null,2)+'\n',{mode:0o600});
 // The immutable eligibility plan file is never opened or changed here.
 return {file:'gi-i66-bulk-preflight.json',originalSourceReportSha256:sha(bytes)};
}
module.exports={validate,select,report,numberRelation,financialReport,financialPolicyIds,appendEvidence};
