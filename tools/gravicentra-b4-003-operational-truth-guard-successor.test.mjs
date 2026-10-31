import test from 'node:test';
import assert from 'node:assert/strict';
import {progressSyncContract as k,progressSyncDocsPaths,progressSyncGuardPaths,
  validateProgressSyncData} from './gravicentra-b4-003-operational-truth-guard-successor.mjs';

const a='a'.repeat(40),b='b'.repeat(40),c='c'.repeat(40),d='d'.repeat(40);
const e='e'.repeat(40),f='f'.repeat(40),one='1'.repeat(40),two='2'.repeat(40);
const three='3'.repeat(40),four='4'.repeat(40);
const six=[
 'B4-003-P0-20261012-PERSONAL-COLLECTION',
 'B4-003-P0-20261012-INSTITUTIONAL-GOALS',
 'B4-003-P0-20261012-FREELANCERS-GOAL-SCOPE',
 'B4-003-P0-20261012-INICIO-MOTIVATIONAL-TEXTS',
 'B4-003-P0-20261012-QA-CANCELLED-RUN-FIXTURES',
 'B4-003-P0-20261012-QA-ORPHAN-RENEWALS'
];

function model() {
 const before=Object.fromEntries(Array.from({length:426},(_,i)=>['f'+i,{value:i}]));
 const ledgerFindings=Array.from({length:289},(_,i)=>({id:'historic-'+i,status:'PRESERVED'}));
 ledgerFindings.push(...six.map(id=>({id,status:id===six[1]?
   'RESOLVED_AUTHENTICATED_RUNTIME_PASS':'OPEN_P0_NOT_ACCEPTED'})));
 const ledger={findings:ledgerFindings,currentSixPriorityP0Closure:{
   resolved:1,open:5,total:6,b4003Closed:false}};
 const pointer={
   schema:'GRAVICENTRA_B4003_CURRENT_OPERATIONAL_TRUTH_POINTER_V1',
   status:'CURRENT_EVIDENCE_RECONCILED_B4_003_AND_NEW_LIVE_PROMOTION_HOLD',
   receiptPath:k.progressReceipt,dashboardPath:k.dashboard,
   receiptBlobSha:b,dashboardBlobSha:c,
   existingControlPlaneBlobBeforeSuccessor:a,
   sourceHeadBeforeSuccessor:k.baselineHead,
   previouslyExistingControlKeysPreserved:426,newFindingIds:0,
   frozenHistoricalFieldMutation:false,newGateOrReleaseAuthorization:false,
   currentInterpretation:{currentGlobalImplementationPercent:null,
     controlledLivePromotionAuthorized:false}
 };
 const current={...before,[k.controlKey]:pointer};
 const receipt={schema:'GRAVICENTRA_I65_B4003_CURRENT_OPERATIONAL_TRUTH_SYNC_V1',
   status:'CURRENT_EVIDENCE_SYNCHRONIZED_RELEASE_HOLD_NO_GATE_ADVANCE',
   baseHead:k.baselineHead,gate:'I6.5/B4-003',
   dashboard:{path:k.dashboard,blobSha:c},
   binding:{controlPlaneBeforeBlobSha:a,ledgerBlobSha:d,carryBlobSha:e,
     frozenMasterPlanBlobSha:f,controlGuardPath:k.guard,
     previousOperationalOverlayKey:'b4003RealProgressReconciliation20261030'},
   metrics:{formalI6:{closed:5,total:10,percent:50},
     priorityP0:{closed:1,total:6,percentClosed:16.67},
     globalImplementation:{percent:null}},
   priorityP0:six.map(id=>({id,ledgerStatus:id===six[1]?
     'RESOLVED_AUTHENTICATED_RUNTIME_PASS':'OPEN_P0_NOT_ACCEPTED',
     fullFindingClosed:id===six[1]}))};
 const guardReceipt={schema:'GRAVICENTRA_I65_B4003_OPERATIONAL_TRUTH_GUARD_SUCCESSOR_V1',
   status:'EXACT_GOVERNANCE_SUCCESSOR_PRESERVES_FROZEN_PREDECESSOR',
   baselineHead:k.baselineHead,progressCommit:k.publishedProgressHead,
   progressReceiptBlobSha:b,dashboardBlobSha:c,originalControlBlobSha:a,
   ledgerBlobSha:d,carryBlobSha:e,masterPlanBlobSha:f,compositionBlobSha:one,
   expectedSourcePaths:progressSyncDocsPaths,expectedGuardPaths:progressSyncGuardPaths,
   governanceBlobs:{[k.guard]:two,[k.validator]:three,[k.test]:four},
   boundaries:{livePromotion:false,businessDataWrite:false,authIamRulesChange:false,
     findingClosure:false,frozenArtifactRewrite:false,productSourceChanged:false,
     workflowChanged:false}};
 return {before,current,ledger,receipt,guardReceipt,
   originalControlBlob:a,progressReceiptBlob:b,dashboardBlob:c,ledgerBlob:d,
   carryBlob:e,masterBlob:f,compositionBlob:one,guardBlob:two,
   validatorBlob:three,testBlob:four};
}

test('exact cumulative read model preserves all 426 historical control keys',()=>{
 const result=validateProgressSyncData(model());
 assert.equal(result.controlKeysPreserved,426);
 assert.equal(result.findingsPreserved,295);
 assert.equal(result.priorityP0Closed,1);
 assert.equal(result.formalI6Percent,50);
 assert.equal(result.productionAccepted,false);
});
test('a previously certified control field cannot be rewritten',()=>{
 const m=model();m.current.f9={value:99};
 assert.throws(()=>validateProgressSyncData(m),/HISTORICAL_CONTROL_MUTATED/);
});
test('a fabricated progress increase is rejected',()=>{
 const m=model();m.receipt.metrics.formalI6.percent=60;
 assert.throws(()=>validateProgressSyncData(m),/PROGRESS_PERCENT_INVENTED_OR_GATE_ADVANCED/);
});
test('a P0 may not be silently reclassified',()=>{
 const m=model();m.receipt.priorityP0[0].ledgerStatus='RESOLVED_AUTHENTICATED_RUNTIME_PASS';
 assert.throws(()=>validateProgressSyncData(m),/PRIORITY_P0_STATUS_DRIFT/);
});
test('receipt and new guard blobs must match physical bindings',()=>{
 const m=model();m.guardReceipt.governanceBlobs[k.guard]=a;
 assert.throws(()=>validateProgressSyncData(m),/SUCCESSOR_RECEIPT_OR_GOVERNANCE_SHA_INVALID/);
});
test('the dashboard pointer cannot authorize production',()=>{
 const m=model();m.current[k.controlKey].currentInterpretation.controlledLivePromotionAuthorized=true;
 assert.throws(()=>validateProgressSyncData(m),/PROGRESS_PERCENT_INVENTED_OR_GATE_ADVANCED/);
});
test('new control fields beyond the single dated pointer are denied',()=>{
 const m=model();m.current.extra={};
 assert.throws(()=>validateProgressSyncData(m),/HISTORICAL_CONTROL_KEY_COUNTS_INVALID/);
});
