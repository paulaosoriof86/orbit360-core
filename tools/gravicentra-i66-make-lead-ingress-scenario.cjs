'use strict';

// Pure construction of Make's existing scenario_patch requests. This module
// performs no tool call, activation, provider send or remote write.
const c=require('../functions/product-lead-ingress-contract');
const GREEN_CONNECTION=14749710,TEAM=1975919;
const PROJECT_ROOT='projects/ays-orbit-360-lab/databases/(default)/documents/tenants/'+c.TENANT;
const condition=(a,o,b)=>({a,o,...(b===undefined?{}:{b})});
const field=(fieldName,value)=>({fieldName,valueType:typeof value==='number'?'integerValue':'stringValue',value});
function queueConfig(fields,preview){
  return{parameters:{__IMTCONN__:c.FIRESTORE_CONNECTION},mapper:{input_type:'manual',
    full_path:PROJECT_ROOT+'/'+(preview?c.PREVIEW_QUEUE:c.QUEUE),fields:Object.entries(fields).map(([k,v])=>field(k,v))}};
}
function checked(current,moduleId){
  c.need(current?.scenario?.id===c.SCENARIO&&current.scenario.teamId===TEAM&&
    typeof current.scenario.lastEdit==='string'&&current.scenario.lastEdit.length>10,'INGRESS_MAKE_SCENARIO_CAS_REQUIRED');
  c.need(current.modules?.some(x=>x.id===1&&x.module==='green-api:LastIncomingMessages')&&
    current.modules?.some(x=>x.id===2&&x.module==='green-api:getMessage'),'INGRESS_MAKE_EXISTING_READERS_REQUIRED');
  if(moduleId!==undefined)c.need(Number.isInteger(moduleId)&&moduleId>2&&
    current.modules.some(x=>x.id===moduleId&&x.module==='google-cloud-firestore:createDocument'),'INGRESS_MAKE_EXISTING_QUEUE_MODULE_REQUIRED');
  return{scenarioId:c.SCENARIO,expectedLastEdit:current.scenario.lastEdit};
}
function assertReaderConfigs(configs){
  const modules=configs?.modules||configs;
  const reader=modules?.find(x=>x.id===1)?.config,detail=modules?.find(x=>x.id===2)?.config;
  c.need(reader?.parameters?.__IMTCONN__===GREEN_CONNECTION&&reader.parameters.minutes===15&&reader.parameters.onlyFrom===false&&
    reader.mapper?.limit===100&&detail?.parameters?.__IMTCONN__===GREEN_CONNECTION&&
    detail.mapper?.chatId==='{{1.chatId}}'&&detail.mapper?.idMessage==='{{1.idMessage}}','INGRESS_MAKE_READER_PREIMAGE_CHANGED');
}
function probeFields(nonce){
  c.need(/^[a-f0-9]{64}$/.test(nonce||''),'INGRESS_MAKE_PROBE_NONCE_REQUIRED');
  return{schema:c.PROBE_SCHEMA,provider:'greenapi',tenantId:c.TENANT,country:c.COUNTRY,instanceId:c.INSTANCE,scenarioId:c.SCENARIO,nonce};
}
function addDisabledProbe(current,configs,{nonce,previewOnly=true}){
  const base=checked(current);assertReaderConfigs(configs);
  c.need(current.modules.length===2&&current.modules.find(x=>x.id===1)?.root==='main','INGRESS_MAKE_UNEXPECTED_EXISTING_WRITER');
  return{...base,operations:[{op:'module_add',module:'google-cloud-firestore:createDocument',version:1,follows:2,disabled:true,
    label:'Ingreso AyS · sonda autenticada cerrada',config:queueConfig(probeFields(nonce),previewOnly)}]};
}
function probeAtRoot(current,moduleId,{nonce,previewOnly=true}){
  const base=checked(current,moduleId);
  // Make assigns the module ID on the preceding save. This second CAS makes
  // one probe run even when the incoming-message search has zero bundles.
  return{...base,operations:[
    {op:'module_config_set',moduleId,config:queueConfig(probeFields(nonce),previewOnly)},
    {op:'module_move',moduleId:1,follows:moduleId},
    {op:'module_move',moduleId,root:'main'},
    {op:'filter_set',moduleId,remove:true},
    {op:'module_disabled_set',moduleId,disabled:false}
  ]};
}
function previewFixtureAtRoot(current,moduleId,fixtureEnvelope){
  const base=checked(current,moduleId);
  const fake={params:{requestId:'synthetic-validation-only'},data:{ref:{path:`tenants/${c.TENANT}/${c.PREVIEW_QUEUE}/synthetic-validation-only`},data:()=>fixtureEnvelope}};
  c.envelope(fake,true);
  return{...base,operations:[{op:'module_config_set',moduleId,config:queueConfig(fixtureEnvelope,true)},
    {op:'module_move',moduleId:1,follows:moduleId},{op:'module_move',moduleId,root:'main'},
    {op:'filter_set',moduleId,remove:true},{op:'module_disabled_set',moduleId,disabled:false}]};
}
function realWriter(current,moduleId){
  const base=checked(current,moduleId);
  const fields={schema:c.SCHEMA,provider:'greenapi',tenantId:c.TENANT,country:c.COUNTRY,instanceId:c.INSTANCE,scenarioId:c.SCENARIO,
    messageId:'{{2.idMessage}}',chatId:'{{2.chatId}}',sourceType:'{{2.extendedTextMessage.sourceType}}',
    sourceId:'{{2.extendedTextMessage.sourceId}}',ctwaClid:'{{2.extendedTextMessage.ctwaClid}}'};
  const filter={name:'Solo anuncio entrante individual con atribución',conditions:[[
    condition('{{2.type}}','text:equal','incoming'),condition('{{2.typeMessage}}','text:equal','extendedTextMessage'),
    condition('{{2.chatId}}','text:pattern','^[1-9][0-9]{7,14}@c\\.us$'),
    condition('{{2.senderId}}','text:equal','{{2.chatId}}'),condition('{{2.idMessage}}','exist'),
    condition('{{2.extendedTextMessage.sourceType}}','text:equal','ad'),condition('{{2.extendedTextMessage.sourceId}}','exist')]]};
  return{...base,operations:[
    {op:'module_config_set',moduleId,config:queueConfig(fields,false)},
    {op:'module_move',moduleId:1,root:'main'},{op:'module_move',moduleId,follows:2},
    {op:'filter_set',moduleId,filter},{op:'module_disabled_set',moduleId,disabled:false}
  ]};
}
function restoreReader(current,moduleId,backup){
  const base=checked(current,moduleId);assertReaderConfigs(backup.modules);
  c.need(backup.scenario?.scenario?.id===c.SCENARIO,'INGRESS_MAKE_BACKUP_SCOPE_MISMATCH');
  const old=backup.scenario;
  return{...base,operations:[{op:'module_move',moduleId:1,root:'main'},
    {op:'module_remove',moduleId},{op:'module_config_set',moduleId:1,config:backup.modules.modules.find(x=>x.id===1).config},
    {op:'module_config_set',moduleId:2,config:backup.modules.modules.find(x=>x.id===2).config},
    {op:'filter_set',moduleId:2,filter:old.modules.find(x=>x.id===2).filter}]};
}
module.exports={GREEN_CONNECTION,TEAM,PROJECT_ROOT,queueConfig,assertReaderConfigs,addDisabledProbe,probeAtRoot,previewFixtureAtRoot,realWriter,restoreReader};
