import fs from 'node:fs';
import cp from 'node:child_process';

const need=(v,c)=>{if(!v)throw new Error(c);};
const read=p=>fs.readFileSync(p,'utf8');
const json=p=>JSON.parse(read(p));
const hash=p=>cp.execFileSync('git',['hash-object',p],{encoding:'utf8'}).trim();

const processorPath='functions/notification-outbox-processor.js';
const bootstrapPath='functions/bootstrap.js';
const packagePath='functions/package.json';
const inboxPath='functions/ops-advisor-inbox.js';
const compositionPath='artifacts/orbit360-recovery/release-control/I6_CANONICAL_ACCUMULATIVE_COMPOSITION_LOCK_20260924.json';
const lockPath='artifacts/orbit360-recovery/release-control/I6_5_FORENSIC_B4_EXECUTION_LOCK_20261002.json';
const controlPath='artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';
const receiptPath='artifacts/orbit360-recovery/release-control/I6_5_B4_002_CAUSAL_SOURCE_FIX_20261003.json';

for(const p of [processorPath,bootstrapPath,packagePath,inboxPath,compositionPath,lockPath,controlPath,receiptPath])need(fs.existsSync(p),'B4_002_REQUIRED_FILE_MISSING:'+p);

const processor=read(processorPath),bootstrap=read(bootstrapPath),pkg=json(packagePath),inbox=read(inboxPath),comp=json(compositionPath),lock=json(lockPath),control=json(controlPath),receipt=json(receiptPath);
need(control.nextAction==='I6_5_FORENSIC_REMEDIATION_B4_002_CONTRACT_AND_EXACT_PREVIEW','B4_002_CONTROL_NEXT_ACTION_INVALID');
need(control.currentB4?.status==='B4_002_SOURCE_FIXED_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_002_CONTROL_STATUS_INVALID');
need(lock.status==='B4_002_SOURCE_FIXED_PENDING_CONTRACT_AND_EXACT_PREVIEW'&&lock.activeFinding?.id==='B4-002','B4_002_LOCK_STATUS_INVALID');
need(receipt.status==='SOURCE_FIXED_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_002_SOURCE_RECEIPT_INVALID');

need(/onDocumentCreated\(\{[\s\S]*notificationOutbox\/\{eventId\}/.test(processor),'B4_002_POST_COMMIT_TRIGGER_MISSING');
need(/previewNotificationOutbox\/\{eventId\}/.test(processor),'B4_002_PREVIEW_TRIGGER_MISSING');
need(/CANONICAL_EVENT_NOT_COMMITTED/.test(processor),'B4_002_CANONICAL_EVENT_GUARD_MISSING');
need(/retry_pending/.test(processor)&&/failed_processing/.test(processor)&&/attemptCount/.test(processor)&&/retryEligible/.test(processor)&&/lastError/.test(processor)&&/nextAttemptAt/.test(processor),'B4_002_RETRY_FAILURE_FIELDS_MISSING');
need(/pending_connection/.test(processor)&&/externalChannelsPendingConnection/.test(processor),'B4_002_EXTERNAL_FAIL_CLOSED_MISSING');
need(/notificationId\(/.test(processor)&&/merge:\s*true/.test(processor),'B4_002_IDEMPOTENT_PROJECTION_MISSING');
need(/previewWorkflowEvents/.test(processor)&&/previewNotifs/.test(processor),'B4_002_PREVIEW_ISOLATION_MISSING');
need(!/nodemailer|sendgrid|twilio|whatsapp-web|wa\.me|smtpTransport|mailgun/i.test(processor),'B4_002_EXTERNAL_PROVIDER_SIMULATION_FORBIDDEN');
need(bootstrap.includes("require('./notification-outbox-processor')"),'B4_002_BOOTSTRAP_OWNER_MISSING');
need(String(pkg.scripts?.check||'').includes('notification-outbox-processor.js'),'B4_002_PACKAGE_CHECK_MISSING');
for(const token of ['attemptCount','retryEligible','lastError','nextAttemptAt','channelStates','noticeStatusCounts'])need(inbox.includes(token),'B4_002_INBOX_VISIBILITY_MISSING:'+token);

const bindings={
  [processorPath]:hash(processorPath),
  [bootstrapPath]:hash(bootstrapPath),
  [packagePath]:hash(packagePath),
  [inboxPath]:hash(inboxPath)
};
for(const [p,sha] of Object.entries(bindings)){
  need((comp.productFiles||[]).includes(p),'B4_002_COMPOSITION_PATH_MISSING:'+p);
  need(comp.productFileBlobs?.[p]===sha,'B4_002_COMPOSITION_BLOB_DRIFT:'+p);
  need(receipt.fix?.productBlobs?.[p]===sha,'B4_002_RECEIPT_BLOB_DRIFT:'+p);
}
need(comp.productFileCount===(comp.productFiles||[]).length,'B4_002_PRODUCT_FILE_COUNT_DRIFT');
need(comp.b4002SourceFix?.status==='SOURCE_FIXED_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_002_COMPOSITION_SOURCE_FIX_STATE_INVALID');
need(lock.boundaries?.businessWritesAuthorized===false&&lock.boundaries?.dataMutationAuthorized===false&&lock.boundaries?.reimportAuthorized===false&&lock.boundaries?.livePromotionAuthorized===false,'B4_002_BOUNDARY_INVALID');
need(lock.boundaries?.syntheticQaWritesAuthorized===true,'B4_002_SYNTHETIC_QA_NOT_AUTHORIZED');

console.log(JSON.stringify({
  status:'PASS',
  contract:'B4_002_NOTIFICATION_PROCESSOR_CONTRACT',
  processorOwner:processorPath,
  exactBlobBindings:bindings,
  postCommitTrigger:true,
  canonicalEventGuard:true,
  retryFailureVisibility:true,
  externalProviderSimulation:false,
  previewIsolation:true,
  productFileCount:comp.productFileCount
},null,2));
