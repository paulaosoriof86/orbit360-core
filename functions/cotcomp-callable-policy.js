'use strict';

const VERSION = 'ays-cotcomp-callable-policy-s410-v0.1';
const RUNTIME_EXPORT_ALLOWED = false;

const CALLABLE_POLICY = Object.freeze({
  VALIDATE_DRAFT: Object.freeze({
    enforceAppCheck: true,
    consumeAppCheckToken: false,
    caseAccessRequired: false,
    writesAllowed: false
  }),
  SUBMIT_HANDOFF: Object.freeze({
    enforceAppCheck: true,
    consumeAppCheckToken: true,
    caseAccessRequired: false,
    writesAllowed: false
  }),
  FETCH_COMPARABLE_PROPOSALS: Object.freeze({
    enforceAppCheck: true,
    consumeAppCheckToken: false,
    caseAccessRequired: true,
    writesAllowed: false
  }),
  SELECT_PROPOSAL: Object.freeze({
    enforceAppCheck: true,
    consumeAppCheckToken: true,
    caseAccessRequired: true,
    writesAllowed: false
  })
});

function callablePolicy(operation) {
  return CALLABLE_POLICY[operation] || null;
}

function publicAuthContextFromCallable(request = {}, operation, caseAccessVerified = false) {
  const policy = callablePolicy(operation);
  return {
    channel: 'PUBLIC_WEB',
    appCheckVerified: !!request.app,
    caseAccessVerified: policy && policy.caseAccessRequired ? caseAccessVerified === true : false
  };
}

module.exports = Object.freeze({
  VERSION,
  RUNTIME_EXPORT_ALLOWED,
  CALLABLE_POLICY,
  callablePolicy,
  publicAuthContextFromCallable
});
