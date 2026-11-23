'use strict';
// I6.6 two-policy protected source-to-receipt plan, NOT an independent importer.
// This pure module grants no writes. Only the existing reviewed GitHub environment can apply it.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const source=require('../artifacts/orbit360-recovery/source-batches/I6_6_ROBLE_TWO_ISSUED_24_REQUIREMENTS_FINANCIAL_BREAKDOWN_20261122.json');
const five=require('../artifacts/orbit360-recovery/source-batches/I6_6_ROBLE_FIVE_ISSUED_49_REQUIREMENTS_20261122.json');
const witness=require('../artifacts/orbit360-recovery/source-batches/I6_6_ROBLE_FIVE_ISSUED_IDENTITY_WITNESSES_20261122.json');
const sha=v=>crypto.createHash('sha256').update(String(v)).digest('hex');
const norm=v=>String(v==null?'':v).normalize('NFD').toUpperCase().replace(/[^A-Z0-9]/g,'');
const cents=n=>Math.round(Number(n)*100);
const tenant='alianzas-soluciones',project='ays-orbit-360-lab';
const policies=new Set(['91-8324489','91-8343059']);
const OWNER_PATH='artifacts/orbit360-recovery/release-control/I6_6_DIRECCION_DECISIONES_FINANCIERAS_Y_PLAN_INTEGRAL_20261122.md';
const authority=fs.readFileSync(OWNER_PATH);
const gitBlob=crypto.createHash('sha1').update('blob '+authority.length+'\0').update(authority).digest('hex');
function check(){
 assert.equal(gitBlob,'53b08239aa8807378ec95a4b4704c5d97622bc84','DIRECTION_AUTHORITY_DRIFT');
 assert.equal(source.schema,'GI_I66_ROBLE_TWO_ISSUED_24_REQUIREMENTS_BREAKDOWN_V1');
 assert.equal(source.cases.length,2);assert.equal(source.totals.installments,24);
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
function resolve(c,arrays,matcher=match){
 check();
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
 const operation='gi_i66_roble_two_'+sha(basis).slice(0,24),pid='pol_'+operation,vid='veh_'+operation;
 const canonical={tenantId:tenant,pais:'GT',moneda:'GTQ',clienteId:holder.id,asesorId:prior.asesorId,aseguradoraId:insurer.id,operationId:operation};
 const fiveCase=five.cases.find(x=>x.policy===c.policy),w=witness.witnesses.find(x=>x.policy===c.policy);
 const url='https://drive.google.com/open?id='+fiveCase.sourcePdfId;
 const doc={fileId:fiveCase.sourcePdfId,documentRef:fiveCase.sourcePdfId,driveUrl:url,externalUrl:url,
   nombre:'Renovación emitida '+c.endorsement,sha256:w.sourcePdfRawSha256,clienteId:holder.id,polizaId:pid};
 const asMoney=x=>Number((x/100).toFixed(2));
 const today=at.slice(0,10);
 const common={...canonical,createdAt:at,updatedAt:at,creado:at,actualizado:at,fuente:'Documento emitido por El Roble + estado de cuenta 20/11/2026',source:'El Roble original emitido + estado de cuenta 20/11/2026',
   sourceDocumentRef:fiveCase.sourcePdfId,issuerDocumentSha256:w.sourcePdfRawSha256};
 const hdr=c.issuerHeader;
 const policy={...common,id:pid,numero:c.policy,estado:c.termStart<=today?'Vigente':'Emitida',
   policyKey:[tenant,'GT',insurer.id,c.policy,holder.id].join('|'),policyVersionKey:basis,ramo:prior.ramo||'Vehículos',subramo:prior.subramo||'',producto:prior.producto||'',divisa:'GTQ',
   vigenciaInicio:c.termStart,vigenciaFin:c.termEnd,fechaEmision:'2026-10-13',renuevaDe:prior.id,
   frecuencia:'Mensual',cuotas:12,endoso:c.endorsement,primaNeta:asMoney(hdr.netCents),
   gastosEmision:asMoney(hdr.expensesCents),otros:asMoney(hdr.assistCents),gastosFinan:asMoney(hdr.financeCents),
   iva:asMoney(hdr.ivaCents),ivaMonto:asMoney(hdr.ivaCents),prima:asMoney(hdr.grossCents),primaTotal:asMoney(hdr.grossCents),
   primaTotalDocumentalOriginal:asMoney(hdr.grossCents),primaCalendarioEmitido:asMoney(c.issuedScheduleGrossCents),
   diferenciaDocumentalCentavos:c.coverScheduleDeltaCents,
   sumaAsegurada:asMoney(c.issuedInsuredValueCents),documentRef:fiveCase.sourcePdfId,documentos:[doc],adjuntos:[doc],
   vehiculoId:vid,sourcePolicyId:prior.id,
   historial:[{fecha:today,icon:'🔄',t:'Renovación emitida registrada',d:'Endoso '+c.endorsement,operationId:operation}]};
 const creates=[['polizas',policy]];
 for(const r of c.schedule){
  const rid='cob_'+pid+'_'+String(r.sequence).padStart(2,'0');
  const due=r.due;
  const record={...common,id:rid,polizaId:pid,reciboKey:[tenant,pid,r.sequence].join('|'),
   secuencia:r.sequence,numeroCuota:r.sequence,cuota:r.sequence+'/12',
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
 const nextVehicle={...Object.fromEntries(['placa','placaFuente','vin','chasis','chasisFuente','marca','linea','anio','motor','uso','tipo','inciso'].filter(k=>vehicle[k]!=null).map(k=>[k,vehicle[k]])),
   ...common,id:vid,polizaId:pid,estado:'Vigente',sumaAsegurada:asMoney(c.issuedInsuredValueCents),sourcePolicyId:prior.id,sourceVehicleId:vehicle.id,
   versionOfVehicleId:vehicle.id,documentRef:fiveCase.sourcePdfId,creado:at};
 const activity={...common,id:'act_'+operation,polizaId:pid,sourcePolicyId:prior.id,
   fecha:today,tipo:'renovacion',icon:'🔄',titulo:'Renovación emitida registrada',
   detalle:'Endoso '+c.endorsement+' · 12 obligaciones emitidas',origen:'Documento original El Roble',documentRef:fiveCase.sourcePdfId};
 creates.push(['vehiculos',nextVehicle],['actividades',activity]);
 const prevPatch={renovadaPor:pid,renovacionEstado:'Renovada',renovacionFechaEfectiva:c.termStart,
   historial:[...(prior.historial||[]),{icon:'🔄',fecha:today,t:'Renovación registrada',d:'Póliza sucesora '+pid,operationId:operation}],
   actualizado:at};
 assert.equal(creates.length,27);
 assert.equal(creates.filter(x=>x[0]==='recibosEsperados').length,12);
 assert.equal(creates.filter(x=>x[0]==='carteraPrimas').length,12);
 assert.equal(creates.filter(x=>x[0]==='cobros').length,0);
 assert.equal(creates.filter(x=>x[0]==='carteraPrimas').reduce((n,x)=>n+cents(x[1].primaTotal),0),c.issuedScheduleGrossCents);
 return{operation,policyId:pid,creates,previous:prevPatch,priorId:prior.id,
   evidence:{issuedTerm:c.termStart+'..'+c.termEnd,pdfSha256:w.sourcePdfRawSha256,
    sourceCalendarGrossCents:c.issuedScheduleGrossCents,originalGrossCents:hdr.grossCents,documentedMinorDeltaCents:c.coverScheduleDeltaCents},
   counts:{creates:27,updates:1,audit:1,receipts:12,portfolio:12,directPayments:0}};
}
module.exports={tenant,project,source,five,witness,policies,check,resolve,mutation,match,sha};
