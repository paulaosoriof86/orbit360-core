#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(process.cwd());
const rel = (value) => path.join(root, value);
const paths = {
  importer: rel('orbit360-platform/core/insurer-directory-import-v1202.js'),
  ui: rel('orbit360-platform/core/aseguradoras-op2-import-ui-guard.js'),
  provider: rel('orbit360-platform/core/aseguradoras-bank-accounts-provider-lab-v20260721.js'),
  academy: rel('orbit360-platform/data/academia-v1217-aseguradoras-op2.js'),
  validator: rel('tools/orbit360-validar-aseguradoras-op2-v1220.mjs'),
  group: rel('tools/orbit360-validar-aseguradoras-op2-group-v1220.mjs'),
  policy: rel('tools/orbit360-validar-politica-recursos-aseguradoras-v1218.mjs'),
  registry: rel('tools/orbit360-gate-contract-registry-extension-v20260720.json'),
  incident: rel('orbit360-platform/docs/INCIDENTE-IMPORTADOR-ASEGURADORAS-PENDIENTES-20260714.md'),
  preliminary: rel('tools/orbit360-aplicar-correccion-cuentas-importador-v20260721.mjs'),
  report: rel('orbit360-platform/runtime-gate-real-insurer-directories-v20260720/bank-contract-patch-sanitizado.json')
};

fs.mkdirSync(path.dirname(paths.report), { recursive: true });
const changes = [];

function read(file) {
  if (!fs.existsSync(file)) throw new Error(`FILE_MISSING:${path.relative(root, file)}`);
  return fs.readFileSync(file, 'utf8');
}
function write(file, value) { fs.writeFileSync(file, value.endsWith('\n') ? value : `${value}\n`); }
function count(source, token) { return source.split(token).length - 1; }
function once(source, before, after, id) {
  const b = count(source, before), a = count(source, after);
  if (b === 1) { changes.push(id); return source.replace(before, after); }
  if (b === 0 && a >= 1) return source;
  throw new Error(`SIGNATURE_INVALID:${id}:${b}:${a}`);
}
function all(source, before, after, expected, id) {
  const b = count(source, before), a = count(source, after);
  if (b === expected) { changes.push(id); return source.split(before).join(after); }
  if (b === 0 && a >= expected) return source;
  throw new Error(`SIGNATURE_INVALID:${id}:${b}:${a}`);
}
function regexOnce(source, pattern, after, id, ready) {
  if (ready && ready.test(source)) return source;
  const matches = source.match(pattern);
  if (!matches || matches.length !== 1) throw new Error(`REGEX_INVALID:${id}:${matches ? matches.length : 0}`);
  changes.push(id);
  return source.replace(pattern, after);
}
function addUnique(array, values) { return Array.from(new Set([].concat(array || [], values || []))); }

try {
  let source = read(paths.importer);
  source = once(source,
    "return [].concat(sourceItems || []).filter(item => item && item.type === 'credential' && !blockedSheets.has(item.insurerSheet));",
    "return [].concat(sourceItems || []).filter(item => item && ['credential','bank_account'].includes(item.type) && !blockedSheets.has(item.insurerSheet));",
    'importer_secure_types');
  source = once(source,
    'Quedan como <code>credentialRef/accountRef = backend_required</code> hasta que el proveedor seguro esté conectado.',
    'Se envían al proveedor protegido al confirmar; la ficha conserva únicamente referencias opacas y datos enmascarados.',
    'importer_copy');
  source = all(source, 'Guardar únicamente accesos seguros', 'Guardar únicamente recursos protegidos', 2, 'importer_button');
  source = once(source, 'Motivo de la carga segura de accesos:', 'Motivo de la carga segura de recursos:', 'importer_reason');
  source = once(source, 'Guardando accesos de forma segura…', 'Guardando recursos de forma segura…', 'importer_progress');
  source = once(source, "applied.imported + ' acceso(s) guardados de forma segura'", "applied.imported + ' recurso(s) guardados de forma segura'", 'importer_success');
  write(paths.importer, source);

  source = read(paths.provider);
  source = once(source,
    '    state.importProviderWrapped = true;\n    Orbit.__insurerBankAccountProviderLabV20260721 = state;',
    "    Orbit.secureImport.supportsBankAccounts = true;\n    Orbit.secureImport.bankAccountProviderVersion = state.version;\n    state.importProviderWrapped = true;\n    Orbit.__insurerBankAccountProviderLabV20260721 = state;",
    'provider_capability');
  write(paths.provider, source);

  source = read(paths.ui);
  source = once(source, "var VERSION = '20260720.1';", "var VERSION = '20260721.1';", 'ui_version');
  source = regexOnce(source,
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
    'ui_summary', /function eligibleProtectedSummary\(result\)/);
  source = once(source,
    "      var uid = actorId(), batch = batchOf(result);\n      if (!uid || !batch.operations.length) return { ok: false, errors: ['sin_operaciones_validadas'] };",
    "      var uid = actorId(), batch = batchOf(result), eligibleSummary = eligibleProtectedSummary(result);\n      if (!uid || !batch.operations.length) return { ok: false, errors: ['sin_operaciones_validadas'] };\n      if (eligibleSummary.accounts > 0 && !(Orbit.secureImport && Orbit.secureImport.supportsBankAccounts === true)) return { ok: false, errors: ['proveedor_cuentas_no_disponible'] };",
    'ui_provider_gate');
  source = once(source,
    "      var protectedTotal = Number(result && result.report && result.report.sensitiveSummary && result.report.sensitiveSummary.credentials || 0);",
    "      var protectedSummary = result && result.report && result.report.sensitiveSummary || {};\n      var protectedTotal = Number(protectedSummary.credentials || 0) + Number(protectedSummary.accounts || 0);",
    'ui_total');
  source = once(source,
    "      state.done = {\n        ok: true, batchId: batch.batchId, written: batch.operations.length,\n        created: batch.operations.filter(function (op) { return op.action === 'insert'; }).length,\n        updated: batch.operations.filter(function (op) { return op.action === 'update'; }).length,\n        blocked: blockedCount(result), protectedImported: Number(protectedResult.imported || 0),\n        protectedSkipped: Math.max(0, protectedTotal - protectedEligible),\n        accountResourcesPending: Number(result && result.report && result.report.sensitiveSummary && result.report.sensitiveSummary.accounts || 0),\n        rollbackAvailable: state.rollback.length > 0, containsProtectedValues: false\n      };",
    "      var protectedMappings = [].concat(protectedResult && protectedResult.mappings || []);\n      var accountResourcesProtected = protectedMappings.filter(function (mapping) { return mapping && clean(mapping.accountRef, 80); }).length;\n      var credentialResourcesProtected = Math.max(0, Number(protectedResult.imported || 0) - accountResourcesProtected);\n      state.done = {\n        ok: true, batchId: batch.batchId, written: batch.operations.length,\n        created: batch.operations.filter(function (op) { return op.action === 'insert'; }).length,\n        updated: batch.operations.filter(function (op) { return op.action === 'update'; }).length,\n        blocked: blockedCount(result), protectedImported: Number(protectedResult.imported || 0),\n        credentialResourcesProtected: credentialResourcesProtected,\n        accountResourcesProtected: accountResourcesProtected,\n        protectedSkipped: Math.max(0, protectedTotal - protectedEligible),\n        rollbackAvailable: state.rollback.length > 0, containsProtectedValues: false\n      };",
    'ui_done');
  source = once(source,
    "<div><small>Accesos confirmados</small><b>' + done.protectedImported + '</b></div><div><small>Cuentas pendientes</small><b>' + done.accountResourcesPending + '</b></div>",
    "<div><small>Accesos protegidos</small><b>' + done.credentialResourcesProtected + '</b></div><div><small>Cuentas protegidas</small><b>' + done.accountResourcesProtected + '</b></div>",
    'ui_copy');
  source = once(source,
    "toast(out.written + ' aseguradora(s) confirmadas · ' + out.protectedImported + ' acceso(s) disponibles.');",
    "toast(out.written + ' aseguradora(s) confirmadas · ' + out.protectedImported + ' recurso(s) protegidos disponibles.');",
    'ui_toast');
  source = once(source, 'accountProviderPending: true', 'accountProviderPending: false', 'ui_state');
  write(paths.ui, source);

  source = read(paths.academy);
  source = once(source, 'Academia profunda Aseguradoras OP-2 v1.221', 'Academia profunda Aseguradoras OP-2 v1.222', 'academy_header');
  source = all(source, '_op2v:1221', '_op2v:1222', 2, 'academy_lessons');
  source = once(source, '[1217,1218,1219,1220,1221]', '[1217,1218,1219,1220,1221,1222]', 'academy_filter');
  source = once(source, 'next._cv = 1221', 'next._cv = 1222', 'academy_cv');
  source = once(source, "return { version:'1.221'", "return { version:'1.222'", 'academy_version');
  source = once(source,
    'Orbit.ACADEMIA_V1221_ASEGURADORAS = Orbit.ACADEMIA_V1220_ASEGURADORAS;',
    'Orbit.ACADEMIA_V1221_ASEGURADORAS = Orbit.ACADEMIA_V1220_ASEGURADORAS;\nOrbit.ACADEMIA_V1222_ASEGURADORAS = Orbit.ACADEMIA_V1220_ASEGURADORAS;',
    'academy_alias');
  source = once(source,
    'Los datos operativos no sensibles pueden incorporarse al directorio. Un número bancario completo solo se declara disponible cuando existe y responde su proveedor protegido específico; hasta entonces debe aparecer como pendiente, no como importado.',
    'Los números bancarios completos se envían al proveedor protegido y la ficha conserva únicamente accountRef y una terminación enmascarada. Una cuenta solo se declara disponible después de confirmar escritura y lectura protegida.',
    'academy_bank');
  source = once(source,
    '“Fuente recibida”, “dry-run generado”, “requiere validación”, “dato confirmado”, “acceso disponible” y “cuenta protegida pendiente” son estados diferentes.',
    '“Fuente recibida”, “dry-run generado”, “requiere validación”, “dato confirmado”, “acceso disponible” y “cuenta protegida confirmada” son estados diferentes.',
    'academy_states');
  source = once(source,
    "{ p:'¿Qué estado corresponde a un número bancario completo sin proveedor protegido?', ops:['Disponible','Pendiente de conexión protegida','Validado automáticamente'], ok:1 },",
    "{ p:'¿Cuándo puede declararse disponible un número bancario completo?', ops:['Cuando existe en el Excel','Después de escritura y lectura confirmadas en el proveedor protegido','Al crear la ficha'], ok:1 },",
    'academy_quiz');
  write(paths.academy, source);

  source = read(paths.validator);
  source = once(source,
    "check('ACADEMY_V1220', all(src.academy,['Cuarentena de hojas','Identidad exacta antes de actualizar','Mensajes operativos','next._cv = 1220']), 'Academia enseña contratos v1.220', files.academy);",
    "check('ACADEMY_V1222', all(src.academy,['Carga directa desde Orbit','Escritura controlada y lectura posterior','Cuentas bancarias con estado honesto','next._cv = 1222']), 'Academia enseña contratos v1.222', files.academy);",
    'validator_academy');
  write(paths.validator, source);

  source = read(paths.group);
  source = once(source,
    "const staleIds = new Set(['UI_REVIEW_NO_CAPTURE','UI_FAIL_CLOSED','ACADEMY_V1220']);",
    "const staleIds = new Set(['UI_REVIEW_NO_CAPTURE','UI_FAIL_CLOSED']);",
    'group_stale');
  source = once(source,
    "importUi.includes('eligibleProtectedCount(result)') && importUi.includes('applySecureOnly(result')",
    "importUi.includes('eligibleProtectedSummary(result)') && importUi.includes('eligibleProtectedCount(result)') && importUi.includes('applySecureOnly(result')",
    'group_summary');
  source = once(source,
    "requireToken('CANONICAL_IMPORT_HONEST_BANK_GAP', importUi.includes('accountResourcesPending') && importUi.includes('Cuentas pendientes') && importUi.includes('accountProviderPending: true'), 'La falta de proveedor protegido para cuentas debe permanecer visible');",
    "requireToken('CANONICAL_IMPORT_BANK_PROVIDER', importUi.includes('accountResourcesProtected') && importUi.includes('Cuentas protegidas') && importUi.includes('accountProviderPending: false') && importUi.includes('proveedor_cuentas_no_disponible'), 'Las cuentas deben usar proveedor protegido y bloquear el cierre si no está disponible');",
    'group_provider');
  write(paths.group, source);

  source = read(paths.policy);
  source = once(source, "'next._cv = 1221'", "'next._cv = 1222'", 'policy_academy');
  write(paths.policy, source);

  const registry = JSON.parse(read(paths.registry));
  if (!registry.canonicalOwners.some((item) => item.id === 'insurerBankAccountProviderE2E')) {
    registry.canonicalOwners.push({
      id: 'insurerBankAccountProviderE2E',
      path: 'orbit360-platform/core/aseguradoras-bank-accounts-provider-lab-v20260721.js',
      requiredTokens: ["version: '20260721.1'", 'registerFieldProvider', 'supportsBankAccounts = true', 'orbit360ImportInsurerBankAccounts', 'applyMappings(result)']
    });
    changes.push('registry_owner');
  }
  const executionOwner = registry.canonicalOwners.find((item) => item.id === 'realInsurerDirectoryExecution');
  if (!executionOwner) throw new Error('REGISTRY_OWNER_MISSING');
  executionOwner.requiredTokens = executionOwner.requiredTokens.map((token) => token === 'accountProviderPending: true' ? 'accountProviderPending: false' : token);
  executionOwner.requiredTokens = addUnique(executionOwner.requiredTokens, ['eligibleProtectedSummary(result)']);

  const gate = registry.gates.find((item) => item.gateId === 'block1-real-insurer-directories-lab-v20260720');
  if (!gate) throw new Error('REGISTRY_GATE_MISSING');
  gate.contractVersion = '1.1.0';
  gate.diagnosticRevision = 'secure-bank-provider-and-legacy-migration-v1';
  gate.runtimeVersion = '20260721-1';
  gate.status = 'ACTIVE_SECURITY_ROOT_CAUSE_FIX';
  gate.diagnosticRule = 'Real insurer data is accepted only after portal credentials and bank accounts use protected providers, legacy bank values are migrated out of operational Firestore, GT and CO are uploaded separately from Orbit, and every write has read-after-write, sanitized evidence and rollback.';
  gate.executionBudget.acceptancePolicy = 'Only sanitized evidence may close the gate: 26 canonical insurers preserved; zero unmasked portal or bank values in operational storage; at least 91 legacy bank references confirmed; one protected bank reveal confirmed without exposing the value; GT then CO uploaded separately; no blind merge; per-insurer completeness matrix; rollback available.';
  gate.validators = addUnique(gate.validators, [
    'tools/orbit360-migrar-cuentas-aseguradoras-vault-lab-v20260721-v2.mjs',
    'tools/orbit360-validar-proveedor-cuentas-aseguradoras-lab-v20260721.mjs',
    'tools/orbit360-aseguradoras-import-readiness-v20260720.mjs'
  ]);
  gate.requiredFiles = addUnique(gate.requiredFiles, [
    'functions/bank-accounts.js','functions/bootstrap.js','functions/package.json',
    'orbit360-platform/core/aseguradoras-bank-accounts-provider-lab-v20260721.js',
    'tools/orbit360-migrar-cuentas-aseguradoras-vault-lab-v20260721-v2.mjs',
    'tools/orbit360-validar-proveedor-cuentas-aseguradoras-lab-v20260721.mjs'
  ]);
  gate.runtimeGraphFiles = addUnique(gate.runtimeGraphFiles, [
    'orbit360-platform/core/aseguradoras-bank-accounts-provider-lab-v20260721.js',
    'functions/bank-accounts.js','functions/bootstrap.js'
  ]);
  const uiContract = gate.runtimeVersionContracts.find((item) => item.path === 'orbit360-platform/core/aseguradoras-op2-import-ui-guard.js');
  const importerContract = gate.runtimeVersionContracts.find((item) => item.path === 'orbit360-platform/core/insurer-directory-import-v1202.js');
  if (!uiContract || !importerContract) throw new Error('REGISTRY_RUNTIME_CONTRACT_MISSING');
  uiContract.requiredTokens = ["var VERSION = '20260721.1'",'singleFileRead: true','Orbit.importaWriteP0.writeBatch','async function waitWritten','eligibleProtectedSummary(result)','applySecureOnly(result','Orbit.importaWriteP0.rollback','accountProviderPending: false'];
  importerContract.requiredTokens = addUnique(importerContract.requiredTokens, ["['credential','bank_account'].includes(item.type)"]);
  gate.runtimeVersionContracts = gate.runtimeVersionContracts.filter((item) => ![
    'orbit360-platform/core/aseguradoras-bank-accounts-provider-lab-v20260721.js','functions/bank-accounts.js','functions/bootstrap.js'
  ].includes(item.path));
  gate.runtimeVersionContracts.push(
    { path:'orbit360-platform/core/aseguradoras-bank-accounts-provider-lab-v20260721.js', requiredTokens:['registerFieldProvider','supportsBankAccounts = true','orbit360ImportInsurerBankAccounts'] },
    { path:'functions/bank-accounts.js', requiredTokens:['exports.orbit360ImportInsurerBankAccounts','exports.orbit360BankAccountStatus','exports.orbit360RevealInsurerBankAccount','exports.orbit360CopyInsurerBankAccount'] },
    { path:'functions/bootstrap.js', requiredTokens:["require('./index')","require('./bank-accounts')"] }
  );
  write(paths.registry, JSON.stringify(registry, null, 2));
  changes.push('registry_gate');

  source = read(paths.incident);
  const marker = '## Causa raíz definitiva · cuentas bancarias protegidas — 2026-07-21';
  if (!source.includes(marker)) {
    source += `\n\n${marker}\n\nClasificación: \`SECURITY_FAILURE + DATA_CONTRACT_FAILURE + PIPELINE_MECHANISM_FAILURE\`.\n\nLa carga inicial conservó 91 números bancarios completos en la colección operativa de Aseguradoras. El parser ya los separaba como recursos protegidos, pero el flujo \`applySecureOnly\` filtraba únicamente credenciales de portales y no existía proveedor bancario conectado. El pipeline autorreparable dependía de un segundo workflow que GitHub no disparaba desde \`GITHUB_TOKEN\`.\n\nCorrección de raíz:\n\n- un solo gate ejecuta preflight, contratos, proveedor, migración, preview y navegador;\n- el mismo backend seguro admite credenciales y cuentas con referencias distintas;\n- la migración idempotente crea una nueva versión de bóveda, confirma lectura y sustituye texto plano mediante batch atómico;\n- el importador envía \`credential\` y \`bank_account\` en la misma confirmación protegida;\n- el owner bloquea el cierre si existen cuentas y el proveedor bancario no está disponible;\n- Academia y validadores distinguen fuente, escritura operativa y recurso protegido confirmado.\n\nNo se reimportan aseguradoras para resolver esta falla. No se documentan ni publican valores reales. Clasificación Claude: \`BACKEND_PROTEGIDO_NO_CLAUDE\`; solo el patrón UX/metodológico se acumula como \`REPLICABLE_CLAUDE_ACUMULADO\`.\n`;
    write(paths.incident, source);
    changes.push('incident');
  }

  for (const file of [paths.importer,paths.ui,paths.provider,paths.academy,paths.validator,paths.group,paths.policy]) {
    const check = spawnSync(process.execPath, ['--check', file], { encoding:'utf8' });
    if (check.status !== 0) throw new Error(`SYNTAX_INVALID:${path.relative(root,file)}`);
  }
  JSON.parse(read(paths.registry));
  if (fs.existsSync(paths.preliminary)) { fs.unlinkSync(paths.preliminary); changes.push('remove_preliminary'); }

  const report = { schemaVersion:'orbit360-secure-bank-contract-patch-v2', generatedAt:new Date().toISOString(), containsPII:false, containsSecrets:false, ok:true, changes };
  write(paths.report, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} catch (error) {
  const report = { schemaVersion:'orbit360-secure-bank-contract-patch-v2', generatedAt:new Date().toISOString(), containsPII:false, containsSecrets:false, ok:false, errorCode:String(error && (error.code || error.message) || error).replace(/[^A-Za-z0-9_.:-]/g,'_').slice(0,300) };
  write(paths.report, JSON.stringify(report, null, 2));
  console.error(JSON.stringify(report));
  process.exit(1);
}
