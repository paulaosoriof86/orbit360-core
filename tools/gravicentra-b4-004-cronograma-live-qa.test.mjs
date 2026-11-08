import test from 'node:test';
import assert from 'node:assert/strict';
import {installCronogramaQaAdapter,pickActors,classifyConsoleError,redactConsoleMessage} from './gravicentra-b4-004-cronograma-live-qa.mjs';

function harness(){
 const calls=[];globalThis.Orbit={store:{__productOperationalWriteP0:true,insertDurable:async(c,row)=>{calls.push({method:'insert',c,row:structuredClone(row)});return structuredClone(row);},updateDurable:async(c,id,patch)=>{calls.push({method:'update',c,id,patch:structuredClone(patch)});return structuredClone(patch);}}};
 const plan={id:'b4004qa_cronograma_123_1'};installCronogramaQaAdapter(plan);return{calls,plan,qa:globalThis.__giCronoQa,close(){globalThis.__giCronoQa.restore();delete globalThis.Orbit;}};
}
test('adapter remaps one live task identity and preserves task fields',async()=>{const h=harness();try{const row={id:'tk123',t:'QA',fecha:'2026-11-07',done:false};await Orbit.store.insertDurable('tareas',row);assert.equal(row.id,h.plan.id);assert.equal(row.__syntheticQa,true);assert.equal(row.t,'QA');assert.equal(row.fecha,'2026-11-07');assert.equal(h.calls.length,1);}finally{h.close();}});
test('adapter permits only one exact done update',async()=>{const h=harness();try{const row={id:'tk123',t:'QA',fecha:'2026-11-07',done:false};await Orbit.store.insertDurable('tareas',row);await Orbit.store.updateDurable('tareas',h.plan.id,{done:true});assert.equal(h.calls[1].id,h.plan.id);assert.deepEqual(h.calls[1].patch,{done:true});await assert.rejects(()=>Orbit.store.updateDurable('tareas',h.plan.id,{done:false}),/UPDATE_NOT_DECLARED/);}finally{h.close();}});
test('adapter fails closed for foreign collection, id or patch',async()=>{const h=harness();try{await assert.rejects(()=>Orbit.store.insertDurable('clientes',{id:'tk1',done:false}),/INSERT_NOT_DECLARED/);await assert.rejects(()=>Orbit.store.updateDurable('tareas','real_task',{done:true}),/UPDATE_NOT_DECLARED/);await assert.rejects(()=>Orbit.store.updateDurable('tareas',h.plan.id,{done:true,t:'changed'}),/UPDATE_NOT_DECLARED/);}finally{h.close();}});

test('actor selector accepts a distinct all-scope peer and reuses its other-country assignment',()=>{
 const rows=[
  {uid:'gt_creator',activeRole:'direccion',countries:['GT'],advisorId:'a1',scope:'all'},
  {uid:'multi_peer',activeRole:'operativo',countries:['GT','CO'],advisorId:'a2',scope:'all'}
 ];
 const x=pickActors(rows);
 assert.equal(x.creator.uid,'gt_creator');assert.equal(x.peer.uid,'multi_peer');assert.equal(x.countryActor.uid,'multi_peer');assert.equal(x.country,'GT');assert.equal(x.otherCountry,'CO');assert.equal(x.peerShouldSee,true);
});
test('actor selector accepts an own-scope peer with a different advisor and expects isolation',()=>{
 const rows=[
  {uid:'gt_creator',activeRole:'direccion',countries:['GT'],advisorId:'a1',scope:'all'},
  {uid:'gt_own',activeRole:'asesor',countries:['GT'],advisorId:'a2',scope:'own'},
  {uid:'co_actor',activeRole:'operativo',countries:['CO'],advisorId:'a3',scope:'all'}
 ];
 const x=pickActors(rows);
 assert.equal(x.peer.uid,'gt_own');assert.equal(x.countryActor.uid,'co_actor');assert.equal(x.peerShouldSee,false);
});
test('actor selector fails closed without a distinct same-country scope witness',()=>{
 assert.throws(()=>pickActors([
  {uid:'gt_creator',activeRole:'direccion',countries:['GT'],advisorId:'a1',scope:'all'},
  {uid:'co_actor',activeRole:'operativo',countries:['CO'],advisorId:'a2',scope:'all'}
 ]),/DISTINCT_UID_SCOPE_PAIR_UNAVAILABLE/);
});

test('console classifier allows only harness-induced service-worker blocking',()=>{
 assert.equal(classifyConsoleError('Service Worker registration failed because service workers are blocked'),'HARNESS_SERVICE_WORKER_BLOCK');
 assert.equal(classifyConsoleError('Failed to load resource: the server responded with a status of 404'),'RELEVANT_OR_UNKNOWN');
 assert.equal(classifyConsoleError('FirebaseError: permission-denied'),'RELEVANT_OR_UNKNOWN');
});

test('console diagnostic classification and redaction never preserves URLs, emails or long identifiers',()=>{
 assert.equal(classifyConsoleError('Refused to connect because of Content Security Policy'),'CSP_OR_BROWSER_POLICY');
 assert.equal(classifyConsoleError('FirebaseError: permission-denied'),'FIREBASE_AUTH_OR_FIRESTORE');
 assert.equal(classifyConsoleError('Failed to load resource: net::ERR_BLOCKED_BY_CLIENT'),'NETWORK_RESOURCE');
 const safe=redactConsoleMessage('problem https://example.test/a?token=abc someone@example.com ABCDEFGHIJKLMNOPQRSTUVWXYZ123456');
 assert.equal(safe.includes('https://'),false);assert.equal(safe.includes('@'),false);assert.equal(safe.includes('ABCDEFGHIJKLMNOPQRSTUVWXYZ'),false);
});
