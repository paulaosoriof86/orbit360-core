import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { GoogleAuth } from 'google-auth-library';

const PROJECT='ays-orbit-360-lab';
const REGION='us-central1';
const FUNCTION='orbit360ProductInsurerCredentialCommand';
const LEGACY_FUNCTIONS=['orbit360CredentialStatus','orbit360RevealInsurerCredential','orbit360CopyInsurerCredential'];
const SOURCE=process.env.SOURCE_SHA||'';
const BUILD=process.env.BUILD_ID||'';
const OUT=process.env.I4A_INSURER_BOUNDARY_DIR||process.env.RUNNER_TEMP||process.cwd();
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const read=p=>fs.readFileSync(p,'utf8');
const safeJson=async r=>{try{return await r.json();}catch{return {};}};

function serviceAccount(){
  for(const raw of [process.env.SA_DEFAULT,process.env.SA_ORBIT360_LAB,process.env.SA_ORBIT_360_LAB].filter(Boolean)){
    try{const x=JSON.parse(raw);if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}
  }
  throw new Error('EXISTING_SERVICE_ACCOUNT_NOT_AVAILABLE');
}
function workflowDeployInventory(){
  const dir='.github/workflows';
  const rows=[];
  for(const name of fs.readdirSync(dir).filter(x=>/\.ya?ml$/i.test(x))){
    const text=read(path.join(dir,name));
    const recovery=/^gravicentra-/i.test(name);
    const hits=[];
    for(const [id,re] of [
      ['firebase_functions_deploy',/firebase[^\n]{0,80}deploy[^\n]{0,80}(?:functions|--only\s+functions)/ig],
      ['gcloud_functions_deploy',/gcloud\s+functions\s+deploy/ig],
      ['gcloud_run_deploy',/gcloud\s+run\s+deploy/ig],
      ['functions_emulator',/(?:functions:emulator|emulators:start[^\n]*functions)/ig]
    ]) if(re.test(text)) hits.push(id);
    if(hits.length)rows.push({workflow:name,recovery,hits});
  }
  return rows;
}
async function functionMetadata(name,headers){
  const url=`https://cloudfunctions.googleapis.com/v2/projects/${PROJECT}/locations/${REGION}/functions/${name}`;
  const res=await fetch(url,{headers});
  const body=await safeJson(res);
  return {httpStatus:res.status,exists:res.status===200,state:res.status===200?String(body.state||''):'',name:res.status===200?String(body.name||''):'',errorStatus:res.status===200?'':String(body?.error?.status||'')};
}

const evidence={
  schemaVersion:'gravicentra-i4a-insurer-backend-boundary-readonly-v4',gate:'I4A',module:'Aseguradoras',
  sourceSha:SOURCE,buildId:BUILD,projectId:PROJECT,region:REGION,functionName:FUNCTION,legacyFunctionNames:LEGACY_FUNCTIONS,
  productionTouched:false,dataTouched:false,writesExecuted:0,functionInvocations:0,secretsRecorded:false,
  sourceContract:{},contractComparison:{},cloud:{legacyFunctions:{}},workflowDeployInventory:[],decision:'UNRESOLVED',checks:{},errors:[]
};
try{
  need(SOURCE&&BUILD,'BOUNDARY_ENV_INCOMPLETE');
  const backend=read('functions/product-insurer-credentials.js');
  const legacy=read('functions/index.js');
  const bootstrap=read('functions/bootstrap.js');
  const pkg=read('functions/package.json');
  const provider=read('orbit360-platform/core/product-insurer-credential-provider-p0.js');
  const runtime=read('orbit360-platform/core/product-runtime-browser-providers-p0.js');
  const legacyAuditWrites={
    orbit360CredentialStatus:legacy.includes("audit('credential.status'"),
    orbit360RevealInsurerCredential:legacy.includes("audit('credential.reveal'"),
    orbit360CopyInsurerCredential:legacy.includes("audit('credential.copy'")
  };
  evidence.sourceContract={
    backendExportsCallable:backend.includes(`exports.${FUNCTION}=onCall`)||backend.includes(`exports.${FUNCTION} = onCall`),
    backendViewRoles:['direccion','superadmin','admin','admintenant','operativo'].every(r=>backend.includes(`'${r}'`)),
    backendUsesProductActiveRoleContract:backend.includes("require('./product-active-role-contract')")&&backend.includes('resolveProductActiveRole('),
    backendWritesAudit:/collection\(['"]auditEvents['"]\)\.add\(/.test(backend),
    bootstrapIncludesBackend:bootstrap.includes("require('./product-insurer-credentials')"),
    packageChecksBackend:pkg.includes('product-insurer-credentials.js'),
    frontendCallableConstant:provider.includes(`const CALLABLE = '${FUNCTION}'`)||provider.includes(`const CALLABLE='${FUNCTION}'`),
    frontendCallsRuntime:provider.includes('runtime().callFunction(CALLABLE'),
    frontendSendsOperation:provider.includes('operation,'),
    frontendSendsTenantId:provider.includes('tenantId:tenantId()'),
    frontendSendsActiveRole:provider.includes('activeRole:role'),
    frontendSendsCredentialRef:provider.includes('credentialRef:r'),
    frontendSendsInsurerId:provider.includes('insurerId'),
    frontendSendsPortalId:/callFunction\(CALLABLE,[\s\S]{0,500}portalId/.test(provider),
    frontendSendsField:/callFunction\(CALLABLE,[\s\S]{0,500}field/.test(provider),
    frontendDirectFirestoreWritesFalse:provider.includes('directFirestoreWrites:false'),
    runtimeHttpsCallable:runtime.includes('httpsCallable(fx,name)'),
    runtimeDefaultRegion:runtime.includes("region=String(region||'us-central1')"),
    legacyExports:LEGACY_FUNCTIONS.reduce((out,name)=>(out[name]=legacy.includes(`exports.${name} = onCall`)||legacy.includes(`exports.${name}=onCall`),out),{}),
    legacyAuditWrites,
    legacyHardcodedTenant:legacy.includes("const TENANT_ID = 'alianzas-soluciones'"),
    legacyHardcodedIdentity:legacy.includes('EXPECTED_UID')&&legacy.includes('EXPECTED_EMAIL')&&legacy.includes('request.auth.uid !== EXPECTED_UID'),
    legacyRevealRequiresPortalId:legacy.includes("const portalId = clean(input.portalId")&&legacy.includes('record.portalId !== portalId'),
    legacyRevealCopyRequireField:legacy.includes("if (!['username', 'password'].includes(field))")
  };
  evidence.contractComparison={
    productCallable:FUNCTION,
    productBrowserPayload:['operation','tenantId','activeRole','credentialRef','insurerId'],
    legacyRevealCopyAdditionalRequiredPayload:['portalId','field'],
    productAuthorization:'active membership + requested assigned active role',
    legacyAuthorization:'hardcoded LAB identity + tenant + assigned role/extra permission',
    sameBrowserPayload:false,
    sameAuthorizationContract:false,
    directRetargetSafe:false
  };
  evidence.workflowDeployInventory=workflowDeployInventory();
  const recoveryBackendDeploy=evidence.workflowDeployInventory.filter(x=>x.recovery);

  const sa=serviceAccount();
  const auth=new GoogleAuth({credentials:sa,scopes:['https://www.googleapis.com/auth/cloud-platform']});
  const client=await auth.getClient();
  const token=await client.getAccessToken();
  need(token?.token,'CLOUD_ACCESS_TOKEN_UNAVAILABLE');
  const headers={Authorization:`Bearer ${token.token}`,'User-Agent':'Gravicentra-I4A-Readonly-Boundary/4.0'};

  const exact=await functionMetadata(FUNCTION,headers);
  evidence.cloud.functionMetadataHttpStatus=exact.httpStatus;
  evidence.cloud.functionMetadataExists=exact.exists;
  evidence.cloud.functionMetadataState=exact.state;
  evidence.cloud.functionMetadataName=exact.name;
  evidence.cloud.functionMetadataErrorStatus=exact.errorStatus;
  for(const name of LEGACY_FUNCTIONS) evidence.cloud.legacyFunctions[name]=await functionMetadata(name,headers);

  const runName=FUNCTION.toLowerCase();
  const runUrl=`https://run.googleapis.com/v2/projects/${PROJECT}/locations/${REGION}/services/${runName}`;
  const rRes=await fetch(runUrl,{headers});
  const rBody=await safeJson(rRes);
  evidence.cloud.cloudRunHttpStatus=rRes.status;
  evidence.cloud.cloudRunServiceExists=rRes.status===200;
  evidence.cloud.cloudRunServiceName=rRes.status===200?String(rBody.name||''):'';

  const legacyAllSource=LEGACY_FUNCTIONS.every(name=>evidence.sourceContract.legacyExports[name]===true);
  const legacyAllCloud=LEGACY_FUNCTIONS.every(name=>evidence.cloud.legacyFunctions[name]?.exists===true&&evidence.cloud.legacyFunctions[name]?.state==='ACTIVE');
  const legacyAllAudit=LEGACY_FUNCTIONS.every(name=>evidence.sourceContract.legacyAuditWrites[name]===true);
  const directLegacyMismatch=evidence.sourceContract.legacyHardcodedTenant===true&&evidence.sourceContract.legacyHardcodedIdentity===true&&evidence.sourceContract.legacyRevealRequiresPortalId===true&&evidence.sourceContract.legacyRevealCopyRequireField===true&&evidence.sourceContract.frontendSendsPortalId===false&&evidence.sourceContract.frontendSendsField===false;
  evidence.checks={
    sourceExported:evidence.sourceContract.backendExportsCallable===true,
    sourceBootstrapped:evidence.sourceContract.bootstrapIncludesBackend===true&&evidence.sourceContract.packageChecksBackend===true,
    productAuthorizationContractPresent:evidence.sourceContract.backendUsesProductActiveRoleContract===true,
    frontendWiredExactCallable:evidence.sourceContract.frontendCallableConstant===true&&evidence.sourceContract.frontendCallsRuntime===true&&evidence.sourceContract.runtimeHttpsCallable===true&&evidence.sourceContract.runtimeDefaultRegion===true,
    frontendProductPayloadComplete:evidence.sourceContract.frontendSendsOperation===true&&evidence.sourceContract.frontendSendsTenantId===true&&evidence.sourceContract.frontendSendsActiveRole===true&&evidence.sourceContract.frontendSendsCredentialRef===true&&evidence.sourceContract.frontendSendsInsurerId===true,
    browserHasNoDirectFirestoreCredentialWrites:evidence.sourceContract.frontendDirectFirestoreWritesFalse===true,
    backendWouldAuditCredentialUse:evidence.sourceContract.backendWritesAudit===true,
    cloudFunctionAbsent:evidence.cloud.functionMetadataHttpStatus===404,
    cloudRunServiceAbsent:evidence.cloud.cloudRunHttpStatus===404,
    noRecoveryBackendPreviewDeployMechanism:recoveryBackendDeploy.length===0,
    legacyCallablesExistInSource:legacyAllSource,
    legacyCallablesAllDeployedActive:legacyAllCloud,
    legacyCallablesWouldWriteAudit:legacyAllAudit,
    legacyInvocationBlockedByZeroWriteGate:legacyAllCloud&&legacyAllAudit&&evidence.functionInvocations===0&&evidence.writesExecuted===0&&evidence.dataTouched===false,
    legacyContractMismatchProven:directLegacyMismatch,
    directLegacyRetargetRejected:directLegacyMismatch&&evidence.contractComparison.directRetargetSafe===false
  };
  const required=['sourceExported','sourceBootstrapped','productAuthorizationContractPresent','frontendWiredExactCallable','frontendProductPayloadComplete','browserHasNoDirectFirestoreCredentialWrites','backendWouldAuditCredentialUse','cloudFunctionAbsent','cloudRunServiceAbsent','noRecoveryBackendPreviewDeployMechanism','legacyCallablesExistInSource','legacyCallablesAllDeployedActive','legacyCallablesWouldWriteAudit','legacyInvocationBlockedByZeroWriteGate','legacyContractMismatchProven','directLegacyRetargetRejected'];
  const failed=required.filter(k=>evidence.checks[k]!==true);
  need(failed.length===0,'BOUNDARY_CHECK_FAILED:'+failed.join(','));
  evidence.decision='PRODUCT_CALLABLE_NOT_DEPLOYED_LEGACY_CONTRACT_NOT_EQUIVALENT';
  evidence.reason='The certified frontend is wired to orbit360ProductInsurerCredentialCommand, whose Cloud Functions and Cloud Run metadata are absent. The deployed legacy callables are not a drop-in replacement: reveal/copy require portalId and field that the certified browser provider does not send, and legacy authorization is restricted to a hardcoded LAB identity while the product contract uses active tenant membership plus assigned active role. Legacy calls also write auditEvents, so authenticated invocation is forbidden by the I4A zero-write gate. No direct retarget, backend deployment, product change, production touch, or data write is authorized by this probe.';
}catch(e){
  evidence.errors.push(String(e?.message||e).slice(0,800));
  process.exitCode=1;
}finally{
  fs.mkdirSync(OUT,{recursive:true});
  fs.writeFileSync(path.join(OUT,'i4a-insurer-backend-boundary-readonly.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log('I4A_INSURER_BOUNDARY_DECISION='+evidence.decision);
  console.log('I4A_INSURER_BOUNDARY_CHECKS='+JSON.stringify(evidence.checks));
  console.log('I4A_INSURER_CONTRACT_COMPARISON='+JSON.stringify(evidence.contractComparison||{}));
  console.log('I4A_INSURER_LEGACY_CLOUD='+JSON.stringify(evidence.cloud.legacyFunctions||{}));
  console.log('I4A_INSURER_BOUNDARY_WRITES=0');
  console.log('I4A_INSURER_BOUNDARY_INVOCATIONS=0');
}