#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-lab-v20260804.mjs');
let source = fs.readFileSync(file, 'utf8');
const anchor = "  add('SYNTHETIC_LOADER_CONTRACT', scope.syntheticTenantPattern === '^verify-block12-[0-9]+$' && scope.syntheticTenantAllowedOnlyOnOperationalPreview === true && scope.syntheticTenantRequiresVerificationMode === true && loader.includes('isOperationalVerificationPreviewHost') && loader.includes('isSyntheticVerificationTenant') && loader.includes('/^verify-block12-[0-9]+$/') && loader.includes('if (isSyntheticVerificationTenant) allowedTenants.push(requestedTenant)') && index.includes('backend-lab-loader.js?v=20260804-operational-rootfix8'));";
const addition = anchor + "\n  const loaderMaterializer = readText('tools/orbit360-materializar-block12-synthetic-loader-rootfix-v20260804.mjs');\n  add('MATERIALIZER_REPLACEMENT_SAFE', scope.materializerUsesFunctionReplacement === true && scope.engineSyntaxPassRequired === true && loaderMaterializer.includes('return source.replace(before, () => after);'));";
if (!source.includes(addition)) {
  if (!source.includes(anchor)) throw new Error('VALIDATOR_STALE:SYNTHETIC_LOADER_CONTRACT_CHECK_NOT_FOUND');
  source = source.replace(anchor, () => addition);
  fs.writeFileSync(file, source, 'utf8');
}
if (!source.includes("add('MATERIALIZER_REPLACEMENT_SAFE'")) throw new Error('VALIDATOR_STALE:MATERIALIZER_SAFETY_CHECK_MISSING');
console.log(JSON.stringify({
  schemaVersion:'orbit360-block12-rootfix8-engine-safety-check-v1',
  status:'MATERIALIZER_SAFETY_CHECK_INSTALLED',
  gateContractVersion:'12.0.7',
  secretAccess:false,
  firestoreRead:false,
  deployExecuted:false,
  ok:true
}, null, 2));
