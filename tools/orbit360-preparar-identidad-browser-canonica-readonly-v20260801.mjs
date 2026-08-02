#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {applicationDefault,getApps,initializeApp,deleteApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {GoogleAuth} from 'google-auth-library';

const ROOT=process.cwd();
const PROJECT='ays-orbit-360-lab';
const TENANT='alianzas-soluciones';
const EXPECTED_UID='woJlxR1iFEeiQZvTscPj4qQ5Qc73';
const EXPECTED_EMAIL='orbit.lab@demo.com';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/canonical-browser-identity-readonly-v20260801.json');
const CONFIG=path.join(ROOT,'orbit360-platform/core/auth-firebase.config.local.js');
const TOKEN=path.join(process.env.RUNNER_TEMP||'/tmp','orbit360-canonical-browser-token.txt');
const PRIVILEGED=new Set(['Dirección','SuperAdmin','AdminTenant']);
function text(v){return String(v==null?'':v).trim();}
function safe(v){return text(v).replace(/[A-Za-z0-9_-]{30,}/g,'[redacted]').replace(/[\w.+-]+@[\w.-]+/g,'[email]').slice(0,300);}
function save(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify({...payload,containsPII:false,containsSecrets:false},null,2)+'\n','utf8');}
async function resolveWebConfig(){
  const google=new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform.read-only']});const client=await google.getClient();
  const list=await client.request({url:`https://firebase.googleapis.com/v1beta1/projects/${PROJECT}/webApps`});
  const apps=[].concat(list.data&&list.data.apps||[]).filter(app=>text(app.state).toUpperCase()!=='DELETED').sort((a,b)=>text(a.appId).localeCompare(text(b.appId)));
  if(!apps.length)throw new Error('DATA_CONTRACT_FAILURE:EXISTING_WEB_APP_NOT_FOUND');
  const response=await client.request({url:`https://firebase.googleapis.com/v1beta1/${apps[0].name}/config`});const config=response.data||{};
  if(text(config.projectId)!==PROJECT||!text(config.apiKey)||!text(config.appId)||!text(config.authDomain))throw new Error('DATA_CONTRACT_FAILURE:EXISTING_WEB_CONFIG_INCOMPLETE');
  return{config,webAppCount:apps.length};
}
async function listUsers(auth){const users=[];let token;do{const page=await auth.listUsers(1000,token);users.push(...page.users);token=page.pageToken;}while(token&&users.length<10000);return users;}
async function resolveIdentity(db,auth){
  const users=await listUsers(auth),byUid=new Map(users.map(user=>[text(user.uid),user]));
  const snap=await db.collection('tenants').doc(TENANT).collection('members').get();
  const eligible=snap.docs.map(doc=>({id:doc.id,...(doc.data()||{})})).map(row=>{
    const uid=text(row.uid||row.userId||row.id),roles=[...new Set([].concat(row.roles||[],row.role||row.rol||[]).map(text).filter(Boolean))],activeRole=text(row.activeRole||row.rolActivo||row.defaultRole||row.rolDefault||row.role||row.rol),status=text(row.status||row.estado).toLowerCase(),countries=[...new Set([].concat(row.countries||row.paises||[]).map(text).filter(Boolean))],scopes=row.dataScopes||row.scopes||{},user=byUid.get(uid);
    return{uid,roles,activeRole,countries,user,eligible:status==='active'&&!!user&&!user.disabled&&roles.includes(activeRole)&&countries.length>0&&scopes&&typeof scopes==='object'&&roles.some(role=>PRIVILEGED.has(role))};
  }).filter(item=>item.eligible);
  if(eligible.length!==1)throw new Error(`DATA_CONTRACT_FAILURE:PRIVILEGED_EXISTING_IDENTITY_COUNT_${eligible.length}`);
  const candidate=eligible[0];
  if(candidate.uid!==EXPECTED_UID||text(candidate.user.email).toLowerCase()!==EXPECTED_EMAIL.toLowerCase())throw new Error('DATA_CONTRACT_FAILURE:CANONICAL_BROWSER_IDENTITY_MISMATCH');
  return{candidate,authUserCount:users.length,membershipCount:snap.size};
}
let app;
try{
  if(text(process.env.ORBIT360_PRODUCT_PROJECT_ID)!==PROJECT||!process.env.GOOGLE_APPLICATION_CREDENTIALS)throw new Error('ENVIRONMENT_FAILURE:CANONICAL_BROWSER_IDENTITY_TARGET');
  app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT});const auth=getAuth(app),db=getFirestore(app);
  const [{config,webAppCount},{candidate,authUserCount,membershipCount}]=await Promise.all([resolveWebConfig(),resolveIdentity(db,auth)]);
  const token=await auth.createCustomToken(candidate.uid,{orbitTenant:TENANT,orbitReadOnlyVisualGate:true});
  const publicConfig={apiKey:config.apiKey,authDomain:config.authDomain,projectId:config.projectId,storageBucket:config.storageBucket||'',messagingSenderId:config.messagingSenderId||'',appId:config.appId};
  const js=`window.ORBIT_FIREBASE_LAB_CONFIG=${JSON.stringify(publicConfig)};\nwindow.OrbitBackend=Object.assign({},window.OrbitBackend||{},{firebaseConfigSource:'firebase-management-api-readonly',firebaseConfigScope:'lab-only',firebaseConfigTenant:'${TENANT}'});\n`;
  fs.writeFileSync(CONFIG,js,'utf8');fs.writeFileSync(TOKEN,token,'utf8');fs.chmodSync(TOKEN,0o600);
  if(process.env.GITHUB_ENV)fs.appendFileSync(process.env.GITHUB_ENV,`ORBIT360_CUSTOM_TOKEN_FILE=${TOKEN}\nORBIT360_LOCAL_FIREBASE_CONFIG_FILE=${CONFIG}\n`);
  save({schemaVersion:'orbit360-canonical-browser-identity-readonly-v1',projectId:PROJECT,tenantId:TENANT,status:'CANONICAL_BROWSER_EXISTING_IDENTITY_READY',classification:'GO_LAB_EXISTING_IDENTITY_READONLY',webConfigDerivedReadOnly:true,webAppCount,authRead:true,firestoreRead:true,authUserCount,membershipCount,eligibleExistingIdentityCount:1,uidMatched:true,emailMatched:true,activeRoleAssigned:Boolean(candidate.activeRole),roleCount:candidate.roles.length,countryCount:candidate.countries.length,customTokenCreatedEphemeral:true,configWrittenToIgnoredLocalFile:true,tokenWrittenToRunnerTemp:true,authWrites:0,firestoreWrites:0,operationalWrites:0,ok:true});
}catch(error){save({schemaVersion:'orbit360-canonical-browser-identity-readonly-v1',projectId:PROJECT,tenantId:TENANT,status:'CANONICAL_BROWSER_EXISTING_IDENTITY_FAIL',classification:text(error&&error.message).split(':')[0]||'DATA_CONTRACT_FAILURE',error:safe(error&&error.message||error),authWrites:0,firestoreWrites:0,operationalWrites:0,ok:false});process.exitCode=41;
}finally{if(app)await deleteApp(app).catch(()=>{});}
