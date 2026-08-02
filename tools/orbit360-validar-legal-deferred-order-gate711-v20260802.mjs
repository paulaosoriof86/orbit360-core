#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const VALIDATOR=path.join(ROOT,'tools/orbit360-validar-canonical-runtime-cumulative-visual-lab-v20260801.mjs');
const LEGAL=path.join(ROOT,'orbit360-platform/core/legal.js');
const WORKFLOW=path.join(ROOT,'.github/workflows/orbit360-canonical-runtime-cumulative-visual-lab-v20260801.yml');
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/gate711-legal-deferred-order-static-v20260802.json');

function read(file){return fs.readFileSync(file,'utf8');}
function save(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify({...payload,containsPII:false,containsSecrets:false},null,2)+'\n','utf8');}

const validator=read(VALIDATOR);
const legal=read(LEGAL);
const workflow=read(WORKFLOW);
const hydrate=validator.indexOf("bounded('canonical_store_hydrated'");
const settle=validator.indexOf('await settleLegalGateAfterHydration(page);');
const guard=validator.indexOf('window.__orbitRuntimeWriteGuard={calls};');
const checks=[
  {id:'LEGAL_OWNER_MARKER',ok:legal.includes('data-legal-gate')},
  {id:'LEGAL_OWNER_CHECKBOX',ok:legal.includes('id="lg-chk"')},
  {id:'LEGAL_OWNER_ACCEPT',ok:legal.includes('id="lg-ok"')},
  {id:'LEGAL_OWNER_STATE',ok:legal.includes('__gateState')&&legal.includes('pendingScopes')&&legal.includes('doneScopes')},
  {id:'VALIDATOR_SETTLER',ok:validator.includes('async function settleLegalGateAfterHydration(page)')},
  {id:'HYDRATE_BEFORE_LEGAL',ok:hydrate>=0&&settle>hydrate},
  {id:'LEGAL_BEFORE_WRITE_GUARD',ok:settle>=0&&guard>settle},
  {id:'NO_PREMATURE_VISIBLE_BRANCH',ok:!validator.includes("const legalVisible=await page.locator('[data-legal-gate]:visible').count()")},
  {id:'LEGAL_ABSENT_ASSERTION',ok:validator.includes("legal_gate_absent_before_write_guard")&&validator.includes('legalSettledBeforeWriteGuard=true')},
  {id:'WORKFLOW_NODE_CHECK',ok:workflow.includes('node --check tools/orbit360-validar-canonical-runtime-cumulative-visual-lab-v20260801.mjs')}
];
const failed=checks.filter(item=>!item.ok);
const payload={schemaVersion:'orbit360-gate711-legal-deferred-order-static-v1',gateId:'block7-canonical-runtime-cumulative-visual-lab-v20260801',contractVersion:'7.11.0',classification:failed.length?'VALIDATOR_STALE':'GO_STATIC_LEGAL_DEFERRED_ORDER',status:failed.length?'GATE711_LEGAL_DEFERRED_ORDER_STATIC_FAIL':'GATE711_LEGAL_DEFERRED_ORDER_STATIC_PASS',checks,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(item=>item.id),productFilesChanged:0,dataFilesChanged:0,firestoreReads:0,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,production:false,main:false,merge:false,ok:failed.length===0};
save(payload);
console.log(JSON.stringify(payload,null,2));
process.exit(payload.ok?0:41);
