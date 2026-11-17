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
test('source-intake stages and assertion codes are closed and retain no private source identity',()=>{
 for(const stage of d.SOURCE_INTAKE_STAGES){const value=d.failureDetails({name:'AssertionError',code:'ERR_ASSERTION',message:'I66_INTAKE_UI_READBACK\n'+privateValue},stage);assert.equal(value.failureStage,stage);assert.equal(value.failureCheck,'I66_INTAKE_UI_READBACK');noPrivate(value);}
 const value=d.safeSourceIntakeEvidence({status:'PASS',stage:'SOURCE_INTAKE_COMPLETE',syntheticOnly:true,financialWrites:0,sourceRows:1,proposals:1,holds:0,normalUiRequest:true,
  sourceFileHashVerified:true,sourceMetadataDigestVerified:true,readbackAfterReload:true,signedActorPreserved:true,normalUiIdempotentReplay:true,replayIntakeWrites:0,consoleErrors:0,pageErrors:0,httpErrors:0,
  sourceId:privateValue,sourceRunId:privateValue,actorUid:privateValue,policyNumber:privateValue,documentRef:privateValue,amount:1234.56,filename:privateValue});
 assert.equal(value.stage,'SOURCE_INTAKE_COMPLETE');assert.equal(value.financialWrites,0);assert.equal(value.sourceRows,1);assert.equal(value.normalUiRequest,true);assert.equal(value.consoleErrors,0);noPrivate(value);assert.equal(JSON.stringify(value).includes('1234.56'),false);
 const malformed=d.safeSourceIntakeEvidence({status:privateValue,stage:privateValue,sourceRows:900000,financialWrites:privateValue,normalUiRequest:privateValue,consoleErrors:-1});assert.equal(malformed.status,'HOLD');assert.equal(malformed.stage,'UNKNOWN_STAGE');assert.equal(malformed.sourceRows,null);assert.equal(malformed.normalUiRequest,null);assert.equal(malformed.consoleErrors,null);noPrivate(malformed);
});
test('failure report preserves safe source-intake diagnostics without granting old proposal checks',()=>{
 const report=d.safeProposalDiagnosticReport({status:'HOLD',phase:'PREVIEW',failureStage:'SOURCE_INTAKE_UI_SUBMIT',failureClass:'ASSERTION',failureCheck:'I66_INTAKE_UI_HTTP',failureCode:'ERR_ASSERTION',sourceIntake:{status:'HOLD',stage:'SOURCE_INTAKE_UI_SUBMIT',financialWrites:null,sourceId:privateValue,httpErrors:1},raw:privateValue});
 assert.equal(report.failureStage,'SOURCE_INTAKE_UI_SUBMIT');assert.equal(report.failureCheck,'I66_INTAKE_UI_HTTP');assert.equal(report.sourceIntake.status,'HOLD');assert.equal(report.sourceIntake.financialWrites,null);assert.equal(report.sourceIntake.httpErrors,1);noPrivate(report);
 assert.ok(driver.includes("enter('SOURCE_INTAKE_PREPARE')"));assert.ok(driver.includes('safeSourceIntakeEvidence(report.sourceIntake)'));assert.ok(driver.includes('additionalTargetOwners.get(ref.path)||runId'));
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
  if(name==='./tools/gravicentra-i6-6-documented-terms-signed-check.cjs')return require('./gravicentra-i6-6-documented-terms-signed-check.cjs');
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

const {EventEmitter}=require('node:events');
const uiFacts=()=>Object.fromEntries(d.UI_CAUSAL_FIELDS.map(key=>[key,true]));
function uiFixture(){
 const expected={phase:'PREVIEW',origin:'https://ays-orbit-360-lab--gi-i66-rc-123-fixture.web.app',actorRole:'direccion',planDigest:'b'.repeat(64),
  proposalId:'qa_proposal_'+privateValue,sourceRunId:'cobledgerqa_'+privateValue,applicationId:'propapp_'+privateValue,
  policyId:'qa_policy_'+privateValue,receiptId:'qa_receipt_'+privateValue,cobroId:'qa_cobro_'+privateValue,portfolioId:'qa_portfolio_'+privateValue,amount:173.23,currency:'GTQ'};
 expected.navigationUrl=expected.origin+'/#/conciliaciones';
 const page=new EventEmitter(),frame={url:()=>expected.navigationUrl};page.mainFrame=()=>frame;
 const requestBody={data:{tenantId:'alianzas-soluciones',activeRole:'Dirección',operation:'apply_proposal_application',payload:{proposalId:expected.proposalId,sourceRunId:expected.sourceRunId,planDigest:expected.planDigest}}};
 const request={url:()=> 'https://us-central1-ays-orbit-360-lab.cloudfunctions.net/orbit360CobrosReconciliationCommandPreview',method:()=> 'POST',frame:()=>frame,postDataJSON:()=>requestBody};
 const result={ok:true,readbackConfirmed:true,serverOwned:true,operation:'apply_proposal_application',status:'APPLIED_WITH_MANUAL_APPROVAL',approvalMode:'MANUAL_AUTHORIZED',
  applicationId:expected.applicationId,sourceRunId:expected.sourceRunId,proposalId:expected.proposalId,policyId:expected.policyId,
  results:[{receiptId:expected.receiptId,cobroId:expected.cobroId,portfolioId:expected.portfolioId,amount:expected.amount,currency:expected.currency,paymentState:'PAID_DIRECT',applicationState:'PENDING_APPLICATION'}]};
 const response={request:()=>request,status:()=>200,json:async()=>({result})};
 return{expected,page,frame,requestBody,request,result,response};
}
async function captureUi(change=()=>{},events){
 const x=uiFixture();change(x);const observer=d.observeUiApplication(x.page,x.expected);
 if(events)await events(x,observer);else{x.page.emit('request',x.request);x.page.emit('response',x.response);x.page.emit('requestfinished',x.request);x.page.emit('framenavigated',x.frame);}
 return{x,observer,observation:await observer.seal()};
}
const unavailable=()=>new Error('response.body: Protocol error (Network.getResponseBody): No resource with given identifier found');
test('passive UI response proves exact command and preserves privacy without replacing UI action',async()=>{
 const {observation,x}=await captureUi();const evidence=d.validateUiApplicationEvidence(observation,uiFacts());
 assert.equal(evidence.mode,'UI_RESPONSE_CAPTURED_EXACT');assert.equal(evidence.status,'PASS');assert.equal(evidence.observation.observerFailed,false);
 assert.equal(evidence.observation.responseConfirmed,true);assert.equal(evidence.observation.sealed,true);noPrivate(evidence);
 for(const event of ['request','response','requestfinished','requestfailed','framenavigated'])assert.equal(x.page.listenerCount(event),0);
});
test('body unavailable across UI reload is observer failure only, with exact causal proof',async()=>{
 const {observation}=await captureUi(x=>x.response.json=async()=>{throw unavailable();});
 const evidence=d.validateUiApplicationEvidence(observation,uiFacts());assert.equal(evidence.mode,'UI_REQUEST_RELOAD_DURABLE_READBACK_EXACT');
 assert.equal(observation.bodyReadState,'UNAVAILABLE');assert.equal(observation.observerFailureClass,'BROWSER_RESPONSE_BODY_UNAVAILABLE');
 assert.equal(observation.responseConfirmed,null);noPrivate(evidence);
 const diagnostic=d.projectUiObservationFailure(unavailable(),'apply_proposal_application','UI_APPLICATION_CONFIRM',privateValue);
 assert.equal(diagnostic.observerFailed,true);assert.equal(diagnostic.driverFailed,false);assert.equal(diagnostic.denied,false);noPrivate(diagnostic);
});
test('subsequent signed DRIVER replay never enters UI request or response evidence',async()=>{
 const {observation}=await captureUi(()=>{},async x=>{
  x.page.emit('request',x.request);x.page.emit('response',x.response);x.page.emit('requestfinished',x.request);x.page.emit('framenavigated',x.frame);
  const replay={...x.request};x.page.emit('request',replay);x.page.emit('response',{...x.response,request:()=>replay,json:async()=>({result:{...x.result,reused:true}})});x.page.emit('requestfinished',replay);
 });assert.equal(observation.requestCount,1);assert.equal(observation.responseCount,1);assert.equal(d.validateUiApplicationEvidence(observation,uiFacts()).status,'PASS');
});
test('unrelated subframe navigation cannot supply reload causality',async()=>{
 const {observation}=await captureUi(()=>{},async x=>{x.page.emit('request',x.request);x.page.emit('response',x.response);x.page.emit('requestfinished',x.request);x.page.emit('framenavigated',{url:()=>x.expected.navigationUrl});});
 assert.equal(observation.mainFrameNavigationCount,0);assert.throws(()=>d.validateUiApplicationEvidence(observation,uiFacts()),/I66_PROPOSAL_UI_RELOAD_NOT_CONFIRMED/);
});
for(const [name,change]of [
 ['plan drift',x=>x.requestBody.data.payload.planDigest='c'.repeat(64)],
 ['other role',x=>x.requestBody.data.activeRole='Asesor'],
 ['money override',x=>x.requestBody.data.payload.amount=173.23],
 ['GET method',x=>x.request.method=()=> 'GET'],
 ['subframe request',x=>x.request.frame=()=>({})],
 ['other tenant',x=>x.requestBody.data.tenantId='other'],
 ['other proposal',x=>x.requestBody.data.payload.proposalId='other'],
 ['other ledger run',x=>x.requestBody.data.payload.sourceRunId='other'],
 ['query URL',x=>x.request.url=()=> 'https://us-central1-ays-orbit-360-lab.cloudfunctions.net/orbit360CobrosReconciliationCommandPreview?secret='+privateValue],
 ['redirected endpoint',x=>x.request.url=()=> 'https://example.invalid/orbit360CobrosReconciliationCommandPreview'],
 ['LIVE endpoint during Preview',x=>x.request.url=()=> 'https://us-central1-ays-orbit-360-lab.cloudfunctions.net/orbit360CobrosReconciliationCommand']
])test('UI observation rejects '+name,async()=>{const {observation}=await captureUi(change);assert.throws(()=>d.validateUiApplicationEvidence(observation,uiFacts()));noPrivate(observation);});
for(const [name,events]of [
 ['no request',x=>{x.page.emit('response',x.response);x.page.emit('requestfinished',x.request);x.page.emit('framenavigated',x.frame);} ],
 ['two UI requests',x=>{x.page.emit('request',x.request);x.page.emit('request',{...x.request});x.page.emit('response',x.response);x.page.emit('requestfinished',x.request);x.page.emit('framenavigated',x.frame);} ],
 ['no response',x=>{x.page.emit('request',x.request);x.page.emit('requestfinished',x.request);x.page.emit('framenavigated',x.frame);} ],
 ['two responses',x=>{x.page.emit('request',x.request);x.page.emit('response',x.response);x.page.emit('response',x.response);x.page.emit('requestfinished',x.request);x.page.emit('framenavigated',x.frame);} ],
 ['no request finish',x=>{x.page.emit('request',x.request);x.page.emit('response',x.response);x.page.emit('framenavigated',x.frame);} ],
 ['failed request',x=>{x.page.emit('request',x.request);x.page.emit('response',x.response);x.page.emit('requestfinished',x.request);x.page.emit('requestfailed',x.request);x.page.emit('framenavigated',x.frame);} ],
 ['no main reload',x=>{x.page.emit('request',x.request);x.page.emit('response',x.response);x.page.emit('requestfinished',x.request);} ],
 ['two main reloads',x=>{x.page.emit('request',x.request);x.page.emit('response',x.response);x.page.emit('requestfinished',x.request);x.page.emit('framenavigated',x.frame);x.page.emit('framenavigated',x.frame);} ],
 ['response after reload',x=>{x.page.emit('request',x.request);x.page.emit('framenavigated',x.frame);x.page.emit('response',x.response);x.page.emit('requestfinished',x.request);} ],
 ['different main URL',x=>{x.page.emit('request',x.request);x.page.emit('response',x.response);x.page.emit('requestfinished',x.request);x.frame.url=()=> 'https://example.invalid/';x.page.emit('framenavigated',x.frame);} ]
])test('UI observation rejects '+name,async()=>{const {observation}=await captureUi(()=>{},events);assert.throws(()=>d.validateUiApplicationEvidence(observation,uiFacts()));});
for(const status of [201,204,302,400,403,500])test('UI observation rejects HTTP '+status,async()=>{
 const {observation}=await captureUi(x=>x.response.status=()=>status);assert.throws(()=>d.validateUiApplicationEvidence(observation,uiFacts()),/I66_PROPOSAL_UI_RESPONSE_NOT_CONFIRMED/);
});
for(const key of d.UI_CAUSAL_FIELDS)test('response and unavailable-body paths both require causal evidence '+key,async()=>{
 for(const change of [()=>{},x=>x.response.json=async()=>{throw unavailable();}]){const {observation}=await captureUi(change);for(const value of [false,null,undefined,'true',privateValue]){const facts={...uiFacts(),[key]:value};assert.throws(()=>d.validateUiApplicationEvidence(observation,facts),/I66_PROPOSAL_UI_CAUSAL_EVIDENCE_INCOMPLETE/);}}
});
for(const [name,change]of [
 ['command error',x=>x.response.json=async()=>({error:{status:'PERMISSION_DENIED',message:privateValue}})],
 ['missing result',x=>x.response.json=async()=>({})],['not ok',x=>x.result.ok=false],['no readback',x=>x.result.readbackConfirmed=false],
 ['reused response',x=>x.result.reused=true],['not server owned',x=>x.result.serverOwned=false],['wrong operation',x=>x.result.operation='apply_payment'],
 ['review required',x=>x.result.status='REVIEW_REQUIRED'],['nonmanual approval',x=>x.result.approvalMode='AUTO'],
 ['wrong application',x=>x.result.applicationId='other'],['wrong proposal',x=>x.result.proposalId='other'],['wrong source run',x=>x.result.sourceRunId='other'],
 ['wrong policy',x=>x.result.policyId='other'],['wrong receipt',x=>x.result.results[0].receiptId='other'],['wrong cobro',x=>x.result.results[0].cobroId='other'],
 ['wrong portfolio',x=>x.result.results[0].portfolioId='other'],['wrong amount',x=>x.result.results[0].amount=1],['wrong currency',x=>x.result.results[0].currency='USD'],
 ['wrong payment state',x=>x.result.results[0].paymentState='PAID_INFERRED'],['wrong application state',x=>x.result.results[0].applicationState='APPLIED_DIRECT'],
 ['two results',x=>x.result.results.push({...x.result.results[0]})]
])test('captured UI response rejects '+name+' without falling back to readback',async()=>{
 const {observation}=await captureUi(change);assert.equal(observation.bodyReadState,'CAPTURED');assert.throws(()=>d.validateUiApplicationEvidence(observation,uiFacts()),/I66_PROPOSAL_UI_RESPONSE_NOT_CONFIRMED/);noPrivate(observation);
});
for(const error of [new SyntaxError(privateValue),new Error(privateValue),Object.assign(new Error(privateValue),{name:'TimeoutError',code:'ETIMEDOUT'}),Object.assign(new TypeError(privateValue),{code:privateValue})])test('unclassified body failure is never a reload waiver: '+error.name,async()=>{
 const {observation}=await captureUi(x=>x.response.json=async()=>{throw error;});assert.equal(observation.bodyReadState,'FAILED');assert.throws(()=>d.validateUiApplicationEvidence(observation,uiFacts()),/I66_PROPOSAL_UI_BODY_OBSERVATION_UNCLASSIFIED/);noPrivate(observation);
});
test('pending body capture has a bounded HOLD and late response cannot change sealed evidence',async()=>{
 const x=uiFixture();let resolve;x.response.json=()=>new Promise(r=>{resolve=r;});const observer=d.observeUiApplication(x.page,x.expected);
 x.page.emit('request',x.request);x.page.emit('response',x.response);x.page.emit('requestfinished',x.request);x.page.emit('framenavigated',x.frame);
 const observation=await observer.seal(5);assert.equal(observation.observerFailureClass,'TIMEOUT');assert.throws(()=>d.validateUiApplicationEvidence(observation,uiFacts()));
 resolve({result:x.result});await new Promise(r=>setImmediate(r));assert.deepEqual(observer.snapshot(),observation);noPrivate(observation);
});
for(const [key,value]of [['phase','OTHER'],['actorRole','operativo'],['planDigest','b'.repeat(64)+'\n'],['navigationUrl','https://example.invalid/'],['amount',1],['currency','USD'],['applicationId','']])test('observer construction refuses invalid '+key,()=>{
 const x=uiFixture();x.expected[key]=value;assert.throws(()=>d.observeUiApplication(x.page,x.expected),/I66_PROPOSAL_UI_OBSERVER_SCOPE_INVALID/);assert.equal(x.page.eventNames().length,0);
});
test('UI confirmation projection keeps no IDs, amounts, messages, unbounded fields or invented PASS',async()=>{
 const {observation}=await captureUi();const value=d.safeUiApplicationEvidence({status:privateValue,mode:privateValue,message:privateValue,observation:{...observation,httpStatus:privateValue,requestCount:999999,raw:privateValue,observerFailureClass:privateValue,observerFailureCode:privateValue},causalEvidence:{...uiFacts(),private:privateValue}});
 assert.equal(value.status,'HOLD');assert.equal(value.mode,null);assert.equal(value.observation.httpStatus,null);assert.equal(value.observation.requestCount,null);assert.equal(value.observation.observerFailureClass,null);noPrivate(value);
 assert.doesNotThrow(()=>d.safeUiApplicationEvidence(null));assert.doesNotThrow(()=>d.safeUiApplicationObservation(null));
 for(const value of [undefined,null,{},[],privateValue])assert.throws(()=>d.validateUiApplicationEvidence(value,uiFacts()));
});
test('new signed driver seals passive observation and explicit causal facts before functional PASS',()=>{
 assert.match(driver,/uiApplicationObserver=observeUiApplication\(direction/);assert.match(driver,/predicate:frame=>frame===direction\.mainFrame\(\)/);
 assert.match(driver,/report\.uiApplicationConfirmation=validateUiApplicationEvidence\(observation,uiCausalEvidence\)/);
 for(const key of d.UI_CAUSAL_FIELDS)assert.match(driver,new RegExp('uiCausalEvidence\\.'+key+'=true'));
 assert.match(driver,/application\.actor\?\.uid===actors\[0\]\.uid/);assert.match(driver,/sourceProposalDigest:stageProposal\.payloadDigest,sourceEvidenceDigest:stageEvidence\.payloadDigest/);
 assert.match(driver,/application\.beforeAfter\.map/);assert.match(driver,/UI_APPLICATION_RESPONSE_OR_CAUSAL_RELOAD_READBACK_EXACT/);
 assert.doesNotMatch(driver,/projectCallableResult\(\{driverFailed:true[^\n]+,'UI'\)/);assert.doesNotMatch(driver,/page\.route\(|direction\.route\(|setExtraHTTPHeaders|route\.fulfill|route\.continue|force:\s*true/);
});
test('contradictory observer classes and unknown codes never qualify as successful capture or known reload loss',async()=>{
 const {observation}=await captureUi();
 for(const patch of [{observerFailureClass:'TIMEOUT'},{observerFailureCode:'UNKNOWN_CODE'},{observerFailed:true},{sealed:false}])assert.throws(()=>d.validateUiApplicationEvidence({...observation,...patch},uiFacts()));
 const missing=await captureUi(x=>x.response.json=async()=>{throw unavailable();});
 for(const patch of [{observerFailureCode:'UNKNOWN_CODE'},{observerFailureCode:'ERR_ASSERTION'},{responseConfirmed:true},{observerFailed:false}])assert.throws(()=>d.validateUiApplicationEvidence({...missing.observation,...patch},uiFacts()));
});
async function actualAuditReadback(change=()=>{}){
 const ids={proposal:'qa_proposal',receipt:'qa_receipt',portfolio:'qa_portfolio',policy:'qa_policy'};
 const receipt={id:ids.receipt,moneda:'GTQ',monto:173.23},portfolio={id:ids.portfolio,reciboId:ids.receipt,carteraActiva:true};
 const seed={ids,receipt,portfolio,applicationId:'propapp_qa',resolutionId:'propres_qa',cobroId:'cob_qa',runId:'cobledgerqa_qa',TENANT:'alianzas-soluciones',
  ready:{result:{planDigest:'b'.repeat(64)}},stageProposal:{payloadDigest:'c'.repeat(64)},stageEvidence:{payloadDigest:'d'.repeat(64)},actors:[{uid:'qa_actor',role:'direccion'}]};
 seed.rows={application:{id:seed.applicationId,tenantId:seed.TENANT,proposalId:ids.proposal,sourceRunId:seed.runId,planDigest:seed.ready.result.planDigest,resolutionId:seed.resolutionId,
  sourceProposalDigest:seed.stageProposal.payloadDigest,sourceEvidenceDigest:seed.stageEvidence.payloadDigest,actor:{uid:'qa_actor',activeRole:'Dirección'},
  __syntheticQa:true,qaRunId:seed.runId,status:'APPLIED',beforeAfter:[{collection:'recibosEsperados',id:ids.receipt,before:receipt},{collection:'cobros',id:seed.cobroId,before:null},{collection:'carteraPrimas',id:ids.portfolio,before:portfolio}]},
  paid:{paymentState:'PAID_DIRECT',cobroId:seed.cobroId},cobro:{monto:173.23,moneda:'GTQ',applicationState:'PENDING_APPLICATION',reciboId:ids.receipt,polizaId:ids.policy},
  closed:{carteraActiva:false,cobroId:seed.cobroId,reciboId:ids.receipt}};
 change(seed);
 const begin=driver.indexOf("  enter('APPLICATION_READBACK');"),end=driver.indexOf("  enter('IDEMPOTENT_REPLAY');",begin);assert.ok(begin>0&&end>begin);
 const code='(async()=>{const seed=JSON.parse('+JSON.stringify(JSON.stringify(seed))+');const {ids,receipt,portfolio,applicationId,resolutionId,cobroId,runId,TENANT,ready,stageProposal,stageEvidence,actors}=seed;'+
  'const uiCausalEvidence={},enter=()=>{},checked=()=>{},applicationRef="application",item=(collection)=>({recibosEsperados:"paid",cobros:"cobro",carteraPrimas:"closed"})[collection],snapshot=async ref=>seed.rows[ref],owned=(row,id)=>row?.__syntheticQa===true&&row.qaRunId===id,norm=v=>String(v).normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase();'+
  driver.slice(begin,end)+'return uiCausalEvidence;})()';
 return vm.runInNewContext(code,{assert});
}
test('actual signed driver audit block credits only exact actor/source/targets and durable financial readback',async()=>{
 const value=await actualAuditReadback();assert.equal(value.applicationAuditExact,true);assert.equal(value.atomicTargetsReadback,true);
});
for(const [name,change]of [
 ['actor',x=>x.rows.application.actor.uid='other'],['role',x=>x.rows.application.actor.activeRole='Operativo'],
 ['application ID',x=>x.rows.application.id='other'],['source run',x=>x.rows.application.sourceRunId='other'],['plan',x=>x.rows.application.planDigest='e'.repeat(64)],
 ['proposal source',x=>x.rows.application.sourceProposalDigest='e'.repeat(64)],['evidence source',x=>x.rows.application.sourceEvidenceDigest='e'.repeat(64)],
 ['tenant',x=>x.rows.application.tenantId='other'],['audit target',x=>x.rows.application.beforeAfter[0].id='other'],
 ['preexisting cobro',x=>x.rows.application.beforeAfter[1].before={monto:173.23}],['not paid',x=>x.rows.paid.paymentState='PENDING'],
 ['wrong currency',x=>x.rows.cobro.moneda='USD'],['wrong amount',x=>x.rows.cobro.monto=173.24],['wrong receipt',x=>x.rows.cobro.reciboId='other'],
 ['wrong policy',x=>x.rows.cobro.polizaId='other'],['active portfolio',x=>x.rows.closed.carteraActiva=true],['unlinked portfolio',x=>x.rows.closed.cobroId='other']
])test('actual application readback rejects '+name,async()=>assert.rejects(actualAuditReadback(change)));
