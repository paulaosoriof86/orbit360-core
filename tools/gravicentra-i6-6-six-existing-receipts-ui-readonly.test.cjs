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
  vm.runInNewContext(source.slice(start,end)+'\nthis.probe={validateSixSourceRow,certifySixReceiptUi,inspectSixReceiptBrowser,installBootstrapObservation,sixReceiptAuthority,sixServerSnapshot,focalHash,sixFinancialInputs,SIX_FINANCIAL_FIELDS,isSixReceiptBusinessWrite,visibleCivilDate};',context);
  return context;
}
function sourceRow(e=authority.rows[0]){
  return {receiptId:e.receiptId,portfolioId:e.portfolioId,policyId:authority.scope.policyId,portfolioPolicyId:authority.scope.policyId,
    portfolioReceiptId:e.receiptId,clientCoherent:true,requirement:e.sourceRequirement,contractualDue:e.contractualDueAfter,
    operationalLimit:e.operationalLimitBeforeAndAfter,currency:'GTQ',portfolioCurrency:'GTQ',grossCents:27826,portfolioGrossCents:27826,
    receiptState:{estado:'Pendiente'},portfolioState:{estado:'Pendiente',carteraActiva:true},portfolioMatches:1,cobrosTruncated:false,rollbackPresent:true,auditIdentity:true};
}
function uiFixture(){
  const e=authority.rows[0],r={id:e.receiptId,polizaId:authority.scope.policyId,clienteId:'qa-client',moneda:'GTQ',primaTotal:278.26,
    numeroReciboFuente:e.sourceRequirement,fechaVencimientoContractual:e.contractualDueAfter,fechaLimite:e.operationalLimitBeforeAndAfter,estado:'Pendiente'};
  const p={id:e.portfolioId,reciboId:e.receiptId,polizaId:authority.scope.policyId,clienteId:'qa-client',moneda:'GTQ',primaTotal:278.26,monto:278.26,estado:'Pendiente',carteraActiva:true};
  const policy={id:authority.scope.policyId,clienteId:'qa-client',pais:'GT',moneda:'GTQ',estado:'Vigente'};
  const cells={
    'Prima total':'Q 278.26','Vencimiento contractual documentado':'02 nov 2026','Fecha límite operativa':'02 nov 2026'
  };
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
