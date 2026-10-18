'use strict';
// B4-003 C03/C04 targeted synthetic regression. Never contacts Firebase or writes data.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const team=read('orbit360-platform/modules/equipo.js');
const bootstrap=read('orbit360-platform/core/backend-product-readonly-bootstrap-p0.js');
const app=read('orbit360-platform/core/product-app-p0.js');
const router=read('orbit360-platform/core/router.js');
const inicio=read('orbit360-platform/modules/inicio.js');
const access=read('orbit360-platform/core/access-scope.js');
const status={serverConfirmedCollections:[],deniedCollections:[],snapshotErrors:{}};
const store={__productReadOnlyP0:true,_productStatus:()=>status};
const roleDefaults=read('orbit360-platform/core/membership-multirol-contract-p0.js');
const w={Orbit:{}};vm.runInNewContext(roleDefaults,{window:w});
const ctx={
 Orbit:{membershipMultirolP0:w.Orbit.membershipMultirolP0,
 productRoleTaxonomyP0:{CANONICAL_ROLES:['Dirección','SuperAdmin','AdminTenant','Operativo','Asesor','Comercial'],canonicalRole:r=>r},
 ROLES:{}},
 S:()=>store,
 ROLE_ORDER:['Dirección','SuperAdmin','AdminTenant','Admin','Finanzas','Operativo','Marketing','Asesor','Asistente'],
 LEGACY_ROLE:'Comercial',
 MODULE_LABELS:{inicio:'Inicio',cliente360:'Cliente 360',polizas:'Pólizas',cobros:'Cobros',cancelaciones:'Cancelaciones',equipo:'Equipo'},
 arr:x=>Array.isArray(x)?x.filter(Boolean):x?[x]:[],
 Set,Object,Array
};
const from=team.indexOf('  function roleDefinition(role) {'),to=team.indexOf('  function userCountries(a) {',from);
assert.ok(from>=0&&to>from,'TEAM_CANONICAL_ROLE_MODEL_NOT_FOUND');
vm.runInNewContext(team.slice(from,to)+'\nthis.qa={roleCatalog,baseModules,teamReadiness,teamReadinessNotice};',ctx);
let checks=0;
const expect=(got,want,name)=>{assert.equal(got,want,name);checks++;};
expect(ctx.qa.teamReadiness(),'pending','UNCONFIRMED_TEAM_NOT_ZERO');
assert.match(ctx.qa.teamReadinessNotice(),/Confirmando el directorio/, 'UNCONFIRMED_TEAM_MUST_SHOW_STATUS');checks++;
status.snapshotErrors.asesores='permission-denied';
expect(ctx.qa.teamReadiness(),'unavailable','DENIED_TEAM_NOT_ZERO');
assert.match(ctx.qa.teamReadinessNotice(),/No fue posible/, 'DENIED_TEAM_NOT_EMPTY');checks++;
delete status.snapshotErrors.asesores;
status.serverConfirmedCollections=['asesores'];
expect(ctx.qa.teamReadiness(),'ready','SERVER_CONFIRMED_TEAM_READY');
const catalog=Array.from(ctx.qa.roleCatalog());
for(const role of ['Dirección','SuperAdmin','AdminTenant','Operativo','Asesor']){
 assert.ok(catalog.includes(role),'VISIBLE_CANONICAL_ROLE_MISSING_'+role);checks++;
}
const dirModules=Array.from(ctx.qa.baseModules(['Dirección']));
assert.ok(dirModules.includes('equipo')&&dirModules.includes('cancelaciones'),'DIRECTION_BASE_ROLE_MODULES_MISSING');checks++;
const adviserModules=Array.from(ctx.qa.baseModules(['Asesor']));
assert.ok(adviserModules.includes('cliente360')&&adviserModules.includes('cobros')&&adviserModules.includes('cancelaciones'),'ADVISOR_APPROVED_READ_SURFACES');checks++;
const operativeModules=Array.from(ctx.qa.baseModules(['Operativo']));
assert.ok(operativeModules.includes('cancelaciones'),'OPERATIVE_CANCELLED_READ');checks++;
assert.match(team,/function usuarios\(\) \{\s*if\(teamReadiness\(\)!=='ready'\)return teamReadinessNotice\(\)/,'FALSE_ZERO_USERS_REGRESSION');checks++;
assert.match(team,/function metas\(\) \{\s*if\(teamReadiness\(\)!=='ready'\)return teamReadinessNotice\(\)/,'FALSE_ZERO_GOALS_REGRESSION');checks++;
assert.match(team,/function permisos\(\)[\s\S]*?const roles=roleCatalog\(\)/,'ROLE_COLUMNS_CANONICAL_NOT_EMPTY');checks++;
assert.match(team,/data-equipo-permissions-unconfirmed/,'CONFIG_CONTRACT_UNVERIFIED_MUST_BE_MARKED');checks++;
assert.match(team,/verified\?'':'disabled'/,'ACCESS_MATRIX_UNVERIFIED_MUST_BE_READONLY');checks++;
assert.doesNotMatch(app,/function prewarmCriticalRoutes\(/,'APP_EAGER_FINANCIAL_FANOUT_STILL_PRESENT');checks++;
assert.doesNotMatch(app,/Orbit\.store\._ensureCollections\(lazy\)/,'APP_OPTIONAL_FANOUT_STILL_PRESENT');checks++;
assert.match(router,/const deps=route==='inicio'\?\['clientes','polizas'\]:REACTIVE_COLLECTIONS\[route\]/,'ROUTE_ONLY_LOAD_REQUIRED');checks++;
assert.match(inicio,/stageMonthlyFinancialRead\(\);\s*if\(typeof host\.querySelectorAll/,'FINANCE_ONLY_AFTER_FIRST_RENDER');checks++;
assert.match(inicio,/class="gi-month-emblem"/,'MONTHLY_PROTECTION_EMOJI_MISSING');checks++;
assert.match(bootstrap,/function protectedRoleMembership\(membership, selected\)[\s\S]*?member\.modulesVisible = Array\.isArray\(modules\)/,'ALL_SELECTED_ROLES_RECOMPOSED');checks++;
assert.doesNotMatch(bootstrap,/if\s*\(String\(selected \|\| ''\)\.toLowerCase\(\) !== 'operativo'\) return member/,'ADVISOR_ROLE_RECOMPILE_BYPASS');checks++;
assert.match(access,/var visible=explicitRoleKey!==undefined\?/,'ROLE_TEAM_MUST_NOT_UNION_GLOBAL');checks++;
assert.match(access,/var teamId = explicitRoleKey!==undefined\?'':/,'TEAM_ID_MUST_NOT_OVERRIDE_EXPLICIT_MAP');checks++;
console.log('B4_003_FIRST_PAINT_TEAM_ROLE_READINESS_SOURCE_VM_QA_PASS checks='+checks+' no_remote_access no_writes');
