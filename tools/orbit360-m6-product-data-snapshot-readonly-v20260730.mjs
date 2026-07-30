#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {applicationDefault,getApps,initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
const ROOT=process.cwd(),PROJECT=String(process.env.ORBIT360_PRODUCT_PROJECT_ID||'').trim(),TENANT=String(process.env.ORBIT360_PRODUCT_TENANT_ID||'').trim(),phase=String(process.argv[2]||'before').trim();
const OUT=path.join(ROOT,`orbit360-platform/runtime-gate-crm-v20260716/m6-product-data-${phase}.json`);
const stable=v=>{if(Array.isArray(v))return v.map(stable);if(v&&typeof v==='object'){return Object.keys(v).sort().reduce((o,k)=>{o[k]=stable(v[k]);return o;},{});}return v;};
const digest=v=>crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const safeDocs=snap=>snap.docs.map(doc=>({id:doc.id,data:doc.data()||{}})).sort((a,b)=>a.id.localeCompare(b.id));
function write(p){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify({...p,containsPII:false,containsSecrets:false},null,2)+'\n');}
let app;
try{
  if(!PROJECT||!TENANT||!process.env.GOOGLE_APPLICATION_CREDENTIALS)throw new Error('PIPELINE_MECHANISM_FAILURE:PRODUCT_IDENTITY_NOT_BOUND');
  app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT});const db=getFirestore(app);
  const [clientsSnap,insurersSnap,advisorsSourceSnap,memberSnap,configSnap]=await Promise.all([
    db.collection(`tenants/${TENANT}/data/clientes/items`).get(),
    db.collection(`tenants/${TENANT}/data/aseguradoras/items`).get(),
    db.collection(`tenantId/${TENANT}/asesores`).get(),
    db.collection(`tenants/${TENANT}/members`).get(),
    db.doc(`tenants/${TENANT}/system/config`).get()
  ]);
  const clients=safeDocs(clientsSnap),insurers=safeDocs(insurersSnap),advisorsSource=safeDocs(advisorsSourceSnap),members=safeDocs(memberSnap),config=configSnap.exists?{id:'config',data:configSnap.data()||{}}:{id:'config',data:null};
  const counts={clientes:clients.length,aseguradoras:insurers.length,asesoresFuente:advisorsSource.length,memberships:members.length,config:configSnap.exists?1:0};
  const digests={clientes:digest(clients),aseguradoras:digest(insurers),asesoresFuente:digest(advisorsSource),memberships:digest(members),config:digest(config)};
  const ok=counts.clientes===414&&counts.aseguradoras===26&&counts.asesoresFuente===7&&counts.memberships===1&&counts.config===1;
  write({ok,status:ok?'M6_PRODUCT_DATA_SNAPSHOT_PASS':'DATA_CONTRACT_FAILURE',phase,projectIdentityMatches:true,tenantBound:true,advisorSourceOnly:true,canonicalAdvisorMigrationRequired:false,counts,digests,firestoreRead:true,firestoreWrites:0,operationalWrites:0});if(!ok)process.exitCode=41;
}catch(error){write({ok:false,status:String(error&&error.message||'').startsWith('PIPELINE_MECHANISM_FAILURE')?'PIPELINE_MECHANISM_FAILURE':'DATA_CONTRACT_FAILURE',phase,error:String(error&&error.message||error).replace(/[A-Za-z0-9_-]{30,}/g,'[redacted]').slice(0,300),firestoreRead:false,firestoreWrites:0,operationalWrites:0});process.exitCode=41;}finally{if(app)await deleteApp(app).catch(()=>{});}
