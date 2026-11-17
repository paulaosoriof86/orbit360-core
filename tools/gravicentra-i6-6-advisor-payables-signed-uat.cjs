'use strict';
// Existing same-project CI credentials + existing signed actors only.
// No Auth/membership changes, no bank/payment commands, no real source lines.
// This runner is opt-in and deletes only exact disposable fixtures it created.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const contract=require('../functions/advisor-commission-payable-contract');
const assignment=require('../functions/advisor-assignment-correction-contract');
const {acceptDirectionPreviewLegal,LEGAL_FAILURE_CHECKS,safeLegalFailureSubstage}=require('./gravicentra-i6-6-direction-preview-legal-acceptance.cjs');
const {runDocumentedTermsCheck}=require('./gravicentra-i6-6-documented-terms-signed-check.cjs');
const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones';
const SOURCE_SCHEMA='gravicentra-advisor-commission-source-batch-v1';
const hash=value=>crypto.createHash('sha256').update(String(value)).digest('hex');
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'
  ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
const digest=value=>hash(JSON.stringify(stable(value)));
const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

function configuration(env){
  const live=env.I66_SIGNED_TEST_LIVE==='true',origin=String(env.I66_PREVIEW_ORIGIN||''),source=String(env.I66_SOURCE_SHA||'');
  assert.match(source,/^[a-f0-9]{40}$/,'ADVISOR_UAT_SOURCE_SHA_REQUIRED');
  assert.match(origin,live?/^https:\/\/app\.aysseguros\.com$/:/^https:\/\/ays-orbit-360-lab--gi-i66-rc-[a-z0-9-]+\.web\.app$/,'ADVISOR_UAT_EXACT_AUTHORIZED_ORIGIN_REQUIRED');
  return {live,origin,source,phase:live?'LIVE':'PREVIEW',region:live?'us-central1':'us-east1',
    functionName:live?'orbit360ProductOperationalCommand':'orbit360ProductOperationalCommandPreview',
    packageRoot:env.I66_PACKAGE_ROOT||'',reportPath:env.I66_ADVISOR_PAYABLE_UAT_REPORT||
      path.join(env.RUNNER_TEMP||os.tmpdir(),'gravicentra-i66-advisor-payables-signed-uat-'+(live?'live':'preview')+'.json')};
}
function sourceIdentity(spec,uid,previewOnly){
  const inputDigest=digest({advisorId:spec.advisorId,cutoff:spec.cutoff,refs:[].concat(spec.commissionIds||[]),
    supplied:[].concat(spec.lines||[]),syntheticRun:spec.syntheticQa===true,previewOnly});
  const requestId='advisorpay_'+hash(TENANT+'|'+uid+'|'+inputDigest).slice(0,32);
  return {requestId,inputDigest,eventId:'opevt_'+hash(TENANT+'|'+requestId).slice(0,28),
    restoreEventId:'opevt_'+hash(TENANT+'|'+requestId+'|restore').slice(0,28)};
}
function fixtures(runId){
  assert.match(runId,/^b4003qa_i66_cxp_[a-z0-9_]+$/,'ADVISOR_UAT_DISPOSABLE_RUN_ID_REQUIRED');
  const ids={client:runId+'_client',advisor70:runId+'_advisor70',advisor60:runId+'_advisor60',
    policy70:runId+'_policy70',policy60:runId+'_policy60',oldPayablePolicy:runId+'_old_cxp_policy',
    oldCommissionPolicy:runId+'_old_com_policy',oldPayable:runId+'_old_cxp',oldCommission:runId+'_old_com',ordinary:runId+'_ordinary'};
  const base=id=>({id,tenantId:TENANT,pais:'GT',__syntheticQa:true,__qaRunId:runId});
  const adviser=(id,pct)=>({...base(id),nombre:'QA liquidación '+pct,activo:true,estado:'Activo',paises:['GT'],countries:['GT'],paisDefault:'GT',roles:['Asesor'],tipo:'Asesor',comModo:'comision',shareCom:pct});
  const policy=(id,advisorId)=>({...base(id),clienteId:ids.client,asesorId:advisorId,numero:'QA-'+id,
    moneda:'GTQ',estado:'Vigente',renovable:true,vigenciaInicio:'2026-01-01',vigenciaFin:'2026-12-31'});
  const rows=[
    ['asesores',adviser(ids.advisor70,70)],['asesores',adviser(ids.advisor60,60)],
    ['clientes',{...base(ids.client),nombre:'QA cliente descartable',asesorId:ids.advisor70}],
    ['polizas',policy(ids.policy70,ids.advisor70)],['polizas',policy(ids.policy60,ids.advisor60)],
    ['polizas',policy(ids.oldPayablePolicy,ids.advisor70)],['polizas',policy(ids.oldCommissionPolicy,ids.advisor70)],
    ['finmovs',{...base(ids.oldPayable),tipo:'egreso',clase:'Comisiones asesores',estado:'pagado',pagada:true,
      polizaId:ids.oldPayablePolicy,asesorId:ids.advisor70,clienteId:ids.client,periodo:'2026-10',moneda:'GTQ',valor:7,pagado:7,pendiente:0}],
    ['comisiones',{...base(ids.oldCommission),polizaId:ids.oldCommissionPolicy,asesorId:ids.advisor70,
      clienteId:ids.client,periodo:'2026-10',moneda:'GTQ',monto:10,estado:'Liquidada'}],
    ['finmovs',{...base(ids.ordinary),tipo:'egreso',clase:'Servicios',concepto:'QA servicio anterior',estado:'pendiente',
      asesorId:ids.advisor70,periodo:'2026-10',moneda:'GTQ',valor:5,pagado:0,pendiente:5}]
  ];
  const line=(policyId,pct,index,amount)=>({polizaId:policyId,ordinaryCommission:amount,commissionKind:'ordinary',
    source:{fileId:runId+'_statement',lineId:'QA-sheet:'+index,sha256:hash(runId+'_statement_bytes'),
      reference:'https://example.invalid/qa-only/'+runId,requirementRef:'QA-OCT-'+runId+'-'+index},
    accreditation:{status:'accredited',date:'2026-10-31'},collectionPeriod:'2026-10',moneda:'GTQ',
    participation:{pct,authorityRef:'QA-only-explicit-'+pct}});
  const specs=[{version:1,operation:'preview',advisorId:ids.advisor70,cutoff:'2026-11-15',syntheticQa:true,lines:[line(ids.policy70,70,1,101.31)]},
    {version:1,operation:'preview',advisorId:ids.advisor60,cutoff:'2026-11-15',syntheticQa:true,lines:[line(ids.policy60,60,2,75.55)]}];
  const historical=[{...specs[0],lines:[line(ids.oldPayablePolicy,70,3,10)]},
    {...specs[0],lines:[line(ids.oldCommissionPolicy,70,4,10)]}];
  const plans=specs.map(spec=>contract.normalizeLine(spec.lines[0],{tenantId:TENANT,cutoff:spec.cutoff,synthetic:true,
    advisor:rows.find(([collection,row])=>collection==='asesores'&&row.id===spec.advisorId)[1],
    policy:rows.find(([collection,row])=>collection==='polizas'&&row.id===spec.lines[0].polizaId)[1]}));
  return {runId,ids,rows,specs,historical,plans};
}
function signedDocumentaryFixtures(runId){
  // Keep the historical single-line fixture available to its pinned tests.
  // The signed run exercises the two documented coverages of one requirement.
  const fx=fixtures(runId),spec=fx.specs[0],original=spec.lines[0];
  const components=[
    {coverageCode:'VICO',ordinaryCommission:3.06,base:24.50,pct:12.5,
      source:{...original.source,lineId:'QA-sheet:1:VICO'}},
    {coverageCode:'GAME',ordinaryCommission:35.59,base:296.56,pct:12,
      source:{...original.source,lineId:'QA-sheet:1:GAME'}}
  ];
  const line={...original,source:components[0].source,ordinaryCommission:38.65,base:321.06,components};
  fx.specs[0]={...spec,lines:[line]};
  fx.plans[0]=contract.normalizeLine(line,{tenantId:TENANT,cutoff:spec.cutoff,synthetic:true,
    advisor:fx.rows.find(([collection,row])=>collection==='asesores'&&row.id===spec.advisorId)[1],
    policy:fx.rows.find(([collection,row])=>collection==='polizas'&&row.id===line.polizaId)[1]});
  // An independent cent oracle prevents both sides of a signed assertion from
  // agreeing on the same erroneous aggregate rounding (38.65 * 70% = 27.06).
  const plan=fx.plans[0];
  assert.equal(plan.payable.valor,27.05,'ADVISOR_UAT_DOCUMENT_COMPONENTS_MISMATCH');
  assert.equal(plan.commission.monto,38.65,'ADVISOR_UAT_DOCUMENT_COMPONENTS_MISMATCH');
  assert.deepEqual(plan.payable.sourceComponents.map(row=>[row.coverageCode,row.ordinaryCommission,row.advisorAmount]),
    [['GAME',35.59,24.91],['VICO',3.06,2.14]],'ADVISOR_UAT_DOCUMENT_COMPONENTS_MISMATCH');
  return fx;
}
function withAssignmentFixtures(original){
  const fx=JSON.parse(JSON.stringify(original)),{runId,ids}=fx;
  assert.match(runId,/^b4003qa_i66_cxp_[a-z0-9_]+$/,'ADVISOR_UAT_DISPOSABLE_RUN_ID_REQUIRED');
  const client=fx.rows.find(([collection,row])=>collection==='clientes'&&row.id===ids.client)[1];
  client.asesorId=ids.advisor60;
  const policy=fx.rows.find(([collection,row])=>collection==='polizas'&&row.id===ids.policy60)[1];
  Object.assign(policy,{primaNeta:321.06,baseGravable:321.06,ivaPct:12,ivaMonto:38.53,
    prima:359.59,primaTotal:359.59,gastosEmision:0,gastosFinan:0,otros:0,frecuencia:'Mensual',cuotas:12});
  Object.assign(ids,{assignmentReceipt:runId+'_assignment_receipt',assignmentPortfolio:runId+'_assignment_portfolio',
    assignmentPayment:runId+'_assignment_payment',assignmentVehicle:runId+'_assignment_vehicle',
    assignmentHistoricalCommission:runId+'_assignment_september_commission',assignmentHistoricalPayable:runId+'_assignment_september_payable'});
  const base=id=>({id,tenantId:TENANT,pais:'GT',moneda:'GTQ',__syntheticQa:true,__qaRunId:runId,
    clienteId:ids.client,polizaId:ids.policy60,asesorId:ids.advisor60});
  fx.rows.push(
    ['recibosEsperados',{...base(ids.assignmentReceipt),cuota:1,montoTotal:29.97,monto:29.97,neta:26.76,iva:3.21,
      fechaLimite:'2026-10-15',estado:'Pagado',pagado:29.97,pendiente:0}],
    ['carteraPrimas',{...base(ids.assignmentPortfolio),reciboId:ids.assignmentReceipt,monto:29.97,
      pagado:29.97,pendiente:0,saldo:0,estado:'Pagado'}],
    ['cobros',{...base(ids.assignmentPayment),reciboId:ids.assignmentReceipt,cuota:1,monto:29.97,
      fechaPago:'2026-10-14',estado:'Pagado',metodo:'Transferencia QA histórica'}],
    ['vehiculos',{...base(ids.assignmentVehicle),placa:'QA-ONLY',marca:'QA',linea:'QA',estado:'Vigente'}],
    ['comisiones',{...base(ids.assignmentHistoricalCommission),periodo:'2026-09',monto:17.79,montoAsesor:10.67,
      pctAsesor:60,estado:'Liquidada',cxpAsesorId:ids.assignmentHistoricalPayable}],
    ['finmovs',{...base(ids.assignmentHistoricalPayable),periodo:'2026-09',comisionId:ids.assignmentHistoricalCommission,
      tipo:'egreso',clase:'Comisiones asesores',estado:'pagado',pagada:true,valor:10.67,pagado:10.67,pendiente:0}]
  );
  return fx;
}
function assignmentIdentity(spec,uid,previewOnly,explicitRequestId){
  const inputDigest=digest({tenantId:TENANT,actorUid:uid,previewOnly,spec:assignment.normalizeSpec(spec)});
  const requestId=explicitRequestId||'advcorr_'+hash(inputDigest).slice(0,40);
  return {requestId,inputDigest,eventId:'opevt_'+hash(TENANT+'|'+requestId).slice(0,28)};
}
function assignmentStepsFor(fx,uid,live){
  let rows=JSON.parse(JSON.stringify(fx.rows));
  return [fx.ids.advisor70,fx.ids.advisor60].map((targetAdvisorId,index)=>{
    const fileName='qa-advisor-assignment-'+(index?'restore':'forward')+'.json';
    const bytes=JSON.stringify({syntheticQa:true,runId:fx.runId,clientId:fx.ids.client,policyId:fx.ids.policy60,
      fromAdvisorId:index?fx.ids.advisor70:fx.ids.advisor60,targetAdvisorId});
    const spec={version:1,operation:'preview',clientId:fx.ids.client,policyIds:[fx.ids.policy60],updateClient:true,
      targetAdvisorId,reason:index?'QA compensación exacta del asesor original':'QA corrección documentada de asesor',
      sourceAuthority:{decisionRef:'QA-only-'+fx.runId+'-'+index,sourceReference:fileName,sourceSha256:hash(bytes),
        lineRef:'QA-decision:'+(index+1),period:'2026-10'}};
    const get=(collection,id)=>rows.find(([c,row])=>c===collection&&row.id===id)[1];
    const preservedRows=Object.fromEntries(assignment.PRESERVED_COLLECTIONS.map(collection=>[collection,
      rows.filter(([c,row])=>c===collection&&(row.polizaId===fx.ids.policy60||row.policyId===fx.ids.policy60||
        row.clienteId===fx.ids.client||row.clientId===fx.ids.client)).map(([,row])=>({...row,__assignmentStoredId:row.id}))]));
    const context={tenantId:TENANT,actor:{uid,activeRole:'direccion',countries:['GT']},scopeAuthorized:true,
      client:get('clientes',fx.ids.client),policies:[get('polizas',fx.ids.policy60)],
      targetAdvisor:get('asesores',targetAdvisorId),preservedRows};
    const previewPlan=assignment.buildPlan(spec,context);
    const commitSpec={...spec,operation:'commit',expectedBefore:previewPlan.expectedBefore,expectedPreviewDigest:previewPlan.previewDigest};
    const commitPlan=assignment.buildPlan(commitSpec,context),previewIdentity=assignmentIdentity(spec,uid,!live);
    // The existing UI core binds commit retries to the exact preview digest.
    const commitIdentity=assignmentIdentity(commitSpec,uid,!live,'advcorr_'+previewPlan.previewDigest.slice(0,40));
    const beforeRows=rows;
    rows=rows.map(([collection,row])=>[collection,commitPlan.changes.some(change=>change.collection===collection&&change.id===row.id)
      ?{...row,asesorId:targetAdvisorId}:{...row}]);
    return {fileName,bytes,spec,previewPlan,commitSpec,commitPlan,previewIdentity,commitIdentity,beforeRows,afterRows:rows};
  });
}
function assignmentReceiptFor(step,committed,live){
  const identity=committed?step.commitIdentity:step.previewIdentity;
  return {ok:true,requestId:identity.requestId,eventId:identity.eventId,previewIsolated:!live,
    ...(committed?step.commitPlan:step.previewPlan),...(committed?{readOnly:false,committed:true}:{})};
}
function assignmentProjectionRows(step){
  // Operational child access follows the current policy owner on signed
  // reload. Financial beneficiaries remain attached to their original ledger.
  const operational=new Set(['recibosEsperados','carteraPrimas','cobros','vehiculos']);
  return step.afterRows.filter(([collection])=>collection!=='asesores').map(([collection,row])=>[
    collection,operational.has(collection)&&step.spec.policyIds.includes(row.polizaId)
      ?{...row,asesorId:step.spec.targetAdvisorId}:row]);
}
function assertAssignmentReceipt(receipt,step,committed,live){
  const expected=assignmentReceiptFor(step,committed,live);
  assert.ok(receipt&&typeof receipt==='object','ADVISOR_UAT_ASSIGNMENT_PROOF_MISMATCH');
  for(const [key,value] of Object.entries(expected))assert.deepEqual(receipt[key],value,'ADVISOR_UAT_ASSIGNMENT_PROOF_MISMATCH_'+key);
  if(!committed){assert.notEqual(receipt.committed,true,'ADVISOR_UAT_ASSIGNMENT_PROOF_MISMATCH');return;}
  assert.equal(receipt.canonicalReadback,true,'ADVISOR_UAT_ASSIGNMENT_PROOF_MISMATCH');
  assert.equal(receipt.preservationVerified,true,'ADVISOR_UAT_ASSIGNMENT_PROOF_MISMATCH');
  const expectedRows=step.afterRows.filter(([collection,row])=>collection==='clientes'&&row.id===step.spec.clientId||
    collection==='polizas'&&step.spec.policyIds.includes(row.id));
  assert.deepEqual(receipt.readback,expectedRows.map(([collection,record])=>({collection,id:record.id,record})),
    'ADVISOR_UAT_ASSIGNMENT_PROOF_MISMATCH_readback');
}
function assignmentAuditGuard(kind,row,step,uid,live){
  assert.ok(row,'ADVISOR_UAT_ASSIGNMENT_AUDIT_MISMATCH');
  if(kind==='request'){
    const {committedAt,...actual}=row;
    assert.ok(committedAt,'ADVISOR_UAT_ASSIGNMENT_AUDIT_MISMATCH');
    assert.deepEqual(actual,{schemaVersion:assignment.SCHEMA,status:'committed',payloadDigest:step.commitIdentity.inputDigest,
      actorUid:uid,previewIsolated:!live,result:assignmentReceiptFor(step,true,live)},'ADVISOR_UAT_ASSIGNMENT_AUDIT_MISMATCH');
  }else{
    const {createdAt,activeRole,...actual}=row,plan=step.commitPlan;
    assert.ok(createdAt&&norm(activeRole)==='direccion','ADVISOR_UAT_ASSIGNMENT_AUDIT_MISMATCH');
    assert.deepEqual(actual,{schemaVersion:assignment.SCHEMA,tenantId:TENANT,eventId:step.commitIdentity.eventId,
      requestId:step.commitIdentity.requestId,actorUid:uid,action:'correct_advisor_assignment',intent:plan.intent,
      sourceProvenance:plan.sourceProvenance,payloadDigest:plan.payloadDigest,previewDigest:plan.previewDigest,
      expectedBefore:plan.expectedBefore,changes:plan.changes,preservationFingerprints:plan.preservationFingerprints,
      financialWrites:0,historicalAssignmentsPreserved:true},'ADVISOR_UAT_ASSIGNMENT_AUDIT_MISMATCH');
  }
}
const DOCUMENTARY_COMMON_FIELDS=Object.freeze(['id','tenantId','asesorId','polizaId','clienteId','moneda','pais',
  'pctAsesor','sourceKey','economicKey','financialDigest','base','pct','source','sourceComponents','sourceComponentsDigest']);
const DOCUMENTARY_PAYABLE_FIELDS=Object.freeze([...DOCUMENTARY_COMMON_FIELDS,'comisionId','estado','valor',
  'pendiente','pagado','pagada','noBankMovement','comisionOrdinariaAcreditada']);
const DOCUMENTARY_COMMISSION_FIELDS=Object.freeze([...DOCUMENTARY_COMMON_FIELDS,'cxpAsesorId','estado','monto','montoAsesor']);
function assertDocumentaryRow(row,expected,kind){
  const fields=kind==='finmovs'?DOCUMENTARY_PAYABLE_FIELDS:DOCUMENTARY_COMMISSION_FIELDS;
  assert.ok(row&&typeof row==='object','ADVISOR_UAT_DOCUMENT_COMPONENTS_MISMATCH');
  for(const key of fields)assert.deepEqual(row[key],expected[key],'ADVISOR_UAT_DOCUMENT_COMPONENTS_MISMATCH_'+key);
}
function assertDocumentaryReceipt(receipt,plan,canonical=false){
  assert.equal(receipt?.financialPayments,0,'ADVISOR_UAT_DOCUMENT_COMPONENTS_MISMATCH');
  assert.equal(receipt?.bankMovements,0,'ADVISOR_UAT_DOCUMENT_COMPONENTS_MISMATCH');
  assert.equal(receipt?.payables?.length,1,'ADVISOR_UAT_DOCUMENT_COMPONENTS_MISMATCH');
  assertDocumentaryRow(receipt.payables[0],plan.payable,'finmovs');
  if(!canonical)return;
  assert.equal(receipt.canonicalReadback,true,'ADVISOR_UAT_DOCUMENT_COMPONENTS_MISMATCH');
  assert.equal(receipt.canonicalReadbackCount,1,'ADVISOR_UAT_DOCUMENT_COMPONENTS_MISMATCH');
  assert.equal(receipt.commissions?.length,1,'ADVISOR_UAT_DOCUMENT_COMPONENTS_MISMATCH');
  assertDocumentaryRow(receipt.commissions[0],plan.commission,'comisiones');
  for(const [proofs,expected,collection] of [[receipt.readback,plan.payable,'finmovs'],[receipt.commissionReadback,plan.commission,'comisiones']]){
    assert.equal(proofs?.length,1,'ADVISOR_UAT_DOCUMENT_COMPONENTS_MISMATCH');
    const proof=proofs[0];
    assert.equal(proof?.collection,collection,'ADVISOR_UAT_DOCUMENT_COMPONENTS_MISMATCH');
    assert.equal(proof?.exists,true,'ADVISOR_UAT_DOCUMENT_COMPONENTS_MISMATCH');
    for(const key of ['id','financialDigest','sourceComponents','sourceComponentsDigest',
      ...(collection==='finmovs'?['estado','pendiente']:['cxpAsesorId','monto','montoAsesor','base','pct'])])
      assert.deepEqual(proof[key],expected[key],'ADVISOR_UAT_DOCUMENT_COMPONENTS_MISMATCH_'+key);
  }
}
function assertDocumentaryView(view,plan){
  const row=plan.payable,money=value=>row.moneda+' '+value.toFixed(2);
  assert.equal(view?.economicRowsVisible,true,'ADVISOR_UAT_DOCUMENT_COMPONENTS_MISMATCH');
  assert.equal(view?.componentRowsVisible,true,'ADVISOR_UAT_DOCUMENT_COMPONENTS_MISMATCH');
  assert.deepEqual(view?.economicRows,[[row.periodoRecaudo,money(row.comisionOrdinariaAcreditada),row.pctAsesor+'%',
    money(row.valor),row.estado]],'ADVISOR_UAT_DOCUMENT_COMPONENTS_MISMATCH');
  assert.deepEqual(view?.componentRows,(row.sourceComponents||[]).map(component=>[
    component.coverageCode+' '+component.source.lineId,
    component.base===undefined?'No informada':money(component.base),
    component.pct===undefined?'No informado':component.pct+'%',
    money(component.ordinaryCommission),money(component.advisorAmount)]),'ADVISOR_UAT_DOCUMENT_COMPONENTS_MISMATCH');
}
async function assertVisibleDocumentaryView(page,selector,plan){
  // Read only the financial cells of the currently opened synthetic document;
  // no customer names, page text or screenshots are retained as evidence.
  const view=await page.locator(selector).evaluate(root=>{
    const table=root.querySelector('table'),rows=Array.from(table?.tBodies[0]?.rows||[]);
    const text=cell=>(cell?.innerText||'').replace(/\s+/g,' ').trim();
    const economicRows=rows.filter(row=>row.cells.length===6);
    const componentRows=rows.flatMap(row=>Array.from(row.querySelectorAll('table > tbody > tr')));
    const visible=row=>{const rect=row.getBoundingClientRect(),style=getComputedStyle(row);
      return rect.width>0&&rect.height>0&&style.display!=='none'&&style.visibility!=='hidden';};
    return {economicRows:economicRows.map(row=>Array.from(row.cells).slice(1).map(text)),
      componentRows:componentRows.map(component=>Array.from(component.cells).map(text)),
      economicRowsVisible:economicRows.every(visible),componentRowsVisible:componentRows.every(visible)};
  });
  assertDocumentaryView(view,plan);
}
function assertGenerated(row,expected,requestId,uid,kind){
  assert.ok(row&&row.__syntheticQa===true&&/^b4003qa_/.test(row.id),'ADVISOR_UAT_NON_SYNTHETIC_CLEANUP_DENIED');
  assert.equal(row.tenantId,TENANT,'ADVISOR_UAT_CLEANUP_TENANT_CONFLICT');
  assert.equal(row.preparationRequestId,requestId,'ADVISOR_UAT_CLEANUP_REQUEST_CONFLICT');
  assert.equal(row.createdByUid,uid,'ADVISOR_UAT_CLEANUP_ACTOR_CONFLICT');
  assert.equal(row.financialDigest,expected.financialDigest,'ADVISOR_UAT_CLEANUP_DIGEST_CONFLICT');
  const metadata=new Set(['preparationRequestId','createdAt','createdByUid','updatedAt','updatedByUid']);
  assert.equal(digest(Object.fromEntries(Object.keys(expected).map(key=>[key,row[key]]))),digest(expected),'ADVISOR_UAT_CLEANUP_SOURCE_OR_BUSINESS_CHANGED');
  assert.ok(Object.keys(row).every(key=>Object.prototype.hasOwnProperty.call(expected,key)||metadata.has(key)),'ADVISOR_UAT_CLEANUP_UNRECOGNIZED_FIELD');
  if(kind==='finmovs'){
    assert.ok(contract.compatiblePayable(row,expected),'ADVISOR_UAT_CLEANUP_PAYABLE_CONFLICT');
    assert.equal(row.estado,'pendiente');assert.equal(row.pagada,false);assert.equal(row.pagado,0);
    assert.equal(row.pendiente,row.valor);assert.equal(row.noBankMovement,true);
  }else{
    for(const key of ['id','tenantId','polizaId','asesorId','clienteId','moneda','pais','monto','montoAsesor','cxpAsesorId'])
      assert.equal(row[key],expected[key],'ADVISOR_UAT_CLEANUP_COMMISSION_CONFLICT_'+key);
    assert.equal(row.estado,'Devengada');
  }
}
function sourceAuditGuard(kind,row,identity,uid,live,expectedIds,expectedTargetIds=[],expectedSourceKeys){
  assert.ok(row,'ADVISOR_UAT_SOURCE_AUDIT_MISSING');
  if(kind==='request'){
    assert.equal(row.actorUid,uid);assert.equal(row.payloadDigest,identity.inputDigest);
    assert.ok(['committed','restored'].includes(row.status));
    assert.equal(row.result?.schemaVersion,contract.SCHEMA);assert.equal(row.result?.syntheticQa,true);
    assert.equal(row.result?.previewIsolated,!live);assert.equal(row.result?.requestId,identity.requestId);
    assert.deepEqual(row.result.payables.map(item=>item.id).sort(),expectedIds.slice().sort());
    if(expectedSourceKeys!==undefined)assert.deepEqual(row.result.payables.flatMap(item=>contract.sourceIdentities(item).map(source=>source.sourceKey)).sort(),
      expectedSourceKeys.slice().sort(),'ADVISOR_UAT_SOURCE_COMPONENT_AUDIT_MISMATCH');
    assert.equal(row.result.financialPayments,0);assert.equal(row.result.bankMovements,0);
  }else{
    assert.equal(row.tenantId,TENANT);assert.equal(row.actorUid,uid);assert.equal(row.schemaVersion,contract.SCHEMA);
    if(kind==='event'){
      assert.equal(row.requestId,identity.requestId);assert.equal(row.payloadDigest,identity.inputDigest);
      assert.equal(row.action,'prepare_advisor_commission_payables');
      assert.deepEqual(row.payableIds.slice().sort(),expectedIds.slice().sort());
      if(expectedSourceKeys!==undefined)assert.deepEqual(row.sourceKeys?.slice().sort(),expectedSourceKeys.slice().sort(),
        'ADVISOR_UAT_SOURCE_COMPONENT_AUDIT_MISMATCH');
      assert.equal(row.financialPayments,0);assert.equal(row.bankMovements,0);
    }else{
      assert.equal(row.preparedRequestId,identity.requestId);assert.equal(row.action,'restore_advisor_payable_synthetic');
      assert.ok(row.targets.every(item=>/^b4003qa_/.test(item.id)&&expectedTargetIds.includes(item.id)&&['finmovs','comisiones'].includes(item.collection)));
    }
  }
}
function genericAuditGuard(kind,row,expected,uid){
  assert.equal(row.payloadDigest,expected.payloadDigest,'ADVISOR_UAT_GENERIC_AUDIT_PAYLOAD_CHANGED');
  if(kind==='request'){
    assert.equal(row.status,'committed');assert.equal(row.result?.requestId,expected.requestId);
    assert.equal(row.result?.eventId,expected.eventId);assert.equal(row.result?.mutationCount,1);
    assert.deepEqual(row.result?.collections,['finmovs']);assert.equal(row.result?.serverOwned,true);
  }else{
    assert.equal(row.tenantId,TENANT);assert.equal(row.actorUid,uid);assert.equal(row.requestId,expected.requestId);
    assert.equal(row.eventId,expected.eventId);assert.equal(row.mutationCount,1);assert.deepEqual(row.collections,['finmovs']);
  }
}
function unchangedSeed(row,original,ordinaryId,uid){
  if(digest(row)===digest(original))return true;
  if(original.id!==ordinaryId||row.updatedByUid!==uid||!row.updatedAt)return false;
  const {updatedAt,updatedByUid,...business}=row;
  return digest(business)===digest({...original,concepto:'QA servicio editado'});
}
function configuredCredential(env){
  // Only keys already provisioned to this workflow. Never search disk or vaults.
  if(env.GOOGLE_APPLICATION_CREDENTIALS){
    const candidate=JSON.parse(fs.readFileSync(env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));
    assert.ok(candidate.type==='service_account'&&candidate.project_id===PROJECT&&candidate.private_key,
      'ADVISOR_UAT_CONFIGURED_SAME_PROJECT_CREDENTIAL_REQUIRED');
    return candidate;
  }
  const candidate=['SA_LAB','SA_ALT','SA_DEFAULT'].map(key=>env[key]).filter(Boolean)
    .map(value=>{try{return JSON.parse(value);}catch{return null;}})
    .find(value=>value?.type==='service_account'&&value.project_id===PROJECT&&value.private_key);
  assert.ok(candidate,'ADVISOR_UAT_CONFIGURED_SAME_PROJECT_CREDENTIAL_REQUIRED');return candidate;
}
function assertServerDenial(out,code,reason){
  assert.equal(out.ok,false,'ADVISOR_UAT_UNEXPECTED_PERMISSION_GRANT');
  // A browser guard or runtime exception has no Functions status code. It
  // cannot count as evidence that the signed backend denied the operation.
  assert.ok(typeof out.code==='string'&&out.code.length>0,'ADVISOR_UAT_SERVER_DENIAL_NOT_REACHED');
  assert.ok(out.code.endsWith(code),'ADVISOR_UAT_DENIAL_CLASS_MISMATCH');
  if(reason)assert.equal(out.reason,reason,'ADVISOR_UAT_DENIAL_REASON_MISMATCH');
}
const BROWSER_STAGES=new Set(['BUILD_IDENTITY','FIXTURE_SETUP','SIGNED_SESSION','DIRECTION_LEGAL_ACCEPTANCE','OPERATIVE_FINANCIAL_DENIAL',
  'FINANCE_UI_HYDRATION','DOCUMENT_FILE_UI_70','DOCUMENT_FILE_UI_60','REPLAY_AND_SOURCE_GUARDS',
  'ASSIGNMENT_DOCUMENTARY_UI','ASSIGNMENT_RELOAD','LEGACY_GUARDS','LEGACY_FINANCE_EDIT','PENDING_CXP_RELOAD','SYNTHETIC_RESTORE']);
const browserStage=value=>BROWSER_STAGES.has(value)?value:'UNKNOWN_STAGE';
const BROWSER_DENIALS=Object.freeze([
  ['OPERATIVE_CXP','operativo','OPERATIVE_FINANCIAL_DENIAL','permission-denied',''],
  ['OPERATIVE_ASSIGNMENT','operativo','ASSIGNMENT_DOCUMENTARY_UI','permission-denied',''],
  ['ADVISOR_CONFLICT','direccion','REPLAY_AND_SOURCE_GUARDS','failed-precondition','ADVISOR_POLICY_CONFLICT'],
  ['SOURCE_REINTERPRETATION','direccion','REPLAY_AND_SOURCE_GUARDS','failed-precondition','SOURCE_LINE_ALREADY_INTERPRETED'],
  ['HISTORICAL_PAYABLE','direccion','LEGACY_GUARDS','failed-precondition','HISTORICAL_ADVISOR_BALANCE_LINK_REQUIRED'],
  ['HISTORICAL_COMMISSION','direccion','LEGACY_GUARDS','failed-precondition','HISTORICAL_COMMISSION_LINK_REQUIRED'],
  ['PROTECTED_COMMISSION','direccion','LEGACY_GUARDS','failed-precondition',''],
  ['PROTECTED_PAID_TOGGLE','direccion','LEGACY_GUARDS','failed-precondition','']
].map(([id,actorRole,stage,code,reason])=>Object.freeze({id,actorRole,stage,code,reason,
  httpStatus:code==='permission-denied'?403:400,errorStatus:code==='permission-denied'?'PERMISSION_DENIED':'FAILED_PRECONDITION'})));
// These are the eight exact negative commands in THIS signed matrix. A status,
// QA-looking prefix, message substring, or nearby console event is not authority
// to exempt any other request. No real-record or generic 400/403 allowlist.
function browserDenialCatalog(fx,steps){
  assert.match(fx.runId,/^b4003qa_i66_cxp_[a-z0-9_]+$/,'ADVISOR_UAT_DENIAL_FIXTURE_SCOPE');
  assert.equal(digest(fx),digest(withAssignmentFixtures(signedDocumentaryFixtures(fx.runId))),'ADVISOR_UAT_DENIAL_FIXTURE_SCOPE');
  assert.deepEqual(steps?.[0]?.spec,assignmentStepsFor(fx,'browser-observability-only',false)[0].spec,'ADVISOR_UAT_DENIAL_FIXTURE_SCOPE');
  const changed={...fx.specs[0],lines:[{...fx.specs[0].lines[0],ordinaryCommission:38.66,
    components:fx.specs[0].lines[0].components.map(component=>component.coverageCode==='GAME'?{...component,ordinaryCommission:35.60}:component)}]};
  const entry=(id,input)=>({...BROWSER_DENIALS.find(item=>item.id===id),inputDigest:digest(input)});
  return [
    entry('OPERATIVE_CXP',{advisorPayable:fx.specs[0]}),
    entry('OPERATIVE_ASSIGNMENT',{advisorAssignmentCorrection:steps[0].spec}),
    entry('ADVISOR_CONFLICT',{advisorPayable:{...fx.specs[0],advisorId:fx.ids.advisor60}}),
    entry('SOURCE_REINTERPRETATION',{advisorPayable:changed}),
    entry('HISTORICAL_PAYABLE',{advisorPayable:fx.historical[0]}),
    entry('HISTORICAL_COMMISSION',{advisorPayable:fx.historical[1]}),
    entry('PROTECTED_COMMISSION',{mutations:[{collection:'comisiones',id:fx.ids.oldCommission,action:'update',payload:{estado:'liquidada',__syntheticQa:true}}]}),
    entry('PROTECTED_PAID_TOGGLE',{mutations:[{collection:'finmovs',id:fx.plans[0].payable.id,action:'update',payload:{estado:'pagado',pagada:true,__syntheticQa:true}}]})
  ];
}
function safeBrowserLocation(value,cfg){
  try{
    const url=new URL(String(value||''));
    const endpointClass=url.origin===cfg.origin?(url.pathname.endsWith('.js')?'FIRST_PARTY_SCRIPT':'FIRST_PARTY'):
      url.hostname.endsWith('.cloudfunctions.net')?'FUNCTIONS':url.hostname.endsWith('.googleapis.com')?'GOOGLE_API':'EXTERNAL';
    // Never retain query strings, fragments, headers, resource paths or text.
    return {endpointClass,pathSha256:hash(cfg.source+'|'+url.origin+url.pathname)};
  }catch{return {endpointClass:'UNKNOWN',pathSha256:null};}
}
function createBrowserErrorLedger({cfg,actorRole,getStage,catalog,maxEvents=500,maxRequests=8192}){
  assert.ok(['direccion','operativo'].includes(actorRole),'ADVISOR_UAT_DENIAL_ACTOR_SCOPE');
  const planned=catalog.filter(item=>item.actorRole===actorRole),requests=new Map(),expectations=new Map(),events=[];
  let observedConsoleErrors=0,pageErrorCount=0,overflow=false;
  const endpoint='https://'+cfg.region+'-'+PROJECT+'.cloudfunctions.net/'+cfg.functionName;
  const requestKey=id=>hash(cfg.source+'|'+actorRole+'|'+String(id));
  const emit=(eventType,fields={})=>{
    if(events.length>=maxEvents){overflow=true;return;}
    events.push({eventType,actorRole,stage:browserStage(getStage()),...fields});
  };
  const telemetryCodes=new Set(['CDP_ATTACH_FAILED','CDP_ENABLE_FAILED','CDP_CALLBACK_FAILED','CDP_BARRIER_FAILED','DENIAL_BODY_UNAVAILABLE',
    'DENIAL_BODY_INVALID','DENIAL_HTTP_MISMATCH','DENIAL_SDK_MISMATCH','DENIAL_REQUEST_MISSING','DENIAL_REQUEST_REUSED','DENIAL_REDIRECT',
    'DENIAL_CATALOG_MISMATCH','REQUEST_LIMIT_EXCEEDED','DUPLICATE_NATIVE_REQUEST','DENIAL_RESPONSE_TIMEOUT','BROWSER_CLOSE_FAILED']);
  const telemetry=code=>emit('TELEMETRY_FAILURE',{code:telemetryCodes.has(code)?code:'CDP_CALLBACK_FAILED'});
  const resourceType=value=>new Set(['Document','Stylesheet','Image','Media','Font','Script','TextTrack','XHR','Fetch','Prefetch','EventSource','WebSocket','Manifest','SignedExchange','Ping','CSPViolationReport','Preflight','Other']).has(value)?value:'Other';
  const httpStatus=value=>Number.isInteger(value)&&value>=100&&value<=599?value:0;
  function expectDenial(input,code,reason=''){
    const matches=planned.filter(item=>item.stage===getStage()&&item.inputDigest===digest(input)&&item.code===code&&item.reason===reason);
    if(matches.length!==1||expectations.has(matches[0]?.id)){
      telemetry('DENIAL_CATALOG_MISMATCH');throw Error('ADVISOR_UAT_DENIAL_HTTP_PROOF_HOLD');
    }
    const expected={...matches[0],requestId:null,sdkVerified:false,httpVerified:false,transportComplete:false,bodyReasonDigest:null};
    expected.ready=new Promise(resolve=>{expected.resolve=resolve;});expectations.set(expected.id,expected);return expected.id;
  }
  function onRequest(event){
    const id=String(event.requestId||''),request=event.request||{};
    if(!id){telemetry('CDP_CALLBACK_FAILED');return;}
    if(requests.size>=maxRequests&&!requests.has(id)){telemetry('REQUEST_LIMIT_EXCEEDED');return;}
    const previous=requests.get(id);
    if(previous?.expected){previous.expected.httpVerified=false;telemetry(event.redirectResponse?'DENIAL_REDIRECT':'DUPLICATE_NATIVE_REQUEST');}
    const meta={id,stage:browserStage(getStage()),...safeBrowserLocation(request.url,cfg),resourceType:resourceType(event.type),
      method:['GET','POST','OPTIONS','HEAD','PUT','PATCH','DELETE'].includes(request.method)?request.method:'OTHER',expected:null,status:0};
    if(request.url===endpoint&&request.method==='POST'){
      try{
        const envelope=JSON.parse(String(request.postData||''));
        if(envelope&&Object.keys(envelope).length===1&&envelope.data&&typeof envelope.data==='object'&&!Array.isArray(envelope.data)){
          const {tenantId,activeRole,...input}=envelope.data;
          if(tenantId===TENANT&&norm(activeRole)===actorRole){
            const hits=[...expectations.values()].filter(item=>item.stage===meta.stage&&item.inputDigest===digest(input));
            if(hits.length===1){
              if(hits[0].requestId!==null)telemetry('DENIAL_REQUEST_REUSED');
              else {meta.expected=hits[0];meta.expected.requestId=id;meta.endpointClass='OWNED_NEGATIVE_CALLABLE';}
            }
          }
        }
      }catch{/* Missing/malformed/foreign payload never acquires an exemption. */}
    }
    requests.set(id,meta);
  }
  function onResponse(event){
    const id=String(event.requestId||''),meta=requests.get(id),response=event.response||{},status=httpStatus(response.status);
    if(meta)meta.status=status;
    if(status>=400)emit('HTTP_ERROR',{requestKey:requestKey(id),stage:meta?.stage||browserStage(getStage()),status,
      resourceType:meta?.resourceType||resourceType(event.type),...safeBrowserLocation(response.url,cfg),
      ...(meta?.expected?{denialId:meta.expected.id,endpointClass:'OWNED_NEGATIVE_CALLABLE'}:{})});
    if(meta?.expected&&status!==meta.expected.httpStatus)telemetry('DENIAL_HTTP_MISMATCH');
  }
  function onBody(id,body){
    const meta=requests.get(String(id)),expected=meta?.expected;if(!expected)return;
    try{
      if(typeof body!=='string'||body.length>131072)throw Error('INVALID');
      const parsed=JSON.parse(body),error=parsed?.error;
      if(!error||typeof error!=='object'||Array.isArray(error)||Object.hasOwn(parsed,'result')||Object.hasOwn(parsed,'data')||
        error.status!==expected.errorStatus||meta.status!==expected.httpStatus)throw Error('INVALID');
      const reason=error.details?.reason===undefined?'':error.details.reason;
      if(typeof reason!=='string'||(expected.reason&&reason!==expected.reason))throw Error('INVALID');
      expected.bodyReasonDigest=hash(cfg.source+'|'+reason);expected.httpVerified=true;
    }catch{telemetry('DENIAL_BODY_INVALID');}
    expected.transportComplete=true;expected.resolve();
  }
  function onBodyUnavailable(id){
    const expected=requests.get(String(id))?.expected;if(!expected)return;
    telemetry('DENIAL_BODY_UNAVAILABLE');expected.transportComplete=true;expected.resolve();
  }
  function onLoadingFailed(event){
    const id=String(event.requestId||''),meta=requests.get(id);
    // Navigation cancels long-lived listeners. Cancellation is recorded, never
    // used to excuse a HTTP/console error or complete an expected denial.
    emit(event.canceled===true?'NETWORK_CANCELLED':'NETWORK_FAILURE',{requestKey:requestKey(id),stage:meta?.stage||browserStage(getStage()),
      endpointClass:meta?.endpointClass||'UNKNOWN',resourceType:meta?.resourceType||resourceType(event.type)});
    if(meta?.expected)onBodyUnavailable(id);
  }
  function onLog(entry){
    if(entry?.level!=='error')return;
    const sources=new Set(['xml','javascript','network','storage','appcache','rendering','security','deprecation','worker','violation','intervention','recommendation','other']);
    const source=sources.has(entry.source)?entry.source:'other';
    const id=typeof entry.networkRequestId==='string'?entry.networkRequestId:null;
    emit('NATIVE_CONSOLE_ERROR',{source,...safeBrowserLocation(entry.url,cfg),
      ...(id?{requestKey:requestKey(id)}:{}),line:Number.isInteger(entry.lineNumber)&&entry.lineNumber>=0?entry.lineNumber:null});
  }
  function onRuntimeConsole(event){
    if(!['error','assert'].includes(event.type))return;
    const frame=event.stackTrace?.callFrames?.[0]||{},types=new Set(['object','function','undefined','string','number','boolean','symbol','bigint']);
    emit('APPLICATION_CONSOLE_ERROR',{source:'javascript',...safeBrowserLocation(frame.url,cfg),
      line:Number.isInteger(frame.lineNumber)&&frame.lineNumber>=0?frame.lineNumber:null,
      column:Number.isInteger(frame.columnNumber)&&frame.columnNumber>=0?frame.columnNumber:null,
      argumentTypes:[].concat(event.args||[]).slice(0,8).map(arg=>types.has(arg?.type)?arg.type:'unknown')});
  }
  function onPageConsole(type){if(type==='error'||type==='assert')observedConsoleErrors++;}
  function onPageError(){pageErrorCount++;emit('PAGE_ERROR');}
  async function confirmDenial(id,out,timeoutMs=10000){
    const expected=expectations.get(id);
    if(!expected)throw Error('ADVISOR_UAT_DENIAL_HTTP_PROOF_HOLD');
    const sdkOk=out?.ok===false&&out.code==='functions/'+expected.code&&typeof out.reason==='string'&&(!expected.reason||out.reason===expected.reason);
    if(!sdkOk){telemetry('DENIAL_SDK_MISMATCH');throw Error('ADVISOR_UAT_DENIAL_HTTP_PROOF_HOLD');}
    let timer;
    try{
      await Promise.race([expected.ready,new Promise(resolve=>{timer=setTimeout(()=>{telemetry('DENIAL_RESPONSE_TIMEOUT');resolve();},timeoutMs);})]);
    }finally{clearTimeout(timer);}
    if(expected.requestId===null)telemetry('DENIAL_REQUEST_MISSING');
    expected.sdkVerified=sdkOk&&expected.transportComplete&&expected.httpVerified&&expected.bodyReasonDigest===hash(cfg.source+'|'+out.reason);
    if(!expected.sdkVerified){telemetry('DENIAL_SDK_MISMATCH');throw Error('ADVISOR_UAT_DENIAL_HTTP_PROOF_HOLD');}
  }
  function summary(){
    const verified=[...expectations.values()].filter(item=>item.httpVerified&&item.sdkVerified&&item.transportComplete),
      verifiedRequests=new Set(verified.map(item=>requestKey(item.requestId))),seenConsole=new Set();
    let expectedNetworkConsoleErrors=0,unexpectedConsoleErrors=0,unexpectedHttpErrors=0;
    const classified=events.map(event=>{
      let expected=false;
      if(event.eventType==='NATIVE_CONSOLE_ERROR'){
        expected=event.source==='network'&&verifiedRequests.has(event.requestKey)&&!seenConsole.has(event.requestKey);
        if(expected){seenConsole.add(event.requestKey);expectedNetworkConsoleErrors++;}else unexpectedConsoleErrors++;
      }else if(event.eventType==='APPLICATION_CONSOLE_ERROR')unexpectedConsoleErrors++;
      else if(event.eventType==='HTTP_ERROR'){expected=verifiedRequests.has(event.requestKey);if(!expected)unexpectedHttpErrors++;}
      else if(event.eventType==='NETWORK_FAILURE')unexpectedHttpErrors++;
      return {...event,...(['NATIVE_CONSOLE_ERROR','APPLICATION_CONSOLE_ERROR','HTTP_ERROR','NETWORK_FAILURE'].includes(event.eventType)?{classification:expected?'VERIFIED_EXPECTED_DENIAL':'UNEXPECTED'}:{})};
    });
    const capturedConsoleErrors=events.filter(event=>['NATIVE_CONSOLE_ERROR','APPLICATION_CONSOLE_ERROR'].includes(event.eventType)).length;
    const telemetryFailures=events.filter(event=>event.eventType==='TELEMETRY_FAILURE').length+
      Number(overflow)+Number(observedConsoleErrors!==capturedConsoleErrors);
    if(overflow)classified.push({eventType:'TELEMETRY_FAILURE',actorRole,stage:browserStage(getStage()),code:'EVENT_LIMIT_EXCEEDED'});
    if(observedConsoleErrors!==capturedConsoleErrors)classified.push({eventType:'TELEMETRY_FAILURE',actorRole,stage:browserStage(getStage()),code:'CONSOLE_EVENT_COVERAGE_MISMATCH'});
    const counts={expectedDenials:planned.length,verifiedExpectedDenials:verified.length,observedConsoleErrors,capturedConsoleErrors,
      expectedNetworkConsoleErrors,unexpectedConsoleErrors,pageErrorCount,unexpectedHttpErrors,telemetryFailures};
    return {actorRole,status:verified.length===planned.length&&!unexpectedConsoleErrors&&!pageErrorCount&&!unexpectedHttpErrors&&!telemetryFailures?'PASS':'HOLD',...counts,
      denials:planned.map(item=>{const actual=expectations.get(item.id);return {denialId:item.id,actorRole,stage:item.stage,expectedHttpStatus:item.httpStatus,
        expectedFunctionsCode:'functions/'+item.code,expectedReason:item.reason||null,
        registered:!!actual,requestKey:actual?.requestId?requestKey(actual.requestId):null,
        httpVerified:actual?.httpVerified===true,sdkVerified:actual?.sdkVerified===true,
        status:actual?.httpVerified&&actual.sdkVerified&&actual.transportComplete?'PASS':'HOLD'};}),events:classified};
  }
  return {expectDenial,confirmDenial,onRequest,onResponse,onBody,onBodyUnavailable,onLoadingFailed,onLog,onRuntimeConsole,onPageConsole,onPageError,telemetry,
    wantsBody:id=>!!requests.get(String(id))?.expected,summary};
}
async function attachBrowserObservability({context,page,cfg,actorRole,getStage,catalog,protocolTimeoutMs=5000}){
  assert.ok(Number.isSafeInteger(protocolTimeoutMs)&&protocolTimeoutMs>0&&protocolTimeoutMs<=10000,'ADVISOR_UAT_BROWSER_OBSERVABILITY_HOLD');
  const ledger=createBrowserErrorLedger({cfg,actorRole,getStage,catalog}),pending=new Set();let cdp;
  const safe=fn=>event=>{try{fn(event);}catch{ledger.telemetry('CDP_CALLBACK_FAILED');}};
  const send=async(name,args)=>{let timer;try{return await Promise.race([cdp.send(name,args),new Promise((resolve,reject)=>{
    timer=setTimeout(()=>reject(Error('CDP_PROTOCOL_DEADLINE')),protocolTimeoutMs);
  })]);}finally{clearTimeout(timer);}};
  page.on('pageerror',()=>ledger.onPageError());page.on('console',message=>ledger.onPageConsole(message.type()));
  try{cdp=await context.newCDPSession(page);}catch{ledger.telemetry('CDP_ATTACH_FAILED');return {...ledger,flush:async()=>{},drain:async()=>{}};}
  cdp.on('Network.requestWillBeSent',safe(ledger.onRequest));cdp.on('Network.responseReceived',safe(ledger.onResponse));
  cdp.on('Network.loadingFailed',safe(ledger.onLoadingFailed));cdp.on('Log.entryAdded',safe(event=>ledger.onLog(event.entry)));
  cdp.on('Runtime.consoleAPICalled',safe(ledger.onRuntimeConsole));
  cdp.on('Network.loadingFinished',safe(event=>{
    if(!ledger.wantsBody(event.requestId))return;
    const task=send('Network.getResponseBody',{requestId:event.requestId}).then(result=>{
      if(typeof result.body!=='string'||result.body.length>180000)throw Error('BODY_UNAVAILABLE');
      ledger.onBody(event.requestId,result.base64Encoded?Buffer.from(result.body,'base64').toString('utf8'):result.body);
    }).catch(()=>ledger.onBodyUnavailable(event.requestId));
    pending.add(task);task.finally(()=>pending.delete(task));
  }));
  try{await send('Network.enable',{maxPostDataSize:131072});await send('Log.enable');await send('Runtime.enable');}
  catch{ledger.telemetry('CDP_ENABLE_FAILED');}
  return {...ledger,drain:async()=>{await Promise.all([...pending]);},flush:async()=>{
    // Read-only protocol round-trip drains already emitted browser events; no
    // console replacement, route interception, app bypass, or fixed sleep.
    try{await Promise.all([send('Runtime.evaluate',{expression:'void 0',returnByValue:true}),...pending]);}
    catch{ledger.telemetry('CDP_BARRIER_FAILED');}
  }};
}
function browserObservabilityReport(observers){
  const actors=observers.map(observer=>observer.summary()),totals={expectedDenials:0,verifiedExpectedDenials:0,observedConsoleErrors:0,capturedConsoleErrors:0,
    expectedNetworkConsoleErrors:0,unexpectedConsoleErrors:0,pageErrorCount:0,unexpectedHttpErrors:0,telemetryFailures:0};
  for(const actor of actors)for(const key of Object.keys(totals))totals[key]+=actor[key];
  const roles=actors.map(actor=>actor.actorRole).sort();
  return {schemaVersion:'gravicentra-i66-browser-observability-v1',status:JSON.stringify(roles)===JSON.stringify(['direccion','operativo'])&&
    actors.every(actor=>actor.status==='PASS')&&totals.expectedDenials===8?'PASS':'HOLD',actors,totals};
}
async function finalizeBrowserObservability(observers,closeBrowser){
  for(const observer of observers)await observer.flush();
  // Keep listeners active until browser.close resolves. Taking the acceptance
  // snapshot before this await would lose late console/HTTP/page failures.
  try{await closeBrowser();}catch{for(const observer of observers)observer.telemetry('BROWSER_CLOSE_FAILED');}
  // Complete bounded captures already started during close. Do not send a new
  // protocol command to a deliberately closed browser or suppress new errors.
  for(const observer of observers)await observer.drain();
  return browserObservabilityReport(observers);
}
function validateBrowserObservability(value){
  const check=condition=>assert.ok(condition,'ADVISOR_UAT_BROWSER_OBSERVABILITY_HOLD');
  const exactKeys=(row,keys)=>check(row&&typeof row==='object'&&!Array.isArray(row)&&
    JSON.stringify(Object.keys(row).sort())===JSON.stringify(keys.slice().sort()));
  const countKeys=['expectedDenials','verifiedExpectedDenials','observedConsoleErrors','capturedConsoleErrors',
    'expectedNetworkConsoleErrors','unexpectedConsoleErrors','pageErrorCount','unexpectedHttpErrors','telemetryFailures'];
  const sha=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value),integer=value=>Number.isSafeInteger(value)&&value>=0;
  const endpointClasses=new Set(['FIRST_PARTY_SCRIPT','FIRST_PARTY','FUNCTIONS','GOOGLE_API','EXTERNAL','UNKNOWN','OWNED_NEGATIVE_CALLABLE']);
  const resourceTypes=new Set(['Document','Stylesheet','Image','Media','Font','Script','TextTrack','XHR','Fetch','Prefetch','EventSource','WebSocket','Manifest','SignedExchange','Ping','CSPViolationReport','Preflight','Other']);
  exactKeys(value,['schemaVersion','status','actors','totals']);
  check(value.schemaVersion==='gravicentra-i66-browser-observability-v1'&&value.status==='PASS');
  check(Array.isArray(value.actors)&&value.actors.length===2);
  check(JSON.stringify(value.actors.map(row=>row.actorRole).sort())===JSON.stringify(['direccion','operativo']));
  exactKeys(value.totals,countKeys);const totals=Object.fromEntries(countKeys.map(key=>[key,0])),allRequests=new Set();
  for(const actor of value.actors){
    exactKeys(actor,['actorRole','status','denials','events',...countKeys]);
    for(const key of countKeys){check(integer(actor[key]));totals[key]+=actor[key];}
    const planned=BROWSER_DENIALS.filter(row=>row.actorRole===actor.actorRole);
    check(actor.status==='PASS'&&actor.expectedDenials===planned.length&&actor.verifiedExpectedDenials===planned.length);
    check(Array.isArray(actor.denials)&&actor.denials.length===planned.length&&Array.isArray(actor.events)&&actor.events.length<=502);
    check(JSON.stringify(actor.denials.map(row=>row.denialId).sort())===JSON.stringify(planned.map(row=>row.id).sort()));
    const requests=new Map();
    for(const denial of actor.denials){
      exactKeys(denial,['denialId','actorRole','stage','expectedHttpStatus','expectedFunctionsCode','expectedReason','registered','requestKey','httpVerified','sdkVerified','status']);
      const expected=planned.find(row=>row.id===denial.denialId);
      check(denial.actorRole===actor.actorRole&&denial.stage===expected.stage&&denial.expectedHttpStatus===expected.httpStatus&&
        denial.expectedFunctionsCode==='functions/'+expected.code&&denial.expectedReason===(expected.reason||null));
      check(denial.registered===true&&denial.httpVerified===true&&denial.sdkVerified===true&&denial.status==='PASS'&&sha(denial.requestKey));
      check(!allRequests.has(denial.requestKey));allRequests.add(denial.requestKey);requests.set(denial.requestKey,denial);
    }
    const http=new Set(),native=new Set();
    for(const event of actor.events){
      check(event.actorRole===actor.actorRole&&BROWSER_STAGES.has(event.stage)&&endpointClasses.has(event.endpointClass)&&sha(event.requestKey));
      if(event.eventType==='HTTP_ERROR'){
        exactKeys(event,['eventType','actorRole','stage','requestKey','status','resourceType','endpointClass','pathSha256','denialId','classification']);
        const denial=requests.get(event.requestKey);check(!!denial&&!http.has(event.requestKey));http.add(event.requestKey);
        check(event.status===denial.expectedHttpStatus&&event.stage===denial.stage&&event.denialId===denial.denialId&&
          event.endpointClass==='OWNED_NEGATIVE_CALLABLE'&&event.classification==='VERIFIED_EXPECTED_DENIAL'&&resourceTypes.has(event.resourceType)&&sha(event.pathSha256));
      }else if(event.eventType==='NATIVE_CONSOLE_ERROR'){
        exactKeys(event,['eventType','actorRole','stage','source','endpointClass','pathSha256','requestKey','line','classification']);
        check(requests.has(event.requestKey)&&!native.has(event.requestKey)&&event.source==='network'&&event.classification==='VERIFIED_EXPECTED_DENIAL');
        check((event.pathSha256===null||sha(event.pathSha256))&&(event.line===null||integer(event.line)));native.add(event.requestKey);
      }else if(event.eventType==='NETWORK_CANCELLED'){
        exactKeys(event,['eventType','actorRole','stage','requestKey','endpointClass','resourceType']);
        check(!requests.has(event.requestKey)&&resourceTypes.has(event.resourceType));
      }else check(false);
    }
    check(http.size===planned.length&&actor.observedConsoleErrors===native.size&&actor.capturedConsoleErrors===native.size&&actor.expectedNetworkConsoleErrors===native.size);
    for(const key of ['unexpectedConsoleErrors','pageErrorCount','unexpectedHttpErrors','telemetryFailures'])check(actor[key]===0);
  }
  for(const key of countKeys)check(integer(value.totals[key])&&value.totals[key]===totals[key]);
  check(totals.expectedDenials===8&&totals.verifiedExpectedDenials===8);
  return true;
}
function safeFailureEvidence(error,stage){
  const stages=BROWSER_STAGES;
  const checks=['ADVISOR_UAT_SERVER_DENIAL_NOT_REACHED','ADVISOR_UAT_DENIAL_CLASS_MISMATCH',
    'ADVISOR_UAT_DENIAL_REASON_MISMATCH','ADVISOR_UAT_UNEXPECTED_PERMISSION_GRANT',
    'ADVISOR_UAT_SIGNED_COMMAND_REJECTED','ADVISOR_UAT_FILE_PREVIEW_NOT_CONFIRMED',
    'ADVISOR_UAT_UI_COMMIT_READBACK_MISSING','ADVISOR_UAT_BUSINESS_LIQUIDATION_SEMANTICS',
    'ADVISOR_UAT_DOCUMENT_COMPONENTS_MISMATCH','ADVISOR_UAT_SOURCE_COMPONENT_AUDIT_MISMATCH',
    'ADVISOR_UAT_ASSIGNMENT_PROOF_MISMATCH','ADVISOR_UAT_ASSIGNMENT_AUDIT_MISMATCH',
    'ADVISOR_UAT_REPLAY_DUPLICATED_DEBT','ADVISOR_UAT_ORDINARY_FINANCE_REGRESSION',
    'ADVISOR_UAT_PROTECTED_RELOAD_MISMATCH','ADVISOR_UAT_DIRECTION_PAGE_ERROR',
    'ADVISOR_UAT_OPERATIVE_PAGE_ERROR','ADVISOR_UAT_FIRST_PARTY_ASSET_ERROR',
    'ADVISOR_UAT_SIGNED_SESSION_MISMATCH','ADVISOR_UAT_BUILD_SOURCE_DRIFT',
    'ADVISOR_UAT_ARTIFACT_MARKER_DRIFT','ADVISOR_UAT_CLEANUP_HOLD','ADVISOR_UAT_BROWSER_OBSERVABILITY_HOLD','ADVISOR_UAT_DENIAL_HTTP_PROOF_HOLD','DIRECTION_LEGAL'];
  const message=String(error?.message||'');
  // Exact source-owned codes only; never retain compared values or exception text.
  const exactLegalChecks=new Set(LEGAL_FAILURE_CHECKS);
  const firstLine=message.split(/\r?\n/,1)[0];
  const check=exactLegalChecks.has(firstLine)?firstLine:checks.find(value=>message===value||message.startsWith(value+'_')||message.startsWith(value+'\n'));
  const legalSubstage=stage==='DIRECTION_LEGAL_ACCEPTANCE'?safeLegalFailureSubstage(error?.directionLegalSubstage):null;
  const location=String(error?.stack||'').match(/(?:^|[/\\])gravicentra-i6-6-advisor-payables-signed-uat\.cjs:(\d+):(\d+)/);
  return {failureClass:error?.code==='ERR_ASSERTION'?'ERR_ASSERTION':error?.name==='TimeoutError'?'TIMEOUT_ERROR':'ASSERTION_OR_RUNTIME_FAILURE',
    failureStage:stages.has(stage)?stage:'UNKNOWN_STAGE',failureCheck:check||'ASSERTION_OR_RUNTIME_FAILURE',
    ...(legalSubstage?{failureLegalSubstage:legalSubstage}:{}),
    failureLocation:location?{file:'gravicentra-i6-6-advisor-payables-signed-uat.cjs',line:Number(location[1]),column:Number(location[2])}:null};
}

// Diagnostics describe actionability only. Never retain visible text, the
// legal scope (which contains the actor's identity), arbitrary attributes or URLs.
function safeFinanceUiSnapshot(value){
  const input=value&&typeof value==='object'?value:{};
  const boolean=key=>typeof input[key]==='boolean'?input[key]:null;
  const count=key=>Number.isSafeInteger(input[key])&&input[key]>=0&&input[key]<=10000?input[key]:null;
  const coordinate=value=>typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<=100000?Math.round(value):null;
  const tags=new Set(['DIV','SPAN','BUTTON','INPUT','LABEL','H1','H2','H3','P','UL','LI','SVG','PATH','BODY','HTML','MAIN','SECTION']);
  const ids=new Set(['lg-chk','lg-ok','lg-print','fin-body','auth-restoring','login','app','main','content']);
  const classes=new Set(['drawer-back','open','conf-modal','conf-h','conf-body','conf-chk','conf-f','tab','active','tabs','tabs-scroll','page','btn','primary','ghost','hidden']);
  const rect=input.rect&&typeof input.rect==='object'?Object.fromEntries(['x','y','width','height'].map(key=>[key,coordinate(input.rect[key])])):null;
  return {snapshotStatus:input.snapshotStatus==='CAPTURED'?'CAPTURED':'UNAVAILABLE',
    route:['FINANZAS','OTHER','UNKNOWN'].includes(input.route)?input.route:'UNKNOWN',
    tabCount:count('tabCount'),tabConnected:boolean('tabConnected'),tabVisible:boolean('tabVisible'),tabEnabled:boolean('tabEnabled'),rect,
    centerInViewport:boolean('centerInViewport'),targetReceivesPointer:boolean('targetReceivesPointer'),
    topTag:tags.has(input.topTag)?input.topTag:null,topId:ids.has(input.topId)?input.topId:null,
    topClasses:Array.isArray(input.topClasses)?[...new Set(input.topClasses.filter(value=>classes.has(value)))].sort():[],
    legalOverlayPresent:boolean('legalOverlayPresent'),legalOverlayAtTarget:boolean('legalOverlayAtTarget'),
    legalOverlayCount:count('legalOverlayCount'),modalCount:count('modalCount'),authRestoring:boolean('authRestoring')};
}
const CLICK_ACTIONABILITY_KEYS=Object.freeze(['pointerInterception','detached','notVisible','notEnabled','notStable','outsideViewport']);
function safeClickActionability(error){
  const message=String(error?.message||'');
  return {pointerInterception:/intercepts pointer events/i.test(message),
    detached:/element (?:was|is) detached|not attached to the DOM/i.test(message),
    notVisible:/element is not visible/i.test(message),notEnabled:/element is not enabled/i.test(message),
    notStable:/element is not stable/i.test(message),outsideViewport:/element is outside of the viewport/i.test(message)};
}
function safeFinanceUiDiagnostics(value){
  if(!value||typeof value!=='object')return null;
  const out={};
  for(const key of ['beforeClick','onFailure'])if(Object.prototype.hasOwnProperty.call(value,key))out[key]=safeFinanceUiSnapshot(value[key]);
  if(value.actionability&&typeof value.actionability==='object')out.actionability=Object.fromEntries(
    CLICK_ACTIONABILITY_KEYS.map(key=>[key,typeof value.actionability[key]==='boolean'?value.actionability[key]:false]));
  return out;
}
async function captureFinanceUiSnapshot(page){
  try{
    const snapshot=await page.evaluate(()=>{
      const tabs=document.querySelectorAll('.tab[data-t="asesores"]'),tab=tabs[0]||null;
      const rect=tab?.getBoundingClientRect(),style=tab?window.getComputedStyle(tab):null;
      const x=rect?rect.left+rect.width/2:null,y=rect?rect.top+rect.height/2:null;
      const inViewport=!!rect&&x>=0&&y>=0&&x<window.innerWidth&&y<window.innerHeight;
      const top=inViewport?document.elementFromPoint(x,y):null;
      const gates=document.querySelectorAll('[data-legal-gate]');
      const knownIds=new Set(['lg-chk','lg-ok','lg-print','fin-body','auth-restoring','login','app','main','content']);
      const knownClasses=new Set(['drawer-back','open','conf-modal','conf-h','conf-body','conf-chk','conf-f','tab','active','tabs','tabs-scroll','page','btn','primary','ghost','hidden']);
      return {snapshotStatus:'CAPTURED',route:location.hash.split('?')[0]==='#/finanzas'?'FINANZAS':location.hash?'OTHER':'UNKNOWN',
        tabCount:tabs.length,tabConnected:!!tab?.isConnected,
        tabVisible:!!rect&&rect.width>0&&rect.height>0&&style?.display!=='none'&&style?.visibility!=='hidden',
        tabEnabled:!!tab&&tab.disabled!==true&&tab.getAttribute('aria-disabled')!=='true'&&!tab.closest('[inert]'),
        rect:rect?{x:rect.x,y:rect.y,width:rect.width,height:rect.height}:null,centerInViewport:inViewport,
        targetReceivesPointer:!!tab&&!!top&&(tab===top||tab.contains(top)),topTag:top?.tagName||null,
        topId:knownIds.has(top?.id)?top.id:null,topClasses:top?Array.from(top.classList||[]).filter(value=>knownClasses.has(value)):[],
        legalOverlayPresent:gates.length>0,legalOverlayAtTarget:!!top?.closest('[data-legal-gate]'),
        legalOverlayCount:gates.length,modalCount:document.querySelectorAll('.drawer-back.open').length,
        authRestoring:document.documentElement.getAttribute('data-auth-restoring')==='1'};
    });
    return safeFinanceUiSnapshot(snapshot);
  }catch{
    // Diagnostics cannot replace the original click failure or alter cleanup.
    return safeFinanceUiSnapshot(null);
  }
}

async function main(){
  const cfg=configuration(process.env),runId='b4003qa_i66_cxp_'+Date.now().toString(36)+'_'+crypto.randomBytes(5).toString('hex');
  const report={schemaVersion:'gravicentra-i66-advisor-payables-signed-uat-v1',phase:cfg.phase,sourceSha:cfg.source,
    status:'HOLD',checks:[],realCustomerWritesRequested:0,bankMovements:0,financialPayments:0,
    authOrMembershipMutations:0,cleanup:{status:'NOT_STARTED',seeded:0,remaining:0}};
  const pass=name=>{report.checks.push({name,status:'PASS'});console.log('I66_ADVISOR_UAT_CHECK='+name);};
  let admin,browser,direction,operator,tenant,db,fx,sourceRequests=[],assignmentSteps=[],genericRequest,generated=[],seeds=[],allTargets=[],memberBefore=[];
  const observedAbsent=new Set(),browserObservers=[];
  let originalFailure=null,cleanupFailure=null,stage='BUILD_IDENTITY',originalFailureStage=null,denialCatalog=[];
  const rowRef=(collection,id)=>tenant.collection('data').doc(collection).collection('items').doc(id);
  const auditRef=(kind,id)=>tenant.collection(kind==='request'?'operationalRequests':'operationalEvents').doc(id);
  const exactBefore=async refs=>{
    for(const ref of refs){assert.equal((await ref.get()).exists,false,'ADVISOR_UAT_EXISTING_TARGET_COLLISION');allTargets.push(ref);observedAbsent.add(ref.path);}
  };
  const rawCall=async(session,input)=>session.page.evaluate(async({cfg,input})=>{
    try{
      const result=await Orbit.productRuntimeBrowserProvidersP0.callFunction(cfg.functionName,
        Object.assign({tenantId:'alianzas-soluciones',activeRole:Orbit.session.rol()},input),cfg.region);
      return {ok:true,result};
    }catch(error){return{ok:false,code:String(error.code||''),reason:String(error.details?.reason||'')};}
  },{cfg:{functionName:cfg.functionName,region:cfg.region},input});
  const call=async(session,input)=>{const out=await rawCall(session,input);assert.equal(out.ok,true,'ADVISOR_UAT_SIGNED_COMMAND_REJECTED_'+out.code+'_'+out.reason);return out.result;};
  const deny=async(session,input,code,reason='')=>{
    const expected=session.observer.expectDenial(input,code,reason),out=await rawCall(session,input);
    assertServerDenial(out,code,reason);await session.observer.confirmDenial(expected,out);
  };
  try{
    const markerResponse=await fetch(cfg.origin+'/__recovery__/build.json',{headers:{'cache-control':'no-cache'}});
    assert.equal(markerResponse.ok,true,'ADVISOR_UAT_BUILD_MARKER_MISSING');const markerText=await markerResponse.text(),marker=JSON.parse(markerText);
    assert.equal(marker.sourceSha,cfg.source,'ADVISOR_UAT_BUILD_SOURCE_DRIFT');report.buildMarkerSha256=hash(markerText);
    if(cfg.packageRoot){
      const paths=['bundle/site/__recovery__/build.json','site/__recovery__/build.json','__recovery__/build.json'].map(p=>path.join(cfg.packageRoot,p)).filter(p=>fs.existsSync(p));
      assert.equal(paths.length,1,'ADVISOR_UAT_IMMUTABLE_PACKAGE_MARKER_REQUIRED');
      assert.equal(hash(fs.readFileSync(paths[0],'utf8')),report.buildMarkerSha256,'ADVISOR_UAT_ARTIFACT_MARKER_DRIFT');
    }
    pass('EXACT_SOURCE_AND_IMMUTABLE_BUILD_MARKER');
    stage='FIXTURE_SETUP';
    admin=require('firebase-admin');admin.initializeApp({credential:admin.credential.cert(configuredCredential(process.env)),projectId:PROJECT});
    db=admin.firestore();tenant=db.collection('tenants').doc(TENANT);
    const [members,advisors]=await Promise.all([tenant.collection('members').limit(150).get(),rowRef('asesores','unused').parent.limit(400).get()]);
    assert.ok(members.size<150&&advisors.size<400,'ADVISOR_UAT_ACTOR_BOUND_EXCEEDED');
    const choose=(name,role)=>{
      const advisorIds=new Set(),uids=new Set();
      for(const doc of advisors.docs){const row=doc.data()||{};if([row.nombre,row.nombreCompleto,row.displayName,row.name].some(value=>name(norm(value)))){advisorIds.add(doc.id);[row.authUid,row.uid,row.userId].filter(Boolean).forEach(value=>uids.add(String(value)));}}
      const hits=members.docs.filter(doc=>{const row=doc.data()||{};return (
        [row.nombre,row.displayName,row.name,row.nombreCompleto,row.fullName].some(value=>name(norm(value)))||
        advisorIds.has(String(row.advisorId||row.asesorId||''))||uids.has(doc.id))&&norm(row.activeRole)===role&&
        row.active!==false&&row.activo!==false&&['active','activo'].includes(norm(row.status||row.estado))&&
        [].concat(row.countries||row.paises||[]).map(value=>String(value).toUpperCase()).includes('GT');});
      assert.equal(hits.length,1,'ADVISOR_UAT_SIGNED_ACTOR_NOT_UNIQUE_'+role);
      memberBefore.push({ref:hits[0].ref,digest:digest(hits[0].data())});return{uid:hits[0].id,role,advisorId:String(hits[0].data().advisorId||hits[0].data().asesorId||'')};
    };
    const actors=[choose(value=>value.includes('paula')&&value.includes('osorio'),'direccion'),choose(value=>value.startsWith('carlos castro'),'operativo')];
    const accessRef=tenant.collection('config').doc('access'),accessSnap=await accessRef.get();
    memberBefore.push({ref:accessRef,digest:accessSnap.exists?digest(accessSnap.data()):null});
    fx=signedDocumentaryFixtures(runId);
    fx=withAssignmentFixtures(fx);assignmentSteps=assignmentStepsFor(fx,actors[0].uid,cfg.live);
    denialCatalog=browserDenialCatalog(fx,assignmentSteps);
    const identities=fx.specs.map(spec=>sourceIdentity(spec,actors[0].uid,!cfg.live));
    sourceRequests=identities.map((identity,index)=>({...identity,expectedIds:[fx.plans[index].payable.id],
      expectedSourceKeys:contract.sourceIdentities(fx.plans[index].payable).map(source=>source.sourceKey)}));
    const laterSpec={...fx.specs[0],cutoff:'2026-12-15'};
    sourceRequests.push({...sourceIdentity(laterSpec,actors[0].uid,!cfg.live),expectedIds:[fx.plans[0].payable.id],
      expectedSourceKeys:sourceRequests[0].expectedSourceKeys});
    generated=fx.plans.flatMap((plan,index)=>[['comisiones',plan.commission],['finmovs',plan.payable]].map(([collection,expected])=>({collection,expected,requestId:identities[index].requestId,uid:actors[0].uid})));
    genericRequest={requestId:runId+'_legacy_update',eventId:'opevt_'+hash(TENANT+'|'+runId+'_legacy_update').slice(0,28),
      payloadDigest:digest([{collection:'finmovs',id:fx.ids.ordinary,action:'update',payload:{concepto:'QA servicio editado',__syntheticQa:true}}])};
    const refs=[...fx.rows.map(([collection,row])=>rowRef(collection,row.id)),...generated.map(item=>rowRef(item.collection,item.expected.id)),
      ...sourceRequests.flatMap(item=>[auditRef('request',item.requestId),auditRef('event',item.eventId),auditRef('event',item.restoreEventId)]),
      ...assignmentSteps.flatMap(step=>[step.previewIdentity,step.commitIdentity].flatMap(identity=>[
        auditRef('request',identity.requestId),auditRef('event',identity.eventId)])),
      auditRef('request',genericRequest.requestId),auditRef('event',genericRequest.eventId)];
    await exactBefore(refs);pass('EVERY_FIXTURE_AND_AUDIT_TARGET_ORIGINALLY_ABSENT');
    for(const [collection,row] of fx.rows){const ref=rowRef(collection,row.id);await ref.create(row);seeds.push({ref,expected:row});}
    report.cleanup.seeded=seeds.length;
    stage='SIGNED_SESSION';
    const {chromium}=require('playwright');browser=await chromium.launch({headless:true,args:['--no-sandbox']});
    const openActor=async actor=>{
      const user=await admin.auth().getUser(actor.uid);assert.ok(!user.disabled&&user.emailVerified,'ADVISOR_UAT_ACTOR_AUTH_NOT_READY');
      const token=await admin.auth().createCustomToken(actor.uid),context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
      const pageErrors=[],assetErrors=[];page.on('pageerror',()=>pageErrors.push('PAGE_ERROR'));
      page.on('response',response=>{if(response.url().startsWith(cfg.origin+'/')&&response.status()>=400)assetErrors.push('FIRST_PARTY_HTTP_ERROR');});
      const observer=await attachBrowserObservability({context,page,cfg,actorRole:actor.role,getStage:()=>stage,catalog:denialCatalog});
      browserObservers.push(observer);
      await page.goto(cfg.origin+'/#/inicio',{waitUntil:'commit',timeout:30000});
      await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
      const result=await page.evaluate(async token=>{const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();await c.modules.auth.setPersistence(c.auth,c.modules.auth.browserSessionPersistence);await c.modules.auth.signInWithCustomToken(c.auth,token);const started=await Orbit.productAppP0.activate();return{started:started?.started===true,role:Orbit.session?.rol?.(),preview:p.isI66PreviewHost()};},token);
      assert.ok(result.started&&result.preview===!cfg.live&&norm(result.role)===actor.role,'ADVISOR_UAT_SIGNED_SESSION_MISMATCH');
      return{...actor,context,page,pageErrors,assetErrors,observer};
    };
    direction=await openActor(actors[0]);operator=await openActor(actors[1]);
    pass('EXISTING_DIRECTION_AND_OPERATIVE_SIGNED_WITH_UNCHANGED_MEMBERSHIP');
    if(!cfg.live){
      stage='DIRECTION_LEGAL_ACCEPTANCE';
      report.directionLegalAcceptance=await acceptDirectionPreviewLegal({page:direction.page,actor:actors[0],cfg});
      pass('EXPLICIT_DIRECTION_PREVIEW_LEGAL_DECISION_APPLIED_BY_NORMAL_UI');
    }
    stage='OPERATIVE_FINANCIAL_DENIAL';
    await deny(operator,{advisorPayable:fx.specs[0]},'permission-denied');
    for(const item of generated)assert.equal((await rowRef(item.collection,item.expected.id).get()).exists,false);
    pass('OPERATIVE_FINANCIAL_WRITE_DENIED_SERVER_SIDE_WITH_ZERO_DEBT');
    stage='FINANCE_UI_HYDRATION';
    await direction.page.evaluate(()=>Orbit.router.go('finanzas'));
    await direction.page.waitForSelector('.tab[data-t="asesores"]',{state:'visible',timeout:30000});
    await direction.page.evaluate(async()=>{await Orbit.store._ensureCollections(['asesores','clientes','polizas','comisiones','finmovs']);});
    await direction.page.waitForFunction(ids=>!!Orbit.store.get('asesores',ids.advisor70)&&!!Orbit.store.get('asesores',ids.advisor60)&&!!Orbit.store.get('polizas',ids.policy70)&&!!Orbit.store.get('finmovs',ids.ordinary),fx.ids,{timeout:30000});
    const openAdvisorTab=async()=>{
      report.financeUiDiagnostics={beforeClick:await captureFinanceUiSnapshot(direction.page)};
      try{
        await direction.page.locator('.tab[data-t="asesores"]').click();
      }catch(error){
        report.financeUiDiagnostics.onFailure=await captureFinanceUiSnapshot(direction.page);
        report.financeUiDiagnostics.actionability=safeClickActionability(error);
        throw error;
      }
    };
    await openAdvisorTab();
    stage='ASSIGNMENT_DOCUMENTARY_UI';
    await deny(operator,{advisorAssignmentCorrection:assignmentSteps[0].spec},'permission-denied');
    const assignmentResponseFor=operation=>direction.page.waitForResponse(response=>{
      try{return response.url()==='https://'+cfg.region+'-'+PROJECT+'.cloudfunctions.net/'+cfg.functionName&&
        response.request().postDataJSON()?.data?.advisorAssignmentCorrection?.operation===operation;}catch{return false;}
    },{timeout:30000});
    const assignmentCollections=['asesores','clientes','polizas',...assignment.PRESERVED_COLLECTIONS];
    const openAssignmentEditor=async expectedAdvisor=>{
      await direction.page.goto(cfg.origin+'/#/cliente360?c='+fx.ids.client+'&t=polizas',{waitUntil:'commit',timeout:30000});
      await direction.page.waitForSelector('[data-client-policy-row="1"][data-policy-id="'+fx.ids.policy60+'"]',{state:'visible',timeout:30000});
      await direction.page.locator('[data-client-policy-row="1"][data-policy-id="'+fx.ids.policy60+'"]').click();
      await direction.page.locator('[data-policy-fullpage="1"] button[onclick="Orbit.modules.cliente360.editarPoliza(\''+fx.ids.policy60+'\')"]').click();
      await direction.page.waitForSelector('#policy-v1199 [data-advisor]:not([disabled])',{state:'visible',timeout:30000});
      assert.equal(await direction.page.locator('#policy-v1199 [data-advisor]').inputValue(),expectedAdvisor,'ADVISOR_UAT_ASSIGNMENT_PROOF_MISMATCH_ui_advisor');
      assert.equal(await direction.page.locator('#policy-v1199 [data-net]').inputValue(),'321.06','ADVISOR_UAT_ASSIGNMENT_PROOF_MISMATCH_ui_premium');
      assert.equal(await direction.page.locator('#policy-v1199 [data-installments]').inputValue(),'12','ADVISOR_UAT_ASSIGNMENT_PROOF_MISMATCH_ui_schedule');
    };
    await direction.page.evaluate(async collections=>{await Orbit.store._ensureCollections(collections);},assignmentCollections);
    for(const step of assignmentSteps){
      stage='ASSIGNMENT_DOCUMENTARY_UI';
      await openAssignmentEditor(step.previewPlan.expectedBefore.find(row=>row.collection==='polizas').asesorId);
      const form=direction.page.locator('#policy-v1199');
      await form.locator('[data-advisor]').selectOption(step.spec.targetAdvisorId);
      await form.locator('[data-reason]').fill(step.spec.reason);
      await form.locator('[data-assignment-mode]').check();await form.locator('[data-assignment-client]').check();
      for(const [field,value] of Object.entries({decision:step.spec.sourceAuthority.decisionRef,source:step.spec.sourceAuthority.sourceReference,
        line:step.spec.sourceAuthority.lineRef,period:step.spec.sourceAuthority.period}))
        await form.locator('[data-assignment-'+field+']').fill(value);
      await form.locator('[data-assignment-file]').setInputFiles({name:step.fileName,mimeType:'application/json',buffer:Buffer.from(step.bytes)});
      await direction.page.waitForFunction(sha=>document.querySelector('#policy-v1199 [data-assignment-sha]')?.value===sha,step.spec.sourceAuthority.sourceSha256,{timeout:30000});
      assert.equal(await form.locator('[data-save]').isDisabled(),true,'ADVISOR_UAT_ASSIGNMENT_PROOF_MISMATCH_normal_save');
      const previewResponse=assignmentResponseFor('preview');await form.locator('[data-assignment-preview]').click();
      const preview=(await (await previewResponse).json()).result;
      assertAssignmentReceipt(preview,step,false,cfg.live);
      for(const [collection,expected] of step.beforeRows)
        assert.deepEqual((await rowRef(collection,expected.id).get()).data(),expected,'ADVISOR_UAT_ASSIGNMENT_PROOF_MISMATCH_preview_write');
      for(const identity of [step.previewIdentity,step.commitIdentity])for(const kind of ['request','event'])
        assert.equal((await auditRef(kind,kind==='request'?identity.requestId:identity.eventId).get()).exists,false,'ADVISOR_UAT_ASSIGNMENT_PROOF_MISMATCH_preview_audit');
      await direction.page.waitForFunction(()=>document.querySelector('#policy-v1199 [data-assignment-confirm]')?.disabled===false);
      const commitResponse=assignmentResponseFor('commit');await form.locator('[data-assignment-confirm]').click();
      const receipt=(await (await commitResponse).json()).result;
      assertAssignmentReceipt(receipt,step,true,cfg.live);
      for(const [collection,expected] of step.afterRows)
        assert.deepEqual((await rowRef(collection,expected.id).get()).data(),expected,'ADVISOR_UAT_ASSIGNMENT_PROOF_MISMATCH_committed_record');
      const requestRow=(await auditRef('request',receipt.requestId).get()).data(),eventRow=(await auditRef('event',receipt.eventId).get()).data();
      assignmentAuditGuard('request',requestRow,step,direction.uid,cfg.live);assignmentAuditGuard('event',eventRow,step,direction.uid,cfg.live);
      const replay=await call(direction,{requestId:receipt.requestId,advisorAssignmentCorrection:step.commitSpec});
      assert.equal(replay.reused,true,'ADVISOR_UAT_ASSIGNMENT_PROOF_MISMATCH_replay');assertAssignmentReceipt(replay,step,true,cfg.live);
      assert.equal(digest((await auditRef('request',receipt.requestId).get()).data()),digest(requestRow),'ADVISOR_UAT_ASSIGNMENT_AUDIT_MISMATCH');
      assert.equal(digest((await auditRef('event',receipt.eventId).get()).data()),digest(eventRow),'ADVISOR_UAT_ASSIGNMENT_AUDIT_MISMATCH');
      await direction.page.waitForSelector('#policy-v1199',{state:'detached',timeout:30000});
      stage='ASSIGNMENT_RELOAD';
      await direction.page.reload({waitUntil:'commit',timeout:30000});
      await direction.page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
      const restoredSession=await direction.page.evaluate(async collections=>{
        const p=Orbit.productRuntimeBrowserProvidersP0;await p.initialize();const uid=(await p.waitForUser())?.uid;
        const ready=(await Orbit.productAppP0.activate())?.started===true;await Orbit.store._ensureCollections(collections);return{uid,ready};
      },assignmentCollections);
      assert.equal(restoredSession.uid,direction.uid);assert.equal(restoredSession.ready,true);
      const expectedProjection=assignmentProjectionRows(step);
      const targets=expectedProjection.map(([collection,row])=>({collection,id:row.id,fields:Object.keys(row)}));
      await direction.page.waitForFunction(targets=>targets.every(target=>!!Orbit.store.get(target.collection,target.id)),targets,{timeout:30000});
      const persisted=await direction.page.evaluate(targets=>targets.map(target=>{
        const row=Orbit.store.get(target.collection,target.id);return Object.fromEntries(target.fields.map(key=>[key,row[key]]));
      }),targets);
      assert.deepEqual(persisted,expectedProjection.map(([,row])=>row),
        'ADVISOR_UAT_ASSIGNMENT_PROOF_MISMATCH_reload');
    }
    await openAssignmentEditor(fx.ids.advisor60);
    await direction.page.locator('#policy-v1199').getByRole('button',{name:'Cancelar',exact:true}).click();
    await direction.page.waitForSelector('#policy-v1199',{state:'detached',timeout:30000});
    await direction.page.locator('[data-policy-fullpage="1"]').getByRole('link',{name:'👤 Cliente 360',exact:true}).click();
    await direction.page.waitForSelector('[data-client-policy-row="1"][data-policy-id="'+fx.ids.policy60+'"]',{state:'visible',timeout:30000});
    for(const [collection,expected] of fx.rows)
      assert.deepEqual((await rowRef(collection,expected.id).get()).data(),expected,'ADVISOR_UAT_ASSIGNMENT_PROOF_MISMATCH_compensation');
    pass('DOCUMENTED_ASSIGNMENT_NATIVE_UI_PREVIEW_CONFIRM_RELOAD_REPLAY_COMPENSATION_PRESERVES_ALL_FINANCIAL_RELATIONS');
    // Same signed Direction session and the exact client already seeded by
    // this driver. The helper neither changes legal consent nor real data.
    stage='DOCUMENTED_PREMIUM_TERMS';
    report.documentedTerms=await runDocumentedTermsCheck({page:direction.page,role:direction.role,
      actorUid:direction.uid,tenantId:TENANT,live:cfg.live,db,clientId:fx.ids.client});
    assert.equal(report.documentedTerms.status,'PASS','ADVISOR_UAT_DOCUMENTED_TERMS_NOT_ACCEPTED');
    await direction.page.goto(cfg.origin+'/#/finanzas',{waitUntil:'commit',timeout:30000});
    await direction.page.waitForSelector('.tab[data-t="asesores"]',{state:'visible',timeout:30000});
    stage='FINANCE_UI_HYDRATION';await openAdvisorTab();
    const responseFor=operation=>direction.page.waitForResponse(response=>{
      try{return response.url()==='https://'+cfg.region+'-'+PROJECT+'.cloudfunctions.net/'+cfg.functionName&&response.request().postDataJSON()?.data?.advisorPayable?.operation===operation;}catch{return false;}
    },{timeout:30000});
    for(let index=0;index<fx.specs.length;index++){
      const spec=fx.specs[index],plan=fx.plans[index];
      stage=index===0?'DOCUMENT_FILE_UI_70':'DOCUMENT_FILE_UI_60';
      await direction.page.getByRole('button',{name:'Cargar liquidación documentada',exact:true}).click();
      await direction.page.locator('#fuente-asesor').selectOption(spec.advisorId);await direction.page.locator('#fuente-corte').fill(spec.cutoff);
      const batch={schemaVersion:SOURCE_SCHEMA,advisorId:spec.advisorId,cutoff:spec.cutoff,syntheticQa:true,lines:spec.lines};
      await direction.page.locator('#fuente-archivo').setInputFiles({name:'qa-document-source.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(batch))});
      await direction.page.waitForFunction(()=>document.querySelector('#fuente-lote')?.value.includes('gravicentra-advisor-commission-source-batch-v1'));
      const previewResponse=responseFor('preview');await direction.page.locator('#fuente-preview').click();
      const preview=(await (await previewResponse).json()).result;
      assert.ok(preview?.ok&&preview.readOnly&&preview.syntheticQa&&preview.newPayables===1,'ADVISOR_UAT_FILE_PREVIEW_NOT_CONFIRMED');
      assert.equal(preview.totals.GTQ,plan.payable.valor);assert.equal(preview.requestId,identities[index].requestId);
      assertDocumentaryReceipt(preview,plan);
      assert.equal((await rowRef('finmovs',plan.payable.id).get()).exists,false);assert.equal((await auditRef('request',preview.requestId).get()).exists,false);
      await direction.page.waitForFunction(()=>document.querySelector('#lt-ok')?.disabled===false);
      await assertVisibleDocumentaryView(direction.page,'#lote-body',plan);
      const prepareResponse=responseFor('prepare');await direction.page.locator('#lt-ok').click();
      const receipt=(await (await prepareResponse).json()).result;
      assert.ok(receipt?.ok&&receipt.committed&&receipt.canonicalReadback&&receipt.canonicalReadbackCount===1,'ADVISOR_UAT_UI_COMMIT_READBACK_MISSING');
      assert.equal(receipt.financialPayments,0);assert.equal(receipt.bankMovements,0);assert.equal(receipt.payables[0].id,plan.payable.id);
      assert.deepEqual(receipt.createdPayableIds,[plan.payable.id]);assert.deepEqual(receipt.createdCommissionIds,[plan.commission.id]);
      assertDocumentaryReceipt(receipt,plan,true);
      await direction.page.waitForSelector('#fin-liquidacion-asesor #liq-document',{state:'visible',timeout:30000});
      await assertVisibleDocumentaryView(direction.page,'#liq-document',plan);
      const documentText=await direction.page.locator('#liq-document').innerText();
      assert.ok(documentText.includes('no es comprobante de pago')&&documentText.includes(spec.advisorId===fx.ids.advisor70?'70%':'60%'),'ADVISOR_UAT_BUSINESS_LIQUIDATION_SEMANTICS');
      await direction.page.locator('#liq-close').click();
      for(const item of generated.filter(item=>item.requestId===receipt.requestId))assertGenerated((await rowRef(item.collection,item.expected.id).get()).data(),item.expected,item.requestId,direction.uid,item.collection);
      sourceAuditGuard('request',(await auditRef('request',receipt.requestId).get()).data(),identities[index],direction.uid,cfg.live,[plan.payable.id],[],sourceRequests[index].expectedSourceKeys);
      sourceAuditGuard('event',(await auditRef('event',receipt.eventId).get()).data(),identities[index],direction.uid,cfg.live,[plan.payable.id],[],sourceRequests[index].expectedSourceKeys);
      const replay=await call(direction,{advisorPayable:{...spec,operation:'prepare',previewDigest:preview.previewDigest}});
      assert.ok(replay.reused&&replay.newPayables===0&&replay.reusedPayables===1&&replay.totals.GTQ===0&&replay.canonicalReadback,'ADVISOR_UAT_REPLAY_DUPLICATED_DEBT');
      assertDocumentaryReceipt(replay,plan,true);
      if(index===0)pass('MULTICOMPONENT_VICO_GAME_CENTS_VISIBLE_ONE_CXP_TWO_SOURCE_LINES_REPLAY_VERIFIED');
      pass('DOCUMENT_FILE_UI_TO_PENDING_CXP_'+spec.lines[0].participation.pct+'_PERCENT_WITH_AUDIT_AND_IDEMPOTENCE');
    }
    stage='REPLAY_AND_SOURCE_GUARDS';
    const laterPreview=await call(direction,{advisorPayable:laterSpec});
    assert.equal(laterPreview.newPayables,0);assert.equal(laterPreview.reusedPayables,1);assert.equal(laterPreview.totals.GTQ,0);
    const later=await call(direction,{advisorPayable:{...laterSpec,operation:'prepare',previewDigest:laterPreview.previewDigest}});
    assert.equal(later.payables[0].id,fx.plans[0].payable.id);assert.equal(later.newPayables,0);assert.equal(later.canonicalReadback,true);
    assertDocumentaryReceipt(later,fx.plans[0],true);
    sourceAuditGuard('event',(await auditRef('event',later.eventId).get()).data(),sourceRequests[2],direction.uid,cfg.live,
      sourceRequests[2].expectedIds,[],sourceRequests[2].expectedSourceKeys);
    await deny(direction,{advisorPayable:{...fx.specs[0],advisorId:fx.ids.advisor60}},'failed-precondition','ADVISOR_POLICY_CONFLICT');
    const changed={...fx.specs[0],lines:[{...fx.specs[0].lines[0],ordinaryCommission:38.66,
      components:fx.specs[0].lines[0].components.map(component=>component.coverageCode==='GAME'?{...component,ordinaryCommission:35.60}:component)}]};
    await deny(direction,{advisorPayable:changed},'failed-precondition','SOURCE_LINE_ALREADY_INTERPRETED');
    pass('CROSS_CUTOFF_REUSES_DEBT_AND_CROSS_ADVISOR_OR_CHANGED_SOURCE_DENIED');
    stage='LEGACY_GUARDS';
    await deny(direction,{advisorPayable:fx.historical[0]},'failed-precondition','HISTORICAL_ADVISOR_BALANCE_LINK_REQUIRED');
    await deny(direction,{advisorPayable:fx.historical[1]},'failed-precondition','HISTORICAL_COMMISSION_LINK_REQUIRED');
    await deny(direction,{mutations:[{collection:'comisiones',id:fx.ids.oldCommission,action:'update',payload:{estado:'liquidada',__syntheticQa:true}}]},'failed-precondition');
    await deny(direction,{mutations:[{collection:'finmovs',id:fx.plans[0].payable.id,action:'update',payload:{estado:'pagado',pagada:true,__syntheticQa:true}}]},'failed-precondition');
    pass('LEGACY_PAYMENTS_COMMISSIONS_AND_PROTECTED_PAID_TOGGLE_PREVENT_DUPLICATION');
    stage='LEGACY_FINANCE_EDIT';
    const genericPayload={mutations:[{collection:'finmovs',id:fx.ids.ordinary,action:'update',payload:{concepto:'QA servicio editado',__syntheticQa:true}}],requestId:genericRequest.requestId};
    const generic=await call(direction,genericPayload);assert.ok(generic.ok&&generic.canonicalReadback,'ADVISOR_UAT_ORDINARY_FINANCE_REGRESSION');
    const ordinary=seeds.find(item=>item.expected.id===fx.ids.ordinary),ordinaryAfter=(await ordinary.ref.get()).data();
    assert.equal(ordinaryAfter.concepto,'QA servicio editado');assert.equal(ordinaryAfter.valor,5);assert.equal(ordinaryAfter.pagado,0);
    assert.equal(ordinaryAfter.__qaRunId,runId);ordinary.expected=ordinaryAfter;
    genericAuditGuard('request',(await auditRef('request',genericRequest.requestId).get()).data(),genericRequest,direction.uid);
    genericAuditGuard('event',(await auditRef('event',genericRequest.eventId).get()).data(),genericRequest,direction.uid);
    pass('UNRELATED_LEGACY_FINANCE_RETAINS_AUTHORIZED_EDIT');
    stage='PENDING_CXP_RELOAD';
    await direction.page.reload({waitUntil:'commit',timeout:30000});
    await direction.page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
    const reloaded=await direction.page.evaluate(async()=>{const p=Orbit.productRuntimeBrowserProvidersP0;await p.initialize();const uid=(await p.waitForUser())?.uid;const ready=(await Orbit.productAppP0.activate())?.started===true;Orbit.router.go('finanzas');await Orbit.store._ensureCollections(['asesores','clientes','polizas','finmovs','comisiones']);return{uid,ready};});
    assert.equal(reloaded.uid,direction.uid);assert.equal(reloaded.ready,true);
    const ledgerTargets=fx.plans.flatMap(plan=>[
      {collection:'finmovs',id:plan.payable.id,fields:DOCUMENTARY_PAYABLE_FIELDS,expected:plan.payable},
      {collection:'comisiones',id:plan.commission.id,fields:DOCUMENTARY_COMMISSION_FIELDS,expected:plan.commission}]);
    await direction.page.waitForFunction(targets=>targets.every(target=>!!Orbit.store.get(target.collection,target.id)),
      ledgerTargets.map(({collection,id})=>({collection,id})),{timeout:30000});
    const reread=await direction.page.evaluate(targets=>targets.map(target=>{
      const row=Orbit.store.get(target.collection,target.id);
      return Object.fromEntries(target.fields.map(key=>[key,row[key]]));
    }),ledgerTargets.map(({collection,id,fields})=>({collection,id,fields})));
    reread.forEach((row,index)=>assertDocumentaryRow(row,ledgerTargets[index].expected,ledgerTargets[index].collection));
    await direction.page.waitForSelector('.tab[data-t="asesores"]',{state:'visible',timeout:30000});
    await openAdvisorTab();
    for(let index=0;index<fx.specs.length;index++){
      await direction.page.locator('button[onclick="Orbit.modules.finanzas.verLiquidacionAsesor(\''+fx.specs[index].advisorId+'\')"]').click();
      await direction.page.waitForSelector('#fin-liquidacion-asesor #liq-document',{state:'visible',timeout:30000});
      await assertVisibleDocumentaryView(direction.page,'#liq-document',fx.plans[index]);
      await direction.page.locator('#liq-close').click();
    }
    pass('MULTICOMPONENT_CENTS_BOTH_CANONICAL_LEDGERS_AND_VISIBLE_DOCUMENTS_SURVIVE_RELOAD');
    assert.equal(direction.pageErrors.length,0,'ADVISOR_UAT_DIRECTION_PAGE_ERROR');assert.equal(operator.pageErrors.length,0,'ADVISOR_UAT_OPERATIVE_PAGE_ERROR');
    assert.equal(direction.assetErrors.length+operator.assetErrors.length,0,'ADVISOR_UAT_FIRST_PARTY_ASSET_ERROR');
    // Raw counts are not acceptance: final native request/SDK correlation below
    // also includes errors emitted during signed synthetic restoration.
    pass('PENDING_CXP_BOTH_ADVISORS_PERSIST_THROUGH_RELOAD_NO_PAGE_ERRORS');
  }catch(error){
    if(error&&error.documentedTermsProof)report.documentedTerms=error.documentedTermsProof;
    originalFailure=error;originalFailureStage=stage;
  }
  finally{
    stage='SYNTHETIC_RESTORE';
    if(tenant&&fx){
      report.cleanup.status='IN_PROGRESS';const cleanupErrors=[];
      // Signed restore is exercised first. Guarded admin fallback is ONLY for
      // known disposable records, never an alternative business-write path.
      for(const identity of sourceRequests){
        try{
          const ref=auditRef('request',identity.requestId);if(!observedAbsent.has(ref.path))continue;
          const snap=await ref.get();if(!snap.exists)continue;
          sourceAuditGuard('request',snap.data(),identity,direction?.uid||memberBefore[0]?.ref.id,cfg.live,identity.expectedIds,[],identity.expectedSourceKeys);
          // Validate full known source/amounts before either deletion path;
          // a retained financialDigest alone cannot authorize signed cleanup.
          for(const item of generated.filter(item=>item.requestId===identity.requestId)){
            const current=await rowRef(item.collection,item.expected.id).get();
            if(current.exists)assertGenerated(current.data(),item.expected,item.requestId,item.uid,item.collection);
          }
          if(direction){const out=await call(direction,{advisorPayable:{version:1,operation:'restoreSynthetic',syntheticQa:true,preparedRequestId:identity.requestId}});assert.ok(out.restored&&out.canonicalReadback&&out.financialPayments===0&&out.bankMovements===0);}
          else throw Error('ADVISOR_UAT_SIGNED_RESTORE_SESSION_UNAVAILABLE');
        }catch(error){cleanupErrors.push('SIGNED_RESTORE');}
      }
      for(const item of generated){
        try{const ref=rowRef(item.collection,item.expected.id);if(!observedAbsent.has(ref.path))continue;
          const snap=await ref.get();if(!snap.exists)continue;
          assertGenerated(snap.data(),item.expected,item.requestId,item.uid,item.collection);
          await ref.delete({lastUpdateTime:snap.updateTime});assert.equal((await ref.get()).exists,false);
        }catch(error){cleanupErrors.push('GENERATED_RECORD_PROVENANCE_OR_DELETE');}
      }
      for(const identity of sourceRequests){
        for(const [kind,id] of [['request',identity.requestId],['event',identity.eventId],['restore',identity.restoreEventId]]){
          try{const ref=auditRef(kind,id);if(!observedAbsent.has(ref.path))continue;
            const snap=await ref.get();if(!snap.exists)continue;
            sourceAuditGuard(kind,snap.data(),identity,memberBefore[0].ref.id,cfg.live,identity.expectedIds,
              generated.filter(item=>item.requestId===identity.requestId).map(item=>item.expected.id),identity.expectedSourceKeys);
            await ref.delete({lastUpdateTime:snap.updateTime});assert.equal((await ref.get()).exists,false);
          }catch(error){cleanupErrors.push('SOURCE_AUDIT_PROVENANCE_OR_DELETE');}
        }
      }
      if(genericRequest){
        for(const [kind,id] of [['request',genericRequest.requestId],['event',genericRequest.eventId]]){
          try{const ref=auditRef(kind,id);if(!observedAbsent.has(ref.path))continue;
            const snap=await ref.get();if(!snap.exists)continue;
            genericAuditGuard(kind,snap.data(),genericRequest,memberBefore[0].ref.id);
            await ref.delete({lastUpdateTime:snap.updateTime});
          }catch(error){cleanupErrors.push('GENERIC_AUDIT_PROVENANCE_OR_DELETE');}
        }
      }
      try{
        const correctionAudits=[];let latestCorrection;
        for(const step of assignmentSteps){
          const ref=auditRef('request',step.commitIdentity.requestId);
          if(!observedAbsent.has(ref.path))continue;
          const snap=await ref.get();
          if(!snap.exists){
            assert.equal((await auditRef('event',step.commitIdentity.eventId).get()).exists,false,'ADVISOR_UAT_ASSIGNMENT_AUDIT_MISMATCH');
            continue;
          }
          const row=snap.data();assignmentAuditGuard('request',row,step,memberBefore[0].ref.id,cfg.live);
          // Use the validated server receipt IDs, including after response loss.
          const event=auditRef('event',row.result.eventId),eventSnap=await event.get();
          assert.ok(observedAbsent.has(event.path),'ADVISOR_UAT_ASSIGNMENT_AUDIT_MISMATCH');
          assignmentAuditGuard('event',eventSnap.data(),step,memberBefore[0].ref.id,cfg.live);
          correctionAudits.push({ref,snap},{ref:event,snap:eventSnap});latestCorrection=step;
        }
        if(latestCorrection)for(const change of latestCorrection.commitPlan.changes){
          const seed=seeds.find(item=>item.expected.id===change.id&&item.ref.parent.parent.id===change.collection);
          assert.ok(seed,'ADVISOR_UAT_ASSIGNMENT_AUDIT_MISMATCH');
          const expected=latestCorrection.afterRows.find(([collection,row])=>collection===change.collection&&row.id===change.id)[1];
          const current=await seed.ref.get();
          if(current.exists)assert.deepEqual(current.data(),expected,'ADVISOR_UAT_ASSIGNMENT_AUDIT_MISMATCH');
          seed.expected=expected;
        }
        for(const item of correctionAudits){
          await item.ref.delete({lastUpdateTime:item.snap.updateTime});assert.equal((await item.ref.get()).exists,false);
        }
      }catch(error){cleanupErrors.push('ASSIGNMENT_AUDIT_PROVENANCE_OR_DELETE');}
      for(const item of seeds.slice().reverse()){
        try{const snap=await item.ref.get();if(!snap.exists)continue;const row=snap.data();
          assert.ok(row.__syntheticQa===true&&row.__qaRunId===runId&&row.tenantId===TENANT&&unchangedSeed(row,item.expected,fx.ids.ordinary,memberBefore[0].ref.id),'ADVISOR_UAT_SEED_CHANGED');
          await item.ref.delete({lastUpdateTime:snap.updateTime});assert.equal((await item.ref.get()).exists,false);
        }catch(error){cleanupErrors.push('SEED_PROVENANCE_OR_DELETE');}
      }
      for(const before of memberBefore){try{const snap=await before.ref.get();assert.equal(snap.exists?digest(snap.data()):null,before.digest,'ADVISOR_UAT_MEMBERSHIP_OR_ACCESS_CHANGED');}catch(error){cleanupErrors.push('MEMBERSHIP_CHANGED');}}
      for(const ref of allTargets){try{if((await ref.get()).exists)report.cleanup.remaining+=1;}catch(error){cleanupErrors.push('FINAL_ABSENCE_READ_FAILED');}}
      if(cleanupErrors.length||report.cleanup.remaining){cleanupFailure=Error('ADVISOR_UAT_CLEANUP_HOLD');report.cleanup.status='HOLD';report.cleanup.failureClasses=[...new Set(cleanupErrors)];}
      else{report.cleanup.status='PASS';pass('EXACT_SYNTHETIC_DATA_AND_AUDIT_ABSENCE_RESTORED_MEMBERSHIP_UNCHANGED');}
    }
    report.browserObservability=await finalizeBrowserObservability(browserObservers,async()=>{if(browser)await browser.close();});
    report.consoleErrorCount=report.browserObservability.totals.observedConsoleErrors;
    try{validateBrowserObservability(report.browserObservability);pass('BROWSER_ERRORS_EXACTLY_ATTRIBUTED_TO_EIGHT_OWNED_VERIFIED_DENIALS');}
    catch{report.browserObservability.status='HOLD';if(!originalFailure){originalFailure=Error('ADVISOR_UAT_BROWSER_OBSERVABILITY_HOLD');
      originalFailureStage=report.browserObservability.actors.flatMap(actor=>actor.events).find(event=>event.classification==='UNEXPECTED'||['PAGE_ERROR','TELEMETRY_FAILURE'].includes(event.eventType))?.stage||stage;}}
    if(!originalFailure&&!cleanupFailure&&report.cleanup.status==='PASS')report.status='PASS';
    // Only constant allowlisted diagnostics and a source line may be exposed;
    // never error messages/values, tokens, actor UIDs, customer rows or paths.
    const failure=originalFailure?safeFailureEvidence(originalFailure,originalFailureStage||stage):cleanupFailure?safeFailureEvidence(cleanupFailure,'SYNTHETIC_RESTORE'):{};
    Object.assign(report,failure);
    if(report.financeUiDiagnostics){
      report.financeUiDiagnostics=safeFinanceUiDiagnostics(report.financeUiDiagnostics);
      console.log('I66_ADVISOR_FINANCE_UI_DIAGNOSTIC '+JSON.stringify(report.financeUiDiagnostics));
    }
    console.log('I66_ADVISOR_BROWSER_OBSERVABILITY '+JSON.stringify({status:report.browserObservability.status,...report.browserObservability.totals}));
    fs.writeFileSync(cfg.reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
    console.log('I66_ADVISOR_PAYABLE_SIGNED_'+cfg.phase+'_'+report.status+' '+JSON.stringify({checks:report.checks.length,cleanup:report.cleanup.status,remaining:report.cleanup.remaining,realCustomerWritesRequested:0,bankMovements:0,financialPayments:0,authOrMembershipMutations:0,...failure}));
  }
  if(originalFailure||cleanupFailure)throw Error('ADVISOR_PAYABLE_SIGNED_UAT_HOLD');
  return report;
}
module.exports={configuration,sourceIdentity,fixtures,signedDocumentaryFixtures,withAssignmentFixtures,assignmentIdentity,assignmentStepsFor,assignmentReceiptFor,assignmentProjectionRows,assertAssignmentReceipt,assignmentAuditGuard,assertDocumentaryRow,assertDocumentaryReceipt,assertDocumentaryView,assertVisibleDocumentaryView,assertGenerated,sourceAuditGuard,genericAuditGuard,unchangedSeed,configuredCredential,assertServerDenial,browserDenialCatalog,safeBrowserLocation,createBrowserErrorLedger,attachBrowserObservability,browserObservabilityReport,finalizeBrowserObservability,validateBrowserObservability,safeFailureEvidence,safeLegalFailureSubstage,safeFinanceUiSnapshot,safeClickActionability,safeFinanceUiDiagnostics,captureFinanceUiSnapshot,main};
if(require.main===module)main().catch(error=>{console.error('I66_ADVISOR_PAYABLE_SIGNED_UAT_HOLD '+String(error.code||'ASSERTION_OR_RUNTIME_FAILURE').replace(/[^A-Za-z0-9_./:-]+/g,'_').slice(0,120));process.exitCode=1;});
