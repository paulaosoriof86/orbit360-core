/* ============================================================
   Orbit 360 · Cobros/Conciliación · matriz multievidencia P0
   Fecha: 2026-08-01

   Consolida el estado de cada evidencia de pago sin aplicar cobros.
   Incluye recibos históricos exigibles aunque la vigencia ya no esté
   activa. Nunca reactiva pólizas ni escribe cobros/finmovs.
   ============================================================ */
(function(){
  'use strict';
  const root=typeof window!=='undefined'?window:globalThis;
  root.Orbit=root.Orbit||{};
  const VERSION='20260801.1-real-matrix-historical-coverage';
  const STATUS=Object.freeze({
    DIRECT_READY:'DIRECT_INSURER_MATCH_READY',
    DIRECT_HISTORICAL:'DIRECT_INSURER_MATCH_HISTORICAL_RECEIPT_PROPOSAL',
    HISTORICAL_COUNTERPART:'HISTORICAL_RECEIPT_PROPOSAL_NEEDS_COUNTERPART',
    DIRECT_AMOUNT_HOLD:'HOLD_DIRECT_DIFERENCIA_MONTO',
    DIRECT_IDENTITY_HOLD:'HOLD_DIRECT_IDENTIDAD_INSUFICIENTE',
    COMMISSION_DATA_HOLD:'HOLD_COMMISSION_CORROBORATED_DATA_CONTRACT',
    STILL_PENDING_HOLD:'HOLD_STILL_PENDING_AFTER_PAYMENT',
    TEMPORAL_POLICY_PRESENT:'TEMPORAL_CLEARING_POLICY_PRESENT_REQUIRES_AUTHORIZATION',
    TEMPORAL_POLICY_ABSENT:'TEMPORAL_CLEARING_POLICY_ABSENT_REQUIRES_VALIDATION',
    CUTOFF_BEFORE_PAYMENT:'SOURCE_CUTOFF_BEFORE_PAYMENT_NEEDS_LATER_EVIDENCE',
    NO_COUNTERPART:'NO_COUNTERPART_EVIDENCE_YET'
  });

  function text(value){return String(value==null?'':value).trim();}
  function classifyCase(item={}){
    const direct=item.direct||{};
    const snapshot=text(item.snapshotStatus);
    const historical=item.historicalEligible===true&&item.canonicalPaymentLinked!==true;
    let status='';
    if(direct.matched===true){
      status=historical?STATUS.DIRECT_HISTORICAL:STATUS.DIRECT_READY;
    }else if(direct.holdReason==='DIFERENCIA_MONTO'){
      status=STATUS.DIRECT_AMOUNT_HOLD;
    }else if(direct.holdReason==='IDENTIDAD_INSUFICIENTE'){
      status=STATUS.DIRECT_IDENTITY_HOLD;
    }else if(item.commissionCorroborated===true&&item.dataContractHold===true){
      status=STATUS.COMMISSION_DATA_HOLD;
    }else if(historical){
      status=STATUS.HISTORICAL_COUNTERPART;
    }else if(snapshot==='ABSENT_EXACT_RECEIPT_POLICY_PRESENT_REQUIRES_VALIDATION'){
      status=STATUS.TEMPORAL_POLICY_PRESENT;
    }else if(snapshot==='ABSENT_FROM_COMPLETE_SNAPSHOT_REQUIRES_VALIDATION'){
      status=STATUS.TEMPORAL_POLICY_ABSENT;
    }else if(snapshot==='NO_POST_PAYMENT_SNAPSHOT'){
      status=STATUS.CUTOFF_BEFORE_PAYMENT;
    }else if(snapshot==='STILL_PENDING_AFTER_PAYMENT'){
      status=STATUS.STILL_PENDING_HOLD;
    }else{
      status=STATUS.NO_COUNTERPART;
    }
    return {
      caseKey:text(item.caseKey),insurerKey:text(item.insurerKey),status,
      canonicalPaymentLinked:item.canonicalPaymentLinked===true,
      historicalEligible:historical,directMatched:direct.matched===true,
      commissionCorroborated:item.commissionCorroborated===true,
      autoApply:false,writes:0,reactivatesPolicy:false
    };
  }

  function buildMatrix(input={}){
    const cases=(input.cases||[]).map(classifyCase);
    const insurerOnly=(input.insurerOnlyEvidence||[]).map(item=>({
      evidenceKey:text(item.evidenceKey),status:text(item.status||'HOLD_INSURER_ONLY_WITHOUT_CRM'),
      autoApply:false,writes:0
    }));
    const counts={};
    for(const item of cases)counts[item.status]=(counts[item.status]||0)+1;
    const sourceRows=Number(input.sourcePaymentRows||cases.length);
    const canonicalRows=Number(input.canonicalPaymentRows||cases.filter(item=>item.canonicalPaymentLinked).length);
    const historicalOmissions=cases.filter(item=>item.historicalEligible).length;
    const coverageBalanced=sourceRows===canonicalRows+historicalOmissions;
    const duplicateDirectEvidence=(input.directEvidenceKeys||[]).length-new Set(input.directEvidenceKeys||[]).size;
    return {
      version:VERSION,status:coverageBalanced&&duplicateDirectEvidence===0?'MATRIX_READY':'MATRIX_REQUIRES_VALIDATION',
      cases,insurerOnlyEvidence:insurerOnly,counts,
      totals:{
        sourcePaymentRows:sourceRows,canonicalPaymentRows:canonicalRows,
        historicalOmissions,unionPaymentCases:sourceRows+insurerOnly.length,
        insurerOnlyEvidence:insurerOnly.length
      },
      coverageBalanced,oneToOneDirectEvidence:duplicateDirectEvidence===0,
      exactReceiptPrecedesFifo:true,historicalExigibleIncluded:true,
      absenceAloneCreatesCobro:false,commissionAloneCreatesCobro:false,
      bankAloneCreatesCobro:false,autoApply:false,reactivatesPolicy:false,
      cobrosWrites:0,finmovsWrites:0,firestoreWrites:0,operationalWrites:0,
      browserExecuted:false,deployExecuted:false,productionTouched:false
    };
  }

  root.Orbit.importaCobrosMatrizMultievidenciaP0=Object.freeze({VERSION,STATUS,classifyCase,buildMatrix});
})();
