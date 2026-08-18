#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { applicationDefault, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT=process.env.ORBIT360_PROJECT_ID||'ays-orbit-360-lab';
const TENANT=process.env.ORBIT360_TENANT_ID||'alianzas-soluciones';
const TARGET_HASH=process.env.ORBIT360_TARGET_EMAIL_HASH||'9b663847979724e9491e1c655da32a7cb17a5f6ed26dba352de1eb811254b23f';
const ADVISOR=process.env.ORBIT360_TARGET_ADVISOR_ID||'ase-paula-osorio';
const OUT=process.env.ORBIT360_RECON_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/auth-paula-membership-readonly-reconciliation-sanitized-v20260817.json';
const text=v=>String(v==null?'':v).trim();
const sha=v=>crypto.createHash('sha256').update(String(v==null?'':v),'utf8').digest('hex');
const emailHash=v=>sha(text(v).toLowerCase().replace(/\s+/g,''));
const uniq=a=>[...new Set([].concat(a||[]).map(text).filter(Boolean))];
const normScope=v=>({propios:'own',propio:'own',own:'own',equipo:'team',team:'team',todos:'all',all:'all',ninguno:'none',none:'none'}[text(v).toLowerCase()]||text(v).toLowerCase());
const stable=v=>{if(v==null)return v;if(Array.isArray(v))return v.map(stable);if(typeof v?.toDate==='function')return v.toDate().toISOString();if(typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));return v;};
const digest=v=>sha(JSON.stringify(stable(v)));
function write(p){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify({...p,projectId:PROJECT,tenantIdHash:sha(TENANT),targetAdvisorId:ADVISOR,targetEmailHash:TARGET_HASH,containsPII:false,containsSecrets:false,containsPassword:false,containsActionLink:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,mainTouched:false,mergeExecuted:false},null,2)+'\n','utf8');}
function fail(code,classification='DATA_CONTRACT_FAILURE'){const e=new Error(code);e.classification=classification;throw e;}
let app;
try{
  if(!process.env.GOOGLE_APPLICATION_CREDENTIALS) fail('PROVIDER_CREDENTIAL_NOT_BOUND','ENVIRONMENT_FAILURE');
  app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT});
  const auth=getAuth(app),db=getFirestore(app);
  const users=[];let token;
  do{const page=await auth.listUsers(1000,token);users.push(...page.users);token=page.pageToken;}while(token);
  const matches=users.filter(u=>emailHash(u.email)===TARGET_HASH);
  if(matches.length!==1) fail(`TARGET_AUTH_IDENTITY_MATCH_${matches.length}`);
  const user=matches[0];
  if(user.disabled) fail('TARGET_AUTH_IDENTITY_DISABLED');
  if(user.emailVerified!==true) fail('TARGET_AUTH_EMAIL_NOT_VERIFIED');

  const memberRef=db.collection('tenants').doc(TENANT).collection('members').doc(user.uid);
  const memberSnap=await memberRef.get();
  if(!memberSnap.exists) fail('TARGET_MEMBERSHIP_NOT_FOUND');
  const member=stable(memberSnap.data()||{});
  if(text(member.uid||member.userId)&&text(member.uid||member.userId)!==user.uid) fail('TARGET_MEMBERSHIP_UID_MISMATCH','SECURITY_FAILURE');
  if(text(member.tenantId||member.tenant)!==TENANT) fail('TARGET_MEMBERSHIP_TENANT_MISMATCH','SECURITY_FAILURE');
  if(text(member.status||member.estado).toLowerCase()!=='active') fail('TARGET_MEMBERSHIP_NOT_ACTIVE');
  if(member.email||member.correo){if(emailHash(member.email||member.correo)!==TARGET_HASH) fail('TARGET_MEMBERSHIP_EMAIL_MISMATCH','SECURITY_FAILURE');}

  const roles=uniq([].concat(member.roles||[],member.rolesAsignados||[],member.assignedRoles||[],member.role||[],member.rol||[]));
  const expectedRoles=['Dirección','SuperAdmin','AdminTenant','Asesor','Operativo'];
  const missingRoles=expectedRoles.filter(r=>!roles.includes(r));
  if(missingRoles.length) fail('TARGET_MEMBERSHIP_REQUIRED_ROLES_MISSING');
  const defaultRole=text(member.defaultRole||member.rolDefault||member.roleDefault);
  const activeRole=text(member.activeRole||member.rolActivo||defaultRole);
  if(defaultRole!=='Dirección') fail('TARGET_MEMBERSHIP_DEFAULT_ROLE_NOT_DIRECCION');
  if(!roles.includes(defaultRole)) fail('TARGET_MEMBERSHIP_DEFAULT_ROLE_NOT_ASSIGNED');
  if(!roles.includes(activeRole)) fail('TARGET_MEMBERSHIP_ACTIVE_ROLE_NOT_ASSIGNED');

  const countries=uniq(member.countries||member.paises);
  if(!countries.length) fail('TARGET_MEMBERSHIP_COUNTRIES_MISSING');
  if(countries.some(c=>!['GT','CO'].includes(c))) fail('TARGET_MEMBERSHIP_COUNTRIES_INVALID');
  const advisor=text(member.advisorId||member.asesorId||member.teamId);
  if(advisor!==ADVISOR) fail('TARGET_MEMBERSHIP_ADVISOR_MISMATCH');

  const rawScopes=member.dataScopes||member.scopes||member.scopeDatos||{};
  let defaultScope='';const moduleScopes={};
  if(typeof rawScopes==='string') defaultScope=normScope(rawScopes);
  else{defaultScope=normScope(rawScopes.default||rawScopes['*']||'');const mods=rawScopes.modules&&typeof rawScopes.modules==='object'?rawScopes.modules:{};for(const [k,v] of Object.entries(mods))moduleScopes[k]=normScope(v);}
  if(defaultScope!=='all') fail('TARGET_MEMBERSHIP_DEFAULT_SCOPE_NOT_ALL');
  if(Object.values(moduleScopes).some(v=>!['own','team','all','none'].includes(v))) fail('TARGET_MEMBERSHIP_MODULE_SCOPE_INVALID');

  const teamRefs=[
    db.collection('tenantId').doc(TENANT).collection('asesores').doc(ADVISOR),
    db.collection('tenants').doc(TENANT).collection('asesores').doc(ADVISOR),
    db.collection('tenants').doc(TENANT).collection('data').doc('asesores').collection('items').doc(ADVISOR)
  ];
  let teamSnap=null;
  for(const ref of teamRefs){const snap=await ref.get();if(snap.exists){teamSnap=snap;break;}}
  if(!teamSnap) fail('TARGET_TEAM_RECORD_NOT_FOUND');
  const team=stable(teamSnap.data()||{});
  const teamRoles=uniq(team.roles||[]);
  if(expectedRoles.some(r=>!teamRoles.includes(r))) fail('TARGET_TEAM_REQUIRED_ROLES_MISSING');
  if(text(team.rolDefault||team.defaultRole)!=='Dirección') fail('TARGET_TEAM_DEFAULT_ROLE_NOT_DIRECCION');
  if(!['activo','active'].includes(text(team.estado||team.status).toLowerCase())) fail('TARGET_TEAM_NOT_ACTIVE');

  const before={auth:digest({uid:user.uid,emailHash:emailHash(user.email),disabled:!!user.disabled,emailVerified:!!user.emailVerified}),membership:digest(member),team:digest(team)};
  const userAfter=await auth.getUser(user.uid),memberAfter=await memberRef.get(),teamAfter=await teamSnap.ref.get();
  if(!memberAfter.exists||!teamAfter.exists) fail('READBACK_LINKAGE_MISSING','SECURITY_FAILURE');
  const after={auth:digest({uid:userAfter.uid,emailHash:emailHash(userAfter.email),disabled:!!userAfter.disabled,emailVerified:!!userAfter.emailVerified}),membership:digest(stable(memberAfter.data()||{})),team:digest(stable(teamAfter.data()||{}))};
  const unchanged=before.auth===after.auth&&before.membership===after.membership&&before.team===after.team;
  if(!unchanged) fail('READONLY_RECONCILIATION_INTEGRITY_DRIFT','SECURITY_FAILURE');

  write({schemaVersion:'orbit360-auth-target-membership-readonly-reconciliation-v1',ok:true,status:'TARGET_IDENTITY_MEMBERSHIP_READONLY_PASS',classification:'PASS',authIdentityExists:true,authEnabled:true,emailVerified:true,membershipExists:true,uidMatches:true,tenantMatches:true,membershipActive:true,rolesCanonical:true,assignedRoleCount:roles.length,defaultRoleCanonical:true,activeRoleAssigned:true,countriesPresent:true,countryCount:countries.length,scopesCanonical:true,defaultScopeAll:true,advisorBound:true,teamRecordExists:true,readbackUnchanged:true,authReads:true,firestoreReads:true});
  console.log(JSON.stringify({ok:true,status:'TARGET_IDENTITY_MEMBERSHIP_READONLY_PASS',classification:'PASS'}));
}catch(e){
  write({schemaVersion:'orbit360-auth-target-membership-readonly-reconciliation-v1',ok:false,status:'TARGET_IDENTITY_MEMBERSHIP_READONLY_STOP',classification:e.classification||'DATA_CONTRACT_FAILURE',failedCheck:text(e.message||e).slice(0,180),authReads:true,firestoreReads:true});
  console.error(text(e.message||e).slice(0,180));process.exitCode=41;
}finally{try{if(app)await deleteApp(app);}catch{}}
