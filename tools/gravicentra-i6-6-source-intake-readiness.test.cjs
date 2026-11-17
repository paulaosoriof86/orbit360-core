'use strict';
// Offline causal regression. No Firebase, browser session, credentials or writes.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const d=require('./gravicentra-i6-6-proposal-uat-diagnostics.cjs');
const driver=fs.readFileSync(require.resolve('./gravicentra-i6-6-proposal-application-signed-uat.cjs'),'utf8');
const privateValue='PRIVATE_SOURCE_ACTOR_TOKEN_NOT_FOR_DIAGNOSTICS';
function readiness(stage){
 const start=driver.indexOf("enter('"+stage+"')");assert.ok(start>=0);
 const expression=driver.slice(start).match(/await direction\.waitForFunction\((\(\)=>[^,\n]+),null,\{timeout:30000\}\)/)?.[1];
 assert.ok(expression,'existing readiness predicate must retain its finite timeout');
 const context=vm.createContext({window:{}}),predicate=vm.runInContext('('+expression+')',context);
 return {context,check:()=>predicate()};
}
test('original post-commit predicate throws before runtime globals exist',()=>{
 const legacy=vm.runInNewContext('(()=>!!Orbit.productAppP0&&!!Orbit.productRuntimeBrowserProvidersP0)',{window:{}});
 assert.throws(()=>legacy(),error=>error.name==='ReferenceError'&&error.message==='Orbit is not defined');
});
test('source file UI waits through absent and partial bootstrap before becoming ready',()=>{
 const p=readiness('SOURCE_INTAKE_UI_OPEN');assert.equal(p.check(),false);
 p.context.window.Orbit={};assert.equal(p.check(),false);
 p.context.window.Orbit.modules={};assert.equal(p.check(),false);
 p.context.window.Orbit.modules.importar={};assert.equal(p.check(),false);
 p.context.window.Orbit.importa={};assert.equal(p.check(),true);
 delete p.context.window.Orbit.modules.importar;assert.equal(p.check(),false);
});
test('source reload waits for both app and provider without aborting at document commit',()=>{
 const p=readiness('SOURCE_INTAKE_RELOAD_READBACK');assert.equal(p.check(),false);
 p.context.window.Orbit={};assert.equal(p.check(),false);
 p.context.window.Orbit.productAppP0={};assert.equal(p.check(),false);
 p.context.window.Orbit.productRuntimeBrowserProvidersP0={};assert.equal(p.check(),true);
 delete p.context.window.Orbit.productAppP0;assert.equal(p.check(),false);
});
test('Playwright-wrapped missing Orbit is classified without retaining raw error text',()=>{
 const error={name:'Error',message:'page.waitForFunction: ReferenceError: Orbit is not defined\n'+privateValue,
  stack:'Error\n at '+privateValue+'/tools/gravicentra-i6-6-proposal-application-signed-uat.cjs:350:19'};
 const failure=d.failureDetails(error,'SOURCE_INTAKE_RELOAD_READBACK');
 assert.equal(failure.failureClass,'REFERENCE_ERROR');assert.equal(failure.failureCheck,'I66_PROPOSAL_ORBIT_GLOBAL_UNDEFINED');
 assert.equal(failure.failureStage,'SOURCE_INTAKE_RELOAD_READBACK');assert.equal(failure.failureCode,'NO_CODE');
 assert.deepEqual(failure.failureLocation,{file:d.DRIVER,line:350,column:19});
 assert.equal(JSON.stringify(failure).includes(privateValue),false);
});
test('unknown page exception remains unknown and cannot be assigned the Orbit cause',()=>{
 const failure=d.failureDetails({name:'Error',message:'page.waitForFunction: ReferenceError: '+privateValue+' is not defined'},'SOURCE_INTAKE_RELOAD_READBACK');
 assert.equal(failure.failureClass,'REFERENCE_ERROR');assert.equal(failure.failureCheck,'UNNAMED_FAILURE');
 assert.equal(JSON.stringify(failure).includes(privateValue),false);
 const wrong=d.failureDetails({name:privateValue,message:privateValue,code:privateValue},privateValue);
 assert.equal(wrong.failureClass,'ERROR');assert.equal(wrong.failureStage,'UNKNOWN_STAGE');assert.equal(wrong.failureCode,'UNKNOWN_CODE');
 assert.equal(JSON.stringify(wrong).includes(privateValue),false);
});
test('pageerror retains safe class, source stage and approved runtime location only',()=>{
 for(const query of ['', '?v='+privateValue]){
 const intake={status:'HOLD',stage:'SOURCE_INTAKE_RELOAD_READBACK',syntheticOnly:true,pageErrors:0,consoleErrors:0,httpErrors:0};
 d.recordSourceIntakePageError(intake,{name:'TypeError',message:privateValue,stack:'TypeError: '+privateValue+'\n at https://'+privateValue+'/core/product-app-p0.js'+query+':412:18'},intake.stage);
 assert.equal(intake.pageErrors,1);assert.equal(intake.status,'HOLD');
 const safe=d.safeSourceIntakeEvidence(intake);
 assert.deepEqual(safe.pageErrorDetails[0],{stage:'SOURCE_INTAKE_RELOAD_READBACK',failureClass:'TYPE_ERROR',failureCheck:'UNNAMED_FAILURE',failureCode:'NO_CODE',runtimeLocation:{file:'product-app-p0.js',line:412,column:18}});
 assert.equal(safe.readbackAfterReload,null);assert.equal(safe.normalUiIdempotentReplay,null);assert.equal(safe.financialWrites,null);
 assert.equal(JSON.stringify(safe).includes(privateValue),false);
 }
});
test('diagnostic cap preserves total pageerror count and does not authorize acceptance',()=>{
 const intake={status:'HOLD',stage:'SOURCE_INTAKE_RELOAD_READBACK',pageErrors:0};
 for(let i=0;i<12;i++)d.recordSourceIntakePageError(intake,{name:'ReferenceError',message:'Orbit is not defined'},intake.stage);
 const report=d.safeProposalDiagnosticReport({status:'HOLD',phase:'PREVIEW',failureStage:intake.stage,...d.failureDetails({name:'ReferenceError',message:'Orbit is not defined'},intake.stage),sourceIntake:intake,cleanup:{status:'PASS',remaining:0,removedOwnedTargets:26}});
 assert.equal(report.status,'HOLD');assert.equal(report.sourceIntake.status,'HOLD');assert.equal(report.sourceIntake.pageErrors,12);assert.equal(report.sourceIntake.pageErrorDetails.length,5);
 assert.equal(report.failureCheck,'I66_PROPOSAL_ORBIT_GLOBAL_UNDEFINED');assert.equal(report.cleanupStatus,'PASS');assert.equal(report.remaining,0);
 assert.equal(report.sourceIntake.readbackAfterReload,null);assert.equal(report.sourceIntake.normalUiIdempotentReplay,null);
});
test('diagnostic re-projection strips arbitrary text, malformed details and unapproved files',()=>{
 const input={status:'HOLD',stage:'SOURCE_INTAKE_RELOAD_READBACK',pageErrors:3,pageErrorDetails:[null,{stage:privateValue,failureClass:privateValue,failureCheck:privateValue,failureCode:privateValue,runtimeLocation:{file:privateValue,line:1,column:1},message:privateValue},{stage:'SOURCE_INTAKE_UI_OPEN',failureClass:'TYPE_ERROR',failureCheck:'UNNAMED_FAILURE',failureCode:'NO_CODE',runtimeLocation:{file:'importar.js',line:999999,column:1}}]};
 const safe=d.safeSourceIntakeEvidence(input);assert.equal(safe.pageErrors,3);assert.equal(safe.pageErrorDetails.length,3);
 assert.equal(safe.pageErrorDetails[0].stage,'UNKNOWN_STAGE');assert.equal(safe.pageErrorDetails[1].failureCode,'UNKNOWN_CODE');
 assert.equal(safe.pageErrorDetails.some(x=>x.runtimeLocation),false);assert.equal(JSON.stringify(safe).includes(privateValue),false);
 assert.deepEqual(d.safeSourceIntakeEvidence(safe),safe);
});
