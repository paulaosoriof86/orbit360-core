#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {applicationDefault,getApps,initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
const ROOT=process.cwd();
const PROJECT=String(process.env.ORBIT360_PRODUCT_PROJECT_ID||'').trim();
const TENANT=String(process.env.ORBIT360_PRODUCT_TENANT_ID||'').trim();
const MODE=process.argv[2]||'';
const OUT=path.join(ROOT,`orbit360-platform/runtime-gate-crm-v20260716/policies-visual-data-${MODE}.json`);
const EXPECTED=Object.freeze({clientes:430,aseguradoras:30,polizas:1373,vehiculos:1032,recibosEsperados:1294,carteraPrimas:673,cobros:5,finmovs:0,planillasComisiones:5,comisionesDevengadas:5,conciliacionesComisiones:5});
const text=v=>String(v==null?'':v).trim();
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
function normalize(v){
  if(v==null||typeof v==='string'||typeof v==='number'||typeof v==='boolean')return v;
  if(v&&typeof v.toDate==='function')return v.toDate().toISOString();
  if(Array.isArray(v))return v.map(normalize);
  if(v&&typeof v==='object'){const out={};for(const key of Object.keys(v).sort())out[key]=normalize(v[key]);return out;}
  return String(v);
}
function write(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify({...payload,containsPII:false,containsPolicyNumbers:false,containsAmounts:false,containsIds:false,containsSecrets:false},null,2)+'\n','utf8');}
let app;
try{
  if(!['before','after'].includes(MODE))throw new Error('PIPELINE_MECHANISM_FAILURE:SNAPSHOT_MODE');
  if(PROJECT!=='ays-orbit-360-lab'||TENANT!=='alianzas-soluciones'||!process.env.GOOGLE_APPLICATION_CREDENTIALS)throw new Error('ENVIRONMENT_FAILURE:SNAPSHOT_TARGET');
  app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT});const db=getFirestore(app);
  const counts={},digests={};
  for(const [name,expected] of Object.entries(EXPECTED)){
    const snap=await db.collection('tenantId').doc(TENANT).collection(name).get();
    counts[name]=snap.size;
    const rows=snap.docs.map(doc=>({id:doc.id,data:normalize(doc.data())})).sort((a,b)=>a.id.localeCompare(b.id));
    digests[name]=sha(JSON.stringify(rows));
    if(snap.size!==expected)throw new Error(`DATA_CONTRACT_FAILURE:COUNT_${name}_${snap.size}_${expected}`);
  }
  write({ok:true,status:'POLICIES_VISUAL_DATA_SNAPSHOT_PASS',mode:MODE,projectIdentityMatches:true,tenantBound:true,counts,digests,baselineMatches:true,firestoreRead:true,firestoreWrites:0,operationalWrites:0});
}catch(error){write({ok:false,status:text(error&&error.message).split(':')[0]||'DATA_CONTRACT_FAILURE',classification:text(error&&error.message).split(':')[0]||'DATA_CONTRACT_FAILURE',mode:MODE,error:text(error&&error.message||error).replace(/[A-Za-z0-9_-]{30,}/g,'[redacted]').slice(0,360),firestoreRead:false,firestoreWrites:0,operationalWrites:0});process.exitCode=41;}finally{if(app)await deleteApp(app).catch(()=>{});}
