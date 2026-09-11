import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab';
const TENANT='alianzas-soluciones';
const OUT=process.env.I4B_REMEDIATION_EVIDENCE_DIR||process.env.RUNNER_TEMP||process.cwd();
const SEED='seed_ficticio_lab';
const LOADED_BY='woJlxR1iFEeiQZvTscPj4qQ5Qc73';
const CREATE_TIME='2026-07-01T05:00:00.622Z';
const EXPECTED=new Set([
  'actividades/lab_actividad_gt_001',
  'asesores/lab_asesor_diego',
  'asesores/lab_asesor_paula',
  'cobros/lab_cobro_auto_gt_001',
  'cobros/lab_cobro_hogar_co_001',
  'comisiones/lab_comision_gt_001',
  'finmovs/lab_finmov_gt_001',
  'gestiones/lab_gestion_gt_001',
  'metas/lab_meta_gt_202607',
  'negocios/lab_negocio_gt_001',
  'polizas/lab_poliza_auto_gt',
  'polizas/lab_poliza_hogar_co',
  'reclamos/lab_reclamo_gt_001',
  'vehiculos/lab_vehiculo_gt_001',
]);
const clean=v=>String(v==null?'':v).trim();
const iso=t=>{try{return t?.toDate?.().toISOString?.()||null}catch{return null}};
const need=(ok,code)=>{if(!ok)throw new Error(code)};
function serviceAccount(){
  for(const raw of [process.env.SA_DEFAULT,process.env.SA_ORBIT360_LAB,process.env.SA_ORBIT_360_LAB].filter(Boolean)){
    try{const x=JSON.parse(raw);if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}
  }
  throw new Error('I4B_REMEDIATION_SERVICE_ACCOUNT_UNAVAILABLE');
}
function marker(d,id){
  const origin=clean(d?.origen);
  const seed=clean(d?._seed);
  const qa=clean(d?.qaMarker||d?.qa_marker||d?.marker);
  return /^lab_/i.test(id)||origin===SEED||seed===SEED||/^qa[_-]/i.test(qa)||/seed_ficticio_lab/i.test(qa);
}

const evidence={
  schemaVersion:'gravicentra-i4b-lab-remediation-v1',gate:'I4B',projectId:PROJECT,tenant:TENANT,
  status:'STARTED',productionHostingTouched:false,before:[],expected:[...EXPECTED].sort(),deleted:[],after:[],
  provenance:{seed:SEED,loadedBy:LOADED_BY,createTime:CREATE_TIME},alreadyClean:false,writesExecuted:0,dataTouched:false,
  rollbackExecuted:false,rollbackWrites:0,error:null
};
let app;
try{
  app=initializeApp({credential:cert(serviceAccount()),projectId:PROJECT},'gravicentra-i4b-lab-remediation-v1');
  const db=getFirestore(app);
  const dataRoot=db.collection('tenants').doc(TENANT).collection('data');
  const collectionDocs=await dataRoot.listDocuments();
  for(const cdoc of collectionDocs){
    const snap=await cdoc.collection('items').get();
    for(const doc of snap.docs){
      const d=doc.data()||{};
      if(!marker(d,doc.id))continue;
      evidence.before.push({key:`${cdoc.id}/${doc.id}`,collection:cdoc.id,id:doc.id,origen:clean(d.origen),seed:clean(d._seed),loadedBy:clean(d._loadedBy),loadedAt:clean(d._loadedAt),qaMarker:clean(d.qaMarker||d.qa_marker||d.marker),createTime:iso(doc.createTime),updateTime:iso(doc.updateTime),data:d});
    }
  }
  evidence.before.sort((a,b)=>a.key.localeCompare(b.key));
  const actual=evidence.before.map(x=>x.key);
  const expected=[...EXPECTED].sort();
  if(actual.length===0){
    evidence.alreadyClean=true;
  }else{
    need(JSON.stringify(actual)===JSON.stringify(expected),'I4B_REMEDIATION_UNEXPECTED_LAB_INVENTORY:'+actual.join(','));
    for(const row of evidence.before){
      need(row.origen===SEED,'I4B_REMEDIATION_ORIGIN_MISMATCH:'+row.key+':'+row.origen);
      need(row.seed===SEED,'I4B_REMEDIATION_SEED_MISMATCH:'+row.key+':'+row.seed);
      need(row.loadedBy===LOADED_BY,'I4B_REMEDIATION_LOADER_MISMATCH:'+row.key+':'+row.loadedBy);
      need(row.createTime===CREATE_TIME,'I4B_REMEDIATION_CREATE_TIME_MISMATCH:'+row.key+':'+row.createTime);
    }

    const refs=evidence.before.map(row=>dataRoot.doc(row.collection).collection('items').doc(row.id));
    const batch=db.batch();
    refs.forEach(ref=>batch.delete(ref));
    await batch.commit();
    evidence.deleted=[...actual];
    evidence.writesExecuted=refs.length;
    evidence.dataTouched=refs.length>0;

    const verification=await Promise.all(refs.map(async(ref,i)=>({key:actual[i],exists:(await ref.get()).exists})));
    evidence.after=verification;
    const remaining=verification.filter(x=>x.exists);
    if(remaining.length)throw new Error('I4B_REMEDIATION_VERIFY_DELETE_FAILED:'+remaining.map(x=>x.key).join(','));
  }

  const postUnexpected=[];
  const collectionDocsAfter=await dataRoot.listDocuments();
  for(const cdoc of collectionDocsAfter){
    const snap=await cdoc.collection('items').get();
    for(const doc of snap.docs){const d=doc.data()||{};if(marker(d,doc.id))postUnexpected.push(`${cdoc.id}/${doc.id}`);}
  }
  need(postUnexpected.length===0,'I4B_REMEDIATION_MARKERS_REMAIN:'+postUnexpected.join(','));
  evidence.status='PASS';
}catch(e){
  evidence.error=String(e?.message||e);
  if(app&&evidence.deleted.length&&evidence.before.length){
    try{
      const db=getFirestore(app),dataRoot=db.collection('tenants').doc(TENANT).collection('data');
      const rollback=db.batch();
      for(const row of evidence.before){rollback.set(dataRoot.doc(row.collection).collection('items').doc(row.id),row.data,{merge:false});}
      await rollback.commit();
      evidence.rollbackExecuted=true;evidence.rollbackWrites=evidence.before.length;
    }catch(re){evidence.error+=';ROLLBACK_FAILED:'+String(re?.message||re);}
  }
  evidence.status='FAIL';
  process.exitCode=1;
}finally{
  if(app)await deleteApp(app).catch(()=>{});
  fs.mkdirSync(OUT,{recursive:true});
  fs.writeFileSync(path.join(OUT,'i4b-lab-remediation-v1.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log('I4B_LAB_REMEDIATION_STATUS='+evidence.status);
  console.log('I4B_LAB_REMEDIATION_BEFORE='+evidence.before.length);
  console.log('I4B_LAB_REMEDIATION_WRITES='+evidence.writesExecuted);
  console.log('I4B_LAB_REMEDIATION_ALREADY_CLEAN='+evidence.alreadyClean);
  console.log('I4B_LAB_REMEDIATION_ROLLBACK='+evidence.rollbackExecuted);
}
