import fs from 'node:fs';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones';
const OUT=process.env.I65_DIFF_SNAPSHOT_FILE||'i65-diff-live-snapshot.enc.json';
const PUB=process.env.I65_DIFF_PUBLIC_KEY||'artifacts/orbit360-recovery/release-control/I6_5_DIFF_SNAPSHOT_PUBLIC_KEY_20260918.pem';
const CONTROL=process.env.CONTROL||'artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';
const need=(ok,code)=>{if(!ok)throw new Error(code);};
function sa(){for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}}throw new Error('I65_DIFF_SERVICE_ACCOUNT');}
function canon(v){
  if(v==null||typeof v==='string'||typeof v==='number'||typeof v==='boolean')return v;
  if(v instanceof Date)return v.toISOString();
  if(Array.isArray(v))return v.map(canon);
  if(typeof v==='object'){
    if(typeof v.toDate==='function'){try{return v.toDate().toISOString();}catch{}}
    if(typeof v.path==='string'&&Object.keys(v).length<8)return {__ref:v.path};
    const o={};for(const [k,x] of Object.entries(v))o[k]=canon(x);return o;
  }
  return String(v);
}
async function readColl(db,name){
  const s=await db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items').get();
  return s.docs.map(d=>({id:d.id,...canon(d.data()||{})}));
}
const app=initializeApp({credential:cert(sa()),projectId:PROJECT},'i65-diff-snapshot');
try{
  const db=getFirestore(app),C=JSON.parse(fs.readFileSync(CONTROL,'utf8'));
  need(C.nextAction==='I6_5_DETERMINISTIC_DIFF','I65_DIFF_CURSOR_INVALID');
  need(C.i65MiniClosurePlan?.blockBStatus==='READ_PATH_HYDRATION_LIVE_PASS','I65_DIFF_BLOCK_B_NOT_FROZEN');
  need(C.i6Execution?.dataMutationAuthorized===false&&C.i6Execution?.sourceDataApplyAuthorized===false,'I65_DIFF_WRITE_BOUNDARY_INVALID');
  const names=['polizas','clientes','aseguradoras','recibosEsperados','carteraPrimas','cobros'];
  const data={};
  for(const n of names)data[n]=await readColl(db,n);
  const counts=Object.fromEntries(names.map(n=>[n,data[n].length]));
  need(counts.polizas===1414,'I65_DIFF_POLIZAS_COUNT_DRIFT:'+counts.polizas);
  need(counts.clientes===442,'I65_DIFF_CLIENTES_COUNT_DRIFT:'+counts.clientes);
  need(counts.recibosEsperados===1294,'I65_DIFF_RECEIPTS_COUNT_DRIFT:'+counts.recibosEsperados);
  need(counts.carteraPrimas===673,'I65_DIFF_PORTFOLIO_COUNT_DRIFT:'+counts.carteraPrimas);
  need(counts.cobros===5,'I65_DIFF_COBROS_COUNT_DRIFT:'+counts.cobros);
  const payload={schema:'GRAVICENTRA_I6_5_ENCRYPTED_LIVE_SNAPSHOT_V1',createdAt:new Date().toISOString(),projectId:PROJECT,tenantId:TENANT,headSha:process.env.GITHUB_SHA||'',counts,data};
  const plain=Buffer.from(JSON.stringify(payload));
  const gz=zlib.gzipSync(plain,{level:9});
  const aes=crypto.randomBytes(32),iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv('aes-256-gcm',aes,iv);
  const ct=Buffer.concat([cipher.update(gz),cipher.final()]),tag=cipher.getAuthTag();
  const pub=fs.readFileSync(PUB,'utf8');
  const ek=crypto.publicEncrypt({key:pub,padding:crypto.constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},aes);
  const envelope={
    schema:'GRAVICENTRA_I6_5_ENCRYPTED_LIVE_SNAPSHOT_ENVELOPE_V1',
    alg:'RSA-OAEP-SHA256+A256GCM',compression:'gzip',
    sourceHeadSha:process.env.GITHUB_SHA||'',counts,
    plaintextSha256:crypto.createHash('sha256').update(plain).digest('hex'),
    compressedSha256:crypto.createHash('sha256').update(gz).digest('hex'),
    encryptedKey:ek.toString('base64'),iv:iv.toString('base64'),tag:tag.toString('base64'),ciphertext:ct.toString('base64'),
    containsPII:true,encrypted:true,writes:0,operationalWrites:0
  };
  fs.writeFileSync(OUT,JSON.stringify(envelope));
  console.log('I65_DIFF_ENCRYPTED_SNAPSHOT=PASS');
  console.log('I65_DIFF_COUNTS='+JSON.stringify(counts));
  console.log('I65_DIFF_PLAINTEXT_SHA256='+envelope.plaintextSha256);
  console.log('I65_DIFF_WRITES=0');
} finally {await deleteApp(app).catch(()=>{});}
