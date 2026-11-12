'use strict';
// I6.6 protected LIVE source-to-operational snapshot. Strictly read-only;
// never output clients, tenant IDs, full policy numbers, Firestore data or credentials.
const crypto=require('node:crypto');
const CASES=Object.freeze([
  {id:'A1.M1',insurer:'MAPFRE',policy:'SCIN-4394',requirement:'139187477',cents:37963,paidDate:'2026-11-04'},
  {id:'A1.M2',insurer:'MAPFRE',policy:'SC-79849',requirement:'138828141',cents:249715,paidDate:'2026-11-06'},
  {id:'A1.M3',insurer:'MAPFRE',policy:'3002400057714',requirement:'1993561',cents:12777,paidDate:'2026-11-04'},
  {id:'A2.M1',insurer:'MAPFRE',policy:'SC-79849',requirement:'140461192',cents:249715,due:'2026-11-30'},
  {id:'A3.B1',insurer:'BANTRAB',policy:'AUTO-45580',requirement:'AC-11349841',cents:29994,due:'2026-10-21'},
  {id:'A4.C1',insurer:'LA CEIBA',policy:'0226130804',requirement:'02505903',cents:13897,due:'2026-10-31'},
  {id:'A4.C2',insurer:'LA CEIBA',policy:'0225118528',requirement:'02492371',cents:116564,due:'2026-11-16'},
  // Same canonical read-only workflow; Ficohsa October commission sheet
  // indicates collection but cannot itself authorize a paid Firestore write.
  // Former El Roble risk is a cross-insurer renewal, not a second Ficohsa cash event.
  {id:'A7.F1',insurer:'FICOHSA',policy:'AUTO-1000007073',requirement:'7315461',cents:270480,
   paidDate:'2026-10-02',sourceBasis:'OCTOBER_COMMISSION_INFERENCE_REQUIRES_EXACT_POLICY_RECEIPT_MATCH'}
]);
const PROJECT='ays-orbit-360-lab',text=x=>String(x==null?'':x).trim();
const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x,(k,v)=>v&&typeof v.toJSON==='function'?v.toJSON():v)).digest('hex').slice(0,16);
const cents=x=>x==null||text(x)===''?null:Number.isFinite(+x)?Math.round((+x+Number.EPSILON)*100):null;
const amount=r=>['monto','montoTotal','primaTotal','saldo','valor'].map(k=>cents(r&&r[k])).find(x=>x!==null);
const reqKeys=['numeroReciboFuente','numeroReciboAseguradora','numeroRecibo','numeroRequerimiento','requerimiento','numeroBoleta','sourceNumber','numeroFactura','referencia','referenciaCobro','receiptNumber'];
const numbers=r=>reqKeys.map(k=>text(r&&r[k])).filter(Boolean);
const safeIso=r=>{const value=text(r);return /^\d{4}-\d{2}-\d{2}$/.test(value)?value:null;};
const paid=r=>!!r&&(r.pagado===true||r.conciliadoPago===true||!!text(r.fechaPago||r.paidDate)||/^(Pagado|Paid)$/i.test(text(r.estado))||/^PAID_/.test(text(r.paymentState)));
const safeError=e=>/^I66_A1_A4_[A-Z0-9_]+$/.test(text(e&&e.message))?text(e.message):'I66_A1_A4_PRIVATE_READ_ERROR';

function assess(one,snapshot){
  const policies=snapshot.policies||[],out={id:one.id,sourcePaid:!!one.paidDate,
    sourceBasis:one.sourceBasis||'INSURER_STATEMENT',
    policyMatches:policies.length,receiptRows:0,exactRequirementMatches:0,
    amountMatches:0,exactPaid:false,linkedPaymentCount:0,clientVerified:false,
    currentStatus:'HOLD_UNVERIFIED',writes:0};
  if(policies.length!==1){out.currentStatus=policies.length?'HOLD_MULTIPLE_POLICY_EDITIONS':'HOLD_POLICY_NOT_FOUND';return out;}
  const p=policies[0],receipts=snapshot.receipts||[],cobros=snapshot.cobros||[];
  out.policyValidity={start:safeIso(p.vigenciaInicio||p.vigenciaIni||p.fechaInicio),
    end:safeIso(p.vigenciaFin||p.vigenciaFinal||p.fechaFin),state:text(p.estado).slice(0,28)};
  out.clientVerified=snapshot.clientExists===true;
  out.countryVerified=text(p.pais).toUpperCase()==='GT';
  out.receiptRows=receipts.length;
  const exact=receipts.filter(r=>numbers(r).includes(one.requirement));
  const amounts=receipts.filter(r=>amount(r)===one.cents);
  out.exactRequirementMatches=exact.length;
  out.amountMatches=amounts.length;
  out.amountCandidateReadback=amounts.slice(0,8).map(r=>({
    due:safeIso(r.fechaLimite||r.vence||r.fechaVencimiento),
    sequence:Number.isSafeInteger(+r.secuencia)?+r.secuencia:null,
    hasExternalNumber:numbers(r).length>0,
    sourceNumberMatched:numbers(r).includes(one.requirement),
    status:/^(Pendiente|Vencido|Pagado|Anulado)$/i.test(text(r.estado))?text(r.estado):'OTHER',
    hasPaymentEvidence:paid(r)
  }));
  if(exact.length===1){
    const r=exact[0];out.exactAmountMatch=amount(r)===one.cents;
    const linked=cobros.filter(c=>text(c.reciboId)===text(r.id));
    out.linkedPaymentCount=linked.length;
    out.exactPaid=paid(r)||linked.some(paid);
  }
  if(!out.clientVerified||!out.countryVerified){out.currentStatus='HOLD_IDENTITY_OR_COUNTRY';return out;}
  if(exact.length!==1){out.currentStatus=exact.length?'HOLD_DUPLICATE_REQUIREMENT':'HOLD_EXACT_REQUIREMENT_NOT_LINKED';return out;}
  if(!out.exactAmountMatch){out.currentStatus='HOLD_SOURCE_AMOUNT_DIFF';return out;}
  if(out.linkedPaymentCount>1){out.currentStatus='HOLD_PAYMENT_DUPLICATE';return out;}
  if(out.exactPaid){out.currentStatus='ALREADY_RECORDED_NO_WRITE';return out;}
  out.currentStatus=one.paidDate?'PAID_SOURCE_UNPAID_LIVE_CANDIDATE_SIGNED_CAS_REQUIRED':
    one.due<'2026-11-11'?'PENDING_OVERDUE_NO_PAID_WRITE':'PENDING_FUTURE_NO_PAID_WRITE';
  return out;
}

// Multiple policy editions are expected after renewals. A policy NUMBER alone
// cannot establish a payment target: resolve exact receipt and amount per
// edition, and retain HOLD if two editions appear financially eligible.
function resolveEditions(one,snapshots){
  if(!snapshots.length)return assess(one,{policies:[]});
  const editionResults=snapshots.map((snapshot,index)=>{
    const oneEdition=assess(one,snapshot);
    return Object.assign({editionIndex:index+1},oneEdition);
  });
  const candidates=editionResults.filter(row=>
    row.exactRequirementMatches===1&&row.exactAmountMatch===true&&
    row.clientVerified===true&&row.countryVerified===true&&
    row.linkedPaymentCount<=1);
  const out={id:one.id,sourcePaid:!!one.paidDate,policyMatches:snapshots.length,
    editionResults,exactRequirementMatches:editionResults.reduce((s,r)=>s+r.exactRequirementMatches,0),
    exactAmountEditions:candidates.length,candidateEditionIndex:null,writes:0};
  if(candidates.length!==1){
    out.currentStatus=candidates.length?'HOLD_MULTIPLE_EXACT_PAYMENT_EDITIONS':
      'HOLD_NO_EXACT_REQUIREMENT_IN_ANY_EDITION';
    return out;
  }
  const candidate=candidates[0];out.candidateEditionIndex=candidate.editionIndex;
  out.currentStatus=candidate.currentStatus;
  return out;
}

async function scan(db){
  const tenantRefs=await db.collection('tenants').listDocuments();
  if(!tenantRefs.length||tenantRefs.length>300)throw Error('I66_A1_A4_TENANT_SCOPE');
  const buckets=CASES.map(()=>[]);
  for(const t of tenantRefs){
    const col=t.collection('data').doc('polizas').collection('items');
    await Promise.all(CASES.map(async(one,i)=>{
      const found=await col.where('numero','==',one.policy).limit(5).get();
      for(const d of found.docs)buckets[i].push({tenant:t,id:d.id,data:d.data()||{}});
    }));
  }
  const output=[];
  for(let i=0;i<CASES.length;i++){
    const one=CASES[i],matches=buckets[i];
    if(!matches.length){output.push(assess(one,{policies:[]}));continue;}
    if(matches.length>24){output.push({id:one.id,currentStatus:'HOLD_POLICY_READ_LIMIT',writes:0});continue;}
    const snapshots=await Promise.all(matches.map(async(match)=>{
      const base=name=>match.tenant.collection('data').doc(name).collection('items');
      const [r,c,client]=await Promise.all([
        base('recibosEsperados').where('polizaId','==',match.id).limit(80).get(),
        base('cobros').where('polizaId','==',match.id).limit(80).get(),
        text(match.data.clienteId)?base('clientes').doc(text(match.data.clienteId)).get():Promise.resolve(null)
      ]);
      if(r.size>=80||c.size>=80)throw Error('I66_A1_A4_REQUIREMENT_READ_LIMIT');
      const rows=r.docs.map(d=>Object.assign({id:d.id},d.data()||{}));
      const payments=c.docs.map(d=>Object.assign({id:d.id},d.data()||{}));
      return {policies:[match.data],receipts:rows,cobros:payments,clientExists:!!client&&client.exists,
        fingerprint:digest({policy:match.data,receipts:rows,cobros:payments,clientExists:!!client&&client.exists})};
    }));
    const result=resolveEditions(one,snapshots);
    result.editionResults.forEach((edition,index)=>{
      edition.snapshotFingerprint=snapshots[index].fingerprint;
    });
    output.push(result);
  }
  return output;
}

async function main(){
  if(process.env.GCLOUD_PROJECT!==PROJECT||process.env.GI_I66_CARTERA_MODE!=='readonly'||process.env.FIRESTORE_EMULATOR_HOST)throw Error('I66_A1_A4_PROJECT_OR_MODE');
  const {initializeApp,getApps}=require('firebase-admin/app');
  const {getFirestore}=require('firebase-admin/firestore');
  const db=getFirestore(getApps()[0]||initializeApp({projectId:PROJECT}));
  const first=await scan(db),second=await scan(db);
  if(first.length!==CASES.length||JSON.stringify(first)!==JSON.stringify(second))throw Error('I66_A1_A4_CONCURRENT_CHANGE');
  const report={schema:'gi.i66.cartera.a1-a4-a7.readonly.v2',dateGuatemala:'2026-11-12',
    project:'ays-orbit-360-lab',cases:first,totalCases:first.length,writes:0,
    paidSourceUnique:CASES.filter(x=>x.paidDate).length,
    pendingSourceExamples:CASES.filter(x=>x.due&&!x.paidDate).length,certifiedApplied:0,
    next:'Only exact unique unpaid candidates may proceed to separate signed protected CAS + before/after readback.'};
  console.log('I66_CARTERA_A1_A4_READONLY='+JSON.stringify(report));
}
if(require.main===module)main().catch(e=>{console.error(safeError(e));process.exitCode=1});
module.exports={CASES,assess,resolveEditions,numbers,amount,paid};
