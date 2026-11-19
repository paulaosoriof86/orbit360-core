'use strict';
// Exact I6.6 successor test pinned by the approved product delta manifest.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

function fixture(){
  const source=fs.readFileSync(path.join(__dirname,'../orbit360-platform/modules/aseguradoras.js'),'utf8');
  assert.match(source,/const patch = Object\.fromEntries\(cambios\.map/,'PRODUCT_PATCH_MUST_USE_DURABLE_DIFF');
  assert.match(source,/await S\(\)\.batchDurable/,'PRODUCT_PATCH_MUST_REACH_DURABLE_WRITER');
  const instrumented=source.replace('    render, ficha, kpi,',
    '    render, ficha, kpi,\n    __fixture: {ramoRow,diffResumen,reconcileProductCommissionDraft,reconcileInsurerFinancialRules},');
  assert.notEqual(instrumented,source,'EXPORT_TEST_ONLY_IN_VM');
  const Orbit={ui:{esc:value=>String(value),text:value=>String(value)},kit:{},cat:{get:()=>[],ramosDe:()=>[]}};
  vm.runInNewContext(instrumented,{window:{Orbit},Orbit,console,location:{hostname:'example.test'}},
    {timeout:2000});
  return Orbit.modules.aseguradoras.__fixture;
}

test('insurer fiche exposes editable product override and keeps inherited branch rate',()=>{
  const {ramoRow}=fixture();
  const insurer={id:'asg_a',ramos:['Autos'],comisiones:{Autos:15},
    ramosDetalle:{Autos:{productos:['Automóviles','Flotas']}},
    comisionesProd:{'Automóviles':18}};
  const edit=ramoRow(insurer,'Autos',0,true);
  const read=ramoRow(insurer,'Autos',0,false);
  assert.match(edit,/data-productpct="Automóviles"[^>]*value="18"/);
  assert.match(edit,/data-productpct="Flotas"[^>]*placeholder="Heredar" value=""/);
  assert.match(read,/18 %/);
  assert.match(read,/Hereda 15 % del ramo/);
  assert.doesNotMatch(read,/data-productpct/);
});

test('product rates persist as a separate diff and preserve unrelated explicit overrides',()=>{
  const {diffResumen,reconcileProductCommissionDraft}=fixture();
  const original={id:'asg_a',comisiones:{Autos:15},comisionesProd:{'Automóviles':18,'Otro producto':25}};
  const draft=JSON.parse(JSON.stringify(original));
  assert.deepEqual(Array.from(reconcileProductCommissionDraft(draft,[
    {product:'Automóviles',raw:'15.5'},{product:'Flotas',raw:'10'}])),[]);
  assert.equal(draft.comisionesProd['Automóviles'],15.5);
  assert.equal(draft.comisionesProd['Flotas'],10);
  assert.equal(draft.comisionesProd['Otro producto'],25);
  assert.deepEqual(Array.from(diffResumen(original,draft)),['comisionesProd']);
  assert.deepEqual(Array.from(reconcileProductCommissionDraft(draft,[
    {product:'Automóviles',raw:''}])),[]);
  assert.equal(Object.hasOwn(draft.comisionesProd,'Automóviles'),false);
});

test('invalid product rate is rejected without changing prior draft',()=>{
  const {reconcileProductCommissionDraft}=fixture();
  const draft={comisionesProd:{'Automóviles':18}};
  assert.deepEqual(Array.from(reconcileProductCommissionDraft(draft,[
    {product:'Automóviles',raw:'125'}])),['Automóviles']);
  assert.equal(draft.comisionesProd['Automóviles'],18);
  assert.deepEqual(Array.from(reconcileProductCommissionDraft(draft,[
    {product:'Automóviles',raw:'-1'}])),['Automóviles']);
  assert.equal(draft.comisionesProd['Automóviles'],18);
  assert.deepEqual(Array.from(reconcileProductCommissionDraft(draft,[
    {product:'Automóviles',raw:'0'}])),[]);
  assert.equal(draft.comisionesProd['Automóviles'],0);
});

test('insurer-specific installment, issuance and assistance terms are editable and source-persisted',()=>{
  const {ramoRow,diffResumen,reconcileInsurerFinancialRules}=fixture();
  const original={id:'asg_a',ramos:['Autos'],comisiones:{Autos:15},ramosDetalle:{Autos:{productos:['Auto Individual']}}};
  const read=ramoRow({...original,condicionesPrimas:{Autos:{gastosEmisionPct:0,maxCuotas:10,recargoFinBase:'netaMasEmision',cobraRecargo:true,recargosPorCuotas:{10:8},asistenciaAutosMonto:120}}},'Autos',0,true);
  assert.match(read,/data-prima-rule="maxCuotas"[^>]*value="10"/);
  assert.match(read,/data-prima-rule="recargosPorCuotas"[^>]*value="10:8"/);
  const inputs={gastosEmisionPct:'0',gastosEmisionBase:'neta',maxCuotas:'10',recargoFinBase:'netaMasEmision',asistenciaAutosMonto:'120',recargosPorCuotas:'2:2;10:8;12:13.5'};
  const card={dataset:{primaRamo:'Autos'},querySelector(selector){const name=/data-prima-rule="([^"]+)"/.exec(selector)?.[1];return name==='cobraRecargo'?{checked:true}:Object.hasOwn(inputs,name)?{value:inputs[name]}:null;}};
  const draft=JSON.parse(JSON.stringify(original));
  assert.deepEqual(Array.from(reconcileInsurerFinancialRules(draft,[card])),[]);
  assert.equal(draft.condicionesPrimas.Autos.gastosEmisionPct,0);
  assert.equal(draft.condicionesPrimas.Autos.maxCuotas,10);
  assert.equal(draft.condicionesPrimas.Autos.recargosPorCuotas['12'],13.5);
  assert.deepEqual(Array.from(diffResumen(original,draft)),['condicionesPrimas']);
  const retained=JSON.stringify(draft.condicionesPrimas);
  inputs.recargosPorCuotas='12:13.5;12:5';
  assert.deepEqual(Array.from(reconcileInsurerFinancialRules(draft,[card])),['Autos:recargos']);
  assert.equal(JSON.stringify(draft.condicionesPrimas),retained,'BAD_FINANCIAL_CONFIGURATION_MUST_NOT_MUTATE_DRAFT');
});

test('premium engine supports documented financing base and preserves net-only legacy',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../orbit360-platform/core/primas.js'),'utf8');
  const Orbit={paisCfg:()=>({iva:12})};
  vm.runInNewContext(source,{window:{Orbit},Orbit,console},{timeout:2000});
  const common={fraccionado:true,gastosEmision:50,otros:0,recargoFinPct:8,ivaPct:12};
  const documented=Orbit.primas.desglose(1000,'GT',{...common,recargoFinBase:'netaMasEmision'});
  const legacy=Orbit.primas.desglose(1000,'GT',common);
  assert.equal(documented.gastosFinan,84);
  assert.equal(documented.total,1270.08);
  assert.equal(legacy.gastosFinan,80);
  assert.equal(legacy.total,1265.6);
});

test('signed protected insurer directory returns configurable rates, without exposing credentials',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../functions/b4-003-scoped-bootstrap-reader.js'),'utf8');
  const fields=/const a=pick\(row,\[([^\]]+)\]\);/.exec(source)?.[1]||'';
  assert.match(fields,/'comisionesProd'/);
  assert.match(fields,/'condicionesPrimas'/);
  assert.match(source,/const schema=\{/);
  assert.match(source,/return Object\.assign\(sanitize\(a\),base\)/);
});
