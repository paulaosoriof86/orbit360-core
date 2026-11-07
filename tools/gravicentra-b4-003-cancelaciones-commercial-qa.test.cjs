'use strict';
// Causal LIVE finding: retained QA must not inflate cancellation KPIs or motives.
// Real Queries + Cancelaciones owners; synthetic records only, no network/writes.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=p=>fs.readFileSync(path.join(root,p),'utf8');
function setup(country='GT'){
 const rows={clientes:[{id:'gt',nombre:'Real GT',pais:'GT'},{id:'co',nombre:'Real CO',pais:'CO'},{id:'qa-client',nombre:'QA parent',pais:'GT',__syntheticQa:true}],
  polizas:[
   {id:'gt-cancel',numero:'GT-REAL',clienteId:'gt',pais:'GT',moneda:'GTQ',estado:'Cancelada',prima:100,fechaCancelacion:'2026-11-01',motivoCancelacion:'Real reason'},
   {id:'gt-active',numero:'GT-ACTIVE',clienteId:'gt',pais:'GT',moneda:'GTQ',estado:'Vigente',prima:200},
   {id:'co-cancel',numero:'CO-REAL',clienteId:'gt',pais:'CO',moneda:'COP',estado:'Anulada',prima:300,fechaCancelacion:'2026-11-02',motivoCancelacion:'CO reason'},
   {id:'qa-policy',numero:'B4-003-CAN-38102224750',clienteId:'gt',pais:'GT',moneda:'GTQ',estado:'Cancelada',prima:99999,__syntheticQa:true},
   {id:'qa-projected',numero:'QA-PROJECTED',clienteId:'co',pais:'CO',moneda:'COP',estado:'Cancelada',prima:99999,syntheticQa:true},
   {id:'qa-linked-client',numero:'QA-CLIENT',clienteId:'qa-client',pais:'GT',moneda:'GTQ',estado:'Cancelada',prima:99999},
   {id:'qa-b2',numero:'B2-REN',clienteId:'gt',pais:'GT',moneda:'GTQ',estado:'Cancelada',prima:99999,sourceRef:'B2 QA firme 36489784713'},
   {id:'qa-owned-cancellation',numero:'QA-CANCELLATION-ONLY',clienteId:'gt',pais:'GT',moneda:'GTQ',estado:'Vigente',prima:50}],
  cancelaciones:[
   {id:'real-explicit',polizaId:'gt-cancel',clienteId:'gt',pais:'GT',moneda:'GTQ',fecha:'2026-11-01',valorPerdido:100,motivo:'Real reason'},
   {id:'qa-inherited-policy',polizaId:'qa-policy',clienteId:'gt',pais:'GT',moneda:'GTQ',fecha:'2026-11-03',valorPerdido:99999,motivo:'B4-003 QA main motive'},
   {id:'qa-direct',polizaId:'qa-owned-cancellation',clienteId:'gt',pais:'GT',moneda:'GTQ',fecha:'2026-11-03',valorPerdido:99999,motivo:'B4-003 QA main motive',__syntheticQa:true}]};
 const before=JSON.stringify(rows),kpis=[],modals=[];let writes=0;
 const store={all:c=>rows[c]||[],get:(c,id)=>(rows[c]||[]).find(r=>r.id===id)||null,where:(c,f)=>(rows[c]||[]).filter(f),insert(){writes++;throw Error('READ_ONLY');},update(){writes++;throw Error('READ_ONLY');},remove(){writes++;throw Error('READ_ONLY');}};
 const dummy=()=>({style:{},innerHTML:'',querySelector:()=>({value:'',addEventListener(){}}),querySelectorAll:()=>[],addEventListener(){},remove(){}});
 const document={getElementById:()=>null,createElement:dummy,body:{appendChild:n=>modals.push(n)}};
 const Orbit={pais:country,store,modules:{},session:{rol:()=> 'Direccion'},ui:{esc:v=>String(v??''),fmtDate:v=>String(v||''),money:(v,c)=>c+' '+v,avatar:()=>'',finiteNumber:v=>Number.isFinite(Number(v))?Number(v):null},kit:{bannerFor:()=>'',kpis:r=>{kpis.splice(0,kpis.length,...r);return '';},filterBar:()=>'',wireFilters(){},asesorOptions:()=>[]}};
 const ctx={Orbit,window:{Orbit},document,location:{hostname:'synthetic--preview.web.app'},console};vm.createContext(ctx);
 for(const p of ['orbit360-platform/core/queries.js','orbit360-platform/modules/cancelaciones.js'])vm.runInContext(source(p),ctx);
 const host={innerHTML:'',querySelector:()=>null,querySelectorAll:()=>[]};
 return {Orbit,rows,before,kpis,modals,host,writes:()=>writes,render(){Orbit.modules.cancelaciones.render(host);return host.innerHTML;}};
}
test('Commercial cancellation owner excludes direct and inherited QA in GT, CO and TODOS without losing real cross-border rows',()=>{
 const h=setup();for(const [country,wanted]of [['GT',['real-explicit']],['CO',['can_pol_co-cancel']],['TODOS',['real-explicit','can_pol_co-cancel']]]){h.Orbit.pais=country;assert.deepEqual(Array.from(h.Orbit.modules.cancelaciones.effectiveRows(),r=>r.id).sort(),wanted.sort());}
 assert.equal(JSON.stringify(h.rows),h.before);assert.equal(h.writes(),0);
});
test('Commercial board, motive and loss KPI share the same QA-free universe and commercial denominator',()=>{
 const h=setup('GT'),html=h.render();assert.equal(h.kpis.find(k=>k.label==='Canceladas').val,1);assert.match(h.kpis.find(k=>k.label==='Motivo principal').val,/Real reason/);assert.doesNotMatch(html,/B4-003 QA main motive|B4-003-CAN-38102224750|99999/);
 // 3 commercial GT policies: cancelled, active, and the real policy underlying
 // a QA-only cancellation. The QA cancellation does not turn its parent into QA.
 assert.equal(h.kpis.find(k=>k.label==='Canceladas / cartera').val,'33%');
 h.Orbit.modules.cancelaciones.detalleKpi('tasa');assert.match(h.modals.at(-1).innerHTML,/1 canceladas \/ 3 pólizas/);
 h.Orbit.modules.cancelaciones.detalleKpi('motivo');assert.match(h.modals.at(-1).innerHTML,/Real reason/);assert.doesNotMatch(h.modals.at(-1).innerHTML,/B4-003 QA/);
});
test('Explicit audit mode keeps retained QA readable with the same country boundary and no mutation',()=>{
 const h=setup('CO'),owner=h.Orbit.modules.cancelaciones;
 const audit=owner.effectiveRows({mode:'audit',includeSyntheticQa:true});assert.equal(audit.length,2);assert.ok(audit.some(c=>c.polizaId==='qa-projected'));assert.ok(audit.every(c=>c.pais==='CO'));
 assert.equal(owner.effectiveRows({includeSyntheticQa:true}).length,1,'Audit must be explicit, not an accidental flag');
 assert.equal(owner.effectiveRows({mode:'audit'}).length,1,'Audit QA opt-in is required');
 assert.equal(JSON.stringify(h.rows),h.before);assert.equal(h.writes(),0);
});
test('Commercial QA filtering uses canonical source markers, never broad policy-name guessing',()=>{
 const h=setup('GT');h.rows.polizas.push({id:'real-lookalike',numero:'B4-003-REAL-CUSTOMER',clienteId:'gt',pais:'GT',estado:'Cancelada',prima:10});
 assert.ok(h.Orbit.modules.cancelaciones.effectiveRows().some(c=>c.polizaId==='real-lookalike'));
 assert.equal(h.Orbit.q.isSyntheticQaRecord(h.rows.polizas.find(p=>p.id==='qa-b2')),true);
});
