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
const TARGET_EMAIL_HASH='9b663847979724e9491e1c655da32a7cb17a5f6ed26dba352de1eb811254b23f';
const TARGET_ADVISOR='ase-paula-osorio';
const EVIDENCE=process.env.ORBIT360_RESET_LINK_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/auth-paula-reset-link-sanitized-v20260817.json';
const PRIVATE_LINK_FILE=process.env.ORBIT360_PRIVATE_RESET_LINK_FILE||'orbit360-private-artifacts/paula-reset-link.txt';
const text=v=>String(v==null?'':v).trim();
const norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const sha=v=>crypto.createHash('sha256').update(String(v==null?'':v),'utf8').digest('hex');
const emailHash=v=>sha(text(v).toLowerCase().replace(/\s+/g,''));
const stable=v=>{
  if(v===null||v===undefined)return v;
  if(Array.isArray(v))return v.map(stable);
  if(typeof v?.toDate==='function')return v.toDate().toISOString();
  if(typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));
  return v;
};
const digest=v=>sha(JSON.stringify(stable(v)));
const sanitize=v=>text(v).replace(/[\w.+-]+@[\w.-]+/g,'[email]').replace(/https?:\/\/\S+/g,'[url]').replace(/[\r\n]+/g,' ').slice(0,700);

function write(payload){
  fs.mkdirSync(path.dirname(EVIDENCE),{recursive:true});
  fs.writeFileSync(EVIDENCE,JSON.stringify({
    ...payload,
    projectId:PROJECT,
    tenantIdHash:sha(TENANT),
    targetAdvisorId:TARGET_ADVISOR,
    targetEmailHash:TARGET_EMAIL_HASH,
    containsPII:false,
    containsSecrets:false,
    containsPassword:false,
    containsActionLink:false,
    containsOobCode:false,
    productionTouched:false,
    mainTouched:false,
    mergeExecuted:false,
    hostingDeploys:0,
    functionsDeploys:0,
    rulesDeploys:0,
    firestoreWrites:0,
    crmWrites:0,
    authUsersCreated:0,
    authUsersDeleted:0,
    directPasswordSets:0
  },null,2)+'\n','utf8');
}
async function allUsers(auth){
  const out=[];let token;
  do{const page=await auth.listUsers(1000,token);out.push(...page.users);token=page.pageToken;}while(token);
  return out;
}
function rolesFrom(member){
  const vals=[...(Array.isArray(member?.roles)?member.roles:[]),...(Array.isArray(member?.rolesAsignados)?member.rolesAsignados:[]),...(Array.isArray(member?.assignedRoles)?member.assignedRoles:[]),member?.role,member?.rol,member?.rolDefault,member?.defaultRole,member?.activeRole].filter(Boolean).map(norm);
  return [...new Set(vals)];
}
function privileged(roles){return roles.some(r=>['direccion','superadmin','admintenant','admin','administracion'].includes(r));}

let app;
try{
  app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT});
  const auth=getAuth(app);
  const db=getFirestore(app);
  const matches=(await allUsers(auth)).filter(u=>emailHash(u.email)===TARGET_EMAIL_HASH);
  if(matches.length!==1)throw new Error(`TARGET_AUTH_IDENTITY_MATCH_${matches.length}`);
  const user=matches[0];
  if(user.disabled)throw new Error('TARGET_AUTH_IDENTITY_DISABLED');
  const memberRef=db.collection('tenants').doc(TENANT).collection('members').doc(user.uid);
  const memberSnap=await memberRef.get();
  if(!memberSnap.exists)throw new Error('TARGET_MEMBERSHIP_NOT_FOUND');
  const memberBefore=stable(memberSnap.data()||{});
  if(text(memberBefore.tenantId)&&text(memberBefore.tenantId)!==TENANT)throw new Error('TARGET_MEMBERSHIP_TENANT_MISMATCH');
  const linked=text(memberBefore.advisorId||memberBefore.asesorId||memberBefore.teamId);
  if(linked&&linked!==TARGET_ADVISOR)throw new Error('TARGET_MEMBERSHIP_ADVISOR_MISMATCH');
  const rolesBefore=rolesFrom(memberBefore);
  if(!privileged(rolesBefore))throw new Error('TARGET_MEMBERSHIP_NOT_PRIVILEGED');

  const before={uidHash:sha(user.uid),membershipDigest:digest(memberBefore),rolesDigest:digest(rolesBefore.slice().sort())};
  const link=await auth.generatePasswordResetLink(user.email);
  const url=new URL(link);
  if(url.searchParams.get('mode')!=='resetPassword')throw new Error('RESET_LINK_MODE_MISMATCH');
  const code=text(url.searchParams.get('oobCode'));
  const apiKey=text(url.searchParams.get('apiKey'));
  if(!code||!apiKey)throw new Error('RESET_LINK_MISSING_CODE_OR_API_KEY');

  const verify=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${encodeURIComponent(apiKey)}`,{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({oobCode:code})
  });
  let body={};try{body=await verify.json();}catch{}
  if(!verify.ok||body?.error)throw new Error(`RESET_CODE_VERIFY_FAILED_${verify.status}_${body?.error?.message||'UNKNOWN'}`);
  if(text(body.requestType)!=='PASSWORD_RESET')throw new Error('RESET_CODE_REQUEST_TYPE_MISMATCH');
  if(emailHash(body.email)!==TARGET_EMAIL_HASH)throw new Error('RESET_CODE_EMAIL_MISMATCH');

  const userAfter=await auth.getUser(user.uid);
  const memberAfterSnap=await memberRef.get();
  if(!memberAfterSnap.exists)throw new Error('POST_LINK_MEMBERSHIP_MISSING');
  const memberAfter=stable(memberAfterSnap.data()||{});
  const after={uidHash:sha(userAfter.uid),membershipDigest:digest(memberAfter),rolesDigest:digest(rolesFrom(memberAfter).slice().sort())};
  if(before.uidHash!==after.uidHash||before.membershipDigest!==after.membershipDigest||before.rolesDigest!==after.rolesDigest)throw new Error('POST_LINK_INTEGRITY_MISMATCH');

  fs.mkdirSync(path.dirname(PRIVATE_LINK_FILE),{recursive:true});
  fs.writeFileSync(PRIVATE_LINK_FILE,link+'\n','utf8');
  write({
    schemaVersion:'orbit360-auth-paula-reset-link-sanitized-v1',
    stage:'AUTH_PAULA_RESET_LINK_VERIFIED_READY_FOR_HANDOFF',
    classification:'RESET_EMAIL_OOB_CODE_INVALID_ROOTFIX_CHANNEL_HANDOFF',
    existingAuthIdentityVerified:true,
    existingMembershipVerified:true,
    privilegedMembershipVerified:true,
    resetLinksGenerated:1,
    resetCodeVerified:true,
    passwordChanged:false,
    uidUnchanged:true,
    membershipUnchanged:true,
    rolesScopesUnchanged:true,
    privateArtifactPrepared:true,
    ok:true
  });
  console.log(JSON.stringify({ok:true,stage:'AUTH_PAULA_RESET_LINK_VERIFIED_READY_FOR_HANDOFF',resetLinksGenerated:1,resetCodeVerified:true}));
}catch(error){
  try{if(fs.existsSync(PRIVATE_LINK_FILE))fs.rmSync(PRIVATE_LINK_FILE,{force:true});}catch{}
  write({
    schemaVersion:'orbit360-auth-paula-reset-link-sanitized-v1',
    stage:'STOP_RETRY_AUTH_PAULA_RESET_LINK_HANDOFF',
    classification:'SECURITY_FAILURE',
    error:sanitize(error&&error.message||error),
    resetLinksGenerated:0,
    resetCodeVerified:false,
    passwordChanged:false,
    privateArtifactPrepared:false,
    ok:false
  });
  console.error(sanitize(error&&error.message||error));
  process.exitCode=41;
}finally{
  try{if(app)await deleteApp(app);}catch{}
}
