#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';
import { applicationDefault, getApps, initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleAuth } from 'google-auth-library';

const ROOT=process.cwd();
const PROJECT_ID='ays-orbit-360-lab';
const TENANT_ID='alianzas-soluciones';
const EVIDENCE_DIR=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716');
const EVIDENCE_PATH=path.join(EVIDENCE_DIR,'m2-existing-identity-runtime-summary.json');
const PRIVILEGED_ROLES=new Set(['Dirección','SuperAdmin','AdminTenant']);
function text(v){return String(v==null?'':v).trim();}
function unique(v){return [...new Set([].concat(v||[]).map(text).filter(Boolean))];}
function sanitizedCodes(values){return unique(values).map(value=>value.replace(/[A-Za-z0-9_-]{24,}/g,'[redacted]').slice(0,180));}
function writeEvidence(payload){fs.mkdirSync(EVIDENCE_DIR,{recursive:true});fs.writeFileSync(EVIDENCE_PATH,JSON.stringify({...payload,containsPII:false,containsSecrets:false},null,2)+'\n');}
function cleanError(error){return text(error&&(error.code||error.message||error)||error).replace(/[A-Za-z0-9_\-]{24,}/g,'[redacted]').slice(0,360);}
async function listAllUsers(auth){const users=[];let token;do{const page=await auth.listUsers(1000,token);users.push(...page.users);token=page.pageToken;}while(token&&users.length<10000);return users;}
async function resolveWebConfig(){
  const googleAuth=new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform.read-only']});
  const client=await googleAuth.getClient();
  const list=await client.request({url:`https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}/webApps`});
  const apps=[].concat(list.data&&list.data.apps||[]).filter(app=>text(app.state).toUpperCase()!=='DELETED').sort((a,b)=>text(a.appId).localeCompare(text(b.appId)));
  if(!apps.length) throw new Error('DATA_CONTRACT_FAILURE:EXISTING_WEB_APP_NOT_FOUND');
  const response=await client.request({url:`https://firebase.googleapis.com/v1beta1/${apps[0].name}/config`});
  const config=response.data||{};
  if(text(config.projectId)!==PROJECT_ID||!text(config.apiKey)||!text(config.appId)||!text(config.authDomain)) throw new Error('DATA_CONTRACT_FAILURE:EXISTING_WEB_CONFIG_INCOMPLETE');
  return {config,webAppCount:apps.length};
}
async function resolveExistingIdentity(db,auth){
  const users=await listAllUsers(auth);const authByUid=new Map(users.map(user=>[text(user.uid),user]));
  const snap=await db.collection('tenants').doc(TENANT_ID).collection('members').get();
  const candidates=snap.docs.map(doc=>({id:doc.id,...(doc.data()||{})})).map(row=>{
    const uid=text(row.uid||row.userId||row.id);const roles=unique([].concat(row.roles||[],row.role||row.rol||[]));
    const activeRole=text(row.activeRole||row.rolActivo||row.defaultRole||row.rolDefault||row.role||row.rol);
    const status=text(row.status||row.estado).toLowerCase();const countries=unique(row.countries||row.paises||[]);const scopes=row.dataScopes||row.scopes||{};const user=authByUid.get(uid);
    return {uid,roles,activeRole,countries,eligible:status==='active'&&!!user&&!user.disabled&&roles.includes(activeRole)&&countries.length>0&&scopes&&typeof scopes==='object'&&roles.some(role=>PRIVILEGED_ROLES.has(role))};
  }).filter(item=>item.eligible);
  if(candidates.length!==1) throw new Error(`DATA_CONTRACT_FAILURE:PRIVILEGED_EXISTING_IDENTITY_COUNT_${candidates.length}`);
  return {candidate:candidates[0],authUserCount:users.length,membershipCount:snap.size};
}
function installBrowserGlobals(){globalThis.window=globalThis;globalThis.Orbit=globalThis.Orbit||{};globalThis.CustomEvent=globalThis.CustomEvent||class CustomEvent{constructor(type,init){this.type=type;this.detail=init&&init.detail;}};globalThis.dispatchEvent=globalThis.dispatchEvent||function(){return true;};globalThis.addEventListener=globalThis.addEventListener||function(){};}
function loadOwners(){installBrowserGlobals();[
  'orbit360-platform/core/product-role-taxonomy-p0.js','orbit360-platform/core/membership-multirol-contract-p0.js','orbit360-platform/core/membership-multirol-effective-p0.js','orbit360-platform/core/tenant-access-policy-contract-p0.js','orbit360-platform/core/aseguradoras-bank-account-visibility-policy-p0.js','orbit360-platform/core/tenant-access-policy-effective-p0.js','orbit360-platform/core/tenant-access-policy-product-p0.js','orbit360-platform/core/product-query-planner-contract-p0.js','orbit360-platform/core/tenant-canonical-paths-contract-p0.js','orbit360-platform/core/backend-product-readiness-contract-p0.js','orbit360-platform/data/store-firestore-product-readonly-p0.js','orbit360-platform/core/backend-product-readonly-bootstrap-p0.js'
].forEach(rel=>vm.runInThisContext(fs.readFileSync(path.join(ROOT,rel),'utf8'),{filename:rel}));}
async function executeRuntime(config,identity,adminAuth){
  const appMod=await import('firebase/app');const authMod=await import('firebase/auth');const storeMod=await import('firebase/firestore');
  loadOwners();const clientApp=appMod.initializeApp(config,`orbit360-existing-identity-${process.env.GITHUB_RUN_ID||'local'}`);const clientAuth=authMod.getAuth(clientApp);const db=storeMod.getFirestore(clientApp);
  const customToken=await adminAuth.createCustomToken(identity.uid,{orbitTenant:TENANT_ID,orbitProductReadOnly:true});let signedUser=null;
  const dependencies={environmentProvider:{describePublicConfig:async()=>({projectId:PROJECT_ID,authDomain:'configured',appId:'configured',hasApiKey:true,storageBucket:'configured',environmentRef:'firebase-management-api-readonly',controlledExistingIdentity:true,existingProjectReconciled:true,identitySource:'membership_only',readOnly:true,writeAuthorized:false})},firebaseAdapter:{initializeFromEnvironment:async()=>({app:clientApp,auth:clientAuth,db}),storeDependencies:()=>({db,collection:storeMod.collection,query:storeMod.query,where:storeMod.where,onSnapshot:storeMod.onSnapshot})},authProvider:{waitForAuthenticatedUser:async()=>{if(!signedUser)signedUser=(await authMod.signInWithCustomToken(clientAuth,customToken)).user;return {uid:signedUser.uid,email:signedUser.email,emailVerified:signedUser.emailVerified,disabled:false};}},membershipProvider:{getByUid:async uid=>{if(uid!==identity.uid)throw new Error('DATA_CONTRACT_FAILURE:MEMBERSHIP_UID_MISMATCH');const member=await storeMod.getDoc(storeMod.doc(db,`tenants/${TENANT_ID}/members/${uid}`));if(!member.exists())throw new Error('DATA_CONTRACT_FAILURE:MEMBERSHIP_NOT_FOUND');return member.data();}}};
  const result=await globalThis.Orbit.backendProductReadOnlyBootstrapP0.start(dependencies,{authorizedProductReadOnly:true,runtimeAuthorized:true,mode:'product',collections:['clientes','aseguradoras'],snapshotTimeoutMs:30000});
  const bootstrapStatus=result&&result.status||{};
  const readiness=result&&result.readiness||{};
  const store=globalThis.Orbit.store;
  const status=store&&store._productStatus?store._productStatus():{};let localWriteBlocked=false;
  if(store&&typeof store.insert==='function'){
    try{store.insert('clientes',{id:'forbidden'});}catch(error){localWriteBlocked=error&&error.code==='WRITE_BLOCKED_PRODUCT_READ_ONLY_P0';}
  }
  if(store&&store._detachSnapshots)store._detachSnapshots();await authMod.signOut(clientAuth).catch(()=>{});await appMod.deleteApp(clientApp).catch(()=>{});
  return {ok:result.ok===true&&result.ready===true&&result.storeInstalled===true&&result.writeAuthorized===false&&status.noFallback===true&&status.writeEnabled===false&&localWriteBlocked,bootstrapPhase:text(bootstrapStatus.phase),bootstrapErrors:sanitizedCodes(bootstrapStatus.errors),readinessStatus:text(readiness.status),readinessErrors:sanitizedCodes(readiness.errors),storeStatus:text(status.status),storeSnapshotErrorKeys:Object.keys(status.snapshotErrors||{}).sort(),storeDeniedCollections:unique(status.deniedCollections||[]),controlledExistingIdentity:readiness.controlledExistingIdentity===true,controlledExistingIdentityAccepted:readiness.controlledExistingIdentityAccepted===true,storeInstalled:result.storeInstalled===true,snapshotsAttached:result.snapshotsAttached===true,noFallback:status.noFallback===true,storeWriteEnabled:status.writeEnabled===true,localWriteBlocked,activeRoleAssigned:!!identity.activeRole,roleCount:identity.roles.length,countryCount:identity.countries.length};
}
async function main(){let app;let runtimeStarted=false;const base={schemaVersion:'orbit360-m2-existing-identity-runtime-v2',gateId:'block2-product-readonly-runtime-v20260723',contractVersion:'2.2.1',projectId:PROJECT_ID,tenantIdSource:'membership_only',existingIdentityOnly:true,newProjectRequired:false,createAuthUser:false,updateAuthUser:false,createMembership:false,updateMembership:false,rulesChanged:false,configurationWrites:0,operationalWrites:0,hostingDeploy:false,functionsDeploy:false,imports:false,policies:false,m3:false,mergeMain:false};
  try{
    if(!text(process.env.GOOGLE_APPLICATION_CREDENTIALS)||text(process.env.ORBIT360_EXISTING_FIREBASE_PROJECT_ID)!==PROJECT_ID)throw new Error('PIPELINE_MECHANISM_FAILURE:EXISTING_PROJECT_IDENTITY_NOT_RESOLVED');
    app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT_ID});const adminAuth=getAuth(app);const db=getFirestore(app);
    const [{config,webAppCount},{candidate,authUserCount,membershipCount}]=await Promise.all([resolveWebConfig(),resolveExistingIdentity(db,adminAuth)]);
    runtimeStarted=true;
    const runtime=await executeRuntime(config,{uid:candidate.uid,roles:candidate.roles,activeRole:candidate.activeRole,countries:candidate.countries},adminAuth);const ok=runtime.ok===true;
    writeEvidence({...base,ok,status:ok?'M2_EXISTING_IDENTITY_RUNTIME_VALIDATED':'DATA_CONTRACT_FAILURE',classification:ok?null:'DATA_CONTRACT_FAILURE',projectIdentityMatches:true,webConfigDerivedReadOnly:true,webAppCount,authRead:true,firestoreRead:true,authUserCount,membershipCount,eligibleExistingIdentityCount:1,runtimeExecuted:true,browserExecuted:false,...runtime});if(!ok)process.exitCode=41;
  }catch(error){writeEvidence({...base,ok:false,status:text(error&&error.message).startsWith('PIPELINE_MECHANISM_FAILURE')?'PIPELINE_MECHANISM_FAILURE':'DATA_CONTRACT_FAILURE',classification:text(error&&error.message).startsWith('PIPELINE_MECHANISM_FAILURE')?'PIPELINE_MECHANISM_FAILURE':'DATA_CONTRACT_FAILURE',error:cleanError(error),runtimeExecuted:runtimeStarted,browserExecuted:false,bootstrapPhase:runtimeStarted?'runtime_exception':'not_started',bootstrapErrors:[cleanError(error)],readinessErrors:[],storeSnapshotErrorKeys:[]});process.exitCode=41;}finally{if(app)await deleteApp(app).catch(()=>{});}
}
await main();
