'use strict';
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {createHash}=require('node:crypto');
const {readOriginal}=require('./gravicentra-i66-issued-original-access.cjs');
const base='../artifacts/orbit360-recovery/source-batches/';
const originals=require(base+'I6_6_ROBLE_THREE_ISSUED_TERMS_DOCUMENTARY_CROSSCHECK_20261122.json').issuedExamples;
const proofs=require(base+'I6_6_ROBLE_ISSUED_TERM_WITNESSES_20261122.json');
const batch=require(base+'I6_6_SOURCE_BULK_20261120_MULTI_302.json');
const codeIndex={D01:0,D03:2};
const sha=v=>createHash('sha256').update(v).digest('hex');
const norm=v=>String(v||'').normalize('NFD').toUpperCase().replace(/[^A-Z0-9]/g,'');
const statementHash='7062738cdf1c008ebff85247f8b0723ab4d8f36e43bb69d386d5dfcb59d219ef';
function scope(code){
  assert.ok(Object.hasOwn(codeIndex,code));const idx=codeIndex[code],term=originals[idx],w=proofs[idx];
  const rows=batch.rows.filter(r=>r.policy===term.policy).sort((a,b)=>a.requirement.localeCompare(b.requirement));
  assert.ok(rows.every(r=>r.insurer==='ROBLE'&&r.state==='PENDING'&&r.sourceSha256===statementHash));
  assert.equal(rows.length,code==='D01'?10:11);assert.equal(new Set(rows.map(r=>r.requirement)).size,rows.length);
  if(code==='D01')assert.deepEqual(rows.map(r=>[r.requirement,r.due,r.grossCents]),w.schedule.slice(2).map(r=>[r.requirement,r.due,r.cents[4]]));
  else{
    assert.equal(rows.reduce((a,r)=>a+r.grossCents,0),563508);
    assert.ok(rows.every((r,i)=>r.requirement===String(5773297+i)&&r.grossCents===51228&&r.due>=term.vigenciaInicio&&r.due<term.vigenciaFin));
  }
  return {code,idx,term,w,rows,op:'gi_i66_'+code.toLowerCase()+'_'+sha([term.policy,term.vigenciaInicio,term.endoso].join('|')).slice(0,24)};
}
const matches=(s,input,key)=>!!input&&sha(s.w.pdfSha256+'|'+norm(input))===s.w[key];
async function originalRisk(s,headers){
  let doc=s.term,original=await readOriginal(doc,s.idx,headers);
  if(!original.data&&s.idx===0 && doc.otherSameTitleCopyId){
    doc={...s.term,issuerDocumentId:doc.otherSameTitleCopyId};
    original=await readOriginal(doc,s.idx,headers);
  }
  if(!original.data)return {status:original.status};
  const text=execFileSync('pdftotext',['-layout','-','-'],{input:original.data,encoding:'utf8',maxBuffer:3500000});
  const take=(pattern,group=1)=>{const m=text.match(pattern);assert.ok(m,'ISSUED_PDF_REQUIRED_FIELD');return m[group].trim();};
  const plate=take(/Placa\s*:\s*(\S+)/i),vin=take(/Chasis\s*:\s*(\S+)/i);
  const holder=take(/EMITIDA A FAVOR DE:\s*([^\n]+)/i);
  assert.ok(matches(s,plate,'plateWitness')&&matches(s,vin,'vinWitness')&&matches(s,holder,'holderWitness'),'ISSUED_DIGEST_FIELDS_DIVERGED');
  const certificate=take(/INCISO\s+(\d+)\s+ENDOSO No\./);
  const endorsement=take(/INCISO\s+\d+\s+ENDOSO No\.\s*(\d+)/);
  assert.equal(endorsement,s.term.endoso);
  const sum=Number(take(/INCISO\s+\d+\s+ENDOSO No\.[^\n]+SUMA ASEGURADA\s*\n\s*:Q\.\s*([\d,.]+)/).replaceAll(',',''));
  assert.ok(sum>0);
  const label=take(/MARCA\.+\s*(.+?)\s{2,}DEDUCIBLE/),parts=label.split(/\s+/);
  const risk={placa:plate.replace(/[–—]/g,'-'),vin,chasis:vin,marca:parts.shift(),linea:parts.join(' '),
    tipo:take(/TIPO\.+\s*(.+?)\s+CHASSIS/),anio:Number(take(/MODELO\.+\s*(\d{4})/)),motor:take(/MOTOR\.+\s*(.+?)\s{2,}PRIMA PERIODO/),
    propietario:take(/PROPIETARIO:\s*([^\n]+)/),inciso:certificate,sumaAsegurada:sum};
  return {status:'VERIFIED',risk,sourceId:doc.issuerDocumentId};
}
function plan(s,relations,original,iso){
  assert.equal(original.status,'VERIFIED');
  const {client,advisor,insurer,prior}=relations,{term,op}=s,day=iso.slice(0,10),id='pol_'+op,vid='veh_'+op;
  const ref='https://drive.google.com/open?id='+original.sourceId,statementRef='https://drive.google.com/open?id='+batch.documents[0].googleDriveFileId;
  const common={tenantId:'alianzas-soluciones',pais:'GT',moneda:'GTQ',clienteId:client.id,asesorId:advisor.id,aseguradoraId:insurer.id,operationId:op};
  const facts={decision:s.code,authorizationCommit:'55edd15501efaa1b50b15613cac225faa85fb056',issuerSha256:s.w.pdfSha256,
    issuerDocumentRef:ref,statementSha256:statementHash,statementAsOf:'2026-11-20',statementRef,actor:'Proceso documental autorizado por Dirección'};
  const doc={fileId:original.sourceId,documentRef:original.sourceId,driveUrl:ref,externalUrl:ref,sha256:s.w.pdfSha256,
    nombre:'Póliza y endoso emitidos',polizaId:id,clienteId:client.id};
  const key=[common.tenantId,'GT',insurer.id,term.policy,client.id].join('|');
  const policy={...common,id,numero:term.policy,ramo:prior?.ramo||'VEHICULOS',subramo:prior?.subramo||'Auto Individual',
    estado:'Vigente',divisa:'GTQ',policyKey:key,policyVersionKey:[key,term.vigenciaInicio,term.vigenciaFin].join('|'),
    vigenciaInicio:term.vigenciaInicio,vigenciaFin:term.vigenciaFin,endoso:term.endoso,fechaEmision:s.code==='D01'?'2026-09-28':'2026-09-09',
    primaNeta:s.code==='D01'?2665.15:4274.11,gastosEmision:s.code==='D01'?133.26:213.71,gastosFinan:s.code==='D01'?359:0,otros:425,
    iva:s.code==='D01'?429.89:589.54,prima:term.issuerCoverGrossCents/100,primaTotal:term.issuerCoverGrossCents/100,
    frecuencia:s.code==='D01'?'Mensual':'Contado',cuotas:s.w.schedule.length,sumaAsegurada:original.risk.sumaAsegurada,vehiculoId:vid,
    vencimientosDocumentados:s.w.schedule.map((r,i)=>({secuencia:i+1,fechaVencimiento:r.due,documentRef:ref})),
    cronogramaOriginalAseguradora:s.w.schedule,pendientesEstadoCuenta:s.rows.map(r=>({numero:r.requirement,fecha:r.due,centavos:r.grossCents})),
    diferenciaDocumentalCentavos:s.code==='D01'?5:13272,sourceRef:ref,documentRef:original.sourceId,documentos:[doc],adjuntos:[doc],
    documentaryEvidence:facts,fuente:'Documento emitido por El Roble',creado:iso,actualizado:iso,
    historial:[{icon:'📑',fecha:day,t:'Emisión documentada registrada',d:'Endoso '+term.endoso,operationId:op}]};
  if(prior)policy.renuevaDe=prior.id;
  const creates=[['polizas',policy],['vehiculos',{...common,...original.risk,id:vid,polizaId:id,fuente:policy.fuente,documentRef:ref,estado:'Vigente',creado:iso,actualizado:iso}]];
  const obligations=s.code==='D01'?s.w.schedule.map(r=>({req:r.requirement,due:r.due,total:r.cents[4],parts:r.cents})):
    s.rows.map(r=>({req:r.requirement,due:r.due,total:r.grossCents}));
  let pending=0,inferred=0;
  obligations.forEach((r,i)=>{
    const inferredPaid=s.code==='D01'&&i<2,seq=i+1,rid='cob_'+id+'_'+String(seq).padStart(3,'0'),base={...common,
      id:rid,polizaId:id,receiptKey:[common.tenantId,id,seq].join('|'),secuencia:seq,numeroCuota:seq,cuota:seq+'/'+obligations.length,
      numeroReciboFuente:r.req,vence:r.due,fechaVencimientoContractual:r.due,fechaLimite:r.due,
      vencimientoDocumentRef:s.code==='D03'?statementRef:ref,primaTotal:r.total/100,monto:r.total/100,montoTotal:r.total/100,
      conciliado:false,carteraActiva:!inferredPaid,fuente:'Estado de cuenta de aseguradora',documentaryEvidence:facts,creado:iso,actualizado:iso};
    if(s.code==='D03'){base.cuota='';delete base.numeroCuota;base.posicionEstadoCuenta=seq;base.numeroCuotaFuente='NO_INFORMADO';base.cantidadPendientesEstadoCuenta=obligations.length;}
    if(r.parts)Object.assign(base,{primaNeta:r.parts[0]/100,neta:r.parts[0]/100,gastosEmisionYOtrosDocumentados:r.parts[1]/100,gastosFinan:r.parts[2]/100,iva:r.parts[3]/100});
    if(inferredPaid){inferred+=r.total;Object.assign(base,{estado:'Pago inferido',estadoOperativo:'pago_inferido',paymentState:'PAID_INFERRED',
      inferredPaid:true,paymentDateOrigin:'INFERRED',fechaPagoInferida:true,fechaPago:r.due,periodoInferido:r.due.slice(0,7),anchorSequence:3,
      confidence:'INFERENCIA_SECUENCIAL_DOCUMENTADA',inferenceRule:'V7_PENDIENTES_DESDE_CUOTA_3',inferenceSourceAsOf:'2026-11-20',evidenceRef:statementRef,actor:facts.actor});}
    else{pending+=r.total;Object.assign(base,{estado:r.due<day?'Vencido':'Pendiente',fechaPago:null});}
    creates.push(['recibosEsperados',base]);
    if(inferredPaid)creates.push(['cobros',{...base,id:'pago_inf_'+rid,reciboId:rid,policyId:id,receiptId:rid,
      estado:'Inferido',estadoConfirmacion:'inferido',confirmado:false,fechaConciliacion:null,fechaAplicacionAseguradora:null,
      metodo:null,movimientoBancario:false,tipo:'pago_inferido'}]);
    if(!inferredPaid){creates.push(['carteraPrimas',{...base,id:'car_'+rid,reciboId:rid,fechaVencimiento:r.due,carteraTipo:'cartera_activa',
      historicalExigible:false,estadoOperativo:r.due<day?'pendiente_vencido':'futuro_pendiente',
      exigibilidad:r.due<day?'exigible':'futura',saldoConciliado:false,estadoConciliacionSaldo:'pendiente_conciliacion'}]);}
  });
  assert.equal(pending,s.code==='D01'?334370:563508);assert.equal(inferred,s.code==='D01'?66855:0);
  creates.push(['actividades',{...common,id:'act_'+op,polizaId:id,tipo:prior?'renovacion':'poliza',icon:'📑',fecha:day,
    titulo:prior?'Renovación emitida registrada':'Póliza emitida registrada',detalle:'Endoso '+term.endoso+' · estado de cuenta documentado',documentRef:ref,actor:facts.actor,origen:'Fuente de aseguradora',creado:iso}]);
  const patch=prior?{renovadaPor:id,renovacionEstado:'Renovada',renovacionFechaEfectiva:term.vigenciaInicio,
    historial:[...(prior.historial||[]),{icon:'🔄',fecha:day,t:'Renovación registrada',d:'Póliza sucesora '+id,operationId:op}],actualizado:iso}:null;
  return {creates,patch,pending,inferred,facts};
}
module.exports={scope,matches,originalRisk,plan,sha,norm};
