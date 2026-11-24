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
const newStatementSource={path:'artifacts/orbit360-recovery/source-batches/I6_6_NEW_INSURER_SOURCE_DELTA_20261124.json',
 sha256:'68ebdc6f04e0ee5e4d7aa92b2a3bd9564f17a8a5e7b23528522cc6381f782805'};
function statementManifest(request){
 if(!request.newStatementSource)return null;
 assert.deepEqual(request.newStatementSource,newStatementSource,'STATEMENT_READONLY_SOURCE_SCOPE_DRIFT');
 assert.ok(request.financialPolicyIds,'STATEMENT_FINANCIAL_CENSUS_REQUIRED');
 const bytes=require('node:fs').readFileSync(require('node:path').join(__dirname,'..',newStatementSource.path));
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),newStatementSource.sha256,'STATEMENT_SOURCE_BYTES_DRIFT');
 const source=JSON.parse(bytes);assert.equal(source.schema,'GI_I66_NEW_INSURER_SOURCE_DELTA_20261124_V1');
 assert.equal(source.tenantId,'alianzas-soluciones');assert.equal(source.projectId,'ays-orbit-360-lab');
 assert.equal(source.liveWrites,0);assert.equal(source.facts.length,56);assert.equal(source.isolatedRows.length,22);
 return source;
}
function statementPolicyMatches(request,arrays){
 const source=statementManifest(request);if(!source)return [];
 const clients=new Map(arrays.clientes.map(r=>[r.id,r]));
 const insurerNames={MAPFRE:/mapfre/i,GENERAL:/^(?:aseguradora )?general(?: de seguros)?$/i,
  UNIVERSALES:/universales/i,GYT:/G\s*(?:&|Y)\s*T/i};
 const insurerMatch=(p,f)=>arrays.aseguradoras.some(a=>a.id===p.aseguradoraId&&
  insurerNames[f.insurer]?.test(str(a.nombre||a.razonSocial))===true);
 const related=(value,number,insurer)=>{
  if(!str(value))return '';
  const policyNorm=x=>str(x).normalize('NFD').toUpperCase().replace(/[^A-Z0-9$]/g,'');
  if(policyNorm(value)===policyNorm(number))return 'FORMATTING_EQUIVALENT_DIAGNOSTIC_ONLY';
  const serial=insurer==='UNIVERSALES'?/^\d{2}-\d{2}-\d{2}-(\d+)-\d+$/.exec(number):/([0-9]+)$/.exec(number);
  return /^\d+$/.test(str(value))&&serial&&String(Number(value))===String(Number(serial[1]))?'BARE_NUMBER_UNVERIFIED':'';
 };
 const out=[];
 for(const p of arrays.polizas){
  const matched=source.facts.flatMap(f=>{
   const sameInsurer=insurerMatch(p,f);if(!sameInsurer)return [];
   const relations=Object.fromEntries(fields.filter(k=>related(p[k],f.policy,f.insurer)).map(k=>[k,related(p[k],f.policy,f.insurer)]));
   const holder=clients.get(p.clienteId),sameHolder=holder&&holderMatch({sourcePdfSha256:f.sourceSha256,holderWitness:f.holderWitness},holder)===true;
   if(!Object.keys(relations).length&&!sameHolder)return [];
   return [{sourceFactId:f.sourceFactId,sourcePolicy:f.policy,insurerVerified:sameInsurer,holderWitnessMatches:!!sameHolder,
    policyCountryMatchesSource:p.pais==='GT',
    policyCurrencyMatchesSource:p.moneda===f.currency,sourceCurrency:f.currency,
    numberRelations:relations,sourceTerm:f.term||null,sourceRequirement:f.requirement,sourceState:f.state}];
  });
  if(matched.length)out.push({policy:p,matches:matched});
 }
 assert.ok(out.length<=100,'STATEMENT_POLICY_DIAGNOSTIC_BOUNDARY');return out;
}
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
 statementManifest(request);
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
 for(const {policy:p} of statementPolicyMatches(request,arrays)){
  add('polizas',p.id);add('clientes',p.clienteId);add('aseguradoras',p.aseguradoraId);
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
   /^(?:[A-Za-z]{1,6}\$?[ -]*)?\d[\d /.-]{0,70}$/.test(str(p[f]))?str(p[f]):'REDACTED_NON_POLICY_ALIAS']));
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
  'fechaVencimientoContractual','vence','fechaVencimiento','fechaLimite','fechaPago','paidDate','actualPaidDate','inferredEffectiveDate','evidenceAsOfDate',
  'applicationDate','fechaAplicacion','invoiceDate','fechaFactura'];
 const amountFields=['primaTotal','monto','montoTotal','grossAmount','amount','primaNeta','neta','netPremium','saldo','saldoPendiente','montoPagado'];
 const idFields=['polizaId','policyId','clienteId','clientId','asesorId','aseguradoraId','reciboId','receiptId','reciboEsperadoId',
  'cobroId','sourceId','sourceRef','evidenceId','sourceCandidateId','auditId','operationId','requestId','documentRef','sourceDocumentRef',
  'applicationEvidenceRef','invoiceDocumentRef'];
 const referenceFields=['numeroReciboFuente','numeroReciboAseguradora','numeroRequerimiento','requerimiento','numeroRecibo',
  'polizaNumero','numeroPoliza','policyNumber','policyNumberSource','numeroPolizaFuente','secuencia','numeroCuota','cuota','serie','totalCuotas','totalInstallments','anchorInstallment'];
 const invoiceFields=['numeroFactura','invoiceNumber','factura','serieFactura','invoiceSeries'];
 const stateFields=['estado','estadoOperativo','paymentState','applicationState','paymentOrigin','paymentEvidenceType',
  'directOrInferred','carteraTipo','estadoCartera','exigibilidad','actualPaidDateSource','applicationEvidenceType','evidenceType'];
 const booleanFields=['pagado','confirmado','inferredPaid','conciliado','conciliadoPago','carteraActiva','historicalExigible','saldoConciliado','applicationEvidenceVerified'];
 const knownStates=new Set(['PAID_DIRECT','PAID_INFERRED','PAID_REPORTED','PENDING','UNPAID','PAID','Pagado','Pendiente','Vencido','Cancelado','Anulado',
  'DIRECT','INFERRED','REPORTED','PENDING_APPLICATION','APPLIED','APPLIED_DIRECT','APPLIED_INFERRED','CONFIRMED','RECONCILED','CRM_MIGRATED_DIRECT_PAYMENT',
  'LEGACY_CENDOSO_FECHA_REAL_PAGADO','CENDOSO_FECHA_REAL_PAGADO','pagado_sin_saldo','historico_pagado_fuente',
  'cerrada','exigible','futura','pendiente','pendiente_vencido','futuro_pendiente','cartera_activa',
  'INSURER_INVOICE','INSURER_STATEMENT','COMMISSION_STATEMENT','INVOICE_INSTALLMENT_N',
  'COMMISSION_STATEMENT_INSTALLMENT_N','INSURER_STATEMENT_PENDING_FROM_N','BANK_STATEMENT_MATCH']);
 const val=(k,v)=>({type:typeof v,present:true,value:
  typeof v==='number'&&Number.isFinite(v)?v:typeof v==='string'&&/^[+-]?\d+(?:\.\d{1,8})?$/.test(v.trim())?v:null,
  ...(v!=null&&!['string','number'].includes(typeof v)?{valueSha256:sha(JSON.stringify(stable(v)))}:{})});
 const project=r=>({collection:r.collection,id:safeId(r.id),documentSha256:sha(JSON.stringify(stable({...r,collection:undefined}))),
  ids:Object.fromEntries(idFields.filter(k=>str(r[k])).map(k=>[k,safeId(r[k])])),
  dates:Object.fromEntries(dateFields.filter(k=>r[k]!=null).map(k=>[k,
   day(r[k])||{type:typeof r[k],valueSha256:sha(JSON.stringify(stable(r[k])))}])),
  amounts:Object.fromEntries(amountFields.filter(k=>r[k]!=null).map(k=>[k,val(k,r[k])])),
  references:Object.fromEntries(referenceFields.filter(k=>r[k]!=null).map(k=>[k,
   /^(?:[A-Za-z]{1,8}\$?[ -]*)?\d[\d /.-]{0,70}$/.test(str(r[k]))||/^(?:rec|car|cob|pol)_[a-z0-9_]{6,150}$/.test(str(r[k]))?
    str(r[k]):{valueSha256:sha(JSON.stringify(stable(r[k])))}])),
  invoiceReferences:Object.fromEntries(invoiceFields.filter(k=>r[k]!=null).map(k=>[k,
   /^(?:\d{1,30}|[A-Fa-f0-9]{8}(?:-\d{1,30})?|[A-Fa-f0-9]{8}(?:-[A-Fa-f0-9]{4}){3}-[A-Fa-f0-9]{12})$/.test(str(r[k]))?
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
 const extra=statementPolicyMatches(request,Object.fromEntries(['polizas','clientes','aseguradoras'].map(collection=>
  [collection,entries.filter(e=>e.collection===collection&&e.exists).map(e=>({...e.data,id:e.id}))])));
 const targetIds=[...new Set([...request.financialPolicyIds,...extra.map(x=>x.policy.id)])];
 const targets=targetIds.map(id=>{
  const found=snapshot.records.filter(r=>owns(r,id));assert.ok(found.length<=300,'FINANCIAL_POLICY_DIAGNOSTIC_BOUNDARY');
  const p=entries.find(e=>e.collection==='polizas'&&e.id===id)?.data||{};
  return {policy:policy(id),policyAmountFields:Object.fromEntries(amountFields.filter(k=>p[k]!=null).map(k=>[k,val(k,p[k])])),
   frequency:['Mensual','Pago Único','Contado','Anual','Trimestral','Semestral'].includes(p.frecuencia)?p.frecuencia:null,
   declaredInstallments:/^\d{1,3}$/.test(str(p.cuotas))?Number(p.cuotas):null,
   counts:Object.fromEntries(['recibosEsperados','carteraPrimas','cobros'].map(k=>[k,found.filter(r=>r.collection===k).length])),
   records:found.map(project),...(extra.some(x=>x.policy.id===id)?{newStatementMatches:extra.find(x=>x.policy.id===id).matches}:{})};
 });
 const relevantAudit=snapshot.audits.filter(a=>targetIds.includes(a.policyId)||sourceIds.has(a.sourceId));
 const delta=statementManifest(request),newRefs=new Set(delta?delta.facts.map(f=>f.requirement):[]);
 const outside=snapshot.records.filter(r=>(idFields.some(k=>sourceIds.has(r[k]))||referenceFields.some(k=>newRefs.has(str(r[k]))))&&
  !targetIds.some(id=>owns(r,id)));
 assert.ok(outside.length<=300,'STATEMENT_OUTSIDE_TARGET_DIAGNOSTIC_BOUNDARY');
 return {complete:true,writes:0,sourceSha256:snapshot.sourceSha256,
  ...(delta?{newStatementSource:{...newStatementSource,sourceFacts:delta.facts.length,
   sourcePolicyCount:new Set(delta.facts.map(f=>f.insurer+'|'+f.policy)).size,matchingPolicyEditions:extra.length,
   diagnosticOnly:true,noEligibilityEffect:true}}:{}),
  censusCounts:Object.fromEntries(['recibosEsperados','carteraPrimas','cobros'].map(k=>[k,snapshot.records.filter(r=>r.collection===k).length])),
  financialCensusSha256:sha(JSON.stringify(stable(snapshot.records))),targets,
  sourceCandidates:targetSource.map(r=>({sourceId:r.candidateId,policy:r.policyNumberSource,term:[r.coverageStart,r.coverageEnd],
   period:r.receiptPeriodStart,due:r.receiptDueDate,paid:r.actualPaidDate,gross:r.totalPremium,net:r.netPremium,
   holdReasons:r.holdReasons,sourceRows:r.sourceRows})),
  auditWitnesses:relevantAudit.map(a=>({id:safeId(a.id),policyId:safeId(a.policyId),sourceId:safeId(a.sourceId),
   receiptId:safeId(a.receiptId),portfolioId:safeId(a.portfolioId),cobroId:safeId(a.cobroId),documentSha256:sha(JSON.stringify(stable(a)))})),
  sourceLinkedOutsideTargets:outside.map(project)};
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
// Complete the already documented MAPFRE preflight in this same read owner.
// Originals and full CAS images are private artifact data. This entry cannot
// enter any writer, create payments or reinterpret a paid source as pending.
const mapfrePins={
 preflight:['artifacts/orbit360-recovery/release-control/I6_6_MAPFRE_NEXT_CONTROLLED_PREFLIGHT_20261124_R46.json','6e8003a6ecb3ac5eafbe417e044980668b8d16c8f07c9264082cc77996021162'],
 holder:['artifacts/orbit360-recovery/release-control/I6_6_MAPFRE57714_HOLDER_WITNESS_CAUSAL_READONLY_20261124.json','378e729cfb71a6b54758b9f3356c14326015978ceaaa2a3ecdd52cd979e080c2'],
 source:[newStatementSource.path,newStatementSource.sha256],
 authority:['artifacts/orbit360-recovery/release-control/I6_6_DIRECTION_URGENT_COMPLETION_TOLERANCE_AND_DIRECT_RENEWAL_20261124.json','cda5d408666e6e959248ea0a08ffa13f9e05a695fe41b3dedee20ba3d93f7c3d']
};
function mapfreBinding(){
 const fs=require('node:fs'),path=require('node:path'),value={};
 for(const [key,[name,digest]] of Object.entries(mapfrePins)){
  const bytes=fs.readFileSync(path.join(__dirname,'..',name));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),digest,'MAPFRE_PIN_CHANGED_'+key);
  value[key]=JSON.parse(bytes);
 }
 assert.equal(value.authority.decisions.extendPreviouslyApprovedToleranceToAllInsurersAndCases,true);
 assert.equal(value.preflight.scope.policyNumber,'3002400057714');
 assert.equal(value.preflight.twoCases.length,2);
 for(const target of value.preflight.twoCases){
  const fact=value.source.facts.find(f=>f.sourceFactId===target.sourceFactId);
  assert.ok(fact&&fact.paymentConfirmed===true&&fact.actualPaidDateEvidence===true);
  assert.ok(['PAID','COMMISSION_ANCHOR'].includes(fact.state),'MAPFRE_TRUTHFUL_SOURCE_STATE_REQUIRED');
  assert.equal(fact.grossCents,target.documentedTarget.grossCents);
  assert.equal(fact.paidDate,target.documentedTarget.paidDate);
  assert.equal(fact.requirement,target.requirement);
  assert.equal(fact.sourceRowSha256,target.source.sourceRowSha256);
  assert.equal(fact.sourceSha256,target.source.sha256);
 }
 return value;
}
async function mapfreOriginals(binding,fetcher=fetch,headers){
 if(!headers){const {GoogleAuth}=require('google-auth-library');
  headers=await (await new GoogleAuth({scopes:['https://www.googleapis.com/auth/drive.readonly']}).getClient()).getRequestHeaders();}
 return Promise.all(binding.preflight.originalDocumentPins.map(async ref=>{
  const result={kind:ref.kind,fileId:ref.driveFileId,expectedSha256:ref.sha256};
  try{
   const response=await fetcher('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(ref.driveFileId)+'?alt=media&supportsAllDrives=true',
    {headers,signal:AbortSignal.timeout(25000)});
   if(!response.ok)return {...result,http:response.status,status:'ORIGINAL_HTTP_HOLD'};
   const bytes=Buffer.from(await response.arrayBuffer()),digest=crypto.createHash('sha256').update(bytes).digest('hex');
   return {...result,http:response.status,bytes:bytes.length,sha256:digest,
    status:bytes.length>0&&bytes.length<=4e6&&digest===ref.sha256?'ORIGINAL_BYTES_VERIFIED':'ORIGINAL_DIGEST_HOLD'};
  }catch{return {...result,status:'ORIGINAL_TRANSPORT_HOLD'};}
 }));
}
async function mapfreSnapshot(db,binding,transaction){
 const tenant=db.collection('tenants').doc(binding.preflight.scope.tenantId);
 const at=col=>tenant.collection('data').doc(col).collection('items');
 const get=ref=>transaction?transaction.get(ref):ref.get();
 const raw=s=>({id:s.id,exists:s.exists===true,updateTime:s.updateTime?.toJSON?s.updateTime.toJSON():s.updateTime||null,
  data:s.exists?s.data():null});
 const collections={};
 await Promise.all(['polizas','recibosEsperados','carteraPrimas','cobros','aseguradoras'].map(async col=>{
  const snap=await get(at(col).limit(15001));assert.ok(snap.size<=15000,'MAPFRE_CENSUS_BOUNDARY_'+col);
  collections[col]=snap.docs.map(raw);
 }));
 const s=binding.preflight.scope,client=raw(await get(at('clientes').doc(s.clientId)));
 const requests=await Promise.all(binding.preflight.twoCases.map(t=>get(tenant.collection('reconciliationRequests').doc(t.pendingConditionalCanonicalCall.requestId))));
 return {collections,client,requests:requests.map(raw),complete:true,observedAtUtc:new Date().toISOString()};
}
function mapfreReview(binding,snapshot,originals){
 const s=binding.preflight.scope,{moneyCents,paid}=require('./gravicentra-i66-source-bulk-plan.cjs');
 const all=snapshot.collections,holds=[],entries=[],find=(col,id)=>all[col].find(e=>e.id===id);
 const p=find('polizas',s.policyId),insurer=find('aseguradoras',s.insurerId),client=snapshot.client;
 const add=e=>{if(e&&!entries.some(x=>x.collection===e.collection&&x.id===e.id))entries.push(e);};
 const policy=p?.data;
 const witnesses=binding.holder.sources,knownHolderHashes=new Set(witnesses.flatMap(w=>[w.sourceNormalizedHolderSha256,w.issuedPdfNormalizedHolderSha256]));
 const holderEvidence=Object.fromEntries(['nombre','nombreCompleto','razonSocial'].map(k=>[k,{present:!!str(client.data?.[k]),
  matchesPinnedOriginal:!!str(client.data?.[k])&&knownHolderHashes.has(sha(norm(client.data[k])))}]));
 if(!snapshot.complete||originals.length!==3||originals.some(o=>o.status!=='ORIGINAL_BYTES_VERIFIED'))holds.push('MAPFRE_ORIGINAL_ACCESS_UNVERIFIED');
 if(!policy||/ANULADA|CANCELADA|SUSPENDIDA|DELETED/.test(str(policy.estado).toUpperCase())||policy.clienteId!==s.clientId||policy.aseguradoraId!==s.insurerId||policy.pais!=='GT'||policy.moneda!=='GTQ'||
  policy.vigenciaInicio!==s.issuedTerm[0]||policy.vigenciaFin!==s.issuedTerm[1]||
  !fields.some(k=>norm(policy[k])===norm(s.policyNumber))||fields.some(k=>str(policy[k])&&norm(policy[k])!==norm(s.policyNumber))||
  (policy.tenantId&&policy.tenantId!==s.tenantId)||!insurer?.exists||!/mapfre/i.test(str(insurer.data.nombre||insurer.data.razonSocial)))holds.push('MAPFRE_POLICY_IDENTITY_HOLD');
 if(!client.exists||client.id!==s.clientId||!Object.values(holderEvidence).some(v=>v.matchesPinnedOriginal)||
  (client.data.tenantId&&client.data.tenantId!==s.tenantId)||(client.data.pais&&!['GT','GUATEMALA'].includes(str(client.data.pais).toUpperCase())))holds.push('MAPFRE_HOLDER_IDENTITY_HOLD');
 const candidates=all.polizas.filter(e=>fields.some(k=>norm(e.data[k])===norm(s.policyNumber))&&
  e.data.vigenciaInicio===s.issuedTerm[0]&&e.data.vigenciaFin===s.issuedTerm[1]&&e.data.pais==='GT');
 if(candidates.length!==1||candidates[0].id!==s.policyId)holds.push('MAPFRE_POLICY_EDITION_NOT_UNIQUE');
 for(const [col,e] of [['polizas',p],['aseguradoras',insurer],['clientes',client]])if(e)add({...e,collection:col});
 const targets=binding.preflight.twoCases.map(t=>{
  const local=[],r=find('recibosEsperados',t.receiptId),c=find('carteraPrimas',t.portfolioId);
  const source=binding.source.facts.find(f=>f.sourceFactId===t.sourceFactId),matched={};
  for(const [col,e] of [['recibosEsperados',r],['carteraPrimas',c]]){
   if(!e?.exists||!e.updateTime){local.push('MAPFRE_EXISTING_PREIMAGE_REQUIRED');continue;}
   add({...e,collection:col});const d=e.data;
   if(str(d.polizaId)!==s.policyId||(col==='carteraPrimas'&&str(d.reciboId)!==t.receiptId)||
    (d.policyId&&d.policyId!==s.policyId)||(d.clienteId&&d.clienteId!==s.clientId)||
    (d.aseguradoraId&&d.aseguradoraId!==s.insurerId)||(d.moneda&&d.moneda!=='GTQ')||
    (col==='carteraPrimas'&&d.carteraActiva===false)||(d.pais&&!['GT','GUATEMALA'].includes(str(d.pais).toUpperCase()))||(d.tenantId&&d.tenantId!==s.tenantId)||
    str(d.serie)!==t.installment+'/12')local.push('MAPFRE_TARGET_IDENTITY_HOLD');
   const amounts=['primaTotal','monto','montoTotal'].filter(k=>d[k]!==undefined&&d[k]!==null&&d[k]!=='').map(k=>moneyCents(d[k]));
   if(!amounts.length||amounts.some(v=>!Number.isSafeInteger(v)||v!==amounts[0])||
    Math.abs(amounts[0]-source.grossCents)>5)local.push('MAPFRE_GROSS_OR_TOLERANCE_HOLD');
   if(paid(d)||[d.paymentState,d.applicationState].some(v=>/^(?:PAID|APPLIED)_/i.test(str(v)))||
    ['fechaPagoReportada','fechaPago','paidDate','reversedAt','reversalId'].some(k=>str(d[k]))||
    ['reversal','reversed','partialPayment','inferredPaid'].some(k=>d[k]===true)||
    /anulad|parcial|partial|revers/i.test(str(d.estado)+' '+str(d.estadoOperativo)))local.push('MAPFRE_PAYMENT_STATE_REVIEW');
   const reference=str(d.numeroReciboFuente);
   if(reference&&!reference.startsWith('rec_')&&reference!==t.requirement)local.push('MAPFRE_EXTERNAL_REFERENCE_CONFLICT');
   matched[col]={id:e.id,sha256:sha(JSON.stringify(stable(d))),updateTime:e.updateTime,grossCents:amounts[0],
    sourceGrossCents:source.grossCents,varianceCents:source.grossCents-amounts[0],operationalLimit:day(d.fechaLimite),
    currentContractualDue:day(d.fechaVencimientoContractual||d.vence||d.fechaVencimiento),sourceContractualDue:source.due};
  }
  const payments=all.cobros.filter(e=>e.id===t.pendingConditionalCanonicalCall.expectedNewCobroIdIfAbsent||
   ['reciboId','receiptId','reciboEsperadoId','expectedReceiptId'].some(k=>e.data[k]===t.receiptId)||
   ['evidenceId','sourceRef','sourceFactId'].some(k=>e.data[k]===t.sourceFactId));
  const portfolios=all.carteraPrimas.filter(e=>['reciboId','receiptId'].some(k=>e.data[k]===t.receiptId));
  const duplicateReq=all.recibosEsperados.filter(e=>e.id!==t.receiptId&&
   [e.data.polizaId,e.data.policyId].includes(s.policyId)&&
   (['numeroReciboFuente','numeroRequerimiento','requerimiento'].some(k=>str(e.data[k])===t.requirement)||str(e.data.serie)===t.installment+'/12'));
  if(payments.length||snapshot.requests.some(e=>e.id===t.pendingConditionalCanonicalCall.requestId&&e.exists))local.push('MAPFRE_EXISTING_PAYMENT_OR_REQUEST_REVIEW');
  if(portfolios.length!==1||portfolios[0].id!==t.portfolioId||duplicateReq.length)local.push('MAPFRE_TARGET_RELATION_NOT_UNIQUE');
  return {sourceFactId:t.sourceFactId,installment:t.installment,requirement:t.requirement,matched,
   sourceState:source.state,sourceGrossCents:source.grossCents,paidDate:source.paidDate,
   localHolds:[...new Set(local)],correctionEligible:holds.length===0&&local.length===0,
   canonicalPaymentRequest:t.pendingConditionalCanonicalCall};
 });
 for(const col of ['recibosEsperados','carteraPrimas','cobros'])for(const e of all[col])
  if([e.data.polizaId,e.data.policyId].includes(s.policyId))add({...e,collection:col});
 const previous=binding.preflight.preservedPayments;
 assert.equal(previous.length,9,'MAPFRE_PRESERVED_PAYMENT_SCOPE_REQUIRED');
 const missingPreserved=previous.filter(t=>{
  const payment=find('cobros',t.cobroId),receipt=find('recibosEsperados',t.receiptId);
  return !payment||!receipt||payment.data.reciboId!==t.receiptId||
   str(payment.data.polizaId)!==s.policyId||moneyCents(payment.data.monto??payment.data.primaTotal)!==t.amountCents;
 });
 if(missingPreserved.length)holds.push('MAPFRE_PRIOR_PAYMENT_PRESERVATION_REQUIRES_REVIEW');
 for(const target of targets)target.correctionEligible=target.correctionEligible&&holds.length===0;
 return {schema:'GI_I66_MAPFRE_FRESH_CONTROLLED_PREFLIGHT_V1',status:'READONLY_PREFLIGHT_NO_PAYMENT_ADMISSION',
  sourcePins:mapfrePins,policyId:s.policyId,observedAtUtc:snapshot.observedAtUtc,originals,holderEvidence,
  globalHolds:[...new Set(holds)],targets,correctionEligibleCount:targets.filter(t=>t.correctionEligible).length,
  paymentWriteEligibleCount:0,writes:0,newPayments:0,annualVarianceCents:3,maxApprovedGtqVarianceCents:5,
  annualVariancePreserved:true,installment12Excluded:true,privatePreimages:entries,canonicalRequests:snapshot.requests,
  beforeHash:sha(JSON.stringify(stable({entries,requests:snapshot.requests}))),
  next:'Existing protected obligation owner CAS; then actual authenticated canonical payment owner and independent readback.'};
}
async function mapfreFreshPreflight(db){
 const binding=mapfreBinding(),originals=await mapfreOriginals(binding),snapshot=await mapfreSnapshot(db,binding);
 return mapfreReview(binding,snapshot,originals);
}
module.exports={validate,select,report,numberRelation,financialReport,financialPolicyIds,appendEvidence,
 newStatementSource,statementPolicyMatches,mapfreBinding,mapfreOriginals,mapfreSnapshot,mapfreReview,mapfreFreshPreflight};
