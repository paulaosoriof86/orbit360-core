'use strict';
// Render the real accepted detail owner with in-memory disposable records.
// This proves the QA selectors match its markup; it is not signed browser QA.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const owner=fs.readFileSync(path.join(root,'orbit360-platform/modules/policy-receipts-v1199-detail-guard.js'),'utf8');
const driver=fs.readFileSync(path.join(__dirname,'gravicentra-i6-6-advisor-payables-signed-uat.cjs'),'utf8');
const element=()=>({innerHTML:'',style:{},classList:{add(){}},appendChild(){},addEventListener(){},querySelector(){return null;},querySelectorAll(){return [];}});
function render({policyPresent=true,clientAllowed=true}={}){
  const host=element(),client={id:'qa-client',nombre:'Cliente sintético',pais:'GT'},policy={id:'qa-policy',clienteId:client.id,numero:'QA-001',pais:'GT',moneda:'GTQ',ramo:'Vida',primaNeta:100,primaTotal:120,estado:'Vigente',vigenciaInicio:'2026-07-01',vigenciaFin:'2027-07-01'};
  const rows={polizas:policyPresent?[policy]:[],clientes:[client],vehiculos:[],recibosEsperados:[],cobros:[],comisiones:[],asesores:[],aseguradoras:[]};
  let legacyCalls=0;
  const ctx={document:{head:element(),body:element(),getElementById(){return null;},createElement:element,addEventListener(){},querySelectorAll(){return [];}},location:{hash:''},setTimeout:fn=>{fn();return 1;},clearTimeout(){},encodeURIComponent};
  ctx.window=ctx;ctx.addEventListener=()=>{};
  ctx.Orbit={store:{get:(c,id)=>(rows[c]||[]).find(r=>r.id===id),all:c=>rows[c]||[],_productStatus:()=>({serverConfirmedCollections:Object.keys(rows)}),_ensureCollections(){},insert(){throw Error('NO_WRITES');},update(){throw Error('NO_WRITES');},remove(){throw Error('NO_WRITES');}},
    access:{activeRole:()=> 'Dirección',canView:()=>clientAllowed},ui:{esc:v=>String(v),money:(v,c)=>c+' '+v,fmtDate:String},route:{params:{c:client.id,p:policy.id}},modules:{cliente360:{render(){legacyCalls++;},verPoliza(){legacyCalls++;},verVehiculo(){}},cobros:{}},q:{}};
  vm.runInNewContext(owner,ctx,{filename:'policy-receipts-v1199-detail-guard.js'});
  ctx.Orbit.modules.cliente360.verPoliza(policy.id);
  ctx.Orbit.modules.cliente360.render(host);
  return{html:host.innerHTML,route:ctx.location.hash,legacyCalls};
}
// A bounded HTML tag reader is sufficient for the two exact owner attributes.
function nodes(html){
  const stack=[],out=[],voids=new Set(['input','br','hr','img','meta','link']);
  for(const match of html.matchAll(/<(\/?)([A-Za-z][\w-]*)([^>]*?)>/g)){
    const [,closing,tag,raw]=match;
    if(closing){while(stack.length){if(stack.pop().tag===tag.toLowerCase())break;}continue;}
    const attrs={};for(const a of raw.matchAll(/([\w-]+)="([^"]*)"/g))attrs[a[1]]=a[2];
    const node={tag:tag.toLowerCase(),attrs,parents:stack.slice()};out.push(node);
    if(!voids.has(node.tag)&&!raw.endsWith('/'))stack.push(node);
  }
  return out;
}
function editMatches(html,selector){
  const parsed=selector.match(/^(\[data-policy-fullpage="1"\]|#c360-edit) button\[onclick="([^"]+)"\]$/);
  assert.ok(parsed,'Expected a scoped policy edit selector, without fallback');
  return nodes(html).filter(n=>n.tag==='button'&&n.attrs.onclick===parsed[2]&&n.parents.some(p=>parsed[1]==='#c360-edit'?p.attrs.id==='c360-edit':p.attrs['data-policy-fullpage']==='1'));
}
function currentSelector(id){
  const line=driver.split('\n').find(line=>line.includes('direction.page.locator(')&&line.includes('editarPoliza'));
  assert.ok(line);const expression=line.match(/\.locator\((.+)\)\.click\(\);/)[1];
  return vm.runInNewContext(expression,{fx:{ids:{policy60:id}}});
}
test('accepted composition makes the policy row navigate to the full-page owner',()=>{
  const index=fs.readFileSync(path.join(root,'orbit360-platform/index.html'),'utf8');
  assert.ok(index.indexOf('modules/cliente360.js?')<index.indexOf('modules/policy-receipts-v1199-detail-guard.js?'));
  const view=render();assert.equal(view.route,'#/cliente360?c=qa-client&p=qa-policy');assert.equal(view.legacyCalls,0);
  assert.match(view.html,/data-policy-fullpage="1"/);assert.doesNotMatch(view.html,/id="(?:c360-edit|vp-x)"/);
});
test('current QA edit selector selects only the exact policy; legacy selector reproduces zero matches',()=>{
  const view=render();assert.equal(editMatches(view.html,currentSelector('qa-policy')).length,1);
  assert.equal(editMatches(view.html,currentSelector('other-policy')).length,0);
  assert.equal(editMatches(view.html,'#c360-edit button[onclick="Orbit.modules.cliente360.editarPoliza(\'qa-policy\')"]').length,0);
  assert.equal(editMatches(render({policyPresent:false}).html,currentSelector('qa-policy')).length,0);
});
test('after Cancelar QA uses the owner client link, not the removed detail-modal close button',()=>{
  const view=render(),links=[...view.html.matchAll(/<a\b([^>]*)>([^<]*)<\/a>/g)].filter(m=>m[2]==='👤 Cliente 360');
  assert.equal(links.length,1);assert.ok(links[0][1].includes('href="#/cliente360?c=qa-client&t=polizas"'));
  assert.match(driver,/getByRole\('link',\{name:'👤 Cliente 360',exact:true\}\)\.click\(\)/);
  assert.doesNotMatch(driver,/#vp-x|#c360-edit button\[onclick/);
  assert.equal([...render({clientAllowed:false}).html.matchAll(/>👤 Cliente 360<\/a>/g)].length,0,'no navigation bypass when client read is denied');
});
