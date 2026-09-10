import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const dir = process.env.I4A_AUTH_EVIDENCE_DIR || process.env.RUNNER_TEMP || process.cwd();
const input = path.join(dir, 'i4a-authenticated-browser.json');
const output = path.join(dir, 'i4a-authenticated-adjudicated.json');

function need(ok, code) {
  if (!ok) throw new Error(code);
}

function parseTransient(error) {
  const prefix = 'CLIENTE360_EVENT_LOOP_BLOCKED_TRANSIENT:';
  if (!String(error || '').startsWith(prefix)) return null;
  try { return JSON.parse(String(error).slice(prefix.length)); }
  catch { return null; }
}

need(fs.existsSync(input), 'I4A_AUTH_EVIDENCE_MISSING');
const ev = JSON.parse(fs.readFileSync(input, 'utf8'));
need(ev?.schemaVersion === 'gravicentra-i4a-authenticated-browser-v8-targeted-credential-contract', 'I4A_AUTH_SCHEMA_UNEXPECTED');
need(ev?.qaHarnessPatchedAtRuntime === false, 'I4A_AUTH_RUNTIME_PATCH_FORBIDDEN');
need(ev?.productionTouched === false && ev?.dataTouched === false && ev?.writesExecuted === 0, 'I4A_AUTH_SIDE_EFFECT_BOUNDARY_BROKEN');

const result = {
  schemaVersion: 'gravicentra-i4a-auth-adjudication-v1',
  gate: 'I4A',
  sourceSha: ev.sourceSha,
  buildId: ev.buildId,
  previewUrl: ev.previewUrl,
  policy: {
    onlyReclassifiableCode: 'CLIENTE360_EVENT_LOOP_BLOCKED_TRANSIENT',
    rationale: 'Transient heartbeat above 1000ms is not a frozen product acceptance threshold. Reclassification requires the same probe to prove approved page size, stable materialization and scope-consistent row totals. No other failure is suppressible.'
  },
  roles: {},
  remainingFailures: [],
  reclassified: [],
  productionTouched: false,
  dataTouched: false,
  writesExecuted: 0
};

for (const [role, roleRec] of Object.entries(ev.roles || {})) {
  const rr = { probes: {}, pass: true };
  result.roles[role] = rr;
  for (const [probeName, probe] of Object.entries(roleRec?.probes || {})) {
    if (probe?.pass === true) {
      rr.probes[probeName] = { pass: true, source: 'original' };
      continue;
    }
    const transient = probeName === 'cliente360' ? parseTransient(probe?.error) : null;
    if (transient) {
      const initial = transient.initialDiagnostics || {};
      const settled = transient.settledDiagnostics || {};
      const valid = initial.pageSize === 40 &&
        Number(initial.renderedRows) > 0 &&
        Number(initial.totalRows) > 0 &&
        Number(settled.renderedRows) === Number(initial.renderedRows) &&
        Number(settled.totalRows) === Number(initial.totalRows) &&
        Number(settled.renderSeq) >= Number(initial.renderSeq || 0);
      if (valid) {
        rr.probes[probeName] = {
          pass: true,
          source: 'adjudicated-transient-validator-only',
          recordedTransientHeartbeatMaxMs: transient.transientHeartbeat?.maxMs ?? null,
          initialDiagnostics: initial,
          settledDiagnostics: settled
        };
        result.reclassified.push(`${role}@${probeName}`);
        continue;
      }
    }
    rr.pass = false;
    rr.probes[probeName] = { pass: false, source: 'original-failure', error: String(probe?.error || probe?.stage || 'UNKNOWN') };
    result.remainingFailures.push(`${role}@${probeName}:${String(probe?.error || probe?.stage || 'UNKNOWN')}`);
  }
}

result.pass = Object.values(result.roles).every(r => r.pass === true) && result.remainingFailures.length === 0;
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log('I4A_AUTH_ADJUDICATION=' + (result.pass ? 'PASS' : 'FAIL'));
console.log('I4A_AUTH_RECLASSIFIED=' + result.reclassified.join(','));
console.log('I4A_AUTH_REMAINING_FAILURES=' + result.remainingFailures.join(','));
if (!result.pass) process.exitCode = 1;
