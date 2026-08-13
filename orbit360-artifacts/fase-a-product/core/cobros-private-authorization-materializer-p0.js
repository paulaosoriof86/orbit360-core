/* ============================================================
   Orbit 360 · Cobros · materializador privado de autorización
   Fecha: 2026-08-01

   Resuelve las tarjetas opacas contra un payload privado efímero.
   Los datos privados viven solo en memoria y no son enumerables.
   No concede autorización ni escribe cobros/finmovs.
   ============================================================ */
(function(){
  'use strict';
  const root=typeof window!=='undefined'?window:globalThis;
  root.Orbit=root.Orbit||{};
  const VERSION='20260801.1-private-readonly-materializer';
  const text=value=>String(value==null?'':value).trim();
  const REQUIRED_PRIVATE=['authorizationRef','category','clientLabel','insurerLabel','policyNumber','receiptNumber','currency','amount','paymentDate','idempotencyKey','sourceProofs'];
  const SENSITIVE_KEYS=['clientLabel','insurerLabel','policyNumber','receiptNumber','currency','amount','paymentDate','sourceProofs'];

  function validateRecord(record={}){
    const missing=REQUIRED_PRIVATE.filter(key=>{
      if(key==='sourceProofs')return !Array.isArray(record.sourceProofs)||record.sourceProofs.length<2;
      if(key==='amount')return !Number.isFinite(Number(record.amount))||Number(record.amount)<=0;
      return !text(record[key]);
    });
    const historical=record.category==='HISTORICAL_RECEIPT_REINFORCED';
    const direct=record.category==='EXISTING_CANONICAL_RECEIPT';
    return {
      ok:missing.length===0&&(direct||historical),
      missing,
      historical,
      direct,
      sourceProofCount:Array.isArray(record.sourceProofs)?record.sourceProofs.length:0
    };
  }

  function sanitizeRecord(record={},validation={}){
    return {
      authorizationRef:text(record.authorizationRef),
      category:text(record.category),
      validationOk:validation.ok===true,
      sourceProofCount:validation.sourceProofCount||0,
      explicitAuthorizationRequired:true,
      reinforcedAuthorizationRequired:validation.historical===true,
      atomicOperationRequired:validation.historical===true,
      authorizationGranted:false,
      writeEligible:false,
      createFinmov:false,
      reactivatePolicy:false
    };
  }

  function buildPrivateCard(record={},validation={}){
    return {
      authorizationRef:text(record.authorizationRef),
      category:text(record.category),
      clientLabel:text(record.clientLabel),
      insurerLabel:text(record.insurerLabel),
      policyNumber:text(record.policyNumber),
      receiptNumber:text(record.receiptNumber),
      currency:text(record.currency),
      amount:Number(record.amount),
      paymentDate:text(record.paymentDate),
      idempotencyKey:text(record.idempotencyKey),
      sourceProofs:[...(record.sourceProofs||[])],
      diff:{
        before:{cobroExists:false,paymentApplied:false,receiptHistoricalCreated:false},
        proposed:{
          createCobro:true,
          applyPayment:true,
          createHistoricalReceipt:validation.historical===true,
          reactivatePolicy:false,
          createFinmov:false
        }
      },
      authorizationGranted:false,
      writeEligible:false,
      reinforcedAuthorizationRequired:validation.historical===true,
      preWriteSnapshotRequired:true,
      rollbackRequired:true
    };
  }

  function disposeCards(cards=[]){
    for(const card of cards){
      for(const key of SENSITIVE_KEYS){
        if(Array.isArray(card[key]))card[key].splice(0,card[key].length);
        else if(typeof card[key]==='number')card[key]=0;
        else card[key]='';
      }
      card.authorizationGranted=false;
      card.writeEligible=false;
    }
    cards.splice(0,cards.length);
    return {disposed:true,remainingPrivateCards:0};
  }

  function materialize(input={}){
    const records=Array.isArray(input.privateRecords)?input.privateRecords:[];
    const ephemeralSession=input.ephemeralSession===true;
    const persistAllowed=input.persistAllowed===false;
    const packageGrantsAuthorization=input.packageGrantsAuthorization===false;
    const validations=records.map(validateRecord);
    const privateCards=records.map((record,index)=>buildPrivateCard(record,validations[index]));
    const sanitizedCards=records.map((record,index)=>sanitizeRecord(record,validations[index]));
    const refs=sanitizedCards.map(card=>card.authorizationRef);
    const keys=privateCards.map(card=>card.idempotencyKey);
    const duplicateRefs=refs.length-new Set(refs).size;
    const duplicateIdempotencyKeys=keys.length-new Set(keys).size;
    const direct=sanitizedCards.filter(card=>card.category==='EXISTING_CANONICAL_RECEIPT').length;
    const historical=sanitizedCards.filter(card=>card.category==='HISTORICAL_RECEIPT_REINFORCED').length;
    const ready=ephemeralSession&&persistAllowed&&packageGrantsAuthorization&&records.length===5&&direct===4&&historical===1&&
      validations.every(item=>item.ok)&&duplicateRefs===0&&duplicateIdempotencyKeys===0;
    const result={
      version:VERSION,
      status:ready?'PRIVATE_AUTHORIZATION_MATERIALIZATION_READY':'PRIVATE_AUTHORIZATION_MATERIALIZATION_REQUIRES_VALIDATION',
      sanitizedCards,
      totals:{cards:records.length,direct,historical},
      duplicateRefs,
      duplicateIdempotencyKeys,
      privatePayloadPresent:records.length>0,
      privateCardsEnumerable:false,
      privateValuesPersisted:false,
      ephemeralSession,
      persistAllowed:false,
      packageGrantsAuthorization:false,
      authorizationGranted:0,
      writeEligible:0,
      allSourceProofsSufficient:validations.every(item=>item.sourceProofCount>=2),
      allDiffsPresent:privateCards.every(card=>card.diff&&card.diff.before&&card.diff.proposed),
      reinforcedHistoricalSeparated:historical===1&&sanitizedCards.at(-1)?.category==='HISTORICAL_RECEIPT_REINFORCED',
      disposalRequired:true,
      cobrosWrites:0,
      finmovsWrites:0,
      firestoreWrites:0,
      operationalWrites:0,
      browserExecuted:false,
      deployExecuted:false,
      productionTouched:false
    };
    Object.defineProperty(result,'privateCards',{value:privateCards,enumerable:false,writable:false,configurable:false});
    Object.defineProperty(result,'dispose',{value:()=>disposeCards(privateCards),enumerable:false,writable:false,configurable:false});
    return result;
  }

  root.Orbit.cobrosPrivateAuthorizationMaterializerP0=Object.freeze({
    VERSION,REQUIRED_PRIVATE,validateRecord,sanitizeRecord,materialize
  });
})();
