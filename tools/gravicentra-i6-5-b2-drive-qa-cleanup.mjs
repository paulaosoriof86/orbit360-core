import fs from 'node:fs';
import path from 'node:path';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const PROJECT='ays-orbit-360-lab';
const TENANT=String(process.env.TENANT_HINT||'alianzas-soluciones').trim();
const LOCK_PATH=process.env.B2_LOCK||'artifacts/orbit360-recovery/release-control/I6_5_FORENSIC_B2_EXECUTION_LOCK_20260920.json';
const OUT=process.env.B2_DRIVE_CLEANUP_OUT||path.join(process.env.RUNNER_TEMP||process.cwd(),'b2-drive-qa-cleanup.json');
const clean=(v,m=1000)=>String(v==null?'':v).trim().slice(0,m);
const uniq=a=>[...new Set([].concat(a||[]).map(x=>clean(x,220)).filter(Boolean))];
const need=(v,c)=>{if(!v)throw new Error(c);};
function serviceAccount(){
  for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){
    try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.private_key)return x;}catch{}
  }
  if(process.env.GOOGLE_APPLICATION_CREDENTIALS){
    const x=JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));
    if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.private_key)return x;
  }
  throw new Error('B2_DRIVE_CLEANUP_SERVICE_ACCOUNT_REQUIRED');
}
const sa=serviceAccount();
const sm=new SecretManagerServiceClient({projectId:PROJECT,credentials:{client_email:sa.client_email,private_key:sa.private_key}});
async function secret(name){
  const [v]=await sm.accessSecretVersion({name:'projects/'+PROJECT+'/secrets/'+name+'/versions/latest'});
  const raw=v?.payload?.data?Buffer.from(v.payload.data).toString('utf8'):'';
  need(raw,'B2_DRIVE_CLEANUP_SECRET_EMPTY:'+name);
  return raw;
}
async function token(){
  const vault=JSON.parse(await secret('orbit360-drive-oauth-preview-'+TENANT));
  need(vault?.tenantId===TENANT&&vault?.refreshToken,'B2_DRIVE_CLEANUP_VAULT_INVALID');
  const client=JSON.parse(await secret('ORBIT360_DRIVE_OAUTH_CLIENT_PREVIEW'));
  need(client?.clientId&&client?.clientSecret,'B2_DRIVE_CLEANUP_OAUTH_CLIENT_INVALID');
  const form=new URLSearchParams({client_id:client.clientId,client_secret:client.clientSecret,refresh_token:vault.refreshToken,grant_type:'refresh_token'});
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form});
  const b=await r.json().catch(()=>({}));
  need(r.ok&&b.access_token,'B2_DRIVE_CLEANUP_TOKEN_FAILED:'+clean(b.error||b.error_description||r.status,300));
  return b.access_token;
}
async function meta(id,t){
  const r=await fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'?fields=id,name,mimeType,parents,trashed&supportsAllDrives=true',{headers:{Authorization:'Bearer '+t}});
  if(r.status===404)return null;
  const b=await r.json().catch(()=>({}));
  need(r.ok,'B2_DRIVE_CLEANUP_META_FAILED:'+id+':'+clean(b?.error?.message||r.status,300));
  return b;
}
async function trash(id,t){
  const before=await meta(id,t);
  if(!before)return{status:'ABSENT',id};
  if(before.trashed===true)return{status:'ALREADY_TRASHED',id,name:clean(before.name,180)};
  const r=await fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'?supportsAllDrives=true&fields=id,name,trashed',{method:'PATCH',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({trashed:true})});
  const b=await r.json().catch(()=>({}));
  need(r.ok&&b.trashed===true,'B2_DRIVE_CLEANUP_TRASH_FAILED:'+id+':'+clean(b?.error?.message||r.status,300));
  return{status:'TRASHED',id,name:clean(b.name||before.name,180)};
}
function allowedQaId(id){return /^(b2-|qa-)/i.test(clean(id,220));}
function refsFrom(row){
  const out=[];
  for(const key of ['documentos','adjuntos','attachments','files']){
    for(const item of (Array.isArray(row?.[key])?row[key]:[])){
      if(typeof item==='string')out.push(item);
      else if(item&&typeof item==='object')out.push(item.documentRef||item.fileId||item.archivoRef||'');
    }
  }
  if(row&&typeof row==='object')out.push(row.documentRef||row.fileId||row.archivoRef||'');
  return uniq(out);
}
const lock=JSON.parse(fs.readFileSync(LOCK_PATH,'utf8'));
need(lock.status==='PREVIEW_AUTHENTICATED_PASS_PENDING_PAULA_VISUAL','B2_DRIVE_CLEANUP_LOCK_STATE');
need(Array.isArray(lock.nextRequiredProof)&&lock.nextRequiredProof[0]==='DRIVE_QA_FIXTURE_CLEANUP','B2_DRIVE_CLEANUP_CURSOR');
need(lock.r77r81DriveDurableProof?.status==='PASS_CLEANUP_PENDING','B2_DRIVE_CLEANUP_R7781_NOT_READY');
need(lock.r91r95RuntimeProof?.status==='PASS_CLEANUP_PENDING_FINAL_PAULA_VISUAL','B2_DRIVE_CLEANUP_R9195_NOT_READY');
need(/^PASS/.test(clean(lock.r82CrossModuleDeleteProof?.status,80)),'B2_DRIVE_CLEANUP_R82_NOT_PASS');

let app;
const evidence={schema:'GRAVICENTRA_I6_5_B2_DRIVE_QA_CLEANUP_V1',status:'RUNNING',tenantId:TENANT,preview:lock.preview,drive:{targets:[],results:[]},firestore:{targets:[],deleted:[],residual:[]},errors:[],boundaries:{qaOnly:true,productionHosting:false,b3:false,reimport:false,realBusinessMutation:false}};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
try{
  app=initializeApp({credential:cert(sa),projectId:PROJECT},'b2-drive-cleanup-'+Date.now());
  const db=getFirestore(app),t=await token();
  const dataCol=name=>db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items');

  const explicitRows=[];
  const addRow=(collection,id,allowExplicitNonPrefix=false)=>{id=clean(id,220);if(!id)return;if(allowedQaId(id)||allowExplicitNonPrefix===true)explicitRows.push({collection,id,allowExplicitNonPrefix:allowExplicitNonPrefix===true});};
  const r77=lock.r77r81DriveDurableProof.cleanup?.targets||{};
  addRow('clientes',r77.clientId);addRow('gestiones',r77.managementId);
  for(const x of r77.preExisting||[])addRow(clean(x.collection,100),x.id);
  const r91=lock.r91r95RuntimeProof.cleanup?.targets||[];
  const map={client:'clientes',legacy:'clientes',protected:'clientes',insurer:'aseguradoras',insurerUnvalidated:'aseguradoras',source:'polizas',sourceUnvalidated:'polizas',direct:'gestiones',issuance:'gestiones',unvalidated:'gestiones',policy:'polizas',management:'gestiones'};
  for(const x of r91){if(map[x.kind])addRow(map[x.kind],x.id,x.kind==='policy'||x.kind==='management');}

  const rowMap=new Map();
  for(const x of explicitRows){const k=x.collection+'|'+x.id;const prior=rowMap.get(k)||{collection:x.collection,id:x.id,allowExplicitNonPrefix:false};prior.allowExplicitNonPrefix=prior.allowExplicitNonPrefix||x.allowExplicitNonPrefix===true;rowMap.set(k,prior);}
  const rows=[...rowMap.values()];
  evidence.firestore.targets=rows;

  const driveRefs=[];
  const driveFolders=[];
  const addRef=x=>{x=clean(x,220);if(x)driveRefs.push(x);};
  const addFolder=x=>{x=clean(x,220);if(x)driveFolders.push(x);};
  addRef(r77.clientDocumentRef);addRef(r77.managementDocumentRef);addFolder(r77.clientFolderId);
  for(const x of r77.preExisting||[]){addFolder(x.driveFolderId);for(const ref of x.documentRefs||[])addRef(ref);}
  for(const x of r91){if(x.kind==='driveDocumentRef')addRef(x.id);}

  for(const rowRef of rows){
    const s=await dataCol(rowRef.collection).doc(rowRef.id).get();
    if(!s.exists)continue;
    const row=s.data()||{};
    const qaMarker=row.qaFixture===true||/B2_|QA_/i.test(clean(row.qaFixtureType,180))||allowedQaId(rowRef.id);
    if(rowRef.allowExplicitNonPrefix===true)need(qaMarker,'B2_DRIVE_CLEANUP_EXPLICIT_ROW_NOT_QA:'+rowRef.collection+':'+rowRef.id);
    else need(qaMarker,'B2_DRIVE_CLEANUP_NON_QA_ROW:'+rowRef.collection+':'+rowRef.id);
    refsFrom(row).forEach(addRef);
    addFolder(row.driveFolderId);
  }
  evidence.drive.targets={refs:uniq(driveRefs),folders:uniq(driveFolders)};

  for(const id of uniq(driveRefs))evidence.drive.results.push({kind:'file',...(await trash(id,t))});
  for(const id of uniq(driveFolders))evidence.drive.results.push({kind:'folder',...(await trash(id,t))});

  for(const rowRef of rows){
    const ref=dataCol(rowRef.collection).doc(rowRef.id),s=await ref.get();
    if(!s.exists){evidence.firestore.deleted.push({...rowRef,status:'ABSENT'});continue;}
    const row=s.data()||{};
    const qaMarker=row.qaFixture===true||/B2_|QA_/i.test(clean(row.qaFixtureType,180))||allowedQaId(rowRef.id);
    if(rowRef.allowExplicitNonPrefix===true)need(qaMarker,'B2_DRIVE_CLEANUP_EXPLICIT_DELETE_NOT_QA:'+rowRef.collection+':'+rowRef.id);
    else need(qaMarker,'B2_DRIVE_CLEANUP_NON_QA_DELETE_BLOCK:'+rowRef.collection+':'+rowRef.id);
    await ref.delete();
    const after=await ref.get();
    need(!after.exists,'B2_DRIVE_CLEANUP_FIRESTORE_DELETE_FAILED:'+rowRef.collection+':'+rowRef.id);
    evidence.firestore.deleted.push({...rowRef,status:'DELETED'});
  }

  for(const c of ['clientes','gestiones','polizas','aseguradoras']){
    for(const field of ['qaFixtureType']){
      const q=await dataCol(c).where(field,'in',['B2_R77_R81_DRIVE_DURABLE','B2_R91_R95_RUNTIME']).get().catch(()=>null);
      if(q)for(const d of q.docs)evidence.firestore.residual.push({collection:c,id:d.id,qaFixtureType:clean(d.data()?.qaFixtureType,180)});
    }
  }
  need(evidence.firestore.residual.length===0,'B2_DRIVE_CLEANUP_FIRESTORE_RESIDUAL:'+JSON.stringify(evidence.firestore.residual));

  for(const item of evidence.drive.results){
    const m=await meta(item.id,t);
    need(!m||m.trashed===true,'B2_DRIVE_CLEANUP_READBACK_NOT_TRASHED:'+item.id);
  }
  evidence.status='PASS';
}catch(error){evidence.status='FAIL';evidence.errors.push(clean(error?.stack||error,6000));throw error;
}finally{
  try{if(app)await deleteApp(app);}catch{}
  fs.writeFileSync(OUT,JSON.stringify(evidence,null,2)+'\n');
  console.log('B2_DRIVE_QA_CLEANUP='+evidence.status+' '+JSON.stringify({driveResults:evidence.drive.results.length,firestoreDeleted:evidence.firestore.deleted.length,residual:evidence.firestore.residual.length,errors:evidence.errors}));
}
