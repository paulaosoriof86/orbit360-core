import fs from 'node:fs';

const files = {
  tenant: 'orbit360-platform/data/tenant-alianzas-soluciones-insurers-p10.js',
  module: 'orbit360-platform/modules/aseguradoras.js',
  summary: 'orbit360-platform/data/tenant-config/alianzas-soluciones.aseguradoras-knowledge-summary-v20261003.js'
};
const text = Object.fromEntries(Object.entries(files).map(([k,p]) => [k, fs.readFileSync(p,'utf8')]));
const assertions = {};
function need(name, ok) {
  assertions[name] = !!ok;
  if (!ok) throw new Error('B4_003_R9_KNOWLEDGE_CONTRACT:'+name);
}

need('tenantPointsCurrentSummary', text.tenant.includes("knowledgeSummarySrc: 'data/tenant-config/alianzas-soluciones.aseguradoras-knowledge-summary-v20261003.js'"));
need('summaryIsTenantScoped', text.summary.includes("tenantId: 'alianzas-soluciones'") || text.summary.includes('"tenantId": "alianzas-soluciones"'));
need('summaryDoesNotAutoEnableCotizador', /enablesCotizador["']?\s*:\s*false/.test(text.summary));
need('summaryDoesNotAutoEnableComparativo', /enablesComparativo["']?\s*:\s*false/.test(text.summary));
need('aseguateSourceBacked', text.summary.includes('Tasas AseGuate.xlsx') && text.summary.includes('AUTO-38594'));
need('aseguateIssuanceFivePct', text.summary.includes('5% de prima neta'));
need('aseguateEightPaymentRate', text.summary.includes('5.37%'));
need('aseguateTenPaymentRate', text.summary.includes('8.42%'));
need('columnaSourceBacked', text.summary.includes('Cotizador VA 2026 V1.4.xlsx') && text.summary.includes('VA-41977'));
need('columnaZeroIssuance', text.summary.includes('0% en cotizador/pólizas'));
need('columnaZeroInstallment', text.summary.includes('0% en póliza muestra de 10 pagos'));
need('axaColpatriaSamples', text.summary.includes('Póliza AXA Colpatria Auto 10104') && text.summary.includes('Póliza AXA Colpatria Auto 9414'));
need('previsoraSample', text.summary.includes('Póliza Previsora Auto 3117159'));
need('sbsFailClosed', text.summary.includes('fuente_recibida_requiere_copia_legible') && text.summary.includes('no pedir transcripción manual'));
need('multiProductGt', ['Vida','Gastos Médicos','Fianzas','Transporte','Responsabilidad Civil'].every(x => text.summary.includes('"ramo": "'+x+'"')));
need('multiProductCo', ['Vida','Salud','Cumplimiento','Transporte','Responsabilidad Civil'].every(x => text.summary.includes('"ramo": "'+x+'"')));
need('moduleMergesSummaryVersions', text.module.includes('function tenantKnowledgeSummaries()') && text.module.includes('function mergeKnowledgeRows(rows)'));
need('moduleShowsKnowledgeFacts', text.module.includes('function knowledgeFactsHtml(row)') && text.module.includes('Conocimiento vigente y observado'));
need('moduleShowsProductRoadmap', text.module.includes('function knowledgeRoadmapHtml(row)') && text.module.includes('Cobertura de conocimiento por producto'));
need('moduleKeepsFailClosedCopy', text.module.includes('El sistema no aplicará valores genéricos en su lugar.'));
need('moduleKeepsManualTariffValidationGate', text.module.includes('Tabla validada y habilitada para cálculo automático'));

const result = {
  schema: 'GRAVICENTRA_I6_5_B4_003_R9_KNOWLEDGE_CONTRACT_V1',
  status: 'PASS',
  files,
  assertions,
  productWrites: 0,
  operationalWrites: 0,
  autoEnable: false
};
console.log(JSON.stringify(result,null,2));
