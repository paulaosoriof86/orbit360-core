'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-proposal-versioning-contract-s452');

function base(overrides={}){
  return Object.assign({
    tenantId:'alianzas-soluciones',
    caseId:'qcase_s452',
    country:'GT',
    product:'AUTO',
    currency:'GTQ',
    insurerId:'ins1',
    insurerDisplayName:'Insurer',
    sourceId:'src1',
    planName:'Plan A',
    premium:2500,
    coverages:{},
    limits:{},
    sublimits:{},
    deductibles:{},
    assistance:{},
    conditions:[],
    exclusions:[],
    validity:{validFrom:'2026-10-01T00:00:00Z',validUntil:'2026-10-31T23:59:59Z'},
    provenance:{synthetic:true},
    validationState:'VALIDATED',
    validatedBy:'qa',
    validatedAt:'2026-10-01T00:00:00Z'
  },overrides);
}

test('S4.52 remains source-only and physical W3 is hard-closed',()=>{
  assert.equal(s.EXECUTION_ENABLED,false);
  assert.equal(s.APP_DATA_READS_ALLOWED,false);
  assert.equal(s.APP_DATA_WRITES_ALLOWED,false);
  assert.equal(s.PROVIDER_OR_RATER_CALLS_ALLOWED,false);
  assert.equal(s.PHYSICAL_W3_ALLOWED,false);
});

test('validity is persisted as timezone-qualified interval and derived deterministically',()=>{
  const n=s.normalizeValidity(base().validity);
  assert.equal(n.ok,true);
  assert.equal(s.evaluateCurrentValidity(n.value,'2026-10-15T12:00:00Z').current,true);
  assert.equal(s.evaluateCurrentValidity(n.value,'2026-11-01T00:00:00Z').reason,'EXPIRED');
  assert.equal(s.normalizeValidity({validFrom:'2026-10-01',validUntil:'2026-10-31'}).ok,false);
});

test('proposal series and version ids are deterministic and version-specific',()=>{
  const a=s.buildVersionedProposal(base({versionNumber:1}));
  const b=s.buildVersionedProposal(base({versionNumber:1}));
  assert.equal(a.ok,true);
  assert.equal(a.proposalSeriesId,b.proposalSeriesId);
  assert.equal(a.proposalId,b.proposalId);
  const v2Id=s.deriveProposalId(a.proposalSeriesId,2);
  assert.equal(v2Id.ok,true);
  assert.notEqual(v2Id.proposalId,a.proposalId);
});

test('public quoteCaseId alias maps to canonical persisted caseId and conflicts fail closed',()=>{
  const x=base({quoteCaseId:'qcase_alias',caseId:undefined,versionNumber:1});
  const built=s.buildVersionedProposal(x);
  assert.equal(built.ok,true);
  assert.equal(built.value.caseId,'qcase_alias');
  const conflict=s.buildVersionedProposal(base({caseId:'A',quoteCaseId:'B',versionNumber:1}));
  assert.equal(conflict.ok,false);
});

test('version 2 requires exact sequential supersession of current version 1',()=>{
  const v1=s.buildAtomicVersionPlan(base({versionNumber:1,requestKey:'r1'}));
  assert.equal(v1.ok,true);
  const v2=s.buildAtomicVersionPlan(base({
    versionNumber:2,requestKey:'r2',premium:2600,
    supersedesProposalId:v1.proposal.proposalId,
    previousProposal:v1.proposal
  }));
  assert.equal(v2.ok,true);
  assert.equal(v2.operations.length,3);
  const priorUpdate=v2.operations.find(x=>x.entity==='proposal_previous');
  assert.equal(priorUpdate.payload.validationState,'SUPERSEDED');
  assert.equal(priorUpdate.payload.isCurrentVersion,false);
  assert.equal(priorUpdate.payload.supersededByProposalId,v2.proposal.proposalId);
  assert.equal(v2.proposal.isCurrentVersion,true);
});

test('same request same digest reuses with zero writes and changed digest is denied',()=>{
  const plan=s.buildAtomicVersionPlan(base({versionNumber:1,requestKey:'r1'}));
  const existing={status:'COMMITTED',requestDigest:plan.requestDigest};
  assert.deepEqual(s.retryDecision(existing,{requestDigest:plan.requestDigest}),{
    action:'REUSE',writesAllowedByDecision:false,writes:0
  });
  const denied=s.retryDecision(existing,{requestDigest:'different'});
  assert.equal(denied.action,'DENY');
  assert.equal(denied.writes,0);
  assert.equal(denied.code,'PROPOSAL_IDEMPOTENCY_CONFLICT');
});

test('synthetic W3 lifecycle freezes exact journal and final-absence sequence',()=>{
  const life=s.buildSyntheticW3Lifecycle();
  assert.equal(life.ok,true);
  assert.equal(life.journal.expectedCreatedDocuments,4);
  assert.equal(life.journal.expectedVersion2AtomicWrites,3);
  assert.equal(life.journal.cleanupDeletePaths.length,4);
  assert.equal(life.journal.finalAbsenceRequired,true);
  assert.equal(life.v1After.validationState,'SUPERSEDED');
  assert.equal(life.v1After.isCurrentVersion,false);
  assert.equal(life.v2.proposal.isCurrentVersion,true);
  assert.ok(life.proofSequence.includes('VERIFY_VALIDATED_AND_CURRENT_V2_ONLY'));
});

test('readiness closes technical source blockers but leaves Owner W3 authorization',()=>{
  const r=s.readiness();
  assert.equal(r.sourceContractReady,true);
  assert.equal(r.technicalW3Ready,true);
  assert.equal(r.physicalW3Ready,false);
  assert.equal(r.physicalW3Allowed,false);
  assert.deepEqual(r.blockers,['OWNER_W3_AUTHORIZATION_REQUIRED']);
});
