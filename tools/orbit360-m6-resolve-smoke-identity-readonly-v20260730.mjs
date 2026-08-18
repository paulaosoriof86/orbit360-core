#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {applicationDefault,getApps,initializeApp,deleteApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
const ROOT=process.cwd(),PROJECT=String(process.env.ORBIT360_PRODUCT_PROJECT_ID||'').trim(),TENANT=String(process.env.ORBIT360_PRODUCT_TENANT_ID||'').trim();
const OUT=process.env.ORBIT360_SMOKE_IDENTITY_EVIDENCE||path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/m6-product-smoke-identity-summary.json');
const RUN_ID=String(process.env.ORBIT360_SMOKE_RUN_ID||'').trim();
const TARGET_HASH=String(process.env.ORBIT360_SMOKE_TARGET_EMAIL_HASH||'').trim();
const TARGET_ADVISOR=String(process.env.ORBIT360_SMOKE_TARGET_ADVISOR_ID||'').trim();
const PRIV=new Set(['Dirección','SuperAdmin','AdminTenant']);
const text=v=>String(v==null?'':v).trim();const unique=v=>[...new Set([].concat(v||[]).map(text).filter(Boolean))];
const sha=v=>crypto.createHash('sha256').update(String(v==null?'':v),'utf8').digest('hex');
const emailHash=v=>sha(text(v).toLowerCase().replace(/\s+/g,''));
function write(p){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify({...p,runId:RUN_ID||undefined,containsPII:false,containsSecrets:false},null,2)+'\n');}
let app;
try{
 if(!PROJECT||!TENANT||!process.env.GOOGLE_APPLICATION_CREDENTIALS||!process.env.GITHUB_ENV)throw new Error('PIPELINE_MECHANISM_FAILURE:IDENTITY_CONTEXT_NOT_BOUND');
 app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT});const auth=getAuth(app),db=getFirestore(app);
 const users=[];let token;do{const page=await auth.listUsers(1000,token);users.push(...page.users);token=page.pageToken;}while(token&&users.length<10000);const byUid=new Map(users.map(u=>[text(u.uid),u]));
 const snap=await db.collection(`tenants/${TENANT}/members`).get();const candidates=snap.docs.map(d=>({id:d.id,...(d.data()||{})})).map(row=>{const uid=text(row.uid||row.userId||row.id),roles=unique([].concat(row.roles||[],row.role||row.rol||[])),active=text(row.activeRole||row.rolActivo||row.defaultRole||row.rolDefault||roles[0]),status=text(row.status||row.estado).toLowerCase(),advisor=text(row.advisorId||row.asesorId||row.teamId),user=byUid.get(uid);return{uid,roles,active,status,advisor,user,eligible:status==='active'&&!!user&&!user.disabled&&user.emailVerified===true&&!!text(user.email)&&roles.includes(active)&&roles.includes('Dirección')&&roles.includes('Operativo')&&roles.includes('Asesor')&&roles.some(r=>PRIV.has(r))};}).filter(x=>x.eligible);
 if(candidates.length!==1)throw new Error(`DATA_CONTRACT_FAILURE:M6_SMOKE_IDENTITY_COUNT_${candidates.length}`);
 const selected=candidates[0],email=text(selected.user.email);fs.appendFileSync(process.env.GITHUB_ENV,`ORBIT360_PRODUCT_SMOKE_EMAIL=${email}\n`,'utf8');
 const targetEmailHashMatches=TARGET_HASH?emailHash(email)===TARGET_HASH:false;
 const targetAdvisorMatches=TARGET_ADVISOR?selected.advisor===TARGET_ADVISOR:false;
 const targetIdentityMatches=!!TARGET_HASH&&!!TARGET_ADVISOR&&targetEmailHashMatches&&targetAdvisorMatches;
 write({ok:true,status:'M6_PRODUCT_SMOKE_IDENTITY_RESOLVED',projectIdentityMatches:true,authUserCount:users.length,membershipCount:snap.size,eligibleSmokeIdentityCount:1,assignedRoleCount:selected.roles.length,requiredRolesPresent:true,emailExportedToRunnerEnv:true,targetBindingRequested:!!TARGET_HASH&&!!TARGET_ADVISOR,targetEmailHashMatches,targetAdvisorMatches,targetIdentityMatches,selectedActiveRole:selected.active,firestoreRead:true,authRead:true,firestoreWrites:0,authWrites:0,operationalWrites:0});
}catch(error){write({ok:false,status:text(error&&error.message).startsWith('PIPELINE_MECHANISM_FAILURE')?'PIPELINE_MECHANISM_FAILURE':'DATA_CONTRACT_FAILURE',classification:text(error&&error.message).split(':')[0]||'DATA_CONTRACT_FAILURE',error:text(error&&error.message||error).replace(/[A-Za-z0-9_-]{30,}/g,'[redacted]').slice(0,300),eligibleSmokeIdentityCount:0,emailExportedToRunnerEnv:false,targetBindingRequested:!!TARGET_HASH&&!!TARGET_ADVISOR,targetEmailHashMatches:false,targetAdvisorMatches:false,targetIdentityMatches:false,firestoreRead:false,authRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0});process.exitCode=41;}finally{if(app)await deleteApp(app).catch(()=>{});}
