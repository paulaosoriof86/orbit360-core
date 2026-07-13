#!/usr/bin/env node
'use strict';

import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const PROTECTED_BASELINE_COMMIT = '051fa9b38b82887b73966be90bcc9e4973b568f6';
export const PROTECTED_FILES = [
  'orbit360-platform/data/store.js',
  'orbit360-platform/core/auth.js',
  'orbit360-platform/core/importa.js'
];

function runGit(repoRoot, args) {
  return spawnSync('git', ['-C', repoRoot, ...args], {
    encoding: 'utf8',
    windowsHide: true
  });
}

export function verifyProtectedBaseline(appRoot, options = {}) {
  const repoRoot = path.resolve(options.repoRoot || path.join(appRoot, '..'));
  const baseline = options.baseline || PROTECTED_BASELINE_COMMIT;
  const files = options.files || PROTECTED_FILES;
  const checks = [];

  const baselineCheck = runGit(repoRoot, ['cat-file', '-e', `${baseline}^{commit}`]);
  if (baselineCheck.status !== 0) {
    return {
      ok: false,
      baseline,
      repoRoot,
      checks: [],
      error: `El commit baseline protegido ${baseline} no está disponible en el checkout. Se requiere historial completo (fetch-depth: 0).`
    };
  }

  for (const file of files) {
    const diff = runGit(repoRoot, ['diff', '--quiet', baseline, '--', file]);
    checks.push({
      file,
      ok: diff.status === 0,
      status: diff.status,
      error: diff.status > 1 ? String(diff.stderr || diff.stdout || '').trim() : ''
    });
  }

  return {
    ok: checks.every(item => item.ok),
    baseline,
    repoRoot,
    checks,
    error: ''
  };
}

export function appendProtectedChecks(targetPass, targetFail, appRoot, options = {}) {
  const result = verifyProtectedBaseline(appRoot, options);
  if (result.error) {
    targetFail.push({
      id: 'PROTECTED_BASELINE_AVAILABLE',
      message: result.error,
      file: 'git-history'
    });
    return result;
  }

  for (const item of result.checks) {
    const target = item.ok ? targetPass : targetFail;
    target.push({
      id: 'PROTECTED_' + item.file.replace(/^orbit360-platform\//, '').replace(/\W+/g, '_'),
      message: item.ok
        ? `Archivo protegido sin cambios desde baseline ${result.baseline.slice(0, 12)}`
        : `Archivo protegido difiere del baseline ${result.baseline.slice(0, 12)}${item.error ? ': ' + item.error : ''}`,
      file: item.file.replace(/^orbit360-platform\//, '')
    });
  }
  return result;
}
