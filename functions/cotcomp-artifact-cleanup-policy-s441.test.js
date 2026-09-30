'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const c=require('./cotcomp-artifact-cleanup-policy-s441');

test('cleanup candidate is LAB-only and not pre-authorized',()=>{
  assert.equal(c.POLICY.projectId,'ays-orbit-360-lab');
  assert.equal(c.POLICY.location,'us-central1');
  assert.equal(c.POLICY.executionAuthorized,false);
  assert.equal(c.POLICY.officialFirebaseDefaultRetentionDays,1);
  assert.equal(c.POLICY.recommendedCandidateRetentionDays,7);
});

test('cleanup policy cannot execute without a separate Owner gate',()=>{
  const s=c.evaluateCleanupGate({
    projectId:'ays-orbit-360-lab',
    location:'us-central1',
    ownerAuthorized:false
  });
  assert.equal(s.readyToExecute,false);
  assert.ok(s.blockers.includes('EXPLICIT_OWNER_AUTHORIZATION_REQUIRED'));
});

test('candidate command cannot target production',()=>{
  assert.match(c.POLICY.candidateCommand,/ays-orbit-360-lab/);
  assert.doesNotMatch(c.POLICY.candidateCommand,/prod|production/i);
});
