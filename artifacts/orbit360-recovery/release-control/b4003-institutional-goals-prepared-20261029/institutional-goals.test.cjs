'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const equipo=fs.readFileSync('orbit360-platform/modules/equipo.js','utf8');

function load(role='Dirección',canEdit=true){
  const rows=[
    {id:'g-global-prima',pais:'GT',mes:'2026-10',periodo:'2026-10',tipo:'prima',valor:1200},
    {id:'g-global-recaudo',pais:'GT',mes:'2026-10',periodo:'2026-10',tipo:'recaudo',valor:900},
    {id:'g-individual',asesorId:'a1',pais:'GT',mes:'2026-10',periodo:'2026-10',tipo:'recaudo',valor:100}
  ];
  const store={all:c=>c==='metas'?rows.slice():c==='asesores'?[]:[],get:()=>null,_productStatus:()=>({}),_ensureCollections:()=>{},on:()=>()=>{}};
  const Orbit={modules:{},ui:{NOW:'2026-10-29T12:00:00Z',esc:v=>String(v??''),money:()=>'',moneyShort:()=>'',avatar:()=>'',toast:()=>{}},
    kit:{banner:()=>'',kpis:()=>''},store,session:{rol:()=>role},auth:{productUser:{activeRole:role}},
    access:{can:(m,a)=>m==='equipo'&&a==='edit'&&canEdit},PAISES:[{id:'GT',label:'Guatemala',moneda:'GTQ'}],pais:'GT'};
  const context={window:{Orbit},Orbit,document:{getElementById:()=>null,addEventListener:()=>{}},setTimeout,clearTimeout,Date,console};
  vm.runInNewContext(equipo,context,{filename:'equipo.js'});
  return context.Orbit.modules.equipo;
}

let checks=0;
const m=load();
assert.deepEqual(JSON.parse(JSON.stringify(m.metaInstitucionalDe('2026-10','GT'))),{
  prima:1200,recaudo:900,explicitPrima:true,explicitRecaudo:true,pais:'GT',moneda:'GTQ',periodo:'2026-10'
}); checks++;
assert.equal(m.puedeEditarMetaInstitucional(),true); checks++;
assert.equal(load('Asesor',true).puedeEditarMetaInstitucional(),false); checks++;
assert.equal(load('Operativo',true).puedeEditarMetaInstitucional(),false); checks++;
assert.equal(load('Dirección',false).puedeEditarMetaInstitucional(),false); checks++;
assert.match(equipo,/data-meta-institucional="prima"/); checks++;
assert.match(equipo,/data-meta-institucional="recaudo"/); checks++;
assert.match(equipo,/await setMeta\('',metaPeriodo,metaPais,campo,inp\.value\)/); checks++;
assert.match(equipo,/audit\('editar_meta_institucional'/); checks++;
assert.match(equipo,/canonicalReadback!==true/); checks++;
assert.match(equipo,/if\(String\(aseId\|\|''\)\.trim\(\)\)patch\.asesorId=aseId/); checks++;
assert.match(equipo,/owner=String\(aseId\|\|''\)\.trim\(\)\?slug\(aseId\):'institucional'/); checks++;
assert.match(equipo,/Objetivo global del tenant; no sustituye ni oculta las metas individuales/); checks++;
assert.match(equipo,/\['Dirección','SuperAdmin','AdminTenant','Admin'\]/); checks++;
assert.doesNotMatch(equipo,/freelancerContract|esFreelancer|tipoContrato/); checks++;
console.log('B4_003_INSTITUTIONAL_GOALS_LOCAL_QA_PASS checks='+checks+' no_firestore no_business_writes freelancer_contract_unchanged');
