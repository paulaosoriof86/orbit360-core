'use strict';
// Diagnostic regression: rendered UI events -> actual access owner -> facade
// -> canonical callable -> transactional in-memory Firestore. This is not browser UAT.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const repo=path.resolve(process.argv[2]||process.cwd());
const paths={equipo:'orbit360-platform/modules/equipo.js',facade:'orbit360-platform/data/store-firestore-product-operational-p0.js',backend:'functions/product-operational-domain.js',roster:'functions/assignable-advisor-roster.js',activeRole:'functions/product-active-role-contract.js'};
const source=Object.fromEntries(Object.entries(paths).map(([key,file])=>[key,fs.readFileSync(path.join(repo,file),'utf8')]));
const copy=value=>JSON.parse(JSON.stringify(value));
class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
function server({role='SuperAdmin',scope='todos',countries=['GT'],noBusinessGoal=false}={}){
  const tenant='synthetic-audit',uid='synthetic-user',rows=new Map(),writes=[];
  const member={uid,tenantId:tenant,status:'active',active:true,roles:[role],activeRole:role,advisorId:'advisor-own',countries,dataScopes:{default:scope}};
  rows.set(`tenants/${tenant}/members/${uid}`,member);
  rows.set(`tenants/${tenant}/config/access`,{roleScopes:{[role]:scope},rolePermissions:{[role]:{equipo:{ver:true,editar:true},inicio:{ver:true}}}});
  const col=c=>`tenants/${tenant}/data/${c}/items/`;
  const real={id:'meta-business-oct',tenantId:tenant,pais:'GT',mes:'2026-10',periodo:'2026-10',moneda:'GTQ',tipo:'prima',valor:7000};
  if(!noBusinessGoal)rows.set(col('metas')+real.id,copy(real));
  const snap=p=>({id:p.split('/').pop(),exists:rows.has(p),data:()=>copy(rows.get(p)||{})});
  class Ref{
    constructor(p,query=false,conditions=[]){this.p=p;this.query=query;this.conditions=conditions;}
    collection(k){return new Ref(this.p+'/'+k,true);}doc(k){return new Ref(this.p+'/'+k);}
    where(...condition){return new Ref(this.p,true,[...this.conditions,condition]);}limit(){return this;}orderBy(){return this;}
    async get(){if(!this.query)return snap(this.p);const docs=[...rows.keys()].filter(p=>p.startsWith(this.p+'/')&&!p.slice(this.p.length+1).includes('/')).map(snap).filter(s=>this.conditions.every(([k,op,v])=>op==='=='&&s.data()[k]===v));return{docs,empty:!docs.length};}
  }
  const db={collection:k=>new Ref(k,true),async runTransaction(fn){
    const pending=[];let written=false;
    const tx={async get(ref){if(written)throw Error('READ_AFTER_WRITE');return ref.get();},set(ref,row,options){written=true;pending.push({p:ref.p,row:copy(row),merge:options&&options.merge});},delete(ref){written=true;pending.push({p:ref.p,remove:true});}};
    const result=await fn(tx);
    for(const w of pending){if(w.remove)rows.delete(w.p);else rows.set(w.p,w.merge?{...rows.get(w.p),...w.row}:w.row);writes.push(w);}
    return result;
  }};
  const loaded={};
  function load(file){
    const filename=path.resolve(repo,'functions',file.endsWith('.js')?file:file+'.js');if(loaded[filename])return loaded[filename].exports;
    const module={exports:{}};loaded[filename]=module;
    function requireModule(id){
      if(id.startsWith('.'))return load(id);
      if(id==='firebase-admin/app')return{getApps:()=>[{}],initializeApp:()=>({})};
      if(id==='firebase-admin/firestore')return{getFirestore:()=>db,FieldValue:{serverTimestamp:()=>'SYNTHETIC_TIMESTAMP'}};
      if(id==='firebase-admin/storage')return{getStorage:()=>({})};
      if(id==='firebase-functions/v2/https')return{HttpsError,onCall:(_options,callback)=>callback};
      if(id==='node:crypto')return crypto;
      throw Error('Unexpected import: '+id);
    }
    vm.runInNewContext(fs.readFileSync(filename,'utf8'),{module,exports:module.exports,require:requireModule,process:{env:{}},Buffer,console},{filename});
    return module.exports;
  }
  const command=load('product-operational-domain'),roster=load('assignable-advisor-roster');
  const request=data=>({auth:{uid,token:{email:'synthetic@example.invalid'}},data:{tenantId:tenant,activeRole:role,...data}});
  return{tenant,uid,role,countries,rows,writes,col,real,command,request,roster,member};
}

// Minimal DOM models only selectors used by this owner. Nodes and disabled/value
// attributes come from the actual generated HTML and are rebuilt on every render.
function dom(){
  const decode=s=>String(s||'').replaceAll('&quot;','"').replaceAll('&amp;','&').replaceAll('&#39;',"'");
  function parse(html){
    const nodes=[];
    for(const match of html.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*)>/gi)){
      const attributes={};for(const a of match[2].matchAll(/([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s]+)))?/g))attributes[a[1]]=decode(a[2]??a[3]??a[4]??'');
      const node={tagName:match[1],attributes,dataset:{},value:attributes.value||'',disabled:Object.hasOwn(attributes,'disabled'),listeners:{},addEventListener(name,fn){this.listeners[name]=fn;}};
      for(const [key,value] of Object.entries(attributes))if(key.startsWith('data-'))node.dataset[key.slice(5).replace(/-([a-z])/g,(_a,b)=>b.toUpperCase())]=value;
      if(node.tagName==='select'){const segment=html.slice(match.index+match[0].length).split('</select>')[0],selected=segment.match(/<option[^>]*value="([^"]*)"[^>]*selected/);if(selected)node.value=decode(selected[1]);}
      nodes.push(node);
    }
    return nodes;
  }
  function match(node,selector){
    if(selector.startsWith('#'))return node.attributes.id===selector.slice(1);
    const pattern=/^(?:\.([\w-]+))?(?:\[([^=\]]+)(?:="([^"]*)")?\])?$/;const m=selector.match(pattern);if(!m)return false;
    return(!m[1]||String(node.attributes.class||'').split(/\s+/).includes(m[1]))&&(!m[2]||Object.hasOwn(node.attributes,m[2])&&(m[3]===undefined||node.attributes[m[2]]===m[3]));
  }
  let rootHtml='',bodyHtml='',rootNodes=[],bodyNodes=[];
  const body={get innerHTML(){return bodyHtml;},set innerHTML(v){bodyHtml=v;bodyNodes=parse(v);}};
  const host={get innerHTML(){return rootHtml;},set innerHTML(v){rootHtml=v;rootNodes=parse(v);bodyHtml='';bodyNodes=[];},querySelectorAll:s=>[...rootNodes,...bodyNodes].filter(n=>match(n,s)),querySelector(s){if(s==='#eq-body')return body;return this.querySelectorAll(s)[0]||null;}};
  return{host,body};
}
async function browser(e,{preview=true,stripReadMarkers=false,beforeCall,afterCall,canEdit=true}={}){
  const {host,body}=dom(),calls=[],toasts=[],alerts=[],inflight=new Set();
  function projected(row){const result=copy(row);if(stripReadMarkers)Object.keys(result).filter(k=>k.startsWith('__')).forEach(k=>delete result[k]);return result;}
  const base={__productReadOnlyP0:true,all:c=>[...e.rows].filter(([p])=>p.startsWith(e.col(c))&&!p.slice(e.col(c).length).includes('/')).map(([,row])=>projected(row)),get:(c,id)=>e.rows.has(e.col(c)+id)?projected(e.rows.get(e.col(c)+id)):null,
    _productStatus:()=>({ready:true,status:'ready-read-only',noFallback:true,writeEnabled:false,serverConfirmedCollections:['asesores','metas','auditoria']}),_ensureCollections:()=>{},on:()=>()=>{}};
  const Orbit={modules:{},store:base,pais:'GT',PAISES:[{id:'GT',label:'Guatemala',moneda:'GTQ'},{id:'CO',label:'Colombia',moneda:'COP'}],
    ui:{NOW:'2026-10-30T12:00:00Z',esc:x=>String(x??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;'),moneyShort:String,money:String,avatar:()=>'',toast:t=>toasts.push(t),alert:(text,options)=>{alerts.push({text,...options});return Promise.resolve();}},
    kit:{banner:options=>options.actions||'',kpis:()=>''},auth:{user:()=>({uid:e.uid,email:'synthetic@example.invalid'}),productUser:{...copy(e.member),productReadOnly:true,email:'synthetic@example.invalid'}},session:{rol:()=>e.role,asesorId:()=>e.member.advisorId,rolesAsignados:()=>e.member.roles},access:{},
    productRuntimeBrowserProvidersP0:{browserFirestoreWriteAuthorized:false,serverWriteTransport:'firebase-functions',noFallback:true,initialize:async()=>({auth:{currentUser:{uid:e.uid}}}),callFunction:async(name,data,region)=>{
      const call={name,data:copy(data),region};calls.push(call);
      const promise=(async()=>{if(beforeCall)await beforeCall(call,e);const result=await e.command[name](e.request(copy(data)));call.result=copy(result);return afterCall?afterCall(result,call,e):result;})();
      inflight.add(promise);try{return await promise;}finally{inflight.delete(promise);}
    }}
  };
  const context=vm.createContext({Orbit,OrbitBackend:{tenantId:e.tenant},window:{Orbit,dispatchEvent:()=>{}},document:{getElementById:id=>id==='eq-body'?body:null,dispatchEvent:()=>{},addEventListener:()=>{}},location:{hostname:preview?'ays-orbit-360-lab--gi-i65-b4-sr-41066435386-r09pl1ti.web.app':'ays-orbit-360-lab.web.app'},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options&&options.detail;}},setTimeout,clearTimeout,Date,console});
  vm.runInContext(fs.readFileSync(path.join(repo,'orbit360-platform/core/access-scope.js'),'utf8'),context,{filename:'access-scope.js'}); vm.runInContext(source.facade,context,{filename:paths.facade});Orbit.productOperationalWriteP0.install(base);
  vm.runInContext(source.equipo,context,{filename:paths.equipo});Orbit.modules.equipo.render(host);
  async function flush(){for(let n=0;n<8;n++){await new Promise(resolve=>setImmediate(resolve));if(inflight.size)await Promise.allSettled([...inflight]);}}
  async function event(selector,eventName,value,{force=false}={}){const element=host.querySelector(selector);assert.ok(element,'Rendered node missing: '+selector);if(value!==undefined)element.value=String(value);if(element.disabled&&!force)return false;assert.equal(typeof element.listeners[eventName],'function','Event owner missing: '+selector);await element.listeners[eventName]();await flush();return true;}
  await event('.tab[data-t="metas"]','click');
  return{e,Orbit,host,body,calls,toasts,alerts,context,flush,event,writeCalls:()=>calls.filter(c=>c.data.mutations.length),fixtures:()=>[...e.rows].filter(([p,r])=>p.startsWith(e.col('metas'))&&r.__metasPreviewQa===true).map(([,r])=>r),audits:()=>[...e.rows].filter(([p])=>p.startsWith(e.col('auditoria'))).map(([,r])=>r)};
}
const start=x=>x.event('#meta-qa-start','click');
const edit=(x,type,value)=>x.event('[data-meta-prueba="'+type+'"]','change',value);
const businessUnchanged=e=>assert.deepEqual(e.rows.get(e.col('metas')+e.real.id),e.real);


const results=[];
function seeded(){
  const e=server({countries:['GT','CO']});
  e.rows.set(e.col('asesores')+e.member.advisorId,{id:e.member.advisorId,nombre:'Synthetic actor',roles:['SuperAdmin','Operativo','Asesor'],rolDefault:'SuperAdmin',paises:['GT','CO'],pais:'GT',scopeDatos:'todos',dataScopes:{default:'todos',modules:{}},modulosExtra:[],modulosRestringidos:[],modulosOverride:['equipo','inicio']});
  return e;
}
function safeVisible(x,expected){
  const visible=x.body.innerHTML+' '+JSON.stringify(x.alerts);
  assert.ok(visible.includes(expected),expected+' should be visible');
  for(const secret of ['private@example.invalid','secret-token-123','<script>','trace-at-hidden.js'])assert.ok(!visible.includes(secret),'must not display arbitrary detail '+secret);
}
(async()=>{
  const helper=vm.createContext({});
  const startHelper=source.equipo.indexOf('  function metaQaErrorCode('),endHelper=source.equipo.indexOf('  async function inspectMetaQa(');
  assert.ok(startHelper>=0&&endHelper>startHelper,'Diagnostic helper must precede inspect owner');
  vm.runInContext(source.equipo.slice(startHelper,endHelper),helper);
  const tests=[
    [new Error('PRODUCT_WRITE_ACCESS_DENIED'),'PRODUCT_WRITE_ACCESS_DENIED'],
    [{code:'PRODUCT_WRITE_RECORD_SCOPE_DENIED',message:'private@example.invalid'},'PRODUCT_WRITE_RECORD_SCOPE_DENIED'],
    [{code:'functions/internal',message:'private@example.invalid secret-token-123'},'functions/internal'],
    [{code:'auth/network-request-failed',message:'private@example.invalid'},'auth/network-request-failed'],
    [new TypeError('private@example.invalid'),'CLIENT_TYPE_ERROR'],
    [new ReferenceError('secret-token-123'),'CLIENT_REFERENCE_ERROR'],
    [new RangeError('secret-token-123'),'CLIENT_RANGE_ERROR'],
    [{name:'NetworkError',stack:'trace-at-hidden.js'},'CLIENT_NETWORK_ERROR'],
    [{code:'PRODUCT_WRITE_PRIVATE_UID',message:'private@example.invalid'},'UNCLASSIFIED_ERROR'],
    [{message:'PRODUCT_WRITE_ACCESS_DENIED private@example.invalid'},'UNCLASSIFIED_ERROR'],
    [{code:'functions/internal<script>'},'UNCLASSIFIED_ERROR'],
    [{name:'toString'},'UNCLASSIFIED_ERROR'],
    [{name:'__proto__'},'UNCLASSIFIED_ERROR'],
    ['private@example.invalid','UNCLASSIFIED_ERROR'],
    [null,'UNCLASSIFIED_ERROR'],[undefined,'UNCLASSIFIED_ERROR'],
    [{code:'functions/internal',message:'META_CANONICAL_READBACK_MISMATCH'},'META_CANONICAL_READBACK_MISMATCH'],
    [{message:'PRODUCT_SERVER_CANONICAL_READBACK_TARGET_MISSING:metas/private@example.invalid'},'PRODUCT_SERVER_CANONICAL_READBACK_TARGET_MISSING'],
    [{message:'PRODUCT_SERVER_CANONICAL_DELETE_NOT_CONFIRMED:metas/secret-token-123'},'PRODUCT_SERVER_CANONICAL_DELETE_NOT_CONFIRMED'],
    [{message:'PRODUCT_SERVER_CANONICAL_WRITE_NOT_CONFIRMED:auditoria/trace-at-hidden.js'},'PRODUCT_SERVER_CANONICAL_WRITE_NOT_CONFIRMED'],
    [{code:'PRODUCT_WRITE_ACCESS_DENIED:private@example.invalid'},'PRODUCT_WRITE_ACCESS_DENIED'],
    [{code:'functions/unavailable:secret-token-123'},'functions/unavailable'],
    [{code:'PRODUCT_PRIVATE_ID:secret-token-123'},'UNCLASSIFIED_ERROR'],
    [{message:'<script>PRODUCT_WRITE_ACCESS_DENIED:private@example.invalid'},'UNCLASSIFIED_ERROR']
  ];
  for(const [value,wanted]of tests)assert.equal(helper.metaQaErrorCode(value),wanted);
  results.push({case:'closed-code-sanitization',passed:tests.length});
  {
    const e=seeded(),x=await browser(e);
    assert.equal(x.Orbit.access.dataScope('equipo'),'all');
    assert.equal(x.Orbit.access.can('equipo','create'),true);
    assert.equal(x.Orbit.access.canAccessRecord({pais:'GT'},'equipo',{collection:'metas'}),true);
    await start(x);await edit(x,'prima',1300);
    assert.equal(x.fixtures().length,1);assert.equal(x.fixtures()[0].valor,1300);assert.equal(x.audits().length,1);
    await x.event('#meta-qa-restore','click');assert.equal(x.fixtures().length,0);assert.equal(x.audits().length,2);businessUnchanged(e);
    results.push({case:'real-access-happy-path',operations:x.calls.map(c=>c.data.metaPreviewQa.operation),passed:true});
  }
  {
    const e=seeded(),x=await browser(e,{beforeCall:call=>{if(call.data.metaPreviewQa.operation==='inspect')throw Object.assign(new Error('private@example.invalid secret-token-123'),{code:'functions/unavailable'});}});
    safeVisible(x,'INSPECT/functions/unavailable');assert.equal(x.writeCalls().length,0);assert.equal(x.fixtures().length,0);businessUnchanged(e);
    results.push({case:'inspect-error-visible-sanitized',passed:true});
  }
  {
    const e=seeded(),x=await browser(e,{beforeCall:call=>{if(call.data.metaPreviewQa.operation==='probe')throw Object.assign(new Error('private@example.invalid'),{code:'functions/permission-denied'});}});
    await start(x);safeVisible(x,'START/functions/permission-denied');assert.equal(x.writeCalls().length,0);assert.equal(x.fixtures().length,0);businessUnchanged(e);
    results.push({case:'start-error-visible-sanitized',passed:true});
  }
  {
    const e=seeded(),x=await browser(e);await start(x);
    const actualCan=x.Orbit.access.can;
    x.Orbit.access.can=(module,action)=>action==='create'?false:actualCan(module,action);
    await edit(x,'prima',1300);safeVisible(x,'SAVE/PRODUCT_WRITE_ACCESS_DENIED');assert.equal(x.writeCalls().length,0);assert.equal(x.fixtures().length,0);assert.equal(x.audits().length,0);businessUnchanged(e);
    results.push({case:'save-local-denial-visible-before-RPC',writeCalls:0,passed:true});
  }
  {
    const e=seeded(),x=await browser(e,{beforeCall:call=>{if(call.data.metaPreviewQa.operation==='restore')throw Object.assign(new Error('private@example.invalid secret-token-123'),{code:'functions/unavailable'});}});
    await start(x);await edit(x,'prima',1300);await x.event('#meta-qa-restore','click');
    safeVisible(x,'RESTORE/functions/unavailable');assert.equal(x.fixtures().length,1);assert.equal(x.fixtures()[0].valor,1300);assert.equal(x.audits().length,1);businessUnchanged(e);
    results.push({case:'restore-error-visible-preserves-fixture',passed:true});
  }
  {
    const e=seeded(),x=await browser(e,{beforeCall:call=>{if(call.data.metaPreviewQa.operation==='write')throw new Error('PRODUCT_SERVER_CANONICAL_READBACK_TARGET_MISSING:metas/private@example.invalid secret-token-123');}});
    await start(x);await edit(x,'prima',1300);safeVisible(x,'SAVE/PRODUCT_SERVER_CANONICAL_READBACK_TARGET_MISSING');
    assert.equal(x.writeCalls().length,1);assert.equal(x.fixtures().length,0);assert.equal(x.audits().length,0);businessUnchanged(e);
    results.push({case:'save-colon-code-shows-no-record-or-payload',passed:true});
  }
  {
    const e=seeded(),x=await browser(e);await start(x);
    delete x.context.OrbitBackend;
    await edit(x,'prima',1300);safeVisible(x,'SAVE/CLIENT_REFERENCE_ERROR');
    assert.equal(x.writeCalls().length,0);assert.equal(x.fixtures().length,0);assert.equal(x.audits().length,0);businessUnchanged(e);
    results.push({case:'save-native-reference-error-before-RPC',writeCalls:0,passed:true});
  }
  const total=results.reduce((sum,row)=>sum+(typeof row.passed==='number'?row.passed:1),0);
  console.log(JSON.stringify({total,passed:total,failed:0,syntheticOnly:true,externalRequests:0,results},null,2));
})().catch(error=>{console.error(error);const passed=results.reduce((sum,row)=>sum+(typeof row.passed==='number'?row.passed:1),0);console.log(JSON.stringify({total:31,passed,failed:1,skipped:30-passed,syntheticOnly:true,externalRequests:0}));process.exitCode=1;});
