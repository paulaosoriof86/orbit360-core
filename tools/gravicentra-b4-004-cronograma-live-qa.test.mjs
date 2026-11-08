import test from 'node:test';
import assert from 'node:assert/strict';
import {installCronogramaQaAdapter,pickActors} from './gravicentra-b4-004-cronograma-live-qa.mjs';

function harness(){
 const calls=[];globalThis.Orbit={store:{__productOperationalWriteP0:true,insertDurable:async(c,row)=>{calls.push({method:'insert',c,row:structuredClone(row)});return structuredClone(row);},updateDurable:async(c,id,patch)=>{calls.push({method:'update',c,id,patch:structuredClone(patch)});return structuredClone(patch);}}};
 const plan={id:'b4004qa_cronograma_123_1'};installCronogramaQaAdapter(plan);return{calls,plan,qa:globalThis.__giCronoQa,close(){globalThis.__giCronoQa.restore();delete globalThis.Orbit;}};
}
test('adapter remaps one live task identity and preserves task fields',async()=>{const h=harness();try{const row={id:'tk123',t:'QA',fecha:'2026-11-07',done:false};await Orbit.store.insertDurable('tareas',row);assert.equal(row.id,h.plan.id);assert.equal(row.__syntheticQa,true);assert.equal(row.t,'QA');assert.equal(row.fecha,'2026-11-07');assert.equal(h.calls.length,1);}finally{h.close();}});
test('adapter permits only one exact done update',async()=>{const h=harness();try{const row={id:'tk123',t:'QA',fecha:'2026-11-07',done:false};await Orbit.store.insertDurable('tareas',row);await Orbit.store.updateDurable('tareas',h.plan.id,{done:true});assert.equal(h.calls[1].id,h.plan.id);assert.deepEqual(h.calls[1].patch,{done:true});await assert.rejects(()=>Orbit.store.updateDurable('tareas',h.plan.id,{done:false}),/UPDATE_NOT_DECLARED/);}finally{h.close();}});
test('adapter fails closed for foreign collection, id or patch',async()=>{const h=harness();try{await assert.rejects(()=>Orbit.store.insertDurable('clientes',{id:'tk1',done:false}),/INSERT_NOT_DECLARED/);await assert.rejects(()=>Orbit.store.updateDurable('tareas','real_task',{done:true}),/UPDATE_NOT_DECLARED/);await assert.rejects(()=>Orbit.store.updateDurable('tareas',h.plan.id,{done:true,t:'changed'}),/UPDATE_NOT_DECLARED/);}finally{h.close();}});

test('actor selector accepts a same-country all+own pair in GT and separate CO negative actor',()=>{
 const rows=[
  {uid:'gt_all',activeRole:'direccion',countries:['GT'],advisorId:'a1',scope:'all'},
  {uid:'gt_own',activeRole:'asesor',countries:['GT'],advisorId:'a2',scope:'own'},
  {uid:'co_all',activeRole:'operativo',countries:['CO'],advisorId:'a3',scope:'all'}
 ];
 const x=pickActors(rows);
 assert.equal(x.creator.uid,'gt_all');assert.equal(x.own.uid,'gt_own');assert.equal(x.foreign.uid,'co_all');assert.equal(x.country,'GT');assert.equal(x.otherCountry,'CO');
});
test('actor selector falls back to a valid CO all+own pair when GT own identity does not exist',()=>{
 const rows=[
  {uid:'gt_all',activeRole:'direccion',countries:['GT'],advisorId:'a1',scope:'all'},
  {uid:'co_all',activeRole:'operativo',countries:['CO'],advisorId:'a2',scope:'all'},
  {uid:'co_own',activeRole:'asesor',countries:['CO'],advisorId:'a3',scope:'own'}
 ];
 const x=pickActors(rows);
 assert.equal(x.creator.uid,'co_all');assert.equal(x.own.uid,'co_own');assert.equal(x.foreign.uid,'gt_all');assert.equal(x.country,'CO');assert.equal(x.otherCountry,'GT');
});
test('actor selector fails closed when no same-country distinct own-scope identity exists',()=>{
 assert.throws(()=>pickActors([
  {uid:'gt_all',activeRole:'direccion',countries:['GT'],advisorId:'a1',scope:'all'},
  {uid:'co_all',activeRole:'operativo',countries:['CO'],advisorId:'a2',scope:'all'}
 ]),/DISTINCT_UID_SCOPE_PAIR_UNAVAILABLE/);
});
