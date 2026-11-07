import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {OCTOBER_COLLECTIONS,OCTOBER_PATHS,OCTOBER_ROOT,OCTOBER_REQUEST,OCTOBER_PUBLIC_KEY,validateOctoberRequest,projectOctoberRecord,captureOctoberSnapshot,encryptOctoberSnapshot} from './gravicentra-i6-5-encrypted-live-snapshot.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const blob=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+Buffer.byteLength(b)+'\0'),Buffer.from(b)])).digest('hex');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const baseHead='e5030ec5ba9854f0c576fd905c2f510766347ffa';
const freezePath=OCTOBER_ROOT+'OWNER_DECISION_FREEZE_AND_RECONCILIATION_PLAN_20261107.json';
const baseFreezeBytes=process.env.GI_OCTOBER_TEST_BASE_FREEZE?fs.readFileSync(process.env.GI_OCTOBER_TEST_BASE_FREEZE):execFileSync('git',['show',baseHead+':'+freezePath],{cwd:root,maxBuffer:2000000});
const baseFreeze=JSON.parse(baseFreezeBytes);
const keys=crypto.generateKeyPairSync('rsa',{modulusLength:3072,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
function fixture(){
 const request=JSON.parse(fs.readFileSync(path.join(root,OCTOBER_REQUEST)));request.publicKeySha256=sha(keys.publicKey);
 const requestBytes=Buffer.from(JSON.stringify(request)),fileBytes=Object.fromEntries(OCTOBER_PATHS.map(p=>[p,Buffer.from('synthetic:'+p)]));fileBytes[OCTOBER_REQUEST]=requestBytes;fileBytes[OCTOBER_PUBLIC_KEY]=Buffer.from(keys.publicKey);
 const freeze=structuredClone(baseFreeze);freeze.reconciliationReadOnlySuccessor={schema:'GRAVICENTRA_OCTOBER_PRIVATE_READBACK_SUCCESSOR_V1',sourceBaseHead:baseHead,requestPath:OCTOBER_REQUEST,requestBlobSha:blob(requestBytes),realBusinessWrites:0,productDeployed:false,cursorChanged:false,encryptedOnly:true,changes:OCTOBER_PATHS.map(p=>({path:p,blobSha:blob(fileBytes[p])}))};
 const freezeBytes=Buffer.from(JSON.stringify(freeze));return {request,requestBytes,fileBytes,freeze,freezeBytes,baseFreeze,baseFreezeBytes,control:{nextAction:'B4_003_CLOSED_RETURN_TO_FROZEN_PLAN_NEXT_GATE_NOT_EXECUTED',ownerDecisionFreeze20261107:{blobSha:blob(freezeBytes)}},publicKeyBytes:Buffer.from(keys.publicKey),branch:'recovery/fase-a-clean-20260831',head:'a'.repeat(40)};
}
test('Exact current owner binding admits read-only seven-collection scope',()=>assert.equal(validateOctoberRequest(fixture()).collections.length,7));
test('Reject tenant, branch, historical cursor, owner substitution and modified release',()=>{
 for(const mutate of [f=>f.request.tenantId='other',f=>f.branch='main',f=>f.control.nextAction='I6_5_DETERMINISTIC_DIFF',f=>f.baseFreezeBytes=Buffer.from('{}'),f=>f.freeze.preservedRelease.status='PASS',f=>f.control.ownerDecisionFreeze20261107.blobSha='0'.repeat(40)]){const f=fixture();mutate(f);assert.throws(()=>validateOctoberRequest(f),/I65_OCTOBER_/);}
});
test('Reject any added collection, arbitrary config collection, legacy count, write or deploy permission',()=>{
 for(const mutate of [f=>f.request.collections.push('members'),f=>f.request.configSourceFields.comisiones=['any'],f=>f.request.expectedCounts={polizas:1414},f=>f.request.maxDocumentsPerCollection=20001,...['dataWrites','sourceDataApply','authWrites','membershipWrites','mintUserTokens','productWrites','deploy','governanceWrites','reimport','messages'].map(k=>f=>f.request[k]=true)]){const f=fixture();mutate(f);assert.throws(()=>validateOctoberRequest(f),/I65_OCTOBER_/);}
});
test('Reject key substitution and unpinned executable bytes',()=>{for(const mutate of [f=>f.publicKeyBytes=Buffer.from('not-a-key'),f=>f.fileBytes[OCTOBER_PATHS[0]]=Buffer.from('altered'),f=>f.freeze.reconciliationReadOnlySuccessor.changes.pop()]){const f=fixture();mutate(f);assert.throws(()=>validateOctoberRequest(f),/I65_OCTOBER_/);}});
test('Projection keeps actual commission values and canonical document identity without exporting credentials',()=>{
 const doc={id:'canonical-advisor',data:()=>({id:'stored-alias',tenantId:'alianzas-soluciones',nombre:'SYNTHETIC',comModo:'comision',shareCom:0,comValor:0,password:'DO_NOT_EXPORT',email:'excluded@example.invalid'}),updateTime:new Date('2026-11-07T00:00:00Z')};
 const r=projectOctoberRecord('asesores',doc);assert.equal(r.id,'canonical-advisor');assert.equal(r.__snapshot.storedId,'stored-alias');assert.equal(r.__snapshot.idMismatch,true);assert.equal(r.shareCom,0);assert.equal(r.password,undefined);assert.equal(r.email,undefined);assert.equal(r.__snapshot.updateTime,'2026-11-07T00:00:00.000Z');
 const a=projectOctoberRecord('aseguradoras',{id:'s',data:()=>({comisiones:{medical:10},comisionesProd:{product:15},ramosDetalle:{medical:{productos:['plan'],password:'nested-secret',auth:{uid:'nested-auth'},cuentas:[{numero:'nested-bank'}]}},comisionDefault:0,portales:[{password:'DO_NOT_EXPORT'}],cuentas:[{numero:'secret'}]})});assert.equal(a.comisionDefault,0);assert.deepEqual(a.comisionesProd,{product:15});assert.equal(a.portales,undefined);assert.equal(a.cuentas,undefined);assert.deepEqual(a.ramosDetalle,{medical:{productos:['plan']}});assert.equal(JSON.stringify(a).includes('nested-secret'),false);assert.equal(JSON.stringify(a).includes('nested-bank'),false);
 const precise=projectOctoberRecord('polizas',{id:'p',data:()=>({}),updateTime:{seconds:1794009600,nanoseconds:123456789,toDate:()=>new Date(1794009600123)}});assert.deepEqual(precise.__snapshot.updateTimeExact,{seconds:'1794009600',nanoseconds:123456789});
 assert.throws(()=>projectOctoberRecord('members',doc),/COLLECTION_DENIED/);assert.throws(()=>projectOctoberRecord('polizas',{id:'p',data:()=>({tenantId:'foreign'})}),/DOCUMENT_TENANT/);
});
function dbFor(records,reads){return {collection(n){assert.equal(n,'tenants');return {doc(t){assert.equal(t,'alianzas-soluciones');return {collection(d){assert.equal(d,'data');return {doc(name){assert.ok(OCTOBER_COLLECTIONS.includes(name));reads.push(name);return {collection(items){assert.equal(items,'items');return {orderBy(field){assert.equal(field,'__name__');return {limit(n){assert.ok(n>0);return {async get(){return {docs:records(name),readTime:new Date('2026-11-07T00:00:00Z')};}};}};}};}};}};}};}};}};}
test('Bounded capture reads exactly seven canonical collections; no writes or implicit commission defaults',async()=>{
 const reads=[],request=fixture().request,db=dbFor(name=>[{id:name+'-s',data:()=>({nombre:'SYNTHETIC',comModo:'neta',shareCom:25,comValor:0})}],reads);
 const result=await captureOctoberSnapshot({db,request,head:'a'.repeat(40)});assert.deepEqual(reads,[...OCTOBER_COLLECTIONS]);assert.equal(result.counts.polizas,1);assert.equal(result.commissionConfiguration.defaultsApplied,false);assert.equal(result.readWindow.atomicAcrossCollections,false);assert.equal(result.data.asesores[0].shareCom,25);assert.equal(result.operationalWrites,0);
 const limit={...request,maxDocumentsPerCollection:1};await assert.rejects(captureOctoberSnapshot({db:dbFor(()=>[{id:'1',data:()=>({})},{id:'2',data:()=>({})}],[]),request:limit,head:'a'.repeat(40)}),/DOCUMENT_BOUND_EXCEEDED/);
});
test('Encrypted artifact roundtrip verifies hashes and authentication; plaintext identifiers absent in envelope',()=>{
 const payload={headSha:'a'.repeat(40),createdAt:'2026-11-07T00:00:00Z',counts:{polizas:1},readWindow:{atomicAcrossCollections:false},data:{polizas:[{id:'SYNTHETIC_PRIVATE_POLICY_001',nombre:'SYNTHETIC_PRIVATE_CLIENT_001'}]}};
 const envelope=encryptOctoberSnapshot(payload,keys.publicKey),encoded=JSON.stringify(envelope);assert.equal(encoded.includes('SYNTHETIC_PRIVATE'),false);assert.equal(envelope.encrypted,true);assert.equal(envelope.operationalWrites,0);
 const aes=crypto.privateDecrypt({key:keys.privateKey,padding:crypto.constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(envelope.encryptedKey,'base64'));
 function decrypt(tag){const d=crypto.createDecipheriv('aes-256-gcm',aes,Buffer.from(envelope.iv,'base64'));d.setAuthTag(tag);return Buffer.concat([d.update(Buffer.from(envelope.ciphertext,'base64')),d.final()]);}
 const gz=decrypt(Buffer.from(envelope.tag,'base64')),plain=zlib.gunzipSync(gz);assert.equal(sha(gz),envelope.compressedSha256);assert.equal(sha(plain),envelope.plaintextSha256);assert.deepEqual(JSON.parse(plain),payload);assert.throws(()=>decrypt(Buffer.alloc(16)));
});
test('Existing workflow excludes every other job in private mode and gives reader no commit/deploy capability',()=>{
 const wf=fs.readFileSync(path.join(root,'.github/workflows/gravicentra-recovery-i6-postsalida.yml'),'utf8');const jobs=wf.split('\njobs:\n')[1],blocks=[...jobs.matchAll(/^  ([A-Za-z0-9_-]+):\n/gm)];assert.equal(blocks.length,52);
 for(let i=0;i<blocks.length;i++){const b=jobs.slice(blocks[i].index,blocks[i+1]?.index??jobs.length);if(blocks[i][1]==='i65-encrypted-current-october-readback'){assert.match(b,/contents: read/);assert.match(b,/persist-credentials: false/);assert.match(b,/governance-preflight-v1\.mjs --mode=i6/);assert.doesNotMatch(b,/git (?:push|commit)|firebase deploy|createCustomToken|node.*(?:apply|import|write)/);}else assert.match(b,/if: \$\{\{ !\(inputs\.private_october_readback == true \|\| contains\(github\.event\.head_commit\.message \|\| '', '\[october-private-readback\]'\)\)/);}
 const source=fs.readFileSync(path.join(root,OCTOBER_PATHS[0]),'utf8');const current=source.slice(source.indexOf('export const OCTOBER_COLLECTIONS'),source.indexOf('async function runLegacy'));
 assert.doesNotMatch(current,/\b(?:db|tx|ref|target|collection)\.(?:set|update|delete|add|runTransaction|batch)\(|createCustomToken/);
});
