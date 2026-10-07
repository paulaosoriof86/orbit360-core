'use strict';

const crypto=require('node:crypto');
const {getApps,initializeApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const s=require('./siniestros-public-contract-s512');

const PROJECT_ID='ays-orbit-360-lab';
const TENANT_ID='alianzas-soluciones';
const RUN=String(process.env.GITHUB_RUN_ID||'local');
const STATES=['Reportado','En análisis','Documentación','Aprobado','Pagado','Rechazado'];

function idFor(state){return 's512c_'+crypto.createHash('sha256').update(RUN+'|'+state).digest('hex').slice(0,18);}

async function main(){
  const project=process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||'';
  if(project!==PROJECT_ID)throw new Error('WRONG_PROJECT');
  const app=getApps()[0]||initializeApp({projectId:PROJECT_ID});
  const db=getFirestore(app);
  const col=db.collection('tenantId').doc(TENANT_ID).collection('reclamos');
  const refs=STATES.map(st=>col.doc(idFor(st)));
  try{
    const batch=db.batch();
    STATES.forEach((state,i)=>batch.set(refs[i],{
      id:idFor(state),numero:'SYN-'+(i+1),tipo:'Synthetic QA',ramo:'Vehículos',fecha:'2026-10-07',estado:state,
      clienteId:'synthetic-client',polizaId:'synthetic-policy',
      docs:[{storagePath:'synthetic/raw/path'}],bitacora:[{nota:'synthetic internal note'}],
      montoAprobado:state==='Aprobado'||state==='Pagado'?1000:0,synthetic:true
    }));
    await batch.commit();

    const out=[];
    for(const ref of refs){
      const snap=await ref.get();
      if(!snap.exists)throw new Error('SYNTHETIC_CLAIM_MISSING');
      const row={id:snap.id,...snap.data()};
      const p=s.publicClaimProjection(row);
      if(!p.ok)throw new Error('PUBLIC_PROJECTION_DENIED:'+row.estado);
      if(Object.prototype.hasOwnProperty.call(p.value,'bitacora')||Object.prototype.hasOwnProperty.call(p.value,'docs')||Object.prototype.hasOwnProperty.call(p.value,'clienteId')||Object.prototype.hasOwnProperty.call(p.value,'polizaId'))throw new Error('RAW_FIELD_LEAK');
      out.push({internal:row.estado,publicCode:p.value.publicStatus.code,publicLabel:p.value.publicStatus.label,final:p.value.publicStatus.final});
    }
    if(out.length!==6)throw new Error('STATE_COUNT_MISMATCH');
    const codes=out.map(x=>x.publicCode);
    for(const expected of ['REPORT_RECEIVED','UNDER_REVIEW','DOCUMENTS_IN_PROGRESS','APPROVED','PAYMENT_RECORDED','REJECTED'])if(!codes.includes(expected))throw new Error('PUBLIC_STATE_MISSING:'+expected);

    console.log(JSON.stringify({
      schemaVersion:'ays-siniestros-s512c-synthetic-state-rehearsal-v1',
      syntheticOnly:true,customerDataUsed:false,productionTouched:false,
      createdSyntheticClaims:6,projectedStates:out,rawInternalFieldsExcluded:true
    },null,2));
  }finally{
    const batch=db.batch();
    for(const ref of refs){const snap=await ref.get();if(snap.exists)batch.delete(ref);}
    await batch.commit();
    for(const ref of refs){if((await ref.get()).exists)throw new Error('SYNTHETIC_CLEANUP_FAILED');}
  }
}

main().catch(e=>{console.error(JSON.stringify({ok:false,syntheticOnly:true,customerDataUsed:false,productionTouched:false,error:String(e&&e.message||e).slice(0,180)}));process.exit(1);});