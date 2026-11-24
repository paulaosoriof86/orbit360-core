'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const s=require('./gravicentra-i66-make-lead-ingress-scenario.cjs');
const c=require('../functions/product-lead-ingress-contract.js');
const snapshot=()=>({scenario:{id:10196136,teamId:1975919,lastEdit:'2026-11-23T19:54:17.962Z'},
  trigger:{kind:'scheduled',scheduling:{type:'indefinitely',interval:300}},modules:[
    {id:1,module:'green-api:LastIncomingMessages',version:1,root:'main'},
    {id:2,module:'green-api:getMessage',version:1,follows:1,filter:{name:'Solo chats individuales e ID',conditions:[[
      {a:'{{1.chatId}}',b:'@c\\.us$',o:'text:pattern'},{a:'{{1.idMessage}}',o:'exist'}]]}}]});
const configs=()=>({modules:[{id:1,config:{parameters:{minutes:15,onlyFrom:false,__IMTCONN__:14749710},mapper:{limit:100}}},
  {id:2,config:{parameters:{__IMTCONN__:14749710},mapper:{chatId:'{{1.chatId}}',idMessage:'{{1.idMessage}}'}}}]});
const withWriter=()=>({...snapshot(),modules:[...snapshot().modules,{id:3,module:'google-cloud-firestore:createDocument',version:1,follows:2,disabled:true}]});
const nonce='a'.repeat(64),clone=v=>JSON.parse(JSON.stringify(v));
function resolve(v,packet){
  if(typeof v!=='string'||!/^\{\{2\.[A-Za-z.]+\}\}$/.test(v))return v;
  return v.slice(4,-2).split('.').reduce((o,k)=>o?.[k],packet);
}
// Evaluates only the three documented Make filter operators actually emitted.
function admits(filter,packet){return filter.conditions.some(arm=>arm.every(row=>{
  const a=resolve(row.a,packet),b=resolve(row.b,packet);
  if(row.o==='exist')return a!==undefined&&a!==null&&a!=='';
  if(row.o==='text:equal')return a===b;
  if(row.o==='text:pattern')return typeof a==='string'&&new RegExp(b).test(a);
  throw Error('Unreviewed filter operator');
}));}
test('a new queue module starts disabled and writes only an innocuous probe, preserving existing reader configs',()=>{
  const current=snapshot(),original=clone(current),modules=configs(),prior=clone(modules);
  const request=s.addDisabledProbe(current,modules,{nonce,previewOnly:true});
  assert.equal(request.expectedLastEdit,current.scenario.lastEdit);assert.equal(request.operations.length,1);
  const op=request.operations[0];assert.equal(op.disabled,true);assert.equal(op.follows,2);
  assert.equal(op.config.parameters.__IMTCONN__,14756714);
  assert.equal(op.config.mapper.full_path,'projects/ays-orbit-360-lab/databases/(default)/documents/tenants/alianzas-soluciones/previewLeadIngressRequests');
  assert.equal(op.config.mapper.documentId,undefined);
  assert.deepEqual(op.config.mapper.fields.map(x=>x.fieldName),['schema','provider','tenantId','country','instanceId','scenarioId','nonce']);
  assert.deepEqual(current,original);assert.deepEqual(modules,prior);
});
test('unexpected existing writer, changed provider connection and stale reader preimage are refused',()=>{
  assert.throws(()=>s.addDisabledProbe(withWriter(),configs(),{nonce}),/UNEXPECTED_EXISTING_WRITER/);
  for(const change of [v=>v.modules[0].config.parameters.__IMTCONN__=1,v=>v.modules[0].config.parameters.minutes=1440,
    v=>v.modules[1].config.mapper.idMessage='{{1.other}}']){
    const changed=configs();change(changed);assert.throws(()=>s.addDisabledProbe(snapshot(),changed,{nonce}),/READER_PREIMAGE_CHANGED/);
  }
});
test('one authenticated probe can run independently of whether the message search has any bundles',()=>{
  const request=s.probeAtRoot(withWriter(),3,{nonce,previewOnly:false});
  assert.ok(request.operations.some(x=>x.op==='module_move'&&x.moduleId===3&&x.root==='main'));
  assert.ok(request.operations.some(x=>x.op==='module_move'&&x.moduleId===1&&x.follows===3));
  assert.ok(request.operations.some(x=>x.op==='module_disabled_set'&&x.moduleId===3&&x.disabled===false));
  assert.equal(request.operations.find(x=>x.op==='module_config_set').config.mapper.full_path.endsWith('/leadIngressRequests'),true);
  assert.equal(request.operations.some(x=>/schedule|metadata/.test(x.op)),false);
});
test('direct personal ad maps into the exact minimal canonical envelope; auto IDs permit duplicate polling without overwrites',()=>{
  const request=s.realWriter(withWriter(),3),config=request.operations.find(x=>x.op==='module_config_set').config;
  const packet={type:'incoming',typeMessage:'extendedTextMessage',idMessage:'synthetic-ad-message-1234',chatId:'50255550123@c.us',
    senderId:'50255550123@c.us',extendedTextMessage:{sourceType:'ad',sourceId:'synthetic-ad-5678',ctwaClid:'synthetic-click'},
    textMessage:'Private content must not be copied',senderName:'Synthetic fixture'};
  const filter=request.operations.find(x=>x.op==='filter_set').filter;assert.equal(admits(filter,packet),true);
  const row=Object.fromEntries(config.mapper.fields.map(x=>[x.fieldName,resolve(x.value,packet)]));
  const event={params:{requestId:'auto-id-proof'},data:{ref:{path:'tenants/alianzas-soluciones/leadIngressRequests/auto-id-proof'},data:()=>row}};
  assert.equal(c.envelope(event,false).row.messageId,packet.idMessage);
  assert.equal(config.mapper.documentId,undefined);assert.equal(row.textMessage,undefined);assert.equal(row.senderName,undefined);
  assert.equal(typeof row.scenarioId,'number');assert.equal(config.mapper.fields.find(x=>x.fieldName==='scenarioId').valueType,'integerValue');
});
test('normal document/text packets observed in the current reader and incomplete or outgoing ads cannot enter the queue',()=>{
  const filter=s.realWriter(withWriter(),3).operations.find(x=>x.op==='filter_set').filter;
  const base={type:'incoming',typeMessage:'extendedTextMessage',idMessage:'synthetic-ad-message-1234',chatId:'50255550123@c.us',
    senderId:'50255550123@c.us',extendedTextMessage:{sourceType:'ad',sourceId:'synthetic-ad-5678'}};
  for(const change of [x=>x.typeMessage='documentMessage',x=>x.typeMessage='textMessage',x=>x.type='outgoing',
    x=>x.chatId='50255550123@g.us',x=>x.senderId='50255550124@c.us',x=>delete x.idMessage,
    x=>x.extendedTextMessage.sourceType='link',x=>delete x.extendedTextMessage.sourceId]){
    const packet=clone(base);change(packet);assert.equal(admits(filter,packet),false);
  }
});
test('restoring the two-reader flow does not change its schedule, connections or filter',()=>{
  const backup={scenario:snapshot(),modules:configs()},request=s.restoreReader(withWriter(),3,backup);
  assert.ok(request.operations.some(x=>x.op==='module_remove'&&x.moduleId===3));
  assert.deepEqual(request.operations.find(x=>x.op==='module_config_set'&&x.moduleId===1).config,configs().modules[0].config);
  assert.deepEqual(request.operations.find(x=>x.op==='filter_set').filter,snapshot().modules[1].filter);
  assert.equal(request.operations.some(x=>/schedule|metadata/.test(x.op)),false);
});
