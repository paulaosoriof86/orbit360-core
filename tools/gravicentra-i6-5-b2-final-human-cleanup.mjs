import fs from 'node:fs';
import path from 'node:path';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const PROJECT='ays-orbit-360-lab';
const TENANT=String(process.env.TENANT_HINT||'alianzas-soluciones').trim();
const LOCK_PATH=process.env.B2_LOCK||'artifacts/orbit360-recovery/release-control/I6_5_FORENSIC_B2_EXECUTION_LOCK_20260920.json';
const OUT=process.env.B2_FINAL_HUMAN_CLEANUP_OUT||path.join(process.env.RUNNER_TEMP||process.cwd(),'b2-final-human-cleanup.json');
const clean=(v,m=1000)=>String(v==null?'':v).trim().slice(0,m);
const uniq=a=>[...new Set([].concat(a||[]).map(x=>clean(x,300)).filter(Boolean))];
const need=(v,c)=>{if(!v)throw new Error(c);};

function serviceAccount(){
  for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){
    try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.private_key)return x;}catch{}
  }
  throw new Error('B2_FINAL_CLEANUP_SERVICE_ACCOUNT_REQUIRED');
}
const sa=serviceAccount();
const sm=new SecretManagerServiceClient({projectId:PROJECT,credentials:{client_email:sa.client_email,private_key:sa.private_key}});
async function secret(name){
  const [v]=await sm.accessSecretVersion({name:'projects/'+PROJECT+'/secrets/'+name+'/versions/latest'});
  return v?.payload?.data?Buffer.from(v.payload.data).toString('utf8'):'';
}
async function driveToken(){
  const vault=JSON.parse(await secret('orbit360-drive-oauth-preview-'+TENANT));
  need(vault?.tenantId===TENANT&&vault?.refreshToken,'B2_FINAL_CLEANUP_DRIVE_VAULT_INVALID');
  const client=JSON.parse(await secret('ORBIT360_DRIVE_OAUTH_CLIENT_PREVIEW'));
  need(client?.clientId&&client?.clientSecret,'B2_FINAL_CLEANUP_DRIVE_CLIENT_INVALID');
  const form=new URLSearchParams({client_id:client.clientId,client_secret:client.clientSecret,refresh_token:vault.refreshToken,grant_type:'refresh_token'});
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form});
  const b=await r.json().catch(()=>({}));
  need(r.ok&&b.access_token,'B2_FINAL_CLEANUP_DRIVE_TOKEN_FAILED:'+clean(b.error||b.error_description||r.status,300));
  return b.access_token;
}
async function driveMeta(id,t){
  const r=await fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'?fields=id,name,trashed&supportsAllDrives=true',{headers:{Authorization:'Bearer '+t}});
  if(r.status===404)return null;
  const b=await r.json().catch(()=>({}));
  need(r.ok,'B2_FINAL_CLEANUP_DRIVE_META_FAILED:'+id+':'+clean(b?.error?.message||r.status,300));
  return b;
}
async function trashDrive(id,t){
  const before=await driveMeta(id,t);
  if(!before)return{status:'ABSENT',id};
  if(before.trashed===true)return{status:'ALREADY_TRASHED',id,name:clean(before.name,180)};
  const r=await fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'?supportsAllDrives=true&fields=id,name,trashed',{method:'PATCH',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({trashed:true})});
  const b=await r.json().catch(()=>({}));
  need(r.ok&&b.trashed===true,'B2_FINAL_CLEANUP_DRIVE_TRASH_FAILED:'+id);
  return{status:'TRASHED',id,name:clean(b.name||before.name,180)};
}
function refsFrom(row){
  const out=[];
  for(const key of ['documentos','adjuntos','attachments','files']){
    for(const item of (Array.isArray(row?.[key])?row[key]:[])){
      if(typeof item==='string')out.push(item);
      else if(item&&typeof item==='object')out.push(item.documentRef||item.fileId||item.archivoRef||'');
    }
  }
  out.push(row?.documentRef||row?.fileId||row?.archivoRef||'');
  return uniq(out);
}
function foldersFrom(row){return uniq([row?.driveFolderId,row?.folderId,row?.carpetaDriveId]);}
function bucketFromUrl(url){
  const m=clean(url,5000).match(/\/v0\/b\/([^/]+)\/o\//i);
  if(!m)return '';
  try{return decodeURIComponent(m[1]);}catch{return m[1]||'';}
}

const lock=JSON.parse(fs.readFileSync(LOCK_PATH,'utf8'));
need(lock.status==='B2_HUMAN_PASS_CLEANUP_PENDING','B2_FINAL_CLEANUP_LOCK_STATE:'+clean(lock.status,120));
need(lock.r102HumanRetestPass===true,'B2_FINAL_CLEANUP_R102_HUMAN_PASS_REQUIRED');
need(lock.preview?.exactReadback===true&&lock.preview?.functionalPass===true&&lock.preview?.livePromoted===false,'B2_FINAL_CLEANUP_PREVIEW_INVALID');

let app;
const evidence={
  schema:'GRAVICENTRA_I6_5_B2_FINAL_HUMAN_FIXTURE_CLEANUP_V1',
  status:'RUNNING',tenantId:TENANT,preview:lock.preview,
  firestore:{targets:[],deleted:[],residual:[]},
  drive:{targets:[],results:[]},
  storage:{targets:[],deleted:[],residual:[]},
  previewConfig:{deleted:[],residual:[]},
  errors:[],
  boundaries:{qaOnly:true,productionHosting:false,b3AdvanceOnlyAfterPass:true,reimport:false,realBusinessMutation:false}
};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
try{
  app=initializeApp({credential:cert(sa),projectId:PROJECT},'b2-final-human-cleanup-'+Date.now());
  const db=getFirestore(app),storage=getStorage(app);
  const dataCol=name=>db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items');

  const markerSpecs=[
    {collection:'clientes',type:'B2_R15_DRIVE_HUMAN',id:/^b2-drive-human-/i},
    {collection:'asesores',type:'B2_FINAL_HUMAN_USER',id:/^b2-user-/i},
    {collection:'aseguradoras',type:'B2_FINAL_HUMAN_INSURER',id:/^b2-asg-/i}
  ];
  const marked=[];
  for(const spec of markerSpecs){
    const q=await dataCol(spec.collection).where('qaFixtureType','==',spec.type).get();
    for(const d of q.docs){
      const row=d.data()||{};
      need(row.qaFixture===true&&spec.id.test(d.id),'B2_FINAL_CLEANUP_MARKER_MISMATCH:'+spec.collection+':'+d.id);
      marked.push({collection:spec.collection,id:d.id,type:spec.type,row});
    }
  }
  const clientIds=marked.filter(x=>x.collection==='clientes').map(x=>x.id);
  const insurerRows=marked.filter(x=>x.collection==='aseguradoras');
  const linkedCollections=['gestiones','actividades','polizas','vehiculos','recibosEsperados','carteraPrimas','cobros'];
  const linked=[];
  for(const clientId of clientIds){
    for(const collection of linkedCollections){
      const q=await dataCol(collection).where('clienteId','==',clientId).get();
      for(const d of q.docs)linked.push({collection,id:d.id,clientId,row:d.data()||{}});
    }
  }

  const driveRefs=[],driveFolders=[];
  for(const x of [...marked,...linked]){
    refsFrom(x.row).forEach(v=>driveRefs.push(v));
    foldersFrom(x.row).forEach(v=>driveFolders.push(v));
  }
  evidence.drive.targets={refs:uniq(driveRefs),folders:uniq(driveFolders)};
  if(evidence.drive.targets.refs.length||evidence.drive.targets.folders.length){
    const t=await driveToken();
    for(const id of evidence.drive.targets.refs)evidence.drive.results.push({kind:'file',...(await trashDrive(id,t))});
    for(const id of evidence.drive.targets.folders)evidence.drive.results.push({kind:'folder',...(await trashDrive(id,t))});
    for(const item of evidence.drive.results){
      const m=await driveMeta(item.id,t);
      need(!m||m.trashed===true,'B2_FINAL_CLEANUP_DRIVE_READBACK_FAILED:'+item.id);
    }
  }

  for(const x of insurerRows){
    const prefix='preview/tenants/'+TENANT+'/assets/insurers/'+x.id+'/';
    need(!x.row.logoAssetRef||clean(x.row.logoAssetRef,1200).startsWith(prefix),'B2_FINAL_CLEANUP_ASSET_REF_OUTSIDE_PREVIEW:'+x.id);
    const buckets=uniq([
      bucketFromUrl(x.row.logo),
      process.env.ORBIT360_STORAGE_BUCKET||'',
      PROJECT+'.firebasestorage.app',
      PROJECT+'.appspot.com'
    ]);
    evidence.storage.targets.push({insurerId:x.id,prefix,buckets});
    for(const bucketName of buckets){
      try{
        const bucket=storage.bucket(bucketName);
        const [files]=await bucket.getFiles({prefix});
        for(const file of files){
          await file.delete({ignoreNotFound:true});
          evidence.storage.deleted.push({bucket:bucketName,name:file.name});
        }
      }catch(error){
        evidence.storage.deleted.push({bucket:bucketName,prefix,status:'BUCKET_UNAVAILABLE',code:clean(error?.code||error?.message,180)});
      }
    }
  }

  const deletes=[...linked.map(x=>({collection:x.collection,id:x.id,reason:'LINKED_TO_B2_DRIVE_CLIENT'})),...marked.map(x=>({collection:x.collection,id:x.id,reason:x.type}))];
  const seen=new Set();
  for(const target of deletes){
    const key=target.collection+'|'+target.id;
    if(seen.has(key))continue;seen.add(key);
    const ref=dataCol(target.collection).doc(target.id),snap=await ref.get();
    if(!snap.exists){evidence.firestore.deleted.push({...target,status:'ABSENT'});continue;}
    const row=snap.data()||{};
    if(target.reason==='LINKED_TO_B2_DRIVE_CLIENT'){
      need(clientIds.includes(clean(row.clienteId,220)),'B2_FINAL_CLEANUP_LINKED_ROW_SCOPE_MISMATCH:'+key);
    }else{
      need(row.qaFixture===true,'B2_FINAL_CLEANUP_QA_FLAG_REQUIRED:'+key);
    }
    await ref.delete();
    const after=await ref.get();
    need(!after.exists,'B2_FINAL_CLEANUP_FIRESTORE_DELETE_FAILED:'+key);
    evidence.firestore.deleted.push({...target,status:'DELETED'});
  }
  evidence.firestore.targets=deletes;

  const previewAccess=db.collection('tenants').doc(TENANT).collection('previewUatConfig').doc('access');
  if((await previewAccess.get()).exists){await previewAccess.delete();evidence.previewConfig.deleted.push('previewUatConfig/access');}
  const evSnap=await db.collection('tenants').doc(TENANT).collection('previewUatConfigEvents').get();
  for(const d of evSnap.docs){await d.ref.delete();evidence.previewConfig.deleted.push('previewUatConfigEvents/'+d.id);}

  for(const spec of markerSpecs){
    const q=await dataCol(spec.collection).where('qaFixtureType','==',spec.type).get();
    for(const d of q.docs)evidence.firestore.residual.push({collection:spec.collection,id:d.id,qaFixtureType:spec.type});
  }
  for(const clientId of clientIds){
    for(const collection of linkedCollections){
      const q=await dataCol(collection).where('clienteId','==',clientId).get();
      for(const d of q.docs)evidence.firestore.residual.push({collection,id:d.id,clientId});
    }
  }
  need(evidence.firestore.residual.length===0,'B2_FINAL_CLEANUP_FIRESTORE_RESIDUAL:'+JSON.stringify(evidence.firestore.residual));

  for(const x of insurerRows){
    const prefix='preview/tenants/'+TENANT+'/assets/insurers/'+x.id+'/';
    const buckets=uniq([bucketFromUrl(x.row.logo),process.env.ORBIT360_STORAGE_BUCKET||'',PROJECT+'.firebasestorage.app',PROJECT+'.appspot.com']);
    for(const bucketName of buckets){
      try{
        const [files]=await storage.bucket(bucketName).getFiles({prefix});
        for(const file of files)evidence.storage.residual.push({bucket:bucketName,name:file.name});
      }catch{}
    }
  }
  need(evidence.storage.residual.length===0,'B2_FINAL_CLEANUP_STORAGE_RESIDUAL:'+JSON.stringify(evidence.storage.residual));

  if((await previewAccess.get()).exists)evidence.previewConfig.residual.push('previewUatConfig/access');
  const evAfter=await db.collection('tenants').doc(TENANT).collection('previewUatConfigEvents').get();
  if(!evAfter.empty)evidence.previewConfig.residual.push(...evAfter.docs.map(d=>'previewUatConfigEvents/'+d.id));
  need(evidence.previewConfig.residual.length===0,'B2_FINAL_CLEANUP_PREVIEW_CONFIG_RESIDUAL');

  evidence.status='PASS';
}catch(error){
  evidence.status='FAIL';
  evidence.errors.push(clean(error?.stack||error,6000));
  throw error;
}finally{
  try{if(app)await deleteApp(app);}catch{}
  fs.writeFileSync(OUT,JSON.stringify(evidence,null,2)+'\n');
  console.log('B2_FINAL_HUMAN_CLEANUP='+evidence.status+' '+JSON.stringify({firestoreDeleted:evidence.firestore.deleted.length,driveResults:evidence.drive.results.length,storageDeleted:evidence.storage.deleted.length,firestoreResidual:evidence.firestore.residual.length,storageResidual:evidence.storage.residual.length,previewConfigResidual:evidence.previewConfig.residual.length}));
}
