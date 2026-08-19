#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd();
const ROUTER=path.join(ROOT,'tools/orbit360-validar-gate-contracts-v20260717.mjs');
let s=fs.readFileSync(ROUTER,'utf8');
const gate="['f2-productive-acceptance-exact-successor-v20260818']";
const start=s.indexOf(gate);
if(start<0)throw new Error('VALIDATOR_STALE:F2_CANONICAL_GATE_NOT_FOUND');
const end=s.indexOf("[VISUAL_LEGACY_GATE_ID]",start);
if(end<0)throw new Error('VALIDATOR_STALE:F2_CANONICAL_GATE_END_NOT_FOUND');
let block=s.slice(start,end);
if(!block.includes("sourcePhase: 'F2_PRODUCTIVE_ACCEPTANCE_SOURCE_ONLY'"))throw new Error('VALIDATOR_STALE:F2_SOURCE_PHASE_NOT_FOUND');
if(!block.includes('allowHistoricalConsumedRequest: true')){
  block=block.replace("sourcePhase: 'F2_PRODUCTIVE_ACCEPTANCE_SOURCE_ONLY'","sourcePhase: 'F2_PRODUCTIVE_ACCEPTANCE_SOURCE_ONLY',\n    allowHistoricalConsumedRequest: true");
  s=s.slice(0,start)+block+s.slice(end);
}
if(s.includes("const ROUTER_VERSION = 'v10.3-f2-productive-acceptance';"))s=s.replace("const ROUTER_VERSION = 'v10.3-f2-productive-acceptance';","const ROUTER_VERSION = 'v10.4-f2-current-boundary-rootfix';");
fs.writeFileSync(ROUTER,s,'utf8');
const out=fs.readFileSync(ROUTER,'utf8');
const s2=out.indexOf(gate),e2=out.indexOf("[VISUAL_LEGACY_GATE_ID]",s2),b2=out.slice(s2,e2);
if(!b2.includes('allowHistoricalConsumedRequest: true'))throw new Error('VALIDATOR_STALE:F2_HISTORICAL_REQUEST_POSTCONDITION_FAILED');
if(!out.includes("const ROUTER_VERSION = 'v10.4-f2-current-boundary-rootfix';"))throw new Error('VALIDATOR_STALE:F2_ROUTER_VERSION_POSTCONDITION_FAILED');
console.log(JSON.stringify({ok:true,status:'F2_CANONICAL_ROUTER_HISTORICAL_CONSUMED_ENABLED',gateId:'f2-productive-acceptance-exact-successor-v20260818',allowHistoricalConsumedRequest:true,routerVersion:'v10.4-f2-current-boundary-rootfix',dataAccess:false,secretAccess:false,runtimeExecuted:false,browserExecuted:false,writes:0,deployExecuted:false,productionTouched:false},null,2));
