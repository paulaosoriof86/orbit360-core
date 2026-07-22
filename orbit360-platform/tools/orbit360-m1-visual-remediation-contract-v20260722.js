#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const repoRoot = path.resolve(root, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const readRepo = rel => fs.readFileSync(path.join(repoRoot, rel), 'utf8');
const checks = [];
function check(id, ok, detail) { checks.push({ id, ok: !!ok, detail: detail || '' }); }
function includes(source, token) { return String(source || '').includes(token); }

const visual = read('core/client-insurer-visual-contract-v20260720.js');
const style = read('styles/client-insurer-visual-contract-v20260720.css');
const academy = read('data/academia-v1221-m1-visual-integrity.js');
const freeze = JSON.parse(readRepo('tools/orbit360-incident-freeze-v20260721.json'));
const authorization = JSON.parse(readRepo('tools/orbit360-authorize-final-block1-gate-readonly-v20260721.json'));
const overlay = JSON.parse(readRepo('tools/orbit360-gate-contract-overlay-v20260718.json'));
const manifest = JSON.parse(readRepo('tools/orbit360-critical-runtime-integrity-manifest-v20260721.json'));

check('VISUAL_REMEDIATION_REVISION', includes(visual, "visualRemediationRevision:'20260722.1'"), 'visual owner revision');
check('CREDENTIAL_USER_SEPARATE', includes(visual, 'data-m1-credential-user') && includes(visual, 'credentialUserAlwaysSeparate:true'), 'username has dedicated visible slot');
check('CREDENTIAL_SECRET_SEPARATE', includes(visual, 'data-m1-credential-secret') && includes(visual, 'credentialSecretSeparateReveal:true'), 'password has dedicated temporary slot');
check('NO_GENERIC_USER_PROTECTED_FALLBACK', !includes(visual, 'Usuario protegido'), 'generic username fallback removed');
check('REVEAL_WRITES_SECRET_ONLY', includes(visual, "querySelector('[data-m1-credential-secret]')") && !includes(visual, "querySelector('.m1-credential-value')"), 'reveal must not replace username');
check('COPY_ACCESS_INCLUDES_USER_AND_PASSWORD', includes(visual, "['Usuario: '+(user||'—'),'Contraseña: '+out.value]"), 'secure access bundle');
check('BANK_NUMBER_VISIBLE_HINT', includes(visual, 'data-m1-bank-number') && includes(visual, 'accountHint(account)'), 'masked number visible');
check('BANK_TEMPORARY_REVEAL', includes(visual, 'data-m1-bank-reveal') && includes(visual, 'revealBankAccount'), 'temporary bank reveal');
check('BANK_COPY_EXCLUDES_USE', includes(visual, 'bankCopyExcludesUse:true') && !includes(visual, "'Uso: '+"), 'Uso excluded from copy');
check('BANK_HOLDER_FALLBACK_INSURER', includes(visual, 'bankHolderFallbackInsurer:true') && includes(visual, 'accountHolder(c,a)'), 'insurer fallback for holder');
check('BANK_COPY_FIELDS_EXACT', includes(visual, "'Banco: '+") && includes(visual, "'Tipo: '+") && includes(visual, "'Cuenta: '+") && includes(visual, "'Moneda: '+") && includes(visual, "'Titular: '+"), 'expected bank fields');

check('CSS_VISUAL_REMEDIATION_MARKER', includes(style, 'Visual remediation 20260722.1'), 'style marker');
check('CSS_MOBILE_PWA_INSTALL', includes(style, '#pwa-install') && includes(style, 'max-width:calc(100vw - 24px)'), 'PWA button mobile fit');
check('CSS_MOBILE_TABS_SCROLL', includes(style, '.m1-asg-ficha .asg-tabbar') && includes(style, 'overflow-x:auto!important'), 'tabs horizontal scroll');
check('CSS_MOBILE_ACTION_GRID', includes(style, '.m1-asg-ficha .m1-asg-hero>div:last-child') && includes(style, 'grid-template-columns:repeat(2,minmax(0,1fr))'), 'mobile actions');
check('CSS_NO_HORIZONTAL_PAGE_OVERFLOW', includes(style, 'overflow-x:hidden'), 'mobile page containment');
check('CSS_SECRET_AND_BANK_LAYOUT', includes(style, '.m1-credential-secret') && includes(style, '.m1-bank-number-line'), 'semantic layout styles');

check('ACADEMY_CONTENT_1227', includes(academy, "contentVersion:'1.227'") && includes(academy, '_m1visualv:1227'), 'academy updated');
check('ACADEMY_USER_PASSWORD_SEMANTICS', includes(academy, 'El usuario del portal permanece visible') && includes(academy, 'la contraseña aparece aparte'), 'academy credential semantics');
check('ACADEMY_BANK_EXCLUDES_USE', includes(academy, 'El campo Uso no se muestra ni se copia') && !includes(academy, 'titular y uso pueden copiarse'), 'academy bank semantics');
check('ACADEMY_RESPONSIVE_PWA', includes(academy, 'Instalar como app'), 'academy responsive lesson');

check('FREEZE_STOP_THE_LINE', String(freeze.status || '').startsWith('STOP_THE_LINE'), freeze.status || 'missing');
check('FREEZE_FUNCTIONAL_DEFECT', Array.isArray(freeze.classification) && freeze.classification.includes('FUNCTIONAL_DEFECT'), JSON.stringify(freeze.classification || []));
check('FREEZE_BLOCKS_GATE', Array.isArray(freeze.blockedGateIds) && freeze.blockedGateIds.includes('block1-client360-insurers-lab-v20260717'), JSON.stringify(freeze.blockedGateIds || []));
check('FREEZE_NO_RUNTIME', freeze.allowedActions && freeze.allowedActions.includes('static_visual_owner_remediation_only') && freeze.blockedActions && freeze.blockedActions.includes('run_second_final_gate'), 'freeze scope');
check('AUTHORIZATION_CONSUMED', authorization.allowedExecutions === 0 && authorization.runtimeAllowed === false && authorization.deployAllowed === false, JSON.stringify({allowedExecutions:authorization.allowedExecutions,runtimeAllowed:authorization.runtimeAllowed,deployAllowed:authorization.deployAllowed}));
check('OVERLAY_1037', overlay.gatePatch && overlay.gatePatch.contractVersion === '1.0.37' && String(overlay.contractRevision || '').startsWith('1.0.37'), overlay.contractRevision || 'missing');
check('OVERLAY_FUNCTIONAL_DEFECT', overlay.classification === 'FUNCTIONAL_DEFECT', overlay.classification || 'missing');
check('MANIFEST_1037', manifest.contractVersion === '1.0.37', manifest.contractVersion || 'missing');

const failed = checks.filter(item => !item.ok);
const result = {
  schemaVersion: 'orbit360-m1-visual-remediation-contract-v1',
  contractVersion: '1.0.37',
  revision: '20260722.1',
  classification: 'FUNCTIONAL_DEFECT',
  status: failed.length ? 'FAIL' : 'PASS',
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failedCheckIds: failed.map(item => item.id),
  writes: 0,
  runtimeExecuted: false,
  browserExecuted: false,
  deployExecuted: false,
  containsPII: false,
  containsSecrets: false,
  checks
};
console.log(JSON.stringify(result, null, 2));
process.exit(failed.length ? 1 : 0);
