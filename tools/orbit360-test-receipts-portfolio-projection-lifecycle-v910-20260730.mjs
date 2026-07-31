#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import vm from 'node:vm';

const file='orbit360-platform/core/backend-lab-receipts-portfolio-projection-v910.js';
const source=fs.readFileSync(file,'utf8');
const base={clientes:[{id:'c1'}]};
const store={
  all(name){return (base[name]||[]).slice();},
  get(name,id){return (base[name]||[]).find(x=>x.id===id)||null;},
  where(name,p){const rows=(base[name]||[]).slice();return typeof p==='function'?rows.filter(p):rows;},
  find(name,p){return this.where(name,p)[0]||null;},
  raw(){return JSON.parse(JSON.stringify(base));},
  _emit(){}
};
const docs={
  recibosEsperados:[{id:'r1',clienteId:'c1',primaTotal:10},{id:'r2',clienteId:'c1',primaTotal:20}],
  carteraPrimas:[{id:'p1',reciboId:'r1',clienteId:'c1',primaTotal:10}]
};
function snapFor(name){return{forEach(fn){for(const row of docs[name]||[]){fn({id:row.id,data(){return {...row};}});}}};}
const auth={currentUser:{uid:'u1'},onAuthStateChanged(cb){cb(this.currentUser);return()=>{};}};
const firestore=()=>({collection(){return{doc(){return{collection(name){return{onSnapshot(ok){ok(snapFor(name));return()=>{};}};}};}};}});
const ctx={
  console,
  URLSearchParams,
  location:{search:'?orbitBackend=firestore-lab&tenant=alianzas-soluciones'},
  Orbit:{store,q:{clienteResumen(cid){return{clienteId:cid,salud:70,cobrado:0};}},modules:{}},
  firebase:{auth:()=>auth,firestore},
  CustomEvent:class{constructor(name,opts){this.type=name;this.detail=opts&&opts.detail;}},
  dispatchEvent(){},addEventListener(){},
  setTimeout(fn){return 1;},clearTimeout(){},setInterval(){return 1;},clearInterval(){},
  document:{querySelectorAll(){return[];},getElementById(){return null;},querySelector(){return null;},head:{appendChild(){}}}
};
ctx.window=ctx;
vm.runInNewContext(source,ctx,{filename:file});
const status=ctx.Orbit.receiptsPortfolioProjectionV910&&ctx.Orbit.receiptsPortfolioProjectionV910.status();
const checks={
  projectionPresent:!!ctx.Orbit.receiptsPortfolioProjectionV910,
  ready:status&&status.ready===true,
  bothAttached:status&&Array.isArray(status.attached)&&status.attached.includes('recibosEsperados')&&status.attached.includes('carteraPrimas'),
  receiptCount:status&&status.counts&&status.counts.recibosEsperados===2,
  portfolioCount:status&&status.counts&&status.counts.carteraPrimas===1,
  storeReceipts:ctx.Orbit.store.all('recibosEsperados').length===2,
  storePortfolio:ctx.Orbit.store.all('carteraPrimas').length===1,
  baseStorePreserved:ctx.Orbit.store.all('clientes').length===1
};
const ok=Object.values(checks).every(Boolean);
const out={schemaVersion:'orbit360-receipts-portfolio-projection-lifecycle-test-v1',contractVersion:'9.1.0',ok,status:ok?'PROJECTION_LIFECYCLE_PASS':'FUNCTIONAL_DEFECT',checks,firestoreWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
console.log(JSON.stringify(out,null,2));
if(!ok)process.exit(41);
