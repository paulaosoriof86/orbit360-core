import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { GoogleAuth } from 'google-auth-library';

const PROJECT='ays-orbit-360-lab';
const REGION='us-central1';
const FUNCTION='orbit360ProductInsurerCredentialCommand';
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

const evidence={
  schemaVersion:'gravicentra-i4a-insurer-backend-boundary-readonly-v1',gate:'I4A',module:'Aseguradoras',
  sourceSha:SOURCE,buildId:BUILD,projectId:PROJECT,region:REGION,functionName:FUNCTION,
  productionTouched:false,dataTouched:false,writesExecuted:0,functionInvocations:0,secretsRecorded:false,
  sourceContract:{},cloud:{},workflowDeployInventory:[],decision:'UNRESOLVED',checks:{},errors:[]
};
try{
  need(SOURCE&&BUILD,'BOUNDARY_ENV_INCOMPLETE');
  const backend=read('functions/product-insurer-credentials.js');
  const bootstrap=read('functions/bootstrap.js');
  const pkg=read('functions/package.json');
  const provider=read('orbit360-platform/core/product-insurer-credential-provider-p0.js');
  const runtime=read('orbit360-platform/core/product-runtime-browser-providers-p0.js');
  evidence.sourceContract={
    backendExportsCallable:backend.includes(`exports.${FUNCTION}=onCall`)||backend.includes(`exports.${FUNCTION} = onCall`),
    backendViewRoles:['direccion','superadmin','admin','admintenant','operativo'].every(r=>backend.includes(`'${r}'`)),
    backendWritesAudit:/collection\(['"]auditEvents['"]\)\.add\(/.test(backend),
    bootstrapIncludesBackend:bootstrap.includes("require('./product-insurer-credentials')"),
    packageChecksBackend:pkg.includes('product-insurer-credentials.js'),
    frontendCallableConstant:provider.includes(`const CALLABLE = '${FUNCTION}'`)||provider.includes(`const CALLABLE='${FUNCTION}'`),
    frontendCallsRuntime:provider.includes('runtime().callFunction(CALLABLE'),
    frontendDirectFirestoreWritesFalse:provider.includes('directFirestoreWrites:false'),
    runtimeHttpsCallable:runtime.includes('httpsCallable(fx,name)'),
    runtimeDefaultRegion:runtime.includes("region=String(region||'us-central1')")
  };
  evidence.workflowDeployInventory=workflowDeployInventory();
  const recoveryBackendDeploy=evidence.workflowDeployInventory.filter(x=>x.recovery);

  const sa=serviceAccount();
  const auth=new GoogleAuth({credentials:sa,scopes:['https://www.googleapis.com/auth/cloud-platform']});
  const client=await auth.getClient();
  const token=await client.getAccessToken();
  need(token?.token,'CLOUD_ACCESS_TOKEN_UNAVAILABLE');
  const headers={Authorization:`Bearer ${token.token}`,'User-Agent':'Gravicentra-I4A-Readonly-Boundary/1.0'};
  const functionUrl=`https://cloudfunctions.googleapis.com/v2/projects/${PROJECT}/locations/${REGION}/functions/${FUNCTION}`;
  const fRes=await fetch(functionUrl,{headers});
  const fBody=await safeJson(fRes);
  evidence.cloud.functionMetadataHttpStatus=fRes.status;
  evidence.cloud.functionMetadataExists=fRes.status===200;
  evidence.cloud.functionMetadataState=fRes.status===200?String(fBody.state||''):'';
  evidence.cloud.functionMetadataName=fRes.status===200?String(fBody.name||''):'';
  evidence.cloud.functionMetadataErrorStatus=fRes.status===200?'':String(fBody?.error?.status||'');

  const runName=FUNCTION.toLowerCase();
  const runUrl=`https://run.googleapis.com/v2/projects/${PROJECT}/locations/${REGION}/services/${runName}`;
  const rRes=await fetch(runUrl,{headers});
  const rBody=await safeJson(rRes);
  evidence.cloud.cloudRunHttpStatus=rRes.status;
  evidence.cloud.cloudRunServiceExists=rRes.status===200;
  evidence.cloud.cloudRunServiceName=rRes.status===200?String(rBody.name||''):'';

  evidence.checks={
    sourceExported:evidence.sourceContract.backendExportsCallable===true,
    sourceBootstrapped:evidence.sourceContract.bootstrapIncludesBackend===true&&evidence.sourceContract.packageChecksBackend===true,
    frontendWiredExactCallable:evidence.sourceContract.frontendCallableConstant===true&&evidence.sourceContract.frontendCallsRuntime===true&&evidence.sourceContract.runtimeHttpsCallable===true&&evidence.sourceContract.runtimeDefaultRegion===true,
    browserHasNoDirectFirestoreCredentialWrites:evidence.sourceContract.frontendDirectFirestoreWritesFalse===true,
    backendWouldAuditCredentialUse:evidence.sourceContract.backendWritesAudit===true,
    cloudFunctionAbsent:evidence.cloud.functionMetadataHttpStatus===404,
    cloudRunServiceAbsent:evidence.cloud.cloudRunHttpStatus===404,
    noRecoveryBackendPreviewDeployMechanism:recoveryBackendDeploy.length===0
  };
  const required=['sourceExported','sourceBootstrapped','frontendWiredExactCallable','browserHasNoDirectFirestoreCredentialWrites','backendWouldAuditCredentialUse','cloudFunctionAbsent','noRecoveryBackendPreviewDeployMechanism'];
  const failed=required.filter(k=>evidence.checks[k]!==true);
  need(failed.length===0,'BOUNDARY_CHECK_FAILED:'+failed.join(','));
  evidence.decision='BLOCKED_BACKEND_RELEASE_BOUNDARY';
  evidence.reason='Exact product callable is wired in source but absent from Cloud; Recovery has no isolated backend Preview deploy mechanism. Deploying/invoking it before I5 would alter shared backend and credential operations write auditEvents.';
}catch(e){
  evidence.errors.push(String(e?.message||e).slice(0,800));
  process.exitCode=1;
}finally{
  fs.mkdirSync(OUT,{recursive:true});
  fs.writeFileSync(path.join(OUT,'i4a-insurer-backend-boundary-readonly.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log('I4A_INSURER_BOUNDARY_DECISION='+evidence.decision);
  console.log('I4A_INSURER_BOUNDARY_CHECKS='+JSON.stringify(evidence.checks));
  console.log('I4A_INSURER_BOUNDARY_WRITES=0');
  console.log('I4A_INSURER_BOUNDARY_INVOCATIONS=0');
}
