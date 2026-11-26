'use strict';
// Causal tests: actual historic callable, actual Cobros modal/client/projection,
// transactional memory only. No credentials, Firebase or external network.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const D=require('./gravicentra-i6-6-proposal-application-signed-uat.cjs');
const clone=x=>x==null?x:JSON.parse(JSON.stringify(x)),root=path.resolve(__dirname,'..');
const uiRoot=process.env.I66_SCOPED_JOURNEY_UI_ROOT||root;
if(process.env.I66_SCOPED_JOURNEY_UI_ROOT){assert.ok(path.isAbsolute(uiRoot));for(const [name,sha]of Object.entries({'core/queries.js':'0220a34e4ea16379fa730cd7a3054c143e8d78e35c9024ea89a658a044a40ea3','core/cobros-reconciliation-domain-client.js':'dca074682bba1af538f2632b1895e51115946e4cc893d36488ca716930c17b72','modules/cobros.js':'2b44a4208810b616e79678cedf3865e8890cf141bf2baea8728c7c9069a35f07'}))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(uiRoot,'orbit360-platform',name))).digest('hex'),sha,'EXACT_PROTECTED_E3_UI_OWNER');}

function backend(role){const p=path.join(__dirname,'gravicentra-i6-6-siga-historical-payment-reconciliation.test.cjs'),module={exports:{}},req=createRequire(p);
 const source=fs.readFileSync(p,'utf8').replace("tenant='historical-payment-test'","tenant='alianzas-soluciones'").replace('return{documents,writes,put,get,all,item,call,edit,readCommit,projection,loseReadback:', 'return{db,exports,documents,writes,put,get,all,item,call,edit,readCommit,projection,loseReadback:');
 vm.runInNewContext(source+'\nmodule.exports={harness};',{module,exports:module.exports,require:n=>n==='node:test'?()=>{}:req(n),__dirname,console,structuredClone,process:{env:{}}},{filename:p});return module.exports.harness({role});}
function input(phase='preview'){
 const control=JSON.parse(fs.readFileSync(path.join(root,'artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json'))),bytes=fs.readFileSync(path.join(root,'artifacts/orbit360-recovery/release-control/I6_6_SCOPED_FUNCTION_RELEASE.json')),binding=JSON.parse(bytes),unit=control.i66ScopedFunctionRelease,facts=clone(unit.providerStages.PACKAGE_CERTIFIED);
 const hosting={version:binding.predecessor.hostingVersion,buildId:binding.predecessor.buildId,sourceSha:binding.predecessor.sourceSha,markerSha256:'a'.repeat(64)};
 if(phase==='live'){unit.providerStages.LIVE_DEPLOYED={...clone(unit.providerStages.PREVIEW_DEPLOYED),target:binding.targets.live,revision:'orbit360cobrosreconciliationcommand-99999-qa'};unit.providerStages.PREVIEW_VERIFIED={packageSha256:facts.packageSha256};}
 const uiHosting={...hosting,origin:phase==='preview'?control.i66FrontendReleaseHead.previewUrl:'https://app.aysseguros.com',basis:'SCOPED_HOSTING_PREDECESSOR'};
 const value={phase,uiHosting,origin:uiHosting.origin,binding,facts,hosting,revision:unit.providerStages[phase==='preview'?'PREVIEW_DEPLOYED':'LIVE_DEPLOYED'].revision};return{value,control,bytes,context:D.validateScopedHistoricalContext(value,control,bytes)};
}
function harness(phase,role,options={}){
 const label=role==='direccion'?'Dirección':'Operativo',b=backend(label),{context}=input(phase),actor={uid:'operator',role};
 for(const key of [...b.documents.keys()])if(key.includes('/data/'))b.documents.delete(key);
 const versions=new Map(),deletes=[],calls=[],events=new Map();let n=0,closed=false,pending=null,ui,readbackCount=0,claimCount=0;
 const ver=p=>versions.set(p,{seconds:100000,nanoseconds:++n});for(const p of b.documents.keys())ver(p);
 const proto=Object.getPrototypeOf(b.db.collection('tenants')),originalGet=proto.get;
 Object.defineProperty(proto,'parent',{get(){return new this.constructor(this.parts.slice(0,-1));}});proto.limit=function(){return this;};
 proto.get=async function(){const s=await originalGet.call(this);if(s.docs)s.docs=s.docs.map(d=>({...d,data:()=>clone(d.data()),updateTime:clone(versions.get(d.ref.path))}));else if(s.exists){const data=s.data.bind(s);s.data=()=>clone(data());s.updateTime=clone(versions.get(this.path));}return s;};
 proto.create=async function(row){assert.equal(b.documents.has(this.path),false);b.documents.set(this.path,clone(row));ver(this.path);};
 proto.delete=async function(precondition){assert.equal(closed,true);assert.deepEqual(precondition,{lastUpdateTime:versions.get(this.path)});deletes.push(this.path);b.documents.delete(this.path);versions.delete(this.path);};
 const tx=b.db.runTransaction;b.db.runTransaction=async fn=>{const index=b.writes.length,r=await tx(fn);for(const w of b.writes.slice(index))ver(w.path);return r;};
 const tenant=b.db.collection('tenants').doc('alianzas-soluciones'),item=(c,id)=>tenant.collection('data').doc(c).collection('items').doc(id);
 const get=(c,id)=>clone(b.documents.get(item(c,id).path)),all=c=>[...b.documents].filter(([p])=>p.startsWith(item(c,'').path)).map(([,r])=>clone(r));
 class Element{
  constructor(tag,doc){this.tagName=tag.toUpperCase();this.doc=doc;this.nodes=[];this.style={};this.listeners={};this.value='';this.disabled=false;this.attrs={};}
  set innerHTML(html){this.html=html;this.nodes=[];for(const m of html.matchAll(/<(input|button|select|span|div)\b([^>]*)>/g)){const a=Object.fromEntries([...m[2].matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));if(!a.id)continue;const e=new Element(m[1],this.doc);e.id=a.id;e.value=a.value||'';this.nodes.push(e);}}
  querySelector(s){return this.nodes.find(e=>'#'+e.id===s)||null;}appendChild(e){this.doc.nodes.set(e.id,e);}remove(){this.doc.nodes.delete(this.id);}addEventListener(n,fn){this.listeners[n]=fn;}setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];}
 }
 function load(){
  const doc={nodes:new Map(),getElementById(id){return this.nodes.get(id)||null;},createElement(t){return new Element(t,this);}};doc.body=new Element('body',doc);
  const store={all,get,where:(c,f)=>all(c).filter(f),find:(c,f)=>all(c).find(f),_ensureCollections:async()=>{},_productStatus:()=>({serverConfirmedCollections:['clientes','polizas','recibosEsperados','carteraPrimas','cobros']})};
  const Orbit={store,ui:{esc:v=>String(v??''),today:()=> '2026-11-26',now:()=>new Date('2026-11-26T12:00:00Z'),toast(){},text:v=>String(v??'')},q:{},kit:{},pais:'GT',session:{rol:()=>label},modules:{},productAppP0:{activate:async()=>({started:true})}};
  const location={hostname:new URL(context.origin).hostname,origin:context.origin},browser={window:null,Orbit,OrbitBackend:{tenantId:'alianzas-soluciones',featureFlags:{cobrosReconciliationDomainActive:true}},location,document:doc,console,Date,Math,Map,Set,setTimeout,clearTimeout};browser.window=browser;vm.createContext(browser);
  const callFunction=async(name,data,region)=>{
   assert.equal(name,context.target);assert.equal(region,context.region);const request={method:()=> 'POST',url:()=> 'https://'+region+'-ays-orbit-360-lab.cloudfunctions.net/'+name,postDataJSON:()=>({data:clone(data)})};
   for(const fn of events.get('request')||[]){fn(request);if(options.duplicateRequest)fn(request);}calls.push(clone(data));
   try{const result=await b.exports[name]({auth:{uid:actor.uid,token:{}},data:clone(data)});if(result.reused&&options.touchReplay)ver(item('recibosEsperados',data.payload.receiptId).path);
    const response={request:()=>request,status:()=>200,json:async()=>({result:clone(result)})};if(pending&&pending.match(response)){const p=pending;pending=null;clearTimeout(p.timer);if(options.uncertain&&!result.reused)p.reject(Error('UNCERTAIN_SERVER_ACK'));else p.resolve(response);}return clone(result);
   }catch(e){const response={request:()=>request,status:()=>400,json:async()=>({error:{message:e.message}})};if(pending&&pending.match(response)){const p=pending;pending=null;clearTimeout(p.timer);p.resolve(response);}throw e;}
  };
  Orbit.productRuntimeBrowserProvidersP0={initialize:async()=>({}),waitForUser:async()=>({uid:actor.uid}),callFunction};
  for(const f of ['core/queries.js','core/cobros-reconciliation-domain-client.js','modules/cobros.js'])vm.runInContext(fs.readFileSync(path.join(uiRoot,'orbit360-platform',f),'utf8'),browser,{filename:f});
  ui={browser,doc,Orbit};
 }
 load();
 const evaluate=async(fn,arg)=>{ui.browser.argument=clone(arg);return clone(await vm.runInContext('('+fn.toString()+')(argument)',ui.browser));};
 const find=s=>{const parts=s.split(' ');let e=ui.doc.getElementById(parts.shift().slice(1));for(const p of parts)e=e?.querySelector(p);return e;};
 const locator=s=>({locator:c=>locator(s+' '+c),waitFor:async({state})=>{assert.equal(!!find(s),state!=='detached',s);},inputValue:async()=>find(s).value,fill:async v=>{find(s).value=v;},click:async()=>{assert.equal(find(s).disabled,false);await find(s).onclick();}});
 const page={evaluate,locator,goto:async()=>{},reload:async()=>load(),waitForFunction:async(fn,arg)=>{assert.ok(await evaluate(fn,arg),'UI wait condition');},
  on:(e,fn)=>events.set(e,[...(events.get(e)||[]),fn]),off:(e,fn)=>events.set(e,(events.get(e)||[]).filter(v=>v!==fn)),
  waitForResponse:match=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending=null;reject(Error('NO_UI_RESPONSE'));},1500);pending={match,resolve,reject,timer};}),close:async()=>{closed=true;}};
 const io={beforeFixtureWrite:async({receiptId,targets})=>{claimCount++;assert.equal([...b.documents].filter(([p])=>p.includes('/data/')).length,0);assert.match(receiptId,/^b3004qa_/);assert.equal(targets.length,4);assert.ok(targets.every(t=>t.collection.startsWith('data/')&&t.collection.endsWith('/items')));if(options.claimHold)throw Error('CLAIM_NOT_ACQUIRED');},readMarker:async()=>({buildId:context.hostingBuildId,sourceSha:context.hostingSourceSha,__qaMarkerSha256:context.hostingMarkerSha256}),requireExistingLegalReadiness:async()=>{if(options.legalHold){
  const legalRuntime={Orbit:{auth:{user:()=>({uid:actor.uid,email:'qa@example.invalid'})},productAppP0:{isStarted:()=>true},legal:{__gateState:{pendingScopes:{'user:qa@example.invalid':true},doneScopes:{}},aceptaciones:()=>({}),yaAcepto:()=>false}},document:{documentElement:{getAttribute:()=>null},querySelectorAll:()=>[{}]},location:{origin:context.origin}};legalRuntime.window=legalRuntime;vm.createContext(legalRuntime);
  const run=fn=>vm.runInContext('('+fn.toString()+')()',legalRuntime);
  await require('./gravicentra-i6-6-carlos-paula-live-direct-renewal-synthetic-uat.cjs').requireExistingLegalReadiness({waitForFunction:async fn=>assert.equal(run(fn),true),evaluate:async fn=>run(fn)});
 }}};
 const run=()=>D.exerciseScopedHistoricalPayment({page,actor,context,tenant,item,nonce:'historical_fixture_0123456789',onServerReadback:async({journey,before,after})=>{
  readbackCount++;assert.equal(closed,false);assert.equal(deletes.length,0);assert.equal(journey.originalCobroDocumentCount,0);assert.equal(journey.afterCobroDocumentCount,1);
  const r=await tenant.collection(phase==='preview'?'previewReconciliationRequests':'reconciliationRequests').doc(journey.requestId).get();assert.equal(r.exists,true);assert.equal(r.data().result.historicalPaymentLinked,true);assert.equal(Object.values(before).filter(x=>x.exists).length,3);assert.equal(Object.values(after).filter(x=>x.exists).length,6);
  return{status:options.witnessHold?'HOLD':'PASS',requestId:journey.requestId,matchingPaymentIds:[journey.cobroId]};}},io);
 return{run,b,calls,deletes,get readbackCount(){return readbackCount;},get claimCount(){return claimCount;}};
}
for(const phase of ['preview','live'])for(const role of ['direccion','operativo'])test('scoped historical '+phase+' '+role+' actual modal/callable: logical1→1, physical0→1, reload/replay/readback then cleanup',async()=>{
 const h=harness(phase,role),p=await h.run();assert.equal(p.status,'PASS');assert.equal(p.normalUi,true);assert.equal(p.idempotentReplay,true);assert.equal(p.originalPaymentCount,1);assert.equal(p.originalCobroDocumentCount,0);assert.equal(p.afterCobroDocumentCount,1);assert.equal(h.calls.length,2);assert.ok(h.calls.every(c=>c.operation==='reconcile_payment'));assert.equal(h.readbackCount,1);assert.equal(h.deletes.length,6);assert.equal(p.cleanup.remaining,0);assert.ok(p.cleanup.targets.every(t=>t.collection&&t.id));
});
test('scoped identity consumes deployed df9 package and retained hosting, independent of old composite transport source',()=>{const {value,control,bytes}=input();assert.notEqual(value.facts.sourceSha,value.hosting.sourceSha);assert.equal(D.validateScopedHistoricalContext(value,control,bytes).sourceSha,value.facts.sourceSha);assert.equal(value.uiHosting.sourceSha,value.hosting.sourceSha);assert.equal(D.validateScopedHistoricalContext(value,control,bytes).hostingSourceSha,value.uiHosting.sourceSha);for(const change of [x=>x.facts.sourceSha='a'.repeat(40),x=>x.facts.packageSha256='a'.repeat(64),x=>x.revision='other',x=>x.hosting.buildId='other',x=>x.origin='https://example.invalid',x=>x.binding.roles=['Dirección'],x=>delete x.uiHosting,x=>x.uiHosting.origin='https://example.invalid',x=>x.uiHosting.markerSha256='bad']){const bad=clone(value);change(bad);assert.throws(()=>D.validateScopedHistoricalContext(bad,control,bytes));}});
test('uncertain acknowledgement retains owned synthetic data and cannot claim completed cleanup',async()=>{const h=harness('preview','direccion',{uncertain:true});let e;try{await h.run();}catch(x){e=x;}assert.ok(e);assert.equal(e.scopedHistoricalJourney.cleanup.status,'HOLD');assert.equal(h.deletes.length,0);assert.equal(h.readbackCount,0);});
test('claim denial holds before any fixture write; later readback witness HOLD cleans proven completed synthetic writes',async()=>{const early=harness('preview','operativo',{claimHold:true});await assert.rejects(early.run(),/CLAIM_NOT_ACQUIRED/);assert.equal(early.b.writes.length,0);assert.equal(early.calls.length,0);assert.equal(early.deletes.length,0);assert.equal([...early.b.documents].filter(([p])=>p.includes('/data/')).length,0);const h=harness('preview','operativo',{witnessHold:true});await assert.rejects(h.run(),/EXTERNAL_SERVER_READBACK_REQUIRED/);assert.equal(h.deletes.length,6);});
test('replay that changes a same-value record version is detected',async()=>{const h=harness('live','direccion',{touchReplay:true});await assert.rejects(h.run(),/REPLAY_MUTATED_DATA_OR_VERSION/);assert.equal(h.readbackCount,0);assert.equal(h.deletes.length,6);});

test('an unexpected duplicate request is caught inside the journey and retains namespace while unsettled',async()=>{const h=harness('preview','direccion',{duplicateRequest:true});let error;try{await h.run();}catch(e){error=e;}assert.ok(error);assert.match(error.message,/SINGLE_UI_COMMAND/);assert.equal(error.scopedHistoricalJourney.cleanup.status,'HOLD');assert.equal(h.deletes.length,0);assert.equal(h.readbackCount,0);});

test('the current E3 Preview origin requires its protected identity and cannot substitute the retained35 channel',()=>{const {value,control,bytes}=input();assert.equal(D.validateScopedHistoricalContext(value,control,bytes).hostingSourceSha,value.hosting.sourceSha);value.uiHosting.sourceSha='d'.repeat(40);assert.throws(()=>D.validateScopedHistoricalContext(value,control,bytes),/UI_PROTECTED_IDENTITY/);const alt=input();alt.value.origin='https://ays-orbit-360-lab--gi-i66-rc-45518809761-eiytd3a3.web.app';alt.value.uiHosting.origin=alt.value.origin;assert.throws(()=>D.validateScopedHistoricalContext(alt.value,alt.control,alt.bytes),/EXISTING_UI_ORIGIN_REQUIRED/);});

test('missing actual legal readiness rejects before claim or fixtures without accepting or changing consent',async()=>{
 const h=harness('preview','operativo',{legalHold:true});let error;try{await h.run();}catch(e){error=e;}assert.match(error?.message||'',/I66_DIRECT_FORMS_EXISTING_ACTOR_LEGAL_ACCEPTANCE_REQUIRED/);assert.equal(h.claimCount,0);assert.equal(h.b.writes.length,0);assert.equal(h.calls.length,0);assert.equal(h.deletes.length,0);assert.equal([...h.b.documents].filter(([p])=>p.includes('/data/')).length,0);assert.equal(error.scopedHistoricalJourney.cleanup.status,'PASS');assert.equal(error.scopedHistoricalJourney.cleanup.remaining,0);assert.deepEqual(error.scopedHistoricalJourney.cleanup.targets,[]);
});
