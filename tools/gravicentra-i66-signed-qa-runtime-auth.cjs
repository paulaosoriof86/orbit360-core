'use strict';
// Credential selection for the existing signed QA drivers. This does not grant
// a release phase, change an actor, or attest a Cloud Build execution. The
// provider owner must separately verify the real build/config/source and pins.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const C=Object.freeze({provider:'CLOUD_BUILD',projectId:'ays-orbit-360-lab',projectNumber:'646761409743',
  serviceAccount:'firebase-adminsdk-fbsvc@ays-orbit-360-lab.iam.gserviceaccount.com',
  metadataRoot:'http://metadata.google.internal/computeMetadata/v1/'});
const OVERRIDES=Object.freeze(['GOOGLE_APPLICATION_CREDENTIALS','CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE',
  'CLOUDSDK_AUTH_ACCESS_TOKEN','CLOUDSDK_AUTH_ACCESS_TOKEN_FILE','CLOUDSDK_AUTH_IMPERSONATE_SERVICE_ACCOUNT',
  'GCE_METADATA_HOST','GCE_METADATA_IP','GCE_METADATA_ROOT',
  'FIRESTORE_EMULATOR_HOST','FIREBASE_AUTH_EMULATOR_HOST','SA_LAB','SA_LAB_ALT','SA_ALT','SA_DEFAULT']);
const present=value=>String(value||'').trim().length>0;
const need=(ok,code)=>{if(!ok)throw Error('I66_SIGNED_QA_'+code);};

async function verifyCloudBuildRuntime(env=process.env,deps={}){
  need(env.GRAVICENTRA_BUILD_PROVIDER===C.provider,'CLOUD_PROVIDER_REQUIRED');
  need(env.PROJECT_ID===C.projectId,'CLOUD_PROJECT_REQUIRED');
  const buildId=env.GRAVICENTRA_CLOUD_BUILD_ID;
  need(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(buildId||''),'CLOUD_BUILD_ID_REQUIRED');
  need(env.GRAVICENTRA_CLOUD_BUILD_SERVICE_ACCOUNT===C.serviceAccount,'CLOUD_SERVICE_ACCOUNT_REQUIRED');
  need(!OVERRIDES.some(key=>present(env[key])),'CLOUD_CREDENTIAL_OVERRIDE');
  const exists=deps.existsSync||fs.existsSync,homedir=deps.homedir||os.homedir;
  const roots=[path.join(homedir(),'.config','gcloud'),env.CLOUDSDK_CONFIG].filter(Boolean);
  need(!roots.some(root=>exists(path.join(root,'application_default_credentials.json'))),'CLOUD_LOCAL_ADC_FORBIDDEN');
  const fetcher=deps.fetch||globalThis.fetch;
  async function metadata(suffix){
    let response;
    try{response=await fetcher(C.metadataRoot+suffix,{headers:{'Metadata-Flavor':'Google'},redirect:'error',signal:AbortSignal.timeout(5000)});}
    catch{throw Error('I66_SIGNED_QA_CLOUD_METADATA_UNAVAILABLE');}
    need(response.status===200&&response.redirected!==true&&response.headers?.get('metadata-flavor')==='Google','CLOUD_METADATA_UNTRUSTED');
    try{return (await response.text()).trim();}
    catch{throw Error('I66_SIGNED_QA_CLOUD_METADATA_UNAVAILABLE');}
  }
  const [projectId,projectNumber,serviceAccount]=await Promise.all([
    metadata('project/project-id'),metadata('project/numeric-project-id'),metadata('instance/service-accounts/default/email')
  ]);
  need(projectId===C.projectId&&projectNumber===C.projectNumber&&serviceAccount===C.serviceAccount,'CLOUD_RUNTIME_IDENTITY_MISMATCH');
  return {provider:C.provider,buildId,projectId,projectNumber,serviceAccount};
}

async function initializeSignedQaAdmin(admin,{getLegacyCredential,env=process.env,...deps}={}){
  const provider=String(env.GRAVICENTRA_BUILD_PROVIDER||'').trim();
  if(!provider){
    need(typeof getLegacyCredential==='function','LEGACY_CREDENTIAL_READER_REQUIRED');
    return admin.initializeApp({credential:admin.credential.cert(getLegacyCredential()),projectId:C.projectId});
  }
  need(provider===C.provider,'PROVIDER_UNSUPPORTED');
  const identity=await verifyCloudBuildRuntime(env,deps);
  // Remote IAM signing occurs only when an existing driver creates its custom
  // token. A denial propagates through that driver's existing HOLD/restore path.
  // No key or access token is read, exported, printed, or synthesized here.
  return admin.initializeApp({credential:admin.credential.applicationDefault(),projectId:identity.projectId,
    serviceAccountId:identity.serviceAccount});
}
module.exports={C,OVERRIDES,verifyCloudBuildRuntime,initializeSignedQaAdmin};
