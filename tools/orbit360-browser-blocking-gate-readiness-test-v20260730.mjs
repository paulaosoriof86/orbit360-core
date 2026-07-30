#!/usr/bin/env node
'use strict';
import {settleBlockingGates} from './orbit360-browser-blocking-gate-readiness-v20260730.mjs';

const started=Date.now();
const state={removed:false,checked:false,delayMs:520};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const active=()=>!state.removed&&(Date.now()-started)>=state.delayMs;

const checkbox={
  count:async()=>active()?1:0,
  check:async()=>{if(!active())throw new Error('MOCK_CHECKBOX_NOT_ACTIVE');state.checked=true;}
};
const confirm={
  count:async()=>active()?1:0,
  click:async()=>{if(!active()||!state.checked)throw new Error('MOCK_CONFIRM_NOT_READY');state.removed=true;}
};
const gate={
  waitFor:async({state:desired,timeout=1000})=>{
    const until=Date.now()+timeout;
    while(Date.now()<until){
      if(desired==='visible'&&active())return;
      if(desired==='detached'&&state.removed)return;
      await sleep(10);
    }
    throw new Error('MOCK_WAIT_TIMEOUT:'+desired);
  },
  locator:selector=>selector==='#lg-chk'?checkbox:selector==='#lg-ok'?confirm:{count:async()=>0}
};
const collection={
  count:async()=>active()?1:0,
  first:()=>gate
};
const page={
  locator:selector=>selector==='[data-legal-gate]'?collection:{count:async()=>0,first:()=>({})},
  waitForTimeout:sleep
};

const out=await settleBlockingGates(page,{arrivalWindowMs:900,quietWindowMs:120,pollMs:25,hardTimeoutMs:1800,detachTimeoutMs:500});
const elapsed=Date.now()-started;
if(!out.ok||out.accepted!==1||out.remaining!==0||out.sawGate!==true||elapsed<state.delayMs||elapsed>=1800){
  console.error(JSON.stringify({status:'FAIL',out,elapsed},null,2));
  process.exit(41);
}
console.log(JSON.stringify({status:'PASS',delayedGateMs:state.delayMs,elapsedMs:elapsed,accepted:out.accepted,remaining:out.remaining},null,2));
