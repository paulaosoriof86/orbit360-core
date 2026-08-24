#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Canonical F2 source selftest facade. Public path remains unchanged.
// F2_INLINE_ONE_SHOT_ACCEPT_V13
// F2_CANDIDATE_VALIDATOR_V2_CONTRACT_REINTRODUCED
// Removes prior-candidate 9/185/107 bindings and adds Operativo/Aseguradoras regression guard.
const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const CORE_REL='tools/orbit360-test-f2-full-runtime-known-rootfixes-core-v20260824.mjs';
const CORE=path.join(ROOT,CORE_REL);
const fail=code=>{throw new Error(code);};
const once=(src,from,to,code)=>{const n=src.split(from).length-1;if(n!==1)fail(`PIPELINE_MECHANISM_FAILURE:${code}_PRECONDITION_${n}`);return src.replace(from,to);};
if(!fs.existsSync(CORE))fail('PIPELINE_MECHANISM_FAILURE:F2_SELFTEST_CORE_MISSING');
let s=fs.readFileSync(CORE,'utf8').replace(/^\uFEFF/,'');
s=once(s,
  'Number(cert.deltaCount)===9&&Number(cert.unchangedFileCount)===185&&cert.runtimeExecuted===false&&cert.browserExecuted===false&&cert.secretAccess===false&&cert.firestoreRead===false&&Number(cert.writes)===0&&cert.deployExecuted===false&&cert.productionTouched===false&&closure.status===\'TRANSVERSAL_SOURCE_ACCEPTANCE_PASS\'&&closure.evidencePath===certPath&&Number(closure.runId)===Number(cert.runId)&&Number(closure.checksPassed)===107',
  'Number(cert.deltaCount)===Number(closure.deltaCount)&&Number(cert.unchangedFileCount)===Number(closure.unchangedFileCount)&&cert.runtimeExecuted===false&&cert.browserExecuted===false&&cert.secretAccess===false&&cert.firestoreRead===false&&Number(cert.writes)===0&&cert.deployExecuted===false&&cert.productionTouched===false&&closure.status===\'TRANSVERSAL_SOURCE_ACCEPTANCE_PASS\'&&closure.evidencePath===certPath&&Number(closure.runId)===Number(cert.runId)&&Number(closure.checksPassed)===Number(cert.checksPassed)',
  'F2_SELFTEST_DYNAMIC_CERT_COUNTS');
s=once(s,
  "const app=frozen('orbit360-platform/core/product-app-p0.js'),store=frozen('orbit360-platform/data/store-firestore-product-readonly-p0.js'),crm=frozen('orbit360-platform/core/crmkit.js');",
  "const app=frozen('orbit360-platform/core/product-app-p0.js'),store=frozen('orbit360-platform/data/store-firestore-product-readonly-p0.js'),crm=frozen('orbit360-platform/core/crmkit.js'),access=frozen('orbit360-platform/core/access-ceilings-v1199.js'),index=frozen('orbit360-platform/index.html');",
  'F2_SELFTEST_ACCESS_ROOTFIX_SOURCE');
s=once(s,
  "need(crm.includes('Orbit.clientProjection')&&crm.includes(\"const tipo = c.tipo || 'Pendiente de completar'\")&&!crm.includes('${c.tipo} · ${c.pais}'),'VALIDATOR_STALE:F2_FROZEN_CLIENT_PROJECTION_ROOTFIX_MISSING');",
  "need(crm.includes('Orbit.clientProjection')&&crm.includes(\"const tipo = c.tipo || 'Pendiente de completar'\")&&!crm.includes('${c.tipo} · ${c.pais}'),'VALIDATOR_STALE:F2_FROZEN_CLIENT_PROJECTION_ROOTFIX_MISSING');\n  need(access.includes(\"operativo.modulos = operativo.modulos.concat('aseguradoras')\")&&index.indexOf('core/access-ceilings-v1199.js')>=0&&index.indexOf('core/access-ceilings-v1199.js')<index.indexOf('core/router.js'),'VALIDATOR_STALE:F2_OPERATIVO_ASEGURADORAS_ROOTFIX_MISSING');",
  'F2_SELFTEST_ACCESS_ROOTFIX_GUARD');
const tmp=path.join(os.tmpdir(),`orbit360-f2-selftest-${process.pid}-${Date.now()}.mjs`);
try{fs.writeFileSync(tmp,s,'utf8');const run=spawnSync(process.execPath,[tmp,...process.argv.slice(2)],{cwd:ROOT,env:process.env,stdio:'inherit'});if(run.error)throw run.error;process.exitCode=Number.isInteger(run.status)?run.status:41;}finally{try{fs.unlinkSync(tmp);}catch{}}
