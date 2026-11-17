'use strict';
// New QA-only tests. No credentials, Firebase SDK, network or external writes.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const d=require('./gravicentra-i6-6-proposal-uat-diagnostics.cjs');
const driver=fs.readFileSync(require.resolve('./gravicentra-i6-6-proposal-application-signed-uat.cjs'),'utf8');
const privateValue='PRIVATE_VALUE_NOT_FOR_DIAGNOSTICS';
const noPrivate=value=>assert.equal(JSON.stringify(value).includes(privateValue),false);
const base=()=>({member:{uid:privateValue,tenantId:'tenant_fixture',status:'active',roles:['Dirección'],activeRole:'Dirección',countries:['GT'],advisorId:privateValue,dataScopes:{default:'all'}},
 accessConfig:{roleScopes:{direccion:'all'},rolePermissions:{direccion:{conciliaciones:{ver:true,editar:true}}}},
 reconciliationConfig:{autoCommitHighConfidence:true,manualApplicationEnabled:false,requireSameCurrency:true,privateField:privateValue},configExists:true,accessConfigExists:true,
 tenantId:'tenant_fixture',auth:{uid:privateValue,token:{giActiveRole:'Dirección',secret:privateValue}},activeRole:'Dirección',selectedUid:privateValue,
 policy:{id:privateValue,pais:'GT',tenantId:'tenant_fixture'},receipt:{id:privateValue,pais:'GT',tenantId:'tenant_fixture'}});
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
test('projection retains exact first reason and candidate presence without receipt identifiers',()=>{
 const value=d.projectCallableResult({result:{reason:'SOURCE_RECEIPT_IDENTITY_MISSING',status:'REVIEW_REQUIRED',eligible:false,resolutionOptions:[{receiptId:privateValue,amount:987654.32}],targetIssue:privateValue}},'preview_proposal_application','FIRST_PROPOSAL_PREVIEW',privateValue);
 assert.equal(value.reason,'SOURCE_RECEIPT_IDENTITY_MISSING');assert.equal(value.candidateCount,1);assert.equal(value.expectedReceiptPresent,true);assert.equal(value.eligible,false);noPrivate(value);assert.equal(JSON.stringify(value).includes('987654.32'),false);
});
test('callable denial preserves only a closed code and reason',()=>{
 const value=d.projectCallableResult({denied:true,code:'functions/permission-denied',reason:'MEMBERSHIP_DENIED',message:privateValue,details:{uid:privateValue}},'resolve_proposal_application','ADVISOR_ROLE_DENIAL',privateValue);
 assert.equal(value.denied,true);assert.equal(value.code,'permission-denied');assert.equal(value.reason,'MEMBERSHIP_DENIED');assert.equal(value.candidateCount,null);noPrivate(value);
});
test('unknown strings are removed even when shaped like technical codes',()=>{
 const value=d.projectCallableResult({denied:true,code:privateValue,reason:privateValue},privateValue,privateValue,privateValue);
 assert.equal(value.code,'UNKNOWN_CODE');assert.equal(value.reason,'UNKNOWN_REASON');assert.equal(value.stage,'UNKNOWN_STAGE');assert.equal(value.operation,'UNKNOWN_OPERATION');noPrivate(value);
});
test('malformed results do not become false candidate evidence',()=>{
 for(const result of [null,[],{resolutionOptions:privateValue},{resolutionOptions:{receiptId:privateValue}}]){
  const value=d.projectCallableResult({result},'preview_proposal_application','FIRST_PROPOSAL_PREVIEW',privateValue);
  assert.equal(value.candidateCount,null);assert.equal(value.expectedReceiptPresent,null);noPrivate(value);
 }
 const value=d.projectCallableResult({result:{resolutionOptions:[{}]}},'preview_proposal_application','FIRST_PROPOSAL_PREVIEW');assert.equal(value.expectedReceiptPresent,null);
});
test('diagnostic count and boolean fields reject arbitrary text and unbounded numbers',()=>{
 const value=d.safeCallableDiagnostic({stage:'READY_PREVIEW',candidateCount:900000,targetCount:-1,eligible:privateValue,expectedReceiptPresent:1,denied:privateValue});
 assert.equal(value.candidateCount,null);assert.equal(value.targetCount,null);assert.equal(value.eligible,null);assert.equal(value.expectedReceiptPresent,null);noPrivate(value);
});
test('UI response observation admits only the same exact synthetic request',()=>{
 const url='https://us-central1-ays-orbit-360-lab.cloudfunctions.net/orbit360CobrosReconciliationCommandPreview';
 const request={data:{tenantId:'alianzas-soluciones',operation:'resolve_proposal_application',payload:{proposalId:'synthetic_proposal',sourceRunId:'synthetic_run'}}};
 assert.equal(d.ownedUiRequest(url,request,'PREVIEW','synthetic_proposal','synthetic_run'),true);
 for(const args of [[url,request,'LIVE','synthetic_proposal','synthetic_run'],[url+'.invalid',request,'PREVIEW','synthetic_proposal','synthetic_run'],['https://example.invalid/orbit360CobrosReconciliationCommandPreview',request,'PREVIEW','synthetic_proposal','synthetic_run'],[url,request,'PREVIEW','other','synthetic_run'],[url,request,'PREVIEW','synthetic_proposal','other'],[url,{data:{...request.data,tenantId:'other'}},'PREVIEW','synthetic_proposal','synthetic_run'],[url,{data:{...request.data,operation:'apply_payment'}},'PREVIEW','synthetic_proposal','synthetic_run']])assert.equal(d.ownedUiRequest(...args),false);
});
test('UI error response strips raw error text and keeps the safe status code',()=>{
 const value=d.projectUiResponse({error:{status:'PERMISSION_DENIED',message:privateValue,details:{uid:privateValue}}},'resolve_proposal_application','UI_RESOLUTION_CONFIRM',privateValue);
 assert.equal(value.channel,'UI');assert.equal(value.code,'permission-denied');assert.equal(value.reason,'UNKNOWN_REASON');assert.equal(value.denied,true);noPrivate(value);
 const safe=d.projectUiResponse({result:{status:'READY_TO_APPLY',eligible:true,targets:[{receiptId:privateValue,amount:300}]}},'preview_proposal_application','UI_RESOLUTION_OPEN',privateValue);
 assert.equal(safe.targetCount,1);assert.equal(safe.eligible,true);noPrivate(safe);
});
test('prerequisite baseline uses actual product owners without mutation or grants',()=>{
 const input=freeze(base()),before=JSON.stringify(input),value=d.diagnoseProposalPrerequisites(input);
 assert.equal(value.status,'COMPLETE');assert.equal(value.effectiveScope,'all');assert.equal(value.policyAllowed,true);assert.equal(value.receiptAllowed,true);assert.equal(value.assignedRoleValid,true);assert.equal(value.policyScopeOutcome,'ALLOWED');assert.equal(JSON.stringify(input),before);noPrivate(value);
});
test('legacy own and team scopes expose the actual advisor ambiguity without widening scope',()=>{
 for(const scope of ['own','team']){const input=base();input.member.dataScopes.default=scope;const value=d.diagnoseProposalPrerequisites(input);
  assert.equal(value.effectiveScope,scope);assert.equal(value.policyAllowed,false);assert.equal(value.receiptAllowed,false);assert.equal(value.policyScopeOutcome,'ADVISOR_AMBIGUOUS');noPrivate(value);
 }
});
test('missing or different canonical member UID remains a membership denial',()=>{
 for(const memberUid of [undefined,'different_fixture_uid']){const input=base();input.member.uid=memberUid;const value=d.diagnoseProposalPrerequisites(input);
  assert.equal(value.memberUidMatchesAuth,false);assert.equal(value.policyScopeOutcome,'MEMBERSHIP_DENIED');assert.equal(value.receiptAllowed,false);noPrivate(value);
 }
});
test('signed claim mismatch is diagnosed by the same boundary rather than normalized away',()=>{
 const input=base();input.auth.token.giActiveRole='Operativo';const value=d.diagnoseProposalPrerequisites(input);
 assert.equal(value.signedRolePresent,true);assert.equal(value.policyScopeOutcome,'SIGNED_ACTIVE_ROLE_MISMATCH');assert.equal(value.effectiveScope,null);assert.equal(value.receiptAllowed,false);noPrivate(value);
});
test('explicit scope none, module denial and country denial remain distinct',()=>{
 const changes=[['SCOPE_NONE',x=>x.member.dataScopes.modules={conciliaciones:'none'}],['MODULE_DENIED',x=>x.accessConfig.rolePermissions.direccion.conciliaciones.ver=false],['COUNTRY_DENIED',x=>x.member.countries=['CO']]];
 for(const [expected,mutate] of changes){const input=base();mutate(input);const value=d.diagnoseProposalPrerequisites(input);assert.equal(value.policyScopeOutcome,expected);assert.equal(value.receiptAllowed,false);noPrivate(value);}
});
test('missing config and boolean flags remain observation, never authorization',()=>{
 const input=base();input.configExists=false;input.reconciliationConfig={autoCommitHighConfidence:privateValue,requireSameCurrency:false};const value=d.diagnoseProposalPrerequisites(input);
 assert.equal(value.configExists,false);assert.equal(value.configFlags.autoCommitHighConfidence,null);assert.equal(value.configFlags.requireSameCurrency,false);assert.equal(value.configFlags.manualApplicationEnabled,null);assert.equal(value.status,'COMPLETE');noPrivate(value);
});
test('missing assigned roles retain product role-contract denial',()=>{
 const input=base();input.member.roles=[];const value=d.diagnoseProposalPrerequisites(input);
 assert.equal(value.assignedRoleValid,false);assert.equal(value.policyScopeOutcome,'PRODUCT_ASSIGNED_ROLES_MISSING');assert.equal(value.receiptAllowed,false);noPrivate(value);
});
test('error location contains the exact driver basename and bounded line only',()=>{
 const error=new Error('I66_PROPOSAL_FIRST_PREVIEW_CANDIDATE\n'+privateValue);error.code='ERR_ASSERTION';error.stack='AssertionError: '+privateValue+'\n at main (/private/'+privateValue+'/'+d.DRIVER+':155:7)';
 const value=d.failureDetails(error,'FIRST_PROPOSAL_PREVIEW');assert.equal(value.failureCheck,'I66_PROPOSAL_FIRST_PREVIEW_CANDIDATE');assert.equal(value.failureClass,'ASSERTION');assert.deepEqual(value.failureLocation,{file:d.DRIVER,line:155,column:7});assert.equal(value.failureLine,155);noPrivate(value);
});
test('unknown exception messages and unrelated stack paths never appear in diagnostics',()=>{
 const error={message:privateValue,code:privateValue,name:privateValue,stack:'at '+privateValue+'/another-file.js:12:5'};const value=d.failureDetails(error,privateValue);
 assert.equal(value.failureCheck,'UNNAMED_FAILURE');assert.equal(value.failureCode,'UNKNOWN_CODE');assert.equal(value.failureLocation,undefined);noPrivate(value);
});
async function executeFirstPreview(response){
 const begin=driver.indexOf("  enter('FIRST_PROPOSAL_PREVIEW');"),end=driver.indexOf("  enter('OPERATIVE_ACCESS');",begin);assert.ok(begin>0&&end>begin);
 let stage;const calls=[],checks=[];
 try{await vm.runInNewContext('(async()=>{'+driver.slice(begin,end)+'})()',{
  assert,enter:value=>stage=value,rawCall:async(_page,operation)=>{calls.push(d.projectCallableResult(response,operation,stage,privateValue));return response;},direction:{},proposalPayload:{},ids:{receipt:privateValue},checked:value=>checks.push(value)
 },{filename:d.DRIVER,lineOffset:driver.slice(0,begin).split('\n').length-1});return{calls,checks};}
 catch(error){return{calls,checks,failure:d.failureDetails(error,stage)};}
}
test('actual first-preview driver distinguishes wrong reason from missing expected candidate',async()=>{
 const reason=await executeFirstPreview({result:{reason:'TENANT_RECONCILIATION_CONFIG_REQUIRED'}});
 assert.equal(reason.failure.failureCheck,'I66_PROPOSAL_FIRST_PREVIEW_REASON');assert.equal(reason.failure.failureStage,'FIRST_PROPOSAL_PREVIEW');assert.equal(reason.calls[0].reason,'TENANT_RECONCILIATION_CONFIG_REQUIRED');assert.equal(reason.checks.length,0);assert.ok(reason.failure.failureLine>0);
 const candidate=await executeFirstPreview({result:{reason:'SOURCE_RECEIPT_IDENTITY_MISSING',resolutionOptions:[]}});
 assert.equal(candidate.failure.failureCheck,'I66_PROPOSAL_FIRST_PREVIEW_CANDIDATE');assert.equal(candidate.calls[0].candidateCount,0);assert.equal(candidate.calls[0].expectedReceiptPresent,false);assert.equal(candidate.checks.length,0);noPrivate(candidate);
});
test('actual first-preview driver preserves successful candidate assertion',async()=>{
 const result=await executeFirstPreview({result:{reason:'SOURCE_RECEIPT_IDENTITY_MISSING',resolutionOptions:[{receiptId:privateValue}]}});
 assert.equal(result.failure,undefined);assert.deepEqual(result.checks,['SERVER_LOADED_EXACT_CANDIDATE']);assert.equal(result.calls[0].expectedReceiptPresent,true);noPrivate(result);
});
test('synthetic seed bytes stay identical to the failed source39 fixture',()=>{
 const begin=driver.indexOf('  const source={sourceRowId:'),end=driver.indexOf("  checked('ISOLATED_SYNTHETIC_STAGE_NO_REAL_POINTER_CHANGE');",begin);
 const fixture=driver.slice(begin,end)+'return{source,hashes,policy,receipt,portfolio,stageProposal,stageEvidence};';
 assert.equal(crypto.createHash('sha256').update(fixture).digest('hex'),'241461a725df484992d8b8b380df9de15a5cefc7603c21022e83ba8e79aa7173');
});
test('sanitizer revalidates every field and bounds trace length',()=>{
 const report={status:'HOLD',phase:'PREVIEW',checks:['a','b','c'],failureStage:'FIRST_PROPOSAL_PREVIEW',failureClass:'ASSERTION',failureCheck:'I66_PROPOSAL_FIRST_PREVIEW_CANDIDATE',failureCode:'ERR_ASSERTION',failureLine:987654321,
  failureLocation:{file:privateValue,line:40,column:1},sourceSha:privateValue,actor:{uid:privateValue},rawResult:privateValue,
  proposalDiagnostics:{prerequisites:{...d.diagnoseProposalPrerequisites(base()),uid:privateValue},calls:Array(40).fill({stage:'FIRST_PROPOSAL_PREVIEW',operation:'preview_proposal_application',reason:privateValue,code:privateValue,candidateCount:0,expectedReceiptPresent:false,raw:privateValue})},
  realControlUnchanged:true,cleanup:{status:'PASS',remaining:0,removedOwnedTargets:8,errors:[],raw:privateValue}};
 const value=d.safeProposalDiagnosticReport(report);assert.equal(value.status,'HOLD');assert.equal(value.checks,3);assert.equal(value.cleanupStatus,'PASS');assert.equal(value.remaining,0);assert.equal(value.removedOwnedTargets,8);assert.equal(value.proposalDiagnostics.calls.length,32);assert.equal(value.failureLocation,undefined);assert.equal(value.failureLine,undefined);noPrivate(value);
});
test('actual workflow failure sanitizer uses the closed Proposal projection',()=>{
 const workflow=fs.readFileSync(path.join(__dirname,'../.github/workflows/gravicentra-i66-privileged-role-three-function-preview-uat.yml'),'utf8');
 const step=workflow.slice(workflow.indexOf('      - name: Preserve sanitized failure diagnostics'));
 const begin=step.indexOf("          const fs=require('node:fs')"),end=step.indexOf('\n          NODE',begin);assert.ok(begin>0&&end>begin);
 const report={status:'HOLD',phase:'PREVIEW',checks:[1,2,3],failureStage:'FIRST_PROPOSAL_PREVIEW',failureClass:'ASSERTION',failureCheck:'I66_PROPOSAL_FIRST_PREVIEW_CANDIDATE',failureCode:'ERR_ASSERTION',message:privateValue,proposalDiagnostics:{prerequisites:{status:'READ_FAILED',raw:privateValue},calls:[{stage:'FIRST_PROPOSAL_PREVIEW',operation:'preview_proposal_application',reason:'SOURCE_RECEIPT_IDENTITY_MISSING',candidateCount:0,expectedReceiptPresent:false,raw:privateValue}]},cleanup:{status:'PASS',remaining:0,removedOwnedTargets:8}};
 let saved;
 vm.runInNewContext(step.slice(begin,end),{process:{env:{RUNNER_TEMP:'/tmp/diagnostic-test',I66_PACKAGE_ROOT:'/tmp/package-test',GITHUB_RUN_ID:'123',SOURCE_SHA:'a'.repeat(40)}},require:name=>{
  if(name==='node:fs')return{existsSync:file=>file.endsWith('i66-proposal-application-signed-uat-preview.json'),readFileSync:()=>JSON.stringify(report),writeFileSync:(_file,value)=>saved=JSON.parse(value)};
  if(name==='node:path')return path;
  if(name.endsWith('proposal-uat-diagnostics.cjs'))return d;
  if(name.endsWith('advisor-payables-signed-uat.cjs'))return{safeFinanceUiDiagnostics:()=>{throw Error('UNEXPECTED_CXP_READ');},safeLegalFailureSubstage:()=>null};
  throw Error('UNEXPECTED_DEPENDENCY');
 }});
 assert.equal(saved.status,'FAILED_NOT_ACCEPTED');assert.equal(saved.reports.length,1);assert.equal(saved.reports[0].owner,'PROPOSAL');assert.equal(saved.reports[0].proposalDiagnostics.calls[0].candidateCount,0);assert.equal(saved.reports[0].failureCheck,'I66_PROPOSAL_FIRST_PREVIEW_CANDIDATE');noPrivate(saved);
});
test('driver keeps denial assertions, ordinary UI, and ownership cleanup intact',()=>{
 assert.match(driver,/assert\.equal\(advisorDenied\.denied,true\)/);assert.match(driver,/assert\.equal\(forbidden\.denied,true\)/);assert.match(driver,/assert\.equal\(stale\.result\?\.eligible,false\)/);
 assert.match(driver,/direction\.locator\('\[data-conc-resolve\]'\)\.click\(\)/);assert.match(driver,/ref\.delete\(\{lastUpdateTime:s\.updateTime\}\)/);assert.match(driver,/if\(!failure\)Object\.assign\(report,failureDetails\(error,stage\)\)/);
 assert.ok(driver.indexOf('await context.close()')<driver.indexOf('await Promise.allSettled(diagnosticReads)'));
 assert.doesNotMatch(driver,/route\.fulfill|route\.continue|force:\s*true|setCustomUserClaims|recursiveDelete/);
});
