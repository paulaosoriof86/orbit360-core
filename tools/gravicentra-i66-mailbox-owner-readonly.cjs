'use strict';

// Exact, projected census for the already authorized pilot. No mail body,
// credential, name or address is returned; no owner is inferred from a label.
const crypto=require('node:crypto'),path=require('node:path');
const {createRequire}=require('node:module');
const roleContract=require('../functions/product-active-role-contract.js');
const TENANT='alianzas-soluciones',PROJECT='ays-orbit-360-lab',PILOT='finanzasyadmin@aysseguros.com';
// Same real signed Direction actor in both viewports of accepted Preview run
// 45351824251. The owner then explicitly confirmed binding this pilot to self.
const DIRECTION_UID_SHA256='f612197b077c598edd61d757c1e2995be7a3b17300602ce4802bccefed216a72';
const MEMBER_LIMIT=201,ROSTER_LIMIT=501;
const FIELDS=['tenantId','id','uid','userId','email','correo','correoCuenta','mailbox','emailCorreo',
  'active','activo','inactivo','archivado','eliminado','deleted','status','estado','countries','paises','pais','country',
  'roles','rolesAsignados','assignedRoles','rolesDisponibles','activeRole','rolActivo','defaultRole','rolDefault',
  'rol','role','advisorId','asesorId','correoAutorizado','canalesAutorizados',
  'puedeEnviarCorreo','puedePrepararCorreo','integracionCorreoEstado'];
const EMAIL_FIELDS=['email','correo','correoCuenta','mailbox','emailCorreo'];
const sha=v=>crypto.createHash('sha256').update(String(v)).digest('hex');
const txt=v=>typeof v==='string'?v.trim():'';
const norm=v=>txt(v).toLowerCase();
const list=v=>Array.isArray(v)?v:[];
function active(row){const s=[row.status,row.estado].map(norm).filter(Boolean);return row.active!==false&&row.activo!==false&&
  row.inactivo!==true&&row.archivado!==true&&row.eliminado!==true&&row.deleted!==true&&s.length>0&&s.every(x=>['active','activo'].includes(x));}
function country(row){const c=[...list(row.countries),...list(row.paises),row.pais,row.country].map(x=>txt(x).toUpperCase()).filter(Boolean);
  return c.includes('GT')&&c.every(x=>['GT','CO'].includes(x));}
const matches=row=>EMAIL_FIELDS.filter(k=>norm(row[k])===PILOT);
function shape(row,id,kind){
  const state=norm(row.integracionCorreoEstado),knownStates=['no_configurado','autorizado_pendiente_conexion','conectado','suspendido','error_conexion','solo_mensaje_preparado','desautorizado'];
  return {recordIdSha256:sha(id),recordKind:kind,matchedEmailFieldPaths:matches(row),
    tenantExact:row.tenantId===TENANT,idConsistent:(!row.id||row.id===id)&&
      (kind!=='member'||[row.uid,row.userId].every(value=>value===undefined||value===null||value===''||value===id)),
    active:active(row),countryGT:country(row),
    internalRolePresent:[...list(row.roles),row.rol,row.role].map(norm).some(x=>['operativo','admin','admintenant','superadmin','direccion','asesor','comercial','cobros','finanzas','marketing','asistente'].includes(x)),
    correoAutorizado:row.correoAutorizado===true,correoExplicitlyDenied:row.correoAutorizado===false,
    correoChannelListed:list(row.canalesAutorizados).map(norm).some(x=>['correo','email'].includes(x)),
    integrationState:!state?'ABSENT':knownStates.includes(state)?state:'UNRECOGNIZED',
    preparingAllowed:row.puedePrepararCorreo===true,sendingAllowed:row.puedeEnviarCorreo===true};
}
function inspect({members,advisors,authResults={},expectedDirectionUidSha256=DIRECTION_UID_SHA256}){
  if(!Array.isArray(members)||!Array.isArray(advisors)||members.length>=MEMBER_LIMIT||advisors.length>=ROSTER_LIMIT)
    throw Error('MAIL_OWNER_CENSUS_BOUND_HOLD');
  const mm=members.filter(x=>matches(x.data).length),aa=advisors.filter(x=>matches(x.data).length);
  const memberCandidates=mm.map(x=>{
    const row=shape(x.data,x.id,'member'),auth=authResults[x.id];
    row.authReadCompleted=!!auth;row.authUserExists=auth?.exists===true;
    row.authUidExact=auth?.exists===true&&auth.uid===x.id;
    row.authEnabled=auth?.exists===true&&auth.disabled===false;
    row.authEmailVerified=auth?.exists===true&&auth.emailVerified===true;
    row.authEmailMatchesPilot=auth?.exists===true&&norm(auth.email)===PILOT;
    row.exactActiveGtIdentityCandidate=row.tenantExact&&row.idConsistent&&row.active&&row.countryGT&&
      row.authUidExact&&row.authEnabled&&row.authEmailVerified&&row.authEmailMatchesPilot;
    return row;
  });
  const advisorCandidates=aa.map(x=>({...shape(x.data,x.id,'advisor'),
    memberLinkCount:members.filter(m=>[m.data.advisorId,m.data.asesorId].some(id=>id===x.id)).length}));
  const directionMatches=members.filter(x=>sha(x.id)===expectedDirectionUidSha256);
  const directionCandidates=directionMatches.map(x=>{
    const m=x.data,u=authResults[x.id],base=shape(m,x.id,'member');let roleAssigned=false;
    try{roleAssigned=roleContract.resolveProductActiveRole(m,'direccion').activeRole==='direccion';}catch{/* Fixed field only. */}
    const authExact=u?.exists===true&&u.uid===x.id&&u.disabled===false&&u.emailVerified===true;
    return {recordIdSha256:sha(x.id),tenantExact:base.tenantExact,idConsistent:base.idConsistent,
      membershipUidExplicit:m.uid===x.id,active:base.active,countryGT:base.countryGT,
      directionExplicitlyAssigned:roleAssigned,authUserReadCompleted:!!u,authIdentityExactEnabledVerified:authExact,
      selectedFromPriorSignedDirectionActor:true,
      currentIdentityVerified:base.tenantExact&&base.idConsistent&&m.uid===x.id&&base.active&&base.countryGT&&roleAssigned&&authExact};
  });
  return {schema:'GI_I66_MAILBOX_OWNER_READONLY_V1',tenantId:TENANT,country:'GT',scenarioId:10221181,connectionId:14756803,
    mailboxSha256:sha(PILOT),memberCensusCount:members.length,advisorCensusCount:advisors.length,
    memberCandidatesCount:memberCandidates.length,advisorCandidatesCount:advisorCandidates.length,
    exactActiveGtIdentityCandidates:memberCandidates.filter(x=>x.exactActiveGtIdentityCandidate).length,
    selfBindingVerification:{expectedDirectionUidSha256,matchingMemberCount:directionCandidates.length,
      currentVerifiedIdentityCount:directionCandidates.filter(x=>x.currentIdentityVerified).length,
      candidates:directionCandidates,loginEmailNeedNotEqualPersonalMailbox:true,
      providerMailboxIdentityBasis:'DIRECTION_CONFIRMED_EXISTING_CONNECTION_NOT_CONNECTION_LABEL',
      priorSignedPreviewRunId:45351824251,priorPreviewReceiptBlob:'956e2676d2f9d6cfe18ed0af92784574862ae232'},
    memberCandidates,advisorCandidates,providerLoginIdentityVerified:false,mailboxOwnershipBindingAccepted:false,
    principalImpersonationAllowed:false,mailboxBindingWrites:0,canonicalWrites:0,authWrites:0,mailReads:0,messagesSent:0};
}
async function read({db,auth,expectedDirectionUidSha256=DIRECTION_UID_SHA256}){
  const tenant=db.collection('tenants').doc(TENANT);
  const [ms,as]=await Promise.all([
    tenant.collection('members').select(...FIELDS).limit(MEMBER_LIMIT).get(),
    tenant.collection('data').doc('asesores').collection('items').select(...FIELDS).limit(ROSTER_LIMIT).get()]);
  const members=ms.docs.map(d=>({id:d.id,data:d.data()})),advisors=as.docs.map(d=>({id:d.id,data:d.data()}));
  // Never turn a bounded/truncated census into unique ownership.
  if(members.length>=MEMBER_LIMIT||advisors.length>=ROSTER_LIMIT)throw Error('MAIL_OWNER_CENSUS_BOUND_HOLD');
  const emailCandidates=members.filter(x=>matches(x.data).length);
  if(emailCandidates.length>3)throw Error('MAIL_OWNER_AUTH_LOOKUP_BOUND_HOLD');
  const candidates=members.filter(x=>matches(x.data).length||sha(x.id)===expectedDirectionUidSha256),authResults={};
  if(candidates.length>4)throw Error('MAIL_OWNER_AUTH_LOOKUP_BOUND_HOLD');
  for(const x of candidates){
    try{const u=await auth.getUser(x.id);authResults[x.id]={exists:true,uid:u.uid,disabled:u.disabled===true,emailVerified:u.emailVerified===true,email:u.email};}
    catch(e){if(e?.code==='auth/user-not-found')authResults[x.id]={exists:false};else throw Error('MAIL_OWNER_AUTH_READ_HOLD');}
  }
  return inspect({members,advisors,authResults,expectedDirectionUidSha256});
}
async function main(){
  const req=createRequire(path.resolve(__dirname,'../functions/package.json'));
  const {initializeApp,getApps,applicationDefault}=req('firebase-admin/app');
  const {getFirestore}=req('firebase-admin/firestore'),{getAuth}=req('firebase-admin/auth');
  const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT});
  if(app.options.projectId!==PROJECT)throw Error('MAIL_OWNER_PROJECT_HOLD');
  const result=await read({db:getFirestore(app),auth:getAuth(app)});
  console.log('I66_MAILBOX_OWNER_READONLY='+JSON.stringify(result));
}
if(require.main===module)main().catch(e=>{const allowed=['MAIL_OWNER_CENSUS_BOUND_HOLD','MAIL_OWNER_AUTH_LOOKUP_BOUND_HOLD','MAIL_OWNER_AUTH_READ_HOLD','MAIL_OWNER_PROJECT_HOLD'];
  console.error(allowed.includes(e?.message)?e.message:'MAIL_OWNER_READONLY_FAILED');process.exitCode=1;});
module.exports={TENANT,PROJECT,PILOT,DIRECTION_UID_SHA256,FIELDS,MEMBER_LIMIT,ROSTER_LIMIT,active,country,inspect,read};
