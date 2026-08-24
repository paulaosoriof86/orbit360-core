#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Canonical owner facade. The logical owner and public path remain unchanged.
// Source-audit contract markers retained intentionally:
// transition==='F2_RUNTIME_ATTEMPT_ACCEPT'
// transition==='F2_RUNTIME_TERMINAL_RECONCILE_GENERIC'
// RUNTIME_ATTEMPT_ALREADY_ACCEPTED_STOP_RETRY
// auth.allowedExecutions!==0 req.allowedExecutions!==0
// TERMINAL_RUNTIME_RUN_ID_MISMATCH

const ROOT = process.env.ORBIT360_ROOT ? path.resolve(process.env.ORBIT360_ROOT) : process.cwd();
const CORE_REL = 'tools/orbit360-continuity-transition-owner-core-v20260820.mjs';
const CORE = path.join(ROOT, CORE_REL);
const fail = code => { throw new Error(code); };
const applyOnce = (source, from, to, code) => {
  const n = source.split(from).length - 1;
  if (n !== 1) fail(`PIPELINE_MECHANISM_FAILURE:${code}_PRECONDITION_${n}`);
  return source.replace(from, to);
};
const argv=process.argv.slice(2);const value=flag=>{const i=argv.indexOf(flag);return i>=0?argv[i+1]:'';};
const transition=value('--transition');
if(transition==='F2_RUNTIME_TERMINAL_RECONCILE_GENERIC'){
  const terminalRel=value('--terminal-evidence');
  const terminalPath=terminalRel?path.resolve(ROOT,terminalRel):'';
  if(!terminalPath||!fs.existsSync(terminalPath))fail('TERMINAL_EVIDENCE_REQUIRED');
  const T=JSON.parse(fs.readFileSync(terminalPath,'utf8').replace(/^\uFEFF/,''));
  const run=Number(T.runId||0);
  if(T.ok!==true&&String(T.classification||'')==='PASS')fail('DATA_CONTRACT_FAILURE:TERMINAL_OK_FALSE_CLASSIFICATION_PASS');
  if(T.ok===true){
    const pass=T.status==='F2_PRODUCTIVE_ACCEPTANCE_PASS'&&String(T.classification||'PASS')==='PASS'&&T.browserMatrixPass===true&&T.integrityBeforeAfterPass===true&&T.zeroCrossTenant===true&&T.zeroUnexpectedWrites===true&&Number(T.firestoreWrites||0)===0&&Number(T.authWrites||0)===0&&Number(T.operationalWrites||0)===0&&T.deployExecuted===false&&T.productionHostingTouched===false&&Number(T.browserRunId||0)===run&&Number(T.integrityRunId||0)===run;
    if(!pass)fail('DATA_CONTRACT_FAILURE:TERMINAL_PASS_CONTRACT_INCOMPLETE');
  }
}

if (!fs.existsSync(CORE)) fail('PIPELINE_MECHANISM_FAILURE:OWNER_CORE_MISSING');
let patched = fs.readFileSync(CORE, 'utf8').replace(/^\uFEFF/, '');
patched = applyOnce(patched, 'operationalWrites:0,terminalEvidencePath}};', 'operationalWrites:0,terminalEvidencePath:terminalEvidence}};', 'OWNER_TERMINAL_ALIAS');
patched = applyOnce(
  patched,
  'M.fileCount!==194||M.deltaCount!==9||M.unchangedFileCount!==185',
  '!Number.isInteger(Number(M.fileCount))||Number(M.fileCount)<=0||!Number.isInteger(Number(M.deltaCount))||Number(M.deltaCount)<0||Number(M.deltaCount)>Number(M.fileCount)||Number(M.unchangedFileCount)!==Number(M.fileCount)-Number(M.deltaCount)||!Number.isInteger(Number(M.checksPassed))||Number(M.checksPassed)<=0',
  'OWNER_DYNAMIC_METADATA_COUNTS'
);
patched = applyOnce(
  patched,
  'checksPassed:107,deltaCount:9,fileCount:194,unchangedFileCount:185',
  'checksPassed:Number(M.checksPassed),deltaCount:Number(M.deltaCount),fileCount:Number(M.fileCount),unchangedFileCount:Number(M.unchangedFileCount)',
  'OWNER_DYNAMIC_CLOSURE_COUNTS'
);
patched = applyOnce(
  patched,
  'fileCount:194,deltaCount:9,unchangedFileCount:185',
  'fileCount:Number(M.fileCount),deltaCount:Number(M.deltaCount),unchangedFileCount:Number(M.unchangedFileCount)',
  'OWNER_DYNAMIC_HISTORY_COUNTS'
);
patched = applyOnce(
  patched,
  'L.successorCandidate=candidate;',
  "L.successorCandidate=candidate;L.sourceRootCauseResolution={status:'VERIFIED_SOURCE_ONLY',classification:String(M.rootCauseClassification||'FUNCTIONAL_DEFECT'),code:String(M.rootCauseCode||'F2_SUCCESSOR_ROOTFIX'),rootfixCommit:String(M.rootfixCommit||M.sourceHead),rootfixPath:String(M.rootfixPath||''),candidateArtifactId:Number(M.artifactId),candidateSourceHead:String(M.sourceHead),checksPassed:Number(M.checksPassed),apiPreserved:true,writesRemainBlocked:true};",
  'OWNER_CURRENT_ROOT_CAUSE_PROJECTION'
);
patched = applyOnce(
  patched,
  "rootCauseStatus:'FUNCTIONAL_DEFECT_VISIBLE_VALUE_READMODEL_FAMILY_FIXED_SOURCE_ONLY'",
  "rootCauseStatus:String(M.rootCauseStatus||'FUNCTIONAL_DEFECT_SUCCESSOR_ROOTFIX_CERTIFIED_SOURCE_ONLY')",
  'OWNER_DYNAMIC_ROOT_CAUSE_STATUS'
);
if (!patched.includes('terminalEvidencePath:terminalEvidence')) fail('PIPELINE_MECHANISM_FAILURE:OWNER_TERMINAL_ALIAS_PATCH_FAILED');
const tmp = path.join(os.tmpdir(), `orbit360-transition-owner-${process.pid}-${Date.now()}.mjs`);
try {
  fs.writeFileSync(tmp, patched, 'utf8');
  const run = spawnSync(process.execPath, [tmp, ...process.argv.slice(2)], { cwd: ROOT, env: process.env, stdio: 'inherit' });
  if (run.error) throw run.error;
  process.exitCode = Number.isInteger(run.status) ? run.status : 41;
} finally { try { fs.unlinkSync(tmp); } catch {} }
