'use strict';
// Driver contract tests only: importing the module never authenticates/writes.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const driver=require('./gravicentra-i6-6-advisor-payables-signed-uat.cjs');
const config={I66_SOURCE_SHA:'a'.repeat(40),I66_PREVIEW_ORIGIN:'https://ays-orbit-360-lab--gi-i66-rc-123-abcd.web.app'};
const fx=driver.fixtures('b4003qa_i66_cxp_unit_abc123');
test('signed CxP driver accepts only exact Preview or explicitly gated LIVE origins',()=>{
  const preview=driver.configuration(config);assert.equal(preview.region,'us-east1');assert.equal(preview.live,false);assert.equal(preview.functionName,'orbit360ProductOperationalCommandPreview');
  const live=driver.configuration({...config,I66_SIGNED_TEST_LIVE:'true',I66_PREVIEW_ORIGIN:'https://app.aysseguros.com'});assert.equal(live.region,'us-central1');assert.equal(live.functionName,'orbit360ProductOperationalCommand');
  for(const values of [{...config,I66_PREVIEW_ORIGIN:'https://app.aysseguros.com'},{...config,I66_PREVIEW_ORIGIN:'https://attacker.example'},{...config,I66_SOURCE_SHA:'wrong'},{...config,I66_SIGNED_TEST_LIVE:'true'}])assert.throws(()=>driver.configuration(values));
});
test('signed driver creates only ten uniquely marked disposable rows and no Auth users',()=>{
  assert.equal(fx.rows.length,10);assert.equal(new Set(fx.rows.map(([,row])=>row.id)).size,10);
  for(const [collection,row] of fx.rows){assert.ok(['asesores','clientes','polizas','comisiones','finmovs'].includes(collection));assert.ok(row.id.startsWith(fx.runId+'_'));assert.equal(row.__syntheticQa,true);assert.equal(row.__qaRunId,fx.runId);assert.equal(row.tenantId,'alianzas-soluciones');assert.equal(row.authUid,undefined);}
  assert.throws(()=>driver.fixtures('real_client'));
});
test('signed business fixtures use accredited ordinary October commissions, 70 and 60 percent, never cash',()=>{
  assert.deepEqual(fx.plans.map(plan=>plan.payable.valor),[70.92,45.33]);
  for(const spec of fx.specs){assert.equal(spec.syntheticQa,true);assert.equal(spec.lines[0].commissionKind,'ordinary');assert.equal(spec.lines[0].collectionPeriod,'2026-10');assert.equal(spec.lines[0].accreditation.status,'accredited');assert.equal(spec.lines[0].bankReference,undefined);}
  for(const plan of fx.plans){assert.equal(plan.payable.estado,'pendiente');assert.equal(plan.payable.pagado,0);assert.equal(plan.payable.pagada,false);assert.equal(plan.payable.noBankMovement,true);assert.ok(plan.payable.id.startsWith('b4003qa_cxpase_'));}
});
test('same source request identity survives operation retries but changes safely with cutoff/actor/environment',()=>{
  const spec=fx.specs[0],one=driver.sourceIdentity(spec,'actor-test',true);
  assert.deepEqual(driver.sourceIdentity({...spec,operation:'prepare',previewDigest:'proof'},'actor-test',true),one);
  for(const next of [driver.sourceIdentity({...spec,cutoff:'2026-12-15'},'actor-test',true),driver.sourceIdentity(spec,'other-actor',true),driver.sourceIdentity(spec,'actor-test',false)])assert.notEqual(next.requestId,one.requestId);
  assert.match(one.requestId,/^advisorpay_[a-f0-9]{32}$/);assert.match(one.restoreEventId,/^opevt_[a-f0-9]{28}$/);
});
test('generated cleanup requires exact original amount, actor, request, tenant and unsettled balance',()=>{
  const expected=fx.plans[0].payable,valid={...expected,preparationRequestId:'qa-request',createdByUid:'qa-actor'};
  driver.assertGenerated(valid,expected,'qa-request','qa-actor','finmovs');
  for(const patch of [{__syntheticQa:false},{tenantId:'different'},{preparationRequestId:'other'},{createdByUid:'other'},{valor:1},{estado:'pagado'},{pagada:true},{pagado:1},{pendiente:1},{financialDigest:'wrong'}])assert.throws(()=>driver.assertGenerated({...valid,...patch},expected,'qa-request','qa-actor','finmovs'));
});
test('generated commission cleanup cannot delete a changed source, beneficiary, or settlement',()=>{
  const expected=fx.plans[1].commission,valid={...expected,preparationRequestId:'qa-request',createdByUid:'qa-actor'};
  driver.assertGenerated(valid,expected,'qa-request','qa-actor','comisiones');
  for(const patch of [{monto:1},{montoAsesor:1},{asesorId:'real-person'},{estado:'Liquidada'},{cxpAsesorId:'other'},{source:{...valid.source,lineId:'another-line'}},{notes:'unexpected edit'}])assert.throws(()=>driver.assertGenerated({...valid,...patch},expected,'qa-request','qa-actor','comisiones'));
});
test('source audit cleanup refuses wrong actor, environment, or unrelated CxP',()=>{
  const identity=driver.sourceIdentity(fx.specs[0],'qa-actor',true),id=fx.plans[0].payable.id;
  const row={actorUid:'qa-actor',payloadDigest:identity.inputDigest,status:'committed',result:{schemaVersion:'gravicentra-advisor-commission-payable-v1',syntheticQa:true,previewIsolated:true,requestId:identity.requestId,payables:[{id}],financialPayments:0,bankMovements:0}};
  driver.sourceAuditGuard('request',row,identity,'qa-actor',false,[id]);
  assert.throws(()=>driver.sourceAuditGuard('request',row,identity,'other',false,[id]));
  assert.throws(()=>driver.sourceAuditGuard('request',row,identity,'qa-actor',true,[id]));
  assert.throws(()=>driver.sourceAuditGuard('request',row,identity,'qa-actor',false,['unrelated']));
});
test('runner executes visible JSON upload/confirmation/reload and guarded finally audit restoration',()=>{
  const source=fs.readFileSync(path.join(__dirname,'gravicentra-i6-6-advisor-payables-signed-uat.cjs'),'utf8');
  for(const pattern of [/setInputFiles/,/fuente-preview/,/lt-ok/,/page\.reload/,/restoreSynthetic/,/lastUpdateTime:snap\.updateTime/,/observedAbsent\.has\(ref\.path\)/,/OPERATIVE_FINANCIAL_WRITE_DENIED_SERVER_SIDE/,/LEGACY_PAYMENTS_COMMISSIONS/,/flag:'wx'/])assert.match(source,pattern);
  assert.doesNotMatch(source,/createUser\(|setCustomUserClaims\(|deleteUser\(|updateUser\(|sendMessage\(|applyPayment\(/);
});
test('legacy cleanup also handles response loss, but never deletes a financial or third-party change',()=>{
  const original=fx.rows.find(([,row])=>row.id===fx.ids.ordinary)[1];
  assert.equal(driver.unchangedSeed(original,original,fx.ids.ordinary,'actor'),true);
  const changed={...original,concepto:'QA servicio editado',updatedAt:'SERVER_TIME',updatedByUid:'actor'};
  assert.equal(driver.unchangedSeed(changed,original,fx.ids.ordinary,'actor'),true);
  assert.equal(driver.unchangedSeed({...changed,valor:20},original,fx.ids.ordinary,'actor'),false);
  assert.equal(driver.unchangedSeed({...changed,updatedByUid:'other'},original,fx.ids.ordinary,'actor'),false);
  assert.equal(driver.unchangedSeed(changed,original,'different-id','actor'),false);
});
test('restore audit cleanup requires exact recorded disposable targets, not merely a QA prefix',()=>{
  const identity=driver.sourceIdentity(fx.specs[0],'actor',true),row={tenantId:'alianzas-soluciones',actorUid:'actor',schemaVersion:'gravicentra-advisor-commission-payable-v1',preparedRequestId:identity.requestId,action:'restore_advisor_payable_synthetic',targets:[{collection:'finmovs',id:fx.plans[0].payable.id}]};
  driver.sourceAuditGuard('restore',row,identity,'actor',false,[fx.plans[0].payable.id],[fx.plans[0].payable.id]);
  assert.throws(()=>driver.sourceAuditGuard('restore',row,identity,'actor',false,[fx.plans[0].payable.id],['b4003qa_other']));
});
