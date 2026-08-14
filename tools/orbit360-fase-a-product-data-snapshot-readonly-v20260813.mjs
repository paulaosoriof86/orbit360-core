#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {applicationDefault,getApps,initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
const ROOT=process.cwd(),PROJECT=String(process.env.ORBIT360_PRODUCT_PROJECT_ID||'').trim(),TENANT=String(process.env.ORBIT360_PRODUCT_TENANT_ID||'').trim(),phase=String(process.argv[2]||'before').trim();
const DIR=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716'),OUT=path.join(DIR,`fase-a-product-data-${phase}-v20260813.json`);
const EXPECT={clientes:430,aseguradoras:30,asesoresFuente:7,minimumMemberships:7,config:1};
const stable=v=>{if(Array.isArray(v))return v.map(stable);if(v&&typeof v==='object')return Object.keys(v).sort().reduce((o,k)=>(o[k]=stable(v[k]),o),{});return v;};
const digest=v=>crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const docs=s=>s.docs.map(d=>({id:d.id,data:d.data()||{}})).sort((a,b)=>a.id.localeCompare(b.id));
const write=p=>{fs.mkdirSync(DIR,{recursive:true});fs.writeFileSync(OUT,JSON.stringify({...p,containsPII:false,containsSecrets:false},null,2)+'\n','utf8');console.log(JSON.stringify({...p,containsPII:false,containsSecrets:false},null,2));};
let app;
try{
 if(!PROJECT||!TENANT||!process.env.GOOGLE_APPLICATION_CREDENTIALS)throw new Error('PIPELINE_MECHANISM_FAILURE:PRODUCT_IDENTITY_NOT_BOUND');
 app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT});const db=getFirestore(app);
 const [c,i,a,m,g]=await Promise.all([db.collection(`tenants/${TENANT}/data/clientes/items`).get(),db.collection(`tenants/${TENANT}/data/aseguradoras/items`).get(),db.collection(`tenantId/${TENANT}/asesores`).get(),db.collection(`tenants/${TENANT}/members`).get(),db.doc(`tenants/${TENANT}/system/config`).get()]);
 const clientes=docs(c),aseguradoras=docs(i),asesores=docs(a),memberships=docs(m),config=g.exists?{id:'config',data:g.data()||{}}:{id:'config',data:null};
 const counts={clientes:clientes.length,aseguradoras:aseguradoras.length,asesoresFuente:asesores.length,memberships:memberships.length,config:g.exists?1:0};
 const digests={clientes:digest(clientes),aseguradoras:digest(aseguradoras),asesoresFuente:digest(asesores),memberships:digest(memberships),config:digest(config)};
 const checks={clientesCurrentBaseline:counts.clientes===EXPECT.clientes,aseguradorasCurrentBaseline:counts.aseguradoras===EXPECT.aseguradoras,asesoresCurrentBaseline:counts.asesoresFuente===EXPECT.asesoresFuente,membershipsAtLeastAllTeam:counts.memberships>=EXPECT.minimumMemberships,configPresent:counts.config===EXPECT.config};
 const ok=Object.values(checks).every(Boolean);
 write({schemaVersion:'orbit360-fase-a-product-data-snapshot-v1',ok,status:ok?'FASE_A_PRODUCT_DATA_SNAPSHOT_PASS':'DATA_CONTRACT_FAILURE',phase,expected:EXPECT,counts,checks,digests,projectIdentityMatches:true,tenantBound:true,firestoreRead:true,firestoreWrites:0,authWrites:0,operationalWrites:0});if(!ok)process.exitCode=41;
}catch(e){write({schemaVersion:'orbit360-fase-a-product-data-snapshot-v1',ok:false,status:String(e?.message||'').startsWith('PIPELINE_MECHANISM_FAILURE')?'PIPELINE_MECHANISM_FAILURE':'DATA_CONTRACT_FAILURE',phase,error:String(e?.message||e).replace(/[A-Za-z0-9_-]{30,}/g,'[redacted]').slice(0,300),firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0});process.exitCode=41;}finally{if(app)await deleteApp(app).catch(()=>{});}
