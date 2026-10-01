'use strict';

const crypto=require('node:crypto');
const data=require('./cotcomp-runtime-data-contract');
const proposals=require('./cotcomp-proposal-contracts');
const versioning=require('./cotcomp-proposal-versioning-contract-s452');

const VERSION='ays-cotcomp-selection-contract-s455-v1.0';
const EXECUTION_ENABLED=false;
const APP_DATA_READS_ALLOWED=false;
const APP_DATA_WRITES_ALLOWED=false;
const PHYSICAL_W4_ALLOWED=false;

function clean(v,max=240){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);}
function stable(v){
  if(v==null)return v;
  if(Array.isArray(v))return v.map(stable);
  if(typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));
  return v;
}
function digest(v){return crypto.createHash('sha256').update(JSON.stringify(stable(v)),'utf8').digest('hex');}

function validatePrerequisites({tenantId,caseId,comparisonSet,proposal,quoteCase,asOf}={}){
  const reasons=[];
  tenantId=clean(tenantId,180); caseId=clean(caseId,180);
  if(!tenantId)reasons.push('TENANT_REQUIRED');
  if(!caseId)reasons.push('CASE_REQUIRED');
  if(!comparisonSet||typeof comparisonSet!=='object')reasons.push('COMPARISON_SET_REQUIRED');
  if(!proposal||typeof proposal!=='object')reasons.push('PROPOSAL_REQUIRED');
  if(!quoteCase||typeof quoteCase!=='object')reasons.push('QUOTE_CASE_REQUIRED');
  if(reasons.length)return {ok:false,reasons};

  if(clean(quoteCase.tenantId,180)!==tenantId||clean(quoteCase.caseId,180)!==caseId)reasons.push('QUOTE_CASE_LINK_MISMATCH');
  if(clean(comparisonSet.tenantId,180)!==tenantId||clean(comparisonSet.caseId,180)!==caseId)reasons.push('COMPARISON_SET_CASE_LINK_MISMATCH');
  if(clean(proposal.tenantId,180)!==tenantId||clean(proposal.caseId,180)!==caseId)reasons.push('PROPOSAL_CASE_LINK_MISMATCH');

  const proposalId=clean(proposal.proposalId,180);
  const members=Array.isArray(comparisonSet.proposalIds)?comparisonSet.proposalIds.map(x=>clean(x,180)):[];
  if(!proposalId||!members.includes(proposalId))reasons.push('PROPOSAL_NOT_IN_COMPARISON_SET');

  if(proposal.isCurrentVersion!==true)reasons.push('PROPOSAL_NOT_CURRENT_VERSION');
  const validity=versioning.evaluateCurrentValidity(proposal.validity,asOf);
  const eligible=proposals.evaluateComparisonEligibility(proposal,{currentValidityConfirmed:validity.current===true});
  if(validity.current!==true)reasons.push('PROPOSAL_VALIDITY_NOT_CURRENT');
  if(eligible.eligible!==true)reasons.push('PROPOSAL_NOT_COMPARISON_ELIGIBLE');

  if(comparisonSet.rankingPolicy!=='NONE_BY_DEFAULT'||comparisonSet.silentWeighting!==false)reasons.push('COMPARISON_SET_TRUTH_MISMATCH');

  const existingSelected=clean(quoteCase.selectedProposalId,180);
  if(existingSelected&&existingSelected!==proposalId)reasons.push('QUOTE_CASE_ALREADY_SELECTED_DIFFERENT_PROPOSAL');

  return {
    ok:reasons.length===0,
    reasons:Object.freeze(reasons),
    validity:Object.freeze(validity),
    comparisonEligibility:Object.freeze(eligible)
  };
}

function requestDigest(input={}){
  return digest({
    tenantId:clean(input.tenantId,180),
    caseId:clean(input.caseId,180),
    comparisonSetId:clean(input.comparisonSetId,180),
    proposalId:clean(input.proposalId,180),
    explicitUserChoice:input.explicitUserChoice===true,
    status:data.SELECTION_TRUTH.status,
    issuanceState:data.SELECTION_TRUTH.issuanceState,
    bindingState:data.SELECTION_TRUTH.bindingState,
    coverageState:data.SELECTION_TRUTH.coverageState
  });
}

function buildAtomicSelectionPlan(input={}){
  if(input.explicitUserChoice!==true)return {ok:false,code:'EXPLICIT_USER_CHOICE_REQUIRED'};

  const selectionBase=data.buildSelection({
    tenantId:input.tenantId,
    caseId:input.caseId,
    comparisonSetId:input.comparisonSetId,
    proposalId:input.proposalId,
    selectionRequestKey:input.selectionRequestKey,
    explicitUserChoice:true,
    createdAt:input.createdAt||null
  });
  if(!selectionBase.ok)return selectionBase;

  const prereq=validatePrerequisites({
    tenantId:input.tenantId,
    caseId:input.caseId,
    comparisonSet:input.comparisonSet,
    proposal:input.proposal,
    quoteCase:input.quoteCase,
    asOf:input.asOf
  });
  if(!prereq.ok)return {ok:false,code:'SELECTION_PREREQUISITE_INVALID',reasons:prereq.reasons};

  const selectionRequestId=selectionBase.value.selectionRequestId;
  const reqDigest=requestDigest({
    tenantId:input.tenantId,
    caseId:input.caseId,
    comparisonSetId:input.comparisonSetId,
    proposalId:input.proposalId,
    explicitUserChoice:true
  });

  const selection=Object.freeze({...selectionBase.value,requestDigest:reqDigest});
  const quoteCasePatch=Object.freeze({
    selectedProposalId:selection.proposalId,
    selectedComparisonSetId:selection.comparisonSetId,
    selectionId:selection.selectionId,
    status:'USER_SELECTED'
  });
  const quoteCasePath=data.pathFor(input.tenantId,data.ENTITY.QUOTE_CASE,input.caseId);
  const comparisonSetPath=data.pathFor(input.tenantId,data.ENTITY.COMPARISON_SET,input.comparisonSetId);
  const proposalPath=data.pathFor(input.tenantId,data.ENTITY.PROPOSAL,input.proposalId);
  const selectionPath=data.pathFor(input.tenantId,data.ENTITY.SELECTION,selection.selectionId);
  const requestPath=data.pathFor(input.tenantId,data.ENTITY.IDEMPOTENCY,selectionRequestId);

  const requestRecord=Object.freeze({
    schemaVersion:VERSION,
    kind:'SELECTION',
    tenantId:clean(input.tenantId,180),
    caseId:clean(input.caseId,180),
    selectionRequestId,
    selectionId:selection.selectionId,
    comparisonSetId:selection.comparisonSetId,
    proposalId:selection.proposalId,
    requestDigest:reqDigest,
    status:'COMMITTED'
  });

  return Object.freeze({
    ok:true,
    version:VERSION,
    atomic:true,
    executionEnabled:EXECUTION_ENABLED,
    physicalW4Allowed:false,
    selectionRequestId,
    requestDigest:reqDigest,
    selection,
    prerequisiteReadSet:Object.freeze([
      Object.freeze({entity:'quoteCase',path:quoteCasePath,expectedDigest:digest(input.quoteCase)}),
      Object.freeze({entity:'comparisonSet',path:comparisonSetPath,expectedDigest:digest(input.comparisonSet)}),
      Object.freeze({entity:'proposal',path:proposalPath,expectedDigest:digest(input.proposal)})
    ]),
    operations:Object.freeze([
      Object.freeze({type:'CREATE_IF_ABSENT',entity:'selection',path:selectionPath,payload:selection}),
      Object.freeze({type:'CREATE_IDEMPOTENCY_IF_ABSENT',entity:'selectionRequest',path:requestPath,payload:requestRecord}),
      Object.freeze({type:'UPDATE_EXACT_IF_DIGEST_MATCH_PATCH',entity:'quoteCase',path:quoteCasePath,expectedBeforeDigest:digest(input.quoteCase),patch:quoteCasePatch})
    ]),
    invariants:Object.freeze({
      explicitUserChoiceRequired:true,
      selectedProposalMustBelongToComparisonSet:true,
      proposalMustMatchCase:true,
      proposalMustBeValidatedCurrentVersion:true,
      quoteCasePatchAtomicWithSelection:true,
      sameRequestSamePayloadWrites:0,
      sameRequestChangedPayload:'DENY',
      immutableSelection:true,
      selectionIsIssuance:false,
      selectionIsBinding:false,
      selectionConfirmsCoverage:false
    }),
    truth:data.SELECTION_TRUTH
  });
}

function retryDecision(existingRequest,incomingDigest){
  if(!existingRequest||typeof existingRequest!=='object')return {action:'NEW',writesAllowedByDecision:true};
  if(existingRequest.status==='COMMITTED'&&clean(existingRequest.requestDigest,80)===clean(incomingDigest,80)){
    return {action:'REUSE',writesAllowedByDecision:false,writes:0};
  }
  return {action:'DENY',writesAllowedByDecision:false,writes:0,code:'SELECTION_IDEMPOTENCY_CONFLICT'};
}

function syntheticFixture(){
  const tenantId='alianzas-soluciones';
  const caseId='qcase_s455_synthetic';
  const proposal=Object.freeze({
    schemaVersion:'synthetic',
    tenantId,proposalId:'proposal_s455_v2',caseId,country:'GT',product:'AUTO',currency:'GTQ',
    insurerId:'ins_s455',insurerDisplayName:'Synthetic Insurer',planName:'Synthetic Plan',
    sourceId:'source_s455',premium:2600,coverages:{},limits:{},sublimits:{},deductibles:{},
    assistance:{},conditions:[],exclusions:[],
    validity:{validFrom:'2026-10-01T00:00:00Z',validUntil:'2026-10-31T23:59:59Z'},
    provenance:{synthetic:true},validationState:'VALIDATED',validatedBy:'s455',validatedAt:'2026-10-01T00:00:00Z',
    proposalSeriesId:'pseries_s455',versionNumber:2,isCurrentVersion:true,supersedesProposalId:'proposal_s455_v1',supersededByProposalId:''
  });
  const comparisonSet=data.buildComparisonSet({tenantId,caseId,proposalIds:[proposal.proposalId],criteriaKeys:['premium'],generatedAt:'2026-10-01T00:00:00Z'}).value;
  const quoteCase=data.buildQuoteCase({
    tenantId,caseId,journeyId:'GT_AUTO_MOTO_HYBRID',correlationId:'corr_s455',country:'GT',
    source:'PUBLIC_WEB',intent:'COTIZAR',riskOrProductCandidate:'AUTO',status:'PROPOSALS_AVAILABLE'
  }).value;
  const plan=buildAtomicSelectionPlan({
    tenantId,caseId,comparisonSetId:comparisonSet.comparisonSetId,proposalId:proposal.proposalId,
    selectionRequestKey:'s455-selection-1',explicitUserChoice:true,
    comparisonSet,proposal,quoteCase,asOf:'2026-10-15T12:00:00Z'
  });
  return Object.freeze({
    tenantId,caseId,proposal,comparisonSet,quoteCase,plan,
    physicalProofModel:Object.freeze({
      setupCreatedPaths:Object.freeze([
        data.pathFor(tenantId,data.ENTITY.QUOTE_CASE,caseId),
        data.pathFor(tenantId,data.ENTITY.PROPOSAL,proposal.proposalId),
        data.pathFor(tenantId,data.ENTITY.COMPARISON_SET,comparisonSet.comparisonSetId)
      ]),
      selectionCreatedPaths:Object.freeze([
        data.pathFor(tenantId,data.ENTITY.SELECTION,plan.selection.selectionId),
        data.pathFor(tenantId,data.ENTITY.IDEMPOTENCY,plan.selectionRequestId)
      ]),
      quoteCasePatchPath:data.pathFor(tenantId,data.ENTITY.QUOTE_CASE,caseId),
      expectedSetupWrites:3,
      expectedSelectionAtomicWrites:3,
      expectedRetryWrites:0,
      expectedConflictWrites:0,
      expectedCleanupDeletes:5,
      expectedTotalMutations:11,
      finalAbsenceRequired:true
    })
  });
}

function readiness(){
  const fx=syntheticFixture();
  const blockers=[];
  if(!fx.plan.ok)blockers.push(fx.plan.code||'SELECTION_PLAN_INVALID');
  if(fx.plan.ok){
    if(fx.plan.operations.length!==3||fx.plan.atomic!==true)blockers.push('SELECTION_ATOMIC_CASE_PATCH_REQUIRED');
    if(fx.plan.selection.issuanceState!=='NOT_ISSUED'||fx.plan.selection.bindingState!=='NOT_BOUND'||fx.plan.selection.coverageState!=='NOT_CONFIRMED')blockers.push('SELECTION_TRUTH_LOCK_INVALID');
    if(fx.physicalProofModel.expectedCleanupDeletes!==5||fx.physicalProofModel.expectedTotalMutations!==11)blockers.push('W4_PHYSICAL_ROLLBACK_JOURNAL_REQUIRED');
  }
  const technical=blockers.length===0;
  return Object.freeze({
    version:VERSION,
    sourceContractReady:technical,
    technicalW4Ready:technical,
    physicalW4Ready:false,
    physicalW4Allowed:false,
    remainingBlockers:Object.freeze(technical?['OWNER_W4_AUTHORIZATION_REQUIRED']:[...blockers,'OWNER_W4_AUTHORIZATION_REQUIRED']),
    fixture:fx,
    boundaries:Object.freeze({
      executionEnabled:EXECUTION_ENABLED,
      appDataReadsAllowed:APP_DATA_READS_ALLOWED,
      appDataWritesAllowed:APP_DATA_WRITES_ALLOWED,
      realDataAllowed:false,
      productionAllowed:false
    })
  });
}

module.exports=Object.freeze({
  VERSION,EXECUTION_ENABLED,APP_DATA_READS_ALLOWED,APP_DATA_WRITES_ALLOWED,PHYSICAL_W4_ALLOWED,
  digest,validatePrerequisites,requestDigest,buildAtomicSelectionPlan,retryDecision,syntheticFixture,readiness
});
