'use strict';

// The command-line entry is read-only. The two exported IAM transitions are
// callable only by the existing protected release owner after scope validation.
// No project role, service account, secret, version, membership or rule is created.
const path=require('node:path'),{createRequire}=require('node:module');
const crypto=require('node:crypto');
// Keep the read-only preflight independent of unpublished product source.
const SCOPE=Object.freeze({TENANT:'alianzas-soluciones',COUNTRY:'GT',INSTANCE:'710522720868',
  SCOPE_CONTRACT_BLOB:'7ce546736ac8d08b8ac922d19f3e6e4c2bac0021'});
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?
  Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const c={...SCOPE,need:(ok,code)=>{if(!ok)throw Object.assign(Error(code),{code});},
  digest:v=>crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex')};
const functionsRequire=createRequire(path.resolve(__dirname,'../functions/package.json'));
const PROJECT='ays-orbit-360-lab';
const SECRET=`projects/${PROJECT}/secrets/orbit360-greenapi-gt-alianzas-soluciones`;
const ROLE='roles/secretmanager.secretAccessor';
const PROJECT_NUMBER='646761409743',CANONICAL_RUNTIME=PROJECT_NUMBER+'-compute@developer.gserviceaccount.com';
const REQUIRED_EVENTARC_PERMISSIONS=Object.freeze(['eventarc.events.receive','run.routes.invoke']);
// firebase-tools@14.10.1 checkIam.ensureServiceAgentRoles requests these only
// for the first recognized event service. This probe predicts that branch; it
// never grants these project roles. The protected CLI also forbids the setter.
const FIRST_EVENT_BINDINGS=Object.freeze([
  {role:'roles/iam.serviceAccountTokenCreator',member:'serviceAccount:service-'+PROJECT_NUMBER+'@gcp-sa-pubsub.iam.gserviceaccount.com'},
  {role:'roles/run.invoker',member:'serviceAccount:'+CANONICAL_RUNTIME},
  {role:'roles/eventarc.eventReceiver',member:'serviceAccount:'+CANONICAL_RUNTIME}]);
const EVENT_SERVICES=Object.freeze({
  'google.cloud.pubsub.topic.v1.messagePublished':'pubsub',
  'google.cloud.storage.object.v1.finalized':'storage','google.cloud.storage.object.v1.archived':'storage',
  'google.cloud.storage.object.v1.deleted':'storage','google.cloud.storage.object.v1.metadataUpdated':'storage',
  'google.firebase.firebasealerts.alerts.v1.published':'firebasealerts',
  'providers/cloud.auth/eventTypes/user.beforeCreate':'auth','providers/cloud.auth/eventTypes/user.beforeSignIn':'auth',
  'providers/cloud.auth/eventTypes/user.beforeSendEmail':'auth','providers/cloud.auth/eventTypes/user.beforeSendSms':'auth',
  'google.firebase.database.ref.v1.written':'database','google.firebase.database.ref.v1.created':'database',
  'google.firebase.database.ref.v1.updated':'database','google.firebase.database.ref.v1.deleted':'database',
  'google.firebase.remoteconfig.remoteConfig.v1.updated':'remoteconfig','google.firebase.testlab.testMatrix.v1.completed':'testlab',
  ...Object.fromEntries(['written','created','updated','deleted'].flatMap(x=>[
    ['google.cloud.firestore.document.v1.'+x,'firestore'],['google.cloud.firestore.document.v1.'+x+'.withAuthContext','firestore']]))});
const PRIOR_RUNTIME=`orbit360-secrets-lab@${PROJECT}.iam.gserviceaccount.com`;
const REQUIRED_FIRESTORE_PERMISSIONS=Object.freeze(['datastore.databases.get','datastore.entities.get',
  'datastore.entities.list','datastore.entities.create','datastore.entities.update']);
const OPS=Object.freeze([{name:'orbit360OpsLeadsCommand',region:'us-central1'},
  {name:'orbit360OpsLeadsCommandPreview',region:'us-east1'}]);
const isRuntime=v=>typeof v==='string'&&(/^[a-z][a-z0-9-]{4,61}@ays-orbit-360-lab\.iam\.gserviceaccount\.com$/.test(v)||
  /^[0-9]{6,20}-compute@developer\.gserviceaccount\.com$/.test(v)||v==='ays-orbit-360-lab@appspot.gserviceaccount.com');
const etagString=p=>Buffer.isBuffer(p?.etag)||p?.etag instanceof Uint8Array?Buffer.from(p.etag).toString('base64'):String(p?.etag||'');
const clonePolicy=p=>({...p,bindings:(p.bindings||[]).map(b=>({...b,members:[...(b.members||[])],...(b.condition?{condition:{...b.condition}}:{})})),
  ...(p.auditConfigs?{auditConfigs:JSON.parse(JSON.stringify(p.auditConfigs))}:{}),etag:p.etag});
// IAM bindings/principals and audit configuration entries have no evaluation
// order. Canonicalize only those known collections for comparison; preserve
// duplicates, every condition/unknown field, version and the opaque CAS etag.
// The request payload is still the untouched clonePolicy result, never this
// digest-only projection. https://docs.cloud.google.com/iam/docs/reference/rest/v1/Policy
const unordered=values=>values.map(stable).sort((a,b)=>{
  const x=JSON.stringify(a),y=JSON.stringify(b);return x<y?-1:x>y?1:0;
});
function policyComparison(p){
  const out={...p};
  if(Array.isArray(p?.bindings))out.bindings=unordered(p.bindings.map(binding=>({...binding,
    ...(Array.isArray(binding?.members)?{members:unordered(binding.members)}:{})})));
  if(Array.isArray(p?.auditConfigs))out.auditConfigs=unordered(p.auditConfigs.map(config=>({...config,
    ...(Array.isArray(config?.auditLogConfigs)?{auditLogConfigs:unordered(config.auditLogConfigs.map(log=>({...log,
      ...(Array.isArray(log?.exemptedMembers)?{exemptedMembers:unordered(log.exemptedMembers)}:{})})))}:{})})));
  return out;
}
const policyDigest=(p,includeEtag=true)=>c.digest({...policyComparison(p),...(!includeEtag?{etag:undefined}:{etag:etagString(p)})});
const unconditional=b=>b.role===ROLE&&!b.condition;
function exactGrantPlan(policy,principal,authority){
  c.need(isRuntime(principal),'INGRESS_RUNTIME_PRINCIPAL_NOT_VERIFIED');
  c.need(authority?.scopeContractBlob===c.SCOPE_CONTRACT_BLOB&&authority.secretResource===SECRET&&authority.role===ROLE&&
    authority.principal===principal&&authority.firestoreCapabilitiesVerified===true&&
    /^[a-f0-9]{40}$/.test(authority.sourceSha||'')&&/^[a-f0-9]{40}$/.test(authority.receiptBlobSha||''),
    'INGRESS_SECRET_IAM_AUTHORITY_REQUIRED');
  c.need(policy&&etagString(policy)&&Array.isArray(policy.bindings),'INGRESS_SECRET_IAM_ETAG_PREIMAGE_REQUIRED');
  const before=clonePolicy(policy),next=clonePolicy(policy),bindings=next.bindings.filter(unconditional);
  c.need(bindings.length<=1,'INGRESS_SECRET_IAM_AMBIGUOUS_UNCONDITIONAL_BINDING');
  const member='serviceAccount:'+principal,already=bindings.some(b=>b.members.includes(member));
  if(!already){if(bindings.length)bindings[0].members.push(member);else next.bindings.push({role:ROLE,members:[member]});}
  return{schema:'GI_I66_EXACT_SECRET_IAM_PLAN_V1',secretResource:SECRET,principal,role:ROLE,member,
    sourceSha:authority.sourceSha,authorityReceiptBlob:authority.receiptBlobSha,
    before,after:next,beforeDigest:policyDigest(before),beforeContentDigest:policyDigest(before,false),
    afterContentDigest:policyDigest(next,false),alreadyPresent:already,plannedIamWrites:already?0:1};
}
async function readPolicy(client){const [p]=await client.getIamPolicy({resource:SECRET,options:{requestedPolicyVersion:3}});return p;}
async function grantExact({client,plan,verifyRuntimeCapabilities,verifyRuntimeAccess}){
  c.need(plan?.schema==='GI_I66_EXACT_SECRET_IAM_PLAN_V1'&&plan.secretResource===SECRET&&plan.role===ROLE&&isRuntime(plan.principal),
    'INGRESS_SECRET_IAM_PLAN_SCOPE_MISMATCH');
  c.need(policyDigest(plan.before)===plan.beforeDigest&&policyDigest(plan.after,false)===plan.afterContentDigest,
    'INGRESS_SECRET_IAM_PLAN_DIGEST_CHANGED');
  // Re-derive the only permitted delta. A tampered plan may not remove/change
  // another role, condition, member, audit setting, version or preimage etag.
  const canonical=exactGrantPlan(plan.before,plan.principal,{scopeContractBlob:c.SCOPE_CONTRACT_BLOB,
    secretResource:SECRET,role:ROLE,principal:plan.principal,firestoreCapabilitiesVerified:true,
    sourceSha:plan.sourceSha,receiptBlobSha:plan.authorityReceiptBlob});
  c.need(canonical.afterContentDigest===plan.afterContentDigest&&canonical.alreadyPresent===plan.alreadyPresent,
    'INGRESS_SECRET_IAM_UNAPPROVED_DELTA');
  c.need(typeof verifyRuntimeCapabilities==='function'&&await verifyRuntimeCapabilities(plan.principal)===true,
    'INGRESS_RUNTIME_FIRESTORE_CAPABILITIES_REQUIRED');
  const fresh=await readPolicy(client);c.need(policyDigest(fresh)===plan.beforeDigest,'INGRESS_SECRET_IAM_CAS_PREIMAGE_CHANGED');
  let committed=false,afterVerified=null;
  try{
    if(!plan.alreadyPresent){
      // Secret Manager enforces etag atomically; a concurrent edit is rejected.
      await client.setIamPolicy({resource:SECRET,policy:plan.after,updateMask:{paths:['bindings','etag']}});committed=true;
    }
    const after=await readPolicy(client);
    c.need(policyDigest(after,false)===plan.afterContentDigest,'INGRESS_SECRET_IAM_POSTIMAGE_MISMATCH');
    afterVerified=after;
    c.need(typeof verifyRuntimeAccess==='function'&&await verifyRuntimeAccess(plan.principal)===true,
      'INGRESS_SECRET_IAM_RUNTIME_READBACK_REQUIRED');
    return{schema:'GI_I66_EXACT_SECRET_IAM_READBACK_V1',status:'SECRET_RUNTIME_ACCESS_VERIFIED',
      secretResource:SECRET,principal:plan.principal,role:ROLE,sourceSha:plan.sourceSha,authorityReceiptBlob:plan.authorityReceiptBlob,
      beforeDigest:plan.beforeDigest,afterDigest:policyDigest(after),afterContentDigest:plan.afterContentDigest,
      addedMember:!plan.alreadyPresent,iamWrites:committed?1:0,secretReadback:true,
      projectIamWrites:0,secretValueWrites:0,firestoreWrites:0,membershipWrites:0,externalMessagesSent:0};
  }catch(error){error.ingressIamOutcome={commitState:committed?'COMMITTED_UNVERIFIED':plan.alreadyPresent?'NOT_ATTEMPTED':'UNKNOWN',
    knownIamWrites:committed?1:0,resource:SECRET,principal:plan.principal,
    ...(afterVerified?{rollbackReceipt:{schema:'GI_I66_EXACT_SECRET_IAM_READBACK_V1',status:'RUNTIME_READBACK_HOLD_POLICY_VERIFIED',
      secretResource:SECRET,principal:plan.principal,beforeDigest:plan.beforeDigest,afterDigest:policyDigest(afterVerified),
      afterContentDigest:plan.afterContentDigest,addedMember:!plan.alreadyPresent}}:{})};throw error;}
}
async function rollbackExact({client,plan,receipt}){
  c.need(plan?.secretResource===SECRET&&receipt?.schema==='GI_I66_EXACT_SECRET_IAM_READBACK_V1'&&receipt.secretResource===SECRET&&
    receipt.principal===plan.principal&&receipt.beforeDigest===plan.beforeDigest&&receipt.afterContentDigest===plan.afterContentDigest,
    'INGRESS_SECRET_IAM_ROLLBACK_BINDING_REQUIRED');
  if(receipt.addedMember===false)return{status:'NO_IAM_DELTA_TO_ROLL_BACK',iamWrites:0};
  const current=await readPolicy(client);
  c.need(policyDigest(current)===receipt.afterDigest&&policyDigest(current,false)===plan.afterContentDigest,
    'INGRESS_SECRET_IAM_ROLLBACK_POSTIMAGE_CHANGED');
  const restore={...clonePolicy(plan.before),etag:current.etag};
  let committed=false;
  try{
    await client.setIamPolicy({resource:SECRET,policy:restore,updateMask:{paths:['bindings','etag']}});committed=true;
    const after=await readPolicy(client);c.need(policyDigest(after,false)===plan.beforeContentDigest,'INGRESS_SECRET_IAM_ROLLBACK_READBACK_HOLD');
    return{status:'EXACT_PRIOR_SECRET_POLICY_RESTORED',iamWrites:1,resource:SECRET,principal:plan.principal,
      contentDigest:policyDigest(after,false),projectIamWrites:0,secretValueWrites:0};
  }catch(error){error.ingressIamOutcome={commitState:committed?'COMMITTED_UNVERIFIED':'UNKNOWN',knownIamWrites:committed?1:0,
    action:'ROLLBACK',resource:SECRET,principal:plan.principal};throw error;}
}
function safeStatus(error){const code=Number(error?.code||error?.response?.status);
  return code===7||code===403?'PERMISSION_DENIED':code===16||code===401?'UNAUTHENTICATED':code===5||code===404?'NOT_FOUND':
    [4,13,14,429,500,502,503,504].includes(code)?'TRANSIENT_FAILURE':'UNCONFIRMED';}
async function listEventInventory(sourceClient,version){
  const rows=[],tokens=new Set();let pageToken='';
  for(let page=0;page<20;page++){
    const response=await sourceClient.request({url:`https://cloudfunctions.googleapis.com/${version}/projects/${PROJECT}/locations/-/functions`,method:'GET',
      params:{pageSize:1000,...(version==='v2'?{filter:'environment="GEN_2"'}:{}),...(pageToken?{pageToken}:{})}});
    const data=response.data||{};c.need(!data.unreachable?.length,'INGRESS_EVENT_INVENTORY_UNREACHABLE');
    c.need(data.functions===undefined||Array.isArray(data.functions),'INGRESS_EVENT_INVENTORY_INVALID');
    rows.push(...(data.functions||[]));c.need(rows.length<=1000,'INGRESS_EVENT_INVENTORY_BOUND_EXCEEDED');
    if(!data.nextPageToken)return rows;
    c.need(typeof data.nextPageToken==='string'&&!tokens.has(data.nextPageToken),'INGRESS_EVENT_INVENTORY_CURSOR_REPEATED');
    pageToken=data.nextPageToken;tokens.add(pageToken);
  }
  throw Object.assign(Error('INGRESS_EVENT_INVENTORY_INCOMPLETE'),{code:'INGRESS_EVENT_INVENTORY_INCOMPLETE'});
}
function inventoryService(fn){
  const labels=fn.labels||{};
  if(labels['deployment-scheduled']||labels['deployment-taskqueue']||labels['deployment-callable']||labels['deployment-callabled'])return null;
  if(['before-create','before-sign-in','before-send-email','before-send-sms'].includes(labels['deployment-blocking']))return 'auth';
  return EVENT_SERVICES[fn.eventTrigger?.eventType]||null;
}
async function queueRulesReadback(sourceClient,readRulesSources=()=>['firestore.rules','firestore.b4-003-scoped-candidate.rules']
  .map(sourcePath=>({sourcePath,bytes:require('node:fs').readFileSync(path.resolve(__dirname,'..',sourcePath))}))) {
  const release=await sourceClient.request({url:`https://firebaserules.googleapis.com/v1/projects/${PROJECT}/releases/cloud.firestore`,method:'GET'});
  const ruleset=release.data?.rulesetName;c.need(/^projects\/ays-orbit-360-lab\/rulesets\/[A-Za-z0-9-]+$/.test(ruleset||''),'INGRESS_RULESET_IDENTITY_UNVERIFIED');
  const response=await sourceClient.request({url:'https://firebaserules.googleapis.com/v1/'+ruleset,method:'GET'}),files=response.data?.source?.files;
  c.need(Array.isArray(files)&&files.length===1&&typeof files[0].content==='string','INGRESS_RULESET_SOURCE_UNVERIFIED');
  const bytes=Buffer.from(files[0].content);c.need(bytes.length>0&&bytes.length<=200000,'INGRESS_RULESET_SOURCE_BOUND');
  const gitBlob=value=>crypto.createHash('sha1').update('blob '+value.length+'\0').update(value).digest('hex'),sourceBlob=gitBlob(bytes);
  const matches=readRulesSources().filter(r=>['firestore.rules','firestore.b4-003-scoped-candidate.rules'].includes(r.sourcePath)&&gitBlob(r.bytes)===sourceBlob);
  c.need(matches.length===1,'INGRESS_DEPLOYED_QUEUE_RULES_SOURCE_NOT_UNIQUE');
  return{status:'EXACT_CANONICAL_RULESET_SOURCE_MATCH',sourcePath:matches[0].sourcePath,sourceBlob,rulesetName:ruleset,rulesWrites:0,contentPublished:false};
}
async function eventarcPreflight({sourceClient,runtimeClientFor,readRulesSources}){
  const report={schema:'GI_I66_MAKE_EVENTARC_PROJECT_IAM_READONLY_V1',status:'EVENTARC_PREREQUISITES_UNVERIFIED_HOLD',
    projectId:PROJECT,cliVersion:'14.10.1',canonicalRuntime:CANONICAL_RUNTIME,canonicalRuntimeObserved:false,
    inventoryComplete:false,existingRecognizedEventServices:[],projectPolicyRead:false,projectPolicyDigest:null,
    firstEventBindings:[],cliWouldAddProjectBindings:null,queueRules:null,runtimeImpersonationVerified:false,
    runtimeEventarcPermissionsVerified:false,grantedRequiredPermissions:[],failureStage:null,failureStatus:null,
    projectIamWrites:0,secretIamWrites:0,firestoreWrites:0,providerRequests:0,externalMessagesSent:0,privatePolicyPublished:false};
  let stage='CANONICAL_RUNTIME';
  try{
    for(const target of OPS){
      const resource=`projects/${PROJECT}/locations/${target.region}/functions/${target.name}`;
      const r=await sourceClient.request({url:'https://cloudfunctions.googleapis.com/v2/'+resource,method:'GET'});
      c.need(r.data?.name===resource&&r.data.state==='ACTIVE'&&r.data.serviceConfig?.serviceAccountEmail===CANONICAL_RUNTIME,
        'INGRESS_EVENTARC_CANONICAL_RUNTIME_CHANGED');
    }
    report.canonicalRuntimeObserved=true;stage='FUNCTION_INVENTORY';
    const rows=[...await listEventInventory(sourceClient,'v1'),...await listEventInventory(sourceClient,'v2')];
    report.inventoryComplete=true;report.functionCount=rows.length;
    report.existingRecognizedEventServices=[...new Set(rows.map(inventoryService).filter(Boolean))].sort();
    report.inventoryDigest=c.digest(rows.map(r=>({name:r.name,eventService:inventoryService(r),eventType:r.eventTrigger?.eventType||null})).sort((a,b)=>String(a.name).localeCompare(String(b.name))));
    stage='PROJECT_POLICY_READ';
    const r=await sourceClient.request({url:`https://cloudresourcemanager.googleapis.com/v1/projects/${PROJECT}:getIamPolicy`,method:'POST',
      data:{options:{requestedPolicyVersion:3}}}),policy=r.data;
    c.need(policy&&Array.isArray(policy.bindings)&&etagString(policy),'INGRESS_PROJECT_POLICY_UNVERIFIED');
    report.projectPolicyRead=true;report.projectPolicyDigest=policyDigest(policy);
    report.firstEventBindings=FIRST_EVENT_BINDINGS.map(required=>({...required,
      present:policy.bindings.some(b=>b.role===required.role&&!b.condition&&Array.isArray(b.members)&&b.members.includes(required.member))}));
    report.cliWouldAddProjectBindings=report.existingRecognizedEventServices.length===0&&report.firstEventBindings.some(b=>!b.present);
    stage='QUEUE_RULES_READBACK';report.queueRules=await queueRulesReadback(sourceClient,readRulesSources);
    stage='RUNTIME_EVENTARC_PERMISSIONS';
    const runtime=await runtimeClientFor(CANONICAL_RUNTIME);await runtime.getAccessToken();report.runtimeImpersonationVerified=true;
    const granted=await runtime.request({url:`https://cloudresourcemanager.googleapis.com/v1/projects/${PROJECT}:testIamPermissions`,
      method:'POST',data:{permissions:[...REQUIRED_EVENTARC_PERMISSIONS]}});
    report.grantedRequiredPermissions=REQUIRED_EVENTARC_PERMISSIONS.filter(p=>granted.data?.permissions?.includes(p));
    report.runtimeEventarcPermissionsVerified=report.grantedRequiredPermissions.length===REQUIRED_EVENTARC_PERMISSIONS.length;
    report.status=report.cliWouldAddProjectBindings?'UNAUTHORIZED_PROJECT_IAM_DELTA_WOULD_BE_REQUIRED_HOLD':
      report.runtimeEventarcPermissionsVerified?'EVENTARC_RUNTIME_AND_PROJECT_IAM_READY':'EVENTARC_RUNTIME_PERMISSION_MISSING_HOLD';
  }catch(error){report.failureStage=stage;report.failureStatus=safeStatus(error);}
  return{...report,reportDigest:c.digest(report)};
}
async function preflight({sourceClient,runtimeClientFor,secretClientFor}){
  const functions=[];
  for(const target of OPS){
    const resource=`projects/${PROJECT}/locations/${target.region}/functions/${target.name}`;
    try{
      const response=await sourceClient.request({url:'https://cloudfunctions.googleapis.com/v2/'+resource,method:'GET'}),fn=response.data;
      const principal=fn?.serviceConfig?.serviceAccountEmail;
      c.need(fn?.name===resource&&fn.state==='ACTIVE'&&isRuntime(principal),'INGRESS_CANONICAL_RUNTIME_METADATA_UNVERIFIED');
      functions.push({...target,resource,status:'OBSERVED_ACTIVE',principal,revision:String(fn.serviceConfig?.revision||'')});
    }catch(error){functions.push({...target,resource,status:safeStatus(error),principal:null});}
  }
  const principals=[...new Set([...functions.filter(f=>f.status==='OBSERVED_ACTIVE').map(f=>f.principal),PRIOR_RUNTIME])];
  const candidates=[];
  for(const principal of principals){
    const row={principal,canonicalOpsRuntime:functions.some(f=>f.status==='OBSERVED_ACTIVE'&&f.principal===principal),
      impersonationVerified:false,firestoreCapabilitiesVerified:false,secretVersionAccessVerified:false,
      grantedRequiredPermissions:[],firestoreStatus:'UNCONFIRMED',secretStatus:'UNCONFIRMED'};
    try{
      const runtime=await runtimeClientFor(principal);await runtime.getAccessToken();row.impersonationVerified=true;
      try{
        const response=await runtime.request({url:`https://cloudresourcemanager.googleapis.com/v1/projects/${PROJECT}:testIamPermissions`,
          method:'POST',data:{permissions:[...REQUIRED_FIRESTORE_PERMISSIONS]}});
        const granted=Array.isArray(response.data?.permissions)?response.data.permissions:[];
        row.grantedRequiredPermissions=REQUIRED_FIRESTORE_PERMISSIONS.filter(p=>granted.includes(p));
        row.firestoreCapabilitiesVerified=row.grantedRequiredPermissions.length===REQUIRED_FIRESTORE_PERMISSIONS.length;
        row.firestoreStatus=row.firestoreCapabilitiesVerified?'REQUIRED_PERMISSIONS_PRESENT':'REQUIRED_PERMISSIONS_MISSING';
      }catch(error){row.firestoreStatus=safeStatus(error);}
      let sm;
      try{
        sm=await secretClientFor(runtime);const [version]=await sm.accessSecretVersion({name:SECRET+'/versions/1'});
        const bytes=version?.payload?.data;c.need(bytes&&bytes.length<=8000,'INGRESS_RUNTIME_SECRET_FORMAT');
        const value=JSON.parse(Buffer.from(bytes).toString('utf8'));
        row.secretVersionAccessVerified=value?.tenantId===c.TENANT&&value?.pais===c.COUNTRY&&value?.idInstance===c.INSTANCE;
        row.secretStatus=row.secretVersionAccessVerified?'EXACT_VERSION_SCOPE_VERIFIED':'RETURNED_SCOPE_MISMATCH';
      }catch(error){row.secretStatus=safeStatus(error);}
      finally{if(sm)try{await sm.close();}catch(_){/* No private SDK exception is exposed. */}}
    }catch(error){row.firestoreStatus=safeStatus(error);row.secretStatus=safeStatus(error);}
    candidates.push(row);
  }
  const live=functions.find(f=>f.name==='orbit360OpsLeadsCommand'&&f.status==='OBSERVED_ACTIVE');
  const selected=candidates.find(r=>r.principal===live?.principal&&r.firestoreCapabilitiesVerified)||
    candidates.find(r=>r.principal===PRIOR_RUNTIME&&r.firestoreCapabilitiesVerified)||null;
  const missingGrant=selected?.secretStatus==='PERMISSION_DENIED';
  const report={schema:'GI_I66_MAKE_RUNTIME_ACCESS_PREFLIGHT_V1',status:selected?(selected.secretVersionAccessVerified?'RUNTIME_READY_FOR_CLOSED_DEPLOY':missingGrant?'EXACT_SECRET_IAM_DELTA_REQUIRED':'RUNTIME_SECRET_UNVERIFIED_HOLD'):'RUNTIME_UNVERIFIED_HOLD',
    scopeContractBlob:c.SCOPE_CONTRACT_BLOB,secretResource:SECRET,functions,candidates,selectedRuntime:selected?.principal||null,
    selectedFrom:!selected?'NONE':selected.canonicalOpsRuntime?'OBSERVED_CANONICAL_OPS_RUNTIME':'EXISTING_REFERENCED_RUNTIME',
    exactSecretGrantRequired:selected?.secretVersionAccessVerified?false:missingGrant?true:null,
    iamWrites:0,firestoreWrites:0,credentialValuesPrinted:false,providerRequests:0,externalMessagesSent:0};
  return{...report,reportDigest:c.digest(report)};
}
async function main(){
  c.need(process.argv.length===2||process.argv.length===3&&['preflight','eventarc-preflight'].includes(process.argv[2]),'INGRESS_RUNTIME_TOOL_READONLY_CLI');
  const {GoogleAuth,Impersonated}=functionsRequire('google-auth-library'),{SecretManagerServiceClient}=functionsRequire('@google-cloud/secret-manager');
  const auth=new GoogleAuth({projectId:PROJECT,scopes:['https://www.googleapis.com/auth/cloud-platform']}),sourceClient=await auth.getClient();
  const options={sourceClient,runtimeClientFor:async principal=>new Impersonated({sourceClient,targetPrincipal:principal,
    delegates:[],targetScopes:['https://www.googleapis.com/auth/cloud-platform'],lifetime:600}),
    secretClientFor:async runtime=>new SecretManagerServiceClient({projectId:PROJECT,auth:new GoogleAuth({authClient:runtime,projectId:PROJECT})})};
  const eventarc=process.argv[2]==='eventarc-preflight',report=await (eventarc?eventarcPreflight(options):preflight(options));
  console.log((eventarc?'I66_MAKE_EVENTARC_PROJECT_IAM_READONLY=':'I66_MAKE_RUNTIME_ACCESS_PREFLIGHT=')+JSON.stringify(report));
}
if(require.main===module)main().catch(()=>{console.error('I66_MAKE_RUNTIME_PREFLIGHT_UNCONFIRMED');process.exitCode=1;});
module.exports={SCOPE,PROJECT,SECRET,ROLE,PRIOR_RUNTIME,OPS,CANONICAL_RUNTIME,REQUIRED_FIRESTORE_PERMISSIONS,REQUIRED_EVENTARC_PERMISSIONS,FIRST_EVENT_BINDINGS,
  isRuntime,policyDigest,exactGrantPlan,grantExact,rollbackExact,preflight,eventarcPreflight,listEventInventory,inventoryService,queueRulesReadback};
