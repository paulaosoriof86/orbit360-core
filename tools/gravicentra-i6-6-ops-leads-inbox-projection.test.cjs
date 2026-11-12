'use strict';
// I6.6 synthetic-only role/scope/queue projection. No Firebase, no data writes.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../orbit360-platform/modules/ops.js'),'utf8');

function harness(records){
  let inboxClicks=0,rendered='',writes=0;
  const inbox={click(){inboxClicks++;}};
  const document={body:{contains:()=>true},addEventListener(){},removeEventListener(){},getElementById:id=>id==='ops-inbox-bell'?inbox:null};
  const opsColumns=[
    {def:{id:'cotizando',kind:'negocio',emoji:'🧮',nombre:'Cotizaciones',color:'#aaa'},items:[{kind:'negocio',rec:records.find(r=>r.id==='alreadyOnBoard')}]},
    {def:{id:'gestion',kind:'gestion',emoji:'🗂',nombre:'Gestiones Admin',color:'#aaa'},items:[]}
  ];
  const ciclo={opsBoard:()=>opsColumns,negocios:()=>records,
    actionQueueRanks:()=>({actionable:1,alreadyOnBoard:2}),
    collaborationState:n=>({needsAction:!!n.pending,noticeKnown:!!n.confirmed}),
    cardNegocio:n=>`<article data-neg="${n.id}">NEGOCIO_${n.id}</article>`,cardGestion:()=>'',wireCards(){}};
  const host={innerHTML:'',querySelector:sel=>sel==='#op-shared-inbox'?{addEventListener(_type,fn){host.openInbox=fn;}}:null,querySelectorAll:()=>[]};
  const Orbit={modules:{},ui:{esc:x=>String(x||'')},kit:{bannerFor:()=>'<div>Ops</div>'},ciclo,
    store:{on:()=>()=>{},all:()=>[],get:()=>null,updateDurable:()=>{writes++;throw Error('WRITE_FORBIDDEN');}},
    access:{canView:(_type,r)=>r.authorized!==false},session:{esAsesor:()=>false},route:{key:'ops'},
    assignableAdvisorRoster:{peek:()=>[]}};
  const ctx={Orbit,window:{Orbit},document,Promise,Set,Map};vm.createContext(ctx);
  vm.runInContext(source,ctx,{filename:'modules/ops.js'});
  Orbit.modules.ops.render(host);rendered=host.innerHTML;
  return {rendered,clickInbox(){host.openInbox();return inboxClicks;},writes};
}

test('Ops shows only signed unresolved Leads handoffs outside its current stage without duplicate cards or writes',()=>{
  const h=harness([
    {id:'actionable',pais:'GT',pending:true,confirmed:true,authorized:true},
    {id:'unconfirmed',pais:'GT',pending:true,confirmed:false,authorized:true},
    {id:'resolved',pais:'GT',pending:false,confirmed:true,authorized:true},
    {id:'forbidden',pais:'CO',pending:true,confirmed:true,authorized:false},
    {id:'alreadyOnBoard',pais:'GT',pending:true,confirmed:true,authorized:true}
  ]);
  assert.match(h.rendered,/Solicitudes de Leads pendientes · 1/);
  assert.match(h.rendered,/NEGOCIO_actionable/);
  assert.doesNotMatch(h.rendered,/NEGOCIO_(unconfirmed|resolved|forbidden)/);
  assert.equal((h.rendered.match(/NEGOCIO_alreadyOnBoard/g)||[]).length,1);
  assert.equal(h.clickInbox(),1);
  assert.equal(h.writes,0);
});
