'use strict';
// Synthetic local tests only. Source lines, coverage codes and values are invented.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {createRequire}=require('node:module');
const contract=require('../functions/advisor-commission-payable-contract');
const clone=value=>JSON.parse(JSON.stringify(value));
// Reuse the established isolated domain/UI harness without registering its tests
// again or altering the pinned historical suite.
const harnessFile=path.join(__dirname,'gravicentra-i6-6-advisor-payables.test.cjs');
const harnessModule={exports:{}},harnessRequire=createRequire(harnessFile);
vm.runInNewContext(fs.readFileSync(harnessFile,'utf8')+'\nmodule.exports={env,fixture,context,uiHarness,payableFacade};',{
  module:harnessModule,exports:harnessModule.exports,__dirname,console,Buffer,
  require:name=>name==='node:test'?()=>{}:harnessRequire(name)
},{filename:harnessFile});
const {env,fixture,context,uiHarness,payableFacade}=harnessModule.exports;
function grouped(extra={}){
  const source=clone(fixture().source);
  return fixture({ordinaryCommission:39.10,base:391,pct:10,source,
    components:[
      {coverageCode:'COV_A',source:{...source,lineId:'Sheet1:14'},ordinaryCommission:4.05,base:40.50,pct:10},
      {coverageCode:'COV_B',source:{...source,lineId:'Sheet1:15'},ordinaryCommission:35.05,base:350.50,pct:10}
    ],...extra});
}
const ledgerWrites=e=>e.writes.filter(write=>/\/data\/(comisiones|finmovs)\/items\//.test(write.p));
const expectedHold=error=>['SOURCE_LINE_ALREADY_INTERPRETED','REQUIREMENT_ALREADY_INTERPRETED','COMMISSION_SOURCE_CONFLICT','PAYABLE_SOURCE_CONFLICT'].includes(error.details?.reason);
function changeAllSources(line,change){line.source={...line.source,...change};line.components=line.components.map(component=>({...component,source:{...component.source,...change}}));return line;}

test('single-line full output bytes, IDs and digests remain identical to the pre-component contract',()=>{
  // JSON SHA-256 values captured from the contract at d5d4f7b27c62c814d3cf431f9860891fb455db49.
  const cases=[
    [fixture(),context(),'965bd966dae5abe73e8f6c2a73dbd44915998ab772d9b1212abacb8e1ad7b843'],
    [fixture({base:321.09,pct:17.5}),context(),'d2650d56ac94e3fc4632dd516e01d48ded8aaf4385f5ee944e64fd9ec0732f51'],
    [fixture(),context({synthetic:true}),'01b8e6d1331ca1ecd0adcfe0ea43b4043ef894996ce846f10533694ab510cbe7'],
    [fixture(),context({sourceMode:'canonical'}),'887a95b70fff6c1f8ab634975a0be7835c67a5be8807fa1f28335efa0681d74f']
  ];
  for(const [line,ctx,expected] of cases){
    const normalized=contract.normalizeLine(line,ctx);
    assert.equal(crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex'),expected);
    assert.equal(Object.hasOwn(normalized.payable,'sourceComponents'),false);
  }
});
test('one economic obligation retains two source components and sums rounded per-line shares',()=>{
  const plan=contract.normalizeLine(grouped(),context()),row=plan.payable;
  assert.equal(row.comisionOrdinariaAcreditada,39.10);assert.equal(row.valor,27.38);
  assert.notEqual(row.valor,Math.round(3910*7000/10000)/100);
  assert.deepEqual(row.sourceComponents.map(c=>[c.coverageCode,c.advisorAmount]),[['COV_A',2.84],['COV_B',24.54]]);
  assert.equal(row.base,391);assert.equal(row.pct,10);
  assert.equal(row.sourceComponentsDigest,contract.componentsDigest(row.sourceComponents));
  assert.deepEqual(row.sourceComponents,plan.commission.sourceComponents);
  const aggregate=contract.normalizeLine(fixture({ordinaryCommission:39.10}),context());
  assert.equal(row.id,aggregate.payable.id);assert.equal(plan.commission.id,aggregate.commission.id);
  assert.notEqual(row.financialDigest,aggregate.financialDigest);
});
test('distinct insurer rates remain attached to their original component without inventing a blended rate',()=>{
  const line=grouped();delete line.pct;delete line.base;
  line.components[0].base=81;line.components[0].pct=5;
  const row=contract.normalizeLine(line,context()).payable;
  assert.equal(row.base,431.50);assert.equal(Object.hasOwn(row,'pct'),false);
  assert.deepEqual(row.sourceComponents.map(c=>c.pct),[5,10]);assert.equal(row.valor,27.38);
  delete line.components[1].base;delete line.components[1].pct;
  const partial=contract.normalizeLine(line,context()).payable;
  assert.equal(Object.hasOwn(partial,'base'),false);assert.equal(Object.hasOwn(partial,'pct'),false);
  assert.equal(partial.sourceComponents[0].base,81);assert.equal(partial.valor,27.38);
});
test('reordering, display names and documentary references do not create a different economic identity',()=>{
  const original=contract.normalizeLine(grouped(),context());
  const line=changeAllSources(grouped(),{fileId:'statement-copy',reference:'https://example.invalid/renamed-copy'});
  line.components.reverse();line.source.lineId=line.components[0].source.lineId;
  line.components[0].coverageCode=line.components[0].coverageCode.toLowerCase();
  const ctx=context();ctx.advisor.nombre='Nombre de muestra actualizado';ctx.policy.numero='Número visible actualizado';
  const changed=contract.normalizeLine(line,ctx);
  assert.equal(changed.payable.id,original.payable.id);assert.equal(changed.commission.id,original.commission.id);
  assert.equal(changed.financialDigest,original.financialDigest);
  assert.equal(changed.payable.sourceComponentsDigest,original.payable.sourceComponentsDigest);
});
test('component presence, coverage codes and exact original source identities fail closed',()=>{
  const cases=[
    [line=>line.components=[], 'SOURCE_COMPONENTS_REQUIRED'],
    [line=>line.components=[line.components[0]], 'SOURCE_COMPONENTS_REQUIRED'],
    [line=>line.components=Array(21).fill(line.components[0]), 'SOURCE_COMPONENTS_REQUIRED'],
    [line=>line.components[0]=null,'INVALID_SOURCE_COMPONENT'],
    [line=>delete line.components[0].coverageCode,'SOURCE_COMPONENT_COVERAGE_REQUIRED'],
    [line=>line.components[0].coverageCode='<script>','SOURCE_COMPONENT_COVERAGE_REQUIRED'],
    [line=>line.components[1].coverageCode='cov_a','SOURCE_COMPONENT_DUPLICATE'],
    [line=>line.components[1].source.lineId='Sheet1:14','SOURCE_COMPONENT_DUPLICATE'],
    [line=>line.components[1].source.fileId='different-document','SOURCE_COMPONENT_REQUIREMENT_CONFLICT'],
    [line=>line.components[1].source.sha256='b'.repeat(64),'SOURCE_COMPONENT_REQUIREMENT_CONFLICT'],
    [line=>line.components[1].source.requirementRef='REQ-DIFFERENT','SOURCE_COMPONENT_REQUIREMENT_CONFLICT'],
    [line=>line.source.lineId='invented-total-line','SOURCE_COMPONENT_ANCHOR_REQUIRED']
  ];
  for(const [mutate,code] of cases){const line=grouped();mutate(line);assert.throws(()=>contract.normalizeLine(line,context()),{code});}
});
test('component zero, negative, fractional-cent values and unsupported percentages retain existing strict money rules',()=>{
  for(const amount of [0,-1,1.001,NaN,'4.05']){
    const line=grouped();line.components[0].ordinaryCommission=amount;
    assert.throws(()=>contract.normalizeLine(line,context()),{code:'INVALID_AMOUNT'});
  }
  for(const pct of [0,-1,100.0001,5.12345,'10']){
    const line=grouped();line.components[0].pct=pct;
    assert.throws(()=>contract.normalizeLine(line,context()),{code:'INVALID_INSURER_RATE'});
  }
  const empty=grouped({participation:{pct:0.01,authorityRef:'explicit-synthetic-low-share'}});
  assert.throws(()=>contract.normalizeLine(empty,context()),{code:'EMPTY_PAYABLE'});
});
test('outer credit, base and rate cannot contradict or replace documented component values',()=>{
  for(const [change,code] of [[{ordinaryCommission:39.11},'SOURCE_COMPONENT_TOTAL_CONFLICT'],[{base:391.01},'SOURCE_COMPONENT_BASIS_CONFLICT'],[{pct:11},'SOURCE_COMPONENT_BASIS_CONFLICT']])
    assert.throws(()=>contract.normalizeLine(grouped(change),context()),{code});
  const line=grouped();delete line.components[1].base;
  assert.throws(()=>contract.normalizeLine(line,context()),{code:'SOURCE_COMPONENT_BASIS_CONFLICT'});
});
test('component amount, base, insurer rate, code and source line are bound to the financial digest',()=>{
  const original=contract.normalizeLine(grouped(),context());
  for(const mutate of [
    line=>{line.components[0].ordinaryCommission+=0.01;line.components[1].ordinaryCommission-=0.01;},
    line=>{delete line.base;line.components[0].base+=0.01;},
    line=>{delete line.pct;line.components[0].pct=9;},
    line=>line.components[1].coverageCode='COV_C',
    line=>line.components[1].source.lineId='Sheet1:16'
  ]){const line=grouped();mutate(line);const plan=contract.normalizeLine(line,context());assert.equal(plan.payable.id,original.payable.id);assert.notEqual(plan.financialDigest,original.financialDigest);}
});
test('preview is read-only and preparation creates exactly one source commission, one payable and both readback proofs',async()=>{
  const e=env(),line=grouped(),preview=await e.send({lines:[line]});
  assert.equal(e.writes.length,0);assert.equal(preview.newPayables,1);assert.equal(preview.totals.GTQ,27.38);
  const result=await e.prepare({lines:[line]});
  assert.equal(result.payables.length,1);assert.equal(result.commissions.length,1);assert.equal(ledgerWrites(e).length,2);
  assert.equal(result.financialPayments,0);assert.equal(result.bankMovements,0);
  assert.equal(result.payables[0].estado,'pendiente');assert.equal(result.payables[0].pagada,false);
  for(const proof of [result.readback[0],result.commissionReadback[0]]){
    assert.equal(proof.sourceComponents.length,2);assert.equal(proof.sourceComponentsDigest,result.payables[0].sourceComponentsDigest);
  }
  const audit=e.writes.find(write=>write.row?.action==='prepare_advisor_commission_payables');
  assert.deepEqual(clone(audit.row.sourceKeys),['tenant-test|statement-october|Sheet1:14','tenant-test|statement-october|Sheet1:15']);
});
test('canonical replay and reordered renamed source copy reuse the same payable without new debt',async()=>{
  const e=env(),first=await e.prepare({lines:[grouped()]});
  const replay=await e.prepare({lines:[],commissionIds:[first.commissions[0].id]});
  assert.equal(replay.newPayables,0);assert.equal(replay.reusedPayables,1);assert.equal(replay.payables[0].valor,27.38);
  assert.deepEqual(clone(replay.commissions[0].sourceComponents),clone(first.commissions[0].sourceComponents));
  const copied=changeAllSources(grouped(),{fileId:'statement-copy',reference:'https://example.invalid/copy'});copied.components.reverse();copied.source.lineId='Sheet1:15';
  e.rows.set(e.ref('asesores','advisor-alpha'),{...context().advisor,nombre:'Asesor sintético renombrado'});
  const renamed=await e.prepare({lines:[copied]});
  assert.equal(renamed.newPayables,0);assert.equal(renamed.payables[0].id,first.payables[0].id);assert.equal(ledgerWrites(e).length,2);
});
test('altered coverage labels, source hashes, source lines and requirements cannot double-count an existing group',async()=>{
  const e=env();await e.prepare({lines:[grouped()]});const before=clone([...e.rows]),count=e.writes.length;
  for(const mutate of [
    line=>line.components[1].coverageCode='RENAMED_COVERAGE',
    line=>changeAllSources(line,{sha256:'b'.repeat(64)}),
    line=>{line.components[1].source.lineId='Sheet1:16';},
    line=>changeAllSources(line,{requirementRef:'REQ-INVENTED-SUFFIX'}),
    line=>{line.collectionPeriod='2026-09';changeAllSources(line,{fileId:'copy-file',sha256:'c'.repeat(64)});}
  ]){const line=grouped();mutate(line);await assert.rejects(e.send({lines:[line]}),expectedHold);assert.equal(e.writes.length,count);}
  assert.deepEqual(clone([...e.rows]),before);
});
test('all component source lines, including a non-anchor line, block reuse with another policy or requirement',async()=>{
  for(const sameBatch of [true,false]){
    const e=env(),line=grouped();e.rows.set(e.ref('polizas','policy-second'),{...context().policy,id:'policy-second'});
    const isolated=fixture({polizaId:'policy-second',ordinaryCommission:35.05,source:{...line.components[1].source,requirementRef:'REQ-SECOND'}});
    if(!sameBatch)await e.prepare({lines:[line]});const count=e.writes.length;
    await assert.rejects(e.send({lines:sameBatch?[line,isolated]:[isolated]}),error=>error.details?.reason==='SOURCE_LINE_ALREADY_INTERPRETED');
    assert.equal(e.writes.length,count);
  }
});
test('existing single-line records cannot be silently converted into a component interpretation',async()=>{
  const e=env(),first=await e.prepare({lines:[fixture({ordinaryCommission:39.10,base:391,pct:10})]});
  const before=clone([...e.rows]),count=e.writes.length;
  await assert.rejects(e.send({lines:[grouped()]}),expectedHold);
  assert.equal(e.writes.length,count);assert.deepEqual(clone([...e.rows]),before);
  assert.equal(Object.hasOwn(first.payables[0],'sourceComponents'),false);
});
test('retained digest cannot conceal edited component values in either canonical ledger',async()=>{
  for(const collection of ['comisiones','finmovs'])for(const field of ['ordinaryCommission','advisorAmount','base','pct','coverageCode']){
    const e=env(),first=await e.prepare({lines:[grouped()]}),payable=first.payables[0];
    const key=e.ref(collection,collection==='comisiones'?payable.comisionId:payable.id),row=clone(e.rows.get(key)),count=e.writes.length;
    row.sourceComponents[1][field]=field==='coverageCode'?'TAMPERED':1;e.rows.set(key,row);
    await assert.rejects(e.send({lines:[grouped()]}),error=>['COMMISSION_SOURCE_CONFLICT','PAYABLE_SOURCE_CONFLICT'].includes(error.details?.reason));
    assert.equal(e.writes.length,count);
  }
});
test('complete component readback hydrates both ledgers while absent or inconsistent proofs hydrate neither',async()=>{
  const e=env(),receipt=await e.prepare({lines:[grouped()]}),valid=payableFacade(receipt);
  await valid.fn({version:1,operation:'prepare',advisorId:'advisor-alpha'});
  assert.deepEqual(clone(valid.pending.map(row=>row.collection)),['comisiones','finmovs']);assert.equal(valid.pending[0].row.sourceComponents.length,2);
  for(const mutate of [
    row=>delete row.readback[0].sourceComponents,
    row=>delete row.commissionReadback[0].sourceComponentsDigest,
    row=>{row.readback[0].sourceComponents[0].advisorAmount=1;},
    row=>{row.commissions[0].sourceComponents[0].base=1;},
    row=>{row.commissionReadback[0].sourceComponents[1].pct=1;},
    row=>{row.payables[0].sourceComponentsDigest='b'.repeat(64);}
  ]){const changed=clone(receipt);mutate(changed);const h=payableFacade(changed);await assert.rejects(h.fn({version:1,operation:'prepare',advisorId:'advisor-alpha'}),/ADVISOR_(PAYABLE|COMMISSION)/);assert.equal(h.pending.length,0);assert.equal(h.emitted.length,0);}
});
test('the existing visible source form sends unchanged components to preview and shows their rounded detail',async()=>{
  const h=uiHarness(),line=grouped(),plan=contract.normalizeLine(line,context());
  h.Orbit.store.prepareAdvisorPayables=async spec=>{h.calls.push(clone(spec));return {ok:true,payables:[plan.payable],totals:{GTQ:27.38},newPayables:1,reusedPayables:0,previewDigest:'synthetic-proof'};};
  h.Orbit.modules.finanzas.abrirFuentesAsesor('advisor-alpha');const form=h.nodes.get('fin-fuentes-asesor');
  form.querySelector('#fuente-asesor').value='advisor-alpha';form.querySelector('#fuente-corte').value='2026-11-15';
  form.querySelector('#fuente-lote').value=JSON.stringify({schemaVersion:'gravicentra-advisor-commission-source-batch-v1',advisorId:'advisor-alpha',cutoff:'2026-11-15',lines:[line]});
  await form.querySelector('#fuente-preview').listeners.click();
  assert.equal(h.calls.length,1);assert.equal(h.calls[0].operation,'preview');assert.deepEqual(h.calls[0].lines[0].components,clone(line.components));assert.equal(h.writes.length,0);
  const html=h.nodes.get('fin-lote').querySelector('#lote-body').innerHTML;
  assert.match(html,/Desglose por cobertura/);assert.match(html,/COV_A/);assert.match(html,/COV_B/);assert.match(html,/Sheet1:15/);assert.match(html,/24\.54/);assert.match(html,/27\.38/);
});
