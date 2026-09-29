import fs from 'node:fs';
import crypto from 'node:crypto';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const PROJECT=process.env.PROJECT_ID||'ays-orbit-360-lab';
const TENANT=String(process.env.TENANT_HINT||'alianzas-soluciones').trim();
const LOCK=process.env.B2_LOCK||'artifacts/orbit360-recovery/release-control/I6_5_FORENSIC_B2_EXECUTION_LOCK_20260920.json';
const OUT=process.env.B2_R102_DIAG_OUT||'b2-r102-logo-readonly.json';
const clean=(v,m=2000)=>String(v==null?'':v).trim().slice(0,m);
const need=(v,c)=>{if(!v)throw new Error(c);};
const sha=v=>crypto.createHash('sha256').update(String(v||'')).digest('hex');

function serviceAccount(){
  for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){
    try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.private_key)return x;}catch{}
  }
  throw new Error('B2_R102_SERVICE_ACCOUNT_REQUIRED');
}
function dataCol(db,name){return db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items');}
function urlEvidence(url){
  if(!url)return{present:false};
  try{
    const u=new URL(url);
    return{present:true,host:u.host,pathHash:sha(u.pathname),queryKeys:[...u.searchParams.keys()].sort(),urlHash:sha(url)};
  }catch{
    return{present:true,parse:false,urlHash:sha(url)};
  }
}
function magic(bytes){
  const b=Buffer.from(bytes||[]);
  const png=b.length>=8&&b.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  const jpg=b.length>=3&&b[0]===0xff&&b[1]===0xd8&&b[2]===0xff;
  const webp=b.length>=12&&b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP';
  return{png,jpg,webp,valid:png||jpg||webp};
}
async function probe(url){
  if(!url)return{attempted:false};
  try{
    const r=await fetch(url,{redirect:'follow'});
    const bytes=Buffer.from(await r.arrayBuffer());
    return{
      attempted:true,status:r.status,ok:r.ok,contentType:clean(r.headers.get('content-type')||'',200),
      length:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),
      magic:magic(bytes),finalUrl:urlEvidence(r.url)
    };
  }catch(error){
    return{attempted:true,ok:false,status:0,error:clean(error?.stack||error,3000)};
  }
}

const lock=JSON.parse(fs.readFileSync(LOCK,'utf8'));
const fixture=lock.finalHumanFixtures?.insurer||lock.authenticatedPreviewProof?.humanFixtures?.insurer||null;
need(fixture?.id,'B2_R102_FIXTURE_ID_REQUIRED');
need(lock.preview?.url&&lock.preview?.sourceSha&&lock.preview?.buildId,'B2_R102_EXACT_PREVIEW_BINDING_REQUIRED');

let app;
const ev={
  schema:'GRAVICENTRA_I6_5_B2_R102_LOGO_READONLY_DIAGNOSTIC_V1',
  status:'RUNNING',
  tenantId:TENANT,
  insurerId:fixture.id,
  exactPreview:{url:lock.preview.url,sourceSha:lock.preview.sourceSha,buildId:lock.preview.buildId,runId:lock.preview.runId},
  readOnly:true,
  findings:[],
  errors:[]
};

try{
  app=initializeApp({credential:cert(serviceAccount()),projectId:PROJECT},'b2-r102-logo-readonly-'+Date.now());
  const db=getFirestore(app);
  const snap=await dataCol(db,'aseguradoras').doc(fixture.id).get();
  need(snap.exists,'B2_R102_INSURER_FIXTURE_MISSING');
  const row=snap.data()||{};
  const logo=clean(row.logo,5000),assetRef=clean(row.logoAssetRef,1000);
  ev.firestore={
    exists:true,
    name:clean(row.nombre,500),
    qaFixture:row.qaFixture===true,
    qaFixtureType:clean(row.qaFixtureType,200),
    logoPresent:!!logo,
    assetRefPresent:!!assetRef,
    logoUrl:urlEvidence(logo),
    assetRef,
    logoContentHash:clean(row.logoContentHash,200),
    logoUpdatedByUidPresent:!!clean(row.logoUpdatedByUid,300)
  };
  need(/^https:\/\/firebasestorage\.googleapis\.com\//i.test(logo),'B2_R102_LOGO_URL_NOT_FIREBASE_DOWNLOAD_URL');
  need(assetRef.startsWith('preview/tenants/'+TENANT+'/assets/insurers/'+fixture.id+'/'),'B2_R102_ASSET_REF_NOT_EXACT_FIXTURE');

  const bucketMatch=logo.match(/\/v0\/b\/([^/]+)\/o\//i);
  const bucketName=bucketMatch?decodeURIComponent(bucketMatch[1]):'';
  need(bucketName,'B2_R102_BUCKET_PARSE_FAILED');

  const persisted=new URL(logo);
  const persistedToken=clean(persisted.searchParams.get('token')||'',500);
  const bucket=getStorage(app).bucket(bucketName);
  const file=bucket.file(assetRef);
  const [exists]=await file.exists();
  ev.storage={bucket:bucketName,objectExists:exists,persistedTokenPresent:!!persistedToken};

  let canonicalUrl='';
  if(exists){
    const [metadata]=await file.getMetadata();
    const [bytes]=await file.download();
    const custom=metadata?.metadata||{};
    const metadataTokens=clean(custom.firebaseStorageDownloadTokens||'',1500).split(',').map(x=>x.trim()).filter(Boolean);
    ev.storage={
      ...ev.storage,
      size:Number(metadata?.size||0),
      contentType:clean(metadata?.contentType,200),
      metadataTokenCount:metadataTokens.length,
      persistedTokenMatchesMetadata:metadataTokens.includes(persistedToken),
      generation:clean(metadata?.generation,200),
      objectSha256:crypto.createHash('sha256').update(bytes).digest('hex'),
      magic:magic(bytes)
    };
    const token=metadataTokens[0]||'';
    if(token)canonicalUrl='https://firebasestorage.googleapis.com/v0/b/'+encodeURIComponent(bucketName)+'/o/'+encodeURIComponent(assetRef)+'?alt=media&token='+encodeURIComponent(token);
  }

  ev.canonicalUrl=urlEvidence(canonicalUrl);
  ev.persistedUrlProbe=await probe(logo);
  ev.canonicalUrlProbe=await probe(canonicalUrl);

  if(!exists)ev.findings.push('OBJECT_MISSING');
  if(exists&&ev.storage.magic?.valid!==true)ev.findings.push('OBJECT_BYTES_NOT_SUPPORTED_IMAGE');
  if(exists&&ev.storage.persistedTokenMatchesMetadata!==true)ev.findings.push('PERSISTED_DOWNLOAD_TOKEN_MISMATCH');
  if(ev.persistedUrlProbe.ok!==true)ev.findings.push('PERSISTED_URL_HTTP_UNREADABLE');
  if(canonicalUrl&&ev.canonicalUrlProbe.ok!==true)ev.findings.push('CANONICAL_METADATA_TOKEN_URL_HTTP_UNREADABLE');
  if(ev.persistedUrlProbe.ok===true&&ev.persistedUrlProbe.magic?.valid!==true)ev.findings.push('PERSISTED_URL_RESPONSE_NOT_IMAGE');
  if(!ev.findings.length)ev.findings.push('BACKEND_OBJECT_AND_URL_HEALTHY_BROWSER_RENDERING_LAYER_REQUIRES_DIAGNOSIS');

  ev.status='PASS_READONLY_DIAGNOSTIC';
}catch(error){
  ev.status='FAIL_READONLY_DIAGNOSTIC';
  ev.errors.push(clean(error?.stack||error,5000));
  throw error;
}finally{
  try{if(app)await deleteApp(app);}catch{}
  fs.writeFileSync(OUT,JSON.stringify(ev,null,2)+'\n');
  console.log('B2_R102_LOGO_READONLY='+ev.status);
  console.log('B2_R102_FINDINGS='+JSON.stringify(ev.findings));
}
