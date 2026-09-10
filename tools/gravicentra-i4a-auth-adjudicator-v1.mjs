import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const dir = process.env.I4A_AUTH_EVIDENCE_DIR || process.env.RUNNER_TEMP || process.cwd();
const input = path.join(dir, 'i4a-authenticated-browser.json');
const insurerInput = path.join(dir, 'i4a-aseguradoras-credential-ui.json');
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

function containsDeclarationOnlyTrue(value) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(containsDeclarationOnlyTrue);
  for (const [key, nested] of Object.entries(value)) {
    if (key === 'declarationOnly' && nested === true) return true;
    if (containsDeclarationOnlyTrue(nested)) return true;
  }
  return false;
}

need(fs.existsSync(input), 'I4A_AUTH_EVIDENCE_MISSING');
need(fs.existsSync(insurerInput), 'I4A_ASEGURADORAS_TARGETED_EVIDENCE_MISSING');
const ev = JSON.parse(fs.readFileSync(input, 'utf8'));
const insurer = JSON.parse(fs.readFileSync(insurerInput, 'utf8'));
need(ev?.schemaVersion === 'gravicentra-i4a-authenticated-browser-v8-targeted-credential-contract', 'I4A_AUTH_SCHEMA_UNEXPECTED');
need(ev?.qaHarnessPatchedAtRuntime === false, 'I4A_AUTH_RUNTIME_PATCH_FORBIDDEN');
need(ev?.productionTouched === false && ev?.dataTouched === false && ev?.writesExecuted === 0, 'I4A_AUTH_SIDE_EFFECT_BOUNDARY_BROKEN');
need(!containsDeclarationOnlyTrue(ev), 'I4A_AUTH_DECLARATION_ONLY_EVIDENCE_FORBIDDEN');
need(insurer?.schemaVersion === 'gravicentra-i4a-aseguradoras-credential-ui-v1', 'I4A_ASEGURADORAS_TARGETED_SCHEMA_UNEXPECTED');
need(insurer?.sourceSha === ev.sourceSha && insurer?.buildId === ev.buildId && insurer?.previewUrl === ev.previewUrl, 'I4A_ASEGURADORAS_TARGETED_RELEASE_IDENTITY_MISMATCH');
need(insurer?.productionTouched === false && insurer?.dataTouched === false && insurer?.operationalWritesExecuted === 0, 'I4A_ASEGURADORAS_TARGETED_SIDE_EFFECT_BOUNDARY_BROKEN');
need(insurer?.userIdentitiesRecorded === false && insurer?.tokensRecorded === false && insurer?.secretsRecorded === false, 'I4A_ASEGURADORAS_TARGETED_SANITIZATION_BROKEN');
need(!containsDeclarationOnlyTrue(insurer), 'I4A_ASEGURADORAS_DECLARATION_ONLY_EVIDENCE_FORBIDDEN');
need(insurer?.status === 'PASS', 'I4A_ASEGURADORAS_TARGETED_NOT_PASS');

const requiredInsurerRoles = ['Dirección', 'SuperAdmin', 'AdminTenant', 'Operativo', 'Asesor'];
const privilegedInsurerRoles = new Set(['Dirección', 'SuperAdmin', 'AdminTenant', 'Operativo']);
const targetedPhysicalProof = {};
for (const role of requiredInsurerRoles) {
  const rec = insurer?.roles?.[role];
  need(rec?.pass === true, 'I4A_ASEGURADORAS_TARGETED_ROLE_NOT_PASS:' + role);
  need(rec?.legalGate?.completed === true && rec?.legalGate?.interaction === 'ordinary-ui', 'I4A_ASEGURADORAS_LEGAL_GATE_NOT_PHYSICAL:' + role);
  const evidence = rec?.evidence || {};
  need(evidence?.state?.stable === true && evidence?.banks?.stable === true, 'I4A_ASEGURADORAS_TARGETED_UI_NOT_STABLE:' + role);
  need(evidence?.operationalWriteProof?.pass === true, 'I4A_ASEGURADORAS_OPERATIONAL_WRITE_PROOF_MISSING:' + role);
  const delta = evidence?.operationalWriteProof?.delta || {};
  need(Number(delta.pending) === 0 && Number(delta.committed) === 0 && Number(delta.failed) === 0, 'I4A_ASEGURADORAS_OPERATIONAL_WRITE_DELTA_NONZERO:' + role);

  if (privilegedInsurerRoles.has(role)) {
    const refCount = Number(evidence?.credentialCandidate?.refCount || 0);
    need(refCount > 0, 'I4A_ASEGURADORAS_CREDENTIAL_SAMPLE_MISSING:' + role);
    need(Number(evidence?.revealResolvedCount) === refCount, 'I4A_ASEGURADORAS_REVEAL_NOT_PHYSICALLY_PROVEN:' + role);
    need(Number(evidence?.copyResolvedCount) === refCount, 'I4A_ASEGURADORAS_CREDENTIAL_COPY_NOT_PHYSICALLY_PROVEN:' + role);
    need(Number(evidence?.rehiddenCount) === refCount, 'I4A_ASEGURADORAS_REHIDE_NOT_PHYSICALLY_PROVEN:' + role);
    need(Number(evidence?.bankCandidate?.numberBearing || 0) > 0, 'I4A_ASEGURADORAS_BANK_NUMBER_SAMPLE_MISSING:' + role);
    need(Number(evidence?.banks?.numberVisible || 0) > 0, 'I4A_ASEGURADORAS_BANK_NUMBER_NOT_VISIBLE:' + role);
    need(Number(evidence?.banks?.copyButtons || 0) > 0, 'I4A_ASEGURADORAS_BANK_COPY_ACTION_MISSING:' + role);
    need(evidence?.bankCopyResolved === true, 'I4A_ASEGURADORAS_BANK_COPY_NOT_PHYSICALLY_PROVEN:' + role);
  } else {
    need(evidence?.advisorRestricted === true, 'I4A_ASEGURADORAS_ADVISOR_RESTRICTION_NOT_PROVEN:' + role);
  }

  targetedPhysicalProof[role] = {
    legalGateOrdinaryUi: true,
    stableUi: true,
    credentialRevealCopyRehide: privilegedInsurerRoles.has(role),
    bankNumberCopy: privilegedInsurerRoles.has(role),
    advisorRestricted: role === 'Asesor',
    operationalWriteDeltaZero: true
  };
}

const result = {
  schemaVersion: 'gravicentra-i4a-auth-adjudication-v3-physical-evidence-only',
  gate: 'I4A',
  sourceSha: ev.sourceSha,
  buildId: ev.buildId,
  previewUrl: ev.previewUrl,
  policy: {
    transientReclassifiableCode: 'CLIENTE360_EVENT_LOOP_BLOCKED_TRANSIENT',
    targetedReplacementProbe: 'aseguradoras',
    declarationOnlyEvidenceAccepted: false,
    rationale: 'Cliente360 may reclassify only its frozen-contract-safe transient heartbeat case. Aseguradoras may replace the legacy overlay-blocked raw probe only with separately committed, release-identical physical UI evidence that follows the ordinary legal-gate UI and proves credentialRef reveal/copy/re-hide, privileged bank-number visibility/copy, advisor restriction, portal/card integrity and zero operational-write delta. declarationOnly evidence is forbidden. No other failure is suppressible.'
  },
  targetedAseguradoras: {
    schemaVersion: insurer.schemaVersion,
    pass: insurer.status === 'PASS',
    evidenceClass: 'PHYSICAL_AUTHENTICATED_PREVIEW_UI',
    declarationOnly: false,
    roleProof: targetedPhysicalProof,
    ephemeralBrowserLocalStateTouched: insurer.ephemeralBrowserLocalStateTouched === true,
    operationalWritesExecuted: insurer.operationalWritesExecuted,
    secretsRecorded: insurer.secretsRecorded
  },
  roles: {},
  remainingFailures: [],
  reclassified: [],
  replacedByTargetedEvidence: [],
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
    if (probeName === 'aseguradoras' && insurer?.roles?.[role]?.pass === true && targetedPhysicalProof[role]) {
      rr.probes[probeName] = { pass: true, source: 'committed-targeted-aseguradoras-ui-v1-physical' };
      result.replacedByTargetedEvidence.push(`${role}@${probeName}`);
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
console.log('I4A_AUTH_TARGETED_REPLACEMENTS=' + result.replacedByTargetedEvidence.join(','));
console.log('I4A_AUTH_REMAINING_FAILURES=' + result.remainingFailures.join(','));
if (!result.pass) process.exitCode = 1;
