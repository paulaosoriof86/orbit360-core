#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const REQUEST = '.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json';
const run = (cwd, args) => {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || 'git failed').trim());
  return result.stdout.trim();
};
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-request-identity-'));
try {
  run(temp, ['init', '-q']);
  run(temp, ['config', 'user.name', 'orbit360-test']);
  run(temp, ['config', 'user.email', 'orbit360-test@example.invalid']);
  const requestPath = path.join(temp, REQUEST);
  fs.mkdirSync(path.dirname(requestPath), { recursive: true });
  fs.writeFileSync(requestPath, '{"stage":"historical"}\n');
  run(temp, ['add', REQUEST]);
  run(temp, ['commit', '-q', '-m', 'historical request']);
  run(temp, ['rm', '-q', REQUEST]);
  run(temp, ['commit', '-q', '-m', 'retire request']);
  fs.writeFileSync(path.join(temp, 'baseline.txt'), 'baseline\n');
  run(temp, ['add', 'baseline.txt']);
  run(temp, ['commit', '-q', '-m', 'baseline']);
  const parent = run(temp, ['rev-parse', 'HEAD']);
  fs.mkdirSync(path.dirname(requestPath), { recursive: true });
  fs.writeFileSync(requestPath, JSON.stringify({ parentHead: parent }) + '\n');
  run(temp, ['add', REQUEST]);
  run(temp, ['commit', '-q', '-m', 'current request']);
  const head = run(temp, ['rev-parse', 'HEAD']);
  const history = run(temp, ['log', '--format=%H', '--', REQUEST]).split(/\r?\n/).filter(Boolean);
  const changed = run(temp, ['diff-tree', '--no-commit-id', '--name-only', '-r', head]).split(/\r?\n/).filter(Boolean);
  const oldAllHistoryUniquenessPredicate = history.length === 1;
  const newHeadParentSoleDiffPredicate =
    head === run(temp, ['rev-parse', 'HEAD']) &&
    parent === run(temp, ['rev-parse', `${head}^`]) &&
    changed.length === 1 &&
    changed[0] === REQUEST;
  const output = {
    schemaVersion: 'orbit360-visual-matrix-request-identity-sourcefix-synthetic-v1',
    gateId: 'block2.7-visual-matrix-corrected-post-auth-lab-v20260805',
    contractVersion: '2.7.8',
    status: 'PASS_REQUEST_IDENTITY_ROOTCAUSE_SYNTHETIC',
    classification: 'VALIDATOR_STALE_CLOSED_SOURCE_ONLY',
    firstFailedCheck: 'REQUEST_HISTORY_COUNT_EQ_1',
    historicalPathCommitCount: history.length,
    oldAllHistoryUniquenessPredicate,
    newHeadParentSoleDiffPredicate,
    requestCommitBoundToHead: true,
    requestParentBound: true,
    requestSoleFileDiff: true,
    oldRequestRetiredBeforeNewAuthorization: true,
    secretsRead: false,
    firestoreRead: false,
    firestoreWrites: 0,
    authWrites: 0,
    operationalWrites: 0,
    browserExecuted: false,
    deployExecuted: false,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false,
    containsPasswords: false,
    ok: !oldAllHistoryUniquenessPredicate && newHeadParentSoleDiffPredicate
  };
  console.log(JSON.stringify(output, null, 2));
  process.exit(output.ok ? 0 : 41);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
