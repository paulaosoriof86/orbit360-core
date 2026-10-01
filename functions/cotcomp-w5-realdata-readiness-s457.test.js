'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-w5-realdata-readiness-s457');

test('S4.57 remains source-only and real data hard-closed',()=>{
  assert.equal(s.EXECUTION_ENABLED,false);
  assert.equal(s.APP_DATA_READS_ALLOWED,false);
  assert.equal(s.APP_DATA_WRITES_ALLOWED,false);
  assert.equal(s.REAL_DATA_ALLOWED,false);
  assert.equal(s.PRODUCTION_ALLOWED,false);
});

test('S4.57 confirms current formal legal validation is incomplete',()=>{
  const r=s.audit();
  assert.equal(r.findings.formalLegalValidationComplete,false);
  assert.equal(r.findings.gtCounselPacketComplete,false);
  assert.equal(r.findings.coCounselPacketComplete,false);
  assert.ok(r.blockers.includes('FORMAL_LEGAL_VALIDATION_REQUIRED'));
});

test('S4.57 confirms current governance privacy locks',()=>{
  const r=s.audit();
  assert.equal(r.findings.rawCaseAccessTokenPersistenceForbidden,true);
  assert.equal(r.findings.marketingConsentSeparate,true);
  assert.equal(r.findings.retentionStillPendingFormalLegalValidation,true);
});

test('S4.57 detects health-sensitive journey and requires explicit minimization/legal boundaries',()=>{
  const r=s.audit();
  assert.equal(r.findings.healthSensitiveJourneyPresent,true);
  assert.ok(r.journeys.some(x=>x.journeyId==='GT_GASTOS_MEDICOS_HYBRID'&&x.hasHealthSignal===true));
  assert.ok(r.blockers.includes('W5_REAL_DATA_MINIMIZATION_REQUIRED'));
});

test('S4.57 freezes all W5 technical readiness gaps and Owner gate',()=>{
  const r=s.audit();
  const expected=[
    'W5_EXACT_PILOT_SCOPE_REQUIRED',
    'W5_SINGLE_EXECUTION_GUARD_REQUIRED',
    'W5_REAL_DATA_MINIMIZATION_REQUIRED',
    'W5_SANITIZED_OBSERVABILITY_REQUIRED',
    'W5_ROLLBACK_CONTAINMENT_REQUIRED',
    'W5_SUCCESS_ABORT_CRITERIA_REQUIRED',
    'W5_SUCCESS_PERSISTENCE_DISPOSITION_REQUIRED',
    'W5_PROVIDER_PRODUCTION_LOCKS_REQUIRED',
    'OWNER_W5_REAL_DATA_AUTHORIZATION_REQUIRED'
  ];
  for(const b of expected)assert.ok(r.blockers.includes(b),b);
  assert.equal(r.technicalW5Ready,false);
  assert.equal(r.executionAllowed,false);
});
