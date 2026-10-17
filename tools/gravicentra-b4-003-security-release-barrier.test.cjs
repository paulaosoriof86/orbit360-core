'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const root='artifacts/orbit360-recovery/release-control/';
const control=JSON.parse(read(root+'CONTROL_PLANE.json'));
const firebase=JSON.parse(read('firebase.json'));
const bootstrap=read('functions/bootstrap.js');
const draft=read('firestore.b4-003-scoped-candidate.rules');
const live=read('firestore.rules');
assert.equal(firebase.firestore.rules,'firestore.rules','UNAUTHORIZED_DEPLOY_TARGET_CHANGE');
assert.ok(!bootstrap.includes("require('./b4-003-scoped-policy-callable')"),'PREVIEW_ONLY_FUNCTION_EXPORTED');
assert.ok(!bootstrap.includes("require('./b4-003-scoped-policy-reader')"),'UNAPPROVED_BACKEND_EXPORTED');
for(const pattern of [
 /match\s+\/tenants\/\{tenantId\}\/data\/\{document=\*\*\}[\s\S]*?allow\s+read,\s*write:\s*if\s+false\s*;/,
 /match\s+\/tenantId\/\{tenantId\}\/\{document=\*\*\}[\s\S]*?allow\s+read,\s*write:\s*if\s+false\s*;/
])assert.match(draft,pattern,'DIRECT_FIRESTORE_DATA_ACCESS_MUST_DENY');
assert.ok(live.includes('allow read, write: if isTenantMember(tenantId);'),
  'ACTIVE_RULES_FORENSIC_EVIDENCE_DRIFT_REQUIRES_NEW_READBACK');
const hold=control.b4003SecurityReleaseHold;
assert.equal(hold.status,'ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE');
assert.equal(hold.firestoreRulesDeployAuthorized,false);
assert.equal(hold.productSourceWritesAuthorized,false);
assert.equal(hold.livePromotionAuthorized,false);
assert.equal(control.b4003SecurityScopedReadStaging?.noLive,true);
assert.equal(control.b4003SecurityScopedReadStaging?.firestoreRulesDeployed,false);
// No real-member custom-token impersonation during an authorized Preview without
// an additional, explicit authority. A green public smoke is not authenticated QA.
const previewScope=control.b4003ProtectedPreviewAuthorization||{};
assert.equal(previewScope.realUserImpersonationAuthorized,false,'REAL_USER_IMPERSONATION_NOT_AUTHORIZED');
const previewWorkflow=read('.github/workflows/gravicentra-b4-003-executor.yml');
assert.ok(previewWorkflow.includes("c.b4003ProtectedPreviewAuthorization?.realUserImpersonationAuthorized===true"),
  'EXPLICIT_IDENTITY_GATE_MISSING');
assert.ok(previewWorkflow.includes("steps.gate.outputs.authenticated_identity_proof == 'true'"),
  'TOKEN_QA_MUST_BE_GATED');
assert.ok(previewWorkflow.includes('PENDING_REAL_USER_IDENTITY_AUTHORIZATION'),
  'SKIPPED_AUTHENTICATED_QA_MUST_NOT_BE_SILENT');
console.log('B4_003_PREVIEW_REAL_USER_IMPERSONATION_BLOCKED_QA_PASS_NO_AUTH_TOKENS_ISSUED');
console.log('B4_003_SECURITY_RELEASE_BARRIER_SOURCE_PASS; deployed rules still INSECURE; no live security claim');
