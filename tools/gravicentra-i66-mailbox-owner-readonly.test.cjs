'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('./gravicentra-i66-mailbox-owner-readonly.cjs');
const crypto=require('node:crypto'),sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const row=()=>({id:'synthetic_member',data:{id:'synthetic_member',tenantId:M.TENANT,email:M.PILOT,status:'active',countries:['GT'],roles:['operativo'],correoAutorizado:true}});
const auth=()=>({synthetic_member:{exists:true,uid:'synthetic_member',email:M.PILOT,emailVerified:true,disabled:false}});
const report=(r=row(),a=auth())=>M.inspect({members:[r],advisors:[],authResults:a});
test('exact active GT Auth match is only a candidate, never implicit mailbox ownership',()=>{
  const r=report();assert.equal(r.exactActiveGtIdentityCandidates,1);assert.equal(r.mailboxOwnershipBindingAccepted,false);
  assert.equal(r.providerLoginIdentityVerified,false);assert.equal(r.principalImpersonationAllowed,false);
});
test('output never contains name, address or raw UID even when input includes them',()=>{
  const r=row();r.data.nombre='PRIVATE NAME';r.data.password='PRIVATE SECRET';const text=JSON.stringify(report(r));
  for(const value of ['PRIVATE NAME','PRIVATE SECRET',M.PILOT,'synthetic_member'])assert.ok(!text.includes(value));
  assert.ok(report(r).memberCandidates[0].matchedEmailFieldPaths.includes('email'));
});
test('auth/tenant/status/country contradictions cannot identify an eligible owner',()=>{
  for(const mutate of [r=>r.data.tenantId='other',r=>r.data.status='invited',r=>r.data.estado='inactive',
    r=>r.data.countries=['CO'],r=>r.data.active=false,r=>r.data.eliminado=true,r=>r.data.id='other',
    r=>r.data.uid='other',r=>r.data.userId='other']){
    const r=row();mutate(r);assert.equal(report(r).exactActiveGtIdentityCandidates,0);
  }
  for(const mutate of [u=>u.emailVerified=false,u=>u.disabled=true,u=>u.uid='other',u=>u.email='other@example.test']){
    const a=auth();mutate(a.synthetic_member);assert.equal(report(row(),a).exactActiveGtIdentityCandidates,0);
  }
});
test('multiple matches remain multiple and no role or connector label chooses a person',()=>{
  const a=row(),b=row();b.id='second_member';b.data.id=b.id;const au=auth();au[b.id]={...au[a.id],uid:b.id};
  const r=M.inspect({members:[a,b],advisors:[],authResults:au});assert.equal(r.exactActiveGtIdentityCandidates,2);
  assert.equal(r.mailboxOwnershipBindingAccepted,false);
});
test('roster email is distinguished from an authenticated membership and explicit channel authorization',()=>{
  const a=row();a.id='advisor_a';a.data.id=a.id;const m=row();m.data.email='other@example.test';m.data.advisorId=a.id;
  const r=M.inspect({members:[m],advisors:[a],authResults:{}});assert.equal(r.memberCandidatesCount,0);
  assert.equal(r.advisorCandidatesCount,1);assert.equal(r.advisorCandidates[0].memberLinkCount,1);
  const denied=row();denied.data.correoAutorizado=false;assert.equal(report(denied).memberCandidates[0].correoExplicitlyDenied,true);
});
test('bounded projected census and narrowly matched Auth read make no writes',async()=>{
  const r=row(),calls=[];const docs=[{id:r.id,data:()=>r.data}];let col='';
  const chain={collection(x){calls.push(['collection',x]);col=x;return this;},doc(x){calls.push(['doc',x]);return this;},
    select(...fields){assert.deepEqual(fields,M.FIELDS);calls.push(['projection',fields.length]);return this;},
    limit(n){calls.push(['limit',n]);this.n=n;return this;},async get(){return{docs:this.n===M.MEMBER_LIMIT?docs:[]};}};
  const authApi={async getUser(uid){assert.equal(uid,r.id);calls.push(['auth',uid]);return auth()[uid];}};
  const result=await M.read({db:chain,auth:authApi});assert.equal(result.exactActiveGtIdentityCandidates,1);
  assert.equal(calls.filter(x=>x[0]==='auth').length,1);assert.equal(result.canonicalWrites,0);assert.equal(result.authWrites,0);
});
test('truncated census and provider failures cannot become empty successful ownership',async()=>{
  assert.throws(()=>M.inspect({members:Array.from({length:201},row),advisors:[]}),/CENSUS_BOUND/);
  const r=report(row(),{});assert.equal(r.memberCandidates[0].authReadCompleted,false);assert.equal(r.exactActiveGtIdentityCandidates,0);
});
test('confirmed self-mailbox binding resolves the prior signed UID with the actual role owner, not mailbox/login equality',()=>{
  const m=row();m.data.uid=m.id;m.data.email='login@example.test';m.data.roles=['direccion'];
  const a=auth();a[m.id].email='login@example.test';
  const r=M.inspect({members:[m],advisors:[],authResults:a,expectedDirectionUidSha256:sha(m.id)});
  assert.equal(r.memberCandidatesCount,0);assert.equal(r.selfBindingVerification.currentVerifiedIdentityCount,1);
  assert.equal(r.mailboxOwnershipBindingAccepted,false);assert.equal(r.canonicalWrites,0);
});
test('only explicit assigned Direction role plus current Auth and exact UID can confirm that identity',()=>{
  for(const mutate of [m=>m.data.uid='other',m=>delete m.data.uid,m=>m.data.userId='other',m=>m.data.roles=['admin'],
    m=>{m.data.roles=[];m.data.rol='direccion';},m=>m.data.estado='inactive',m=>m.data.countries=['CO']]){
    const m=row();m.data.uid=m.id;m.data.roles=['direccion'];mutate(m);
    const r=M.inspect({members:[m],advisors:[],authResults:auth(),expectedDirectionUidSha256:sha(m.id)});
    assert.equal(r.selfBindingVerification.currentVerifiedIdentityCount,0);
  }
});
test('another Direction user with the same role does not substitute for the signed owner UID',()=>{
  const m=row();m.data.uid=m.id;m.data.roles=['direccion'];
  const r=M.inspect({members:[m],advisors:[],authResults:auth(),expectedDirectionUidSha256:sha('different_user')});
  assert.equal(r.selfBindingVerification.matchingMemberCount,0);assert.equal(r.mailboxOwnershipBindingAccepted,false);
});
