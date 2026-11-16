'use strict';
// Exact technical continuation of the already accepted Preview clauses.
// No browser, authentication, network, real acceptance or storage writes.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const g=require('./gravicentra-i6-6-direction-preview-legal-acceptance.cjs');
const root=path.resolve(__dirname,'..'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const consent=fs.readFileSync(path.join(root,g.RECEIPT)),retry=fs.readFileSync(path.join(root,g.TECHNICAL_RETRY.receiptPath));
const owner=fs.readFileSync(path.join(root,'orbit360-platform/core/legal.js'));
function fixture(){
  const cfg={phase:'PREVIEW',origin:g.ORIGIN,source:'a'.repeat(40),packageRoot:'/synthetic/exact-package'};
  return{receipt:JSON.parse(consent),receiptSha256:sha(consent),technicalRetryBytes:Buffer.from(retry),cfg,sourceParent:g.TECHNICAL_RETRY.sourceParent,
    actor:{role:'Dirección',advisorId:g.ADVISOR,uid:'synthetic-direction-uid'},candidate:{sourceSha:cfg.source,status:'EXACT_BACKEND_PREVIEW_SIGNED_QA_AUTHORIZED',
      legalAcceptance:{receiptPath:g.RECEIPT,receiptSha256:sha(consent),decisionId:g.DECISION,sourceSha:cfg.source,phase:'PREVIEW',actorRole:'direccion'},
      legalTechnicalRetry:g.technicalRetryCandidatePin(cfg.source)}};
}
test('only the exact b9 navigation successor may reuse the unchanged Preview decision',()=>{
  assert.equal(sha(consent),g.TECHNICAL_RETRY.originalReceiptSha256);assert.equal(sha(retry),g.TECHNICAL_RETRY.receiptSha256);
  assert.equal(sha(owner),g.TECHNICAL_RETRY.legalOwnerSha256);assert.equal(g.validateDecision(fixture()),true);
  const record=JSON.parse(retry);assert.equal(record.sourceParent,g.TECHNICAL_RETRY.sourceParent);
  assert.equal(record.decisionScopeUnchanged.termsProjectionSha256,g.TERMS_SHA256);
  assert.deepEqual(record.decisionScopeUnchanged.clauseIds,[...g.CLAUSES]);
  assert.equal(record.constraints.newConsentInvented,false);assert.equal(record.constraints.futureAutomaticSuccessors,false);
  assert.equal(JSON.parse(consent).constraints.futureSourceSuccessors,false);
});
test('technical continuation refuses missing, altered, historical or future bindings',()=>{
  const mutations=[f=>delete f.technicalRetryBytes,f=>f.technicalRetryBytes=Buffer.concat([retry,Buffer.from(' ')]),
    f=>f.sourceParent='f'.repeat(40),f=>f.sourceParent=g.SOURCE_PARENT,f=>delete f.candidate.legalTechnicalRetry,
    f=>f.candidate.legalTechnicalRetry.sourceSha='b'.repeat(40),f=>f.candidate.legalTechnicalRetry.sourceParent='c'.repeat(40),
    f=>f.candidate.legalTechnicalRetry.receiptSha256='d'.repeat(64),f=>f.candidate.legalTechnicalRetry.legalOwnerSha256='e'.repeat(64),
    f=>f.receiptSha256='f'.repeat(64),f=>f.cfg.phase='LIVE',f=>f.cfg.origin='https://app.aysseguros.com',
    f=>f.actor.advisorId='ase-carlos-castro',f=>f.actor.role='Operativo',f=>f.receipt.constraints.futureSourceSuccessors=true,
    f=>f.receipt.legal.termsProjectionSha256='0'.repeat(64),f=>f.receipt.legal.version='2.1',f=>f.receipt.subject.country='CO'];
  for(const mutate of mutations){const f=fixture();mutate(f);assert.throws(()=>g.validateDecision(f));}
});
function harness(options={}){
  const f=fixture();if(options.mutate)options.mutate(f);
  const calls={fetch:0,wait:0,actions:0};
  const control={status:'OPERATIONAL_BACKEND_PREVIEW_AUTHORIZED',operationalReleaseCandidate:f.candidate},mod={exports:{}};
  const read=file=>file===g.RECEIPT?consent:file===g.TECHNICAL_RETRY.receiptPath?f.technicalRetryBytes:file===g.CONTROL?JSON.stringify(control):options.packageBytes||owner;
  const git=(_cmd,args)=>args[0]==='rev-parse'?f.sourceParent:args[1].endsWith(':'+g.RECEIPT)?consent:args[1].endsWith(':'+g.TECHNICAL_RETRY.receiptPath)?options.sourceRetryBytes||retry:options.ownerBytes||owner;
  Function('module','exports','require','Buffer','fetch',fs.readFileSync(path.join(__dirname,'gravicentra-i6-6-direction-preview-legal-acceptance.cjs'),'utf8'))(mod,mod.exports,name=>name==='node:fs'?{readFileSync:read}:name==='node:child_process'?{execFileSync:git}:require(name),Buffer,async()=>{calls.fetch++;return{status:200,arrayBuffer:async()=>options.hostedBytes||owner};});
  const page={waitForSelector:async()=>{calls.wait++;throw Error('INTENTIONAL_UI_BOUNDARY');},locator:()=>{calls.actions++;throw Error('UNEXPECTED_UI_ACTION');}};
  return{calls,run:()=>mod.exports.acceptDirectionPreviewLegal({page,actor:f.actor,cfg:f.cfg})};
}
test('the executing helper checks source-bound retry and unchanged owner before reaching ordinary UI',async()=>{
  const h=harness();await assert.rejects(h.run(),e=>e.message==='INTENTIONAL_UI_BOUNDARY'&&e.directionLegalSubstage==='VISIBLE_GATE_WAIT');
  assert.deepEqual(h.calls,{fetch:1,wait:1,actions:0});
});
test('mismatched retry source, owner, package or hosted bytes stop before UI actions',async()=>{
  for(const options of [
    {sourceRetryBytes:Buffer.from('wrong source receipt')},
    {ownerBytes:Buffer.from('changed legal owner')},
    {packageBytes:Buffer.from('wrong package')},
    {hostedBytes:Buffer.from('wrong hosted owner')},
    {mutate:f=>f.sourceParent=g.SOURCE_PARENT},
    {mutate:f=>f.candidate.legalTechnicalRetry.sourceSha='f'.repeat(40)}
  ]){const h=harness(options);await assert.rejects(h.run(),e=>e.message!=='INTENTIONAL_UI_BOUNDARY');assert.equal(h.calls.wait,0);assert.equal(h.calls.actions,0);}
});
