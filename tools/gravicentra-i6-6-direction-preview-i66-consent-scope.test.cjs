'use strict';
// Offline authority and executable-helper tests. Browser, Git ancestry and HTTP
// are mocked; no real session, acceptance, storage, cloud or business write.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const g=require('./gravicentra-i6-6-direction-preview-legal-acceptance.cjs');
const release=require('./gravicentra-i6-6-operational-release-candidate.cjs');
const makeScope=require('./gravicentra-i66-make-release-scope.cjs');
const root=path.resolve(__dirname,'..'),copy=value=>JSON.parse(JSON.stringify(value));
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const receiptBytes=fs.readFileSync(path.join(root,g.I66_SCOPE.receiptPath));
const historicalBytes=fs.readFileSync(path.join(root,g.RECEIPT));
const ownerBytes=fs.readFileSync(path.join(root,'orbit360-platform/core/legal.js'));
const helperSource=fs.readFileSync(path.join(__dirname,'gravicentra-i6-6-direction-preview-legal-acceptance.cjs'),'utf8');
function fixture(){
  const sourceSha='a'.repeat(40),buildRunId=44009981499;
  const old={sourceSha:'8'.repeat(40),buildId:'gi-i66-'+ '8'.repeat(12)+'-57f234755dc1',
    artifactId:101,artifactDigest:'sha256:'+'b'.repeat(64),previewRunId:102,liveCloneRunId:103,
    liveHostingVersion:'sites/ays-orbit-360-lab/versions/old-v1'};
  const candidate={schema:'I6_6_OPERATIONAL_EXACT_RELEASE_V1',approvedByDirection:true,
    status:'EXACT_BACKEND_PREVIEW_SIGNED_QA_AUTHORIZED',sourceSha,buildRunId,artifactId:202,
    artifactDigest:'sha256:'+'c'.repeat(64),buildId:'gi-i66-'+sourceSha.slice(0,12)+'-57f234755dc1',
    previewChannelId:'gi-i66-rc-'+buildRunId,
    previewUrl:'https://ays-orbit-360-lab--gi-i66-rc-'+buildRunId+'-d08psr2y.web.app',
    targets:copy(release.TARGETS),requiredPreviewDrivers:[...release.DRIVERS],sameImmutableArtifactOnly:true,
    syntheticRecordsOnly:true,noRealFinancialOrCustomerWrites:true,noRulesAuthIamWrites:true,
    rollbackThreeBackendRevisionsAndHosting:true,expectedSiteFileCount:223,
    syntheticQaIsolation:copy(release.PROPOSAL_QA_ISOLATION),advisorPayableQaIsolation:copy(release.ADVISOR_QA_ISOLATION),
    currentLive:{sourceSha:old.sourceSha,buildId:old.buildId,artifactId:old.artifactId,artifactDigest:old.artifactDigest,
      buildRunId:old.previewRunId,liveRunId:old.liveCloneRunId,hostingVersion:old.liveHostingVersion}};
  candidate.legalAcceptance=g.i66ScopeCandidatePin(candidate);
  const control={gate:'I6.6',historicalClosedGate:'B4-007',status:'OPERATIONAL_BACKEND_PREVIEW_AUTHORIZED',
    forbidBackendFunctionDeploy:false,forbidFirestoreRulesDataAuthWrites:true,backendFunctionPreviewOnly:true,
    forbidBackendLiveFunctionDeploy:true,livePromotionAuthorized:false,previewApproved:false,noHostingPromotion:true,
    currentExactHostingRelease:old,operationalReleaseCandidate:candidate};
  return {receipt:JSON.parse(receiptBytes),receiptSha256:hash(receiptBytes),candidate,control,
    cfg:{phase:'PREVIEW',origin:candidate.previewUrl,source:sourceSha,packageRoot:'/synthetic/exact-package'},
    actor:{role:'Dirección',advisorId:g.ADVISOR,uid:'synthetic-direction-uid'}};
}
function scopedFixture(f,makeIngress){
  const p=f.candidate,physical=copy(f.control.currentExactHostingRelease);
  Object.assign(p,{opsLeadsComposite:true,compositeVersion:makeIngress?2:1,
    targets:copy(makeIngress?release.MAKE_TARGETS:release.COMPOSITE_TARGETS),expectedSiteFileCount:224,
    opsLeadsBackendPath:'functions/product-ops-leads-domain.js',
    opsLeadsBackendBlobSha:makeIngress?'b'.repeat(40):'b7921ca88343ced65bdad4cd9de26fa120647083',
    currentPhysicalLive:copy(physical),rollbackFourBackendRevisionsAndHosting:true});
  if(makeIngress)Object.assign(p,{makeIngressComposite:true,noRulesAuthIamWrites:false,
    noRulesAuthMembershipWrites:true,onlyExactSecretIamDeltaAllowed:true,rollbackFiveBackendRevisionsAndHosting:true,
    makeIngress:{schema:makeScope.SCOPE,scopeContractPath:makeScope.CONTRACT_PATH,scopeContractBlob:makeScope.CONTRACT_BLOB,
      sourceSha:p.sourceSha,communicationDecision:{path:makeScope.COMMUNICATION_DECISION_PATH,gitBlobSha:makeScope.COMMUNICATION_DECISION_BLOB},
      tenantId:'alianzas-soluciones',country:'GT',instanceId:'710522720868',scenarioId:10196136,firestoreConnectionId:14756714,
      assignment:'pending_operations',outboundEnabled:false,noBackfill:true,authContextEventType:makeScope.EVENT_TYPE,deployState:'CLOSED',
      realLeadActivationAfterCommittedOnly:true,rollbackNewFunctionAndExactSecretDelta:true,queueConfigurationWritesOutsideDataOnly:true,
      sourcePaths:[...makeScope.SOURCE_PATHS],sourceBlobs:Object.fromEntries(makeScope.SOURCE_PATHS.map(file=>[file,'b'.repeat(40)])),
      balanceCorrection:copy(makeScope.BALANCE_CORRECTION),
      runtimeAccess:{principal:makeScope.RUNTIME,receiptPath:makeScope.RUNTIME_RECEIPT_PATH,receiptBlob:makeScope.RUNTIME_RECEIPT_BLOB,
        reportDigest:makeScope.RUNTIME_REPORT_DIGEST,firestoreCapabilitiesVerified:true},
      permissions:{secretResource:makeScope.SECRET,role:'roles/secretmanager.secretAccessor',principal:makeScope.RUNTIME,
        exactSecretResourceOnly:true,etagCompareAndSwap:true,projectIamWrites:0,rulesAuthMembershipWrites:0,forbidCliProjectIamMutation:true},
      queueRules:{sourcePath:'firestore.b4-003-scoped-candidate.rules',sourceBlob:'c'.repeat(40)},
      closedConfiguration:{preview:{expectedDigest:'ABSENT',nonce:'d'.repeat(64)},live:{expectedDigest:'ABSENT',nonce:'e'.repeat(64)}},
      targetBefore:Object.fromEntries(['preview','live'].map(phase=>[phase,{...makeScope.ADDED[phase],state:'ABSENT',revision:null}]))}});
  delete f.control.operationalReleaseCandidate;
  Object.assign(f.control,{status:'OPERATIONAL_EXACT_LIVE_ACCEPTED_LOCKED',forbidBackendFunctionDeploy:true,
    backendFunctionPreviewOnly:false,currentPhysicalHostingRelease:physical,
    scopedBackendPreviewI66:{schema:'GI_I66_SCOPED_BACKEND_PREVIEW_AUTHORIZATION_V1',
      status:makeIngress?makeScope.PREVIEW_STATUS:'APPROVED_FOUR_FUNCTION_PREVIEW_SYNTHETIC_ONLY',approvedByDirection:true,
      noLiveOrFinancialWrites:true,noRulesAuthIamWrites:!makeIngress,sameImmutableArtifactOnly:true,
      ...(makeIngress?{noRulesAuthMembershipWrites:true,onlyExactSecretIamDeltaAllowed:true}:{}),
      currentPhysicalLiveSourceSha:physical.sourceSha,currentPhysicalLiveArtifactDigest:physical.artifactDigest,
      sourceSha:p.sourceSha,artifactDigest:p.artifactDigest,candidate:p}});
  return f;
}
function marker(f){return{product:'Gravicentra Insurance',gate:'I6.6',sourceSha:f.cfg.source,
  buildId:f.candidate.buildId,environmentRef:'same-project-preview'};}
function presentation(f){
  const user={uid:f.actor.uid,email:'direction@example.invalid',advisorId:g.ADVISOR,tenantId:g.TENANT};
  const orbit={auth:{user:()=>user},tenant:{get:()=>({paisDefault:'GT',nombre:'Alianzas & Soluciones'})}};
  vm.runInNewContext(ownerBytes.toString(),{window:{Orbit:orbit,location:{origin:f.cfg.origin}},Orbit:orbit,
    localStorage:{getItem:()=>null,setItem:()=>{throw Error('UNEXPECTED_TEST_STORAGE_WRITE');}}});
  return {origin:f.cfg.origin,actorUid:user.uid,advisorId:user.advisorId,role:'Dirección',tenantId:user.tenantId,
    email:user.email,scope:'user:'+user.email,gateCount:1,version:g.VERSION,type:'interno',country:'GT',
    clauseIds:[...g.CLAUSES],previousAcceptance:null,checked:false,checkboxDisabled:false,buttonDisabled:true,
    terms:copy(g.projectCatalog(orbit.legal.catalogo()))};
}
function accepted(f,scope,at){return{aceptado:true,version:g.VERSION,actorUid:f.actor.uid,scopeId:scope,
  origin:f.cfg.origin,pais:'GT',tipo:'interno',clausulas:[...g.CLAUSES],fecha:at,
  acceptanceMethod:'VISIBLE_CHECKBOX_AND_BUTTON',countrySelectionMethod:'CURRENT_COUNTRY',ip:null,ipSource:'NOT_COLLECTED'};}
function harness(options={}){
  const f=fixture();if(options.mutate)options.mutate(f);
  const shown=presentation(f),calls={fetch:[],git:[],check:0,click:0,reload:0,wait:0,records:0,presentations:0};
  const mod={exports:{}};let clickedAt,selected=false;
  const read=file=>{
    if(file===g.CONTROL)return JSON.stringify(f.control);
    if(file===g.I66_SCOPE.receiptPath)return options.receiptBytes||receiptBytes;
    if(file===g.RECEIPT)return options.historicalBytes||historicalBytes;
    if(file.endsWith('/bundle/site/__recovery__/build.json'))return JSON.stringify(options.packageMarker||marker(f));
    if(file.endsWith('/bundle/site/core/legal.js'))return options.packageOwner||ownerBytes;
    throw Error('UNEXPECTED_OFFLINE_FILE_READ');
  };
  const git=(_cmd,args)=>{
    assert.equal(_cmd,'git');calls.git.push(args);
    if(args[0]==='merge-base'){
      assert.deepEqual(args,['merge-base','--is-ancestor',g.I66_SCOPE.sourceBaseHead,f.cfg.source]);
      if(options.ancestorFails)throw Error('MOCKED_NON_DESCENDANT');return Buffer.from('');
    }
    assert.equal(args[0],'show','new scope must not use another fixed source-parent retry');
    if(args[1]===f.cfg.source+':'+g.I66_SCOPE.receiptPath)return options.sourceReceiptBytes||receiptBytes;
    if(args[1]===f.cfg.source+':'+g.RECEIPT)return options.sourceHistoricalBytes||historicalBytes;
    if(args[1]===f.cfg.source+':orbit360-platform/core/legal.js')return options.sourceOwner||ownerBytes;
    throw Error('UNEXPECTED_OFFLINE_GIT_READ');
  };
  const fetchMock=async url=>{
    calls.fetch.push(url);
    if(url===f.cfg.origin+'/__recovery__/build.json')return{status:options.markerStatus||200,
      json:async()=>calls.reload&&options.reloadMarker?options.reloadMarker:options.hostedMarker||marker(f)};
    assert.equal(url,f.cfg.origin+'/core/legal.js');
    return{status:200,arrayBuffer:async()=>options.hostedOwner||ownerBytes};
  };
  Function('module','exports','require','Buffer','fetch',helperSource)(mod,mod.exports,name=>
    name==='node:fs'?{readFileSync:read}:name==='node:child_process'?{execFileSync:git}:require(name),Buffer,fetchMock);
  const page={
    waitForSelector:async()=>{calls.wait++;},
    waitForFunction:async()=>{if(options.reloadWaitFails)throw Error('MOCKED_RELOAD_NOT_READY');},
    reload:async options=>{assert.deepEqual(options,{waitUntil:'commit',timeout:30000});calls.reload++;},
    evaluate:async(_fn,arg)=>{
      if(arg===undefined){
        calls.presentations++;
        return{...copy(shown),...(options.presentation||{}),
          ...(options.needsCountry&&!selected?{country:'',countrySelectionRequired:true,countrySelectionValue:'',
            countryOptions:['GT','CO'],checkboxDisabled:true,terms:[]}:selected?{country:'GT',countrySelectionRequired:true,
            countrySelectionValue:'GT',countryOptions:['GT','CO'],checkboxDisabled:false}:{})};
      }
      calls.records++;
      const record=options.immediateMissing?null:{...accepted(f,arg,clickedAt),...(options.record||{})};
      if(!calls.reload)return record;
      return{origin:f.cfg.origin,actorUid:f.actor.uid,advisorId:g.ADVISOR,role:'Dirección',tenantId:g.TENANT,
        signedActorUid:f.actor.uid,appStarted:true,legalSatisfied:true,email:shown.email,scope:arg,gateCount:0,...(options.reloadSnapshot||{}),
        record:options.reloadMissing?null:{...record,...(options.reloadRecord||{})}};
    },
    locator:()=>({locator:selector=>({
      selectOption:async value=>{assert.equal(selector,'#lg-country');assert.equal(value,'GT');selected=true;},
      check:async()=>{assert.equal(selector,'#lg-chk');calls.check++;if(options.checkFails)throw Error('MOCKED_CHECKBOX_FAILURE');},
      click:async()=>{assert.equal(selector,'#lg-ok');calls.click++;clickedAt=new Date().toISOString();if(options.clickFails)throw Error('MOCKED_BUTTON_FAILURE');}
    })})
  };
  return {f,calls,run:()=>mod.exports.acceptDirectionPreviewLegal({page,actor:f.actor,cfg:f.cfg})};
}

test('new scope receipt is byte-exact, literal autorizo and leaves the old decision unchanged',()=>{
  const f=fixture();assert.equal(hash(receiptBytes),g.I66_SCOPE.receiptSha256);
  assert.equal(hash(historicalBytes),g.I66_SCOPE.historicalReceiptSha256);
  assert.equal(hash(ownerBytes),g.I66_SCOPE.legalOwnerSha256);
  assert.equal(f.receipt.decision.response,'autorizo');assert.equal(f.receipt.decision.normalizedResponse,'AUTORIZO');
  assert.equal(JSON.parse(historicalBytes).constraints.futureSourceSuccessors,false);
  assert.equal(g.validateDecision(f),true);
});
test('scope is not another fixed successor exception and remains exact per candidate source/build/origin',()=>{
  for(const [source,run] of [['b'.repeat(40),44009981500],['c'.repeat(40),44009981501]]){
    const f=fixture(),p=f.candidate;
    Object.assign(p,{sourceSha:source,buildRunId:run,buildId:'gi-i66-'+source.slice(0,12)+'-57f234755dc1',
      previewChannelId:'gi-i66-rc-'+run,previewUrl:'https://ays-orbit-360-lab--gi-i66-rc-'+run+'-fresh1.web.app'});
    p.legalAcceptance=g.i66ScopeCandidatePin(p);Object.assign(f.cfg,{source,origin:p.previewUrl});
    assert.equal(g.validateDecision(f),true);
  }
});
const decisionMutations=[
  ['missing control',f=>delete f.control],['future gate',f=>f.control.gate='I6.7'],
  ['closed Preview status',f=>f.control.status='PREVIEW_BUILD_REQUESTED'],
  ['LIVE phase',f=>f.cfg.phase='LIVE'],['LIVE origin',f=>f.cfg.origin='https://app.aysseguros.com'],
  ['different technical source',f=>f.cfg.source='d'.repeat(40)],
  ['foreign Preview origin',f=>f.cfg.origin='https://other-site--gi-i66-rc-44009981499-x.web.app'],
  ['different build run',f=>f.candidate.buildRunId++],
  ['missing buildId',f=>delete f.candidate.buildId],
  ['old per-source retry',f=>f.candidate.legalTechnicalRetry=g.technicalRetryCandidatePin(f.cfg.source)],
  ['extra old retry bytes',f=>f.technicalRetryBytes=Buffer.from('old')],
  ['receipt digest',f=>f.receiptSha256='0'.repeat(64)],
  ['receipt schema',f=>f.receipt.schema='OTHER'],['decision ID',f=>f.receipt.decisionId=g.DECISION],
  ['authorization base',f=>f.receipt.sourceBaseHead='e'.repeat(40)],
  ['invented Acepto response',f=>f.receipt.decision.response='Acepto'],
  ['normalization missing',f=>delete f.receipt.decision.normalizedResponse],
  ['general work authority',f=>f.receipt.decision.status='GENERAL_WORK_AUTHORIZATION'],
  ['review digest',f=>f.receipt.decision.reviewDocumentSha256='0'.repeat(64)],
  ['country',f=>f.receipt.subject.country='CO'],['advisor',f=>f.receipt.subject.advisorId='ase-carlos-castro'],
  ['tenant',f=>f.receipt.subject.tenantId='other-tenant'],['role',f=>f.actor.role='Operativo'],
  ['unsigned actor',f=>f.actor.uid=''],['different actor',f=>f.actor.advisorId='ase-carlos-castro'],
  ['repository',f=>f.receipt.environment.repository='other/repo'],
  ['branch',f=>f.receipt.environment.branch='main'],['project',f=>f.receipt.environment.firebaseProject='other'],
  ['origin binding',f=>f.receipt.environment.originBinding='ARBITRARY_ORIGIN'],
  ['V2 version',f=>f.receipt.legal.version='2.1'],['terms digest',f=>f.receipt.legal.termsProjectionSha256='0'.repeat(64)],
  ['legal owner',f=>f.receipt.legal.legalOwnerSha256='0'.repeat(64)],['clauses',f=>f.receipt.legal.clauseIds.push('socios')],
  ['historical receipt changed',f=>f.receipt.historicalReceipt.unchanged=false],
  ['missing reload requirement',f=>f.receipt.executionAcceptance.requireImmediateAndReloadReadback=false]
];
for(const [label,mutate] of decisionMutations)test('bounded consent refuses '+label,()=>{
  const f=fixture();mutate(f);assert.throws(()=>g.validateDecision(f));
});
for(const field of ['otherActors','otherTenants','otherCountries','live','futureGates','changedTerms','realPayments','storageSeeding','gateBypass'])
  test('bounded consent cannot expand '+field,()=>{const f=fixture();f.receipt.constraints[field]=true;assert.throws(()=>g.validateDecision(f));});
for(const field of ['receiptPath','receiptSha256','decisionId','authorizationScope','gate','phase','origin','sourceSha','actorRole','termsProjectionSha256','buildId'])
  test('candidate must retain exact consent pin '+field,()=>{
    const f=fixture();f.candidate.legalAcceptance[field]='unapproved';assert.throws(()=>g.validateDecision(f));
  });
test('presentation and acceptance record can use only the current validated candidate origin',()=>{
  const f=fixture(),s=presentation(f),now=Date.now(),r=accepted(f,s.scope,new Date(now).toISOString());
  assert.equal(g.validatePresentation(s,f.actor,f.candidate),true);
  assert.equal(g.validateAccepted(r,f.actor,s.scope,now-1,now+1,f.candidate),true);
  for(const origin of [g.ORIGIN,'https://app.aysseguros.com','https://wrong.example']){
    assert.throws(()=>g.validatePresentation({...s,origin},f.actor,f.candidate));
    assert.throws(()=>g.validateAccepted({...r,origin},f.actor,s.scope,now-1,now+1,f.candidate));
  }
});
test('mocked executable helper verifies ancestry/source/owner and normal UI plus immediate and reload readback',async()=>{
  const h=harness(),proof=await h.run();
  assert.equal(proof.decisionId,g.I66_SCOPE.decisionId);assert.equal(proof.authorizationScope,g.I66_SCOPE.authorizationScope);
  assert.equal(proof.buildId,h.f.candidate.buildId);assert.equal(proof.origin,h.f.cfg.origin);assert.equal(proof.sourceSha,h.f.cfg.source);
  for(const field of ['immediateReadback','reloadReadback','reloadActorVerified'])assert.equal(proof[field],true);
  assert.equal(h.calls.check,1);assert.equal(h.calls.click,1);assert.equal(h.calls.reload,1);assert.equal(h.calls.records,2);
  assert.equal(h.calls.fetch.length,3);assert.equal(h.calls.git.filter(args=>args[0]==='merge-base').length,1);
  assert.ok(!h.calls.git.some(args=>args[0]==='rev-parse'));
  g.validateAcceptanceProof(proof,h.f.candidate);
});
for(const [label,makeIngress] of [['FOUR',false],['FIVE',true]])
test('scoped '+label+' executable legal helper validates canonical candidate and normal consent under the production lock',async()=>{
  const h=harness({mutate:f=>scopedFixture(f,makeIngress)}),before=JSON.stringify(h.f.control);
  assert.equal(release.candidateForPhase(h.f.control,'preview'),h.f.candidate);
  const proof=await h.run();g.validateAcceptanceProof(proof,h.f.candidate);
  assert.equal(proof.decisionId,g.I66_SCOPE.decisionId);assert.equal(proof.sourceSha,h.f.cfg.source);
  assert.equal(proof.origin,h.f.cfg.origin);assert.equal(proof.buildId,h.f.candidate.buildId);
  assert.equal(proof.immediateReadback,true);assert.equal(proof.reloadReadback,true);assert.equal(proof.reloadActorVerified,true);
  assert.equal(h.calls.check,1);assert.equal(h.calls.click,1);assert.equal(h.calls.reload,1);assert.equal(h.calls.records,2);
  assert.equal(h.calls.fetch.length,3);assert.equal(h.calls.git.filter(args=>args[0]==='merge-base').length,1);
  assert.equal(JSON.stringify(h.f.control),before,'acceptance must not mutate the production lock or candidate');
});
const scopedFiveAuthorityFailures=[
  ['unknown scoped status',f=>f.control.scopedBackendPreviewI66.status='APPROVED_ANY_PREVIEW',true],
  ['missing scoped authorization',f=>delete f.control.scopedBackendPreviewI66,true],
  ['wrong canonical status',f=>f.control.status='PREVIEW_BUILD_REQUESTED',true],
  ['FOUR status attached to FIVE candidate',f=>f.control.scopedBackendPreviewI66.status='APPROVED_FOUR_FUNCTION_PREVIEW_SYNTHETIC_ONLY'],
  ['open production lock',f=>f.control.forbidBackendLiveFunctionDeploy=false],
  ['second raw candidate',f=>f.control.operationalReleaseCandidate=copy(f.candidate)],
  ['future gate',f=>f.control.gate='I6.7'],
  ['unapproved scope',f=>f.control.scopedBackendPreviewI66.approvedByDirection=false],
  ['financial writes permitted',f=>f.control.scopedBackendPreviewI66.noLiveOrFinancialWrites=false],
  ['scope source drift',f=>f.control.scopedBackendPreviewI66.sourceSha='d'.repeat(40)],
  ['scope artifact drift',f=>f.control.scopedBackendPreviewI66.artifactDigest='sha256:'+'d'.repeat(64)],
  ['physical LIVE drift',f=>f.control.scopedBackendPreviewI66.currentPhysicalLiveSourceSha='d'.repeat(40)],
  ['candidate LIVE status',f=>f.candidate.status='EXACT_PREVIEW_SIGNED_LIVE_AUTHORIZED'],
  ['candidate target expansion',f=>f.candidate.targets.preview.push({name:'otherFunction',region:'us-central1'})],
  ['candidate Make source drift',f=>f.candidate.makeIngress.sourceSha='d'.repeat(40)],
  ['candidate active ingress',f=>f.candidate.makeIngress.deployState='ACTIVE'],
  ['candidate IAM expansion',f=>f.candidate.makeIngress.permissions.projectIamWrites=1],
  ['candidate real writes permitted',f=>f.candidate.noRealFinancialOrCustomerWrites=false],
  ['LIVE phase',f=>f.cfg.phase='LIVE'],
  ['execution source drift',f=>f.cfg.source='d'.repeat(40)],
  ['execution origin drift',f=>f.cfg.origin='https://app.aysseguros.com'],
  ['consent source drift',f=>f.candidate.legalAcceptance.sourceSha='d'.repeat(40)],
  ['consent receipt drift',f=>f.candidate.legalAcceptance.receiptSha256='d'.repeat(64)],
  ['consent terms drift',f=>f.candidate.legalAcceptance.termsProjectionSha256='d'.repeat(64)],
  ['wrong signed actor',f=>f.actor.role='Operativo']
];
for(const [label,mutate,gateInactive] of scopedFiveAuthorityFailures)
test('scoped FIVE executable helper refuses '+label+' before hosted reads and UI',async()=>{
  const h=harness({mutate:f=>{scopedFixture(f,true);mutate(f);}});
  await assert.rejects(h.run(),error=>{
    assert.equal(error.directionLegalSubstage,'AUTHORITY_VALIDATION');
    if(gateInactive)assert.match(error.message,/DIRECTION_LEGAL_PREVIEW_GATE_NOT_ACTIVE/);
    else assert.doesNotMatch(error.message,/DIRECTION_LEGAL_PREVIEW_GATE_NOT_ACTIVE/,'canonical candidate and consent validation must run');
    return true;
  });
  assert.equal(h.calls.fetch.length,0);assert.equal(h.calls.wait,0);assert.equal(h.calls.check,0);
  assert.equal(h.calls.click,0);assert.equal(h.calls.reload,0);
});
const preUiFailures=[
  ['source not descendant',{ancestorFails:true}],
  ['receipt bytes tampered',{receiptBytes:Buffer.concat([receiptBytes,Buffer.from(' ')])}],
  ['receipt not in source',{sourceReceiptBytes:Buffer.from('wrong source receipt')}],
  ['historical local changed',{historicalBytes:Buffer.from('changed historical receipt')}],
  ['historical source changed',{sourceHistoricalBytes:Buffer.from('changed historical receipt')}],
  ['package marker changed',{packageMarker:{...marker(fixture()),sourceSha:'0'.repeat(40)}}],
  ['hosted marker changed',{hostedMarker:{...marker(fixture()),buildId:'gi-i66-'+ 'a'.repeat(12)+'-111111111111'}}],
  ['marker unavailable',{markerStatus:404}],
  ['source owner changed',{sourceOwner:Buffer.from('changed legal source')}],
  ['package owner changed',{packageOwner:Buffer.from('changed legal package')}],
  ['hosted owner changed',{hostedOwner:Buffer.from('changed hosted owner')}],
  ['displayed text changed',{presentation:{terms:[]}}],
  ['wrong presented actor',{presentation:{actorUid:'other-actor'}}]
];
for(const [label,options] of preUiFailures)test('executable helper stops before click for '+label,async()=>{
  const h=harness(options);await assert.rejects(h.run());assert.equal(h.calls.check,0);assert.equal(h.calls.click,0);assert.equal(h.calls.reload,0);
});
test('non-descendant authority stops before any hosted read or page operation',async()=>{
  const h=harness({ancestorFails:true});await assert.rejects(h.run(),/DIRECTION_LEGAL_SCOPE_SOURCE_NOT_DESCENDANT/);
  assert.equal(h.calls.fetch.length,0);assert.equal(h.calls.wait,0);assert.equal(h.calls.check,0);
});
test('only the normal GT selector may complete an unresolved country before acceptance',async()=>{
  const h=harness({needsCountry:true});g.validateAcceptanceProof(await h.run(),h.f.candidate);
  assert.equal(h.calls.presentations,2);assert.equal(h.calls.reload,1);
});
test('immediate persistence failure cannot produce a reload proof',async()=>{
  const h=harness({immediateMissing:true});await assert.rejects(h.run(),/DIRECTION_LEGAL_ACCEPTANCE_NOT_PERSISTED/);
  assert.equal(h.calls.click,1);assert.equal(h.calls.reload,0);
});
const reloadFailures=[
  ['auth not ready',{reloadWaitFails:true}],['missing acceptance',{reloadMissing:true}],
  ['actor',{reloadSnapshot:{actorUid:'other-uid'}}],['advisor',{reloadSnapshot:{advisorId:'ase-carlos-castro'}}],
  ['signed UID',{reloadSnapshot:{signedActorUid:'other-signed-uid'}}],
  ['app not started',{reloadSnapshot:{appStarted:false}}],['legal state not ready',{reloadSnapshot:{legalSatisfied:false}}],
  ['role',{reloadSnapshot:{role:'Operativo'}}],['tenant',{reloadSnapshot:{tenantId:'other-tenant'}}],
  ['origin',{reloadSnapshot:{origin:g.ORIGIN}}],['scope',{reloadSnapshot:{scope:'user:other@example.invalid'}}],
  ['pending gate',{reloadSnapshot:{gateCount:1}}],['record changed',{reloadRecord:{countrySelectionMethod:'different'}}],
  ['record country',{reloadRecord:{pais:'CO'}}],['record actor',{reloadRecord:{actorUid:'other-uid'}}],
  ['record origin',{reloadRecord:{origin:g.ORIGIN}}],
  ['hosting marker changed',{reloadMarker:{...marker(fixture()),sourceSha:'0'.repeat(40)}}]
];
for(const [label,options] of reloadFailures)test('reload readback refuses '+label+' drift',async()=>{
  const h=harness(options);await assert.rejects(h.run());assert.equal(h.calls.reload,1);assert.equal(h.calls.click,1);
});
test('signed evidence cannot omit reload or mix source build scope origin or actor',async()=>{
  const h=harness(),proof=await h.run();
  for(const mutate of [p=>p.decisionId=g.DECISION,p=>p.sourceSha='0'.repeat(40),p=>p.origin=g.ORIGIN,
    p=>p.buildId+='x',p=>delete p.authorizationScope,p=>p.gate='I6.7',p=>p.receiptSha256='0'.repeat(64),
    p=>delete p.immediateReadback,p=>p.reloadReadback=false,p=>delete p.reloadActorVerified,
    p=>p.actorUidSha256='',p=>p.gateBypassed=true,p=>p.storageSeeded=true,p=>p.liveAcceptance=true]){
    const bad=copy(proof);mutate(bad);assert.throws(()=>g.validateAcceptanceProof(bad,h.f.candidate));
  }
});
test('legacy receipt alone still cannot authorize the new origin',()=>{
  const f=fixture();f.candidate.legalAcceptance={receiptPath:g.RECEIPT,receiptSha256:hash(historicalBytes),
    decisionId:g.DECISION,sourceSha:f.cfg.source,phase:'PREVIEW',actorRole:'direccion'};
  Object.assign(f,{receipt:JSON.parse(historicalBytes),receiptSha256:hash(historicalBytes),sourceParent:g.SOURCE_PARENT});
  assert.throws(()=>g.validateDecision(f),/DIRECTION_LEGAL_ORIGIN_MISMATCH/);
});
test('no storage seeding bypass or forced UI action was added; protected CI has ancestry history',()=>{
  assert.doesNotMatch(helperSource,/force\s*:\s*true|localStorage\.setItem|legal\.registrar\(|legal\.dismiss\(|addInitScript\(/);
  const workflow=fs.readFileSync(path.join(root,'.github/workflows/gravicentra-i66-privileged-role-three-function-preview-uat.yml'),'utf8');
  assert.match(workflow.slice(workflow.indexOf('  exact-preview-only:')),/fetch-depth: 0/);
  for(const stage of ['RELOAD_READBACK','RELOAD_ACTOR_VALIDATION'])assert.equal(g.safeLegalFailureSubstage(stage),stage);
  for(const code of ['DIRECTION_LEGAL_SCOPE_SOURCE_NOT_DESCENDANT','DIRECTION_LEGAL_RELOAD_ACTOR_MISMATCH',
    'DIRECTION_LEGAL_RELOAD_PROOF_REQUIRED','DIRECTION_LEGAL_SCOPE_RECEIPT_MISMATCH'])assert.ok(g.LEGAL_FAILURE_CHECKS.includes(code));
});

test('scoped Preview legal authority uses the signed four-function candidate and preserves normal UI consent',()=>{
  const start=helperSource.indexOf('async function acceptDirectionPreviewLegal(');
  const end=helperSource.indexOf('async function ',start+10);
  const block=helperSource.slice(start,end<0?undefined:end);
  assert.ok(block.includes("control.scopedBackendPreviewI66?.status==='APPROVED_FOUR_FUNCTION_PREVIEW_SYNTHETIC_ONLY'"));
  assert.ok(block.includes("candidateForPhase(control,'preview')"));
  assert.ok(block.includes("assert.equal(control.status,'OPERATIONAL_BACKEND_PREVIEW_AUTHORIZED'"));
  assert.ok(block.includes('validateDecision({receipt,receiptSha256,candidate,cfg,sourceParent,actor,technicalRetryBytes,control})'));
  assert.ok(block.includes('applyDirectionLegalUi({page,actor,cfg,candidate,receipt,receiptSha256,scoped,technicalRetryBytes,technicalRetry,phase:'));
  assert.ok(!block.includes('storage.setItem('));
});
