#!/usr/bin/env node
'use strict';
import {PROBE_TENANT_ID,PROBE_DOCUMENT_PATH,isValidFirestoreId,validateProbeDocumentPath,classifyForcedServerResponse} from './orbit360-f2-cross-tenant-probe-contract-v20260818.mjs';

const assert=(value,code)=>{if(!value)throw new Error(code);};

assert(PROBE_TENANT_ID==='orbit360-f2-cross-tenant-probe','VALID_PROBE_TENANT_CHANGED');
assert(isValidFirestoreId(PROBE_TENANT_ID),'VALID_PROBE_TENANT_REJECTED');
assert(validateProbeDocumentPath(PROBE_DOCUMENT_PATH),'VALID_PROBE_PATH_REJECTED');
assert(!isValidFirestoreId('__orbit360_f2_cross_tenant_probe__'),'LEGACY_RESERVED_ID_NOT_REJECTED');
assert(!validateProbeDocumentPath('tenants/__orbit360_f2_cross_tenant_probe__/system/config'),'LEGACY_RESERVED_PATH_NOT_REJECTED');
const pass=classifyForcedServerResponse(403,'PERMISSION_DENIED');
assert(pass.ok===true&&pass.classification==='PASS','DENY_RESPONSE_NOT_PASS');
const invalid=classifyForcedServerResponse(400,'INVALID_ARGUMENT');
assert(invalid.ok===false&&invalid.classification==='VALIDATOR_STALE'&&invalid.code==='F2_CROSS_TENANT_PROBE_INVALID_ARGUMENT','INVALID_ARGUMENT_NOT_VALIDATOR_STALE');
const allowedMissing=classifyForcedServerResponse(404,'NOT_FOUND');
assert(allowedMissing.ok===false&&allowedMissing.classification==='SECURITY_FAILURE','NOT_FOUND_NOT_SECURITY_FAILURE');
const allowedExisting=classifyForcedServerResponse(200,'');
assert(allowedExisting.ok===false&&allowedExisting.classification==='SECURITY_FAILURE','HTTP_200_NOT_SECURITY_FAILURE');

console.log(JSON.stringify({schemaVersion:'orbit360-f2-cross-tenant-probe-contract-selftest-v1',ok:true,status:'F2_CROSS_TENANT_PROBE_CONTRACT_SELFTEST_PASS',probeTenantId:PROBE_TENANT_ID,probeDocumentPath:PROBE_DOCUMENT_PATH,legacyReservedIdRejected:true,invalidArgumentClassification:'VALIDATOR_STALE',permissionDeniedClassification:'PASS',notFoundClassification:'SECURITY_FAILURE',http200Classification:'SECURITY_FAILURE',networkAccess:false,secretAccess:false,firestoreRead:false,rulesDeploy:false,writes:0,containsPII:false,containsSecrets:false},null,2));
