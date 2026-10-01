import fs from 'node:fs';
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId=process.env.PROJECT_ID||'ays-orbit-360-lab';
const tenantId=process.env.TENANT_HINT||'alianzas-soluciones';
const mode=String(process.env.B3_004_HUMAN_FIXTURE_MODE||process.argv[2]||'create').trim().toLowerCase();
const outPath=process.env.B3_004_HUMAN_FIXTURE_OUT||'/tmp/b3-004-human-fixture.json';
const previewUrl=String(process.env.B3_PREVIEW_URL||'').replace(/\/$/,'');
const ids={client:'b3004human_client_r12',policy:'b3004human_policy_r12',receipt:'b3004human_receipt_r12',portfolio:'b3004human_portfolio_r12'};
const legacy={client:'b3004human_client_r11',policy:'b3004human_policy_r11',receipt:'b3004human_receipt_r11',portfolio:'b3004human_portfolio_r11'};
const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId});
const db=getFirestore(app),tenant=db.collection('tenants').doc(tenantId),root=tenant.collection('data');
const refsOf=x=>({client:root.doc('clientes').collection('items').doc(x.client),policy:root.doc('polizas').collection('items').doc(x.policy),receipt:root.doc('recibosEsperados').collection('items').doc(x.receipt),portfolio:root.doc('carteraPrimas').collection('items').doc(x.portfolio)});
async function cleanupSet(x){
  const refs=refsOf(x);
  const [cobros,reqs,events]=await Promise.all([
    root.doc('cobros').collection('items').where('reciboId','==',x.receipt).get(),
    tenant.collection('reconciliationRequests').where('result.receiptId','==',x.receipt).get().catch(()=>({docs:[]})),
    tenant.collection('reconciliationEvents').where('receiptId','==',x.receipt).get().catch(()=>({docs:[]}))
  ]);
  const batch=db.batch();
  cobros.docs.forEach(d=>batch.delete(d.ref));
  (reqs.docs||[]).forEach(d=>batch.delete(d.ref));
  (events.docs||[]).forEach(d=>batch.delete(d.ref));
  Object.values(refs).forEach(r=>batch.delete(r));
  await batch.commit();
}
async function cleanup(){await cleanupSet(legacy);await cleanupSet(ids);}
async function create(){
  await cleanup();
  const refs=refsOf(ids),batch=db.batch();
  const common={pais:'GT',asesorId:'qa_human_b3004',__syntheticHumanQa:true,__syntheticGate:'B3-004-R12'};
  batch.set(refs.client,{...common,id:ids.client,nombre:'QA HUMANA B3-004 · NO ES CLIENTE REAL'});
  batch.set(refs.policy,{...common,id:ids.policy,clienteId:ids.client,numero:'QA-HUMANA-B3-004-R12',moneda:'GTQ',estado:'Vigente',vigenciaInicio:'2026-09-01',vigenciaFin:'2027-08-31',primaTotal:111.11});
  batch.set(refs.receipt,{...common,id:ids.receipt,polizaId:ids.policy,clienteId:ids.client,moneda:'GTQ',cuota:'1/1',serie:'QA-R12-1',vence:'2026-09-30',monto:111.11,primaTotal:111.11,estado:'Pendiente',estadoOperativo:'pendiente_vence_corte'});
  batch.set(refs.portfolio,{...common,id:ids.portfolio,reciboId:ids.receipt,polizaId:ids.policy,clienteId:ids.client,moneda:'GTQ',monto:111.11,estado:'Pendiente',estadoCartera:'Pendiente',carteraActiva:true});
  await batch.commit();
  const out={schema:'GRAVICENTRA_B3_004_R12_HUMAN_FIXTURE_V1',status:'READY',tenantId,ids,amount:111.11,synthetic:true,cleanupRequired:true,operationalBusinessData:false,previewUrl,
    clientUrl:previewUrl?previewUrl+'/#/cliente360?c='+encodeURIComponent(ids.client)+'&t=recibos':'',
    cobrosUrl:previewUrl?previewUrl+'/#/cobros?qaReceipt='+encodeURIComponent(ids.receipt):''};
  fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out));
}
if(mode==='cleanup'){await cleanup();const out={schema:'GRAVICENTRA_B3_004_R12_HUMAN_FIXTURE_V1',status:'CLEANED',tenantId,ids};fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out));}
else await create();
