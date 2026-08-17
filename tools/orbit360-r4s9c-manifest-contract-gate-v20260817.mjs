#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const DROPPED_CONTRACT_FIELDS = [
  'basePackageSha256',
  'baseSourceHead',
  'containsPrivateSecrets',
  'deltaFiles',
  'deltaSourceHead',
  'deployExecuted',
  'dynamicRuntimeClosureCertified',
  'forbiddenFiles',
  'noLabRuntime',
  'noPrivateSecretMaterial',
  'packageLineage',
  'productTenantContextCertified',
  'productionTouched',
  'requiredHydrationCertified',
  'routerRenderCertified',
  'secretMaterialFiles',
  'successorOrdinal',
  'unchangedFileCount',
  'writeAuthorized'
];

export const INVARIANT_FIELDS = [
  'containsPrivateSecrets',
  'deployExecuted',
  'dynamicRuntimeClosureCertified',
  'forbiddenFiles',
  'noLabRuntime',
  'noPrivateSecretMaterial',
  'productTenantContextCertified',
  'productionTouched',
  'requiredHydrationCertified',
  'routerRenderCertified',
  'secretMaterialFiles',
  'writeAuthorized'
];

const RUNTIME_REQUIRED = [
  'requiredHydrationCertified',
  'dynamicRuntimeClosureCertified',
  'productTenantContextCertified',
  'routerRenderCertified',
  'noLabRuntime',
  'noPrivateSecretMaterial',
  'writeAuthorized'
];

const eq = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const clone = v => JSON.parse(JSON.stringify(v));
const fail = m => { throw new Error(m); };
const readJson = p => JSON.parse(fs.readFileSync(p,'utf8'));
const writeJson = (p,v) => { fs.mkdirSync(path.dirname(p),{recursive:true}); fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n','utf8'); };

export function validateManifestContract(rector, candidate, expected = {}) {
  const missingFields = DROPPED_CONTRACT_FIELDS.filter(k => !Object.prototype.hasOwnProperty.call(candidate,k));
  const invariantMismatches = INVARIANT_FIELDS
    .filter(k => Object.prototype.hasOwnProperty.call(candidate,k) && !eq(candidate[k], rector[k]))
    .map(k => ({field:k, rector:rector[k], candidate:candidate[k]}));

  const semanticErrors = [];
  if (expected.basePackageSha256 && candidate.basePackageSha256 !== expected.basePackageSha256) semanticErrors.push('basePackageSha256');
  if (expected.baseSourceHead && candidate.baseSourceHead !== expected.baseSourceHead) semanticErrors.push('baseSourceHead');
  if (expected.deltaSourceHead && candidate.deltaSourceHead !== expected.deltaSourceHead) semanticErrors.push('deltaSourceHead');
  if (expected.successorOrdinal != null && Number(candidate.successorOrdinal) !== Number(expected.successorOrdinal)) semanticErrors.push('successorOrdinal');
  if (expected.unchangedFileCount != null && Number(candidate.unchangedFileCount) !== Number(expected.unchangedFileCount)) semanticErrors.push('unchangedFileCount');
  if (expected.zeroProductDelta === true && (!Array.isArray(candidate.deltaFiles) || candidate.deltaFiles.length !== 0)) semanticErrors.push('deltaFiles');
  if (expected.packageLineageToken && !String(candidate.packageLineage || '').includes(expected.packageLineageToken)) semanticErrors.push('packageLineage');

  const runtimeClosurePass =
    candidate.requiredHydrationCertified === true &&
    candidate.dynamicRuntimeClosureCertified === true &&
    candidate.productTenantContextCertified === true &&
    candidate.routerRenderCertified === true &&
    candidate.noLabRuntime === true &&
    candidate.noPrivateSecretMaterial === true &&
    candidate.writeAuthorized === false;

  return {
    ok: missingFields.length === 0 && invariantMismatches.length === 0 && semanticErrors.length === 0 && runtimeClosurePass,
    missingFields,
    invariantMismatches,
    semanticErrors,
    runtimeClosurePass,
    runtimeRequiredFields: RUNTIME_REQUIRED
  };
}

function selfTest() {
  const rector = {
    basePackageSha256:'a'.repeat(64), baseSourceHead:'b'.repeat(40), containsPrivateSecrets:false,
    deltaFiles:['x.js'], deltaSourceHead:'c'.repeat(40), deployExecuted:false,
    dynamicRuntimeClosureCertified:true, forbiddenFiles:[], noLabRuntime:true, noPrivateSecretMaterial:true,
    packageLineage:'R4S8 fixture', productTenantContextCertified:true, productionTouched:false,
    requiredHydrationCertified:true, routerRenderCertified:true, secretMaterialFiles:[],
    successorOrdinal:8, unchangedFileCount:193, writeAuthorized:false
  };
  const expected = {
    basePackageSha256:'d'.repeat(64), baseSourceHead:'e'.repeat(40), deltaSourceHead:'e'.repeat(40),
    successorOrdinal:9, unchangedFileCount:194, zeroProductDelta:true, packageLineageToken:'R4S9'
  };
  const candidate = {
    ...clone(rector),
    basePackageSha256:expected.basePackageSha256,
    baseSourceHead:expected.baseSourceHead,
    deltaFiles:[],
    deltaSourceHead:expected.deltaSourceHead,
    packageLineage:'R4S9 exact product tree + contract recovery',
    successorOrdinal:9,
    unchangedFileCount:194
  };
  const good = validateManifestContract(rector,candidate,expected);
  if (!good.ok) fail(`SELFTEST_GOOD_REJECTED:${JSON.stringify(good)}`);

  const detected = [];
  for (const field of DROPPED_CONTRACT_FIELDS) {
    const probe = clone(candidate);
    delete probe[field];
    const result = validateManifestContract(rector,probe,expected);
    if (result.ok || !result.missingFields.includes(field)) fail(`SELFTEST_MISSING_NOT_CAUGHT:${field}`);
    detected.push(field);
  }
  for (const field of INVARIANT_FIELDS) {
    const probe = clone(candidate);
    if (typeof probe[field] === 'boolean') probe[field] = !probe[field];
    else if (Array.isArray(probe[field])) probe[field] = ['unexpected'];
    else probe[field] = 'unexpected';
    const result = validateManifestContract(rector,probe,expected);
    if (result.ok || !result.invariantMismatches.some(x => x.field === field)) fail(`SELFTEST_INVARIANT_NOT_CAUGHT:${field}`);
  }
  const payload = {
    schemaVersion:'orbit360-r4s9c-manifest-contract-gate-selftest-v1',
    ok:true,
    status:'R4S9C_MANIFEST_CONTRACT_GATE_SELFTEST_PASS',
    classification:'DATA_CONTRACT_FAILURE_ROOTFIX_SOURCE_PROVEN',
    missingFieldProbesDetected:detected.length,
    expectedMissingFieldProbeCount:DROPPED_CONTRACT_FIELDS.length,
    allDroppedFieldsCovered:eq(detected,DROPPED_CONTRACT_FIELDS),
    invariantMutationProbesDetected:INVARIANT_FIELDS.length,
    runtimeClosureFields:RUNTIME_REQUIRED,
    browserExecuted:false,runtimeExecuted:false,secretAccess:false,dataAccess:false,
    firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false
  };
  const out=process.env.ORBIT360_R4S9C_GATE_OUT;
  if(out) writeJson(path.resolve(out),payload);
  console.log(JSON.stringify(payload,null,2));
}

function verifyFiles() {
  const rectorPath=process.env.ORBIT360_R4S8_MANIFEST;
  const candidatePath=process.env.ORBIT360_R4S9C_MANIFEST;
  if(!rectorPath||!candidatePath) fail('VERIFY_MANIFEST_PATHS_REQUIRED');
  const rector=readJson(rectorPath), candidate=readJson(candidatePath);
  const expected={
    basePackageSha256:process.env.ORBIT360_R4S9_ZIP_SHA256,
    baseSourceHead:process.env.ORBIT360_R4S9_SOURCE_HEAD,
    deltaSourceHead:process.env.ORBIT360_R4S9_SOURCE_HEAD,
    successorOrdinal:Number(process.env.ORBIT360_R4S9C_SUCCESSOR_ORDINAL || 9),
    unchangedFileCount:Number(process.env.ORBIT360_R4S9C_UNCHANGED || 194),
    zeroProductDelta:true,
    packageLineageToken:'R4S9'
  };
  const result=validateManifestContract(rector,candidate,expected);
  const payload={
    schemaVersion:'orbit360-r4s9c-manifest-contract-gate-v1',
    ok:result.ok,
    status:result.ok?'R4S9C_MANIFEST_CONTRACT_GATE_PASS':'R4S9C_MANIFEST_CONTRACT_GATE_FAIL',
    classification:result.ok?'DATA_CONTRACT_FAILURE_ROOTFIX_PACKAGE_PROVEN':'DATA_CONTRACT_FAILURE',
    rectorStatus:String(rector.status||''),
    candidateStatus:String(candidate.status||''),
    requiredFieldCount:DROPPED_CONTRACT_FIELDS.length,
    ...result,
    browserExecuted:false,runtimeExecuted:false,secretAccess:false,dataAccess:false,
    firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false
  };
  const out=process.env.ORBIT360_R4S9C_GATE_OUT;
  if(out) writeJson(path.resolve(out),payload);
  console.log(JSON.stringify(payload,null,2));
  if(!result.ok) process.exitCode=41;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const mode=process.argv[2]||'--self-test';
  if(mode==='--self-test') selfTest();
  else if(mode==='--verify-files') verifyFiles();
  else fail(`UNKNOWN_MODE:${mode}`);
}
