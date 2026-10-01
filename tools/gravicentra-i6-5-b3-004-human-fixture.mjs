import fs from 'node:fs';
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const projectId=process.env.PROJECT_ID||'ays-orbit-360-lab';
const tenantId=process.env.TENANT_HINT||'alianzas-soluciones';
const mode=String(process.env.B3_004_HUMAN_FIXTURE_MODE||process.argv[2]||'create').trim().toLowerCase();
const outPath=process.env.B3_004_HUMAN_FIXTURE_OUT||'/tmp/b3-004-human-fixture.json';
const previewUrl=String(process.env.B3_PREVIEW_URL||'').replace(/\/$/,'');
const ids={client:'b3004human_client_r12',policy:'b3004human_policy_r12',receipt:'b3004human_receipt_r12',portfolio:'b3004human_portfolio_r12'};
const legacy={client:'b3004human_client_r11',policy:'b3004human_policy_r11',receipt:'b3004human_receipt_r11',portfolio:'b3004human_portfolio_r11'};
const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId});
const db=getFirestore(app),tenant=db.collection('tenants').doc(tenantId),root=tenant.collection('data');
const auth=getAuth(app);
const clean=v=>String(v==null?'':v).trim();
const norm=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const privileged=new Set(['direccion','superadmin','super_admin','admintenant','admin_tenant','admin','operativo','finanzas']);
async function qaActor(){
  const snap=await tenant.collection('members').get();
  for(const d of snap.docs){
    const m=d.data()||{},state=norm(m.status||m.estado||'active'),role=norm(m.activeRole||m.rolActivo||m.defaultRole||m.rolDefault||m.rol),advisorId=clean(m.advisorId||m.asesorId);
    if(m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(state)||!privileged.has(role)||!advisorId)continue;
    try{const u=await auth.getUser(d.id);if(!u.disabled)return{uid:u.uid,advisorId,activeRole:role};}catch{}
  }
  throw new Error('B3_004_R12_PRIVILEGED_ACTIVE_ADVISOR_NOT_FOUND');
}
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
  const who=await qaActor();
  const refs=refsOf(ids),batch=db.batch();
  const common={pais:'GT',asesorId:who.advisorId,__syntheticHumanQa:true,__syntheticGate:'B3-004-R12'};
  batch.set(refs.client,{...common,id:ids.client,nombre:'QA HUMANA B3-004 · NO ES CLIENTE REAL'});
  batch.set(refs.policy,{...common,id:ids.policy,clienteId:ids.client,numero:'QA-HUMANA-B3-004-R12',moneda:'GTQ',estado:'Vigente',vigenciaInicio:'2026-09-01',vigenciaFin:'2027-08-31',primaTotal:111.11});
  batch.set(refs.receipt,{...common,id:ids.receipt,polizaId:ids.policy,clienteId:ids.client,moneda:'GTQ',cuota:'1/1',serie:'QA-R12-1',vence:'2026-09-30',monto:111.11,primaTotal:111.11,estado:'Pendiente',estadoOperativo:'pendiente_vence_corte'});
  batch.set(refs.portfolio,{...common,id:ids.portfolio,reciboId:ids.receipt,polizaId:ids.policy,clienteId:ids.client,moneda:'GTQ',monto:111.11,estado:'Pendiente',estadoCartera:'Pendiente',carteraActiva:true});
  await batch.commit();
  const out={schema:'GRAVICENTRA_B3_004_R12_HUMAN_FIXTURE_V3',status:'READY',tenantId,ids,amount:111.11,synthetic:true,cleanupRequired:true,operationalBusinessData:false,normalProductScope:true,qaActor:{uid:who.uid,advisorId:who.advisorId,activeRole:who.activeRole},previewUrl,
    clientUrl:previewUrl?previewUrl+'/#/cliente360?c='+encodeURIComponent(ids.client)+'&t=recibos&r='+encodeURIComponent(ids.receipt):'',
    receiptsUrl:previewUrl?previewUrl+'/#/cliente360?c='+encodeURIComponent(ids.client)+'&t=recibos':'',
    cobrosUrl:previewUrl?previewUrl+'/#/cobros?qaReceipt='+encodeURIComponent(ids.receipt):''};
  fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out));
}
if(mode==='cleanup'){await cleanup();const out={schema:'GRAVICENTRA_B3_004_R12_HUMAN_FIXTURE_V3',status:'CLEANED',tenantId,ids};fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out));}
else await create();
