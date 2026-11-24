'use strict';
// Executes the real lifecycle, two public entrypoints, renewal form and issuance
// owner with synthetic in-memory transport. No Firebase, network or real data.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=process.env.GI_RENEWAL_SOURCE_ROOT||path.resolve(__dirname,'..');
const source=p=>fs.readFileSync(path.join(root,'orbit360-platform',p),'utf8');
const fixed=Date.parse('2026-11-24T12:00:00Z');
class FixedDate extends Date{constructor(...a){super(...(a.length?a:[fixed]));}static now(){return fixed;}}
const clone=x=>JSON.parse(JSON.stringify(x));

function setup({role='Operativo',country='GT',policy={},existing=false,entitled=true}={}){
  const db={clientes:[{id:'fixture-client',nombre:'Cliente local',pais:country,documentos:[]}],
    polizas:[{id:'fixture-policy',numero:'FIXTURE-EXISTING-2026',tenantId:'fixture-tenant',clienteId:'fixture-client',asesorId:'fixture-advisor',
      aseguradoraId:'fixture-insurer',pais:country,moneda:country==='GT'?'GTQ':'COP',ramo:'Autos',producto:'Cobertura existente',
      vigenciaInicio:'2025-11-21',vigenciaFin:'2026-11-21',estado:'Vigente',renovable:null,placa:'FIX001',
      frecuencia:'Trimestral',cuotas:4,formaPago:'Transferencia',conducto:'Aseguradora',primaNeta:1000,gastosEmision:50,gastosFinan:20,otros:5,ivaPct:12,...policy}],
    aseguradoras:[{id:'fixture-insurer',nombre:'Aseguradora local',pais:country},{id:'fixture-other-insurer',nombre:'Otra local',pais:country}],
    gestiones:[],vehiculos:[],actividades:[]};
  if(existing)db.gestiones.push({id:'fixture-existing-management',polizaId:'fixture-policy',sourcePolicyId:'fixture-policy',clienteId:'fixture-client',
    workflowType:'renewal_accepted',acceptedConfirmed:true,estado:'Pendiente',pais:country});
  const nodes=new Map(),toasts=[],managementForms=[],writes=[],policyCalls=[],openedPolicies=[];
  let activeRole=role,canEdit=entitled,canView=true,pending=null,failManagement=false,omitReadback=false;
  function element(tag='div'){
    const children=new Map(),events={};
    const node={tag,id:'',style:{},dataset:{},innerHTML:'',textContent:'',value:'',checked:false,disabled:false,readOnly:false,files:[],removed:false,
      addEventListener(name,fn){events[name]=fn;},dispatch(name){return events[name]?.({target:this,preventDefault(){},stopPropagation(){}});},
      appendChild(child){if(child.id)nodes.set(child.id,child);return child;},
      remove(){this.removed=true;nodes.delete(this.id);},classList:{add(){},remove(){}},
      querySelector(selector){
        if(children.has(selector))return children.get(selector);
        const key=selector.startsWith('#')?'id="'+selector.slice(1)+'"':selector.startsWith('[')?selector.slice(1,-1):null;
        if(!key)return null;
        const match=this.innerHTML.match(new RegExp('<([\\w-]+)\\b([^>]*\\b'+key+'[^>]*)>([\\s\\S]*?)</\\1>|<([\\w-]+)\\b([^>]*\\b'+key+'[^>]*)>'));
        if(!match)return null;
        const child=element(match[1]||match[4]),attrs=match[2]||match[5]||'',body=match[3]||'';
        child.id=(attrs.match(/\bid="([^"]*)"/)||[])[1]||'';
        child.value=(attrs.match(/\bvalue="([^"]*)"/)||[])[1]||'';
        child.innerHTML=body;child.textContent=body.replace(/<[^>]*>/g,'');
        child.checked=/\bchecked(?:\s|=|$)/.test(attrs);child.disabled=/\bdisabled(?:\s|=|$)/.test(attrs);child.readOnly=/\breadonly(?:\s|=|$)/.test(attrs);
        if(child.tag==='textarea')child.value=body;
        if(child.tag==='select'){
          const options=[...body.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)],selected=options.find(o=>/\bselected\b/.test(o[1]))||options[0];
          child.value=selected?((selected[1].match(/\bvalue="([^"]*)"/)||[])[1]??selected[2]):'';
        }
        children.set(selector,child);return child;
      },
      querySelectorAll(selector){const child=this.querySelector(selector);return child?[child]:[];}
    };return node;
  }
  const document={createElement:element,getElementById:id=>nodes.get(id)||null,body:element('body'),addEventListener(){}};
  const store={all:c=>db[c]||[],get:(c,id)=>(db[c]||[]).find(r=>r.id===id)||null,
    where:(c,p)=>(db[c]||[]).filter(p),
    insert(c,row){db[c]??=[];db[c].push(clone(row));writes.push({action:'insert',collection:c,id:row.id});return row;},
    async updateDurable(c,id,patch){Object.assign(store.get(c,id),clone(patch));writes.push({action:'update',collection:c,id});return store.get(c,id);}};
  const Orbit={store,pais:country,modules:{},auth:{productUser:{uid:'fixture-user'}},session:{rol:()=>activeRole},
    ui:{esc:x=>String(x??''),today:()=> '2026-11-24',toast:x=>toasts.push(x),
      daysFromNow:d=>d?Math.ceil((Date.parse(d+'T00:00:00Z')-Date.parse('2026-11-24T00:00:00Z'))/86400000):null},
    q:{isSyntheticQaRecord:()=>false},kit:{},
    access:{can:()=>canEdit,canView:()=>canView,esAsesor:()=>activeRole==='Asesor',activeRole:()=>activeRole,actorAdvisor:()=>({}),
      norm:x=>String(x||'').toLowerCase(),filter:(_c,rows)=>rows},
    cat:{ensure:async()=>true},endorsements:{},
    primas:{cuotasDe:f=>({Contado:1,Semestral:2,Trimestral:4,Mensual:12}[f]||1),desglose:net=>({total:net}),cfgPais:()=>({iva:12})},
    ciclo:{managementCreateModal:options=>{managementForms.push(options);return options;},
      async crearGestionDurable(row){writes.push({action:'create_management',collection:'gestiones',id:row.id});if(pending)await pending;
        if(failManagement)throw Error('SYNTHETIC_DURABLE_REJECTION');
        if(!omitReadback&&!store.get('gestiones',row.id))db.gestiones.push(clone(row));return clone(row);}},
    policyReceipts:{async createPolicy(row){policyCalls.push(clone(row));const saved={...clone(row),id:'fixture-successor'};db.polizas.push(saved);return {ok:true,policy:saved,receipts:[]};}}
  };
  const ctx={Orbit,document,Date:FixedDate,console,location:{hash:'#/renovaciones',hostname:'local.fixture'},setTimeout,clearTimeout,setInterval,clearInterval,addEventListener(){}};
  ctx.window=ctx;vm.createContext(ctx);
  for(const file of ['core/issuance-workflow-v1201.js','modules/cliente360.js','modules/renovaciones.js',
    'modules/renewals-v1200-operational-bridge.js','modules/renewals-v1200-permission-guard.js',
    'modules/issuance-endosos-v1201-bridge.js','modules/renewals-v1201-issued-filter.js'])vm.runInContext(source(file),ctx,{filename:file});
  Orbit.modules.cliente360.verPoliza=id=>openedPolicies.push(id);
  return {Orbit,ctx,db,nodes,toasts,managementForms,writes,policyCalls,openedPolicies,
    setRole:r=>activeRole=r,setEntitled:v=>canEdit=v,setScope:v=>canView=v,
    setPending:p=>pending=p,failManagement:v=>failManagement=v,omitReadback:v=>omitReadback=v};
}
function enter(h,entry){return entry==='Cliente360'?h.Orbit.modules.cliente360.renovar('fixture-policy'):h.Orbit.modules.renovaciones.registrarAceptacion('fixture-policy');}
function openFirm(h,entry){enter(h,entry);const choice=h.nodes.get('renewal-decision-v1200');assert.ok(choice,'both entries must offer the authorized choice before an Ops detour');choice.querySelector('[data-direct]').onclick();
  const form=h.nodes.get('ops-direct-renewal-v1201');assert.ok(form,'firm choice must immediately open the existing policy form');assert.equal(h.nodes.has('renewal-direct-approval-v1201'),false,'no intermediate approval dialog');return form;}
function complete(form){form.querySelector('#rend-approval-confirm').checked=true;form.querySelector('#rend-approval-note').value='Autorización sintética local';form.querySelector('#rend-doc').value='drive:synthetic-issued-reference';}

for(const entry of ['Renovaciones','Cliente360'])for(const role of ['Operativo','Dirección','Admin','AdminTenant','SuperAdmin']){
  test(entry+' / '+role+': expired UNKNOWN opens same inherited editable draft without Ops or writes',()=>{
    const h=setup({role}),before=clone(h.db.polizas[0]);assert.equal(h.Orbit.renewalLifecycle.evaluate(h.db.polizas[0]).reason,'RENOVABILIDAD_SIN_CONFIRMAR');
    const form=openFirm(h,entry);assert.equal(h.managementForms.length,0);assert.equal(h.writes.length,0);
    for(const [id,value]of Object.entries({'rend-num':before.numero,'rend-asg':before.aseguradoraId,'rend-start':'2026-11-21','rend-end':'2027-11-21',
      'rend-prod':before.producto,'rend-freq':before.frecuencia,'rend-payments':'4','rend-form':before.formaPago,'rend-conduct':before.conducto,'rend-net':'1000','rend-gem':'50','rend-gfin':'20','rend-other':'5','rend-iva':'12'})){
      const field=form.querySelector('#'+id);assert.ok(field,id);assert.equal(field.value,value,id);assert.equal(field.disabled,false,id);assert.equal(field.readOnly,false,id);
    }
    assert.deepEqual(h.db.polizas[0],before);assert.equal(h.ctx.location.hash,'#/renovaciones');form.querySelector('[data-close]').onclick();assert.equal(h.writes.length,0);
  });
}
test('Confirmed-renewable source also enters the same form immediately; existing approval is reused',()=>{
  for(const existing of [false,true]){const h=setup({policy:{renovable:true},existing});const form=openFirm(h,'Renovaciones');assert.equal(h.writes.length,0);
    assert.equal(!!form.querySelector('#rend-approval-confirm'),!existing);}
});
test('Annual dates recalculate from edited start, preserve document override and number remains editable',()=>{
  const h=setup(),form=openFirm(h,'Cliente360'),start=form.querySelector('#rend-start'),end=form.querySelector('#rend-end');
  start.value='2026-12-03';start.dispatch('change');assert.equal(end.value,'2027-12-03');
  end.value='2028-01-01';start.value='2026-12-04';start.dispatch('change');assert.equal(end.value,'2028-01-01');
  form.querySelector('#rend-num').value='CHANGED-RENEWAL';assert.equal(h.db.polizas[0].numero,'FIXTURE-EXISTING-2026');
});
test('Asesor and denied Operativo retain the review management path for UNKNOWN and cannot open direct issuance',()=>{
  for(const options of [{role:'Asesor'},{role:'Operativo',entitled:false}])for(const entry of ['Renovaciones','Cliente360']){
    const h=setup(options);enter(h,entry);assert.equal(h.nodes.has('renewal-decision-v1200'),false);assert.equal(h.nodes.has('ops-direct-renewal-v1201'),false);
    assert.equal(h.managementForms.length,1);assert.equal(h.managementForms[0].extraFields.workflowType,'renewal_proposals');assert.equal(h.writes.length,0);
    h.Orbit.renewalDirect.open({workflowType:'renewal_accepted',acceptedConfirmed:true,sourcePolicyId:'fixture-policy'});
    assert.equal(h.nodes.has('ops-direct-renewal-v1201'),false);
  }
});
test('NO renewability, cancellation, successor and lineage conflicts do not become draft eligibility',()=>{
  for(const policy of [{renovable:false},{estado:'Cancelada'},{renovadaPor:'unknown-successor'},{renovacionEstado:'Renovada'},{renovacionEstado:'No renovada'}]){
    const h=setup({policy});enter(h,'Renovaciones');assert.equal(h.nodes.has('renewal-decision-v1200'),false);assert.equal(h.nodes.has('ops-direct-renewal-v1201'),false);assert.equal(h.writes.length,0);
  }
  const h=setup();h.setScope(false);enter(h,'Cliente360');assert.equal(h.nodes.size,0);assert.equal(h.writes.length,0);
});
test('No approval or issued support means no canonical management and no issuance',async()=>{
  const h=setup(),form=openFirm(h,'Renovaciones'),save=form.querySelector('[data-create]');
  await save.onclick();assert.equal(h.writes.length,0);assert.equal(h.policyCalls.length,0);
  form.querySelector('#rend-approval-confirm').checked=true;await save.onclick();assert.equal(h.writes.length,0);assert.equal(h.policyCalls.length,0);
});
test('Both entries use the real canonical issuance owner after durable approval; edited inherited fields produce one linked successor',async()=>{
  for(const entry of ['Renovaciones','Cliente360'])for(const country of ['GT','CO']){
    const h=setup({country}),form=openFirm(h,entry);complete(form);
    form.querySelector('#rend-num').value='EDITED-RENEWAL';form.querySelector('#rend-asg').value='fixture-other-insurer';
    form.querySelector('#rend-net').value='1200';form.querySelector('#rend-prod').value='Cobertura ajustada';
    await form.querySelector('[data-create]').onclick();
    assert.equal(h.policyCalls.length,1);const raw=h.policyCalls[0];assert.equal(raw.numero,'EDITED-RENEWAL');assert.equal(raw.renuevaDe,'fixture-policy');
    assert.equal(raw.clienteId,'fixture-client');assert.equal(raw.asesorId,'fixture-advisor');assert.equal(raw.aseguradoraId,'fixture-other-insurer');
    assert.equal(raw.primaNeta,1200);assert.equal(raw.producto,'Cobertura ajustada');assert.equal(raw.pais,country);assert.equal(raw.vigenciaFin,'2027-11-21');
    assert.equal(h.db.gestiones.length,1);assert.equal(h.db.gestiones[0].acceptedConfirmed,true);assert.equal(h.db.gestiones[0].estado,'Resuelta');
    assert.equal(h.db.polizas[0].renovadaPor,'fixture-successor');assert.equal(h.db.polizas[0].numero,'FIXTURE-EXISTING-2026');assert.equal(h.db.polizas[0].renovable,null);
    assert.equal(h.managementForms.length,0);assert.deepEqual(h.openedPolicies,['fixture-successor']);
  }
});
test('Double submit waits for durable approval; rejected or absent readback retains the editable draft without issuance',async()=>{
  for(const failMode of ['reject','no_readback']){
    const h=setup(),form=openFirm(h,'Renovaciones');complete(form);let resolve;h.setPending(new Promise(r=>resolve=r));
    if(failMode==='reject')h.failManagement(true);else h.omitReadback(true);
    const save=form.querySelector('[data-create]'),first=save.onclick();await Promise.resolve();await save.onclick();assert.equal(h.writes.length,1);assert.equal(h.policyCalls.length,0);
    resolve();await first;assert.equal(form.removed,false);assert.equal(save.disabled,false);assert.equal(h.policyCalls.length,0);assert.equal(form.querySelector('#rend-num').value,'FIXTURE-EXISTING-2026');
  }
});
test('Permission or source outcome changed after draft opening cannot create approval or emit',async()=>{
  for(const mutate of [h=>h.setRole('Asesor'),h=>h.setScope(false),h=>{h.db.polizas[0].renovadaPor='concurrent-successor';h.Orbit.renewalLifecycle.invalidate();}]){
    const h=setup(),form=openFirm(h,'Cliente360');complete(form);mutate(h);await form.querySelector('[data-create]').onclick();
    assert.equal(h.writes.length,0);assert.equal(h.policyCalls.length,0);assert.equal(form.removed,false);
  }
});
