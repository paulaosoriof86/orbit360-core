'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

test('S4.38 runtime entry exports exact four-callable surface only', () => {
  const runtime = require('./cotcomp-runtime-entry-s438');
  assert.deepEqual(Object.keys(runtime), [
    'cotcompValidateDraft',
    'cotcompSubmitHandoff',
    'cotcompFetchComparableProposals',
    'cotcompSelectProposal'
  ]);
  for (const value of Object.values(runtime)) {
    assert.equal(typeof value, 'function');
  }
});

test('runtime entry source has no Firestore/Admin dependency or persistence writer import', () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(require.resolve('./cotcomp-runtime-entry-s438'), 'utf8');
  assert.equal(source.includes('firebase-admin'), false);
  assert.equal(source.includes('firestore'), false);
  assert.equal(source.includes('cotcomp-persistence'), false);
  assert.equal(source.includes('ops-leads-domain'), false);
});

test('synthetic fixture is explicit and isolated in runtime entry source', () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(require.resolve('./cotcomp-runtime-entry-s438'), 'utf8');
  assert.equal(source.includes("cotcomp-s440-synthetic-case"), true);
  assert.equal(source.includes("synthetic-proof-only"), true);
  assert.equal(source.includes("request.data.syntheticProof === true"), true);
});
