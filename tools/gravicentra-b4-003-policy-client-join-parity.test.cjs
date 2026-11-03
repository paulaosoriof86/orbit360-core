'use strict';
const assert=require('node:assert/strict');
const {auditCountryClientParity}=require('./gravicentra-b4-003-policy-client-join-audit-readonly.cjs');
const clients=[
 {id:'co_c',pais:'CO'}, {id:'gt_c',pais:'GT'},
 {id:'merged_c',pais:'CO',fusionado:true,mergedIntoClientId:'co_c'},
 {id:'qa_c',pais:'GT',__syntheticQa:true}
];
const base=[
 {id:'co_p',pais:'CO',clienteId:'co_c'},
 {id:'gt_cross_p',pais:'GT',clienteId:'co_c'},
 {id:'gt_p',pais:'GT',clienteId:'gt_c'},
 {id:'flagged_qa_p',pais:'GT',clienteId:'qa_c',__syntheticQa:true},
 {id:'b2_qa_p',pais:'GT',clienteId:'qa_c',sourceRef:'B2 QA firme · fixture'}
];
const a=auditCountryClientParity({clients,policies:base});
assert.equal(a.clientUniverse.physical,4);
assert.equal(a.clientUniverse.merged,1);
assert.equal(a.clientUniverse.commercial,3);
assert.equal(a.clientUniverse.commercialByCountry.CO,1);
assert.equal(a.policyUniverse.countryCOAll,1);
assert.equal(a.policyUniverse.coClientLinkedAll,2);
assert.equal(a.policyUniverse.coClientLinkedCommercial,2);
assert.deepEqual([a.setParityCOAll.intersection,a.setParityCOAll.onlyInClientCentric,
 a.setParityCOAll.onlyInPolicyCountry],[1,1,0]);
assert.deepEqual([a.setParityCO.intersection,a.setParityCO.onlyInClientCentric,
 a.setParityCO.onlyInPolicyCountry,a.setParityCO.symmetricDifference],[1,1,0,1]);
assert.deepEqual([a.qaProvenance.explicit,a.qaProvenance.b2Source,
 a.qaProvenance.overlap,a.qaProvenance.union],[1,1,0,2]);
const b=auditCountryClientParity({clients,policies:[
 ...base,{id:'co_border_p',pais:'CO',clienteId:'gt_c'}
]});
assert.deepEqual([b.setParityCO.intersection,b.setParityCO.onlyInClientCentric,
 b.setParityCO.onlyInPolicyCountry,b.setParityCO.symmetricDifference],[1,1,1,2]);
const redacted=JSON.stringify(b);
for(const needle of ['gt_cross_p','co_border_p','merged_c','co_c','gt_c'])
 assert.ok(!redacted.includes(needle),'ID leaked '+needle);
assert.equal(b.recordIdentifiersExported,false);
assert.equal(b.writes,0);
assert.match(b.setParityCO.clientCentricDigest,/^[a-f0-9]{64}$/);
console.log('B4_003_COUNTRY_CLIENT_ID_SET_PARITY_SYNTHETIC=PASS cases=2 identifiers_exported=false writes=0');
