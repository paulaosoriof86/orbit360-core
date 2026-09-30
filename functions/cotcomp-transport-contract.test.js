'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const t = require('./cotcomp-transport-contract');

const publicAuth = {
  channel:'PUBLIC_WEB',
  appCheckVerified:true
};

test('public web draft/handoff requires App Check but no visible login or pre-issued session', () => {
  const missing = t.validateAuthContext({channel:'PUBLIC_WEB'},t.OPERATIONS.VALIDATE_DRAFT);
  assert.equal(missing.ok,false);
  assert.ok(missing.errors.includes('APP_CHECK_REQUIRED'));

  const ok = t.validateAuthContext({channel:'PUBLIC_WEB',appCheckVerified:true},t.OPERATIONS.SUBMIT_HANDOFF);
  assert.equal(ok.ok,true);
});

test('portal/internal requires Firebase Auth identity', () => {
  const r = t.validateAuthContext({channel:'PORTAL',firebaseAuthVerified:true,uid:'u1'});
  assert.equal(r.ok,true);
});

test('draft validation can defer contact but not journey fields', () => {
  const r = t.buildTransportPlan({
    operation:'VALIDATE_DRAFT', requestId:'r1', auth:publicAuth,
    country:'gt', product:'auto',
    data:{
      tipoVehiculo:'Automóvil',
      usoVehiculo:'Particular',
      anioModelo:'2024',
      valorAsegurado:'185000',
      coberturaObjetivo:'Cobertura amplia',
      marca:'Toyota',
      lineaModelo:'Corolla'
    }
  });
  assert.equal(r.mapping.journeyId,'GT_AUTO_MOTO_HYBRID');
  assert.deepEqual(r.requirements.missingForJourney,[]);
  assert.ok(r.requirements.missingForSubmit.includes('contact.email'));
  assert.equal(r.transportAllowed,true);
  assert.equal(r.persistenceAllowed,false);
});

test('handoff submit is blocked until contact consent and idempotency exist', () => {
  const r = t.buildTransportPlan({
    operation:'SUBMIT_HANDOFF', requestId:'r2', auth:publicAuth,
    country:'gt', product:'auto',
    data:{
      tipoVehiculo:'Automóvil',
      usoVehiculo:'Particular',
      anioModelo:'2024',
      valorAsegurado:'185000',
      coberturaObjetivo:'Cobertura amplia',
      marca:'Toyota',
      lineaModelo:'Corolla'
    }
  });
  assert.equal(r.transportAllowed,false);
  assert.ok(r.errors.includes('IDEMPOTENCY_KEY_REQUIRED'));
  assert.ok(r.errors.includes('CONTACT_OR_CONSENT_INCOMPLETE'));
});

test('handoff contract can become transport-valid but never persistence-enabled in S4.8', () => {
  const r = t.buildTransportPlan({
    operation:'SUBMIT_HANDOFF', requestId:'r3', idempotencyKey:'idem-1', auth:publicAuth,
    country:'gt', product:'auto',
    data:{
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
    }
  });
  assert.equal(r.transportAllowed,true);
  assert.equal(r.persistenceAllowed,false);
});

test('proposal fetch contract is read-only and carries comparison truth locks', () => {
  const r = t.buildTransportPlan({
    operation:'FETCH_COMPARABLE_PROPOSALS', requestId:'r4', auth:{...publicAuth,caseAccessVerified:true}, quoteCaseId:'qc_1'
  });
  assert.equal(r.transportAllowed,true);
  assert.equal(r.responseMode,'READ_ONLY_VALIDATED_CURRENT_PROPOSALS');
  assert.equal(r.requirements.ranking,'NONE_BY_DEFAULT');
  assert.equal(r.persistenceAllowed,false);
});

test('proposal selection requires explicit user choice and is not issuance', () => {
  const blocked = t.buildTransportPlan({
    operation:'SELECT_PROPOSAL', requestId:'r5', auth:{...publicAuth,caseAccessVerified:true}, quoteCaseId:'qc_1', proposalId:'p1'
  });
  assert.equal(blocked.transportAllowed,false);
  assert.ok(blocked.errors.includes('EXPLICIT_USER_CHOICE_REQUIRED'));

  const ok = t.buildTransportPlan({
    operation:'SELECT_PROPOSAL', requestId:'r6', auth:{...publicAuth,caseAccessVerified:true}, quoteCaseId:'qc_1', proposalId:'p1', explicitUserChoice:true
  });
  assert.equal(ok.transportAllowed,true);
  assert.equal(ok.requirements.issuanceMeaning,'NOT_ISSUED_NOT_BOUND_NOT_COVERED');
  assert.equal(ok.persistenceAllowed,false);
});

test('runtime and writes stay disabled', () => {
  assert.equal(t.RUNTIME_ENABLED,false);
  assert.equal(t.WRITE_ENABLED,false);
});


test('public proposal reads and selection require verified case access', () => {
  const read = t.buildTransportPlan({
    operation:'FETCH_COMPARABLE_PROPOSALS',
    requestId:'r-case-1',
    auth:{channel:'PUBLIC_WEB',appCheckVerified:true},
    quoteCaseId:'qc_1'
  });
  assert.equal(read.transportAllowed,false);
  assert.ok(read.errors.includes('CASE_ACCESS_REQUIRED'));

  const verified = t.buildTransportPlan({
    operation:'FETCH_COMPARABLE_PROPOSALS',
    requestId:'r-case-2',
    auth:{channel:'PUBLIC_WEB',appCheckVerified:true,caseAccessVerified:true},
    quoteCaseId:'qc_1'
  });
  assert.equal(verified.transportAllowed,true);
});
