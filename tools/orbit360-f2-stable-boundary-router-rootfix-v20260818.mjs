#!/usr/bin/env node
'use strict';
import fs from 'node:fs';

const file='tools/orbit360-validar-gate-contracts-v20260717.mjs';
let src=fs.readFileSync(file,'utf8');
const from="const ROUTER_VERSION = 'v10.4-f2-current-boundary-rootfix';";
const to="const ROUTER_VERSION = 'v10.5-f2-stable-boundary-contract';";
if(src.includes(to)){
  console.log(JSON.stringify({ok:true,status:'F2_STABLE_BOUNDARY_ROUTER_ALREADY_APPLIED',persistentSourceChanged:false}));
  process.exit(0);
}
if(!src.includes(from)){
  console.error('VALIDATOR_STALE:F2_ROUTER_VERSION_OWNER_UNEXPECTED');
  process.exit(41);
}
src=src.replace(from,to);
if(!src.includes("allowHistoricalConsumedRequest: true")){
  console.error('VALIDATOR_STALE:F2_HISTORICAL_CONSUMED_REQUEST_GUARD_MISSING');
  process.exit(41);
}
fs.writeFileSync(file,src,'utf8');
console.log(JSON.stringify({ok:true,status:'F2_STABLE_BOUNDARY_ROUTER_ROOTFIX_APPLIED',persistentSourceChanged:true,routerVersion:'v10.5-f2-stable-boundary-contract'}));
