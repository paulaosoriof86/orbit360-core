#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(process.cwd());
const reportPath = path.join(root, 'orbit360-platform', 'runtime-gate-real-insurer-directories-v20260720', 'bank-contract-patch-sanitizado.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });

const files = {
  importer: path.join(root, 'orbit360-platform/core/insurer-directory-import-v1202.js'),
  ui: path.join(root, 'orbit360-platform/core/aseguradoras-op2-import-ui-guard.js'),
  provider: path.join(root, 'orbit360-platform/core/aseguradoras-bank-accounts-provider-lab-v20260721.js'),
  academy: path.join(root, 'orbit360-platform/data/academia-v1217-aseguradoras-op2.js'),
  validator: path.join(root, 'tools/orbit360-validar-aseguradoras-op2-v1220.mjs'),
  groupValidator: path.join(root, 'tools/orbit360-validar-aseguradoras-op2-group-v1220.mjs'),
  policyValidator: path.join(root, 'tools/orbit360-validar-politica-recursos-aseguradoras-v1218.mjs'),
  registry: path.join(root, 'tools/orbit360-gate-contract-registry-extension-v20260720.json'),
  incident: path.join(root, 'orbit360-platform/docs/INCIDENTE-IMPORTADOR-ASEGURADORAS-PENDIENTES-20260714.md')
};

function read(file) {
  if (!fs.existsSync(file)) throw new Error(`FILE_MISSING:${path.relative(root, file)}`);
  return fs.readFileSync(file, 'utf8');
}

function write(file, content) {
  fs.writeFileSync(file, content.endsWith('\n') ? content : `${content}\n`);
}

function replaceExact(content, before, after, id) {
  const beforeCount = content.split(before).length - 1;
  const afterCount = content.split(after).length - 1;
  if (beforeCount === 1) return { content: content.replace(before, after), changed: true, id };
  if (beforeCount === 0 && afterCount === 1) return { content, changed: false, id };
  throw new Error(`PATCH_SIGNATURE_INVALID:${id}:${beforeCount}:${afterCount}`);
}

function replaceRegex(content, pattern, after, id, readyPattern) {
  if (readyPattern && readyPattern.test(content)) return { content, changed: false, id };
  const matches = content.match(pattern);
  if (!matches || matches.length !== 1) throw new Error(`PATCH_REGEX_INVALID:${id}:${matches ? matches.length : 0}`);
  return { content: content.replace(pattern, after), changed: true, id };
}

const changes = [];

try {
  let importer = read(files.importer);
  let out = replaceExact(
    importer,
    "return [].concat(sourceItems || []).filter(item => item && item.type === 'credential' && !blockedSheets.has(item.insurerSheet));",
    "return [].concat(sourceItems || []).filter(item => item && ['credential','bank_account'].includes(item.type) && !blockedSheets.has(item.insurerSheet));",
    'importer_secure_types'
  );
  importer = out.content; changes.push({ id: out.id, changed: out.changed });
  out = replaceExact(
    importer,
    'Quedan como <code>credentialRef/accountRef = backend_required</code> hasta que el proveedor seguro esté conectado.',
    'Se envían al proveedor protegido al confirmar; la ficha conserva únicamente referencias opacas y datos enmascarados.',
    'importer_secure_copy'
  );
  importer = out.content; changes.push({ id: out.id, changed: out.changed });
  out = replaceExact(importer, 'Guardar únicamente accesos seguros', 'Guardar únicamente recursos protegidos', 'importer_secure_button');
  importer = out.content; changes.push({ id: out.id, changed: out.changed });
  out = replaceExact(importer, 'Motivo de la carga segura de accesos:', 'Motivo de la carga segura de recursos:', 'importer_secure_reason');
  importer = out.content; changes.push({ id: out.id, changed: out.changed });
  out = replaceExact(importer, 'Guardando accesos de forma segura…', 'Guardando recursos de forma segura…', 'importer_secure_progress');
  importer = out.content; changes.push({ id: out.id, changed: out.changed });
  out = replaceExact(importer, "applied.imported + ' acceso(s) guardados de forma segura'", "applied.imported + ' recurso(s) guardados de forma segura'", 'importer_secure_success');
  importer = out.content; changes.push({ id: out.id, changed: out.changed });
  write(files.importer, importer);

  let provider = read(files.provider);
  out = replaceExact(
    provider,
    '    state.importProviderWrapped = true;\n    Orbit.__insurerBankAccountProviderLabV20260721 = state;',
    "    Orbit.secureImport.supportsBankAccounts = true;\n    Orbit.secureImport.bankAccountProviderVersion = state.version;\n    state.importProviderWrapped = true;\n    Orbit.__insurerBankAccountProviderLabV20260721 = state;",
    'provider_capability_flag'
  );
  provider = out.content; changes.push({ id: out.id, changed: out.changed });
  write(files.provider, provider);

  let ui = read(files.ui);
  out = replaceExact(ui, "var VERSION = '20260720.1';", "var VERSION = '20260721.1';", 'ui_version');
  ui = out.content; changes.push({ id: out.id, changed: out.changed });
  out = replaceRegex(
    ui,
    /  function eligibleProtectedCount\(result\) \{[\s\S]*?\n  \}\n  function allowCollection\(\) \{/,
    `  function eligibleProtectedSummary(result) {
    var valid = validOps(result);
    return [].concat(result && result.candidates || []).reduce(function (summary, candidate) {
      var op = valid.find(function (item) { return clean(item && item.sourceSheet, 240) === clean(candidate && candidate.sourceSheet, 240); });
      if (!op) return summary;
      var sensitive = candidate && candidate.record && candidate.record.sensitiveImportStatus || {};
      summary.credentials += Number(sensitive.credentialsDetected || 0);
      summary.accounts += Number(sensitive.accountsDetected || 0);
      summary.total = summary.credentials + summary.accounts;
      return summary;
    }, { credentials: 0, accounts: 0, total: 0 });
  }
  function eligibleProtectedCount(result) { return eligibleProtectedSummary(result).total; }
  function allowCollection() {`,
    'ui_eligible_protected_summary',
    /function eligibleProtectedSummary\(result\)/
  );
  ui = out.content; changes.push({ id: out.id, changed: out.changed });
  out = replaceExact(
    ui,
    "      var uid = actorId(), batch = batchOf(result);\n      if (!uid || !batch.operations.length) return { ok: false, errors: ['sin_operaciones_validadas'] };",
    "      var uid = actorId(), batch = batchOf(result), eligibleSummary = eligibleProtectedSummary(result);\n      if (!uid || !batch.operations.length) return { ok: false, errors: ['sin_operaciones_validadas'] };\n      if (eligibleSummary.accounts > 0 && !(Orbit.secureImport && Orbit.secureImport.supportsBankAccounts === true)) return { ok: false, errors: ['proveedor_cuentas_no_disponible'] };",
    'ui_bank_provider_gate'
  );
  ui = out.content; changes.push({ id: out.id, changed: out.changed });
  out = replaceExact(
    ui,
    "      var protectedTotal = Number(result && result.report && result.report.sensitiveSummary && result.report.sensitiveSummary.credentials || 0);",
    "      var protectedSummary = result && result.report && result.report.sensitiveSummary || {};\n      var protectedTotal = Number(protectedSummary.credentials || 0) + Number(protectedSummary.accounts || 0);",
    'ui_protected_total'
  );
  ui = out.content; changes.push({ id: out.id, changed: out.changed });
  out = replaceExact(
    ui,
    "      state.done = {\n        ok: true, batchId: batch.batchId, written: batch.operations.length,\n        created: batch.operations.filter(function (op) { return op.action === 'insert'; }).length,\n        updated: batch.operations.filter(function (op) { return op.action === 'update'; }).length,\n        blocked: blockedCount(result), protectedImported: Number(protectedResult.imported || 0),\n        protectedSkipped: Math.max(0, protectedTotal - protectedEligible),\n        accountResourcesPending: Number(result && result.report && result.report.sensitiveSummary && result.report.sensitiveSummary.accounts || 0),\n        rollbackAvailable: state.rollback.length > 0, containsProtectedValues: false\n      };",
    "      var protectedMappings = [].concat(protectedResult && protectedResult.mappings || []);\n      var accountResourcesProtected = protectedMappings.filter(function (mapping) { return mapping && (clean(mapping.accountRef, 80) || /^acct_/.test(clean(mapping.credentialRef, 80))); }).length;\n      var credentialResourcesProtected = Math.max(0, Number(protectedResult.imported || 0) - accountResourcesProtected);\n      state.done = {\n        ok: true, batchId: batch.batchId, written: batch.operations.length,\n        created: batch.operations.filter(function (op) { return op.action === 'insert'; }).length,\n        updated: batch.operations.filter(function (op) { return op.action === 'update'; }).length,\n        blocked: blockedCount(result), protectedImported: Number(protectedResult.imported || 0),\n        credentialResourcesProtected: credentialResourcesProtected,\n        accountResourcesProtected: accountResourcesProtected,\n        protectedSkipped: Math.max(0, protectedTotal - protectedEligible),\n        rollbackAvailable: state.rollback.length > 0, containsProtectedValues: false\n      };",
    'ui_done_counts'
  );
  ui = out.content; changes.push({ id: out.id, changed: out.changed });
  out = replaceExact(ui, '<div><small>Accesos confirmados</small><b>\' + done.protectedImported + \'</b></div><div><small>Cuentas pendientes</small><b>\' + done.accountResourcesPending + \'</b></div>', '<div><small>Accesos protegidos</small><b>\' + done.credentialResourcesProtected + \'</b></div><div><small>Cuentas protegidas</small><b>\' + done.accountResourcesProtected + \'</b></div>', 'ui_done_copy');
  ui = out.content; changes.push({ id: out.id, changed: out.changed });
  out = replaceExact(ui, "toast(out.written + ' aseguradora(s) confirmadas · ' + out.protectedImported + ' acceso(s) disponibles.');", "toast(out.written + ' aseguradora(s) confirmadas · ' + out.protectedImported + ' recurso(s) protegidos disponibles.');", 'ui_toast');
  ui = out.content; changes.push({ id: out.id, changed: out.changed });
  out = replaceExact(ui, 'accountProviderPending: true', 'accountProviderPending: false', 'ui_provider_state');
  ui = out.content; changes.push({ id: out.id, changed: out.changed });
  write(files.ui, ui);

  let academy = read(files.academy);
  const academyPairs = [
    ['Academia profunda Aseguradoras OP-2 v1.221', 'Academia profunda Aseguradoras OP-2 v1.222'],
    ['_op2v:1221', '_op2v:1222'],
    ["[1217,1218,1219,1220,1221]", "[1217,1218,1219,1220,1221,1222]"],
    ['next._cv = 1221', 'next._cv = 1222'],
    ["return { version:'1.221'", "return { version:'1.222'"],
    ["Orbit.ACADEMIA_V1221_ASEGURADORAS = Orbit.ACADEMIA_V1220_ASEGURADORAS;", "Orbit.ACADEMIA_V1221_ASEGURADORAS = Orbit.ACADEMIA_V1220_ASEGURADORAS;\nOrbit.ACADEMIA_V1222_ASEGURADORAS = Orbit.ACADEMIA_V1220_ASEGURADORAS;"],
    ["Los datos operativos no sensibles pueden incorporarse al directorio. Un número bancario completo solo se declara disponible cuando existe y responde su proveedor protegido específico; hasta entonces debe aparecer como pendiente, no como importado.", "Los números bancarios completos se envían al proveedor protegido y la ficha conserva únicamente accountRef y una terminación enmascarada. Una cuenta solo se declara disponible después de confirmar escritura y lectura protegida."],
    ["“Fuente recibida”, “dry-run generado”, “requiere validación”, “dato confirmado”, “acceso disponible” y “cuenta protegida pendiente” son estados diferentes.", "“Fuente recibida”, “dry-run generado”, “requiere validación”, “dato confirmado”, “acceso disponible” y “cuenta protegida confirmada” son estados diferentes."],
    ["¿Qué estado corresponde a un número bancario completo sin proveedor protegido?", "¿Cuándo puede declararse disponible un número bancario completo?"],
    ["['Disponible','Pendiente de conexión protegida','Validado automáticamente']", "['Cuando existe en el Excel','Después de escritura y lectura confirmadas en el proveedor protegido','Al crear la ficha']"]
  ];
  for (const [before, after] of academyPairs) {
    out = replaceExact(academy, before, after, `academy_${before.slice(0, 24)}`);
    academy = out.content; changes.push({ id: out.id, changed: out.changed });
  }
  write(files.academy, academy);

  let validator = read(files.validator);
  out = replaceExact(validator, "check('ACADEMY_V1220', all(src.academy,['Cuarentena de hojas','Identidad exacta antes de actualizar','Mensajes operativos','next._cv = 1220']), 'Academia enseña contratos v1.220', files.academy);", "check('ACADEMY_V1222', all(src.academy,['Carga directa desde Orbit','Escritura controlada y lectura posterior','Cuentas bancarias con estado honesto','next._cv = 1222']), 'Academia enseña contratos v1.222', files.academy);", 'validator_academy');
  validator = out.content; changes.push({ id: out.id, changed: out.changed });
  write(files.validator, validator);

  let groupValidator = read(files.groupValidator);
  out = replaceExact(groupValidator, "const staleIds = new Set(['UI_REVIEW_NO_CAPTURE','UI_FAIL_CLOSED','ACADEMY_V1220']);", "const staleIds = new Set(['UI_REVIEW_NO_CAPTURE','UI_FAIL_CLOSED']);", 'group_stale_ids');
  groupValidator = out.content; changes.push({ id: out.id, changed: out.changed });
  out = replaceExact(groupValidator, "importUi.includes('owner visual canónico v1.221')", "importUi.includes('owner visual canónico v1.221')", 'group_owner_unchanged');
  groupValidator = out.content;
  out = replaceExact(groupValidator, "importUi.includes('eligibleProtectedCount(result)')", "importUi.includes('eligibleProtectedSummary(result)') && importUi.includes('eligibleProtectedCount(result)')", 'group_protected_summary');
  groupValidator = out.content; changes.push({ id: out.id, changed: out.changed });
  out = replaceExact(groupValidator, "requireToken('CANONICAL_IMPORT_HONEST_BANK_GAP', importUi.includes('accountResourcesPending') && importUi.includes('Cuentas pendientes') && importUi.includes('accountProviderPending: true'), 'La falta de proveedor protegido para cuentas debe permanecer visible');", "requireToken('CANONICAL_IMPORT_BANK_PROVIDER', importUi.includes('accountResourcesProtected') && importUi.includes('Cuentas protegidas') && importUi.includes('accountProviderPending: false') && importUi.includes('proveedor_cuentas_no_disponible'), 'Las cuentas deben usar proveedor protegido y bloquear el cierre si no está disponible');", 'group_bank_provider');
  groupValidator = out.content; changes.push({ id: out.id, changed: out.changed });
  write(files.groupValidator, groupValidator);

  let policyValidator = read(files.policyValidator);
  out = replaceExact(policyValidator, "'next._cv = 1221'", "'next._cv = 1222'", 'policy_academy_version');
  policyValidator = out.content; changes.push({ id: out.id, changed: out.changed });
  write(files.policyValidator, policyValidator);

  const registry = JSON.parse(read(files.registry));
  const ownerId = 'insurerBankAccountProviderE2E';
  if (!registry.canonicalOwners.some((item) => item.id === ownerId)) {
    registry.canonicalOwners.push({
      id: ownerId,
      path: 'orbit360-platform/core/aseguradoras-bank-accounts-provider-lab-v20260721.js',
      requiredTokens: [
        "version: '20260721.1'",
        'registerFieldProvider',
        'supportsBankAccounts = true',
        'orbit360ImportInsurerBankAccounts',
        'applyMappings(result)'
      ]
    });
    changes.push({ id: 'registry_bank_owner', changed: true });
  }
  const executionOwner = registry.canonicalOwners.find((item) => item.id === 'realInsurerDirectoryExecution');
  if (!executionOwner) throw new Error('REGISTRY_OWNER_MISSING:realInsurerDirectoryExecution');
  executionOwner.requiredTokens = executionOwner.requiredTokens.map((token) => token === 'accountProviderPending: true' ? 'accountProviderPending: false' : token);
  if (!executionOwner.requiredTokens.includes('eligibleProtectedSummary(result)')) executionOwner.requiredTokens.push('eligibleProtectedSummary(result)');

  const gate = registry.gates.find((item) => item.gateId === 'block1-real-insurer-directories-lab-v20260720');
  if (!gate) throw new Error('REGISTRY_GATE_MISSING');
  gate.contractVersion = '1.1.0';
  gate.diagnosticRevision = 'secure-bank-provider-and-legacy-migration-v1';
  gate.runtimeVersion = '20260721-1';
  gate.status = 'ACTIVE_SECURITY_ROOT_CAUSE_FIX';
  gate.diagnosticRule = 'Real insurer data is accepted only after portal credentials and bank accounts use protected providers, legacy bank values are migrated out of operational Firestore, GT and CO are uploaded separately from Orbit, and every write has read-after-write, sanitized evidence and rollback.';
  gate.executionBudget.acceptancePolicy = 'Only sanitized evidence may close the gate: 26 canonical insurers preserved; zero unmasked portal or bank values in operational storage; at least 91 legacy bank references confirmed; one protected bank reveal confirmed without exposing the value; GT then CO uploaded separately; no blind merge; per-insurer completeness matrix; rollback available.';
  const addUnique = (array, values) => Array.from(new Set([].concat(array || [], values || [])));
  gate.validators = addUnique(gate.validators, [
    'tools/orbit360-migrar-cuentas-aseguradoras-vault-lab-v20260721-v2.mjs',
    'tools/orbit360-validar-proveedor-cuentas-aseguradoras-lab-v20260721.mjs',
    'tools/orbit360-aseguradoras-import-readiness-v20260720.mjs'
  ]);
  gate.requiredFiles = addUnique(gate.requiredFiles, [
    'functions/bank-accounts.js',
    'functions/bootstrap.js',
    'functions/package.json',
    'orbit360-platform/core/aseguradoras-bank-accounts-provider-lab-v20260721.js',
    'tools/orbit360-migrar-cuentas-aseguradoras-vault-lab-v20260721-v2.mjs',
    'tools/orbit360-validar-proveedor-cuentas-aseguradoras-lab-v20260721.mjs'
  ]);
  gate.runtimeGraphFiles = addUnique(gate.runtimeGraphFiles, [
    'orbit360-platform/core/aseguradoras-bank-accounts-provider-lab-v20260721.js',
    'functions/bank-accounts.js',
    'functions/bootstrap.js'
  ]);
  gate.runtimeVersionContracts = gate.runtimeVersionContracts.filter((item) => item.path !== 'orbit360-platform/core/aseguradoras-bank-accounts-provider-lab-v20260721.js' && item.path !== 'functions/bank-accounts.js' && item.path !== 'functions/bootstrap.js');
  const uiContract = gate.runtimeVersionContracts.find((item) => item.path === 'orbit360-platform/core/aseguradoras-op2-import-ui-guard.js');
  if (!uiContract) throw new Error('REGISTRY_UI_CONTRACT_MISSING');
  uiContract.requiredTokens = [
    "var VERSION = '20260721.1'",
    'singleFileRead: true',
    'Orbit.importaWriteP0.writeBatch',
    'async function waitWritten',
    'eligibleProtectedSummary(result)',
    'applySecureOnly(result',
    'Orbit.importaWriteP0.rollback',
    'accountProviderPending: false'
  ];
  const importerContract = gate.runtimeVersionContracts.find((item) => item.path === 'orbit360-platform/core/insurer-directory-import-v1202.js');
  if (!importerContract) throw new Error('REGISTRY_IMPORTER_CONTRACT_MISSING');
  importerContract.requiredTokens = addUnique(importerContract.requiredTokens, ["['credential','bank_account'].includes(item.type)"]);
  gate.runtimeVersionContracts.push({
    path: 'orbit360-platform/core/aseguradoras-bank-accounts-provider-lab-v20260721.js',
    requiredTokens: ['registerFieldProvider', 'supportsBankAccounts = true', 'orbit360ImportInsurerBankAccounts']
  });
  gate.runtimeVersionContracts.push({
    path: 'functions/bank-accounts.js',
    requiredTokens: ['exports.orbit360ImportInsurerBankAccounts', 'exports.orbit360BankAccountStatus', 'exports.orbit360RevealInsurerBankAccount', 'exports.orbit360CopyInsurerBankAccount']
  });
  gate.runtimeVersionContracts.push({
    path: 'functions/bootstrap.js',
    requiredTokens: ["require('./index')", "require('./bank-accounts')"]
  });
  write(files.registry, JSON.stringify(registry, null, 2));
  changes.push({ id: 'registry_gate_1_1_0', changed: true });

  let incident = read(files.incident);
  const marker = '## Causa raíz definitiva · cuentas bancarias protegidas — 2026-07-21';
  if (!incident.includes(marker)) {
    incident += `\n\n${marker}\n\nClasificación: \`SECURITY_FAILURE + DATA_CONTRACT_FAILURE + PIPELINE_MECHANISM_FAILURE\`.\n\nLa carga inicial conservó 91 números bancarios completos en la colección operativa de Aseguradoras. El parser ya los separaba como recursos protegidos, pero el flujo \`applySecureOnly\` filtraba únicamente credenciales de portales y no existía proveedor bancario conectado. El pipeline autorreparable ocultó la brecha al depender de un segundo workflow que GitHub no disparaba desde \`GITHUB_TOKEN\`.\n\nCorrección de raíz:\n\n- un solo gate ejecuta preflight, contratos, proveedor, migración, preview y navegador;\n- el mismo backend seguro admite credenciales y cuentas con referencias distintas;\n- la migración idempotente crea una nueva versión de bóveda, confirma lectura y sustituye texto plano mediante batch atómico;\n- el importador envía \`credential\` y \`bank_account\` en la misma confirmación protegida;\n- el owner bloquea el cierre si existen cuentas y el proveedor bancario no está disponible;\n- Academia y validadores distinguen fuente, escritura operativa y recurso protegido confirmado.\n\nNo se reimportan aseguradoras para resolver esta falla. No se documentan ni publican valores reales. Clasificación Claude: \`BACKEND_PROTEGIDO_NO_CLAUDE\`; solo el patrón UX/metodológico se acumula como \`REPLICABLE_CLAUDE_ACUMULADO\`.\n`;
    write(files.incident, incident);
    changes.push({ id: 'incident_root_cause', changed: true });
  }

  const syntaxFiles = [files.importer, files.ui, files.provider, files.academy, files.validator, files.groupValidator, files.policyValidator];
  for (const file of syntaxFiles) {
    const check = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (check.status !== 0) throw new Error(`SYNTAX_INVALID:${path.relative(root, file)}:${String(check.stderr || check.stdout).trim()}`);
  }
  JSON.parse(read(files.registry));

  const report = {
    schemaVersion: 'orbit360-secure-bank-contract-patch-v1',
    generatedAt: new Date().toISOString(),
    containsPII: false,
    containsSecrets: false,
    ok: true,
    changed: changes.filter((item) => item.changed).map((item) => item.id),
    alreadyApplied: changes.filter((item) => !item.changed).map((item) => item.id)
  };
  write(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} catch (error) {
  const report = {
    schemaVersion: 'orbit360-secure-bank-contract-patch-v1',
    generatedAt: new Date().toISOString(),
    containsPII: false,
    containsSecrets: false,
    ok: false,
    errorCode: String(error && (error.code || error.message) || error).replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 300)
  };
  write(reportPath, JSON.stringify(report, null, 2));
  console.error(JSON.stringify(report));
  process.exit(1);
}
