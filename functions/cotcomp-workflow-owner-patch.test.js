'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, 'ops-leads-domain.js'), 'utf8');

test('candidate adds one CotComp nested reference sanitizer', () => {
  assert.match(source, /function sanitizeCotcompRef\(input\)/);
  assert.match(source, /schemaVersion: 'orbit360-cotcomp-workflow-ref-v1'/);
  assert.match(source, /caseId,/);
  assert.match(source, /journeyId,/);
  assert.match(source, /correlationId,/);
});

test('partial CotComp references fail closed', () => {
  assert.match(source, /La referencia CotComp requiere caseId, journeyId y correlationId\./);
});

test('new business and management records preserve cotcompRef', () => {
  const count = (source.match(/row\.cotcompRef = ref/g) || []).length;
  assert.equal(count, 2);
});

test('business and management updates preserve validated cotcompRef', () => {
  const count = (source.match(/payload\.cotcompRef !== undefined/g) || []).length;
  assert.equal(count, 2);
  const validations = (source.match(/sanitizeCotcompRef\(payload\.cotcompRef\)/g) || []).length;
  assert.equal(validations, 2);
});

test('authorization logic remains present and unchanged in responsibility', () => {
  assert.match(source, /const authz = await authorize\(request,/);
  assert.match(source, /advisorAllowed\(authz\.member, after\.asesorId\)/);
});

test('canonical workflow collections and paths remain present', () => {
  assert.match(source, /workflow\/\$\{collection\}\/items\/\$\{id\}/);
  assert.match(source, /'negocios'/);
  assert.match(source, /'gestiones'/);
});

test('no direct CotComp Firestore namespace is introduced into Leads Ops owner', () => {
  assert.doesNotMatch(source, /\/cotcomp\/quoteCases/);
  assert.doesNotMatch(source, /\/cotcomp\/proposals/);
});

test('existing notification outbox mechanism remains in place', () => {
  assert.match(source, /notificationOutbox/);
  assert.match(source, /status: 'pending_provider'/);
});

test('candidate does not change source export name', () => {
  assert.match(source, /exports\.orbit360OpsLeadsCommand = onCall/);
});
