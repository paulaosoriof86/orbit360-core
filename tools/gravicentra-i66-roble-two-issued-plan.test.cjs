'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('./gravicentra-i66-roble-two-issued-plan.cjs');
const stamped='2026-11-22T22:00:00.000Z';
const matcher=(w,v,k)=>{
 const row=C.five.cases.find(c=>c.sourcePdfRawSha256===w.sourcePdfRawSha256);
 if(!row)return false;
 if(k==='holderWitness')return v==='holder-'+row.policy;
 if(k==='initialCertificatePlateWitness')return v==='plate-'+row.policy;
 if(k==='initialCertificateVinWitness')return v==='vin-'+row.policy;
 return false;
};
const fixtures=()=>({
 clientes:C.source.cases.map(c=>({id:'cli-'+c.policy,nombre:'holder-'+c.policy,pais:'GT'})),
 aseguradoras:[{id:'rob',nombre:'SEGUROS EL ROBLE',pais:'GT',activo:true}],
 polizas:C.source.cases.map(c=>({id:'old-'+c.policy,numero:c.policy,pais:'GT',clienteId:'cli-'+c.policy,aseguradoraId:'rob',asesorId:'adv',vigenciaInicio:c.termStart.replace('2026','2025'),vigenciaFin:c.termStart,estado:'Vigente',historial:[]})),
 vehiculos:C.source.cases.map(c=>({id:'veh-'+c.policy,clienteId:'cli-'+c.policy,polizaId:'old-'+c.policy,placa:'plate-'+c.policy,pais:'GT'})),
 asesores:[{id:'adv',activo:true}]
});
test('two source originals pin 24 requerimientos; 0.04/0.08 documentary differences preserved',()=>{
 assert.equal(C.check(),true);
 assert.deepEqual(C.source.cases.map(c=>c.coverScheduleDeltaCents),[4,8]);
 assert.equal(C.source.cases.reduce((n,c)=>n+c.schedule.length,0),24);
});
test('two canonical previous editions and single plate each qualify without fabricated VIN',()=>{
 const r=C.source.cases.map(c=>C.resolve(c,fixtures(),matcher));
 assert.ok(r.every(x=>x.status==='ELIGIBLE_SOURCE_IDENTITY_ONLY'));
 assert.ok(r.every(x=>x.evidence.platePriorCount===1));
});
test('all 24 emitted invoices and cartera, not a synthetic cobro',()=>{
 const f=fixtures();
 for(const c of C.source.cases){
  const m=C.mutation(c,C.resolve(c,f,matcher),stamped),policy=m.creates[0][1];
  assert.deepEqual(m.counts,{creates:27,updates:1,audit:1,receipts:12,portfolio:12,directPayments:0});
  assert.equal(m.creates.length,27);
  assert.equal(m.creates.filter(x=>x[0]==='cobros').length,0);
  assert.equal(m.creates.filter(x=>x[0]==='carteraPrimas').reduce((n,x)=>n+Math.round(x[1].primaTotal*100),0),c.issuedScheduleGrossCents);
  assert.equal(policy.renuevaDe,'old-'+c.policy);
  assert.equal(policy.primaTotal,c.issuerHeader.grossCents/100);
  assert.equal(policy.diferenciaDocumentalCentavos,c.coverScheduleDeltaCents);
  assert.equal(Math.round(policy.sumaAsegurada*100),c.issuedInsuredValueCents);
  assert.equal(Math.round(m.creates.find(x=>x[0]==='vehiculos')[1].sumaAsegurada*100),c.issuedInsuredValueCents);
  assert.ok(m.creates.filter(x=>x[0]==='recibosEsperados').every(x=>Number.isFinite(x[1].gastosEmisionYOtrosDocumentados)));
  assert.equal(m.previous.renovadaPor,policy.id);
 }
});
test('source collision or previous renewal is held per-case; other policy remains available',()=>{
 let f=fixtures(),c=C.source.cases[0];
 f.clientes.push({...f.clientes[0],id:'duplicate'});
 assert.equal(C.resolve(c,f,matcher).status,'CLIENT_HOLDER_NOT_UNIQUE');
 assert.equal(C.resolve(C.source.cases[1],f,matcher).status,'ELIGIBLE_SOURCE_IDENTITY_ONLY');
 f=fixtures();f.polizas[0].renovadaPor='successor';
 assert.equal(C.resolve(c,f,matcher).status,'ALREADY_RENEWED_OR_CANCELLED');
 f=fixtures();f.polizas.push({id:'current',pais:'GT',numero:c.policy,vigenciaInicio:c.termStart,vigenciaFin:c.termEnd});
 assert.equal(C.resolve(c,f,matcher).status,'ISSUED_EDITION_ALREADY_EXISTS');
});
test('wrong risk, wrong source identity and contradictory stored VIN stay fail-closed',()=>{
 let f=fixtures(),c=C.source.cases[0];f.vehiculos[0].placa='WRONG';
 assert.equal(C.resolve(c,f,matcher).status,'ISSUED_RISK_IDENTITY_NOT_UNIQUE');
 f=fixtures();f.vehiculos[0].vin='wrong';
 assert.equal(C.resolve(c,f,matcher).status,'ISSUED_RISK_IDENTITY_NOT_UNIQUE');
 f=fixtures();assert.equal(C.resolve(c,f).status,'CLIENT_HOLDER_NOT_UNIQUE');
});
