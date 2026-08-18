#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const ROUTER=path.join(ROOT,'tools/orbit360-validar-gate-contracts-v20260717.mjs');
const OLD_LIFECYCLE="tools/orbit360-validator-lifecycle-contract-auth-paula-membership-readonly-reconcile-v2-lab-v20260817.json";
const OLD_ENGINE="tools/orbit360-validar-gate-contracts-engine-auth-paula-membership-readonly-reconcile-v2-lab-v20260818.mjs";
const NEW_LIFECYCLE="tools/orbit360-validator-lifecycle-contract-auth-paula-membership-readonly-reconcile-v2-f1-4d-v20260818.json";
const NEW_ENGINE="tools/orbit360-validar-gate-contracts-engine-auth-paula-membership-readonly-reconcile-v2-f1-4d-v20260818.mjs";
let s=fs.readFileSync(ROUTER,'utf8');
const oldPair=`lifecycle: '${OLD_LIFECYCLE}',\n    engine: '${OLD_ENGINE}'`;
const newPair=`lifecycle: '${NEW_LIFECYCLE}',\n    engine: '${NEW_ENGINE}'`;
const count=(s.match(new RegExp(oldPair.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length;
if(count!==1)throw new Error(`F1_4D_REGISTER_OWNER_PAIR_COUNT_INVALID:${count}`);
s=s.replace(oldPair,newPair);
fs.writeFileSync(ROUTER,s,'utf8');
const out=fs.readFileSync(ROUTER,'utf8');
if(!out.includes(newPair)||out.includes(oldPair))throw new Error('F1_4D_REGISTER_POSTCONDITION_FAILED');
console.log(JSON.stringify({ok:true,status:'F1_4D_GATE_REGISTERED_IN_WORKING_TREE',gateId:'block-auth-paula-membership-readonly-reconcile-v2-lab-v20260817',lifecycle:NEW_LIFECYCLE,engine:NEW_ENGINE,persistentSourceChanged:false},null,2));
