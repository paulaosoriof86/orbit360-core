import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';

const ROOT = 'orbit360-platform';
const PATHS = {
  module: `${ROOT}/modules/aseguradoras.js`,
  projection: `${ROOT}/modules/aseguradoras-frontend-projection-v20260716.js`,
  pwa: `${ROOT}/core/pwa.js`,
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

const moduleSource = read(PATHS.module);
const projectionSource = read(PATHS.projection);
const pwaSource = read(PATHS.pwa);
const configSource = read(PATHS.config);
const summarySource = read(PATHS.summary);

check(/Orbit\.modules\.aseguradoras\s*=/.test(moduleSource), 'CANONICAL_MODULE_MISSING');
check(/function\s+ficha\s*\(/.test(moduleSource), 'CANONICAL_FICHA_MISSING');
check(/dataset\.mode|data-mode/.test(projectionSource), 'FICHA_MODE_PROJECTION_MISSING');
check(/canonicalRendererPreserved\s*:\s*true/.test(projectionSource), 'CANONICAL_RENDERER_NOT_PRESERVED');
check(/writesKnowledge\s*:\s*false/.test(projectionSource), 'PROJECTION_WRITE_GUARD_MISSING');
check(/enablesCotizador\s*:\s*false/.test(projectionSource), 'COTIZADOR_ENABLE_GUARD_MISSING');
check(/enablesComparativo\s*:\s*false/.test(projectionSource), 'COMPARATIVO_ENABLE_GUARD_MISSING');
check(/loadMappedSummary/.test(projectionSource), 'MAPPED_SUMMARY_LOADER_MISSING');
check(/mappedSummaryRows/.test(projectionSource), 'MAPPED_SUMMARY_MERGE_MISSING');
check(/Mapeado[^\n]*pendiente de sincronización/.test(projectionSource), 'MAPPED_SYNC_STATUS_MISSING');

check(/function\s+installLegalGate\s*\(/.test(pwaSource), 'LEGAL_IDEMPOTENCY_GUARD_MISSING');
check(/data-orbit-legal-scope/.test(pwaSource), 'LEGAL_SCOPE_MARKER_MISSING');
check(/function\s+installMobileNavigation\s*\(/.test(pwaSource), 'MOBILE_NAV_GUARD_MISSING');
check(/stopImmediatePropagation/.test(pwaSource), 'MOBILE_DUPLICATE_HANDLER_GUARD_MISSING');
check(/classList\.toggle\('sb-open'/.test(pwaSource), 'MOBILE_BODY_STATE_MISSING');

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
  legalIdempotencyGuard: true,
  mobileNavigationGuard: true,
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
