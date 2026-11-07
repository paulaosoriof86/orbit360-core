'use strict';
// Pure release-contract tests. No credentials, network, browser or data writes.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const ROOT=path.resolve(process.env.GI_CAPTURE_RELEASE_TEST_ROOT||path.join(__dirname,'..'));
const RC='artifacts/orbit360-recovery/release-control/';
const CP=RC+'CONTROL_PLANE.json';
const CONTRACT=RC+'I6_5_B4_004_POLICY_CAPTURE_CAUSAL_FRONTEND_SUCCESSOR_CONTRACT_20261107.json';
const RAW=RC+'I6_5_B4_004_E503_ROLLBACK_DURABLE_CERTIFICATE_20261107.json';
const EVIDENCE=RC+'SYNTHETIC_CAPTURE_QA_TEST_FIXTURE.json';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const bytes=x=>Buffer.from(JSON.stringify(x));
const copy=x=>JSON.parse(JSON.stringify(x));
const control=JSON.parse(fs.readFileSync(path.join(ROOT,CP),'utf8'));
const contractBytes=fs.readFileSync(path.join(ROOT,CONTRACT));
const contract=JSON.parse(contractBytes);
function qa(){return {
  schema:'GRAVICENTRA_B4_004_POLICY_CAPTURE_FOCAL_PREVIEW_QA_V1',status:'FOCAL_AUTHENTICATED_UI_PASS',
  artifact:{sourceSha:'1'.repeat(40),buildId:'synthetic-capture-build',artifactId:1,artifactZipSha256:'2'.repeat(64),archiveSha256:'3'.repeat(64),hostedPayloadDigest:'4'.repeat(64)},
  sourceOwners:contract.productChanges.map(e=>({path:e.path,blobSha:e.afterBlobSha})),
  assertions:Object.fromEntries(['exactArtifactBeforeWrites','originalAbsenceVerified','advisorCommissionAndScopedAudit','clientFormAndAtomicActivity','policyFormAtomicBatchAndDerivedClientState','receiptEditFormAndAtomicPortfolioActivity','freshProductReloadWithoutAdapter'].map(k=>[k,true])),businessWrites:0,authAccountsCreated:0,membershipWrites:0,syntheticFinalAbsent:true,
  cleanup:{method:'EXACT_PREDECLARED_IDS_AND_CAPTURED_SERVER_RECEIPTS',compareAndDeleteTransaction:true},errors:[]
};}
function cursor(proof=qa()){return {
  schema:'GRAVICENTRA_B4_004_POLICY_CAPTURE_SUCCESSOR_CURSOR_V1',
  status:'FRONTEND_SUCCESSOR_PREVIEW_ACCEPTED_PROMOTION_AUTHORIZED',
  preservedAcceptancePointer:'/b4003ActiveCertificationCursor20261106/formalLiveAcceptance',
  preservedPriorSuccessorPointer:'/b4003CausalFrontendSuccessor20261107',
  sourceContractPath:CONTRACT,sourceContractBlobSha:blob(contractBytes),
  b4003Closed:true,b4003HistoricalAcceptancePreserved:true,nextGateAccepted:false,
  activeSourceSha:'1'.repeat(40),activeBuildId:'synthetic-capture-build',activeImmutableArtifactId:1,productionPromotionAuthorized:true,
  immutableSuccessor44PreviewReadback:{sourceSha:'1'.repeat(40),artifactId:1,artifactZipSha256:'2'.repeat(64),archiveSha256:'3'.repeat(64),hostedPayloadDigest:'4'.repeat(64),versionName:'sites/ays-orbit-360-lab/versions/synthetic-capture-test'},
  focalAuthenticatedAcceptance:{status:'PASS',sourceSha:'1'.repeat(40),buildId:'synthetic-capture-build',artifactId:1,evidencePins:[{path:EVIDENCE,blobSha:blob(bytes(proof))}],realBusinessWrites:0,exactSyntheticCleanupVerified:true,syntheticIdentityAdaptationDeclared:true}
};}
function harness(source,options={}){
  const begin=source.indexOf('function causalSuccessorContext('),end=source.indexOf('\nfunction relativePath(',begin);
  assert.ok(begin>0&&end>begin);
  const proof=options.proof||qa();
  const io={
    readFileSync(p,enc){let b=p===EVIDENCE?bytes(proof):fs.readFileSync(path.resolve(ROOT,p));if(options.tamper===p)b=Buffer.concat([b,Buffer.from(' ')]);return enc?b.toString(enc):b;},
    existsSync(p){return p===EVIDENCE||fs.existsSync(path.resolve(ROOT,p));}
  };
  const ctx=vm.createContext({env:{B4_CAUSAL_FRONTEND_SUCCESSOR:'policy-capture-20261107',B4_CURSOR_KEY:'b4004PolicyCaptureFrontendSuccessor20261107',...options.env},fs:io,crypto,Buffer,sha,
    exact(a,b,c){assert.equal(a,b,c);},requireValue(a,c){assert.ok(a,c);}});
  vm.runInContext(source.slice(begin,end),ctx);
  return {run:(cp=copy(control),c=cursor(proof),authorize=true)=>ctx.causalSuccessorContext(cp,c,authorize),ctx};
}
for(const basename of ['gravicentra-b4-003-retained-hosting-preflight.mjs','gravicentra-b4-003-retained-hosting-promotion.mjs']){
  const source=fs.readFileSync(path.join(ROOT,'tools',basename),'utf8');
  test(basename+': exact e503 rollback preserves both prior certificates and reads all product hashes',()=>{
    const cp=copy(control),before=JSON.stringify(cp),result=harness(source).run(cp);
    assert.equal(result.pin.sourceSha,'e5030ec5ba9854f0c576fd905c2f510766347ffa');
    assert.equal(result.pin.versionName,'sites/ays-orbit-360-lab/versions/d8caae0d585bf6dd');
    assert.equal(result.manifest.fileCount,218);
    assert.equal(result.manifest.digest,'09c91023d1d22687528a61edb5a768dadbd59c465af91bc48016d21c94c6537f');
    assert.equal(result.raw.liveHostingObservation.files.length,220);
    assert.equal(JSON.stringify(cp),before);
  });
  test(basename+': source contract, raw rollback and earlier acceptance cannot be replaced',()=>{
    for(const file of [CONTRACT,RAW,contract.rollback.receiptPath,control.b4003ActiveCertificationCursor20261106.formalLiveAcceptance.receiptPath]){
      assert.throws(()=>harness(source,{tamper:file}).run(),/CAPTURE_.*CHANGED/);
    }
    for(const edit of [cp=>cp.b4003ActiveCertificationCursor20261106.b4003Closed=false,cp=>cp.b4003CausalFrontendSuccessor20261107.productionPromotionAuthorized=true,cp=>cp.b4003CausalFrontendSuccessor20261107.activeSourceSha='0'.repeat(40)]){
      const cp=copy(control);edit(cp);assert.throws(()=>harness(source).run(cp),/CAPTURE_CURRENT42_REOPENED|CAPTURE_E503_/);
    }
    for(const key of ['hostingVersion','hostedPayloadDigest','artifactTarDigest','productFiles','receiptSha256']){
      const cp=copy(control),seal=cp.b4003ActiveCertificationCursor20261106.formalLiveAcceptance;
      seal[key]=typeof seal[key]==='number'?seal[key]+1:'changed';
      assert.throws(()=>harness(source).run(cp),/CAPTURE_CURRENT42_/);
    }
  });
  test(basename+': no replay, broad acceptance, arbitrary cursor or missing authorization',()=>{
    for(const edit of [c=>c.activeSourceSha=contract.rollback.sourceSha,c=>c.activeImmutableArtifactId=contract.rollback.artifactId,c=>c.nextGateAccepted=true,c=>c.productionPromotionAuthorized=false,c=>c.focalAuthenticatedAcceptance.status='PENDING',c=>c.focalAuthenticatedAcceptance.syntheticIdentityAdaptationDeclared=false]){
      const c=cursor();edit(c);assert.throws(()=>harness(source).run(copy(control),c),/CAPTURE_/);
    }
    assert.throws(()=>harness(source,{env:{B4_CURSOR_KEY:'unbounded'}}).run(),/CAPTURE_CURSOR_INVALID/);
    assert.throws(()=>harness(source,{env:{B4_CAUSAL_FRONTEND_SUCCESSOR:'unbounded'}}).run(),/CAUSAL_MODE_INVALID/);
  });
  test(basename+': pending focal evidence allows only preflight',()=>{
    const c=cursor();c.status='EXACT_PREVIEW_TRANSPORT_PASS_FOCAL_UAT_PENDING';c.productionPromotionAuthorized=false;delete c.focalAuthenticatedAcceptance;
    assert.ok(harness(source).run(copy(control),c,false));
    assert.throws(()=>harness(source).run(copy(control),c,true),/CAPTURE_PREVIEW_NOT_ACCEPTED/);
  });
  test(basename+': only read-only preflight may discover an unrecorded Hosting version',()=>{
    const c=cursor();c.productionPromotionAuthorized=false;delete c.immutableSuccessor44PreviewReadback.versionName;
    assert.ok(harness(source).run(copy(control),c,false));
    assert.throws(()=>harness(source).run(copy(control),c,true),/CAPTURE_PREVIEW_VERSION_PIN_REQUIRED/);
    c.productionPromotionAuthorized=true;
    assert.throws(()=>harness(source).run(copy(control),c,false),/CAPTURE_PREVIEW_VERSION_PIN_REQUIRED/);
    c.productionPromotionAuthorized=false;
    c.immutableSuccessor44PreviewReadback.versionName='wrong-site/version';
    assert.throws(()=>harness(source).run(copy(control),c,false),/CAPTURE_PREVIEW_VERSION_INVALID/);
    assert.throws(()=>harness(source).run(copy(control),c,true),/CAPTURE_PREVIEW_VERSION_INVALID/);
  });
  test(basename+': QA must be exact artifact, exact owners, zero business writes and exact cleanup',()=>{
    for(const edit of [
      q=>q.status='PENDING',q=>q.artifact.sourceSha='0'.repeat(40),q=>q.artifact.buildId='wrong',q=>q.artifact.artifactId=2,
      q=>q.artifact.artifactZipSha256='0'.repeat(64),q=>q.artifact.archiveSha256='0'.repeat(64),q=>q.artifact.hostedPayloadDigest='0'.repeat(64),
      q=>q.businessWrites=1,q=>q.authAccountsCreated=1,q=>q.membershipWrites=1,q=>q.syntheticFinalAbsent=false,
      q=>q.cleanup.method='actor-and-time-window',q=>q.cleanup.compareAndDeleteTransaction=false,
      q=>q.sourceOwners.pop(),q=>q.sourceOwners[0].blobSha='0'.repeat(40),q=>q.assertions.clientFormAndAtomicActivity=false,q=>q.errors.push('a real error')
    ]){const q=qa();edit(q);assert.throws(()=>harness(source,{proof:q}).run(copy(control),cursor(q),true),/CAPTURE_QA_/);}
    const c=cursor();c.focalAuthenticatedAcceptance.evidencePins=[];assert.throws(()=>harness(source).run(copy(control),c,true),/CAPTURE_UAT_EVIDENCE_REQUIRED/);
    assert.throws(()=>harness(source,{tamper:EVIDENCE}).run(),/CAPTURE_UAT_EVIDENCE_CHANGED/);
  });
  test(basename+': absent or malformed paired digests cannot masquerade as equal evidence',()=>{
    for(const key of ['artifactZipSha256','archiveSha256','hostedPayloadDigest'])for(const value of [undefined,'x','4'.repeat(63),'G'.repeat(64)]){
      const q=qa();q.artifact[key]=value;const c=cursor(q);c.immutableSuccessor44PreviewReadback[key]=value;
      assert.throws(()=>harness(source,{proof:q}).run(copy(control),c,true),/CAPTURE_QA_PROOF_DIGEST_INVALID/);
      c.status='EXACT_PREVIEW_TRANSPORT_PASS_FOCAL_UAT_PENDING';
      assert.throws(()=>harness(source,{proof:q}).run(copy(control),c,false),/CAPTURE_QA_PROOF_DIGEST_INVALID/);
    }
  });
  test(basename+': payload proof must match manifest calculated from the retained artifact bytes',()=>{
    const h=harness(source),proof=cursor().immutableSuccessor44PreviewReadback;
    assert.doesNotThrow(()=>h.ctx.policyCapturePayloadBinding(proof,{digest:proof.hostedPayloadDigest}));
    assert.throws(()=>h.ctx.policyCapturePayloadBinding(proof,{digest:'0'.repeat(64)}),/CAPTURE_PAYLOAD_BYTES_MISMATCH/);
    assert.throws(()=>h.ctx.policyCapturePayloadBinding(proof,{digest:undefined}),/CAPTURE_COMPUTED_PAYLOAD_INVALID/);
    assert.throws(()=>h.ctx.policyCapturePayloadBinding({hostedPayloadDigest:'x'},{digest:'x'}),/CAPTURE_PAYLOAD_PROOF_INVALID/);
    if(basename.endsWith('preflight.mjs'))assert.match(source,/manifest=localManifest\(path\.join\(root,'site'\)\);\s*if\(env\.B4_CAUSAL_FRONTEND_SUCCESSOR==='policy-capture-20261107'\)policyCapturePayloadBinding\(causal\.artifactProof,manifest\);/);
    else assert.match(source,/const candidateManifest=readRows\('retained-site-manifest\.sha256'\);\s*if\(env\.B4_CAUSAL_FRONTEND_SUCCESSOR==='policy-capture-20261107'\)policyCapturePayloadBinding\(causal\.artifactProof,candidateManifest\);/);
  });
}
test('existing executor selects the new cursor only for its two exact request subjects',()=>{
  const workflow=fs.readFileSync(path.join(ROOT,'.github/workflows/gravicentra-b4-003-executor.yml'),'utf8');
  const start=workflow.indexOf('  b4-003-retained-hosting-preflight:'),end=workflow.indexOf('\n  b4-003-synthetic-archive-readback:',start);
  const lines=workflow.slice(start,end).split('\n');
  const expression=prefix=>JSON.parse(lines.find(x=>x.startsWith(prefix)).slice(prefix.length)).replace(/^\$\{\{ | \}\}$/g,'');
  // Actions single-quoted strings preserve backslashes; JS string literals do not.
  const jsExpression=expr=>expr.replace(/'((?:[^']|'')*)'/g,(_,value)=>JSON.stringify(value.replace(/''/g,"'")));
  const evaluate=(expr,msg,event='push')=>new Function('github','startsWith','format','fromJSON','return ('+jsExpression(expr)+');')(
    {event_name:event,event:{head_commit:{message:msg}}},(a,b)=>a.startsWith(b),(s,...args)=>s.replace(/\{(\d+)\}/g,(_,n)=>args[Number(n)]),JSON.parse);
  const trigger=expression('    if: '),mode=expression('      B4_CAUSAL_FRONTEND_SUCCESSOR: '),key=expression('      B4_CURSOR_KEY: ');
  const jobs=workflow.slice(workflow.indexOf('\njobs:\n')+7);
  const jobEntries=[...jobs.matchAll(/^  ([A-Za-z0-9_-]+):\n([\s\S]*?)(?=^  [A-Za-z0-9_-]+:\n|(?![\s\S]))/gm)];
  assert.ok(jobEntries.length>2);
  const selectedJobs=message=>jobEntries.filter(([,name,body])=>{
    const conditional=body.split('\n').find(x=>x.startsWith('    if: '));
    if(!conditional)return true;
    return evaluate(JSON.parse(conditional.slice('    if: '.length)),message)===true;
  }).map(([,name])=>name);
  for(const subject of ['test(b4-004): policy capture retained artifact preflight','release(b4-004): promote policy capture retained version']){
    for(const message of [subject,subject+'\n\nBound exact evidence.']){
      assert.equal(evaluate(trigger,message),true);
      assert.equal(evaluate(mode,message),'policy-capture-20261107');
      assert.equal(evaluate(key,message),'b4004PolicyCaptureFrontendSuccessor20261107');
      assert.equal(evaluate(trigger,message,'workflow_dispatch'),false);
      assert.deepEqual(selectedJobs(message),['b4-003-retained-hosting-preflight']);
    }
    for(const message of [subject+' unapproved suffix',subject.slice(0,-1),'prefix '+subject]){
      assert.equal(evaluate(trigger,message),false);
      assert.notEqual(evaluate(mode,message),'policy-capture-20261107');
    }
  }
  const old='release(b4-003): promote causal frontend retained version';
  assert.equal(evaluate(trigger,old),true);assert.equal(evaluate(mode,old),'current42-frontend-20261107');
  assert.equal(evaluate(key,old),'b4003CausalFrontendSuccessor20261107');
});
