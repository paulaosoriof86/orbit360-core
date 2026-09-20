import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab';
const TENANT='alianzas-soluciones';
const OUT=process.env.B1_R7_AUTH_OUT||path.join(process.env.RUNNER_TEMP||process.cwd(),'b1-r7-auth');
const TARGETS=new Set([
  'carlos.castro@aysseguros.com',
  'samuel.daza@aysseguros.com',
  'fernando.arias@aysseguros.com'
]);
const text=(v,m=600)=>String(v==null?'':v).trim().slice(0,m);
const sha=v=>crypto.createHash('sha256').update(String(v==null?'':v)).digest('hex');
function sa(){
  for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){
    try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}
  }
  throw new Error('B1_R7_SERVICE_ACCOUNT_MISSING');
}
function ts(v){
  try{if(v&&typeof v.toDate==='function')return v.toDate().toISOString();}catch{}
  return v instanceof Date?v.toISOString():text(v,120);
}
function memberView(x){
  x=x||{};
  return {
    tenantId:text(x.tenantId),advisorId:text(x.advisorId),status:text(x.status||x.estado),
    active:x.active,activo:x.activo,roles:x.roles||x.rolesAsignados||x.assignedRoles||[],
    activeRole:text(x.activeRole||x.rolDefault||x.defaultRole||x.rol),
    countries:x.countries||x.paises||[],mustChangePassword:x.mustChangePassword===true,
    credentialState:text(x.credentialState),passwordResetAt:ts(x.passwordResetAt),
    passwordChangedAt:ts(x.passwordChangedAt),updatedAt:ts(x.updatedAt)
  };
}
function advisorView(x,id){
  x=x||{};
  return {
    id,email:text(x.email).toLowerCase(),nombre:text(x.nombre),authUid:text(x.authUid||x.uid||x.userId),
    accessProvisioned:x.accessProvisioned===true,authEmailVerified:x.authEmailVerified,
    authDisabled:x.authDisabled,membershipStatus:text(x.membershipStatus),
    onboardingState:text(x.onboardingState),invitacionEstado:text(x.invitacionEstado||x.invitationState),
    credentialState:text(x.credentialState),mustChangePassword:x.mustChangePassword===true,
    lastAccessSyncAt:ts(x.lastAccessSyncAt),updatedAt:ts(x.updatedAt),
    roles:x.roles||x.rolesAsignados||x.assignedRoles||[],
    defaultRole:text(x.rolDefault||x.defaultRole||x.rol),countries:x.paises||x.countries||[]
  };
}
function userView(u){
  if(!u)return null;
  return {
    uidHash:sha(u.uid),email:text(u.email).toLowerCase(),emailVerified:u.emailVerified===true,disabled:u.disabled===true,
    displayName:text(u.displayName),providers:(u.providerData||[]).map(p=>text(p.providerId)),
    creationTime:text(u.metadata?.creationTime),lastSignInTime:text(u.metadata?.lastSignInTime),
    lastRefreshTime:text(u.metadata?.lastRefreshTime),tokensValidAfterTime:text(u.tokensValidAfterTime)
  };
}
fs.mkdirSync(OUT,{recursive:true});
const app=initializeApp({credential:cert(sa()),projectId:PROJECT},'b1-r7-auth');
const db=getFirestore(app),auth=getAuth(app);
const out={
  schema:'GRAVICENTRA_I6_5_B1_R7_AUTH_TEAM_READONLY_V1',
  status:'FAIL',writes:0,authWrites:0,firestoreWrites:0,targets:[],findings:[],errors:[]
};
try{
  const advisorsSnap=await db.collection('tenants').doc(TENANT).collection('data').doc('asesores').collection('items').get();
  const advisors=advisorsSnap.docs.map(d=>({id:d.id,data:d.data()||{}})).filter(r=>TARGETS.has(text(r.data.email).toLowerCase()));
  for(const row of advisors){
    const a=advisorView(row.data,row.id);
    let byEmail=null,byBound=null,emailErr='',boundErr='';
    try{byEmail=await auth.getUserByEmail(a.email);}catch(e){emailErr=text(e?.code||e?.message);}
    if(a.authUid){try{byBound=await auth.getUser(a.authUid);}catch(e){boundErr=text(e?.code||e?.message);}}
    const uid=byEmail?.uid||byBound?.uid||'';
    const memberByEmail=uid?await db.collection('tenants').doc(TENANT).collection('members').doc(uid).get():null;
    const memberByBound=a.authUid&&a.authUid!==uid?await db.collection('tenants').doc(TENANT).collection('members').doc(a.authUid).get():null;
    const ah=sha(a.id),uh=uid?sha(uid):'';
    let audits=[];
    try{
      const q=await db.collection('tenants').doc(TENANT).collection('auditEvents').where('advisorIdHash','==',ah).limit(30).get();
      audits=q.docs.map(d=>{const x=d.data()||{};return{
        action:text(x.action),createdAt:ts(x.createdAt),reason:text(x.reason,240),
        targetUidMatchesEmailUid:!!(uh&&text(x.targetUidHash)===uh),
        forcePasswordChange:x.forcePasswordChange===true,authChanged:x.authChanged,membershipChanged:x.membershipChanged
      }}).sort((x,y)=>String(y.createdAt).localeCompare(String(x.createdAt))).slice(0,20);
    }catch(e){audits=[{queryError:text(e?.code||e?.message)}];}
    let requests=[];
    try{
      const q=await db.collection('tenants').doc(TENANT).collection('onboardingRequests').where('advisorId','==',a.id).limit(20).get();
      requests=q.docs.map(d=>{const x=d.data()||{};return{
        operation:text(x.operation),state:text(x.state),invitationState:text(x.invitationState),
        createdAt:ts(x.createdAt),updatedAt:ts(x.updatedAt)
      }}).sort((x,y)=>String(y.updatedAt).localeCompare(String(x.updatedAt))).slice(0,12);
    }catch(e){requests=[{queryError:text(e?.code||e?.message)}];}
    const item={
      advisor:a,
      authByEmail:userView(byEmail),authByBoundUid:userView(byBound),
      authByEmailError:emailErr,authByBoundUidError:boundErr,
      uidBinding:{
        advisorBoundUidPresent:!!a.authUid,
        advisorBoundMatchesAuthByEmail:!!(a.authUid&&byEmail&&a.authUid===byEmail.uid),
        boundUidHash:a.authUid?sha(a.authUid):'',
        emailUidHash:byEmail?sha(byEmail.uid):''
      },
      membershipByEmailUid:memberByEmail?.exists?memberView(memberByEmail.data()):null,
      membershipByBoundUid:memberByBound?.exists?memberView(memberByBound.data()):null,
      audits,requests
    };
    if(byEmail?.emailVerified===true && a.authEmailVerified!==true){
      out.findings.push({advisorId:a.id,code:'AUTH_VERIFIED_PROJECTION_STALE'});
    }
    if(a.authUid&&byEmail&&a.authUid!==byEmail.uid){
      out.findings.push({advisorId:a.id,code:'ADVISOR_AUTH_UID_MISBOUND'});
    }
    if(memberByEmail?.exists && text(memberByEmail.data()?.advisorId)!==a.id){
      out.findings.push({advisorId:a.id,code:'MEMBERSHIP_ADVISOR_BINDING_MISMATCH'});
    }
    const reset=audits.find(x=>x.action==='team_access.set_temporary_password');
    if(reset) out.findings.push({advisorId:a.id,code:'TEMP_PASSWORD_SERVER_COMMIT_EVIDENCE',createdAt:reset.createdAt,targetUidMatchesEmailUid:reset.targetUidMatchesEmailUid});
    out.targets.push(item);
  }
  for(const email of TARGETS){
    if(!out.targets.some(x=>x.advisor.email===email)) out.findings.push({email,code:'CANONICAL_ADVISOR_NOT_FOUND'});
  }
  out.status='PASS';
}catch(e){
  out.errors.push(text(e?.stack||e?.message||e,3000));process.exitCode=1;
}finally{
  await deleteApp(app).catch(()=>{});
  fs.writeFileSync(path.join(OUT,'b1-r7-auth-team-readonly.json'),JSON.stringify(out,null,2)+'\n');
  console.log('B1_R7_AUTH_TEAM='+out.status);
  console.log('B1_R7_TARGETS='+JSON.stringify(out.targets));
  console.log('B1_R7_FINDINGS='+JSON.stringify(out.findings));
  console.log('B1_R7_ERRORS='+JSON.stringify(out.errors));
  console.log('B1_R7_WRITES=0');
}
