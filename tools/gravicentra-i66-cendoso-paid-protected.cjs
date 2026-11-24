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
const HISTORICAL_AUTHORITY='artifacts/orbit360-recovery/release-control/I6_6_CENDOSO_MISSING_HISTORICAL_RECEIPTS_CAUSAL_AUTHORITY_20261124.json';
const HISTORICAL_AUTHORITY_SHA='95d0610ac778af0a021bcb780a6bdcbc2ff1a83b8af9de1eb9fdaaa797579672';
const HISTORICAL_CHUNK=100,MAX_FINANCIAL_CENSUS=15000;
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const str=x=>String(x==null?'':x).trim();
const norm=x=>str(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
const cents=x=>moneyCents(x);
const date=x=>/^\d{4}-\d{2}-\d{2}$/.test(str(x))?str(x):'';
const objhash=x=>sha(JSON.stringify(x));
const stableValue=x=>x&&typeof x==='object'?
  (typeof x.toJSON==='function'?stableValue(x.toJSON()):Array.isArray(x)?x.map(stableValue):
    Object.fromEntries(Object.keys(x).sort().filter(k=>x[k]!==undefined).map(k=>[k,stableValue(x[k])]))):x;
const stableHash=x=>objhash(stableValue(x));
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
// The approved policy contract has three persisted number fields. Read all
// three without changing the document or treating a conflicting alias as an
// alternate policy. A suffix remains part of the renewal identity.
const policyNumberFields=['numero','numeroPoliza','polizaNumero'];
function policyIdentityNumber(policy){
  const values=policyNumberFields.map(field=>str(policy?.[field])).filter(Boolean);
  if(!values.length)return '';
  // Compatibility is not transitive: a bare number can match either product
  // label, but AUTO and TECD must never become the same policy via that bare
  // number. Check every pair rather than only the first persisted field.
  for(let i=0;i<values.length;i++)for(let j=i+1;j<values.length;j++){
    if(!policyMatches(values[i],values[j])&&!policyMatches(values[j],values[i]))return '';
  }
  // Preserve any known product label when comparing the source. Returning a
  // bare first field would let an AUTO source cross into a TECD alias.
  return values.find(value=>labeledPolicy(value))||values[0];
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
// Older insurer statement rows persisted the exact installment-period date
// only in fechaLimite. This is an exact source-period identity, not a date
// tolerance: require an issuer reference and unchanged source gross, and never
// override an explicit contractual due date to obtain a match.
const legacyLimitMatchesSourcePeriod=(row,r)=>
  !['fechaVencimientoContractual','vence','fechaVencimiento'].some(field=>str(r[field]))&&
  operationalDue(r)===row.periodStart&&cents(r.primaTotal)===row.total&&
  /^\d{6,20}$/.test(str(r.numeroReciboFuente));
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
  const conflicts=(groups||[]).filter(g=>!policyIdentityNumber(g.policy)&&
    policyNumberFields.some(field=>policyMatches(row.policy,g.policy[field])));
  if(conflicts.length)return {code:'POLICY_NUMBER_FIELDS_CONFLICT'};
  const possible=(groups||[]).filter(g=>policyMatches(row.policy,policyIdentityNumber(g.policy)));
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
  if(!candidates.length){
    candidates=(g.receipts||[]).filter(r=>str(r.polizaId)===g.policy.id&&
      !/ANULADO|ANULADA|CANCELADA/.test(norm(r.estado))&&legacyLimitMatchesSourcePeriod(row,r));
    if(candidates.length)matchedBy='LEGACY_INSURER_LIMIT_EXACT_SOURCE_PERIOD';
  }
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
      const found=await Promise.all(variants.flatMap(n=>policyNumberFields.map(field=>
        item(db,'polizas').where(field,'==',n).limit(16).get())));
      assert.ok(found.every(s=>s.size<16),'I66_PAID_UNBOUNDED_POLICY_EDITIONS');
      const policies=[...new Map(found.flatMap(s=>s.docs).map(d=>[d.id,d])).values()];
      assert.ok(policies.length<16,'I66_PAID_UNBOUNDED_UNIQUE_POLICY_EDITIONS');
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
          clientSnapshotHash:client.exists?stableHash({...client.data(),id:client.id}):'',
          insurerSnapshotHash:insurer.exists?stableHash({...insurer.data(),id:insurer.id}):'',
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
function historicalAuthority(){
  const bytes=fs.readFileSync(path.join(__dirname,'..',HISTORICAL_AUTHORITY));
  assert.equal(sha(bytes),HISTORICAL_AUTHORITY_SHA,'HISTORICAL_AUTHORITY_DIGEST_DRIFT');
  const a=JSON.parse(bytes);
  assert.equal(a.sourceSha256,SOURCE_SHA);assert.equal(a.protectedEnvironment,'gravicentra-live-data-writes');
  return a;
}
function historicalSourceProved(raw){
  const row=sourceRow(raw);if(row.error||row.hold.length||raw.materialSourceVariation!==false)return false;
  const a=historicalAuthority(),hashes=new Set(row.sourceRows.map(r=>r.sha256));
  const realDate=v=>date(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'))&&
    new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
  return hashes.has(a.actualPaidSourceSha256)&&a.scheduleSourceSha256.some(h=>hashes.has(h))&&
    row.currency==='GTQ'&&Number.isSafeInteger(row.net)&&row.net>=0&&row.net<=row.total&&
    [row.coverageStart,row.coverageEnd,row.periodStart,row.due,row.paid].every(realDate)&&
    row.coverageStart<=row.periodStart&&row.periodStart<row.coverageEnd&&row.due>=row.periodStart&&
    row.paid>='2026-01-01'&&row.paid<='2026-09-17'&&
    ['MENSUAL','PAGO UNICO'].includes(row.frequency)&&!str(raw.receiptFolio)&&!str(raw.endorsementSource);
}
const financialCollections=['recibosEsperados','carteraPrimas','cobros'];
// Read complete bounded collections, rather than guessing absence from one
// indexed foreign-key alias. This includes missing/contradictory parent aliases
// and orphan payments. The same census is read inside every creation CAS.
async function readHistoricalSnapshot(db,source,tx){
  const get=ref=>tx?tx.get(ref):ref.get();
  const sets=await Promise.all(financialCollections.map(async collection=>{
    const snap=await get(item(db,collection).limit(MAX_FINANCIAL_CENSUS+1));
    assert.ok(snap.size<=MAX_FINANCIAL_CENSUS,'HISTORICAL_FINANCIAL_CENSUS_TRUNCATED');
    return snap.docs.map(d=>({...d.data(),id:d.id,collection}));
  }));
  const refs=source.candidates.map(r=>request(db,auditId(r.candidateId)));
  const audits=[];for(let i=0;i<refs.length;i+=100){
    const found=await (tx?tx.getAll(...refs.slice(i,i+100)):db.getAll(...refs.slice(i,i+100)));
    audits.push(...found.filter(s=>s.exists).map(s=>({...s.data(),id:s.id})));
  }
  const policySnap=await get(item(db,'polizas').select('numero','numeroPoliza','polizaNumero',
    'vigenciaInicio','vigenciaFin','clienteId','aseguradoraId','pais','moneda').limit(5001));
  assert.ok(policySnap.size<=5000,'HISTORICAL_POLICY_CENSUS_TRUNCATED');
  const insurerSnap=await get(item(db,'aseguradoras').select('nombre','razonSocial','activo').limit(1001));
  assert.ok(insurerSnap.size<=1000,'HISTORICAL_INSURER_CENSUS_TRUNCATED');
  return {complete:true,sourceSha256:SOURCE_SHA,records:sets.flat(),audits,
    policies:policySnap.docs.map(d=>({...d.data(),id:d.id})),
    insurers:insurerSnap.docs.map(d=>({...d.data(),id:d.id}))};
}
function historicalIdentity(raw,policy){
  const row=sourceRow(raw),naturalKey=stableHash({tenant:TENANT,country:'GT',currency:row.currency,
    policyId:policy.id,periodStart:row.periodStart,due:row.due,grossCents:row.total,netCents:row.net});
  const receiptId='rec_i66_paid_'+naturalKey.slice(0,30);
  return {naturalKey,receiptId,portfolioId:'car_'+receiptId,cobroId:cobroId(receiptId)};
}
function historicalDocuments(raw,policy,when){
  const row=sourceRow(raw),ids=historicalIdentity(raw,policy);
  const common={tenantId:TENANT,pais:'GT',moneda:'GTQ',clienteId:policy.clienteId,
    polizaId:policy.id,asesorId:str(policy.asesorId),aseguradoraId:policy.aseguradoraId,
    historicalNaturalKey:ids.naturalKey,historicalCreationAuthoritySha256:HISTORICAL_AUTHORITY_SHA,
    sourceManifestSha256:SOURCE_SHA,sourceRef:row.id,evidenceId:row.id,sourceId:row.id,
    periodoInicioFuente:row.periodStart,fechaVencimientoContractual:row.due,vence:row.due,fechaLimite:row.due,
    primaTotal:row.total/100,monto:row.total/100,montoTotal:row.total/100,
    primaNeta:row.net/100,neta:row.net/100,fechaPago:row.paid,paidDate:row.paid,
    paymentState:'PAID_DIRECT',estado:'Pagado',estadoOperativo:'pagado_sin_saldo',
    paymentOrigin:'CRM_MIGRATED_DIRECT_PAYMENT',paymentEvidenceType:'LEGACY_CENDOSO_FECHA_REAL_PAGADO',
    directOrInferred:'DIRECT',inferredPaid:false,applicationState:'PENDING_APPLICATION',
    conciliado:false,conciliadoPago:true,reconciledAt:null,
    carteraActiva:false,historicalExigible:false,exigibilidad:'cerrada',saldo:0,saldoPendiente:0,
    sourceMonetaryBreakdown:{netPremium:raw.netPremium,totalPremium:raw.totalPremium,
      issuanceExpense:raw.issuanceExpense,financingSurcharge:raw.financingSurcharge,
      discount:raw.discount,tax:raw.tax},
    sourceRows:row.sourceRows,actualPaidDateSource:'CENDOSO_FECHA_REAL_PAGADO',
    createdAt:when,updatedAt:when,updatedByUid:'I6_6_PROTECTED_SOURCE_RUNNER'};
  const receipt={...common,id:ids.receiptId,receiptKey:ids.naturalKey,cobroId:ids.cobroId,
    numeroReciboFuente:null,fuente:'Cronograma y pago histórico Cendoso documentados'};
  const cartera={...common,id:ids.portfolioId,reciboId:ids.receiptId,cobroId:ids.cobroId,
    carteraTipo:'historico_pagado_fuente',estadoCartera:'Pagado'};
  const cobro={...common,id:ids.cobroId,reciboId:ids.receiptId,confirmado:true};
  return {ids,records:[['recibosEsperados',receipt],['carteraPrimas',cartera],['cobros',cobro]]};
}
function historicalAudit(raw,policy,oldPlan,documents,when){
  return {schema:'I6_6_PROTECTED_CENDOSO_PAID_V1',status:'COMMITTED_PENDING_READBACK',
    sourceId:oldPlan.sourceId,sourceSha256:SOURCE_SHA,sourceHash:stableHash(raw),
    historicalReceiptCreated:true,historicalCreationAuthoritySha256:HISTORICAL_AUTHORITY_SHA,
    policyId:policy.id,receiptId:documents.ids.receiptId,portfolioId:documents.ids.portfolioId,
    cobroId:documents.ids.cobroId,historicalNaturalKey:documents.ids.naturalKey,
    oldPlanHash:oldPlan.beforeHash,policyBeforeHash:oldPlan.before.policyHash,
    parentPreimage:oldPlan.before,newGrossCents:oldPlan.grossCents,newNetCents:oldPlan.netCents,
    paidDate:oldPlan.paidDate,insurerDueDate:oldPlan.due,insurerPeriodStart:oldPlan.periodStart,
    postimageSha256:Object.fromEntries(documents.records.map(([col,row])=>[col,stableHash(row)])),
    rollback:{receiptBefore:null,portfolioBefore:null,receiptWasAbsent:true,
      portfolioWasAbsent:true,cobroWasAbsent:true},currentDebtCreated:0,
    noAutomaticInsurerBankReconciliation:true,createdAt:when};
}
function historicalSiblingValid(record,policy,source,snapshot){
  if(record.historicalCreationAuthoritySha256!==HISTORICAL_AUTHORITY_SHA||record.sourceManifestSha256!==SOURCE_SHA)return false;
  const raw=source.candidates.find(r=>r.candidateId===record.sourceId);
  if(!raw||!historicalSourceProved(raw))return false;
  const a=snapshot.audits.find(a=>a.id===auditId(raw.candidateId));
  if(!a||a.historicalReceiptCreated!==true||a.sourceSha256!==SOURCE_SHA||a.policyId!==policy.id||
    a.sourceId!==raw.candidateId||a.policyBeforeHash!==stableHash(policy)||
    a.historicalCreationAuthoritySha256!==HISTORICAL_AUTHORITY_SHA||!a.parentPreimage||
    typeof a.createdAt!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(a.createdAt))return false;
  const expected=historicalDocuments(raw,policy,a.createdAt);
  const row=sourceRow(raw),oldPlan={sourceId:row.id,before:a.parentPreimage,beforeHash:stableHash(a.parentPreimage),
    grossCents:row.total,netCents:row.net,paidDate:row.paid,due:row.due,periodStart:row.periodStart};
  if(a.parentPreimage?.sourceHash!==stableHash(raw)||a.parentPreimage?.policyHash!==stableHash(policy)||
    stableHash({...a,id:undefined})!==stableHash(historicalAudit(raw,policy,oldPlan,expected,a.createdAt)))return false;
  return expected.records.every(([collection,value])=>{
    const matches=snapshot.records.filter(r=>r.collection===collection&&r.id===value.id);
    if(matches.length!==1)return false;
    const actual={...matches[0]};delete actual.collection;
    return stableHash(actual)===stableHash(value);
  });
}
// Probe 45346736089 (artifact 14897739308, report SHA256
// 2b2ac19e777b1b072a33332527c3bf3fdec843fcdb0cef88c0285d32c7177ebe)
// positively identifies these pre-existing I6.5 installments. They are later
// obligations of the same edition, not the source-paid missing periods below.
// Never treat an arbitrary different fechaLimite as proof of absence.
const LEGACY_SERIES_BUNDLE='f445e2f4a20b9eb7a526bda8896472dab9e7ac4617b3c5d8124a939a0dee0e6a';
const legacyDistinctCases=Object.freeze([
 {policyId:'pol_6537ecb219275945f57fc567610c',number:'AUTO-45580',start:'2025-07-21',end:'2026-07-21',
  total:10,gross:29994,net:20000,dueOffsetDays:0,
  sourceIds:['cendoso_d5eb7e075150b2c3989782dd','cendoso_27154b0c4a2e943cf75ca38e','cendoso_07519621c141a2b7df48fddc',
   'cendoso_bdbb576b75d88b998e65263c','cendoso_8ee03ffc90c04de52d710327'],
  receipts:[['rec_hist_16212cd7ce44fe9d916493a6',10,'2026-04-21','car_hist_f08197b9ffd468b4e631bf57']]},
 {policyId:'pol_c0001022fe28c0fa04d405d4a5b8',number:'VA-53105',start:'2025-07-10',end:'2026-07-10',
  total:12,gross:33413,net:29833,dueOffsetDays:10,
  sourceIds:['cendoso_15d21b2ff0177f2c070f77fa','cendoso_b5b2c51d8a6d55a5a2ee76c7'],
  receipts:[['rec_hist_c8094f5c5d957ebb92394280',9,'2026-03-20','car_hist_81df5e9d13fb048cc5a7c7ee'],
   ['rec_hist_97584e6447b4d77693e3b2bb',10,'2026-04-20','car_hist_b71098f7943809fc28e538fd'],
   ['rec_hist_b20e2186b389ed6a2176c09e',11,'2026-05-20','car_hist_2a9bbbf32c3a2b9f3c32323a'],
   ['rec_hist_746bbd6d8c6722088a24d50f',12,'2026-06-20','car_hist_0d88f3b85f39cd4262946a7f']]}
]);
const legacyCase=(raw,policy)=>legacyDistinctCases.find(c=>c.policyId===policy.id&&c.sourceIds.includes(raw.candidateId));
function legacyDistinctSeriesProof(raw,record,policy,snapshot){
 const c=legacyCase(raw,policy),row=sourceRow(raw);
 if(!c||row.error||norm(policy.frecuencia)!=='MENSUAL'||!policyMatches(c.number,policyIdentityNumber(policy))||
  date(policy.vigenciaInicio)!==c.start||date(policy.vigenciaFin)!==c.end||row.coverageStart!==c.start||row.coverageEnd!==c.end||
  row.total!==c.gross||row.net!==c.net||norm(row.frequency)!=='MENSUAL')return false;
 const sourceOrdinal=monthlySequence(policy,row.periodStart);
 if(!Number.isInteger(sourceOrdinal)||sourceOrdinal<1||sourceOrdinal>c.total||
  (Date.parse(row.due+'T00:00:00Z')-Date.parse(row.periodStart+'T00:00:00Z'))/86400000!==c.dueOffsetDays)return false;
 const specified=c.receipts.find(([id,,,portfolio])=>record.collection==='recibosEsperados'?record.id===id:
  record.collection==='carteraPrimas'&&record.id===portfolio);
 if(!specified)return false;
 const [receiptId,ordinal,legacyDue,portfolioId]=specified;
 if(sourceOrdinal>=ordinal)return false;
 const receiptRows=snapshot.records.filter(r=>r.collection==='recibosEsperados'&&r.id===receiptId);
 const portfolioRows=snapshot.records.filter(r=>r.collection==='carteraPrimas'&&r.id===portfolioId);
 if(receiptRows.length!==1||portfolioRows.length!==1)return false;
 const expectedPeriod=new Date(c.start+'T00:00:00Z');expectedPeriod.setUTCMonth(expectedPeriod.getUTCMonth()+ordinal-1);
 const period=expectedPeriod.toISOString().slice(0,10),due=new Date(expectedPeriod.getTime()+c.dueOffsetDays*86400000).toISOString().slice(0,10);
 if(due!==legacyDue||[row.periodStart,row.due].includes(legacyDue)||row.periodStart===period)return false;
 for(const r of [...receiptRows,...portfolioRows]){
  if(r.sourceBundleSha256!==LEGACY_SERIES_BUNDLE||r.polizaId!==policy.id||str(r.policyId)&&r.policyId!==policy.id||
   r.clienteId!==policy.clienteId||str(r.clientId)&&r.clientId!==policy.clienteId||r.aseguradoraId!==policy.aseguradoraId||
   norm(r.moneda)!=='GTQ'||!policyMatches(c.number,r.polizaNumero)||
   ['numeroPoliza','policyNumber','policyNumberSource','numeroPolizaFuente'].some(k=>str(r[k])&&!policyMatches(c.number,r[k]))||
   r.serie!==ordinal+'/'+c.total||str(r.numeroReciboFuente)||date(r.fechaLimite)!==legacyDue||
   ['secuencia','numeroCuota'].some(k=>r[k]!=null&&Number(r[k])!==ordinal)||
   str(r.cuota)&&r.cuota!==ordinal+'/'+c.total||
   ['periodoInicioFuente','periodStart','receiptPeriodStart'].some(k=>str(r[k])&&date(r[k])!==period)||
   ['fechaVencimientoContractual','fechaVencimiento','vence'].some(k=>str(r[k])&&date(r[k])!==legacyDue)||
   cents(r.primaTotal)!==c.gross||['monto','montoTotal','grossAmount','amount'].some(k=>r[k]!=null&&cents(r[k])!==c.gross)||
   ['primaNeta','neta'].some(k=>r[k]!=null&&cents(r[k])!==c.net))return false;
  if(isPaid(r)||['fechaPago','paidDate','actualPaidDate','cobroId','paymentState','applicationState','directOrInferred']
   .some(k=>str(r[k]))||['conciliado','conciliadoPago','inferredPaid','reportedPaid','confirmado'].some(k=>str(r[k])&&r[k]!==false))return false;
  if(r.collection==='carteraPrimas'&&(r.reciboId!==receiptId||['receiptId','reciboEsperadoId'].some(k=>str(r[k])&&r[k]!==receiptId)))return false;
  if(r.collection==='recibosEsperados'&&['reciboId','receiptId','reciboEsperadoId'].some(k=>str(r[k])&&r[k]!==receiptId))return false;
 }
 return true;
}
function historicalAbsence(raw,policy,source,snapshot){
  if(!snapshot?.complete||snapshot.sourceSha256!==SOURCE_SHA||!Array.isArray(snapshot.policies)||!Array.isArray(snapshot.insurers))
    return 'HISTORICAL_COMPLETE_CENSUS_REQUIRED';
  const row=sourceRow(raw),ids=historicalIdentity(raw,policy);
  const dateFields=['periodoInicioFuente','periodStart','receiptPeriodStart','fechaVencimientoContractual',
    'vence','fechaVencimiento','fechaLimite'];
  const amountFields=['primaTotal','monto','montoTotal','grossAmount','amount'];
  const paymentDateFields=['fechaPago','paidDate','actualPaidDate'];
  const numberFields=['polizaNumero','numeroPoliza','policyNumber','policyNumberSource','numeroPolizaFuente'];
  const evidenceFields=['sourceId','sourceRef','evidenceId','sourceCandidateId'];
  const receipts=new Map(snapshot.records.filter(r=>r.collection==='recibosEsperados').map(r=>[r.id,r]));
  const policies=new Map(snapshot.policies.map(p=>[p.id,p]));
  for(const r of snapshot.records){
    const parents=[r.polizaId,r.policyId].map(str).filter(Boolean);
    const linked=[r.reciboId,r.receiptId].map(str).filter(Boolean);
    const inherited=linked.flatMap(id=>{const p=receipts.get(id);return p?[p.polizaId,p.policyId].map(str).filter(Boolean):[];});
    const client=[r.clienteId,r.clientId].map(str).filter(Boolean);
    const own=parents.includes(policy.id)||inherited.includes(policy.id);
    const identityHit=evidenceFields.some(k=>str(r[k])===row.id)||
      str(r.historicalNaturalKey)===ids.naturalKey||str(r.receiptKey)===ids.naturalKey||
      [r.id,...linked].some(id=>[ids.receiptId,ids.portfolioId,ids.cobroId].includes(id));
    const parentless=(!parents.length&&!inherited.length)||[...parents,...inherited].some(id=>!policies.has(id));
    const numberHit=numberFields.some(k=>str(r[k])&&policyMatches(row.policy,r[k]));
    const dateHit=dateFields.some(k=>[row.periodStart,row.due].includes(date(r[k])));
    const paymentDateHit=paymentDateFields.some(k=>date(r[k])===row.paid);
    const unknownPaymentDate=paymentDateFields.some(k=>r[k]!=null&&str(r[k])&&!date(r[k]));
    const amountHit=amountFields.some(k=>cents(r[k])===row.total);
    // Unanchored rows with the same dated gross remain ambiguous even without
    // client/name fields. A client reference alone never establishes absence.
    const otherEdition=parents.length&&parents.every(id=>{
      const p=policies.get(id);return p&&p.id!==policy.id&&date(p.vigenciaInicio)&&date(p.vigenciaFin)&&
        (row.periodStart<date(p.vigenciaInicio)||row.periodStart>=date(p.vigenciaFin));
    });
    const incompleteClientOrphan=client.includes(str(policy.clienteId))&&
      (!dateFields.some(k=>str(r[k]))||!amountFields.some(k=>r[k]!=null));
    const orphan=(numberHit&&!otherEdition)||(parentless&&
      (((dateHit||paymentDateHit||unknownPaymentDate)&&amountHit)||incompleteClientOrphan));
    if(!own&&!identityHit&&!orphan)continue;
    if(identityHit)return 'HISTORICAL_EXISTING_NATURAL_KEY_OR_EVIDENCE';
    if(own&&parents.every(id=>id===policy.id)&&inherited.every(id=>id===policy.id)&&
      r.sourceId!==row.id&&date(r.periodoInicioFuente)!==row.periodStart&&
      historicalSiblingValid(r,policy,source,snapshot))continue;
    if(own&&parents.every(id=>id===policy.id)&&inherited.every(id=>id===policy.id)&&
      legacyDistinctSeriesProof(raw,r,policy,snapshot))continue;
    return own?'HISTORICAL_EXISTING_POLICY_FINANCIAL_RECORD':'HISTORICAL_ORPHAN_OR_ALIAS_AMBIGUITY';
  }
  return '';
}
function assessHistorical(raw,groups,source,snapshot){
  if(!historicalSourceProved(raw))return {code:'HISTORICAL_PAIRED_SCHEDULE_AND_PAID_PROOF_REQUIRED'};
  if(!snapshot?.complete||snapshot.sourceSha256!==SOURCE_SHA||!Array.isArray(snapshot.policies)||!Array.isArray(snapshot.insurers))
    return {code:'HISTORICAL_COMPLETE_CENSUS_REQUIRED'};
  const row=sourceRow(raw),matches=(groups||[]).filter(g=>policyMatches(row.policy,policyIdentityNumber(g.policy))&&
    date(g.policy.vigenciaInicio)===row.coverageStart&&date(g.policy.vigenciaFin)===row.coverageEnd&&
    policyCountry(g.policy)==='GT'&&norm(g.policy.moneda)==='GTQ'&&insurerMatches(row.insurer,g.insurerName));
  if(matches.length!==1)return {code:'HISTORICAL_EXACT_EDITION_NOT_UNIQUE'};
  const g=matches[0],p=g.policy;
  const insurers=new Map(snapshot.insurers.map(a=>[a.id,a]));
  const globalEditions=snapshot.policies.filter(candidate=>
    policyNumberFields.some(field=>policyMatches(row.policy,candidate[field]))&&
    date(candidate.vigenciaInicio)===row.coverageStart&&date(candidate.vigenciaFin)===row.coverageEnd&&
    policyCountry(candidate)==='GT'&&norm(candidate.moneda)==='GTQ'&&
    (candidate.aseguradoraId===p.aseguradoraId||!insurers.has(candidate.aseguradoraId)||
      insurerMatches(row.insurer,insurers.get(candidate.aseguradoraId).nombre||insurers.get(candidate.aseguradoraId).razonSocial)));
  if(globalEditions.length!==1||globalEditions[0].id!==p.id||!policyIdentityNumber(globalEditions[0]))
    return {code:'HISTORICAL_GLOBAL_POLICY_EDITION_NOT_UNIQUE'};
  if(!g.clientExists||!g.insurerVerified||!str(p.clienteId)||!str(p.aseguradoraId)||
    !/^[a-f0-9]{64}$/.test(g.clientSnapshotHash||'')||!/^[a-f0-9]{64}$/.test(g.insurerSnapshotHash||''))
    return {code:'HISTORICAL_PARENT_PREIMAGE_UNVERIFIED'};
  const collision=source.candidates.filter(other=>{const x=sourceRow(other);return !x.error&&
    policyMatches(x.policy,policyIdentityNumber(p))&&insurerMatches(x.insurer,g.insurerName)&&
    x.coverageStart===row.coverageStart&&x.coverageEnd===row.coverageEnd&&x.periodStart===row.periodStart;});
  if(collision.length!==1)return {code:'HISTORICAL_SOURCE_PERIOD_NOT_UNIQUE'};
  const reason=historicalAbsence(raw,p,source,snapshot);if(reason)return {code:reason};
  const ids=historicalIdentity(raw,p),before={policyHash:stableHash(p),
    clientHash:g.clientSnapshotHash,insurerHash:g.insurerSnapshotHash,sourceHash:stableHash(raw),
    historicalAuthoritySha256:HISTORICAL_AUTHORITY_SHA,absence:'COMPLETE_FINANCIAL_CENSUS_NO_TARGET_OR_ORPHAN'};
  const distinct=snapshot.records.filter(r=>legacyDistinctSeriesProof(raw,r,p,snapshot));
  if(distinct.length)before.existingDistinctInstallments=distinct.map(r=>({collection:r.collection,id:r.id,
    documentSha256:stableHash({...r,collection:undefined})})).sort((a,b)=>(a.collection+'|'+a.id).localeCompare(b.collection+'|'+b.id));
  return {ready:{sourceId:row.id,policyId:p.id,clientId:p.clienteId,insurerId:p.aseguradoraId,
    receiptId:ids.receiptId,portfolioId:ids.portfolioId,cobroId:ids.cobroId,naturalKey:ids.naturalKey,
    policyNumber:canonicalPolicyNumber(row.policy),insurer:row.insurer,
    paidDate:row.paid,periodStart:row.periodStart,due:row.due,grossCents:row.total,netCents:row.net,
    creatingReceipt:true,creatingPortfolio:true,backfill:false,before,beforeHash:stableHash(before),
    sourceRowsSha256:sha(JSON.stringify(row.sourceRows)),match:'PAIRED_SCHEDULE_AND_ACTUAL_PAID_MISSING_HISTORICAL_RECEIPT'}};
}
function planBatch(source,groups,historicalSnapshot){
  const by=new Map();for(const g of groups){
    // Conflicting aliases remain discoverable so assess can isolate the row
    // explicitly; they never become an eligible payment through a first match.
    for(const key of [...new Set(policyNumberFields.flatMap(field=>policyLookupVariants(g.policy[field])))].filter(Boolean)){
      const canonical=canonicalPolicyNumber(key);
      if(!by.has(canonical))by.set(canonical,[]);
      by.get(canonical).push(g);
    }
  }
  const ready=[],holds=[],byTarget=new Map();
  for(const raw of source.candidates){
    const row=sourceRow(raw),related=[...new Set(policyLookupVariants(row.policy)
      .flatMap(key=>by.get(canonicalPolicyNumber(key))||[]))];
    let m=assess(row,related);
    if(m.code==='RECEIPT_PERIOD_OR_DUE_NOT_FOUND'&&historicalSnapshot&&
      related.some(g=>!g.receipts.length&&!g.portfolio.length&&!g.cobros.length||legacyCase(raw,g.policy)))
      m=assessHistorical(raw,related,source,historicalSnapshot);
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
// Private read-only evidence for the next deterministic delta. Expose no
// customer names, contacts, credentials or unrelated records, and never derive
// eligibility from these explanations. The protected plan remains assess().
function heldPolicyDiagnostics(source,groups,holds){
  const inspect=new Set(['POLICY_NUMBER_NOT_FOUND','EXACT_POLICY_EDITION_NOT_FOUND',
    'POLICY_NUMBER_FIELDS_CONFLICT','RECEIPT_PERIOD_OR_DUE_NOT_FOUND',
    'MULTIPLE_POLICY_EDITIONS','MULTIPLE_RECEIPTS_FOR_PERIOD_OR_AMOUNT',
    'NET_PREMIUM_CHANGED_REQUIRES_COMMISSION_RECOMPUTE']);
  const reasons=new Map(holds.filter(h=>inspect.has(h.reason)).map(h=>[h.sourceId,h.reason]));
  const byPolicy=new Map();
  for(const raw of source.candidates){
    if(!reasons.has(raw.candidateId))continue;
    const row=sourceRow(raw),key=[row.insurer,row.policy,row.coverageStart,row.coverageEnd].join('|');
    if(!byPolicy.has(key))byPolicy.set(key,{sourcePolicy:row.policy,sourceInsurer:row.insurer,
      sourceTerm:[row.coverageStart,row.coverageEnd],sourceRows:[],editions:groups.filter(g=>
        policyNumberFields.some(f=>policyMatches(row.policy,g.policy[f]))).map(g=>({
        policyId:g.policy.id,policyNumbers:Object.fromEntries(policyNumberFields.filter(f=>str(g.policy[f])).map(f=>[f,str(g.policy[f])])),
        numberFieldsConflict:!policyIdentityNumber(g.policy),country:policyCountry(g.policy),
        currency:norm(g.policy.moneda),term:[date(g.policy.vigenciaInicio),date(g.policy.vigenciaFin)],
        frequency:str(g.policy.frecuencia),clientExists:g.clientExists===true,
        insurerVerified:g.insurerVerified===true,insurerMatches:insurerMatches(row.insurer,g.insurerName),
        receiptCount:g.receipts.length,portfolioCount:g.portfolio.length,cobroCount:g.cobros.length,
        receipts:g.receipts.map(r=>({...receiptIdentity(r),
          sequence:r.secuencia??null,installment:r.numeroCuota??null,quota:str(r.cuota),
          portfolioLinks:g.portfolio.filter(c=>str(c.reciboId)===str(r.id)).length,
          cobroLinks:g.cobros.filter(c=>str(c.reciboId)===str(r.id)).length}))
      }))});
    byPolicy.get(key).sourceRows.push({sourceId:row.id,reason:reasons.get(row.id),
      periodStart:row.periodStart,due:row.due,paid:row.paid,grossCents:row.total,netCents:row.net});
  }
  return [...byPolicy.values()];
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
      !policyMatches(oldPlan.policyNumber,policyIdentityNumber(p))||
      date(p.vigenciaInicio)!==sourceRow(row).coverageStart||date(p.vigenciaFin)!==sourceRow(row).coverageEnd||
      policyCountry(p)!=='GT'||norm(p.moneda)!=='GTQ'||
      (!oldPlan.backfill&&(isPaid(r)||isPaid(c)))||
      (oldPlan.backfill&&!isPaid(r)&&!isPaid(c))||
      [r,c].some(x=>x.conciliado===true||/^APPLIED_/.test(str(x.applicationState)))||
      [r,c].some(x=>date(x.fechaPago||x.paidDate)&&date(x.fechaPago||x.paidDate)!==oldPlan.paidDate)||
      !/^[a-f0-9]{64}$/.test(oldPlan.beforeHash))throw Error('POLICY_RECEIPT_PREIMAGE_CHANGED');
    if(oldPlan.match.startsWith('LEGACY_INSURER_LIMIT_EXACT_SOURCE_PERIOD')&&
      !legacyLimitMatchesSourcePeriod(sourceRow(row),r))
      throw Error('LEGACY_INSURER_LIMIT_PREIMAGE_CHANGED');
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
// Four creates per historical obligation. Keep the complete-census CAS atomic
// in subchunks below Firestore's write ceiling; all reads precede all writes.
// A held row is isolated before writes and cannot authorize another row.
async function applyHistoricalChunk(db,plans,source){
  assert.ok(plans.length>0&&plans.length<=HISTORICAL_CHUNK,'HISTORICAL_CHUNK_LIMIT');
  const bySource=new Map(source.candidates.map(r=>[r.candidateId,r]));
  const result=await db.runTransaction(async tx=>{
    const snapshot=await readHistoricalSnapshot(db,source,tx),accepted=[],holds=[],writes=[];
    const parentRefs=new Map();for(const p of plans){
      for(const [col,id]of [['polizas',p.policyId],['clientes',p.clientId],['aseguradoras',p.insurerId]])
        parentRefs.set(col+'|'+id,item(db,col).doc(id));
    }
    const parentEntries=[...parentRefs],parentSnaps=new Map();
    for(let i=0;i<parentEntries.length;i+=100){
      const found=await tx.getAll(...parentEntries.slice(i,i+100).map(([,ref])=>ref));
      found.forEach((s,j)=>parentSnaps.set(parentEntries[i+j][0],s));
    }
    for(const oldPlan of plans){
      const raw=bySource.get(oldPlan.sourceId);
      const ps=parentSnaps.get('polizas|'+oldPlan.policyId),cs=parentSnaps.get('clientes|'+oldPlan.clientId),
        ins=parentSnaps.get('aseguradoras|'+oldPlan.insurerId);
      if(!raw||!historicalSourceProved(raw)||![ps,cs,ins].every(s=>s?.exists)){
        holds.push({sourceId:oldPlan.sourceId,reason:'HISTORICAL_SOURCE_OR_PARENT_CHANGED'});continue;
      }
      const p={...ps.data(),id:ps.id},client={...cs.data(),id:cs.id},insurer={...ins.data(),id:ins.id};
      const sameParents=p.clienteId===oldPlan.clientId&&p.aseguradoraId===oldPlan.insurerId&&
        stableHash(p)===oldPlan.before?.policyHash&&stableHash(client)===oldPlan.before?.clientHash&&
        stableHash(insurer)===oldPlan.before?.insurerHash;
      if(!sameParents){holds.push({sourceId:oldPlan.sourceId,reason:'HISTORICAL_PARENT_CAS_CHANGED'});continue;}
      const g={policy:p,clientExists:true,insurerVerified:insurer.activo!==false,
        clientSnapshotHash:stableHash(client),insurerSnapshotHash:stableHash(insurer),
        insurerName:str(insurer.nombre||insurer.razonSocial),receipts:[],portfolio:[],cobros:[]};
      const previous=snapshot.audits.find(a=>a.id===auditId(oldPlan.sourceId));
      if(previous){
        const documents=historicalDocuments(raw,p,previous.createdAt);
        const ownKeys=new Set(documents.records.map(([col,row])=>col+'|'+row.id));
        const withoutOwn={...snapshot,records:snapshot.records.filter(r=>!ownKeys.has(r.collection+'|'+r.id))};
        const replayPlan=assessHistorical(raw,[g],source,withoutOwn);
        const receipt=snapshot.records.find(r=>r.collection==='recibosEsperados'&&r.id===oldPlan.receiptId);
        if(previous.sourceId!==oldPlan.sourceId||previous.policyId!==oldPlan.policyId||
          previous.oldPlanHash!==oldPlan.beforeHash||!receipt||!historicalSiblingValid(receipt,p,source,snapshot)||
          !replayPlan.ready||stableHash(replayPlan.ready)!==stableHash(oldPlan)||
          stableHash({...previous,id:undefined})!==stableHash(historicalAudit(raw,p,oldPlan,documents,previous.createdAt))){
          holds.push({sourceId:oldPlan.sourceId,reason:'HISTORICAL_REPLAY_POSTIMAGE_HOLD'});continue;
        }
        accepted.push({oldPlan,policy:p,documents,audit:previous,replay:true});continue;
      }
      const fresh=assessHistorical(raw,[g],source,snapshot);
      if(!fresh.ready||stableHash(fresh.ready)!==stableHash(oldPlan)){
        holds.push({sourceId:oldPlan.sourceId,reason:fresh.code||'HISTORICAL_PLAN_CAS_CHANGED'});continue;
      }
      // Unique period is checked over the entire source, independently of chunk
      // ordering. No same-period candidate can escape through another ID.
      const when=new Date().toISOString(),documents=historicalDocuments(raw,p,when);
      const audit=historicalAudit(raw,p,oldPlan,documents,when);
      for(const [col,row]of documents.records)writes.push([item(db,col).doc(row.id),row]);
      writes.push([request(db,auditId(oldPlan.sourceId)),audit]);
      accepted.push({oldPlan,policy:p,documents,audit,replay:false});
    }
    assert.ok(writes.length<=HISTORICAL_CHUNK*4,'HISTORICAL_WRITE_LIMIT');
    for(const [ref,value]of writes)tx.create(ref,value);
    return {accepted,holds};
  });
  const accepted=[],holds=[...result.holds];
  for(const outcome of result.accepted){
    const {oldPlan,documents,audit}=outcome;
    const refs=documents.records.map(([col,row])=>item(db,col).doc(row.id));
    let actual;
    try{actual=await db.getAll(...refs,request(db,auditId(oldPlan.sourceId)),item(db,'polizas').doc(oldPlan.policyId));}
    catch(e){holds.push({sourceId:oldPlan.sourceId,reason:'HISTORICAL_POSTIMAGE_READBACK_UNAVAILABLE',
      commitOutcome:outcome.replay?'PREVIOUSLY_COMMITTED':'COMMITTED_PENDING_READBACK'});continue;}
    const exact=actual.every(s=>s.exists)&&documents.records.every(([,row],i)=>stableHash(actual[i].data())===stableHash(row))&&
      stableHash({...actual[3].data(),id:undefined})===stableHash({...audit,id:undefined})&&
      stableHash({...actual[4].data(),id:actual[4].id})===oldPlan.before.policyHash;
    if(!exact){holds.push({sourceId:oldPlan.sourceId,reason:'HISTORICAL_POSTIMAGE_READBACK_HOLD',
      commitOutcome:outcome.replay?'PREVIOUSLY_COMMITTED':'COMMITTED_PENDING_READBACK'});continue;}
    accepted.push({sourceId:oldPlan.sourceId,status:outcome.replay?'ALREADY_APPLIED_READBACK_PASS':'APPLIED_READBACK_PASS',
      receiptCreated:!outcome.replay,historicalPaidOnly:true,currentDebtCreated:0});
  }
  const committedCount=result.accepted.filter(r=>!r.replay).length;
  return {accepted,holds,committedCount,physicalDocumentCreates:committedCount*4,
    committedUnverified:holds.filter(r=>r.commitOutcome==='COMMITTED_PENDING_READBACK').map(r=>r.sourceId)};
}
// Existing protected Cendoso executor: explicit manual application of already
// registered DIRECT payments. This path never creates a payment or represents
// Direction's instruction as insurer/bank/invoice evidence.
const APPLICATION_DECISION='DIRECTION_I66_COMPLETE_APPLICATION_GLOBAL_TOLERANCE_DIRECT_RENEWAL_20261124';
const APPLICATION_AUTHORITY='artifacts/orbit360-recovery/release-control/I6_6_DIRECTION_URGENT_COMPLETION_TOLERANCE_AND_DIRECT_RENEWAL_20261124.json';
const APPLICATION_AUTHORITY_SHA='cda5d408666e6e959248ea0a08ffa13f9e05a695fe41b3dedee20ba3d93f7c3d';
const APPLICATION_TARGETS='artifacts/orbit360-recovery/source-batches/I6_6_CENDOSO_155_EXISTING_DIRECT_APPLICATION_TARGETS_20261124.json';
const APPLICATION_TARGETS_SHA='8619d7953c05b7a82eeb0c837796064bc8e46fe5bc12c051345f3e5152a2ec66';
const applicationAuditId=sourceId=>'gi_i66_direct_application_'+sha(`${TENANT}|${APPLICATION_DECISION}|${sourceId}`).slice(0,30);
const applicationKey=(collection,id)=>collection+'/'+id;
function loadApplicationBinding(source){
  const aBytes=fs.readFileSync(path.join(__dirname,'..',APPLICATION_AUTHORITY));
  const mBytes=fs.readFileSync(path.join(__dirname,'..',APPLICATION_TARGETS));
  assert.equal(sha(aBytes),APPLICATION_AUTHORITY_SHA,'APPLICATION_AUTHORITY_BYTES_CHANGED');
  assert.equal(sha(mBytes),APPLICATION_TARGETS_SHA,'APPLICATION_TARGET_BYTES_CHANGED');
  const decision=JSON.parse(aBytes),manifest=JSON.parse(mBytes);
  assert.equal(decision.schema,'GI_I66_DIRECTION_URGENT_COMPLETION_DECISION_V1');
  assert.equal(decision.decisionId,APPLICATION_DECISION);assert.equal(decision.gate,'I6.6');
  assert.equal(decision.authority,'DIRECT_USER_INSTRUCTION_IN_CURRENT_CONVERSATION');
  assert.equal(decision.decisions.completePendingApplicationThroughCanonicalWriter,true);
  assert.equal(decision.preservedBoundaries.noInventedPaymentsOrBankTransfers,true);
  assert.equal(decision.preservedBoundaries.exactPaymentAndObligationIdentityRequired,true);
  assert.equal(manifest.schema,'GI_I66_EXISTING_DIRECT_APPLICATION_TARGETS_V1');
  assert.equal(manifest.decisionId,APPLICATION_DECISION);assert.equal(manifest.authoritySha256,APPLICATION_AUTHORITY_SHA);
  assert.equal(manifest.authorityPath,APPLICATION_AUTHORITY);assert.equal(manifest.sourcePath,SOURCE);
  assert.equal(manifest.sourceSha256,SOURCE_SHA);assert.equal(manifest.projectId,PROJECT);assert.equal(manifest.tenantId,TENANT);
  assert.equal(manifest.country,'GT');assert.equal(manifest.currency,'GTQ');assert.equal(manifest.targetCount,155);
  assert.equal(manifest.targets.length,155);assert.equal(manifest.registeredGrossCents,7880643);
  for(const field of ['sourceId','receiptId','portfolioId','cobroId'])assert.equal(new Set(manifest.targets.map(t=>t[field])).size,155,'APPLICATION_DUPLICATE_TARGET_'+field);
  assert.equal(manifest.targets.reduce((sum,t)=>sum+t.grossCents,0),7880643);
  for(const target of manifest.targets){
    const raw=source.candidates.find(r=>r.candidateId===target.sourceId),row=raw&&sourceRow(raw);
    assert.ok(row&&!row.error,'APPLICATION_SOURCE_MISSING');
    assert.equal(row.total,target.grossCents);assert.equal(row.paid,target.paidDate);
    assert.equal(row.periodStart,target.periodStart);assert.equal(row.due,target.due);
    assert.equal(objhash(row.sourceRows),target.sourceRowsSha256);assert.equal(target.cobroId,cobroId(target.receiptId));
    assert.equal(target.originalPostingAuditId,auditId(target.sourceId));
  }
  return {manifest,authoritySha256:APPLICATION_AUTHORITY_SHA,manifestSha256:APPLICATION_TARGETS_SHA};
}
async function readApplicationSnapshot(db,source,binding,tx){
  const snapshot=await readHistoricalSnapshot(db,source,tx),getAll=(...refs)=>tx?tx.getAll(...refs):db.getAll(...refs);
  snapshot.rawByPath={};snapshot.updateTimes={};snapshot.applicationAudits=[];snapshot.clients=[];
  const refs=binding.manifest.targets.flatMap(t=>[
    ['recibosEsperados',t.receiptId],['carteraPrimas',t.portfolioId],['cobros',t.cobroId]
  ]);
  for(let i=0;i<refs.length;i+=100){
    const group=refs.slice(i,i+100),found=await getAll(...group.map(([col,id])=>item(db,col).doc(id)));
    found.forEach((s,n)=>{if(s.exists){const key=applicationKey(...group[n]);snapshot.rawByPath[key]=s.data();
      assert.ok(s.updateTime,'APPLICATION_UPDATE_TIME_REQUIRED');snapshot.updateTimes[key]=stableValue(s.updateTime);}});
  }
  const audits=binding.manifest.targets.map(t=>request(db,applicationAuditId(t.sourceId)));
  for(let i=0;i<audits.length;i+=100){const rows=await getAll(...audits.slice(i,i+100));
    snapshot.applicationAudits.push(...rows.filter(s=>s.exists).map(s=>({...s.data(),id:s.id})));}
  const policyIds=new Set(binding.manifest.targets.map(t=>t.policyId));
  const clientIds=[...new Set(snapshot.policies.filter(p=>policyIds.has(p.id)).map(p=>str(p.clienteId)).filter(Boolean))];
  for(let i=0;i<clientIds.length;i+=100){const rows=await getAll(...clientIds.slice(i,i+100).map(id=>item(db,'clientes').doc(id)));
    snapshot.clients.push(...rows.filter(s=>s.exists).map(s=>({...s.data(),id:s.id})));}
  return snapshot;
}
function assessApplication(target,source,snapshot,binding){
  const hold=code=>({hold:{sourceId:target.sourceId,receiptId:target.receiptId,code}});
  if(snapshot.complete!==true||snapshot.sourceSha256!==SOURCE_SHA)return hold('APPLICATION_INCOMPLETE_SNAPSHOT');
  const canonical=binding.manifest.targets.find(t=>t.sourceId===target.sourceId);
  if(!canonical||stableHash(canonical)!==stableHash(target))return hold('APPLICATION_TARGET_SCOPE_CHANGED');
  const raw=source.candidates.find(r=>r.candidateId===target.sourceId),row=raw&&sourceRow(raw);
  if(!row||row.error||row.hold.length||row.currency!=='GTQ'||row.total!==target.grossCents||row.paid!==target.paidDate||
    row.periodStart!==target.periodStart||row.due!==target.due||objhash(row.sourceRows)!==target.sourceRowsSha256)return hold('APPLICATION_SOURCE_CHANGED');
  const policy=snapshot.policies.find(p=>p.id===target.policyId),client=policy&&snapshot.clients.find(c=>c.id===policy.clienteId),
    insurer=policy&&snapshot.insurers.find(i=>i.id===policy.aseguradoraId);
  const parentChecks={policyExists:!!policy,clientExists:!!client,insurerExists:!!insurer,
    policyCountryMatches:!!policy&&policyCountry(policy)==='GT',policyCurrencyMatches:!!policy&&norm(policy.moneda)==='GTQ',
    clientTenantMatches:!!client&&(!client.tenantId||client.tenantId===TENANT),
    clientCountryMatches:!!client&&(!client.pais||['GT','GUATEMALA'].includes(norm(client.pais))),
    policyNumberMatches:!!policy&&policyMatches(row.policy,policyIdentityNumber(policy)),
    termStartMatches:!!policy&&date(policy.vigenciaInicio)===row.coverageStart,
    termEndMatches:!!policy&&date(policy.vigenciaFin)===row.coverageEnd,
    insurerNameMatches:!!insurer&&insurerMatches(row.insurer,insurer.nombre||insurer.razonSocial),
    clientIdMatches:!!client&&(!target.clientId||target.clientId===client.id),
    insurerIdMatches:!!insurer&&(!target.insurerId||target.insurerId===insurer.id)};
  if(Object.values(parentChecks).some(value=>!value))return {hold:{...hold('APPLICATION_PARENT_IDENTITY_CHANGED').hold,
    failedChecks:Object.keys(parentChecks).filter(key=>!parentChecks[key]),
    actualCountries:{policy:policy?policyCountry(policy):null,client:client?norm(client.pais):null}}};
  const insurers=new Map(snapshot.insurers.map(i=>[i.id,i]));
  const peers=snapshot.policies.filter(p=>policyCountry(p)==='GT'&&norm(p.moneda)==='GTQ'&&
    policyNumberFields.some(field=>policyMatches(row.policy,p[field]))&&date(p.vigenciaInicio)===row.coverageStart&&date(p.vigenciaFin)===row.coverageEnd&&
    (p.aseguradoraId===policy.aseguradoraId||!insurers.has(p.aseguradoraId)||
      insurerMatches(row.insurer,insurers.get(p.aseguradoraId).nombre||insurers.get(p.aseguradoraId).razonSocial)));
  if(peers.length!==1)return hold('APPLICATION_POLICY_EDITION_NOT_UNIQUE');
  const roots=[['recibosEsperados',target.receiptId],['carteraPrimas',target.portfolioId],['cobros',target.cobroId]],records={};
  for(const [collection,id] of roots){
    const key=applicationKey(collection,id),record=snapshot.rawByPath[key];
    if(!record||!snapshot.updateTimes[key])return hold('APPLICATION_EXISTING_RECORD_REQUIRED');
    const related=snapshot.records.filter(r=>r.collection===collection&&(r.id===id||
      ['reciboId','receiptId','expectedReceiptId'].some(k=>str(r[k])===target.receiptId)||
      ['sourceId','evidenceId','sourceRef'].some(k=>str(r[k])===target.sourceId)));
    if(related.length!==1||related[0].id!==id)return hold('APPLICATION_DUPLICATE_LINK_OR_SOURCE');
    if((record.tenantId&&record.tenantId!==TENANT)||str(record.polizaId)!==policy.id||(collection!=='recibosEsperados'&&str(record.reciboId)!==target.receiptId)||
      ['policyId'].some(k=>record[k]&&str(record[k])!==policy.id)||
      ['clienteId','clientId'].some(k=>record[k]&&str(record[k])!==client.id)||
      ['aseguradoraId','insurerId'].some(k=>record[k]&&str(record[k])!==insurer.id)||
      (record.moneda&&norm(record.moneda)!=='GTQ')||(record.pais&&!['GT','GUATEMALA'].includes(norm(record.pais))))return hold('APPLICATION_FINANCIAL_IDENTITY_CHANGED');
    if(record.paymentState!=='PAID_DIRECT'||record.directOrInferred!=='DIRECT'||record.paymentOrigin!=='CRM_MIGRATED_DIRECT_PAYMENT'||
      record.paymentEvidenceType!=='LEGACY_CENDOSO_FECHA_REAL_PAGADO'||record.inferredPaid===true)return hold('APPLICATION_NOT_ORIGINAL_DIRECT_PAYMENT');
    if(!['PENDING_APPLICATION','APPLIED_DIRECT'].includes(record.applicationState)||
      record.conciliado!==(record.applicationState==='APPLIED_DIRECT'))return hold('APPLICATION_STATE_CONFLICT');
    if(['reversal','reversed','paymentReversed','partialPayment'].some(k=>record[k]===true)||
      ['reversedAt','reversalId','paymentReversalId'].some(k=>str(record[k]))||
      ['estado','estadoOperativo','paymentState'].some(k=>/REVERS|ANULAD|PARCIAL|PARTIAL/i.test(str(record[k]))))return hold('APPLICATION_REVERSAL_OR_PARTIAL_HOLD');
    const moneyFields=['primaTotal','monto','montoTotal'].filter(k=>record[k]!==undefined&&record[k]!==null&&record[k]!=='');
    if(!moneyFields.length||moneyFields.some(k=>cents(record[k])!==target.grossCents))return hold('APPLICATION_AMOUNT_CHANGED');
    const dates=['paidDate','fechaPago'].map(k=>str(record[k])).filter(Boolean);
    if(!dates.length||dates.some(v=>v!==target.paidDate))return hold('APPLICATION_PAID_DATE_CHANGED');
    if(str(record.evidenceId)!==target.sourceId||str(record.sourceRef)!==target.sourceId)return hold('APPLICATION_ORIGINAL_SOURCE_CHANGED');
    records[key]=record;
  }
  const original=snapshot.audits.find(a=>a.id===target.originalPostingAuditId);
  if(!original||original.schema!=='I6_6_PROTECTED_CENDOSO_PAID_V1'||original.sourceId!==target.sourceId||original.sourceSha256!==SOURCE_SHA||
    original.policyId!==policy.id||original.receiptId!==target.receiptId||original.portfolioId!==target.portfolioId||original.cobroId!==target.cobroId||
    original.newGrossCents!==target.grossCents||original.paidDate!==target.paidDate)return hold('APPLICATION_ORIGINAL_POSTING_AUDIT_REQUIRED');
  const hashes=Object.fromEntries(Object.entries(records).map(([key,value])=>[key,stableHash(value)]));
  const audit=snapshot.applicationAudits.find(a=>a.id===applicationAuditId(target.sourceId));
  if(audit){
    if(audit.schema!=='GI_I66_MANUAL_EXISTING_DIRECT_APPLICATION_V1'||audit.decisionId!==APPLICATION_DECISION||
      audit.authoritySha256!==binding.authoritySha256||audit.manifestSha256!==binding.manifestSha256||
      audit.sourceId!==target.sourceId||audit.receiptId!==target.receiptId||audit.portfolioId!==target.portfolioId||audit.cobroId!==target.cobroId)
      return hold('APPLICATION_AUDIT_COLLISION');
    if(stableHash(audit.afterHashes)!==stableHash(hashes)||!Object.values(records).every(r=>r.applicationState==='APPLIED_DIRECT'))
      return hold('APPLICATION_REPLAY_POSTIMAGE_CHANGED');
    return {unchanged:{sourceId:target.sourceId,status:'ALREADY_APPLIED_READBACK_PASS',newPayments:0}};
  }
  if(Object.values(records).every(r=>r.applicationState==='APPLIED_DIRECT'))return {unchanged:{sourceId:target.sourceId,status:'ALREADY_APPLIED_PRESERVED',newPayments:0}};
  const updateTimes=Object.fromEntries(roots.map(([col,id])=>{const key=applicationKey(col,id);return [key,snapshot.updateTimes[key]];}));
  const before={records,updateTimes,policyHash:stableHash(policy),clientHash:stableHash(client),insurerHash:stableHash(insurer),originalAuditHash:stableHash(original)};
  return {ready:{...target,before,beforeHash:stableHash(before),applicationAuditId:applicationAuditId(target.sourceId),
    collectionsToUpdate:roots.filter(([col,id])=>records[applicationKey(col,id)].applicationState==='PENDING_APPLICATION').map(([col])=>col)}};
}
function planApplications(source,snapshot,binding){
  const ready=[],unchanged=[],holds=[];
  for(const target of binding.manifest.targets){const result=assessApplication(target,source,snapshot,binding);
    if(result.ready)ready.push(result.ready);else if(result.unchanged)unchanged.push(result.unchanged);else holds.push(result.hold);}
  return {schema:'GI_I66_EXISTING_DIRECT_APPLICATION_PLAN_V1',status:'READONLY_APPLICATION_PREFLIGHT_NO_WRITES',writes:0,
    sourceSha256:SOURCE_SHA,authoritySha256:binding.authoritySha256,manifestSha256:binding.manifestSha256,
    inputCount:binding.manifest.targets.length,readyCount:ready.length,unchangedCount:unchanged.length,holdsCount:holds.length,
    readyGrossCents:ready.reduce((n,r)=>n+r.grossCents,0),ready,unchanged,holds,newPayments:0,bankMovements:0,createdAt:new Date().toISOString()};
}
function applicationPatch(when,binding){return {applicationState:'APPLIED_DIRECT',conciliado:true,
  applicationEvidenceType:'MANUAL_RECONCILIATION',applicationAuthorityDecisionId:APPLICATION_DECISION,
  applicationAuthorityPath:APPLICATION_AUTHORITY,applicationAuthoritySha256:binding.authoritySha256,
  manualApplicationAt:when,reconciledAt:when,updatedAt:when,updatedByUid:'I6_6_PROTECTED_SOURCE_RUNNER'};}
async function applyApplicationChunk(db,plans,source,binding){
  assert.ok(plans.length>0&&plans.length<=HISTORICAL_CHUNK,'APPLICATION_CHUNK_LIMIT');
  assert.equal(new Set(plans.map(p=>p.sourceId)).size,plans.length,'APPLICATION_DUPLICATE_PLAN');
  const result=await db.runTransaction(async tx=>{
    const snapshot=await readApplicationSnapshot(db,source,binding,tx),accepted=[],holds=[],pending=[];
    for(const oldPlan of plans){
      const target=binding.manifest.targets.find(t=>t.sourceId===oldPlan.sourceId);
      if(!target){holds.push({sourceId:oldPlan.sourceId,code:'APPLICATION_TARGET_OUT_OF_SCOPE'});continue;}
      const fresh=assessApplication(target,source,snapshot,binding);
      if(fresh.unchanged){accepted.push(fresh.unchanged);continue;}
      if(fresh.hold){holds.push(fresh.hold);continue;}
      if(fresh.ready.beforeHash!==oldPlan.beforeHash||stableHash(fresh.ready)!==stableHash(oldPlan)){
        holds.push({sourceId:oldPlan.sourceId,code:'APPLICATION_CAS_PREIMAGE_CHANGED'});continue;}
      const when=new Date().toISOString(),patch=applicationPatch(when,binding),before=fresh.ready.before.records;
      const after=Object.fromEntries(Object.entries(before).map(([key,value])=>[key,
        fresh.ready.collectionsToUpdate.includes(key.split('/')[0])?{...value,...patch}:value]));
      pending.push({plan:fresh.ready,when,before,after,patch});
    }
    // All reads and every rollback image are complete before the first write.
    for(const itemToApply of pending){const {plan,when,before,after,patch}=itemToApply;
      tx.create(request(db,plan.applicationAuditId),{schema:'GI_I66_MANUAL_EXISTING_DIRECT_APPLICATION_V1',status:'COMMITTED_PENDING_READBACK',
        decisionId:APPLICATION_DECISION,authorityPath:APPLICATION_AUTHORITY,authoritySha256:binding.authoritySha256,manifestSha256:binding.manifestSha256,
        sourceId:plan.sourceId,sourceSha256:SOURCE_SHA,originalPostingAuditId:plan.originalPostingAuditId,
        policyId:plan.policyId,receiptId:plan.receiptId,portfolioId:plan.portfolioId,cobroId:plan.cobroId,
        beforeHash:plan.beforeHash,beforeUpdateTimes:plan.before.updateTimes,rollback:{records:before,onlyIfCurrentAfterHashesMatch:true},
        beforeHashes:Object.fromEntries(Object.entries(before).map(([key,value])=>[key,stableHash(value)])),
        afterHashes:Object.fromEntries(Object.entries(after).map(([key,value])=>[key,stableHash(value)])),
        collectionsUpdated:plan.collectionsToUpdate,preservedGrossCents:plan.grossCents,preservedPaidDate:plan.paidDate,
        newPayments:0,newObligations:0,bankMovements:0,insurerReconciliationProven:false,noAutomaticInsurerBankReconciliation:true,
        applicationEvidenceType:'MANUAL_RECONCILIATION',createdAt:when});
      for(const collection of plan.collectionsToUpdate){const id=collection==='recibosEsperados'?plan.receiptId:collection==='carteraPrimas'?plan.portfolioId:plan.cobroId;
        tx.update(item(db,collection).doc(id),patch);}
    }
    return {accepted,holds,committed:pending.map(x=>x.plan)};
  });
  let fresh;const committedUnverified=[];
  try{fresh=await readApplicationSnapshot(db,source,binding);}catch(error){
    return {accepted:result.accepted,holds:[...result.holds,...result.committed.map(p=>({sourceId:p.sourceId,code:'APPLICATION_POSTCOMMIT_READBACK_UNAVAILABLE',commitOutcome:'COMMITTED_REQUIRES_REVIEW_BEFORE_RETRY'}))],
      knownCommittedApplications:result.committed.length,knownFinancialDocumentUpdates:result.committed.reduce((n,p)=>n+p.collectionsToUpdate.length,0),
      committedUnverified:result.committed.map(p=>p.sourceId),newPayments:0,bankMovements:0};
  }
  for(const plan of result.committed){const target=binding.manifest.targets.find(t=>t.sourceId===plan.sourceId),verified=assessApplication(target,source,fresh,binding);
    if(verified.unchanged?.status==='ALREADY_APPLIED_READBACK_PASS')result.accepted.push({sourceId:plan.sourceId,
      status:'APPLICATION_APPLIED_READBACK_PASS',receiptId:plan.receiptId,portfolioId:plan.portfolioId,cobroId:plan.cobroId,
      applicationAuditId:plan.applicationAuditId,grossCents:plan.grossCents,collectionsUpdated:plan.collectionsToUpdate,newPayments:0});
    else{committedUnverified.push(plan.sourceId);result.holds.push({sourceId:plan.sourceId,code:verified.hold?.code||'APPLICATION_POSTIMAGE_READBACK_HOLD',commitOutcome:'COMMITTED_REQUIRES_REVIEW_BEFORE_RETRY'});}}
  return {accepted:result.accepted,holds:result.holds,knownCommittedApplications:result.committed.length,committedUnverified,
    knownFinancialDocumentUpdates:result.committed.reduce((n,p)=>n+p.collectionsToUpdate.length,0),newPayments:0,bankMovements:0};
}
async function applicationMain(db,source,mode){
  const binding=loadApplicationBinding(source);
  if(mode==='application-preflight'){
    const plan=planApplications(source,await readApplicationSnapshot(db,source,binding),binding);
    report('GI_I66_CENDOSO_PLAN_OUT',plan);
    report('GI_I66_CENDOSO_REPORT_OUT',{...plan,ready:plan.ready.map(({before,...rest})=>rest)});
    console.log('I66_APPLICATION_PREFLIGHT targets='+plan.inputCount+' ready='+plan.readyCount+' unchanged='+plan.unchangedCount+' holds='+plan.holdsCount+' ZERO_WRITES');return;
  }
  assert.equal(mode,'application-apply');assert.equal(process.env.GITHUB_REF,'refs/heads/recovery/fase-a-clean-20260831');
  assert.equal(process.env.GITHUB_REPOSITORY,'paulaosoriof86/orbit360-core');assert.equal(process.env.GI_I66_PROTECTED_ENV,'gravicentra-live-data-writes');
  const plan=JSON.parse(fs.readFileSync(process.env.GI_I66_CENDOSO_PLAN_IN,'utf8'));
  assert.equal(plan.schema,'GI_I66_EXISTING_DIRECT_APPLICATION_PLAN_V1');assert.equal(plan.status,'READONLY_APPLICATION_PREFLIGHT_NO_WRITES');assert.equal(plan.writes,0);
  assert.equal(plan.sourceSha256,SOURCE_SHA);assert.equal(plan.authoritySha256,binding.authoritySha256);assert.equal(plan.manifestSha256,binding.manifestSha256);
  assert.equal(plan.inputCount,binding.manifest.targets.length);assert.equal(plan.readyCount,plan.ready.length);
  assert.equal(plan.holdsCount,plan.holds.length);assert.equal(plan.unchangedCount,plan.unchanged.length);
  assert.equal(plan.readyCount+plan.holdsCount+plan.unchangedCount,plan.inputCount);
  assert.equal(plan.newPayments,0);assert.equal(plan.bankMovements,0);
  assert.equal(new Set(plan.ready.map(p=>p.sourceId)).size,plan.ready.length);assert.ok(plan.ready.length>0&&plan.ready.length<=binding.manifest.targets.length);
  const accepted=[],holds=[],committedUnverified=[],attempted=new Set();let knownCommittedApplications=0,knownFinancialDocumentUpdates=0,writeOutcomeIndeterminate=false;
  for(let i=0;i<plan.ready.length;i+=HISTORICAL_CHUNK){
    const chunk=plan.ready.slice(i,i+HISTORICAL_CHUNK);chunk.forEach(p=>attempted.add(p.sourceId));
    try{const result=await applyApplicationChunk(db,plan.ready.slice(i,i+HISTORICAL_CHUNK),source,binding);
      accepted.push(...result.accepted);holds.push(...result.holds);committedUnverified.push(...result.committedUnverified);
      knownCommittedApplications+=result.knownCommittedApplications;knownFinancialDocumentUpdates+=result.knownFinancialDocumentUpdates;
      if(result.committedUnverified.length)break;
    }catch(error){writeOutcomeIndeterminate=true;holds.push({code:/^[A-Z0-9_]+$/.test(error.message)?error.message:'APPLICATION_PRIVATE_RUNTIME_ERROR',
      sourceIds:chunk.map(p=>p.sourceId),commitOutcome:'UNKNOWN_INSPECT_APPLICATION_AUDITS_BEFORE_RETRY'});break;}
  }
  const notAttempted=plan.ready.filter(r=>!attempted.has(r.sourceId)).map(r=>r.sourceId);
  const body={schema:'GI_I66_EXISTING_DIRECT_APPLICATION_RESULT_V1',status:holds.length?'PROTECTED_APPLICATION_PARTIAL_OR_HOLD':(plan.holdsCount?'PROTECTED_ELIGIBLE_APPLICATION_READBACK_PASS_WITH_ISOLATED_HOLDS':'PROTECTED_APPLICATION_READBACK_PASS'),
    decisionId:APPLICATION_DECISION,authoritySha256:binding.authoritySha256,manifestSha256:binding.manifestSha256,sourceSha256:SOURCE_SHA,
    preflightReady:plan.ready.length,preflightHeld:plan.holdsCount,preflightUnchanged:plan.unchangedCount,
    preflightHolds:plan.holds,preflightUnchangedRows:plan.unchanged,knownCommittedApplications,knownFinancialDocumentUpdates,
    verifiedApplied:accepted.filter(r=>r.status==='APPLICATION_APPLIED_READBACK_PASS').length,writeOutcomeIndeterminate,committedUnverified,
    accepted,holds,notAttempted,newPayments:0,newObligations:0,bankMovements:0,amountChangesCents:0,paidDateChanges:0,insurerReconciliationProven:false};
  report('GI_I66_CENDOSO_REPORT_OUT',body);
  console.log('I66_APPLICATION_LIVE_READBACK applied='+body.verifiedApplied+' holds='+holds.length+' newPayments=0');
  if(writeOutcomeIndeterminate||committedUnverified.length||!accepted.length)throw Error('I66_APPLICATION_READBACK_HOLD');
}

async function main(){
  const mode=str(process.env.GI_I66_CENDOSO_MODE);
  assert.ok(['preflight','apply','columna-readback','issued-readback','statement-payment-readback','application-preflight','application-apply'].includes(mode),'I66_PAID_MODE_REQUIRED');
  assert.equal(process.env.GCLOUD_PROJECT,PROJECT,'I66_PAID_FIREBASE_PROJECT_DRIFT');
  const source=loadSource();
  const admin=require('firebase-admin');
  admin.initializeApp({credential:admin.credential.applicationDefault(),projectId:PROJECT});
  const db=admin.firestore();
  if(mode==='application-preflight'||mode==='application-apply')return applicationMain(db,source,mode);
  if(mode==='statement-payment-readback'){
    const evidence=require('../artifacts/orbit360-recovery/source-batches/I6_6_UNIVERSALES_NOV16_CONFIRMED_PAYMENTS.json');
    const {policyKeys}=require('./gravicentra-i66-source-bulk-plan.cjs');
    const candidates=evidence.payments.flatMap(p=>policyKeys(p.policy,evidence.insurer).map(policyNumberSource=>({policyNumberSource})));
    const groups=await readGroups(db,{candidates});
    for(const p of evidence.payments){
      const numbers=policyKeys(p.policy,evidence.insurer);
      const terms=groups.filter(g=>numbers.includes(str(g.policy.numero))&&insurerMatches(evidence.insurer,g.insurerName)&&
        policyCountry(g.policy)==='GT'&&norm(g.policy.moneda)==='GTQ'&&date(g.policy.vigenciaInicio)<=evidence.due&&date(g.policy.vigenciaFin)>evidence.due);
      const receipts=terms.flatMap(g=>g.receipts.filter(r=>[r.numeroReciboFuente,r.numeroRequerimiento].map(str).includes(p.requirement)));
      const ordinalCandidates=terms.flatMap(g=>g.receipts.filter(r=>
        Number(r.secuencia||r.numeroCuota)===p.installment&&[r.primaTotal,r.montoTotal,r.monto].some(v=>cents(v)===p.grossCents)));
      const exactOrOrdinal=receipts.length?receipts:ordinalCandidates;
      const ids=new Set(exactOrOrdinal.map(r=>r.id));
      const cobros=terms.flatMap(g=>g.cobros.filter(c=>ids.has(c.reciboId)));
      console.log('I66_STATEMENT_PAYMENT_READBACK '+JSON.stringify({requirement:p.requirement,terms:terms.length,
        receipts:receipts.length,ordinalAndAmount:ordinalCandidates.length,receiptPaid:exactOrOrdinal.filter(isPaid).length,linkedCobros:cobros.length,
        samePayment:cobros.filter(c=>isPaid(c)&&date(c.fechaPago||c.paidDate)===p.paidDate&&cents(c.monto)===p.grossCents).length,writes:0}));
    }
    return;
  }
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
    const groups=await readGroups(db,source),snapshot=await readHistoricalSnapshot(db,source);
    const p=planBatch(source,groups,snapshot);
    report('GI_I66_CENDOSO_PLAN_OUT',p);
    report('GI_I66_CENDOSO_REPORT_OUT',{status:'READONLY_PREFLIGHT_NO_WRITES',
      sourceSha256:SOURCE_SHA,inputCount:p.inputCount,readyCount:p.readyCount,
      holdsCount:p.holdsCount,holdCounts:p.holdCounts,
      historicalReceiptCreates:p.ready.filter(r=>r.creatingReceipt).length,
      financialCensusCounts:Object.fromEntries(financialCollections.map(c=>[c,snapshot.records.filter(r=>r.collection===c).length])),
      privatePolicyDiagnostics:heldPolicyDiagnostics(source,groups,p.holds),
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
  let knownHistoricalCommits=0,writeOutcomeIndeterminate=false;
  const historicalCommitsUnverified=[];
  const existingPlans=plan.ready.filter(r=>!r.creatingReceipt),historicalPlans=plan.ready.filter(r=>r.creatingReceipt);
  for(let i=0;i<existingPlans.length;i+=MAX_CHUNK){const chunk=existingPlans.slice(i,i+MAX_CHUNK);
    for(let k=0;k<chunk.length;k+=8){
      const done=await Promise.all(chunk.slice(k,k+8).map(async r=>{
        try{return {ok:true,result:await applyOne(db,r,source)};}
        catch(e){const reason=/^[A-Z_]+$/.test(e.message)?e.message:'PRIVATE_RUNTIME_ERROR';
          const knownBeforeWrite=new Set(['SOURCE_CHANGED','AUDIT_COLLISION','PREIMAGE_MISSING_OR_COBRO_EXISTS',
            'POLICY_RECEIPT_PREIMAGE_CHANGED','LEGACY_INSURER_LIMIT_PREIMAGE_CHANGED','INSURER_PERIOD_SEQUENCE_CHANGED',
            'CAS_PREIMAGE_CHANGED','NON_UNIQUE_PAYMENT_OR_PORTFOLIO','CLIENT_OR_INSURER_CHANGED']);
          return {ok:false,sourceId:r.sourceId,reason,indeterminate:!knownBeforeWrite.has(reason)};}}));
      done.forEach(x=>{if(x.ok)accepted.push(x.result);else{
        writeOutcomeIndeterminate||=x.indeterminate;
        holds.push({sourceId:x.sourceId,reason:x.reason,commitOutcome:x.indeterminate?'UNKNOWN_VERIFY_AUDIT_BEFORE_RETRY':'NO_WRITES'});
      }});
    }
  }
  for(let i=0;i<historicalPlans.length;i+=HISTORICAL_CHUNK){
    const chunk=historicalPlans.slice(i,i+HISTORICAL_CHUNK);
    try{const out=await applyHistoricalChunk(db,chunk,source);accepted.push(...out.accepted);holds.push(...out.holds);
      knownHistoricalCommits+=out.committedCount;historicalCommitsUnverified.push(...out.committedUnverified);}
    catch(e){writeOutcomeIndeterminate=true;holds.push(...chunk.map(r=>({sourceId:r.sourceId,
      reason:/^[A-Z_]+$/.test(e.message)?e.message:'HISTORICAL_PRIVATE_RUNTIME_ERROR',
      commitOutcome:'UNKNOWN_VERIFY_AUDIT_BEFORE_RETRY'})));}
  }
  const applied=accepted.filter(x=>x.status==='APPLIED_READBACK_PASS').length;
  const already=accepted.length-applied;
  const knownWrites=accepted.filter(x=>x.status==='APPLIED_READBACK_PASS'&&!x.historicalPaidOnly).length+knownHistoricalCommits;
  const body={status:holds.length?'PROTECTED_PARTIAL_READBACK_WITH_ISOLATED_HOLDS':'PROTECTED_PAID_READBACK_PASS',
    sourceSha256:SOURCE_SHA,inputCount:plan.inputCount,preflightReady:plan.readyCount,
    cobroWrites:writeOutcomeIndeterminate?null:knownWrites,receiptPaidWrites:writeOutcomeIndeterminate?null:knownWrites,
    portfolioPaidWrites:writeOutcomeIndeterminate?null:knownWrites,knownCommittedPaymentWrites:knownWrites,
    verifiedApplied:applied,writeOutcomeIndeterminate,
    historicalReceiptCreates:writeOutcomeIndeterminate?null:knownHistoricalCommits,
    knownHistoricalReceiptCreates:knownHistoricalCommits,historicalDocumentCreatesKnown:knownHistoricalCommits*4,
    historicalCommitsUnverified,currentDebtCreated:0,
    reconciledWrites:0,alreadyApplied:already,holds,accepted};
  report('GI_I66_CENDOSO_REPORT_OUT',body);
  console.log('I66_CENDOSO_LIVE_READBACK applied='+applied+' already='+already+' holds='+holds.length+' reconciledWrites=0');
  if(!applied&&!already)throw Error('I66_NO_VERIFIED_PAYMENT_READBACK');
}
if(require.main===module)main().catch(e=>{console.error('I66_CENDOSO_HOLD '+e.message);process.exitCode=1;});
module.exports={sourceRow,assess,planBatch,loadSource,receiptIdentity,insurerMatches,
  policyMatches,policyLookupVariants,policyIdentityNumber,readGroups,heldPolicyDiagnostics,
  historicalSourceProved,historicalIdentity,historicalDocuments,historicalAbsence,assessHistorical,
  readHistoricalSnapshot,applyHistoricalChunk,stableHash,auditId,cobroId,legacyDistinctSeriesProof,
  loadApplicationBinding,readApplicationSnapshot,assessApplication,planApplications,applicationPatch,applyApplicationChunk,applicationAuditId};
