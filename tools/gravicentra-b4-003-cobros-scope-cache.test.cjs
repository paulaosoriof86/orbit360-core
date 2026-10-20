'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const old=execFileSync('git',['show','ceb666bc1016c5365e420ad6791f112a947966a4'],{encoding:'utf8'});
const now=fs.readFileSync('orbit360-platform/modules/cobros.js','utf8');
function check(src,anonymous=false){
 let role='Dirección',uid=anonymous?'':'dir-user',tid='tenant-A',calls=0,onFilter;
 const host={innerHTML:'',querySelectorAll:()=>[]};
 const U={esc:x=>String(x??''),money:n=>String(n),moneyShort:n=>String(n),finiteNumber:n=>Number(n)||0,text:x=>String(x??''),fmtDate:x=>String(x??''),today:()=>''};
 const K={bannerFor:()=>'',kpis:xs=>xs.map(x=>x.val).join(' | '),filterBar:()=>'',asesorOptions:()=>[],wireFilters:(d,s,fn)=>{onFilter=fn;},clienteCell:()=>''};
 const store={_ensureCollections(){},_productStatus:()=>({serverConfirmedCollections:['clientes','polizas','cobros','recibosEsperados','carteraPrimas'],deniedCollections:[],snapshotErrors:{}}),all:()=>[],get:()=>null};
 const q={carteraGlobalPorMoneda(){calls++;return{byCurrency:{COP:{alDia:1,pend:0,venc:0,porConciliar:0}},currencies:['COP'],confirmedCount:role==='Dirección'?101:7,porConciliarCount:0,reconciledCount:0};},agingVencidoPorMoneda(){return{country:'CO',currencies:[],byCurrency:{}};}};
 const Orbit={modules:{},store,ui:U,kit:K,q,pais:'CO',auth:{productUser:{uid,tenantId:tid},user(){return this.productUser;}},session:{rol:()=>role,asesorId:()=>uid},tenant:{get:()=>({tenantId:tid})},route:{params:{}}};
 const ctx={window:{Orbit},Orbit,document:{getElementById:()=>null},location:{hostname:'localhost'},navigator:{},console:{log(){},error(){}},setTimeout(){},clearTimeout(){}};
 vm.runInNewContext(src,ctx,{filename:'cobros.js'});
 function snap(){return{count:Number(host.innerHTML.match(/data-cobros-confirmed-count="([^"]+)"/)?.[1]),calls};}
 Orbit.modules.cobros.render(host);const start=snap();
 role='Asesor';uid=anonymous?'':'advisor-user';Orbit.auth.productUser={uid,tenantId:tid};onFilter('fase',false);const roleSwitch=snap();
 onFilter('fase',false);const same=snap();
 uid=anonymous?'':'advisor-next';Orbit.auth.productUser={uid,tenantId:tid};onFilter('fase',false);const userSwitch=snap();
 tid='tenant-B';Orbit.auth.productUser={uid,tenantId:tid};onFilter('fase',false);const tenantSwitch=snap();
 Orbit.pais='GT';onFilter('fase',false);const countrySwitch=snap();
 return{start,roleSwitch,same,userSwitch,tenantSwitch,countrySwitch};
}
const vulnerable=check(old),fixed=check(now),missingUid=check(now,true);
assert.equal(vulnerable.start.count,101);
assert.equal(vulnerable.roleSwitch.count,101,'EXPECTED_BASELINE_SCOPE_CACHE_DEFECT');
assert.equal(vulnerable.roleSwitch.calls,1);
assert.equal(fixed.start.count,101);
assert.equal(fixed.roleSwitch.count,7,'FINANCE_CACHE_MUST_NOT_LEAK_OLD_ROLE_COUNT');
assert.equal(fixed.roleSwitch.calls,2);
assert.equal(fixed.same.calls,2,'SAME_SCOPE_FILTER_REUSE_REQUIRED');
assert.equal(fixed.userSwitch.calls,3,'UID_SWITCH_CACHE_INVALIDATION');
assert.equal(fixed.tenantSwitch.calls,4,'TENANT_SWITCH_CACHE_INVALIDATION');
assert.equal(fixed.countrySwitch.calls,5,'COUNTRY_SWITCH_CACHE_INVALIDATION');
assert.equal(missingUid.same.calls,3,'MISSING_UID_MUST_DISABLE_CACHE_REUSE');
assert.equal(missingUid.tenantSwitch.calls,5);
console.log('GI_B4_003_COBROS_SCOPE_CACHE_CAUSAL_QA_PASS',JSON.stringify({vulnerable,fixed,missingUidQueries:missingUid.tenantSwitch.calls,operationalWrites:0}));
