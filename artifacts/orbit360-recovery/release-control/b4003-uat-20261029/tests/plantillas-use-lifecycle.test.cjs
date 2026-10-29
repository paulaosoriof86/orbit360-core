'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const sourcePath = process.env.PLANTILLAS_SOURCE || path.join(__dirname, '../source/orbit360-platform/modules/plantillas.js');
const source = fs.readFileSync(sourcePath, 'utf8');
function harness() {
  const nodes = new Map(), docHandlers = new Map(), winHandlers = new Map();
  const effects = {writes:0,opens:0,copies:0,accepts:0};
  const handlers = (map,type,fn) => {if(!map.has(type))map.set(type,[]);map.get(type).push(fn);};
  function node(id='') {
    return {id, style:{}, value:'', textContent:'', innerHTML:'', children:new Map(),
      remove(){nodes.delete(this.id);},
      querySelector(sel){if(!this.children.has(sel))this.children.set(sel,node(sel));return this.children.get(sel);},
      querySelectorAll(){return [];},addEventListener(){},setAttribute(){}};
  }
  const document = {body:{appendChild(n){nodes.set(n.id,n);}},
    createElement(){return node();},getElementById(id){return nodes.get(id)||null;},
    addEventListener(type,fn){handlers(docHandlers,type,fn);}};
  const store = {__productOperationalWriteP0:true,all(){return [];},get(){return null;},where(){return [];},
    insert(){effects.writes++;throw new Error('unexpected write');},update(){effects.writes++;throw new Error('unexpected write');},remove(){effects.writes++;throw new Error('unexpected write');}};
  const Orbit = {modules:{},route:{key:'plantillas'},store,
    ui:{esc:v=>String(v??''),money:(v,c)=>`${v} ${c}`,fmtDate:v=>v},
    kit:{bannerFor(key,actions){return actions;},kpis(){return '';}},access:{filter(c,rows){return rows;}},
    legal:{accept(){effects.accepts++;}}};
  const location = {hash:'#/plantillas'};
  const window = {Orbit,location,addEventListener(type,fn){handlers(winHandlers,type,fn);},open(){effects.opens++;}};
  const context = vm.createContext({window,document,Orbit,location,navigator:{clipboard:{writeText(){effects.copies++;return Promise.resolve();}}},setTimeout:()=>0,clearTimeout(){},console});
  vm.runInContext(source,context,{filename:sourcePath});
  const host={innerHTML:'',querySelector(){return null;},querySelectorAll(){return [];}};
  const module=Orbit.modules.plantillas;
  return {module,host,nodes,Orbit,location,effects,docHandlers,winHandlers,
    open(){module.usar('pl-prima');assert.ok(nodes.has('pl-use'));},
    doc(type){for(const fn of docHandlers.get(type)||[])fn({type});},
    hash(value){location.hash=value;for(const fn of winHandlers.get('hashchange')||[])fn({type:'hashchange'});},
    unrelated(id){nodes.set(id,node(id));}};
}
for(const route of ['aseguradoras','inicio','cobros','portal','ruta-no-permitida'])test(`route-ready closes use dialog for ${route}`,()=>{const h=harness();h.open();h.Orbit.route.key=route;h.doc('orbit:route-ready');assert.equal(h.nodes.has('pl-use'),false);});
test('same route keeps the active dialog',()=>{const h=harness();h.open();h.doc('orbit:route-ready');assert.ok(h.nodes.has('pl-use'));});
for(const route of ['#/aseguradoras?ficha=qa','#/inicio','#/login'])test(`hashchange closes use dialog for ${route}`,()=>{const h=harness();h.open();h.hash(route);assert.equal(h.nodes.has('pl-use'),false);});
test('query change on same module does not close dialog',()=>{const h=harness();h.open();h.hash('#/plantillas?canal=WhatsApp');assert.ok(h.nodes.has('pl-use'));});
for(const event of ['orbit:pais','orbit:session'])test(`${event} removes stale recipient context`,()=>{const h=harness();h.open();h.doc(event);assert.equal(h.nodes.has('pl-use'),false);});
test('cleanup does not dismiss unrelated dialogs or edit draft',()=>{const h=harness();h.open();for(const id of ['pl-ed','legal-gate','af-ficha'])h.unrelated(id);h.Orbit.route.key='aseguradoras';h.doc('orbit:route-ready');assert.deepEqual([...h.nodes.keys()].sort(),['af-ficha','legal-gate','pl-ed']);});
test('repeated render/use binds listeners exactly once',()=>{const h=harness();for(let i=0;i<4;i++){h.module.render(h.host);h.open();}for(const type of ['orbit:route-ready','orbit:pais','orbit:session'])assert.equal(h.docHandlers.get(type).length,1);assert.equal(h.winHandlers.get('hashchange').length,1);});
test('cleanup can repeat and dialog can reopen',()=>{const h=harness();h.open();h.doc('orbit:pais');h.doc('orbit:pais');h.open();h.doc('orbit:session');h.open();assert.ok(h.nodes.has('pl-use'));});
test('cleanup triggers no writes, messaging, clipboard or legal acceptance',()=>{const h=harness();h.open();h.doc('orbit:pais');h.open();h.doc('orbit:session');h.open();h.Orbit.route.key='inicio';h.doc('orbit:route-ready');assert.deepEqual(h.effects,{writes:0,opens:0,copies:0,accepts:0});});
test('six base cards remain in read-only mode',()=>{const h=harness();h.module.render(h.host);assert.equal((h.host.innerHTML.match(/class="pl-card"/g)||[]).length,6);assert.match(h.host.innerHTML,/Nueva plantilla · pendiente/);assert.equal(h.effects.writes,0);});
test('unresolved variables are preserved, not invented by lifecycle fix',()=>{const h=harness();assert.equal(h.module.resolver('Pago {monto} vence {vence}',null),'Pago {monto} vence {vence}');});
