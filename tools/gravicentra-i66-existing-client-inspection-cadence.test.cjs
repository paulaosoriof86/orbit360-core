'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const source=file=>fs.readFileSync(path.join(root,file),'utf8');
const cliente=source('orbit360-platform/modules/cliente360.js');
const ciclo=source('orbit360-platform/core/ciclo.js');
const leads=source('orbit360-platform/modules/leads.js');
const backend=source('functions/product-ops-leads-domain.js');
const cfg=source('functions/tenant-domain-config.js');
const bridge=source('orbit360-platform/modules/config-domain-v20260804-bridge.js');
class FakeHttpsError extends Error {constructor(code,message){super(message);this.code=code;}}
const text=v=>String(v==null?'':v).trim(),norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,''),unique=v=>[...new Set([].concat(v||[]).map(text).filter(Boolean))];
const workflowSource=cfg.match(/function validateWorkflow\([\s\S]*?(?=\nfunction normalizeInsurerPaymentPlans)/);
assert.ok(workflowSource,'canonical tenant workflow validator must exist');
const validateWorkflow=new Function('text','norm','unique','HttpsError','VERSION',workflowSource[0]+'\nreturn validateWorkflow;')(text,norm,unique,FakeHttpsError,'test-version');
const stages={nuevo:{label:'Nuevo',leads:true,ops:false,next:['inspeccion']},inspeccion:{label:'Inspección',leads:true,ops:true,opsList:'Inspecciones',next:['emitido']},emitido:{label:'Emitido',leads:true,ops:false,terminal:true,next:[]}};

test('Cadencia pertenece al tenant: defaults son día 1, 3, 7, 14 desde creación, no desde Propuesta',()=>{
 const x=validateWorkflow({stages});
 assert.equal(x.cadenceStart,'creation');
 assert.deepEqual(x.cadenceSteps.map(s=>s.day),[1,3,7,14]);
 assert.deepEqual(x.cadenceSteps.map(s=>s.channel),['whatsapp','whatsapp','email','whatsapp']);
 assert.ok(x.cadenceSteps.every(s=>s.templateId&&s.body));
});
test('Admin puede alterar cadencias y plantillas sin código',()=>{
 const steps=[{day:0,channel:'email',label:'Primer contacto',templateId:'test_email',subject:'Hola',body:'Hola {nombre}'},{day:9,channel:'internal',label:'Aviso interno',templateId:'test_internal',body:'Seguimiento'}];
 const x=validateWorkflow({stages,cadenceSteps:steps});
 assert.deepEqual(x.cadenceSteps,steps.map(s=>({day:s.day,channel:s.channel,label:s.label,templateId:s.templateId,subject:s.subject||'',body:s.body})));
});
test('Pasos duplicados, retroceso, salto mayor a un año, correo sin asunto o plantilla vacía se rechazan',()=>{
 const a={day:1,channel:'whatsapp',label:'Inicio',templateId:'test_1',body:'Hola'};
 for(const invalid of [
  [a,{...a,day:1,templateId:'test_2'}],
  [a,{...a,day:0,templateId:'test_2'}],
  [{...a,day:366}],
  [{...a,channel:'email'}],
  [{...a,body:''}],
  [{...a,channel:'telegram'}]
 ])assert.throws(()=>validateWorkflow({stages,cadenceSteps:invalid}),{code:'invalid-argument'});
});
test('Creación de negocio desde Cliente 360 mantiene ID del cliente y etapa Inspecciones en una oportunidad',()=>{
 assert.match(cliente,/Nueva inspección \/ oportunidad/);
 assert.match(cliente,/ciclo\.nuevaOportunidadCliente\('\$\{cid\}',true\)/);
 assert.match(ciclo,/id:'CLIENTE_INSPECCION',label:'Inspección solicitada · Ops y Leads',etapa:'inspeccion',origen:'Leads'/);
 assert.match(ciclo,/clienteId:prefill\.clienteId\|\|''/);
 assert.match(backend,/BUSINESS_EXISTING_CLIENT_SCOPE_MISMATCH/);
 assert.match(backend,/after\.opsVisible=stage\.ops===true/);
 assert.match(backend,/after\.opsList=stage\.opsList/);
 assert.match(ciclo,/if \(L\.kind === 'negocio'\) items = ng\.filter\(n => n\.etapa === L\.etapa\)/);
 assert.match(ciclo,/else items = ng\.filter\(n => n\.etapa === L\.etapa/);
});
test('Solicitud de inspección sin cliente real no crea un negocio duplicado',()=>{
 const helper=ciclo.match(/function nuevaOportunidadCliente\([\s\S]*?(?=\n  \/\* ===================== nuevo negocio)/);
 assert.ok(helper);
 const calls=[],toasts=[];
 const f=new Function('S','U','nuevoNegocio',helper[0]+'\nreturn nuevaOportunidadCliente;')(
  ()=>({get:()=>null}),{toast:m=>toasts.push(m)},prefill=>calls.push(prefill));
 f('missing',true);
 assert.equal(calls.length,0);assert.match(toasts[0],/No se creó una oportunidad/);
});
test('Cliente existente crea prefill con identidad canónica, sin escritura prematura',()=>{
 const helper=ciclo.match(/function nuevaOportunidadCliente\([\s\S]*?(?=\n  \/\* ===================== nuevo negocio)/);
 const calls=[],cli={id:'cli_real',nombre:'Cliente QA',tipo:'Empresa',telefono:'50212345678',email:'qa@example.test',pais:'GT',asesorId:'a1'};
 const f=new Function('S','U','nuevoNegocio',helper[0]+'\nreturn nuevaOportunidadCliente;')(
  ()=>({get:()=>cli}),{toast:()=>assert.fail('unexpected toast')},prefill=>{calls.push(prefill);return 'editor-open';});
 assert.equal(f('cli_real',true),'editor-open');
 assert.equal(calls.length,1);assert.equal(calls[0].clienteId,'cli_real');assert.equal(calls[0].commercialIdentityId,'cli_real');assert.equal(calls[0].inspeccion,true);
});
test('Etapa propuesta no reactiva cadencia desactivada; backend programa a partir de creación',()=>{
 assert.doesNotMatch(ciclo,/if \(etapaId === 'propuesta'\)\s*\{\s*patch\.cadenciaActiva/);
 assert.match(ciclo,/cadenciaActiva:v\('nn-cadence'\)!=='off'/);
 assert.match(backend,/after\.cadenciaInicio=localDate\(\)/);
 assert.match(backend,/plusDays\(after\.cadenciaInicio,delay\+Number\(cfg\.cadenceSteps\[0\]\.day\)\)/);
 assert.match(backend,/nextStep<=steps\.length\?plusDays\(created,Number\(steps\[nextStep-1\]\.day\)\+delay\)/);
});
test('Configuración es protegida y cada aviso externo sigue pendiente hasta confirmación del proveedor',()=>{
 assert.match(bridge,/Orbit\.domainConfig\.save\('workflow', next/);
 assert.match(bridge,/result\.source!=='protected'/);
 assert.match(bridge,/data-wf-cadence-row/);
 assert.match(leads,/Cadencia configurable desde la creación del lead/);
 assert.match(backend,/providerConfirmed:false,templateId:def\.templateId/);
 assert.match(backend,/status:'pending_provider'/);
});
test('Preview no puede disparar tareas LIVE; el barrido pagina sin truncar silenciosamente en 500',()=>{
 assert.match(backend,/previewOnly!==true&&cfg\.cadenceEnabled/);
 assert.match(backend,/PREVIEW_NEVER_SCHEDULED_IN_LIVE/);
 assert.match(backend,/if\(row\.previewWrite===true\|\|row\.archivado===true/);
 assert.match(backend,/orderBy\(FieldPath\.documentId\(\)\)\.limit\(250\)/);
 assert.match(backend,/CADENCE_PAGINATION_LIMIT_REACHED/);
});
