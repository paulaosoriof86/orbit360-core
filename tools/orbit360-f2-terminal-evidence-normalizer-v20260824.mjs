#!/usr/bin/env node
'use strict';

export const TERMINAL_CLASSES = Object.freeze([
  'PASS','FUNCTIONAL_DEFECT','VALIDATOR_STALE','DATA_CONTRACT_FAILURE',
  'ENVIRONMENT_FAILURE','PIPELINE_MECHANISM_FAILURE','SECURITY_FAILURE'
]);

export function normalizeTerminalClassification(evidence = {}) {
  const explicit = String(evidence.classification || '').trim();
  const failure = String(evidence.failureCode || evidence.error || '').trim();
  const prefix = failure.split(':')[0];

  if (evidence.ok === true) {
    return explicit && explicit !== 'PASS' ? 'DATA_CONTRACT_FAILURE' : 'PASS';
  }
  if (explicit === 'PASS') return 'DATA_CONTRACT_FAILURE';
  if (TERMINAL_CLASSES.includes(explicit)) return explicit;
  if (TERMINAL_CLASSES.includes(prefix) && prefix !== 'PASS') return prefix;
  return 'PIPELINE_MECHANISM_FAILURE';
}

export function truthfulTerminalFlags({ browser = {}, integrity = {}, currentRunIntegrity = false } = {}) {
  return {
    browserMatrixPass: browser.ok === true && browser.status === 'F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_PASS',
    integrityBeforeAfterPass: currentRunIntegrity === true && integrity.ok === true && integrity.status === 'F2_INTEGRITY_BEFORE_AFTER_PASS',
    zeroCrossTenant: browser.crossTenantDenied === true || browser.crossTenantDeniedObserved === true,
    zeroUnexpectedWrites:
      Number(browser.firestoreWrites || 0) === 0 &&
      Number(browser.authWrites || 0) === 0 &&
      Number(browser.operationalWrites || 0) === 0 &&
      (!Array.isArray(browser.writeSignals) || browser.writeSignals.length === 0)
  };
}

export function terminalPassContract(evidence = {}) {
  return evidence.ok === true &&
    evidence.status === 'F2_PRODUCTIVE_ACCEPTANCE_PASS' &&
    evidence.classification === 'PASS' &&
    evidence.browserMatrixPass === true &&
    evidence.integrityBeforeAfterPass === true &&
    evidence.zeroCrossTenant === true &&
    evidence.zeroUnexpectedWrites === true &&
    Number(evidence.firestoreWrites || 0) === 0 &&
    Number(evidence.authWrites || 0) === 0 &&
    Number(evidence.operationalWrites || 0) === 0 &&
    evidence.deployExecuted === false &&
    evidence.productionHostingTouched === false;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const falsePass = normalizeTerminalClassification({ ok:false, classification:'PASS' });
  const unknown = normalizeTerminalClassification({ ok:false, classification:'locator.waitFor' });
  if (falsePass !== 'DATA_CONTRACT_FAILURE') process.exit(41);
  if (unknown !== 'PIPELINE_MECHANISM_FAILURE') process.exit(41);
  console.log(JSON.stringify({
    ok:true,
    status:'F2_TERMINAL_NORMALIZER_SELFTEST_PASS',
    falsePassFailsClosedAs:falsePass,
    unknownClassificationFailsClosedAs:unknown
  }, null, 2));
}
