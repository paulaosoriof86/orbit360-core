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

// UAT2-01: the administrative tally and filter consume the same canonical
// B4-003 mobile shell: eight interactive columns need two explicit rows at
// 320px. Static layout guard; authenticated touch/visual UAT remains required.
const infra=read('orbit360-platform/styles/infra.css');
assert.match(infra,/@media\(max-width:560px\)\{\s*\.topbar\{grid-template-columns:36px minmax\(0,1fr\) repeat\(6,34px\)\}/,
 'MOBILE_EIGHT_COLUMN_GRID_REQUIRED');checks++;
assert.match(infra,/\.topbar #ops-inbox-bell\{grid-column:7;grid-row:2\}/,'MOBILE_INBOX_EXPLICIT_CELL');checks++;
assert.match(infra,/\.topbar #tb-user\{grid-column:8;grid-row:2;min-width:0\}/,'MOBILE_ACCOUNT_NOT_OVERLAPPED');checks++;
assert.match(infra,/@media\(max-width:350px\)\{\s*\.topbar\{grid-template-columns:32px minmax\(0,1fr\) repeat\(6,30px\);column-gap:4px;padding-left:8px;padding-right:8px\}/,
 'TINY_MOBILE_REQUIRES_COMPACT_COLUMNS');checks++;
const fixedWidth=32+6*30+7*4+2*8;
assert.ok(fixedWidth<320,'MOBILE_320_FIXED_TRACKS_EXCEED_VIEWPORT');checks++;

// UAT2-01: the administrative tally and filter consume the same canonical
// classifier; synthetic only, not signed-in authorization or LIVE acceptance.
const adminFrom=team.indexOf('  function arr(v) {'),adminTo=team.indexOf('  function active(a)',adminFrom);
assert.ok(adminFrom>=0&&adminTo>adminFrom,'ADMIN_CLASSIFIER_SOURCE_BOUNDS');checks++;
const adminContext={Orbit:{productRoleTaxonomyP0:{canonicalRole:r=>r==='Admin'?'AdminTenant':r}},Array,Set};
vm.runInNewContext(team.slice(adminFrom,adminTo)+'\nthis.adminQA={isAdministrative};',adminContext);
for(const [record,want,label] of [
 [{roles:['SuperAdmin','Asesor']},true,'superadmin_multirol'],
 [{roles:['AdminTenant','Operativo']},true,'admintenant_multirol'],
 [{roles:['Dirección']},true,'direccion'],
 [{roles:['Admin']},true,'admin_alias'],
 [{roles:['Finanzas']},true,'finanzas_preserved'],
 [{roles:['Asesor','Operativo']},false,'nonadmin_multirol'],
 [{roles:['Asesor']},false,'asesor_only'],
 [{roles:['Operativo']},false,'operativo_only']
]){expect(adminContext.adminQA.isAdministrative(record),want,'ADMIN_TALLY_'+label);}
assert.match(team,/if \(userFilter === 'admin'\) return team\.filter\(isAdministrative\)/,'ADMIN_FILTER_MATCHES_CLASSIFIER');checks++;
assert.match(team,/const admins = team\.filter\(isAdministrative\)\.length;/,'ADMIN_TALLY_MATCHES_FILTER');checks++;


// UAT2-02. Backend config permissions must be scoped to their exact domain.
// This is a source-only VM regression, not a LIVE or signed-user security PASS.
const cfgText=read('functions/tenant-domain-config.js');
const cfgStart=cfgText.indexOf('function roles(member) {');
const cfgEnd=cfgText.indexOf('async function authorize(',cfgStart);
assert.ok(cfgStart>=0&&cfgEnd>cfgStart,'CONFIG_ROLE_WRITER_BOUNDS');checks++;
const cfgCtx={
  norm:x=>String(x==null?'':x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,''),
  unique:xs=>[...new Set((Array.isArray(xs)?xs:[]).map(String).filter(Boolean))],
  ADMIN_ROLES:new Set(['superadmin','admintenant','direccion','admin']),
  PERMISSIONS:new Set(['config_manage','workflow_config_manage','reconciliation_config_manage','access_config_manage','catalog_config_manage']),
  Set,Array,Object
};
vm.runInNewContext(cfgText.slice(cfgStart,cfgEnd)+String.fromCharCode(10)+'this.configAuthQA={canManage};',cfgCtx);
const cfgCan=cfgCtx.configAuthQA.canManage,cfgDomains=['workflow','access','catalogs','reconciliation'];
for(const role of ['SuperAdmin','AdminTenant','Dirección','Admin'])
  for(const domain of cfgDomains)expect(cfgCan({permissions:[]},domain,role),true,'CONFIG_ADMIN_'+role+'_'+domain);
for(const [grant,allowedDomain] of [
  ['workflow_config_manage','workflow'],['access_config_manage','access'],
  ['catalog_config_manage','catalogs'],['reconciliation_config_manage','reconciliation']
])
  for(const domain of cfgDomains)expect(cfgCan({permissions:[grant]},domain,'Operativo'),domain===allowedDomain,'CONFIG_DOMAIN_'+grant+'_'+domain);
for(const domain of cfgDomains){
 expect(cfgCan({permissions:['config_manage']},domain,'Operativo'),true,'CONFIG_EXPLICIT_GLOBAL_'+domain);
 expect(cfgCan({permissions:[]},domain,'Asesor'),false,'CONFIG_NO_GRANT_'+domain);
}
expect(cfgCan({permisosExtra:['workflow_config_manage']},'access','Asesor'),false,'CONFIG_ADVISOR_FOREIGN_GRANT');
expect(cfgCan({extras:['catalog_config_manage']},'workflow','Asesor'),false,'CONFIG_ADVISOR_EXTRA_FOREIGN_GRANT');
expect(cfgCan({permissions:['unknown']},'access','Operativo'),false,'CONFIG_UNKNOWN_GRANT');


// UAT2 CLIENT360 source semantics: canonical raw values map to approved visible
// classifications without changing a stored record or widening its ID universe.
const c360Src=read('orbit360-platform/modules/cliente360.js');
const clientTypeFrom=c360Src.indexOf('  function tipoClienteVisible(value) {');
const clientTypeTo=c360Src.indexOf('  const esRenovable',clientTypeFrom);
assert.ok(clientTypeFrom>=0&&clientTypeTo>clientTypeFrom,'CLIENT_TYPE_CANONICAL_HELPER_MISSING');checks++;
const typeContext={String};
vm.runInNewContext(c360Src.slice(clientTypeFrom,clientTypeTo)+'\nthis.qaType=tipoClienteVisible;',typeContext);
for(const [raw,want,label] of [
  ['natural','Persona','natural'],['Natural','Persona','natural_case'],
  ['PERSONA NATURAL','Persona','persona_natural'],['Persona','Persona','persona_legacy'],
  ['juridica','Empresa','juridica'],['jurídica','Empresa','juridica_accent'],
  ['Persona Jurídica','Empresa','persona_juridica'],['Empresa','Empresa','empresa_legacy'],
  ['', '', 'missing_unknown'],['Sin clasificar','Sin clasificar','unknown_not_invented']
])expect(typeContext.qaType(raw),want,'CLIENT_TYPE_'+label);
assert.match(c360Src,/!f\.tipo \|\| tipoClienteVisible\(c\.tipo\) === f\.tipo/,'CLIENT_TYPE_FILTER_CANONICAL');checks++;
assert.match(c360Src,/rows\.filter\(c => tipoClienteVisible\(c\.tipo\) === 'Empresa'\)/,'CLIENT_TYPE_KPI_LEGAL');checks++;
assert.match(c360Src,/rows\.filter\(c => tipoClienteVisible\(c\.tipo\) === 'Persona'\)/,'CLIENT_TYPE_KPI_NATURAL');checks++;
assert.doesNotMatch(c360Src,/\$\{c\.tipo\}<\/span>/,'CLIENT_TYPE_RAW_HTML_LEAK');checks++;
const entry=read('orbit360-platform/index.html');
assert.match(entry,/modules\/cliente360\.js\?v=20261018-b4003-uat2-clienttype-canonical/,'CLIENT_TYPE_CURRENT_CACHE_KEY');checks++;
assert.match(entry,/modules\/equipo\.js\?v=20261018-b4003-uat2-admin-roster/,'EQUIPO_CURRENT_CACHE_KEY');checks++;

// Real-browser UAT found that reloading Asesor/CO kept the role but reset the
// country to Todos and left finance projections unavailable. Country is a
// UID+tenant-bound preference, never authority to read another country.
const countryStart=app.indexOf('  function countryContext(){');
const countryEnd=app.indexOf('  function preferredLanding(){',countryStart);
assert.ok(countryStart>=0&&countryEnd>countryStart,'COUNTRY_AUTH_RESTORE_OWNER_MISSING');checks++;
const persisted=new Map(),selector={value:'TODOS'};
const countryCtx={
  clean:v=>String(v==null?'':v).trim(),
  Orbit:{auth:{productUser:{uid:'uid-paula',tenantId:'tenant-ays',productReadOnly:true,
    activeRole:'Asesor',countries:['GT','CO']}},pais:'TODOS'},
  window:{sessionStorage:{getItem:k=>persisted.get(k)||null,setItem:(k,v)=>persisted.set(k,v)}},
  document:{getElementById:id=>id==='pais-sel'?selector:null},Array,Set,String,encodeURIComponent
};
vm.runInNewContext(app.slice(countryStart,countryEnd)+'\nthis.countryQA={persistCountry,restoreCountry};',countryCtx);
expect(countryCtx.countryQA.persistCountry('CO'),true,'AUTHORIZED_ADVISOR_COUNTRY_STORED');
countryCtx.Orbit.pais='TODOS';
expect(countryCtx.countryQA.restoreCountry(),true,'AUTHORIZED_COUNTRY_RESTORED');
expect(countryCtx.Orbit.pais,'CO','ADVISOR_CO_SURVIVES_RELOAD');
expect(selector.value,'CO','COUNTRY_COMBO_MATCHES_RESTORED_COUNTRY');
expect(countryCtx.countryQA.persistCountry('MX'),false,'FOREIGN_COUNTRY_DENIED');
expect(countryCtx.Orbit.pais,'CO','DENIED_COUNTRY_DOES_NOT_SWITCH_CONTEXT');
countryCtx.Orbit.auth.productUser.uid='uid-other';countryCtx.Orbit.pais='TODOS';
expect(countryCtx.countryQA.restoreCountry(),true,'OTHER_UID_HAS_OWN_COUNTRY_CONTEXT');
expect(countryCtx.Orbit.pais,'TODOS','COUNTRY_PREFERENCE_NOT_SHARED_ACROSS_UIDS');
countryCtx.Orbit.auth.productUser.uid='uid-paula';countryCtx.Orbit.auth.productUser.tenantId='tenant-other';
expect(countryCtx.countryQA.restoreCountry(),true,'OTHER_TENANT_HAS_OWN_COUNTRY_CONTEXT');
expect(countryCtx.Orbit.pais,'TODOS','COUNTRY_PREFERENCE_NOT_SHARED_ACROSS_TENANTS');
countryCtx.Orbit.auth.productUser.tenantId='tenant-ays';countryCtx.Orbit.auth.productUser.countries=['GT'];
expect(countryCtx.countryQA.restoreCountry(),true,'COUNTRY_REVALIDATED_AFTER_MEMBERSHIP_CHANGE');
expect(countryCtx.Orbit.pais,'GT','REVOKED_COUNTRY_NOT_RESTORED');
expect(countryCtx.countryQA.persistCountry('TODOS'),false,'SINGLE_COUNTRY_TODOS_NOT_WIDENED');
countryCtx.Orbit.auth.productUser=null;
expect(countryCtx.countryQA.restoreCountry(),false,'UNAUTHENTICATED_CONTEXT_NOT_RESTORED');
assert.match(entry,/!Orbit\.productAppP0\.persistCountry\(next\)/,'COUNTRY_SELECTOR_MUST_PERSIST_VALIDATED_CHOICE');checks++;

console.log('B4_003_FIRST_PAINT_TEAM_ROLE_READINESS_SOURCE_VM_QA_PASS checks='+checks+' no_remote_access no_writes');
