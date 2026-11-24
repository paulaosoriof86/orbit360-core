'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const a=require('./gravicentra-i66-make-lead-runtime-access.cjs');
const c=a.SCOPE;
const clone=v=>JSON.parse(JSON.stringify(v));
const principal='ops-runtime@ays-orbit-360-lab.iam.gserviceaccount.com';
const authority={scopeContractBlob:c.SCOPE_CONTRACT_BLOB,secretResource:a.SECRET,role:a.ROLE,principal,
  firestoreCapabilitiesVerified:true,sourceSha:'1'.repeat(40),receiptBlobSha:'2'.repeat(40)};
const initial=()=>({version:3,etag:'preimage-etag',bindings:[
  {role:'roles/secretmanager.viewer',members:['serviceAccount:existing-viewer@example.invalid']},
  {role:a.ROLE,members:['serviceAccount:conditional-reader@example.invalid'],condition:{title:'keep-condition',expression:'request.time < timestamp("2026-12-01T00:00:00Z")'}}],
  auditConfigs:[{service:'secretmanager.googleapis.com',auditLogConfigs:[{logType:'DATA_READ'}]}]});
class Client{
  constructor(policy=initial()){this.policy=clone(policy);this.writes=[];this.beforeSet=null;this.afterSet=null;}
  async getIamPolicy(request){assert.equal(request.resource,a.SECRET);assert.equal(request.options.requestedPolicyVersion,3);return[clone(this.policy)];}
  async setIamPolicy(request){
    assert.equal(request.resource,a.SECRET);assert.deepEqual(request.updateMask,{paths:['bindings','etag']});
    if(this.beforeSet){const fn=this.beforeSet;this.beforeSet=null;fn(this);}
    if(request.policy.etag!==this.policy.etag)throw Object.assign(Error('CAS aborted'),{code:10});
    this.writes.push(clone(request));this.policy={...clone(request.policy),etag:'after-'+this.writes.length};
    if(this.afterSet){const fn=this.afterSet;this.afterSet=null;fn(this);}
    return[clone(this.policy)];
  }
}
const caps=async()=>true,access=async()=>true;
test('exact Secret IAM delta preserves all unrelated members, conditions and audit settings; rollback restores them',async()=>{
  const client=new Client(),plan=a.exactGrantPlan(client.policy,principal,authority),before=clone(client.policy);
  const receipt=await a.grantExact({client,plan,verifyRuntimeCapabilities:caps,verifyRuntimeAccess:access});
  assert.equal(receipt.iamWrites,1);assert.equal(receipt.projectIamWrites,0);assert.equal(client.writes.length,1);
  assert.deepEqual(client.policy.bindings.slice(0,2),before.bindings);assert.deepEqual(client.policy.auditConfigs,before.auditConfigs);
  assert.deepEqual(client.policy.bindings[2],{role:a.ROLE,members:['serviceAccount:'+principal]});
  const rollback=await a.rollbackExact({client,plan,receipt});assert.equal(rollback.status,'EXACT_PRIOR_SECRET_POLICY_RESTORED');
  assert.equal(a.policyDigest(client.policy,false),a.policyDigest(before,false));assert.equal(client.writes.length,2);
});
test('already existing unconditional binding is verified with zero IAM writes and never removed by rollback',async()=>{
  const policy=initial();policy.bindings.push({role:a.ROLE,members:['serviceAccount:'+principal]});
  const client=new Client(policy),plan=a.exactGrantPlan(client.policy,principal,authority);
  const receipt=await a.grantExact({client,plan,verifyRuntimeCapabilities:caps,verifyRuntimeAccess:access});
  assert.equal(receipt.iamWrites,0);assert.equal(receipt.addedMember,false);
  assert.equal((await a.rollbackExact({client,plan,receipt})).iamWrites,0);assert.equal(client.writes.length,0);
});
test('runtime without verified Firestore capabilities cannot receive a blind secret grant',async()=>{
  const client=new Client(),plan=a.exactGrantPlan(client.policy,principal,authority);
  await assert.rejects(()=>a.grantExact({client,plan,verifyRuntimeCapabilities:async()=>false,verifyRuntimeAccess:access}),/INGRESS_RUNTIME_FIRESTORE_CAPABILITIES_REQUIRED/);
  assert.equal(client.writes.length,0);
});
test('changed preimage, missing etag and ambiguous bindings fail closed',async()=>{
  const client=new Client(),plan=a.exactGrantPlan(client.policy,principal,authority);client.policy.etag='changed';
  await assert.rejects(()=>a.grantExact({client,plan,verifyRuntimeCapabilities:caps,verifyRuntimeAccess:access}),/INGRESS_SECRET_IAM_CAS_PREIMAGE_CHANGED/);
  assert.throws(()=>a.exactGrantPlan({...initial(),etag:''},principal,authority),/ETAG_PREIMAGE/);
  const p=initial();p.bindings.push({role:a.ROLE,members:[]},{role:a.ROLE,members:[]});
  assert.throws(()=>a.exactGrantPlan(p,principal,authority),/AMBIGUOUS/);assert.equal(client.writes.length,0);
});
test('concurrent IAM edit during set is refused by the transmitted etag',async()=>{
  const client=new Client(),plan=a.exactGrantPlan(client.policy,principal,authority);
  client.beforeSet=x=>{x.policy.etag='raced-etag';x.policy.bindings.push({role:'roles/secretmanager.viewer',members:['user:new@example.invalid']});};
  await assert.rejects(()=>a.grantExact({client,plan,verifyRuntimeCapabilities:caps,verifyRuntimeAccess:access}),e=>e.code===10&&e.ingressIamOutcome.commitState==='UNKNOWN');
  assert.equal(client.writes.length,0);assert.equal(client.policy.etag,'raced-etag');
});
test('tampered grant scope or removal of another binding is rejected even if hashes are recomputed',async()=>{
  const client=new Client(),plan=a.exactGrantPlan(client.policy,principal,authority);plan.after.bindings.shift();plan.afterContentDigest=a.policyDigest(plan.after,false);
  await assert.rejects(()=>a.grantExact({client,plan,verifyRuntimeCapabilities:caps,verifyRuntimeAccess:access}),/UNAPPROVED_DELTA/);
  assert.throws(()=>a.exactGrantPlan(client.policy,principal,{...authority,secretResource:'projects/other/secrets/other'}),/AUTHORITY_REQUIRED/);
  assert.equal(client.writes.length,0);
});
test('failed runtime access after IAM commit remains committed and has a bound inverse rollback receipt',async()=>{
  const client=new Client(),plan=a.exactGrantPlan(client.policy,principal,authority);let failure;
  try{await a.grantExact({client,plan,verifyRuntimeCapabilities:caps,verifyRuntimeAccess:async()=>false});}catch(e){failure=e;}
  assert.equal(failure.ingressIamOutcome.commitState,'COMMITTED_UNVERIFIED');assert.equal(failure.ingressIamOutcome.knownIamWrites,1);
  const receipt=failure.ingressIamOutcome.rollbackReceipt;assert.equal(receipt.addedMember,true);
  await a.rollbackExact({client,plan,receipt});assert.equal(a.policyDigest(client.policy,false),plan.beforeContentDigest);
});
test('rollback refuses any subsequent unrelated IAM edit',async()=>{
  const client=new Client(),plan=a.exactGrantPlan(client.policy,principal,authority),receipt=await a.grantExact({client,plan,verifyRuntimeCapabilities:caps,verifyRuntimeAccess:access});
  client.policy.bindings.push({role:'roles/secretmanager.viewer',members:['user:concurrent@example.invalid']});client.policy.etag='concurrent';
  await assert.rejects(()=>a.rollbackExact({client,plan,receipt}),/ROLLBACK_POSTIMAGE_CHANGED/);assert.equal(client.writes.length,1);
});
function deps({canonicalPermissions=true,canonicalSecret=true,canonicalImpersonation=true,priorPermissions=false}={}){
  const calls=[];
  const sourceClient={request:async options=>{
    const target=a.OPS.find(t=>options.url.endsWith('/locations/'+t.region+'/functions/'+t.name));assert.ok(target);assert.equal(options.method,'GET');calls.push(options.url);
    return{data:{name:`projects/${a.PROJECT}/locations/${target.region}/functions/${target.name}`,state:'ACTIVE',
      serviceConfig:{serviceAccountEmail:principal,revision:'known-existing-revision',environmentVariables:{PRIVATE_VALUE:'NEVER_OUTPUT'}}}};
  }};
  const runtimeClientFor=async who=>({who,getAccessToken:async()=>{if(who===principal&&!canonicalImpersonation)throw Object.assign(Error('private'),{code:403});return{token:'NEVER_OUTPUT'};},
    request:async options=>{
      assert.equal(options.url,`https://cloudresourcemanager.googleapis.com/v1/projects/${a.PROJECT}:testIamPermissions`);assert.equal(options.method,'POST');
      assert.deepEqual(options.data.permissions,[...a.REQUIRED_FIRESTORE_PERMISSIONS]);
      return{data:{permissions:(who===principal?canonicalPermissions:priorPermissions)?[...a.REQUIRED_FIRESTORE_PERMISSIONS]:[]}};
    }});
  const secretClientFor=async runtime=>({accessSecretVersion:async request=>{assert.equal(request.name,a.SECRET+'/versions/1');
    if(runtime.who===principal&&!canonicalSecret)throw Object.assign(Error('private'),{code:7});
    return[{payload:{data:Buffer.from(JSON.stringify({tenantId:c.TENANT,pais:c.COUNTRY,idInstance:c.INSTANCE,apiToken:'NEVER_OUTPUT'}))}}];},close:async()=>{}});
  return{sourceClient,runtimeClientFor,secretClientFor,calls};
}
test('preflight prefers the observed canonical Ops runtime with already sufficient permissions',async()=>{
  const d=deps(),report=await a.preflight(d);assert.equal(report.selectedRuntime,principal);assert.equal(report.exactSecretGrantRequired,false);
  assert.equal(report.selectedFrom,'OBSERVED_CANONICAL_OPS_RUNTIME');assert.equal(report.iamWrites,0);assert.equal(report.firestoreWrites,0);
  assert.equal(d.calls.length,2);assert.equal(JSON.stringify(report).includes('NEVER_OUTPUT'),false);
});
test('preflight identifies only the exact missing secret grant, without widening project IAM',async()=>{
  const report=await a.preflight(deps({canonicalSecret:false}));assert.equal(report.selectedRuntime,principal);assert.equal(report.exactSecretGrantRequired,true);
  assert.equal(report.candidates[0].secretStatus,'PERMISSION_DENIED');assert.equal(report.candidates[0].firestoreCapabilitiesVerified,true);assert.equal(report.iamWrites,0);
});
test('preflight does not infer canonical runtime permission or impersonation from a name',async()=>{
  const denied=await a.preflight(deps({canonicalPermissions:false}));assert.equal(denied.selectedRuntime,null);assert.equal(denied.status,'RUNTIME_UNVERIFIED_HOLD');
  const fallback=await a.preflight(deps({canonicalImpersonation:false,priorPermissions:true}));assert.equal(fallback.selectedRuntime,a.PRIOR_RUNTIME);
  assert.equal(fallback.candidates[0].impersonationVerified,false);assert.equal(fallback.selectedFrom,'EXISTING_REFERENCED_RUNTIME');
});
test('unconfirmed secret failures never authorize an IAM grant, and every SDK client closes',async()=>{
  for(const result of ['NOT_FOUND','TRANSIENT_FAILURE','MALFORMED','WRONG_SCOPE']){
    const d=deps();let created=0,closed=0;
    d.secretClientFor=async()=>{created++;return{close:async()=>{closed++;},accessSecretVersion:async()=>{
      if(result==='NOT_FOUND')throw Object.assign(Error('private'),{code:5});
      if(result==='TRANSIENT_FAILURE')throw Object.assign(Error('private'),{code:14});
      return[{payload:{data:Buffer.from(result==='MALFORMED'?'private invalid JSON':JSON.stringify({tenantId:'wrong'}))}}];
    }};};
    const report=await a.preflight(d);
    assert.equal(report.status,'RUNTIME_SECRET_UNVERIFIED_HOLD',result);assert.equal(report.exactSecretGrantRequired,null,result);
    assert.equal(created,closed,result);assert.equal(report.iamWrites,0);assert.equal(JSON.stringify(report).includes('private'),false);
  }
});
test('permission-denied read closes every SDK client before reporting the exact missing grant',async()=>{
  const d=deps();let created=0,closed=0;
  d.secretClientFor=async()=>{created++;return{close:async()=>{closed++;},accessSecretVersion:async()=>{throw Object.assign(Error('private'),{code:7});}};};
  const report=await a.preflight(d);assert.equal(report.exactSecretGrantRequired,true);assert.equal(created,closed);
});
