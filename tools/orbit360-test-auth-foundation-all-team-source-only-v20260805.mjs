#!/usr/bin/env node
'use strict';

import { buildFoundationPlan, validateFutureUserPath } from './orbit360-auth-foundation-all-team-plan-v20260805.mjs';

const scopesAll = { clientes:'todos', polizas:'todos', cobros:'todos', gestiones:'todos', leads:'todos' };
const scopesOwn = { clientes:'propios', polizas:'propios', cobros:'ninguno', gestiones:'propios', leads:'propios' };
const row = (id, role, n) => ({
  id,
  nombre:`Persona ${n}`,
  email:`persona${n}@example.invalid`,
  roles:Array.isArray(role)?role:[role],
  defaultRole:Array.isArray(role)?role[0]:role,
  activeRole:Array.isArray(role)?role[0]:role,
  countries:['GT'],
  dataScopes:(Array.isArray(role)?role:[role]).includes('Asesor')?scopesOwn:scopesAll,
  activo:true
});
const team = [
  row('u1',['SuperAdmin','Asesor'],1),
  row('u2',['Operativo','Asesor'],2),
  row('u3','Asesor',3),
  row('u4','Asesor',4),
  row('u5','Operativo',5),
  row('u6','Finanzas',6),
  row('u7','Asistente',7)
];
const authUsers = [
  {uid:'auth-u1',email:'persona1@example.invalid',emailVerified:true},
  {uid:'auth-u2',email:'persona2@example.invalid',emailVerified:false}
];
const memberships = [{uid:'auth-u1',tenantId:'alianzas-soluciones',status:'active'}];

const valid = buildFoundationPlan({tenantId:'alianzas-soluciones',teamRecords:team,authUsers,memberships,expectedActiveCount:7});
const countFailure = buildFoundationPlan({tenantId:'alianzas-soluciones',teamRecords:team.slice(0,6),authUsers,memberships,expectedActiveCount:7});
const duplicateEmailTeam = team.map(x=>({...x})); duplicateEmailTeam[6].email=duplicateEmailTeam[5].email;
const duplicateFailure = buildFoundationPlan({tenantId:'alianzas-soluciones',teamRecords:duplicateEmailTeam,expectedActiveCount:7});
const noAdminTeam = team.map(x=>({...x,roles:x.roles.filter(r=>!['SuperAdmin','AdminTenant'].includes(r)),defaultRole:x.roles.filter(r=>!['SuperAdmin','AdminTenant'].includes(r))[0]||'Asesor',activeRole:x.roles.filter(r=>!['SuperAdmin','AdminTenant'].includes(r))[0]||'Asesor'}));
const adminFailure = buildFoundationPlan({tenantId:'alianzas-soluciones',teamRecords:noAdminTeam,expectedActiveCount:7});
const future = validateFutureUserPath({tenantId:'alianzas-soluciones',record:row('future-user','Asesor',8)});

const checks = {
  validSeven: valid.ok===true && valid.activeTeamCount===7 && valid.allCurrentUsersCovered===true,
  functionalProfiles: JSON.stringify(valid.functionalProfiles)===JSON.stringify(['asesor','direccion','operativo']),
  actionCoverage: valid.actions.length===7 && valid.membershipsPlanned===7 && valid.passwordEmailsPlanned===7,
  dynamicExistingMissingMix: valid.linksPlanned===2 && valid.createsPlanned===5,
  noGenericNameHardcode: valid.genericOwnerUsesNames===false,
  countFailure: countFailure.ok===false && countFailure.errors.some(x=>x.includes('ACTIVE_TEAM_COUNT_EXPECTED_7_FOUND_6')),
  duplicateFailure: duplicateFailure.ok===false && duplicateFailure.errors.includes('TEAM_EMAIL_DUPLICATE'),
  bootstrapAdminFailure: adminFailure.ok===false && adminFailure.errors.includes('BOOTSTRAP_ADMIN_REQUIRED'),
  futurePath: future.ok===true && future.operation==='normal_onboarding_callable_after_bootstrap' && future.requiresExistingAdminMembership===true
};
const ok = Object.values(checks).every(Boolean);
const result = {
  schemaVersion:'orbit360-auth-foundation-all-team-source-only-fixtures-v1',
  ok,
  checks,
  currentUsersCovered: valid.activeTeamCount || 0,
  expectedCurrentUsers: 7,
  functionalProfilesCovered: valid.functionalProfilesCovered || 0,
  futureUserPathSupported: future.ok===true,
  negativeCases: 3,
  operationalCapabilitiesUsed: 0,
  containsPII:false,
  containsSecrets:false
};
console.log(JSON.stringify(result));
process.exit(ok?0:41);
