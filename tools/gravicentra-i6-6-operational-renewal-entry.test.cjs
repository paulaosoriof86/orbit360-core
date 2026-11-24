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
    session:{rol:()=>role},issuance:{canManage:()=>true},renewalDirect:{open:(g,options)=>opened.push({management:g,options})},
    cat:{ensure:async()=>true},
    ciclo:{managementCreateModal:input=>{modals.push(input);return input;},
      crearGestionDurable:async input=>{const g={...input};db.gestiones.push(g);writes.push({kind:'gestion',id:g.id});return g;}}};
  const ctx={document,Orbit,Date:FixedDate,location:{hash:'#/renovaciones'},console,setTimeout,clearTimeout};
  ctx.window=ctx;vm.createContext(ctx);vm.runInContext(src,ctx,{filename:'renewals-v1200-operational-bridge.js'});
  return{Orbit,ctx,nodes,db,modals,opened,toasts,writes};
}

test('Authorized Operativo enters the editable draft immediately and persists approval only when the form requests it',async()=>{
  const h=harness();const m=h.Orbit.modules.renovaciones;
  m.registrarAceptacion('synthetic-p');
  const first=h.nodes.get('renewal-decision-v1200');assert.ok(first);
  assert.match(first.innerHTML,/Crear gestión de renovación/);
  assert.match(first.innerHTML,/Registrar renovación en firme/);
  first.querySelector('[data-direct]').onclick();
  assert.equal(h.modals.length,0,'direct route must never open the generic Ops management form');
  assert.equal(h.nodes.has('renewal-direct-approval-v1201'),false,'approval belongs to the same policy form');
  assert.equal(h.writes.length,0,'opening a draft must not persist approval');
  assert.equal(h.opened.length,1);
  assert.equal(h.opened[0].management.sourcePolicyId,'synthetic-p');
  assert.equal(h.opened[0].management.acceptedConfirmed,false);
  const approved=await h.opened[0].options.confirmAcceptance('Correo de aprobación real');
  assert.equal(h.writes.length,1,'one durable canonical management record expected when saving');
  assert.equal(approved.workflowType,'renewal_accepted');
  assert.equal(approved.acceptedConfirmed,true);
  assert.equal(approved.clientApprovalNote,'Correo de aprobación real');
  assert.equal(h.ctx.location.hash,'#/renovaciones','no navigational detour through Ops');
  m.registrarAceptacion('synthetic-p');
  h.nodes.get('renewal-decision-v1200').querySelector('[data-direct]').onclick();
  assert.equal(h.writes.length,1,'must reuse accepted management idempotently');
  assert.equal(h.opened[1].management.id,approved.id);
  assert.equal(h.opened[1].options,undefined,'existing approval does not require another request');
});

test('Opening or abandoning the direct draft never silently records client approval',()=>{
  const h=harness();h.Orbit.modules.renovaciones.registrarAceptacion('synthetic-p');
  h.nodes.get('renewal-decision-v1200').querySelector('[data-direct]').onclick();
  assert.equal(h.writes.length,0);assert.equal(h.db.gestiones.length,0);
  assert.equal(h.opened[0].management.acceptedConfirmed,false);
  assert.equal(typeof h.opened[0].options.confirmAcceptance,'function');
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

test('All privileged roles share direct issued-renewal route; Carlos and Dirección have parity',()=>{
  for(const role of ['Dirección','SuperAdmin','AdminTenant','Admin','Operativo']){
    const h=harness(role,true);h.Orbit.modules.renovaciones.registrarAceptacion('synthetic-p');
    const decision=h.nodes.get('renewal-decision-v1200');assert.ok(decision,role);
    decision.querySelector('[data-direct]').onclick();
    assert.equal(h.opened.length,1,role);
    assert.equal(h.opened[0].management.acceptedConfirmed,false,role);
    assert.equal(h.writes.length,0,role);
    assert.equal(h.modals.length,0,'Ops form detour: '+role);
  }
});

test('Cliente360 routes renewal to shared role decision and issued-document failures remain retryable',()=>{
  const client=fs.readFileSync(path.resolve(__dirname,'../orbit360-platform/modules/cliente360.js'),'utf8');
  assert.match(client,/renewal\.registrarAceptacion\(polId\)/);
  assert.match(issuance,/if\(supportFile&&!confirmedDocumentRef\)\{[\s\S]*?try\{/);
  assert.match(issuance,/No fue posible confirmar el soporte en Drive/);
  assert.match(issuance,/No fue posible confirmar la renovación\. Consulta la póliza antes de reintentar/);
});

test('issued renewal carries the prior number and suggests only a verified calendar term', ()=>{
  const start=issuance.indexOf('  function renewalTermEnd(');
  const end=issuance.indexOf('  function openDirectRenewal(', start);
  assert.ok(start>=0 && end>start);
  const calculate=new Function(issuance.slice(start,end)+'\nreturn renewalTermEnd;')();
  assert.equal(calculate('2025-11-16','2026-11-16','2026-11-20'),'2027-11-20');
  assert.equal(calculate('2025-08-31','2026-02-28','2026-08-31'),'2027-02-28');
  assert.equal(calculate('2024-02-29','2025-02-28','2028-02-29'),'2029-02-28');
  assert.equal(calculate('2026-01-01','2026-02-14','2026-02-14'),'');
  assert.equal(calculate('', '2026-11-16','2026-11-20'),'');
  assert.match(issuance,/id="rend-num"[^>]*value="\$\{esc\(source\.numero/);
});
