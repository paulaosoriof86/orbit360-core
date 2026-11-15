'use strict';
// Synthetic in-memory authority/financial regression. No Firebase or real writes.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {readScopedRelatedDocument,readScopedRelatedList}=require('../functions/b4-003-scoped-related-reader');
const {Denied}=require('../functions/b4-003-scoped-access-boundary');
const copy=x=>JSON.parse(JSON.stringify(x));
const tenantId='ownership-memory-test';

function server(options={}){
  const role=options.role||'Dirección',scope=options.scope||'all',advisor=options.advisor||'old-advisor';
  const member={uid:'actor',tenantId,status:'active',roles:[role],advisorId:advisor,
    countries:['GT'],modulesExtra:['comisiones','conciliaciones'],
    teamAdvisorIds:options.team||[],dataScopes:{default:scope}};
  const config={roleScopes:{[role]:scope}};
  const common={tenantId,pais:'GT',moneda:'GTQ'};
  const docs={
    clientes:{client:{...common,id:'client',asesorId:'new-advisor'}},
    polizas:{policy:{...common,id:'policy',clienteId:'client',asesorId:'new-advisor'}},
    comisiones:{commission:{...common,id:'commission',clienteId:'client',polizaId:'policy',
      asesorId:'old-advisor',monto:100,montoAsesor:70,pctAsesor:70,estado:'Liquidada',
      periodo:'2026-09',source:{fileId:'memory-source',lineId:'row-1'}}},
    finmovs:{payable:{...common,id:'payable',clienteId:'client',polizaId:'policy',
      asesorId:'old-advisor',valor:70,pagado:70,pendiente:0,estado:'pagado'}},
    cobros:{payment:{...common,id:'payment',clienteId:'client',polizaId:'policy',
      asesorId:'old-advisor',monto:600,estado:'Pagado',fechaPago:'2026-09-15'}}
  };
  const snap=(id,row)=>({id,exists:!!row,data:()=>row});
  function query(collection,after='',limit=3000){
    return {
      doc:id=>({get:async()=>snap(id,(docs[collection]||{})[id])}),
      orderBy:()=>query(collection,after,limit),
      startAfter:row=>query(collection,row.id,limit),
      limit:n=>query(collection,after,n),
      get:async()=>({docs:Object.entries(docs[collection]||{}).sort(([a],[b])=>a.localeCompare(b))
        .filter(([id])=>id>after).slice(0,limit).map(([id,row])=>snap(id,row))})
    };
  }
  const tenant={collection:name=>{
    if(name==='members')return {doc:()=>({get:async()=>snap('actor',member)})};
    if(name==='config')return {doc:()=>({get:async()=>snap('access',config)})};
    if(name==='data')return {doc:collection=>({collection:()=>query(collection)})};
    throw Error('UNEXPECTED_COLLECTION:'+name);
  }};
  const db={collection:name=>{assert.equal(name,'tenants');return {doc:id=>{assert.equal(id,tenantId);return tenant;}};}};
  const request=collection=>({tenantId,activeRole:role,country:'GT',collection});
  return {docs,member,config,
    list:collection=>readScopedRelatedList({db,auth:{uid:'actor'},request:{...request(collection),pageSize:200}}),
    read:(collection,id)=>readScopedRelatedDocument({db,auth:{uid:'actor'},request:{...request(collection),documentId:id}})
  };
}

test('Dirección: comisión y CxP conservan beneficiario histórico tras reasignar póliza',async()=>{
  const env=server(),before=copy(env.docs);
  const list=await env.list('comisiones'),row=(await env.read('comisiones','commission')).row;
  assert.equal(list.anchoring,'verified_financial_beneficiary_and_canonical_parent');
  assert.equal(row.asesorId,'old-advisor');
  assert.equal(row.beneficiaryAdvisorId,'old-advisor');
  assert.equal(row.currentPolicyAdvisorId,'new-advisor');
  assert.equal(row.montoAsesor,70);
  assert.equal((await env.list('finmovs')).rows[0].asesorId,'old-advisor');
  assert.equal((await env.list('cobros')).rows[0].asesorId,'new-advisor');
  assert.deepEqual(env.docs,before,'All persisted historical records remain byte-equivalent');
});

test('Own: beneficiario anterior retiene su comisión y CxP sin conocer asesor actual',async()=>{
  const env=server({role:'Asesor',scope:'own',advisor:'old-advisor'});
  env.docs.comisiones.commission.currentPolicyAdvisorId='forged-context';
  const list=await env.list('comisiones'),document=await env.read('comisiones','commission');
  assert.equal(list.rows.length,1);
  assert.equal(document.row.asesorId,'old-advisor');
  assert.equal('currentPolicyAdvisorId' in document.row,false);
  assert.equal('currentPolicyAdvisorId' in list.rows[0],false);
  assert.equal((await env.list('finmovs')).rows.length,1);
  assert.equal((await env.list('cobros')).rows.length,0,'Operational policy scope remains current');
});

test('Own: nuevo asesor no recibe comisión ni CxP histórica por asumir la póliza',async()=>{
  const env=server({role:'Asesor',scope:'own',advisor:'new-advisor'});
  assert.equal((await env.list('comisiones')).rows.length,0);
  assert.equal((await env.list('finmovs')).rows.length,0);
  for(const [collection,id] of [['comisiones','commission'],['finmovs','payable']])
    await assert.rejects(env.read(collection,id),e=>e instanceof Denied&&e.code==='RECORD_NOT_FOUND_OR_DENIED');
  assert.equal((await env.list('cobros')).rows.length,1,'Current operational policy remains visible');
});

test('Team: alcance financiero sigue equipo del beneficiario, sin ampliación por póliza',async()=>{
  for(const [team,count] of [[['old-advisor'],1],[['new-advisor'],0]]){
    const env=server({role:'Marketing',scope:'team',advisor:'team-manager',team});
    const result=await env.list('comisiones');
    assert.equal(result.rows.length,count);
    if(count)assert.equal('currentPolicyAdvisorId' in result.rows[0],false);
  }
});

test('Denegación de módulo prevalece sobre beneficiario propio',async()=>{
  const env=server({role:'Asesor',scope:'own'});
  env.member.modulesRestricted=['comisiones'];
  await assert.rejects(env.list('comisiones'),e=>e instanceof Denied&&e.code==='MODULE_DENIED');
});

const invalidCases=[
  ['beneficiario ausente',d=>{delete d.comisiones.commission.asesorId;}],
  ['aliases de beneficiario contradictorios',d=>{d.comisiones.commission.advisorId='new-advisor';}],
  ['tenant de comisión ajeno',d=>{d.comisiones.commission.tenantId='foreign';}],
  ['tenant de póliza ajeno',d=>{d.polizas.policy.tenantId='foreign';}],
  ['tenant de cliente ajeno',d=>{d.clientes.client.tenantId='foreign';}],
  ['país de comisión ajeno',d=>{d.comisiones.commission.pais='CO';}],
  ['alias de país contradictorio',d=>{d.comisiones.commission.country='CO';}],
  ['país de póliza ausente',d=>{delete d.polizas.policy.pais;}],
  ['país de póliza ajeno',d=>{d.polizas.policy.pais='CO';}],
  ['alias de país de póliza contradictorio',d=>{d.polizas.policy.country='CO';}],
  ['póliza ausente',d=>{delete d.polizas.policy;}],
  ['cliente ausente',d=>{delete d.clientes.client;}],
  ['relación cliente contradictoria',d=>{d.comisiones.commission.clienteId='other-client';}],
  ['alias de póliza contradictorio',d=>{d.comisiones.commission.policyId='other-policy';}],
  ['alias de cliente contradictorio',d=>{d.comisiones.commission.clientId='other-client';}],
  ['ID físico de comisión contradictorio',d=>{d.comisiones.commission.id='other-commission';}],
  ['ID físico de póliza contradictorio',d=>{d.polizas.policy.id='other-policy';}],
  ['ID físico de cliente contradictorio',d=>{d.clientes.client.id='other-client';}]
];
for(const [label,change] of invalidCases)test('Fail closed en lista y documento: '+label,async()=>{
  const env=server();change(env.docs);const before=copy(env.docs);
  assert.equal((await env.list('comisiones')).rows.length,0);
  await assert.rejects(env.read('comisiones','commission'),e=>e instanceof Denied&&e.code==='RECORD_NOT_FOUND_OR_DENIED');
  assert.deepEqual(env.docs,before);
});

test('Alias histórico explícito y relación solo cliente preservan beneficiario sin inferirlo',async()=>{
  const env=server({role:'Asesor',scope:'own'}),row=env.docs.comisiones.commission;
  delete row.asesorId;row.advisorId='old-advisor';delete row.polizaId;
  const result=await env.read('comisiones','commission');
  assert.equal(result.row.asesorId,'old-advisor');
  assert.equal(result.row.beneficiaryAdvisorId,'old-advisor');
  assert.equal('currentPolicyAdvisorId' in result.row,false);
});

function queries(){
  const rows={
    clientes:[{id:'client',pais:'GT'}],
    polizas:[{id:'policy',clienteId:'client',pais:'GT',moneda:'GTQ',asesorId:'old-advisor'}],
    cobros:[{id:'payment',reciboId:'receipt',clienteId:'client',polizaId:'policy',pais:'GT',moneda:'GTQ',
      asesorId:'old-advisor',monto:600,estado:'Pagado',fechaPago:'2026-09-15'}],
    recibosEsperados:[{id:'receipt',clienteId:'client',polizaId:'policy',pais:'GT',moneda:'GTQ',
      asesorId:'old-advisor',primaTotal:600,estado:'Pagado',fechaPago:'2026-09-15'}],
    comisiones:[{id:'commission',asesorId:'old-advisor',monto:100,montoAsesor:70}],
    finmovs:[{id:'payable',asesorId:'old-advisor',valor:70,pagado:70,pendiente:0}]
  };
  const Orbit={pais:'GT',ui:{finiteNumber:v=>Number.isFinite(Number(v))?Number(v):null},
    store:{all:name=>rows[name]||[],get:(name,id)=>(rows[name]||[]).find(row=>row.id===id)||null,
      where:(name,fn)=>(rows[name]||[]).filter(fn)}};
  const ctx=vm.createContext({window:{Orbit},Orbit,console,Date,Map,Set});
  vm.runInContext(fs.readFileSync('orbit360-platform/core/queries.js','utf8'),ctx,{filename:'queries.js'});
  return {rows,Orbit,total:advisor=>Number(Orbit.q.recaudoMesPorMoneda('2026-09',advisor).GTQ||0)};
}

test('Recaudo 600 y CxP 70: responsabilidad actual cambia antes de recargar sin mover historia',()=>{
  const env=queries(),before=copy(env.rows);
  assert.equal(env.total(),600,'Paid receipt and linked payment count only once');
  assert.equal(env.total('old-advisor'),600);
  assert.equal(env.total('new-advisor'),0);
  env.rows.polizas[0].asesorId='new-advisor';
  assert.equal(env.rows.cobros[0].asesorId,'old-advisor','Child projection still cached');
  assert.equal(env.total('old-advisor'),0);
  assert.equal(env.total('new-advisor'),600,'No temporary missing KPI while child is stale');
  assert.equal(env.total(),600);
  env.rows.cobros[0].asesorId='new-advisor';
  env.rows.recibosEsperados[0].asesorId='new-advisor';
  assert.equal(env.total('new-advisor'),600,'Server read projection after reload agrees');
  assert.equal(env.total('old-advisor'),0);
  assert.deepEqual(env.rows.comisiones,before.comisiones);
  assert.deepEqual(env.rows.finmovs,before.finmovs);
});

test('Recaudo por recibo confirmado sin cobro usa también responsable actual sin duplicar',()=>{
  const env=queries();env.rows.cobros=[];env.rows.polizas[0].asesorId='new-advisor';
  assert.equal(env.total('new-advisor'),600);
  assert.equal(env.total('old-advisor'),0);
  assert.equal(env.total(),600);
});

for(const [label,change] of [
  ['póliza ausente',e=>{e.rows.polizas=[];}],
  ['cliente ausente',e=>{e.rows.clientes=[];}],
  ['relación distinta',e=>{e.rows.cobros[0].clienteId='other';e.rows.recibosEsperados=[];}],
  ['país de hijo ajeno',e=>{e.rows.cobros[0].pais='CO';e.rows.recibosEsperados=[];}],
  ['país filtrado',e=>{e.Orbit.pais='CO';}],
  ['responsable ausente',e=>{delete e.rows.polizas[0].asesorId;}],
  ['sintético no comercial',e=>{e.rows.polizas[0].__syntheticQa=true;}],
  ['reporte sin aplicación',e=>{e.rows.cobros[0].paymentState='PAID_REPORTED';e.rows.recibosEsperados=[];}]
])test('Recaudo personal conserva exclusión por '+label,()=>{
  const env=queries();change(env);assert.equal(env.total('old-advisor'),0);
});
