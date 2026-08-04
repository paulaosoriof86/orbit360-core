#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const FILE = path.join(ROOT, 'tools/orbit360-rc12-rootcause-cumulative-closure-macro-v20260803.sh');
const BEFORE = 'npx firebase-tools deploy --only hosting --project "$ORBIT360_PROJECT_ID" --non-interactive';
const AFTER = 'firebase deploy --only hosting --project "$ORBIT360_PROJECT_ID" --config firebase.json --non-interactive';

let source = fs.readFileSync(FILE, 'utf8');
const beforeCount = source.split(BEFORE).length - 1;
const afterCount = source.split(AFTER).length - 1;
if (afterCount === 1 && beforeCount === 0) {
  console.log(JSON.stringify({ schemaVersion:'orbit360-patch-rc12-firebase-bin-v1', status:'PASS_ALREADY_APPLIED', changed:false, secrets:false, firestoreRead:false, writes:false, deploy:false, production:false }, null, 2));
  process.exit(0);
}
if (beforeCount !== 1 || afterCount !== 0) throw new Error(`FIREBASE_DEPLOY_MARKER_UNEXPECTED before=${beforeCount} after=${afterCount}`);
source = source.replace(BEFORE, AFTER);
fs.writeFileSync(FILE, source, 'utf8');
const ok = source.includes(AFTER) && !source.includes(BEFORE);
console.log(JSON.stringify({ schemaVersion:'orbit360-patch-rc12-firebase-bin-v1', status:ok?'PASS':'FAIL', changed:true, secrets:false, firestoreRead:false, writes:false, deploy:false, production:false }, null, 2));
process.exit(ok ? 0 : 41);
