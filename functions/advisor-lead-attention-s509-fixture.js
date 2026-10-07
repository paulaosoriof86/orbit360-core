'use strict';

const {getApps,initializeApp}=require('firebase-admin/app');
const {getFirestore,FieldValue}=require('firebase-admin/firestore');
const s=require('./advisor-lead-attention-s509').__advisorLeadAttentionS509;

const PROJECT_ID='ays-orbit-360-lab';
const TENANT_ID='alianzas-soluciones';

async function main(){
  const project=process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||'';
  if(project!==PROJECT_ID)throw new Error('WRONG_PROJECT');
  const app=getApps()[0]||initializeApp({projectId:PROJECT_ID});
  const db=getFirestore(app);
  const run=String(process.env.GITHUB_RUN_ID||Date.now());
  const uid='s509_uid_'+run,advisorId='s509_adv_'+run,eventId='s509_evt_'+run,entityId='s509_neg_'+run;
  const out=db.collection('tenants').doc(TENANT_ID).collection('notificationOutbox').doc(eventId);
  const receipt=db.collection('tenants').doc(TENANT_ID).collection('advisorLeadAttentionReceipts').doc(s.receiptId(uid,eventId));
  try{
    await out.set({
      schemaVersion:'s509-synthetic-notice-v1',tenantId:TENANT_ID,eventId,
      operation:'create_business',entityType:'negocios',entityId,
      targets:[{type:'advisor',id:advisorId}],status:'pending_provider',
      payload:{title:'Synthetic QA lead',message:'Synthetic only'},createdAt:FieldValue.serverTimestamp()
    });
    const authz={tenantId:TENANT_ID,uid,advisorId};
    const p1=await s.pollCore(authz,20);
    if(p1.newLeadCount!==1||!p1.unseen||p1.unseen[0].eventId!==eventId)throw new Error('POLL_FIRST_FAILED');
    const a=await s.ackCore(authz,[eventId]);
    if(a.acked!==1)throw new Error('ACK_FAILED');
    const p2=await s.pollCore(authz,20);
    if(p2.newLeadCount!==0)throw new Error('POLL_AFTER_ACK_FAILED');
    process.stdout.write(JSON.stringify({
      schemaVersion:'s509-attention-synthetic-receipt-v1',
      syntheticOnly:true,firstPollNewLeadCount:p1.newLeadCount,acked:a.acked,secondPollNewLeadCount:p2.newLeadCount,
      productionTouched:false,customerDataUsed:false
    },null,2)+'\n');
  }finally{
    await Promise.all([out.delete().catch(()=>{}),receipt.delete().catch(()=>{})]);
  }
}
main().catch(e=>{console.error(JSON.stringify({ok:false,error:String(e&&e.message||e),syntheticOnly:true}));process.exit(1);});
