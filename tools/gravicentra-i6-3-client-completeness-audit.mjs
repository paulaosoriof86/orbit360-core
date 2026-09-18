import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones';
const ENVELOPE='.github/i6-ephemeral/i63-clientes-apply-envelope.encrypted.json';
const EXPECTED_PAYLOAD_SHA='85af65dec822dad6a4c40be5d89202ae5c9f44d302e4e9ea0b4d850f01cc9af7';
const OUT=process.env.I63_COMPLETENESS_AUDIT_FILE||path.join(process.env.RUNNER_TEMP||process.cwd(),'i63-client-completeness-audit.json');
const clean=(v,m=1000)=>String(v==null?'':v).trim().slice(0,m);
const norm=v=>clean(v,300).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const digits=v=>clean(v,120).replace(/\D/g,'');
const sha=v=>crypto.createHash('sha256').update(Buffer.isBuffer(v)?v:Buffer.from(String(v??''),'utf8')).digest('hex');
const stable=v=>{if(v===undefined)return null;if(v===null||typeof v!=='object')return v;if(typeof v.toDate==='function'){try{return{$timestamp:v.toDate().toISOString()};}catch{}}if(Array.isArray(v))return v.map(stable);const o={};for(const k of Object.keys(v).sort())o[k]=stable(v[k]);return o;};
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const need=(x,c)=>{if(!x)throw new Error(c);};
function serviceAccount(){for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}}throw new Error('I63_AUDIT_SERVICE_ACCOUNT');}
function payload(sa){const e=JSON.parse(fs.readFileSync(ENVELOPE,'utf8'));need(e.schema==='GRAVICENTRA_I6_3_APPLY_ENVELOPE_GZIP_V1','I63_AUDIT_ENVELOPE');const key=crypto.privateDecrypt({key:sa.private_key,oaepHash:'sha256',padding:crypto.constants.RSA_PKCS1_OAEP_PADDING},Buffer.from(e.wrappedKey,'base64'));const dec=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(e.iv,'base64'));dec.setAuthTag(Buffer.from(e.tag,'base64'));const plain=zlib.gunzipSync(Buffer.concat([dec.update(Buffer.from(e.ciphertext,'base64')),dec.final()]));need(sha(plain)===EXPECTED_PAYLOAD_SHA,'I63_AUDIT_PAYLOAD_HASH');return JSON.parse(plain.toString('utf8'));}
function comparePayload(row,expected,insert){const mismatches=[];for(const [k,want] of Object.entries(expected||{})){const got=row[k];if(k==='nombre'&&insert){if(clean(got).toLocaleUpperCase('es')!==clean(want).toLocaleUpperCase('es'))mismatches.push({field:k,want:clean(want),got:clean(got)});}else if(!same(got,want)){mismatches.push({field:k,want:stable(want),got:stable(got)});}}return mismatches;}
const sa=serviceAccount(),p=payload(sa),app=initializeApp({credential:cert(sa),projectId:PROJECT},'i63-completeness-audit'),db=getFirestore(app);
const col=db.collection('tenants').doc(TENANT).collection('data').doc('clientes').collection('items');
const out={schema:'GRAVICENTRA_I6_3_CLIENT_COMPLETENESS_AUDIT_V1',status:'FAIL',writes:0,backendCount:0,mutationsExpected:312,mutationsVerified:0,mismatchCount:0,mismatches:[],duplicateExactNameGroups:[],duplicateStrongPhoneGroups:[],monica:null,joseHumberto:[],errors:[],containsSecrets:false,containsPII:true};
try{
  const snap=await col.get();out.backendCount=snap.size;need(snap.size===442,'I63_AUDIT_BACKEND_COUNT');
  const byId=new Map(snap.docs.map(d=>[d.id,d.data()||{}]));
  for(const m of p.mutations||[]){const row=byId.get(m.id);if(!row){out.mismatches.push({id:m.id,problem:'MISSING'});continue;}const mm=comparePayload(row,m.payload||{},m.action==='insert');if(mm.length)out.mismatches.push({id:m.id,action:m.action,fields:mm});else out.mutationsVerified++;}
  out.mismatchCount=out.mismatches.length;

  const nameGroups=new Map(),phoneGroups=new Map();
  for(const d of snap.docs){
    const x=d.data()||{},n=norm(x.nombre||x.name||'');
    if(n){if(!nameGroups.has(n))nameGroups.set(n,[]);nameGroups.get(n).push({id:d.id,nombre:clean(x.nombre||x.name,220),telefono:clean(x.telefono||'',80),whatsapp:clean(x.whatsapp||'',80),email:clean(x.email||x.correo||'',180),numeroDocumento:clean(x.numeroDocumento||x.identificacion||'',120),fechaAlta:clean(x.fechaAltaOrigen||x.fechaAlta||'',100)});}
    const ph=digits(x.whatsapp||x.telefono||x.telefonoAlterno||'');
    if(ph.length>=8){if(!phoneGroups.has(ph))phoneGroups.set(ph,[]);phoneGroups.get(ph).push({id:d.id,nombre:clean(x.nombre||x.name,220),phone:ph});}
  }
  out.duplicateExactNameGroups=[...nameGroups.entries()].filter(([,v])=>v.length>1).map(([key,rows])=>({key,count:rows.length,rows}));
  out.duplicateStrongPhoneGroups=[...phoneGroups.entries()].filter(([,v])=>v.length>1).map(([phone,rows])=>({phone,count:rows.length,rows}));
  out.joseHumberto=[...nameGroups.entries()].filter(([k])=>k==='jose humberto aguilar luna').flatMap(([,v])=>v);
  const mon=[...nameGroups.entries()].filter(([k])=>k==='monica jose chavarria salazar').flatMap(([,v])=>v);
  out.monica=mon.length?mon[0]:null;
  need(out.mutationsVerified===312&&out.mismatchCount===0,'I63_AUDIT_MUTATION_PARITY');
  out.status='PASS';
}catch(e){out.errors.push(clean(e?.message||e,300));process.exitCode=1;}
finally{await deleteApp(app).catch(()=>{});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log('I63_COMPLETENESS_AUDIT='+out.status);console.log('I63_MUTATIONS_VERIFIED='+out.mutationsVerified);console.log('I63_MISMATCH_COUNT='+out.mismatchCount);console.log('I63_EXACT_NAME_DUP_GROUPS='+out.duplicateExactNameGroups.length);console.log('I63_JOSE_HUMBERTO_COUNT='+out.joseHumberto.length);console.log('I63_MONICA_PRESENT='+(out.monica?1:0));}
