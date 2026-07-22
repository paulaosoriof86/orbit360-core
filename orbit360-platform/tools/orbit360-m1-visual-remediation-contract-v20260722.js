#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const readJson = rel => JSON.parse(read(rel));
const checks = [];
function check(id, ok, detail) { checks.push({ id, ok: !!ok, detail: detail || '' }); }

const visual = read('core/client-insurer-visual-contract-v20260720.js');
const css = read('styles/client-insurer-visual-contract-v20260720.css');
const academy = read('data/academia-v1221-m1-visual-integrity.js');
const freeze = readJson('../tools/orbit360-incident-freeze-v20260721.json');
const authorization = readJson('../tools/orbit360-authorize-final-block1-gate-readonly-v20260721.json');
const overlay = readJson('../tools/orbit360-gate-contract-overlay-v20260718.json');
const manifest = readJson('../tools/orbit360-critical-runtime-integrity-manifest-v20260721.json');

const RETIRED_LIFECYCLE_TOKENS = ['FREEZE_STOP_THE_LINE', 'FREEZE_NO_RUNTIME', 'AUTHORIZATION_CONSUMED'];
void RETIRED_LIFECYCLE_TOKENS;

check('VISUAL_REMEDIATION_REVISION', visual.includes("visualRemediationRevision:'20260722.1'"), 'visual revision');
check('CREDENTIAL_USER_SEPARATE', visual.includes('data-m1-credential-user') && visual.includes("portalUser(p)"), 'user slot');
check('CREDENTIAL_SECRET_SEPARATE', visual.includes('data-m1-credential-secret') && visual.includes('>Oculta</div>'), 'secret slot');
check('NO_GENERIC_USER_PROTECTED_FALLBACK', !visual.includes('Usuario protegido'), 'generic fallback removed');
check('REVEAL_WRITES_SECRET_ONLY', visual.includes("querySelector('[data-m1-credential-secret]')") && !visual.includes("querySelector('.m1-credential-value')"), 'reveal target');
check('COPY_ACCESS_INCLUDES_USER_PASSWORD', visual.includes("['Usuario: '+(user||'—'),'Contraseña: '+out.value]"), 'secure copy payload');
check('BANK_NUMBER_VISIBLE', visual.includes('data-m1-bank-number') && visual.includes("accountHint(c)||'Cuenta protegida'"), 'bank number slot');
check('BANK_TEMPORARY_REVEAL', visual.includes('data-m1-bank-reveal') && visual.includes("fieldType:'bank_account'"), 'bank reveal');
check('BANK_COPY_EXCLUDES_USE', visual.includes('bankCopyExcludesUse:true') && !visual.includes("'Uso: '+"), 'Uso excluded');
check('BANK_HOLDER_FALLBACK_INSURER', visual.includes("clean(account&&account.titular)||clean(insurer&&insurer.nombre)||'Sin registrar'"), 'holder fallback');
check('BANK_COPY_EXACT_FIELDS', visual.includes("['Banco: '+(c.banco||'—'),'Tipo: '+(c.tipo||'—'),'Cuenta: '+(revealed.value||accountHint(c)||'—'),'Moneda: '+(c.moneda||'—'),'Titular: '+accountHolder(c,a)]"), 'exact bank copy');

check('CSS_REMEDIATION_MARKER', css.includes('Visual remediation 20260722.1'), 'css marker');
check('CSS_MOBILE_TITLES', css.includes('#host .mod-band .mb-tt h2') && css.includes('overflow-wrap:anywhere'), 'titles');
check('CSS_MOBILE_HEADERS', css.includes('#host .fichahdr .fh-top') && css.includes('#host .fichahdr .fh-actions'), 'headers');
check('CSS_MOBILE_TABS', css.includes('.m1-asg-ficha .asg-tabbar') && css.includes('overflow-x:auto!important'), 'tabs');
check('CSS_MOBILE_ACTIONS', css.includes('.m1-asg-ficha .m1-asg-hero>div:last-child') && css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'), 'actions');
check('CSS_PWA_INSTALL', css.includes('#pwa-install') && css.includes('max-width:calc(100vw - 24px)'), 'install button');

check('ACADEMY_CONTENT_1228', academy.includes("contentVersion:'1.228'") && academy.includes('_m1visualv:1228'), 'academy version');
check('ACADEMY_USER_PASSWORD_SEPARATION', academy.includes('El usuario del portal permanece visible') && academy.includes('La contraseña usa un espacio separado'), 'academy credentials');
check('ACADEMY_BANK_EXCLUDES_USE', academy.includes('El campo Uso no se muestra ni se copia') && !academy.includes('titular y uso pueden copiarse'), 'academy bank copy');
check('ACADEMY_RESPONSIVE', ['títulos','encabezados','pestañas','acciones','Instalar como app'].every(token=>academy.includes(token)), 'academy responsive semantic tokens');

const blockedActions = Array.isArray(freeze.blockedActions) ? freeze.blockedActions : [];
const activeStaticAuthorization = authorization.active === true && authorization.consumed === false && authorization.allowedExecutions === 1 && authorization.action === 'final_block1_static_preflight_1_0_37_lifecycle_v2_only' && authorization.expectedContractVersion === '1.0.37';
const consumedStaticAuthorization = authorization.active === false && authorization.consumed === true && authorization.allowedExecutions === 0 && authorization.expectedContractVersion === '1.0.37';
const authorizationIsStaticOnly = authorization.runtimeAllowed === false && authorization.browserAllowed === false && authorization.firestoreReadAllowed === false && authorization.vaultReadAllowed === false && authorization.secretsAllowed === false && authorization.writesAllowed === false && authorization.deployAllowed === false && authorization.functionsDeployAllowed === false && authorization.rulesDeployAllowed === false && authorization.productionAllowed === false;
check('FREEZE_M1_OPEN', freeze.stateClarification && freeze.stateClarification.m1Closed === false, JSON.stringify(freeze.stateClarification || {}));
check('FREEZE_FUNCTIONAL_DEFECT', Array.isArray(freeze.classification) && freeze.classification.includes('FUNCTIONAL_DEFECT'), JSON.stringify(freeze.classification || []));
check('FREEZE_BLOCKS_GATE', Array.isArray(freeze.blockedGateIds) && freeze.blockedGateIds.includes('block1-client360-insurers-lab-v20260717') && blockedActions.includes('run_second_final_gate'), JSON.stringify(freeze.blockedGateIds || []));
check('FREEZE_NO_RUNTIME_BROWSER_DEPLOY', blockedActions.includes('run_runtime') && blockedActions.includes('open_browser') && blockedActions.includes('deploy_hosting_lab') && freeze.stateClarification && freeze.stateClarification.runtimeAuthorized === false && freeze.stateClarification.deployAuthorized === false, freeze.status || 'missing');
check('AUTHORIZATION_STATIC_LIFECYCLE', authorizationIsStaticOnly && (activeStaticAuthorization || consumedStaticAuthorization), JSON.stringify({active:authorization.active,consumed:authorization.consumed,allowedExecutions:authorization.allowedExecutions,action:authorization.action,expectedContractVersion:authorization.expectedContractVersion}));
check('OVERLAY_1037', overlay.gatePatch && overlay.gatePatch.contractVersion === '1.0.37' && String(overlay.contractRevision || '').startsWith('1.0.37'), overlay.contractRevision || 'missing');
check('OVERLAY_FUNCTIONAL_DEFECT', overlay.classification === 'FUNCTIONAL_DEFECT', overlay.classification || 'missing');
check('MANIFEST_1037', manifest.contractVersion === '1.0.37', manifest.contractVersion || 'missing');

const failed = checks.filter(item => !item.ok);
const result = {
  schemaVersion: 'orbit360-m1-visual-remediation-contract-v1',
  contractVersion: '1.0.37',
  revision: '20260722.1',
  validatorSemanticRevision: 'responsive-token-set-v1',
  validatorLifecycleRevision: 'phase-aware-static-authorization-v2',
  classification: 'FUNCTIONAL_DEFECT',
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  status: failed.length ? 'FAIL' : 'PASS',
  checks,
  writes: 0,
  runtimeExecuted: false,
  browserExecuted: false,
  deployExecuted: false,
  containsPII: false,
  containsSecrets: false
};
console.log(JSON.stringify(result, null, 2));
process.exit(failed.length ? 1 : 0);
