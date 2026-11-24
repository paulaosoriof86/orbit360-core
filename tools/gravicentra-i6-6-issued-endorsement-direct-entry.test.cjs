'use strict';
// Real policy entry, shared UI and canonical endorsement owner; isolated durable
// memory transport only. This test does not contact Firebase or create records.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=process.env.GI_ENDORSEMENT_SOURCE_ROOT||path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,'orbit360-platform',p),'utf8');
const clone=x=>JSON.parse(JSON.stringify(x));
function setup(role='Operativo'){
  const db={clientes:[{id:'client',tenantId:'tenant',pais:'GT',asesorId:'advisor'}],
    polizas:[{id:'policy',tenantId:'tenant',pais:'GT',moneda:'GTQ',clienteId:'client',asesorId:'advisor',aseguradoraId:'insurer',
      numero:'LOCAL-EXISTING',ramo:'Vida',estado:'Vigente',beneficiarios:[{nombre:'Persona vigente',parentesco:'Hija',porcentaje:100}],
      frecuencia:'Trimestral',cuotas:4,formaPago:'Transferencia',conducto:'Aseguradora',
      direccionRiesgo:'Dirección vigente',contactoRiesgo:'Contacto vigente',observacionesRiesgo:'Detalle vigente',vehiculoId:'vehicle',historial:[]}],
    vehiculos:[{id:'vehicle',tenantId:'tenant',pais:'GT',clienteId:'client',polizaId:'policy',estado:'Activo',placa:'OLD001'}],
    gestiones:[],actividades:[]};
  const nodes=new Map(),calls=[],toasts=[],opened=[];let actor=role,closeError=false,pause=null;
  function element(tag='div'){
    let html='';const children=new Map();
    const el={tag,id:'',style:{},dataset:{},textContent:'',value:'',disabled:false,readOnly:false,removed:false,
      get innerHTML(){return html;},set innerHTML(value){html=value;children.clear();},
      appendChild(child){nodes.set(child.id,child);},remove(){this.removed=true;nodes.delete(this.id);},addEventListener(){},
      querySelector(selector){
        if(children.has(selector))return children.get(selector);
        const key=selector.startsWith('#')?'id="'+selector.slice(1)+'"':selector.startsWith('[')?selector.slice(1,-1):null;
        if(!key)return null;
        const match=html.match(new RegExp('<([\\w-]+)\\b([^>]*\\b'+key+'[^>]*)>([\\s\\S]*?)</\\1>|<([\\w-]+)\\b([^>]*\\b'+key+'[^>]*)>'));
        if(!match){for(const child of children.values()){const found=child.querySelector(selector);if(found)return found;}return null;}
        const child=element(match[1]||match[4]),attrs=match[2]||match[5]||'',body=match[3]||'';
        child.id=(attrs.match(/\bid="([^"]*)"/)||[])[1]||'';child.value=(attrs.match(/\bvalue="([^"]*)"/)||[])[1]||'';
        child.innerHTML=body;child.textContent=body.replace(/<[^>]*>/g,'');
        if(child.tag==='textarea')child.value=body;
        if(child.tag==='select'){
          const options=[...body.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)],selected=options.find(o=>/\bselected\b/.test(o[1]))||options[0];
          child.value=selected?((selected[1].match(/\bvalue="([^"]*)"/)||[])[1]??selected[2]):'';
        }
        children.set(selector,child);return child;
      },querySelectorAll(selector){const one=this.querySelector(selector);return one?[one]:[];}};
    return el;
  }
  const get=(c,id)=>(db[c]||[]).find(r=>r.id===id)||null;
  const store={get,all:c=>db[c]||[],
    async insertDurable(c,row){if(pause)await pause;if(get(c,row.id))throw Error('DUPLICATE');db[c].push(clone(row));calls.push({kind:'insert',c,id:row.id});return row;},
    async updateDurable(c,id,patch){if(closeError&&patch.endorsementStage==='APLICADO'){closeError=false;throw Error('LOCAL_CLOSE_FAILURE');}
      Object.assign(get(c,id),clone(patch));calls.push({kind:'update',c,id});return get(c,id);},
    async batchDurable(mutations){assert.ok(mutations.every(m=>m.collection!=='gestiones'));
      for(const m of mutations){if(m.action==='insert')db[m.collection].push(clone(m.payload));else Object.assign(get(m.collection,m.id),clone(m.payload));}
      calls.push({kind:'batch',mutations:clone(mutations)});return {ok:true,canonicalReadback:true};}};
  const access={activeRole:()=>actor,tenantId:()=> 'tenant',actorAdvisor:()=>({}),actorUser:()=>({nombre:'Actor local'}),
    canView:(_c,row)=>row.pais==='GT',can:()=>actor!=='Asesor'};
  const Orbit={store,access,modules:{cliente360:{verPoliza:id=>opened.push(id)}},cat:{get:()=>[]},
    session:{rol:()=>actor},ui:{esc:x=>String(x??''),toast:x=>toasts.push(x),today:()=> '2026-11-24'},issuance:{},
    policyReceipts:{async updatePolicy(id,patch){Object.assign(get('polizas',id),clone(patch));calls.push({kind:'payment-plan',id});return{ok:true};}}};
  const ctx={Orbit,document:{createElement:element,getElementById:id=>nodes.get(id)||null,body:element(),addEventListener(){}},
    location:{hash:'#/cliente360',hostname:'local.test'},console,Date,Math,setTimeout,clearTimeout};ctx.window=ctx;vm.createContext(ctx);
  for(const p of ['core/endorsement-workflow-v1201.js','modules/issuance-endosos-v1201-bridge.js'])vm.runInContext(read(p),ctx,{filename:p});
  return {Orbit,ctx,db,store,calls,toasts,opened,nodes,setRole:v=>actor=v,failClose:()=>closeError=true,pause:p=>pause=p};
}
function open(h,type){h.Orbit.modules.cliente360.endoso('policy');const form=h.nodes.get('endorsement-request-v1201');
  assert.ok(form);form.querySelector('#end-type').value=type;form.querySelector('#end-type').onchange();return form;}
function support(form){form.querySelector('#end-doc').value='drive:local-issued-endorsement';form.querySelector('#end-note').value='Cambio emitido documentado';
  form.querySelector('#end-direct-ref').value='LOCAL-ISSUED-001';form.querySelector('#end-direct-date').value='2026-11-24';}

for(const role of ['Operativo','Dirección','Admin','AdminTenant','SuperAdmin'])test(role+': issued beneficiary endorsement is applied from the policy form and its canonical management is closed',async()=>{
  const h=setup(role),form=open(h,'beneficiarios'),original=clone(h.db.polizas[0].beneficiarios[0]);
  const direct=form.querySelector('[data-direct]');assert.equal(direct.style.display,'');assert.equal(form.querySelector('#end-direct-fields').style.display,'');
  assert.equal(form.querySelector('#end-benef').value,'Persona vigente · Hija · 100%');assert.equal(h.calls.length,0);
  support(form);form.querySelector('#end-benef').value+='\nBeneficiario agregado';await direct.onclick();
  assert.equal(h.db.gestiones.length,1);assert.equal(h.db.gestiones[0].endorsementStage,'APLICADO');
  assert.equal(h.db.gestiones[0].estado,'Resuelta');assert.equal(h.db.polizas[0].beneficiarios.length,2);
  assert.deepEqual(h.db.polizas[0].beneficiarios[0],original);assert.equal(h.db.polizas[0].beneficiarios[1],'Beneficiario agregado');
  assert.equal(h.db.polizas[0].historial.length,1);assert.equal(h.ctx.location.hash,'#/cliente360');assert.deepEqual(h.opened,['policy']);
  const count=h.calls.length,replay=await h.Orbit.endorsements.apply(h.db.gestiones[0].id,{});
  assert.equal(replay.alreadyApplied,true);assert.equal(h.calls.length,count);
});
test('Payment plan and risk correction inherit editable policy values and use their approved owners',async()=>{
  for(const type of ['forma_pago','datos_riesgo']){
    const h=setup(),form=open(h,type);support(form);
    const expected=type==='forma_pago'?{'end-freq':'Trimestral','end-cuotas':'4','end-form':'Transferencia','end-conduct':'Aseguradora'}:
      {'end-dir':'Dirección vigente','end-contact':'Contacto vigente','end-obs':'Detalle vigente'};
    for(const [id,value] of Object.entries(expected)){assert.equal(form.querySelector('#'+id).value,value);assert.equal(form.querySelector('#'+id).disabled,false);}
    if(type==='forma_pago'){form.querySelector('#end-freq').value='Mensual';form.querySelector('#end-cuotas').value='12';}
    else form.querySelector('#end-dir').value='Dirección corregida';
    await form.querySelector('[data-direct]').onclick();assert.equal(h.db.gestiones[0].endorsementStage,'APLICADO');
    if(type==='forma_pago'){assert.equal(h.db.polizas[0].cuotas,12);assert.equal(h.calls.filter(c=>c.kind==='payment-plan').length,1);}
    else assert.equal(h.db.polizas[0].direccionRiesgo,'Dirección corregida');
  }
});
test('Vehicle substitution keeps its identification checks and the old risk history',async()=>{
  const h=setup(),form=open(h,'sustitucion_vehiculo');support(form);await form.querySelector('[data-direct]').onclick();assert.equal(h.calls.length,0);
  form.querySelector('#end-placa').value='NEW001';await form.querySelector('[data-direct]').onclick();
  assert.equal(h.db.vehiculos.length,2);assert.equal(h.db.vehiculos[0].estado,'Histórico');assert.equal(h.db.vehiculos[1].placa,'NEW001');
});
test('Advisor and unsupported endorsement types retain request-only behavior',async()=>{
  const h=setup('Asesor'),form=open(h,'beneficiarios');assert.equal(form.querySelector('[data-direct]'),null);
  await form.querySelector('[data-create]').onclick();assert.equal(h.db.gestiones.length,1);assert.equal(h.db.gestiones[0].endorsementStage,'SOLICITADO');
  assert.equal(h.db.polizas[0].historial.length,0);assert.equal(h.ctx.location.hash,'#/ops');
  const x=setup(),unsupported=open(x,'cambio_tomador');assert.equal(unsupported.querySelector('[data-direct]').style.display,'none');
  support(unsupported);await unsupported.querySelector('[data-direct]').onclick();assert.equal(x.calls.length,0);
});
test('Missing issued evidence, empty beneficiaries and revoked role cannot create a request or modify a policy',async()=>{
  for(const mode of ['missing','empty','role']){const h=setup(),form=open(h,'beneficiarios');if(mode!=='missing')support(form);
    if(mode==='empty')form.querySelector('#end-benef').value='';if(mode==='role')h.setRole('Asesor');
    await form.querySelector('[data-direct]').onclick();assert.equal(h.calls.length,0);assert.equal(form.removed,false);}
});
test('A failed closeout is retried from the same form without repeating the committed policy change',async()=>{
  const h=setup(),form=open(h,'beneficiarios');support(form);h.failClose();const submit=form.querySelector('[data-direct]');
  await submit.onclick();assert.equal(form.removed,false);assert.equal(h.db.gestiones.length,1);assert.equal(h.db.polizas[0].historial.length,1);
  assert.equal(h.db.gestiones[0].endorsementStage,'APROBADO_PENDIENTE_APLICACION');assert.equal(h.ctx.location.hash,'#/cliente360');
  await submit.onclick();assert.equal(h.db.gestiones.length,1);assert.equal(h.db.gestiones[0].endorsementStage,'APLICADO');
  assert.equal(h.calls.filter(x=>x.kind==='batch').length,1);assert.equal(h.db.polizas[0].historial.length,1);
});
test('Conflicting existing request cannot be silently applied or overwritten',async()=>{
  const h=setup();await h.Orbit.endorsements.createRequest('policy','beneficiarios',{beneficiarios:['Otro cambio'],nota:'Otra instrucción'},{documentRef:'drive:other'});
  const form=open(h,'beneficiarios');support(form);const count=h.calls.length;await form.querySelector('[data-direct]').onclick();
  assert.equal(h.calls.length,count);assert.equal(h.db.gestiones.length,1);assert.equal(h.db.gestiones[0].endorsementStage,'SOLICITADO');
  assert.equal(h.db.polizas[0].historial.length,0);assert.equal(form.removed,false);assert.equal(h.ctx.location.hash,'#/cliente360');
});
test('A second click while the canonical request is pending cannot create a duplicate',async()=>{
  const h=setup(),form=open(h,'beneficiarios');support(form);let resume;h.pause(new Promise(r=>resume=r));
  const submit=form.querySelector('[data-direct]'),first=submit.onclick();await Promise.resolve();await submit.onclick();assert.equal(h.db.gestiones.length,0);
  resume();await first;assert.equal(h.db.gestiones.length,1);assert.equal(h.db.polizas[0].historial.length,1);
});
