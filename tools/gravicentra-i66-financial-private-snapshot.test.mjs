import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import * as s from './gravicentra-i6-5-encrypted-live-snapshot.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const clone=x=>structuredClone(x),bytes=x=>Buffer.from(JSON.stringify(x));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+Buffer.byteLength(b)+'\0'),Buffer.from(b)])).digest('hex');
const keys=crypto.generateKeyPairSync('rsa',{modulusLength:3072,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
const decisionBytes=fs.readFileSync(path.join(root,s.FINANCIAL_DECISION));
const sourceReceiptBytes=fs.readFileSync(path.join(root,s.FINANCIAL_SOURCE_RECEIPT));
function fixture(){
 const progressPath='artifacts/orbit360-recovery/release-control/I6_6_CURRENT_EXECUTION_PROGRESS_20261125_R999999.json';
 const progress={activeGate:'I6.6',currentDirectionOperationalDecision:{path:s.FINANCIAL_DECISION,gitBlobSha:s.FINANCIAL_DECISION_BLOB},
  newStatementSourceWork20261124:{currentRecoveredSource114:{receipt:{path:s.FINANCIAL_SOURCE_RECEIPT,gitBlobSha:s.FINANCIAL_SOURCE_RECEIPT_BLOB}}}};
 const progressBytes=bytes(progress),state={currentIteration:6,dataCutoff:'2026-07-31'},stateBytes=bytes(state);
 const control={postproductionDataUpdateControl:{status:'I6_6_SCOPED_SOURCE_REFRESH_ACTIVE',executionCursor:'I6_6_SYNTHETIC_READONLY_FIXTURE'},
  i66ActiveRecoveryCursor:{currentEvidencePath:progressPath,currentEvidenceBlobSha:blob(progressBytes)}},controlBytes=bytes(control);
 const fileBytes=Object.fromEntries(s.FINANCIAL_EXECUTOR_PATHS.map(p=>[p,Buffer.from('synthetic-owner:'+p)]));fileBytes[s.FINANCIAL_PUBLIC_KEY]=Buffer.from(keys.publicKey);
 const request={schema:'GRAVICENTRA_I66_FINANCIAL_PRIVATE_READBACK_REQUEST_V1',profile:s.FINANCIAL_PROFILE,
  status:'AUTHORIZED_READ_ONLY_CURRENT_FINANCIAL_BASELINE',projectId:'ays-orbit-360-lab',tenantId:'alianzas-soluciones',
  purpose:'NOVEMBER_RECENT_STATEMENT_RECONCILIATION_PREIMAGES_ONLY',source:clone(s.FINANCIAL_SOURCE),readScope:clone(s.FINANCIAL_READ_SCOPE),
  collections:clone(s.FINANCIAL_COLLECTIONS),configSourceFields:clone(s.FINANCIAL_CONFIG_FIELDS),
  authority:{sourceBaseHead:'a'.repeat(40),controlPlanePath:'artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json',controlPlaneBlobSha:blob(controlBytes),
   recoveryStatePath:'orbit360-platform/docs/recovery/orbit360-recovery-state-v1.json',recoveryStateBlobSha:blob(stateBytes),
   currentProgressPath:progressPath,currentProgressBlobSha:blob(progressBytes),activeGate:'I6.6',formalDataCutoff:'2026-07-31',
   executionCursor:control.postproductionDataUpdateControl.executionCursor,decisionPath:s.FINANCIAL_DECISION,decisionBlobSha:s.FINANCIAL_DECISION_BLOB,
   sourceEvidencePath:s.FINANCIAL_SOURCE_RECEIPT,sourceEvidenceBlobSha:s.FINANCIAL_SOURCE_RECEIPT_BLOB,cursorChanged:false},
  executableFiles:Object.fromEntries(s.FINANCIAL_EXECUTOR_PATHS.map(p=>[p,blob(fileBytes[p])])),maxDocumentsPerCollection:20000,
  publicKeyPath:s.FINANCIAL_PUBLIC_KEY,publicKeySha256:sha(keys.publicKey),
  capabilities:{...Object.fromEntries(s.FINANCIAL_FORBIDDEN.map(k=>[k,false])),operationalWrites:0},encryptedOnly:true,repositoryPlaintextForbidden:true};
 return {request,requestBytes:bytes(request),control,controlBytes,state,stateBytes,progress,progressBytes,decisionBytes,sourceReceiptBytes,
  publicKeyBytes:Buffer.from(keys.publicKey),fileBytes,branch:'recovery/fase-a-clean-20260831',head:'b'.repeat(40)};
}
function changed(mutator){const f=fixture();mutator(f);f.requestBytes=bytes(f.request);return f;}
test('current financial profile binds R60, private27/108 source evidence and current I6.6 without historical October authority',()=>{
 const f=fixture(),r=s.validateFinancialRequest(f);assert.deepEqual(r.collections,['polizas','clientes','aseguradoras','recibosEsperados','carteraPrimas','cobros','asesores']);
 assert.equal(r.authority.formalDataCutoff,'2026-07-31');assert.equal(r.source.documentaryPeriod,'2026-11');assert.equal(r.source.privateReferenceQuery.policies,27);
 assert.equal(r.source.privateReferenceQuery.references,108);assert.equal(r.source.privateReferenceQuery.selectorsPublished,false);assert.equal(r.readScope.separateConfigCollection,false);
 assert.equal(r.capabilities.paymentApplications,false);assert.equal(r.capabilities.receiptCreates,false);
});
test('prepared requests, old grants, another tenant/branch and extra selector fields cannot activate capture',()=>{
 for(const m of [f=>f.request.status='PREPARED_NOT_ACTIVE',f=>f.request.profile='OCTOBER',f=>f.request.authority.activeGate='I6.5',
  f=>f.request.tenantId='other',f=>f.branch='main',f=>f.request.targets=[{policy:'SYNTHETIC_PRIVATE'}],f=>f.request.authority.cursorChanged=true])
  assert.throws(()=>s.validateFinancialRequest(changed(m)),/I66_FINANCIAL_/);
});
test('stale control/state/progress/decision/source pins reject instead of borrowing historical or Alice authorization',()=>{
 for(const m of [f=>f.controlBytes=bytes({}),f=>f.stateBytes=bytes({}),f=>f.progressBytes=bytes({}),f=>f.decisionBytes=bytes({}),f=>f.sourceReceiptBytes=bytes({}),
  f=>f.request.authority.currentProgressPath='old',f=>f.request.authority.executionCursor='I6_5_DETERMINISTIC_DIFF',
  f=>f.progress.currentDirectionOperationalDecision={path:s.ALICE_REQUEST,gitBlobSha:'0'.repeat(40)},f=>f.state.dataCutoff='2026-11-24'])
  assert.throws(()=>s.validateFinancialRequest(changed(m)),/I66_FINANCIAL_/);
});
test('a changed private-query digest, counts, documentary period or false freshness claim is rejected',()=>{
 for(const m of [f=>f.request.source.privateReferenceQuery.sha256='0'.repeat(64),f=>f.request.source.privateReferenceQuery.policies=28,
  f=>f.request.source.privateReferenceQuery.references=109,f=>f.request.source.privateReferenceQuery.selectorsPublished=true,
  f=>f.request.source.documentaryPeriod='2026-10',f=>f.request.source.sourceEvidenceDate='2026-11-25',f=>f.request.source.latestStatementsCompletenessClaimed=true])
  assert.throws(()=>s.validateFinancialRequest(changed(m)),/EXACT_READ_SCOPE/);
});
test('every financial, operational, auth, IAM, deploy, grant and external-message capability remains denied',()=>{
 for(const name of Object.keys(fixture().request.capabilities))assert.throws(()=>s.validateFinancialRequest(changed(f=>f.request.capabilities[name]=name==='operationalWrites'?1:true)),/WRITE_OR_PLAINTEXT_DENIED/);
 for(const name of ['encryptedOnly','repositoryPlaintextForbidden'])assert.throws(()=>s.validateFinancialRequest(changed(f=>f.request[name]=false)),/WRITE_OR_PLAINTEXT_DENIED/);
});
test('no additional collection, config path, unbounded capture or substituted executable/key is accepted',()=>{
 for(const m of [f=>f.request.collections.push('config'),f=>f.request.readScope.separateConfigCollection=true,f=>f.request.configSourceFields.asesores.push('email'),
  f=>f.request.maxDocumentsPerCollection=0,f=>f.request.maxDocumentsPerCollection=20001,f=>f.fileBytes[s.FINANCIAL_EXECUTOR_PATHS[0]]=bytes({changed:true}),
  f=>delete f.request.executableFiles[s.FINANCIAL_TEST],f=>f.request.publicKeyPath=s.ALICE_PUBLIC_KEY,f=>f.publicKeyBytes=Buffer.from('not-a-key')])
  assert.throws(()=>s.validateFinancialRequest(changed(m)),/I66_FINANCIAL_/);
 const f=fixture();f.requestBytes=bytes({});assert.throws(()=>s.validateFinancialRequest(f),/REQUEST_BYTES/);
});
test('weak RSA and non-RSA recipients fail after all source/key pins have been rebound consistently',()=>{
 for(const pair of [crypto.generateKeyPairSync('rsa',{modulusLength:2048}),crypto.generateKeyPairSync('ec',{namedCurve:'prime256v1'})]){
  const f=fixture(),pub=pair.publicKey.export({type:'spki',format:'pem'});f.publicKeyBytes=Buffer.from(pub);f.fileBytes[s.FINANCIAL_PUBLIC_KEY]=Buffer.from(pub);
  f.request.publicKeySha256=sha(pub);f.request.executableFiles[s.FINANCIAL_PUBLIC_KEY]=blob(pub);f.requestBytes=bytes(f.request);
  assert.throws(()=>s.validateFinancialRequest(f),/RECIPIENT_STRENGTH/);
 }
});
const ts=(nanoseconds=123456789)=>({seconds:1795564800,nanoseconds,toDate:()=>new Date('2026-11-25T00:00:00.123Z')});
const doc=(id,data={},updateTime=ts())=>({id,data:()=>data,createTime:ts(0),updateTime,readTime:ts(987654321)});
function fakeDb(records,{readTime=ts(),hook}={}){
 const reads=[],writes=[];const noWrite=kind=>()=>{writes.push(kind);throw Error('UNAUTHORIZED_TEST_MUTATOR');};
 function items(name){return {orderBy(k){assert.equal(k,'__name__');return {limit(limit){return {
  async get(){reads.push({name,limit});const docs=records[name]||[];return {docs:hook?hook(name,docs):docs,readTime};}
 };}};},set:noWrite('set'),add:noWrite('add'),update:noWrite('update'),delete:noWrite('delete')};}
 function data(){return {doc(name){assert.ok(s.FINANCIAL_COLLECTIONS.includes(name));return {
  collection(n){assert.equal(n,'items');return items(name);}
 };}};}
 function tenant(){return {collection(n){assert.equal(n,'data');return data();}};}
 const db={collection(n){assert.equal(n,'tenants');return {doc(t){assert.equal(t,'alianzas-soluciones');return tenant();}};},
  batch:noWrite('batch'),runTransaction:noWrite('runTransaction')};return {db,reads,writes};
}
function records(){return Object.fromEntries(s.FINANCIAL_COLLECTIONS.map(name=>[name,[doc('a-'+name,{tenantId:'alianzas-soluciones',nombre:'SYNTHETIC_PRIVATE_NAME',
  clienteId:'SYNTHETIC_PRIVATE_CLIENT',numeroPoliza:'SYNTHETIC_PRIVATE_POLICY',monto:123.45,id:'stored-alias',comModo:'neta',shareCom:0,comValor:0,
  comisionDefault:0,comisionesProd:{product:15},password:'DIRECTORY_DENIED_SECRET',email:'private@example.invalid',
  ramosDetalle:{r:{productos:['x'],password:'DIRECTORY_DENIED_NESTED_SECRET',cuentas:[{numero:'DIRECTORY_DENIED_BANK'}]}}})]]));}
test('bounded current capture uses the same seven financial projections, retains precise preimages and declares zero writes/non-atomic reads',async()=>{
 const f=fixture(),db=fakeDb(records()),p=await s.captureFinancialSnapshot({db:db.db,request:f.request,requestBytes:f.requestBytes,head:f.head});
 assert.deepEqual(db.reads.map(x=>x.name),s.FINANCIAL_COLLECTIONS);assert.ok(db.reads.every(x=>x.limit===20001));assert.deepEqual(db.writes,[]);
 assert.equal(p.authority.formalDataCutoff,'2026-07-31');assert.equal(p.source.documentaryPeriod,'2026-11');assert.equal(p.authority.sourceBaseHead,'a'.repeat(40));
 assert.equal(p.authorityBaseHead,undefined);assert.equal(p.collectionPeriod,undefined);assert.equal(p.sourceManifestSha256,undefined);
 assert.equal(p.readWindow.atomicAcrossCollections,false);assert.equal(p.readWindow.newDocumentsAfterCollectionReadNotRuledOut,true);
 assert.equal(p.eligibleForWrite,false);assert.equal(p.matchingPerformed,false);assert.equal(p.absenceInferenceAllowed,false);assert.equal(p.operationalWrites,0);
 assert.equal(p.paymentsApplied,0);assert.equal(p.receiptsCreated,0);assert.equal(p.commissionConfiguration.defaultsApplied,false);
 assert.equal(p.data.polizas[0].numeroPoliza,'SYNTHETIC_PRIVATE_POLICY');assert.equal(p.data.polizas[0].monto,123.45);
 assert.deepEqual(p.data.polizas[0].__snapshot.updateTimeExact,{seconds:'1795564800',nanoseconds:123456789});
 assert.equal(p.data.polizas[0].canonicalDocumentId,'a-polizas');assert.equal(p.data.polizas[0].__snapshot.idMismatch,true);
 for(const n of ['asesores','aseguradoras']){assert.equal(p.data[n][0].password,undefined);assert.equal(p.data[n][0].email,undefined);assert.equal(JSON.stringify(p.data[n]).includes('DIRECTORY_DENIED'),false);}
 assert.equal(p.data.asesores[0].shareCom,0);assert.equal(p.data.aseguradoras[0].comisionDefault,0);assert.equal(p.collections.polizas.idMismatches,1);
});
test('empty collections are complete observed reads, never an inferred absence or write eligibility',async()=>{
 const f=fixture(),db=fakeDb({}),p=await s.captureFinancialSnapshot({db:db.db,request:f.request,requestBytes:f.requestBytes,head:f.head});
 assert.deepEqual(Object.values(p.counts),[0,0,0,0,0,0,0]);assert.ok(Object.values(p.collections).every(x=>x.complete));assert.equal(p.absenceInferenceAllowed,false);
});
test('collection overflow rejects without returning a partial successful capture or invoking a writer',async()=>{
 const f=fixture();f.request.maxDocumentsPerCollection=1;const db=fakeDb({polizas:[doc('a'),doc('b')]});
 await assert.rejects(s.captureFinancialSnapshot({db:db.db,request:f.request,requestBytes:bytes(f.request),head:f.head}),/DOCUMENT_BOUND_EXCEEDED/);assert.deepEqual(db.writes,[]);
});
test('duplicate/unordered IDs, foreign tenant and missing or invalid exact timestamps reject',async()=>{
 const f=fixture();for(const rows of [[doc('a'),doc('a')],[doc('b'),doc('a')],[doc('a',{tenantId:'foreign'})],[doc('a',{},null)],[doc('a',{},ts(1000000000))]]){
  const db=fakeDb({polizas:rows});await assert.rejects(s.captureFinancialSnapshot({db:db.db,request:f.request,requestBytes:f.requestBytes,head:f.head}),/DUPLICATE_OR_UNORDERED|DOCUMENT_TENANT|EXACT_UPDATE_TIME/);assert.deepEqual(db.writes,[]);
 }
 await assert.rejects(s.captureFinancialSnapshot({db:fakeDb({},{readTime:null}).db,request:f.request,requestBytes:f.requestBytes,head:f.head}),/EXACT_READ_TIME/);
});
test('RSA-OAEP/AES-GCM round-trip authenticates real amounts/identities only inside ciphertext; public receipt is aggregate-only',async()=>{
 const f=fixture(),p=await s.captureFinancialSnapshot({db:fakeDb(records()).db,request:f.request,requestBytes:f.requestBytes,head:f.head}),
  envelope=s.encryptFinancialSnapshot(p,keys.publicKey),encoded=JSON.stringify(envelope),receipt=s.financialPublicReceipt(p,envelope,encoded);
 const text=encoded+JSON.stringify(receipt);for(const marker of ['SYNTHETIC_PRIVATE','stored-alias','a-polizas','DIRECTORY_DENIED','private@example.invalid','123.45'])assert.equal(text.includes(marker),false,marker);
 assert.equal(envelope.authorityBaseHead,p.authority.sourceBaseHead);assert.equal(envelope.formalDataCutoff,'2026-07-31');assert.equal(receipt.documentaryPeriod,'2026-11');
 assert.equal(receipt.containsPlaintextPII,false);assert.equal(receipt.eligibleForWrite,false);assert.equal(receipt.acceptanceGranted,false);assert.equal(receipt.paymentsApplied,0);
 assert.equal(receipt.encryptedPayloadSha256,sha(encoded));assert.equal(receipt.requestSha256,sha(f.requestBytes));
 const aes=crypto.privateDecrypt({key:keys.privateKey,padding:crypto.constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(envelope.encryptedKey,'base64'));
 const decrypt=tag=>{const d=crypto.createDecipheriv('aes-256-gcm',aes,Buffer.from(envelope.iv,'base64'));d.setAuthTag(tag);return Buffer.concat([d.update(Buffer.from(envelope.ciphertext,'base64')),d.final()]);};
 const gz=decrypt(Buffer.from(envelope.tag,'base64')),plain=zlib.gunzipSync(gz);assert.equal(sha(gz),envelope.compressedSha256);assert.equal(sha(plain),envelope.plaintextSha256);
 assert.deepEqual(JSON.parse(plain),JSON.parse(JSON.stringify(p)));assert.throws(()=>decrypt(Buffer.alloc(16)));
 const second=s.encryptFinancialSnapshot(p,keys.publicKey);assert.notEqual(second.iv,envelope.iv);assert.notEqual(second.ciphertext,envelope.ciphertext);
});
const trigger=()=>({eventName:'push',financialFlag:'true',aliceFlag:'false',octoberFlag:'false',commitMessage:'read-only: [i66-financial-private-readback]',
 repository:'paulaosoriof86/orbit360-core',branch:'recovery/fase-a-clean-20260831',head:'a'.repeat(40),expectedSha:'a'.repeat(40),headCommitSha:'a'.repeat(40)});
test('explicit current financial selector permits only canonical push/dispatch and same SHA',()=>{
 assert.equal(s.validateFinancialTrigger(trigger()).readOnly,true);assert.equal(s.validateFinancialTrigger({...trigger(),eventName:'workflow_dispatch',commitMessage:'',headCommitSha:undefined}).readOnly,true);
 for(const delta of [{eventName:'pull_request'},{financialFlag:'false'},{aliceFlag:'true'},{octoberFlag:'true'},
  {commitMessage:'[i66-financial-private-readback] [alice-private-matching-readback]'},{commitMessage:'[i66-financial-private-readback] [october-private-readback]'},
  {commitMessage:'[i66-financial-private-readback] [i66-financial-private-readback]'},{commitMessage:'[i66-financial-private-readback]suffix'},
  {commitMessage:'prefix[i66-financial-private-readback]'},{commitMessage:''},{headCommitSha:'b'.repeat(40)},{expectedSha:'b'.repeat(40)},
  {repository:'other/repository'},{branch:'main'}])assert.throws(()=>s.validateFinancialTrigger({...trigger(),...delta}),/I66_FINANCIAL_/);
});
test('financial selector cannot fall through to Alice, October or legacy mode before credentials/import',()=>{
 for(const args of [[],['--alice-gt-readonly'],['--check-alice-gt-request'],['--october-readonly'],['--check-october-request']]){
  assert.throws(()=>s.validateFinancialModeIsolation(args,{I66_FINANCIAL_PRIVATE_READBACK:'true'}),/MIXED_READ_PROFILES_DENIED/);
  const r=spawnSync(process.execPath,[path.join(root,s.FINANCIAL_EXECUTOR_PATHS[0]),...args],{cwd:root,encoding:'utf8',env:{PATH:process.env.PATH,I66_FINANCIAL_PRIVATE_READBACK:'true'}});
  assert.equal(r.status,42);assert.match(r.stderr,/I66_FINANCIAL_MIXED_READ_PROFILES_DENIED/);assert.doesNotMatch(r.stderr,/firebase|SERVICE_ACCOUNT|ERR_MODULE_NOT_FOUND/);
 }
 assert.throws(()=>s.validateAliceTrigger({...trigger(),aliceFlag:'true',commitMessage:'[alice-private-matching-readback]'}),/MIXED_READ_PROFILES_DENIED/);
});
test('existing workflow financial selector isolates all51 legacy jobs with no new job or plaintext upload',()=>{
 const wf=fs.readFileSync(path.join(root,'.github/workflows/gravicentra-recovery-i6-postsalida.yml'),'utf8'),jobs=wf.split('\njobs:\n')[1],blocks=[...jobs.matchAll(/^  ([A-Za-z0-9_-]+):\n/gm)];assert.equal(blocks.length,52);
 const selected=(message,inputs={},repository='paulaosoriof86/orbit360-core',ref='refs/heads/recovery/fase-a-clean-20260831')=>blocks.filter((m,i)=>{
  const b=jobs.slice(m.index,blocks[i+1]?.index??jobs.length),line=b.match(/^   if: \$\{\{ (.+) \}\}$/m);assert.ok(line);
  return Function('inputs','github','contains','return ('+line[1]+')')(inputs,{repository,ref,event:{head_commit:{message}}},(a,b)=>String(a||'').includes(b));
 }).map(x=>x[1]);
 const expected=['i65-encrypted-current-october-readback'];assert.deepEqual(selected('[i66-financial-private-readback]'),expected);
 assert.deepEqual(selected('',{private_i66_financial_readback:true}),expected);
 assert.deepEqual(selected('[i66-financial-private-readback] [october-private-readback]'),expected);
 assert.deepEqual(selected('[i66-financial-private-readback]',{},'other/repository'),[]);assert.deepEqual(selected('[i66-financial-private-readback]',{},undefined,'refs/heads/main'),[]);
 for(const p of [s.FINANCIAL_REQUEST,s.FINANCIAL_PUBLIC_KEY,s.FINANCIAL_TEST])assert.ok(wf.split('\npermissions:')[0].includes(p));
 const block=jobs.slice(blocks.find(x=>x[1]===expected[0]).index);assert.match(block,/permissions:\n    contents: read\n    actions: read/);assert.match(block,/persist-credentials: false/);
 assert.match(block,/--check-i66-financial-request/);assert.match(block,/--i66-financial-readonly/);assert.match(block,/retention-days: 1/);
 assert.doesNotMatch(block,/git (?:push|commit)|firebase deploy|createCustomToken/);
 const upload=block.slice(block.indexOf('- name: Preserve financial encrypted artifact'));assert.ok(upload.length<block.length,'financial upload must be a separate named step');
 assert.match(upload,/i66-financial-current\.enc\.json/);assert.match(upload,/i66-financial-current-receipt\.json/);assert.doesNotMatch(upload,/\.pem|private-key|raw|\*\*/);
});
