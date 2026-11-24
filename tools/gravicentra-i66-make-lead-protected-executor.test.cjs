'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const os=require('node:os'),Module=require('node:module'),crypto=require('node:crypto');
const e=require('./gravicentra-i66-make-lead-protected-executor.cjs'),s=require('./gravicentra-i66-make-release-scope.cjs');
const c=require('../functions/product-lead-ingress-contract'),config=require('./gravicentra-i66-make-lead-ingress-config.cjs');
const {fixture,trigger}=require('./gravicentra-i66-make-release-scope.test.cjs');
const cliGuard=require('./gravicentra-i66-make-firebase-project-iam-guard.cjs');
const access=require('./gravicentra-i66-make-lead-runtime-access.cjs');
const clone=v=>structuredClone(v),ROOT='tenants/'+c.TENANT;
test('pinned Firebase CLI keeps IAM reads but cannot call either project role mutator',async()=>{
 let writes=0,reads=0;const rm={getIamPolicy:async()=>{reads++;return{etag:'existing'};},
  setIamPolicy:async()=>{writes++;},addServiceAccountToRoles:async()=>{writes++;}};
 cliGuard.guardProjectIam(rm);
 for(const name of ['setIamPolicy','addServiceAccountToRoles']){
  await assert.rejects(rm[name]('ays-orbit-360-lab',{}),/INGRESS_PROJECT_IAM_AUTOMUTATION_FORBIDDEN/);
  assert.throws(()=>{rm[name]=()=>{};},TypeError);
 }
 assert.deepEqual(await rm.getIamPolicy(),{etag:'existing'});assert.equal(reads,1);assert.equal(writes,0);
});
test('guarded deployment admits only the same five targets in the existing exact phase and project',()=>{
 const g=require('./gravicentra-i6-6-operational-release-candidate.cjs');
 for(const phase of ['preview','live']){
  const args=['deploy','--only',g.MAKE_TARGETS[phase].map(t=>'functions:'+t.name).join(','),'--config','/runner/exact/firebase.json','--project','ays-orbit-360-lab','--non-interactive','--force'];
  assert.equal(cliGuard.deploymentArgs(phase,args),args);
  for(const mutate of [a=>a[0]='projects:addfirebase',a=>a[2]+=',functions:unrelated',a=>a[4]='relative.json',a=>a[6]='other-project',a=>a.pop(),a=>a.push('--force'),a=>a[8]='--dry-run']){
   const altered=[...args];mutate(altered);assert.throws(()=>cliGuard.deploymentArgs(phase,altered));
  }
 }
});
test('force keeps retry prompt intact but cannot confirm an implicit deletion or unsafe event migration',async()=>{
 let retryCalls=0,otherPromptCalls=0;
 const original=async options=>{assert.equal(options.force,true);retryCalls++;};
 const prompts={promptForFailurePolicies:original,promptForFunctionDeletion:async()=>{otherPromptCalls++;return true;},
  promptForUnsafeMigration:async rows=>{otherPromptCalls++;return rows;}};
 cliGuard.guardDeployPrompts(prompts);
 assert.equal(prompts.promptForFailurePolicies,original);await prompts.promptForFailurePolicies({force:true});
 assert.equal(retryCalls,1);assert.equal(await prompts.promptForFunctionDeletion([],{force:true}),true);
 await assert.rejects(prompts.promptForFunctionDeletion([{id:'unrelated'}],{force:true}),/IMPLICIT_FUNCTION_DELETION_FORBIDDEN/);
 const safe=[{endpoint:{id:'same-target'},unsafe:false}];assert.equal(await prompts.promptForUnsafeMigration(safe,{force:true}),safe);
 await assert.rejects(prompts.promptForUnsafeMigration([{endpoint:{id:'same-target'},unsafe:true}],{force:true}),/UNSAFE_EVENT_MIGRATION_FORBIDDEN/);
 for(const key of ['promptForFunctionDeletion','promptForUnsafeMigration']){
  await assert.rejects(prompts[key](null,{force:true}),/DEPLOYMENT_PLAN_REQUIRED/);
  assert.throws(()=>{prompts[key]=async()=>true;},TypeError);
 }
 assert.equal(otherPromptCalls,0);
});
test('actual workflow Make invocations admit force only inside each exact five-target guarded deployment',()=>{
 const workflows={preview:'gravicentra-i66-privileged-role-three-function-preview-uat.yml',live:'gravicentra-i66-privileged-role-exact-live-promotion.yml'};
 for(const [phase,name] of Object.entries(workflows)){
  const source=fs.readFileSync(path.join(__dirname,'../.github/workflows',name),'utf8');
  const count=phase==='preview'?'PREVIEW_TARGET_COUNT':'LIVE_TARGET_COUNT';
  const invocation=source.indexOf('node tools/gravicentra-i66-make-firebase-project-iam-guard.cjs');
  const start=source.lastIndexOf('if test "$'+count+'" -eq 5;then',invocation);
  const end=source.indexOf('elif test "$'+count+'" -eq 4;then',start);assert.ok(start>=0&&end>start);
  const makeBranch=source.slice(start,end),rest=source.slice(0,start)+source.slice(end);
  const command=makeBranch.match(/node tools\/gravicentra-i66-make-firebase-project-iam-guard\.cjs[^\n]*(?:\n[^\n]*){2}/)?.[0];
  assert.ok(command);assert.equal((command.match(/--force/g)||[]).length,1);
  assert.equal((rest.match(/--force/g)||[]).length,0,'Force escaped exact Make branch');
  const args=command.split(String.fromCharCode(92,10)).join(' ').replace(/"\$[A-Z0-9_]+"/g,x=>x.includes('CONFIG')?'"/runner/exact/firebase.json"':x.includes('PROJECT')?'"ays-orbit-360-lab"':'"/runner/firebase-tools/lib/bin/firebase.js"').match(/"[^"]*"|[^\s]+/g).map(x=>x.replace(/^"|"$/g,''));
  assert.equal(args[3],phase);cliGuard.deploymentArgs(phase,args.slice(4));
 }
});
test('project IAM readback is exact after deployment, tolerates only representation order and never repairs unrelated drift',async()=>{
 const before={version:3,etag:'opaque',bindings:[{role:'roles/viewer',members:['user:two@example.invalid','user:one@example.invalid']}]};
 const proof={status:'EVENTARC_RUNTIME_AND_PROJECT_IAM_READY',projectIamWrites:0,projectPolicyDigest:access.policyDigest(before)};let calls=0;
 const auth={request:async op=>{calls++;assert.ok(op.url.endsWith(':getIamPolicy'));assert.equal(op.method,'POST');
  return{data:{...clone(before),bindings:[{...before.bindings[0],members:[...before.bindings[0].members].reverse()}]}};}};
 const result=await e.verifyProjectIamUnchanged(auth,proof);assert.equal(result.projectIamWrites,0);assert.equal(calls,1);
 const changed={request:async()=>({data:{...before,etag:'concurrent',bindings:[]}})};
 await assert.rejects(e.verifyProjectIamUnchanged(changed,proof),/INGRESS_PROJECT_IAM_CHANGED_DURING_DEPLOY/);
});
const blob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
function functionRow(p,phase='live'){
 const t=s.ADDED[phase];return{name:`projects/ays-orbit-360-lab/locations/${t.region}/functions/${t.name}`,state:'ACTIVE',
  serviceConfig:{serviceAccountEmail:p.makeIngress.runtimeAccess.principal,revision:t.name.toLowerCase()+'-00001-x',
    service:`projects/ays-orbit-360-lab/locations/${t.region}/services/${t.name.toLowerCase()}`},
  eventTrigger:{eventType:s.EVENT_TYPE,retryPolicy:'RETRY_POLICY_RETRY',trigger:'projects/ays-orbit-360-lab/locations/'+t.region+'/triggers/exact',
    eventFilters:[{attribute:'database',value:'(default)'},{attribute:'namespace',value:'(default)'},
      {attribute:'document',value:`${ROOT}/${phase==='preview'?c.PREVIEW_QUEUE:c.QUEUE}/{requestId}`,operator:'match-path-pattern'}]}};
}
function runServiceRow(fn,{revision=fn.serviceConfig.revision,generation='1',type='TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION'}={}){
 return{name:fn.serviceConfig.service,uid:'12345678-1234-4234-8234-123456789abc',generation,observedGeneration:generation,
  terminalCondition:{state:'CONDITION_SUCCEEDED'},reconciling:false,
  latestReadyRevision:fn.serviceConfig.revision,trafficStatuses:[{type,revision,percent:100}]};
}
const authFor=(get,getTraffic)=>({request:async op=>{
 assert.equal(op.method,'GET');const value=get();if(value===null)throw{response:{status:404}};
 if(op.url==='https://cloudfunctions.googleapis.com/v2/'+value.name)return{data:clone(value)};
 assert.match(op.url,/^https:\/\/run\.googleapis\.com\/v2\/projects\/ays-orbit-360-lab\/locations\/(us-east1|us-central1)\/services\/orbit360makeleadingress(preview)?$/);
 return{data:clone(getTraffic?getTraffic():runServiceRow(value))};
}});
test('deployment proof uses real AuthContext event filters, runtime and revision, independent of Cloud Run traffic',()=>{
 const {p}=fixture(),row=functionRow(p),proof=e.fnProjection(row,p,'live');assert.equal(proof.eventType,s.EVENT_TYPE);
 for(const mutate of [r=>r.name+='wrong',r=>r.state='DEPLOYING',r=>r.serviceConfig.serviceAccountEmail='another',
  r=>r.eventTrigger.eventType='google.cloud.firestore.document.v1.created',r=>r.eventTrigger.eventFilters[2].value='tenants/{tenant}/data/{doc}',
  r=>delete r.eventTrigger.eventFilters[2].operator,r=>r.eventTrigger.retryPolicy='RETRY_POLICY_DO_NOT_RETRY',
  r=>r.eventTrigger.eventFilters.push({attribute:'extra',value:'anything'})]){const v=clone(row);mutate(v);assert.throws(()=>e.fnProjection(v,p,'live'));}
});
test('trigger rollback deletes only its observed created revision and verifies absence',async()=>{
 const {p}=fixture();let current=null,deletes=0;const auth=authFor(()=>current);
 const snapshot=await e.snapshotTrigger({auth,p,phase:'live'});current=functionRow(p);
 const postimage=await e.captureTrigger({auth,p,phase:'live',snapshot});
 const result=await e.rollbackCreatedTrigger({auth,p,phase:'live',snapshot,postimage,deleteFunction:async t=>{
  assert.deepEqual(t,s.ADDED.live);deletes++;current=null;}});
 assert.equal(result.functionDeletes,1);assert.equal(deletes,1);
 assert.equal((await e.rollbackCreatedTrigger({auth,p,phase:'live',snapshot,postimage,deleteFunction:()=>assert.fail()})).functionDeletes,0);
});
test('unknown deployment, concurrent revision and unverified delete never claim rollback',async()=>{
 const {p}=fixture();let current=null,deletes=0;const auth=authFor(()=>current),snapshot=await e.snapshotTrigger({auth,p,phase:'live'});
 current=functionRow(p);const postimage=await e.captureTrigger({auth,p,phase:'live',snapshot});
 await assert.rejects(e.rollbackCreatedTrigger({auth,p,phase:'live',snapshot,deleteFunction:async()=>{deletes++;}}),/POSTIMAGE_REQUIRED/);
 current.serviceConfig.revision+='-changed';
 await assert.rejects(e.rollbackCreatedTrigger({auth,p,phase:'live',snapshot,postimage,deleteFunction:async()=>{deletes++;}}),/POSTIMAGE_CHANGED/);
 assert.equal(deletes,0);current=functionRow(p);
 await assert.rejects(e.rollbackCreatedTrigger({auth,p,phase:'live',snapshot,postimage,deleteFunction:async()=>{deletes++;}}),/ABSENCE_UNVERIFIED/);
 assert.equal(deletes,1);
 await assert.rejects(e.snapshotTrigger({auth:{request:async()=>{throw{response:{status:403}};}},p,phase:'live'}));
});
test('a pre-deploy failure with an unchanged existing Preview trigger performs no traffic write',async()=>{
 const {p}=fixture(),phase='preview',current=functionRow(p,phase),projection=e.fnProjection(current,p,phase);
 p.makeIngress.targetBefore.preview={...s.ADDED.preview,state:'EXISTING_APPROVED',revision:projection.revision,
  configurationDigest:projection.configurationDigest,receiptBlob:'c'.repeat(40)};
 const auth=authFor(()=>current),snapshot=await e.snapshotTrigger({auth,p,phase});let writes=0;
 const result=await e.rollbackCreatedTrigger({auth,p,phase,snapshot,deleteFunction:()=>assert.fail(),restorePreviousRevision:async()=>{writes++;}});
 assert.equal(result.status,'PREVIOUS_TRIGGER_UNCHANGED_NO_RESTORE_REQUIRED');assert.equal(result.trafficWrites,0);assert.equal(writes,0);
});
test('existing Preview rollback restores only its exact captured postimage and rejects an unknown or concurrent revision',async()=>{
 const {p}=fixture(),phase='preview';let current=functionRow(p,phase),restored=0;const projection=e.fnProjection(current,p,phase);
 p.makeIngress.targetBefore.preview={...s.ADDED.preview,state:'EXISTING_APPROVED',revision:projection.revision,
  configurationDigest:projection.configurationDigest,receiptBlob:'c'.repeat(40)};
 let traffic=runServiceRow(current);const auth=authFor(()=>current,()=>traffic),snapshot=await e.snapshotTrigger({auth,p,phase});
 current.serviceConfig.revision=current.serviceConfig.revision.replace('00001','00002');
 traffic=runServiceRow(current,{generation:'2'});
 const restorePreviousRevision=async target=>{
  assert.deepEqual(target,{service:snapshot.traffic.service,region:s.ADDED.preview.region,
   revision:snapshot.traffic.targets[0].revision,percent:100});restored++;
  traffic=runServiceRow(current,{revision:target.revision,generation:'3'});
 };
 await assert.rejects(e.rollbackCreatedTrigger({auth,p,phase,snapshot,restorePreviousRevision}),/POSTIMAGE_REQUIRED_FOR_RESTORE/);
 const postimage=await e.captureTrigger({auth,p,phase,snapshot});
 const result=await e.rollbackCreatedTrigger({auth,p,phase,snapshot,postimage,restorePreviousRevision});
 assert.equal(result.status,'EXACT_PREVIOUS_PREVIEW_REVISION_RESTORED');assert.equal(restored,1);
 current.serviceConfig.revision+='-concurrent';
 await assert.rejects(e.rollbackCreatedTrigger({auth,p,phase,snapshot,postimage,restorePreviousRevision}),/POSTIMAGE_CHANGED/);
 assert.equal(restored,1);
});
function trafficRollbackFixture(){
 const {p}=fixture(),phase='preview';let current=functionRow(p,phase);
 current.serviceConfig.revision='orbit360makeleadingresspreview-00002-wem';
 const projection=e.fnProjection(current,p,phase);
 p.makeIngress.targetBefore.preview={...s.ADDED.preview,state:'EXISTING_APPROVED',revision:projection.revision,
  configurationDigest:projection.configurationDigest,receiptBlob:'c'.repeat(40)};
 let traffic=runServiceRow(current,{revision:'orbit360makeleadingresspreview-00001-cuy',generation:'8'});
 const calls=[],inner=authFor(()=>current,()=>traffic);
 const auth={request:async op=>{calls.push(clone(op));return inner.request(op);}};
 return{p,phase,auth,calls,get current(){return current;},get traffic(){return traffic;},
  deploy(){current.serviceConfig.revision='orbit360makeleadingresspreview-00003-new';traffic=runServiceRow(current,{generation:'9'});},
  setTraffic(value){traffic=value;},setFunction(value){current=value;}};
}
test('reproduces API wem with traffic cuy and restores observed cuy with authenticated readback',async()=>{
 const f=trafficRollbackFixture(),snapshot=await e.snapshotTrigger(f);
 assert.equal(snapshot.function.revision,'orbit360makeleadingresspreview-00002-wem');
 assert.equal(snapshot.traffic.targets[0].revision,'orbit360makeleadingresspreview-00001-cuy');
 assert.notEqual(snapshot.function.revision,snapshot.traffic.targets[0].revision,'the old restore argument chose the wrong revision');
 assert.ok(f.calls.every(x=>x.method==='GET'));assert.equal(f.calls.filter(x=>x.url.startsWith('https://run.googleapis.com/v2/')).length,1);
 f.deploy();const postimage=await e.captureTrigger({...f,snapshot});let writes=0;
 const restorePreviousRevision=async target=>{
  writes++;assert.equal(target.revision,'orbit360makeleadingresspreview-00001-cuy');assert.equal(target.percent,100);
  assert.equal(target.configurationDigest,undefined,'routing target is not a rewritten Functions projection');
  f.setTraffic(runServiceRow(f.current,{revision:target.revision,generation:'10'}));
 };
 const result=await e.rollbackCreatedTrigger({...f,snapshot,postimage,restorePreviousRevision});
 assert.equal(result.status,'EXACT_PREVIOUS_PREVIEW_REVISION_RESTORED');assert.equal(result.trafficWrites,1);assert.equal(writes,1);
 assert.equal(result.restoredRevision,'orbit360makeleadingresspreview-00001-cuy');
 assert.equal(f.current.serviceConfig.revision,'orbit360makeleadingresspreview-00003-new','Functions metadata is not relabeled by routing rollback');
 const again=await e.rollbackCreatedTrigger({...f,snapshot,postimage,restorePreviousRevision});
 assert.equal(again.status,'EXACT_PREVIOUS_PREVIEW_REVISION_ALREADY_RESTORED');assert.equal(again.trafficWrites,0);assert.equal(writes,1);
});
test('preflight unchanged Functions metadata cannot hide a traffic-only concurrent change',async()=>{
 const f=trafficRollbackFixture(),snapshot=await e.snapshotTrigger(f);let writes=0;
 f.setTraffic(runServiceRow(f.current,{revision:'orbit360makeleadingresspreview-00004-other',generation:'9'}));
 await assert.rejects(e.rollbackCreatedTrigger({...f,snapshot,restorePreviousRevision:async()=>{writes++;}}),/TRAFFIC_PREIMAGE_CHANGED/);
 assert.equal(writes,0);
});
test('historical existing snapshots without traffic remain readable but cannot authorize restore or unchanged success',async()=>{
 const f=trafficRollbackFixture(),snapshot=await e.snapshotTrigger(f);delete snapshot.traffic;let writes=0;
 await assert.rejects(e.rollbackCreatedTrigger({...f,snapshot,restorePreviousRevision:async()=>{writes++;}}),/PREVIOUS_TRAFFIC_PROOF_REQUIRED/);
 f.deploy();const postimage=await e.captureTrigger({...f,snapshot});
 await assert.rejects(e.rollbackCreatedTrigger({...f,snapshot,postimage,restorePreviousRevision:async()=>{writes++;}}),/PREVIOUS_TRAFFIC_PROOF_REQUIRED/);
 assert.equal(writes,0);
});
test('a missing snapshot is never permission to infer a previous serving revision',async()=>{
 const f=trafficRollbackFixture();let writes=0;
 await assert.rejects(e.rollbackCreatedTrigger({...f,restorePreviousRevision:async()=>{writes++;}}));
 assert.equal(writes,0);assert.equal(f.calls.length,0);
});
test('historical ABSENT snapshots retain the exact created-function deletion contract without inferred traffic',async()=>{
 const {p}=fixture(),phase='live';let current=null,deletes=0;
 const auth=authFor(()=>current),snapshot=await e.snapshotTrigger({auth,p,phase});delete snapshot.traffic;
 current=functionRow(p,phase);const postimage=await e.captureTrigger({auth,p,phase,snapshot});delete postimage.traffic;
 const result=await e.rollbackCreatedTrigger({auth,p,phase,snapshot,postimage,deleteFunction:async()=>{deletes++;current=null;}});
 assert.equal(result.functionDeletes,1);assert.equal(deletes,1);
});
test('a successful restore command without an exact traffic readback remains HOLD',async()=>{
 const f=trafficRollbackFixture(),snapshot=await e.snapshotTrigger(f);f.deploy();
 const postimage=await e.captureTrigger({...f,snapshot});let writes=0;
 await assert.rejects(e.rollbackCreatedTrigger({...f,snapshot,postimage,restorePreviousRevision:async()=>{writes++;}}),/TRAFFIC_RESTORE_UNVERIFIED/);
 assert.equal(writes,1);
});
for(const [label,mutate] of [
 ['missing postimage traffic',(f,p)=>{delete p.traffic;}],
 ['changed traffic revision',f=>{f.setTraffic(runServiceRow(f.current,{revision:'orbit360makeleadingresspreview-00004-other',generation:'10'}));}],
 ['changed service identity',f=>{f.traffic.uid='87654321-4321-4321-8321-cba987654321';}],
 ['changed traffic generation',f=>{f.traffic.generation=f.traffic.observedGeneration='10';}]
])test('compensation rejects '+label+' before any traffic write',async()=>{
 const f=trafficRollbackFixture(),snapshot=await e.snapshotTrigger(f);f.deploy();
 const postimage=await e.captureTrigger({...f,snapshot});mutate(f,postimage);let writes=0;
 await assert.rejects(e.rollbackCreatedTrigger({...f,snapshot,postimage,restorePreviousRevision:async()=>{writes++;}}));
 assert.equal(writes,0);
});
test('the observed Cloud Run revision must be the new deployment at postimage capture',async()=>{
 const f=trafficRollbackFixture(),snapshot=await e.snapshotTrigger(f);f.deploy();
 f.setTraffic(runServiceRow(f.current,{revision:'orbit360makeleadingresspreview-00001-cuy',generation:'9'}));
 await assert.rejects(e.captureTrigger({...f,snapshot}),/DEPLOYED_REVISION_NOT_SERVING/);
});
for(const [label,mutate] of [
 ['missing traffic',r=>{delete r.trafficStatuses;}],
 ['two revisions',r=>{r.trafficStatuses[0].percent=50;r.trafficStatuses.push({...r.trafficStatuses[0],revision:'orbit360makeleadingresspreview-00009-split'});}],
 ['zero-percent extra target',r=>{r.trafficStatuses.push({...r.trafficStatuses[0],percent:0});}],
 ['partial traffic',r=>{r.trafficStatuses[0].percent=99;}],
 ['string percent',r=>{r.trafficStatuses[0].percent='100';}],
 ['tagged traffic',r=>{r.trafficStatuses[0].tag='candidate';}],
 ['malformed tag',r=>{r.trafficStatuses[0].tag=false;}],
 ['unknown allocation',r=>{r.trafficStatuses[0].type='TRAFFIC_TARGET_ALLOCATION_TYPE_UNSPECIFIED';}],
 ['reconciling',r=>{r.reconciling=true;}],
 ['not ready',r=>{r.terminalCondition.state='CONDITION_FAILED';}],
 ['missing readiness',r=>{delete r.terminalCondition;}],
 ['unobserved generation',r=>{r.observedGeneration='7';}],
 ['numeric generation',r=>{r.generation=r.observedGeneration=8;}],
 ['missing UID',r=>{delete r.uid;}],
 ['foreign service',r=>{r.name=r.name.replace('ays-orbit-360-lab','other-project');}],
 ['foreign revision',r=>{r.trafficStatuses[0].revision='projects/other-project/locations/us-east1/services/orbit360makeleadingresspreview/revisions/orbit360makeleadingresspreview-00001-cuy';}]
])test('traffic snapshot fails closed on '+label,async()=>{
 const f=trafficRollbackFixture();mutate(f.traffic);
 await assert.rejects(e.snapshotTrigger(f));assert.ok(f.calls.every(x=>x.method==='GET'));
});
test('project ID/number and qualified/short revisions normalize only within the exact allowlist',()=>{
 const f=trafficRollbackFixture(),fn=e.fnProjection(f.current,f.p,f.phase),row=clone(f.traffic);
 row.name=row.name.replace('projects/ays-orbit-360-lab/','projects/646761409743/');
 row.trafficStatuses[0].revision=row.name+'/revisions/'+row.trafficStatuses[0].revision;
 const projection=e.trafficProjection(row,fn,f.phase);
 assert.equal(projection.service,fn.service);assert.equal(projection.targets[0].revision,'orbit360makeleadingresspreview-00001-cuy');
 row.trafficStatuses[0].type='TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST';
 row.latestReadyRevision=row.trafficStatuses[0].revision;
 delete row.reconciling;
 assert.equal(e.trafficProjection(row,fn,f.phase).targets[0].revision,'orbit360makeleadingresspreview-00001-cuy');
 row.latestReadyRevision=fn.revision;
 assert.throws(()=>e.trafficProjection(row,fn,f.phase),/LATEST_NOT_OBSERVED/);
});
test('routing observation cannot request an arbitrary project/service URL or tolerate auth failure',async()=>{
 const f=trafficRollbackFixture(),fn=e.fnProjection(f.current,f.p,f.phase);let requests=0;
 const auth={request:async()=>{requests++;throw{response:{status:403}};}};
 await assert.rejects(e.deployedTraffic(auth,f.p,f.phase,{...fn,service:'projects/other/locations/us-east1/services/foreign'}),/SERVICE_SCOPE_DENIED/);
 assert.equal(requests,0);
 await assert.rejects(e.deployedTraffic(auth,f.p,f.phase,fn));assert.equal(requests,1);
});
test('Functions metadata drifting during the routing observation invalidates the snapshot',async()=>{
 const f=trafficRollbackFixture(),fn=e.fnProjection(f.current,f.p,f.phase),inner=f.auth;
 const auth={request:async op=>{const result=await inner.request(op);
  if(op.url.startsWith('https://run.googleapis.com/'))f.current.serviceConfig.revision='orbit360makeleadingresspreview-00099-concurrent';
  return result;
 }};
 await assert.rejects(e.deployedTraffic(auth,f.p,f.phase,fn),/FUNCTION_CHANGED_DURING_TRAFFIC_READ/);
});
test('protected operation requires exact source, artifact, scope, fresh expiry and explicit action',()=>{
 const {p}=fixture(),now=Date.parse('2026-11-24T12:00:00Z'),op={schema:'GI_I66_MAKE_INGRESS_PROTECTED_OPERATION_V1',
  phase:'live',scopeContractBlob:s.CONTRACT_BLOB,sourceSha:p.sourceSha,artifactDigest:p.artifactDigest,approvedByDirection:true,
  externalMessagesSent:0,action:'ACTIVATE',version:1,expectedConfigDigest:'a'.repeat(64),expiresAt:new Date(now+600000).toISOString()};
 assert.equal(e.requireOperation(op,p,'live',now),op);
 for(const mutate of [v=>v.phase='preview',v=>v.sourceSha='0'.repeat(40),v=>v.artifactDigest='sha256:'+'0'.repeat(64),
  v=>v.approvedByDirection=false,v=>v.action='WRITE_LEAD',v=>v.externalMessagesSent=1,v=>v.version=0,v=>v.expectedConfigDigest='ABSENT',
  v=>v.expiresAt=new Date(now-1).toISOString(),v=>v.expiresAt=new Date(now+900001).toISOString()]){const v=clone(op);mutate(v);assert.throws(()=>e.requireOperation(v,p,'live',now));}
});
test('postcommit activation cannot use a previous source, a frontend-only receipt or an active pending release',()=>{
 const {p}=fixture(),control={status:'OPERATIONAL_EXACT_LIVE_ACCEPTED_LOCKED',lastConsumedOperationalCandidate:p,
  currentPhysicalHostingRelease:{sourceSha:p.sourceSha,artifactDigest:p.artifactDigest},
  currentPhysicalBackendRelease:{sourceSha:p.sourceSha,functionsChanged:5}};
 assert.equal(e.resolveCandidate(control,'live',true),p);
 for(const mutate of [v=>v.currentPhysicalHostingRelease.sourceSha='1'.repeat(40),v=>v.currentPhysicalBackendRelease.functionsChanged=4,
  v=>v.currentPhysicalBackendRelease.sourceSha='1'.repeat(40),v=>v.operationalReleaseCandidate=p]){
  const v=clone(control);mutate(v);assert.throws(()=>e.resolveCandidate(v,'live',true));}
});
test('Make execution must bind the observed scenario, connection and exact outside-data queue document',()=>{
 const r={schema:'GI_I66_MAKE_QUEUE_EXECUTION_RECEIPT_V1',status:'success',scenarioId:c.SCENARIO,connectionId:c.FIRESTORE_CONNECTION,
  module:'google-cloud-firestore:createDocument',externalMessagesSent:0,executionId:'execution-001',
  documentName:`projects/ays-orbit-360-lab/databases/(default)/documents/${ROOT}/leadIngressRequests/queue-1`};
 const check=row=>{const b=Buffer.from(JSON.stringify(row)),binding={path:'artifacts/orbit360-recovery/release-control/I6_6_TEST_MAKE_EXECUTION.json',gitBlobSha:blob(b)};
  return e.verifyMakeExecution(binding,()=>b);};assert.equal(check(r).executionId,r.executionId);
 for(const mutate of [v=>v.scenarioId=10195867,v=>v.connectionId=14749710,v=>v.documentName=v.documentName.replace('leadIngressRequests','data/negocios/items'),
  v=>v.externalMessagesSent=1,v=>v.status='in_progress']){const v=clone(r);mutate(v);assert.throws(()=>check(v));}
});
// Reuse the existing meaningful transaction/owner harness without registering
// its test cases again. All creates below execute the real canonical writer.
const harnessPath=path.join(__dirname,'gravicentra-i66-make-lead-ingress.test.cjs');
const harness=new Module(harnessPath,module);harness.filename=harnessPath;harness.paths=Module._nodeModulePaths(__dirname);
harness._compile(fs.readFileSync(harnessPath,'utf8').split("test('bridge response preserves")[0]+
  '\nmodule.exports={setup,fixtures,NOW,Database};',harnessPath);
const h=harness.exports;
function makeReadbacks(){
 const f=h.setup({preview:true}),{p}=fixture();f.grant.authority.sourceSha=p.sourceSha;
 f.grant.deployedFunction={name:s.ADDED.preview.name,region:s.ADDED.preview.region,revision:functionRow(p,'preview').serviceConfig.revision};
 f.db.seed(f.grantPath,f.grant);
 const times=new Map([...f.db.documents.keys()].map(k=>[k,h.NOW])),originalSeed=f.db.seed.bind(f.db),originalSnap=f.db.snap.bind(f.db),originalTx=f.db.runTransaction.bind(f.db);
 let tick=h.NOW;
 f.db.seed=(key,value)=>{if(!f.db.documents.has(key))times.set(key,++tick);originalSeed(key,value);};
 f.db.snap=key=>({...originalSnap(key),createTime:{toMillis:()=>times.get(key)||h.NOW}});
 f.db.runTransaction=fn=>originalTx(tx=>{tx.delete=ref=>tx.set(ref,undefined);return fn(tx);});
 const bindings=new Map(),bind=(key,row)=>{const b=Buffer.from(JSON.stringify(row)),binding={path:`artifacts/orbit360-recovery/release-control/I6_6_TEST_${key}.json`,gitBlobSha:blob(b)};
  bindings.set(binding.path,b);return binding;};
 const execution=id=>bind(id.toUpperCase().replaceAll('-','_'),{schema:'GI_I66_MAKE_QUEUE_EXECUTION_RECEIPT_V1',status:'success',scenarioId:c.SCENARIO,
  connectionId:c.FIRESTORE_CONNECTION,module:'google-cloud-firestore:createDocument',externalMessagesSent:0,executionId:'execution-'+id,
  documentName:`projects/ays-orbit-360-lab/databases/(default)/documents/${ROOT}/${c.PREVIEW_QUEUE}/${id}`});
 const enqueue=async(id,row=f.row)=>{const event={...f.event,params:{requestId:id},data:{...f.event.data,
  ref:{path:`${ROOT}/${c.PREVIEW_QUEUE}/${id}`},createTime:{toMillis:()=>++tick},data:()=>clone(row)}};
  f.db.seed(event.data.ref.path,row);return f.bridge.__makeLeadIngress.handle(event,true,{db:f.db,nowMs:h.NOW});};
 const fn={...e.fnProjection(functionRow(p,'preview'),p,'preview'),queueRulesDenyClient:true};
 const authority=e.configAuthority(p,'preview',fn,'a'.repeat(40)),closed=trigger(p,'preview');
 const op={action:'CAPTURE_AFTER_CREATE',expectedConfigDigest:c.digest(f.grant),createExecutionReceipt:execution(f.event.params.requestId),
  closedTriggerProof:bind('CLOSED_PROOF',{closedTrigger:closed})};
 const args={db:f.db,p,phase:'preview',op,authority,fn,read:file=>bindings.get(file),nowMs:h.NOW,committed:false};
 return{f,p,op,args,enqueue,execution,times,fn,authority};
}
test('protected verifier observes canonical create, captures before replay, checks zero-write replay and reject, restores only five synthetic documents',async()=>{
 const x=makeReadbacks(),first=await x.enqueue(x.f.event.params.requestId);assert.equal(first.status,'APPLIED_VERIFIED');
 const captured=await e.captureOrVerify(x.args);assert.equal(captured.canonicalLeadWrites,1);assert.equal(captured.operationalWritesByVerifier,0);
 assert.equal((await x.enqueue('queue-replay')).status,'REPLAY_VERIFIED');
 assert.equal((await x.enqueue('queue-reject',{...x.f.row,qaNonce:'f'.repeat(64)})).status,'HOLD');
 Object.assign(x.op,{action:'VERIFY_PREVIEW',replayExecutionReceipt:x.execution('queue-replay'),rejectExecutionReceipt:x.execution('queue-reject')});
 const proof=await e.captureOrVerify(x.args);assert.equal(proof.status,'PASS');assert.equal(proof.realLeadAccepted,false);
 assert.equal(proof.replayCanonicalWrites,0);assert.equal(proof.rejectCanonicalWrites,0);assert.equal(proof.syntheticDocumentsRestored,5);
 assert.equal(x.f.db.documents.get(x.f.grantPath).state,'CLOSED');assert.equal(proof.afterDigest,c.digest(x.f.db.documents.get(x.f.grantPath)));
 assert.equal([...x.f.db.documents.keys()].filter(k=>k.includes('/data/negocios/items/')).length,0);
 assert.ok([...x.f.db.documents.keys()].some(k=>k.includes('/previewLeadIngressResults/')),'append-only evidence remains');
});
test('replay captured before the before-snapshot or mutated canonical data cannot certify zero-write replay',async()=>{
 for(const kind of ['EARLY_REPLAY','CHANGED_LEAD']){
  const x=makeReadbacks();await x.enqueue(x.f.event.params.requestId);
  if(kind==='EARLY_REPLAY')await x.enqueue('queue-replay');
  await e.captureOrVerify(x.args);
  if(kind==='CHANGED_LEAD'){await x.enqueue('queue-replay');const entry=[...x.f.db.documents].find(([k])=>k.includes('/data/negocios/items/'));
    x.f.db.seed(entry[0],{...entry[1],nombre:'Changed after snapshot'});}
  await x.enqueue('queue-reject',{...x.f.row,qaNonce:'f'.repeat(64)});
  Object.assign(x.op,{action:'VERIFY_PREVIEW',replayExecutionReceipt:x.execution('queue-replay'),rejectExecutionReceipt:x.execution('queue-reject')});
  await assert.rejects(e.captureOrVerify(x.args));
  assert.equal([...x.f.db.documents.keys()].filter(k=>k.includes('/data/negocios/items/')).length,1,'HOLD cannot delete an unverified record');
 }
});
test('rollback configuration uses the exact last known digest and refuses concurrent edits',async()=>{
 const x=makeReadbacks(),deployment={phase:'preview',sourceSha:x.p.sourceSha,artifactDigest:x.p.artifactDigest,
  function:x.fn,rules:{queueRulesDenyClient:true}};
 const expectedDigest=c.digest(x.f.grant);x.f.db.seed(x.f.grantPath,{...x.f.grant,maxSourceAgeSeconds:1000});
 await assert.rejects(e.closeForRollback({db:x.f.db,p:x.p,phase:'preview',deployment,expectedDigest,authorityBlob:'a'.repeat(40)}),/POSTIMAGE_CHANGED/);
 x.f.db.seed(x.f.grantPath,x.f.grant);
 const closed=await e.closeForRollback({db:x.f.db,p:x.p,phase:'preview',deployment,expectedDigest,authorityBlob:'a'.repeat(40)});
 assert.equal(closed.state,'CLOSED');assert.equal(closed.canonicalLeadWrites,0);assert.equal(closed.externalMessagesSent,0);
});
test('predeployment gate rejects ACTIVE or changed config before any runtime/IAM operation',async()=>{
 const x=makeReadbacks();let calls=0;
 x.p.makeIngress.closedConfiguration.preview.expectedDigest=c.digest(x.f.grant);
 await assert.rejects(e.beforeDeploy({db:x.f.db,p:x.p,phase:'preview',requireFrom:()=>{calls++;throw Error();}}),/MUST_BE_CLOSED/);
 x.p.makeIngress.closedConfiguration.preview.expectedDigest='ABSENT';
 await assert.rejects(e.beforeDeploy({db:x.f.db,p:x.p,phase:'preview',requireFrom:()=>{calls++;throw Error();}}),/PREIMAGE_CHANGED/);
 assert.equal(calls,0);
});
