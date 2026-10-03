'use strict';
const fs=require('node:fs');
const pathmod=require('node:path');
const {initializeApp,applicationDefault,getApps}=require('../functions/node_modules/firebase-admin/app');
const {getFirestore}=require('../functions/node_modules/firebase-admin/firestore');

const projectId=process.env.PROJECT_ID||'ays-orbit-360-lab';
const tenantId=process.env.TENANT_HINT||'alianzas-soluciones';
const outPath=process.env.B4_002_DIAGNOSTIC_OUT||'/tmp/b4-002-notification-diagnostic.json';
const repoRoot=pathmod.resolve(__dirname,'..');

function files(dir){
  const out=[];
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const p=pathmod.join(dir,ent.name);
    if(ent.isDirectory()) out.push(...files(p));
    else if(ent.isFile()&&/\.js$/.test(ent.name)) out.push(p);
  }
  return out;
}
function rel(p){return pathmod.relative(repoRoot,p).replace(/\\/g,'/');}
function iso(v){
  try{
    if(v&&typeof v.toDate==='function') return v.toDate().toISOString();
    if(v instanceof Date) return v.toISOString();
    return String(v||'');
  }catch{return'';}
}
(async()=>{
  const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId});
  const db=getFirestore(app);
  const tenant=db.collection('tenants').doc(tenantId);
  const [eventsSnap,outboxSnap]=await Promise.all([
    tenant.collection('workflowEvents').get(),
    tenant.collection('notificationOutbox').get()
  ]);
  const events=new Map(eventsSnap.docs.map(d=>[d.id,{id:d.id,...d.data()}]));
  const outbox=outboxSnap.docs.map(d=>({id:d.id,...d.data()}));
  const statusCounts={};
  const orphanOutbox=[];
  const eventIdMismatch=[];
  const duplicateEventIds={};
  const byEvent={};
  for(const row of outbox){
    const st=String(row.status||'').trim()||'(blank)';
    statusCounts[st]=(statusCounts[st]||0)+1;
    const eid=String(row.eventId||row.id||'').trim();
    if(!events.has(eid)) orphanOutbox.push(row.id);
    if(row.eventId&&String(row.eventId)!==String(row.id)) eventIdMismatch.push({docId:row.id,eventId:String(row.eventId)});
    byEvent[eid]=(byEvent[eid]||0)+1;
  }
  for(const [eid,n] of Object.entries(byEvent)) if(n>1) duplicateEventIds[eid]=n;

  const functionFiles=files(pathmod.join(repoRoot,'functions'));
  const source=[];
  for(const p of functionFiles){
    const c=fs.readFileSync(p,'utf8');
    if(/notificationOutbox|pending_provider|onDocumentCreated|onDocumentWritten|onDocumentUpdated|onSchedule|attemptCount|retryCount|nextAttemptAt|failed_retryable|lastError|processedAt|deliveredAt/.test(c)){
      source.push({
        path:rel(p),
        writesOutbox:/notificationOutbox[\s\S]{0,2500}pending_provider|pending_provider[\s\S]{0,2500}notificationOutbox/.test(c),
        readsOutbox:/collection\(['"]notificationOutbox['"]\)/.test(c),
        firestoreTrigger:/notificationOutbox/.test(c)&&/onDocumentCreated|onDocumentWritten|onDocumentUpdated/.test(c),
        scheduledProcessor:/notificationOutbox/.test(c)&&/onSchedule/.test(c),
        retryFields:/attemptCount|retryCount|nextAttemptAt|failed_retryable|failed_provider|lastError/.test(c),
        deliveryCompletionFields:/processedAt|deliveredAt|sentAt|status\s*[:=]\s*['"](?:delivered|sent|processed)/i.test(c)
      });
    }
  }
  const productSource=fs.readFileSync(pathmod.join(repoRoot,'functions/product-ops-leads-domain.js'),'utf8');
  const canonicalWriteAtomic=/db\.runTransaction[\s\S]*notificationOutbox[\s\S]*workflowRequests/.test(productSource)||
    /db\.runTransaction[\s\S]*workflowRequests[\s\S]*notificationOutbox/.test(productSource);
  const previewSuppresses=/targets\.length&&previewOnly!==true/.test(productSource)&&/notificationSuppressed:previewOnly===true/.test(productSource);
  const processors=source.filter(x=>x.firestoreTrigger||x.scheduledProcessor);
  const retryOwners=source.filter(x=>x.retryFields&&(x.firestoreTrigger||x.scheduledProcessor));
  const visibilityOwners=source.filter(x=>x.retryFields||x.deliveryCompletionFields);
  const statuses=Object.keys(statusCounts).sort();

  const receipt={
    schema:'GRAVICENTRA_I6_5_B4_002_POST_COMMIT_NOTIFICATION_DIAGNOSTIC_V1',
    recordedAt:new Date().toISOString(),
    status:'READONLY_DIAGNOSTIC_COMPLETE',
    findingId:'B4-002',
    mode:'READ_ONLY_NO_PRODUCT_OR_DATA_WRITES',
    repository:'paulaosoriof86/orbit360-core',
    branch:'recovery/fase-a-clean-20260831',
    sourceSha:process.env.GITHUB_SHA||'',
    projectId,tenantId,
    runtime:{
      workflowEventCount:events.size,
      notificationOutboxCount:outbox.length,
      notificationStatusCounts:statusCounts,
      orphanOutboxCount:orphanOutbox.length,
      orphanOutbox:orphanOutbox.slice(0,100),
      eventIdMismatchCount:eventIdMismatch.length,
      eventIdMismatch:eventIdMismatch.slice(0,100),
      duplicateEventIdCount:Object.keys(duplicateEventIds).length,
      duplicateEventIds,
      sample:outbox.slice(0,25).map(x=>({id:x.id,eventId:x.eventId||'',operation:x.operation||'',entityType:x.entityType||'',entityId:x.entityId||'',status:x.status||'',channels:x.channels||[],createdAt:iso(x.createdAt),attemptCount:x.attemptCount??null,lastError:x.lastError??'',nextAttemptAt:iso(x.nextAttemptAt)}))
    },
    sourceAudit:{
      canonicalOutboxCreatedInsideDomainTransaction:canonicalWriteAtomic,
      previewSuppressesExternalNotificationOutbox:previewSuppresses,
      files:source,
      processorOwners:processors.map(x=>x.path),
      retryOwners:retryOwners.map(x=>x.path),
      statusVisibilityOwners:visibilityOwners.map(x=>x.path),
      observedStatuses:statuses
    },
    assertions:{
      postCommitBoundaryRepresentedByTransactionalOutbox:canonicalWriteAtomic,
      duplicateOutboxDocumentsNotObserved:Object.keys(duplicateEventIds).length===0,
      outboxEventReferentialIntegrity:orphanOutbox.length===0&&eventIdMismatch.length===0,
      dispatcherOwnerExists:processors.length>0,
      retryOwnerExists:retryOwners.length>0,
      failureAndRetryVisibilityExists:visibilityOwners.length>0
    },
    classification:(processors.length>0&&retryOwners.length>0&&visibilityOwners.length>0)
      ?'NO_PRODUCT_DEFECT_DEMONSTRATED'
      :'PRODUCT_BACKEND_NOTIFICATION_DELIVERY_GAP',
    causalConclusion:(processors.length>0&&retryOwners.length>0&&visibilityOwners.length>0)
      ?'The canonical outbox has an executable post-commit processor with retry/failure visibility.'
      :'The canonical domain writes a deterministic outbox atomically with the committed event, but no executable notificationOutbox dispatcher/retry owner with delivery failure visibility is present in the active functions source.',
    boundaries:{operationalBusinessWrites:0,configWrites:0,dataMutation:false,reimport:false,livePromotion:false},
    nextAction:(processors.length>0&&retryOwners.length>0&&visibilityOwners.length>0)
      ?'B4_003_TARGETED_REGRESSION_DIAGNOSTIC'
      :'B4_002_CAUSAL_SOURCE_FIX_REQUIRED'
  };
  fs.writeFileSync(outPath,JSON.stringify(receipt,null,2)+'\n');
  console.log(JSON.stringify({status:receipt.status,classification:receipt.classification,assertions:receipt.assertions,runtime:{workflowEventCount:events.size,notificationOutboxCount:outbox.length,statusCounts}},null,2));
})().catch(e=>{console.error(e&&e.stack||e);process.exit(1);});
