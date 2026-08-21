#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const ROOT=process.cwd(),PROJECT=String(process.env.ORBIT360_PRODUCT_PROJECT_ID||'').trim(),TENANT=String(process.env.ORBIT360_PRODUCT_TENANT_ID||'').trim(),phase=String(process.argv[2]||'before').trim(),DIR=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716'),OUT=path.join(DIR,`f2-data-integrity-${phase}-v20260818.json`),COLLECTIONS=['clientes','aseguradoras','polizas','vehiculos','recibosEsperados','carteraPrimas','cobros','negocios','gestiones'];
const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.keys(v).sort().reduce((o,k)=>(o[k]=stable(v[k]),o),{}):v),digest=v=>crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex'),rows=s=>s.docs.map(d=>({id:d.id,data:d.data()||{}})).sort((a,b)=>a.id.localeCompare(b.id));
function write(p){fs.mkdirSync(DIR,{recursive:true});const out={...p,containsPII:false,containsSecrets:false};fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));}
async function main(){
  let app;
  try{
    if(!['before','after'].includes(phase))throw new Error('PIPELINE_MECHANISM_FAILURE:F2_INTEGRITY_PHASE_INVALID');
    if(phase==='after'){
      const runId=String(process.env.GITHUB_RUN_ID||'').trim();
      const browserEvidence=runId?path.join(DIR,`f2-browser-run-${runId}.json`):'';
      if(!runId||!fs.existsSync(browserEvidence)){
        write({schemaVersion:'orbit360-f2-data-integrity-readonly-v2',ok:false,status:'F2_DATA_INTEGRITY_AFTER_SKIPPED_BROWSER_NOT_EXECUTED',classification:'PIPELINE_MECHANISM_FAILURE',phase,browserEvidencePresent:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0});
        process.exitCode=41;return;
      }
    }
    if(!PROJECT||!TENANT||!process.env.GOOGLE_APPLICATION_CREDENTIALS)throw new Error('PIPELINE_MECHANISM_FAILURE:F2_PRODUCT_IDENTITY_NOT_BOUND');
    const [{applicationDefault,getApps,initializeApp,deleteApp},{getFirestore}]=await Promise.all([import('firebase-admin/app'),import('firebase-admin/firestore')]);
    app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT});
    const db=getFirestore(app),entries=await Promise.all(COLLECTIONS.map(async c=>[c,rows(await db.collection(`tenants/${TENANT}/data/${c}/items`).get())])),memberships=rows(await db.collection(`tenants/${TENANT}/members`).get()),configSnap=await db.doc(`tenants/${TENANT}/system/config`).get(),advisers=rows(await db.collection(`tenantId/${TENANT}/asesores`).get()),counts={},digests={};
    for(const [name,list] of entries){counts[name]=list.length;digests[name]=digest(list);}counts.memberships=memberships.length;counts.asesores=advisers.length;counts.config=configSnap.exists?1:0;digests.memberships=digest(memberships);digests.asesores=digest(advisers);digests.config=digest(configSnap.exists?{id:'config',data:configSnap.data()||{}}:{id:'config',data:null});
    write({schemaVersion:'orbit360-f2-data-integrity-readonly-v2',ok:true,status:'F2_DATA_INTEGRITY_SNAPSHOT_PASS',phase,projectIdentityMatches:true,tenantBound:true,collections:COLLECTIONS,counts,digests,firestoreRead:true,firestoreWrites:0,authWrites:0,operationalWrites:0});
  }catch(error){write({schemaVersion:'orbit360-f2-data-integrity-readonly-v2',ok:false,status:String(error?.message||'').startsWith('PIPELINE_MECHANISM_FAILURE')?'PIPELINE_MECHANISM_FAILURE':'DATA_CONTRACT_FAILURE',classification:String(error?.message||error).split(':')[0]||'PIPELINE_MECHANISM_FAILURE',phase,error:String(error?.message||error).replace(/[A-Za-z0-9_-]{30,}/g,'[redacted]').slice(0,360),firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0});process.exitCode=41;}finally{if(app){const {deleteApp}=await import('firebase-admin/app');await deleteApp(app).catch(()=>{});}}
}
await main();
