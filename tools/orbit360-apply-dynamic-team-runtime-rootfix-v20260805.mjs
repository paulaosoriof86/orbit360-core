#!/usr/bin/env node
'use strict';

import fs from 'node:fs';

const FILE = 'tools/orbit360-auth-foundation-dynamic-team-runtime-v20260805.mjs';
let source = fs.readFileSync(FILE, 'utf8');

const oldPlan = `  const plan = errors.length ? null : buildFoundationPlan({ tenantId:TENANT, teamRecords:activeRows.map(row => ({ ...row.data, id:row.id })), authUsers:users.map(user => ({ uid:user.uid,email:user.email || '',emailVerified:user.emailVerified })), memberships:memberships.map(row => ({ uid:row.uid, ...row.data })), expectedActiveCount:normalized.length });
  if (!plan?.ok) errors.push(plan?.errorCode || 'DYNAMIC_TEAM_PLAN_NOT_READY');`;
const newPlan = `  const functionalProfiles = new Set();
  for (const item of normalized) {
    if (item.record.roles.some(role => ['SuperAdmin','AdminTenant'].includes(role))) functionalProfiles.add('direccion');
    if (item.record.roles.includes('Operativo')) functionalProfiles.add('operativo');
    if (item.record.roles.includes('Asesor')) functionalProfiles.add('asesor');
  }
  const administrativeUsers = normalized.filter(item => item.record.roles.some(role => ['SuperAdmin','AdminTenant'].includes(role))).length;`;
if (source.includes(oldPlan)) source = source.replace(oldPlan, newPlan);
else if (!source.includes('const functionalProfiles = new Set();')) throw new Error('VALIDATOR_STALE:DYNAMIC_PLAN_BLOCK_NOT_FOUND');

source = source.replace('functionalProfilesCovered:plan.functionalProfilesCovered,', 'functionalProfilesCovered:functionalProfiles.size,\n    administrativeUsersObserved:administrativeUsers,');
source = source.replace("state.sessionsVerified === true && profiles.size === 3 && crmIntegrity === 'VERIFIED_UNCHANGED'", "state.sessionsVerified === true && crmIntegrity === 'VERIFIED_UNCHANGED'");

if (!source.includes("activeUserCountRule: 'DYNAMIC_FROM_EQUIPO_AUTHORITY'")) throw new Error('DYNAMIC_COUNT_RULE_MISSING');
if (/expectedActiveCount\s*:\s*(7|9)/.test(source)) throw new Error('EXACT_USER_COUNT_GATE_REMAINS');
if (source.includes('profiles.size === 3 && crmIntegrity')) throw new Error('FUNCTIONAL_PROFILE_BLOCK_REMAINS');

fs.writeFileSync(FILE, source, 'utf8');
console.log(JSON.stringify({
  schemaVersion:'orbit360-auth-dynamic-runtime-rootfix-v1',
  exactUserCountBusinessGate:false,
  functionalProfilesBlockAuthentication:false,
  activeUsersDerivedFromEquipo:true,
  profileCoverageReported:true,
  ok:true
}, null, 2));
