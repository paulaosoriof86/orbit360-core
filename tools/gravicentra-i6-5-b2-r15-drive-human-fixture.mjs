import fs from 'node:fs';
import {initializeApp,cert} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';

const TENANT=process.env.TENANT_HINT||'alianzas-soluciones';
const PROJECT=process.env.PROJECT_ID||'ays-orbit-360-lab';
const LOCK=process.env.B2_LOCK||'artifacts/orbit360-recovery/release-control/I6_5_FORENSIC_B2_EXECUTION_LOCK_20260920.json';
const OUT=process.env.B2_DRIVE_HUMAN_FIXTURE_OUT;
if(!OUT)throw new Error('B2_DRIVE_FIXTURE_OUT_REQUIRED');
const b=JSON.parse(fs.readFileSync(LOCK,'utf8'));
if(b.status!=='PREVIEW_AUTHENTICATED_PASS_PENDING_PAULA_VISUAL'||b.authenticatedPreviewProof?.status!=='PASS')throw new Error('B2_DRIVE_FIXTURE_EXACT_AUTH_PASS_REQUIRED');
if(!b.preview?.sourceSha||!b.preview?.buildId||!b.preview?.url||b.preview?.livePromoted!==false)throw new Error('B2_DRIVE_FIXTURE_PREVIEW_BINDING_INVALID');
if(b.boundaries?.humanDriveOAuthConsentAuthorizedOnExactPreview!==true)throw new Error('B2_DRIVE_FIXTURE_HUMAN_OAUTH_NOT_AUTHORIZED');

function sa(){
  for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){
    try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.private_key)return x;}catch{}
  }
  throw new Error('B2_DRIVE_FIXTURE_SERVICE_ACCOUNT_REQUIRED');
}
const app=initializeApp({credential:cert(sa()),projectId:PROJECT},'b2-drive-human-fixture-'+Date.now());
const db=getFirestore(app);
const col=(name)=>db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items');
const run=String(b.preview.runId||'preview').replace(/[^0-9A-Za-z_-]/g,'').slice(0,40);
const id='b2-drive-human-'+run;
const ref=col('clientes').doc(id);
const prior=await ref.get();
if(prior.exists&&prior.data()?.qaFixtureType!=='B2_R15_DRIVE_HUMAN')throw new Error('B2_DRIVE_FIXTURE_ID_CONFLICT');

let advisorId='';
const existing=await col('clientes').limit(30).get();
for(const d of existing.docs){const a=String(d.data()?.asesorId||'').trim();if(a){advisorId=a;break;}}
if(!advisorId){
  const advisors=await col('asesores').limit(10).get();
  if(!advisors.empty)advisorId=advisors.docs[0].id;
}
const now=new Date().toISOString();
const payload={
  id,tenantId:TENANT,
  nombre:'B2 QA · PRUEBA DRIVE HUMANA · NO USAR',
  tipo:'Persona',pais:'GT',moneda:'GTQ',
  asesorId,
  identificacion:'B2DRIVE-'+run,
  estado:'Nuevo',estadoOperativo:'Nuevo',segmento:'Nuevo',canal:'B2 QA',
  telefono:'',correo:'',documentos:[],
  previewWrite:true,qaFixture:true,qaFixtureType:'B2_R15_DRIVE_HUMAN',
  exactPreviewSourceSha:b.preview.sourceSha,exactPreviewBuildId:b.preview.buildId,
  exactPreviewRunId:b.preview.runId,
  creado:prior.exists?(prior.data()?.creado||now):now,actualizado:now
};
await ref.set(payload,{merge:false});
const rb=await ref.get(),row=rb.data()||{};
if(!rb.exists||row.id!==id||row.qaFixtureType!=='B2_R15_DRIVE_HUMAN'||row.previewWrite!==true)throw new Error('B2_DRIVE_FIXTURE_READBACK_FAILED');
const out={
  status:'READY_PENDING_PAULA_OAUTH',
  tenantId:TENANT,clientId:id,clientName:payload.nombre,searchText:'PRUEBA DRIVE HUMANA',
  previewUrl:b.preview.url,sourceSha:b.preview.sourceSha,buildId:b.preview.buildId,
  previewRunId:b.preview.runId,firestoreReadback:true,
  driveExpectedRoot:'_GRAVICENTRA_PREVIEW_QA/'+id,
  boundaries:{syntheticOnly:true,livePromotion:false,reimport:false,realClientMutation:false,cleanupMandatory:true},
  createdAt:now
};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log('B2_DRIVE_HUMAN_FIXTURE_READY='+JSON.stringify({clientId:id,previewUrl:b.preview.url}));
