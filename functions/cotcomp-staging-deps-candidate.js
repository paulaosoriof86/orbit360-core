'use strict';

const VERSION = 'ays-cotcomp-staging-deps-candidate-s413-v0.1';
const READY = false;
const PERSISTENCE_ENABLED = false;

async function verifyCaseAccess() {
  throw new Error('S413_CASE_ACCESS_ADAPTER_NOT_IMPLEMENTED');
}

async function loadProposals() {
  throw new Error('S413_PROPOSAL_READ_ADAPTER_NOT_IMPLEMENTED');
}

module.exports = Object.freeze({
  VERSION,
  READY,
  PERSISTENCE_ENABLED,
  verifyCaseAccess,
  loadProposals
});
