'use strict';
// Synthetic VM tests of the pinned canonical LIVE handler. No Firebase SDK,
// network, actual configuration writes, or claim of deployed/UI acceptance.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(process.env.GI_TENANT_CONFIG_TEST_ROOT||path.join(__dirname,'..'));
const sourcePaths=['functions/tenant-domain-config.js','functions/product-active-role-contract.js'];
const sourceBytes=Object.fromEntries(sourcePaths.map(p=>[p,fs.readFileSync(path.join(root,p))]));
const expectedBlobs=['231fb2f106a6c139bb83c367f0f5e1a1c8924823','09681f536c5cbbd36bcba6514d4829d2494b9387'];
const blob=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const domains=['catalogs','workflow','reconciliation','access'];
const tenantId='tenant_vm',uid='user_vm';
const memberPath='tenants/'+tenantId+'/members/'+uid;
const configPath=d=>'tenants/'+tenantId+'/config/'+d;
const json=v=>JSON.parse(JSON.stringify(v));

function harness(options={}){
 const reads=[],writes=[];let transactions=0;
 const member=Object.hasOwn(options,'member')?options.member:{tenantId,status:'active',roles:['Direccion','Asesor'],activeRole:'Direccion'};
 const documents=new Map();if(member!==null)documents.set(memberPath,structuredClone(member));
 for(const [domain,value]of Object.entries(options.configs||{}))documents.set(configPath(domain),structuredClone(value));
 function ref(parts){const key=parts.join('/');return{
  path:key,collection:name=>ref([...parts,name]),doc:id=>ref([...parts,id]),
  async get(){reads.push(key);return{exists:documents.has(key),data:()=>structuredClone(documents.get(key))};},
  set(){writes.push(key);throw Error('UNEXPECTED_VM_DOCUMENT_WRITE');},
  update(){writes.push(key);throw Error('UNEXPECTED_VM_DOCUMENT_WRITE');},
  delete(){writes.push(key);throw Error('UNEXPECTED_VM_DOCUMENT_WRITE');}
 };}
 const db={collection:name=>ref([name]),async runTransaction(){transactions++;throw Error('UNEXPECTED_VM_TRANSACTION');}};
 class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
 const cache=new Map();
 function load(relative){if(cache.has(relative))return cache.get(relative).exports;
  const module={exports:{}};cache.set(relative,module);
  const context={module,exports:module.exports,__dirname:path.dirname(path.join(root,relative)),process:{env:{}},Buffer,
   require(name){
    if(name==='./product-active-role-contract')return load(sourcePaths[1]);
    if(name==='node:crypto')return crypto;
    if(name==='node:path')return path;
    if(name==='node:fs')return{readFileSync(){throw Error('UNEXPECTED_ACADEMIA_FILE_READ');}};
    if(name==='firebase-admin/app')return{getApps:()=>[{}],initializeApp:()=>{throw Error('UNEXPECTED_INIT');}};
    if(name==='firebase-admin/firestore')return{getFirestore:()=>db,FieldValue:{serverTimestamp(){throw Error('UNEXPECTED_WRITE_TIMESTAMP');}}};
    if(name==='firebase-functions/v2/https')return{HttpsError,onCall:(settings,handler)=>Object.assign(handler,{callableOptions:settings})};
    throw Error('UNEXPECTED_DEPENDENCY '+name);
   }};
  vm.runInNewContext(sourceBytes[relative].toString('utf8'),context,{filename:relative,timeout:1000});
  return module.exports;
 }
 const exports=load(sourcePaths[0]);
 return{exports,reads,writes,transactions:()=>transactions,
  call:(data={},auth={uid})=>exports.orbit360TenantDomainConfig({auth,data:{tenantId,action:'get',domain:'catalogs',activeRole:'Direccion',...data}}),
  assertReadOnly(){assert.deepEqual(writes,[]);assert.equal(transactions,0);}
 };
}
async function denied(h,data,code='permission-denied',auth={uid}){
 await assert.rejects(h.call(data,auth),e=>e.code===code);
 h.assertReadOnly();assert.ok(h.reads.every(p=>p===memberPath),'Denied requests must not read configuration');
}

test('Canonical function and role-contract blobs are pinned; LIVE callable stays us-central1',()=>{
 sourcePaths.forEach((p,i)=>assert.equal(blob(sourceBytes[p]),expectedBlobs[i],p));
 const h=harness();assert.equal(h.exports.orbit360TenantDomainConfig.callableOptions.region,'us-central1');
 assert.equal(h.exports.orbit360TenantDomainConfig.callableOptions.cors,true);
 assert.deepEqual(Array.from(h.exports.__tenantDomainConfig.DOMAINS).sort(),domains.slice().sort());h.assertReadOnly();
});
for(const domain of domains)test('LIVE '+domain+' GET returns only canonical tenant document and performs no writes',async()=>{
 const config={schemaVersion:'vm-fixture',marker:domain,nested:{preserved:true}};
 const h=harness({configs:{[domain]:config}});const r=await h.call({domain});
 assert.deepEqual(json(r),{ok:true,domain,exists:true,config,source:'canonical'});
 assert.deepEqual(h.reads,[memberPath,configPath(domain)]);h.assertReadOnly();
});
test('Missing catalogs returns canonical defaults needed by GT and CO workflows without materializing them',async()=>{
 const h=harness(),r=await h.call();assert.equal(r.ok,true);assert.equal(r.exists,false);assert.equal(r.source,'canonical_default');
 assert.equal(r.config.schemaVersion,'gravicentra-tenant-catalogs-v1');
 assert.ok(r.config.ramosPais.GT['Gastos Médicos'].includes('GM Individual'));
 assert.ok(r.config.ramosPais.CO.Salud.includes('Salud Individual'));
 assert.ok(r.config.tiposGestion.some(x=>x.t==='Solicitar condiciones de renovación'));
 assert.ok(r.config.opsListas.some(x=>x.id==='l-renov'));assert.ok(r.config.leadsListas.length>0);
 assert.deepEqual(h.reads,[memberPath,configPath('catalogs')]);h.assertReadOnly();
});
for(const domain of ['workflow','reconciliation','access'])test('Missing '+domain+' stays empty without invented configuration',async()=>{
 const h=harness(),r=await h.call({domain});assert.deepEqual(json(r),{ok:true,domain,exists:false,config:null,source:'empty'});h.assertReadOnly();
});
test('Assigned active Asesor may GET catalogs even when another assigned role is Dirección',async()=>{
 const h=harness();const r=await h.call({activeRole:'Asesor'});assert.equal(r.ok,true);h.assertReadOnly();
});
test('Assigned default active role resolves when request omits activeRole',async()=>{
 const h=harness({member:{status:'activo',rolesAsignados:['Dirección'],rolActivo:'Dirección'}});
 assert.equal((await h.call({activeRole:undefined})).ok,true);h.assertReadOnly();
});
test('Requested unassigned role is denied before config read despite privileged membership',async()=>{
 const h=harness();await denied(h,{activeRole:'SuperAdmin'});assert.deepEqual(h.reads,[memberPath]);
});
test('Legacy activeRole alone does not create an assigned role',async()=>{
 const h=harness({member:{status:'active',activeRole:'Direccion'}});await denied(h,{});assert.deepEqual(h.reads,[memberPath]);
});
const inactiveCases={missing:null,noExplicitState:{active:true},inactiveStatus:{status:'inactive'},contradictoryStates:{status:'active',estado:'inactivo'},activeFlagFalse:{status:'active',active:false},activoFlagFalse:{estado:'activo',activo:false},inactivoFlagTrue:{status:'active',inactivo:true}};
for(const [label,fields]of Object.entries(inactiveCases))test('Membership '+label+' is denied with no config read or write',async()=>{
 const h=harness({member:fields===null?null:{roles:['Direccion'],...fields}});await denied(h,{});assert.deepEqual(h.reads,[memberPath]);
});
for(const domain of domains)test('Active Asesor cannot save '+domain+' through a passive assigned admin role',async()=>{
 const h=harness();await denied(h,{domain,action:'save',activeRole:'Asesor',reason:'VM denied write',config:{}});
 assert.deepEqual(h.reads,[memberPath]);
});
test('Unauthenticated request cannot reach membership or configuration',async()=>{
 const h=harness();await denied(h,{},'unauthenticated',null);assert.deepEqual(h.reads,[]);
});
test('Invalid tenant is rejected before reads',async()=>{
 const h=harness();await denied(h,{tenantId:'../other'},'invalid-argument');assert.deepEqual(h.reads,[]);
});
test('Unsupported domain is rejected before reads',async()=>{
 const h=harness();await denied(h,{domain:'catalogues'},'invalid-argument');assert.deepEqual(h.reads,[]);
});
test('Unsupported action is rejected before reads',async()=>{
 const h=harness();await denied(h,{action:'delete'},'invalid-argument');assert.deepEqual(h.reads,[]);
});
