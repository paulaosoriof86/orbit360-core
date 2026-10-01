import fs from 'node:fs';
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId=process.env.PROJECT_ID||'ays-orbit-360-lab';
const tenantId=process.env.TENANT_HINT||'alianzas-soluciones';
const mode=String(process.env.B3_004_HUMAN_FIXTURE_MODE||process.argv[2]||'create').trim().toLowerCase();
const outPath=process.env.B3_004_HUMAN_FIXTURE_OUT||'/tmp/b3-004-human-fixture.json';
const previewUrl=String(process.env.B3_PREVIEW_URL||'').replace(/\/$/,'');
const ids={client:'b3004human_client_r11',policy:'b3004human_policy_r11',receipt:'b3004human_receipt_r11',portfolio:'b3004human_portfolio_r11'};
const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId});
const db=getFirestore(app),root=db.collection('tenants').doc(tenantId).collection('data');
const refs={client:root.doc('clientes').collection('items').doc(ids.client),policy:root.doc('polizas').collection('items').doc(ids.policy),receipt:root.doc('recibosEsperados').collection('items').doc(ids.receipt),portfolio:root.doc('carteraPrimas').collection('items').doc(ids.portfolio)};
async function cleanup(){
  const cobros=await root.doc('cobros').collection('items').where('reciboId','==',ids.receipt).get();
  const batch=db.batch(); cobros.docs.forEach(d=>batch.delete(d.ref)); Object.values(refs).forEach(r=>batch.delete(r)); await batch.commit();
}
async function create(){
  await cleanup();
  const batch=db.batch();
  batch.set(refs.client,{id:ids.client,nombre:'QA HUMANA B3-004 · NO ES CLIENTE REAL',pais:'GT',asesorId:'qa_human_b3004',__syntheticHumanQa:true,__syntheticGate:'B3-004-R11'});
  batch.set(refs.policy,{id:ids.policy,clienteId:ids.client,numero:'QA-HUMANA-B3-004',pais:'GT',moneda:'GTQ',asesorId:'qa_human_b3004',estado:'Vigente',vigenciaInicio:'2026-09-01',vigenciaFin:'2027-08-31',primaTotal:111.11,__syntheticHumanQa:true,__syntheticGate:'B3-004-R11'});
  batch.set(refs.receipt,{id:ids.receipt,polizaId:ids.policy,clienteId:ids.client,pais:'GT',moneda:'GTQ',cuota:'1/1',serie:'QA-1',vence:'2026-09-30',monto:111.11,primaTotal:111.11,estado:'Pendiente',estadoOperativo:'pendiente_vence_corte',asesorId:'qa_human_b3004',__syntheticHumanQa:true,__syntheticGate:'B3-004-R11'});
  batch.set(refs.portfolio,{id:ids.portfolio,reciboId:ids.receipt,polizaId:ids.policy,clienteId:ids.client,pais:'GT',moneda:'GTQ',monto:111.11,estado:'Pendiente',estadoCartera:'Pendiente',carteraActiva:true,asesorId:'qa_human_b3004',__syntheticHumanQa:true,__syntheticGate:'B3-004-R11'});
  await batch.commit();
  const out={schema:'GRAVICENTRA_B3_004_R11_HUMAN_FIXTURE_V1',status:'READY',tenantId,ids,amount:111.11,synthetic:true,cleanupRequired:true,operationalBusinessData:false,previewUrl,clientUrl:previewUrl?previewUrl+'/#/cliente360?c='+encodeURIComponent(ids.client)+'&t=recibos':'',cobrosUrl:previewUrl?previewUrl+'/#/cobros':''};
  fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n'); console.log(JSON.stringify(out));
}
if(mode==='cleanup'){await cleanup();const out={schema:'GRAVICENTRA_B3_004_R11_HUMAN_FIXTURE_V1',status:'CLEANED',tenantId,ids};fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out));}
else await create();
