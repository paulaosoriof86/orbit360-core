'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./cotcomp-callable-handlers');

const app = { appId:'web-app' };
const autoData = {
  tipoVehiculo:'Automóvil',
  usoVehiculo:'Particular',
  anioModelo:'2024',
  valorAsegurado:'185000',
  coberturaObjetivo:'Cobertura amplia',
  marca:'Toyota',
  lineaModelo:'Corolla'
};

function validProposal(id) {
  return {
    proposalId:id, quoteCaseId:'qc1', insurerId:'ins1', sourceId:'src1',
    country:'GT', product:'AUTO', currency:'GTQ', premium:2180,
    coverages:{}, limits:{}, sublimits:{}, deductibles:{}, assistance:{},
    conditions:[], exclusions:[], validity:{}, provenance:{},
    validationState:'VALIDATED', validatedBy:'u1', validatedAt:'2026-09-29T00:00:00Z'
  };
}

test('validate draft requires App Check request.app', async () => {
  const r = await h.handleValidateDraft({data:{country:'gt',product:'auto',data:autoData}});
  assert.equal(r.ok,false);
  assert.equal(r.code,'APP_CHECK_REQUIRED');
});

test('validate draft reaches pure gateway and never persists', async () => {
  const r = await h.handleValidateDraft({app,data:{country:'gt',product:'auto',data:autoData}});
  assert.equal(r.ok,true);
  assert.equal(r.persistenceEnabled,false);
  assert.equal(r.result.transportAllowed,true);
});

test('submit handoff validates complete contract but does not persist', async () => {
  const r = await h.handleSubmitHandoff({
    app,
    data:{
      country:'gt', product:'auto', idempotencyKey:'idem-callable-1',
      data:{
        ...autoData,
        contactName:'Paula',
        contactWhatsapp:'+50255555555',
        contactEmail:'paula@example.com',
        requestManagementConsent:true
      }
    }
  });
  assert.equal(r.ok,true);
  assert.equal(r.persisted,false);
  assert.equal(r.status,'VALIDATED_NOT_PERSISTED');
});

test('proposal fetch requires case access verifier', async () => {
  const r = await h.handleFetchComparableProposals({app,data:{quoteCaseId:'qc1',caseAccessToken:'token'}},{});
  assert.equal(r.ok,false);
  assert.equal(r.code,'CASE_ACCESS_VERIFIER_REQUIRED');
});

test('proposal fetch denies bad case access', async () => {
  const r = await h.handleFetchComparableProposals(
    {app,data:{quoteCaseId:'qc1',caseAccessToken:'bad'}},
    {verifyCaseAccess:async()=>false,loadProposals:async()=>({proposals:[]})}
  );
  assert.equal(r.ok,false);
  assert.equal(r.code,'CASE_ACCESS_DENIED');
});

test('proposal fetch filters to validated current and never ranks', async () => {
  const r = await h.handleFetchComparableProposals(
    {app,data:{quoteCaseId:'qc1',caseAccessToken:'good'}},
    {
      verifyCaseAccess:async()=>true,
      loadProposals:async()=>({
        proposals:[validProposal('b'),validProposal('a')],
        validityByProposal:{a:true,b:true}
      })
    }
  );
  assert.equal(r.ok,true);
  assert.deepEqual(r.result.eligible.map(x=>x.proposalId),['b','a']);
  assert.equal(r.result.rankingApplied,false);
  assert.equal(r.persistenceEnabled,false);
});

test('selection requires verified case access and explicit user choice', async () => {
  const deps={verifyCaseAccess:async()=>true};
  const blocked=await h.handleSelectProposal({app,data:{quoteCaseId:'qc1',proposalId:'a',caseAccessToken:'good'}},deps);
  assert.equal(blocked.ok,false);

  const ok=await h.handleSelectProposal({app,data:{quoteCaseId:'qc1',proposalId:'a',caseAccessToken:'good',explicitUserChoice:true}},deps);
  assert.equal(ok.ok,true);
  assert.equal(ok.persisted,false);
  assert.equal(ok.result.handoff.issuanceState,'NOT_ISSUED');
});

test('callable handler layer keeps persistence disabled globally', () => {
  assert.equal(h.PERSISTENCE_ENABLED,false);
});
