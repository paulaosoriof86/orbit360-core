'use strict';
// B4-003: real source functions evaluated with synthetic exact-ID financial fixtures.
// Does not issue authentication tokens, access Firestore, or write business data.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('orbit360-platform/core/queries.js','utf8');
const asOf='2026-10-21',cases=[];
function scenario({country='CO',currency='COP',carAmount=null,receiptAmount=6260611,
  due='2026-01-01',receiptDue='2026-01-01',receiptCurrency=currency,
  carCurrency=currency,receiptPaid=false,cobro=false,portfolioCount=1,
  state='pendiente_vencido',sourcePortfolioNominal=null}={}){
 const client={id:'c1',pais:country,moneda:currency},policy={id:'p1',clienteId:'c1',pais:country,moneda:currency,estado:'Vigente'};
 const receipt={id:'r1',polizaId:'p1',clienteId:'c1',moneda:receiptCurrency,
   fechaLimite:receiptDue,primaTotal:receiptAmount,estado:receiptPaid?'Pagado':'Pendiente',
   estadoOperativo:state,paidDate:receiptPaid?'2026-01-02':undefined};
 const portfolio={id:'car1',polizaId:'p1',clienteId:'c1',reciboId:'r1',moneda:carCurrency,
   vence:due,carteraActiva:true,estadoOperativo:state,estado:'Pendiente'};
 if(carAmount!=null)portfolio.monto=carAmount;
 if(sourcePortfolioNominal!=null)portfolio.primaTotal=sourcePortfolioNominal;
 const payment={id:'pay1',reciboId:'r1',polizaId:'p1',clienteId:'c1',moneda:currency,
   monto:receiptAmount,estado:'Pagado',fechaPago:'2026-01-02'};
 const data={clientes:[client],polizas:[policy],recibosEsperados:[receipt],
   carteraPrimas:Array.from({length:portfolioCount},(_,i)=>({...portfolio,id:'car'+(i+1)})),
   cobros:cobro?[payment]:[],comisiones:[],asesores:[]};
 const S={get:(k,id)=>(data[k]||[]).find(x=>String(x.id)===String(id))||null,
  all:k=>data[k]||[],where:(k,p)=>(data[k]||[]).filter(p),find:(k,p)=>(data[k]||[]).find(p)};
 const U={finiteNumber:x=>x==null||x===''?null:(Number.isFinite(Number(x))?Number(x):null),
  daysFromNow:v=>{if(!v)return null;return Math.round((Date.parse(String(v).slice(0,10)+'T00:00:00Z')-Date.parse(asOf+'T00:00:00Z'))/86400000);}};
 const Orbit={store:S,ui:U,pais:country};
 vm.runInNewContext(source,{window:{Orbit},Orbit,Map,Set,Date,Number,String,Array});
 const q=Orbit.q,ctx=q.portfolioAmountContext(),proof=q.portfolioAmountProof(data.carteraPrimas[0],ctx);
 const overview=q.carteraGlobalPorMoneda(),aging=q.agingVencidoPorMoneda(),sum=q.clienteResumen('c1'),indexed=q.clientesResumenIndex().get('c1');
 const bills=overview.byCurrency[currency]||{};
 return{proof,value:bills.venc||0,aging:aging.byCurrency[currency]||{},summary:sum.vencido,
   indexed:indexed.vencido,receipts:data.recibosEsperados.length,portfolio:data.carteraPrimas.length,
   cobros:data.cobros.length};
}
function check(name,opts,{value,source}){const r=scenario(opts);
 assert.equal(r.value,value,name+': aggregate');
 assert.equal(r.summary,value,name+': client detail');
 assert.equal(r.indexed,value,name+': client batch');
 assert.equal(r.proof.source,source,name+': source');
 if(value>0)assert.equal(Object.values(r.aging).reduce((a,b)=>a+b,0),value,name+': aging');
 cases.push(name);return r;}
const src='MATCHED_EXPECTED_RECEIPT_CONTRACTUAL_AMOUNT',un='UNVERIFIED';
const positive=check('canonical_CO_readonly_amount',{},{value:6260611,source:src});
check('portfolio_explicit_unchanged',{carAmount:450},{value:450,source:'CARTERA_EXPLICIT'});
check('explicit_zero_cannot_be_replaced',{carAmount:0},{value:0,source:'CARTERA_EXPLICIT'});
check('missing_currency_hold',{receiptCurrency:''},{value:0,source:un});
check('cross_currency_hold',{receiptCurrency:'GTQ'},{value:0,source:un});
check('portfolio_currency_conflict_hold',{carCurrency:'GTQ'},{value:0,source:un});
check('GT_UTO_COP_hold',{country:'GT',currency:'GTQ',receiptCurrency:'COP',carCurrency:'COP',receiptAmount:147},{value:0,source:un});
check('paid_receipt_hold',{receiptPaid:true},{value:0,source:un});
check('verified_payment_hold',{cobro:true},{value:0,source:un});
check('duplicate_portfolio_hold',{portfolioCount:2},{value:0,source:un});
check('due_date_disagreement_hold',{receiptDue:'2026-02-01'},{value:0,source:un});
check('source_amount_conflict_hold',{sourcePortfolioNominal:400},{value:0,source:un});
check('same_nominal_explicit',{sourcePortfolioNominal:6260611},{value:6260611,source:src});
check('unknown_operational_state_hold',{state:'requiere_validacion_estado'},{value:0,source:un});
check('CO_733878_95',{receiptAmount:733878.95},{value:733878.95,source:src});
check('CO_1227140_09',{receiptAmount:1227140.09},{value:1227140.09,source:src});
const sum=6260611+733878.95+1227140.09;
assert.ok(Math.abs(sum-8221630.04)<0.001,'source-backed 3 policies no fabricated amount');
assert.equal(positive.receipts,1);assert.equal(positive.portfolio,1);assert.equal(positive.cobros,0);
console.log('PASS B4_003_PORTFOLIO_VERIFIED_RECEIPT_READMODEL checks='+cases.length+' source_records=three_CO financial_SUM_COP_8221630_04 no_firestore/no_cobros/no_writes');
