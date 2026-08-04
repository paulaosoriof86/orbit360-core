#!/usr/bin/env node
'use strict';

import fs from 'node:fs';

const FILE = 'tools/orbit360-rc12-normal-onboarding-close-macro-v20260804.sh';
const BEFORE = 'productionMaintained:$production,';
const AFTER = 'productionMaintained:$productionMaintained,';
let source = fs.readFileSync(FILE, 'utf8');
const beforeCount = source.split(BEFORE).length - 1;
if (beforeCount !== 1) throw new Error(`FINAL_WRITER_ROOTFIX_MARKER_COUNT_${beforeCount}`);
source = source.replace(BEFORE, AFTER);
if (source.includes(BEFORE) || !source.includes(AFTER)) throw new Error('FINAL_WRITER_ROOTFIX_NOT_APPLIED');
fs.writeFileSync(FILE, source, 'utf8');
console.log(JSON.stringify({
  schemaVersion: 'orbit360-rootfix-final-writer-gate714-v1',
  classification: 'PIPELINE_MECHANISM_FAILURE',
  rootCause: 'jq_argument_name_mismatch',
  changedFile: FILE,
  replacements: 1,
  secrets: false,
  firestoreRead: false,
  authRead: false,
  writes: false,
  deploy: false,
  production: false,
  ok: true
}, null, 2));
