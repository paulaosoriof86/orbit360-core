'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const p = require('./cotcomp-callable-policy');

test('runtime export remains disabled', () => {
  assert.equal(p.RUNTIME_EXPORT_ALLOWED,false);
});

test('all public callable candidates enforce App Check', () => {
  for (const policy of Object.values(p.CALLABLE_POLICY)) {
    assert.equal(policy.enforceAppCheck,true);
    assert.equal(policy.writesAllowed,false);
  }
});

test('replay-protection candidate is reserved for mutation-sensitive operations', () => {
  assert.equal(p.CALLABLE_POLICY.VALIDATE_DRAFT.consumeAppCheckToken,false);
  assert.equal(p.CALLABLE_POLICY.FETCH_COMPARABLE_PROPOSALS.consumeAppCheckToken,false);
  assert.equal(p.CALLABLE_POLICY.SUBMIT_HANDOFF.consumeAppCheckToken,true);
  assert.equal(p.CALLABLE_POLICY.SELECT_PROPOSAL.consumeAppCheckToken,true);
});

test('case access is required only after a case exists', () => {
  assert.equal(p.CALLABLE_POLICY.VALIDATE_DRAFT.caseAccessRequired,false);
  assert.equal(p.CALLABLE_POLICY.SUBMIT_HANDOFF.caseAccessRequired,false);
  assert.equal(p.CALLABLE_POLICY.FETCH_COMPARABLE_PROPOSALS.caseAccessRequired,true);
  assert.equal(p.CALLABLE_POLICY.SELECT_PROPOSAL.caseAccessRequired,true);
});

test('callable request app state maps to public App Check context', () => {
  const noApp = p.publicAuthContextFromCallable({},'VALIDATE_DRAFT');
  assert.equal(noApp.appCheckVerified,false);

  const withApp = p.publicAuthContextFromCallable({app:{appId:'web-app'}},'VALIDATE_DRAFT');
  assert.equal(withApp.appCheckVerified,true);
});

test('case access must be explicitly verified for proposal operations', () => {
  const denied = p.publicAuthContextFromCallable({app:{appId:'web-app'}},'SELECT_PROPOSAL',false);
  assert.equal(denied.caseAccessVerified,false);
  const allowed = p.publicAuthContextFromCallable({app:{appId:'web-app'}},'SELECT_PROPOSAL',true);
  assert.equal(allowed.caseAccessVerified,true);
});
