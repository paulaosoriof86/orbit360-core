'use strict';
// Synthetic, in-memory UI/transport tests. No Firebase SDK, credential, network,
// real document, real identity, payment writer, or production store is used.
const assert=require('node:assert/strict'),test=require('node:test'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {prepareInput}=require('../functions/cobros-source-intake-v2');
const ROOT=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const CLIENT=read('orbit360-platform/core/cobros-reconciliation-domain-client.js');
const UI=read('orbit360-platform/modules/importar-p0-confirmacion.js');
const clone=v=>JSON.parse(JSON.stringify(v)),sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const values={documentRef:'drive:synthetic_document_123456',country:'GT',currency:'GTQ',evidenceAsOfDate:'2026-11-16',evidenceType:'BANK_STATEMENT_MATCH',insurerId:'qa_insurer',sourceAttestation:true,dateFormat:'ISO'};
function file(name,body){const bytes=Buffer.from(body);return{name,size:bytes.length,async text(){return bytes.toString();},async arrayBuffer(){return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);}};}
function resultFor(payload,overrides={}){return{ok:true,status:'SOURCE_RUN_STORED',sourceRunId:'cobledger_v2_'+sha(JSON.stringify(payload)).slice(0,28),sourceDigest:prepareInput('tenant_test',clone(payload)).sourceDigest,sourceSha256:payload.source.sha256,submittedRows:payload.rows.length,counts:{sourceRows:payload.rows.length,proposals:payload.rows.length,holds:0,supportingRows:0,duplicates:0},proposalIds:payload.rows.map(r=>'srcprop_'+r.rowId),readbackConfirmed:true,financialWrites:0,intakeWrites:payload.rows.length*2+4,...overrides};}
function setup(call){
 const calls=[],writes=[];let role='Direccion';
 const context={TextEncoder,Uint8Array,URL,console,crypto:crypto.webcrypto,location:{hostname:'qa--isolated.web.app'},OrbitBackend:{tenantId:'tenant_test',featureFlags:{cobrosReconciliationDomainActive:true}},Orbit:{session:{rol:()=>role},ui:{esc:v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]))},store:{all:()=>[{id:'qa_insurer',nombre:'Aseguradora sintética'}],create(){writes.push('create');},update(){writes.push('update');},upsert(){writes.push('upsert');}},productRuntimeBrowserProvidersP0:{callFunction:async(name,data,region)=>{calls.push(clone({name,data,region}));return call?call(data,calls.length):resultFor(data.payload);}}}};
 context.window=context;vm.createContext(context);vm.runInContext(CLIENT,context);vm.runInContext(UI,context);
 return{context,calls,writes,ui:context.Orbit.importarP0Confirmacion,domain:context.Orbit.reconciliationDomain,setRole:v=>{role=v;}};
}
async function prepared(s,body='policyNumber,receiptNumber,amount,paidDate,actualPaidDateEvidence,invoiceDate,applicationDate\nQA-ONE,REQ-QA-ONE,123.45,2026-11-12,true,2026-11-13,2026-11-14\n',name='synthetic.csv'){
 const original=file(name,body);return{file:original,sha256:await s.ui.fileSha256(original),table:await s.ui.sourceFileTable(original,{})};
}
class Element{
 constructor(attrs='',tag='div'){
  this.tagName=tag;this.attributes={};this.dataset={};this.listeners={};this.children=[];this.disabled=false;this.hidden=false;this.checked=false;this.textContent='';this.value='';this.type='';this.isConnected=true;
  for(const m of attrs.matchAll(/([\w-]+)(?:="([^"]*)")?/g)){this.attributes[m[1]]=m[2]??'';if(m[1]==='value')this.value=m[2]??'';if(m[1]==='type')this.type=m[2]??'';if(['disabled','hidden','checked'].includes(m[1]))this[m[1]]=true;if(m[1].startsWith('data-'))this.dataset[m[1].slice(5).replace(/-([a-z])/g,(_,x)=>x.toUpperCase())]=m[2]??'';}
 }
 set innerHTML(html){
  this._html=html;this.children=[];
  const pattern=/<(input|button|select|fieldset|div|p|a|section)\b([^>]*\bdata-[^>]*)>/g;let m;
  while((m=pattern.exec(html))){const child=new Element(m[2],m[1]);if(m[1]==='select'){const inside=(html.slice(pattern.lastIndex).match(/^([\s\S]*?)<\/select>/)||[])[1]||'',options=[...inside.matchAll(/<option\b([^>]*)>([^<]*)<\/option>/g)];const option=options.find(o=>/\bselected\b/.test(o[1]))||options[0];if(option)child.value=(option[1].match(/value="([^"]*)"/)||[])[1]??option[2];}this.children.push(child);}
 }
 get innerHTML(){return this._html||'';}
 match(selector){const m=/^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(selector);return !!m&&Object.prototype.hasOwnProperty.call(this.attributes,m[1])&&(m[2]===undefined||this.attributes[m[1]]===m[2]);}
 querySelectorAll(selector){return this.children.flatMap(c=>[...(c.match(selector)?[c]:[]),...c.querySelectorAll(selector)]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 addEventListener(name,fn){(this.listeners[name]||=[]).push(fn);}
 async emit(name){if(name==='click'&&this.disabled)return;return Promise.all((this.listeners[name]||[]).map(fn=>fn({target:this})));}
}
function fill(host,name,value){const e=host.querySelector('[data-intake-field="'+name+'"]');assert.ok(e,name);if(e.type==='checkbox')e.checked=value;else e.value=value;return e;}
async function mountReady(s,body){const p=await prepared(s,body),host=new Element(),controller=s.ui.mountSourceIntake(host,{kind:'estados-cuenta',filesReal:[p.file],sourceMetadata:values});await controller.ready;for(const [k,v]of Object.entries(values))if(k!=='dateFormat')fill(host,k,v);return{host,controller,p};}

test('original bytes hash, stable row locator, strict date roles and no financial writes',async()=>{
 const s=setup(),p=await prepared(s),draft=await s.ui.buildSourceIntakeDraft(p,values);assert.equal(p.sha256,sha(await p.file.text()));assert.equal(draft.source.sourceId,'sha256:'+p.sha256);
 assert.equal(draft.rows[0].rowNumber,2);assert.equal(draft.rows[0].sheet,'CSV');assert.equal(draft.rows[0].paidDate,'2026-11-12');assert.equal(draft.rows[0].invoiceDate,'2026-11-13');assert.equal(draft.rows[0].applicationDate,'2026-11-14');assert.equal(draft.source.evidenceAsOfDate,'2026-11-16');
 const again=await s.ui.buildSourceIntakeDraft(p,values);assert.equal(draft.rows[0].rowId,again.rows[0].rowId);assert.ok(Object.isFrozen(draft.rows[0])&&Object.isFrozen(draft.batches[0].source));
 assert.doesNotThrow(()=>prepareInput('tenant_test',clone(draft.batches[0])));const out=await s.ui.submitSourceIntakeDraft(draft);assert.equal(out.financialWrites,0);assert.equal(out.counts.sourceRows,1);assert.equal(s.calls[0].data.operation,'intake_source_run');assert.match(s.calls[0].data.requestId,/^srcui_[a-f0-9]{64}$/);assert.deepEqual(s.writes,[]);
});
test('parser retains physical multiline and blank-row positions and rejects malformed shapes',()=>{
 const {ui}=setup();const p=ui.sourceTable('policyNumber,receiptNumber\n\n"QA-ONE","line\none"\nQA-TWO,REQ2\n','CSV');assert.equal(p.rows[0]._numeroFila,3);assert.equal(p.rows[1]._numeroFila,5);assert.equal(p.rows[0][1],'line\none');
 for(const input of ['policyNumber,policyNumber\nA,B','policyNumber,\nA,B','policyNumber,amount\nA,1,2','policyNumber,amount\n"A"junk,1','policyNumber,amount\n"A,1'])assert.throws(()=>ui.sourceTable(input));
});
test('no fuzzy payment dates and no commission or net-premium column admitted as total paid',async()=>{
 const s=setup();assert.deepEqual(clone(s.ui.mapSourceHeaders(['Póliza','fecha','comision','prima neta'])),{policyNumber:0});
 for(const heading of ['Comisión total','Comision neta','Net premium','Prima neta']){const p=await prepared(s,'policyNumber,'+heading+'\nQA-ONE,12.34');await assert.rejects(()=>s.ui.buildSourceIntakeDraft(p,values,{policyNumber:0,amount:1}),/SOURCE_COMMISSION_IS_NOT_PREMIUM/);}
 const p=await prepared(s,'policyNumber,fecha,amount\nQA-ONE,2026-11-15,12.34');const d=await s.ui.buildSourceIntakeDraft(p,values);assert.equal(d.rows[0].paidDate,undefined);assert.equal(d.rows[0].invoiceDate,undefined);assert.equal(d.rows[0].applicationDate,undefined);
});
test('paid date requires explicit proof; pending evidence cannot be declared payment',async()=>{
 const s=setup(),p=await prepared(s,'policyNumber,paidDate,amount\nQA-ONE,2026-11-14,12.34');await assert.rejects(()=>s.ui.buildSourceIntakeDraft(p,values),/ACTUAL_PAID_DATE_EVIDENCE/);
 const q=await prepared(s,'policyNumber,installment,paidDate,actualPaidDateEvidence\nQA-ONE,1/1,2026-11-14,true');await assert.rejects(()=>s.ui.buildSourceIntakeDraft(q,{...values,evidenceType:'INSURER_STATEMENT_PENDING_FROM_N',completePolicyGroups:true}),/PENDING_IS_NOT_PAYMENT/);
});
test('installment exception is transported only when explicitly documented and never inferred from13',async()=>{
 const s=setup(),plain=await prepared(s,'policyNumber,installment,amount\nQA-ONE,1/13,12.34'),ordinary=await s.ui.buildSourceIntakeDraft(plain,values);assert.equal(ordinary.rows[0].explicitInstallmentException,undefined);assert.equal(ordinary.rows[0].installmentExceptionReference,undefined);
 const p=await prepared(s,'policyNumber,installment,explicitInstallmentException,installmentExceptionReference\nQA-ONE,1/13,true,drive:qa_exception_document_12345'),d=await s.ui.buildSourceIntakeDraft(p,values);assert.equal(d.rows[0].explicitInstallmentException,true);assert.equal(d.rows[0].installmentExceptionReference,'drive:qa_exception_document_12345');assert.doesNotThrow(()=>prepareInput('tenant_test',clone(d.batches[0])));
 for(const tail of ['true,','false,drive:qa_exception_document_12345','true,https://outside.invalid/doc']){const bad=await prepared(s,'policyNumber,explicitInstallmentException,installmentExceptionReference\nQA-ONE,'+tail);await assert.rejects(()=>s.ui.buildSourceIntakeDraft(bad,values),/EXCEPTION_REFERENCE_REQUIRED/);}
});
test('original PDF hash remains distinct from reviewed extraction and invalid source cannot pass',async()=>{
 const s=setup(),original=file('synthetic-original.pdf','%PDF synthetic bytes only');await assert.rejects(()=>s.ui.sourceFileTable(original,{}),/VERIFIED_EXTRACTION_REQUIRED/);
 const extraction=file('synthetic-reviewed.csv','policyNumber,amount\nQA-ONE,12.34');const p={file:original,sha256:await s.ui.fileSha256(original),extractionFile:{fileName:extraction.name,sha256:await s.ui.fileSha256(extraction)},table:s.ui.sourceTable(await extraction.text(),'EXTRACTION')};const d=await s.ui.buildSourceIntakeDraft(p,values);assert.equal(d.source.sha256,sha(await original.text()));assert.equal(d.source.extractionFile.sha256,sha(await extraction.text()));assert.notEqual(d.source.sha256,d.source.extractionFile.sha256);assert.equal(d.rows[0].sheet,'EXTRACTION');
 for(const change of [{sourceAttestation:false},{documentRef:''},{documentRef:'https://outside.invalid/file/d/1234567890/view'},{evidenceAsOfDate:''},{country:''},{currency:''},{country:'GT',currency:'COP'},{currency:'EUR'},{insurerId:''}])await assert.rejects(()=>s.ui.buildSourceIntakeDraft(p,{...values,...change}));
});
test('explicit currency/amount/date validation never invents defaults',async()=>{
 const s=setup();assert.equal(s.ui.sourceAmount('Q 1,234.56','GTQ'),1234.56);assert.equal(s.ui.sourceAmount('1.234,56','GTQ'),1234.56);assert.equal(s.ui.sourceAmount('0.00','GTQ'),0);
 for(const n of ['USD 12.34','$12.34','-12.34','1.23456','1000000001','1,2,3'])assert.throws(()=>s.ui.sourceAmount(n,'GTQ'));
 assert.equal(s.ui.sourceDate('16/11/2026','DMY'),'2026-11-16');for(const d of ['2026-02-30','2026-13-01','11/16/2026'])assert.throws(()=>s.ui.sourceDate(d,'ISO'));
 const p=await prepared(s,'policyNumber,currency,amount\nQA-ONE,USD,12.34');await assert.rejects(()=>s.ui.buildSourceIntakeDraft(p,values),/SOURCE_ROW_SCOPE_CONFLICT/);
});
test('pending suffix complete and batches do not split policy groups',()=>{
 const {ui}=setup(),source={...values,evidenceType:'INSURER_STATEMENT_PENDING_FROM_N',completePolicyGroups:true};const rows=[];for(let p=0;p<3;p++)for(let n=41;n<=100;n++)rows.push({rowId:'qa_'+p+'_'+n,policyNumber:'QA-'+p,installment:n,totalInstallments:100});
 const batches=ui.planSourceIntakeBatches(source,rows);assert.deepEqual(clone(batches.map(b=>b.rows.length)),[60,60,60]);for(const b of batches)assert.equal(new Set(b.rows.map(r=>r.policyNumber)).size,1);
 assert.throws(()=>ui.planSourceIntakeBatches(source,rows.slice(0,59)),/INCOMPLETE/);assert.throws(()=>ui.planSourceIntakeBatches(source,[rows[0],rows[0]]),/INCOMPLETE/);assert.throws(()=>ui.planSourceIntakeBatches({...source,completePolicyGroups:false},rows),/COMPLETE_POLICY_GROUPS/);
 assert.throws(()=>ui.planSourceIntakeBatches(values,Array.from({length:101},(_,n)=>({rowId:'r'+n,policyNumber:'QA-ONE'}))),/OVER_100/);
});
test('readback rejects false success, drift, impossible counts, duplicate IDs and writes',async()=>{
 const s=setup(),p=await prepared(s),payload=(await s.ui.buildSourceIntakeDraft(p,values)).batches[0],valid=resultFor(payload);
 for(const delta of [{ok:false},{readbackConfirmed:false},{financialWrites:1},{sourceSha256:'a'.repeat(64)},{sourceDigest:'bad'},{sourceRunId:null},{submittedRows:2},{intakeWrites:-1},{counts:{...valid.counts,sourceRows:0}},{counts:{...valid.counts,holds:2}},{proposalIds:[]},{status:'SOURCE_RUN_REUSED',intakeWrites:1}])assert.throws(()=>s.domain.validateSourceIntakeReadback(payload,{...valid,...delta}));
 const duplicate={...valid,status:'SOURCE_RUN_REUSED',sourceRunId:null,reusedRunIds:['cobledger_v2_test'],intakeWrites:0,counts:{sourceRows:0,proposals:0,holds:0,supportingRows:0,duplicates:1},proposalIds:[]};assert.equal(s.domain.validateSourceIntakeReadback(payload,duplicate),duplicate);assert.throws(()=>s.domain.validateSourceIntakeReadback(payload,{...duplicate,reusedRunIds:[]}));
});
test('double request is coalesced and same immutable draft can safely retry after transport failure',async()=>{
 let release;const s=setup(async(data,n)=>{if(n===1)await new Promise(r=>{release=r;});return resultFor(data.payload);});const d=await s.ui.buildSourceIntakeDraft(await prepared(s),values);const first=s.ui.submitSourceIntakeDraft(d),second=s.ui.submitSourceIntakeDraft(d);
 while(!release)await new Promise(r=>setImmediate(r));assert.equal(s.calls.length,1);release();await Promise.all([first,second]);assert.equal(s.calls.length,1);
 const f=setup(async(data,n)=>{if(n===1)throw new Error('SYNTHETIC_TRANSPORT_FAILURE');return resultFor(data.payload,{status:'SOURCE_RUN_REUSED',intakeWrites:0});}),retry=await f.ui.buildSourceIntakeDraft(await prepared(f),values);await assert.rejects(()=>f.ui.submitSourceIntakeDraft(retry),/TRANSPORT/);await f.ui.submitSourceIntakeDraft(retry);assert.equal(f.calls[0].data.requestId,f.calls[1].data.requestId);assert.deepEqual(f.calls[0].data.payload,f.calls[1].data.payload);assert.deepEqual(f.writes,[]);
});
test('partial multi-batch failure is not complete and replay preserves all metadata',async()=>{
 const s=setup(async(data,n)=>{if(n===2)throw new Error('SYNTHETIC_BATCH_FAILURE');return resultFor(data.payload);});const body='policyNumber,amount\n'+Array.from({length:101},(_,n)=>'QA-'+n+',1.00').join('\n'),d=await s.ui.buildSourceIntakeDraft(await prepared(s,body),values);
 await assert.rejects(()=>s.ui.submitSourceIntakeDraft(d),error=>error.sourceIntakePartialResults.length===1);assert.equal(s.calls.length,2);assert.deepEqual(s.calls[0].data.payload.source,s.calls[1].data.payload.source);assert.deepEqual(s.writes,[]);
});
test('ordinary UI click waits for server, locks duplicate clicks and reveals link only after durable readback',async()=>{
 let release;const s=setup(async data=>{await new Promise(r=>{release=r;});return resultFor(data.payload);});const {host,controller}=await mountReady(s);const save=host.querySelector('[data-intake-submit]'),link=host.querySelector('[data-intake-conciliaciones]');assert.equal(save.disabled,true);assert.equal(link.hidden,true);
 await controller.review();assert.equal(save.disabled,false);const one=save.emit('click'),two=save.emit('click');while(!release)await new Promise(r=>setImmediate(r));assert.equal(s.calls.length,1);assert.equal(save.disabled,true);assert.equal(link.hidden,true);assert.equal(controller.status().busy,true);release();await Promise.all([one,two]);assert.equal(link.hidden,false);assert.equal(controller.status().completed,true);assert.match(host.querySelector('[data-intake-result]').textContent,/Pagos aplicados: 0/);assert.deepEqual(s.writes,[]);
});
test('ordinary UI incomplete readback remains HOLD and retries identical locked draft',async()=>{
 const s=setup(async(data,n)=>n===1?resultFor(data.payload,{readbackConfirmed:false}):resultFor(data.payload,{status:'SOURCE_RUN_REUSED',intakeWrites:0}));const {host,controller}=await mountReady(s);await controller.review();const save=host.querySelector('[data-intake-submit]');await save.emit('click');assert.equal(host.querySelector('[data-intake-conciliaciones]').hidden,true);assert.equal(save.disabled,false);assert.equal(host.querySelector('[data-intake-fields]').disabled,true);assert.equal(controller.status().completed,false);await save.emit('click');assert.equal(host.querySelector('[data-intake-conciliaciones]').hidden,false);assert.deepEqual(s.calls[0].data.payload,s.calls[1].data.payload);
});
test('mapping/metadata change invalidates reviewed state, including async review race',async()=>{
 const s=setup(),{host,controller}=await mountReady(s);await controller.review();const e=fill(host,'currency','USD');await e.emit('input');assert.equal(host.querySelector('[data-intake-submit]').disabled,true);
 fill(host,'currency','GTQ');const pending=controller.review();fill(host,'currency','USD');await e.emit('change');await pending;assert.equal(host.querySelector('[data-intake-submit]').disabled,true);assert.equal(s.calls.length,0);
});
test('drawer hook intercepts source kinds only and preserves canonical policy writer routing',()=>{
 const code=read('orbit360-platform/core/importa.js'),hub=read('orbit360-platform/modules/importar.js');assert.match(code,/state\.modo !== 'documental' && \['estados-cuenta', 'planillas-comision'\]\.includes\(state\.kind\)/);assert.match(code,/Source runs never reach sample previews/);assert.match(code,/mountSourceIntake\(holder/);assert.match(code,/if \(isSourceIntake\(\)\) \{ state\.step = 2; paint\(\); return; \}/);assert.doesNotMatch(hub,/sampleBatch/);assert.match(hub,/__p0DryRunLastReport/);
 assert.ok(code.includes("canonicalOwner: 'Orbit.policyReceipts', atomic: true"));assert.ok(code.includes("if (kind === 'polizas') return await applyPolicyImport(cfg, idx)"));
});
test('signed-driver synthetic fixture hashes the actual CSV and UI produces the exact preauthorized payload',async()=>{
 const {sourceIntakeFixture,intakeUiRequest}=require('./gravicentra-i6-6-proposal-application-signed-uat.cjs');
 const fixture=sourceIntakeFixture('synthetic_fixture_1234','qa_insurer','qa_actor_uid'),s=setup(),original=file(fixture.payload.source.fileName,fixture.bytes);
 const p={file:original,sha256:await s.ui.fileSha256(original),table:await s.ui.sourceFileTable(original,{})};const d=await s.ui.buildSourceIntakeDraft(p,{...fixture.payload.source,sourceAttestation:true,dateFormat:'ISO'});
 assert.deepEqual(clone(d.batches[0]),fixture.payload);assert.equal(fixture.qaRunId,'cobledgerqa_'+prepareInput('alianzas-soluciones',fixture.payload).batchDigest.slice(0,28));assert.equal(fixture.permission.intakePermission.sourceSha256,sha(fixture.bytes));assert.equal(fixture.permission.intakePermission.actorUid,'qa_actor_uid');assert.ok(fixture.permission.intakePermission.authorized===true);assert.throws(()=>sourceIntakeFixture('not long','qa_insurer','qa_actor'));
 const endpoint='https://us-central1-ays-orbit-360-lab.cloudfunctions.net/orbit360CobrosReconciliationCommandPreview';const data={tenantId:'alianzas-soluciones',activeRole:'Dirección',operation:'intake_source_run',payload:fixture.payload};const request={url:()=>endpoint,method:()=>'POST',postDataJSON:()=>({data})};assert.equal(intakeUiRequest(request,fixture,{phase:'PREVIEW'}),true);
 assert.equal(intakeUiRequest({...request,method:()=>'GET'},fixture,{phase:'PREVIEW'}),false);assert.equal(intakeUiRequest({...request,url:()=>endpoint+'?unexpected=1'},fixture,{phase:'PREVIEW'}),false);assert.equal(intakeUiRequest({...request,postDataJSON:()=>({data:{...data,payload:{...fixture.payload,sourceAttestation:false}}})},fixture,{phase:'PREVIEW'}),false);
});
