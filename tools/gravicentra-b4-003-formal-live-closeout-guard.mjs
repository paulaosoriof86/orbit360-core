import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {verifyB4004FormalGate,verifyDeclaredB4005SourceSuccessor} from './gravicentra-b4-004-formal-gate-guard.mjs';

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
const TEAM_SOURCE_BASE='b3dcd9d1a57bb4871b06df341ec6198c56f9cfe9';
const TEAM_SOURCE_PATHS={
  "orbit360-platform/data/store-firestore-product-operational-p0.js": "adcee4c9cdf0ac5a8e9102068927614e4809d78a",
  "tests/goal-participation-classification-writer.test.cjs": "770452dd7535c38b2a24ead7b13c6e9a2fb12e8a",
  "tools/gravicentra-b4-003-live-backend-source-readback.cjs": "eafe52011da6380ee701cd94dac9226156bc1a8e",
  ".github/workflows/gravicentra-b4-003-live-protected-reader-20261029.yml": "c9fe422c2c0e9bbe15a0a6f0dd793e8dbce965ac",
  "tools/gravicentra-b4-003-live-reader-source-readback.test.cjs": null,
  "tools/gravicentra-b4-003-role-first-paint-and-team-regression.test.cjs": "eb7f4a4512dbc6e17ed33217de4b36bb1281a27e",
  "tools/gravicentra-b4-003-renewals-cancellations-focused.test.cjs": null,
  "orbit360-platform/modules/cancelaciones.js": "c9f6934beea57136daca0a3292451ad0792181c1",
  "tools/gravicentra-b4-003-cancelaciones-commercial-qa.test.cjs": null,
  "orbit360-platform/modules/reportes.js": "e00cdbaef2207b6e48c6507c0039161afa07c4e0",
  ".github/workflows/gravicentra-b4-003-immutable-candidate-preview.yml": "2b74f6d920f5da6016256dd40ce6666f0693cd1e",
  "artifacts/orbit360-recovery/release-control/I6_5_B4_003_CURRENT42_CAUSAL_FRONTEND_SUCCESSOR_CONTRACT_20261107.json": null
};
const TEAM_CLASSIFICATION_PATCH="      // Publish only the acknowledged classification through the shared store.\n      // Keep it until canonical hydration contains the same two fields.\n      setPending('asesores',id,Object.assign({},get('asesores',id)||prior,patch),{kind:'update',patch:expectedPatch(patch,'asesores')});\n      emit('asesores');\n";
export function validateEquipoCausalSourceSuccessor({record,pointer,fileBytes,baseSourceBytes}){
 const proof=record.equipoCausalSourceCorrection;
 if(!proof)return null;
 need(proof.schema==='GRAVICENTRA_EQUIPO_CAUSAL_SOURCE_SUCCESSOR_V1'&&proof.sourceBaseHead===TEAM_SOURCE_BASE,'TEAM_SOURCE_BASE');
 need(proof.status===(proof.previewAllowedOnly?'SOURCE_AND_QA_READY_FRONTEND_PREVIEW_ONLY_NOT_DEPLOYED':'SOURCE_AND_QA_READY_READBACK_ONLY_NOT_DEPLOYED')&&proof.realBusinessWrites===0&&proof.repeatSevenClassificationWrites===false&&proof.rulesChanged===false&&proof.productionAccepted===false,'TEAM_SOURCE_SCOPE');
 need(Array.isArray(proof.changes)&&proof.changes.length>=5&&proof.changes.length<=12,'TEAM_SOURCE_CHANGES');
 const reviewedTransportPins={'.github/workflows/gravicentra-b4-003-live-protected-reader-20261029.yml':'bd45ef8297cb4d326929a01d5b8c4303369b72d4','tools/gravicentra-b4-003-live-backend-source-readback.cjs':'48edf21b50f05521a33159b5925e75a904841951','.github/workflows/gravicentra-b4-003-immutable-candidate-preview.yml':'8d17a2e1f4e2a6ff8da5d931790c364e8a2f828a','artifacts/orbit360-recovery/release-control/I6_5_B4_003_CURRENT42_CAUSAL_FRONTEND_SUCCESSOR_CONTRACT_20261107.json':'c792b7db1aa3f16ed7ee20cbdffe2b76dc61b97f'};
 const listed=proof.changes.map(x=>x.path);
 const previewWorkflow='.github/workflows/gravicentra-b4-003-immutable-candidate-preview.yml',previewContract='artifacts/orbit360-recovery/release-control/I6_5_B4_003_CURRENT42_CAUSAL_FRONTEND_SUCCESSOR_CONTRACT_20261107.json';
 const previewIncluded=listed.includes(previewWorkflow)||listed.includes(previewContract);
 need(previewIncluded===!!proof.previewAllowedOnly,'FRONTEND_PREVIEW_DECLARATION_REQUIRED');
 if(previewIncluded){
  need(listed.includes(previewWorkflow)&&listed.includes(previewContract),'FRONTEND_PREVIEW_SOURCE_CONTRACT_PAIR');
  const pv=proof.previewAllowedOnly,contract=JSON.parse(Buffer.from(fileBytes[previewContract]).toString('utf8'));
  const productPaths=['orbit360-platform/data/store-firestore-product-operational-p0.js','orbit360-platform/modules/cancelaciones.js','orbit360-platform/modules/reportes.js'];
  need(pv.workflowPath===previewWorkflow&&pv.contractPath===previewContract&&pv.contractBlobSha==='c792b7db1aa3f16ed7ee20cbdffe2b76dc61b97f'&&pv.site==='ays-orbit-360-lab'&&pv.channelId==='gi-i65-b4-rc-41765742748'&&pv.buildExactlyOnce===true&&pv.livePromotionAuthorized===false&&pv.backendFunctionDeploys===0&&pv.current42Preserved===true&&same(pv.productPaths,productPaths),'FRONTEND_PREVIEW_EXACT_AUTHORITY');
  need(contract.schema==='GRAVICENTRA_CURRENT42_CAUSAL_FRONTEND_SUCCESSOR_CONTRACT_V1'&&contract.sourceBaseHead===TEAM_SOURCE_BASE&&contract.scope.b4003Reopened===false&&contract.scope.historicalCertificatesRewritten===false&&contract.scope.nextGateExecuted===false&&contract.scope.backendFunctionDeploys===0&&contract.scope.businessWrites===0&&contract.scope.rulesWrites===0&&contract.promotion.authorized===false,'FRONTEND_PREVIEW_BOUNDARY');
  need(contract.preservedAcceptance.receiptBlobSha==='0879188bf245248fa1092fb2014e35e14e802b44'&&contract.preservedAcceptance.sourceSha===SOURCE&&contract.preservedAcceptance.buildId===BUILD&&Number(contract.preservedAcceptance.artifactId)===13549460562&&contract.rollback.versionName===VERSION,'FRONTEND_PREVIEW_CURRENT42_PRESERVED');
  need(same(contract.productChanges.map(x=>x.path),productPaths)&&contract.productChanges.every(x=>proof.changes.some(c=>c.path===x.path&&c.previousBlobSha===x.beforeBlobSha&&c.blobSha===x.afterBlobSha)),'FRONTEND_PREVIEW_THREE_SOURCE_DELTAS');
 }
 const cancellationPins={'orbit360-platform/modules/cancelaciones.js':'c206f79a47b8aa8684dc0cf50756f3720166bdbe','tools/gravicentra-b4-003-cancelaciones-commercial-qa.test.cjs':'03e5ffbf6ef798bc544098057bae211dbd0a612f','orbit360-platform/modules/reportes.js':'0daba72ebd8e6f8bef84ced9739b71bcabff0973'};
 const cancellationIncluded=Object.keys(cancellationPins).some(path=>listed.includes(path));
 if(cancellationIncluded)need(Object.keys(cancellationPins).every(path=>listed.includes(path)),'CANCELLATION_SOURCE_TEST_PAIR_REQUIRED');
 need(new Set(listed).size===listed.length&&Object.keys(TEAM_SOURCE_PATHS).slice(0,5).every(path=>listed.includes(path)),'TEAM_SOURCE_REQUIRED_PATHS');
 for(const entry of proof.changes){
  if(reviewedTransportPins[entry.path])need(entry.blobSha===reviewedTransportPins[entry.path],'TEAM_SOURCE_REVIEWED_TRANSPORT_BLOB');
  if(cancellationPins[entry.path])need(entry.blobSha===cancellationPins[entry.path],'CANCELLATION_EXACT_REVIEWED_BLOB');
  need(Object.hasOwn(TEAM_SOURCE_PATHS,entry.path)&&entry.previousBlobSha===TEAM_SOURCE_PATHS[entry.path],'TEAM_SOURCE_PATH_OR_PREDECESSOR');
  need(fileBytes[entry.path]!=null&&blob(Buffer.from(fileBytes[entry.path]))===entry.blobSha,'TEAM_SOURCE_CURRENT_BLOB');
  const prior=baseSourceBytes?.[entry.path];
  need(entry.previousBlobSha===null?prior==null:prior!=null&&blob(Buffer.from(prior))===entry.previousBlobSha,'TEAM_SOURCE_BASE_BYTES');
 }
 const storePath=Object.keys(TEAM_SOURCE_PATHS)[0],storeText=Buffer.from(fileBytes[storePath]).toString('utf8');
 need(storeText.split(TEAM_CLASSIFICATION_PATCH).length===2&&storeText.replace(TEAM_CLASSIFICATION_PATCH,'')===Buffer.from(baseSourceBytes[storePath]).toString('utf8'),'TEAM_SOURCE_EXACT_ACK_PATCH');
 const workflow=Buffer.from(fileBytes[Object.keys(TEAM_SOURCE_PATHS)[3]]).toString('utf8');
 need(workflow.includes("REQUESTED_MODE: ${{ github.event_name == 'workflow_dispatch' && inputs.mode || 'readback' }}")&&workflow.includes('default: readback')&&workflow.includes('DEPLOYED_READER_CHANGED_SINCE_REVIEW')&&workflow.includes('test "$EXPECTED_DEPLOY_HEAD" = "$RELEASE_HEAD"')&&workflow.includes("if: steps.assess.outputs.needs_deploy == 'true'"),'TEAM_SOURCE_READBACK_DEFAULT');
 need(pointer.productSourceChanged===true&&record.execution.productSourceChanged===true&&record.execution.workflowChanged===true,'TEAM_SOURCE_EXECUTION_FLAGS');
 return {allowedPaths:listed};
}

const READER_DEPLOY_BASE='e5030ec5ba9854f0c576fd905c2f510766347ffa';
const READER_DEPLOY_ACTIVATION=ROOT+'I6_5_B4_003_ISOLATED_READER_DEPLOY_ACTIVATION_20261107.json';
const READER_DEPLOY_PINS={
  ".github/workflows/gravicentra-b4-003-live-protected-reader-20261029.yml": [
    "bd45ef8297cb4d326929a01d5b8c4303369b72d4",
    "967fc96d3d263b34bec8c8cbb4be6ce0b3a40967"
  ],
  "tools/gravicentra-b4-003-live-backend-source-readback.cjs": [
    "48edf21b50f05521a33159b5925e75a904841951",
    "632e8ded686b2d9dba2b80cda6f5f54824575831"
  ],
  "tools/gravicentra-b4-003-live-reader-source-readback.test.cjs": [
    "43072eb1d054b18438a76d300214827652b61ad9",
    "46020dfb28143974f9701478edb9c6cfbb7be075"
  ],
  "tools/gravicentra-b4-003-isolated-reader-package.cjs": [
    null,
    "50e4bd4c2b4d5391d1c2097364e1786454818f31"
  ],
  "tools/gravicentra-b4-003-isolated-reader-package.test.cjs": [
    null,
    "6787010e0ef9a756ebfed093bc64619724c38e0f"
  ]
};
export function validateReaderDeploymentSuccessorSnapshot({record,fileBytes,baseSourceBytes}){
 const p=record.readerDeploymentSuccessor;
 if(!p){need(fileBytes[READER_DEPLOY_ACTIVATION]==null,'READER_UNDECLARED_ACTIVATION');return null;}
 need(p.schema==='GRAVICENTRA_READER_DEPLOYMENT_SUCCESSOR_V1'&&p.sourceBaseHead===READER_DEPLOY_BASE&&p.preservedFrontendSource===READER_DEPLOY_BASE,'READER_DEPLOY_BASE');
 need(p.status==='EXACT_ISOLATED_READER_PREPARED_ACTIVATION_REQUIRED'&&p.target==='orbit360ScopedPolicyRead'&&p.region==='us-east1'&&p.project==='ays-orbit-360-lab','READER_DEPLOY_IDENTITY');
 need(p.deployAuthorized===true&&p.requiresActivationReceipt===true&&p.activationPath===READER_DEPLOY_ACTIVATION&&p.allowedPushSubject==='deploy(b4-003): exact isolated LIVE reader e503 successor','READER_DEPLOY_ACTIVATION_CONTRACT');
 need(p.hostingDeployAuthorized===false&&p.rulesWrites===0&&p.realBusinessWrites===0&&p.repeatSevenClassificationWrites===false&&p.otherFunctionsDeployAuthorized===false&&p.backendSourceFilesChanged===false,'READER_DEPLOY_BOUNDARY');
 need(p.before?.runId===42397991685&&p.before.runConclusion==='success'&&p.before.sourceManifestSha256==='067c746216f25a8aecbcf435bd0cd00a2ed0f8463c7446bb9c36ee5dc5a822ff'&&p.before.archiveSha256==='eb076c9f52c16d1a66bd3bd0b31a25555a57fc6109cdfe9b6d0f61dcfcd27fe9'&&p.before.revision==='orbit360scopedpolicyread-00001-tiv','READER_DEPLOY_EXACT_OBSERVED_PREDECESSOR');
 need(p.expectedIsolatedSourceManifestSha256==='690d036074683b4ea1d46cf867fa14856b40536fe739388ff50801ec9d31786a'&&p.singleExport==='orbit360ScopedPolicyRead'&&p.completeLocalDependencyFiles===7&&p.packageFiles===10,'READER_DEPLOY_ISOLATED_CLOSURE');
 need(p.readOnlyDiagnostic?.target==='orbit360TenantDomainConfig'&&p.readOnlyDiagnostic.region==='us-central1'&&p.readOnlyDiagnostic.invokesCallable===false&&p.readOnlyDiagnostic.deployAuthorized===false&&p.readOnlyDiagnostic.businessDataReads===0,'READER_CATALOG_READONLY_SCOPE');
 need(Array.isArray(p.changes)&&same(p.changes.map(x=>x.path).sort(),Object.keys(READER_DEPLOY_PINS).sort()),'READER_DEPLOY_EXACT_PATHS');
 const comparableFileBytes={...fileBytes};
 for(const entry of p.changes){
  const [prior,next]=READER_DEPLOY_PINS[entry.path],bytes=fileBytes[entry.path],base=baseSourceBytes?.[entry.path];
  need(entry.previousBlobSha===prior&&entry.blobSha===next&&bytes!=null&&blob(Buffer.from(bytes))===next&&sha(Buffer.from(bytes))===entry.sha256,'READER_DEPLOY_CURRENT_PIN');
  need(prior===null?base==null:base!=null&&blob(Buffer.from(base))===prior,'READER_DEPLOY_BEFORE_PIN');
  if(prior!==null)comparableFileBytes[entry.path]=base;
 }
 const allowedPaths=Object.keys(READER_DEPLOY_PINS),activationBytes=fileBytes[READER_DEPLOY_ACTIVATION];
 if(activationBytes!=null){
  const a=JSON.parse(Buffer.from(activationBytes).toString('utf8'));
  need(a.schema==='GRAVICENTRA_ISOLATED_READER_DEPLOY_ACTIVATION_V1'&&a.status==='AUTHORIZED_EXACT_ISOLATED_READER_DEPLOY'&&a.target===p.target&&a.region===p.region&&a.project===p.project,'READER_ACTIVATION_IDENTITY');
  need(a.beforeSourceManifestSha256===p.before.sourceManifestSha256&&a.beforeArchiveSha256===p.before.archiveSha256&&a.beforeRevision===p.before.revision&&a.expectedIsolatedSourceManifestSha256===p.expectedIsolatedSourceManifestSha256&&a.preservedFrontendSource===READER_DEPLOY_BASE,'READER_ACTIVATION_SOURCE_BINDING');
  need(a.realBusinessWritesAuthorized===false&&a.otherFunctionsDeployAuthorized===false&&a.reviewedReadbackConclusion==='success'&&Number.isSafeInteger(a.reviewedReadbackRunId)&&a.reviewedReadbackRunId>42397991685&&/^[a-f0-9]{40}$/.test(a.reviewedSourceHead||''),'READER_ACTIVATION_FRESH_READBACK');
  allowedPaths.push(READER_DEPLOY_ACTIVATION);
 }
 return{comparableFileBytes,allowedPaths,sourceBaseHead:READER_DEPLOY_BASE};
}

// Integrated by the single owner of formal-live-closeout-guard.mjs.
// Uses its existing need/blob/sha/clone/same helpers; no network or writes.
const FRONTPROMO_BASE='e5030ec5ba9854f0c576fd905c2f510766347ffa';
const FRONTPROMO_KEY='b4003CausalFrontendSuccessor20261107';
const FRONTPROMO_ROOT='artifacts/orbit360-recovery/release-control/';
const FRONTPROMO_TRANSPORT=FRONTPROMO_ROOT+'I6_5_B4_003_E503_IMMUTABLE_PREVIEW_TRANSPORT_20261107.json';
const FRONTPROMO_FOCAL=FRONTPROMO_ROOT+'I6_5_B4_003_E503_CAUSAL_FRONTEND_FOCAL_PREVIEW_ACCEPTANCE_20261107.json';
const FRONTPROMO_PREFLIGHT=FRONTPROMO_ROOT+'I6_5_B4_003_E503_RETAINED_HOSTING_PREFLIGHT_20261107.json';
const FRONTPROMO_PROMOTED=FRONTPROMO_ROOT+'I6_5_B4_003_E503_RETAINED_HOSTING_PROMOTED_20261107.json';
const FRONTPROMO_ROLLBACK='sites/ays-orbit-360-lab/versions/c5e1ae001fae793b';
const FRONTPROMO_EXPECTED={sourceSha:FRONTPROMO_BASE,buildId:'gi-i65-b4-e5030ec5ba98-57f234755dc1',runId:42397991730,artifactId:13584456766,
 artifactZipSha256:'96f8a8319a27899fc8341dd1d0853cc5395d3c01d88a18cfc885f7cdf5fb5062',archiveSha256:'cc710541a70afdaee8da882ef0b43b9dc9f24f89a7a198c3f48f18dc776a12fa',
 hostedPayloadDigest:'09c91023d1d22687528a61edb5a768dadbd59c465af91bc48016d21c94c6537f',productFiles:218,
 previewUrl:'https://ays-orbit-360-lab--gi-i65-b4-rc-41765742748-neoi3u7r.web.app'};
const FRONTPROMO_PINS={
 '.github/workflows/gravicentra-b4-003-executor.yml':['ef7166292eea983c2165692725797e0ef46b06fb','8178fdfd8c4c16a1b1bf17432c87e6b5115cdd4e'],
 'tools/gravicentra-b4-003-retained-hosting-preflight.mjs':['9c2599ee4551d4cc87d209dec6e46e1152a44c97','f361d6840ebf4cc03657c36a1bf6a03039e5c993'],
 'tools/gravicentra-b4-003-retained-hosting-promotion.mjs':['aecc2ebd24b211797db431a6726f6a833d0dc298','404b5fd60df843fa6e857aed04bb39e6232b6e6b'],
 'tools/gravicentra-b4-003-causal-frontend-retained-promotion.test.cjs':[null,'2dfb8a2e982a8a21f554ac4c250fefd37223009a'],
 [FRONTPROMO_TRANSPORT]:[null,'c939ca0c44eddefcea9cbb2ffc448ddafda749ab'],
 [FRONTPROMO_FOCAL]:[null,'953d55d5c1dd04f14522e3a12bbfa248a0a5da28']
};
export function validateFrontendPromotionSuccessorSnapshot({record,control,state,fileBytes,baseSourceBytes}){
 const p=record.frontendPromotionSuccessor,c=control[FRONTPROMO_KEY],s=state[FRONTPROMO_KEY];
 if(!p){need(c===undefined&&s===undefined,'FRONTPROMO_UNDECLARED_CURSOR');return null;}
 need(p.schema==='GRAVICENTRA_B4_003_CAUSAL_FRONTEND_TRANSPORT_SUCCESSOR_V1'&&p.sourceBaseHead===FRONTPROMO_BASE,'FRONTPROMO_BASE');
 const phases={FOCAL_PREVIEW_PASS_PREFLIGHT_PENDING:'FRONTEND_SUCCESSOR_FOCAL_PREVIEW_PASS_PREFLIGHT_PENDING',PROMOTION_AUTHORIZED:'FRONTEND_SUCCESSOR_PREVIEW_ACCEPTED_PROMOTION_AUTHORIZED',LIVE_BYTES_PASS_FOCAL_LIVE_PENDING:'FRONTEND_SUCCESSOR_LIVE_BYTES_PASS_FOCAL_LIVE_PENDING'};
 need(Object.hasOwn(phases,p.phase),'FRONTPROMO_PHASE');
 need(p.productSourceChangedAfterBuild===false&&p.rebuildExecuted===false&&p.artifactPatched===false&&p.backendFunctionDeploys===0&&p.rulesWrites===0&&p.realBusinessWrites===0&&p.nextGateExecuted===false&&p.globalProductionAccepted===false,'FRONTPROMO_BOUNDARY');
 need(c&&s&&same(c,s)&&c.schema==='GRAVICENTRA_B4_003_CAUSAL_FRONTEND_SUCCESSOR_CURSOR_V1','FRONTPROMO_CURSOR_PARITY');
 need(same(Object.keys(c).sort(),['schema','status','preservedAcceptancePointer','sourceContractPath','sourceContractBlobSha','activeSourceSha','activeBuildId','activeImmutableArtifactId','immutableSuccessor43PreviewReadback','focalAuthenticatedAcceptance','formalPreviewAcceptance','productionPromotionAuthorized','b4003Closed','b4003HistoricalAcceptancePreserved','nextGateExecuted'].sort()),'FRONTPROMO_CURSOR_EXACT_KEYS');
 need(c.status===phases[p.phase]&&c.b4003Closed===true&&c.b4003HistoricalAcceptancePreserved===true&&c.nextGateExecuted===false,'FRONTPROMO_CURSOR_STATUS');
 need(c.preservedAcceptancePointer==='/b4003ActiveCertificationCursor20261106/formalLiveAcceptance'&&c.sourceContractPath===FRONTPROMO_ROOT+'I6_5_B4_003_CURRENT42_CAUSAL_FRONTEND_SUCCESSOR_CONTRACT_20261107.json'&&c.sourceContractBlobSha==='c792b7db1aa3f16ed7ee20cbdffe2b76dc61b97f','FRONTPROMO_PARENT_CONTRACT');
 need(control.b4003ActiveCertificationCursor20261106?.b4003Closed===true&&control.b4003ActiveCertificationCursor20261106?.formalLiveAcceptance?.receiptBlobSha==='0879188bf245248fa1092fb2014e35e14e802b44','FRONTPROMO_CURRENT42_CLOSED');
 need(c.activeSourceSha===FRONTPROMO_BASE&&c.activeBuildId===FRONTPROMO_EXPECTED.buildId&&Number(c.activeImmutableArtifactId)===FRONTPROMO_EXPECTED.artifactId,'FRONTPROMO_ACTIVE_ARTIFACT');
 const proofs=Object.entries(c).filter(([k])=>/^immutableSuccessor\d+PreviewReadback/.test(k));
 need(proofs.length===1&&proofs[0][0]==='immutableSuccessor43PreviewReadback','FRONTPROMO_ONE_PREVIEW_PROOF');
 const proof=proofs[0][1];
 need(same(Object.keys(proof).sort(),['sourceSha','buildId','runId','artifactId','artifactZipSha256','archiveSha256','previewChannelId','previewUrl','versionName','workflowConclusion','exactServedReadbackPassed','hostedPayloadDigest','productFiles','artifactZipBytes','readbackReceiptArtifactId','readbackReceiptArtifactZipSha256','readbackReceiptPath','readbackReceiptBlobSha','readbackReceiptSha256'].sort()),'FRONTPROMO_PROOF_EXACT_KEYS');
 for(const [k,v]of Object.entries(FRONTPROMO_EXPECTED))need(proof[k]===v,'FRONTPROMO_ARTIFACT_'+k);
 need(proof.previewChannelId==='gi-i65-b4-rc-41765742748'&&proof.workflowConclusion==='success'&&proof.exactServedReadbackPassed===true,'FRONTPROMO_EXACT_TRANSPORT');
 need(proof.artifactZipBytes===1519756&&proof.readbackReceiptArtifactId===13583898538&&proof.readbackReceiptArtifactZipSha256==='60374fdcf9e0c5b18e020c93b3f0ccdb2e7c1f0634646a2432c675649e08f247','FRONTPROMO_GITHUB_ARTIFACT_ORIGIN');
 const authorized=p.phase==='PROMOTION_AUTHORIZED',observed=p.phase==='LIVE_BYTES_PASS_FOCAL_LIVE_PENDING';
 need(c.productionPromotionAuthorized===authorized&&p.productionPromotionAuthorized===authorized,'FRONTPROMO_AUTHORIZATION');
 const pins={...FRONTPROMO_PINS};
 for(const [required,ref,path]of [[authorized||observed,p.preflightEvidence,FRONTPROMO_PREFLIGHT],[observed,p.promotionEvidence,FRONTPROMO_PROMOTED]]){
  if(required){need(ref?.path===path&&/^[a-f0-9]{40}$/.test(ref.blobSha||'')&&/^[a-f0-9]{64}$/.test(ref.sha256||'')&&Number.isSafeInteger(ref.runId)&&ref.runId>0&&/^[a-f0-9]{40}$/.test(ref.runnerCommit||'')&&ref.runConclusion==='success','FRONTPROMO_REQUIRED_RUN_EVIDENCE');pins[path]=[null,ref.blobSha];}
  else need(ref===undefined,'FRONTPROMO_PREMATURE_RUN_EVIDENCE');
 }
 need(Array.isArray(p.changes)&&p.changes.length===Object.keys(pins).length&&same(p.changes.map(x=>x.path).sort(),Object.keys(pins).sort()),'FRONTPROMO_EXACT_PATHS');
 for(const x of p.changes){
  const pin=pins[x.path],bytes=fileBytes[x.path],before=baseSourceBytes?.[x.path];
  need(x.previousBlobSha===pin[0]&&x.blobSha===pin[1]&&bytes!=null&&blob(Buffer.from(bytes))===pin[1]&&sha(Buffer.from(bytes))===x.sha256,'FRONTPROMO_CURRENT_PIN');
  need(pin[0]===null?before==null:before!=null&&blob(Buffer.from(before))===pin[0],'FRONTPROMO_BEFORE_PIN');
 }
 const json=path=>JSON.parse(Buffer.from(fileBytes[path]).toString('utf8'));
 const transport=json(FRONTPROMO_TRANSPORT);
 need(transport.schema==='I6_5_B4_003_IMMUTABLE_PREVIEW_RELEASE_BUNDLE_V1','FRONTPROMO_TRANSPORT_SCHEMA');
 for(const [k,v]of Object.entries(FRONTPROMO_EXPECTED))need(transport[k]===v,'FRONTPROMO_TRANSPORT_'+k);
 need(transport.servedArtifactExact===true&&transport.fullProductReadback===true&&transport.liveLabStable===true&&transport.liveAppDomainStable===true&&transport.backendFunctionsDeployed===0&&transport.dataWrites===0&&transport.firestoreRulesWrites===0&&transport.productionDeploy===false&&transport.authenticatedUat==='PENDING','FRONTPROMO_TRANSPORT_SCOPE');
 need(proof.readbackReceiptPath===FRONTPROMO_TRANSPORT&&proof.readbackReceiptBlobSha===FRONTPROMO_PINS[FRONTPROMO_TRANSPORT][1]&&proof.readbackReceiptSha256===sha(Buffer.from(fileBytes[FRONTPROMO_TRANSPORT])),'FRONTPROMO_TRANSPORT_REFERENCE');
 const focal=json(FRONTPROMO_FOCAL);
 need(focal.schema==='GRAVICENTRA_B4_003_CAUSAL_FRONTEND_FOCAL_PREVIEW_ACCEPTANCE_V1'&&focal.status==='LATEST_APPROVED_VERSION_PREVIEW_PASS'&&focal.acceptanceScope==='CAUSAL_FRONTEND_DELTA_ONLY','FRONTPROMO_FOCAL_SCOPE');
 need(same(focal.browserArtifactIdentity?.scripts,[{path:'modules/cancelaciones.js',observedOrbitBuild:FRONTPROMO_EXPECTED.buildId},{path:'modules/reportes.js',observedOrbitBuild:FRONTPROMO_EXPECTED.buildId},{path:'data/store-firestore-product-operational-p0.js',observedOrbitBuild:FRONTPROMO_EXPECTED.buildId}])&&focal.browserArtifactIdentity.hiddenApplicationStateRead===false&&focal.browserArtifactIdentity.sdkStateRead===false,'FRONTPROMO_BROWSER_BUILD_IDENTITY');
 need(same(focal.candidate,FRONTPROMO_EXPECTED)&&focal.checks.equipo.internal===4&&focal.checks.equipo.freelance===3&&focal.checks.equipo.reloadObserved===true&&focal.checks.equipo.sourceClassificationRegressionTestsPassed===48&&focal.checks.equipo.freshUiClassificationWrite===false,'FRONTPROMO_EQUIPO_FOCAL');
 need(focal.checks.cancelaciones.GT===461&&focal.checks.cancelaciones.CO===28&&focal.checks.cancelaciones.TODOS===489&&focal.checks.cancelaciones.syntheticQaExcluded===true&&focal.checks.cancelaciones.syntheticQaDeleted===false&&focal.checks.reportes.cancelaciones===489&&focal.checks.reportes.syntheticQaExcludedAndRetainedForAudit===1&&same(focal.checks.reportes.consoleWarningAndErrorEntries,[]),'FRONTPROMO_CANCEL_REPORTES_FOCAL');
 for(const key of ['freshUiClassificationWrite','allRenewalFlowsCertified','allCancellationFlowsCertified','propuestasCatalogCertified','newLiveAcceptanceGranted','globalSynchronizationCertified','rulesChanged','nextGateExecuted','productionPromotionAuthorizedByThisReceipt'])need(focal.boundaries[key]===false,'FRONTPROMO_NO_BROAD_ACCEPTANCE_'+key);
 need(focal.boundaries.businessWrites===0&&focal.boundaries.backendFunctionsDeployedByThisDelta===0,'FRONTPROMO_NO_NEW_WRITES');
 need(c.focalAuthenticatedAcceptance?.status==='PASS'&&c.focalAuthenticatedAcceptance.sourceSha===FRONTPROMO_BASE&&c.focalAuthenticatedAcceptance.artifactId===FRONTPROMO_EXPECTED.artifactId&&same(c.focalAuthenticatedAcceptance.evidencePaths,[FRONTPROMO_FOCAL])&&c.focalAuthenticatedAcceptance.freshUiClassificationWrite===false&&c.focalAuthenticatedAcceptance.receiptBlobSha===FRONTPROMO_PINS[FRONTPROMO_FOCAL][1]&&c.focalAuthenticatedAcceptance.receiptSha256===sha(Buffer.from(fileBytes[FRONTPROMO_FOCAL])),'FRONTPROMO_FOCAL_REFERENCE');
 const seal=c.formalPreviewAcceptance;
 need(same(Object.keys(c.focalAuthenticatedAcceptance).sort(),['status','sourceSha','artifactId','evidencePaths','freshUiClassificationWrite','receiptBlobSha','receiptSha256'].sort())&&same(Object.keys(seal||{}).sort(),['status','sourceSha','buildId','artifactId','archiveSha256'].sort()),'FRONTPROMO_ACCEPTANCE_EXACT_KEYS');
 need(seal?.status==='LATEST_APPROVED_VERSION_PREVIEW_PASS'&&seal.sourceSha===FRONTPROMO_BASE&&seal.buildId===FRONTPROMO_EXPECTED.buildId&&seal.artifactId===FRONTPROMO_EXPECTED.artifactId&&seal.archiveSha256===FRONTPROMO_EXPECTED.archiveSha256,'FRONTPROMO_PREVIEW_SEAL');
 if(authorized||observed){
  need(/^sites\/ays-orbit-360-lab\/versions\/[A-Za-z0-9_-]+$/.test(proof.versionName||'')&&proof.versionName!==FRONTPROMO_ROLLBACK,'FRONTPROMO_NEW_VERSION_REQUIRED');
  const r=json(FRONTPROMO_PREFLIGHT),ref=p.preflightEvidence;
  need(blob(Buffer.from(fileBytes[ref.path]))===ref.blobSha&&sha(Buffer.from(fileBytes[ref.path]))===ref.sha256&&String(r.runId)===String(ref.runId)&&r.runnerCommit===ref.runnerCommit,'FRONTPROMO_PREFLIGHT_ORIGIN');
  need(r.schema==='B4_003_RETAINED_HOSTING_PREFLIGHT_V1'&&r.status==='EXACT_RETAINED_ARTIFACT_HOSTING_PREFLIGHT_PASS'&&r.failedCheckCount===0&&r.b4003Closed===true&&r.b4003HistoricalAcceptancePreserved===true,'FRONTPROMO_PREFLIGHT_STATUS');
  const names=['exact_candidate_and_archive','artifact_run_metadata','reuse_existing_service_account_for_gets','live_before_snapshot','preview_version_and_all_served_bytes','certified_rollback_version_and_all_served_bytes','live_unchanged_after_readonly_preflight'];
  need(Array.isArray(r.checks)&&r.checks.length===7&&same(r.checks.map(x=>x.name).sort(),names.sort())&&r.checks.every(x=>x.status==='PASS'),'FRONTPROMO_SEVEN_PREFLIGHT_CHECKS');
  for(const k of ['sourceSha','buildId','runId','artifactId','artifactZipSha256','archiveSha256','previewUrl'])need(r.binding?.[k]===FRONTPROMO_EXPECTED[k],'FRONTPROMO_PREFLIGHT_BINDING_'+k);
  need(r.previewVersionName===proof.versionName&&r.rollbackVersionName===FRONTPROMO_ROLLBACK&&r.liveVersionName===FRONTPROMO_ROLLBACK&&r.control?.recordedB4003Closed===true&&r.control?.recordedPromotionAuthorization===false,'FRONTPROMO_PREFLIGHT_VERSIONS');
  need(r.scope?.remoteReadsOnly===true&&r.scope.buildExecuted===false&&r.scope.hostingMutation===false&&r.scope.functionsDeployment===false&&r.scope.rulesChanged===false&&r.scope.dataWrites===0,'FRONTPROMO_PREFLIGHT_READ_ONLY');
  const rollback=r.checks.find(x=>x.name==='certified_rollback_version_and_all_served_bytes').evidence;
  need(rollback.rawBytesReadInThisRun===true&&rollback.rawPayloadDigestVerified===true&&rollback.digest==='308b669105c380294177f1a8d2350216af95fec31f800955d611e607542b42da'&&rollback.fileCount===218,'FRONTPROMO_FRESH_CURRENT42_ROLLBACK');
 }else need(proof.versionName===null||/^sites\/ays-orbit-360-lab\/versions\/[A-Za-z0-9_-]+$/.test(proof.versionName),'FRONTPROMO_PENDING_VERSION');
 if(observed){
  const r=json(FRONTPROMO_PROMOTED),ref=p.promotionEvidence;
  need(sha(Buffer.from(fileBytes[ref.path]))===ref.sha256&&String(r.runId)===String(ref.runId)&&r.runnerCommit===ref.runnerCommit,'FRONTPROMO_PROMOTION_ORIGIN');
  need(r.schema==='B4_003_EXACT_HOSTING_PROMOTION_V1'&&r.status==='EXACT_HOSTING_VERSION_PROMOTED_LIVE_BYTES_PASS_FUNCTIONAL_LIVE_PENDING'&&r.promotionAttempted===true&&r.rollbackAttempted===false&&r.formalLiveAcceptanceGranted===false&&r.b4003Closed===true&&r.b4003HistoricalAcceptancePreserved===true,'FRONTPROMO_PROMOTION_STATUS');
  for(const k of ['sourceSha','buildId','artifactId','artifactZipSha256','archiveSha256'])need(r.binding?.[k]===FRONTPROMO_EXPECTED[k],'FRONTPROMO_PROMOTION_BINDING_'+k);
  need(r.previewVersionName===proof.versionName&&r.rollbackVersionName===FRONTPROMO_ROLLBACK&&r.liveBeforeVersionName===FRONTPROMO_ROLLBACK&&r.promotionMethod==='POST_EXISTING_VERSION_RELEASE_NO_NEW_VERSION'&&r.promotionTargetVersionName===proof.versionName,'FRONTPROMO_PROMOTION_METHOD');
  need(r.liveAfter?.channel?.versionName===proof.versionName&&r.liveAfter.hostedFileCount===218&&r.liveAfter.hostedPayloadDigest===FRONTPROMO_EXPECTED.hostedPayloadDigest&&r.liveAfter.nonTargetSentinelsUnchanged===true&&r.functionsDeployed===0&&r.rulesChanged===false&&r.authConfigurationChanged===false&&r.dataWrites===0,'FRONTPROMO_PROMOTION_RAW_READBACK');
 }
 const comparableControl=clone(control),comparableState=clone(state);
 delete comparableControl[FRONTPROMO_KEY];delete comparableState[FRONTPROMO_KEY];
 return {comparableControl,comparableState,allowedPaths:Object.keys(pins),sourceBaseHead:FRONTPROMO_BASE,phase:p.phase};
}

// Merge into the existing formal-live-closeout guard; global need/blob/sha/clone/same/ROOT are reused.
// No CP/state projection: the reconciliation read does not change any current cursor or certificate.
export function validateReconciliationReadOnlySuccessorSnapshot({record,control,state,fileBytes,baseSourceBytes}){
 const grant=record?.reconciliationReadOnlySuccessor;
 if(!grant)return null;
 need(grant.schema==='GRAVICENTRA_OCTOBER_PRIVATE_READBACK_SUCCESSOR_V1'&&grant.status==='AUTHORIZED_READONLY_ENCRYPTED_SNAPSHOT_PENDING','OCTOBER_READONLY_STATUS');
 need(grant.sourceBaseHead==='e5030ec5ba9854f0c576fd905c2f510766347ffa'&&grant.ownerCriteriaBaseBlobSha==='11830a98266625e07bc7d2fcb58d2728be864cd8','OCTOBER_READONLY_BASE');
 need(grant.realBusinessWrites===0&&grant.productDeployed===false&&grant.cursorChanged===false&&grant.encryptedOnly===true&&grant.dataImportExecuted===false&&grant.baselineCaptured===false&&grant.globalSynchronizationClaim===false,'OCTOBER_READONLY_BOUNDARY');
 const expected=[
  ['.github/workflows/gravicentra-recovery-i6-postsalida.yml','734afcaf3b190ad8a17b9b465707d41290b57781','7437f3b5f84f0c3c047eb59db978acd2a6b98a7a'],
  [ROOT+'I6_5_OCTOBER_RECONCILIATION_PRIVATE_READBACK_REQUEST_20261107.json',null,'8203160883bba996d901d8eae0f44228af6a5aee'],
  [ROOT+'I6_5_OCTOBER_RECONCILIATION_SNAPSHOT_PUBLIC_KEY_20261107.pem',null,'4d828240ad68943b14cfb687dd41a4aa78c15e9a'],
  ['tools/gravicentra-i6-5-encrypted-live-snapshot.mjs','a13df5fc0a4449795b3ccc12fe2e037dd260296d','89955b0cef59664d704754c5a22137a0e5d11c24'],
  ['tools/gravicentra-i6-5-october-private-snapshot.test.mjs',null,'1aec55c01e17e2f4337a04552255885e7f5df7b1']
 ];
 need(Array.isArray(grant.changes)&&same(grant.changes.map(x=>x.path).sort(),expected.map(x=>x[0]).sort()),'OCTOBER_READONLY_EXACT_PATHS');
 for(const [p,prior,current]of expected){
  const declared=grant.changes.find(x=>x.path===p);
  need(declared.previousBlobSha===prior&&declared.blobSha===current&&fileBytes[p]&&blob(fileBytes[p])===current,'OCTOBER_READONLY_CURRENT_BYTES');
  need(prior?baseSourceBytes[p]&&blob(baseSourceBytes[p])===prior:baseSourceBytes[p]==null,'OCTOBER_READONLY_BASE_BYTES');
 }
 const requestPath=expected[1][0],publicPath=expected[2][0],request=JSON.parse(Buffer.from(fileBytes[requestPath]).toString('utf8'));
 need(grant.requestPath===requestPath&&grant.requestBlobSha===expected[1][2],'OCTOBER_READONLY_REQUEST_PIN');
 need(request.schema==='GRAVICENTRA_OCTOBER_PRIVATE_READBACK_REQUEST_V1'&&request.mode==='READ_ONLY_ENCRYPTED_CURRENT_BASELINE'&&request.collectionPeriod==='2026-10'&&request.projectId==='ays-orbit-360-lab'&&request.tenantId==='alianzas-soluciones','OCTOBER_READONLY_REQUEST');
 const collections=['polizas','clientes','aseguradoras','recibosEsperados','carteraPrimas','cobros','asesores'];
 const config={asesores:['comModo','shareCom','comValor'],aseguradoras:['comisionDefault','comisiones','comisionesProd']};
 need(same(request.collections,collections)&&same(grant.collectionAllowlist,collections)&&same(request.configSourceFields,config)&&same(grant.configSourceFields,config),'OCTOBER_READONLY_SCOPE');
 for(const k of ['dataWrites','sourceDataApply','authWrites','membershipWrites','mintUserTokens','productWrites','deploy','governanceWrites','reimport','messages'])need(request[k]===false,'OCTOBER_READONLY_FORBIDDEN_CAPABILITY');
 need(request.operationalWrites===0&&request.encryptedOnly===true&&request.repositoryPlaintextForbidden===true&&!Object.hasOwn(request,'expectedCounts')&&request.maxDocumentsPerCollection===20000,'OCTOBER_READONLY_LIMITS');
 need(request.publicKeyPath===publicPath&&request.publicKeySha256===sha(fileBytes[publicPath])&&Buffer.from(fileBytes[publicPath]).toString('utf8').startsWith('-----BEGIN PUBLIC KEY-----\n'),'OCTOBER_READONLY_KEY');
 need(request.sourceManifestSha256===record.sourceInventory?.documentManifest20261107?.sourceManifestSha256&&request.normalizedRowsSha256===record.sourceInventory?.documentManifest20261107?.normalizedRowsSha256,'OCTOBER_READONLY_DOCUMENT_AUTHORITY');
 need(grant.executionSelector==='[october-private-readback]'&&grant.workflowJob==='i65-encrypted-current-october-readback','OCTOBER_READONLY_EXECUTION_SELECTOR');
 return {allowedPaths:expected.map(x=>x[0]),comparableControl:clone(control),comparableState:clone(state)};
}

const CATALOG_BASE='f1321d6bea245411fd09e9ae414d58510551ef3b';
const CATALOG_ACTIVATION=ROOT+'I6_5_B4_003_LIVE_TENANT_CONFIG_DEPLOY_ACTIVATION_20261107.json';
const CATALOG_PINS={
  ".github/workflows/gravicentra-b4-003-executor.yml": [
    "8178fdfd8c4c16a1b1bf17432c87e6b5115cdd4e",
    "6344a5b9603390014bed2cf8a564ccb11f542ba4"
  ],
  "tools/gravicentra-b4-003-isolated-tenant-config-package.cjs": [
    null,
    "d19fde61a8383df2fb280a974acabe6e70baaaf9"
  ],
  "tools/gravicentra-b4-003-live-tenant-config-readback.cjs": [
    null,
    "ccb6959620b58e70eb530f810ab89eb8ff8045e0"
  ],
  "tools/gravicentra-b4-003-live-tenant-config-transport.test.cjs": [
    null,
    "f257b8feae5755df1cdf1a8ca97c9628ddca3086"
  ],
  "tools/gravicentra-b4-003-tenant-config-functional.test.cjs": [
    null,
    "0fc50301dfa6458c8d11e0028698c46b57f8cb8a"
  ]
};
export function validateCatalogTransportSuccessorSnapshot({record,fileBytes,baseSourceBytes}){
 const p=record.catalogTransportSuccessor;
 if(!p){need(fileBytes[CATALOG_ACTIVATION]==null,'CATALOG_UNDECLARED_ACTIVATION');return null;}
 need(p.schema==='GRAVICENTRA_LIVE_TENANT_CONFIG_TRANSPORT_SUCCESSOR_V1'&&p.status==='CANONICAL_CATALOG_PREPARED_READBACK_REQUIRED'&&p.sourceBaseHead===CATALOG_BASE&&p.preservedFrontendSource===READER_DEPLOY_BASE,'CATALOG_AUTHORITY_BASE');
 need(p.target==='orbit360TenantDomainConfig'&&p.region==='us-central1'&&p.project==='ays-orbit-360-lab'&&p.deployAuthorized===true&&p.requiresActivationReceipt===true&&p.activationPath===CATALOG_ACTIVATION,'CATALOG_AUTHORITY_IDENTITY');
 need(p.businessWrites===0&&p.hostingDeployAuthorized===false&&p.otherFunctionsDeployAuthorized===false&&p.readerGrantExpanded===false&&p.sourceChanged===false,'CATALOG_AUTHORITY_BOUNDARY');
 need(p.expectedSourceManifestSha256==='f7f250d16687b6282cc170a40aa502bea3268b1a6301e5821be8eaa1e233d1bf'&&p.packageFiles===5&&p.singleExport===p.target,'CATALOG_PACKAGE_IDENTITY');
 need(p.before?.sourceGitBlobSha==='e4b602b4abb26fcd3d9413b1ab9bb67998be78dd'&&p.before.archiveSha256==='4c3ed1a442c31f8e094e4c66e168fa8cc622c076bc6d6e68bf9c0c30ab2acf0e'&&p.before.revision==='orbit360tenantdomainconfig-00019-mar','CATALOG_EXACT_PREDECESSOR');
 need(p.firstPublishMode==='READBACK_ONLY'&&p.allowedReadbackSubject==='test(b4-003): exact LIVE tenant catalogs source readback'&&p.allowedDeploySubject==='deploy(b4-003): exact isolated LIVE tenant catalogs canonical successor','CATALOG_EXACT_ROUTING');
 need(Array.isArray(p.changes)&&same(p.changes.map(x=>x.path).sort(),Object.keys(CATALOG_PINS).sort()),'CATALOG_EXACT_PATHS');
 const comparableFileBytes={...fileBytes};
 for(const e of p.changes){
  const [prior,next]=CATALOG_PINS[e.path],current=fileBytes[e.path],base=baseSourceBytes?.[e.path];
  need(e.previousBlobSha===prior&&e.blobSha===next&&current!=null&&blob(Buffer.from(current))===next&&sha(Buffer.from(current))===e.sha256,'CATALOG_REVIEWED_CURRENT_PIN');
  need(prior===null?base==null:base!=null&&blob(Buffer.from(base))===prior,'CATALOG_REVIEWED_BASE_PIN');
  if(prior!==null)comparableFileBytes[e.path]=base;
 }
 const allowedPaths=Object.keys(CATALOG_PINS),aBytes=fileBytes[CATALOG_ACTIVATION];
 if(aBytes!=null){
  const a=JSON.parse(Buffer.from(aBytes).toString('utf8'));
  need(a.schema==='GRAVICENTRA_LIVE_TENANT_CONFIG_ACTIVATION_V1'&&a.status==='AUTHORIZED_EXACT_SINGLE_CATALOG_DEPLOY'&&a.target===p.target&&a.region===p.region&&a.project===p.project&&a.preservedFrontendSource===READER_DEPLOY_BASE,'CATALOG_ACTIVATION_IDENTITY');
  need(a.beforeArchiveSha256===p.before.archiveSha256&&a.beforeRevision===p.before.revision&&a.expectedSourceManifestSha256===p.expectedSourceManifestSha256,'CATALOG_ACTIVATION_SOURCE');
  need(a.realBusinessWritesAuthorized===false&&a.otherFunctionsDeployAuthorized===false&&a.hostingDeployAuthorized===false&&a.readerGrantExpanded===false,'CATALOG_ACTIVATION_BOUNDARY');
  need(a.reviewedReadbackConclusion==='success'&&Number.isSafeInteger(a.reviewedReadbackRunId)&&a.reviewedReadbackRunId>42401330631&&/^[a-f0-9]{40}$/.test(a.reviewedSourceHead||''),'CATALOG_ACTIVATION_FRESH_REVIEW');
  for(const k of ['beforeSourceManifestSha256','beforeServiceConfigSha256','beforeEnvironmentSha256','beforeIamPolicySha256','beforeNonTargetInventorySha256'])need(/^[a-f0-9]{64}$/.test(a[k]||''),'CATALOG_ACTIVATION_METADATA_BINDING');
  allowedPaths.push(CATALOG_ACTIVATION);
 }
 return{allowedPaths,comparableFileBytes,sourceBaseHead:CATALOG_BASE};
}

const REVIEWED_CANDIDATE_ARCHIVES={
 [ROOT+'candidate-reviewed/I6_5_B4_003_CANCEL_RECOVERY_PENDING_FINALIZATION_20261107.diff']:{
  blobSha:'a16123bd19f426424564a1223ffeade9f12c0792',
  sha256:'bc57f2b5226a73a1f0ca25f4f613af05e6d55b9d54bdc460f08d97062a560401'
 },
 [ROOT+'candidate-reviewed/I6_5_B4_003_RENOVACIONES_RENDER_OWNER_20261107.diff']:{
  blobSha:'2b31af1864377a7476fce19d1665db222a0ff5d9',
  sha256:'8f4adc8782275076ad1a8db593c1ea88fb8963acf5a91d34d6a29b6e30e45b04'
 },
 [ROOT+'candidate-reviewed/I6_5_RECONCILIATION_OWNER_DURABLE_CONTEXT_R2_20261107.patch']:{
  blobSha:'95d9ccfa2ee0c9d93d0887a32015129d72021880',
  sha256:'89bfd98acdce0effa99ece7dbda70fb9f47eeb3f36689f00eccf278e7158e4a8'
 },
 [ROOT+'candidate-reviewed/I6_5_MEDICAL12_PRESERVED_20261107.patch']:{
  blobSha:'9b2503855fb996db4410cdbf354f2beff819f4af',
  sha256:'244c392e9d9b13452f2c062450cf24b38b8e40db09b74c203d6a330da01e5cc9'
 }
};
export function validateReviewedDeferredCandidateArchives({record,fileBytes}){
 const p=record.reviewedDeferredCandidateArchives20261107;
 if(!p){need(!Object.keys(fileBytes).some(path=>path.startsWith(ROOT+'candidate-reviewed/')),'REVIEWED_CANDIDATE_UNDECLARED_ARCHIVE');return[];}
 const keys=['schema','status','productBaseSource','productBaseArtifactId','sourceIntegrated','built','deployed','previewAcceptanceGranted','liveAcceptanceGranted','artifacts'];
 need(same(Object.keys(p).sort(),keys.sort()),'REVIEWED_CANDIDATE_EXACT_KEYS');
 need(p.schema==='GRAVICENTRA_REVIEWED_DEFERRED_SOURCE_ARCHIVES_V1'&&p.status==='ARCHIVED_REVIEWED_DIFFS_ONLY_NOT_INTEGRATED','REVIEWED_CANDIDATE_STATUS');
 need(p.productBaseSource===READER_DEPLOY_BASE&&p.productBaseArtifactId===13584456766,'REVIEWED_CANDIDATE_PRODUCT_BASE');
 for(const key of ['sourceIntegrated','built','deployed','previewAcceptanceGranted','liveAcceptanceGranted'])need(p[key]===false,'REVIEWED_CANDIDATE_NO_EXECUTION_OR_ACCEPTANCE');
 need(Array.isArray(p.artifacts)&&same(p.artifacts.map(e=>e.path).sort(),Object.keys(REVIEWED_CANDIDATE_ARCHIVES).sort()),'REVIEWED_CANDIDATE_EXACT_PATHS');
 for(const entry of p.artifacts){
  need(same(Object.keys(entry).sort(),['path','blobSha','sha256'].sort()),'REVIEWED_CANDIDATE_ENTRY_KEYS');
  const pinned=REVIEWED_CANDIDATE_ARCHIVES[entry.path],bytes=fileBytes[entry.path];
  need(pinned&&entry.blobSha===pinned.blobSha&&entry.sha256===pinned.sha256&&bytes!=null&&blob(Buffer.from(bytes))===pinned.blobSha&&sha(Buffer.from(bytes))===pinned.sha256,'REVIEWED_CANDIDATE_EXACT_ARCHIVE_BYTES');
 }
 return Object.keys(REVIEWED_CANDIDATE_ARCHIVES);
}


// Exact owner-authorized capture correction over the frozen e503 successor.
// Historical current42/e503/reader/catalog bytes are still checked independently.
const POLICY_CAPTURE_BASE='932ccaca0a808b2b4ae577c0a3a27fa80220dbe5';
const POLICY_CAPTURE_KEY='policyCaptureCausalSourceCorrection20261107';
const POLICY_CAPTURE_WORKFLOW='.github/workflows/gravicentra-b4-003-immutable-candidate-preview.yml';
const POLICY_CAPTURE_CONTRACT='artifacts/orbit360-recovery/release-control/I6_5_B4_004_POLICY_CAPTURE_CAUSAL_FRONTEND_SUCCESSOR_CONTRACT_20261107.json';
const POLICY_CAPTURE_PRODUCTS=["orbit360-platform/core/policy-receipts-engine.js","orbit360-platform/modules/policy-receipts-v1199-bridge.js","orbit360-platform/modules/equipo.js","orbit360-platform/modules/crm-v1198-operational-bridge.js","orbit360-platform/core/backend-lab-receipts-portfolio-native-bridge-v20260801.js"];
const POLICY_CAPTURE_PINS={
  "orbit360-platform/core/policy-receipts-engine.js": {
    "before": "b04fdd580efcc2fdfa8703238e92ab5bc51d6347",
    "after": "37471433de5b09ba4ecd2ca847baae55317ff8e5"
  },
  "orbit360-platform/modules/policy-receipts-v1199-bridge.js": {
    "before": "79e8eefc821b17b1abb3ba7b26558e90199a9ea5",
    "after": "4867fb7db684908f6ca5a6edfc39460de5c1cf59"
  },
  "orbit360-platform/modules/equipo.js": {
    "before": "1bd7881ed29f6d7488bb806a96a0ab52c5c5c3b8",
    "after": "f584c4109294f8e32621c9ee9dd5cfdd55ca2c79"
  },
  "orbit360-platform/modules/crm-v1198-operational-bridge.js": {
    "before": "0ec76280098c2f47982779fbd8d3a220745ea912",
    "after": "a60cba8f13f53f1934718770517c7261e6860de1"
  },
  "orbit360-platform/core/backend-lab-receipts-portfolio-native-bridge-v20260801.js": {
    "before": "9b52aeda135d0e371018e739dda5c4ecc9779b58",
    "after": "fce274b01bf2c52c50e186df1ece97e7474805e7"
  },
  "tools/gravicentra-b4-004-policy-form-currency-commission.test.cjs": {
    "before": null,
    "after": "3b224bf02b2eaa7642de3692231f23125364ee97"
  },
  "tools/gravicentra-b4-004-equipo-commission-audit.test.cjs": {
    "before": null,
    "after": "7dba9e0557bc52c161ea0f5d1f8a0aaf133f15b5"
  },
  "tools/gravicentra-b4-004-client-create-country-scope.test.cjs": {
    "before": null,
    "after": "71eb60784e10d0820ed1918cfde37d65fd8198ab"
  },
  "tools/gravicentra-policy-writer-backend-causal.test.cjs": {
    "before": null,
    "after": "b26570f21440006fe22f30d4f3343f2de8eeb59b"
  },
  "tools/gravicentra-b4-004-policy-capture-successor.test.mjs": {
    "before": null,
    "after": "c5b0d4739e818532f6c76150b53b9867931ecab8"
  },
  "tools/gravicentra-i6-5-b4-003-preview-proof.mjs": {
    "before": "f2b32ad5ae09cff159a9c479bd61147a36ae2af9",
    "after": "315ac260c9d6c00a9cba37beb02c36ce951ac91e"
  },
  "tools/gravicentra-b4-004-policy-capture-preview-qa.mjs": {
    "before": null,
    "after": "c9a1442a5b740d950ed494e00515c07176bc957a"
  },
  "tools/gravicentra-b4-004-policy-capture-preview-qa.test.mjs": {
    "before": null,
    "after": "7200830634c275690bceb7a82d598b8b9ae51093"
  },
  "tools/gravicentra-b4-004-receipt-editor-preservation.test.cjs": {
    "before": null,
    "after": "93516d466f67d829089e5be03f46c96709ad57ca"
  },
  "artifacts/orbit360-recovery/release-control/I6_5_B4_004_POLICY_CAPTURE_CAUSAL_FRONTEND_SUCCESSOR_CONTRACT_20261107.json": {
    "before": null,
    "after": "985c1444446e21f17f1eb6462131304e0c6cc413"
  },
  ".github/workflows/gravicentra-b4-003-immutable-candidate-preview.yml": {
    "before": "8d17a2e1f4e2a6ff8da5d931790c364e8a2f828a",
    "after": "239d181370431484a8440532f4ceadf6ae1065a6"
  },
  "artifacts/orbit360-recovery/release-control/I6_5_B4_004_POLICY_CAPTURE_PREVIEW_FAILED_RUN42416303881_20261107.json": {
    "before": null,
    "after": "2de8a838fd3f9fec83a4ea853ba5086bb9645203"
  },
  "artifacts/orbit360-recovery/release-control/I6_5_B4_004_POLICY_CAPTURE_PREVIEW_FAILED_RUN42417572679_20261107.json": {
    "before": null,
    "after": "c214ee764ba333f341269b594c4e8c8a6b35ffd0"
  }
};
const POLICY_CAPTURE_PRESERVED={
  "artifacts/orbit360-recovery/release-control/I6_5_B4_003_CURRENT42_CAUSAL_FRONTEND_SUCCESSOR_CONTRACT_20261107.json": "c792b7db1aa3f16ed7ee20cbdffe2b76dc61b97f",
  "artifacts/orbit360-recovery/release-control/I6_5_B4_003_E503_RETAINED_HOSTING_PROMOTED_20261107.json": "45f1d3e461b7e92b60c94be820f94cb2f89cac9d",
  "orbit360-platform/index.html": "867c5e108988b68ca49702e494e96fa9f01afd71",
  "tools/gravicentra-i6-1-preview-package.mjs": "d42337f326637d669834664289cb3cce36b56342"
};

export function validatePolicyCaptureCausalSourceSuccessor({record,fileBytes,baseSourceBytes}){
 const p=record[POLICY_CAPTURE_KEY];if(!p)return null;
 need(p.schema==='GRAVICENTRA_POLICY_CAPTURE_CAUSAL_SOURCE_SUCCESSOR_V1'&&p.sourceBaseHead===POLICY_CAPTURE_BASE,'POLICY_CAPTURE_BASE');
 need(p.status==='EXACT_SOURCE_AND_QA_PREPARED_NEW_IMMUTABLE_PREVIEW_REQUIRED'&&p.realBusinessWrites===0&&p.backendSourceChanged===false&&p.rulesChanged===false&&p.authIamChanged===false&&p.livePromotionAuthorized===false&&p.productionAccepted===false&&p.newIntegralModulePass===false,'POLICY_CAPTURE_SCOPE');
 need(p.workflowPath===POLICY_CAPTURE_WORKFLOW&&p.contractPath===POLICY_CAPTURE_CONTRACT&&p.site==='ays-orbit-360-lab'&&p.channelId==='gi-i65-b4-rc-41765742748'&&p.buildExactlyOnce===true&&p.sameArtifactForLive===true,'POLICY_CAPTURE_IDENTITY');
 const q=p.authenticatedQaMode;need(q?.runner==='tools/gravicentra-i6-5-b4-003-preview-proof.mjs'&&q.helper==='tools/gravicentra-b4-004-policy-capture-preview-qa.mjs'&&q.test==='tools/gravicentra-b4-004-policy-capture-preview-qa.test.mjs'&&q.environmentMode==='B4_004_POLICY_CAPTURE_QA'&&q.businessWrites===0&&q.authAccountsCreated===0&&q.afterExactArtifactReadback===true&&q.existingSignedActorOnly===true&&q.fixtureIdentityAdapterOnly===true&&q.samePreviewWriterUnmodified===true&&q.exactLedgerCleanupOnly===true&&q.historicalCleanupNotExecuted===true&&q.testOutsideEntrypoint===true,'POLICY_CAPTURE_QA_SCOPE');
 const privateArchive=record.sourceInventory?.documentManifest20261107?.privateArchive;need(privateArchive&&!Object.hasOwn(privateArchive,'library_file_id')&&privateArchive.fileSha256==='f907293f2e35e72af54754dd8ce25988048eb2bdaad16c380533af6454773ab9'&&privateArchive.access==='OWNER_PRIVATE','POLICY_CAPTURE_PRIVATE_IDENTIFIER');
 need(p.current42ReceiptBlobSha==='0879188bf245248fa1092fb2014e35e14e802b44'&&p.preservedE503Source==='e5030ec5ba9854f0c576fd905c2f510766347ffa'&&p.preservedE503LiveBytesReceiptBlobSha==='45f1d3e461b7e92b60c94be820f94cb2f89cac9d','POLICY_CAPTURE_PRESERVED_IDENTITY');
 const changes=p.changes||[],paths=changes.map(e=>e.path);
 need(paths.length===new Set(paths).size&&same(paths.slice().sort(),Object.keys(POLICY_CAPTURE_PINS).sort()),'POLICY_CAPTURE_EXACT_PATHS');
 for(const e of changes){const pin=POLICY_CAPTURE_PINS[e.path];
  need(e.previousBlobSha===pin.before&&e.blobSha===pin.after,'POLICY_CAPTURE_PIN');
  need(fileBytes[e.path]!=null&&blob(Buffer.from(fileBytes[e.path]))===pin.after&&sha(Buffer.from(fileBytes[e.path]))===e.sha256,'POLICY_CAPTURE_CURRENT_BYTES');
  const prior=baseSourceBytes?.[e.path];need(pin.before===null?prior==null:prior!=null&&blob(Buffer.from(prior))===pin.before,'POLICY_CAPTURE_BASE_BYTES');
 }
 need(same((p.preservedFiles||[]).map(e=>e.path).sort(),Object.keys(POLICY_CAPTURE_PRESERVED).sort()),'POLICY_CAPTURE_PRESERVED_PATHS');
 for(const e of p.preservedFiles){const pin=POLICY_CAPTURE_PRESERVED[e.path];need(e.blobSha===pin&&fileBytes[e.path]!=null&&blob(Buffer.from(fileBytes[e.path]))===pin,'POLICY_CAPTURE_PRESERVED_BYTES');}
 const c=JSON.parse(Buffer.from(fileBytes[POLICY_CAPTURE_CONTRACT]).toString('utf8'));
 need(c.schema==='GRAVICENTRA_CURRENT42_CAUSAL_FRONTEND_SUCCESSOR_CONTRACT_V1'&&c.sourceBaseHead===POLICY_CAPTURE_BASE&&c.scope.b4003Reopened===false&&c.scope.historicalCertificatesRewritten===false&&c.scope.nextGateExecuted===false&&c.scope.backendFunctionDeploys===0&&c.scope.businessWrites===0&&c.scope.rulesWrites===0&&c.scope.authIamChanges===0&&c.scope.reimport===false&&c.promotion.authorized===false,'POLICY_CAPTURE_CONTRACT_SCOPE');
 need(same(c.productChanges.map(e=>e.path),POLICY_CAPTURE_PRODUCTS)&&c.productChanges.every(e=>e.beforeBlobSha===POLICY_CAPTURE_PINS[e.path].before&&e.afterBlobSha===POLICY_CAPTURE_PINS[e.path].after),'POLICY_CAPTURE_PRODUCT_CONTRACT');
 need(c.preservedAcceptance.receiptBlobSha===p.current42ReceiptBlobSha&&c.preservedPriorSuccessor.liveBytesReceiptBlobSha===p.preservedE503LiveBytesReceiptBlobSha&&c.rollback.sourceSha===p.preservedE503Source&&c.rollback.versionName==='sites/ays-orbit-360-lab/versions/d8caae0d585bf6dd'&&c.rollback.hostedPayloadDigest==='09c91023d1d22687528a61edb5a768dadbd59c465af91bc48016d21c94c6537f','POLICY_CAPTURE_ROLLBACK_PRESERVED');
 const f=p.qaCanonicalRoleEnvelopeCorrection20261107;
 const failedPath='artifacts/orbit360-recovery/release-control/I6_5_B4_004_POLICY_CAPTURE_PREVIEW_FAILED_RUN42416303881_20261107.json';
 need(f?.schema==='GRAVICENTRA_POLICY_CAPTURE_QA_CANONICAL_ROLE_CORRECTION_V1'&&f.parentSourceSha==='65bc0288b079883648642bf1474636b84d9d8e7a'&&f.status==='SOURCE_PREPARED_AUTHENTICATED_RETRY_PENDING'&&f.failedReceiptPath===failedPath&&f.failedReceiptBlobSha===POLICY_CAPTURE_PINS[failedPath].after,'POLICY_CAPTURE_QA_RETRY_BINDING');
 need(f.outboundFacadeRole==='Dirección'&&f.serverAuditNormalizedRole==='direccion'&&f.productOwnersChanged===false&&f.sourceContractChanged===false&&f.authOrScopeExpanded===false&&f.newBuildRequired===true&&f.failedArtifactPromotionAllowed===false&&f.newImmutablePreviewUat==='PENDING'&&f.productionAccepted===false,'POLICY_CAPTURE_QA_RETRY_SCOPE');
 const failed=JSON.parse(Buffer.from(fileBytes[failedPath]).toString('utf8'));
 need(failed.schema==='GRAVICENTRA_B4_004_IMMUTABLE_PREVIEW_FAILED_CAPTURE_RECEIPT_V1'&&failed.sourceSha===f.parentSourceSha&&failed.runId===42416303881&&f.failedRunId===failed.runId&&failed.status==='EXACT_ARTIFACT_VERIFIED_AUTHENTICATED_QA_FAILED_HOLD'&&failed.qa.status==='FAIL'&&failed.qa.productCommandsAdmitted===0&&failed.qa.seedWrites===2&&failed.qa.cleanupWrites===2&&failed.qa.syntheticFinalAbsent===true&&failed.qa.cleanup.verifiedAbsent===true&&f.failedProductCommandsAdmitted===failed.qa.productCommandsAdmitted&&f.failedSeedWrites===failed.qa.seedWrites&&f.failedCleanupWrites===failed.qa.cleanupWrites&&f.failedSyntheticFinalAbsent===failed.qa.syntheticFinalAbsent&&failed.boundaries.artifactPromotionAllowed===false&&failed.boundaries.productionAccepted===false,'POLICY_CAPTURE_QA_FAILED_EVIDENCE');
 const required=p.qaRequiredProductSelectionCorrection20261107;
 const requiredFailedPath='artifacts/orbit360-recovery/release-control/I6_5_B4_004_POLICY_CAPTURE_PREVIEW_FAILED_RUN42417572679_20261107.json';
 need(p.currentQaAttemptDecisionPointer==='qaRequiredProductSelectionCorrection20261107'&&required?.schema==='GRAVICENTRA_POLICY_CAPTURE_QA_REQUIRED_PRODUCT_CORRECTION_V1'&&required.parentSourceSha==='70778ea57aefb03d3fe1b13cbee4e9f920a1b461'&&required.status==='SOURCE_PREPARED_AUTHENTICATED_RETRY_PENDING'&&required.failedReceiptPath===requiredFailedPath&&required.failedReceiptBlobSha===POLICY_CAPTURE_PINS[requiredFailedPath].after,'POLICY_CAPTURE_REQUIRED_PRODUCT_BINDING');
 need(required.productOwnersChanged===false&&required.sourceContractChanged===false&&required.authOrScopeExpanded===false&&required.waitsExtended===false&&required.workflowExecutionChanged===false&&required.newBuildRequired===true&&required.failedArtifactPromotionAllowed===false&&required.newImmutablePreviewUat==='PENDING'&&required.productionAccepted===false&&required.actualFormAndEnginePreflight===true&&required.requiredFieldCount===18&&required.immediateVisibleFormErrorCheck===true&&required.unknownFormErrorTextHashedOnly===true,'POLICY_CAPTURE_REQUIRED_PRODUCT_SCOPE');
 const requiredFailed=JSON.parse(Buffer.from(fileBytes[requiredFailedPath]).toString('utf8'));
 need(requiredFailed.schema==='GRAVICENTRA_B4_004_IMMUTABLE_PREVIEW_FAILED_CAPTURE_RECEIPT_V1'&&requiredFailed.sourceSha===required.parentSourceSha&&requiredFailed.runId===42417572679&&required.failedRunId===requiredFailed.runId&&requiredFailed.status==='EXACT_ARTIFACT_VERIFIED_AUTHENTICATED_QA_FAILED_HOLD'&&requiredFailed.qa.status==='FAIL'&&requiredFailed.qa.completedChecks===4&&requiredFailed.qa.expectedChecks===7&&requiredFailed.qa.productCommandsAdmitted===3&&requiredFailed.qa.confirmedSyntheticMutations===4&&requiredFailed.qa.seedWrites===2&&requiredFailed.qa.cleanupWrites===11&&requiredFailed.qa.syntheticFinalAbsent===true&&requiredFailed.qa.cleanup.verifiedAbsent===true&&requiredFailed.boundaries.artifactPromotionAllowed===false&&requiredFailed.boundaries.productionAccepted===false,'POLICY_CAPTURE_REQUIRED_PRODUCT_FAILED_EVIDENCE');
 need(required.failedFocalChecksCompleted===requiredFailed.qa.completedChecks&&required.failedFocalChecksRequired===requiredFailed.qa.expectedChecks&&required.failedProductCommandsAdmitted===requiredFailed.qa.productCommandsAdmitted&&required.failedSyntheticMutations===requiredFailed.qa.confirmedSyntheticMutations&&required.failedSeedWrites===requiredFailed.qa.seedWrites&&required.failedCleanupWrites===requiredFailed.qa.cleanupWrites&&required.failedSyntheticFinalAbsent===requiredFailed.qa.syntheticFinalAbsent&&required.previousRoleCorrectionPreserved===true&&required.previousRetryRoleFencePassed===true,'POLICY_CAPTURE_REQUIRED_PRODUCT_FAILED_COUNTS');
 const comparableFileBytes={...fileBytes,[POLICY_CAPTURE_WORKFLOW]:Buffer.from(baseSourceBytes[POLICY_CAPTURE_WORKFLOW])};
 return{allowedPaths:paths,comparableFileBytes,frozenPredecessorHead:POLICY_CAPTURE_BASE};
}

// Exact transport/evidence successor of the five-owner source commit. This
// validator never manufactures a receipt, executes a build or performs a write.
const CAPTURE_RELEASE_BASE='6c45983610ce0d65a5c63bd07659ad968bfe9da3';
const CAPTURE_RELEASE_KEY='policyCaptureFrontendTransportSuccessor20261107';
const CAPTURE_RELEASE_CURSOR='b4004PolicyCaptureFrontendSuccessor20261107';
const CAPTURE_RELEASE_CONTRACT_BLOB='985c1444446e21f17f1eb6462131304e0c6cc413';
const CAPTURE_RELEASE_PINS={
  "tools/gravicentra-b4-003-retained-hosting-preflight.mjs": [
    "f361d6840ebf4cc03657c36a1bf6a03039e5c993",
    "9b4c166559ab35d9f60cc97d46abb7a3427ed41d"
  ],
  "tools/gravicentra-b4-003-retained-hosting-promotion.mjs": [
    "404b5fd60df843fa6e857aed04bb39e6232b6e6b",
    "268ad6992763084ed645fa766a6e22c1ccebb32f"
  ],
  ".github/workflows/gravicentra-b4-003-executor.yml": [
    "6344a5b9603390014bed2cf8a564ccb11f542ba4",
    "d02f776ddb11aa52731b1c6bf0ee29841fad83a0"
  ],
  "artifacts/orbit360-recovery/release-control/I6_5_B4_004_E503_ROLLBACK_DURABLE_CERTIFICATE_20261107.json": [
    null,
    "541b1560c18607e523fb3ae99ddd1d762476fb93"
  ],
  "tools/gravicentra-b4-004-policy-capture-retained-promotion.test.cjs": [
    null,
    "ba0e4ec0c48f2956c6653c5daaf8f6d676570fcd"
  ]
};
const CAPTURE_RELEASE_RECEIPTS={
 transport:ROOT+'I6_5_B4_004_POLICY_CAPTURE_IMMUTABLE_PREVIEW_TRANSPORT_20261107.json',
 focal:ROOT+'I6_5_B4_004_POLICY_CAPTURE_FOCAL_PREVIEW_QA_20261107.json',
 preflight:ROOT+'I6_5_B4_004_POLICY_CAPTURE_RETAINED_HOSTING_PREFLIGHT_20261107.json',
 promoted:ROOT+'I6_5_B4_004_POLICY_CAPTURE_RETAINED_HOSTING_PROMOTED_20261107.json'
};
const CAPTURE_RELEASE_PHASES={
 TRANSPORT_PREPARED_NO_ARTIFACT:null,
 EXACT_PREVIEW_TRANSPORT_PASS_FOCAL_UAT_PENDING:'EXACT_PREVIEW_TRANSPORT_PASS_FOCAL_UAT_PENDING',
 FOCAL_PREVIEW_PASS_PREFLIGHT_PENDING:'FRONTEND_SUCCESSOR_FOCAL_PREVIEW_PASS_PREFLIGHT_PENDING',
 PREFLIGHT_PASS_PROMOTION_NOT_AUTHORIZED:'FRONTEND_SUCCESSOR_FOCAL_PREVIEW_PASS_PREFLIGHT_PENDING',
 PROMOTION_AUTHORIZED:'FRONTEND_SUCCESSOR_PREVIEW_ACCEPTED_PROMOTION_AUTHORIZED',
 LIVE_BYTES_PASS_FOCAL_LIVE_PENDING:'FRONTEND_SUCCESSOR_LIVE_BYTES_PASS_FOCAL_LIVE_PENDING'
};
const captureReleaseProofKeys=['sourceSha','buildId','runId','artifactId','artifactZipSha256','archiveSha256','previewChannelId','previewUrl','versionName','workflowConclusion','exactServedReadbackPassed','hostedPayloadDigest','productFiles','artifactZipBytes','readbackReceiptArtifactId','readbackReceiptArtifactZipSha256','readbackReceiptPath','readbackReceiptBlobSha','readbackReceiptSha256'];
const captureReleaseAssertions=['exactArtifactBeforeWrites','originalAbsenceVerified','advisorCommissionAndScopedAudit','clientFormAndAtomicActivity','policyFormAtomicBatchAndDerivedClientState','receiptEditFormAndAtomicPortfolioActivity','freshProductReloadWithoutAdapter'];
const captureReleaseDigest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const captureReleaseGit=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);
const captureReleaseId=value=>Number.isSafeInteger(value)&&value>0;

export function validatePolicyCaptureTransportSuccessorSnapshot({record,control,state,fileBytes,baseSourceBytes,baseControl,baseState}){
 const p=record[CAPTURE_RELEASE_KEY],c=control[CAPTURE_RELEASE_CURSOR],s=state[CAPTURE_RELEASE_CURSOR];
 if(!p){need(c===undefined&&s===undefined,'CAPTURE_RELEASE_UNDECLARED_CURSOR');return null;}
 need(captureReleaseGit(CAPTURE_RELEASE_BASE)&&p.schema==='GRAVICENTRA_POLICY_CAPTURE_FRONTEND_TRANSPORT_SUCCESSOR_V1'&&p.sourceBaseHead===CAPTURE_RELEASE_BASE,'CAPTURE_RELEASE_BASE');
 need(Object.hasOwn(CAPTURE_RELEASE_PHASES,p.phase),'CAPTURE_RELEASE_PHASE');
 need(p.productSourceChangedAfterBuild===false&&p.rebuildExecuted===false&&p.artifactPatched===false&&p.backendFunctionDeploys===0&&p.rulesWrites===0&&p.authIamChanges===0&&p.realBusinessWrites===0&&p.nextGateAccepted===false&&p.globalProductionAccepted===false,'CAPTURE_RELEASE_BOUNDARY');
 need(p.sourceContractPath===POLICY_CAPTURE_CONTRACT&&p.sourceContractBlobSha===CAPTURE_RELEASE_CONTRACT_BLOB&&fileBytes[POLICY_CAPTURE_CONTRACT]!=null&&blob(Buffer.from(fileBytes[POLICY_CAPTURE_CONTRACT]))===CAPTURE_RELEASE_CONTRACT_BLOB,'CAPTURE_RELEASE_CONTRACT');
 need(record[POLICY_CAPTURE_KEY]?.sourceBaseHead===POLICY_CAPTURE_BASE&&record[POLICY_CAPTURE_KEY]?.livePromotionAuthorized===false,'CAPTURE_RELEASE_SOURCE_GRANT');
 need(baseControl&&baseState&&!Object.hasOwn(baseControl,CAPTURE_RELEASE_CURSOR)&&!Object.hasOwn(baseState,CAPTURE_RELEASE_CURSOR),'CAPTURE_RELEASE_BASE_CURSOR_ABSENT');
 for(const key of ['b4003ActiveCertificationCursor20261106','b4003CausalFrontendSuccessor20261107'])
  need(same(control[key],baseControl[key])&&same(state[key],baseState[key]),'CAPTURE_RELEASE_HISTORICAL_CURSOR_'+key);
 const contract=JSON.parse(Buffer.from(fileBytes[POLICY_CAPTURE_CONTRACT]).toString('utf8'));
 const rollback=contract.rollback;
 const prepared=p.phase==='TRANSPORT_PREPARED_NO_ARTIFACT';
 const transportOnly=p.phase==='EXACT_PREVIEW_TRANSPORT_PASS_FOCAL_UAT_PENDING';
 const authorized=p.phase==='PROMOTION_AUTHORIZED';
 const observed=p.phase==='LIVE_BYTES_PASS_FOCAL_LIVE_PENDING';
 const needsPreflight=['PREFLIGHT_PASS_PROMOTION_NOT_AUTHORIZED','PROMOTION_AUTHORIZED','LIVE_BYTES_PASS_FOCAL_LIVE_PENDING'].includes(p.phase);
 need(p.productionPromotionAuthorized===authorized,'CAPTURE_RELEASE_AUTHORIZATION');
 const pins={...CAPTURE_RELEASE_PINS};
 const requiredRefs=[['transportEvidence','transport',!prepared],['focalEvidence','focal',!prepared&&!transportOnly],['preflightEvidence','preflight',needsPreflight],['promotionEvidence','promoted',observed]];
 for(const [key,kind,required]of requiredRefs){
  const ref=p[key];
  if(!required){need(ref===undefined,'CAPTURE_RELEASE_PREMATURE_'+kind);continue;}
  need(ref&&ref.path===CAPTURE_RELEASE_RECEIPTS[kind]&&captureReleaseGit(ref.blobSha)&&captureReleaseDigest(ref.sha256)&&captureReleaseId(ref.runId)&&captureReleaseGit(ref.runnerCommit)&&ref.runConclusion==='success','CAPTURE_RELEASE_REFERENCE_'+kind);
  pins[ref.path]=[null,ref.blobSha];
 }
 need(Array.isArray(p.changes)&&p.changes.length===Object.keys(pins).length&&same(p.changes.map(e=>e.path).sort(),Object.keys(pins).sort()),'CAPTURE_RELEASE_EXACT_PATHS');
 const comparableFileBytes={...fileBytes};
 for(const e of p.changes){
  const pin=pins[e.path],current=fileBytes[e.path],before=baseSourceBytes?.[e.path];
  need(e.previousBlobSha===pin[0]&&e.blobSha===pin[1]&&current!=null&&blob(Buffer.from(current))===pin[1]&&sha(Buffer.from(current))===e.sha256,'CAPTURE_RELEASE_CURRENT_PIN');
  need(pin[0]===null?before==null:before!=null&&blob(Buffer.from(before))===pin[0],'CAPTURE_RELEASE_BEFORE_PIN');
  // Only validated predecessor bytes enter the old catalog/e503 validators.
  if(pin[0]!==null)comparableFileBytes[e.path]=Buffer.from(before);
 }
 const json=path=>JSON.parse(Buffer.from(fileBytes[path]).toString('utf8'));
 const readEvidence=(ref,kind)=>{
  const bytes=Buffer.from(fileBytes[ref.path]);
  need(blob(bytes)===ref.blobSha&&sha(bytes)===ref.sha256,'CAPTURE_RELEASE_EVIDENCE_BYTES_'+kind);
  return json(ref.path);
 };
 if(prepared){need(c===undefined&&s===undefined,'CAPTURE_RELEASE_PREPARED_CURSOR_FORBIDDEN');}
 else{
  need(c&&s&&same(c,s)&&c.schema==='GRAVICENTRA_B4_004_POLICY_CAPTURE_SUCCESSOR_CURSOR_V1','CAPTURE_RELEASE_CURSOR_PARITY');
  const expectedKeys=['schema','status','preservedAcceptancePointer','preservedPriorSuccessorPointer','sourceContractPath','sourceContractBlobSha','activeSourceSha','activeBuildId','activeImmutableArtifactId','immutableSuccessor44PreviewReadback','productionPromotionAuthorized','b4003Closed','b4003HistoricalAcceptancePreserved','nextGateAccepted',...(!transportOnly?['focalAuthenticatedAcceptance','formalPreviewAcceptance']:[])];
  need(same(Object.keys(c).sort(),expectedKeys.sort()),'CAPTURE_RELEASE_CURSOR_KEYS');
  need(c.status===CAPTURE_RELEASE_PHASES[p.phase]&&c.productionPromotionAuthorized===authorized&&c.b4003Closed===true&&c.b4003HistoricalAcceptancePreserved===true&&c.nextGateAccepted===false,'CAPTURE_RELEASE_CURSOR_STATUS');
  need(c.preservedAcceptancePointer==='/b4003ActiveCertificationCursor20261106/formalLiveAcceptance'&&c.preservedPriorSuccessorPointer==='/b4003CausalFrontendSuccessor20261107'&&c.sourceContractPath===POLICY_CAPTURE_CONTRACT&&c.sourceContractBlobSha===CAPTURE_RELEASE_CONTRACT_BLOB,'CAPTURE_RELEASE_CURSOR_CONTRACT');
  const proof=c.immutableSuccessor44PreviewReadback;
  need(proof&&same(Object.keys(proof).sort(),captureReleaseProofKeys.slice().sort()),'CAPTURE_RELEASE_PROOF_KEYS');
  need(c.activeSourceSha===CAPTURE_RELEASE_BASE&&proof.sourceSha===CAPTURE_RELEASE_BASE&&typeof proof.buildId==='string'&&proof.buildId.startsWith('gi-i65-b4-'+CAPTURE_RELEASE_BASE.slice(0,12)+'-')&&c.activeBuildId===proof.buildId&&captureReleaseId(proof.artifactId)&&c.activeImmutableArtifactId===proof.artifactId,'CAPTURE_RELEASE_ACTIVE_ARTIFACT');
  need(captureReleaseId(proof.runId)&&captureReleaseId(proof.artifactZipBytes)&&captureReleaseId(proof.productFiles)&&captureReleaseId(proof.readbackReceiptArtifactId)&&![13549460562,13584456766].includes(proof.artifactId),'CAPTURE_RELEASE_ARTIFACT_ORIGIN');
  for(const key of ['artifactZipSha256','archiveSha256','hostedPayloadDigest','readbackReceiptArtifactZipSha256','readbackReceiptSha256'])need(captureReleaseDigest(proof[key]),'CAPTURE_RELEASE_DIGEST_'+key);
  need(proof.previewChannelId==='gi-i65-b4-rc-41765742748'&&proof.previewUrl==='https://ays-orbit-360-lab--gi-i65-b4-rc-41765742748-neoi3u7r.web.app'&&proof.workflowConclusion==='success'&&proof.exactServedReadbackPassed===true,'CAPTURE_RELEASE_EXACT_PREVIEW');
  const validVersion=/^sites\/ays-orbit-360-lab\/versions\/[A-Za-z0-9_-]+$/.test(proof.versionName||'')&&![VERSION,rollback.versionName].includes(proof.versionName);
  need(needsPreflight?validVersion:proof.versionName===null||validVersion,'CAPTURE_RELEASE_NEW_VERSION');
  const tr=p.transportEvidence,t=readEvidence(tr,'transport');
  need(tr.runnerCommit===CAPTURE_RELEASE_BASE&&tr.runId===proof.runId&&proof.readbackReceiptPath===tr.path&&proof.readbackReceiptBlobSha===tr.blobSha&&proof.readbackReceiptSha256===tr.sha256,'CAPTURE_RELEASE_TRANSPORT_ORIGIN');
  need(t.schema==='I6_5_B4_003_IMMUTABLE_PREVIEW_RELEASE_BUNDLE_V1','CAPTURE_RELEASE_TRANSPORT_SCHEMA');
  for(const key of ['sourceSha','buildId','runId','artifactId','artifactZipSha256','archiveSha256','hostedPayloadDigest','productFiles','previewUrl'])need(t[key]===proof[key],'CAPTURE_RELEASE_TRANSPORT_BINDING_'+key);
  need(t.sourceContract===POLICY_CAPTURE_CONTRACT&&same(t.preservedCurrent42,contract.preservedAcceptance)&&same(t.rollback,rollback),'CAPTURE_RELEASE_TRANSPORT_PRESERVED');
  need(t.servedArtifactExact===true&&t.fullProductReadback===true&&t.liveLabStable===true&&t.liveAppDomainStable===true&&t.backendFunctionsDeployed===0&&t.dataWrites===0&&t.firestoreRulesWrites===0&&t.authIamChanges===0&&t.productionDeploy===false&&t.authenticatedUat==='PENDING'&&t.productionPromotionAuthorized===false,'CAPTURE_RELEASE_TRANSPORT_SCOPE');
  if(!transportOnly){
   const qr=p.focalEvidence,q=readEvidence(qr,'focal');
   need(qr.runnerCommit===CAPTURE_RELEASE_BASE&&qr.runId===proof.runId&&new RegExp('^'+String(proof.runId)+'_[1-9][0-9]*$').test(q.runId||'')&&q.target===proof.previewUrl,'CAPTURE_RELEASE_QA_ORIGIN');
   need(q.schema==='GRAVICENTRA_B4_004_POLICY_CAPTURE_FOCAL_PREVIEW_QA_V1'&&q.status==='FOCAL_AUTHENTICATED_UI_PASS','CAPTURE_RELEASE_QA_STATUS');
   for(const key of ['sourceSha','buildId','artifactId','artifactZipSha256','archiveSha256','hostedPayloadDigest'])need(q.artifact?.[key]===proof[key],'CAPTURE_RELEASE_QA_ARTIFACT_'+key);
   need(Array.isArray(q.sourceOwners)&&same(q.sourceOwners.map(x=>({path:x.path,blobSha:x.blobSha})),contract.productChanges.map(x=>({path:x.path,blobSha:x.afterBlobSha}))),'CAPTURE_RELEASE_QA_OWNERS');
   need(q.assertions&&same(Object.keys(q.assertions).sort(),captureReleaseAssertions.slice().sort())&&captureReleaseAssertions.every(k=>q.assertions[k]===true),'CAPTURE_RELEASE_QA_ASSERTIONS');
   need(q.businessWrites===0&&q.authAccountsCreated===0&&q.membershipWrites===0&&q.productSourceChanged===false&&q.backendChanged===false&&q.syntheticFinalAbsent===true&&Array.isArray(q.errors)&&q.errors.length===0&&q.pageErrorCount===0&&q.consoleErrorCount===0&&q.httpErrorCount===0,'CAPTURE_RELEASE_QA_BOUNDARY');
   need(q.actor?.existingPrincipal===true&&String(q.actor.activeRole||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()==='direccion'&&captureReleaseDigest(q.actor.uidSha256),'CAPTURE_RELEASE_QA_ACTOR');
   need(q.cleanup?.method==='EXACT_PREDECLARED_IDS_AND_CAPTURED_SERVER_RECEIPTS'&&q.cleanup.compareAndDeleteTransaction===true&&q.cleanup.verifiedAbsent===true&&q.cleanup.actorTimeWindowQuery===false&&q.cleanup.prefixDelete===false,'CAPTURE_RELEASE_QA_CLEANUP');
   const acceptance=c.focalAuthenticatedAcceptance,seal=c.formalPreviewAcceptance;
   need(acceptance?.status==='PASS'&&acceptance.sourceSha===proof.sourceSha&&acceptance.buildId===proof.buildId&&acceptance.artifactId===proof.artifactId&&same(acceptance.evidencePins,[{path:qr.path,blobSha:qr.blobSha}])&&acceptance.realBusinessWrites===0&&acceptance.exactSyntheticCleanupVerified===true&&acceptance.syntheticIdentityAdaptationDeclared===true,'CAPTURE_RELEASE_FOCAL_REFERENCE');
   need(same(Object.keys(acceptance).sort(),['status','sourceSha','buildId','artifactId','evidencePins','realBusinessWrites','exactSyntheticCleanupVerified','syntheticIdentityAdaptationDeclared'].sort()),'CAPTURE_RELEASE_FOCAL_KEYS');
   need(same(seal,{status:'LATEST_APPROVED_VERSION_PREVIEW_PASS',sourceSha:proof.sourceSha,buildId:proof.buildId,artifactId:proof.artifactId,archiveSha256:proof.archiveSha256}),'CAPTURE_RELEASE_FOCAL_SEAL');
  }
  if(needsPreflight){
   const ref=p.preflightEvidence,r=readEvidence(ref,'preflight');
   need(String(r.runId)===String(ref.runId)&&r.runnerCommit===ref.runnerCommit,'CAPTURE_RELEASE_PREFLIGHT_ORIGIN');
   need(r.schema==='B4_003_RETAINED_HOSTING_PREFLIGHT_V1'&&r.status==='EXACT_RETAINED_ARTIFACT_HOSTING_PREFLIGHT_PASS'&&r.failedCheckCount===0&&r.b4003Closed===true&&r.b4003HistoricalAcceptancePreserved===true,'CAPTURE_RELEASE_PREFLIGHT_STATUS');
   const names=['exact_candidate_and_archive','artifact_run_metadata','reuse_existing_service_account_for_gets','live_before_snapshot','preview_version_and_all_served_bytes','certified_rollback_version_and_all_served_bytes','live_unchanged_after_readonly_preflight'];
   need(Array.isArray(r.checks)&&r.checks.length===7&&same(r.checks.map(x=>x.name).sort(),names.sort())&&r.checks.every(x=>x.status==='PASS'),'CAPTURE_RELEASE_SEVEN_PREFLIGHT_CHECKS');
   for(const key of ['sourceSha','buildId','runId','artifactId','artifactZipSha256','archiveSha256','previewUrl'])need(r.binding?.[key]===proof[key],'CAPTURE_RELEASE_PREFLIGHT_BINDING_'+key);
   need(r.binding?.site==='ays-orbit-360-lab'&&r.binding.projectId==='ays-orbit-360-lab'&&r.previewVersionName===proof.versionName&&r.rollbackVersionName===rollback.versionName&&r.liveVersionName===rollback.versionName,'CAPTURE_RELEASE_PREFLIGHT_VERSIONS');
   need(r.control?.recordedB4003Closed===true&&r.control.recordedPromotionAuthorization===false,'CAPTURE_RELEASE_PREFLIGHT_NO_PRIOR_AUTHORIZATION');
   need(r.scope?.remoteReadsOnly===true&&r.scope.buildExecuted===false&&r.scope.hostingMutation===false&&r.scope.functionsDeployment===false&&r.scope.rulesChanged===false&&r.scope.authConfigurationChanged===false&&r.scope.dataWrites===0,'CAPTURE_RELEASE_PREFLIGHT_SCOPE');
   const pv=r.checks.find(x=>x.name==='preview_version_and_all_served_bytes').evidence;
   const rb=r.checks.find(x=>x.name==='certified_rollback_version_and_all_served_bytes').evidence;
   need(pv?.digest===proof.hostedPayloadDigest&&pv.fileCount===proof.productFiles,'CAPTURE_RELEASE_PREFLIGHT_PAYLOAD');
   need(rb?.rawBytesReadInThisRun===true&&rb.rawPayloadDigestVerified===true&&rb.digest===rollback.hostedPayloadDigest&&rb.fileCount===rollback.productFiles,'CAPTURE_RELEASE_FRESH_E503_ROLLBACK');
  }
  if(observed){
   const ref=p.promotionEvidence,r=readEvidence(ref,'promoted');
   need(String(r.runId)===String(ref.runId)&&r.runnerCommit===ref.runnerCommit,'CAPTURE_RELEASE_PROMOTION_ORIGIN');
   need(r.schema==='B4_003_EXACT_HOSTING_PROMOTION_V1'&&r.status==='EXACT_HOSTING_VERSION_PROMOTED_LIVE_BYTES_PASS_FUNCTIONAL_LIVE_PENDING'&&r.promotionAttempted===true&&r.rollbackAttempted===false&&r.formalLiveAcceptanceGranted===false&&r.b4003Closed===true&&r.b4003HistoricalAcceptancePreserved===true,'CAPTURE_RELEASE_PROMOTION_STATUS');
   for(const key of ['sourceSha','buildId','artifactId','artifactZipSha256','archiveSha256'])need(r.binding?.[key]===proof[key],'CAPTURE_RELEASE_PROMOTION_BINDING_'+key);
   need(r.previewVersionName===proof.versionName&&r.rollbackVersionName===rollback.versionName&&r.liveBeforeVersionName===rollback.versionName&&r.promotionMethod==='POST_EXISTING_VERSION_RELEASE_NO_NEW_VERSION'&&r.promotionTargetVersionName===proof.versionName,'CAPTURE_RELEASE_PROMOTION_METHOD');
   need(r.liveAfter?.channel?.versionName===proof.versionName&&r.liveAfter.hostedFileCount===proof.productFiles&&r.liveAfter.hostedPayloadDigest===proof.hostedPayloadDigest&&r.liveAfter.nonTargetSentinelsUnchanged===true&&r.functionsDeployed===0&&r.rulesChanged===false&&r.authConfigurationChanged===false&&r.dataWrites===0,'CAPTURE_RELEASE_PROMOTION_READBACK');
  }
 }
 const comparableControl=clone(control),comparableState=clone(state);
 delete comparableControl[CAPTURE_RELEASE_CURSOR];delete comparableState[CAPTURE_RELEASE_CURSOR];
 return {comparableFileBytes,comparableControl,comparableState,allowedPaths:Object.keys(pins),sourceBaseHead:CAPTURE_RELEASE_BASE,phase:p.phase};
}

export function validateOwnerDecisionSuccessorSnapshot({control,baseControl,state,baseState,changedPaths,fileBytes,baseSourceBytes,postBaseSourceBytes,catalogBaseSourceBytes,policyCaptureBaseSourceBytes,captureReleaseBaseSourceBytes,captureReleaseBaseControl,captureReleaseBaseState}){
 const p=control[OWNER_KEY];
 need(p&&p.authorityBaseHead===OWNER_BASE,'OWNER_BASE_BINDING');
 const bytes=path=>{need(fileBytes[path]!=null,'OWNER_FILE_MISSING');return Buffer.from(fileBytes[path]);};
 need(p.path===OWNER_FREEZE&&p.planPath===OWNER_PLAN&&blob(bytes(OWNER_FREEZE))===p.blobSha&&blob(bytes(OWNER_PLAN))===p.planBlobSha,'OWNER_DOCUMENT_HASH');
 const r=JSON.parse(bytes(OWNER_FREEZE).toString('utf8'));
 const captureRelease=validatePolicyCaptureTransportSuccessorSnapshot({record:r,control,state,fileBytes,baseSourceBytes:captureReleaseBaseSourceBytes,baseControl:captureReleaseBaseControl,baseState:captureReleaseBaseState});
 if(captureRelease){control=captureRelease.comparableControl;state=captureRelease.comparableState;}
 const sourceFileBytes=captureRelease?.comparableFileBytes||fileBytes;
 const captureExecution=validatePolicyCaptureCausalSourceSuccessor({record:r,fileBytes:sourceFileBytes,baseSourceBytes:policyCaptureBaseSourceBytes});
 const predecessorFileBytes=captureExecution?.comparableFileBytes||sourceFileBytes;
 const readerExecution=validateReaderDeploymentSuccessorSnapshot({record:r,fileBytes:predecessorFileBytes,baseSourceBytes:postBaseSourceBytes});
 const catalogExecution=validateCatalogTransportSuccessorSnapshot({record:r,fileBytes:predecessorFileBytes,baseSourceBytes:catalogBaseSourceBytes});
 const promotionExecution=validateFrontendPromotionSuccessorSnapshot({record:r,control,state,fileBytes:catalogExecution?.comparableFileBytes||predecessorFileBytes,baseSourceBytes:postBaseSourceBytes});
 if(promotionExecution){control=promotionExecution.comparableControl;state=promotionExecution.comparableState;}
 const reconciliationExecution=validateReconciliationReadOnlySuccessorSnapshot({record:r,control,state,fileBytes:predecessorFileBytes,baseSourceBytes:postBaseSourceBytes});
 if(reconciliationExecution){control=reconciliationExecution.comparableControl;state=reconciliationExecution.comparableState;}
 const candidateArchives=validateReviewedDeferredCandidateArchives({record:r,fileBytes});
 const postAllowedPaths=[...(readerExecution?.allowedPaths||[]),...(promotionExecution?.allowedPaths||[]),...(reconciliationExecution?.allowedPaths||[]),...(catalogExecution?.allowedPaths||[]),...candidateArchives,...(captureExecution?.allowedPaths||[]),...(captureRelease?.allowedPaths||[])];
 const team=validateEquipoCausalSourceSuccessor({record:r,pointer:p,fileBytes:readerExecution?.comparableFileBytes||predecessorFileBytes,baseSourceBytes});
 const permitted=new Set([ROOT+'CONTROL_PLANE.json',STATE,OWNER_FREEZE,OWNER_PLAN,SELF,OWNER_TEST,...(team?.allowedPaths||[]),...postAllowedPaths]);
 need(changedPaths.every(x=>permitted.has(x)),'OWNER_UNDECLARED_PATH');
 for(const path of [OWNER_FREEZE,OWNER_PLAN,SELF,OWNER_TEST,...(team?.allowedPaths||[]),...postAllowedPaths])need(changedPaths.includes(path),'OWNER_REQUIRED_PATH');
 need(r.schema==='GRAVICENTRA_OWNER_DECISION_FREEZE_20261107_V1'&&r.authorityBaseHead===OWNER_BASE&&r.additiveOnly===true&&r.repository==='paulaosoriof86/orbit360-core'&&r.branch==='recovery/fase-a-clean-20260831','OWNER_RECEIPT_IDENTITY');
 need(r.plan?.path===OWNER_PLAN&&r.plan.blobSha===p.planBlobSha,'OWNER_PLAN_BINDING');
 need(r.nextGateExecuted===false&&r.nextGateAccepted===false&&p.nextGateExecuted===false&&p.nextGateAccepted===false&&p.productSourceChanged===!!team&&p.realBusinessWrites===0,'OWNER_NO_NEW_ACCEPTANCE');
 const execution=r.execution||{};
 for(const key of ['productDeployed','dnsChanged','dataImportExecuted','newModulePassGranted'])need(execution[key]===false,'OWNER_EXECUTION_'+key);
 for(const key of ['productSourceChanged','workflowChanged'])need(execution[key]===!!team,'OWNER_EXECUTION_'+key);
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
 return {comparableControl:projected,allowedPaths:[OWNER_FREEZE,OWNER_PLAN,OWNER_TEST,...(team?.allowedPaths||[]),...postAllowedPaths]};
}
function verifyOwnerDecisionSuccessor(after){
 if(!after[OWNER_KEY])return null;
 need(git('merge-base',OWNER_BASE,'HEAD')===OWNER_BASE,'OWNER_BASE_NOT_ANCESTOR');
 const record=read(OWNER_FREEZE),sourceProof=record.equipoCausalSourceCorrection;
 const captureProof=record[POLICY_CAPTURE_KEY],captureEntries=captureProof?.changes||[];
 const releaseProof=record[CAPTURE_RELEASE_KEY],releaseEntries=releaseProof?.changes||[];
 const releasePermitted=new Set([...Object.keys(CAPTURE_RELEASE_PINS),...Object.values(CAPTURE_RELEASE_RECEIPTS)]);
 need(releaseEntries.every(e=>releasePermitted.has(e.path)),'CAPTURE_RELEASE_UNDECLARED_PATH');
 need(captureEntries.every(e=>Object.hasOwn(POLICY_CAPTURE_PINS,e.path)),'POLICY_CAPTURE_UNDECLARED_PATH');
 const frozenProductEnd=captureProof?POLICY_CAPTURE_BASE:'HEAD';
 const extraPaths=sourceProof?.changes?.map(x=>x.path)||[];
 need(extraPaths.every(path=>Object.hasOwn(TEAM_SOURCE_PATHS,path)),'TEAM_SOURCE_PATH');
 const postGrants=[record.readerDeploymentSuccessor,record.frontendPromotionSuccessor,record.reconciliationReadOnlySuccessor].filter(Boolean);
 const postEntries=postGrants.flatMap(x=>x.changes||[]);
 const postPermitted=new Set([...Object.keys(READER_DEPLOY_PINS),...Object.keys(FRONTPROMO_PINS),FRONTPROMO_PREFLIGHT,FRONTPROMO_PROMOTED,
  '.github/workflows/gravicentra-recovery-i6-postsalida.yml','tools/gravicentra-i6-5-encrypted-live-snapshot.mjs','tools/gravicentra-i6-5-october-private-snapshot.test.mjs',
  ROOT+'I6_5_OCTOBER_RECONCILIATION_PRIVATE_READBACK_REQUEST_20261107.json',ROOT+'I6_5_OCTOBER_RECONCILIATION_SNAPSHOT_PUBLIC_KEY_20261107.pem']);
 need(postEntries.every(x=>postPermitted.has(x.path)),'POST_E503_UNDECLARED_PATH');
 const catalogEntries=record.catalogTransportSuccessor?.changes||[];
 need(catalogEntries.every(e=>Object.hasOwn(CATALOG_PINS,e.path)),'CATALOG_UNDECLARED_PATH');
 const candidateEntries=record.reviewedDeferredCandidateArchives20261107?.artifacts||[];
 need(Array.isArray(candidateEntries)&&candidateEntries.every(e=>Object.hasOwn(REVIEWED_CANDIDATE_ARCHIVES,e.path)),'REVIEWED_CANDIDATE_UNDECLARED_PATH');
 const catalogActivationPresent=fs.existsSync(CATALOG_ACTIVATION);
 const activationPresent=fs.existsSync(READER_DEPLOY_ACTIVATION);
 const paths=[...new Set([ROOT+'CONTROL_PLANE.json',STATE,OWNER_FREEZE,OWNER_PLAN,SELF,OWNER_TEST,OWNER_V6,...extraPaths,...postEntries.map(x=>x.path),...(activationPresent?[READER_DEPLOY_ACTIVATION]:[]),...catalogEntries.map(e=>e.path),...(catalogActivationPresent?[CATALOG_ACTIVATION]:[]),...candidateEntries.map(e=>e.path),...captureEntries.map(e=>e.path),...releaseEntries.map(e=>e.path),...(captureProof?Object.keys(POLICY_CAPTURE_PRESERVED):[])])];
 const fileBytes={},baseSourceBytes={},postBaseSourceBytes={},catalogBaseSourceBytes={},policyCaptureBaseSourceBytes={},captureReleaseBaseSourceBytes={};
 let captureReleaseBaseControl,captureReleaseBaseState;
 if(releaseProof){
  need(captureReleaseGit(CAPTURE_RELEASE_BASE)&&releaseProof.sourceBaseHead===CAPTURE_RELEASE_BASE&&git('merge-base',CAPTURE_RELEASE_BASE,'HEAD')===CAPTURE_RELEASE_BASE,'CAPTURE_RELEASE_BASE_ANCESTRY');
  need(!git('diff','--name-only',CAPTURE_RELEASE_BASE,'HEAD','--','functions','orbit360-platform',':(exclude)orbit360-platform/docs/**','tools/gravicentra-i6-1-preview-package.mjs',POLICY_CAPTURE_CONTRACT),'CAPTURE_RELEASE_PRODUCT_OR_BUILD_CHANGED');
  const predecessorRecord=old(CAPTURE_RELEASE_BASE,OWNER_FREEZE);
  need(!predecessorRecord[CAPTURE_RELEASE_KEY]&&same(record[POLICY_CAPTURE_KEY],predecessorRecord[POLICY_CAPTURE_KEY]),'CAPTURE_RELEASE_SOURCE_GRANT_CHANGED');
  captureReleaseBaseControl=old(CAPTURE_RELEASE_BASE,ROOT+'CONTROL_PLANE.json');
  captureReleaseBaseState=old(CAPTURE_RELEASE_BASE,STATE);
  for(const e of releaseEntries){
   if(e.previousBlobSha===null){need(!git('ls-tree',CAPTURE_RELEASE_BASE,'--',e.path),'CAPTURE_RELEASE_NEW_PATH_EXISTS');captureReleaseBaseSourceBytes[e.path]=null;}
   else captureReleaseBaseSourceBytes[e.path]=execFileSync('git',['show',CAPTURE_RELEASE_BASE+':'+e.path]);
  }
 }
 if(captureProof){
  need(captureProof.sourceBaseHead===POLICY_CAPTURE_BASE&&git('merge-base',POLICY_CAPTURE_BASE,'HEAD')===POLICY_CAPTURE_BASE,'POLICY_CAPTURE_BASE_ANCESTRY');
  need(!git('diff','--name-only',POLICY_CAPTURE_BASE,'HEAD','--','functions'),'POLICY_CAPTURE_BACKEND_CHANGED');
  const changed=git('diff','--name-only',POLICY_CAPTURE_BASE,'HEAD','--','orbit360-platform',':(exclude)orbit360-platform/docs/**').split(/\r?\n/).filter(Boolean).sort();
  need(same(changed,POLICY_CAPTURE_PRODUCTS.slice().sort()),'POLICY_CAPTURE_PRODUCT_DIFF');
  for(const e of captureEntries){
   if(POLICY_CAPTURE_PINS[e.path].before===null){need(!git('ls-tree',POLICY_CAPTURE_BASE,'--',e.path),'POLICY_CAPTURE_NEW_PATH_EXISTS');policyCaptureBaseSourceBytes[e.path]=null;}
   else policyCaptureBaseSourceBytes[e.path]=execFileSync('git',['show',POLICY_CAPTURE_BASE+':'+e.path]);
  }
 }
 if(sourceProof){
  need(git('merge-base',TEAM_SOURCE_BASE,'HEAD')===TEAM_SOURCE_BASE,'TEAM_SOURCE_BASE_ANCESTRY');
  for(const path of extraPaths){
   if(TEAM_SOURCE_PATHS[path]===null){need(!git('ls-tree',TEAM_SOURCE_BASE,'--',path),'TEAM_SOURCE_NEW_PATH_ALREADY_EXISTS');baseSourceBytes[path]=null;}
   else baseSourceBytes[path]=execFileSync('git',['show',TEAM_SOURCE_BASE+':'+path]);
  }
 }
 if(postGrants.length){
  need(git('merge-base',READER_DEPLOY_BASE,'HEAD')===READER_DEPLOY_BASE,'POST_E503_BASE_ANCESTRY');
  need(!git('diff','--name-only',READER_DEPLOY_BASE,frozenProductEnd,'--','functions','orbit360-platform',':(exclude)orbit360-platform/docs/**'),'POST_E503_PRODUCT_REBUILD_FORBIDDEN');
  for(const entry of postEntries){
   if(entry.previousBlobSha===null){need(!git('ls-tree',READER_DEPLOY_BASE,'--',entry.path),'POST_E503_NEW_PATH_ALREADY_EXISTS');postBaseSourceBytes[entry.path]=null;}
   else postBaseSourceBytes[entry.path]=execFileSync('git',['show',READER_DEPLOY_BASE+':'+entry.path]);
  }
 }
 if(catalogEntries.length){
  need(git('merge-base',CATALOG_BASE,'HEAD')===CATALOG_BASE,'CATALOG_BASE_ANCESTRY');
  for(const e of catalogEntries){
   if(e.previousBlobSha===null){need(!git('ls-tree',CATALOG_BASE,'--',e.path),'CATALOG_NEW_PATH_ALREADY_EXISTS');catalogBaseSourceBytes[e.path]=null;}
   else catalogBaseSourceBytes[e.path]=execFileSync('git',['show',CATALOG_BASE+':'+e.path]);
  }
 }
 if(catalogActivationPresent){
  const a=read(CATALOG_ACTIVATION);
  need(/^[a-f0-9]{40}$/.test(a.reviewedSourceHead||'')&&git('merge-base',a.reviewedSourceHead,'HEAD')===a.reviewedSourceHead,'CATALOG_REVIEWED_HEAD_ANCESTRY');
  need(!git('diff','--name-only',a.reviewedSourceHead,frozenProductEnd,'--','functions','orbit360-platform',':(exclude)orbit360-platform/docs/**',...Object.keys(CATALOG_PINS)),'CATALOG_SOURCE_CHANGED_AFTER_REVIEW');
 }
 if(activationPresent){
  const activation=read(READER_DEPLOY_ACTIVATION);
  need(/^[a-f0-9]{40}$/.test(activation.reviewedSourceHead||'')&&git('merge-base',activation.reviewedSourceHead,'HEAD')===activation.reviewedSourceHead,'READER_ACTIVATION_SOURCE_ANCESTRY');
  need(!git('diff','--name-only',activation.reviewedSourceHead,frozenProductEnd,'--','functions','orbit360-platform',':(exclude)orbit360-platform/docs/**',...Object.keys(READER_DEPLOY_PINS)),'READER_ACTIVATION_REVIEWED_CODE_CHANGED');
 }

 for(const path of paths){
  fileBytes[path]=fs.readFileSync(path);
  need(git('rev-parse','HEAD:'+path)===blob(fileBytes[path]),'OWNER_UNCOMMITTED_FILE');
 }
 return validateOwnerDecisionSuccessorSnapshot({
  control:after,baseControl:old(OWNER_BASE,ROOT+'CONTROL_PLANE.json'),
  state:read(STATE),baseState:old(OWNER_BASE,STATE),
  changedPaths:git('diff','--name-only',OWNER_BASE,'HEAD').split(/\r?\n/).filter(Boolean),fileBytes,baseSourceBytes,postBaseSourceBytes,catalogBaseSourceBytes,policyCaptureBaseSourceBytes,captureReleaseBaseSourceBytes,captureReleaseBaseControl,captureReleaseBaseState
 });
}

// Post-acceptance gate boundary: prove the already sealed B4-003 state against
// its immutable accepted snapshot. New B4-004 evidence is validated separately
// and must never be sent through the old one-shot release source diff.
function projectFrozenB4003AfterB4004Preview(after,certified){
 const p=after.b4004CronogramaCountryFocalPreviewPass20261107;
 if(!p)return null;
 const predecessor='6c45983610ce0d65a5c63bd07659ad968bfe9da3';
 const historical='9bbcafd4af141cb8d12cc2495fbc814ce950c6b0';
 const frozen=old(predecessor,ROOT+'CONTROL_PLANE.json');
 const oldState=old(predecessor,STATE),state=read(STATE),historicalCp=old(historical,ROOT+'CONTROL_PLANE.json');
 // These current-ledger pointers advance only with the separately verified
 // B4-004 terminal receipt. All B4-003 approved evidence remains immutable.
 const formalB4004=Boolean(after.b4004FormalGateSeal20261107);
 const allowedOldKeys=new Set(['nextAction','paymentInferenceReconciliationControl','ownerDecisionFreeze20261107',
  ...(formalB4004?['findingLedgerBlobSha','continuityRegisterBlobSha','findingContinuityControl','pendingClosureMasterPlan']:[])]);
 for(const [key,val] of Object.entries(frozen)){
  if(allowedOldKeys.has(key))continue;
  need(Object.hasOwn(after,key)&&same(after[key],val),'POST_B4004_B4003_FROZEN_KEY_'+key);
 }
 for(const [key,val] of Object.entries(oldState)){
  if(key==='nextAction'||key==='ownerDecisionFreeze20261107'||(formalB4004&&key==='updatedAtUtc'))continue;
  need(Object.hasOwn(state,key)&&same(state[key],val),'POST_B4004_B4003_STATE_'+key);
 }
 need(same(after.paymentInferenceReconciliationControl,historicalCp.paymentInferenceReconciliationControl),'POST_B4004_PAYMENT_AUTHORITY_CHANGED');
 need(same(after.ownerDecisionFreeze20261107,state.ownerDecisionFreeze20261107),'POST_B4004_OWNER_POINTER_PARITY');
 const owner=after.ownerDecisionFreeze20261107;
 need(owner?.status==='OWNER_DECISIONS_AND_WORK_PLAN_FROZEN'&&owner.preservedProductSourceSha===SOURCE&&owner.preservedB4003ReceiptBlobSha==='0879188bf245248fa1092fb2014e35e14e802b44','POST_B4004_FROZEN_OWNER_AUTHORITY');
 need(owner?.path===OWNER_FREEZE&&blob(fs.readFileSync(OWNER_FREEZE))===owner.blobSha,'POST_B4004_OWNER_DOCUMENT_DRIFT');
 const seal=after[CURSOR]?.formalLiveAcceptance,previous=frozen[CURSOR]?.formalLiveAcceptance;
 need(seal?.status==='LATEST_APPROVED_VERSION_LIVE_PASS'&&same(seal,previous)&&releaseIdentity(seal),'POST_B4004_B4003_LIVE_SEAL');
 const receipt=reference({path:seal.receiptPath,blobSha:seal.receiptBlobSha,sha256:seal.receiptSha256},'POST_B4004_B4003_FINAL');
 need(receipt.status==='LATEST_APPROVED_VERSION_LIVE_PASS'&&receipt.b4003Closed===true,'POST_B4004_FINAL_RECEIPT_UNSEALED');
 need(after.currentB4?.status==='B4_003_CLOSED_PASS_CURRENT42'&&after.currentB4?.humanVisualStatus==='LATEST_APPROVED_VERSION_LIVE_PASS','POST_B4004_HISTORICAL_GATE_REOPENED');
 need(after.b4004PolicyCaptureFrontendSuccessor20261107?.liveFunctionalAcceptance?.status==='POLICY_CAPTURE_FOCAL_LIVE_PASS','POST_B4004_CAPTURE_ACCEPTANCE_MISSING');
 need(after.b4004PolicyCaptureFrontendSuccessor20261107?.cronogramaLiveAcceptance?.status==='SYNTHETIC_CORE_LIVE_PASS_SCOPE_HOLD','POST_B4004_CRONO_CORE_MISSING');
 const sourcePin=after.b4004CronogramaCountryViewSourceFix20261107;
 const fixPath=ROOT+'I6_5_B4_004_CRONOGRAMA_COUNTRY_VIEW_SOURCE_FIX_20261107.json';
 need(sourcePin?.receiptPath===fixPath&&sourcePin?.sourceBlobSha==='5460b80442f33d51144b70dd83be87d6a263cf9c'&&sourcePin?.productSourceChanged===true,'POST_B4004_SOURCE_PIN');
 need(blob(fs.readFileSync(fixPath))===sourcePin.receiptBlobSha,'POST_B4004_SOURCE_RECEIPT_DRIFT');
 const fix=read(fixPath);
 need(fix.status==='SOURCE_FIXED_REQUIRES_NEW_IMMUTABLE_ARTIFACT_PREVIEW_AND_LIVE'&&fix.productSource.afterBlobSha===sourcePin.sourceBlobSha,'POST_B4004_SOURCE_RECEIPT_INVALID');
 need(git('merge-base',fix.sourceParentHead,'HEAD')===fix.sourceParentHead&&git('merge-base','f8fa00e4e2e6627cee66c8c521866874e39bc8da','HEAD')==='f8fa00e4e2e6627cee66c8c521866874e39bc8da','POST_B4004_SOURCE_ANCESTRY');
 const changedProduct=git('diff','--name-only',predecessor,'HEAD','--','functions','orbit360-platform',':(exclude)orbit360-platform/docs/**').split(/\r?\n/).filter(Boolean).sort();
 const b4005=after.b4005EndososDurableSourceAndIsolatedQa20261107
  ?verifyDeclaredB4005SourceSuccessor(after,state):null;
 const expectedProduct=['orbit360-platform/modules/cronograma.js',...(b4005?.paths||[])].sort();
 need(same(changedProduct,expectedProduct),'POST_B4004_UNRELATED_PRODUCT_CHANGE');
 need(git('rev-parse','HEAD:orbit360-platform/modules/cronograma.js')===sourcePin.sourceBlobSha,'POST_B4004_CRONOGRAMA_SOURCE_CHANGED');
 // B4-005 only extends the same immutable builder's scoped Preview gate allowlist.
 // Its two-line successor is pinned; the B4-004 certified artifact and seal stay immutable.
 const expectedBuilder=b4005?'ad48cfea93b846129189ff890225220153d12eff':'13bad5b844f5c286d198efc796af58d00fc2a3d1';
 need(git('rev-parse','HEAD:tools/gravicentra-i6-1-preview-package.mjs')===expectedBuilder,'POST_B4004_BUILDER_DRIFT');
 if(b4005){
  const b=after.b4005ExactPreviewExecutorScope20261107;
  need(b&&same(b,state.b4005ExactPreviewExecutorScope20261107)&&b.builderAfterBlobSha===expectedBuilder&&
    b.existingPreviewChannelReused==='gi-i65-b4-rc-41765742748'&&b.formalB4005Pass===false,
    'POST_B4004_B4005_BUILDER_SCOPE_NOT_MIRRORED');
  const r=reference({path:b.receiptPath,blobSha:b.receiptBlobSha,sha256:b.receiptSha256},'POST_B4004_B4005_BUILDER_SCOPE');
  need(r.status==='EXACT_PREVIEW_EXECUTOR_SOURCE_READY_TRANSPORT_AND_AUTHENTICATED_E2E_PENDING'&&
    r.existingBuilder.afterBlobSha===expectedBuilder&&r.safety.liveDeployAuthorizedInThisExecutor===false,
    'POST_B4004_B4005_BUILDER_SCOPE_RECEIPT_INVALID');
 }
 const proofPath=ROOT+'I6_5_B4_004_CRONOGRAMA_COUNTRY_FOCAL_PREVIEW_PASS_20261107.json';
 need(p?.receiptPath===proofPath&&blob(fs.readFileSync(proofPath))===p.receiptBlobSha,'POST_B4004_PREVIEW_EVIDENCE_DRIFT');
 const proof=read(proofPath);
 need(proof.status==='CRONOGRAMA_COUNTRY_FOCAL_AUTHENTICATED_PREVIEW_PASS_LIVE_PENDING'&&
 proof.currentBuild.sourceSha==='f8fa00e4e2e6627cee66c8c521866874e39bc8da'&&
 proof.currentBuild.buildId==='gi-i65-b4-f8fa00e4e2e6-57f234755dc1'&&
 proof.currentBuild.artifactId===13600357541&&
 proof.currentBuild.hostedPayloadDigest==='819e36b57ef5042ed37458f80274f9db45303e881b4f268c34dec8d4506c9d56'&&
 proof.authenticatedFocal.status==='FOCAL_SCOPE_PASS'&&proof.authenticatedFocal.dataWrites===0&&
 proof.authenticatedFocal.scoped403===0&&proof.authenticatedFocal.cronogramaRouteMs<=6000,'POST_B4004_PREVIEW_FOCAL_PROOF_INVALID');
 need(p.sourceSha===proof.currentBuild.sourceSha&&p.buildId===proof.currentBuild.buildId&&p.artifactId===proof.currentBuild.artifactId,'POST_B4004_CURRENT_PREVIEW_POINTER');
 need(same(p,state.b4004CronogramaCountryFocalPreviewPass20261107)&&state.nextAction===after.nextAction&&(after.nextAction.startsWith('B4_004_')||(after.nextAction==='B4_006_BUILD_ONE_NEW_IMMUTABLE_PREVIEW_THEN_VISUAL_QA_AND_OWNER_ACCEPTANCE'&&after.b4005FormalGateSeal20261107?.status==='CLOSED_PASS_SCOPED_WITH_EXPLICIT_NONBLOCKING_R1509_CARRY'&&after.b4006VisualReadonlyCandidateSource20261108?.status==='SOURCE_VISUAL_DELTA_READY_FOR_NEW_IMMUTABLE_PREVIEW'&&same(after.b4006VisualReadonlyCandidateSource20261108,state.b4006VisualReadonlyCandidateSource20261108)||after.nextAction==='B4_006_PAULA_VISUAL_ACCEPTANCE_EXACT_PREVIEW_ARTIFACT_13620896661_THEN_B4_007_SAME_ARTIFACT_LIVE'&&after.b4005FormalGateSeal20261107?.status==='CLOSED_PASS_SCOPED_WITH_EXPLICIT_NONBLOCKING_R1509_CARRY'&&after.b4006ExactVisualPreviewQa20261108?.status==='ASSISTANT_VISUAL_PREVIEW_QA_PASS_OWNER_ACCEPTANCE_PENDING'&&after.b4006ExactVisualPreviewQa20261108?.ownerAccepted===false&&same(after.b4006ExactVisualPreviewQa20261108,state.b4006ExactVisualPreviewQa20261108)||after.nextAction==='B4_006_SINGLE_VISUAL_SOURCE_SUCCESSOR_BUILD_EXACT_PREVIEW_REAL_INSURER_QA'&&after.b4006RealInsurerVisualSuccessor20261108?.status==='USER_REJECTED_PREVIOUS_VISUAL_QA_SINGLE_SOURCE_SUCCESSOR_PREVIEW_PENDING'&&after.b4006RealInsurerVisualSuccessor20261108?.ownerRejectedPreviousVisual===true&&same(after.b4006RealInsurerVisualSuccessor20261108,state.b4006RealInsurerVisualSuccessor20261108)||after.nextAction==='B4_006_OWNER_SIGNOFF_EXACT_VISUAL_ARTIFACT_13622257706_THEN_B4_007_SAME_ARTIFACT_LIVE'&&after.b4006LatestActualVisualQa20261108?.status==='ASSISTANT_FOCAL_VISUAL_QA_PASS_OWNER_ACCEPTANCE_PENDING'&&after.b4006LatestActualVisualQa20261108?.ownerAccepted===false&&same(after.b4006LatestActualVisualQa20261108,state.b4006LatestActualVisualQa20261108)||after.nextAction==='B4_006_TRANSVERSAL_VISUAL_UNIFICATION_SINGLE_CANONICAL_PREVIEW_QA_PENDING'&&after.b4005FormalGateSeal20261107?.status==='CLOSED_PASS_SCOPED_WITH_EXPLICIT_NONBLOCKING_R1509_CARRY'&&after.b4006VisualUnificationSuccessor20261108?.status==='SOURCE_UNIFIED_PREVIEW_QA_PENDING'&&after.b4006VisualUnificationSuccessor20261108?.ownerAcceptedExactArtifact===false&&same(after.b4006VisualUnificationSuccessor20261108,state.b4006VisualUnificationSuccessor20261108)||after.nextAction==='B4_006_VISUAL_POLISH_SINGLE_PREVIEW_BUILD_AND_REAL_UI_RECHECK'&&after.b4005FormalGateSeal20261107?.status==='CLOSED_PASS_SCOPED_WITH_EXPLICIT_NONBLOCKING_R1509_CARRY'&&after.b4006VisualPolishMicroRefinement20261108?.status==='FOCAL_UI_MICRO_POLISH_SOURCE_PREVIEW_PENDING'&&after.b4006VisualPolishMicroRefinement20261108?.ownerAcceptedExactArtifact===false&&same(after.b4006VisualPolishMicroRefinement20261108,state.b4006VisualPolishMicroRefinement20261108)||after.nextAction==='B4_006_OWNER_VISUAL_POLISH_RECHECK_ARTIFACT_13624916797_THEN_B4_007_EXACT_LIVE'&&after.b4005FormalGateSeal20261107?.status==='CLOSED_PASS_SCOPED_WITH_EXPLICIT_NONBLOCKING_R1509_CARRY'&&after.b4006PolishExactPreviewReadback20261108?.status==='EXACT_IMMUTABLE_PREVIEW_READBACK_PASS_FOCAL_VISUAL_RECHECK_PENDING'&&after.b4006PolishExactPreviewReadback20261108?.ownerAcceptedExactArtifact===false&&same(after.b4006PolishExactPreviewReadback20261108,state.b4006PolishExactPreviewReadback20261108)||after.nextAction==='B4_006_BUILD_ONE_NEW_IMMUTABLE_PREVIEW_AFTER_OWNER_FINAL_VISUAL_FEEDBACK'&&after.b4005FormalGateSeal20261107?.status==='CLOSED_PASS_SCOPED_WITH_EXPLICIT_NONBLOCKING_R1509_CARRY'&&after.b4006OwnerFinalVisualFeedbackSourceSuccessor20261108?.status==='OWNER_FINAL_VISUAL_FEEDBACK_SOURCE_SUCCESSOR_PREVIEW_PENDING'&&after.b4006OwnerFinalVisualFeedbackSourceSuccessor20261108?.ownerAcceptedExactArtifact===false&&same(after.b4006OwnerFinalVisualFeedbackSourceSuccessor20261108,state.b4006OwnerFinalVisualFeedbackSourceSuccessor20261108)||after.nextAction==='B4_006_BUILD_ONE_IMMUTABLE_PREVIEW_MANAGEMENT_COLLAB_AND_VISUAL_RECHECK'&&after.b4005FormalGateSeal20261107?.status==='CLOSED_PASS_SCOPED_WITH_EXPLICIT_NONBLOCKING_R1509_CARRY'&&after.b4006ManagementCollaborationSourceSuccessor20261108?.status==='OWNER_AUTHORIZED_MANAGEMENT_COLLAB_SOURCE_CONTRACT_PASS_PREVIEW_PENDING'&&after.b4006ManagementCollaborationSourceSuccessor20261108?.ownerAcceptedExactArtifact===false&&same(after.b4006ManagementCollaborationSourceSuccessor20261108,state.b4006ManagementCollaborationSourceSuccessor20261108)||after.nextAction==='B4_006_DEPLOY_EXACT_PREVIEW_MANAGEMENT_COLLAB_BACKEND_AND_HOSTING_THEN_E2E'&&after.b4005FormalGateSeal20261107?.status==='CLOSED_PASS_SCOPED_WITH_EXPLICIT_NONBLOCKING_R1509_CARRY'&&after.b4006ManagementCollaborationBackendHardening20261108?.status==='MANAGEMENT_COLLAB_SERVER_CANONICAL_SOURCE_PASS_EXACT_PREVIEW_DEPLOY_PENDING'&&after.b4006ManagementCollaborationBackendHardening20261108?.ownerAcceptedExactArtifact===false&&same(after.b4006ManagementCollaborationBackendHardening20261108,state.b4006ManagementCollaborationBackendHardening20261108))),'POST_B4004_CURSOR_SYNC');
 if(after.b4004FormalGateSeal20261107){
  const next=verifyB4004FormalGate();
  need(next.status==='PASS'&&next.nextGate==='B4-005','POST_B4004_TERMINAL_SEAL');
 }
 // Historical comparator is the already-certified plane, not a fabricated new PASS.
 // This method never certifies B4-004 LIVE or changes any production state.
 return {comparableAfter:clone(certified),closed:true,receiptBlobSha:seal.receiptBlobSha};
}

export function projectVerifiedB4003LiveClosure(after,certified){
 const preservedPostGate=projectFrozenB4003AfterB4004Preview(after,certified);
 if(preservedPostGate)return preservedPostGate;
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


