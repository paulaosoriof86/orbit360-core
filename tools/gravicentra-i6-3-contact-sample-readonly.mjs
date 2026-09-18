import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab', TENANT='alianzas-soluciones';
const ENVELOPE='.github/i6-ephemeral/i63-clientes-apply-envelope.encrypted.json';
const EXPECTED_SOURCE='4f0a1307605ad5dcc947355dbbc98a50b510358e5f6a9835b75d02e45f5a8c7c';
const EXPECTED_PAYLOAD_SHA='85af65dec822dad6a4c40be5d89202ae5c9f44d302e4e9ea0b4d850f01cc9af7';
const OUT=process.env.I63_CONTACT_SAMPLE_FILE||path.join(process.env.RUNNER_TEMP||process.cwd(),'i63-contact-sample.json');
const clean=(v,m=500)=>String(v==null?'':v).trim().slice(0,m);
const sha=v=>crypto.createHash('sha256').update(Buffer.isBuffer(v)?v:Buffer.from(String(v??''),'utf8')).digest('hex');
const need=(x,c)=>{if(!x)throw new Error(c);};
function serviceAccount(){for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}}throw new Error('I63_CONTACT_SAMPLE_SERVICE_ACCOUNT');}
function decryptPayload(sa){
  const e=JSON.parse(fs.readFileSync(ENVELOPE,'utf8'));
  need(e.schema==='GRAVICENTRA_I6_3_APPLY_ENVELOPE_GZIP_V1','I63_CONTACT_ENVELOPE_SCHEMA');
  const key=crypto.privateDecrypt({key:sa.private_key,oaepHash:'sha256',padding:crypto.constants.RSA_PKCS1_OAEP_PADDING},Buffer.from(e.wrappedKey,'base64'));
  const dec=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(e.iv,'base64'));dec.setAuthTag(Buffer.from(e.tag,'base64'));
  const gz=Buffer.concat([dec.update(Buffer.from(e.ciphertext,'base64')),dec.final()]);
  const plain=zlib.gunzipSync(gz);
  need(sha(plain)===EXPECTED_PAYLOAD_SHA,'I63_CONTACT_PAYLOAD_HASH');
  const payload=JSON.parse(plain.toString('utf8'));
  need(payload.sourceSha256===EXPECTED_SOURCE,'I63_CONTACT_SOURCE_HASH');
  return payload;
}
const contactKey=k=>/(?:whatsapp|telefono|contacto|direccion|email|correo)/i.test(String(k||''));
const safeValue=v=>{
  if(v==null)return null;
  if(typeof v==='string'||typeof v==='number'||typeof v==='boolean')return v;
  return clean(JSON.stringify(v),500);
};
const sa=serviceAccount(), payload=decryptPayload(sa);
const app=initializeApp({credential:cert(sa),projectId:PROJECT},'i63-contact-sample');
const db=getFirestore(app);
const col=db.collection('tenants').doc(TENANT).collection('data').doc('clientes').collection('items');
const result={
  schema:'GRAVICENTRA_I6_3_CONTACT_SAMPLE_READONLY_V1',
  status:'FAIL',
  writes:0,
  sourceSha256:EXPECTED_SOURCE,
  existingUpdateCandidates:0,
  existingUpdateSamples:[],
  insertSamplesWithContact:[],
  containsPII:true,
  containsSecrets:false,
  errors:[]
};
try{
  const updates=(payload.mutations||[]).filter(m=>m.action==='update');
  const inserts=(payload.mutations||[]).filter(m=>m.action==='insert');
  const updateCandidates=updates.map(m=>({m,keys:Object.keys(m.payload||{}).filter(contactKey)})).filter(x=>x.keys.length);
  result.existingUpdateCandidates=updateCandidates.length;
  for(const {m,keys} of updateCandidates.slice(0,8)){
    const d=await col.doc(m.id).get();need(d.exists,'I63_CONTACT_UPDATE_DOC_MISSING');
    const row=d.data()||{};
    const current={};for(const k of keys)current[k]=safeValue(row[k]);
    result.existingUpdateSamples.push({name:clean(row.nombre||row.name||'',220),changedFields:keys,currentValues:current});
  }
  for(const m of inserts){
    const keys=Object.keys(m.payload||{}).filter(contactKey);
    if(!keys.length)continue;
    const d=await col.doc(m.id).get();need(d.exists,'I63_CONTACT_INSERT_DOC_MISSING');
    const row=d.data()||{},current={};for(const k of keys)current[k]=safeValue(row[k]);
    result.insertSamplesWithContact.push({name:clean(row.nombre||row.name||'',220),fields:keys,currentValues:current});
  }
  const snap=await col.get();need(snap.size===442,'I63_CONTACT_BACKEND_COUNT');
  result.backendCount=442;result.status='PASS';
}catch(e){result.errors.push(clean(e?.message||e,220));process.exitCode=1;}
finally{
  await deleteApp(app).catch(()=>{});
  fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n');
  console.log('I63_CONTACT_SAMPLE='+result.status);
  console.log('I63_CONTACT_EXISTING_CANDIDATES='+result.existingUpdateCandidates);
  console.log('I63_CONTACT_INSERT_SAMPLES='+result.insertSamplesWithContact.length);
}
