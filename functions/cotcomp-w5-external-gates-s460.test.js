'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-w5-external-gates-s460');
const governance=require('./cotcomp-governance-policy');
const pilot=require('./cotcomp-w5-pilot-contract-s458');

test('S4.60 remains hard-closed to reads, writes, real data and production',()=>{
  assert.equal(s.EXECUTION_ENABLED,false);
  assert.equal(s.APP_DATA_READS_ALLOWED,false);
  assert.equal(s.APP_DATA_WRITES_ALLOWED,false);
  assert.equal(s.REAL_DATA_ALLOWED,false);
  assert.equal(s.PRODUCTION_ALLOWED,false);
});

test('S4.60 owner decision template freezes hard locks and leaves business decisions unset',()=>{
  const t=s.ownerDecisionTemplate();
  assert.equal(t.governancePolicyVersion,governance.VERSION);
  assert.equal(t.country,null);
  assert.equal(t.journeyId,null);
  assert.equal(t.successDisposition,null);
  assert.equal(t.ownerW5RealDataAuthorization,false);
  assert.equal(t.hardLocks.maxQuoteCases,1);
  assert.equal(t.hardLocks.maxDataSubjects,1);
  assert.equal(t.hardLocks.providerOrRaterCallsAllowed,false);
  assert.equal(t.hardLocks.productionAllowed,false);
});

test('S4.60 legal-evidence package requires both countries under current frozen contract',()=>{
  const r=s.legalEvidenceRequirements();
  assert.deepEqual(r.countries,['GT','CO']);
  assert.equal(r.bothCountriesRequiredByCurrentFrozenContract,true);
  assert.equal(r.publicResearchCannotSubstituteFormalCounselEvidence,true);
});

test('S4.60 current external gates remain incomplete and execution false',()=>{
  const r=s.currentExternalGateStatus();
  assert.equal(r.formalLegalValidationComplete,false);
  assert.equal(r.exactPilotScopeComplete,false);
  assert.equal(r.successDispositionChosen,false);
  assert.equal(r.ownerW5RealDataAuthorization,false);
  assert.equal(r.executionAllowed,false);
  assert.deepEqual(r.blockers,[
    'FORMAL_LEGAL_VALIDATION_REQUIRED',
    'W5_EXACT_PILOT_SCOPE_REQUIRED',
    'W5_SUCCESS_PERSISTENCE_DISPOSITION_REQUIRED',
    'OWNER_W5_REAL_DATA_AUTHORIZATION_REQUIRED'
  ]);
});

test('S4.60 packet validation cannot open execution even when a structurally complete packet is simulated',()=>{
  const hash=pilot.sha256('commitment');
  const r=s.validateDecisionPacket({
    governancePolicyVersion:governance.VERSION,
    country:'GT',
    journeyId:'GT_AUTO_MOTO_HYBRID',
    allowedStages:['W1','W2','W3','W4'],
    maxExistingRecordsTouched:8,
    caseSelectorCommitmentSha256:hash,
    actorSelectorCommitmentSha256:pilot.sha256('actor'),
    requestManagementConsentEvidenceCommitmentSha256:pilot.sha256('consent'),
    successDisposition:'ROLLBACK_TO_BEFORE_STATE',
    healthSensitiveDataAllowed:false,
    formalLegalValidationComplete:true,
    formalLegalValidationReference:'formal-validation-simulated',
    ownerW5RealDataAuthorization:true
  });
  assert.equal(r.ok,true);
  assert.equal(r.executionAllowed,false);
  assert.equal(r.realDataAllowed,false);
  assert.equal(r.productionAllowed,false);
});

test('S4.60 source package is ready but requires external human inputs',()=>{
  const r=s.sourceReadiness();
  assert.equal(r.externalGatePackageReady,true);
  assert.equal(r.technicalW5Ready,true);
  assert.equal(r.executionAllowed,false);
  assert.equal(r.realDataAllowed,false);
  assert.ok(r.nextHumanInputs.length>=10);
});
