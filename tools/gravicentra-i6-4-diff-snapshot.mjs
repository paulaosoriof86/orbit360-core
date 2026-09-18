import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab', TENANT='alianzas-soluciones';
const OUT=process.env.I64_DIFF_SNAPSHOT_FILE||path.join(process.env.RUNNER_TEMP||process.cwd(),'i64-diff-live-snapshot.json');
const clean=(v,m=1000)=>String(v==null?'':v).trim().slice(0,m);
const norm=v=>clean(v,400).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const normPolicy=v=>clean(v,180).toUpperCase().replace(/[–—−‑]/g,'-').replace(/\s+/g,'');
const normPlate=v=>clean(v,100).toUpperCase().replace(/[–—−‑]/g,'-').replace(/[^A-Z0-9]/g,'');
const sha=v=>crypto.createHash('sha256').update(String(v??''),'utf8').digest('hex');
const stable=v=>{if(v===undefined)return null;if(v===null||typeof v!=='object')return v;if(typeof v.toDate==='function'){try{return{$timestamp:v.toDate().toISOString()};}catch{}}if(Array.isArray(v))return v.map(stable);const o={};for(const k of Object.keys(v).sort())o[k]=stable(v[k]);return o;};
const digest=v=>sha(JSON.stringify(stable(v)));
const need=(x,c)=>{if(!x)throw new Error(c);};
function serviceAccount(){for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}}throw new Error('I64_DIFF_SERVICE_ACCOUNT');}
function col(db,n){return db.collection('tenants').doc(TENANT).collection('data').doc(n).collection('items');}
function first(x,ks){for(const k of ks){const v=x?.[k];if(v!==undefined&&v!==null&&clean(v)!=='')return v;}return'';}
function dateVal(x,ks){const v=first(x,ks);if(!v)return'';if(typeof v?.toDate==='function'){try{return v.toDate().toISOString().slice(0,10);}catch{}}return clean(v,40).slice(0,10);}
function num(v){if(v===null||v===undefined||clean(v)==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;}

const sa=serviceAccount(),app=initializeApp({credential:cert(sa),projectId:PROJECT},'i64-diff-snapshot'),db=getFirestore(app);
const out={schema:'GRAVICENTRA_I6_4_SANITIZED_LIVE_DIFF_SNAPSHOT_V1',status:'FAIL',writes:0,containsPII:false,containsSecrets:false,collections:{},errors:[]};
try{
  const names=['clientes','aseguradoras','asesores','polizas','vehiculos'];
  const snaps={};for(const n of names)snaps[n]=await col(db,n).get();
  out.collections.clientes=snaps.clientes.docs.map(d=>{const x=d.data()||{},t=x.fusionado===true||!!clean(x.mergedIntoClientId,256);return{id:d.id,nameHash:sha(norm(first(x,['nombre','name']))),tombstone:t,canonicalId:t?clean(x.mergedIntoClientId,256):d.id,pais:clean(first(x,['pais','country']),20),asesorId:clean(x.asesorId,256)};});
  out.collections.aseguradoras=snaps.aseguradoras.docs.map(d=>{const x=d.data()||{};return{id:d.id,nombre:clean(first(x,['nombre','name','razonSocial']),180),codigo:clean(first(x,['codigo','code']),80),nameHash:sha(norm(first(x,['nombre','name','razonSocial']))),pais:clean(first(x,['pais','country']),20),active:x.activo!==false&&x.vinculada!==false};});
  out.collections.asesores=snaps.asesores.docs.map(d=>{const x=d.data()||{};return{id:d.id,nameHash:sha(norm(first(x,['nombre','name']))),active:x.activo!==false&&x.active!==false};});
  const members=await db.collection('tenants').doc(TENANT).collection('members').get();
  out.collections.members=members.docs.map(d=>{const x=d.data()||{};return{id:d.id,uid:clean(x.uid||d.id,256),asesorId:clean(x.asesorId,256),nameHash:sha(norm(first(x,['nombre','name','displayName']))),roles:[].concat(x.roles||[],x.rolesAsignados||[],x.role||[],x.rol||[]).map(v=>clean(v,80)).filter(Boolean),active:x.activo!==false&&x.active!==false};});
  out.collections.polizas=snaps.polizas.docs.map(d=>{const x=d.data()||{};return{
    id:d.id,docSha256:digest(x),numeroHash:sha(normPolicy(first(x,['numero','poliza','numeroPoliza']))),
    numeroNormHash:sha(norm(first(x,['numero','poliza','numeroPoliza']))),
    clienteId:clean(x.clienteId,256),aseguradoraId:clean(x.aseguradoraId,256),asesorId:clean(x.asesorId,256),
    vigenciaIni:dateVal(x,['vigenciaIni','vigenciaInicio','fechaInicio','desde']),vigenciaFin:dateVal(x,['vigenciaFin','vigenciaFinal','fechaFin','hasta','vencimiento']),
    fechaEmision:dateVal(x,['fechaEmision']),fechaCancelacion:dateVal(x,['fechaCancelacion','canceladaFecha','cancelacionFecha']),
    ramo:clean(x.ramo,120),subramo:clean(first(x,['subramo','subRamo']),160),producto:clean(x.producto,160),
    estado:clean(x.estado,100),estadoFuenteOriginal:clean(x.estadoFuenteOriginal,100),
    primaNeta:num(x.primaNeta!=null?x.primaNeta:x.prima),primaTotal:num(x.primaTotal!=null?x.primaTotal:x.prima),
    moneda:clean(first(x,['moneda','divisa']),20),pais:clean(first(x,['pais','country']),20),
    frecuencia:clean(first(x,['frecuencia','forma']),100),formaPago:clean(x.formaPago,100),conductoPago:clean(first(x,['conductoPago','conducto']),100),
    tipoEmisionFuente:clean(first(x,['tipoEmisionFuente','tipoEmision']),120),
    requiereValidacion:x.requiereValidacion===true,sourceRef:clean(x.sourceRef,300),numeroFila:x._numeroFila??null
  };});
  out.collections.vehiculos=snaps.vehiculos.docs.map(d=>{const x=d.data()||{};return{
    id:d.id,docSha256:digest(x),polizaId:clean(x.polizaId,256),clienteId:clean(x.clienteId,256),
    placaHash:sha(normPlate(first(x,['placa','placaNormalizada','placaFuente']))),vinHash:sha(norm(first(x,['vin','numeroSerie','numeroSerieAuto']))),
    inciso:clean(x.inciso,80),marca:clean(x.marca,120),linea:clean(first(x,['linea','tipo']),160),tipo:clean(x.tipo,160),
    modelo:clean(first(x,['modelo','anio']),50),motorHash:sha(norm(first(x,['motor']))),
    estado:clean(x.estado,100),pais:clean(first(x,['pais','country']),20),sourceRef:clean(x.sourceRef,300),numeroFila:x._numeroFila??null
  };});
  need(out.collections.polizas.length===1373,'I64_DIFF_POLICY_BASELINE_DRIFT');
  need(out.collections.vehiculos.length===1032,'I64_DIFF_VEHICLE_BASELINE_DRIFT');
  need(out.collections.clientes.length===442,'I64_DIFF_CLIENT_BASELINE_DRIFT');
  out.status='PASS';
}catch(e){out.errors.push(clean(e?.message||e,300));process.exitCode=1;}
finally{await deleteApp(app).catch(()=>{});fs.writeFileSync(OUT,JSON.stringify(out)+'\n');console.log('I64_DIFF_SNAPSHOT='+out.status);console.log('I64_DIFF_POLICIES='+(out.collections.polizas?.length||0));console.log('I64_DIFF_VEHICLES='+(out.collections.vehiculos?.length||0));console.log('I64_DIFF_WRITES=0');}
