'use strict';
// I6.6 protected LIVE source-to-operational snapshot. Strictly read-only;
// never output clients, tenant IDs, full policy numbers, Firestore data or credentials.
const crypto=require('node:crypto');
const fs=require('node:fs');
const CASES=Object.freeze([
  {id:'A1.M1',insurer:'MAPFRE',policy:'SCIN-4394',requirement:'139187477',cents:37963,paidDate:'2026-11-04'},
  {id:'A1.M2',insurer:'MAPFRE',policy:'SC-79849',requirement:'138828141',cents:249715,paidDate:'2026-11-06'},
  {id:'A1.M3',insurer:'MAPFRE',policy:'3002400057714',requirement:'1993561',cents:12777,paidDate:'2026-11-04'},
  {id:'A2.M1',insurer:'MAPFRE',policy:'SC-79849',requirement:'140461192',cents:249715,due:'2026-11-30'},
  // ALL 17 unique requirements, excluding the source's two subtotal rows.
  {id:'A2.M2',insurer:'MAPFRE',policy:'SC-79829',requirement:'128419795',cents:82488,due:'2026-04-30'},
  {id:'A2.M3',insurer:'MAPFRE',policy:'SC-79829',requirement:'130326306',cents:82488,due:'2026-05-31'},
  {id:'A2.M4',insurer:'MAPFRE',policy:'SC-79829',requirement:'132044877',cents:88486,due:'2026-07-31'},
  {id:'A2.M5',insurer:'MAPFRE',policy:'SC-79829',requirement:'135226671',cents:88486,due:'2026-08-31'},
  {id:'A2.M6',insurer:'MAPFRE',policy:'SC-79829',requirement:'137345069',cents:88486,due:'2026-09-30'},
  {id:'A2.M7',insurer:'MAPFRE',policy:'SC-79829',requirement:'138847044',cents:88486,due:'2026-10-31'},
  {id:'A2.M8',insurer:'MAPFRE',policy:'SC-79829',requirement:'140557498',cents:88486,due:'2026-11-30'},
  {id:'A2.M9',insurer:'MAPFRE',policy:'3002100014247',requirement:'3053326',cents:10457,due:'2026-11-21'},
  {id:'A2.M10',insurer:'MAPFRE',policy:'3002100014247',requirement:'3053323',cents:10457,due:'2026-08-21'},
  {id:'A2.M11',insurer:'MAPFRE',policy:'3002600004525',requirement:'3072644',cents:35237,due:'2026-09-18'},
  {id:'A2.M12',insurer:'MAPFRE',policy:'3002600004525',requirement:'3072645',cents:35237,due:'2026-10-18'},
  {id:'A2.M13',insurer:'MAPFRE',policy:'3002600004525',requirement:'3072646',cents:35237,due:'2026-11-18'},
  {id:'A2.M14',insurer:'MAPFRE',policy:'3002100014117',requirement:'3057110',cents:28285,due:'2026-10-03'},
  {id:'A2.M15',insurer:'MAPFRE',policy:'3002100014117',requirement:'3057111',cents:28285,due:'2026-11-03'},
  {id:'A2.M16',insurer:'MAPFRE',policy:'3002100014247',requirement:'3053325',cents:10457,due:'2026-10-21'},
  {id:'A2.M17',insurer:'MAPFRE',policy:'3002100014247',requirement:'3053324',cents:10457,due:'2026-09-21'},
  {id:'A3.B1',insurer:'BANTRAB',policy:'AUTO-45580',requirement:'AC-11349841',cents:29994,due:'2026-10-21'},
  // All 14 Bantrab installments from the 2026-11-04 dated statement.
  {id:'A3.B2',insurer:'BANTRAB',policy:'AUTO-47012',requirement:'AC-11242548',cents:33214,due:'2026-11-12'},
  {id:'A3.B3',insurer:'BANTRAB',policy:'AUTO-47012',requirement:'AC-11242549',cents:33214,due:'2026-12-12'},
  {id:'A3.B4',insurer:'BANTRAB',policy:'AUTO-45580',requirement:'AC-11349842',cents:29994,due:'2026-11-21'},
  {id:'A3.B5',insurer:'BANTRAB',policy:'AUTO-45580',requirement:'AC-11349843',cents:29994,due:'2026-12-21'},
  {id:'A3.B6',insurer:'BANTRAB',policy:'AUTO-45580',requirement:'AC-11349844',cents:29994,due:'2027-01-21'},
  {id:'A3.B7',insurer:'BANTRAB',policy:'AUTO-45580',requirement:'AC-11349845',cents:29994,due:'2027-02-21'},
  {id:'A3.B8',insurer:'BANTRAB',policy:'AUTO-45580',requirement:'AC-11349846',cents:29994,due:'2027-03-21'},
  {id:'A3.B9',insurer:'BANTRAB',policy:'AUTO-45580',requirement:'AC-11349847',cents:29994,due:'2027-04-21'},
  {id:'A3.B10',insurer:'BANTRAB',policy:'AUTO-45446',requirement:'AC-11025580',cents:29994,due:'2026-11-27'},
  {id:'A3.B11',insurer:'BANTRAB',policy:'AUTO-45446',requirement:'AC-11025581',cents:29994,due:'2026-12-27'},
  {id:'A3.B12',insurer:'BANTRAB',policy:'AUTO-45446',requirement:'AC-11025582',cents:29994,due:'2027-01-27'},
  {id:'A3.B13',insurer:'BANTRAB',policy:'AUTO-45446',requirement:'AC-11025583',cents:29994,due:'2027-02-27'},
  {id:'A3.B14',insurer:'BANTRAB',policy:'AUTO-45446',requirement:'AC-11025584',cents:29994,due:'2027-03-27'},
  {id:'A4.C1',insurer:'LA CEIBA',policy:'0226130804',requirement:'02505903',cents:13897,due:'2026-10-31'},
  {id:'A4.C2',insurer:'LA CEIBA',policy:'0225118528',requirement:'02492371',cents:116564,due:'2026-11-16'},
  // Same canonical read-only workflow; Ficohsa October commission sheet
  // indicates collection but cannot itself authorize a paid Firestore write.
  // Former El Roble risk is a cross-insurer renewal, not a second Ficohsa cash event.
  {id:'A7.F1',insurer:'FICOHSA',policy:'AUTO-1000007073',requirement:'7315461',cents:270480,
   paidDate:'2026-10-02',sourceBasis:'OCTOBER_COMMISSION_INFERENCE_REQUIRES_EXACT_POLICY_RECEIPT_MATCH'}
]);
// Matched byte-for-byte to the frozen insurer sources in Google Drive, not a
// copied table of totals. A newer file requires a separately reconciled gate.
const SOURCE_SHA256=Object.freeze({
  mapfrePendingNov:'29a42705ae6f7b2b42693f51a27a0b1f4ced279e2259b28ce021ff7b21ccefb0',
  bantrabNov04:'b945a98c7c572909c643be4c849a7526a363eb490cdcf24ac8d0ae54ca3025b7'
});
const BANTRAB_PREVIOUSLY_WRITTEN=Object.freeze(['A3.B1','A3.B4','A3.B5','A3.B6','A3.B7','A3.B8','A3.B9']);
const PROJECT='ays-orbit-360-lab',text=x=>String(x==null?'':x).trim();
const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x,(k,v)=>v&&typeof v.toJSON==='function'?v.toJSON():v)).digest('hex').slice(0,16);
const cents=x=>x==null||text(x)===''?null:Number.isFinite(+x)?Math.round((+x+Number.EPSILON)*100):null;
const amount=r=>['monto','montoTotal','primaTotal','saldo','valor'].map(k=>cents(r&&r[k])).find(x=>x!==null);
const reqKeys=['numeroReciboFuente','numeroReciboAseguradora','numeroRecibo','numeroRequerimiento','requerimiento','numeroBoleta','sourceNumber','numeroFactura','referencia','referenciaCobro','receiptNumber'];
const numbers=r=>reqKeys.map(k=>text(r&&r[k])).filter(Boolean);
const sourceRefKeys=['numeroReciboFuente','numeroReciboAseguradora','numeroRequerimiento','requerimiento','numeroBoleta','sourceNumber','referenciaCobro','receiptNumber'];
const policyVariants=raw=>{const p=text(raw,180).replace(/^[\s']+/,''),compact=p.replace(/[\s-]+/g,'');return Array.from(new Set([p,p.replace(/-/g,' '),p.replace(/\s/g,'-'),compact].filter(Boolean)));};
const safeIso=r=>{const value=text(r);return /^\d{4}-\d{2}-\d{2}$/.test(value)?value:null;};
const due=r=>safeIso(r&& (r.fechaLimite||r.vence||r.fechaVencimiento));
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
  out.sourceDueExactAmountMatches=one.due?receipts.filter(r=>amount(r)===one.cents&&due(r)===one.due).length:null;
  out.sourceDueExactAmountDetails=one.due?receipts.filter(r=>amount(r)===one.cents&&due(r)===one.due).map(r=>({
    numberFieldNames:reqKeys.filter(k=>text(r[k])),
    sourceRefFieldNames:sourceRefKeys.filter(k=>text(r[k])),
    sourceRefAlreadyCorrect:sourceRefKeys.some(k=>text(r[k])===one.requirement),
    sourceRefOccupiedByDifferentValue:sourceRefKeys.some(k=>text(r[k])&&text(r[k])!==one.requirement),
    paidEvidence:paid(r),linkedCobros:cobros.filter(c=>text(c.reciboId)===text(r.id)).length,
    status:text(r.estado).slice(0,32)
  })):[];
  out.amountCandidateReadback=amounts.slice(0,8).map(r=>({
    due:due(r),
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
  // The source files are exclusively A&S GT. Cross-tenant probing is forbidden.
  const tenant=db.collection('tenants').doc('alianzas-soluciones');
  // Firestore permits live subcollections below a nonmaterialized parent doc.
  // Validate the actual tenant operational collections instead of requiring
  // the tenants/{tenant} root document to have fields.
  const [memberProbe,policyProbe]=await Promise.all([
    tenant.collection('members').limit(1).get(),
    tenant.collection('data').doc('polizas').collection('items').limit(1).get()
  ]);
  if(memberProbe.empty||policyProbe.empty)throw Error('I66_A1_A4_TENANT_SCOPE');
  const buckets=CASES.map(()=>[]);
  {
    const col=tenant.collection('data').doc('polizas').collection('items');
    const policyReadCache=Object.create(null);
    await Promise.all(CASES.map(async(one,i)=>{
      // Ficohsa may have arrived with a legacy policy-number field. Search
      // exact aliases only, deduplicating physical documents before any
      // edition/amount/requisite inference. This never mutates policy data.
      const fields=one.id==='A7.F1'
        ? ['numero','numeroPoliza','numero_poliza','numPoliza','numeroDePoliza',
          'noPoliza','polizaNumero','policyNumber','policyNo','polizaNo','numeroContrato']
        : ['numero'];
      const key=one.policy+'|'+fields.join(',');
      if(!policyReadCache[key])policyReadCache[key]=Promise.all(fields.flatMap(field=>
        policyVariants(one.policy).map(value=>col.where(field,'==',value).limit(5).get())));
      const reads=await policyReadCache[key];
      const found=[],seen=new Set();
      for(const snapshot of reads)for(const d of snapshot.docs||[]){
        if(seen.has(d.id))continue;
        seen.add(d.id);found.push(d);
      }
      for(const d of found)buckets[i].push({tenant,id:d.id,data:d.data()||{}});
    }));
  }
  const output=[];
  const snapshotReadCache=Object.create(null);
  for(let i=0;i<CASES.length;i++){
    const one=CASES[i],matches=buckets[i];
    if(!matches.length){output.push(assess(one,{policies:[]}));continue;}
    if(matches.length>24){output.push({id:one.id,currentStatus:'HOLD_POLICY_READ_LIMIT',writes:0});continue;}
    const snapshots=await Promise.all(matches.map(match=>{
      const key=match.tenant.id+'|'+match.id;
      if(snapshotReadCache[key])return snapshotReadCache[key];
      const reading=(async()=>{
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
      })();
      snapshotReadCache[key]=reading;
      return reading;
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
  const bantrabRows=first.filter(x=>x.id.startsWith('A3.'));
  const previous=bantrabRows.filter(x=>BANTRAB_PREVIOUSLY_WRITTEN.includes(x.id));
  const remaining=bantrabRows.filter(x=>!BANTRAB_PREVIOUSLY_WRITTEN.includes(x.id));
  const matched=x=>x.exactRequirementMatches===1&&x.exactAmountEditions===1;
  const report={schema:'gi.i66.cartera.a1-a4-a7.readonly.v4',dateGuatemala:'2026-11-13',
    project:'ays-orbit-360-lab',cases:first,totalCases:first.length,writes:0,
    sourceSha256:SOURCE_SHA256,
    bantrabPostProtectedBatchReadback:{priorProtectedRunId:43438038880,
      priorProtectedSourceReferenceWrites:7,priorProtectedPaymentWrites:0,
      previousSevenExactReferenceAndAmountReadback:previous.filter(matched).length,
      previousSevenUnexpectedOrUnlinked:previous.filter(x=>!matched(x)).map(x=>x.id),
      remainingSevenSourceCaseIds:remaining.map(x=>x.id),
      remainingSevenAlreadyExactReferenced:remaining.filter(matched).length,
      remainingSevenPotentialUnlinked:remaining.filter(x=>!matched(x)).length,
      remainingSevenMissingPolicy:remaining.filter(x=>x.currentStatus==='HOLD_POLICY_NOT_FOUND').length,
      paymentApplicationsDuringThisRead:0},
    paidSourceUnique:CASES.filter(x=>x.paidDate).length,
    pendingSourceRequirements:CASES.filter(x=>x.due&&!x.paidDate).length,certifiedApplied:0,
    pendingByInsurer:{MAPFRE:CASES.filter(x=>x.id.startsWith('A2.')).length,
      BANTRAB:CASES.filter(x=>x.id.startsWith('A3.')).length,
      LA_CEIBA:CASES.filter(x=>x.id.startsWith('A4.')).length},
    next:'Only exact unique unpaid candidates may proceed to separate signed protected CAS + before/after readback.'};
  const dest=process.env.GI_I66_CARTERA_REPORT||'';
  if(dest){
    const prefix=String(process.env.RUNNER_TEMP||'')+'/';
    if(!prefix.startsWith('/home/runner/work/_temp/')||!dest.startsWith(prefix)||
      !/\/gi-i66-cartera-protected-readback\.json$/.test(dest))throw Error('I66_A1_A4_REPORT_DESTINATION_DENIED');
    fs.writeFileSync(dest,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
  }
  console.log('I66_CARTERA_A1_A4_READONLY='+JSON.stringify(report));
}
if(require.main===module)main().catch(e=>{console.error(safeError(e));process.exitCode=1});
module.exports={CASES,SOURCE_SHA256,BANTRAB_PREVIOUSLY_WRITTEN,assess,resolveEditions,numbers,amount,paid,policyVariants};
