'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./cotcomp-gateway-harness');

const auth = {channel:'PUBLIC_WEB',sessionId:'s1',appCheckVerified:true,signedSessionVerified:true};

function validGtAuto() {
  return {
    tipoVehiculo:'Automóvil',
    usoVehiculo:'Particular',
    anioModelo:'2024',
    valorAsegurado:'185000',
    coberturaObjetivo:'Cobertura amplia',
    marca:'Toyota',
    lineaModelo:'Corolla',
    contactName:'Paula',
    contactWhatsapp:'+50255555555',
    contactEmail:'paula@example.com',
    requestManagementConsent:true
  };
}

test('draft validates without persistence', () => {
  const data = validGtAuto();
  delete data.contactName; delete data.contactWhatsapp; delete data.contactEmail; delete data.requestManagementConsent;
  const r = h.validateDraft({country:'gt',product:'auto',auth,data});
  assert.equal(r.transportAllowed,true);
  assert.equal(r.persistenceEnabled,false);
});

test('submit-ready public payload passes canonical backend validator', () => {
  const r = h.prepareHandoffSubmit({
    country:'gt',product:'auto',auth,
    idempotencyKey:'idem-s49-1',
    data:validGtAuto()
  });
  assert.equal(r.ok,true);
  assert.equal(r.validator.ok,true);
  assert.equal(r.payload.journeyId,'GT_AUTO_MOTO_HYBRID');
  assert.equal(r.persistenceEnabled,false);
});

test('submit remains blocked if public form omits backend-required fields', () => {
  const data = validGtAuto();
  delete data.marca;
  const r = h.prepareHandoffSubmit({
    country:'gt',product:'auto',auth,idempotencyKey:'idem-s49-2',data
  });
  assert.equal(r.ok,false);
  assert.equal(r.validator,null);
  assert.ok(r.plan.requirements.missingForJourney.includes('brand'));
});

function proposal(id,state='VALIDATED') {
  return {
    proposalId:id,
    quoteCaseId:'qc1',
    insurerId:'ins1',
    sourceId:'src1',
    country:'GT',
    product:'AUTO',
    currency:'GTQ',
    premium:2180,
    coverages:{},
    limits:{},
    sublimits:{},
    deductibles:{},
    assistance:{},
    conditions:[],
    exclusions:[],
    validity:{},
    provenance:{},
    validationState:state,
    validatedBy:state==='VALIDATED'?'user1':'',
    validatedAt:state==='VALIDATED'?'2026-09-29T00:00:00Z':''
  };
}

test('comparison includes only validated current proposals', () => {
  const r = h.comparableProposals({
    proposals:[proposal('a'),proposal('b','RECEIVED'),proposal('c')],
    validityByProposal:{a:true,b:true,c:false}
  });
  assert.deepEqual(r.eligible.map(x=>x.proposalId),['a']);
  assert.equal(r.rankingApplied,false);
  assert.equal(r.comparisonPolicy.winner,null);
  assert.equal(r.excluded.length,2);
});

test('comparison preserves source order and does not score', () => {
  const r = h.comparableProposals({
    proposals:[proposal('b'),proposal('a')],
    validityByProposal:{a:true,b:true}
  });
  assert.deepEqual(r.eligible.map(x=>x.proposalId),['b','a']);
  assert.equal(r.comparisonPolicy.silentWeighting,false);
});

test('selection is explicit and remains non-binding', () => {
  const r = h.prepareSelection({
    auth,quoteCaseId:'qc1',proposalId:'a',explicitUserChoice:true
  });
  assert.equal(r.ok,true);
  assert.equal(r.handoff.status,'USER_SELECTED_FOR_CONTINUATION');
  assert.equal(r.handoff.issuanceState,'NOT_ISSUED');
  assert.equal(r.handoff.bindingState,'NOT_BOUND');
  assert.equal(r.handoff.coverageState,'NOT_CONFIRMED');
  assert.equal(r.persistenceEnabled,false);
});

test('selection without explicit choice is blocked', () => {
  const r = h.prepareSelection({auth,quoteCaseId:'qc1',proposalId:'a'});
  assert.equal(r.ok,false);
  assert.equal(r.handoff,null);
});

test('runtime stays off', () => {
  assert.equal(h.RUNTIME_ENABLED,false);
  assert.equal(h.PERSISTENCE_ENABLED,false);
});
