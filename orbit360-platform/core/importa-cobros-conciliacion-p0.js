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
  const VERSION='20260801.1';
  const TYPES=new Set(['cobros_realizados','planilla_aseguradora','estado_cuenta_bancario','documentos_soporte']);
  const AUTH={cobros_realizados:'crm',planilla_aseguradora:'insurer',estado_cuenta_bancario:'support',documentos_soporte:'support'};
  const TARGET={cobros_realizados:'pagosReportadosFuente',planilla_aseguradora:'reportesPagoAseguradora',estado_cuenta_bancario:'movimientosBanco',documentos_soporte:'documentosSoportePago'};
  const text=v=>String(v==null?'':v).trim();
  const norm=v=>text(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const first=(r,ks)=>{for(const k of ks)if(text(r&&r[k]))return r[k];return'';};
  const number=v=>{let s=text(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');const n=Number.parseFloat(s);return Number.isFinite(n)?Math.round((n+Number.EPSILON)*100)/100:null;};
  const date=v=>{const s=text(v);let m=s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);if(m)return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;m=s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);return m?`${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`:s.slice(0,10);};
  const defaultCurrency=c=>String(c||'').toUpperCase()==='GT'?'GTQ':String(c||'').toUpperCase()==='CO'?'COP':'';

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
      norm(first(row,['polizaId','polizaNumero','poliza','numeroPoliza'])),
      norm(first(row,['reciboId','reciboNumero','numeroRecibo','requerimiento'])),
      date(first(row,['fechaPago','fecha_cobro','fecha','date'])),
      String(number(first(row,['monto','monto_pagado','valor','importe','total']))??'')].join('|');
  }
  function normalize(type,row,ctx={}){
    if(!TYPES.has(type))return {status:'HOLD',reason:'SOURCE_TYPE_UNSUPPORTED',type};
    const t=trace(row,ctx),country=t.country,currency=t.currency||defaultCurrency(country);
    const amount=number(first(row,['monto','monto_pagado','valor','importe','total','primaTotal']));
    const missing=[];
    if(!t.file)missing.push('archivo');if(!t.sheet)missing.push('hoja');if(!t.row)missing.push('fila');
    if(!country)missing.push('pais');if(!currency)missing.push('moneda');
    if(type!=='documentos_soporte'&&amount==null)missing.push('monto');
    if(country&&defaultCurrency(country)&&currency!==defaultCurrency(country))missing.push('pais_moneda_incoherente');
    const sourceKey=key(type,row,{...t,currency});
    const normalized={
      id:sourceKey,sourceType:type,authority:AUTH[type],targetCollection:TARGET[type],sourceKey,
      trace:{...t,currency},country,currency,amount,
      date:date(first(row,['fechaPago','fecha_cobro','fecha','date'])),
      clientId:text(first(row,['clienteId','cliente_id'])),
      insurerId:text(first(row,['aseguradoraId','aseguradora_id'])),
      insurerName:text(first(row,['aseguradoraNombre','aseguradora','compania'])),
      policyId:text(first(row,['polizaId','poliza_id'])),
      policyNumber:text(first(row,['polizaNumero','numeroPoliza','poliza'])),
      receiptId:text(first(row,['reciboId','recibo_id','canonicalReceiptId'])),
      receiptNumber:text(first(row,['reciboNumero','numeroRecibo','requerimiento'])),
      installment:text(first(row,['cuota','numeroCuota','serie'])),
      concept:text(first(row,['concepto','descripcion','detalle','referencia'])),
      documentRef:text(first(row,['documentoRef','archivoRef','url','ruta'])),missing
    };
    normalized.status=missing.length?'HOLD':'STAGED';
    normalized.reason=missing.length?'REQUIERE_VALIDACION':'';
    return normalized;
  }
  const identity=row=>[row.sourceType,row.sourceKey].join('|');
  const proposalIdentity=(crm,insurer)=>['payment',crm.receiptId||crm.receiptNumber,crm.policyId||crm.policyNumber,crm.currency,crm.amount,insurer.sourceKey].join('|');
  function exactCore(a,b){
    return !!((a.insurerId||norm(a.insurerName))&&(a.insurerId||norm(a.insurerName))===(b.insurerId||norm(b.insurerName))&&
      (a.policyId||norm(a.policyNumber))&&(a.policyId||norm(a.policyNumber))===(b.policyId||norm(b.policyNumber))&&
      a.currency===b.currency&&a.amount===b.amount);
  }
  function strongIdentity(a,b){
    return !!((a.receiptId&&a.receiptId===b.receiptId)||(a.receiptNumber&&a.receiptNumber===b.receiptNumber)||
      (a.installment&&a.installment===b.installment&&a.date&&b.date&&a.date===b.date));
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
    for(const insurerRow of insurer){
      const candidates=crm.filter(row=>!used.has(row.sourceKey)&&exactCore(row,insurerRow))
        .map(row=>({row,score:strongIdentity(row,insurerRow)?2:1})).sort((a,b)=>b.score-a.score);
      if(!candidates.length){holds.push({action:'HOLD',reason:'SIN_CONTRAPARTE_CRM',sourceKey:insurerRow.sourceKey,trace:insurerRow.trace});continue;}
      if(candidates.length>1&&candidates[0].score===candidates[1].score){holds.push({action:'HOLD',reason:'EMPATE_CANDIDATOS',sourceKey:insurerRow.sourceKey,candidateCount:candidates.length,trace:insurerRow.trace});continue;}
      const top=candidates[0];
      if(top.score<2){holds.push({action:'HOLD',reason:'IDENTIDAD_INSUFICIENTE',sourceKey:insurerRow.sourceKey,trace:insurerRow.trace});continue;}
      used.add(top.row.sourceKey);
      const id=proposalIdentity(top.row,insurerRow);
      const proposal={
        proposalIdentity:id,status:'READY_FOR_AUTHORIZATION',crmSourceKey:top.row.sourceKey,
        insurerSourceKey:insurerRow.sourceKey,receiptId:top.row.receiptId||insurerRow.receiptId,
        policyId:top.row.policyId||insurerRow.policyId,clientId:top.row.clientId||insurerRow.clientId,
        insurerId:top.row.insurerId||insurerRow.insurerId,currency:top.row.currency,amount:top.row.amount,
        sourceDifferences:[],trace:[top.row.trace,insurerRow.trace],autoApply:false,writes:0
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
    const fifo=[];
    const simulate=root.Orbit.cobrosConciliacionReadOnly&&root.Orbit.cobrosConciliacionReadOnly.simulateFifo;
    for(const proposal of proposals)if(typeof simulate==='function'){
      const payment={clienteId:proposal.clientId||'',aseguradoraId:proposal.insurerId||'',moneda:proposal.currency,monto:proposal.amount,fechaPago:input.asOf};
      fifo.push({proposalIdentity:proposal.proposalIdentity,result:simulate(payment,input.obligations||[],{})});
    }
    return {
      version:VERSION,status:holds.length?'DRY_RUN_REQUIRES_VALIDATION':'DRY_RUN_READY',staging,proposals,holds,fifo,
      totals:{sourceRows:rows.length,stage:staging.filter(item=>item.action==='STAGE_SOURCE').length,
        skip:staging.filter(item=>item.action==='SKIP_EXACT_DUPLICATE').length,
        create:proposals.filter(item=>item.action==='CREATE_PROPOSAL').length,
        update:proposals.filter(item=>item.action==='UPDATE_PROPOSAL').length,hold:holds.length},
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
  root.Orbit.importaCobrosConciliacionP0=Object.freeze({VERSION,TYPES,AUTH,TARGET,normalize,dryRun,patchDryRunContracts});
  patchDryRunContracts();
  if(typeof document!=='undefined'&&document.addEventListener)document.addEventListener('orbit:importa-p0-ready',patchDryRunContracts,{once:true});
})();
