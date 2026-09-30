'use strict';

const VERSION = 'ays-cotcomp-appcheck-proof-plan-s441-v1.0';

const TARGET = Object.freeze({
  projectId:'ays-orbit-360-lab',
  environment:'LAB',
  region:'us-central1',
  deployedSourceSha:'17d599e884d5b834b73b9499d8cef177575d56f9'
});

const FUNCTIONS = Object.freeze([
  'cotcompValidateDraft',
  'cotcompSubmitHandoff',
  'cotcompFetchComparableProposals',
  'cotcompSelectProposal'
]);

const PROOF = Object.freeze({
  providerMode:'FIREBASE_APPCHECK_DEBUG_PROVIDER_IN_CI',
  clientMode:'FIREBASE_WEB_CLIENT_SDK',
  browserRequired:true,
  directRawHttpForbidden:true,
  adminBypassForbidden:true,
  appCheckWeakeningForbidden:true,
  syntheticProofRequired:true,
  persistenceExpected:false,
  appDataWritesExpected:0,
  realDataAllowed:false,
  productionAllowed:false,
  debugTokenMustBeSecret:true,
  debugTokenMustNeverBeCommitted:true,
  debugTokenMustNeverBePrinted:true,
  debugBuildMustNeverShipToProduction:true,
  callableSequence:FUNCTIONS
});

function evaluatePreflight(input = {}) {
  const blockers = [];
  const warnings = [];

  if (input.projectId !== TARGET.projectId) blockers.push('LAB_PROJECT_ID_MISMATCH');
  if (input.webAppCount !== 1) blockers.push('EXACTLY_ONE_LAB_WEB_APP_REQUIRED');
  if (input.sdkConfigResolvable !== true) blockers.push('WEB_SDK_CONFIG_NOT_RESOLVABLE');
  if (input.debugTokenSecretPresent !== true) blockers.push('APPCHECK_DEBUG_TOKEN_SECRET_REQUIRED');
  if (input.deployedSourceSha && input.deployedSourceSha !== TARGET.deployedSourceSha) blockers.push('DEPLOYED_SOURCE_SHA_MISMATCH');
  if (input.persistenceEnabled === true) blockers.push('PERSISTENCE_MUST_REMAIN_OFF');
  if (input.productionTargeted === true) blockers.push('PRODUCTION_FORBIDDEN');

  if (input.webAppCount > 1) warnings.push('SELECT_EXPLICIT_LAB_WEB_APP_BEFORE_PROOF');

  return Object.freeze({
    version:VERSION,
    target:TARGET,
    functions:FUNCTIONS.slice(),
    proof:PROOF,
    ready:blockers.length === 0,
    blockers,
    warnings,
    nextAction:blockers.length === 0
      ? 'RUN_VALID_APPCHECK_SYNTHETIC_BROWSER_PROOF'
      : 'RESOLVE_PREFLIGHT_BLOCKERS_WITHOUT_WEAKENING_SECURITY'
  });
}

module.exports = Object.freeze({
  VERSION,
  TARGET,
  FUNCTIONS,
  PROOF,
  evaluatePreflight
});
