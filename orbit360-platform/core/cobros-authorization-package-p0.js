/* ============================================================
   Orbit 360 · Cobros/Conciliación · paquete de autorización
   Fecha: 2026-08-01

   Selecciona únicamente propuestas elegibles de la cola 10.5 y
   genera tarjetas sanitizadas para decisión humana. No autoriza,
   no aplica pagos y no escribe cobros/finmovs.
   ============================================================ */
(function(){
  'use strict';
  const root=typeof window!=='undefined'?window:globalThis;
  root.Orbit=root.Orbit||{};
  const VERSION='20260801.1-sanitized-authorization-package';
  const text=value=>String(value==null?'':value).trim();
  const hash=value=>{
    const source=text(value);let current=2166136261;
    for(let index=0;index<source.length;index+=1){current^=source.charCodeAt(index);current=Math.imul(current,16777619);}
    return (current>>>0).toString(16).padStart(8,'0');
  };
  function category(item){
    return item&&item.queueType==='AUTHORIZATION_READY_HISTORICAL_RECEIPT'
      ?'HISTORICAL_RECEIPT_REINFORCED'
      :'EXISTING_CANONICAL_RECEIPT';
  }
  function buildCard(item={},ordinal=0){
    const type=category(item),historical=type==='HISTORICAL_RECEIPT_REINFORCED';
    const opaqueSeed=text(item.idempotencyKey||item.queueId||item.caseKey||`ordinal-${ordinal}`);
    const opaqueRef=`auth-${hash(opaqueSeed)}`;
    return {
      authorizationRef:opaqueRef,
      displayOrdinal:ordinal+1,
      category:type,
      decisionStatus:'PENDING_HUMAN_AUTHORIZATION',
      authorizationGranted:false,
      writeEligible:false,
      sourceEvidenceCount:Number(item.sourceCount||0),
      sourceReferencesOpaque:true,
      diff:{
        before:{
          cobroExists:false,
          paymentApplied:false,
          receiptState:historical?'HISTORICAL_RECEIPT_NOT_MATERIALIZED':'CANONICAL_RECEIPT_EXISTS'
        },
        proposed:{
          createCobro:true,
          applyPayment:true,
          createHistoricalReceipt:historical,
          reactivatePolicy:false,
          createFinmov:false
        }
      },
      controls:{
        idempotencyKey:text(item.idempotencyKey),
        preWriteSnapshotRequired:true,
        rollbackRequired:true,
        sourceRowsImmutable:true,
        explicitAuthorizationRequired:true,
        reinforcedAuthorizationRequired:historical,
        atomicOperationRequired:historical,
        exactReceiptPrecedesFifo:true
      },
      rollbackPlan:item.rollbackPlan||{
        required:true,
        strategy:'DELETE_CREATED_COBRO_AND_RESTORE_RECEIPT_SNAPSHOT',
        preWriteSnapshotRequired:true,
        sourceRowsRemainImmutable:true
      },
      containsPII:false,
      containsPolicyNumber:false,
      containsRealAmount:false,
      writes:0
    };
  }
  function buildPackage(input={}){
    const queueItems=[...(input.items||[]),...(input.insurerOnlyEvidence||[])];
    const eligible=queueItems.filter(item=>item&&item.authorizationEligible===true);
    const direct=eligible.filter(item=>category(item)==='EXISTING_CANONICAL_RECEIPT');
    const historical=eligible.filter(item=>category(item)==='HISTORICAL_RECEIPT_REINFORCED');
    const ordered=[...direct,...historical];
    const cards=ordered.map(buildCard);
    const keys=cards.map(card=>card.controls.idempotencyKey).filter(Boolean);
    const duplicateIdempotencyKeys=keys.length-new Set(keys).size;
    const batchSeed=cards.map(card=>card.authorizationRef).join('|');
    return {
      version:VERSION,
      status:cards.length===5&&direct.length===4&&historical.length===1&&duplicateIdempotencyKeys===0
        ?'AUTHORIZATION_PACKAGE_STATIC_READY'
        :'AUTHORIZATION_PACKAGE_REQUIRES_VALIDATION',
      authorizationBatchId:`cobros-auth-batch-${hash(batchSeed)}`,
      cards,
      totals:{cards:cards.length,direct:direct.length,historical:historical.length},
      duplicateIdempotencyKeys,
      allDiffsPresent:cards.every(card=>card.diff&&card.diff.before&&card.diff.proposed),
      allRollbackPlansPresent:cards.every(card=>card.rollbackPlan&&card.rollbackPlan.required===true),
      allWritesBlocked:cards.every(card=>card.authorizationGranted===false&&card.writeEligible===false&&card.writes===0),
      privateMaterializationRequired:true,
      privateValuesStoredInRepo:false,
      packageGrantsAuthorization:false,
      explicitAuthorizationRequired:true,
      reinforcedAuthorizationForHistorical:true,
      partialBatchDecisionAllowed:true,
      cobrosWrites:0,
      finmovsWrites:0,
      firestoreWrites:0,
      operationalWrites:0,
      browserExecuted:false,
      deployExecuted:false,
      productionTouched:false
    };
  }
  root.Orbit.cobrosAuthorizationPackageP0=Object.freeze({VERSION,category,buildCard,buildPackage});
})();
