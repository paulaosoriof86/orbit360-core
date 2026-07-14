import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const platform = path.resolve(here, '..');
const contractPath = path.join(platform, 'core', 'importa-financiero-historico-contract-p0.js');
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
  JSON
};
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(source, context, { filename: contractPath });

const api = context.window.Orbit.importaFinancieroHistoricoP0;
if (!api) throw new Error('Contrato no instalado');

function row(overrides = {}) {
  return {
    idDryRun: 'fh_gt_202605_1_test',
    tenantId: 'tenant-test',
    pais: 'GT',
    moneda: 'GTQ',
    periodo: '2026-05',
    direccion: 'ingreso',
    categoriaCanonica: 'ingreso_comision',
    contraparteRef: 'cp_test',
    contraparteTipo: 'ORGANIZACION',
    diaFuente: 13,
    montoFuente: 100,
    ivaFuente: 12,
    isrRetenidoFuente: 0,
    montoCajaEstimado: 112,
    pendienteFuente: 0,
    estadoFuente: 'REALIZADO',
    candidatoFinmovs: 'LISTO_FINMOVS',
    sourceFile: 'fuente.xlsx',
    sourceSheet: 'AyS GT May 26',
    sourceRow: 7,
    sourceBlock: 'ingreso',
    traceHash: 'a'.repeat(64),
    ...overrides
  };
}

const valid = api.normalize(row());
const validCheck = api.validate(valid);
const wrongCurrency = api.validate(api.normalize(row({ moneda: 'COP' })));
const financing = api.normalize(row({ categoriaCanonica: 'financiamiento_recibido' }));
const pending = api.normalize(row({ estadoFuente: 'PENDIENTE', candidatoFinmovs: 'SOLO_FINANCIERO_HISTORICO' }));
const noDate = api.validate(api.normalize(row({ diaFuente: null, candidatoFinmovs: 'LISTO_HISTORICO_FINMOVS_REQUIERE_FECHA' })));
const dryRun = api.buildDryRun([row(), row({ pais: 'CO', moneda: 'COP', sourceSheet: 'AyS Col May 26' })]);

const assertions = {
  targetCollection: api.TARGET_COLLECTION === 'financiero_historico',
  validGt: validCheck.ok === true,
  countryCurrencyGate: wrongCurrency.ok === false && wrongCurrency.errors.includes('moneda_no_corresponde_pais'),
  financingNature: financing.nature === 'financing' && financing.isOperatingIncome === false,
  commissionNotPremiumCollection: valid.isPremiumCollection === false && valid.esCobro === false,
  pendingHistoricalOnly: pending.candidatoFinmovs === 'SOLO_FINANCIERO_HISTORICO',
  missingDateWarning: noDate.ok === true && noDate.warnings.includes('fecha_exacta_pendiente'),
  dryRunOnly: dryRun.writeAuthorized === false && dryRun.counts.total === 2 && dryRun.counts.valid === 2,
  noForbiddenInference: ['clientes', 'polizas', 'carteraPrimas', 'cobros'].every((name) => api.NEVER_INFER.includes(name))
};

const failed = Object.entries(assertions).filter(([, ok]) => !ok).map(([name]) => name);
const result = {
  ok: failed.length === 0,
  contract: path.relative(platform, contractPath).replaceAll('\\', '/'),
  assertions,
  failed,
  staticViolations,
  sample: {
    targetCollection: valid.destino,
    nature: financing.nature,
    isOperatingIncome: financing.isOperatingIncome,
    writeAuthorized: dryRun.writeAuthorized
  }
};

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
