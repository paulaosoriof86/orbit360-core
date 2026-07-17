import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';

const ROOT = 'orbit360-platform';
const PATHS = {
  module: `${ROOT}/modules/aseguradoras.js`,
  router: `${ROOT}/core/router.js`,
  legal: `${ROOT}/core/legal.js`,
  pwa: `${ROOT}/core/pwa.js`,
  access: `${ROOT}/core/access-scope.js`,
  tenantIndex: `${ROOT}/data/tenant-runtime-config-index.js`,
  config: `${ROOT}/data/tenant-alianzas-soluciones-insurers-p10.js`,
  summary: `${ROOT}/data/tenant-config/alianzas-soluciones.aseguradoras-knowledge-summary-v20260716.js`
};

function fail(code, detail = '') {
  throw new Error(`${code}${detail ? `:${detail}` : ''}`);
}
function check(condition, code, detail = '') {
  if (!condition) fail(code, detail);
}
function read(path) {
  check(existsSync(path), 'FILE_NOT_FOUND', path);
  return readFileSync(path, 'utf8');
}
function runBrowserData(source, filename) {
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename });
  return sandbox.window;
}
function executableText(text) {
  return String(text || '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const moduleSource = read(PATHS.module);
const routerSource = read(PATHS.router);
const legalSource = read(PATHS.legal);
const pwaSource = read(PATHS.pwa);
const accessSource = read(PATHS.access);
const tenantIndexSource = read(PATHS.tenantIndex);
const configSource = read(PATHS.config);
const summarySource = read(PATHS.summary);

check(/Orbit\.modules\.aseguradoras\s*=/.test(moduleSource), 'CANONICAL_MODULE_MISSING');
check(/function\s+ficha\s*\(/.test(moduleSource), 'CANONICAL_FICHA_MISSING');
check(/__ownerKnowledgeV20260717\s*:\s*true/.test(moduleSource), 'INSURER_OWNER_KNOWLEDGE_MISSING');
check(/__tenantOrderV20260717\s*:\s*true/.test(moduleSource), 'INSURER_TENANT_ORDER_MISSING');
check(/__consumerGatesSeparatedV20260717\s*:\s*true/.test(moduleSource), 'INSURER_CONSUMER_GATES_MISSING');
check(/function\s+knowledgeSources\s*\(/.test(moduleSource), 'INSURER_KNOWLEDGE_MERGE_MISSING');
check(/function\s+ensureKnowledgeSummaryLoaded\s*\(/.test(moduleSource), 'INSURER_SUMMARY_LOADER_MISSING');
check(/id="asg-order"/.test(moduleSource), 'INSURER_ORDER_CONTROL_MISSING');
check(/estado === 'Habilitado para Cotizador'/.test(moduleSource), 'COTIZADOR_EXPLICIT_GATE_MISSING');
check(/estado === 'Habilitado para Comparativo'/.test(moduleSource), 'COMPARATIVO_EXPLICIT_GATE_MISSING');
check(!/estado === 'Habilitado para Comparativo' \|\| estado === 'Habilitado para Cotizador'/.test(moduleSource), 'CONSUMER_GATES_NOT_SEPARATED');

check(/function\s+toggleMobile\s*\(/.test(routerSource), 'MOBILE_ROUTER_OWNER_MISSING');
check(/stopImmediatePropagation/.test(routerSource), 'MOBILE_DUPLICATE_HANDLER_GUARD_MISSING');
check(/classList\.toggle\('sb-open'/.test(routerSource), 'MOBILE_BODY_STATE_MISSING');
check(/Orbit\.access\.can\(r, 'view'\)|Orbit\.access\.can\(route, 'view'\)/.test(routerSource), 'ROUTER_ACCESS_GATE_MISSING');
check(!/aseguradoras-frontend-projection-v20260716\.js/.test(routerSource), 'INSURER_PROJECTION_BRIDGE_STILL_LOADED');
check(!/aseguradoras-candidate-actions\.js/.test(routerSource), 'INSURER_CANDIDATE_ACTIONS_STILL_LOADED');

check(/__ownerIdempotent\s*:\s*true/.test(legalSource), 'LEGAL_OWNER_IDEMPOTENCY_MISSING');
check(/data-legal-gate/.test(legalSource), 'LEGAL_SCOPE_MARKER_MISSING');
check(/queueCallback/.test(legalSource) && /finish\(scope\)/.test(legalSource), 'LEGAL_CALLBACK_QUEUE_MISSING');

const pwaForbidden = [
  'installLegalGate', 'installMobileNavigation', 'loadRuntimeContracts',
  'session-multirol-visibility', 'client-canonical-view-projection',
  'aseguradoras-frontend-projection', 'aseguradoras-candidate-actions'
];
const pwaLeaks = pwaForbidden.filter(token => pwaSource.includes(token));
check(pwaLeaks.length === 0, 'PWA_OPERATIONAL_BOOTSTRAP_FORBIDDEN', pwaLeaks.join(','));
check(/buildManifest/.test(pwaSource) && /serviceWorker\.register/.test(pwaSource), 'PWA_OWNER_FUNCTIONS_MISSING');

const accessFunctions = [
  'activeRole', 'actorAdvisorId', 'actorUser', 'assignedRoles', 'canView', 'filter',
  'canAccessRecord', 'can', 'deriveClientState', 'duplicateCandidates', 'prepareManual',
  'audit', 'correction', 'scopedStore', 'withScope'
];
const missingAccess = accessFunctions.filter(name => !new RegExp(`\\b${name}\\b`).test(accessSource));
check(missingAccess.length === 0, 'ACCESS_OWNER_SURFACE_INCOMPLETE', missingAccess.join(','));
check(/countryAllowed/.test(accessSource), 'ACCESS_COUNTRY_GATE_MISSING');

const tenantExecutable = executableText(tenantIndexSource);
check(!/password|secret|token|credential|numeroCuenta|cuentaBancaria/i.test(tenantExecutable), 'TENANT_INDEX_SENSITIVE_PAYLOAD');
check(/alianzas-soluciones/.test(tenantIndexSource) && /insurerConfigSrc/.test(tenantIndexSource), 'TENANT_RUNTIME_INDEX_MISSING');

const configWindow = runBrowserData(configSource, PATHS.config);
const configs = configWindow.OrbitTenantInsurerConfigsP10 || [];
const config = configs.find((item) => item && item.tenantId === 'alianzas-soluciones');
check(config, 'TENANT_INSURER_CONFIG_MISSING');
check(Array.isArray(config.preferredInsurerCountryOrder), 'PREFERRED_COUNTRY_ORDER_MISSING');
check(config.preferredInsurerCountryOrder.join(',') === 'GT,CO', 'PREFERRED_COUNTRY_ORDER_INVALID', config.preferredInsurerCountryOrder.join(','));
check(config.knowledgeSummarySrc === 'data/tenant-config/alianzas-soluciones.aseguradoras-knowledge-summary-v20260716.js', 'KNOWLEDGE_SUMMARY_SRC_INVALID');

const summaryWindow = runBrowserData(summarySource, PATHS.summary);
const registries = summaryWindow.OrbitTenantInsurerKnowledgeSummaries || [];
const summary = registries.find((item) => item && item.tenantId === 'alianzas-soluciones');
check(summary, 'MAPPED_SUMMARY_MISSING');
check(summary.containsCommercialRates === false, 'SUMMARY_COMMERCIAL_RATES_FORBIDDEN');
check(summary.containsPII === false, 'SUMMARY_PII_FORBIDDEN');
check(summary.containsSecrets === false, 'SUMMARY_SECRETS_FORBIDDEN');
check(summary.enablesCotizador === false, 'SUMMARY_COTIZADOR_ENABLE_FORBIDDEN');
check(summary.enablesComparativo === false, 'SUMMARY_COMPARATIVO_ENABLE_FORBIDDEN');

const insurers = Array.isArray(summary.insurers) ? summary.insurers : [];
const sources = insurers.flatMap((item) => Array.isArray(item.sources) ? item.sources : []);
const excel = sources.filter((item) => /excel/i.test(String(item.tipoFuente || ''))).length;
const pdf = sources.filter((item) => /pdf/i.test(String(item.tipoFuente || ''))).length;
const facts = sources.reduce((total, item) => total + (Number(item.facts) || 0), 0);

check(insurers.length === 6, 'MAPPED_INSURER_COUNT_INVALID', String(insurers.length));
check(sources.length === 11, 'MAPPED_SOURCE_COUNT_INVALID', String(sources.length));
check(excel === 8, 'MAPPED_EXCEL_COUNT_INVALID', String(excel));
check(pdf === 3, 'MAPPED_PDF_COUNT_INVALID', String(pdf));
check(facts === 6357, 'MAPPED_FACT_COUNT_INVALID', String(facts));

const forbidden = [
  /[A-Za-z]:\\/, /\/Users\//, /\/home\//,
  /api[_-]?key/i, /client[_-]?secret/i, /private[_-]?key/i,
  /password/i, /authorization\s*:/i, /BEGIN PRIVATE KEY/i
];
for (const pattern of forbidden) {
  check(!pattern.test(summarySource), 'FORBIDDEN_CONTENT_IN_SUMMARY', String(pattern));
}

const result = {
  ok: true,
  canonicalRendererPreserved: true,
  insurerKnowledgeOwner: true,
  tenantOrderOwner: true,
  consumerGatesSeparated: true,
  legalIdempotencyOwner: true,
  mobileNavigationOwner: true,
  pwaOwnerOnly: true,
  preferredCountryOrder: config.preferredInsurerCountryOrder,
  mappedInsurers: insurers.length,
  mappedSources: sources.length,
  excelSources: excel,
  pdfSources: pdf,
  mappedFacts: facts,
  containsCommercialRates: false,
  containsPII: false,
  containsSecrets: false,
  enablesCotizador: false,
  enablesComparativo: false
};

console.log(`ORBIT360_FRONTEND_KNOWLEDGE_RECOVERY:${JSON.stringify(result)}`);
