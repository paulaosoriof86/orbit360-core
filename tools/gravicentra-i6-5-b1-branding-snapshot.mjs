import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {initializeApp,cert,applicationDefault,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';

const out=process.argv[2];
const tenant=String(process.env.TENANT_HINT||'').trim();
const project=String(process.env.PROJECT_ID||'').trim();
if(!out||!tenant||!project) throw new Error('B1_BRANDING_SNAPSHOT_ARGS');

async function snapshotCredential(){
  const provider=String(process.env.GRAVICENTRA_BUILD_PROVIDER||'').trim();
  if(!provider){
    if(!String(process.env.GOOGLE_APPLICATION_CREDENTIALS||'').trim()) throw new Error('B1_BRANDING_CREDENTIAL_REQUIRED');
    const sa=JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));
    if(sa.type!=='service_account'||sa.project_id!==project) throw new Error('B1_BRANDING_CREDENTIAL_PROJECT_MISMATCH');
    return cert(sa);
  }
  if(provider!=='CLOUD_BUILD') throw new Error('B1_BRANDING_PROVIDER_UNSUPPORTED');
  if(project!=='ays-orbit-360-lab'||tenant!=='alianzas-soluciones') throw new Error('B1_BRANDING_CLOUD_SCOPE_MISMATCH');
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(process.env.GRAVICENTRA_CLOUD_BUILD_ID||''))
    throw new Error('B1_BRANDING_CLOUD_BUILD_ID_REQUIRED');
  const expectedAccount=String(process.env.GRAVICENTRA_CLOUD_BUILD_SERVICE_ACCOUNT||'').trim();
  if(!/^[a-z0-9][a-z0-9-]+@ays-orbit-360-lab\.iam\.gserviceaccount\.com$/.test(expectedAccount)&&
      expectedAccount!=='646761409743-compute@developer.gserviceaccount.com')
    throw new Error('B1_BRANDING_CLOUD_SERVICE_ACCOUNT_REQUIRED');
  // The Cloud Build owner verifies the real build/config identity separately.
  // This reader accepts only ADC from the attached runtime identity, never a
  // local user/key fallback or metadata override.
  const forbidden=['GOOGLE_APPLICATION_CREDENTIALS','CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE',
    'GCE_METADATA_HOST','GCE_METADATA_IP','GCE_METADATA_ROOT',
    'FIRESTORE_EMULATOR_HOST','FIREBASE_AUTH_EMULATOR_HOST'];
  if(forbidden.some(key=>String(process.env[key]||'').trim())) throw new Error('B1_BRANDING_CLOUD_CREDENTIAL_OVERRIDE');
  const localAdcRoots=[path.join(os.homedir(),'.config','gcloud'),process.env.CLOUDSDK_CONFIG].filter(Boolean);
  if(localAdcRoots.some(root=>fs.existsSync(path.join(root,'application_default_credentials.json'))))
    throw new Error('B1_BRANDING_CLOUD_LOCAL_ADC_FORBIDDEN');
  async function metadata(suffix){
    let response;
    try{
      response=await fetch('http://metadata.google.internal/computeMetadata/v1/'+suffix,{
        headers:{'Metadata-Flavor':'Google'},redirect:'error',signal:AbortSignal.timeout(5000)
      });
    }catch{throw new Error('B1_BRANDING_CLOUD_METADATA_UNAVAILABLE');}
    if(!response.ok||response.headers.get('metadata-flavor')!=='Google') throw new Error('B1_BRANDING_CLOUD_METADATA_UNTRUSTED');
    return (await response.text()).trim();
  }
  const [runtimeProject,runtimeAccount]=await Promise.all([
    metadata('project/project-id'),metadata('instance/service-accounts/default/email')
  ]);
  if(runtimeProject!==project||runtimeAccount!==expectedAccount) throw new Error('B1_BRANDING_CLOUD_RUNTIME_IDENTITY_MISMATCH');
  return applicationDefault();
}
const app=initializeApp({credential:await snapshotCredential(),projectId:project},'b1-branding-snapshot');
const db=getFirestore(app);
const clean=(v,m)=>String(v==null?'':v).trim().slice(0,m);
const stable=v=>v&&typeof v==='object'&&!Array.isArray(v)
  ? Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]))
  : Array.isArray(v)?v.map(stable):v;

try{
  const ref=db.collection('tenants').doc(tenant).collection('config').doc('branding');
  const snap=await ref.get();
  if(!snap.exists) throw new Error('B1_BRANDING_CONFIG_MISSING');
  const d=snap.data()||{};
  const branding={
    schemaVersion:'orbit360-tenant-branding-v1',
    displayName:clean(d.displayName,120),
    legalName:clean(d.legalName,180),
    logo:clean(d.logo,350000),
    favicon:clean(d.favicon,350000)
  };
  if(!branding.displayName||!branding.logo||!branding.favicon) throw new Error('B1_BRANDING_CONFIG_INCOMPLETE');
  const hash=crypto.createHash('sha256').update(JSON.stringify(stable(branding))).digest('hex');
  const sourceUpdatedAt=d.updatedAt&&typeof d.updatedAt.toDate==='function'?d.updatedAt.toDate().toISOString():'';
  fs.writeFileSync(out,JSON.stringify({
    tenantId:tenant,
    version:'b1-r3',
    hash,
    sourcePath:'tenants/'+tenant+'/config/branding',
    sourceUpdatedAt,
    generatedAt:new Date().toISOString(),
    branding
  },null,2)+'\n');
  console.log('B1_BRANDING_SNAPSHOT=PASS');
  console.log('B1_BRANDING_HASH='+hash);
} finally {
  await deleteApp(app).catch(()=>{});
}
