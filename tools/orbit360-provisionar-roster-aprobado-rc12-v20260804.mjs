#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { applicationDefault, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const MODE = String(process.argv[2] || '').trim();
const ROOT = process.cwd();
const PROJECT = process.env.ORBIT360_PROJECT_ID || 'ays-orbit-360-lab';
const TENANT = process.env.ORBIT360_TENANT_ID || 'alianzas-soluciones';
const EVIDENCE_DIR = process.env.ORBIT360_EVIDENCE_DIR || 'orbit360-platform/runtime-gate-crm-v20260716';
const PRIVATE_STATE = process.env.ORBIT360_APPROVED_ROSTER_PRIVATE_STATE || path.join(process.env.RUNNER_TEMP || ROOT, 'rc12-approved-roster-private-state.json');
const MANIFEST_FILE = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/rc12-cumulative-candidate-unified-manifest.json');
const FILES = {
  census: path.join(ROOT, EVIDENCE_DIR, 'rc12-approved-roster-auth-census.json'),
  apply: path.join(ROOT, EVIDENCE_DIR, 'rc12-approved-roster-apply.json'),
  verify: path.join(ROOT, EVIDENCE_DIR, 'rc12-approved-roster-verify.json'),
  rollback: path.join(ROOT, EVIDENCE_DIR, 'rc12-approved-roster-rollback.json')
};
const PROFILES = ['direction','operations','advisor'];
const TECHNICAL_DIGESTS = Object.freeze({
  email:'df9b0695cd8953be630689ec343ab3f25e3a7d400a8c2370a485e319f3e93d04',
  uid:'f612197b077c598edd61d757c1e2995be7a3b17300602ce4802bccefed216a72'
});
const sha = value => crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
const text = value => String(value == null ? '' : value).trim();
const clean = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const unique = values => [...new Set((Array.isArray(values) ? values : []).map(text).filter(Boolean))];
const stable = value => {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
const digest = value => sha(JSON.stringify(stable(value)));
const now = () => new Date().toISOString();
const providers = user => unique((user?.providerData || []).map(item => item.providerId));
const isTechnical = user => sha(String(user?.email || '').toLowerCase()) === TECHNICAL_DIGESTS.email || sha(user?.uid || '') === TECHNICAL_DIGESTS.uid;
const userValid = user => Boolean(user?.uid && user?.email && !user?.disabled && providers(user).length > 0 && !isTechnical(user));
const writePrivate = payload => fs.writeFileSync(PRIVATE_STATE, JSON.stringify(payload), { encoding:'utf8', mode:0o600 });
const readPrivate = () => JSON.parse(fs.readFileSync(PRIVATE_STATE,'utf8'));
const writeEvidence = (file, payload) => {
  fs.mkdirSync(path.dirname(file), { recursive:true });
  fs.writeFileSync(file, JSON.stringify({
    ...payload,
    projectId:PROJECT,
    tenantId:TENANT,
    containsPII:false,
    containsSecrets:false,
    containsRawUid:false,
    containsRawEmail:false,
    passwordsLogged:false,
    invitationsSent:false,
    rulesApplied:false,
    functionsDeployed:false,
    mainTouched:false,
    mergeExecuted:false,
    reimportExecuted:false
  }, null, 2) + '\n', 'utf8');
};

let app;
function admin() {
  app = getApps()[0] || initializeApp({ credential:applicationDefault(), projectId:PROJECT });
  return { auth:getAuth(app), db:getFirestore(app) };
}
async function listAllUsers(auth) {
  const users=[];
  let pageToken;
  do {
    const page=await auth.listUsers(1000,pageToken);
    users.push(...page.users);
    pageToken=page.pageToken;
  } while (pageToken);
  return users;
}
function advisorShape(data,id,collection) {
  const email=text(data?.email || data?.correo || data?.userEmail).toLowerCase();
  const name=text(data?.name || data?.nombre || data?.displayName || data?.nombreCompleto);
  return {
    collection,
    id,
    email,
    emailDigest:email ? sha(email) : '',
    name,
    nameKey:clean(name),
    advisorId:text(data?.advisorId || data?.asesorId || data?.id || id) || id,
    teamId:text(data?.teamId || data?.equipoId),
    countries:unique(data?.countries || data?.paises || []).map(value => text(value).toUpperCase())
  };
}
async function readAdvisors(db) {
  const rows=[];
  for (const collection of ['asesores','advisors']) {
    const snap=await db.collection('tenantId').doc(TENANT).collection(collection).get();
    for (const doc of snap.docs) rows.push(advisorShape(doc.data(),doc.id,collection));
  }
  return rows;
}
function desiredMembership(profile, item, technicalMembership) {
  const common={
    uid:item.uid,
    tenantId:TENANT,
    status:'active',
    advisorId:item.advisor.advisorId,
    teamId:item.advisor.teamId || text(technicalMembership?.teamId),
    countries:item.advisor.countries.length ? item.advisor.countries : unique(technicalMembership?.countries || technicalMembership?.paises || []).map(value => text(value).toUpperCase()),
    modulesExtra:[],
    modulesRestricted:[],
    onboardingVersion:'rc12-approved-roster-v1',
    onboardingReason:'normal_product_access_for_cumulative_candidate',
    onboardingRunId:text(process.env.GITHUB_RUN_ID),
    createdAt:now()
  };
  if (profile === 'direction') return {
    ...common,
    roles:['SuperAdmin','AdminTenant','Asesor','Operativo'],
    defaultRole:'SuperAdmin',
    activeRole:'SuperAdmin',
    dataScopes:{clientes:'todos',polizas:'todos',cobros:'todos',gestiones:'todos',leads:'todos'}
  };
  if (profile === 'operations') return {
    ...common,
    roles:['Operativo','Asesor'],
    defaultRole:'Operativo',
    activeRole:'Operativo',
    dataScopes:{clientes:'todos',polizas:'todos',cobros:'todos',gestiones:'todos',leads:'todos'}
  };
  return {
    ...common,
    roles:['Asesor','Operativo'],
    defaultRole:'Asesor',
    activeRole:'Asesor',
    dataScopes:{clientes:'propios',polizas:'propios',cobros:'ninguno',gestiones:'propios',leads:'propios'}
  };
}
function comparable(current, desired) {
  return Object.fromEntries(Object.keys(desired).map(key => [key, current?.[key]]));
}
function sanitizeProfile(item) {
  return {
    emailSha256:item.emailDigest,
    advisorRecordStatus:item.advisorStatus,
    advisorIdBound:Boolean(item.advisor?.advisorId),
    advisorIdSha256:item.advisor?.advisorId ? sha(item.advisor.advisorId) : '',
    authStatus:item.authStatus,
    authCandidateCount:item.authCandidates,
    providerIds:item.user ? providers(item.user).sort() : [],
    existingUserValid:item.user ? userValid(item.user) : false,
    plannedCreate:item.authStatus === 'missing'
  };
}
async function resolveRoster() {
  const manifest=JSON.parse(fs.readFileSync(MANIFEST_FILE,'utf8'));
  const {auth,db}=admin();
  const [users,advisors,memberships]=await Promise.all([
    listAllUsers(auth),
    readAdvisors(db),
    db.collection('tenants').doc(TENANT).collection('members').get()
  ]);
  const technicalDoc=memberships.docs.find(doc => {
    const data=doc.data() || {};
    return sha(String(data.email || '').toLowerCase()) === TECHNICAL_DIGESTS.email || sha(text(data.uid || doc.id)) === TECHNICAL_DIGESTS.uid;
  });
  const roster={};
  for (const profile of PROFILES) {
    const contract=manifest.approvedRoster?.[profile];
    if (!contract?.emailSha256) throw new Error(`APPROVED_ROSTER_CONTRACT_MISSING_${profile.toUpperCase()}`);
    const advisorByDigest=advisors.filter(row => row.emailDigest === contract.emailSha256);
    const expectedName=clean(contract.personRef || '');
    const advisorByName=expectedName ? advisors.filter(row => row.nameKey === expectedName) : [];
    const advisorMatches=advisorByDigest.length ? advisorByDigest : advisorByName;
    const advisorStatus=advisorMatches.length === 1 ? 'resolved' : advisorMatches.length ? 'ambiguous' : 'missing';
    const advisor=advisorMatches.length === 1 ? advisorMatches[0] : null;
    if (advisor && advisor.emailDigest !== contract.emailSha256) {
      roster[profile]={profile,emailDigest:contract.emailSha256,advisorStatus:'digest_mismatch',advisor:null,authStatus:'not_evaluated',authCandidates:0,user:null};
      continue;
    }
    const authMatches=users.filter(user => sha(String(user.email || '').toLowerCase()) === contract.emailSha256);
    const user=authMatches.length === 1 ? authMatches[0] : null;
    const authStatus=authMatches.length === 0 ? 'missing' : authMatches.length > 1 ? 'ambiguous' : userValid(user) ? 'existing_valid' : 'existing_invalid';
    roster[profile]={profile,emailDigest:contract.emailSha256,advisorStatus,advisor,authStatus,authCandidates:authMatches.length,user};
  }
  return {manifest,auth,db,users,advisors,memberships,technicalMembership:technicalDoc?.data() || {},roster};
}
async function census() {
  const resolved=await resolveRoster();
  const statuses=Object.fromEntries(PROFILES.map(profile => [profile,sanitizeProfile(resolved.roster[profile])]));
  const blockerProfiles=PROFILES.filter(profile => {
    const item=resolved.roster[profile];
    return item.advisorStatus !== 'resolved' || !['missing','existing_valid'].includes(item.authStatus);
  });
  const plannedCreates=PROFILES.filter(profile => resolved.roster[profile].authStatus === 'missing').length;
  const ready=blockerProfiles.length === 0;
  if (ready) {
    const privateState={
      schemaVersion:'orbit360-approved-roster-private-state-v1',
      projectId:PROJECT,
      tenantId:TENANT,
      createdAuthUids:[],
      membershipBefore:{},
      membershipTouchedUids:[],
      roster:Object.fromEntries(PROFILES.map(profile => {
        const item=resolved.roster[profile];
        return [profile,{
          email:item.advisor.email,
          emailDigest:item.emailDigest,
          displayName:item.advisor.name,
          advisor:item.advisor,
          existingUid:item.user?.uid || '',
          uid:item.user?.uid || '',
          authStatus:item.authStatus
        }];
      }))
    };
    writePrivate(privateState);
  }
  const result={
    schemaVersion:'orbit360-approved-roster-auth-census-v1',
    generatedAt:now(),
    decision:ready ? 'APPROVED_ROSTER_READY_FOR_CONTROLLED_PROVISIONING' : 'APPROVED_ROSTER_NOT_RESOLVABLE_NO_WRITE',
    classification:ready ? 'GO_APPROVED_ROSTER_AUTH_PROVISIONING' : 'DATA_CONTRACT_FAILURE',
    counts:{
      authUsers:resolved.users.length,
      advisorRecords:resolved.advisors.length,
      memberships:resolved.memberships.size,
      plannedAuthCreates:plannedCreates,
      plannedFinalNormalMemberships:3
    },
    profiles:statuses,
    blockerProfiles,
    firestoreRead:true,
    firestoreWrites:0,
    authRead:true,
    authWrites:0,
    userCreates:0,
    userUpdates:0,
    productionTouched:false,
    ok:ready
  };
  writeEvidence(FILES.census,result);
  console.log(JSON.stringify(result,null,2));
  return ready ? 0 : 41;
}
async function apply() {
  const state=readPrivate();
  const {auth,db}=admin();
  const created=[];
  try {
    for (const profile of PROFILES) {
      const item=state.roster[profile];
      if (item.uid) {
        const existing=await auth.getUser(item.uid);
        if (!userValid(existing) || sha(String(existing.email || '').toLowerCase()) !== item.emailDigest) throw new Error(`EXISTING_AUTH_USER_CHANGED_${profile.toUpperCase()}`);
        continue;
      }
      const password=crypto.randomBytes(32).toString('base64url') + 'aA1!';
      const user=await auth.createUser({
        email:item.email,
        displayName:item.displayName || undefined,
        password,
        emailVerified:false,
        disabled:false
      });
      item.uid=user.uid;
      created.push(user.uid);
      state.createdAuthUids.push(user.uid);
      writePrivate(state);
    }
    if (new Set(PROFILES.map(profile => state.roster[profile].uid)).size !== 3) throw new Error('APPROVED_ROSTER_UIDS_NOT_DISTINCT');
    const refs=Object.fromEntries(PROFILES.map(profile => [profile,db.collection('tenants').doc(TENANT).collection('members').doc(state.roster[profile].uid)]));
    let membershipWrites=0;
    await db.runTransaction(async tx => {
      for (const profile of PROFILES) {
        const item=state.roster[profile];
        const snap=await tx.get(refs[profile]);
        state.membershipBefore[profile]={exists:snap.exists,data:snap.exists ? stable(snap.data()) : null};
        const desired=desiredMembership(profile,item,state.technicalMembership || {});
        if (snap.exists && digest(comparable(snap.data(),desired)) !== digest(desired)) throw new Error(`MEMBERSHIP_EXISTS_DIFFERENT_${profile.toUpperCase()}`);
      }
      for (const profile of PROFILES) {
        const item=state.roster[profile];
        const before=state.membershipBefore[profile];
        if (!before.exists) {
          tx.create(refs[profile],desiredMembership(profile,item,state.technicalMembership || {}));
          membershipWrites += 1;
          state.membershipTouchedUids.push(item.uid);
        }
      }
    });
    writePrivate(state);
    const result={
      schemaVersion:'orbit360-approved-roster-apply-v1',
      generatedAt:now(),
      decision:'APPROVED_ROSTER_AUTH_AND_MEMBERSHIPS_APPLIED',
      classification:'CONTROLLED_WRITE_APPLIED',
      authCreates:created.length,
      authCreateDigests:created.map(uid => sha(uid)).sort(),
      authUpdates:0,
      membershipWrites,
      finalNormalMembershipTargets:3,
      atomicMembershipTransaction:true,
      idempotent:true,
      rollbackStatePersisted:true,
      firestoreRead:true,
      firestoreWrites:membershipWrites,
      authRead:true,
      authWrites:created.length,
      userCreates:created.length,
      userUpdates:0,
      productionTouched:false,
      ok:true
    };
    writeEvidence(FILES.apply,result);
    console.log(JSON.stringify(result,null,2));
    return 0;
  } catch (error) {
    for (const uid of created.reverse()) await auth.deleteUser(uid).catch(()=>{});
    state.createdAuthUids=state.createdAuthUids.filter(uid => !created.includes(uid));
    writePrivate(state);
    const result={
      schemaVersion:'orbit360-approved-roster-apply-v1',
      generatedAt:now(),
      decision:'APPROVED_ROSTER_APPLY_FAILED_CREATED_USERS_REMOVED',
      classification:'DATA_CONTRACT_FAILURE',
      errorCode:text(error?.code || error?.message || error).slice(0,500),
      authCreatesAttempted:created.length,
      authRollbackDeletes:created.length,
      membershipWrites:0,
      firestoreWrites:0,
      authWrites:created.length * 2,
      userCreates:created.length,
      userUpdates:0,
      productionTouched:false,
      ok:false
    };
    writeEvidence(FILES.apply,result);
    console.error(JSON.stringify(result,null,2));
    return 41;
  }
}
async function verify() {
  const state=readPrivate();
  const {auth,db}=admin();
  const results={};
  let ok=true;
  for (const profile of PROFILES) {
    const item=state.roster[profile];
    try {
      const [user,snap]=await Promise.all([
        auth.getUser(item.uid),
        db.collection('tenants').doc(TENANT).collection('members').doc(item.uid).get()
      ]);
      const desired=desiredMembership(profile,item,state.technicalMembership || {});
      const membership=snap.exists ? snap.data() : null;
      const checks={
        authExists:Boolean(user?.uid),
        authNormal:userValid(user),
        emailDigestMatch:sha(String(user?.email || '').toLowerCase()) === item.emailDigest,
        passwordProvider:providers(user).includes('password'),
        membershipExists:snap.exists,
        tenantBound:text(membership?.tenantId) === TENANT,
        statusActive:['active','activo'].includes(text(membership?.status).toLowerCase()),
        rolesMatch:digest(membership?.roles || []) === digest(desired.roles),
        defaultRoleMatch:text(membership?.defaultRole) === desired.defaultRole,
        activeRoleMatch:text(membership?.activeRole) === desired.activeRole,
        advisorIdMatch:text(membership?.advisorId) === text(item.advisor.advisorId)
      };
      const profileOk=Object.values(checks).every(Boolean);
      results[profile]={checks,uidSha256:sha(user.uid),emailSha256:item.emailDigest,advisorIdSha256:sha(item.advisor.advisorId),ok:profileOk};
      ok=ok && profileOk;
    } catch (error) {
      results[profile]={errorCode:text(error?.code || error?.message || error).slice(0,500),ok:false};
      ok=false;
    }
  }
  const result={
    schemaVersion:'orbit360-approved-roster-verify-v1',
    generatedAt:now(),
    decision:ok ? 'THREE_APPROVED_NORMAL_IDENTITIES_AND_MEMBERSHIPS_PASS' : 'THREE_APPROVED_NORMAL_IDENTITIES_AND_MEMBERSHIPS_FAIL',
    classification:ok ? 'GO_THREE_NORMAL_MEMBERSHIPS' : 'DATA_CONTRACT_FAILURE',
    profiles:results,
    finalProfiles:3,
    firestoreRead:true,
    firestoreWrites:0,
    authRead:true,
    authWrites:0,
    productionTouched:false,
    ok
  };
  writeEvidence(FILES.verify,result);
  console.log(JSON.stringify(result,null,2));
  return ok ? 0 : 41;
}
async function rollback() {
  const state=readPrivate();
  const {auth,db}=admin();
  let membershipRestores=0;
  let membershipDeletes=0;
  await db.runTransaction(async tx => {
    for (const profile of PROFILES) {
      const item=state.roster[profile];
      if (!item?.uid) continue;
      const ref=db.collection('tenants').doc(TENANT).collection('members').doc(item.uid);
      const before=state.membershipBefore?.[profile];
      if (before?.exists) {
        tx.set(ref,before.data,{merge:false});
        membershipRestores += 1;
      } else {
        tx.delete(ref);
        membershipDeletes += 1;
      }
    }
  });
  let authDeletes=0;
  for (const uid of [...(state.createdAuthUids || [])].reverse()) {
    await auth.deleteUser(uid);
    authDeletes += 1;
  }
  const result={
    schemaVersion:'orbit360-approved-roster-rollback-v1',
    generatedAt:now(),
    decision:'APPROVED_ROSTER_ROLLBACK_COMPLETE',
    classification:'ROLLBACK_PASS',
    membershipRestores,
    membershipDeletes,
    authDeletes,
    firestoreRead:true,
    firestoreWrites:membershipRestores + membershipDeletes,
    authRead:true,
    authWrites:authDeletes,
    userCreates:0,
    userUpdates:0,
    productionTouched:false,
    ok:true
  };
  writeEvidence(FILES.rollback,result);
  console.log(JSON.stringify(result,null,2));
  return 0;
}

let exitCode=42;
try {
  if (!['census','apply','verify','rollback'].includes(MODE)) throw new Error('MODE_INVALID');
  if (MODE === 'census') exitCode=await census();
  if (MODE === 'apply') exitCode=await apply();
  if (MODE === 'verify') exitCode=await verify();
  if (MODE === 'rollback') exitCode=await rollback();
} catch (error) {
  const file=FILES[MODE] || FILES.census;
  const result={
    schemaVersion:'orbit360-approved-roster-error-v1',
    generatedAt:now(),
    mode:MODE,
    decision:'APPROVED_ROSTER_PIPELINE_ERROR',
    classification:'PIPELINE_MECHANISM_FAILURE',
    errorCode:text(error?.code || error?.message || error).slice(0,500),
    firestoreWrites:0,
    authWrites:0,
    productionTouched:false,
    ok:false
  };
  writeEvidence(file,result);
  console.error(JSON.stringify(result,null,2));
  exitCode=42;
} finally {
  if (app) await deleteApp(app).catch(()=>{});
}
process.exit(exitCode);
