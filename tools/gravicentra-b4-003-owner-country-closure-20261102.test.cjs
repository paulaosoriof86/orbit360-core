'use strict';
// Synthetic, zero-network test of the guarded GT/GT/CO business decisions.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {selectOwnerDecisions,patchFor,restorePatch,matchesBefore,approvedPost}=
 require('./gravicentra-b4-003-owner-country-closure-20261102.cjs');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const v={seconds:1793635200,nanoseconds:123000};
const mk=(id,pais,paisFuente)=>({id,pais,paisFuente,paisRequiereValidacion:true,
 _firestoreUpdateTime:{...v}});
const fixture=()=>({clients:[
 mk('qa-unresolved-missing','REQUIERE_VALIDACION','requiere_decision_humana'),
 mk('qa-unresolved-region','GT','cod_region_ausente_o_no_confiable'),
 mk('qa-unresolved-geography','GT','sin_evidencia_geografica_confiable'),
 {id:'qa-resolved','pais':'CO',paisRequiereValidacion:false,_firestoreUpdateTime:{...v}}
],policies:[],insurers:[]});
const identities={country_missing:hash('qa-unresolved-missing'),
 source_region_unreliable:hash('qa-unresolved-region'),
 source_geography_unreliable:hash('qa-unresolved-geography')};
const selected=selectOwnerDecisions(fixture(),identities);
assert.equal(selected.entries.length,3);
assert.equal(selected.entries.filter(e=>e.afterCountry==='GT').length,2);
assert.equal(selected.entries.filter(e=>e.afterCountry==='CO').length,1);
assert.equal(selected.manifestDigest.length,64);
for(const e of selected.entries){
 const before=fixture().clients.find(c=>c.id===e.clientId);
 const patch=patchFor(e);
 assert.equal(patch.pais,e.afterCountry);
 assert.equal(patch.paisRequiereValidacion,false);
 assert.equal(patch.paisFuente,'direccion_confirmada_20261102');
 assert.equal(matchesBefore(before,e),true);
 assert.equal(matchesBefore({...before,...patch},e),false);
 const deleted={__fieldValueDelete:true};
 const restored=restorePatch(e,{delete:()=>deleted});
 assert.equal(restored.pais,before.pais);
 assert.equal(restored.paisRequiereValidacion,true);
 assert.equal(restored.paisFuente,before.paisFuente);
}
const fail=(input,pattern,expected=identities)=>assert.throws(
 ()=>selectOwnerDecisions(input,expected),pattern);
fail(fixture(),/OWNER_COUNTRY_STOP_OWNER_CLIENT_IDENTITY_CHANGED/,
 {...identities,country_missing:hash('qa-replaced-client')});
const extra=fixture();extra.clients.push(mk('qa-extra','GT','sin_evidencia_geografica_confiable'));
fail(extra,/OWNER_COUNTRY_STOP_UNRESOLVED_CARDINALITY_CHANGED/);
const mismatch=fixture();mismatch.clients[0].country='CO';
fail(mismatch,/OWNER_COUNTRY_STOP_OWNER_DECISION_WOULD_NOT_CLOSE/);
const noVersion=fixture();delete noVersion.clients[1]._firestoreUpdateTime;
fail(noVersion,/OWNER_COUNTRY_STOP_VERSION_REQUIRED/);
const hasPolicy=fixture();hasPolicy.policies.push({id:'qa-policy',clienteId:'qa-unresolved-region',aseguradoraId:'missing'});
fail(hasPolicy,/OWNER_COUNTRY_STOP_OTHER_UNRESOLVED_CAUSE/);
const after={counts:{clients:443,policies:1425,insurers:33},indexedAlready:{GT:394,CO:49},
 indexUpdateCandidates:{GT:0,CO:0},unresolvable:{},distinctPolicyRefsMissingClient:3,
 candidateAuthority:{client:379,insurer:64}};
assert.equal(approvedPost(after),true);
assert.throws(()=>approvedPost({...after,unresolvable:{COMPLETE_POLICY_RELATION_REQUIRED:1}}),
 /OWNER_COUNTRY_STOP_POST_AGGREGATE_MISMATCH/);
assert.throws(()=>approvedPost({...after,distinctPolicyRefsMissingClient:2}),
 /OWNER_COUNTRY_STOP_POST_AGGREGATE_MISMATCH/);
console.log('B4_003_OWNER_COUNTRY_SYNTHETIC_TESTS=PASS identityBinding=3 dryrunClosure=3 backupRestorePatch=PASS wrongIdentity=BLOCKED unresolved=0(expected) actualFirestoreWrites=0');
