#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {sha,validatePackageInput,validateEvidenceLedger} from './orbit360-m5-hosting-control-plane-contract-531-v20260729.mjs';

const ROOT=process.cwd(),PLAT=path.join(ROOT,'orbit360-platform');
const INPUT_REL='tools/orbit360-m5-hosting-package-input-531-v20260729.json';
const LEDGER_REL='tools/orbit360-m5-hosting-evidence-ledger-531-v20260729.json';
const DESCRIPTOR_REL='tools/orbit360-m5-release-candidate-descriptor-530-v20260729.json';
const STOP_REL='tools/orbit360-m5-release-candidate-hosting-stop-overlay-530-v20260729.json';
const OUT=path.join(PLAT,'runtime-gate-crm-v20260716/m5-hosting-control-plane-fixture-531-summary.json');
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const clone=value=>JSON.parse(JSON.stringify(value));
const checks=[];const check=(id,ok,detail='')=>checks.push({id,ok:!!ok,detail:String(detail||'').slice(0,220)});

try{
  const input=json(INPUT_REL),ledger=json(LEDGER_REL),descriptor=json(DESCRIPTOR_REL),stopOverlay=json(STOP_REL),firebaseConfig=json('firebase.json');
  const assetRows=descriptor.criticalAssets.map(rel=>{const file=path.join(PLAT,rel),present=fs.existsSync(file);return{path:rel,present,sha256:present?sha(fs.readFileSync(file)):''};});
  const inputBefore=JSON.stringify(input);
  const first=validatePackageInput({input,descriptor,assetRows,firebaseConfig,stopOverlay});
  check('PACKAGE_FIRST_PASS',first.ok,first.errors.join(','));
  check('CANDIDATE_HASH_STABLE',first.computedHash==='4bf3c8025654f43f6e4af20e5d16115bdc0851352ccddc6f099649405883cf3b',first.computedHash);
  check('ASSET_COUNTS_43_26',first.criticalAssets===43&&first.remoteAssetsExpected===26);
  check('LEDGER_BASE_PASS',validateEvidenceLedger(ledger,INPUT_REL).ok);

  const enrichedLedger=clone(ledger);
  enrichedLedger.entries.push({kind:'synthetic_package_evidence',sourceVersion:'5.0.31-fixture',candidateHash:first.computedHash,remoteAssetsMatched:24,remoteAssetsExpected:26,mismatchCount:2,mismatchPaths:['sw.js','core/session-multirol-visibility-v20260716.js'],hostingDeployExecuted:false});
  const enrichedLedgerResult=validateEvidenceLedger(enrichedLedger,INPUT_REL);
  check('LEDGER_ENRICHMENT_PASS',enrichedLedgerResult.ok&&enrichedLedgerResult.entryCount===ledger.entries.length+1,enrichedLedgerResult.errors.join(','));
  check('PACKAGE_INPUT_UNCHANGED_AFTER_LEDGER_ENRICHMENT',JSON.stringify(input)===inputBefore);

  const second=validatePackageInput({input,descriptor,assetRows,firebaseConfig,stopOverlay});
  check('PACKAGE_SECOND_PASS_AFTER_EVIDENCE',second.ok,second.errors.join(','));
  check('PACKAGE_RESULT_STABLE_AFTER_EVIDENCE',JSON.stringify(first)===JSON.stringify(second));
  check('PACKAGE_VALIDATOR_HAS_NO_LEDGER_DEPENDENCY',!validatePackageInput.toString().includes('ledger'));

  const badHash=clone(input);badHash.expectedCandidateHash='0'.repeat(64);
  check('NEGATIVE_HASH_REJECTED',validatePackageInput({input:badHash,descriptor,assetRows,firebaseConfig,stopOverlay}).errors.includes('candidate_hash_invalid'));
  const badCounts=clone(input);badCounts.criticalAssets=42;badCounts.remoteAssetsExpected=25;
  check('NEGATIVE_COUNTS_REJECTED',validatePackageInput({input:badCounts,descriptor,assetRows,firebaseConfig,stopOverlay}).errors.includes('asset_counts_invalid'));
  const badCaps=clone(input);badCaps.capabilityCeiling.deploy=true;
  check('NEGATIVE_CAPABILITY_REJECTED',validatePackageInput({input:badCaps,descriptor,assetRows,firebaseConfig,stopOverlay}).errors.includes('capability_ceiling_invalid'));
  const badLedger=clone(ledger);badLedger.packageInput='tools/wrong-package-input.json';
  check('NEGATIVE_LEDGER_BINDING_REJECTED',validateEvidenceLedger(badLedger,INPUT_REL).errors.includes('ledger_package_input_binding_invalid'));
  check('STOP_OVERLAY_PRESERVED',stopOverlay.status==='M5_LAB_HOSTING_530_STOPPED_AFTER_TWO_PACKAGE_PIPELINE_FAILURES'&&stopOverlay.authorization?.hostingLabDeliveryAuthorized===false&&stopOverlay.authorization?.allowedExecutions===0);
  check('NO_530_REQUEST',!fs.existsSync(path.join(ROOT,'tools/orbit360-m5-lab-hosting-delivery-request-530-v20260729.json')));

  const failed=checks.filter(row=>!row.ok),out={schemaVersion:'orbit360-m5-hosting-control-plane-fixture-531-v1',gateId:'block5-release-candidate-visualization-v20260728',contractVersion:'5.0.31',ok:failed.length===0,status:failed.length?'M5_HOSTING_CONTROL_PLANE_531_FIXTURE_FAIL':'M5_HOSTING_CONTROL_PLANE_531_FIXTURE_PASS',passed:checks.length-failed.length,total:checks.length,failed:failed.length,failedCheckIds:failed.map(row=>row.id),checks,candidateHash:first.computedHash,criticalAssets:43,remoteAssetsExpected:26,packageInputImmutable:true,evidenceLedgerSeparate:true,packageResultStableAfterEvidence:JSON.stringify(first)===JSON.stringify(second),secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false,containsPII:false,containsSecrets:false};
  fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n','utf8');console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
}catch(error){console.error(String(error&&error.stack||error));process.exit(41);}
