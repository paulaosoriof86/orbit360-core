import fs from 'node:fs';
import crypto from 'node:crypto';
import {initializeApp,cert,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';

const out=process.argv[2];
const tenant=String(process.env.TENANT_HINT||'').trim();
const project=String(process.env.PROJECT_ID||'').trim();
if(!out||!tenant||!project) throw new Error('B1_BRANDING_SNAPSHOT_ARGS');

const sa=JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));
const app=initializeApp({credential:cert(sa),projectId:project},'b1-branding-snapshot');
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
