'use strict';
// Central signed-write guard; no real Firebase account, secrets, or data write.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const auth=fs.readFileSync(path.resolve(__dirname,'../orbit360-platform/core/product-runtime-browser-providers-p0.js'),'utf8');
const write=fs.readFileSync(path.resolve(__dirname,'../orbit360-platform/data/store-firestore-product-operational-p0.js'),'utf8');
const start=auth.indexOf('  function signIn(email,password){'),end=auth.indexOf('  function signOut()',start);
assert.ok(start>0&&end>start,'I66_SIGNIN_OWNER_NOT_FOUND');
const login=auth.slice(start,end);
assert.ok(login.includes('browserSessionPersistence'),'I66_TAB_ISOLATION_NOT_ENFORCED');
assert.ok(login.indexOf('setPersistence(')<login.indexOf('signInWithEmailAndPassword('),'I66_LOGIN_PERSISTENCE_ORDER_INVALID');
assert.ok(auth.includes('firebase-browser-session-on-new-login'),'I66_SESSION_CONTRACT_NOT_EXPOSED');
assert.ok(auth.includes('function initialUser(){'),'I66_LEGACY_RESTORED_SESSIONS_LOST');
const guardSource=write.match(/  function signedContext\(p,m\)\{[\s\S]*?\n  \}\n  function moduleFor/);
assert.ok(guardSource,'I66_SIGNED_WRITER_GUARD_NOT_FOUND');
const guard=vm.runInNewContext('('+guardSource[0].replace(/\n  function moduleFor$/,'')+')',{
  text:x=>String(x==null?'':x).trim(),Promise,setTimeout,clearTimeout,Error
});
const member={uid:'member-auth-uid'};
const mock=a=>({initialize:async()=>({auth:a})});
(async()=>{
  const correct=await guard(mock({currentUser:{uid:member.uid}}),member);
  assert.equal(correct.auth.currentUser.uid,member.uid,'I66_VALID_SIGNED_USER_BLOCKED');
  await assert.rejects(guard(mock({currentUser:{uid:'other-user'}}),member),/PRODUCT_WRITE_AUTH_CONTEXT_MISMATCH/);
  const pending={currentUser:null,authStateReady:async()=>{pending.currentUser={uid:member.uid};}};
  const recovered=await guard(mock(pending),member);
  assert.equal(recovered.auth.currentUser.uid,member.uid,'I66_VALID_RESTORING_USER_BLOCKED');
  await assert.rejects(guard(mock({currentUser:null,authStateReady:async()=>{}}),member),/PRODUCT_WRITE_AUTH_CONTEXT_MISMATCH/);
  await assert.rejects(guard(mock({currentUser:null}),member),/PRODUCT_WRITE_AUTH_CONTEXT_MISMATCH/);
  assert.equal((write.match(/return signedContext\((?:provider|p),m\)\.then/g)||[]).length,4,'I66_ALL_WRITE_PATHS_NOT_GUARDED');
  assert.ok(!login.includes('signOut('),'I66_LOGIN_FORCE_SIGNOUT_FORBIDDEN');
  console.log('I66_AUTH_TAB_ISOLATION_AND_SIGNED_WRITER_COHERENCE_12_12_PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
