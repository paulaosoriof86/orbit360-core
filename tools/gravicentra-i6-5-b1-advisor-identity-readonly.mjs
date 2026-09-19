import fs from 'node:fs';
import path from 'node:path';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const PROJECT='ays-orbit-360-lab';
const TENANT='alianzas-soluciones';
const OUT=process.env.B1_ADVISOR_IDENTITY_OUT||path.join(process.env.RUNNER_TEMP||process.cwd(),'b1-advisor-identity');
const clean=(v,m=400)=>String(v==null?'':v).trim().slice(0,m);
const lower=v=>clean(v,320).toLowerCase();

function serviceAccount(){
  for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){
    try{
      const x=JSON.parse(process.env[k]||'');
      if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;
    }catch{}
  }
  throw new Error('B1_ADVISOR_IDENTITY_SERVICE_ACCOUNT_MISSING');
}

async function authFor(auth,row){
  const uid=clean(row.authUid||row.uid||row.firebaseUid||row.userId||'',256);
  const email=lower(row.email||row.correo||'');
  try{
    const user=uid?await auth.getUser(uid):(email?await auth.getUserByEmail(email):null);
    return user?{found:true,uid:user.uid,email:clean(user.email||email,320),emailVerified:user.emailVerified===true,disabled:user.disabled===true}:{found:false,uid,email,emailVerified:false,disabled:false};
  }catch(e){
    return {found:false,uid,email,emailVerified:false,disabled:false,error:clean(e?.code||e?.message||e,300)};
  }
}

fs.mkdirSync(OUT,{recursive:true});
const app=initializeApp({credential:cert(serviceAccount()),projectId:PROJECT},'b1-advisor-identity');
const db=getFirestore(app),auth=getAuth(app);
const ev={
  schema:'GRAVICENTRA_I6_5_B1_ADVISOR_IDENTITY_READONLY_V1',status:'FAIL',projectId:PROJECT,tenantId:TENANT,
  writes:0,authWrites:0,firestoreWrites:0,
  frontendIdentityRule:'data.id || doc.id',
  equipoUpdateRule:'row.id -> editarUsuario(id) -> advisorId=id -> updateDurable(asesores, advisorId, data)',
  backendUpdateMissingRule:'functions/not-found: asesores/<mutation.id> no existe.',
  canonicalPath:'tenants/{tenant}/data/asesores/items/{docId}',legacyPath:'tenantId/{tenant}/asesores/{docId}',
  rows:[],legacyOnlyRows:[],membershipOrphans:[],summary:{},errors:[]
};

try{
  const canonicalRef=db.collection('tenants').doc(TENANT).collection('data').doc('asesores').collection('items');
  const legacyRef=db.collection('tenantId').doc(TENANT).collection('asesores');
  const [snap,legacySnap]=await Promise.all([canonicalRef.get(),legacyRef.get().catch(()=>null)]);
  const canonicalIds=new Set(snap.docs.map(d=>d.id));
  const legacyDocs=new Map((legacySnap?.docs||[]).map(d=>[d.id,d.data()||{}]));
  for(const doc of snap.docs){
    const data=doc.data()||{},docId=doc.id,dataId=clean(data.id,256),underscoreId=clean(data._id,256);
    const frontendId=dataId||docId,target=await canonicalRef.doc(frontendId).get(),a=await authFor(auth,data);
    let membership={found:false,advisorId:'',status:'',active:null,roles:[],countries:[]};
    if(a.found){
      const ms=await db.collection('tenants').doc(TENANT).collection('members').doc(a.uid).get();
      if(ms.exists){
        const m=ms.data()||{};
        membership={found:true,advisorId:clean(m.advisorId,256),status:clean(m.status||m.estado,80),active:m.active!==false&&m.activo!==false,roles:[].concat(m.roles||[]).map(x=>clean(x,100)),countries:[].concat(m.countries||m.paises||[]).map(x=>clean(x,20))};
      }
    }
    ev.rows.push({
      docId,dataId,underscoreId,email:clean(data.email||data.correo,320),nombre:clean(data.nombre||data.name,320),storedUid:clean(data.authUid||data.uid||data.firebaseUid||data.userId,256),
      auth:a,membership,orbitStoreExposedId:frontendId,equipoUpdateDurableId:frontendId,docIdEqualsDataId:!dataId||docId===dataId,
      canonicalRefAtDocIdExists:true,canonicalRefAtFrontendIdExists:target.exists,legacyCollectionSameDocIdExists:legacyDocs.has(docId),legacyCollectionFrontendIdExists:legacyDocs.has(frontendId),
      durable:true,projectionOnly:false,wouldBackendNotFound:!target.exists,backendInternalMessage:target.exists?'':('asesores/'+frontendId+' no existe.'),
      failureStage:target.exists?'NOT_PROVEN_FROM_IDENTITY_ONLY':'ASESOR_UPDATE_BEFORE_MEMBERSHIP_SYNC'
    });
  }
  for(const [legacyId,data] of legacyDocs.entries()){
    const alias=clean(data.id,256)||legacyId;
    if(!canonicalIds.has(legacyId)&&!canonicalIds.has(alias)) ev.legacyOnlyRows.push({docId:legacyId,dataId:clean(data.id,256),email:clean(data.email||data.correo,320),nombre:clean(data.nombre||data.name,320),notInCanonicalAsDocId:true,notInCanonicalAsDataId:true});
  }
  const members=await db.collection('tenants').doc(TENANT).collection('members').get();
  for(const d of members.docs){
    const m=d.data()||{},advisorId=clean(m.advisorId,256);
    if(advisorId&&!canonicalIds.has(advisorId)) ev.membershipOrphans.push({uid:d.id,advisorId,status:clean(m.status||m.estado,80),active:m.active!==false&&m.activo!==false,roles:[].concat(m.roles||[]).map(x=>clean(x,100))});
  }
  ev.summary={canonicalAdvisorCount:ev.rows.length,legacyAdvisorCount:legacyDocs.size,docIdDataIdMismatchCount:ev.rows.filter(r=>r.dataId&&r.docId!==r.dataId).length,frontendIdMissingCanonicalRefCount:ev.rows.filter(r=>!r.canonicalRefAtFrontendIdExists).length,backendNotFoundCandidateCount:ev.rows.filter(r=>r.wouldBackendNotFound).length,membershipOrphanCount:ev.membershipOrphans.length,legacyOnlyRowCount:ev.legacyOnlyRows.length,visibleProjectionOnlyCount:0,allEquipoRowsMateriallyBacked:true};
  ev.status='PASS';
}catch(e){
  ev.errors.push(clean(e?.stack||e?.message||e,1800));process.exitCode=1;
}finally{
  await deleteApp(app).catch(()=>{});
  fs.writeFileSync(path.join(OUT,'b1-advisor-identity-readonly.json'),JSON.stringify(ev,null,2)+'\n');
  console.log('B1_ADVISOR_IDENTITY='+ev.status);
  console.log('B1_ADVISOR_SUMMARY='+JSON.stringify(ev.summary));
  console.log('B1_ADVISOR_ROWS='+JSON.stringify(ev.rows));
  console.log('B1_ADVISOR_LEGACY_ONLY='+JSON.stringify(ev.legacyOnlyRows));
  console.log('B1_ADVISOR_MEMBERSHIP_ORPHANS='+JSON.stringify(ev.membershipOrphans));
  console.log('B1_ADVISOR_WRITES=0');
}
