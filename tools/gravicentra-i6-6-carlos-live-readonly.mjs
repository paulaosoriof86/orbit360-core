#!/usr/bin/env node
// I6.6 / Carlos: one-time, service-authenticated Firestore inspection ONLY.
// Never authenticate as Carlos, perform a callable mutation or change a row.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(path.join(process.cwd(), 'functions', 'package.json'));
const admin = require('firebase-admin');
const PROJECT_ID = 'ays-orbit-360-lab';
const EXPECTED_SOURCE_BLOB = 'a27810c65e6a5a761d40c0e1f20cae61df483d1f';
const TARGET = 'carlos castro';
const OUTPUT = path.resolve(process.env.GI_CARLOS_READONLY_REPORT || 'carlos-live-readonly-private.json');
const MAX_TENANTS = 15;
const MAX_ADVISORS = 400;
const MAX_MEMBERS = 150;
const MAX_ACTIVITY = 120;
const MAX_EVENTS = 120;
const norm = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
const unique = values => [...new Set((Array.isArray(values) ? values : []).map(v => String(v ?? '').trim()).filter(Boolean))];
const maskUid = value => crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 16);
const readNames = row => unique([
  row.nombreCompleto, row.fullName, row.displayName, row.name,
  row.nombre, [row.nombre, row.apellidos].filter(Boolean).join(' '),
  [row.nombre, row.apellido].filter(Boolean).join(' '),
  [row.nombres, row.apellidos].filter(Boolean).join(' ')
]);
const isCarlos = row => readNames(row || {}).some(v => norm(v) === TARGET);
const isOperativo = value => norm(value) === 'operativo';
const normalizedModule = value => norm(value).replace(/ /g, '');
const periodStart = Date.parse('2026-11-10T00:00:00-06:00');
const periodEnd = Date.parse('2026-11-11T00:00:00-06:00');
function toMillis(value) {
  if (value && typeof value.toMillis === 'function') return value.toMillis();
  if (value && typeof value.seconds === 'number') return value.seconds * 1000;
  const valueText = String(value || '');
  const parsed = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(valueText) ? valueText + 'T00:00:00-06:00' : valueText);
  return Number.isFinite(parsed) ? parsed : 0;
}
const onNov10 = row => ['createdAt', 'updatedAt', 'fecha', 'committedAt'].some(key => {
  const t = toMillis(row?.[key]); return t >= periodStart && t < periodEnd;
});
const statusOf = member => {
  const states = [member.status, member.estado].map(norm).filter(Boolean);
  return member.active !== false && member.activo !== false && member.inactivo !== true &&
    states.length > 0 && states.every(v => ['active', 'activo'].includes(v));
};
function matchingKey(record, key) {
  const source = record && typeof record === 'object' && !Array.isArray(record) ? record : {};
  return Object.keys(source).find(k => normalizedModule(k) === normalizedModule(key));
}
function classifiedScope(value) {
  const v = norm(value);
  if (['all', 'todos', 'todo', 'global'].includes(v)) return 'all';
  if (['own', 'propios', 'propio', 'mios'].includes(v)) return 'own';
  if (['team', 'equipo'].includes(v)) return 'team';
  if (['none', 'ninguno', 'sin acceso'].includes(v)) return 'none';
  return 'unspecified';
}
function permissions(record, role) {
  const k = matchingKey(record.rolePermissions, role);
  const moduleMap = k ? record.rolePermissions[k] : {};
  const p = matchingKey(moduleMap, 'polizas');
  const module = p ? moduleMap[p] : {};
  return {
    explicitView: typeof module?.ver === 'boolean' ? module.ver : null,
    explicitEdit: typeof module?.editar === 'boolean' ? module.editar : null
  };
}
function reviewRole(member, access) {
  const roles = unique(member.roles || [member.rolDefault || member.rol]);
  const activeRole = String(member.activeRole || '');
  const operativeAssigned = roles.some(isOperativo);
  const countries = unique(member.countries).map(v => v.toUpperCase());
  const modulesRestricted = unique(member.modulesRestricted || member.modulosRestringidos).map(normalizedModule);
  const defaultScope = classifiedScope(member.dataScopes?.default || member.scopeDatos || member.dataScope);
  const moduleKey = matchingKey(member.dataScopes?.modules, 'polizas');
  const moduleScope = moduleKey ? classifiedScope(member.dataScopes.modules[moduleKey]) : 'unspecified';
  const scopeKey = matchingKey(access.roleScopes, 'Operativo');
  const explicitScope = scopeKey ? classifiedScope(access.roleScopes[scopeKey]) : 'unspecified';
  const permission = permissions(access, 'Operativo');
  const requestedScope = moduleScope !== 'unspecified' ? moduleScope : defaultScope;
  const ceiling = explicitScope === 'unspecified' ? 'all' : explicitScope;
  const scopeRank = {none:0,own:1,team:2,all:3};
  const effectivePoliciesScope = explicitScope === 'all' && requestedScope !== 'none' ? 'all' :
    requestedScope === 'unspecified' ? ceiling :
    scopeRank[requestedScope] <= scopeRank[ceiling] ? requestedScope : ceiling;
  const eligible = statusOf(member) && operativeAssigned && countries.includes('CO') &&
    !modulesRestricted.includes('polizas') && permission.explicitView !== false &&
    permission.explicitEdit !== false && effectivePoliciesScope === 'all';
  return {
    memberActive: statusOf(member), activeRoleSaved: activeRole,
    operativeAssigned, countries, restrictedPolicies: modulesRestricted.includes('polizas'),
    scopeDefault: defaultScope, scopePolicies: moduleScope,
    configuredOperativeScope: explicitScope, effectivePoliciesScope, ...permission,
    eligibleByCurrentServerCode: eligible,
    signedCarlosOperationConfirmed: false
  };
}
function safeWrite(result) {
  // The private artifact has only internal opaque IDs, no names, contacts,
  // account credentials, policy amounts or service-account material.
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  fs.chmodSync(OUTPUT, 0o600);
}
async function run() {
  assert.equal(process.env.GI_CARLOS_READONLY_PROJECT, PROJECT_ID, 'PROJECT_MISMATCH');
  assert.equal(process.env.GI_CARLOS_PRODUCT_SOURCE_BLOB, EXPECTED_SOURCE_BLOB, 'SOURCE_BLOB_DRIFT');
  const cred = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
  assert.equal(cred.type, 'service_account', 'AUTH_TYPE_INVALID');
  assert.equal(cred.project_id, PROJECT_ID, 'AUTH_PROJECT_MISMATCH');
  admin.initializeApp({ credential: admin.credential.cert(cred), projectId: PROJECT_ID });
  const db = admin.firestore();
  const tenants = await db.collection('tenants').limit(MAX_TENANTS).get();
  assert(!tenants.empty && tenants.size < MAX_TENANTS, 'TENANT_COUNT_OUT_OF_SAFE_BOUND');
  const matches = [];
  for (const tenantDoc of tenants.docs) {
    const tenantId = tenantDoc.id;
    const root = db.collection('tenants').doc(tenantId);
    const [advisorSnap, memberSnap] = await Promise.all([
      root.collection('data').doc('asesores').collection('items').limit(MAX_ADVISORS).get(),
      root.collection('members').limit(MAX_MEMBERS).get()
    ]);
    assert(advisorSnap.size < MAX_ADVISORS && memberSnap.size < MAX_MEMBERS, 'STAFF_LIST_OUT_OF_SAFE_BOUND');
    const advisors = advisorSnap.docs.filter(doc => isCarlos(doc.data()));
    const advisorIds = new Set(advisors.map(doc => doc.id));
    const linkedUids = new Set(advisors.flatMap(doc => [doc.data().authUid, doc.data().uid, doc.data().userId]).filter(Boolean).map(String));
    for (const doc of memberSnap.docs) {
      const row = doc.data() || {};
      const memberAdvisorId = String(row.advisorId || row.asesorId || '');
      const byName = isCarlos(row), byLinkedAdvisor = advisorIds.has(memberAdvisorId), byLinkedUid = linkedUids.has(doc.id);
      if (byName || byLinkedAdvisor || byLinkedUid) {
        matches.push({tenantId, uid:doc.id, member:row, advisorId:memberAdvisorId,
          matchStrength:[byName ? 'memberExactName' : '', byLinkedAdvisor ? 'linkedAdvisorExactName' : '', byLinkedUid ? 'linkedAuthUidExactAdvisor' : ''].filter(Boolean)});
      }
    }
  }
  const report = {
    schema:'GI_I66_CARLOS_LIVE_SERVICE_READONLY_V1', generatedAtUtc:new Date().toISOString(),
    projectId:PROJECT_ID, expectedProductSourceBlob:EXPECTED_SOURCE_BLOB,
    actorSessionImpersonated:false, firestoreWrites:0, roleUpdates:0,
    lookup:{tenantsScanned:tenants.size,carlosMembershipCandidates:matches.length},
    conclusion:matches.length === 0 ? 'HOLD_CARLOS_MEMBERSHIP_NOT_FOUND_BY_EXACT_CANONICAL_IDENTITY' :
      matches.length > 1 ? 'HOLD_CARLOS_MEMBER_IDENTITY_AMBIGUOUS' : 'READONLY_CONFIG_OBSERVED_SIGNED_WRITE_UAT_HOLD'
  };
  if (matches.length === 1) {
    const found = matches[0];
    const root = db.collection('tenants').doc(found.tenantId);
    const accessSnap = await root.collection('config').doc('access').get();
    const access = accessSnap.exists ? accessSnap.data() || {} : {};
    report.member = {
      tenantId:found.tenantId, uid:found.uid, uidDigest:maskUid(found.uid),
      advisorId:found.advisorId || null, matchStrength:found.matchStrength,
      configDocExists:accessSnap.exists, ...reviewRole(found.member, access)
    };
    const coPolicies = await root.collection('data').doc('polizas').collection('items').where('pais','==','CO').limit(20).get();
    const otherAdvisorsObserved = coPolicies.docs.filter(doc => {
      const row=doc.data()||{}, advisor=String(row.asesorId||row.advisorId||'');
      return !!advisor && !!found.advisorId && advisor!==found.advisorId;
    }).length;
    report.member.otherAdvisorCoPoliciesSampled = otherAdvisorsObserved;
    report.member.sampleRowsReadOnly = coPolicies.size;
    const [activities,events] = await Promise.all([
      root.collection('data').doc('actividades').collection('items')
        .where('updatedByUid', '==', found.uid).limit(MAX_ACTIVITY).get(),
      root.collection('operationalEvents').where('actorUid', '==', found.uid).limit(MAX_EVENTS).get()
    ]);
    assert(activities.size < MAX_ACTIVITY && events.size < MAX_EVENTS, 'ACTOR_EVENTS_OUT_OF_SAFE_BOUND');
    const policyChangeEvents = events.docs.map(d => ({id:d.id,row:d.data()||{}}))
      .filter(x => onNov10(x.row) && unique(x.row.collections).includes('polizas'));
    const exactActivities = activities.docs.map(d => ({id:d.id,row:d.data()||{}})).filter(x => {
      const row=x.row, detail=norm([row.motivo, row.detalle, row.descripcion, row.titulo].join(' '));
      return onNov10(row) && detail.includes('no renovable') &&
        String(row.polizaId || row.policyId || '') !== '';
    });
    const candidateIds = [...new Set(exactActivities.map(x => String(x.row.polizaId || x.row.policyId)))];
    report.incident = {
      date:'2026-11-10', actorOperationalPolicyEventCount:policyChangeEvents.length,
      matchingSignedActorActivityCount:exactActivities.length, candidatePolicyCount:candidateIds.length,
      originalPolicyIdVerified:false, originalServerErrorCodeVerified:false
    };
    if (candidateIds.length === 1) {
      const policyId=candidateIds[0];
      const snap=await root.collection('data').doc('polizas').collection('items').doc(policyId).get();
      if (snap.exists) {
        const row=snap.data()||{};
        const policyCountry=String(row.pais || row.country || '').toUpperCase();
        report.incident.candidatePolicy={id:policyId,exists:true,country:policyCountry,
          advisorId:String(row.asesorId || row.advisorId || ''),renovable:row.renovable ?? null,
          isAnotherAdvisor:!!found.advisorId && String(row.asesorId||row.advisorId||'')!==found.advisorId,
          memberCountryAllows:report.member.countries.includes(policyCountry)};
        // Inference from matching activity is not proof it was the screenshot's failed edit.
      }
    }
  }
  safeWrite(report);
  // Public logs contain no raw UID, policy ID, personal contacts or premium.
  console.log(JSON.stringify({projectId:PROJECT_ID,readOnly:true,conclusion:report.conclusion,
    membershipCandidates:report.lookup.carlosMembershipCandidates,
    configEligible:report.member?.eligibleByCurrentServerCode ?? null,
    matchingActivities:report.incident?.matchingSignedActorActivityCount ?? null,
    incidentPolicyConfirmed:false, signedCarlosUatConfirmed:false}));
}
run().catch(error => {
  // Never log SDK error objects/messages; they can embed a live document path.
  const known = new Set(['PROJECT_MISMATCH','SOURCE_BLOB_DRIFT','AUTH_TYPE_INVALID',
    'AUTH_PROJECT_MISMATCH','TENANT_COUNT_OUT_OF_SAFE_BOUND',
    'STAFF_LIST_OUT_OF_SAFE_BOUND','ACTOR_EVENTS_OUT_OF_SAFE_BOUND']);
  const code = known.has(String(error.message)) ? error.message :
    /^[A-Z0-9_-]{1,50}$/.test(String(error.code || '')) ? String(error.code) : 'PRIVATE_FIRESTORE_READ_FAILED';
  console.error('I66_CARLOS_READONLY_HOLD:'+code);
  process.exitCode = 1;
});
