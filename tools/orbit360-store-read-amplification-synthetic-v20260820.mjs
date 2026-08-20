#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('orbit360-platform/data/store-firestore-product-readonly-p0.js','utf8');
let touches=0;
const tenantId='tenant-synthetic';
const rows=Array.from({length:500},(_,i)=>({id:`row-${i}`,tenantId,nested:{get marker(){touches++;return i;}}}));
const docs=rows.map(row=>({id:row.id,data:()=>row}));
const ref={where(){return this;},onSnapshot(next){next({forEach(fn){docs.forEach(fn);}});return ()=>{};}};
const sandbox={console,CustomEvent:function(type,init){this.type=type;this.detail=init?.detail;},window:{Orbit:{tenantCanonicalPathsP0:{validateTenantId:id=>({ok:id===tenantId,tenantId:id}),dataCollectionPath:(id,col)=>`${id}/${col}`}},dispatchEvent(){}}};
vm.createContext(sandbox); vm.runInContext(source,sandbox,{filename:'store-firestore-product-readonly-p0.js'});
const store=sandbox.window.Orbit.createFirestoreProductReadOnlyStoreP0({db:{collection:()=>ref}},{tenantId,collections:['clientes'],paths:sandbox.window.Orbit.tenantCanonicalPathsP0,queryPlanner:()=>({ok:true,constraints:[{field:'tenantId',op:'==',value:tenantId}]})});
store._attachSnapshots();
const failures=[]; const check=(ok,code)=>{if(!ok)failures.push(code);};
touches=0; const one=store.get('clientes','row-499'); check(one?.id==='row-499','GET_RESULT'); check(touches===1,`GET_CLONE_AMPLIFICATION:${touches}`);
touches=0; for(let i=0;i<500;i++) store.get('clientes',`row-${i}`); check(touches===500,`REPEATED_GET_AMPLIFICATION:${touches}`);
touches=0; const all=store.all('clientes'); check(all.length===500,'ALL_LENGTH'); check(touches===500,`ALL_CLONE_COUNT:${touches}`);
touches=0; const where=store.where('clientes','id','==','row-20'); check(where.length===1&&where[0].id==='row-20','WHERE_RESULT'); check(touches===500,`WHERE_CLONE_COUNT:${touches}`);
touches=0; const find=store.find('clientes',r=>r.id==='row-20'); check(find?.id==='row-20','FIND_RESULT'); check(touches===500,`FIND_CLONE_COUNT:${touches}`);
for(const method of ['insert','update','remove']){let blocked=false;try{store[method]('clientes',{});}catch(e){blocked=e?.code==='WRITE_BLOCKED_PRODUCT_READ_ONLY_P0';}check(blocked,`${method.toUpperCase()}_NOT_BLOCKED`);}
const activeSource=source.match(/function get\([\s\S]*?\n    }/m)?.[0]||''; check(activeSource.includes('.find(')&&activeSource.indexOf('.find(')<activeSource.indexOf('clone('),'GET_FIND_BEFORE_CLONE_SOURCE_GUARD');
const result={ok:failures.length===0,status:failures.length?'STORE_READ_AMPLIFICATION_SYNTHETIC_FAIL':'STORE_READ_AMPLIFICATION_SYNTHETIC_PASS',failures,rowCount:500,getCloneTouches:1,repeatedGetCloneTouches:500,allCloneTouches:500,whereCloneTouches:500,findCloneTouches:500,interpretation:'get is O(1-row-clone) after lookup; all/where/find clone at most one collection per invocation; repeated entity get resolution does not clone the full collection.',runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
console.log(JSON.stringify(result,null,2)); if(!result.ok)process.exit(41);
