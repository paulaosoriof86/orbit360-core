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

// One issued-document focal read joins the existing reader, not its 37
// insurer-statement cases. Public source contains only normalized identity
// hashes and the private original's byte digest. Never a payment permission.
const DOCUMENTARY_FOCAL=Object.freeze({
  id:'ISSUED.DOC.1',sourceKind:'ISSUED_REQUIREMENT_NOT_PAYMENT',
  sourcePdfSha256:'cf74d644ca819810d6302da17d323dd3a628e841a1be883d7c3ee27b2767c3a9',
  policyNumberHash:'7219ede83091f1e0674185e3611197f8be50ac1d62fad604cba4d951e2f3fdd1',
  requirementHash:'4534fefe381922c38b5ee1f4201881ec15cd3d02b297e6d15a3858141f9a8e3e',
  clientNameHash:'97d8ae2820b6cfd3a4e1931de08b1a60d6dec082e1665f8f037e0c6d8dd90d2d',
  insurerNameHashes:Object.freeze([
    '53ebc0de63c6ae86c0f8ffb71c9a410252d6ae6aadad4d22ad32c10ce8874624',
    '72c1db0e106ef4740d1d2f9f2aee82f868cf8cd504f058c05109e15c5e7bee5a',
    'f9b86b0c4860ebb6701992f78f9e50a98dbded887d93521fef608d2a9995f1e2',
    'd1c7a8b4edb344d29024829814a7acc3402917ac9c5eca17b5c3ade4f50a5d06'
  ]),
  termStart:'2026-09-25',termEnd:'2027-09-25',due:'2026-11-06',cents:97878,currency:'GTQ',
  sourcePaid:false,paymentApplicationAuthorized:false
});
const FOCAL_POLICY_CAP=2000,FOCAL_LINKED_CAP=80,FOCAL_PROPOSAL_CAP=250;
const FOCAL_NUMBER_KEYS=Object.freeze(['numero','numeroPoliza','numero_poliza','numPoliza',
  'numeroDePoliza','noPoliza','polizaNumero','policyNumber','policyNo','polizaNo','numeroContrato']);
const FOCAL_START_KEYS=['vigenciaInicio','vigenciaIni','fechaInicio','inicioVigencia','vigenciaDesde','fechaInicioVigencia','startDate'];
const FOCAL_END_KEYS=['vigenciaFin','vigenciaFinal','fechaFin','finVigencia','vigenciaHasta','fechaFinVigencia','endDate'];
const FOCAL_CLIENT_REFS=['clienteId','clientId','contratanteId'];
const FOCAL_INSURER_REFS=['aseguradoraId','insurerId','companiaId'];
const FOCAL_COUNTRY_KEYS=['pais','country','paisCodigo','countryCode'];
const FOCAL_CURRENCY_KEYS=['moneda','currency','currencyCode'];
const FOCAL_POLICY_FIELDS=[...FOCAL_NUMBER_KEYS,...FOCAL_START_KEYS,...FOCAL_END_KEYS,
  ...FOCAL_CLIENT_REFS,...FOCAL_INSURER_REFS,...FOCAL_COUNTRY_KEYS,...FOCAL_CURRENCY_KEYS];
const FOCAL_NAME_FIELDS=['nombreCompleto','nombreCliente','fullName','name','nombre','razonSocial',
  'razon_social','nombres','apellidos'];
const FOCAL_RECEIPT_FIELDS=[...reqKeys,...FOCAL_COUNTRY_KEYS,...FOCAL_CURRENCY_KEYS,'polizaId','policyId','reciboId',
  'monto','montoTotal','primaTotal','saldo','valor','fechaLimite','vence','fechaVencimiento',
  'estado','pagado','conciliado','conciliadoPago','reportado','validadoReporte','fechaPago',
  'paidDate','fechaPagoReportada','paymentState','secuencia','numeroCuota'];
const focalNormalize=v=>text(v).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const focalHash=v=>crypto.createHash('sha256').update(focalNormalize(v)).digest('hex');
function focalRequirementHash(value){
  const normalized=text(value).normalize('NFKD').toUpperCase().replace(/^REQ\s*-\s*/,'').replace(/\s+/g,'');
  return /^\d+$/.test(normalized)?crypto.createHash('sha256').update(normalized).digest('hex'):null;
}
const focalUnique=values=>Array.from(new Set(values.filter(Boolean)));
const focalCountries=row=>focalUnique(FOCAL_COUNTRY_KEYS.map(k=>focalNormalize(row?.[k])).map(v=>v==='GUATEMALA'?'GT':v));
const focalCountryGT=row=>{const values=focalCountries(row);return values.length===1&&values[0]==='GT';};
const focalCurrencyGTQ=row=>{const values=focalUnique(FOCAL_CURRENCY_KEYS.map(k=>focalNormalize(row?.[k]))
  .map(v=>v==='QUETZALES'||v==='QUETZAL'||v==='Q'?'GTQ':v));return values.length===1&&values[0]==='GTQ';};
const focalNames=row=>focalUnique([...FOCAL_NAME_FIELDS.map(k=>text(row?.[k])),
  [row?.nombres,row?.apellidos].map(text).filter(Boolean).join(' ')]);
const focalRef=(row,fields)=>{const refs=focalUnique(fields.map(k=>text(row?.[k])));
  return refs.length===1&&/^[A-Za-z0-9._:-]{1,180}$/.test(refs[0])?refs[0]:null;};
function focalDate(value){
  if(value&&typeof value.toDate==='function')return value.toDate().toISOString().slice(0,10);
  const raw=text(value),match=raw.match(/^(\d{4}-\d{2}-\d{2})(?:T00:00:00(?:\.000)?Z)?$/);
  if(!match)return null;
  const parsed=new Date(match[1]+'T00:00:00.000Z');
  return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===match[1]?match[1]:null;
}
function focalExactDate(row,keys,expected){
  const raw=keys.map(k=>row?.[k]).filter(v=>v!==undefined&&v!==null&&text(v)!=='');
  return raw.length>0&&raw.every(v=>focalDate(v)===expected);
}
const focalPaymentProtected=r=>paid(r)||!!(r&&(r.conciliado||r.reportado||r.validadoReporte||r.fechaPagoReportada));
function focalIdentity(spec,entry){
  const p=entry.policy||{},aliases=focalUnique(FOCAL_NUMBER_KEYS.map(k=>focalNormalize(p[k])));
  const hashes=aliases.map(v=>crypto.createHash('sha256').update(v).digest('hex'));
  return {
    numberMatched:hashes.includes(spec.policyNumberHash),numberAliasesConflict:hashes.length!==1,
    countryVerified:focalCountryGT(p),currencyVerified:focalCurrencyGTQ(p),
    clientVerified:!!entry.client&&!!focalRef(p,FOCAL_CLIENT_REFS)&&focalCountryGT(entry.client)&&
      focalNames(entry.client).some(v=>focalHash(v)===spec.clientNameHash),
    insurerVerified:!!entry.insurer&&!!focalRef(p,FOCAL_INSURER_REFS)&&
      focalNames(entry.insurer).some(v=>spec.insurerNameHashes.includes(focalHash(v))),
    termVerified:focalExactDate(p,FOCAL_START_KEYS,spec.termStart)&&focalExactDate(p,FOCAL_END_KEYS,spec.termEnd)
  };
}
function assessDocumentaryFocal(spec,snapshot){
  const entries=snapshot.editions||[],out={id:spec.id,sourceKind:spec.sourceKind,
    sourcePdfSha256:spec.sourcePdfSha256,sourcePaid:false,paymentApplicationAuthorized:false,
    writes:0,certifiedApplied:0,scannedPolicyCount:snapshot.scannedPolicyCount||0,
    policyNumberMatches:entries.length,exactEditionMatches:0,exactRequirementMatches:0,
    currentStatus:'HOLD_FOCAL_UNVERIFIED',scanCoverage:{policyAliasFields:FOCAL_NUMBER_KEYS.length,
      policyCap:FOCAL_POLICY_CAP,linkedCap:FOCAL_LINKED_CAP,proposalCap:FOCAL_PROPOSAL_CAP},
    opsLinkedCount:snapshot.opsLinkedCount??null,opsLinkCoverage:'gestiones.polizaId_only',
    opsAbsenceProven:false,activeProposalMatches:snapshot.activeProposalMatches??null,
    activeLedgerPresent:snapshot.activeLedgerPresent===true};
  if(spec.currency!=='GTQ'){out.currentStatus='HOLD_FOCAL_SOURCE_CURRENCY';return out;}
  if(snapshot.policyScanTruncated){out.currentStatus='HOLD_FOCAL_POLICY_SCAN_TRUNCATED';return out;}
  if(snapshot.linkedScanTruncated||snapshot.proposalScanTruncated){out.currentStatus='HOLD_FOCAL_LINKED_SCAN_TRUNCATED';return out;}
  if(!entries.length){out.currentStatus='HOLD_FOCAL_POLICY_NOT_FOUND';return out;}
  const identities=entries.map(e=>focalIdentity(spec,e));out.editionChecks=identities;
  if(identities.some(x=>!x.numberMatched||x.numberAliasesConflict)){out.currentStatus='HOLD_FOCAL_POLICY_ALIAS_CONFLICT';return out;}
  if(identities.some(x=>!x.countryVerified)){out.currentStatus='HOLD_FOCAL_POLICY_COUNTRY';return out;}
  const eligible=identities.map((x,i)=>({x,i})).filter(({x})=>x.termVerified&&x.clientVerified&&x.insurerVerified);
  out.exactEditionMatches=eligible.length;
  if(eligible.length!==1){out.currentStatus=eligible.length?'HOLD_FOCAL_DUPLICATE_EXACT_EDITION':
    identities.some(x=>x.termVerified)?'HOLD_FOCAL_CLIENT_OR_INSURER_IDENTITY':'HOLD_FOCAL_CURRENT_EDITION_NOT_FOUND';return out;}
  const index=eligible[0].i,target=entries[index],receipts=target.receipts||[],payments=target.cobros||[];
  if(!identities[index].currencyVerified){out.currentStatus='HOLD_FOCAL_POLICY_CURRENCY';return out;}
  const matches=entries.flatMap((e,i)=>(e.receipts||[]).filter(r=>numbers(r).some(v=>focalRequirementHash(v)===spec.requirementHash)).map(r=>({r,i})));
  out.receiptCount=receipts.length;out.cobroCount=payments.length;out.exactRequirementMatches=matches.length;
  out.sameDueAmountCandidates=receipts.filter(r=>amount(r)===spec.cents&&focalExactDate(r,['fechaLimite','vence','fechaVencimiento'],spec.due)).length;
  if(matches.length!==1){out.currentStatus=matches.length?'HOLD_FOCAL_DUPLICATE_REQUIREMENT':'HOLD_FOCAL_REQUIREMENT_NOT_LINKED';return out;}
  if(matches[0].i!==index){out.currentStatus='HOLD_FOCAL_REQUIREMENT_OTHER_EDITION';return out;}
  const receipt=matches[0].r;
  if(focalCountries(receipt).some(x=>x!=='GT')){out.currentStatus='HOLD_FOCAL_RECEIPT_COUNTRY';return out;}
  out.receiptCurrencyVerified=focalCurrencyGTQ(receipt);
  if(!out.receiptCurrencyVerified){out.currentStatus='HOLD_FOCAL_RECEIPT_CURRENCY';return out;}
  out.amountVerified=amount(receipt)===spec.cents;
  out.dueVerified=focalExactDate(receipt,['fechaLimite','vence','fechaVencimiento'],spec.due);
  const explicitSourceRefs=sourceRefKeys.map(k=>text(receipt[k])).filter(Boolean);
  out.sourceReferencesConsistent=explicitSourceRefs.length>0&&explicitSourceRefs
    .every(v=>focalRequirementHash(v)===spec.requirementHash);
  if(!out.amountVerified||!out.dueVerified){out.currentStatus='HOLD_FOCAL_DUE_OR_AMOUNT';return out;}
  if(!out.sourceReferencesConsistent){out.currentStatus='HOLD_FOCAL_EXTERNAL_REFERENCE_CONFLICT';return out;}
  out.linkedPaymentCount=payments.filter(c=>text(c.reciboId)===text(receipt.id)).length;
  out.paymentOrReportEvidence=focalPaymentProtected(receipt)||payments.some(c=>text(c.reciboId)===text(receipt.id)&&focalPaymentProtected(c));
  if(out.linkedPaymentCount>1){out.currentStatus='HOLD_FOCAL_DUPLICATE_LINKED_PAYMENT';return out;}
  out.currentStatus=out.paymentOrReportEvidence?'ALREADY_PAID_OR_REPORTED_PROTECTED_NO_WRITE':'ALREADY_PRESENT_PENDING_NO_WRITE';
  return out;
}
async function scanDocumentaryFocal(db,spec=DOCUMENTARY_FOCAL){
  const tenant=db.collection('tenants').doc('alianzas-soluciones');
  const col=name=>tenant.collection('data').doc(name).collection('items');
  const policyRead=await col('polizas').select(...FOCAL_POLICY_FIELDS).limit(FOCAL_POLICY_CAP).get();
  const snapshot={scannedPolicyCount:policyRead.size,policyScanTruncated:policyRead.size>=FOCAL_POLICY_CAP,
    linkedScanTruncated:false,proposalScanTruncated:false,editions:[],opsLinkedCount:null,
    activeProposalMatches:null,activeLedgerPresent:false};
  if(snapshot.policyScanTruncated)return assessDocumentaryFocal(spec,snapshot);
  const found=policyRead.docs.filter(d=>FOCAL_NUMBER_KEYS.some(k=>text(d.data()?.[k])&&focalHash(d.data()[k])===spec.policyNumberHash));
  if(found.length>=24){snapshot.linkedScanTruncated=true;return assessDocumentaryFocal(spec,snapshot);}
  const rawEvidence={policies:found.map(d=>({...d.data(),id:d.id})),editions:[],ops:[],proposals:[]};
  const linkedRows=async(name,id,fields)=>{
    const read=await col(name).where('polizaId','==',id).select(...fields).limit(FOCAL_LINKED_CAP).get();
    if(read.size>=FOCAL_LINKED_CAP)snapshot.linkedScanTruncated=true;
    return read.docs.map(d=>({...d.data(),id:d.id})).sort((a,b)=>a.id.localeCompare(b.id));
  };
  for(const document of found){
    const policy=document.data()||{},clientId=focalRef(policy,FOCAL_CLIENT_REFS),insurerId=focalRef(policy,FOCAL_INSURER_REFS);
    const [clientRead,insurerRead,receipts,cobros,ops]=await Promise.all([
      clientId?col('clientes').doc(clientId).get():null,
      insurerId?col('aseguradoras').doc(insurerId).get():null,
      linkedRows('recibosEsperados',document.id,FOCAL_RECEIPT_FIELDS),
      linkedRows('cobros',document.id,FOCAL_RECEIPT_FIELDS),
      linkedRows('gestiones',document.id,['polizaId','policyId','clienteId','estado','tipo'])
    ]);
    const project=(read,fields)=>read?.exists?Object.fromEntries(fields.filter(k=>read.data()?.[k]!==undefined).map(k=>[k,read.data()[k]])):null;
    const entry={policy,client:project(clientRead,[...FOCAL_NAME_FIELDS,...FOCAL_COUNTRY_KEYS]),
      insurer:project(insurerRead,FOCAL_NAME_FIELDS),receipts,cobros};
    snapshot.editions.push(entry);rawEvidence.editions.push(entry);rawEvidence.ops.push(...ops);
  }
  snapshot.opsLinkedCount=found.length?new Set(rawEvidence.ops.map(r=>r.id)).size:null;
  const pointer=await col('cobrosLedgerControl').doc('active').get();
  const runId=text(pointer.data()?.activeRunId);snapshot.activeLedgerPresent=!!runId;
  if(runId){
    if(!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{1,179}$/.test(runId))throw Error('I66_A1_A4_FOCAL_LEDGER_ID_INVALID');
    const proposals=await col('cobrosLedgerRuns').doc(runId).collection('propuestasConciliacion')
      .select('policyNumber','numeroPoliza','polizaNumero','polizaId','policyId','reciboId','receiptId','estado','status')
      .limit(FOCAL_PROPOSAL_CAP).get();
    snapshot.proposalScanTruncated=proposals.size>=FOCAL_PROPOSAL_CAP;
    const policyIds=found.map(d=>d.id);
    rawEvidence.proposals=proposals.docs.map(d=>({...d.data(),id:d.id})).filter(r=>
      ['policyNumber','numeroPoliza','polizaNumero'].some(k=>text(r[k])&&focalHash(r[k])===spec.policyNumberHash)||
      ['polizaId','policyId'].some(k=>policyIds.includes(text(r[k]))));
    snapshot.activeProposalMatches=rawEvidence.proposals.length;
    rawEvidence.activeRunId=runId;
  }
  const out=assessDocumentaryFocal(spec,snapshot);
  out.snapshotFingerprint=crypto.createHash('sha256').update(JSON.stringify(rawEvidence)).digest('hex');
  return out;
}
function observationMetadata(now=new Date(),sourceSha=process.env.GITHUB_SHA){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{
    timeZone:'America/Guatemala',year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(now).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  return {observedAtUtc:now.toISOString(),
    observationDateGuatemala:parts.year+'-'+parts.month+'-'+parts.day,
    sourceReviewDateGuatemala:'2026-11-13',
    ...(typeof sourceSha==='string'&&/^[a-f0-9]{40}$/.test(sourceSha)&&sourceSha.length===40?{workflowSourceSha:sourceSha}:{})};
}

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
  const focalFirst=await scanDocumentaryFocal(db),focalSecond=await scanDocumentaryFocal(db);
  if(JSON.stringify(focalFirst)!==JSON.stringify(focalSecond))throw Error('I66_A1_A4_FOCAL_CONCURRENT_CHANGE');
  const bantrabRows=first.filter(x=>x.id.startsWith('A3.'));
  const previous=bantrabRows.filter(x=>BANTRAB_PREVIOUSLY_WRITTEN.includes(x.id));
  const remaining=bantrabRows.filter(x=>!BANTRAB_PREVIOUSLY_WRITTEN.includes(x.id));
  const matched=x=>x.exactRequirementMatches===1&&x.exactAmountEditions===1;
  const report={schema:'gi.i66.cartera.a1-a4-a7.readonly.v4',dateGuatemala:'2026-11-13',
    ...observationMetadata(),
    project:'ays-orbit-360-lab',cases:first,totalCases:first.length,writes:0,
    documentaryFocalReadback:focalFirst,
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
module.exports={CASES,SOURCE_SHA256,BANTRAB_PREVIOUSLY_WRITTEN,assess,resolveEditions,numbers,amount,paid,policyVariants,
  DOCUMENTARY_FOCAL,FOCAL_POLICY_CAP,FOCAL_LINKED_CAP,FOCAL_PROPOSAL_CAP,FOCAL_NUMBER_KEYS,
  focalNormalize,focalHash,focalRequirementHash,focalIdentity,assessDocumentaryFocal,scanDocumentaryFocal,observationMetadata};
