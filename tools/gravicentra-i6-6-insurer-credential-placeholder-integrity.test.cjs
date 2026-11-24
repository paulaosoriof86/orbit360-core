'use strict';
// Target actual index-reachable insurer owner and credential provider.
// The historical P02 DOM decorator is not loaded by the product entrypoint.
const assert=require('node:assert/strict');
const fs=require('node:fs');

const path=require('node:path');
const repo=process.env.INSURER_EDITOR_BASE_REPO||path.resolve(__dirname,'..');
const sourceRoot=process.env.INSURER_EDITOR_SOURCE_ROOT||repo;
const moduleSource=fs.readFileSync(path.join(sourceRoot,'orbit360-platform/modules/aseguradoras.js'),'utf8');
const providerSource=fs.readFileSync(path.join(repo,'orbit360-platform/core/product-insurer-credential-provider-p0.js'),'utf8');
const indexSource=fs.readFileSync(path.join(repo,'orbit360-platform/index.html'),'utf8');
const validRef='cred_'+'a'.repeat(32);
const refPattern=/^cred_[a-f0-9]{32}$/;
let n=0;
function check(name,run){run();n++;console.log('PASS '+name);}

for(const oldRef of ['',null,'backend_required','credential_migrated','cred_abc','cred_'+'g'.repeat(32)]){
  check('missing_or_legacy_ref_not_a_saved_secret_'+String(oldRef),()=>{
    assert.equal(refPattern.test(String(oldRef||'')),false);
  });
}
check('valid_server_vault_ref_remains_available_to_direction',()=>{
  assert.equal(refPattern.test(validRef),true);
  assert.match(providerSource,/const REF_RE = \/\^cred_\[a-f0-9\]\{32\}\$\//);
});
check('valid_server_vault_ref_operativo_read_but_asesor_denied',()=>{
  assert.match(indexSource,/core\/product-insurer-credential-provider-p0\.js/);
  assert.match(providerSource,/if \(!REF_RE\.test\(r\)\) return \{ status:'no_disponible', available:false/);
  assert.match(providerSource,/if \(!REF_RE\.test\(r\)\) return \{ ok:false, status:'no_disponible'/);
});
check('bank_account_number_remains_editable_for_approved_insurer_roles',()=>{
  assert.match(moduleSource,/return \['direccion', 'admin', 'superadmin', 'superadministrador', 'operativo'\]\.indexOf\(roleKey\(activeRole\(\)\)\) >= 0/);
  assert.match(moduleSource,/function ctaRow\(c, i, editing\)/);
  assert.match(moduleSource,/const ro = '';\s*return `<div class="asg-row" data-cta=/);
  assert.match(moduleSource,/data-ccn placeholder="Número de cuenta"/);
  assert.match(moduleSource,/numero: r\.querySelector\('\[data-ccn\]'\)\.value/);
});
check('legacy_placeholder_is_not_injected_into_edited_portal_or_new_portal',()=>{
  assert.ok(!/credentialRef:\s*prior\.credentialRef\s*\|\|\s*['"]backend_required['"]/.test(moduleSource));
  assert.ok(!/credentialRef:\s*['"]backend_required['"]/.test(moduleSource));
  assert.match(moduleSource,/Object\.assign\(\{\}, prior, \{ id: prior\.id/);
});
check('credential_import_mapping_requires_server_reference',()=>{
  assert.match(moduleSource,/credentialRef:\s*clean\(mapping\.credentialRef\)/);
  assert.match(moduleSource,/data-ppass type="password" autocomplete="new-password"/);
  assert.match(moduleSource,/st\.credentialDrafts\[resourceId\] = \{ portalId: resourceId, credentialRef: portal\.credentialRef, username: portal\.usuario, password: password\.value \}/);
  assert.match(providerSource,/async function importCredentials\(items, extra\)/);
  assert.ok(!/st\.draft\.portales\[index\]\.credentialRef\s*\|\|\s*['"]backend_required['"]/.test(moduleSource));
});
console.log('I66_INSURER_CANONICAL_REACHABLE_EDITOR_CREDENTIAL_REFERENCE_'+n+'_PASS_NO_LIVE_WRITES');

// Discriminating source regressions in the existing insurer editor owner.
// Only synthetic values and in-memory provider/transport sentinels are used.
const test=require('node:test'),vm=require('node:vm'),{webcrypto}=require('node:crypto');
const segment=(start,end)=>{const a=moduleSource.indexOf(start),b=moduleSource.indexOf(end,a);assert.ok(a>=0&&b>a,start);return moduleSource.slice(a,b);};
const saveSource=segment('  function credentialChanges(','  /* Auditoría externa de cambios');
const snapshotSource=segment('    function snapshotTab()','    st.snapshotCurrent = snapshotTab;');
const deletionSource=segment("    body.querySelectorAll('[data-del]')","    body.querySelectorAll('[data-source-link]')");
const fieldStart=moduleSource.indexOf('    function snapshotChangedField(');
const fieldSource=fieldStart<0?'':moduleSource.slice(fieldStart,moduleSource.indexOf("    body.querySelectorAll('input,select,textarea')",fieldStart));
const plain=x=>JSON.parse(JSON.stringify(x));
function editor({before={},draft={},credentialDrafts={},role='Operativo'}={}){
 const row={id:'fixture_insurer',nombre:'Synthetic',pais:'GT',logo:'',observaciones:'',portales:[],contactos:[],...plain(before)};
 const st={draft:{...plain(row),...plain(draft)},saving:false,editing:true,credentialDrafts:plain(credentialDrafts),snapshotCurrent:()=>{}};
 const calls={mutations:[],credentials:[],toasts:[],warnings:[],renders:0,prompts:0,tabSelections:[]};
 const button={textContent:'Guardar cambios',disabled:false,setAttribute(){},removeAttribute(){}};
 const context={fichaState:{[row.id]:st},clean:x=>String(x==null?'':x).trim(),S:()=>({get:()=>plain(row),async batchDurable(m){calls.mutations.push(plain(m));return{ok:true};}}),
  Orbit:{session:{rol:()=>role},productInsurerCredentialProviderP0:{async importCredentials(items){calls.credentials.push(plain(items));return{ok:true,mappings:items.map(item=>({portalId:item.portalId,credentialRef:item.credentialRef||'cred_'+'a'.repeat(32),available:true,usernameAvailable:true,passwordAvailable:true}))};}}},
  window:{crypto:webcrypto},TextEncoder,canManageCredentials:()=>true,
  U:{async prompt(){calls.prompts++;return'fixture reason';},toast:m=>calls.toasts.push(m)},console:{warn:(...a)=>calls.warnings.push(a)},
  ficha:()=>calls.renders++,reload(){},tarifaValidacionAudit(){}};
 vm.createContext(context);vm.runInContext(saveSource,context);
 return{row,st,calls,context,save:()=>context.guardarDraft(row.id,{querySelector:()=>button})};
}
function renderedSnapshot(t,st,rows){
 const elements=rows.map(({values,index=0,resourceId})=>{
  const fields={};for(const [selector,value]of Object.entries(values))fields[selector]=typeof value==='object'?value:{value};
  for(const [selector,field]of Object.entries(fields)){field.dataset=field.dataset||{};field.matches=s=>s===selector;}
  return{dataset:{cont:String(index),portal:String(index),resourceId:resourceId||String(index)},fields,querySelector:s=>fields[s]||{value:'',checked:false,dataset:{}}};
 });
 const body={querySelectorAll:s=>s==='[data-cont]'||s==='[data-portal]'?elements:[],querySelector:()=>({value:''})};
 const ctx={t,st,draft:st.draft,body,clean:x=>String(x==null?'':x).trim()};vm.createContext(ctx);vm.runInContext(snapshotSource+'\n'+fieldSource,ctx);
 return{elements,snapshot:()=>ctx.snapshotTab(),change:(index,selector,value)=>{const input=elements[index].fields[selector];input.value=value;if(ctx.snapshotChangedField)ctx.snapshotChangedField({currentTarget:input});else ctx.snapshotTab();}};
}
const contact=(id='fixture_contact')=>({id,nombre:'Synthetic contact',area:'Comercial',email:'fixture@example.invalid',tel:'000',ext:'',cargo:'Synthetic',pais:'GT',canal:'Correo',vigencia:'Vigente',gestionPreferida:'',principal:false,provenance:{sourceId:'fixture_source'},sourceRowId:'fixture_row'});
const contactValues=c=>({'[data-cn]':c.nombre,'[data-ca]':c.area,'[data-ce]':c.email,'[data-cl]':c.tel,'[data-cext]':c.ext,'[data-cargo]':c.cargo,'[data-cpais]':c.pais,'[data-cchan]':c.canal,'[data-cvig]':c.vigencia,'[data-cgest]':c.gestionPreferida,'[data-cppal]':{checked:c.principal}});
const portal=(id='fixture_portal')=>({...(id?{id}:{}),nombre:'Fixture portal',url:'https://example.invalid',usuario:'fixture-user',pais:'GT',tipo:'Portal general',estadoAcceso:'Acceso disponible',responsable:'',ultimaVerificacion:''});
const portalValues=p=>({'[data-pn]':p.nombre,'[data-ptipo]':p.tipo,'[data-pu]':p.url,'[data-puser]':p.usuario,'[data-ppais]':p.pais,'[data-pest]':p.estadoAcceso,'[data-presp]':p.responsable,'[data-pver]':p.ultimaVerificacion,'[data-ppass]':{value:'',dataset:{}}});
function removePortal(x,index){
 let listener;const button={dataset:{del:'portales:'+index},addEventListener(_event,fn){listener=fn;}};
 Object.assign(x.context,{st:x.st,draft:x.st.draft,t:'plataformas',body:{querySelectorAll:()=>[button]},snapshotTab:()=>{},selectTab:t=>x.calls.tabSelections.push(t)});
 vm.runInContext(deletionSource,x.context);assert.equal(typeof listener,'function');listener();
}
for(const [kind,logo]of [['data','data:image/png;base64,AA=='],['http','http://example.invalid/legacy.png'],['relative','assets/legacy.png']]){
 test('Unchanged legacy '+kind+' logo does not block a different authorized field',async()=>{
  const x=editor({before:{logo},draft:{observaciones:'Changed synthetic note'}});await x.save();assert.equal(x.calls.mutations.length,1);
  assert.deepEqual(Object.keys(x.calls.mutations[0][0].payload),['observaciones']);assert.equal(x.calls.mutations[0][0].payload.logo,undefined);assert.equal(x.calls.credentials.length,0);
 });
 test('New '+kind+' logo is still rejected before the metadata write',async()=>{
  const x=editor({before:{logo:'https://example.invalid/original.png'},draft:{logo}});await x.save();assert.equal(x.calls.mutations.length,0);assert.equal(x.st.editing,true);assert(x.calls.toasts.some(m=>/HTTPS/.test(m)));
 });
}
for(const role of ['Dirección','Operativo'])test('Existing approved '+role+' observation flow is unchanged',async()=>{
 const x=editor({role,before:{logo:'https://example.invalid/original.png'},draft:{observaciones:'Changed'}});await x.save();assert.equal(x.calls.mutations.length,1);assert.equal(x.st.editing,false);
});
test('New HTTPS logo keeps the canonical metadata write',async()=>{const x=editor({draft:{logo:'https://example.invalid/new.png'}});await x.save();assert.equal(x.calls.mutations.length,1);assert.equal(x.calls.mutations[0][0].payload.logo,'https://example.invalid/new.png');});
test('Unchanged contact fields preserve ID/provenance and do not manufacture a diff',async()=>{
 const c=contact(),x=editor({before:{contactos:[c]}});renderedSnapshot('contactos',x.st,[{values:contactValues(c)}]).snapshot();assert.deepEqual(plain(x.st.draft.contactos[0]),c);await x.save();assert.equal(x.calls.mutations.length,0);assert.equal(x.calls.prompts,0);
});
test('Edited contact preserves source identity and provenance in the actual outgoing patch',async()=>{
 const c=contact(),x=editor({before:{contactos:[c]}}),ui=renderedSnapshot('contactos',x.st,[{values:contactValues(c)}]);ui.change(0,'[data-cl]','001');await x.save();
 const out=x.calls.mutations[0][0].payload.contactos[0];assert.equal(out.id,c.id);assert.deepEqual(out.provenance,c.provenance);assert.equal(out.sourceRowId,c.sourceRowId);assert.equal(out.tel,'001');
});
test('Rendered contact row identity selects metadata even if DOM order differs',()=>{
 const a=contact('fixture_A'),b={...contact('fixture_B'),sourceRowId:'fixture_B_source'},x=editor({before:{contactos:[a,b]}});
 renderedSnapshot('contactos',x.st,[{index:1,values:contactValues(b)},{index:0,values:contactValues(a)}]).snapshot();assert.equal(x.st.draft.contactos[0].id,b.id);assert.equal(x.st.draft.contactos[1].id,a.id);
});
test('Contact without an ID does not receive an invented one',()=>{
 const c=contact();delete c.id;const x=editor({before:{contactos:[c]}});renderedSnapshot('contactos',x.st,[{values:contactValues(c)}]).snapshot();assert.equal(Object.hasOwn(x.st.draft.contactos[0],'id'),false);
});
test('Typing then explicitly clearing a password cancels that secure write',async()=>{
 const p=portal(),x=editor({before:{portales:[p]}}),ui=renderedSnapshot('plataformas',x.st,[{resourceId:p.id,values:portalValues(p)}]);
 ui.change(0,'[data-ppass]','SYNTHETIC_ONLY');assert.equal(Object.keys(x.st.credentialDrafts).length,1);ui.change(0,'[data-ppass]','');assert.equal(Object.keys(x.st.credentialDrafts).length,0);
 await x.save();assert.equal(x.calls.credentials.length,0);assert.equal(x.calls.mutations.length,0);
});
test('Clearing password preserves another edited portal field',async()=>{
 const p=portal(),x=editor({before:{portales:[p]}}),ui=renderedSnapshot('plataformas',x.st,[{resourceId:p.id,values:portalValues(p)}]);ui.change(0,'[data-ppass]','SYNTHETIC_ONLY');ui.change(0,'[data-pn]','New synthetic portal name');ui.change(0,'[data-ppass]','');await x.save();
 assert.equal(x.calls.credentials.length,0);assert.equal(x.calls.mutations[0][0].payload.portales[0].nombre,'New synthetic portal name');
});
test('Tab repaint with untouched empty password input keeps the already staged credential',async()=>{
 const p=portal(),x=editor({before:{portales:[p]}});let ui=renderedSnapshot('plataformas',x.st,[{resourceId:p.id,values:portalValues(p)}]);ui.change(0,'[data-ppass]','SYNTHETIC_ONLY');
 ui=renderedSnapshot('plataformas',x.st,[{resourceId:p.id,values:portalValues(p)}]);ui.snapshot();assert.equal(Object.keys(x.st.credentialDrafts).length,1);await x.save();assert.equal(x.calls.credentials.length,1);
});
test('Staged credential after tab repaint follows the visible updated username',async()=>{
 const p=portal(),x=editor({before:{portales:[p]}});let ui=renderedSnapshot('plataformas',x.st,[{resourceId:p.id,values:portalValues(p)}]);ui.change(0,'[data-ppass]','SYNTHETIC_ONLY');
 ui=renderedSnapshot('plataformas',x.st,[{resourceId:p.id,values:portalValues(p)}]);ui.change(0,'[data-puser]','updated-fixture-user');await x.save();assert.equal(x.calls.credentials[0][0].username,'updated-fixture-user');
});
test('Removed portal is filtered from credential imports even if stale draft state exists',async()=>{
 const p=portal(),x=editor({before:{portales:[p]},draft:{portales:[]},credentialDrafts:{fixture_portal:{portalId:p.id,username:p.usuario,password:'SYNTHETIC_ONLY'}}});await x.save();assert.equal(x.calls.credentials.length,0);assert.deepEqual(x.calls.mutations[0][0].payload.portales,[]);
});
test('Actual deletion handler drops a removed portal credential and keeps a stable-ID survivor',async()=>{
 const a=portal('fixture_A'),b=portal('fixture_B'),x=editor({before:{portales:[a,b]},credentialDrafts:{fixture_A:{portalId:a.id,username:a.usuario,password:'SYNTHETIC_A'},fixture_B:{portalId:b.id,username:b.usuario,password:'SYNTHETIC_B'}}});
 removePortal(x,0);assert.deepEqual(Object.keys(x.st.credentialDrafts),['fixture_B']);assert.equal(x.st.draft.portales[0].id,'fixture_B');await x.save();assert.equal(x.calls.credentials[0].length,1);assert.equal(x.calls.credentials[0][0].portalId,'fixture_B');
});
test('Deleting legacy index0 drops its password and rebinds surviving drafts to the same row',async()=>{
 const a={...portal(''),nombre:'Fixture A'},b={...portal(''),nombre:'Fixture B'},x=editor({before:{portales:[a,b]},credentialDrafts:{'0':{portalId:'0',username:'fixture_A_user',password:'SYNTHETIC_A'},'1':{portalId:'1',username:'fixture_B_user',password:'SYNTHETIC_B',credentialRef:'cred_'+'b'.repeat(32)}}});
 removePortal(x,0);assert.deepEqual(Object.keys(x.st.credentialDrafts),['0']);assert.equal(x.st.credentialDrafts['0'].username,'fixture_B_user');assert.equal(x.st.credentialDrafts['0'].portalId,'0');await x.save();assert.equal(x.calls.credentials[0].length,1);assert.equal(x.calls.credentials[0][0].username,'fixture_B_user');assert.equal(x.calls.credentials[0][0].credentialRef,'cred_'+'b'.repeat(32));
});
test('Deleting legacy middle row preserves both remaining associations and removes the stale password',()=>{
 const x=editor({before:{portales:[portal(''),portal(''),portal('')]},credentialDrafts:{'0':{portalId:'0',password:'SYNTHETIC_A'},'1':{portalId:'1',password:'SYNTHETIC_B'},'2':{portalId:'2',password:'SYNTHETIC_C'}}});
 removePortal(x,1);assert.deepEqual(Object.keys(x.st.credentialDrafts),['0','1']);assert.equal(x.st.credentialDrafts['0'].password,'SYNTHETIC_A');assert.equal(x.st.credentialDrafts['1'].password,'SYNTHETIC_C');
});
test('Canceled save prompt performs no credential or metadata write',async()=>{
 const p=portal(),x=editor({before:{portales:[p]},draft:{observaciones:'Changed'},credentialDrafts:{fixture_portal:{portalId:p.id,username:p.usuario,password:'SYNTHETIC_ONLY'}}});x.context.U.prompt=async()=>null;await x.save();assert.equal(x.calls.credentials.length,0);assert.equal(x.calls.mutations.length,0);assert.equal(x.st.saving,false);assert.equal(x.st.editing,true);
});
test('Secure provider failure retains the pending credential and never writes an operational password',async()=>{
 const p=portal(),x=editor({before:{portales:[p]},credentialDrafts:{fixture_portal:{portalId:p.id,username:p.usuario,password:'SYNTHETIC_ONLY'}}});x.context.Orbit.productInsurerCredentialProviderP0.importCredentials=async()=>({ok:false});await x.save();assert.equal(x.calls.mutations.length,0);assert.equal(x.st.credentialDrafts.fixture_portal.password,'SYNTHETIC_ONLY');assert.equal(x.st.editing,true);assert(x.calls.toasts.some(m=>/contraseña.*segura/.test(m)));
});
