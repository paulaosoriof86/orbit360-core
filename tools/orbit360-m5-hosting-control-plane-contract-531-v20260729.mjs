#!/usr/bin/env node
'use strict';
import crypto from 'node:crypto';

export const VERSION='5.0.31';
export const INPUT_SCHEMA='orbit360-m5-hosting-package-input-531-v1';
export const LEDGER_SCHEMA='orbit360-m5-hosting-evidence-ledger-531-v1';

export function sha(value){return crypto.createHash('sha256').update(value).digest('hex');}
export function candidateHashFromRows(rows){return sha(JSON.stringify((rows||[]).map(row=>({path:row.path,sha256:row.sha256}))));}

function exactCapabilities(value){
  const expected={secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false};
  const keys=Object.keys(expected).sort(),actual=Object.keys(value||{}).sort();
  return JSON.stringify(keys)===JSON.stringify(actual)&&keys.every(key=>value[key]===expected[key]);
}

export function validatePackageInput({input,descriptor,assetRows,firebaseConfig,stopOverlay}){
  const errors=[];
  const computedHash=candidateHashFromRows(assetRows);
  if(!input||input.schemaVersion!==INPUT_SCHEMA||input.contractVersion!==VERSION)errors.push('package_input_schema_invalid');
  if(input?.immutableAfterCreation!==true)errors.push('package_input_not_immutable');
  if(input?.descriptor!=='tools/orbit360-m5-release-candidate-descriptor-530-v20260729.json')errors.push('descriptor_binding_invalid');
  if(input?.sourceStopOverlay!=='tools/orbit360-m5-release-candidate-hosting-stop-overlay-530-v20260729.json')errors.push('stop_overlay_binding_invalid');
  if(input?.criticalAssets!==43||input?.remoteAssetsExpected!==26)errors.push('asset_counts_invalid');
  if(input?.expectedCandidateHash!==computedHash||computedHash.length!==64)errors.push('candidate_hash_invalid');
  if(!descriptor||descriptor.schemaVersion!=='orbit360-m5-release-candidate-descriptor-v1'||descriptor.criticalAssets?.length!==43||descriptor.remoteAssets?.length!==26)errors.push('descriptor_shape_invalid');
  if(!descriptor?.criticalAssets?.includes('core/session-multirol-visibility-v20260716.js')||!descriptor?.remoteAssets?.includes('core/session-multirol-visibility-v20260716.js'))errors.push('multirol_asset_binding_missing');
  if((assetRows||[]).length!==43||(assetRows||[]).some(row=>row.present!==true||!row.sha256))errors.push('critical_assets_invalid');
  if(!stopOverlay||stopOverlay.status!=='M5_LAB_HOSTING_530_STOPPED_AFTER_TWO_PACKAGE_PIPELINE_FAILURES'||stopOverlay.releaseCandidate?.hash!==computedHash||stopOverlay.controls?.packageFailureCount!==2)errors.push('stop_overlay_state_invalid');
  if(input?.target?.projectId!=='ays-orbit-360-lab'||input?.target?.channel!=='orbit360-ays-lab'||input?.target?.canonicalUrl!=='https://ays-orbit-360-lab--orbit360-ays-lab-fj1zxnk2.web.app')errors.push('target_invalid');
  if(firebaseConfig?.hosting?.public!=='orbit360-platform'||!Array.isArray(firebaseConfig?.hosting?.ignore)||!firebaseConfig.hosting.ignore.includes('docs/**')||firebaseConfig.hosting.rewrites)errors.push('firebase_hosting_contract_invalid');
  if(!exactCapabilities(input?.capabilityCeiling))errors.push('capability_ceiling_invalid');
  if(input?.containsPII!==false||input?.containsSecrets!==false)errors.push('sanitization_invalid');
  return {ok:errors.length===0,errors,computedHash,criticalAssets:(assetRows||[]).length,remoteAssetsExpected:Number(input?.remoteAssetsExpected||0),packageInputStable:true};
}

export function validateEvidenceLedger(ledger,packageInputPath){
  const errors=[];
  if(!ledger||ledger.schemaVersion!==LEDGER_SCHEMA||ledger.contractVersion!==VERSION)errors.push('ledger_schema_invalid');
  if(ledger?.packageInput!==packageInputPath)errors.push('ledger_package_input_binding_invalid');
  if(ledger?.appendOnly!==true||!Array.isArray(ledger?.entries))errors.push('ledger_append_only_invalid');
  if(ledger?.containsPII!==false||ledger?.containsSecrets!==false)errors.push('ledger_sanitization_invalid');
  return {ok:errors.length===0,errors,entryCount:Array.isArray(ledger?.entries)?ledger.entries.length:0};
}
