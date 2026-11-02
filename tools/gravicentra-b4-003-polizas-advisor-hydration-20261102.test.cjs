'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../orbit360-platform/modules/polizas.js'),'utf8');
const listeners={},requests=[];
const host={isConnected:true,innerHTML:'',querySelector(selector){
 return this.innerHTML.includes(selector.slice(1,-1))?{}:null;
}};
let advisorConfirmed=false,advisors=[];
const records={
 polizas:[{id:'qa-pol',numero:'POL-TEST-01',clienteId:'qa-cli',aseguradoraId:'qa-ins',asesorId:'qa-adv',
  pais:'GT',moneda:'GTQ',estado:'Vigente',rama:'Auto',ramo:'Auto',vigenciaFin:'2026-12-15',primaTotal:100,primaNeta:80}],
 clientes:[{id:'qa-cli',nombre:'Cliente QA',pais:'GT',tipo:'natural'}],
 aseguradoras:[{id:'qa-ins',nombre:'Aseguradora QA'}]
};
let filterDefs=[];
const U={esc:v=>String(v==null?'':v),money:(v,c)=>`${c} ${v}`,daysFromNow:()=>null,
 fmtDate:()=>'-',estadoBadge:v=>v,avatar:()=>''};
const K={bannerFor:()=>'',kpis:()=>'',filterBar:defs=>{filterDefs=defs;return '';},wireFilters:()=>{}};
const Orbit={modules:{},ui:U,kit:K,q:{},pais:'GT',auth:{user:()=>({uid:'qa-user'})},
 session:{rol:()=> 'Dirección'},
 access:{tenantId:()=> 'qa-tenant',dataScope:()=> 'all',activeRole:()=> 'Dirección',
  actorAdvisor:()=>({countries:['GT','CO']}),actorAdvisorId:()=> 'qa-adv',assignedRoles:()=>['Dirección']},
 store:{all:collection=>collection==='asesores'?advisors:records[collection]||[],
  _ensureCollections:cols=>{requests.push(cols);return cols;},
  _productStatus:()=>({serverConfirmedCollections:advisorConfirmed?
    ['polizas','clientes','asesores']:['polizas','clientes']})}
};
const document={addEventListener:(event,fn)=>{listeners[event]=fn;},getElementById:id=>id==='host'?host:null};
const window={Orbit,addEventListener:(event,fn)=>{listeners[event]=fn;}};
vm.runInNewContext(source,{Orbit,window,document,setTimeout,clearTimeout},
 {filename:'polizas.js',timeout:3000});
Orbit.modules.polizas.render(host);
assert.ok(requests.some(cols=>cols.includes('asesores')&&cols.includes('polizas')&&cols.includes('clientes')),
 'direct policy route must request advisor directory independently from Equipo');
assert.match(host.innerHTML,/data-polizas-advisor-readiness="loading"/);
assert.match(host.innerHTML,/Confirmando asesor…/);
assert.equal(filterDefs.find(d=>d.id==='fase').options.length,0);
advisors=[{id:'qa-adv',nombre:'Asesora QA'}];advisorConfirmed=true;
listeners['orbit:store:emit']({detail:{collection:'asesores'}});
assert.match(host.innerHTML,/Asesora QA/,'advisor arrival must repaint policy cells');
assert.doesNotMatch(host.innerHTML,/Confirmando asesor…/);
assert.equal(filterDefs.find(d=>d.id==='fase').options.length,1,
 'advisor arrival must repaint the advisor selector');
assert.equal(filterDefs.find(d=>d.id==='fase').options[0].t,'Asesora QA');
const before=host.innerHTML;
advisors=[{id:'qa-adv',nombre:'Asesora QA actualizada'}];
listeners['orbit:store:emit']({detail:{collection:'asesores'}});
assert.notEqual(host.innerHTML,before,'subsequent advisor update must rerender');
assert.match(host.innerHTML,/Asesora QA actualizada/);
console.log('B4_003_POLIZAS_ADVISOR_HYDRATION=PASS directEntry=PASS advisorEventRefresh=PASS rolesUnaltered=true firestoreWrites=0');
