/* ============================================================
   Orbit 360 · P0 dry-run Cobros/Conciliación por fuentes separadas
   Fecha: 2026-08-01

   Normaliza fuentes CRM, aseguradora, banco y soportes; produce solo
   staging, propuestas, HOLD y simulación FIFO. Nunca crea cobros,
   finmovs ni aplica pagos.
   ============================================================ */
(function(){
  'use strict';
  const root=typeof window!=='undefined'?window:globalThis;
  root.Orbit=root.Orbit||{};
  const VERSION='20260801.2-real-payload-replay';
  const TYPES=new Set(['cobros_realizados','planilla_aseguradora','estado_cuenta_bancario','documentos_soporte']);
  const AUTH={cobros_realizados:'crm',planilla_aseguradora:'insurer',estado_cuenta_bancario:'support',documentos_soporte:'support'};
  const TARGET={cobros_realizados:'pagosReportadosFuente',planilla_aseguradora:'reportesPagoAseguradora',estado_cuenta_bancario:'movimientosBanco',documentos_soporte:'documentosSoportePago'};
  const text=v=>String(v==null?'':v).trim();
  const norm=v=>text(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const compact=v=>norm(v).replace(/\s+/g,'');
  const first=(r,ks)=>{for(const k of ks)if(text(r&&r[k]))return r[k];return'';};
  const number=v=>{let s=text(v).replace(/[^0-9,.\-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');const n=Number.parseFloat(s);return Number.isFinite(n)?Math.round((n+Number.EPSILON)*100)/100:null;};
  const date=v=>{const s=text(v);let m=s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);if(m)return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;m=s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);return m?`${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`:s.slice(0,10);};
  const dateDays=v=>{const d=date(v);if(!/^\d{4}-\d{2}-\d{2}$/.test(d))return null;const ms=Date.parse(`${d}T00:00:00Z`);return Number.isFinite(ms)?Math.floor(ms/86400000):null;};
  const dayDiff=(a,b)=>{const x=dateDays(a),y=dateDays(b);return x==null||y==null?null:Math.abs(x-y);};
  const defaultCurrency=c=>String(c||'').toUpperCase()==='GT'?'GTQ':String(c||'').toUpperCase()==='CO'?'COP':'';
  const normalizeInstallment=v=>{const s=text(v).toUpperCase().replace(/^'/,'');const m=s.match(/(\d+)\s*(?:DE|\/)\s*(\d+)/);if(m)return `${Number(m[1])}/${Number(m[2])}`;return /^\d+$/.test(s)&&Number(s)>0?String(Number(s)):compact(s);};
  const normalizeEndorsement=v=>compact(text(v).replace(/^(?:NO\.?|NUMERO|NÚMERO)\s*/i,'').replace(/[.\s]/g,'').replace(/-/g,'/'));

  function trace(row,ctx={}){
    return {
      file:text(ctx.file||row.archivo||row.file),sheet:text(ctx.sheet||row.hoja||row.sheet),
      row:text(ctx.row||row.fila||row.row),block:text(ctx.block||row.bloque||row.block),
      country:String(ctx.country||row.pais||row.country||'').toUpperCase(),
      currency:String(ctx.currency||row.moneda||row.currency||'').toUpperCase(),
      period:text(ctx.period||row.periodo||row.period),sourceHash:text(ctx.sourceHash||row.sourceHash),
      rowHash:text(ctx.rowHash||row.rowHash)
    };
  }
  function key(type,row,t){
    return [type,t.sourceHash,t.file,t.sheet,t.row,t.rowHash,
      norm(first(row,['polizaId','polizaNumero','poliza','numeroPoliza','Póliza','Poliza'])),
      norm(first(row,['reciboId','reciboNumero','numeroRecibo','requerimiento','Req','Requerimiento'])),
      date(first(row,['fechaPago','fecha_cobro','fecha','date','Fecha Pago','Fecha Real Pagado','Cobranza'])),
      String(number(first(row,['monto','monto_pagado','valor','importe','total','primaTotal','Prima Total','Importe Total','Monto']))??'')].join('|');
  }
  function normalize(type,row,ctx={}){
    if(!TYPES.has(type))return {status:'HOLD',reason:'SOURCE_TYPE_UNSUPPORTED',type};
    const t=trace(row,ctx),country=t.country,currency=t.currency||defaultCurrency(country);
    const amount=number(first(row,['monto','monto_pagado','valor','importe','total','primaTotal','Prima Total','Importe Total','Monto']));
    const missing=[];
    if(!t.file)missing.push('archivo');if(!t.sheet)missing.push('hoja');if(!t.row)missing.push('fila');
    if(!country)missing.push('pais');if(!currency)missing.push('moneda');
    if(type!=='documentos_soporte'&&amount==null)missing.push('monto');
    if(country&&defaultCurrency(country)&&currency!==defaultCurrency(country))missing.push('pais_moneda_incoherente');
    const sourceKey=key(type,row,{...t,currency});
    const normalized={
      id:sourceKey,sourceType:type,authority:AUTH[type],targetCollection:TARGET[type],sourceKey,
      trace:{...t,currency},country,currency,amount,
      date:date(first(row,['fechaPago','fecha_cobro','fecha','date','Fecha Pago','Fecha Real Pagado','Cobranza'])),
      dueDate:date(first(row,['fechaVencimiento','fechaLimite','vence','dueDate','Fecha de Venc','Fec Venc','Fecha límite de pago'])),
      clientId:text(first(row,['clienteId','cliente_id'])),
      insurerId:text(first(row,['aseguradoraId','aseguradora_id'])),
      insurerName:text(first(row,['aseguradoraNombre','aseguradora','compania','Aseguradora'])),
      policyId:text(first(row,['polizaId','poliza_id'])),
      policyNumber:text(first(row,['polizaNumero','numeroPoliza','poliza','Póliza','Poliza'])),
      receiptId:text(first(row,['reciboId','recibo_id','canonicalReceiptId'])),
      receiptNumber:text(first(row,['reciboNumero','numeroRecibo','requerimiento','Req','Requerimiento'])),
      installment:normalizeInstallment(first(row,['cuota','numeroCuota','serie','Pago','Serie'])),
      endorsement:normalizeEndorsement(first(row,['endoso','Endoso'])),
      canonicalReceiptId:text(first(row,['canonicalReceiptId','reciboCanonicoId'])),
      historicalEligible:first(row,['historicalEligible','historicalExigible'])===true,
      policyStatus:text(first(row,['policyStatus','estadoPoliza','Estatus póliza'])),
      policyTermEnd:date(first(row,['policyTermEnd','vigenciaFin','Fin de vigencia'])),
      concept:text(first(row,['concepto','descripcion','detalle','referencia'])),
      documentRef:text(first(row,['documentoRef','archivoRef','url','ruta'])),missing
    };
    normalized.status=missing.length?'HOLD':'STAGED';
    normalized.reason=missing.length?'REQUIERE_VALIDACION':'';
    return normalized;
  }
  const identity=row=>[row.sourceType,row.sourceKey].join('|');
  const proposalIdentity=(crm,insurer)=>['payment',crm.canonicalReceiptId||crm.receiptId||crm.receiptNumber,crm.policyId||crm.policyNumber,crm.currency,crm.amount,insurer.sourceKey].join('|');
  const sameInsurer=(a,b)=>!!((a.insurerId||norm(a.insurerName))&&(a.insurerId||norm(a.insurerName))===(b.insurerId||norm(b.insurerName)));
  const samePolicy=(a,b)=>!!((a.policyId||norm(a.policyNumber))&&(a.policyId||norm(a.policyNumber))===(b.policyId||norm(b.policyNumber)));
  const amountDiff=(a,b)=>Math.round(Math.abs(Number(a.amount||0)-Number(b.amount||0))*100)/100;
  function identityEvidence(a,b){
    const dueDays=dayDiff(a.dueDate,b.dueDate),paymentDays=dayDiff(a.date,b.date);
    const receiptExact=!!(a.receiptId&&b.receiptId&&a.receiptId===b.receiptId)||!!(a.receiptNumber&&b.receiptNumber&&compact(a.receiptNumber)===compact(b.receiptNumber));
    const endorsementExact=!!(a.endorsement&&b.endorsement&&a.endorsement===b.endorsement);
    const installmentExact=!!(a.installment&&b.installment&&a.installment===b.installment);
    const strong=receiptExact||endorsementExact||(installmentExact&&dueDays!=null&&dueDays<=1);
    let score=0;
    if(receiptExact)score+=90;if(endorsementExact)score+=70;if(installmentExact)score+=45;
    if(dueDays===0)score+=30;else if(dueDays!=null&&dueDays<=1)score+=25;else if(dueDays!=null&&dueDays<=3)score+=10;
    if(paymentDays===0)score+=15;else if(paymentDays!=null&&paymentDays<=1)score+=12;else if(paymentDays!=null&&paymentDays<=31)score+=3;
    const diff=amountDiff(a,b);if(diff===0)score+=25;else if(diff<=0.05)score+=20;
    return {strong,score,receiptExact,endorsementExact,installmentExact,dueDays,paymentDays,amountDifference:diff};
  }
  function sourceDifferences(crm,insurer,evidence){
    const out=[];
    if(evidence.amountDifference>0)out.push({field:'amount',crm:crm.amount,insurer:insurer.amount,difference:evidence.amountDifference});
    if(evidence.dueDays>0)out.push({field:'dueDate',crm:crm.dueDate,insurer:insurer.dueDate,differenceDays:evidence.dueDays});
    if(evidence.paymentDays>0)out.push({field:'paymentDate',crm:crm.date,insurer:insurer.date,differenceDays:evidence.paymentDays});
    if(insurer.endorsement&&!crm.endorsement)out.push({field:'endorsement',crm:'',insurer:insurer.endorsement,reason:'CRM_MISSING'});
    return out;
  }
  function dryRun(input={}){
    const rows=[];
    for(const source of input.sources||[])for(const raw of source.rows||[])
      rows.push(normalize(source.sourceType,raw,{...source.trace,sourceHash:source.sourceHash}));
    const holds=rows.filter(row=>row.status==='HOLD').map(row=>({action:'HOLD',reason:row.reason,sourceKey:row.sourceKey,missing:row.missing,trace:row.trace}));
    const uniqueRows=[],matchSeen=new Set();
    for(const row of rows.filter(item=>item.status==='STAGED')){
      const id=identity(row);if(matchSeen.has(id))continue;matchSeen.add(id);uniqueRows.push(row);
    }
    const crm=uniqueRows.filter(row=>row.authority==='crm');
    const insurer=uniqueRows.filter(row=>row.authority==='insurer');
    const used=new Set(),proposals=[];
    const existing=new Map((input.existingProposals||[]).map(proposal=>[proposal.proposalIdentity,proposal]));
    const tolerance=Number.isFinite(input.amountTolerance)?Math.max(0,input.amountTolerance):0.05;
    for(const insurerRow of insurer){
      const core=crm.filter(row=>!used.has(row.sourceKey)&&sameInsurer(row,insurerRow)&&samePolicy(row,insurerRow)&&row.currency===insurerRow.currency)
        .map(row=>({row,evidence:identityEvidence(row,insurerRow)}));
      const candidates=core.filter(item=>item.evidence.amountDifference<=tolerance)
        .sort((a,b)=>(Number(b.evidence.strong)-Number(a.evidence.strong))||b.evidence.score-a.evidence.score);
      if(!candidates.length){
        const identityConflict=core.filter(item=>item.evidence.strong).sort((a,b)=>b.evidence.score-a.evidence.score)[0];
        holds.push({action:'HOLD',reason:identityConflict?'DIFERENCIA_MONTO':'SIN_CONTRAPARTE_CRM',
          sourceKey:insurerRow.sourceKey,amountDifference:identityConflict&&identityConflict.evidence.amountDifference,
          trace:insurerRow.trace});continue;
      }
      const top=candidates[0];
      if(candidates.length>1&&top.evidence.strong===candidates[1].evidence.strong&&top.evidence.score===candidates[1].evidence.score){
        holds.push({action:'HOLD',reason:'EMPATE_CANDIDATOS',sourceKey:insurerRow.sourceKey,candidateCount:candidates.length,trace:insurerRow.trace});continue;
      }
      if(!top.evidence.strong){
        holds.push({action:'HOLD',reason:'IDENTIDAD_INSUFICIENTE',sourceKey:insurerRow.sourceKey,trace:insurerRow.trace,
          sourceDifferences:sourceDifferences(top.row,insurerRow,top.evidence)});continue;
      }
      const targetMode=top.row.canonicalReceiptId||top.row.receiptId?'LINK_EXISTING_RECEIPT':
        top.row.historicalEligible?'CREATE_HISTORICAL_RECEIPT_PROPOSAL':'';
      if(!targetMode){
        holds.push({action:'HOLD',reason:'CANONICAL_RECEIPT_REQUIRED',sourceKey:insurerRow.sourceKey,trace:insurerRow.trace});continue;
      }
      used.add(top.row.sourceKey);
      const id=proposalIdentity(top.row,insurerRow);
      const proposal={
        proposalIdentity:id,status:'READY_FOR_AUTHORIZATION',crmSourceKey:top.row.sourceKey,
        insurerSourceKey:insurerRow.sourceKey,receiptId:top.row.canonicalReceiptId||top.row.receiptId||insurerRow.receiptId,
        policyId:top.row.policyId||insurerRow.policyId,policyNumber:top.row.policyNumber||insurerRow.policyNumber,
        clientId:top.row.clientId||insurerRow.clientId,insurerId:top.row.insurerId||insurerRow.insurerId,
        currency:top.row.currency,amount:top.row.amount,targetMode,historicalExigible:targetMode==='CREATE_HISTORICAL_RECEIPT_PROPOSAL',
        sourceDifferences:sourceDifferences(top.row,insurerRow,top.evidence),trace:[top.row.trace,insurerRow.trace],
        autoApply:false,writes:0,reactivatesPolicy:false
      };
      proposal.action=existing.has(id)?'UPDATE_PROPOSAL':'CREATE_PROPOSAL';
      proposals.push(proposal);
    }
    const duplicateKeys=new Set(),staging=[];
    for(const row of rows.filter(item=>item.status==='STAGED')){
      const id=identity(row);
      if(duplicateKeys.has(id))staging.push({action:'SKIP_EXACT_DUPLICATE',sourceKey:row.sourceKey,targetCollection:row.targetCollection});
      else{duplicateKeys.add(id);staging.push({action:'STAGE_SOURCE',sourceKey:row.sourceKey,targetCollection:row.targetCollection});}
    }
    const fifo=proposals.map(proposal=>({
      proposalIdentity:proposal.proposalIdentity,
      result:proposal.targetMode==='LINK_EXISTING_RECEIPT'
        ?{mode:'EXACT_RECEIPT_PRECEDENCE',targetReceiptId:proposal.receiptId,writes:0,reactivatesPolicy:false}
        :{mode:'HISTORICAL_RECEIPT_PRECEDENCE',historicalExigible:true,writes:0,reactivatesPolicy:false}
    }));
    return {
      version:VERSION,status:holds.length?'DRY_RUN_REQUIRES_VALIDATION':'DRY_RUN_READY',staging,proposals,holds,fifo,
      totals:{sourceRows:rows.length,stage:staging.filter(item=>item.action==='STAGE_SOURCE').length,
        skip:staging.filter(item=>item.action==='SKIP_EXACT_DUPLICATE').length,
        create:proposals.filter(item=>item.action==='CREATE_PROPOSAL').length,
        update:proposals.filter(item=>item.action==='UPDATE_PROPOSAL').length,hold:holds.length,
        linkExistingReceipt:proposals.filter(item=>item.targetMode==='LINK_EXISTING_RECEIPT').length,
        createHistoricalReceiptProposal:proposals.filter(item=>item.targetMode==='CREATE_HISTORICAL_RECEIPT_PROPOSAL').length},
      cobrosWrites:0,finmovsWrites:0,firestoreWrites:0,operationalWrites:0,production:false
    };
  }
  function patchDryRunContracts(){
    const contracts=root.Orbit.importaDryRunP0&&root.Orbit.importaDryRunP0.SOURCE_CONTRACTS;
    if(!contracts)return false;
    contracts.cobros_realizados={allowed:['pagosReportadosFuente','conciliaciones','gestiones'],forbidden:['cobros','finmovs','carteraPrimas'],required:['monto'],blocking:['pais','moneda']};
    contracts.planilla_aseguradora={allowed:['reportesPagoAseguradora','conciliaciones','gestiones'],forbidden:['cobros','finmovs','carteraPrimas'],required:['aseguradoraNombre','monto'],blocking:['pais','moneda','periodo']};
    contracts.estado_cuenta_bancario={allowed:['movimientosBanco','conciliaciones','gestiones'],forbidden:['finmovs','cobros','clientes','polizas','carteraPrimas'],required:['fecha','monto'],blocking:['pais','moneda']};
    contracts.documentos_soporte={allowed:['documentosSoportePago','conciliaciones','gestiones'],forbidden:['cobros','finmovs','carteraPrimas','clientes','polizas'],required:['documentoRef'],blocking:['pais','moneda']};
    return true;
  }
  root.Orbit.importaCobrosConciliacionP0=Object.freeze({VERSION,TYPES,AUTH,TARGET,normalize,dryRun,patchDryRunContracts,normalizeInstallment,normalizeEndorsement,identityEvidence});
  patchDryRunContracts();
  if(typeof document!=='undefined'&&document.addEventListener)document.addEventListener('orbit:importa-p0-ready',patchDryRunContracts,{once:true});
})();
