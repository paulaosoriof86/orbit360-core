'use strict';
// I6.6: one bounded, source-pinned crosswalk for five original El Roble policies.
// NO source mutations, NO Firestore write APIs, NO new writer and NO product release.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const source = require('../artifacts/orbit360-recovery/source-batches/I6_6_ROBLE_FIVE_ISSUED_49_REQUIREMENTS_20261122.json');
const evidence = require('../artifacts/orbit360-recovery/source-batches/I6_6_ROBLE_FIVE_ISSUED_IDENTITY_WITNESSES_20261122.json');
const {canonicalPolicyNumber} = require('./gravicentra-i66-source-bulk-plan.cjs');
const clean = value => String(value == null ? '' : value).normalize('NFD').toUpperCase().replace(/[^A-Z0-9]/g,'');
const match = (w, value, field) => !!value && crypto.createHash('sha256').update(w.sourcePdfRawSha256 + '|' + clean(value)).digest('hex') === w[field];
const project = (set,fields) => set.map(r => Object.fromEntries([...fields,'id'].map(k=>[k,r[k]])));
const unique = rows => rows.length === 1;
const spec = Object.freeze([
  ['clientes',1000,['nombre','nombreCompleto','razonSocial','pais','asesorId']],
  ['vehiculos',2000,['placa','placaFuente','vin','chasis','chasisFuente','polizaId','clienteId','pais']],
  ['polizas',2500,['numero','numeroPoliza','polizaNumero','pais','vigenciaInicio','vigenciaFin','clienteId','asesorId','aseguradoraId','renuevaDe','renovadaPor']],
  ['aseguradoras',100,['pais','nombre','activo']],
  ['asesores',400,['pais','activo','paises']]
]);
function verifySource() {
  assert.equal(source.schema,'GI_I66_ROBLE_FIVE_ISSUED_SCHEDULE_CROSSWALK_V1');
  assert.equal(evidence.schema,'GI_I66_ROBLE_FIVE_ISSUED_IDENTITY_SHA256_WITNESSES_V1');
  assert.equal(source.matchedPendingRequirements,49);
  assert.equal(source.cases.length,5);
  assert.equal(evidence.witnesses.length,5);
  assert.equal(source.commercialWrites,0);
  assert.equal(source.sourceBatchBlobSha,'ab64e111319e3447733a3af05bf378250698ccdb');
  assert.equal(new Set(source.cases.map(c=>c.policy)).size,5);
  for (const c of source.cases) {
    const w=evidence.witnesses.find(x=>x.policy===c.policy);
    assert.ok(w,'ISSUED_WITNESS_MISSING_'+c.policy);
    assert.equal(c.sourcePdfRawSha256,w.sourcePdfRawSha256);
    assert.equal(c.schedule.length,c.matchedSourcePendingCount);
    assert.equal(c.schedule.reduce((n,r)=>n+r.grossCents,0),c.matchedSourcePendingCents);
    assert.equal(new Set(c.schedule.map(r=>r.sequence)).size,c.schedule.length);
    assert.equal(new Set(c.schedule.map(r=>r.requirement)).size,c.schedule.length);
    assert.ok(c.schedule.every(r=>Number.isSafeInteger(r.grossCents)&&r.grossCents>0&&r.due>=c.termStart&&r.due<=c.termEnd));
  }
  assert.equal(source.cases.reduce((n,c)=>n+c.schedule.length,0),49);
  return true;
}
function verdict(data,identityMatch=match) {
  verifySource();
  const {clientes:clients=[],vehiculos:vehicles=[],polizas:policies=[],aseguradoras:insurers=[],asesores:advisors=[]}=data||{};
  return source.cases.map(c=>{
    const w=evidence.witnesses.find(x=>x.policy===c.policy);
    const holder=clients.filter(x=>String(x.pais||'').toUpperCase()==='GT'&&
      [x.nombre,x.nombreCompleto,x.razonSocial].some(v=>identityMatch(w,v,'holderWitness')));
    const insurer=insurers.filter(x=>String(x.pais||'').toUpperCase()==='GT'&&x.activo!==false&&/roble/i.test(String(x.nombre||'')));
    const sameNumber=policies.filter(x=>String(x.pais||'').toUpperCase()==='GT'&&
      [x.numero,x.numeroPoliza,x.polizaNumero].some(v=>v&&canonicalPolicyNumber(v)===canonicalPolicyNumber(c.policy)));
    const exact=sameNumber.filter(p=>p.vigenciaInicio===c.termStart&&p.vigenciaFin===c.termEnd);
    const prior=sameNumber.filter(p=>p.vigenciaFin===c.termStart&&holder.some(h=>h.id===p.clienteId)&&insurer.some(a=>a.id===p.aseguradoraId));
    const candidateVehicles=vehicles.filter(v=>String(v.pais||'GT').toUpperCase()==='GT'&&
      ([v.placa,v.placaFuente].some(z=>identityMatch(w,z,'initialCertificatePlateWitness')) ||
       [v.vin,v.chasis,v.chasisFuente].some(z=>identityMatch(w,z,'initialCertificateVinWitness'))));
    const strong=candidateVehicles.filter(v=>
      [v.placa,v.placaFuente].some(z=>identityMatch(w,z,'initialCertificatePlateWitness'))&&
      [v.vin,v.chasis,v.chasisFuente].some(z=>identityMatch(w,z,'initialCertificateVinWitness')));
    const linked=strong.filter(v=>prior.some(p=>p.id===v.polizaId)&&holder.some(h=>h.id===v.clienteId));
    const onPrior=candidateVehicles.filter(v=>prior.some(p=>p.id===v.polizaId)&&holder.some(h=>h.id===v.clienteId));
    const priorAllVehicles=vehicles.filter(v=>prior.some(p=>p.id===v.polizaId)&&holder.some(h=>h.id===v.clienteId));
    const plateOnPrior=onPrior.filter(v=>[v.placa,v.placaFuente].some(z=>identityMatch(w,z,'initialCertificatePlateWitness')));
    const vinOnPrior=onPrior.filter(v=>[v.vin,v.chasis,v.chasisFuente].some(z=>identityMatch(w,z,'initialCertificateVinWitness')));
    const sameHolderRisk=candidateVehicles.filter(v=>holder.some(h=>h.id===v.clienteId));
    const riskOtherHolder=candidateVehicles.filter(v=>v.clienteId&&!holder.some(h=>h.id===v.clienteId));
    const existingPriorVehicle=priorAllVehicles[0]||null;
    const oldRiskHasPlate=existingPriorVehicle?!!(existingPriorVehicle.placa||existingPriorVehicle.placaFuente):false;
    const oldRiskHasVin=existingPriorVehicle?!!(existingPriorVehicle.vin||existingPriorVehicle.chasis||existingPriorVehicle.chasisFuente):false;
    const advisorLinked=prior.filter(p=>advisors.some(a=>a.id===p.asesorId&&a.activo!==false));
    let status='CANDIDATE_RISK_AND_EDITION_READY_SOURCE_ONLY';
    if(exact.length)status='EDITION_ALREADY_PRESENT_DO_NOT_DUPLICATE';
    else if(!unique(holder))status='HOLDER_IDENTITY_NOT_UNIQUE';
    else if(!unique(insurer))status='INSURER_IDENTITY_NOT_UNIQUE';
    else if(!unique(prior))status='PREDECESSOR_EDITION_NOT_UNIQUE';
    else if(prior[0]?.renovadaPor)status='PREDECESSOR_HAS_SUCCESSOR';
    else if(!unique(advisorLinked))status='PRIOR_ADVISOR_UNVERIFIED';
    else if(w.initialCertificateHolderMatchesContractHolder!==true)status='FLEET_CERTIFICATE_OTHER_INSURED_HOLD_RISK_JOIN';
    else if(!unique(linked))status='POLICY_VEHICLE_CERTIFICATE_IDENTITY_NOT_UNIQUE';
    return {policy:c.policy,sourceRows:c.matchedSourcePendingCount,sourceTotalCents:c.matchedSourcePendingCents,
      status,holderCount:holder.length,insurerCount:insurer.length,policyEditions:sameNumber.length,
      exactEditionCount:exact.length,predecessorCount:prior.length,predecessorAlreadyRenewed:prior.filter(p=>!!p.renovadaPor).length,
      activePriorAdvisorCount:advisorLinked.length,firstCertificateCandidates:candidateVehicles.length,
      strongCertificateMatches:strong.length,linkedOldRiskMatches:linked.length,
      priorAllVehicleCount:priorAllVehicles.length,partialRiskMatchesOnPredecessor:onPrior.length,
      plateMatchesOnPredecessor:plateOnPrior.length,vinMatchesOnPredecessor:vinOnPrior.length,
      sameHolderDocumentaryRiskCandidates:sameHolderRisk.length,otherHolderRiskCandidates:riskOtherHolder.length,
      oldRiskPlatePresent:oldRiskHasPlate,oldRiskVinPresent:oldRiskHasVin,
      sourceRiskMismatch:w.initialCertificateHolderMatchesContractHolder!==true,
      mutations:0,firestoreWrites:0};
  });
}
async function crosswalk(collection) {
  verifySource();
  const selections=await Promise.all(spec.map(async ([name,limit,fields])=>{
    const snap=await collection(name).select(...fields).limit(limit).get();
    assert.ok(snap.size<limit,'ISSUED_FIVE_CROSSWALK_TRUNCATED_'+name);
    return snap.docs.map(d=>({...d.data(),id:d.id}));
  }));
  const counts=Object.fromEntries(spec.map((s,i)=>[s[0],selections[i].length]));
  console.log('I66_FIVE_READER_COUNTS='+JSON.stringify(counts));
  assert.ok(counts.clientes>0&&counts.aseguradoras>0,'ISSUED_FIVE_READ_SOURCES_EMPTY_HOLD');
  return verdict(Object.fromEntries(spec.map((s,i)=>[s[0],selections[i]])));
}
module.exports={crosswalk,verdict,verifySource,match};
