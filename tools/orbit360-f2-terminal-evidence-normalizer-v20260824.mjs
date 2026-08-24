#!/usr/bin/env node
'use strict';

export const TERMINAL_CLASSES = Object.freeze([
  'PASS','FUNCTIONAL_DEFECT','VALIDATOR_STALE','DATA_CONTRACT_FAILURE',
  'ENVIRONMENT_FAILURE','PIPELINE_MECHANISM_FAILURE','SECURITY_FAILURE'
]);

export function normalizeTerminalClassification(evidence = {}) {
  if (evidence.ok === true) return 'PASS';
  const explicit = String(evidence.classification || '').trim();
  if (TERMINAL_CLASSES.includes(explicit)) return explicit;
  const failure = String(evidence.failureCode || evidence.error || '').trim();
  const prefix = failure.split(':')[0];
  if (TERMINAL_CLASSES.includes(prefix)) return prefix;
  return 'PIPELINE_MECHANISM_FAILURE';
}

export function truthfulTerminalFlags({ browser = {}, integrity = {} } = {}) {
  return {
    browserMatrixPass: browser.ok === true,
    integrityBeforeAfterPass: integrity.ok === true,
    zeroCrossTenant: browser.crossTenantDenied === true || browser.crossTenantDeniedObserved === true,
    zeroUnexpectedWrites:
      Number(browser.firestoreWrites || 0) === 0 &&
      Number(browser.authWrites || 0) === 0 &&
      Number(browser.operationalWrites || 0) === 0 &&
      (!Array.isArray(browser.writeSignals) || browser.writeSignals.length === 0)
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sample = normalizeTerminalClassification({ ok:false, classification:'locator.waitFor' });
  if (sample !== 'PIPELINE_MECHANISM_FAILURE') process.exit(41);
  console.log(JSON.stringify({ ok:true, status:'F2_TERMINAL_NORMALIZER_SELFTEST_PASS', unknownClassificationFailsClosedAs:sample }, null, 2));
}
