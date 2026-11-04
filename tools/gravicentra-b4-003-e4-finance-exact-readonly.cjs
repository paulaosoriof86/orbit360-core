'use strict';
/*
 * B4-003 E4: compare the EXACT Cobros owner and Reportes consumer functions
 * against current tenant Firestore rows, without data/rules/auth/hosting writes.
 * Business identifiers NEVER enter public CI logs or plain-text artifacts.
 * A once-only public RSA key encrypts a bounded ID-level diagnostic for the
 * locally held private key. This is NOT signed-role or release acceptance.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const TENANT = 'alianzas-soluciones';
const PROJECT = 'ays-orbit-360-lab';
const COLLECTIONS = ['clientes', 'aseguradoras', 'polizas', 'cobros', 'carteraPrimas', 'recibosEsperados'];
const SOURCE_ROOT = process.argv.includes('--selftest') && process.env.B4_AUDIT_SOURCE_ROOT
  ? path.resolve(process.env.B4_AUDIT_SOURCE_ROOT)
  : path.resolve(__dirname, '..', 'orbit360-platform');
const src = file => fs.readFileSync(path.join(SOURCE_ROOT, file), 'utf8');
const normCountry = value => ['GT', 'CO'].includes(String(value || '').trim().toUpperCase()) ? String(value).trim().toUpperCase() : '';
const clean = value => String(value == null ? '' : value).trim();
const hash = value => crypto.createHash('sha256').update(String(value)).digest('hex');

function instrument(source, pattern, replacement, label) {
  assert.equal(source.split(pattern).length, 2, 'AUDIT_OWNER_EXPORT_ANCHOR_CHANGED_' + label);
  return source.replace(pattern, replacement);
}

function runtime(data, country) {
  let attemptedWrites = 0;
  const store = {
    all: name => data[name] || [],
    get: (name, id) => (data[name] || []).find(row => clean(row && row.id) === clean(id)) || null,
    where: (name, predicate) => (data[name] || []).filter(predicate),
    find: (name, predicate) => (data[name] || []).find(predicate),
    _productStatus: () => ({ serverConfirmedCollections: COLLECTIONS.slice(), deniedCollections: [], snapshotErrors: {} }),
    _ensureCollections: () => { throw Error('AUDIT_MUST_NOT_FETCH_OR_MUTATE_STORE'); },
    insert: () => { attemptedWrites++; throw Error('AUDIT_WRITE_DENIED'); },
    update: () => { attemptedWrites++; throw Error('AUDIT_WRITE_DENIED'); },
    remove: () => { attemptedWrites++; throw Error('AUDIT_WRITE_DENIED'); }
  };
  const U = {
    finiteNumber: value => (value == null || value === '' || !Number.isFinite(Number(value))) ? null : Number(value),
    daysFromNow: () => 0,
    money: (value, currency) => clean(currency) + ' ' + clean(value),
    moneyShort: (value, currency) => clean(currency) + ' ' + clean(value),
    fmtDate: value => clean(value),
    text: (value, fallback) => clean(value) || fallback,
    esc: value => clean(value),
    now: () => new Date('2026-11-04T12:00:00Z'),
    today: () => '2026-11-04'
  };
  const Orbit = {
    pais: country, store, ui: U, modules: {},
    kit: { banner: () => '' },
    // An unrestricted physical universe is intentional; this test CANNOT certify roles.
    access: { canView: () => true },
    session: { rol: () => 'administracion', asesorId: () => '' },
    auth: { user: () => ({ uid: 'READONLY_FAKE_NOT_AN_AUTH_TEST' }) },
    tenant: { get: () => ({ tenantId: TENANT }) },
    receiptsPortfolioProjectionV920: { dueDate: r => r.fechaLimite || r.vence || r.fechaVencimiento },
    PAISES: [{ id: 'GT' }, { id: 'CO' }, { id: 'TODOS' }]
  };
  const context = vm.createContext({ Orbit, window: { Orbit }, location: { hostname: 'audit.invalid', hash: '#/reportes' }, Date, Map, Set, console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout });
  vm.runInContext(src('core/queries.js'), context, { filename: 'queries.js', timeout: 5000 });
  const cobros = instrument(src('modules/cobros.js'),
    '  return { render, detalle, reportarPago,',
    '  return { __b4003Audit: { buildIndex, rows, portfolioPaymentRows, reportedRows, reportableRows, rowCountry, countryMatches }, render, detalle, reportarPago,', 'COBROS');
  vm.runInContext(cobros, context, { filename: 'cobros.js', timeout: 5000 });
  vm.runInContext(src('modules/cobros-cartera-i65-closure-bridge.js'), context, { filename: 'cobros-cartera-bridge.js', timeout: 5000 });
  const reportes = instrument(src('modules/reportes.js'),
    '  return { render, quitarProg, verFila };',
    '  return { __b4003Audit: { REPORTES, linkedCountry, policyCountry, isSyntheticRecord }, render, quitarProg, verFila };', 'REPORTES');
  vm.runInContext(reportes, context, { filename: 'reportes.js', timeout: 5000 });
  const owner = Orbit.modules.cobros.__b4003Audit;
  const consumer = Orbit.modules.reportes.__b4003Audit;
  assert.ok(owner && consumer, 'AUDIT_INSTRUMENTATION_MISSING');
  const idx = owner.buildIndex();
  const direct = owner.rows(idx);
  const portfolio = owner.portfolioPaymentRows(idx);
  const reported = owner.reportedRows(idx);
  const listed = direct.concat(portfolio, reported);
  const bridge = owner.reportableRows();
  assert.ok(Array.isArray(bridge), 'AUDIT_OWNER_NOT_READY');
  const renderedReport = consumer.REPORTES.cartera.rows();
  assert.ok(Array.isArray(renderedReport), 'AUDIT_REPORT_NOT_READY');
  assert.equal(attemptedWrites, 0, 'AUDIT_ATTEMPTED_BUSINESS_WRITE');
  return { Orbit, idx, owner, consumer, direct, portfolio, reported, listed, bridge, renderedReport, attemptedWrites };
}

function exclusionCategory(row, consumer, Orbit) {
  if (consumer.isSyntheticRecord(row)) return 'SYNTHETIC_QA_OR_LINKED_QA';
  const verified = consumer.linkedCountry(row);
  if (verified === 'GT' || verified === 'CO') return 'VERIFIED_OTHER_COUNTRY';
  const policy = row.polizaId ? Orbit.store.get('polizas', row.polizaId) : null;
  if (row.polizaId && !policy) return 'POLICY_DOCUMENT_MISSING';
  if (policy) {
    const parent = consumer.policyCountry(policy);
    if (!parent) return 'PARENT_POLICY_COUNTRY_UNVERIFIED';
    if (row.clienteId && clean(row.clienteId) !== clean(policy.clienteId)) return 'CHILD_PARENT_CLIENT_MISMATCH';
    if (normCountry(row.pais || row.country) && normCountry(row.pais || row.country) !== parent) return 'CHILD_PARENT_COUNTRY_MISMATCH';
    const ins = row.aseguradoraId ? Orbit.store.get('aseguradoras', row.aseguradoraId) : null;
    if (ins && normCountry(ins.pais) && normCountry(ins.pais) !== parent) return 'CHILD_INSURER_COUNTRY_MISMATCH';
    if (typeof Orbit.q.policyLinkedCountry === 'function' && normCountry(Orbit.q.policyLinkedCountry(row)) !== parent) return 'POLICY_LINKED_VERIFIER_REJECTED';
  }
  const own = normCountry(row.pais || row.country);
  const ins = row.aseguradoraId && Orbit.store.get('aseguradoras', row.aseguradoraId);
  const client = row.clienteId && Orbit.store.get('clientes', row.clienteId);
  const insurer = normCountry(ins && ins.pais), clientCountry = normCountry(client && client.pais);
  if (own && insurer && own !== insurer) return 'CHILD_INSURER_COUNTRY_MISMATCH';
  if (own && clientCountry && !insurer && own !== clientCountry) return 'CHILD_CLIENT_COUNTRY_MISMATCH';
  return 'COUNTRY_UNRESOLVED_OTHER';
}

function audit(data) {
  const summary = {
    schema: 'GRAVICENTRA_B4003_E4_EXACT_OWNER_CONSUMER_PHYSICAL_READONLY_V1',
    gate: 'I6.5/B4-003', project: PROJECT, tenant: TENANT,
    execution: 'READ_ONLY_BOUNDED_PHYSICAL_NO_SIGNED_USER', writes: 0,
    rolesCertified: false, exportBytesCertified: false, syntheticWritesCertified: false,
    productionAccepted: false, result: {}, reportIdExportedPlaintext: false
  };
  const privateFindings = [];
  for (const country of ['GT', 'CO', 'TODOS']) {
    const out = runtime(data, country);
    // Cobros screen is NOT the same stream as its Reportes bridge: the latter
    // explicitly removes 'Anulado'. This was the unclassified GT delta.
    const ownerIdCounts = new Map();
    out.bridge.forEach(row => {
      const id = clean(row.id);
      ownerIdCounts.set(id, (ownerIdCounts.get(id) || 0) + 1);
    });
    const screenOnly = out.listed.filter(row => {
      const id = clean(row.id), available = ownerIdCounts.get(id) || 0;
      if (!available) return true;
      ownerIdCounts.set(id, available - 1);
      return false;
    });
    const screenOnlyByKind = {};
    const screenOnlyByState = {};
    for (const row of screenOnly) {
      const kind = row.__receiptPaymentEvidence ? 'receipt_evidence' : row.__portfolioReceipt ? 'portfolio_projection' : 'direct_cobro';
      const state = clean(row.estado) || 'UNSET';
      screenOnlyByKind[kind] = (screenOnlyByKind[kind] || 0) + 1;
      screenOnlyByState[state] = (screenOnlyByState[state] || 0) + 1;
    }
    const reportIds = out.renderedReport.map(x => clean(x.id));
    const reportIdCounts = new Map();
    reportIds.forEach(id => reportIdCounts.set(id, (reportIdCounts.get(id) || 0) + 1));
    const missing = [];
    out.bridge.forEach(row => {
      const id = clean(row.id);
      const available = reportIdCounts.get(id) || 0;
      if (available) { reportIdCounts.set(id, available - 1); return; }
      const classification = exclusionCategory(row, out.consumer, out.Orbit);
      missing.push({ row, classification });
    });
    const onlyReport = [...reportIdCounts.values()].reduce((n, count) => n + count, 0);
    const causes = {};
    for (const item of missing) causes[item.classification] = (causes[item.classification] || 0) + 1;
    const counts = {
      cobrosListed: out.listed.length, direct: out.direct.length, portfolio: out.portfolio.length,
      receiptEvidence: out.reported.length, ownerBridge: out.bridge.length,
      reportesCommercial: out.renderedReport.length,
      onlyInCobrosScreen: screenOnly.length,
      screenOnlyByState, screenOnlyByKind,
      onlyInCobrosOwner: missing.length, onlyInReportes: onlyReport,
      exclusionsByCause: causes,
      previewCountsMatchSigned: country === 'GT' ? out.listed.length === 2516 && out.renderedReport.length === 2503
        : country === 'CO' ? out.listed.length === 56 && out.renderedReport.length === 56
          : out.listed.length === 2572 && out.renderedReport.length === 2559,
      duplicateCobrosIds: out.listed.length - new Set(out.listed.map(x => clean(x.id))).size
    };
    summary.result[country] = counts;
    for (const row of screenOnly) {
      if (privateFindings.length >= 150) continue;
      const policy = row.polizaId ? out.Orbit.store.get('polizas', row.polizaId) : null;
      const receipt = row.receiptId ? out.Orbit.store.get('recibosEsperados', row.receiptId) : null;
      privateFindings.push({
        stage: 'COBROS_SCREEN_TO_OWNER_BRIDGE', inView: country,
        classification: row.estado === 'Anulado' ? 'ANULADO_ONLY_SCREEN' : 'OTHER_BRIDGE_EXCLUSION',
        itemId: clean(row.id), kind: row.__receiptPaymentEvidence ? 'receipt_evidence' : row.__portfolioReceipt ? 'portfolio_projection' : 'direct_cobro',
        receiptId: clean(row.receiptId || row.reciboId), policyNumber: clean(policy && policy.numero),
        policyId: clean(row.polizaId), clientId: clean(row.clienteId),
        state: clean(row.estado), receiptState: clean(receipt && receipt.estado),
        receiptOperationalState: clean(receipt && receipt.estadoOperativo),
        receiptSourceType: clean(receipt && receipt.sourceType),
        sourceCountry: clean(row.pais), policyCountry: clean(policy && policy.pais),
        synthetic: !!(row.__syntheticQa || row.syntheticQa)
      });
    }
    for (const { row, classification } of missing) {
      if (privateFindings.length >= 150) continue;
      const policy = row.polizaId ? out.Orbit.store.get('polizas', row.polizaId) : null;
      const insurer = row.aseguradoraId ? out.Orbit.store.get('aseguradoras', row.aseguradoraId) : null;
      privateFindings.push({
        stage: 'OWNER_BRIDGE_TO_COMMERCIAL_REPORT',
        inView: country, classification,
        itemId: clean(row.id), itemKind: row.__portfolioReceipt ? 'projected_portfolio' : row.__receiptPaymentEvidence ? 'receipt_evidence' : 'cobro',
        receiptId: clean(row.receiptId || row.reciboId), policyNumber: clean(policy && policy.numero),
        policyId: clean(row.polizaId), clientId: clean(row.clienteId),
        itemCountry: clean(row.pais || row.country), policyCountry: clean(policy && (policy.pais || policy.country)),
        insurerCountry: clean(insurer && insurer.pais), verifierCountry: clean(out.Orbit.q.policyLinkedCountry(row)),
        syntheticRow: !!(row.__syntheticQa || row.syntheticQa),
        syntheticParent: !!(policy && (policy.__syntheticQa || policy.syntheticQa))
      });
    }
  }
  summary.allSignedCountsReproduced = Object.values(summary.result).every(item => item.previewCountsMatchSigned);
  summary.gtScreenToOwnerExcluded = summary.result.GT.onlyInCobrosScreen;
  summary.gtOwnerToReportExcluded = summary.result.GT.onlyInCobrosOwner;
  summary.encryptedItemDetailsCount = privateFindings.length;
  return { summary, privateFindings };
}

function encryptPrivate(result, publicDerBase64) {
  const key = crypto.randomBytes(32), nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(JSON.stringify(result), 'utf8')), cipher.final()]);
  const pub = crypto.createPublicKey({ key: Buffer.from(publicDerBase64, 'base64'), format: 'der', type: 'spki' });
  const encryptedKey = crypto.publicEncrypt({ key: pub, oaepHash: 'sha256', padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, key);
  return { schema: 'B4003_AES256_GCM_RSA_OAEP_SHA256_V1', key: encryptedKey.toString('base64'), nonce: nonce.toString('base64'), authTag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') };
}

async function loadFirestoreRows() {
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  assert.ok(credentialPath && fs.existsSync(credentialPath), 'LAB_CREDENTIAL_NOT_CONFIGURED');
  const credential = JSON.parse(fs.readFileSync(credentialPath, 'utf8'));
  assert.equal(credential.project_id, PROJECT, 'LAB_PROJECT_SCOPE_MISMATCH');
  assert.equal(credential.type, 'service_account', 'LAB_ACCOUNT_SCOPE_MISMATCH');
  const { initializeApp, applicationDefault, deleteApp } = require('firebase-admin/app');
  const { getFirestore } = require('firebase-admin/firestore');
  const app = initializeApp({ credential: applicationDefault(), projectId: PROJECT });
  const result = {};
  try {
    const tenant = getFirestore(app).collection('tenants').doc(TENANT);
    for (const name of COLLECTIONS) {
      const snap = await tenant.collection('data').doc(name).collection('items').limit(6001).get();
      assert.ok(snap.size <= 6000, 'BOUND_REACHED_' + name);
      result[name] = snap.docs.map(d => ({ ...d.data(), id: clean(d.data().id || d.id) }));
    }
  } finally { await deleteApp(app); }
  return result;
}

function selfTest() {
  const rows = {
    clientes: [{ id: 'gt', pais: 'GT' }, { id: 'co', pais: 'CO' }, { id: 'qa', pais: 'GT', __syntheticQa: true }],
    aseguradoras: [{ id: 'ig', pais: 'GT' }, { id: 'ic', pais: 'CO' }],
    polizas: [{ id: 'pg', pais: 'GT', clienteId: 'gt', aseguradoraId: 'ig', numero: 'TEST-A' }, { id: 'pc', pais: 'CO', clienteId: 'co', aseguradoraId: 'ic', numero: 'TEST-B' }, { id: 'pq', pais: 'GT', clienteId: 'qa', aseguradoraId: 'ig', numero: 'QA' }],
    cobros: [{ id: 'a', pais: 'GT', polizaId: 'pg', clienteId: 'gt', estado: 'Pendiente' }, { id: 'b', pais: 'CO', polizaId: 'pc', clienteId: 'co', estado: 'Pendiente' }, { id: 'c', pais: 'GT', polizaId: 'pq', clienteId: 'qa', estado: 'Pendiente' }],
    carteraPrimas: [],
    recibosEsperados: [{ id: 'receiptAnulado', pais: 'GT', polizaId: 'pg', clienteId: 'gt', estado: 'Anulado', estadoOperativo: 'pago_reportado', sourceType: 'client_portal' }]
  };
  const { summary, privateFindings } = audit(rows);
  assert.equal(summary.result.GT.cobrosListed, 3);
  assert.equal(summary.result.GT.onlyInCobrosScreen, 1);
  assert.equal(summary.result.GT.screenOnlyByState.Anulado, 1);
  assert.equal(summary.result.GT.screenOnlyByKind.receipt_evidence, 1);
  assert.equal(summary.result.GT.reportesCommercial, 1);
  assert.equal(summary.result.GT.exclusionsByCause.SYNTHETIC_QA_OR_LINKED_QA, 1);
  assert.equal(summary.result.CO.cobrosListed, 1);
  assert.equal(summary.result.CO.reportesCommercial, 1);
  assert.equal(privateFindings.filter(x => x.inView === 'GT').length, 2);
  assert.equal(summary.result.TODOS.cobrosListed, 4);
  console.log('B4003_E4_SYNTHETIC_SOURCE_READONLY_SELFTEST_PASS');
}

async function main() {
  if (process.argv.includes('--selftest')) { selfTest(); return; }
  assert.ok(process.argv.includes('--real-readonly'), 'READONLY_SCOPE_REQUIRED');
  assert.equal(process.env.GITHUB_REF_NAME, 'recovery/fase-a-clean-20260831', 'WRONG_RELEASE_BRANCH');
  assert.ok(process.env.B4_003_E4_AUDIT_PUBLIC_KEY_DER_B64, 'EPHEMERAL_ENCRYPTION_KEY_REQUIRED');
  assert.ok(process.env.B4_003_E4_AUDIT_OUT, 'AUDIT_AGGREGATE_OUTPUT_REQUIRED');
  const rows = await loadFirestoreRows();
  const result = audit(rows);
  result.summary.sourceGitSha = clean(process.env.GITHUB_SHA);
  result.summary.collectionCounts = Object.fromEntries(COLLECTIONS.map(name => [name, rows[name].length]));
  fs.writeFileSync(process.env.B4_003_E4_AUDIT_OUT, JSON.stringify(result.summary, null, 2));
  const encrypted = encryptPrivate({ sourceGitSha: result.summary.sourceGitSha, findings: result.privateFindings }, process.env.B4_003_E4_AUDIT_PUBLIC_KEY_DER_B64);
  console.log('B4003_ENCRYPTED_ID_DIAGNOSTIC_START');
  console.log(JSON.stringify(encrypted));
  console.log('B4003_ENCRYPTED_ID_DIAGNOSTIC_END');
  console.log('B4003_E4_READONLY_AGGREGATE ' + JSON.stringify(result.summary));
  console.log('B4003_E4_READONLY_NO_PRODUCTION_ACCEPTANCE');
}

main().catch(error => {
  console.error('B4003_E4_AUDIT_HOLD ' + clean(error && error.message).replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 120));
  process.exitCode = 1;
});
