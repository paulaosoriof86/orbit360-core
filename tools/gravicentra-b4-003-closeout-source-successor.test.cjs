'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const test=require('node:test');
const assert=require('node:assert/strict');

const inicioSource=fs.readFileSync('orbit360-platform/modules/inicio.js','utf8');
const plantillasSource=fs.readFileSync('orbit360-platform/modules/plantillas.js','utf8');

function moduleWith(data, q){
  let writes=0;
  const store={
    all:c=>(data[c]||[]).slice(),
    where:(c,fn)=>(data[c]||[]).filter(fn),
    get:(c,id)=>(data[c]||[]).find(x=>String(x.id)===String(id))||null,
    insert(){writes++;throw new Error('UNEXPECTED_WRITE');},
    update(){writes++;throw new Error('UNEXPECTED_WRITE');},
    remove(){writes++;throw new Error('UNEXPECTED_WRITE');}
  };
  const ctx={
    Orbit:{
      modules:{},
      ui:{
        money:(n,c)=>String(c)+' '+Number(n).toFixed(2),
        fmtDate:v=>String(v||''),
        esc:v=>String(v==null?'':v)
      },
      kit:{},
      store,
      q:q||{}
    },
    document:{},
    navigator:{},
    location:{hash:''},
    setTimeout,clearTimeout,
    console
  };
  ctx.window=ctx;
  vm.createContext(ctx);
  vm.runInContext(plantillasSource,ctx,{filename:'plantillas.js'});
  return {mod:ctx.Orbit.modules.plantillas,writes:()=>writes};
}
const base={
  clientes:[{id:'c1',nombre:'Cliente Uno',asesorId:'a1'}],
  polizas:[{id:'p1',clienteId:'c1',numero:'P-001',ramo:'Auto',aseguradoraId:'i1',asesorId:'a1',moneda:'GTQ',vigenciaFin:'2026-12-31'}],
  aseguradoras:[{id:'i1',nombre:'Aseguradora Uno'}],
  asesores:[{id:'a1',nombre:'Asesora Uno'}],
  carteraPrimas:[],cobros:[],recibosEsperados:[]
};
function qFor({obligations=[],payments=[]}={}){
  return {
    carteraVencidaDe:()=>obligations.filter(x=>x.overdue),
    carteraPendienteDe:()=>obligations.filter(x=>!x.overdue),
    cobrosConfirmadosRows:()=>payments,
    portfolioAmountContext:()=>({}),
    portfolioAmountProof:r=>({value:r.verifiedAmount==null?null:r.verifiedAmount}),
    portfolioDue:r=>r.fechaLimite||r.fechaVencimiento||r.vence||''
  };
}

test('Inicio uses contextual role/readiness/country banner copy, not the old fixed subtitle',()=>{
  assert.match(inicioSource,/const bannerNote=/);
  assert.match(inicioSource,/No fue posible confirmar todas las fuentes de información autorizadas/);
  assert.match(inicioSource,/Consulta las metas individuales disponibles y tus seguimientos autorizados/);
  assert.match(inicioSource,/Revisa metas institucionales, cuando estén configuradas/);
  assert.match(inicioSource,/sub:bannerNote/);
  assert.doesNotMatch(inicioSource,/sub:'Visión general y prioridades'/);
  assert.match(inicioSource,/data-inicio-metric="cobros-confirmados"/);
  assert.match(inicioSource,/splitCountrySummary\('recaudo','Recaudo confirmado del mes'/);
});

test('Prima pendiente resolves only an explicitly selected canonical obligation',()=>{
  const obligation={id:'o1',polizaId:'p1',clienteId:'c1',moneda:'GTQ',fechaLimite:'2026-11-05',verifiedAmount:683.2,overdue:false};
  const {mod,writes}=moduleWith(base,qFor({obligations:[obligation]}));
  const out=mod.resolver('Póliza {poliza} · {monto} · {vence}',base.clientes[0],{plantilla:{id:'pl-prima'},policyId:'p1',itemId:'o1'});
  assert.equal(out,'Póliza P-001 · GTQ 683.20 · 2026-11-05');
  assert.equal(writes(),0);
});

test('Prima pendiente remains unresolved when several obligations exist and none is selected',()=>{
  const obligations=[
    {id:'o1',polizaId:'p1',clienteId:'c1',moneda:'GTQ',fechaLimite:'2026-11-05',verifiedAmount:100,overdue:false},
    {id:'o2',polizaId:'p1',clienteId:'c1',moneda:'GTQ',fechaLimite:'2026-12-05',verifiedAmount:200,overdue:false}
  ];
  const {mod}=moduleWith(base,qFor({obligations}));
  const out=mod.resolver('{monto}|{vence}',base.clientes[0],{plantilla:{id:'pl-prima'},policyId:'p1'});
  assert.equal(out,'{monto}|{vence}');
});

test('Confirmation of payment consumes confirmed-payment read model, never pending portfolio rows',()=>{
  const obligation={id:'o1',polizaId:'p1',clienteId:'c1',moneda:'GTQ',fechaLimite:'2026-11-05',verifiedAmount:999,overdue:true};
  const payment={id:'pay1',polizaId:'p1',clienteId:'c1',moneda:'GTQ',monto:683.2,fechaPago:'2026-10-26'};
  const {mod}=moduleWith(base,qFor({obligations:[obligation],payments:[payment]}));
  const out=mod.resolver('Confirmamos {monto} · {poliza}',base.clientes[0],{plantilla:{id:'pl-pago-ok'},policyId:'p1',itemId:'pay1'});
  assert.equal(out,'Confirmamos GTQ 683.20 · P-001');
  const absent=moduleWith(base,qFor({obligations:[obligation],payments:[]})).mod.resolver('Confirmamos {monto}',base.clientes[0],{plantilla:{id:'pl-pago-ok'},policyId:'p1'});
  assert.equal(absent,'Confirmamos {monto}');
});

test('Currency conflict cannot silently relabel a financial template amount',()=>{
  const payment={id:'pay1',polizaId:'p1',clienteId:'c1',moneda:'COP',monto:683.2,currencyValidation:'REQUIERE_VALIDACION'};
  const {mod}=moduleWith(base,qFor({payments:[payment]}));
  const out=mod.resolver('{monto}',base.clientes[0],{plantilla:{id:'pl-pago-ok'},policyId:'p1',itemId:'pay1'});
  assert.equal(out,'{monto}');
});

test('Multiple policies require explicit policy selection',()=>{
  const data={...base,polizas:[
    base.polizas[0],
    {id:'p2',clienteId:'c1',numero:'P-002',ramo:'Vida',aseguradoraId:'i1',asesorId:'a1',moneda:'GTQ',vigenciaFin:'2027-01-31'}
  ]};
  const {mod}=moduleWith(data,qFor());
  assert.equal(mod.resolver('{poliza}',data.clientes[0],{plantilla:{id:'pl-bienv'}}),'{poliza}');
  assert.equal(mod.resolver('{poliza}',data.clientes[0],{plantilla:{id:'pl-bienv'},policyId:'p2'}),'P-002');
});

test('Renewal date comes from selected policy term, not a pending cobro',()=>{
  const {mod}=moduleWith(base,qFor());
  const out=mod.resolver('{poliza}|{vence}',base.clientes[0],{plantilla:{id:'pl-renov'},policyId:'p1'});
  assert.equal(out,'P-001|2026-12-31');
});

test('Plantillas source exposes explicit selectors and no legacy raw pending Cobros resolver',()=>{
  assert.match(plantillasSource,/data-plantilla-financial-ambiguity/);
  assert.match(plantillasSource,/Póliza<select id="pu-pol"/);
  assert.match(plantillasSource,/id="pu-item"/);
  assert.match(plantillasSource,/cobrosConfirmadosRows/);
  assert.match(plantillasSource,/carteraVencidaDe/);
  assert.match(plantillasSource,/portfolioAmountProof/);
  assert.doesNotMatch(plantillasSource,/S\(\)\.where\('cobros',\s*c\s*=>\s*c\.polizaId/);
});
