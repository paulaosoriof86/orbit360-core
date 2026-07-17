import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(process.cwd(), 'orbit360-platform');
const files = {
  projection: path.join(root, 'modules/aseguradoras-frontend-projection-v20260716.js'),
  candidateActions: path.join(root, 'modules/aseguradoras-candidate-actions.js'),
  projectionCss: path.join(root, 'styles/aseguradoras-frontend-projection-v20260716.css'),
  summary: path.join(root, 'data/tenant-config/alianzas-soluciones.aseguradoras-knowledge-summary-v20260716.js'),
  configCore: path.join(root, 'core/tenant-insurer-config-p10.js'),
  config: path.join(root, 'data/tenant-alianzas-soluciones-insurers-p10.js'),
  pwa: path.join(root, 'core/pwa.js'),
  canonical: path.join(root, 'modules/aseguradoras.js'),
  recoveryDoc: path.join(root, 'docs/BLOQUE-RECUPERACION-FRONTEND-CONOCIMIENTO-ASEGURADORAS-20260716.md')
};

function fail(message) { throw new Error(message); }
function read(file) { if (!fs.existsSync(file)) fail(`MISSING_FILE:${path.relative(process.cwd(), file)}`); return fs.readFileSync(file, 'utf8'); }
function assert(condition, code) { if (!condition) fail(code); }
function parseJs(source, name) { try { new vm.Script(source, { filename: name }); } catch (error) { fail(`JS_PARSE_FAILED:${name}:${error.message}`); } }

const source = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));
parseJs(source.projection, 'aseguradoras-frontend-projection-v20260716.js');
parseJs(source.candidateActions, 'aseguradoras-candidate-actions.js');
parseJs(source.summary, 'alianzas-soluciones.aseguradoras-knowledge-summary-v20260716.js');
parseJs(source.configCore, 'tenant-insurer-config-p10.js');
parseJs(source.config, 'tenant-alianzas-soluciones-insurers-p10.js');
parseJs(source.pwa, 'pwa.js');
parseJs(source.canonical, 'aseguradoras.js');

assert(source.projection.includes('canonicalRendererPreserved: true'), 'CANONICAL_RENDERER_MARKER_MISSING');
assert(source.projection.includes('writesKnowledge: false'), 'KNOWLEDGE_WRITE_GUARD_MISSING');
assert(source.projection.includes('mappedSummaries'), 'MAPPED_SUMMARY_PROJECTION_MISSING');
assert(source.projection.includes('knowledgeSummarySrc'), 'TENANT_CONFIG_SUMMARY_SOURCE_MISSING');
assert(source.projection.includes('mapeado_pendiente_sincronizacion'), 'MAPPED_SYNC_STATUS_MISSING');
assert(source.projectionCss.includes('repeat(auto-fit,minmax(120px,1fr))'), 'RESPONSIVE_KNOWLEDGE_METRICS_MISSING');
assert(source.pwa.includes('stopImmediatePropagation'), 'MOBILE_BURGER_SINGLE_HANDLER_GUARD_MISSING');
assert(source.pwa.includes('__idempotentGateV20260716'), 'LEGAL_IDEMPOTENCY_GUARD_MISSING');
assert(source.canonical.includes("['tarifas', '🧮 Tarifas y conocimiento']"), 'CANONICAL_TARIFF_TAB_MISSING');
assert(source.recoveryDoc.includes('Mapear, persistir y visualizar son etapas distintas'), 'METHODOLOGY_DOCUMENTATION_MISSING');

const configCoreIndex = source.candidateActions.indexOf('core/tenant-insurer-config-p10.js');
const tenantConfigIndex = source.candidateActions.indexOf('data/tenant-alianzas-soluciones-insurers-p10.js');
const projectionIndex = source.candidateActions.indexOf('modules/aseguradoras-frontend-projection-v20260716.js');
assert(configCoreIndex >= 0, 'TENANT_INSURER_CONFIG_CORE_LOADER_MISSING');
assert(tenantConfigIndex > configCoreIndex, 'TENANT_INSURER_CONFIG_DATA_ORDER_INVALID');
assert(projectionIndex > tenantConfigIndex, 'KNOWLEDGE_PROJECTION_LOADED_BEFORE_TENANT_CONFIG');
assert(source.candidateActions.includes('tenantKnowledgeConfigReady'), 'TENANT_KNOWLEDGE_READINESS_GUARD_MISSING');
assert(source.config.includes('knowledgeSummarySrc'), 'TENANT_KNOWLEDGE_SUMMARY_POINTER_MISSING');

const sandbox = {
  window: {},
  console,
  setTimeout: (fn) => { fn(); return 1; },
  clearTimeout: () => {},
  CustomEvent: function CustomEvent(type, init) { this.type = type; this.detail = init && init.detail; },
  localStorage: { getItem: () => null, setItem: () => {} },
  document: {
    head: { appendChild: () => {} },
    documentElement: { dataset: {} },
    querySelector: () => null,
    getElementById: () => null,
    addEventListener: () => {},
    createElement: (tag) => ({ tagName: tag.toUpperCase(), setAttribute() {}, addEventListener() {}, dataset: {}, style: {} })
  }
};
sandbox.window = sandbox;
sandbox.window.addEventListener = () => {};
sandbox.window.dispatchEvent = () => {};
sandbox.Orbit = {
  modules: { aseguradoras: { render() {}, ficha() {} } },
  ui: { esc: (value) => String(value ?? '') },
  store: { all: () => [], get: () => null },
  tenant: { get: () => ({ tenantId: 'alianzas-soluciones' }) },
  services: {}
};

vm.createContext(sandbox);
vm.runInContext(source.summary, sandbox, { filename: 'summary.js' });
vm.runInContext(source.configCore, sandbox, { filename: 'config-core.js' });
vm.runInContext(source.config, sandbox, { filename: 'config.js' });
vm.runInContext(source.projection, sandbox, { filename: 'projection.js' });

const registry = sandbox.OrbitTenantInsurerKnowledgeSummaries;
assert(Array.isArray(registry) && registry.length === 1, 'SUMMARY_REGISTRY_INVALID');
const summary = registry[0];
assert(summary.tenantId === 'alianzas-soluciones', 'SUMMARY_TENANT_INVALID');
assert(summary.containsCommercialRates === false, 'SUMMARY_MUST_NOT_CONTAIN_COMMERCIAL_RATES');
assert(summary.containsPII === false && summary.containsSecrets === false, 'SUMMARY_SECURITY_FLAGS_INVALID');
assert(summary.enablesCotizador === false && summary.enablesComparativo === false, 'SUMMARY_MUST_NOT_ENABLE_MODULES');
assert(summary.insurers.length === 6, 'SUMMARY_INSURER_COUNT_INVALID');

const sources = summary.insurers.flatMap((insurer) => insurer.sources || []);
assert(sources.length === 11, 'SUMMARY_SOURCE_COUNT_INVALID');
const excelSources = sources.filter((item) => /excel/.test(item.tipoFuente || ''));
const pdfSources = sources.filter((item) => /pdf/.test(item.tipoFuente || ''));
assert(excelSources.length === 8 && pdfSources.length === 3, 'SUMMARY_SOURCE_TYPE_COUNTS_INVALID');
const totalFacts = excelSources.reduce((total, item) => total + Number(item.facts || 0), 0);
assert(totalFacts === 6357, 'SUMMARY_FACT_TOTAL_INVALID');
assert(sources.every((item) => item.pais === 'GT' && item.moneda === 'GTQ'), 'SUMMARY_COUNTRY_CURRENCY_INVALID');
assert(!source.summary.match(/(?:password|passwd|api[_-]?key|access[_-]?token|private[_-]?key)\s*[:=]/i), 'SUMMARY_SECRET_PATTERN_FOUND');
assert(!source.summary.match(/[A-Z]:\\|\/Users\/|\/home\//), 'SUMMARY_LOCAL_PATH_FOUND');

const tenantConfig = sandbox.Orbit.tenantInsurerConfigP10.getTenantConfig('alianzas-soluciones');
assert(tenantConfig && tenantConfig.insurers.length === 6, 'TENANT_CONFIG_NOT_REGISTERED');

const api = sandbox.Orbit.aseguradorasFrontendProjectionV20260716;
assert(api && api.status().summaryLoaded === true, 'PROJECTION_API_OR_SUMMARY_NOT_READY');
assert(api.compareRows({ pais: 'GT', nombre: 'Z' }, { pais: 'CO', nombre: 'A' }) < 0, 'PREFERRED_COUNTRY_ORDER_INVALID');
const aseguate = api.readKnowledge({ id: 'asg-aseguate', nombre: 'Aseguradora Guatemalteca', pais: 'GT', docs: [] });
assert(aseguate.mappedSummaries.length === 3, 'ASEGUATE_MAPPED_SUMMARY_NOT_PROJECTED');
assert(aseguate.sources.length === 3, 'ASEGUATE_SOURCE_PROJECTION_INVALID');
assert(aseguate.projectionFallback === true, 'ASEGUATE_SYNC_PENDING_STATE_INVALID');
assert(aseguate.sources.every((item) => String(item.estado).startsWith('mapeado_')), 'SOURCE_STATUS_NOT_UPGRADED_FROM_READING_PENDING');

console.log(JSON.stringify({
  status: 'PASS',
  block: 'FRONTEND_KNOWLEDGE_RECOVERY_20260716',
  canonicalRendererPreserved: true,
  tenantConfigLoadedBeforeProjection: true,
  preferredCountryOrder: ['GT', 'CO'],
  insurersSummarized: summary.insurers.length,
  sourcesSummarized: sources.length,
  excelSources: excelSources.length,
  pdfSources: pdfSources.length,
  mappedFactsSanitized: totalFacts,
  writesKnowledge: false,
  enablesCotizador: false,
  enablesComparativo: false
}, null, 2));
