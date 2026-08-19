#!/usr/bin/env node
'use strict';

function numberOr(value,fallback,min,max){
  const n=Number(value);
  if(!Number.isFinite(n))return fallback;
  return Math.max(min,Math.min(max,n));
}

export async function settleBlockingGates(page,options={}){
  if(!page||typeof page.locator!=='function'||typeof page.waitForTimeout!=='function')throw new Error('BLOCKING_GATE_PAGE_REQUIRED');
  const arrivalWindowMs=numberOr(options.arrivalWindowMs,1200,300,5000);
  const quietWindowMs=numberOr(options.quietWindowMs,500,100,3000);
  const pollMs=numberOr(options.pollMs,80,20,500);
  const hardTimeoutMs=numberOr(options.hardTimeoutMs,5000,arrivalWindowMs+quietWindowMs,15000);
  const detachTimeoutMs=numberOr(options.detachTimeoutMs,10000,500,15000);
  const started=Date.now();
  const hardDeadline=started+hardTimeoutMs;
  let lastActivity=started;
  let postDetachDeadline=0;
  let accepted=0;
  let sawGate=false;
  const handled=[];

  while(true){
    const gates=page.locator('[data-legal-gate]');
    const count=await gates.count();
    if(count>0){
      sawGate=true;
      lastActivity=Date.now();
      const gate=gates.first();
      await gate.waitFor({state:'visible',timeout:Math.min(1200,detachTimeoutMs)}).catch(()=>{});
      const checkbox=gate.locator('#lg-chk');
      const confirm=gate.locator('#lg-ok');
      if(await checkbox.count())await checkbox.check();
      if(!(await confirm.count()))throw new Error('BLOCKING_LEGAL_GATE_CONFIRM_MISSING');
      await confirm.click();
      await gate.waitFor({state:'detached',timeout:detachTimeoutMs});
      accepted+=1;
      handled.push('legal');
      lastActivity=Date.now();
      postDetachDeadline=lastActivity+quietWindowMs;
      continue;
    }

    const now=Date.now();
    const elapsed=now-started;
    const quiet=now-lastActivity;
    if(elapsed>=arrivalWindowMs&&quiet>=quietWindowMs){
      return {ok:true,sawGate,accepted,remaining:0,elapsedMs:elapsed,quietWindowSatisfied:true,handled:handled.slice()};
    }

    // hardTimeoutMs limits passive arrival/readiness waiting. Once a gate has
    // actually been handled and detached, always grant its own quiet window;
    // otherwise a slow but successful detach can be misclassified as timeout.
    const observationDeadline=sawGate?Math.max(hardDeadline,postDetachDeadline):hardDeadline;
    if(now>=observationDeadline)break;
    await page.waitForTimeout(pollMs);
  }

  const remaining=await page.locator('[data-legal-gate]').count();
  return {ok:false,sawGate,accepted,remaining,elapsedMs:Date.now()-started,quietWindowSatisfied:false,handled:handled.slice(),timeout:true};
}
