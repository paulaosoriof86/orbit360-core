'use strict';
// Integration proof using unmodified product bytes: rendered UI events -> facade
// -> canonical callable -> transactional in-memory Firestore. This is not browser UAT.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const repo=path.resolve(process.argv[2]||'.'),output=process.argv[3];
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
    kit:{banner:options=>options.actions||'',kpis:()=>''},auth:{user:()=>({uid:e.uid,email:'synthetic@example.invalid'}),productUser:{...copy(e.member),productReadOnly:true,email:'synthetic@example.invalid'}},session:{rol:()=>e.role},access:{can:()=>canEdit,canAccessRecord:()=>true},
    productRuntimeBrowserProvidersP0:{browserFirestoreWriteAuthorized:false,serverWriteTransport:'firebase-functions',noFallback:true,initialize:async()=>({auth:{currentUser:{uid:e.uid}}}),callFunction:async(name,data,region)=>{
      const call={name,data:copy(data),region};calls.push(call);
      const promise=(async()=>{if(beforeCall)await beforeCall(call,e);const result=await e.command[name](e.request(copy(data)));call.result=copy(result);return afterCall?afterCall(result,call,e):result;})();
      inflight.add(promise);try{return await promise;}finally{inflight.delete(promise);}
    }}
  };
  const context=vm.createContext({Orbit,OrbitBackend:{tenantId:e.tenant},window:{Orbit,dispatchEvent:()=>{}},document:{getElementById:id=>id==='eq-body'?body:null,dispatchEvent:()=>{},addEventListener:()=>{}},location:{hostname:preview?'ays-orbit-360-lab--gi-i65-b4-sr-41066435386-r09pl1ti.web.app':'ays-orbit-360-lab.web.app'},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options&&options.detail;}},setTimeout,clearTimeout,Date,console});
  vm.runInContext(source.facade,context,{filename:paths.facade});Orbit.productOperationalWriteP0.install(base);
  vm.runInContext(source.equipo,context,{filename:paths.equipo});Orbit.modules.equipo.render(host);
  async function flush(){for(let n=0;n<8;n++){await new Promise(resolve=>setImmediate(resolve));if(inflight.size)await Promise.allSettled([...inflight]);}}
  async function event(selector,eventName,value,{force=false}={}){const element=host.querySelector(selector);assert.ok(element,'Rendered node missing: '+selector);if(value!==undefined)element.value=String(value);if(element.disabled&&!force)return false;assert.equal(typeof element.listeners[eventName],'function','Event owner missing: '+selector);await element.listeners[eventName]();await flush();return true;}
  await event('.tab[data-t="metas"]','click');
  return{e,Orbit,host,body,calls,toasts,alerts,context,flush,event,writeCalls:()=>calls.filter(c=>c.data.mutations.length),fixtures:()=>[...e.rows].filter(([p,r])=>p.startsWith(e.col('metas'))&&r.__metasPreviewQa===true).map(([,r])=>r),audits:()=>[...e.rows].filter(([p])=>p.startsWith(e.col('auditoria'))).map(([,r])=>r)};
}
const start=x=>x.event('#meta-qa-start','click');
const edit=(x,type,value)=>x.event('[data-meta-prueba="'+type+'"]','change',value);
const businessUnchanged=e=>assert.deepEqual(e.rows.get(e.col('metas')+e.real.id),e.real);
const cases=[
  ['preview_explicit_context_and_real_goals_read_only',async()=>{
    const e=server(),x=await browser(e);assert.equal(x.calls.length,1);assert.equal(x.calls[0].data.metaPreviewQa.operation,'inspect');assert.equal(e.writes.length,0);
    assert.equal(x.host.querySelector('[data-meta-institucional="prima"]').disabled,true);assert.equal(x.host.querySelector('[data-meta-prueba="prima"]'),null);
    await x.event('[data-meta-institucional="prima"]','change',999,{force:true});assert.equal(x.writeCalls().length,0);businessUnchanged(e);
    await start(x);assert.equal(x.calls[1].data.metaPreviewQa.operation,'probe');assert.equal(e.writes.length,0);assert.equal(x.host.querySelector('[data-meta-prueba="prima"]').disabled,false);assert.match(x.body.innerHTML,/QA-B4-003/);
  }],
  ['create_edit_two_fixtures_atomic_with_canonical_audit',async()=>{
    const e=server(),x=await browser(e);await start(x);await edit(x,'prima',125);
    assert.equal(x.writeCalls().length,1);const first=x.writeCalls()[0];assert.equal(first.name,'orbit360ProductOperationalCommandPreview');assert.equal(first.region,'us-east1');assert.equal(first.data.mutations.length,2);assert.equal(first.result.canonicalReadbackCount,2);
    assert.equal(x.fixtures().length,1);const id=x.fixtures()[0].id;assert.match(id,/^b4003qa_metas_.+_prima$/);assert.equal(x.fixtures()[0].valor,125);assert.equal(x.fixtures()[0].mes,'QA-B4-003');assert.equal(x.audits().length,1);assert.equal(x.audits()[0].__metasPreviewEvidence.serverVerified,true);
    assert.match(x.toasts.at(-1),/confirmadas/);assert.equal(x.alerts.length,0);
    await edit(x,'prima',250);assert.equal(x.fixtures()[0].id,id);assert.equal(x.fixtures()[0].valor,250);assert.equal(x.writeCalls()[1].data.mutations[0].action,'update');
    await edit(x,'recaudo',90);assert.equal(x.fixtures().length,2);assert.equal(x.audits().length,3);assert.equal(x.Orbit.store.all('metas').length,1);assert.equal(x.Orbit.modules.equipo.metaInstitucionalDe('2026-10','GT').prima,7000);businessUnchanged(e);
  }],
  ['reload_recovers_via_canonical_inspect_without_projected_markers',async()=>{
    const e=server(),first=await browser(e,{stripReadMarkers:true});await start(first);await edit(first,'prima',177);await edit(first,'recaudo',88);
    const count=e.writes.length,x=await browser(e,{stripReadMarkers:true});assert.equal(e.writes.length,count);assert.equal(x.calls.length,1);assert.equal(x.calls[0].data.metaPreviewQa.operation,'inspect');assert.match(x.body.innerHTML,/recuperada y verificada/);
    assert.equal(x.host.querySelector('[data-meta-prueba="prima"]').value,'177');assert.equal(x.host.querySelector('[data-meta-prueba="recaudo"]').value,'88');assert.equal(x.Orbit.store.all('metas').length,1);
    await edit(x,'prima',178);assert.equal(x.fixtures().find(r=>r.tipo==='prima').valor,178);businessUnchanged(e);
  }],
  ['restore_from_reloaded_ui_removes_only_own_fixtures_and_keeps_history',async()=>{
    const e=server(),first=await browser(e);await start(first);await edit(first,'prima',11);await edit(first,'recaudo',22);const x=await browser(e,{stripReadMarkers:true});
    await x.event('#meta-qa-restore','click');assert.equal(x.fixtures().length,0);assert.equal(x.audits().length,3);const call=x.writeCalls()[0];assert.equal(call.data.mutations.length,3);assert.equal(call.data.metaPreviewQa.operation,'restore');assert.equal(call.result.readback.filter(r=>r.collection==='metas'&&r.exists===false).length,2);
    assert.equal(x.Orbit.store.metaPreviewFixtures().length,0);assert.equal(x.host.querySelector('[data-meta-prueba="prima"]'),null);assert.match(x.toasts.at(-1),/restaurada/);businessUnchanged(e);
    const reload=await browser(e);assert.equal(reload.host.querySelector('[data-meta-prueba="prima"]'),null);assert.equal(reload.host.querySelector('#meta-qa-start').disabled,false);
  }],
  ['audit_conflict_on_create_prevents_partial_meta_commit_and_false_success',async()=>{
    const e=server(),x=await browser(e,{beforeCall(call){if(call.data.mutations.length){const audit=call.data.mutations.find(m=>m.collection==='auditoria');e.rows.set(e.col('auditoria')+audit.id,{id:audit.id,existing:true});}}});await start(x);const count=e.writes.length;await edit(x,'prima',125);
    assert.equal(e.writes.length,count);assert.equal(x.fixtures().length,0);assert.equal(x.Orbit.store.metaPreviewFixtures().length,0);assert.equal(x.toasts.length,0);assert.equal(x.alerts.at(-1).title,'Confirmación pendiente');assert.doesNotMatch(x.alerts.at(-1).text,/No guardado/);businessUnchanged(e);
  }],
  ['audit_conflict_on_update_preserves_prior_value',async()=>{
    const e=server();let rejectAudit=false;const x=await browser(e,{beforeCall(call){if(rejectAudit&&call.data.mutations.length){const audit=call.data.mutations.find(m=>m.collection==='auditoria');e.rows.set(e.col('auditoria')+audit.id,{id:audit.id,existing:true});}}});await start(x);await edit(x,'prima',41);rejectAudit=true;const count=e.writes.length,toasts=x.toasts.length;await edit(x,'prima',999);
    assert.equal(e.writes.length,count);assert.equal(x.fixtures()[0].valor,41);assert.equal(x.Orbit.store.metaPreviewFixtures()[0].valor,41);assert.equal(x.toasts.length,toasts);businessUnchanged(e);
  }],
  ['restore_conflict_preserves_fixture_and_recovery_context',async()=>{
    const e=server(),x=await browser(e,{beforeCall(call){if(call.data.metaPreviewQa&&call.data.metaPreviewQa.operation==='restore'){const audit=call.data.mutations.find(m=>m.collection==='auditoria');e.rows.set(e.col('auditoria')+audit.id,{id:audit.id,existing:true});}}});await start(x);await edit(x,'prima',34);const count=e.writes.length;await x.event('#meta-qa-restore','click');
    assert.equal(e.writes.length,count);assert.equal(x.fixtures()[0].valor,34);assert.equal(x.host.querySelector('#meta-qa-restore').disabled,false);assert.equal(x.alerts.at(-1).title,'Restauración pendiente');businessUnchanged(e);
  }],
  ['incomplete_audit_readback_never_displays_success',async()=>{
    const e=server(),x=await browser(e,{afterCall(result,call){if(call.data.mutations.length)return{...result,readback:result.readback.filter(row=>row.collection!=='auditoria'),canonicalReadbackCount:1};return result;}});await start(x);await edit(x,'prima',63);assert.equal(x.fixtures()[0].valor,63);assert.equal(x.audits().length,1);assert.equal(x.toasts.length,0);assert.equal(x.alerts.at(-1).title,'Confirmación pendiente');
    const reload=await browser(e);assert.equal(reload.host.querySelector('[data-meta-prueba="prima"]').value,'63');businessUnchanged(e);
  }],
  ['unavailable_contract_blocks_test_without_writes',async()=>{
    const e=server(),x=await browser(e,{beforeCall(call){if(!call.data.mutations.length)throw new HttpsError('invalid-argument','Old backend does not support empty batch');}});assert.equal(e.writes.length,0);assert.equal(x.host.querySelector('#meta-qa-start').disabled,true);assert.ok(x.host.querySelector('#meta-qa-retry'));assert.equal(x.host.querySelector('[data-meta-prueba="prima"]'),null);businessUnchanged(e);
  }],
  ['probe_mismatch_blocks_new_test_without_writes',async()=>{
    const e=server(),x=await browser(e,{afterCall(result,call){if(call.data.metaPreviewQa.operation==='probe')return{...result,metaPreviewQa:{...result.metaPreviewQa,restoreSupported:false}};return result;}});await start(x);assert.equal(e.writes.length,0);assert.equal(x.host.querySelector('[data-meta-prueba="prima"]'),null);assert.equal(x.alerts.at(-1).title,'Prueba pendiente');businessUnchanged(e);
  }],
  ['business_period_selector_cannot_change_reserved_test_period',async()=>{
    const e=server(),x=await browser(e);await start(x);await x.event('#meta-periodo','change','2026-11');await edit(x,'prima',12);assert.equal(x.writeCalls()[0].data.metaPreviewQa.periodo,'QA-B4-003');assert.equal(x.fixtures()[0].mes,'QA-B4-003');businessUnchanged(e);
  }],
  ['advisor_ui_has_no_institutional_test_or_inspection',async()=>{
    const e=server({role:'Asesor',scope:'propios'}),x=await browser(e);assert.equal(x.host.querySelector('#meta-qa-start'),null);assert.equal(x.calls.length,0);assert.equal(e.writes.length,0);businessUnchanged(e);
  }],
  ['country_denied_by_real_backend_prevents_test_start',async()=>{
    const e=server({countries:['CO']}),x=await browser(e);assert.equal(x.host.querySelector('#meta-qa-start').disabled,true);assert.equal(e.writes.length,0);assert.equal(x.fixtures().length,0);businessUnchanged(e);
  }],
  ['current_secure_roster_does_not_aggregate_noncalendar_fixtures',async()=>{
    const e=server(),x=await browser(e);const read=month=>e.roster.orbit360AssignableAdvisorRosterPreview(e.request({purpose:'inicio',country:'GT',month}));
    const before=copy(await read('2026-10'));await start(x);await edit(x,'prima',5000);await edit(x,'recaudo',9000);assert.deepEqual(copy(await read('2026-10')),before);assert.deepEqual(copy((await read('2099-12')).globalMetas),{});
    await assert.rejects(read('QA-B4-003'),err=>err.code==='invalid-argument');businessUnchanged(e);
  }],
  ['live_business_goal_and_audit_share_one_batch',async()=>{
    const e=server(),x=await browser(e,{preview:false});assert.equal(x.calls.length,0);assert.equal(x.host.querySelector('#meta-qa-start'),null);assert.equal(x.host.querySelector('[data-meta-institucional="prima"]').disabled,false);
    await x.event('[data-meta-institucional="prima"]','change',7100);assert.equal(x.calls.length,1);assert.equal(x.calls[0].name,'orbit360ProductOperationalCommand');assert.equal(x.calls[0].region,'us-central1');assert.equal(x.calls[0].data.mutations.length,2);assert.equal(x.calls[0].data.metaPreviewQa,undefined);assert.equal(e.rows.get(e.col('metas')+e.real.id).valor,7100);assert.equal(x.audits().length,1);assert.match(x.toasts.at(-1),/auditoría confirmadas/);
  }],
  ['live_audit_failure_has_no_partial_business_goal_commit',async()=>{
    const e=server(),x=await browser(e,{preview:false,beforeCall(call){const audit=call.data.mutations.find(m=>m.collection==='auditoria');e.rows.set(e.col('auditoria')+audit.id,{id:audit.id,existing:true});}});await x.event('[data-meta-institucional="prima"]','change',9999);assert.equal(e.writes.length,0);assert.equal(x.toasts.length,0);assert.equal(x.alerts.at(-1).title,'Guardado sin confirmar');businessUnchanged(e);
  }],
  ['live_rejects_preview_metadata_locally',async()=>{
    const e=server(),x=await browser(e,{preview:false});await assert.rejects(x.Orbit.store.metaPreviewQaProbe({version:1,runId:'test_run_1234',pais:'GT',periodo:'QA-B4-003'}),/FORBIDDEN_ON_LIVE/);assert.equal(x.calls.length,0);assert.equal(e.writes.length,0);businessUnchanged(e);
  }]
];
(async()=>{
  const tests=[];for(const [id,test] of cases){try{await test();tests.push({id,pass:true});}catch(error){tests.push({id,pass:false,error:error.stack||error.message});}}
  const sourceBindings=Object.fromEntries(Object.entries(paths).map(([key,file])=>{const bytes=fs.readFileSync(path.join(repo,file));return[key,{path:file,blob:crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex')}];}));
  const result={schema:'gravicentra-metas-atomic-ui-integration-v1',scope:'offline VM / rendered DOM / canonical owners / memory transaction; not browser UAT',syntheticOnly:true,externalRequests:0,sourceBindings,total:tests.length,passed:tests.filter(t=>t.pass).length,failed:tests.filter(t=>!t.pass).length,tests,releaseAccepted:false};
  if(output)fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));process.exitCode=result.failed?1:0;
})().catch(error=>{console.error(error);process.exitCode=2;});
