'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const repo=process.env.I66_SIX_TEST_REPO||path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(__dirname,'gravicentra-i66-live-performance-readonly.mjs'),'utf8');
const workflow=fs.readFileSync(path.join(__dirname,'../.github/workflows/gravicentra-i66-live-performance-readonly.yml'),'utf8');
const authorityPath='artifacts/orbit360-recovery/release-control/I6_6_FINANCIAL_SIX_EXISTING_RECEIPTS_READBACK_20261123_RUN45272554046.json';
const bytes=fs.readFileSync(path.join(repo,authorityPath)),authority=JSON.parse(bytes),plain=x=>JSON.parse(JSON.stringify(x));
function harness(extra={}){
  const start=source.indexOf('// Existing bootstrap events only:'),end=source.indexOf('\nasync function run(){',start);
  assert.ok(start>0&&end>start);
  const context={require,URL,need:(ok,code)=>{if(!ok)throw Error(code);},norm:x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),
    fs:{readFileSync:()=>bytes},execFileSync:()=>bytes,pin:{sourceSha:'qa-source'},...extra};
  vm.runInNewContext(source.slice(start,end)+'\nthis.probe={validateSixSourceRow,certifySixReceiptUi,inspectSixReceiptBrowser,installBootstrapObservation,sixReceiptAuthority,sixServerSnapshot,sixServerBalanceProof,focalHash,sixFinancialInputs,sixExpectedBrowserInputs,sixFinancialInputMetadata,sixFinancialInputDifferences,SIX_FINANCIAL_FIELDS,isSixReceiptBusinessWrite,visibleCivilDate,sixVisibleValueChecks,sixVisibleValueDiagnostic,collectSixVisibleResult,sixUiReloadValues,showSixReceiptBalance,runSixReceiptUi,findFinancialActors,runFrontendFinancialMatrix};',context);
  return context;
}
function sourceRow(e=authority.rows[0]){
  return {receiptId:e.receiptId,portfolioId:e.portfolioId,policyId:authority.scope.policyId,portfolioPolicyId:authority.scope.policyId,
    portfolioReceiptId:e.receiptId,clientCoherent:true,requirement:e.sourceRequirement,contractualDue:e.contractualDueAfter,
    operationalLimit:e.operationalLimitBeforeAndAfter,currency:'GTQ',portfolioCurrency:'GTQ',grossCents:27826,portfolioGrossCents:27826,
    receiptState:{estado:'Pendiente'},portfolioState:{estado:'Pendiente',carteraActiva:true},portfolioMatches:1,cobrosTruncated:false,rollbackPresent:true,auditIdentity:true};
}
function uiFixture(e=authority.rows[0]){
  const r={id:e.receiptId,polizaId:authority.scope.policyId,clienteId:'qa-client',moneda:'GTQ',primaTotal:278.26,
    numeroReciboFuente:e.sourceRequirement,fechaVencimientoContractual:e.contractualDueAfter,fechaLimite:e.operationalLimitBeforeAndAfter,estado:'Pendiente'};
  const p={id:e.portfolioId,reciboId:e.receiptId,polizaId:authority.scope.policyId,clienteId:'qa-client',moneda:'GTQ',primaTotal:278.26,monto:278.26,estado:'Pendiente',carteraActiva:true};
  const policy={id:authority.scope.policyId,clienteId:'qa-client',pais:'GT',moneda:'GTQ',estado:'Vigente'};
  const dateLabel=iso=>{const [year,month,day]=iso.split('-');return day+' '+['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][Number(month)-1]+' '+year;};
  const cells={'Prima total':'Q 278.26','Vencimiento contractual documentado':dateLabel(e.contractualDueAfter),
    'Fecha límite operativa':dateLabel(e.operationalLimitBeforeAndAfter)};
  const root={getAttribute:()=>e.receiptId,querySelector(selector){
    if(selector==='[data-rp-detail-values]')return {children:Object.entries(cells).map(([k,v])=>({children:[{textContent:k},{textContent:v}]}))};
    if(selector==='[data-rp-hero-status]')return {textContent:'Pendiente'};
    if(selector==='[data-rp-current-balance]')return {textContent:'Saldo pendiente: '+(cells.balance||'Q 278.26'),getAttribute:()=>cells.balanceState||'open'};
    return null;
  }};
  const records={recibosEsperados:[r],carteraPrimas:[p],polizas:[policy],cobros:[]};
  const Orbit={store:{get:(name,id)=>(records[name]||[]).find(r=>r.id===id),all:name=>records[name]||[],_protectedCandidate:true,
      _productStatus:()=>({serverConfirmedCollections:['clientes','polizas','recibosEsperados','carteraPrimas','cobros'],snapshotErrors:{}})},
    auth:{productUser:{uid:'qa-actor',tenantId:'alianzas-soluciones'}},session:{rol:()=>'Operativo'},pais:'GT',
    ui:{fmtDate:()=> '02 nov 2026'},receiptsPortfolioProjection:{stateLabel:()=>({t:'Pendiente'})}};
  const window={Orbit};
  const h=harness({Orbit,window,CSS:{escape:x=>x},document:{querySelector:()=>root,querySelectorAll:()=>[root]}});
  // Use the actual financial classification and amount proof owners.
  vm.runInNewContext(fs.readFileSync(path.join(repo,'orbit360-platform/core/queries.js'),'utf8'),h);
  const server={...sourceRow(e),financialInputsFingerprint:h.probe.focalHash({receipt:h.probe.sixFinancialInputs(r),
    portfolio:h.probe.sixFinancialInputs(p),policy:h.probe.sixFinancialInputs(policy),cobros:[]})};
  return {h,e,r,p,policy,records,Orbit,cells,server,input:{expected:e,clientId:'qa-client',actorUid:'qa-actor',financialFields:plain(h.probe.SIX_FINANCIAL_FIELDS)}};
}
test('the exact real six-update receipt is digest pinned and altered authority or source bytes fail closed',()=>{
  const h=harness();assert.equal(h.probe.sixReceiptAuthority().execution.runId,45272554046);
  assert.throws(()=>harness({fs:{readFileSync:()=>Buffer.from('{}')}}).probe.sixReceiptAuthority(),/AUTHORITY_DIGEST_DRIFT/);
  assert.throws(()=>harness({execFileSync:()=>Buffer.from('old authority')}).probe.sixReceiptAuthority(),/AUTHORITY_SOURCE_PIN_DRIFT/);
});
test('all six exact source identities, due dates and unchanged amounts pass; crossed identities and doubles cannot pass',()=>{
  const h=harness();for(const e of authority.rows)h.probe.validateSixSourceRow(e,sourceRow(e));
  for(const [key,value] of [['receiptId',authority.rows[1].receiptId],['portfolioReceiptId',authority.rows[1].receiptId],
    ['policyId','foreign'],['clientCoherent',false],['portfolioMatches',2],['auditIdentity',false],['rollbackPresent',false],['cobrosTruncated',true]])
    assert.throws(()=>h.probe.validateSixSourceRow(authority.rows[0],{...sourceRow(),[key]:value}),/I66_SIX_SOURCE_/,key);
});
test('one-cent amount drift, wrong currency, requirement and either date are discriminated',()=>{
  const h=harness();
  for(const [key,value] of [['grossCents',27827],['portfolioGrossCents',27825],['currency','COP'],['requirement','5228534'],
    ['contractualDue','2026-11-03'],['operationalLimit','2026-11-03']])
    assert.throws(()=>h.probe.validateSixSourceRow(authority.rows[0],{...sourceRow(),[key]:value}),/I66_SIX_SOURCE_/,key);
});
test('actual browser read callback checks visible values with the real portfolio amount/classification owner',()=>{
  const {h,e,input,server}=uiFixture(),observed=h.probe.inspectSixReceiptBrowser(input);
  assert.equal(observed.balanceCents,27826);assert.equal(observed.amountProofSource,'CARTERA_EXPLICIT');
  h.probe.certifySixReceiptUi(e,server,observed);
  const after=h.probe.inspectSixReceiptBrowser(input);h.probe.certifySixReceiptUi(e,server,after);
  assert.equal(h.probe.focalHash(observed),h.probe.focalHash(after));
  assert.equal(observed.financialInputs,undefined);assert.match(observed.financialInputsFingerprint,/^[a-f0-9]{64}$/);
});
test('matching backing data cannot hide an incorrect visible amount or contractual date',()=>{
  for(const [field,value] of [['Prima total','Q 278.27'],['Vencimiento contractual documentado','03 nov 2026'],['Fecha límite operativa','03 nov 2026']]){
    const {h,e,input,cells,server}=uiFixture();cells[field]=value;
    assert.throws(()=>h.probe.certifySixReceiptUi(e,server,h.probe.inspectSixReceiptBrowser(input)),/VISIBLE_VALUES_OR_BALANCE_HOLD/,field);
  }
});
test('reload cannot silently change payment state, signed actor, protected scope or duplicate detail count',()=>{
  const {h,e,input,server}=uiFixture(),observed=h.probe.inspectSixReceiptBrowser(input);
  for(const [key,value] of [['actorMatches',false],['country','CO'],['protectedCandidate',false],['detailCount',2],['confirmed',false]])
    assert.throws(()=>h.probe.certifySixReceiptUi(e,server,{...observed,[key]:value}),/SCOPE_OR_READINESS_HOLD/,key);
  const changed=plain(observed);changed.source.receiptState.estado='Pagado';
  assert.throws(()=>h.probe.certifySixReceiptUi(e,server,changed),/UI_STATE_DIFFERS_FROM_SERVER/);
  assert.notEqual(h.probe.focalHash(observed),h.probe.focalHash(changed));
});
test('visible money preserves its sign and requires GTQ instead of accepting another currency',()=>{
  for(const text of ['Q -278.26','USD 278.26','US$ 278.26','COP 278.26','$ 278.26','278.26','Q 278,26']){
    const {h,e,input,cells,server}=uiFixture();cells['Prima total']=text;
    assert.throws(()=>h.probe.certifySixReceiptUi(e,server,h.probe.inspectSixReceiptBrowser(input)),/VISIBLE_VALUES_OR_BALANCE_HOLD/,text);
  }
  for(const text of ['Q -278.26','USD 278.26']){
    const {h,e,input,cells,server}=uiFixture();cells.balance=text;
    assert.throws(()=>h.probe.certifySixReceiptUi(e,server,h.probe.inspectSixReceiptBrowser(input)),/VISIBLE_VALUES_OR_BALANCE_HOLD/,text);
  }
});
test('civil date oracle is independent of the product formatter and rejects mutually matching wrong dates',()=>{
  const {h,e,input,cells,server,Orbit}=uiFixture();
  Orbit.ui.fmtDate=()=> '31 dic 1999';cells['Vencimiento contractual documentado']='31 dic 1999';cells['Fecha límite operativa']='31 dic 1999';
  assert.throws(()=>h.probe.certifySixReceiptUi(e,server,h.probe.inspectSixReceiptBrowser(input)),/VISIBLE_VALUES_OR_BALANCE_HOLD/);
  assert.equal(h.probe.visibleCivilDate('02 nov 2026'),'2026-11-02');
  assert.equal(h.probe.visibleCivilDate('02 abr. 2027'),'2027-04-02');
  assert.equal(h.probe.visibleCivilDate('31 feb 2027'),'');
});
test('stale browser balance aliases and payment inputs cannot certify a self-consistent but wrong UI',()=>{
  const cases=[['monto',100],['saldo',100],['conciliadoPago',true],['carteraActiva',false],['cobroId','qa-stale-payment']];
  for(const [key,value] of cases){
    const {h,e,input,cells,server,p}=uiFixture();p[key]=value;
    if(key==='monto')cells.balance='Q 100.00';
    if(key==='conciliadoPago'||key==='carteraActiva'){cells.balance='Q 0.00';cells.balanceState='closed';}
    assert.throws(()=>h.probe.certifySixReceiptUi(e,server,h.probe.inspectSixReceiptBrowser(input)),
      /UI_(?:FINANCIAL_INPUTS_DIFFER_FROM_SERVER|STATE_DIFFERS_FROM_SERVER)/,key);
  }
  const {h,e,input,records,server}=uiFixture();records.cobros.push({id:'qa-stale-payment',reciboId:e.receiptId,paymentState:'PAID_DIRECT'});
  assert.throws(()=>h.probe.certifySixReceiptUi(e,server,h.probe.inspectSixReceiptBrowser(input)),/UI_FINANCIAL_INPUTS_DIFFER_FROM_SERVER/);
});
test('accepted financialView country projection is reproduced exactly without normalizing financial inputs',()=>{
  const h=harness(),reader=fs.readFileSync(path.join(repo,'functions/b4-003-scoped-related-reader.js'),'utf8');
  // This is the actual accepted E3 reader blob, not a mock of its projection.
  const crypto=require('node:crypto'),blob=crypto.createHash('sha1').update('blob '+Buffer.byteLength(reader)+'\0').update(reader).digest('hex');
  assert.equal(blob,'aafdbe3384506b1772c7e409d565de88bf287b21');
  const from=reader.indexOf('function financialView('),to=reader.indexOf('\nasync function verifiedCancellationView',from);
  assert.ok(from>0&&to>from);
  const context={clean:x=>String(x??'').trim(),Denied:Error,allowRow:(ctx,p)=>{
    assert.equal(p.pais,'GT');assert.equal(ctx.country,'GT');
  }};
  vm.runInNewContext(reader.slice(from,to)+'\nthis.project=financialView;',context);
  const policy={pais:'GT',moneda:'GTQ',estado:'Vigente',asesorId:'qa-advisor'};
  const record={polizaId:'qa-policy',moneda:'GTQ',primaTotal:278.26,monto:278.26,fechaLimite:'2026-11-02',estado:'Pendiente'};
  const raw={receipt:h.probe.sixFinancialInputs(record),portfolio:h.probe.sixFinancialInputs(record),
    policy:h.probe.sixFinancialInputs(policy),cobros:[{id:'qa-payment',fields:h.probe.sixFinancialInputs(record)}]};
  const actual=h.probe.sixFinancialInputs(context.project({country:'GT'},record,policy,null,'alianzas-soluciones','qa-receipt'));
  const projected=h.probe.sixExpectedBrowserInputs(raw,policy);
  assert.deepEqual(plain(projected.receipt),plain(actual));
  assert.deepEqual(plain(projected.portfolio),plain(actual));
  assert.deepEqual(plain(projected.cobros[0].fields),plain(actual));
  assert.notEqual(h.probe.focalHash(raw),h.probe.focalHash(projected));
  assert.equal(Object.hasOwn(record,'pais'),false);assert.equal(Object.hasOwn(raw.receipt,'pais'),false);
  for(const key of Object.keys(raw.receipt))assert.deepEqual(projected.receipt[key],raw.receipt[key]);
  assert.throws(()=>h.probe.sixExpectedBrowserInputs(raw,{pais:'CO'}),/COUNTRY_PROJECTION_HOLD/);
  assert.throws(()=>h.probe.sixExpectedBrowserInputs(raw,{pais:'GT',country:'CO'}),/COUNTRY_PROJECTION_HOLD/);
});
test('raw-server country absence fails old QA while exact canonical projection passes and real changes still fail',()=>{
  const {h,e,input,server,policy,records}=uiFixture();
  const raw={receipt:h.probe.sixFinancialInputs(records.recibosEsperados[0]),portfolio:h.probe.sixFinancialInputs(records.carteraPrimas[0]),
    policy:h.probe.sixFinancialInputs(policy),cobros:[]};
  const projected=h.probe.sixExpectedBrowserInputs(raw,policy);
  for(const kind of ['recibosEsperados','carteraPrimas'])records[kind][0].pais='GT';
  assert.throws(()=>h.probe.certifySixReceiptUi(e,server,h.probe.inspectSixReceiptBrowser(input)),/FINANCIAL_INPUTS_DIFFER_FROM_SERVER/);
  server.financialInputsFingerprint=h.probe.focalHash(projected);
  Object.defineProperty(server,'_financialInputsMetadata',{value:h.probe.sixFinancialInputMetadata(projected)});
  h.probe.certifySixReceiptUi(e,server,h.probe.inspectSixReceiptBrowser(input));
  for(const [field,value] of [['monto',100],['saldo',100],['fechaVencimiento','1999-01-01'],['receiptId','foreign'],['pais','CO']]){
    const record=records.carteraPrimas[0],prior=record[field],present=Object.hasOwn(record,field);record[field]=value;
    let error;try{h.probe.certifySixReceiptUi(e,server,h.probe.inspectSixReceiptBrowser(input),'AFTER_RELOAD');}catch(e){error=e;}
    assert.match(error?.message||'',/FINANCIAL_INPUTS_DIFFER_FROM_SERVER/,field);
    assert.equal(error.sixFinancialComparison.stage,'AFTER_RELOAD');
    assert.ok(error.sixFinancialComparison.mismatch.differences.some(d=>d.path==='portfolio.'+field));
    if(present)record[field]=prior;else delete record[field];
  }
});
test('mismatch diagnostics retain only bounded fields, types and salted digests, including payment membership differences',()=>{
  const h=harness(),raw={receipt:{monto:278.26},portfolio:{moneda:'GTQ'},policy:{pais:'GT'},cobros:[]};
  const changed={receipt:{monto:'278.26',saldo:500},portfolio:{moneda:'COP'},policy:{pais:'GT'},
    cobros:[{id:'private-payment-id',fields:{reciboId:'private-receipt-id',fechaPago:'2026-11-23'}}]};
  const before=h.probe.sixFinancialInputMetadata(raw),after=h.probe.sixFinancialInputMetadata(changed);
  const diff=h.probe.sixFinancialInputDifferences(before,after),serialized=JSON.stringify(diff);
  assert.equal(diff.serverCobrosCount,0);assert.equal(diff.browserCobrosCount,1);
  assert.equal(diff.differingFieldCount,5);assert.equal(diff.truncated,false);
  assert.equal(diff.differences.find(d=>d.path==='receipt.monto').serverType,'number');
  assert.equal(diff.differences.find(d=>d.path==='receipt.monto').browserType,'string');
  assert.doesNotMatch(serialized,/278\.26|:500[,}]|GTQ|COP|private-|2026-11-23/);
  const other=harness();assert.notEqual(h.probe.sixFinancialInputMetadata(raw).receipt.monto.digest,
    other.probe.sixFinancialInputMetadata(raw).receipt.monto.digest,'separate runs cannot expose enumerable low-entropy hashes');
  assert.equal(h.probe.sixFinancialInputDifferences(before,h.probe.sixFinancialInputMetadata(raw)).differingFieldCount,0);
  assert.match(source,/report\.financialFocalHold=error\.sixFinancialComparison/);
});
test('visible HOLD identifies the exact failing fields and stage without certifying an unknown balance',()=>{
  const {h,e,input,server}=uiFixture(),observed=h.probe.inspectSixReceiptBrowser(input);
  observed.displayedGrossCents=27827;observed.displayedContractualDue='03 nov 2026';
  observed.balanceCents=null;observed.displayedBalanceCents=null;observed.balanceState='unverified';
  observed.displayedStatus='private unexpected status';
  let error;try{h.probe.certifySixReceiptUi(e,server,observed,'AFTER_RELOAD');}catch(value){error=value;}
  assert.equal(error.message,'I66_SIX_VISIBLE_VALUES_OR_BALANCE_HOLD');
  const d=error.sixVisibleComparison;
  assert.equal(d.stage,'AFTER_RELOAD');assert.equal(d.sourceRequirement,e.sourceRequirement);assert.equal(d.receiptId,e.receiptId);
  assert.deepEqual(plain(d.failedChecks),['gross','contractualDue','status','balanceVerified','balanceState']);
  assert.equal(d.checks.balanceValue,true,'matching null text and owner value does not prove the balance');
  assert.equal(d.observed.balanceCents,null);assert.equal(d.acceptanceChanged,false);
  assert.doesNotMatch(JSON.stringify(d),/private unexpected status|qa-client|qa-actor|financialInputs":/);
});
test('real proof owner exposes missing amount aliases and operational state as bounded context',()=>{
  const {h,input,p,r,policy}=uiFixture();
  delete p.monto;p.estadoOperativo='pendiente_futuro';r.estadoOperativo='pendiente_futuro';
  const observed=h.probe.inspectSixReceiptBrowser(input);
  assert.equal(observed.balanceCents,null);assert.equal(observed.ownerDecision.proofSource,'UNVERIFIED');
  assert.equal(observed.ownerDecision.portfolioAmount.present,false);assert.equal(observed.ownerDecision.portfolioBalance.present,false);
  assert.equal(observed.ownerDecision.receiptOperationalState.value,'pendiente_futuro');
  assert.equal(observed.ownerDecision.portfolioOperationalState.value,'pendiente_futuro');
  assert.equal(observed.ownerDecision.portfoliosForReceipt,1);assert.equal(observed.ownerDecision.linkedPaymentInContext,false);
  policy.estado='Private Person';r.estadoOperativo='another private string';
  assert.doesNotMatch(JSON.stringify(h.probe.inspectSixReceiptBrowser(input).ownerDecision),/Private Person|another private string/);
});
test('visible collector cannot swallow scope, identity, state or source financial-input failures',()=>{
  for(const mutate of [o=>{o.actorMatches=false;},o=>{o.source.receiptId='foreign';},
    o=>{o.source.receiptState.estado='Pagado';},o=>{o.financialInputs.portfolio.monto=100;}]){
    const {h,e,input,server}=uiFixture(),observed=h.probe.inspectSixReceiptBrowser(input),failures=[];
    mutate(observed);
    assert.throws(()=>h.probe.collectSixVisibleResult(e,server,observed,'BEFORE_RELOAD',failures),/I66_SIX_(?:SIGNED_UI|SOURCE_|UI_STATE|UI_FINANCIAL)/);
    assert.equal(failures.length,0);
  }
});
async function sixFlow(mutate=()=>{},options={}){
  const fixtures=authority.rows.map(e=>uiFixture(e)),report={},visited=[];
  const h=harness({phase:'live',report});let serverReads=0,reloads=0,cobrosReads=0,index=0,stage='BEFORE_RELOAD',route='receipt';
  const snapshot={clientId:'qa-client',policyFingerprint:'unchanged',rows:fixtures.map(f=>f.server)};
  h.sixReceiptAuthority=()=>authority;
  h.sixServerSnapshot=async()=>{serverReads++;return options.serverDrift&&serverReads>1?{...snapshot,policyFingerprint:'changed'}:snapshot;};
  const page={locator:()=>({count:async()=>1,inputValue:async()=> 'GT'}),waitForFunction:async()=>{},
    reload:async()=>{reloads++;stage='AFTER_RELOAD';},
    evaluate:async(fn,arg)=>{
      if(arg===undefined){assert.match(String(fn),/#\/cobros/);route='cobros';return;}
      if(typeof arg==='string'){
        if(arg==='#/cobros'){route='cobros';return;}
        route='receipt';index=authority.rows.findIndex(r=>arg.includes(encodeURIComponent(r.receiptId)));stage='BEFORE_RELOAD';return;
      }
      if(route==='cobros'){
        cobrosReads++;return {ready:true,totalGrossCents:166956,rows:authority.rows.map(e=>({receiptId:e.receiptId,count:1,
          rows:[{policyId:authority.scope.policyId,currency:'GTQ',grossCents:27826,due:e.operationalLimitBeforeAndAfter,state:'Pendiente'}]}))};
      }
      const f=fixtures[index],observed=f.h.probe.inspectSixReceiptBrowser(f.input);visited.push({index,stage});
      mutate(observed,index,stage);return observed;
    }};
  let error;try{await h.probe.runSixReceiptUi(page,{uid:'qa-actor'},()=>({pageErrors:0,consoleErrors:0,httpClasses:{},blockedWrites:options.blockedWrites||0}));}
  catch(value){error=value;}
  return {h,report,error,visited,serverReads,reloads,cobrosReads};
}
test('six-case UI flow collects twelve visible failures and still verifies unchanged final server before HOLD',async()=>{
  const r=await sixFlow(o=>{o.balanceCents=null;o.displayedBalanceCents=null;o.balanceState='unverified';o.amountProofSource='UNVERIFIED';});
  assert.equal(r.error.message,'I66_SIX_VISIBLE_VALUES_OR_BALANCE_HOLD');
  const d=r.error.sixVisibleComparisons;
  assert.equal(d.rowCount,6);assert.equal(d.stageCount,12);assert.equal(d.failedStages,12);assert.equal(d.uiAccepted,false);
  assert.equal(d.failureCount,12);assert.equal(d.reloadComparisonsFailed,0);
  assert.equal(d.firstFailure.sourceRequirement,authority.rows[0].sourceRequirement);assert.equal(d.firstFailure.stage,'BEFORE_RELOAD');
  assert.equal(new Set(d.failures.map(x=>x.receiptId)).size,6);assert.equal(d.serverUnchanged,true);
  assert.equal(r.visited.length,12);assert.equal(r.reloads,6);assert.equal(r.serverReads,2);assert.equal(r.cobrosReads,0);
  assert.equal(r.report.financialFocalProgress.observations.length,6);
  assert.equal(r.report.financialFocalProgress.status,'VISIBLE_VALUES_HOLD_ALL_SIX_COLLECTED_SERVER_UNCHANGED');
  assert.equal(r.report.financialFocal,undefined);
});
test('visible failure before reload remains a failure when reload repairs the text, and later rows are still checked',async()=>{
  const r=await sixFlow((o,index,stage)=>{if(index===0&&stage==='BEFORE_RELOAD')o.displayedGrossCents=27827;});
  assert.equal(r.error.message,'I66_SIX_VISIBLE_VALUES_OR_BALANCE_HOLD');assert.equal(r.visited.length,12);
  const d=r.error.sixVisibleComparisons;
  assert.equal(d.firstFailure.stage,'BEFORE_RELOAD');assert.equal(d.failedStages,1);
  assert.equal(d.reloadComparisonsFailed,1);assert.equal(d.failureCount,2);
  assert.deepEqual(plain(d.failures[1].changedVisibleFields),['displayedGrossCents']);
  assert.equal(r.report.financialFocalProgress.observations[0].reloadPass,false);
  assert.equal(r.report.financialFocalProgress.observations[0].afterCheck.pass,true);
  assert.equal(r.report.financialFocal,undefined);
});
test('six-case collector remains fail-fast for authentication and nonvisual reload drift',async()=>{
  const auth=await sixFlow(o=>{o.actorMatches=false;});
  assert.match(auth.error.message,/SIGNED_UI_SCOPE/);assert.equal(auth.visited.length,1);assert.equal(auth.reloads,0);assert.equal(auth.serverReads,1);
  const drift=await sixFlow((o,index,stage)=>{if(stage==='AFTER_RELOAD')o.amountProofSource='OTHER_OWNER';});
  assert.equal(drift.error.message,'I66_SIX_UI_RELOAD_CHANGED_VALUES');assert.equal(drift.visited.length,2);
  assert.equal(drift.report.financialFocal,undefined);
});
test('server drift or a blocked write overrides a collected visible HOLD and cannot report an unchanged readback',async()=>{
  for(const [options,code]of [[{serverDrift:true},'I66_SIX_SERVER_CHANGED_DURING_READONLY_UI'],
    [{blockedWrites:1},'I66_SIX_UI_HTTP_CONSOLE_OR_WRITE_ATTEMPT_HOLD']]){
    const r=await sixFlow(o=>{o.displayedGrossCents=27827;},options);
    assert.equal(r.error.message,code);assert.equal(r.visited.length,12);assert.equal(r.serverReads,2);
    assert.equal(r.report.financialFocal,undefined);assert.equal(r.error.sixVisibleComparisons,undefined);
  }
});
test('unchanged acceptance still requires all six valid views, reload, Cobros calculation and final server equality',async()=>{
  const r=await sixFlow((o,index,stage)=>{if(stage==='AFTER_RELOAD')o.ownerDecision.extraDiagnostic='ignored by acceptance';});
  assert.equal(r.error,undefined);assert.equal(r.visited.length,12);assert.equal(r.serverReads,2);assert.equal(r.cobrosReads,2);
  assert.equal(r.report.financialFocal.distinctObligationCount,6);assert.equal(r.report.financialFocal.sourceGrossCents,166956);
  assert.equal(r.report.financialFocal.observations.every(x=>x.beforeCheck.pass&&x.afterCheck.pass&&x.reloadPass),true);
  assert.equal(r.report.financialFocalProgress,undefined);
});
test('read-only firewall blocks REST mutations and callable writers while allowing the actual read transports',()=>{
  const check=harness().probe.isSixReceiptBusinessWrite,base='https://firestore.googleapis.com/v1/projects/p/databases/(default)/documents';
  for(const method of ['PATCH','DELETE','PUT','POST'])assert.equal(check(method,base+'/cartera/doc'),true,method);
  assert.equal(check('POST',base+':commit'),true);assert.equal(check('POST',base+':batchWrite'),true);
  assert.equal(check('POST','https://firestore.googleapis.com/google.firestore.v1.Firestore/Write/channel'),true);
  assert.equal(check('POST','https://us-central1-ays-orbit-360-lab.cloudfunctions.net/orbit360OpsLeadsCommand'),true);
  assert.equal(check('POST','https://app.aysseguros.com/functions/orbit360OpsLeadsCommand'),true);
  assert.equal(check('POST','https://orbit360opsleadscommand-qa.a.run.app/'),true);
  assert.equal(check('GET',base+'/cartera/doc'),false);assert.equal(check('POST',base+':batchGet'),false);
  assert.equal(check('POST',base+'/cartera:runQuery'),false);
  assert.equal(check('POST','https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel'),false);
  assert.equal(check('POST','https://us-central1-ays-orbit-360-lab.cloudfunctions.net/orbit360OperationalRead'),false);
  assert.equal(check('OPTIONS',base+':commit'),false);
});
test('bootstrap timing observes only existing events, bounds output, drops identity, and preserves source timestamps',()=>{
  const listeners={},window={addEventListener:(name,fn)=>{listeners[name]=fn;}},document={addEventListener:(name,fn)=>{listeners[name]=fn;}};
  let now=14;const h=harness({window,document,performance:{now:()=>now}});h.probe.installBootstrapObservation();
  listeners['orbit:product-readonly-bootstrap']({detail:{phase:'membership',tenantId:'private-tenant',uid:'private-user',ready:false}});
  now=14374;listeners['orbit:product-app']({detail:{started:true,routerStarted:true,displayName:'Private Name'}});
  const events=window.__GI_I66_BOOTSTRAP_TIMELINE__;assert.equal(events[0].timeMs,14);assert.equal(events[1].timeMs,14374);
  assert.equal(events[1].started,true);assert.doesNotMatch(JSON.stringify(events),/private|Private/);
  for(let i=0;i<100;i++)listeners['orbit:product-app']({detail:{}});assert.equal(events.length,80);
});
test('focal mode preserves artifact identity, exact observer authority, writer blocking and separate performance acceptance',()=>{
  assert.match(source,/fs\.readFileSync\(DRIVER\)\.equals\(execFileSync\('git',\['show',pin\.sourceSha\+':\'\+DRIVER\]\)\)/);
  assert.match(source,/controlOwner\.physicalGuard/);assert.match(source,/I66_SIX_REAL_DATA_LIVE_ONLY/);
  assert.match(source,/controlOwner\.resolveReadonlyObserver\('performance'/);
  assert.match(source,/observerBefore=await controlOwner\.verifyReadonlyObserver\(observer\)/);
  assert.match(source,/observerAfter=await controlOwner\.verifyReadonlyObserver\(observer,\{stage:'after'\}\)/);
  assert.match(source,/blockedWrites\+\+;return route\.abort\('blockedbyclient'\)/);
  assert.match(source,/await page\.reload\(\{waitUntil:'domcontentloaded'/);
  assert.match(source,/I66_SIX_SERVER_CHANGED_DURING_READONLY_UI/);
  assert.match(source,/individual Cobros DOM rows are not certified/);
  assert.match(workflow,/if: env\.GI_I66_READONLY_MODE == 'performance'/);
  assert.match(workflow,/if: env\.GI_I66_READONLY_MODE == 'six-existing-receipts'/);
  for(const re of [/\.set\s*\(/,/\.update\s*\(/,/\.delete\s*\(/,/\.runTransaction\s*\(/,/\.setCustomUserClaims\s*\(/,/\.createUser\s*\(/])
    assert.ok(!re.test(source),'forbidden mutation '+re);
});

test('every payment and closure input consumed by the future-pending owner is fingerprinted when omitted or changed by the browser',()=>{
  const signals={estado:'Pagado',estadoOperativo:'pago_reportado',estadoCartera:'cerrado',carteraActiva:false,
    conciliadoPago:true,paymentState:'PAID_INFERRED',applicationState:'APPLIED_DIRECT',pagado:true,conciliado:true,
    inferredPaid:true,paidInferred:true,pagoReportado:true,directOrInferred:'INFERRED',reportado:'private free text',
    fechaPago:'2026-11-24',paidDate:'2026-11-24',fechaPagoReportada:'2026-11-24',cobroId:'qa-payment'};
  for(const section of ['receipt','portfolio'])for(const [field,value] of Object.entries(signals))for(const change of ['omit','change']){
    const f=uiFixture(),record=section==='receipt'?f.r:f.p;record[field]=value;
    const financialInputs={receipt:f.h.probe.sixFinancialInputs(f.r),portfolio:f.h.probe.sixFinancialInputs(f.p),
      policy:f.h.probe.sixFinancialInputs(f.policy),cobros:[]};
    f.server.financialInputsFingerprint=f.h.probe.focalHash(financialInputs);
    f.server.receiptState=plain(f.h.focalState(f.r));f.server.portfolioState=plain(f.h.focalState(f.p));
    const metadata=f.h.probe.sixFinancialInputMetadata(financialInputs);
    assert.doesNotMatch(JSON.stringify(metadata),/private free text/);
    if(change==='omit')delete record[field];else record[field]=typeof value==='boolean'?!value:'changed';
    assert.throws(()=>f.h.probe.certifySixReceiptUi(f.e,f.server,f.h.probe.inspectSixReceiptBrowser(f.input)),
      /I66_SIX_UI_(?:STATE_DIFFERS_FROM_SERVER|FINANCIAL_INPUTS_DIFFER_FROM_SERVER)/,section+'.'+field+'.'+change);
  }
});
test('a fresh server oracle runs the exact source owner and detects a browser amount or proof-source disagreement',()=>{
  const f=uiFixture(),controlOwner=require('./gravicentra-i66-frontend-control.cjs');f.h.controlOwner=controlOwner;
  const bytes=fs.readFileSync(path.join(repo,'orbit360-platform/core/queries.js'));
  delete f.p.monto;f.p.fechaLimite=f.r.fechaLimite;f.r.estadoOperativo=f.p.estadoOperativo='futuro_pendiente';
  const proof=f.h.probe.sixServerBalanceProof(f.r,[f.p],f.policy,[],bytes);
  assert.equal(proof.balanceCents,27826);assert.equal(proof.open,true);
  assert.equal(proof.ownerBlob,controlOwner.blob(bytes));assert.equal(proof.source,'MATCHED_EXPECTED_RECEIPT_CONTRACTUAL_AMOUNT');
  f.p.reportado='private evidence';assert.equal(f.h.probe.sixServerBalanceProof(f.r,[f.p],f.policy,[],bytes).balanceCents,null);
  const g=uiFixture();g.server.serverBalanceProof={open:true,balanceCents:27826,source:'DIFFERENT_SOURCE'};
  assert.throws(()=>g.h.probe.certifySixReceiptUi(g.e,g.server,g.h.probe.inspectSixReceiptBrowser(g.input)),/BROWSER_BALANCE_DIFFERS_FROM_SERVER_OWNER/);
});
test('financial actor selection requires unique real active verified members and explicit country/role assignment',async()=>{
  function actorsFixture(mutate=()=>{}){
    const rows=[{uid:'qa-carlos',tenantId:'alianzas-soluciones',nombre:'Carlos Castro',estado:'Activo',roles:['operativo'],countries:['GT']},
      {uid:'qa-paula',tenantId:'alianzas-soluciones',nombre:'Paula Osorio',estado:'Activo',roles:['direccion'],countries:['GT']}];
    mutate(rows);const docs=rows.map(r=>({id:r.uid,data:()=>r}));
    const chain=name=>({doc:()=>chain(name),collection:child=>chain(child),limit:()=>chain(name),get:async()=>({size:name==='members'?docs.length:0,docs:name==='members'?docs:[]})});
    return harness({TENANT:'alianzas-soluciones',db:{collection:name=>chain(name)},
      auth:{getUser:async uid=>({uid,emailVerified:true,disabled:false})}});
  }
  const actors=await actorsFixture().probe.findFinancialActors();assert.deepEqual(plain(actors.map(x=>x.allowedRole)),['operativo','direccion']);
  for(const mutate of [rows=>rows[1].roles=[],rows=>rows[1].countries=['CO'],rows=>rows[1].estado='Inactivo',
    rows=>rows[1].tenantId='foreign',rows=>rows.push({...rows[1],uid:'duplicate-paula'})])
    await assert.rejects(actorsFixture(mutate).probe.findFinancialActors(),/SIGNED_ACTOR_NOT_UNIQUE/);
  const disabled=actorsFixture();disabled.auth.getUser=async uid=>({uid,emailVerified:true,disabled:true});
  await assert.rejects(disabled.probe.findFinancialActors(),/SIGNED_ACTOR_NOT_UNIQUE/);
  const claim=actorsFixture();claim.auth.getUser=async uid=>({uid,emailVerified:true,disabled:false,customClaims:{giActiveRole:'asesor'}});
  await assert.rejects(claim.probe.findFinancialActors(),/SIGNED_ACTOR_NOT_UNIQUE/);
});
async function frontendMatrixFlow(options={}){
  const owner=require('./gravicentra-i66-frontend-promotion-owner.cjs'),crypto=require('node:crypto');
  const target={sourceSha:'b'.repeat(40),artifactId:102,artifactDigest:'sha256:'+'c'.repeat(64),buildId:'gi-i66-bbbbbbbbbbbb-123456789abc',
    buildRunId:101,previewUrl:'https://ays-orbit-360-lab--gi-i66-rc-101-abc.web.app',previewChannel:'gi-i66-rc-101'};
  const phase=options.phase||'preview',before={stage:'before',phase,scopeId:owner.FINANCIAL_SCOPE,target,authorityBlob:'d'.repeat(40),
    physicalPhaseKey:phase==='live'?'e'.repeat(64):null,runId:1001,workflowHeadSha:'f'.repeat(40),readOnly:true};
  const report={schema:'GI_I66_BROWSER_PERFORMANCE_READONLY_V2',phase,origin:phase==='preview'?target.previewUrl:'https://app.aysseguros.com',
    sourceSha:target.sourceSha,buildId:target.buildId,releaseArtifactId:target.artifactId,releaseArtifactDigest:target.artifactDigest,
    releaseBuildRunId:target.buildRunId,workflowHeadSha:before.workflowHeadSha,readOnly:true,firestoreWrites:0,businessActions:0,
    paymentActions:0,syntheticFixtures:0,pushNotifications:0,roleChanged:false,errors:[]};
  const actors=['operativo','direccion'].map(role=>({uid:'qa-'+role,allowedRole:role,requestedRole:role,actorSha256:crypto.hash('sha256',role)}));
  const fixtures=authority.rows.map(e=>uiFixture(e)),snapshot={clientId:'qa-client',policyFingerprint:'same',rows:fixtures.map(f=>({...f.server,
    serverBalanceProof:{sourceSha:target.sourceSha,ownerBlob:'a'.repeat(40),open:true,balanceCents:27826,source:'CARTERA_EXPLICIT'}}))};
  let serverReads=0,authorityAfter=0,visited=0,closed=0,readingScrolls=0;const viewports=[];
  const h=harness({phase,readMode:'six-frontend-release',frontendQa:before,report,pin:target,ORIGIN:report.origin,
    auth:{createCustomToken:async uid=>uid},financialOwner:{...owner,
      resolveFinancialQa:async()=>{authorityAfter++;if(options.authorityDrift)throw Error('FINANCIAL_QA_FINAL_AUTHORITY_DRIFT');return {...before,stage:'after'};},
      validateFinancialReport:(r,t,p,o)=>owner.validateFinancialReport(plain(r),t,p,o)}});
  h.findFinancialActors=async()=>actors;h.sixReceiptAuthority=()=>authority;
  h.sixServerSnapshot=async()=>{serverReads++;return options.serverDrift&&serverReads>=10?{...snapshot,policyFingerprint:'changed'}:snapshot;};
  h.chromium={launch:async()=>({close:async()=>{},newContext:async({viewport})=>{
    viewports.push(viewport.width);let role='operativo',index=0,stage='BEFORE_RELOAD',route='receipt',firewall,balanceInView=false;
    const context={close:async()=>{closed++;},route:async(pattern,fn)=>{firewall=fn;},newPage:async()=>page};
    const page={on:()=>{},goto:async()=>{},waitForFunction:async()=>{},
      locator:selector=>({count:async()=>1,isVisible:async()=>true,inputValue:async()=> 'GT',selectOption:async value=>{if(selector==='#rol-sel')role=value;},
        scrollIntoViewIfNeeded:async()=>{assert.match(selector,/data-rp-current-balance/);readingScrolls++;balanceInView=!options.scrollCannotReveal;}}),
      reload:async()=>{stage='AFTER_RELOAD';balanceInView=false;},evaluate:async(fn,arg)=>{
        if(String(fn).includes('signInWithCustomToken'))return !options.authFailure;
        if(String(fn).includes("document.querySelector('#rol-sel')"))return arg;
        if(arg===undefined){route='cobros';return;}
        if(typeof arg==='string'){route='receipt';index=authority.rows.findIndex(r=>arg.includes(encodeURIComponent(r.receiptId)));stage='BEFORE_RELOAD';balanceInView=false;return;}
        if(route==='cobros')return {ready:true,totalGrossCents:166956,rows:authority.rows.map(e=>({receiptId:e.receiptId,count:1,
          rows:[{policyId:authority.scope.policyId,currency:'GTQ',grossCents:27826,due:e.operationalLimitBeforeAndAfter,state:'Pendiente'}]}))};
        const f=fixtures[index];f.Orbit.auth.productUser.uid='qa-'+role;f.Orbit.session.rol=()=>role;
        const observed=f.h.probe.inspectSixReceiptBrowser({...f.input,actorUid:'qa-'+role});
        observed.viewport={width:viewport.width,detailVisible:true,balanceVisible:balanceInView,horizontalOverflowPx:0};visited++;
        if(options.mutate)options.mutate(observed,{role,width:viewport.width,index,stage});
        if(options.writeAttempt&&visited===1)await firewall({request:()=>({method:()=> 'POST',url:()=> 'https://firestore.googleapis.com/v1/projects/p/databases/(default)/documents:commit'}),abort:async()=>{}});
        return observed;
      }};return context;
  }})};
  let error;try{await h.probe.runFrontendFinancialMatrix();}catch(e){error=e;}
  return {h,report:plain(report),error,visited,serverReads,authorityAfter,viewports,closed,readingScrolls,owner,target};
}
test('the release matrix executes 48 actual receipt stages in Preview and LIVE across both actors and viewports',async()=>{
  for(const phase of ['preview','live']){
    const r=await frontendMatrixFlow({phase});assert.equal(r.error,undefined,r.error?.stack);
    assert.equal(r.visited,48);assert.equal(r.report.stageCount,48);assert.equal(r.authorityAfter,1);assert.equal(r.serverReads,10);
    assert.equal(r.readingScrolls,48,'Every receipt/reload must expose the actual balance on the existing stacked layout');
    assert.deepEqual(r.viewports,[1365,390,1365,390]);assert.equal(r.closed,4);
    assert.equal(r.report.fullA04Accepted,false);assert.equal(r.report.fullA12Passed,false);
    assert.equal(r.report.roles.every(v=>v.financialFocal.observations.every(o=>o.beforeCheck.pass&&o.afterCheck.pass)),true);
  }
});
test('the release matrix preserves all visible failures across 48 stages and verifies final server and authority before HOLD',async()=>{
  const r=await frontendMatrixFlow({mutate:o=>{o.displayedGrossCents=27827;}});
  assert.equal(r.error.message,'I66_SIX_VISIBLE_VALUES_OR_BALANCE_HOLD');assert.equal(r.visited,48);
  assert.equal(r.error.sixVisibleComparisons.stageCount,48);assert.equal(r.error.sixVisibleComparisons.finalAuthorityVerified,true);
  assert.equal(r.report.roles.filter(v=>v.visibleHold).length,4);assert.equal(r.authorityAfter,1);assert.equal(r.serverReads,10);
  assert.notEqual(r.report.status,'FRONTEND_SIX_RECEIPTS_TWO_ROLE_TWO_VIEW_READONLY_PASS');
});
test('matrix source, role, viewport, write and final authority failures cannot turn into an acceptance receipt',async()=>{
  const cases=[{authFailure:true},{mutate:o=>{o.actorMatches=false;}},{mutate:o=>{o.role='superadmin';}},
    {mutate:o=>{o.viewport.width=1280;}},{mutate:o=>{o.viewport.balanceVisible=false;}},
    {mutate:o=>{o.viewport.horizontalOverflowPx=200;}},{mutate:o=>{o.balanceCents=100;}},
    {writeAttempt:true},{serverDrift:true},{authorityDrift:true},{scrollCannotReveal:true}];
  for(const options of cases){const r=await frontendMatrixFlow(options);assert.ok(r.error);assert.notEqual(r.report.status,'FRONTEND_SIX_RECEIPTS_TWO_ROLE_TWO_VIEW_READONLY_PASS');
    if(options.authorityDrift){assert.equal(r.visited,48);assert.equal(r.authorityAfter,1);}}
});
test('the financial release owner rejects missing stages, invented full gates, stale authority and cross-view source drift',async()=>{
  const r=await frontendMatrixFlow();assert.equal(r.error,undefined);
  for(const mutate of [p=>p.roles.pop(),p=>p.stageCount=47,p=>p.fullA04Accepted=true,p=>p.fullA12Passed=true,
    p=>p.roles[0].financialFocal.observations[0].afterCheck.pass=false,
    p=>p.roles[0].financialFocal.observations[0].afterReload.balanceCents=null,
    p=>p.roles[1].actorSha256='0'.repeat(64),p=>p.roles[0].financialFocal.errors.blockedWrites=1,
    p=>p.frontendQaAfter.authorityBlob='0'.repeat(40),p=>p.frontendQaAfter.target.artifactId++,
    p=>p.roles[0].financialFocal.sourceSnapshotAfter[0].portfolioFingerprint='changed',
    p=>p.matrixServerSnapshotAfter[0].receiptId='changed']){
    const report=structuredClone(r.report);mutate(report);
    assert.throws(()=>r.owner.validateFinancialReport(report,r.target,'preview'));
  }
  assert.equal(r.report.buttonClicked,undefined);assert.equal(r.report.linkedDestination,undefined);
});

test('the reading scroll retries only exact detach with fresh locators and one bounded action budget',async()=>{
  const detached=()=>Error('locator.scrollIntoViewIfNeeded: Element is not attached to the DOM\nCall log:');
  let clock=0,locators=0,scrolls=0;const timeouts=[];
  const h=harness({Date:{now:()=>clock}}),page={locator:()=>{locators++;return {
    count:async()=>1,isVisible:async()=>true,scrollIntoViewIfNeeded:async({timeout})=>{
      timeouts.push(timeout);scrolls++;clock+=100;if(scrolls<3)throw detached();
    }};}};
  assert.deepEqual(plain(await h.probe.showSixReceiptBalance(page,authority.rows[0],390,'BEFORE_RELOAD')),{attempts:3,detachments:2});
  assert.equal(locators,3);assert.deepEqual(timeouts,[1500,1400,1300]);
  let persistentCalls=0;const persistent={locator:()=>({count:async()=>1,isVisible:async()=>true,
    scrollIntoViewIfNeeded:async()=>{persistentCalls++;throw detached();}})};
  await assert.rejects(h.probe.showSixReceiptBalance(persistent,authority.rows[0],390,'AFTER_RELOAD'),error=>{
    assert.equal(error.message,'I66_SIX_SCROLL_DETACH_PERSISTENT_HOLD');
    assert.equal(error.sixScrollComparison.attempts,3);assert.equal(error.sixScrollComparison.detachments,3);
    assert.equal(error.sixScrollComparison.stage,'AFTER_RELOAD');assert.equal(error.sixScrollComparison.uiAccepted,false);return true;
  });assert.equal(persistentCalls,3);
  for(const error of [Error('locator.scrollIntoViewIfNeeded: Target page, context or browser has been closed'),
    Object.assign(detached(),{name:'TimeoutError'}),Error('some other operation: Element is not attached to the DOM')]){
    let calls=0;const page={locator:()=>({count:async()=>1,isVisible:async()=>true,scrollIntoViewIfNeeded:async()=>{calls++;throw error;}})};
    await assert.rejects(h.probe.showSixReceiptBalance(page,authority.rows[0],1365,'BEFORE_RELOAD'),x=>x===error);assert.equal(calls,1);
  }
  let exhausted=0;const slow={locator:()=>({count:async()=>1,isVisible:async()=>true,
    scrollIntoViewIfNeeded:async()=>{exhausted++;clock+=1500;throw detached();}})};
  await assert.rejects(h.probe.showSixReceiptBalance(slow,authority.rows[0],390,'BEFORE_RELOAD'),/DETACH_PERSISTENT_HOLD/);
  assert.equal(exhausted,1,'A retry never resets the shared time budget');
  assert.equal(await h.probe.showSixReceiptBalance({locator:()=>assert.fail('legacy non-viewport mode')},authority.rows[0],undefined,'BEFORE_RELOAD'),null);
  assert.match(source,/report\.financialFocalScrollHold=error\.sixScrollComparison/);
});

test('a missing, duplicate or hidden balance cannot be recovered as a transient detach',async()=>{
  for(const [count,visible,code] of [[0,true,'MISSING_OR_DUPLICATE'],[2,true,'MISSING_OR_DUPLICATE'],[1,false,'HIDDEN']]){
    let locators=0,scrolls=0;const page={locator:()=>{locators++;return {count:async()=>count,isVisible:async()=>visible,
      scrollIntoViewIfNeeded:async()=>{scrolls++;}};}};
    await assert.rejects(harness().probe.showSixReceiptBalance(page,authority.rows[0],390,'BEFORE_RELOAD'),new RegExp(code));
    assert.equal(locators,1);assert.equal(scrolls,0);
  }
});

// This test is mandatory in the dedicated, credential-free Chromium CI job.
// Ordinary source-only jobs report an explicit SKIP; they cannot claim DOM proof.
test('real Chromium DOM reproduces canonical detail detachment and preserves strict acceptance after bounded recovery',{
  skip:process.env.I66_SIX_REQUIRE_REAL_DOM==='1'?false:'Real DOM proof runs in the isolated I66_QA_DETACH_CAUSAL_CHECK job'
},async t=>{
  const {chromium}=require('playwright');
  assert.equal(require('playwright/package.json').version,'1.55.0','The mandatory causal job uses the pinned browser driver');
  const bridge=fs.readFileSync(path.join(repo,'orbit360-platform/core/backend-lab-receipts-portfolio-native-bridge-v20260801.js'),'utf8');
  const queries=fs.readFileSync(path.join(repo,'orbit360-platform/core/queries.js'),'utf8');
  const ui=fs.readFileSync(path.join(repo,'orbit360-platform/core/ui.js'),'utf8');
  assert.match(bridge,/target\.innerHTML=/);assert.match(bridge,/if\(directId\)renderReceiptDetail\(directId,cid\)/);
  assert.match(bridge,/orbit:store:emit/);assert.match(bridge,/data-rp-current-balance/);
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    for(const width of [1365,390])await t.test('canonical renderer and real layout at '+width+'px',async()=>{
      const context=await browser.newContext({viewport:{width,height:width===390?844:900}});
      let requests=0;await context.route('**/*',route=>{requests++;return route.abort('blockedbyclient');});
      const page=await context.newPage(),f=uiFixture(),errors=[];page.on('pageerror',error=>errors.push(error.message));
      f.h.controlOwner=require('./gravicentra-i66-frontend-control.cjs');
      try{
        delete f.p.monto;f.p.fechaLimite=f.r.fechaLimite;f.r.estadoOperativo=f.p.estadoOperativo='futuro_pendiente';
        f.r.pais=f.p.pais='GT';
        const data=plain({...f.records,clientes:[{id:'qa-client',pais:'GT',moneda:'GTQ'}],vehiculos:[],aseguradoras:[]});
        const input={...f.input,viewportWidth:width},selector='[data-rp-receipt-detail-id="'+f.e.receiptId+'"] [data-rp-current-balance]';
        await page.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="c360-body"></div></body></html>');
        await page.evaluate(data=>{
          window.__sixFixtureRecords=data;window.__sixFixtureWrites=0;
          const refuse=()=>{window.__sixFixtureWrites++;throw Error('SYNTHETIC_DOM_TEST_WRITES_FORBIDDEN');};
          window.Orbit={tenant:{demoDate:'2026-11-24'},pais:'GT',modules:{},route:{params:{}},
            auth:{productUser:{uid:'qa-actor',tenantId:'alianzas-soluciones'}},session:{rol:()=> 'Dirección'},
            store:{__productReadOnlyP0:true,_protectedCandidate:true,
              _productStatus:()=>({tenantId:'alianzas-soluciones',serverConfirmedCollections:Object.keys(data),snapshotErrors:{}}),
              all:key=>data[key]||[],get:(key,id)=>(data[key]||[]).find(row=>row.id===id)||null,
              where:(key,fn)=>(data[key]||[]).filter(fn),find:(key,fn)=>(data[key]||[]).find(fn)||null,
              insert:refuse,update:refuse,remove:refuse,batchDurable:refuse},
            tenantCanonicalPathsP0:{dataCollectionPath:(tenant,key)=>'tenants/'+tenant+'/data/'+key+'/items'}};
        },data);
        for(const content of [ui,queries,bridge])await page.addScriptTag({content});
        const render=async()=>assert.equal(await page.evaluate(({id,client})=>Orbit.receiptsPortfolioProjection.renderReceiptDetail(id,client),
          {id:f.e.receiptId,client:'qa-client'}),true);
        await render();
        const before=await page.evaluate(f.h.probe.inspectSixReceiptBrowser,input);
        assert.equal(before.balanceCents,27826);assert.equal(before.displayedBalanceCents,27826);
        if(width===390)assert.equal(before.viewport.balanceVisible,false,'The actual stacked markup initially places the balance below the fold');
        const server={...sourceRow(f.e),receiptState:plain(f.h.focalState(f.r)),portfolioState:plain(f.h.focalState(f.p)),
          financialInputsFingerprint:f.h.probe.focalHash(before.financialInputs),
          serverBalanceProof:f.h.probe.sixServerBalanceProof(f.r,[f.p],f.policy,[],queries)};
        const original=JSON.stringify(data);
        const detachingPage=remaining=>{
          const trace=[],frame=page.mainFrame(),channel=frame._channel;
          // Timing seam only, inside the already active public scroll API zone:
          // return the real resolved handle after the unchanged product renderer
          // replaces its DOM. Do not wrap _withElement or rewrite any error.
          frame._channel=new Proxy(channel,{get(target,key){
            const value=Reflect.get(target,key);
            if(key!=='waitForSelector')return value;
            return async params=>{
              const result=await value(params);
              if(params.selector===selector&&params.strict===true&&params.state==='attached'&&remaining>0){
                remaining--;const handle=result.element?._object;assert.ok(handle);
                assert.equal(await handle.evaluate(node=>node.isConnected),true);
                await render();assert.equal(await handle.evaluate(node=>node.isConnected),false);
                trace.push('CANONICAL_DETAIL_REPLACED');
              }
              return result;
            };
          }});
          return {trace,restore:()=>{frame._channel=channel;},locator(css){assert.equal(css,selector);return page.locator(css);}};
        };
        const old=detachingPage(1);
        try{await assert.rejects(old.locator(selector).scrollIntoViewIfNeeded({timeout:1500}),
          /^Error: locator\.scrollIntoViewIfNeeded: Element is not attached to the DOM/);}finally{old.restore();}
        assert.equal(old.trace.length,1,'The old one-shot interaction reproduces the observed Preview failure');
        const transient=detachingPage(1);let recovered;
        try{recovered=await f.h.probe.showSixReceiptBalance(transient,f.e,width,'BEFORE_RELOAD');}finally{transient.restore();}
        assert.deepEqual(plain(recovered),{attempts:2,detachments:1});assert.equal(transient.trace.length,1);
        const observed=await page.evaluate(f.h.probe.inspectSixReceiptBrowser,input);
        f.h.probe.certifySixReceiptUi(f.e,server,observed,'BEFORE_RELOAD','direccion',width);
        assert.equal(observed.displayedGrossCents,27826);assert.equal(observed.displayedBalanceCents,27826);
        assert.equal(observed.viewport.horizontalOverflowPx,0);assert.equal(observed.viewport.balanceVisible,true);
        await render();const persistent=detachingPage(Infinity);
        try{await assert.rejects(f.h.probe.showSixReceiptBalance(persistent,f.e,width,'AFTER_RELOAD'),/SCROLL_DETACH_PERSISTENT_HOLD/);}
        finally{persistent.restore();}
        assert.equal(persistent.trace.length,3,'Persistent real DOM replacement remains HOLD after exactly three attempts');
        for(const kind of ['missing','hidden','duplicate','wrong-identity','overflow']){
          await render();
          await page.evaluate(kind=>{
            const root=document.querySelector('[data-rp-receipt-detail-id]'),balance=root.querySelector('[data-rp-current-balance]');
            if(kind==='missing')balance.remove();
            if(kind==='hidden')balance.style.display='none';
            if(kind==='duplicate')balance.parentNode.appendChild(balance.cloneNode(true));
            if(kind==='wrong-identity')root.setAttribute('data-rp-receipt-detail-id','wrong-receipt');
            if(kind==='overflow'){const wide=document.createElement('div');wide.style.width='3000px';root.appendChild(wide);}
          },kind);
          if(kind==='overflow'){
            await f.h.probe.showSixReceiptBalance(page,f.e,width,'AFTER_RELOAD');
            const overflow=await page.evaluate(f.h.probe.inspectSixReceiptBrowser,input);
            assert.ok(overflow.viewport.horizontalOverflowPx>0);
            assert.throws(()=>f.h.probe.certifySixReceiptUi(f.e,server,overflow,'AFTER_RELOAD','direccion',width),/UI_VIEWPORT_HOLD/);
          }else await assert.rejects(f.h.probe.showSixReceiptBalance(page,f.e,width,'AFTER_RELOAD'),/SCROLL_BALANCE_(?:MISSING_OR_DUPLICATE|HIDDEN)_HOLD/,kind);
        }
        assert.equal(await page.evaluate(()=>JSON.stringify(window.__sixFixtureRecords)),original);
        assert.equal(await page.evaluate(()=>window.__sixFixtureWrites),0);assert.equal(requests,0);assert.deepEqual(errors,[]);
      }finally{await context.close();}
    });
  }finally{await browser.close();}
});
