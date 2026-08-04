#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const write = (rel, value) => fs.writeFileSync(path.join(ROOT, rel), value, 'utf8');
const mustReplace = (source, before, after, code) => {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`PIPELINE_MECHANISM_FAILURE:${code}`);
  return source.replace(before, after);
};
const appendAlias = (rel, original, alias, handler) => {
  let source = read(rel);
  const marker = `exports.${original} = onCall({ region: REGION, cors: true }, ${handler});`;
  const replacement = `${marker}\nexports.${alias} = onCall({ region: REGION, cors: true }, ${handler});`;
  source = mustReplace(source, marker, replacement, `EXPORT_MARKER_${original}`);
  write(rel, source);
};

appendAlias('functions/ops-leads-domain.js', 'orbit360OpsLeadsCommand', 'orbit360OpsLeadsCommandLabV20260804', 'executeCommand');
appendAlias('functions/ops-advisor-inbox.js', 'orbit360GetAdvisorOpsInbox', 'orbit360GetAdvisorOpsInboxLabV20260804', 'inbox');
appendAlias('functions/cobros-reconciliation-domain.js', 'orbit360CobrosReconciliationCommand', 'orbit360CobrosReconciliationCommandLabV20260804', 'execute');
appendAlias('functions/recurring-insurance-import.js', 'orbit360RecurringInsuranceImport', 'orbit360RecurringInsuranceImportLabV20260804', 'execute');

{
  const rel = 'orbit360-platform/core/ops-leads-domain-client.js';
  let source = read(rel);
  source = mustReplace(source,
    "const FUNCTION_NAME = 'orbit360OpsLeadsCommand';",
    "const FUNCTION_NAME = (window.OrbitBackend && OrbitBackend.functionNames && OrbitBackend.functionNames.opsLeads) || 'orbit360OpsLeadsCommand';",
    'OPS_CLIENT_FUNCTION_NAME');
  write(rel, source);
}
{
  const rel = 'orbit360-platform/core/cobros-reconciliation-domain-client.js';
  let source = read(rel);
  source = mustReplace(source,
    "const FUNCTION_NAME = 'orbit360CobrosReconciliationCommand';",
    "const FUNCTION_NAME = (window.OrbitBackend && OrbitBackend.functionNames && OrbitBackend.functionNames.reconciliation) || 'orbit360CobrosReconciliationCommand';",
    'RECON_CLIENT_FUNCTION_NAME');
  write(rel, source);
}
{
  const rel = 'orbit360-platform/core/recurring-insurance-import-client.js';
  let source = read(rel);
  source = mustReplace(source,
    "const fn = callable('orbit360RecurringInsuranceImport');",
    "const configured = window.OrbitBackend && OrbitBackend.functionNames && OrbitBackend.functionNames.recurringImport;\n    const fn = callable(configured || 'orbit360RecurringInsuranceImport');",
    'RECURRING_CLIENT_FUNCTION_NAME');
  write(rel, source);
}
{
  const rel = 'orbit360-platform/core/backend-lab-init.js';
  let source = read(rel);
  source = source.replace('Backend LAB Firebase init v1.126', 'Backend LAB Firebase init v1.127');
  source = source.replace("firebaseInitVersion: 'v1.126-recurring-import-source'", "firebaseInitVersion: 'v1.127-operational-runtime-lab'");
  source = mustReplace(source,
    "functionsRegion: (window.OrbitBackend && window.OrbitBackend.functionsRegion) || 'us-central1',",
    "functionsRegion: (window.OrbitBackend && window.OrbitBackend.functionsRegion) || 'us-central1',\n    functionNames: Object.assign({}, window.OrbitBackend && window.OrbitBackend.functionNames || {}, {\n      opsLeads: 'orbit360OpsLeadsCommandLabV20260804',\n      advisorInbox: 'orbit360GetAdvisorOpsInboxLabV20260804',\n      reconciliation: 'orbit360CobrosReconciliationCommandLabV20260804',\n      recurringImport: 'orbit360RecurringInsuranceImportLabV20260804'\n    }),",
    'BACKEND_FUNCTION_NAMES');
  source = source.replace('opsLeadsDomainBackendActive: false', 'opsLeadsDomainBackendActive: true');
  source = source.replace('cobrosReconciliationDomainActive: false', 'cobrosReconciliationDomainActive: true');
  source = source.replace('recurringInsuranceImportActive: false', 'recurringInsuranceImportActive: true');
  source = mustReplace(source,
    '  loadRecurringInsuranceImport();\n',
    "  loadRecurringInsuranceImport();\n  if (/^(1|auto)$/i.test(params.get('orbitVerify') || '')) {\n    afterWindowLoad(function(){ loadScriptOnce('core/runtime-verification-center-v20260804.js?v=20260804-1', 'runtime-verification-center'); });\n  }\n",
    'VERIFICATION_CENTER_LOAD');
  write(rel, source);
}
{
  const rel = 'tools/orbit360-validar-gate-contracts-v20260717.mjs';
  let source = read(rel);
  const gateToken = 'block12-operational-runtime-lab-v20260804';
  if (!source.includes(gateToken)) {
    const marker = '\n});\nconst PHASE_PROFILES=Object.freeze({';
    const at = source.indexOf(marker);
    if (at < 0) throw new Error('PIPELINE_MECHANISM_FAILURE:GATE_CONFIG_CLOSE');
    const entry = `,\n  "${gateToken}":{contractVersion:"12.0.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-block12-operational-runtime-lab-v20260804.json",engine:"tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-lab-v20260804.mjs"}`;
    source = source.slice(0, at) + entry + source.slice(at);
  }
  if (!source.includes('OPERATIONAL_RUNTIME_LAB_EXECUTION')) {
    const start = source.indexOf('const PHASE_PROFILES=Object.freeze({');
    const close = source.indexOf('\n});', start);
    if (start < 0 || close < 0) throw new Error('PIPELINE_MECHANISM_FAILURE:PHASE_PROFILE_CLOSE');
    const entry = ',\n  "OPERATIONAL_RUNTIME_LAB_EXECUTION":{secrets:true,firestoreRead:true,writes:true,runtime:true,browser:true,deploy:true,functionsDeploy:true,rulesDeploy:false,production:false}';
    source = source.slice(0, close) + entry + source.slice(close);
  }
  write(rel, source);
}

const required = [
  'functions/ops-leads-domain.js',
  'functions/ops-advisor-inbox.js',
  'functions/cobros-reconciliation-domain.js',
  'functions/recurring-insurance-import.js',
  'orbit360-platform/core/backend-lab-init.js',
  'orbit360-platform/core/runtime-verification-center-v20260804.js',
  'tools/orbit360-validar-gate-contracts-v20260717.mjs'
];
for (const rel of required) if (!fs.existsSync(path.join(ROOT, rel))) throw new Error(`PIPELINE_MECHANISM_FAILURE:MISSING_${rel}`);
console.log(JSON.stringify({ status: 'BLOCK12_SOURCE_MATERIALIZED', files: required.length, secretAccess: false, firestoreRead: false, firestoreWrites: 0, authWrites: 0, deployExecuted: false, ok: true }, null, 2));
