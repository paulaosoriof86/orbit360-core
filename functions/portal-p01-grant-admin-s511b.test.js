'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const a=require('./portal-p01-grant-admin-s511b');

function member(overrides={}){return Object.assign({uid:'staff-1',status:'active',active:true,roles:['SuperAdmin'],activeRole:'SuperAdmin'},overrides);}
function issue(overrides={}){return Object.assign({operation:'issue',identitySubject:'customerUid_123',clientIds:['cli-1'],expiresAt:'2027-01-01T00:00:00Z',reason:'Portal access approved',requestId:'req-1'},overrides);}

test('S5.11B only privileged staff can prepare grant administration',()=>{
  assert.equal(a.canManage(member()),true);
  assert.equal(a.canManage(member({roles:['Asesor'],activeRole:'Asesor'})),false);
  assert.equal(a.canManage(member({roles:['Asesor'],permissions:['portal_grants.manage']})),true);
  assert.equal(a.canManage(member({active:false})),false);
});

test('S5.11B issue plan is non-executable and emits commitments not raw actor uid',()=>{
  const r=a.buildCommandPlan({member:member(),input:issue(),nowIso:'2026-10-07T17:20:00Z'});
  assert.equal(r.ok,true);
  assert.equal(r.executionAllowed,false);
  assert.equal(r.operation,'issue');
  assert.equal(r.grant.status,'active');
  assert.deepEqual(r.grant.clientIds,['cli-1']);
  assert.match(r.actorRef,/^actor:[a-f0-9]{24}$/);
  assert.match(r.audit.identitySubjectCommitment,/^[a-f0-9]{64}$/);
  assert.equal(Object.prototype.hasOwnProperty.call(r.audit,'identitySubject'),false);
});

test('S5.11B refuses duplicate active issue and requires existing record for revoke/reissue',()=>{
  const active={identitySubject:'customerUid_123',status:'active',version:1};
  assert.equal(a.buildCommandPlan({member:member(),input:issue(),existingGrant:active,nowIso:'2026-10-07T17:20:00Z'}).code,'ACTIVE_GRANT_ALREADY_EXISTS');
  assert.equal(a.buildCommandPlan({member:member(),input:issue({operation:'revoke'}),existingGrant:null,nowIso:'2026-10-07T17:20:00Z'}).code,'EXISTING_GRANT_REQUIRED');
  assert.equal(a.buildCommandPlan({member:member(),input:issue({operation:'reissue'}),existingGrant:null,nowIso:'2026-10-07T17:20:00Z'}).code,'EXISTING_GRANT_REQUIRED');
});

test('S5.11B revoke plan closes active grant and remains non-executable',()=>{
  const issued=a.buildCommandPlan({member:member(),input:issue(),nowIso:'2026-10-07T17:20:00Z'}).grant;
  const r=a.buildCommandPlan({member:member(),input:issue({operation:'revoke',requestId:'req-r',reason:'Customer requested access removal'}),existingGrant:issued,nowIso:'2026-10-08T10:00:00Z'});
  assert.equal(r.ok,true);
  assert.equal(r.executionAllowed,false);
  assert.equal(r.grant.status,'revoked');
  assert.equal(r.grant.revocationReason,'Customer requested access removal');
});

test('S5.11B exact retry reuses and changed request payload conflicts',()=>{
  const p=a.buildCommandPlan({member:member(),input:issue(),nowIso:'2026-10-07T17:20:00Z'});
  const receipt={requestId:p.requestId,payloadDigest:p.payloadDigest};
  assert.equal(a.idempotencyDecision(receipt,p).decision,'REUSE');
  const changed=a.buildCommandPlan({member:member(),input:issue({clientIds:['cli-2']}),nowIso:'2026-10-07T17:20:00Z'});
  assert.equal(a.idempotencyDecision(receipt,changed).decision,'DENY_CONFLICT');
});

test('S5.11B customer cannot self-grant through member role',()=>{
  const customerLike={uid:'cust-1',status:'active',active:true,roles:['Cliente'],activeRole:'Cliente'};
  const r=a.buildCommandPlan({member:customerLike,input:issue(),nowIso:'2026-10-07T17:20:00Z'});
  assert.equal(r.ok,false);
  assert.equal(r.code,'GRANT_ADMIN_DENY');
});
