import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones';
const CONTROL='artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';
const SOURCE='artifacts/orbit360-recovery/release-control/I6_4_POLIZAS_RIESGOS_SOURCE_INTAKE_20260918.json';
const OUT=process.env.I64_READBACK_DIR||path.join(process.env.RUNNER_TEMP||process.cwd(),'i64-readback');
const clean=(v,m=1000)=>String(v==null?'':v).trim().slice(0,m);
const sha=v=>crypto.createHash('sha256').update(Buffer.isBuffer(v)?v:Buffer.from(String(v??''),'utf8')).digest('hex');
const stable=v=>{if(v===undefined)return null;if(v===null||typeof v!=='object')return v;if(typeof v.toDate==='function'){try{return{$timestamp:v.toDate().toISOString()};}catch{}}if(Array.isArray(v))return v.map(stable);const o={};for(const k of Object.keys(v).sort())o[k]=stable(v[k]);return o;};
const digest=v=>sha(JSON.stringify(stable(v)));
const need=(x,c)=>{if(!x)throw new Error(c);};
function serviceAccount(){for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}}throw new Error('I64_SERVICE_ACCOUNT_NOT_AVAILABLE');}
function dataCol(db,name){return db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items');}
function hist(rows,field){const m={};for(const r of rows){const v=clean(r[field],100);if(v)m[v]=(m[v]||0)+1;}return m;}
function collectionDigest(docs){return sha(docs.map(d=>d.id+'|'+digest(d.data()||{})).sort().join('\n'));}

fs.mkdirSync(OUT,{recursive:true});
const C=JSON.parse(fs.readFileSync(CONTROL,'utf8')),S=JSON.parse(fs.readFileSync(SOURCE,'utf8'));
need(C.gateState?.gates?.I6?.status==='I6_4_DATA_UPDATE_V5_ACTIVE'&&C.gateState?.gates?.I6?.activeSubgate==='I6.4','I64_GATE_NOT_ACTIVE');
need(C.nextAction==='I6_4_LIVE_READBACK_CURRENT_STATE','I64_READBACK_NOT_CURRENT_ACTION');
need(S.status==='PINNED_FOR_V5_DELTA'&&S.execution?.cursorState==='SOURCE_PINNED','I64_SOURCE_NOT_PINNED');

const sa=serviceAccount(),app=initializeApp({credential:cert(sa),projectId:PROJECT},'i64-readback'),db=getFirestore(app);
const ev={schema:'GRAVICENTRA_I6_4_LIVE_READBACK_V1',gate:'I6.4',module:'POLIZAS_RIESGOS_VEHICULOS',status:'FAIL',writes:0,collections:{},relationships:{},containsPII:false,containsSecrets:false,errors:[]};
try{
  const snaps={};
  for(const name of ['clientes','polizas','vehiculos','renovaciones'])snaps[name]=await dataCol(db,name).get();
  const clients=new Map(snaps.clientes.docs.map(d=>[d.id,d.data()||{}]));
  const policies=new Map(snaps.polizas.docs.map(d=>[d.id,d.data()||{}]));
  for(const [name,snap] of Object.entries(snaps)){
    const rows=snap.docs.map(d=>d.data()||{});
    ev.collections[name]={count:snap.size,digest:collectionDigest(snap.docs)};
    if(name==='polizas'){
      ev.collections[name].statusHistogram=hist(rows,'estado');
      ev.collections[name].currencyHistogram=hist(rows,'moneda');
      ev.collections[name].insurerReferenced=Object.keys(hist(rows,'aseguradoraId')).length;
    }
  }
  need(snaps.polizas.size>0,'I64_NO_LIVE_POLICIES');
  let policyClientMissing=0,policyClientTombstone=0,vehiclePolicyMissing=0,vehicleClientMissing=0,vehicleClientTombstone=0;
  for(const d of snaps.polizas.docs){
    const r=d.data()||{},cid=clean(r.clienteId,256);
    if(cid){const c=clients.get(cid);if(!c)policyClientMissing++;else if(c.fusionado===true||clean(c.mergedIntoClientId,256))policyClientTombstone++;}
  }
  for(const d of snaps.vehiculos.docs){
    const r=d.data()||{},pid=clean(r.polizaId,256),cid=clean(r.clienteId,256);
    if(pid&&!policies.has(pid))vehiclePolicyMissing++;
    if(cid){const c=clients.get(cid);if(!c)vehicleClientMissing++;else if(c.fusionado===true||clean(c.mergedIntoClientId,256))vehicleClientTombstone++;}
  }
  ev.relationships={policyClientMissing,policyClientTombstone,vehiclePolicyMissing,vehicleClientMissing,vehicleClientTombstone};
  const publicKey=crypto.createPublicKey(sa.private_key).export({type:'spki',format:'pem'});
  fs.writeFileSync(path.join(OUT,'i64-service-account-public-key.pem'),publicKey);
  ev.publicKeySha256=sha(publicKey);
  ev.status='PASS';
}catch(e){ev.errors.push(clean(e?.message||e,300));process.exitCode=1;}
finally{
  await deleteApp(app).catch(()=>{});
  fs.writeFileSync(path.join(OUT,'i64-live-readback.json'),JSON.stringify(ev,null,2)+'\n');
  console.log('I64_LIVE_READBACK='+ev.status);
  console.log('I64_POLICIES='+(ev.collections.polizas?.count??0));
  console.log('I64_VEHICLES='+(ev.collections.vehiculos?.count??0));
  console.log('I64_CLIENTS='+(ev.collections.clientes?.count??0));
  console.log('I64_RENEWALS='+(ev.collections.renovaciones?.count??0));
  console.log('I64_WRITES=0');
}
