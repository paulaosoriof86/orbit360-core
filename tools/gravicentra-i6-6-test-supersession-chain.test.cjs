'use strict';
// Test evolution in the SAME release is also cumulative: historical receipts
// remain immutable, but only the final exact test SHA is executed at HEAD.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('tools/gravicentra-i6-6-delta-guard.mjs','utf8');
const begin=source.indexOf('function approveTestOrSupersede(entry,changeId){');
const end=source.indexOf('\nfor(const change of manifest.changes)',begin);
assert.ok(begin>=0&&end>begin,'EXACT_GUARD_TEST_OWNER_PRESENT');
const body=source.slice(begin,end);
const tests=new Map();
const context=vm.createContext({tests,need(condition,reason){if(!condition)throw Error(reason);}});
vm.runInContext(body,context,{timeout:2000});
function approve(id,sha,replaces){
  context.entry={path:'tools/gravicentra-i6-6-sample.test.cjs',gitBlobSha:sha,...(replaces?{replaces}:{})};
  context.changeId=id;
  vm.runInContext('approveTestOrSupersede(entry,changeId)',context,{timeout:2000});
}
const a='a'.repeat(40),b='b'.repeat(40),c='c'.repeat(40);
approve('ORIGINAL',a);
approve('SHARED_REFERENCE',a);
assert.equal(tests.size,1);
assert.equal(tests.values().next().value.gitBlobSha,a);
assert.throws(()=>approve('BROKEN',b),/TEST_UNAUTHORIZED_OR_BROKEN_SUPERSESSION_CHAIN/);
assert.throws(()=>approve('BAD_PRIOR',b,{path:'tools/gravicentra-i6-6-sample.test.cjs',priorGitBlobSha:c,priorChangeId:'SHARED_REFERENCE'}),/TEST_UNAUTHORIZED_OR_BROKEN_SUPERSESSION_CHAIN/);
approve('NEW_VERSION',b,{path:'tools/gravicentra-i6-6-sample.test.cjs',priorGitBlobSha:a,priorChangeId:'SHARED_REFERENCE'});
assert.equal(tests.values().next().value.gitBlobSha,b);
assert.throws(()=>approve('NOOP_OVERLAY',b,{path:'tools/gravicentra-i6-6-sample.test.cjs',priorGitBlobSha:b,priorChangeId:'NEW_VERSION'}),/TEST_SUPERSESSION_WITHOUT_CHANGED_PREDECESSOR/);
console.log('I66_GOVERNED_TEST_SUPERSESSION_CHAIN_7_7_PASS');
