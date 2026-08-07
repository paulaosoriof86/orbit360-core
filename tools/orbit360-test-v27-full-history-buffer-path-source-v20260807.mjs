#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { scanHistory } from './orbit360-reconcile-client-provenance-v26-source-v20260807.mjs';

const fp = id => crypto.createHash('sha256').update(`clientes:${id}`, 'utf8').digest('hex').slice(0,20);

function git(cwd, args) {
  const run = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (run.status !== 0) throw new Error(`V27_SYNTHETIC_GIT_FAILURE:${args[0]}`);
  return run.stdout;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-v27-history-'));
try {
  git(tmp, ['init']);
  git(tmp, ['config', 'user.email', 'fixture@example.invalid']);
  git(tmp, ['config', 'user.name', 'Orbit360 Fixture']);

  const rel = 'orbit360-platform/docs/client-manifest-synthetic.md';
  const absolute = path.join(tmp, rel);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });

  const syntheticLocator = 'synthetic-client-017';
  fs.writeFileSync(absolute, `historical locator ${syntheticLocator}\n`, 'utf8');
  git(tmp, ['add', '.']);
  git(tmp, ['commit', '-m', 'fixture add historical client locator']);

  fs.unlinkSync(absolute);
  git(tmp, ['add', '-A']);
  git(tmp, ['commit', '-m', 'fixture remove current client locator']);

  const target = fp(syntheticLocator);
  const matches = new Map();
  const history = scanHistory(new Set([target]), matches, tmp);
  const found = [...(matches.get(target)?.values() || [])];

  const checks = [
    ['history-scanned-at-least-one-blob', history.blobsScanned >= 1],
    ['historical-reference-found-after-current-delete', found.some(x => x.historical === true)],
    ['historical-source-class-is-doc-manifest', found.some(x => x.sourceClass === 'HISTORICAL_DOC_MANIFEST_REFERENCE')],
    ['no-current-reference-required', found.every(x => x.historical === true)],
  ];
  const failed = checks.filter(([, ok]) => !ok).map(([id]) => id);
  if (failed.length) {
    console.error(JSON.stringify({ status: 'STOP_V27_FULL_HISTORY_BUFFER_PATH', classification: 'PIPELINE_MECHANISM_FAILURE', failedCheckIds: failed, containsPII: false, writes: 0, ok: false }));
    process.exit(41);
  }

  console.log(JSON.stringify({
    schemaVersion: 'orbit360-v27-full-history-buffer-path-fixture-v1',
    status: 'PASS_V27_FULL_HISTORY_BUFFER_PATH',
    total: checks.length,
    passed: checks.length,
    failed: 0,
    historyObjectsConsidered: history.objectsConsidered,
    historyBlobsScanned: history.blobsScanned,
    historicalMatches: found.length,
    exercisedPath: ['git rev-list --objects --all', 'git cat-file --batch-check', 'git cat-file --batch', 'Buffer parse', 'historical match'],
    firebaseAccess: false,
    secretsRead: false,
    browserExecuted: false,
    hostingTouched: false,
    writes: 0,
    productionTouched: false,
    containsPII: false,
    ok: true
  }));
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
