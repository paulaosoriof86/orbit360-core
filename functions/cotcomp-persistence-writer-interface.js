'use strict';

const adapter = require('./cotcomp-persistence-adapter-candidate');

const VERSION = 'ays-cotcomp-persistence-writer-interface-s422-v0.1';
const EXECUTION_ENABLED = false;
const WRITES_ENABLED = false;
const DEPENDENCY_CALLS_ALLOWED = false;
const SERVER_SIDE_ONLY = true;

const REQUIRED_DEPENDENCIES = Object.freeze({
  storage: Object.freeze([
    'read',
    'runAtomicGroup',
    'patch'
  ]),
  clock: Object.freeze([
    'nowIso'
  ]),
  audit: Object.freeze([
    'record'
  ])
});

function isFn(value) {
  return typeof value === 'function';
}

function validateDependencies(deps = {}) {
  const missing = [];
  for (const [group, methods] of Object.entries(REQUIRED_DEPENDENCIES)) {
    const target = deps[group];
    if (!target || typeof target !== 'object') {
      missing.push(group);
      continue;
    }
    for (const method of methods) {
      if (!isFn(target[method])) missing.push(group + '.' + method);
    }
  }
  return {
    ok: missing.length === 0,
    missing,
    serverSideOnly: SERVER_SIDE_ONLY
  };
}

function dependencyContract() {
  return {
    storage: {
      read: 'async ({path}) => document|null',
      runAtomicGroup: 'async ({group,commands,context}) => result',
      patch: 'async ({path,patch,context}) => result'
    },
    clock: {
      nowIso: '() => ISO-8601 timestamp'
    },
    audit: {
      record: 'async ({type,caseId,correlationId,digest,status}) => void'
    },
    forbidden: [
      'browser_firestore_sdk',
      'direct_public_workflow_write',
      'provider_or_rater_call',
      'issuance_or_payment'
    ]
  };
}

function assertExecutionClosed() {
  if (EXECUTION_ENABLED !== true || WRITES_ENABLED !== true || DEPENDENCY_CALLS_ALLOWED !== true) {
    const error = new Error('COTCOMP_WRITER_EXECUTION_DISABLED');
    error.code = 'COTCOMP_WRITER_EXECUTION_DISABLED';
    throw error;
  }
}

function createWriter(deps = {}) {
  const dependencyState = validateDependencies(deps);

  function previewInitialHandoff(input = {}) {
    return {
      ...adapter.compileInitialHandoff(input),
      writerVersion: VERSION,
      dependencyState,
      serverSideOnly: SERVER_SIDE_ONLY
    };
  }

  function previewProposal(input = {}) {
    return {
      ...adapter.compileProposal(input),
      writerVersion: VERSION,
      dependencyState,
      serverSideOnly: SERVER_SIDE_ONLY
    };
  }

  function previewSelection(input = {}) {
    return {
      ...adapter.compileSelection(input),
      writerVersion: VERSION,
      dependencyState,
      serverSideOnly: SERVER_SIDE_ONLY
    };
  }

  async function executeInitialHandoff() {
    assertExecutionClosed();
  }

  async function executeProposal() {
    assertExecutionClosed();
  }

  async function executeSelection() {
    assertExecutionClosed();
  }

  return Object.freeze({
    VERSION,
    EXECUTION_ENABLED,
    WRITES_ENABLED,
    DEPENDENCY_CALLS_ALLOWED,
    SERVER_SIDE_ONLY,
    dependencyState,
    previewInitialHandoff,
    previewProposal,
    previewSelection,
    executeInitialHandoff,
    executeProposal,
    executeSelection
  });
}

module.exports = Object.freeze({
  VERSION,
  EXECUTION_ENABLED,
  WRITES_ENABLED,
  DEPENDENCY_CALLS_ALLOWED,
  SERVER_SIDE_ONLY,
  REQUIRED_DEPENDENCIES,
  validateDependencies,
  dependencyContract,
  assertExecutionClosed,
  createWriter
});
