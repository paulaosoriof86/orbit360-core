import fs from 'node:fs';
import vm from 'node:vm';

const need=(ok,code)=>{if(!ok)throw new Error(code);};
const addDays=n=>{const d=new Date();d.setUTCHours(12,0,0,0);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
const data={clientes:[{id:'gt',moneda:'GTQ'},{id:'co',moneda:'COP'}],polizas:[]};
const store={all:k=>data[k]||[],get:(k,id)=>(data[k]||[]).find(x=>x.id===id)||null,where:()=>[]};
const ui={
  finiteNumber:v=>{const n=Number(v);return Number.isFinite(n)?n:null;},
  daysFromNow:v=>{if(!v)return null;const a=new Date(v+'T12:00:00Z'),b=new Date();b.setUTCHours(12,0,0,0);return Math.round((a-b)/86400000);},
  esc:v=>String(v??''),money:()=>'',moneyShort:()=>'',fmtDate:()=>'',estadoBadge:()=>''
};
const Orbit={ui,q:{},kit:{ramoOptions:()=>[],aseguradoraOptions:()=>[],asesorOptions:()=>[]},store,modules:{}};
const context=vm.createContext({window:{Orbit},Orbit,document:{},console,setTimeout,clearTimeout,location:{}});
context.window.window=context.window;
vm.runInContext(fs.readFileSync('orbit360-platform/modules/polizas.js','utf8'),context,{filename:'polizas.js'});
vm.runInContext(fs.readFileSync('orbit360-platform/modules/cliente360.js','utf8'),context,{filename:'cliente360.js'});

const metrics=Orbit.modules.polizas.policyMetrics;
need(metrics,'I64_METRICS_NOT_EXPOSED');
const fixtures=[
  {id:'a',clienteId:'gt',estado:'Vigente',moneda:'GTQ',primaNeta:100,vigenciaFin:addDays(10),renovable:true},
  {id:'b',clienteId:'co',estado:'Vigente',moneda:'COP',primaNeta:200,vigenciaFin:addDays(45)},
  {id:'c',clienteId:'gt',estado:'Por renovar',moneda:'GTQ',primaNeta:50,vigenciaFin:addDays(46),renovable:true},
  {id:'d',clienteId:'gt',estado:'Vigente',moneda:'GTQ',primaNeta:25,vigenciaFin:addDays(5),renovable:false},
  {id:'e',estado:'Renovada'}, {id:'f',estado:'Histórica'}, {id:'g',estado:'Reexpedida'},
  {id:'h',estado:'Vigente futura'}, {id:'i',estado:'Requiere validación'}
];
const totals=metrics.premiumByCurrency(fixtures);
need(totals.GTQ===175&&totals.COP===200&&Object.keys(totals).length===2,'I64_MULTI_CURRENCY_COMPOSITION');
need(fixtures.filter(metrics.isRenewalWithin45Days).length===3,'I64_RENEWALS_45D_SEMANTICS');
need(fixtures.filter(metrics.isHistoricalNoPortfolio).length===3,'I64_HISTORICAL_SEMANTICS');
need(metrics.renewabilityState(fixtures[1])==='UNKNOWN'&&metrics.renewabilityState(fixtures[3])==='NO'&&metrics.renewabilityState(fixtures[0])==='YES','I64_RENEWABILITY_TRI_STATE');
need(Orbit.modules.cliente360.renovabilidad({})==='UNKNOWN'&&Orbit.modules.cliente360.renovabilidad({renovable:false})==='NO'&&Orbit.modules.cliente360.renovabilidad({renovable:true})==='YES','I64_CLIENTE360_RENEWABILITY_TRI_STATE');
need(!fs.readFileSync('orbit360-platform/modules/polizas.js','utf8').includes('q.norm((policyPremiumNet'),'I64_CURRENCY_NORMALIZATION_STILL_PRESENT');
const bridge=fs.readFileSync('orbit360-platform/modules/policy-receipts-v1199-bridge.js','utf8');
for(const token of ['policyMetrics','isRenewalWithin45Days','isHistoricalNoPortfolio','premiumByCurrency'])need(bridge.includes(token),'I64_RUNTIME_BRIDGE_CONTRACT:'+token);
console.log('GRAVICENTRA_I6_4_CODE_DEFECT_CONTRACT=PASS');
console.log('I64_OPERATIONAL_WRITES=0');
