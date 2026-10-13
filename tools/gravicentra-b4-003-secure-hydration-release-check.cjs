'use strict';
// QA-only readiness discriminant; evidence of a release HOLD is not a security PASS.
const fs=require('node:fs'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const cp=JSON.parse(read('artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json'));
const firebase=JSON.parse(read('firebase.json'));
const index=read('orbit360-platform/index.html');
const store=read('orbit360-platform/data/store-firestore-product-readonly-p0.js');
const provider=read('orbit360-platform/core/product-runtime-browser-providers-p0.js');
const bootstrap=read('functions/bootstrap.js');
const deployedSource=read('firestore.rules');
const hold=cp.b4003SecurityReleaseHold||{};
const staged=cp.b4003ScopedRelatedReadStaging||{};
const findings={
  browserEntrypointLoadsDirectFirestoreStore:index.includes('data/store-firestore-product-readonly-p0.js'),
  storeUsesDirectGetAndListener:store.includes('getDocsFromServer')&&store.includes('onSnapshot'),
  browserReadsSystemConfig:provider.includes("'tenants/'+tenantId+'/system/config'")&&provider.includes('ctx.modules.store.getDoc(ref)'),
  protectedCallableNotExported:!bootstrap.includes("require('./b4-003-scoped-policy-callable')"),
  candidateRulesNotConfigured:firebase.firestore.rules!=='firestore.b4-003-scoped-candidate.rules',
  broadLegacyRulesPresent:deployedSource.includes('allow read, write: if isTenantMember(tenantId);'),
  authenticatedPreviewUnproven:staged.listQa?.previewCertified!==true
};
const blocked=Object.values(findings).some(Boolean);
assert.equal(cp.gateState?.gates?.I6?.activeSubgate,'I6.5');
if(blocked){
 assert.equal(hold.firestoreRulesDeployAuthorized,false,'UNSAFE_FIRESTORE_RULES_DEPLOY_AUTHORIZED');
 assert.equal(hold.livePromotionAuthorized,false,'UNSAFE_LIVE_PROMOTION_AUTHORIZED');
 assert.equal(hold.productSourceWritesAuthorized,false,'SOURCE_MUTATION_AUTHORIZATION_DRIFT');
 assert.equal(staged.notDeployed,true,'SCOPED_BACKEND_UNDEPLOYED_CLAIM_DRIFT');
 assert.notEqual(staged.listQa?.previewCertified,true,'FALSE_AUTHENTICATED_PREVIEW_PASS');
 assert.equal(hold.status,'ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE');
}
console.log('B4_003_RELEASE_READINESS='+ (blocked?'BLOCKED':'NEEDS_AUTHENTICATED_ACCEPTANCE'));
console.log('B4_003_BLOCKERS='+Object.keys(findings).filter(k=>findings[k]).join(','));
console.log('B4_003_RELEASE_GUARD_EVALUATED_NOT_A_FUNCTIONAL_PASS');
