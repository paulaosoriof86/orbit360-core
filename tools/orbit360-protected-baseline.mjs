#!/usr/bin/env node
'use strict';

import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const PROTECTED_BASELINE_COMMIT = '051fa9b38b82887b73966be90bcc9e4973b568f6';
export const PROTECTED_BLOBS = {
  'orbit360-platform/data/store.js': 'cec636757725dea975a63b4aa98fb859baba7316',
  'orbit360-platform/core/auth.js': '965d033d8cc5955724609b64ad8219b80ea26b3b',
  'orbit360-platform/core/importa.js': '6624112ec85e2d89d26456a98478dcc8b9725f18'
};

function runGit(repoRoot, args) {
  return spawnSync('git', ['-C', repoRoot, ...args], {
    encoding: 'utf8',
    windowsHide: true
  });
}

export function verifyProtectedBaseline(appRoot, options = {}) {
  const repoRoot = path.resolve(options.repoRoot || path.join(appRoot, '..'));
  const expected = options.expected || PROTECTED_BLOBS;
  const checks = [];

  for (const [file, expectedBlob] of Object.entries(expected)) {
    const hashed = runGit(repoRoot, ['hash-object', `--path=${file}`, file]);
    const actualBlob = String(hashed.stdout || '').trim();
    checks.push({
      file,
      expectedBlob,
      actualBlob,
      ok: hashed.status === 0 && actualBlob === expectedBlob,
      status: hashed.status,
      error: hashed.status !== 0 ? String(hashed.stderr || hashed.stdout || '').trim() : ''
    });
  }

  return {
    ok: checks.every(item => item.ok),
    baseline: PROTECTED_BASELINE_COMMIT,
    repoRoot,
    checks,
    error: ''
  };
}

export function appendProtectedChecks(targetPass, targetFail, appRoot, options = {}) {
  const result = verifyProtectedBaseline(appRoot, options);

  for (const item of result.checks) {
    const target = item.ok ? targetPass : targetFail;
    target.push({
      id: 'PROTECTED_' + item.file.replace(/^orbit360-platform\//, '').replace(/\W+/g, '_'),
      message: item.ok
        ? `Archivo protegido coincide con Git blob ${item.expectedBlob.slice(0, 12)}`
        : `Archivo protegido difiere del blob esperado ${item.expectedBlob.slice(0, 12)}; actual ${item.actualBlob || 'no disponible'}${item.error ? ': ' + item.error : ''}`,
      file: item.file.replace(/^orbit360-platform\//, '')
    });
  }
  return result;
}
