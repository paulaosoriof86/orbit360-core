#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const PROJECT = 'ays-orbit-360-lab';
const TENANT = 'alianzas-soluciones';
const APPLY = process.argv.includes('--apply');
const MODE = APPLY ? 'APPLY' : 'DRY_RUN';
const EXPECTED_INSURERS = 26;
const OUT_REL = APPLY
  ? 'orbit360-platform/runtime-gate-crm-v20260716/ays-insurers-active-apply-sanitized.json'
  : 'orbit360-platform/runtime-gate-crm-v20260716/ays-insurers-active-dryrun-sanitized.json';
const OUT = path.resolve(OUT_REL);
const execution = { transactionCommitted:false, rollbackExecuted:false, rollbackVerified:false };

const clone = value => JSON.parse(JSON.stringify(value));
const stable = value => Array.isArray(value)
  ? `[${value.map(stable).join(',')}]`
  : value && typeof value === 'object'
    ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`
    : JSON.stringify(value);
const digest = value => crypto.createHash('sha256').update(stable(value)).digest('hex');
const shortHash = value => crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0,16);
const fail = (code, detail='') => { const error = new Error(code); error.code=code; error.detail=detail; throw error; };
function write(payload) { fs.mkdirSync(path.dirname(OUT), { recursive:true }); fs.writeFileSync(OUT, `${JSON.stringify(payload,null,2)}\n`, 'utf8'); }
function withoutTarget(data) { const copy=clone(data||{}); delete copy.vinculada; return copy; }
function init() {
  const project = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '';
  if (project !== PROJECT) fail('PROJECT_MISMATCH', project);
  if (getApps().length) return getApps()[0];
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyFile || !fs.existsSync(keyFile)) fail('SERVICE_ACCOUNT_FILE_REQUIRED');
  const serviceAccount = JSON.parse(fs.readFileSync(keyFile,'utf8'));
  if (serviceAccount.project_id !== PROJECT) fail('SERVICE_ACCOUNT_PROJECT_MISMATCH', serviceAccount.project_id);
  return initializeApp({ credential:cert(serviceAccount), projectId:PROJECT });
}
function buildState(snapshot) {
  const docs=[];
  const summary={ total:snapshot.size, activeTrue:0, inactiveFalse:0, missingActiveField:0, proposedChanges:0, nonTargetChanges:0 };
  snapshot.docs.forEach(doc => {
    const before=clone(doc.data()||{});
    if (before.vinculada === true) summary.activeTrue += 1;
    else if (before.vinculada === false) summary.inactiveFalse += 1;
    else summary.missingActiveField += 1;
    const changed = before.vinculada !== true;
    if (changed) summary.proposedChanges += 1;
    const after={...before,vinculada:true};
    docs.push({
      id:doc.id,
      ref:doc.ref,
      before,
      after,
      changed,
      beforeDigest:digest(before),
      beforeNonTargetDigest:digest(withoutTarget(before)),
      afterNonTargetDigest:digest(withoutTarget(after))
    });
  });
  summary.nonTargetChanges=docs.filter(item=>item.beforeNonTargetDigest!==item.afterNonTargetDigest).length;
  return { docs, summary };
}
function reportBase(state) {
  return {
    schemaVersion:'orbit360-ays-all-insurers-active-v1',
    generatedAt:new Date().toISOString(),
    mode:MODE,
    tenantId:TENANT,
    classification:'DATA_CONTRACT_FAILURE',
    contractVersion:'1.0.39',
    sourceDecision:'DIRECCION_TENANT_PAULA_20260722',
    expectedInsurers:EXPECTED_INSURERS,
    expectedActiveInsurers:EXPECTED_INSURERS,
    manualDeactivationOnly:true,
    before:state.summary,
    affectedDocuments:state.docs.filter(item=>item.changed).map(item=>({ insurerHash:shortHash(item.id), beforeHadExplicitActive:Object.prototype.hasOwnProperty.call(item.before,'vinculada'), beforeActive:item.before.vinculada===true })),
    safety:{ allowedFields:['vinculada'], creates:0, deletes:0, reorders:0, nonTargetChanges:state.summary.nonTargetChanges, vaultRead:false, passwordWrites:0, reimport:false, functionsDeploy:false, rulesDeploy:false, production:false },
    containsPII:false,
    containsSecrets:false
  };
}

async function main() {
  const db=getFirestore(init());
  const collection=db.collection('tenantId').doc(TENANT).collection('aseguradoras');
  const before=buildState(await collection.get());
  if (before.summary.total !== EXPECTED_INSURERS) fail('INSURER_COUNT_MISMATCH', before.summary.total);
  if (before.summary.nonTargetChanges !== 0) fail('PLAN_NON_TARGET_CHANGE', before.summary.nonTargetChanges);

  if (!APPLY) {
    const report=reportBase(before);
    report.ok=true;
    report.status='DRY_RUN_READY';
    report.writesExecuted=false;
    report.transactionCommitted=false;
    report.acceptance={ proposedChanges:before.summary.proposedChanges, activeAfter:EXPECTED_INSURERS, onlyVinculadaChanges:true };
    report.nextAllowedAction='AUTHORIZE_SINGLE_ATOMIC_ALL_ACTIVE_NORMALIZATION';
    write(report); console.log(JSON.stringify(report,null,2)); return;
  }

  const affected=before.docs.filter(item=>item.changed).sort((a,b)=>a.id.localeCompare(b.id));
  if (affected.length) {
    await db.runTransaction(async transaction => {
      const current=await Promise.all(affected.map(item=>transaction.get(item.ref)));
      current.forEach((snapshot,index)=>{
        if (!snapshot.exists) fail('TRANSACTION_DOCUMENT_MISSING', shortHash(affected[index].id));
        if (digest(clone(snapshot.data()||{})) !== affected[index].beforeDigest) fail('TRANSACTION_PRECONDITION_CHANGED', shortHash(affected[index].id));
      });
      affected.forEach(item=>transaction.update(item.ref,{ vinculada:true }));
    });
    execution.transactionCommitted=true;
  }

  let after;
  try {
    after=buildState(await collection.get());
    if (after.summary.total !== EXPECTED_INSURERS) fail('AFTER_INSURER_COUNT_MISMATCH', after.summary.total);
    if (after.summary.activeTrue !== EXPECTED_INSURERS || after.summary.inactiveFalse !== 0 || after.summary.missingActiveField !== 0) fail('AFTER_ACTIVE_COUNT_MISMATCH', JSON.stringify(after.summary));
    if (after.summary.proposedChanges !== 0) fail('AFTER_NOT_IDEMPOTENT', after.summary.proposedChanges);
    for (const item of before.docs) {
      const current=after.docs.find(row=>row.id===item.id);
      if (!current || current.beforeNonTargetDigest !== item.beforeNonTargetDigest) fail('AFTER_NON_TARGET_HASH_MISMATCH', shortHash(item.id));
    }
  } catch (error) {
    if (execution.transactionCommitted && affected.length) {
      await db.runTransaction(async transaction => {
        const current=await Promise.all(affected.map(item=>transaction.get(item.ref)));
        current.forEach((snapshot,index)=>{
          if (!snapshot.exists || snapshot.data().vinculada !== true) fail('ROLLBACK_PRECONDITION_CHANGED', shortHash(affected[index].id));
        });
        affected.forEach(item=>transaction.update(item.ref,{ vinculada:Object.prototype.hasOwnProperty.call(item.before,'vinculada') ? item.before.vinculada : FieldValue.delete() }));
      });
      execution.rollbackExecuted=true;
      const rolled=buildState(await collection.get());
      execution.rollbackVerified=before.docs.every(item=>{
        const current=rolled.docs.find(row=>row.id===item.id);
        return current && current.beforeDigest===item.beforeDigest;
      });
      if (!execution.rollbackVerified) fail('ROLLBACK_VERIFICATION_FAILED');
    }
    throw error;
  }

  const report=reportBase(before);
  report.ok=true;
  report.status=affected.length ? 'ALL_26_ACTIVE_APPLIED_AND_VERIFIED' : 'ALL_26_ALREADY_ACTIVE_AND_VERIFIED';
  report.writesExecuted=execution.transactionCommitted;
  report.transactionCommitted=execution.transactionCommitted;
  report.rollbackExecuted=execution.rollbackExecuted;
  report.rollbackVerified=execution.rollbackVerified;
  report.after={ total:after.summary.total, activeTrue:after.summary.activeTrue, inactiveFalse:after.summary.inactiveFalse, missingActiveField:after.summary.missingActiveField, remainingProposals:after.summary.proposedChanges, nonTargetChanges:0 };
  report.nextAllowedAction='PUBLISH_ONE_HOSTING_LAB_VISUALIZATION';
  write(report); console.log(JSON.stringify(report,null,2));
}

main().catch(error=>{
  const code=String(error&&(error.code||error.message)||'UNKNOWN');
  const payload={ schemaVersion:'orbit360-ays-all-insurers-active-v1', generatedAt:new Date().toISOString(), mode:MODE, tenantId:TENANT, ok:false, classification:code.includes('PROJECT')||code.includes('SERVICE_ACCOUNT')?'ENVIRONMENT_FAILURE':'DATA_CONTRACT_FAILURE', errorCode:code.replace(/[^A-Za-z0-9_.:-]/g,'_').slice(0,160), errorDetailHash:shortHash(error&&error.detail), transactionCommitted:execution.transactionCommitted, writesExecuted:execution.transactionCommitted, rollbackExecuted:execution.rollbackExecuted, rollbackVerified:execution.rollbackVerified, vaultRead:false, reimport:false, functionsDeploy:false, rulesDeploy:false, production:false, containsPII:false, containsSecrets:false, nextAllowedAction:'STOP_THE_LINE' };
  write(payload); console.error(JSON.stringify(payload,null,2)); process.exit(41);
});
