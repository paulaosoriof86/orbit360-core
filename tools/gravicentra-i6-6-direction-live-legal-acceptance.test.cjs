'use strict';
// Offline fixtures only: no authorization file, credential, browser session,
// storage seed, network request, deployment or business write is created.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const g=require('./gravicentra-i6-6-direction-preview-legal-acceptance.cjs');
const release=require('./gravicentra-i6-6-operational-release-candidate.cjs');
const root=path.resolve(__dirname,'..'),copy=value=>JSON.parse(JSON.stringify(value));
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const proposalBytes=fs.readFileSync(path.join(root,g.LIVE_SCOPE.proposalPath));
const previewBytes=fs.readFileSync(path.join(root,g.I66_SCOPE.receiptPath));
const ownerBytes=fs.readFileSync(path.join(root,'orbit360-platform/core/legal.js'));
const helperSource=fs.readFileSync(path.join(__dirname,'gravicentra-i6-6-direction-preview-legal-acceptance.cjs'),'utf8');
function seal(f,{refreshContext=false}={}){
  if(refreshContext)f.receipt.decision.reviewContextSha256=g.liveReviewContextDigest(f.receipt);
  f.receiptBytes=Buffer.from(JSON.stringify(f.receipt));f.receiptSha256=hash(f.receiptBytes);
  f.candidate.liveLegalAcceptance=g.liveScopeCandidatePin(f.candidate,f.receiptSha256,f.receipt);return f;
}
function fixture(){
  const sourceSha='a'.repeat(40),buildRunId=44009981499;
  const old={sourceSha:'8'.repeat(40),buildId:'gi-i66-'+'8'.repeat(12)+'-57f234755dc1',
    artifactId:101,artifactDigest:'sha256:'+'b'.repeat(64),previewRunId:102,liveCloneRunId:103,
    liveHostingVersion:'sites/ays-orbit-360-lab/versions/old-v1'};
  const candidate={schema:'I6_6_OPERATIONAL_EXACT_RELEASE_V1',approvedByDirection:true,
    status:'EXACT_PREVIEW_SIGNED_LIVE_AUTHORIZED',sourceSha,buildRunId,artifactId:202,
    artifactDigest:'sha256:'+'c'.repeat(64),buildId:'gi-i66-'+sourceSha.slice(0,12)+'-57f234755dc1',
    previewChannelId:'gi-i66-rc-'+buildRunId,
    previewUrl:'https://ays-orbit-360-lab--gi-i66-rc-'+buildRunId+'-d08psr2y.web.app',
    targets:copy(release.TARGETS),requiredPreviewDrivers:[...release.DRIVERS],sameImmutableArtifactOnly:true,
    syntheticRecordsOnly:true,noRealFinancialOrCustomerWrites:true,noRulesAuthIamWrites:true,
    rollbackThreeBackendRevisionsAndHosting:true,expectedSiteFileCount:223,
    syntheticQaIsolation:copy(release.PROPOSAL_QA_ISOLATION),advisorPayableQaIsolation:copy(release.ADVISOR_QA_ISOLATION),
    previewQa:{runId:301,headSha:'d'.repeat(40),receiptArtifactId:302,receiptArtifactDigest:'sha256:'+'e'.repeat(64),
      status:'SIGNED_DRIVERS_DURABLE_READBACK_RELOAD_RESTORE_PASS'},
    currentLive:{sourceSha:old.sourceSha,buildId:old.buildId,artifactId:old.artifactId,artifactDigest:old.artifactDigest,
      buildRunId:old.previewRunId,liveRunId:old.liveCloneRunId,hostingVersion:old.liveHostingVersion}};
  candidate.legalAcceptance=g.i66ScopeCandidatePin(candidate);
  const control={gate:'I6.6',historicalClosedGate:'B4-007',status:'OPERATIONAL_EXACT_LIVE_PROMOTION_AUTHORIZED',
    forbidBackendFunctionDeploy:false,forbidFirestoreRulesDataAuthWrites:true,backendFunctionPreviewOnly:false,
    forbidBackendLiveFunctionDeploy:false,livePromotionAuthorized:true,previewApproved:true,noHostingPromotion:false,
    currentExactHostingRelease:old,operationalReleaseCandidate:candidate};
  const actor={role:'Dirección',advisorId:g.ADVISOR,uid:'synthetic-direction-uid'};
  const receipt=copy(g.buildLiveReviewContext(candidate,{actorUidSha256:hash(actor.uid)}));
  receipt.schema=g.LIVE_SCOPE.schema;receipt.status='SYNTHETIC_IN_MEMORY_TEST_FIXTURE';
  Object.assign(receipt.decision,{status:'EXPLICIT_BOUNDED_SCOPE_AUTHORIZATION',
    response:'Autorizo el alcance LIVE propuesto',normalizedResponse:'AUTORIZO EL ALCANCE LIVE PROPUESTO',
    receivedLocalDate:'2026-11-17',timezone:'America/Guatemala'});
  return seal({candidate,control,actor,receipt,proposalBytes,
    cfg:{phase:'LIVE',origin:g.LIVE_SCOPE.origin,source:sourceSha,packageRoot:'/synthetic/exact-package'}});
}
function marker(f){return{product:'Gravicentra Insurance',gate:'I6.6',sourceSha:f.candidate.sourceSha,
  buildId:f.candidate.buildId,environmentRef:'same-project-preview'};}
function presentation(f){
  const user={uid:f.actor.uid,email:'direction@example.invalid',advisorId:g.ADVISOR,tenantId:g.TENANT};
  const orbit={auth:{user:()=>user},tenant:{get:()=>({paisDefault:'GT',nombre:'Alianzas & Soluciones'})}};
  vm.runInNewContext(ownerBytes.toString(),{window:{Orbit:orbit,location:{origin:f.cfg.origin}},Orbit:orbit,
    localStorage:{getItem:()=>null,setItem:()=>{throw Error('UNEXPECTED_TEST_STORAGE_WRITE');}}});
  return{origin:f.cfg.origin,actorUid:user.uid,advisorId:user.advisorId,role:'Dirección',tenantId:user.tenantId,
    email:user.email,scope:'user:'+user.email,gateCount:1,version:g.VERSION,type:'interno',country:'GT',
    clauseIds:[...g.CLAUSES],previousAcceptance:null,checked:false,checkboxDisabled:false,buttonDisabled:true,
    terms:copy(g.projectCatalog(orbit.legal.catalogo()))};
}
function accepted(f,scope,at){return{aceptado:true,version:g.VERSION,actorUid:f.actor.uid,scopeId:scope,
  origin:f.cfg.origin,pais:'GT',tipo:'interno',clausulas:[...g.CLAUSES],fecha:at,
  acceptanceMethod:'VISIBLE_CHECKBOX_AND_BUTTON',countrySelectionMethod:'CURRENT_COUNTRY',ip:null,ipSource:'NOT_COLLECTED'};}
function harness(options={}){
  const f=fixture();if(options.mutate)options.mutate(f);
  const shown=presentation(f),calls={fetch:[],git:[],files:[],check:0,click:0,reload:0,wait:0,records:0,presentations:0};
  const mod={exports:{}};let clickedAt,selected=false;
  const read=file=>{
    calls.files.push(file);
    if(file===g.CONTROL)return JSON.stringify(f.control);
    if(file===g.LIVE_SCOPE.authorizationPath){if(options.missingGrant)throw Error('MOCKED_ENOENT');return options.grantBytes||f.receiptBytes;}
    if(file===g.LIVE_SCOPE.proposalPath)return options.proposalBytes||proposalBytes;
    if(file===g.I66_SCOPE.receiptPath)return options.previewBytes||previewBytes;
    if(file.endsWith('/bundle/site/__recovery__/build.json'))return JSON.stringify(options.packageMarker||marker(f));
    if(file.endsWith('/bundle/site/core/legal.js'))return options.packageOwner||ownerBytes;
    throw Error('UNEXPECTED_OFFLINE_FILE_READ');
  };
  const git=(command,args)=>{
    assert.equal(command,'git');calls.git.push(args);
    if(args[0]==='merge-base'){
      assert.equal(args[1],'--is-ancestor');assert.equal(args[3],f.candidate.sourceSha);
      assert.ok([JSON.parse(proposalBytes).sourceBaseHead,f.receipt.sourceBaseHead].includes(args[2]));
      if(options.ancestorFails)throw Error('MOCKED_NON_DESCENDANT');return Buffer.from('');
    }
    assert.equal(args[0],'show');
    if(args[1]===f.candidate.sourceSha+':'+g.LIVE_SCOPE.proposalPath)return options.sourceProposalBytes||proposalBytes;
    if(args[1]===f.candidate.sourceSha+':'+g.I66_SCOPE.receiptPath)return options.sourcePreviewBytes||previewBytes;
    if(args[1]===f.candidate.sourceSha+':orbit360-platform/core/legal.js')return options.sourceOwner||ownerBytes;
    throw Error('UNEXPECTED_OFFLINE_GIT_READ');
  };
  const fetchMock=async url=>{
    calls.fetch.push(url);
    assert.ok([f.cfg.origin,f.candidate.previewUrl].some(origin=>url.startsWith(origin+'/')));
    if(url.endsWith('/__recovery__/build.json'))return{status:options.markerStatus||200,
      json:async()=>calls.reload&&options.reloadMarker?options.reloadMarker:options.hostedMarker||marker(f)};
    assert.ok(url.endsWith('/core/legal.js'));
    return{status:options.ownerStatus||200,arrayBuffer:async()=>options.hostedOwner||ownerBytes};
  };
  Function('module','exports','require','Buffer','fetch',helperSource)(mod,mod.exports,name=>
    name==='node:fs'?{readFileSync:read}:name==='node:child_process'?{execFileSync:git}:require(name),Buffer,fetchMock);
  const page={
    waitForSelector:async()=>{calls.wait++;},
    waitForFunction:async()=>{if(options.reloadWaitFails)throw Error('MOCKED_RELOAD_NOT_READY');},
    reload:async options=>{assert.deepEqual(options,{waitUntil:'commit',timeout:30000});calls.reload++;},
    evaluate:async(_fn,arg)=>{
      if(arg===undefined){calls.presentations++;return{...copy(shown),...(options.presentation||{}),
        ...(options.needsCountry&&!selected?{country:'',countrySelectionRequired:true,countrySelectionValue:'',
          countryOptions:['GT','CO'],checkboxDisabled:true,terms:[]}:selected?{country:'GT',countrySelectionRequired:true,
          countrySelectionValue:'GT',countryOptions:['GT','CO'],checkboxDisabled:false}:{})};}
      calls.records++;
      const record=options.immediateMissing?null:{...accepted(f,arg,clickedAt),...(options.record||{})};
      if(!calls.reload)return record;
      return{origin:f.cfg.origin,actorUid:f.actor.uid,advisorId:g.ADVISOR,role:'Dirección',tenantId:g.TENANT,
        signedActorUid:f.actor.uid,appStarted:true,legalSatisfied:true,email:shown.email,scope:arg,gateCount:0,
        ...(options.reloadSnapshot||{}),record:options.reloadMissing?null:{...record,...(options.reloadRecord||{})}};
    },
    locator:selector=>{assert.equal(selector,'[data-legal-gate]');return{locator:selector=>({
      selectOption:async value=>{assert.equal(selector,'#lg-country');assert.equal(value,'GT');selected=true;},
      check:async()=>{assert.equal(selector,'#lg-chk');calls.check++;},
      click:async()=>{assert.equal(selector,'#lg-ok');calls.click++;clickedAt=new Date().toISOString();}
    })};}
  };
  return{f,calls,run:()=>mod.exports.acceptDirectionLiveLegal({page,actor:f.actor,cfg:f.cfg}),
    authority:()=>mod.exports.assertDirectionLiveLegalAuthority({sourceSha:f.cfg.source}),
    preflight:()=>mod.exports.preflightDirectionLiveLegalPackage({packageRoot:f.cfg.packageRoot})};
}

test('source proposal remains proposed and the review context is not a grant',()=>{
  const p=JSON.parse(proposalBytes),f=fixture();
  assert.equal(hash(proposalBytes),g.LIVE_SCOPE.proposalSha256);assert.equal(p.status,'PROPOSED_NOT_AUTHORIZED');
  assert.equal(p.authorizationNotReceived,true);assert.equal(p.historicalPreviewAuthorization.live,false);
  assert.equal(hash(previewBytes),g.I66_SCOPE.receiptSha256);assert.equal(hash(ownerBytes),g.I66_SCOPE.legalOwnerSha256);
  const context=g.buildLiveReviewContext(f.candidate,{actorUidSha256:hash(f.actor.uid)});
  assert.equal(context.status,'PROPOSED_NOT_AUTHORIZED');assert.equal(context.decision.status,'AWAITING_EXPLICIT_OWNER_APPROVAL');
  assert.equal(context.decision.question,g.buildLiveReviewQuestion(f.candidate));
  assert.equal(context.decision.questionSha256,hash(context.decision.question));
  assert.equal(context.decision.reviewContextSha256,g.liveReviewContextDigest(context));
  f.receipt=context;seal(f);assert.throws(()=>g.validateLiveScopeDecision(f));
});
for(const response of ['Autorizo el alcance LIVE propuesto','autorizo',JSON.parse(proposalBytes).proposedConfirmationQuote])
  test('in-memory exact reviewed grant accepts only a supported explicit response: '+response.slice(0,40),()=>{
    const f=fixture();f.receipt.decision.response=response;f.receipt.decision.normalizedResponse=response.replace(/\s+/g,' ').trim().toUpperCase();seal(f);
    assert.equal(g.validateLiveScopeDecision(f),f.receipt);
    assert.deepEqual(Object.keys(f.receipt.approvedCandidate).sort(),['sourceSha','buildId','buildRunId','artifactId','artifactDigest','previewUrl','previewChannelId','previewQa'].sort());
  });
for(const [label,options] of [
  ['missing grant',{missingGrant:true}],['missing pin',{mutate:f=>delete f.candidate.liveLegalAcceptance}],
  ['proposal used as grant',{grantBytes:proposalBytes}],['Preview receipt used as grant',{grantBytes:previewBytes}],
  ['grant bytes changed',{grantBytes:Buffer.from('changed')}]
])test('HOLD before UI and pre-deploy readback for '+label,async()=>{
  for(const action of ['run','preflight']){
    const h=harness(options);let deployed=false;
    await assert.rejects(async()=>{await h[action]();deployed=true;});
    assert.equal(deployed,false);assert.equal(h.calls.fetch.length,0);assert.equal(h.calls.git.length,0);
    assert.equal(h.calls.wait,0);assert.equal(h.calls.check,0);assert.equal(h.calls.click,0);
    assert.ok(!h.calls.files.some(file=>file.includes('/bundle/site/')));
  }
});
const decisionMutations=[
  ['wrong schema',f=>f.receipt.schema='PREVIEW_AUTHORIZATION'],['wrong decision',f=>f.receipt.decisionId=g.I66_SCOPE.decisionId],
  ['pending decision',f=>f.receipt.decision.status='AWAITING_EXPLICIT_OWNER_APPROVAL'],
  ['general work instruction',f=>f.receipt.decision.response='arranca agilmente'],
  ['mismatched normalized quote',f=>f.receipt.decision.normalizedResponse='AUTORIZO OTRA COSA'],
  ['missing question',f=>delete f.receipt.decision.question],
  ['changed question even with fresh hash',f=>{f.receipt.decision.question='¿Autorizas todo?';f.receipt.decision.questionSha256=hash(f.receipt.decision.question);}],
  ['question digest',f=>f.receipt.decision.questionSha256='0'.repeat(64)],
  ['review digest',f=>f.receipt.decision.reviewDocumentSha256='0'.repeat(64)],
  ['review identity',f=>f.receipt.decision.reviewDocumentLibraryId='other-review'],
  ['review context',f=>f.receipt.decision.responseContext='GENERAL_WORK_AUTHORIZATION'],
  ['missing date',f=>delete f.receipt.decision.receivedLocalDate],['wrong timezone',f=>f.receipt.decision.timezone='UTC'],
  ['wrong advisor',f=>f.receipt.subject.advisorId='other'],['wrong role',f=>f.receipt.subject.role='operativo'],
  ['wrong tenant',f=>f.receipt.subject.tenantId='other'],['wrong country',f=>f.receipt.subject.country='CO'],
  ['wrong origin',f=>f.receipt.environment.origin=f.candidate.previewUrl],
  ['wrong phase',f=>f.receipt.environment.phase='PREVIEW'],['wrong gate',f=>f.receipt.environment.gate='I6.7'],
  ['wrong branch',f=>f.receipt.environment.branch='main'],['wrong project',f=>f.receipt.environment.firebaseProject='other'],
  ['wrong terms',f=>f.receipt.legal.termsProjectionSha256='0'.repeat(64)],
  ['wrong owner',f=>f.receipt.legal.legalOwnerSha256='0'.repeat(64)],['wrong version',f=>f.receipt.legal.version='2.1'],
  ['extra clause',f=>f.receipt.legal.clauseIds.push('socios')],
  ['Preview authority expanded',f=>f.receipt.historicalPreviewAuthorization.live=true],
  ['reload requirement removed',f=>f.receipt.executionAcceptance.requireImmediateAndReloadReadback=false],
  ['approved source',f=>f.receipt.approvedCandidate.sourceSha='9'.repeat(40)],
  ['approved build',f=>f.receipt.approvedCandidate.buildId+='0'],
  ['approved artifact',f=>f.receipt.approvedCandidate.artifactId++],
  ['approved artifact digest',f=>f.receipt.approvedCandidate.artifactDigest='sha256:'+'0'.repeat(64)],
  ['approved Preview URL',f=>f.receipt.approvedCandidate.previewUrl='https://other.example.invalid'],
  ['approved Preview channel',f=>f.receipt.approvedCandidate.previewChannelId+='0'],
  ['approved signed QA',f=>f.receipt.approvedCandidate.previewQa.receiptArtifactId++],
  ['extra candidate metadata',f=>f.receipt.approvedCandidate.extra=true]
];
for(const [label,mutate] of decisionMutations)test('bound LIVE authority rejects '+label,()=>{
  const f=fixture();mutate(f);seal(f,{refreshContext:true});assert.throws(()=>g.validateLiveScopeDecision(f));
});
for(const field of Object.keys(JSON.parse(proposalBytes).constraints))test('bound LIVE authority cannot change constraint '+field,()=>{
  const f=fixture();f.receipt.constraints[field]=!f.receipt.constraints[field];seal(f,{refreshContext:true});assert.throws(()=>g.validateLiveScopeDecision(f));
});
test('stale review context and receipt digest fail even for otherwise valid grants',()=>{
  const f=fixture();f.receipt.decision.reviewContextSha256='0'.repeat(64);seal(f);
  assert.throws(()=>g.validateLiveScopeDecision(f),/REVIEW_CONTEXT_MISMATCH/);
  const other=fixture();other.receiptSha256='0'.repeat(64);assert.throws(()=>g.validateLiveScopeDecision(other),/RECEIPT_MISMATCH/);
});
test('in-memory IO verifies grant, immutable proposal and unchanged Preview receipt',()=>{
  const f=fixture(),io={readFileSync:file=>file===g.LIVE_SCOPE.authorizationPath?f.receiptBytes:
    file===g.LIVE_SCOPE.proposalPath?proposalBytes:previewBytes};
  assert.deepEqual(g.readLiveScopeAuthorization(f.control,f.candidate,io).receipt,f.receipt);
});
for(const field of ['sourceSha','buildId','buildRunId','artifactId','artifactDigest','previewQa','origin','phase','actorUidSha256','receiptPath','proposalSha256','reviewDocumentSha256'])
  test('candidate pin rejects changed '+field,()=>{
    const f=fixture();f.candidate.liveLegalAcceptance[field]='unapproved';assert.throws(()=>g.validateLiveScopeDecision(f));
  });
test('preflight verifies source, package and served Preview before allowing a deploy',async()=>{
  const h=harness(),result=await h.preflight();assert.equal(result.receiptSha256,h.f.receiptSha256);
  assert.equal(h.calls.fetch.length,2);assert.ok(h.calls.fetch.every(url=>url.startsWith(h.f.candidate.previewUrl+'/')));
  assert.equal(h.calls.wait,0);assert.equal(h.calls.click,0);assert.equal(h.calls.git.filter(args=>args[0]==='merge-base').length,2);
});
test('normal LIVE UI produces only immediate and reload verified evidence for exact actor/source/build',async()=>{
  const h=harness(),proof=await h.run();assert.equal(g.validateLiveAcceptanceProof(proof,h.f.candidate),true);
  assert.equal(proof.phase,'LIVE');assert.equal(proof.origin,g.LIVE_SCOPE.origin);assert.equal(proof.liveAcceptance,true);
  assert.equal(h.calls.check,1);assert.equal(h.calls.click,1);assert.equal(h.calls.reload,1);assert.equal(h.calls.records,2);
  assert.equal(h.calls.fetch.length,3);assert.ok(h.calls.fetch.every(url=>url.startsWith(g.LIVE_SCOPE.origin+'/')));
});
const preUiFailures=[
  ['wrong caller phase',{mutate:f=>f.cfg.phase='PREVIEW'}],['wrong caller origin',{mutate:f=>f.cfg.origin=f.candidate.previewUrl}],
  ['wrong caller source',{mutate:f=>f.cfg.source='9'.repeat(40)}],['wrong signed actor',{mutate:f=>f.actor.uid='other-uid'}],
  ['wrong actor role',{mutate:f=>f.actor.role='Operativo'}],['wrong actor advisor',{mutate:f=>f.actor.advisorId='other'}],
  ['non-descendant',{ancestorFails:true}],['source proposal changed',{sourceProposalBytes:Buffer.from('changed')}],
  ['local Preview authority changed',{previewBytes:Buffer.from('changed')}],['source Preview authority changed',{sourcePreviewBytes:Buffer.from('changed')}],
  ['source legal owner changed',{sourceOwner:Buffer.from('changed')}],['package legal owner changed',{packageOwner:Buffer.from('changed')}],
  ['hosted legal owner changed',{hostedOwner:Buffer.from('changed')}],['missing hosted marker',{markerStatus:404}],
  ['package build changed',{packageMarker:{...marker(fixture()),sourceSha:'9'.repeat(40)}}],
  ['served build changed',{hostedMarker:{...marker(fixture()),sourceSha:'9'.repeat(40)}}],
  ['displayed terms changed',{presentation:{terms:[]}}],['displayed actor changed',{presentation:{actorUid:'other'}}]
];
for(const [label,options] of preUiFailures)test('LIVE helper stops before checkbox for '+label,async()=>{
  const h=harness(options);await assert.rejects(h.run());assert.equal(h.calls.check,0);assert.equal(h.calls.click,0);assert.equal(h.calls.reload,0);
});
for(const [label,options] of preUiFailures.filter(([label])=>/source |package |hosted |served |missing hosted|non-descendant|Preview authority/.test(label)))
  test('pre-deploy package verification refuses '+label,async()=>{const h=harness(options);await assert.rejects(h.preflight());assert.equal(h.calls.click,0);});
test('same-text technical successor retains original review and rebinds exact source/build/Preview',async()=>{
  const h=harness({mutate:f=>{
    const sourceSha='b'.repeat(40),buildRunId=f.candidate.buildRunId+1;
    Object.assign(f.candidate,{sourceSha,buildRunId,artifactId:f.candidate.artifactId+1,
      artifactDigest:'sha256:'+'f'.repeat(64),buildId:'gi-i66-'+sourceSha.slice(0,12)+'-57f234755dc1',
      previewChannelId:'gi-i66-rc-'+buildRunId,
      previewUrl:'https://ays-orbit-360-lab--gi-i66-rc-'+buildRunId+'-next1.web.app'});
    f.cfg.source=sourceSha;seal(f);
  }});
  assert.notEqual(h.f.receipt.sourceBaseHead,h.f.candidate.sourceSha);
  const proof=await h.run();assert.equal(g.validateLiveAcceptanceProof(proof,h.f.candidate),true);
  assert.equal(proof.authorizationSourceBaseHead,h.f.receipt.sourceBaseHead);
  assert.equal(proof.sourceSha,h.f.candidate.sourceSha);assert.equal(h.calls.reload,1);
});
test('only the normal GT selector resolves country before LIVE acceptance',async()=>{
  const h=harness({needsCountry:true});assert.equal(g.validateLiveAcceptanceProof(await h.run(),h.f.candidate),true);assert.equal(h.calls.presentations,2);
});
test('missing immediate acceptance cannot become a reload proof',async()=>{
  const h=harness({immediateMissing:true});await assert.rejects(h.run(),/NOT_PERSISTED/);assert.equal(h.calls.click,1);assert.equal(h.calls.reload,0);
});
for(const [label,options] of [
  ['auth not ready',{reloadWaitFails:true}],['acceptance missing',{reloadMissing:true}],['actor',{reloadSnapshot:{actorUid:'other'}}],
  ['signed actor',{reloadSnapshot:{signedActorUid:'other'}}],['role',{reloadSnapshot:{role:'Operativo'}}],
  ['tenant',{reloadSnapshot:{tenantId:'other'}}],['app not ready',{reloadSnapshot:{appStarted:false}}],
  ['gate unsatisfied',{reloadSnapshot:{legalSatisfied:false}}],['gate still visible',{reloadSnapshot:{gateCount:1}}],
  ['origin',{reloadSnapshot:{origin:g.ORIGIN}}],['scope',{reloadSnapshot:{scope:'user:other@example.invalid'}}],
  ['acceptance actor',{reloadRecord:{actorUid:'other'}}],['acceptance country',{reloadRecord:{pais:'CO'}}],
  ['acceptance origin',{reloadRecord:{origin:g.ORIGIN}}],['build marker',{reloadMarker:{...marker(fixture()),sourceSha:'9'.repeat(40)}}]
])test('LIVE readback refuses reload '+label+' drift',async()=>{
  const h=harness(options);await assert.rejects(h.run());assert.equal(h.calls.click,1);assert.equal(h.calls.reload,1);
});
test('execution proof cannot be replaced by authorization, Preview, or incomplete readback',async()=>{
  const h=harness(),proof=await h.run();assert.throws(()=>g.validateLiveAcceptanceProof(h.f.receipt,h.f.candidate));
  for(const field of ['status','phase','decisionId','authorizationScope','gate','sourceSha','buildId','authorizationSourceBaseHead',
    'origin','receiptSha256','advisorId','actorRole','tenantId','country','version','termsProjectionSha256','actorUidSha256',
    'immediateReadback','reloadReadback','reloadActorVerified','acceptedForOtherActors','liveAcceptance','storageSeeded','gateBypassed',
    'clauseIds','scopeSha256','acceptedAt']){
    const changed=copy(proof);delete changed[field];assert.throws(()=>g.validateLiveAcceptanceProof(changed,h.f.candidate),field);
  }
});
