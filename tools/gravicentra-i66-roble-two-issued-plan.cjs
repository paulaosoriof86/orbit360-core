'use strict';
// Existing I6.6 protected source-to-receipt plan. The original two cases retain
// their identities; the remaining three use the risk in the pinned issuer PDF.
// This pure module grants no writes. Only the existing reviewed GitHub environment can apply it.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const source=require('../artifacts/orbit360-recovery/source-batches/I6_6_ROBLE_TWO_ISSUED_24_REQUIREMENTS_FINANCIAL_BREAKDOWN_20261122.json');
const five=require('../artifacts/orbit360-recovery/source-batches/I6_6_ROBLE_FIVE_ISSUED_49_REQUIREMENTS_20261122.json');
const witness=require('../artifacts/orbit360-recovery/source-batches/I6_6_ROBLE_FIVE_ISSUED_IDENTITY_WITNESSES_20261122.json');
const originals=require('./gravicentra-i66-roble-issued-original.cjs');
const {sourceAliases}=require('./gravicentra-i66-source-bulk-plan.cjs');
const sha=v=>crypto.createHash('sha256').update(String(v)).digest('hex');
const norm=v=>String(v==null?'':v).normalize('NFD').toUpperCase().replace(/[^A-Z0-9]/g,'');
const cents=n=>Math.round(Number(n)*100);
const tenant='alianzas-soluciones',project='ays-orbit-360-lab';
const policies=new Set(['91-8324489','91-8343059']);
const cases=[...source.cases,...originals.remainingCases()];
const OWNER_PATH='artifacts/orbit360-recovery/release-control/I6_6_DIRECCION_DECISIONES_FINANCIERAS_Y_PLAN_INTEGRAL_20261122.md';
const authority=fs.readFileSync(OWNER_PATH);
const gitBlob=crypto.createHash('sha1').update('blob '+authority.length+'\0').update(authority).digest('hex');
function check(){
 assert.equal(gitBlob,'53b08239aa8807378ec95a4b4704c5d97622bc84','DIRECTION_AUTHORITY_DRIFT');
 assert.equal(source.schema,'GI_I66_ROBLE_TWO_ISSUED_24_REQUIREMENTS_BREAKDOWN_V1');
 assert.equal(source.cases.length,2);assert.equal(source.totals.installments,24);
 assert.equal(source.totals.statementGrossCents,840785,'TWO_ISSUER_STATEMENT_24_SUM_DRIFT');
 assert.equal(source.totals.headerGrossCents,840797,'TWO_ISSUER_COVER_TOTAL_DRIFT');
 assert.equal(source.totals.differenceCents,12,'TWO_ISSUER_MINOR_ROUNDING_DRIFT');
 assert.equal(source.parentManifestBlobSha,'ab64e111319e3447733a3af05bf378250698ccdb');
 assert.equal(source.writing.firestoreWrites,0);
 for(const c of source.cases){
  assert.ok(policies.has(c.policy),'SOURCE_POLICY_SCOPE_DENIED');
  const issued=five.cases.find(x=>x.policy===c.policy),w=witness.witnesses.find(x=>x.policy===c.policy);
  assert.ok(issued&&w&&w.initialCertificateHolderMatchesContractHolder===true,'ISSUER_EVIDENCE_INCOMPLETE');
  assert.equal(issued.sourcePdfRawSha256,w.sourcePdfRawSha256);
  assert.equal(issued.issuerEndorsement,c.endorsement);
  assert.equal(issued.issuedGrossCents,c.issuerHeader.grossCents);
  assert.equal(issued.matchedSourcePendingCount,12);
  assert.ok(Number.isSafeInteger(c.issuedInsuredValueCents)&&c.issuedInsuredValueCents>0,'SIGNED_ISSUER_INSURED_VALUE_REQUIRED');
  assert.equal(c.schedule.length,12);assert.equal(c.schedule[0].sequence,1);
  for(const r of c.schedule){
   const x=issued.schedule.find(y=>y.requirement===r.requirement);
   assert.ok(x,'REQUIREMENT_NOT_SOURCE_DOCUMENTED');
   assert.equal(x.due,r.due);assert.equal(x.grossCents,r.grossCents);
   assert.equal(r.netCents+r.expensesAndOtherCents+r.financingCents+r.ivaCents,r.grossCents);
  }
  assert.equal(new Set(c.schedule.map(x=>x.requirement)).size,12);
  assert.equal(new Set(c.schedule.map(x=>x.sequence)).size,12);
  assert.equal(c.schedule.reduce((n,r)=>n+r.grossCents,0),c.issuedScheduleGrossCents);
  assert.ok([4,8].includes(c.coverScheduleDeltaCents),'DOCUMENTED_CENTS_VARIANCE_UNEXPECTED');
 }
 return true;
}
function match(w,v,k){return !!v&&sha(w.sourcePdfRawSha256+'|'+norm(v))===w[k];}
function operationFor(c,holder,insurer){
 return 'gi_i66_roble_two_'+sha([tenant,'GT',insurer.id,c.policy,holder.id,c.termStart,c.endorsement].join('|')).slice(0,24);
}
function resolveIssued(c,arrays,matcher=match){
 const w=witness.witnesses.find(x=>x.policy===c.policy);
 const {clientes=[],aseguradoras=[],polizas=[],vehiculos=[],asesores=[]}=arrays;
 const holder=clientes.filter(x=>x.pais==='GT'&&[x.nombre,x.nombreCompleto,x.razonSocial].some(n=>matcher(w,n,'holderWitness')));
 const insurers=aseguradoras.filter(x=>x.pais==='GT'&&x.activo!==false&&/roble/i.test(x.nombre||''));
 const compatible=polizas.filter(x=>[x.numero,x.numeroPoliza,x.polizaNumero].some(n=>norm(n)===norm(c.policy)));
 const unverifiedCountry=compatible.filter(x=>!['GT','CO'].includes(x.pais));
 const siblings=compatible.filter(x=>x.pais==='GT');
 const current=siblings.filter(p=>p.vigenciaInicio===c.termStart||p.vigenciaFin===c.termEnd);
 const prior=siblings.filter(p=>p.vigenciaFin===c.termStart&&holder.some(h=>h.id===p.clienteId)&&insurers.some(i=>i.id===p.aseguradoraId));
 const advisorId=prior[0]?.asesorId||holder[0]?.asesorId;
 const advisors=asesores.filter(a=>a.id===advisorId&&a.activo!==false&&
  (!a.pais||a.pais==='GT'||(Array.isArray(a.paises)&&a.paises.includes('GT'))));
 const riskMatches=vehiculos.filter(v=>[v.placa,v.placaFuente].some(n=>matcher(w,n,'initialCertificatePlateWitness'))||
  [v.vin,v.chasis,v.chasisFuente].some(n=>matcher(w,n,'initialCertificateVinWitness')));
 const byPolicy=new Map(polizas.map(p=>[p.id,p]));
 const riskConflicts=riskMatches.filter(v=>{
  const p=byPolicy.get(v.polizaId);
  return v.clienteId!==holder[0]?.id||(v.pais&&v.pais!=='GT')||!p||p.pais!=='GT'||
   p.clienteId!==holder[0]?.id||!/^\d{4}-\d{2}-\d{2}$/.test(p.vigenciaFin||'')||p.vigenciaFin>c.termStart;
 });
 const priorRisk=vehiculos.filter(v=>prior.some(p=>p.id===v.polizaId));
 let status='ELIGIBLE_SOURCE_IDENTITY_ONLY';
 if(!c.originalVerified||!c.originalProof?.contractHolderVerified||c.originalProof?.certificateCount!==1)status='ISSUED_ORIGINAL_NOT_VERIFIED';
 else if(holder.length!==1)status='CLIENT_HOLDER_NOT_UNIQUE';
 else if(insurers.length!==1)status='INSURER_NOT_UNIQUE';
 else if(unverifiedCountry.length)status='COMPATIBLE_POLICY_COUNTRY_UNVERIFIED';
 else if(siblings.some(p=>[p.numero,p.numeroPoliza,p.polizaNumero].filter(Boolean).some(n=>norm(n)!==norm(c.policy))))status='POLICY_NUMBER_FIELDS_CONFLICT';
 else if(current.length)status='ISSUED_EDITION_ALREADY_EXISTS';
 else if(prior.length!==1&&!(c.allowAbsentPredecessor&&siblings.length===0))status='PREDECESSOR_NOT_UNIQUE';
 else if(siblings.some(p=>!p.vigenciaFin||p.vigenciaFin>c.termStart))status='COMPETING_POLICY_EDITION';
 else if(prior.some(p=>p.renovadaPor||/cancelad|anulad/i.test(p.estado||''))||polizas.some(p=>prior.some(old=>p.renuevaDe===old.id)))status='ALREADY_RENEWED_OR_CANCELLED';
 else if(advisors.length!==1)status='DOCUMENTARY_ADVISOR_UNVERIFIED';
 else if(riskConflicts.length)status='ISSUED_RISK_CURRENT_POLICY_OR_HOLDER_CONFLICT';
 return {status,holder:holder[0],insurer:insurers[0],prior:prior[0],advisor:advisors[0],
  vehicle:c.originalRisk,preservedVehicleIds:[...new Set([...priorRisk,...riskMatches].map(v=>v.id))],
  riskConflictIds:riskConflicts.map(v=>v.id),
  evidence:{holderCount:holder.length,insurerCount:insurers.length,currentCount:current.length,
   unverifiedCountryCount:unverifiedCountry.length,
   priorCount:prior.length,priorVehicleCount:priorRisk.length,advisorCount:advisors.length,
   documentaryRiskMatches:riskMatches.length,currentRiskConflicts:riskConflicts.length,
   sourceRows:c.schedule.length,sourceRiskFromOriginal:true,
   ownerDistinctFromContractHolder:c.originalProof?.contractOwnerDistinct===true,
   externalRenewalWithoutCanonicalPredecessor:prior.length===0}};
}
function resolve(c,arrays,matcher=match){
 check();
 if(c.riskFromIssuedOriginal)return resolveIssued(c,arrays,matcher);
 const w=witness.witnesses.find(x=>x.policy===c.policy);
 const {clientes=[],aseguradoras=[],polizas=[],vehiculos=[],asesores=[]}=arrays;
 const holder=clientes.filter(x=>x.pais==='GT'&&[x.nombre,x.nombreCompleto,x.razonSocial].some(n=>matcher(w,n,'holderWitness')));
 const insurers=aseguradoras.filter(x=>x.pais==='GT'&&x.activo!==false&&/roble/i.test(x.nombre||''));
 const siblings=polizas.filter(x=>x.pais==='GT'&&[x.numero,x.numeroPoliza,x.polizaNumero].some(n=>norm(n)===norm(c.policy)));
 const current=siblings.filter(p=>p.vigenciaInicio===c.termStart&&p.vigenciaFin===c.termEnd);
 const prior=siblings.filter(p=>p.vigenciaFin===c.termStart&&holder.some(h=>h.id===p.clienteId)&&insurers.some(i=>i.id===p.aseguradoraId));
 const currentRelations=polizas.filter(p=>prior.some(x=>x.id===p.renuevaDe));
 const priorRisk=vehiculos.filter(v=>prior.some(p=>p.id===v.polizaId)&&holder.some(h=>h.id===v.clienteId));
 const plated=priorRisk.filter(v=>[v.placa,v.placaFuente].some(k=>matcher(w,k,'initialCertificatePlateWitness')));
 const conflictingVin=plated.filter(v=>[v.vin,v.chasis,v.chasisFuente].filter(Boolean).some(k=>!matcher(w,k,'initialCertificateVinWitness')));
 const advisor=asesores.filter(a=>prior.some(p=>p.asesorId===a.id)&&a.activo!==false);
 let status='ELIGIBLE_SOURCE_IDENTITY_ONLY';
 if(current.length)status='ISSUED_EDITION_ALREADY_EXISTS';
 else if(holder.length!==1)status='CLIENT_HOLDER_NOT_UNIQUE';
 else if(insurers.length!==1)status='INSURER_NOT_UNIQUE';
 else if(prior.length!==1)status='PREDECESSOR_NOT_UNIQUE';
 else if(prior[0].renovadaPor||currentRelations.length||/cancelad|anulad/i.test(prior[0].estado||''))status='ALREADY_RENEWED_OR_CANCELLED';
 else if(advisor.length!==1)status='PREDECESSOR_ADVISOR_UNVERIFIED';
 else if(priorRisk.length!==1||plated.length!==1||conflictingVin.length)status='ISSUED_RISK_IDENTITY_NOT_UNIQUE';
 // Do not "invent" a missing VIN; a uniquely plate-matched existing predecessor is
 // adequate only when the prior stored VIN is absent or exactly agrees with issuer.
 return{status,holder:holder[0],insurer:insurers[0],prior:prior[0],vehicle:plated[0],advisor:advisor[0],
   evidence:{holderCount:holder.length,insurerCount:insurers.length,currentCount:current.length,
    priorCount:prior.length,priorVehicleCount:priorRisk.length,platePriorCount:plated.length,
    conflictingVin:conflictingVin.length,advisorCount:advisor.length,sourceRows:c.schedule.length}};
}
function mutation(c,identity,at){
 assert.equal(identity.status,'ELIGIBLE_SOURCE_IDENTITY_ONLY');
 const {holder,insurer,prior,vehicle,advisor}=identity;
 const basis=[tenant,'GT',insurer.id,c.policy,holder.id,c.termStart,c.endorsement].join('|');
 const operation=operationFor(c,holder,insurer),pid='pol_'+operation,vid='veh_'+operation;
 const canonical={tenantId:tenant,pais:'GT',moneda:'GTQ',clienteId:holder.id,asesorId:advisor.id,aseguradoraId:insurer.id,operationId:operation};
 const fiveCase=five.cases.find(x=>x.policy===c.policy),w=witness.witnesses.find(x=>x.policy===c.policy);
 const url='https://drive.google.com/open?id='+fiveCase.sourcePdfId;
 const doc={fileId:fiveCase.sourcePdfId,documentRef:fiveCase.sourcePdfId,driveUrl:url,externalUrl:url,
   nombre:'Renovación emitida '+c.endorsement,sha256:w.sourcePdfRawSha256,clienteId:holder.id,polizaId:pid};
 const asMoney=x=>Number((x/100).toFixed(2));
 const today=at.slice(0,10);
 const common={...canonical,createdAt:at,updatedAt:at,creado:at,actualizado:at,fuente:'Documento emitido por El Roble + estado de cuenta 20/11/2026',source:'El Roble original emitido + estado de cuenta 20/11/2026',
   sourceDocumentRef:fiveCase.sourcePdfId,issuerDocumentSha256:w.sourcePdfRawSha256};
 const hdr=c.issuerHeader;
 const installments=c.schedule.length;
 const policy={...common,id:pid,numero:c.policy,estado:c.termStart<=today?'Vigente':'Emitida',
   policyKey:[tenant,'GT',insurer.id,c.policy,holder.id].join('|'),policyVersionKey:basis,ramo:prior?.ramo||'Vehículos',subramo:prior?.subramo||'',producto:prior?.producto||'',divisa:'GTQ',
   vigenciaInicio:c.termStart,vigenciaFin:c.termEnd,fechaEmision:c.issuedDate||'2026-10-13',...(prior?{renuevaDe:prior.id}:{}),
   frecuencia:installments===1?'Contado':'Mensual',cuotas:installments,endoso:c.endorsement,primaNeta:asMoney(hdr.netCents),
   gastosEmision:asMoney(hdr.expensesCents),otros:asMoney(hdr.assistCents),gastosFinan:asMoney(hdr.financeCents),
   iva:asMoney(hdr.ivaCents),ivaMonto:asMoney(hdr.ivaCents),prima:asMoney(hdr.grossCents),primaTotal:asMoney(hdr.grossCents),
   primaTotalDocumentalOriginal:asMoney(hdr.grossCents),primaCalendarioEmitido:asMoney(c.issuedScheduleGrossCents),
   diferenciaDocumentalCentavos:c.coverScheduleDeltaCents,
   sumaAsegurada:asMoney(c.issuedInsuredValueCents),documentRef:fiveCase.sourcePdfId,documentos:[doc],adjuntos:[doc],
   vehiculoId:vid,...(prior?{sourcePolicyId:prior.id}:{}),
   historial:[{fecha:today,icon:'🔄',t:'Renovación emitida registrada',d:'Endoso '+c.endorsement,operationId:operation}]};
 if(c.riskFromIssuedOriginal)Object.assign(policy,{issuerOperation:'RENOVACION',
   externalRenewalWithoutCanonicalPredecessor:!prior,documentaryRiskProof:c.originalProof});
 const creates=[['polizas',policy]];
 for(const r of c.schedule){
  const rid='cob_'+pid+'_'+String(r.sequence).padStart(2,'0');
  const due=r.due;
  const record={...common,id:rid,polizaId:pid,reciboKey:[tenant,pid,r.sequence].join('|'),
   secuencia:r.sequence,numeroCuota:r.sequence,cuota:r.sequence+'/'+installments,
   numeroReciboFuente:r.requirement,fechaVencimientoContractual:due,fechaVencimiento:due,vence:due,fechaLimite:due,
   primaNeta:asMoney(r.netCents),neta:asMoney(r.netCents),
   gastosEmisionYOtrosDocumentados:asMoney(r.expensesAndOtherCents),componenteGastosSinSeparar:true,
   gastosFinan:asMoney(r.financingCents),iva:asMoney(r.ivaCents),ivaMonto:asMoney(r.ivaCents),
   monto:asMoney(r.grossCents),primaTotal:asMoney(r.grossCents),montoTotal:asMoney(r.grossCents),
   estado:due<today?'Vencido':'Pendiente',carteraActiva:true,conciliado:false,fechaPago:null,
   sourceRowNumber:fiveCase.schedule.find(x=>x.requirement===r.requirement).sourceRowNumber,
   documentRef:fiveCase.sourcePdfId};
  creates.push(['recibosEsperados',record]);
  creates.push(['carteraPrimas',{...record,id:'car_'+rid,reciboId:rid,
    estadoOperativo:due<today?'pendiente_vencido':'futuro_pendiente',exigibilidad:due<today?'exigible':'futura',
    carteraTipo:'cartera_activa',estadoConciliacionSaldo:'pendiente_conciliacion',saldoConciliado:false}]);
 }
 const riskFields=['placa','placaFuente','vin','chasis','chasisFuente','marca','linea','anio','motor','uso','tipo','inciso'];
 if(c.riskFromIssuedOriginal)riskFields.push('propietario');
 const nextVehicle={...Object.fromEntries(riskFields.filter(k=>vehicle[k]!=null).map(k=>[k,vehicle[k]])),
   ...common,id:vid,polizaId:pid,estado:'Vigente',sumaAsegurada:asMoney(c.issuedInsuredValueCents),
   ...(prior?{sourcePolicyId:prior.id}:{}),
   ...(!c.riskFromIssuedOriginal?{sourceVehicleId:vehicle.id,versionOfVehicleId:vehicle.id}:{}),
   documentRef:fiveCase.sourcePdfId,creado:at};
 const activity={...common,id:'act_'+operation,polizaId:pid,...(prior?{sourcePolicyId:prior.id}:{}),
   fecha:today,tipo:'renovacion',icon:'🔄',titulo:'Renovación emitida registrada',
   detalle:'Endoso '+c.endorsement+' · '+installments+' obligaciones emitidas',origen:'Documento original El Roble',documentRef:fiveCase.sourcePdfId};
 creates.push(['vehiculos',nextVehicle],['actividades',activity]);
 const prevPatch=prior?{renovadaPor:pid,renovacionEstado:'Renovada',renovacionFechaEfectiva:c.termStart,
   historial:[...(prior.historial||[]),{icon:'🔄',fecha:today,t:'Renovación registrada',d:'Póliza sucesora '+pid,operationId:operation}],
   actualizado:at}:null;
 assert.equal(creates.length,installments*2+3);
 assert.equal(creates.filter(x=>x[0]==='recibosEsperados').length,installments);
 assert.equal(creates.filter(x=>x[0]==='carteraPrimas').length,installments);
 assert.equal(creates.filter(x=>x[0]==='cobros').length,0);
 assert.equal(creates.filter(x=>x[0]==='carteraPrimas').reduce((n,x)=>n+cents(x[1].primaTotal),0),c.issuedScheduleGrossCents);
 return{operation,policyId:pid,creates,previous:prevPatch,priorId:prior?.id||null,
   evidence:{issuedTerm:c.termStart+'..'+c.termEnd,pdfSha256:w.sourcePdfRawSha256,
    sourceCalendarGrossCents:c.issuedScheduleGrossCents,originalGrossCents:hdr.grossCents,documentedMinorDeltaCents:c.coverScheduleDeltaCents},
   counts:{creates:creates.length,updates:prior?1:0,audit:1,receipts:installments,portfolio:installments,directPayments:0}};
}
// The original issued policy is already present under one truncated number.
// This case corrects those exact existing identities; it never creates a
// successor, risk, receipt, payment, or another current obligation.
const existingIdentityTarget=Object.freeze({policy:'91-4140843',storedNumber:'91-414084',
 policyId:'pol_7ab15779e3626402f1cb4349fa69',vehicleId:'veh_89b8d29c9ed558c356dc0f75',
 receiptId:'rec_i65_59e37e009188644b34059e4a',portfolioId:'car_i65_ed31ae1fb408d4a4e95d2ca3',
 requirement:'5574011',operationalDate:'2026-09-25',contractualDate:'2026-10-10'});
const stable=x=>x&&typeof x==='object'?(typeof x.toJSON==='function'?stable(x.toJSON()):
 Array.isArray(x)?x.map(stable):Object.fromEntries(Object.keys(x).sort().filter(k=>x[k]!==undefined).map(k=>[k,stable(x[k])]))):x;
const stableHash=x=>sha(JSON.stringify(stable(x)));
const text=x=>String(x??'').trim();
function existingOperation(c){
 assert.equal(c.policy,existingIdentityTarget.policy);
 return 'gi_i66_roble_identity_'+sha([tenant,existingIdentityTarget.policyId,c.sourcePdfRawSha256,
  existingIdentityTarget.requirement].join('|')).slice(0,24);
}
function resolveExisting(c,arrays,matcher=match,corrected=false){
 const t=existingIdentityTarget,w=witness.witnesses.find(x=>x.policy===c.policy),bad=reason=>({status:reason});
 if(c.policy!==t.policy||!c.originalVerified||!c.originalProof?.contractHolderVerified||
  !c.originalProof?.sourceScheduleVerified||c.originalProof?.certificateCount!==1||c.schedule.length!==1||
  c.schedule[0].requirement!==t.requirement||c.schedule[0].due!==t.contractualDate||
  c.schedule[0].grossCents!==374740||c.issuerHeader.netCents!==278180)return bad('EXISTING_ISSUER_PROOF_REQUIRED');
 const holders=arrays.clientes.filter(x=>x.pais==='GT'&&[x.nombre,x.nombreCompleto,x.razonSocial].some(n=>matcher(w,n,'holderWitness')));
 const insurers=arrays.aseguradoras.filter(x=>x.pais==='GT'&&x.activo!==false&&/roble/i.test(x.nombre||''));
 const p=arrays.polizas.find(x=>x.id===t.policyId);
 if(holders.length!==1||insurers.length!==1||!p)return bad('EXISTING_POLICY_HOLDER_INSURER_NOT_UNIQUE');
 if(p.pais!=='GT'||p.clienteId!==holders[0].id||p.aseguradoraId!==insurers[0].id||
  p.vigenciaInicio!==c.termStart||p.vigenciaFin!==c.termEnd||/cancelad|anulad|renovada/i.test(p.estado||''))
  return bad('EXISTING_POLICY_EDITION_CONFLICT');
 const fields=['numero','numeroPoliza','polizaNumero'];
 const allowed=corrected?norm(c.policy):norm(t.storedNumber);
 if(!text(p.numero)||fields.some(k=>text(p[k])&&norm(p[k])!==allowed))return bad('EXISTING_POLICY_NUMBER_CONFLICT');
 const compatible=arrays.polizas.filter(x=>fields.some(k=>[norm(c.policy),norm(t.storedNumber)].includes(norm(x[k]))));
 if(compatible.some(x=>!['GT','CO'].includes(x.pais)))return bad('EXISTING_COMPATIBLE_COUNTRY_UNVERIFIED');
 if(compatible.some(x=>x.id!==p.id&&x.pais==='GT'&&(!/^\d{4}-\d{2}-\d{2}$/.test(x.vigenciaFin||'')||
  x.vigenciaFin>c.termStart)))return bad('EXISTING_COMPETING_POLICY_EDITION');
 const advisors=arrays.asesores.filter(a=>a.id===p.asesorId&&a.id===holders[0].asesorId&&a.activo!==false&&
  (!a.pais||a.pais==='GT'||Array.isArray(a.paises)&&a.paises.includes('GT')));
 if(advisors.length!==1)return bad('EXISTING_ADVISOR_UNVERIFIED');
 const owned=arrays.vehiculos.filter(v=>v.polizaId===p.id),vehicle=owned.find(v=>v.id===t.vehicleId);
 if(owned.length!==1||!vehicle||vehicle.clienteId!==p.clienteId||vehicle.pais!=='GT'||
  ![vehicle.placa,vehicle.placaFuente].some(v=>matcher(w,v,'initialCertificatePlateWitness'))||
  [vehicle.placa,vehicle.placaFuente].filter(v=>text(v)).some(v=>!matcher(w,v,'initialCertificatePlateWitness'))||
  [vehicle.vin,vehicle.chasis,vehicle.chasisFuente].filter(v=>text(v)).some(v=>!matcher(w,v,'initialCertificateVinWitness')))
  return bad('EXISTING_CURRENT_RISK_NOT_UNIQUE');
 const risks=arrays.vehiculos.filter(v=>[v.placa,v.placaFuente].some(n=>matcher(w,n,'initialCertificatePlateWitness'))||
  [v.vin,v.chasis,v.chasisFuente].some(n=>matcher(w,n,'initialCertificateVinWitness')));
 const parents=new Map(arrays.polizas.map(p=>[p.id,p]));
 if(risks.some(v=>{if(v.id===vehicle.id)return false;const parent=parents.get(v.polizaId);
  return v.clienteId!==p.clienteId||v.pais!=='GT'||!parent||parent.pais!=='GT'||parent.clienteId!==p.clienteId||
   !/^\d{4}-\d{2}-\d{2}$/.test(parent.vigenciaFin||'')||parent.vigenciaFin>c.termStart;}))
  return bad('EXISTING_CURRENT_RISK_COMPETITOR');
 return {status:'ELIGIBLE_EXISTING_IDENTITY_CORRECTION',policy:p,holder:holders[0],insurer:insurers[0],advisor:advisors[0],vehicle,
  preservedVehicleIds:risks.map(v=>v.id),preservedPolicyIds:[...new Set(risks.map(v=>v.polizaId).filter(id=>id!==p.id))]};
}
function existingFinancial(c,identity,snapshot){
 const t=existingIdentityTarget,p=identity.policy,bad=reason=>({status:reason});
 if(identity.status!=='ELIGIBLE_EXISTING_IDENTITY_CORRECTION'||!snapshot?.complete||!Array.isArray(snapshot.records)||!Array.isArray(snapshot.policies))
  return bad('EXISTING_COMPLETE_FINANCIAL_CENSUS_REQUIRED');
 if(p.moneda!=='GTQ'||cents(p.primaTotal)!==374740||cents(p.primaNeta)!==278180||p.frecuencia!=='Pago Único'||
  text(p.renuevaDe)||text(p.renovadaPor)||text(p.vehiculoId)&&p.vehiculoId!==t.vehicleId||
  text(p.documentRef)&&p.documentRef!==c.sourcePdfId||text(p.issuerDocumentSha256)&&p.issuerDocumentSha256!==c.sourcePdfRawSha256)
  return bad('EXISTING_POLICY_FULL_PREIMAGE_CONFLICT');
 const rows=snapshot.records,receipts=new Map(rows.filter(r=>r.collection==='recibosEsperados').map(r=>[r.id,r]));
 const policies=new Map(snapshot.policies.map(p=>[p.id,p]));
 const referenceFields=[...sourceAliases,'numeroRecibo','sourceRef','sourceId','evidenceId','sourceCaseId'];
 const related=rows.filter(r=>{
  const parents=[r.polizaId,r.policyId].map(text).filter(Boolean),links=[r.reciboId,r.receiptId,r.reciboEsperadoId].map(text).filter(Boolean);
  const inherited=links.flatMap(id=>{const x=receipts.get(id);return x?[x.polizaId,x.policyId].map(text).filter(Boolean):[];});
  if([...parents,...inherited].includes(p.id)||links.includes(t.receiptId)||[t.receiptId,t.portfolioId].includes(r.id))return true;
  if(referenceFields.some(k=>text(r[k])===t.requirement))return true;
  const orphan=![...parents,...inherited].length||[...parents,...inherited].some(id=>!policies.has(id));
  const number=['polizaNumero','numeroPoliza','policyNumber','policyNumberSource'].some(k=>[norm(c.policy),norm(t.storedNumber)].includes(norm(r[k])));
  const dated=['fechaLimite','fechaVencimientoContractual','fechaVencimiento','vence','periodoInicioFuente']
   .some(k=>[c.termStart,t.operationalDate,t.contractualDate].includes(text(r[k])));
  const gross=['primaTotal','monto','montoTotal'].some(k=>r[k]!=null&&cents(r[k])===374740);
  return orphan&&(number||dated&&gross);
 });
 if(related.length!==2||!related.some(r=>r.collection==='recibosEsperados'&&r.id===t.receiptId)||
  !related.some(r=>r.collection==='carteraPrimas'&&r.id===t.portfolioId))return bad('EXISTING_FINANCIAL_IDENTITY_NOT_UNIQUE');
 for(const r of related){
  if(r.polizaId!==p.id||text(r.policyId)&&r.policyId!==p.id||r.clienteId!==p.clienteId||
   text(r.clientId)&&r.clientId!==p.clienteId||r.aseguradoraId!==p.aseguradoraId||r.asesorId!==p.asesorId||
   r.moneda!=='GTQ'||r.collection==='carteraPrimas'&&r.reciboId!==t.receiptId||
   ['reciboId','receiptId','reciboEsperadoId'].some(k=>text(r[k])&&r[k]!==t.receiptId))
   return bad('EXISTING_FINANCIAL_RELATION_CONFLICT');
  if(cents(r.primaTotal)!==374740||['monto','montoTotal','grossAmount','amount'].some(k=>r[k]!=null&&cents(r[k])!==374740)||
   ['primaNeta','neta'].some(k=>r[k]!=null&&cents(r[k])!==278180))return bad('EXISTING_FINANCIAL_AMOUNT_CONFLICT');
  if(r.numeroReciboFuente!=='1/1'||r.serie!=='1/1'||norm(r.polizaNumero)!==norm(t.storedNumber)||
   sourceAliases.filter(k=>k!=='numeroReciboFuente').some(k=>text(r[k])&&text(r[k])!==t.requirement)||
   ['numeroPoliza','policyNumber','policyNumberSource'].some(k=>text(r[k])&&norm(r[k])!==norm(t.storedNumber))||
   text(r.fechaLimite)!==t.operationalDate||['fechaVencimientoContractual','fechaVencimiento','vence']
    .some(k=>text(r[k])&&text(r[k])!==t.contractualDate))return bad('EXISTING_FINANCIAL_SOURCE_PREIMAGE_CONFLICT');
  if(['pagado','pagada','conciliado','conciliadoPago','inferredPaid','reportedPaid','confirmado'].some(k=>text(r[k])&&r[k]!==false)||
   ['fechaPago','paidDate','fechaPagoReportada','actualPaidDate','cobroId','paymentState','applicationState','directOrInferred','reportado']
    .some(k=>text(r[k])&&r[k]!==false)||[r.estado,r.estadoCartera,r.estadoOperativo].some(v=>/pagad|paid|applied|conciliad|cancelad|anulad/i.test(text(v))))
   return bad('EXISTING_PAYMENT_OR_TERMINAL_EVIDENCE');
 }
 return {status:'ELIGIBLE_EXISTING_IDENTITY_CORRECTION',records:related};
}
function existingMutation(c,identity,financial,at){
 assert.equal(identity.status,'ELIGIBLE_EXISTING_IDENTITY_CORRECTION');assert.equal(financial.status,identity.status);
 const t=existingIdentityTarget,operation=existingOperation(c),r=c.schedule[0];
 const proof={operation,sourcePdfId:c.sourcePdfId,sourcePdfSha256:c.sourcePdfRawSha256,
  sourceRequirement:r.requirement,previousPolicyNumber:t.storedNumber,recordedAt:at};
 const policyPatch={numero:c.policy,numeroPoliza:c.policy,polizaNumero:c.policy,vehiculoId:t.vehicleId,
  documentRef:c.sourcePdfId,issuerDocumentSha256:c.sourcePdfRawSha256,issuedIdentityCorrection:proof};
 const financialPatch={polizaNumero:c.policy,numeroReciboFuente:r.requirement,
  fechaVencimientoContractual:r.due,fechaVencimiento:r.due,vence:r.due,
  sourceDocumentRef:c.sourcePdfId,issuerDocumentSha256:c.sourcePdfRawSha256,
  issuedIdentityCorrection:{...proof,previousReceiptReference:'1/1',preservedOperationalDate:t.operationalDate}};
 const updates=[['polizas',identity.policy,policyPatch],...financial.records.map(row=>[row.collection,row,
  {...financialPatch,...Object.fromEntries(['numeroPoliza','policyNumber','policyNumberSource'].filter(k=>text(row[k])).map(k=>[k,c.policy]))}])];
 return {operation,updates,counts:{updates:3,audit:1,receiptsCreated:0,portfolioCreated:0,paymentsCreated:0,
  existingReceiptsCorrected:1,preservedGrossCents:r.grossCents}};
}
module.exports={tenant,project,source,five,witness,policies,cases,check,resolve,resolveIssued,operationFor,mutation,match,sha,originals,
 existingIdentityTarget,existingOperation,resolveExisting,existingFinancial,existingMutation,stableHash};
