#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const checks = [];

function check(id, ok, detail) { checks.push({ id, ok: !!ok, detail: detail || '' }); }
function contains(text, token) { return text.indexOf(token) >= 0; }
function excludes(text, tokens) { return tokens.filter(token => contains(text, token)); }
function executableText(text) {
  return String(text || '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const pwa = read('core/pwa.js');
const router = read('core/router.js');
const legal = read('core/legal.js');
const access = read('core/access-scope.js');
const insurers = read('modules/aseguradoras.js');
const index = read('index.html');

const pwaForbidden = [
  'empalme-v1251-runtime',
  'import-initial-profiles',
  'importar-initial-tenant-lab',
  'installLegalGate',
  'installMobileNavigation',
  'session-multirol-visibility',
  'client-canonical-view-projection',
  'aseguradoras-frontend-projection',
  'aseguradoras-candidate-actions',
  'loadRuntimeContracts'
];
const pwaLeaks = excludes(pwa, pwaForbidden);
check('PWA_OWNER_ONLY', pwaLeaks.length === 0, pwaLeaks.join(', '));
check('PWA_MANIFEST', contains(pwa, 'buildManifest') && contains(pwa, 'serviceWorker.register'), 'manifest + service worker');

check('LEGAL_OWNER_IDEMPOTENT', contains(legal, '__ownerIdempotent') && contains(legal, 'pendingScopes') && contains(legal, 'doneScopes'), 'owner marker/state');
check('LEGAL_ONE_MODAL_SCOPE', contains(legal, 'data-legal-gate') && contains(legal, 'queueCallback') && contains(legal, 'finish(scope)'), 'scope-tagged modal/callback queue');

const routerForbidden = ['empalme-v1251-runtime', 'aseguradoras-candidate-actions', 'import-initial-profiles', 'importar-initial-tenant-lab'];
const routerLeaks = excludes(router, routerForbidden);
check('ROUTER_NO_RETIRED_LOADERS', routerLeaks.length === 0, routerLeaks.join(', '));
check('ROUTER_MOBILE_OWNER', contains(router, 'toggleMobile') && contains(router, 'aria-expanded') && contains(router, 'stopImmediatePropagation'), 'mobile owner');
const routerUsesAccessGate = contains(router, "Orbit.access.can(route, 'view')") || contains(router, "Orbit.access.can(r, 'view')");
const routerAppliesGateToRoute = contains(router, '!active(route)') || contains(router, "Orbit.access.can(route, 'view')");
check('ROUTER_ROUTE_GATE', routerUsesAccessGate && routerAppliesGateToRoute && contains(router, 'No tienes acceso con el rol activo'), 'route gate through active(route)');
check('ROUTER_SINGLE_BOOTSTRAP', contains(router, 'RUNTIME_CONTRACTS') && contains(router, 'loadRuntimeContracts') && contains(router, 'tenant-runtime-config-index.js'), 'slice runtime sequence');
check('ROUTER_PROJECTED_SEARCH', contains(router, 'Orbit.clientProjection.project') && contains(router, 'Orbit.clientProjection.get'), 'global search projection');
check('INSURER_PROJECTION_BRIDGE_RETIRED', !contains(router, 'aseguradoras-frontend-projection-v20260716.js'), 'projection must be integrated in modules/aseguradoras.js');

const accessFunctions = [
  'activeRole', 'actorAdvisorId', 'actorUser', 'assignedRoles', 'canView', 'filter',
  'canAccessRecord', 'can', 'deriveClientState', 'duplicateCandidates', 'prepareManual',
  'audit', 'correction', 'scopedStore', 'withScope', 'roleScopeCeiling',
  'applyRoleScopeCeiling', 'scopeLevel'
];
const missingAccess = accessFunctions.filter(name => !new RegExp('\\b' + name + '\\b').test(access));
check('ACCESS_OWNER_SURFACE', missingAccess.length === 0, missingAccess.join(', '));
check('ACCESS_SCOPE_COUNTRY_FAIL_CLOSED', contains(access, 'countryAllowed') && contains(access, 'return false'), 'country/scope gates');
check('ACCESS_ACTIVE_ROLE_SCOPE_CEILING',
  contains(access, '__activeRoleScopeCeilingV20260721') &&
  contains(access, "if (ALL_ROLES.indexOf(role) >= 0) return 'all'") &&
  contains(access, "if (TEAM_ROLES.indexOf(role) >= 0) return 'team'") &&
  contains(access, "if (OWN_ROLES.indexOf(role) >= 0 || /Asesor/i.test(role)) return 'own'") &&
  contains(access, "return scopeLevel(requested) <= scopeLevel(ceiling) ? requested : ceiling"),
  'active role caps explicit advisor scope');
check('ACCESS_UNKNOWN_ROLE_FAILS_CLOSED', contains(access, "return 'none';") && contains(access, 'roleScopeCeiling(moduleKey)'), 'unknown role ceiling none');

const accessContractRel = 'tools/orbit360-access-active-role-scope-contract-v20260721.js';
check('ACCESS_ROLE_SCOPE_CONTRACT_EXISTS', exists(accessContractRel), accessContractRel);
let accessContract = null;
if (exists(accessContractRel)) {
  const run = spawnSync(process.execPath, [path.join(root, accessContractRel)], { encoding: 'utf8' });
  check('ACCESS_ROLE_SCOPE_CONTRACT_EXECUTES', run.status === 0, String(run.stderr || run.stdout || '').slice(0, 600));
  try { accessContract = JSON.parse(String(run.stdout || '').trim()); }
  catch (error) { check('ACCESS_ROLE_SCOPE_CONTRACT_JSON', false, error.message); }
  if (accessContract) {
    check('ACCESS_ROLE_SCOPE_CONTRACT_PASS', accessContract.status === 'PASS', accessContract.status || 'missing');
    check('ACCESS_ADVISOR_SCOPE_OWN', accessContract.cases && accessContract.cases.advisorExplicitAll === 'own', JSON.stringify(accessContract.cases || {}));
    check('ACCESS_OPERATIVO_SCOPE_TEAM', accessContract.cases && accessContract.cases.operativoExplicitAll === 'team', JSON.stringify(accessContract.cases || {}));
    check('ACCESS_EXPLICIT_NONE_WINS', accessContract.cases && accessContract.cases.explicitNoneAlwaysWins === true, JSON.stringify(accessContract.cases || {}));
    check('ACCESS_SCOPE_TEST_NO_WRITES', accessContract.writes === 0, String(accessContract.writes));
  }
}

const visualRemediationRel = 'tools/orbit360-m1-visual-remediation-contract-v20260722.js';
check('M1_VISUAL_REMEDIATION_CONTRACT_EXISTS', exists(visualRemediationRel), visualRemediationRel);
let visualRemediation = null;
if (exists(visualRemediationRel)) {
  const run = spawnSync(process.execPath, [path.join(root, visualRemediationRel)], { encoding: 'utf8' });
  check('M1_VISUAL_REMEDIATION_CONTRACT_EXECUTES', run.status === 0, String(run.stderr || run.stdout || '').slice(0, 900));
  try { visualRemediation = JSON.parse(String(run.stdout || '').trim()); }
  catch (error) { check('M1_VISUAL_REMEDIATION_CONTRACT_JSON', false, error.message); }
  if (visualRemediation) {
    check('M1_VISUAL_REMEDIATION_CONTRACT_PASS', visualRemediation.status === 'PASS', visualRemediation.status || 'missing');
    check('M1_VISUAL_REMEDIATION_CONTRACT_1038', visualRemediation.contractVersion === '1.0.38', visualRemediation.contractVersion || 'missing');
    check('M1_VISUAL_REMEDIATION_NO_WRITES', visualRemediation.writes === 0, String(visualRemediation.writes));
  }
}

const statesRequired = [
  'Documento recibido', 'Mapeado', 'Persistido', 'Requiere validación', 'Validado',
  'Habilitado para Cotizador', 'Habilitado para Comparativo'
];
const missingStates = statesRequired.filter(value => !contains(insurers, value));
check('INSURER_OWNER_STATES', missingStates.length === 0, missingStates.join(', '));
check('INSURER_CONSUMER_GATES_SEPARATE',
  contains(insurers, "estado === 'Habilitado para Cotizador'") &&
  contains(insurers, "estado === 'Habilitado para Comparativo'") &&
  !contains(insurers, "estado === 'Habilitado para Comparativo' || estado === 'Habilitado para Cotizador'"),
  'Cotizador and Comparativo require explicit independent enablement');
check('INSURER_VALIDATED_NOT_ENABLED',
  !/sirveParaTarifas[^\n]*Validado/.test(insurers) && !/sirveParaReglas[^\n]*estado\s*\!==\s*['"]Requiere validación/.test(insurers),
  'Mapped/Persisted/Validated cannot enable operational consumption');

check('TENANT_CONFIG_INDEX_EXISTS', exists('data/tenant-runtime-config-index.js'), 'declarative tenant index');
if (exists('data/tenant-runtime-config-index.js')) {
  const tenantIndex = executableText(read('data/tenant-runtime-config-index.js'));
  const sensitiveTokens = tenantIndex.match(/password|secret|token|credential|numeroCuenta|cuentaBancaria/gi) || [];
  check('TENANT_INDEX_NO_SECRETS', sensitiveTokens.length === 0, sensitiveTokens.join(', '));
}

check('INDEX_PWA_ONCE', (index.match(/core\/pwa\.js/g) || []).length === 1, 'one PWA owner load');
check('INDEX_ROUTER_ONCE', (index.match(/core\/router\.js/g) || []).length === 1, 'one Router owner load');
check('INDEX_LEGAL_ONCE', (index.match(/core\/legal\.js/g) || []).length === 1, 'one Legal owner load');
check('INDEX_ACCESS_ONCE', (index.match(/core\/access-scope\.js/g) || []).length === 1, 'one Access owner load');

const failed = checks.filter(item => !item.ok);
const result = {
  gate: 'orbit360-block0-architecture-gate-v20260722',
  root,
  accessContract: accessContract ? {
    contract: accessContract.contract,
    advisorExplicitAll: accessContract.cases && accessContract.cases.advisorExplicitAll,
    operativoExplicitAll: accessContract.cases && accessContract.cases.operativoExplicitAll,
    writes: accessContract.writes
  } : null,
  visualRemediationContract: visualRemediation ? {
    contractVersion: visualRemediation.contractVersion,
    revision: visualRemediation.revision,
    writes: visualRemediation.writes
  } : null,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  status: failed.length ? 'NO_GO' : 'GO_STATIC_ARCHITECTURE',
  checks
};
console.log(JSON.stringify(result, null, 2));
process.exit(failed.length ? 1 : 0);
