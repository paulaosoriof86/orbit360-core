'use strict';
// I6.6 existing protected LIVE data-write environment: source-backed legacy
// paid Cobros. Does not reconcile insurer/bank applications or guess dates.
// Preflight is read-only. Apply requires an approved GitHub Environment job.
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const {canonicalPolicyNumber,moneyCents,paid,comparableGrossAliases,monthlySequence}=require('./gravicentra-i66-source-bulk-plan.cjs');
const TENANT='alianzas-soluciones',PROJECT='ays-orbit-360-lab';
const SOURCE='artifacts/orbit360-recovery/source-batches/I6_6_SOURCE_CENDOSO_PAID_CANDIDATES_2026.json.gz';
const SOURCE_SHA='649fa315a90b176b794abf6eef3d9f893d47de64cfe558d203a099c408692aa0';
const MAX_CHUNK=250;
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const str=x=>String(x==null?'':x).trim();
const norm=x=>str(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
const cents=x=>moneyCents(x);
const date=x=>/^\d{4}-\d{2}-\d{2}$/.test(str(x))?str(x):'';
const objhash=x=>sha(JSON.stringify(x));
// Some insurer exports prepend a product label ("AUTO - 39012"), while the
// canonical policy record may store just "39012". This is a *lookup alias*,
// not an insurer requirement number, edition, endorsement or new identity.
// Keep the product prefix when comparing two labeled policy numbers; only
// allow a labeled-to-bare match after exact insurer and edition checks.
const labeledPolicy=value=>{
  const match=/^(AUTO|TECD)\s*(?:-\s*|\s+)(\d+)$/i.exec(str(value));
  return match?{product:match[1].toUpperCase(),number:match[2]}:null;
};
function policyMatches(source,live){
  if(canonicalPolicyNumber(source)===canonicalPolicyNumber(live))return true;
  const a=labeledPolicy(source),b=labeledPolicy(live);
  if(!a)return false;
  if(b)return a.product===b.product&&a.number===b.number;
  return /^\d+$/.test(str(live))&&a.number===str(live);
}
function policyLookupVariants(value){
  const input=str(value),canonical=canonicalPolicyNumber(input),labels=labeledPolicy(input);
  const variants=new Set([input,canonical]);
  if(labels){const {product,number}=labels;
    for(const v of [number,`${product} ${number}`,`${product}-${number}`,`${product} - ${number}`])variants.add(v);
  }
  if(/^91-0+(\d+)$/.test(canonical))variants.add('91-'+canonical.split('-')[1].replace(/^0+/,''));
  return [...variants];
}
const item=(db,col)=>db.collection('tenants').doc(TENANT).collection('data').doc(col).collection('items');
const request=(db,id)=>db.collection('tenants').doc(TENANT).collection('operationalRequests').doc(id);
const aliases=['monto','montoTotal'];
const report=(env,body)=>{const p=process.env[env];assert.ok(p&&path.isAbsolute(p),'I66_PAID_REPORT_PATH_REQUIRED');fs.writeFileSync(p,JSON.stringify(body,null,2)+'\n',{mode:0o600});};
function loadSource(){
  const bytes=fs.readFileSync(path.join(__dirname,'..',SOURCE));
  assert.equal(sha(bytes),SOURCE_SHA,'I66_PAID_SOURCE_DIGEST_DRIFT');
  const s=JSON.parse(zlib.gunzipSync(bytes));
  assert.equal(s.schemaVersion,'GRAVICENTRA_I6_6_CENDOSO_PAID_CANDIDATES_V1');
  assert.equal(s.counts.distinctPaidCandidates,607);
  assert.equal(s.counts.sourceEligibleForCanonicalMatch,603);
  assert.equal(s.candidates.length,607);
  const decision=require('../artifacts/orbit360-recovery/release-control/I6_6_OWNER_DECISIONS_GREENAPI_EMAIL_AND_PAYMENT_20261119.json');
  assert.equal(decision.ownerDecisions20261119?.legacyRealPaidEvidence,
    'APPROVED_FOR_CONFIRMED_UNRECONCILED_COBRO_WHEN_UNIQUE_POLICY_EDITION_EXPECTED_RECEIPT_GROSS_AMOUNT_AND_PAID_DATE_MATCH_WITH_IDEMPOTENCY_NO_AUTOMATIC_RECONCILIATION',
    'I66_PAID_OWNER_PERMISSION_MISSING');
  return s;
}
function sourceRow(raw){
  const r={id:str(raw.candidateId),insurer:str(raw.insurerSource),policy:str(raw.policyNumberSource),
    coverageStart:date(raw.coverageStart),coverageEnd:date(raw.coverageEnd),
    periodStart:date(raw.receiptPeriodStart),due:date(raw.receiptDueDate),
    paid:date(raw.actualPaidDate),currency:norm(raw.currencySource),frequency:norm(raw.frequencySource),
    total:cents(raw.totalPremium),net:cents(raw.netPremium),
    sourceRows:raw.sourceRows||[],hold:raw.holdReasons||[]};
  if(!/^cendoso_[a-f0-9]{24}$/.test(r.id)||!r.insurer||!r.policy||
     !r.coverageStart||!r.coverageEnd||!r.periodStart||!r.due||!r.paid||
     !Number.isSafeInteger(r.total)||r.total<=0||
     !Array.isArray(r.sourceRows)||!r.sourceRows.length||
     r.sourceRows.some(s=>!/^[a-f0-9]{64}$/.test(str(s.sha256))))
    return {error:'INVALID_LEGACY_SOURCE',id:r.id};
  return r;
}
function policyCountry(p){const n=norm(p.pais);return n==='GT'||n==='GUATEMALA'?'GT':n;}
function insurerMatches(source,live){
  const q=norm(source).replace(/[^A-Z0-9]/g,'');
  const v=norm(live).replace(/[^A-Z0-9]/g,'');
  const known={ELROBLE:'ROBLE',ASEGUATE:'GUATEMALTECA',LACEIBA:'CEIBA',LAGENERAL:'GENERAL',
    MAPFRE:'MAPFRE',GANDT:'G&T',GT:'G&T',BANTRAB:'BANTRAB',BANRURAL:'BANRURAL',
    UNIVERSALES:'UNIVERSALES',COLUMNA:'COLUMNA',BOLIVAR:'BOLIVAR',FICOHSA:'FICOHSA',
    ZURICH:'ZURICH',AXA:'AXA',BAM:'BAM',SMI:'SMI'};
  const term=known[q]||q;
  return v.includes(term.replace(/[^A-Z0-9]/g,''));
}
const receiptDue=r=>date(r.fechaVencimientoContractual||r.vence||r.fechaVencimiento);
const operationalDue=r=>date(r.fechaLimite);
const isPaid=r=>paid(r)||/^PAID_/i.test(str(r.paymentState));
const receiptIdentity=r=>({id:r.id,polizaId:str(r.polizaId),state:str(r.estado),
  due:receiptDue(r),limit:operationalDue(r),gross:cents(r.primaTotal),
  amount:cents(r.monto),amountTotal:cents(r.montoTotal),net:cents(r.primaNeta),
  sourceReference:str(r.numeroReciboFuente),paid:isPaid(r)});
function assess(row,groups){
  if(row.error)return {code:row.error};
  if(row.hold.length)return {code:'CONFLICTING_SOURCE_DATES'};
  if(row.currency!=='GTQ')return {code:'SOURCE_CURRENCY_NOT_GTQ'};
  if(row.paid<'2026-01-01'||row.paid>'2026-12-31')return {code:'SOURCE_DATE_OUT_OF_SCOPE'};
  const possible=(groups||[]).filter(g=>policyMatches(row.policy,g.policy.numero));
  if(!possible.length)return {code:'POLICY_NUMBER_NOT_FOUND'};
  const editions=possible.filter(g=>date(g.policy.vigenciaInicio)===row.coverageStart&&
    date(g.policy.vigenciaFin)===row.coverageEnd&&policyCountry(g.policy)==='GT'&&
    norm(g.policy.moneda)==='GTQ'&&insurerMatches(row.insurer,g.insurerName));
  if(!editions.length)return {code:'EXACT_POLICY_EDITION_NOT_FOUND'};
  if(editions.length!==1)return {code:'MULTIPLE_POLICY_EDITIONS'};
  const g=editions[0];
  if(!g.clientExists||!g.insurerVerified||!str(g.policy.clienteId))return {code:'CLIENT_OR_INSURER_REFERENCE_MISSING'};
  // Current policy status does not erase insurer-proven payments in this exact
  // historical edition. Never reactivate coverage as a payment side effect.
  const valid=(g.receipts||[]).filter(r=>str(r.polizaId)===g.policy.id&&
    !/ANULADO|ANULADA|CANCELADA/.test(norm(r.estado))&&
    (receiptDue(r)===row.periodStart||receiptDue(r)===row.due||operationalDue(r)===row.due));
  let candidates=valid,matchedBy='PERIOD_DATE';
  // Legacy receipt due dates can be operationally offset. The installment
  // ordinal inside one exact policy term, not a globally constant requirement
  // number, is the secondary identity. No need for the dates to be identical.
  if(!candidates.length&&norm(g.policy.frecuencia)==='MENSUAL'){
    const ordinal=monthlySequence(g.policy,row.periodStart);
    const seqCandidates=(g.receipts||[]).filter(r=>str(r.polizaId)===g.policy.id&&
      !/ANULADO|ANULADA|CANCELADA/.test(norm(r.estado))&&ordinal!=null&&
      Number(r.secuencia||r.numeroCuota)===ordinal);
    if(ordinal!=null&&seqCandidates.length===1){candidates=seqCandidates;matchedBy='TERM_INSTALLMENT_SEQUENCE';}
    // Source period can start on day 1 while the policy anniversary does not.
    // Use only a unique installment ordinal within the exact edition.
    if(!candidates.length&&row.periodStart>=row.coverageStart&&row.periodStart<row.coverageEnd){
      const monthIndex=(+row.periodStart.slice(0,4)-+row.coverageStart.slice(0,4))*12+
        (+row.periodStart.slice(5,7)-+row.coverageStart.slice(5,7));
      const byOrdinal=(g.receipts||[]).filter(r=>str(r.polizaId)===g.policy.id&&
        !/ANULADO|ANULADA|CANCELADA/.test(norm(r.estado))&&
        monthIndex>=0&&monthIndex<12&&Number(r.secuencia||r.numeroCuota)===monthIndex+1);
      if(byOrdinal.length===1){candidates=byOrdinal;matchedBy='SOURCE_PERIOD_MONTH_ORDINAL';}
    }
  }
  if(!candidates.length&&(row.frequency.includes('UNICO')||row.frequency.includes('UNICA'))&&
    (g.receipts||[]).filter(r=>!/ANULADO|ANULADA|CANCELADA/.test(norm(r.estado))).length===1){
    candidates=g.receipts;matchedBy='SINGLE_RECEIPT_POLICY_TERM';
  }
  if(!candidates.length)return {code:'RECEIPT_PERIOD_OR_DUE_NOT_FOUND'};
  const exactAmount=candidates.filter(r=>[cents(r.primaTotal),cents(r.montoTotal),cents(r.monto)].includes(row.total));
  const targets=exactAmount.length?exactAmount:candidates;
  if(targets.length!==1)return {code:'MULTIPLE_RECEIPTS_FOR_PERIOD_OR_AMOUNT'};
  const r=targets[0];
  const existing=(g.cobros||[]).filter(c=>str(c.reciboId)===r.id);
  if(existing.length>1)return {code:'MULTIPLE_COBROS_FOR_RECEIPT'};
  if(existing.some(isPaid))return {code:'ALREADY_PAID_WITH_COBRO_PRESERVE'};
  if(existing.length)return {code:'EXISTING_UNPAID_COBRO_REVIEW'};
  const portfolio=(g.portfolio||[]).filter(c=>str(c.reciboId)===r.id);
  if(portfolio.length>1)return {code:'MULTIPLE_PORTFOLIO_ROWS_FOR_RECEIPT'};
  const creatingPortfolio=portfolio.length===0;
  const c=portfolio[0]||{id:'car_'+r.id,polizaId:g.policy.id,reciboId:r.id};
  if(creatingPortfolio&&(g.portfolio||[]).some(x=>x.id===c.id||
    (!str(x.reciboId)&&Number(x.secuencia||x.numeroCuota)===Number(r.secuencia||r.numeroCuota))))
    return {code:'UNLINKED_PORTFOLIO_POSSIBLE_DUPLICATE'};
  const backfill=isPaid(r)||isPaid(c);
  if(backfill&&[r,c].some(x=>x.conciliado===true||/^APPLIED_/.test(str(x.applicationState))))
    return {code:'EXISTING_RECONCILIATION_WITHOUT_COBRO_REVIEW'};
  if(backfill&&[r,c].some(x=>date(x.fechaPago||x.paidDate)&&
    date(x.fechaPago||x.paidDate)!==row.paid))return {code:'LEGACY_PAID_DATE_CONFLICT'};
  if(str(c.polizaId||c.policyId)!==g.policy.id)return {code:'PORTFOLIO_POLICY_RELATION_MISMATCH'};
  const beforeR=cents(r.primaTotal),beforeC=creatingPortfolio?null:cents(c.primaTotal);
  if(beforeR==null||(!creatingPortfolio&&beforeC==null))return {code:'UNDEFINED_PREVIOUS_GROSS'};
  const amounts=creatingPortfolio?
    comparableGrossAliases(r,{primaTotal:r.primaTotal},beforeR,beforeR):
    comparableGrossAliases(r,c,beforeR,beforeC);
  if(!amounts)return {code:'GROSS_ALIASES_INCONSISTENT'};
  // Net premium is a separate accounting input. Do not silently replace net or
  // recalculate commissions in a payment-state operation.
  if(cents(r.primaNeta)!=null&&row.net!=null&&cents(r.primaNeta)!==row.net)
    return {code:'NET_PREMIUM_CHANGED_REQUIRES_COMMISSION_RECOMPUTE'};
  const before={receipt:receiptIdentity(r),portfolio:creatingPortfolio?
    {id:c.id,missing:true}:{id:c.id,polizaId:c.polizaId,
      gross:beforeC,amount:cents(c.monto),amountTotal:cents(c.montoTotal),
      state:str(c.estado),portfolioState:str(c.estadoCartera),paid:isPaid(c)},aliases:amounts};
  return {ready:{sourceId:row.id,policyId:g.policy.id,receiptId:r.id,portfolioId:c.id,
    policyNumber:canonicalPolicyNumber(row.policy),insurer:row.insurer,
    paidDate:row.paid,periodStart:row.periodStart,due:row.due,grossCents:row.total,
    netCents:row.net,backfill,creatingPortfolio,before,beforeHash:objhash(before),
    sourceRowsSha256:sha(JSON.stringify(row.sourceRows)),
    match:matchedBy+(exactAmount.length?'_GROSS_EQUAL':'_INSURER_GROSS_PREVAILS')}};
}
async function readGroups(db,source){
  const numbers=[...new Set(source.candidates.map(r=>str(r.policyNumberSource)))];
  const groups=[];
  for(let i=0;i<numbers.length;i+=8){
    const next=await Promise.all(numbers.slice(i,i+8).map(async number=>{
      const variants=policyLookupVariants(number);
      const found=await Promise.all(variants.map(n=>item(db,'polizas').where('numero','==',n).limit(16).get()));
      assert.ok(found.every(s=>s.size<16),'I66_PAID_UNBOUNDED_POLICY_EDITIONS');
      const policies=[...new Map(found.flatMap(s=>s.docs).map(d=>[d.id,d])).values()];
      const out=[];
      for(const doc of policies){
        const p={...doc.data(),id:doc.id};
        const [client,insurer,receipts,portfolio,cobros]=await Promise.all([
          item(db,'clientes').doc(str(p.clienteId)||'__no_client__').get(),
          item(db,'aseguradoras').doc(str(p.aseguradoraId)||'__no_insurer__').get(),
          item(db,'recibosEsperados').where('polizaId','==',p.id).limit(101).get(),
          item(db,'carteraPrimas').where('polizaId','==',p.id).limit(101).get(),
          item(db,'cobros').where('polizaId','==',p.id).limit(101).get()]);
        assert.ok([receipts,portfolio,cobros].every(s=>s.size<101),'I66_PAID_UNBOUNDED_FINANCIAL_RELATIONS');
        out.push({policy:p,clientExists:client.exists,insurerVerified:insurer.exists&&insurer.data()?.activo!==false,
          insurerName:insurer.exists?str(insurer.data().nombre||insurer.data().razonSocial):'',
          receipts:receipts.docs.map(d=>({...d.data(),id:d.id})),
          portfolio:portfolio.docs.map(d=>({...d.data(),id:d.id})),
          cobros:cobros.docs.map(d=>({...d.data(),id:d.id}))});
      }
      return out;
    }));
    next.forEach(a=>groups.push(...a));
  }
  // A labeled and a bare source reference can fetch the same canonical
  // Firestore policy multiple times. Count editions by document ID, not by
  // the number of lookup aliases that happened to find one document.
  return [...new Map(groups.map(g=>[g.policy.id,g])).values()];
}
function planBatch(source,groups){
  const by=new Map();for(const g of groups){
    for(const key of policyLookupVariants(g.policy.numero)){
      const canonical=canonicalPolicyNumber(key);
      if(!by.has(canonical))by.set(canonical,[]);
      by.get(canonical).push(g);
    }
  }
  const ready=[],holds=[],byTarget=new Map();
  for(const raw of source.candidates){
    const row=sourceRow(raw),related=[...new Set(policyLookupVariants(row.policy)
      .flatMap(key=>by.get(canonicalPolicyNumber(key))||[]))];
    const m=assess(row,related);
    if(m.ready){if(!byTarget.has(m.ready.receiptId))byTarget.set(m.ready.receiptId,[]);
      byTarget.get(m.ready.receiptId).push(m.ready);
    }else holds.push({sourceId:row.id,policy:row.policy,reason:m.code});
  }
  for(const targets of byTarget.values()){
    if(targets.length===1)ready.push(targets[0]);
    else for(const target of targets)holds.push({sourceId:target.sourceId,policy:target.policyNumber,
      reason:'MULTIPLE_SOURCE_ROWS_FOR_ONE_RECEIPT'});
  }
  const counts={};for(const x of holds)counts[x.reason]=(counts[x.reason]||0)+1;
  return {schema:'GRAVICENTRA_I6_6_CENDOSO_PAID_PROTECTED_PLAN_V1',sourceSha256:SOURCE_SHA,
    status:'READONLY_PREFLIGHT_NO_WRITES',writes:0,inputCount:source.candidates.length,
    readyCount:ready.length,holdsCount:holds.length,holdCounts:counts,ready,
    holds,createdAt:new Date().toISOString()};
}
const cobroId=receiptId=>'cob_'+sha(`${TENANT}|receipt|${receiptId}`).slice(0,28);
const auditId=sourceId=>'gi_i66_cendoso_paid_'+sha(`${TENANT}|${SOURCE_SHA}|${sourceId}`).slice(0,30);
function setGross(record,newCents,oldAliases){
  const out={primaTotal:newCents/100};for(const name of aliases){if(Object.hasOwn(oldAliases,name))
    out[name]=typeof record[name]==='string'?String(newCents/100):newCents/100;}
  return out;
}
async function applyOne(db,oldPlan,source){
  const row=source.candidates.find(r=>r.candidateId===oldPlan.sourceId);
  if(!row||sourceRow(row).total!==oldPlan.grossCents||sourceRow(row).paid!==oldPlan.paidDate)
    throw Error('SOURCE_CHANGED');
  const rRef=item(db,'recibosEsperados').doc(oldPlan.receiptId),
    cRef=item(db,'carteraPrimas').doc(oldPlan.portfolioId),
    pRef=item(db,'polizas').doc(oldPlan.policyId),
    cobRef=item(db,'cobros').doc(cobroId(oldPlan.receiptId)),
    aRef=request(db,auditId(oldPlan.sourceId));
  const status=await db.runTransaction(async tx=>{
    const [rs,cs,ps,cb,as]=await Promise.all([tx.get(rRef),tx.get(cRef),tx.get(pRef),tx.get(cobRef),tx.get(aRef)]);
    if(as.exists){const a=as.data();if(a.sourceId===oldPlan.sourceId&&a.receiptId===oldPlan.receiptId)
      return 'ALREADY_APPLIED';throw Error('AUDIT_COLLISION');}
    if(!rs.exists||!ps.exists||cb.exists||cs.exists===oldPlan.creatingPortfolio)
      throw Error('PREIMAGE_MISSING_OR_COBRO_EXISTS');
    const r={...rs.data(),id:rs.id},
      c=cs.exists?{...cs.data(),id:cs.id}:{id:cRef.id,polizaId:ps.id,reciboId:rs.id},
      p={...ps.data(),id:ps.id};
    if(str(r.polizaId)!==p.id||str(c.polizaId||c.policyId)!==p.id||
      !policyMatches(oldPlan.policyNumber,p.numero)||
      date(p.vigenciaInicio)!==sourceRow(row).coverageStart||date(p.vigenciaFin)!==sourceRow(row).coverageEnd||
      policyCountry(p)!=='GT'||norm(p.moneda)!=='GTQ'||
      (!oldPlan.backfill&&(isPaid(r)||isPaid(c)))||
      (oldPlan.backfill&&!isPaid(r)&&!isPaid(c))||
      [r,c].some(x=>x.conciliado===true||/^APPLIED_/.test(str(x.applicationState)))||
      [r,c].some(x=>date(x.fechaPago||x.paidDate)&&date(x.fechaPago||x.paidDate)!==oldPlan.paidDate)||
      !/^[a-f0-9]{64}$/.test(oldPlan.beforeHash))throw Error('POLICY_RECEIPT_PREIMAGE_CHANGED');
    if(oldPlan.match.startsWith('SOURCE_PERIOD_MONTH_ORDINAL')){
      const delta=(+oldPlan.periodStart.slice(0,4)-+p.vigenciaInicio.slice(0,4))*12+
        (+oldPlan.periodStart.slice(5,7)-+p.vigenciaInicio.slice(5,7));
      if(delta<0||delta>=12||Number(r.secuencia||r.numeroCuota)!==delta+1)
        throw Error('INSURER_PERIOD_SEQUENCE_CHANGED');
    }
    const alias=oldPlan.creatingPortfolio?
      comparableGrossAliases(r,{primaTotal:r.primaTotal},cents(r.primaTotal),cents(r.primaTotal)):
      comparableGrossAliases(r,c,cents(r.primaTotal),cents(c.primaTotal));
    const fresh={receipt:receiptIdentity(r),portfolio:oldPlan.creatingPortfolio?
      {id:c.id,missing:true}:{id:c.id,polizaId:c.polizaId,
        gross:cents(c.primaTotal),amount:cents(c.monto),amountTotal:cents(c.montoTotal),
        state:str(c.estado),portfolioState:str(c.estadoCartera),paid:isPaid(c)},aliases:alias};
    if(objhash(fresh)!==oldPlan.beforeHash)throw Error('CAS_PREIMAGE_CHANGED');
    const [otherCobros,otherPortfolio,client,insurer]=await Promise.all([
      tx.get(item(db,'cobros').where('reciboId','==',r.id).limit(2)),
      tx.get(item(db,'carteraPrimas').where('reciboId','==',r.id).limit(3)),
      tx.get(item(db,'clientes').doc(str(p.clienteId)||'__no_client__')),
      tx.get(item(db,'aseguradoras').doc(str(p.aseguradoraId)||'__no_insurer__'))]);
    if(!otherCobros.empty||otherPortfolio.docs.length!==(oldPlan.creatingPortfolio?0:1)||
      (!oldPlan.creatingPortfolio&&otherPortfolio.docs[0].id!==c.id))
      throw Error('NON_UNIQUE_PAYMENT_OR_PORTFOLIO');
    if(!client.exists||!insurer.exists||insurer.data()?.activo===false||
      !insurerMatches(oldPlan.insurer,insurer.data().nombre||insurer.data().razonSocial))
      throw Error('CLIENT_OR_INSURER_CHANGED');
    const when=new Date().toISOString(),cbid=cobroId(r.id);
    const provenance={rule:'I6_6_OWNER_LEGACY_REAL_PAID_20261119',sourceId:oldPlan.sourceId,
      sourceFileSha256:row.sourceRows.map(s=>s.sha256),sourceRows:row.sourceRows.map(s=>({file:s.file,row:s.row})),
      actualPaidDateSource:'CENDOSO_FECHA_REAL_PAGADO',applicationEvidenceVerified:false};
    const shared={paymentState:'PAID_DIRECT',applicationState:'PENDING_APPLICATION',
      paymentOrigin:'CRM_MIGRATED_DIRECT_PAYMENT',paymentEvidenceType:'LEGACY_CENDOSO_FECHA_REAL_PAGADO',
      evidenceId:oldPlan.sourceId,sourceRef:oldPlan.sourceId,paidDate:oldPlan.paidDate,
      directOrInferred:'DIRECT',inferenceProvenance:provenance,
      reconciledAt:null,updatedAt:when,updatedByUid:'I6_6_PROTECTED_SOURCE_RUNNER'};
    tx.create(cobRef,{id:cbid,tenantId:TENANT,clienteId:p.clienteId,polizaId:p.id,reciboId:r.id,
      asesorId:str(r.asesorId||p.asesorId),pais:'GT',moneda:'GTQ',cuota:r.cuota||r.numeroCuota||'',
      vence:oldPlan.due,periodoInicioFuente:oldPlan.periodStart,
      monto:oldPlan.grossCents/100,fechaPago:oldPlan.paidDate,
      estado:'Pagado',conciliado:false,...shared});
    tx.update(rRef,{...setGross(r,oldPlan.grossCents,alias.receipt),
      fechaVencimientoContractual:oldPlan.due,periodoInicioFuente:oldPlan.periodStart,
      estado:'Pagado',
      estadoOperativo:'pagado',conciliado:false,conciliadoPago:true,
      cobroId:cbid,fechaPago:oldPlan.paidDate,...shared});
    const carteraPatch={...setGross(c,oldPlan.grossCents,alias.cartera),
      vence:oldPlan.due,fechaVencimientoContractual:oldPlan.due,
      periodoInicioFuente:oldPlan.periodStart,estado:'Pagado',
      estadoCartera:'Pagado',conciliado:false,conciliadoPago:true,
      cobroId:cbid,reciboId:r.id,fechaPago:oldPlan.paidDate,...shared};
    if(oldPlan.creatingPortfolio)tx.create(cRef,{id:cRef.id,tenantId:TENANT,
      polizaId:p.id,clienteId:p.clienteId,reciboId:r.id,asesorId:str(p.asesorId),
      aseguradoraId:p.aseguradoraId,pais:'GT',moneda:'GTQ',
      secuencia:r.secuencia||r.numeroCuota||null,cuota:r.cuota||'',
      monto:oldPlan.grossCents/100,montoTotal:oldPlan.grossCents/100,
      vence:oldPlan.due,fechaLimite:operationalDue(r),
      carteraActiva:false,carteraTipo:'historico_pagado_fuente',
      estadoOperativo:'pagado_sin_saldo',exigibilidad:'cerrada',
      ...carteraPatch});
    else tx.update(cRef,carteraPatch);
    tx.create(aRef,{schema:'I6_6_PROTECTED_CENDOSO_PAID_V1',status:'COMMITTED_PENDING_READBACK',
      sourceId:oldPlan.sourceId,sourceSha256:SOURCE_SHA,policyId:p.id,receiptId:r.id,
      portfolioId:c.id,cobroId:cbid,oldPlanHash:oldPlan.beforeHash,
      newGrossCents:oldPlan.grossCents,paidDate:oldPlan.paidDate,
      insurerDueDate:oldPlan.due,insurerPeriodStart:oldPlan.periodStart,
      rollback:{receiptBefore:rs.data(),portfolioBefore:cs.exists?cs.data():null,
        portfolioWasAbsent:!cs.exists,cobroWasAbsent:true},
      noAutomaticInsurerBankReconciliation:true,createdAt:when});
    return 'COMMITTED';
  });
  const [rr,cc,cb,aa]=await Promise.all([rRef.get(),cRef.get(),cobRef.get(),aRef.get()]);
  if(![rr,cc,cb,aa].every(s=>s.exists)||
    ![rr,cc,cb].every(s=>s.data().paymentState==='PAID_DIRECT'&&
      s.data().applicationState==='PENDING_APPLICATION'&&s.data().conciliado===false&&
      s.data().fechaPago===oldPlan.paidDate)||
    receiptDue(rr.data())!==oldPlan.due||
    date(cc.data().fechaVencimientoContractual)!==oldPlan.due||
    date(cb.data().vence)!==oldPlan.due||
    cents(rr.data().primaTotal)!==oldPlan.grossCents||
    cents(cc.data().primaTotal)!==oldPlan.grossCents||
    cents(cb.data().monto)!==oldPlan.grossCents||
    aa.data().sourceId!==oldPlan.sourceId)throw Error('POSTIMAGE_READBACK_HOLD');
  return {sourceId:oldPlan.sourceId,status:status==='ALREADY_APPLIED'?'ALREADY_APPLIED_READBACK_PASS':'APPLIED_READBACK_PASS'};
}
async function main(){
  const mode=str(process.env.GI_I66_CENDOSO_MODE);
  assert.ok(['preflight','apply','columna-readback','issued-readback'].includes(mode),'I66_PAID_MODE_REQUIRED');
  assert.equal(process.env.GCLOUD_PROJECT,PROJECT,'I66_PAID_FIREBASE_PROJECT_DRIFT');
  const source=loadSource();
  const admin=require('firebase-admin');
  admin.initializeApp({credential:admin.credential.applicationDefault(),projectId:PROJECT});
  const db=admin.firestore();
  if(mode==='issued-readback'){
    const editions=require('../artifacts/orbit360-recovery/source-batches/I6_6_ROBLE_ISSUED_FIVE_20261119.json').editions;
    const groups=await readGroups(db,{candidates:editions.map(p=>({policyNumberSource:p.policy}))});
    for(const p of editions){
      const versions=groups.filter(g=>policyMatches(p.policy,g.policy.numero)&&insurerMatches('ELROBLE',g.insurerName)&&policyCountry(g.policy)==='GT');
      const same=versions.filter(g=>date(g.policy.vigenciaInicio)===p.start&&date(g.policy.vigenciaFin)===p.end);
      const expected=new Set(p.installments.map(r=>r.requirement));
      const receipts=same.flatMap(g=>g.receipts);
      console.log('I66_ISSUED_READBACK '+JSON.stringify({policy:p.policy,canonicalEditions:versions.length,
        exactIssuedTerm:same.length,expected:expected.size,receipts:receipts.length,
        matchingRequirements:receipts.filter(r=>expected.has(str(r.numeroReciboFuente||r.numeroRequerimiento))).length,
        cartera:same.reduce((n,g)=>n+g.portfolio.length,0),writes:0}));
    }
    return;
  }
  if(mode==='columna-readback'){
    const evidence=require('../artifacts/orbit360-recovery/source-batches/I6_6_COLUMNA_20261116_PAYMENT_EVIDENCE.json');
    const candidates=evidence.payments.flatMap(p=>[p.policy,'VA-'+p.policy,'VA '+p.policy].map(policyNumberSource=>({policyNumberSource})));
    const groups=await readGroups(db,{candidates});
    for(const p of evidence.payments){
      const editions=groups.filter(g=>[p.policy,'VA-'+p.policy,'VA '+p.policy].includes(str(g.policy.numero))&&
        policyCountry(g.policy)==='GT'&&insurerMatches('COLUMNA',g.insurerName));
      const receiptMatches=editions.flatMap(g=>g.receipts.filter(r=>Number(r.secuencia||r.numeroCuota)===p.installment&&
        [r.primaTotal,r.montoTotal,r.monto].some(v=>cents(v)===p.grossCents)));
      console.log('I66_COLUMNA_READBACK '+JSON.stringify({policy:p.policy,installment:p.installment,
        editions:editions.length,matchingReceipts:receiptMatches.length,alreadyPaid:receiptMatches.filter(isPaid).length,
        linkedCobros:editions.reduce((n,g)=>n+g.cobros.filter(c=>date(c.fechaPago)===p.paidDate&&cents(c.monto)===p.grossCents).length,0),writes:0}));
    }
    return;
  }
  if(mode==='preflight'){
    const groups=await readGroups(db,source);const p=planBatch(source,groups);
    report('GI_I66_CENDOSO_PLAN_OUT',p);
    report('GI_I66_CENDOSO_REPORT_OUT',{status:'READONLY_PREFLIGHT_NO_WRITES',
      sourceSha256:SOURCE_SHA,inputCount:p.inputCount,readyCount:p.readyCount,
      holdsCount:p.holdsCount,holdCounts:p.holdCounts,
      holdExamples:p.holds.slice(0,55),writes:0});
    console.log('I66_CENDOSO_PREFLIGHT input='+p.inputCount+' ready='+p.readyCount+
      ' holds='+p.holdsCount+' reasons='+JSON.stringify(p.holdCounts)+' ZERO_WRITES');return;
  }
  assert.equal(process.env.GITHUB_REF,'refs/heads/recovery/fase-a-clean-20260831');
  assert.equal(process.env.GITHUB_REPOSITORY,'paulaosoriof86/orbit360-core');
  assert.equal(process.env.GI_I66_PROTECTED_ENV,'gravicentra-live-data-writes');
  const plan=JSON.parse(fs.readFileSync(process.env.GI_I66_CENDOSO_PLAN_IN,'utf8'));
  assert.equal(plan.sourceSha256,SOURCE_SHA);assert.equal(plan.status,'READONLY_PREFLIGHT_NO_WRITES');
  assert.equal(plan.writes,0);assert.ok(plan.ready.length>0&&plan.ready.length<=607);
  const sourceIds=new Set(source.candidates.map(r=>r.candidateId));
  assert.ok(plan.ready.every(r=>sourceIds.has(r.sourceId)&&
    /^[a-f0-9]{64}$/.test(r.beforeHash)));
  const accepted=[],holds=[];
  for(let i=0;i<plan.ready.length;i+=MAX_CHUNK){const chunk=plan.ready.slice(i,i+MAX_CHUNK);
    for(let k=0;k<chunk.length;k+=8){
      const done=await Promise.all(chunk.slice(k,k+8).map(async r=>{
        try{return {ok:true,result:await applyOne(db,r,source)};}
        catch(e){return {ok:false,sourceId:r.sourceId,reason:/^[A-Z_]+$/.test(e.message)?e.message:'PRIVATE_RUNTIME_ERROR'};}}));
      done.forEach(x=>(x.ok?accepted:holds).push(x.ok?x.result:{sourceId:x.sourceId,reason:x.reason}));
    }
  }
  const applied=accepted.filter(x=>x.status==='APPLIED_READBACK_PASS').length;
  const already=accepted.length-applied;
  const body={status:holds.length?'PROTECTED_PARTIAL_READBACK_WITH_ISOLATED_HOLDS':'PROTECTED_PAID_READBACK_PASS',
    sourceSha256:SOURCE_SHA,inputCount:plan.inputCount,preflightReady:plan.readyCount,
    cobroWrites:applied,receiptPaidWrites:applied,portfolioPaidWrites:applied,
    reconciledWrites:0,alreadyApplied:already,holds,accepted};
  report('GI_I66_CENDOSO_REPORT_OUT',body);
  console.log('I66_CENDOSO_LIVE_READBACK applied='+applied+' already='+already+' holds='+holds.length+' reconciledWrites=0');
  if(!applied&&!already)throw Error('I66_NO_PAYMENT_WRITES_OR_READBACK');
}
if(require.main===module)main().catch(e=>{console.error('I66_CENDOSO_HOLD '+e.message);process.exitCode=1;});
module.exports={sourceRow,assess,planBatch,loadSource,receiptIdentity,insurerMatches,
  policyMatches,policyLookupVariants};
