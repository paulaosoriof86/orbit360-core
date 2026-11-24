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
const policyDigest=(p,includeEtag=true)=>c.digest({...p,...(!includeEtag?{etag:undefined}:{etag:etagString(p)})});
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
  c.need(process.argv.length===2||process.argv.length===3&&process.argv[2]==='preflight','INGRESS_RUNTIME_TOOL_READONLY_CLI');
  const {GoogleAuth,Impersonated}=functionsRequire('google-auth-library'),{SecretManagerServiceClient}=functionsRequire('@google-cloud/secret-manager');
  const auth=new GoogleAuth({projectId:PROJECT,scopes:['https://www.googleapis.com/auth/cloud-platform']}),sourceClient=await auth.getClient();
  const report=await preflight({sourceClient,runtimeClientFor:async principal=>new Impersonated({sourceClient,targetPrincipal:principal,
    delegates:[],targetScopes:['https://www.googleapis.com/auth/cloud-platform'],lifetime:600}),
    secretClientFor:async runtime=>new SecretManagerServiceClient({projectId:PROJECT,auth:new GoogleAuth({authClient:runtime,projectId:PROJECT})})});
  console.log('I66_MAKE_RUNTIME_ACCESS_PREFLIGHT='+JSON.stringify(report));
}
if(require.main===module)main().catch(()=>{console.error('I66_MAKE_RUNTIME_PREFLIGHT_UNCONFIRMED');process.exitCode=1;});
module.exports={SCOPE,PROJECT,SECRET,ROLE,PRIOR_RUNTIME,OPS,REQUIRED_FIRESTORE_PERMISSIONS,isRuntime,policyDigest,exactGrantPlan,grantExact,rollbackExact,preflight};
