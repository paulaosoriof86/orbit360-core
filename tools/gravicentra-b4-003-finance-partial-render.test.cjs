'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const cobros=fs.readFileSync('orbit360-platform/modules/cobros.js','utf8');
const inicio=fs.readFileSync('orbit360-platform/modules/inicio.js','utf8');
const client=fs.readFileSync('orbit360-platform/modules/cliente360.js','utf8');
assert.match(inicio,/denied\.includes\(name\)\|\|failed\.includes\(name\)/,
 'INICIO_TERMINAL_SNAPSHOT_ERROR_MUST_BE_UNAVAILABLE');
assert.match(client,/denied\.includes\(name\) \|\| !!errors\[name\]/,
 'CLIENTE360_TERMINAL_SNAPSHOT_ERROR_MUST_BE_UNAVAILABLE');
function renderCase({financialReady,fail}){
 const confirmed=['clientes','polizas','cobros'];
 if(financialReady)confirmed.push('carteraPrimas','recibosEsperados');
 const snapshotErrors=fail?{carteraPrimas:'DEADLINE_EXCEEDED'}:{};
 const S={_ensureCollections(){},_productStatus:()=>({serverConfirmedCollections:confirmed,deniedCollections:[],snapshotErrors}),
  all:()=>[],get:()=>null};
 const U={esc:x=>String(x??''),money:n=>String(n),moneyShort:n=>String(n),
  finiteNumber:n=>Number(n)||0,text:x=>String(x??''),today:()=>''};
 const K={bannerFor:()=>'',kpis:cards=>cards.map(x=>x.val).join(' / '),
  filterBar:()=>'',asesorOptions:()=>[],wireFilters(){},clienteCell:()=>''};
 const Q={carteraGlobalPorMoneda:()=>({byCurrency:{},currencies:[],porConciliarCount:0,confirmedCount:0,reconciledCount:0}),
 agingVencidoPorMoneda:()=>({country:'TODOS',currencies:[],byCurrency:{}})};
 const Orbit={modules:{},store:S,ui:U,kit:K,q:Q,pais:'TODOS',route:{params:{}},session:{rol:()=>'Dirección'}};
 const host={innerHTML:'',querySelectorAll:()=>[]};
 vm.runInNewContext(cobros,{window:{Orbit},Orbit,document:{getElementById:()=>null},
 location:{hostname:'ays-orbit-360-lab--qa.web.app'},navigator:{},console});
 Orbit.modules.cobros.render(host);
 const readiness=host.innerHTML.match(/data-cobros-financial-readiness="([^"]+)"/)?.[1];
 const count=host.innerHTML.match(/data-cobros-confirmed-count="([^"]*)"/)?.[1];
 assert.ok(host.innerHTML.length>100,'COBROS_MUST_NOT_BE_BLANK');
 return {readiness,count,hasPending:host.innerHTML.includes('Actualizando datos')};
}
const pending=renderCase({financialReady:false,fail:false});
assert.equal(pending.readiness,'pending');assert.equal(pending.count,'');assert.equal(pending.hasPending,true);
const failed=renderCase({financialReady:false,fail:true});
assert.equal(failed.readiness,'unavailable');assert.equal(failed.count,'');assert.equal(failed.hasPending,true);
const ready=renderCase({financialReady:true,fail:false});
assert.equal(ready.readiness,'ready');assert.equal(ready.count,'0');assert.equal(ready.hasPending,false);
console.log('B4_003_FINANCE_PARTIAL_RENDER_QA_PASS 3 states no blank route no false zero; Inicio/Cliente360 terminal error contracts');
