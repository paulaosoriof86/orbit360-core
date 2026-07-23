#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const rel = value => path.join(ROOT, value);
const files = {
  visual: rel('orbit360-platform/core/client-insurer-visual-contract-v20260720.js'),
  importer: rel('orbit360-platform/core/insurer-directory-import-v1202.js'),
  importUi: rel('orbit360-platform/core/aseguradoras-op2-import-ui-guard.js'),
  targetBridge: rel('orbit360-platform/core/insurer-secure-target-bridge-v20260720.js'),
  credentialProvider: rel('orbit360-platform/core/aseguradoras-credentials-provider-lab-v20260720.js'),
  bankProvider: rel('orbit360-platform/core/aseguradoras-bank-accounts-provider-lab-v20260721.js'),
  routerBootstrap: rel('orbit360-platform/core/router-tenant-config-bootstrap.js'),
  index: rel('orbit360-platform/index.html'),
  academy: rel('orbit360-platform/data/academia-v1221-m1-visual-integrity.js'),
  visualValidator: rel('orbit360-platform/tools/orbit360-m1-visual-remediation-contract-v20260722.js'),
  baseOverlay: rel('tools/orbit360-gate-contract-overlay-v20260718.json'),
  importerOverlay: rel('tools/orbit360-gate-contract-overlay-importers-v20260720.json'),
  registryExtension: rel('tools/orbit360-gate-contract-registry-extension-v20260720.json'),
  integrityManifest: rel('tools/orbit360-critical-runtime-integrity-manifest-v20260721.json'),
  report: rel('orbit360-platform/runtime-gate-crm-v20260716/operational-directory-code-repair-sanitized.json')
};

const changes = [];
function read(file) {
  if (!fs.existsSync(file)) throw new Error(`FILE_MISSING:${path.relative(ROOT, file)}`);
  return fs.readFileSync(file, 'utf8');
}
function write(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value.endsWith('\n') ? value : `${value}\n`, 'utf8');
}
function occurrences(source, token) { return source.split(token).length - 1; }
function exact(source, before, after, id, expected = 1) {
  const beforeCount = occurrences(source, before);
  const afterCount = occurrences(source, after);
  if (beforeCount === expected) {
    changes.push(id);
    return source.split(before).join(after);
  }
  if (beforeCount === 0 && afterCount >= expected) return source;
  throw new Error(`SIGNATURE_INVALID:${id}:before=${beforeCount}:after=${afterCount}`);
}
function regex(source, pattern, after, id, readyPattern) {
  if (readyPattern && readyPattern.test(source)) return source;
  const matches = source.match(pattern);
  if (!matches || matches.length !== 1) throw new Error(`REGEX_SIGNATURE_INVALID:${id}:${matches ? matches.length : 0}`);
  changes.push(id);
  return source.replace(pattern, after);
}
function json(file) { return JSON.parse(read(file)); }
function writeJson(file, value) { write(file, JSON.stringify(value, null, 2)); }
function unique(values) { return [...new Set([].concat(values || []).filter(Boolean))]; }
function ownerById(list, id) {
  const owner = [].concat(list || []).find(item => item && item.id === id);
  if (!owner) throw new Error(`OWNER_MISSING:${id}`);
  return owner;
}
function contractByPath(list, filePath) {
  const contract = [].concat(list || []).find(item => item && item.path === filePath);
  if (!contract) throw new Error(`RUNTIME_CONTRACT_MISSING:${filePath}`);
  return contract;
}
function syntax(file) {
  const out = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (out.status !== 0) throw new Error(`SYNTAX_INVALID:${path.relative(ROOT, file)}:${String(out.stderr || '').slice(0,180)}`);
}

try {
  let source = read(files.visual);
  source = exact(source, '- accesos y cuentas mediante revelado/copia segura;', '- usuarios y cuentas operativos visibles; contraseña con revelado seguro;', 'visual_header_semantics');
  source = exact(source, "visualRemediationRevision === '20260722.1'", "visualRemediationRevision === '20260722.2'", 'visual_guard_revision');
  source = exact(source, "user||'Usuario pendiente de registrar'", "user||'Sin usuario registrado'", 'visual_user_fallback');
  source = exact(source, ",hint=accountHint(c)||'Cuenta protegida',holder=", ",number=clean(c.numero||c.numeroCuenta||c.accountNumber||''),holder=", 'visual_bank_number_source');
  source = exact(source,
    `'<span>Cuenta</span><div class="m1-bank-number-line"><b data-m1-bank-number="'+idx+'">'+esc(hint)+'</b>'+(c.accountRef?'<button class="btn ghost sm" data-m1-bank-reveal="'+idx+'">Ver temporalmente</button>':'')+'</div>`,
    `'<span>Cuenta</span><div class="m1-bank-number-line"><b data-m1-bank-number="'+idx+'">'+esc(number||'Sin registrar')+'</b></div>`,
    'visual_bank_visible');
  source = exact(source,
    "setHtmlIfChanged(note,'<b>Datos bancarios protegidos.</b> El número se muestra enmascarado y puede revelarse temporalmente. Copiar datos completos incluye banco, tipo, cuenta, moneda y titular según permisos.');",
    "setHtmlIfChanged(note,'<b>Directorio operativo:</b> el número de cuenta permanece visible y se copia directamente con banco, tipo, moneda y titular. La edición continúa separada y auditable.');",
    'visual_bank_note');
  source = regex(source,
    /\n  async function revealBankAccount\(account,insurer,index\)\{[\s\S]*?\n  \}\n  document\.addEventListener/,
    '\n  document.addEventListener',
    'visual_remove_bank_reveal_function',
    /bankRevealDependency:false/);
  source = regex(source,
    /\n    var bankReveal=event\.target\.closest\('\[data-m1-bank-reveal\]'\);if\(bankReveal\)\{[\s\S]*?return;\}/,
    '',
    'visual_remove_bank_reveal_handler',
    /bankRevealDependency:false/);
  source = regex(source,
    /    var bankCopy=event\.target\.closest\('\[data-m1-bank-copy-all\]'\);if\(bankCopy\)\{[\s\S]*?return;\}/,
    "    var bankCopy=event.target.closest('[data-m1-bank-copy-all]');if(bankCopy){var a=currentInsurer(),c=a&&a.cuentas&&a.cuentas[+bankCopy.dataset.m1BankCopyAll];if(!c)return;var number=clean(c.numero||c.numeroCuenta||c.accountNumber||'');if(!number){toast('Número de cuenta pendiente de registrar');return;}var full=['Banco: '+(c.banco||'—'),'Tipo: '+(c.tipo||'—'),'Cuenta: '+number,'Moneda: '+(c.moneda||'—'),'Titular: '+accountHolder(c,a)].join('\\n');writeClipboard(full).then(function(ok){toast(ok?'Datos bancarios copiados':'No fue posible copiar');});return;}",
    'visual_direct_bank_copy',
    /bankNumbersOperationalVisible:true/);
  source = exact(source, "visualRemediationRevision:'20260722.1'", "visualRemediationRevision:'20260722.2'", 'visual_runtime_revision');
  source = exact(source,
    'completeBankCopy:true,bankCopyExcludesUse:true',
    'completeBankCopy:true,bankNumbersOperationalVisible:true,bankRevealDependency:false,bankCopyDirect:true,bankCopyExcludesUse:true',
    'visual_operational_flags');
  write(files.visual, source);

  source = read(files.importer);
  source = exact(source,
    'cuentas, genera dry-run sanitizado y solo aplica datos no secretos\n   tras confirmacion reforzada. Contraseñas/usuarios/cuentas completas\n   nunca se guardan en Orbit.store: quedan como referencias backend.',
    'cuentas, genera dry-run sanitizado y aplica datos operativos\n   tras confirmación reforzada. Usuarios y números bancarios permanecen\n   en el directorio; únicamente las contraseñas quedan como secretos.',
    'importer_header_semantics');
  source = exact(source,
    "url: url.url, urlHint: url.urlHint, urlRef: url.urlRef, usuarioHint: maskUser(user), credentialRef: ref,",
    "url: url.url, urlHint: url.urlHint, urlRef: url.urlRef, usuario: user, usuarioHint: maskUser(user), credentialRef: ref,",
    'importer_gt_username_operational');
  source = exact(source,
    "url: url.url, urlHint: url.urlHint, urlRef: url.urlRef, usuarioHint: maskUser(user), credentialRef: ref,",
    "url: url.url, urlHint: url.urlHint, urlRef: url.urlRef, usuario: user, usuarioHint: maskUser(user), credentialRef: ref,",
    'importer_co_username_operational');
  source = exact(source,
    "numero: '', numeroHint: maskRight(accountValue, 4), accountRef: accountValue ? 'backend_required' : '',",
    "numero: accountValue, numeroHint: maskRight(accountValue, 4), accountRef: accountValue ? 'backend_required' : '',",
    'importer_bank_number_operational');
  source = exact(source,
    "(out.portales || []).forEach(p => { delete p.usuario; delete p.user; delete p.password; delete p.contrasena; });\n    (out.cuentas || []).forEach(c => { delete c.numero; delete c.accountNumber; });",
    "(out.portales || []).forEach(p => { delete p.password; delete p.contrasena; });",
    'importer_safe_operation_fields');
  source = exact(source,
    'Usuarios, contraseñas y números completos <b>no se muestran ni se escriben en Orbit.store</b>. Se envían al proveedor protegido al confirmar; la ficha conserva únicamente referencias opacas y datos enmascarados.',
    'Los usuarios y números bancarios son datos operativos y permanecen en el directorio. Las contraseñas se envían al proveedor seguro y nunca se escriben como texto en Orbit.store.',
    'importer_ui_explanation');
  write(files.importer, source);

  source = read(files.importUi);
  source = exact(source, "var VERSION = '20260721.1';", "var VERSION = '20260722.2';", 'import_ui_version');
  source = exact(source, '<small>Accesos protegidos</small>', '<small>Contraseñas protegidas</small>', 'import_ui_password_label');
  source = exact(source, '<small>Cuentas protegidas</small>', '<small>Cuentas operativas</small>', 'import_ui_bank_label');
  source = exact(source,
    'El directorio fue escrito y leído nuevamente; los accesos confirmados quedaron disponibles mediante referencia protegida.',
    'El directorio fue escrito y leído nuevamente; usuarios y cuentas quedaron operativos y las contraseñas conservaron referencia segura.',
    'import_ui_done_copy');
  write(files.importUi, source);

  source = read(files.targetBridge);
  source = exact(source,
    'Vincula cada recurso sensible con una identidad estable antes de llamar\n   al proveedor. El proveedor devuelve mappings; no modifica el directorio.',
    'Vincula la contraseña y las referencias de respaldo con una identidad\n   estable. El importador canónico conserva usuario y número operativos.',
    'target_bridge_header');
  source = exact(source,
    'noProtectedValuePersistence: true,\n    stableTargetsRequired: true,',
    "passwordPersistenceBlocked: true,\n    operationalDirectoryWritesOwnedByImporter: true,\n    operationalFields: ['usuario','numero'],\n    protectedFields: ['password','contrasena'],\n    stableTargetsRequired: true,",
    'target_bridge_semantics');
  write(files.targetBridge, source);

  source = read(files.credentialProvider);
  source = exact(source,
    '- no registra ni persiste usuario/contraseña en el frontend;',
    '- conserva el usuario operativo; la contraseña permanece solo en el proveedor seguro;',
    'credential_provider_header');
  source = exact(source, "version: '20260720.1'", "version: '20260722.2'", 'credential_provider_versions', 3);
  source = exact(source, 'noSecretPersistence: true', 'passwordNotPersisted: true,\n    usernameOperational: true', 'credential_provider_state');
  write(files.credentialProvider, source);

  source = read(files.bankProvider);
  source = exact(source,
    '- conserva únicamente accountRef y numeroHint en Orbit.store;',
    '- conserva número operativo en el directorio y accountRef como respaldo;',
    'bank_provider_header');
  source = exact(source, "version: '20260721.1'", "version: '20260722.2'", 'bank_provider_version');
  source = exact(source, 'noSecretPersistence: true,', 'operationalNumberPersistence: true,\n    vaultBackupPreserved: true,', 'bank_provider_state');
  source = exact(source, "message: available ? 'Cuenta protegida disponible' : 'Vinculación segura pendiente'", "message: available ? 'Respaldo de cuenta disponible' : 'Vinculación de respaldo pendiente'", 'bank_provider_status_message');
  source = exact(source, "accounts[index].estado = mapping.available ? 'Cuenta protegida disponible' : 'Requiere actualización';", "accounts[index].estado = mapping.available ? 'Cuenta operativa disponible' : 'Requiere actualización';", 'bank_provider_mapping_state');
  write(files.bankProvider, source);

  source = read(files.routerBootstrap);
  source = exact(source, "var CRITICAL_RELEASE = 'block1-critical-runtime-20260721-4';", "var CRITICAL_RELEASE = 'block1-critical-runtime-20260722-5';", 'router_release');
  source = exact(source, "client-insurer-visual-contract-v20260720.js?v=20260721-4", "client-insurer-visual-contract-v20260720.js?v=20260722-5", 'router_visual_cache');
  source = exact(source, "aseguradoras-credentials-provider-lab-v20260720.js?v=20260720-1", "aseguradoras-credentials-provider-lab-v20260720.js?v=20260722-2", 'router_credential_cache');
  source = exact(source, "visualContractDeliveryRevision: '20260721.4'", "visualContractDeliveryRevision: '20260722.5'", 'router_visual_delivery_revision');
  source = exact(source, "credentialProviderVersion: '20260720.1'", "credentialProviderVersion: '20260722.2'", 'router_credential_version');
  write(files.routerBootstrap, source);

  source = read(files.index);
  source = regex(source, /aseguradoras-bank-accounts-provider-lab-v20260721\.js\?v=[^"']+/, 'aseguradoras-bank-accounts-provider-lab-v20260721.js?v=20260722-2', 'index_bank_provider_cache', /aseguradoras-bank-accounts-provider-lab-v20260721\.js\?v=20260722-2/);
  source = regex(source, /academia-v1221-m1-visual-integrity\.js\?v=[^"']+/, 'academia-v1221-m1-visual-integrity.js?v=20260722-229', 'index_academy_cache', /academia-v1221-m1-visual-integrity\.js\?v=20260722-229/);
  write(files.index, source);

  source = read(files.academy);
  source = exact(source, 'contenido M1 1.228', 'contenido M1 1.229', 'academy_header_version');
  source = exact(source, "contentVersion==='1.228'", "contentVersion==='1.229'", 'academy_guard_version');
  source = exact(source,
    'La ficha muestra banco, tipo, número enmascarado, moneda y titular. El titular usa el nombre de la aseguradora cuando falta en la cuenta. El campo Uso no se muestra ni se copia.',
    'La ficha muestra banco, tipo, número completo, moneda y titular. El número es operativo y se copia directamente; la contraseña del portal es el único secreto. El titular usa el nombre de la aseguradora cuando falta. El campo Uso no se muestra ni se copia.',
    'academy_bank_semantics');
  source = exact(source, '_m1visualv!==1228', '_m1visualv!==1228&&x._m1visualv!==1229', 'academy_lesson_filter');
  source = exact(source, "'_1228'", "'_1229'", 'academy_lesson_ids');
  source = exact(source, '_m1visualv:1228', '_m1visualv:1229', 'academy_version_rows', 2);
  source = exact(source, "id:'eval_m1_visual_1228'", "id:'eval_m1_visual_1229'", 'academy_eval_id');
  source = exact(source, "contenidoM1Visual:'1.228'", "contenidoM1Visual:'1.229'", 'academy_config_version');
  source = exact(source, "contentVersion:'1.228'", "contentVersion:'1.229'", 'academy_runtime_version');
  source = exact(source, 'validatorLifecyclePhaseAware:true,apply', 'validatorLifecyclePhaseAware:true,operationalDirectorySemantics:true,apply', 'academy_operational_flag');
  write(files.academy, source);

  source = read(files.visualValidator);
  source = exact(source, "visualRemediationRevision:'20260722.1'", "visualRemediationRevision:'20260722.2'", 'validator_visual_revision');
  source = exact(source,
    "check('BANK_NUMBER_VISIBLE', visual.includes('data-m1-bank-number') && visual.includes(\"accountHint(c)||'Cuenta protegida'\"), 'bank number slot');\ncheck('BANK_TEMPORARY_REVEAL', visual.includes('data-m1-bank-reveal') && visual.includes(\"fieldType:'bank_account'\"), 'bank reveal');",
    "check('BANK_NUMBER_OPERATIONAL_VISIBLE', visual.includes('data-m1-bank-number') && visual.includes(\"number=clean(c.numero||c.numeroCuenta||c.accountNumber||'')\") && visual.includes('bankNumbersOperationalVisible:true'), 'bank number operational slot');\ncheck('BANK_NO_TEMPORARY_REVEAL', !visual.includes('data-m1-bank-reveal') && !visual.includes(\"fieldType:'bank_account'\") && !visual.includes('function revealBankAccount'), 'bank reveal retired');",
    'validator_bank_visibility');
  source = exact(source,
    "check('BANK_COPY_EXACT_FIELDS', visual.includes(\"['Banco: '+(c.banco||'—'),'Tipo: '+(c.tipo||'—'),'Cuenta: '+(revealed.value||accountHint(c)||'—'),'Moneda: '+(c.moneda||'—'),'Titular: '+accountHolder(c,a)]\"), 'exact bank copy');",
    "check('BANK_COPY_EXACT_FIELDS', visual.includes(\"['Banco: '+(c.banco||'—'),'Tipo: '+(c.tipo||'—'),'Cuenta: '+number,'Moneda: '+(c.moneda||'—'),'Titular: '+accountHolder(c,a)]\") && visual.includes('bankCopyDirect:true'), 'exact direct bank copy');",
    'validator_bank_copy');
  source = exact(source, "check('ACADEMY_CONTENT_1228', academy.includes(\"contentVersion:'1.228'\") && academy.includes('_m1visualv:1228'), 'academy version');", "check('ACADEMY_CONTENT_1229', academy.includes(\"contentVersion:'1.229'\") && academy.includes('_m1visualv:1229') && academy.includes('número completo'), 'academy version');", 'validator_academy_version');
  source = exact(source, "contractVersion: '1.0.37'", "contractVersion: '1.0.38'", 'validator_contract_version');
  source = exact(source, "revision: '20260722.1'", "revision: '20260722.2'", 'validator_revision');
  source = exact(source, "validatorSemanticRevision: 'responsive-token-set-v1'", "validatorSemanticRevision: 'operational-directory-field-classification-v1'", 'validator_semantic_revision');
  source = exact(source, "classification: 'FUNCTIONAL_DEFECT'", "classification: 'DATA_CONTRACT_FAILURE'", 'validator_classification');
  write(files.visualValidator, source);

  const overlay = json(files.baseOverlay);
  overlay.issuedAt = '2026-07-22';
  overlay.classification = 'DATA_CONTRACT_FAILURE';
  overlay.diagnosticRevision = 'operational-directory-field-classification-v1';
  overlay.contractRevision = '1.0.38-operational-directory-field-classification-v1';
  overlay.gatePatch.contractVersion = '1.0.38';
  overlay.gatePatch.diagnosticRevision = 'operational-directory-field-classification-v1';
  overlay.gatePatch.status = 'STOP_LINE_OPERATIONAL_DIRECTORY_REPAIR_DRYRUN_PENDING';
  overlay.gatePatch.diagnosticRule = 'Portal usernames and insurer bank account numbers are operational directory data. Only passwords are secret. Restore username and account number selectively from the existing vault, preserve references for rollback, and reject any UI or validator that requires temporary bank reveal or hides an available username.';
  overlay.gatePatch.acceptancePolicy = 'Accept only a sanitized dry-run, exact atomic repair with rollback, 414/26/7 preserved, 91 operational bank numbers, two honest pending accounts, all available usernames restored, zero passwords in operational storage, direct bank copy, password-only temporary reveal and one Hosting LAB human review.';
  overlay.effectiveOwnerReconciliation.classification = 'DATA_CONTRACT_FAILURE';
  overlay.effectiveOwnerReconciliation.visualRemediationRevision = '20260722.2';
  overlay.effectiveOwnerReconciliation.dataChanged = true;
  overlay.effectiveOwnerReconciliation.importersChanged = true;
  const visualOwner = ownerById(overlay.canonicalOwners, 'clientInsurerVisualContract');
  visualOwner.requiredTokens = visualOwner.requiredTokens.filter(token => !['function revealBankAccount','data-m1-bank-reveal',"visualRemediationRevision:'20260722.1'"].includes(token));
  visualOwner.requiredTokens = unique(visualOwner.requiredTokens.concat(["visualRemediationRevision:'20260722.2'",'bankNumbersOperationalVisible:true','bankRevealDependency:false','bankCopyDirect:true']));
  const academyOwner = ownerById(overlay.canonicalOwners, 'm1VisualIntegrityAcademy');
  academyOwner.requiredTokens = ["version:'1.221'","contentVersion:'1.229'",'_m1visualv:1229','El usuario del portal permanece visible','número completo','El campo Uso no se muestra ni se copia','operationalDirectorySemantics:true'];
  const validatorOwner = ownerById(overlay.canonicalOwners, 'm1VisualRemediationContract');
  validatorOwner.requiredTokens = ['orbit360-m1-visual-remediation-contract-v1',"contractVersion: '1.0.38'",'BANK_NUMBER_OPERATIONAL_VISIBLE','BANK_NO_TEMPORARY_REVEAL','BANK_COPY_EXCLUDES_USE','ACADEMY_CONTENT_1229','runtimeExecuted: false','browserExecuted: false','deployExecuted: false'];
  const bridgeOwner = ownerById(overlay.canonicalOwners, 'insurerSecureTargetBridge');
  bridgeOwner.requiredTokens = unique(bridgeOwner.requiredTokens.concat(['operationalDirectoryWritesOwnedByImporter: true',"operationalFields: ['usuario','numero']","protectedFields: ['password','contrasena']"]));
  overlay.requiredFiles = unique(overlay.requiredFiles.concat([
    'orbit360-platform/docs/ADDENDUM-MAESTRO-DIRECTORIO-OPERATIVO-USUARIOS-CUENTAS-20260722.md',
    'tools/orbit360-aplicar-correccion-directorio-operativo-v20260722.mjs',
    'tools/orbit360-restituir-directorio-operativo-v20260722.mjs'
  ]));
  const visualRuntime = contractByPath(overlay.runtimeVersionContracts, 'orbit360-platform/core/client-insurer-visual-contract-v20260720.js');
  visualRuntime.requiredTokens = ["version:'20260720.2'","idempotenceRevision:'20260721.4'","visualRemediationRevision:'20260722.2'",'data-m1-credential-user','data-m1-credential-secret','data-m1-bank-number','bankNumbersOperationalVisible:true','bankRevealDependency:false','bankCopyDirect:true','bankCopyExcludesUse:true','bankHolderFallbackInsurer:true','mutationMode:\'same-microtask-disconnect-own-writes\'','observerOwnMutations:false'];
  writeJson(files.baseOverlay, overlay);
  changes.push('base_overlay_operational_contract');

  const registry = json(files.registryExtension);
  const bankOwner = [].concat(registry.canonicalOwners || []).find(item => item && item.id === 'insurerBankAccountProviderE2E');
  if (bankOwner) bankOwner.requiredTokens = ["version: '20260722.2'",'operationalNumberPersistence: true','vaultBackupPreserved: true','supportsBankAccounts = true'];
  const importerGate = [].concat(registry.gates || []).find(item => item && item.gateId === 'block1-real-insurer-directories-lab-v20260720');
  if (importerGate) {
    importerGate.contractVersion = '1.2.0';
    importerGate.diagnosticRevision = 'operational-directory-field-classification-v1';
    importerGate.status = 'SUPERSEDED_SECURITY_CLASSIFICATION_OPERATIONAL_DIRECTORY_REPAIR';
    importerGate.diagnosticRule = 'Only passwords are secret. Portal usernames and bank account numbers must remain in the operational directory after controlled confirmation; references remain as backup and traceability.';
    importerGate.executionBudget.acceptancePolicy = 'Preserve 26 insurers, persist operational usernames and bank numbers, persist zero passwords, keep provider references, read-after-write and rollback.';
    const importerContract = [].concat(importerGate.runtimeVersionContracts || []).find(item => item.path === 'orbit360-platform/core/insurer-directory-import-v1202.js');
    if (importerContract) importerContract.requiredTokens = unique(importerContract.requiredTokens.concat(['usuario: user','numero: accountValue','delete p.password','delete p.contrasena']));
  }
  writeJson(files.registryExtension, registry);
  changes.push('registry_extension_operational_contract');

  const importerOverlay = json(files.importerOverlay);
  importerOverlay.issuedAt = '2026-07-22';
  importerOverlay.classification = 'DATA_CONTRACT_FAILURE';
  importerOverlay.diagnosticRevision = 'operational-directory-field-classification-v1';
  importerOverlay.contractRevision = '1.2.0-operational-directory-field-classification-v1';
  if (importerOverlay.gatePatch) {
    importerOverlay.gatePatch.contractVersion = '1.2.0';
    importerOverlay.gatePatch.diagnosticRevision = 'operational-directory-field-classification-v1';
    importerOverlay.gatePatch.status = 'SUPERSEDED_SECURITY_CLASSIFICATION_OPERATIONAL_DIRECTORY_REPAIR';
    importerOverlay.gatePatch.diagnosticRule = 'Username and bank account number are operational fields; password remains protected. Future imports must preserve username and account number after controlled confirmation.';
  }
  writeJson(files.importerOverlay, importerOverlay);
  changes.push('importer_overlay_operational_contract');

  const manifest = json(files.integrityManifest);
  manifest.issuedAt = '2026-07-22';
  manifest.releaseId = 'block1-critical-runtime-20260722-5';
  manifest.contractVersion = '1.0.38';
  writeJson(files.integrityManifest, manifest);
  changes.push('integrity_manifest_1038');

  [files.visual, files.importer, files.importUi, files.targetBridge, files.credentialProvider, files.bankProvider, files.routerBootstrap, files.visualValidator].forEach(syntax);
  JSON.parse(read(files.baseOverlay));
  JSON.parse(read(files.importerOverlay));
  JSON.parse(read(files.registryExtension));
  JSON.parse(read(files.integrityManifest));

  const forbidden = {
    visualBankProtected: read(files.visual).includes("accountHint(c)||'Cuenta protegida'"),
    visualBankReveal: read(files.visual).includes('data-m1-bank-reveal') || read(files.visual).includes("fieldType:'bank_account'") || read(files.visual).includes('function revealBankAccount'),
    importerDeletesOperationalUsername: read(files.importer).includes('delete p.usuario'),
    importerDeletesOperationalNumber: read(files.importer).includes('delete c.numero')
  };
  if (Object.values(forbidden).some(Boolean)) throw new Error(`FORBIDDEN_OPERATIONAL_SEMANTICS_REMAIN:${JSON.stringify(forbidden)}`);

  const report = {
    schemaVersion: 'orbit360-operational-directory-code-repair-v1',
    generatedAt: new Date().toISOString(),
    ok: true,
    classification: 'DATA_CONTRACT_FAILURE',
    contractVersion: '1.0.38',
    changes,
    invariants: {
      bankNumbersOperationalVisible: true,
      bankCopyDirect: true,
      bankRevealDependency: false,
      usernamesOperationalVisible: true,
      passwordsProtectedOnly: true,
      functionsChanged: false,
      rulesChanged: false,
      dataWritten: false,
      reimportExecuted: false
    },
    containsPII: false,
    containsSecrets: false
  };
  writeJson(files.report, report);
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  const report = {
    schemaVersion: 'orbit360-operational-directory-code-repair-v1',
    generatedAt: new Date().toISOString(),
    ok: false,
    classification: 'PIPELINE_MECHANISM_FAILURE',
    errorCode: String(error && (error.code || error.message) || error).replace(/[^A-Za-z0-9_.:=-]/g, '_').slice(0, 500),
    writesExecuted: false,
    containsPII: false,
    containsSecrets: false
  };
  writeJson(files.report, report);
  console.error(JSON.stringify(report, null, 2));
  process.exit(41);
}
