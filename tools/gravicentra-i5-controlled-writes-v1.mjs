import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT = 'ays-orbit-360-lab';
const TENANT = 'alianzas-soluciones';
const BRANCH = 'recovery/fase-a-clean-20260831';
const CONTROL = 'artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';
const INTENT = 'artifacts/orbit360-recovery/release-control/I5_EXECUTION_INTENT.json';
const COMMAND = 'orbit360ProductOperationalCommand';
const PROD = String(process.env.PRODUCTION_URL || 'https://ays-orbit-360-lab.web.app').replace(/\/$/, '');
const OUT = process.env.I5_EVIDENCE_DIR || process.env.RUNNER_TEMP || process.cwd();
const EXECUTE = process.argv.includes('--execute');
const ALLOWED_ROLES = new Set(['direccion', 'superadmin', 'super_admin', 'admintenant', 'admin_tenant', 'admin', 'operativo']);
const RELATED = ['polizas', 'cobros', 'comisiones', 'reclamos', 'gestiones', 'negocios', 'recibosEsperados', 'carteraPrimas'];
const WATCH_TOP = ['notificationOutbox', 'workflowRequests', 'workflowEvents'];
const WATCH_DATA = ['actividades', 'eventosIntegracion', 'cobros', 'comisiones', 'recibosEsperados', 'carteraPrimas', 'reclamos', 'gestiones', 'negocios', 'polizas'];

const clean = v => String(v == null ? '' : v).trim();
const norm = v => clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function need(ok, code) { if (!ok) throw new Error(code); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function serviceAccount() {
  for (const raw of [process.env.SA_DEFAULT, process.env.SA_ORBIT360_LAB, process.env.SA_ORBIT_360_LAB].filter(Boolean)) {
    try {
      const x = JSON.parse(raw);
      if (x?.type === 'service_account' && x?.project_id === PROJECT && x?.client_email && x?.private_key) return x;
    } catch {}
  }
  throw new Error('I5_EXISTING_SERVICE_ACCOUNT_NOT_AVAILABLE');
}
async function waitFor(check, timeout, code) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await check()) return true;
    await sleep(200);
  }
  throw new Error(code);
}
function roleList(member) {
  const raw = Array.isArray(member?.roles) ? member.roles : Array.isArray(member?.rolesAsignados) ? member.rolesAsignados : [member?.activeRole || member?.rolActivo || member?.defaultRole || member?.rolDefault || member?.role || member?.rol].filter(Boolean);
  return [...new Set(raw.map(clean).filter(Boolean))];
}
function activeRole(member, roles) {
  const preferred = clean(member?.activeRole || member?.rolActivo || member?.defaultRole || member?.rolDefault || '');
  if (preferred && roles.includes(preferred) && ALLOWED_ROLES.has(norm(preferred))) return preferred;
  return roles.find(r => ALLOWED_ROLES.has(norm(r))) || '';
}
function dataItems(db, collection) {
  return db.collection('tenants').doc(TENANT).collection('data').doc(collection).collection('items');
}
function tenantCollection(db, collection) {
  return db.collection('tenants').doc(TENANT).collection(collection);
}
async function snapshotIds(ref) {
  const snap = await ref.get();
  return new Map(snap.docs.map(doc => [doc.id, doc.data() || {}]));
}
async function watchSnapshot(db) {
  const out = { top: {}, data: {} };
  for (const c of WATCH_TOP) out.top[c] = await snapshotIds(tenantCollection(db, c));
  for (const c of WATCH_DATA) out.data[c] = await snapshotIds(dataItems(db, c));
  return out;
}
function newDocs(before, after) {
  const rows = [];
  for (const [id, data] of after) if (!before.has(id)) rows.push({ id, data });
  return rows;
}
function containsSynthetic(rows, insurerId) {
  return rows.filter(row => JSON.stringify(row).includes(insurerId));
}
async function relationRefs(db, insurerId) {
  const out = {};
  for (const c of RELATED) {
    const snap = await dataItems(db, c).where('aseguradoraId', '==', insurerId).limit(5).get();
    out[c] = snap.docs.map(d => d.id);
  }
  return out;
}
function relationTotal(refs) { return Object.values(refs).reduce((n, rows) => n + rows.length, 0); }
async function selectActor(db, auth) {
  const snap = await tenantCollection(db, 'members').get();
  for (const doc of snap.docs) {
    const member = doc.data() || {};
    const uid = clean(member.uid || doc.id);
    const roles = roleList(member);
    const selectedRole = activeRole(member, roles);
    if (!uid || !selectedRole) continue;
    const status = norm(member.status || member.estado || 'active');
    if (member.active === false || member.activo === false || ['inactive', 'inactivo', 'blocked', 'bloqueado', 'suspended', 'suspendido'].includes(status)) continue;
    try {
      const user = await auth.getUser(uid);
      if (user.disabled || user.emailVerified !== true) continue;
      return { uid, role: selectedRole, roles, email: user.email || '' };
    } catch {}
  }
  throw new Error('I5_NO_PRIVILEGED_ACTIVE_VERIFIED_MEMBER');
}
async function activate(page, auth, actor) {
  const token = await auth.createCustomToken(actor.uid, { gravicentraI5ControlledWrite: true });
  await page.waitForFunction(() => !!window.Orbit?.productRuntimeBrowserProvidersP0 && !!window.Orbit?.productAppP0, null, { timeout: 8000 });
  const state = await page.evaluate(async tok => {
    const p = Orbit.productRuntimeBrowserProvidersP0;
    const ctx = await p.initialize();
    if (!ctx.auth.currentUser) await ctx.modules.auth.signInWithCustomToken(ctx.auth, tok);
    return Orbit.productAppP0.status?.().started === true ? Orbit.productAppP0.status() : await Orbit.productAppP0.activate();
  }, token);
  need(state?.started === true, 'I5_PRODUCT_APP_DID_NOT_START');
  await page.waitForFunction(() => Orbit?.productAppP0?.status?.().started === true && !document.body.classList.contains('pre-auth'), null, { timeout: 12000 });
  const legal = page.locator('[data-legal-gate].open');
  if (await legal.count()) {
    const chk = legal.locator('#lg-chk');
    const ok = legal.locator('#lg-ok');
    if (await chk.count()) await chk.check();
    if (await ok.count()) await ok.click();
    await legal.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
  }
  const session = await page.evaluate(() => ({ active: Orbit.session?.rol?.() || '', assigned: Orbit.session?.allowedRoles?.() || [] }));
  if (session.active !== actor.role) {
    need(session.assigned.includes(actor.role), 'I5_ACTOR_ROLE_NOT_ASSIGNED');
    const switched = await page.evaluate(r => Orbit.session.set(r), actor.role);
    need(switched === true, 'I5_ACTOR_ROLE_SWITCH_REJECTED');
  }
  await page.waitForFunction(r => Orbit.session?.rol?.() === r, actor.role, { timeout: 5000 });
}
async function gotoInsurers(page, insurerId = '') {
  const hash = insurerId ? `#/aseguradoras?ficha=${encodeURIComponent(insurerId)}` : '#/aseguradoras';
  await page.evaluate(h => { location.hash = h; }, hash);
  await page.waitForFunction(id => {
    if (Orbit?.route?.key !== 'aseguradoras') return false;
    if (!id) return !!document.querySelector('#host .page') && !!document.querySelector('#asg-new');
    return Orbit.store?.get?.('aseguradoras', id) && document.querySelector(`#asg-ficha[data-id="${CSS.escape(id)}"]`);
  }, insurerId, { timeout: 12000 });
}
async function reloadReadback(page, auth, actor, insurerId, mustExist) {
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
  await activate(page, auth, actor);
  if (mustExist) {
    await gotoInsurers(page, insurerId);
    const row = await page.evaluate(id => Orbit.store.get('aseguradoras', id), insurerId);
    need(row && row.id === insurerId, 'I5_SYNTHETIC_INSURER_RELOAD_READBACK_MISSING');
    return row;
  }
  await gotoInsurers(page);
  await page.waitForFunction(id => !Orbit.store?.get?.('aseguradoras', id), insurerId, { timeout: 12000 });
  return null;
}

const cp = readJson(CONTROL);
const intent = readJson(INTENT);
const candidate = cp.certifiedCandidate || {};
if (process.env.GITHUB_REF_NAME) need(process.env.GITHUB_REF_NAME === BRANCH, 'I5_BRANCH_AUTHORITY_INVALID');
need(cp.status === 'I5_IN_PROGRESS', 'I5_CONTROL_STATUS_INVALID');
need(intent.schemaVersion === 'gravicentra-i5-execution-intent-v1', 'I5_INTENT_SCHEMA_INVALID');
need(intent.gate === 'I5', 'I5_INTENT_GATE_INVALID');
need(intent.authority?.controlPlane === CONTROL, 'I5_INTENT_CONTROL_PLANE_BINDING_INVALID');
need(intent.releaseBinding?.sourceSha === candidate.sourceSha, 'I5_INTENT_SOURCE_MISMATCH');
need(intent.releaseBinding?.buildId === candidate.buildId, 'I5_INTENT_BUILD_MISMATCH');
need(Number(intent.releaseBinding?.artifactId) === Number(candidate.artifactId), 'I5_INTENT_ARTIFACT_MISMATCH');
need(intent.releaseBinding?.hostedPayloadDigest === candidate.hostedPayloadDigest, 'I5_INTENT_PAYLOAD_DIGEST_MISMATCH');
need(intent.controlledWrite?.collection === 'aseguradoras', 'I5_INTENT_COLLECTION_INVALID');
need(intent.controlledWrite?.cleanupMode === 'same_server_owner_atomic_audit_plus_remove', 'I5_INTENT_CLEANUP_MODE_INVALID');

if (!EXECUTE) {
  console.log('I5_CONTROLLED_WRITE_HARNESS=READY_NO_EXECUTION');
  console.log('I5_PRODUCTION_TOUCHED=false');
  console.log('I5_DATA_TOUCHED=false');
  console.log('I5_WRITES_EXECUTED=0');
  process.exit(0);
}

const i5 = cp.i5Execution || {};
need(i5.productionDeployAuthorized === true, 'I5_PRODUCTION_DEPLOY_NOT_AUTHORIZED');
need(i5.controlledWritesAuthorized === true, 'I5_CONTROLLED_WRITES_NOT_AUTHORIZED');
need(i5.rollbackPrepared === true, 'I5_ROLLBACK_NOT_PREPARED');
need(process.env.I5_EXECUTION_NONCE && process.env.I5_EXECUTION_NONCE === intent.executionNonce, 'I5_EXECUTION_NONCE_MISSING_OR_MISMATCH');

fs.mkdirSync(OUT, { recursive: true });
const evidence = {
  schemaVersion: 'gravicentra-i5-controlled-write-evidence-v1',
  gate: 'I5', status: 'FAIL', productionUrl: PROD,
  releaseBinding: intent.releaseBinding,
  syntheticInsurerId: '', actor: {}, writes: [],
  productionTouched: true, dataTouched: false, writesExecuted: 0,
  readbackReload: false, finalAbsenceReload: false,
  expectedPersistentAudit: {}, sideEffects: {}, errors: []
};

const app = initializeApp({ credential: cert(serviceAccount()), projectId: PROJECT }, 'gravicentra-i5-controlled-write');
const auth = getAuth(app);
const db = getFirestore(app);
let browser;
try {
  const actor = await selectActor(db, auth);
  evidence.actor = { uidRecorded: false, emailRecorded: false, role: actor.role };
  const beforeWatch = await watchSnapshot(db);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(clean(e?.message || e)));
  await page.goto(PROD, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await activate(page, auth, actor);
  await gotoInsurers(page);
  await page.evaluate(() => {
    window.__giI5Writes = [];
    document.addEventListener('orbit:operational-write:committed', e => window.__giI5Writes.push(e.detail || {}));
    document.addEventListener('orbit:operational-write:failed', e => window.__giI5Writes.push({ failed: true, ...(e.detail || {}) }));
  });
  await page.locator('#asg-new').click();
  const insurerId = clean(await page.locator('#asg-ficha').getAttribute('data-id'));
  need(/^asg[0-9]+$/.test(insurerId), 'I5_SYNTHETIC_INSURER_ID_INVALID');
  evidence.syntheticInsurerId = insurerId;
  await page.waitForFunction(id => (window.__giI5Writes || []).some(x => x.collection === 'aseguradoras' && x.id === id && x.action === 'insert' && x.serverOwned === true && x.failed !== true), insurerId, { timeout: 15000 });
  evidence.writes.push({ action: 'insert', collection: 'aseguradoras', via: 'approved_ui_to_product_store_to_server_owner' });
  evidence.writesExecuted += 1;
  evidence.dataTouched = true;
  const insurerRef = dataItems(db, 'aseguradoras').doc(insurerId);
  await waitFor(async () => (await insurerRef.get()).exists, 10000, 'I5_SYNTHETIC_INSURER_SERVER_READBACK_MISSING');
  const reloaded = await reloadReadback(page, auth, actor, insurerId, true);
  evidence.readbackReload = true;
  need(!/(password|contrasena|secret|token|credentialValue)/i.test(JSON.stringify(reloaded)), 'I5_SYNTHETIC_INSURER_SECRET_MATERIAL_DETECTED');
  const refs = await relationRefs(db, insurerId);
  need(relationTotal(refs) === 0, 'I5_SYNTHETIC_INSURER_UNEXPECTED_RELATION:' + JSON.stringify(refs));

  const auditId = `audasg_i5_${Date.now().toString(36)}`;
  const requestId = `i5_cleanup_${Date.now().toString(36)}_${insurerId}`;
  const cleanup = await page.evaluate(async ({ insurerId: id, auditId: aid, requestId: rid }) => {
    const provider = Orbit.productRuntimeBrowserProvidersP0;
    const m = Orbit.auth?.productUser || {};
    if (!provider || typeof provider.callFunction !== 'function') throw new Error('I5_PRODUCT_PROVIDER_UNAVAILABLE');
    return provider.callFunction('orbit360ProductOperationalCommand', {
      tenantId: m.tenantId,
      activeRole: Orbit.session?.rol?.() || m.activeRole,
      requestId: rid,
      mutations: [
        { action: 'insert', collection: 'auditoriaAsegExterna', id: aid, payload: { id: aid, aseguradoraId: id, cambio: 'I5 controlled synthetic cleanup', motivo: 'Validación LIVE Fase A I5', i5Synthetic: true, containsSecrets: false } },
        { action: 'remove', collection: 'aseguradoras', id }
      ]
    }, 'us-central1');
  }, { insurerId, auditId, requestId });
  need(cleanup?.ok === true && cleanup?.serverOwned === true && Number(cleanup?.mutationCount) === 2, 'I5_ATOMIC_CLEANUP_OWNER_REJECTED');
  evidence.writes.push({ action: 'atomic_audit_plus_remove', collections: ['auditoriaAsegExterna', 'aseguradoras'], via: 'same_server_owner', requestIdRecorded: false });
  evidence.writesExecuted += 2;
  await waitFor(async () => !(await insurerRef.get()).exists, 10000, 'I5_SYNTHETIC_INSURER_FINAL_SERVER_ABSENCE_FAILED');
  const auditSnap = await dataItems(db, 'auditoriaAsegExterna').doc(auditId).get();
  need(auditSnap.exists, 'I5_EXTERNAL_AUDIT_NOT_PERSISTED');
  const requestSnap = await tenantCollection(db, 'operationalRequests').doc(requestId).get();
  need(requestSnap.exists && requestSnap.data()?.status === 'committed', 'I5_CLEANUP_OPERATIONAL_REQUEST_MISSING');
  const eventId = clean(cleanup.eventId);
  need(eventId, 'I5_CLEANUP_OPERATIONAL_EVENT_ID_MISSING');
  const eventSnap = await tenantCollection(db, 'operationalEvents').doc(eventId).get();
  need(eventSnap.exists && eventSnap.data()?.containsSecrets === false, 'I5_CLEANUP_OPERATIONAL_EVENT_MISSING_OR_UNSAFE');
  evidence.expectedPersistentAudit = { externalAudit: true, operationalRequest: true, operationalEvent: true };
  await reloadReadback(page, auth, actor, insurerId, false);
  evidence.finalAbsenceReload = true;

  const afterWatch = await watchSnapshot(db);
  const unexpected = {};
  for (const c of WATCH_TOP) {
    const rows = newDocs(beforeWatch.top[c], afterWatch.top[c]);
    const refsToSynthetic = containsSynthetic(rows, insurerId);
    if (refsToSynthetic.length) unexpected[`top:${c}`] = refsToSynthetic.map(x => x.id);
  }
  for (const c of WATCH_DATA) {
    const rows = newDocs(beforeWatch.data[c], afterWatch.data[c]);
    const refsToSynthetic = containsSynthetic(rows, insurerId);
    if (refsToSynthetic.length) unexpected[`data:${c}`] = refsToSynthetic.map(x => x.id);
  }
  const finalRelations = await relationRefs(db, insurerId);
  need(relationTotal(finalRelations) === 0, 'I5_SYNTHETIC_RELATIONS_RESIDUAL:' + JSON.stringify(finalRelations));
  need(Object.keys(unexpected).length === 0, 'I5_UNEXPECTED_SIDE_EFFECTS:' + JSON.stringify(unexpected));
  need(pageErrors.length === 0, 'I5_PAGE_ERRORS:' + JSON.stringify(pageErrors));
  evidence.sideEffects = {
    notifications: 'none_linked_to_synthetic_id', externalSync: 'none_linked_to_synthetic_id',
    financial: 'none_linked_to_synthetic_id', relationships: finalRelations,
    secretMaterial: false, pageErrors: 0
  };
  evidence.status = 'PASS';
} catch (error) {
  evidence.errors.push(clean(error?.stack || error?.message || error));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  await deleteApp(app).catch(() => {});
  fs.writeFileSync(path.join(OUT, 'i5-controlled-writes.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log('I5_CONTROLLED_WRITE_STATUS=' + evidence.status);
  console.log('I5_WRITES_EXECUTED=' + evidence.writesExecuted);
  console.log('I5_SYNTHETIC_READBACK_RELOAD=' + evidence.readbackReload);
  console.log('I5_SYNTHETIC_FINAL_ABSENCE_RELOAD=' + evidence.finalAbsenceReload);
}
