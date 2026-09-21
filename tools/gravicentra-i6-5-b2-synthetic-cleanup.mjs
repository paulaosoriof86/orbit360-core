import fs from 'node:fs';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab';
const TENANT=String(process.env.TENANT_HINT||'').trim();
const RUN=String(process.env.B2_ORPHAN_RUN||'35556007094');
const stamp=RUN.replace(/[^0-9A-Za-z]/g,'').slice(-12);
const clientName='B2 QA '+stamp,ident='B2QA-'+stamp,policyNo='B2-POL-'+stamp,renewNo='B2-REN-'+stamp;
const OUT=process.env.B2_CLEANUP_OUT||'b2-synthetic-cleanup.json';
const need=(v,c)=>{if(!v)throw new Error(c);};
function sa(){
  for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){
    try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.private_key)return x;}catch{}
  }
  if(process.env.GOOGLE_APPLICATION_CREDENTIALS){
    const x=JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));
    if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.private_key)return x;
  }
  throw new Error('B2_CLEANUP_SERVICE_ACCOUNT');
}
function col(db,name){return db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items');}
async function query(db,name,field,value){
  const s=await col(db,name).where(field,'==',value).get();
  return s.docs.map(d=>({id:d.id,...d.data()}));
}
async function delDocs(docs){let n=0;for(const d of docs){await d.ref.delete();n++;}return n;}
let app;
const ev={run:RUN,stamp,clientName,ident,policyNo,renewNo,before:{},deleted:{},after:{}};
try{
  need(TENANT,'B2_CLEANUP_TENANT_REQUIRED');
  app=initializeApp({credential:cert(sa()),projectId:PROJECT},'b2-cleanup-'+Date.now());
  const db=getFirestore(app);
  const clientSnap=await col(db,'clientes').where('nombre','==',clientName).get();
  const clientIds=clientSnap.docs.map(d=>d.id);
  const policySnaps=[];
  for(const no of [policyNo,renewNo]){
    const s=await col(db,'polizas').where('numero','==',no).get();
    policySnaps.push(...s.docs);
  }
  const policyIds=policySnaps.map(d=>d.id);
  ev.before={clients:clientIds,policies:policyIds,counts:{}};
  const targets=['actividades','gestiones','cobros','carteraPrimas','recibosEsperados','vehiculos','polizas'];
  for(const name of targets){
    const refs=new Map();
    for(const cid of clientIds){for(const d of (await col(db,name).where('clienteId','==',cid).get()).docs)refs.set(d.ref.path,d);}
    for(const pid of policyIds){for(const d of (await col(db,name).where('polizaId','==',pid).get()).docs)refs.set(d.ref.path,d);}
    ev.before.counts[name]=refs.size;
    ev.deleted[name]=await delDocs([...refs.values()]);
  }
  ev.deleted.clientes=await delDocs(clientSnap.docs);
  for(const id of [...clientIds,...policyIds]){
    const s=await col(db,'auditLog').where('registroId','==',id).get().catch(()=>null);
    if(s)ev.deleted.auditLog=(ev.deleted.auditLog||0)+await delDocs(s.docs);
  }
  const clientAfter=await col(db,'clientes').where('nombre','==',clientName).get();
  const p1=await col(db,'polizas').where('numero','==',policyNo).get();
  const p2=await col(db,'polizas').where('numero','==',renewNo).get();
  ev.after={clients:clientAfter.size,policies:p1.size+p2.size};
  need(ev.after.clients===0&&ev.after.policies===0,'B2_SYNTHETIC_CLEANUP_INCOMPLETE');
  ev.status='PASS';
  console.log('B2_SYNTHETIC_CLEANUP=PASS');
  console.log('B2_SYNTHETIC_DELETED='+Object.values(ev.deleted).reduce((s,n)=>s+(+n||0),0));
}finally{
  fs.writeFileSync(OUT,JSON.stringify(ev,null,2)+'\n');
  if(app)await deleteApp(app).catch(()=>{});
}
