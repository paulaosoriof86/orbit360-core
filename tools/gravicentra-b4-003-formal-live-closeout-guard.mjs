import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

// Terminal B4-003 metadata reconciliation only. No network or product execution.
// Existing frozen control keys remain immutable except the explicit fields below,
// and only after the exact current42 LIVE receipts physically support the seal.
const ROOT='artifacts/orbit360-recovery/release-control/';
const STATE='orbit360-platform/docs/recovery/orbit360-recovery-state-v1.json';
const CURSOR='b4003ActiveCertificationCursor20261106';
const INVENTORY='b4003CertificationInventory20261106';
const SOURCE='857f1222f360a42a06e012810a1c01bce155a26f';
const BUILD='gi-i65-b4-857f1222f360-57f234755dc1';
const VERSION='sites/ays-orbit-360-lab/versions/c5e1ae001fae793b';
const DIGEST='308b669105c380294177f1a8d2350216af95fec31f800955d611e607542b42da';
const FIXTURE='asg_mw5qeno8';
const FINAL_ACTION='B4_003_CLOSED_RETURN_TO_FROZEN_PLAN_NEXT_GATE_NOT_EXECUTED';
const CERTS={
 promotion:'3e07e1e21192e878af668d03d077c8368837024c',
 readonlyUi:'56c8360ec284030b25f33b0f6d943464f3962ccf',
 failedCreate:'98d59774740eae283ac395c130621d9f4ebf9d41'
};
const LEDGER=ROOT+'I6_FINDINGS_LEDGER_20260924.json';
const REGISTER=ROOT+'I6_5_OPEN_FINDINGS_CARRY_FORWARD_REGISTER_20261003.json';
const CAPABILITY=ROOT+'CAPABILITY_STATUS_LEDGER.json';
const MASTER=ROOT+'I6_PENDING_CLOSURE_MASTER_PLAN_LOCK_20261004.json';
const PLAN=ROOT+'I6_5_B4_003_ONE_LIVE_SYNTHETIC_INSURER_PLAN_20261107.json';
const SELF='tools/gravicentra-b4-003-formal-live-closeout-guard.mjs';
const PARENT_GUARD='tools/gravicentra-b4-003-real-country-index-evidence-successor.mjs';
const QA_IDS=['B4-003-P0-20261012-QA-CANCELLED-RUN-FIXTURES','B4-003-P0-20261012-QA-ORPHAN-RENEWALS'];
const MIRROR_IDS=[
 'B4-003-P0-20261012-PERSONAL-COLLECTION',
 'B4-003-P0-20261012-FREELANCERS-GOAL-SCOPE',
 'B4-003-P0-20261012-INICIO-MOTIVATIONAL-TEXTS',...QA_IDS
];
const B4_KEYS=['status','blocking','closureStatus','closureReceiptPath','closureReceiptBlobSha','closureReceiptSha256','currentReleaseClosure20261107','priorB4003StatusPreserved','nextAction'];
const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const clone=x=>JSON.parse(JSON.stringify(x));
const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const need=(ok,code)=>{if(!ok)throw Error('B4_003_FINAL_LIVE_CLOSEOUT_'+code);};
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const old=(head,p)=>JSON.parse(execFileSync('git',['show',head+':'+p],{encoding:'utf8',maxBuffer:64*1024*1024}));
const at=(o,p)=>p.split('/').filter(Boolean).reduce((v,k)=>v?.[k],o);
function assign(o,p,value,remove=false){const ks=p.split('/').filter(Boolean);let x=o;for(const k of ks.slice(0,-1))x=x[k]??={};if(remove)delete x[ks.at(-1)];else x[ks.at(-1)]=clone(value);}
function restoreField(target,base,p){const v=at(base,p);assign(target,p,v,v===undefined);}
function reference(ref,label){
 need(ref&&typeof ref.path==='string'&&ref.path.startsWith(ROOT)&&!ref.path.includes('..')&&ref.path.endsWith('.json'),'RECEIPT_PATH_'+label);
 const b=fs.readFileSync(ref.path);
 need(/^[a-f0-9]{40}$/.test(ref.blobSha||'')&&blob(b)===ref.blobSha,'RECEIPT_BLOB_'+label);
 need(/^[a-f0-9]{64}$/.test(ref.sha256||'')&&sha(b)===ref.sha256,'RECEIPT_SHA256_'+label);
 return JSON.parse(b);
}
function payloadDigest(command){
 const normalized=command.mutations.map(m=>({action:m.action,collection:m.collection,id:m.id,payload:m.payload?stable(m.payload):null,...(m.collection==='aseguradoras'&&m.action!=='remove'?{auditReason:m.auditReason||''}:{})}));
 return sha(JSON.stringify(stable(normalized)));
}
const expectedEvent=request=>'opevt_'+sha('alianzas-soluciones|'+request).slice(0,28);
export function validateCompleteEvidence(ev,plan){
 need(ev?.schema==='B4_003_ONE_LIVE_SYNTHETIC_PHASE_EVIDENCE_V1'&&ev.phase==='complete'&&ev.status==='CLEANED_CANONICAL_ABSENCE_UI_EVIDENCE_REQUIRED','COMPLETE_STATUS');
 need(ev.customTokensIssued===1&&ev.tokensPreviouslyIssued===1&&ev.tokenBudgetMaximumTotal===2,'TOKEN_BUDGET');
 need(ev.previousCreateRunId==='42327828328'&&ev.previousCreateReceiptBlobSha===CERTS.failedCreate,'PREVIOUS_ATTEMPT');
 need(ev.fixtureId===FIXTURE&&ev.sourceSha===SOURCE&&ev.buildId===BUILD&&ev.hostingVersion===VERSION,'COMPLETE_IDENTITY');
 need(ev.principalUidSha256===sha('pL8zkGdq6phHm5z2DiXIcoNHiw83')&&ev.activeRole==='superadmin'&&ev.planSha256==='a318932d732917737953c42a380b884ba200307f5e804c3b32c06662c012dcb6'&&/^[0-9]+$/.test(String(ev.workflowRunId||'')),'COMPLETE_PRINCIPAL_PLAN');
 need(Array.isArray(ev.errors)&&ev.errors.length===0&&ev.browserAutomated===false&&ev.visibleUiReloadClaimed===false,'COMPLETE_HONEST_BOUNDARY');
 const o=ev.observations||{};
 need(o.beforeExists===false&&o.afterCreate?.id===FIXTURE&&o.afterCreate.tenantMatched===true&&o.afterCreate.actorMatched===true&&o.afterCreate.serverOwnedActivity===true,'CREATE_PERSISTED');
 for(const [key,command] of [['createAudit',plan.commands.create],['cleanupAudit',plan.commands.cleanup]]){
  const a=o[key];
  need(a?.requestId===command.requestId&&a.eventId===expectedEvent(command.requestId)&&a.requestCommitted===true&&a.eventMatched===true&&a.actorMatched===true&&a.payloadDigest===payloadDigest(command),'AUDIT_'+key);
 }
 need(o.finalCanonicalAbsence===true&&o.externalAudit?.id==='audasg_b4003_live_mw5qeno8'&&o.externalAudit.exists===true&&o.externalAudit.fixtureMatched===true&&o.externalAudit.actorMatched===true,'ATOMIC_CLEANUP_ABSENCE');
 need(o.relations?.matches===0&&o.sideEffectsBefore?.matches===0&&o.sideEffectsAfterCreate?.matches===0&&o.sideEffectsAfterCleanup?.matches===0,'UNEXPECTED_SIDE_EFFECT');
 need(o.uiWindow?.durationMs===240000&&Date.parse(o.uiWindow.closedAtUtc)>=Date.parse(o.uiWindow.openedAtUtc)+240000&&o.uiWindow.uiObservationByThisHelper===false,'UI_WINDOW');
 return true;
}
function uiEvidence(ui,phase){
 need(ui.status==='PASS_VISIBLE_UI_AFTER_'+phase+'_RELOAD'&&ui.fixtureId===FIXTURE&&ui.buildId===BUILD&&ui.actualPaulaSession===true&&ui.reloadObserved===true,'ACTUAL_UI_'+phase);
 if(phase==='CLEANUP')need(ui.fixtureAbsent===true,'UI_FINAL_ABSENCE');
}
function releaseIdentity(x){
 return x.sourceSha===SOURCE&&x.buildId===BUILD&&x.hostingVersion===VERSION&&Number(x.artifactId)===13549460562&&x.hostedPayloadDigest===DIGEST;
}
function restoreKeys(target,base,keys){for(const key of keys)restoreField(target,base,'/'+key);}
function verifyLedgerMetadata(r,seal,cp,parent){
 const priorLedger=old(parent,LEDGER),ledger=read(LEDGER),priorRegister=old(parent,REGISTER),reg=read(REGISTER);
 need(ledger.findings.length===295&&reg.inventory.length===295,'FINDING_COUNT');
 const ids=rows=>rows.map(x=>x.id).sort();
 need(same(ids(ledger.findings),ids(priorLedger.findings))&&same(ids(reg.inventory),ids(ledger.findings)),'STABLE_FINDING_IDS');
 const byId=rows=>new Map(rows.map(x=>[x.id,x]));
 const led=byId(ledger.findings),prev=byId(priorLedger.findings),regMap=byId(reg.inventory);
 const row=led.get('B4-003'),rr=regMap.get('B4-003');
 for(const current of [row,rr]){
  need(current.status==='CLOSED_PASS'&&current.blocking===false&&current.closureStatus==='LATEST_APPROVED_VERSION_LIVE_PASS','B4003_ROW_NOT_CLOSED');
  need(current.closureReceiptPath===seal.receiptPath&&current.closureReceiptBlobSha===seal.receiptBlobSha&&current.closureReceiptSha256===seal.receiptSha256&&same(current.currentReleaseClosure20261107,seal),'ROW_SEAL_BINDING');
 }
 for(const row of ledger.findings)if(row.id!=='B4-003')need(same(row,prev.get(row.id)),'UNRELATED_FINDING_CHANGE');
 for(const id of QA_IDS)need(led.get(id)?.status==='OWNER_AUTHORIZED_POSTPRODUCTION_PHYSICAL_RETENTION_NOT_DELETED'&&led.get(id).blocking===false,'QA_DEFERRAL_PRESERVATION');
 for(const id of MIRROR_IDS)for(const key of ['status','blocking',...(QA_IDS.includes(id)?['ownerDecision20261106']:['closureProof'])])need(same(regMap.get(id)?.[key],led.get(id)?.[key]),'EXISTING_DISPOSITION_MIRROR');
 const lp=clone(ledger),rp=clone(reg);
 restoreKeys(lp,priorLedger,['b4003CurrentReleaseClosure20261107','lastUpdatedAt']);
 restoreKeys(rp,priorRegister,['b4003CurrentReleaseClosure20261107','expectedLedgerNextBlobSha','sourceLedgerPreviousBlobSha']);
 restoreKeys(lp.findings.find(x=>x.id==='B4-003'),prev.get('B4-003'),B4_KEYS);
 restoreKeys(rp.inventory.find(x=>x.id==='B4-003'),priorRegister.inventory.find(x=>x.id==='B4-003'),B4_KEYS);
 for(const id of MIRROR_IDS)restoreKeys(rp.inventory.find(x=>x.id===id),priorRegister.inventory.find(x=>x.id===id),['status','blocking',...(QA_IDS.includes(id)?['ownerDecision20261106']:['closureProof'])]);
 need(same(lp,priorLedger)&&same(rp,priorRegister),'UNENUMERATED_LEDGER_MUTATION');
 const ledgerBlob=blob(fs.readFileSync(LEDGER)),registerBlob=blob(fs.readFileSync(REGISTER));
 need(reg.expectedLedgerNextBlobSha===ledgerBlob&&cp.findingLedgerBlobSha===ledgerBlob&&cp.continuityRegisterBlobSha===registerBlob,'CURRENT_LEDGER_POINTERS');
 need(cp.findingContinuityControl?.lastLedgerBlobSha===ledgerBlob&&cp.findingContinuityControl?.registerBlobSha===registerBlob,'CONTINUITY_POINTERS');
 const cap=read(CAPABILITY),priorCap=old(parent,CAPABILITY),master=read(MASTER),priorMaster=old(parent,MASTER);
 need(cap.capabilities.length===15&&same(cap.capabilities,priorCap.capabilities)&&same(cap.releaseBinding,priorCap.releaseBinding),'HISTORICAL_15_PRESERVED');
 const capClone=clone(cap),masterClone=clone(master);
 restoreKeys(capClone,priorCap,['i65B4003Current42LiveAcceptance20261107']);
 restoreKeys(masterClone,priorMaster,['b4003CurrentReleaseClosure20261107']);
 need(same(capClone,priorCap)&&same(masterClone,priorMaster),'HISTORICAL_LEDGER_OR_PLAN_CHANGED');
 need(same(cap.i65B4003Current42LiveAcceptance20261107,seal)&&master.b4003CurrentReleaseClosure20261107?.receiptBlobSha===seal.receiptBlobSha,'DERIVED_SEAL_POINTERS');
 need(String(master.status).startsWith('FROZEN_ACTIVE'),'FROZEN_PLAN_STATUS');
 need(cp.capabilityStatusAuthority?.latestBlobSha===blob(fs.readFileSync(CAPABILITY))&&cp.pendingClosureMasterPlan?.blobSha===blob(fs.readFileSync(MASTER))&&cp.findingContinuityControl?.masterPlanBlobSha===blob(fs.readFileSync(MASTER)),'DERIVED_FILE_POINTERS');
}

const OWNER_BASE='74312cc3621ba155ee288a0afb530a488246f0e6';
const OWNER_KEY='ownerDecisionFreeze20261107';
const OWNER_FREEZE=ROOT+'OWNER_DECISION_FREEZE_AND_RECONCILIATION_PLAN_20261107.json';
const OWNER_PLAN=ROOT+'PLAN_OPERATIVO_DECISIONES_PAULA_20261107.md';
const OWNER_TEST='tools/gravicentra-b4-003-owner-decision-successor.test.mjs';
const OWNER_V6=ROOT+'I6_5_I6_6_PAYMENT_INFERENCE_RECONCILIATION_LOCK_V6_20261001.json';
const OWNER_V6_BLOB='b47f91000713de9c8ac317e1f3fd118b2eafc0d5';
const OWNER_CP_FIELDS=[
 '/'+OWNER_KEY,'/currentExecutionDecisionPointer',
 '/pendingClosureMasterPlan/currentDecisionPointer',
 '/pendingClosureMasterPlan/firstIncompleteGateUnderCurrentOwnerScope',
 ...['activeVersion','path','blobSha','previousActiveRulePointer','currentOriginAndTimingAuthority',
 'ownerPolicyModalities20261107'].map(k=>'/paymentInferenceReconciliationControl/'+k)
];
const OWNER_STATE_FIELDS=['/'+OWNER_KEY,'/currentExecutionDecisionPointer','/updatedAtUtc','/nextAction'];
// One documentary successor of the certified current42 closure. This never
// grants product, deployment, data, Rules or historical-receipt mutation.
export function validateOwnerDecisionSuccessorSnapshot({control,baseControl,state,baseState,changedPaths,fileBytes}){
 const p=control[OWNER_KEY];
 need(p&&p.authorityBaseHead===OWNER_BASE,'OWNER_BASE_BINDING');
 const permitted=new Set([ROOT+'CONTROL_PLANE.json',STATE,OWNER_FREEZE,OWNER_PLAN,SELF,OWNER_TEST]);
 need(changedPaths.every(x=>permitted.has(x)),'OWNER_UNDECLARED_PATH');
 for(const path of [OWNER_FREEZE,OWNER_PLAN,SELF,OWNER_TEST])need(changedPaths.includes(path),'OWNER_REQUIRED_PATH');
 const bytes=path=>{need(fileBytes[path]!=null,'OWNER_FILE_MISSING');return Buffer.from(fileBytes[path]);};
 need(p.path===OWNER_FREEZE&&p.planPath===OWNER_PLAN&&blob(bytes(OWNER_FREEZE))===p.blobSha&&blob(bytes(OWNER_PLAN))===p.planBlobSha,'OWNER_DOCUMENT_HASH');
 const r=JSON.parse(bytes(OWNER_FREEZE).toString('utf8'));
 need(r.schema==='GRAVICENTRA_OWNER_DECISION_FREEZE_20261107_V1'&&r.authorityBaseHead===OWNER_BASE&&r.additiveOnly===true&&r.repository==='paulaosoriof86/orbit360-core'&&r.branch==='recovery/fase-a-clean-20260831','OWNER_RECEIPT_IDENTITY');
 need(r.plan?.path===OWNER_PLAN&&r.plan.blobSha===p.planBlobSha,'OWNER_PLAN_BINDING');
 need(r.nextGateExecuted===false&&r.nextGateAccepted===false&&p.nextGateExecuted===false&&p.nextGateAccepted===false&&p.productSourceChanged===false&&p.realBusinessWrites===0,'OWNER_NO_NEW_ACCEPTANCE');
 const execution=r.execution||{};
 for(const key of ['productSourceChanged','workflowChanged','productDeployed','dnsChanged','dataImportExecuted','newModulePassGranted'])need(execution[key]===false,'OWNER_EXECUTION_'+key);
 need(execution.realBusinessWrites===0,'OWNER_BUSINESS_WRITES');
 need(p.preservedB4003ReceiptBlobSha==='0879188bf245248fa1092fb2014e35e14e802b44'&&p.preservedProductSourceSha===SOURCE,'OWNER_PRESERVED_RELEASE');
 const proof=r.governanceSuccessorValidation;
 need(proof?.schema==='GRAVICENTRA_OWNER_DOCUMENTARY_SUCCESSOR_VALIDATION_V1'&&proof.baseHead===OWNER_BASE&&proof.guardPath===SELF&&proof.testPath===OWNER_TEST,'OWNER_VALIDATION_CONTRACT');
 need(proof.guardBlobSha===blob(bytes(SELF))&&proof.testBlobSha===blob(bytes(OWNER_TEST)),'OWNER_VALIDATION_HASH');
 need(control.currentExecutionDecisionPointer===OWNER_KEY&&state.currentExecutionDecisionPointer===OWNER_KEY&&same(state[OWNER_KEY],p),'OWNER_POINTER_PARITY');
 need(control.pendingClosureMasterPlan?.currentDecisionPointer===OWNER_KEY&&control.pendingClosureMasterPlan?.firstIncompleteGateUnderCurrentOwnerScope===p.firstIncompleteGate,'OWNER_MASTER_POINTER');
 need(state.updatedAtUtc===r.recordedAtUtc&&p.recordedAtUtc===r.recordedAtUtc&&typeof state.nextAction==='string'&&state.nextAction.includes(OWNER_KEY),'OWNER_STATE_POINTER');
 const rules=control.paymentInferenceReconciliationControl,oldRules=baseControl.paymentInferenceReconciliationControl;
 need(rules?.activeVersion==='V6_20261001'&&rules.path===OWNER_V6&&rules.blobSha===OWNER_V6_BLOB&&blob(bytes(OWNER_V6))===OWNER_V6_BLOB,'OWNER_V6_BINDING');
 need(same(rules.previousActiveRulePointer,{activeVersion:oldRules.activeVersion,path:oldRules.path,blobSha:oldRules.blobSha,preservedInGitHistory:true}),'OWNER_PRIOR_RULE_POINTER');
 const modality=rules.ownerPolicyModalities20261107;
 need(modality?.policy==='VIME-18154'&&modality.insurer==='G&T'&&modality.modality==='MONTHLY_12_PAYMENTS'&&modality.ownerConfirmed===true&&modality.scope==='POLICY_ONLY_NOT_GLOBAL_FRACCIONADO_CEILING'&&modality.receiptPath===OWNER_FREEZE&&modality.receiptBlobSha===p.blobSha&&modality.dataApplied===false,'OWNER_POLICY_MODALITY');
 const projected=clone(control),projectedState=clone(state);
 for(const path of OWNER_CP_FIELDS)restoreField(projected,baseControl,path);
 for(const path of OWNER_STATE_FIELDS)restoreField(projectedState,baseState,path);
 need(same(projected,baseControl),'OWNER_UNENUMERATED_CONTROL_CHANGE');
 need(same(projectedState,baseState),'OWNER_UNENUMERATED_STATE_CHANGE');
 return {comparableControl:projected,allowedPaths:[OWNER_FREEZE,OWNER_PLAN,OWNER_TEST]};
}
function verifyOwnerDecisionSuccessor(after){
 if(!after[OWNER_KEY])return null;
 need(git('merge-base',OWNER_BASE,'HEAD')===OWNER_BASE,'OWNER_BASE_NOT_ANCESTOR');
 const paths=[ROOT+'CONTROL_PLANE.json',STATE,OWNER_FREEZE,OWNER_PLAN,SELF,OWNER_TEST,OWNER_V6];
 const fileBytes={};
 for(const path of paths){
  fileBytes[path]=fs.readFileSync(path);
  need(git('rev-parse','HEAD:'+path)===blob(fileBytes[path]),'OWNER_UNCOMMITTED_FILE');
 }
 return validateOwnerDecisionSuccessorSnapshot({
  control:after,baseControl:old(OWNER_BASE,ROOT+'CONTROL_PLANE.json'),
  state:read(STATE),baseState:old(OWNER_BASE,STATE),
  changedPaths:git('diff','--name-only',OWNER_BASE,'HEAD').split(/\r?\n/).filter(Boolean),fileBytes
 });
}

export function projectVerifiedB4003LiveClosure(after,certified){
 const ownerSuccessor=verifyOwnerDecisionSuccessor(after);
 if(ownerSuccessor)after=ownerSuccessor.comparableControl;
 const cursor=after[CURSOR],seal=cursor?.formalLiveAcceptance;
 if(!seal&&cursor?.b4003Closed!==true)return {comparableAfter:after,closed:false};
 need(seal?.schema==='GRAVICENTRA_B4_003_CURRENT42_FORMAL_LIVE_ACCEPTANCE_V1'&&seal.status==='LATEST_APPROVED_VERSION_LIVE_PASS'&&cursor.b4003Closed===true,'FORMAL_SEAL_REQUIRED');
 need(releaseIdentity(seal)&&seal.productFiles===218,'SEAL_RELEASE_IDENTITY');
 need(git('rev-parse','HEAD:'+SELF)===blob(fs.readFileSync(SELF)),'UNCOMMITTED_TERMINAL_GUARD');
 const r=reference({path:seal.receiptPath,blobSha:seal.receiptBlobSha,sha256:seal.receiptSha256},'FINAL');
 need(r.schema==='GRAVICENTRA_B4_003_CURRENT42_FINAL_LIVE_CLOSEOUT_V1'&&r.status==='LATEST_APPROVED_VERSION_LIVE_PASS'&&r.gate==='I6.5/B4-003'&&r.b4003Closed===true,'FINAL_RECEIPT');
 need(releaseIdentity(r.release)&&r.release.productFiles===218&&r.affectedGateOnly==='B4-003','FINAL_RELEASE');
 need(/^[a-f0-9]{40}$/.test(r.parentHead||'')&&git('merge-base',r.parentHead,'HEAD')===r.parentHead,'CLOSURE_PARENT_ANCESTRY');
 const evidence=r.evidence||{};
 need(same(Object.keys(evidence).sort(),['promotion','readonlyUi','failedCreate','complete','uiCreate','uiCleanup','finalIntegrity'].sort()),'EXACT_EVIDENCE_ROLES');
 for(const [key,expected]of Object.entries(CERTS))need(evidence[key]?.blobSha===expected,'FROZEN_RECEIPT_'+key);
 const promotion=reference(evidence.promotion,'PROMOTION'),ui=reference(evidence.readonlyUi,'READONLY_UI'),failed=reference(evidence.failedCreate,'FAILED_CREATE');
 need(promotion.productSourceSha===SOURCE&&promotion.productBuildId===BUILD&&promotion.liveVersionName===VERSION&&promotion.liveRawProductFiles===218&&promotion.liveRawDigest===DIGEST&&promotion.runId===42323326741,'PROMOTION_IDENTITY');
 need(failed.workflowRunId==='42327828328'&&failed.customTokensIssued===1&&failed.mutationsExecuted===0&&failed.canonicalOwnerPostSubmitted===false&&same(failed.errors,['SIGNED_PAULA_UID']),'CONSUMED_FAILURE_PRESERVED');
 const complete=reference(evidence.complete,'COMPLETE');
 const plan=read(PLAN);need(sha(fs.readFileSync(PLAN))==='a318932d732917737953c42a380b884ba200307f5e804c3b32c06662c012dcb6','PLAN_CHANGED');
 validateCompleteEvidence(complete,plan);
 uiEvidence(reference(evidence.uiCreate,'UI_CREATE'),'CREATE');
 uiEvidence(reference(evidence.uiCleanup,'UI_CLEANUP'),'CLEANUP');
 const integrity=reference(evidence.finalIntegrity,'FINAL_INTEGRITY');
 need(integrity.status==='PASS_FINAL_AFFECTED_MODULE_INTEGRITY_EXACT_LIVE_IDENTITY'&&integrity.sourceSha===SOURCE&&integrity.buildId===BUILD&&integrity.hostingVersion===VERSION&&integrity.affectedModuleIntegrityPass===true&&integrity.exactLiveIdentityUnchanged===true&&integrity.unexpectedBusinessWrites===0,'FINAL_INTEGRITY');
 const scope=cursor.liveSyntheticInsurerWrite20261107,inventory=after[INVENTORY];
 need(scope?.authorized===false&&scope.consumed===true&&scope.principal?.customTokenAuthorized===false&&scope.totalCustomTokensMinted===2&&String(scope.createRunId)==='42327828328'&&String(scope.completeRunId)===String(complete.workflowRunId),'CONSUMED_AUTHORIZATION');
 need(scope.createAuthorizedParentSha==='891f5c573abbecb1206ced40e30934217dc300cf'&&scope.atomicExternalAuditInsertAuthorized===false&&scope.cleanupOnFailureAuthorized===false&&scope.realRecordWritesAuthorized===false&&scope.rebuildOrDeployAuthorized===false&&scope.reimportAuthorized===false,'REMAINING_WRITE_GRANT');
 need(cursor.productionPromotionAuthorized===false&&cursor.nextOnly.length===0&&cursor.activeSourceSha===SOURCE&&cursor.activeBuildId===BUILD&&Number(cursor.activeImmutableArtifactId)===13549460562,'CURRENT_CURSOR');
 need(cursor.activeEvidenceCount===16&&inventory.currentB4003Evidence.length===16&&inventory.historicalEvergreenCapabilities.count===15&&inventory.openClosure.p0Closed===4&&inventory.openClosure.p0DeferredWithOwnerAuthorization===2&&inventory.openClosure.p0Total===6&&inventory.openClosure.formalI6Percent===50,'PRESERVED_COUNTS');
 need(inventory.status==='LATEST_APPROVED_VERSION_LIVE_PASS'&&inventory.openClosure.b4003Closed===true&&inventory.openClosure.fullGateRemainsHold===false&&inventory.openClosure.liveFunctionalAcceptancePending===false&&inventory.openClosure.remainingEvidenceRequired.length===0,'CURRENT_INVENTORY');
 const prior=old(r.parentHead,ROOT+'CONTROL_PLANE.json');
 need(same(inventory.currentB4003Evidence,prior[INVENTORY].currentB4003Evidence)&&same(inventory.historicalEvergreenCapabilities,prior[INVENTORY].historicalEvergreenCapabilities),'CERTIFICATES_REWRITTEN');
 need(after.nextAction===FINAL_ACTION&&after.currentB4?.status==='B4_003_CLOSED_PASS_CURRENT42'&&after.currentB4.findingStatus==='CLOSED_PASS'&&after.i65ForensicRemediationPlan?.b4?.findingStatus==='CLOSED_PASS','ACTIVE_B4_POINTERS');
 need(after.currentB4.humanVisualStatus==='LATEST_APPROVED_VERSION_LIVE_PASS'&&after.currentB4.humanFunctionalAccepted===true&&after.currentB4.livePromoted===true&&after.currentB4.noLive===false&&after.currentB4.nextAction===FINAL_ACTION,'ACTIVE_B4_DISPOSITION');
 need(after.pendingClosureMasterPlan?.status==='B4_003_CLOSED_PASS_CURRENT42_NEXT_FROZEN_GATE_NOT_EXECUTED','CURRENT_MASTER_POINTER');
 const st=read(STATE),oldState=old(r.parentHead,STATE),resume=st.b4003ActiveCertificationResume20261106;
 need(resume?.b4003Closed===true&&resume.releaseStatus==='LATEST_APPROVED_VERSION_LIVE_PASS'&&same(resume.formalLiveAcceptance,seal)&&resume.minimumNext.length===0&&resume.liveControlledWritesAuthorized===false,'STATE_SYNC');
 for(const key of ['status','currentIteration','lastCompletedIteration','productionAccepted'])need(same(st[key],oldState[key]),'HISTORICAL_STATE_CHANGED');
 verifyLedgerMetadata(r,seal,after,r.parentHead);
 const supporting=r.supportingEvidence||[];need(Array.isArray(supporting),'SUPPORTING_EVIDENCE');
 for(const [i,ref]of supporting.entries())reference(ref,'SUPPORTING_'+i);
 const allowedCommitPaths=new Set([...(ownerSuccessor?.allowedPaths||[]),ROOT+'CONTROL_PLANE.json',STATE,LEDGER,REGISTER,CAPABILITY,MASTER,SELF,PARENT_GUARD,seal.receiptPath,...Object.values(evidence).map(x=>x.path),...supporting.map(x=>x.path)]);
 const changed=git('diff','--name-only',r.parentHead,'HEAD').split(/\r?\n/).filter(Boolean);
 need(changed.every(p=>allowedCommitPaths.has(p)),'CLOSURE_PRODUCT_OR_UNDECLARED_PATH_CHANGE');
 // Reconstruct only the historical comparator. The authoritative CP on disk
 // retains its new verified status and links; no existing history is rewritten.
 const comparable=clone(after);
 const mutable=[
 '/nextAction','/currentB4/status','/currentB4/findingStatus','/currentB4/humanVisualStatus',
 '/currentB4/humanFunctionalAccepted','/currentB4/livePromoted','/currentB4/noLive','/currentB4/nextAction',
 '/i65ForensicRemediationPlan/b4/findingStatus','/findingLedgerBlobSha','/continuityRegisterBlobSha',
 '/findingContinuityControl/lastLedgerBlobSha','/findingContinuityControl/registerBlobSha',
 '/findingContinuityControl/masterPlanBlobSha','/capabilityStatusAuthority/latestBlobSha',
 '/pendingClosureMasterPlan/blobSha','/pendingClosureMasterPlan/status'
 ];
 for(const p of mutable)restoreField(comparable,certified,p);
 return {comparableAfter:comparable,closed:true,receiptBlobSha:seal.receiptBlobSha};
}

