'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {CASES,SOURCE_SHA256,BANTRAB_PREVIOUSLY_WRITTEN,assess,resolveEditions,policyVariants}=require('./gravicentra-i66-cartera-a1-a4-readonly.cjs');
assert.equal(SOURCE_SHA256.mapfrePendingNov,'29a42705ae6f7b2b42693f51a27a0b1f4ced279e2259b28ce021ff7b21ccefb0');
assert.equal(SOURCE_SHA256.bantrabNov04,'b945a98c7c572909c643be4c849a7526a363eb490cdcf24ac8d0ae54ca3025b7');
assert.equal(CASES.length,37,'A1_PAID_THREE_A2_SEVENTEEN_A3_FOURTEEN_A4_TWO_A7_ONE');
assert.equal(new Set(CASES.map(x=>x.id)).size,CASES.length,'UNIQUE_SOURCE_CASE_IDS');
assert.equal(CASES.filter(x=>x.id.startsWith('A1.')).length,3);
assert.equal(CASES.filter(x=>x.id.startsWith('A2.')).length,17);
assert.equal(CASES.filter(x=>x.id.startsWith('A3.')).length,14);
assert.equal(BANTRAB_PREVIOUSLY_WRITTEN.length,7);
assert.equal(new Set(BANTRAB_PREVIOUSLY_WRITTEN).size,7);
assert.ok(BANTRAB_PREVIOUSLY_WRITTEN.every(id=>CASES.some(x=>x.id===id&&x.insurer==='BANTRAB')));
assert.equal(CASES.filter(x=>x.id.startsWith('A4.')).length,2);
assert.equal(CASES.filter(x=>x.id.startsWith('A7.')).length,1);
assert.equal(CASES.filter(x=>x.id.startsWith('A2.')).reduce((s,x)=>s+x.cents,0),1061230,'SOURCE_MAPFRE_DETAILS_NO_DOUBLE_SUBTOTAL');
assert.equal(CASES.filter(x=>x.id.startsWith('A3.')).reduce((s,x)=>s+x.cents,0),426356,'SOURCE_BANTRAB_DETAILS_NO_DOUBLE_SUBTOTAL');
assert.ok(policyVariants("'3002100014247").includes('3002100014247'));
assert.ok(policyVariants('SC-79849').includes('SC 79849'));
assert.equal(CASES.find(x=>x.id==='A3.B9').due,'2027-04-21','BANTRAB_10_OF_10_NO_2026_GHOST');
const ficohsa=CASES.find(x=>x.id==='A7.F1');
assert.ok(ficohsa&&ficohsa.sourceBasis==='OCTOBER_COMMISSION_INFERENCE_REQUIRES_EXACT_POLICY_RECEIPT_MATCH');
assert.equal(ficohsa.cents,270480);
const readonly=fs.readFileSync(require('node:path').join(__dirname,'gravicentra-i66-cartera-a1-a4-readonly.cjs'),'utf8');
assert.ok(readonly.includes("one.id==='A7.F1'")&&readonly.includes("'numeroPoliza','numero_poliza'")&&
 readonly.includes('seen.add(d.id)')&&!readonly.includes('found.set('),'A7_EXACT_POLICY_NUMBER_ALIASES_DEDUP_REQUIRED');
assert.ok(readonly.includes("doc('alianzas-soluciones')")&&!readonly.includes('listDocuments()'),'TENANT_BOUND_NO_CROSS_TENANT_SCANNING');
for(const pattern of [/\.set\s*\(/,/\.delete\s*\(/,/\.batch\s*\(/,/\.runTransaction\s*\(/,/\.updateDurable\s*\(/,/\.createUser\s*\(/,/\.setCustomUserClaims\s*\(/])
 assert.ok(!pattern.test(readonly),'PROTECTED_WORKFLOW_READONLY_GUARD_MUST_PASS');
assert.equal(assess(ficohsa,{policies:[]}).currentStatus,'HOLD_POLICY_NOT_FOUND');
assert.equal(assess(ficohsa,{policies:[{pais:'GT'}],clientExists:true,receipts:[],cobros:[]}).currentStatus,
 'HOLD_EXACT_REQUIREMENT_NOT_LINKED');
const c=CASES[1],policy={id:'p',numero:c.policy,pais:'GT'},clientExists=true;
const receipt={id:'r',polizaId:'p',numeroReciboFuente:c.requirement,monto:c.cents/100,estado:'Pendiente'};
const snap=(over={})=>Object.assign({policies:[policy],clientExists,receipts:[receipt],cobros:[]},over);
assert.equal(assess(c,snap()).currentStatus,'PAID_SOURCE_UNPAID_LIVE_CANDIDATE_SIGNED_CAS_REQUIRED');
assert.equal(assess(c,snap({receipts:[{...receipt,estado:'Pagado'}]})).currentStatus,'ALREADY_RECORDED_NO_WRITE');
assert.equal(assess(c,snap({receipts:[]})).currentStatus,'HOLD_EXACT_REQUIREMENT_NOT_LINKED');
assert.equal(assess(c,snap({receipts:[{...receipt,monto:0}]})).currentStatus,'HOLD_SOURCE_AMOUNT_DIFF');
assert.equal(assess(c,snap({clientExists:false})).currentStatus,'HOLD_IDENTITY_OR_COUNTRY');
assert.equal(assess(c,snap({policies:[policy,policy]})).currentStatus,'HOLD_MULTIPLE_POLICY_EDITIONS');
assert.equal(assess(c,snap({cobros:[{reciboId:'r',estado:'Pagado'}]})).currentStatus,'ALREADY_RECORDED_NO_WRITE');
assert.equal(assess(c,snap({cobros:[{reciboId:'r'},{reciboId:'r'}]})).currentStatus,'HOLD_PAYMENT_DUPLICATE');
const future=CASES.find(x=>x.id==='A2.M1');
assert.equal(assess(future,snap({receipts:[{...receipt,numeroReciboFuente:future.requirement,monto:0}]})).currentStatus,'HOLD_SOURCE_AMOUNT_DIFF');
assert.equal(assess(future,snap({receipts:[{...receipt,numeroReciboFuente:future.requirement,monto:future.cents/100}]})).currentStatus,'PENDING_FUTURE_NO_PAID_WRITE');
const unrelated=snap({policies:[{...policy,id:'other'}],receipts:[]});
assert.equal(resolveEditions(c,[unrelated,snap()]).candidateEditionIndex,2);
assert.equal(resolveEditions(c,[unrelated,snap()]).currentStatus,'PAID_SOURCE_UNPAID_LIVE_CANDIDATE_SIGNED_CAS_REQUIRED');
assert.equal(resolveEditions(c,[snap(),snap()]).currentStatus,'HOLD_MULTIPLE_EXACT_PAYMENT_EDITIONS');
assert.equal(resolveEditions(c,[unrelated,unrelated]).currentStatus,'HOLD_NO_EXACT_REQUIREMENT_IN_ANY_EDITION');
assert.equal(resolveEditions(c,[]).currentStatus,'HOLD_POLICY_NOT_FOUND');
assert.equal(resolveEditions(c,[snap({clientExists:false}),unrelated]).currentStatus,'HOLD_NO_EXACT_REQUIREMENT_IN_ANY_EDITION');
const clue=assess(c,snap({receipts:[{...receipt,numeroReciboFuente:'',vence:'2026-11-03',secuencia:2}]}));
assert.equal(clue.amountCandidateReadback[0].due,'2026-11-03');
assert.equal(clue.amountCandidateReadback[0].sourceNumberMatched,false);
assert.equal(clue.amountCandidateReadback[0].hasExternalNumber,false);
assert.equal(clue.policyValidity.start,null);
assert.equal(clue.sourceDueExactAmountMatches,null);
const dueCase=CASES.find(x=>x.id==='A2.M1');
assert.equal(assess(dueCase,snap({receipts:[{...receipt,numeroReciboFuente:'',monto:2497.15,fechaVencimiento:'2026-11-30'}]})).sourceDueExactAmountMatches,1,'READONLY_DUE_AMOUNT_CANDIDATE_NOT_PAYMENT_PROOF');
const {DOCUMENTARY_FOCAL,FOCAL_POLICY_CAP,FOCAL_LINKED_CAP,FOCAL_PROPOSAL_CAP,FOCAL_NUMBER_KEYS,
 focalNormalize,focalHash,focalRequirementHash,assessDocumentaryFocal,scanDocumentaryFocal,observationMetadata}=require('./gravicentra-i66-cartera-a1-a4-readonly.cjs');
let focalChecks=0;
const check=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);focalChecks++;};
check(FOCAL_POLICY_CAP,2000,'bounded server-side policy projection');
check(FOCAL_LINKED_CAP,80,'bounded linked records');
check(FOCAL_PROPOSAL_CAP,250,'bounded active ledger projection');
check(FOCAL_NUMBER_KEYS.length,11,'all exact existing policy number aliases');
check(DOCUMENTARY_FOCAL.sourcePaid,false,'issued requirement is not proof of paid');
check(DOCUMENTARY_FOCAL.paymentApplicationAuthorized,false,'no payment permit');
check(DOCUMENTARY_FOCAL.currency,'GTQ','issued-document currency binding');
check(observationMetadata(new Date('2026-11-17T05:59:00Z'),'b'.repeat(40)),{
 observedAtUtc:'2026-11-17T05:59:00.000Z',observationDateGuatemala:'2026-11-16',
 sourceReviewDateGuatemala:'2026-11-13',workflowSourceSha:'b'.repeat(40)
},'real observation UTC/Guatemala separate from source review date');
check(observationMetadata(new Date('2026-11-17T06:00:00Z'),'bad').observationDateGuatemala,'2026-11-17','Guatemala midnight rollover');
check(Object.hasOwn(observationMetadata(new Date('2026-11-17T05:59:00Z'),'b'.repeat(40)+'\n'),'workflowSourceSha'),false,'malformed workflow SHA not attested');
check(Object.hasOwn(observationMetadata(new Date('2026-11-17T05:59:00Z'),null),'workflowSourceSha'),false,'no invented workflow source');
for(const k of ['policyNumberHash','requirementHash','clientNameHash','sourcePdfSha256'])check(/^[a-f0-9]{64}$/.test(DOCUMENTARY_FOCAL[k]),true,'hashed binding '+k);
check(focalNormalize('Clíente  Ｐｒｕｅｂａ'),'CLIENTEPRUEBA','NFKD exact canonical normalization');
check(focalRequirementHash('REQ-501'),focalRequirementHash('501'),'only issued REQ prefix form');
check(focalRequirementHash(' req - 501 '),focalRequirementHash('501'),'whitespace and case format');
check(focalRequirementHash('REQ501'),null,'unproven prefix form not accepted');
check(focalRequirementHash('501x'),null,'no fuzzy numeric extraction');
check(focalRequirementHash('0501')===focalRequirementHash('501'),false,'no leading-zero inference');
const spec={...DOCUMENTARY_FOCAL,id:'QA.DOC.1',sourcePdfSha256:'a'.repeat(64),
 policyNumberHash:focalHash('QA-DOC-42'),requirementHash:focalRequirementHash('501'),
 clientNameHash:focalHash('Cliente Prueba'),insurerNameHashes:[focalHash('QA Seguro')],
 termStart:'2026-09-25',termEnd:'2027-09-25',due:'2026-11-06',cents:97878};
const fp={policyNumber:'QA DOC 42',pais:'GT',moneda:'GTQ',clienteId:'private-client-01',aseguradoraId:'private-insurer-01',
 vigenciaInicio:spec.termStart,vigenciaFin:spec.termEnd};
const fr={id:'private-receipt-01',polizaId:'private-policy-01',numeroReciboFuente:'REQ-501',
 monto:978.78,moneda:'GTQ',fechaLimite:spec.due,estado:'Pendiente'};
const entry=()=>({policy:{...fp},client:{nombreCompleto:'Clíente Prueba',pais:'Guatemala'},
 insurer:{nombre:'QA Seguro'},receipts:[{...fr}],cobros:[]});
const focalSnapshot=(entries=[entry()],extra={})=>({scannedPolicyCount:30,editions:entries,...extra});
const judge=(entries=[entry()],extra={})=>assessDocumentaryFocal(spec,focalSnapshot(entries,extra));
check(judge().currentStatus,'ALREADY_PRESENT_PENDING_NO_WRITE','exact issued requirement existing');
check(judge([]).currentStatus,'HOLD_FOCAL_POLICY_NOT_FOUND','no policy scoped projection only');
check(judge([],{policyScanTruncated:true}).currentStatus,'HOLD_FOCAL_POLICY_SCAN_TRUNCATED','cap never proves absence');
check(judge([entry()],{linkedScanTruncated:true}).currentStatus,'HOLD_FOCAL_LINKED_SCAN_TRUNCATED','linked cap');
check(judge([entry()],{proposalScanTruncated:true}).currentStatus,'HOLD_FOCAL_LINKED_SCAN_TRUNCATED','proposal cap');
let fe=entry();fe.policy.numero='QA-OTHER';check(judge([fe]).currentStatus,'HOLD_FOCAL_POLICY_ALIAS_CONFLICT','conflicting alias');
fe=entry();fe.policy.pais='CO';check(judge([fe]).currentStatus,'HOLD_FOCAL_POLICY_COUNTRY','country not widened');
fe=entry();delete fe.policy.pais;check(judge([fe]).currentStatus,'HOLD_FOCAL_POLICY_COUNTRY','missing country');
fe=entry();fe.policy.country='CO';check(judge([fe]).currentStatus,'HOLD_FOCAL_POLICY_COUNTRY','conflicting country');
fe=entry();delete fe.policy.moneda;check(judge([fe]).currentStatus,'HOLD_FOCAL_POLICY_CURRENCY','country cannot substitute missing currency');
fe=entry();fe.policy.moneda='USD';check(judge([fe]).currentStatus,'HOLD_FOCAL_POLICY_CURRENCY','foreign policy currency');
fe=entry();fe.policy.currency='USD';check(judge([fe]).currentStatus,'HOLD_FOCAL_POLICY_CURRENCY','conflicting policy currency aliases');
check(assessDocumentaryFocal({...spec,currency:undefined},focalSnapshot()).currentStatus,'HOLD_FOCAL_SOURCE_CURRENCY','source currency mandatory');
check(assessDocumentaryFocal({...spec,currency:'USD'},focalSnapshot()).currentStatus,'HOLD_FOCAL_SOURCE_CURRENCY','source currency not overridden');
fe=entry();fe.client.pais='CO';check(judge([fe]).currentStatus,'HOLD_FOCAL_CLIENT_OR_INSURER_IDENTITY','client country exact');
fe=entry();fe.client.nombreCompleto='Cliente Distinto';check(judge([fe]).currentStatus,'HOLD_FOCAL_CLIENT_OR_INSURER_IDENTITY','client name hash');
fe=entry();fe.client=null;check(judge([fe]).currentStatus,'HOLD_FOCAL_CLIENT_OR_INSURER_IDENTITY','missing linked client');
fe=entry();fe.insurer=null;check(judge([fe]).currentStatus,'HOLD_FOCAL_CLIENT_OR_INSURER_IDENTITY','missing insurer join');
fe=entry();fe.insurer.nombre='QA Otra';check(judge([fe]).currentStatus,'HOLD_FOCAL_CLIENT_OR_INSURER_IDENTITY','insurer not assumed');
fe=entry();delete fe.policy.aseguradoraId;check(judge([fe]).currentStatus,'HOLD_FOCAL_CLIENT_OR_INSURER_IDENTITY','inline name not sufficient');
fe=entry();fe.policy.vigenciaInicio='2025-09-25';check(judge([fe]).currentStatus,'HOLD_FOCAL_CURRENT_EDITION_NOT_FOUND','old term not current');
fe=entry();fe.policy.startDate='2025-09-25';check(judge([fe]).currentStatus,'HOLD_FOCAL_CURRENT_EDITION_NOT_FOUND','conflicting term alias');
check(judge([entry(),entry()]).currentStatus,'HOLD_FOCAL_DUPLICATE_EXACT_EDITION','duplicate current edition');
const older=entry();older.policy.vigenciaInicio='2025-09-25';older.policy.vigenciaFin='2026-09-25';older.receipts=[];
check(judge([older,entry()]).currentStatus,'ALREADY_PRESENT_PENDING_NO_WRITE','historical edition preserved');
fe=entry();fe.receipts=[];check(judge([fe]).currentStatus,'HOLD_FOCAL_REQUIREMENT_NOT_LINKED','no source receipt no write');
fe=entry();fe.receipts[0].numeroReciboFuente='';check(judge([fe]).sameDueAmountCandidates,1,'amount/date candidate does not confer identity');
check(judge([fe]).currentStatus,'HOLD_FOCAL_REQUIREMENT_NOT_LINKED','no number amount-only stays hold');
fe=entry();fe.receipts.push({...fr,id:'private-receipt-02'});check(judge([fe]).currentStatus,'HOLD_FOCAL_DUPLICATE_REQUIREMENT','duplicate requirement');
const oldWithReceipt=structuredClone(older);oldWithReceipt.receipts=[{...fr}];fe=entry();fe.receipts=[];
check(judge([oldWithReceipt,fe]).currentStatus,'HOLD_FOCAL_REQUIREMENT_OTHER_EDITION','receipt assigned to old edition');
fe=entry();fe.receipts[0].monto=978.77;check(judge([fe]).currentStatus,'HOLD_FOCAL_DUE_OR_AMOUNT','source cent exact');
fe=entry();fe.receipts[0].fechaLimite='2026-11-07';check(judge([fe]).currentStatus,'HOLD_FOCAL_DUE_OR_AMOUNT','source due exact');
fe=entry();fe.receipts[0].vence='2026-11-07';check(judge([fe]).currentStatus,'HOLD_FOCAL_DUE_OR_AMOUNT','due aliases agree');
fe=entry();fe.receipts[0].pais='CO';check(judge([fe]).currentStatus,'HOLD_FOCAL_RECEIPT_COUNTRY','receipt explicit country');
fe=entry();delete fe.receipts[0].moneda;check(judge([fe]).currentStatus,'HOLD_FOCAL_RECEIPT_CURRENCY','receipt currency mandatory');
fe=entry();fe.receipts[0].moneda='USD';check(judge([fe]).currentStatus,'HOLD_FOCAL_RECEIPT_CURRENCY','foreign receipt currency');
fe=entry();fe.receipts[0].currency='USD';check(judge([fe]).currentStatus,'HOLD_FOCAL_RECEIPT_CURRENCY','conflicting receipt currency aliases');
fe=entry();fe.receipts[0].moneda='Quetzales';check(judge([fe]).currentStatus,'ALREADY_PRESENT_PENDING_NO_WRITE','explicit GTQ denomination');
fe=entry();fe.receipts[0].numeroRequerimiento='502';check(judge([fe]).currentStatus,'HOLD_FOCAL_EXTERNAL_REFERENCE_CONFLICT','occupied source ref protected');
fe=entry();delete fe.receipts[0].numeroReciboFuente;fe.receipts[0].numeroFactura='501';check(judge([fe]).currentStatus,'HOLD_FOCAL_EXTERNAL_REFERENCE_CONFLICT','invoice-only collision not insurer requirement proof');
fe=entry();fe.receipts[0].reportado=true;check(judge([fe]).currentStatus,'ALREADY_PAID_OR_REPORTED_PROTECTED_NO_WRITE','reported payment protected');
fe=entry();fe.cobros=[{reciboId:fr.id,estado:'Pagado'}];check(judge([fe]).currentStatus,'ALREADY_PAID_OR_REPORTED_PROTECTED_NO_WRITE','linked paid protected');
fe.cobros.push({reciboId:fr.id});check(judge([fe]).currentStatus,'HOLD_FOCAL_DUPLICATE_LINKED_PAYMENT','duplicate linked payments');
for(const output of [judge(),judge([fe]),judge([])]){
 check(output.writes,0,'no writes');check(output.certifiedApplied,0,'no accreditation');
 check(output.paymentApplicationAuthorized,false,'no paid authority');
 const serialized=JSON.stringify(output);
 for(const value of ['QA-DOC-42','QA DOC 42','REQ-501','Cliente Prueba','private-client-01','private-receipt-01','private-policy-01'])
  check(serialized.includes(value),false,'no source identities or raw IDs in output');
}

// Fake Firestore enforces the same query shapes. No emulator or external call.
async function runtimeFocalChecks(){
 const root='tenants/alianzas-soluciones/data/',at=k=>root+k+'/items';
 const rows={
  [at('polizas')]:[{id:'private-policy-01',data:{...fp,unneededPrivateField:'omit-me'}}],
  [at('clientes')]:[{id:'private-client-01',data:{nombreCompleto:'Cliente Prueba',pais:'GT'}}],
  [at('aseguradoras')]:[{id:'private-insurer-01',data:{nombre:'QA Seguro'}}],
  [at('recibosEsperados')]:[{id:fr.id,data:{...fr}}],
  [at('cobros')]:[],[at('gestiones')]:[],[at('cobrosLedgerControl')]:[]
 };
 const calls=[];
 function query(path='',filters=[],bound=Infinity,fields=null,document=false){return{
  collection:k=>query(path?path+'/'+k:k),doc:k=>query(path+'/'+k,[],Infinity,null,true),
  where:(k,op,v)=>{assert.equal(op,'==');return query(path,[...filters,[k,v]],bound,fields);},
  select:(...keys)=>query(path,filters,bound,keys),limit:n=>query(path,filters,n,fields),
  get:async()=>{calls.push({path,fields,bound,document});
   if(document){const parts=path.split('/'),id=parts.pop(),r=(rows[parts.join('/')]||[]).find(x=>x.id===id);return{exists:!!r,data:()=>r?.data};}
   const selected=(rows[path]||[]).filter(r=>filters.every(([k,v])=>r.data[k]===v)).slice(0,bound);
   return{size:selected.length,docs:selected.map(r=>({id:r.id,data:()=>fields?Object.fromEntries(fields.filter(k=>r.data[k]!==undefined).map(k=>[k,r.data[k]])):r.data}))};
  }
 };}
 const db=query(),first=await scanDocumentaryFocal(db,spec),second=await scanDocumentaryFocal(db,spec);
 check(first,second,'stable double read');check(first.currentStatus,'ALREADY_PRESENT_PENDING_NO_WRITE','runtime exact original matching');
 check(calls.filter(x=>x.path===at('polizas')).every(x=>x.bound===2000&&x.fields.length>11),true,'projection+server cap mandatory');
 check(calls.every(x=>!x.path.startsWith('tenants/other')),true,'single tenant only');
 check(calls.some(x=>x.path===at('gestiones'))&&!calls.some(x=>x.path===at('ops')),true,'canonical Ops owner collection');
 check(first.opsLinkCoverage,'gestiones.polizaId_only','precise relationship coverage');
 check(first.opsAbsenceProven,false,'no false whole-Ops absence');
 check(JSON.stringify(first).includes('private-'),false,'runtime raw IDs never emitted');
 check(/^[a-f0-9]{64}$/.test(first.snapshotFingerprint),true,'full private snapshot fingerprint');
 rows[at('recibosEsperados')][0].data.monto=1;
 check((await scanDocumentaryFocal(db,spec)).snapshotFingerprint!==first.snapshotFingerprint,true,'before/after fingerprint reacts');
 rows[at('recibosEsperados')]=Array.from({length:80},(_,i)=>({id:'r'+i,data:{...fr}}));
 check((await scanDocumentaryFocal(db,spec)).currentStatus,'HOLD_FOCAL_LINKED_SCAN_TRUNCATED','linked runtime cap detected');
 rows[at('polizas')]=Array.from({length:2000},(_,i)=>({id:'p'+i,data:{policyNumber:'QA-OTHER-'+i}}));
 const capped=await scanDocumentaryFocal(db,spec);
 check(capped.currentStatus,'HOLD_FOCAL_POLICY_SCAN_TRUNCATED','capped scan is not absence');
 check(capped.scannedPolicyCount,2000,'actual cap disclosed');
}
runtimeFocalChecks().then(()=>console.log('I66_CARTERA_A1_A4_A7_PROTECTED_SOURCE_RECONCILIATION_PASS source_only no_data_writes focal_checks='+focalChecks))
 .catch(error=>{console.error(error);process.exitCode=1;});
