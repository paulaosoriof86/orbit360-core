'use strict';
// I6.6, same protected LIVE source-write gate. Six insurer PENDING requirements:
// bind external references and correct gross installment receipts + active
// cartera to the immutable insurer statement. No paid event or cobro is made.
const crypto=require('node:crypto');
const fs=require('node:fs');
const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones';
const SOURCE_SHA='29a42705ae6f7b2b42693f51a27a0b1f4ced279e2259b28ce021ff7b21ccefb0';
const ROWS=Object.freeze([
  {id:'A2.M9',policy:'3002100014247',requirement:'3053326',due:'2026-11-21',oldCents:10458,grossCents:10457},
  {id:'A2.M12',policy:'3002600004525',requirement:'3072645',due:'2026-10-18',oldCents:29796,grossCents:35237},
  {id:'A2.M13',policy:'3002600004525',requirement:'3072646',due:'2026-11-18',oldCents:29796,grossCents:35237},
  {id:'A2.M14',policy:'3002100014117',requirement:'3057110',due:'2026-10-03',oldCents:28285,grossCents:28285},
  {id:'A2.M16',policy:'3002100014247',requirement:'3053325',due:'2026-10-21',oldCents:10458,grossCents:10457},
  {id:'A2.M17',policy:'3002100014247',requirement:'3053324',due:'2026-09-21',oldCents:10458,grossCents:10457}
]);
const str=x=>String(x==null?'':x).trim();
const norm=x=>str(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const stable=x=>x==null?x:typeof x.toJSON==='function'?stable(x.toJSON()):Array.isArray(x)?x.map(stable):typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
const fingerprint=x=>hash(JSON.stringify(stable(x)));
const fail=reason=>{throw Error('I66_MAPFRE_SIX_HOLD_'+reason);};
const iso=x=>/^\d{4}-\d{2}-\d{2}$/.test(str(x))?str(x):'';
const cents=x=>x==null||x===''?null:Number.isFinite(+x)?Math.round((+x+Number.EPSILON)*100):null;
const date=r=>iso(r.fechaLimite||r.vence||r.fechaVencimiento);
const paid=r=>!!r&&(r.pagado===true||r.conciliadoPago===true||r.conciliado===true||
  r.reportado===true||r.validadoReporte===true||!!str(r.fechaPago||r.fechaPagoReportada||r.paidDate)||
  /^(PAGADO|PAID|CONCILIADO|PAGO.?REPORTADO)$/i.test(str(r.estado))||
  /^PAID_/i.test(str(r.paymentState))||/^APPLIED_/i.test(str(r.applicationState)));
const SOURCE_ALIASES=['numeroReciboAseguradora','numeroRequerimiento','requerimiento','numeroBoleta',
  'sourceNumber','referenciaCobro','receiptNumber'];
const INDEX_ALIASES=['numeroReciboFuente',...SOURCE_ALIASES];
const internal=x=>!str(x)||/^rec_[a-f0-9]{16,64}$/i.test(str(x))||
  /^(\d{1,2})\s*\/\s*(\d{1,2})$/.test(str(x));
const item=(db,name)=>db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items');
const audit=(db,id)=>db.collection('tenants').doc(TENANT).collection('operationalRequests').doc(id);
function selectSix(policyGroups,externalIndex){
  if(!Array.isArray(policyGroups)||new Set(policyGroups.map(g=>str(g.policy?.numero))).size!==3)
    fail('THREE_POLICY_NUMBERS_REQUIRED');
  const selected=[],seen=new Set();
  for(const source of ROWS){
    if((externalIndex[source.requirement]||[]).length)fail('SOURCE_NUMBER_ALREADY_LINKED_'+source.id);
    const all=policyGroups.filter(g=>g.policy.numero===source.policy);
    const candidates=all.flatMap(g=>(g.receipts||[]).filter(r=>date(r)===source.due).map(r=>({g,r})));
    if(candidates.length!==1)fail('EXACT_DUE_POLICY_EDITION_NOT_UNIQUE_'+source.id);
    const {g,r}=candidates[0],p=g.policy,rid=str(r.id);
    if(!rid||seen.has(rid)||str(r.polizaId)!==str(p.id)||str(p.pais).toUpperCase()!=='GT'||
      p.tenantId&&p.tenantId!==TENANT||r.tenantId&&r.tenantId!==TENANT||
      !str(p.clienteId)||!str(p.aseguradoraId)||
      norm(p.moneda||p.currency)!=='GTQ'||norm(r.moneda||r.currency||p.moneda)!=='GTQ'||
      !iso(p.vigenciaInicio)||!iso(p.vigenciaFin)||source.due<p.vigenciaInicio||source.due>p.vigenciaFin||
      /^(ANULADA|CANCELADA|SUSPENDIDA|DELETED)$/i.test(norm(p.estado)))
      fail('POLICY_RECEIPT_SCOPE_OR_TERM_'+source.id);
    if(g.clientExists!==true||g.insurerVerified!==true)fail('CLIENT_OR_MAPFRE_IDENTITY_'+source.id);
    if(paid(r)||g.cobros.some(c=>str(c.reciboId)===rid)||str(r.estadoOperativo).toUpperCase().includes('PAG'))
      fail('PAID_RECEIPT_PROTECTED_'+source.id);
    if(!internal(r.numeroReciboFuente)||SOURCE_ALIASES.some(k=>str(r[k])))
      fail('EXTERNAL_REFERENCE_CONFLICT_'+source.id);
    if(cents(r.primaTotal)!==source.oldCents||
      ['monto','montoTotal','saldo','valor'].some(k=>r[k]!=null))
      fail('RECEIPT_GROSS_PREIMAGE_CHANGED_'+source.id);
    const linked=g.portfolio.filter(c=>str(c.reciboId)===rid&&c.carteraActiva!==false);
    if(linked.length!==1||g.portfolio.some(c=>str(c.reciboId)===rid&&c.carteraActiva===false))
      fail('ACTIVE_PORTFOLIO_NOT_EXACT_'+source.id);
    const c=linked[0];
    if(str(c.polizaId||c.policyId)!==str(p.id)||str(c.clienteId||p.clienteId)!==str(p.clienteId)||
      c.tenantId&&c.tenantId!==TENANT||
      norm(c.moneda||c.currency)!=='GTQ'||paid(c)||cents(c.primaTotal)!==source.oldCents||
      ['monto','montoTotal','saldo','valor'].some(k=>c[k]!=null))
      fail('PORTFOLIO_GROSS_OR_RELATION_MISMATCH_'+source.id);
    seen.add(rid);selected.push({source,policyId:p.id,receiptId:rid,portfolioId:c.id,
      beforeReceipt:{present:Object.hasOwn(r,'numeroReciboFuente'),value:r.numeroReciboFuente??null,
        primaTotal:r.primaTotal},beforePortfolio:{primaTotal:c.primaTotal}});
  }
  if(selected.length!==6||seen.size!==6)fail('SIX_UNIQUE_REQUIRED');
  return selected;
}
async function readState(db,tx){
  const get=ref=>tx?tx.get(ref):ref.get(),groups=[];
  for(const number of [...new Set(ROWS.map(r=>r.policy))]){
    const policies=await get(item(db,'polizas').where('numero','==',number).limit(21));
    if(policies.size>=21||policies.empty)fail('POLICY_EDITION_READ_LIMIT_OR_MISSING');
    const editions=[];
    for(const ps of policies.docs){
      const p={...ps.data(),id:ps.id};
      const [rc,cb,cp,client,insurer]=await Promise.all([
        get(item(db,'recibosEsperados').where('polizaId','==',ps.id).limit(80)),
        get(item(db,'cobros').where('polizaId','==',ps.id).limit(80)),
        get(item(db,'carteraPrimas').where('polizaId','==',ps.id).limit(80)),
        str(p.clienteId)?get(item(db,'clientes').doc(str(p.clienteId))):Promise.resolve(null),
        str(p.aseguradoraId)?get(item(db,'aseguradoras').doc(str(p.aseguradoraId))):Promise.resolve(null)
      ]);
      if(rc.size>=80||cb.size>=80||cp.size>=80)fail('FINANCIAL_LINK_READ_LIMIT');
      const customer=client&&client.exists&&client.data()||{},company=insurer&&insurer.exists&&insurer.data()||{};
      editions.push({policy:p,clientExists:!!client&&client.exists&&
        (!customer.tenantId||customer.tenantId===TENANT)&&['GT','GUATEMALA'].includes(norm(customer.pais||customer.country)),
        insurerVerified:!!insurer&&insurer.exists&&(!company.tenantId||company.tenantId===TENANT)&&
          (!company.pais||['GT','GUATEMALA'].includes(norm(company.pais)))&&
          norm(company.nombre||company.razonSocial).includes('MAPFRE'),
        receipts:rc.docs.map(d=>({...d.data(),id:d.id})),
        cobros:cb.docs.map(d=>({...d.data(),id:d.id})),
        portfolio:cp.docs.map(d=>({...d.data(),id:d.id}))});
    }
    groups.push(...editions);
  }
  return groups;
}
async function readIndex(db,tx){
  const get=ref=>tx?tx.get(ref):ref.get(),indexed={};
  for(const row of ROWS){
    indexed[row.requirement]=[];
    for(const field of INDEX_ALIASES){
      const q=await get(item(db,'recibosEsperados').where(field,'==',row.requirement).limit(3));
      if(q.size>=3)fail('SOURCE_INDEX_LIMIT_'+row.id);
      indexed[row.requirement].push(...q.docs.map(d=>d.id));
    }
  }
  return indexed;
}
const stateFingerprint=groups=>fingerprint(groups.map(g=>({policy:g.policy,
  receipts:g.receipts.slice().sort((a,b)=>a.id.localeCompare(b.id)),
  cobros:g.cobros.slice().sort((a,b)=>a.id.localeCompare(b.id)),
  portfolio:g.portfolio.slice().sort((a,b)=>a.id.localeCompare(b.id)),
  clientExists:g.clientExists,insurerVerified:g.insurerVerified})).sort((a,b)=>a.policy.id.localeCompare(b.policy.id)));
const corrected= (groups,selected)=>groups.map(g=>({
  ...g,
  receipts:g.receipts.map(r=>{const row=selected.find(x=>x.receiptId===r.id);
    return row?{...r,numeroReciboFuente:row.source.requirement,primaTotal:row.source.grossCents/100}:r;}),
  portfolio:g.portfolio.map(c=>{const row=selected.find(x=>x.portfolioId===c.id);
    return row?{...c,primaTotal:row.source.grossCents/100}:c;})
}));
async function buildPlan(db,tx){
  const groups=await readState(db,tx),index=await readIndex(db,tx),selected=selectSix(groups,index);
  const beforeFingerprint=stateFingerprint(groups),afterFingerprint=stateFingerprint(corrected(groups,selected));
  const id='gi_i66_mapfre6_'+hash(SOURCE_SHA+'|'+selected.map(x=>x.receiptId).sort().join('|')).slice(0,25);
  return {selected,beforeFingerprint,afterFingerprint,requestId:id,sourceSha256:SOURCE_SHA,
    receiptWrites:6,portfolioWrites:6,changedGrossCount:selected.filter(x=>x.source.oldCents!==x.source.grossCents).length,
    grossDeltaCents:selected.reduce((n,x)=>n+x.source.grossCents-x.source.oldCents,0),
    paymentWrites:0,cobroWrites:0};
}
async function execute(db,mode,gate){
  if(!['dry-run','apply'].includes(mode))fail('UNKNOWN_MODE');
  const first=await buildPlan(db),second=await buildPlan(db);
  if(first.beforeFingerprint!==second.beforeFingerprint||first.afterFingerprint!==second.afterFingerprint)
    fail('CONCURRENT_PREIMAGE_CHANGED');
  if(mode==='dry-run')return {status:'MAPFRE_SIX_SOURCE_GROSS_PREFLIGHT_PASS_NO_WRITE',
    ...publicPlan(first),writes:0};
  if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REF!=='refs/heads/recovery/fase-a-clean-20260831'||
    process.env.GI_I66_MAPFRE_MODE!=='apply'||gate?.environment!=='gravicentra-live-data-writes'||
    gate?.reviewerEvidence!==true)fail('PROTECTED_ENVIRONMENT_NOT_AUTHORIZED');
  const committed=await db.runTransaction(async tx=>{
    const plan=await buildPlan(db,tx);
    if(plan.beforeFingerprint!==first.beforeFingerprint||plan.afterFingerprint!==first.afterFingerprint||
      plan.requestId!==first.requestId)fail('CAS_PREIMAGE_CHANGED');
    const auditRef=audit(db,plan.requestId),prior=await tx.get(auditRef);
    if(prior.exists)fail('REQUEST_ALREADY_APPLIED');
    for(const row of plan.selected){
      tx.update(item(db,'recibosEsperados').doc(row.receiptId),{
        numeroReciboFuente:row.source.requirement,primaTotal:row.source.grossCents/100});
      tx.update(item(db,'carteraPrimas').doc(row.portfolioId),{primaTotal:row.source.grossCents/100});
    }
    tx.create(auditRef,{status:'APPLIED_MAPFRE_SIX_PENDING_GROSS_AND_REFERENCE_CAS',sourceSha256:SOURCE_SHA,
      caseIds:plan.selected.map(x=>x.source.id),beforeFingerprint:plan.beforeFingerprint,
      expectedAfterFingerprint:plan.afterFingerprint,receiptWrites:6,portfolioWrites:6,
      grossDeltaCents:plan.grossDeltaCents,paymentWrites:0,cobroWrites:0,
      rollbackBeforeFields:plan.selected.map(x=>({receiptId:x.receiptId,portfolioId:x.portfolioId,
        numeroReciboFuente:x.beforeReceipt.value,sourceNumberFieldPresent:x.beforeReceipt.present,
        receiptPrimaTotal:x.beforeReceipt.primaTotal,portfolioPrimaTotal:x.beforePortfolio.primaTotal})),
      committedAt:require('firebase-admin/firestore').FieldValue.serverTimestamp()});
    return plan.requestId;
  });
  const actual=stateFingerprint(await readState(db));
  const record=await audit(db,committed).get();
  if(!record.exists||record.data().status!=='APPLIED_MAPFRE_SIX_PENDING_GROSS_AND_REFERENCE_CAS'||
    actual!==first.afterFingerprint)fail('POSTIMAGE_OR_AUDIT_MISMATCH');
  for(const row of ROWS){
    const q=await item(db,'recibosEsperados').where('numeroReciboFuente','==',row.requirement).limit(3).get();
    if(q.size!==1||cents(q.docs[0].data()?.primaTotal)!==row.grossCents)fail('SOURCE_REF_READBACK_'+row.id);
  }
  return {status:'MAPFRE_SIX_LIVE_RECEIPT_PORTFOLIO_CAS_READBACK_PASS',
    ...publicPlan(first),actualAfterFingerprint:actual,rollbackRecorded:true,auditRecorded:true};
}
function publicPlan(p){return {sourceSha256:p.sourceSha256,caseIds:p.selected.map(x=>x.source.id),
  beforeFingerprint:p.beforeFingerprint,afterFingerprint:p.afterFingerprint,
  receiptWrites:p.receiptWrites,portfolioWrites:p.portfolioWrites,changedGrossCount:p.changedGrossCount,
  grossDeltaCents:p.grossDeltaCents,paymentWrites:0,cobroWrites:0};}
async function main(){
  if(process.env.GCLOUD_PROJECT!==PROJECT||process.env.FIRESTORE_EMULATOR_HOST)fail('PROJECT_SCOPE');
  const mode=process.env.GI_I66_MAPFRE_MODE||'dry-run';
  const {initializeApp,getApps}=require('firebase-admin/app');
  const {getFirestore}=require('firebase-admin/firestore');
  const db=getFirestore(getApps()[0]||initializeApp({projectId:PROJECT}));
  const result=await execute(db,mode,mode==='apply'?{environment:'gravicentra-live-data-writes',reviewerEvidence:true}:null);
  const out=process.env.GI_I66_MAPFRE_REPORT||'';
  if(out){const temp=String(process.env.RUNNER_TEMP||'')+'/';
    if(!temp.startsWith('/home/runner/work/_temp/')||!out.startsWith(temp)||
      !/\/gi-i66-mapfre-six-report\.json$/.test(out))fail('REPORT_DESTINATION');
    fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{mode:0o600});}
  console.log('I66_MAPFRE_SIX_STATUS='+result.status);
  console.log('I66_MAPFRE_SIX_REAL_RECEIPT_WRITES='+(mode==='apply'?result.receiptWrites:0));
  console.log('I66_MAPFRE_SIX_REAL_CARTERA_WRITES='+(mode==='apply'?result.portfolioWrites:0));
  console.log('I66_MAPFRE_SIX_REAL_COBRO_WRITES=0');
}
if(require.main===module)main().catch(e=>{console.error(/^I66_MAPFRE_SIX_HOLD_/.test(e.message)?e.message:'I66_MAPFRE_SIX_PRIVATE_FAILURE');process.exitCode=1;});
module.exports={SOURCE_SHA,ROWS,selectSix,readState,stateFingerprint,corrected,buildPlan,execute,paid,internal,cents};
