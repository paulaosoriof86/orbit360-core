'use strict';
// Scratch helper only. Reads evidence and returns a new progress object.
// It never writes files, calls an API, changes a release transport, or applies money.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const clone=x=>JSON.parse(JSON.stringify(x));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+Buffer.byteLength(b)+'\0'),Buffer.from(b)])).digest('hex');
const ROOT='artifacts/orbit360-recovery/release-control/';
const COMPLETION=ROOT+'I6_6_CENDOSO_155_APPLICATION_AND_MAPFRE_OBLIGATION_LIVE_20261124_R52.json';
const DIRECTION=ROOT+'I6_6_DIRECTION_URGENT_COMPLETION_TOLERANCE_AND_DIRECT_RENEWAL_20261124.json';
function loadEvidence({repo,baselineProgressPath,expectedBaselineBlob,censusSummaryFile,expectedCensusSummarySha256}){
 assert.ok(path.isAbsolute(repo));assert.ok(path.isAbsolute(censusSummaryFile));
 assert.match(baselineProgressPath,/^artifacts\/orbit360-recovery\/release-control\/I6_6_CURRENT_EXECUTION_PROGRESS_\d{8}_R\d+\.json$/);
 const read=p=>{const bytes=fs.readFileSync(path.join(repo,p));return {value:JSON.parse(bytes),ref:{path:p,gitBlobSha:blob(bytes),sha256:sha(bytes)}};};
 const baseline=read(baselineProgressPath),completion=read(COMPLETION),direction=read(DIRECTION);
 assert.equal(baseline.ref.gitBlobSha,expectedBaselineBlob,'BASELINE_PROGRESS_BLOB_DRIFT');
 assert.equal(completion.ref.gitBlobSha,'65a83d3d36b6d7f131be5cb61c559aa417f5e48f','R52_COMPLETION_BYTES_DRIFT');
 assert.equal(direction.ref.sha256,'cda5d408666e6e959248ea0a08ffa13f9e05a695fe41b3dedee20ba3d93f7c3d','R51_AUTHORITY_BYTES_DRIFT');
 const c=completion.value.cendoso,m=completion.value.mapfre;
 assert.equal(c.status,'ALL_155_EXISTING_DIRECT_PAYMENTS_APPLICATION_READBACK_PASS');
 assert.equal(c.applicationState,'APPLIED_DIRECT');assert.equal(c.targetCount,155);assert.equal(c.verifiedApplied,155);
 assert.equal(c.uniqueAcceptedTargetIds,155);assert.equal(c.registeredPaymentGrossCents,7880643);
 assert.equal(c.currency,'GTQ');assert.equal(c.exactManifestIdentitySetCovered,true);
 for(const k of ['newPayments','newObligations','bankMovements','amountChangesCents','paidDateChanges','remainingTargetHolds','committedUnverified'])assert.equal(c[k],0,'R52_NONZERO_'+k);
 assert.equal(c.writeOutcomeIndeterminate,false);assert.equal(c.insurerReconciliationProven,false);
 assert.equal(c.runs.reduce((n,r)=>n+r.applied,0),155);assert.equal(c.runs.reduce((n,r)=>n+r.grossCents,0),7880643);
 assert.equal(m.existingReceiptUpdates,2);assert.equal(m.existingPortfolioUpdates,2);assert.equal(m.auditCreates,1);
 assert.equal(m.newPayments,0);assert.equal(m.newObligations,0);assert.equal(m.cobroWrites,0);
 assert.equal(m.replayWrites,0);assert.equal(m.canonicalPaymentFollowThrough.paymentCount,2);
 assert.equal(m.canonicalPaymentFollowThrough.totalGrossCents,25554);
 assert.equal(m.canonicalPaymentFollowThrough.status,'READY_AFTER_OBLIGATION_CAS_NOT_EXECUTED');
 assert.equal(direction.value.decisions.extendPreviouslyApprovedToleranceToAllInsurersAndCases,true);
 const censusBytes=fs.readFileSync(censusSummaryFile),census=JSON.parse(censusBytes);
 assert.equal(sha(censusBytes),expectedCensusSummarySha256,'CENSUS_SUMMARY_BYTES_DRIFT');
 assert.equal(census.schema,'GI_I66_EXISTING_SOURCE56_PAYMENT_DISPOSITION_SUMMARY_V1');
 assert.equal(census.counts.reviewedUniquePaymentFacts,10);assert.equal(census.counts.pendingUniquePaymentFacts,9);
 assert.equal(census.counts.preparedCanonicalMapfrePaymentFacts,2);assert.equal(census.counts.otherHeldPaymentFacts,7);
 assert.equal(census.counts.eligibleAdditionalPaymentsCertified,0);assert.equal(census.writes,0);
 assert.deepEqual(Object.keys(census.source).sort(),['gitBlobSha','path','sha256']);
 assert.match(census.source.path,/^artifacts\/orbit360-recovery\/source-batches\/I6_6_NEW_INSURER_SOURCE_DELTA_20261124\.json$/);
 assert.equal(census.heldCases.length,7);
 for(const row of census.heldCases){
  assert.deepEqual(Object.keys(row).sort(),['caseId','disposition','insurer','sourceFactIdSha256','writeEligibilityCertified']);
  assert.match(row.caseId,/^DOC-\d{2}$/);assert.match(row.sourceFactIdSha256,/^[a-f0-9]{64}$/);
  assert.ok(['MAPFRE','GENERAL','UNIVERSALES'].includes(row.insurer));assert.match(row.disposition,/^HOLD_[A-Z_]+$/);
  assert.equal(row.writeEligibilityCertified,false);
 }
 const publicCountKeys=['distinctDocumentaryFacts','positivePaidSourceFacts','positivePaidSourceGrossCents',
  'extraMapfreCommissionAnchorInReviewedPaymentUnion','reviewedUniquePaymentFacts','excludedAlreadyAppliedPaymentFacts',
  'pendingUniquePaymentFacts','preparedCanonicalMapfrePaymentFacts','preparedCanonicalMapfreGrossCents',
  'otherHeldPaymentFacts','heldPaymentSourceGrossCents','eligibleAdditionalPaymentsCertified','newPaymentsExecutedByThisReview',
  'documentaryAmountsAreNotIncrementalPaymentsOrBalances','heldIncludesNewMedicalPolicyPaidInstallment2',
  'paidInstallment2NotCountedAsAdditionalEighthHold'];
 assert.deepEqual(Object.keys(census.counts).sort(),publicCountKeys.sort(),'PUBLIC_COUNT_SCHEMA_DRIFT');
 assert.ok(Object.values(census.counts).every(v=>typeof v==='boolean'||Number.isSafeInteger(v)),'PUBLIC_COUNT_VALUE_TYPE');
 const publicArtifactKeys=['runId','runAttempt','jobId','artifactId','archiveSha256','reportSha256','observedAtUtc',
  'financialCensusSha256','identityReportSha256','actualSourceSha','mode','readOnly','writes','protectedApplyJobsSkipped',
  'oldArtifactId','oldArtifactSha256','oldArtifactStillPresent','sourceFacts','candidatePolicyEditions',
  'exactNineFactsSelectedAfterRead','fullDataCountsAreDiagnosticAndNotPaymentIncrements'];
 assert.deepEqual(Object.keys(census.artifact).sort(),publicArtifactKeys.sort(),'PUBLIC_ARTIFACT_SCHEMA_DRIFT');
 for(const k of ['runId','runAttempt','jobId','artifactId','protectedApplyJobsSkipped','oldArtifactId','sourceFacts','candidatePolicyEditions'])
  assert.ok(Number.isSafeInteger(census.artifact[k])&&census.artifact[k]>0,'PUBLIC_ARTIFACT_NUMBER_'+k);
 for(const k of ['archiveSha256','reportSha256','financialCensusSha256','identityReportSha256','oldArtifactSha256'])
  assert.match(census.artifact[k],/^[a-f0-9]{64}$/,'PUBLIC_ARTIFACT_HASH_'+k);
 assert.match(census.artifact.actualSourceSha,/^[a-f0-9]{40}$/);
 assert.ok(Number.isFinite(Date.parse(census.artifact.observedAtUtc)));
 assert.equal(census.artifact.mode,'case-readback');assert.equal(census.artifact.readOnly,true);
 assert.equal(census.artifact.writes,0);assert.equal(census.artifact.protectedApplyJobsSkipped,6);
 assert.deepEqual(census.freshReadonlyRefresh,census.artifact,'FRESH_READONLY_SUMMARY_DRIFT');
 assert.ok(!/(?:cli|pol|cob|rec)_[a-z0-9_]+|drive:|[a-z0-9._%+-]+@[a-z0-9.-]+/i.test(census.next),'PRIVATE_ID_IN_PUBLIC_NEXT');
 for(const ref of census.receiptReferences){const actual=read(ref.path);assert.equal(actual.ref.gitBlobSha,ref.gitBlobSha);assert.equal(actual.ref.sha256,ref.sha256);}
 return {baseline:baseline.value,baselineRef:baseline.ref,completion:completion.value,completionRef:completion.ref,
  directionRef:direction.ref,census,censusSha256:sha(censusBytes)};
}
function reconcile(progress,e){
 const original=clone(progress),p=clone(progress),base=e.baseline,c=e.completion.cendoso,m=e.completion.mapfre;
 assert.equal(p.version,base.version+1,'NEXT_PROGRESS_VERSION_REQUIRED');
 assert.equal(p.previousEvidencePath,e.baselineRef.path,'NEXT_PROGRESS_BASELINE_PATH_DRIFT');
 assert.equal(p.previousEvidenceBlobSha,e.baselineRef.gitBlobSha,'NEXT_PROGRESS_BASELINE_BLOB_DRIFT');
 const key='financialSummaryReconciliation20261124';
 const id='R52_APPLICATION_COMPLETION_'+e.completionRef.gitBlobSha+'_FROM_R'+base.version;
 if(p[key]){
  assert.equal(p[key].reconciliationId,id,'OTHER_FINANCIAL_RECONCILIATION_ALREADY_PRESENT');
  assert.equal(p.financialWork.currentExecution20261124.historicalPayments.applicationState,'APPLIED_DIRECT');
  assert.equal(p.latestFinancialContinuation20261124.historicalPaymentApplicationState,'APPLIED_DIRECT');
  assert.equal(p.newStatementSourceWork20261124.existing155PaymentsRemainDirectPendingApplication,false);
  assert.equal(p[key].source56SummarySha256,e.censusSha256);
  return p;
 }
 assert.deepEqual(p.pendingApplicationCompletion,base.pendingApplicationCompletion,'COMPLETION_SUMMARY_CHANGED_AFTER_BASELINE');
 assert.equal(p.pendingApplicationCompletion.receiptBlob,e.completionRef.gitBlobSha);
 const history={reconciliationId:id,sourceProgress:e.baselineRef,sourceProgressVersion:base.version,
  reason:'Preserve the prior summaries as historical evidence; current summaries now reflect the already executed R52 application, without replaying or counting new payments.',
  snapshots:{latestFinancialContinuation20261124:clone(base.latestFinancialContinuation20261124),
   newStatementSourceWork20261124:clone(base.newStatementSourceWork20261124),
   historicalPayments:clone(base.financialWork.currentExecution20261124.historicalPayments),
   financialParallelLane:clone(base.parallelLanes.find(l=>l.id==='L4')),
   mapfreNextControlledPreflight:clone(base.mapfreNextControlledPreflight),
   pendingApplicationCompletion:clone(base.pendingApplicationCompletion)}};
 assert.ok(history.snapshots.financialParallelLane,'FINANCIAL_LANE_L4_REQUIRED');
 p.financialSummaryHistory20261124=[...(p.financialSummaryHistory20261124||[]),history];
 const applied={receipt:e.completionRef,status:c.status,applicationState:c.applicationState,
  verifiedExistingPayments:c.verifiedApplied,registeredPaymentGrossCents:c.registeredPaymentGrossCents,currency:c.currency,
  applicationRunIds:c.runs.map(r=>r.runId),newPayments:0,newObligations:0,bankMovements:0,
  amountChangesCents:0,paidDateChanges:0,insurerReconciliationProven:false,
  all155SinglePostCompletionCensusClaimed:false,
  countScope:'Application of the same155 previously created direct payments. Not155 additional payments or additional gross.'};
 const h=p.financialWork.currentExecution20261124.historicalPayments;
 assert.equal(h.applied,155);assert.equal(h.grossCents,7880643);assert.equal(h.directPayments,155);
 h.applicationState='APPLIED_DIRECT';h.applicationCompletion=clone(applied);
 h.creationCountersAreHistoricalAndNotIncremented=true;
 p.latestFinancialContinuation20261124.historicalPaymentApplicationState='APPLIED_DIRECT';
 p.latestFinancialContinuation20261124.historicalPaymentApplicationCompletion=clone(applied);
 p.latestFinancialContinuation20261124.originalObligationCreationCountersPreserved=true;
 const ns=p.newStatementSourceWork20261124;
 ns.existing155PaymentsRemainDirectPendingApplication=false;
 ns.existing155PaymentsCurrentApplicationState='APPLIED_DIRECT';
 ns.existing155ApplicationCompletion=clone(applied);
 ns.currentPaymentDisposition={status:e.census.status,counts:clone(e.census.counts),
  source:clone(e.census.source),artifact:clone(e.census.artifact),
  heldCases:clone(e.census.heldCases),summarySha256:e.censusSha256,
  privateMatrixSha256:e.census.privateMatrixSha256,
  countBoundary:'Nine unresolved documentary payment facts, not nine admitted new payments; the paid second medical installment is already included in the seven HOLD cases. The previously applied Universales installment remains excluded.',
  newPaymentsApplied:0,additionalWriteEligibilityCertified:false,
  ...(e.census.freshReadonlyRefresh?{freshReadonlyRefresh:clone(e.census.freshReadonlyRefresh)}:{})};
 ns.next=e.census.next;
 const lane=p.parallelLanes.find(l=>l.id==='L4');assert.ok(lane);
 lane.status='155_DIRECT_PAYMENTS_APPLIED_2_MAPFRE_CANONICAL_PAYMENTS_PENDING_7_DOCUMENTARY_HOLDS_OPEN';
 lane.applicationReceipt=e.completionRef;lane.pendingDocumentaryFacts=9;
 lane.obligationCountsPreservedFromFinancialWork=true;
 const mf=p.mapfreNextControlledPreflight;
 mf.status='OBLIGATION_CAS_READBACK_PASS_TWO_CANONICAL_PAYMENTS_NOT_EXECUTED';
 mf.requiredObligationCorrections=0;mf.completedObligationCorrections=2;
 mf.completedObligationCorrectionReceipt=e.completionRef;
 mf.obligationCorrectionRunId=m.runId;mf.previousPreflightBusinessWritesWereZero=true;
 mf.businessWrites=m.totalTechnicalWrites;mf.businessWritesScope='Already executed R52 obligation CAS: two receipts, two portfolios, one audit. No new write by this summary.';
 mf.newPayments=0;mf.newObligations=0;mf.obligationCorrectionReplayWrites=0;
 mf.canonicalPaymentFollowThrough=clone(m.canonicalPaymentFollowThrough);
 mf.elRobleD01ToleranceNotUniversal=false;mf.toleranceDirectionAuthority=e.directionRef;
 mf.maxApprovedGtqVarianceCents=m.approvedToleranceCents;
 mf.generalToleranceProductPublicationPending=true;
 p.pendingApplicationCompletion={...p.pendingApplicationCompletion,status:c.status,
  verifiedExistingPayments:155,applicationState:'APPLIED_DIRECT',registeredPaymentGrossCents:7880643,
  newPayments:0,amountChangesCents:0,paidDateChanges:0,
  scope:'The same155 existing direct payments; no increment to historical creation totals.'};
 p[key]={schema:'GI_I66_CURRENT_FINANCIAL_SUMMARY_RECONCILIATION_V1',reconciliationId:id,
  priorProgress:e.baselineRef,currentProgressVersion:p.version,completionReceipt:e.completionRef,
  directionAuthority:e.directionRef,source56SummarySha256:e.censusSha256,
  refreshedCurrentSummaries:true,historicalSnapshotsPreserved:true,
  existingPaymentCountBefore:155,existingPaymentCountAfter:155,
  existingRegisteredGrossCentsBefore:7880643,existingRegisteredGrossCentsAfter:7880643,
  newPayments:0,newObligations:0,financialWrites:0,transportChanges:0,releaseAcceptanceChanges:0,
  pendingUniqueDocumentaryPaymentFacts:9,preparedCanonicalMapfreFacts:2,otherHeldFacts:7,
  allPaymentsClosed:false,fullI66ProductionAccepted:false};
 // Preserve every other product/release/gate surface byte-for-byte as JSON values.
 const allowed=new Set(['financialWork','latestFinancialContinuation20261124','newStatementSourceWork20261124',
  'parallelLanes','mapfreNextControlledPreflight','pendingApplicationCompletion','financialSummaryHistory20261124',key]);
 for(const k of Object.keys(original))if(!allowed.has(k))assert.deepEqual(p[k],original[k],'UNRELATED_PROGRESS_FIELD_CHANGED_'+k);
 const stripped=clone(p.financialWork);stripped.currentExecution20261124.historicalPayments=clone(original.financialWork.currentExecution20261124.historicalPayments);
 assert.deepEqual(stripped,original.financialWork,'UNRELATED_FINANCIAL_COUNTER_CHANGED');
 for(const k of ['applied','grossCents','directPayments','historicalClosedReceiptCreates','historicalClosedPortfolioCreates','confirmedUnreconciledCobrosCreated'])
  assert.equal(h[k],original.financialWork.currentExecution20261124.historicalPayments[k],'PAYMENT_CREATION_COUNTER_CHANGED_'+k);
 assert.equal(p.latestFinancialContinuation20261124.newPayments,original.latestFinancialContinuation20261124.newPayments);
 assert.equal(ns.newLiveWritesFromThisSourceCertified,original.newStatementSourceWork20261124.newLiveWritesFromThisSourceCertified);
 assert.equal(ns.positivePaidSourceFacts,9);assert.equal(ns.distinctFacts,56);
 return p;
}
module.exports={loadEvidence,reconcile,sha,blob};
