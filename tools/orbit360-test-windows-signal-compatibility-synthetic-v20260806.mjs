#!/usr/bin/env node
'use strict';

function classify({ platform, runnerOs = '', failed, failedIds, synthetic }) {
  const soleSignalExitCheck = Number(failed) === 1
    && Array.isArray(failedIds)
    && failedIds.length === 1
    && /^synthetic-signal-exit-/.test(String(failedIds[0] || ''));
  const exactSafetySemantics = Number(synthetic.rollbackCalls) === 1
    && Number(synthetic.persistCalls) === 1;
  const processDidNotReportNormalSuccess = synthetic.signalExitCode == null
    || Number(synthetic.signalExitCode) !== 0;
  const windowsLike = platform === 'win32'
    || /windows|mingw|msys/i.test(String(runnerOs));
  return windowsLike
    && soleSignalExitCheck
    && exactSafetySemantics
    && processDidNotReportNormalSuccess;
}

const cases = [
  {
    id: 'windows-null-signal',
    input: { platform: 'win32', failed: 1, failedIds: ['synthetic-signal-exit-143'], synthetic: { rollbackCalls: 1, persistCalls: 1, signalExitCode: null } },
    expected: true
  },
  {
    id: 'windows-nonzero-signal',
    input: { platform: 'win32', failed: 1, failedIds: ['synthetic-signal-exit-143'], synthetic: { rollbackCalls: 1, persistCalls: 1, signalExitCode: 1 } },
    expected: true
  },
  {
    id: 'windows-normal-zero-rejected',
    input: { platform: 'win32', failed: 1, failedIds: ['synthetic-signal-exit-143'], synthetic: { rollbackCalls: 1, persistCalls: 1, signalExitCode: 0 } },
    expected: false
  },
  {
    id: 'windows-rollback-twice-rejected',
    input: { platform: 'win32', failed: 1, failedIds: ['synthetic-signal-exit-143'], synthetic: { rollbackCalls: 2, persistCalls: 1, signalExitCode: null } },
    expected: false
  },
  {
    id: 'windows-extra-failure-rejected',
    input: { platform: 'win32', failed: 2, failedIds: ['synthetic-signal-exit-143', 'other'], synthetic: { rollbackCalls: 1, persistCalls: 1, signalExitCode: null } },
    expected: false
  },
  {
    id: 'linux-null-signal-rejected',
    input: { platform: 'linux', failed: 1, failedIds: ['synthetic-signal-exit-143'], synthetic: { rollbackCalls: 1, persistCalls: 1, signalExitCode: null } },
    expected: false
  },
  {
    id: 'runner-os-windows-accepted',
    input: { platform: 'linux', runnerOs: 'Windows', failed: 1, failedIds: ['synthetic-signal-exit-143'], synthetic: { rollbackCalls: 1, persistCalls: 1, signalExitCode: null } },
    expected: true
  }
];

const results = cases.map(testCase => {
  const actual = classify(testCase.input);
  return {
    id: testCase.id,
    actual,
    expected: testCase.expected,
    ok: actual === testCase.expected
  };
});
const failed = results.filter(result => !result.ok);
const output = {
  schemaVersion: 'orbit360-windows-signal-compatibility-synthetic-v1',
  status: failed.length ? 'FAIL_WINDOWS_SIGNAL_COMPATIBILITY_SYNTHETIC' : 'PASS_WINDOWS_SIGNAL_COMPATIBILITY_SYNTHETIC',
  total: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  failedCheckIds: failed.map(result => result.id),
  results,
  secretsRead: false,
  firebaseAccess: false,
  browserExecuted: false,
  deployExecuted: false,
  productionTouched: false,
  ok: failed.length === 0
};
console.log(JSON.stringify(output, null, 2));
process.exit(output.ok ? 0 : 42);
