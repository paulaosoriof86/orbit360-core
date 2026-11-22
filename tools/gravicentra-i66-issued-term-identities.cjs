'use strict';
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const witnesses = require('../artifacts/orbit360-recovery/source-batches/I6_6_ROBLE_ISSUED_TERM_WITNESSES_20261122.json');
const terms = require('../artifacts/orbit360-recovery/source-batches/I6_6_ROBLE_THREE_ISSUED_TERMS_DOCUMENTARY_CROSSCHECK_20261122.json').issuedExamples;
const clean = value => String(value || '').normalize('NFD').toUpperCase().replace(/[^A-Z0-9]/g,'');
const hash = (w,v) => crypto.createHash('sha256').update(w.pdfSha256+'|'+clean(v)).digest('hex');
async function crosswalk(collection) {
  const specs=[
    ['clientes',1000,['nombre','nombreCompleto','razonSocial','pais','asesorId']],
    ['vehiculos',2000,['placa','placaFuente','vin','chasis','chasisFuente','polizaId','clienteId','pais']],
    ['polizas',2500,['numero','numeroPoliza','polizaNumero','pais','vigenciaInicio','vigenciaFin','clienteId','asesorId','aseguradoraId','renuevaDe','renovadaPor']],
    ['aseguradoras',100,['pais','nombre','activo']],
    ['asesores',400,['pais','activo','paises']]
  ];
  const sets=await Promise.all(specs.map(async ([name,limit,fields])=>{
    const snap=await collection(name).select(...fields).limit(limit).get();
    assert.ok(snap.size<limit,'ISSUED_CROSSWALK_TRUNCATED_'+name);
    return snap.docs.map(d=>({...d.data(),id:d.id}));
  }));
  const [clients,vehicles,policies,insurers,advisors]=sets;
  return witnesses.map((w,index)=>{
    const term=terms[index];
    const eligible=clients.filter(c=>c.pais==='GT'&&[c.nombre,c.nombreCompleto,c.razonSocial].some(v=>v&&hash(w,v)===w.holderWitness));
    const insurer=insurers.filter(r=>r.pais==='GT'&&r.activo!==false&&/roble/i.test(r.nombre||''));
    const keyed=policies.filter(p=>p.pais==='GT'&&[p.numero,p.numeroPoliza,p.polizaNumero].some(v=>v&&clean(v)===clean(term.policy)));
    const dates=keyed.filter(p=>p.vigenciaInicio===term.vigenciaInicio&&p.vigenciaFin===term.vigenciaFin);
    const prior=keyed.filter(p=>p.vigenciaFin===term.vigenciaInicio&&eligible.some(c=>c.id===p.clienteId)&&insurer.some(a=>a.id===p.aseguradoraId));
    const risk=vehicles.filter(v=>[v.placa,v.placaFuente].some(p=>p&&hash(w,p)===w.plateWitness)||[v.chasis,v.chasisFuente,v.vin].some(n=>n&&hash(w,n)===w.vinWitness));
    const strong=risk.filter(v=>[v.placa,v.placaFuente].some(p=>p&&hash(w,p)===w.plateWitness)&&[v.chasis,v.chasisFuente,v.vin].some(n=>n&&hash(w,n)===w.vinWitness));
    return {decision:w.decision,holderCount:eligible.length,insurerCount:insurer.length,numberAcrossAliases:keyed.length,
      exactTerms:dates.length,immediatePredecessors:prior.length,priorWithExistingSuccessor:prior.filter(p=>p.renovadaPor).length,
      advisorOnPrior:prior.filter(p=>advisors.some(a=>a.id===p.asesorId)).length,advisorOnHolder:eligible.filter(c=>advisors.some(a=>a.id===c.asesorId)).length,
      anyRiskMatches:risk.length,bothRiskIdentifiers:strong.length,priorRiskByPlateOrVin:risk.filter(v=>prior.some(p=>p.id===v.polizaId)).length,
      bothIdentifiersOnPrior:strong.filter(v=>prior.some(p=>p.id===v.polizaId)).length,
      riskLinkedToHolder:risk.filter(v=>eligible.some(c=>c.id===v.clienteId)).length};
  });
}
module.exports={crosswalk};
