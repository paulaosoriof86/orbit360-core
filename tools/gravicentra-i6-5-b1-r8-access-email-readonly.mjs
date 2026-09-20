import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab';
const TENANT='alianzas-soluciones';
const OUT=process.env.B1_R8_OUT||path.join(process.env.RUNNER_TEMP||process.cwd(),'b1-r8');
const TARGET_EMAIL='fernando.arias@aysseguros.com';
const clean=(v,m=500)=>String(v==null?'':v).trim().slice(0,m);
const norm=v=>clean(v,120).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const sha=v=>crypto.createHash('sha256').update(String(v==null?'':v)).digest('hex');
const ts=v=>{try{if(v&&typeof v.toDate==='function')return v.toDate().toISOString();}catch{};try{const d=new Date(v);return Number.isFinite(d.getTime())?d.toISOString():'';}catch{return'';}};
function serviceAccount(){
  for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){
    try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}
  }
  throw new Error('B1_R8_SERVICE_ACCOUNT_MISSING');
}
function scopeShape(row){
  const x=row&&typeof row==='object'?row:{};
  const ds=x.dataScopes&&typeof x.dataScopes==='object'?x.dataScopes:{};
  return {
    default:clean(ds.default||ds['*']||x.scopeDatos||x.dataScope,40),
    moduleCount:ds.modules&&typeof ds.modules==='object'?Object.keys(ds.modules).length:0,
    hasRoleAccess:!!(x.roleAccess&&typeof x.roleAccess==='object'),
    hasRoleDataScopes:!!(x.roleDataScopes&&typeof x.roleDataScopes==='object'),
    teamIdPresent:!!clean(x.teamId||x.equipoId,160),
    teamAdvisorIdsCount:[].concat(x.teamAdvisorIds||x.equipoAsesorIds||x.asesoresEquipo||[]).filter(Boolean).length,
    supervisorPresent:!!clean(x.supervisorId,160)
  };
}
function safeEmailConfig(cfg){
  const notification=cfg&&cfg.notification||{};
  const send=notification.sendEmail||{};
  const smtp=send.smtp||{};
  const reset=send.resetPasswordTemplate||{};
  const verify=send.verifyEmailTemplate||{};
  return {
    method:clean(send.method,80),
    smtpConfigured:!!(clean(smtp.host,200)||clean(smtp.senderEmail,200)),
    smtpHost:clean(smtp.host,200),
    smtpPort:Number(smtp.port||0)||0,
    smtpSecurityMode:clean(smtp.securityMode,80),
    senderEmail:clean(smtp.senderEmail,200),
    resetTemplateConfigured:!!Object.keys(reset).length,
    resetSenderLocalPart:clean(reset.senderLocalPart,120),
    verifyTemplateConfigured:!!Object.keys(verify).length,
    verifySenderLocalPart:clean(verify.senderLocalPart,120),
    authorizedDomainCount:Array.isArray(cfg?.authorizedDomains)?cfg.authorizedDomains.length:0,
    deliveryReceiptApiExposed:false
  };
}
fs.mkdirSync(OUT,{recursive:true});
const sa=serviceAccount();
const credential=cert(sa);
const app=initializeApp({credential,projectId:PROJECT},'b1-r8-access-email');
const db=getFirestore(app),auth=getAuth(app);
const out={
  schema:'GRAVICENTRA_I6_5_B1_R8_ACCESS_EMAIL_READONLY_V1',
  status:'FAIL',writes:0,authWrites:0,firestoreWrites:0,
  sourceFacts:{
    permissionMatrixCurrentOwner:'orbit360-platform/modules/equipo.js -> Orbit.cat',
    orbitCatPersistence:'browser_localStorage',
    runtimeMatrixGateOrder:'puedeVerModulo_before_matrixPermission',
    roleSwitchViewOwner:'access-role-session-owner local view role',
    accessScopeRoleCeiling:true,
    permanentScopedStoreInstalled:false
  },
  tenant:{},emailTransport:{},targetAccount:{},findings:[],errors:[]
};
try{
  const tenant=db.collection('tenants').doc(TENANT);
  const [membersSnap,advisorsSnap,configSnap]=await Promise.all([
    tenant.collection('members').get(),
    tenant.collection('data').doc('asesores').collection('items').get(),
    tenant.collection('config').get()
  ]);
  const memberRows=membersSnap.docs.map(d=>({id:d.id,data:d.data()||{}}));
  const advisorRows=advisorsSnap.docs.map(d=>({id:d.id,data:d.data()||{}}));
  const relationVariants=new Map();
  for(const row of memberRows.concat(advisorRows)){
    const sh=scopeShape(row.data);
    const key=JSON.stringify(sh);
    relationVariants.set(key,(relationVariants.get(key)||0)+1);
  }
  const configDocs=configSnap.docs.map(d=>({id:d.id,keys:Object.keys(d.data()||{}).sort()}));
  const accessConfigDocs=configDocs.filter(x=>/access|role|permission|permiso|scope|equipo|team/i.test(x.id)||x.keys.some(k=>/access|role|permission|permiso|scope|equipo|team/i.test(k)));
  out.tenant={
    membershipCount:memberRows.length,
    advisorCount:advisorRows.length,
    membershipScopeShapes:memberRows.map(r=>({idHash:sha(r.id),roles:[].concat(r.data.roles||[]).map(clean),activeRole:clean(r.data.activeRole||r.data.defaultRole||r.data.rolDefault),...scopeShape(r.data)})),
    advisorScopeShapes:advisorRows.map(r=>({idHash:sha(r.id),roles:[].concat(r.data.roles||[]).map(clean),defaultRole:clean(r.data.rolDefault||r.data.defaultRole||r.data.rol),...scopeShape(r.data)})),
    structuralVariantCount:relationVariants.size,
    configDocs,
    accessConfigDocs,
    canonicalAccessPolicyDocExists:configSnap.docs.some(d=>['accessPolicy','access-policy','permissions','rolePermissions'].includes(d.id))
  };
  if(!out.tenant.canonicalAccessPolicyDocExists) out.findings.push({code:'NO_CANONICAL_TENANT_ROLE_PERMISSION_POLICY'});
  if(!memberRows.some(r=>scopeShape(r.data).hasRoleAccess||scopeShape(r.data).hasRoleDataScopes)&&!advisorRows.some(r=>scopeShape(r.data).hasRoleAccess||scopeShape(r.data).hasRoleDataScopes)) out.findings.push({code:'NO_ROLE_SPECIFIC_DATA_SCOPE_MODEL'});
  if(!memberRows.some(r=>scopeShape(r.data).teamIdPresent||scopeShape(r.data).teamAdvisorIdsCount||scopeShape(r.data).supervisorPresent)&&!advisorRows.some(r=>scopeShape(r.data).teamIdPresent||scopeShape(r.data).teamAdvisorIdsCount||scopeShape(r.data).supervisorPresent)) out.findings.push({code:'NO_TEAM_RELATION_BINDINGS_CONFIGURED'});

  let target=null;
  try{target=await auth.getUserByEmail(TARGET_EMAIL);}catch(e){out.targetAccount.lookupError=clean(e?.code||e?.message,240);}
  if(target){
    out.targetAccount={
      uidHash:sha(target.uid),
      emailHash:sha(String(target.email||'').toLowerCase()),
      exists:true,emailVerified:target.emailVerified===true,disabled:target.disabled===true,
      providers:(target.providerData||[]).map(x=>clean(x.providerId,80)),
      creationTime:clean(target.metadata?.creationTime,120),
      lastSignInTime:clean(target.metadata?.lastSignInTime,120),
      lastRefreshTime:clean(target.metadata?.lastRefreshTime,120)
    };
    const q=await tenant.collection('auditEvents').where('action','==','team_access.invitation_sent').limit(100).get();
    const targetHash=sha(TARGET_EMAIL.toLowerCase());
    const relevant=q.docs.map(d=>d.data()||{}).filter(x=>{
      const eh=clean(x.emailHash||x.targetEmailHash,100);
      const aid=clean(x.advisorId,180);
      if(eh&&eh===targetHash)return true;
      const advisor=advisorRows.find(r=>r.id===aid);
      return !!(advisor&&clean(advisor.data.email,240).toLowerCase()===TARGET_EMAIL);
    }).map(x=>({createdAt:ts(x.createdAt),action:clean(x.action,100),reason:clean(x.reason,200)})).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,12);
    out.targetAccount.resetRequestAudit=relevant;
    out.targetAccount.firebaseRequestAcceptedCount=relevant.length;
  }

  const token=await credential.getAccessToken();
  const res=await fetch('https://identitytoolkit.googleapis.com/admin/v2/projects/'+PROJECT+'/config',{headers:{authorization:'Bearer '+token.access_token}});
  const raw=await res.text();
  if(!res.ok) throw new Error('IDENTITY_CONFIG_READ_FAILED:'+res.status+':'+raw.slice(0,300));
  const cfg=JSON.parse(raw);
  out.emailTransport=safeEmailConfig(cfg);
  if(!out.emailTransport.method) out.findings.push({code:'EMAIL_SEND_METHOD_NOT_EXPOSED_IN_PROJECT_CONFIG'});
  if(out.targetAccount.firebaseRequestAcceptedCount>0) out.findings.push({code:'FIREBASE_RESET_REQUEST_ACCEPTED_DELIVERY_NOT_OBSERVABLE'});
  out.status='PASS';
}catch(e){
  out.errors.push(clean(e?.stack||e?.message||e,4000));
  process.exitCode=1;
}finally{
  await deleteApp(app).catch(()=>{});
  fs.writeFileSync(path.join(OUT,'b1-r8-access-email-readonly.json'),JSON.stringify(out,null,2)+'\n');
  console.log('B1_R8_ACCESS_EMAIL='+out.status);
  console.log('B1_R8_TENANT_SUMMARY='+JSON.stringify({
    membershipCount:out.tenant.membershipCount,advisorCount:out.tenant.advisorCount,
    structuralVariantCount:out.tenant.structuralVariantCount,
    canonicalAccessPolicyDocExists:out.tenant.canonicalAccessPolicyDocExists,
    accessConfigDocs:out.tenant.accessConfigDocs
  }));
  console.log('B1_R8_EMAIL_TRANSPORT='+JSON.stringify(out.emailTransport));
  console.log('B1_R8_TARGET='+JSON.stringify(out.targetAccount));
  console.log('B1_R8_FINDINGS='+JSON.stringify(out.findings));
  console.log('B1_R8_WRITES=0');
}
