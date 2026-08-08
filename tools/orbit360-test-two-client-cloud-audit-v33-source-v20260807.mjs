#!/usr/bin/env node
'use strict';
import assert from 'node:assert/strict';
import {TARGETS,WRITE_METHODS,buildFilter,sanitize,classifyHttp,actorClass,mechanismClass} from './orbit360-probe-two-client-cloud-audit-v33-v20260807.mjs';
const sa='runner@example.iam.gserviceaccount.com';
assert.equal(TARGETS.length,2);assert.equal(new Set(TARGETS).size,2);
const f=buildFilter('projects/p/databases/(default)/documents/tenants/t/data/clientes/items/doc-1');
assert.match(f,/protoPayload\.serviceName="firestore\.googleapis\.com"/);assert.match(f,/timestamp>="2026-07-24T00:00:00Z"/);assert.match(f,/timestamp<="2026-08-08T00:00:00Z"/);
assert.equal(WRITE_METHODS.has('google.firestore.v1.Firestore.Commit'),true);
const cryptoLike=[{timestamp:'2026-07-25T00:00:00Z',protoPayload:{serviceName:'firestore.googleapis.com',methodName:'crypto.Cipher.update',authenticationInfo:{principalEmail:sa}}}];assert.equal(sanitize(cryptoLike,sa).status,'AUDIT_NO_MATCHING_WRITE_ENTRY');
const writes=[{timestamp:'2026-07-25T01:02:03Z',protoPayload:{serviceName:'firestore.googleapis.com',methodName:'google.firestore.v1.Firestore.Commit',authenticationInfo:{principalEmail:sa},requestMetadata:{callerSuppliedUserAgent:'firebase-admin-node/13'}}}];const s=sanitize(writes,sa);assert.equal(s.status,'AUDIT_WRITE_FOUND');assert.equal(s.writeEvents,1);assert.deepEqual(s.actorClasses,['RUNTIME_SERVICE_ACCOUNT']);assert.deepEqual(s.mechanismClasses,['SERVER_ADMIN_SDK']);assert.equal('principalEmail' in s,false);assert.equal('resourceName' in s,false);
assert.equal(actorClass({protoPayload:{authenticationInfo:{principalEmail:'person@example.com'}}},sa),'USER_PRINCIPAL');assert.equal(mechanismClass({protoPayload:{requestMetadata:{callerSuppliedUserAgent:'gl-js/ fire/11'}}}),'FIREBASE_CLIENT_SDK');assert.equal(classifyHttp(403),'AUDIT_UNAVAILABLE_OR_FORBIDDEN');assert.equal(classifyHttp(404),'AUDIT_API_OR_PROJECT_NOT_AVAILABLE');
console.log(JSON.stringify({schemaVersion:'orbit360-v33-cloud-audit-source-fixtures-v1',status:'PASS_V33_CLOUD_AUDIT_SOURCE_FIXTURES',targetCount:2,writeMethods:WRITE_METHODS.size,rawPIIOutput:false,firebaseAccess:false,loggingAccess:false,writes:0,ok:true}));
