'use strict';
// Causal reproduction only: exact checked-out owners; mocked Firebase and DOM.
// No product source rewrite, no network, no real records.
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(process.argv[2] || process.cwd());
const harnessPath = 'tools/gravicentra-b4-003-operational-write-security-regression.test.cjs';
const harnessPrefix = fs.readFileSync(path.join(root,harnessPath),'utf8').split('const cases=')[0];
const serverContext = vm.createContext({ require, console, Buffer, process:{argv:['node','test',path.join(root,'functions')]} });
vm.runInContext(harnessPrefix,serverContext,{filename:'existing-security-harness-env.cjs'});
const makeServer = opts => vm.runInContext('env('+JSON.stringify(opts)+')',serverContext);
const equipoBytes = fs.readFileSync(path.join(root,'orbit360-platform/modules/equipo.js'),'utf8');
const facadeBytes = fs.readFileSync(path.join(root,'orbit360-platform/data/store-firestore-product-operational-p0.js'),'utf8');
function fixture(seed) {
  const e=makeServer({role:'SuperAdmin',scope:'todos',countries:['GT']});
  const col=c=>'tenants/'+e.tenant+'/data/'+c+'/items/';
  if(seed)e.rows.set(col('metas')+seed.id,seed);
  const events=[],calls=[],alerts=[],toasts=[];
  const base={__productReadOnlyP0:true,
    all:c=>[...e.rows].filter(([p])=>p.startsWith(col(c))&&!p.slice(col(c).length).includes('/')).map(([,v])=>JSON.parse(JSON.stringify(v))),
    get:(c,id)=>e.rows.has(col(c)+id)?JSON.parse(JSON.stringify(e.rows.get(col(c)+id))):null,
    _productStatus:()=>({ready:true,status:'ready-read-only',noFallback:true,writeEnabled:false,serverConfirmedCollections:['asesores','metas','auditoria']}),
    _ensureCollections:()=>{},on:()=>()=>{}
  };
  const el=(dataset={})=>({dataset,value:'125',listeners:{},addEventListener(k,fn){this.listeners[k]=fn;}});
  const tabs=['usuarios','metas'].map(t=>el({t})),add=el(),input=el({metaInstitucional:'prima'}),body={innerHTML:''};
  const host={innerHTML:'',querySelector:s=>s==='#eq-add'?add:s==='#eq-body'?body:null,
    querySelectorAll:s=>s==='.tab[data-t]'?tabs:s==='[data-meta-institucional]'?[input]:[]};
  const Orbit={modules:{},store:base,pais:'GT',PAISES:[{id:'GT',label:'Guatemala',moneda:'GTQ'}],
    ui:{NOW:'2026-10-30T12:00:00Z',esc:x=>String(x??''),moneyShort:String,money:String,avatar:()=>'',toast:t=>toasts.push(t),alert:(t,o)=>{alerts.push({text:t,...o});return Promise.resolve();}},
    kit:{banner:()=>'',kpis:()=>''},
    auth:{user:()=>({uid:e.uid}),productUser:{uid:e.uid,tenantId:e.tenant,roles:['SuperAdmin'],activeRole:'SuperAdmin',productReadOnly:true,countries:['GT'],advisorId:e.own}},
    session:{rol:()=>'SuperAdmin'},access:{can:()=>true,canAccessRecord:()=>true},
    productRuntimeBrowserProvidersP0:{browserFirestoreWriteAuthorized:false,serverWriteTransport:'firebase-functions',noFallback:true,
      initialize:async()=>({auth:{currentUser:{uid:e.uid}}}),
      callFunction:async(name,data,region)=>{calls.push({name,data:JSON.parse(JSON.stringify(data)),region});assert.equal(region,'us-east1');return e.mod[name]({auth:{uid:e.uid,token:{email:'qa@example.invalid'}},data});}}
  };
  const context=vm.createContext({Orbit,OrbitBackend:{tenantId:e.tenant},window:{Orbit,dispatchEvent:()=>{}},
    document:{getElementById:s=>s==='eq-body'?body:null,dispatchEvent:()=>{},addEventListener:()=>{}},
    location:{hostname:'ays-orbit-360-lab--gi-i65-b4-sr-41066435386-r09pl1ti.web.app'},
    CustomEvent:class {constructor(type,details){this.type=type;this.details=details;}},setTimeout,clearTimeout,Date,console});
  vm.runInContext(facadeBytes,context,{filename:'store-firestore-product-operational-p0.js'});
  Orbit.productOperationalWriteP0.install(base);
  vm.runInContext(equipoBytes,context,{filename:'equipo.js'});
  Orbit.modules.equipo.render(host);tabs[1].listeners.click();
  return{e,Orbit,calls,alerts,toasts,input,col,change:()=>input.listeners.change()};
}
(async()=>{
  const report=[];
  {
    const x=fixture();await x.change();
    assert.equal(x.calls.length,1);assert.equal(x.calls[0].name,'orbit360ProductOperationalCommandPreview');
    const m=x.calls[0].data.mutations[0];assert.equal(m.id,'meta-equipo-institucional-2026-10-gt-prima');
    assert.equal(m.payload.__syntheticQa,undefined);assert.equal(x.e.writes.length,0);assert.equal(x.toasts.length,0);
    report.push({case:'empty_institutional_goal_ui_write',result:'REPRODUCED_BLOCKED',id:m.id,explicitMarker:false,serverWrites:0,alert:x.alerts[0]?.text});
  }
  {
    const id='b4003qa_goal_contract_seed';
    const x=fixture({id,tenantId:'synthetic-audit',pais:'GT',moneda:'GTQ',mes:'2026-10',periodo:'2026-10',tipo:'prima',valor:7,__syntheticQa:true});
    await x.change();
    assert.equal(x.calls.length,2);assert.equal(x.calls[0].data.mutations[0].payload.__syntheticQa,true);
    assert.equal(x.e.rows.get(x.col('metas')+id).valor,125);
    assert.match(x.calls[1].data.mutations[0].id,/^audit_equipo_/);
    assert.equal(x.calls[1].data.mutations[0].payload.__syntheticQa,undefined);
    assert.equal(x.toasts.length,0);assert.equal(x.alerts[0].title,'No guardado');
    report.push({case:'seeded_synthetic_goal_then_audit',result:'REPRODUCED_PARTIAL_COMMIT_FALSE_FAILURE',goalPersisted:true,auditPersisted:false,auditIdPrefix:'audit_equipo_',uiAlert:x.alerts[0].text});
  }
  {
    const x=fixture({id:'b4003qa_goal_cleanup',tenantId:'synthetic-audit',pais:'GT',mes:'2026-10',tipo:'prima',valor:7,__syntheticQa:true});
    await assert.rejects(x.e.mod.orbit360ProductOperationalCommandPreview(x.e.request([{collection:'metas',action:'remove',id:'b4003qa_goal_cleanup'}])),e=>e.code==='failed-precondition');
    assert.equal(x.e.writes.length,0);
    report.push({case:'synthetic_goal_cleanup',result:'REPRODUCED_REMOVE_BLOCKED',serverWrites:0});
  }
  {
    const x=fixture({id:'meta-real-business',tenantId:'synthetic-audit',pais:'GT',moneda:'GTQ',mes:'2026-10',periodo:'2026-10',tipo:'prima',valor:88});
    await x.change();assert.equal(x.e.writes.length,0);assert.equal(x.e.rows.get(x.col('metas')+'meta-real-business').valor,88);
    report.push({case:'existing_business_goal_protection',result:'REPRODUCED_FAIL_CLOSED',serverWrites:0,businessValueUnchanged:true});
  }
  console.log(JSON.stringify({scope:'EXACT_SOURCE_CAUSAL_REPRODUCTION_ONLY_NOT_UAT_PASS',head:'f67112964ad4e0c94791c7a41218fe926ffaa8ac',cases:report},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});

