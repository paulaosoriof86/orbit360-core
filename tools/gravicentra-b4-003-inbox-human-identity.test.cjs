'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const index=fs.readFileSync('orbit360-platform/index.html','utf8');
const ciclo=fs.readFileSync('orbit360-platform/core/ciclo.js','utf8');
const start=index.indexOf('function inboxHumanIdentity(');
const end=index.indexOf('      function open(){',start);
assert.ok(start>=0&&end>start,'INBOX_HUMAN_IDENTITY_OWNER_NOT_FOUND');
const source=index.slice(start,end).trim();
assert.match(index,/var actor=inboxHumanIdentity\(n\.actorName,n\.actorUid\)/,'INBOX_AUTHOR_MUST_USE_SHARED_RESOLVER');
assert.match(index,/inboxHumanIdentity\(n\.resolvedByName,n\.resolvedByUid\)/,'INBOX_RESOLVER_MUST_USE_SHARED_RESOLVER');
function makeResolver(productUser={},records={}){
  const Orbit={auth:{productUser},store:{get:(coll,uid)=>records[coll+'|'+uid]||null}};
  return vm.runInNewContext('('+source+')',{Orbit},{timeout:1000});
}
const resolved=makeResolver({uid:'viewer-example',nombre:'Persona Consultora'},{
  'usuarios|author-example':{nombre:'Persona Autora'},
  'members|member-example':{displayName:'Persona Miembro'},
  'asesores|advisor-example':{nombre:'Persona Asesora'}
});
assert.equal(resolved('Orbit LAB','viewer-example'),'Persona Consultora','SESSION_UID_HUMAN_NAME');
assert.equal(resolved('Usuario autenticado','author-example'),'Persona Autora','AUTHORIZED_USER_NAME');
assert.equal(resolved('Orbit LAB','member-example'),'Persona Miembro','AUTHORIZED_MEMBER_NAME');
assert.equal(resolved('','advisor-example'),'Persona Asesora','AUTHORIZED_ADVISOR_NAME');
assert.equal(resolved('Persona Histórica',''), 'Persona Histórica','VALID_HISTORICAL_NAME_PRESERVED');
for(const name of ['Orbit LAB','Orbit360 LAB','Usuario autenticado','Usuario autorizado','Direccion','AdminTenant','QA','uid:secret','auth:mock','maria@example.test','A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6'])
  assert.equal(resolved(name,'unknown-uid'),'Usuario del equipo','INVALID_HISTORICAL_ACTOR_'+name);
const broken=vm.runInNewContext('('+source+')',{Orbit:{auth:{productUser:{uid:'x',name:'x@example.test'}},store:{get:()=>{throw new Error('not loaded');}}}},{timeout:1000});
assert.equal(broken('Orbit LAB','not-loaded'),'Usuario del equipo','NO_NETWORK_FALLBACK');
function ownerSlice(text,from,to){
  const begin=text.indexOf(from),finish=text.indexOf(to,begin+from.length);
  assert.ok(begin>=0&&finish>begin,'HUMAN_IDENTITY_OWNER_NOT_FOUND: '+from);
  return text.slice(begin,finish).trim();
}
const projectionSource=ownerSlice(index,'function publishInboxProjection(){','function paint(){');
const scopeSource=ownerSlice(index,'function inboxScope(){','function refresh(force){');
const tenantSource=ownerSlice(index,'function tenant(){','function preview(){');
const roleSource=ownerSlice(index,'function activeRole(){','function provider(){');
const currentUserSource=ownerSlice(ciclo,'function currentUserIdentity(){','function currentUserName(){');
const commentSource=ownerSlice(ciclo,'function humanCommentAuthor(c){','\n  return {');
// Execute the actual owners with an authorized-notice response and an empty
// scoped roster. These doubles perform no network calls or persistent writes.
function makeProjectionHarness(notices=[]){
  const state={role:'Asesor',topName:'Persona Consultora',authUser:{},labels:[],draft:{value:'Texto pendiente de guardar'}};
  const events=[],listeners=new Map();
  const Orbit={
    auth:{productUser:{uid:'viewer-example',nombre:'Persona Consultora'},user:()=>state.authUser},
    session:{rol:()=>state.role},
    store:{get:()=>null,all:()=>[]}
  };
  const window={__ORBIT360_PRODUCT_PUBLIC_CONFIG__:{tenantHint:'tenant-example'}};
  const document={
    querySelector:selector=>selector==='#tb-user .who b'?{textContent:state.topName}:null,
    querySelectorAll:selector=>{assert.equal(selector,'[data-collab-author-uid]','refresh must select only author labels');return state.labels;},
    addEventListener:(name,listener)=>{if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(listener);},
    dispatchEvent:event=>{events.push(event);for(const listener of listeners.get(event.type)||[])listener(event);return true;},
    activeElement:state.draft
  };
  Object.defineProperty(document,'innerHTML',{set:()=>assert.fail('must not replace the document')});
  const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const context=vm.createContext({
    Orbit,window,document,rows:notices,refreshState:'ready',lastPublishedInboxSignature:'',
    S:()=>Orbit.store,U:{esc},displayStamp:value=>String(value||''),
    CustomEvent:function(type,options){this.type=type;this.detail=options.detail;}
  });
  vm.runInContext([tenantSource,roleSource,scopeSource,source,projectionSource,currentUserSource,commentSource].join('\n'),context,{timeout:1000});
  return {context,Orbit,window,state,events,document,listeners};
}
let behaviorChecks=0;
function check(label,run){
  try{run();behaviorChecks++;}catch(error){error.message=label+': '+error.message;throw error;}
}
function notice(actorName='Persona Autora',actorUid='author-example'){
  return {eventId:'notice-example',actorUid,actorName,globalResolved:false};
}
// Notice IDs and comment IDs deliberately differ; the authorized link is UID.
const comment=Object.freeze({eventId:'comment-example',actorUid:'author-example',actorName:'author@example.test',user:'author@example.test'});
const h=makeProjectionHarness([notice()]);
h.context.publishInboxProjection();
check('CROSS_USER_COMMENT_USES_AUTHORIZED_NOTICE_WITHOUT_ROSTER',()=>{
  assert.equal(h.context.inboxHumanIdentity('Persona Autora','author-example'),'Persona Autora');
  assert.equal(h.context.humanCommentAuthor(comment),'Persona Autora');
  assert.equal(comment.actorName,'author@example.test','historical source remains untouched');
});
check('NOTICE_PROJECTION_EXPOSES_ONLY_MATCHING_UID_NAME',()=>{
  assert.equal(h.Orbit.sharedInboxState.actorNameFor('author-example'),'Persona Autora');
  assert.equal(h.Orbit.sharedInboxState.actorNameFor('unknown-example'),'');
  assert.equal(h.Orbit.sharedInboxState.actorNameFor(''),'');
  assert.equal(h.context.humanCommentAuthor({...comment,actorUid:'unknown-example'}),'Usuario del equipo');
});
check('EXISTING_SHARED_TASK_STATE_IS_PRESERVED',()=>{
  assert.equal(h.Orbit.sharedInboxState.lookup('notice-example').known,true);
  assert.equal(h.Orbit.sharedInboxState.lookup('notice-example').globalResolved,false);
  assert.equal(h.Orbit.sharedInboxState.lookup('missing-example').known,false);
});
for(const [scope,mutate] of [
  ['UID',x=>{x.Orbit.auth.productUser={uid:'different-viewer',nombre:'Otra Persona'};}],
  ['ROLE',x=>{x.state.role='Operativo';}],
  ['TENANT',x=>{x.window.__ORBIT360_PRODUCT_PUBLIC_CONFIG__.tenantHint='different-tenant';}]
])check('RETAINED_PROJECTION_REJECTS_CHANGED_'+scope,()=>{
  const x=makeProjectionHarness([notice()]);x.context.publishInboxProjection();
  const snapshot=x.Orbit.sharedInboxState;
  mutate(x); // No republish: validate the getter against the live session.
  assert.equal(snapshot.actorNameFor('author-example'),'');
  assert.equal(snapshot.lookup('notice-example').known,false);
  assert.equal(x.context.humanCommentAuthor(comment),'Usuario del equipo');
});
for(const refreshState of ['loading','error'])check('RETAINED_PROJECTION_REJECTS_'+refreshState.toUpperCase(),()=>{
  const x=makeProjectionHarness([notice()]);x.context.publishInboxProjection();
  const snapshot=x.Orbit.sharedInboxState;
  x.context.refreshState=refreshState;
  assert.equal(snapshot.actorNameFor('author-example'),'');
  assert.equal(snapshot.lookup('notice-example').known,false);
  assert.equal(x.context.humanCommentAuthor(comment),'Usuario del equipo');
});
check('UNREADY_PROJECTION_CANNOT_BECOME_VALID_WITHOUT_REPUBLISH',()=>{
  const x=makeProjectionHarness([notice()]);x.context.refreshState='loading';x.context.publishInboxProjection();
  const snapshot=x.Orbit.sharedInboxState;
  x.context.refreshState='ready';
  assert.equal(snapshot.actorNameFor('author-example'),'');
  assert.equal(snapshot.lookup('notice-example').known,false);
});
check('AUTHOR_NAME_CHANGE_PUBLISHES_NEW_INBOX_STATE',()=>{
  const x=makeProjectionHarness([notice()]);x.context.publishInboxProjection();
  const count=x.events.length;
  assert.equal(count,1);
  x.context.publishInboxProjection();assert.equal(x.events.length,count,'unchanged projection has no duplicate event');
  x.context.rows=[notice('Persona Editada')];x.context.publishInboxProjection();
  assert.equal(x.events.length,count+1,'same eventId and resolved state, different name');
  assert.equal(x.events.at(-1).type,'orbit:inbox-state');
  assert.equal(x.context.humanCommentAuthor(comment),'Persona Editada');
});
check('CONFLICTING_AUTHORIZED_NAMES_FAIL_NEUTRAL',()=>{
  const x=makeProjectionHarness([notice(),{...notice('Otra Persona'),eventId:'second-notice'},{...notice(),eventId:'third-notice'}]);
  x.context.publishInboxProjection();
  assert.equal(x.Orbit.sharedInboxState.actorNameFor('author-example'),'');
  assert.equal(x.context.humanCommentAuthor(comment),'Usuario del equipo');
});
check('REPEATED_CONSISTENT_NOTICES_KEEP_THE_HUMAN_NAME',()=>{
  const x=makeProjectionHarness([notice(),{...notice(),eventId:'second-notice'}]);
  x.context.publishInboxProjection();
  assert.equal(x.context.humanCommentAuthor(comment),'Persona Autora');
});
check('LATE_INBOX_HYDRATION_UPDATES_LABELS_WITHOUT_REPLACING_DRAFT',()=>{
  const x=makeProjectionHarness();
  function label(){
    const node={textContent:'Usuario del equipo',getAttribute:name=>({'data-collab-author-uid':comment.actorUid,'data-collab-author-name':comment.actorName}[name]??null)};
    Object.defineProperty(node,'innerHTML',{set:()=>assert.fail('author update must use textContent')});
    return node;
  }
  const commentLabel=label(),historyLabel=label(),unmountedLabel=label();
  x.state.labels=[commentLabel,historyLabel];
  const draft=x.state.draft,active=x.document.activeElement;
  assert.equal(x.listeners.get('orbit:inbox-state').length,1,'one listener, no per-modal capture');
  x.context.rows=[notice()];x.context.publishInboxProjection();
  assert.equal(commentLabel.textContent,'Persona Autora');
  assert.equal(historyLabel.textContent,'Persona Autora');
  assert.equal(unmountedLabel.textContent,'Usuario del equipo');
  assert.strictEqual(x.state.draft,draft);
  assert.equal(draft.value,'Texto pendiente de guardar');
  assert.strictEqual(x.document.activeElement,active);
});
check('COMMENT_AND_HISTORY_RENDER_THE_SAME_REACTIVE_AUTHOR_LABEL',()=>{
  const x=makeProjectionHarness([notice()]);x.context.publishInboxProjection();
  for(const html of [x.context.comRow({...comment,texto:'Mensaje de ejemplo'}),x.context.bitRow({...comment,campo:'Comentario',a:'Registrado'})]){
    assert.match(html,/data-collab-author-uid="author-example"/);
    assert.match(html,/data-collab-author-name="author@example.test"/);
    assert.match(html,/>Persona Autora<\/span>/);
  }
});
for(const invalidName of ['author@example.test','AdminTenant','Usuario del equipo','uid:author-example','Orbit LAB'])
  check('TECHNICAL_NOTICE_NAME_IS_NOT_IDENTITY_EVIDENCE: '+invalidName,()=>{
    const x=makeProjectionHarness([notice(invalidName)]);x.context.publishInboxProjection();
    assert.equal(x.Orbit.sharedInboxState.actorNameFor('author-example'),'');
    assert.equal(x.context.humanCommentAuthor(comment),'Usuario del equipo');
  });
check('NO_UID_OR_AUTHORIZED_NOTICE_REMAINS_NEUTRAL',()=>{
  const x=makeProjectionHarness([notice('Persona Autora','')]);x.context.publishInboxProjection();
  assert.equal(x.context.humanCommentAuthor(comment),'Usuario del equipo');
  x.Orbit.sharedInboxState=undefined;
  assert.equal(x.context.humanCommentAuthor(comment),'Usuario del equipo');
  assert.equal(x.context.humanCommentAuthor({actorName:'Persona Histórica'}),'Persona Histórica');
  assert.equal(x.context.humanCommentAuthor({actorName:'author@example.test'}),'Usuario del equipo');
});
check('WRITER_SKIPS_PRIMARY_EMAIL_FOR_VALID_SESSION_NAME',()=>{
  const x=makeProjectionHarness();
  x.Orbit.auth.productUser={uid:'writer-example',email:'writer@example.test',nombre:'writer@example.test',displayName:'Persona Editora'};
  const identity=x.context.currentUserIdentity();
  assert.equal(identity.name,'Persona Editora');
  assert.equal(identity.uid,'writer-example');
  assert.equal(identity.email,'writer@example.test');
});
check('WRITER_SKIPS_TECHNICAL_PRODUCT_NAME_FOR_AUTH_NAME',()=>{
  const x=makeProjectionHarness();
  x.Orbit.auth.productUser={uid:'writer-example',nombre:'writer@example.test',displayName:'AdminTenant'};
  x.state.authUser={displayName:'Persona Editora'};
  assert.equal(x.context.currentUserIdentity().name,'Persona Editora');
});
check('WRITER_USES_VALID_TOPBAR_AFTER_INVALID_SESSION_NAMES',()=>{
  const x=makeProjectionHarness();
  x.Orbit.auth.productUser={uid:'writer-example',email:'writer@example.test',nombre:'writer@example.test',displayName:'AdminTenant'};
  x.state.topName='Persona de Cabecera';
  assert.equal(x.context.currentUserIdentity().name,'Persona de Cabecera');
});
check('WRITER_WITHOUT_HUMAN_EVIDENCE_STAYS_NEUTRAL',()=>{
  const x=makeProjectionHarness();
  x.Orbit.auth.productUser={uid:'writer-example',email:'writer@example.test',nombre:'writer@example.test',displayName:'AdminTenant'};
  x.state.topName='Usuario';
  assert.equal(x.context.currentUserIdentity().name,'Usuario del equipo');
});
console.log('PASS I6.5/B4-003 transversal inbox and Ops/Leads human identities; scoped author behavior checks='+behaviorChecks+'; synthetic_only_no_network_no_writes');

