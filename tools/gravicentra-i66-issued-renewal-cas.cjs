'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname,'../artifacts/orbit360-recovery');
const source = name => fs.readFileSync(path.join(root,name));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const str = value => String(value ?? '').trim();
const norm = value => str(value).normalize('NFD').toUpperCase().replace(/[^A-Z0-9]/g,'');
const pick = (row,fields) => Object.fromEntries(fields.filter(f=>row[f]!=null).map(f=>[f,row[f]]));
const tenantId='alianzas-soluciones';
const projectId='ays-orbit-360-lab';
const dir='source-batches/';
const batch=JSON.parse(source(dir+'I6_6_SOURCE_BULK_20261120_MULTI_302.json'));
const term=JSON.parse(source(dir+'I6_6_ROBLE_THREE_ISSUED_TERMS_DOCUMENTARY_CROSSCHECK_20261122.json')).issuedExamples[1];
const witness=JSON.parse(source(dir+'I6_6_ROBLE_ISSUED_TERM_WITNESSES_20261122.json'))[1];
const statement=batch.rows.filter(r=>r.policy===term.policy);
const authorityBytes=source('release-control/I6_6_DIRECCION_DECISIONES_FINANCIERAS_Y_PLAN_INTEGRAL_20261122.md');
const authorityBlob=crypto.createHash('sha1').update('blob '+authorityBytes.length+'\0').update(authorityBytes).digest('hex');
function checkSources() {
  assert.equal(authorityBlob,'53b08239aa8807378ec95a4b4704c5d97622bc84');
  assert.equal(term.operation,'RENOVACION');assert.equal(witness.decision,'D02');
  assert.equal(statement.length,1);const s=statement[0],r=witness.schedule[0];
  assert.equal(s.state,'PENDING');assert.equal(s.requirement,term.issuedRequirement);
  assert.equal(s.due,term.issuedDue);assert.equal(s.grossCents,term.issuerScheduleGrossCents);
  assert.deepEqual([r.requirement,r.due,r.cents[4]],[s.requirement,s.due,s.grossCents]);
  assert.deepEqual(r.cents,[220000,53500,0,32820,306320]);assert.equal(witness.schedule.length,1);
  assert.equal(witness.pdfSha256,'a93e35667108acd8965430fd76dcd7d2f9e05316810672fe28ade4d227c49733');
  assert.equal(s.sourceSha256,'7062738cdf1c008ebff85247f8b0723ab4d8f36e43bb69d386d5dfcb59d219ef');
}
const match = (value,field) => !!value && sha(witness.pdfSha256+'|'+norm(value))===witness[field];
function assess(input,matchIdentity=match) {
  const {holders,insurers,policies,risk,advisors,requirementAlreadyUsed,occupied,priorObligations}=input;
  if(holders.length!==1||insurers.length!==1)return 'HOLDER_OR_INSURER_NOT_UNIQUE';
  if(policies.some(p=>p.vigenciaInicio===term.vigenciaInicio || p.vigenciaFin===term.vigenciaFin))return 'ISSUED_EDITION_ALREADY_PRESENT';
  const prior=policies.filter(p=>p.clienteId===holders[0].id && p.aseguradoraId===insurers[0].id && p.vigenciaFin===term.vigenciaInicio);
  if(prior.length!==1)return 'PREDECESSOR_NOT_UNIQUE';
  if(policies.some(p=>p.id!==prior[0].id && (!p.vigenciaFin||p.vigenciaFin>term.vigenciaInicio)))return 'COMPETING_POLICY_EDITION';
  if(prior[0].renovadaPor || /cancelad|anulad/i.test(str(prior[0].estado)))return 'PREDECESSOR_HAS_DIFFERENT_LIFECYCLE';
  if(!advisors.some(a=>a.id===prior[0].asesorId && a.activo!==false))return 'ADVISOR_NOT_CURRENT';
  if(risk.length!==1)return 'PREDECESSOR_RISK_NOT_UNIQUE';
  const vehicle=risk[0],plates=[vehicle.placa,vehicle.placaFuente].filter(Boolean);
  const vins=[vehicle.chasis,vehicle.vin,vehicle.chasisFuente].filter(Boolean);
  if((!plates.length&&!vins.length)||plates.some(p=>!matchIdentity(p,'plateWitness'))||
    vins.some(v=>!matchIdentity(v,'vinWitness'))||vehicle.clienteId!==holders[0].id)
    return 'RISK_CONTRADICTS_ISSUER_OR_HOLDER';
  if(priorObligations)return 'PREDECESSOR_HAS_LINKED_SUCCESSOR';
  if(requirementAlreadyUsed || occupied)return 'DUPLICATE_OR_ORPHAN_REFERENCE';
  return 'ELIGIBLE';
}
const operation='gi_i66_d02_'+sha([tenantId,term.policy,term.vigenciaInicio,term.endoso].join('|')).slice(0,24);
function mutations(old,holder,insurer,vehicle,iso) {
  const day=iso.slice(0,10), id='pol_'+operation, rid='cob_'+id+'_001', vid='veh_'+operation;
  const common={tenantId,pais:'GT',moneda:'GTQ',clienteId:holder.id,aseguradoraId:insurer.id,asesorId:old.asesorId,operationId:operation};
  const ref='https://drive.google.com/open?id='+term.issuerDocumentId;
  const document={fileId:term.issuerDocumentId,documentRef:term.issuerDocumentId,externalUrl:ref,driveUrl:ref,nombre:'Endoso de renovación emitido',sha256:witness.pdfSha256,polizaId:id,clienteId:holder.id};
  const evidence={authorizationGitBlob:authorityBlob,decision:'D02',issuerPdfSha256:witness.pdfSha256,
    requirementSourceSha256:statement[0].sourceSha256,statementAsOf:'2026-11-20',sourceRowNumber:statement[0].sourceRowNumber};
  const key=[tenantId,'GT',insurer.id,term.policy,holder.id].join('|');
  const policy={...common,...pick(old,['ramo','subramo','producto']),id,numero:term.policy,estado:'Vigente',divisa:'GTQ',
    policyKey:key,policyVersionKey:[key,term.vigenciaInicio,term.vigenciaFin].join('|'),
    vigenciaInicio:term.vigenciaInicio,vigenciaFin:term.vigenciaFin,fechaEmision:'2026-09-18',renuevaDe:old.id,
    endoso:term.endoso,frecuencia:'Contado',cuotas:1,primaNeta:2200,gastosEmision:110,otros:425,gastosFinan:0,
    iva:328.20,primaTotal:3063.20,prima:3063.20,sumaAsegurada:48431.95,
    vencimientosDocumentados:[{secuencia:1,fechaVencimiento:term.issuedDue,documentRef:ref}],vencimientoDocumentRef:ref,sourceRef:ref,documentos:[document],adjuntos:[document],documentRef:term.issuerDocumentId,vehiculoId:vid,
    fuente:'Endoso de renovación emitido por la aseguradora',documentaryEvidence:evidence,creado:iso,actualizado:iso,
    historial:[{fecha:day,icon:'🔄',t:'Renovación emitida registrada',d:'Endoso '+term.endoso,operationId:operation}]};
  const receipt={...common,id:rid,polizaId:id,receiptKey:[tenantId,id,1].join('|'),secuencia:1,numeroCuota:1,cuota:'1/1',
    numeroReciboFuente:term.issuedRequirement,primaNeta:2200,neta:2200,gastosEmision:110,otros:425,gastosFinan:0,
    iva:328.20,impuestosIVA:328.20,monto:3063.20,montoTotal:3063.20,primaTotal:3063.20,
    vence:term.issuedDue,fechaVencimientoContractual:term.issuedDue,fechaLimite:term.issuedDue,vencimientoDocumentRef:ref,
    estado:day>term.issuedDue?'Vencido':'Pendiente',carteraActiva:true,conciliado:false,fechaPago:null,
    fuente:policy.fuente,documentaryEvidence:evidence,creado:iso,actualizado:iso};
  const portfolio={...receipt,id:'car_'+rid,reciboId:rid,fechaVencimiento:term.issuedDue,
    estadoOperativo:day>term.issuedDue?'pendiente_vencido':'futuro_pendiente',exigibilidad:day>term.issuedDue?'exigible':'futura',
    carteraTipo:'cartera_activa',historicalExigible:false,saldoConciliado:false,estadoConciliacionSaldo:'pendiente_conciliacion'};
  const nextVehicle={...pick(vehicle,['placa','placaFuente','vin','chasis','chasisFuente','marca','linea','anio','color','motor','uso','tipo','inciso','propietario']),
    ...common,id:vid,polizaId:id,estado:'Vigente',fuente:policy.fuente,actualizado:iso,sourcePolicyId:old.id,sourceVehicleId:vehicle.id,sumaAsegurada:policy.sumaAsegurada,documentRef:ref,creado:iso};
  const activity={...common,id:'act_'+operation,polizaId:id,sourcePolicyId:old.id,tipo:'renovacion',icon:'🔄',fecha:day,
    titulo:'Renovación emitida registrada',detalle:'Endoso '+term.endoso+' · obligación pendiente',origen:'Fuente documental de aseguradora',actor:'Proceso documental autorizado por Dirección',documentRef:ref,creado:iso};
  const previous={renovadaPor:id,renovacionEstado:'Renovada',renovacionFechaEfectiva:term.vigenciaInicio,
    historial:[...(old.historial||[]),{icon:'🔄',fecha:day,t:'Renovación registrada',d:'Póliza sucesora '+id,operationId:operation}],actualizado:iso};
  return {creates:[['polizas',policy],['recibosEsperados',receipt],['carteraPrimas',portfolio],['vehiculos',nextVehicle],['actividades',activity]],previous,evidence};
}
module.exports={checkSources,assess,mutations,match,tenantId,projectId,operation,term,sha};
