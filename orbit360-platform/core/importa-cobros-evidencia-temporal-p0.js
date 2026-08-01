/* ============================================================
   Orbit 360 · Cobros/Conciliación · evidencia temporal multifuente
   Fecha: 2026-08-01

   Usa estados de cartera, planillas de comisiones y pagos ya
   propuestos para explicar transiciones temporales. Nunca aplica
   pagos, crea cobros ni escribe finmovs.
   ============================================================ */
(function(){
  'use strict';
  const root=typeof window!=='undefined'?window:globalThis;
  root.Orbit=root.Orbit||{};
  const VERSION='20260801.1-multi-evidence-temporal';
  const TYPES=new Set(['estado_cartera_aseguradora','planilla_comisiones']);
  const TARGET={
    estado_cartera_aseguradora:'evidenciasCarteraTemporal',
    planilla_comisiones:'evidenciasComisionRecaudo'
  };
  const text=value=>String(value==null?'':value).trim();
  const norm=value=>text(value).toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const compact=value=>norm(value).replace(/\s+/g,'');
  const first=(row,keys)=>{for(const key of keys)if(text(row&&row[key]))return row[key];return'';};
  const number=value=>{
    const raw=text(value).replace(/[^0-9,.\-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const parsed=Number.parseFloat(raw);
    return Number.isFinite(parsed)?Math.round((parsed+Number.EPSILON)*100)/100:null;
  };
  const date=value=>{
    const raw=text(value);let match=raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if(match)return `${match[1]}-${String(match[2]).padStart(2,'0')}-${String(match[3]).padStart(2,'0')}`;
    match=raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    return match?`${match[3]}-${String(match[2]).padStart(2,'0')}-${String(match[1]).padStart(2,'0')}`:raw.slice(0,10);
  };
  const dateValue=value=>{const parsed=Date.parse(`${date(value)}T00:00:00Z`);return Number.isFinite(parsed)?parsed:null;};
  const defaultCurrency=country=>String(country||'').toUpperCase()==='GT'?'GTQ':String(country||'').toUpperCase()==='CO'?'COP':'';
  const normalizeInstallment=value=>{
    const raw=text(value).toUpperCase().replace(/^'/,'');
    const match=raw.match(/(\d+)\s*(?:DE|\/)\s*(\d+)/);
    if(match)return `${Number(match[1])}/${Number(match[2])}`;
    return /^\d+$/.test(raw)&&Number(raw)>0?String(Number(raw)):compact(raw);
  };
  const normalizeEndorsement=value=>compact(text(value).replace(/^(?:NO\.?|NUMERO|NÚMERO)\s*/i,'').replace(/[.\s]/g,'').replace(/-/g,'/'));

  function trace(row,ctx={}){
    return {
      file:text(ctx.file||row.archivo||row.file),sheet:text(ctx.sheet||row.hoja||row.sheet),
      row:text(ctx.row||row.fila||row.row),block:text(ctx.block||row.bloque||row.block),
      country:String(ctx.country||row.pais||row.country||'').toUpperCase(),
      currency:String(ctx.currency||row.moneda||row.currency||'').toUpperCase(),
      cutoff:date(ctx.cutoff||row.cutoff||row.fechaCorte||row.fecha_corte),
      period:text(ctx.period||row.periodo||row.period),sourceHash:text(ctx.sourceHash||row.sourceHash),
      completeSnapshot:ctx.completeSnapshot===true||row.completeSnapshot===true
    };
  }
  function normalize(type,row,ctx={}){
    if(!TYPES.has(type))return {status:'HOLD',reason:'SOURCE_TYPE_UNSUPPORTED',sourceType:type};
    const t=trace(row,ctx),country=t.country,currency=t.currency||defaultCurrency(country);
    const amount=number(first(row,type==='planilla_comisiones'
      ?['comisionPagada','comision','montoComision','Comisión','Comision','Comisión Cobro']
      :['saldoPendiente','saldo','montoPendiente','importe','monto','total','Saldo','Total']));
    const normalized={
      sourceType:type,targetCollection:TARGET[type],trace:{...t,currency},country,currency,amount,
      insurerId:text(first(row,['aseguradoraId','aseguradora_id'])),
      insurerName:text(first(row,['aseguradoraNombre','aseguradora','compania','Aseguradora'])),
      policyId:text(first(row,['polizaId','poliza_id'])),
      policyNumber:text(first(row,['polizaNumero','numeroPoliza','poliza','Póliza','Poliza','No. Poliza'])),
      receiptId:text(first(row,['reciboId','recibo_id','canonicalReceiptId'])),
      receiptNumber:text(first(row,['reciboNumero','numeroRecibo','requerimiento','Req','Requerimiento','Reque'])),
      installment:normalizeInstallment(first(row,['cuota','numeroCuota','Pago','# de Pago','Serie'])),
      endorsement:normalizeEndorsement(first(row,['endoso','Endoso'])),
      dueDate:date(first(row,['fechaVencimiento','fechaLimite','vence','dueDate','Vencimiento','Fecha de Vencimiento'])),
      paymentDate:date(first(row,['fechaPago','fechaRealPagado','Fecha Pago','Fecha Real Pagado'])),
      commissionPeriod:text(first(row,['fechaDevengado','Fecha Devengado','periodo','period'])),
      pending:type==='estado_cartera_aseguradora'
        ? first(row,['pending','pendiente'])===true||Number(amount||0)>0
        : false
    };
    const missing=[];
    if(!t.file)missing.push('archivo');if(!t.sheet)missing.push('hoja');if(!t.row)missing.push('fila');
    if(!country)missing.push('pais');if(!currency)missing.push('moneda');
    if(type==='estado_cartera_aseguradora'&&!t.cutoff)missing.push('corte');
    if(!normalized.policyId&&!normalized.policyNumber)missing.push('poliza');
    if(type==='estado_cartera_aseguradora'&&amount==null)missing.push('saldo');
    if(type==='planilla_comisiones'&&amount==null)missing.push('comision');
    normalized.status=missing.length?'HOLD':'STAGED';
    normalized.reason=missing.length?'REQUIERE_VALIDACION':'';
    normalized.missing=missing;
    normalized.sourceKey=[type,t.sourceHash,t.file,t.sheet,t.row,caseIdentity(normalized)].join('|');
    return normalized;
  }
  function insurerKey(row){return text(row.insurerId)||norm(row.insurerName);}
  function policyKey(row){return text(row.policyId)||compact(row.policyNumber);}
  function caseIdentity(row){
    const receipt=text(row.receiptId)||compact(row.receiptNumber);
    if(receipt)return `receipt:${receipt}`;
    const policy=policyKey(row),endorsement=normalizeEndorsement(row.endorsement),installment=normalizeInstallment(row.installment);
    if(policy&&endorsement)return `policy_endorsement:${policy}:${endorsement}`;
    if(policy&&installment)return `policy_installment:${policy}:${installment}:${date(row.dueDate)}`;
    return policy?`policy:${policy}`:'';
  }
  function matchQuality(left,right){
    if(!left||!right||!policyKey(left)||policyKey(left)!==policyKey(right))return 'NONE';
    const leftReceipt=text(left.receiptId)||compact(left.receiptNumber),rightReceipt=text(right.receiptId)||compact(right.receiptNumber);
    if(leftReceipt&&rightReceipt&&leftReceipt===rightReceipt)return 'EXACT_RECEIPT';
    const leftEndorsement=normalizeEndorsement(left.endorsement),rightEndorsement=normalizeEndorsement(right.endorsement);
    if(leftEndorsement&&rightEndorsement&&leftEndorsement===rightEndorsement)return 'EXACT_ENDORSEMENT';
    const leftInstallment=normalizeInstallment(left.installment),rightInstallment=normalizeInstallment(right.installment);
    if(leftInstallment&&rightInstallment&&leftInstallment===rightInstallment)return 'EXACT_INSTALLMENT';
    return 'POLICY_ONLY';
  }
  function isStrongQuality(value){return value==='EXACT_RECEIPT'||value==='EXACT_ENDORSEMENT'||value==='EXACT_INSTALLMENT';}
  function paymentDate(row){return date(row.paymentDate||row.date||row.fechaPago||row.fecha_recaudo);}
  function normalizePayment(row){
    return {
      policyId:text(first(row,['policyId','polizaId','poliza_id'])),
      policyNumber:text(first(row,['policyNumber','polizaNumero','numeroPoliza','poliza'])),
      receiptId:text(first(row,['receiptId','reciboId','recibo_id'])),
      receiptNumber:text(first(row,['receiptNumber','reciboNumero','numeroRecibo','requerimiento'])),
      installment:normalizeInstallment(first(row,['installment','cuota','numeroCuota'])),
      endorsement:normalizeEndorsement(first(row,['endorsement','endoso'])),
      insurerId:text(first(row,['insurerId','aseguradoraId','aseguradora_id'])),
      insurerName:text(first(row,['insurerName','aseguradoraNombre','aseguradora'])),
      paymentDate:paymentDate(row),currency:text(first(row,['currency','moneda'])),
      amount:number(first(row,['amount','monto','total_recaudado'])),sourceKey:text(row.sourceKey||row.proposalIdentity)
    };
  }
  function evaluate(input={}){
    const rows=[];
    for(const source of input.sources||[])for(const raw of source.rows||[])
      rows.push(normalize(source.sourceType,raw,{...source.trace,sourceHash:source.sourceHash,cutoff:source.cutoff,completeSnapshot:source.completeSnapshot}));
    const holds=rows.filter(row=>row.status==='HOLD').map(row=>({action:'HOLD',reason:row.reason,missing:row.missing,trace:row.trace,sourceKey:row.sourceKey}));
    const staged=rows.filter(row=>row.status==='STAGED');
    const snapshots=staged.filter(row=>row.sourceType==='estado_cartera_aseguradora');
    const commissions=staged.filter(row=>row.sourceType==='planilla_comisiones');
    const payments=(input.payments||input.proposals||[]).map(normalizePayment);
    const cases=[];

    for(const current of snapshots){
      const currentCutoff=dateValue(current.trace.cutoff);
      const laterSources=(input.sources||[]).filter(source=>source.sourceType==='estado_cartera_aseguradora'&&source.completeSnapshot===true&&
        insurerKey({insurerId:source.insurerId,insurerName:source.insurerName})===insurerKey(current)&&dateValue(source.cutoff)>currentCutoff);
      let laterComparable=false,laterStillPending=false,laterCutoff='';
      for(const source of laterSources){
        laterComparable=true;laterCutoff=date(source.cutoff);
        const laterRows=(source.rows||[]).map(raw=>normalize(source.sourceType,raw,{...source.trace,sourceHash:source.sourceHash,cutoff:source.cutoff,completeSnapshot:true}))
          .filter(row=>row.status==='STAGED');
        if(laterRows.some(row=>isStrongQuality(matchQuality(current,row)))){laterStillPending=true;break;}
      }
      const paymentMatches=payments.map(row=>({row,quality:matchQuality(current,row)})).filter(item=>isStrongQuality(item.quality));
      const commissionMatches=commissions.map(row=>({row,quality:matchQuality(current,row)})).filter(item=>isStrongQuality(item.quality));
      const validPostCutoffPayment=paymentMatches.some(item=>{
        const paid=dateValue(item.row.paymentDate);return paid!=null&&currentCutoff!=null&&paid>currentCutoff;
      });
      const directPayment=paymentMatches.length>0;
      const commissionRecognition=commissionMatches.length>0;
      const disappeared=laterComparable&&!laterStillPending;
      let status='PENDING_AS_OF_CUTOFF';
      if(laterStillPending)status='STILL_PENDING_AT_LATER_CUTOFF';
      else if(directPayment&&(commissionRecognition||disappeared))status='CORROBORATED_COLLECTION';
      else if(directPayment)status='DIRECT_PAYMENT_EVIDENCE';
      else if(disappeared&&commissionRecognition)status='CORROBORATED_CLEARING_REQUIRES_AUTHORIZATION';
      else if(disappeared)status='CLEARED_OR_ADJUSTED_REQUIRES_VALIDATION';
      else if(commissionRecognition)status='COMMISSION_RECOGNITION_REQUIRES_VALIDATION';
      cases.push({
        caseIdentity:caseIdentity(current),insurer:insurerKey(current),status,
        pendingCutoff:current.trace.cutoff,laterCutoff,laterComparable,laterStillPending,disappeared,
        directPayment,commissionRecognition,postCutoffPaymentValid:validPostCutoffPayment,
        evidenceCount:1+paymentMatches.length+commissionMatches.length+(laterComparable?1:0),
        autoApply:false,writes:0,reactivatesPolicy:false
      });
    }

    for(const commission of commissions){
      const linked=cases.some(item=>item.caseIdentity===caseIdentity(commission));
      if(!linked)holds.push({action:'HOLD',reason:'COMMISSION_WITHOUT_STRONG_PAYMENT_OR_PORTFOLIO_MATCH',sourceKey:commission.sourceKey,trace:commission.trace});
    }
    const totals={
      sourceRows:rows.length,portfolioRows:snapshots.length,commissionRows:commissions.length,
      cases:cases.length,corroborated:cases.filter(item=>item.status==='CORROBORATED_COLLECTION').length,
      postCutoffPayments:cases.filter(item=>item.postCutoffPaymentValid).length,
      stillPending:cases.filter(item=>item.status==='STILL_PENDING_AT_LATER_CUTOFF').length,
      clearedRequiresValidation:cases.filter(item=>item.status==='CLEARED_OR_ADJUSTED_REQUIRES_VALIDATION').length,
      hold:holds.length
    };
    return {
      version:VERSION,status:holds.length?'MULTI_EVIDENCE_REQUIRES_VALIDATION':'MULTI_EVIDENCE_READY',
      cases,holds,totals,allowPostCutoffPayment:true,absenceAloneCreatesCobro:false,
      commissionAloneCreatesCobro:false,bankRequestedOnlyForSpecificHold:true,
      cobrosWrites:0,finmovsWrites:0,firestoreWrites:0,operationalWrites:0,
      browserExecuted:false,deployExecuted:false,productionTouched:false
    };
  }
  root.Orbit.importaCobrosEvidenciaTemporalP0=Object.freeze({
    VERSION,TYPES,TARGET,normalize,caseIdentity,matchQuality,evaluate
  });
})();
