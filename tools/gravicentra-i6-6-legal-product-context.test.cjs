'use strict';
// Real product-owner composition with synthetic storage and identity. This
// checks owner/event behavior; full HTML is independently parsed by lxml in the
// causal local evidence. No Firebase, browser session or real consent is used.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const g=require('./gravicentra-i6-6-direction-preview-legal-acceptance.cjs');
const read=rel=>fs.readFileSync(path.join(__dirname,'../orbit360-platform',rel),'utf8');
class Element{
  constructor(){this.attrs={};this.style={};this.controls=new Map();this.events={};this.children=[];this.classList={add(){},remove(){}};this.textContent='';this.checked=false;this.disabled=false;this.value='';}
  setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k]??null;}removeAttribute(k){delete this.attrs[k];}
  set innerHTML(v){this.html=String(v);this.controls.clear();}get innerHTML(){return this.html||'';}
  addEventListener(k,fn){(this.events[k]||=[]).push(fn);}fire(k){for(const fn of this.events[k]||[])fn({target:this});}
  appendChild(n){n.parentNode=this;this.children.push(n);}removeChild(n){this.children=this.children.filter(x=>x!==n);n.parentNode=null;}
  querySelector(selector){const id=selector.startsWith('#')?selector.slice(1):'';if(!id||!this.innerHTML.includes('id="'+id+'"'))return null;if(!this.controls.has(id)){const n=new Element();n.id=id;this.controls.set(id,n);}return this.controls.get(id);}
}
async function setup(options={}){
  const timers=[],memory=new Map(),body=new Element(),selector=new Element(),printed=[];
  const document={readyState:'loading',body,head:new Element(),documentElement:Object.assign(new Element(),{dataset:{}}),addEventListener(){},dispatchEvent(){},createElement:()=>new Element(),getElementById:id=>id==='pais-sel'?selector:null,querySelector:()=>null,querySelectorAll:s=>s==='[data-legal-gate]'?body.children.filter(n=>n.getAttribute('data-legal-gate')):[]};
  const localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,String(v))};
  const sessionStorage={getItem:()=>options.viewCountry||null,setItem(){throw Error('COUNTRY_PREFERENCE_MUST_NOT_CHANGE');}};
  const Orbit={},location={origin:g.ORIGIN,hostname:new URL(g.ORIGIN).hostname,hash:'#/inicio'};
  const window={Orbit,location,sessionStorage,__ORBIT360_PRODUCT_PUBLIC_CONFIG__:{enabled:true,scopedReadPreviewCandidate:true,tenantHint:g.TENANT},
    __ORBIT360_TENANT_BRANDING_SNAPSHOT__:{schemaVersion:'gravicentra-tenant-branding-build-snapshot-v1',tenantId:options.snapshotTenant||g.TENANT,hash:'a'.repeat(64),sourcePath:'tenants/'+(options.snapshotTenant||g.TENANT)+'/config/branding',branding:{displayName:options.brandingName||'Alianzas & Soluciones',legalName:'Alianzas & Soluciones Corredores de Seguros'}},
    dispatchEvent(){},requestIdleCallback:fn=>timers.push(fn),open:()=>({document:{write:s=>printed.push(s),close(){}},print(){}})};
  const ctx=vm.createContext({window,Orbit,location,document,localStorage,sessionStorage,CustomEvent:function(){},console,setTimeout:fn=>timers.push(fn),fetch(){throw Error('NETWORK_NOT_ALLOWED');}});
  const run=rel=>vm.runInContext(read(rel),ctx,{filename:rel});
  run('core/config.js');
  if(options.localTenant)Object.assign(Orbit.tenant.get(),options.localTenant);
  run('core/public-tenant-branding.js');run('core/auth-product-runtime-p0.js');
  Orbit.auth.productUser={uid:'synthetic-direction-uid',email:'direction@example.invalid',advisorId:g.ADVISOR,tenantId:options.memberTenant||g.TENANT,productReadOnly:true,countries:options.countries||['GT','CO'],tipo:'interno'};
  Orbit.productRuntimeBrowserProvidersP0={protectedHostMode:()=> 'preview',dependencies:()=>({})};
  Orbit.backendProductReadOnlyBootstrapP0={start:async()=>({ok:true,ready:true,writeAuthorized:false})};
  Orbit.productHydrationRequiredOptionalP0={contract:()=>({required:['clientes']})};
  Orbit.store={_productStatus:()=>({ready:true,status:'ready-read-only',noFallback:true,writeEnabled:false,tenantId:Orbit.auth.productUser.tenantId})};
  Orbit.productOperationalWriteP0={install:()=>({ready:true,failClosed:true})};
  Orbit.academiaProductCatalogP0={install:()=>({ready:true,requiredCoursesPresent:true,automaticWrites:false,seed:false,lab:false})};
  Orbit.router={init(){}};
  for(const rel of ['core/product-tenant-runtime-context-bridge-p0.js','core/product-app-p0.js','core/legal.js'])run(rel);
  await Orbit.productAppP0.activate();while(timers.length)timers.shift()();
  const gate=()=>document.querySelectorAll('[data-legal-gate]')[0];
  return{Orbit,window,document,memory,selector,printed,gate,select:country=>{const select=gate().querySelector('#lg-country');assert.ok(select,'LEGAL_COUNTRY_SELECTOR_REQUIRED');select.value=country;select.fire('change');},check:()=>{const box=gate().querySelector('#lg-chk');box.checked=true;box.fire('change');},click:()=>gate().querySelector('#lg-ok').fire('click')};
}
test('real product defaults and public branding supply the reviewed company without a local tenant-name overlay',async()=>{
  const h=await setup({countries:['GT'],localTenant:{nombre:'Stale local identity'}});
  assert.equal(h.Orbit.tenant.get().nombre,'Stale local identity');
  assert.equal(g.digest(g.projectCatalog(h.Orbit.legal.catalogo())),g.TERMS_SHA256);
  assert.equal(h.gate().getAttribute('data-legal-country'),'GT');
  assert.match(h.gate().querySelector('#lg-clauses').innerHTML,/Alianzas & Soluciones/);
  assert.doesNotMatch(h.gate().querySelector('#lg-clauses').innerHTML,/Stale local identity|el Intermediario/);
  assert.equal(h.memory.size,0);
});
test('multi-country TODOS context requires an explicit visible legal country and cannot accept before it',async()=>{
  const h=await setup(),gate=h.gate();
  assert.equal(h.Orbit.pais,'TODOS');assert.equal(h.selector.value,'TODOS');
  assert.equal(gate.getAttribute('data-legal-country'),'');assert.equal(gate.getAttribute('data-legal-country-required'),'1');
  assert.ok(gate.querySelector('#lg-country'));assert.equal(gate.querySelector('#lg-chk').disabled,true);assert.equal(gate.querySelector('#lg-ok').disabled,true);
  h.check();h.click();assert.equal(h.memory.size,0);assert.equal(h.gate(),gate);
  h.select('GT');assert.equal(gate.getAttribute('data-legal-country'),'GT');assert.equal(gate.querySelector('#lg-chk').checked,false);
  assert.equal(gate.querySelector('#lg-chk').disabled,false);assert.equal(gate.querySelector('#lg-ok').disabled,true);
  assert.match(gate.querySelector('#lg-clauses').innerHTML,/República de Guatemala/);
  assert.equal(h.Orbit.pais,'TODOS');assert.equal(h.selector.value,'TODOS');
});
test('stale local country defaults cannot silently choose a jurisdiction in an authenticated multi-country session',async()=>{
  const h=await setup({localTenant:{paisDefault:'GT'}});
  assert.equal(h.Orbit.pais,'TODOS');assert.equal(h.Orbit.tenant.get().paisDefault,'GT');
  assert.equal(h.gate().getAttribute('data-legal-country'),'');assert.ok(h.gate().querySelector('#lg-country'));
  assert.equal(h.gate().querySelector('#lg-chk').disabled,true);assert.equal(h.memory.size,0);
  const one=await setup({countries:['CO'],localTenant:{paisDefault:'GT'}});
  assert.equal(one.gate().getAttribute('data-legal-country'),'CO');assert.equal(one.gate().querySelector('#lg-country'),null);
});
test('changing or clearing the legal country regenerates the clauses and requires a fresh checkbox',async()=>{
  const h=await setup();h.select('GT');h.check();assert.equal(h.gate().querySelector('#lg-ok').disabled,false);
  h.select('CO');assert.equal(h.gate().querySelector('#lg-chk').checked,false);assert.equal(h.gate().querySelector('#lg-ok').disabled,true);
  assert.match(h.gate().querySelector('#lg-clauses').innerHTML,/República de Colombia/);assert.doesNotMatch(h.gate().querySelector('#lg-clauses').innerHTML,/República de Guatemala/);
  h.check();h.select('');assert.equal(h.gate().getAttribute('data-legal-country'),'');assert.equal(h.gate().querySelector('#lg-chk').disabled,true);assert.equal(h.gate().querySelector('#lg-ok').disabled,true);
  h.select('INVALID');h.click();assert.equal(h.memory.size,0);assert.equal(h.Orbit.pais,'TODOS');
});
test('acceptance and print use the exact presented country and company despite later global changes',async()=>{
  const h=await setup();h.select('GT');
  h.Orbit.pais='CO';h.Orbit.tenant.get().paisDefault='CO';
  h.window.__ORBIT360_TENANT_BRANDING_SNAPSHOT__.branding.displayName='Different later branding';
  h.Orbit.publicTenantBranding.apply({displayName:'Different later branding',source:'tenant-config-live'});
  h.gate().querySelector('#lg-print').fire('click');
  assert.match(h.printed[0],/Parte:<\/b> Alianzas & Soluciones/);assert.match(h.printed[0],/País:<\/b> GT/);assert.doesNotMatch(h.printed[0],/Different later branding/);
  h.check();h.click();
  const records=JSON.parse(h.memory.get('orbit360_legal_aceptaciones')),record=records['user:direction@example.invalid'];
  assert.equal(record.pais,'GT');assert.equal(record.empresa,'Alianzas & Soluciones');assert.equal(record.actorUid,'synthetic-direction-uid');assert.equal(record.acceptanceMethod,'VISIBLE_CHECKBOX_AND_BUTTON');
  assert.equal(h.gate(),undefined);assert.equal(h.Orbit.pais,'CO');
});
test('single-country and explicitly selected view contexts retain country and do not add an ambiguous selector',async()=>{
  for(const options of [{countries:['GT']},{countries:['CO']},{countries:['GT','CO'],viewCountry:'GT'},{countries:['GT','CO'],viewCountry:'CO'}]){
    const h=await setup(options),expected=options.viewCountry||options.countries[0];
    assert.equal(h.gate().getAttribute('data-legal-country'),expected);assert.equal(h.gate().querySelector('#lg-country'),null);assert.equal(h.gate().querySelector('#lg-chk').disabled,false);assert.equal(h.memory.size,0);
  }
});
test('dismiss and reentry preserve legal history and do not infer country selection or consent',async()=>{
  const h=await setup(),prior={version:'1.0',aceptado:true,pais:'CO',fecha:'2026-01-01'};
  h.memory.set('orbit360_legal_aceptaciones',JSON.stringify({'user:previous':prior}));
  h.select('GT');h.check();h.Orbit.legal.dismiss('user:direction@example.invalid');assert.equal(h.gate(),undefined);
  h.Orbit.legal.gate('interno','user:direction@example.invalid');assert.equal(h.gate().getAttribute('data-legal-country'),'');assert.equal(h.gate().querySelector('#lg-chk').checked,false);
  assert.deepEqual(JSON.parse(h.memory.get('orbit360_legal_aceptaciones')),{'user:previous':prior});
});
test('public branding for a different tenant cannot supply a legal company identity',async()=>{
  for(const options of [{snapshotTenant:'other-tenant'},{memberTenant:'other-tenant'}]){
    const h=await setup({...options,countries:['GT'],localTenant:{nombre:'Stale local identity'}});
    assert.doesNotMatch(h.gate().querySelector('#lg-clauses').innerHTML,/Alianzas & Soluciones|Stale local identity/);
    assert.notEqual(g.digest(g.projectCatalog(h.Orbit.legal.catalogo())),g.TERMS_SHA256);assert.equal(h.memory.size,0);
  }
});
module.exports={setup};
