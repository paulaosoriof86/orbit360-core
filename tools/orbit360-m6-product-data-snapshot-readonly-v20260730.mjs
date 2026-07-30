#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {applicationDefault,getApps,initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
const ROOT=process.cwd(),PROJECT=String(process.env.ORBIT360_PRODUCT_PROJECT_ID||'').trim(),TENANT=String(process.env.ORBIT360_PRODUCT_TENANT_ID||'').trim(),phase=String(process.argv[2]||'before').trim();
const OUT=path.join(ROOT,`orbit360-platform/runtime-gate-crm-v20260716/m6-product-data-${phase}.json`);
const COLLECTIONS=['clientes','aseguradoras','asesores'];
const stable=v=>{if(Array.isArray(v))return v.map(stable);if(v&&typeof v==='object'){return Object.keys(v).sort().reduce((o,k)=>{o[k]=stable(v[k]);return o;},{});}return v;};
const digest=v=>crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const safeDocs=snap=>snap.docs.map(doc=>({id:doc.id,data:doc.data()||{}})).sort((a,b)=>a.id.localeCompare(b.id));
function write(p){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify({...p,containsPII:false,containsSecrets:false},null,2)+'\n');}
let app;
try{
  if(!PROJECT||!TENANT||!process.env.GOOGLE_APPLICATION_CREDENTIALS)throw new Error('PIPELINE_MECHANISM_FAILURE:PRODUCT_IDENTITY_NOT_BOUND');
  app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT});const db=getFirestore(app);
  const snaps=await Promise.all(COLLECTIONS.map(c=>db.collection(`tenants/${TENANT}/data/${c}/items`).get()));
  const memberSnap=await db.collection(`tenants/${TENANT}/members`).get();const configSnap=await db.doc(`tenants/${TENANT}/system/config`).get();
  const data={};COLLECTIONS.forEach((c,i)=>{const rows=safeDocs(snaps[i]);data[c]={count:rows.length,digest:digest(rows)};});
  const members=safeDocs(memberSnap);const config=configSnap.exists?{id:'config',data:configSnap.data()||{}}:{id:'config',data:null};
  const ok=data.clientes.count===414&&data.aseguradoras.count===26&&data.asesores.count===7&&members.length===1&&configSnap.exists;
  write({ok,status:ok?'M6_PRODUCT_DATA_SNAPSHOT_PASS':'DATA_CONTRACT_FAILURE',phase,projectIdentityMatches:true,tenantBound:true,counts:{clientes:data.clientes.count,aseguradoras:data.aseguradoras.count,asesores:data.asesores.count,memberships:members.length,config:configSnap.exists?1:0},digests:{clientes:data.clientes.digest,aseguradoras:data.aseguradoras.digest,asesores:data.asesores.digest,memberships:digest(members),config:digest(config)},firestoreRead:true,firestoreWrites:0,operationalWrites:0});if(!ok)process.exitCode=41;
}catch(error){write({ok:false,status:String(error&&error.message||'').startsWith('PIPELINE_MECHANISM_FAILURE')?'PIPELINE_MECHANISM_FAILURE':'DATA_CONTRACT_FAILURE',phase,error:String(error&&error.message||error).replace(/[A-Za-z0-9_-]{30,}/g,'[redacted]').slice(0,300),firestoreRead:false,firestoreWrites:0,operationalWrites:0});process.exitCode=41;}finally{if(app)await deleteApp(app).catch(()=>{});}
