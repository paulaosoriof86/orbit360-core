#!/usr/bin/env node
'use strict';

import { settleBlockingGates } from './orbit360-browser-blocking-gate-readiness-v20260730.mjs';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

class FakePage{
  constructor({gatePresent=true,detachDelayMs=450}={}){
    this.gatePresent=gatePresent;
    this.detachDelayMs=detachDelayMs;
  }
  locator(selector){ return new FakeLocator(this,selector); }
  async waitForTimeout(ms){ await sleep(ms); }
}

class FakeLocator{
  constructor(page,selector){this.page=page;this.selector=selector;}
  first(){return this;}
  locator(selector){return new FakeLocator(this.page,selector);}
  async count(){
    if(this.selector==='[data-legal-gate]')return this.page.gatePresent?1:0;
    if(this.selector==='#lg-chk'||this.selector==='#lg-ok')return this.page.gatePresent?1:0;
    return 0;
  }
  async check(){return true;}
  async click(){return true;}
  async waitFor({state}){
    if(state==='visible'){
      if(!this.page.gatePresent)throw new Error('FAKE_GATE_NOT_VISIBLE');
      return;
    }
    if(state==='detached'){
      await sleep(this.page.detachDelayMs);
      this.page.gatePresent=false;
      return;
    }
    throw new Error(`FAKE_UNSUPPORTED_STATE:${state}`);
  }
}

function need(ok,code,detail=''){
  if(!ok)throw new Error(code+(detail?`:${detail}`:''));
}

const delayed=new FakePage({gatePresent:true,detachDelayMs:450});
const delayedResult=await settleBlockingGates(delayed,{arrivalWindowMs:300,quietWindowMs:100,pollMs:20,hardTimeoutMs:400,detachTimeoutMs:500});
need(delayedResult.ok===true,'PHASE_AWARE_DELAYED_DETACH_SHOULD_PASS',JSON.stringify(delayedResult));
need(delayedResult.sawGate===true&&delayedResult.accepted===1&&delayedResult.remaining===0,'PHASE_AWARE_DELAYED_DETACH_COUNTS_INVALID',JSON.stringify(delayedResult));
need(delayedResult.quietWindowSatisfied===true,'PHASE_AWARE_DELAYED_DETACH_QUIET_WINDOW_MISSING',JSON.stringify(delayedResult));
need(delayedResult.elapsedMs>=500,'PHASE_AWARE_TEST_DID_NOT_CROSS_LEGACY_HARD_TIMEOUT',String(delayedResult.elapsedMs));

const noGate=new FakePage({gatePresent:false,detachDelayMs:0});
const noGateResult=await settleBlockingGates(noGate,{arrivalWindowMs:300,quietWindowMs:100,pollMs:20,hardTimeoutMs:500,detachTimeoutMs:500});
need(noGateResult.ok===true&&noGateResult.sawGate===false&&noGateResult.accepted===0&&noGateResult.remaining===0,'PHASE_AWARE_NO_GATE_REGRESSION',JSON.stringify(noGateResult));

const evidence={
  schemaVersion:'orbit360-blocking-gate-readiness-phase-aware-selftest-v1',
  ok:true,
  status:'F2_LEGAL_READINESS_PHASE_AWARE_SELFTEST_PASS',
  classification:'PASS',
  legacyFailureShapeReproduced:{accepted:1,remaining:0,elapsedBeyondHardTimeout:true},
  phaseAwareResult:delayedResult,
  noGateResult,
  productMutation:false,
  runtimeExecuted:false,
  browserExecuted:false,
  secretAccess:false,
  firestoreRead:false,
  firestoreWrites:0,
  authWrites:0,
  operationalWrites:0,
  containsPII:false,
  containsSecrets:false
};
console.log(JSON.stringify(evidence,null,2));
