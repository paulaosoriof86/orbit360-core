'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const artifact = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname,
  '../artifacts/orbit360-recovery/source-batches/I6_6_SOURCE_CENDOSO_PAID_CANDIDATES_2026.json.gz'))).toString('utf8'));

test('Cendoso 2026: five original files, repeatable 607 candidates, four held', () => {
  assert.equal(artifact.schemaVersion, 'GRAVICENTRA_I6_6_CENDOSO_PAID_CANDIDATES_V1');
  assert.equal(artifact.sourceFiles.length, 5);
  assert.equal(artifact.counts.distinctPaidCandidates, 607);
  assert.equal(artifact.candidates.length, 607);
  assert.equal(artifact.counts.sourceEligibleForCanonicalMatch, 603);
  assert.equal(artifact.counts.sourceHeld, 4);
  assert.equal(artifact.counts.conflictingPaidDateObligationGroups, 2);
  assert.equal(artifact.sourceFolioReceiptEmptyInAllCandidateRows, true);
  assert.equal(artifact.canonicalReceiptMatchRequired, true);
  assert.equal(artifact.ownerPaymentEvidenceSufficiencyQuestionPending, true);
  assert.equal(new Set(artifact.candidates.map(row => row.candidateId)).size, 607);
});

test('Cendoso candidates never authorize payment and keep net/gross separate', () => {
  const forbidden = new Set(['cliente', 'clienteId', 'nombreCliente', 'email', 'telefono', 'password', 'token', 'credential']);
  let held = 0;
  for (const row of artifact.candidates) {
    for (const key of Object.keys(row)) assert.equal(forbidden.has(key), false, `Unexpected private field ${key}`);
    assert.match(row.actualPaidDate, /^2026-\d{2}-\d{2}$/);
    assert.match(row.totalPremium, /^\d+\.\d{2}$/);
    assert.ok(Object.hasOwn(row, 'netPremium'));
    assert.ok(row.policyNumberSource && row.insurerSource && row.receiptPeriodStart);
    assert.ok(row.sourceRows.length >= 1);
    if (row.holdReasons.length) {
      held++;
      assert.equal(row.preMatchStatus, 'SOURCE_HOLD');
    } else {
      assert.equal(row.preMatchStatus, 'AWAITING_CANONICAL_RECEIPT_MATCH_AND_OWNER_PROOF_RULE');
    }
  }
  assert.equal(held, 4);
  assert.equal(artifact.candidates.filter(row => row.insurerSource === 'La General' && row.holdReasons.includes('CONFLICTING_SOURCE_PAID_DATES')).length, 4);
  assert.doesNotMatch(artifact.allowedNextStep, /skip|bypass|direct_write/i);
});
