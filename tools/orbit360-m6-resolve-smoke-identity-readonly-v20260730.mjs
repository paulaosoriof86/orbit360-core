#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {applicationDefault,getApps,initializeApp,deleteApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {buildProviderFailureEvidence,writeRuntimeFailureEnvelope} from './orbit360-f2-provider-failure-evidence-v20260825.mjs';
import {bindCurrentStepEnvValue} from './orbit360-current-step-env-resolver-v20260825.mjs';
const ROOT=process.cwd(),PROJECT=String(process.env.ORBIT360_PRODUCT_PROJECT_ID||'').trim(),TENANT=String(process.env.ORBIT360_PRODUCT_TENANT_ID||'').trim();
const OUT=process.env.ORBIT360_SMOKE_IDENTITY_EVIDENCE||path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/m6-product-smoke-identity-summary.json');
const RUN_ID=String(process.env.ORBIT360_SMOKE_RUN_ID||'').trim();
const TARGET_HASH=String(process.env.ORBIT360_SMOKE_TARGET_EMAIL_HASH||'').trim();
const TARGET_ADVISOR=String(process.env.ORBIT360_SMOKE_TARGET_ADVISOR_ID||'').trim();
const PRIV=new Set(['Dirección','SuperAdmin','AdminTenant']);
const VALID_ROLES=new Set(['Dirección','SuperAdmin','AdminTenant','Operativo','Finanzas','Marketing','Asesor','Comercial','Asistente']);
const text=v=>String(v==null?'':v).trim();const unique=v=>[...new Set([].concat(v||[]).map(text).filter(Boolean))];
const sha=v=>crypto.createHash('sha256').update(String(v==null?'':v),'utf8').digest('hex');
const emailHash=v=>sha(text(v).toLowerCase().replace(/\s+/g,''));
function write(p){const out={...p,runId:RUN_ID||undefined,containsPII:false,containsSecrets:false};fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));return out;}
function roleState(row){const roles=unique([].concat(row.roles||[],row.role||row.rol||[]));const active=text(row.activeRole||row.rolActivo||row.defaultRole||row.rolDefault||roles[0]);return{roles,active,status:text(row.status||row.estado).toLowerCase(),advisor:text(row.advisorId||row.asesorId||row.teamId)};}
const credentialBinding=bindCurrentStepEnvValue('GOOGLE_APPLICATION_CREDENTIALS');
let app,secretAccess=false,authReadAttempted=false,authReadCompleted=false,firestoreReadAttempted=false,firestoreReadCompleted=false;
try{
 if(!PROJECT||!TENANT||!credentialBinding.value||!process.env.GITHUB_ENV)throw new Error('PIPELINE_MECHANISM_FAILURE:IDENTITY_CONTEXT_NOT_BOUND');
 secretAccess=true;
 app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT});const auth=getAuth(app),db=getFirestore(app);
 const users=[];let token;authReadAttempted=true;do{const page=await auth.listUsers(1000,token);users.push(...page.users);token=page.pageToken;}while(token&&users.length<10000);authReadCompleted=true;
 const byUid=new Map(users.map(u=>[text(u.uid),u]));
 firestoreReadAttempted=true;const snap=await db.collection(`tenants/${TENANT}/members`).get();firestoreReadCompleted=true;
 const rows=snap.docs.map(d=>({id:d.id,...(d.data()||{})}));
 const targetBound=!!TARGET_HASH&&!!TARGET_ADVISOR;
 if(targetBound){
   const targetUsers=users.filter(u=>!!text(u.email)&&emailHash(u.email)===TARGET_HASH);
   if(targetUsers.length!==1)throw new Error(`DATA_CONTRACT_FAILURE:TARGET_AUTH_IDENTITY_MATCH_${targetUsers.length}`);
   const user=targetUsers[0];
   if(user.disabled)throw new Error('DATA_CONTRACT_FAILURE:TARGET_AUTH_IDENTITY_DISABLED');
   if(user.emailVerified!==true)throw new Error('DATA_CONTRACT_FAILURE:TARGET_AUTH_EMAIL_NOT_VERIFIED');
   const memberRows=rows.filter(row=>text(row.uid||row.userId||row.id)===text(user.uid));
   if(memberRows.length!==1)throw new Error(`DATA_CONTRACT_FAILURE:TARGET_MEMBERSHIP_MATCH_${memberRows.length}`);
   const member=memberRows[0],state=roleState(member);
   if(state.status!=='active')throw new Error('DATA_CONTRACT_FAILURE:TARGET_MEMBERSHIP_NOT_ACTIVE');
   if(!state.roles.length||state.roles.some(r=>!VALID_ROLES.has(r)))throw new Error('DATA_CONTRACT_FAILURE:TARGET_MEMBERSHIP_ROLES_INVALID');
   if(!state.roles.includes(state.active))throw new Error('DATA_CONTRACT_FAILURE:TARGET_MEMBERSHIP_ACTIVE_ROLE_NOT_ASSIGNED');
   if(!state.roles.some(r=>PRIV.has(r)))throw new Error('DATA_CONTRACT_FAILURE:TARGET_MEMBERSHIP_PRIVILEGED_ROLE_MISSING');
   if(state.roles.includes('Asesor')&&state.advisor!==TARGET_ADVISOR)throw new Error('DATA_CONTRACT_FAILURE:TARGET_MEMBERSHIP_ADVISOR_MISMATCH');
   if(state.advisor!==TARGET_ADVISOR)throw new Error('DATA_CONTRACT_FAILURE:TARGET_ADVISOR_BINDING_MISMATCH');
   const email=text(user.email);fs.appendFileSync(process.env.GITHUB_ENV,`ORBIT360_PRODUCT_SMOKE_EMAIL=${email}\n`,'utf8');
   write({ok:true,status:'M6_PRODUCT_SMOKE_IDENTITY_RESOLVED',selectionMode:'target-first',projectIdentityMatches:true,credentialBindingSource:credentialBinding.source,authUserCount:users.length,membershipCount:snap.size,eligibleSmokeIdentityCount:1,exactTargetAuthCount:1,exactTargetMembershipCount:1,assignedRoleCount:state.roles.length,requiredRolesPresent:true,requiredRolesSemantics:'canonical-target-contract',rolesCanonical:true,privilegedRolePresent:true,activeRoleAssigned:true,emailExportedToRunnerEnv:true,targetBindingRequested:true,targetEmailHashMatches:true,targetAdvisorMatches:true,targetIdentityMatches:true,selectedActiveRole:state.active,providerExecuted:true,secretAccess:true,firestoreReadAttempted:true,firestoreRead:true,authReadAttempted:true,authRead:true,firestoreWrites:0,authWrites:0,operationalWrites:0});
 } else {
   const candidates=rows.map(row=>{const uid=text(row.uid||row.userId||row.id),state=roleState(row),user=byUid.get(uid);return{uid,...state,user,eligible:state.status==='active'&&!!user&&!user.disabled&&user.emailVerified===true&&!!text(user.email)&&state.roles.includes(state.active)&&state.roles.includes('Dirección')&&state.roles.includes('Operativo')&&state.roles.includes('Asesor')&&state.roles.some(r=>PRIV.has(r))};}).filter(x=>x.eligible);
   if(candidates.length!==1)throw new Error(`DATA_CONTRACT_FAILURE:M6_SMOKE_IDENTITY_COUNT_${candidates.length}`);
   const selected=candidates[0],email=text(selected.user.email);fs.appendFileSync(process.env.GITHUB_ENV,`ORBIT360_PRODUCT_SMOKE_EMAIL=${email}\n`,'utf8');
   write({ok:true,status:'M6_PRODUCT_SMOKE_IDENTITY_RESOLVED',selectionMode:'generic-fallback',projectIdentityMatches:true,credentialBindingSource:credentialBinding.source,authUserCount:users.length,membershipCount:snap.size,eligibleSmokeIdentityCount:1,assignedRoleCount:selected.roles.length,requiredRolesPresent:true,requiredRolesSemantics:'historical-generic-smoke',emailExportedToRunnerEnv:true,targetBindingRequested:false,targetEmailHashMatches:false,targetAdvisorMatches:false,targetIdentityMatches:false,selectedActiveRole:selected.active,providerExecuted:true,secretAccess:true,firestoreReadAttempted:true,firestoreRead:true,authReadAttempted:true,authRead:true,firestoreWrites:0,authWrites:0,operationalWrites:0});
 }
}catch(error){
 const evidence=buildProviderFailureEvidence({error,providerRunId:RUN_ID,secretAccess,authReadAttempted,authReadCompleted,firestoreReadAttempted,firestoreReadCompleted});
 write({...evidence,credentialBindingSource:credentialBinding.source,selectionMode:TARGET_HASH&&TARGET_ADVISOR?'target-first':'generic-fallback',eligibleSmokeIdentityCount:0,emailExportedToRunnerEnv:false,targetBindingRequested:!!TARGET_HASH&&!!TARGET_ADVISOR,targetEmailHashMatches:false,targetAdvisorMatches:false,targetIdentityMatches:false});
 if(RUN_ID&&/^f2-identity-run-\d+\.json$/.test(path.basename(OUT)))writeRuntimeFailureEnvelope({identityEvidencePath:OUT,evidence:{...evidence,providerRunId:RUN_ID}});
 process.exitCode=41;
}finally{if(app)await deleteApp(app).catch(()=>{});}
