'use strict';
// Execute the EXISTING workflow's diagnostic heredoc against synthetic files.
// No workflow invocation, network, browser, Auth, business data or acceptance.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const advisor=require('./gravicentra-i6-6-advisor-payables-signed-uat.cjs');
const proposal=require('./gravicentra-i6-6-proposal-uat-diagnostics.cjs');
const workflow=path.join(__dirname,'../.github/workflows/gravicentra-i66-privileged-role-three-function-preview-uat.yml');
const yaml=fs.readFileSync(workflow,'utf8');
const section=yaml.split('- name: Preserve sanitized failure diagnostics without an acceptance proof')[1].split('- name: Upload diagnostics only')[0];
const code=section.split("node - <<'NODE'\n")[1].split('\n          NODE')[0].split('\n').map(line=>line.replace(/^          /,'')).join('\n');
const clone=value=>JSON.parse(JSON.stringify(value)),secret='PRIVATE_CUSTOMER_EMAIL_TOKEN_DO_NOT_EXPORT';
const names={advisor:'/tmp/i66-retention/gravicentra-i66-advisor-payables-signed-uat-preview.json',
  proposal:'/tmp/i66-package/evidence/i66-proposal-application-signed-uat-preview.json'};
function execute({advisor:advisorReport,proposal:proposalReport,raw={},readErrors=[],env={}}={}){
  const files=new Map();
  if(advisorReport!==undefined)files.set(names.advisor,JSON.stringify(advisorReport));
  if(proposalReport!==undefined)files.set(names.proposal,JSON.stringify(proposalReport));
  for(const [key,value] of Object.entries(raw))files.set(names[key],value);
  let written;const writes=[];
  const fakeFs={existsSync:name=>files.has(name),readFileSync:name=>{if(readErrors.includes(name))throw Error(secret);return files.get(name);},
    writeFileSync:(name,value)=>{writes.push(name);written=JSON.parse(value);}};
  vm.runInNewContext(code,{require:name=>{
    if(name==='node:fs')return fakeFs;if(name==='node:path')return path;
    if(name==='./tools/gravicentra-i6-6-advisor-payables-signed-uat.cjs')return advisor;
    if(name==='./tools/gravicentra-i6-6-proposal-uat-diagnostics.cjs')return proposal;
    throw Error('UNEXPECTED_DIAGNOSTIC_DEPENDENCY');
  },process:{env:{RUNNER_TEMP:'/tmp/i66-retention',I66_PACKAGE_ROOT:'/tmp/i66-package',GITHUB_RUN_ID:'44027761291',SOURCE_SHA:'a'.repeat(40),...env}}});
  assert.deepEqual(writes,['/tmp/i66-retention/i66-preview-failure-diagnostic.json']);return written;
}
const counts={expectedDenials:8,verifiedExpectedDenials:8,observedConsoleErrors:10,capturedConsoleErrors:10,
  expectedNetworkConsoleErrors:8,unexpectedConsoleErrors:2,pageErrorCount:0,unexpectedHttpErrors:2,telemetryFailures:0};
function fixture(){
  const http={eventType:'HTTP_ERROR',actorRole:'direccion',stage:'FINANCE_UI_HYDRATION',requestKey:'b'.repeat(64),
    status:403,resourceType:'Fetch',endpointClass:'FUNCTIONS',pathSha256:'c'.repeat(64),classification:'UNEXPECTED'};
  const native={eventType:'NATIVE_CONSOLE_ERROR',actorRole:'direccion',stage:'FINANCE_UI_HYDRATION',requestKey:'b'.repeat(64),
    source:'network',endpointClass:'FUNCTIONS',pathSha256:'c'.repeat(64),line:0,classification:'UNEXPECTED'};
  return {status:'HOLD',phase:'PREVIEW',sourceSha:'a'.repeat(40),failureStage:'FINANCE_UI_HYDRATION',
    failureCheck:'ADVISOR_UAT_BROWSER_OBSERVABILITY_HOLD',failureClass:'ASSERTION_OR_RUNTIME_FAILURE',
    failureLocation:{file:'gravicentra-i6-6-advisor-payables-signed-uat.cjs',line:1104,column:90},
    checks:Array.from({length:15},(_,i)=>({name:'SYNTHETIC_CHECK_'+i,status:'PASS'})),cleanup:{status:'PASS',remaining:0},
    browserObservability:{schemaVersion:'gravicentra-i66-browser-observability-v1',status:'HOLD',totals:{...counts},actors:[
      {actorRole:'direccion',status:'HOLD',...counts,events:[http,native],denials:[{denialId:'ADVISOR_CONFLICT',actorRole:'direccion',stage:'REPLAY_AND_SOURCE_GUARDS',
        expectedHttpStatus:400,expectedFunctionsCode:'functions/failed-precondition',expectedReason:'ADVISOR_POLICY_CONFLICT',registered:true,
        requestKey:'d'.repeat(64),httpVerified:true,sdkVerified:true,status:'PASS'}]},
      {actorRole:'operativo',status:'PASS',...counts,events:[],denials:[]}
    ]}};
}
test('actual workflow preserves correlated HOLD evidence and exact counters without declaring acceptance',()=>{
  const input=fixture(),out=execute({advisor:input}),r=out.reports[0],obs=r.browserObservability;
  assert.equal(out.status,'FAILED_NOT_ACCEPTED');assert.equal(out.runId,44027761291);assert.equal(out.sourceSha,'a'.repeat(40));
  assert.equal(r.status,'HOLD');assert.equal(r.owner,'ADVISOR');assert.equal(r.checks,15);assert.equal(r.cleanupStatus,'PASS');assert.equal(r.remaining,0);
  assert.equal(obs.diagnosticOnly,true);assert.equal(obs.status,'HOLD');assert.deepEqual(obs.totals,counts);
  assert.deepEqual(obs.actors[0].events,input.browserObservability.actors[0].events);
  assert.deepEqual(obs.actors[0].denials,input.browserObservability.actors[0].denials);
  assert.equal(obs.actors[0].events[0].requestKey,obs.actors[0].events[1].requestKey);
  assert.equal(obs.actors[0].events[0].pathSha256,obs.actors[0].events[1].pathSha256);
  assert.deepEqual(out.reportAvailability,[{owner:'ADVISOR',status:'REPORT_CAPTURED'},{owner:'PROPOSAL',status:'REPORT_NOT_FOUND'}]);
  assert.throws(()=>advisor.validateBrowserObservability(obs),'a diagnostic projection is never an acceptance receipt');
});
test('safe telemetry, page, cancellation and application events survive even though the PASS validator rejects them',()=>{
  const input=fixture(),actor=input.browserObservability.actors[0];
  const events=[
    {eventType:'TELEMETRY_FAILURE',actorRole:'direccion',stage:'SYNTHETIC_RESTORE',code:'BROWSER_CLOSE_FAILED'},
    {eventType:'PAGE_ERROR',actorRole:'direccion',stage:'FINANCE_UI_HYDRATION'},
    {eventType:'NETWORK_CANCELLED',actorRole:'direccion',stage:'SYNTHETIC_RESTORE',requestKey:'e'.repeat(64),endpointClass:'GOOGLE_API',resourceType:'Fetch'},
    {eventType:'APPLICATION_CONSOLE_ERROR',actorRole:'direccion',stage:'FINANCE_UI_HYDRATION',source:'javascript',
      endpointClass:'FIRST_PARTY_SCRIPT',pathSha256:'f'.repeat(64),line:41,column:9,argumentTypes:['string','object']}
  ];actor.events=events;assert.deepEqual(execute({advisor:input}).reports[0].browserObservability.actors[0].events,events);
});
test('no raw messages, URLs, headers, payloads, arguments or identity escape the projection at any level',()=>{
  const input=fixture(),obs=input.browserObservability,actor=obs.actors[0];
  input.rawError=secret;input.actorUid=secret;obs.identity=secret;obs.totals.token=secret;actor.email=secret;
  for(const row of [...actor.events,...actor.denials])Object.assign(row,{url:'https://example.invalid/'+secret+'?token='+secret,
    text:secret,message:secret,headers:{Authorization:secret},postData:secret,networkRequestId:secret,args:[{value:secret}],actorUid:secret});
  const out=execute({advisor:input}),serialized=JSON.stringify(out);
  assert.doesNotMatch(serialized,new RegExp(secret));assert.doesNotMatch(serialized,/https:|Authorization|networkRequestId|postData|actorUid|"headers"|"args"/);
  assert.equal(out.reports[0].browserObservability.actors[0].events.length,2);
});
for(const field of ['eventType','actorRole','stage','resourceType','endpointClass','classification','source','code','denialId'])
  test('event enum cannot leak arbitrary '+field,()=>{
    const input=fixture();input.browserObservability.actors[0].events[0][field]=secret;
    assert.doesNotMatch(JSON.stringify(execute({advisor:input})),new RegExp(secret));
  });
for(const field of ['expectedFunctionsCode','expectedReason','status','actorRole','stage','denialId'])
  test('denial enum cannot leak arbitrary '+field,()=>{
    const input=fixture();input.browserObservability.actors[0].denials[0][field]=secret;
    assert.doesNotMatch(JSON.stringify(execute({advisor:input})),new RegExp(secret));
  });
for(const value of [secret,'b'.repeat(64)+'\n','b'.repeat(63),'B'.repeat(64),null,{},123])
  test('only exact SHA256 evidence survives hash projection: '+JSON.stringify(value).slice(0,30),()=>{
    const input=fixture();input.browserObservability.actors[0].events[0].requestKey=value;
    input.browserObservability.actors[0].events[0].pathSha256=value;
    input.browserObservability.actors[0].denials[0].requestKey=value;
    const out=execute({advisor:input}).reports[0].browserObservability.actors[0];
    assert.equal(out.events[0].requestKey,null);assert.equal(out.events[0].pathSha256,null);assert.equal(out.denials[0].requestKey,null);
  });
for(const value of [-1,1.5,1000001,'0',secret,null,{}])test('invalid counters remain unknown, never become zero: '+JSON.stringify(value),()=>{
  const input=fixture();input.browserObservability.totals.unexpectedConsoleErrors=value;input.browserObservability.actors[0].unexpectedHttpErrors=value;
  const obs=execute({advisor:input}).reports[0].browserObservability;
  assert.equal(obs.totals.unexpectedConsoleErrors,null);assert.equal(obs.actors[0].unexpectedHttpErrors,null);assert.equal(obs.status,'HOLD');
});
test('over-bound events, actors and denials explicitly report truncation and preserve error totals',()=>{
  const input=fixture(),obs=input.browserObservability,actor=obs.actors[0];
  actor.events=Array.from({length:504},()=>clone(actor.events[0]));actor.denials=Array.from({length:9},()=>clone(actor.denials[0]));obs.actors.push(clone(actor));
  const out=execute({advisor:input}).reports[0].browserObservability;
  assert.equal(out.actorsSeen,3);assert.equal(out.actors.length,2);assert.equal(out.actorsTruncated,true);
  assert.equal(out.actors[0].eventsSeen,504);assert.equal(out.actors[0].events.length,502);assert.equal(out.actors[0].eventsTruncated,true);
  assert.equal(out.actors[0].denialsSeen,9);assert.equal(out.actors[0].denials.length,8);assert.equal(out.actors[0].denialsTruncated,true);assert.deepEqual(out.totals,counts);
});
for(const value of [null,[],secret,42,{}])test('malformed browser ledger is retained as unknown diagnostic, not clean or absent: '+JSON.stringify(value),()=>{
  const input=fixture();input.browserObservability=value;const out=execute({advisor:input}).reports[0].browserObservability;
  assert.equal(out.status,'UNKNOWN');assert.equal(out.diagnosticOnly,true);assert.equal(out.totals.unexpectedConsoleErrors,null);assert.equal(out.actorsSeen,null);
});
test('historical report without browser telemetry stays usable and does not fabricate zero-error evidence',()=>{
  const input=fixture();delete input.browserObservability;const out=execute({advisor:input});
  assert.equal(out.reports[0].checks,15);assert.equal(out.reports[0].browserObservability,undefined);assert.equal(out.status,'FAILED_NOT_ACCEPTED');
});
for(const bad of ['not-json '+secret,'null','[]','42','"'+secret+'"','x'.repeat(4194305)])test('unreadable advisor report cannot erase a separate proposal report: '+bad.slice(0,20),()=>{
  const out=execute({raw:{advisor:bad},proposal:{status:'HOLD',phase:'PREVIEW',checks:[],cleanup:{status:'PASS',remaining:0}}});
  assert.deepEqual(out.reportAvailability,[{owner:'ADVISOR',status:'REPORT_UNREADABLE'},{owner:'PROPOSAL',status:'REPORT_CAPTURED'}]);
  assert.equal(out.reports.length,1);assert.equal(out.reports[0].owner,'PROPOSAL');assert.equal(out.status,'FAILED_NOT_ACCEPTED');assert.doesNotMatch(JSON.stringify(out),new RegExp(secret));
});
test('read failure and absent report paths are explicit without exposing filesystem or exception details',()=>{
  const out=execute({advisor:fixture(),readErrors:[names.advisor],env:{I66_PACKAGE_ROOT:''}});
  assert.deepEqual(out.reportAvailability,[{owner:'PROPOSAL',status:'REPORT_PATH_UNAVAILABLE'},{owner:'ADVISOR',status:'REPORT_UNREADABLE'}]);
  assert.deepEqual(out.reports,[]);assert.doesNotMatch(JSON.stringify(out),/\/tmp\/|PRIVATE/);
});
test('top-level diagnostics also reject arbitrary enum values and source identifiers',()=>{
  const input=fixture();for(const key of ['status','phase','failureStage','failureCheck','failureClass'])input[key]=secret;
  const out=execute({advisor:input,env:{SOURCE_SHA:secret,GITHUB_RUN_ID:secret}});
  assert.equal(out.runId,null);assert.equal(out.sourceSha,null);assert.equal(out.reports[0].failureStage,'UNKNOWN_STAGE');
  assert.doesNotMatch(JSON.stringify(out),new RegExp(secret));assert.equal(out.status,'FAILED_NOT_ACCEPTED');
});
test('proposal UI causal-observer diagnostics remain delegated unchanged to their existing sanitizer',()=>{
  const input={status:'HOLD',phase:'PREVIEW',failureStage:'UI_APPLY',failureCheck:'I66_PROPOSAL_UI_OBSERVATION_REQUIRED',
    checks:['synthetic'],realControlUnchanged:true,cleanup:{status:'PASS',remaining:0,removedOwnedTargets:14},
    uiApplicationConfirmation:{status:'HOLD',observation:{schema:'I66_PROPOSAL_UI_APPLICATION_OBSERVATION_V1',sealed:true,
      requestCount:1,responseCount:1,httpStatus:200,bodyReadState:'UNAVAILABLE',observerFailed:true,
      observerFailureClass:'BROWSER_RESPONSE_BODY_UNAVAILABLE',observerFailureCode:'NO_CODE',rawError:secret},causalEvidence:{uiBytesExact:true}},rawError:secret};
  const out=execute({proposal:input});assert.deepEqual(out.reports[0],proposal.safeProposalDiagnosticReport(input));
  assert.equal(out.status,'FAILED_NOT_ACCEPTED');assert.doesNotMatch(JSON.stringify(out),new RegExp(secret));
});
test('partial PASS data never causes failure artifact to grant acceptance or authorize LIVE',()=>{
  const input=fixture();input.status='PASS';input.browserObservability.status='PASS';
  const out=execute({advisor:input});assert.equal(out.status,'FAILED_NOT_ACCEPTED');assert.equal(out.reports[0].status,'PASS');
  assert.equal(out.reports[0].browserObservability.totals.unexpectedConsoleErrors,2);
  assert.doesNotMatch(code,/validateBrowserObservability\(|validateProof\(|candidateForPhase\(|deploy|acceptDirectionPreviewLegal\(/);
  assert.doesNotMatch(code,/fetch\(|execFile|\.delete\(|\.set\(|signIn|firebase-admin/);
  assert.match(section,/if: failure\(\)/);assert.match(yaml,/name: gi-i66-preview-failure-diagnostic-\$\{\{ github.run_id \}\}/);
  assert.match(yaml,/node --test tools\/gravicentra-i6-6-preview-failure-diagnostics-retention\.test\.cjs/);
});
test('the diagnostic workflow and its regression test are sealed source owners',()=>{
  const {PINNED_OWNER_PATHS}=require('./gravicentra-i6-6-operational-release-candidate.cjs');
  for(const owner of ['.github/workflows/gravicentra-i66-privileged-role-three-function-preview-uat.yml',
    'tools/gravicentra-i6-6-preview-failure-diagnostics-retention.test.cjs'])
    assert.equal(PINNED_OWNER_PATHS.filter(value=>value===owner).length,1);
});
