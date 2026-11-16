'use strict';
// Behavioral checks for safe failure evidence; no authentication, network or business writes.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const driver=require('./gravicentra-i6-6-advisor-payables-signed-uat.cjs');
const contract=require('../functions/advisor-commission-payable-contract');
const documentary=driver.signedDocumentaryFixtures('b4003qa_i66_cxp_components_unit');
const componentPlan=documentary.plans[0];
const copy=value=>JSON.parse(JSON.stringify(value));
function canonicalReceipt(){
  const payable=copy(componentPlan.payable),commission=copy(componentPlan.commission);
  return {financialPayments:0,bankMovements:0,payables:[payable],commissions:[commission],
    canonicalReadback:true,canonicalReadbackCount:1,
    readback:[{collection:'finmovs',id:payable.id,exists:true,estado:payable.estado,pendiente:payable.pendiente,
      financialDigest:payable.financialDigest,sourceComponents:copy(payable.sourceComponents),sourceComponentsDigest:payable.sourceComponentsDigest}],
    commissionReadback:[{collection:'comisiones',id:commission.id,exists:true,cxpAsesorId:payable.id,
      monto:38.65,montoAsesor:27.05,base:321.06,financialDigest:commission.financialDigest,
      sourceComponents:copy(commission.sourceComponents),sourceComponentsDigest:commission.sourceComponentsDigest}]};
}
const documentaryView=()=>({economicRowsVisible:true,componentRowsVisible:true,
  economicRows:[['2026-10','GTQ 38.65','70%','GTQ 27.05','pendiente']],
  componentRows:[['GAME QA-sheet:1:GAME','GTQ 296.56','12%','GTQ 35.59','GTQ 24.91'],
    ['VICO QA-sheet:1:VICO','GTQ 24.50','12.5%','GTQ 3.06','GTQ 2.14']]});
test('finance actionability snapshot keeps structural evidence and excludes arbitrary DOM identity or text',()=>{
  const secret='PRIVATE_CUSTOMER_TOKEN_example.invalid';
  const snapshot=driver.safeFinanceUiSnapshot({snapshotStatus:'CAPTURED',route:'FINANZAS',tabCount:1,
    tabConnected:true,tabVisible:true,tabEnabled:true,rect:{x:25.6,y:-3.2,width:110.49,height:30.75,secret},
    centerInViewport:true,targetReceivesPointer:false,topTag:'DIV',topId:secret,
    topClasses:['open',secret,'drawer-back','open'],legalOverlayPresent:true,legalOverlayAtTarget:true,
    legalOverlayCount:1,modalCount:1,authRestoring:false,text:secret,url:'https://'+secret,legalScope:'user:'+secret});
  assert.equal(snapshot.snapshotStatus,'CAPTURED');assert.equal(snapshot.route,'FINANZAS');assert.equal(snapshot.tabCount,1);
  assert.deepEqual(snapshot.rect,{x:26,y:-3,width:110,height:31});
  assert.equal(snapshot.topId,null);assert.deepEqual(snapshot.topClasses,['drawer-back','open']);
  assert.equal(snapshot.legalOverlayAtTarget,true);assert.equal(snapshot.targetReceivesPointer,false);
  assert.doesNotMatch(JSON.stringify(snapshot),/PRIVATE_CUSTOMER|example\.invalid|https|legalScope|"text"|"secret"/);
});
test('finance diagnostic sanitizer rejects malformed geometry, enum values and forged actionability fields',()=>{
  const secret='PRIVATE_MESSAGE_EMAIL_TOKEN';
  const snapshot=driver.safeFinanceUiSnapshot({snapshotStatus:secret,route:secret,tabCount:1.5,
    tabConnected:secret,rect:{x:Infinity,y:NaN,width:123456789,height:secret},topTag:secret,
    topId:secret,topClasses:[secret],legalOverlayCount:-1,modalCount:10001});
  assert.equal(snapshot.snapshotStatus,'UNAVAILABLE');assert.equal(snapshot.route,'UNKNOWN');
  assert.equal(snapshot.tabCount,null);assert.equal(snapshot.tabConnected,null);
  assert.deepEqual(snapshot.rect,{x:null,y:null,width:null,height:null});
  assert.equal(snapshot.topTag,null);assert.equal(snapshot.legalOverlayCount,null);assert.equal(snapshot.modalCount,null);
  const out=driver.safeFinanceUiDiagnostics({beforeClick:snapshot,onFailure:{snapshotStatus:'CAPTURED',route:'FINANZAS'},
    actionability:{pointerInterception:true,detached:secret,notVisible:false,message:secret},error:secret,actorUid:secret});
  assert.equal(out.actionability.pointerInterception,true);assert.equal(out.actionability.detached,false);
  assert.deepEqual(Object.keys(out).sort(),['actionability','beforeClick','onFailure']);
  assert.doesNotMatch(JSON.stringify(out),/PRIVATE_MESSAGE|actorUid|"message"|"error"/);
});
test('click diagnostics classify Playwright actionability without retaining the raw exception',()=>{
  const evidence=driver.safeClickActionability({message:'PRIVATE_SCOPE user@example.invalid token=SECRET\n<div> intercepts pointer events\nelement is not stable\nelement is outside of the viewport'});
  assert.deepEqual(evidence,{pointerInterception:true,detached:false,notVisible:false,notEnabled:false,notStable:true,outsideViewport:true});
  assert.doesNotMatch(JSON.stringify(evidence),/PRIVATE_SCOPE|user@|SECRET|<div>/);
});
test('exact legal scope failure survives sanitization without exposing either compared identity',()=>{
  let failure;
  try{assert.equal('user:PRIVATE_ACTOR_UID','user:private-account@example.invalid','DIRECTION_LEGAL_RUNTIME_SCOPE_MISMATCH');}catch(error){failure=error;}
  const evidence=driver.safeFailureEvidence(failure,'DIRECTION_LEGAL_ACCEPTANCE');
  assert.equal(evidence.failureClass,'ERR_ASSERTION');
  assert.equal(evidence.failureStage,'DIRECTION_LEGAL_ACCEPTANCE');
  assert.equal(evidence.failureCheck,'DIRECTION_LEGAL_RUNTIME_SCOPE_MISMATCH');
  assert.doesNotMatch(JSON.stringify(evidence),/PRIVATE_ACTOR|private-account|example\.invalid|user:|expected|actual/);
  for(const message of ['DIRECTION_LEGAL_RUNTIME_SCOPE_MISMATCH_PRIVATE_ACTOR_UID','DIRECTION_LEGAL_UNKNOWN_PRIVATE_ACTOR_UID']){
    const other=driver.safeFailureEvidence(new Error(message),'DIRECTION_LEGAL_ACCEPTANCE');
    assert.equal(other.failureCheck,'DIRECTION_LEGAL','an unknown suffix cannot impersonate the exact allowlisted code');
    assert.doesNotMatch(JSON.stringify(other),/PRIVATE_ACTOR/);
  }
});
test('legal exact-code and substage diagnostics distinguish presentation from post-click failure without private values',()=>{
  const legal=require('./gravicentra-i6-6-direction-preview-legal-acceptance.cjs');
  for(const check of legal.LEGAL_FAILURE_CHECKS){
    let failure;try{assert.equal('PRIVATE_ACTUAL','PRIVATE_EXPECTED',check);}catch(error){failure=error;}
    failure.directionLegalSubstage='PRE_CLICK_PRESENTATION';
    const out=driver.safeFailureEvidence(failure,'DIRECTION_LEGAL_ACCEPTANCE');
    assert.equal(out.failureCheck,check);assert.equal(out.failureLegalSubstage,'PRE_CLICK_PRESENTATION');
    assert.doesNotMatch(JSON.stringify(out),/PRIVATE_ACTUAL|PRIVATE_EXPECTED/);
  }
  for(const substage of legal.LEGAL_FAILURE_SUBSTAGES){
    const out=driver.safeFailureEvidence({message:'DIRECTION_LEGAL_ACCEPTANCE_NOT_PERSISTED',directionLegalSubstage:substage},'DIRECTION_LEGAL_ACCEPTANCE');
    assert.equal(out.failureLegalSubstage,substage);
  }
  const forged=driver.safeFailureEvidence({message:'DIRECTION_LEGAL_DISPLAYED_TEXT_CHANGED_PRIVATE_VALUE',directionLegalSubstage:'PRIVATE_ACTOR_VALUE'},'DIRECTION_LEGAL_ACCEPTANCE');
  assert.equal(forged.failureCheck,'DIRECTION_LEGAL');assert.equal(forged.failureLegalSubstage,undefined);
  assert.doesNotMatch(JSON.stringify(forged),/PRIVATE/);
  assert.equal(driver.safeFailureEvidence({directionLegalSubstage:'BUTTON_ACTION'},'FINANCE_UI_HYDRATION').failureLegalSubstage,undefined);
});
test('finance DOM capture sanitizes captured data and unavailable diagnostics cannot replace a click failure',async()=>{
  let calls=0;
  const captured=await driver.captureFinanceUiSnapshot({evaluate:async fn=>{calls+=1;assert.equal(typeof fn,'function');return{snapshotStatus:'CAPTURED',route:'FINANZAS',topId:'SECRET',tabCount:1,legalOverlayPresent:true};}});
  assert.equal(calls,1);assert.equal(captured.snapshotStatus,'CAPTURED');assert.equal(captured.topId,null);
  const unavailable=await driver.captureFinanceUiSnapshot({evaluate:async()=>{throw Error('SECRET_ERROR_TOKEN');}});
  assert.equal(unavailable.snapshotStatus,'UNAVAILABLE');assert.equal(unavailable.legalOverlayPresent,null);
  assert.doesNotMatch(JSON.stringify(unavailable),/SECRET/);
});
test('failed-preview artifact transports sanitized click evidence and exact source location through the workflow code',()=>{
  const vm=require('node:vm');
  const yaml=fs.readFileSync(path.join(__dirname,'../.github/workflows/gravicentra-i66-privileged-role-three-function-preview-uat.yml'),'utf8');
  const section=yaml.split('- name: Preserve sanitized failure diagnostics without an acceptance proof')[1].split('- name: Upload diagnostics only')[0];
  const code=section.split("node - <<'NODE'\n")[1].split('\n          NODE')[0].split('\n').map(line=>line.replace(/^          /,'')).join('\n');
  const secret='PRIVATE_ACTOR_CUSTOMER_TOKEN';
  const report={status:'HOLD',phase:'PREVIEW',failureStage:'DIRECTION_LEGAL_ACCEPTANCE',failureClass:'ERR_ASSERTION',
    failureLegalSubstage:'PRE_CLICK_PRESENTATION',
    failureCheck:driver.safeFailureEvidence({code:'ERR_ASSERTION',message:'DIRECTION_LEGAL_RUNTIME_SCOPE_MISMATCH\nPRIVATE_ACTOR_CUSTOMER_TOKEN'},'DIRECTION_LEGAL_ACCEPTANCE').failureCheck,
    failureLocation:{file:'gravicentra-i6-6-advisor-payables-signed-uat.cjs',line:261,column:60},
    financeUiDiagnostics:{beforeClick:{snapshotStatus:'CAPTURED',route:'FINANZAS',tabCount:1,legalOverlayPresent:true,topId:secret,text:secret},
      onFailure:{snapshotStatus:'CAPTURED',route:secret,legalOverlayAtTarget:true},actionability:{pointerInterception:true,message:secret},actorUid:secret},
    checks:[{name:'EXACT_SOURCE',status:'PASS'}],cleanup:{status:'PASS',remaining:0},rawError:secret};
  let written;
  const fakeFs={existsSync:()=>true,readFileSync:()=>JSON.stringify(report),writeFileSync:(name,value)=>{assert.equal(name,'/tmp/qa/i66-preview-failure-diagnostic.json');written=JSON.parse(value);}};
  vm.runInNewContext(code,{require:name=>{
    if(name==='node:fs')return fakeFs;if(name==='node:path')return path;
    if(name==='./tools/gravicentra-i6-6-advisor-payables-signed-uat.cjs')return driver;
    throw Error('UNEXPECTED_DIAGNOSTIC_DEPENDENCY');
  },process:{env:{RUNNER_TEMP:'/tmp/qa',GITHUB_RUN_ID:'71',SOURCE_SHA:'a'.repeat(40)}}});
  assert.equal(written.status,'FAILED_NOT_ACCEPTED');assert.equal(written.reports.length,1);
  assert.deepEqual(written.reports[0].failureLocation,report.failureLocation);
  assert.equal(written.reports[0].failureCheck,'DIRECTION_LEGAL_RUNTIME_SCOPE_MISMATCH');
  assert.equal(written.reports[0].failureLegalSubstage,'PRE_CLICK_PRESENTATION');
  assert.equal(written.reports[0].financeUiDiagnostics.beforeClick.legalOverlayPresent,true);
  assert.equal(written.reports[0].financeUiDiagnostics.onFailure.legalOverlayAtTarget,true);
  assert.equal(written.reports[0].financeUiDiagnostics.actionability.pointerInterception,true);
  assert.equal(written.reports[0].remaining,0);
  assert.doesNotMatch(JSON.stringify(written),/PRIVATE_ACTOR|rawError|actorUid|"message"/);
  report.failureLegalSubstage=secret;
  vm.runInNewContext(code,{require:name=>name==='node:fs'?fakeFs:name==='node:path'?path:driver,process:{env:{RUNNER_TEMP:'/tmp/qa',GITHUB_RUN_ID:'71',SOURCE_SHA:'a'.repeat(40)}}});
  assert.equal(written.reports[0].failureLegalSubstage,undefined);
  assert.doesNotMatch(JSON.stringify(written),/PRIVATE_ACTOR/);
});
test('signed runtime fixture uses two coverage lines of one requirement with per-line cents and unchanged economic IDs',()=>{
  const historical=driver.fixtures(documentary.runId),spec=documentary.specs[0],line=spec.lines[0];
  assert.equal(documentary.rows.length,10);assert.equal(spec.lines.length,1);assert.equal(line.components.length,2);
  assert.deepEqual(line.components.map(row=>[row.coverageCode,row.ordinaryCommission,row.base,row.pct]),
    [['VICO',3.06,24.50,12.5],['GAME',35.59,296.56,12]]);
  assert.equal(new Set(line.components.map(row=>row.source.requirementRef)).size,1);
  assert.equal(new Set(line.components.map(row=>row.source.lineId)).size,2);
  assert.equal(componentPlan.payable.id,historical.plans[0].payable.id);
  assert.equal(componentPlan.commission.id,historical.plans[0].commission.id);
  assert.equal(componentPlan.payable.valor,27.05);assert.equal(componentPlan.payable.pendiente,27.05);
  assert.equal(componentPlan.commission.monto,38.65);assert.equal(componentPlan.commission.montoAsesor,27.05);
  assert.equal(componentPlan.payable.base,321.06);assert.equal(componentPlan.payable.pct,undefined);
  assert.equal(contract.sourceIdentities(componentPlan.payable).length,2);
  assert.deepEqual(documentary.plans.map(plan=>plan.payable.valor),[27.05,45.33]);
  assert.deepEqual(historical.plans.map(plan=>plan.payable.valor),[70.92,45.33]);
  assert.match(driver.main.toString(),/fx=signedDocumentaryFixtures\(runId\)/);
});
test('documentary receipt validation requires one CxP and both canonical ledgers with exact component proof',()=>{
  const receipt=canonicalReceipt();
  driver.assertDocumentaryReceipt({financialPayments:0,bankMovements:0,payables:receipt.payables},componentPlan);
  driver.assertDocumentaryReceipt(receipt,componentPlan,true);
  driver.assertDocumentaryReceipt({...receipt,reused:true,newPayables:0,reusedPayables:1,totals:{GTQ:0}},componentPlan,true);
  for(const change of [
    row=>{row.payables.push(copy(row.payables[0]));},
    row=>{row.payables[0].valor=27.06;},
    row=>{row.commissions[0].montoAsesor=27.06;},
    row=>{row.commissions[0].sourceComponents[0].advisorAmount=24.92;},
    row=>{row.readback[0].sourceComponents.pop();},
    row=>{row.commissionReadback[0].sourceComponentsDigest='0'.repeat(64);},
    row=>{row.commissionReadback[0].base=321;},
    row=>{row.canonicalReadbackCount=2;},
    row=>{row.financialPayments=1;}
  ]){const altered=canonicalReceipt();change(altered);assert.throws(()=>driver.assertDocumentaryReceipt(altered,componentPlan,true),/ADVISOR_UAT_DOCUMENT_COMPONENTS_MISMATCH/);}
});
test('persisted component validation rejects changed sources or cents even with a retained financial digest',()=>{
  for(const [kind,expected] of [['finmovs',componentPlan.payable],['comisiones',componentPlan.commission]]){
    driver.assertDocumentaryRow(copy(expected),expected,kind);
    for(const change of [
      row=>{row.sourceComponents[1].source.lineId='QA-other-line';},
      row=>{row.sourceComponents[1].ordinaryCommission=3.07;},
      row=>{row.sourceComponents[1].pct=12;},
      row=>{row.sourceComponents[1].advisorAmount=2.15;},
      row=>{row.sourceComponents=undefined;},
      row=>{row.base=321;},
      row=>{row.pct=12;}
    ]){
      const altered=copy(expected);change(altered);
      assert.throws(()=>driver.assertDocumentaryRow(altered,expected,kind),/ADVISOR_UAT_DOCUMENT_COMPONENTS_MISMATCH/);
      assert.throws(()=>driver.assertGenerated({...altered,preparationRequestId:'qa-request',createdByUid:'qa-actor'},
        expected,'qa-request','qa-actor',kind),/ADVISOR_UAT_CLEANUP_(SOURCE_OR_BUSINESS_CHANGED|UNRECOGNIZED_FIELD)/);
    }
  }
});
test('source audit preserves both exact component source keys for one CxP in request and event',()=>{
  const identity=driver.sourceIdentity(documentary.specs[0],'qa-actor',true),id=componentPlan.payable.id;
  const keys=contract.sourceIdentities(componentPlan.payable).map(row=>row.sourceKey);
  const event={schemaVersion:contract.SCHEMA,tenantId:'alianzas-soluciones',actorUid:'qa-actor',requestId:identity.requestId,
    payloadDigest:identity.inputDigest,action:'prepare_advisor_commission_payables',payableIds:[id],sourceKeys:keys,
    financialPayments:0,bankMovements:0};
  driver.sourceAuditGuard('event',event,identity,'qa-actor',false,[id],[],keys);
  for(const wrongKeys of [keys.slice(0,1),[keys[0],keys[0]],[keys[0],'unrelated-source']])
    assert.throws(()=>driver.sourceAuditGuard('event',{...event,sourceKeys:wrongKeys},identity,'qa-actor',false,[id],[],keys),/ADVISOR_UAT_SOURCE_COMPONENT_AUDIT_MISMATCH/);
  const request={actorUid:'qa-actor',payloadDigest:identity.inputDigest,status:'committed',
    result:{schemaVersion:contract.SCHEMA,syntheticQa:true,previewIsolated:true,requestId:identity.requestId,
      payables:[copy(componentPlan.payable)],financialPayments:0,bankMovements:0}};
  driver.sourceAuditGuard('request',request,identity,'qa-actor',false,[id],[],keys);
  request.result.payables[0].sourceComponents.pop();
  assert.throws(()=>driver.sourceAuditGuard('request',request,identity,'qa-actor',false,[id],[],keys),/ADVISOR_UAT_SOURCE_COMPONENT_AUDIT_MISMATCH/);
});
test('visible documentary rows cannot hide components, round aggregate cents or swap premium and commission',()=>{
  driver.assertDocumentaryView(documentaryView(),componentPlan);
  for(const change of [
    view=>{view.economicRows[0][3]='GTQ 27.06';},
    view=>{view.componentRows[0][1]='GTQ 35.59';},
    view=>{view.componentRows[1][4]='GTQ 2.15';},
    view=>{view.componentRows.pop();},
    view=>{view.componentRowsVisible=false;},
    view=>{view.economicRows.push(copy(view.economicRows[0]));}
  ]){const view=documentaryView();change(view);assert.throws(()=>driver.assertDocumentaryView(view,componentPlan),/ADVISOR_UAT_DOCUMENT_COMPONENTS_MISMATCH/);}
});
test('the visible document extractor checks actual nested financial cells without retaining the customer cell',async()=>{
  const vm=require('node:vm'),secret='PRIVATE_CUSTOMER_CELL';
  const row=(cells,nested=[])=>({cells:cells.map(innerText=>({innerText})),
    querySelectorAll:selector=>{assert.equal(selector,'table > tbody > tr');return nested;},
    getBoundingClientRect:()=>({width:400,height:25})});
  const componentRows=documentaryView().componentRows.map(values=>row(values));
  const rows=[row([secret,...documentaryView().economicRows[0]]),row(['details'],componentRows)];
  const root={querySelector:selector=>{assert.equal(selector,'table');return {tBodies:[{rows}]};}};
  let captured;
  const page={locator:selector=>{assert.equal(selector,'#liq-document');return {evaluate:async fn=>{
    captured=JSON.parse(JSON.stringify(vm.runInNewContext('('+fn.toString()+')(root)',{root,getComputedStyle:()=>({display:'table-row',visibility:'visible'})})));
    return captured;
  }};}};
  await driver.assertVisibleDocumentaryView(page,'#liq-document',componentPlan);
  assert.deepEqual(captured,documentaryView());assert.doesNotMatch(JSON.stringify(captured),/PRIVATE_CUSTOMER/);
  componentRows[1].getBoundingClientRect=()=>({width:0,height:0});
  await assert.rejects(()=>driver.assertVisibleDocumentaryView(page,'#liq-document',componentPlan),/ADVISOR_UAT_DOCUMENT_COMPONENTS_MISMATCH/);
});
const assignmentFx=driver.withAssignmentFixtures(documentary);
const assignmentSteps=driver.assignmentStepsFor(assignmentFx,'qa-actor',false);
function assignmentCanonicalReceipt(step){
  return {...driver.assignmentReceiptFor(step,true,false),canonicalReadback:true,preservationVerified:true,
    readback:step.afterRows.filter(([collection,row])=>collection==='clientes'&&row.id===step.spec.clientId||
      collection==='polizas'&&step.spec.policyIds.includes(row.id)).map(([collection,record])=>({collection,id:record.id,record:copy(record)}))};
}
function assignmentAuditRows(step){
  const plan=step.commitPlan;
  return {request:{schemaVersion:plan.schemaVersion,status:'committed',payloadDigest:step.commitIdentity.inputDigest,
    actorUid:'qa-actor',previewIsolated:true,result:driver.assignmentReceiptFor(step,true,false),committedAt:'SERVER_TIME'},
    event:{schemaVersion:plan.schemaVersion,tenantId:'alianzas-soluciones',eventId:step.commitIdentity.eventId,
      requestId:step.commitIdentity.requestId,actorUid:'qa-actor',activeRole:'direccion',action:'correct_advisor_assignment',
      intent:plan.intent,sourceProvenance:plan.sourceProvenance,payloadDigest:plan.payloadDigest,previewDigest:plan.previewDigest,
      expectedBefore:plan.expectedBefore,changes:plan.changes,preservationFingerprints:plan.preservationFingerprints,
      financialWrites:0,historicalAssignmentsPreserved:true,createdAt:'SERVER_TIME'}};
}
test('assignment runtime fixtures preserve all six related collections and compensation restores exact original records',()=>{
  assert.equal(documentary.rows.length,10);assert.equal(assignmentFx.rows.length,16);
  assert.equal(new Set(assignmentFx.rows.map(([,row])=>row.id)).size,16);
  for(const [,row] of assignmentFx.rows){assert.equal(row.__syntheticQa,true);assert.equal(row.__qaRunId,assignmentFx.runId);}
  assert.equal(assignmentSteps.length,2);assert.deepEqual(assignmentSteps[1].afterRows,assignmentFx.rows);
  const forward=assignmentSteps[0];assert.equal(forward.commitPlan.changes.length,2);
  assert.deepEqual(forward.commitPlan.changes.map(row=>[row.collection,row.fromAdvisorId,row.toAdvisorId]),
    [['clientes',assignmentFx.ids.advisor60,assignmentFx.ids.advisor70],['polizas',assignmentFx.ids.advisor60,assignmentFx.ids.advisor70]]);
  for(const collection of ['recibosEsperados','carteraPrimas','cobros','comisiones','finmovs','vehiculos']){
    assert.ok(forward.commitPlan.preservationFingerprints[collection].count>0);
    assert.deepEqual(forward.beforeRows.filter(([c])=>c===collection),forward.afterRows.filter(([c])=>c===collection));
  }
  const policy=forward.afterRows.find(([c,row])=>c==='polizas'&&row.id===assignmentFx.ids.policy60)[1];
  assert.equal(policy.primaNeta,321.06);assert.equal(policy.primaTotal,359.59);assert.equal(policy.cuotas,12);
  const paid=forward.afterRows.find(([,row])=>row.id===assignmentFx.ids.assignmentHistoricalPayable)[1];
  assert.equal(paid.periodo,'2026-09');assert.equal(paid.pagado,10.67);assert.equal(paid.pendiente,0);
});
test('assignment commit identity is the actual UI preview-digest key and remains distinct from preview and compensation',()=>{
  const identities=assignmentSteps.flatMap(step=>{
    assert.equal(step.commitIdentity.requestId,'advcorr_'+step.previewPlan.previewDigest.slice(0,40));
    assert.notEqual(step.previewIdentity.requestId,step.commitIdentity.requestId);
    assert.equal(driver.assignmentIdentity(step.commitSpec,'qa-actor',true,step.commitIdentity.requestId).inputDigest,step.commitIdentity.inputDigest);
    assert.notEqual(driver.assignmentIdentity(step.commitSpec,'other-actor',true,step.commitIdentity.requestId).inputDigest,step.commitIdentity.inputDigest);
    assert.notEqual(driver.assignmentIdentity(step.commitSpec,'qa-actor',false,step.commitIdentity.requestId).inputDigest,step.commitIdentity.inputDigest);
    assert.equal(require('node:crypto').createHash('sha256').update(step.bytes).digest('hex'),step.spec.sourceAuthority.sourceSha256);
    return [step.previewIdentity.requestId,step.commitIdentity.requestId];
  });
  assert.equal(new Set(identities).size,4);
});
test('assignment receipt validation requires exact source, preimage, sparse change, preservation and canonical readback',()=>{
  const step=assignmentSteps[0];
  driver.assertAssignmentReceipt(driver.assignmentReceiptFor(step,false,false),step,false,false);
  driver.assertAssignmentReceipt(assignmentCanonicalReceipt(step),step,true,false);
  for(const change of [
    row=>{row.requestId=step.previewIdentity.requestId;},
    row=>{row.expectedBefore[0].recordDigest='0'.repeat(64);},
    row=>{row.changes[0].patch.prima=1;},
    row=>{row.preservationFingerprints.comisiones.count=0;},
    row=>{row.readback[1].record.primaNeta=0;},
    row=>{row.readback[0].record.asesorId=assignmentFx.ids.advisor60;},
    row=>{row.financialWrites=1;},
    row=>{row.preservationVerified=false;}
  ]){const row=copy(assignmentCanonicalReceipt(step));change(row);assert.throws(()=>driver.assertAssignmentReceipt(row,step,true,false),/ADVISOR_UAT_ASSIGNMENT_PROOF_MISMATCH/);}
});
test('assignment audit cleanup rejects foreign receipts or unrecorded changes before deleting exact fixture audit',()=>{
  const step=assignmentSteps[0],rows=assignmentAuditRows(step);
  for(const kind of ['request','event']){
    driver.assignmentAuditGuard(kind,rows[kind],step,'qa-actor',false);
    for(const change of [row=>{row.actorUid='other-actor';},row=>{row.payloadDigest='0'.repeat(64);},row=>{row.unrecognizedEdit='do not delete';}]){
      const row=copy(rows[kind]);change(row);assert.throws(()=>driver.assignmentAuditGuard(kind,row,step,'qa-actor',false),/ADVISOR_UAT_ASSIGNMENT_AUDIT_MISMATCH/);
    }
  }
  const altered=copy(rows.request);altered.result.changes[0].patch.primaNeta=1;
  assert.throws(()=>driver.assignmentAuditGuard('request',altered,step,'qa-actor',false),/ADVISOR_UAT_ASSIGNMENT_AUDIT_MISMATCH/);
  assert.throws(()=>driver.assignmentAuditGuard('request',rows.request,step,'qa-actor',true),/ADVISOR_UAT_ASSIGNMENT_AUDIT_MISMATCH/);
});
test('signed reload oracle retains historical financial advisor while operational children follow the current policy',()=>{
  const rows=driver.assignmentProjectionRows(assignmentSteps[0]),ids=assignmentFx.ids;
  for(const id of [ids.assignmentHistoricalCommission,ids.assignmentHistoricalPayable])
    assert.equal(rows.find(([,row])=>row.id===id)[1].asesorId,ids.advisor60);
  for(const id of [ids.assignmentReceipt,ids.assignmentPortfolio,ids.assignmentPayment,ids.assignmentVehicle])
    assert.equal(rows.find(([,row])=>row.id===id)[1].asesorId,ids.advisor70);
  assert.deepEqual(assignmentSteps[1].afterRows,assignmentFx.rows);
  assert.deepEqual(documentary.plans.map(plan=>plan.payable.valor),[27.05,45.33]);
});
