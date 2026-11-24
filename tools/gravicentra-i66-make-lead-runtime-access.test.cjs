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

function richPolicy(){
  const p=initial();p.bindings[0].members.push('user:second-viewer@example.invalid');
  p.bindings[1].condition.description='Retain this exact condition text';
  p.bindings[1].condition.location='synthetic-source:7';
  p.bindings.push({role:a.ROLE,members:['serviceAccount:prior-reader@example.invalid','user:prior-owner@example.invalid']});
  p.auditConfigs[0].auditLogConfigs=[
    {logType:'DATA_WRITE',exemptedMembers:['user:one@example.invalid','user:two@example.invalid']},
    {logType:'DATA_READ',exemptedMembers:['serviceAccount:one@example.invalid','serviceAccount:two@example.invalid']}];
  p.auditConfigs.push({service:'allServices',auditLogConfigs:[{logType:'ADMIN_READ'},{logType:'DATA_READ'}]});
  return p;
}
function permutedPolicy(policy){
  const p=clone(policy);p.bindings.reverse();p.bindings.forEach(b=>b.members.reverse());
  p.auditConfigs.reverse();p.auditConfigs.forEach(c=>{c.auditLogConfigs.reverse();c.auditLogConfigs.forEach(l=>l.exemptedMembers?.reverse());});
  return p;
}
test('policy digest ignores only known IAM ordering and does not mutate the transmitted policy',()=>{
  const policy=richPolicy(),before=clone(policy),permuted=permutedPolicy(policy);
  assert.notDeepEqual(policy,permuted);assert.equal(a.policyDigest(policy),a.policyDigest(permuted));
  assert.equal(a.policyDigest(policy,false),a.policyDigest(permuted,false));
  assert.deepEqual(policy,before);
  const plan=a.exactGrantPlan(policy,principal,authority);
  assert.deepEqual(plan.before,policy);assert.deepEqual(policy,before);
  assert.deepEqual(plan.after.bindings.slice(0,2),policy.bindings.slice(0,2));
  assert.deepEqual(plan.after.auditConfigs,policy.auditConfigs);
  assert.deepEqual(plan.after.bindings[2].members,[...policy.bindings[2].members,'serviceAccount:'+principal]);
  assert.equal(plan.after.etag,policy.etag);assert.equal(plan.after.version,3);
});
test('provider reorder before grant and after commit/rollback passes with the original exact payload and etag',async()=>{
  const policy=richPolicy(),client=new Client(policy),plan=a.exactGrantPlan(policy,principal,authority);
  client.policy=permutedPolicy(client.policy);client.afterSet=c=>{c.policy=permutedPolicy(c.policy);};
  const receipt=await a.grantExact({client,plan,verifyRuntimeCapabilities:caps,verifyRuntimeAccess:access});
  assert.equal(receipt.iamWrites,1);assert.deepEqual(client.writes[0].policy,plan.after);
  client.policy=permutedPolicy(client.policy);const currentEtag=client.policy.etag;
  client.afterSet=c=>{c.policy=permutedPolicy(c.policy);};
  const restored=await a.rollbackExact({client,plan,receipt});assert.equal(restored.status,'EXACT_PRIOR_SECRET_POLICY_RESTORED');
  assert.deepEqual(client.writes[1].policy,{...plan.before,etag:currentEtag});
  assert.equal(a.policyDigest(client.policy,false),a.policyDigest(policy,false));
});
test('reordering an already granted policy remains a zero-write observation',async()=>{
  const p=richPolicy();p.bindings[2].members.push('serviceAccount:'+principal);
  const client=new Client(permutedPolicy(p)),plan=a.exactGrantPlan(p,principal,authority);
  const r=await a.grantExact({client,plan,verifyRuntimeCapabilities:caps,verifyRuntimeAccess:access});
  assert.equal(r.iamWrites,0);assert.equal(r.addedMember,false);assert.equal(client.writes.length,0);
  assert.equal((await a.rollbackExact({client,plan,receipt:r})).iamWrites,0);
});
test('conditions, member multiplicity, roles, audit meaning, version and unknown arrays remain exact',async()=>{
  const changes=[
    p=>{p.bindings[0].role='roles/owner';},
    p=>{p.bindings[0].members[0]='allUsers';},
    p=>{p.bindings[0].members.push(p.bindings[0].members[0]);},
    p=>{p.bindings.push(clone(p.bindings[0]));},
    p=>{p.bindings[1].condition.expression+=' || true';},
    p=>{p.bindings[1].condition.title='different';},
    p=>{p.bindings[1].condition.description='different';},
    p=>{p.bindings[1].condition.location='different';},
    p=>{delete p.bindings[1].condition;},
    p=>{p.auditConfigs[0].service='different.googleapis.com';},
    p=>{p.auditConfigs[0].auditLogConfigs[0].logType='ADMIN_READ';},
    p=>{p.auditConfigs[0].auditLogConfigs[0].exemptedMembers.push('allUsers');},
    p=>{p.auditConfigs[0].auditLogConfigs.push(clone(p.auditConfigs[0].auditLogConfigs[0]));},
    p=>{p.auditConfigs.push(clone(p.auditConfigs[0]));},
    p=>{p.version=1;},
    p=>{p.unknownExtension=['two','one'];}
  ];
  for(const change of changes){
    const p={...richPolicy(),unknownExtension:['one','two']},client=new Client(p),plan=a.exactGrantPlan(p,principal,authority);
    change(client.policy);assert.notEqual(a.policyDigest(client.policy),plan.beforeDigest);
    await assert.rejects(()=>a.grantExact({client,plan,verifyRuntimeCapabilities:caps,verifyRuntimeAccess:access}),/CAS_PREIMAGE_CHANGED/);
    assert.equal(client.writes.length,0);
  }
});
test('equivalent etag encodings compare equally, but a different opaque etag still blocks CAS and rollback',async()=>{
  const p=richPolicy(),bytes=Buffer.from([3,6,9,12]);
  assert.equal(a.policyDigest({...p,etag:bytes}),a.policyDigest({...p,etag:bytes.toString('base64')}));
  assert.equal(a.policyDigest({...p,etag:new Uint8Array(bytes)}),a.policyDigest({...p,etag:bytes.toString('base64')}));
  assert.notEqual(a.policyDigest({...p,etag:'different'}),a.policyDigest(p));
  assert.equal(a.policyDigest({...p,etag:'different'},false),a.policyDigest(p,false));
  const client=new Client(p),plan=a.exactGrantPlan(p,principal,authority);
  client.policy=permutedPolicy(client.policy);client.policy.etag='concurrent-same-content';
  await assert.rejects(()=>a.grantExact({client,plan,verifyRuntimeCapabilities:caps,verifyRuntimeAccess:access}),/CAS_PREIMAGE_CHANGED/);
  assert.equal(client.writes.length,0);client.policy=clone(p);
  const receipt=await a.grantExact({client,plan,verifyRuntimeCapabilities:caps,verifyRuntimeAccess:access});
  client.policy=permutedPolicy(client.policy);client.policy.etag='concurrent-after';
  await assert.rejects(()=>a.rollbackExact({client,plan,receipt}),/ROLLBACK_POSTIMAGE_CHANGED/);assert.equal(client.writes.length,1);
});
test('meaningful postimage change is committed-but-unverified, not accepted as a reorder',async()=>{
  const client=new Client(richPolicy()),plan=a.exactGrantPlan(client.policy,principal,authority);let runtimeReads=0;
  client.afterSet=c=>{c.policy=permutedPolicy(c.policy);c.policy.auditConfigs[0].auditLogConfigs[0].logType='CHANGED';};
  await assert.rejects(()=>a.grantExact({client,plan,verifyRuntimeCapabilities:caps,verifyRuntimeAccess:async()=>{runtimeReads++;return true;}}),
    e=>e.code==='INGRESS_SECRET_IAM_POSTIMAGE_MISMATCH'&&e.ingressIamOutcome.commitState==='COMMITTED_UNVERIFIED'&&e.ingressIamOutcome.knownIamWrites===1);
  assert.equal(client.writes.length,1);assert.equal(runtimeReads,0);
});
test('same-etag content drift after commit still blocks rollback',async()=>{
  const client=new Client(richPolicy()),plan=a.exactGrantPlan(client.policy,principal,authority);
  const receipt=await a.grantExact({client,plan,verifyRuntimeCapabilities:caps,verifyRuntimeAccess:access});
  client.policy=permutedPolicy(client.policy);client.policy.bindings.find(b=>b.condition).condition.expression='true';
  await assert.rejects(()=>a.rollbackExact({client,plan,receipt}),/ROLLBACK_POSTIMAGE_CHANGED/);assert.equal(client.writes.length,1);
});

function eventarcDeps({existingEvent=true,bindings=true,permissions=true,unreachable=false,policyDenied=false,runtimeChanged=false}={}){
  const calls=[];
  return{calls,readRulesSources:()=>[{sourcePath:'firestore.b4-003-scoped-candidate.rules',bytes:Buffer.from('DO_NOT_PUBLISH_RULES')}],sourceClient:{request:async op=>{
    calls.push(clone(op));
    if(op.url.endsWith('/releases/cloud.firestore'))return{data:{rulesetName:'projects/ays-orbit-360-lab/rulesets/observed-ruleset'}};
    if(op.url.endsWith('/rulesets/observed-ruleset'))return{data:{source:{files:[{content:'DO_NOT_PUBLISH_RULES'}]}}};
    const target=a.OPS.find(t=>op.url.endsWith('/locations/'+t.region+'/functions/'+t.name));
    if(target)return{data:{name:`projects/${a.PROJECT}/locations/${target.region}/functions/${target.name}`,state:'ACTIVE',
      serviceConfig:{serviceAccountEmail:runtimeChanged?'unverified@example.invalid':a.CANONICAL_RUNTIME,environmentVariables:{PRIVATE:'DO_NOT_PUBLISH'}}}};
    if(op.url.includes('/locations/-/functions'))return{data:{functions:existingEvent&&op.url.includes('/v2/')?
      [{name:'projects/'+a.PROJECT+'/locations/us-central1/functions/existing',eventTrigger:{eventType:'google.cloud.firestore.document.v1.created'},
        serviceConfig:{environmentVariables:{PRIVATE:'DO_NOT_PUBLISH'}}}]:[],...(unreachable?{unreachable:['us-central1']}:{})}};
    assert.equal(op.method,'POST');assert.equal(op.url,`https://cloudresourcemanager.googleapis.com/v1/projects/${a.PROJECT}:getIamPolicy`);
    assert.deepEqual(op.data,{options:{requestedPolicyVersion:3}});
    if(policyDenied)throw{response:{status:403},message:'DO_NOT_PUBLISH'};
    return{data:{version:3,etag:'private-policy-etag',bindings:bindings?a.FIRST_EVENT_BINDINGS.map(b=>({role:b.role,members:[b.member]})):[],
      unknownField:{internal:'DO_NOT_PUBLISH'}}};
  }},runtimeClientFor:async who=>{
    assert.equal(who,a.CANONICAL_RUNTIME);
    return{getAccessToken:async()=>({token:'DO_NOT_PUBLISH'}),request:async op=>{
      calls.push(clone(op));assert.equal(op.url,`https://cloudresourcemanager.googleapis.com/v1/projects/${a.PROJECT}:testIamPermissions`);
      assert.deepEqual(op.data.permissions,[...a.REQUIRED_EVENTARC_PERMISSIONS]);
      return{data:{permissions:permissions?[...a.REQUIRED_EVENTARC_PERMISSIONS]:[]}};
    }};
  }};
}
test('Eventarc readonly probe verifies current runtime and existing event service without inventing a project IAM delta',async()=>{
  const d=eventarcDeps({bindings:false}),r=await a.eventarcPreflight(d);
  assert.equal(r.status,'EVENTARC_RUNTIME_AND_PROJECT_IAM_READY');assert.equal(r.cliWouldAddProjectBindings,false);
  assert.deepEqual(r.existingRecognizedEventServices,['firestore']);assert.equal(r.projectIamWrites,0);assert.equal(r.secretIamWrites,0);
  assert.equal(r.firestoreWrites,0);assert.equal(r.privatePolicyPublished,false);assert.match(r.projectPolicyDigest,/^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(r).includes('DO_NOT_PUBLISH'),false);assert.equal(JSON.stringify(r).includes('private-policy-etag'),false);
  assert.ok(d.calls.every(c=>c.method==='GET'||c.url.endsWith(':getIamPolicy')||c.url.endsWith(':testIamPermissions')));
});
test('first Eventarc service without the exact required existing bindings is HOLD, never an automatic project grant',async()=>{
  const r=await a.eventarcPreflight(eventarcDeps({existingEvent:false,bindings:false}));
  assert.equal(r.status,'UNAUTHORIZED_PROJECT_IAM_DELTA_WOULD_BE_REQUIRED_HOLD');assert.equal(r.cliWouldAddProjectBindings,true);
  assert.equal(r.projectIamWrites,0);
  const ready=await a.eventarcPreflight(eventarcDeps({existingEvent:false,bindings:true}));
  assert.equal(ready.status,'EVENTARC_RUNTIME_AND_PROJECT_IAM_READY');assert.equal(ready.cliWouldAddProjectBindings,false);
});
test('Eventarc incomplete inventory, denied policy, wrong runtime and missing effective permission fail closed with sanitized stages',async()=>{
  for(const [options,stage] of [[{unreachable:true},'FUNCTION_INVENTORY'],[{policyDenied:true},'PROJECT_POLICY_READ'],[{runtimeChanged:true},'CANONICAL_RUNTIME']]){
    const r=await a.eventarcPreflight(eventarcDeps(options));assert.equal(r.status,'EVENTARC_PREREQUISITES_UNVERIFIED_HOLD');assert.equal(r.failureStage,stage);
    assert.equal(r.projectIamWrites,0);assert.equal(JSON.stringify(r).includes('DO_NOT_PUBLISH'),false);
  }
  const r=await a.eventarcPreflight(eventarcDeps({permissions:false}));assert.equal(r.status,'EVENTARC_RUNTIME_PERMISSION_MISSING_HOLD');
});
test('Eventarc inventory exhausts pages, rejects repeated cursors and refuses partial unreachable regions',async()=>{
  const pages=[{functions:[{name:'one'}],nextPageToken:'next'},{functions:[{name:'two'}]}];let calls=0;
  const client={request:async op=>{assert.equal(op.method,'GET');if(calls===1)assert.equal(op.params.pageToken,'next');return{data:pages[calls++]};}};
  assert.deepEqual((await a.listEventInventory(client,'v2')).map(x=>x.name),['one','two']);assert.equal(calls,2);
  await assert.rejects(()=>a.listEventInventory({request:async()=>({data:{functions:[],nextPageToken:'same'}})},'v2'),/CURSOR_REPEATED/);
  await assert.rejects(()=>a.listEventInventory({request:async()=>({data:{functions:[],unreachable:['us-east1']}})},'v2'),/UNREACHABLE/);
});
test('conditional project roles cannot satisfy the CLI unconditional binding branch and scheduled labels follow the real CLI service selector',async()=>{
  const d=eventarcDeps({existingEvent:false}),original=d.sourceClient.request;
  d.sourceClient.request=async op=>{const r=await original(op);if(op.url.endsWith(':getIamPolicy'))for(const b of r.data.bindings)b.condition={expression:'true'};return r;};
  const r=await a.eventarcPreflight(d);assert.equal(r.cliWouldAddProjectBindings,true);
  assert.equal(a.inventoryService({labels:{'deployment-scheduled':'true'},eventTrigger:{eventType:'google.cloud.pubsub.topic.v1.messagePublished'}}),null);
  assert.equal(a.inventoryService({labels:{'deployment-blocking':'before-create'}}),'auth');
});
test('ruleset readback outputs only exact canonical path/blob and refuses missing, different or ambiguous deployed source',async()=>{
  const d=eventarcDeps(),r=await a.queueRulesReadback(d.sourceClient,d.readRulesSources);
  assert.equal(r.sourcePath,'firestore.b4-003-scoped-candidate.rules');assert.match(r.sourceBlob,/^[a-f0-9]{40}$/);
  assert.equal(r.rulesWrites,0);assert.equal(JSON.stringify(r).includes('DO_NOT_PUBLISH_RULES'),false);
  await assert.rejects(a.queueRulesReadback(d.sourceClient,()=>[{sourcePath:'firestore.rules',bytes:Buffer.from('different')}]),/SOURCE_NOT_UNIQUE/);
  await assert.rejects(a.queueRulesReadback(d.sourceClient,()=>[...d.readRulesSources(),{sourcePath:'firestore.rules',bytes:Buffer.from('DO_NOT_PUBLISH_RULES')}]),/SOURCE_NOT_UNIQUE/);
  await assert.rejects(a.queueRulesReadback({request:async()=>({data:{rulesetName:'projects/other/rulesets/other'}})},d.readRulesSources),/IDENTITY_UNVERIFIED/);
});
