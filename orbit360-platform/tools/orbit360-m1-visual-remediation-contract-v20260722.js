#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const repo = path.resolve(root, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const readRepo = rel => fs.readFileSync(path.join(repo, rel), 'utf8');
const readJsonRepo = rel => JSON.parse(readRepo(rel));
const checks = [];
function check(id, ok, detail) { checks.push({ id, ok: !!ok, detail: detail || '' }); }

const visualBase = read('core/client-insurer-visual-contract-v20260720.js');
const operationalOwner = read('core/client-insurer-operational-directory-owner-v20260722.js');
const fieldPolicy = read('core/operational-directory-field-policy-v20260722.js');
const css = read('styles/client-insurer-visual-contract-v20260720.css');
const academy = read('data/academia-v1230-operational-directory-v20260722.js');
const freeze = readJsonRepo('tools/orbit360-incident-freeze-v20260721.json');
const overlay = readJsonRepo('tools/orbit360-gate-contract-overlay-v20260718.json');
const manifest = readJsonRepo('tools/orbit360-critical-runtime-integrity-manifest-v20260721.json');
const workflow = readRepo('.github/workflows/orbit360-aseguradoras-runtime-gate-v20260716.yml');

check('VISUAL_BASE_PRESENT', visualBase.includes("version:'20260720.2'") && visualBase.includes('credentialSecretSeparateReveal:true'), 'legacy visual base preserved');
check('OPERATIONAL_OWNER_VERSION', operationalOwner.includes("var VERSION = '20260722.1'"), 'operational owner revision');
check('CREDENTIAL_USER_OPERATIONAL', operationalOwner.includes('data-od-credential-user') && operationalOwner.includes("user || 'Sin usuario registrado'") && operationalOwner.includes('usernameOperationalVisible: true'), 'visible username slot');
check('CREDENTIAL_SECRET_SEPARATE', operationalOwner.includes('data-od-credential-secret') && operationalOwner.includes('>Oculta</div>') && operationalOwner.includes('passwordProtectedTemporaryReveal: true'), 'secret slot');
check('REVEAL_WRITES_SECRET_ONLY', operationalOwner.includes("querySelector('[data-od-credential-secret]')") && !operationalOwner.includes("querySelector('.m1-credential-value')"), 'reveal target');
check('COPY_ACCESS_INCLUDES_USER_PASSWORD', operationalOwner.includes("['Usuario: ' + (user || '—'), 'Contraseña: ' + out.value]"), 'secure copy payload');
check('NO_GENERIC_USER_PROTECTED_FALLBACK', !operationalOwner.includes('Usuario protegido') && !operationalOwner.includes('Usuario pendiente de registrar'), 'protected fallback retired');

check('BANK_NUMBER_OPERATIONAL_VISIBLE', operationalOwner.includes('data-od-bank-number') && operationalOwner.includes('bankNumberOperationalVisible: true'), 'bank number slot');
check('BANK_TEMPORARY_REVEAL_RETIRED', !operationalOwner.includes('data-m1-bank-reveal') && !operationalOwner.includes("fieldType:'bank_account'") && !operationalOwner.includes('revealBankAccount') && operationalOwner.includes('bankRevealDependency: false'), 'bank reveal retired');
check('BANK_COPY_DIRECT', operationalOwner.includes('data-od-bank-copy-all') && operationalOwner.includes("'Cuenta: ' + number") && operationalOwner.includes('bankCopyDirect: true'), 'direct copy');
check('BANK_COPY_EXCLUDES_USE', operationalOwner.includes('bankCopyExcludesUse: true') && !operationalOwner.includes("'Uso: '"), 'Uso excluded');
check('BANK_HOLDER_FALLBACK_INSURER', operationalOwner.includes("clean(account && account.titular) || clean(insurer && insurer.nombre) || 'Sin registrar'"), 'holder fallback');
check('BANK_NO_PROVIDER_DEPENDENCY', !operationalOwner.includes('secureResources.revealField') && !operationalOwner.includes('accountRef'), 'bank display independent from vault');

check('FIELD_POLICY_OPERATIONAL_CLASSIFICATION', fieldPolicy.includes("operationalFields: ['usuario', 'numero']") && fieldPolicy.includes("protectedFields: ['password', 'contrasena']"), 'field classification');
check('FIELD_POLICY_PASSWORD_NOT_PERSISTED', fieldPolicy.includes('passwordWrites: 0') && !fieldPolicy.includes('portals[portalIndex].password') && !fieldPolicy.includes('portals[portalIndex].contrasena'), 'password persistence blocked');
check('FIELD_POLICY_REFERENCES_PRESERVED', fieldPolicy.includes('providerMappingsPreserved: true') && fieldPolicy.includes('credentialRefsWritten') && fieldPolicy.includes('accountRefsWritten'), 'references preserved');

check('CSS_REMEDIATION_MARKER', css.includes('Visual remediation 20260722.1'), 'css marker');
check('CSS_MOBILE_TITLES', css.includes('#host .mod-band .mb-tt h2') && css.includes('overflow-wrap:anywhere'), 'titles');
check('CSS_MOBILE_HEADERS', css.includes('#host .fichahdr .fh-top') && css.includes('#host .fichahdr .fh-actions'), 'headers');
check('CSS_MOBILE_TABS', css.includes('.m1-asg-ficha .asg-tabbar') && css.includes('overflow-x:auto!important'), 'tabs');
check('CSS_MOBILE_ACTIONS', css.includes('.m1-asg-ficha .m1-asg-hero>div:last-child') && css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'), 'actions');
check('CSS_PWA_INSTALL', css.includes('#pwa-install') && css.includes('max-width:calc(100vw - 24px)'), 'install button');

check('ACADEMY_CONTENT_1230', academy.includes("contentVersion: '1.230'") && academy.includes('_m1operationalv: 1230'), 'academy version');
check('ACADEMY_USER_PASSWORD_SEPARATION', academy.includes('El usuario del portal es un dato operativo') && academy.includes('La contraseña es el único secreto'), 'academy credentials');
check('ACADEMY_BANK_OPERATIONAL', academy.includes('El número completo permanece visible') && academy.includes('accountRef es respaldo'), 'academy bank semantics');
check('ACADEMY_RESPONSIVE_ROLES', ['Dirección','Operativo','Asesor'].every(token => academy.includes(token)), 'academy role coverage');

const blocked = Array.isArray(freeze.blockedActions) ? freeze.blockedActions : [];
check('FREEZE_M1_OPEN', freeze.stateClarification && freeze.stateClarification.m1Closed === false && freeze.stateClarification.m2Authorized === false, freeze.status || 'missing');
check('FREEZE_BLOCKS_DATA_RUNTIME_DEPLOY', blocked.includes('read_firestore_operational_data') && blocked.includes('read_existing_insurer_vault') && blocked.includes('run_runtime') && blocked.includes('open_browser') && blocked.includes('deploy_hosting_lab'), freeze.status || 'missing');
check('OVERLAY_1038', overlay.gatePatch && overlay.gatePatch.contractVersion === '1.0.38' && String(overlay.contractRevision || '').startsWith('1.0.38'), overlay.contractRevision || 'missing');
check('OVERLAY_SCOPE_REPLACEMENT', overlay.replaceCanonicalOwners === true && overlay.replaceRuntimeVersionContracts === true, overlay.diagnosticRevision || 'missing');
check('MANIFEST_1038', manifest.contractVersion === '1.0.38' && manifest.releaseId === 'block1-critical-runtime-20260722-6', `${manifest.contractVersion}:${manifest.releaseId}`);
check('MANIFEST_OPERATIONAL_ASSETS', ['operationalDirectoryFieldPolicy','clientInsurerOperationalDirectoryOwner','operationalDirectoryAcademy'].every(id => (manifest.assets || []).some(asset => asset.id === id)), 'new assets included');
check('WORKFLOW_VALIDATION_ONLY', workflow.includes('VALIDATION_ONLY') && !workflow.includes('git commit') && !workflow.includes('git push'), 'workflow immutable');

const failed = checks.filter(item => !item.ok);
const result = {
  schemaVersion: 'orbit360-m1-visual-remediation-contract-v2-operational-directory',
  contractVersion: '1.0.38',
  revision: '20260722.2',
  validatorSemanticRevision: 'responsive-plus-operational-directory-v1',
  validatorLifecycleRevision: 'overlay-scope-replacement-v1',
  classification: 'DATA_CONTRACT_FAILURE',
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  status: failed.length ? 'FAIL' : 'PASS',
  checks,
  writes: 0,
  dataAccess: false,
  secretAccess: false,
  runtimeExecuted: false,
  browserExecuted: false,
  deployExecuted: false,
  containsPII: false,
  containsSecrets: false
};
console.log(JSON.stringify(result, null, 2));
process.exit(failed.length ? 1 : 0);
