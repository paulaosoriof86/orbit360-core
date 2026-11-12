'use strict';
// I6.6 synthetic source QA. No real customer, Firebase, issuance or financial writes.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'../orbit360-platform/modules');
const src=fs.readFileSync(path.join(root,'renewals-v1200-operational-bridge.js'),'utf8');
const issuance=fs.readFileSync(path.join(root,'issuance-endosos-v1201-bridge.js'),'utf8');
const fixed=Date.parse('2026-11-12T12:00:00Z');
class FixedDate extends Date{constructor(...args){super(...(args.length?args:[fixed]));}static now(){return fixed;}}

function harness(role='Operativo',entitled=true){
  const nodes=new Map(),modals=[],opened=[],toasts=[],writes=[];
  const policy={id:'synthetic-p',clienteId:'synthetic-c',numero:'TEST-2026',aseguradoraId:'synthetic-a',
    pais:'CO',moneda:'COP',ramo:'Autos',vigenciaFin:'2026-12-01',estado:'Vigente',renovable:true};
  const db={polizas:[policy],clientes:[{id:'synthetic-c',pais:'CO'}],gestiones:[]};
  function el(){const children=new Map();return{id:'',style:{},innerHTML:'',remove(){nodes.delete(this.id);},
    addEventListener(){},querySelectorAll:()=>[],querySelector(selector){if(!children.has(selector))children.set(selector,{});return children.get(selector);}};}
  const document={getElementById:id=>nodes.get(id)||null,createElement:el,body:{appendChild(n){nodes.set(n.id,n);}}};
  const store={get:(c,id)=>(db[c]||[]).find(x=>x.id===id)||null,all:c=>db[c]||[],updateDurable:()=>{writes.push('unexpected');throw Error('WRITE_FORBIDDEN');}};
  const Orbit={store,pais:'CO',modules:{renovaciones:{render(){}}},
    ui:{esc:x=>String(x??''),today:()=> '2026-11-12',toast:x=>toasts.push(x)},
    access:{can:()=>entitled,canView:()=>true,esAsesor:()=>role==='Asesor',norm:x=>String(x||'').toLowerCase(),filter:(_c,x)=>x},
    session:{rol:()=>role},issuance:{canManage:()=>true},renewalDirect:{open:g=>opened.push(g.id)},
    ciclo:{managementCreateModal:input=>{modals.push(input);return input;}}};
  const ctx={document,Orbit,Date:FixedDate,location:{hash:'#/renovaciones'},console,setTimeout,clearTimeout};
  ctx.window=ctx;vm.createContext(ctx);vm.runInContext(src,ctx,{filename:'renewals-v1200-operational-bridge.js'});
  return{Orbit,ctx,nodes,db,modals,opened,toasts,writes};
}

test('Authorized Operativo has one choice, confirmed direct entry without manual Ops hop, and reuses accepted management',()=>{
  const h=harness();const m=h.Orbit.modules.renovaciones;
  m.registrarAceptacion('synthetic-p');const first=h.nodes.get('renewal-decision-v1200');assert.ok(first);
  assert.match(first.innerHTML,/Crear gestión de renovación/);assert.match(first.innerHTML,/Registrar renovación en firme/);
  assert.equal(h.modals.length,0);assert.equal(h.writes.length,0);
  first.querySelector('[data-direct]').onclick();assert.equal(h.modals.length,1);
  assert.match(h.modals[0].requireConfirmationText,/cliente aprobó/);
  assert.equal(h.modals[0].extraFields.workflowType,'renewal_accepted');
  h.modals[0].onCreated({id:'accepted',workflowType:'renewal_accepted',acceptedConfirmed:true});
  assert.deepEqual(h.opened,['accepted']);assert.equal(h.ctx.location.hash,'#/renovaciones');
  h.db.gestiones=[{id:'already-approved',polizaId:'synthetic-p',workflowType:'renewal_accepted',acceptedConfirmed:true,estado:'Pendiente'}];
  m.registrarAceptacion('synthetic-p');h.nodes.get('renewal-decision-v1200').querySelector('[data-direct]').onclick();
  assert.deepEqual(h.opened,['accepted','already-approved']);assert.equal(h.modals.length,1);assert.equal(h.writes.length,0);
});

test('Advisor and non-entitled Operativo have no direct renewal shortcut',()=>{
  for(const [role,entitled] of [['Asesor',true],['Operativo',false]]){
    const h=harness(role,entitled);h.Orbit.modules.renovaciones.registrarAceptacion('synthetic-p');
    assert.equal(h.nodes.has('renewal-decision-v1200'),false);
    assert.equal(h.modals.length,1);assert.equal(h.opened.length,0);assert.equal(h.writes.length,0);
  }
});

test('Direct issuance form itself enforces managed role, approved client management and edit entitlement',()=>{
  assert.match(issuance,/\['Dirección','SuperAdmin','AdminTenant','Admin','Operativo'\]\.includes\(role\)/);
  assert.match(issuance,/g\.workflowType!=='renewal_accepted'\|\|g\.acceptedConfirmed!==true/);
  assert.match(issuance,/Orbit\.renewalDirect=Object\.freeze\(\{open:openDirectRenewal\}\)/);
});
