'use strict';
// B4-003 P0 commercial QA segregation. Real query owner, synthetic records only.
// No Firebase, browser session, network, write, reimport, or deployment is used.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('orbit360-platform/core/queries.js','utf8');

function fixture(country){
  const clients=[
    {id:'cGT',pais:'GT',moneda:'GTQ'},
    {id:'cCO',pais:'CO',moneda:'COP'},
    {id:'qaClientB2',pais:'GT',sourceRef:'B2 QA firme — histórico'},
    {id:'cPolicyQa',pais:'CO',moneda:'COP'}
  ];
  const policies=[
    {id:'pGT',pais:'GT',clienteId:'cGT',moneda:'GTQ',estado:'Vigente',vigenciaInicio:'2026-11-01',vigenciaFin:'2026-12-01'},
    {id:'pCO',pais:'CO',clienteId:'cCO',moneda:'COP',estado:'Vigente',vigenciaInicio:'2026-11-01',vigenciaFin:'2026-12-01'},
    {id:'pB2',pais:'GT',clienteId:'qaClientB2',moneda:'GTQ',estado:'Vigente',vigenciaInicio:'2026-11-01',vigenciaFin:'2026-12-01'},
    {id:'pQaParent',pais:'CO',clienteId:'cPolicyQa',moneda:'COP',estado:'Vigente',vigenciaInicio:'2026-11-01',vigenciaFin:'2026-12-01',__syntheticQa:true}
  ];
  const cartera=[
    {id:'pendGT',polizaId:'pGT',clienteId:'cGT',pais:'GT',moneda:'GTQ',monto:456,estado:'Pendiente',fechaLimite:'2026-12-01'},
    {id:'overGT',polizaId:'pGT',clienteId:'cGT',pais:'GT',moneda:'GTQ',monto:300,estado:'Pendiente',fechaLimite:'2026-10-01'},
    {id:'qaB2',polizaId:'pB2',clienteId:'qaClientB2',pais:'GT',moneda:'GTQ',monto:123,estado:'Pendiente',fechaLimite:'2026-12-01'},
    {id:'qaChild',polizaId:'pGT',clienteId:'cGT',pais:'GT',moneda:'GTQ',monto:50,estado:'Pendiente',fechaLimite:'2026-10-01',__syntheticQa:true},
    {id:'pendCO',polizaId:'pCO',clienteId:'cCO',pais:'CO',moneda:'COP',monto:321,estado:'Pendiente',fechaLimite:'2026-12-01'},
    {id:'overCO',polizaId:'pCO',clienteId:'cCO',pais:'CO',moneda:'COP',monto:123,estado:'Pendiente',fechaLimite:'2026-10-01'},
    {id:'qaPolicyParent',polizaId:'pQaParent',clienteId:'cPolicyQa',pais:'CO',moneda:'COP',monto:234,estado:'Pendiente',fechaLimite:'2026-12-01'},
    {id:'orphanPortfolio',polizaId:'missing-policy',pais:'GT',moneda:'GTQ',monto:90,estado:'Pendiente',fechaLimite:'2026-12-01'}
  ];
  const payments=[
    {id:'paidGT',polizaId:'pGT',clienteId:'cGT',pais:'GT',moneda:'GTQ',monto:100,estado:'Pagado',fechaPago:'2026-11-05',conciliado:true},
    {id:'paidCO',polizaId:'pCO',clienteId:'cCO',pais:'CO',moneda:'COP',monto:200,estado:'Pagado',fechaPago:'2026-11-05',conciliado:true},
    {id:'qaPaymentChild',polizaId:'pGT',clienteId:'cGT',pais:'GT',moneda:'GTQ',monto:777,estado:'Pagado',fechaPago:'2026-11-05',conciliado:true,__syntheticQa:true},
    {id:'qaPaymentParent',polizaId:'pQaParent',clienteId:'cPolicyQa',pais:'CO',moneda:'COP',monto:888,estado:'Pagado',fechaPago:'2026-11-05',conciliado:true},
    {id:'qaPaymentB2',polizaId:'pB2',clienteId:'qaClientB2',pais:'GT',moneda:'GTQ',monto:66,estado:'Pagado',fechaPago:'2026-11-05',conciliado:true},
    {id:'orphanPayment',polizaId:'missing-policy',pais:'GT',moneda:'GTQ',monto:99,estado:'Pagado',fechaPago:'2026-11-05',conciliado:true},
    {id:'unparentedPayment',pais:'GT',moneda:'GTQ',monto:50,estado:'Pagado',fechaPago:'2026-11-05',conciliado:true},
    {id:'inferredPayment',polizaId:'pGT',clienteId:'cGT',pais:'GT',moneda:'GTQ',monto:2500,estado:'Pagado',fechaPago:'2026-11-05',paymentState:'PAID_INFERRED'}
  ];
  const collections={clientes:clients,polizas:policies,carteraPrimas:cartera,cobros:payments,recibosEsperados:[],vehiculos:[],asesores:[],comisiones:[],cancelaciones:[],actividades:[],metas:[]};
  let writes=0;
  const store={
    all:key=>collections[key]||[],
    get:(key,id)=>(collections[key]||[]).find(row=>String(row.id)===String(id))||null,
    where:(key,predicate)=>(collections[key]||[]).filter(predicate),
    find:(key,predicate)=>(collections[key]||[]).find(predicate),
    set(){writes++;throw Error('unexpected store write');},
    add(){writes++;throw Error('unexpected store write');},
    delete(){writes++;throw Error('unexpected store write');}
  };
  const ui={
    finiteNumber:v=>v==null||v===''?null:(Number.isFinite(Number(v))?Number(v):null),
    daysFromNow:date=>date==='2026-10-01'?-35:date==='2026-12-01'?26:null,
    now:()=>new Date('2026-11-05T12:00:00Z')
  };
  const Orbit={store,ui,pais:country};
  vm.runInNewContext(source,{Orbit,window:{Orbit},Date,Map,Set,console},{timeout:1500});
  return {q:Orbit.q,get writes(){return writes;}};
}
const audit={mode:'audit',includeSyntheticQa:true};
const n=(summary,currency,bucket)=>summary.byCurrency[currency]?.[bucket]||0;
const tests=[];
function test(name,fn){try{fn();tests.push({name,ok:true})}catch(error){tests.push({name,ok:false,message:error.message});throw error;}}

test('commercial pending, overdue and confirmed values exclude explicit, inherited and B2 QA; valid records remain',()=>{
  const {q,writes}=fixture('TODOS'),v=q.carteraGlobalPorMoneda();
  assert.equal(n(v,'GTQ','pend'),456);
  assert.equal(n(v,'GTQ','venc'),300);
  assert.equal(n(v,'GTQ','alDia'),100);
  assert.equal(n(v,'COP','pend'),321);
  assert.equal(n(v,'COP','venc'),123);
  assert.equal(n(v,'COP','alDia'),200);
  assert.equal(v.confirmedCount,2);
  assert.deepEqual(Array.from(q.carteraPendienteRows(),x=>x.id).sort(),['pendCO','pendGT']);
  assert.deepEqual(Array.from(q.carteraVencidaRows(),x=>x.id).sort(),['overCO','overGT']);
  assert.deepEqual(Array.from(q.cobrosConfirmadosRows(),x=>x.id).sort(),['paidCO','paidGT']);
  assert.equal(writes,0);
  // B4-003: operational Cobros rows must not re-expose QA omitted from KPIs.
  const cobrosSource=fs.readFileSync('orbit360-platform/modules/cobros.js','utf8');
  const start=cobrosSource.indexOf('  function commercialCobrosRow(');
  const end=cobrosSource.indexOf('\n  function rows(',start);
  assert.ok(start>0&&end>start,'COBROS_COMMERCIAL_QA_FILTER_MISSING');
  const idx={
    policies:new Map([['good',{id:'good',clienteId:'goodClient'}],['qaPolicy',{id:'qaPolicy',clienteId:'goodClient',__syntheticQa:true}],['b2',{id:'b2',clienteId:'goodClient',sourceRef:'B2 QA firme — rótulo'}],['qaClientPolicy',{id:'qaClientPolicy',clienteId:'qaClient'}]]),
    clients:new Map([['goodClient',{id:'goodClient'}],['qaClient',{id:'qaClient',syntheticQa:true}]])
  };
  const context={q,indexPolicy:(i,id)=>i.policies.get(String(id||''))||null,indexClient:(i,id)=>i.clients.get(String(id||''))||null};
  vm.runInNewContext(cobrosSource.slice(start,end),context,{timeout:1500});
  const visible=context.commercialCobrosRow;
  assert.equal(visible({polizaId:'good'},idx),true,'REAL_COMMERCIAL_ROW_KEPT');
  assert.equal(visible({polizaId:'good',__syntheticQa:true},idx),false,'EXPLICIT_QA_ROW_EXCLUDED');
  assert.equal(visible({polizaId:'qaPolicy'},idx),false,'QA_PARENT_POLICY_EXCLUDED');
  assert.equal(visible({polizaId:'b2'},idx),false,'B2_QA_SOURCE_REF_EXCLUDED');
  assert.equal(visible({polizaId:'qaClientPolicy'},idx),false,'QA_PARENT_CLIENT_EXCLUDED');
  assert.match(cobrosSource,/rows\(idx\)\.filter\(row => commercialCobrosRow/);
  assert.match(cobrosSource,/portfolioPaymentRows\(idx\)\.filter\(row => commercialCobrosRow/);
  assert.match(cobrosSource,/reportedRows\(idx\)\.filter\(row => commercialCobrosRow/);
  assert.match(cobrosSource,/countryMatches\\(c, idx\\) && commercialCobrosRow\\(c, idx\\)/);
  // Cliente 360 keeps QA records audit-visible, never in the commercial client counter.
  const cliente360Source=fs.readFileSync('orbit360-platform/modules/cliente360.js','utf8');
  assert.match(cliente360Source,/const commercialClientRows = rows\\.filter\\(c => !isQaRecord\\(c\\)\\)/);
  assert.match(cliente360Source,/const kpiClientIds = new Set\\(commercialClientRows\\.map/);
  assert.match(cliente360Source,/data-c360-kpi-client-count="\\$\\{commercialClientRows\\.length\\}"/);
  assert.match(cliente360Source,/Clientes comerciales<\\/div><div class="k-val">\\$\\{commercialClientRows\\.length\\}/);
  assert.match(cliente360Source,/data-c360-qa-audit="\\$\\{isQaAudit/);
  assert.match(cliente360Source,/QA · solo auditoría/);
  assert.equal(q.isSyntheticQaRecord({id:'qaClient',__syntheticQa:true}),true);
  assert.equal(q.isSyntheticQaRecord({id:'b2',sourceRef:'B2 QA firme — histórico'}),true);
  assert.equal(q.isSyntheticQaRecord({id:'commercial',nombre:'Cliente real'}),false);
});

test('GT, CO and TODOS preserve country scope and TODOS equals GT plus CO without double counting',()=>{
  const gt=fixture('GT').q.carteraGlobalPorMoneda();
  const co=fixture('CO').q.carteraGlobalPorMoneda();
  const all=fixture('TODOS').q.carteraGlobalPorMoneda();
  assert.deepEqual(Object.keys(gt.byCurrency),['GTQ']);
  assert.deepEqual(Object.keys(co.byCurrency),['COP']);
  assert.equal(all.byCurrency.GTQ.alDia,gt.byCurrency.GTQ.alDia);
  assert.equal(all.byCurrency.GTQ.pend,gt.byCurrency.GTQ.pend);
  assert.equal(all.byCurrency.COP.alDia,co.byCurrency.COP.alDia);
  assert.equal(all.byCurrency.COP.pend,co.byCurrency.COP.pend);
  assert.equal(all.confirmedCount,gt.confirmedCount+co.confirmedCount);
});

test('explicit audit mode can inspect QA rows while retaining country filters and parent verification',()=>{
  const gt=fixture('GT').q,co=fixture('CO').q,all=fixture('TODOS').q;
  const ga=gt.carteraGlobalPorMoneda(audit),ca=co.carteraGlobalPorMoneda(audit),aa=all.carteraGlobalPorMoneda(audit);
  assert.equal(ga.byCurrency.GTQ.pend,579); // 456 + B2 123; explicit-child pending is overdue.
  assert.equal(ga.byCurrency.GTQ.venc,350); // 300 + explicit-child 50.
  assert.equal(ga.byCurrency.GTQ.alDia,943); // 100 + explicit, B2 QA payments.
  assert.equal(ca.byCurrency.COP.pend,555); // 321 + QA parent 234.
  assert.equal(ca.byCurrency.COP.alDia,1088); // 200 + QA parent payment.
  assert.equal(aa.byCurrency.GTQ.alDia,ga.byCurrency.GTQ.alDia);
  assert.equal(aa.byCurrency.COP.alDia,ca.byCurrency.COP.alDia);
  assert.equal(ga.unassignedConfirmedCount,0,'unverified orphan records are not promoted into audit totals');
});

test('aging uses only unpaid overdue portfolio and keeps GTQ and COP buckets separate',()=>{
  const {q}=fixture('TODOS'),a=q.agingVencidoPorMoneda();
  assert.equal(a.byCurrency.GTQ['31-60'],300);
  assert.equal(a.byCurrency.COP['31-60'],123);
  assert.equal(a.byCurrency.GTQ['1-30'],0);
  assert.equal(a.byCurrency.COP['1-30'],0);
});

test('pending and inferred payments never become confirmed commercial collection',()=>{
  const {q}=fixture('TODOS');
  assert.deepEqual(Array.from(q.cobrosConfirmadosRows(),x=>x.id).sort(),['paidCO','paidGT']);
  assert.deepEqual(JSON.parse(JSON.stringify(q.recaudoMesPorMoneda('2026-11'))),{GTQ:100,COP:200});
  assert.equal(q.recaudoMesPorMoneda('2026-11','advisor-does-not-match').GTQ,undefined);
});

if(tests.length!==5)throw Error('B4_003_FINANCIAL_QA_TEST_COUNT');
process.stdout.write(JSON.stringify({schema:'B4_003_FINANCIAL_QA_COMMERCIAL_EXCLUSION_V1',testsPassed:tests.length,writes:0,countries:['GT','CO','TODOS'],currencies:['GTQ','COP']})+'\n');
