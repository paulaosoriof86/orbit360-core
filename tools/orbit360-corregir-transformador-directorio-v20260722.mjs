#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TRANSFORM = path.join(ROOT, 'tools/orbit360-aplicar-correccion-directorio-operativo-v20260722.mjs');
const LIFECYCLE = path.join(ROOT, 'tools/orbit360-validator-lifecycle-contract-v20260722.json');
const FREEZE = path.join(ROOT, 'tools/orbit360-incident-freeze-v20260721.json');
const REPORT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/operational-directory-transformer-alignment-sanitized.json');
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
function replaceExact(source, before, after, id) {
  const beforeCount = occurrences(source, before);
  const afterCount = occurrences(source, after);
  if (beforeCount === 1) {
    changes.push(id);
    return source.replace(before, after);
  }
  if (beforeCount === 0 && afterCount >= 1) return source;
  throw new Error(`ALIGNMENT_SIGNATURE_INVALID:${id}:before=${beforeCount}:after=${afterCount}`);
}
function insertBefore(source, marker, block, readyToken, id) {
  if (source.includes(readyToken)) return source;
  if (occurrences(source, marker) !== 1) throw new Error(`ALIGNMENT_INSERT_MARKER_INVALID:${id}:${occurrences(source, marker)}`);
  changes.push(id);
  return source.replace(marker, `${block}${marker}`);
}
function writeReport(payload) { write(REPORT, JSON.stringify(payload, null, 2)); }

try {
  let source = read(TRANSFORM);

  const twoUsernameCalls = `  source = exact(source,
    "url: url.url, urlHint: url.urlHint, urlRef: url.urlRef, usuarioHint: maskUser(user), credentialRef: ref,",
    "url: url.url, urlHint: url.urlHint, urlRef: url.urlRef, usuario: user, usuarioHint: maskUser(user), credentialRef: ref,",
    'importer_gt_username_operational');
  source = exact(source,
    "url: url.url, urlHint: url.urlHint, urlRef: url.urlRef, usuarioHint: maskUser(user), credentialRef: ref,",
    "url: url.url, urlHint: url.urlHint, urlRef: url.urlRef, usuario: user, usuarioHint: maskUser(user), credentialRef: ref,",
    'importer_co_username_operational');`;
  const oneUsernameCall = `  source = exact(source,
    "url: url.url, urlHint: url.urlHint, urlRef: url.urlRef, usuarioHint: maskUser(user), credentialRef: ref,",
    "url: url.url, urlHint: url.urlHint, urlRef: url.urlRef, usuario: user, usuarioHint: maskUser(user), credentialRef: ref,",
    'importer_usernames_operational', 2);`;
  source = replaceExact(source, twoUsernameCalls, oneUsernameCall, 'transform_importer_username_count');

  source = replaceExact(
    source,
    "  source = exact(source, '_m1visualv!==1228', '_m1visualv!==1228&&x._m1visualv!==1229', 'academy_lesson_filter');",
    "  source = exact(source, '_m1visualv!==1228', '_m1visualv!==1228&&x._m1visualv!==1229', 'academy_lesson_filter', 2);",
    'transform_academy_filter_count'
  );

  const wrongBankCopy = `  source = regex(source,
    /    var bankCopy=event\\.target\\.closest\\('\\[data-m1-bank-copy-all\\]'\\);if\\(bankCopy\\)\\{[\\s\\S]*?return;\\}/,
    "    var bankCopy=event.target.closest('[data-m1-bank-copy-all]');if(bankCopy){var a=currentInsurer(),c=a&&a.cuentas&&a.cuentas[+bankCopy.dataset.m1BankCopyAll];if(!c)return;var number=clean(c.numero||c.numeroCuenta||c.accountNumber||'');if(!number){toast('Número de cuenta pendiente de registrar');return;}var full=['Banco: '+(c.banco||'—'),'Tipo: '+(c.tipo||'—'),'Cuenta: '+number,'Moneda: '+(c.moneda||'—'),'Titular: '+accountHolder(c,a)].join('\\\\n');writeClipboard(full).then(function(ok){toast(ok?'Datos bancarios copiados':'No fue posible copiar');});return;}",
    'visual_direct_bank_copy',
    /bankNumbersOperationalVisible:true/);`;
  const correctBankCopy = `  source = regex(source,
    /    var bank=event\\.target\\.closest\\('\\[data-m1-bank-copy-all\\]'\\);if\\(bank\\)\\{[\\s\\S]*?return;\\}/,
    "    var bank=event.target.closest('[data-m1-bank-copy-all]');if(bank){event.preventDefault();event.stopPropagation();var a=currentInsurer(),c=a&&a.cuentas&&a.cuentas[+bank.dataset.m1BankCopyAll];if(!c)return;var number=clean(c.numero||c.numeroCuenta||c.accountNumber||'');if(!number){if(Orbit.ui&&Orbit.ui.toast)Orbit.ui.toast('Número de cuenta pendiente de registrar');return;}var full=['Banco: '+(c.banco||'—'),'Tipo: '+(c.tipo||'—'),'Cuenta: '+number,'Moneda: '+(c.moneda||'—'),'Titular: '+accountHolder(c,a)].join('\\\\n'),copied=await copyText(full);if(Orbit.ui&&Orbit.ui.toast)Orbit.ui.toast(copied?'Datos bancarios copiados':'No fue posible copiar');return;}",
    'visual_direct_bank_copy',
    /bankNumbersOperationalVisible:true/);`;
  source = replaceExact(source, wrongBankCopy, correctBankCopy, 'transform_visual_bank_copy_signature');

  source = replaceExact(
    source,
    `  source = exact(source, "var CRITICAL_RELEASE = 'block1-critical-runtime-20260721-4';", "var CRITICAL_RELEASE = 'block1-critical-runtime-20260722-5';", 'router_release');\n`,
    '',
    'transform_preserve_pwa_release'
  );
  source = replaceExact(
    source,
    `  source = exact(source, "visualContractDeliveryRevision: '20260721.4'", "visualContractDeliveryRevision: '20260722.5'", 'router_visual_delivery_revision');\n`,
    '',
    'transform_preserve_router_release_revision'
  );
  source = replaceExact(
    source,
    `  manifest.releaseId = 'block1-critical-runtime-20260722-5';\n`,
    '',
    'transform_preserve_integrity_release_id'
  );

  source = insertBefore(
    source,
    "  write(files.bankProvider, source);",
    `  source = exact(source,
    "        delete accounts[index].numero;\\n        delete accounts[index].accountNumber;\\n",
    "",
    'bank_provider_preserve_operational_number');
`,
    'bank_provider_preserve_operational_number',
    'transform_bank_provider_no_delete'
  );

  source = insertBefore(
    source,
    "  write(files.visualValidator, source);",
    `  source = exact(source,
    "check('OVERLAY_1037', overlay.gatePatch && overlay.gatePatch.contractVersion === '1.0.37' && String(overlay.contractRevision || '').startsWith('1.0.37'), overlay.contractRevision || 'missing');",
    "check('OVERLAY_1038', overlay.gatePatch && overlay.gatePatch.contractVersion === '1.0.38' && String(overlay.contractRevision || '').startsWith('1.0.38'), overlay.contractRevision || 'missing');",
    'validator_overlay_1038');
  source = exact(source,
    "check('OVERLAY_FUNCTIONAL_DEFECT', overlay.classification === 'FUNCTIONAL_DEFECT', overlay.classification || 'missing');",
    "check('OVERLAY_DATA_CONTRACT_FAILURE', overlay.classification === 'DATA_CONTRACT_FAILURE', overlay.classification || 'missing');",
    'validator_overlay_classification');
  source = exact(source,
    "check('MANIFEST_1037', manifest.contractVersion === '1.0.37', manifest.contractVersion || 'missing');",
    "check('MANIFEST_1038', manifest.contractVersion === '1.0.38', manifest.contractVersion || 'missing');",
    'validator_manifest_1038');
`,
    'validator_overlay_1038',
    'transform_validator_contract_alignment'
  );

  source = replaceExact(
    source,
    "  overlay.effectiveOwnerReconciliation.dataChanged = true;",
    "  overlay.effectiveOwnerReconciliation.dataChanged = false;\n  overlay.effectiveOwnerReconciliation.dataRepairPlanned = true;",
    'transform_overlay_data_state'
  );

  source = insertBefore(
    source,
    "  overlay.requiredFiles = unique(overlay.requiredFiles.concat([",
    `  const routerRuntime = contractByPath(overlay.runtimeVersionContracts, 'orbit360-platform/core/router-tenant-config-bootstrap.js');
  routerRuntime.requiredTokens = routerRuntime.requiredTokens.map(token => token === 'client-insurer-visual-contract-v20260720.js?v=20260721-4' ? 'client-insurer-visual-contract-v20260720.js?v=20260722-5' : token);
`,
    "client-insurer-visual-contract-v20260720.js?v=20260722-5' : token",
    'transform_overlay_router_cache_contract'
  );

  fs.writeFileSync(TRANSFORM, source, 'utf8');

  const lifecycle = JSON.parse(read(LIFECYCLE));
  const repairOwner = (lifecycle.canonicalOverlayPatch?.canonicalOwners || []).find(item => item.id === 'operationalDirectoryRepair');
  if (!repairOwner) throw new Error('LIFECYCLE_REPAIR_OWNER_MISSING');
  repairOwner.requiredTokens = repairOwner.requiredTokens.map(token => token === 'LAB_DATA_CONTRACT_REPAIR' ? 'orbit360-operational-directory-repair-v1' : token);
  if (!repairOwner.requiredTokens.includes('orbit360-operational-directory-repair-v1')) throw new Error('LIFECYCLE_REPAIR_TOKEN_NOT_ALIGNED');
  lifecycle.canonicalOverlayPatch.requiredFiles = [...new Set([...(lifecycle.canonicalOverlayPatch.requiredFiles || []), 'tools/orbit360-corregir-transformador-directorio-v20260722.mjs'])];
  fs.writeFileSync(LIFECYCLE, `${JSON.stringify(lifecycle, null, 2)}\n`, 'utf8');
  changes.push('lifecycle_repair_owner_token');

  const freeze = JSON.parse(read(FREEZE));
  freeze.blockedGateIds = [freeze.gateId];
  freeze.blockedActions = [...new Set([...(freeze.blockedActions || []), 'run_runtime', 'open_browser', 'deploy_hosting_lab'])];
  freeze.stateClarification = Object.assign({}, freeze.stateClarification || {}, { runtimeAuthorized: false, deployAuthorized: false });
  fs.writeFileSync(FREEZE, `${JSON.stringify(freeze, null, 2)}\n`, 'utf8');
  changes.push('freeze_visual_validator_compatibility');

  const payload = {
    schemaVersion: 'orbit360-operational-directory-transformer-alignment-v1',
    generatedAt: new Date().toISOString(),
    ok: true,
    changes,
    dataWritten: false,
    secretsRead: false,
    functionsChanged: false,
    rulesChanged: false,
    containsPII: false,
    containsSecrets: false
  };
  writeReport(payload);
  console.log(JSON.stringify(payload, null, 2));
} catch (error) {
  const payload = {
    schemaVersion: 'orbit360-operational-directory-transformer-alignment-v1',
    generatedAt: new Date().toISOString(),
    ok: false,
    classification: 'PIPELINE_MECHANISM_FAILURE',
    errorCode: String(error && (error.code || error.message) || error).replace(/[^A-Za-z0-9_.:=-]/g, '_').slice(0, 500),
    dataWritten: false,
    secretsRead: false,
    containsPII: false,
    containsSecrets: false
  };
  writeReport(payload);
  console.error(JSON.stringify(payload, null, 2));
  process.exit(41);
}
