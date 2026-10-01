'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-pilot-intake-s467');

test('S4.67 is LAB-only one-time GT Auto/Moto intake',()=>{
  assert.equal(s.PROJECT_ID,'ays-orbit-360-lab');
  assert.equal(s.TENANT_ID,'alianzas-soluciones');
  assert.equal(s.JOURNEY_ID,'GT_AUTO_MOTO_HYBRID');
  assert.equal(s.COUNTRY,'GT');
  assert.match(s.TOKEN_SHA256,/^[a-f0-9]{64}$/);
});

test('S4.67 bearer verification can be tested without revealing production bearer',()=>{
  const expected=s.sha256('unit-test-token');
  assert.equal(s.verifyBearerToken('unit-test-token',expected),true);
  assert.equal(s.verifyBearerToken('wrong-token',expected),false);
});

test('S4.67 validates only minimum Auto/Moto + contact + request-management consent',()=>{
  const v=s.normalizeInput({
    brand:'Toyota',lineModel:'RAV4',name:'Persona Piloto',
    whatsapp:'+502 5555 5555',email:'pilot@example.com',
    requestManagementConsent:true
  });
  const r=s.validateInput(v);
  assert.equal(r.ok,true);
  const noConsent=s.validateInput({...v,requestManagementConsent:false});
  assert.equal(noConsent.ok,false);
  assert.ok(noConsent.errors.includes('REQUEST_MANAGEMENT_CONSENT_REQUIRED'));
});

test('S4.67 real QuoteCase contract keeps marketing false and no health fields',()=>{
  const v=s.normalizeInput({
    brand:'Toyota',lineModel:'RAV4',name:'Persona Piloto',
    whatsapp:'+502 5555 5555',email:'pilot@example.com',
    requestManagementConsent:true
  });
  const q=s.buildRealQuoteCase(v,'2026-10-01T12:00:00.000Z','qcase_test','corr_test');
  assert.equal(q.journeyId,'GT_AUTO_MOTO_HYBRID');
  assert.equal(q.status,'SUBMITTED');
  assert.equal(q.consents.requestManagement,true);
  assert.equal(q.consents.marketing,false);
  assert.equal(q.pilotIntake.generalPersistenceReleased,false);
  assert.equal(Object.prototype.hasOwnProperty.call(q.capturedFields,'titularDob'),false);
});

test('S4.67 page contains no third-party dependencies and explains non-issuance truth',()=>{
  const h=s.html();
  assert.doesNotMatch(h,/https:\/\//);
  assert.match(h,/No emite pólizas/);
  assert.match(h,/marketing está desactivado/);
  assert.match(h,/Autorizo a Alianzas y Soluciones/);
});
