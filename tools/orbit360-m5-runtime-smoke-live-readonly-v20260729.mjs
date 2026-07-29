#!/usr/bin/env node
'use strict';
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {initializeApp,applicationDefault,getApps} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
const ROOT=process.cwd(),TENANT='alianzas-soluciones',MODE=String(process.argv[2]||'before');
if(!['before','after'].includes(MODE))throw new Error('M5_RUNTIME_SNAPSHOT_MODE_INVALID');
const EXPECTED={sourceClients:414,sourceInsurers:26,advisors:7,canonicalClients:414,canonicalInsurers:26,memberships:1,config:1};
if(!getApps().length)initializeApp({credential:applicationDefault(),projectId:'ays-orbit-360-lab'});
const db=getFirestore();
function normalize(value){
 if(value==null||typeof value!=='object')return value;
 if(typeof value.toDate==='function'){try{return value.toDate().toISOString()}catch{}}
 if(Array.isArray(value))return value.map(normalize);
 const out={};for(const key of Object.keys(value).sort())out[key]=normalize(value[key]);return out;
}
function digestRows(rows){return crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex')}
async function readCollection(collectionPath){
 const snap=await db.collection(collectionPath).get();
 const rows=snap.docs.map(doc=>({id:doc.id,data:normalize(doc.data())})).sort((a,b)=>a.id.localeCompare(b.id));
 return {count:rows.length,digest:digestRows(rows)};
}
const paths={
 sourceClients:`tenantId/${TENANT}/clientes`,
 sourceInsurers:`tenantId/${TENANT}/aseguradoras`,
 advisors:`tenantId/${TENANT}/asesores`,
 canonicalClients:`tenants/${TENANT}/data/clientes/items`,
 canonicalInsurers:`tenants/${TENANT}/data/aseguradoras/items`,
 memberships:`tenants/${TENANT}/members`
};
const data={};for(const [key,value] of Object.entries(paths))data[key]=await readCollection(value);
const configSnap=await db.doc(`tenants/${TENANT}/system/config`).get();
data.config={count:configSnap.exists?1:0,digest:digestRows(configSnap.exists?[{id:'config',data:normalize(configSnap.data())}]:[])};
const membershipSnap=await db.collection(paths.memberships).get();
const roles=[...new Set(membershipSnap.docs.flatMap(doc=>{const d=doc.data()||{};return [].concat(d.roles||d.rolesAsignados||d.role||d.rol||[]).map(x=>String(x||'').trim()).filter(Boolean)}))].sort();
const counts=Object.fromEntries(Object.entries(data).map(([key,value])=>[key,value.count]));
const checks=Object.entries(EXPECTED).map(([key,value])=>({id:`COUNT_${key}`,ok:counts[key]===value,actual:counts[key],expected:value}));
checks.push({id:'ASSIGNED_ROLE_DIRECTION',ok:roles.includes('Dirección')},{id:'ASSIGNED_ROLE_OPERATIVE',ok:roles.includes('Operativo')},{id:'ASSIGNED_ROLE_ADVISOR',ok:roles.includes('Asesor')},{id:'UNAUTHORIZED_ROLE_FINANCE_ABSENT',ok:!roles.includes('Finanzas')});
const failed=checks.filter(x=>!x.ok);
const out={schemaVersion:'orbit360-m5-runtime-smoke-live-snapshot-v1',generatedAt:new Date().toISOString(),mode:MODE,ok:failed.length===0,status:failed.length?'M5_RUNTIME_LIVE_SNAPSHOT_FAIL':'M5_RUNTIME_LIVE_SNAPSHOT_PASS',projectId:'ays-orbit-360-lab',tenantId:TENANT,expected:EXPECTED,counts,digests:Object.fromEntries(Object.entries(data).map(([key,value])=>[key,value.digest])),canonicalRolesObserved:roles,checksPassed:checks.length-failed.length,checksTotal:checks.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),firestoreRead:true,firestoreWrites:0,operationalWrites:0,containsPII:false,containsSecrets:false};
const outPath=path.join(ROOT,`orbit360-platform/runtime-gate-crm-v20260716/m5-runtime-smoke-live-${MODE}.json`);fs.mkdirSync(path.dirname(outPath),{recursive:true});fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
