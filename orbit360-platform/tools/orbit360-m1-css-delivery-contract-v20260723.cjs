'use strict';
const fs = require('fs');
const path = require('path');

const PLATFORM = path.resolve(__dirname, '..');
const REPO = path.resolve(PLATFORM, '..');
const readPlatform = rel => fs.readFileSync(path.join(PLATFORM, rel), 'utf8');
const readRepo = rel => fs.readFileSync(path.join(REPO, rel), 'utf8');

const preview = readPlatform('ays-lab-preview.html');
const sw = readPlatform('sw.js');
const pwa = readPlatform('core/pwa.js');
const firebase = readRepo('firebase.json');
const workflow = readRepo('.github/workflows/orbit360-aseguradoras-runtime-gate-v20260716.yml');

const stylePaths = [
  'styles/tokens.css',
  'styles/base.css',
  'styles/infra.css',
  'styles/v1197-empalme.css',
  'styles/client-insurer-visual-contract-v20260720.css',
  'styles/client-insurer-edit-mode-v20260722.css'
];
const checks = [];
function check(id, ok) { checks.push({ id, ok: Boolean(ok) }); }

check('PREVIEW_BUILD_20260723_10', preview.includes("SW_BUILD = '20260723-10'"));
check('PREVIEW_REDIRECT_BLOCKED_WITHOUT_CSS', preview.includes('redirectBlockedWithoutCss: true') && preview.includes("state.status = 'css-blocked'"));
check('PREVIEW_VALIDATES_CSS_MIME', preview.includes("type.indexOf('text/css') < 0") && preview.includes('CSS_MIME_INVALID'));
check('PREVIEW_VALIDATES_CSS_BODY', preview.includes('CSS_EMPTY') && preview.includes('text.trim().length < 32'));
check('PREVIEW_RETRIES_AUTOMATICALLY', preview.includes('MAX_STYLE_ATTEMPTS = 3') && preview.includes('location.reload()'));
stylePaths.forEach(function (style) {
  check('PREVIEW_STYLE_' + style.replace(/[^a-z0-9]+/gi, '_').toUpperCase(), preview.includes(style));
});

check('SW_BUILD_20260723_10', sw.includes("BUILD = '20260723-10'") && sw.includes("CACHE = 'orbit360-v20260723-10-css-delivery'"));
check('SW_ESSENTIAL_STYLE_LIST', sw.includes('ESSENTIAL_STYLE_PATHS') && stylePaths.every(function (style) { return sw.includes("/" + style); }));
check('SW_INSTALL_PRECACHES_STYLES', sw.includes('RUNTIME_CONTRACT_PATHS.concat(ESSENTIAL_STYLE_PATHS)'));
check('SW_REJECTS_BAD_CSS_MIME', sw.includes("indexOf('text/css') >= 0") && sw.includes('UNUSABLE_RESPONSE'));
check('SW_CANONICAL_FALLBACK', sw.includes('cache.match(canonicalRequest(pathname))') && sw.includes('ignoreSearch: true'));
check('PWA_BUILD_ALIGNED', pwa.includes("RUNTIME_BUILD = '20260723-10'") && pwa.includes("CRITICAL_RELEASE = 'block1-critical-runtime-20260723-10'"));
check('FIREBASE_CSS_NO_STORE', firebase.includes('"source": "**/*.css"') && firebase.includes('"value": "no-store, max-age=0"'));
check('FIREBASE_CSS_NOSNIFF', firebase.includes('"key": "X-Content-Type-Options"') && firebase.includes('"value": "nosniff"'));
check('WORKFLOW_CHECKS_ESSENTIAL_CSS', stylePaths.every(function (style) { return workflow.includes("'" + style + "'") || workflow.includes('"' + style + '"'); }));
check('WORKFLOW_CHECKS_REMOTE_MIME', workflow.includes('contentTypeOk') && workflow.includes("text/css"));
check('WORKFLOW_REQUIRES_ALL_CSS', workflow.includes('essentialCssVerified') && workflow.includes('HOSTING_CSS_DELIVERED_AND_VERIFIED'));

const failed = checks.filter(x => !x.ok);
const report = {
  schemaVersion: 'orbit360-m1-css-delivery-contract-v1',
  contractVersion: '1.0.40',
  deliveryRevision: '20260723-10',
  ok: failed.length === 0,
  status: failed.length === 0 ? 'CSS_DELIVERY_CONTRACT_PASS' : 'CSS_DELIVERY_CONTRACT_FAIL',
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failedCheckIds: failed.map(x => x.id),
  essentialStyles: stylePaths,
  capabilities: {
    secrets: false,
    firestoreRead: false,
    vaultRead: false,
    operationalWrites: false,
    runtime: false,
    browser: false,
    deploy: false,
    production: false
  },
  containsPII: false,
  containsSecrets: false
};
const out = path.join(PLATFORM, 'runtime-gate-crm-v20260716', 'css-delivery-contract-sanitized.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 41);
