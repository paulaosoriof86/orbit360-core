/* ============================================================
   Orbit 360 · Cobros/Conciliación · cola controlada de propuestas
   Fecha: 2026-08-01

   Convierte la matriz multievidencia en una cola read-only con diff,
   idempotencia y rollback. No aplica pagos ni escribe cobros/finmovs.
   ============================================================ */
(function(){
  'use strict';
  const root=typeof window!=='undefined'?window:globalThis;
  root.Orbit=root.Orbit||{};
  const VERSION='20260801.1-controlled-proposal-queue';
  const QUEUE=Object.freeze({
    AUTH_DIRECT:'AUTHORIZATION_READY_DIRECT',
    AUTH_HISTORICAL:'AUTHORIZATION_READY_HISTORICAL_RECEIPT',
    REVIEW_TEMPORAL:'REVIEW_TEMPORAL_CLEARING',
    VALIDATE_ABSENT:'VALIDATE_POLICY_ABSENT_FROM_SNAPSHOT',
    HOLD:'HOLD_SOURCE_OR_DATA_CONTRACT',
    INSURER_ONLY:'HOLD_INSURER_ONLY_WITHOUT_CRM'
  });
  const text=value=>String(value==null?'':value).trim();
  const compact=value=>text(value).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const hash=value=>{
    const source=text(value);let current=2166136261;
    for(let index=0;index<source.length;index+=1){current^=source.charCodeAt(index);current=Math.imul(current,16777619);}
    return (current>>>0).toString(16).padStart(8,'0');
  };
  function queueType(status){
    if(status==='DIRECT_INSURER_MATCH_READY')return QUEUE.AUTH_DIRECT;
    if(status==='DIRECT_INSURER_MATCH_HISTORICAL_RECEIPT_PROPOSAL')return QUEUE.AUTH_HISTORICAL;
    if(status==='TEMPORAL_CLEARING_POLICY_PRESENT_REQUIRES_AUTHORIZATION')return QUEUE.REVIEW_TEMPORAL;
    if(status==='TEMPORAL_CLEARING_POLICY_ABSENT_REQUIRES_VALIDATION')return QUEUE.VALIDATE_ABSENT;
    return QUEUE.HOLD;
  }
  function buildItem(item={}){
    const sourceStatus=text(item.status),type=queueType(sourceStatus);
    const caseKey=text(item.caseKey||item.proposalIdentity||item.evidenceKey);
    const sourceKeys=(item.sourceKeys||[]).map(text).filter(Boolean).sort();
    const idempotencySeed=[caseKey,sourceStatus,...sourceKeys].join('|');
    const historical=sourceStatus==='DIRECT_INSURER_MATCH_HISTORICAL_RECEIPT_PROPOSAL';
    const authorizationEligible=type===QUEUE.AUTH_DIRECT||type===QUEUE.AUTH_HISTORICAL;
    const reinforcedAuthorization=historical||item.opensAllScope===true;
    return {
      queueId:`cobros-proposal-${hash(idempotencySeed)}`,
      caseKey,queueType:type,sourceStatus,
      idempotencyKey:`cobros:${hash(idempotencySeed)}`,
      sourceKeys,sourceCount:sourceKeys.length,
      authorizationEligible,reinforcedAuthorization,
      writeEligible:false,
      diff:{
        before:{cobroExists:false,paymentApplied:false,receiptHistoricalCreated:false},
        proposed:{
          createCobro:authorizationEligible,
          applyPayment:authorizationEligible,
          createHistoricalReceipt:historical,
          reactivatePolicy:false,
          createFinmov:false
        }
      },
      rollbackPlan:{
        required:true,
        strategy:'DELETE_CREATED_COBRO_AND_RESTORE_RECEIPT_SNAPSHOT',
        preWriteSnapshotRequired:true,
        sourceRowsRemainImmutable:true
      },
      autoApply:false,writes:0,reactivatesPolicy:false
    };
  }
  function buildQueue(input={}){
    const items=(input.cases||[]).map(buildItem);
    const insurerOnly=(input.insurerOnlyEvidence||[]).map(item=>({
      ...buildItem({...item,status:'HOLD_INSURER_ONLY_WITHOUT_CRM'}),
      queueType:QUEUE.INSURER_ONLY,authorizationEligible:false,writeEligible:false
    }));
    const all=[...items,...insurerOnly];
    const ids=new Set(),idempotency=new Set(),duplicates=[];
    for(const item of all){
      if(ids.has(item.queueId)||idempotency.has(item.idempotencyKey))duplicates.push(item.caseKey);
      ids.add(item.queueId);idempotency.add(item.idempotencyKey);
    }
    const counts={};
    for(const item of all)counts[item.queueType]=(counts[item.queueType]||0)+1;
    const authorizationReady=all.filter(item=>item.authorizationEligible).length;
    const reviewOnly=all.filter(item=>item.queueType===QUEUE.REVIEW_TEMPORAL).length;
    const validationRequired=all.filter(item=>item.queueType===QUEUE.VALIDATE_ABSENT).length;
    const hold=all.filter(item=>item.queueType===QUEUE.HOLD||item.queueType===QUEUE.INSURER_ONLY).length;
    return {
      version:VERSION,status:duplicates.length?'QUEUE_REQUIRES_VALIDATION':'QUEUE_STATIC_READY',
      items,insurerOnlyEvidence:insurerOnly,counts,
      totals:{cases:all.length,authorizationReady,reviewOnly,validationRequired,hold},
      duplicateIdempotencyKeys:duplicates.length,
      allDiffsPresent:all.every(item=>item.diff&&item.rollbackPlan),
      allWritesBlocked:all.every(item=>item.writeEligible===false&&item.writes===0&&item.autoApply===false),
      explicitAuthorizationRequired:true,reinforcedAuthorizationForHistorical:true,
      cobrosWrites:0,finmovsWrites:0,firestoreWrites:0,operationalWrites:0,
      browserExecuted:false,deployExecuted:false,productionTouched:false
    };
  }
  root.Orbit.cobrosProposalQueueP0=Object.freeze({VERSION,QUEUE,queueType,buildItem,buildQueue});
})();
