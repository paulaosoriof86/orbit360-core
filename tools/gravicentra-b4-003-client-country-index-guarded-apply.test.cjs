'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {computeExactCandidates,previousPaisEqual,versionEqual,restorationPatch,expectedPostAggregate}=
 require('./gravicentra-b4-003-client-country-index-guarded-apply.cjs');
const frozen=JSON.parse(fs.readFileSync('artifacts/orbit360-recovery/release-control/I6_5_B4_003_REAL_COUNTRY_INDEX_DRYRUN_AGGREGATE_20261102.json','utf8'));

assert.equal(previousPaisEqual({pais:'GT'},{hadPais:true,beforePais:'GT'}),true);
assert.equal(previousPaisEqual({pais:'CO'},{hadPais:true,beforePais:'GT'}),false);
assert.equal(previousPaisEqual({}, {hadPais:false,beforePais:null}),true);
assert.equal(previousPaisEqual({pais:null}, {hadPais:false,beforePais:null}),false);
assert.equal(previousPaisEqual({}, {hadPais:true,beforePais:null}),false);
assert.equal(versionEqual({seconds:1790000000,nanoseconds:123000000},{versionSeconds:1790000000,versionNanos:123000000}),true);
assert.equal(versionEqual({seconds:1790000000,nanoseconds:123000001},{versionSeconds:1790000000,versionNanos:123000000}),false);
const fakeFieldValue={delete:()=>Symbol.for('safe-field-delete')};
assert.deepEqual(restorationPatch({hadPais:true,beforePais:'REQUIERE_VALIDACION'},fakeFieldValue),{pais:'REQUIERE_VALIDACION'});
assert.equal(restorationPatch({hadPais:false,beforePais:null},fakeFieldValue).pais,Symbol.for('safe-field-delete'));
assert.deepEqual(restorationPatch({hadPais:true,beforePais:null},fakeFieldValue),{pais:null});

const post={...frozen,indexedAlready:{GT:392,CO:48},indexUpdateCandidates:{GT:0,CO:0}};
assert.equal(expectedPostAggregate(post),true);
assert.throws(()=>expectedPostAggregate({...post,indexUpdateCandidates:{GT:0,CO:1}}),/POST_APPLY_AGGREGATE_MISMATCH/);
assert.throws(()=>expectedPostAggregate({...post,distinctPolicyRefsMissingClient:2}),/POST_APPLY_AGGREGATE_MISMATCH/);
assert.throws(()=>computeExactCandidates({clients:[],policies:[],insurers:[]}),/COUNTRY_INDEX_FROZEN_AGGREGATE_CHANGED/);

const source=fs.readFileSync('tools/gravicentra-b4-003-client-country-index-guarded-apply.cjs','utf8');
assert.match(source,/GRAVICENTRA_B4003_OWNER_COUNTRY_APPLY_20261102/);
assert.match(source,/CONCURRENT_CLIENT_CHANGE_ABORT/);
assert.match(source,/tx\.update\(clientRefs\[i\],\{pais:exact\.entries\[i\]\.afterPais\}\)/);
assert.match(source,/tx\.create\(applied,/);
assert.match(source,/__gravicentraPrivateMigrationVault/);
assert.doesNotMatch(source,/console\.log\([^\n]*(?:clientId|\.entries|\.beforePais)/);
console.log('B4_003_COUNTRY_INDEX_GUARDED_APPLY_QA_PASS 16 checks no_network no_real_writes');
