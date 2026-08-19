#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {resolveCanonicalRoleForView,requiredViewsPresent,ROLE_VIEW_CONTRACT_VERSION} from './orbit360-f2-role-view-contract-v20260818.mjs';

const ROOT=process.cwd();
const ownerPath=path.join(ROOT,'orbit360-platform/core/access-role-session-owner-v20260728.js');
const runnerPath=path.join(ROOT,'tools/orbit360-f2-productive-acceptance-runtime-browser-readonly-v20260818.mjs');
const owner=fs.readFileSync(ownerPath,'utf8');
const runner=fs.readFileSync(runnerPath,'utf8');
const need=(ok,code)=>{if(!ok)throw new Error(code);};

const superAdminRoles=['SuperAdmin','Operativo','Asesor','Finanzas'];
const canonicalDirectionRoles=['Dirección','Operativo','Asesor'];
const adminTenantRoles=['AdminTenant','Operativo','Asesor'];

const superAdmin=requiredViewsPresent(superAdminRoles);
const canonicalDirection=requiredViewsPresent(canonicalDirectionRoles);
const adminTenant=requiredViewsPresent(adminTenantRoles);

need(superAdmin.ok===true,'SELFTEST_SUPERADMIN_VIEW_NOT_ACCEPTED');
need(superAdmin.resolved['Dirección']==='SuperAdmin','SELFTEST_SUPERADMIN_DIRECTION_RESOLUTION_INVALID');
need(superAdmin.resolved['Operativo']==='Operativo','SELFTEST_OPERATIVO_RESOLUTION_INVALID');
need(superAdmin.resolved['Asesor']==='Asesor','SELFTEST_ASESOR_RESOLUTION_INVALID');
need(canonicalDirection.ok===true&&canonicalDirection.resolved['Dirección']==='Dirección','SELFTEST_CANONICAL_DIRECTION_INVALID');
need(adminTenant.ok===false&&adminTenant.missing==='Dirección','SELFTEST_ADMINTENANT_MUST_NOT_SATISFY_DIRECTION');
need(resolveCanonicalRoleForView(['SuperAdmin'],'Dirección')==='SuperAdmin','SELFTEST_DIRECT_RESOLUTION_INVALID');
need(owner.includes("SuperAdmin: 'Dirección'"),'SELFTEST_OWNER_VISUAL_ALIAS_MISSING');
need(owner.includes("if (role === 'SuperAdmin') return 'Dirección';"),'SELFTEST_OWNER_ROLE_LABEL_MISSING');
need(runner.includes("./orbit360-f2-role-view-contract-v20260818.mjs"),'SELFTEST_RUNNER_ROLE_VIEW_IMPORT_MISSING');
need(runner.includes("requiredViewsPresent(runtimeState.roles"),'SELFTEST_RUNNER_REQUIRED_VIEWS_CONTRACT_MISSING');
need(!runner.includes("for(const role of ['Dirección','Operativo','Asesor'])need(runtimeState.roles.includes(role)"),'SELFTEST_STALE_LITERAL_ROLE_GATE_STILL_PRESENT');

console.log(JSON.stringify({
  schemaVersion:'orbit360-f2-role-view-contract-selftest-v1',
  ok:true,
  status:'F2_ROLE_VIEW_CONTRACT_SELFTEST_PASS',
  classification:'PASS',
  contractVersion:ROLE_VIEW_CONTRACT_VERSION,
  superAdminDirectionResolved:true,
  canonicalDirectionResolved:true,
  adminTenantRejectedForDirection:true,
  ownerVisualAliasProven:true,
  runnerContractBound:true,
  productMutation:false,
  runtimeExecuted:false,
  browserExecuted:false,
  secretAccess:false,
  firestoreRead:false,
  firestoreWrites:0,
  authWrites:0,
  operationalWrites:0,
  containsPII:false,
  containsSecrets:false
},null,2));
