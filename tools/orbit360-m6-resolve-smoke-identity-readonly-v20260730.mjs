#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {applicationDefault,getApps,initializeApp,deleteApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
const ROOT=process.cwd(),PROJECT=String(process.env.ORBIT360_PRODUCT_PROJECT_ID||'').trim(),TENANT=String(process.env.ORBIT360_PRODUCT_TENANT_ID||'').trim(),OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/m6-product-smoke-identity-summary.json');
const PRIV=new Set(['Dirección','SuperAdmin','AdminTenant']);
const text=v=>String(v==null?'':v).trim();const unique=v=>[...new Set([].concat(v||[]).map(text).filter(Boolean))];
function write(p){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify({...p,containsPII:false,containsSecrets:false},null,2)+'\n');}
let app;
try{
 if(!PROJECT||!TENANT||!process.env.GOOGLE_APPLICATION_CREDENTIALS||!process.env.GITHUB_ENV)throw new Error('PIPELINE_MECHANISM_FAILURE:IDENTITY_CONTEXT_NOT_BOUND');
 app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT});const auth=getAuth(app),db=getFirestore(app);
 const users=[];let token;do{const page=await auth.listUsers(1000,token);users.push(...page.users);token=page.pageToken;}while(token&&users.length<10000);const byUid=new Map(users.map(u=>[text(u.uid),u]));
 const snap=await db.collection(`tenants/${TENANT}/members`).get();const candidates=snap.docs.map(d=>({id:d.id,...(d.data()||{})})).map(row=>{const uid=text(row.uid||row.userId||row.id),roles=unique([].concat(row.roles||[],row.role||row.rol||[])),active=text(row.activeRole||row.rolActivo||row.defaultRole||row.rolDefault||roles[0]),status=text(row.status||row.estado).toLowerCase(),user=byUid.get(uid);return{uid,roles,active,status,user,eligible:status==='active'&&!!user&&!user.disabled&&user.emailVerified===true&&!!text(user.email)&&roles.includes(active)&&roles.includes('Dirección')&&roles.includes('Operativo')&&roles.includes('Asesor')&&roles.some(r=>PRIV.has(r))};}).filter(x=>x.eligible);
 if(candidates.length!==1)throw new Error(`DATA_CONTRACT_FAILURE:M6_SMOKE_IDENTITY_COUNT_${candidates.length}`);
 const email=text(candidates[0].user.email);fs.appendFileSync(process.env.GITHUB_ENV,`ORBIT360_PRODUCT_SMOKE_EMAIL=${email}\n`,'utf8');
 write({ok:true,status:'M6_PRODUCT_SMOKE_IDENTITY_RESOLVED',projectIdentityMatches:true,authUserCount:users.length,membershipCount:snap.size,eligibleSmokeIdentityCount:1,assignedRoleCount:candidates[0].roles.length,requiredRolesPresent:true,emailExportedToRunnerEnv:true,firestoreRead:true,authRead:true,firestoreWrites:0,operationalWrites:0});
}catch(error){write({ok:false,status:text(error&&error.message).startsWith('PIPELINE_MECHANISM_FAILURE')?'PIPELINE_MECHANISM_FAILURE':'DATA_CONTRACT_FAILURE',classification:text(error&&error.message).split(':')[0]||'DATA_CONTRACT_FAILURE',error:text(error&&error.message||error).replace(/[A-Za-z0-9_-]{30,}/g,'[redacted]').slice(0,300),eligibleSmokeIdentityCount:0,emailExportedToRunnerEnv:false,firestoreRead:false,authRead:false,firestoreWrites:0,operationalWrites:0});process.exitCode=41;}finally{if(app)await deleteApp(app).catch(()=>{});}
