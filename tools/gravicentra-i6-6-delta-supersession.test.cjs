'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const guardPath = fs.existsSync('tools/gravicentra-i6-6-delta-guard.mjs')
  ? 'tools/gravicentra-i6-6-delta-guard.mjs'
  : '../gravicentra-i6-6-delta-guard.mjs';
const source = fs.readFileSync(guardPath, 'utf8');
const begin = source.indexOf('function approveOrSupersede(entry,changeId){');
const end = source.indexOf('\nfor(const change of manifest.changes)', begin);
assert.ok(begin >= 0 && end > begin, 'test must execute actual I6.6 guard supersession function');
const checkImplementation = source.slice(begin, end);
const sha = letter => letter.repeat(40);
const path = 'orbit360-platform/core/policy-receipts-engine.js';
const A = 'I6_6_ORIGINAL';
const B = 'I6_6_CARLOS_RENEWABILITY';
const C = 'I6_6_LATER_PATCH';

function harness() {
  const approved = new Map();
  const context = vm.createContext({
    approved,
    need(condition, reason) { if(!condition) throw new Error(reason); }
  });
  vm.runInContext(checkImplementation, context, {timeout:2000});
  return {
    approved,
    approve(entry,id) {
      context.entry = entry;
      context.changeId = id;
      vm.runInContext('approveOrSupersede(entry,changeId)', context, {timeout:2000});
    }
  };
}

test('I6.6 explicit chained supersession keeps original receipt and the final source SHA only', () => {
  const h = harness();
  h.approve({path,gitBlobSha:sha('a')},A);
  h.approve({path,gitBlobSha:sha('b'),replaces:{path,priorGitBlobSha:sha('a'),priorChangeId:A}},B);
  h.approve({path,gitBlobSha:sha('c'),replaces:{path,priorGitBlobSha:sha('b'),priorChangeId:B}},C);
  assert.equal(h.approved.size,1);
  assert.equal(h.approved.get(path).gitBlobSha,sha('c'));
  assert.equal(h.approved.get(path).changeId,C);
});

test('I6.6 duplicate source without replaces is refused', () => {
  const h=harness();
  h.approve({path,gitBlobSha:sha('a')},A);
  assert.throws(()=>h.approve({path,gitBlobSha:sha('b')},B),/UNAUTHORIZED_OR_BROKEN_SUPERSESSION_CHAIN/);
});

test('I6.6 altered predecessor SHA or predecessor change ID is refused', () => {
  const h=harness();
  h.approve({path,gitBlobSha:sha('a')},A);
  assert.throws(()=>h.approve({path,gitBlobSha:sha('b'),replaces:{path,priorGitBlobSha:sha('f'),priorChangeId:A}},B),/UNAUTHORIZED_OR_BROKEN_SUPERSESSION_CHAIN/);
  assert.throws(()=>h.approve({path,gitBlobSha:sha('b'),replaces:{path,priorGitBlobSha:sha('a'),priorChangeId:'I6_6_NOT_ORIGINAL'}},B),/UNAUTHORIZED_OR_BROKEN_SUPERSESSION_CHAIN/);
});

test('I6.6 missing predecessor, mismatched path and unchanged SHA are refused', () => {
  const h=harness();
  assert.throws(()=>h.approve({path,gitBlobSha:sha('b'),replaces:{path,priorGitBlobSha:sha('a'),priorChangeId:A}},B),/SUPERSESSION_WITHOUT_PREDECESSOR/);
  h.approve({path,gitBlobSha:sha('a')},A);
  assert.throws(()=>h.approve({path,gitBlobSha:sha('b'),replaces:{path:'orbit360-platform/other.js',priorGitBlobSha:sha('a'),priorChangeId:A}},B),/UNAUTHORIZED_OR_BROKEN_SUPERSESSION_CHAIN/);
  assert.throws(()=>h.approve({path,gitBlobSha:sha('a'),replaces:{path,priorGitBlobSha:sha('a'),priorChangeId:A}},B),/UNAUTHORIZED_OR_BROKEN_SUPERSESSION_CHAIN/);
});

test('I6.6 cyclic same-change supersession is refused and change IDs are constrained to unique entries',()=>{
  const h=harness();
  h.approve({path,gitBlobSha:sha('a')},A);
  assert.throws(()=>h.approve({path,gitBlobSha:sha('b'),replaces:{path,priorGitBlobSha:sha('a'),priorChangeId:A}},A),/UNAUTHORIZED_OR_BROKEN_SUPERSESSION_CHAIN/);
  assert.match(source,/seenChangeIds\.has\(change\.id\)/);
  assert.match(source,/seenChangeIds\.add\(change\.id\)/);
});

