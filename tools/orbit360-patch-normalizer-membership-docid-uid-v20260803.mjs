#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const FILE = path.join(process.cwd(), 'tools/orbit360-normalizar-membership-direccion-rc12-v20260803.mjs');
let source = fs.readFileSync(FILE, 'utf8');

function replaceOnce(before, after, id) {
  const count = source.split(before).length - 1;
  if (count === 0 && source.includes(after)) return;
  if (count !== 1) throw new Error(`${id}: expected one match, found ${count}`);
  source = source.replace(before, after);
}

replaceOnce(
  'const eligibility = (membership, user) => {',
  'const eligibility = (membership, user, docId) => {',
  'ELIGIBILITY_SIGNATURE');
replaceOnce(
  "  if (!membership.uid) reasons.push('membership_uid_missing');\n  if (membership.tenantId !== TENANT)",
  "  if (!membership.uid) reasons.push('membership_uid_missing');\n  if (docId && membership.uid && membership.uid !== docId) reasons.push('membership_document_id_uid_mismatch');\n  if (membership.tenantId !== TENANT)",
  'DOCID_UID_REASON');
replaceOnce(
  '      const currentReasons = eligibility(membership, user);',
  '      const currentReasons = eligibility(membership, user, doc.id);',
  'CURRENT_REASONS_CALL');
replaceOnce(
  '      const afterReasons = eligibility(afterMembership, user);',
  '      const afterReasons = eligibility(afterMembership, user, doc.id);',
  'AFTER_REASONS_CALL');
replaceOnce(
  '      const rowReasons = eligibility(membership,user);',
  '      const rowReasons = eligibility(membership,user,doc.id);',
  'VERIFY_REASONS_CALL');

fs.writeFileSync(FILE, source, 'utf8');
const checks = {
  signature: source.includes('const eligibility = (membership, user, docId) => {'),
  reason: source.includes("membership_document_id_uid_mismatch"),
  current: source.includes('eligibility(membership, user, doc.id)'),
  after: source.includes('eligibility(afterMembership, user, doc.id)'),
  verify: source.includes('eligibility(membership,user,doc.id)')
};
const ok = Object.values(checks).every(Boolean);
console.log(JSON.stringify({schemaVersion:'orbit360-normalizer-docid-uid-patch-v1',status:ok?'PASS':'FAIL',checks,secrets:false,firestoreRead:false,writes:false,deploy:false,production:false},null,2));
process.exit(ok ? 0 : 41);
