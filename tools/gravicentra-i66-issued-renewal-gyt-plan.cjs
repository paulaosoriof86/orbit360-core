'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const source = require('../artifacts/orbit360-recovery/source-batches/I6_6_MULTICARRIER_ISSUED_IDENTITY_20261122.json');
const statement = require('../artifacts/orbit360-recovery/source-batches/I6_6_SOURCE_BULK_20261120_MULTI_302.json');
const term = source.documents.find(d => d.insurer === 'G&T' && d.policy === '519815' && d.issuedSchedule);
const sha = v => crypto.createHash('sha256').update(v).digest('hex');
const normalize = v => String(v || '').normalize('NFD').toUpperCase().replace(/[^A-Z0-9]/g,'');
const matches = (v,w) => Boolean(v) && sha(term.pdfSha256+'|'+normalize(v)) === w;
const operation = 'gi_i66_gyt_'+sha(['alianzas-soluciones','GT','GYT',term.policy,term.termStart,term.termEnd].join('|')).slice(0,24);
function check(){
  assert.equal(term.pdfSha256,'3c64e84f1893313bf30fa64dbb2c3f1960637678089f8bfbdd5e878a7606faa9');
  assert.equal(term.issuedSchedule.length,10);
  assert.equal(new Set(term.issuedSchedule.map(x=>x.number)).size,10);
  assert.equal(term.issuedSchedule.reduce((s,r)=>s+r.grossCents,0),664737);
  for(const [i,r] of term.issuedSchedule.entries()){
    assert.ok(r.due>=term.termStart && r.due<term.termEnd && (!i || r.due>term.issuedSchedule[i-1].due));
    assert.equal(r.grossCents,r.netCents+r.expenseCents+r.financingCents+r.vatCents);
    const lines=statement.rows.filter(x=>x.insurer===term.insurer && x.policy===term.policy && x.requirement===r.number);
    if(i<2){assert.equal(lines.length,1);assert.equal(lines[0].due,r.due);
      assert.equal(lines[0].grossCents,r.grossCents);assert.equal(lines[0].state,'PENDING');}
    else {assert.equal(lines.length,0);assert.ok(r.due>'2026-11-22');}
  }
  assert.deepEqual(term.sameRiskAsPriorIssuedDocument,{Placa:true,Chasis:true,Motor:true});
}
function matchRisk(v){
  const plates=[v.placa,v.placaFuente].filter(Boolean);
  if(!plates.length||!plates.every(p=>matches(p,term.plateWitness)||
    (normalize(p).length===6&&matches(p,term.plateWithoutClassWitness))))return false;
  if(![v.vin,v.chasis,v.chasisFuente].filter(Boolean).every(x=>
    matches(normalize(x).slice(-term.issuerChassisLength),term.chassisWitness)))return false;
  if(![v.motor,v.numeroMotor,v.motorFuente].filter(Boolean).every(x=>matches(x,term.engineWitness)))return false;
  return true;
}
function mutation(prior,risk,at){
  check();assert.ok(matchRisk(risk),'ISSUED_RISK_IDENTITY_CONFLICT');
  const p='pol_'+operation,v='veh_'+operation,atDay=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Guatemala',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at)),value=c=>c/100;
  const c={tenantId:'alianzas-soluciones',pais:'GT',moneda:'GTQ',clienteId:prior.clienteId,
    asesorId:prior.asesorId,aseguradoraId:prior.aseguradoraId,operationId:operation,
    issuerDocumentSha256:term.pdfSha256,sourceDocumentRef:term.driveFileId,documentRef:term.driveFileId,
    fuente:'Renovación emitida G&T y anexo de pagos fraccionados',createdAt:at,updatedAt:at,creado:at,actualizado:at};
  const doc={fileId:term.driveFileId,documentRef:term.driveFileId,
    driveUrl:'https://drive.google.com/open?id='+term.driveFileId,nombre:'Renovación G&T AUTO-519815 y anexo de pagos',
    sha256:term.pdfSha256,clienteId:c.clienteId,polizaId:p};
  const h=term.premiumBreakdown;
  const policy={...c,id:p,numero:'AUTO-'+term.policy,estado:'Vigente',renuevaDe:prior.id,sourcePolicyId:prior.id,
    policyKey:[c.tenantId,c.pais,c.aseguradoraId,'AUTO-'+term.policy,c.clienteId].join('|'),
    policyVersionKey:[c.tenantId,c.pais,c.aseguradoraId,term.policy,c.clienteId,term.termStart,term.certificate].join('|'),
    ramo:prior.ramo||'Vehículos',subramo:prior.subramo||'',producto:prior.producto||'',divisa:'GTQ',
    vigenciaInicio:term.termStart,vigenciaFin:term.termEnd,fechaEmision:term.issueDate,certificado:term.certificate,
    frecuencia:'Mensual',cuotas:10,primaNeta:value(h.netCents),gastosEmision:value(h.expenseCents),
    gastosFinan:value(h.financingCents),iva:value(h.vatCents),ivaMonto:value(h.vatCents),
    prima:value(term.contractualGrossCents),primaTotal:value(term.contractualGrossCents),
    primaTotalDocumentalOriginal:value(term.contractualGrossCents),primaCalendarioEmitido:value(term.contractualGrossCents),
    limiteResponsabilidadCivil:value(term.liabilityLimitCents),danosPropiosIncluidos:false,roboTotalIncluido:false,
    observaciones:'Certificado 1. Responsabilidad civil Q750,000. Daños propios y robo total excluidos. Coberturas, límites y deducibles adicionales en la carátula adjunta.',
    documentos:[doc],adjuntos:[doc],vehiculoId:v,
    historial:[{fecha:atDay,t:'Renovación emitida registrada',d:'G&T · Certificado 1',operationId:operation}]};
  const created=[['polizas',policy]];
  for (const [i,r] of term.issuedSchedule.entries()){
    const canonicalNumber=String(i+1).padStart(2,'0'), id='cob_'+p+'_'+canonicalNumber;
    const st=statement.rows.find(x=>x.insurer===term.insurer&&x.policy===term.policy&&x.requirement===r.number);
    const receipt={...c,id,polizaId:p,reciboKey:[c.tenantId,p,i+1].join('|'),secuencia:i+1,numeroCuota:i+1,
      cuota:(i+1)+'/10',numeroReciboFuente:r.number,fechaVencimientoContractual:r.due,vence:r.due,fechaVencimiento:r.due,
      primaNeta:value(r.netCents),neta:value(r.netCents),gastosEmision:value(r.expenseCents),gastosFinan:value(r.financingCents),
      iva:value(r.vatCents),ivaMonto:value(r.vatCents),primaTotal:value(r.grossCents),monto:value(r.grossCents),montoTotal:value(r.grossCents),
      estado:r.due<atDay?'Vencido':'Pendiente',carteraActiva:true,conciliado:false,fechaPago:null,
      origenSaldo:st?'ESTADO_ASEGURADORA_PENDIENTE':'CALENDARIO_EMITIDO_FUTURO',
      ...(st?{sourceRowNumber:st.sourceRowNumber,statementSha256:st.sourceSha256,statementCaseId:st.caseId}:{})};
    created.push(['recibosEsperados',receipt],['carteraPrimas',{...receipt,id:'car_'+id,reciboId:id,
      estadoOperativo:r.due<atDay?'pendiente_vencido':'futuro_pendiente',exigibilidad:r.due<atDay?'exigible':'futura',
      carteraTipo:'cartera_activa',estadoConciliacionSaldo:'pendiente_conciliacion',saldoConciliado:false}]);
  }
  const rawPlate=normalize(risk.placa||risk.placaFuente);
  const fullPlate=rawPlate.length===6?term.vehicleDescription.classLetter+rawPlate:rawPlate;
  assert.ok(matches(fullPlate,term.plateWitness),'ISSUED_PLATE_NORMALIZATION_DRIFT');
  const {marca,linea,anio,tipo}=term.vehicleDescription;
  const vehicle={...c,id:v,polizaId:p,placa:fullPlate,placaFuente:fullPlate,marca,linea,anio,tipo,inciso:term.certificate,
    estado:'Vigente',sourcePolicyId:prior.id,sourceVehicleId:risk.id,versionOfVehicleId:risk.id};
  for(const key of ['motor','chasis','vin'])if(risk[key])vehicle[key]=risk[key];
  created.push(['vehiculos',vehicle],['actividades',{...c,id:'act_'+operation,polizaId:p,sourcePolicyId:prior.id,
    tipo:'renovacion',actor:'Proceso documental protegido I6.6',resultado:'Sucesora y requerimientos registrados',fecha:atDay,titulo:'Renovación emitida registrada',detalle:'G&T · 10 requerimientos emitidos',origen:'Documento original G&T'}]);
  return {created,previous:{renovadaPor:p,renovacionEstado:'Renovada',renovacionFechaEfectiva:term.termStart,
    historial:[...(prior.historial||[]),{fecha:atDay,t:'Renovación registrada',d:'Póliza sucesora '+p,operationId:operation}],actualizado:at}};
}
module.exports={term,operation,sha,normalize,matches,matchRisk,check,mutation};
