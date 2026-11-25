import {test} from 'node:test';
import * as snapshot from './gravicentra-i6-5-encrypted-live-snapshot.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {ALICE_PROFILE,ALICE_COLLECTIONS,ALICE_REQUEST,ALICE_PUBLIC_KEY,ALICE_EXECUTOR_PATHS,ALICE_WORKBOOK_SHA256,ALICE_READ_SCOPE,ALICE_FIELDS,validateAliceRequest,classifyAliceCountry,projectAliceRecord,captureAliceSnapshot,encryptAliceSnapshot,alicePublicReceipt} from './gravicentra-i6-5-encrypted-live-snapshot.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+Buffer.byteLength(b)+'\0'),Buffer.from(b)])).digest('hex');
const bytes=o=>Buffer.from(JSON.stringify(o));
const decisionPath='artifacts/orbit360-recovery/release-control/I6_6_DIRECTION_OPERATIONAL_FINDINGS_AND_PROSPECTIVE_LEADS_20261124_R60.json';
const decisionBytes=fs.readFileSync(path.join(root,decisionPath));
const keys=crypto.generateKeyPairSync('rsa',{modulusLength:3072,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
const historicalRequestBytes=process.env.GI_ALICE_TEST_BASE_REQUEST?fs.readFileSync(process.env.GI_ALICE_TEST_BASE_REQUEST):execFileSync('git',['show','4e8322fb230a270f79791ed408ad954254ce1870:'+ALICE_REQUEST],{cwd:root,maxBuffer:2000000});
assert.equal(blob(historicalRequestBytes),'f397fe85f5abe172446eb61b6f71e913e70d39b2','Historical full-census fixture must remain the exact observed request, not the current mutable profile');
function fixture(){
 const request=JSON.parse(historicalRequestBytes);request.status='AUTHORIZED_READ_ONLY_MATCHING';
 const progress={prospectiveLeadPriority:{decision:{path:decisionPath,gitBlobSha:blob(decisionBytes)}}},progressBytes=bytes(progress),state={currentIteration:6,dataCutoff:'2026-07-31'},stateBytes=bytes(state);
 const control={postproductionDataUpdateControl:{status:'I6_6_SCOPED_SOURCE_REFRESH_ACTIVE',executionCursor:'I6_6_SYNTHETIC_READ_ONLY_CURSOR'},i66ActiveRecoveryCursor:{currentEvidencePath:request.authority.currentProgressPath,currentEvidenceBlobSha:blob(progressBytes)}},controlBytes=bytes(control);
 Object.assign(request.authority,{sourceBaseHead:'a'.repeat(40),controlPlaneBlobSha:blob(controlBytes),recoveryStateBlobSha:blob(stateBytes),currentProgressBlobSha:blob(progressBytes),executionCursor:control.postproductionDataUpdateControl.executionCursor});
 request.publicKeySha256=sha(keys.publicKey);
 const fileBytes=Object.fromEntries(ALICE_EXECUTOR_PATHS.map(p=>[p,Buffer.from('synthetic executable '+p)]));fileBytes[ALICE_PUBLIC_KEY]=Buffer.from(keys.publicKey);
 request.executableFiles=Object.fromEntries(ALICE_EXECUTOR_PATHS.map(p=>[p,blob(fileBytes[p])]));
 return {request,requestBytes:bytes(request),control,controlBytes,state,stateBytes,progress,progressBytes,decisionBytes,publicKeyBytes:Buffer.from(keys.publicKey),fileBytes,branch:'recovery/fase-a-clean-20260831',head:'b'.repeat(40)};
}
function changed(mutator){const f=fixture();mutator(f);f.requestBytes=bytes(f.request);return f;}
test('Current I6.6 request binds exact workbook, three collections and current control without October authority',()=>{
 const f=fixture(),r=validateAliceRequest(f);assert.equal(r.profile,ALICE_PROFILE);assert.equal(r.source.workbookSha256,ALICE_WORKBOOK_SHA256);assert.deepEqual(r.collections,['negocios','clientes','polizas']);assert.equal(r.authority.formalDataCutoff,'2026-07-31');assert.equal(r.source.latestAdvanceVerified,false);
});
test('Inactive prepared draft cannot be used for a capture',()=>assert.throws(()=>validateAliceRequest(changed(f=>f.request.status='PREPARED_NOT_ACTIVE')),/PROFILE_NOT_ACTIVE/));
test('Unknown profile, tenant, country, branch and extra request field fail closed',()=>{
 for(const m of [f=>f.request.profile='OCTOBER',f=>f.request.tenantId='other',f=>f.request.riskCountry='CO',f=>f.branch='main',f=>f.request.extra=true])assert.throws(()=>validateAliceRequest(changed(m)),/I66_ALICE_/);
});
test('Workbook mutation, later advance and unverified latest-source claim fail closed',()=>{
 for(const m of [f=>f.request.source.workbookSha256='0'.repeat(64),f=>f.request.source.advance=11,f=>f.request.source.latestAdvanceVerified=true,f=>f.request.source.declaredCutoff='2026-11-25'])assert.throws(()=>validateAliceRequest(changed(m)),/WORKBOOK_BINDING/);
});
test('Stale control, cutoff, current progress or lead authority cannot authorize the new profile',()=>{
 for(const m of [f=>f.controlBytes=Buffer.from('{}'),f=>f.state.dataCutoff='2026-08-31',f=>f.control.postproductionDataUpdateControl.executionCursor='I6_5_DETERMINISTIC_DIFF',f=>f.progressBytes=Buffer.from('{}'),f=>f.control.i66ActiveRecoveryCursor.currentEvidencePath='old',f=>f.decisionBytes=Buffer.from('{}'),f=>f.request.authority.cursorChanged=true])assert.throws(()=>validateAliceRequest(changed(m)),/I66_ALICE_/);
});
test('Every writer, IAM, backend, grant, token and message capability is rejected',()=>{
 for(const k of Object.keys(fixture().request.capabilities))assert.throws(()=>validateAliceRequest(changed(f=>f.request.capabilities[k]=k==='operationalWrites'?1:true)),/WRITE_OR_PLAINTEXT_DENIED/);
});
test('Extra collection or identity/medical/financial projection and unbounded pagination are rejected',()=>{
 for(const m of [f=>f.request.collections.push('cobros'),f=>f.request.fieldProjection.polizas.push('historiaMedica'),f=>f.request.fieldProjection.negocios.push('notas'),f=>f.request.readScope.nonGtRiskIdentityFieldsRead=true,f=>f.request.maxDocumentsPerCollection=20001,f=>f.request.pageSize=501,f=>f.request.identityBatchSize=30])assert.throws(()=>validateAliceRequest(changed(m)),/I66_ALICE_/);
});
test('Executable/key drift, missing file pin and request-byte mismatch are rejected',()=>{
 for(const m of [f=>f.fileBytes[ALICE_EXECUTOR_PATHS[0]]=Buffer.from('changed'),f=>delete f.request.executableFiles[ALICE_EXECUTOR_PATHS[1]],f=>f.publicKeyBytes=Buffer.from('bad'),f=>f.request.publicKeyPath='other.pem'])assert.throws(()=>validateAliceRequest(changed(m)),/I66_ALICE_/);
 const f=fixture();f.requestBytes=Buffer.from('{}');assert.throws(()=>validateAliceRequest(f),/REQUEST_BYTES/);
});
test('Country aliases preserve explicit Guatemala without guessing missing, numeric or contradictory country',()=>{
 assert.equal(classifyAliceCountry({pais:'Guatemala',country:'gt'}),'GT');assert.equal(classifyAliceCountry({pais:'CO'}),'CO');assert.equal(classifyAliceCountry({}),'MISSING');assert.equal(classifyAliceCountry({pais:502}),'MISSING');assert.equal(classifyAliceCountry({pais:'GT',country:'CO'}),'CONFLICT');assert.throws(()=>classifyAliceCountry({pais:'GT',tenantId:'other'}),/DOCUMENT_TENANT/);
});
const timestamp=(n=0)=>({seconds:1795564800,nanoseconds:n});
const record=(id,data,version=0)=>({id,raw:data,createTime:timestamp(),updateTime:timestamp(version),readTime:timestamp(1)});
const docOf=(r,fields)=>({...r,data:()=>Object.fromEntries(Object.entries(r.raw).filter(([k])=>!fields||fields.includes(k)))});
function database(rows,hooks={}){
 const reads=[];
 function ref(name){
  assert.ok(ALICE_COLLECTIONS.includes(name));
  function query(state={}){
   return {orderBy(k){assert.equal(k,'__name__');return query({...state,ordered:true});},select(...fields){return query({...state,fields});},limit(n){return query({...state,limit:n});},startAfter(id){return query({...state,after:id});},where(k,op,ids){assert.equal(k,'__name__');assert.equal(op,'in');return query({...state,ids});},async get(){
    reads.push({name,...state});let list=[...(rows[name]||[])].sort((a,b)=>Buffer.compare(Buffer.from(a.id),Buffer.from(b.id)));
    if(state.ids){assert.ok(state.ids.length<=10);assert.deepEqual(state.fields,ALICE_FIELDS[name]);list=list.filter(x=>state.ids.includes(x.id));}
    else{assert.deepEqual(state.fields,['tenantId','pais','country']);assert.equal(state.ordered,true);if(state.after)list=list.filter(x=>Buffer.compare(Buffer.from(x.id),Buffer.from(state.after))>0);list=list.slice(0,state.limit);}
    if(hooks.page)list=hooks.page({name,state,list,reads});return {docs:list.map(x=>docOf(x,state.fields)),readTime:timestamp(reads.length)};
   }};
  }
  return query();
 }
 return {reads,db:{collection(n){assert.equal(n,'tenants');return {doc(t){assert.equal(t,'alianzas-soluciones');return {collection(n){assert.equal(n,'data');return {doc(name){return {collection(n){assert.equal(n,'items');return ref(name);}};}};}};}};}}};
}
function records(){return Object.fromEntries(ALICE_COLLECTIONS.map(n=>[n,[
 record('a-gt',{tenantId:'alianzas-soluciones',pais:'GT',nombre:'SYNTHETIC_PRIVATE_GT',telefono:'+50200000001',producto:'Producto sintético',etapa:'seguimiento',clienteId:'synthetic-related-client',password:'DENIED_SECRET',notas:'DENIED_MEDICAL_OR_FINANCIAL_NOTE',historiaMedica:{diagnosis:'DENIED_DIAGNOSIS'},monto:555,bankAccount:'DENIED_BANK'}),
 record('b-co',{pais:'CO',nombre:'DENIED_CO_NAME',telefono:'+5700000000'}),
 record('c-unknown',{nombre:'DENIED_NO_COUNTRY_NAME'}),
 record('d-conflict',{pais:'GT',country:'CO',nombre:'DENIED_CONFLICT_NAME'}),
 record('e-gt',{pais:'Guatemala',country:'GT',nombre:'SYNTHETIC_SECOND_GT',telefono:'+10000000002',etapa:'emitido',archivado:true})
 ]]));}
test('Paginated country directory reads only country metadata before the scoped identity projections; GT risks and the complete tenant client index exhaust all pages',async()=>{
 const f=fixture(),fake=database(records());f.request.pageSize=2;
 const p=await captureAliceSnapshot({db:fake.db,request:f.request,requestBytes:bytes(f.request),head:f.head});
 assert.deepEqual(p.counts,{negocios:2,clientes:5,polizas:2});assert.equal(fake.reads.length,12);
 for(const name of ALICE_COLLECTIONS){const c=p.collections[name];assert.equal(c.scanned,5);assert.equal(c.pages,3);assert.equal(c.paginationComplete,true);assert.equal(c.gt,2);assert.equal(c.co,1);assert.equal(c.otherCountry,0);assert.equal(c.missingCountry,1);assert.equal(c.conflictingCountry,1);assert.equal(c.countryFactsComplete,false);assert.equal(c.countryFilterApplied,name!=='clientes');assert.equal(c.exported,name==='clientes'?5:2);assert.equal(c.absenceInferenceAllowed,false);}
 assert.equal(p.data.negocios[1].telefono,'+10000000002');assert.equal(p.data.negocios[1].archivado,true);assert.equal(p.data.negocios[1].etapa,'emitido');assert.equal(p.eligibleForImport,false);assert.equal(p.writes,0);
 const raw=JSON.stringify(p);for(const marker of ['DENIED_SECRET','DENIED_DIAGNOSIS','DENIED_BANK','DENIED_MEDICAL_OR_FINANCIAL_NOTE','password','historiaMedica','bankAccount','monto','notas'])assert.equal(raw.includes(marker),false,marker);
});
test('A full final page requires an explicit empty page before completeness',async()=>{
 const f=fixture(),rows=Object.fromEntries(ALICE_COLLECTIONS.map(n=>[n,records()[n].filter(x=>['a-gt','e-gt'].includes(x.id))]));f.request.pageSize=2;
 const p=await captureAliceSnapshot({db:database(rows).db,request:f.request,requestBytes:bytes(f.request),head:f.head});for(const c of Object.values(p.collections)){assert.equal(c.pages,2);assert.equal(c.paginationComplete,true);assert.equal(c.countryFactsComplete,true);assert.equal(c.absenceInferenceAllowed,false);}
});
test('Empty collections finish with zero identities and no GT identity reads',async()=>{
 const f=fixture(),fake=database({}),p=await captureAliceSnapshot({db:fake.db,request:f.request,requestBytes:bytes(f.request),head:f.head});assert.deepEqual(p.counts,{negocios:0,clientes:0,polizas:0});assert.equal(fake.reads.length,3);assert.equal(fake.reads.some(x=>x.ids),false);
});
test('Document limit aborts without calling a writer or exporting partial success',async()=>{
 const f=fixture();f.request.maxDocumentsPerCollection=1;f.request.pageSize=2;await assert.rejects(captureAliceSnapshot({db:database(records()).db,request:f.request,requestBytes:bytes(f.request),head:f.head}),/DOCUMENT_BOUND_EXCEEDED/);
});
test('Repeated page or cursor regression fails instead of claiming completeness',async()=>{
 const f=fixture();f.request.pageSize=1;const fake=database(records(),{page:({name,state,list})=>state.after?[records()[name][0]]:list});await assert.rejects(captureAliceSnapshot({db:fake.db,request:f.request,requestBytes:bytes(f.request),head:f.head}),/PAGINATION_DUPLICATE_OR_ORDER/);
});
test('A record changed between the country directory and identity projection fails exact readback',async()=>{
 const f=fixture(),fake=database(records(),{page:({state,list})=>state.ids?list.map(x=>({...x,updateTime:timestamp(900)})):list});await assert.rejects(captureAliceSnapshot({db:fake.db,request:f.request,requestBytes:bytes(f.request),head:f.head}),/CHANGED_DURING_CAPTURE/);
});
test('Disappeared or duplicate identity cannot be hidden by pagination counts',async()=>{
 const f=fixture();for(const mutate of [list=>list.slice(1),list=>[list[0],list[0]]]){const fake=database(records(),{page:({state,list})=>state.ids?mutate(list):list});await assert.rejects(captureAliceSnapshot({db:fake.db,request:f.request,requestBytes:bytes(f.request),head:f.head}),/IDENTITY_DISAPPEARED|UNREQUESTED_OR_DUPLICATE_IDENTITY/);}
});
test('A country change or foreign tenant after the directory scan cannot export identity',async()=>{
 const f=fixture();for(const change of [{pais:'CO',country:'CO'},{tenantId:'foreign'}]){const fake=database(records(),{page:({state,list})=>state.ids?list.map(x=>({...x,raw:{...x.raw,...change}})):list});await assert.rejects(captureAliceSnapshot({db:fake.db,request:f.request,requestBytes:bytes(f.request),head:f.head}),/GT_RISK_OR_TENANT_IDENTITY_REQUIRED|DOCUMENT_TENANT/);}
});
test('Nested values in allowed fields are omitted with an explicit projection hold; no arbitrary nested payload escapes',()=>{
 const r=projectAliceRecord('clientes',docOf(record('synthetic-c',{pais:'GT',id:'stored-other',telefono:{token:'DENIED_NESTED_SECRET'},email:'private@example.invalid',mergedIntoClientId:'synthetic-canonical',fusionado:true})));
 assert.equal(r.telefono,undefined);assert.deepEqual(r.__snapshot.projectionHeldFields,['telefono']);assert.equal(r.__snapshot.idMismatch,true);assert.equal(r.mergedIntoClientId,'synthetic-canonical');assert.equal(r.fusionado,true);assert.equal(JSON.stringify(r).includes('DENIED_NESTED'),false);assert.throws(()=>projectAliceRecord('cobros',docOf(record('x',{pais:'GT'}))),/COLLECTION_DENIED/);
});
test('Missing exact updateTime prevents GT projection and preimage claims',async()=>{
 const f=fixture(),rows=records();rows.negocios[0].updateTime=null;await assert.rejects(captureAliceSnapshot({db:database(rows).db,request:f.request,requestBytes:bytes(f.request),head:f.head}),/UPDATE_TIME_REQUIRED/);
});
test('RSA-OAEP-SHA256 and AES-256-GCM roundtrip authenticates ciphertext; public outputs contain aggregates only',async()=>{
 const f=fixture(),p=await captureAliceSnapshot({db:database(records()).db,request:f.request,requestBytes:bytes(f.request),head:f.head}),e=encryptAliceSnapshot(p,keys.publicKey),encoded=JSON.stringify(e),receipt=alicePublicReceipt(p,e,encoded);
 assert.equal(p.requestSha256,sha(bytes(f.request)));assert.equal(p.requestBlobSha,blob(bytes(f.request)));assert.equal(e.alg,'RSA-OAEP-SHA256+A256GCM');assert.equal(e.authorityBaseHead,f.request.authority.sourceBaseHead);
 const publicText=encoded+JSON.stringify(receipt);for(const marker of ['SYNTHETIC_PRIVATE_GT','+50200000001','synthetic-related-client','a-gt','DENIED_'])assert.equal(publicText.includes(marker),false,marker);
 const aes=crypto.privateDecrypt({key:keys.privateKey,padding:crypto.constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(e.encryptedKey,'base64'));
 function decrypt(tag){const d=crypto.createDecipheriv('aes-256-gcm',aes,Buffer.from(e.iv,'base64'));d.setAuthTag(tag);return Buffer.concat([d.update(Buffer.from(e.ciphertext,'base64')),d.final()]);}
 const gz=decrypt(Buffer.from(e.tag,'base64')),plain=zlib.gunzipSync(gz);assert.equal(sha(gz),e.compressedSha256);assert.equal(sha(plain),e.plaintextSha256);assert.deepEqual(JSON.parse(plain),p);assert.throws(()=>decrypt(Buffer.alloc(16)));assert.equal(receipt.matchingPerformed,false);assert.equal(receipt.eligibleForImport,false);assert.equal(receipt.operationalWrites,0);
});
test('Same existing workflow excludes all51 other jobs, keeps read-only permissions and never uploads raw PII or a key',()=>{
 const wf=fs.readFileSync(path.join(root,'.github/workflows/gravicentra-recovery-i6-postsalida.yml'),'utf8'),jobs=wf.split('\njobs:\n')[1],blocks=[...jobs.matchAll(/^  ([A-Za-z0-9_-]+):\n/gm)];assert.equal(blocks.length,52);
 for(let i=0;i<blocks.length;i++){
  const b=jobs.slice(blocks[i].index,blocks[i+1]?.index??jobs.length);
  if(blocks[i][1]==='i65-encrypted-current-october-readback'){
   assert.match(b,/contents: read/);assert.match(b,/persist-credentials: false/);assert.match(b,/case "\$GITHUB_EVENT_NAME" in workflow_dispatch\|push/);assert.match(b,/test "\$I65_OCTOBER_PRIVATE_READBACK" != "true"/);assert.match(b,/--check-alice-gt-request/);assert.match(b,/--alice-gt-readonly/);assert.match(b,/github\.run_attempt/);assert.doesNotMatch(b,/git (?:push|commit)|firebase deploy|createCustomToken/);
   const aliceUpload=b.slice(b.indexOf('- name: Preserve Alice encrypted artifact'));assert.match(aliceUpload,/i66-alice-gt-matching\.enc\.json/);assert.match(aliceUpload,/i66-alice-gt-matching-receipt\.json/);assert.doesNotMatch(aliceUpload,/\.pem|private\.json|raw|\*\*/);
  }else assert.match(b,/if:.*inputs\.private_alice_matching_readback != true/);
 }
 const source=fs.readFileSync(path.join(root,ALICE_EXECUTOR_PATHS[0]),'utf8'),section=source.slice(source.indexOf('export const ALICE_PROFILE'),source.indexOf('async function runLegacy'));
 assert.doesNotMatch(section,/\b(?:db|tx|ref|target|collection)\.(?:set|update|delete|add|runTransaction|batch)\(|createCustomToken|setCustomUserClaims/);
 assert.equal(ALICE_READ_SCOPE.fullDocuments,false);for(const fields of Object.values(ALICE_FIELDS))for(const denied of ['password','token','notas','comentarios','bitacora','historiaMedica','primaTotal','monto','bankAccount','adjuntos'])assert.equal(fields.includes(denied),false);
});

test('A GT risk can retain its existing CO client without country coercion or a false missing-client conclusion',async()=>{
 const f=fixture(),rows={negocios:[record('n-gt',{pais:'GT',clienteId:'c-co',telefono:'+10000000002',producto:'Producto GT'})],polizas:[record('p-gt',{pais:'GT',clienteId:'c-co',numero:'SYNTHETIC_POLICY'})],clientes:[record('c-co',{pais:'CO',nombre:'SYNTHETIC_CO_CLIENT',telefono:'+10000000002',identificacion:'SYNTHETIC_DOCUMENT'})]};
 const p=await captureAliceSnapshot({db:database(rows).db,request:f.request,requestBytes:bytes(f.request),head:f.head});assert.equal(p.data.clientes[0].pais,'CO');assert.equal(p.data.clientes[0].telefono,'+10000000002');assert.equal(p.data.polizas[0].pais,'GT');assert.equal(p.data.negocios[0].clienteId,p.data.clientes[0].id);assert.equal(p.data.polizas[0].clienteId,p.data.clientes[0].id);assert.equal(p.collections.clientes.countryFilterApplied,false);assert.equal(p.collections.clientes.co,1);assert.equal(p.eligibleForImport,false);
});
test('A client with absent or contradictory country remains in the identity index with explicit country uncertainty',async()=>{
 const f=fixture(),rows={clientes:[record('c-missing',{nombre:'SYNTHETIC_MISSING_COUNTRY',telefono:'+10000000003'}),record('c-conflict',{pais:'GT',country:'CO',nombre:'SYNTHETIC_CONFLICT_COUNTRY',email:'synthetic@example.invalid'})]};
 const p=await captureAliceSnapshot({db:database(rows).db,request:f.request,requestBytes:bytes(f.request),head:f.head});assert.equal(p.counts.clientes,2);assert.equal(p.collections.clientes.missingCountry,1);assert.equal(p.collections.clientes.conflictingCountry,1);assert.equal(p.collections.clientes.countryFactsComplete,false);assert.deepEqual(p.data.clientes.map(r=>r.__snapshot.countryClass),['CONFLICT','MISSING']);assert.equal(p.data.clientes[1].pais,undefined);
});

test('Three canonical phone aliases survive the minimal identity projection without country or prefix coercion',()=>{
 const aliases={movil:'+10000000004',telefonoPrincipal:'+50200000005',telefonoMovil:'+57000000006'};
 for(const collection of ALICE_COLLECTIONS){
  const projected=projectAliceRecord(collection,docOf(record('synthetic-phone-aliases',{pais:collection==='clientes'?'CO':'GT',...aliases})));
  for(const [name,value] of Object.entries(aliases)){assert.ok(ALICE_FIELDS[collection].includes(name));assert.equal(projected[name],value);}
  assert.equal(projected.pais,collection==='clientes'?'CO':'GT');assert.equal(projected.telefono,undefined);
  assert.equal(projected.__snapshot.countryClass,collection==='clientes'?'CO':'GT');
 }
});

test('Alice exact push marker and same SHA admit only its existing encrypted reader and reject profile mixing',()=>{
 const valid={eventName:'push',aliceFlag:'true',octoberFlag:'false',commitMessage:'diagnostic: [alice-private-matching-readback]',repository:'paulaosoriof86/orbit360-core',branch:'recovery/fase-a-clean-20260831',head:'a'.repeat(40),expectedSha:'a'.repeat(40),headCommitSha:'a'.repeat(40)};
 assert.equal(typeof snapshot.validateAliceTrigger,'function');
 assert.equal(snapshot.validateAliceTrigger(valid).readOnly,true);
 assert.equal(snapshot.validateAliceTrigger({...valid,eventName:'workflow_dispatch',commitMessage:'',headCommitSha:undefined}).readOnly,true);
 for(const delta of [{eventName:'pull_request'},{aliceFlag:'false'},{octoberFlag:'true'},
  {commitMessage:'[alice-private-matching-readback] [october-private-readback]'},
  {commitMessage:'[alice-private-matching-readback]suffix'},{commitMessage:'prefix[alice-private-matching-readback]'},
  {commitMessage:'[alice-private-matching-readback] [alice-private-matching-readback]'},
  {commitMessage:'[alice-private-matching-readback-extra]'},{commitMessage:''},
  {headCommitSha:'b'.repeat(40)},{expectedSha:'b'.repeat(40)},
  {repository:'another/repository'},{branch:'main'}])assert.throws(()=>snapshot.validateAliceTrigger({...valid,...delta}));
});
test('Alice push marker isolates all51 legacy jobs and only its encrypted steps without changing approvals',()=>{
 const wf=fs.readFileSync(path.join(root,'.github/workflows/gravicentra-recovery-i6-postsalida.yml'),'utf8'),jobs=wf.split('\njobs:\n')[1],blocks=[...jobs.matchAll(/^  ([A-Za-z0-9_-]+):\n/gm)];
 const selected=(message,inputs={},repository='paulaosoriof86/orbit360-core',ref='refs/heads/recovery/fase-a-clean-20260831')=>blocks.filter((m,i)=>{
  const b=jobs.slice(m.index,blocks[i+1]?.index??jobs.length),line=b.match(/^   if: \$\{\{ (.+) \}\}$/m);assert.ok(line);
  return Function('inputs','github','contains','return ('+line[1]+')')(inputs,{repository,ref,event:{head_commit:{message}}},(a,b)=>String(a||'').includes(b));
 }).map(x=>x[1]);
 const expected=['i65-encrypted-current-october-readback'];
 assert.deepEqual(selected('diagnostic: [alice-private-matching-readback]'),expected);
 assert.deepEqual(selected('',{private_alice_matching_readback:true}),expected);
 assert.deepEqual(selected('[october-private-readback]'),expected);
 assert.deepEqual(selected('[alice-private-matching-readback] [october-private-readback]'),expected);
 assert.deepEqual(selected('[alice-private-matching-readback]suffix'),expected);
 assert.deepEqual(selected('[alice-private-matching-readback]',{},'another/repository'),[]);
 assert.deepEqual(selected('[alice-private-matching-readback]',{},undefined,'refs/heads/main'),[]);
 const b=jobs.slice(blocks.find(x=>x[1]===expected[0]).index);
 assert.doesNotMatch(b,/^   environment:/m);
 assert.match(b,/permissions:\n    contents: read\n    actions: read/);assert.match(b,/PRIVATE_READBACK_HEAD_COMMIT_SHA:/);
 assert.equal((b.match(/if: inputs\.private_alice_matching_readback != true && !contains/g)||[]).length,2);
 assert.equal((b.match(/if: \(inputs\.private_alice_matching_readback == true \|\| contains/g)||[]).length,2);
 for(const required of [ALICE_REQUEST,ALICE_PUBLIC_KEY,'tools/gravicentra-i6-6-alice-private-snapshot.test.mjs'])assert.ok(wf.split('\npermissions:')[0].includes(required));
});

function supplementFixture(){
 const f=fixture();Object.assign(f.request,{profile:snapshot.ALICE_SUPPLEMENT_PROFILE,readScope:structuredClone(snapshot.ALICE_SUPPLEMENT_SCOPE),collections:['negocios'],fieldProjection:{negocios:[...ALICE_FIELDS.negocios]},predecessorCapture:structuredClone(snapshot.ALICE_SUPPLEMENT_PREDECESSOR),maxDocumentsPerCollection:100,pageSize:2,identityBatchSize:3});
 f.requestBytes=bytes(f.request);return f;
}
function unknownBusinessRows(){return {negocios:[
 record('a-gt',{pais:'GT',nombre:'KNOWN_GT_IDENTITY_MUST_NOT_BE_READ',telefono:'+50200000010'}),
 record('b-co',{pais:'CO',nombre:'KNOWN_CO_IDENTITY_MUST_NOT_BE_READ'}),
 record('c-missing',{nombre:'SYNTHETIC_UNKNOWN_CONTACT',telefono:'+10000000011',clienteId:'synthetic-existing-co-client',etapa:'seguimiento',producto:'Producto sintético',password:'DENIED_SECRET',historiaMedica:{diagnosis:'DENIED_MEDICAL'},bankAccount:'DENIED_BANK'}),
 record('d-conflict',{pais:'GT',country:'CO',nombre:'SYNTHETIC_CONFLICT_CONTACT',telefonoPrincipal:'+10000000012'}),
 record('e-missing',{pais:502,nombre:'SYNTHETIC_NUMERIC_COUNTRY_CONTACT',telefonoMovil:'+57000000013',sourceOpportunityId:'synthetic-prior-opportunity'})
 ]};}
const outboundFixture=()=>record('workflow',{version:'synthetic-workflow-version',notificationChannels:['portal','in_app','synthetic-external-channel'],portalResponseEnabled:true,cadenceEnabled:false,password:'DENIED_CONFIG_SECRET',greenApiToken:'DENIED_PROVIDER_CREDENTIAL',stages:{private:'DENIED_UNREQUESTED_CONFIG'}});
function supplementDatabase(rows=unknownBusinessRows(),configuration=outboundFixture(),hooks={}){
 const base=database(rows,hooks),reads=base.reads;
 function configQuery(state={}){return {
  where(field,op,id){assert.deepEqual([field,op,id],['__name__','==','workflow']);return configQuery({...state,id});},
  select(...fields){assert.deepEqual(fields,['version','notificationChannels','portalResponseEnabled','cadenceEnabled']);return configQuery({...state,fields});},
  limit(n){assert.equal(n,2);return configQuery({...state,limit:n});},
  async get(){assert.equal(state.id,'workflow');assert.equal(state.limit,2);assert.ok(state.fields);reads.push({kind:'configuration',fields:state.fields});const docs=configuration?[docOf(configuration,state.fields)]:[];return {docs:hooks.config?hooks.config(docs):docs,readTime:timestamp(99)};}
 };}
 return {reads,db:{collection(name){assert.equal(name,'tenants');return {doc(tenant){assert.equal(tenant,'alianzas-soluciones');return {collection(kind){if(kind==='config')return configQuery();assert.equal(kind,'data');return {doc(collection){assert.equal(collection,'negocios','Supplement must not reread clients, policies or financial collections');return base.db.collection('tenants').doc(tenant).collection('data').doc(collection);}};}};}};}}};
}
test('Supplement preserves exact prior capture and admits only three unknown business identities plus four workflow fields',()=>{
 const f=supplementFixture(),r=validateAliceRequest(f);assert.equal(r.profile,'ALICE_MISSING_BUSINESS_OUTBOUND_MINIMAL_V1');assert.deepEqual(r.collections,['negocios']);assert.equal(r.predecessorCapture.runId,45517303032);assert.equal(r.predecessorCapture.clientIdentitiesAlreadyCaptured,450);assert.equal(r.predecessorCapture.gtPoliciesAlreadyCaptured,1319);assert.equal(r.source.latestAdvanceVerified,false);assert.equal(r.readScope.outboundSuppressionCertified,false);
});
test('Supplement rejects expanded identity count, collections, config fields, predecessor or inferred-country authority',()=>{
 for(const mutate of [f=>f.request.identityBatchSize=4,f=>f.request.maxDocumentsPerCollection=101,f=>f.request.pageSize=26,f=>f.request.collections.push('clientes'),f=>f.request.fieldProjection.negocios.push('notas'),f=>f.request.readScope.maxUnknownBusinessIdentities=4,f=>f.request.readScope.outboundConfigurationFields.push('greenApiToken'),f=>f.request.readScope.riskCountryInferred=true,f=>f.request.predecessorCapture.artifactSha256='0'.repeat(64),f=>f.request.predecessorCapture.extra=true]){const f=supplementFixture();mutate(f);f.requestBytes=bytes(f.request);assert.throws(()=>validateAliceRequest(f),/I66_ALICE_SUPPLEMENT_/);}
});
test('Supplement scans only business country metadata, reads exactly three unknown identities and one masked configuration',async()=>{
 const f=supplementFixture(),fake=supplementDatabase(),p=await captureAliceSnapshot({db:fake.db,request:f.request,requestBytes:f.requestBytes,head:f.head});
 assert.equal(p.profile,'ALICE_MISSING_BUSINESS_OUTBOUND_MINIMAL_V1');assert.deepEqual(p.counts,{negocios:3,workflowConfiguration:1});assert.equal(p.directory.negocios.length,5);assert.equal(p.collections.negocios.pages,3);assert.equal(p.collections.negocios.scanned,5);assert.equal(p.collections.negocios.missingCountry,2);assert.equal(p.collections.negocios.conflictingCountry,1);
 const identityReads=fake.reads.filter(r=>r.ids);assert.equal(identityReads.length,1);assert.deepEqual(identityReads[0].ids,['c-missing','d-conflict','e-missing']);assert.equal(fake.reads.filter(r=>r.kind==='configuration').length,1);assert.equal(p.previousClientOrPolicyReads,0);assert.equal(p.reusedPreviousClientAndPolicyProjection,true);assert.equal(p.data.clientes,undefined);assert.equal(p.data.polizas,undefined);assert.equal(p.eligibleForImport,false);assert.equal(p.absenceInferenceAllowed,false);assert.equal(p.writes,0);
 const text=JSON.stringify(p);for(const secret of ['KNOWN_GT_IDENTITY','KNOWN_CO_IDENTITY','DENIED_SECRET','DENIED_MEDICAL','DENIED_BANK','DENIED_CONFIG_SECRET','DENIED_PROVIDER_CREDENTIAL','DENIED_UNREQUESTED_CONFIG'])assert.equal(text.includes(secret),false,secret);
});
test('Unknown country remains raw and separate from phone and existing cross-border relationship',async()=>{
 const f=supplementFixture(),p=await captureAliceSnapshot({db:supplementDatabase().db,request:f.request,requestBytes:f.requestBytes,head:f.head}),[missing,conflict,numeric]=p.data.negocios;
 assert.equal(missing.pais,undefined);assert.equal(missing.telefono,'+10000000011');assert.equal(missing.clienteId,'synthetic-existing-co-client');assert.equal(conflict.pais,'GT');assert.equal(conflict.country,'CO');assert.equal(conflict.telefonoPrincipal,'+10000000012');assert.equal(numeric.pais,502);assert.equal(numeric.telefonoMovil,'+57000000013');assert.equal(numeric.__snapshot.countryClass,'MISSING');assert.equal(p.riskCountryInferred,false);assert.equal(p.collections.negocios.countryFactsComplete,false);
 assert.throws(()=>snapshot.projectAliceUnknownBusiness(docOf(record('known',{pais:'GT'}))),/UNKNOWN_BUSINESS_SCOPE/);
});
test('Changed unknown count captures encrypted metadata and a hold with zero identity reads, never a wider census',async()=>{
 for(const unknownCount of [0,2,4]){
  const f=supplementFixture(),rows=unknownBusinessRows();rows.negocios=rows.negocios.slice(0,2).concat(Array.from({length:unknownCount},(_,i)=>record('unknown-'+i,{nombre:'MUST_NOT_READ_IDENTITIES'})));const fake=supplementDatabase(rows),p=await captureAliceSnapshot({db:fake.db,request:f.request,requestBytes:f.requestBytes,head:f.head});
  assert.equal(fake.reads.filter(r=>r.ids).length,0);assert.equal(p.counts.negocios,0);assert.ok(p.holds.includes('UNKNOWN_BUSINESS_COUNT_CHANGED_NO_IDENTITY_READS'));assert.equal(p.collections.negocios.identityReadbackExact,false);assert.equal(p.eligibleForImport,false);assert.equal(JSON.stringify(p).includes('MUST_NOT_READ_IDENTITIES'),false);
 }
});
test('Unknown identity drift in updateTime, country, presence or duplicated identity fails before an encrypted success',async()=>{
 for(const mutate of [list=>list.map(r=>({...r,updateTime:timestamp(800)})),list=>list.map(r=>({...r,raw:{...r.raw,pais:'GT',country:'GT'}})),list=>list.slice(1),list=>[list[0],list[0],list[0]]]){
  const f=supplementFixture(),fake=supplementDatabase(unknownBusinessRows(),outboundFixture(),{page:({state,list})=>state.ids?mutate(list):list});await assert.rejects(captureAliceSnapshot({db:fake.db,request:f.request,requestBytes:f.requestBytes,head:f.head}),/CHANGED_DURING_CAPTURE|IDENTITY_DISAPPEARED|UNREQUESTED_OR_DUPLICATE_IDENTITY/);
 }
});
test('Supplement requires bounded ordered pagination, exact times and the authorized tenant even for metadata',async()=>{
 const probes=[{mutate:f=>{f.request.maxDocumentsPerCollection=1;f.requestBytes=bytes(f.request);},hooks:{}},{mutate:()=>{},hooks:{page:({state,list})=>state.after?[unknownBusinessRows().negocios[0]]:list}},{mutate:()=>{},hooks:{page:({list})=>list.map(r=>({...r,updateTime:null}))}},{mutate:()=>{},hooks:{page:({list})=>list.map(r=>({...r,raw:{...r.raw,tenantId:'other'}}))}}];
 for(const probe of probes){const f=supplementFixture();probe.mutate(f);await assert.rejects(captureAliceSnapshot({db:supplementDatabase(unknownBusinessRows(),outboundFixture(),probe.hooks).db,request:f.request,requestBytes:f.requestBytes,head:f.head}),/DOCUMENT_BOUND_EXCEEDED|PAGINATION_DUPLICATE_OR_ORDER|UPDATE_TIME_REQUIRED|DOCUMENT_TENANT/);}
});
test('Raw outbound channels are observed without treating disabled cadence as suppression or applying defaults',async()=>{
 const f=supplementFixture(),p=await captureAliceSnapshot({db:supplementDatabase().db,request:f.request,requestBytes:f.requestBytes,head:f.head}),c=p.outboundConfiguration;
 assert.deepEqual(c.data.notificationChannels,['portal','in_app','synthetic-external-channel']);assert.equal(c.data.cadenceEnabled,false);assert.equal(c.cadenceDisablesOutbox,false);assert.equal(c.defaultsApplied,false);assert.equal(c.notificationSuppressionCertified,false);assert.equal(c.requiresCanonicalWritePlanReview,true);assert.equal(p.eligibleForImport,false);assert.equal(c.path,'tenants/alianzas-soluciones/config/workflow');
});
test('Missing or implicit outbound configuration remains an explicit hold with no assumed channels',async()=>{
 for(const config of [null,record('workflow',{cadenceEnabled:false}),record('workflow',{notificationChannels:null})]){
  const f=supplementFixture(),p=await captureAliceSnapshot({db:supplementDatabase(unknownBusinessRows(),config).db,request:f.request,requestBytes:f.requestBytes,head:f.head});assert.ok(p.holds.some(h=>/OUTBOUND_CONFIGURATION_MISSING|OUTBOUND_CHANNELS_NOT_EXPLICIT_ARRAY/.test(h)));assert.equal(p.outboundConfiguration.defaultsApplied,false);assert.notDeepEqual(p.outboundConfiguration.data.notificationChannels,['portal','in_app']);assert.equal(p.outboundConfiguration.notificationSuppressionCertified,false);
 }
});
test('Malformed allowed values never leak nested config or identity objects and cannot certify matching',async()=>{
 const f=supplementFixture(),rows=unknownBusinessRows();rows.negocios[2].raw.email={password:'DENIED_NESTED_IDENTITY'};rows.negocios[2].raw.id='synthetic-conflicting-id';const config=record('workflow',{notificationChannels:{token:'DENIED_NESTED_CONFIG'},version:{private:'DENIED_VERSION'},cadenceEnabled:false});const p=await captureAliceSnapshot({db:supplementDatabase(rows,config).db,request:f.request,requestBytes:f.requestBytes,head:f.head});
 assert.ok(p.holds.includes('BUSINESS_IDENTITY_PROJECTION_HOLD'));assert.ok(p.holds.includes('OUTBOUND_CONFIGURATION_PROJECTION_HOLD'));assert.equal(p.data.negocios[0].__snapshot.idMismatch,true);for(const secret of ['DENIED_NESTED_IDENTITY','DENIED_NESTED_CONFIG','DENIED_VERSION'])assert.equal(JSON.stringify(p).includes(secret),false);assert.equal(p.eligibleForImport,false);
});
test('Unexpected configuration ID, duplicate document or missing updateTime fails the exact configuration read',async()=>{
 for(const configHook of [docs=>docs.map(d=>({...d,id:'another-config'})),docs=>[...docs,...docs],docs=>docs.map(d=>({...d,updateTime:null}))]){
  const f=supplementFixture();await assert.rejects(captureAliceSnapshot({db:supplementDatabase(unknownBusinessRows(),outboundFixture(),{config:configHook}).db,request:f.request,requestBytes:f.requestBytes,head:f.head}),/OUTBOUND_CONFIGURATION_SCOPE|OUTBOUND_UPDATE_TIME_REQUIRED/);
 }
});
test('Supplement stays encrypted with the existing key algorithm and public outputs exclude business IDs, raw countries and channel values',async()=>{
 const f=supplementFixture(),p=await captureAliceSnapshot({db:supplementDatabase().db,request:f.request,requestBytes:f.requestBytes,head:f.head}),e=encryptAliceSnapshot(p,keys.publicKey),encoded=JSON.stringify(e),r=alicePublicReceipt(p,e,encoded);
 assert.equal(e.profile,p.profile);assert.equal(r.profile,p.profile);assert.equal(r.previousClientOrPolicyReads,0);assert.equal(r.notificationSuppressionCertified,false);assert.equal(r.matchingPerformed,false);assert.equal(r.eligibleForImport,false);assert.equal(r.operationalWrites,0);
 for(const privateValue of ['c-missing','d-conflict','e-missing','synthetic-existing-co-client','synthetic-external-channel','SYNTHETIC_UNKNOWN_CONTACT','+10000000011','synthetic-workflow-version'])assert.equal((encoded+JSON.stringify(r)).includes(privateValue),false,privateValue);
 const aes=crypto.privateDecrypt({key:keys.privateKey,padding:crypto.constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(e.encryptedKey,'base64')),d=crypto.createDecipheriv('aes-256-gcm',aes,Buffer.from(e.iv,'base64'));d.setAuthTag(Buffer.from(e.tag,'base64'));const gz=Buffer.concat([d.update(Buffer.from(e.ciphertext,'base64')),d.final()]),plain=zlib.gunzipSync(gz);assert.equal(sha(plain),e.plaintextSha256);assert.deepEqual(JSON.parse(plain),p);
});
