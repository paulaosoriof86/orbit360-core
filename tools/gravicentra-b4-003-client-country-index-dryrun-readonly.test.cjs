'use strict';
// Fake identities; never opens Firebase or outputs client identifiers.
const assert=require('node:assert/strict');
const {planCountryIndex,physicalReadLimit}=require('./gravicentra-b4-003-client-country-index-dryrun-readonly.cjs');
const tenantId='synthetic-tenant';
const clients=[
 {id:'gt-normal',tenantId,pais:'GT'},
 {id:'co-missing',tenantId},
 {id:'co-ambiguous',tenantId,pais:'GT',country:'CO',paisRequiereValidacion:true},
 {id:'gt-label',tenantId,pais:'Guatemala'},
 {id:'gt-crossborder',tenantId,pais:'GT'},
 {id:'unlinked',tenantId}
];
const policies=[
 {id:'p1',tenantId,clienteId:'co-missing',pais:'CO',aseguradoraId:'co'},
 {id:'p2',tenantId,clienteId:'co-ambiguous',pais:'CO',aseguradoraId:'co'},
 {id:'p3',tenantId,clienteId:'gt-crossborder',pais:'CO',aseguradoraId:'co'},
 {id:'p4',tenantId,clienteId:'orphan',pais:'GT',aseguradoraId:'gt'}
];
const insurers=[{id:'co',tenantId,pais:'CO'},{id:'gt',tenantId,pais:'GT'}];
const plan=planCountryIndex({clients,policies,insurers,tenantId});
assert.deepEqual(plan.indexedAlready,{GT:2,CO:0});
assert.deepEqual(plan.indexUpdateCandidates,{GT:1,CO:2});
assert.equal(plan.candidateAuthority.client,3);
assert.equal(plan.candidateAuthority.insurer,2);
assert.deepEqual(plan.unresolvable,{COMPLETE_POLICY_RELATION_REQUIRED:1});
assert.equal(plan.sourceCountryNotCanonical,2);
assert.equal(plan.crossBorderClientExplicitPreserved,1);
assert.equal(plan.distinctPolicyRefsMissingClient,1);
assert.equal(plan.writes,0);
assert.equal(plan.applyAuthorized,false);
assert.equal(plan.executablePatchesExported,false);
assert.equal(JSON.stringify(plan).includes('co-missing'),false);
assert.throws(()=>planCountryIndex({clients,policies,insurers,tenantId:''}),/TENANT_REQUIRED/);
assert.throws(()=>planCountryIndex({clients:[...clients,clients[0]],policies,insurers,tenantId}),/CLIENT_IDENTITY_INVALID/);
assert.throws(()=>planCountryIndex({clients,policies,insurers:[...insurers,insurers[0]],tenantId}),/INSURER_IDENTITY_INVALID/);
assert.throws(()=>planCountryIndex({clients,policies:[...policies,{id:'x',tenantId}],insurers,tenantId}),/POLICY_CLIENT_REQUIRED/);
assert.equal(planCountryIndex({clients:[{...clients[0],_sourceIdMismatch:true}],policies:[],insurers,tenantId})
 .unresolvable.CLIENT_DOCUMENT_ID_CONFLICT,1);
assert.equal(physicalReadLimit('clientes'),2500);
assert.equal(physicalReadLimit('polizas'),5000);
assert.equal(physicalReadLimit('aseguradoras'),1000);
assert.throws(()=>physicalReadLimit('non_allowlisted_collection'),/NOT_ALLOWLISTED/);
console.log('B4_003_CLIENT_COUNTRY_INDEX_DRYRUN_PASS cases=22 zero_writes=true no_identifiers_exported=true');
