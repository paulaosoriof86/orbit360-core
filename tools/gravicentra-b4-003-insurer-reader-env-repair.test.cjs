'use strict';
// Complete in-memory GCP transport simulation. No GoogleAuth initialization,
// network, deploy, identity access or real environment-value retrieval.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const api=require('./gravicentra-b4-003-insurer-reader-env-repair.cjs');
const {PIN,NAME,SERVICE,TARGET,FUNCTION_URL,MASK,hash,svcHash,iamHash,validateSnapshots,reconstruct,repair}=api;
const copy=x=>JSON.parse(JSON.stringify(x));
function fixture(options={}){
 const oldEnv={FIREBASE_CONFIG:'PRIVATE_SENTINEL_OLD_FIREBASE',GCLOUD_PROJECT:'ays-orbit-360-lab',APP_MODE:'PRIVATE_SENTINEL_OLD_MODE'};
 const newEnv={...oldEnv,FIREBASE_CONFIG:'PRIVATE_SENTINEL_NEW_FIREBASE',NEW_FLAG:'PRIVATE_SENTINEL_ADDED'};
 const managed={FUNCTION_TARGET:TARGET,FUNCTION_SIGNATURE_TYPE:'http'};
 const policy={version:1,bindings:[{role:'roles/run.invoker',members:['allUsers']}]};
 const makeFn=env=>({name:NAME,environment:'GEN_2',state:'ACTIVE',updateTime:'2026-10-31T00:34:40.610074451Z',labels:{'deployment-tool':'cli-firebase','deployment-callable':'true','firebase-functions-hash':PIN.codeHash},
  buildConfig:{build:PIN.build,runtime:'nodejs22',entryPoint:TARGET,source:{storageSource:copy(PIN.sourceStorage)}},
  serviceConfig:{service:SERVICE,revision:PIN.deployedRevision,environmentVariables:copy(env),serviceAccountEmail:'synthetic-account@example.invalid',ingressSettings:'ALLOW_ALL',uri:'https://reader-synthetic.example.invalid',timeoutSeconds:60,secretEnvironmentVariables:[]}});
 const beforeFn=makeFn(oldEnv);beforeFn.serviceConfig.revision=PIN.previousRevision;
 let current=makeFn(newEnv);
 const pin={...PIN,previousEnvSha256:hash(oldEnv),deployedEnvSha256:hash(newEnv),previousServiceSha256:svcHash(beforeFn),deployedServiceSha256:svcHash(current),iamSha256:iamHash(policy)};
 const identity=f=>({name:f.name,environment:f.environment,state:f.state,updateTime:f.updateTime,build:f.buildConfig.build,runtime:f.buildConfig.runtime,entryPoint:f.buildConfig.entryPoint,sourceStorage:f.buildConfig.source.storageSource,revision:f.serviceConfig.revision,service:SERVICE,uri:f.serviceConfig.uri,codeHash:PIN.codeHash,labels:f.labels,serviceAccountEmail:f.serviceConfig.serviceAccountEmail,ingressSettings:f.serviceConfig.ingressSettings,environmentVariablesSha256:hash(f.serviceConfig.environmentVariables),secretEnvironmentVariablesSha256:hash([]),serviceConfigNonRevisionSha256:svcHash(f)});
 const before={phase:'before',targets:[{target:TARGET,identity:copy(identity(beforeFn)),iam:{status:'READ',policySha256:pin.iamSha256}}]};
 const after={phase:'after',targets:[{target:TARGET,identity:copy(identity(current)),iam:{status:'READ',policySha256:pin.iamSha256}}]};
 const image='us-east1-docker.pkg.dev/ays-orbit-360-lab/synthetic/new-image@sha256:'+'a'.repeat(64),newRevision='orbit360scopedpolicyreadpreview-00068-test';
 const rev=(name,env,img=image)=>({name:SERVICE+'/revisions/'+name,service:SERVICE,containers:[{image:img,env:Object.entries({...env,...managed}).map(([name,value])=>({name,value}))}]});
 const revisions=new Map([[PIN.previousRevision,rev(PIN.previousRevision,oldEnv,'old-image')],[PIN.deployedRevision,rev(PIN.deployedRevision,newEnv)],[newRevision,rev(newRevision,oldEnv)]]);
 const records=[],reports=[];let gets=0,policyReads=0,operations=0,patches=0;
 const operationName='projects/ays-orbit-360-lab/locations/us-east1/operations/synthetic_restore';
 const e={oldEnv,newEnv,managed,pin,before,after,revisions,records,reports,policy,newRevision,get current(){return current;},set current(v){current=v;},patchCount:()=>patches};
 const client={async request(req){
  records.push(copy(req));
  if(req.method==='PATCH'){
   patches++;assert.equal(req.url,FUNCTION_URL+'?updateMask='+MASK);assert.equal(req.retry,false);assert.equal(req.retryConfig.retry,0);
   assert.deepEqual(Object.keys(req.data).sort(),['name','serviceConfig']);assert.equal(req.data.name,NAME);assert.deepEqual(Object.keys(req.data.serviceConfig),['environmentVariables']);
   if(options.rejectPatch)throw Object.assign(Error('PRIVATE_SENTINEL_ERROR_BODY'),{response:{status:403}});
   if(!options.loseWithoutCommit){current={...current,serviceConfig:{...current.serviceConfig,environmentVariables:copy(req.data.serviceConfig.environmentVariables),revision:newRevision},updateTime:'2026-10-31T01:00:00Z'};}
   if(options.afterPatch)options.afterPatch(e);
   if(options.loseResponse||options.loseWithoutCommit)throw Error('PRIVATE_SENTINEL_REQUEST_WITH_CREDENTIALS');
   return {data:{name:operationName,done:!options.delayedOperation,...(options.operationError?{error:{code:7,message:'PRIVATE_SENTINEL_OPERATION_ERROR'}}:{})}};
  }
  assert.equal(req.method,'GET');assert.equal(req.data,undefined);
  if(req.url===FUNCTION_URL){gets++;if(options.onFunctionGet)options.onFunctionGet(e,gets);return{data:copy(current)};}
  if(req.url==='https://run.googleapis.com/v2/'+SERVICE+':getIamPolicy'){policyReads++;if(options.onPolicyGet)options.onPolicyGet(e,policyReads);return {data:copy(e.policy)};}
  if(req.url.startsWith('https://run.googleapis.com/v2/'+SERVICE+'/revisions/')){
   const key=req.url.split('/').pop(),value=revisions.get(key);if(!value)throw Object.assign(Error('PRIVATE_SENTINEL_NOT_FOUND'),{response:{status:404}});return{data:copy(value)};
  }
  if(req.url==='https://cloudfunctions.googleapis.com/v2/'+operationName){operations++;return {data:{name:options.changedOperationName?'projects/foreign/locations/us-east1/operations/foreign':operationName,done:operations>=2}};}
  throw Error('UNEXPECTED_REQUEST');
 }};
 e.run=()=>repair({client,before,after,pin,persist:r=>reports.push(copy(r)),wait:async()=>{},maxPolls:3});
 return e;
}
async function denied(e,code,patches=0){await assert.rejects(e.run,error=>error.safeCode===code);assert.equal(e.patchCount(),patches);assert.equal(e.reports.at(-1).status,'HOLD');assert.equal(e.reports.at(-1).failureCode,code);assert.equal(JSON.stringify(e.reports).includes('PRIVATE_SENTINEL'),false);}
const cases=[
 ['exact_map_and_full_configuration_proof_then_one_masked_patch',async()=>{const e=fixture(),r=await e.run();assert.equal(r.status,'BASELINE_ENV_RESTORED_EXACT_READBACK_PASS');assert.equal(e.patchCount(),1);assert.deepEqual(e.current.serviceConfig.environmentVariables,e.oldEnv);assert.equal(r.finalServiceConfigNonRevisionSha256,e.pin.previousServiceSha256);assert.equal(r.sourcePreserved,true);assert.equal(r.iamUnchanged,true);assert.equal(r.containerImageUnchanged,true);assert.equal(r.sourceRedeployed,false);assert.equal(r.businessDataMutated,false);}],
 ['reports_only_variable_names_and_digests',async()=>{const e=fixture(),r=await e.run();assert.equal(JSON.stringify(e.reports).includes('PRIVATE_SENTINEL'),false);assert.deepEqual(r.functionEnvironmentChanges.map(x=>x.name),['FIREBASE_CONFIG','NEW_FLAG']);assert.equal(r.functionEnvironmentChanges[0].beforeSha256,hash(e.oldEnv.FIREBASE_CONFIG));assert.equal(r.functionEnvironmentChanges[1].beforeSha256,null);assert.equal(r.envValuesExported,false);}],
 ['already_restored_retry_is_noop_without_another_patch',async()=>{const e=fixture();await e.run();const count=e.patchCount(),r=await e.run();assert.equal(r.status,'BASELINE_ENV_ALREADY_RESTORED_NOOP');assert.equal(r.patchRequests,0);assert.equal(r.containerImageUnchanged,true);assert.equal(e.patchCount(),count);}],
 ['lost_patch_response_reads_current_state_without_replaying',async()=>{const e=fixture({loseResponse:true}),r=await e.run();assert.equal(r.status,'BASELINE_ENV_RESTORED_RESPONSE_LOST_READBACK_PASS');assert.equal(e.patchCount(),1);assert.equal(r.patchResponseLost,true);assert.equal(JSON.stringify(e.reports).includes('PRIVATE_SENTINEL'),false);}],
 ['lost_response_without_commit_holds_after_bounded_readback',async()=>{const e=fixture({loseWithoutCommit:true});await denied(e,'PATCH_RESPONSE_LOST_RESTORATION_NOT_PROVEN',1);assert.equal(e.reports.at(-1).pollCount,3);}],
 ['definite_rejection_reads_back_once_then_holds',async()=>{const e=fixture({rejectPatch:true});await denied(e,'PATCH_REJECTED_HTTP_403',1);assert.equal(e.reports.at(-1).pollCount,1);}],
 ['unproven_old_map_never_mutates',async()=>{const e=fixture();e.revisions.get(PIN.previousRevision).containers[0].env.find(x=>x.name==='APP_MODE').value='PRIVATE_SENTINEL_NOT_BASELINE';await denied(e,'PREVIOUS_ENV_MAP_NOT_HASH_PROVEN');}],
 ['old_only_removed_variable_is_recovered_from_immutable_revision',async()=>{const old={A:'PRIVATE_SENTINEL_A',OLD_ONLY:'PRIVATE_SENTINEL_OLD'},current={A:'PRIVATE_SENTINEL_A'},run={...current,FUNCTION_TARGET:TARGET};const r=reconstruct({...old,FUNCTION_TARGET:TARGET},run,current,hash(old));assert.deepEqual(r.map,old);}],
 ['whole_service_config_with_reconstructed_env_must_match_baseline',async()=>{const e=fixture();e.current.serviceConfig.timeoutSeconds=61;e.pin.deployedServiceSha256=svcHash(e.current);e.after.targets[0].identity.serviceConfigNonRevisionSha256=e.pin.deployedServiceSha256;await denied(e,'RESTORED_FULL_SERVICE_CONFIG_NOT_BASELINE');}],
 ['new_source_mismatch_blocks_before_patch',async()=>{const e=fixture();e.current.buildConfig.source.storageSource.generation='wrong-generation';await denied(e,'CURRENT_FUNCTION_SOURCE_CHANGED');}],
 ['new_labels_mismatch_blocks_before_patch',async()=>{const e=fixture();e.current.labels.extra='changed';await denied(e,'CURRENT_FUNCTION_LABELS_CHANGED');}],
 ['unexpected_current_env_blocks_before_patch',async()=>{const e=fixture();e.current.serviceConfig.environmentVariables.APP_MODE='PRIVATE_SENTINEL_THIRD_STATE';await denied(e,'CURRENT_ENV_OR_REVISION_DRIFT');}],
 ['current_revision_function_env_mismatch_blocks_before_patch',async()=>{const e=fixture();e.revisions.get(PIN.deployedRevision).containers[0].env.find(x=>x.name==='FIREBASE_CONFIG').value='PRIVATE_SENTINEL_MISMATCH';await denied(e,'CURRENT_REVISION_FUNCTION_ENV_MISMATCH');}],
 ['secret_sources_are_not_resolved_or_converted',async()=>{const e=fixture();e.revisions.get(PIN.previousRevision).containers[0].env.push({name:'SECRET',valueSource:{secretKeyRef:{secret:'secret-ref',version:'latest'}}});await denied(e,'REVISION_SECRET_SOURCE_UNEXPECTED');}],
 ['duplicate_revision_env_name_holds',async()=>{const e=fixture(),rows=e.revisions.get(PIN.previousRevision).containers[0].env;rows.push(copy(rows[0]));await denied(e,'REVISION_ENV_NAME_INVALID_OR_DUPLICATE');}],
 ['second_container_holds',async()=>{const e=fixture(),r=e.revisions.get(PIN.previousRevision);r.containers.push(copy(r.containers[0]));await denied(e,'REVISION_CONTAINER_CARDINALITY');}],
 ['revision_identity_mismatch_holds',async()=>{const e=fixture();e.revisions.get(PIN.previousRevision).service='projects/foreign/locations/us-east1/services/foreign';await denied(e,'REVISION_IDENTITY_MISMATCH');}],
 ['pinned_project_number_alias_preserves_exact_revision_scope',async()=>{const e=fixture();for(const revision of e.revisions.values()){revision.name=revision.name.replace('projects/ays-orbit-360-lab/','projects/646761409743/');revision.service=revision.service.replace('projects/ays-orbit-360-lab/','projects/646761409743/');}const r=await e.run();assert.equal(r.status,'BASELINE_ENV_RESTORED_EXACT_READBACK_PASS');assert.equal(e.patchCount(),1);}],
 ['exact_short_service_with_full_revision_identity_is_supported',async()=>{const e=fixture();for(const r of e.revisions.values())r.service=api.SERVICE_SHORT_NAME;const r=await e.run();assert.equal(r.status,'BASELINE_ENV_RESTORED_EXACT_READBACK_PASS');assert.equal(e.patchCount(),1);assert.equal(r.revisionIdentityReads.length,3);assert.deepEqual(r.revisionIdentityReads.map(x=>x.stage),['PREVIOUS_BASELINE','DEPLOYED_SOURCE','FINAL_READBACK']);for(const id of r.revisionIdentityReads){assert.equal(id.nameMatchesExactResource,true);assert.equal(id.serviceMatchesExactShortName,true);assert.equal(id.serviceMatchesExactResource,false);assert.equal(id.observedService.value,api.SERVICE_SHORT_NAME);}assert.equal(JSON.stringify(e.reports).includes('PRIVATE_SENTINEL'),false);}],
 ['pinned_number_revision_and_exact_short_service_are_supported',async()=>{const e=fixture();for(const r of e.revisions.values()){r.name=r.name.replace('projects/ays-orbit-360-lab/','projects/646761409743/');r.service=api.SERVICE_SHORT_NAME;}const r=await e.run();assert.equal(r.status,'BASELINE_ENV_RESTORED_EXACT_READBACK_PASS');assert.equal(e.patchCount(),1);}],
 ['exact_short_service_already_restored_remains_noop',async()=>{const e=fixture();for(const r of e.revisions.values())r.service=api.SERVICE_SHORT_NAME;await e.run();const r=await e.run();assert.equal(r.status,'BASELINE_ENV_ALREADY_RESTORED_NOOP');assert.equal(r.patchRequests,0);assert.equal(r.containerImageUnchanged,true);assert.equal(e.patchCount(),1);assert.equal(r.revisionIdentityReads.at(-1).stage,'ALREADY_RESTORED');}],
 ...[
  ['short_service_never_accepts_foreign_project',r=>{r.name=r.name.replace('projects/ays-orbit-360-lab/','projects/foreign-project/');}],
  ['short_service_never_accepts_foreign_project_number',r=>{r.name=r.name.replace('projects/ays-orbit-360-lab/','projects/999999999999/');}],
  ['short_service_never_accepts_foreign_region',r=>{r.name=r.name.replace('/locations/us-east1/','/locations/us-central1/');}],
  ['short_service_never_accepts_foreign_parent_service',r=>{r.name=r.name.replace('/services/orbit360scopedpolicyreadpreview/','/services/foreign-service/');}],
  ['short_service_never_accepts_different_revision',r=>{r.name=r.name.replace(PIN.previousRevision,PIN.deployedRevision);}],
  ['short_revision_name_is_not_accepted',r=>{r.name=PIN.previousRevision;}],
  ['absent_service_is_not_accepted',r=>{delete r.service;}],
  ['null_service_is_not_accepted',r=>{r.service=null;}],
  ['empty_service_is_not_accepted',r=>{r.service='';}],
  ['other_short_service_is_not_accepted',r=>{r.service='foreign-service';}],
  ['service_resource_foreign_number_is_not_accepted',r=>{r.service=SERVICE.replace('ays-orbit-360-lab','999999999999');}],
  ['deleted_revision_is_not_accepted',r=>{r.deleteTime='2026-10-31T00:00:00Z';}]
 ].map(([id,change])=>[id,async()=>{const e=fixture(),revision=e.revisions.get(PIN.previousRevision);revision.service=api.SERVICE_SHORT_NAME;change(revision);await denied(e,'REVISION_IDENTITY_MISMATCH');const observations=e.reports.at(-1).revisionIdentityReads;assert.equal(observations.length,1);assert.equal(observations[0].stage,'PREVIOUS_BASELINE');assert.equal(observations[0].requestedResourceName,SERVICE+'/revisions/'+PIN.previousRevision);assert.equal(Object.hasOwn(e.reports[0],'failureCode'),false);assert.equal(e.reports[0].revisionIdentityReads.length,1);assert.equal(e.records.filter(x=>x.method!=='GET').length,0);}]),
 ['malformed_identity_values_are_redacted_before_failure',async()=>{const e=fixture(),revision=e.revisions.get(PIN.previousRevision);revision.name='PRIVATE_SENTINEL_NAME_WITH_SECRET';revision.service='PRIVATE_SENTINEL_SERVICE_WITH_SECRET';revision.deleteTime='PRIVATE_SENTINEL_DELETE_TIME';await denied(e,'REVISION_IDENTITY_MISMATCH');const id=e.reports.at(-1).revisionIdentityReads[0];assert.equal(id.observedName.format,'UNRECOGNIZED_REDACTED');assert.equal(id.observedService.format,'UNRECOGNIZED_REDACTED');assert.equal(id.observedName.sha256,hash(revision.name));assert.equal(id.deleteTimePopulated,true);assert.equal(Object.hasOwn(id.observedName,'value'),false);assert.equal(Object.hasOwn(id.observedService,'value'),false);}],
 ['object_identity_values_export_only_type',async()=>{const e=fixture();e.revisions.get(PIN.previousRevision).service={secret:'PRIVATE_SENTINEL_OBJECT'};await denied(e,'REVISION_IDENTITY_MISMATCH');assert.deepEqual(e.reports.at(-1).revisionIdentityReads[0].observedService,{type:'object',present:true});}],
 ['deployed_revision_rejection_identifies_exact_read_stage',async()=>{const e=fixture();e.revisions.get(PIN.deployedRevision).service='foreign-service';await denied(e,'REVISION_IDENTITY_MISMATCH');const ids=e.reports.at(-1).revisionIdentityReads;assert.equal(ids.length,2);assert.equal(ids[0].serviceMatchesExactResource,true);assert.equal(ids[1].stage,'DEPLOYED_SOURCE');assert.equal(ids[1].observedService.value,'foreign-service');assert.equal(ids[1].nameMatchesExactResource,true);assert.equal(ids[1].serviceMatchesExactResource,false);assert.equal(ids[1].serviceMatchesExactShortName,false);}],
 ['preflight_function_change_holds_before_patch',async()=>{const e=fixture({onFunctionGet:(e,n)=>{if(n===2)e.current.updateTime='new-concurrent-update';}});await denied(e,'FUNCTION_CHANGED_DURING_PREFLIGHT');}],
 ['preflight_iam_change_holds_before_patch',async()=>{const e=fixture({onPolicyGet:(e,n)=>{if(n===2)e.policy.bindings[0].members=['different-member'];}});await denied(e,'IAM_CHANGED_DURING_PREFLIGHT');}],
 ['patch_operation_error_is_sanitized_and_not_retried',async()=>{const e=fixture({operationError:true});await denied(e,'RESTORE_OPERATION_FAILED',1);assert.equal(e.reports.at(-1).operationErrorCode,7);}],
 ['delayed_operation_polled_to_completion',async()=>{const e=fixture({delayedOperation:true}),r=await e.run();assert.equal(r.status,'BASELINE_ENV_RESTORED_EXACT_READBACK_PASS');assert.equal(r.pollCount,2);assert.equal(e.patchCount(),1);}],
 ['operation_identity_cannot_redirect_future_requests',async()=>{const e=fixture({delayedOperation:true,changedOperationName:true});await denied(e,'OPERATION_IDENTITY_CHANGED',1);assert.equal(e.records.some(r=>r.url.includes('/foreign/')),false);}],
 ['post_restore_image_change_holds',async()=>{const e=fixture({afterPatch:e=>{e.revisions.get(e.newRevision).containers[0].image='wrong-image';}});await denied(e,'RESTORATION_CONTAINER_IMAGE_CHANGED',1);}],
 ['post_restore_iam_change_holds',async()=>{const e=fixture({onPolicyGet:(e,n)=>{if(n===3)e.policy.bindings[0].members=['different-member'];}});await denied(e,'RESTORATION_IAM_CHANGED',1);}],
 ['already_restored_aggregate_config_mismatch_holds',async()=>{const e=fixture();e.current.serviceConfig.environmentVariables=copy(e.oldEnv);e.current.serviceConfig.timeoutSeconds=61;await denied(e,'ALREADY_RESTORED_OTHER_CONFIG_CHANGED');}],
 ['snapshot_pin_mismatch_holds_without_requests',async()=>{const e=fixture();e.before.targets[0].identity.environmentVariablesSha256='wrong';await denied(e,'SNAPSHOT_ENV_HASH_MISMATCH');assert.equal(e.records.length,0);}],
 ['old_revision_unavailable_holds_without_patch',async()=>{const e=fixture();e.revisions.delete(PIN.previousRevision);await denied(e,'REVISION_READ_FAILED_HTTP_404');}],
 ['literal_empty_env_is_preserved_without_invention',async()=>{const old={A:'',B:'value'},r=reconstruct(old,{...old},old,hash(old));assert.deepEqual(r.map,old);}],
 ['all_mutations_are_one_exact_function_patch_only',async()=>{const e=fixture();await e.run();const mutations=e.records.filter(x=>x.method!=='GET');assert.equal(mutations.length,1);assert.equal(mutations[0].url,FUNCTION_URL+'?updateMask='+MASK);assert.equal(e.records.some(x=>/secretmanager|firestore|identitytoolkit|setIamPolicy|generateUploadUrl/.test(x.url)),false);}]
];
(async()=>{const tests=[];for(const [id,test]of cases){try{await test();tests.push({id,pass:true});}catch(error){tests.push({id,pass:false,error:error.message});}}
 const source=fs.readFileSync(path.join(__dirname,'gravicentra-b4-003-insurer-reader-env-repair.cjs'));
 const result={schema:'gravicentra-insurer-reader-env-repair-tests-v1',syntheticOnly:true,externalRequests:0,sourceSha256:hash(source),total:tests.length,passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,tests};
 if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));process.exitCode=result.failed?1:0;
})().catch(error=>{console.error(error.message);process.exitCode=2;});
