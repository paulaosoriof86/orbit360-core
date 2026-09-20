import fs from 'node:fs';
import path from 'node:path';
import {initializeApp,cert,deleteApp} from 'firebase-admin/app';
import {getFirestore,FieldValue} from 'firebase-admin/firestore';
import {getAuth} from 'firebase-admin/auth';

const tenant=String(process.env.TENANT_HINT||'').trim();
const project=String(process.env.PROJECT_ID||'').trim();
const lockPath=process.env.B1_LOCK||'artifacts/orbit360-recovery/release-control/I6_5_FORENSIC_B1_EXECUTION_LOCK_20260919.json';
const out=process.argv[2];
if(!tenant||!project||!out) throw new Error('B1_NORMALIZE_ARGS');
const lock=JSON.parse(fs.readFileSync(lockPath,'utf8'));
const scope=lock.boundaries&&lock.boundaries.advisorCanonicalNormalization||{};
const allowedFields=['authUid','accessProvisioned','authEmailVerified','authDisabled','membershipStatus','onboardingState','invitacionEstado','lastAccessSyncAt'];
if(scope.authorized!==true||scope.updatesExisting!==true||scope.deletes!==true||Number(scope.maxUpdates)!==10||Number(scope.maxDeletes)!==5||scope.legacyWrites!==false||scope.authWrites!==false||scope.membershipWrites!==false||scope.reimport!==false||JSON.stringify(scope.allowedUpdateFields||[])!==JSON.stringify(allowedFields)||String(scope.syntheticDeletePattern||'')!=='^ase-b1-r[34]-synthetic-[0-9]+$')throw new Error('B1_NORMALIZE_NOT_AUTHORIZED');

const sa=JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));
const app=initializeApp({credential:cert(sa),projectId:project},'b1-advisor-normalize-r5');
const db=getFirestore(app),auth=getAuth(app);
const clean=(v,m=500)=>String(v==null?'':v).trim().slice(0,m);
const norm=v=>clean(v,80).toLowerCase();
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const receipt={schema:'GRAVICENTRA_B1_ADVISOR_ACCESS_RECONCILIATION_V2',tenantId:tenant,status:'FAIL',updates:[],deletes:[],noops:[],skipped:[],writes:0,legacyWrites:0,authWrites:0,membershipWrites:0};

try{
  const canonical=db.collection('tenants').doc(tenant).collection('data').doc('asesores').collection('items');
  const membersSnap=await db.collection('tenants').doc(tenant).collection('members').get(),activeMembers=[];
  for(const md of membersSnap.docs){
    const m=md.data()||{},st=norm(m.status||m.estado||'active'),advisorId=clean(m.advisorId,160);
    if(!advisorId||m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(st))continue;
    activeMembers.push({uid:md.id,advisorId,status:st||'active'});
  }
  const memberAdvisorIds=new Set(activeMembers.map(x=>x.advisorId));
  for(const row of activeMembers){
    const ref=canonical.doc(row.advisorId),snap=await ref.get();
    if(!snap.exists){receipt.skipped.push({advisorId:row.advisorId,reason:'CANONICAL_MISSING_NO_CREATE_R5'});continue;}
    let user=null;try{user=await auth.getUser(row.uid);}catch{}
    if(!user){receipt.skipped.push({advisorId:row.advisorId,reason:'AUTH_NOT_FOUND'});continue;}
    const verified=user.emailVerified===true,disabled=user.disabled===true;
    const patch={authUid:user.uid,accessProvisioned:!disabled,authEmailVerified:verified,authDisabled:disabled,membershipStatus:disabled?'blocked':'active',onboardingState:disabled?'blocked':(verified?'active':'invited'),invitacionEstado:disabled?'bloqueada':(verified?'no_requerida':'pendiente_verificacion')};
    const before=snap.data()||{},differs=allowedFields.filter(x=>x!=='lastAccessSyncAt').some(k=>!same(before[k],patch[k]));
    if(!differs){receipt.noops.push(row.advisorId);continue;}
    if(receipt.updates.length>=scope.maxUpdates)throw new Error('B1_NORMALIZE_MAX_UPDATES_EXCEEDED');
    patch.lastAccessSyncAt=FieldValue.serverTimestamp();await ref.set(patch,{merge:true});receipt.updates.push({advisorId:row.advisorId,verified,disabled});receipt.writes++;
  }
  const all=await canonical.get(),pattern=new RegExp(scope.syntheticDeletePattern);
  for(const doc of all.docs){
    if(!pattern.test(doc.id))continue;
    const data=doc.data()||{};if(memberAdvisorIds.has(doc.id)){receipt.skipped.push({advisorId:doc.id,reason:'SYNTHETIC_HAS_MEMBERSHIP'});continue;}
    let authFound=false;const uid=clean(data.authUid||data.uid||data.userId,180),email=clean(data.email||data.correo,320).toLowerCase();
    if(uid){try{await auth.getUser(uid);authFound=true;}catch{}}
    if(!authFound&&email){try{await auth.getUserByEmail(email);authFound=true;}catch{}}
    if(authFound){receipt.skipped.push({advisorId:doc.id,reason:'SYNTHETIC_HAS_AUTH'});continue;}
    if(receipt.deletes.length>=scope.maxDeletes)throw new Error('B1_NORMALIZE_MAX_DELETES_EXCEEDED');
    await doc.ref.delete();receipt.deletes.push(doc.id);receipt.writes++;
  }
  receipt.status='PASS';
} finally {
  await deleteApp(app).catch(()=>{});
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,JSON.stringify(receipt,null,2)+'\n');
  console.log('B1_ADVISOR_NORMALIZATION='+receipt.status);
  console.log('B1_ADVISOR_NORMALIZATION_WRITES='+receipt.writes);
  console.log('B1_ADVISOR_ACCESS_UPDATES='+receipt.updates.length);
  console.log('B1_ADVISOR_SYNTHETIC_DELETES='+receipt.deletes.length);
}
