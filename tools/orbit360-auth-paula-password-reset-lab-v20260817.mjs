#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { applicationDefault, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleAuth } from 'google-auth-library';

const PROJECT = process.env.ORBIT360_PROJECT_ID || 'ays-orbit-360-lab';
const TENANT = process.env.ORBIT360_TENANT_ID || 'alianzas-soluciones';
const TARGET_EMAIL_HASH = '9b663847979724e9491e1c655da32a7cb17a5f6ed26dba352de1eb811254b23f';
const TARGET_ADVISOR_ID = 'ase-paula-osorio';
const EVIDENCE = process.env.ORBIT360_RESET_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/auth-paula-password-reset-sanitized-v20260817.json';

const text = value => String(value == null ? '' : value).trim();
const norm = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const sha = value => crypto.createHash('sha256').update(String(value == null ? '' : value),'utf8').digest('hex');
const emailHash = value => sha(text(value).toLowerCase().replace(/\s+/g,''));
const stable = value => {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])]));
  return value;
};
const digest = value => sha(JSON.stringify(stable(value)));
const sanitize = value => text(value)
  .replace(/[\w.+-]+@[\w.-]+/g,'[email]')
  .replace(/https?:\/\/\S+/g,'[url]')
  .replace(/[\r\n]+/g,' ')
  .slice(0,700);

function write(payload) {
  fs.mkdirSync(path.dirname(EVIDENCE), {recursive:true});
  fs.writeFileSync(EVIDENCE, JSON.stringify({
    ...payload,
    projectId:PROJECT,
    tenantIdHash:sha(TENANT),
    targetAdvisorId:TARGET_ADVISOR_ID,
    targetEmailHash:TARGET_EMAIL_HASH,
    containsPII:false,
    containsSecrets:false,
    containsPassword:false,
    containsTemporaryPassword:false,
    containsActionLink:false,
    productionTouched:false,
    mainTouched:false,
    mergeExecuted:false,
    hostingDeploys:0,
    functionsDeploys:0,
    rulesDeploys:0,
    reimports:0,
    crmWrites:0
  }, null, 2) + '\n','utf8');
}
async function allUsers(auth) {
  const out=[]; let token;
  do {
    const page=await auth.listUsers(1000, token);
    out.push(...page.users); token=page.pageToken;
  } while(token);
  return out;
}
function rolesFrom(member) {
  const vals = [
    ...(Array.isArray(member?.roles) ? member.roles : []),
    ...(Array.isArray(member?.rolesAsignados) ? member.rolesAsignados : []),
    ...(Array.isArray(member?.assignedRoles) ? member.assignedRoles : []),
    member?.role, member?.rol, member?.rolDefault, member?.defaultRole, member?.activeRole
  ].filter(Boolean).map(norm);
  return [...new Set(vals)];
}
function privileged(roles) {
  return roles.some(role => ['direccion','superadmin','admintenant','admin','administracion'].includes(role));
}
async function firebaseWebApiKey() {
  const google = new GoogleAuth({ scopes:['https://www.googleapis.com/auth/cloud-platform.read-only'] });
  const client = await google.getClient();
  const list = await client.request({ url:`https://firebase.googleapis.com/v1beta1/projects/${PROJECT}/webApps` });
  const apps = [].concat(list.data?.apps || []).filter(app => String(app.state || '').toUpperCase() !== 'DELETED');
  if (!apps.length) throw new Error('FIREBASE_WEB_APP_NOT_FOUND');
  const config = await client.request({ url:`https://firebase.googleapis.com/v1beta1/${apps[0].name}/config` });
  const apiKey = text(config.data?.apiKey);
  if (!apiKey) throw new Error('FIREBASE_WEB_API_KEY_NOT_RESOLVED');
  return apiKey;
}
async function sendPasswordReset(apiKey, targetEmail) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(apiKey)}`, {
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({ requestType:'PASSWORD_RESET', email:targetEmail })
  });
  let body={};
  try { body=await response.json(); } catch {}
  if (!response.ok || body?.error) {
    throw new Error(`PASSWORD_RESET_REQUEST_FAILED_${response.status}_${body?.error?.message || 'UNKNOWN'}`);
  }
  return true;
}

let app;
try {
  app = getApps()[0] || initializeApp({ credential:applicationDefault(), projectId:PROJECT });
  const auth = getAuth(app);
  const db = getFirestore(app);

  const users = await allUsers(auth);
  const matches = users.filter(user => emailHash(user.email) === TARGET_EMAIL_HASH);
  if (matches.length !== 1) throw new Error(`TARGET_AUTH_IDENTITY_MATCH_${matches.length}`);
  const user = matches[0];
  if (user.disabled) throw new Error('TARGET_AUTH_IDENTITY_DISABLED');

  const memberRef = db.collection('tenants').doc(TENANT).collection('members').doc(user.uid);
  const memberSnap = await memberRef.get();
  if (!memberSnap.exists) throw new Error('TARGET_MEMBERSHIP_NOT_FOUND');
  const memberBefore = stable(memberSnap.data() || {});
  if (text(memberBefore.tenantId) && text(memberBefore.tenantId) !== TENANT) throw new Error('TARGET_MEMBERSHIP_TENANT_MISMATCH');
  const linkedAdvisor = text(memberBefore.advisorId || memberBefore.asesorId || memberBefore.teamId);
  if (linkedAdvisor && linkedAdvisor !== TARGET_ADVISOR_ID) throw new Error('TARGET_MEMBERSHIP_ADVISOR_MISMATCH');
  const rolesBefore = rolesFrom(memberBefore);
  if (!privileged(rolesBefore)) throw new Error('TARGET_MEMBERSHIP_NOT_PRIVILEGED');

  const teamCandidates = [
    db.collection('tenantId').doc(TENANT).collection('asesores').doc(TARGET_ADVISOR_ID),
    db.collection('tenants').doc(TENANT).collection('asesores').doc(TARGET_ADVISOR_ID),
    db.collection('tenants').doc(TENANT).collection('data').doc('asesores').collection('items').doc(TARGET_ADVISOR_ID)
  ];
  let teamSnap = null;
  for (const ref of teamCandidates) {
    const snap = await ref.get();
    if (snap.exists) { teamSnap = snap; break; }
  }
  if (!teamSnap) throw new Error('TARGET_TEAM_RECORD_NOT_FOUND');
  const teamBefore = stable(teamSnap.data() || {});

  const before = {
    uidHash:sha(user.uid),
    authDigest:digest({uid:user.uid,emailHash:emailHash(user.email),disabled:!!user.disabled}),
    membershipDigest:digest(memberBefore),
    teamDigest:digest(teamBefore),
    rolesDigest:digest(rolesBefore.slice().sort())
  };

  const apiKey = await firebaseWebApiKey();
  await sendPasswordReset(apiKey, user.email);

  const userAfter = await auth.getUser(user.uid);
  const memberAfterSnap = await memberRef.get();
  const teamAfterSnap = await teamSnap.ref.get();
  if (!memberAfterSnap.exists || !teamAfterSnap.exists) throw new Error('POST_RESET_LINKAGE_MISSING');
  const memberAfter = stable(memberAfterSnap.data() || {});
  const teamAfter = stable(teamAfterSnap.data() || {});
  const after = {
    uidHash:sha(userAfter.uid),
    authDigest:digest({uid:userAfter.uid,emailHash:emailHash(userAfter.email),disabled:!!userAfter.disabled}),
    membershipDigest:digest(memberAfter),
    teamDigest:digest(teamAfter),
    rolesDigest:digest(rolesFrom(memberAfter).slice().sort())
  };

  const uidUnchanged = before.uidHash === after.uidHash;
  const authIdentityUnchanged = before.authDigest === after.authDigest;
  const membershipUnchanged = before.membershipDigest === after.membershipDigest;
  const teamRecordUnchanged = before.teamDigest === after.teamDigest;
  const rolesUnchanged = before.rolesDigest === after.rolesDigest;
  if (!uidUnchanged || !authIdentityUnchanged || !membershipUnchanged || !teamRecordUnchanged || !rolesUnchanged) {
    throw new Error('POST_RESET_INTEGRITY_MISMATCH');
  }

  write({
    schemaVersion:'orbit360-auth-paula-password-reset-sanitized-v1',
    stage:'AUTH_PAULA_PASSWORD_RESET_PASS',
    classification:'SECURITY_FAILURE_CREDENTIAL_RECOVERY_COMPLETED',
    existingAuthIdentityVerified:true,
    existingMembershipVerified:true,
    privilegedMembershipVerified:true,
    passwordResetRequests:1,
    firebasePasswordResetEmailAccepted:true,
    directPasswordSets:0,
    authUsersCreated:0,
    authUsersDeleted:0,
    authUserMutations:0,
    firestoreReads:true,
    firestoreWrites:0,
    uidUnchanged,
    authIdentityUnchanged,
    membershipUnchanged,
    teamRecordUnchanged,
    rolesScopesUnchanged:rolesUnchanged,
    beforeUidHash:before.uidHash,
    afterUidHash:after.uidHash,
    ok:true
  });
  console.log(JSON.stringify({ok:true,stage:'AUTH_PAULA_PASSWORD_RESET_PASS',passwordResetRequests:1}));
} catch (error) {
  write({
    schemaVersion:'orbit360-auth-paula-password-reset-sanitized-v1',
    stage:'STOP_RETRY_AUTH_PAULA_PASSWORD_RESET',
    classification:'SECURITY_FAILURE',
    error:sanitize(error && error.message || error),
    passwordResetRequests:0,
    directPasswordSets:0,
    authUsersCreated:0,
    authUsersDeleted:0,
    authUserMutations:0,
    firestoreWrites:0,
    ok:false
  });
  console.error(sanitize(error && error.message || error));
  process.exitCode=41;
} finally {
  try { if (app) await deleteApp(app); } catch {}
}
