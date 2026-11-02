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

async function roleScopedRoster(role,memberCountries,selectedCountry,expectedCountries){
 const called=[],requested=[],events={};
 let defs=[];
 const h={isConnected:true,innerHTML:'',querySelector(sel){return this.innerHTML.includes(sel.slice(1,-1))?{}:null;}};
 const countries=memberCountries.slice(),recordsByCountry=['GT','CO'].map(country=>({
  id:'qa-'+country,numero:'QA-'+country,clienteId:'qa-client-'+country,
  aseguradoraId:'qa-ins',asesorId:'advisor-'+country,pais:country,moneda:country==='GT'?'GTQ':'COP',
  estado:'Vigente',vigenciaFin:'2026-12-15',primaTotal:100,primaNeta:80,ramo:'Auto'
 }));
 const kit={...K,filterBar:ds=>{defs=ds;return '';}};
 const user={uid:'qa-user-'+role,productReadOnly:true,countries};
 const state={modules:{},ui:U,kit,q:{},pais:selectedCountry,
  auth:{user:()=>user,productUser:user},session:{rol:()=>role},
  access:{tenantId:()=> 'qa-tenant',dataScope:()=>role==='Operativo'?'all':'own',
   activeRole:()=>role,actorAdvisor:()=>({}),actorAdvisorId:()=> 'advisor-GT',assignedRoles:()=>[role]},
  assignableAdvisorRoster:{list:async c=>{
   called.push(c);
   return [{id:'advisor-'+c,nombre:'Asesor '+c}];
  }},
  store:{all:collection=>{
   if(collection==='polizas')return recordsByCountry.filter(p=>countries.includes(p.pais)&&
    (selectedCountry==='TODOS'||p.pais===selectedCountry));
   if(collection==='clientes')return recordsByCountry.filter(p=>countries.includes(p.pais)).map(p=>({id:p.clienteId,pais:p.pais,nombre:'Cliente QA'}));
   if(collection==='aseguradoras')return [{id:'qa-ins',nombre:'Aseguradora QA'}];
   if(collection==='asesores')throw Error('TEAM_DIRECTORY_MUST_NOT_BE_READ_BY_'+role);
   return [];
  },_ensureCollections:cols=>{requested.push(cols);},
   _productStatus:()=>({serverConfirmedCollections:['polizas','clientes']})}
 };
 const doc={addEventListener:(event,fn)=>{events[event]=fn;},getElementById:id=>id==='host'?h:null};
 const win={Orbit:state,addEventListener:(event,fn)=>{events[event]=fn;}};
 vm.runInNewContext(source,{Orbit:state,window:win,document:doc,setTimeout,clearTimeout},
  {filename:'polizas.js',timeout:3000});
 state.modules.polizas.render(h);
 assert.ok(requested.some(cols=>cols.includes('polizas')&&cols.includes('clientes')&&!cols.includes('asesores')),
  'restricted role must never request admin Team collection');
 for(let attempt=0;attempt<8;attempt++)await Promise.resolve();
 assert.deepEqual(called.sort(),expectedCountries.slice().sort(),
  role+' must request roster for exactly the membership-authorized selected countries');
 if(expectedCountries.length){
  assert.equal(defs.find(d=>d.id==='fase').options.length,expectedCountries.length);
  for(const c of expectedCountries)assert.match(h.innerHTML,new RegExp('Asesor '+c));
  assert.doesNotMatch(h.innerHTML,/Confirmando asesor…/);
 }else assert.match(h.innerHTML,/data-polizas-advisor-readiness="blocked"/);
}
Promise.resolve().then(async()=>{
 await roleScopedRoster('Operativo',['GT','CO'],'TODOS',['GT','CO']);
 await roleScopedRoster('Operativo',['GT'],'TODOS',['GT']);
 await roleScopedRoster('Operativo',['GT','CO'],'CO',['CO']);
 await roleScopedRoster('Asesor',['GT'],'GT',['GT']);
 await roleScopedRoster('Operativo',[],'TODOS',[]);
 console.log('B4_003_POLIZAS_ADVISOR_HYDRATION=PASS directEntry=PASS advisorEventRefresh=PASS operativoGTCO=PASS rosterMinimal=PASS noUnauthorizedCountryCalls=PASS restrictedTeamDirectory=DENIED firestoreWrites=0');
}).catch(error=>{console.error(error);process.exitCode=1;});
