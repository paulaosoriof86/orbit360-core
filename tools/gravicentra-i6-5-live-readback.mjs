import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones';
const CONTROL='artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';
const SOURCE='artifacts/orbit360-recovery/release-control/I6_5_RECIBOS_CARTERA_SOURCE_INTAKE_20260918.json';
const OUT=process.env.I65_READBACK_DIR||path.join(process.env.RUNNER_TEMP||process.cwd(),'i65-readback');
const clean=(v,m=300)=>String(v==null?'':v).trim().slice(0,m);
const sha=v=>crypto.createHash('sha256').update(Buffer.isBuffer(v)?v:Buffer.from(String(v??''),'utf8')).digest('hex');
const stable=v=>{if(v===undefined)return null;if(v===null||typeof v!=='object')return v;if(typeof v.toDate==='function'){try{return{$timestamp:v.toDate().toISOString()};}catch{}}if(Array.isArray(v))return v.map(stable);const o={};for(const k of Object.keys(v).sort())o[k]=stable(v[k]);return o;};
const digest=v=>sha(JSON.stringify(stable(v)));
const need=(x,c)=>{if(!x)throw new Error(c);};
function serviceAccount(){for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}}throw new Error('I65_SERVICE_ACCOUNT_NOT_AVAILABLE');}
function canonicalCol(db,name){return db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items');}
function legacyCol(db,name){return db.collection('tenantId').doc(TENANT).collection(name);}
function collDigest(snap){return sha(snap.docs.map(d=>d.id+'|'+digest(d.data()||{})).sort().join('\n'));}
function hist(snap,field){const m={};for(const d of snap.docs){const v=clean((d.data()||{})[field],100);if(v)m[v]=(m[v]||0)+1;}return m;}
async function grab(ref){const s=await ref.get();return{snap:s,meta:{count:s.size,digest:collDigest(s)}};}

fs.mkdirSync(OUT,{recursive:true});
const C=JSON.parse(fs.readFileSync(CONTROL,'utf8')),S=JSON.parse(fs.readFileSync(SOURCE,'utf8'));
need(C.gateState?.gates?.I6?.activeSubgate==='I6.5','I65_GATE_NOT_ACTIVE');
need(C.nextAction==='I6_5_LIVE_READBACK_CURRENT_STATE','I65_READBACK_NOT_CURRENT_ACTION');
need(S.status==='PINNED_FOR_V5_DELTA'&&S.execution?.cursorState==='SOURCE_PINNED','I65_SOURCE_NOT_PINNED');
need(C.i65SyncCodeDefect?.status==='I6_5_SYNC_CODE_DEFECT_SUCCESSOR_LIVE_PASS','I65_SYNC_FIX_NOT_LIVE_PASS');

const sa=serviceAccount(),app=initializeApp({credential:cert(sa),projectId:PROJECT},'i65-live-readback'),db=getFirestore(app);
const ev={schema:'GRAVICENTRA_I6_5_DUAL_PATH_LIVE_READBACK_V1',gate:'I6.5',module:'RECIBOS_CARTERA',status:'FAIL',writes:0,operationalWrites:0,containsPII:false,containsSecrets:false,canonical:{},legacy:{},relationships:{},pathState:'UNKNOWN',errors:[]};
try{
  const names=['recibosEsperados','carteraPrimas','cobros','finmovs'];
  const can={},leg={};
  for(const n of names){can[n]=await grab(canonicalCol(db,n));leg[n]=await grab(legacyCol(db,n));}
  const policies=await grab(canonicalCol(db,'polizas'));
  const clients=await grab(canonicalCol(db,'clientes'));
  ev.canonical.polizas=policies.meta;ev.canonical.clientes=clients.meta;
  for(const n of names){ev.canonical[n]=can[n].meta;ev.legacy[n]=leg[n].meta;}
  ev.canonical.recibosEsperados.statusHistogram=hist(can.recibosEsperados.snap,'estado');
  ev.canonical.carteraPrimas.statusHistogram=hist(can.carteraPrimas.snap,'estado');
  ev.legacy.recibosEsperados.statusHistogram=hist(leg.recibosEsperados.snap,'estado');
  ev.legacy.carteraPrimas.statusHistogram=hist(leg.carteraPrimas.snap,'estado');
  need(policies.meta.count===1414,'I65_I64_POLICY_SENTINEL_DRIFT:'+policies.meta.count);
  const policyIds=new Set(policies.snap.docs.map(d=>d.id));
  const rel={};
  for(const [label,receiptSnap,portfolioSnap] of [['canonical',can.recibosEsperados.snap,can.carteraPrimas.snap],['legacy',leg.recibosEsperados.snap,leg.carteraPrimas.snap]]){
    const receiptIds=new Set(receiptSnap.docs.map(d=>d.id));
    let receiptPolicyMissing=0,portfolioPolicyMissing=0,portfolioReceiptMissing=0;
    for(const d of receiptSnap.docs){const r=d.data()||{},pid=clean(r.polizaId,256);if(pid&&!policyIds.has(pid))receiptPolicyMissing++;}
    for(const d of portfolioSnap.docs){const r=d.data()||{},pid=clean(r.polizaId,256),rid=clean(r.reciboId,256);if(pid&&!policyIds.has(pid))portfolioPolicyMissing++;if(rid&&!receiptIds.has(rid))portfolioReceiptMissing++;}
    rel[label]={receiptPolicyMissing,portfolioPolicyMissing,portfolioReceiptMissing};
  }
  ev.relationships=rel;
  const cr=can.recibosEsperados.meta.count,cp=can.carteraPrimas.meta.count,lr=leg.recibosEsperados.meta.count,lp=leg.carteraPrimas.meta.count;
  if(cr===0&&cp===0&&(lr>0||lp>0))ev.pathState='CANONICAL_EMPTY_LEGACY_PRESENT';
  else if((cr>0||cp>0)&&(lr>0||lp>0))ev.pathState='CANONICAL_AND_LEGACY_PRESENT';
  else if((cr>0||cp>0)&&lr===0&&lp===0)ev.pathState='CANONICAL_PRESENT_LEGACY_EMPTY';
  else ev.pathState='BOTH_EMPTY_OR_PARTIAL_UNRESOLVED';
  ev.status='PASS';
}catch(e){ev.errors.push(clean(e?.message||e));process.exitCode=1;}
finally{
  await deleteApp(app).catch(()=>{});
  fs.writeFileSync(path.join(OUT,'i65-dual-path-live-readback.json'),JSON.stringify(ev,null,2)+'\n');
  console.log('I65_LIVE_READBACK='+ev.status);
  console.log('I65_PATH_STATE='+ev.pathState);
  console.log('I65_CANONICAL_RECEIPTS='+(ev.canonical.recibosEsperados?.count??0));
  console.log('I65_CANONICAL_PORTFOLIO='+(ev.canonical.carteraPrimas?.count??0));
  console.log('I65_LEGACY_RECEIPTS='+(ev.legacy.recibosEsperados?.count??0));
  console.log('I65_LEGACY_PORTFOLIO='+(ev.legacy.carteraPrimas?.count??0));
  console.log('I65_WRITES=0');
}
