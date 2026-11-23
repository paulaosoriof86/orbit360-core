'use strict';
// Synthetic-only portal UI QA: 12 arbitrary clients; no Firebase/Drive/business writes.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const portal=fs.readFileSync(path.join(__dirname,'../orbit360-platform/modules/portal.js'),'utf8');
const backend=fs.readFileSync(path.join(__dirname,'../functions/product-ops-leads-domain.js'),'utf8');
const start=portal.indexOf('  function solicitar(tipoPre) {');
const end=portal.indexOf('  function detPoliza(polId) {',start);
assert.ok(start>=0&&end>start,'canonical portal request owner');
const crear=new Function('S','Orbit','q','clienteId','drawer','toast','render','host','esPolizaActivaPortal',portal.slice(start,end)+'\nreturn solicitar;');
async function submit(clientId,{country='GT',activityLinked=true,claim=false}={}){
 const writes=[],notices=[];
 const client={id:clientId,nombre:'QA '+clientId,asesorId:'qa_advisor',pais:country};
 const store={get:(c,id)=>c==='clientes'&&id===clientId?client:null,all:()=>[],
  async insertDurable(collection,row){writes.push({collection,row});if(collection==='actividades')throw Error('DUPLICATE_ACTIVITY_FORBIDDEN');return row;}};
 const form={'#dr-ok':{disabled:false,textContent:'Enviar solicitud'},
  '#ps-tipo':{value:claim?'Reclamo / Siniestro':'Consulta de cobertura'},
  '#ps-det':{value:'Detalle QA '+clientId}};
 let onOk,removed=false,rendered=0;
 const back={querySelector:s=>form[s],remove:()=>{removed=true;},addEventListener:()=>{}};
 const drawer=(title,html,handler)=>{onOk=handler;return back;};
 const Orbit={ui:{today:()=> '2026-11-22'},ciclo:{async crearGestionDurable(row){
  writes.push({collection:'gestiones',row});
  return {...row,id:'qa_gestion_'+clientId,actividadCliente360Id:activityLinked?'act_qa_'+clientId:''};
 }}};
 const open=crear(()=>store,Orbit,{polizasDe:()=>[]},clientId,drawer,m=>notices.push(m),()=>{rendered++;},{},()=>false);
 open();
 assert.equal(typeof onOk,'function');
 await onOk();
 return {writes,notices,removed,rendered};
}
test('Twelve distinct clients create one durable management and no duplicate activity',async()=>{
 for(let i=0;i<12;i++){
  const clientId='qa_client_'+i,r=await submit(clientId,{country:i%2?'CO':'GT'});
  assert.deepEqual(r.writes.map(x=>x.collection),['gestiones']);
  assert.equal(r.writes[0].row.clienteId,clientId);
  assert.equal(r.removed,true);assert.equal(r.rendered,1);
  assert.match(r.notices.join(' '),/Solicitud confirmada/);
 }
});
test('An activity readback gap never reports that a committed management failed',async()=>{
 const r=await submit('qa_missing_activity',{activityLinked:false});
 assert.deepEqual(r.writes.map(x=>x.collection),['gestiones']);
 assert.match(r.notices.join(' '),/Solicitud guardada en Ops/);
 assert.doesNotMatch(r.notices.join(' '),/No fue posible confirmar/);
});
test('Siniestro portal does not create a duplicate activity after the management',async()=>{
 const r=await submit('qa_claim',{claim:true});
 assert.deepEqual(r.writes.map(x=>x.collection),['reclamos','gestiones']);
 assert.equal(r.writes[1].row.clienteId,'qa_claim');
});
test('Both canonical operation types use one transactional server activity and postcommit readback',()=>{
 const condition="['create_management','portal_request'].includes(operation)&&after.clienteId&&after.workflowType!=='endorsement_request'";
 const a=backend.indexOf('if('+condition+')');
 const b=backend.indexOf("tx.set(dataRef(authz.tenantId,'actividades',activityId)",a);
 const c=backend.indexOf('tx.set(entity,after,{merge:true});',b);
 const d=backend.indexOf("if(['create_management','portal_request'].includes(operation)&&confirmedRow.clienteId",c);
 assert.ok(a>0&&b>a&&c>b&&d>c,'atomic activity and durable readback');
 assert.ok(backend.includes('OPS_CLIENT360_ACTIVITY_READBACK_MISSING'));
 assert.ok(backend.includes('after.actividadCliente360Id=activityId'));
 assert.ok(!portal.includes("S().insertDurable('actividades'"));
});
