#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {normalizeScriptEvidence} from './orbit360-gate-bootstrap-auth-legal-normalized-v20260729.mjs';
const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/m5-bootstrap-evidence-normalizer-test.json');
const checks=[];const check=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'').slice(0,180)});
try{
  const report={browserParseDiagnostics:{parsedScripts:['/data/store.js',{path:'/core/router.js'},'/core/auth.js'],failedScripts:['/broken.js',{path:'/other.js',error:'x'}]}};
  normalizeScriptEvidence(report);
  const parsed=report.browserParseDiagnostics.parsedScripts;
  const failed=report.browserParseDiagnostics.failedScripts;
  check('PARSED_ALL_OBJECTS',parsed.every(row=>row&&typeof row==='object'&&typeof row.path==='string'));
  check('PARSED_PATHS_PRESERVED',JSON.stringify(parsed.map(row=>row.path))===JSON.stringify(['/data/store.js','/core/router.js','/core/auth.js']));
  check('FAILED_ALL_OBJECTS',failed.every(row=>row&&typeof row==='object'&&typeof row.path==='string'));
  check('FAILED_PATHS_PRESERVED',JSON.stringify(failed.map(row=>row.path))===JSON.stringify(['/broken.js','/other.js']));
  check('FAILED_METADATA_PRESERVED',failed[1].error==='x');
  normalizeScriptEvidence(report);
  check('IDEMPOTENT',JSON.stringify(report.browserParseDiagnostics.parsedScripts.map(row=>row.path))===JSON.stringify(['/data/store.js','/core/router.js','/core/auth.js']));
  const ownerPaths=new Set(report.browserParseDiagnostics.parsedScripts.map(row=>String(row.path||'')));
  check('AUTH_UI_REQUIRED_OWNERS_RECOGNIZED',ownerPaths.has('/data/store.js')&&ownerPaths.has('/core/router.js')&&ownerPaths.has('/core/auth.js'));
}catch(error){check('FIXTURE_EXCEPTION',false,error&&error.stack||error);}
const failed=checks.filter(item=>!item.ok);
const out={schemaVersion:'orbit360-m5-bootstrap-evidence-normalizer-test-v1',generatedAt:new Date().toISOString(),ok:failed.length===0,status:failed.length?'M5_BOOTSTRAP_EVIDENCE_NORMALIZER_FAIL':'M5_BOOTSTRAP_EVIDENCE_NORMALIZER_PASS',passed:checks.length-failed.length,total:checks.length,failed:failed.length,failedCheckIds:failed.map(item=>item.id),checks,secrets:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtime:false,browser:false,deploy:false,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
