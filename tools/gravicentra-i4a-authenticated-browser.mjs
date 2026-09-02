import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'ays-orbit-360-lab';
const TENANT_ID = 'alianzas-soluciones';
const PREVIEW_URL = String(process.env.PREVIEW_URL || '').replace(/\/$/, '');
const SOURCE_SHA = String(process.env.SOURCE_SHA || '');
const BUILD_ID = String(process.env.BUILD_ID || '');
const OUT_DIR = process.env.I4A_AUTH_EVIDENCE_DIR || process.env.RUNNER_TEMP || process.cwd();
const TARGET_ROLES = ['Dirección','SuperAdmin','AdminTenant','Operativo','Asesor'];
const PRIVILEGED = new Set(['Dirección','SuperAdmin','AdminTenant','Operativo']);

function assert(condition, code) { if (!condition) throw new Error(code); }
function clean(v) { return String(v == null ? '' : v).trim(); }
function canonicalRole(v) {
  const key = clean(v).toLowerCase().replace(/\s+/g,' ');
  const map = {
    'dirección':'Dirección','direccion':'Dirección','director':'Dirección',
    'superadmin':'SuperAdmin','super admin':'SuperAdmin','super_admin':'SuperAdmin','super-admin':'SuperAdmin',
    'admin':'AdminTenant','administrador':'AdminTenant','admin tenant':'AdminTenant','admin_tenant':'AdminTenant','admintenant':'AdminTenant',
    'operativo':'Operativo','operaciones':'Operativo','asesor':'Asesor'
  };
  return map[key] || clean(v);
}
function rolesOf(row) {
  const raw = Array.isArray(row?.roles) ? row.roles : Array.isArray(row?.rolesAsignados) ? row.rolesAsignados : (row?.role || row?.rol ? [row.role || row.rol] : []);
  return [...new Set(raw.map(canonicalRole).filter(Boolean))];
}
function parseServiceAccount() {
  const candidates = [process.env.SA_DEFAULT, process.env.SA_ORBIT360_LAB, process.env.SA_ORBIT_360_LAB].filter(Boolean);
  for (const raw of candidates) {
    try {
      const data = JSON.parse(raw);
      if (data?.type === 'service_account' && data?.project_id === PROJECT_ID && data?.client_email && data?.private_key) return data;
    } catch {}
  }
  throw new Error('I4A_EXISTING_SERVICE_ACCOUNT_NOT_AVAILABLE');
}
async function heartbeat(page) {
  const start = Date.now();
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 20)));
  return Date.now() - start;
}
async function route(page, hash, ready, timeout=7000) {
  const started = Date.now();
  await page.evaluate(h => { location.hash = h; }, hash);
  await page.waitForFunction(ready, null, { timeout });
  return Date.now() - started;
}
async function signInAndActivate(page, token) {
  const started = Date.now();
  const result = await page.evaluate(async (customToken) => {
    const p = window.Orbit?.productRuntimeBrowserProvidersP0;
    if (!p?.initialize) throw new Error('PRODUCT_RUNTIME_PROVIDER_MISSING');
    const ctx = await p.initialize();
    if (!ctx?.modules?.auth?.signInWithCustomToken || !ctx.auth) throw new Error('PRODUCT_AUTH_CUSTOM_TOKEN_QA_UNAVAILABLE');
    await ctx.modules.auth.signInWithCustomToken(ctx.auth, customToken);
    const out = await window.Orbit.productAppP0.activate();
    return { started: out?.started === true, status: window.Orbit.productAppP0.status() };
  }, token);
  assert(result.started, 'PRODUCT_APP_DID_NOT_START');
  await page.waitForFunction(() => window.Orbit?.productAppP0?.status?.().started === true && !document.body.classList.contains('pre-auth'), null, {timeout:10000});
  return { ms: Date.now()-started, status: result.status };
}
async function roleView(page, role) {
  const assigned = await page.evaluate(() => window.Orbit?.session?.allowedRoles?.() || []);
  if (assigned.includes(role)) {
    const switched = await page.evaluate(r => window.Orbit.session.set(r), role);
    assert(switched === true, 'ROLE_SWITCH_FAILED');
    await page.waitForFunction(r => window.Orbit?.session?.rol?.() === r, role, {timeout:3000});
  }
  const active = await page.evaluate(() => window.Orbit?.session?.rol?.() || '');
  assert(active === role, 'ROLE_NOT_ACTIVE');
}
async function basicRoutes(page) {
  const counts = await page.evaluate(() => ({
    clientes: Orbit.store.all('clientes').length,
    polizas: Orbit.store.all('polizas').length,
    aseguradoras: Orbit.store.all('aseguradoras').length
  }));
  assert(counts.clientes > 0, 'CLIENTES_EMPTY');
  assert(counts.polizas > 0, 'POLIZAS_EMPTY');
  assert(counts.aseguradoras > 0, 'ASEGURADORAS_EMPTY');

  const clientMs = await route(page, '#/cliente360', () => window.Orbit?.route?.key === 'cliente360' && !!document.querySelector('#host table.tbl'));
  const clientDom = await page.evaluate(() => ({
    rows: document.querySelectorAll('#host table.tbl tbody tr.clickable').length,
    total: Orbit.store.all('clientes').length,
    bodyText: document.querySelector('#host')?.textContent || ''
  }));
  assert(clientDom.rows > 0, 'CLIENTE360_ROWS_NOT_MATERIALIZED');
  assert(clientDom.bodyText.includes(String(clientDom.total)), 'CLIENTE360_TOTAL_NOT_VISIBLE');
  const clientHeartbeatMs = await heartbeat(page);
  assert(clientHeartbeatMs < 1000, 'CLIENTE360_EVENT_LOOP_BLOCKED');

  const policyMs = await route(page, '#/polizas', () => window.Orbit?.route?.key === 'polizas' && (document.querySelector('#host table') || document.querySelector('#host .page')));
  const policyText = await page.evaluate(() => document.querySelector('#host')?.textContent || '');
  assert(policyText.trim().length > 20, 'POLIZAS_RENDER_EMPTY');
  const policyHeartbeatMs = await heartbeat(page);
  assert(policyHeartbeatMs < 1000, 'POLIZAS_EVENT_LOOP_BLOCKED');

  return { counts, cliente360: { routeMs: clientMs, visibleRows: clientDom.rows, heartbeatMs: clientHeartbeatMs }, polizas: { routeMs: policyMs, heartbeatMs: policyHeartbeatMs } };
}
async function insurerCheck(page, role) {
  await route(page, '#/aseguradoras', () => window.Orbit?.route?.key === 'aseguradoras' && !!document.querySelector('#host'));
  const candidate = await page.evaluate(() => {
    const rows = Orbit.store.all('aseguradoras') || [];
    const row = rows.find(x => x && ((Array.isArray(x.portales) && x.portales.length) || (Array.isArray(x.cuentas) && x.cuentas.length))) || rows[0] || null;
    return row ? { id: row.id, hasPortals: Array.isArray(row.portales) && row.portales.length > 0, hasAccounts: Array.isArray(row.cuentas) && row.cuentas.length > 0, hasCredentialMaterial: Array.isArray(row.portales) && row.portales.some(p => p && (p.password || p.pass || p.contrasena || p.clave || p.credentialRef)) } : null;
  });
  assert(candidate?.id, 'ASEGURADORAS_NO_RECORD');
  await route(page, '#/aseguradoras?ficha='+encodeURIComponent(candidate.id), () => !!document.querySelector('#asg-ficha'));
  await page.waitForTimeout(250);
  const dom = await page.evaluate(() => ({
    portalCards: document.querySelectorAll('#asg-ficha .od-operational-portal-card').length,
    bankCards: document.querySelectorAll('#asg-ficha .od-operational-bank-card').length,
    users: [...document.querySelectorAll('#asg-ficha [data-od-credential-user]')].map(x => (x.textContent||'').trim()),
    revealButtons: document.querySelectorAll('#asg-ficha [data-od-credential-reveal]').length,
    bankNumbers: [...document.querySelectorAll('#asg-ficha [data-od-bank-number]')].map(x => (x.textContent||'').trim())
  }));
  if (PRIVILEGED.has(role)) {
    if (candidate.hasPortals) assert(dom.portalCards > 0, 'ASEGURADORAS_PRIVILEGED_PORTALS_NOT_RENDERED');
    if (candidate.hasAccounts) assert(dom.bankCards > 0, 'ASEGURADORAS_PRIVILEGED_BANKS_NOT_RENDERED');
    if (candidate.hasCredentialMaterial) assert(dom.revealButtons > 0, 'ASEGURADORAS_PRIVILEGED_REVEAL_NOT_AVAILABLE');
    if (candidate.hasAccounts) assert(dom.bankNumbers.some(x => x && !/pendiente/i.test(x)), 'ASEGURADORAS_PRIVILEGED_BANK_NUMBER_NOT_VISIBLE');
  } else if (role === 'Asesor') {
    assert(dom.revealButtons === 0, 'ASEGURADORAS_ADVISOR_CREDENTIAL_REVEAL_EXPOSED');
  }
  return { portalCards: dom.portalCards, bankCards: dom.bankCards, revealButtons: dom.revealButtons, accountNumbersVisible: dom.bankNumbers.filter(x => x && !/pendiente/i.test(x)).length };
}

const serviceAccount = parseServiceAccount();
const adminApp = initializeApp({ credential: cert(serviceAccount), projectId: PROJECT_ID }, 'gravicentra-i4a-readonly');
const adminAuth = getAuth(adminApp);
const db = getFirestore(adminApp);
const membershipSnap = await db.collection('tenants').doc(TENANT_ID).collection('members').get();
const userList = await adminAuth.listUsers(1000);
const usersByUid = new Map(userList.users.map(u => [u.uid,u]));
const selections = new Map();
for (const doc of membershipSnap.docs) {
  const m = doc.data() || {};
  const uid = clean(m.uid || doc.id);
  const user = usersByUid.get(uid);
  if (!user || user.disabled || user.emailVerified !== true || clean(m.status).toLowerCase() !== 'active') continue;
  const roles = rolesOf(m);
  for (const role of TARGET_ROLES) if (!selections.has(role) && roles.includes(role)) selections.set(role,{uid,roles});
}
assert(selections.size > 0, 'I4A_NO_ACTIVE_VERIFIED_MEMBERSHIPS');

fs.mkdirSync(OUT_DIR,{recursive:true});
const evidence = {
  schemaVersion:'gravicentra-i4a-authenticated-browser-v1', gate:'I4A', status:'AUTH_BROWSER_FAIL', sourceSha:SOURCE_SHA, buildId:BUILD_ID, previewUrl:PREVIEW_URL,
  productionTouched:false, dataTouched:false, writesExecuted:0, userIdentitiesRecorded:false, tokensRecorded:false,
  coverage:{requestedRoles:TARGET_ROLES, availableRoles:[...selections.keys()]}, roles:{}, errors:[]
};
let browser;
try {
  browser = await chromium.launch({headless:true});
  for (const [role, selected] of selections) {
    const token = await adminAuth.createCustomToken(selected.uid, { gravicentraI4AReadOnly:true });
    const context = await browser.newContext({ viewport:{width:1440,height:1000} });
    const page = await context.newPage();
    const telemetry={consoleErrors:[],pageErrors:[],sameOriginRequestFailures:[],sameOriginHttpErrors:[]};
    page.on('console',m=>{ if(m.type()==='error') telemetry.consoleErrors.push(m.text().slice(0,300)); });
    page.on('pageerror',e=>telemetry.pageErrors.push(String(e?.message||e).slice(0,300)));
    page.on('requestfailed',r=>{ try{if(new URL(r.url()).origin===new URL(PREVIEW_URL).origin) telemetry.sameOriginRequestFailures.push(r.url());}catch{} });
    page.on('response',r=>{ try{if(new URL(r.url()).origin===new URL(PREVIEW_URL).origin && r.status()>=400) telemetry.sameOriginHttpErrors.push({status:r.status(),url:r.url()});}catch{} });
    const loadStart=Date.now();
    await page.goto(PREVIEW_URL,{waitUntil:'domcontentloaded',timeout:20000});
    const domContentLoadedMs=Date.now()-loadStart;
    await page.waitForFunction(() => !!window.Orbit?.productAppP0 && !!window.Orbit?.productRuntimeBrowserProvidersP0, null, {timeout:5000});
    const activation=await signInAndActivate(page,token);
    await roleView(page,role);
    const basic=await basicRoutes(page);
    const insurer=await insurerCheck(page,role);
    assert(telemetry.pageErrors.length===0,'I4A_AUTH_PAGE_ERRORS');
    assert(telemetry.sameOriginRequestFailures.length===0,'I4A_AUTH_SAME_ORIGIN_REQUEST_FAILURES');
    assert(telemetry.sameOriginHttpErrors.length===0,'I4A_AUTH_SAME_ORIGIN_HTTP_ERRORS');
    evidence.roles[role]={pass:true,domContentLoadedMs,activationMs:activation.ms,basic,insurer,telemetry:{consoleErrorCount:telemetry.consoleErrors.length,pageErrorCount:0,sameOriginRequestFailureCount:0,sameOriginHttpErrorCount:0}};
    await context.close();
  }
  evidence.status='AUTH_BROWSER_PASS';
} catch (error) {
  evidence.errors.push(String(error?.message||error));
  process.exitCode=1;
} finally {
  if(browser) await browser.close().catch(()=>{});
  await deleteApp(adminApp).catch(()=>{});
  fs.writeFileSync(path.join(OUT_DIR,'i4a-authenticated-browser.json'),JSON.stringify(evidence,null,2)+'\n','utf8');
  console.log('I4A_AUTH_BROWSER_STATUS='+evidence.status);
  console.log('I4A_AUTH_ROLE_COVERAGE='+Object.keys(evidence.roles).join(','));
}
