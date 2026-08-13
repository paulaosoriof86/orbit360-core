import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const platform = path.resolve(here, '..');
const contractPath = path.join(platform, 'core', 'financiero-historico-finmovs-promotion-contract-p0.js');
const source = fs.readFileSync(contractPath, 'utf8');

const forbidden = [
  /Orbit\.store\s*[.\[]/,
  /localStorage\s*[.\[]/,
  /sessionStorage\s*[.\[]/,
  /\.insert\s*\(/,
  /\.update\s*\(/,
  /\.remove\s*\(/
];
const staticViolations = forbidden.filter((pattern) => pattern.test(source)).map(String);
if (staticViolations.length) {
  console.error(JSON.stringify({ ok: false, stage: 'static', staticViolations }, null, 2));
  process.exit(1);
}

const context = {
  window: { Orbit: {} },
  console,
  Number,
  Object,
  Array,
  String,
  RegExp,
  JSON,
  Date,
  Math
};
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(source, context, { filename: contractPath });

const api = context.window.Orbit.financieroHistoricoFinmovsPromotionP0;
if (!api) throw new Error('Contrato de promoción no instalado');

function sourceRow(overrides = {}) {
  return {
    id: 'fh_test_001',
    tenantId: 'tenant-test',
    pais: 'GT',
    moneda: 'GTQ',
    periodo: '2026-05',
    diaFuente: 13,
    direccion: 'ingreso',
    categoriaCanonica: 'ingreso_comision',
    contraparteRef: 'cp_test',
    contraparteTipo: 'ORGANIZACION',
    montoFuente: 100,
    montoCajaEstimado: 112,
    ivaFuente: 12,
    isrRetenidoFuente: 0,
    estadoFuente: 'REALIZADO',
    candidatoFinmovs: 'LISTO_FINMOVS',
    nature: 'operating',
    isOperatingIncome: true,
    isPremiumCollection: false,
    esCobro: false,
    esCartera: false,
    esPoliza: false,
    esCliente: false,
    sourceFile: 'fuente.xlsx',
    sourceSheet: 'AyS GT May 26',
    sourceRow: 7,
    sourceBlock: 'ingreso',
    traceHash: 'a'.repeat(64),
    importBatchId: 'batch_test',
    ...overrides
  };
}

const valid = sourceRow();
const validCheck = api.validate(valid);
const proposal = api.propose([valid], []);
const target = proposal.operations[0] && proposal.operations[0].record;
const duplicateBySource = api.propose([valid], [{ id: 'existing', sourceRecordId: valid.id }]);
const duplicateByTrace = api.propose([sourceRow({ id: 'fh_test_002' })], [{ id: 'existing', sourceTraceHash: 'a'.repeat(64) }]);
const pending = api.validate(sourceRow({ estadoFuente: 'PENDIENTE', candidatoFinmovs: 'SOLO_FINANCIERO_HISTORICO' }));
const opening = api.validate(sourceRow({ nature: 'opening_balance', categoriaCanonica: 'saldo_apertura' }));
const missingDate = api.validate(sourceRow({ diaFuente: null, fecha: '' }));
const wrongCurrency = api.validate(sourceRow({ moneda: 'COP' }));
const financingProposal = api.propose([
  sourceRow({
    id: 'fh_financing_001',
    categoriaCanonica: 'financiamiento_recibido',
    candidatoFinmovs: 'LISTO_FINMOVS_NATURE_FINANCING',
    nature: 'financing',
    isOperatingIncome: false,
    traceHash: 'b'.repeat(64)
  })
], []);
const financingTarget = financingProposal.operations[0] && financingProposal.operations[0].record;
const commissionAsCollection = api.validate(sourceRow({ isPremiumCollection: true }));

const assertions = {
  sourceCollection: api.SOURCE_COLLECTION === 'financiero_historico',
  targetCollection: api.TARGET_COLLECTION === 'finmovs',
  validSource: validCheck.ok === true && validCheck.fecha === '2026-05-13',
  proposalOnly: proposal.writeAuthorized === false && proposal.counts.create === 1,
  targetTrace: target && target.sourceCollection === 'financiero_historico' && target.sourceRecordId === valid.id,
  targetNotPremiumCollection: target && target.isPremiumCollection === false,
  duplicateBySource: duplicateBySource.counts.omit === 1 && duplicateBySource.operations[0].reason === 'duplicado_source_record',
  duplicateByTrace: duplicateByTrace.counts.omit === 1 && duplicateByTrace.operations[0].reason === 'duplicado_trace_hash',
  pendingBlocked: pending.ok === false && pending.errors.includes('estado_no_realizado'),
  openingBlocked: opening.ok === false && opening.errors.includes('saldo_apertura_no_promovible'),
  exactDateRequired: missingDate.ok === false && missingDate.errors.includes('fecha_exacta_requerida'),
  countryCurrencyGate: wrongCurrency.ok === false && wrongCurrency.errors.includes('moneda_no_corresponde_pais'),
  financingPreserved: financingTarget && financingTarget.nature === 'financing' && financingTarget.isOperatingIncome === false,
  commissionNotCollection: commissionAsCollection.ok === false && commissionAsCollection.errors.includes('comision_no_es_recaudo_prima'),
  neverCreatesOperationalDomains: ['clientes', 'polizas', 'carteraPrimas', 'cobros'].every((name) => api.NEVER_CREATE.includes(name))
};

const failed = Object.entries(assertions).filter(([, ok]) => !ok).map(([name]) => name);
const result = {
  ok: failed.length === 0,
  contract: path.relative(platform, contractPath).replaceAll('\\', '/'),
  assertions,
  failed,
  staticViolations,
  sample: {
    action: proposal.operations[0] && proposal.operations[0].action,
    targetId: target && target.id,
    sourceRecordId: target && target.sourceRecordId,
    financingNature: financingTarget && financingTarget.nature,
    writeAuthorized: proposal.writeAuthorized
  }
};

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
