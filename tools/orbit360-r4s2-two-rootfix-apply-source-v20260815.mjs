import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';

const ROOT = process.cwd();
const QUERIES_PATH = path.join(ROOT, 'orbit360-platform/core/queries.js');
const OWNER_PATH = path.join(ROOT, 'orbit360-platform/modules/policy-receipts-v1199-detail-guard.js');
const EXPECTED_QUERIES_CANDIDATE_SHA256 = '1a37503507cd87be00314076e2ccf1b61d29cfbed9d3961486ade96fbab40051';
const EXPECTED_OWNER_CANDIDATE_SHA256 = '3323f09b812d6e3accc8cd151fe28ec3fab2fffa6c41ad622a2f8a147046887b';

const [queriesCandidatePath, ownerCandidatePath, evidencePath] = process.argv.slice(2);
if (!queriesCandidatePath || !ownerCandidatePath || !evidencePath) throw new Error('usage: <queriesCandidate> <ownerCandidate> <evidencePath>');

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(file, 'utf8');
const count = (hay, needle) => hay.split(needle).length - 1;
const writeJson = (file, payload) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(payload, null, 2) + '\n', 'utf8'); };
const clone = value => JSON.parse(JSON.stringify(value));

const baselineQueries = read(QUERIES_PATH);
const baselineOwner = read(OWNER_PATH);
const candidateQueries = read(queriesCandidatePath);
const candidateOwner = read(ownerCandidatePath);
const hashes = {
  baselineQueries: sha256(baselineQueries),
  baselineOwner: sha256(baselineOwner),
  candidateQueries: sha256(candidateQueries),
  candidateOwner: sha256(candidateOwner)
};
if (hashes.candidateQueries !== EXPECTED_QUERIES_CANDIDATE_SHA256) throw new Error(`QUERIES_CANDIDATE_SHA_MISMATCH:${hashes.candidateQueries}`);
if (hashes.candidateOwner !== EXPECTED_OWNER_CANDIDATE_SHA256) throw new Error(`OWNER_CANDIDATE_SHA_MISMATCH:${hashes.candidateOwner}`);
if (hashes.baselineQueries === hashes.candidateQueries || hashes.baselineOwner === hashes.candidateOwner) throw new Error('BASELINE_ALREADY_APPLIED_UNEXPECTED');
if (count(candidateQueries, 'function clientIndex()') !== 1) throw new Error('QUERIES_CLIENT_INDEX_NOT_BOUND_ONCE');
if (count(candidateOwner, 'q.clientesResumenIndex = function') !== 1) throw new Error('OWNER_SUMMARY_INDEX_NOT_BOUND_ONCE');
new vm.Script(candidateQueries, { filename: 'queries.candidate.js' });
new vm.Script(candidateOwner, { filename: 'owner.candidate.js' });

function makeStore(seed) {
  const metrics = { allCalls: {}, getCalls: {}, whereCalls: {}, findCalls: {}, cloneRows: {}, writes: 0 };
  const store = {
    all(collection) {
      metrics.allCalls[collection] = (metrics.allCalls[collection] || 0) + 1;
      const rows = seed[collection] || [];
      metrics.cloneRows[collection] = (metrics.cloneRows[collection] || 0) + rows.length;
      return rows.map(clone);
    },
    get(collection, id) {
      metrics.getCalls[collection] = (metrics.getCalls[collection] || 0) + 1;
      return store.all(collection).find(row => (row.id || row.uid || row.codigo || row.numero || row.key) === id) || null;
    },
    where(collection, predicate) {
      metrics.whereCalls[collection] = (metrics.whereCalls[collection] || 0) + 1;
      return store.all(collection).filter(predicate);
    },
    find(collection, predicate) {
      metrics.findCalls[collection] = (metrics.findCalls[collection] || 0) + 1;
      return store.all(collection).find(predicate);
    },
    insert() { metrics.writes += 1; throw new Error('WRITE_FORBIDDEN_FIXTURE'); },
    update() { metrics.writes += 1; throw new Error('WRITE_FORBIDDEN_FIXTURE'); },
    remove() { metrics.writes += 1; throw new Error('WRITE_FORBIDDEN_FIXTURE'); }
  };
  return { store, metrics };
}

function makeSandbox(seed, queriesSource, ownerSource, pais = 'GT') {
  const { store, metrics } = makeStore(seed);
  const sandbox = {
    console,
    setTimeout: () => 0,
    clearTimeout: () => {},
    performance: { now: () => Date.now() },
    Map, Set, Date, Math, JSON, Object, Array, String, Number, Boolean, RegExp,
    location: { hash: '' }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.addEventListener = () => {};
  sandbox.document = {
    addEventListener: () => {},
    getElementById: () => null,
    head: { appendChild: () => {} },
    createElement: () => ({
      dataset: {}, style: {}, className: '', id: '',
      set textContent(v) { this._text = v; }, get textContent() { return this._text || ''; },
      addEventListener: () => {}, querySelectorAll: () => [], appendChild: () => {},
      setAttribute: () => {}, getAttribute: () => ''
    })
  };
  sandbox.Orbit = { store, ui: {}, modules: {}, route: { params: {} }, clientProjection: null, pais };
  vm.createContext(sandbox);
  new vm.Script(queriesSource, { filename: 'queries.js' }).runInContext(sandbox);
  new vm.Script(ownerSource, { filename: 'owner.js' }).runInContext(sandbox);
  return { sandbox, metrics };
}

function summaryFixture() {
  const CLIENTS = 430, POLICIES = 1375;
  const seed = { clientes: [], asesores: [], polizas: [], vehiculos: [], cobros: [], comisiones: [], recibosEsperados: [], actividades: [], cancelaciones: [] };
  for (let i = 0; i < CLIENTS; i++) seed.clientes.push({ id:`cli_${i}`, nombre:`Cliente ${i}`, email:`c${i}@example.invalid`, identificacion:`ID${i}`, pais:i%7===0?'CO':'GT', moneda:i%7===0?'COP':'GTQ', tipo:i%5===0?'Empresa':'Persona', ciudad:'Ciudad', segmento:i%9===0?'Premium':'Estándar', asesorId:`ase_${i%7}` });
  for (let i = 0; i < 7; i++) seed.asesores.push({ id:`ase_${i}`, nombre:`Asesor ${i}`, color:'#999' });
  for (let i = 0; i < POLICIES; i++) { const cid=`cli_${i%CLIENTS}`; seed.polizas.push({ id:`pol_${i}`, clienteId:cid, asesorId:`ase_${i%7}`, estado:i%6===0?'Por renovar':'Vigente', prima:1000+(i%100), primaTotal:1000+(i%100), primaNeta:900+(i%100), moneda:(i%CLIENTS)%7===0?'COP':'GTQ' }); }
  for (let i = 0; i < CLIENTS*2; i++) { const cid=`cli_${i%CLIENTS}`; seed.cobros.push({ id:`cob_${i}`, clienteId:cid, estado:i%11===0?'Vencido':i%3===0?'Pagado':'Pendiente', monto:100+(i%50) }); }
  for (let i = 0; i < CLIENTS; i++) { const cid=`cli_${i}`; seed.comisiones.push({ id:`com_${i}`, clienteId:cid, monto:25+(i%7) }); }
  for (let i = 0; i < 120; i++) seed.vehiculos.push({ id:`veh_${i}`, clienteId:`cli_${i%CLIENTS}`, polizaId:`pol_${i}`, marca:'Marca', modelo:'Modelo' });
  return { seed, CLIENTS, POLICIES };
}

function normalizeSummary(r) {
  return { id:r&&r.cli&&r.cli.id, moneda:r&&r.moneda, nPolizas:r&&r.nPolizas, nVigentes:r&&r.nVigentes, primaAnual:r&&r.primaAnual, cobrado:r&&r.cobrado, pendiente:r&&r.pendiente, vencido:r&&r.vencido, comisionGen:r&&r.comisionGen, porRenovar:r&&r.porRenovar, salud:r&&r.salud };
}

function runSummary(queriesSource, ownerSource) {
  const { seed, CLIENTS, POLICIES } = summaryFixture();
  const { sandbox, metrics } = makeSandbox(seed, queriesSource, ownerSource, 'GT');
  const q = sandbox.Orbit.q, S = sandbox.Orbit.store;
  const clients = S.all('clientes');
  let summaryIndexCalls = 0, fallbackSummaryCalls = 0;
  let summaryIndex = null;
  if (typeof q.clientesResumenIndex === 'function') { summaryIndexCalls += 1; summaryIndex = q.clientesResumenIndex(); }
  const resumenDe = client => {
    if (summaryIndex && typeof summaryIndex.get === 'function' && summaryIndex.get(client.id)) return summaryIndex.get(client.id);
    fallbackSummaryCalls += 1;
    return q.clienteResumen(client.id);
  };
  const totPrima = clients.reduce((sum, client) => { const r = resumenDe(client); return sum + (r.moneda === 'COP' ? r.primaAnual / 1000 : r.primaAnual); }, 0);
  const first40 = clients.slice(0, 40).map(client => normalizeSummary(resumenDe(client)));
  return { fixture:{clients:CLIENTS,policies:POLICIES}, metrics, summaryIndexCalls, fallbackSummaryCalls, totPrima, first40, indexSize:summaryIndex instanceof Map ? summaryIndex.size : 0 };
}

function inicioFixture() {
  const CLIENTS=430, POLICIES=1375, COBROS=860;
  const seed={clientes:[],asesores:[],polizas:[],cobros:[],comisiones:[],vehiculos:[],recibosEsperados:[],actividades:[],cancelaciones:[]};
  for(let i=0;i<CLIENTS;i++) seed.clientes.push({id:`cli_${i}`,pais:i%7===0?'CO':'GT',moneda:i%7===0?'COP':'GTQ'});
  for(let i=0;i<7;i++) seed.asesores.push({id:`ase_${i}`,nombre:`Asesor ${i}`,metaPrima:100000});
  for(let i=0;i<POLICIES;i++){const ci=i%CLIENTS;seed.polizas.push({id:`pol_${i}`,clienteId:`cli_${ci}`,asesorId:`ase_${i%7}`,estado:i%9===0?'Cancelada':i%6===0?'Por renovar':'Vigente',prima:1000+(i%100),moneda:ci%7===0?'COP':'GTQ'});}
  for(let i=0;i<COBROS;i++){const ci=i%CLIENTS;seed.cobros.push({id:`cob_${i}`,clienteId:`cli_${ci}`,estado:i%11===0?'Vencido':i%3===0?'Pagado':'Pendiente',monto:100+(i%50),moneda:ci%7===0?'COP':'GTQ'});}
  for(let i=0;i<CLIENTS;i++) seed.comisiones.push({id:`com_${i}`,asesorId:`ase_${i%7}`,monto:25+(i%7),moneda:i%7===0?'COP':'GTQ'});
  return { seed, CLIENTS, POLICIES, COBROS };
}

function runInicio(queriesSource, ownerSource) {
  const { seed, CLIENTS, POLICIES, COBROS } = inicioFixture();
  const { sandbox, metrics } = makeSandbox(seed, queriesSource, ownerSource, 'GT');
  const q = sandbox.Orbit.q;
  const cart = q.carteraGlobal();
  const prima = q.primaVigenteGlobal();
  const board = q.leaderboard().map(x => ({ id:x.asesor.id, prima:x.prima, comision:x.comision, pct:x.pct }));
  return { fixture:{clients:CLIENTS,policies:POLICIES,cobros:COBROS,advisors:7,country:'GT'}, metrics, out:{cart,prima,board} };
}

const summaryBaseline = runSummary(baselineQueries, baselineOwner);
const summaryCandidate = runSummary(candidateQueries, candidateOwner);
const inicioBaseline = runInicio(baselineQueries, baselineOwner);
const inicioCandidate = runInicio(candidateQueries, candidateOwner);

const summarySemanticEqual = JSON.stringify({totPrima:summaryBaseline.totPrima,first40:summaryBaseline.first40}) === JSON.stringify({totPrima:summaryCandidate.totPrima,first40:summaryCandidate.first40});
const inicioSemanticEqual = JSON.stringify(inicioBaseline.out) === JSON.stringify(inicioCandidate.out);
const summaryBaseGets = summaryBaseline.metrics.getCalls.clientes || 0;
const summaryCandidateGets = summaryCandidate.metrics.getCalls.clientes || 0;
const summaryBaseCloneRows = summaryBaseline.metrics.cloneRows.clientes || 0;
const summaryCandidateCloneRows = summaryCandidate.metrics.cloneRows.clientes || 0;
const inicioBaseGets = inicioBaseline.metrics.getCalls.clientes || 0;
const inicioCandidateGets = inicioCandidate.metrics.getCalls.clientes || 0;
const inicioBaseCloneRows = inicioBaseline.metrics.cloneRows.clientes || 0;
const inicioCandidateCloneRows = inicioCandidate.metrics.cloneRows.clientes || 0;

const checks = {
  exactProvenQueriesCandidate: hashes.candidateQueries === EXPECTED_QUERIES_CANDIDATE_SHA256,
  exactProvenOwnerCandidate: hashes.candidateOwner === EXPECTED_OWNER_CANDIDATE_SHA256,
  candidateSyntax: true,
  summarySemanticEqual,
  inicioSemanticEqual,
  summaryBaselineGetsHigh: summaryBaseGets >= 430,
  summaryCandidateGetsZero: summaryCandidateGets === 0,
  summaryIndexCalledOnce: summaryCandidate.summaryIndexCalls === 1,
  summaryFallbackZero: summaryCandidate.fallbackSummaryCalls === 0,
  summaryIndexComplete: summaryCandidate.indexSize === 430,
  summaryCloneReduction: (summaryBaseCloneRows - summaryCandidateCloneRows) >= 180000,
  inicioBaselineGetsHigh: inicioBaseGets >= 3000,
  inicioCandidateGetsZero: inicioCandidateGets === 0,
  inicioCloneReduction: (inicioBaseCloneRows - inicioCandidateCloneRows) >= 1000000,
  writesZero: summaryBaseline.metrics.writes === 0 && summaryCandidate.metrics.writes === 0 && inicioBaseline.metrics.writes === 0 && inicioCandidate.metrics.writes === 0
};
const failed = Object.entries(checks).filter(([,ok]) => !ok).map(([id]) => id);
const evidence = {
  schemaVersion:'orbit360-r4s2-two-rootfix-combined-source-regression-v1',
  generatedAt:new Date().toISOString(),
  ok:failed.length===0,
  status:failed.length ? 'R4S2_TWO_ROOTFIX_COMBINED_SOURCE_REGRESSION_FAIL' : 'R4S2_TWO_ROOTFIX_COMBINED_SOURCE_REGRESSION_PASS',
  classification:failed.length ? 'FUNCTIONAL_DEFECT_ROOTFIX_COMPOSITION_FAIL' : 'FUNCTIONAL_DEFECT_ROOTFIX_COMPOSITION_PASS',
  sourceTargets:['orbit360-platform/core/queries.js','orbit360-platform/modules/policy-receipts-v1199-detail-guard.js'],
  candidateHashes:{queries:hashes.candidateQueries,owner:hashes.candidateOwner},
  baselineHashes:{queries:hashes.baselineQueries,owner:hashes.baselineOwner},
  summary:{semanticEqual:summarySemanticEqual,baseline:{clientGetCalls:summaryBaseGets,clientCloneRows:summaryBaseCloneRows},candidate:{clientGetCalls:summaryCandidateGets,clientCloneRows:summaryCandidateCloneRows,summaryIndexCalls:summaryCandidate.summaryIndexCalls,fallbackSummaryCalls:summaryCandidate.fallbackSummaryCalls,indexSize:summaryCandidate.indexSize},reduction:{clientCloneRows:summaryBaseCloneRows-summaryCandidateCloneRows,ratio:summaryCandidateCloneRows?summaryBaseCloneRows/summaryCandidateCloneRows:null}},
  inicio:{semanticEqual:inicioSemanticEqual,baseline:{clientGetCalls:inicioBaseGets,clientCloneRows:inicioBaseCloneRows},candidate:{clientGetCalls:inicioCandidateGets,clientCloneRows:inicioCandidateCloneRows},reduction:{clientCloneRows:inicioBaseCloneRows-inicioCandidateCloneRows,ratio:inicioCandidateCloneRows?inicioBaseCloneRows/inicioCandidateCloneRows:null}},
  checks,failedCheckIds:failed,
  browserExecuted:false,secretAccess:false,dataAccess:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false
};
writeJson(evidencePath, evidence);
console.log(JSON.stringify(evidence, null, 2));
if (failed.length) process.exit(41);

fs.copyFileSync(queriesCandidatePath, QUERIES_PATH);
fs.copyFileSync(ownerCandidatePath, OWNER_PATH);
