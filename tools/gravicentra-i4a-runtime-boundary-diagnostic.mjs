import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT = 'ays-orbit-360-lab';
const TENANT = 'alianzas-soluciones';
const PREVIEW = String(process.env.PREVIEW_URL || '').replace(/\/$/, '');
const SOURCE = String(process.env.SOURCE_SHA || '');
const BUILD = String(process.env.BUILD_ID || '');
const OUT = process.env.I4A_BOUNDARY_EVIDENCE_DIR || process.env.RUNNER_TEMP || process.cwd();
const PRIVILEGED = ['Dirección', 'SuperAdmin', 'AdminTenant', 'Operativo'];
const clean = v => String(v == null ? '' : v).trim();
const role = v => {
  const k = clean(v).toLowerCase().replace(/\s+/g, ' ');
  return ({
    'dirección':'Dirección','direccion':'Dirección','director':'Dirección',
    'superadmin':'SuperAdmin','super admin':'SuperAdmin','super_admin':'SuperAdmin','super-admin':'SuperAdmin',
    'admin':'AdminTenant','administrador':'AdminTenant','admin tenant':'AdminTenant','admin_tenant':'AdminTenant','admintenant':'AdminTenant',
    'operativo':'Operativo','operaciones':'Operativo','asesor':'Asesor'
  })[k] || clean(v);
};
const roles = m => {
  const x = Array.isArray(m?.roles) ? m.roles : Array.isArray(m?.rolesAsignados) ? m.rolesAsignados : (m?.role || m?.rol ? [m.role || m.rol] : []);
  return [...new Set(x.map(role).filter(Boolean))];
};
const activeRole = (m, rs) => role(m?.activeRole || m?.rolActivo || m?.defaultRole || m?.rolDefault || m?.roleDefault || rs[0]);
const need = (ok, code) => { if (!ok) throw new Error(code); };
function serviceAccount() {
  for (const raw of [process.env.SA_DEFAULT, process.env.SA_ORBIT360_LAB, process.env.SA_ORBIT_360_LAB].filter(Boolean)) {
    try {
      const x = JSON.parse(raw);
      if (x?.type === 'service_account' && x?.project_id === PROJECT && x?.client_email && x?.private_key) return x;
    } catch {}
  }
  throw new Error('I4A_EXISTING_SERVICE_ACCOUNT_NOT_AVAILABLE');
}

async function activate(page, token) {
  const x = await page.evaluate(async tok => {
    const p = Orbit?.productRuntimeBrowserProvidersP0;
    const c = await p.initialize();
    await c.modules.auth.signInWithCustomToken(c.auth, tok);
    return await Orbit.productAppP0.activate();
  }, token);
  need(x?.started === true, 'PRODUCT_APP_DID_NOT_START');
  await page.waitForFunction(() => Orbit?.productAppP0?.status?.().started === true && !document.body.classList.contains('pre-auth'), null, { timeout: 12000 });
}

async function setRole(page, target) {
  const before = await page.evaluate(() => ({ active: Orbit?.session?.rol?.() || '', assigned: Orbit?.session?.allowedRoles?.() || [] }));
  if (before.active === target) return;
  need(before.assigned.includes(target), 'ROLE_NOT_ASSIGNED:' + target);
  const switched = await page.evaluate(r => Orbit.session.set(r), target);
  need(switched === true, 'ROLE_SWITCH_REJECTED:' + target);
  await page.waitForTimeout(180);
  need(await page.evaluate(() => Orbit?.session?.rol?.() || '') === target, 'ROLE_SWITCH_NOT_EFFECTIVE:' + target);
}

async function go(page, hash, key) {
  await page.evaluate(h => { location.hash = h; }, hash);
  await page.waitForFunction(k => Orbit?.route?.key === k, key, { timeout: 12000 });
  await page.waitForTimeout(350);
}

async function policySnapshot(page, stage) {
  return await page.evaluate(label => {
    const re = /entorno de validaci[oó]n/i;
    const labelOf = p => [p?.id, p?.numero, p?.nombre, p?.descripcion, p?.referencia].map(x => String(x || '').trim()).filter(Boolean).join(' | ');
    const pack = rows => {
      const list = Array.isArray(rows) ? rows : [];
      const hits = list.map(labelOf).filter(x => re.test(x));
      return { count: list.length, syntheticCount: hits.length, syntheticLabels: hits.map(x => x.slice(0, 120)) };
    };
    let raw = [], all = [];
    try { raw = Orbit?.store?.raw?.()?.polizas || []; } catch {}
    try { all = Orbit?.store?.all?.('polizas') || []; } catch {}
    const globals = [];
    for (const key of Object.keys(window).filter(k => /poliz|polic/i.test(k)).slice(0, 60)) {
      try {
        const v = window[key];
        if (Array.isArray(v)) {
          const hit = v.map(labelOf).filter(x => re.test(x));
          globals.push({ key, type: 'array', count: v.length, syntheticCount: hit.length });
        } else if (v && typeof v === 'object') {
          globals.push({ key, type: 'object' });
        }
      } catch {}
    }
    const text = document.body?.textContent || '';
    const domSyntheticCount = (text.match(/entorno de validaci[oó]n/gi) || []).length;
    const traces = (window.__GI_I4A_SYNTH_TRACE || []).map(x => ({ op: x.op, stack: x.stack }));
    return {
      stage: label,
      route: Orbit?.route?.key || '',
      storeOwner: (() => { try { return Orbit?.store?.getOwner?.() || ''; } catch { return ''; } })(),
      raw: pack(raw),
      operational: pack(all),
      globals,
      domSyntheticCount,
      traces
    };
  }, stage);
}

async function insurerBoundary(page, roleName, network) {
  await go(page, '#/aseguradoras', 'aseguradoras');
  const candidate = await page.evaluate(() => {
    const rows = Orbit?.store?.all?.('aseguradoras') || [];
    for (const insurer of rows) {
      const portals = Array.isArray(insurer?.portales) ? insurer.portales : [];
      for (let i = 0; i < portals.length; i += 1) {
        if (String(portals[i]?.credentialRef || '').trim()) return { insurerId: insurer.id, portalIndex: i, ref: portals[i].credentialRef };
      }
    }
    return null;
  });
  need(candidate?.insurerId && candidate?.ref, 'ASEGURADORAS_CREDENTIAL_REF_CANDIDATE_NOT_FOUND');

  const provider = await page.evaluate(() => {
    let secure = {};
    try { secure = Orbit?.secureResources?.selfTest?.() || {}; } catch {}
    return {
      secureProviderRegistered: secure.credentialProvider === true,
      productProviderPresent: !!Orbit?.productInsurerCredentialProviderP0,
      productProviderStatus: (() => { try { return Orbit?.productInsurerCredentialProviderP0?.status?.() || {}; } catch { return {}; } })(),
      runtimeCallFunctionPresent: typeof Orbit?.productRuntimeBrowserProvidersP0?.callFunction === 'function'
    };
  });

  const direct = await page.evaluate(async meta => {
    const sanitizeError = e => ({ errorName: String(e?.name || 'Error').slice(0, 80), errorCode: String(e?.code || '').slice(0, 120) });
    const tenantId = String(Orbit?.tenant?.id || Orbit?.tenant?.tenantId || Orbit?.secureResources?.context?.()?.tenantId || '').trim();
    const active = String(Orbit?.session?.rol?.() || '').trim();
    const payload = { tenantId, activeRole: active, credentialRef: meta.ref, insurerId: String(meta.insurerId), operation: 'reveal' };
    let rawCallable;
    try {
      const r = await Orbit.productRuntimeBrowserProvidersP0.callFunction('orbit360ProductInsurerCredentialCommand', payload);
      const out = r?.data || r || {};
      rawCallable = { invoked: true, ok: out?.ok === true, status: String(out?.status || '').slice(0, 80), valuePresent: typeof out?.value === 'string' && out.value.length > 0 };
    } catch (e) {
      rawCallable = { invoked: true, ok: false, ...sanitizeError(e) };
    }
    let secureReveal;
    try {
      const out = await Orbit.secureResources.revealCredential(meta.ref, { module:'aseguradoras', insurerId:meta.insurerId, portalIndex:meta.portalIndex });
      secureReveal = { ok: out?.ok === true, status: String(out?.status || '').slice(0, 80), valuePresent: typeof out?.value === 'string' && out.value.length > 0 };
    } catch (e) {
      secureReveal = { ok:false, ...sanitizeError(e) };
    }
    let secureCopy;
    try {
      const out = await Orbit.secureResources.copyCredential(meta.ref, { module:'aseguradoras', insurerId:meta.insurerId, portalIndex:meta.portalIndex });
      secureCopy = { ok: out?.ok === true, status: String(out?.status || '').slice(0, 80), valuePresent: typeof out?.value === 'string' && out.value.length > 0 };
    } catch (e) {
      secureCopy = { ok:false, ...sanitizeError(e) };
    }
    return { rawCallable, secureReveal, secureCopy };
  }, candidate);

  await go(page, '#/aseguradoras?ficha=' + encodeURIComponent(candidate.insurerId), 'aseguradoras');
  await page.waitForFunction(id => String(Orbit?.route?.params?.ficha || '') === String(id) && !!document.querySelector('#asg-ficha'), candidate.insurerId, { timeout: 12000 });
  await page.evaluate(() => {
    const tab = document.querySelector('#asg-ficha [data-tab="plataformas"]');
    if (tab) tab.click();
  });
  await page.waitForFunction(() => !!document.querySelector('#af-portales'), null, { timeout: 8000 });
  await page.waitForTimeout(350);

  const uiBefore = await page.evaluate(index => {
    const reveal = document.querySelector('[data-od-credential-reveal="' + index + '"]');
    const copy = document.querySelector('[data-od-credential-copy="' + index + '"]');
    const secret = reveal?.closest('.od-credential-box')?.querySelector('[data-od-credential-secret]');
    return { revealPresent:!!reveal, copyPresent:!!copy, secretHidden: String(secret?.textContent || '').trim() === 'Oculta' };
  }, candidate.portalIndex);

  const revealClick = { attempted:false, secretBecameVisible:false, error:'' };
  if (uiBefore.revealPresent) {
    revealClick.attempted = true;
    try {
      await page.locator('[data-od-credential-reveal="' + candidate.portalIndex + '"]').click({ timeout: 8000 });
      await page.waitForTimeout(900);
      revealClick.secretBecameVisible = await page.evaluate(index => {
        const reveal = document.querySelector('[data-od-credential-reveal="' + index + '"]');
        const secret = reveal?.closest('.od-credential-box')?.querySelector('[data-od-credential-secret]');
        const t = String(secret?.textContent || '').trim();
        return !!t && t !== 'Oculta';
      }, candidate.portalIndex);
    } catch (e) { revealClick.error = String(e?.name || 'Error').slice(0, 80); }
  }

  await page.evaluate(() => {
    window.__GI_I4A_CLIPBOARD_CALLS = 0;
    try {
      const c = navigator.clipboard;
      if (c && typeof c.writeText === 'function') {
        const original = c.writeText.bind(c);
        c.writeText = async function(value) {
          window.__GI_I4A_CLIPBOARD_CALLS += 1;
          return await original(value);
        };
      }
    } catch {}
  });
  const copyClick = { attempted:false, clipboardWriteInvoked:false, error:'' };
  if (uiBefore.copyPresent) {
    copyClick.attempted = true;
    try {
      await page.locator('[data-od-credential-copy="' + candidate.portalIndex + '"]').click({ timeout: 8000 });
      await page.waitForTimeout(900);
      copyClick.clipboardWriteInvoked = await page.evaluate(() => Number(window.__GI_I4A_CLIPBOARD_CALLS || 0) > 0);
    } catch (e) { copyClick.error = String(e?.name || 'Error').slice(0, 80); }
  }

  return {
    role: roleName,
    candidateAvailable:true,
    provider,
    direct,
    uiBefore,
    revealClick,
    copyClick,
    callableNetwork:{ requestCount:network.requests, responseStatuses:network.statuses.slice(), failedCount:network.failed }
  };
}

const app = initializeApp({ credential: cert(serviceAccount()), projectId: PROJECT }, 'gravicentra-i4a-runtime-boundary');
const auth = getAuth(app);
const db = getFirestore(app);
const evidence = {
  schemaVersion:'gravicentra-i4a-runtime-boundary-v1',
  gate:'I4A',
  status:'BOUNDARY_DIAGNOSTIC_FAIL',
  sourceSha:SOURCE,
  buildId:BUILD,
  previewUrl:PREVIEW,
  productionTouched:false,
  dataTouched:false,
  writesExecuted:0,
  userIdentitiesRecorded:false,
  tokensRecorded:false,
  secretsRecorded:false,
  privilegedRole:'',
  policyStages:[],
  insurer:null,
  errors:[]
};
let browser;
let context;
try {
  need(PREVIEW && SOURCE && BUILD, 'I4A_BOUNDARY_ENV_INCOMPLETE');
  const memberships = await db.collection('tenants').doc(TENANT).collection('members').get();
  const listed = await auth.listUsers(1000);
  const users = new Map(listed.users.map(u => [u.uid, u]));
  const pool = [];
  for (const doc of memberships.docs) {
    const m = doc.data() || {};
    const uid = clean(m.uid || doc.id);
    const u = users.get(uid);
    if (!u || u.disabled || u.emailVerified !== true || !['active','activo'].includes(clean(m.status || m.estado).toLowerCase())) continue;
    const rs = roles(m);
    pool.push({ uid, roles:rs, active:activeRole(m, rs) });
  }
  let selected = null;
  let targetRole = '';
  for (const r of PRIVILEGED) {
    const exact = pool.find(x => x.active === r && x.roles.includes(r));
    const fallback = exact || pool.find(x => x.roles.includes(r));
    if (fallback) { selected = fallback; targetRole = r; break; }
  }
  need(selected && targetRole, 'I4A_NO_PRIVILEGED_ACTIVE_MEMBERSHIP');
  evidence.privilegedRole = targetRole;

  const token = await auth.createCustomToken(selected.uid, { gravicentraI4ARuntimeBoundaryReadOnly:true });
  browser = await chromium.launch({ headless:true });
  context = await browser.newContext({ viewport:{ width:1440, height:1000 }, permissions:['clipboard-read','clipboard-write'] });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  await page.addInitScript(() => {
    window.__GI_I4A_SYNTH_TRACE = [];
    const hit = value => /entorno de validaci[oó]n/i.test(String(value == null ? '' : value));
    const record = op => {
      try {
        const stack = String(new Error().stack || '').split('\n').slice(2, 8).map(s => s.replace(location.origin, '')).join(' | ').slice(0, 900);
        window.__GI_I4A_SYNTH_TRACE.push({ op, stack });
      } catch {}
    };
    try {
      const d = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
      if (d?.get && d?.set) Object.defineProperty(Element.prototype, 'innerHTML', { configurable:d.configurable, enumerable:d.enumerable, get:d.get, set:function(v){ if(hit(v)) record('innerHTML'); return d.set.call(this,v); } });
    } catch {}
    try {
      const orig = Element.prototype.insertAdjacentHTML;
      Element.prototype.insertAdjacentHTML = function(pos, html){ if(hit(html)) record('insertAdjacentHTML'); return orig.call(this,pos,html); };
    } catch {}
  });

  const network = { requests:0, statuses:[], failed:0 };
  page.on('request', req => { if (/orbit360ProductInsurerCredentialCommand/i.test(req.url())) network.requests += 1; });
  page.on('response', res => { if (/orbit360ProductInsurerCredentialCommand/i.test(res.url())) network.statuses.push(res.status()); });
  page.on('requestfailed', req => { if (/orbit360ProductInsurerCredentialCommand/i.test(req.url())) network.failed += 1; });

  await page.goto(PREVIEW, { waitUntil:'domcontentloaded', timeout:20000 });
  await page.waitForFunction(() => !!Orbit?.productAppP0 && !!Orbit?.productRuntimeBrowserProvidersP0, null, { timeout:5000 });
  await activate(page, token);
  await setRole(page, targetRole);
  evidence.policyStages.push(await policySnapshot(page, 'post-activate-role'));
  await go(page, '#/cliente360', 'cliente360');
  evidence.policyStages.push(await policySnapshot(page, 'after-cliente360-render'));
  await go(page, '#/polizas', 'polizas');
  evidence.policyStages.push(await policySnapshot(page, 'after-polizas-render'));
  await go(page, '#/cliente360', 'cliente360');
  evidence.policyStages.push(await policySnapshot(page, 'after-polizas-return-cliente360'));
  evidence.insurer = await insurerBoundary(page, targetRole, network);

  const synthetic = evidence.policyStages.map(x => ({ stage:x.stage, raw:x.raw.syntheticCount, operational:x.operational.syntheticCount, dom:x.domSyntheticCount, traceCount:x.traces.length }));
  const backendOk = evidence.insurer?.direct?.rawCallable?.ok === true && evidence.insurer?.direct?.rawCallable?.valuePresent === true;
  const secureOk = evidence.insurer?.direct?.secureReveal?.ok === true && evidence.insurer?.direct?.secureReveal?.valuePresent === true;
  evidence.classification = {
    synthetic,
    firstSyntheticStoreStage: synthetic.find(x => x.raw > 0 || x.operational > 0)?.stage || '',
    firstSyntheticDomStage: synthetic.find(x => x.dom > 0)?.stage || '',
    mutationTraceCaptured: evidence.policyStages.some(x => x.traces.length > 0),
    insurerBackendCallableSucceeded: backendOk,
    insurerSecureResourceSucceeded: secureOk,
    insurerUiRevealSucceeded: evidence.insurer?.revealClick?.secretBecameVisible === true,
    insurerUiCopyInvokedClipboard: evidence.insurer?.copyClick?.clipboardWriteInvoked === true
  };
  evidence.status = 'BOUNDARY_DIAGNOSTIC_COMPLETE';
} catch (e) {
  evidence.errors.push(String(e?.message || e));
  process.exitCode = 1;
} finally {
  if (context) await context.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  await deleteApp(app).catch(() => {});
  fs.mkdirSync(OUT, { recursive:true });
  fs.writeFileSync(path.join(OUT, 'i4a-runtime-boundary.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log('I4A_BOUNDARY_STATUS=' + evidence.status);
  console.log('I4A_BOUNDARY_SYNTH_STORE_STAGE=' + (evidence.classification?.firstSyntheticStoreStage || 'NONE'));
  console.log('I4A_BOUNDARY_SYNTH_DOM_STAGE=' + (evidence.classification?.firstSyntheticDomStage || 'NONE'));
  console.log('I4A_BOUNDARY_SYNTH_TRACE=' + (evidence.classification?.mutationTraceCaptured === true ? 'CAPTURED' : 'NONE'));
  console.log('I4A_BOUNDARY_INSURER_BACKEND=' + (evidence.classification?.insurerBackendCallableSucceeded === true ? 'PASS' : 'FAIL'));
  console.log('I4A_BOUNDARY_INSURER_SECURE=' + (evidence.classification?.insurerSecureResourceSucceeded === true ? 'PASS' : 'FAIL'));
  console.log('I4A_BOUNDARY_INSURER_UI_REVEAL=' + (evidence.classification?.insurerUiRevealSucceeded === true ? 'PASS' : 'FAIL'));
  console.log('I4A_BOUNDARY_INSURER_UI_COPY=' + (evidence.classification?.insurerUiCopyInvokedClipboard === true ? 'PASS' : 'FAIL'));
}
