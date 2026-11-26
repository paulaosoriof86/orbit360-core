'use strict';
// Offline provider-contract fixtures and real temporary Git trees. No key,
// credential, GitHub write, Firebase operation or release acceptance is created.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const owner=require('./gravicentra-i66-frontend-control.cjs'),source=path.resolve(__dirname,'gravicentra-i66-frontend-control.cjs');
const mockGh=String.raw`#!/usr/bin/env node
const fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path'),crypto=require('node:crypto');
const file=process.env.I66_SIGNER_FIXTURE_STATE,state=JSON.parse(fs.readFileSync(file)),args=process.argv.slice(2);
const save=()=>fs.writeFileSync(file,JSON.stringify(state));const out=v=>process.stdout.write(JSON.stringify(v));
const git=(args,options={})=>cp.execFileSync('git',args,{cwd:process.cwd(),encoding:'utf8',stdio:['pipe','pipe','pipe'],...options}).trim();
if(args[0]!=='api')throw Error('Only existing gh api interface is permitted');
if(args[1]==='user'){out({login:'paulaosoriof86',id:123});process.exit();}
if(args[1].includes('/git/ref/heads/')){out({object:{sha:state.head}});process.exit();}
if(args[1].includes('/git/commits/')){const sha=args[1].split('/').pop();out(state.commits[sha]);process.exit();}
if(args[1]!=='graphql')throw Error('Unexpected endpoint; no credentials or signing-key registration permitted');
const raw=fs.readFileSync(0,'utf8'),payload=JSON.parse(raw),input=payload.variables.input;
state.writes++;state.payloads.push(crypto.createHash('sha256').update(raw).digest('hex'));save();
if(input.expectedHeadOid!==state.head)throw Error('expected HEAD rejected');
if(state.mode==='denied'){process.stderr.write('GraphQL: Resource not accessible (HTTP 403)');process.exit(1);}
if(state.mode==='before-ack'&&state.writes===1){process.stderr.write('connection reset by peer');process.exit(1);}
const index=path.join(path.dirname(file),'provider-index'),env={...process.env,GIT_INDEX_FILE:index};
git(['read-tree',state.head],{env});
for(const row of input.fileChanges.additions){const data=Buffer.from(row.contents,'base64'),blob=git(['hash-object','-w','--stdin'],{input:data});git(['update-index','--add','--cacheinfo','100644',blob,row.path],{env});}
const tree=git(['write-tree'],{env}),sha=git(['-c','user.name=Offline provider fixture','-c','user.email=fixture@example.invalid','commit-tree',tree,'-p',state.head,'-m',input.message.headline]);
state.commits[sha]={sha,tree:{sha:state.mode==='wrong-tree'?'a'.repeat(40):tree},parents:[{sha:state.mode==='wrong-parent'?'b'.repeat(40):state.head}],message:input.message.headline,verification:{verified:state.mode!=='unsigned'}};
state.head=sha;save();
if(state.mode==='after-ack'){process.stderr.write('unexpected EOF');process.exit(1);}
out({data:{createCommitOnBranch:{commit:{oid:sha}}}});
`;
function fixture(mode='success'){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'i66-provider-signer-')),bin=path.join(dir,'bin');fs.mkdirSync(bin);fs.writeFileSync(path.join(bin,'gh'),mockGh,{mode:0o700});
 const git=(...args)=>cp.execFileSync('git',args,{cwd:dir,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
 git('init','--quiet');git('config','user.name','Offline fixture');git('config','user.email','fixture@example.invalid');
 const files={[owner.P.cp]:{stage:'before'},[owner.P.state]:{stage:'before'},[owner.P.transport]:{request:35}},put=(file,value)=>{fs.mkdirSync(path.dirname(path.join(dir,file)),{recursive:true});fs.writeFileSync(path.join(dir,file),owner.serial(value));};
 for(const [file,value]of Object.entries(files))put(file,value);git('add','.');git('commit','--quiet','-m','offline metadata preimages');const head=git('rev-parse','HEAD');
 const checkpoint='artifacts/orbit360-recovery/release-control/I6_6_CURRENT_EXECUTION_PROGRESS_20261126_R93.json';
 const change={expectedHeadOid:head,expectedPreimages:{...Object.fromEntries(Object.entries(files).map(([file,value])=>[file,owner.blob(owner.serial(value))])),[checkpoint]:null},changes:{[owner.P.cp]:{stage:'PREVIEW_VERIFIED'},[owner.P.state]:{stage:'PREVIEW_VERIFIED'},[checkpoint]:{version:93,stage:'PREVIEW_VERIFIED'}}};
 const stateFile=path.join(dir,'provider.json');fs.writeFileSync(stateFile,JSON.stringify({head,writes:0,payloads:[],mode,commits:{}}));
 const changeFile=path.join(dir,'change.json');fs.writeFileSync(changeFile,JSON.stringify(change));
 const env={...process.env,PATH:bin+path.delimiter+process.env.PATH,I66_SIGNER_FIXTURE_STATE:stateFile};delete env.GRAVICENTRA_I66_SIGNING_KEY;
 const run=()=>cp.spawnSync(process.execPath,['-e',`const fs=require('node:fs'),o=require(${JSON.stringify(source)});try{console.log(JSON.stringify(o.commitProviderOutcome(JSON.parse(fs.readFileSync(${JSON.stringify(changeFile)})))));}catch(e){console.error(e.message);process.exitCode=1;}`],{cwd:dir,env,encoding:'utf8',maxBuffer:3*1024*1024});
 const state=()=>JSON.parse(fs.readFileSync(stateFile));
 return {dir,head,change,checkpoint,state,run,env,put,update:()=>fs.writeFileSync(changeFile,JSON.stringify(change)),save:v=>fs.writeFileSync(stateFile,JSON.stringify(v)),cleanup:()=>fs.rmSync(dir,{recursive:true,force:true})};
}
test('missing ephemeral SSH key uses existing gh expected-head signing with exact three-path Git tree',()=>{const f=fixture();try{f.env.GRAVICENTRA_I66_SIGNING_KEY=path.join(f.dir,'missing-key');const r=f.run();assert.equal(r.status,0,r.stderr);const result=JSON.parse(r.stdout);assert.equal(result.verified,true);assert.equal(result.parent,f.head);assert.equal(result.sha,f.state().head);assert.equal(f.state().writes,1);assert.equal(result.tree,f.state().commits[result.sha].tree.sha);assert.equal(fs.existsSync(f.env.GRAVICENTRA_I66_SIGNING_KEY),false);}finally{f.cleanup();}});
test('lost ACK after committed CAS adopts exact signed commit without a second mutation',()=>{const f=fixture('after-ack');try{const r=f.run();assert.equal(r.status,0,r.stderr);assert.equal(f.state().writes,1);const again=f.run();assert.equal(again.status,0,again.stderr);assert.deepEqual(JSON.parse(again.stdout),JSON.parse(r.stdout));assert.equal(f.state().writes,1);}finally{f.cleanup();}});
test('transport loss before commit retries identical payload only after unchanged-head readback',()=>{const f=fixture('before-ack');try{const r=f.run();assert.equal(r.status,0,r.stderr);assert.equal(f.state().writes,2);assert.equal(new Set(f.state().payloads).size,1);}finally{f.cleanup();}});
for(const mode of ['unsigned','wrong-tree','wrong-parent'])test('readback rejects '+mode+' without retry or alternate signer',()=>{const f=fixture(mode);try{const r=f.run();assert.equal(r.status,1);assert.equal(f.state().writes,1);assert.match(r.stderr,/I66_GITHUB_VERIFICATION_REQUIRED|I66_SIGNED_CAS_EXACT_TREE|I66_SIGNED_CAS_EXACT_PARENT/);}finally{f.cleanup();}});
test('permission rejection remains a single failed mutation and cannot create a signing credential',()=>{const f=fixture('denied');try{const r=f.run();assert.equal(r.status,1);assert.equal(f.state().writes,1);assert.equal(f.state().head,f.head);}finally{f.cleanup();}});
test('concurrent foreign HEAD is rejected before mutation',()=>{const f=fixture();try{const s=f.state(),foreign='f'.repeat(40);s.head=foreign;s.commits[foreign]={sha:foreign,parents:[{sha:f.head}],tree:{sha:'0'.repeat(40)},message:'Another writer',verification:{verified:true}};f.save(s);const r=f.run();assert.equal(r.status,1);assert.match(r.stderr,/I66_SIGNED_CAS_EXACT_TREE/);assert.equal(f.state().writes,0);}finally{f.cleanup();}});
test('changed working preimage prevents the GitHub mutation',()=>{const f=fixture();try{f.put(owner.P.state,{other:true});const r=f.run();assert.equal(r.status,1);assert.match(r.stderr,/I66_TERMINAL_PREIMAGE_CAS_CHANGED/);assert.equal(f.state().writes,0);}finally{f.cleanup();}});
test('a source path cannot be smuggled into the three metadata paths',()=>{const f=fixture();try{f.change.changes['functions/bootstrap.js']={unexpected:true};f.update();const r=f.run();assert.equal(r.status,1);assert.equal(f.state().writes,0);}finally{f.cleanup();}});
