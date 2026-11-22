'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const F=require('./gravicentra-i66-roble-five-issuer-crosswalk-readonly.cjs');
const M=require('../artifacts/orbit360-recovery/source-batches/I6_6_ROBLE_FIVE_ISSUED_49_REQUIREMENTS_20261122.json');
test('all five issuer source schedules are immutable and source-pin exact 49',()=>{
  assert.equal(F.verifySource(),true);
  assert.equal(M.cases.length,5);
  assert.equal(M.cases.reduce((n,c)=>n+c.schedule.length,0),49);
});
const matches=(w,x,field)=>{
  if(field==='holderWitness')return x==='holder-'+w.policy;
  if(field==='initialCertificatePlateWitness')return x==='plate-'+w.policy;
  if(field==='initialCertificateVinWitness')return x==='vin-'+w.policy;
  return false;
};
function fixtures(){
  return {
    clientes:M.cases.map(c=>({id:'client-'+c.policy,pais:'GT',nombre:'holder-'+c.policy})),
    aseguradoras:[{id:'el-roble',nombre:'Seguros El Roble',pais:'GT',activo:true}],
    asesores:[{id:'advisor',activo:true}],
    polizas:M.cases.map(c=>({id:'prior-'+c.policy,pais:'GT',numero:c.policy,vigenciaInicio:c.termStart.replace(/^2026/,'2025'),vigenciaFin:c.termStart,clienteId:'client-'+c.policy,aseguradoraId:'el-roble',asesorId:'advisor'})),
    vehiculos:M.cases.map(c=>({id:'risk-'+c.policy,pais:'GT',placa:'plate-'+c.policy,vin:'vin-'+c.policy,polizaId:'prior-'+c.policy,clienteId:'client-'+c.policy}))
  };
}
test('four single-risk issuances qualify for source-only crosswalk, fleet certificate stays held',()=>{
 const r=F.verdict(fixtures(),matches);
 assert.equal(r.length,5);
 assert.equal(r.filter(x=>x.status==='CANDIDATE_RISK_AND_EDITION_READY_SOURCE_ONLY').length,4);
 assert.equal(r.filter(x=>x.status==='FLEET_CERTIFICATE_OTHER_INSURED_HOLD_RISK_JOIN').length,1);
 assert.equal(r.reduce((n,x)=>n+x.mutations,0),0);
 assert.equal(r.reduce((n,x)=>n+x.firestoreWrites,0),0);
 assert.equal(r.filter(x=>x.partialRiskMatchesOnPredecessor===1).length,5);
 assert.equal(r.filter(x=>x.sameHolderDocumentaryRiskCandidates===1).length,5);
 assert.equal(r.filter(x=>x.otherHolderRiskCandidates===0).length,5);
 assert.equal(r.filter(x=>x.plateMatchesOnPredecessor===1&&x.vinMatchesOnPredecessor===1).length,5);
});
test('already issued 2026-2027 edition never becomes another create',()=>{
 let f=fixtures(),c=M.cases[0];
 f.polizas.push({id:'already',numero:c.policy,pais:'GT',clienteId:'client-'+c.policy,aseguradoraId:'el-roble',vigenciaInicio:c.termStart,vigenciaFin:c.termEnd});
 assert.equal(F.verdict(f,matches).find(x=>x.policy===c.policy).status,'EDITION_ALREADY_PRESENT_DO_NOT_DUPLICATE');
});
test('source identity collision, predecessor missing, risk and advisor ambiguity remain local',()=>{
 let f=fixtures(),c=M.cases[0];f.clientes.push({...f.clientes[0],id:'other'});
 assert.equal(F.verdict(f,matches).find(x=>x.policy===c.policy).status,'HOLDER_IDENTITY_NOT_UNIQUE');
 f=fixtures();f.polizas=f.polizas.filter(x=>x.numero!==c.policy);
 assert.equal(F.verdict(f,matches).find(x=>x.policy===c.policy).status,'PREDECESSOR_EDITION_NOT_UNIQUE');
 f=fixtures();f.vehiculos=f.vehiculos.filter(x=>x.polizaId!=='prior-'+c.policy);
 assert.equal(F.verdict(f,matches).find(x=>x.policy===c.policy).status,'POLICY_VEHICLE_CERTIFICATE_IDENTITY_NOT_UNIQUE');
 f=fixtures();f.asesores=[];
 assert.equal(F.verdict(f,matches).find(x=>x.policy===c.policy).status,'PRIOR_ADVISOR_UNVERIFIED');
});
test('fake mismatched source identifier never becomes an authorized client',()=>{
 const r=F.verdict(fixtures());
 assert.equal(r.filter(x=>x.status==='CANDIDATE_RISK_AND_EDITION_READY_SOURCE_ONLY').length,0);
});
