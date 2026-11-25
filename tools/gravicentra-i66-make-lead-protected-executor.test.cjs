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
 return{name:fn.serviceConfig.service,etag:'etag-'+generation,uid:'12345678-1234-4234-8234-123456789abc',generation,observedGeneration:generation,
  terminalCondition:{state:'CONDITION_SUCCEEDED'},reconciling:false,
  latestReadyRevision:fn.serviceConfig.revision,trafficStatuses:[{type,revision,percent:100}]};
}
function runV1ServiceRow(fn,traffic){
 return{apiVersion:'serving.knative.dev/v1',kind:'Service',metadata:{name:fn.serviceConfig.service.split('/').at(-1),namespace:'646761409743',
  uid:traffic.uid,generation:Number(traffic.generation),resourceVersion:'rv-'+traffic.generation+'-'+String(traffic.etag),
  annotations:{'fixture.private':'PRIVATE_ANNOTATION'},labels:{'fixture.private':'PRIVATE_LABEL'}},
  spec:{template:{metadata:{name:fn.serviceConfig.revision,annotations:{'fixture.private':'PRIVATE_TEMPLATE'}},
   spec:{containers:[{image:'PRIVATE_EXISTING_IMAGE',env:[{name:'PRIVATE_KEY',value:'PRIVATE_ENV'}]}]}},
   traffic:traffic.trafficStatuses.map(t=>({revisionName:t.revision,percent:t.percent,latestRevision:false}))},
  status:{observedGeneration:Number(traffic.observedGeneration),traffic:traffic.trafficStatuses.map(t=>({revisionName:t.revision,percent:t.percent,...(t.tag?{tag:t.tag}:{})}))}};
}
const authFor=(get,getTraffic,getV1)=>({request:async op=>{
 assert.equal(op.method,'GET');const value=get();if(value===null)throw{response:{status:404}};
 if(op.url==='https://cloudfunctions.googleapis.com/v2/'+value.name)return{data:clone(value)};
 const traffic=getTraffic?getTraffic():runServiceRow(value);
 if(op.url.includes('/apis/serving.knative.dev/v1/')){
  const region=value.name.split('/')[3],name=value.serviceConfig.service.split('/').at(-1);
  assert.equal(op.url,'https://'+region+'-run.googleapis.com/apis/serving.knative.dev/v1/namespaces/ays-orbit-360-lab/services/'+name);
  return{data:clone(getV1?getV1():runV1ServiceRow(value,traffic))};
 }
 assert.match(op.url,/^https:\/\/run\.googleapis\.com\/v2\/projects\/ays-orbit-360-lab\/locations\/(us-east1|us-central1)\/services\/orbit360makeleadingress(preview)?$/);
 return{data:clone(traffic)};
}});
function closedGrantFixture(p,phase){
 const f=makeReadbacks().f,grant={...f.grant,state:'CLOSED',enabled:false};f.db.seed(f.grantPath,grant);
 p.makeIngress.closedConfiguration[phase].expectedDigest=c.digest(grant);
 return{db:f.db,grantPath:f.grantPath,grant};
}
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
 const {db}=closedGrantFixture(p,phase);
 let traffic=runServiceRow(current);const auth=authFor(()=>current,()=>traffic),snapshot=await e.snapshotTrigger({auth,p,phase});
 current.serviceConfig.revision=current.serviceConfig.revision.replace('00001','00002');
 traffic=runServiceRow(current,{generation:'2'});
 const restorePreviousRevision=async target=>{
  assert.deepEqual(target,{service:snapshot.traffic.service,region:s.ADDED.preview.region,
   revision:snapshot.traffic.targets[0].revision,percent:100});restored++;
  traffic=runServiceRow(current,{revision:target.revision,generation:'3'});
 };
 await assert.rejects(e.rollbackCreatedTrigger({db,auth,p,phase,snapshot,restorePreviousRevision}),/POSTIMAGE_REQUIRED_FOR_RESTORE/);
 const postimage=await e.captureTrigger({auth,p,phase,snapshot});
 const result=await e.rollbackCreatedTrigger({db,auth,p,phase,snapshot,postimage,restorePreviousRevision});
 assert.equal(result.status,'EXACT_PREVIOUS_PREVIEW_REVISION_RESTORED');assert.equal(restored,1);
 current.serviceConfig.revision+='-concurrent';
 await assert.rejects(e.rollbackCreatedTrigger({db,auth,p,phase,snapshot,postimage,restorePreviousRevision}),/POSTIMAGE_CHANGED/);
 assert.equal(restored,1);
});
function trafficRollbackFixture(){
 const {p}=fixture(),phase='preview';let current=functionRow(p,phase);
 current.serviceConfig.revision='orbit360makeleadingresspreview-00002-wem';
 const projection=e.fnProjection(current,p,phase);
 p.makeIngress.targetBefore.preview={...s.ADDED.preview,state:'EXISTING_APPROVED',revision:projection.revision,
  configurationDigest:projection.configurationDigest,receiptBlob:'c'.repeat(40)};
 let traffic=runServiceRow(current,{revision:'orbit360makeleadingresspreview-00001-cuy',generation:'8'});
 const closed=closedGrantFixture(p,phase);let v1Override=null;
 const v1=()=>v1Override||runV1ServiceRow(current,traffic);
 const calls=[],inner=authFor(()=>current,()=>traffic,v1);
 const auth={request:async op=>{calls.push(clone(op));return inner.request(op);}};
 return{p,phase,auth,calls,...closed,pause:async()=>{},get v1(){return v1();},setV1(row){v1Override=row;},get current(){return current;},get traffic(){return traffic;},
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
test('a stale serving revision without a fresh provider etag cannot authorize alignment or acceptance',async()=>{
 const f=trafficRollbackFixture(),snapshot=await e.snapshotTrigger(f);f.deploy();
 f.setTraffic(runServiceRow(f.current,{revision:'orbit360makeleadingresspreview-00001-cuy',generation:'9'}));delete f.traffic.etag;
  await assert.rejects(e.captureTrigger({...f,snapshot}),/TRAFFIC_CAS_ETAG_REQUIRED/);
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

async function routingCaptureFixture(){
 const f=trafficRollbackFixture(),snapshot=await e.snapshotTrigger(f);f.deploy();
 f.setTraffic({...runServiceRow(f.current,{revision:snapshot.traffic.targets[0].revision,generation:'9'}),etag:'"routing-before"'});
 const grantFixture=makeReadbacks(),db=grantFixture.f.db,grantPath=grantFixture.f.grantPath;
 const grant={...grantFixture.f.grant,state:'CLOSED',enabled:false};db.seed(grantPath,grant);
 f.p.makeIngress.closedConfiguration[f.phase].expectedDigest=c.digest(grant);
 const x={f,p:f.p,phase:f.phase,snapshot,db,grantPath,grant,grantReads:0,beforeGrantRead:null,
  patches:[],diagnostics:[],postimages:[],reads:[],pauses:[],beforeRead:null,
  patch:async()=>{f.setTraffic({...runServiceRow(f.current,{generation:'10'}),etag:'"routing-after"'});return{data:{name:'projects/ays-orbit-360-lab/locations/us-east1/operations/fixture-only',done:false}};}};
 const snap=db.snap.bind(db);db.snap=p=>{if(p===grantPath){x.grantReads++;if(x.beforeGrantRead)x.beforeGrantRead(x.grantReads);}return snap(p);};
 x.auth={request:async op=>{
  if(op.method==='PUT'){x.patches.push(clone(op));return x.patch(op);}
  x.reads.push(clone(op));if(x.beforeRead)await x.beforeRead(op);return f.auth.request(op);
 }};
 x.args=()=>({db:x.db,auth:x.auth,p:x.p,phase:x.phase,snapshot:x.snapshot,
  retainDiagnostic:r=>x.diagnostics.push(clone(r)),retainPostimage:r=>x.postimages.push(clone(r)),pause:async ms=>x.pauses.push(ms)});
 return x;
}
test('capture routes only the exact postdeploy revision through one full-preimage V1 resourceVersion CAS and real serving readback',async()=>{
 const x=await routingCaptureFixture(),before=clone(x.f.v1),result=await e.captureTrigger(x.args());
 assert.equal(x.patches.length,1);
 const expected=clone(before);delete expected.status;expected.spec.traffic=[{revisionName:x.f.current.serviceConfig.revision,percent:100,latestRevision:false}];
 assert.deepEqual(x.patches[0],{url:'https://us-east1-run.googleapis.com/apis/serving.knative.dev/v1/namespaces/ays-orbit-360-lab/services/orbit360makeleadingresspreview',method:'PUT',
  data:expected,timeout:30000,retry:false,maxRedirects:0});
 assert.equal(result.status,'DEPLOYED_REVISION_SERVING_VERIFIED');assert.equal(result.routing.trafficWrites,1);
 assert.equal(result.traffic.targets[0].revision,result.function.revision);assert.equal(result.traffic.generation,'10');
 assert.equal(x.diagnostics.at(-1).status,'DEPLOYED_REVISION_SERVING_VERIFIED');
 assert.ok(x.postimages.some(p=>p.status==='OBSERVED_NOT_ACCEPTED'&&p.traffic.targets[0].revision===x.snapshot.traffic.targets[0].revision));
 assert.equal(x.postimages.at(-1).status,result.status);assert.equal(x.pauses.length,0);
 const again=await e.captureTrigger(x.args());assert.equal(again.routing.trafficWrites,0);assert.equal(x.patches.length,1);
});
test('capture retains a classified assertion and observed prior route before refusing a missing etag',async()=>{
 const x=await routingCaptureFixture();delete x.f.traffic.etag;
 await assert.rejects(e.captureTrigger(x.args()),/TRAFFIC_CAS_ETAG_REQUIRED/);
 assert.equal(x.patches.length,0);assert.equal(x.diagnostics.at(-1).errorCode,'INGRESS_TRAFFIC_CAS_ETAG_REQUIRED');
 assert.equal(x.diagnostics.at(-1).routing.trafficWrites,0);
 assert.ok(x.diagnostics.at(-1).observations.some(o=>o.kind==='POSTDEPLOY_PAIR'));
 assert.equal(x.postimages.at(-1).status,'OBSERVED_NOT_ACCEPTED');
});
for(const status of [409,412])test('a traffic etag conflict '+status+' is HOLD without a second PUT or refreshed mutation token',async()=>{
 const x=await routingCaptureFixture();x.patch=async()=>{throw{response:{status}};};
 await assert.rejects(e.captureTrigger(x.args()),/INGRESS_TRAFFIC_CAS_CONFLICT/);
 assert.equal(x.patches.length,1);assert.equal(x.diagnostics.at(-1).routing.trafficWrites,0);
 assert.equal(x.diagnostics.at(-1).routing.httpStatus,status);assert.equal(x.pauses.length,0);
});
test('an ambiguous routing transport failure is retained with an unknown write count',async()=>{
 const x=await routingCaptureFixture();x.patch=async()=>{throw Object.assign(Error('private provider message'),{code:'ETIMEDOUT'});};
 await assert.rejects(e.captureTrigger(x.args()));assert.equal(x.patches.length,1);
 const report=x.diagnostics.at(-1);assert.equal(report.routing.trafficWrites,null);assert.equal(report.status,'HOLD');
 assert.equal(report.errorCode,'I66_MAKE_PROTECTED_EXECUTION_HOLD');assert.ok(!JSON.stringify(report).includes('private provider message'));
});
for(const [label,mutate,code]of[
 ['different prior route',x=>{x.f.traffic.trafficStatuses[0].revision='orbit360makeleadingresspreview-00009-other';},'ALIGNMENT_PREIMAGE_CHANGED'],
 ['recreated service',x=>{x.f.traffic.uid='87654321-4321-4321-8321-cba987654321';},'SERVICE_RECREATED'],
 ['different trigger configuration',x=>{x.f.current.eventTrigger.trigger+='-other';},'NON_REVISION_CONFIGURATION_CHANGED'],
 ['missing previous traffic',x=>{delete x.snapshot.traffic;},'PREVIOUS_TRAFFIC_PROOF_REQUIRED'],
 ['absent previous state',x=>{x.snapshot.previousState='ABSENT';},'ALIGNMENT_EXISTING_PREIMAGE_REQUIRED'],
 ['regressed generation',x=>{x.f.traffic.generation=x.f.traffic.observedGeneration='7';},'GENERATION_REGRESSED']
])test('capture refuses '+label+' before any routing mutation',async()=>{
 const x=await routingCaptureFixture();mutate(x);await assert.rejects(e.captureTrigger(x.args()),new RegExp(code));
 assert.equal(x.patches.length,0);assert.equal(x.diagnostics.at(-1).status,'HOLD');
});
for(const change of ['etag','traffic','function'])test('capture rereads and rejects a concurrent '+change+' change before PUT',async()=>{
 const x=await routingCaptureFixture();let reads=0;
 x.beforeRead=async op=>{if(op.url.startsWith('https://run.googleapis.com/')&&++reads===2){
  if(change==='etag')x.f.traffic.etag='"changed"';
  if(change==='traffic')x.f.traffic.trafficStatuses[0].revision='orbit360makeleadingresspreview-00009-concurrent';
  if(change==='function')x.f.current.serviceConfig.revision='orbit360makeleadingresspreview-00009-concurrent';
 }};
 await assert.rejects(e.captureTrigger(x.args()),/CHANGED/);assert.equal(x.patches.length,0);
});
test('a pending traffic operation is observed until ready without repeating the mutation',async()=>{
 const x=await routingCaptureFixture();let afterReads=0;
 x.patch=async()=>{x.f.setTraffic({...runServiceRow(x.f.current,{generation:'10'}),etag:'"pending"',reconciling:true,observedGeneration:'9'});return{data:{done:false}};};
 x.beforeRead=async op=>{if(x.patches.length&&op.url.startsWith('https://run.googleapis.com/')&&++afterReads===2)
  x.f.setTraffic({...runServiceRow(x.f.current,{generation:'10'}),etag:'"ready"'});};
 const result=await e.captureTrigger(x.args());assert.equal(result.routing.trafficWrites,1);assert.equal(x.patches.length,1);assert.equal(x.pauses.length,1);
 assert.ok(x.diagnostics.at(-1).observations.some(o=>o.kind==='CLOUD_RUN_RESPONSE'&&o.reconciling===true));
});
test('a successful PUT response with no serving change remains HOLD and never claims acceptance',async()=>{
 const x=await routingCaptureFixture();x.patch=async()=>({data:{done:true}});
 await assert.rejects(e.captureTrigger(x.args()),/DEPLOYED_REVISION_NOT_SERVING/);
 assert.equal(x.patches.length,1);assert.equal(x.pauses.length,29);assert.equal(x.diagnostics.at(-1).routing.trafficWrites,null);
 assert.ok(x.postimages.every(p=>p.status==='OBSERVED_NOT_ACCEPTED'));
});
for(const [label,change,code]of[
 ['third-party route',x=>{x.f.traffic.trafficStatuses[0].revision='orbit360makeleadingresspreview-00009-other';},'ROUTING_TARGET_CHANGED'],
 ['recreated service',x=>{x.f.traffic.uid='87654321-4321-4321-8321-cba987654321';},'SERVICE_RECREATED'],
 ['extra generation',x=>{x.f.traffic.generation=x.f.traffic.observedGeneration='11';},'ROUTING_GENERATION_CHANGED'],
 ['concurrent function',x=>{x.f.current.serviceConfig.revision='orbit360makeleadingresspreview-00009-other';},'FUNCTION_CHANGED_DURING_TRAFFIC_READ']
])test('post-PUT '+label+' is retained diagnostically but never becomes rollback write authority',async()=>{
 const x=await routingCaptureFixture(),normal=x.patch;x.patch=async op=>{const r=await normal(op);change(x);return r;};
 await assert.rejects(e.captureTrigger(x.args()),new RegExp(code));assert.equal(x.patches.length,1);
 assert.equal(x.postimages.at(-1).traffic.targets[0].revision,x.snapshot.traffic.targets[0].revision);
 assert.equal(x.diagnostics.at(-1).status,'HOLD');assert.equal(x.diagnostics.at(-1).routing.trafficWrites,null);
});
test('rollback proves previous traffic intact after failed capture with no postimage and no Cloud write',async()=>{
 const x=await routingCaptureFixture();let writes=0;
 const result=await e.rollbackCreatedTrigger({...x.args(),restorePreviousRevision:async()=>{writes++;},deleteFunction:async()=>{writes++;}});
 assert.equal(result.status,'EXACT_PREVIOUS_PREVIEW_REVISION_ALREADY_RESTORED');assert.equal(result.trafficWrites,0);assert.equal(writes,0);
 assert.equal(result.functionMetadataRestored,false);assert.equal(result.observedFunctionRevision,x.f.current.serviceConfig.revision);
 assert.equal(result.restoredRevision,x.snapshot.traffic.targets[0].revision);
});
for(const [label,change]of[
 ['unknown serving revision',x=>{x.f.traffic.trafficStatuses[0].revision='orbit360makeleadingresspreview-00009-unknown';}],
 ['wrong service UID',x=>{x.f.traffic.uid='87654321-4321-4321-8321-cba987654321';}],
 ['changed trigger',x=>{x.f.current.eventTrigger.trigger+='-other';}],
 ['missing prior proof',x=>{delete x.snapshot.traffic;}]
])test('rollback without postimage rejects '+label+' without mutation',async()=>{
 const x=await routingCaptureFixture();change(x);let writes=0;
 await assert.rejects(e.rollbackCreatedTrigger({...x.args(),restorePreviousRevision:async()=>{writes++;}}));assert.equal(writes,0);
});
test('capture file retention survives HOLD inside the existing diagnostic artifact paths without raw private provider data',async()=>{
 const x=await routingCaptureFixture(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'gi-capture-retention-'));
 delete x.f.traffic.etag;x.f.traffic.template={environmentVariables:{privateValue:'never-publish-this'}};
 try{
  await assert.rejects(e.captureTrigger({...x.args(),...e.captureRecorders(dir,'preview')}),/CAS_ETAG_REQUIRED/);
  const files=fs.readdirSync(dir).sort();assert.deepEqual(files,['gi-make-preview-capture-trigger-observation.json','gi-make-preview-capture-trigger.json']);
  const raw=files.map(file=>fs.readFileSync(path.join(dir,file),'utf8')).join('\n');assert.ok(!raw.includes('never-publish-this'));
  const diagnostic=JSON.parse(fs.readFileSync(path.join(dir,files[0])));assert.equal(diagnostic.status,'HOLD');assert.equal(diagnostic.errorCode,'INGRESS_TRAFFIC_CAS_ETAG_REQUIRED');
  assert.match(fs.readFileSync(path.join(__dirname,'../.github/workflows/gravicentra-i66-privileged-role-three-function-preview-uat.yml'),'utf8'),/gi-make-preview-\*\.json/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('failure classification retains only a safe guard token and never an assertion value or provider message',()=>{
 let error;try{assert.equal('private actual','private expected','INGRESS_DEPLOYED_REVISION_NOT_SERVING');}catch(caught){error=caught;}
 assert.equal(e.safeFailureCode(error),'INGRESS_DEPLOYED_REVISION_NOT_SERVING');
 assert.equal(e.safeFailureCode({code:'INGRESS_ROLLBACK_UNVERIFIED',message:'private'}),'INGRESS_ROLLBACK_UNVERIFIED');
 assert.equal(e.safeFailureCode(Error('private provider value')),'I66_MAKE_PROTECTED_EXECUTION_HOLD');
});


for(const [label,change,code] of [
 ['ACTIVE grant with matching digest',x=>{const grant={...x.grant,state:'ACTIVE',enabled:true};x.db.seed(x.grantPath,grant);x.p.makeIngress.closedConfiguration.preview.expectedDigest=c.digest(grant);},'INGRESS_TRAFFIC_GRANT_MUST_BE_CLOSED'],
 ['enabled CLOSED grant with matching digest',x=>{const grant={...x.grant,enabled:true};x.db.seed(x.grantPath,grant);x.p.makeIngress.closedConfiguration.preview.expectedDigest=c.digest(grant);},'INGRESS_TRAFFIC_GRANT_MUST_BE_CLOSED'],
 ['changed CLOSED preimage',x=>x.db.seed(x.grantPath,{...x.grant,maxSourceAgeSeconds:1200}),'INGRESS_TRAFFIC_GRANT_PREIMAGE_CHANGED'],
 ['unexpected absence',x=>x.db.seed(x.grantPath,undefined),'INGRESS_TRAFFIC_GRANT_PREIMAGE_CHANGED'],
 ['unexpected existing grant',x=>{x.p.makeIngress.closedConfiguration.preview.expectedDigest='ABSENT';},'INGRESS_TRAFFIC_GRANT_PREIMAGE_CHANGED'],
 ['invalid expected digest',x=>{x.p.makeIngress.closedConfiguration.preview.expectedDigest='not-a-digest';},'INGRESS_TRAFFIC_GRANT_AUTHORITY_REQUIRED']
])test('CLOSED capture amendment: rejects '+label+' before traffic PUT',async()=>{
 const x=await routingCaptureFixture();change(x);
 await assert.rejects(e.captureTrigger(x.args()),new RegExp(code));assert.equal(x.patches.length,0);
 assert.equal(x.diagnostics.at(-1).errorCode,code);assert.equal(x.diagnostics.at(-1).routing.trafficWrites,0);
});
test('CLOSED capture amendment: grant race after routing preimage is caught before PUT',async()=>{
 const x=await routingCaptureFixture();let routingReads=0;
 x.beforeRead=async op=>{if(op.url.startsWith('https://run.googleapis.com/')&&++routingReads===2)
  x.db.seed(x.grantPath,{...x.grant,state:'ACTIVE',enabled:true});};
 await assert.rejects(e.captureTrigger(x.args()),/INGRESS_TRAFFIC_GRANT_PREIMAGE_CHANGED/);
 assert.equal(routingReads,2);assert.equal(x.patches.length,0);
 assert.equal(x.diagnostics.at(-1).routing.attempted,false);
});
test('CLOSED capture amendment: exact CLOSED preimage is read immediately before PUT and after verified traffic',async()=>{
 const x=await routingCaptureFixture(),normal=x.patch;
 x.patch=async op=>{assert.equal(x.grantReads,1);assert.equal(x.diagnostics.at(-1).routing.closedGrantBefore.digest,c.digest(x.grant));return normal(op);};
 const result=await e.captureTrigger(x.args());assert.equal(x.patches.length,1);assert.equal(x.grantReads,2);
 assert.deepEqual(result.routing.closedGrantAfter,result.routing.closedGrantBefore);
 assert.equal(result.routing.trafficWrites,1);assert.equal(result.status,'DEPLOYED_REVISION_SERVING_VERIFIED');
});
test('CLOSED capture amendment: an exactly authorized ABSENT grant stays absent without configuration writes',async()=>{
 const x=await routingCaptureFixture();x.db.seed(x.grantPath,undefined);x.p.makeIngress.closedConfiguration.preview.expectedDigest='ABSENT';
 const writes=x.db.writes.length,result=await e.captureTrigger(x.args());
 assert.equal(result.routing.closedGrantBefore.digest,'ABSENT');assert.equal(result.routing.closedGrantBefore.exists,false);
 assert.equal(result.routing.closedGrantAfter.digest,'ABSENT');assert.equal(x.db.writes.length,writes);
 assert.equal(x.patches.length,1);assert.equal(x.grantReads,2);
});
test('CLOSED capture amendment: post-PUT grant change holds acceptance and preserves exact applied routing',async()=>{
 const x=await routingCaptureFixture(),normal=x.patch;
 x.patch=async op=>{const result=await normal(op);x.db.seed(x.grantPath,{...x.grant,state:'ACTIVE',enabled:true});return result;};
 await assert.rejects(e.captureTrigger(x.args()),/INGRESS_TRAFFIC_GRANT_PREIMAGE_CHANGED/);
 assert.equal(x.patches.length,1);assert.equal(x.diagnostics.at(-1).routing.trafficWrites,1);
 assert.equal(x.diagnostics.at(-1).status,'HOLD');assert.equal(x.postimages.at(-1).status,'OBSERVED_NOT_ACCEPTED');
 assert.equal(x.postimages.at(-1).traffic.targets[0].revision,x.f.current.serviceConfig.revision);
 assert.ok(!x.postimages.some(p=>p.status==='DEPLOYED_REVISION_SERVING_VERIFIED'));
});
test('CLOSED capture amendment: no grant reader cannot authorize a traffic write',async()=>{
 const x=await routingCaptureFixture();await assert.rejects(e.captureTrigger({...x.args(),db:undefined}),/INGRESS_TRAFFIC_GRANT_READER_REQUIRED/);
 assert.equal(x.patches.length,0);
});
test('CLOSED capture amendment: finite safe codes reject unknown prefixed values and retain known invariants',()=>{
 for(const unknown of ['INGRESS_PRIVATE_TOKEN_123','INGRESS_'+ 'A'.repeat(5000)]){
  assert.equal(e.safeFailureCode({code:unknown,message:'private provider value'}),'I66_MAKE_PROTECTED_EXECUTION_HOLD');
  assert.equal(e.safeFailureCode(Error(unknown+' private provider value')),'I66_MAKE_PROTECTED_EXECUTION_HOLD');
 }
 for(const code of ['INGRESS_DEPLOYED_REVISION_NOT_SERVING','INGRESS_TRAFFIC_CAS_CONFLICT','INGRESS_TRAFFIC_GRANT_MUST_BE_CLOSED']){
  assert.equal(e.safeFailureCode({code,message:'private provider value'}),code);
  let error;try{assert.equal('private actual','private expected',code);}catch(caught){error=caught;}
  assert.equal(e.safeFailureCode(error),code);
 }
});

for(const phase of ['preview','live'])test('V1 causal: full preimage is immutable and only traffic/status change within exact '+phase+' scope',()=>{
 const {p}=fixture(),raw=functionRow(p,phase),fn=e.fnProjection(raw,p,phase),run=runServiceRow(raw),traffic=e.trafficProjection(run,fn,phase);
 const v1=runV1ServiceRow(raw,run),before=clone(v1),request=e.trafficV1Request(v1,traffic,phase,fn.revision);
 const expected=clone(before);delete expected.status;expected.spec.traffic=[{revisionName:fn.revision,percent:100,latestRevision:false}];
 assert.deepEqual(request.data,expected);assert.deepEqual(v1,before);assert.equal(request.method,'PUT');
 assert.equal(request.url,'https://'+(phase==='preview'?'us-east1':'us-central1')+'-run.googleapis.com/apis/serving.knative.dev/v1/namespaces/ays-orbit-360-lab/services/orbit360makeleadingress'+(phase==='preview'?'preview':''));
 assert.equal(request.retry,false);assert.equal(request.maxRedirects,0);assert.ok(!request.url.includes('?'));
 request.data.spec.template.spec.containers[0].image='changed';request.data.metadata.resourceVersion='changed';assert.deepEqual(v1,before);
 assert.throws(()=>e.trafficV1Request(v1,traffic,phase==='preview'?'live':'preview',fn.revision),/SCOPE_DENIED/);
 assert.throws(()=>e.trafficV1Request(v1,traffic,phase,'foreign-revision'),/REVISION_SCOPE_DENIED/);
});
for(const [label,change]of[
 ['missing resourceVersion',x=>delete x.metadata.resourceVersion],['invalid resourceVersion',x=>{x.metadata.resourceVersion='bad\nversion';}],
 ['wrong service UID',x=>{x.metadata.uid='87654321-4321-4321-8321-cba987654321';}],['wrong namespace',x=>{x.metadata.namespace='foreign';}],
 ['wrong generation',x=>{x.metadata.generation++;}],['missing template',x=>delete x.spec.template],
 ['different serving revision',x=>{x.status.traffic[0].revisionName='orbit360makeleadingresspreview-00009-other';}]
])test('V1 causal: refuses '+label+' without a transport write',async()=>{
 const x=await routingCaptureFixture(),v1=clone(x.f.v1);change(v1);x.f.setV1(v1);
 await assert.rejects(e.captureTrigger(x.args()));assert.equal(x.patches.length,0);
 assert.equal(x.diagnostics.at(-1).status,'HOLD');assert.ok(x.diagnostics.at(-1).observations.some(r=>r.kind==='CLOUD_RUN_V1_RESPONSE'));
});
for(const kind of ['resourceVersion','template'])test('V1 causal: fresh '+kind+' race aborts capture before the only PUT',async()=>{
 const x=await routingCaptureFixture();let v1Reads=0;
 x.beforeRead=async op=>{if(op.url.includes('/apis/serving.knative.dev/v1/')&&++v1Reads===2){
  const value=clone(x.f.v1);if(kind==='resourceVersion')value.metadata.resourceVersion='concurrent-version';
  else value.spec.template.spec.containers[0].image='PRIVATE_CONCURRENT_IMAGE';x.f.setV1(value);
 }};
 await assert.rejects(e.captureTrigger(x.args()),/INGRESS_TRAFFIC_CAS_PREIMAGE_CHANGED/);
 assert.equal(v1Reads,2);assert.equal(x.patches.length,0);assert.equal(x.grantReads,0);
 assert.ok(!JSON.stringify(x.diagnostics).includes('PRIVATE_CONCURRENT_IMAGE'));
});
test('V1 causal: post-PUT template drift is retained as hashed evidence and cannot authorize acceptance or rollback',async()=>{
 const x=await routingCaptureFixture(),normal=x.patch;
 x.patch=async request=>{const result=await normal(request),v1=clone(x.f.v1);v1.spec.template.spec.containers[0].image='PRIVATE_OTHER_TEMPLATE';x.f.setV1(v1);return result;};
 await assert.rejects(e.captureTrigger(x.args()),/INGRESS_TRAFFIC_V1_TEMPLATE_CHANGED/);
 assert.equal(x.patches.length,1);assert.equal(x.diagnostics.at(-1).routing.trafficWrites,null);
 assert.ok(x.diagnostics.at(-1).observations.some(r=>r.kind==='POST_ROUTING_PAIR'));
 assert.equal(x.postimages.at(-1).traffic.targets[0].revision,x.snapshot.traffic.targets[0].revision);
 assert.ok(!JSON.stringify(x.diagnostics).includes('PRIVATE_OTHER_TEMPLATE'));
});
async function preparedV1Rollback(){
 const x=await routingCaptureFixture(),postimage=await e.captureTrigger(x.args());
 x.patch=async request=>{assert.equal(request.method,'PUT');assert.equal(request.data.spec.traffic[0].revisionName,x.snapshot.traffic.targets[0].revision);
  assert.deepEqual(request.data.spec.template,x.f.v1.spec.template);
  assert.equal(request.data.metadata.resourceVersion,x.f.v1.metadata.resourceVersion);
  x.f.setTraffic({...runServiceRow(x.f.current,{revision:x.snapshot.traffic.targets[0].revision,generation:'11'}),etag:'rollback-after'});
  return{status:200,data:clone(x.f.v1)};};
 return{x,postimage};
}
test('V1 causal: default rollback transport uses one exact V1 PUT and a repeated rollback is a verified zero-write no-op',async()=>{
 const {x,postimage}=await preparedV1Rollback(),result=await e.rollbackCreatedTrigger({...x.args(),postimage});
 assert.equal(result.trafficWrites,1);assert.equal(x.patches.length,2);assert.equal(result.restoredRevision,x.snapshot.traffic.targets[0].revision);
 assert.equal(x.patches[1].data.status,undefined);assert.equal(x.patches[1].retry,false);assert.equal(x.patches[1].maxRedirects,0);
 const again=await e.rollbackCreatedTrigger({...x.args(),postimage});assert.equal(again.trafficWrites,0);assert.equal(again.functionMetadataRestored,false);
 assert.equal(x.patches.length,2);assert.equal(x.f.current.serviceConfig.revision,postimage.function.revision);
});
for(const kind of ['resourceVersion','template','serviceUid'])test('V1 causal: rollback '+kind+' race cannot authorize PUT',async()=>{
 const {x,postimage}=await preparedV1Rollback();let v1Reads=0;
 x.beforeRead=async op=>{if(op.url.includes('/apis/serving.knative.dev/v1/')&&++v1Reads===2){
  const value=clone(x.f.v1);if(kind==='resourceVersion')value.metadata.resourceVersion='concurrent-version';
  if(kind==='template')value.spec.template.spec.containers[0].image='PRIVATE_CHANGED';
  if(kind==='serviceUid')value.metadata.uid='87654321-4321-4321-8321-cba987654321';x.f.setV1(value);
 }};
 await assert.rejects(e.rollbackCreatedTrigger({...x.args(),postimage}));assert.equal(x.patches.length,1);
});
for(const status of [409,412])test('V1 causal: rollback conflict '+status+' does not retry or refresh the mutation preimage',async()=>{
 const {x,postimage}=await preparedV1Rollback(),observed=[];x.patch=async()=>{throw{response:{status}};};
 await assert.rejects(e.rollbackCreatedTrigger({...x.args(),postimage,observe:r=>observed.push(clone(r))}),/INGRESS_TRAFFIC_CAS_CONFLICT/);
 assert.equal(x.patches.length,2);assert.equal(observed.at(-1).trafficWrites,0);assert.equal(x.pauses.length,0);
});
test('V1 causal: rollback grant change after PUT holds while preserving the restored traffic observation',async()=>{
 const {x,postimage}=await preparedV1Rollback(),normal=x.patch,observed=[];
 x.patch=async request=>{const result=await normal(request);x.db.seed(x.grantPath,{...x.grant,state:'ACTIVE',enabled:true});return result;};
 await assert.rejects(e.rollbackCreatedTrigger({...x.args(),postimage,observe:r=>observed.push(clone(r))}),/INGRESS_TRAFFIC_GRANT_PREIMAGE_CHANGED/);
 assert.equal(x.patches.length,2);assert.ok(observed.some(r=>r.kind==='ROLLBACK_TRAFFIC_POSTIMAGE'&&r.traffic.targets[0].revision===x.snapshot.traffic.targets[0].revision));
});
for(const initial of ['CLOSED','ACTIVE'])test('V1 causal: rollback coordinator binds the '+initial+' closure result digest instead of obsolete predeploy grant',async()=>{
 const {x,postimage}=await preparedV1Rollback(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'gi-v1-rollback-binding-'));
 const grant={...x.grant,state:initial,enabled:initial==='ACTIVE',closedAt:'changed-since-predeploy',
  authority:{...x.grant.authority,sourceSha:x.p.sourceSha},deployedFunction:{...x.grant.deployedFunction,revision:postimage.function.revision}};
 x.db.seed(x.grantPath,grant);const expected=c.digest(grant);assert.notEqual(expected,x.p.makeIngress.closedConfiguration.preview.expectedDigest);
 const deployment={phase:'preview',sourceSha:x.p.sourceSha,artifactDigest:x.p.artifactDigest,
  function:postimage.function,rules:{queueRulesDenyClient:true},config:{afterDigest:expected}};
 try{
  for(const [name,value]of Object.entries({'initialize-closed':deployment,'last-operation':{afterDigest:expected},'snapshot-trigger':x.snapshot,'capture-trigger':postimage}))
   fs.writeFileSync(path.join(dir,'gi-make-preview-'+name+'.json'),JSON.stringify(value));
  const result=await e.rollback({db:x.db,auth:x.auth,p:x.p,phase:'preview',authorityBlob:'a'.repeat(40),directory:dir});
  assert.equal(result.status,'COMPENSATION_READBACK_VERIFIED');assert.equal(result.trigger.trafficWrites,1);
  assert.equal(result.trigger.closedGrantBefore.digest,result.configuration.afterDigest);
  assert.notEqual(result.trigger.closedGrantBefore.digest,x.p.makeIngress.closedConfiguration.preview.expectedDigest);
  assert.equal(result.configuration.configurationWrites,initial==='ACTIVE'?1:0);assert.equal(x.patches.length,2);
  assert.equal(x.db.documents.get(x.grantPath).state,'CLOSED');assert.equal(x.db.documents.get(x.grantPath).enabled,false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
